import type { Hotspot, NewsItem } from '@/types';

export interface HotspotActivityAssessment {
  hasBreaking: boolean;
  matchedCount: number;
  score: number;
  velocity: number;
  level: 'low' | 'elevated' | 'high';
  status: string;
}

export interface RecentHotspotActivitySummary {
  hasBreaking: boolean;
  matchedCount: number;
  velocity: number;
}

export function assessHotspotActivity(
  hotspot: Pick<Hotspot, 'keywords'>,
  news: NewsItem[],
  nowMs = Date.now(),
): HotspotActivityAssessment {
  let score = 0;
  let hasBreaking = false;
  let matchedCount = 0;

  news.forEach((item) => {
    const titleLower = item.title.toLowerCase();
    const matches = hotspot.keywords.filter((keyword) => titleLower.includes(keyword.toLowerCase()));
    if (matches.length === 0) return;

    matchedCount++;
    score += matches.length * 2;

    if (item.isAlert) {
      score += 5;
      hasBreaking = true;
    }

    if (item.pubDate) {
      const hoursAgo = (nowMs - item.pubDate.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 1) score += 3;
      else if (hoursAgo < 6) score += 2;
      else if (hoursAgo < 24) score += 1;
    }
  });

  let level: HotspotActivityAssessment['level'] = 'low';
  let status = 'Monitoring';

  if (hasBreaking || matchedCount >= 4 || score >= 10) {
    level = 'high';
    status = hasBreaking ? 'BREAKING NEWS' : 'High activity';
  } else if (matchedCount >= 2 || score >= 4) {
    level = 'elevated';
    status = 'Elevated activity';
  } else if (matchedCount >= 1) {
    level = 'low';
    status = 'Recent mentions';
  }

  return {
    hasBreaking,
    matchedCount,
    score,
    velocity: matchedCount > 0 ? score / matchedCount : 0,
    level,
    status,
  };
}

export function assessRecentHotspotActivity(
  hotspot: Pick<Hotspot, 'keywords'>,
  recentNews: NewsItem[],
  windowHours: number,
): RecentHotspotActivitySummary {
  let matchedCount = 0;

  recentNews.forEach((item) => {
    const titleLower = item.title.toLowerCase();
    const hasMatch = hotspot.keywords.some((keyword) => titleLower.includes(keyword.toLowerCase()));
    if (hasMatch) matchedCount++;
  });

  return {
    hasBreaking: matchedCount > 0,
    matchedCount,
    velocity: matchedCount > 0 ? matchedCount / windowHours : 0,
  };
}
