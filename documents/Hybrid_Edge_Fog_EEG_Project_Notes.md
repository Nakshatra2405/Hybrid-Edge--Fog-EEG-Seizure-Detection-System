# Hybrid Edge--Fog EEG Seizure Detection System

Project Brainstorm (Semester Mini Project)

## Project Vision

Build a prototype hospital-scale Edge AI system for epilepsy monitoring.

Instead of sending all EEG data to the cloud:

-   EEG is generated/simulated on Laptop 1.
-   Raspberry Pi performs real-time AI inference.
-   Only important events are transmitted to the Hospital Server (Laptop
    2).
-   Doctors monitor patients through a dashboard.
-   Validated data is periodically used to improve the AI model.
-   Updated models are automatically deployed back to all Raspberry Pi
    edge devices.

No internet is required. The Raspberry Pi hosts its own Wi-Fi hotspot.

------------------------------------------------------------------------

# High-Level Architecture

``` text
                              HYBRID EDGE–FOG EEG SEIZURE DETECTION SYSTEM


 ┌─────────────────────┐
 │      Laptop 1       │
 │  Patient Simulator  │
 │─────────────────────│
 │ • Live EEG Stream   │
 │ • Normal Activity   │
 │ • Seizure Injection │
 │ • Multiple Patients │
 └──────────┬──────────┘
            │
      MQTT over Wi-Fi
   (Raspberry Pi Hotspot)
            │
            ▼
 ┌──────────────────────────────────────────┐
 │      Raspberry Pi 5 (EDGE DEVICE)        │
 │──────────────────────────────────────────│
 │ Docker Containers                        │
 │                                          │
 │ • MQTT Client                            │
 │ • EEG Stream Receiver                    │
 │ • AI Inference Engine                    │
 │ • Local Seizure Detection                │
 │ • Local Alert                            │
 │ • Model Update Agent                     │
 └───────────────┬──────────────────────────┘
                 │
         MQTT / REST API
                 │
                 ▼
 ┌───────────────────────────────────────────────────────────────┐
 │          Laptop 2 (HOSPITAL SERVER / FOG LAYER)               │
 │───────────────────────────────────────────────────────────────│
 │ Docker Compose                                                │
 │ • MQTT Broker                                                 │
 │ • FastAPI Backend                                             │
 │ • PostgreSQL + TimescaleDB                                    │
 │ • Dashboard                                                   │
 │ • Authentication Service                                      │
 │ • Model Registry                                              │
 │ • Model Retraining Service                                    │
 │ • OTA Deployment Service                                      │
 └───────────────┬───────────────────────────────────────────────┘
                 │
                 ▼
 ┌─────────────────────────────────────────────┐
 │        Doctor / Nurse Dashboard             │
 │ • Live Patient Status                       │
 │ • Seizure Alerts                            │
 │ • Alert Validation                          │
 │ • Patient History                           │
 │ • Analytics                                 │
 └─────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# System Workflow

``` text
                     SYSTEM WORKFLOW

          ┌───────────────────────────┐
          │1. Patient Simulator       │
          └─────────────┬─────────────┘
                        │
                        ▼
          ┌───────────────────────────┐
          │2. MQTT Stream             │
          └─────────────┬─────────────┘
                        │
                        ▼
          ┌───────────────────────────┐
          │3. Edge AI on Raspberry Pi │
          └─────────────┬─────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
      Normal EEG               Seizure Detected
          │                           │
          └──────────────┬────────────┘
                         ▼
          ┌───────────────────────────┐
          │4. Send Event to Server    │
          └─────────────┬─────────────┘
                        ▼
          ┌───────────────────────────┐
          │5. Store + Dashboard       │
          └─────────────┬─────────────┘
                        ▼
          ┌───────────────────────────┐
          │6. Doctor Validation       │
          └─────────────┬─────────────┘
                        ▼
          ┌───────────────────────────┐
          │7. Build Validated Dataset │
          └─────────────┬─────────────┘
                        ▼
          ┌───────────────────────────┐
          │8. Scheduled Retraining    │
          └─────────────┬─────────────┘
                        ▼
          Better Model?
                 │
          Yes ───┴────► Publish Model
                        │
                        ▼
          ┌───────────────────────────┐
          │9. OTA Update to all RPis  │
          └─────────────┬─────────────┘
                        ▼
               Continue Monitoring
```

------------------------------------------------------------------------

# Technology Stack

-   Edge Device: Raspberry Pi 5
-   Patient Simulator: Python
-   AI: TensorFlow Lite or ONNX Runtime
-   Communication: MQTT
-   Backend: FastAPI
-   Database: PostgreSQL + TimescaleDB
-   Dashboard: React / Next.js
-   Containerization: Docker + Docker Compose

------------------------------------------------------------------------

# Why PostgreSQL + TimescaleDB?

-   Excellent for time-series sensor data.
-   Stores patient information and alerts.
-   Scales beyond SQLite.
-   Supports analytics and historical queries.

Only important events and short EEG windows should be stored
permanently.

------------------------------------------------------------------------

# Docker Layout

## Raspberry Pi

-   MQTT Client
-   Inference Service
-   Model Update Agent

## Hospital Server

-   MQTT Broker
-   FastAPI
-   PostgreSQL + TimescaleDB
-   Dashboard
-   Model Registry
-   Retraining Service
-   OTA Deployment Service

------------------------------------------------------------------------

# Continuous Learning Pipeline

1.  AI model predicts seizure.
2.  Event stored on server.
3.  Doctor validates True/False seizure.
4.  Validated data added to training dataset.
5.  Scheduled retraining.
6.  Evaluate new model.
7.  If improved:
    -   Publish model.
    -   Notify all RPis via MQTT.
    -   Download new model.
    -   Verify checksum.
    -   Replace old model.
    -   Restart inference.

------------------------------------------------------------------------

# Multi-Tenancy Demonstration

Additional Raspberry Pis can be connected during the demo.

Each Pi represents one patient.

    Patient Simulator A → RPi A ┐
                                 ├── Hospital Server
    Patient Simulator B → RPi B ┘

No architectural changes are required.

------------------------------------------------------------------------

# Team Responsibilities

## Edge Computing

-   Raspberry Pi
-   Docker
-   MQTT
-   OTA deployment
-   Edge inference
-   Device onboarding

## AI Analytics

-   EEG preprocessing
-   Model training
-   Evaluation
-   Model optimization

## Cybersecurity 1

-   JWT Authentication
-   Role-based access
-   Secure APIs

## Cybersecurity 2

-   MQTT security
-   Encryption
-   Audit logs
-   OTA integrity verification

------------------------------------------------------------------------

# Learning Outcomes

-   Edge AI deployment
-   Docker & Docker Compose
-   MQTT networking
-   Time-series databases
-   Microservices
-   MLOps
-   OTA model deployment
-   AI lifecycle management
-   Cybersecurity in healthcare IoT
-   Real-time monitoring dashboards

------------------------------------------------------------------------

# Estimated Cost

## Minimum

-   Existing laptops
-   Raspberry Pi 5
-   Open-source software

Approx. ₹8,500--10,000.

------------------------------------------------------------------------

# Elevator Pitch

We propose a Hybrid Edge--Fog EEG Seizure Detection System where seizure
detection happens locally on Raspberry Pi devices for minimal latency,
while a hospital server manages patient records, dashboards, analytics,
and continuous AI improvement. The system uses Docker-based
microservices, MQTT communication, PostgreSQL with TimescaleDB, and
automated over-the-air model deployment, providing a scalable and
realistic prototype of a smart hospital edge computing platform.
