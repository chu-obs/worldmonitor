export const config = { runtime: 'edge' };

import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonError, jsonRaw } from './_response.js';

const SYMBOL_PATTERN = /^[A-Za-z0-9.^=\-]+$/;
const MAX_SYMBOL_LENGTH = 20;

function validateSymbol(symbol) {
  if (!symbol) return null;
  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.length > MAX_SYMBOL_LENGTH) return null;
  if (!SYMBOL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export default async function handler(req) {
  const corsHeaders = getWildcardCorsHeaders('GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return empty(204, corsHeaders);
  }

  if (req.method !== 'GET') {
    return jsonError('Method not allowed', {
      status: 405,
      code: 'method_not_allowed',
      corsHeaders,
    });
  }

  const url = new URL(req.url);
  const symbol = validateSymbol(url.searchParams.get('symbol'));

  if (!symbol) {
    return jsonError('Invalid or missing symbol parameter', {
      status: 400,
      code: 'invalid_symbol',
      corsHeaders,
    });
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = await response.text();
    return jsonRaw(data, {
      status: response.status,
      corsHeaders,
      cacheControl: 'public, max-age=60',
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
