import type { Hotspot, NewsItem } from '@/types';

const CONFLICT_TOPICS = ['gaza', 'ukraine', 'russia', 'israel', 'iran', 'china', 'taiwan', 'korea', 'syria'];

export function getRelatedNewsForHotspot(hotspot: Hotspot, news: NewsItem[]): NewsItem[] {
  return news
    .map((item) => {
      const titleLower = item.title.toLowerCase();
      const matchedKeywords = hotspot.keywords.filter((keyword) => titleLower.includes(keyword.toLowerCase()));
      if (matchedKeywords.length === 0) return null;

      const conflictMatches = CONFLICT_TOPICS.filter((topic) =>
        titleLower.includes(topic) &&
        !hotspot.keywords.some((keyword) => keyword.toLowerCase().includes(topic)),
      );

      if (conflictMatches.length > 0) {
        const strongLocalMatch = matchedKeywords.some((keyword) =>
          keyword.toLowerCase() === hotspot.name.toLowerCase() ||
          hotspot.agencies?.some((agency) => titleLower.includes(agency.toLowerCase())),
        );
        if (!strongLocalMatch) return null;
      }

      return { item, score: matchedKeywords.length };
    })
    .filter((entry): entry is { item: NewsItem; score: number } => entry !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.item);
}
