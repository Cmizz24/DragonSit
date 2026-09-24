import { game } from '../game.js';
import { DRAGON_LIST, DRAGONS, RARITY } from '../data/dragons.js';
import { ELEMENTS, elementBadge, ELEMENT_ORDER } from '../data/elements.js';
import { dragonSVG } from '../art/dragon.js';
import * as actions from '../actions.js';
import * as eco from '../economy.js';
import { movesFor } from '../battle.js';
import { openModal, bindActions, tabs, cost, toast, ICON, confirmDialog, promptDialog, bar } from './ui.js';
import { fmt, escapeHtml } from '../util.js';
import { sfx } from '../audio.js';

export const dragonsPanel = {
  modal: null,
  tab: 'mine',

  open(tab = 'mine') {
    this.tab = tab;
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: 'Dragons',
      full: true,
      onMount: (m) => bindActions(m.body, {
        dragon: (d) => this.openDragon(d.id),
        species: (d) => this.openSpecies(d.id),
      }),
      onClose: () => { this.modal = null; },
    });
    this.render();
  },

  render() {
    const m = this.modal;
    if (!m) return;
    m.body.innerHTML = `<div class="tabs"><button class="tab ${this.tab === 'mine' ? 'active' : ''}" data-tab="mine">My Dragons</button><button class="tab ${this.tab === 'book' ? 'active' : ''}" data-tab="book">Dragon Book</button></div><div class="tab-body" id="dragons-body"></div>`;
    tabs(m.body, (t) => { this.tab = t; this.renderTab(); });
    this.renderTab();
  },

  renderTab() {
    const st = game.state;
    const body = this.modal.body.querySelector('#dragons-body');
    if (this.tab === 'mine') {
      const list = [...st.dragons].sort((a, b) => b.level - a.level);
      body.innerHTML = `<p class="hint">${list.length} dragon${list.length === 1 ? '' : 's'} · level cap ${eco.levelCap(st)}</p>` + list.map((d) => {
        const sp = DRAGONS[d.species];
        const hab = st.buildings.find((b) => b.id === d.habitat);
        return `<button class="list-item tappable" data-action="dragon" data-id="${d.id}">
          <div class="thumb">${dragonSVG(d.species, eco.dragonStage(d.level), { size: 72 })}</div>
          <div class="info">
            <div class="name">${escapeHtml(d.name)} <span class="muted">Lv ${d.level}</span></div>
            <div class="badges">${sp.elements.map((e) => elementBadge(e, 14)).join('')} <span class="rarity" style="color:${RARITY[sp.rarity].color}">${sp.name}</span></div>
            <div class="meta">${ICON.gold} ${fmt(eco.dragonGoldRate(d))}/min · ${hab ? `${ELEMENTS[hab.element].name} Habitat` : 'No home'}</div>
          </div>
          <span class="chev">›</span>
        </button>`;
      }).join('');
      return;
    }
    const groups = ['common', 'rare', 'epic', 'legendary'];
    body.innerHTML = `<p class="hint">Discovered ${st.discovered.length} of ${DRAGON_LIST.length} species.</p>` + groups.map((r) => {
      const list = DRAGON_LIST.filter((d) => d.rarity === r);
      return `<h3 class="group-title" style="color:${RARITY[r].color}">${RARITY[r].name}</h3><div class="grid-book">${list.map((d) => {
        const known = st.discovered.includes(d.id);
        return `<button class="book-cell ${known ? '' : 'unknown'}" data-action="species" data-id="${d.id}">
          <div class="thumb">${dragonSVG(d.id, 'adult', { size: 64 })}</div>
          <div class="cell-name">${known ? d.name.replace(' Dragon', '') : '???'}</div>
          <div class="badges center">${d.elements.map((e) => elementBadge(e, 12)).join('')}</div>
        </button>`;
      }).join('')}</div>`;
    }).join('');
  },

  openSpecies(id) {
    const st = game.state;
    const sp = DRAGONS[id];
    const known = st.discovered.includes(id);
    const hint = sp.elements.length === 1 ? (sp.cost ? `Buy in the shop for ${eco.costLabel(sp.cost)} (level ${sp.unlock}).` : 'Breed two Legendary or Epic dragons.')
      : sp.rarity === 'legendary' ? 'Breed two Epic or Legendary dragons for a chance at this one.'
        : `Breed dragons that together cover ${sp.elements.map((e) => ELEMENTS[e].name).join(' + ')}.`;
    const stats = eco.dragonStats(id, 1);
    openModal({
      title: known ? sp.name : 'Unknown dragon',
      cls: 'center',
      html: `<div class="dragon-hero ${known ? '' : 'unknown'}">${dragonSVG(id, 'adult', { size: 160 })}</div>
        <div class="badges center">${sp.elements.map((e) => elementBadge(e, 18)).join('')} <span class="rarity" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span></div>
        <p class="dialog-text">${known ? sp.desc : 'You have not discovered this dragon yet.'}</p>
        <p class="hint">${hint}</p>
        ${known ? `<div class="stat-grid"><div>HP <b>${stats.hp}</b></div><div>ATK <b>${stats.atk}</b></div><div>DEF <b>${stats.def}</b></div><div>SPD <b>${stats.spd}</b></div><div>Gold <b>${sp.goldRate}/min</b></div><div>Breed <b>${Math.round(sp.breedTime / 60000)}m</b></div></div>` : ''}`,
    });
  },

  openDragon(id) {
    const st = game.state;
    const dragon = st.dragons.find((d) => d.id === id);
    if (!dragon) return;
    const modal = openModal({
      title: '',
      full: true,
      onMount: (m) => bindActions(m.body, {
        feed: () => this.feed(dragon, m),
        rename: async () => {
          const name = await promptDialog('Rename dragon', dragon.name, 'Name');
          if (name == null) return;
          const r = actions.renameDragon(st, dragon, name);
          if (!r.ok) toast(r.error, 'bad');
          else { this.renderDragon(dragon, m); game.changed(); if (this.modal) this.renderTab(); }
        },
        move: () => this.chooseHabitat(dragon, m),
        sell: async () => {
          const value = eco.sellValueDragon(dragon);
          const ok = await confirmDialog('Sell dragon', `Sell ${escapeHtml(dragon.name)} for ${fmt(value)} gold? This cannot be undone.`, 'Sell', true);
          if (!ok) return;
          const r = actions.sellDragon(st, dragon);
          if (!r.ok) { toast(r.error, 'bad'); return; }
          sfx.play('coin');
          toast(`Sold for ${fmt(r.value)} gold`, 'good');
          m.close();
          game.changed();
          if (this.modal) this.renderTab();
        },
        goto: () => {
          const hab = st.buildings.find((b) => b.id === dragon.habitat);
          if (hab) { game.island.focusOn(hab.x, hab.y, hab.size); m.close(); if (this.modal) this.modal.close(); }
        },
      }),
    });
    this.renderDragon(dragon, modal);
  },

  renderDragon(dragon, modal) {
    const st = game.state;
    const sp = DRAGONS[dragon.species];
    const stats = eco.dragonStats(dragon.species, dragon.level);
    const cap = eco.levelCap(st);
    const foodCost = eco.foodForLevel(dragon.level);
    const hab = st.buildings.find((b) => b.id === dragon.habitat);
    const moves = movesFor(dragon.species);
    modal.setTitle(`${escapeHtml(dragon.name)} <button class="icon-btn tiny" data-action="rename" aria-label="Rename">✎</button>`);
    modal.body.innerHTML = `
      <div class="dragon-hero">${dragonSVG(dragon.species, eco.dragonStage(dragon.level), { size: 170 })}</div>
      <div class="badges center">${sp.elements.map((e) => elementBadge(e, 18)).join('')} <span class="rarity" style="color:${RARITY[sp.rarity].color}">${sp.name} · ${RARITY[sp.rarity].name}</span></div>
      <div class="level-row"><b>Level ${dragon.level}</b> <span class="muted">/ ${cap}</span> · <span class="muted">${eco.dragonStage(dragon.level)}</span></div>
      <div class="stat-grid"><div>HP <b>${stats.hp}</b></div><div>ATK <b>${stats.atk}</b></div><div>DEF <b>${stats.def}</b></div><div>SPD <b>${stats.spd}</b></div><div>Gold <b>${fmt(eco.dragonGoldRate(dragon))}/min</b></div><div>Home <b>${hab ? ELEMENTS[hab.element].name : '—'}</b></div></div>
      <div class="card">
        <div class="row between"><b>Feed</b> <span class="muted">${dragon.level >= cap ? 'Level cap reached' : `Next level: ${cost({ food: foodCost }, st)}`}</span></div>
        <div class="row gap">
          <button class="btn primary grow" data-action="feed" ${dragon.level >= cap || st.player.food < foodCost ? 'disabled' : ''}>${ICON.food} Feed (${fmt(foodCost)})</button>
        </div>
        ${dragon.level >= cap && cap < 30 ? '<p class="hint">Build a Temple to raise the level cap.</p>' : ''}
        ${dragon.level < 3 ? '<p class="hint">Dragons can breed from level 3.</p>' : ''}
      </div>
      <div class="card"><b>Battle moves</b><div class="moves-list">${moves.map((mv) => `<div class="move-chip">${mv.el ? elementBadge(mv.el, 14) : '<span class="elbadge phys">•</span>'} ${mv.name} <span class="muted">${mv.power}</span></div>`).join('')}</div></div>
      <p class="hint">${sp.desc}</p>
      <div class="row gap wrap">
        <button class="btn ghost" data-action="goto">Find on island</button>
        <button class="btn ghost" data-action="move">Move home</button>
        <button class="btn danger ghost" data-action="sell">Sell (${fmt(eco.sellValueDragon(dragon))})</button>
      </div>`;
  },

  feed(dragon, modal) {
    const r = actions.feedDragon(game.state, dragon);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('feed');
    if (r.level === 4 || r.level === 10) toast(`${escapeHtml(dragon.name)} grew up!`, 'good');
    game.levelUp(r.xpEvents);
    game.changed();
    this.renderDragon(dragon, modal);
    if (this.modal) this.renderTab();
  },

  chooseHabitat(dragon, parentModal) {
    const st = game.state;
    const habs = actions.habitatsFor(st, dragon.species).filter((b) => b.id !== dragon.habitat);
    if (habs.length === 0) {
      toast(`Build another ${DRAGONS[dragon.species].elements.map((e) => ELEMENTS[e].name).join(' or ')} habitat first`, 'bad');
      return;
    }
    const m = openModal({
      title: 'Choose a habitat',
      html: habs.map((b) => {
        const capN = eco.habitatCapacity(b);
        const full = b.dragons.length >= capN;
        return `<button class="list-item tappable" data-action="pick" data-id="${b.id}" ${full ? 'disabled' : ''}>
          <div class="info"><div class="name">${ELEMENTS[b.element].name} Habitat <span class="muted">Lv ${b.level}</span></div><div class="meta">${b.dragons.length}/${capN} dragons ${full ? '· Full' : ''}</div></div><span class="chev">›</span></button>`;
      }).join(''),
      onMount: (mm) => bindActions(mm.body, {
        pick: (d) => {
          const r = actions.moveDragon(st, dragon, d.id);
          if (!r.ok) { toast(r.error, 'bad'); return; }
          toast('Moved!', 'good');
          mm.close();
          game.changed();
          this.renderDragon(dragon, parentModal);
        },
      }),
    });
  },
};
