/**
 * Groq API Summarization Endpoint with Redis Caching
 * Uses Llama 3.1 8B Instant for high-throughput summarization
 * Free tier: 14,400 requests/day (14x more than 70B model)
 * Server-side Redis cache for cross-user deduplication
 */

import { Redis } from '@upstash/redis';
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { createIpRateLimiter } from './_ip-rate-limit.js';
import { empty, jsonBody, jsonError, jsonOk } from './_response.js';

export const config = {
  runtime: 'edge',
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant'; // 14.4K RPD vs 1K for 70b
const CACHE_TTL_SECONDS = 86400; // 24 hours
const RATE_LIMIT = 30; // requests / minute / IP
const RATE_WINDOW_MS = 60 * 1000;
const rateLimiter = createIpRateLimiter({
  limit: RATE_LIMIT,
  windowMs: RATE_WINDOW_MS,
  maxEntries: 5000,
});

// Initialize Redis (lazy - only if env vars present)
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
      console.warn('[Groq] Redis init failed:', err.message);
      redisInitFailed = true;
      return null;
    }
  }
  return redis;
}

// Cache version - increment to bust old caches after breaking changes
const CACHE_VERSION = 'v3';

// Generate cache key from headlines, geoContext, and variant
function getCacheKey(headlines, mode, geoContext = '', variant = 'full') {
  const sorted = headlines.slice(0, 8).sort().join('|');
  const geoHash = geoContext ? ':g' + hashString(geoContext).slice(0, 6) : '';
  const hash = hashString(`${mode}:${sorted}`);
  // Include variant and version to prevent cross-site cache collisions
  return `summary:${CACHE_VERSION}:${variant}:${hash}${geoHash}`;
}

// Simple hash function for cache keys
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Deduplicate similar headlines (same story from different sources)
function deduplicateHeadlines(headlines) {
  const seen = new Set();
  const unique = [];

  for (const headline of headlines) {
    // Normalize: lowercase, remove punctuation, collapse whitespace
    const normalized = headline.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract key words (4+ chars) for similarity check
    const words = new Set(normalized.split(' ').filter(w => w.length >= 4));

    // Check if this headline is too similar to any we've seen
    let isDuplicate = false;
    for (const seenWords of seen) {
      const intersection = [...words].filter(w => seenWords.has(w));
      const similarity = intersection.length / Math.min(words.size, seenWords.size);
      if (similarity > 0.6) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(words);
      unique.push(headline);
    }
  }

  return unique;
}

function getClientIp(req) {
  return req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';
}

export default async function handler(request) {
  const corsHeaders = getCorsHeaders(request, 'POST, OPTIONS');

  if (request.method === 'OPTIONS') {
    if (isDisallowedOrigin(request)) {
      return empty(403, corsHeaders);
    }
    return empty(204, corsHeaders);
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', {
      status: 405,
      code: 'method_not_allowed',
      corsHeaders,
    });
  }

  if (isDisallowedOrigin(request)) {
    return jsonError('Origin not allowed', {
      status: 403,
      code: 'origin_not_allowed',
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
    return jsonBody({ error: 'Groq API key not configured', fallback: true }, {
      status: 503,
      corsHeaders,
    });
  }

  try {
    const { headlines, mode = 'brief', geoContext = '', variant = 'full' } = await request.json();

    if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
      return jsonError('Headlines array required', {
        status: 400,
        code: 'invalid_headlines',
        corsHeaders,
      });
    }

    // Check Redis cache first
    const redisClient = getRedis();
    const cacheKey = getCacheKey(headlines, mode, geoContext, variant);

    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached && typeof cached === 'object' && cached.summary) {
          console.log('[Groq] Cache hit:', cacheKey);
          return jsonOk({
            summary: cached.summary,
            model: cached.model || MODEL,
            provider: 'cache',
            cached: true,
          }, {
            status: 200,
            corsHeaders,
          });
        }
      } catch (cacheError) {
        console.warn('[Groq] Cache read error:', cacheError.message);
      }
    }

    // Deduplicate similar headlines (same story from multiple sources)
    const uniqueHeadlines = deduplicateHeadlines(headlines.slice(0, 8));
    const headlineText = uniqueHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n');

    let systemPrompt, userPrompt;

    // Include intelligence synthesis context in prompt if available
    const intelSection = geoContext ? `\n\n${geoContext}` : '';

    // Current date context for LLM (models may have outdated knowledge)
    const isTechVariant = variant === 'tech';
    const dateContext = `Current date: ${new Date().toISOString().split('T')[0]}.${isTechVariant ? '' : ' Donald Trump is the current US President (second term, inaugurated Jan 2025).'}`;

    if (mode === 'brief') {
      if (isTechVariant) {
        // Tech variant: focus on startups, AI, funding, product launches
        systemPrompt = `${dateContext}

Summarize the key tech/startup development in 2-3 sentences.
Rules:
- Focus ONLY on technology, startups, AI, funding, product launches, or developer news
- IGNORE political news, trade policy, tariffs, government actions unless directly about tech regulation
- Lead with the company/product/technology name
- Start directly: "OpenAI announced...", "A new $50M Series B...", "GitHub released..."
- No bullet points, no meta-commentary`;
      } else {
        // Full variant: geopolitical focus
        systemPrompt = `${dateContext}

Summarize the key development in 2-3 sentences.
Rules:
- Lead with WHAT happened and WHERE - be specific
- NEVER start with "Breaking news", "Good evening", "Tonight", or TV-style openings
- Start directly with the subject: "Iran's regime...", "The US Treasury...", "Protests in..."
- CRITICAL FOCAL POINTS are the main actors - mention them by name
- If focal points show news + signals convergence, that's the lead
- No bullet points, no meta-commentary`;
      }
      userPrompt = `Summarize the top story:\n${headlineText}${intelSection}`;
    } else if (mode === 'analysis') {
      if (isTechVariant) {
        systemPrompt = `${dateContext}

Analyze the tech/startup trend in 2-3 sentences.
Rules:
- Focus ONLY on technology implications: funding trends, AI developments, market shifts, product strategy
- IGNORE political implications, trade wars, government unless directly about tech policy
- Lead with the insight for tech industry
- Connect to startup ecosystem, VC trends, or technical implications`;
      } else {
        systemPrompt = `${dateContext}

Provide analysis in 2-3 sentences. Be direct and specific.
Rules:
- Lead with the insight - what's significant and why
- NEVER start with "Breaking news", "Tonight", "The key/dominant narrative is"
- Start with substance: "Iran faces...", "The escalation in...", "Multiple signals suggest..."
- CRITICAL FOCAL POINTS are your main actors - explain WHY they matter
- If focal points show news-signal correlation, flag as escalation
- Connect dots, be specific about implications`;
      }
      userPrompt = isTechVariant
        ? `What's the key tech trend or development?\n${headlineText}${intelSection}`
        : `What's the key pattern or risk?\n${headlineText}${intelSection}`;
    } else {
      systemPrompt = isTechVariant
        ? `${dateContext}\n\nSynthesize tech news in 2 sentences. Focus on startups, AI, funding, products. Ignore politics unless directly about tech regulation.`
        : `${dateContext}\n\nSynthesize in 2 sentences max. Lead with substance. NEVER start with "Breaking news" or "Tonight" - just state the insight directly. CRITICAL focal points with news-signal convergence are significant.`;
      userPrompt = `Key takeaway:\n${headlineText}${intelSection}`;
    }

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Groq] API error:', response.status, errorText);

      // Return fallback signal for rate limiting
      if (response.status === 429) {
        return jsonBody({ error: 'Rate limited', fallback: true }, {
          status: 429,
          corsHeaders,
        });
      }

      return jsonBody({ error: 'Groq API error', fallback: true }, {
        status: response.status,
        corsHeaders,
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return jsonBody({ error: 'Empty response', fallback: true }, {
        status: 500,
        corsHeaders,
      });
    }

    // Store in Redis cache
    if (redisClient) {
      try {
        await redisClient.set(cacheKey, {
          summary,
          model: MODEL,
          timestamp: Date.now(),
        }, { ex: CACHE_TTL_SECONDS });
        console.log('[Groq] Cached:', cacheKey);
      } catch (cacheError) {
        console.warn('[Groq] Cache write error:', cacheError.message);
      }
    }

    return jsonOk({
      summary,
      model: MODEL,
      provider: 'groq',
      cached: false,
      tokens: data.usage?.total_tokens || 0,
    }, {
      status: 200,
      corsHeaders,
      cacheControl: 'public, max-age=1800',
    });

  } catch (error) {
    if (error instanceof Error) {
      console.error('[Groq] Error:', error.name, error.message, error.stack?.split('\n')[1]);
    } else {
      console.error('[Groq] Error:', String(error));
    }
    return jsonBody({
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.name : 'UnknownError',
      fallback: true
    }), {
      status: 500,
      corsHeaders,
    });
  }
}
