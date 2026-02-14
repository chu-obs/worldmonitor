export const config = { runtime: 'edge' };
import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonError, jsonOk } from './_response.js';

// Fetch Hacker News front page stories
// Uses official HackerNews Firebase API
const ALLOWED_STORY_TYPES = new Set(['top', 'new', 'best', 'ask', 'show', 'job']);
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 60;
const MAX_CONCURRENCY = 10;

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit || '', 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
}

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
    const requestedType = searchParams.get('type') || 'top';
    const storyType = ALLOWED_STORY_TYPES.has(requestedType) ? requestedType : 'top';
    const limit = parseLimit(searchParams.get('limit'));

    // HackerNews official Firebase API
    const storiesUrl = `https://hacker-news.firebaseio.com/v0/${storyType}stories.json`;

    // Fetch story IDs
    const storiesResponse = await fetch(storiesUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!storiesResponse.ok) {
      throw new Error(`HackerNews API returned ${storiesResponse.status}`);
    }

    const storyIds = await storiesResponse.json();
    if (!Array.isArray(storyIds)) {
      throw new Error('HackerNews API returned unexpected payload');
    }
    const limitedIds = storyIds.slice(0, limit);

    // Fetch story details in bounded batches to avoid unbounded fan-out.
    const stories = [];
    for (let i = 0; i < limitedIds.length; i += MAX_CONCURRENCY) {
      const batchIds = limitedIds.slice(i, i + MAX_CONCURRENCY);
      const storyPromises = batchIds.map(async (id) => {
        const storyUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
        try {
          const response = await fetch(storyUrl, {
            signal: AbortSignal.timeout(5000),
          });
          if (response.ok) {
            return await response.json();
          }
          return null;
        } catch (error) {
          console.error(`Failed to fetch story ${id}:`, error);
          return null;
        }
      });
      const batchResults = await Promise.all(storyPromises);
      stories.push(...batchResults.filter((story) => story !== null));
    }

    return jsonOk({
      type: storyType,
      stories: stories,
      total: stories.length,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      corsHeaders,
      cacheControl: 'public, max-age=300', // 5 min cache
    });
  } catch (error) {
    return jsonError('Failed to fetch Hacker News data', {
      status: 500,
      code: 'fetch_failed',
      details: error instanceof Error ? error.message : String(error),
      corsHeaders,
    });
  }
}
