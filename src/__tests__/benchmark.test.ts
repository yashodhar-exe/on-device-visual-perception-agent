/**
 * benchmark.test.ts
 *
 * Performance Benchmarking Suite for Privacy-Preserving Browser Vision Agent.
 * Measures actual execution latencies (mean, p50, p95) across core pipeline phases:
 *  1. Regex & Indian PII Detection (Aadhaar, PAN, IFSC, Email, Phone, Card)
 *  2. Hybrid Fusion (IoU deduplication across multiple detection sources)
 *  3. Screenshot Redaction (Pixel blackout of sensitive regions)
 *  4. Fail-Closed Privacy Policy Validation
 *  5. Accessibility Tree & DOM Skeleton Generation
 *  6. Action Execution Validation
 */

import { runAllPatterns } from '../detectors/regexDetector';
import { fuseDetections } from '../privacy/hybridFusion';
import { redactScreenshotCanvas } from '../privacy/screenshotRedactor';
import { validatePayloadIsSafe } from '../privacy/policyEngine';
import { buildA11yTree } from '../overlays/accessibilityTree';
import { buildDomSkeleton } from '../overlays/domSkeleton';
import { validateAction } from '../actions/actionExecutor';
import { SensitiveRegion, BoundingBox, AnalyzeRequest, AgentAction } from '../core/types';

function calculateStats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const p50 = sorted[Math.floor(n * 0.5)];
  const p90 = sorted[Math.floor(n * 0.9)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const min = sorted[0];
  const max = sorted[n - 1];
  return { mean: Number(mean.toFixed(2)), p50: Number(p50.toFixed(2)), p90: Number(p90.toFixed(2)), p95: Number(p95.toFixed(2)), min: Number(min.toFixed(2)), max: Number(max.toFixed(2)) };
}

describe('Performance Benchmarks (p50 / p90 / p95)', () => {
  const ITERATIONS = 30;

  it('benchmarks Regex & Indian PII Detection latency', () => {
    const testDoc = `
      Customer Name: Rajesh Kumar
      Email: rajesh.kumar@example.gov.in
      Phone: +91 9876543210
      Aadhaar: 2345 6789 0124
      PAN: ABCDE1234F
      IFSC: SBIN0001234
      Card: 4111 1111 1111 1111
      Bearer Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M
      API Key: sk_test_51AbcDefGhiJklMnoPqrStuVwxYz123456789
      Generic Content: The quick brown fox jumps over the lazy dog. More text content here...
    `.repeat(10); // ~4KB text

    const latencies: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      runAllPatterns(testDoc);
      latencies.push(performance.now() - start);
    }

    const stats = calculateStats(latencies);
    console.log('[BENCHMARK] Regex & Indian PII Detection:', stats);
    expect(stats.p50).toBeLessThan(100); // Expect sub-100ms
  });

  it('benchmarks Hybrid Fusion (IoU deduplication across 100 detections)', () => {
    const mockRegions: SensitiveRegion[] = Array.from({ length: 100 }, (_, i) => ({
      id: `det-${i}`,
      boundingBox: {
        x: (i % 10) * 80 + Math.random() * 10,
        y: Math.floor(i / 10) * 40 + Math.random() * 10,
        width: 120,
        height: 30,
      },
      sources: [i % 2 === 0 ? 'dom' : 'ocr'],
      type: 'EMAIL',
      confidence: 0.85 + (i % 10) * 0.01,
    }));

    const latencies: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      fuseDetections(mockRegions);
      latencies.push(performance.now() - start);
    }

    const stats = calculateStats(latencies);
    console.log('[BENCHMARK] Hybrid Fusion IoU Clustering:', stats);
    expect(stats.p50).toBeLessThan(50); // Expect sub-50ms
  });

  it('benchmarks Screenshot Redaction (Canvas pixel blackout)', () => {
    // Setup 1000x800 canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 800;

    const regions: SensitiveRegion[] = [
      { id: '1', boundingBox: { x: 50, y: 50, width: 200, height: 40 }, sources: ['regex'], type: 'PASSWORD', confidence: 0.99 },
      { id: '2', boundingBox: { x: 50, y: 150, width: 300, height: 40 }, sources: ['dom'], type: 'CARD', confidence: 0.95 },
      { id: '3', boundingBox: { x: 50, y: 250, width: 220, height: 40 }, sources: ['ocr'], type: 'AADHAAR', confidence: 0.92 },
      { id: '4', boundingBox: { x: 400, y: 50, width: 150, height: 150 }, sources: ['vision'], type: 'FACE', confidence: 0.88 },
    ];

    const latencies: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      redactScreenshotCanvas(canvas, regions, 'blackout');
      latencies.push(performance.now() - start);
    }

    const stats = calculateStats(latencies);
    console.log('[BENCHMARK] Screenshot Canvas Redaction:', stats);
    expect(stats.p50).toBeLessThan(50);
  });

  it('benchmarks Fail-Closed Privacy Policy Validation', () => {
    const payload: AnalyzeRequest = {
      sanitizedScreenshotBase64: 'data:image/jpeg;base64,mock...',
      sanitizedA11yTree: [
        { role: 'textbox', label: '[EMAIL]', selector: '#email', boundingBox: { x: 10, y: 10, width: 200, height: 30 }, tagName: 'INPUT' },
        { role: 'textbox', label: '[PASSWORD]', selector: '#pass', boundingBox: { x: 10, y: 50, width: 200, height: 30 }, tagName: 'INPUT' },
        { role: 'button', label: 'Submit Application', selector: '#sub-btn', boundingBox: { x: 10, y: 100, width: 100, height: 35 }, tagName: 'BUTTON' },
      ],
      sanitizedDomSkeleton: '<form><input id="email" /> <input id="pass" /> <button id="sub-btn">Submit</button></form>',
      sanitizedOcr: [
        { text: 'Please sign in to your dashboard', boundingBox: { x: 10, y: 5, width: 180, height: 20 }, confidence: 0.95 },
      ],
      taskDescription: 'Click submit button to complete login',
    };

    const latencies: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      validatePayloadIsSafe(payload);
      latencies.push(performance.now() - start);
    }

    const stats = calculateStats(latencies);
    console.log('[BENCHMARK] Privacy Policy Safe Payload Check:', stats);
    expect(stats.p50).toBeLessThan(20);
  });

  it('benchmarks A11y Tree & DOM Skeleton Generation', () => {
    document.body.innerHTML = `
      <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
      <main>
        <form id="portal-form">
          <input type="text" id="uname" placeholder="Enter username" />
          <input type="password" id="upass" placeholder="Enter password" />
          <select id="role"><option>Candidate</option><option>Recruiter</option></select>
          <button type="submit" id="btn-portal">Login</button>
        </form>
      </main>
    `;

    const latenciesTree: number[] = [];
    const latenciesSkeleton: number[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const s1 = performance.now();
      buildA11yTree(document.body, []);
      latenciesTree.push(performance.now() - s1);

      const s2 = performance.now();
      buildDomSkeleton(document.body, []);
      latenciesSkeleton.push(performance.now() - s2);
    }

    const treeStats = calculateStats(latenciesTree);
    const skeletonStats = calculateStats(latenciesSkeleton);
    console.log('[BENCHMARK] Accessibility Tree Extraction:', treeStats);
    console.log('[BENCHMARK] DOM Skeleton Generation:', skeletonStats);
    expect(treeStats.p50).toBeLessThan(30);
    expect(skeletonStats.p50).toBeLessThan(30);
  });

  it('benchmarks Action Schema & Security Validation', () => {
    const actions: AgentAction[] = [
      { action: 'click', selector: '#btn-portal' },
      { action: 'type', selector: '#uname', text: 'student_user' },
      { action: 'scroll', direction: 'down', value: '400' },
      { action: 'wait', value: '500' },
    ];

    const latencies: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      for (const a of actions) {
        validateAction(a);
      }
      latencies.push(performance.now() - start);
    }

    const stats = calculateStats(latencies);
    console.log('[BENCHMARK] Action Security & Schema Validation:', stats);
    expect(stats.p50).toBeLessThan(10);
  });
});
