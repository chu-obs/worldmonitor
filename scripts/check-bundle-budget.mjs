#!/usr/bin/env node

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');

const budgets = [
  { name: 'index', pattern: /^index-.*\.js$/, maxKb: 520, required: true },
  { name: 'app-map', pattern: /^app-map-.*\.js$/, maxKb: 620, required: true },
  { name: 'vendor-deckgl', pattern: /^vendor-deckgl-.*\.js$/, maxKb: 900, required: true },
  { name: 'vendor-maplibre', pattern: /^vendor-maplibre-.*\.js$/, maxKb: 1100, required: true },
  { name: 'sources-modal', pattern: /^sources-modal-.*\.js$/, maxKb: 6, required: false },
];

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

const files = readdirSync(assetsDir);
let hasFailures = false;

console.log('[bundle-budget] Checking dist/assets chunk sizes...');

for (const budget of budgets) {
  const matches = files.filter((name) => budget.pattern.test(name));
  if (matches.length === 0) {
    if (budget.required) {
      hasFailures = true;
      console.error(`[bundle-budget] FAIL ${budget.name}: required chunk not found`);
    } else {
      console.log(`[bundle-budget] SKIP ${budget.name}: optional chunk not found`);
    }
    continue;
  }

  const largest = matches
    .map((name) => {
      const size = statSync(join(assetsDir, name)).size;
      return { name, size };
    })
    .sort((a, b) => b.size - a.size)[0];

  const limitBytes = budget.maxKb * 1024;
  const status = largest.size <= limitBytes ? 'PASS' : 'FAIL';

  console.log(
    `[bundle-budget] ${status} ${budget.name}: ${largest.name} ` +
    `${formatKb(largest.size)} / limit ${budget.maxKb} KB`
  );

  if (status === 'FAIL') {
    hasFailures = true;
  }
}

if (hasFailures) {
  process.exitCode = 1;
  console.error('[bundle-budget] One or more chunk budgets exceeded.');
} else {
  console.log('[bundle-budget] All budgets satisfied.');
}
