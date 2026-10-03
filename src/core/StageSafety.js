export class StageSafety {
  constructor(runtimeInstance) {
    this.runtime = runtimeInstance;
    this.isBlackout = false;
    this.isLocked = false;
    this.initShortcuts();
  }

  initShortcuts() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      if (isInput) return;

      // Cmd+B / Ctrl+B : Blackout d'urgence
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.toggleBlackout();
      }

      // Cmd+L / Ctrl+L : Verrouillage Mode Régie (Show Lock)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.toggleLock();
      }

      // Flèche Droite : Trigger NEXT CUE (GO)
      if (e.key === 'ArrowRight' && !e.shiftKey) {
        this.triggerNextCue();
      }
    });
  }

  toggleBlackout() {
    this.isBlackout = !this.isBlackout;
    if (this.runtime && typeof this.runtime.setGlobalBlackout === 'function') {
      this.runtime.setGlobalBlackout(this.isBlackout);
    }
    console.log(`[RÉGIE] Blackout d'urgence : ${this.isBlackout ? 'ACTIVÉ ⬛' : 'DESACTIVÉ ⬜'}`);
    return this.isBlackout;
  }

  toggleLock() {
    this.isLocked = !this.isLocked;
    const canvas = document.getElementById('patch-canvas');
    if (canvas) {
      canvas.style.pointerEvents = this.isLocked ? 'none' : 'all';
    }
    console.log(`[RÉGIE] Show Lock : ${this.isLocked ? 'VERROUILLÉ 🔒' : 'DÉVERROUILLÉ 🔓'}`);
    return this.isLocked;
  }

  triggerNextCue() {
    if (this.runtime && typeof this.runtime.fireNextCue === 'function') {
      this.runtime.fireNextCue();
    }
  }
}
