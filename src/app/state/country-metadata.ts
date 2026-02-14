export type CountryBounds = { n: number; s: number; e: number; w: number };

export const COUNTRY_BOUNDS: Record<string, CountryBounds> = {
  IR: { n: 40, s: 25, e: 63, w: 44 }, IL: { n: 33.3, s: 29.5, e: 35.9, w: 34.3 },
  SA: { n: 32, s: 16, e: 55, w: 35 }, AE: { n: 26.1, s: 22.6, e: 56.4, w: 51.6 },
  IQ: { n: 37.4, s: 29.1, e: 48.6, w: 38.8 }, SY: { n: 37.3, s: 32.3, e: 42.4, w: 35.7 },
  YE: { n: 19, s: 12, e: 54.5, w: 42 }, LB: { n: 34.7, s: 33.1, e: 36.6, w: 35.1 },
  CN: { n: 53.6, s: 18.2, e: 134.8, w: 73.5 }, TW: { n: 25.3, s: 21.9, e: 122, w: 120 },
  JP: { n: 45.5, s: 24.2, e: 153.9, w: 122.9 }, KR: { n: 38.6, s: 33.1, e: 131.9, w: 124.6 },
  KP: { n: 43.0, s: 37.7, e: 130.7, w: 124.2 }, IN: { n: 35.5, s: 6.7, e: 97.4, w: 68.2 },
  PK: { n: 37, s: 24, e: 77, w: 61 }, AF: { n: 38.5, s: 29.4, e: 74.9, w: 60.5 },
  UA: { n: 52.4, s: 44.4, e: 40.2, w: 22.1 }, RU: { n: 82, s: 41.2, e: 180, w: 19.6 },
  BY: { n: 56.2, s: 51.3, e: 32.8, w: 23.2 }, PL: { n: 54.8, s: 49, e: 24.1, w: 14.1 },
  EG: { n: 31.7, s: 22, e: 36.9, w: 25 }, LY: { n: 33, s: 19.5, e: 25, w: 9.4 },
  SD: { n: 22, s: 8.7, e: 38.6, w: 21.8 }, US: { n: 49, s: 24.5, e: -66.9, w: -125 },
  GB: { n: 58.7, s: 49.9, e: 1.8, w: -8.2 }, DE: { n: 55.1, s: 47.3, e: 15.0, w: 5.9 },
  FR: { n: 51.1, s: 41.3, e: 9.6, w: -5.1 }, TR: { n: 42.1, s: 36, e: 44.8, w: 26 },
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  IL: ['israel', 'israeli', 'gaza', 'hamas', 'hezbollah', 'netanyahu', 'idf', 'west bank', 'tel aviv', 'jerusalem'],
  IR: ['iran', 'iranian', 'tehran', 'persian', 'irgc', 'khamenei'],
  RU: ['russia', 'russian', 'moscow', 'kremlin', 'putin', 'ukraine war'],
  UA: ['ukraine', 'ukrainian', 'kyiv', 'zelensky', 'zelenskyy'],
  CN: ['china', 'chinese', 'beijing', 'taiwan strait', 'south china sea', 'xi jinping'],
  TW: ['taiwan', 'taiwanese', 'taipei'],
  KP: ['north korea', 'pyongyang', 'kim jong'],
  KR: ['south korea', 'seoul'],
  SA: ['saudi', 'riyadh', 'mbs'],
  SY: ['syria', 'syrian', 'damascus', 'assad'],
  YE: ['yemen', 'houthi', 'sanaa'],
  IQ: ['iraq', 'iraqi', 'baghdad'],
  AF: ['afghanistan', 'afghan', 'kabul', 'taliban'],
  PK: ['pakistan', 'pakistani', 'islamabad'],
  IN: ['india', 'indian', 'new delhi', 'modi'],
  EG: ['egypt', 'egyptian', 'cairo', 'suez'],
  LB: ['lebanon', 'lebanese', 'beirut'],
  TR: ['turkey', 'turkish', 'ankara', 'erdogan', 'türkiye'],
  US: ['united states', 'american', 'washington', 'pentagon', 'white house'],
  GB: ['united kingdom', 'british', 'london', 'uk '],
};

export function getCountrySearchTerms(country: string, code: string): string[] {
  const aliases = COUNTRY_ALIASES[code];
  if (aliases) return aliases;
  return [country.toLowerCase()];
}

export function isInCountryBounds(lat: number, lon: number, code: string): boolean {
  const bounds = COUNTRY_BOUNDS[code];
  if (!bounds) return false;
  return lat >= bounds.s && lat <= bounds.n && lon >= bounds.w && lon <= bounds.e;
}
