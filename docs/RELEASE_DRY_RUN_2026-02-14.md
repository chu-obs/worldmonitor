# Release Dry Run (2026-02-14)

Scope: Phase 6 release-hardening dry run for both `full` and `tech` variants.

## Executed Checks

1. Unit and static checks:
   - `npm run test:unit` (23/23 pass)
   - `npm run typecheck` (pass)
2. Variant build checks:
   - `npm run build:full` (pass)
   - `npm run build:tech` (pass)
3. Variant metadata verification from built `dist/index.html`:
   - `full`:
     - title: `World Monitor - Real-Time Global Intelligence Dashboard`
     - canonical: `https://worldmonitor.app/`
   - `tech`:
     - title: `Tech Monitor - Real-Time AI & Tech Industry Dashboard`
     - canonical: `https://tech.worldmonitor.app/`
4. Bundle budget policy checks:
   - `npm run check:bundle-budget` after `build:full` (pass)
   - `npm run check:bundle-budget` after `build:tech` (pass)
5. Playwright startup smoke checks:
   - `VITE_VARIANT=full npx playwright test -g "serves requested runtime variant for this test run"` (pass)
   - `VITE_VARIANT=tech npx playwright test -g "serves requested runtime variant for this test run"` (pass)

## Build Snapshot (Dry Run)

1. `full`:
   - `index-*`: ~477.75 KB
   - `app-map-*`: ~562.92 KB
   - `vendor-deckgl-*`: ~834.42 KB
   - `vendor-maplibre-*`: ~1016.54 KB
2. `tech`:
   - `index-*`: ~396.55 KB
   - `app-map-*`: ~571.92 KB
   - `vendor-deckgl-*`: ~834.42 KB
   - `vendor-maplibre-*`: ~1016.54 KB

## Known Warnings (Unchanged)

1. `onnxruntime-web` minified bundle uses `eval` (third-party warning).
2. `@loaders.gl/worker-utils` browser external warning for `spawn`.

## Notes

1. Map harness readiness was hardened for offline/flake scenarios by allowing a timeout fallback when canvas and camera are stable but `isStyleLoaded()` does not become true quickly.
2. Full e2e/visual suites were not part of this dry run; only startup smoke coverage was executed for release checklist validation.
