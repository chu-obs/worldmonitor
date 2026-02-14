import type { TheaterPostureSummary } from '@/services/military-surge';

interface RenderCriticalBannerFlowOptions {
  postures: TheaterPostureSummary[];
  currentBannerEl: HTMLElement | null;
  setBannerEl: (element: HTMLElement | null) => void;
  onCenterMap: (lat: number, lon: number, zoom: number) => void;
}

export function renderCriticalBannerFlow(options: RenderCriticalBannerFlowOptions): void {
  const dismissedAt = sessionStorage.getItem('banner-dismissed');
  if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 30 * 60 * 1000) {
    return;
  }

  const critical = options.postures.filter(
    (posture) =>
      posture.postureLevel === 'critical' ||
      (posture.postureLevel === 'elevated' && posture.strikeCapable)
  );

  if (critical.length === 0) {
    if (options.currentBannerEl) {
      options.currentBannerEl.remove();
      options.setBannerEl(null);
      document.body.classList.remove('has-critical-banner');
    }
    return;
  }

  const top = critical[0]!;
  const isCritical = top.postureLevel === 'critical';

  let bannerEl = options.currentBannerEl;
  if (!bannerEl) {
    bannerEl = document.createElement('div');
    bannerEl.className = 'critical-posture-banner';
    const header = document.querySelector('.header');
    if (header) header.insertAdjacentElement('afterend', bannerEl);
    options.setBannerEl(bannerEl);
  }

  document.body.classList.add('has-critical-banner');
  bannerEl.className = `critical-posture-banner ${isCritical ? 'severity-critical' : 'severity-elevated'}`;
  bannerEl.innerHTML = `
      <div class="banner-content">
        <span class="banner-icon">${isCritical ? '🚨' : '⚠️'}</span>
        <span class="banner-headline">${top.headline}</span>
        <span class="banner-stats">${top.totalAircraft} aircraft • ${top.summary}</span>
        ${top.strikeCapable ? '<span class="banner-strike">STRIKE CAPABLE</span>' : ''}
      </div>
      <button class="banner-view" data-lat="${top.centerLat}" data-lon="${top.centerLon}">View Region</button>
      <button class="banner-dismiss">×</button>
    `;

  bannerEl.querySelector('.banner-view')?.addEventListener('click', () => {
    if (typeof top.centerLat === 'number' && typeof top.centerLon === 'number') {
      options.onCenterMap(top.centerLat, top.centerLon, 4);
    } else {
      console.error('[Banner] Missing coordinates for', top.theaterId);
    }
  });

  bannerEl.querySelector('.banner-dismiss')?.addEventListener('click', () => {
    bannerEl?.classList.add('dismissed');
    document.body.classList.remove('has-critical-banner');
    sessionStorage.setItem('banner-dismissed', Date.now().toString());
  });
}
