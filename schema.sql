-- ============================================================
-- EEG Seizure Detection System — Full PostgreSQL Schema
-- Database : eeg_seizure_db
-- Host     : localhost  |  Port: 5432
-- Author   : Generated for Hybrid Edge-Fog EEG System
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- ENUM TYPE DEFINITIONS
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'DOCTOR',
    'NURSE',
    'TECHNICIAN'
);

CREATE TYPE patient_status AS ENUM (
    'Critical',
    'Monitoring',
    'Stable',
    'Discharged'
);

CREATE TYPE gender_enum AS ENUM (
    'Male',
    'Female',
    'Other'
);

CREATE TYPE node_status AS ENUM (
    'ONLINE',
    'OFFLINE',
    'ALERT',
    'DISCONNECTED'
);

CREATE TYPE eeg_classification AS ENUM (
    'Ictal Seizure Event',
    'Pre-Ictal Warning',
    'Normal Baseline'
);

CREATE TYPE tech_approval_status AS ENUM (
    'Pending Technician Review',
    'Added to Training',
    'Approved for Training',
    'Rejected'
);

CREATE TYPE request_type AS ENUM (
    'admission_request',
    'discharge_request',
    'call_code'
);

CREATE TYPE request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE log_severity AS ENUM (
    'CRITICAL',
    'WARNING',
    'INFO',
    'SUCCESS'
);

CREATE TYPE log_event_type AS ENUM (
    'LOGIN',
    'LOGOUT',
    'CALL_CODE',
    'SEIZURE_ALERT',
    'DISCHARGE_REQUEST',
    'ADMISSION_REQUEST',
    'MODEL_DEPLOYMENT',
    'BATTERY_LOW',
    'NODE_OFFLINE',
    'ROLE_ASSIGNED',
    'TRAINING_TRIGGERED'
);

CREATE TYPE model_deployment_status AS ENUM (
    'Pending',
    'Deploying',
    'Live',
    'Failed'
);


-- ============================================================
-- 1. HOSPITALS (Tenant Root)
-- ============================================================

CREATE TABLE hospitals (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(50)  NOT NULL,
    address     TEXT,
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100) DEFAULT 'India',
    is_active   BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_hospital_code UNIQUE (code)
);


-- ============================================================
-- 2. USERS (Base Authentication — All Roles)
-- ============================================================

CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id   UUID         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL,
    avatar_url    TEXT,
    is_active     BOOLEAN      DEFAULT TRUE,
    is_deleted    BOOLEAN      DEFAULT FALSE,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_hospital_email UNIQUE (hospital_id, email)
);

CREATE INDEX idx_users_hospital_role ON users(hospital_id, role);
CREATE INDEX idx_users_active        ON users(hospital_id, is_active, is_deleted);


-- ============================================================
-- 3. ADMINS (Role Entity)
-- ============================================================

CREATE TABLE admins (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id      UUID        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    admin_code       VARCHAR(50) NOT NULL,
    access_level     VARCHAR(50) DEFAULT 'HospitalAdmin',
    can_assign_roles BOOLEAN     DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_admin_user UNIQUE (user_id)
);


-- ============================================================
-- 4. DOCTORS (Role Entity)
-- ============================================================

CREATE TABLE doctors (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id        UUID         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    license_number     VARCHAR(100) NOT NULL,
    specialization     VARCHAR(100) NOT NULL,
    pager_number       VARCHAR(50),
    consultation_hours VARCHAR(100),
    created_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_doctor_user UNIQUE (user_id)
);


-- ============================================================
-- 5. NURSES (Role Entity)
-- ============================================================

CREATE TABLE nurses (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id    UUID         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    license_number VARCHAR(100) NOT NULL,
    assigned_floor VARCHAR(100) NOT NULL,
    shift_type     VARCHAR(50)  DEFAULT 'Morning',
    created_at     TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_nurse_user UNIQUE (user_id)
);


-- ============================================================
-- 6. TECHNICIANS (Role Entity — Simplified)
-- ============================================================

CREATE TABLE technicians (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID    NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_technician_user UNIQUE (user_id)
);


-- ============================================================
-- 7. DOCTOR-NURSE ASSIGNMENTS (Care Team Junction)
-- ============================================================

CREATE TABLE doctor_nurse_assignments (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID    NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id   UUID    NOT NULL REFERENCES doctors(id)  ON DELETE CASCADE,
    nurse_id    UUID    NOT NULL REFERENCES nurses(id)   ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_doctor_nurse UNIQUE (doctor_id, nurse_id)
);


-- ============================================================
-- 8. PATIENTS (Core Clinical Entity)
-- ============================================================

CREATE TABLE patients (
    id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id        UUID           NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    mrn                VARCHAR(50)    NOT NULL,
    first_name         VARCHAR(100)   NOT NULL,
    last_name          VARCHAR(100)   NOT NULL,
    dob                DATE           NOT NULL,
    gender             gender_enum    NOT NULL,
    blood_group        VARCHAR(10),
    status             patient_status DEFAULT 'Monitoring',
    assigned_floor     VARCHAR(100)   NOT NULL,
    room               VARCHAR(50)    NOT NULL,
    assigned_doctor_id UUID           REFERENCES doctors(id) ON DELETE SET NULL,
    assigned_nurse_id  UUID           REFERENCES nurses(id)  ON DELETE SET NULL,
    is_deleted         BOOLEAN        DEFAULT FALSE,
    deleted_at         TIMESTAMPTZ,
    discharged_at      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_hospital_mrn UNIQUE (hospital_id, mrn)
);

CREATE INDEX idx_patients_hospital ON patients(hospital_id);
CREATE INDEX idx_patients_doctor   ON patients(assigned_doctor_id);
CREATE INDEX idx_patients_nurse    ON patients(assigned_nurse_id);
CREATE INDEX idx_patients_floor    ON patients(hospital_id, assigned_floor);
CREATE INDEX idx_patients_active   ON patients(hospital_id, is_deleted);


-- ============================================================
-- 9. EDGE NODES (IoT Hardware Devices)
-- ============================================================

CREATE TABLE edge_nodes (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id        UUID        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    node_name          VARCHAR(100) NOT NULL,
    hardware_mac       VARCHAR(100) NOT NULL,
    room               VARCHAR(50)  NOT NULL,
    patient_id         UUID         REFERENCES patients(id) ON DELETE SET NULL,
    battery_percentage INT          DEFAULT 100 CHECK (battery_percentage BETWEEN 0 AND 100),
    status             node_status  DEFAULT 'ONLINE',
    firmware_version   VARCHAR(50)  DEFAULT 'v2.4.1',
    active_model_id    UUID,
    iot_hub_device_id  VARCHAR(255),
    current_image_tag  VARCHAR(255),
    last_deployment_at TIMESTAMPTZ,
    last_heartbeat     TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_hospital_mac UNIQUE (hospital_id, hardware_mac)
);

CREATE INDEX idx_edge_nodes_hospital ON edge_nodes(hospital_id);
CREATE INDEX idx_edge_nodes_patient  ON edge_nodes(patient_id);


-- ============================================================
-- 10. AI MODELS REGISTRY
-- ============================================================

CREATE TABLE ai_models (
    id                       UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id              UUID                    NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    version_name             VARCHAR(100)            NOT NULL,
    trained_by_technician_id UUID                    REFERENCES technicians(id) ON DELETE SET NULL,
    sample_count             INT                     NOT NULL,
    accuracy                 DECIMAL(5,2)            NOT NULL,
    precision                DECIMAL(5,2)            NOT NULL,
    recall                   DECIMAL(5,2)            NOT NULL,
    f1_score                 DECIMAL(5,2)            NOT NULL,
    true_positive            INT                     NOT NULL,
    false_positive           INT                     NOT NULL,
    true_negative            INT                     NOT NULL,
    false_negative           INT                     NOT NULL,
    model_binary_path        TEXT,
    azure_model_run_id       VARCHAR(255),
    azure_acr_image_tag      VARCHAR(255),
    deployment_status        model_deployment_status DEFAULT 'Pending',
    is_deployed              BOOLEAN                 DEFAULT FALSE,
    deployed_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ             DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ             DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE edge_nodes
    ADD CONSTRAINT fk_edge_active_model
    FOREIGN KEY (active_model_id) REFERENCES ai_models(id) ON DELETE SET NULL;


-- ============================================================
-- 11. TELEMETRY LIVE VITALS (Real-time IoT Stream)
-- ============================================================

CREATE TABLE telemetry_live_vitals (
    id                  BIGSERIAL    PRIMARY KEY,
    hospital_id         UUID         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id          UUID         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
    edge_node_id        UUID         REFERENCES edge_nodes(id) ON DELETE SET NULL,
    seizure_probability DECIMAL(5,4) NOT NULL,
    edge_latency_ms     INT          NOT NULL,
    eeg_amplitude_uv    DECIMAL(6,2),
    battery_percentage  INT,
    recorded_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_patient_time ON telemetry_live_vitals(patient_id, recorded_at DESC);
CREATE INDEX idx_telemetry_hospital     ON telemetry_live_vitals(hospital_id, recorded_at DESC);


-- ============================================================
-- 12. CLINICAL EEG SESSIONS
-- ============================================================

CREATE TABLE clinical_eeg_sessions (
    id                           UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id                  UUID                 NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id                   UUID                 NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
    doctor_id                    UUID                 REFERENCES doctors(id)    ON DELETE SET NULL,
    edge_node_id                 UUID                 REFERENCES edge_nodes(id) ON DELETE SET NULL,
    start_time                   TIMESTAMPTZ          NOT NULL,
    end_time                     TIMESTAMPTZ          NOT NULL,
    duration_seconds             INT                  NOT NULL,
    max_seizure_probability      DECIMAL(5,4)         NOT NULL,
    classification               eeg_classification   NOT NULL,
    data_points_count            INT                  NOT NULL,
    raw_eeg_blob_path            TEXT,
    doctor_approved_for_training BOOLEAN              DEFAULT FALSE,
    approved_at                  TIMESTAMPTZ,
    technician_status            tech_approval_status DEFAULT 'Pending Technician Review',
    created_at                   TIMESTAMPTZ          DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eeg_sessions_hospital ON clinical_eeg_sessions(hospital_id);
CREATE INDEX idx_eeg_sessions_patient  ON clinical_eeg_sessions(patient_id);
CREATE INDEX idx_eeg_sessions_approval ON clinical_eeg_sessions(hospital_id, doctor_approved_for_training);


-- ============================================================
-- 13. ADMIN NOTIFICATIONS
-- ============================================================

CREATE TABLE admin_notifications (
    id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id            UUID           NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    type                   request_type   NOT NULL,
    patient_id             UUID           REFERENCES patients(id) ON DELETE CASCADE,
    patient_name           VARCHAR(255)   NOT NULL,
    requested_by_doctor_id UUID           NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    assigned_nurse_id      UUID           REFERENCES nurses(id)  ON DELETE SET NULL,
    assigned_admin_id      UUID           REFERENCES admins(id)  ON DELETE SET NULL,
    requested_room         VARCHAR(50),
    details                TEXT,
    status                 request_status DEFAULT 'PENDING',
    sent_at                TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP,
    received_at            TIMESTAMPTZ,
    resolved_at            TIMESTAMPTZ,
    updated_at             TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_notif_hospital ON admin_notifications(hospital_id, status);


-- ============================================================
-- 14. AUDIT TELEMETRY LOGS
-- ============================================================

CREATE TABLE audit_telemetry_logs (
    id          BIGSERIAL      PRIMARY KEY,
    hospital_id UUID           NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id  UUID           REFERENCES patients(id) ON DELETE SET NULL,
    user_id     UUID           REFERENCES users(id)    ON DELETE SET NULL,
    event_type  log_event_type NOT NULL,
    severity    log_severity   NOT NULL,
    title       VARCHAR(255)   NOT NULL,
    description TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_hospital_time ON audit_telemetry_logs(hospital_id, created_at DESC);
CREATE INDEX idx_audit_patient       ON audit_telemetry_logs(patient_id);
CREATE INDEX idx_audit_severity      ON audit_telemetry_logs(hospital_id, severity);


-- ============================================================
-- SCHEMA COMPLETE
-- Total Tables : 14  |  Total ENUMs: 11  |  Total Indexes: 17
-- ============================================================
