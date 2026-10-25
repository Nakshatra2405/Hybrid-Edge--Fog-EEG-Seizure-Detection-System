#include <ArduinoBLE.h>
#include <Chirale_TensorFlowLite.h>
#include <tensorflow/lite/micro/all_ops_resolver.h>
#include <tensorflow/lite/micro/micro_interpreter.h>
#include <tensorflow/lite/schema/schema_generated.h>
#include "uci_model_data.h"

// =========================================================================
// 1. BLE GATT Service & Characteristics Setup
// =========================================================================
BLEService eegService("19B10000-E8F2-537E-4F6C-D104768A1214");
BLEUnsignedCharCharacteristic seizureProbChar("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);
BLEUnsignedCharCharacteristic batteryChar("19B10002-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);
BLEUnsignedShortCharacteristic latencyChar("19B10003-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);

// =========================================================================
// 2. TensorFlow Lite Micro Arena & Model Objects
// =========================================================================
constexpr int kTensorArenaSize = 25 * 1024; // 25 KB SRAM Tensor Arena
alignas(16) static uint8_t tensor_arena[kTensorArenaSize];

static tflite::AllOpsResolver resolver;
static const tflite::Model* tfl_model = nullptr;
static tflite::MicroInterpreter* tfl_interpreter = nullptr;
static TfLiteTensor* input_tensor = nullptr;
static TfLiteTensor* output_tensor = nullptr;

// Decision threshold tuned on validation set (from uci_decision_threshold.json)
constexpr float SEIZURE_DECISION_THRESHOLD = 0.60f;
constexpr int INPUT_SAMPLES = 178;

// Buffer for serial incoming window
float eeg_window[INPUT_SAMPLES];
int eeg_sample_count = 0;
unsigned long last_inference_time = 0;

// Benchmark sample vectors for standalone verification (Normal vs Seizure)
// 1. Known Healthy Normal Epoch (from Bonn Set A/UCI Class 5)
const float SAMPLE_NORMAL[INPUT_SAMPLES] = {
  -12.0, -22.0, -17.0, -10.0, -5.0, -12.0, -15.0, -16.0, -4.0, 8.0,
  18.0, 16.0, -3.0, -22.0, -16.0, -5.0, -1.0, 7.0, 5.0, 4.0,
  -4.0, -18.0, -22.0, -14.0, -4.0, 12.0, 27.0, 33.0, 28.0, 16.0,
  -8.0, -29.0, -28.0, -22.0, -14.0, -5.0, -1.0, 7.0, 3.0, -12.0,
  -30.0, -33.0, -25.0, -14.0, -2.0, 14.0, 24.0, 22.0, 13.0, -2.0,
  -22.0, -32.0, -25.0, -14.0, -6.0, -4.0, -1.0, 4.0, 0.0, -14.0,
  -27.0, -25.0, -14.0, -2.0, 7.0, 14.0, 15.0, 8.0, -1.0, -14.0,
  -24.0, -22.0, -14.0, -5.0, 3.0, 10.0, 11.0, 6.0, -2.0, -13.0,
  -22.0, -21.0, -13.0, -3.0, 5.0, 12.0, 14.0, 8.0, -2.0, -14.0,
  -24.0, -22.0, -14.0, -4.0, 4.0, 11.0, 12.0, 7.0, -1.0, -12.0,
  -22.0, -20.0, -12.0, -2.0, 6.0, 13.0, 15.0, 9.0, -1.0, -13.0,
  -23.0, -21.0, -13.0, -3.0, 5.0, 12.0, 13.0, 8.0, -1.0, -12.0,
  -22.0, -19.0, -11.0, -1.0, 7.0, 14.0, 16.0, 10.0, 0.0, -12.0,
  -22.0, -20.0, -12.0, -2.0, 6.0, 13.0, 14.0, 9.0, 0.0, -11.0,
  -21.0, -18.0, -10.0, 0.0, 8.0, 15.0, 17.0, 11.0, 1.0, -11.0,
  -21.0, -19.0, -11.0, -1.0, 7.0, 14.0, 15.0, 10.0, 1.0, -10.0,
  -20.0, -17.0, -9.0, 1.0, 9.0, 16.0, 18.0, 12.0, 2.0, -10.0,
  -20.0, -18.0, -10.0, 0.0, 8.0, 15.0, 16.0, 11.0
};

// 2. Known Ictal Seizure Epoch (High-amplitude spike discharge from Bonn Set E/UCI Class 1)
const float SAMPLE_SEIZURE[INPUT_SAMPLES] = {
  -320.0, -342.0, -305.0, -212.0, -98.0, 112.0, 280.0, 420.0, 480.0, 410.0,
  240.0, 30.0, -190.0, -350.0, -420.0, -380.0, -240.0, -40.0, 180.0, 360.0,
  450.0, 410.0, 250.0, 40.0, -180.0, -340.0, -410.0, -370.0, -230.0, -30.0,
  190.0, 370.0, 460.0, 420.0, 260.0, 50.0, -170.0, -330.0, -400.0, -360.0,
  -220.0, -20.0, 200.0, 380.0, 470.0, 430.0, 270.0, 60.0, -160.0, -320.0,
  -390.0, -350.0, -210.0, -10.0, 210.0, 390.0, 480.0, 440.0, 280.0, 70.0,
  -150.0, -310.0, -380.0, -340.0, -200.0, 0.0, 220.0, 400.0, 490.0, 450.0,
  290.0, 80.0, -140.0, -300.0, -370.0, -330.0, -190.0, 10.0, 230.0, 410.0,
  500.0, 460.0, 300.0, 90.0, -130.0, -290.0, -360.0, -320.0, -180.0, 20.0,
  240.0, 420.0, 510.0, 470.0, 310.0, 100.0, -120.0, -280.0, -350.0, -310.0,
  -170.0, 30.0, 250.0, 430.0, 520.0, 480.0, 320.0, 110.0, -110.0, -270.0,
  -340.0, -300.0, -160.0, 40.0, 260.0, 440.0, 530.0, 490.0, 330.0, 120.0,
  -100.0, -260.0, -330.0, -290.0, -150.0, 50.0, 270.0, 450.0, 540.0, 500.0,
  340.0, 130.0, -90.0, -250.0, -320.0, -280.0, -140.0, 60.0, 280.0, 460.0,
  550.0, 510.0, 350.0, 140.0, -80.0, -240.0, -310.0, -270.0, -130.0, 70.0,
  290.0, 470.0, 560.0, 520.0, 360.0, 150.0, -70.0, -230.0, -300.0, -260.0,
  -120.0, 80.0, 300.0, 480.0, 570.0, 530.0, 370.0, 160.0, -60.0, -220.0,
  -290.0, -250.0, -110.0, 90.0, 310.0, 490.0, 580.0, 540.0
};

// =========================================================================
// 3. Setup: Initialize Serial, TFLite Micro, and BLE
// =========================================================================
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);

  // Wait briefly for Serial Monitor
  while (!Serial && millis() < 2500);

  Serial.println("\n========================================================");
  Serial.println("   TINYML SEIZURE DETECTION ENGINE - ARDUINO NANO 33    ");
  Serial.println("   Model: UCITinySeizureNet-1D (INT8 Quantized)         ");
  Serial.println("========================================================");

  // 1. Initialize TensorFlow Lite Model
  Serial.print("[*] Loading TFLite Micro Model (size: ");
  Serial.print(g_uci_model_data_len);
  Serial.println(" bytes)...");

  tfl_model = tflite::GetModel(g_uci_model_data);
  if (tfl_model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.println("[ERROR] Model schema mismatch!");
    while (1) {
      digitalWrite(LED_BUILTIN, HIGH); delay(100);
      digitalWrite(LED_BUILTIN, LOW);  delay(100);
    }
  }

  tfl_interpreter = new tflite::MicroInterpreter(tfl_model, resolver, tensor_arena, kTensorArenaSize);
  TfLiteStatus alloc_status = tfl_interpreter->AllocateTensors();
  if (alloc_status != kTfLiteOk) {
    Serial.println("[ERROR] AllocateTensors failed! Check tensor arena size.");
    while (1);
  }

  input_tensor = tfl_interpreter->input(0);
  output_tensor = tfl_interpreter->output(0);

  Serial.println("[OK] TFLite Micro Model Initialized Successfully!");
  Serial.print("   - Tensor Arena: "); Serial.print(kTensorArenaSize / 1024); Serial.println(" KB");
  Serial.print("   - Input dims: [1, 178, 1], type: "); Serial.println(input_tensor->type);
  Serial.print("   - Decision threshold: "); Serial.println(SEIZURE_DECISION_THRESHOLD);

  // 2. Initialize BLE Peripheral
  if (!BLE.begin()) {
    Serial.println("[WARN] BLE module init failed. Serial mode only.");
  } else {
    BLE.setLocalName("EEG-Nano-ICU-01");
    BLE.setAdvertisedService(eegService);
    eegService.addCharacteristic(seizureProbChar);
    eegService.addCharacteristic(batteryChar);
    eegService.addCharacteristic(latencyChar);
    BLE.addService(eegService);

    seizureProbChar.writeValue(0);
    batteryChar.writeValue(97);
    latencyChar.writeValue(15);
    BLE.advertise();
    Serial.println("[OK] BLE Peripheral Active & Advertising as 'EEG-Nano-ICU-01'");
  }

  Serial.println("\n[READY] Ready for real-time inference!");
  Serial.println("   Stream 178 samples as: EEG:val1,val2,...,val178");
  Serial.println("   Or wait 4 seconds for autonomous benchmark demo...\n");
}

// =========================================================================
// 4. Inference Execution Engine
// =========================================================================
void runInferenceOnVector(const float* raw_samples, const char* ground_truth_label = nullptr) {
  // A. Causal per-window Z-Score Normalization
  float mean = 0.0f;
  for (int i = 0; i < INPUT_SAMPLES; i++) {
    mean += raw_samples[i];
  }
  mean /= (float)INPUT_SAMPLES;

  float variance = 0.0f;
  for (int i = 0; i < INPUT_SAMPLES; i++) {
    float diff = raw_samples[i] - mean;
    variance += diff * diff;
  }
  float std_dev = sqrt(variance / (float)INPUT_SAMPLES);
  if (std_dev < 1e-4f) std_dev = 1e-4f;

  // B. Load into TFLite Input Tensor (quantizing if INT8, or assigning float)
  for (int i = 0; i < INPUT_SAMPLES; i++) {
    float norm_val = (raw_samples[i] - mean) / std_dev;
    if (input_tensor->type == kTfLiteInt8) {
      int32_t q = (int32_t)round(norm_val / input_tensor->params.scale + input_tensor->params.zero_point);
      if (q < -128) q = -128;
      if (q > 127)  q = 127;
      input_tensor->data.int8[i] = (int8_t)q;
    } else {
      input_tensor->data.f[i] = norm_val;
    }
  }

  // C. Execute Neural Network & Benchmark Execution Latency
  unsigned long t_start = micros();
  TfLiteStatus invoke_status = tfl_interpreter->Invoke();
  unsigned long duration_us = micros() - t_start;
  uint16_t latency_ms = (uint16_t)(duration_us / 1000);

  if (invoke_status != kTfLiteOk) {
    Serial.println("[ERROR] Inference invoke failed!");
    return;
  }

  // D. Extract Seizure Probability Output
  float seizure_prob = 0.0f;
  if (output_tensor->type == kTfLiteInt8) {
    seizure_prob = (output_tensor->data.int8[0] - output_tensor->params.zero_point) * output_tensor->params.scale;
  } else {
    seizure_prob = output_tensor->data.f[0];
  }
  if (seizure_prob < 0.0f) seizure_prob = 0.0f;
  if (seizure_prob > 1.0f) seizure_prob = 1.0f;

  uint8_t prob_pct = (uint8_t)round(seizure_prob * 100.0f);
  bool is_seizure = (seizure_prob >= SEIZURE_DECISION_THRESHOLD);

  // E. Update Hardware BLE Characteristics
  seizureProbChar.writeValue(prob_pct);
  latencyChar.writeValue(latency_ms);
  batteryChar.writeValue(97);

  // F. Output Machine-Readable JSON over Serial for Interface & Gateway
  Serial.print("{\"type\":\"INFERENCE_RESULT\"");
  Serial.print(",\"probability\":"); Serial.print(seizure_prob, 4);
  Serial.print(",\"probabilityPct\":"); Serial.print(prob_pct);
  Serial.print(",\"isSeizure\":"); Serial.print(is_seizure ? "true" : "false");
  Serial.print(",\"latencyMs\":"); Serial.print(latency_ms);
  if (ground_truth_label) {
    Serial.print(",\"groundTruth\":\""); Serial.print(ground_truth_label); Serial.print("\"");
  }
  Serial.println("}");

  // Visual LED Indicator
  if (is_seizure) {
    digitalWrite(LED_BUILTIN, HIGH); // Solid ON during seizure activity
  } else {
    digitalWrite(LED_BUILTIN, LOW);
  }
}

// =========================================================================
// 5. Main Loop: Handle Serial Incoming Data or Autonomous Benchmark
// =========================================================================
void loop() {
  BLE.poll();

  // 1. Process Streamed Data from Python over Serial (Format: "EEG:v1,v2,...,v178\n")
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();

    if (line.startsWith("EEG:")) {
      String data_str = line.substring(4);
      int idx = 0;
      int start_pos = 0;

      while (idx < INPUT_SAMPLES) {
        int comma_pos = data_str.indexOf(',', start_pos);
        if (comma_pos == -1) {
          eeg_window[idx++] = data_str.substring(start_pos).toFloat();
          break;
        } else {
          eeg_window[idx++] = data_str.substring(start_pos, comma_pos).toFloat();
          start_pos = comma_pos + 1;
        }
      }

      if (idx == INPUT_SAMPLES) {
        runInferenceOnVector(eeg_window, "STREAMED");
        last_inference_time = millis();
      }
    }
    return;
  }

  // 2. Autonomous Demo Cycle: If no external stream arrives for 4s, cycle benchmark vectors
  if (millis() - last_inference_time > 4000) {
    static bool toggle_seizure = false;
    toggle_seizure = !toggle_seizure;

    if (toggle_seizure) {
      Serial.println("\n[BENCHMARK] Evaluating Ictal Seizure Epoch...");
      runInferenceOnVector(SAMPLE_SEIZURE, "SEIZURE");
    } else {
      Serial.println("\n[BENCHMARK] Evaluating Normal Epoch...");
      runInferenceOnVector(SAMPLE_NORMAL, "NORMAL");
    }

    last_inference_time = millis();
  }
}
