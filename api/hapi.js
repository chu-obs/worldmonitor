// HDX HAPI (Humanitarian API) proxy
// Returns aggregated conflict event counts per country
// Source: ACLED data aggregated monthly by HDX
export const config = { runtime: 'edge' };

import { getCachedJson, setCachedJson } from './_upstash-cache.js';
import { recordCacheTelemetry } from './_cache-telemetry.js';
import { getWildcardCorsHeaders } from './_cors.js';
import { empty, jsonBody } from './_response.js';

const CACHE_KEY = 'hapi:conflict-events:v2';
const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
const RESPONSE_CACHE_CONTROL = 'public, max-age=1800';

// In-memory fallback when Redis is unavailable.
let fallbackCache = { data: null, timestamp: 0 };

function isValidResult(data) {
  return Boolean(
    data &&
    typeof data === 'object' &&
    Array.isArray(data.countries)
  );
}

function toErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || 'unknown error');
}

export default async function handler(req) {
  const corsHeaders = getWildcardCorsHeaders('GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return empty(204, corsHeaders);
  }

  if (req.method !== 'GET') {
    return jsonBody({ error: 'Method not allowed' }, {
      status: 405,
      corsHeaders,
    });
  }

  const now = Date.now();
  const cached = await getCachedJson(CACHE_KEY);
  if (isValidResult(cached)) {
    recordCacheTelemetry('/api/hapi', 'REDIS-HIT');
    return jsonBody(cached, {
      status: 200,
      corsHeaders,
      cacheControl: RESPONSE_CACHE_CONTROL,
      extraHeaders: {
        'X-Cache': 'REDIS-HIT',
      },
    });
  }

  if (isValidResult(fallbackCache.data) && now - fallbackCache.timestamp < CACHE_TTL_MS) {
    recordCacheTelemetry('/api/hapi', 'MEMORY-HIT');
    return jsonBody(fallbackCache.data, {
      status: 200,
      corsHeaders,
      cacheControl: RESPONSE_CACHE_CONTROL,
      extraHeaders: {
        'X-Cache': 'MEMORY-HIT',
      },
    });
  }

  try {
    const appId = btoa('worldmonitor:monitor@worldmonitor.app');
    const response = await fetch(
      `https://hapi.humdata.org/api/v2/coordination-context/conflict-events?output_format=json&limit=1000&offset=0&app_identifier=${appId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HAPI API error: ${response.status}`);
    }

    const rawData = await response.json();
    const records = rawData.data || [];

    // Each record is (country, event_type, month) — aggregate across event types per country
    // Keep only the most recent month per country
    const byCountry = {};
    for (const r of records) {
      const iso3 = r.location_code || '';
      if (!iso3) continue;

      const month = r.reference_period_start || '';
      const eventType = (r.event_type || '').toLowerCase();
      const events = r.events || 0;
      const fatalities = r.fatalities || 0;

      if (!byCountry[iso3]) {
        byCountry[iso3] = { iso3, locationName: r.location_name || '', month, eventsTotal: 0, eventsPoliticalViolence: 0, eventsCivilianTargeting: 0, eventsDemonstrations: 0, fatalitiesTotalPoliticalViolence: 0, fatalitiesTotalCivilianTargeting: 0 };
      }

      const c = byCountry[iso3];
      if (month > c.month) {
        // Newer month — reset
        c.month = month;
        c.eventsTotal = 0; c.eventsPoliticalViolence = 0; c.eventsCivilianTargeting = 0; c.eventsDemonstrations = 0; c.fatalitiesTotalPoliticalViolence = 0; c.fatalitiesTotalCivilianTargeting = 0;
      }
      if (month === c.month) {
        c.eventsTotal += events;
        if (eventType.includes('political_violence')) { c.eventsPoliticalViolence += events; c.fatalitiesTotalPoliticalViolence += fatalities; }
        if (eventType.includes('civilian_targeting')) { c.eventsCivilianTargeting += events; c.fatalitiesTotalCivilianTargeting += fatalities; }
        if (eventType.includes('demonstration')) { c.eventsDemonstrations += events; }
      }
    }

    const result = {
      success: true,
      count: Object.keys(byCountry).length,
      countries: Object.values(byCountry),
      cached_at: new Date().toISOString(),
    };

    fallbackCache = { data: result, timestamp: now };
    void setCachedJson(CACHE_KEY, result, CACHE_TTL_SECONDS);
    recordCacheTelemetry('/api/hapi', 'MISS');

    return jsonBody(result, {
      status: 200,
      corsHeaders,
      cacheControl: RESPONSE_CACHE_CONTROL,
      extraHeaders: {
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    if (isValidResult(fallbackCache.data)) {
      recordCacheTelemetry('/api/hapi', 'STALE');
      return jsonBody(fallbackCache.data, {
        status: 200,
        corsHeaders,
        cacheControl: 'public, max-age=300',
        extraHeaders: {
          'X-Cache': 'STALE',
        },
      });
    }

    recordCacheTelemetry('/api/hapi', 'ERROR');
    return jsonBody({ error: `Fetch failed: ${toErrorMessage(error)}`, countries: [] }, {
      status: 500,
      corsHeaders,
    });
  }
}
