const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/Users/cedriccarboni/Projects/Antigravity-NoCode/_private_repo/no-de-vibe-designer/node_modules/@playwright/test');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto((process.env.NVD_BASE || 'http://127.0.0.1:3333')+'/desktop/index.html');
  await page.locator('#libraryList .node').count();
  await page.waitForSelector('#patchWorld');
  const box = await page.locator('#patchSpace').boundingBox();
  const point = {x:box.x+220,y:box.y+110};
  await page.mouse.move(point.x,point.y); await page.mouse.down({button:'middle'});
  await page.mouse.move(point.x+90,point.y+55,{steps:8}); await page.mouse.up({button:'middle'});
  const state = () => page.evaluate(() => {
   const m = new DOMMatrix(getComputedStyle(document.querySelector('#patchWorld')).transform);
   return {x:m.e,y:m.f,scale:m.a};
  });
  let before=await state();
  assert(Math.abs(before.x)>10 && Math.abs(before.y)>10,'Pan must actually move the patch');
  const anchor = {x:260,y:150};
  await page.mouse.move(box.x+anchor.x,box.y+anchor.y);
  await page.mouse.wheel(0,-100);
  await page.waitForTimeout(150);
  let after=await state();
  const worldBefore={x:(anchor.x-before.x)/before.scale,y:(anchor.y-before.y)/before.scale};
  const worldAfter={x:(anchor.x-after.x)/after.scale,y:(anchor.y-after.y)/after.scale};
  console.log(JSON.stringify({scenario:'pan then wheel zoom',before,after,worldBefore,worldAfter}));
  assert(Math.abs(worldBefore.x-worldAfter.x)<0.01 && Math.abs(worldBefore.y-worldAfter.y)<0.01,'Wheel zoom must keep the same world point under the pointer after pan');
  before=after;
  const center={x:box.width/2,y:box.height/2};
  await page.locator('#zoomIn').click(); after=await state();
  assert(Math.abs((center.x-before.x)/before.scale-(center.x-after.x)/after.scale)<0.01 && Math.abs((center.y-before.y)/before.scale-(center.y-after.y)/after.scale)<0.01,'Toolbar zoom must keep viewport center fixed after pan');
  for(let i=0;i<25;i++) await page.mouse.wheel(0,-100);
  await page.waitForTimeout(150); before=await state();
  await page.mouse.wheel(0,-100); await page.waitForTimeout(100); after=await state();
  assert.deepEqual(after,before,'Zoom at maximum must not shift viewport');
  await page.locator('#zoomReset').click(); after=await state();
  assert.deepEqual(after,{x:0,y:0,scale:1},'Explicit reset still centers at 100 percent');
  if(process.env.NVD_SCREENSHOT) await page.screenshot({path:process.env.NVD_SCREENSHOT});
  console.log('PATCH ZOOM ANCHOR QA PASSED');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
