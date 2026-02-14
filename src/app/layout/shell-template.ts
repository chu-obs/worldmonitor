interface BuildAppShellHtmlOptions {
  siteVariant: string;
  appVersion: string;
}

export function buildAppShellHtml(options: BuildAppShellHtmlOptions): string {
  return `
      <div class="header">
        <div class="header-left">
          <div class="variant-switcher">
            <a href="${options.siteVariant === 'tech' ? 'https://worldmonitor.app' : '#'}"
               class="variant-option ${options.siteVariant !== 'tech' ? 'active' : ''}"
               data-variant="world"
               title="Geopolitical Intelligence">
              <span class="variant-icon">🌍</span>
              <span class="variant-label">WORLD</span>
            </a>
            <span class="variant-divider"></span>
            <a href="${options.siteVariant === 'tech' ? '#' : 'https://tech.worldmonitor.app'}"
               class="variant-option ${options.siteVariant === 'tech' ? 'active' : ''}"
               data-variant="tech"
               title="Tech & AI Intelligence">
              <span class="variant-icon">💻</span>
              <span class="variant-label">TECH</span>
            </a>
          </div>
          <span class="logo">MONITOR</span><span class="version">v${options.appVersion}</span>
          <a href="https://x.com/eliehabib" target="_blank" rel="noopener" class="credit-link">
            <svg class="x-logo" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span class="credit-text">@eliehabib</span>
          </a>
          <a href="https://github.com/koala73/worldmonitor" target="_blank" rel="noopener" class="github-link" title="View on GitHub">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          </a>
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span>LIVE</span>
          </div>
          <div class="region-selector">
            <select id="regionSelect" class="region-select">
              <option value="global">Global</option>
              <option value="america">Americas</option>
              <option value="mena">MENA</option>
              <option value="eu">Europe</option>
              <option value="asia">Asia</option>
              <option value="latam">Latin America</option>
              <option value="africa">Africa</option>
              <option value="oceania">Oceania</option>
            </select>
          </div>
        </div>
        <div class="header-right">
          <button class="search-btn" id="searchBtn"><kbd>⌘K</kbd> Search</button>
          <button class="copy-link-btn" id="copyLinkBtn">Copy Link</button>
          <span class="time-display" id="timeDisplay">--:--:-- UTC</span>
          <button class="fullscreen-btn" id="fullscreenBtn" title="Toggle Fullscreen">⛶</button>
          <button class="settings-btn" id="settingsBtn">⚙ PANELS</button>
          <button class="sources-btn" id="sourcesBtn">📡 SOURCES</button>
        </div>
      </div>
      <div class="main-content">
        <div class="map-section" id="mapSection">
          <div class="panel-header">
            <div class="panel-header-left">
              <span class="panel-title">${options.siteVariant === 'tech' ? 'Global Tech' : 'Global Situation'}</span>
            </div>
            <button class="map-pin-btn" id="mapPinBtn" title="Pin map to top">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 17v5M9 10.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V16a1 1 0 001 1h12a1 1 0 001-1v-.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V7a1 1 0 011-1 1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v1a1 1 0 001 1 1 1 0 011 1v3.76z"/>
              </svg>
            </button>
          </div>
          <div class="map-container" id="mapContainer"></div>
          <div class="map-resize-handle" id="mapResizeHandle"></div>
        </div>
        <div class="panels-grid" id="panelsGrid"></div>
      </div>
      <div class="modal-overlay" id="settingsModal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Panel Settings</span>
            <button class="modal-close" id="modalClose">×</button>
          </div>
          <div class="panel-toggle-grid" id="panelToggles"></div>
        </div>
      </div>
      <div class="modal-overlay" id="sourcesModal">
        <div class="modal sources-modal">
          <div class="modal-header">
            <span class="modal-title">News Sources</span>
            <span class="sources-counter" id="sourcesCounter"></span>
            <button class="modal-close" id="sourcesModalClose">×</button>
          </div>
          <div class="sources-search">
            <input type="text" id="sourcesSearch" placeholder="Filter sources..." />
          </div>
          <div class="sources-toggle-grid" id="sourceToggles"></div>
          <div class="sources-footer">
            <button class="sources-select-all" id="sourcesSelectAll">Select All</button>
            <button class="sources-select-none" id="sourcesSelectNone">Select None</button>
          </div>
        </div>
      </div>
    `;
}
