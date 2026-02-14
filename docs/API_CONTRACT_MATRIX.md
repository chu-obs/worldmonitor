# API Contract Matrix (Phase 2)

Last updated: 2026-02-13

This matrix documents the currently enforced contract for key public API endpoints: CORS policy, allowed methods, cache behavior, and rate limits.

| Endpoint | CORS Policy | Methods | Cache Behavior | Rate Limit | Notes |
|---|---|---|---|---|---|
| `/api/finnhub` | Strict allowlist | `GET, OPTIONS` | `Cache-Control: public, max-age=30` | None | Market quotes proxy |
| `/api/fred-data` | Strict allowlist | `GET, OPTIONS` | `Cache-Control: public, max-age=3600` | None | FRED proxy |
| `/api/macro-signals` | Strict allowlist | `GET, OPTIONS` | `s-maxage=300`, stale fallback | None | In-memory signal cache |
| `/api/stablecoin-markets` | Strict allowlist | `GET, OPTIONS` | `s-maxage=120`, stale fallback | None | Upstream 429 fallback |
| `/api/etf-flows` | Strict allowlist | `GET, OPTIONS` | `s-maxage=900`, stale fallback | None | Yahoo chart aggregation |
| `/api/stock-index` | Strict allowlist | `GET, OPTIONS` | Server-side Redis cache (1h) | None | Country index weekly delta |
| `/api/country-intel` | Strict allowlist | `POST, OPTIONS` | Server-side Redis cache (2h) | 12 req / 10 min / IP | AI brief generation |
| `/api/groq-summarize` | Strict allowlist | `POST, OPTIONS` | Server-side Redis cache (24h) | 30 req / min / IP | Primary summarization provider |
| `/api/openrouter-summarize` | Strict allowlist | `POST, OPTIONS` | Server-side Redis cache (24h) | 10 req / min / IP | Summarization fallback provider |
| `/api/classify-event` | Strict allowlist | `GET, OPTIONS` | Server-side Redis cache (24h) | 60 req / min / IP | Headline threat classification |
| `/api/risk-scores` | Strict allowlist | `GET, OPTIONS` | Redis cache 10 min + stale fallback 1h | 20 req / min / IP | Cached CII/strategic risk |
| `/api/acled` | Strict allowlist | `GET, OPTIONS` | Redis + memory (10 min), stale fallback | 10 req / min / IP | Protest events |
| `/api/acled-conflict` | Strict allowlist | `GET, OPTIONS` | Redis + memory (10 min), stale fallback | 10 req / min / IP | Conflict events |
| `/api/ucdp-events` | Strict allowlist | `GET, OPTIONS` | Redis + memory (6h), stale fallback | 15 req / min / IP | GED events trailing window |
| `/api/unhcr-population` | Strict allowlist | `GET, OPTIONS` | Redis + memory (24h), stale fallback | 20 req / min / IP | Displacement aggregates |
| `/api/worldpop-exposure` | Strict allowlist | `GET, OPTIONS` | Countries cache 7d; exposure cache header 1h | 30 req / min / IP | Exposure estimation |
| `/api/climate-anomalies` | Strict allowlist | `GET, OPTIONS` | Redis + memory (6h), stale fallback | 15 req / min / IP | Open-Meteo anomalies |
| `/api/ais-snapshot` | Strict allowlist | `GET, OPTIONS` | Redis + memory (~8s hot cache), stale memory fallback | None | Relay snapshot |
| `/api/cloudflare-outages` | Strict allowlist | `GET, OPTIONS` | Upstream passthrough | None | Returns `{ configured: false }` when token missing |
| `/api/cache-telemetry` | Strict allowlist | `GET, OPTIONS` | `Cache-Control: no-store` | None | Operational metrics |
| `/api/temporal-baseline` | Strict allowlist | `GET, POST, OPTIONS` | `Cache-Control: no-store` | None | Baseline update + anomaly check |
| `/api/firms-fires` | Strict allowlist | `GET, OPTIONS` | `Cache-Control: public, max-age=600` | None | NASA FIRMS fire detections |
| `/api/rss-proxy` | Strict allowlist | `GET, OPTIONS` | `Cache-Control: public, max-age=300` | None | Domain-allowlisted RSS proxy |
| `/api/coingecko` | Explicit wildcard (`*`) | `GET, OPTIONS` | Redis + memory (120s), stale fallback | None | Public market proxy |
| `/api/polymarket` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=120` | None | Public market proxy |
| `/api/yahoo-finance` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=60` | None | Public market proxy |
| `/api/service-status` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=60` | None | Multi-provider status aggregation |
| `/api/opensky` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=30` | None | OpenSky states proxy |
| `/api/ucdp` | Explicit wildcard (`*`) | `GET, OPTIONS` | Redis + memory (24h), stale fallback | None | Country conflict classification |
| `/api/hapi` | Explicit wildcard (`*`) | `GET, OPTIONS` | Redis + memory (6h), stale fallback | None | HDX conflict summary |
| `/api/gdelt-geo` | Strict allowlist | `GET, OPTIONS` | `Cache-Control: public, max-age=300` | None | GDELT Geo endpoint proxy |
| `/api/arxiv` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=3600` | None | Returns XML feed payload |
| `/api/hackernews` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=300` | None | HN story list aggregation |
| `/api/github-trending` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=1800` | None | Primary+fallback upstream |
| `/api/gdelt-doc` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=300` | None | GDELT Doc 2.0 query |
| `/api/earthquakes` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=300` | None | USGS GeoJSON passthrough |
| `/api/faa-status` | Explicit wildcard (`*`) | `GET, OPTIONS` | Upstream passthrough | None | FAA XML passthrough |
| `/api/nga-warnings` | Explicit wildcard (`*`) | `GET, OPTIONS` | Upstream passthrough | None | NGA warnings proxy |
| `/api/fwdstart` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=1800` | None | Scraped RSS XML output |
| `/api/tech-events` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, s-maxage=1800` | None | Curated + feed-derived tech events |
| `/api/theater-posture` | Explicit wildcard (`*`) | `GET, OPTIONS` | Redis cache (5 min), stale fallback (24h), backup fallback (7d) | None | OpenSky primary + Wingbits fallback aggregation |
| `/api/worldbank` | Explicit wildcard (`*`) | `GET, OPTIONS` | `Cache-Control: public, max-age=3600` (indicators list: 24h) | None | World Bank v2 indicator proxy (Node runtime) |
| `/api/story` | Same-origin crawler endpoint | `GET` | `Cache-Control: public, max-age=300, s-maxage=300` | None | Bot-aware OG meta HTML, user redirect to SPA |
| `/api/og-story` | Same-origin crawler endpoint | `GET` | `Cache-Control: public, max-age=3600, s-maxage=3600` | None | Dynamic OG SVG card renderer |

## CORS Modes

- `Strict allowlist`: origin must match `api/_cors.js` strict origin patterns.
- `Explicit wildcard`: endpoint intentionally exposes `Access-Control-Allow-Origin: *` for read-only public data access.

## Response Contract

- Unified response helpers are in `api/_response.js`.
- Main helpers:
  - `jsonBody(payload, options)` for arbitrary JSON payloads.
  - `jsonOk(payload, options)` for success payloads.
  - `jsonError(message, options)` for normalized error payloads.
  - `jsonRaw(rawJson, options)` for upstream JSON passthrough.
  - `empty(status, corsHeaders)` for preflight responses.
- Node-handler adapters are in `api/_response-node.js`:
  - `nodeJson(res, payload, options)` for JSON payloads.
  - `nodeError(res, message, options)` for normalized Node error payloads.
  - `nodeSend(res, body, options)` for HTML/SVG/text payloads.
  - `nodeEmpty(res, status, headers)` for preflight/empty responses.
