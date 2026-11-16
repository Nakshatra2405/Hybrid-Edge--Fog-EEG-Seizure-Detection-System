-- ============================================================
-- Seed Data Script for EEG Seizure Detection System
-- Multi-Tenant Database: eeg_seizure_db
-- Password for all mock users: password123 (BCrypt hash)
-- ============================================================

-- Clean existing data in reverse order of foreign keys
TRUNCATE TABLE audit_telemetry_logs, admin_notifications, clinical_eeg_sessions, 
               telemetry_live_vitals, edge_nodes, ai_models, patients, 
               doctor_nurse_assignments, technicians, nurses, doctors, admins, 
               users, hospitals CASCADE;

-- 1. Insert Hospital
INSERT INTO hospitals (id, name, code, address, city, state, country, is_active)
VALUES (
    'b3d701b4-3968-4ba7-a0b5-19e6418b64c6',
    'Metro General Hospital - Epilepsy Center',
    'MGH-EPI-01',
    '100 Medical Center Blvd',
    'Boston',
    'MA',
    'USA',
    TRUE
);

-- Common BCrypt hash for 'password123': $2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

-- 2. Insert Users
-- Admin
INSERT INTO users (id, hospital_id, email, password_hash, full_name, role, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'admin@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator John Vance', 'ADMIN', TRUE);

-- Doctors
INSERT INTO users (id, hospital_id, email, password_hash, full_name, role, is_active) VALUES
('22222222-2222-2222-2222-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'doctor@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Dr. Sarah Roberts, MD', 'DOCTOR', TRUE),
('22222222-2222-2222-2222-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'doctor.chen@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Dr. Michael Chen, MD', 'DOCTOR', TRUE),
('22222222-2222-2222-2222-333333333333', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'doctor.watson@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Dr. Emily Watson, MD', 'DOCTOR', TRUE);

-- Nurses
INSERT INTO users (id, hospital_id, email, password_hash, full_name, role, is_active) VALUES
('33333333-3333-3333-3333-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'nurse@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Elena Rostova, RN', 'NURSE', TRUE),
('33333333-3333-3333-3333-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'nurse.marcus@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Marcus Brody, RN', 'NURSE', TRUE),
('33333333-3333-3333-3333-333333333333', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'nurse.kim@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'David Kim, RN', 'NURSE', TRUE),
('33333333-3333-3333-3333-444444444444', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'nurse.jenkins@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sarah Jenkins, RN', 'NURSE', TRUE);

-- Technicians
INSERT INTO users (id, hospital_id, email, password_hash, full_name, role, is_active) VALUES
('44444444-4444-4444-4444-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'technician@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Alex Mercer', 'TECHNICIAN', TRUE),
('44444444-4444-4444-4444-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'technician.priya@hospital.com', '$2a$11$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Priya Sharma', 'TECHNICIAN', TRUE);

-- 3. Insert Specific Role Entities
INSERT INTO admins (id, user_id, hospital_id, admin_code, access_level, can_assign_roles) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ADM-001', 'SuperAdmin', TRUE);

INSERT INTO doctors (id, user_id, hospital_id, license_number, specialization, pager_number, consultation_hours) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-111111111111', '22222222-2222-2222-2222-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'MD-99412', 'Epileptology & Clinical Neurophysiology', 'P-401', 'Mon-Fri 08:00-16:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-222222222222', '22222222-2222-2222-2222-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'MD-88123', 'Pediatric Neurology', 'P-402', 'Mon-Thu 09:00-17:00'),
('bbbbbbbb-bbbb-bbbb-bbbb-333333333333', '22222222-2222-2222-2222-333333333333', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'MD-77561', 'Critical Care Neurology & ICU', 'P-405', 'Rotating Shifts');

INSERT INTO nurses (id, user_id, hospital_id, license_number, assigned_floor, shift_type) VALUES
('cccccccc-cccc-cccc-cccc-111111111111', '33333333-3333-3333-3333-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'RN-30012', 'Floor 4 - ICU', 'Morning'),
('cccccccc-cccc-cccc-cccc-222222222222', '33333333-3333-3333-3333-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'RN-30045', 'Floor 4 - ICU', 'Night'),
('cccccccc-cccc-cccc-cccc-333333333333', '33333333-3333-3333-3333-333333333333', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'RN-20098', 'Floor 2 - Ward', 'Morning'),
('cccccccc-cccc-cccc-cccc-444444444444', '33333333-3333-3333-3333-444444444444', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'RN-20099', 'Floor 3 - Neuro Ward', 'Rotating');

INSERT INTO technicians (id, user_id, hospital_id) VALUES
('dddddddd-dddd-dddd-dddd-111111111111', '44444444-4444-4444-4444-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6'),
('dddddddd-dddd-dddd-dddd-222222222222', '44444444-4444-4444-4444-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6');

-- 4. Insert Care Team Assignments
INSERT INTO doctor_nurse_assignments (id, hospital_id, doctor_id, nurse_id) VALUES
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', 'cccccccc-cccc-cccc-cccc-111111111111'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'bbbbbbbb-bbbb-bbbb-bbbb-222222222222', 'cccccccc-cccc-cccc-cccc-333333333333'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'bbbbbbbb-bbbb-bbbb-bbbb-333333333333', 'cccccccc-cccc-cccc-cccc-222222222222');

-- 5. Insert AI Models
INSERT INTO ai_models (id, hospital_id, version_name, trained_by_technician_id, sample_count, accuracy, precision, recall, f1_score, true_positive, false_positive, true_negative, false_negative, is_deployed, deployment_status, deployed_at) VALUES
('fa111111-1111-1111-1111-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'SeizureNet-v3.2', 'dddddddd-dddd-dddd-dddd-111111111111', 1736, 98.40, 97.90, 98.10, 98.00, 842, 18, 860, 16, TRUE, 'Live', NOW() - INTERVAL '2 days'),
('fa222222-2222-2222-2222-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'SeizureNet-v3.1', 'dddddddd-dddd-dddd-dddd-111111111111', 1650, 96.80, 95.90, 96.20, 96.00, 780, 32, 810, 28, FALSE, 'Pending', NOW() - INTERVAL '14 days'),
('fa333333-3333-3333-3333-333333333333', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'SeizureNet-v2.8', 'dddddddd-dddd-dddd-dddd-222222222222', 1510, 94.20, 93.10, 93.80, 93.40, 690, 52, 720, 48, FALSE, 'Pending', NOW() - INTERVAL '30 days');

-- 6. Insert Patients
INSERT INTO patients (id, hospital_id, mrn, first_name, last_name, dob, gender, blood_group, status, assigned_floor, room, assigned_doctor_id, assigned_nurse_id) VALUES
-- ICU Patients (Dr. Sarah Roberts + Dr. Emily Watson, Nurse Elena + Nurse Marcus)
('ea111111-1111-1111-1111-111111111111', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-9082', 'James', 'Doe', '1989-05-14', 'Male', 'O+', 'Critical', 'Floor 4 - ICU', '402', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', 'cccccccc-cccc-cccc-cccc-111111111111'),
('ea222222-2222-2222-2222-222222222222', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-9083', 'Emma', 'Watson', '1995-08-22', 'Female', 'A+', 'Monitoring', 'Floor 4 - ICU', '403', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', 'cccccccc-cccc-cccc-cccc-111111111111'),
('ea333333-3333-3333-3333-333333333333', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-9084', 'Sophia', 'Miller', '1992-02-18', 'Female', 'AB+', 'Critical', 'Floor 4 - ICU', '405', 'bbbbbbbb-bbbb-bbbb-bbbb-333333333333', 'cccccccc-cccc-cccc-cccc-222222222222'),
('ea444444-4444-4444-4444-444444444444', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-9085', 'Oliver', 'Davis', '1984-10-09', 'Male', 'O-', 'Monitoring', 'Floor 4 - ICU', '406', 'bbbbbbbb-bbbb-bbbb-bbbb-333333333333', 'cccccccc-cccc-cccc-cccc-222222222222'),

-- Ward 2 Patients (Dr. Michael Chen, Nurse David Kim)
('ea555555-5555-5555-5555-555555555555', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-8011', 'Robert', 'Chen', '1978-11-30', 'Male', 'B+', 'Stable', 'Floor 2 - Ward', '201', 'bbbbbbbb-bbbb-bbbb-bbbb-222222222222', 'cccccccc-cccc-cccc-cccc-333333333333'),
('ea666666-6666-6666-6666-666666666666', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-8012', 'Lucas', 'Vance', '2001-04-03', 'Male', 'A-', 'Monitoring', 'Floor 2 - Ward', '202', 'bbbbbbbb-bbbb-bbbb-bbbb-222222222222', 'cccccccc-cccc-cccc-cccc-333333333333'),

-- Neuro Ward 3 Patients (Dr. Sarah Roberts, Nurse Sarah Jenkins)
('ea777777-7777-7777-7777-777777777777', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-7001', 'Ava', 'Taylor', '1999-07-19', 'Female', 'O+', 'Stable', 'Floor 3 - Neuro Ward', '301', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', 'cccccccc-cccc-cccc-cccc-444444444444'),
('ea888888-8888-8888-8888-888888888888', 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'PAT-7002', 'William', 'Brown', '1986-12-25', 'Male', 'B-', 'Monitoring', 'Floor 3 - Neuro Ward', '302', 'bbbbbbbb-bbbb-bbbb-bbbb-222222222222', 'cccccccc-cccc-cccc-cccc-444444444444');

-- 7. Insert Edge Nodes (Arduino Nano 33 BLE Sense Wearables)
INSERT INTO edge_nodes (id, hospital_id, node_name, hardware_mac, room, patient_id, battery_percentage, status, active_model_id, firmware_version) VALUES
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-01', 'E4:5F:01:2A:9C:14', '402', 'ea111111-1111-1111-1111-111111111111', 94, 'ONLINE', 'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-02', 'E4:5F:01:2A:9C:15', '403', 'ea222222-2222-2222-2222-222222222222', 88, 'ONLINE', 'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-03', 'E4:5F:01:2A:9C:16', '405', 'ea333333-3333-3333-3333-333333333333', 82, 'ALERT',  'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-04', 'E4:5F:01:2A:9C:17', '406', 'ea444444-4444-4444-4444-444444444444', 91, 'ONLINE', 'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-05', 'E4:5F:01:2A:9C:18', '201', 'ea555555-5555-5555-5555-555555555555', 99, 'ONLINE', 'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-06', 'E4:5F:01:2A:9C:19', '202', 'ea666666-6666-6666-6666-666666666666', 76, 'ONLINE', 'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-07', 'E4:5F:01:2A:9C:20', '301', 'ea777777-7777-7777-7777-777777777777', 45, 'ONLINE', 'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'Node-08', 'E4:5F:01:2A:9C:21', '302', 'ea888888-8888-8888-8888-888888888888', 14, 'ALERT',  'fa111111-1111-1111-1111-111111111111', 'SeizureNet-v3.2');

-- 8. Insert Live Telemetry Vitals
INSERT INTO telemetry_live_vitals (hospital_id, patient_id, seizure_probability, edge_latency_ms, eeg_amplitude_uv, battery_percentage, recorded_at) VALUES
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea111111-1111-1111-1111-111111111111', 0.9420, 14, 45.2, 94, NOW()),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea222222-2222-2222-2222-222222222222', 0.8850, 12, 38.1, 88, NOW()),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea333333-3333-3333-3333-333333333333', 0.9180, 15, 48.7, 82, NOW()),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea444444-4444-4444-4444-444444444444', 0.2840, 14, 18.2, 91, NOW()),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea555555-5555-5555-5555-555555555555', 0.1200, 16, 12.4, 99, NOW()),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea666666-6666-6666-6666-666666666666', 0.4520, 13, 22.9, 76, NOW()),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea777777-7777-7777-7777-777777777777', 0.0850, 14, 9.8,  45, NOW()),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea888888-8888-8888-8888-888888888888', 0.6210, 15, 31.5, 14, NOW());

-- 9. Insert Clinical EEG Sessions
INSERT INTO clinical_eeg_sessions (id, hospital_id, patient_id, doctor_id, start_time, end_time, duration_seconds, max_seizure_probability, classification, data_points_count, doctor_approved_for_training, approved_at, technician_status) VALUES
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', 3600, 0.9650, 'Ictal Seizure Event', 7200, TRUE, NOW() - INTERVAL '45 mins', 'Approved for Training'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', 3600, 0.8920, 'Pre-Ictal Warning', 7200, TRUE, NOW() - INTERVAL '30 mins', 'Approved for Training'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-333333333333', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', 3600, 0.9410, 'Ictal Seizure Event', 7200, TRUE, NOW() - INTERVAL '20 mins', 'Added to Training'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-222222222222', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '11 hours', 3600, 0.1250, 'Normal Baseline', 7200, FALSE, NULL, 'Pending Technician Review'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'ea666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-222222222222', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours', 3600, 0.4800, 'Pre-Ictal Warning', 7200, FALSE, NULL, 'Pending Technician Review');

-- 10. Insert Admin Notifications
INSERT INTO admin_notifications (id, hospital_id, type, patient_id, patient_name, requested_by_doctor_id, assigned_nurse_id, requested_room, details, status, sent_at) VALUES
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'admission_request', NULL, 'David Miller', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', 'cccccccc-cccc-cccc-cccc-111111111111', '404', 'Admitting for 24h continuous video-EEG monitoring.', 'PENDING', NOW() - INTERVAL '40 mins'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'discharge_request', 'ea555555-5555-5555-5555-555555555555', 'Robert Chen', 'bbbbbbbb-bbbb-bbbb-bbbb-222222222222', 'cccccccc-cccc-cccc-cccc-333333333333', '201', 'Patient stable, 72 hours seizure-free on adjusted dosage.', 'PENDING', NOW() - INTERVAL '25 mins'),
(gen_random_uuid(), 'b3d701b4-3968-4ba7-a0b5-19e6418b64c6', 'call_code', 'ea111111-1111-1111-1111-111111111111', 'James Doe', 'bbbbbbbb-bbbb-bbbb-bbbb-111111111111', 'cccccccc-cccc-cccc-cccc-111111111111', '402', 'EMERGENCY CODE BLUE - Generalized tonic-clonic episode > 3 mins.', 'APPROVED', NOW() - INTERVAL '15 mins');

-- 11. Insert Audit Telemetry Logs
INSERT INTO audit_telemetry_logs (hospital_id, user_id, event_type, severity, title, description, created_at) VALUES
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', '11111111-1111-1111-1111-111111111111', 'LOGIN', 'INFO', 'User Authenticated', 'Administrator John Vance logged into Admin portal.', NOW() - INTERVAL '2 hours'),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', '22222222-2222-2222-2222-111111111111', 'SEIZURE_ALERT', 'CRITICAL', 'Ictal Seizure Detected (94.2%)', 'Edge Node-01 triggered real-time seizure alert in Room 402 for James Doe.', NOW() - INTERVAL '1 hour'),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', '44444444-4444-4444-4444-111111111111', 'MODEL_DEPLOYMENT', 'SUCCESS', 'Wireless BLE OTA Deployed', 'Technician Alex Mercer deployed SeizureNet-v3.2 to 8 edge nodes.', NOW() - INTERVAL '2 days'),
('b3d701b4-3968-4ba7-a0b5-19e6418b64c6', NULL, 'BATTERY_LOW', 'WARNING', 'Low Battery Alert on Node-08', 'Hardware Node-08 in Room 302 reported battery level 14%.', NOW() - INTERVAL '30 mins');

-- ============================================================
-- SEED COMPLETE
-- ============================================================
