/**
 * Historique undo/redo pour le projet (snapshots JSON).
 */
export function createHistory(limit = 40) {
  let stack = [];
  let index = -1;

  function snapshot(project) {
    return JSON.parse(JSON.stringify(project));
  }

  return {
    push(project) {
      const snap = snapshot(project);
      stack = stack.slice(0, index + 1);
      stack.push(snap);
      if (stack.length > limit) {
        stack.shift();
      } else {
        index++;
      }
      if (index >= limit) index = limit - 1;
      // After shift, index stays at end
      index = stack.length - 1;
    },
    canUndo() { return index > 0; },
    canRedo() { return index >= 0 && index < stack.length - 1; },
    undo() {
      if (!this.canUndo()) return null;
      index--;
      return snapshot(stack[index]);
    },
    redo() {
      if (!this.canRedo()) return null;
      index++;
      return snapshot(stack[index]);
    },
    replaceCurrent(project) {
      if (index < 0) {
        this.push(project);
        return;
      }
      stack[index] = snapshot(project);
    },
    clear() {
      stack = [];
      index = -1;
    },
    size() { return stack.length; }
  };
}
