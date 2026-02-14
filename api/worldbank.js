// Node.js serverless function (Edge gets 403 from World Bank)

import { getWildcardCorsHeaders } from './_cors.js';
import { nodeEmpty, nodeError, nodeJson } from './_response-node.js';

const TECH_INDICATORS = {
  'IT.NET.USER.ZS': 'Internet Users (% of population)',
  'IT.CEL.SETS.P2': 'Mobile Subscriptions (per 100 people)',
  'IT.NET.BBND.P2': 'Fixed Broadband Subscriptions (per 100 people)',
  'IT.NET.SECR.P6': 'Secure Internet Servers (per million people)',
  'GB.XPD.RSDV.GD.ZS': 'R&D Expenditure (% of GDP)',
  'IP.PAT.RESD': 'Patent Applications (residents)',
  'IP.PAT.NRES': 'Patent Applications (non-residents)',
  'IP.TMK.TOTL': 'Trademark Applications',
  'TX.VAL.TECH.MF.ZS': 'High-Tech Exports (% of manufactured exports)',
  'BX.GSR.CCIS.ZS': 'ICT Service Exports (% of service exports)',
  'TM.VAL.ICTG.ZS.UN': 'ICT Goods Imports (% of total goods imports)',
  'SE.TER.ENRR': 'Tertiary Education Enrollment (%)',
  'SE.XPD.TOTL.GD.ZS': 'Education Expenditure (% of GDP)',
  'NY.GDP.MKTP.KD.ZG': 'GDP Growth (annual %)',
  'NY.GDP.PCAP.CD': 'GDP per Capita (current US$)',
  'NE.EXP.GNFS.ZS': 'Exports of Goods & Services (% of GDP)',
};

const TECH_COUNTRIES = [
  // Major tech economies
  'USA', 'CHN', 'JPN', 'DEU', 'KOR', 'GBR', 'IND', 'ISR', 'SGP', 'TWN',
  'FRA', 'CAN', 'SWE', 'NLD', 'CHE', 'FIN', 'IRL', 'AUS', 'BRA', 'IDN',
  // Middle East & emerging tech hubs
  'ARE', 'SAU', 'QAT', 'BHR', 'EGY', 'TUR',
  // Additional Asia
  'MYS', 'THA', 'VNM', 'PHL',
  // Europe
  'ESP', 'ITA', 'POL', 'CZE', 'DNK', 'NOR', 'AUT', 'BEL', 'PRT', 'EST',
  // Americas
  'MEX', 'ARG', 'CHL', 'COL',
  // Africa
  'ZAF', 'NGA', 'KEN',
];

const CORS_METHODS = 'GET, OPTIONS';

function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'worldmonitor.app';
  return `${proto}://${host}`;
}

function readQueryParam(req, url, key, fallback = '') {
  const raw = req.query?.[key];
  if (Array.isArray(raw)) return raw[0] || fallback;
  if (typeof raw === 'string') return raw;
  const fromUrl = url.searchParams.get(key);
  return fromUrl ?? fallback;
}

function parseYears(yearsRaw) {
  const parsed = Number.parseInt(String(yearsRaw || '5'), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(parsed, 50);
}

export default async function handler(req, res) {
  const corsHeaders = getWildcardCorsHeaders(CORS_METHODS);

  if (req.method === 'OPTIONS') {
    return nodeEmpty(res, 204, corsHeaders);
  }

  if (req.method !== 'GET') {
    return nodeError(res, 'Method not allowed', {
      status: 405,
      code: 'method_not_allowed',
      headers: {
        ...corsHeaders,
        Allow: 'GET, OPTIONS',
      },
    });
  }

  const url = new URL(req.url, getBaseUrl(req));
  const indicator = readQueryParam(req, url, 'indicator');
  const country = readQueryParam(req, url, 'country');
  const countries = readQueryParam(req, url, 'countries');
  const years = parseYears(readQueryParam(req, url, 'years', '5'));
  const action = readQueryParam(req, url, 'action');

  // Return available indicators
  if (action === 'indicators') {
    return nodeJson(res, {
      indicators: TECH_INDICATORS,
      defaultCountries: TECH_COUNTRIES,
    }, {
      headers: corsHeaders,
      cacheControl: 'public, max-age=86400',
    });
  }

  // Validate indicator
  if (!indicator) {
    return nodeJson(res, {
      error: 'Missing indicator parameter',
      availableIndicators: Object.keys(TECH_INDICATORS),
    }, {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    // Build country list
    let countryList = country || countries || TECH_COUNTRIES.join(';');
    if (countries) {
      countryList = countries.split(',').join(';');
    }

    // Calculate date range
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;

    // World Bank API v2
    const wbUrl = `https://api.worldbank.org/v2/country/${countryList}/indicator/${indicator}?format=json&date=${startYear}:${currentYear}&per_page=1000`;

    const response = await fetch(wbUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; WorldMonitor/1.0; +https://worldmonitor.app)',
      },
    });

    if (!response.ok) {
      throw new Error(`World Bank API error: ${response.status}`);
    }

    const data = await response.json();

    // World Bank returns [metadata, data] array
    if (!data || !Array.isArray(data) || data.length < 2 || !data[1]) {
      return nodeJson(res, {
        indicator,
        indicatorName: TECH_INDICATORS[indicator] || indicator,
        metadata: { page: 1, pages: 1, total: 0 },
        byCountry: {},
        latestByCountry: {},
        timeSeries: [],
      }, {
        headers: corsHeaders,
        cacheControl: 'public, max-age=3600',
      });
    }

    const [metadata, records] = data;

    // Transform data for easier frontend consumption
    const transformed = {
      indicator,
      indicatorName: TECH_INDICATORS[indicator] || (records[0]?.indicator?.value || indicator),
      metadata: {
        page: metadata.page,
        pages: metadata.pages,
        total: metadata.total,
      },
      byCountry: {},
      latestByCountry: {},
      timeSeries: [],
    };

    for (const record of records || []) {
      const countryCode = record.countryiso3code || record.country?.id;
      const countryName = record.country?.value;
      const year = record.date;
      const value = record.value;

      if (!countryCode || value === null) continue;

      if (!transformed.byCountry[countryCode]) {
        transformed.byCountry[countryCode] = {
          code: countryCode,
          name: countryName,
          values: [],
        };
      }
      transformed.byCountry[countryCode].values.push({ year, value });

      if (!transformed.latestByCountry[countryCode] ||
          year > transformed.latestByCountry[countryCode].year) {
        transformed.latestByCountry[countryCode] = {
          code: countryCode,
          name: countryName,
          year,
          value,
        };
      }

      transformed.timeSeries.push({
        countryCode,
        countryName,
        year,
        value,
      });
    }

    // Sort each country's values by year
    for (const c of Object.values(transformed.byCountry)) {
      c.values.sort((a, b) => a.year - b.year);
    }

    // Sort time series by year descending
    transformed.timeSeries.sort((a, b) => b.year - a.year || a.countryCode.localeCompare(b.countryCode));

    return nodeJson(res, transformed, {
      headers: corsHeaders,
      cacheControl: 'public, max-age=3600',
    });
  } catch (error) {
    return nodeJson(res, {
      error: error instanceof Error ? error.message : String(error),
      indicator,
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
