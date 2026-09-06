# 100% Free Student Pipeline — EEG Seizure Detection

## Why We Skip Azure ML
Azure ML's compute clusters are the **only paid component**. Everything else in Azure is free on the student tier. We replace Azure ML with **GitHub Actions** — which gives you **2,000 free compute minutes/month** on Ubuntu runners, and that's more than enough to train a small EEG classification model.

---

## ✅ Free Services Used

| Service | Cost | What It Does |
|---|---|---|
| **Azure IoT Hub** | FREE (8k msg/day) | Receives live telemetry from EEG devices |
| **Azure Blob Storage** | FREE (5 GB) | Stores approved EEG training data files |
| **Azure Container Registry** | FREE (1 Basic registry) | Stores trained model Docker images |
| **Azure Functions** | FREE (1M calls/month) | Tiny trigger to kick off GitHub Actions |
| **GitHub Actions** | FREE (2,000 min/month) | Trains the EEG model — replaces Azure ML |
| **PostgreSQL (local/Supabase)** | FREE | Database |
| **FastAPI backend** | FREE (local / Railway free tier) | API server |

> **Total cost: \$0** ✅

---

## 🏗️ Recommended Free Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLINICAL WORKFLOW                         │
│                                                                 │
│  EEG Edge Device  ──MQTT──►  Azure IoT Hub  ──►  FastAPI        │
│  (Raspberry Pi /            (8k msg/day)         Backend        │
│   wearable node)                │                   │           │
│                                 │ live alerts        │ PostgreSQL│
│                                 ▼                   │           │
│                           WebSocket ──────────────► Dashboard   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     AI TRAINING PIPELINE                        │
│                                                                 │
│  Doctor approves EEG session                                    │
│         │                                                       │
│         ▼                                                       │
│  Technician clicks "Send Data for Training"                     │
│         │                                                       │
│         ▼                                                       │
│  FastAPI Backend ──► Azure Blob Storage                         │
│  (upload anonymised      (eeg-training-data/)     FREE          │
│   .csv / .npy files)           │                               │
│                                │                               │
│                          Azure Function  ◄── HTTP trigger       │
│                          (FREE, tiny)          from backend     │
│                                │                               │
│                                ▼                               │
│                       GitHub Actions Workflow                   │
│                       (FREE, 2000 min/month)                   │
│                       - pulls data from Blob                   │
│                       - runs train.py (PyTorch/sklearn)        │
│                       - exports ONNX model                     │
│                       - pushes ONNX → Azure Blob Storage       │
│                       - builds Docker image                    │
│                       - pushes image → Azure Container Registry│
│                                │                               │
│                                ▼                               │
│                    Technician reviews metrics in Dashboard      │
│                    Clicks "Deploy to Edge Devices"              │
│                                │                               │
│                                ▼                               │
│                    FastAPI calls IoT Hub Device Twin API        │
│                    Edge devices pull new Docker image from ACR  │
│                    Model hot-swapped on device ✅               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Flow

### 1️⃣ Live Telemetry (IoT Hub → Dashboard)
- EEG edge device sends `seizure_probability`, `battery`, `latency` over **MQTT** to Azure IoT Hub.
- IoT Hub routes messages to our **FastAPI backend** via an Event Hub endpoint.
- FastAPI pushes real-time data to the frontend via **WebSocket**.
- All events logged in `audit_telemetry_logs` and `telemetry_live_vitals` in PostgreSQL.

### 2️⃣ Doctor Approves EEG Session
- Doctor opens Clinical Records page → clicks **"Approve for Training"**.
- Backend sets `doctor_approved_for_training = TRUE`, `approved_at = NOW()` in PostgreSQL.

### 3️⃣ Technician Sends Data to Azure
- Technician clicks **"Send Data for Training"** in Settings.
- FastAPI backend:
  - Queries all `doctor_approved_for_training = TRUE` sessions.
  - Strips patient PII (anonymous labels only).
  - Uploads `.npy` / `.csv` files to **Azure Blob Storage** (`eeg-training-data/` container).
- Shows `Sending data...` spinner in the UI ✅ (already implemented).

### 4️⃣ GitHub Actions Trains the Model (Free!)
- A tiny **Azure Function** (HTTP-triggered, FREE) calls the **GitHub Actions REST API** to dispatch a `workflow_dispatch` event on your private GitHub repo.
- The GitHub Actions workflow (`train.yml`) runs on a free Ubuntu runner:

```yaml
# .github/workflows/train.yml
name: Train EEG Seizure Model
on:
  workflow_dispatch:
jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: pip install -r ml/requirements.txt
      - name: Download training data from Azure Blob
        run: python ml/download_data.py
        env:
          AZURE_STORAGE_CONNECTION_STRING: ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
      - name: Train model
        run: python ml/train.py
      - name: Export to ONNX
        run: python ml/export_onnx.py
      - name: Push model to Blob + Build Docker image → ACR
        run: python ml/push_artifacts.py
        env:
          ACR_USERNAME: ${{ secrets.ACR_USERNAME }}
          ACR_PASSWORD: ${{ secrets.ACR_PASSWORD }}
```

- On completion, GitHub Actions calls our FastAPI **webhook endpoint** with the trained model metrics (accuracy, precision, recall, F1, confusion matrix).
- FastAPI saves them to the `ai_models` table in PostgreSQL.
- Technician sees the new model version appear in the **Model Deployments** page.

### 5️⃣ Technician Deploys to Edge Devices
- Technician reviews metrics → clicks **"Upload to Edge Device"**.
- FastAPI calls **Azure IoT Hub Device Twin API** → sends the new ACR image tag to all registered edge devices.
- Edge devices pull the new Docker image from ACR and restart the inference container.
- `edge_nodes.current_image_tag` and `last_deployment_at` updated in PostgreSQL.

---

## 🧠 What Model We Train

Since we're running on **free GitHub Actions CPU runners**, we keep the model small and fast:

| Option | Training Time | Edge Size | Recommendation |
|---|---|---|---|
| **Random Forest (sklearn)** | ~30 sec | ~50 KB | ✅ Best for quick demo |
| **1D CNN (PyTorch)** | ~5-10 min | ~500 KB | ✅ Best accuracy |
| **LSTM (PyTorch)** | ~10-15 min | ~1 MB | ⚠️ Slower, needs more data |

**Recommended**: Start with **1D CNN** exported as ONNX — fits in free runner time, runs fast on Raspberry Pi.

---

## 📦 Summary of What We Need to Build

| Component | Technology | Effort |
|---|---|---|
| FastAPI backend | Python + FastAPI | Medium |
| Azure IoT Hub device SDK | `azure-iot-device` Python SDK | Low |
| Azure Blob Storage upload | `azure-storage-blob` Python SDK | Low |
| Azure Function trigger | Python Function App | Low |
| GitHub Actions train workflow | YAML + PyTorch/sklearn | Medium |
| IoT Hub Device Twin deploy | Azure SDK | Low |
| ACR image push | Docker + GitHub Actions | Low |

---

## 🗺️ Order of Implementation

```
1. Finalize DB schema → run in pgAdmin
2. Build FastAPI backend with PostgreSQL CRUD
3. Connect IoT Hub → FastAPI → WebSocket (live telemetry)
4. Azure Blob Storage upload (Send Data for Training)
5. GitHub Actions training workflow
6. Webhook → save model metrics to DB
7. IoT Hub Device Twin → edge deployment
```
