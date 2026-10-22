# Hybrid Edge–Fog EEG Seizure Detection System

A production-grade, budget-friendly hospital Edge AI system prototype for real-time epilepsy & seizure monitoring. The architecture pairs an ultra-low-power wearable TinyML edge node (**Arduino Nano 33 BLE Sense**) with a hospital Fog computing layer (**C# ASP.NET Core / FastAPI Web API + PostgreSQL 18 + React Vite Tailwind Dashboard**), Bluetooth Low Energy (BLE) gateway, and an automated continuous retraining loop with Azure Cloud & GitHub Actions MLOps.

---

## 📁 Repository Structure

* [`documents/`](documents/): Architecture specifications, dataset guides, API contracts, and database schema:
  * [`Hybrid_Edge_Fog_EEG_Project_Notes.md`](documents/Hybrid_Edge_Fog_EEG_Project_Notes.md) — Comprehensive system architecture & workflow.
  * [`Proposed_Repository_Structure.md`](documents/Proposed_Repository_Structure.md) — Full repository layout & module responsibilities.
  * [`Dataset_Recommendations.md`](documents/Dataset_Recommendations.md) — CHB-MIT & UCI Epilepsy dataset preprocessing guidelines.
  * [`API_and_WebSocket_Specification.md`](documents/API_and_WebSocket_Specification.md) — REST endpoints & real-time WebSocket protocol.
  * [`azure_integration.md`](documents/azure_integration.md) — 100% Free-tier Azure IoT Hub & Blob Storage setup.
* [`ml/`](ml/): AI/ML model development, preprocessing, training, INT8 quantization, and TFLite Micro C-array export pipeline.
* [`edge/`](edge/): Wearable Edge Device Firmware for Arduino Nano 33 BLE Sense (TFLite Micro inference engine & BLE OTA receiver).
* [`backend/`](backend/): Hospital Fog Server Web API (C# ASP.NET Core 8 & FastAPI options) + PostgreSQL 18 + RBAC security.
* [`dashboard/`](dashboard/): Doctor, Nurse, Admin, and Technician Web Dashboard (React 18 + TypeScript + Vite + Tailwind CSS).
* [`simulator/`](simulator/): Patient EEG Signal Streamer & Seizure Waveform Injector.

---

## 🚀 Quick Start & Collaboration Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Nakshatra2405/Hybrid-Edge--Fog-EEG-Seizure-Detection-System.git
   cd Hybrid-Edge--Fog-EEG-Seizure-Detection-System
   ```
2. **Environment Configuration**:
   Copy `.env.example` to `.env` and fill in local configuration settings:
   ```bash
   cp .env.example .env
   ```
3. **Module Guidelines**:
   Refer to the `README.md` file inside each respective folder (`ml/`, `edge/`, `backend/`, `dashboard/`, `simulator/`, `documents/`) for role-specific instructions.

---

## 📄 License & Team
Mini Project - Semester Team Collaboration.

