export const config = { runtime: 'edge' };
import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonError } from './_response.js';

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
    const response = await fetch('https://nasstatus.faa.gov/api/airport-status-information', {
      headers: { 'Accept': 'application/xml' },
    });
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/xml',
        ...corsHeaders,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`<error>${message}</error>`, {
      status: 500,
      headers: { 'Content-Type': 'application/xml', ...corsHeaders },
    });
  }
}
