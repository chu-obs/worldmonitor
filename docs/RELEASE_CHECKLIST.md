# Release Checklist

## 1. Build and Test Gate

1. `npm run test:unit` passes.
2. `npm run typecheck` passes.
3. `npm run build` passes for current variant.
4. `npm run check:bundle-budget` passes after each production build.
5. Optional release-grade integration checks:
   - `npm run test:e2e:full`
   - `npm run test:e2e:tech`

## 2. Variant Validation

1. Validate `full` and `tech` variant startup/load paths.
2. Confirm variant metadata (title/description/canonical URL) is correct after build.
3. Confirm variant-specific panel/layer defaults match expected behavior.

## 3. API Contract Guardrail

1. Verify `docs/API_CONTRACT_MATRIX.md` is updated for any endpoint changes.
2. Confirm endpoint method guards and CORS mode are unchanged or intentionally updated.
3. Confirm error payload shape remains compatible (`error`, `code`, fallback semantics where applicable).
4. Confirm rate-limited endpoints still emit expected status and retry headers.

## 4. Cache and Data Freshness

1. Check cache key/version changes are documented (if any).
2. Validate TTL changes against expected refresh cadence.
3. Confirm data freshness updates still occur for key sources:
   - `rss`
   - `gdelt`
   - `polymarket`
   - intelligence and environmental sources

## 5. Map and Interaction Regression

1. Verify map render on desktop (DeckGL) and mobile/fallback (SVG).
2. Validate key popup trigger paths:
   - hotspot/conflict/base/pipeline/cable/datacenter/nuclear/irradiator.
3. Validate layer toggle states:
   - checked/active/loading/ready/hidden behavior.
4. Validate country hover/highlight/click path.
5. Validate map URL sync and share-link generation.

## 6. Performance Checkpoints

1. Compare bundle output against `docs/PERFORMANCE_BASELINE.md`.
2. Review new chunking output for unexpected regressions.
3. Run `npm run check:bundle-budget` and verify thresholds:
   - `index-*.js` <= 520 KB
   - `app-map-*.js` <= 620 KB
   - `vendor-deckgl-*.js` <= 900 KB
   - `vendor-maplibre-*.js` <= 1100 KB
4. Check that known third-party warnings have not increased.

## 7. Deployment and Runtime Sanity

1. Smoke test primary dashboards after deploy.
2. Confirm critical feeds return data (news, markets, predictions, intelligence).
3. Confirm alerting/signal modal paths work under real data.
4. Confirm service-status style panels render and update.

## 8. Rollback Notes

1. Keep prior release artifact/version available for immediate rollback.
2. If API contract changes are included, document compatibility fallback path.
3. If cache key migrations are included, document expected warmup/recovery window.
