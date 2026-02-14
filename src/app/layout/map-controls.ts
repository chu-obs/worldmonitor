interface MapRenderable {
  render: () => void;
}

interface SetupMapResizeFlowOptions {
  map: MapRenderable | null;
}

export function setupMapResizeFlow(options: SetupMapResizeFlowOptions): void {
  const mapSection = document.getElementById('mapSection');
  const resizeHandle = document.getElementById('mapResizeHandle');
  if (!mapSection || !resizeHandle) return;

  const savedHeight = localStorage.getItem('map-height');
  if (savedHeight) {
    mapSection.style.height = savedHeight;
  }

  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  resizeHandle.addEventListener('mousedown', (event) => {
    isResizing = true;
    startY = event.clientY;
    startHeight = mapSection.offsetHeight;
    mapSection.classList.add('resizing');
    document.body.style.cursor = 'ns-resize';
    event.preventDefault();
  });

  document.addEventListener('mousemove', (event) => {
    if (!isResizing) return;
    const deltaY = event.clientY - startY;
    const newHeight = Math.max(400, Math.min(startHeight + deltaY, window.innerHeight - 60));
    mapSection.style.height = `${newHeight}px`;
    options.map?.render();
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    mapSection.classList.remove('resizing');
    document.body.style.cursor = '';
    localStorage.setItem('map-height', mapSection.style.height);
    options.map?.render();
  });
}

export function setupMapPinFlow(): void {
  const mapSection = document.getElementById('mapSection');
  const pinButton = document.getElementById('mapPinBtn');
  if (!mapSection || !pinButton) return;

  const isPinned = localStorage.getItem('map-pinned') === 'true';
  if (isPinned) {
    mapSection.classList.add('pinned');
    pinButton.classList.add('active');
  }

  pinButton.addEventListener('click', () => {
    const nowPinned = mapSection.classList.toggle('pinned');
    pinButton.classList.toggle('active', nowPinned);
    localStorage.setItem('map-pinned', String(nowPinned));
  });
}
