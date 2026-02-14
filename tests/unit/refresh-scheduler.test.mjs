import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './_ts-module-loader.mjs';

const REFRESH_SCHEDULER_TS = new URL('../../src/app/data/refresh-scheduler.ts', import.meta.url);

test('refresh scheduler runs task and re-schedules safely', async () => {
  const { RefreshScheduler } = await loadTsModule(REFRESH_SCHEDULER_TS);
  const prevSetTimeout = globalThis.setTimeout;
  const prevClearTimeout = globalThis.clearTimeout;
  const prevRandom = Math.random;

  const pending = new Map();
  let id = 0;
  globalThis.setTimeout = (fn) => {
    id += 1;
    pending.set(id, fn);
    return id;
  };
  globalThis.clearTimeout = (timeoutId) => {
    pending.delete(timeoutId);
  };
  Math.random = () => 0.5;

  try {
    const inFlight = new Set();
    const scheduler = new RefreshScheduler({
      inFlight,
      isDestroyed: () => false,
    });

    let runs = 0;
    scheduler.schedule('news', async () => {
      runs += 1;
    }, 5_000);

    assert.equal(pending.size, 1);
    const [firstId, firstRun] = Array.from(pending.entries())[0];
    pending.delete(firstId);
    await firstRun();

    assert.equal(runs, 1);
    assert.equal(inFlight.has('news'), false);
    assert.equal(pending.size, 1);

    scheduler.cancelAll();
    assert.equal(pending.size, 0);
  } finally {
    globalThis.setTimeout = prevSetTimeout;
    globalThis.clearTimeout = prevClearTimeout;
    Math.random = prevRandom;
  }
});

test('refresh scheduler respects disabled conditions', async () => {
  const { RefreshScheduler } = await loadTsModule(REFRESH_SCHEDULER_TS);
  const prevSetTimeout = globalThis.setTimeout;
  const prevClearTimeout = globalThis.clearTimeout;
  const prevRandom = Math.random;

  const pending = new Map();
  let id = 0;
  globalThis.setTimeout = (fn) => {
    id += 1;
    pending.set(id, fn);
    return id;
  };
  globalThis.clearTimeout = (timeoutId) => {
    pending.delete(timeoutId);
  };
  Math.random = () => 0.5;

  try {
    const scheduler = new RefreshScheduler({
      inFlight: new Set(),
      isDestroyed: () => false,
    });

    let runs = 0;
    scheduler.schedule('ais', async () => {
      runs += 1;
    }, 5_000, () => false);

    const [runId, run] = Array.from(pending.entries())[0];
    pending.delete(runId);
    await run();
    assert.equal(runs, 0);
    assert.equal(pending.size, 1);

    scheduler.cancelAll();
    assert.equal(pending.size, 0);
  } finally {
    globalThis.setTimeout = prevSetTimeout;
    globalThis.clearTimeout = prevClearTimeout;
    Math.random = prevRandom;
  }
});
