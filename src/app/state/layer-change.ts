import type { MapLayers } from '@/types';

interface LayerChangeMapLike {
  setOnLayerChange: (callback: (layer: keyof MapLayers, enabled: boolean) => void) => void;
  setLayerLoading: (layer: keyof MapLayers, loading: boolean) => void;
}

interface SetupMapLayerHandlersFlowOptions {
  map: LayerChangeMapLike | null;
  mapLayers: MapLayers;
  onPersistMapLayers: () => void;
  onSyncFreshness: (layer: keyof MapLayers, enabled: boolean) => void;
  onEnableAis: () => void;
  onDisableAis: () => void;
  onWaitForAisData: () => void;
  onLoadDataForLayer: (layer: keyof MapLayers) => void;
}

export function setupMapLayerHandlersFlow(options: SetupMapLayerHandlersFlowOptions): void {
  options.map?.setOnLayerChange((layer, enabled) => {
    console.log(`[App.onLayerChange] ${layer}: ${enabled}`);

    options.mapLayers[layer] = enabled;
    options.onPersistMapLayers();
    options.onSyncFreshness(layer, enabled);

    if (layer === 'ais') {
      if (enabled) {
        options.map?.setLayerLoading('ais', true);
        options.onEnableAis();
        options.onWaitForAisData();
      } else {
        options.onDisableAis();
      }
      return;
    }

    if (enabled) {
      options.onLoadDataForLayer(layer);
    }
  });
}
