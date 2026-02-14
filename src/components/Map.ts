import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import type { MapLayers, Hotspot, NewsItem, Earthquake, InternetOutage, RelatedAsset, AssetType, AisDisruptionEvent, AisDensityZone, CableAdvisory, RepairShip, SocialUnrestEvent, AirportDelayAlert, MilitaryFlight, MilitaryVessel, MilitaryFlightCluster, MilitaryVesselCluster, NaturalEvent } from '@/types';
import type { TechHubActivity } from '@/services/tech-activity';
import type { GeoHubActivity } from '@/services/geo-activity';
import type { WeatherAlert } from '@/services/weather';
import {
  MAP_URLS,
  INTEL_HOTSPOTS,
  CONFLICT_ZONES,
  MILITARY_BASES,
  UNDERSEA_CABLES,
  NUCLEAR_FACILITIES,
  GAMMA_IRRADIATORS,
  PIPELINES,
  PIPELINE_COLORS,
  SANCTIONED_COUNTRIES,
  AI_DATA_CENTERS,
  SITE_VARIANT,
  // Tech variant data
  TECH_HQS,
} from '@/config';
import { MapPopup, type PopupType } from './MapPopup';
import {
  updateHotspotEscalation,
  getHotspotEscalation,
  setMilitaryData,
  setCIIGetter,
  setGeoAlertGetter,
} from '@/services/hotspot-escalation';
import { getCountryScore } from '@/services/country-instability';
import { getAlertsNearLocation } from '@/services/geo-convergence';
import { SVG_LAYER_ZOOM_THRESHOLDS } from './map/shared/layer-thresholds';
import { SVG_VIEW_PRESETS } from './map/shared/view-presets';
import {
  renderAptOverlayMarkers,
  renderPortOverlayMarkers,
  renderIrradiatorOverlayMarkers,
  renderSpaceportOverlayMarkers,
  renderWaterwayOverlayMarkers,
} from './map/layers/svg-overlay-markers';
import {
  renderAisDensityOverlayLayer,
  renderAisDisruptionOverlayMarkers,
} from './map/layers/svg-ais-overlays';
import { renderCableOperationsOverlayMarkers } from './map/layers/svg-cable-overlays';
import {
  renderConflictClickAreas,
  renderDatacenterOverlayMarkers,
  renderMineralOverlayMarkers,
} from './map/layers/svg-infra-overlays';
import {
  renderBaseOverlayMarkers,
  renderNuclearOverlayMarkers,
} from './map/layers/svg-security-overlays';
import {
  renderEconomicOverlayMarkers,
  renderOutageOverlayMarkers,
  renderWeatherOverlayMarkers,
} from './map/layers/svg-risk-overlays';
import {
  renderAcceleratorOverlayMarkers,
  renderCloudRegionOverlayMarkers,
  renderStartupHubOverlayMarkers,
} from './map/layers/svg-tech-static-overlays';
import {
  renderFireOverlayMarkers,
  renderNaturalEventOverlayMarkers,
} from './map/layers/svg-natural-overlays';
import { renderEarthquakeOverlayMarkers } from './map/layers/svg-seismic-overlays';
import { renderHotspotOverlayMarkers } from './map/layers/svg-hotspot-overlays';
import {
  renderTechEventClusterOverlayMarkers,
  renderTechHqClusterOverlayMarkers,
} from './map/layers/svg-tech-cluster-overlays';
import {
  renderGeoActivityOverlayMarkers,
  renderTechActivityOverlayMarkers,
} from './map/layers/svg-activity-overlays';
import {
  renderFlightDelayOverlayMarkers,
  renderProtestClusterOverlayMarkers,
} from './map/layers/svg-ops-overlays';
import { renderMilitaryOverlayMarkers } from './map/layers/svg-military-overlays';
import {
  getLayerZoomVisibilityState,
  shouldSetLayerZoomOverride,
} from './map/shared/visibility';
import { clusterGeospatialMarkers } from './map/shared/clustering';
import { assessHotspotActivity } from './map/shared/hotspot-activity';
import { getRelatedNewsForHotspot } from './map/shared/hotspot-news';
import { getPolylineMidpoint, triggerEntityPopup } from './map/shared/popup-triggers';
import type { GlobalMapView, MapTimeRange } from './map/shared/types';

export type TimeRange = MapTimeRange;
export type MapView = GlobalMapView;
const LAYER_ZOOM_THRESHOLDS = SVG_LAYER_ZOOM_THRESHOLDS;

interface MapState {
  zoom: number;
  pan: { x: number; y: number };
  view: MapView;
  layers: MapLayers;
  timeRange: TimeRange;
}

interface HotspotWithBreaking extends Hotspot {
  hasBreaking?: boolean;
}

interface TechEventMarker {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  country: string;
  startDate: string;
  endDate: string;
  url: string | null;
  daysUntil: number;
}

interface WorldTopology extends Topology {
  objects: {
    countries: GeometryCollection;
  };
}

export class MapComponent {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private wrapper: HTMLElement;
  private overlays: HTMLElement;
  private clusterCanvas: HTMLCanvasElement;
  private clusterGl: WebGLRenderingContext | null = null;
  private state: MapState;
  private worldData: WorldTopology | null = null;
  private countryFeatures: Feature<Geometry>[] | null = null;
  private baseLayerGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private dynamicLayerGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private baseRendered = false;
  private baseWidth = 0;
  private baseHeight = 0;
  private hotspots: HotspotWithBreaking[];
  private earthquakes: Earthquake[] = [];
  private weatherAlerts: WeatherAlert[] = [];
  private outages: InternetOutage[] = [];
  private aisDisruptions: AisDisruptionEvent[] = [];
  private aisDensity: AisDensityZone[] = [];
  private cableAdvisories: CableAdvisory[] = [];
  private repairShips: RepairShip[] = [];
  private protests: SocialUnrestEvent[] = [];
  private flightDelays: AirportDelayAlert[] = [];
  private militaryFlights: MilitaryFlight[] = [];
  private militaryFlightClusters: MilitaryFlightCluster[] = [];
  private militaryVessels: MilitaryVessel[] = [];
  private militaryVesselClusters: MilitaryVesselCluster[] = [];
  private naturalEvents: NaturalEvent[] = [];
  private firmsFireData: Array<{ lat: number; lon: number; brightness: number; frp: number; confidence: number; region: string; acq_date: string; daynight: string }> = [];
  private techEvents: TechEventMarker[] = [];
  private techActivities: TechHubActivity[] = [];
  private geoActivities: GeoHubActivity[] = [];
  private news: NewsItem[] = [];
  private onTechHubClick?: (hub: TechHubActivity) => void;
  private onGeoHubClick?: (hub: GeoHubActivity) => void;
  private popup: MapPopup;
  private onHotspotClick?: (hotspot: Hotspot) => void;
  private onTimeRangeChange?: (range: TimeRange) => void;
  private onLayerChange?: (layer: keyof MapLayers, enabled: boolean) => void;
  private layerZoomOverrides: Partial<Record<keyof MapLayers, boolean>> = {};
  private onStateChange?: (state: MapState) => void;
  private highlightedAssets: Record<AssetType, Set<string>> = {
    pipeline: new Set(),
    cable: new Set(),
    datacenter: new Set(),
    base: new Set(),
    nuclear: new Set(),
  };
  private boundVisibilityHandler!: () => void;
  private renderScheduled = false;
  private lastRenderTime = 0;
  private readonly MIN_RENDER_INTERVAL_MS = 100;
  private timestampIntervalId: ReturnType<typeof setInterval> | null = null;
  private healthCheckIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement, initialState: MapState) {
    this.container = container;
    this.state = initialState;
    this.hotspots = [...INTEL_HOTSPOTS];

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'map-wrapper';
    this.wrapper.id = 'mapWrapper';

    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.classList.add('map-svg');
    svgElement.id = 'mapSvg';
    this.wrapper.appendChild(svgElement);

    this.clusterCanvas = document.createElement('canvas');
    this.clusterCanvas.className = 'map-cluster-canvas';
    this.clusterCanvas.id = 'mapClusterCanvas';
    this.wrapper.appendChild(this.clusterCanvas);

    // Overlays inside wrapper so they transform together on zoom/pan
    this.overlays = document.createElement('div');
    this.overlays.id = 'mapOverlays';
    this.wrapper.appendChild(this.overlays);

    container.appendChild(this.wrapper);
    container.appendChild(this.createControls());
    container.appendChild(this.createTimeSlider());
    container.appendChild(this.createLayerToggles());
    container.appendChild(this.createLegend());
    container.appendChild(this.createTimestamp());

    this.svg = d3.select(svgElement);
    this.baseLayerGroup = this.svg.append('g').attr('class', 'map-base');
    this.dynamicLayerGroup = this.svg.append('g').attr('class', 'map-dynamic');
    this.popup = new MapPopup(container);
    this.initClusterRenderer();

    this.setupZoomHandlers();
    this.loadMapData();
    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    let lastWidth = 0;
    let lastHeight = 0;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && (width !== lastWidth || height !== lastHeight)) {
          lastWidth = width;
          lastHeight = height;
          requestAnimationFrame(() => this.render());
        }
      }
    });
    resizeObserver.observe(this.container);

    // Re-render when page becomes visible again (after browser throttling)
    this.boundVisibilityHandler = () => {
      if (!document.hidden) {
        requestAnimationFrame(() => this.render());
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
  }

  public destroy(): void {
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    if (this.timestampIntervalId) {
      clearInterval(this.timestampIntervalId);
      this.timestampIntervalId = null;
    }
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }

  private createControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'map-controls';
    controls.innerHTML = `
      <button class="map-control-btn" data-action="zoom-in">+</button>
      <button class="map-control-btn" data-action="zoom-out">−</button>
      <button class="map-control-btn" data-action="reset">⟲</button>
    `;

    controls.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action === 'zoom-in') this.zoomIn();
      else if (action === 'zoom-out') this.zoomOut();
      else if (action === 'reset') this.reset();
    });

    return controls;
  }

  private createTimeSlider(): HTMLElement {
    const slider = document.createElement('div');
    slider.className = 'time-slider';
    slider.id = 'timeSlider';

    const ranges: { value: TimeRange; label: string }[] = [
      { value: '1h', label: '1H' },
      { value: '6h', label: '6H' },
      { value: '24h', label: '24H' },
      { value: '48h', label: '48H' },
      { value: '7d', label: '7D' },
      { value: 'all', label: 'ALL' },
    ];

    slider.innerHTML = `
      <span class="time-slider-label">TIME RANGE</span>
      <div class="time-slider-buttons">
        ${ranges
          .map(
            (r) =>
              `<button class="time-btn ${this.state.timeRange === r.value ? 'active' : ''}" data-range="${r.value}">${r.label}</button>`
          )
          .join('')}
      </div>
    `;

    slider.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('time-btn')) {
        const range = target.dataset.range as TimeRange;
        this.setTimeRange(range);
        slider.querySelectorAll('.time-btn').forEach((btn) => btn.classList.remove('active'));
        target.classList.add('active');
      }
    });

    return slider;
  }

  private updateTimeSliderButtons(): void {
    const slider = this.container.querySelector('#timeSlider');
    if (!slider) return;
    slider.querySelectorAll('.time-btn').forEach((btn) => {
      const range = (btn as HTMLElement).dataset.range as TimeRange | undefined;
      btn.classList.toggle('active', range === this.state.timeRange);
    });
  }

  public setTimeRange(range: TimeRange): void {
    this.state.timeRange = range;
    this.onTimeRangeChange?.(range);
    this.updateTimeSliderButtons();
    this.render();
  }

  private getTimeRangeMs(): number {
    const ranges: Record<TimeRange, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '48h': 48 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      'all': Infinity,
    };
    return ranges[this.state.timeRange];
  }

  private filterByTime<T extends { time?: Date }>(items: T[]): T[] {
    if (this.state.timeRange === 'all') return items;
    const now = Date.now();
    const cutoff = now - this.getTimeRangeMs();
    return items.filter((item) => {
      if (!item.time) return true;
      return item.time.getTime() >= cutoff;
    });
  }

  private createLayerToggles(): HTMLElement {
    const toggles = document.createElement('div');
    toggles.className = 'layer-toggles';
    toggles.id = 'layerToggles';

    // Variant-aware layer buttons
    const fullLayers: (keyof MapLayers)[] = [
      'conflicts', 'hotspots', 'sanctions', 'protests',  // geopolitical
      'bases', 'nuclear', 'irradiators',                 // military/strategic
      'military',                                         // military tracking (flights + vessels)
      'cables', 'pipelines', 'outages', 'datacenters',   // infrastructure
      'ais', 'flights',                                   // transport
      'natural', 'weather',                               // natural
      'economic',                                         // economic
      'waterways',                                        // labels
    ];
    const techLayers: (keyof MapLayers)[] = [
      'cables', 'datacenters', 'outages',                // tech infrastructure
      'startupHubs', 'cloudRegions', 'accelerators', 'techHQs', 'techEvents', // tech ecosystem
      'natural', 'weather',                               // natural events
      'economic',                                         // economic/geographic
    ];
    const layers = SITE_VARIANT === 'tech' ? techLayers : fullLayers;
    const layerLabels: Partial<Record<keyof MapLayers, string>> = {
      ais: 'Shipping',
      flights: 'Delays',
      military: 'Military',
    };

    layers.forEach((layer) => {
      const btn = document.createElement('button');
      btn.className = `layer-toggle ${this.state.layers[layer] ? 'active' : ''}`;
      btn.dataset.layer = layer;
      btn.textContent = layerLabels[layer] || layer;
      btn.addEventListener('click', () => this.toggleLayer(layer));
      toggles.appendChild(btn);
    });

    // Add help button
    const helpBtn = document.createElement('button');
    helpBtn.className = 'layer-help-btn';
    helpBtn.textContent = '?';
    helpBtn.title = 'Layer descriptions';
    helpBtn.addEventListener('click', () => this.showLayerHelp());
    toggles.appendChild(helpBtn);

    return toggles;
  }

  private showLayerHelp(): void {
    const existing = this.container.querySelector('.layer-help-popup');
    if (existing) {
      existing.remove();
      return;
    }

    const popup = document.createElement('div');
    popup.className = 'layer-help-popup';

    const techHelpContent = `
      <div class="layer-help-header">
        <span>Map Layers Guide</span>
        <button class="layer-help-close">×</button>
      </div>
      <div class="layer-help-content">
        <div class="layer-help-section">
          <div class="layer-help-title">Tech Ecosystem</div>
          <div class="layer-help-item"><span>STARTUPHUBS</span> Major startup ecosystems (SF, NYC, London, etc.)</div>
          <div class="layer-help-item"><span>CLOUDREGIONS</span> AWS, Azure, GCP data center regions</div>
          <div class="layer-help-item"><span>TECHHQS</span> Headquarters of major tech companies</div>
          <div class="layer-help-item"><span>ACCELERATORS</span> Y Combinator, Techstars, 500 Startups locations</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Infrastructure</div>
          <div class="layer-help-item"><span>CABLES</span> Major undersea fiber optic cables (internet backbone)</div>
          <div class="layer-help-item"><span>DATACENTERS</span> AI compute clusters ≥10,000 GPUs</div>
          <div class="layer-help-item"><span>OUTAGES</span> Internet blackouts and service disruptions</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Natural & Economic</div>
          <div class="layer-help-item"><span>NATURAL</span> Earthquakes, storms, fires (may affect data centers)</div>
          <div class="layer-help-item"><span>WEATHER</span> Severe weather alerts</div>
          <div class="layer-help-item"><span>ECONOMIC</span> Stock exchanges & central banks</div>
          <div class="layer-help-item"><span>COUNTRIES</span> Country name overlays</div>
        </div>
      </div>
    `;

    const fullHelpContent = `
      <div class="layer-help-header">
        <span>Map Layers Guide</span>
        <button class="layer-help-close">×</button>
      </div>
      <div class="layer-help-content">
        <div class="layer-help-section">
          <div class="layer-help-title">Time Filter (top-right)</div>
          <div class="layer-help-item"><span>1H/6H/24H</span> Filter time-based data to recent hours</div>
          <div class="layer-help-item"><span>7D/30D/ALL</span> Show data from past week, month, or all time</div>
          <div class="layer-help-note">Affects: Earthquakes, Weather, Protests, Outages</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Geopolitical</div>
          <div class="layer-help-item"><span>CONFLICTS</span> Active war zones (Ukraine, Gaza, etc.) with boundaries</div>
          <div class="layer-help-item"><span>HOTSPOTS</span> Tension regions - color-coded by news activity level</div>
          <div class="layer-help-item"><span>SANCTIONS</span> Countries under US/EU/UN economic sanctions</div>
          <div class="layer-help-item"><span>PROTESTS</span> Civil unrest, demonstrations (time-filtered)</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Military & Strategic</div>
          <div class="layer-help-item"><span>BASES</span> US/NATO, China, Russia military installations (150+)</div>
          <div class="layer-help-item"><span>NUCLEAR</span> Power plants, enrichment, weapons facilities</div>
          <div class="layer-help-item"><span>IRRADIATORS</span> Industrial gamma irradiator facilities</div>
          <div class="layer-help-item"><span>MILITARY</span> Live military aircraft and vessel tracking</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Infrastructure</div>
          <div class="layer-help-item"><span>CABLES</span> Major undersea fiber optic cables (20 backbone routes)</div>
          <div class="layer-help-item"><span>PIPELINES</span> Oil/gas pipelines (Nord Stream, TAPI, etc.)</div>
          <div class="layer-help-item"><span>OUTAGES</span> Internet blackouts and disruptions</div>
          <div class="layer-help-item"><span>DATACENTERS</span> AI compute clusters ≥10,000 GPUs only</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Transport</div>
          <div class="layer-help-item"><span>SHIPPING</span> Vessels, chokepoints, 61 strategic ports</div>
          <div class="layer-help-item"><span>DELAYS</span> Airport delays and ground stops (FAA)</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Natural & Economic</div>
          <div class="layer-help-item"><span>NATURAL</span> Earthquakes (USGS) + storms, fires, volcanoes, floods (NASA EONET)</div>
          <div class="layer-help-item"><span>WEATHER</span> Severe weather alerts</div>
          <div class="layer-help-item"><span>ECONOMIC</span> Stock exchanges & central banks</div>
        </div>
        <div class="layer-help-section">
          <div class="layer-help-title">Labels</div>
          <div class="layer-help-item"><span>COUNTRIES</span> Country name overlays</div>
          <div class="layer-help-item"><span>WATERWAYS</span> Strategic chokepoint labels</div>
        </div>
      </div>
    `;

    popup.innerHTML = SITE_VARIANT === 'tech' ? techHelpContent : fullHelpContent;

    popup.querySelector('.layer-help-close')?.addEventListener('click', () => popup.remove());

    // Prevent scroll events from propagating to map
    const content = popup.querySelector('.layer-help-content');
    if (content) {
      content.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
      content.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
    }

    // Close on click outside
    setTimeout(() => {
      const closeHandler = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node)) {
          popup.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 100);

    this.container.appendChild(popup);
  }

  private syncLayerButtons(): void {
    this.container.querySelectorAll<HTMLButtonElement>('.layer-toggle').forEach((btn) => {
      const layer = btn.dataset.layer as keyof MapLayers | undefined;
      if (!layer) return;
      btn.classList.toggle('active', this.state.layers[layer]);
    });
  }

  private createLegend(): HTMLElement {
    const legend = document.createElement('div');
    legend.className = 'map-legend';

    if (SITE_VARIANT === 'tech') {
      // Tech variant legend
      legend.innerHTML = `
        <div class="map-legend-item"><span class="legend-dot" style="background:#8b5cf6"></span>TECH HQ</div>
        <div class="map-legend-item"><span class="legend-dot" style="background:#06b6d4"></span>STARTUP HUB</div>
        <div class="map-legend-item"><span class="legend-dot" style="background:#f59e0b"></span>CLOUD REGION</div>
        <div class="map-legend-item"><span class="map-legend-icon" style="color:#a855f7">📅</span>TECH EVENT</div>
        <div class="map-legend-item"><span class="map-legend-icon" style="color:#4ecdc4">💾</span>DATACENTER</div>
      `;
    } else {
      // Geopolitical variant legend
      legend.innerHTML = `
        <div class="map-legend-item"><span class="legend-dot high"></span>HIGH ALERT</div>
        <div class="map-legend-item"><span class="legend-dot elevated"></span>ELEVATED</div>
        <div class="map-legend-item"><span class="legend-dot low"></span>MONITORING</div>
        <div class="map-legend-item"><span class="map-legend-icon conflict">⚔</span>CONFLICT</div>
        <div class="map-legend-item"><span class="map-legend-icon earthquake">●</span>EARTHQUAKE</div>
        <div class="map-legend-item"><span class="map-legend-icon apt">⚠</span>APT</div>
      `;
    }
    return legend;
  }

  private createTimestamp(): HTMLElement {
    const timestamp = document.createElement('div');
    timestamp.className = 'map-timestamp';
    timestamp.id = 'mapTimestamp';
    this.updateTimestamp(timestamp);
    this.timestampIntervalId = setInterval(() => this.updateTimestamp(timestamp), 60000);
    // Health check every 30 seconds to detect and recover from base layer issues
    this.healthCheckIntervalId = setInterval(() => this.runHealthCheck(), 30000);
    return timestamp;
  }

  private runHealthCheck(): void {
    // Skip if page is hidden (no need to check while user isn't looking)
    if (document.hidden) return;

    const svgNode = this.svg.node();
    if (!svgNode) return;

    // Verify base layer exists and has content
    const baseGroup = svgNode.querySelector('.map-base');
    const countryCount = baseGroup?.querySelectorAll('.country').length ?? 0;

    // If we have country data but no rendered countries, something is wrong
    if (this.countryFeatures && this.countryFeatures.length > 0 && countryCount === 0) {
      console.warn('[Map] Health check: Base layer missing countries, initiating recovery');
      this.baseRendered = false;
      // Also check if d3 selection is stale
      if (baseGroup && this.baseLayerGroup?.node() !== baseGroup) {
        console.warn('[Map] Health check: Stale d3 selection detected');
      }
      this.render();
    }
  }

  private updateTimestamp(el: HTMLElement): void {
    const now = new Date();
    el.innerHTML = `LAST UPDATE: ${now.toUTCString().replace('GMT', 'UTC')}`;
  }

  private setupZoomHandlers(): void {
    let isDragging = false;
    let lastPos = { x: 0, y: 0 };
    let lastTouchDist = 0;
    let lastTouchCenter = { x: 0, y: 0 };

    // Wheel zoom with smooth delta
    this.container.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();

        // Check if this is a pinch gesture (ctrlKey is set for trackpad pinch)
        if (e.ctrlKey) {
          // Pinch-to-zoom on trackpad
          const zoomDelta = -e.deltaY * 0.01;
          this.state.zoom = Math.max(1, Math.min(10, this.state.zoom + zoomDelta));
        } else {
          // Two-finger scroll for pan, regular scroll for zoom
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 || e.shiftKey) {
            // Horizontal scroll or shift+scroll = pan
            const panSpeed = 2 / this.state.zoom;
            this.state.pan.x -= e.deltaX * panSpeed;
            this.state.pan.y -= e.deltaY * panSpeed;
          } else {
            // Vertical scroll = zoom
            const zoomDelta = e.deltaY > 0 ? -0.15 : 0.15;
            this.state.zoom = Math.max(1, Math.min(10, this.state.zoom + zoomDelta));
          }
        }
        this.applyTransform();
      },
      { passive: false }
    );

    // Mouse drag for panning
    this.container.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        isDragging = true;
        lastPos = { x: e.clientX, y: e.clientY };
        this.container.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;

      const panSpeed = 1 / this.state.zoom;
      this.state.pan.x += dx * panSpeed;
      this.state.pan.y += dy * panSpeed;

      lastPos = { x: e.clientX, y: e.clientY };
      this.applyTransform();
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.container.style.cursor = 'grab';
      }
    });

    // Touch events for mobile and trackpad
    this.container.addEventListener('touchstart', (e) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (e.touches.length === 2 && touch1 && touch2) {
        e.preventDefault();
        lastTouchDist = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        lastTouchCenter = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
        };
      } else if (e.touches.length === 1 && touch1) {
        isDragging = true;
        lastPos = { x: touch1.clientX, y: touch1.clientY };
      }
    }, { passive: false });

    this.container.addEventListener('touchmove', (e) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      if (e.touches.length === 2 && touch1 && touch2) {
        e.preventDefault();

        // Pinch zoom
        const dist = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = dist / lastTouchDist;
        this.state.zoom = Math.max(1, Math.min(10, this.state.zoom * scale));
        lastTouchDist = dist;

        // Two-finger pan
        const center = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2,
        };
        const panSpeed = 1 / this.state.zoom;
        this.state.pan.x += (center.x - lastTouchCenter.x) * panSpeed;
        this.state.pan.y += (center.y - lastTouchCenter.y) * panSpeed;
        lastTouchCenter = center;

        this.applyTransform();
      } else if (e.touches.length === 1 && isDragging && touch1) {
        const dx = touch1.clientX - lastPos.x;
        const dy = touch1.clientY - lastPos.y;

        const panSpeed = 1 / this.state.zoom;
        this.state.pan.x += dx * panSpeed;
        this.state.pan.y += dy * panSpeed;

        lastPos = { x: touch1.clientX, y: touch1.clientY };
        this.applyTransform();
      }
    }, { passive: false });

    this.container.addEventListener('touchend', () => {
      isDragging = false;
      lastTouchDist = 0;
    });

    // Set initial cursor
    this.container.style.cursor = 'grab';
  }

  private async loadMapData(): Promise<void> {
    try {
      const worldResponse = await fetch(MAP_URLS.world);
      this.worldData = await worldResponse.json();
      if (this.worldData) {
        const countries = topojson.feature(
          this.worldData,
          this.worldData.objects.countries
        );
        this.countryFeatures = 'features' in countries ? countries.features : [countries];
      }
      this.baseRendered = false;
      this.render();
      // Re-render after layout stabilizes to catch full container width
      requestAnimationFrame(() => requestAnimationFrame(() => this.render()));
    } catch (e) {
      console.error('Failed to load map data:', e);
    }
  }

  private initClusterRenderer(): void {
    // WebGL clustering disabled - just get context for clearing canvas
    const gl = this.clusterCanvas.getContext('webgl');
    if (!gl) return;
    this.clusterGl = gl;
  }

  private clearClusterCanvas(): void {
    if (!this.clusterGl) return;
    this.clusterGl.clearColor(0, 0, 0, 0);
    this.clusterGl.clear(this.clusterGl.COLOR_BUFFER_BIT);
  }

  private renderClusterLayer(_projection: d3.GeoProjection): void {
    // WebGL clustering disabled - all layers use HTML markers for visual fidelity
    // (severity colors, emoji icons, magnitude sizing, animations)
    this.wrapper.classList.toggle('cluster-active', false);
    this.clearClusterCanvas();
  }

  public scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.render();
    });
  }

  public render(): void {
    const now = performance.now();
    if (now - this.lastRenderTime < this.MIN_RENDER_INTERVAL_MS) {
      this.scheduleRender();
      return;
    }
    this.lastRenderTime = now;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Skip render if container has no dimensions (tab throttled, hidden, etc.)
    if (width === 0 || height === 0) {
      return;
    }

    // Simple viewBox matching container - keeps SVG and overlays aligned
    this.svg.attr('viewBox', `0 0 ${width} ${height}`);

    // CRITICAL: Always refresh d3 selections from actual DOM to prevent stale references
    // D3 selections can become stale if the DOM is modified externally
    const svgNode = this.svg.node();
    if (!svgNode) return;

    // Query DOM directly for layer groups
    const existingBase = svgNode.querySelector('.map-base') as SVGGElement | null;
    const existingDynamic = svgNode.querySelector('.map-dynamic') as SVGGElement | null;

    // Recreate layer groups if missing or if d3 selections are stale
    const baseStale = !existingBase || this.baseLayerGroup?.node() !== existingBase;
    const dynamicStale = !existingDynamic || this.dynamicLayerGroup?.node() !== existingDynamic;

    if (baseStale || dynamicStale) {
      // Clear any orphaned groups and create fresh ones
      svgNode.querySelectorAll('.map-base, .map-dynamic').forEach(el => el.remove());
      this.baseLayerGroup = this.svg.append('g').attr('class', 'map-base');
      this.dynamicLayerGroup = this.svg.append('g').attr('class', 'map-dynamic');
      this.baseRendered = false;
      console.warn('[Map] Layer groups recreated - baseStale:', baseStale, 'dynamicStale:', dynamicStale);
    }

    // Double-check selections are valid after recreation
    if (!this.baseLayerGroup?.node() || !this.dynamicLayerGroup?.node()) {
      console.error('[Map] Failed to create layer groups');
      return;
    }

    // Check if base layer has actual country content (not just empty group)
    const countryCount = this.baseLayerGroup.node()!.querySelectorAll('.country').length;
    const shouldRenderBase = !this.baseRendered || countryCount === 0 || width !== this.baseWidth || height !== this.baseHeight;

    // Debug: log when base layer needs re-render
    if (shouldRenderBase && countryCount === 0 && this.baseRendered) {
      console.warn('[Map] Base layer missing countries, forcing re-render. countryFeatures:', this.countryFeatures?.length ?? 'null');
    }

    if (shouldRenderBase) {
      this.baseWidth = width;
      this.baseHeight = height;
      // Use native DOM clear for guaranteed effect
      const baseNode = this.baseLayerGroup.node()!;
      while (baseNode.firstChild) baseNode.removeChild(baseNode.firstChild);

      // Background - extend well beyond viewBox to cover pan/zoom transforms
      // 3x size in each direction ensures no black bars when panning
      this.baseLayerGroup
        .append('rect')
        .attr('x', -width)
        .attr('y', -height)
        .attr('width', width * 3)
        .attr('height', height * 3)
        .attr('fill', '#020a08');

      // Grid
      this.renderGrid(this.baseLayerGroup, width, height);

      // Setup projection for base elements
      const baseProjection = this.getProjection(width, height);
      const basePath = d3.geoPath().projection(baseProjection);

      // Graticule
      this.renderGraticule(this.baseLayerGroup, basePath);

      // Countries
      this.renderCountries(this.baseLayerGroup, basePath);
      this.baseRendered = true;
    }

    // Always rebuild dynamic layer - use native DOM clear for reliability
    const dynamicNode = this.dynamicLayerGroup.node()!;
    while (dynamicNode.firstChild) dynamicNode.removeChild(dynamicNode.firstChild);
    // Create overlays-svg group for SVG-based overlays (military tracks, etc.)
    this.dynamicLayerGroup.append('g').attr('class', 'overlays-svg');

    // Setup projection for dynamic elements
    const projection = this.getProjection(width, height);

    // Update country fills (sanctions toggle without rebuilding geometry)
    this.updateCountryFills();

    // Render dynamic map layers
    if (this.state.layers.cables) {
      this.renderCables(projection);
    }

    if (this.state.layers.pipelines) {
      this.renderPipelines(projection);
    }

    if (this.state.layers.conflicts) {
      this.renderConflicts(projection);
    }

    if (this.state.layers.ais && this.dynamicLayerGroup) {
      renderAisDensityOverlayLayer({
        projection,
        dynamicLayerGroup: this.dynamicLayerGroup,
        aisDensity: this.aisDensity,
      });
    }

    // GPU-accelerated cluster markers (LOD)
    this.renderClusterLayer(projection);

    // Overlays
    this.renderOverlays(projection);

    // POST-RENDER VERIFICATION: Ensure base layer actually rendered
    // This catches silent failures where d3 operations didn't stick
    if (this.baseRendered && this.countryFeatures && this.countryFeatures.length > 0) {
      const verifyCount = this.baseLayerGroup?.node()?.querySelectorAll('.country').length ?? 0;
      if (verifyCount === 0) {
        console.error('[Map] POST-RENDER: Countries failed to render despite baseRendered=true. Forcing full rebuild.');
        this.baseRendered = false;
        // Schedule a retry on next frame instead of immediate recursion
        requestAnimationFrame(() => this.render());
        return;
      }
    }

    this.applyTransform();
  }

  private renderGrid(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    yStart = 0
  ): void {
    const gridGroup = group.append('g').attr('class', 'grid');

    for (let x = 0; x < width; x += 20) {
      gridGroup
        .append('line')
        .attr('x1', x)
        .attr('y1', yStart)
        .attr('x2', x)
        .attr('y2', yStart + height)
        .attr('stroke', '#0a2a20')
        .attr('stroke-width', 0.5);
    }

    for (let y = yStart; y < yStart + height; y += 20) {
      gridGroup
        .append('line')
        .attr('x1', 0)
        .attr('y1', y)
        .attr('x2', width)
        .attr('y2', y)
        .attr('stroke', '#0a2a20')
        .attr('stroke-width', 0.5);
    }
  }

  private getProjection(width: number, height: number): d3.GeoProjection {
    // Equirectangular with cropped latitude range (72°N to 56°S = 128°)
    // Shows Greenland/Iceland while trimming extreme polar regions
    const LAT_NORTH = 72;  // Includes Greenland (extends to ~83°N but 72 shows most)
    const LAT_SOUTH = -56; // Just below Tierra del Fuego
    const LAT_RANGE = LAT_NORTH - LAT_SOUTH; // 128°
    const LAT_CENTER = (LAT_NORTH + LAT_SOUTH) / 2; // 8°N

    // Scale to fit: 360° longitude in width, 128° latitude in height
    const scaleForWidth = width / (2 * Math.PI);
    const scaleForHeight = height / (LAT_RANGE * Math.PI / 180);
    const scale = Math.min(scaleForWidth, scaleForHeight);

    return d3
      .geoEquirectangular()
      .scale(scale)
      .center([0, LAT_CENTER])
      .translate([width / 2, height / 2]);
  }

  private renderGraticule(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    path: d3.GeoPath
  ): void {
    const graticule = d3.geoGraticule();
    group
      .append('path')
      .datum(graticule())
      .attr('class', 'graticule')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#1a5045')
      .attr('stroke-width', 0.4);
  }

  private renderCountries(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    path: d3.GeoPath
  ): void {
    if (!this.countryFeatures) return;

    group
      .selectAll('.country')
      .data(this.countryFeatures)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path as unknown as string)
      .attr('fill', '#0d3028')
      .attr('stroke', '#1a8060')
      .attr('stroke-width', 0.7);
  }

  private renderCables(projection: d3.GeoProjection): void {
    if (!this.dynamicLayerGroup) return;
    const cableGroup = this.dynamicLayerGroup.append('g').attr('class', 'cables');

    UNDERSEA_CABLES.forEach((cable) => {
      const lineGenerator = d3
        .line<[number, number]>()
        .x((d) => projection(d)?.[0] ?? 0)
        .y((d) => projection(d)?.[1] ?? 0)
        .curve(d3.curveCardinal);

      const isHighlighted = this.highlightedAssets.cable.has(cable.id);
      const cableAdvisory = this.getCableAdvisory(cable.id);
      const advisoryClass = cableAdvisory ? `cable-${cableAdvisory.severity}` : '';
      const highlightClass = isHighlighted ? 'asset-highlight asset-highlight-cable' : '';

      const path = cableGroup
        .append('path')
        .attr('class', `cable-path ${advisoryClass} ${highlightClass}`.trim())
        .attr('d', lineGenerator(cable.points));

      path.append('title').text(cable.name);

      path.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        const rect = this.container.getBoundingClientRect();
        this.popup.show({
          type: 'cable',
          data: cable,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      });
    });
  }

  private renderPipelines(projection: d3.GeoProjection): void {
    if (!this.dynamicLayerGroup) return;
    const pipelineGroup = this.dynamicLayerGroup.append('g').attr('class', 'pipelines');

    PIPELINES.forEach((pipeline) => {
      const lineGenerator = d3
        .line<[number, number]>()
        .x((d) => projection(d)?.[0] ?? 0)
        .y((d) => projection(d)?.[1] ?? 0)
        .curve(d3.curveCardinal.tension(0.5));

      const color = PIPELINE_COLORS[pipeline.type] || '#888888';
      const opacity = 0.85;
      const dashArray = pipeline.status === 'construction' ? '4,2' : 'none';

      const isHighlighted = this.highlightedAssets.pipeline.has(pipeline.id);
      const path = pipelineGroup
        .append('path')
        .attr('class', `pipeline-path pipeline-${pipeline.type} pipeline-${pipeline.status}${isHighlighted ? ' asset-highlight asset-highlight-pipeline' : ''}`)
        .attr('d', lineGenerator(pipeline.points))
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', opacity)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');

      if (dashArray !== 'none') {
        path.attr('stroke-dasharray', dashArray);
      }

      path.append('title').text(`${pipeline.name} (${pipeline.type.toUpperCase()})`);

      path.on('click', (event: MouseEvent) => {
        event.stopPropagation();
        const rect = this.container.getBoundingClientRect();
        this.popup.show({
          type: 'pipeline',
          data: pipeline,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      });
    });
  }

  private renderConflicts(projection: d3.GeoProjection): void {
    if (!this.dynamicLayerGroup) return;
    const conflictGroup = this.dynamicLayerGroup.append('g').attr('class', 'conflicts');

    CONFLICT_ZONES.forEach((zone) => {
      const points = zone.coords
        .map((c) => projection(c as [number, number]))
        .filter((p): p is [number, number] => p !== null);

      if (points.length > 0) {
        conflictGroup
          .append('polygon')
          .attr('class', 'conflict-zone')
          .attr('points', points.map((p) => p.join(',')).join(' '));
        // Labels are now rendered as HTML overlays in renderConflictLabels()
      }
    });
  }


  private updateCountryFills(): void {
    if (!this.baseLayerGroup || !this.countryFeatures) return;

    const sanctionColors: Record<string, string> = {
      severe: 'rgba(255, 0, 0, 0.35)',
      high: 'rgba(255, 100, 0, 0.25)',
      moderate: 'rgba(255, 200, 0, 0.2)',
    };
    const defaultFill = '#0d3028';
    const useSanctions = this.state.layers.sanctions;

    this.baseLayerGroup.selectAll('.country').each(function (datum) {
      const el = d3.select(this);
      const id = datum as { id?: number };
      if (!useSanctions) {
        el.attr('fill', defaultFill);
        return;
      }
      if (id?.id !== undefined && SANCTIONED_COUNTRIES[id.id]) {
        const level = SANCTIONED_COUNTRIES[id.id];
        if (level) {
          el.attr('fill', sanctionColors[level] || defaultFill);
          return;
        }
      }
      el.attr('fill', defaultFill);
    });
  }

  // Generic marker clustering - groups markers within pixelRadius into clusters
  // groupKey function ensures only items with same key can cluster (e.g., same city)
  private clusterMarkers<T extends { lat: number; lon: number }>(
    items: T[],
    projection: d3.GeoProjection,
    pixelRadius: number,
    getGroupKey?: (item: T) => string
  ): Array<{ items: T[]; center: [number, number]; pos: [number, number] }> {
    return clusterGeospatialMarkers(
      items,
      pixelRadius,
      (point) => {
        const projected = projection(point);
        return projected ? [projected[0], projected[1]] : null;
      },
      getGroupKey,
    );
  }

  private renderStrategicOverlays(projection: d3.GeoProjection): void {
    if (this.state.layers.waterways) {
      renderWaterwayOverlayMarkers({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.ais) {
      renderAisDisruptionOverlayMarkers({
        projection,
        overlays: this.overlays,
        aisDisruptions: this.aisDisruptions,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
      renderPortOverlayMarkers({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (SITE_VARIANT !== 'tech') {
      renderAptOverlayMarkers({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }
  }

  private renderSecurityOverlays(projection: d3.GeoProjection): void {
    if (this.state.layers.nuclear) {
      renderNuclearOverlayMarkers({
        projection,
        overlays: this.overlays,
        highlightedIds: this.highlightedAssets.nuclear,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.irradiators) {
      renderIrradiatorOverlayMarkers({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.conflicts) {
      renderConflictClickAreas({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.hotspots) {
      renderHotspotOverlayMarkers({
        projection,
        overlays: this.overlays,
        hotspots: this.hotspots,
        getRelatedNews: (hotspot) => this.getRelatedNews(hotspot),
        onHotspotClick: this.showHotspotPopupAtClick,
      });
    }

    if (this.state.layers.bases) {
      renderBaseOverlayMarkers({
        projection,
        overlays: this.overlays,
        highlightedIds: this.highlightedAssets.base,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }
  }

  private renderSeismicOverlays(projection: d3.GeoProjection): void {
    if (!this.state.layers.natural) return;

    console.log('[Map] Rendering earthquakes. Total:', this.earthquakes.length, 'Layer enabled:', this.state.layers.natural);
    const filteredQuakes = this.filterByTime(this.earthquakes);
    console.log('[Map] After time filter:', filteredQuakes.length, 'earthquakes. TimeRange:', this.state.timeRange);
    const rendered = renderEarthquakeOverlayMarkers({
      projection,
      overlays: this.overlays,
      earthquakes: filteredQuakes,
      onMarkerClick: this.showOverlayPopupAtClick,
    });
    console.log('[Map] Actually rendered', rendered, 'earthquake markers');
  }

  private renderRiskAndInfraOverlays(projection: d3.GeoProjection): void {
    if (this.state.layers.economic) {
      renderEconomicOverlayMarkers({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.weather) {
      renderWeatherOverlayMarkers({
        projection,
        overlays: this.overlays,
        weatherAlerts: this.weatherAlerts,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.outages) {
      renderOutageOverlayMarkers({
        projection,
        overlays: this.overlays,
        outages: this.outages,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.cables) {
      renderCableOperationsOverlayMarkers({
        projection,
        overlays: this.overlays,
        cableAdvisories: this.cableAdvisories,
        repairShips: this.repairShips,
        getCableName: (cableId) => this.getCableName(cableId),
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.datacenters) {
      renderDatacenterOverlayMarkers({
        projection,
        overlays: this.overlays,
        highlightedDatacenterIds: this.highlightedAssets.datacenter,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.spaceports) {
      renderSpaceportOverlayMarkers({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.minerals) {
      renderMineralOverlayMarkers({
        projection,
        overlays: this.overlays,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }
  }

  private getClusterRadius(zoom: number): number {
    return zoom >= 4 ? 15 : zoom >= 3 ? 25 : 40;
  }

  private getProtestClusterRadius(zoom: number): number {
    return zoom >= 4 ? 12 : zoom >= 3 ? 20 : 35;
  }

  private renderTechVariantOverlays(projection: d3.GeoProjection): void {
    if (this.state.layers.startupHubs) {
      renderStartupHubOverlayMarkers({
        projection,
        overlays: this.overlays,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.cloudRegions) {
      renderCloudRegionOverlayMarkers({
        projection,
        overlays: this.overlays,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.techHQs) {
      const clusters = this.clusterMarkers(TECH_HQS, projection, this.getClusterRadius(this.state.zoom), hq => hq.city);
      renderTechHqClusterOverlayMarkers({
        overlays: this.overlays,
        clusters,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.accelerators) {
      renderAcceleratorOverlayMarkers({
        projection,
        overlays: this.overlays,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.techEvents && this.techEvents.length > 0) {
      const mapWidth = this.container.clientWidth;
      const mapHeight = this.container.clientHeight;
      const visibleEvents = this.techEvents
        .map(e => ({ ...e, lon: e.lng }))
        .filter(e => {
          const pos = projection([e.lon, e.lat]);
          return pos && pos[0] >= 0 && pos[0] <= mapWidth && pos[1] >= 0 && pos[1] <= mapHeight;
        });

      const clusters = this.clusterMarkers(visibleEvents, projection, this.getClusterRadius(this.state.zoom), e => e.location);
      renderTechEventClusterOverlayMarkers({
        overlays: this.overlays,
        clusters,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (SITE_VARIANT === 'tech' && this.techActivities.length > 0) {
      renderTechActivityOverlayMarkers({
        projection,
        overlays: this.overlays,
        activities: this.techActivities,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
        onActivitySelected: (activity) => this.onTechHubClick?.(activity),
      });
    }

    if (SITE_VARIANT === 'full' && this.geoActivities.length > 0) {
      renderGeoActivityOverlayMarkers({
        projection,
        overlays: this.overlays,
        activities: this.geoActivities,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
        onActivitySelected: (activity) => this.onGeoHubClick?.(activity),
      });
    }
  }

  private renderOpsAndMilitaryOverlays(projection: d3.GeoProjection): void {
    if (this.state.layers.protests) {
      const significantProtests = this.protests.filter((event) => event.eventType === 'riot' || event.severity === 'high');
      const clusters = this.clusterMarkers(significantProtests, projection, this.getProtestClusterRadius(this.state.zoom), p => p.country);
      renderProtestClusterOverlayMarkers({
        overlays: this.overlays,
        clusters,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.flights) {
      renderFlightDelayOverlayMarkers({
        projection,
        overlays: this.overlays,
        flightDelays: this.flightDelays,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.military) {
      renderMilitaryOverlayMarkers({
        projection,
        overlays: this.overlays,
        zoom: this.state.zoom,
        flights: this.militaryFlights,
        flightClusters: this.militaryFlightClusters,
        vessels: this.militaryVessels,
        vesselClusters: this.militaryVesselClusters,
        onMarkerClick: this.showOverlayPopupAtClick,
        appendTrackLine: this.appendOverlayTrackLine,
      });
    }
  }

  private renderNaturalOverlays(projection: d3.GeoProjection): void {
    if (this.state.layers.natural) {
      renderNaturalEventOverlayMarkers({
        projection,
        overlays: this.overlays,
        naturalEvents: this.naturalEvents,
        zoom: this.state.zoom,
        onMarkerClick: this.showOverlayPopupAtClick,
      });
    }

    if (this.state.layers.fires) {
      renderFireOverlayMarkers({
        projection,
        overlays: this.overlays,
        fires: this.firmsFireData,
      });
    }
  }

  private renderOverlays(projection: d3.GeoProjection): void {
    this.overlays.innerHTML = '';
    this.renderStrategicOverlays(projection);
    this.renderSecurityOverlays(projection);
    this.renderSeismicOverlays(projection);
    this.renderRiskAndInfraOverlays(projection);
    this.renderTechVariantOverlays(projection);
    this.renderOpsAndMilitaryOverlays(projection);
    this.renderNaturalOverlays(projection);
  }

  private readonly showOverlayPopupAtClick = (event: MouseEvent, type: PopupType, data: unknown): void => {
    const rect = this.container.getBoundingClientRect();
    this.popup.show({
      type,
      data: data as never,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  private readonly appendOverlayTrackLine = (trackLine: SVGPolylineElement): void => {
    this.dynamicLayerGroup?.select('.overlays-svg').append(() => trackLine);
  };

  private projectPoint(point: [number, number]): [number, number] | null {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return null;

    const projection = this.getProjection(width, height);
    const projected = projection(point);
    if (!projected) return null;
    return [projected[0], projected[1]];
  }

  private showPopupAtPosition(
    type: PopupType,
    data: unknown,
    position: [number, number],
    relatedNews?: NewsItem[],
  ): void {
    this.popup.show({
      type,
      data: data as never,
      relatedNews,
      x: position[0],
      y: position[1],
    });
  }

  private readonly showHotspotPopupAtClick = (event: MouseEvent, hotspot: Hotspot, relatedNews: NewsItem[]): void => {
    const rect = this.container.getBoundingClientRect();
    this.popup.show({
      type: 'hotspot',
      data: hotspot,
      relatedNews,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    this.popup.loadHotspotGdeltContext(hotspot);
    this.onHotspotClick?.(hotspot);
  };

  private getRelatedNews(hotspot: Hotspot): NewsItem[] {
    return getRelatedNewsForHotspot(hotspot, this.news);
  }

  public updateHotspotActivity(news: NewsItem[]): void {
    this.news = news; // Store for related news lookup

    this.hotspots.forEach((spot) => {
      const assessment = assessHotspotActivity(spot, news);
      spot.hasBreaking = assessment.hasBreaking;
      spot.level = assessment.level;
      spot.status = assessment.status;
      updateHotspotEscalation(
        spot.id,
        assessment.matchedCount,
        assessment.hasBreaking,
        assessment.velocity,
      );
    });

    this.render();
  }

  public flashLocation(lat: number, lon: number, durationMs = 2000): void {
    const pos = this.projectPoint([lon, lat]);
    if (!pos) return;

    const flash = document.createElement('div');
    flash.className = 'map-flash';
    flash.style.left = `${pos[0]}px`;
    flash.style.top = `${pos[1]}px`;
    flash.style.setProperty('--flash-duration', `${durationMs}ms`);
    this.overlays.appendChild(flash);

    window.setTimeout(() => {
      flash.remove();
    }, durationMs);
  }

  public initEscalationGetters(): void {
    setCIIGetter(getCountryScore);
    setGeoAlertGetter(getAlertsNearLocation);
  }

  public updateMilitaryForEscalation(flights: MilitaryFlight[], vessels: MilitaryVessel[]): void {
    setMilitaryData(flights, vessels);
  }

  public getHotspotDynamicScore(hotspotId: string) {
    return getHotspotEscalation(hotspotId);
  }

  public setView(view: MapView): void {
    this.state.view = view;
    const settings = SVG_VIEW_PRESETS[view];
    this.state.zoom = settings.zoom;
    this.state.pan = settings.pan;
    this.applyTransform();
    this.render();
  }

  private static readonly ASYNC_DATA_LAYERS: Set<keyof MapLayers> = new Set([
    'natural', 'weather', 'outages', 'ais', 'protests', 'flights', 'military', 'techEvents',
  ]);

  public toggleLayer(layer: keyof MapLayers): void {
    console.log(`[Map.toggleLayer] ${layer}: ${this.state.layers[layer]} -> ${!this.state.layers[layer]}`);
    this.state.layers[layer] = !this.state.layers[layer];
    if (this.state.layers[layer]) {
      if (shouldSetLayerZoomOverride(layer, this.state.zoom, LAYER_ZOOM_THRESHOLDS)) {
        this.layerZoomOverrides[layer] = true;
      } else {
        delete this.layerZoomOverrides[layer];
      }
    } else {
      delete this.layerZoomOverrides[layer];
    }

    const btn = this.container.querySelector(`[data-layer="${layer}"]`);
    const isEnabled = this.state.layers[layer];
    const isAsyncLayer = MapComponent.ASYNC_DATA_LAYERS.has(layer);

    if (isEnabled && isAsyncLayer) {
      // Async layers: start in loading state, will be set to active when data arrives
      btn?.classList.remove('active');
      btn?.classList.add('loading');
    } else {
      // Static layers or disabling: toggle active immediately
      btn?.classList.toggle('active', isEnabled);
      btn?.classList.remove('loading');
    }

    this.onLayerChange?.(layer, this.state.layers[layer]);
    // Defer render to next frame to avoid blocking the click handler
    requestAnimationFrame(() => this.render());
  }

  public setOnLayerChange(callback: (layer: keyof MapLayers, enabled: boolean) => void): void {
    this.onLayerChange = callback;
  }

  public hideLayerToggle(layer: keyof MapLayers): void {
    const btn = this.container.querySelector(`.layer-toggle[data-layer="${layer}"]`);
    if (btn) {
      (btn as HTMLElement).style.display = 'none';
    }
  }

  public setLayerLoading(layer: keyof MapLayers, loading: boolean): void {
    const btn = this.container.querySelector(`.layer-toggle[data-layer="${layer}"]`);
    if (btn) {
      btn.classList.toggle('loading', loading);
    }
  }

  public setLayerReady(layer: keyof MapLayers, hasData: boolean): void {
    const btn = this.container.querySelector(`.layer-toggle[data-layer="${layer}"]`);
    if (!btn) return;

    btn.classList.remove('loading');
    if (this.state.layers[layer] && hasData) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  public onStateChanged(callback: (state: MapState) => void): void {
    this.onStateChange = callback;
  }

  public zoomIn(): void {
    this.state.zoom = Math.min(this.state.zoom + 0.5, 10);
    this.applyTransform();
  }

  public zoomOut(): void {
    this.state.zoom = Math.max(this.state.zoom - 0.5, 1);
    this.applyTransform();
  }

  public reset(): void {
    this.state.zoom = 1;
    this.state.pan = { x: 0, y: 0 };
    if (this.state.view !== 'global') {
      this.state.view = 'global';
      this.render();
    } else {
      this.applyTransform();
    }
  }

  public triggerHotspotClick(id: string): void {
    triggerEntityPopup({
      id,
      items: this.hotspots,
      getId: (hotspot) => hotspot.id,
      getPosition: (hotspot) => this.projectPoint([hotspot.lon, hotspot.lat]),
      getRelatedData: (hotspot) => this.getRelatedNews(hotspot),
      onShow: (hotspot, position, relatedNews) => {
        this.showPopupAtPosition('hotspot', hotspot, position, relatedNews);
      },
      onShown: (hotspot) => {
        this.popup.loadHotspotGdeltContext(hotspot);
        this.onHotspotClick?.(hotspot);
      },
    });
  }

  public triggerConflictClick(id: string): void {
    triggerEntityPopup({
      id,
      items: CONFLICT_ZONES,
      getId: (conflict) => conflict.id,
      getPosition: (conflict) => this.projectPoint(conflict.center as [number, number]),
      onShow: (conflict, position) => {
        this.showPopupAtPosition('conflict', conflict, position);
      },
    });
  }

  public triggerBaseClick(id: string): void {
    triggerEntityPopup({
      id,
      items: MILITARY_BASES,
      getId: (base) => base.id,
      getPosition: (base) => this.projectPoint([base.lon, base.lat]),
      onShow: (base, position) => {
        this.showPopupAtPosition('base', base, position);
      },
    });
  }

  public triggerPipelineClick(id: string): void {
    triggerEntityPopup({
      id,
      items: PIPELINES,
      getId: (pipeline) => pipeline.id,
      getPosition: (pipeline) => {
        const midpoint = getPolylineMidpoint(pipeline.points as [number, number][]);
        return midpoint ? this.projectPoint(midpoint) : null;
      },
      onShow: (pipeline, position) => {
        this.showPopupAtPosition('pipeline', pipeline, position);
      },
    });
  }

  public triggerCableClick(id: string): void {
    triggerEntityPopup({
      id,
      items: UNDERSEA_CABLES,
      getId: (cable) => cable.id,
      getPosition: (cable) => {
        const midpoint = getPolylineMidpoint(cable.points as [number, number][]);
        return midpoint ? this.projectPoint(midpoint) : null;
      },
      onShow: (cable, position) => {
        this.showPopupAtPosition('cable', cable, position);
      },
    });
  }

  public triggerDatacenterClick(id: string): void {
    triggerEntityPopup({
      id,
      items: AI_DATA_CENTERS,
      getId: (datacenter) => datacenter.id,
      getPosition: (datacenter) => this.projectPoint([datacenter.lon, datacenter.lat]),
      onShow: (datacenter, position) => {
        this.showPopupAtPosition('datacenter', datacenter, position);
      },
    });
  }

  public triggerNuclearClick(id: string): void {
    triggerEntityPopup({
      id,
      items: NUCLEAR_FACILITIES,
      getId: (facility) => facility.id,
      getPosition: (facility) => this.projectPoint([facility.lon, facility.lat]),
      onShow: (facility, position) => {
        this.showPopupAtPosition('nuclear', facility, position);
      },
    });
  }

  public triggerIrradiatorClick(id: string): void {
    triggerEntityPopup({
      id,
      items: GAMMA_IRRADIATORS,
      getId: (irradiator) => irradiator.id,
      getPosition: (irradiator) => this.projectPoint([irradiator.lon, irradiator.lat]),
      onShow: (irradiator, position) => {
        this.showPopupAtPosition('irradiator', irradiator, position);
      },
    });
  }

  public enableLayer(layer: keyof MapLayers): void {
    if (!this.state.layers[layer]) {
      this.state.layers[layer] = true;
      if (shouldSetLayerZoomOverride(layer, this.state.zoom, LAYER_ZOOM_THRESHOLDS)) {
        this.layerZoomOverrides[layer] = true;
      } else {
        delete this.layerZoomOverrides[layer];
      }
      const btn = document.querySelector(`[data-layer="${layer}"]`);
      btn?.classList.add('active');
      this.onLayerChange?.(layer, true);
      this.render();
    }
  }

  public highlightAssets(assets: RelatedAsset[] | null): void {
    (Object.keys(this.highlightedAssets) as AssetType[]).forEach((type) => {
      this.highlightedAssets[type].clear();
    });

    if (assets) {
      assets.forEach((asset) => {
        this.highlightedAssets[asset.type].add(asset.id);
      });
    }

    this.render();
  }

  private clampPan(): void {
    const zoom = this.state.zoom;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Allow generous panning - maps should be explorable
    // Scale limits with zoom to allow reaching edges at higher zoom
    const maxPanX = (width / 2) * Math.max(1, zoom * 0.8);
    const maxPanY = (height / 2) * Math.max(1, zoom * 0.8);

    this.state.pan.x = Math.max(-maxPanX, Math.min(maxPanX, this.state.pan.x));
    this.state.pan.y = Math.max(-maxPanY, Math.min(maxPanY, this.state.pan.y));
  }

  private applyTransform(): void {
    this.clampPan();
    const zoom = this.state.zoom;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // With transform-origin: 0 0, we need to offset to keep center in view
    // Formula: translate first to re-center, then scale
    const centerOffsetX = (width / 2) * (1 - zoom);
    const centerOffsetY = (height / 2) * (1 - zoom);
    const tx = centerOffsetX + this.state.pan.x * zoom;
    const ty = centerOffsetY + this.state.pan.y * zoom;

    this.wrapper.style.transform = `translate(${tx}px, ${ty}px) scale(${zoom})`;

    // Set CSS variable for counter-scaling labels/markers
    // Labels: max 1.5x scale, so counter-scale = min(1.5, zoom) / zoom
    // Markers: fixed size, so counter-scale = 1 / zoom
    const labelScale = Math.min(1.5, zoom) / zoom;
    const markerScale = 1 / zoom;
    this.wrapper.style.setProperty('--label-scale', String(labelScale));
    this.wrapper.style.setProperty('--marker-scale', String(markerScale));
    this.wrapper.style.setProperty('--zoom', String(zoom));

    // Smart label hiding based on zoom level and overlap
    this.updateLabelVisibility(zoom);
    this.updateZoomLayerVisibility();
    this.emitStateChange();
  }

  private updateZoomLayerVisibility(): void {
    const zoom = this.state.zoom;
    (Object.keys(LAYER_ZOOM_THRESHOLDS) as (keyof MapLayers)[]).forEach((layer) => {
      const enabled = this.state.layers[layer];
      const override = Boolean(this.layerZoomOverrides[layer]);
      const visibility = getLayerZoomVisibilityState(
        layer,
        zoom,
        enabled,
        override,
        LAYER_ZOOM_THRESHOLDS,
      );
      const hiddenAttr = `data-layer-hidden-${layer}`;
      const labelsHiddenAttr = `data-labels-hidden-${layer}`;

      if (visibility.isVisible) {
        this.wrapper.removeAttribute(hiddenAttr);
      } else {
        this.wrapper.setAttribute(hiddenAttr, 'true');
      }

      if (visibility.labelsVisible) {
        this.wrapper.removeAttribute(labelsHiddenAttr);
      } else {
        this.wrapper.setAttribute(labelsHiddenAttr, 'true');
      }

      const btn = document.querySelector(`[data-layer="${layer}"]`);
      btn?.classList.toggle('auto-hidden', visibility.autoHidden);
    });
  }

  private emitStateChange(): void {
    this.onStateChange?.(this.getState());
  }

  private updateLabelVisibility(zoom: number): void {
    const labels = this.overlays.querySelectorAll('.hotspot-label, .earthquake-label, .weather-label, .apt-label');
    const labelRects: { el: Element; rect: DOMRect; priority: number }[] = [];

    // Collect all label bounds with priority
    labels.forEach((label) => {
      const el = label as HTMLElement;
      const parent = el.closest('.hotspot, .earthquake-marker, .weather-marker, .apt-marker');

      // Assign priority based on parent type and level
      let priority = 1;
      if (parent?.classList.contains('hotspot')) {
        const marker = parent.querySelector('.hotspot-marker');
        if (marker?.classList.contains('high')) priority = 5;
        else if (marker?.classList.contains('elevated')) priority = 3;
        else priority = 2;
      } else if (parent?.classList.contains('earthquake-marker')) {
        priority = 4; // Earthquakes are important
      } else if (parent?.classList.contains('weather-marker')) {
        if (parent.classList.contains('extreme')) priority = 5;
        else if (parent.classList.contains('severe')) priority = 4;
        else priority = 2;
      }

      // Reset visibility first
      el.style.opacity = '1';

      // Get bounding rect (accounting for transforms)
      const rect = el.getBoundingClientRect();
      labelRects.push({ el, rect, priority });
    });

    // Sort by priority (highest first)
    labelRects.sort((a, b) => b.priority - a.priority);

    // Hide overlapping labels (keep higher priority visible)
    const visibleRects: DOMRect[] = [];
    const minDistance = 30 / zoom; // Minimum pixel distance between labels

    labelRects.forEach(({ el, rect, priority }) => {
      const overlaps = visibleRects.some((vr) => {
        const dx = Math.abs((rect.left + rect.width / 2) - (vr.left + vr.width / 2));
        const dy = Math.abs((rect.top + rect.height / 2) - (vr.top + vr.height / 2));
        return dx < (rect.width + vr.width) / 2 + minDistance &&
               dy < (rect.height + vr.height) / 2 + minDistance;
      });

      if (overlaps && zoom < 2) {
        // Hide overlapping labels when zoomed out, but keep high priority visible
        (el as HTMLElement).style.opacity = priority >= 4 ? '0.7' : '0';
      } else {
        visibleRects.push(rect);
      }
    });
  }

  public onHotspotClicked(callback: (hotspot: Hotspot) => void): void {
    this.onHotspotClick = callback;
  }

  public onTimeRangeChanged(callback: (range: TimeRange) => void): void {
    this.onTimeRangeChange = callback;
  }

  public getState(): MapState {
    return { ...this.state };
  }

  public getCenter(): { lat: number; lon: number } | null {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const projection = this.getProjection(width, height);
    if (!projection.invert) return null;
    const zoom = this.state.zoom;
    const centerX = width / (2 * zoom) - this.state.pan.x;
    const centerY = height / (2 * zoom) - this.state.pan.y;
    const coords = projection.invert([centerX, centerY]);
    if (!coords) return null;
    return { lon: coords[0], lat: coords[1] };
  }

  public getTimeRange(): TimeRange {
    return this.state.timeRange;
  }

  public setZoom(zoom: number): void {
    this.state.zoom = Math.max(1, Math.min(10, zoom));
    this.applyTransform();
    // Ensure base layer is intact after zoom change
    this.ensureBaseLayerIntact();
  }

  private ensureBaseLayerIntact(): void {
    // Query DOM directly instead of relying on cached d3 selection
    const svgNode = this.svg.node();
    const domBaseGroup = svgNode?.querySelector('.map-base');
    const selectionNode = this.baseLayerGroup?.node();

    // Check for stale selection (d3 reference doesn't match DOM)
    if (domBaseGroup && selectionNode !== domBaseGroup) {
      console.warn('[Map] Stale base layer selection detected, forcing full rebuild');
      this.baseRendered = false;
      this.render();
      return;
    }

    // Check for missing countries
    const countryCount = domBaseGroup?.querySelectorAll('.country').length ?? 0;
    if (countryCount === 0 && this.countryFeatures && this.countryFeatures.length > 0) {
      console.warn('[Map] Base layer missing countries, triggering recovery render');
      this.baseRendered = false;
      this.render();
    }
  }

  public setCenter(lat: number, lon: number): void {
    console.log('[Map] setCenter called:', { lat, lon });
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const projection = this.getProjection(width, height);
    const pos = projection([lon, lat]);
    console.log('[Map] projected pos:', pos, 'container:', { width, height }, 'zoom:', this.state.zoom);
    if (!pos) return;
    // Pan formula: after applyTransform() computes tx = centerOffset + pan*zoom,
    // and transform is translate(tx,ty) scale(zoom), to center on pos:
    // pos*zoom + tx = width/2 → tx = width/2 - pos*zoom
    // Solving: (width/2)(1-zoom) + pan*zoom = width/2 - pos*zoom
    // → pan = width/2 - pos (independent of zoom)
    this.state.pan = {
      x: width / 2 - pos[0],
      y: height / 2 - pos[1],
    };
    this.applyTransform();
    // Ensure base layer is intact after pan
    this.ensureBaseLayerIntact();
  }

  public setLayers(layers: MapLayers): void {
    this.state.layers = { ...layers };
    this.syncLayerButtons();
    this.render();
  }

  public setEarthquakes(earthquakes: Earthquake[]): void {
    console.log('[Map] setEarthquakes called with', earthquakes.length, 'earthquakes');
    if (earthquakes.length > 0 || this.earthquakes.length === 0) {
      this.earthquakes = earthquakes;
    } else {
      console.log('[Map] Keeping existing', this.earthquakes.length, 'earthquakes (new data was empty)');
    }
    this.render();
  }

  public setWeatherAlerts(alerts: WeatherAlert[]): void {
    this.weatherAlerts = alerts;
    this.render();
  }

  public setOutages(outages: InternetOutage[]): void {
    this.outages = outages;
    this.render();
  }

  public setAisData(disruptions: AisDisruptionEvent[], density: AisDensityZone[]): void {
    this.aisDisruptions = disruptions;
    this.aisDensity = density;
    this.render();
  }

  public setCableActivity(advisories: CableAdvisory[], repairShips: RepairShip[]): void {
    this.cableAdvisories = advisories;
    this.repairShips = repairShips;
    this.popup.setCableActivity(advisories, repairShips);
    this.render();
  }

  public setProtests(events: SocialUnrestEvent[]): void {
    this.protests = events;
    this.render();
  }

  public setFlightDelays(delays: AirportDelayAlert[]): void {
    this.flightDelays = delays;
    this.render();
  }

  public setMilitaryFlights(flights: MilitaryFlight[], clusters: MilitaryFlightCluster[] = []): void {
    this.militaryFlights = flights;
    this.militaryFlightClusters = clusters;
    this.render();
  }

  public setMilitaryVessels(vessels: MilitaryVessel[], clusters: MilitaryVesselCluster[] = []): void {
    this.militaryVessels = vessels;
    this.militaryVesselClusters = clusters;
    this.render();
  }

  public setNaturalEvents(events: NaturalEvent[]): void {
    this.naturalEvents = events;
    this.render();
  }

  public setFires(fires: Array<{ lat: number; lon: number; brightness: number; frp: number; confidence: number; region: string; acq_date: string; daynight: string }>): void {
    this.firmsFireData = fires;
    this.render();
  }

  public setTechEvents(events: TechEventMarker[]): void {
    this.techEvents = events;
    this.render();
  }

  public setNewsLocations(_data: Array<{ lat: number; lon: number; title: string; threatLevel: string }>): void {
    // SVG fallback: news locations rendered as simple circles
    // For now, skip on SVG map to keep mobile lightweight
  }

  public setTechActivity(activities: TechHubActivity[]): void {
    this.techActivities = activities;
    this.render();
  }

  public setOnTechHubClick(handler: (hub: TechHubActivity) => void): void {
    this.onTechHubClick = handler;
  }

  public setGeoActivity(activities: GeoHubActivity[]): void {
    this.geoActivities = activities;
    this.render();
  }

  public setOnGeoHubClick(handler: (hub: GeoHubActivity) => void): void {
    this.onGeoHubClick = handler;
  }

  private getCableAdvisory(cableId: string): CableAdvisory | undefined {
    const advisories = this.cableAdvisories.filter((advisory) => advisory.cableId === cableId);
    return advisories.reduce<CableAdvisory | undefined>((latest, advisory) => {
      if (!latest) return advisory;
      return advisory.reported.getTime() > latest.reported.getTime() ? advisory : latest;
    }, undefined);
  }

  private getCableName(cableId: string): string {
    return UNDERSEA_CABLES.find((cable) => cable.id === cableId)?.name || cableId;
  }

  public getHotspotLevels(): Record<string, string> {
    const levels: Record<string, string> = {};
    this.hotspots.forEach(spot => {
      levels[spot.name] = spot.level || 'low';
    });
    return levels;
  }

  public setHotspotLevels(levels: Record<string, string>): void {
    this.hotspots.forEach(spot => {
      if (levels[spot.name]) {
        spot.level = levels[spot.name] as 'high' | 'elevated' | 'low';
      }
    });
    this.render();
  }
}
