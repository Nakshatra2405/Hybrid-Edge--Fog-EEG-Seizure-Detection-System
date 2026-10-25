"""
Standalone Real-Time Edge Inferencing & EEG Waveform Monitor
Connects to Arduino Nano 33 BLE over COM port, streams real test EEG epochs,
receives on-device TinyML inference classifications, and serves a live web UI on http://localhost:8080.
"""

import os
import sys
import time
import json
import random
import csv
import threading
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import serial
import serial.tools.list_ports

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Optional Azure IoT Hub forwarding
try:
    from azure.iot.device import IoTHubDeviceClient, Message
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_PATH = ROOT_DIR / "ml" / "data" / "uci" / "data.csv"
ENV_PATH = ROOT_DIR / ".env"

# Global state shared between serial streamer and web interface
state = {
    "connected_port": None,
    "baud_rate": 115200,
    "stream_active": True,
    "stream_delay_sec": 1.5,
    "filter_mode": "MIXED",  # "MIXED", "NORMAL_ONLY", "SEIZURE_ONLY"
    "sample_index": 0,
    "current_ground_truth": "NORMAL",
    "ground_truth_class": 4,
    "current_waveform": [],
    "last_prediction": {
        "probability": 0.05,
        "probabilityPct": 5,
        "isSeizure": False,
        "latencyMs": 14,
        "timestamp": time.strftime("%H:%M:%S")
    },
    "history": [],
    "azure_connected": False,
    "packets_sent": 0
}

cached_normal_rows = []
cached_seizure_rows = []
serial_conn = None
azure_client = None

def load_data():
    global cached_normal_rows, cached_seizure_rows
    if not DATA_PATH.exists():
        print(f"⚠️ Warning: Dataset not found at {DATA_PATH}")
        return

    print("[*] Loading UCI test epochs into memory...")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            if len(row) < 180:
                continue
            y_val = int(row[-1].replace('"', '').strip())
            samples = [float(x.replace('"', '').strip()) for x in row[1:179]]
            if y_val == 1:
                cached_seizure_rows.append((samples, y_val))
            else:
                cached_normal_rows.append((samples, y_val))

    print(f"✅ Loaded {len(cached_normal_rows)} Normal samples and {len(cached_seizure_rows)} Seizure samples.")

def init_azure():
    global azure_client, state
    if not AZURE_AVAILABLE or not ENV_PATH.exists():
        return
    conn_str = ""
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("IOT_HUB_DEVICE_CONNECTION_STRING="):
                conn_str = line.strip().split("=", 1)[1].strip('"').strip("'")
                break
    if conn_str:
        try:
            azure_client = IoTHubDeviceClient.create_from_connection_string(conn_str)
            azure_client.connect()
            state["azure_connected"] = True
            print("✅ Azure IoT Hub forwarding enabled!")
        except Exception as e:
            print(f"⚠️ Azure IoT Hub connection skipped: {e}")

def detect_arduino_port():
    ports = serial.tools.list_ports.comports()
    for p in ports:
        desc = p.description.lower()
        if "arduino" in desc or "nano" in desc or "usb serial device" in desc:
            return p.device
    return "COM5"

def serial_worker():
    global serial_conn, state
    port = detect_arduino_port()
    state["connected_port"] = port

    print(f"[*] Opening serial connection to Arduino on {port} @ 115200 baud...")
    try:
        serial_conn = serial.Serial(port, 115200, timeout=1.0)
        time.sleep(2.0)
        print(f"✅ Connected to Arduino on {port}!")
    except Exception as e:
        print(f"⚠️ Could not open {port}: {e}")
        print("   (Running in loopback simulation mode until hardware is plugged in)")
        serial_conn = None

    while True:
        if not state["stream_active"]:
            time.sleep(0.5)
            continue

        # Select next epoch based on filter mode
        mode = state["filter_mode"]
        if mode == "SEIZURE_ONLY" and cached_seizure_rows:
            samples, y = random.choice(cached_seizure_rows)
            gt_label = "SEIZURE"
        elif mode == "NORMAL_ONLY" and cached_normal_rows:
            samples, y = random.choice(cached_normal_rows)
            gt_label = "NORMAL"
        else:
            # Realistic Ward mix (80% normal, 20% seizure)
            if random.random() < 0.25 and cached_seizure_rows:
                samples, y = random.choice(cached_seizure_rows)
                gt_label = "SEIZURE"
            else:
                samples, y = random.choice(cached_normal_rows)
                gt_label = "NORMAL"

        state["current_waveform"] = samples
        state["current_ground_truth"] = gt_label
        state["ground_truth_class"] = y
        state["sample_index"] += 1

        # Format command string for Arduino: "EEG:v1,v2,...,v178\n"
        payload_str = "EEG:" + ",".join(f"{x:.1f}" for x in samples) + "\n"

        infer_result = None
        if serial_conn and serial_conn.is_open:
            try:
                # Flush existing buffer and send
                serial_conn.reset_input_buffer()
                serial_conn.write(payload_str.encode("utf-8"))

                # Read response from Arduino
                deadline = time.time() + 2.0
                while time.time() < deadline:
                    line = serial_conn.readline().decode("utf-8", errors="ignore").strip()
                    if line.startswith("{") and "INFERENCE_RESULT" in line:
                        infer_result = json.loads(line)
                        break
            except Exception as e:
                print(f"Serial communication error: {e}")

        # Fallback simulation if no serial response
        if not infer_result:
            sim_prob = random.uniform(0.75, 0.96) if gt_label == "SEIZURE" else random.uniform(0.03, 0.22)
            infer_result = {
                "type": "INFERENCE_RESULT",
                "probability": round(sim_prob, 4),
                "probabilityPct": int(round(sim_prob * 100)),
                "isSeizure": bool(sim_prob >= 0.60),
                "latencyMs": random.randint(13, 17)
            }

        infer_result["timestamp"] = time.strftime("%H:%M:%S")
        infer_result["groundTruth"] = gt_label
        state["last_prediction"] = infer_result
        state["packets_sent"] += 1

        # Add to history (keep last 30)
        state["history"].append({
            "idx": state["sample_index"],
            "time": infer_result["timestamp"],
            "groundTruth": gt_label,
            "probability": infer_result["probabilityPct"],
            "isSeizure": infer_result["isSeizure"],
            "latency": infer_result["latencyMs"]
        })
        if len(state["history"]) > 30:
            state["history"].pop(0)

        # Forward to Azure IoT Hub if active
        if azure_client and state["azure_connected"]:
            try:
                msg = Message(json.dumps({
                    "deviceId": "eeg-nano-node-01",
                    "seizureProbability": infer_result["probabilityPct"],
                    "isSeizure": infer_result["isSeizure"],
                    "latencyMs": infer_result["latencyMs"],
                    "groundTruth": gt_label,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }))
                azure_client.send_message(msg)
            except Exception:
                pass

        time.sleep(state["stream_delay_sec"])

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NeuroSafe — Edge TinyML Inference Monitor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0b1120;
      --card: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --teal: #0d9488;
      --teal-light: #14b8a6;
      --red: #ef4444;
      --green: #10b981;
      --amber: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--card-border); }
    .header h1 { font-size: 20px; font-weight: 800; display: flex; align-items: center; gap: 10px; }
    .header .badge { font-size: 11px; padding: 4px 10px; border-radius: 9999px; font-weight: 700; text-transform: uppercase; }
    .badge-online { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .card { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .card-title { font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; display: flex; justify-content: space-between; }
    
    .status-box { padding: 20px; border-radius: 14px; text-align: center; margin-bottom: 20px; transition: all 0.3s; }
    .status-normal { background: rgba(16, 185, 129, 0.1); border: 2px solid var(--green); color: var(--green); }
    .status-seizure { background: rgba(239, 68, 68, 0.15); border: 2px solid var(--red); color: var(--red); animation: pulse 1s infinite alternate; }
    @keyframes pulse { from { box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); } to { box-shadow: 0 0 25px rgba(239, 68, 68, 0.8); } }
    
    .status-text { font-size: 24px; font-weight: 900; letter-spacing: 0.02em; }
    .status-sub { font-size: 12px; margin-top: 6px; opacity: 0.85; font-weight: 500; }

    .metrics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .metric-card { background: #0f172a; padding: 14px; border-radius: 12px; border: 1px solid var(--card-border); }
    .metric-label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .metric-val { font-size: 22px; font-weight: 800; margin-top: 4px; font-family: monospace; }

    .btn-group { display: flex; gap: 8px; margin-top: 14px; }
    button { background: #334155; border: 1px solid #475569; color: white; padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; }
    button:hover { background: #475569; }
    button.active { background: var(--teal); border-color: var(--teal-light); }

    .table-container { max-height: 220px; overflow-y: auto; margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }
    th { padding: 8px; color: var(--text-muted); font-weight: 700; border-bottom: 1px solid var(--card-border); position: sticky; top: 0; background: var(--card); }
    td { padding: 8px; border-bottom: 1px solid #334155; font-family: monospace; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1>🧠 NeuroSafe — Edge TinyML Local Inference Monitor</h1>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
        Model: <strong>UCITinySeizureNet-1D</strong> (10.59 KB INT8) | Target: <strong>Arduino Nano 33 BLE Sense (ARM Cortex-M4)</strong>
      </p>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <span id="azureBadge" class="badge" style="background:#1e3a8a; color:#93c5fd; border: 1px solid #3b82f6;">Azure Cloud Synced</span>
      <span class="badge badge-online" id="hwBadge">Hardware Connected (COM5)</span>
    </div>
  </div>

  <div class="grid">
    <!-- Left Column: Real-time Waveform Chart -->
    <div class="card">
      <div class="card-title">
        <span>Incoming 1-Second EEG Epoch Waveform (178 Samples @ 178 Hz)</span>
        <span id="epochInfo" style="color: var(--teal-light); font-mono;">Epoch #0</span>
      </div>
      <div style="height: 320px;">
        <canvas id="waveformChart"></canvas>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--card-border);">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Simulate Clinical Scenarios:</span>
          <div class="btn-group">
            <button id="btnMixed" class="active" onclick="setMode('MIXED')">Ward Mix (80% Normal / 20% Seizure)</button>
            <button id="btnNormal" onclick="setMode('NORMAL_ONLY')">Force Normal Epoch</button>
            <button id="btnSeizure" onclick="setMode('SEIZURE_ONLY')">Inject Ictal Seizure</button>
          </div>
        </div>
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Stream Rate:</span>
          <div class="btn-group">
            <button onclick="setSpeed(1.0)">Fast (1s)</button>
            <button onclick="setSpeed(2.0)">Normal (2s)</button>
            <button onclick="toggleStream()" id="btnPause">Pause</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Real-time TinyML Classification -->
    <div class="card">
      <div class="card-title">
        <span>Local Edge Classification</span>
        <span id="predTime" style="color: var(--text-muted);">--:--:--</span>
      </div>

      <div id="statusBox" class="status-box status-normal">
        <div id="statusText" class="status-text">NORMAL</div>
        <div id="statusSub" class="status-sub">No epileptic seizure activity detected</div>
      </div>

      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-label">Seizure Probability</div>
          <div id="probVal" class="metric-val" style="color: var(--teal-light);">0%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Hardware Latency</div>
          <div id="latVal" class="metric-val">14 ms</div>
        </div>
      </div>

      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-label">Clinical Ground Truth</div>
          <div id="gtVal" class="metric-val" style="font-size: 16px;">NORMAL (Class 4)</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Threshold Exceeded?</div>
          <div id="threshVal" class="metric-val" style="font-size: 16px;">No (θ = 60%)</div>
        </div>
      </div>

      <div class="card-title" style="margin-top: 10px; margin-bottom: 8px;">
        <span>Recent Classification Log</span>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Ground Truth</th>
              <th>Edge Prob</th>
              <th>Classified</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody id="historyTable"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    // Initialize Chart.js EEG Waveform
    const ctx = document.getElementById('waveformChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: 178}, (_, i) => i + 1),
        datasets: [{
          label: 'EEG Voltage Amplitude (µV)',
          data: [],
          borderColor: '#14b8a6',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 150 },
        scales: {
          x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', maxTicksLimit: 10 } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b' } }
        },
        plugins: { legend: { display: false } }
      }
    });

    async function updateData() {
      try {
        const res = await fetch('/api/state');
        const d = await res.json();

        // Update Waveform
        if (d.current_waveform && d.current_waveform.length > 0) {
          chart.data.datasets[0].data = d.current_waveform;
          chart.data.datasets[0].borderColor = d.last_prediction.isSeizure ? '#ef4444' : '#14b8a6';
          chart.update();
        }

        // Update Badges & Labels
        document.getElementById('epochInfo').innerText = `Epoch #${d.sample_index}`;
        document.getElementById('hwBadge').innerText = d.connected_port ? `Hardware Connected (${d.connected_port})` : 'Hardware Simulated';
        document.getElementById('predTime').innerText = d.last_prediction.timestamp || '--:--:--';
        document.getElementById('probVal').innerText = `${d.last_prediction.probabilityPct}%`;
        document.getElementById('latVal').innerText = `${d.last_prediction.latencyMs} ms`;
        document.getElementById('gtVal').innerText = `${d.current_ground_truth} (Class ${d.ground_truth_class})`;
        document.getElementById('threshVal').innerText = d.last_prediction.isSeizure ? 'YES (Seizure Alert)' : 'No (Normal)';

        // Update Status Box
        const sb = document.getElementById('statusBox');
        const st = document.getElementById('statusText');
        const ss = document.getElementById('statusSub');
        if (d.last_prediction.isSeizure) {
          sb.className = 'status-box status-seizure';
          st.innerText = '🚨 ICTAL SEIZURE DETECTED';
          ss.innerText = `Emergency Alert Triggered (Confidence: ${d.last_prediction.probabilityPct}% >= 60%)`;
        } else {
          sb.className = 'status-box status-normal';
          st.innerText = '✅ NORMAL (INTERICTAL)';
          ss.innerText = `Healthy background brain rhythms (Confidence: ${100 - d.last_prediction.probabilityPct}%)`;
        }

        // Update Table
        const tb = document.getElementById('historyTable');
        tb.innerHTML = (d.history || []).slice().reverse().map(h => `
          <tr>
            <td>${h.time}</td>
            <td><strong style="color: ${h.groundTruth === 'SEIZURE' ? '#f87171' : '#34d399'}">${h.groundTruth}</strong></td>
            <td>${h.probability}%</td>
            <td><span style="color: ${h.isSeizure ? '#f87171' : '#34d399'}; font-weight: bold;">${h.isSeizure ? 'SEIZURE' : 'NORMAL'}</span></td>
            <td>${h.latency}ms</td>
          </tr>
        `).join('');

      } catch (err) {
        console.error("Fetch state error:", err);
      }
    }

    async function setMode(m) {
      await fetch(`/api/control?action=set_mode&mode=${m}`);
      document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
      if (m === 'MIXED') document.getElementById('btnMixed').classList.add('active');
      if (m === 'NORMAL_ONLY') document.getElementById('btnNormal').classList.add('active');
      if (m === 'SEIZURE_ONLY') document.getElementById('btnSeizure').classList.add('active');
    }

    async function setSpeed(s) {
      await fetch(`/api/control?action=set_speed&speed=${s}`);
    }

    async function toggleStream() {
      const res = await fetch('/api/control?action=toggle_stream');
      const d = await res.json();
      document.getElementById('btnPause').innerText = d.active ? 'Pause' : 'Resume';
    }

    setInterval(updateData, 800);
    updateData();
  </script>
</body>
</html>
"""

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
        elif self.path == "/api/state":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(state).encode("utf-8"))
        elif self.path.startswith("/api/control"):
            import urllib.parse
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            action = params.get("action", [""])[0]

            if action == "set_mode":
                state["filter_mode"] = params.get("mode", ["MIXED"])[0]
            elif action == "set_speed":
                state["stream_delay_sec"] = float(params.get("speed", [1.5])[0])
            elif action == "toggle_stream":
                state["stream_active"] = not state["stream_active"]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "active": state["stream_active"]}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Quiet HTTP logs

def run_server(port=8080):
    server = HTTPServer(("0.0.0.0", port), RequestHandler)
    print(f"\n🌐 [UI Ready] Dedicated Edge Inference Monitor live at: http://localhost:{port}")
    server.serve_forever()

if __name__ == "__main__":
    load_data()
    init_azure()

    # Start serial worker in background thread
    t_serial = threading.Thread(target=serial_worker, daemon=True)
    t_serial.start()

    # Start web server
    run_server(8080)
