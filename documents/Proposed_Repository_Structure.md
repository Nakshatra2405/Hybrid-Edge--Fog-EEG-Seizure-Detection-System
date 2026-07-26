# Proposed Repository File Structure

This document outlines the project directory layout for the **Hybrid Edge–Fog EEG Seizure Detection System**. The structure is organized into modular components to allow team members across different roles (Edge, Server, AI Analytics, Cyber) to collaborate seamlessly without merge conflicts.

```text
EEG/
├── .github/                     # GitHub Actions (CI/CD workflows, linting)
├── documents/                   # Project Documentation & Architecture Notes
│   ├── Hybrid_Edge_Fog_EEG_Project_Notes.md
│   ├── Proposed_Repository_Structure.md
│   └── Dataset_Recommendations.md
├── simulator/                   # Patient EEG Simulator (Laptop 1)
│   ├── src/
│   │   ├── generator.py         # EEG stream generator (normal + seizure injection)
│   │   └── mqtt_publisher.py    # MQTT publisher to Edge device
│   ├── data/                    # Sample EEG clips for simulation (gitignored)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── edge/                        # Raspberry Pi 5 Edge Device Code
│   ├── src/
│   │   ├── inference.py         # TFLite / ONNX inference engine
│   │   ├── mqtt_receiver.py     # Subscribes to simulator stream
│   │   ├── alert_handler.py     # Forwards detected seizure events to Hospital Server
│   │   └── ota_agent.py         # Receives and verifies updated AI models
│   ├── models/                  # Local TFLite/ONNX model files
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── server/                      # Hospital Server / Fog Layer (Laptop 2)
│   ├── backend/                 # FastAPI service
│   │   ├── app/
│   │   │   ├── api/             # REST endpoints (alerts, patients, model registry)
│   │   │   ├── core/            # Config, security (JWT, RBAC)
│   │   │   ├── db/              # TimescaleDB / Postgres models & sessions
│   │   │   ├── services/        # Retraining & OTA orchestration
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── database/                # TimescaleDB schema & initialization scripts
│   │   └── init.sql
│   ├── mosquitto/               # MQTT Broker configurations & SSL certs
│   │   └── config/
│   │       └── mosquitto.conf
│   ├── docker-compose.yml       # Fog Layer orchestration
│   └── README.md
├── dashboard/                   # Doctor/Nurse Web Dashboard (React/Next.js)
│   ├── src/
│   │   ├── components/          # Live EEG charts, Alert notifications, History
│   │   ├── pages/
│   │   └── services/            # API client & WebSocket connections
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
├── ml/                          # AI Analytics Pipeline (Model Training & Conversion)
│   ├── notebooks/               # EDA & experimental Jupyter notebooks
│   ├── src/
│   │   ├── dataset.py           # Dataset loaders (CHB-MIT / UCI Kaggle loader)
│   │   ├── preprocess.py        # Filtering (bandpass, windowing, normalization)
│   │   ├── train.py             # Model training script
│   │   └── convert_to_tflite.py # Quantization & export to TFLite/ONNX
│   ├── models/                  # Saved model artifacts (.h5, .pt, .tflite)
│   ├── requirements.txt
│   └── README.md
├── .env.example                 # Example environment variables
├── .gitignore                   # Standard gitignore (excluding dataset files, models, node_modules)
└── README.md                    # Root project overview and setup guide
```

---

## Directory Responsibilities

| Directory | Team Role / Responsibilities | Key Technologies |
| :--- | :--- | :--- |
| `simulator/` | Edge Team / Simulator Devs | Python, Paho-MQTT, NumPy |
| `edge/` | Edge Computing Team | Raspberry Pi 5, Docker, TensorFlow Lite / ONNX Runtime, MQTT Client |
| `server/` | Fog Layer & Cybersecurity Team | Docker Compose, FastAPI, PostgreSQL + TimescaleDB, Mosquitto MQTT, JWT Auth |
| `dashboard/` | Full-stack / UI Devs | React / Next.js, WebSockets, Chart.js / Recharts |
| `ml/` | AI Analytics Team | PyTorch / TensorFlow, Scikit-learn, MNE-Python, TFLite Converter |
| `documents/` | All Team Members | Markdown documentation, specs, diagrams |
