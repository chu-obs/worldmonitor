import { Redis } from '@upstash/redis';
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { createIpRateLimiter } from './_ip-rate-limit.js';
import { empty, jsonBody } from './_response.js';

export const config = {
  runtime: 'edge',
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';
const CACHE_TTL_SECONDS = 86400;
const CACHE_VERSION = 'v1';
const RATE_LIMIT = 60; // requests/min/IP
const RATE_WINDOW_MS = 60 * 1000;
const rateLimiter = createIpRateLimiter({
  limit: RATE_LIMIT,
  windowMs: RATE_WINDOW_MS,
  maxEntries: 5000,
});

let redis = null;
let redisInitFailed = false;
function getRedis() {
  if (redis) return redis;
  if (redisInitFailed) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      redis = new Redis({ url, token });
    } catch (err) {
      console.warn('[Classify] Redis init failed:', err.message);
      redisInitFailed = true;
      return null;
    }
  }
  return redis;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const VALID_LEVELS = ['critical', 'high', 'medium', 'low', 'info'];
const VALID_CATEGORIES = [
  'conflict', 'protest', 'disaster', 'diplomatic', 'economic',
  'terrorism', 'cyber', 'health', 'environmental', 'military',
  'crime', 'infrastructure', 'tech', 'general',
];

function getClientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';
}

export default async function handler(request) {
  const corsHeaders = getCorsHeaders(request, 'GET, OPTIONS');

  if (request.method === 'OPTIONS') {
    if (isDisallowedOrigin(request)) {
      return empty(403, corsHeaders);
    }
    return empty(204, corsHeaders);
  }

  if (request.method !== 'GET') {
    return jsonBody({ error: 'Method not allowed' }, {
      status: 405,
      corsHeaders,
    });
  }

  if (isDisallowedOrigin(request)) {
    return jsonBody({ error: 'Origin not allowed' }, {
      status: 403,
      corsHeaders,
    });
  }

  const ip = getClientIp(request);
  if (!rateLimiter.check(ip)) {
    return jsonBody({ error: 'Rate limited', fallback: true }, {
      status: 429,
      corsHeaders,
      extraHeaders: { 'Retry-After': '60' },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonBody({ fallback: true }, {
      status: 503,
      corsHeaders,
    });
  }

  const url = new URL(request.url);
  const title = url.searchParams.get('title');
  const variant = url.searchParams.get('variant') || 'full';

  if (!title) {
    return jsonBody({ error: 'title param required' }, {
      status: 400,
      corsHeaders,
    });
  }

  const cacheKey = `classify:${CACHE_VERSION}:${hashString(title.toLowerCase() + ':' + variant)}`;

  try {
    const redisClient = getRedis();
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached && typeof cached === 'object' && cached.level) {
          return jsonBody({
            level: cached.level,
            category: cached.category,
            confidence: 0.9,
            source: 'llm',
            cached: true,
          }, {
            status: 200,
            corsHeaders,
          });
        }
      } catch (e) {
        console.warn('[Classify] Cache read error:', e.message);
      }
    }

    const isTech = variant === 'tech';
    const systemPrompt = `You classify news headlines into threat level and category. Return ONLY valid JSON, no other text.

Levels: critical, high, medium, low, info
Categories: conflict, protest, disaster, diplomatic, economic, terrorism, cyber, health, environmental, military, crime, infrastructure, tech, general

${isTech ? 'Focus: technology, startups, AI, cybersecurity. Most tech news is "low" or "info" unless it involves outages, breaches, or major disruptions.' : 'Focus: geopolitical events, conflicts, disasters, diplomacy. Classify by real-world severity and impact.'}

Return: {"level":"...","category":"..."}`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: title },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('[Classify] Groq error:', response.status);
      return jsonBody({ fallback: true }, {
        status: response.status,
        corsHeaders,
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return jsonBody({ fallback: true }, {
        status: 500,
        corsHeaders,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn('[Classify] Invalid JSON from LLM:', raw);
      return jsonBody({ fallback: true }, {
        status: 500,
        corsHeaders,
      });
    }

    const level = VALID_LEVELS.includes(parsed.level) ? parsed.level : null;
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : null;
    if (!level || !category) {
      return jsonBody({ fallback: true }, {
        status: 500,
        corsHeaders,
      });
    }

    if (redisClient) {
      try {
        await redisClient.set(cacheKey, { level, category, timestamp: Date.now() }, { ex: CACHE_TTL_SECONDS });
      } catch (e) {
        console.warn('[Classify] Cache write error:', e.message);
      }
    }

    return jsonBody({
      level,
      category,
      confidence: 0.9,
      source: 'llm',
      cached: false,
    }, {
      status: 200,
      corsHeaders,
      cacheControl: 'public, max-age=3600',
    });

  } catch (error) {
    if (error instanceof Error) {
      console.error('[Classify] Error:', error.message);
    } else {
      console.error('[Classify] Error:', String(error));
    }
    return jsonBody({ fallback: true }, {
      status: 500,
      corsHeaders,
    });
  }
}
