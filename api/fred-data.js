import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { empty, jsonError, jsonRaw } from './_response.js';
export const config = { runtime: 'edge' };

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
  const seriesId = url.searchParams.get('series_id');
  const observationStart = url.searchParams.get('observation_start');
  const observationEnd = url.searchParams.get('observation_end');

  if (!seriesId) {
    return jsonError('Missing series_id parameter', {
      status: 400,
      code: 'missing_series_id',
      corsHeaders,
    });
  }

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return jsonError('FRED_API_KEY not configured', {
      status: 503,
      code: 'missing_api_key',
      corsHeaders,
    });
  }

  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'desc',
      limit: '10',
    });

    if (observationStart) params.set('observation_start', observationStart);
    if (observationEnd) params.set('observation_end', observationEnd);

    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?${params}`;
    const response = await fetch(fredUrl, {
      headers: { 'Accept': 'application/json' },
    });

    const data = await response.json();

    return jsonRaw(data, {
      status: response.status,
      corsHeaders,
      cacheControl: 'public, max-age=3600',
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
