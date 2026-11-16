# NeuroShield™ IDS: Comprehensive Architecture & Implementation Workflow

> **Audience**: Engineering & Research Teammates  
> **System**: Hybrid Edge–Fog EEG Seizure Detection System  
> **Subsystem**: NeuroShield Clinical Rule-Based Intrusion Detection System (IDS)  
> **Date**: November 2026  
> **Target Files**: `backend/Services/NeuroShieldService.cs`, `backend/Controllers/TelemetryController.cs`, `simulator/src/virtual_device_simulator.py`, `dashboard/src/pages/SecurityCenterPage.tsx`

---

## 1. Executive Overview

NeuroShield is a **synchronous, deterministic, rule-based Intrusion Detection System (IDS)** integrated directly into the telemetry ingestion pipeline of the Hybrid Edge–Fog EEG Seizure Detection System.

### Why Rule-Based over Machine Learning for IDS Ingestion?
1. **Zero False Negative Tolerance**: In an ICU or ambulatory seizure monitoring environment, packet drop or alert tampering could mask a critical status epilepticus event.
2. **Synchronous Ingestion Budget**: Medical telemetry packets require sub-millisecond validation latencies. Cryptographic hashing and deterministic token-bucket counters execute in microseconds, whereas ML inference on network traffic introduces non-deterministic latency and GPU/CPU overhead.
3. **Explainability & Medical Compliance**: Every rejected telemetry packet generates an auditable, deterministic log entry citing the exact rule failed (e.g., sequence replay, payload tampering, unauthorized MAC/ID).

---

## 2. End-to-End Architectural Dataflow

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    Edge & Ingestion Layer                   │
   │                                                             │
   │  [Arduino Nano 33 BLE / Synth]                              │
   │               │ Raw EEG (128-256 Hz)                        │
   │               ▼                                             │
   │  [Edge TFLite-Micro Classifier] ──> Seizure Probability     │
   │               │ BLE GATT Characteristic                     │
   │               ▼                                             │
   │  [Python BLE Gateway / Virtual Device Simulator]            │
   │         • Canonical HMAC-SHA256 Signing over raw bytes      │
   │         • Injects X-Device-Id, X-Sequence-Number, etc.      │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ HTTP POST /api/v1/telemetry/ingest
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                   NeuroShield IDS Pipeline                  │
   │                                                             │
   │  Stage 1: Early IP-Level Token Bucket (Anti-DoS)            │
   │     │ 429 Too Many Requests (if sustained flood)            │
   │  Stage 2: Device Registry Lookup                            │
   │     │ 401 Unauthorized (if unregistered MAC / NodeName)     │
   │  Stage 1b: Per-Device Token Bucket (Burst Allowance)        │
   │     │ 429 Too Many Requests (if device quota exceeded)      │
   │  Stage 3: Raw HTTP Body HMAC-SHA256 Verification            │
   │     │ 401 Unauthorized (if hash != computed signature)     │
   │  Stage 4: Timestamp Freshness Window (±60s Skew)            │
   │     │ 401 Unauthorized (if outside clock skew threshold)   │
   │  Stage 5: Sequence Monotonicity & Replay Protection         │
   │     │ 401 Unauthorized (if sequence <= lastAcceptedSeq)     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ Validated Packet (200 OK)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                     Clinical Fog Layer                      │
   │                                                             │
   │  [ASP.NET Core 8 WebAPI & PostgreSQL]                       │
   │     • Atomic Concurrency-Safe Conditional Commit            │
   │     • Updates telemetry_live_vitals & patient alert status  │
   │     • Real-time broadcast via TelemetryHub (WebSocket)      │
   └─────────────────────────────────────────────────────────────┘
```

---

## 3. Strict 5-Stage Synchronous Validation Order

`NeuroShieldService.ValidatePacketAsync(...)` executes validation checks in a strict, defensive hierarchy:

```csharp
// Execution Order in NeuroShieldService.cs
1. CheckTokenBucketRateLimit(ipKey, _ipBurstCapacity, _ipRefillRate)
2. Resolve registered EdgeNode from DB / DevNode registry (No default fallback)
3. CheckTokenBucketRateLimit(devKey, profile.BurstCapacity, profile.RefillRatePerSecond)
4. CryptographicOperations.FixedTimeEquals(computedHmac, receivedSigBytes)
5. Math.Abs((DateTime.UtcNow - packetUtc).TotalSeconds) <= _allowedTimestampSkewSeconds
6. sequenceNumber > Math.Max(node.LastSequenceNumber, _inMemoryNodeSequences[node.Id])
```

### Rationale Behind Order:
- **Do not trust unauthenticated data**: We do not parse timestamps or sequence numbers before validating rate limits and device registration.
- **Do not perform expensive cryptography on floods**: The early IP token bucket drops volumetric DoS floods *before* invoking HMAC computations.
- **Zero Fallback to Node-01**: Missing or unrecognized device IDs are immediately rejected with HTTP 401 (`UNKNOWN_DEVICE`). Never default to a development node when an unauthenticated device arrives.

---

## 4. Cryptographic Specifications: Canonical HMAC-SHA256

To guarantee payload integrity against Man-in-the-Middle (MitM) falsification of seizure probabilities, both the Python gateway/simulator and the C# ASP.NET Core backend share an identical canonical serialization standard.

### 4.1 Canonical Byte Construction
The signature is calculated over the raw byte concatenation of header metadata and the unparsed HTTP request body:

$$\text{Canonical Data} = \text{UTF-8}(\text{DeviceId} \mathbin{\Vert} \text{"\textbackslash n"} \mathbin{\Vert} \text{SequenceNumber} \mathbin{\Vert} \text{"\textbackslash n"} \mathbin{\Vert} \text{TimestampIso} \mathbin{\Vert} \text{"\textbackslash n"}) \mathbin{\Vert} \text{RawBodyBytes}$$

### 4.2 Cross-Platform Implementations

#### Python (`simulator/src/virtual_device_simulator.py`):
```python
def compute_hmac_signature(device_id: str, seq_num: int, timestamp_iso: str, raw_body_bytes: bytes, secret: str) -> str:
    prefix = f"{device_id}\n{seq_num}\n{timestamp_iso}\n".encode("utf-8")
    canonical_bytes = prefix + raw_body_bytes
    return hmac.new(secret.encode("utf-8"), canonical_bytes, hashlib.sha256).hexdigest().lower()
```

#### C# (`backend/Services/NeuroShieldService.cs`):
```csharp
var headerPrefixBytes = Encoding.UTF8.GetBytes($"{node.NodeName}\n{sequenceNumber}\n{timestampHeader.Trim()}\n");
var canonicalBytes = new byte[headerPrefixBytes.Length + rawBodyBytes.Length];
Buffer.BlockCopy(headerPrefixBytes, 0, canonicalBytes, 0, headerPrefixBytes.Length);
Buffer.BlockCopy(rawBodyBytes, 0, canonicalBytes, headerPrefixBytes.Length, rawBodyBytes.Length);

using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
var computedHash = hmac.ComputeHash(canonicalBytes);

// Constant-time comparison to prevent timing side-channel attacks
if (!CryptographicOperations.FixedTimeEquals(computedHash, receivedSigBytes))
{
    // Rejected: Payload or headers tampered
}
```

### 4.3 Device Secret Provisioning Hierarchy
Device secrets are **never stored in plaintext** in the database or committed to Git:
1. Environment Variable: `DEVICE_SECRET_<SANITIZED_DEVICE_ID>` (e.g. `DEVICE_SECRET_NODE_01`)
2. Configuration Provider: `NeuroShield:DeviceSecrets:<DeviceId>`
3. Fallback Dev Env: `NEUROSHIELD_DEFAULT_DEVICE_SECRET`
4. Local Dev Fallback: `NeuroShield:DefaultDeviceSecret`

---

## 5. Burst-Tolerant Token Bucket Rate Limiting

Telemetry from clinical nodes is periodic (e.g. 1 packet/sec) but can legitimately burst upon reconnection or during status state changes. A rigid sliding window drops legitimate medical packets. NeuroShield uses a **burst-tolerant token bucket algorithm**.

### 5.1 Algorithm Mechanics
Each bucket maintains:
- `_capacity`: Maximum allowable burst tokens.
- `_refillRate`: Tokens replenished per second.
- `_tokens`: Current token level ($\le \text{capacity}$).
- `_lastRefillUtc`: Timestamp of previous token recalculation.
- `_consecutiveViolations`: Strike counter for sustained flood tracking.

$$\text{Tokens}_{\text{new}} = \min\left(\text{Capacity}, \text{Tokens}_{\text{old}} + (\text{Now} - \text{LastRefill}) \times \text{RefillRate}\right)$$

### 5.2 Two-Tier Defense Architecture
1. **Tier 1 (Early IP Limiter)**:
   - Key: `ip:<RemoteIp>`
   - Defaults: Burst Capacity = `20.0`, Refill Rate = `10.0`/s.
   - Purpose: Drops network-level floods before device database lookup.
2. **Tier 2 (Per-Device Profile)**:
   - Key: `dev:<NodeName>`
   - Defaults: Burst Capacity = `6.0`, Refill Rate = `3.0`/s.
   - Configurable per-node in `appsettings.json` under `NeuroShield:RateLimiting:DeviceProfiles`.
3. **Sustained Violation Escalation**:
   - Isolated bursts return `429 Too Many Requests` to throttle the transmitter without generating security noise.
   - If an IP or device accumulates $\ge 3$ consecutive violations (`SustainedViolationThreshold`), a persistent `TRAFFIC_FLOOD` incident is recorded and broadcast to ADMINs.

---

## 6. Device Provenance Architecture

To clearly distinguish synthetic test harnesses from physical biomedical equipment, all telemetry and security events carry a server-controlled `SourceClassification`:

| Classification | Meaning | Resolution Mechanism |
| :--- | :--- | :--- |
| `PHYSICAL` | Certified physical hardware (Arduino Nano 33 BLE) | Matched to registered node with `SourceClassification = "PHYSICAL"` (e.g. `Node-02`) |
| `SIMULATOR` | Verified software test harness | Matched to registered node with `SourceClassification = "SIMULATOR"` (e.g. `Node-01`) |
| `UNTRUSTED` | Rogue / unregistered device or attacker | Default assigned to any missing ID, unregistered device, or failed signature |

> [!IMPORTANT]
> Provenance is **never trusted from the incoming JSON body or HTTP headers**. It is resolved exclusively on the backend from the registered database entity or development registry.

---

## 7. Concurrency-Safe Atomic Persistence & Clinical Isolation

### 7.1 The Replay Race Condition
If two identical replayed packets arrive simultaneously on separate CPU threads, both might pass the in-memory sequence check before either updates the database.

### 7.2 The Solution: Conditional Database Execution
`CommitSequenceAndTelemetryAsync` uses an atomic SQL conditional clause:

```sql
UPDATE edge_nodes 
SET last_sequence_number = @newSeq, 
    last_heartbeat = @now, 
    updated_at = @now 
WHERE id = @nodeId 
  AND last_sequence_number < @newSeq;
```

- If two concurrent threads execute this, the first thread gets `rowsAffected == 1` and commits the clinical vitals.
- The second thread receives `rowsAffected == 0`, rolls back the transaction, logs a `REPLAY_ATTACK` security incident, and returns `401 Unauthorized`.

### 7.3 Clinical Table Isolation Guarantee
Under no circumstances is an unauthenticated or invalid packet permitted to alter clinical state:
- If any of the 5 validation rules fail, `TelemetryController` returns `401` or `429` immediately.
- The `telemetry_live_vitals` table is **not modified**.
- The `patients.status` field is **not updated**.

---

## 8. SignalR AlertsHub & Tenant Isolation

1. **Role Enforcement**: `AlertsHub` and `SecurityController` require the `ADMIN` role claim in the JWT. `DOCTOR`, `NURSE`, and `TECHNICIAN` roles are strictly prohibited.
2. **Tenant Isolation**: When an ADMIN connects to `AlertsHub`, the backend extracts `hospital_id` directly from the validated JWT claim and joins `alerts_{hospitalId}`. Browser-supplied tenant IDs are rejected.
3. **Clinical Privacy Guarantee**: Security incident payloads sent via SignalR or REST APIs strictly omit:
   - Patient PII (Name, MRN, Room number).
   - Raw EEG time-series samples.
   - Device cryptographic secret keys.

---

## 9. Virtual Attack Simulator & CLI Harness

The simulator (`simulator/src/virtual_device_simulator.py`) exercises all 5 IDS vectors without physical hardware:

```bash
# 1. Normal Authenticated Ingestion (HTTP 200)
python simulator/src/virtual_device_simulator.py --mode normal --count 5

# 2. Unknown / Rogue Device Injection (HTTP 401 UNKNOWN_DEVICE)
python simulator/src/virtual_device_simulator.py --mode attack-unknown

# 3. Sequence Replay Attack (HTTP 401 REPLAY_ATTACK)
python simulator/src/virtual_device_simulator.py --mode attack-replay

# 4. In-Transit Payload Tampering (HTTP 401 INVALID_SIGNATURE)
python simulator/src/virtual_device_simulator.py --mode attack-tamper

# 5. Volumetric DoS Flood (HTTP 429 TRAFFIC_FLOOD)
python simulator/src/virtual_device_simulator.py --mode attack-flood
```

---

## 10. Codebase File Map & Reference Guide

```
├── backend/
│   ├── Services/
│   │   ├── INeuroShieldService.cs          # Service interface & contracts
│   │   └── NeuroShieldService.cs           # 5-stage IDS engine & token bucket
│   ├── Controllers/
│   │   ├── TelemetryController.cs          # Synchronous ingest endpoint
│   │   └── SecurityController.cs           # ADMIN-only security APIs & config summary
│   ├── DTOs/
│   │   └── NeuroShieldDTOs.cs              # Validation, Incident, and Rate Limit DTOs
│   ├── Models/
│   │   ├── SecurityIncident.cs             # PostgreSQL audit entity
│   │   └── Entities.cs                     # EdgeNode with SourceClassification
│   └── appsettings.json                    # Rate limiting & skew configuration
│
├── backend.Tests/
│   └── NeuroShieldTests.cs                 # 8 unit tests (Burst, Refill, Provenance, HMAC, Replay)
│
├── dashboard/src/
│   ├── pages/
│   │   └── SecurityCenterPage.tsx          # Command Center UI, SVG pipeline & packet inspector
│   ├── types/
│   │   └── security.ts                     # TypeScript security interfaces
│   └── services/
│       └── apiClient.ts                    # REST API integration methods
│
└── simulator/src/
    └── virtual_device_simulator.py         # Multi-mode attack & telemetry simulator
```

---

## 11. Teammate Implementation Checklist & Next Steps

When extending NeuroShield, follow these guidelines:

- [ ] **Do Not Modify Rule Order**: If adding a new heuristic (e.g. geographic IP lookup or BLE signal anomaly), place it after rate limiting and before clinical database transactions.
- [ ] **Hardware Secrets Integration**: For physical Nano 33 BLE deployment, replace environment variables with hardware-backed secure elements (e.g., ATECC608A cryptographic co-processor) or Azure Key Vault references.
- [ ] **Multi-Channel Montage Density**: When testing dense 16/32-channel clinical EEG streaming, increase `BurstCapacity` and `RefillRatePerSecond` in `appsettings.json` to account for fragmented transmission frames.
- [ ] **Database Migrations**: Always execute `schema.sql` additive columns (`source_classification`) when spinning up fresh PostgreSQL environments.
