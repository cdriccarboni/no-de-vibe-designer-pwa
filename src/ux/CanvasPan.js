
/**
 * CanvasPan - Navigation Main & Recadrage Canevas No[co]de
 */
export class CanvasPan {
  constructor(container, viewport) {
    this.container = container;
    this.viewport = viewport;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.panX = 0;
    this.panY = 0;
    this.spacePressed = false;
    this.initEvents();
  }

  initEvents() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        this.spacePressed = true;
        document.body.style.cursor = "grab";
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this.spacePressed = false;
        if (!this.isPanning) document.body.style.cursor = "default";
      }
    });

    this.container.addEventListener("pointerdown", (e) => {
      // Actif si Clic Molette (button === 1) ou Espace + Clic Gauche (button === 0)
      if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
        this.isPanning = true;
        this.startX = e.clientX - this.panX;
        this.startY = e.clientY - this.panY;
        document.body.style.cursor = "grabbing";
        e.preventDefault();
      }
    });

    window.addEventListener("pointermove", (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.applyTransform();
    });

    window.addEventListener("pointerup", () => {
      if (this.isPanning) {
        this.isPanning = false;
        document.body.style.cursor = this.spacePressed ? "grab" : "default";
      }
    });
  }

  applyTransform() {
    if (this.viewport) {
      this.viewport.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
    }
  }

  centerPatch() {
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }
}
