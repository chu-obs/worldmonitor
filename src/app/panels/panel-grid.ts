import { DEFAULT_PANELS } from '@/config';
import type { Panel } from '@/components';
import {
  loadSavedPanelOrder,
  makePanelDraggableFlow,
  resolvePanelOrder,
  savePanelOrder as savePanelOrderFlow,
} from '@/app/layout/panel-order';

interface MountPanelsInGridFlowOptions {
  panelOrderKey: string;
  panels: Record<string, Panel>;
  panelsGrid: HTMLElement;
}

export function mountPanelsInGridFlow(options: MountPanelsInGridFlowOptions): void {
  const defaultOrder = Object.keys(DEFAULT_PANELS).filter((key) => key !== 'map');
  const savedOrder = loadSavedPanelOrder(options.panelOrderKey);
  const panelOrder = resolvePanelOrder(defaultOrder, savedOrder);

  panelOrder.forEach((key) => {
    const panel = options.panels[key];
    if (!panel) return;
    const element = panel.getElement();
    makePanelDraggableFlow({
      element,
      panelKey: key,
      getGrid: () => options.panelsGrid,
      onDragEnd: () => {
        savePanelOrderFlow(options.panelOrderKey, options.panelsGrid);
      },
    });
    options.panelsGrid.appendChild(element);
  });
}
