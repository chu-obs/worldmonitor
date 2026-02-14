import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { empty, jsonError, jsonRaw, jsonOk } from './_response.js';
export const config = { runtime: 'edge' };

function clampLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit || '', 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, parsed));
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
  const dateRange = url.searchParams.get('dateRange') || '7d';
  const limit = clampLimit(url.searchParams.get('limit'));

  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    // Signal to client that outages feature is not configured
    return jsonOk({ configured: false }, {
      status: 200,
      corsHeaders,
    });
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/radar/annotations/outages?dateRange=${dateRange}&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.text();
    return jsonRaw(data, {
      status: response.status,
      corsHeaders,
    });
  } catch (error) {
    // Return empty result on error so client circuit breaker doesn't trigger unnecessarily
    return jsonOk({ success: true, result: { annotations: [] } }, {
      status: 200,
      corsHeaders,
    });
  }
}
