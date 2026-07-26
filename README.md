# Hybrid Edge–Fog EEG Seizure Detection System

An offline, hospital-scale Edge AI system prototype for real-time epilepsy monitoring using Raspberry Pi edge devices, Docker microservices, MQTT communication, FastAPI backend, PostgreSQL + TimescaleDB, and an automated continuous retraining loop with OTA updates.

---

## 📁 Repository Structure

* [`documents/`](documents/): Architecture notes, dataset recommendations, and repository layout.
  * [`Hybrid_Edge_Fog_EEG_Project_Notes.md`](documents/Hybrid_Edge_Fog_EEG_Project_Notes.md)
  * [`Proposed_Repository_Structure.md`](documents/Proposed_Repository_Structure.md)
  * [`Dataset_Recommendations.md`](documents/Dataset_Recommendations.md)
* [`simulator/`](simulator/): Patient EEG Data Streamer (Laptop 1 simulation over MQTT).
* [`edge/`](edge/): Raspberry Pi 5 Edge Inference Engine, local alert handler & OTA update agent.
* [`server/`](server/): Hospital Server / Fog Layer (Laptop 2) running Docker Compose (FastAPI, TimescaleDB, Mosquitto MQTT Broker).
* [`dashboard/`](dashboard/): Doctor/Nurse Monitoring Web Dashboard (React / Next.js).
* [`ml/`](ml/): Model training, evaluation, quantization & TFLite/ONNX export pipeline.

---

## 🚀 Quick Start & Collaboration Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/EEG.git
   cd EEG
   ```
2. **Environment Configuration**:
   Copy `.env.example` to `.env` and fill in local configuration settings:
   ```bash
   cp .env.example .env
   ```
3. **Module Guidelines**:
   Refer to the `README.md` file inside each respective folder (`simulator/`, `edge/`, `server/`, `dashboard/`, `ml/`) for role-specific instructions.

---

## 📄 License & Team
Mini Project - Semester Team Collaboration.
