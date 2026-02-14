import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './_ts-module-loader.mjs';

const LAYER_LOAD_DISPATCH_TS = new URL('../../src/app/data/layer-load-dispatch.ts', import.meta.url);

function createActions(calls) {
  const mark = (name) => async () => {
    calls.push(name);
  };

  return {
    loadNatural: mark('natural'),
    loadFirmsData: mark('firms'),
    loadWeatherAlerts: mark('weather'),
    loadOutages: mark('outages'),
    loadAisSignals: mark('ais'),
    loadCableActivity: mark('cables'),
    loadProtests: mark('protests'),
    loadFlightDelays: mark('flights'),
    loadMilitary: mark('military'),
    loadTechEvents: mark('techEvents'),
    loadIntelligenceSignals: mark('intelligence'),
  };
}

test('dispatchLayerLoad routes concrete layers to expected loaders', async () => {
  const { dispatchLayerLoad } = await loadTsModule(LAYER_LOAD_DISPATCH_TS);
  const calls = [];
  const actions = createActions(calls);

  await dispatchLayerLoad('natural', actions);
  await dispatchLayerLoad('weather', actions);
  await dispatchLayerLoad('fires', actions);
  await dispatchLayerLoad('military', actions);
  await dispatchLayerLoad('techEvents', actions);

  assert.deepEqual(calls, ['natural', 'weather', 'firms', 'military', 'techEvents']);
});

test('dispatchLayerLoad uses intelligence loader for grouped layers', async () => {
  const { dispatchLayerLoad } = await loadTsModule(LAYER_LOAD_DISPATCH_TS);
  const calls = [];
  const actions = createActions(calls);

  await dispatchLayerLoad('ucdpEvents', actions);
  await dispatchLayerLoad('displacement', actions);
  await dispatchLayerLoad('climate', actions);

  assert.deepEqual(calls, ['intelligence', 'intelligence', 'intelligence']);
});

test('dispatchLayerLoad ignores unmapped layers', async () => {
  const { dispatchLayerLoad } = await loadTsModule(LAYER_LOAD_DISPATCH_TS);
  const calls = [];
  const actions = createActions(calls);

  await dispatchLayerLoad('markets', actions);
  assert.equal(calls.length, 0);
});
