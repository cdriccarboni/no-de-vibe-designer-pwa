export class SoundBoard {
  constructor() {
    this.memos = new Map();
  }

  addMemo(id, audioData) {
    this.memos.set(id, audioData);
  }

  trigger(id) {
    return this.memos.has(id);
  }
}
