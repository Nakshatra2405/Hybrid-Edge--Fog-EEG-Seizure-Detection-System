# FastAPI Backend REST & WebSocket API Specification

**Project**: Hybrid Edge–Fog EEG Seizure Detection System  
**Base URL**: `http://localhost:8000/api/v1`  
**WebSocket Base URL**: `ws://localhost:8000/ws`  
**Authentication**: Bearer JWT (`Authorization: Bearer <token>`)

---

## Table of Contents
1. [Authentication & Session (`/auth`)](#1-authentication--session-auth)
2. [Patient Management (`/patients`)](#2-patient-management-patients)
3. [Clinical EEG Records & Training Queue (`/clinical-records`)](#3-clinical-eeg-records--training-queue-clinical-records)
4. [AI Models & MLOps (`/models`)](#4-ai-models--mlops-models)
5. [Doctor-Admin Notifications (`/notifications`)](#5-doctor-admin-notifications-notifications)
6. [Staff Management & RBAC (`/staff`)](#6-staff-management--rbac-staff)
7. [Edge Hardware & Telemetry (`/edge` & `/telemetry`)](#7-edge-hardware--telemetry-edge--telemetry)
8. [Real-Time WebSockets (`/ws`)](#8-real-time-websockets-ws)

---

## 1. Authentication & Session (`/auth`)

### `POST /auth/login`
- **Description**: Authenticates users with email and password, issuing a signed JWT access token.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "doctor.roberts@hospital.com",
    "password": "password123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "user": {
      "id": "a1b2c3d4-...",
      "role": "DOCTOR",
      "full_name": "Dr. Sarah Roberts",
      "email": "doctor.roberts@hospital.com",
      "hospital_id": "h7e8f9a0-...",
      "department": "Neurology"
    }
  }
  ```

### `GET /auth/me`
- **Description**: Returns the current authenticated user profile and active permissions.
- **Access**: All Authenticated Roles
- **Response `200 OK`**: User Profile Object

### `POST /auth/logout`
- **Description**: Logs out the current user and invalidates session token.
- **Access**: All Authenticated Roles
- **Response `200 OK`**:
  ```json
  { "message": "Successfully logged out" }
  ```

---

## 2. Patient Management (`/patients`)

### `GET /patients`
- **Description**: Lists patient records with strict role-based scoping:
  - **ADMIN**: Sees all hospital patients.
  - **DOCTOR**: Sees only patients assigned to them (`assigned_doctor_id == user.doctor.id`).
  - **NURSE**: Sees only patients on their assigned floor (`assigned_floor == user.nurse.assigned_floor`).
  - **TECHNICIAN**: `403 Forbidden` (Technicians use anonymized `/clinical-records`).
- **Access**: Admin, Doctor, Nurse
- **Query Parameters**:
  - `status`: `Critical` | `Monitoring` | `Stable` | `Discharged`
  - `floor`: e.g. `Floor 4 - ICU`
  - `search`: Search by name or MRN
- **Response `200 OK`**: Array of Patient objects.

### `GET /patients/{id}`
- **Description**: Detailed patient view including demographics, assigned care team, and current edge node telemetry.
- **Access**: Admin, Assigned Doctor, Floor Nurse
- **Response `200 OK`**: Single Patient Detail Object.

### `POST /patients`
- **Description**: Directly registers/admits a new patient into the hospital.
- **Access**: **ADMIN Only** (Doctors use `/notifications/admission-request`)
- **Request Body**:
  ```json
  {
    "mrn": "PAT-9082",
    "first_name": "James",
    "last_name": "Doe",
    "dob": "1988-04-12",
    "gender": "Male",
    "blood_group": "O+",
    "assigned_floor": "Floor 4 - ICU",
    "room": "402",
    "assigned_doctor_id": "d1e2f3a4-...",
    "assigned_nurse_id": "n1e2f3a4-..."
  }
  ```

### `PUT /patients/{id}`
- **Description**: Update patient room, floor, or care team assignments.
- **Access**: Admin, Assigned Doctor
- **Request Body**:
  ```json
  {
    "assigned_floor": "Floor 4 - ICU",
    "room": "405",
    "assigned_doctor_id": "d1e2f3a4-...",
    "assigned_nurse_id": "n1e2f3a4-..."
  }
  ```

### `DELETE /patients/{id}/discharge`
- **Description**: Formally discharges patient, recording timestamp and marking `is_deleted = TRUE`.
- **Access**: **ADMIN Only** (Doctors use `/notifications/discharge-request`)
- **Request Body**:
  ```json
  {
    "discharge_notes": "Patient stabilized and cleared for discharge."
  }
  ```

---

## 3. Clinical EEG Records & Training Queue (`/clinical-records`)

### `GET /clinical-records`
- **Description**: Lists recorded EEG monitoring sessions.
  - **Doctor**: Sees assigned patient names, room, and approval actions.
  - **Technician**: Patient PII is completely stripped; displays `Sample ID` (e.g. `SMP-7429`) and classification.
- **Access**: Doctor, Technician
- **Response `200 OK`**: Array of EEG Session objects.

### `PATCH /clinical-records/{session_id}/approve`
- **Description**: Doctor reviews and approves an EEG recording episode for AI model retraining.
- **Access**: **DOCTOR Only**
- **Response `200 OK`**:
  ```json
  {
    "session_id": "s1e2f3a4-...",
    "doctor_approved_for_training": true,
    "approved_at": "2026-09-08T12:00:00Z",
    "technician_status": "Approved for Training"
  }
  ```

### `POST /clinical-records/send-for-training`
- **Description**: Dispatches all approved EEG session binary/CSV files to **Azure Blob Storage** for the automated training pipeline.
- **Access**: Doctor, Technician
- **Response `200 OK`**:
  ```json
  {
    "status": "dispatched",
    "samples_uploaded": 14,
    "destination_blob_container": "eeg-training-data"
  }
  ```

---

## 4. AI Models & MLOps (`/models`)

### `GET /models`
- **Description**: Returns all trained AI model versions, accuracy, precision, recall, F1-scores, and confusion matrix counts.
- **Access**: Technician, Admin
- **Response `200 OK`**: Array of Model Version objects.

### `GET /models/{model_id}`
- **Description**: Deep inspection of a single model version's confusion matrix and edge deployment history.
- **Access**: Technician, Admin
- **Response `200 OK`**:
  ```json
  {
    "id": "m1e2f3a4-...",
    "version_name": "SeizureNet-v3.2",
    "accuracy": 98.40,
    "precision": 97.90,
    "recall": 98.10,
    "f1_score": 98.00,
    "true_positive": 842,
    "false_positive": 18,
    "true_negative": 860,
    "false_negative": 16,
    "is_deployed": true,
    "deployed_at": "2026-09-08T09:30:00Z"
  }
  ```

### `POST /models/trigger-training`
- **Description**: Dispatches a GitHub Actions workflow (`train.yml`) to train a new TinyML model using the latest approved data in Azure Blob Storage.
- **Access**: **TECHNICIAN Only**
- **Request Body**:
  ```json
  { "version_name": "SeizureNet-v3.3" }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "message": "GitHub Actions training pipeline triggered",
    "workflow_run_url": "https://github.com/...",
    "status": "QUEUED"
  }
  ```

### `POST /models/webhook/training-complete`
- **Description**: Webhook endpoint invoked by GitHub Actions upon completion of model training and quantization into `model.bin`.
- **Access**: Internal / Webhook Secret Header
- **Request Body**: Full model evaluation payload + Azure Blob URL to `model.bin`.

### `POST /models/{model_id}/deploy`
- **Description**: Initiates wireless **Bluetooth Low Energy Over-The-Air (BLE OTA)** model update to the Arduino Nano 33 BLE Sense edge hardware.
- **Access**: **TECHNICIAN Only**
- **Response `200 OK`**:
  ```json
  {
    "status": "OTA_STARTED",
    "target_nodes": ["Node-01"],
    "model_version": "SeizureNet-v3.3",
    "progress_websocket": "ws://localhost:8000/ws/ota-progress"
  }
  ```

---

## 5. Doctor-Admin Notifications (`/notifications`)

### `GET /notifications`
- **Description**: Fetches pending and past admission requests, discharge requests, and emergency alerts.
- **Access**: Admin, Doctor

### `POST /notifications/admission-request`
- **Description**: Doctor submits a patient admission request to Admin.
- **Access**: **DOCTOR Only**
- **Request Body**:
  ```json
  {
    "patient_name": "Emma Watson",
    "requested_room": "403",
    "assigned_nurse_id": "n1e2f3a4-...",
    "details": "Post-ictal monitoring required after focal seizure episode."
  }
  ```

### `POST /notifications/discharge-request`
- **Description**: Doctor requests Admin to process patient discharge.
- **Access**: **DOCTOR Only**
- **Request Body**:
  ```json
  {
    "patient_id": "p1e2f3a4-...",
    "details": "48 hours seizure-free on current anti-epileptic medication."
  }
  ```

### `POST /notifications/call-code`
- **Description**: Triggers an instant hospital-wide emergency Code Blue / Seizure Alert broadcast.
- **Access**: Admin, Doctor, Nurse
- **Request Body**:
  ```json
  {
    "room": "402",
    "patient_name": "John Doe",
    "details": "Prolonged generalized tonic-clonic seizure > 3 mins."
  }
  ```

### `PATCH /notifications/{id}/resolve`
- **Description**: Admin approves or rejects a pending doctor request.
- **Access**: **ADMIN Only**
- **Request Body**:
  ```json
  {
    "status": "APPROVED",
    "details": "Patient assigned to Bed B-1, Ward Nurse notified."
  }
  ```

---

## 6. Staff Management & RBAC (`/staff`)

### `GET /staff`
- **Description**: Lists all staff members across all 4 roles.
- **Access**: **ADMIN Only**

### `POST /staff`
- **Description**: Creates a new staff member account and creates their role-specific record (`admins`, `doctors`, `nurses`, `technicians`).
- **Access**: **ADMIN Only**
- **Request Body**:
  ```json
  {
    "email": "nurse.clara@hospital.com",
    "password": "TempPassword123",
    "full_name": "Clara Oswald, RN",
    "role": "NURSE",
    "department": "ICU",
    "license_number": "RN-44091",
    "assigned_floor": "Floor 4 - ICU"
  }
  ```

### `PUT /staff/{user_id}/role`
- **Description**: Updates staff role or assigned ward floor.
- **Access**: **ADMIN Only**

### `DELETE /staff/{user_id}`
- **Description**: Deactivates a staff member's login (soft delete).
- **Access**: **ADMIN Only**

---

## 7. Edge Hardware & Telemetry (`/edge` & `/telemetry`)

### `GET /edge/nodes`
- **Description**: Returns hardware status of all registered Arduino Nano 33 BLE Sense edge nodes.
- **Access**: Admin, Technician

### `POST /edge/nodes`
- **Description**: Registers a new physical wearable node.
- **Access**: Admin, Technician
- **Request Body**:
  ```json
  {
    "node_name": "Node-01",
    "hardware_mac": "E4:5F:01:2A:9C:14",
    "room": "402"
  }
  ```

### `GET /telemetry/metrics`
- **Description**: Returns rolling statistics (e.g. average edge latency, detection sensitivity, model uptime).
- **Access**: Admin, Technician

### `GET /telemetry/audit-logs`
- **Description**: Returns system security and clinical audit logs.
- **Access**: **ADMIN Only**

---

## 8. Real-Time WebSockets (`/ws`)

### 1. `ws://localhost:8000/ws/telemetry`
- **Purpose**: High-frequency stream of edge-computed inference metrics to the live dashboard.
- **Clients**: Doctor, Nurse, Admin dashboards
- **Message Payload**:
  ```json
  {
    "type": "VITALS_UPDATE",
    "patient_id": "p1e2f3a4-...",
    "node_name": "Node-01",
    "seizure_probability": 0.942,
    "edge_latency_ms": 14,
    "battery_percentage": 92,
    "timestamp": "2026-09-08T12:15:30Z"
  }
  ```

### 2. `ws://localhost:8000/ws/alerts`
- **Purpose**: Instant broadcast for Seizure Spikes (>90% threshold) and Call Code emergencies.
- **Clients**: All active clinical dashboards
- **Message Payload**:
  ```json
  {
    "type": "SEIZURE_SPIKE_ALERT",
    "severity": "CRITICAL",
    "patient_name": "John Doe",
    "room": "402",
    "seizure_probability": 0.965,
    "message": "High-confidence seizure event detected on Node-01"
  }
  ```

### 3. `ws://localhost:8000/ws/ota-progress`
- **Purpose**: Real-time progress bar updates during wireless BLE OTA model update to Arduino Nano 33 BLE Sense.
- **Clients**: Technician dashboard
- **Message Payload**:
  ```json
  {
    "type": "OTA_PROGRESS",
    "node_name": "Node-01",
    "bytes_sent": 24400,
    "total_bytes": 48800,
    "percent": 50,
    "status": "TRANSFERRING_CHUNKS"
  }
  ```
