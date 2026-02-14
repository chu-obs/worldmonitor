import { INTEL_HOTSPOTS, CONFLICT_ZONES } from '@/config/geo';
import type { NewsItem } from '@/types';

interface FlashableMap {
  flashLocation: (lat: number, lon: number) => void;
}

interface FlashMapForNewsFlowOptions {
  map: FlashableMap | null;
  items: NewsItem[];
  initialLoadComplete: boolean;
  mapFlashCache: Map<string, number>;
  cooldownMs: number;
}

export function findFlashLocationForTitle(title: string): { lat: number; lon: number } | null {
  const titleLower = title.toLowerCase();
  let bestMatch: { lat: number; lon: number; matches: number } | null = null;

  const countKeywordMatches = (keywords: string[] | undefined): number => {
    if (!keywords) return 0;
    let matches = 0;
    for (const keyword of keywords) {
      const cleaned = keyword.trim().toLowerCase();
      if (cleaned.length >= 3 && titleLower.includes(cleaned)) {
        matches += 1;
      }
    }
    return matches;
  };

  for (const hotspot of INTEL_HOTSPOTS) {
    const matches = countKeywordMatches(hotspot.keywords);
    if (matches > 0 && (!bestMatch || matches > bestMatch.matches)) {
      bestMatch = { lat: hotspot.lat, lon: hotspot.lon, matches };
    }
  }

  for (const conflict of CONFLICT_ZONES) {
    const matches = countKeywordMatches(conflict.keywords);
    if (matches > 0 && (!bestMatch || matches > bestMatch.matches)) {
      bestMatch = { lat: conflict.center[1], lon: conflict.center[0], matches };
    }
  }

  return bestMatch;
}

export function flashMapForNewsFlow(options: FlashMapForNewsFlowOptions): void {
  if (!options.map || !options.initialLoadComplete) return;
  const now = Date.now();

  for (const [key, timestamp] of options.mapFlashCache.entries()) {
    if (now - timestamp > options.cooldownMs) {
      options.mapFlashCache.delete(key);
    }
  }

  for (const item of options.items) {
    const cacheKey = `${item.source}|${item.link || item.title}`;
    const lastSeen = options.mapFlashCache.get(cacheKey);
    if (lastSeen && now - lastSeen < options.cooldownMs) {
      continue;
    }

    const location = findFlashLocationForTitle(item.title);
    if (!location) continue;

    options.map.flashLocation(location.lat, location.lon);
    options.mapFlashCache.set(cacheKey, now);
  }
}
