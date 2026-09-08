# Proposed Repository Directory Structure

**Project**: Hybrid Edge–Fog EEG Seizure Detection System  
**Hardware & Stack**: Arduino Nano 33 BLE Sense (TinyML) + Laptop Fog Server (FastAPI + PostgreSQL 18 + React) + Azure Cloud + GitHub Actions MLOps

---

```text
EEG/
├── .github/
│   └── workflows/
│       ├── train.yml              # GitHub Actions automated MLOps model training & quantization
│       └── lint_and_test.yml      # CI pipeline for API & Frontend testing
│
├── documents/                     # Architecture, Specs & Planning Documentation
│   ├── Hybrid_Edge_Fog_EEG_Project_Notes.md   # Complete project specification & hardware guide
│   ├── API_and_WebSocket_Specification.md     # Full REST API & WebSocket route details
│   ├── Proposed_Repository_Structure.md       # Directory layout & role assignments (this file)
│   ├── azure_integration.md                   # Azure IoT Hub & 100% Free Student tier analysis
│   └── Dataset_Recommendations.md             # CHB-MIT & UCI EEG dataset preprocessing specs
│
├── edge/                          # Wearable Edge Device Firmware (Arduino Nano 33 BLE Sense)
│   ├── firmware/
│   │   ├── Nano33_SeizureDetector/
│   │   │   ├── Nano33_SeizureDetector.ino     # Main Arduino sketch & setup
│   │   │   ├── model_data.h                   # Quantized TFLite Micro model weights (C array)
│   │   │   ├── ble_service.h / .cpp           # BLE GATT Server (Telemetry & OTA chars)
│   │   │   └── tflite_micro_runner.h / .cpp   # TFLite Micro inference engine (Cortex-M4)
│   │   └── libraries/                         # Embedded dependency references
│   └── README.md                              # Flashing & hardware wiring instructions
│
├── gateway/                       # Fog Bluetooth Low Energy Gateway (Native Python)
│   ├── src/
│   │   ├── ble_receiver.py        # Connects to Nano 33 over BLE using 'bleak'
│   │   ├── azure_forwarder.py     # Bridges telemetry to Azure IoT Hub via MQTT
│   │   ├── api_forwarder.py       # Posts live vitals to local FastAPI backend
│   │   └── ota_flasher.py         # Transmits new model.bin chunks over BLE OTA
│   ├── requirements.txt           # bleak, azure-iot-device, requests, websockets
│   └── README.md                  # Gateway setup & Bluetooth pairing guide
│
├── backend/                       # Fog Server REST API & WebSocket Backend (FastAPI)
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py        # Login, logout, JWT token generation
│   │   │   │   ├── patients.py    # Scoped patient CRUD (Admin, Doctor, Nurse)
│   │   │   │   ├── clinical.py    # EEG records & Doctor training approvals
│   │   │   │   ├── models.py      # Technician model registry & GitHub Action trigger
│   │   │   │   ├── notifications.py # Doctor admission/discharge requests & Call Code
│   │   │   │   ├── staff.py       # Admin RBAC staff management
│   │   │   │   └── edge.py        # Edge node telemetry & metrics endpoints
│   │   │   └── router.py          # Unified API v1 router
│   │   ├── core/
│   │   │   ├── config.py          # App settings, DB URLs, Azure secrets, JWT config
│   │   │   ├── security.py        # Password hashing (bcrypt) & JWT issuance/validation
│   │   │   └── rbac.py            # Role-Based Access Control dependency guards
│   │   ├── db/
│   │   │   ├── session.py         # SQLAlchemy engine & session maker
│   │   │   └── base.py            # Base declarative model
│   │   ├── models/                # SQLAlchemy ORM Models (Matching 14 PostgreSQL tables)
│   │   │   ├── hospital.py        # Hospital root tenant
│   │   │   ├── user.py            # Base User & Role entities (admins, doctors, nurses, tech)
│   │   │   ├── patient.py         # Patient demographics & care team assignments
│   │   │   ├── edge_node.py       # Edge hardware records
│   │   │   ├── ai_model.py        # Versioned model registry with explicit metrics
│   │   │   ├── telemetry.py       # Live telemetry & EEG clinical records
│   │   │   └── notification.py    # Doctor requests & audit logs
│   │   ├── schemas/               # Pydantic validation models (Request/Response schemas)
│   │   │   ├── user.py, patient.py, model.py, telemetry.py, notification.py
│   │   ├── services/              # Business logic (Azure Blob uploader, GitHub Action caller)
│   │   │   ├── azure_blob.py
│   │   │   └── github_mlops.py
│   │   ├── websockets/            # Real-time WebSocket connection managers
│   │   │   ├── telemetry_ws.py    # Live inference metrics stream
│   │   │   ├── alerts_ws.py       # Seizure spike & Call Code emergency broadcast
│   │   │   └── ota_ws.py          # OTA wireless transfer progress tracker
│   │   └── main.py                # FastAPI application entrypoint
│   ├── tests/                     # Unit and integration tests (pytest)
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # fastapi, uvicorn, sqlalchemy, psycopg2, pydantic, etc.
│   └── README.md
│
├── dashboard/                     # React Frontend Web Application (Vite + TypeScript)
│   ├── public/                    # Static assets & icons
│   ├── src/
│   │   ├── assets/                # Logos, diagrams, fonts
│   │   ├── components/            # Reusable UI components (PatientCard, FilterBar, Navbar, Modals)
│   │   ├── context/               # AuthContext, RBACContext, WebSocketContext
│   │   ├── pages/                 # Role-scoped pages (LiveMonitoring, Records, Technician Suite)
│   │   │   ├── LoginPage.tsx
│   │   │   ├── LiveMonitoringPage.tsx
│   │   │   ├── PatientManagementPage.tsx
│   │   │   ├── ClinicalRecordsPage.tsx
│   │   │   ├── StaffManagementRBACPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── technician/        # Dedicated 4-page technician pipeline
│   │   │       ├── TechnicianDataReviewPage.tsx
│   │   │       ├── ModelTrainingPage.tsx
│   │   │       └── ModelDeploymentPage.tsx
│   │   ├── services/              # Axios REST API client & WebSocket listeners
│   │   ├── types/                 # TypeScript interfaces (RBAC, Patient, Telemetry, Models)
│   │   ├── utils/                 # RBAC filters, formatting helpers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile                 # Frontend production container
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── ml/                            # AI/ML Training Pipeline (Local & GitHub Actions)
│   ├── data/                      # Sample raw EEG clips (.csv, .npy) [Gitignored]
│   ├── src/
│   │   ├── preprocess.py          # Bandpass filtering (0.5–40 Hz), sliding window segmentation
│   │   ├── train.py               # 1D CNN / Random Forest model training & evaluation
│   │   ├── quantize_tflite.py     # INT8 Quantization to TFLite Micro & C array export
│   │   └── evaluate.py            # Confusion matrix & performance metric calculation
│   ├── models/                    # Exported model weights (.tflite, model.bin, model_data.h)
│   ├── requirements.txt           # torch / tensorflow, scikit-learn, numpy, onnx
│   └── README.md
│
├── simulator/                     # Patient EEG Signal Generator (for testing without live patient)
│   ├── src/
│   │   ├── eeg_streamer.py        # Streams CHB-MIT EEG clips over serial / virtual port to Nano
│   │   └── seizure_injector.py    # Manually injects ictal seizure waveforms on keypress
│   ├── data/                      # Benchmark EEG files
│   └── requirements.txt
│
├── schema.sql                     # PostgreSQL 18 Production DDL (14 tables, 11 ENUMs)
├── docker-compose.yml             # Orchestrates FastAPI + PostgreSQL + React
├── .env.example                   # Template for environment variables (DB URLs, Azure keys)
├── .gitignore                     # Git exclusion rules (node_modules, .tflite weights, data/)
└── README.md                      # Project overview, installation, and demo guide
```

---

## Component & Technology Mapping

| Directory | Layer | Role & Responsibility | Core Technologies |
| :--- | :--- | :--- | :--- |
| `edge/` | Wearable Edge | Real-time on-chip TinyML EEG seizure inference | Arduino Nano 33 BLE Sense, C++, TFLite Micro |
| `gateway/` | Fog Bridge | Laptop Bluetooth gateway to bridge BLE to API & Cloud | Python 3.11, `bleak`, `azure-iot-device` |
| `backend/` | Fog Server | Multi-tenant REST API, WebSockets, RBAC, DB ORM | FastAPI, SQLAlchemy, PostgreSQL 18, Uvicorn |
| `dashboard/` | UI / Presentation | Role-based clinical & technician monitoring suite | React 18, TypeScript, Tailwind CSS, Vite |
| `ml/` | MLOps & AI | Model training, INT8 quantization, C-array export | PyTorch / scikit-learn, TFLite, GitHub Actions |
| `simulator/` | Testing Tool | Streams test EEG data into edge hardware | Python, NumPy, PySerial |
| `documents/` | Architecture | System specs, API contracts, DB schema visualizers | Markdown, KaTeX, Mermaid |
