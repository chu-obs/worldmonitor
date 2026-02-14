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
      'https://msi.nga.mil/api/publications/broadcast-warn?output=json&status=A'
    );
    const data = await response.text();
    return jsonRaw(data, {
      status: response.status,
      corsHeaders,
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
