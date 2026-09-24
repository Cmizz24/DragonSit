// Extended scenario: friends, gifts, tower, missions, achievements, isles, empower, mines, heroic.
import { extname, join } from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium, devices } = createRequire(import.meta.url)(join(globalRoot, 'playwright'));
const [,, outdir = '.'] = process.argv;
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
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
const shot = (name) => page.screenshot({ path: join(outdir, `${name}.png`) });
const tap = async (sel) => { await page.locator(sel).last().tap(); await page.waitForTimeout(350); };
const closeAll = async () => { await page.evaluate(() => { document.querySelectorAll('[data-close]').forEach((b) => b.click()); }); await page.waitForTimeout(350); };
const S = () => page.evaluate(() => window.__game.state);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 15000 });
await page.waitForTimeout(600);
await tap('[data-action="ok"]');

// Prepare a mid-game state.
await page.evaluate(async () => {
  const g = window.__game; const st = g.state;
  const a = await import('/src/actions.js');
  st.player.gold = 6000000; st.player.gems = 800; st.player.food = 80000; st.player.level = 12;
  st.dragons[0].level = 22;
  a.placeBuilding(st, 'habitat_earth', 13, 7);
  a.placeBuilding(st, 'habitat_water', 9, 13);
  a.buyDragon(st, 'terra'); a.buyDragon(st, 'sea');
  st.eggs.forEach((e) => (e.doneAt = 0));
  for (const e of [...st.eggs]) { const hab = a.habitatsWithRoom(st, e.species)[0]; a.hatchEgg(st, e.id, hab.id); }
  for (const d of st.dragons) d.level = Math.max(d.level, 15);
  g.changed();
});
await shot('01-island');

// Friends: share card (clipboard), add a synthetic friend, redeem gift.
await tap('#bottom-nav [data-open="friends"]');
await shot('02-friends-empty');
await tap('[data-action="share"]');
const clip = await page.evaluate(() => navigator.clipboard.readText());
console.log('shared card:', clip.slice(0, 50));
const friendCard = await page.evaluate(async () => {
  const soc = await import('/src/social.js'); const stm = await import('/src/state.js');
  const f = stm.defaultState(); f.player.name = 'Ash'; f.player.level = 9; f.battle.trophies = 340; f.tower.best = 7; f.dragons[0].level = 14;
  window.__friendId = f.player.id; window.__friendGift = soc.giftCode(f.player.id);
  return soc.encodeCard(soc.myCard(f));
});
await page.fill('#friend-code', 'hello ' + friendCard);
await tap('[data-action="add"]');
await page.fill('#gift-code', await page.evaluate(() => window.__friendGift));
await tap('[data-action="redeem"]');
await shot('03-gift');
await tap('[data-action="ok"]');
await shot('04-friends');
await tap('[data-action="battle"]');
await shot('05-friend-team');
await tap('[data-action="fight"]');
await page.waitForTimeout(600);
for (let i = 0; i < 20; i++) {
  const over = await page.evaluate(() => !window.__game.panels.battle.battle || window.__game.panels.battle.battle.over);
  if (over) break;
  await tap('.move-btn');
  await page.waitForTimeout(1400);
}
await page.waitForTimeout(1200);
await shot('06-friend-result');
await tap('[data-action="done"]');
await closeAll();

// Tower run: two floors then retreat.
await tap('#bottom-nav [data-open="battle"]');
await tap('[data-tab="tower"]');
await shot('07-tower');
await tap('[data-action="towerstart"]');
await tap('[data-action="fight"]');
for (let floor = 0; floor < 2; floor++) {
  await page.waitForTimeout(500);
  for (let i = 0; i < 25; i++) {
    const over = await page.evaluate(() => !window.__game.panels.battle.battle || window.__game.panels.battle.battle.over);
    if (over) break;
    await tap('.move-btn');
    await page.waitForTimeout(1400);
  }
  await page.waitForTimeout(1200);
  if (floor === 0) { await shot('08-tower-floor1'); await tap('[data-action="next"]'); }
}
await shot('09-tower-floor2');
await tap('[data-action="stop"]');
await page.waitForTimeout(400);
await shot('10-tower-tab');
await closeAll();

// Quests: daily + awards.
await tap('#hud-player');
await tap('[data-tab="missions"]');
await shot('11-missions');
await tap('[data-tab="achievements"]');
await shot('12-awards');
const claimAch = await page.locator('[data-action="ach"]').count();
if (claimAch) await tap('[data-action="ach"]');
await closeAll();

// Isles: buy Sky Isle, look at it, travel back.
await tap('#bottom-nav [data-open="shop"]');
await tap('[data-tab="island"]');
await shot('13-isles-shop');
await tap('[data-action="isle"]');
await tap('[data-action="yes"]');
await page.waitForTimeout(600);
await shot('14-sky-isle');
await tap('#btn-isles');
await shot('15-travel');
await tap('[data-action="go"][data-id="0"]');
await page.waitForTimeout(400);

// Mine: build and open.
await tap('#bottom-nav [data-open="shop"]');
await tap('[data-tab="buildings"]');
await tap('[data-action="build"][data-id="mine"]');
await tap('#placement-bar [data-action="confirm"]');
await page.evaluate(() => { const s = window.__game.state; const m = s.buildings.find((b) => b.type === 'mine'); m.gems = 2.4; window.__game.onTapBuilding(m); });
await page.waitForTimeout(400);
await shot('16-mine');
await tap('[data-action="collectmine"]');
await closeAll();

// Dragon: empower.
await tap('#bottom-nav [data-open="dragons"]');
await page.locator('[data-action="dragon"]').first().tap();
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('.sheet.full .sheet-body').scrollTo(0, 500));
await shot('17-dragon-empower');
await tap('[data-action="empower"]');
await tap('[data-action="yes"]');
await page.waitForTimeout(300);
await closeAll();

// Heroic campaign.
await page.evaluate(() => { window.__game.state.battle.campaignCleared = 60; window.__game.changed(); });
await tap('#bottom-nav [data-open="battle"]');
await tap('[data-action="heroic"][data-on="1"]');
await shot('18-heroic');
await closeAll();
await shot('19-final');

const st = await S();
console.log('friends', st.friends.length, 'gifts', st.stats.giftsRedeemed, 'friendWins', st.stats.friendWins, 'tower best', st.tower.best, 'isles', st.isles.length, 'stars', st.dragons[0].stars, 'mine', st.buildings.some((b) => b.type === 'mine'), 'level', st.player.level, 'missions progress', JSON.stringify(st.missions.progress));
await page.reload();
await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 15000 });
const st2 = await S();
console.log('after reload: isles', st2.isles.length, 'friends', st2.friends.length, 'tower', st2.tower.best, 'currentIsle', st2.currentIsle);
console.log('errors:', errors.length);
await browser.close();
server.close();
