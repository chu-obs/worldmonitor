import { ExportPanel } from '@/utils';
import { PizzIntIndicator, StatusPanel } from '@/components';

function getHeaderLeft(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.header-left');
}

function getHeaderRight(container: HTMLElement): HTMLElement | null {
  return container.querySelector('.header-right');
}

export function setupStatusPanelFlow(container: HTMLElement): StatusPanel {
  const statusPanel = new StatusPanel();
  const headerLeft = getHeaderLeft(container);
  if (headerLeft) {
    headerLeft.appendChild(statusPanel.getElement());
  }
  return statusPanel;
}

export function setupPizzIntIndicatorFlow(container: HTMLElement): PizzIntIndicator {
  const indicator = new PizzIntIndicator();
  const headerLeft = getHeaderLeft(container);
  if (headerLeft) {
    headerLeft.appendChild(indicator.getElement());
  }
  return indicator;
}

interface SetupExportPanelFlowOptions {
  container: HTMLElement;
  getSnapshotData: ConstructorParameters<typeof ExportPanel>[0];
}

export function setupExportPanelFlow(options: SetupExportPanelFlowOptions): ExportPanel {
  const exportPanel = new ExportPanel(options.getSnapshotData);
  const headerRight = getHeaderRight(options.container);
  if (headerRight) {
    headerRight.insertBefore(exportPanel.getElement(), headerRight.firstChild);
  }
  return exportPanel;
}
