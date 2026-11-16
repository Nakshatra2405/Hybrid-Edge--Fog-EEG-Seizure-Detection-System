// live_edge_monitor.py – Azure twin watcher → Arduino (USB)
// ---------------------------------------------------------------
// 1️⃣ Install dependencies (once)
//    python -m venv .venv
//    .\.venv\Scripts\activate.ps1
//    pip install azure-iot-device pyserial-asyncio
//
// 2️⃣ Run the daemon (keeps running, polls device twin every 5 s)
//    python live_edge_monitor.py
// ---------------------------------------------------------------

import asyncio, json, sys
from azure.iot.device.aio import IoTHubDeviceClient
import serial_asyncio

# -------------------------------------------------
# GLOBAL STATE – holds serial connection, Azure client, last sent threshold
state = {
    "serial_reader": None,   # asyncio.StreamReader
    "serial_writer": None,   # asyncio.StreamWriter
    "azure_client": None,
    "desired_threshold": None,  # last value we forwarded
}

# -------------------------------------------------
async def init_serial(port="COM5", baud=115200):
    """Open the USB‑serial link to the Nano.
    Adjust *port* if your device shows a different COM number.
    """
    reader, writer = await serial_asyncio.open_serial_connection(url=port, baudrate=baud)
    # give the board a moment to emit its STARTED line
    await asyncio.sleep(1)
    state["serial_reader"] = reader
    state["serial_writer"] = writer
    print("[Serial] Connected to", port)

# -------------------------------------------------
async def init_azure(conn_str="<YOUR_IOTHUB_DEVICE_CONNECTION_STRING>"):
    """Create IoT Hub device client and connect.
    Replace the placeholder with the actual device‑connection string.
    """
    client = IoTHubDeviceClient.create_from_connection_string(conn_str)
    await client.connect()
    state["azure_client"] = client
    print("[Azure] Connected to IoT Hub")

# -------------------------------------------------
async def get_desired_threshold():
    """Pull the *decisionThreshold* from the twin's desired section.
    Expected JSON path: properties.desired.decisionThreshold
    """
    twin = await state["azure_client"].get_twin()
    # The twin payload format may vary; handle the common pattern.
    try:
        return (
            twin.get("desired", {})
            .get("properties", {})
            .get("desired", {})
            .get("decisionThreshold")
        )
    except Exception:
        return None

# -------------------------------------------------
async def twin_watcher(poll_seconds: int = 5):
    """Periodically compare the desired threshold with the last value sent.
    On change, send a serial command "TH:<value>\n" to the Nano.
    """
    while True:
        try:
            new_th = await get_desired_threshold()
            if new_th is not None and new_th != state["desired_threshold"]:
                cmd = f"TH:{float(new_th):.3f}\n"
                state["serial_writer"].write(cmd.encode())
                await state["serial_writer"].drain()
                state["desired_threshold"] = new_th
                print(f"[Twin] Updated threshold → {new_th:.3f}")
        except Exception as exc:
            print("[Twin] error:", exc, file=sys.stderr)
        await asyncio.sleep(poll_seconds)

# -------------------------------------------------
async def forward_inferences():
    """Read JSON lines from the Nano and forward them to IoT Hub.
    Non‑JSON control messages (e.g., CONFIG_UPDATED) are ignored here –
    they are already printed by the board for visual verification.
    """
    reader = state["serial_reader"]
    client = state["azure_client"]
    while True:
        line = await reader.readline()
        if not line:
            continue
        try:
            payload = json.loads(line.decode())
        except Exception:
            # Could be the CONFIG_UPDATED echo – just print for user.
            try:
                txt = line.decode().strip()
                if txt:
                    print("[Serial]", txt)
            except Exception:
                pass
            continue
        # Forward to Azure as a telemetry message
        await client.send_message(json.dumps(payload))
        print("[IoT] Sent telemetry →", payload)

# -------------------------------------------------
async def main():
    # Adjust COM port if needed and insert your actual connection string.
    await asyncio.gather(
        init_serial(),
        init_azure(),
    )
    # Fire‑and‑forget twin watcher, then run the forward loop forever.
    asyncio.create_task(twin_watcher())
    await forward_inferences()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Info] Daemon stopped by user")
