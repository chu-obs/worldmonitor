export const config = { runtime: 'edge' };
import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonError, jsonOk } from './_response.js';

const MAX_RECORDS = 20;
const DEFAULT_RECORDS = 10;

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
  const query = url.searchParams.get('query');
  const maxrecords = Math.min(
    parseInt(url.searchParams.get('maxrecords') || DEFAULT_RECORDS, 10),
    MAX_RECORDS
  );
  const timespan = url.searchParams.get('timespan') || '72h';

  if (!query || query.length < 2) {
    return jsonError('Query parameter required', {
      status: 400,
      code: 'missing_query',
      corsHeaders,
    });
  }

  try {
    const gdeltUrl = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    gdeltUrl.searchParams.set('query', query);
    gdeltUrl.searchParams.set('mode', 'artlist');
    gdeltUrl.searchParams.set('maxrecords', maxrecords.toString());
    gdeltUrl.searchParams.set('format', 'json');
    gdeltUrl.searchParams.set('sort', 'date');
    gdeltUrl.searchParams.set('timespan', timespan);

    const response = await fetch(gdeltUrl.toString());

    if (!response.ok) {
      throw new Error(`GDELT returned ${response.status}`);
    }

    const data = await response.json();

    const articles = (data.articles || []).map(article => ({
      title: article.title,
      url: article.url,
      source: article.domain || article.source?.domain,
      date: article.seendate,
      image: article.socialimage,
      language: article.language,
      tone: article.tone,
    }));

    return jsonOk({ articles, query }, {
      status: 200,
      corsHeaders,
      cacheControl: 'public, max-age=300',
    });
  } catch (error) {
    return jsonError('Failed to fetch GDELT data', {
      status: 500,
      code: 'fetch_failed',
      details: {
        message: error instanceof Error ? error.message : String(error),
        articles: [],
      },
      corsHeaders,
    });
  }
}
