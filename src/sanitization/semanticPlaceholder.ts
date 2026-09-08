/**
 * semanticPlaceholder.ts
 *
 * Context-Aware Semantic Placeholder Generator for Browser Vision Agent.
 *
 * Core Principle:
 * PRESERVE SEMANTIC CONTEXT + REMOVE ACTUAL SECRET VALUE
 *
 * Transforms secrets into meaningful placeholders based on variable names,
 * attributes, and surrounding code/DOM context, instead of generic [SECRET] tokens.
 *
 * Examples:
 *  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy... -> NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
 *  - NEXT_PUBLIC_SUPABASE_URL=https://...     -> NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...      -> NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
 *  - SUPABASE_SERVICE_ROLE_KEY=eyJ...          -> SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
 *  - MY_API_KEY=abc123                         -> MY_API_KEY=YOUR_MY_API_KEY
 *  - STRIPE_SECRET_KEY=sk_test_...             -> STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
 *  - DATABASE_URL=postgresql://...             -> DATABASE_URL=YOUR_DATABASE_URL
 *  - eyJhbGci... (no context)                  -> YOUR_JWT_TOKEN
 */

import { DetectionType } from '../core/types';

export interface SemanticPlaceholderContext {
  detectedType?: DetectionType | string;
  surroundingContext?: string;
  variableName?: string;
  attributeName?: string;
  tagName?: string;
}

/**
 * Extracts a candidate variable or key name from surrounding text context.
 * e.g.:
 *  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIzaSy...'" -> "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
 *  "apiKey: 'sk-proj-...'" -> "apiKey"
 *  "DATABASE_URL=postgresql://..." -> "DATABASE_URL"
 *  "process.env.SUPABASE_ANON_KEY = '...'" -> "SUPABASE_ANON_KEY"
 */
export function extractVariableNameFromContext(context: string, valueToMatch?: string): string | null {
  if (!context) return null;

  if (valueToMatch) {
    const escapedVal = valueToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Look for variable name preceding the value: KEY = VALUE, KEY: VALUE, "KEY": "VALUE"
    const regex = new RegExp(
      `(?:export\\s+)?(?:const|let|var|env)?\\s*(?:process\\.env\\.|window\\.env\\.)?["']?([A-Za-z0-9_\\-\\.]+)["']?\\s*[:=]\\s*["']?\\s*${escapedVal}`,
      'i'
    );
    const match = context.match(regex);
    if (match && match[1]) {
      let rawName = match[1].trim();
      if (rawName.includes('.')) {
        const parts = rawName.split('.');
        rawName = parts[parts.length - 1];
      }
      return rawName;
    }
  }

  // Fallback: look for generic assignment pattern on lines containing an assignment
  const generalMatch = context.match(
    /(?:export\\s+)?(?:const|let|var|env)?\\s*(?:process\\.env\\.|window\\.env\\.)?["']?([A-Za-z0-9_\\-]+)["']?\\s*[:=]/i
  );
  if (generalMatch && generalMatch[1]) {
    return generalMatch[1].trim();
  }

  return null;
}

/**
 * Normalizes a variable name into a standardized YOUR_<KEY> placeholder.
 * e.g. "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" -> "YOUR_GOOGLE_MAPS_API_KEY"
 *      "SUPABASE_URL"                   -> "YOUR_SUPABASE_PROJECT_URL"
 *      "NEXT_PUBLIC_SUPABASE_ANON_KEY"  -> "YOUR_SUPABASE_ANON_KEY"
 *      "SUPABASE_SERVICE_ROLE_KEY"      -> "YOUR_SUPABASE_SERVICE_ROLE_KEY"
 *      "MY_API_KEY"                     -> "YOUR_MY_API_KEY"
 *      "DATABASE_URL"                   -> "YOUR_DATABASE_URL"
 */
export function formatPlaceholderFromVariableName(varName: string): string {
  let clean = varName.trim();

  // Strip process.env or env prefixes
  clean = clean.replace(/^(process\.env\.|window\.env\.|env\.)/i, '');

  // Strip common framework prefixes for cleaner placeholder names, but preserve intent
  clean = clean.replace(/^(NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_)/i, '');

  const upper = clean.toUpperCase().replace(/[-.]/g, '_');

  // Specific semantic mappings for well-known services and requested patterns
  if (upper.includes('GOOGLE_MAPS') || (upper.includes('MAPS') && upper.includes('KEY'))) {
    return 'YOUR_GOOGLE_MAPS_API_KEY';
  }
  if (upper.includes('SUPABASE') && upper.includes('SERVICE_ROLE')) {
    return 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
  }
  if (upper.includes('SUPABASE') && (upper.includes('ANON') || upper.includes('PUBLISHABLE'))) {
    return 'YOUR_SUPABASE_ANON_KEY';
  }
  if (upper.includes('SUPABASE') && (upper.includes('URL') || upper.includes('HOST'))) {
    return 'YOUR_SUPABASE_PROJECT_URL';
  }
  if (upper.includes('STRIPE') && (upper.includes('SECRET') || upper.includes('KEY'))) {
    return 'YOUR_STRIPE_SECRET_KEY';
  }
  if (upper.includes('RAZORPAY') && upper.includes('KEY')) {
    return 'YOUR_RAZORPAY_KEY';
  }
  if (upper.includes('OPENAI') && upper.includes('KEY')) {
    return 'YOUR_OPENAI_API_KEY';
  }
  if (upper.includes('ANTHROPIC') && upper.includes('KEY')) {
    return 'YOUR_ANTHROPIC_API_KEY';
  }
  if (upper.includes('GITHUB') && (upper.includes('TOKEN') || upper.includes('PAT'))) {
    return 'YOUR_GITHUB_TOKEN';
  }
  if (upper.includes('AWS') && upper.includes('SECRET')) {
    return 'YOUR_AWS_SECRET_KEY';
  }
  if (upper.includes('AWS') && (upper.includes('ACCESS') || upper.includes('KEY'))) {
    return 'YOUR_AWS_ACCESS_KEY';
  }
  if (
    upper.includes('DATABASE_URL') ||
    upper.includes('DB_URL') ||
    upper.includes('POSTGRES_URL') ||
    upper.includes('MONGO_URL')
  ) {
    return 'YOUR_DATABASE_URL';
  }
  if (upper === 'SERVICE_ROLE_KEY') {
    return 'YOUR_SERVICE_ROLE_KEY';
  }
  if (upper === 'CLIENT_SECRET') {
    return 'YOUR_CLIENT_SECRET';
  }
  if (upper === 'CLIENT_ID') {
    return 'YOUR_CLIENT_ID';
  }
  if (upper === 'PRIVATE_KEY') {
    return 'YOUR_PRIVATE_KEY';
  }
  if (upper === 'ACCESS_TOKEN') {
    return 'YOUR_ACCESS_TOKEN';
  }
  if (upper === 'AUTH_TOKEN') {
    return 'YOUR_AUTH_TOKEN';
  }
  if (upper === 'BEARER_TOKEN') {
    return 'YOUR_BEARER_TOKEN';
  }
  if (upper === 'API_KEY' || upper === 'APIKEY') {
    return 'YOUR_API_KEY';
  }
  if (upper === 'SECRET_KEY' || upper === 'SECRET') {
    return 'YOUR_SECRET_KEY';
  }
  if (upper === 'JWT' || upper === 'JWT_TOKEN') {
    return 'YOUR_JWT_TOKEN';
  }
  if (upper === 'PASSWORD' || upper === 'PASS') {
    return 'YOUR_PASSWORD';
  }
  if (upper === 'EMAIL') {
    return 'YOUR_EMAIL';
  }

  return `YOUR_${upper}`;
}

/**
 * Formats a semantic placeholder for form input fields.
 * e.g. Email: john@example.com -> EMAIL=YOUR_EMAIL
 *      Password: actualPassword123 -> PASSWORD=YOUR_PASSWORD
 */
export function formatFormFieldPlaceholder(
  detectedType?: DetectionType | string,
  _value?: string,
  fieldName?: string
): string {
  if (fieldName) {
    const cleanField = fieldName.replace(/[-_]?(input|textarea|field|box)$/i, '');
    const upper = cleanField.toUpperCase().replace(/[-.]/g, '_');
    if (upper.includes('PASS')) return 'PASSWORD=YOUR_PASSWORD';
    if (upper.includes('EMAIL')) return 'EMAIL=YOUR_EMAIL';
    if (upper.includes('KEY') || upper.includes('API')) return `${upper}=YOUR_${upper}`;
  }

  switch (detectedType) {
    case 'EMAIL':
      return 'EMAIL=YOUR_EMAIL';
    case 'PASSWORD':
      return 'PASSWORD=YOUR_PASSWORD';
    case 'PHONE':
      return 'PHONE=YOUR_PHONE';
    case 'CARD':
      return 'CARD=YOUR_CARD_NUMBER';
    default:
      return `${detectedType || 'FIELD'}=YOUR_${detectedType || 'VALUE'}`;
  }
}

/**
 * Determines the best safe semantic placeholder from available context.
 */
export function getSemanticPlaceholder(
  detectedType?: DetectionType | string,
  surroundingContext?: string,
  variableName?: string,
  attributeName?: string
): string {
  // 1. Try explicit variable name first
  if (variableName && variableName.trim().length > 1) {
    return formatPlaceholderFromVariableName(variableName);
  }

  // 2. Try to extract variable name from surrounding code or text context
  if (surroundingContext) {
    const extractedVar = extractVariableNameFromContext(surroundingContext);
    if (extractedVar && extractedVar.length > 1) {
      return formatPlaceholderFromVariableName(extractedVar);
    }
  }

  // 3. Try to use attribute name (e.g. name="stripe_key", id="supabase_anon")
  if (attributeName && attributeName.trim().length > 1) {
    const cleanAttr = attributeName
      .replace(/-(input|textarea|field|box)$/i, '')
      .replace(/[-]/g, '_');
    if (!['text', 'input', 'password', 'string', 'value'].includes(cleanAttr.toLowerCase())) {
      return formatPlaceholderFromVariableName(cleanAttr);
    }
  }

  // 4. Default type-based semantic fallbacks (when no variable context exists)
  switch (detectedType) {
    case 'JWT_SECRET':
      return 'YOUR_JWT_TOKEN';
    case 'API_KEY':
    case 'OPENAI_KEY':
    case 'ANTHROPIC_KEY':
    case 'GOOGLE_KEY':
      return 'YOUR_API_KEY';
    case 'SUPABASE_KEY':
      return 'YOUR_SUPABASE_ANON_KEY';
    case 'STRIPE_KEY':
      return 'YOUR_STRIPE_SECRET_KEY';
    case 'RAZORPAY_KEY':
      return 'YOUR_RAZORPAY_KEY';
    case 'GITHUB_TOKEN':
      return 'YOUR_GITHUB_TOKEN';
    case 'AWS_KEY':
      return 'YOUR_AWS_ACCESS_KEY';
    case 'MONGODB_URL':
    case 'POSTGRES_URL':
    case 'MYSQL_URL':
    case 'REDIS_URL':
      return 'YOUR_DATABASE_URL';
    case 'EMAIL':
      return 'YOUR_EMAIL';
    case 'PASSWORD':
      return 'YOUR_PASSWORD';
    case 'PHONE':
      return 'YOUR_PHONE_NUMBER';
    case 'CARD':
      return 'YOUR_CARD_NUMBER';
    case 'AADHAAR':
      return 'YOUR_AADHAAR_NUMBER';
    case 'PAN':
      return 'YOUR_PAN_NUMBER';
    case 'IFSC':
      return 'YOUR_IFSC_CODE';
    case 'NAME':
      return 'YOUR_NAME';
    case 'ADDRESS':
      return 'YOUR_ADDRESS';
    case 'FACE':
      return 'YOUR_FACE_REDACTED';
    default:
      return 'YOUR_SENSITIVE_VALUE';
  }
}

/**
 * Replaces ONLY the secret value within a code or configuration line,
 * preserving all variable names, prefixes, quotes, and punctuation.
 *
 * Example:
 *  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXX"
 *  -> "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY"
 */
export function sanitizeContextString(
  lineOrContext: string,
  secretValue: string,
  detectedType?: DetectionType | string,
  explicitVarName?: string
): string {
  if (!lineOrContext || !secretValue) return lineOrContext;

  const varName = explicitVarName || extractVariableNameFromContext(lineOrContext, secretValue);
  const placeholder = getSemanticPlaceholder(detectedType, lineOrContext, varName ?? undefined);

  // Replace only the occurrence of secretValue
  return lineOrContext.split(secretValue).join(placeholder);
}

