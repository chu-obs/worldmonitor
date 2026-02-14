export const config = { runtime: 'edge' };
import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonError, jsonRaw } from './_response.js';

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

  try {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    const data = await response.text();
    return jsonRaw(data, {
      status: response.status,
      corsHeaders,
      cacheControl: 'public, max-age=300',
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
