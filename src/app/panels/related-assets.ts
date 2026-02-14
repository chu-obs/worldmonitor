import { STORAGE_KEYS } from '@/config';
import type { MapContainer } from '@/components';
import type { MapLayers, RelatedAsset } from '@/types';
import { saveToStorage } from '@/utils';

interface HandleRelatedAssetClickFlowOptions {
  map: MapContainer | null;
  mapLayers: MapLayers;
}

function enableLayerAndPersist(
  options: HandleRelatedAssetClickFlowOptions,
  layer: keyof MapLayers
): void {
  if (!options.map) return;
  options.map.enableLayer(layer);
  options.mapLayers[layer] = true;
  saveToStorage(STORAGE_KEYS.mapLayers, options.mapLayers);
}

export function handleRelatedAssetClickFlow(
  asset: RelatedAsset,
  options: HandleRelatedAssetClickFlowOptions
): void {
  if (!options.map) return;

  switch (asset.type) {
    case 'pipeline':
      enableLayerAndPersist(options, 'pipelines');
      options.map.triggerPipelineClick(asset.id);
      break;
    case 'cable':
      enableLayerAndPersist(options, 'cables');
      options.map.triggerCableClick(asset.id);
      break;
    case 'datacenter':
      enableLayerAndPersist(options, 'datacenters');
      options.map.triggerDatacenterClick(asset.id);
      break;
    case 'base':
      enableLayerAndPersist(options, 'bases');
      options.map.triggerBaseClick(asset.id);
      break;
    case 'nuclear':
      enableLayerAndPersist(options, 'nuclear');
      options.map.triggerNuclearClick(asset.id);
      break;
  }
}
