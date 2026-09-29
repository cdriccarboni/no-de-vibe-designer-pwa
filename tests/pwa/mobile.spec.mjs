import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { startBridgeProcess as startRemoteServer } from "./bridge-process.mjs";

const shots = (() => {
  const preferred = "/opt/cursor/artifacts/screenshots";
  try {
    fs.mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch {
    const local = path.join(process.cwd(), "tests", ".screenshots");
    fs.mkdirSync(local, { recursive: true });
    return local;
  }
})();

async function bureau(page) {
  await page.locator("#mobileBureau").click();
  await expect(page.locator("#mobilePatch")).toBeVisible();
}

async function addNode(page, type) {
  await page.locator("#addNodeBtn").click();
  await page.locator(`#nodeList button[data-type="${type}"]`).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const deny = () => Promise.reject(Object.assign(new Error("Permission denied"), { name: "NotAllowedError" }));
    const media = navigator.mediaDevices || {};
    media.getUserMedia = deny;
    navigator.mediaDevices = media;
  });
});

test("manifest, service worker and installability", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("No-de Vibe Designer");
  expect(manifest.short_name).toBe("No-de Vibe Designer");
  expect(manifest.display).toBe("standalone");
  expect(manifest.theme_color).toBe("#0f1113");
  const sizes = manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose}`);
  expect(sizes).toContain("192x192:any");
  expect(sizes).toContain("512x512:any");
  expect(sizes.some((item) => item.includes("maskable"))).toBe(true);
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toContain("addEventListener(\"fetch\"");
  expect(sw).toContain("SKIP_WAITING");

  await page.goto("/");
  await expect(page.locator("header b")).toHaveText("No-de Vibe Designer");
  await page.waitForFunction(() => navigator.serviceWorker?.controller);
  const display = await page.evaluate(() => ({
    manifestDisplay: "standalone",
    media: matchMedia("(display-mode: standalone)").matches,
    capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content
  }));
  expect(display.capable).toBe("yes");
  expect(display.media).toBe(false);
});

test("offline shell after the service worker is active", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker?.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("header b")).toHaveText("No-de Vibe Designer");
  await expect(page.locator("#mobilePlateau")).toBeVisible();
  await context.setOffline(false);
});

test("save, close, reopen restores the project", async ({ page, context }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#projectName").fill("Projet Persisté");
  await page.locator("#projectName").dispatchEvent("change");
  await page.locator("#saveBtn").click();
  await expect(page.locator("#alertStack")).toContainText(/enregistr/i);
  await page.close();
  const again = await context.newPage();
  await again.goto("/");
  await expect(again.locator("#projectName")).toHaveValue("Projet Persisté", { timeout: 15000 });
  await expect(again.locator("#alertStack")).toContainText("Projet restauré");
});

test("number times multiply executes", async ({ page }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#newProjectBtn").click();
  await addNode(page, "number");
  await page.locator("#paramValue").fill("3");
  await page.locator("#closeInspector").click();
  await addNode(page, "number");
  await page.locator("#paramValue").fill("2");
  await page.locator("#closeInspector").click();
  await addNode(page, "multiply");
  await page.locator("#closeInspector").click();
  await page.locator('.port-dot[data-node="n1"][data-dir="out"]').click();
  await page.locator('.port-dot[data-node="n3"][data-port-index="0"]').click();
  await page.locator('.port-dot[data-node="n2"][data-dir="out"]').click();
  await page.locator('.port-dot[data-node="n3"][data-port-index="1"]').click();
  await expect(page.locator("#patchValues")).toContainText("Multiplication.2=6");
});

test("subpatch keeps an inner node", async ({ page }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#newProjectBtn").click();
  await addNode(page, "subpatch");
  await page.locator("#openSubpatch").click();
  await expect(page.locator("#graphPath")).toContainText("Sous-patch");
  await addNode(page, "number");
  await expect(page.locator(".mnode")).toHaveCount(1);
  await page.locator("#backBtn").click();
  await expect(page.locator(".mnode h4").first()).toContainText("Sous-patch");
  await page.locator(".mnode h4").first().click();
  await page.locator("#openSubpatch").click();
  await expect(page.locator(".mnode h4").first()).toContainText("Nombre");
});

test("undo and redo", async ({ page }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#newProjectBtn").click();
  await addNode(page, "number");
  await expect(page.locator(".mnode")).toHaveCount(1);
  await page.locator("#closeInspector").click();
  await page.locator("#undoBtn").click();
  await expect(page.locator(".mnode")).toHaveCount(0);
  await page.locator("#redoBtn").click();
  await expect(page.locator(".mnode")).toHaveCount(1);
});

test("vibe preview, apply and undo", async ({ page }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#newProjectBtn").click();
  await page.locator('[data-nav="vibe"]').click();
  await page.locator("#vibeInput").fill("Crée un nombre et une multiplication");
  await page.locator("#applyVibeBtn").click();
  await expect(page.locator("#vibePreview")).toBeVisible();
  await expect(page.locator(".mnode")).toHaveCount(0);
  await page.locator("#vibeCancel").click();
  await expect(page.locator(".mnode")).toHaveCount(0);
  await page.locator("#applyVibeBtn").click();
  await page.locator("#vibeConfirm").click();
  await expect(page.locator(".mnode")).toHaveCount(2);
  await page.locator("#undoBtn").click();
  await expect(page.locator(".mnode")).toHaveCount(0);
});

test("microphone and camera denial are visible", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-nav="device"]').click();
  await page.locator("#micBtn").click();
  await expect(page.locator("#alertStack")).toContainText(/Micro/);
  await page.locator("#backCam").click();
  await expect(page.locator("#alertStack")).toContainText(/Caméra/);
});

test("missing MIDI, OSC bridge, Art-Net and Serial are explicit", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-nav="device"]').click();
  await page.locator("#midiBtn").click();
  await expect(page.locator("#alertStack")).toContainText(/MIDI/);
  await page.locator('[data-nav="tools"]').click();
  await page.locator('[data-tool="osc"]').click();
  await expect(page.locator("#graphErrors")).toContainText(/OSC indisponible/);
  await page.locator("#artnetBtn").click();
  await expect(page.locator("#alertStack")).toContainText(/Art-Net/);
  await page.locator("#serialBtn").click();
  await expect(page.locator("#alertStack")).toContainText(/Serial/);
});

test("websocket network loss and reconnect", async ({ page }) => {
  const bridge = await startRemoteServer({ port: 0, host: "127.0.0.1" });
  try {
    await page.goto("/");
    await page.locator('[data-nav="tools"]').click();
    await page.locator("#remoteUrl").fill(bridge.url);
    await page.locator("#remoteConnect").click();
    await expect(page.locator("#remoteStatus")).toContainText(/connecté/);
    const port = bridge.port;
    await bridge.close();
    await expect(page.locator("#remoteStatus")).toContainText(/perte|erreur|réseau/i);
    const restarted = await startRemoteServer({ port, host: "127.0.0.1" });
    try {
      await expect(page.locator("#remoteStatus")).toContainText(/connecté/, { timeout: 15000 });
    } finally {
      await restarted.close();
    }
  } finally {
    try { await bridge.close(); } catch { /* déjà fermé */ }
  }
});

test("remote conflict is visible and a push updates the bridge", async ({ page }) => {
  const bridge = await startRemoteServer({ port: 0, host: "127.0.0.1" });
  try {
    await page.goto("/");
    await bureau(page);
    await page.locator("#newProjectBtn").click();
    await addNode(page, "number");
    await page.locator('[data-nav="tools"]').click();
    await page.locator("#remoteUrl").fill(bridge.url);
    await page.locator("#remoteConnect").click();
    await expect(page.locator("#alertStack")).toContainText(/Conflit/);
    await page.locator("#remotePush").click();
    await expect(page.locator("#remoteStatus")).toContainText(/révision 1/);
    const health = await (await fetch(`${bridge.httpUrl}/health`)).json();
    expect(health.revision).toBe(1);
    expect(health.nodes).toBe(1);
  } finally {
    await bridge.close();
  }
});

test("refused websocket port is visible", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-nav="tools"]').click();
  await page.locator("#remoteUrl").fill("ws://127.0.0.1:9");
  await page.locator("#remoteConnect").click();
  await expect(page.locator("#remoteStatus")).toContainText(/erreur|perte|réseau/i);
});

test("cue GO reaches the plateau", async ({ page }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#newProjectBtn").click();
  await page.locator("#addCueBtn").click();
  await expect(page.locator("#timelineList")).toContainText("TOP 1");
  await page.locator("#mobilePlateau").click();
  await expect(page.locator("#cueList")).toContainText("TOP 1");
  await page.locator("#goBtn").click();
  await expect(page.locator("#runtimeStatus")).toContainText("GO TOP 1");
});

test("zoom and pan move the patch", async ({ page }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#zoomIn").click();
  await expect.poll(() => page.locator("#patchWorld").evaluate((el) => el.style.transform)).toContain("scale(1.1)");
  const box = await page.locator("#mobilePatch").boundingBox();
  await page.mouse.move(box.x + 30, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 110);
  await page.mouse.up();
  await expect.poll(() => page.locator("#patchWorld").evaluate((el) => el.style.transform)).toMatch(/translate\((?!0px,0px)/);
});

test("duplicate keeps a second node", async ({ page }) => {
  await page.goto("/");
  await bureau(page);
  await page.locator("#newProjectBtn").click();
  await addNode(page, "number");
  await page.locator("#closeInspector").click();
  await page.locator("#dupBtn").click();
  await expect(page.locator(".mnode")).toHaveCount(2);
  await expect(page.locator(".mnode h4").nth(1)).toContainText("Nombre");
});

test("preview play and output are explicit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#stageCanvas")).toBeVisible();
  await page.locator("#playBtn").click();
  await expect(page.locator("#runtimeStatus")).toHaveText("PLAY");
  await page.locator("#outputBtn").click();
  const status = page.locator("#runtimeStatus");
  const alert = page.locator("#alertStack");
  await expect.poll(async () => {
    const text = `${await status.textContent()} ${await alert.textContent()}`;
    return /OUTPUT/.test(text);
  }).toBe(true);
});

test("preferences survive close and reopen", async ({ page, context }) => {
  await page.goto("/");
  await page.locator("#mobilePrefs").click();
  await page.locator("#mobileAccent").evaluate((el) => {
    el.value = "#112233";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#aiEndpoint").fill("https://example.test/v1/chat/completions");
  await page.locator("#aiModel").fill("gpt-4o-mini");
  await page.locator("#aiSave").click();
  await expect(page.locator("#alertStack")).toContainText(/enregistr/i);
  await page.close();
  const again = await context.newPage();
  await again.goto("/");
  await again.locator("#mobilePrefs").click();
  await expect(again.locator("#mobileAccent")).toHaveValue("#112233");
  await expect(again.locator("#aiEndpoint")).toHaveValue("https://example.test/v1/chat/completions");
  await expect(again.locator("#aiModel")).toHaveValue("gpt-4o-mini");
  await expect(again.locator("#versionInfo")).toContainText("1.0.0");
});

test("phone and tablet bureau and plateau", async ({ page }) => {
  const views = [
    ["phone-portrait", 390, 844],
    ["phone-landscape", 844, 390],
    ["tablet-portrait", 768, 1024],
    ["tablet-landscape", 1024, 768]
  ];
  await page.goto("/");
  await page.waitForFunction(() => document.querySelector("header b")?.textContent?.includes("No-de"));
  for (const [name, width, height] of views) {
    await page.setViewportSize({ width, height });
    await page.locator("#mobilePlateau").click();
    await expect(page.locator("#goBtn")).toBeVisible();
    const plateauOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
    expect(plateauOverflow).toBe(true);
    await page.screenshot({ path: path.join(shots, `${name}-plateau.png`) });
    await page.locator("#mobileBureau").click();
    await expect(page.locator("#mobilePatch")).toBeVisible();
    const bureauOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
    expect(bureauOverflow).toBe(true);
    await page.screenshot({ path: path.join(shots, `${name}-bureau.png`) });
  }
});

test("update banner does not reload by itself", async ({ page }) => {
  const swPath = path.join(process.cwd(), "dist", "pwa", "sw.js");
  const original = fs.readFileSync(swPath, "utf8");
  try {
    await page.goto("/");
    await bureau(page);
    await page.locator("#projectName").fill("Patch en cours");
    await page.locator("#projectName").dispatchEvent("change");
    await page.waitForFunction(() => navigator.serviceWorker?.controller);
    fs.writeFileSync(swPath, original.replace(/nvd-[^"]+/, "nvd-test-update"));
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await expect(page.locator("#updateBanner")).toBeVisible();
    await expect(page.locator("#updateBanner")).toContainText("Nouvelle version");
    await expect(page.locator("#projectName")).toHaveValue("Patch en cours");
    await page.waitForTimeout(500);
    await expect(page.locator("#projectName")).toHaveValue("Patch en cours");
  } finally {
    fs.writeFileSync(swPath, original);
  }
});
