import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './_ts-module-loader.mjs';

const DATA_FRESHNESS_TS = new URL('../../src/services/data-freshness.ts', import.meta.url);

test('data freshness transitions by elapsed time window', async () => {
  const { dataFreshness } = await loadTsModule(DATA_FRESHNESS_TS);
  const previousNow = Date.now;

  dataFreshness.recordUpdate('rss', 4);
  const source = dataFreshness.getSource('rss');
  assert.ok(source);
  source.lastUpdate = new Date(0);

  try {
    Date.now = () => 10 * 60 * 1000;
    assert.equal(dataFreshness.getSource('rss').status, 'fresh');

    Date.now = () => 20 * 60 * 1000;
    assert.equal(dataFreshness.getSource('rss').status, 'stale');

    Date.now = () => 3 * 60 * 60 * 1000;
    assert.equal(dataFreshness.getSource('rss').status, 'very_stale');

    Date.now = () => 7 * 60 * 60 * 1000;
    assert.equal(dataFreshness.getSource('rss').status, 'no_data');
  } finally {
    Date.now = previousNow;
  }
});

test('risk coverage summary and intelligence gaps react to failures', async () => {
  const { dataFreshness, getIntelligenceGaps, hasCriticalGaps } = await loadTsModule(DATA_FRESHNESS_TS);

  assert.equal(dataFreshness.getSummary().overallStatus, 'insufficient');

  dataFreshness.recordUpdate('gdelt', 5);
  dataFreshness.recordUpdate('rss', 5);
  assert.equal(dataFreshness.getSummary().overallStatus, 'sufficient');

  dataFreshness.recordError('rss', 'timeout');
  const summary = dataFreshness.getSummary();
  assert.equal(summary.overallStatus, 'limited');
  assert.equal(summary.errorSources, 1);

  const gaps = getIntelligenceGaps();
  assert.ok(gaps.some(gap => gap.source === 'rss' && gap.severity === 'critical'));
  assert.equal(hasCriticalGaps(), true);
});
