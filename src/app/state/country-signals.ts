import type {
  InternetOutage,
  MilitaryFlight,
  MilitaryFlightCluster,
  MilitaryVessel,
  MilitaryVesselCluster,
  SocialUnrestEvent,
} from '@/types';
import { COUNTRY_BOUNDS, isInCountryBounds } from './country-metadata';

export interface IntelligenceCache {
  outages?: InternetOutage[];
  protests?: { events: SocialUnrestEvent[]; sources: { acled: number; gdelt: number } };
  military?: {
    flights: MilitaryFlight[];
    flightClusters: MilitaryFlightCluster[];
    vessels: MilitaryVessel[];
    vesselClusters: MilitaryVesselCluster[];
  };
}

export interface CountrySignals {
  protests: number;
  militaryFlights: number;
  militaryVessels: number;
  outages: number;
  earthquakes: number;
}

export function computeCountrySignals(cache: IntelligenceCache, code: string, country: string): CountrySignals {
  const countryLower = country.toLowerCase();
  const hasBounds = Boolean(COUNTRY_BOUNDS[code]);

  let protests = 0;
  if (cache.protests?.events) {
    protests = cache.protests.events.filter((event) =>
      event.country?.toLowerCase() === countryLower ||
      (hasBounds && isInCountryBounds(event.lat, event.lon, code))
    ).length;
  }

  let militaryFlights = 0;
  let militaryVessels = 0;
  if (cache.military) {
    militaryFlights = cache.military.flights.filter((flight) =>
      hasBounds
        ? isInCountryBounds(flight.lat, flight.lon, code)
        : flight.operatorCountry?.toUpperCase() === code
    ).length;
    militaryVessels = cache.military.vessels.filter((vessel) =>
      hasBounds
        ? isInCountryBounds(vessel.lat, vessel.lon, code)
        : vessel.operatorCountry?.toUpperCase() === code
    ).length;
  }

  let outages = 0;
  if (cache.outages) {
    outages = cache.outages.filter((outage) =>
      outage.country?.toLowerCase() === countryLower ||
      (hasBounds && isInCountryBounds(outage.lat, outage.lon, code))
    ).length;
  }

  return { protests, militaryFlights, militaryVessels, outages, earthquakes: 0 };
}
