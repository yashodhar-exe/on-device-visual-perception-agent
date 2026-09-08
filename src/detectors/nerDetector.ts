/**
 * nerDetector.ts
 *
 * Named Entity Recognition for Names and Addresses.
 *
 * Architecture:
 * - Local ONNX NER model via @xenova/transformers (Xenova/bert-base-NER or distilbert)
 * - Deterministic street address format recognition
 * - NO heuristic capitalized-word pattern matching (to eliminate false positives)
 * - All outputs filtered against allowlist.ts
 */

import { DetectionType } from '../core/types';
import { isAllowlisted } from './allowlist';

export interface NerMatch {
  type: DetectionType;
  value: string;
  confidence: number;
}

// ─── ONNX Transformers.js NER Pipeline ─────────────────────────────────────────

let nerPipeline: any = null;
let pipelineLoading = false;

async function getNerPipeline(): Promise<any> {
  if (nerPipeline) return nerPipeline;
  if (pipelineLoading) return null;

  try {
    pipelineLoading = true;
    const { pipeline, env } = await import('@xenova/transformers');
    env.allowLocalModels = true;
    env.allowRemoteModels = false;
    const pipelinePromise = pipeline('token-classification', 'Xenova/bert-base-NER', {
      quantized: true,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('NER pipeline initialization timeout')), 1000)
    );
    nerPipeline = await Promise.race([pipelinePromise, timeoutPromise]);
    return nerPipeline;
  } catch (err) {
    // If ONNX pipeline fails to load or download, log warning and return null cleanly
    console.warn('[PrivacyFirewall] Local ONNX NER pipeline initialization deferred/skipped:', err);
    return null;
  } finally {
    pipelineLoading = false;
  }
}

// ─── Deterministic Address Heuristics ─────────────────────────────────────────

// Street address pattern with number + street name + suffix (e.g. 123 Main St)
const STREET_ADDRESS_PATTERN =
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Pl|Place|Way|Circle|Cir|Pkwy|Parkway|Ter(?:race)?)\.?(?:\s+(?:Apt|Suite|Ste|Unit|#)\s*[\w-]+)?\b/gi;

const CITY_STATE_ZIP_PATTERN =
  /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}(?:-\d{4})?\b/gi;

// Common name-labelling HTML attributes for form field detection
const NAME_ATTR_HINTS = ['name', 'fullname', 'full_name', 'full-name', 'author', 'firstname', 'lastname', 'owner'];

// ─── Main NER Entry Point ──────────────────────────────────────────────────────

export async function runNer(text: string): Promise<NerMatch[]> {
  const results: NerMatch[] = [];
  const seen = new Set<string>();

  const addResult = (type: DetectionType, value: string, confidence: number) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 3) return;
    if (isAllowlisted(trimmed)) return;

    const key = `${type}:${trimmed.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ type, value: trimmed, confidence });
    }
  };

  // 1. Run local ONNX NER model if pipeline is ready
  const pipe = await getNerPipeline();
  if (pipe) {
    try {
      const output = await pipe(text, { ignore_labels: ['O'] });
      if (Array.isArray(output)) {
        for (const item of output) {
          const entity = item.entity || item.entity_group;
          const word = (item.word || '').replace(/^##/, '').trim();
          const score = typeof item.score === 'number' ? item.score : 0.85;

          if (score < 0.6) continue;

          if (entity?.includes('PER') || entity?.includes('PERSON')) {
            addResult('NAME', word, Math.round(score * 100) / 100);
          } else if (entity?.includes('LOC') || entity?.includes('LOCATION')) {
            addResult('ADDRESS', word, Math.round(score * 100) / 100);
          }
        }
      }
    } catch (e) {
      // ONNX inference error fallback
    }
  }

  // 2. Deterministic Street Addresses (e.g., "123 Main St")
  STREET_ADDRESS_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STREET_ADDRESS_PATTERN.exec(text)) !== null) {
    addResult('ADDRESS', m[0], 0.90);
  }

  // 3. City, State ZIP combos
  CITY_STATE_ZIP_PATTERN.lastIndex = 0;
  while ((m = CITY_STATE_ZIP_PATTERN.exec(text)) !== null) {
    addResult('ADDRESS', m[0], 0.88);
  }

  return results;
}

// ─── Detect names from form field attributes ──────────────────────────────────

export function detectNameFromElement(el: Element): boolean {
  const attrs = [
    el.getAttribute('name')?.toLowerCase(),
    el.getAttribute('id')?.toLowerCase(),
    el.getAttribute('autocomplete')?.toLowerCase(),
    el.getAttribute('placeholder')?.toLowerCase(),
    el.getAttribute('aria-label')?.toLowerCase(),
  ].filter(Boolean) as string[];

  return attrs.some((a) => NAME_ATTR_HINTS.some((hint) => a.includes(hint)));
}
