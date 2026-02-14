const STRICT_ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(.*\.)?worldmonitor\.app$/,
  /^https:\/\/.*-elie-habib-projects\.vercel\.app$/,
  /^https:\/\/worldmonitor.*\.vercel\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/tauri\.localhost(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.tauri\.localhost(:\d+)?$/i,
  /^tauri:\/\/localhost$/,
  /^asset:\/\/localhost$/,
];
const DEFAULT_STRICT_ORIGIN = 'https://worldmonitor.app';

function getHeader(req, name) {
  const headers = req?.headers;
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return headers.get(name) || '';
  }
  const key = name.toLowerCase();
  const value = headers[key] ?? headers[name];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function isAllowedOrigin(origin) {
  return Boolean(origin) && STRICT_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function baseCorsHeaders(methods) {
  return {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export function getCorsHeaders(req, methods = 'GET, OPTIONS') {
  const origin = getHeader(req, 'origin');
  const allowOrigin = isAllowedOrigin(origin) ? origin : DEFAULT_STRICT_ORIGIN;
  return {
    ...baseCorsHeaders(methods),
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
  };
}

export function getWildcardCorsHeaders(methods = 'GET, OPTIONS') {
  return {
    ...baseCorsHeaders(methods),
    'Access-Control-Allow-Origin': '*',
  };
}

export function isDisallowedOrigin(req) {
  const origin = getHeader(req, 'origin');
  if (!origin) return false;
  return !isAllowedOrigin(origin);
}
