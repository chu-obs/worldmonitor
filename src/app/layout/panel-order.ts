export function loadSavedPanelOrder(panelOrderKey: string): string[] {
  try {
    const saved = localStorage.getItem(panelOrderKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function savePanelOrder(panelOrderKey: string, grid: HTMLElement | null): void {
  if (!grid) return;
  const order = Array.from(grid.children)
    .map((element) => (element as HTMLElement).dataset.panel)
    .filter((key): key is string => Boolean(key));
  localStorage.setItem(panelOrderKey, JSON.stringify(order));
}

export function resolvePanelOrder(defaultOrder: string[], savedOrder: string[]): string[] {
  let panelOrder = defaultOrder;
  if (savedOrder.length > 0) {
    const missing = defaultOrder.filter((key) => !savedOrder.includes(key));
    const valid = savedOrder.filter((key) => defaultOrder.includes(key));

    const monitorsIndex = valid.indexOf('monitors');
    if (monitorsIndex !== -1) valid.splice(monitorsIndex, 1);

    const insertIndex = valid.indexOf('politics') + 1 || 0;
    const newPanels = missing.filter((key) => key !== 'monitors');
    valid.splice(insertIndex, 0, ...newPanels);
    valid.push('monitors');
    panelOrder = valid;
  }

  const liveNewsIndex = panelOrder.indexOf('live-news');
  if (liveNewsIndex > 0) {
    panelOrder.splice(liveNewsIndex, 1);
    panelOrder.unshift('live-news');
  }

  return panelOrder;
}

interface MakePanelDraggableFlowOptions {
  element: HTMLElement;
  panelKey: string;
  getGrid: () => HTMLElement | null;
  onDragEnd: () => void;
}

export function makePanelDraggableFlow(options: MakePanelDraggableFlowOptions): void {
  const { element, panelKey } = options;
  element.draggable = true;
  element.dataset.panel = panelKey;

  element.addEventListener('dragstart', (event) => {
    const target = event.target as HTMLElement;
    if (element.dataset.resizing === 'true') {
      event.preventDefault();
      return;
    }
    if (target.classList.contains('panel-resize-handle') || target.closest('.panel-resize-handle')) {
      event.preventDefault();
      return;
    }
    element.classList.add('dragging');
    event.dataTransfer?.setData('text/plain', panelKey);
  });

  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
    options.onDragEnd();
  });

  element.addEventListener('dragover', (event) => {
    event.preventDefault();
    const dragging = document.querySelector('.dragging');
    if (!dragging || dragging === element) return;

    const grid = options.getGrid();
    if (!grid) return;

    const siblings = Array.from(grid.children).filter((child) => child !== dragging);
    const nextSibling = siblings.find((sibling) => {
      const rect = sibling.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2;
    });

    if (nextSibling) {
      grid.insertBefore(dragging, nextSibling);
    } else {
      grid.appendChild(dragging);
    }
  });
}
