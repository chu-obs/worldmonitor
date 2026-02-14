import { ScatterplotLayer } from '@deck.gl/layers';

export interface NewsLocationPoint {
  lat: number;
  lon: number;
  title: string;
  threatLevel: string;
}

interface NewsLayersOptions {
  newsLocations: NewsLocationPoint[];
  newsLocationFirstSeen: ReadonlyMap<string, number>;
  zoom: number;
  now: number;
}

export function createNewsLocationScatterLayers(options: NewsLayersOptions): ScatterplotLayer<NewsLocationPoint>[] {
  const alphaScale = options.zoom < 2.5 ? 0.4 : options.zoom < 4 ? 0.7 : 1.0;
  const threatRgb: Record<string, [number, number, number]> = {
    critical: [239, 68, 68],
    high: [249, 115, 22],
    medium: [234, 179, 8],
    low: [34, 197, 94],
    info: [59, 130, 246],
  };
  const threatAlpha: Record<string, number> = {
    critical: 220,
    high: 190,
    medium: 160,
    low: 120,
    info: 80,
  };

  const pulseDurationMs = 30_000;
  const layers: ScatterplotLayer<NewsLocationPoint>[] = [
    new ScatterplotLayer({
      id: 'news-locations-layer',
      data: options.newsLocations,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: 18000,
      getFillColor: (d) => {
        const rgb = threatRgb[d.threatLevel] || [59, 130, 246];
        const alpha = Math.round((threatAlpha[d.threatLevel] || 120) * alphaScale);
        return [...rgb, alpha] as [number, number, number, number];
      },
      radiusMinPixels: 3,
      radiusMaxPixels: 12,
      pickable: true,
    }),
  ];

  const recentNews = options.newsLocations.filter((d) => {
    const firstSeen = options.newsLocationFirstSeen.get(d.title);
    return firstSeen && options.now - firstSeen < pulseDurationMs;
  });

  if (recentNews.length > 0) {
    const pulseScale = 1.0 + 1.5 * (0.5 + 0.5 * Math.sin(options.now / 318));

    layers.push(
      new ScatterplotLayer({
        id: 'news-pulse-layer',
        data: recentNews,
        getPosition: (d) => [d.lon, d.lat],
        getRadius: 18000,
        radiusScale: pulseScale,
        radiusMinPixels: 6,
        radiusMaxPixels: 30,
        pickable: false,
        stroked: true,
        filled: false,
        getLineColor: (d) => {
          const rgb = threatRgb[d.threatLevel] || [59, 130, 246];
          const firstSeen = options.newsLocationFirstSeen.get(d.title) || options.now;
          const age = options.now - firstSeen;
          const fadeOut = Math.max(0, 1 - age / pulseDurationMs);
          const alpha = Math.round(150 * fadeOut * alphaScale);
          return [...rgb, alpha] as [number, number, number, number];
        },
        lineWidthMinPixels: 1.5,
        updateTriggers: { pulseTime: options.now },
      }),
    );
  }

  return layers;
}
