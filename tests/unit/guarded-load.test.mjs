import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './_ts-module-loader.mjs';

const GUARDED_LOAD_TS = new URL('../../src/app/data/guarded-load.ts', import.meta.url);

test('runGuardedTasks reports task errors and clears in-flight state', async () => {
  const { runGuardedTasks } = await loadTsModule(GUARDED_LOAD_TS);
  const inFlight = new Set();
  const errors = [];
  const execution = [];

  await runGuardedTasks({
    inFlight,
    tasks: [
      {
        name: 'news',
        task: async () => {
          execution.push('news');
        },
      },
      {
        name: 'markets',
        task: async () => {
          execution.push('markets');
          throw new Error('boom');
        },
      },
    ],
    onTaskError: (name, error) => {
      errors.push({ name, message: String(error) });
    },
  });

  assert.deepEqual(execution.sort(), ['markets', 'news']);
  assert.equal(inFlight.size, 0);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].name, 'markets');
  assert.match(errors[0].message, /boom/);
});

test('runGuardedTasks skips tasks that are already in-flight', async () => {
  const { runGuardedTasks } = await loadTsModule(GUARDED_LOAD_TS);
  const inFlight = new Set(['natural']);
  let executed = false;

  await runGuardedTasks({
    inFlight,
    tasks: [
      {
        name: 'natural',
        task: async () => {
          executed = true;
        },
      },
    ],
  });

  assert.equal(executed, false);
  assert.deepEqual(Array.from(inFlight), ['natural']);
});
