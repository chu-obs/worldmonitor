import type { GeoProjection } from 'd3';
import type {
  MilitaryFlight,
  MilitaryFlightCluster,
  MilitaryVessel,
  MilitaryVesselCluster,
} from '@/types';
import type { PopupType } from '../../MapPopup';

export type OverlayPopupHandler = (event: MouseEvent, type: PopupType, data: unknown) => void;
export type TrackLineAppender = (trackLine: SVGPolylineElement) => void;

interface MilitaryOverlayRenderOptions {
  projection: GeoProjection;
  overlays: HTMLElement;
  zoom: number;
  flights: MilitaryFlight[];
  flightClusters: MilitaryFlightCluster[];
  vessels: MilitaryVessel[];
  vesselClusters: MilitaryVesselCluster[];
  onMarkerClick: OverlayPopupHandler;
  appendTrackLine: TrackLineAppender;
}

function projectTrackPoints(
  projection: GeoProjection,
  track: [number, number][],
): string {
  return track
    .map((point) => {
      const projected = projection([point[1], point[0]]);
      return projected ? `${projected[0]},${projected[1]}` : null;
    })
    .filter((point): point is string => point !== null)
    .join(' ');
}

function renderMilitaryFlights(options: MilitaryOverlayRenderOptions): void {
  options.flights.forEach((flight) => {
    const pos = options.projection([flight.lon, flight.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `military-flight-marker ${flight.operator} ${flight.aircraftType}${flight.isInteresting ? ' interesting' : ''}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = `military-flight-icon ${flight.aircraftType}`;
    icon.style.transform = `rotate(${flight.heading}deg)`;
    div.appendChild(icon);

    if (options.zoom >= 3) {
      const label = document.createElement('div');
      label.className = 'military-flight-label';
      label.textContent = flight.callsign;
      div.appendChild(label);
    }

    if (flight.altitude > 0) {
      const altitude = document.createElement('div');
      altitude.className = 'military-flight-altitude';
      altitude.textContent = `FL${Math.round(flight.altitude / 100)}`;
      div.appendChild(altitude);
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'militaryFlight', flight);
    });

    options.overlays.appendChild(div);

    if (!flight.track || flight.track.length <= 1 || options.zoom < 2) return;

    const points = projectTrackPoints(options.projection, flight.track);
    if (!points) return;

    const trackLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    trackLine.setAttribute('points', points);
    trackLine.setAttribute('class', `military-flight-track ${flight.operator}`);
    trackLine.setAttribute('fill', 'none');
    trackLine.setAttribute('stroke-width', '1.5');
    trackLine.setAttribute('stroke-dasharray', '4,2');
    options.appendTrackLine(trackLine);
  });
}

function renderMilitaryFlightClusters(options: MilitaryOverlayRenderOptions): void {
  options.flightClusters.forEach((cluster) => {
    const pos = options.projection([cluster.lon, cluster.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `military-cluster-marker flight-cluster ${cluster.activityType || 'unknown'}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const count = document.createElement('div');
    count.className = 'cluster-count';
    count.textContent = String(cluster.flightCount);
    div.appendChild(count);

    const label = document.createElement('div');
    label.className = 'cluster-label';
    label.textContent = cluster.name;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'militaryFlightCluster', cluster);
    });

    options.overlays.appendChild(div);
  });
}

function renderMilitaryVessels(options: MilitaryOverlayRenderOptions): void {
  options.vessels.forEach((vessel) => {
    const pos = options.projection([vessel.lon, vessel.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `military-vessel-marker ${vessel.operator} ${vessel.vesselType}${vessel.isDark ? ' dark-vessel' : ''}${vessel.isInteresting ? ' interesting' : ''}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const icon = document.createElement('div');
    icon.className = `military-vessel-icon ${vessel.vesselType}`;
    icon.style.transform = `rotate(${vessel.heading}deg)`;
    div.appendChild(icon);

    if (vessel.isDark) {
      const darkIndicator = document.createElement('div');
      darkIndicator.className = 'dark-vessel-indicator';
      darkIndicator.textContent = '⚠️';
      darkIndicator.title = 'AIS Signal Lost';
      div.appendChild(darkIndicator);
    }

    if (options.zoom >= 3) {
      const label = document.createElement('div');
      label.className = 'military-vessel-label';
      label.textContent = vessel.name;
      div.appendChild(label);
    }

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'militaryVessel', vessel);
    });

    options.overlays.appendChild(div);

    if (!vessel.track || vessel.track.length <= 1 || options.zoom < 2) return;

    const points = projectTrackPoints(options.projection, vessel.track);
    if (!points) return;

    const trackLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    trackLine.setAttribute('points', points);
    trackLine.setAttribute('class', `military-vessel-track ${vessel.operator}`);
    trackLine.setAttribute('fill', 'none');
    trackLine.setAttribute('stroke-width', '2');
    options.appendTrackLine(trackLine);
  });
}

function renderMilitaryVesselClusters(options: MilitaryOverlayRenderOptions): void {
  options.vesselClusters.forEach((cluster) => {
    const pos = options.projection([cluster.lon, cluster.lat]);
    if (!pos) return;

    const div = document.createElement('div');
    div.className = `military-cluster-marker vessel-cluster ${cluster.activityType || 'unknown'}`;
    div.style.left = `${pos[0]}px`;
    div.style.top = `${pos[1]}px`;

    const count = document.createElement('div');
    count.className = 'cluster-count';
    count.textContent = String(cluster.vesselCount);
    div.appendChild(count);

    const label = document.createElement('div');
    label.className = 'cluster-label';
    label.textContent = cluster.name;
    div.appendChild(label);

    div.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onMarkerClick(event, 'militaryVesselCluster', cluster);
    });

    options.overlays.appendChild(div);
  });
}

export function renderMilitaryOverlayMarkers(options: MilitaryOverlayRenderOptions): void {
  renderMilitaryFlights(options);
  renderMilitaryFlightClusters(options);
  renderMilitaryVessels(options);
  renderMilitaryVesselClusters(options);
}
