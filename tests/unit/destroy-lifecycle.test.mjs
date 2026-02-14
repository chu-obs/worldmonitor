import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './_ts-module-loader.mjs';

const DESTROY_FLOW_TS = new URL('../../src/app/lifecycle/destroy.ts', import.meta.url);

test('destroyAppResourcesFlow clears timers, listeners, and resources', async () => {
  const { destroyAppResourcesFlow } = await loadTsModule(DESTROY_FLOW_TS);

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalClearInterval = globalThis.clearInterval;
  const originalClearTimeout = globalThis.clearTimeout;

  const removedDocumentEvents = [];
  const removedWindowEvents = [];
  const clearedIntervals = [];
  const clearedTimeouts = [];

  globalThis.document = {
    removeEventListener: (name, handler) => {
      removedDocumentEvents.push({ name, handler });
    },
  };

  globalThis.window = {
    removeEventListener: (name, handler) => {
      removedWindowEvents.push({ name, handler });
    },
  };

  globalThis.clearInterval = (id) => {
    clearedIntervals.push(id);
  };

  globalThis.clearTimeout = (id) => {
    clearedTimeouts.push(id);
  };

  const callbacks = {
    keydown: () => {},
    fullscreen: () => {},
    resize: () => {},
    visibility: () => {},
    idleReset: () => {},
  };

  let mapDestroyed = false;
  let refreshCancelled = false;
  let aisDisconnected = false;

  try {
    const result = destroyAppResourcesFlow({
      timeIntervalId: 101,
      snapshotIntervalId: 202,
      idleTimeoutId: 303,
      boundKeydownHandler: callbacks.keydown,
      boundFullscreenHandler: callbacks.fullscreen,
      boundResizeHandler: callbacks.resize,
      boundVisibilityHandler: callbacks.visibility,
      boundIdleResetHandler: callbacks.idleReset,
      idleActivityEvents: ['mousemove', 'keydown'],
      map: {
        destroy: () => {
          mapDestroyed = true;
        },
      },
      cancelRefreshes: () => {
        refreshCancelled = true;
      },
      disconnectAis: () => {
        aisDisconnected = true;
      },
    });

    assert.deepEqual(clearedIntervals.sort(), [101, 202]);
    assert.deepEqual(clearedTimeouts, [303]);
    assert.equal(refreshCancelled, true);
    assert.equal(mapDestroyed, true);
    assert.equal(aisDisconnected, true);

    assert.equal(removedWindowEvents.length, 1);
    assert.equal(removedWindowEvents[0].name, 'resize');

    const docEventNames = removedDocumentEvents.map((event) => event.name);
    assert.ok(docEventNames.includes('keydown'));
    assert.ok(docEventNames.includes('fullscreenchange'));
    assert.ok(docEventNames.includes('visibilitychange'));
    assert.ok(docEventNames.includes('mousemove'));

    assert.deepEqual(result, {
      timeIntervalId: null,
      snapshotIntervalId: null,
      idleTimeoutId: null,
      boundKeydownHandler: null,
      boundFullscreenHandler: null,
      boundResizeHandler: null,
      boundVisibilityHandler: null,
      boundIdleResetHandler: null,
    });
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    globalThis.clearInterval = originalClearInterval;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
