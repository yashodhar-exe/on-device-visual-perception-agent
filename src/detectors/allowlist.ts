/**
 * allowlist.ts
 *
 * Comprehensive allowlists for common product, company, framework, browser,
 * technical terms, and website UI labels.
 * Used to immediately discard false positive detections on legitimate web pages.
 */

// Common product, brand, company, and service names
const BRAND_NAMES = new Set([
  'chatgpt',
  'openai',
  'github',
  'google',
  'stripe',
  'firebase',
  'supabase',
  'razorpay',
  'anthropic',
  'aws',
  'amazon',
  'azure',
  'microsoft',
  'apple',
  'meta',
  'facebook',
  'instagram',
  'whatsapp',
  'twitter',
  'x',
  'linkedin',
  'youtube',
  'netflix',
  'spotify',
  'uber',
  'airbnb',
  'dropbox',
  'slack',
  'discord',
  'zoom',
  'figma',
  'notion',
  'vercel',
  'netlify',
  'heroku',
  'cloudflare',
  'datadog',
  'sentry',
  'postman',
  'gitlab',
  'bitbucket',
  'atlassian',
  'jira',
  'confluence',
  'trello',
  'stack overflow',
  'reddit',
  'wikipedia',
  'medium',
  'dev.to',
  'huggingface',
  'replit',
  'codepen',
  'codesandbox',
]);

// Common web frameworks, programming languages, and tech terms
const TECH_TERMS = new Set([
  'react',
  'next.js',
  'nextjs',
  'vue',
  'vuejs',
  'angular',
  'svelte',
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'golang',
  'java',
  'c++',
  'c#',
  'php',
  'ruby',
  'html',
  'css',
  'tailwind',
  'tailwindcss',
  'bootstrap',
  'webpack',
  'vite',
  'docker',
  'kubernetes',
  'node.js',
  'nodejs',
  'express',
  'fastapi',
  'django',
  'flask',
  'graphql',
  'rest api',
  'mongodb',
  'postgresql',
  'postgres',
  'mysql',
  'sqlite',
  'redis',
  'elasticsearch',
  'tesseract',
  'onnx',
  'tensorflow',
  'pytorch',
  'transformers',
]);

// Common browser, OS, and platform names
const OS_AND_BROWSERS = new Set([
  'chrome',
  'firefox',
  'safari',
  'edge',
  'opera',
  'brave',
  'chromium',
  'windows',
  'macos',
  'linux',
  'android',
  'ios',
  'ubuntu',
  'debian',
]);

// Common website UI navigation and action labels
const UI_LABELS = new Set([
  'home',
  'dashboard',
  'settings',
  'help',
  'pricing',
  'about',
  'about us',
  'contact',
  'contact us',
  'documentation',
  'docs',
  'privacy policy',
  'terms of service',
  'terms & conditions',
  'terms',
  'privacy',
  'sign in',
  'sign up',
  'log in',
  'log out',
  'search',
  'menu',
  'navigation',
  'history',
  'new chat',
  'chat history',
  'upgrade',
  'explore',
  'overview',
  'features',
  'community',
  'blog',
  'share',
  'copy',
  'edit',
  'delete',
  'submit',
  'cancel',
  'save',
  'download',
  'upload',
  'close',
  'back',
  'next',
  'previous',
  'learn more',
  'read more',
  'view all',
  'click here',
  'see more',
  'all rights reserved',
  'copyright',
]);

/**
 * Check if a text candidate matches any entry in the allowlist.
 * Returns true if the string is a known brand, tech term, UI label, or common phrase.
 */
export function isAllowlisted(value: string): boolean {
  if (!value) return true;
  const clean = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (clean.length === 0) return true;

  // Safe semantic placeholders and tokens are explicitly allowlisted
  if (
    clean.startsWith('your_') ||
    clean.startsWith('[') ||
    clean.endsWith(']') ||
    /^your_[a-z0-9_]+$/i.test(clean) ||
    /^[a-z0-9_]+=your_[a-z0-9_]+$/i.test(clean)
  ) {
    return true;
  }

  if (BRAND_NAMES.has(clean)) return true;
  if (TECH_TERMS.has(clean)) return true;
  if (OS_AND_BROWSERS.has(clean)) return true;
  if (UI_LABELS.has(clean)) return true;

  // Check if string is composed purely of common brand/UI words
  const words = clean.split(' ');
  if (words.length > 0 && words.every((w) => BRAND_NAMES.has(w) || TECH_TERMS.has(w) || UI_LABELS.has(w) || OS_AND_BROWSERS.has(w))) {
    return true;
  }

  return false;
}
