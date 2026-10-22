import asyncio
import logging
import json
import os
import struct
import datetime
from bleak import BleakScanner, BleakClient

# Azure IoT Hub integration
try:
    from azure.iot.device.aio import IoTHubDeviceClient
    from azure.iot.device import Message
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

# UUID Definitions matching Arduino Nano 33 BLE sketch
SERVICE_UUID       = "19b10000-e8f2-537e-4f6c-d104768a1214"
SEIZURE_PROB_UUID  = "19b10001-e8f2-537e-4f6c-d104768a1214"
BATTERY_CHAR_UUID  = "19b10002-e8f2-537e-4f6c-d104768a1214"
LATENCY_CHAR_UUID  = "19b10003-e8f2-537e-4f6c-d104768a1214"
DEVICE_NAME        = "EEG-Nano-ICU-01"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

latest_telemetry = {
    "deviceId": "eeg-nano-node-01",
    "seizureProbability": 0,
    "batteryPercentage": 100,
    "edgeLatencyMs": 0,
    "timestamp": None,
    "status": "NORMAL"
}

azure_client = None

async def forward_to_azure(telemetry_data: dict):
    global azure_client
    if not azure_client:
        return
    try:
        msg_payload = json.dumps(telemetry_data)
        message = Message(msg_payload)
        message.content_encoding = "utf-8"
        message.content_type = "application/json"
        
        # Add custom properties for routing/filtering in Azure IoT Hub
        message.custom_properties["isSeizureAlert"] = "true" if telemetry_data["seizureProbability"] >= 70 else "false"
        message.custom_properties["deviceId"] = telemetry_data["deviceId"]

        await azure_client.send_message(message)
        logging.info(f" [Azure IoT Hub] Telemetry packet forwarded -> Seizure: {telemetry_data['seizureProbability']}% | Latency: {telemetry_data['edgeLatencyMs']}ms")
    except Exception as e:
        logging.warning(f"  [Azure IoT Hub] Failed to forward telemetry: {e}")

def on_seizure_prob_notification(sender, data: bytearray):
    prob = int(data[0])
    latest_telemetry["seizureProbability"] = prob
    latest_telemetry["timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    latest_telemetry["status"] = "SEIZURE_ALERT" if prob >= 70 else "NORMAL"
    
    alert_badge = " SEIZURE ALERT" if prob >= 70 else " Normal"
    logging.info(f" [BLE Live] Seizure Prob: {prob:3d}% | Status: {alert_badge} | Batt: {latest_telemetry['batteryPercentage']}% | Latency: {latest_telemetry['edgeLatencyMs']}ms")

    # Schedule asynchronous forwarding to Azure IoT Hub
    asyncio.create_task(forward_to_azure(dict(latest_telemetry)))

def on_battery_notification(sender, data: bytearray):
    batt = int(data[0])
    latest_telemetry["batteryPercentage"] = batt

def on_latency_notification(sender, data: bytearray):
    if len(data) >= 2:
        latency = struct.unpack("<H", data)[0]
    else:
        latency = int(data[0])
    latest_telemetry["edgeLatencyMs"] = latency

async def init_azure_iot_hub(connection_string: str):
    global azure_client
    if not AZURE_AVAILABLE:
        logging.warning(" 'azure-iot-device' package not installed. Run: pip install azure-iot-device")
        return None

    if not connection_string or "HostName=" not in connection_string:
        logging.warning("  No valid Azure IoT Hub connection string found. Running in local BLE mode.")
        return None

    try:
        logging.info(" Connecting to Azure IoT Hub...")
        azure_client = IoTHubDeviceClient.create_from_connection_string(connection_string)
        await azure_client.connect()
        logging.info("Connected to Azure IoT Hub as device 'eeg-nano-node-01'!")
        return azure_client
    except Exception as e:
        logging.error(f" Failed to connect to Azure IoT Hub: {e}")
        azure_client = None
        return None

async def run_gateway():
    print("=" * 68)
    print("       FOG BLE GATEWAY — HYBRID EDGE-FOG EEG SEIZURE SYSTEM       ")
    print("       Bluetooth Low Energy (Nano 33) ──► Azure IoT Hub Cloud      ")
    print("=" * 68)

    # 1. Initialize Azure IoT Hub connection if string provided
    conn_str = os.environ.get("IOT_HUB_DEVICE_CONNECTION_STRING", "").strip()
    
    # Check .env file in project root and parent directories
    candidate_env_paths = [
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.getcwd(), ".env"),
        r"C:\Users\Nakshatra\Desktop\EEG\.env"
    ]
    if not conn_str:
        for env_p in candidate_env_paths:
            if os.path.exists(env_p):
                with open(env_p, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("IOT_HUB_DEVICE_CONNECTION_STRING="):
                            conn_str = line.strip().split("=", 1)[1].strip('"').strip("'")
                            break
            if conn_str:
                break

    await init_azure_iot_hub(conn_str)

    # 2. Continuous BLE scanning and streaming loop
    while True:
        try:
            logging.info(f"Scanning for BLE device '{DEVICE_NAME}'...")
            device = await BleakScanner.find_device_by_name(DEVICE_NAME, timeout=10.0)

            if not device:
                logging.warning(f"Device '{DEVICE_NAME}' not found. Make sure Arduino is powered and advertising. Retrying in 3s...")
                await asyncio.sleep(3)
                continue

            logging.info(f" Found {device.name} [{device.address}]. Connecting over Bluetooth...")

            async with BleakClient(device) as client:
                logging.info(f" Connected to {device.name}!")
                logging.info("Subscribing to real-time GATT Telemetry Characteristics...")

                await client.start_notify(SEIZURE_PROB_UUID, on_seizure_prob_notification)
                await client.start_notify(BATTERY_CHAR_UUID, on_battery_notification)
                await client.start_notify(LATENCY_CHAR_UUID, on_latency_notification)

                logging.info("Live BLE Telemetry Stream Active! Press Ctrl+C to stop.\n")

                # Keep connection alive
                while client.is_connected:
                    await asyncio.sleep(1)

        except asyncio.CancelledError:
            logging.info("Gateway shutting down...")
            break
        except Exception as e:
            logging.error(f"Bluetooth connection error: {e}. Reconnecting in 3s...")
            await asyncio.sleep(3)
        finally:
            if azure_client:
                try:
                    await azure_client.shutdown()
                except Exception:
                    pass

if __name__ == "__main__":
    try:
        asyncio.run(run_gateway())
    except KeyboardInterrupt:
        print("\nGateway stopped by user.")

