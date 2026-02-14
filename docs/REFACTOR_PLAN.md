# World Monitor Refactor Plan

## 1. Objectives

This plan focuses on high-impact engineering improvements while preserving existing product behavior:

1. Improve reliability and correctness in data ingestion and rendering.
2. Reduce maintenance risk from oversized modules and duplicated configuration.
3. Standardize backend API guardrails (CORS, rate limit, error contract, cache behavior).
4. Increase confidence with better automated checks and release discipline.

## 2. Current Risk Snapshot

Key risks observed in the current codebase:

1. Overloaded orchestration file: `src/App.ts` mixes UI composition, scheduling, data orchestration, and side effects.
2. Very large map implementations: `src/components/Map.ts` and `src/components/DeckGLMap.ts` combine many concerns in single files.
3. Config duplication and drift risk: panel/layer defaults are defined in multiple places.
4. API hardening is inconsistent: CORS/rate-limit/cache/error handling patterns vary across endpoints.
5. Test coverage is narrow: primarily one E2E suite (`e2e/map-harness.spec.ts`), limited service-level regression protection.

## 3. Refactor Strategy

Refactor in controlled phases with strict behavior preservation:

1. Low-risk correctness fixes first.
2. Contract standardization before large structural decomposition.
3. Incremental module extraction with no “big bang” rewrites.
4. Add guardrail tests before and during extraction.

## 4. Phased Plan

### Phase 0: Baseline and Guardrails

Scope:

1. Create and maintain this plan as execution tracker.
2. Establish a “no-regression” checklist per change batch (map load, feeds load, strategic panels, variant switch).
3. Normalize obvious metadata drift (version and variant naming consistency).

Deliverables:

1. `docs/REFACTOR_PLAN.md` (this file).
2. A short progress log section appended per completed batch.

Exit Criteria:

1. Plan is in repo.
2. First execution batch completed with documented scope.

---

### Phase 1: Correctness and Data Integrity (Low Risk, High Return)

Scope:

1. Fix known data-quality and configuration correctness issues.
2. Remove ambiguous geocoding key collisions in tech-events data.
3. Fix incorrect channel identifiers in live-stream integrations.
4. Align variant naming conventions (`full` vs `world`) across config/build paths.

Deliverables:

1. Corrected `src/components/LiveNewsPanel.ts` channel mapping.
2. Improved location normalization in `api/tech-events.js` to avoid duplicate-key override behavior.
3. Variant normalization updates in `vite.config.ts`.
4. Documentation version metadata alignment.

Exit Criteria:

1. No known incorrect handles remain.
2. City collisions in `tech-events` are resolved deterministically.
3. Build-time variant metadata resolves consistently from configured env.

---

### Phase 2: API Contract Standardization

Scope:

1. Introduce a shared API response contract helper (`ok/error` format + typed headers).
2. Standardize CORS policy usage via `api/_cors.js` helper across endpoints.
3. Define endpoint categories:
   - Public strict allowlist
   - Internal-only
   - Public wildcard (explicitly justified)
4. Expand rate limiting to sensitive endpoints (AI-heavy and expensive upstreams).

Deliverables:

1. Shared API helper utilities in `api/_*.js`.
2. Endpoint migration list + migrated first batch (high-traffic endpoints first).
3. Updated README security section with actual enforced policy.

Exit Criteria:

1. Core endpoints follow unified CORS + error shape.
2. Sensitive endpoints have explicit throttling policy.
3. Security docs match implementation.

---

### Phase 3: App Orchestration Decomposition

Scope:

1. Split `src/App.ts` into explicit modules:
   - `app/layout/*` (DOM/layout only)
   - `app/panels/*` (panel creation and wiring)
   - `app/data/*` (refresh scheduler, data loaders)
   - `app/state/*` (persistent state, URL sync)
2. Move refresh scheduling (`scheduleRefresh`, `setupRefreshIntervals`) into a dedicated scheduler service.
3. Keep App as thin composition root.

Deliverables:

1. New module structure with extracted services.
2. Reduced `App.ts` size and responsibility.

Exit Criteria:

1. `App.ts` is primarily wiring/composition.
2. Data loader logic is testable outside DOM-heavy class.

---

### Phase 4: Map Layer Architecture Extraction

Scope:

1. Extract layer builders from `DeckGLMap.ts` into per-layer modules.
2. Extract shared map interaction/state logic between `Map.ts` and `DeckGLMap.ts`.
3. Keep `MapContainer.ts` as the stable adapter boundary.

Deliverables:

1. `src/components/map/layers/*` modules.
2. `src/components/map/shared/*` for common logic.

Exit Criteria:

1. Layer rendering changes can be made without touching monolithic map files.
2. Reduced regressions in map-related edits.

---

### Phase 5: Test and Verification Expansion

Scope:

1. Add service-level tests for:
   - Threat classification fallback behavior.
   - Geocoding normalization for tech-events.
   - Temporal baseline client logic.
   - Data freshness status transitions.
2. Keep existing map harness visual tests as top-level integration guardrail.

Deliverables:

1. New test suite for core services and utility behavior.
2. CI-friendly commands and minimal docs.

Exit Criteria:

1. Core service behaviors covered by automated checks.
2. Regressions in high-risk logic become detectable pre-release.

---

### Phase 6: Performance and Release Hardening

Scope:

1. Profile refresh loops and map render cadence under full layer load.
2. Apply targeted optimizations after structure is modularized.
3. Create release checklist (cache key changes, API contract changes, migration notes).

Deliverables:

1. Performance notes with before/after metrics.
2. Release checklist and rollback notes.

Exit Criteria:

1. Stable release workflow for future high-velocity changes.

## 5. Execution Order

Immediate execution starts with:

1. Phase 1 items (correctness/data integrity).
2. Phase 0 progress log update.
3. Then Phase 2 contract standardization first batch.

## 6. Progress Log

### 2026-02-13 (Batch 1, Completed)

Completed:

1. Fixed Euronews channel handle typo in `src/components/LiveNewsPanel.ts`.
2. Resolved `tech-events` geocoding key collisions and improved country-aware normalization in `api/tech-events.js`.
3. Normalized Vite variant metadata mapping (`world` alias -> `full`) in `vite.config.ts`.
4. Aligned documentation version badge to `2.1.4` in `docs/DOCUMENTATION.md`.

Next batch (Phase 2 start):

1. Introduce shared API response helper for consistent success/error shapes.
2. Migrate first high-traffic endpoints to centralized CORS policy helper.
3. Add explicit wildcard-CORS allowlist exceptions and document them.

### 2026-02-13 (Batch 2, Completed)

Completed:

1. Added centralized response helpers in `api/_response.js` including `jsonRaw()` for proxy-safe JSON passthrough.
2. Extended CORS helper with explicit wildcard policy support in `api/_cors.js` (`getWildcardCorsHeaders()`).
3. Migrated high-traffic endpoints to unified response/CORS handling:
   - Strict allowlist: `api/fred-data.js`, `api/macro-signals.js`, `api/stablecoin-markets.js`, `api/etf-flows.js`, `api/stock-index.js`
   - Explicit wildcard: `api/coingecko.js`, `api/polymarket.js`, `api/yahoo-finance.js`
4. Updated `README.md` Security Model section to reflect enforced CORS policy tiers and wildcard exceptions.
5. Verified no-regression baseline for this batch with `npm run typecheck` and `npm run build`.

Next batch (Phase 2 continuation):

1. Continue migrating remaining frequently used endpoints to shared response helpers.
2. Standardize rate-limit policy for high-cost endpoints with explicit per-endpoint limits.
3. Add endpoint contract notes (error codes + cache behavior) to docs.

### 2026-02-13 (Batch 3, Completed)

Completed:

1. Hardened `api/country-intel.js` with strict CORS allowlist (`POST, OPTIONS`) and explicit preflight handling.
2. Added IP rate limiting to `country-intel` (12 requests / 10 minutes per IP) using `api/_ip-rate-limit.js`.
3. Migrated `country-intel` responses to shared response helpers (`jsonOk/jsonError/empty`) with structured error codes.
4. Updated README security documentation for actual enforced IP rate-limited endpoints.

Next batch:

1. Continue migrating remaining edge endpoints to shared response helpers and unified method guards.
2. Add a compact API contract matrix (CORS mode, cache TTL, rate limits) under `docs/`.

### 2026-02-13 (Batch 4, Completed)

Completed:

1. Added generic JSON payload helper `jsonBody()` to `api/_response.js` to standardize response/header construction while preserving endpoint-specific payload shapes.
2. Migrated additional strict-CORS endpoints to shared helpers and unified preflight handling:
   - `api/cache-telemetry.js`
   - `api/cloudflare-outages.js`
   - `api/ais-snapshot.js`
3. Migrated core rate-limited data endpoints to shared helpers without changing business payload semantics:
   - `api/acled.js`
   - `api/acled-conflict.js`
   - `api/ucdp-events.js`
   - `api/unhcr-population.js`
   - `api/worldpop-exposure.js`
   - `api/climate-anomalies.js`
4. Added API contract matrix documentation at `docs/API_CONTRACT_MATRIX.md` (CORS mode, methods, cache behavior, rate limits).
5. Linked README Security Model section to the new API contract matrix.

Next batch:

1. Continue migrating long-tail endpoints still using ad-hoc response/cors patterns.
2. Start Phase 3 decomposition work on `src/App.ts` extraction after Phase 2 migration is considered sufficient.

### 2026-02-13 (Batch 5, Completed)

Completed:

1. Standardized additional public read-only endpoints to wildcard CORS helper + explicit preflight/method guards:
   - `api/arxiv.js`
   - `api/hackernews.js`
   - `api/github-trending.js`
   - `api/gdelt-doc.js`
   - `api/earthquakes.js`
   - `api/nga-warnings.js`
   - `api/fwdstart.js`
2. Extended `docs/API_CONTRACT_MATRIX.md` with the above endpoint contracts.
3. Verified compatibility by preserving payload formats (JSON/XML) and cache headers.

Next batch:

1. Migrate remaining long-tail endpoints that still use endpoint-local CORS/response patterns.
2. Decide Phase 2 close criteria and begin Phase 3 (`src/App.ts` decomposition) execution.

### 2026-02-13 (Batch 6, Completed)

Completed:

1. Hardened AI summarization endpoints with strict CORS + preflight + IP throttling while preserving fallback semantics:
   - `api/groq-summarize.js` (30 req/min/IP)
   - `api/openrouter-summarize.js` (10 req/min/IP)
2. Migrated the above endpoints to shared response helpers without changing client-facing success payload fields.
3. Updated security docs (`README.md`) and contract matrix (`docs/API_CONTRACT_MATRIX.md`) to include summarization endpoint limits and methods.

Next batch:

1. Close out remaining endpoint-local patterns (`service-status`, `theater-posture`, `rss-proxy`, `risk-scores`, etc.) or explicitly mark them as deferred.
2. Start Phase 3 extraction work on `src/App.ts` once Phase 2 close criteria is accepted.

### 2026-02-13 (Batch 7, Completed)

Completed:

1. Started Phase 3 (`App.ts` decomposition) with first extraction:
   - New module: `src/app/state/country-metadata.ts`
   - Extracted country bounds, country alias search terms, and bounds-matching helper.
2. Updated `src/App.ts` to consume extracted module and removed in-class country metadata constants/helpers.
3. Verified behavior/build parity with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting additional `App.ts` responsibilities (country intel wiring, refresh scheduler wiring).
2. Decide whether to continue long-tail Phase 2 endpoint normalization in parallel or mark remaining files deferred.

### 2026-02-13 (Batch 8, Completed)

Completed:

1. Migrated additional long-tail endpoints to shared response helpers and explicit method/preflight guards:
   - `api/risk-scores.js` (strict CORS, 20 req/min/IP)
   - `api/classify-event.js` (strict CORS, 60 req/min/IP)
   - `api/temporal-baseline.js` (strict CORS, `GET/POST/OPTIONS`)
   - `api/gdelt-geo.js` (strict CORS via shared helper)
   - `api/service-status.js` (explicit wildcard)
   - `api/opensky.js` (explicit wildcard)
   - `api/ucdp.js` (explicit wildcard)
   - `api/hapi.js` (explicit wildcard)
   - `api/faa-status.js` (explicit wildcard)
2. Updated API contract/security docs to reflect new endpoint contracts and rate-limit coverage:
   - `docs/API_CONTRACT_MATRIX.md`
   - `README.md`
3. Re-ran `npm run typecheck` and retained build compatibility.

Remaining Phase 2 long-tail (defer/next batch candidates):

1. `api/rss-proxy.js`
2. `api/theater-posture.js`
3. `api/tech-events.js`
4. Node-style handlers: `api/story.js`, `api/og-story.js`, `api/worldbank.js`
5. Operational/special: `api/firms-fires.js`, `api/debug-env.js`

### 2026-02-13 (Batch 9, Completed)

Completed:

1. Continued Phase 3 decomposition of `src/App.ts` by extracting country signal aggregation logic:
   - New module: `src/app/state/country-signals.ts`
   - Extracted intelligence-cache typed contract and country-level signal computation.
2. Updated `src/App.ts` to use `computeCountrySignals(...)` and removed in-class `getCountrySignals()` implementation.
3. Kept compatibility with existing behavior while reducing direct responsibilities in `App.ts`.
4. Re-verified with `npm run typecheck` and `npm run build`.

Current remaining non-migrated endpoint-local patterns:

1. `api/rss-proxy.js`
2. `api/theater-posture.js`
3. `api/tech-events.js`
4. Node-style handlers: `api/story.js`, `api/og-story.js`, `api/worldbank.js`
5. Operational/special: `api/firms-fires.js`, `api/debug-env.js`

### 2026-02-13 (Batch 10, Completed)

Completed:

1. Normalized additional endpoints and reduced remaining long-tail surface:
   - `api/tech-events.js` (wildcard CORS + method/preflight + shared response helpers)
   - `api/firms-fires.js` (strict CORS + method/preflight + shared response helpers)
   - `api/debug-env.js` (shared response helper)
2. Updated API contract matrix with `tech-events` and `firms-fires`.
3. Re-verified with `npm run typecheck` and `npm run build`.

Updated remaining non-migrated endpoint-local patterns:

1. `api/rss-proxy.js`
2. `api/theater-posture.js`
3. Node-style handlers: `api/story.js`, `api/og-story.js`, `api/worldbank.js`

### 2026-02-13 (Batch 11, Completed)

Completed:

1. Migrated `api/rss-proxy.js` to shared strict CORS helper + shared response helper contract.
2. Preserved RSS domain allowlist enforcement and XML passthrough behavior while standardizing preflight/method guards.
3. Updated `docs/API_CONTRACT_MATRIX.md` to include `rss-proxy` contract.

Updated remaining non-migrated endpoint-local patterns:

1. `api/theater-posture.js`
2. Node-style handlers: `api/story.js`, `api/og-story.js`, `api/worldbank.js`

### 2026-02-13 (Batch 12, Completed)

Completed:

1. Closed remaining Phase 2 endpoint migration gap:
   - `api/theater-posture.js` now uses shared wildcard CORS helper and shared response helpers with explicit method/preflight guards.
2. Added Node response adapter helpers in `api/_response-node.js` and applied to remaining Node-style handlers:
   - `api/story.js`
   - `api/og-story.js`
   - `api/worldbank.js`
3. Extended shared CORS helper (`api/_cors.js`) to support both Web Request headers and Node `req.headers` shape.
4. Updated API contract docs (`docs/API_CONTRACT_MATRIX.md`) with `theater-posture`, `worldbank`, `story`, and `og-story`.
5. Re-verified with `npm run typecheck` and `npm run build`.

Phase 2 status:

1. Endpoint contract standardization is now complete for active public API handlers (Edge + Node variants).

Next batch:

1. Continue Phase 3 extraction by moving refresh scheduling orchestration out of `src/App.ts`.

### 2026-02-13 (Batch 13, Completed)

Completed:

1. Continued Phase 3 decomposition by extracting refresh scheduling engine:
   - New module: `src/app/data/refresh-scheduler.ts`
   - Moved timeout lifecycle, jitter logic, visibility backoff, and in-flight gating out of `App.ts`.
2. Extracted default refresh job wiring to:
   - `src/app/data/default-refresh-plan.ts`
3. Updated `src/App.ts` to:
   - Use `RefreshScheduler` service instance
   - Delegate default periodic task registration to `registerDefaultRefreshPlan(...)`
   - Use centralized scheduler teardown in `destroy()`
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `loadAllData()` orchestration and layer-specific loading switch from `App.ts` into `app/data/*`.

### 2026-02-13 (Batch 14, Completed)

Completed:

1. Continued Phase 3 decomposition by extracting guarded initial-load orchestration:
   - New module: `src/app/data/guarded-load.ts`
   - New module: `src/app/data/default-load-plan.ts`
2. Extracted layer-specific refresh dispatch logic:
   - New module: `src/app/data/layer-load-dispatch.ts`
3. Updated `src/App.ts` to:
   - Delegate `loadAllData()` task planning/execution to extracted modules.
   - Delegate `loadDataForLayer()` switch routing to dispatch helper.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting URL/state bootstrapping and event-listener wiring segments from `src/App.ts`.

### 2026-02-13 (Batch 15, Completed)

Completed:

1. Continued Phase 3 by extracting URL bootstrap/state application responsibilities from `src/App.ts`:
   - New module: `src/app/state/url-bootstrap.ts`
   - Moved variant-aware URL layer normalization and initial map state application logic.
2. Extracted story deep-link handling from `src/App.ts`:
   - New module: `src/app/state/story-deeplink.ts`
   - Preserved polling/open behavior while isolating deep-link parsing and country name mapping.
3. Updated `src/App.ts` to delegate constructor/init state handling to new state modules.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting URL sync/share-link generation and event wiring slices from `src/App.ts`.

### 2026-02-13 (Batch 16, Completed)

Completed:

1. Extracted map URL sync/share-link logic from `src/App.ts`:
   - New module: `src/app/state/url-sync.ts`
   - Moved share URL construction and debounced map-state-to-URL synchronization.
2. Updated `src/App.ts` to use `getShareUrlFromMap(...)` and `setupUrlStateSync(...)`.
3. Removed now-redundant in-class share URL helper logic.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `setupEventListeners()` into focused modules (topbar actions, modal wiring, viewport/visibility wiring).

### 2026-02-13 (Batch 17, Completed)

Completed:

1. Extracted DOM event binding orchestration from `src/App.ts`:
   - New module: `src/app/layout/event-wiring.ts`
   - Moved topbar actions, settings modal wiring, viewport/visibility hooks, fullscreen/region handlers, and idle setup trigger into module-level wiring function.
2. Updated `src/App.ts` to inject callbacks/state into `wireCoreEventListeners(...)` and retain bound handler references for teardown.
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `setupCountryIntel()` and story-modal/opening flow orchestration into `app/panels/*` or `app/data/*`.

### 2026-02-13 (Batch 18, Completed)

Completed:

1. Extracted country-intel interaction orchestration from `src/App.ts`:
   - New module: `src/app/panels/country-intel-flow.ts`
   - Moved country click handling, stock/markets enrichment, context assembly, and brief request flow into panel-focused module.
2. Updated `src/App.ts` to delegate `setupCountryIntel()` to `setupCountryIntelFlow(...)` with dependency injection (`map`, `modal`, cache/news getters, share callback).
3. Removed now-redundant direct dependencies from `App.ts` (`reverseGeocode`, `fetchCountryMarkets`, inline country-intel context assembly path).
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting story-modal/opening composition (`openCountryStory`) and toast UI helper into `app/panels/*` and `app/layout/*`.

### 2026-02-13 (Batch 19, Completed)

Completed:

1. Extracted story opening composition from `src/App.ts`:
   - New module: `src/app/panels/story-flow.ts`
   - Moved readiness guard, country convergence composition, and story modal open flow into panel module.
2. Extracted toast UI helper:
   - New module: `src/app/layout/toast.ts`
3. Updated `src/App.ts` to delegate `openCountryStory(...)` to `openCountryStoryFlow(...)` and use `showToastMessage(...)`.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting additional `setupSearchModal()` source-registration branches into `app/panels/search-index/*`.

### 2026-02-13 (Batch 20, Completed)

Completed:

1. Extracted static search source registration from `src/App.ts`:
   - New module: `src/app/panels/search-index/static-sources.ts`
   - Moved variant-aware placeholder/hint options and static source registration for both `tech` and `full` variants.
2. Updated `setupSearchModal()` in `src/App.ts` to delegate to:
   - `getSearchModalStaticOptions(...)`
   - `registerStaticSearchSources(...)`
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting dynamic search source refresh (`news/predictions/markets`) into `app/panels/search-index/*`.

### 2026-02-13 (Batch 21, Completed)

Completed:

1. Extracted dynamic search source refresh logic:
   - New module: `src/app/panels/search-index/dynamic-sources.ts`
   - Moved news/predictions/markets source indexing logic out of `src/App.ts`.
2. Updated `updateSearchIndex()` in `src/App.ts` to delegate to `refreshDynamicSearchSources(...)`.
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `handleSearchResult()` switch routing into focused dispatch helpers.

### 2026-02-13 (Batch 22, Completed)

Completed:

1. Extracted search result dispatch switch from `src/App.ts`:
   - New module: `src/app/panels/search-index/result-dispatch.ts`
   - Moved per-type search result routing and map/layer side effects into dedicated dispatcher.
2. Updated `handleSearchResult()` in `src/App.ts` to delegate to `dispatchSearchResult(...)`.
3. Cleaned now-unused import surface in `src/App.ts` after dispatch extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting keyboard shortcut and search-modal interaction wiring from `setupSearchModal()`.

### 2026-02-13 (Batch 23, Completed)

Completed:

1. Extracted search modal interaction wiring:
   - New module: `src/app/panels/search-index/interactions.ts`
   - Moved `setOnSelect` + global `Ctrl/Cmd+K` shortcut binding out of `src/App.ts`.
2. Updated `setupSearchModal()` in `src/App.ts` to delegate keyboard and selection wiring to `wireSearchModalInteractions(...)`.
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting remaining high-branch methods (`loadNews`, `loadIntelligenceSignals`) into focused `app/data/*` orchestration modules.

### 2026-02-13 (Batch 24, Completed)

Completed:

1. Extracted news loading orchestration helpers:
   - New module: `src/app/data/news-flow.ts`
   - Moved category list resolution, per-category incremental RSS rendering flow, category result aggregation, and intel feed branch handling.
2. Updated `loadNews()` in `src/App.ts` to delegate category/intel collection to:
   - `getConfiguredNewsCategories(...)`
   - `loadNewsCategoryFlow(...)`
   - `collectCategoryNews(...)`
   - `loadIntelNewsFlow(...)`
3. Removed now-redundant in-class `loadNewsCategory(...)` implementation.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `loadIntelligenceSignals()` orchestration into `app/data/*`.

### 2026-02-13 (Batch 25, Completed)

Completed:

1. Extracted intelligence orchestration from `src/App.ts`:
   - New module: `src/app/data/intelligence-flow.ts`
   - Moved outages/protests/military/conflict/ucdp/unhcr/climate/exposure task orchestration and CII refresh trigger.
2. Updated `loadIntelligenceSignals()` in `src/App.ts` to delegate to `loadIntelligenceSignalsFlow(...)`.
3. Cleaned now-unused import surface in `src/App.ts` after intelligence extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~2398 lines.

Next batch:

1. Continue Phase 3 by extracting remaining heavy methods (`loadMarkets`, `loadMilitary`, `runCorrelationAnalysis`) into `app/data/*` modules.

### 2026-02-13 (Batch 26, Completed)

Completed:

1. Extracted market loading orchestration from `src/App.ts`:
   - New module: `src/app/data/markets-flow.ts`
   - Moved stocks/sectors/commodities/crypto loading and status updates into dedicated flow helper.
2. Updated `loadMarkets()` in `src/App.ts` to delegate to `loadMarketsFlow(...)`.
3. Re-verified with `npm run typecheck` and `npm run build`.
4. `src/App.ts` reduced further to ~2353 lines.

Next batch:

1. Continue Phase 3 by extracting remaining high-branch methods (`loadMilitary`, `runCorrelationAnalysis`) into `app/data/*` modules.

### 2026-02-13 (Batch 27, Completed)

Completed:

1. Extracted correlation analysis orchestration from `src/App.ts`:
   - New module: `src/app/data/correlation-flow.ts`
   - Moved cluster bootstrap, CII ingestion trigger, worker correlation call, geographic convergence enrichment, and signal emission flow.
2. Updated `runCorrelationAnalysis()` in `src/App.ts` to delegate to `runCorrelationAnalysisFlow(...)`.
3. Cleaned now-unused imports in `src/App.ts` after extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~2335 lines.

Next batch:

1. Continue Phase 3 by extracting remaining heavy methods (`loadMilitary` and related cache/banner coordination) into `app/data/*`.

### 2026-02-13 (Batch 28, Completed)

Completed:

1. Extracted military layer orchestration and cached posture banner coordination from `src/App.ts`:
   - New module: `src/app/data/military-flow.ts`
   - Added `loadMilitaryFlow(...)` and `loadCachedPosturesForBannerFlow(...)`.
2. Updated `loadMilitary()` in `src/App.ts` to delegate to `loadMilitaryFlow(...)` with injected map/panel/status dependencies.
3. Removed in-class `loadCachedPosturesForBanner()` implementation after extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~2240 lines.

Next batch:

1. Continue Phase 3 by extracting intelligence-layer rendering loaders (`loadOutages`, `loadAisSignals`, `loadCableActivity`, `loadProtests`, `loadFlightDelays`, `waitForAisData`) into `app/data/*`.

### 2026-02-13 (Batch 29, Completed)

Completed:

1. Extracted intelligence-layer-specific loading/rendering helpers from `src/App.ts`:
   - New module: `src/app/data/intelligence-layer-flow.ts`
   - Added:
     - `loadOutagesLayerFlow(...)`
     - `loadAisSignalsLayerFlow(...)`
     - `waitForAisDataFlow(...)`
     - `loadCableActivityLayerFlow(...)`
     - `loadProtestsLayerFlow(...)`
     - `loadFlightDelaysLayerFlow(...)`
2. Updated `src/App.ts` methods to delegate to these helpers with dependency injection.
3. Cleaned now-unused imports in `src/App.ts` after extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~2121 lines.

Next batch:

1. Continue Phase 3 by extracting remaining medium/high-complexity data loaders (`loadNatural`, `loadWeatherAlerts`, `loadTechEvents`) into dedicated `app/data/*` modules.

### 2026-02-13 (Batch 30, Completed)

Completed:

1. Extracted environmental/tech data loaders from `src/App.ts`:
   - New module: `src/app/data/environment-flow.ts`
   - Added:
     - `loadNaturalFlow(...)`
     - `loadTechEventsFlow(...)`
     - `loadWeatherAlertsFlow(...)`
2. Updated `src/App.ts` to delegate `loadNatural()`, `loadTechEvents()`, and `loadWeatherAlerts()` to the extracted flow helpers.
3. Cleaned now-unused imports from `src/App.ts` after extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~2033 lines.

Next batch:

1. Continue Phase 3 by extracting remaining service orchestration methods (`loadPizzInt`, `loadFredData`, `loadOilAnalytics`, `loadGovernmentSpending`) into `app/data/*` flow helpers.

### 2026-02-13 (Batch 31, Completed)

Completed:

1. Extracted PizzINT and economic data orchestration from `src/App.ts`:
   - New module: `src/app/data/pizzint-flow.ts`
     - `loadPizzIntFlow(...)`
   - New module: `src/app/data/economic-flow.ts`
     - `loadFredDataFlow(...)`
     - `loadOilAnalyticsFlow(...)`
     - `loadGovernmentSpendingFlow(...)`
2. Updated `src/App.ts` methods to delegate to these new flow helpers.
3. Cleaned now-unused imports from `src/App.ts` after extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1980 lines.

Next batch:

1. Continue Phase 3 by targeting non-data heavy UI/controller methods (`createPanels`, `renderPanelToggles`, sources/settings modal orchestration, drag/drop wiring) for module extraction.

### 2026-02-13 (Batch 32, Completed)

Completed:

1. Extracted predictions and FIRMS signal ingestion flows from `src/App.ts`:
   - New module: `src/app/data/signals-flow.ts`
   - Added:
     - `loadPredictionsFlow(...)`
     - `loadFirmsDataFlow(...)`
2. Updated `src/App.ts` to delegate `loadPredictions()` and `loadFirmsData()` to the new flow helpers.
3. Cleaned now-unused imports in `src/App.ts` after extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1938 lines.

Next batch:

1. Continue Phase 3 by extracting UI/controller-heavy orchestration (`createPanels`, settings/source modal flows, panel toggles, drag/drop wiring) into `app/layout/*` and `app/panels/*` modules.

### 2026-02-13 (Batch 33, Completed)

Completed:

1. Extracted source modal UI orchestration from `src/App.ts`:
   - New module: `src/app/layout/sources-modal.ts`
   - Encapsulated source list derivation, filter rendering, enable/disable toggles, and modal event wiring.
2. Updated `setupSourcesModal()` in `src/App.ts` to a state-injected delegate call (`setupSourcesModalFlow(...)`).
3. Removed in-class `getAllSourceNames()` and `renderSourceToggles()` implementations from `src/App.ts`.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1858 lines.

Next batch:

1. Continue Phase 3 by extracting settings panel toggle orchestration (`renderPanelToggles` and related persistence/apply hooks) into `app/layout/*`.

### 2026-02-13 (Batch 34, Completed)

Completed:

1. Extracted panel settings toggle rendering/wiring from `src/App.ts`:
   - New module: `src/app/layout/panel-settings.ts`
   - Added `renderPanelTogglesFlow(...)` for DOM rendering, persistence, and click handling.
2. Updated `renderPanelToggles()` in `src/App.ts` to delegate to the new layout flow module.
3. Re-verified with `npm run typecheck` and `npm run build`.
4. `src/App.ts` reduced further to ~1838 lines.

Next batch:

1. Continue Phase 3 by extracting remaining UI/controller orchestration, prioritizing drag/drop panel ordering and map resize/pin controls.

### 2026-02-13 (Batch 35, Completed)

Completed:

1. Extracted panel ordering and drag/drop wiring from `src/App.ts`:
   - New module: `src/app/layout/panel-order.ts`
   - Added:
     - `loadSavedPanelOrder(...)`
     - `savePanelOrder(...)`
     - `resolvePanelOrder(...)`
     - `makePanelDraggableFlow(...)`
2. Updated `createPanels()` in `src/App.ts` to delegate panel order resolution and drag behavior to the extracted layout module.
3. Removed in-class implementations from `src/App.ts`:
   - `getSavedPanelOrder()`
   - `savePanelOrder()`
   - `makeDraggable()`
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1590 lines.

Next batch:

1. Continue Phase 3 by extracting map UI controls (`setupMapResize`, `setupMapPin`) and remaining repeated panel setup patterns.

### 2026-02-13 (Batch 36, Completed)

Completed:

1. Extracted map UI controls from `src/App.ts`:
   - New module: `src/app/layout/map-controls.ts`
   - Added:
     - `setupMapResizeFlow(...)`
     - `setupMapPinFlow(...)`
2. Updated `setupEventListeners()` in `src/App.ts` to invoke extracted map control flows.
3. Removed in-class implementations from `src/App.ts`:
   - `setupMapResize()`
   - `setupMapPin()`
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting repeated `NewsPanel` creation and registration blocks in `createPanels()`.

### 2026-02-13 (Batch 37, Completed)

Completed:

1. Extracted repeated `NewsPanel` registration and definitions from `src/App.ts`:
   - New module: `src/app/panels/news-panels.ts`
   - Added reusable specs/registrar:
     - `CORE_NEWS_PANEL_SPECS`
     - `TECH_NEWS_PANEL_SPECS`
     - `REGIONAL_NEWS_PANEL_SPECS`
     - `registerNewsPanels(...)`
2. Updated `createPanels()` in `src/App.ts` to register news panels via reusable specs instead of inline repeated construction.
3. Extracted related asset click switch flow:
   - New module: `src/app/panels/related-assets.ts`
   - Added `handleRelatedAssetClickFlow(...)` and updated `handleRelatedAssetClick()` to delegate.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1561 lines.

Next batch:

1. Continue Phase 3 by extracting remaining `createPanels()` specialization branches (full-variant strategic/intel panel setup) into focused panel assembly modules.

### 2026-02-13 (Batch 38, Completed)

Completed:

1. Extracted full-variant strategic/intel panel assembly from `src/App.ts`:
   - New module: `src/app/panels/full-variant-panels.ts`
   - Added `registerFullVariantPanels(...)` to centralize `SITE_VARIANT === 'full'` panel creation and map/story callbacks.
2. Updated `createPanels()` in `src/App.ts` to delegate full-variant panel registration to the new module.
3. Cleaned now-unused component imports from `src/App.ts` after extraction.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1516 lines.

Next batch:

1. Continue Phase 3 by extracting shared helper UI flows (`copy/share feedback`, `idle detection`), then reassess whether to split `createPanels()` into map/panel assemblers.

### 2026-02-13 (Batch 39, Completed)

Completed:

1. Extracted share/copy UI controls from `src/App.ts`:
   - New module: `src/app/layout/share-controls.ts`
   - Added:
     - `copyTextToClipboard(...)`
     - `setCopyFeedback(...)`
     - `toggleFullscreenMode(...)`
2. Updated `setupEventListeners()` in `src/App.ts` to use extracted share/fullscreen helpers.
3. Removed in-class helper implementations from `src/App.ts`:
   - `copyToClipboard()`
   - `setCopyLinkFeedback()`
   - `toggleFullscreen()`
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1483 lines.

Next batch:

1. Continue Phase 3 by extracting idle detection controller (`setupIdleDetection`, `resetIdleTimer`) and remaining setup/controller helpers from `src/App.ts`.

### 2026-02-13 (Batch 40, Completed)

Completed:

1. Extracted idle detection orchestration from `src/App.ts`:
   - New module: `src/app/layout/idle-detection.ts`
   - Added:
     - `IDLE_ACTIVITY_EVENTS`
     - `setupIdleDetectionFlow(...)`
     - `resetIdleTimerFlow(...)`
2. Updated `src/App.ts` event wiring and visibility handlers to use extracted idle-detection flows.
3. Removed in-class methods from `src/App.ts`:
   - `setupIdleDetection()`
   - `resetIdleTimer()`
4. Reused shared `IDLE_ACTIVITY_EVENTS` during destroy cleanup.
5. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by splitting remaining large orchestration points (`createPanels`, `renderLayout`, and remaining setup/controller glue) into focused assemblers.

### 2026-02-13 (Batch 41, Completed)

Completed:

1. Extracted core map/panel assembly from `src/App.ts`:
   - New module: `src/app/panels/core-panels.ts`
   - Added:
     - `initializeMainMap(...)`
     - `registerCorePanels(...)`
2. Updated `createPanels()` in `src/App.ts` to delegate map initialization and core panel registration.
3. Extracted critical banner rendering from `src/App.ts`:
   - New module: `src/app/layout/critical-banner.ts`
   - Added `renderCriticalBannerFlow(...)` and delegated `renderCriticalBanner()`.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting large static layout template and remaining state/helper glue.

### 2026-02-13 (Batch 42, Completed)

Completed:

1. Extracted app shell HTML template from `src/App.ts`:
   - New module: `src/app/layout/shell-template.ts`
   - Added `buildAppShellHtml(...)` and delegated `renderLayout()`.
2. Cleaned now-unused import surface in `src/App.ts` after panel/template extraction.
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting map flash and layer-freshness state helpers.

### 2026-02-13 (Batch 43, Completed)

Completed:

1. Extracted news-to-map flash location logic from `src/App.ts`:
   - New module: `src/app/state/map-flash.ts`
   - Added:
     - `findFlashLocationForTitle(...)`
     - `flashMapForNewsFlow(...)`
2. Extracted layer-to-data-freshness mapping logic:
   - New module: `src/app/state/layer-freshness.ts`
   - Added:
     - `syncAllLayerFreshness(...)`
     - `syncSingleLayerFreshness(...)`
3. Updated `src/App.ts` to delegate `flashMapForNews`, `syncDataFreshnessWithLayers`, and layer-change freshness sync to the new helpers.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1235 lines.

Next batch:

1. Continue Phase 3 by extracting playback/snapshot orchestration (`setupPlaybackControl`, `setupSnapshotSaving`, `restoreSnapshot`) into `app/data/*` helpers.

### 2026-02-13 (Batch 44, Completed)

Completed:

1. Extracted playback/snapshot orchestration from `src/App.ts`:
   - New module: `src/app/data/playback-flow.ts`
   - Added:
     - `setupPlaybackControlFlow(...)`
     - `setupSnapshotSavingFlow(...)`
     - `restoreSnapshotFlow(...)`
2. Updated `setupPlaybackControl()`, `setupSnapshotSaving()`, and `restoreSnapshot()` in `src/App.ts` to delegate to extracted flow helpers.
3. Removed now-redundant direct snapshot save composition from `src/App.ts`.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting map layer change wiring and header widget setup helpers.

### 2026-02-13 (Batch 45, Completed)

Completed:

1. Extracted map layer change orchestration from `src/App.ts`:
   - New module: `src/app/state/layer-change.ts`
   - Added `setupMapLayerHandlersFlow(...)` and delegated `setupMapLayerHandlers()`.
2. Extracted header widget setup helpers:
   - New module: `src/app/layout/header-widgets.ts`
   - Added:
     - `setupStatusPanelFlow(...)`
     - `setupPizzIntIndicatorFlow(...)`
     - `setupExportPanelFlow(...)`
3. Removed now-unused `exportPanel` state from `App` and tightened callback typing via `ExportPanel` constructor parameters.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1210 lines.

Next batch:

1. Continue Phase 3 by extracting remaining setup/controller glue and reassessing whether `App.ts` can be split into composition root + runtime coordinator.

### 2026-02-13 (Batch 46, Completed)

Completed:

1. Extracted constructor bootstrap state loading and migration logic from `src/App.ts`:
   - New module: `src/app/state/bootstrap-settings.ts`
   - Added `initializeBootstrapSettings(...)` to centralize:
     - variant reset/default handling
     - panel-order migrations
     - URL initial state resolution
     - disabled source restoration
2. Updated `App` constructor to delegate bootstrap state assembly.
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting lifecycle cleanup and event-wiring orchestration.

### 2026-02-13 (Batch 47, Completed)

Completed:

1. Extracted lifecycle destroy cleanup from `src/App.ts`:
   - New module: `src/app/lifecycle/destroy.ts`
   - Added `destroyAppResourcesFlow(...)` for interval/listener/idle/map/AIS cleanup.
2. Updated `destroy()` in `src/App.ts` to delegate and apply returned cleared state.
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `setupEventListeners` callback orchestration and idle-state binding glue.

### 2026-02-13 (Batch 48, Completed)

Completed:

1. Extracted event callback assembly from `src/App.ts`:
   - New module: `src/app/layout/event-setup.ts`
   - Added `setupCoreEventHandlersFlow(...)` to wrap share/fullscreen/map-controls/idle/focal-point/visibility callbacks.
2. Added `getIdleStateBindings()` helper in `App` to remove repeated idle state wiring blocks.
3. Updated `setupEventListeners()` in `src/App.ts` to delegate to the new flow.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~1065 lines.

Next batch:

1. Continue Phase 3 by extracting remaining composition glue (`renderLayout` post-render bootstrapping and selected setup wrappers) and evaluate splitting `App` into composition root + runtime coordinator.

### 2026-02-13 (Batch 49, Completed)

Completed:

1. Extracted load orchestration from `src/App.ts`:
   - New module: `src/app/data/load-orchestration.ts`
   - Added:
     - `loadAllDataFlow(...)`
     - `loadDataForLayerFlow(...)`
2. Updated `loadAllData()` in `src/App.ts` to delegate guarded task planning/execution and search-index refresh callback wiring.
3. Updated `loadDataForLayer()` in `src/App.ts` to delegate in-flight guard + layer loading indicator + layer dispatch lifecycle.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `init()` startup sequencing into a dedicated bootstrap flow while keeping per-feature loaders in `App`.

### 2026-02-13 (Batch 50, Completed)

Completed:

1. Extracted `init()` startup sequencing from `src/App.ts`:
   - New module: `src/app/lifecycle/startup.ts`
   - Added:
     - `initializeStartupPrerequisitesFlow(...)`
     - `setupSignalModalFlow(...)`
     - `finalizeInitializationFlow(...)`
2. Updated `init()` in `src/App.ts` to delegate:
   - pre-layout initialization (DB/ML/AIS pre-check)
   - signal modal + intelligence badge wiring
   - post-first-load finalization (learning start, layer toggle hiding, refresh/snapshot/deeplink setup)
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `createPanels()` mounting/ordering orchestration into a panel-grid flow.

### 2026-02-13 (Batch 51, Completed)

Completed:

1. Extracted panel grid mounting/order orchestration from `src/App.ts`:
   - New module: `src/app/panels/panel-grid.ts`
   - Added `mountPanelsInGridFlow(...)`
2. Updated `createPanels()` in `src/App.ts` to delegate panel-order resolution, draggable binding, and DOM mounting to the new flow.
3. Removed direct `DEFAULT_PANELS` and `panel-order` orchestration imports from `src/App.ts`.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `loadNews()` post-fetch state update/clustering/map-sync orchestration.

### 2026-02-13 (Batch 52, Completed)

Completed:

1. Extracted `loadNews()` post-fetch orchestration from `src/App.ts`:
   - New module: `src/app/data/news-post-load.ts`
   - Added:
     - `finalizeNewsLoadStateFlow(...)`
     - `clusterNewsResultsFlow(...)`
2. Updated `loadNews()` in `src/App.ts` to delegate:
   - collected news state finalization (baseline anomaly ingest, hotspot sync, monitor refresh)
   - cluster generation + AI insights update + map location projection
3. Removed direct `analysisWorker`, `clusterNewsHybrid`, `updateAndCheck`, and `signalAggregator` dependencies from `src/App.ts`.
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `createPanels()` assembly orchestration (news/core/full registrations) into a dedicated panel bootstrap flow.

### 2026-02-13 (Batch 53, Completed)

Completed:

1. Extracted `createPanels()` assembly orchestration from `src/App.ts`:
   - New module: `src/app/panels/bootstrap.ts`
   - Added `bootstrapPanelsFlow(...)` to centralize:
     - map initialization
     - news/core panel registrations
     - full-variant panel registration with map centering callback
2. Updated `createPanels()` in `src/App.ts` to delegate panel assembly to the new bootstrap flow.
3. Removed direct assembly imports from `src/App.ts` (`news-panels`, `core-panels`, `full-variant-panels`).
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting search modal wiring (`setupSearchModal`, `handleSearchResult`, dynamic index refresh) into a focused search flow.

### 2026-02-13 (Batch 54, Completed)

Completed:

1. Extracted search orchestration from `src/App.ts`:
   - New module: `src/app/panels/search-flow.ts`
   - Added:
     - `setupSearchModalFlow(...)`
     - `updateSearchIndexFlow(...)`
2. Moved result-dispatch glue (including panel/news highlight behavior) into the new search flow module.
3. Updated `src/App.ts`:
   - `setupSearchModal()` now delegates and consumes returned modal/keydown handler
   - `updateSearchIndex()` now delegates to `updateSearchIndexFlow(...)`
   - removed in-class `handleSearchResult`, `scrollToPanel`, and `highlightNewsItem`
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting remaining small UI/state wrappers (`setupSourcesModal`, `applyPanelSettings`, `updateTime`) into layout helpers and reassessing `App.ts` split threshold.

### 2026-02-13 (Batch 55, Completed)

Completed:

1. Extracted runtime UI helpers from `src/App.ts`:
   - New module: `src/app/layout/runtime-ui.ts`
   - Added:
     - `applyPanelSettingsFlow(...)`
     - `updateUtcClockFlow(...)`
2. Updated `src/App.ts`:
   - `applyPanelSettings()` now delegates to `applyPanelSettingsFlow(...)`
   - `updateTime()` now delegates to `updateUtcClockFlow(...)`
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting remaining panel/setup wrappers (`setupSourcesModal`, `applyInitialUrlState`) and re-checking `App.ts` final coordinator boundaries.

### 2026-02-13 (Batch 56, Completed)

Completed:

1. Extracted URL state wrapper glue from `src/App.ts`:
   - New module: `src/app/state/url-controls.ts`
   - Added:
     - `applyInitialUrlStateFlow(...)`
     - `setupUrlStateSyncFlow(...)`
2. Updated `src/App.ts` to call URL flows directly at use sites (`createPanels()` and `init()`), and removed in-class wrappers.
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting remaining setup wrappers (`setupSourcesModal`) and evaluating final split of `App` into composition root + runtime service boundaries.

### 2026-02-13 (Batch 57, Completed)

Completed:

1. Removed thin setup wrappers from `src/App.ts` by inlining at call sites:
   - inlined source modal wiring directly inside `setupEventListeners()`
   - inlined related-asset handler wiring directly inside `createPanels()` bootstrap callback
2. Deleted now-redundant methods:
   - `setupSourcesModal()`
   - `attachRelatedAssetHandlers(...)`
   - `handleRelatedAssetClick(...)`
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by pruning one-shot init wrappers and consolidating startup setup directly in `init()`.

### 2026-02-13 (Batch 58, Completed)

Completed:

1. Further simplified startup sequencing in `src/App.ts`:
   - inlined mobile warning modal setup in `init()`
   - inlined status panel, PizzInt indicator, and export panel setup in `init()`
   - inlined country intel modal/bootstrap setup in `init()`
2. Removed now-redundant methods and unused state:
   - deleted `setupCountryIntel()`
   - deleted one-shot setup wrappers for mobile/status/pizzint/export
   - removed `mobileWarningModal` field
3. Re-verified with `npm run typecheck` and `npm run build`.
4. `src/App.ts` reduced further to ~913 lines.

Next batch:

1. Continue Phase 3 by extracting the remaining large setup methods (`setupMapLayerHandlers`, `setupPlaybackControl`) into direct lifecycle wiring or dedicated bootstrap slices.

### 2026-02-13 (Batch 59, Completed)

Completed:

1. Inlined remaining startup wiring wrappers directly into `init()` in `src/App.ts`:
   - playback control wiring (`setupPlaybackControlFlow(...)`)
   - map layer handler wiring (`setupMapLayerHandlersFlow(...)`)
2. Removed now-redundant methods:
   - `setupPlaybackControl()`
   - `setupMapLayerHandlers()`
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by evaluating whether `App` should be split into separate `AppBootstrap` + `AppRuntime` coordinators once method surface stabilizes.

### 2026-02-13 (Batch 60, Completed)

Completed:

1. Collapsed additional thin wrappers into direct flow wiring in `src/App.ts`:
   - inlined search modal bootstrap wiring in `init()`
   - inlined layer freshness bootstrap sync in `init()`
   - inlined playback snapshot restore logic in `init()` callback
   - inlined snapshot interval setup and deep-link handling in finalization callback
2. Removed now-redundant methods:
   - `handleDeepLinks()`
   - `syncDataFreshnessWithLayers()`
   - `setupSearchModal()`
   - `updateSearchIndex()`
   - `setupSnapshotSaving()`
   - `restoreSnapshot(...)`
3. Replaced additional helper wrappers with direct flow usage:
   - inlined panel toggle render/apply wiring in `renderLayout()` and `createPanels()`
   - inlined UTC clock updates in `renderLayout()`
   - inlined search index refresh callbacks where used
   - inlined flash-map callback within `loadNews()`
4. Removed now-redundant methods:
   - `renderPanelToggles()`
   - `applyPanelSettings()`
   - `updateTime()`
   - `flashMapForNews(...)`
5. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting `init()` sequence into a dedicated bootstrap orchestrator module to reduce constructor/runtime class coupling.

### 2026-02-13 (Batch 61, Completed)

Completed:

1. Collapsed event listener setup wrappers into direct startup orchestration:
   - inlined `setupCoreEventHandlersFlow(...)` call into `init()`
   - inlined idle-state bindings object at callsite
   - inlined bound handler assignments in `init()`
2. Removed now-redundant methods:
   - `getIdleStateBindings()`
   - `setupEventListeners()`
3. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting full news runtime orchestration out of `App.loadNews()`.

### 2026-02-13 (Batch 62, Completed)

Completed:

1. Extracted full news runtime orchestration from `src/App.ts`:
   - New module: `src/app/data/news-runtime.ts`
   - Added `loadNewsRuntimeFlow(...)` to encapsulate:
     - category + intel feed collection
     - status updates
     - map flash coordination
     - post-load state finalization
     - cluster/insight/map-location updates
2. Updated `loadNews()` in `src/App.ts` to delegate to `loadNewsRuntimeFlow(...)`.
3. Removed direct news-flow and news-post-load orchestration imports from `src/App.ts`.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~824 lines.

Next batch:

1. Continue Phase 3 by evaluating split of remaining `App` into bootstrap/runtime coordinators (or keep as stabilized composition root if further split adds indirection without net clarity).

### 2026-02-13 (Batch 63, Completed)

Completed:

1. Extracted layout/panel composition from `src/App.ts`:
   - New module: `src/app/layout/runtime-layout.ts`
   - Added `renderLayoutRuntimeFlow(...)` to encapsulate:
     - shell template render
     - panel bootstrap/mount/order
     - panel settings application
     - initial URL state application
     - panel toggle render
     - UTC clock interval setup
2. Updated `init()` in `src/App.ts` to use `renderLayoutRuntimeFlow(...)` and assign returned `map` + `timeIntervalId`.
3. Removed now-redundant methods:
   - `renderLayout()`
   - `createPanels()`
4. Re-verified with `npm run typecheck` and `npm run build`.

Next batch:

1. Continue Phase 3 by extracting post-layout startup interaction wiring from `init()` into a dedicated runtime startup flow.

### 2026-02-13 (Batch 64, Completed)

Completed:

1. Extracted startup interaction wiring from `src/App.ts`:
   - New module: `src/app/lifecycle/runtime-startup.ts`
   - Added:
     - `setupHeaderPlaybackRuntimeFlow(...)`
     - `setupInteractiveRuntimeFlow(...)`
2. Moved from `init()` into runtime startup flow:
   - signal modal + mobile warning + playback + header widgets setup
   - search modal setup
   - map layer handlers
   - country intel modal setup
   - core event listener wiring (with idle bindings)
   - URL sync + layer freshness bootstrap sync
3. Updated `init()` to consume structured startup results:
   - `signalModal`, `statusPanel`, `pizzintIndicator`
   - `searchModal`, `boundKeydownHandler`, `countryIntelModal`
   - `boundResizeHandler`, `boundFullscreenHandler`, `boundVisibilityHandler`
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~720 lines.

Next batch:

1. Continue Phase 3 by evaluating whether remaining loader wrapper methods should be grouped into a dedicated runtime loader coordinator.

### 2026-02-13 (Batch 65, Completed)

Completed:

1. Further extracted `init()` post-load/finalization orchestration from `src/App.ts`:
   - Updated module: `src/app/lifecycle/runtime-startup.ts`
   - Added `finalizePostLoadRuntimeFlow(...)` to encapsulate:
     - post-first-load finalization trigger
     - snapshot interval setup wiring
     - deep-link handling wiring
2. Updated `init()` in `src/App.ts` to delegate finalization block to `finalizePostLoadRuntimeFlow(...)`.
3. Removed additional direct orchestration dependencies from `src/App.ts` startup path.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~713 lines.

Next batch:

1. Continue Phase 3 by deciding whether to keep remaining loader wrappers in `App` (as composition-root readability boundary) or extract into a dedicated runtime loader coordinator.

### 2026-02-13 (Batch 66, Completed)

Completed:

1. Implemented dedicated runtime loader coordinator:
   - New module: `src/app/data/runtime-loader-coordinator.ts`
   - Added `createRuntimeLoaderCoordinator(...)` and unified loader operations for:
     - news/markets/predictions
     - environment and intelligence layers
     - economic and firms loaders
     - correlation + monitor updates
     - AIS wait helper and intelligence cache reset
2. Refactored `src/App.ts` to consume `runtimeLoaders` instead of per-loader methods:
   - `loadAllData()` delegates all task actions to coordinator methods
   - `loadDataForLayer()` delegates layer actions to coordinator methods
   - `setupRefreshIntervals()` delegates scheduled callbacks to coordinator methods
3. Removed now-redundant loader wrappers from `src/App.ts`:
   - `loadPizzInt`, `loadNews`, `loadMarkets`, `loadPredictions`
   - `loadNatural`, `loadTechEvents`, `loadWeatherAlerts`
   - `loadIntelligenceSignals`, `loadOutages`, `loadAisSignals`, `waitForAisData`
   - `loadCableActivity`, `loadProtests`, `loadFlightDelays`, `loadMilitary`
   - `loadFredData`, `loadOilAnalytics`, `loadGovernmentSpending`
   - `updateMonitorResults`, `runCorrelationAnalysis`, `loadFirmsData`
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~518 lines and now primarily remains as composition root + top-level orchestration entrypoints.

Phase 3 status:

1. Exit criteria met:
   - `App.ts` is primarily wiring/composition with minimal top-level orchestrator methods.
   - Data loader implementations are extracted into dedicated modules (`app/data/*`) and a runtime coordinator.

Next batch:

1. Start Phase 4 map layer architecture extraction (`Map.ts` / `DeckGLMap.ts` layer decomposition).

### 2026-02-13 (Batch 69, Completed)

Completed:

1. Started Phase 4 layer extraction from `src/components/DeckGLMap.ts` into dedicated modules:
   - Added `src/components/map/layers/deck-static-scatter-layers.ts`
   - Added `src/components/map/layers/deck-dynamic-scatter-layers.ts`
2. Moved static/weak-dependency scatter layer builders out of `DeckGLMap`:
   - irradiators, spaceports, ports
   - waterways, economic centers, APT groups, minerals
   - startup hubs, accelerators, cloud regions
3. Moved dynamic data-driven scatter layer builders out of `DeckGLMap`:
   - flight delays, earthquakes, natural events, fires
   - weather, outages, AIS density/disruptions
   - cable advisories, repair ships
   - military vessels/flights and cluster layers
4. Refactored `buildLayers()` in `DeckGLMap` to consume extracted layer modules.
5. Introduced initial shared map type boundary:
   - Added `src/components/map/shared/types.ts`
   - `Map.ts` and `DeckGLMap.ts` now both consume shared `MapTimeRange` and `GlobalMapView`.
6. Re-verified with `npm run typecheck` and `npm run build`.
7. `src/components/DeckGLMap.ts` reduced from ~3229 lines to ~2838 lines.

Phase 4 status:

1. In progress.
2. Layer extraction for deck.gl scatter layers has started and is now module-based.

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap` layer builders (`PathLayer`/`IconLayer`/news + hotspot-related logic) into additional `src/components/map/layers/*` modules.
2. Start shared interaction utility extraction between `Map.ts` and `DeckGLMap.ts` (view presets, zoom gating, and common map state helpers).

### 2026-02-13 (Batch 70, Completed)

Completed:

1. Continued Phase 4 extraction for analytics overlays in `DeckGLMap`:
   - Added `src/components/map/layers/deck-analytics-layers.ts`
   - Extracted:
     - `createUcdpEventsScatterLayer(...)`
     - `createDisplacementArcsLayer(...)`
     - `createClimateHeatmapLayer(...)`
2. Updated `buildLayers()` in `src/components/DeckGLMap.ts` to use analytics layer module functions.
3. Removed corresponding in-class layer builder methods from `DeckGLMap`.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/components/DeckGLMap.ts` reduced further to ~2786 lines.

Phase 4 status:

1. In progress with layered extraction pattern established:
   - static scatter layers: extracted
   - dynamic scatter layers: extracted
   - analytics overlays: extracted

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap` layer builders (`PathLayer`/`IconLayer`/hotspot/news composition) into focused layer modules.
2. Begin shared interaction/helper extraction for `Map.ts` + `DeckGLMap.ts` to reduce duplicate map state and visibility gating logic.

### 2026-02-13 (Batch 71, Completed)

Completed:

1. Continued Phase 4 extraction with core map overlay layers:
   - Added `src/components/map/layers/deck-core-layers.ts`
   - Extracted:
     - `createConflictZonesGeoLayer(...)`
     - `createHotspotsScatterLayer(...)`
2. Updated `buildLayers()` in `src/components/DeckGLMap.ts` to delegate conflict/hotspot layer construction to the new core layer module.
3. Removed corresponding in-class methods from `DeckGLMap`.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/components/DeckGLMap.ts` reduced further to ~2730 lines.

Phase 4 status:

1. In progress with modular layer extraction now covering:
   - core overlays
   - static scatter layers
   - dynamic scatter layers
   - analytics overlays

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap` layer builders:
   - `createCablesLayer()`
   - `createPipelinesLayer()`
   - `createBasesLayer()`
   - `createNuclearLayer()`
   - `createDatacentersLayer()`
   - `createNewsLocationsLayer()`
2. Start extraction of shared view/zoom gating helpers used by both `Map.ts` and `DeckGLMap.ts` into `src/components/map/shared/*`.

### 2026-02-13 (Batch 72, Completed)

Completed:

1. Continued Phase 4 extraction for icon-based deck layers:
   - Added `src/components/map/layers/deck-icon-layers.ts`
   - Extracted:
     - `createBasesIconLayer(...)`
     - `createNuclearIconLayer(...)`
     - `createDatacentersIconLayer(...)`
2. Updated `buildLayers()` in `src/components/DeckGLMap.ts` to call the new icon layer module.
3. Removed corresponding in-class methods from `DeckGLMap`.
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/components/DeckGLMap.ts` reduced further to ~2639 lines.

Phase 4 status:

1. In progress with most layer families now extracted.
2. Remaining in-class layer builders in `DeckGLMap`:
   - `createCablesLayer()`
   - `createPipelinesLayer()`
   - `createNewsLocationsLayer()`

Next batch:

1. Extract the remaining three `DeckGLMap` layer builders to `src/components/map/layers/*`.
2. Begin shared helper extraction for cross-map logic (`Map.ts` + `DeckGLMap.ts`) in `src/components/map/shared/*`.

### 2026-02-13 (Batch 73, Completed)

Completed:

1. Completed extraction of the last remaining in-class `DeckGLMap` layer builders:
   - Added `src/components/map/layers/deck-path-layers.ts`
   - Added `src/components/map/layers/deck-news-layers.ts`
   - Moved:
     - cables path layer builder
     - pipelines path layer builder
     - news locations + pulse layer builders
2. Refactored `buildLayers()` in `src/components/DeckGLMap.ts` to consume the new path/news layer modules with preserved cache signature behavior.
3. Removed corresponding in-class methods from `DeckGLMap`:
   - `createCablesLayer()`
   - `createPipelinesLayer()`
   - `createNewsLocationsLayer()`
   - `hexToRgba(...)` (moved to path layer module helper)
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/components/DeckGLMap.ts` reduced further to ~2508 lines.

### 2026-02-13 (Batch 74, Completed)

Completed:

1. Started shared interaction/helper extraction for map renderers:
   - Added `src/components/map/shared/layer-thresholds.ts`
   - Added `src/components/map/shared/view-presets.ts`
2. Updated `src/components/DeckGLMap.ts`:
   - uses shared `DECK_LAYER_ZOOM_THRESHOLDS`
   - uses shared `DECK_VIEW_PRESETS`
3. Updated `src/components/Map.ts`:
   - uses shared `SVG_LAYER_ZOOM_THRESHOLDS`
   - uses shared `SVG_VIEW_PRESETS` in `setView(...)`
4. Re-verified with `npm run typecheck` and `npm run build`.

Phase 4 status:

1. In progress with major extraction milestone reached:
   - `DeckGLMap` layer builders are now moduleized in `src/components/map/layers/*`.
   - key cross-map presets/thresholds are centralized in `src/components/map/shared/*`.

Next batch:

1. Continue Phase 4 by extracting shared state/interaction helpers (time-range filtering, layer visibility gating helpers, and map state mutation helpers) between `Map.ts` and `DeckGLMap.ts`.
2. Evaluate whether `Map.ts` can adopt the same per-layer module boundary pattern incrementally (starting from low-risk static overlays).

### 2026-02-13 (Batch 75, Completed)

Completed:

1. Continued Phase 4 shared interaction extraction:
   - Added `src/components/map/shared/visibility.ts`
   - Centralized layer visibility helper functions:
     - `isLayerVisibleAtZoom(...)`
     - `shouldSetLayerZoomOverride(...)`
     - `getLayerZoomVisibilityState(...)`
2. Updated `src/components/DeckGLMap.ts` to use shared visibility gating helper for zoom-threshold checks.
3. Updated `src/components/Map.ts` to use shared visibility helpers for:
   - layer toggle override decision
   - programmatic enable-layer override decision
   - zoom-based layer/label visibility and auto-hidden button state
4. Re-verified with `npm run typecheck` and `npm run build`.

Phase 4 status:

1. In progress with both goals actively addressed:
   - per-layer module extraction (DeckGLMap side) largely complete
   - shared map interaction helpers now centralized for both renderers

Next batch:

1. Continue shared-state extraction by evaluating reusable time-range/filtering helpers and map state mutation utilities.
2. Start incremental `Map.ts` layer module extraction using low-risk static overlays as first candidates.

### 2026-02-13 (Batch 76, Completed)

Completed:

1. Started incremental `Map.ts` layer module extraction (low-risk static overlays):
   - Added `src/components/map/layers/svg-overlay-markers.ts`
   - Extracted overlay marker renderers for:
     - strategic waterways
     - ports
     - APT markers
2. Updated `src/components/Map.ts`:
   - `renderOverlays(...)` now delegates those marker groups to module functions.
   - Added shared popup click adapter (`showOverlayPopupAtClick`) for extracted overlay modules.
3. Removed in-class methods from `Map.ts`:
   - `renderWaterways(...)`
   - `renderPorts(...)`
   - `renderAPTMarkers(...)`
4. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 77, Completed)

Completed:

1. Continued `Map.ts` extraction for AIS overlay rendering:
   - Added `src/components/map/layers/svg-ais-overlays.ts`
   - Extracted:
     - `renderAisDisruptionOverlayMarkers(...)`
     - `renderAisDensityOverlayLayer(...)`
2. Updated `src/components/Map.ts`:
   - `render()` delegates AIS density overlay rendering to module function.
   - `renderOverlays(...)` delegates AIS disruption marker rendering to module function.
3. Removed in-class methods from `Map.ts`:
   - `renderAisDisruptions(...)`
   - `renderAisDensity(...)`
4. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 78, Completed)

Completed:

1. Continued `Map.ts` overlay extraction for cable operational overlays:
   - Added `src/components/map/layers/svg-cable-overlays.ts`
   - Extracted `renderCableOperationsOverlayMarkers(...)` for:
     - cable advisories
     - repair ships
2. Updated `src/components/Map.ts`:
   - `renderOverlays(...)` now delegates cable advisory + repair ship marker rendering to module function.
3. Re-verified with `npm run typecheck` and `npm run build`.
4. `src/components/Map.ts` reduced further to ~3047 lines.

Phase 4 status:

1. In progress and accelerating:
   - `DeckGLMap` layer builders are fully moduleized.
   - `Map.ts` has started incremental overlay renderer modularization.
   - Shared map helpers (types, view presets, thresholds, visibility logic) are centralized under `src/components/map/shared/*`.

Next batch:

1. Continue incremental `Map.ts` extraction by targeting remaining low-risk overlay blocks (e.g., datacenter/minerals/weather/outages and similar marker groups).
2. Evaluate shared time-range/filter utility extraction and adopt where low-risk.

### 2026-02-13 (Batch 79, Completed)

Completed:

1. Continued incremental `Map.ts` overlay extraction:
   - Extended `src/components/map/layers/svg-overlay-markers.ts` with:
     - `renderIrradiatorOverlayMarkers(...)`
     - `renderSpaceportOverlayMarkers(...)`
2. Updated `src/components/Map.ts`:
   - `renderOverlays(...)` now delegates irradiator and spaceport marker rendering to the shared overlay marker module.
3. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 80, Completed)

Completed:

1. Continued incremental `Map.ts` extraction for AIS and cable operation overlays:
   - Added `src/components/map/layers/svg-ais-overlays.ts`
   - Added `src/components/map/layers/svg-cable-overlays.ts`
   - Extracted:
     - AIS disruptions markers
     - AIS density SVG layer
     - cable advisory + repair ship markers
2. Updated `src/components/Map.ts` to delegate the above blocks via module functions.
3. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 81, Completed)

Completed:

1. Continued incremental `Map.ts` extraction for risk/economic overlays:
   - Added `src/components/map/layers/svg-risk-overlays.ts`
   - Extracted:
     - economic center markers
     - weather alert markers
     - outage markers
2. Updated `src/components/Map.ts` `renderOverlays(...)` to delegate these blocks.
3. Re-verified with `npm run typecheck` and `npm run build`.
4. `src/components/Map.ts` reduced further to ~2978 lines.

Phase 4 status:

1. In progress with substantial `Map.ts` decomposition underway.
2. Map overlay renderer logic is now increasingly moduleized under `src/components/map/layers/*`.

Next batch:

1. Continue extracting remaining `Map.ts` overlay blocks (datacenter/minerals/natural/military clusters and other repeated marker groups) into layer modules.
2. Evaluate shared time-range/filter utility extraction and adopt where low-risk.

### 2026-02-13 (Batch 82, Completed)

Completed:

1. Continued `Map.ts` overlay extraction for infrastructure/static overlays:
   - Added `src/components/map/layers/svg-infra-overlays.ts`
   - Extracted:
     - conflict click areas
     - datacenter markers
     - minerals markers
2. Updated `src/components/Map.ts` `renderOverlays(...)` to delegate to the new infra overlay module.
3. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 83, Completed)

Completed:

1. Continued `Map.ts` overlay extraction for security overlays:
   - Added `src/components/map/layers/svg-security-overlays.ts`
   - Extracted:
     - nuclear facility markers
     - military base markers
2. Updated `src/components/Map.ts` `renderOverlays(...)` to delegate those blocks.
3. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 84, Completed)

Completed:

1. Continued `Map.ts` extraction for tech static overlays:
   - Added `src/components/map/layers/svg-tech-static-overlays.ts`
   - Extracted:
     - startup hub markers
     - cloud region markers
     - accelerator markers
2. Updated `src/components/Map.ts` `renderOverlays(...)` to delegate these tech static blocks.
3. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 85, Completed)

Completed:

1. Continued refactor cleanup and integration checks after the above extraction waves.
2. Re-verified with `npm run typecheck` and `npm run build`.
3. `src/components/Map.ts` reduced further to ~2791 lines.

Phase 4 status:

1. In progress and materially advanced:
   - `DeckGLMap` layers: fully moduleized.
   - `Map.ts` overlays: significant fraction now moduleized under `src/components/map/layers/*`.
   - shared map helpers centralized under `src/components/map/shared/*`.

Next batch:

1. Continue extracting remaining heavier `Map.ts` overlay blocks (hotspots, earthquakes, tech HQ/event clustering, activity markers, and selected military overlays).
2. Evaluate shared time-range/filter utility extraction and adopt where low-risk.

### 2026-02-13 (Batch 86, Completed)

Completed:

1. Continued `Map.ts` extraction for additional infrastructure/security overlays:
   - Added `src/components/map/layers/svg-infra-overlays.ts`
   - Added `src/components/map/layers/svg-security-overlays.ts`
2. Extracted and delegated:
   - conflict click areas
   - datacenter markers
   - mineral markers
   - nuclear markers
   - military base markers
3. Updated `src/components/Map.ts` `renderOverlays(...)` to consume the new modules.
4. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 87, Completed)

Completed:

1. Continued `Map.ts` extraction for tech static overlays:
   - Added `src/components/map/layers/svg-tech-static-overlays.ts`
2. Extracted and delegated:
   - startup hub markers
   - cloud region markers
   - accelerator markers
3. Updated `src/components/Map.ts` `renderOverlays(...)` to call module functions with shared popup callback + zoom context.
4. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 88, Completed)

Completed:

1. Continued natural layer decomposition:
   - Added `src/components/map/layers/svg-natural-overlays.ts`
   - Extracted:
     - natural event markers
     - fire markers
2. Updated `src/components/Map.ts` `renderOverlays(...)` to delegate those blocks.
3. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 89, Completed)

Completed:

1. Added `src/components/map/layers/svg-seismic-overlays.ts` for earthquake marker rendering.
2. Updated `src/components/Map.ts` to keep time filtering/logging in class and delegate earthquake marker DOM rendering to the new module.
3. Re-verified with `npm run typecheck` and `npm run build`.
4. `src/components/Map.ts` reduced further to ~2718 lines.

Phase 4 status:

1. In progress with strong momentum:
   - `DeckGLMap` layer composition remains fully moduleized.
   - `Map.ts` overlay logic is now split across multiple focused modules.
   - shared map behavior and presets remain centralized in `src/components/map/shared/*`.

Next batch:

1. Continue extracting remaining heavier `Map.ts` blocks:
   - hotspot rendering
   - tech HQ / tech events clustering overlays
   - tech/geo activity markers
   - selected military overlay segments
2. Evaluate shared time-range/filter utility extraction and adopt where low-risk.

### 2026-02-13 (Batch 90, Completed)

Completed:

1. Continued `Map.ts` extraction for natural/seismic overlays:
   - Added `src/components/map/layers/svg-natural-overlays.ts`
   - Added `src/components/map/layers/svg-seismic-overlays.ts`
2. Extracted and delegated:
   - natural event markers
   - fire markers
   - earthquake markers
3. Preserved in-class time filtering/logging behavior while offloading marker DOM rendering.
4. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 91, Completed)

Completed:

1. Continued `Map.ts` extraction for hotspot overlays:
   - Added `src/components/map/layers/svg-hotspot-overlays.ts`
   - Extracted hotspot marker DOM rendering into module.
2. Kept hotspot business behavior in `Map.ts` via dedicated callback:
   - related-news lookup
   - GDELT context loading
   - hotspot click callback dispatch
3. Re-verified with `npm run typecheck` and `npm run build`.

### 2026-02-13 (Batch 92, Completed)

Completed:

1. Consolidated integration and cleanup after recent extraction waves.
2. Re-verified with `npm run typecheck` and `npm run build`.
3. `src/components/Map.ts` reduced further to ~2703 lines.

Phase 4 status:

1. In progress with steady decomposition of `Map.ts` render logic into `src/components/map/layers/*`.
2. Shared map behavior boundaries (`shared/*`) remain stable and adopted by both map implementations.

Next batch:

1. Continue extracting remaining heavier `Map.ts` blocks:
   - tech HQ / tech events clustering overlays
   - tech/geo activity markers
   - selected military overlay segments
2. Evaluate shared time-range/filter utility extraction and adopt where low-risk.

### 2026-02-13 (Batch 68, Completed)

Completed:

1. Finalized Phase 3 coordinator boundary tightening:
   - `runtime-loader-coordinator` now owns:
     - `loadAllData(...)`
     - `loadDataForLayer(...)`
     - `setupRefreshIntervals(...)`
2. Updated `src/App.ts` to delegate these orchestration entrypoints directly to coordinator APIs.
3. Removed corresponding wrapper methods from `src/App.ts`.
4. Converted remaining App behavior hooks to private callback fields:
   - `openCountryStory`
   - `renderCriticalBanner`
5. Re-verified with `npm run typecheck` and `npm run build`.
6. `src/App.ts` reduced to ~439 lines with no private method definitions (composition root + lifecycle shell).

Phase 3 status:

1. Fully complete and closed.

Next batch:

1. Start Phase 4 map layer architecture extraction (`Map.ts` / `DeckGLMap.ts` layer decomposition).

### 2026-02-13 (Batch 67, Completed)

Completed:

1. Extended runtime loader coordinator responsibilities in `src/app/data/runtime-loader-coordinator.ts`:
   - added orchestrator-level methods:
     - `loadAllData(...)`
     - `loadDataForLayer(...)`
     - `setupRefreshIntervals(...)`
2. Refactored `src/App.ts` to delegate these entrypoints to coordinator methods and removed remaining wrapper methods:
   - removed:
     - `loadAllData()`
     - `loadDataForLayer(...)`
     - `setupRefreshIntervals()`
3. `src/App.ts` now keeps only top-level composition/orchestration shell plus two focused UI callbacks:
   - `openCountryStory(...)`
   - `renderCriticalBanner(...)`
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/App.ts` reduced further to ~445 lines.

Phase 3 status:

1. Fully complete with stricter boundary:
   - `App.ts` is now a composition root with minimal behavior callbacks.
   - Runtime loaders/startup/layout/lifecycle concerns are extracted to dedicated modules.

Next batch:

1. Start Phase 4 map layer architecture extraction (`Map.ts` / `DeckGLMap.ts` layer decomposition).

### 2026-02-13 (Batch 93, Completed)

Completed:

1. Continued `Map.ts` layer decomposition for military overlays:
   - Added `src/components/map/layers/svg-military-overlays.ts`
   - Extracted military flights/vessels/clusters DOM marker rendering and SVG track-line generation.
2. Simplified `Map.ts` popup trigger paths:
   - Added shared `projectPoint(...)` and `showPopupAtPosition(...)` helpers.
   - Refactored hotspot/conflict/base/pipeline/cable/datacenter/nuclear/irradiator trigger methods to use shared helpers.
3. Introduced shared clustering utility:
   - Added `src/components/map/shared/clustering.ts` with `clusterGeospatialMarkers(...)`.
   - Replaced duplicated clustering core logic in:
     - `src/components/Map.ts`
     - `src/components/DeckGLMap.ts`
4. Re-verified with `npm run typecheck` and `npm run build`.
5. `src/components/Map.ts` reduced further to ~2224 lines.

Phase 4 status:

1. In progress with continued decomposition of render and interaction concerns.
2. Cross-map (`Map.ts` + `DeckGLMap.ts`) shared primitives now include view presets, zoom thresholds, visibility helpers, and clustering core.

Next batch:

1. Continue extracting remaining `Map.ts` orchestration-heavy blocks (render dispatch segmentation by domain).
2. Evaluate popup/interaction helper reuse opportunities across `Map.ts` and `DeckGLMap.ts`.

### 2026-02-13 (Batch 94, Completed)

Completed:

1. Continued Phase 4 map orchestration simplification in `src/components/Map.ts`:
   - Split `renderOverlays(...)` into focused stage methods:
     - `renderStrategicOverlays(...)`
     - `renderSecurityOverlays(...)`
     - `renderSeismicOverlays(...)`
     - `renderRiskAndInfraOverlays(...)`
     - `renderTechVariantOverlays(...)`
     - `renderOpsAndMilitaryOverlays(...)`
     - `renderNaturalOverlays(...)`
   - Added cluster-radius helpers (`getClusterRadius`, `getProtestClusterRadius`).
2. Unified popup trigger duplication in `src/components/Map.ts`:
   - Added generic trigger helper `triggerPopupForEntity(...)`.
   - Added `getMidpoint(...)` helper.
   - Refactored all `trigger*Click` entrypoints to use shared trigger flow.
3. Mirrored popup trigger unification in `src/components/DeckGLMap.ts`:
   - Added `showPopupAtScreenPosition(...)`, `getMidpoint(...)`, `triggerPopupForEntity(...)`.
   - Refactored all `trigger*Click` entrypoints to use shared trigger flow.
4. Added shared hotspot helpers in `src/components/map/shared/`:
   - `hotspot-activity.ts` with `assessHotspotActivity(...)` (adopted by `Map.ts`).
   - `hotspot-news.ts` with `getRelatedNewsForHotspot(...)` (adopted by both `Map.ts` and `DeckGLMap.ts`).
5. Re-verified with `npm run typecheck` and `npm run build`.

Phase 4 status:

1. In progress and stable.
2. `Map.ts` and `DeckGLMap.ts` now share more logic via `map/shared/*`:
   - visibility/view/zoom thresholds
   - clustering core
   - hotspot related-news matching
   - hotspot activity scoring (SVG map path)

Next batch:

1. Continue extracting `DeckGLMap.ts` large `renderClusterOverlays(...)` workflow into layer/domain helpers.
2. Evaluate moving additional map interaction/util primitives into `map/shared/*` where behavior is already equivalent.

### 2026-02-13 (Batch 95, Completed)

Completed:

1. Continued Phase 4 `DeckGLMap` decomposition for cluster overlays:
   - Refactored `renderClusterOverlays(...)` into domain methods:
     - `renderTechClusterOverlays(...)`
     - `renderProtestClusterOverlays(...)`
     - `renderDatacenterClusterOverlays(...)`
   - Added shared in-class helpers for cluster workflow:
     - `getCachedClusters(...)`
     - `renderClusterSet(...)`
     - per-domain radius helpers.
2. Extracted cluster DOM element factories from `DeckGLMap.ts` into:
   - `src/components/map/layers/deck-cluster-overlay-elements.ts`
   - Includes factories for tech HQ, tech events, protests, datacenter clusters.
3. Centralized popup dispatch in `DeckGLMap.ts`:
   - Added `showPopupAtCoordinates(...)` as single popup invocation path.
   - Routed overlay-click and map-click popup flows through this helper.
4. Standardized shared cluster typing:
   - `ScreenCluster<T>` exported from new layer module and reused by `DeckGLMap.ts`.
5. Re-verified with `npm run typecheck` and `npm run build`.
6. `src/components/DeckGLMap.ts` reduced further to ~2298 lines.

Phase 4 status:

1. In progress and stable with stronger map-layer boundaries.
2. `DeckGLMap.ts` cluster rendering now split between:
   - orchestration (`DeckGLMap.ts`)
   - element factories (`map/layers/deck-cluster-overlay-elements.ts`).

Next batch:

1. Align `DeckGLMap` hotspot activity update path with shared hotspot activity utilities where behavior can be preserved.
2. Continue reducing `DeckGLMap.ts` orchestration size by extracting additional focused helpers from monolithic methods.

### 2026-02-13 (Batch 96, Completed)

Completed:

1. Continued `DeckGLMap` layer extraction by moving cluster DOM factories into:
   - `src/components/map/layers/deck-cluster-overlay-elements.ts`
   - Extracted factories:
     - tech HQ clusters
     - tech event clusters
     - protest clusters
     - datacenter clusters
2. Updated `DeckGLMap` cluster orchestrator to consume extracted factories:
   - `renderTechClusterOverlays(...)`
   - `renderProtestClusterOverlays(...)`
   - `renderDatacenterClusterOverlays(...)`
   now delegate element creation to layer module.
3. Centralized popup display path in `DeckGLMap`:
   - added `showPopupAtCoordinates(...)`
   - routed click and trigger flows through this helper.
4. Extended shared hotspot activity utilities:
   - added `assessRecentHotspotActivity(...)` in `src/components/map/shared/hotspot-activity.ts`
   - `DeckGLMap.updateHotspotActivity(...)` now delegates recent-window hotspot match/velocity computation to this shared helper.
5. Re-verified with `npm run typecheck` and `npm run build`.
6. `src/components/DeckGLMap.ts` reduced further to ~2287 lines.

Phase 4 status:

1. In progress with improved module boundaries across both map engines.
2. Cluster-rendering responsibilities in DeckGL are now split cleanly between:
   - orchestration/caching (`DeckGLMap.ts`)
   - element rendering (`map/layers/deck-cluster-overlay-elements.ts`).

Next batch:

1. Continue extracting remaining dense `DeckGLMap.ts` UI/interaction sections into focused modules/helpers.
2. Evaluate whether additional hotspot overlay DOM logic can be safely extracted from `DeckGLMap.ts` into layer module(s) without behavior drift.

### 2026-02-13 (Batch 97, Completed)

Completed:

1. Extracted DeckGL hotspot overlay DOM logic into:
   - `src/components/map/layers/deck-hotspot-overlays.ts`
   - Added reusable helpers:
     - hotspot sorting (`getSortedHighActivityHotspots`)
     - marker scaling (`getHotspotMarkerScale`)
     - transform application (`applyHotspotOverlayTransform`)
     - element creation (`createHotspotOverlayElement`)
     - hotspot key parsing (`parseHotspotClusterKey`)
2. Updated `DeckGLMap.ts` hotspot overlay paths to delegate to extracted helpers:
   - `renderHotspotOverlays(...)`
   - `updateHotspotPositions(...)`
3. Extracted DeckGL UI config/content constants into dedicated modules:
   - `src/components/map/layers/deck-layer-help-content.ts`
   - `src/components/map/layers/deck-layer-toggle-config.ts`
   - `src/components/map/layers/deck-legend-config.ts`
4. Refactored `DeckGLMap.ts` to consume extracted modules:
   - `showLayerHelp(...)` now uses `getDeckLayerHelpContent(...)`
   - `createLayerToggles(...)` now uses `getDeckLayerToggleConfig(...)`
   - `createLegend(...)` now uses `getDeckLegendConfig(...)`
5. Re-verified with `npm run typecheck` and `npm run build`.
6. `src/components/DeckGLMap.ts` reduced further to ~2162 lines.

Phase 4 status:

1. In progress with continued reduction of `DeckGLMap.ts` monolithic UI/render responsibilities.
2. Overlay rendering, cluster rendering, hotspot rendering, and UI configuration are now increasingly separated into dedicated layer modules.

Next batch:

1. Continue extracting remaining dense `DeckGLMap.ts` interaction/control sections (e.g., control creation/event wiring) into focused helpers/modules.
2. Evaluate additional opportunities to align shared helper usage between `Map.ts` and `DeckGLMap.ts`.

### 2026-02-14 (Batch 98, Completed)

Completed:

1. Started Phase 5 service-level unit test expansion using Node native test runner without introducing a new framework:
   - Added TypeScript module loader helper for test-time transpile/import:
     - `tests/unit/_ts-module-loader.mjs`
2. Added threat-classification fallback regression tests:
   - `tests/unit/classify-event.test.mjs`
   - Covers:
     - missing API key fallback (`503` + `fallback: true`)
     - upstream model failure fallback
     - invalid LLM JSON fallback
3. Added temporal baseline client-flow tests:
   - `tests/unit/temporal-baseline-client.test.mjs`
   - Covers:
     - unavailable baseline API safe-null behavior
     - `updateAndCheck(...)` anomaly sorting/severity mapping and fire-and-forget update semantics
4. Added data-freshness transition tests:
   - `tests/unit/data-freshness.test.mjs`
   - Covers:
     - time-window status transitions (`fresh` -> `stale` -> `very_stale` -> `no_data`)
     - risk coverage degradation and critical intelligence-gap signaling
5. Updated regression docs with unit-test command and coverage notes:
   - `README.md` (`Regression Testing` section)
6. Re-verified with:
   - `npm run test:unit`
   - `npm run typecheck`
   - `npm run build`

Phase 5 status:

1. In progress and now covering all high-risk target behaviors defined in Phase 5 scope:
   - threat classification fallback
   - tech-events geocoding normalization
   - temporal baseline client logic
   - data freshness status transitions

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap.ts` control/event orchestration helpers.
2. Add one integration-style smoke test batch for critical app flows (startup + loader coordinator contract) to move Phase 5 toward formal close.

### 2026-02-14 (Batch 99, Completed)

Completed:

1. Continued Phase 4 by extracting DeckGL control/time-slider UI orchestration into shared helper module:
   - Added `src/components/map/shared/deck-controls.ts`
   - Added:
     - `createDeckControlsElement(...)`
     - `createDeckTimeSliderElement(...)`
2. Updated `src/components/DeckGLMap.ts`:
   - `createControls()` now delegates control DOM creation/event wiring.
   - `createTimeSlider()` now delegates time-range button rendering and click handling.
3. Kept behavior parity (same zoom/view/time interactions) while reducing monolithic class UI wiring.
4. Re-verified with:
   - `npm run test:unit`
   - `npm run typecheck`
   - `npm run build`
5. `src/components/DeckGLMap.ts` reduced further to ~2094 lines.

Phase 4 status:

1. In progress with additional UI/control extraction completed.
2. Remaining high-density areas are now concentrated in interaction handlers and popup/country-hover control flow.

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap.ts` interaction/event sections into focused helper modules.
2. Add integration-style smoke checks for runtime startup/loader coordinator paths to formally close Phase 5.

### 2026-02-14 (Batch 100, Completed)

Completed:

1. Continued Phase 4 extraction for DeckGL UI orchestration:
   - Added `src/components/map/shared/deck-ui-panels.ts`
   - Extracted:
     - layer toggle panel creation/event wiring (`createDeckLayerTogglePanel(...)`)
     - layer-help popup lifecycle (`toggleDeckLayerHelpPopup(...)`)
     - legend rendering (`createDeckLegendElement(...)`)
     - timestamp rendering/update helpers (`createDeckTimestampElement(...)`, `updateDeckTimestampElement(...)`)
2. Updated `src/components/DeckGLMap.ts` to delegate:
   - `createLayerToggles()`
   - `showLayerHelp()`
   - `createLegend()`
   - `createTimestamp()` / `updateTimestamp()`
   to the new shared helper module.
3. Expanded Phase 5 with runtime orchestration smoke tests:
   - `tests/unit/guarded-load.test.mjs` (task guarding/error surfacing/in-flight clearing)
   - `tests/unit/layer-load-dispatch.test.mjs` (layer-to-loader routing contract)
   - `tests/unit/refresh-scheduler.test.mjs` (reschedule behavior, condition gating)
4. Updated regression docs:
   - `README.md` Regression Testing now includes runtime orchestration primitive coverage.
5. Re-verified with:
   - `npm run test:unit` (19/19 pass)
   - `npm run typecheck`
   - `npm run build`
6. `src/components/DeckGLMap.ts` reduced further to ~1998 lines.

Phase status:

1. Phase 4 remains in progress (interaction/country-boundary dense sections still to modularize).
2. Phase 5 core scope is now functionally covered (service behavior + runtime orchestration smoke checks), pending formal close after one final startup-path validation pass.

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap.ts` interaction-heavy sections (country boundary/hover/highlight and popup trigger helpers) into shared modules.
2. Run one startup-path smoke validation batch and formally close Phase 5.

### 2026-02-14 (Batch 101, Completed)

Completed:

1. Continued Phase 4 extraction for DeckGL country interaction flow:
   - Added `src/components/map/shared/deck-country-boundaries.ts`
   - Extracted:
     - country boundary source/layer bootstrapping (`loadDeckCountryBoundaries(...)`)
     - hover wiring and pointer cursor handling
     - highlight/clear helpers (`setDeckCountryHighlight(...)`, `clearDeckCountryHighlight(...)`)
2. Updated `src/components/DeckGLMap.ts` to delegate:
   - `loadCountryBoundaries()`
   - `highlightCountry()`
   - `clearCountryHighlight()`
   and removed in-class `setupCountryHover()` implementation.
3. Added lifecycle startup/teardown smoke coverage for runtime shell:
   - `tests/unit/destroy-lifecycle.test.mjs`
   - validates timer cleanup, listener teardown, map destroy, refresh cancel, and AIS disconnect behavior.
4. Re-verified with:
   - `npm run test:unit` (20/20 pass)
   - `npm run typecheck`
   - `npm run build`
5. `src/components/DeckGLMap.ts` reduced further to ~1917 lines.

Phase status:

1. Phase 4 remains in progress (mainly popup trigger/helper extraction and remaining dense interaction sections).
2. Phase 5 is now complete and can be considered closed (service logic + runtime orchestration/lifecycle smoke checks are automated).

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap.ts` popup trigger/interaction helpers into `map/shared/*`.
2. Start Phase 6 performance/release hardening baseline collection once Phase 4 reaches close threshold.

### 2026-02-14 (Batch 102, Completed)

Completed:

1. Continued Phase 4 cross-map interaction extraction:
   - Added shared popup trigger utility module:
     - `src/components/map/shared/popup-triggers.ts`
   - Extracted:
     - polyline midpoint helper (`getPolylineMidpoint(...)`)
     - generic entity popup trigger flow with strict/lenient position semantics (`triggerEntityPopup(...)`)
2. Updated `src/components/DeckGLMap.ts` popup trigger paths to use shared utility:
   - `triggerHotspotClick(...)`
   - `triggerConflictClick(...)`
   - `triggerBaseClick(...)`
   - `triggerPipelineClick(...)`
   - `triggerCableClick(...)`
   - `triggerDatacenterClick(...)`
   - `triggerNuclearClick(...)`
   - `triggerIrradiatorClick(...)`
3. Updated `src/components/Map.ts` popup trigger paths to use the same shared utility and removed duplicated midpoint/trigger helper logic.
4. Added shared-helper regression tests:
   - `tests/unit/popup-triggers.test.mjs`
   - Covers midpoint computation and strict/lenient popup trigger behaviors.
5. Re-verified with:
   - `npm run test:unit` (23/23 pass)
   - `npm run typecheck`
   - `npm run build`

Phase status:

1. Phase 4 remains in progress but now has additional cross-map interaction deduplication (`Map.ts` + `DeckGLMap.ts`) under `map/shared/*`.
2. Phase 5 remains closed.

Next batch:

1. Continue Phase 4 by extracting remaining dense `DeckGLMap.ts` interaction sections (flash/popup projection helpers and related UI wiring) where behavior can stay stable.
2. Begin Phase 6 baseline notes collection (render cadence and bundle/reload checkpoints) once Phase 4 extraction threshold is met.

### 2026-02-14 (Batch 103, Completed)

Completed:

1. Started Phase 6 baseline documentation:
   - Added `docs/PERFORMANCE_BASELINE.md`
   - Captured:
     - build/test/typecheck command baseline
     - current bundle sizes and build time snapshot
     - current warning inventory
     - current high-impact file size metrics (`App.ts`, `Map.ts`, `DeckGLMap.ts`)
2. Documented initial optimization candidates for next Phase 6 iterations:
   - chunking and lazy-load opportunities
   - mixed static/dynamic import warning cleanup
   - map update cadence profiling targets

Phase status:

1. Phase 4 remains in progress.
2. Phase 5 remains closed.
3. Phase 6 is now initiated with baseline metrics documented.

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap.ts` interaction-heavy helpers (flash/projection/popup glue) into shared modules.
2. Apply first targeted Phase 6 optimization pass (starting with warning-reduction candidates that have low behavior risk).

### 2026-02-14 (Batch 104, Completed)

Completed:

1. Continued Phase 4 shared-interaction extraction:
   - Added `src/components/map/shared/popup-triggers.ts`
   - Centralized:
     - polyline midpoint helper (`getPolylineMidpoint(...)`)
     - typed generic entity popup trigger orchestration (`triggerEntityPopup(...)`)
2. Updated both map engines to use shared popup trigger helper:
   - `src/components/DeckGLMap.ts` trigger methods now route through `triggerEntityPopup(...)`
   - `src/components/Map.ts` trigger methods now route through the same shared helper
3. Added regression coverage:
   - `tests/unit/popup-triggers.test.mjs`
4. Applied first Phase 6 low-risk optimization pass:
   - `src/services/rss.ts` moved from dynamic `import('./data-freshness')` to static import.
   - Removed mixed static/dynamic import warning for `data-freshness` from build output.
5. Added/updated performance baseline docs:
   - `docs/PERFORMANCE_BASELINE.md` with Pass 1 results.
6. Re-verified with:
   - `npm run test:unit` (23/23 pass)
   - `npm run typecheck`
   - `npm run build`

Phase status:

1. Phase 4 remains in progress.
2. Phase 5 remains closed.
3. Phase 6 in progress (baseline + first low-risk warning reduction completed).

Next batch:

1. Continue Phase 4 by extracting remaining `DeckGLMap.ts` flash/projection interaction helpers to reduce monolithic runtime glue.
2. Continue Phase 6 with next low-risk optimization pass (manual chunking strategy draft and measurement).

### 2026-02-14 (Batch 105, Completed)

Completed:

1. Continued Phase 4 extraction for DeckGL interaction glue:
   - Added `src/components/map/shared/deck-screen.ts`
   - Extracted:
     - map screen projection helper (`projectDeckLocationToScreen(...)`)
     - popup fallback position resolver (`resolveDeckPopupPosition(...)`)
     - flash marker rendering/style bootstrap (`flashDeckLocationMarker(...)`)
2. Updated `src/components/DeckGLMap.ts` to delegate:
   - popup screen-position fallback handling
   - lat/lon-to-screen projection in trigger flows
   - flash marker DOM/style logic
3. Phase 6 optimization pass (manual chunking initial rollout):
   - Updated `vite.config.ts` `manualChunks(...)` strategy for major vendor groups.
   - Resolved initial circular chunk warning by co-locating `@loaders.gl` with `vendor-deckgl`.
4. Updated `docs/PERFORMANCE_BASELINE.md` with Phase 6 Pass 2 measurements and warning status.
5. Re-verified with:
   - `npm run test:unit` (23/23 pass)
   - `npm run typecheck`
   - `npm run build`
6. `src/components/DeckGLMap.ts` reduced further to ~1888 lines.

Phase status:

1. Phase 4 remains in progress.
2. Phase 5 remains closed.
3. Phase 6 remains in progress (Pass 1 + Pass 2 completed).

Next batch:

1. Continue Phase 4 by extracting any remaining dense DeckGL runtime helper blocks and then evaluate close criteria.
2. Continue Phase 6 with a low-risk follow-up on remaining large-chunk pressure (deferred loading candidates and chunk strategy refinement).

### 2026-02-14 (Batch 106, Completed)

Completed:

1. Continued Phase 4 DeckGL interaction/UI helper extraction:
   - Added `src/components/map/shared/deck-layer-toggle-ui.ts`
     - centralizes layer toggle checked/loading/ready/visibility DOM state updates.
   - Added `src/components/map/shared/asset-flash.ts`
     - centralizes temporary asset highlight flash lifecycle.
2. Updated `src/components/DeckGLMap.ts` to delegate:
   - `hideLayerToggle(...)`
   - `setLayerLoading(...)`
   - `setLayerReady(...)`
   - `enableLayer(...)`
   - `toggleLayer(...)`
   - `flashAssets(...)`
   to shared helpers.
3. Re-verified with:
   - `npm run test:unit` (23/23 pass)
   - `npm run typecheck`
   - `npm run build`
4. `src/components/DeckGLMap.ts` reduced further to ~1875 lines.

Phase status:

1. Phase 4 remains in progress (but interaction/UI runtime glue is now significantly reduced and modularized).
2. Phase 5 remains closed.
3. Phase 6 remains in progress.

Next batch:

1. Reassess Phase 4 close criteria and decide whether remaining `DeckGLMap` dense sections (cluster orchestration + tooltip/click handlers) need further extraction now or can be stabilized.
2. Continue Phase 6 with deferred-loading candidate pass and chunk strategy refinement.

### 2026-02-14 (Batch 107, Completed)

Completed:

1. Continued Phase 4 extraction for DeckGL interaction-heavy sections:
   - Added `src/components/map/shared/deck-interaction.ts`
   - Extracted:
     - tooltip HTML generation switch (`getDeckTooltipHtml(...)`)
     - click layer-to-popup mapping and conflict-zone data normalization (`resolveDeckClickPopup(...)`)
2. Updated `src/components/DeckGLMap.ts`:
   - `getTooltip(...)` now delegates to shared interaction helper.
   - `handleClick(...)` now delegates popup mapping/normalized data resolution.
3. Additional DeckGL runtime glue extraction completed:
   - Layer toggle UI state helpers (`deck-layer-toggle-ui.ts`) adopted for toggle visibility/loading/ready/checked paths.
   - asset flash lifecycle helper (`asset-flash.ts`) adopted by `flashAssets(...)`.
4. Phase 6 chunk strategy refinement:
   - Extended `vite.config.ts` `manualChunks(...)` with `app-map` split for local map-heavy source modules.
   - Build outcome: main `index` chunk reduced materially (~1.04 MB -> ~0.48 MB pre-gzip) with new `app-map` chunk (~0.56 MB).
5. Updated performance baseline docs:
   - `docs/PERFORMANCE_BASELINE.md` (`Phase 6 Pass 3`).
6. Re-verified with:
   - `npm run test:unit` (23/23 pass)
   - `npm run typecheck`
   - `npm run build`
7. `src/components/DeckGLMap.ts` reduced further to ~1747 lines.

Phase status:

1. Phase 4 remains in progress but now near closure threshold (major layer/UI/interaction domains are moduleized).
2. Phase 5 remains closed.
3. Phase 6 remains in progress with three iterative baseline/optimization passes completed.

Next batch:

1. Evaluate formal Phase 4 close criteria against current `Map.ts`/`DeckGLMap.ts` decomposition and close if no additional high-value extraction remains.
2. Continue Phase 6 by identifying one safe deferred-loading candidate (non-critical panel/runtime path) for further chunk pressure reduction.

### 2026-02-14 (Batch 108, Completed)

Completed:

1. Phase 6 deferred-loading follow-up implemented (low risk):
   - Updated `src/app/lifecycle/runtime-startup.ts`
   - `setupSourcesModal` now lazy-loads `app/layout/sources-modal` via dynamic import on demand.
2. Build result confirms deferred chunk split:
   - New async chunk: `sources-modal-*.js` (~2.5 KB pre-gzip)
   - Main `index` chunk reduced slightly.
3. Updated performance baseline documentation:
   - `docs/PERFORMANCE_BASELINE.md` (`Phase 6 Pass 4`).
4. Re-verified with:
   - `npm run test:unit` (23/23 pass)
   - `npm run typecheck`
   - `npm run build`

Phase 4 close assessment:

1. Exit criteria are met and Phase 4 is now closed.
2. Rationale:
   - `DeckGLMap` layer builders and major interaction/UI blocks are modularized under `src/components/map/layers/*` and `src/components/map/shared/*`.
   - Shared map logic is now centralized (visibility/thresholds/presets/clustering/hotspot/popup helpers), reducing dual-engine drift risk.
   - `MapContainer` remains the stable adapter boundary.
3. Residual map complexity remains (especially `Map.ts` orchestration), but it is now mostly isolated to runtime composition and can be addressed as iterative hardening, not blocking Phase 4 goals.

Phase status:

1. Phase 4: Closed.
2. Phase 5: Closed.
3. Phase 6: In progress (Pass 1-4 completed).

Next batch:

1. Continue Phase 6 with targeted bundle-pressure reduction for remaining large vendor chunks (strategy + risk assessment).
2. Prepare release-hardening checklist draft (cache key/API contract/versioning checks) to satisfy Phase 6 exit criteria.

### 2026-02-14 (Batch 109, Completed)

Completed:

1. Added release-hardening checklist deliverable:
   - `docs/RELEASE_CHECKLIST.md`
2. Checklist scope includes:
   - build/test gates
   - variant validation
   - API contract and CORS/rate-limit guardrails
   - cache/data-freshness checks
   - map interaction regression checks
   - performance baseline comparison
   - deployment sanity and rollback notes

Phase status:

1. Phase 4: Closed.
2. Phase 5: Closed.
3. Phase 6: In progress with baseline, chunking, deferred-loading pass, and release checklist now in place.

Next batch:

1. Continue Phase 6 with targeted strategy for remaining large vendor chunks (`vendor-maplibre`, `vendor-deckgl`) and define acceptable threshold policy.
2. Validate release checklist against one end-to-end dry-run before final Phase 6 close decision.

### 2026-02-14 (Batch 110, Completed)

Completed:

1. Added executable bundle-size policy gate for large chunk pressure:
   - Added `scripts/check-bundle-budget.mjs`
   - Added `npm run check:bundle-budget`
2. Defined explicit chunk budget thresholds:
   - `index-*.js` <= 520 KB
   - `app-map-*.js` <= 620 KB
   - `vendor-deckgl-*.js` <= 900 KB
   - `vendor-maplibre-*.js` <= 1100 KB
   - `sources-modal-*.js` <= 6 KB
3. Integrated budget gate into release process documentation:
   - Updated `docs/RELEASE_CHECKLIST.md`
   - Updated `docs/PERFORMANCE_BASELINE.md` with `Phase 6 Pass 5`
4. Release-checklist dry run executed and documented:
   - Added `docs/RELEASE_DRY_RUN_2026-02-14.md`
   - Verified:
     - `npm run test:unit` (23/23 pass)
     - `npm run typecheck`
     - `npm run build:full`
     - `npm run build:tech`
     - `npm run check:bundle-budget` after each variant build
     - variant metadata outputs for full/tech (`title`, `canonical`)
5. Startup integration smoke path validated for both variants:
   - `VITE_VARIANT=full npx playwright test -g "serves requested runtime variant for this test run"`
   - `VITE_VARIANT=tech npx playwright test -g "serves requested runtime variant for this test run"`
6. Hardened e2e harness readiness behavior for non-ideal tile/style load conditions:
   - Updated `src/e2e/map-harness.ts`
   - Added style-load timeout fallback based on stable canvas + camera readiness.

Phase status:

1. Phase 4: Closed.
2. Phase 5: Closed.
3. Phase 6: Closed (bundle strategy + threshold policy + release dry-run evidence complete).

Next batch:

1. Optional: run full visual e2e suite (`test:e2e:visual:*`) before external release tag.
2. Optional: keep monitoring third-party warning deltas (`onnxruntime-web`, `@loaders.gl`) on dependency upgrades.
