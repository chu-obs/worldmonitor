export const config = { runtime: 'edge' };

import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { getCacheTelemetrySnapshot } from './_cache-telemetry.js';
import { empty, jsonError, jsonOk } from './_response.js';

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

  return jsonOk(getCacheTelemetrySnapshot(), {
    status: 200,
    cacheControl: 'no-store',
    corsHeaders,
  });
}
