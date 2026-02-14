# Performance Baseline

Date: 2026-02-14

## Commands

1. `npm run build`
2. `npm run typecheck`
3. `npm run test:unit`

## Build Snapshot

From `npm run build`:

1. Build toolchain: Vite 6.4.1 + TypeScript.
2. Transformed modules: 1479.
3. Build completion time: ~4.25s.
4. Main bundle (`dist/assets/index-*.js`): ~2.90 MB (gzip ~783 KB).
5. CSS bundle (`dist/assets/index-*.css`): ~237 KB (gzip ~38 KB).
6. Worker bundles:
   - `ml.worker-*.js`: ~820 KB
   - `analysis.worker-*.js`: ~26 KB

## Current Warnings

1. `onnxruntime-web` minified bundle uses `eval` (third-party warning).
2. `@loaders.gl/worker-utils` browser external warning for `spawn`.
3. Chunk size warning: one or more bundles exceed 500 KB.

## Runtime/Refactor Context Metrics

Current high-impact file sizes:

1. `src/components/DeckGLMap.ts`: 1747 lines.
2. `src/components/Map.ts`: 2161 lines.
3. `src/App.ts`: 439 lines.

Current unit test count:

1. `npm run test:unit`: 23 passing tests.

## Optimization Candidates (Phase 6)

1. Split static + dynamic imports around `data-freshness` call-sites to remove mixed-import warning.
2. Introduce manual chunking for heavy map/services groups.
3. Evaluate deferred loading for low-frequency UI/panel code paths.
4. Track map update cadence cost (`updateLayers`) and interaction latency under full-layer load.

## Phase 6 Pass 1 (Low-Risk)

Date: 2026-02-14

Change:

1. `src/services/rss.ts` switched from dynamic import of `data-freshness` to static import.

Result:

1. `data-freshness` mixed static/dynamic import warning removed from build output.
2. Remaining warnings:
   - `onnxruntime-web` `eval` warning (third-party)
   - loaders.gl `spawn` export warning (third-party/browser external)
   - chunk size > 500 KB warning

## Phase 6 Pass 2 (Manual Chunking - Initial)

Date: 2026-02-14

Changes:

1. Added first-pass `manualChunks` strategy in `vite.config.ts` for heavy vendor groups:
   - `vendor-deckgl`
   - `vendor-maplibre`
   - `vendor-d3`
   - `vendor-topojson`
2. Resolved initial circular chunk warning by co-locating `@loaders.gl` with `vendor-deckgl`.

Result (`npm run build`):

1. Output now split into multiple large vendor chunks instead of a single dominant app chunk.
2. Representative chunk sizes (pre-gzip):
   - `vendor-deckgl`: ~834 KB
   - `vendor-maplibre`: ~1017 KB
   - `index`: ~1041 KB
3. Removed warning:
   - Circular chunk warning for `vendor-loadersgl <-> vendor-deckgl`
4. Remaining warnings:
   - `onnxruntime-web` `eval` warning (third-party)
   - loaders.gl `spawn` export warning (third-party/browser external)
   - chunk size > 500 KB warning

## Phase 6 Pass 3 (App Map Chunk Split)

Date: 2026-02-14

Changes:

1. Extended `manualChunks(...)` to split local map-heavy source code into `app-map`:
   - `src/components/Map.ts`
   - `src/components/DeckGLMap.ts`
   - `src/components/MapContainer.ts`
   - `src/components/MapPopup.ts`
   - `src/components/map/*`

Result (`npm run build`):

1. Main app chunk reduced significantly:
   - `index-*`: ~1.04 MB -> ~479 KB (pre-gzip)
2. New map app chunk:
   - `app-map-*`: ~563 KB (pre-gzip)
3. Vendor chunk split retained:
   - `vendor-deckgl`: ~834 KB
   - `vendor-maplibre`: ~1017 KB
4. Remaining warnings:
   - `onnxruntime-web` `eval` warning (third-party)
   - loaders.gl `spawn` export warning (third-party/browser external)
   - chunk size > 500 KB warning (expected for large map vendor chunks)

## Phase 6 Pass 4 (Deferred Runtime Path)

Date: 2026-02-14

Changes:

1. Deferred-load non-critical sources modal flow:
   - `src/app/lifecycle/runtime-startup.ts`
   - `setupSourcesModal` callback now uses dynamic import of `app/layout/sources-modal`.

Result (`npm run build`):

1. New async chunk emitted:
   - `sources-modal-*.js` (~2.5 KB pre-gzip)
2. Main chunk reduced slightly:
   - `index-*` from ~479.46 KB to ~477.75 KB (pre-gzip)
3. Remaining warnings unchanged:
   - `onnxruntime-web` `eval` warning (third-party)
   - loaders.gl `spawn` export warning (third-party/browser external)
   - chunk size > 500 KB warning

## Phase 6 Pass 5 (Bundle Budget Policy + Gate)

Date: 2026-02-14

Changes:

1. Added executable bundle budget gate:
   - `scripts/check-bundle-budget.mjs`
   - `npm run check:bundle-budget`
2. Defined chunk budget policy:
   - `index-*.js` <= 520 KB
   - `app-map-*.js` <= 620 KB
   - `vendor-deckgl-*.js` <= 900 KB
   - `vendor-maplibre-*.js` <= 1100 KB
   - `sources-modal-*.js` <= 6 KB
3. Updated release checklist to include the budget gate.

Result:

1. `npm run build:full && npm run check:bundle-budget` passes.
2. `npm run build:tech && npm run check:bundle-budget` passes.
3. Known third-party warnings unchanged:
   - `onnxruntime-web` `eval` warning (third-party)
   - loaders.gl `spawn` export warning (third-party/browser external)
