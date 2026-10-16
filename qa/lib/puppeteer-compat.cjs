// Adaptateur minimal : permet d'exécuter les anciens tests écrits pour puppeteer-core
// avec Playwright (déjà présent sur les postes et en CI).
// Usage : PUPPETEER_PATH=$PWD/qa/lib/puppeteer-compat.cjs PLAYWRIGHT_PATH=/…/playwright node qa/browser-e2e-designer.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
module.exports = {
  async launch({ executablePath, headless = true } = {}) {
    const browser = await chromium.launch({ executablePath, headless });
    return {
      async newPage() {
        const page = await browser.newPage();
        page.setViewport = ({ width, height }) => page.setViewportSize({ width, height });
        return page;
      },
      close: () => browser.close()
    };
  }
};
