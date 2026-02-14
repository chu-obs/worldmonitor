import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './_ts-module-loader.mjs';

const POPUP_TRIGGERS_TS = new URL('../../src/components/map/shared/popup-triggers.ts', import.meta.url);

test('getPolylineMidpoint returns center point using floor index', async () => {
  const { getPolylineMidpoint } = await loadTsModule(POPUP_TRIGGERS_TS);

  assert.equal(getPolylineMidpoint([]), null);
  assert.deepEqual(getPolylineMidpoint([[1, 2]]), [1, 2]);
  assert.deepEqual(getPolylineMidpoint([[0, 0], [1, 1], [2, 2]]), [1, 1]);
  assert.deepEqual(getPolylineMidpoint([[0, 0], [1, 1], [2, 2], [3, 3]]), [2, 2]);
});

test('triggerEntityPopup strict mode requires a projected position', async () => {
  const { triggerEntityPopup } = await loadTsModule(POPUP_TRIGGERS_TS);
  const events = [];

  triggerEntityPopup({
    id: 'a',
    items: [{ id: 'a', pos: [10, 20] }],
    getId: (item) => item.id,
    getPosition: (item) => item.pos,
    getRelatedData: () => ['news-1'],
    onShow: (item, position, related) => {
      events.push({ item: item.id, position, related });
    },
  });

  triggerEntityPopup({
    id: 'b',
    items: [{ id: 'b', pos: null }],
    getId: (item) => item.id,
    getPosition: (item) => item.pos,
    onShow: () => {
      events.push({ item: 'unexpected' });
    },
  });

  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    item: 'a',
    position: [10, 20],
    related: ['news-1'],
  });
});

test('triggerEntityPopup lenient mode supports missing position and onShown callback', async () => {
  const { triggerEntityPopup } = await loadTsModule(POPUP_TRIGGERS_TS);
  let shownId = null;
  const events = [];

  triggerEntityPopup({
    id: 'x',
    items: [{ id: 'x' }],
    getId: (item) => item.id,
    getPosition: () => null,
    allowMissingPosition: true,
    onShow: (item, position) => {
      events.push({ id: item.id, position });
    },
    onShown: (item) => {
      shownId = item.id;
    },
  });

  assert.deepEqual(events, [{ id: 'x', position: null }]);
  assert.equal(shownId, 'x');
});
