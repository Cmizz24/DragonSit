import { game } from './game.js';
import { initHud } from './ui/hud.js';
import { shopPanel } from './ui/shop.js';
import { dragonsPanel } from './ui/dragons.js';
import { buildingPanel } from './ui/building.js';
import { breedPanel } from './ui/breed.js';
import { battlePanel } from './ui/battle.js';
import { questsPanel } from './ui/quests.js';
import { settingsPanel } from './ui/settings.js';
import { friendsPanel } from './ui/friends.js';
import { cloudEnabled, publishCard } from './cloud.js';
import { openModal, bindActions, toast, ICON, closeAllModals, modalCount, infoDialog, setModalStackListener } from './ui/ui.js';
import * as actions from './actions.js';
import { BUILDINGS, BUILDING_LIST } from './data/buildings.js';
import { DRAGON_LIST } from './data/dragons.js';
import { sfx } from './audio.js';
import { fmt, fmtTime } from './util.js';
import { claimableQuests } from './actions.js';
import { initArt } from './art/sprites.js';

// ---------- build placement bar ----------
const placementBar = {
  el: null,
  start(defId, building = null) {
    closeAllModals();
    game.island.startPlacement(defId, building);
    this.el.hidden = false;
    this.el.querySelector('.pl-name').textContent = building ? `Move ${BUILDINGS[defId].name}` : `Place ${BUILDINGS[defId].name}`;
    document.body.classList.add('placing');
    this.update(game.island.placement);
  },
  update(p) {
    if (!p) return;
    this.el.querySelector('[data-action="confirm"]').disabled = !p.valid;
    this.el.querySelector('.pl-hint').textContent = p.valid ? 'Drag to position, then confirm' : 'Cannot build here';
  },
  confirm() {
    const p = game.island.placement;
    if (!p || !p.valid) return;
    let r;
    if (p.building) r = actions.moveBuilding(game.state, p.building, p.gx, p.gy);
    else r = actions.placeBuilding(game.state, p.def, p.gx, p.gy);
    if (!r.ok) {
      sfx.play('error');
      toast(r.error, 'bad');
      return;
    }
    sfx.play('build');
    game.island.floatText(p.gx + p.size / 2, p.gy + p.size / 2, p.building ? 'Moved!' : 'Built!', '#fff');
    if (!p.building) game.levelUp(r.xpEvents);
    this.end();
    game.changed();
  },
  cancel() {
    this.end();
  },
  end() {
    game.island.cancelPlacement();
    this.el.hidden = true;
    document.body.classList.remove('placing');
  },
};

// ---------- level ups (queued so they never stack on top of another dialog) ----------
const pendingLevelUps = [];
game.levelUp = (events) => {
  if (!events || events.length === 0) return;
  for (const ev of events) if (ev.type === 'levelup') pendingLevelUps.push(ev);
  flushLevelUps();
};
function flushLevelUps() {
  if (pendingLevelUps.length === 0 || modalCount() > 0 || !document.getElementById('battle-root').hidden) return;
  const ev = pendingLevelUps.shift();
  {
    sfx.play('levelup');
    const unlockedB = BUILDING_LIST.filter((b) => b.unlock === ev.level).map((b) => b.name);
    const unlockedD = DRAGON_LIST.filter((d) => d.unlock === ev.level && d.cost).map((d) => d.name);
    const unlocks = [...unlockedB, ...unlockedD];
    openModal({
      title: `Level ${ev.level}!`,
      cls: 'center celebrate',
      html: `<div class="big-icon">${ICON.xp}</div><p class="dialog-text">You reached level <b>${ev.level}</b> and earned <b>${ev.gems}</b> gems!</p>
        ${unlocks.length ? `<p class="hint">New in the shop: ${unlocks.join(', ')}</p>` : ''}
        <div class="row center"><button class="btn primary" data-action="ok">Awesome</button></div>`,
      onMount: (m) => bindActions(m.body, { ok: () => m.close() }),
    });
  }
}
setModalStackListener(flushLevelUps);

function showWelcome() {
  openModal({
    title: 'Welcome to DragonSit!',
    cls: 'center',
    hideClose: true,
    html: `<p class="dialog-text">You have a tiny island, a Flame Dragon and big dreams. Here is how it works:</p>
      <ul class="howto">
        <li>${ICON.gold}<span>Dragons living in <b>habitats</b> earn gold. Tap a habitat to collect it.</span></li>
        <li>${ICON.food}<span>Grow food at the <b>farm</b> and feed dragons to level them up.</span></li>
        <li>${ICON.heart}<span><b>Breed</b> two dragons to discover rare hybrids.</span></li>
        <li>${ICON.swords}<span>Take your team into <b>battle</b> for gold, gems and glory.</span></li>
      </ul>
      <p class="hint">Follow the quests to get started. Pinch to zoom and drag to move around the island.</p>
      <div class="row center"><button class="btn primary" data-action="ok">Let's go!</button></div>`,
    onMount: (m) => bindActions(m.body, { ok: () => { m.close(); game.state.settings.welcomed = true; game.save(); } }),
  });
}

async function init() {
  // Load the 3D renderer first (falls back to SVG art if WebGL is unavailable or it takes too long).
  await Promise.race([initArt().catch(() => null), new Promise((r) => setTimeout(r, 4000))]);
  const canvas = document.getElementById('island');
  game.panels = { shop: shopPanel, dragons: dragonsPanel, building: buildingPanel, breed: breedPanel, battle: battlePanel, quests: questsPanel, settings: settingsPanel, friends: friendsPanel, placement: placementBar };
  game.init(canvas);
  sfx.setEnabled(game.state.settings.sound);
  initHud();

  placementBar.el = document.getElementById('placement-bar');
  bindActions(placementBar.el, { confirm: () => placementBar.confirm(), cancel: () => placementBar.cancel() });

  document.querySelectorAll('#bottom-nav [data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.play('tap');
      if (game.island.placement) return;
      const which = btn.dataset.open;
      if (which === 'shop') shopPanel.open('habitats');
      else if (which === 'dragons') dragonsPanel.open('mine');
      else if (which === 'breed') breedPanel.open();
      else if (which === 'battle') battlePanel.open('campaign');
      else if (which === 'quests') questsPanel.open();
      else if (which === 'friends') friendsPanel.open();
    });
  });

  // Cloud: publish the trainer card on load, after changes (throttled) and every 10 minutes.
  let lastPublish = 0;
  const cloudSync = (force = false) => {
    const st = game.state;
    if (!st || !cloudEnabled(st) || !navigator.onLine) return;
    if (!force && Date.now() - lastPublish < 60000) return;
    lastPublish = Date.now();
    publishCard(st).catch(() => {});
  };
  setTimeout(() => cloudSync(true), 3000);
  setInterval(() => cloudSync(true), 10 * 60 * 1000);
  game.on((evt) => { if (evt === 'change') cloudSync(false); });
  document.getElementById('btn-settings').addEventListener('click', () => { sfx.play('tap'); settingsPanel.open(); });
  document.getElementById('btn-center').addEventListener('click', () => { sfx.play('tap'); game.island.centerOnZone0(); });

  // Unlock audio on first interaction (required on iOS).
  const unlock = () => { sfx.unlock(); document.removeEventListener('pointerdown', unlock); };
  document.addEventListener('pointerdown', unlock);

  // Quest completion toasts.
  let lastClaimable = claimableQuests(game.state);
  game.on((evt) => {
    if (evt !== 'change' && evt !== 'tick') return;
    const c = claimableQuests(game.state);
    if (c > lastClaimable) toast('Reward ready! Tap your level badge to claim.', 'good', 2600);
    lastClaimable = c;
  });

  if (game.fresh || !game.state.settings.welcomed) showWelcome();
  else if (game.offline.away > 120000 && game.offline.earned >= 1) {
    toast(`Welcome back! Your dragons earned ${ICON.gold} ${fmt(game.offline.earned)} while you were away (${fmtTime(game.offline.away)}).`, 'good', 4000);
  }

  // iPhone home-screen hint (once).
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !standalone && !localStorage.getItem('dragonsit.a2hs')) {
    const hint = document.getElementById('a2hs');
    hint.hidden = false;
    hint.querySelector('button').addEventListener('click', () => { hint.hidden = true; localStorage.setItem('dragonsit.a2hs', '1'); });
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registration failed', err));
  }
  window.__game = game;
}

init();
