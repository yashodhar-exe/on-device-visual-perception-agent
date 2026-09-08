# Performance & Latency Report

This document details empirical benchmark latencies and performance measurements for the Privacy-Preserving Browser Vision Agent.

Measurements are strictly segregated between **Node.js/JSDOM microbenchmarks**, **Real Chrome browser measurements**, and **Estimated / Hardware-Dependent components**.

---

## 1. Test Environment

- **Operating System**: Windows 11 Pro (64-bit)
- **Node.js Runtime**: v20.x
- **Browser Execution**: Google Chrome (Latest Manifest V3 runtime via Puppeteer automation harness `run_real_benchmarks.js`)
- **Backend Host**: Python 3.13 / FastAPI running on `127.0.0.1:8000`
- **Timing Instrument**: High-resolution timer (`performance.now()`), 30 warm iterations per measurement

---

## 2. Microbenchmark Results (Node/JSDOM)

Captured across 30 warm iterations within the Jest/JSDOM environment (`src/__tests__/benchmark.test.ts`):

| Subsystem Measured | Iterations | Mean (ms) | p50 (ms) | p90 (ms) | p95 (ms) | Min (ms) | Max (ms) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Regex & Pattern Detection** (4KB text) | 30 | 0.25 | **0.21** | 0.27 | **0.28** | 0.21 | 1.29 |
| **Hybrid Fusion** (IoU clustering, 100 boxes) | 30 | 0.01 | **0.00** | 0.00 | **0.00** | 0.00 | 0.23 |
| **Screenshot Canvas Redaction** (1000x800) | 30 | 0.94 | **0.55** | 1.76 | **3.57** | 0.38 | 7.00 |
| **Fail-Closed Policy Safe Payload Check** | 30 | 0.09 | **0.07** | 0.14 | **0.16** | 0.07 | 0.25 |
| **Accessibility Tree Extraction** | 30 | 1.50 | **0.57** | 4.60 | **7.44** | 0.42 | 11.56 |
| **DOM Skeleton Generation** | 30 | 0.55 | **0.21** | 0.62 | **4.66** | 0.12 | 5.25 |
| **Action Security & Schema Validation** | 30 | 0.01 | **0.00** | 0.01 | **0.01** | 0.00 | 0.05 |

---

## 3. Real Chrome Measurements

Empirically measured inside live Google Chrome with the unpacked Manifest V3 extension active (`measured_benchmarks.json` generated via `run_real_benchmarks.js` across 30 iterations):

| Pipeline Stage (Real Chrome) | Mean (ms) | p50 (ms) | p90 (ms) | p95 (ms) | Min (ms) | Max (ms) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Chrome Tab Screenshot Capture** (`captureVisibleTab`) | 78.99 | **71.26** | 85.81 | **92.85** | 51.61 | 295.91 |
| **Live DOM Privacy Detection** | 0.05 | **0.00** | 0.10 | **0.10** | 0.00 | 0.60 |
| **Live Hybrid Fusion Overlap Merging** | 0.03 | **0.00** | 0.10 | **0.10** | 0.00 | 0.20 |
| **Live Canvas Pixel Redaction** | 7.29 | **6.50** | 8.30 | **8.70** | 4.70 | 35.50 |
| **Live Accessibility Extraction** | 0.01 | **0.00** | 0.00 | **0.00** | 0.00 | 0.30 |
| **Live DOM Skeleton Sanitization** | 0.00 | **0.00** | 0.00 | **0.00** | 0.00 | 0.10 |
| **Live Fail-Closed Policy Pre-Flight Check** | 0.01 | **0.00** | 0.00 | **0.10** | 0.00 | 0.10 |
| **Network Dispatch to Local FastAPI** | 3.76 | **3.50** | 5.10 | **5.30** | 2.60 | 8.70 |
| **Action Planner Inference (Deterministic)** | 2.83 | **1.07** | 12.98 | **13.34** | 0.36 | 16.73 |
| **Local Symbolic Resolution** | 0.00 | **0.00** | 0.00 | **0.00** | 0.00 | 0.00 |
| **Browser Action Execution** | 0.02 | **0.00** | 0.00 | **0.10** | 0.00 | 0.50 |

---

## 4. Estimated / Hardware-Dependent Components

The following components depend directly on local client GPU capabilities, model parameter size, or worker initialization, and have **not** been statically benchmarked in Chrome microbenchmarks. They are documented as **engineering estimates**:

| Subsystem | Estimated Latency Range | Hardware Dependency & Basis for Estimate |
|---|---|---|
| **Tesseract.js Full-Page OCR** | *~400 ms – 1200 ms* (Estimated) | Off-main-thread Web Worker; depends on CPU single-thread speed, page resolution, and text density. |
| **Local ONNX NER Inference** | *~60 ms – 200 ms* (Estimated) | `@xenova/transformers` BERT-base-NER quantized INT8 execution on CPU/WASM. |
| **WebGPU Vision Feature Extractor** | *~40 ms – 150 ms* (Estimated) | Requires WebGPU-compatible GPU hardware; falls back to WASM/CPU if unavailable. |
| **Optional Neural VLM Inference** | *~800 ms – 2500 ms* (Estimated) | Local Qwen2.5-VL-3B-Instruct model with 4-bit quantization on NVIDIA RTX GPU (6GB+ VRAM). |

---

## 5. Official SIH Evaluation Benchmark Results

Reproducible empirical evaluation generated via `evaluation/benchmark_runner.js` and `src/__tests__/sihEvaluation.test.ts`:

| SIH Evaluation Metric | Weight | Measured Output | Methodology & Ground Truth | Status |
|---|---:|---|---|---|
| **1. Visual Context Accuracy** | **25%** | **100.0%** structured element recall (12/12 actionable targets); **100.0%** semantic role accuracy (13/13 nodes); **100.0%** bounding box validity rate | Evaluated on multi-scenario screen fixtures (`evaluation/fixtures/vision_cases.json`). *(Proxy metric: structured screen state extraction fidelity; open-domain zero-shot neural VLM bounding-box classification is not active in current prototype)* | **Defensible (Proxy)** |
| **2. PII Detection Precision & Recall** | **20%** | **Precision: 90.91%**<br>**Recall: 100.00%**<br>**F1: 95.24%**<br>Overall Accuracy: 94.29% | Evaluated on 35 controlled test cases in `evaluation/fixtures/pii_cases.json` (20 sensitive positive, 15 safe negative). TP: 20, FP: 2, FN: 0, TN: 13. High recall prevents privacy leaks. | **Verified (Empirical)** |
| **3. Precision of Redaction** | **20%** | **Precision: 100.00%**<br>**Recall: 100.00%**<br>**F1: 100.00%** | Tested on sensitive regions across all vision scenarios. 0 missed sensitive regions, 0 over-redacted interactive controls. Pixel padding (+8px width/height, -4px offset) and `#050505` blackout verified. | **Verified (Empirical)** |
| **4. Client-side Resource Utilization** | **20%** | **Canvas Redaction: 6.50 ms (p50)**<br>**Screenshot Capture: 71.26 ms (p50)**<br>**PII Detection: 0.05 ms**<br>**Policy Check: 0.01 ms**<br>**Bundle Size: 1.63 MiB** | Measured via Chrome DevTools Protocol (CDP) across 30 live browser iterations (`measured_benchmarks.json`). Memory footprint in content script: ~12–45 MB. CPU impact: < 5% average. | **Verified (Empirical)** |
| **5. Overall End-to-End Latency** | **15%** | **p50 (Median): 81.58 ms**<br>**p90: 96.27 ms**<br>**p95: 101.16 ms**<br>Min: 58.74 ms, Max: 228.43 ms | Complete pipeline measured from tab screenshot capture (T0) through local symbolic credential resolution and browser action execution (T11). | **Verified (Empirical)** |

---

## 6. End-to-End Latency Profile

Separating measured timings from estimated worker operations:

### 6.1 Current Verified Pipeline (Deterministic Planner)
- **Chrome Capture + Pre-Processing (Measured)**: ~75 ms – 95 ms
- **Privacy Detection, Fusion & Redaction (Measured)**: ~7 ms – 10 ms
- **Fail-Closed Policy Validation (Measured)**: < 0.2 ms
- **Local Network Transmission (Measured)**: ~3 ms – 5 ms
- **Deterministic Action Planning (Measured)**: ~1 ms – 13 ms
- **Action Execution (Measured, excl. user confirmation click)**: < 1 ms
- **Total Measured End-to-End Latency**: **81.58 ms (p50), 101.16 ms (p95)** *(sub-second total task roundtrip)*

### 6.2 Optional Full-Vision Pipeline (With Background Workers & Neural VLM)
- Including full OCR (~600 ms est.) and neural VLM (~1500 ms est.): ~2.2 s – 3.5 s.

---

## 7. Memory & Resource Utilization

- **Chrome Extension Overhead**: ~12 MB baseline content script memory footprint.
- **Worker Thread Isolation**: OCR and Vision classifiers operate inside dedicated Web Workers (`src/workers/`), preventing main-thread UI jank or frame dropping.
- **Fail-Closed Validation Cost**: Execution overhead is under 0.2 ms, proving that security validation introduces zero perceptible latency.

---

## 8. Limitations

1. **Visual Context Evaluation Scope**: Evaluated as structured screen state extraction fidelity (accessibility tree + DOM skeleton + spatial mapping). Open-domain zero-shot neural VLM vision classification is not benchmarked.
2. **OCR Worker Cold Start**: First-time initialization of Tesseract.js language models introduces a 1–2 second one-time initialization latency.
3. **GPU Availability**: Neural VLM inference requires dedicated hardware (6GB+ VRAM); systems without CUDA utilize the deterministic structured action planner fallback.
4. **Measurement Environment**: Measured benchmarks were captured on an idle development machine; background browser tab contention may increase screenshot capture latency under heavy multi-tab load.
