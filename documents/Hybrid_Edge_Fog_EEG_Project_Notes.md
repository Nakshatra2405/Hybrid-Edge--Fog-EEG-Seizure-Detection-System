# Hybrid Edge–Fog EEG Seizure Detection System

Project Technical Specification & Architecture Notes

---

## 1. Project Vision & Core Concept

Build a production-grade, budget-friendly prototype hospital Edge AI system for continuous epilepsy & seizure monitoring.

Instead of streaming heavy raw multi-channel EEG data constantly to the cloud:

- **Wearable Edge Node (Arduino Nano 33 BLE Sense)**: Runs local real-time TinyML inference on EEG signals. Only predicted seizure probabilities, latency, and hardware health metrics are broadcasted over Bluetooth Low Energy (BLE), preserving battery and bandwidth.
- **Fog Gateway & Hospital Server (Laptop)**: A lightweight BLE gateway (`bleak`) receives edge packets and bridges them to the local **FastAPI Backend** and **Azure IoT Hub**.
- **Role-Based Access Control (RBAC)**: Distinct, scoped dashboard views for **Admin**, **Doctor**, **Nurse**, and **Technician**.
- **Doctor Validation & Continuous Learning Pipeline**: Doctors review EEG session records and flag approved cases for retraining.
- **Automated Free Cloud MLOps (GitHub Actions + Azure Blob Storage)**: Model retraining is triggered via GitHub Actions (Free Tier), compiled into quantized TensorFlow Lite Micro binaries, and saved to Azure Blob Storage.
- **Over-The-Air (OTA) Model Deployment**: Technicians deploy new models back to the Nano 33 BLE Sense wirelessly over BLE characteristics without physical USB reprogramming.

---

## 2. High-Level System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             WEARABLE EDGE LAYER (TINYML)                                 │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────┐                              │
│  │   Arduino Nano 33 BLE Sense (Wearable Sensor Node)     │                              │
│  │   • Reads simulated/real EEG stream                    │                              │
│  │   • On-device TensorFlow Lite Micro (TFLite Micro)     │                              │
│  │   • Real-time Inference (Seizure Probability %, Latency)│                             │
│  │   • BLE Server (Telemetry Characteristic + OTA Char)   │                              │
│  └───────────────────────────┬────────────────────────────┘                              │
└──────────────────────────────┼───────────────────────────────────────────────────────────┘
                               │
                       Bluetooth Low Energy (BLE)
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         FOG COMPUTING LAYER (HOSPITAL GATEWAY)                           │
│                                                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Native Python Service: BLE Gateway (bleak)                                         │  │
│  │ • Discovers & connects to Nano 33 BLE Sense nodes                                  │  │
│  │ • Streams live telemetry to FastAPI Backend                                        │  │
│  │ • Handles wireless OTA chunked model weight transfer to Nano 33 Flash              │  │
│  └───────────────────────────────────┬────────────────────────────────────────────────┘  │
│                                      │                                                   │
│  ┌───────────────────────────────────┴────────────────────────────────────────────────┐  │
│  │ Docker Compose Services (Fog Server)                                               │  │
│  │                                                                                    │  │
│  │  1. FastAPI Backend (Async REST API + WebSockets)                                  │  │
│  │     • Real-time patient telemetry feeds                                            │  │
│  │     • Scoped RBAC permissions (Admin, Doctor, Nurse, Technician)                   │  │
│  │     • Clinical EEG review & training queue dispatch                                │  │
│  │     • Azure IoT Hub / Blob Storage connector                                       │  │
│  │                                                                                    │  │
│  │  2. PostgreSQL 18 Multi-Tenant Database (eeg_seizure_db)                           │  │
│  │     • 14 tables rooted under 'hospitals' multi-tenancy                             │  │
│  │     • Separate role tables: admins, doctors, nurses, technicians                   │  │
│  │     • Patients, Edge Nodes, AI Models, Telemetry, EEG Sessions, Audit Logs         │  │
│  │                                                                                    │  │
│  │  3. Frontend Dashboard (React + TypeScript + Vite + Tailwind CSS)                  │  │
│  │     • Live Seizure Probability Monitoring Grid                                     │  │
│  │     • Patient Management & Care Team Assignment                                    │  │
│  │     • Clinical EEG Records & Doctor Approval Action                                │  │
│  │     • Technician Training, Evaluation (Confusion Matrix), and Deployment Suite     │  │
│  │     • Admin RBAC Staff Management & Notification Hub                               │  │
│  └───────────────────────────────────┬────────────────────────────────────────────────┘  │
└──────────────────────────────────────┼───────────────────────────────────────────────────┘
                                       │
                              HTTPS / MQTT / REST API
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                    CLOUD & AUTOMATED MLOPS LAYER (100% FREE TIER)                        │
│                                                                                          │
│  • Azure IoT Hub (Free 8,000 msgs/day): Remote cloud telemetry ingestion                 │
│  • Azure Blob Storage (Free 5 GB): Anonymized EEG training datasets & model binaries     │
│  • GitHub Actions (Free 2,000 mins/mo): Automated model retraining & TFLite quantization │
│  • GitHub Repo / Azure Container Registry: Source code & MLOps CI/CD pipelines           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End System Workflow

```text
┌─────────────────────────────────┐
│ 1. Raw EEG Stream Generation    │ (Python Simulator / Bio-potential Hardware)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 2. Edge TinyML Inference        │ (TFLite Micro on Arduino Nano 33 BLE Sense)
└────────────────┬────────────────┘
                 │
        [Seizure Probability % calculated locally]
                 │
                 ▼
┌─────────────────────────────────┐
│ 3. BLE Telemetry Broadcast      │ (BLE Notifications sent to Fog Gateway)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 4. Fog Gateway Processing       │ (bleak forwards to FastAPI & Azure IoT Hub)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 5. Real-Time Dashboard Display  │ (WebSocket updates Doctor/Nurse monitoring grid)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 6. Clinical Session Recording   │ (EEG episodes saved in clinical_eeg_sessions)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 7. Doctor Training Approval     │ (Doctor marks session "Approved for Training")
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 8. Send Data for Training       │ (Technician triggers dispatch to Azure Blob Storage)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 9. Automated GitHub Actions     │ (Pulls data, retrains model, evaluates metrics,
│    Retraining & Quantization    │  generates quantized TFLite Micro binary model.bin)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 10. Metric Review & Validation  │ (Technician reviews Acc, Prec, Recall, F1 & Confusion
│     on Dashboard                │  Matrix in Model Deployments & Versions page)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 11. Wireless BLE OTA Deployment │ (FastAPI fetches model.bin from Azure Blob / local cache;
│     to Edge Hardware            │  BLE Gateway transmits payload chunks to Nano 33 Flash)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ 12. Active Model Hot-Swapped    │ (Nano re-initializes inference engine with new weights;
│     & Continuous Monitoring     │  Dashboard updates edge node active model version)
└─────────────────────────────────┘
```

---

## 4. Role-Based Access Control (RBAC) Specifications

The system enforces strict multi-tenancy (`hospital_id`) and role scoping across 4 user personas:

| Role | Permitted Pages & Capabilities | Restrictions |
| :--- | :--- | :--- |
| **Admin** | • Full hospital patient management (Add, Assign, Discharge)<br>• Call Code / Notify Doctor emergency controls<br>• Staff Management & RBAC role assignments<br>• System Metrics & Audit Logs | • Cannot view clinical EEG waveform records<br>• Cannot approve training data |
| **Doctor** | • Live Monitoring of **assigned patients only**<br>• Request Admission & Discharge with assigned Nurse selection<br>• Clinical Records table with **"Approve for Training"** action<br>• Settings page with **"Send Data for Training"** action | • Cannot manage staff roles or RBAC<br>• Cannot access Technician training/deployment tools |
| **Nurse** | • Live Monitoring of **assigned floor patients** (e.g. Floor 4 - ICU)<br>• Emergency Call Code and Alert acknowledgments<br>• Vitals & telemetry inspection | • Cannot discharge patients or request admissions<br>• Cannot modify AI models or RBAC |
| **Technician** | • **Page 1: Data Review** (PII-anonymized doctor-approved EEG queue)<br>• **Page 2: Model Training & Eval** (Trigger training, evaluate confusion matrix)<br>• **Page 3: Model Deployments & Versions** (Version catalog, KPI cards, OTA Deploy)<br>• **Page 4: Metrics Dashboard & Settings** | • Strictly no patient PII (Names/MRN anonymized to Sample IDs)<br>• No clinical admission/discharge actions |

---

## 5. Technology Stack & Free-Tier Specifications

| Layer | Component | Technology Selected | Free-Tier Details / Cost |
| :--- | :--- | :--- | :--- |
| **Wearable Edge** | Microcontroller | Arduino Nano 33 BLE Sense (ARM Cortex-M4 nRF52840) | Approx. ₹2,200–2,800 (one-time hardware) |
| **Edge AI Runtime**| Inference Engine | TensorFlow Lite for Microcontrollers (TFLite Micro) | Open Source / Free |
| **Fog BLE Gateway**| Local Bridge | Python 3.11 (`bleak` Bluetooth library) | Open Source / Free |
| **Fog Backend** | REST API & WS | FastAPI + Uvicorn + WebSockets | Open Source / Free |
| **Database** | Multi-Tenant DB | PostgreSQL 18 (14 Tables, UUID PKs, pgAdmin 4) | Open Source / Free |
| **Frontend UI** | Web Dashboard | React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons | Open Source / Free |
| **Containerization**| Fog Orchestration| Docker + Docker Compose (Windows / Linux) | Docker Desktop Free |
| **Cloud Telemetry** | IoT Ingestion | Azure IoT Hub (F1 Free Tier) | **Free (8,000 msgs/day)** |
| **Cloud Storage** | Dataset & Model Registry | Azure Blob Storage (LRS Standard) | **Free (5 GB storage + 15 GB egress/mo)** |
| **Cloud MLOps** | Automated Training | GitHub Actions (`.github/workflows/train.yml`) | **Free (2,000 build mins/month)** |

> **Total Cloud Monthly Operating Cost: ₹0 / $0** (Runs entirely on Azure for Students and GitHub Free).

---

## 6. Multi-Tenant Database Architecture (`eeg_seizure_db`)

The database schema enforces 14 relational tables rooted under the top-level tenant `hospitals`:

1. **`hospitals`**: Root tenant organization (`id`, `name`, `code`, `address`, `city`, `created_at`, `updated_at`).
2. **`users`**: Base credentials & authentication (`id`, `hospital_id`, `email`, `password_hash`, `full_name`, `role`, `is_active`, `is_deleted`, `created_at`, `updated_at`).
3. **`admins`**: Administrator specific security privileges (`id`, `user_id`, `hospital_id`, `admin_code`, `access_level`, `can_assign_roles`, `created_at`).
4. **`doctors`**: Attending physician metadata (`id`, `user_id`, `hospital_id`, `license_number`, `specialization`, `pager_number`, `consultation_hours`, `created_at`).
5. **`nurses`**: Ward nurse allocation (`id`, `user_id`, `hospital_id`, `license_number`, `assigned_floor`, `shift_type`, `created_at`).
6. **`technicians`**: ML/AI engineer profile (`id`, `user_id`, `hospital_id`, `created_at`).
7. **`doctor_nurse_assignments`**: Care team junction linking lead doctors to ward nurses.
8. **`patients`**: Clinical patient records (`id`, `hospital_id`, `mrn`, `first_name`, `last_name`, `dob`, `gender`, `blood_group`, `status`, `assigned_floor`, `room`, `assigned_doctor_id`, `assigned_nurse_id`, `is_deleted`, `discharged_at`, `created_at`, `updated_at`).
9. **`edge_nodes`**: IoT wearable hardware status (`id`, `hospital_id`, `node_name`, `hardware_mac`, `room`, `patient_id`, `battery_percentage`, `status`, `active_model_id`, `iot_hub_device_id`, `current_image_tag`, `last_deployment_at`, `last_heartbeat`, `updated_at`).
10. **`ai_models`**: Versioned AI model registry with explicit metrics (`accuracy`, `precision`, `recall`, `f1_score`, `true_positive`, `false_positive`, `true_negative`, `false_negative`, `model_binary_path`, `azure_model_run_id`, `azure_acr_image_tag`, `deployment_status`, `is_deployed`, `created_at`, `updated_at`).
11. **`telemetry_live_vitals`**: High-frequency edge inference telemetry stream (`seizure_probability`, `edge_latency_ms`, `eeg_amplitude_uv`, `battery_percentage`, `recorded_at`).
12. **`clinical_eeg_sessions`**: Recorded EEG episodes for doctor review (`max_seizure_probability`, `classification`, `raw_eeg_blob_path`, `doctor_approved_for_training`, `approved_at`, `technician_status`, `created_at`).
13. **`admin_notifications`**: Doctor-to-Admin admission, discharge, and emergency code call requests (`sent_at`, `received_at`, `resolved_at`, `details`, `status`).
14. **`audit_telemetry_logs`**: System audit log tracking logins, code calls, battery drops, seizure spikes, and model deployments.

---

## 7. Over-The-Air (OTA) TinyML Model Deployment Mechanism

1. **Artifact Generation**: The GitHub Actions training pipeline quantizes the neural network into an INT8 TFLite model and generates a binary payload (`model.bin`, ~20–60 KB).
2. **Cloud Storage**: `model.bin` is uploaded to Azure Blob Storage under `models/{version_name}/model.bin` and cached locally on the Fog server.
3. **Trigger**: When the Technician clicks **"Deploy to Edge Device"** in the UI, FastAPI issues a deployment job to the local BLE Gateway.
4. **BLE Chunked Transfer**: The Python BLE Gateway breaks `model.bin` into 244-byte MTU packets and writes them sequentially to the Nano's **OTA Model Update Characteristic** over BLE.
5. **Flash Buffer Write**: The Nano receives chunks, verifies CRC32 checksum, writes bytes to reserved internal flash memory, and reloads the TFLite Micro tensor arena.
6. **Confirmation**: Nano emits an acknowledgment packet (`OTA_SUCCESS`), and the Fog server updates PostgreSQL `edge_nodes.active_model_id` and `edge_nodes.last_deployment_at`.

---

## 8. Estimated Hardware Cost & Student Feasibility

| Item | Specification | Est. Price (INR) |
| :--- | :--- | :--- |
| **Wearable Edge Node** | Arduino Nano 33 BLE Sense | ₹2,400 – ₹2,800 |
| **Fog Server / Gateway** | Existing Laptop (Bluetooth 4.2+ / Wi-Fi) | ₹0 (Existing hardware) |
| **Cloud Services** | Azure IoT Hub + Azure Blob Storage | ₹0 (Azure for Students) |
| **MLOps Compute** | GitHub Actions CI/CD | ₹0 (GitHub Free Tier) |
| **Software & Database** | FastAPI + React + PostgreSQL 18 + Docker | ₹0 (Open-Source) |

> **Total Hardware Investment: ~₹2,500** (Massive cost reduction compared to a Raspberry Pi 5 kit at ₹9,000–12,000).

---

## 9. Elevator Pitch

We propose a **Hybrid Edge–Fog EEG Seizure Detection System** that pairs an ultra-low-power wearable TinyML edge node (**Arduino Nano 33 BLE Sense**) with a hospital Fog computing server and Azure IoT cloud integration. 

By executing real-time seizure inference directly on the wearable microcontroller via TensorFlow Lite Micro, the system provides sub-20ms emergency detection while slashing power draw and RF radiation. 

The Fog layer (FastAPI + PostgreSQL 18 + React) provides strict Role-Based Access Control for Doctors, Nurses, Admins, and Technicians, while a 100% free cloud MLOps pipeline (GitHub Actions + Azure Blob Storage) automates model retraining and wireless BLE Over-The-Air (OTA) updates back to wearable edge nodes without physical device handling.
