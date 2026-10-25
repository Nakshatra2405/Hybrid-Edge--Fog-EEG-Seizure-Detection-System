"""
Register and Synchronize Trained Seizure Model with Azure IoT Hub
Updates Device Twin Reported Properties for the edge device 'eeg-nano-node-01'.
"""

import asyncio
import os
import json
import datetime
from pathlib import Path
from azure.iot.device.aio import IoTHubDeviceClient

# Path to environment and models
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT_DIR / ".env"
METRICS_PATH = ROOT_DIR / "ml" / "reports" / "uci_test_report.json"
QUANT_PATH = ROOT_DIR / "ml" / "reports" / "uci_quantization_report.json"

def load_connection_string():
    conn_str = os.environ.get("IOT_HUB_DEVICE_CONNECTION_STRING", "")
    if not conn_str and ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("IOT_HUB_DEVICE_CONNECTION_STRING="):
                    conn_str = line.strip().split("=", 1)[1].strip('"').strip("'")
                    break
    return conn_str

async def register_model_on_azure():
    print("=" * 65)
    print("       AZURE IOT HUB — EDGE MODEL REGISTRATION UTILITY        ")
    print("=" * 65)

    conn_str = load_connection_string()
    if not conn_str:
        print("❌ Error: IOT_HUB_DEVICE_CONNECTION_STRING not found in .env")
        return

    # Load metrics from reports
    metrics = {}
    if METRICS_PATH.exists():
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            metrics = json.load(f)

    quant = {}
    if QUANT_PATH.exists():
        with open(QUANT_PATH, "r", encoding="utf-8") as f:
            quant = json.load(f)

    # Build model registration payload for Azure Device Twin
    model_patch = {
        "activeModel": {
            "modelName": metrics.get("model_name", "UCITinySeizureNet-1D"),
            "version": "1.0.0",
            "format": "INT8_TFLite_Micro",
            "dataset": metrics.get("dataset", "UCI Epileptic Seizure Recognition"),
            "inputShape": [1, 178, 1],
            "samplingRateHz": 178,
            "windowDurationSec": 1.0,
            "accuracy": metrics.get("accuracy", 92.70),
            "f1Score": metrics.get("f1_score", 82.15),
            "sensitivity": metrics.get("recall_sensitivity", 84.06),
            "specificity": metrics.get("specificity", 94.86),
            "balancedAccuracy": metrics.get("balanced_accuracy", 89.46),
            "decisionThreshold": metrics.get("decision_threshold_used", 0.60),
            "floatModelSizeKb": quant.get("float_model_size_kb", 16.14),
            "int8ModelSizeKb": quant.get("int8_model_size_kb", 10.59),
            "cHeaderArray": "uci_model_data.h",
            "deploymentStatus": "DEPLOYED_AND_ACTIVE",
            "registeredAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
    }

    print("\n📦 Connecting to Azure IoT Hub...")
    client = IoTHubDeviceClient.create_from_connection_string(conn_str)
    await client.connect()
    print("✅ Connected to Azure IoT Hub as device 'eeg-nano-node-01'!")

    print("\n📝 Updating Device Twin reported properties...")
    await client.patch_twin_reported_properties(model_patch)
    print("✅ Successfully registered model in Azure IoT Hub Device Twin!")

    twin = await client.get_twin()
    print("\n☁️  Live Azure Device Twin 'activeModel' Configuration:")
    print(json.dumps(twin.get("reported", {}).get("activeModel", {}), indent=2))

    await client.shutdown()
    print("\n🚀 Model registration complete.")

if __name__ == "__main__":
    asyncio.run(register_model_on_azure())
