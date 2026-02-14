import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './_ts-module-loader.mjs';

const TEMPORAL_BASELINE_TS = new URL('../../src/services/temporal-baseline.ts', import.meta.url);

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('checkAnomaly returns null when baseline API is unavailable', async () => {
  const { checkAnomaly } = await loadTsModule(TEMPORAL_BASELINE_TS);
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ error: 'unavailable' }, 503);

  try {
    const anomaly = await checkAnomaly('news', 'global', 10);
    assert.equal(anomaly, null);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('updateAndCheck sorts anomalies and keeps fallback-safe behavior', async () => {
  const { updateAndCheck } = await loadTsModule(TEMPORAL_BASELINE_TS);
  const prevFetch = globalThis.fetch;
  let postCalls = 0;

  globalThis.fetch = async (input, init) => {
    if (init?.method === 'POST') {
      postCalls++;
      return jsonResponse({ updated: 3 }, 200);
    }

    const url = new URL(String(input), 'https://example.com');
    const type = url.searchParams.get('type');

    if (type === 'military_flights') {
      return jsonResponse({
        anomaly: { zScore: 3.2, multiplier: 3.8 },
        baseline: { mean: 5.1 },
      }, 200);
    }

    if (type === 'news') {
      return jsonResponse({
        anomaly: { zScore: 2.1, multiplier: 2.4 },
        baseline: { mean: 10.3 },
      }, 200);
    }

    return jsonResponse({ anomaly: null, baseline: { mean: 12.0 } }, 200);
  };

  try {
    const anomalies = await updateAndCheck([
      { type: 'news', region: 'global', count: 21 },
      { type: 'vessels', region: 'global', count: 10 },
      { type: 'military_flights', region: 'global', count: 19 },
    ]);

    assert.equal(postCalls, 1);
    assert.equal(anomalies.length, 2);
    assert.equal(anomalies[0].type, 'military_flights');
    assert.equal(anomalies[0].severity, 'critical');
    assert.equal(anomalies[1].type, 'news');
    assert.equal(anomalies[1].severity, 'high');
    assert.match(anomalies[1].message, /News velocity/);
  } finally {
    globalThis.fetch = prevFetch;
  }
});
