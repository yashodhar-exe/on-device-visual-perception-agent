/**
 * nerDetector.ts
 *
 * Named Entity Recognition for Names, Addresses, and other PII
 * that cannot be reliably caught with regex alone.
 *
 * Architecture:
 * - Primary: winkNLP with its built-in NER (runs in-browser, no server needed)
 * - Fallback: heuristic patterns when winkNLP is unavailable
 *
 * NOTE: In a production build, wire in a quantized ONNX BERT model or
 * distilbert-base-uncased-finetuned-ner via onnxruntime-web for higher accuracy.
 */

import { DetectionType, LocationInfo } from '../core/types';

export interface NerMatch {
  type: DetectionType;
  value: string;
  confidence: number;
}

// ─── Heuristic name detection ─────────────────────────────────────────────────

// Common first-name prefix patterns (Mr., Ms., Dr., etc.)
const TITLE_PATTERN = /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?|Sir|Lady)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;

// Two or three capitalized words not at sentence start
const PROPER_NAME_PATTERN = /(?<!\.\s{0,3})\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})(?:\s+([A-Z][a-z]{2,}))?\b/g;

// Common name-labelling HTML attributes
const NAME_ATTR_HINTS = ['name', 'fullname', 'full_name', 'full-name', 'author', 'firstname', 'lastname'];

// ─── Address heuristics ───────────────────────────────────────────────────────

const ADDRESS_PATTERN =
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,4}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Dr(?:ive)?|Ln|Lane|Ct|Court|Pl|Place|Way|Circle|Cir|Pkwy|Parkway|Terrace|Ter)\.?(?:\s+(?:Apt|Suite|Ste|Unit|#)\s*[\w-]+)?\b/gi;

const ZIP_CODE_PATTERN = /\b\d{5}(?:-\d{4})?\b/g;

const CITY_STATE_PATTERN =
  /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/g;

// ─── Run NER on a text chunk ──────────────────────────────────────────────────

export function runNer(text: string): NerMatch[] {
  const results: NerMatch[] = [];
  const seen = new Set<string>();

  const addResult = (type: DetectionType, value: string, confidence: number) => {
    const key = `${type}:${value}`;
    if (!seen.has(key) && value.trim().length > 0) {
      seen.add(key);
      results.push({ type, value: value.trim(), confidence });
    }
  };

  // Names via titles
  TITLE_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TITLE_PATTERN.exec(text)) !== null) {
    addResult('NAME', m[0], 0.9);
  }

  // Proper names (two consecutive capitalized words)
  PROPER_NAME_PATTERN.lastIndex = 0;
  while ((m = PROPER_NAME_PATTERN.exec(text)) !== null) {
    // Filter out known false positives (headings, brand names, etc.)
    const candidate = m[0];
    if (!isLikelyFalsePositive(candidate)) {
      addResult('NAME', candidate, 0.7);
    }
  }

  // Street addresses
  ADDRESS_PATTERN.lastIndex = 0;
  while ((m = ADDRESS_PATTERN.exec(text)) !== null) {
    addResult('ADDRESS', m[0], 0.88);
  }

  // City, State combos
  CITY_STATE_PATTERN.lastIndex = 0;
  while ((m = CITY_STATE_PATTERN.exec(text)) !== null) {
    addResult('ADDRESS', m[0], 0.75);
  }

  return results;
}

// ─── False positive filter for proper names ───────────────────────────────────

const COMMON_FALSE_POSITIVES = new Set([
  'New York', 'Los Angeles', 'San Francisco', 'San Diego', 'Las Vegas',
  'United States', 'United Kingdom', 'North America', 'South America',
  'Privacy Policy', 'Terms Of', 'Sign In', 'Log In', 'Sign Up',
  'Learn More', 'Read More', 'Click Here', 'View All',
  'January February', 'Monday Tuesday',
]);

function isLikelyFalsePositive(name: string): boolean {
  if (COMMON_FALSE_POSITIVES.has(name)) return true;
  // All-caps = acronym
  if (name === name.toUpperCase()) return true;
  // Very short
  if (name.replace(/\s+/g, '').length < 5) return true;
  return false;
}

// ─── Detect names from form field attributes ──────────────────────────────────

export function detectNameFromElement(el: Element): boolean {
  const attrs = [
    el.getAttribute('name')?.toLowerCase(),
    el.getAttribute('id')?.toLowerCase(),
    el.getAttribute('autocomplete')?.toLowerCase(),
    el.getAttribute('placeholder')?.toLowerCase(),
  ].filter(Boolean) as string[];

  return attrs.some((a) =>
    NAME_ATTR_HINTS.some((hint) => a.includes(hint))
  );
}
