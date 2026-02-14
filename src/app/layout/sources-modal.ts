import { FEEDS, INTEL_SOURCES, STORAGE_KEYS } from '@/config';
import { saveToStorage } from '@/utils';
import { escapeHtml } from '@/utils/sanitize';

interface SetupSourcesModalOptions {
  getDisabledSources: () => Set<string>;
  setDisabledSources: (next: Set<string>) => void;
}

function getAllSourceNames(): string[] {
  const sources = new Set<string>();
  Object.values(FEEDS).forEach((feeds) => {
    if (feeds) feeds.forEach((feed) => sources.add(feed.name));
  });
  INTEL_SOURCES.forEach((feed) => sources.add(feed.name));
  return Array.from(sources).sort((a, b) => a.localeCompare(b));
}

function renderSourceToggles(options: SetupSourcesModalOptions, filter = ''): void {
  const container = document.getElementById('sourceToggles');
  if (!container) return;

  const allSources = getAllSourceNames();
  const filterLower = filter.toLowerCase();
  const filteredSources = filter
    ? allSources.filter((source) => source.toLowerCase().includes(filterLower))
    : allSources;

  const disabledSources = options.getDisabledSources();
  container.innerHTML = filteredSources
    .map((source) => {
      const isEnabled = !disabledSources.has(source);
      const escaped = escapeHtml(source);
      return `
        <div class="source-toggle-item ${isEnabled ? 'active' : ''}" data-source="${escaped}">
          <div class="source-toggle-checkbox">${isEnabled ? '✓' : ''}</div>
          <span class="source-toggle-label">${escaped}</span>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.source-toggle-item').forEach((item) => {
    item.addEventListener('click', () => {
      const sourceName = (item as HTMLElement).dataset.source;
      if (!sourceName) return;

      const nextDisabledSources = new Set(options.getDisabledSources());
      if (nextDisabledSources.has(sourceName)) {
        nextDisabledSources.delete(sourceName);
      } else {
        nextDisabledSources.add(sourceName);
      }

      options.setDisabledSources(nextDisabledSources);
      saveToStorage(STORAGE_KEYS.disabledFeeds, Array.from(nextDisabledSources));
      renderSourceToggles(options, filter);
    });
  });

  const enabledCount = allSources.length - disabledSources.size;
  const counterEl = document.getElementById('sourcesCounter');
  if (counterEl) {
    counterEl.textContent = `${enabledCount}/${allSources.length} enabled`;
  }
}

export function setupSourcesModalFlow(options: SetupSourcesModalOptions): void {
  document.getElementById('sourcesBtn')?.addEventListener('click', () => {
    document.getElementById('sourcesModal')?.classList.add('active');
    const searchInput = document.getElementById('sourcesSearch') as HTMLInputElement | null;
    if (searchInput) searchInput.value = '';
    renderSourceToggles(options);
  });

  document.getElementById('sourcesModalClose')?.addEventListener('click', () => {
    document.getElementById('sourcesModal')?.classList.remove('active');
  });

  document.getElementById('sourcesModal')?.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      document.getElementById('sourcesModal')?.classList.remove('active');
    }
  });

  document.getElementById('sourcesSearch')?.addEventListener('input', (event) => {
    const filter = (event.target as HTMLInputElement).value;
    renderSourceToggles(options, filter);
  });

  document.getElementById('sourcesSelectAll')?.addEventListener('click', () => {
    const nextDisabledSources = new Set<string>();
    options.setDisabledSources(nextDisabledSources);
    saveToStorage(STORAGE_KEYS.disabledFeeds, []);
    const filter = (document.getElementById('sourcesSearch') as HTMLInputElement | null)?.value || '';
    renderSourceToggles(options, filter);
  });

  document.getElementById('sourcesSelectNone')?.addEventListener('click', () => {
    const allSources = getAllSourceNames();
    const nextDisabledSources = new Set(allSources);
    options.setDisabledSources(nextDisabledSources);
    saveToStorage(STORAGE_KEYS.disabledFeeds, allSources);
    const filter = (document.getElementById('sourcesSearch') as HTMLInputElement | null)?.value || '';
    renderSourceToggles(options, filter);
  });
}
