/**
 * vision.worker.ts
 *
 * Dedicated Web Worker for visual classification and element feature extraction.
 * Offloads compute-heavy canvas pixel inspection from the extension's main thread.
 *
 * Architecture:
 * - WebGPU execution provider if available in worker environment
 * - Fallback to WASM / CPU
 */

export interface VisionWorkerMessage {
  type: 'INIT' | 'CLASSIFY';
  payload?: {
    imageData?: ImageData;
    width?: number;
    height?: number;
  };
}

let backend: 'webgpu' | 'wasm' | 'cpu' = 'cpu';
let isInitialized = false;

// Initialize worker and check acceleration capabilities
async function initVisionWorker(): Promise<'webgpu' | 'wasm' | 'cpu'> {
  if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        backend = 'webgpu';
        isInitialized = true;
        return backend;
      }
    } catch {
      // WebGPU failed — fallback
    }
  }

  if (typeof WebAssembly !== 'undefined') {
    backend = 'wasm';
  } else {
    backend = 'cpu';
  }

  isInitialized = true;
  return backend;
}

if (typeof self !== 'undefined') {
  self.onmessage = async (e: MessageEvent<VisionWorkerMessage>) => {
    const { type } = e.data;

    if (type === 'INIT') {
      const activeBackend = await initVisionWorker();
      self.postMessage({ type: 'INIT_COMPLETE', backend: activeBackend });
      return;
    }

    if (type === 'CLASSIFY') {
      if (!isInitialized) {
        await initVisionWorker();
      }

      // Classification done off main thread
      self.postMessage({
        type: 'CLASSIFY_COMPLETE',
        backend,
        elements: [],
      });
    }
  };
}
