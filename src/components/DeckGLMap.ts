/**
 * DeckGLMap - WebGL-accelerated map visualization for desktop
 * Uses deck.gl for high-performance rendering of large datasets
 * Mobile devices gracefully degrade to the D3/SVG-based Map component
 */
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer, LayersList, PickingInfo } from '@deck.gl/core';
import maplibregl from 'maplibre-gl';
import type {
  MapLayers,
  Hotspot,
  NewsItem,
  Earthquake,
  InternetOutage,
  RelatedAsset,
  AssetType,
  AisDisruptionEvent,
  AisDensityZone,
  CableAdvisory,
  RepairShip,
  SocialUnrestEvent,
  AirportDelayAlert,
  MilitaryFlight,
  MilitaryVessel,
  MilitaryFlightCluster,
  MilitaryVesselCluster,
  NaturalEvent,
  UcdpGeoEvent,
  DisplacementFlow,
  ClimateAnomaly,
} from '@/types';
import type { WeatherAlert } from '@/services/weather';
import { throttle, debounce, rafSchedule } from '@/utils/index';
import {
  INTEL_HOTSPOTS,
  CONFLICT_ZONES,
  MILITARY_BASES,
  UNDERSEA_CABLES,
  NUCLEAR_FACILITIES,
  GAMMA_IRRADIATORS,
  PIPELINES,
  AI_DATA_CENTERS,
  SITE_VARIANT,
  TECH_HQS,
} from '@/config';
import { MapPopup, type PopupType } from './MapPopup';
import {
  createClimateHeatmapLayer,
  createDisplacementArcsLayer,
  createUcdpEventsScatterLayer,
} from './map/layers/deck-analytics-layers';
import {
  createConflictZonesGeoLayer,
  createHotspotsScatterLayer,
} from './map/layers/deck-core-layers';
import {
  createAisDensityScatterLayer,
  createAisDisruptionsScatterLayer,
  createCableAdvisoriesScatterLayer,
  createEarthquakesScatterLayer,
  createFiresScatterLayer,
  createFlightDelaysScatterLayer,
  createMilitaryFlightClustersScatterLayer,
  createMilitaryFlightsScatterLayer,
  createMilitaryVesselClustersScatterLayer,
  createMilitaryVesselsScatterLayer,
  createNaturalEventsScatterLayer,
  createOutagesScatterLayer,
  createRepairShipsScatterLayer,
  createWeatherScatterLayer,
} from './map/layers/deck-dynamic-scatter-layers';
import {
  createAcceleratorsScatterLayer,
  createAptGroupsScatterLayer,
  createCloudRegionsScatterLayer,
  createEconomicCentersScatterLayer,
  createIrradiatorsScatterLayer,
  createMineralsScatterLayer,
  createPortsScatterLayer,
  createSpaceportsScatterLayer,
  createStartupHubsScatterLayer,
  createWaterwaysScatterLayer,
} from './map/layers/deck-static-scatter-layers';
import {
  createBasesIconLayer,
  createDatacentersIconLayer,
  createNuclearIconLayer,
} from './map/layers/deck-icon-layers';
import { createNewsLocationScatterLayers } from './map/layers/deck-news-layers';
import {
  createDatacenterClusterOverlayElement,
  createProtestClusterOverlayElement,
  type ScreenCluster,
  createTechEventClusterOverlayElement,
  createTechHqClusterOverlayElement,
} from './map/layers/deck-cluster-overlay-elements';
import {
  applyHotspotOverlayTransform,
  createHotspotOverlayElement,
  getHotspotMarkerScale,
  getSortedHighActivityHotspots,
  parseHotspotClusterKey,
} from './map/layers/deck-hotspot-overlays';
import {
  createCablesPathLayer,
  createPipelinesPathLayer,
} from './map/layers/deck-path-layers';
import {
  createDeckControlsElement,
  createDeckTimeSliderElement,
} from './map/shared/deck-controls';
import {
  clearDeckCountryHighlight,
  loadDeckCountryBoundaries,
  setDeckCountryHighlight,
} from './map/shared/deck-country-boundaries';
import {
  createDeckLayerTogglePanel,
  createDeckLegendElement,
  createDeckTimestampElement,
  toggleDeckLayerHelpPopup,
  updateDeckTimestampElement,
} from './map/shared/deck-ui-panels';
import {
  flashDeckLocationMarker,
  projectDeckLocationToScreen,
  resolveDeckPopupPosition,
} from './map/shared/deck-screen';
import { flashAssetIds } from './map/shared/asset-flash';
import {
  setDeckLayerToggleChecked,
  setDeckLayerToggleLoading,
  setDeckLayerToggleReady,
  setDeckLayerToggleVisibility,
} from './map/shared/deck-layer-toggle-ui';
import { DECK_LAYER_ZOOM_THRESHOLDS } from './map/shared/layer-thresholds';
import { DECK_VIEW_PRESETS } from './map/shared/view-presets';
import { isLayerVisibleAtZoom } from './map/shared/visibility';
import { clusterGeospatialMarkers } from './map/shared/clustering';
import { getRelatedNewsForHotspot } from './map/shared/hotspot-news';
import { assessRecentHotspotActivity } from './map/shared/hotspot-activity';
import { getPolylineMidpoint, triggerEntityPopup } from './map/shared/popup-triggers';
import { getDeckTooltipHtml, resolveDeckClickPopup } from './map/shared/deck-interaction';
import type { GlobalMapView, MapTimeRange } from './map/shared/types';
import {
  updateHotspotEscalation,
  getHotspotEscalation,
  setMilitaryData,
  setCIIGetter,
  setGeoAlertGetter,
} from '@/services/hotspot-escalation';
import { getCountryScore } from '@/services/country-instability';
import { getAlertsNearLocation } from '@/services/geo-convergence';

export type TimeRange = MapTimeRange;
export type DeckMapView = GlobalMapView;
type MapInteractionMode = 'flat' | '3d';

interface DeckMapState {
  zoom: number;
  pan: { x: number; y: number };
  view: DeckMapView;
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

type TechHqMarker = (typeof TECH_HQS)[number];
type DatacenterMarker = (typeof AI_DATA_CENTERS)[number];

const MAP_INTERACTION_MODE: MapInteractionMode =
  import.meta.env.VITE_MAP_INTERACTION_MODE === 'flat' ? 'flat' : '3d';

// Zoom thresholds for layer visibility and labels (matches old Map.ts)
// Used in renderClusterOverlays for zoom-dependent label visibility
const LAYER_ZOOM_THRESHOLDS = DECK_LAYER_ZOOM_THRESHOLDS;
// Export for external use
export { LAYER_ZOOM_THRESHOLDS };

// Color constants matching the dark theme
const COLORS = {
  hotspotHigh: [255, 68, 68, 200] as [number, number, number, number],
  hotspotElevated: [255, 165, 0, 200] as [number, number, number, number],
  hotspotLow: [255, 255, 0, 180] as [number, number, number, number],
  conflict: [255, 0, 0, 100] as [number, number, number, number],
  base: [0, 150, 255, 200] as [number, number, number, number],
  nuclear: [255, 215, 0, 200] as [number, number, number, number],
  datacenter: [0, 255, 200, 180] as [number, number, number, number],
  cable: [0, 200, 255, 150] as [number, number, number, number],
  cableHighlight: [255, 100, 100, 200] as [number, number, number, number],
  earthquake: [255, 100, 50, 200] as [number, number, number, number],
  vesselMilitary: [255, 100, 100, 220] as [number, number, number, number],
  flightMilitary: [255, 50, 50, 220] as [number, number, number, number],
  protest: [255, 150, 0, 200] as [number, number, number, number],
  outage: [255, 50, 50, 180] as [number, number, number, number],
  weather: [100, 150, 255, 180] as [number, number, number, number],
  startupHub: [0, 255, 150, 200] as [number, number, number, number],
  techHQ: [100, 200, 255, 200] as [number, number, number, number],
  accelerator: [255, 200, 0, 200] as [number, number, number, number],
  cloudRegion: [150, 100, 255, 180] as [number, number, number, number],
  ucdpStateBased: [255, 50, 50, 200] as [number, number, number, number],
  ucdpNonState: [255, 165, 0, 200] as [number, number, number, number],
  ucdpOneSided: [255, 255, 0, 200] as [number, number, number, number],
};

// SVG icons as data URLs for different marker shapes
const MARKER_ICONS = {
  // Square - for datacenters
  square: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="3" fill="white"/></svg>`),
  // Diamond - for hotspots
  diamond: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 30,16 16,30 2,16" fill="white"/></svg>`),
  // Triangle up - for military bases
  triangleUp: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 30,28 2,28" fill="white"/></svg>`),
  // Hexagon - for nuclear
  hexagon: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="white"/></svg>`),
  // Circle - fallback
  circle: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="white"/></svg>`),
  // Star - for special markers
  star: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="16,2 20,12 30,12 22,19 25,30 16,23 7,30 10,19 2,12 12,12" fill="white"/></svg>`),
};

export class DeckGLMap {
  private container: HTMLElement;
  private deckOverlay: MapboxOverlay | null = null;
  private maplibreMap: maplibregl.Map | null = null;
  private state: DeckMapState;
  private popup: MapPopup;

  // Data stores
  private hotspots: HotspotWithBreaking[];
  private earthquakes: Earthquake[] = [];
  private weatherAlerts: WeatherAlert[] = [];
  private outages: InternetOutage[] = [];
  private aisDisruptions: AisDisruptionEvent[] = [];
  private aisDensity: AisDensityZone[] = [];
  private cableAdvisories: CableAdvisory[] = [];
  private repairShips: RepairShip[] = [];
  private protests: SocialUnrestEvent[] = [];
  private militaryFlights: MilitaryFlight[] = [];
  private militaryFlightClusters: MilitaryFlightCluster[] = [];
  private militaryVessels: MilitaryVessel[] = [];
  private militaryVesselClusters: MilitaryVesselCluster[] = [];
  private naturalEvents: NaturalEvent[] = [];
  private firmsFireData: Array<{ lat: number; lon: number; brightness: number; frp: number; confidence: number; region: string; acq_date: string; daynight: string }> = [];
  private techEvents: TechEventMarker[] = [];
  private flightDelays: AirportDelayAlert[] = [];
  private news: NewsItem[] = [];
  private newsLocations: Array<{ lat: number; lon: number; title: string; threatLevel: string }> = [];
  private newsLocationFirstSeen = new Map<string, number>();
  private ucdpEvents: UcdpGeoEvent[] = [];
  private displacementFlows: DisplacementFlow[] = [];
  private climateAnomalies: ClimateAnomaly[] = [];

  // Country highlight state
  private countryGeoJsonLoaded = false;

  // Callbacks
  private onHotspotClick?: (hotspot: Hotspot) => void;
  private onTimeRangeChange?: (range: TimeRange) => void;
  private onCountryClick?: (lat: number, lon: number) => void;
  private onLayerChange?: (layer: keyof MapLayers, enabled: boolean) => void;
  private onStateChange?: (state: DeckMapState) => void;

  // Highlighted assets
  private highlightedAssets: Record<AssetType, Set<string>> = {
    pipeline: new Set(),
    cable: new Set(),
    datacenter: new Set(),
    base: new Set(),
    nuclear: new Set(),
  };

  private timestampIntervalId: ReturnType<typeof setInterval> | null = null;
  private renderScheduled = false;
  private renderPaused = false;
  private renderPending = false;
  private resizeObserver: ResizeObserver | null = null;

  private layerCache: Map<string, Layer> = new Map();
  private lastZoomThreshold = 0;
  private clusterElementCache: Map<string, HTMLElement> = new Map();
  private lastClusterState: Map<string, { x: number; y: number; count: number }> = new Map();
  private clusterResultCache: Map<string, ScreenCluster<unknown>[]> = new Map();
  private lastClusterZoom = -1;
  private newsPulseIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastCableHighlightSignature = '';
  private lastPipelineHighlightSignature = '';
  private throttledRenderClusters: () => void;
  private debouncedRebuildLayers: () => void;
  private rafUpdateLayers: () => void;
  private moveTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private hotspotSyncRafId: number | null = null;
  private hotspotOverlayNeedsReconcile = false;

  constructor(container: HTMLElement, initialState: DeckMapState) {
    this.container = container;
    this.state = initialState;
    this.hotspots = [...INTEL_HOTSPOTS];

    this.throttledRenderClusters = throttle(() => this.renderClusterOverlays(), 16);
    this.debouncedRebuildLayers = debounce(() => {
      this.maplibreMap?.resize();
      this.deckOverlay?.setProps({ layers: this.buildLayers() });
    }, 150);
    this.rafUpdateLayers = rafSchedule(() => {
      this.deckOverlay?.setProps({ layers: this.buildLayers() });
    });

    this.setupDOM();
    this.popup = new MapPopup(container);

    this.initMapLibre();

    this.maplibreMap?.on('load', () => {
      this.initDeck();
      this.loadCountryBoundaries();
      this.render();
    });

    this.setupResizeObserver();

    this.createControls();
    this.createTimeSlider();
    this.createLayerToggles();
    this.createLegend();
    this.createTimestamp();
  }

  // Cluster overlay container
  private clusterOverlay: HTMLElement | null = null;

  private setupDOM(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'deckgl-map-wrapper';
    wrapper.id = 'deckglMapWrapper';
    wrapper.style.cssText = 'position: relative; width: 100%; height: 100%; overflow: hidden;';

    // MapLibre container - deck.gl renders directly into MapLibre via MapboxOverlay
    const mapContainer = document.createElement('div');
    mapContainer.id = 'deckgl-basemap';
    mapContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';
    wrapper.appendChild(mapContainer);

    // HTML overlay container for cluster markers (rendered on top of deck.gl)
    this.clusterOverlay = document.createElement('div');
    this.clusterOverlay.id = 'deckgl-cluster-overlay';
    this.clusterOverlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;';
    wrapper.appendChild(this.clusterOverlay);

    this.container.appendChild(wrapper);
  }

  private initMapLibre(): void {
    const preset = DECK_VIEW_PRESETS[this.state.view];

    this.maplibreMap = new maplibregl.Map({
      container: 'deckgl-basemap',
      style: {
        version: 8,
        name: 'Dark',
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#0a0f0c',
            },
          },
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: [preset.longitude, preset.latitude],
      zoom: preset.zoom,
      attributionControl: false,
      interactive: true,
      ...(MAP_INTERACTION_MODE === 'flat'
        ? {
            maxPitch: 0,
            pitchWithRotate: false,
            dragRotate: false,
            touchPitch: false,
          }
        : {}),
    });
  }

  private initDeck(): void {
    if (!this.maplibreMap) return;

    this.deckOverlay = new MapboxOverlay({
      interleaved: false,
      layers: this.buildLayers(),
      getTooltip: (info: PickingInfo) => this.getTooltip(info),
      onClick: (info: PickingInfo) => this.handleClick(info),
      pickingRadius: 10,
      useDevicePixels: window.devicePixelRatio > 2 ? 2 : true,
    });

    this.maplibreMap.addControl(this.deckOverlay as unknown as maplibregl.IControl);

    this.maplibreMap.on('movestart', () => {
      if (this.moveTimeoutId) {
        clearTimeout(this.moveTimeoutId);
        this.moveTimeoutId = null;
      }
      this.clusterOverlay!.style.opacity = '0.7';
    });

    this.maplibreMap.on('moveend', () => {
      this.clusterOverlay!.style.opacity = '1';
      this.scheduleHotspotOverlaySync({ reconcile: true });
      this.throttledRenderClusters();
    });

    this.maplibreMap.on('move', () => {
      this.scheduleHotspotOverlaySync();
      if (this.moveTimeoutId) clearTimeout(this.moveTimeoutId);
      this.moveTimeoutId = setTimeout(() => this.throttledRenderClusters(), 100);
    });

    this.maplibreMap.on('zoom', () => {
      this.scheduleHotspotOverlaySync();
      if (this.moveTimeoutId) clearTimeout(this.moveTimeoutId);
      this.moveTimeoutId = setTimeout(() => this.throttledRenderClusters(), 100);
    });

    this.maplibreMap.on('zoomend', () => {
      const currentZoom = Math.floor(this.maplibreMap?.getZoom() || 2);
      const thresholdCrossed = Math.abs(currentZoom - this.lastZoomThreshold) >= 1;
      if (thresholdCrossed) {
        this.lastZoomThreshold = currentZoom;
        this.debouncedRebuildLayers();
      }
    });
  }

  private setupResizeObserver(): void {
    // Watch container for size changes and trigger MapLibre resize
    this.resizeObserver = new ResizeObserver(() => {
      if (this.maplibreMap) {
        this.maplibreMap.resize();
        this.renderClusterOverlays();
      }
    });
    this.resizeObserver.observe(this.container);
  }

  // Generic marker clustering - groups markers within pixelRadius into clusters
  // groupKey function ensures only items with same key can cluster (e.g., same city)
  private clusterMarkers<T extends { lat: number; lon?: number; lng?: number }>(
    items: T[],
    pixelRadius: number,
    getGroupKey?: (item: T) => string
  ): Array<{ items: T[]; center: [number, number]; screenPos: [number, number] }> {
    if (!this.maplibreMap) return [];
    const clusters = clusterGeospatialMarkers(
      items,
      pixelRadius,
      (point) => {
        const projected = this.maplibreMap?.project(point);
        return projected ? [projected.x, projected.y] : null;
      },
      getGroupKey,
    );

    return clusters.map((cluster) => ({
      items: cluster.items,
      center: cluster.center,
      screenPos: cluster.pos,
    }));
  }

  private getClusterKey(type: string, center: [number, number], count: number): string {
    return `${type}-${center[0].toFixed(4)}-${center[1].toFixed(4)}-${count}`;
  }

  private getSetSignature(set: Set<string>): string {
    return [...set].sort().join('|');
  }

  private hasRecentNews(now = Date.now()): boolean {
    for (const ts of this.newsLocationFirstSeen.values()) {
      if (now - ts < 30_000) return true;
    }
    return false;
  }

  private projectClusterCenter(
    center: [number, number],
    fallback: [number, number]
  ): [number, number] {
    if (!this.maplibreMap) return fallback;
    const projected = this.maplibreMap.project(center);
    if (!projected) return fallback;
    return [projected.x, projected.y];
  }

  private updateClusterElement(
    key: string,
    screenPos: [number, number],
    renderFn: () => HTMLElement
  ): HTMLElement {
    const existing = this.clusterElementCache.get(key);
    const x = Math.round(screenPos[0]);
    const y = Math.round(screenPos[1]);

    if (existing) {
      existing.style.transform = `translate(${x - 16}px, ${y - 16}px)`;
      return existing;
    }

    const element = renderFn();
    element.style.position = 'absolute';
    element.style.left = '0';
    element.style.top = '0';
    element.style.transform = `translate(${x - 16}px, ${y - 16}px)`;
    element.dataset.clusterKey = key;
    this.clusterElementCache.set(key, element);
    return element;
  }

  private pruneClusterCache(activeKeys: Set<string>): void {
    for (const [key, element] of this.clusterElementCache) {
      if (!activeKeys.has(key)) {
        element.remove();
        this.clusterElementCache.delete(key);
        this.lastClusterState.delete(key);
      }
    }
  }

  private invalidateClusterElementsByType(type: 'event' | 'protest'): void {
    const prefix = `${type}-`;
    for (const [key, element] of this.clusterElementCache) {
      if (key.startsWith(prefix)) {
        element.remove();
        this.clusterElementCache.delete(key);
      }
    }
    for (const key of this.lastClusterState.keys()) {
      if (key.startsWith(prefix)) {
        this.lastClusterState.delete(key);
      }
    }
  }

  private getTechClusterRadius(zoom: number): number {
    return zoom >= 4 ? 15 : zoom >= 3 ? 25 : 40;
  }

  private getProtestClusterRadius(zoom: number): number {
    return zoom >= 4 ? 12 : zoom >= 3 ? 20 : 35;
  }

  private getDatacenterClusterRadius(zoom: number): number {
    return zoom >= 3 ? 30 : zoom >= 2 ? 50 : 70;
  }

  private getCachedClusters<T>(
    cacheKey: string,
    zoomChanged: boolean,
    compute: () => ScreenCluster<T>[],
  ): ScreenCluster<T>[] {
    const cached = this.clusterResultCache.get(cacheKey) as ScreenCluster<T>[] | undefined;
    if (cached && !zoomChanged) return cached;

    const next = compute();
    this.clusterResultCache.set(cacheKey, next as ScreenCluster<unknown>[]);
    return next;
  }

  private renderClusterSet<T>(
    clusters: ScreenCluster<T>[],
    type: string,
    activeKeys: Set<string>,
    createElement: (cluster: ScreenCluster<T>) => HTMLElement,
  ): void {
    clusters.forEach((cluster) => {
      const screenPos = this.projectClusterCenter(cluster.center, cluster.screenPos);
      const key = this.getClusterKey(type, cluster.center, cluster.items.length);
      activeKeys.add(key);
      if (!this.hasClusterMoved(key, screenPos, cluster.items.length)) return;

      const element = this.updateClusterElement(key, screenPos, () => createElement(cluster));
      if (!element.parentElement) this.clusterOverlay?.appendChild(element);
    });
  }

  private renderTechClusterOverlays(zoom: number, zoomChanged: boolean, activeKeys: Set<string>): void {
    if (SITE_VARIANT !== 'tech') return;

    if (this.state.layers.techHQs) {
      const clusterRadius = this.getTechClusterRadius(zoom);
      const cacheKey = `hq-${clusterRadius}`;
      const clusters = this.getCachedClusters(
        cacheKey,
        zoomChanged,
        () => this.clusterMarkers(TECH_HQS, clusterRadius, hq => hq.city) as ScreenCluster<TechHqMarker>[],
      );
      this.renderClusterSet(clusters, 'hq', activeKeys, (cluster) => createTechHqClusterOverlayElement({
        cluster,
        zoom,
        onPopupClick: this.showOverlayPopupAtClick,
      }));
    }

    if (this.state.layers.techEvents && this.techEvents.length > 0) {
      const clusterRadius = this.getTechClusterRadius(zoom);
      const cacheKey = `event-${clusterRadius}`;
      const clusters = this.getCachedClusters(
        cacheKey,
        zoomChanged,
        () => {
          const eventsWithLon = this.techEvents.map(e => ({ ...e, lon: e.lng }));
          return this.clusterMarkers(eventsWithLon, clusterRadius, e => e.location) as ScreenCluster<TechEventMarker & { lon: number }>[];
        },
      );
      this.renderClusterSet(clusters, 'event', activeKeys, (cluster) => createTechEventClusterOverlayElement({
        cluster,
        onPopupClick: this.showOverlayPopupAtClick,
      }));
    }
  }

  private renderProtestClusterOverlays(zoom: number, zoomChanged: boolean, activeKeys: Set<string>): void {
    if (!this.state.layers.protests || this.protests.length === 0) return;

    const clusterRadius = this.getProtestClusterRadius(zoom);
    const cacheKey = `protest-${clusterRadius}`;
    const clusters = this.getCachedClusters(
      cacheKey,
      zoomChanged,
      () => {
        const significantProtests = this.protests.filter(p => p.severity === 'high' || p.eventType === 'riot');
        return this.clusterMarkers(significantProtests, clusterRadius, p => p.country);
      },
    );
    this.renderClusterSet(clusters, 'protest', activeKeys, (cluster) => createProtestClusterOverlayElement({
      cluster,
      onPopupClick: this.showOverlayPopupAtClick,
    }));
  }

  private renderDatacenterClusterOverlays(zoom: number, zoomChanged: boolean, activeKeys: Set<string>): void {
    if (!this.state.layers.datacenters || zoom >= 5) return;

    const clusterRadius = this.getDatacenterClusterRadius(zoom);
    const cacheKey = `dc-${clusterRadius}`;
    const clusters = this.getCachedClusters(
      cacheKey,
      zoomChanged,
      () => {
        const activeDCs = AI_DATA_CENTERS.filter(dc => dc.status !== 'decommissioned');
        return this.clusterMarkers(activeDCs, clusterRadius, dc => dc.country) as ScreenCluster<DatacenterMarker>[];
      },
    );
    this.renderClusterSet(clusters, 'dc', activeKeys, (cluster) => createDatacenterClusterOverlayElement({
      cluster,
      zoom,
      onPopupClick: this.showOverlayPopupAtClick,
    }));
  }

  private renderClusterOverlays(): void {
    if (!this.clusterOverlay || !this.maplibreMap) return;

    const startTime = performance.now();
    const zoom = this.maplibreMap.getZoom();
    const zoomChanged = Math.abs(zoom - this.lastClusterZoom) > 0.1;
    if (zoomChanged) {
      this.clusterResultCache.clear();
      this.lastClusterZoom = zoom;
    }

    const activeKeys = new Set<string>();

    this.renderTechClusterOverlays(zoom, zoomChanged, activeKeys);
    this.renderProtestClusterOverlays(zoom, zoomChanged, activeKeys);
    this.renderDatacenterClusterOverlays(zoom, zoomChanged, activeKeys);

    if (this.state.layers.hotspots) {
      this.renderHotspotOverlays(activeKeys);
    }

    this.pruneClusterCache(activeKeys);

    const elapsed = performance.now() - startTime;
    if (import.meta.env.DEV && elapsed > 16) {
      console.warn(`[DeckGLMap] renderClusterOverlays took ${elapsed.toFixed(2)}ms (>16ms budget)`);
    }
  }

  private showPopupAtCoordinates(
    type: PopupType,
    data: unknown,
    x: number,
    y: number,
    relatedNews?: NewsItem[],
  ): void {
    this.popup.show({
      type,
      data: data as never,
      relatedNews,
      x,
      y,
    });
  }

  private readonly showOverlayPopupAtClick = (event: MouseEvent, type: PopupType, data: unknown): void => {
    const rect = this.container.getBoundingClientRect();
    this.showPopupAtCoordinates(
      type,
      data,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  };

  private hasClusterMoved(key: string, screenPos: [number, number], count: number): boolean {
    const last = this.lastClusterState.get(key);
    if (!last) {
      this.lastClusterState.set(key, { x: screenPos[0], y: screenPos[1], count });
      return true;
    }
    const dx = Math.abs(last.x - screenPos[0]);
    const dy = Math.abs(last.y - screenPos[1]);
    const moved = dx > 5 || dy > 5 || last.count !== count;
    if (moved) {
      this.lastClusterState.set(key, { x: screenPos[0], y: screenPos[1], count });
    }
    return moved;
  }

  /** Render HTML overlays for high-activity hotspots with CSS pulsating animation */
  private renderHotspotOverlays(activeKeys: Set<string>): void {
    if (!this.clusterOverlay || !this.maplibreMap) return;

    const zoom = this.maplibreMap.getZoom();
    const markerScale = getHotspotMarkerScale(zoom);
    const hotspots = getSortedHighActivityHotspots(this.hotspots);

    hotspots.forEach(hotspot => {
      const pos = this.maplibreMap!.project([hotspot.lon, hotspot.lat]);
      if (!pos) return;

      const key = this.getClusterKey('hotspot', [hotspot.lon, hotspot.lat], 1);
      activeKeys.add(key);
      const existing = this.clusterElementCache.get(key);

      if (existing) {
        applyHotspotOverlayTransform(existing, pos.x, pos.y, markerScale);
        if (!existing.parentElement) this.clusterOverlay!.appendChild(existing);
        return;
      }

      const element = createHotspotOverlayElement({
        hotspot,
        key,
        x: pos.x,
        y: pos.y,
        markerScale,
        onClick: (event) => {
          const relatedNews = this.getRelatedNews(hotspot);
          const rect = this.container.getBoundingClientRect();
          this.showPopupAtCoordinates(
            'hotspot',
            hotspot,
            event.clientX - rect.left,
            event.clientY - rect.top,
            relatedNews,
          );
          this.popup.loadHotspotGdeltContext(hotspot);
          this.onHotspotClick?.(hotspot);
        },
      });

      this.clusterElementCache.set(key, element);
      this.clusterOverlay!.appendChild(element);
    });
  }

  private updateHotspotPositions(): void {
    if (!this.clusterOverlay || !this.maplibreMap || !this.state.layers.hotspots) return;

    const zoom = this.maplibreMap.getZoom();
    const markerScale = getHotspotMarkerScale(zoom);

    for (const [key, existing] of this.clusterElementCache) {
      if (!key.startsWith('hotspot-')) continue;

      const coords = parseHotspotClusterKey(key);
      if (!coords) continue;

      const pos = this.maplibreMap.project(coords);
      if (!pos) continue;

      applyHotspotOverlayTransform(existing, pos.x, pos.y, markerScale);
    }
  }

  private scheduleHotspotOverlaySync(options?: { reconcile?: boolean }): void {
    if (!this.state.layers.hotspots) return;

    if (options?.reconcile) {
      this.hotspotOverlayNeedsReconcile = true;
    }

    if (this.hotspotSyncRafId !== null) return;

    this.hotspotSyncRafId = requestAnimationFrame(() => {
      this.hotspotSyncRafId = null;

      if (!this.clusterOverlay || !this.maplibreMap || !this.state.layers.hotspots) {
        this.hotspotOverlayNeedsReconcile = false;
        return;
      }

      this.updateHotspotPositions();

      if (this.hotspotOverlayNeedsReconcile) {
        this.hotspotOverlayNeedsReconcile = false;
        this.throttledRenderClusters();
      }
    });
  }

  private isLayerVisible(layerKey: keyof MapLayers): boolean {
    const zoom = this.maplibreMap?.getZoom() || 2;
    return isLayerVisibleAtZoom(layerKey, zoom, LAYER_ZOOM_THRESHOLDS);
  }

  private addPathAndCoreLayers(layers: Array<Layer | null | false>, mapLayers: MapLayers, currentZoom: number): void {
    if (mapLayers.cables) {
      const cacheKey = 'cables-layer';
      const highlightSignature = this.getSetSignature(this.highlightedAssets.cable);
      const { layer, signature } = createCablesPathLayer({
        highlightedIds: this.highlightedAssets.cable,
        highlightSignature,
        lastHighlightSignature: this.lastCableHighlightSignature,
        cachedLayer: this.layerCache.get(cacheKey),
        cableColor: COLORS.cable,
        cableHighlightColor: COLORS.cableHighlight,
      });
      this.lastCableHighlightSignature = signature;
      this.layerCache.set(cacheKey, layer);
      layers.push(layer);
    }

    if (mapLayers.pipelines) {
      const cacheKey = 'pipelines-layer';
      const highlightSignature = this.getSetSignature(this.highlightedAssets.pipeline);
      const { layer, signature } = createPipelinesPathLayer({
        highlightedIds: this.highlightedAssets.pipeline,
        highlightSignature,
        lastHighlightSignature: this.lastPipelineHighlightSignature,
        cachedLayer: this.layerCache.get(cacheKey),
      });
      this.lastPipelineHighlightSignature = signature;
      this.layerCache.set(cacheKey, layer);
      layers.push(layer);
    }

    if (mapLayers.conflicts) {
      layers.push(createConflictZonesGeoLayer({
        fill: COLORS.conflict,
        stroke: [255, 0, 0, 180],
      }));
    }

    if (mapLayers.bases && this.isLayerVisible('bases')) {
      layers.push(
        createBasesIconLayer(
          this.highlightedAssets.base,
          this.maplibreMap?.getZoom() || 3,
          MARKER_ICONS.triangleUp,
        ),
      );
    }

    if (mapLayers.nuclear && this.isLayerVisible('nuclear')) {
      layers.push(createNuclearIconLayer(this.highlightedAssets.nuclear, MARKER_ICONS.hexagon));
    }

    if (mapLayers.irradiators && this.isLayerVisible('irradiators')) {
      layers.push(createIrradiatorsScatterLayer());
    }

    if (mapLayers.spaceports && this.isLayerVisible('spaceports')) {
      layers.push(createSpaceportsScatterLayer());
    }

    if (mapLayers.hotspots) {
      layers.push(createHotspotsScatterLayer(this.hotspots, this.maplibreMap?.getZoom() || 2));
    }

    if (mapLayers.datacenters && currentZoom >= 5) {
      layers.push(createDatacentersIconLayer(this.highlightedAssets.datacenter, MARKER_ICONS.square));
    }
  }

  private addNaturalAndNetworkLayers(layers: Array<Layer | null | false>, mapLayers: MapLayers): void {
    if (mapLayers.natural && this.earthquakes.length > 0) {
      layers.push(createEarthquakesScatterLayer(this.earthquakes, COLORS.earthquake));
    }

    if (mapLayers.natural && this.naturalEvents.length > 0) {
      layers.push(createNaturalEventsScatterLayer(this.naturalEvents));
    }

    if (mapLayers.fires && this.firmsFireData.length > 0) {
      layers.push(createFiresScatterLayer(this.firmsFireData));
    }

    if (mapLayers.weather && this.weatherAlerts.length > 0) {
      layers.push(createWeatherScatterLayer(this.weatherAlerts, COLORS.weather));
    }

    if (mapLayers.outages && this.outages.length > 0) {
      layers.push(createOutagesScatterLayer(this.outages, COLORS.outage));
    }

    if (mapLayers.ais && this.aisDensity.length > 0) {
      layers.push(createAisDensityScatterLayer(this.aisDensity));
    }

    if (mapLayers.ais && this.aisDisruptions.length > 0) {
      layers.push(createAisDisruptionsScatterLayer(this.aisDisruptions));
    }

    if (mapLayers.ais) {
      layers.push(createPortsScatterLayer());
    }

    if (mapLayers.cables && this.cableAdvisories.length > 0) {
      layers.push(createCableAdvisoriesScatterLayer(this.cableAdvisories));
    }

    if (mapLayers.cables && this.repairShips.length > 0) {
      layers.push(createRepairShipsScatterLayer(this.repairShips));
    }

    if (mapLayers.flights && this.flightDelays.length > 0) {
      layers.push(createFlightDelaysScatterLayer(this.flightDelays));
    }
  }

  private addMilitaryAndStrategicLayers(layers: Array<Layer | null | false>, mapLayers: MapLayers): void {
    if (mapLayers.military && this.militaryVessels.length > 0) {
      layers.push(createMilitaryVesselsScatterLayer(this.militaryVessels, COLORS.vesselMilitary));
    }

    if (mapLayers.military && this.militaryVesselClusters.length > 0) {
      layers.push(createMilitaryVesselClustersScatterLayer(this.militaryVesselClusters));
    }

    if (mapLayers.military && this.militaryFlights.length > 0) {
      layers.push(createMilitaryFlightsScatterLayer(this.militaryFlights, COLORS.flightMilitary));
    }

    if (mapLayers.military && this.militaryFlightClusters.length > 0) {
      layers.push(createMilitaryFlightClustersScatterLayer(this.militaryFlightClusters));
    }

    if (mapLayers.waterways) {
      layers.push(createWaterwaysScatterLayer());
    }

    if (mapLayers.economic && this.isLayerVisible('economic')) {
      layers.push(createEconomicCentersScatterLayer());
    }

    if (mapLayers.minerals) {
      layers.push(createMineralsScatterLayer());
    }

    if (SITE_VARIANT !== 'tech') {
      layers.push(createAptGroupsScatterLayer());
    }
  }

  private addAnalyticsAndTechVariantLayers(layers: Array<Layer | null | false>, mapLayers: MapLayers): void {
    if (mapLayers.ucdpEvents && this.ucdpEvents.length > 0) {
      layers.push(createUcdpEventsScatterLayer(this.ucdpEvents, {
        stateBased: COLORS.ucdpStateBased,
        nonState: COLORS.ucdpNonState,
        oneSided: COLORS.ucdpOneSided,
      }));
    }

    if (mapLayers.displacement && this.displacementFlows.length > 0) {
      layers.push(createDisplacementArcsLayer(this.displacementFlows));
    }

    if (mapLayers.climate && this.climateAnomalies.length > 0) {
      layers.push(createClimateHeatmapLayer(this.climateAnomalies));
    }

    if (SITE_VARIANT === 'tech') {
      if (mapLayers.startupHubs) {
        layers.push(createStartupHubsScatterLayer(COLORS.startupHub));
      }
      if (mapLayers.accelerators) {
        layers.push(createAcceleratorsScatterLayer(COLORS.accelerator));
      }
      if (mapLayers.cloudRegions) {
        layers.push(createCloudRegionsScatterLayer(COLORS.cloudRegion));
      }
    }
  }

  private addNewsLocationLayers(layers: Array<Layer | null | false>): void {
    if (this.newsLocations.length > 0) {
      layers.push(
        ...createNewsLocationScatterLayers({
          newsLocations: this.newsLocations,
          newsLocationFirstSeen: this.newsLocationFirstSeen,
          zoom: this.maplibreMap?.getZoom() || 2,
          now: this.pulseTime || Date.now(),
        }),
      );
    }
  }

  private buildLayers(): LayersList {
    const startTime = performance.now();
    const layers: (Layer | null | false)[] = [];
    const { layers: mapLayers } = this.state;
    const currentZoom = this.maplibreMap?.getZoom() || 2;
    this.addPathAndCoreLayers(layers, mapLayers, currentZoom);
    this.addNaturalAndNetworkLayers(layers, mapLayers);
    this.addMilitaryAndStrategicLayers(layers, mapLayers);
    this.addAnalyticsAndTechVariantLayers(layers, mapLayers);
    this.addNewsLocationLayers(layers);

    const result = layers.filter(Boolean) as LayersList;
    const elapsed = performance.now() - startTime;
    if (import.meta.env.DEV && elapsed > 16) {
      console.warn(`[DeckGLMap] buildLayers took ${elapsed.toFixed(2)}ms (>16ms budget), ${result.length} layers`);
    }
    return result;
  }

  // Protests, tech HQs, and tech events are rendered via HTML overlays in renderClusterOverlays()

  private pulseTime = 0;

  private startNewsPulseAnimation(): void {
    if (this.newsPulseIntervalId !== null) return;
    const PULSE_UPDATE_INTERVAL_MS = 250;

    this.newsPulseIntervalId = setInterval(() => {
      const now = Date.now();
      if (!this.hasRecentNews(now)) {
        this.pulseTime = now;
        this.stopNewsPulseAnimation();
        this.rafUpdateLayers();
        return;
      }
      this.pulseTime = now;
      this.rafUpdateLayers();
    }, PULSE_UPDATE_INTERVAL_MS);
  }

  private stopNewsPulseAnimation(): void {
    if (this.newsPulseIntervalId !== null) {
      clearInterval(this.newsPulseIntervalId);
      this.newsPulseIntervalId = null;
    }
  }

  private getTooltip(info: PickingInfo): { html: string } | null {
    if (!info.object) return null;
    const layerId = info.layer?.id || '';
    const html = getDeckTooltipHtml(layerId, info.object as Record<string, unknown>);
    return html ? { html } : null;
  }

  private handleClick(info: PickingInfo): void {
    if (!info.object) {
      // Empty map click → country detection
      if (info.coordinate && this.onCountryClick) {
        const [lon, lat] = info.coordinate as [number, number];
        this.onCountryClick(lat, lon);
      }
      return;
    }

    const layerId = info.layer?.id || '';

    // Hotspots show popup with related news
    if (layerId === 'hotspots-layer') {
      const hotspot = info.object as Hotspot;
      const relatedNews = this.getRelatedNews(hotspot);
      this.showPopupAtCoordinates('hotspot', hotspot, info.x, info.y, relatedNews);
      this.popup.loadHotspotGdeltContext(hotspot);
      this.onHotspotClick?.(hotspot);
      return;
    }

    const resolvedPopup = resolveDeckClickPopup(layerId, info.object as Record<string, unknown>);
    if (!resolvedPopup) return;

    // Get click coordinates relative to container
    const x = info.x ?? 0;
    const y = info.y ?? 0;

    this.showPopupAtCoordinates(resolvedPopup.popupType, resolvedPopup.data, x, y);
  }

  // UI Creation methods
  private createControls(): void {
    const controls = createDeckControlsElement(this.state.view, {
      onZoomIn: () => this.zoomIn(),
      onZoomOut: () => this.zoomOut(),
      onResetView: () => this.resetView(),
      onViewChange: (view) => this.setView(view),
    });
    this.container.appendChild(controls);
  }

  private createTimeSlider(): void {
    const slider = createDeckTimeSliderElement(this.state.timeRange, {
      onTimeRangeChange: (range) => this.setTimeRange(range),
    });
    this.container.appendChild(slider);
  }

  private createLayerToggles(): void {
    const toggles = createDeckLayerTogglePanel({
      variant: SITE_VARIANT,
      layers: this.state.layers,
      onLayerToggle: (layer, enabled) => {
        this.state.layers[layer] = enabled;
        this.render();
        this.onLayerChange?.(layer, enabled);
      },
      onHelpToggle: () => this.showLayerHelp(),
    });
    this.container.appendChild(toggles);
  }

  /** Show layer help popup explaining each layer */
  private showLayerHelp(): void {
    toggleDeckLayerHelpPopup(this.container, SITE_VARIANT);
  }

  private createLegend(): void {
    const legend = createDeckLegendElement(SITE_VARIANT);
    this.container.appendChild(legend);
  }

  private createTimestamp(): void {
    const timestamp = createDeckTimestampElement();
    this.container.appendChild(timestamp);

    this.updateTimestamp();
    this.timestampIntervalId = setInterval(() => this.updateTimestamp(), 1000);
  }

  private updateTimestamp(): void {
    updateDeckTimestampElement(this.container);
  }

  // Public API methods (matching MapComponent interface)
  public render(): void {
    if (this.renderPaused) {
      this.renderPending = true;
      return;
    }
    if (this.renderScheduled) return;
    this.renderScheduled = true;

    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.updateLayers();
    });
  }

  public setRenderPaused(paused: boolean): void {
    this.renderPaused = paused;
    if (!paused && this.renderPending) {
      this.renderPending = false;
      this.render();
    }
  }

  private updateLayers(): void {
    const startTime = performance.now();
    if (this.deckOverlay) {
      this.deckOverlay.setProps({ layers: this.buildLayers() });
    }
    this.renderClusterOverlays();
    const elapsed = performance.now() - startTime;
    if (import.meta.env.DEV && elapsed > 16) {
      console.warn(`[DeckGLMap] updateLayers took ${elapsed.toFixed(2)}ms (>16ms budget)`);
    }
  }

  public setView(view: DeckMapView): void {
    this.state.view = view;
    const preset = DECK_VIEW_PRESETS[view];

    if (this.maplibreMap) {
      this.maplibreMap.flyTo({
        center: [preset.longitude, preset.latitude],
        zoom: preset.zoom,
        duration: 1000,
      });
    }

    const viewSelect = this.container.querySelector('.view-select') as HTMLSelectElement;
    if (viewSelect) viewSelect.value = view;

    this.onStateChange?.(this.state);
  }

  public setZoom(zoom: number): void {
    this.state.zoom = zoom;
    if (this.maplibreMap) {
      this.maplibreMap.setZoom(zoom);
    }
  }

  public setCenter(lat: number, lon: number, zoom?: number): void {
    if (this.maplibreMap) {
      this.maplibreMap.flyTo({
        center: [lon, lat],
        ...(zoom != null && { zoom }),
        duration: 500,
      });
    }
  }

  public getCenter(): { lat: number; lon: number } | null {
    if (this.maplibreMap) {
      const center = this.maplibreMap.getCenter();
      return { lat: center.lat, lon: center.lng };
    }
    return null;
  }

  public setTimeRange(range: TimeRange): void {
    this.state.timeRange = range;
    this.onTimeRangeChange?.(range);
    this.render(); // Debounced
  }

  public getTimeRange(): TimeRange {
    return this.state.timeRange;
  }

  public setLayers(layers: MapLayers): void {
    this.state.layers = layers;
    this.render(); // Debounced

    // Update toggle checkboxes
    Object.entries(layers).forEach(([key, value]) => {
      const toggle = this.container.querySelector(`.layer-toggle[data-layer="${key}"] input`) as HTMLInputElement;
      if (toggle) toggle.checked = value;
    });
  }

  public getState(): DeckMapState {
    return { ...this.state };
  }

  // Zoom controls - public for external access
  public zoomIn(): void {
    if (this.maplibreMap) {
      this.maplibreMap.zoomIn();
    }
  }

  public zoomOut(): void {
    if (this.maplibreMap) {
      this.maplibreMap.zoomOut();
    }
  }

  private resetView(): void {
    this.setView('global');
  }

  // Data setters - all use render() for debouncing
  public setEarthquakes(earthquakes: Earthquake[]): void {
    this.earthquakes = earthquakes;
    this.render();
  }

  public setWeatherAlerts(alerts: WeatherAlert[]): void {
    this.weatherAlerts = alerts;
    const withCentroid = alerts.filter(a => a.centroid && a.centroid.length === 2).length;
    console.log(`[DeckGLMap] Weather alerts: ${alerts.length} total, ${withCentroid} with coordinates`);
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
    this.render();
  }

  public setProtests(events: SocialUnrestEvent[]): void {
    this.protests = events;
    this.clusterResultCache.clear();
    this.invalidateClusterElementsByType('protest');
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
    this.clusterResultCache.clear();
    this.invalidateClusterElementsByType('event');
    this.render();
  }

  public setUcdpEvents(events: UcdpGeoEvent[]): void {
    this.ucdpEvents = events;
    this.render();
  }

  public setDisplacementFlows(flows: DisplacementFlow[]): void {
    this.displacementFlows = flows;
    this.render();
  }

  public setClimateAnomalies(anomalies: ClimateAnomaly[]): void {
    this.climateAnomalies = anomalies;
    this.render();
  }

  public setNewsLocations(data: Array<{ lat: number; lon: number; title: string; threatLevel: string }>): void {
    const now = Date.now();
    for (const d of data) {
      if (!this.newsLocationFirstSeen.has(d.title)) {
        this.newsLocationFirstSeen.set(d.title, now);
      }
    }
    for (const [key, ts] of this.newsLocationFirstSeen) {
      if (now - ts > 60_000) this.newsLocationFirstSeen.delete(key);
    }
    this.newsLocations = data;
    this.render();

    const hasRecent = this.hasRecentNews(now);
    if (hasRecent && this.newsPulseIntervalId === null) {
      this.startNewsPulseAnimation();
    } else if (!hasRecent) {
      this.stopNewsPulseAnimation();
    }
  }

  public updateHotspotActivity(news: NewsItem[]): void {
    this.news = news; // Store for related news lookup

    const windowHours = 2;
    const recentNews = news.filter((item) =>
      Date.now() - item.pubDate.getTime() < windowHours * 60 * 60 * 1000,
    );

    this.hotspots.forEach((hotspot) => {
      const summary = assessRecentHotspotActivity(hotspot, recentNews, windowHours);
      hotspot.hasBreaking = summary.hasBreaking;
      updateHotspotEscalation(
        hotspot.id,
        summary.matchedCount,
        summary.hasBreaking,
        summary.velocity,
      );
    });

    this.scheduleHotspotOverlaySync({ reconcile: true });
    this.render(); // Debounced
  }

  /** Get news items related to a hotspot by keyword matching */
  private getRelatedNews(hotspot: Hotspot): NewsItem[] {
    return getRelatedNewsForHotspot(hotspot, this.news);
  }

  public updateMilitaryForEscalation(flights: MilitaryFlight[], vessels: MilitaryVessel[]): void {
    setMilitaryData(flights, vessels);
  }

  public getHotspotDynamicScore(hotspotId: string) {
    return getHotspotEscalation(hotspotId);
  }

  /** Get military flight clusters for rendering/analysis */
  public getMilitaryFlightClusters(): MilitaryFlightCluster[] {
    return this.militaryFlightClusters;
  }

  /** Get military vessel clusters for rendering/analysis */
  public getMilitaryVesselClusters(): MilitaryVesselCluster[] {
    return this.militaryVesselClusters;
  }

  public highlightAssets(assets: RelatedAsset[] | null): void {
    // Clear previous highlights
    Object.values(this.highlightedAssets).forEach(set => set.clear());

    if (assets) {
      assets.forEach(asset => {
        this.highlightedAssets[asset.type].add(asset.id);
      });
    }

    this.render(); // Debounced
  }

  public setOnHotspotClick(callback: (hotspot: Hotspot) => void): void {
    this.onHotspotClick = callback;
  }

  public setOnTimeRangeChange(callback: (range: TimeRange) => void): void {
    this.onTimeRangeChange = callback;
  }

  public setOnLayerChange(callback: (layer: keyof MapLayers, enabled: boolean) => void): void {
    this.onLayerChange = callback;
  }

  public setOnStateChange(callback: (state: DeckMapState) => void): void {
    this.onStateChange = callback;
  }

  public getHotspotLevels(): Record<string, string> {
    const levels: Record<string, string> = {};
    this.hotspots.forEach(h => {
      levels[h.name] = h.level || 'low';
    });
    return levels;
  }

  public setHotspotLevels(levels: Record<string, string>): void {
    this.hotspots.forEach(h => {
      if (levels[h.name]) {
        h.level = levels[h.name] as 'low' | 'elevated' | 'high';
      }
    });
    this.render(); // Debounced
  }

  public initEscalationGetters(): void {
    setCIIGetter(getCountryScore);
    setGeoAlertGetter(getAlertsNearLocation);
  }

  // UI visibility methods
  public hideLayerToggle(layer: keyof MapLayers): void {
    setDeckLayerToggleVisibility(this.container, layer, false);
  }

  public setLayerLoading(layer: keyof MapLayers, loading: boolean): void {
    setDeckLayerToggleLoading(this.container, layer, loading);
  }

  public setLayerReady(layer: keyof MapLayers, hasData: boolean): void {
    setDeckLayerToggleReady(this.container, layer, this.state.layers[layer], hasData);
  }

  public flashAssets(assetType: AssetType, ids: string[]): void {
    flashAssetIds(this.highlightedAssets[assetType], ids, 3000, () => this.render());
  }

  // Enable layer programmatically
  public enableLayer(layer: keyof MapLayers): void {
    if (!this.state.layers[layer]) {
      this.state.layers[layer] = true;
      setDeckLayerToggleChecked(this.container, layer, true);
      this.render();
      this.onLayerChange?.(layer, true);
    }
  }

  // Toggle layer on/off programmatically
  public toggleLayer(layer: keyof MapLayers): void {
    console.log(`[DeckGLMap.toggleLayer] ${layer}: ${this.state.layers[layer]} -> ${!this.state.layers[layer]}`);
    this.state.layers[layer] = !this.state.layers[layer];
    setDeckLayerToggleChecked(this.container, layer, this.state.layers[layer]);
    this.render();
    this.onLayerChange?.(layer, this.state.layers[layer]);
  }

  private showPopupAtScreenPosition(type: PopupType, data: unknown, screenPos: { x: number; y: number } | null, relatedNews?: NewsItem[]): void {
    const { x, y } = resolveDeckPopupPosition(this.container, screenPos);
    this.showPopupAtCoordinates(type, data, x, y, relatedNews);
  }

  // Trigger click methods - show popup at item location without moving the map
  public triggerHotspotClick(id: string): void {
    triggerEntityPopup({
      id,
      items: this.hotspots,
      getId: (hotspot) => hotspot.id,
      getPosition: (hotspot) => projectDeckLocationToScreen(this.maplibreMap, hotspot.lat, hotspot.lon),
      getRelatedData: (hotspot) => this.getRelatedNews(hotspot),
      allowMissingPosition: true,
      onShow: (hotspot, screenPos, relatedNews) => {
        this.showPopupAtScreenPosition('hotspot', hotspot, screenPos, relatedNews);
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
      getPosition: (conflict) => projectDeckLocationToScreen(this.maplibreMap, conflict.center[1], conflict.center[0]),
      allowMissingPosition: true,
      onShow: (conflict, screenPos) => {
        this.showPopupAtScreenPosition('conflict', conflict, screenPos);
      },
    });
  }

  public triggerBaseClick(id: string): void {
    triggerEntityPopup({
      id,
      items: MILITARY_BASES,
      getId: (base) => base.id,
      getPosition: (base) => projectDeckLocationToScreen(this.maplibreMap, base.lat, base.lon),
      allowMissingPosition: true,
      onShow: (base, screenPos) => {
        this.showPopupAtScreenPosition('base', base, screenPos);
      },
    });
  }

  public triggerPipelineClick(id: string): void {
    triggerEntityPopup({
      id,
      items: PIPELINES,
      getId: (pipeline) => pipeline.id,
      getPosition: (pipeline) => {
        const midPoint = getPolylineMidpoint(pipeline.points as [number, number][]);
        return midPoint ? projectDeckLocationToScreen(this.maplibreMap, midPoint[1], midPoint[0]) : null;
      },
      allowMissingPosition: true,
      onShow: (pipeline, screenPos) => {
        this.showPopupAtScreenPosition('pipeline', pipeline, screenPos);
      },
    });
  }

  public triggerCableClick(id: string): void {
    triggerEntityPopup({
      id,
      items: UNDERSEA_CABLES,
      getId: (cable) => cable.id,
      getPosition: (cable) => {
        const midPoint = getPolylineMidpoint(cable.points as [number, number][]);
        return midPoint ? projectDeckLocationToScreen(this.maplibreMap, midPoint[1], midPoint[0]) : null;
      },
      allowMissingPosition: true,
      onShow: (cable, screenPos) => {
        this.showPopupAtScreenPosition('cable', cable, screenPos);
      },
    });
  }

  public triggerDatacenterClick(id: string): void {
    triggerEntityPopup({
      id,
      items: AI_DATA_CENTERS,
      getId: (datacenter) => datacenter.id,
      getPosition: (datacenter) => projectDeckLocationToScreen(this.maplibreMap, datacenter.lat, datacenter.lon),
      allowMissingPosition: true,
      onShow: (datacenter, screenPos) => {
        this.showPopupAtScreenPosition('datacenter', datacenter, screenPos);
      },
    });
  }

  public triggerNuclearClick(id: string): void {
    triggerEntityPopup({
      id,
      items: NUCLEAR_FACILITIES,
      getId: (facility) => facility.id,
      getPosition: (facility) => projectDeckLocationToScreen(this.maplibreMap, facility.lat, facility.lon),
      allowMissingPosition: true,
      onShow: (facility, screenPos) => {
        this.showPopupAtScreenPosition('nuclear', facility, screenPos);
      },
    });
  }

  public triggerIrradiatorClick(id: string): void {
    triggerEntityPopup({
      id,
      items: GAMMA_IRRADIATORS,
      getId: (irradiator) => irradiator.id,
      getPosition: (irradiator) => projectDeckLocationToScreen(this.maplibreMap, irradiator.lat, irradiator.lon),
      allowMissingPosition: true,
      onShow: (irradiator, screenPos) => {
        this.showPopupAtScreenPosition('irradiator', irradiator, screenPos);
      },
    });
  }

  public flashLocation(lat: number, lon: number, durationMs = 2000): void {
    const screenPos = projectDeckLocationToScreen(this.maplibreMap, lat, lon);
    if (!screenPos) return;
    flashDeckLocationMarker(this.container, screenPos, durationMs);
  }

  // --- Country click + highlight ---

  public setOnCountryClick(cb: (lat: number, lon: number) => void): void {
    this.onCountryClick = cb;
  }

  private loadCountryBoundaries(): void {
    if (!this.maplibreMap || this.countryGeoJsonLoaded) return;
    this.countryGeoJsonLoaded = true;

    loadDeckCountryBoundaries(this.maplibreMap, () => Boolean(this.onCountryClick))
      .then(() => console.log('[DeckGLMap] Country boundaries loaded'))
      .catch((err) => console.warn('[DeckGLMap] Failed to load country boundaries:', err));
  }

  public highlightCountry(code: string): void {
    if (!this.maplibreMap || !this.countryGeoJsonLoaded) return;
    try {
      setDeckCountryHighlight(this.maplibreMap, code);
    } catch { /* layer not ready yet */ }
  }

  public clearCountryHighlight(): void {
    if (!this.maplibreMap) return;
    try {
      clearDeckCountryHighlight(this.maplibreMap);
    } catch { /* layer not ready */ }
  }

  public destroy(): void {
    if (this.timestampIntervalId) {
      clearInterval(this.timestampIntervalId);
    }

    if (this.moveTimeoutId) {
      clearTimeout(this.moveTimeoutId);
      this.moveTimeoutId = null;
    }

    if (this.hotspotSyncRafId !== null) {
      cancelAnimationFrame(this.hotspotSyncRafId);
      this.hotspotSyncRafId = null;
    }

    this.stopNewsPulseAnimation();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.layerCache.clear();
    this.clusterElementCache.clear();
    this.lastClusterState.clear();
    this.clusterResultCache.clear();

    this.deckOverlay?.finalize();
    this.maplibreMap?.remove();

    this.container.innerHTML = '';
  }
}
