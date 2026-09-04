/**
 * content.js — Privacy Firewall Content Script
 * Placed in /public so CRA copies it to /build on every `npm run build`.
 * Self-contained IIFE — no bundler or ES module imports required.
 */
(function () {
  'use strict';

  const CONTAINER_ID = '__pf_overlay_root__';

  const COLORS = {
    PASSWORD:      { bg: 'rgba(185,28,28,0.25)',  border: '#B91C1C' },
    EMAIL:         { bg: 'rgba(37,99,235,0.2)',   border: '#2563EB' },
    PHONE:         { bg: 'rgba(21,128,61,0.2)',   border: '#15803D' },
    CARD:          { bg: 'rgba(109,40,217,0.2)',  border: '#6D28D9' },
    ADDRESS:       { bg: 'rgba(161,161,20,0.2)',  border: '#A16207' },
    GOV_ID:        { bg: 'rgba(185,28,28,0.25)',  border: '#B91C1C' },
    NAME:          { bg: 'rgba(37,99,235,0.15)',  border: '#2563EB' },
    API_KEY:       { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    OPENAI_KEY:    { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    ANTHROPIC_KEY: { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    GITHUB_TOKEN:  { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    GOOGLE_KEY:    { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    JWT_SECRET:    { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    STRIPE_KEY:    { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    RAZORPAY_KEY:  { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    AWS_KEY:       { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    AZURE_KEY:     { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    SUPABASE_KEY:  { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    FIREBASE_CONFIG:{ bg: 'rgba(180,83,9,0.2)',   border: '#B45309' },
    MONGODB_URL:   { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    POSTGRES_URL:  { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    MYSQL_URL:     { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    REDIS_URL:     { bg: 'rgba(180,83,9,0.2)',    border: '#B45309' },
    OTHER:         { bg: 'rgba(100,116,139,0.2)', border: '#64748B' },
  };

  const PLACEHOLDERS = {
    PASSWORD: '[PASSWORD]', EMAIL: '[EMAIL]', PHONE: '[PHONE]',
    CARD: '[CARD]', ADDRESS: '[ADDRESS]', GOV_ID: '[GOV_ID]',
    NAME: '[NAME]', API_KEY: '[API_KEY]', OPENAI_KEY: '[OPENAI_KEY]',
    ANTHROPIC_KEY: '[ANTHROPIC_KEY]', GITHUB_TOKEN: '[GITHUB_TOKEN]',
    GOOGLE_KEY: '[GOOGLE_KEY]', JWT_SECRET: '[JWT_SECRET]',
    STRIPE_KEY: '[STRIPE_KEY]', RAZORPAY_KEY: '[RAZORPAY_KEY]',
    AWS_KEY: '[AWS_KEY]', AZURE_KEY: '[AZURE_KEY]',
    SUPABASE_KEY: '[SUPABASE_KEY]', FIREBASE_CONFIG: '[FIREBASE_CONFIG]',
    MONGODB_URL: '[MONGODB_URL]', POSTGRES_URL: '[POSTGRES_URL]',
    MYSQL_URL: '[MYSQL_URL]', REDIS_URL: '[REDIS_URL]',
    OTHER: '[REDACTED]',
  };

  const RISK_WEIGHTS = {
    PASSWORD: 30, CARD: 30, GOV_ID: 25, AWS_KEY: 25, OPENAI_KEY: 20,
    ANTHROPIC_KEY: 20, GITHUB_TOKEN: 20, STRIPE_KEY: 20, JWT_SECRET: 15,
    MONGODB_URL: 15, POSTGRES_URL: 15, EMAIL: 10, PHONE: 10,
    NAME: 5, ADDRESS: 8, OTHER: 5,
  };

  // IMPORTANT: Order matters — higher-specificity patterns (CARD, GOV_ID) run before PHONE
  // to prevent the greedy PHONE regex from consuming card/SSN digits first.
  const PATTERNS = [
    { type: 'EMAIL',         re: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g },
    // CARD before PHONE — card numbers are 13-16 digit sequences
    { type: 'CARD',          re: /\b(?:4[0-9 \-]{11,18}[0-9]|5[1-5][0-9 \-]{13,16}[0-9]|3[47][0-9 \-]{11,14}[0-9]|6(?:011|5[0-9]{2})[0-9 \-]{11,14}[0-9])\b/g },
    // GOV_ID before PHONE — SSNs (NNN-NN-NNNN) would otherwise partially match
    { type: 'GOV_ID',        re: /\b(?:[0-9]{3}-[0-9]{2}-[0-9]{4}|[A-Z]{1,2}[0-9]{6,9})\b/g },
    // PHONE — strict: must have area code context or country code, min 10 digits
    { type: 'PHONE',         re: /(?:\+\d{1,3}[-. ]?)?(?:\(?\d{3}\)?[-. ]?)\d{3}[-. ]\d{4}(?!\d)/g },
    { type: 'OPENAI_KEY',    re: /\bsk-[a-zA-Z0-9]{20,80}\b/g },
    { type: 'ANTHROPIC_KEY', re: /\bsk-ant-[a-zA-Z0-9\-_]{20,100}\b/g },
    { type: 'GITHUB_TOKEN',  re: /\b(?:ghp_|gho_|ghu_|ghs_|github_pat_)[a-zA-Z0-9_]{20,}\b/g },
    { type: 'GOOGLE_KEY',    re: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
    { type: 'JWT_SECRET',    re: /\beyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g },
    { type: 'STRIPE_KEY',    re: /\b(?:sk|pk|rk)_(?:live|test)_[a-zA-Z0-9]{20,80}\b/g },
    { type: 'RAZORPAY_KEY',  re: /\brzp_(?:live|test)_[a-zA-Z0-9]{14,40}\b/g },
    { type: 'AWS_KEY',       re: /\b(?:AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}\b/g },
    { type: 'SUPABASE_KEY',  re: /\bsbp_[a-zA-Z0-9]{20,80}\b/g },
    { type: 'FIREBASE_CONFIG', re: /(?:apiKey|authDomain|databaseURL|storageBucket)\s*:\s*["'][^"']{5,}["']/gi },
    { type: 'MONGODB_URL',   re: /mongodb(?:\+srv)?:\/\/[^\s"'<>]{10,}/gi },
    { type: 'POSTGRES_URL',  re: /postgres(?:ql)?:\/\/[^\s"'<>]{10,}/gi },
    { type: 'MYSQL_URL',     re: /mysql:\/\/[^\s"'<>]{10,}/gi },
    { type: 'REDIS_URL',     re: /redis(?:s)?:\/\/[^\s"'<>]{6,}/gi },
  ];

  let _id = 0;
  function genId() { return 'pf-' + Date.now() + '-' + (++_id); }

  let detectedItems = [];
  let overlaysVisible = false;
  let originalValues = new Map();

  function getBBox(el) {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  function getSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const tag = el.tagName.toLowerCase();
    const name = el.getAttribute('name');
    if (name) return tag + '[name="' + name + '"]';
    const type = el.getAttribute('type');
    if (type) return tag + '[type="' + type + '"]';
    return tag;
  }

  function getLabel(el) {
    const id = el.getAttribute('id');
    if (id) {
      try {
        const lbl = document.querySelector('label[for="' + CSS.escape(id) + '"]');
        if (lbl && lbl.textContent) return lbl.textContent.trim().slice(0, 40);
      } catch(e) {}
    }
    const aria = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name');
    if (aria) return aria.slice(0, 40);
    const form = el.closest('form');
    if (form) {
      const h = form.querySelector('h1,h2,h3,h4,legend,[role=heading]');
      if (h && h.textContent) return h.textContent.trim().slice(0, 40);
      const fid = form.getAttribute('id') || form.getAttribute('aria-label');
      if (fid) return fid.slice(0, 40);
    }
    return document.title.slice(0, 40) || 'Page';
  }

  function isVisible(el) {
    try {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    } catch(e) { return false; }
  }

  function runPatterns(text) {
    const results = [];
    // Track character spans already claimed by a higher-priority pattern
    // so lower-priority patterns (e.g. PHONE) don't re-match the same digits
    const claimedRanges = [];

    function overlaps(start, end) {
      return claimedRanges.some(([s, e]) => start < e && end > s);
    }

    for (const { type, re } of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        const start = m.index;
        const end = start + m[0].length;
        if (!overlaps(start, end)) {
          results.push({ type, value: m[0] });
          claimedRanges.push([start, end]);
        }
      }
    }
    return results;
  }

  function scanDom() {
    const items = [];
    const seen = new Set();

    function addItem(type, value, el, confidence, method) {
      const key = type + ':' + value;
      if (seen.has(key) || !value || value.length < 3) return;
      if (!isVisible(el)) return;
      seen.add(key);
      const bbox = getBBox(el);
      items.push({
        id: genId(),
        type,
        value,
        placeholder: PLACEHOLDERS[type] || '[REDACTED]',
        confidence,
        method,
        status: 'detected',
        location: {
          boundingBox: bbox,
          selector: getSelector(el),
          xpath: '',
          pageLabel: getLabel(el),
        },
        timestamp: Date.now(),
      });
    }

    // ── Password inputs (DOM — most reliable) ──────────────────────────────
    document.querySelectorAll('input[type=password]').forEach(el => {
      addItem('PASSWORD', el.value || '••••••••', el, 1.0, 'dom');
    });

    // ── All other inputs + textareas ───────────────────────────────────────
    const inputSel = [
      'input:not([type=password]):not([type=hidden]):not([type=submit])',
      ':not([type=button]):not([type=checkbox]):not([type=radio]):not([type=file])',
      ', textarea',
      ', [contenteditable="true"]',
    ].join('');

    document.querySelectorAll(inputSel).forEach(el => {
      const text = el.value !== undefined ? el.value : (el.innerText || '');
      if (!text || text.trim().length < 3) return;
      runPatterns(text).forEach(({ type, value }) => {
        addItem(type, value, el, 0.97, 'regex');
      });
    });

    // ── Visible text nodes in the page ────────────────────────────────────
    const textSel = 'code, pre, [class*="token"], [class*="key"], [class*="secret"], p, span, div, td, li';
    document.querySelectorAll(textSel).forEach(el => {
      if (!isVisible(el)) return;
      let directText = '';
      el.childNodes.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) directText += (n.textContent || '');
      });
      directText = directText.trim();
      if (directText.length < 6) return;
      runPatterns(directText).forEach(({ type, value }) => {
        addItem(type, value, el, 0.92, 'regex');
      });
    });

    return items;
  }

  function getOverlayContainer() {
    let c = document.getElementById(CONTAINER_ID);
    if (!c) {
      c = document.createElement('div');
      c.id = CONTAINER_ID;
      c.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483647;';
      document.documentElement.appendChild(c);
    }
    return c;
  }

  function renderOverlays(items) {
    const container = getOverlayContainer();
    container.innerHTML = '';

    items.forEach(item => {
      const bb = item.location.boundingBox;
      if (!bb || bb.width === 0 || bb.height === 0) return;
      const c = COLORS[item.type] || COLORS.OTHER;

      const div = document.createElement('div');
      div.dataset.pfId = item.id;
      div.style.cssText = [
        'position:absolute',
        'left:' + (bb.x - window.scrollX) + 'px',
        'top:' + (bb.y - window.scrollY) + 'px',
        'width:' + bb.width + 'px',
        'height:' + bb.height + 'px',
        'background:' + c.bg,
        'border:2px solid ' + c.border,
        'border-radius:3px',
        'box-sizing:border-box',
        'pointer-events:none',
      ].join(';');

      const lbl = document.createElement('div');
      lbl.textContent = item.type.replace(/_/g, ' ');
      lbl.style.cssText = [
        'position:absolute',
        'top:-18px',
        'left:0',
        'background:' + c.border,
        'color:#fff',
        'font-family:monospace',
        'font-size:9px',
        'font-weight:700',
        'padding:1px 5px',
        'border-radius:2px',
        'white-space:nowrap',
        'pointer-events:none',
        'line-height:16px',
      ].join(';');

      div.appendChild(lbl);
      container.appendChild(div);
    });
  }

  function clearOverlays() {
    const c = document.getElementById(CONTAINER_ID);
    if (c) c.innerHTML = '';
  }

  function updatePositions(items) {
    const c = document.getElementById(CONTAINER_ID);
    if (!c) return;
    Array.from(c.children).forEach(div => {
      const item = items.find(i => i.id === div.dataset.pfId);
      if (!item) return;
      const bb = item.location.boundingBox;
      div.style.left = (bb.x - window.scrollX) + 'px';
      div.style.top  = (bb.y - window.scrollY) + 'px';
    });
  }

  function redactItems(items) {
    items.forEach(item => {
      if (item.type === 'PASSWORD') return;
      try {
        const el = document.querySelector(item.location.selector);
        if (!el) return;
        if (el.value !== undefined) {
          if (!originalValues.has(el)) originalValues.set(el, el.value);
          el.value = item.placeholder;
        } else if (el.isContentEditable) {
          if (!originalValues.has(el)) originalValues.set(el, el.innerText);
          el.innerText = item.placeholder;
        }
        item.status = 'redacted';
      } catch(e) {}
    });
  }

  function buildPayload(items) {
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    });
    const payload = {};
    Object.entries(grouped).forEach(([type, group]) => {
      if (group.length === 1) {
        payload[type.toLowerCase()] = group[0].placeholder;
      } else {
        group.forEach((item, i) => {
          payload[type.toLowerCase() + '_' + (i + 1)] = item.placeholder;
        });
      }
    });
    return payload;
  }

  function computeRisk(items) {
    const raw = items.reduce((s, i) => s + ((RISK_WEIGHTS[i.type] || 5) * i.confidence), 0);
    return Math.min(Math.round(raw), 100);
  }

  function runScan() {
    detectedItems = scanDom();

    // Auto-redact everything except passwords (don't blank the field)
    const toRedact = detectedItems.filter(i => i.type !== 'PASSWORD' && i.confidence >= 0.92);
    redactItems(toRedact);

    renderOverlays(detectedItems);
    overlaysVisible = true;

    const result = {
      url: window.location.href,
      tabId: 0,
      timestamp: Date.now(),
      items: detectedItems,
      riskScore: computeRisk(detectedItems),
      sanitizedPayload: buildPayload(detectedItems),
    };

    try { chrome.runtime.sendMessage({ type: 'SCAN_COMPLETE', payload: result }); } catch(e) {}

    return result;
  }

  // ── Message handler ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'SCAN_PAGE':
        sendResponse({ result: runScan() });
        break;
      case 'TOGGLE_OVERLAYS':
        if (overlaysVisible) { clearOverlays(); overlaysVisible = false; }
        else { renderOverlays(detectedItems); overlaysVisible = true; }
        sendResponse({ overlaysVisible });
        break;
      case 'CLEAR_OVERLAYS':
        clearOverlays(); overlaysVisible = false;
        sendResponse({ ok: true });
        break;
      case 'REDACT_ITEM': {
        const item = detectedItems.find(i => i.id === (message.payload && message.payload.id));
        if (item) redactItems([item]);
        sendResponse({ ok: true });
        break;
      }
    }
    return true; // keep channel open for async
  });

  // ── Scroll / resize: reposition overlays ──────────────────────────────────
  window.addEventListener('scroll', () => { if (overlaysVisible) updatePositions(detectedItems); }, { passive: true });
  window.addEventListener('resize', () => { if (overlaysVisible) updatePositions(detectedItems); }, { passive: true });

  // ── Auto-scan ──────────────────────────────────────────────────────────────
  if (document.readyState === 'complete') {
    setTimeout(runScan, 300); // slight delay so page JS finishes rendering
  } else {
    window.addEventListener('load', () => setTimeout(runScan, 300), { once: true });
  }

})();
