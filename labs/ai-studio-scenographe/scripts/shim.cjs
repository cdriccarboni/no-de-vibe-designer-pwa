if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  };
}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = globalThis.window.localStorage;
}
