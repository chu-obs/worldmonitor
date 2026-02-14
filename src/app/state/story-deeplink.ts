const STORY_COUNTRY_NAMES: Record<string, string> = {
  UA: 'Ukraine',
  RU: 'Russia',
  CN: 'China',
  US: 'United States',
  IR: 'Iran',
  IL: 'Israel',
  TW: 'Taiwan',
  KP: 'North Korea',
  SA: 'Saudi Arabia',
  TR: 'Turkey',
  PL: 'Poland',
  DE: 'Germany',
  FR: 'France',
  GB: 'United Kingdom',
  IN: 'India',
  PK: 'Pakistan',
  SY: 'Syria',
  YE: 'Yemen',
  MM: 'Myanmar',
  VE: 'Venezuela',
};

type TimeoutScheduleFn = (fn: () => void, delayMs: number) => ReturnType<typeof setTimeout>;

interface StoryDeepLinkOptions {
  href?: string;
  hasSufficientData: () => boolean;
  hasAnyCluster: () => boolean;
  openCountryStory: (countryCode: string, countryName: string) => void;
  replaceUrl?: (path: string) => void;
  schedule?: TimeoutScheduleFn;
  initialDelayMs?: number;
  pollDelayMs?: number;
}

export function handleStoryDeepLink(options: StoryDeepLinkOptions): boolean {
  const href = options.href || window.location.href;
  const url = new URL(href);

  if (!(url.pathname === '/story' || url.searchParams.has('c'))) {
    return false;
  }

  const rawCode = (url.searchParams.get('c') || '').trim();
  if (!rawCode) {
    return false;
  }

  const countryCode = rawCode.toUpperCase();
  const countryName = STORY_COUNTRY_NAMES[countryCode] || countryCode;
  const schedule = options.schedule || ((fn, delayMs) => setTimeout(fn, delayMs));
  const pollDelayMs = options.pollDelayMs ?? 500;
  const initialDelayMs = options.initialDelayMs ?? 2000;
  const replaceUrl = options.replaceUrl || ((path) => history.replaceState(null, '', path));

  const checkAndOpen = () => {
    if (options.hasSufficientData() && options.hasAnyCluster()) {
      options.openCountryStory(countryCode, countryName);
      return;
    }
    schedule(checkAndOpen, pollDelayMs);
  };

  schedule(checkAndOpen, initialDelayMs);
  replaceUrl('/');
  return true;
}
