export const config = { runtime: 'edge' };
import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonError, jsonOk } from './_response.js';

// Fetch trending GitHub repositories
// Uses unofficial GitHub trending scraper API
export default async function handler(request) {
  const corsHeaders = getWildcardCorsHeaders('GET, OPTIONS');

  if (request.method === 'OPTIONS') {
    return empty(204, corsHeaders);
  }

  if (request.method !== 'GET') {
    return jsonError('Method not allowed', {
      status: 405,
      code: 'method_not_allowed',
      corsHeaders,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'python'; // python, javascript, typescript, etc.
    const since = searchParams.get('since') || 'daily'; // daily, weekly, monthly
    const spoken_language = searchParams.get('spoken_language') || ''; // en, zh, etc.

    // Using GitHub trending API (unofficial)
    // Alternative: https://gh-trending-api.herokuapp.com/repositories
    const baseUrl = 'https://api.gitterapp.com/repositories';
    const queryParams = new URLSearchParams({
      language: language,
      since: since,
    });

    if (spoken_language) {
      queryParams.append('spoken_language_code', spoken_language);
    }

    const apiUrl = `${baseUrl}?${queryParams.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WorldMonitor/1.0 (Tech Tracker)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      // Fallback: try alternative API
      const fallbackUrl = `https://gh-trending-api.herokuapp.com/repositories/${language}?since=${since}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!fallbackResponse.ok) {
        throw new Error(`GitHub trending API returned ${fallbackResponse.status}`);
      }

      const data = await fallbackResponse.json();
      return jsonOk(data, {
        status: 200,
        corsHeaders,
        cacheControl: 'public, max-age=1800', // 30 min cache
      });
    }

    const data = await response.json();

    return jsonOk(data, {
      status: 200,
      corsHeaders,
      cacheControl: 'public, max-age=1800', // 30 min cache
    });
  } catch (error) {
    return jsonError('Failed to fetch GitHub trending data', {
      status: 500,
      code: 'fetch_failed',
      details: error instanceof Error ? error.message : String(error),
      corsHeaders,
    });
  }
}
