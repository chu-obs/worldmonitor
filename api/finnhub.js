import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { empty, jsonError, jsonOk } from './_response.js';
export const config = { runtime: 'edge' };

const SYMBOL_PATTERN = /^[A-Za-z0-9.^]+$/;
const MAX_SYMBOLS = 20;
const MAX_SYMBOL_LENGTH = 10;

function validateSymbols(symbolsParam) {
  if (!symbolsParam) return null;

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length <= MAX_SYMBOL_LENGTH && SYMBOL_PATTERN.test(s))
    .slice(0, MAX_SYMBOLS);

  return symbols.length > 0 ? symbols : null;
}

async function fetchQuote(symbol, apiKey) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    return { symbol, error: `HTTP ${response.status}` };
  }

  const data = await response.json();

  // Finnhub returns { c, d, dp, h, l, o, pc, t } where:
  // c = current price, d = change, dp = percent change
  // h = high, l = low, o = open, pc = previous close, t = timestamp
  if (data.c === 0 && data.h === 0 && data.l === 0) {
    return { symbol, error: 'No data available' };
  }

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: data.t,
  };
}

export default async function handler(req) {
  const corsHeaders = getCorsHeaders(req, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    if (isDisallowedOrigin(req)) {
      return empty(403, corsHeaders);
    }
    return empty(204, corsHeaders);
  }

  if (req.method !== 'GET') {
    return jsonError('Method not allowed', {
      status: 405,
      code: 'method_not_allowed',
      corsHeaders,
    });
  }

  if (isDisallowedOrigin(req)) {
    return jsonError('Origin not allowed', {
      status: 403,
      code: 'origin_not_allowed',
      corsHeaders,
    });
  }

  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return jsonError('Finnhub API key not configured', {
      status: 503,
      code: 'missing_api_key',
      corsHeaders,
    });
  }

  const url = new URL(req.url);
  const symbols = validateSymbols(url.searchParams.get('symbols'));

  if (!symbols) {
    return jsonError('Invalid or missing symbols parameter', {
      status: 400,
      code: 'invalid_symbols',
      corsHeaders,
    });
  }

  try {
    // Fetch all quotes in parallel (Finnhub allows 60 req/min on free tier)
    const quotes = await Promise.all(
      symbols.map(symbol => fetchQuote(symbol, apiKey))
    );

    return jsonOk({ quotes }, {
      corsHeaders,
      cacheControl: 'public, max-age=30',
    });
  } catch (error) {
    return jsonError('Failed to fetch data', {
      status: 500,
      code: 'fetch_failed',
      details: error instanceof Error ? error.message : String(error),
      corsHeaders,
    });
  }
}
