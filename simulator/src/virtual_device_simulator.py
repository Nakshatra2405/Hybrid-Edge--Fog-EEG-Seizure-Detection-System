"""
Virtual Device Simulator for NeuroShield IDS
Demonstrates authenticated clinical telemetry and rule-based attack vectors.
Does not require physical Arduino Nano or BLE hardware.
"""

import sys
import os
import time
import json
import hmac
import hashlib
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone

DEFAULT_BACKEND_URL = os.environ.get("BACKEND_INGEST_URL", "http://localhost:5000/api/v1/telemetry/ingest")
DEFAULT_DEVICE_ID = os.environ.get("DEVICE_ID", "Node-01")
DEFAULT_SECRET = os.environ.get("DEVICE_SECRET_NODE_01") or os.environ.get("NEUROSHIELD_DEFAULT_DEVICE_SECRET") or "dev_shared_eeg_edge_secret_2026!"

def compute_hmac_signature(device_id: str, seq_num: int, timestamp_iso: str, raw_body_bytes: bytes, secret: str) -> str:
    """Computes HMAC-SHA256 matching C# NeuroShieldService canonical format:
    canonical = f"{device_id}\n{seq_num}\n{timestamp_iso}\n" + raw_body_bytes
    """
    prefix = f"{device_id}\n{seq_num}\n{timestamp_iso}\n".encode("utf-8")
    canonical_bytes = prefix + raw_body_bytes
    return hmac.new(secret.encode("utf-8"), canonical_bytes, hashlib.sha256).hexdigest().lower()

def send_packet(url: str, device_id: str, seq_num: int, timestamp_iso: str, signature: str, raw_body_bytes: bytes) -> tuple[int, str]:
    headers = {
        "Content-Type": "application/json",
        "X-Device-Id": device_id,
        "X-Sequence-Number": str(seq_num),
        "X-Timestamp": timestamp_iso,
        "X-Signature": signature
    }

    req = urllib.request.Request(url, data=raw_body_bytes, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode("utf-8")
            return response.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body
    except Exception as e:
        return 0, str(e)

def build_telemetry_payload(device_id: str, seizure_prob: float = 0.05, latency_ms: int = 14, battery: int = 95) -> bytes:
    payload = {
        "deviceId": device_id,
        "seizureProbability": seizure_prob,
        "edgeLatencyMs": latency_ms,
        "batteryPercentage": battery,
        "status": "ALERT" if seizure_prob >= 0.70 else "ONLINE"
    }
    return json.dumps(payload, separators=(',', ':')).encode("utf-8")

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def run_normal(args):
    print(f"\n[*] Starting Normal Authenticated Stream ({args.count} packets, interval={args.interval}s)...")
    print(f"    Target URL: {args.url}")
    print(f"    Device ID : {args.device}")
    
    current_seq = args.start_seq
    for i in range(args.count):
        current_seq += 1
        timestamp = datetime.now(timezone.utc).isoformat()
        body_bytes = build_telemetry_payload(args.device, seizure_prob=0.08, latency_ms=13 + (i % 3))
        sig = compute_hmac_signature(args.device, current_seq, timestamp, body_bytes, args.secret)

        code, resp = send_packet(args.url, args.device, current_seq, timestamp, sig, body_bytes)
        status_tag = "[PASS]" if code == 200 else "[FAIL]"
        print(f"    [{i+1}/{args.count}] {status_tag} HTTP {code} | Seq={current_seq} | Response: {resp.strip()[:100]}")
        if i < args.count - 1:
            time.sleep(args.interval)

def run_attack_unknown(args):
    print("\n[!] Simulating Attack 1: Unknown / Unregistered Device Injection...")
    rogue_id = "Rogue-Attacker-Node-99"
    timestamp = datetime.now(timezone.utc).isoformat()
    seq_num = 1
    body_bytes = build_telemetry_payload(rogue_id, seizure_prob=0.98)
    sig = compute_hmac_signature(rogue_id, seq_num, timestamp, body_bytes, "arbitrary_attacker_key")

    code, resp = send_packet(args.url, rogue_id, seq_num, timestamp, sig, body_bytes)
    print(f"    HTTP Status: {code}")
    print(f"    Server Body: {resp}")
    if code == 401 and "UNKNOWN_DEVICE" in resp:
        print("    [SUCCESS] NeuroShield IDS intercepted unknown device and rejected telemetry!")
    else:
        print(f"    [WARNING] Unexpected response: {code} {resp}")

def run_attack_replay(args):
    print("\n[!] Simulating Attack 2: Replay Attack (Duplicate / Stale Sequence Number)...")
    timestamp = datetime.now(timezone.utc).isoformat()
    # Sending sequence 1 which is <= any modern accepted sequence
    stale_seq = 1
    body_bytes = build_telemetry_payload(args.device, seizure_prob=0.05)
    sig = compute_hmac_signature(args.device, stale_seq, timestamp, body_bytes, args.secret)

    code, resp = send_packet(args.url, args.device, stale_seq, timestamp, sig, body_bytes)
    print(f"    HTTP Status: {code}")
    print(f"    Server Body: {resp}")
    if code == 401 and "REPLAY_ATTACK" in resp:
        print("    [SUCCESS] NeuroShield IDS intercepted replayed sequence and rejected telemetry!")
    else:
        print(f"    [WARNING] Unexpected response: {code} {resp}")

def run_attack_tamper(args):
    print("\n[!] Simulating Attack 3: Payload Tampering (MitM falsification of seizure probability)...")
    timestamp = datetime.now(timezone.utc).isoformat()
    seq_num = args.start_seq + 500

    # Legitimate edge signature generated for normal baseline 0.05
    original_body = build_telemetry_payload(args.device, seizure_prob=0.05)
    valid_sig = compute_hmac_signature(args.device, seq_num, timestamp, original_body, args.secret)

    # In-transit adversary modifies seizure probability to 0.99 to force fake Code Blue
    tampered_body = build_telemetry_payload(args.device, seizure_prob=0.99)

    code, resp = send_packet(args.url, args.device, seq_num, timestamp, valid_sig, tampered_body)
    print(f"    HTTP Status: {code}")
    print(f"    Server Body: {resp}")
    if code == 401 and "INVALID_SIGNATURE" in resp:
        print("    [SUCCESS] NeuroShield IDS detected cryptographic tampering and rejected packet!")
    else:
        print(f"    [WARNING] Unexpected response: {code} {resp}")

def run_attack_flood(args):
    print("\n[!] Simulating Attack 4: Telemetry Flooding (DoS Burst)...")
    print("    Firing 25 packets in under 500ms...")
    timestamp = datetime.now(timezone.utc).isoformat()
    flood_seq = args.start_seq + 1000

    blocked_count = 0
    for i in range(25):
        flood_seq += 1
        body = build_telemetry_payload(args.device, seizure_prob=0.05)
        sig = compute_hmac_signature(args.device, flood_seq, timestamp, body, args.secret)
        code, resp = send_packet(args.url, args.device, flood_seq, timestamp, sig, body)
        if code == 429:
            blocked_count += 1
        print(f"    Burst #{i+1:02d}: HTTP {code}")
        time.sleep(0.01)

    print(f"\n    Result: {blocked_count}/25 packets rate-limited (HTTP 429).")
    if blocked_count > 0:
        print("    [SUCCESS] NeuroShield IDS rate limiting triggered and mitigated packet flood!")

def main():
    parser = argparse.ArgumentParser(description="NeuroShield Virtual Device Simulator & Attack Harness")
    parser.add_argument("--mode", choices=["normal", "attack-unknown", "attack-replay", "attack-tamper", "attack-flood"],
                        default="normal", help="Simulation mode")
    parser.add_argument("--url", default=DEFAULT_BACKEND_URL, help="Backend telemetry ingest URL")
    parser.add_argument("--device", default=DEFAULT_DEVICE_ID, help="Edge device ID")
    parser.add_argument("--secret", default=DEFAULT_SECRET, help="Pre-shared HMAC secret key")
    parser.add_argument("--count", type=int, default=5, help="Packet count for normal mode")
    parser.add_argument("--interval", type=float, default=1.0, help="Interval in seconds for normal mode")
    parser.add_argument("--start-seq", type=int, default=int(time.time()), help="Initial sequence number")

    args = parser.parse_args()

    if args.mode == "normal":
        run_normal(args)
    elif args.mode == "attack-unknown":
        run_attack_unknown(args)
    elif args.mode == "attack-replay":
        run_attack_replay(args)
    elif args.mode == "attack-tamper":
        run_attack_tamper(args)
    elif args.mode == "attack-flood":
        run_attack_flood(args)

if __name__ == "__main__":
    main()
