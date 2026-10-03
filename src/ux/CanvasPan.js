export class CanvasPan {
  constructor(canvasElement, viewportState = { panX: 0, panY: 0, zoom: 1 }) {
    this.canvas = canvasElement;
    this.viewport = viewportState;
    this.isPanning = false;
    this.isSpacePressed = false;
    this.startMouse = { x: 0, y: 0 };
    this.startPan = { x: 0, y: 0 };
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      if (e.code === 'Space' && !this.isSpacePressed && !isInput) {
        this.isSpacePressed = true;
        this.canvas.style.cursor = 'grab';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        if (!this.isPanning) {
          this.canvas.style.cursor = 'default';
        }
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const isBgClick = e.target === this.canvas || e.target.classList.contains('canvas-bg');
      if (e.button === 1 || (e.button === 0 && (this.isSpacePressed || isBgClick))) {
        this.isPanning = true;
        this.startMouse = { x: e.clientX, y: e.clientY };
        this.startPan = { x: this.viewport.panX, y: this.viewport.panY };
        this.canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.startMouse.x;
      const dy = e.clientY - this.startMouse.y;
      this.viewport.panX = this.startPan.x + dx;
      this.viewport.panY = this.startPan.y + dy;
      if (window.cvd && typeof window.cvd.render === 'function') {
        window.cvd.render();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'default';
      }
    });
  }
}
