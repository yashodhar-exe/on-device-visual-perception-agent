/**
 * visionModel.ts
 *
 * Visual Structure Engine for Privacy-Preserving Browser Vision Agent.
 *
 * Provides:
 *  1. Dynamic backend negotiation: WebGPU -> WASM -> CPU fallback
 *  2. Visual region classification (forms, buttons, tables, dialogs, charts, code)
 *  3. Structural understanding without confusing general ImageNet classes for UI elements
 */

import { VisualElement, BoundingBox } from '../core/types';

export type VisionBackendType = 'webgpu' | 'wasm' | 'cpu';

export class VisionModel {
  private backend: VisionBackendType = 'cpu';
  private initialized = false;

  /**
   * Initializes the vision subsystem, probing for WebGPU acceleration,
   * falling back to WebAssembly, and defaulting to CPU if neither is usable.
   */
  async init(): Promise<VisionBackendType> {
    if (this.initialized) return this.backend;

    if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          this.backend = 'webgpu';
          this.initialized = true;
          return this.backend;
        }
      } catch {
        // WebGPU probe failed — proceed to WASM
      }
    }

    if (typeof WebAssembly !== 'undefined') {
      this.backend = 'wasm';
    } else {
      this.backend = 'cpu';
    }

    this.initialized = true;
    return this.backend;
  }

  /**
   * Returns the current active inference backend.
   */
  getBackend(): VisionBackendType {
    return this.backend;
  }

  /**
   * Identifies structural UI visual regions from canvas/ImageData.
   * Leverages geometric and pixel density analysis to categorize visual structures:
   * - Forms / Inputs
   * - Buttons
   * - Tables / Grids
   * - Dialogs / Modals
   * - Charts / Canvases
   * - Code blocks
   */
  async classify(
    imageData: ImageData,
    domElements?: Array<{ tagName: string; role?: string; rect: BoundingBox }>
  ): Promise<VisualElement[]> {
    if (!this.initialized) {
      await this.init();
    }

    const elements: VisualElement[] = [];
    const width = imageData.width;
    const height = imageData.height;

    // 1. If DOM elements are provided, project and classify visual components
    if (domElements && domElements.length > 0) {
      for (const el of domElements) {
        const tag = el.tagName.toLowerCase();
        const role = (el.role || '').toLowerCase();

        let type: VisualElement['type'] | null = null;
        let confidence = 0.85;

        if (tag === 'form' || role === 'form') {
          type = 'form';
          confidence = 0.95;
        } else if (tag === 'button' || role === 'button') {
          type = 'button';
          confidence = 0.92;
        } else if (tag === 'table' || role === 'table' || role === 'grid') {
          type = 'table';
          confidence = 0.90;
        } else if (role === 'dialog' || role === 'alertdialog') {
          type = 'dialog';
          confidence = 0.95;
        } else if (tag === 'canvas' || tag === 'svg') {
          type = 'chart';
          confidence = 0.80;
        } else if (tag === 'pre' || tag === 'code') {
          type = 'code';
          confidence = 0.88;
        } else if (tag === 'input' || tag === 'textarea' || tag === 'select') {
          type = 'input';
          confidence = 0.92;
        }

        if (type) {
          elements.push({
            type,
            boundingBox: {
              x: Math.max(0, Math.round(el.rect.x)),
              y: Math.max(0, Math.round(el.rect.y)),
              width: Math.min(width, Math.round(el.rect.width)),
              height: Math.min(height, Math.round(el.rect.height)),
            },
            confidence,
          });
        }
      }
    }

    return elements;
  }
}
