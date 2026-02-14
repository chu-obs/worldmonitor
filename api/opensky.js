// OpenSky Network API proxy - v3
// Note: OpenSky seems to block some cloud provider IPs
export const config = { runtime: 'edge' };
import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonBody, jsonError, jsonOk } from './_response.js';

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

  // Build OpenSky API URL with bounding box params
  const params = new URLSearchParams();
  ['lamin', 'lomin', 'lamax', 'lomax'].forEach(key => {
    const val = url.searchParams.get(key);
    if (val) params.set(key, val);
  });

  const openskyUrl = `https://opensky-network.org/api/states/all${params.toString() ? '?' + params.toString() : ''}`;

  try {
    // Try fetching with different headers to avoid blocks
    const response = await fetch(openskyUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
    });

    if (response.status === 429) {
      return jsonBody({ error: 'Rate limited', time: Date.now(), states: null }, {
        status: 429,
        corsHeaders,
      });
    }

    // Check if response is OK
    if (!response.ok) {
      const text = await response.text();
      return jsonBody({
        error: `OpenSky HTTP ${response.status}: ${text.substring(0, 200)}`,
        time: Date.now(),
        states: null
      }, {
        status: response.status,
        corsHeaders,
      });
    }

    const data = await response.json();
    return jsonOk(data, {
      status: response.status,
      corsHeaders,
      cacheControl: 'public, max-age=30',
    });
  } catch (error) {
    return jsonBody({
      error: `Fetch failed: ${error instanceof Error ? `${error.name} - ${error.message}` : String(error)}`,
      time: Date.now(),
      states: null
    }, {
      status: 500,
      corsHeaders,
    });
  }
}
