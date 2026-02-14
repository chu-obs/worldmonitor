export interface ClusterableMarker {
  lat: number;
  lon?: number;
  lng?: number;
}

export interface MarkerCluster<T> {
  items: T[];
  center: [number, number];
  pos: [number, number];
}

export type MarkerProjector = (point: [number, number]) => [number, number] | null;

export function clusterGeospatialMarkers<T extends ClusterableMarker>(
  items: T[],
  pixelRadius: number,
  project: MarkerProjector,
  getGroupKey?: (item: T) => string,
): MarkerCluster<T>[] {
  const clusters: MarkerCluster<T>[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue;

    const item = items[i]!;
    const itemLon = item.lon ?? item.lng ?? 0;
    const itemPos = project([itemLon, item.lat]);
    if (!itemPos) continue;

    const cluster: T[] = [item];
    assigned.add(i);
    const itemKey = getGroupKey?.(item);

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue;
      const other = items[j]!;

      if (getGroupKey && getGroupKey(other) !== itemKey) continue;

      const otherLon = other.lon ?? other.lng ?? 0;
      const otherPos = project([otherLon, other.lat]);
      if (!otherPos) continue;

      const dx = itemPos[0] - otherPos[0];
      const dy = itemPos[1] - otherPos[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= pixelRadius) {
        cluster.push(other);
        assigned.add(j);
      }
    }

    let sumLat = 0;
    let sumLon = 0;
    for (const clusterItem of cluster) {
      sumLat += clusterItem.lat;
      sumLon += clusterItem.lon ?? clusterItem.lng ?? 0;
    }

    const centerLat = sumLat / cluster.length;
    const centerLon = sumLon / cluster.length;
    const centerPos = project([centerLon, centerLat]);

    clusters.push({
      items: cluster,
      center: [centerLon, centerLat],
      pos: centerPos ?? itemPos,
    });
  }

  return clusters;
}
