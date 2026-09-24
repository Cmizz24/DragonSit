import { game } from '../game.js';
import { BUILDING_LIST, BUILDINGS, ZONES, ISLES } from '../data/buildings.js';
import { currentEvent } from '../data/events.js';
import * as eco from '../economy.js';
import { DRAGON_LIST, RARITY } from '../data/dragons.js';
import { ELEMENTS, elementBadge } from '../data/elements.js';
import { buildingSVG } from '../art/buildings.js';
import { dragonSVG } from '../art/dragon.js';
import * as actions from '../actions.js';
import { openModal, bindActions, tabs, cost, toast, ICON, confirmDialog, infoDialog } from './ui.js';
import { fmt, fmtTime } from '../util.js';
import { sfx } from '../audio.js';

const st = () => game.state;

const TABS = [['habitats', 'Habitats'], ['buildings', 'Buildings'], ['decor', 'Decor'], ['dragons', 'Dragons'], ['island', 'Isles']];

export const shopPanel = {
  modal: null,
  tab: 'habitats',

  open(tab = 'habitats') {
    this.tab = tab;
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: 'Shop',
      full: true,
      html: '',
      onMount: (m) => {
        bindActions(m.body, {
          build: (d) => this.build(d.id),
          buy: (d) => this.buyDragon(d.id),
          expand: (d) => this.expand(d.gems === '1'),
          isle: (d) => this.buyIsle(),
          travel: (d) => { actions.setIsle(st(), +d.id); game.island.centerOnZone0(); game.changed(); this.modal.close(); },
          info: (d) => {
            const def = BUILDINGS[d.id];
            infoDialog(def.name, `<p class="dialog-text">${def.desc}</p>`);
          },
        });
      },
      onClose: () => { this.modal = null; },
    });
    this.render();
  },

  render() {
    const m = this.modal;
    if (!m) return;
    const st = game.state;
    let html = `<div class="tabs">${TABS.map(([id, label]) => `<button class="tab ${id === this.tab ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div><div class="tab-body" id="shop-body"></div>`;
    m.body.innerHTML = html;
    tabs(m.body, (t) => { this.tab = t; this.renderTab(); });
    this.renderTab();
  },

  renderTab() {
    const st = game.state;
    const body = this.modal.body.querySelector('#shop-body');
    if (!body) return;
    if (this.tab === 'dragons') {
      const ev = currentEvent();
      const list = DRAGON_LIST.filter((d) => d.cost).sort((a, b) => a.unlock - b.unlock || (a.cost.gems ? 1 : 0) - (b.cost.gems ? 1 : 0));
      body.innerHTML = `<p class="hint">Bought dragons arrive as eggs in your Hatchery (${actions.freeEggSlots(st)} free nest${actions.freeEggSlots(st) === 1 ? '' : 's'}). ${ELEMENTS[ev.element].name} dragons are 25% off this week!</p>` + list.map((d) => {
        const locked = st.player.level < d.unlock;
        const owned = st.discovered.includes(d.id);
        const price = eco.dragonPrice(d);
        const onSale = d.elements.includes(ev.element);
        return `<div class="list-item ${locked ? 'locked' : ''}">
          <div class="thumb">${dragonSVG(d.id, 'young', { size: 72 })}</div>
          <div class="info">
            <div class="name">${d.name} <span class="rarity" style="color:${RARITY[d.rarity].color}">${RARITY[d.rarity].name}</span></div>
            <div class="badges">${d.elements.map((e) => elementBadge(e, 14)).join('')} ${owned ? '<span class="tag">Owned</span>' : ''} ${onSale ? '<span class="tag good">Sale</span>' : ''}</div>
            <div class="meta">${locked ? `${ICON.lock} Level ${d.unlock}` : cost(price, st)}</div>
          </div>
          <button class="btn small" data-action="buy" data-id="${d.id}" ${locked ? 'disabled' : ''}>Buy</button>
        </div>`;
      }).join('');
      return;
    }
    if (this.tab === 'island') {
      const cur = ISLES[st.currentIsle];
      const owned = actions.isleState(st);
      const next = actions.nextZone(st);
      const nextIsle = actions.nextIsle(st);
      body.innerHTML = `<div class="card">
        <h3>${cur.name}</h3>
        <p class="hint">You own ${owned.zones.length} of ${ZONES.length} land areas here. Locked land is shown darker on the map.</p>
        ${next ? `<div class="row gap wrap">
          <button class="btn primary" data-action="expand" data-gems="0">${cost({ gold: next.price.gold }, st)} Expand</button>
          <button class="btn ghost" data-action="expand" data-gems="1">${cost({ gems: next.price.gems }, st)} Expand</button>
        </div>` : '<p>This isle is fully expanded!</p>'}
      </div>
      <h3 class="group-title">Your isles</h3>
      ${ISLES.map((isle) => {
        const has = st.isles.some((i) => i.id === isle.id);
        const isNext = nextIsle && nextIsle.id === isle.id;
        const locked = st.player.level < isle.unlock;
        return `<div class="list-item ${has || isNext ? '' : 'locked'}">
          <div class="isle-swatch ${isle.theme}"></div>
          <div class="info"><div class="name">${isle.name} ${isle.id === st.currentIsle ? '<span class="tag">Here</span>' : ''}</div><div class="desc">${isle.desc}</div>
          <div class="meta">${has ? `${st.isles.find((i) => i.id === isle.id).zones.length}/${ZONES.length} areas` : locked ? `${ICON.lock} Level ${isle.unlock}` : cost(isle.cost, st)}</div></div>
          ${has ? (isle.id === st.currentIsle ? '' : `<button class="btn small" data-action="travel" data-id="${isle.id}">Travel</button>`) : isNext ? `<button class="btn small primary" data-action="isle" ${locked || !eco.canAfford(st, isle.cost) ? 'disabled' : ''}>Buy</button>` : ''}
        </div>`;
      }).join('')}`;
      return;
    }
    const filter = { habitats: (d) => d.type === 'habitat', buildings: (d) => ['farm', 'breeding', 'hatchery', 'temple', 'mine'].includes(d.type), decor: (d) => d.type === 'deco' }[this.tab];
    const list = BUILDING_LIST.filter(filter).sort((a, b) => a.unlock - b.unlock);
    body.innerHTML = list.map((d) => {
      const avail = actions.buildAvailability(st, d.id);
      const locked = st.player.level < d.unlock;
      const built = d.max && actions.countBuildings(st, d.id) >= d.max;
      const extra = d.type === 'farm' ? { farmState: 'ready' } : {};
      return `<div class="list-item ${locked ? 'locked' : ''}">
        <div class="thumb">${buildingSVG({ def: d.id, level: 1 }, extra)}</div>
        <div class="info">
          <div class="name">${d.name}</div>
          <div class="desc">${d.desc}</div>
          <div class="meta">${locked ? `${ICON.lock} Level ${d.unlock}` : cost(d.cost, st)} <span class="muted">· ${d.size}x${d.size}</span></div>
        </div>
        <button class="btn small" data-action="build" data-id="${d.id}" ${!avail.ok ? 'disabled' : ''}>${built ? 'Built' : locked ? 'Locked' : 'Build'}</button>
      </div>`;
    }).join('');
  },

  build(defId) {
    const avail = actions.buildAvailability(game.state, defId);
    if (!avail.ok) {
      toast(avail.error, 'bad');
      return;
    }
    this.modal.close();
    game.panels.placement.start(defId);
  },

  buyDragon(id) {
    const r = actions.buyDragon(game.state, id);
    if (!r.ok) {
      sfx.play('error');
      toast(r.error, 'bad');
      return;
    }
    sfx.play('coin');
    toast(`Egg placed in the Hatchery!`, 'good');
    game.changed();
    this.renderTab();
  },

  async buyIsle() {
    const st = game.state;
    const next = actions.nextIsle(st);
    if (!next) return;
    const ok = await confirmDialog(`Buy ${next.name}`, `Unlock a whole new isle for ${fmt(next.cost.gold)} gold?`, 'Buy');
    if (!ok) return;
    const r = actions.buyIsle(st);
    if (!r.ok) { toast(r.error, 'bad'); return; }
    sfx.play('levelup');
    toast(`${next.name} is yours!`, 'good');
    game.levelUp(r.xpEvents);
    game.changed();
    if (this.modal) this.modal.close();
    game.island.centerOnZone0();
  },

  async expand(useGems) {
    const st = game.state;
    const next = actions.nextZone(st);
    if (!next) return;
    const ok = await confirmDialog('Expand isle', `Unlock a new ${next.w}x${next.h} area for ${useGems ? `${next.price.gems} gems` : `${fmt(next.price.gold)} gold`}?`, 'Expand');
    if (!ok) return;
    const r = actions.buyZone(st, useGems);
    if (!r.ok) {
      toast(r.error, 'bad');
      return;
    }
    sfx.play('build');
    toast('New land unlocked!', 'good');
    game.levelUp(r.xpEvents);
    game.changed();
    game.island.groundKey = '';
    if (this.modal) this.modal.close();
    game.island.focusOn(r.zone.x + r.zone.w / 2, r.zone.y + r.zone.h / 2);
  },

  openExpand(zoneId) {
    const next = actions.nextZone(game.state);
    if (!next) return;
    if (zoneId !== next.id) {
      toast('Unlock the previous area first');
      this.open('island');
      return;
    }
    this.open('island');
  },
};
