import type maplibregl from 'maplibre-gl';

const COUNTRY_SOURCE_ID = 'country-boundaries';
const COUNTRY_INTERACTIVE_LAYER_ID = 'country-interactive';
const COUNTRY_HOVER_LAYER_ID = 'country-hover-fill';
const COUNTRY_HIGHLIGHT_FILL_LAYER_ID = 'country-highlight-fill';
const COUNTRY_HIGHLIGHT_BORDER_LAYER_ID = 'country-highlight-border';
const COUNTRY_CODE_PROPERTY = 'ISO3166-1-Alpha-2';

const EMPTY_COUNTRY_FILTER: maplibregl.FilterSpecification = ['==', ['get', COUNTRY_CODE_PROPERTY], ''];

export async function loadDeckCountryBoundaries(
  map: maplibregl.Map,
  isCountryClickEnabled: () => boolean,
): Promise<void> {
  const response = await fetch('/data/countries.geojson');
  const geojson = await response.json();

  map.addSource(COUNTRY_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
  });

  map.addLayer({
    id: COUNTRY_INTERACTIVE_LAYER_ID,
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0,
    },
  });

  map.addLayer({
    id: COUNTRY_HOVER_LAYER_ID,
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0.06,
    },
    filter: EMPTY_COUNTRY_FILTER,
  });

  map.addLayer({
    id: COUNTRY_HIGHLIGHT_FILL_LAYER_ID,
    type: 'fill',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0.12,
    },
    filter: EMPTY_COUNTRY_FILTER,
  });

  map.addLayer({
    id: COUNTRY_HIGHLIGHT_BORDER_LAYER_ID,
    type: 'line',
    source: COUNTRY_SOURCE_ID,
    paint: {
      'line-color': '#3b82f6',
      'line-width': 1.5,
      'line-opacity': 0.5,
    },
    filter: EMPTY_COUNTRY_FILTER,
  });

  setupDeckCountryHover(map, isCountryClickEnabled);
}

export function setDeckCountryHighlight(map: maplibregl.Map, countryCode: string): void {
  const filter: maplibregl.FilterSpecification = ['==', ['get', COUNTRY_CODE_PROPERTY], countryCode];
  map.setFilter(COUNTRY_HIGHLIGHT_FILL_LAYER_ID, filter);
  map.setFilter(COUNTRY_HIGHLIGHT_BORDER_LAYER_ID, filter);
}

export function clearDeckCountryHighlight(map: maplibregl.Map): void {
  map.setFilter(COUNTRY_HIGHLIGHT_FILL_LAYER_ID, EMPTY_COUNTRY_FILTER);
  map.setFilter(COUNTRY_HIGHLIGHT_BORDER_LAYER_ID, EMPTY_COUNTRY_FILTER);
}

function setupDeckCountryHover(map: maplibregl.Map, isCountryClickEnabled: () => boolean): void {
  let hoveredCode: string | null = null;

  map.on('mousemove', (event) => {
    if (!isCountryClickEnabled()) return;

    const features = map.queryRenderedFeatures(event.point, { layers: [COUNTRY_INTERACTIVE_LAYER_ID] });
    const code = features?.[0]?.properties?.[COUNTRY_CODE_PROPERTY] as string | undefined;

    if (code && code !== hoveredCode) {
      hoveredCode = code;
      map.setFilter(COUNTRY_HOVER_LAYER_ID, ['==', ['get', COUNTRY_CODE_PROPERTY], code]);
      map.getCanvas().style.cursor = 'pointer';
      return;
    }

    if (!code && hoveredCode) {
      hoveredCode = null;
      map.setFilter(COUNTRY_HOVER_LAYER_ID, EMPTY_COUNTRY_FILTER);
      map.getCanvas().style.cursor = '';
    }
  });

  map.on('mouseout', () => {
    if (!hoveredCode) return;
    hoveredCode = null;
    map.setFilter(COUNTRY_HOVER_LAYER_ID, EMPTY_COUNTRY_FILTER);
    map.getCanvas().style.cursor = '';
  });
}
