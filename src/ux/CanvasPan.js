
export class CanvasPan {
  constructor() {
    this.container = document.getElementById("canvas-container") || document.body;
    this.viewport = document.getElementById("patch-canvas") || document.getElementById("dag-canvas") || document.body;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.panX = 0;
    this.panY = 0;
    this.spacePressed = false;
    this.initEvents();
    this.injectRecenterButton();
  }

  initEvents() {
    window.addEventListener("keydown", (e) => {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (e.code === "Space" && !isInput) {
        this.spacePressed = true;
        document.body.style.cursor = "grab";
        e.preventDefault();
      }
    }, true);

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this.spacePressed = false;
        if (!this.isPanning) document.body.style.cursor = "default";
      }
    }, true);

    this.container.addEventListener("pointerdown", (e) => {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (isInput) return;

      if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
        this.isPanning = true;
        this.startX = e.clientX - this.panX;
        this.startY = e.clientY - this.panY;
        document.body.style.cursor = "grabbing";
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    window.addEventListener("pointermove", (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.applyTransform();
    }, true);

    window.addEventListener("pointerup", () => {
      if (this.isPanning) {
        this.isPanning = false;
        document.body.style.cursor = this.spacePressed ? "grab" : "default";
      }
    }, true);
  }

  applyTransform() {
    if (this.viewport) {
      this.viewport.style.transform = "translate(" + this.panX + "px, " + this.panY + "px)";
    }
  }

  centerPatch() {
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
    console.log("[CANVAS] Patch recentré");
  }

  injectRecenterButton() {
    if (document.getElementById("btn-recenter-patch")) return;
    const btn = document.createElement("button");
    btn.id = "btn-recenter-patch";
    btn.innerHTML = "🎯 Recadrer";
    btn.title = "Recadrer et centrer le patch";
    btn.style.cssText = "position:fixed; bottom:12px; left:12px; z-index:999999; background:#0f172a; color:#00e5ff; border:1px solid #1e293b; padding:6px 12px; border-radius:20px; font-weight:bold; font-size:12px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.5);";
    btn.addEventListener("click", () => this.centerPatch());
    document.body.appendChild(btn);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    window.canvasPan = new CanvasPan();
  });
}
