import { NewsPanel, type Panel } from '@/components';

export interface NewsPanelSpec {
  key: string;
  title: string;
}

export const CORE_NEWS_PANEL_SPECS: ReadonlyArray<NewsPanelSpec> = [
  { key: 'politics', title: 'World / Geopolitical' },
  { key: 'tech', title: 'Technology / AI' },
  { key: 'finance', title: 'Financial News' },
  { key: 'gov', title: 'Government / Policy' },
  { key: 'intel', title: 'Intel Feed' },
  { key: 'middleeast', title: 'Middle East / MENA' },
  { key: 'layoffs', title: 'Layoffs Tracker' },
  { key: 'ai', title: 'AI / ML' },
];

export const TECH_NEWS_PANEL_SPECS: ReadonlyArray<NewsPanelSpec> = [
  { key: 'startups', title: 'Startups & VC' },
  { key: 'vcblogs', title: 'VC Insights & Essays' },
  { key: 'regionalStartups', title: 'Global Startup News' },
  { key: 'unicorns', title: 'Unicorn Tracker' },
  { key: 'accelerators', title: 'Accelerators & Demo Days' },
  { key: 'funding', title: 'Funding & VC' },
  { key: 'producthunt', title: 'Product Hunt' },
  { key: 'security', title: 'Cybersecurity' },
  { key: 'policy', title: 'AI Policy & Regulation' },
  { key: 'hardware', title: 'Semiconductors & Hardware' },
  { key: 'cloud', title: 'Cloud & Infrastructure' },
  { key: 'dev', title: 'Developer Community' },
  { key: 'github', title: 'GitHub Trending' },
  { key: 'ipo', title: 'IPO & SPAC' },
  { key: 'thinktanks', title: 'Think Tanks' },
];

export const REGIONAL_NEWS_PANEL_SPECS: ReadonlyArray<NewsPanelSpec> = [
  { key: 'africa', title: 'Africa' },
  { key: 'latam', title: 'Latin America' },
  { key: 'asia', title: 'Asia-Pacific' },
  { key: 'energy', title: 'Energy & Resources' },
];

interface RegisterNewsPanelsOptions {
  specs: ReadonlyArray<NewsPanelSpec>;
  panels: Record<string, Panel>;
  newsPanels: Record<string, NewsPanel>;
  attachRelatedAssetHandlers: (panel: NewsPanel) => void;
}

export function registerNewsPanels(options: RegisterNewsPanelsOptions): void {
  for (const spec of options.specs) {
    const panel = new NewsPanel(spec.key, spec.title);
    options.attachRelatedAssetHandlers(panel);
    options.newsPanels[spec.key] = panel;
    options.panels[spec.key] = panel;
  }
}
