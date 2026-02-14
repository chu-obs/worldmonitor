// GDELT Geo API proxy with security hardening
export const config = { runtime: 'edge' };
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { empty, jsonError } from './_response.js';

const ALLOWED_FORMATS = ['geojson', 'json', 'csv'];
const MAX_RECORDS = 500;
const MIN_RECORDS = 1;
const ALLOWED_TIMESPANS = ['1d', '7d', '14d', '30d', '60d', '90d'];

function validateMaxRecords(val) {
  const num = parseInt(val, 10);
  if (isNaN(num)) return 250;
  return Math.max(MIN_RECORDS, Math.min(MAX_RECORDS, num));
}

function validateFormat(val) {
  return ALLOWED_FORMATS.includes(val) ? val : 'geojson';
}

function validateTimespan(val) {
  return ALLOWED_TIMESPANS.includes(val) ? val : '7d';
}

function sanitizeQuery(val) {
  if (!val || typeof val !== 'string') return 'protest';
  return val.slice(0, 200).replace(/[<>\"']/g, '');
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

  const url = new URL(req.url);
  const query = sanitizeQuery(url.searchParams.get('query'));
  const format = validateFormat(url.searchParams.get('format') || 'geojson');
  const maxrecords = validateMaxRecords(url.searchParams.get('maxrecords') || '250');
  const timespan = validateTimespan(url.searchParams.get('timespan') || '7d');

  try {
    const response = await fetch(
      `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&format=${format}&maxrecords=${maxrecords}&timespan=${timespan}`
    );

    if (!response.ok) {
      return jsonError('Upstream service unavailable', {
        status: 502,
        code: 'upstream_unavailable',
        corsHeaders,
      });
    }

    const data = await response.text();
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        ...corsHeaders,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('[GDELT] Fetch error:', error.message);
    } else {
      console.error('[GDELT] Fetch error:', String(error));
    }
    return jsonError('Failed to fetch GDELT data', {
      status: 500,
      code: 'fetch_failed',
      details: error instanceof Error ? error.message : String(error),
      corsHeaders,
    });
  }
}
