// Drives the game in an emulated iPhone and takes screenshots. Usage: node tools/play.mjs <scenario> <outdir>
import { extname, join } from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium, devices } = createRequire(import.meta.url)(join(globalRoot, 'playwright'));
const [,, scenario = 'smoke', outdir = '.'] = process.argv;
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const file = join(root, p === '/' ? 'index.html' : p);
  try { const data = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch();
const iphone = devices['iPhone 13'];
const context = await browser.newContext({ ...iphone, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text()); });
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
const shot = (name) => page.screenshot({ path: join(outdir, `${name}.png`) });
const tap = async (sel) => { await page.locator(sel).last().tap(); await page.waitForTimeout(350); };
const G = () => page.evaluate(() => window.__game.state);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 15000 });
await page.waitForTimeout(800);
await shot('01-welcome');
await tap('[data-action="ok"]');
await page.waitForTimeout(600);
await shot('02-island');

if (scenario === 'smoke' || scenario === 'full') {
  await tap('#bottom-nav [data-open="shop"]');
  await shot('03-shop');
  await tap('[data-action="build"][data-id="habitat_earth"]');
  await page.waitForTimeout(400);
  await shot('04-placement');
  // drag ghost right a bit then confirm
  const valid = await page.evaluate(() => window.__game.island.placement && window.__game.island.placement.valid);
  console.log('placement valid at start:', valid);
  if (!valid) await page.evaluate(() => window.__game.island.setPlacementPos(13, 7));
  await tap('#placement-bar [data-action="confirm"]');
  await shot('05-built');
  await tap('#bottom-nav [data-open="shop"]');
  await tap('[data-tab="dragons"]');
  await tap('[data-action="buy"][data-id="terra"]');
  await page.waitForTimeout(300);
  await shot('06-bought');
  await tap('[data-close]');
  // tap hatchery on the canvas via game API (find building), then hatch after forcing timer
  await page.evaluate(() => { const s = window.__game.state; s.eggs.forEach((e) => (e.doneAt = 0)); const h = s.buildings.find((b) => b.type === 'hatchery'); window.__game.onTapBuilding(h); });
  await page.waitForTimeout(400);
  await shot('07-hatchery');
  await tap('[data-action="hatch"]');
  await page.waitForTimeout(500);
  await shot('08-hatched');
  await tap('[data-action="ok"]');
  await tap('[data-close]');
  // habitat panel
  await page.evaluate(() => { const s = window.__game.state; const h = s.buildings.find((b) => b.def === 'habitat_fire'); h.gold = 120; window.__game.onTapBuilding(h); });
  await page.waitForTimeout(400);
  await shot('09-habitat');
  await tap('[data-action="collect"]');
  await tap('[data-action="dragon"]');
  await page.waitForTimeout(400);
  await shot('10-dragon');
  await tap('[data-action="feed"]');
  await tap('[data-action="feed"]');
  await page.waitForTimeout(300);
  await shot('11-fed');
  await page.evaluate(() => { document.querySelectorAll('[data-close]').forEach((b) => b.click()); });
  await page.waitForTimeout(400);
  // quests
  await tap('#hud-player');
  await shot('12-quests');
  await page.evaluate(() => { document.querySelectorAll('[data-close]').forEach((b) => b.click()); });
  await page.waitForTimeout(400);
  // breeding: give gold, place mountain, feed both to 3, breed
  await page.evaluate(() => { const g = window.__game; g.state.player.gold += 5000; g.state.player.food += 500; g.state.player.level = Math.max(g.state.player.level, 2); g.changed(); });
  await tap('#bottom-nav [data-open="breed"]');
  await shot('13-breed-empty');
  await tap('[data-action="shop"]');
  await tap('[data-action="build"][data-id="breeding"]');
  await page.evaluate(() => window.__game.island.setPlacementPos(6, 13));
  await tap('#placement-bar [data-action="confirm"]');
  await page.evaluate(() => { const g = window.__game; for (const d of g.state.dragons) d.level = Math.max(d.level, 3); g.changed(); });
  await tap('#bottom-nav [data-open="breed"]');
  await tap('[data-action="pick"][data-slot="a"]');
  await tap('[data-action="sel"]');
  await tap('[data-action="pick"][data-slot="b"]');
  await tap('[data-action="sel"]');
  await shot('14-breed-pick');
  await tap('[data-action="breed"]');
  await shot('15-breeding');
  await page.evaluate(() => { document.querySelectorAll('[data-close]').forEach((b) => b.click()); });
  await page.waitForTimeout(300);
  // battle
  await tap('#bottom-nav [data-open="battle"]');
  await shot('16-battle-hub');
  await tap('[data-action="stage"][data-id="1"]');
  await shot('17-team');
  await tap('[data-action="fight"]');
  await page.waitForTimeout(700);
  await shot('18-battle');
  for (let i = 0; i < 12; i++) {
    const over = await page.evaluate(() => !window.__game.panels.battle.battle || window.__game.panels.battle.battle.over);
    if (over) break;
    await tap('.move-btn.super, .move-btn');
    await page.waitForTimeout(1500);
    if (i === 0) await shot('19-battle-hit');
  }
  await page.waitForTimeout(1200);
  await shot('20-result');
  await tap('[data-action="done"]');
  await page.waitForTimeout(400);
  await tap('[data-tab="arena"]');
  await shot('21-arena');
  await page.evaluate(() => { document.querySelectorAll('[data-close]').forEach((b) => b.click()); });
  await tap('#bottom-nav [data-open="dragons"]');
  await tap('[data-tab="book"]');
  await shot('22-book');
  await page.evaluate(() => { document.querySelectorAll('[data-close]').forEach((b) => b.click()); });
  await tap('#btn-settings');
  await shot('23-settings');
  await page.evaluate(() => { document.querySelectorAll('[data-close]').forEach((b) => b.click()); });
  await page.waitForTimeout(300);
  await shot('24-final');
  const st = await G();
  console.log('final state: level', st.player.level, 'gold', Math.floor(st.player.gold), 'dragons', st.dragons.length, 'buildings', st.buildings.length, 'breeding', !!st.breeding, 'cleared', st.battle.campaignCleared);
  // reload persists?
  await page.reload();
  await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 15000 });
  const st2 = await G();
  console.log('after reload: dragons', st2.dragons.length, 'buildings', st2.buildings.length);
}
console.log('errors:', errors.length);
await browser.close();
server.close();
