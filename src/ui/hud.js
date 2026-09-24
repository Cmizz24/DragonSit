import { game } from '../game.js';
import { fmt, fmtTime, now } from '../util.js';
import { xpForLevel, totalGoldRate } from '../economy.js';
import { claimableQuests, claimableMissions, claimableAchievements, claimDaily, dailyReward, collectAll, nextIsle, setIsle } from '../actions.js';
import { currentEvent } from '../data/events.js';
import { ISLES } from '../data/buildings.js';
import { elementIcon, ELEMENTS } from '../data/elements.js';
import { ICON, toast, rewardHtml, infoDialog, openModal, bindActions } from './ui.js';
import { sfx } from '../audio.js';

let els = {};

export function initHud() {
  els = {
    level: document.getElementById('hud-level'),
    xp: document.getElementById('hud-xp'),
    gold: document.getElementById('hud-gold-v'),
    food: document.getElementById('hud-food-v'),
    gems: document.getElementById('hud-gems-v'),
    rate: document.getElementById('hud-rate'),
    daily: document.getElementById('btn-daily'),
    questBadge: document.getElementById('quest-badge'),
    collect: document.getElementById('btn-collect'),
    event: document.getElementById('event-banner'),
    isles: document.getElementById('btn-isles'),
  };
  els.event.addEventListener('click', () => {
    const ev = currentEvent();
    infoDialog(ev.name, `<p class="dialog-text">${ev.desc}</p><p class="hint">Ends in ${fmtTime(ev.endsAt - now())}. A new element takes over every week.</p>`);
  });
  els.isles.addEventListener('click', () => openIsles());
  document.getElementById('hud-gold').addEventListener('click', () => game.panels.shop.open('dragons'));
  document.getElementById('hud-food').addEventListener('click', () => game.panels.shop.open('buildings'));
  document.getElementById('hud-gems').addEventListener('click', () => infoDialog('Gems', `<p class="dialog-text">Gems speed up timers and buy rare dragons. Earn them from quests, level ups, boss battles and the daily chest.</p>`));
  document.getElementById('hud-player').addEventListener('click', () => game.panels.quests.open());
  els.daily.addEventListener('click', () => {
    const st = game.state;
    if (now() < st.daily.nextAt) {
      toast(`Next chest in ${fmtTime(st.daily.nextAt - now())}`);
      return;
    }
    const r = claimDaily(st);
    if (r.ok) {
      sfx.play('reward');
      infoDialog('Daily Chest!', `<p class="dialog-text">Day ${st.daily.streak} streak bonus:</p><p class="reward-line">${rewardHtml(r.reward)}</p>`);
      game.changed();
    }
  });
  els.collect.addEventListener('click', () => {
    const st = game.state;
    const r = collectAll(st);
    if (r.amount > 0 || r.gems > 0) {
      sfx.play('coin');
      toast(`${ICON.gold} +${fmt(r.amount)} gold collected${r.gems ? ` · ${ICON.gem} +${r.gems}` : ''}`, 'good');
      for (const b of st.buildings) if (b.type === 'habitat') game.island.floatText(b.x + b.size / 2, b.y + b.size / 2, '+gold', '#ffd54f');
      game.changed();
    } else toast('No gold to collect yet');
  });
  game.on((evt) => {
    if (evt === 'tick' || evt === 'change') updateHud();
  });
  updateHud();
}

export function updateHud() {
  const st = game.state;
  if (!st) return;
  els.level.textContent = st.player.level;
  const need = xpForLevel(st.player.level);
  els.xp.style.width = `${Math.min(100, (st.player.xp / need) * 100).toFixed(1)}%`;
  els.gold.textContent = fmt(st.player.gold);
  els.food.textContent = fmt(st.player.food);
  els.gems.textContent = fmt(st.player.gems);
  els.rate.textContent = `+${fmt(totalGoldRate(st))}/min`;
  const claimable = claimableQuests(st) + claimableMissions(st) + claimableAchievements(st);
  els.questBadge.textContent = claimable;
  els.questBadge.hidden = claimable === 0;
  const ev = currentEvent();
  if (els.event.dataset.el !== ev.element) {
    els.event.dataset.el = ev.element;
    els.event.innerHTML = `${elementIcon(ev.element, 16)} <b>${ev.name}</b> · +50% ${ELEMENTS[ev.element].name} gold`;
    els.event.style.setProperty('--el', ELEMENTS[ev.element].color);
  }
  const ni = nextIsle(st);
  els.isles.hidden = !(st.isles.length > 1 || (ni && st.player.level >= ni.unlock - 1));
  const dailyReady = now() >= st.daily.nextAt;
  els.daily.classList.toggle('ready', dailyReady);
  els.daily.title = dailyReady ? 'Daily chest ready!' : `Daily chest in ${fmtTime(st.daily.nextAt - now())}`;
  const pending = st.buildings.some((b) => (b.type === 'habitat' && b.gold >= 20) || (b.type === 'mine' && b.gems >= 1));
  els.collect.classList.toggle('ready', pending);
}

function openIsles() {
  const st = game.state;
  const ni = nextIsle(st);
  openModal({
    title: 'Travel',
    html: ISLES.map((isle) => {
      const has = st.isles.some((i) => i.id === isle.id);
      const isNext = ni && ni.id === isle.id;
      return `<button class="list-item tappable ${has ? '' : 'locked'}" data-action="${has ? 'go' : 'shop'}" data-id="${isle.id}" ${has || isNext ? '' : 'disabled'}>
        <div class="isle-swatch ${isle.theme}"></div>
        <div class="info"><div class="name">${isle.name} ${isle.id === st.currentIsle ? '<span class="tag">Here</span>' : ''}</div><div class="meta">${has ? isle.desc : isNext ? `Buy in the shop (level ${isle.unlock})` : `Level ${isle.unlock}`}</div></div><span class="chev">›</span></button>`;
    }).join(''),
    onMount: (m) => bindActions(m.body, {
      go: (d) => { setIsle(st, +d.id); game.island.centerOnZone0(); game.changed(); m.close(); },
      shop: () => { m.close(); game.panels.shop.open('island'); },
    }),
  });
}
