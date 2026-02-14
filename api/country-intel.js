/**
 * Country Intelligence Brief Endpoint
 * Generates AI-powered country situation briefs using Groq
 * Redis cached (2h TTL) for cross-user deduplication
 */

import { Redis } from '@upstash/redis';
import { getCorsHeaders, isDisallowedOrigin } from './_cors.js';
import { createIpRateLimiter } from './_ip-rate-limit.js';
import { empty, jsonError, jsonOk } from './_response.js';

export const config = {
  runtime: 'edge',
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';
const CACHE_TTL_SECONDS = 7200; // 2 hours
const CACHE_VERSION = 'ci-v2';
const RATE_LIMIT = 12; // requests
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_RETRY_AFTER_SECONDS = Math.ceil(RATE_WINDOW_MS / 1000);
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
      console.warn('[CountryIntel] Redis init failed:', err.message);
      redisInitFailed = true;
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
    return jsonError('Rate limited', {
      status: 429,
      code: 'rate_limited',
      corsHeaders,
      extraHeaders: {
        'Retry-After': String(RATE_RETRY_AFTER_SECONDS),
      },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonError('Groq API key not configured', {
      status: 503,
      code: 'missing_api_key',
      details: { fallback: true },
      corsHeaders,
    });
  }

  try {
    const { country, code, context } = await request.json();

    if (!country || !code) {
      return jsonError('country and code required', {
        status: 400,
        code: 'missing_country_or_code',
        corsHeaders,
      });
    }

    // Cache key includes country code + context hash (context changes as data updates)
    const contextHash = context ? hashString(JSON.stringify(context)).slice(0, 8) : 'no-ctx';
    const cacheKey = `${CACHE_VERSION}:${code}:${contextHash}`;

    const redisClient = getRedis();
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached && typeof cached === 'object' && cached.brief) {
          console.log('[CountryIntel] Cache hit:', code);
          return jsonOk({ ...cached, cached: true }, {
            status: 200,
            corsHeaders,
          });
        }
      } catch (e) {
        console.warn('[CountryIntel] Cache read error:', e.message);
      }
    }

    // Build data context section
    const dataLines = [];
    if (context?.score != null) {
      const changeStr = context.change24h ? ` (${context.change24h > 0 ? '+' : ''}${context.change24h} in 24h)` : '';
      dataLines.push(`Instability Score: ${context.score}/100 (${context.level || 'unknown'}) — trend: ${context.trend || 'unknown'}${changeStr}`);
    }
    if (context?.components) {
      const c = context.components;
      dataLines.push(`Score Components: Unrest ${c.unrest ?? '?'}/100, Security ${c.security ?? '?'}/100, Information ${c.information ?? '?'}/100`);
    }
    if (context?.protests != null) dataLines.push(`Active protests in/near country (7d): ${context.protests}`);
    if (context?.militaryFlights != null) dataLines.push(`Military aircraft detected in/near country: ${context.militaryFlights}`);
    if (context?.militaryVessels != null) dataLines.push(`Military vessels detected in/near country: ${context.militaryVessels}`);
    if (context?.outages != null) dataLines.push(`Internet outages: ${context.outages}`);
    if (context?.earthquakes != null) dataLines.push(`Recent earthquakes: ${context.earthquakes}`);
    if (context?.stockIndex) dataLines.push(`Stock Market Index: ${context.stockIndex}`);
    if (context?.convergenceScore != null) {
      dataLines.push(`Signal convergence score: ${context.convergenceScore}/100 (multiple signal types detected: ${(context.signalTypes || []).join(', ')})`);
    }
    if (context?.regionalConvergence?.length > 0) {
      dataLines.push(`\nRegional convergence alerts:`);
      context.regionalConvergence.forEach(r => dataLines.push(`- ${r}`));
    }
    if (context?.headlines?.length > 0) {
      dataLines.push(`\nRecent headlines mentioning ${country} (${context.headlines.length} found):`);
      context.headlines.slice(0, 15).forEach((h, i) => dataLines.push(`${i + 1}. ${h}`));
    }

    const dataSection = dataLines.length > 0
      ? `\nCURRENT SENSOR DATA:\n${dataLines.join('\n')}`
      : '\nNo real-time sensor data available for this country.';

    const dateStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a senior intelligence analyst providing comprehensive country situation briefs. Current date: ${dateStr}. Donald Trump is the current US President (second term, inaugurated Jan 2025).

Write a thorough, data-driven intelligence brief for the requested country. Structure:

1. **Current Situation** — What is happening right now. Reference specific data: instability scores, protest counts, military presence, outages. Explain what the numbers mean in context.

2. **Military & Security Posture** — Analyze military activity in/near the country. What forces are present? What does the positioning suggest? What are foreign nations doing in this theater?

3. **Key Risk Factors** — What drives instability or stability. Connect the dots between different signals (protests + outages = potential crackdown? military buildup + diplomatic tensions = escalation risk?). Reference specific headlines.

4. **Regional Context** — How does this country's situation affect or relate to its neighbors and the broader region? Reference any convergence alerts.

5. **Outlook & Watch Items** — What to monitor in the near term. Be specific about indicators that would signal escalation or de-escalation.

Rules:
- Be specific and analytical. Reference the data provided (scores, counts, headlines, convergence).
- If data shows low activity, say so — don't manufacture threats.
- Connect signals: explain what combinations of data points suggest.
- 5-6 paragraphs, 300-400 words.
- No speculation beyond what the data supports.
- Use plain language, not jargon.
- If military assets are 0, don't speculate about military presence — say monitoring shows no current military activity.`;

    const userPrompt = `Country: ${country} (${code})${dataSection}`;

    const groqRes = await fetch(GROQ_API_URL, {
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
        temperature: 0.4,
        max_tokens: 900,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[CountryIntel] Groq error:', groqRes.status, errText);
      return jsonError('AI service error', {
        status: 502,
        code: 'upstream_ai_error',
        details: { fallback: true },
        corsHeaders,
      });
    }

    const groqData = await groqRes.json();
    const brief = groqData.choices?.[0]?.message?.content || '';

    const result = {
      brief,
      country,
      code,
      model: MODEL,
      generatedAt: new Date().toISOString(),
    };

    // Cache result
    if (redisClient && brief) {
      try {
        await redisClient.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
        console.log('[CountryIntel] Cached:', code);
      } catch (e) {
        console.warn('[CountryIntel] Cache write error:', e.message);
      }
    }

    return jsonOk(result, {
      status: 200,
      corsHeaders,
    });
  } catch (err) {
    console.error('[CountryIntel] Error:', err);
    return jsonError('Internal error', {
      status: 500,
      code: 'internal_error',
      details: err instanceof Error ? err.message : String(err),
      corsHeaders,
    });
  }
}
