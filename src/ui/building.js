import { game } from '../game.js';
import { BUILDINGS, FOOD_OPTIONS } from '../data/buildings.js';
import { DRAGONS } from '../data/dragons.js';
import { ELEMENTS, elementBadge } from '../data/elements.js';
import { eggSVG, mysteryEggSVG } from '../art/dragon.js';
import { dragonImgHtml } from '../art/sprites.js';
import * as actions from '../actions.js';
import * as eco from '../economy.js';
import { openModal, bindActions, cost, toast, ICON, confirmDialog, bar, infoDialog } from './ui.js';
import { fmt, fmtTime, now, escapeHtml } from '../util.js';
import { sfx } from '../audio.js';

export const buildingPanel = {
  modal: null,
  building: null,
  unsub: null,

  open(b) {
    if (b.type === 'breeding') {
      game.panels.breed.open();
      return;
    }
    this.building = b;
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: '',
      onMount: (m) => bindActions(m.body, {
        collect: () => this.collect(),
        collectmine: () => {
          const r = actions.collectMine(game.state, this.building);
          if (r.amount > 0) { sfx.play('reward'); toast(`${ICON.gem} +${r.amount} gems`, 'good'); game.changed(); this.render(); }
        },
        upgrade: () => this.upgrade(),
        move: () => { m.close(); game.panels.placement.start(this.building.def, this.building); },
        sell: () => this.sell(),
        dragon: (d) => game.panels.dragons.openDragon(d.id),
        grow: (d) => this.grow(d.id),
        harvest: () => this.harvest(),
        speed: (d) => this.speed(d.kind, d.id),
        hatch: (d) => this.hatch(d.id),
        shop: (d) => { m.close(); game.panels.shop.open(d.tab || 'habitats'); },
        info: () => infoDialog(BUILDINGS[this.building.def].name, `<p class="dialog-text">${BUILDINGS[this.building.def].desc}</p>`),
      }),
      onClose: () => {
        this.modal = null;
        game.island.selectedId = null;
        if (this.unsub) this.unsub();
        this.unsub = null;
      },
    });
    this.unsub = game.on((evt) => { if (evt === 'tick') this.tick(); });
    this.render();
  },

  render() {
    const m = this.modal;
    const b = this.building;
    if (!m || !b) return;
    const def = BUILDINGS[b.def];
    const st = game.state;
    const maxLvl = eco.maxBuildingLevel(b.def);
    m.setTitle(`${def.name} ${maxLvl > 1 ? `<span class="muted">Lv ${b.level}</span>` : ''}`);
    let html = '';
    if (b.type === 'habitat') html = this.habitatHtml(b, def, st);
    else if (b.type === 'farm') html = this.farmHtml(b, def, st);
    else if (b.type === 'hatchery') html = this.hatcheryHtml(b, def, st);
    else if (b.type === 'mine') html = this.mineHtml(b, def, st);
    else html = `<p class="dialog-text">${def.desc}</p>`;
    const up = eco.upgradeCost(b);
    html += `<div class="row gap wrap actions-row">
      ${up != null ? `<button class="btn primary" data-action="upgrade" ${st.player.gold < up ? 'disabled' : ''}>Upgrade ${cost({ gold: up }, st)}</button>` : ''}
      <button class="btn ghost" data-action="move">Move</button>
      ${['hatchery', 'temple'].includes(b.type) ? '' : `<button class="btn ghost danger" data-action="sell">Sell (${fmt(eco.sellValueBuilding(b))})</button>`}
    </div>`;
    m.body.innerHTML = html;
  },

  habitatHtml(b, def, st) {
    const capN = eco.habitatCapacity(b);
    const goldCap = eco.habitatGoldCap(b);
    const rate = eco.habitatRate(st, b);
    const dragons = b.dragons.map((id) => st.dragons.find((d) => d.id === id)).filter(Boolean);
    let html = `<div class="card">
      <div class="row between"><span>${ICON.gold} <b>${fmt(b.gold)}</b> <span class="muted">/ ${fmt(goldCap)}</span></span><span class="muted">+${fmt(rate)}/min</span></div>
      ${bar(b.gold, goldCap, 'gold')}
      <button class="btn primary wide" data-action="collect" ${b.gold < 1 ? 'disabled' : ''}>Collect ${fmt(b.gold)} gold</button>
    </div>
    <h3 class="group-title">Dragons <span class="muted">${dragons.length}/${capN}</span></h3>`;
    html += dragons.map((d) => `<button class="list-item tappable" data-action="dragon" data-id="${d.id}">
      <div class="thumb">${dragonImgHtml(d.species, eco.dragonStage(d.level), { size: 64, stars: d.stars || 0 })}</div>
      <div class="info"><div class="name">${escapeHtml(d.name)} <span class="muted">Lv ${d.level}</span></div><div class="meta">${DRAGONS[d.species].name} · ${fmt(eco.dragonGoldRate(d))}/min</div></div><span class="chev">›</span></button>`).join('');
    for (let i = dragons.length; i < capN; i++) html += `<button class="list-item tappable empty" data-action="shop" data-tab="dragons"><div class="info"><div class="name muted">Empty nest</div><div class="meta">Buy or breed a ${ELEMENTS[b.element].name} dragon</div></div></button>`;
    if (b.level < 3) html += `<p class="hint">Upgrading adds room for another dragon and raises the gold cap.</p>`;
    return html;
  },

  mineHtml(b, def, st) {
    const cap = actions.mineCap(b);
    const perHour = eco.mineGemsPerHour(b);
    return `<div class="card">
      <div class="row between"><span>${ICON.gem} <b>${Math.floor(b.gems)}</b> <span class="muted">/ ${cap}</span></span><span class="muted">1 gem every ${Math.round(1 / perHour)}h</span></div>
      ${bar(b.gems, cap, 'time')}
      <div class="meta">Next gem in ${fmtTime(((1 - (b.gems % 1)) / perHour) * 3600000)}</div>
      <button class="btn primary wide" data-action="collectmine" ${b.gems < 1 ? 'disabled' : ''}>Collect ${Math.floor(b.gems)} gem${Math.floor(b.gems) === 1 ? '' : 's'}</button>
    </div><p class="hint">Upgrading digs faster and stores more gems.</p>`;
  },

  farmHtml(b, def, st) {
    if (b.growing) {
      const opt = FOOD_OPTIONS.find((f) => f.id === b.growing.food);
      const done = now() >= b.growing.doneAt;
      return `<div class="card center-text">
        <div class="big-icon">${ICON.food}</div>
        <div class="name">${opt.name} <span class="muted">→ ${fmt(opt.food)} food</span></div>
        ${done ? `<button class="btn primary wide" data-action="harvest">Harvest ${fmt(opt.food)} food</button>` : `
          <div class="timer" data-done="${b.growing.doneAt}">${fmtTime(b.growing.doneAt - now())}</div>
          ${bar(now() - b.growing.startedAt, b.growing.doneAt - b.growing.startedAt, 'time')}
          <button class="btn ghost wide" data-action="speed" data-kind="farm">${ICON.gem} Finish now (${actions.speedUpCost(b.growing)})</button>`}
      </div>`;
    }
    const opts = FOOD_OPTIONS;
    return `<p class="hint">Grow crops to earn food. Feeding dragons levels them up.</p>` + opts.map((o) => {
      const locked = o.unlock > b.level;
      return `<div class="list-item ${locked ? 'locked' : ''}">
        <div class="info"><div class="name">${o.name}</div><div class="meta">${ICON.food} ${fmt(o.food)} · ${ICON.clock} ${fmtTime(o.time * 1000)}</div></div>
        <button class="btn small" data-action="grow" data-id="${o.id}" ${locked || st.player.gold < o.cost ? 'disabled' : ''}>${locked ? `Farm Lv ${o.unlock}` : cost({ gold: o.cost }, st)}</button>
      </div>`;
    }).join('');
  },

  hatcheryHtml(b, def, st) {
    const slots = eco.hatcherySlots(b);
    let html = `<p class="hint">Eggs from the shop and the Breeding Mountain hatch here.</p>`;
    html += st.eggs.map((e) => {
      const sp = DRAGONS[e.species];
      const known = st.discovered.includes(e.species) || e.source === 'shop';
      const done = now() >= e.doneAt;
      return `<div class="list-item">
        <div class="thumb egg">${eggSVG(e.species, { size: 46 })}</div>
        <div class="info"><div class="name">${known ? sp.name : 'Mystery egg'}</div>
          <div class="badges">${known ? sp.elements.map((el) => elementBadge(el, 14)).join('') : `<span class="muted">${sp.elements.length > 1 ? 'Hybrid' : 'Pure'} egg</span>`}</div>
          <div class="meta">${done ? 'Ready to hatch!' : `<span class="timer" data-done="${e.doneAt}">${fmtTime(e.doneAt - now())}</span>`}</div></div>
        ${done ? `<button class="btn small primary" data-action="hatch" data-id="${e.id}">Hatch</button>` : `<button class="btn small ghost" data-action="speed" data-kind="egg" data-id="${e.id}">${ICON.gem} ${actions.speedUpCost(e)}</button>`}
      </div>`;
    }).join('');
    for (let i = st.eggs.length; i < slots; i++) html += `<button class="list-item tappable empty" data-action="shop" data-tab="dragons"><div class="thumb egg">${mysteryEggSVG(46).replace('#6c6f80', '#3a4a5c').replace('?', '+')}</div><div class="info"><div class="name muted">Empty nest</div><div class="meta">Buy a dragon egg</div></div></button>`;
    return html;
  },

  tick() {
    const m = this.modal;
    if (!m) return;
    let needsRender = false;
    m.body.querySelectorAll('[data-done]').forEach((el) => {
      const rem = +el.dataset.done - now();
      if (rem <= 0) needsRender = true;
      else el.textContent = fmtTime(rem);
    });
    if (needsRender) this.render();
    // keep habitat gold live
    if (this.building.type === 'habitat') {
      const btn = m.body.querySelector('[data-action="collect"]');
      if (btn) {
        btn.textContent = `Collect ${fmt(this.building.gold)} gold`;
        btn.disabled = this.building.gold < 1;
      }
      const fill = m.body.querySelector('.bar.gold .bar-fill');
      if (fill) fill.style.width = `${Math.min(100, (this.building.gold / eco.habitatGoldCap(this.building)) * 100).toFixed(1)}%`;
      const bold = m.body.querySelector('.card .row b');
      if (bold) bold.textContent = fmt(this.building.gold);
    }
  },

  collect() {
    const b = this.building;
    const r = actions.collectHabitat(game.state, b);
    if (r.amount > 0) {
      sfx.play('coin');
      game.island.floatText(b.x + b.size / 2, b.y + b.size / 2, `+${fmt(r.amount)}`, '#ffd54f');
      game.changed();
      this.render();
    }
  },

  upgrade() {
    const r = actions.upgradeBuilding(game.state, this.building);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('build');
    toast(`${BUILDINGS[this.building.def].name} upgraded to level ${this.building.level}!`, 'good');
    game.levelUp(r.xpEvents);
    game.changed();
    this.render();
  },

  async sell() {
    const b = this.building;
    const ok = await confirmDialog('Sell building', `Sell ${BUILDINGS[b.def].name} for ${fmt(eco.sellValueBuilding(b))} gold?`, 'Sell', true);
    if (!ok) return;
    const r = actions.sellBuilding(game.state, b);
    if (!r.ok) { toast(r.error, 'bad'); return; }
    sfx.play('coin');
    toast(`Sold for ${fmt(r.value)} gold`, 'good');
    this.modal.close();
    game.changed();
  },

  grow(foodId) {
    const r = actions.startGrow(game.state, this.building, foodId);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('build');
    game.changed();
    this.render();
  },

  harvest() {
    const b = this.building;
    const r = actions.collectFarm(game.state, b);
    if (!r.ok) { toast(r.error, 'bad'); return; }
    sfx.play('feed');
    game.island.floatText(b.x + b.size / 2, b.y + b.size / 2, `+${fmt(r.food)} food`, '#ff8a65');
    game.levelUp(r.xpEvents);
    game.changed();
    this.render();
  },

  speed(kind, id) {
    const st = game.state;
    const target = kind === 'farm' ? this.building.growing : st.eggs.find((e) => e.id === id);
    if (!target) return;
    const r = actions.speedUp(st, target);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('reward');
    game.changed();
    this.render();
  },

  hatch(eggId) {
    const st = game.state;
    const egg = st.eggs.find((e) => e.id === eggId);
    if (!egg) return;
    const sp = DRAGONS[egg.species];
    const habs = actions.habitatsWithRoom(st, egg.species);
    if (habs.length === 0) {
      const names = sp.elements.map((e) => ELEMENTS[e].name).join(' or ');
      toast(`You need a ${names} habitat with a free nest`, 'bad', 3000);
      return;
    }
    const doHatch = (habId) => {
      const r = actions.hatchEgg(st, eggId, habId);
      if (!r.ok) { toast(r.error, 'bad'); return; }
      sfx.play('hatch');
      const hab = st.buildings.find((b) => b.id === habId);
      game.island.floatText(hab.x + hab.size / 2, hab.y + hab.size / 2, 'Hatched!', '#fff');
      game.levelUp(r.xpEvents);
      game.changed();
      this.render();
      openModal({
        title: r.isNew ? 'New species discovered!' : 'It hatched!',
        cls: 'center celebrate',
        html: `<div class="dragon-hero">${dragonImgHtml(egg.species, 'baby', { size: 160, eager: true })}</div>
          <h3 class="center-text">${sp.name}</h3>
          <div class="badges center">${sp.elements.map((e) => elementBadge(e, 18)).join('')}</div>
          <p class="dialog-text">${sp.desc}</p>
          <div class="row center"><button class="btn primary" data-action="ok">Welcome!</button></div>`,
        onMount: (m) => bindActions(m.body, { ok: () => m.close() }),
      });
    };
    if (habs.length === 1) {
      doHatch(habs[0].id);
      return;
    }
    openModal({
      title: 'Choose a home',
      html: habs.map((b) => `<button class="list-item tappable" data-action="pick" data-id="${b.id}"><div class="info"><div class="name">${ELEMENTS[b.element].name} Habitat <span class="muted">Lv ${b.level}</span></div><div class="meta">${b.dragons.length}/${eco.habitatCapacity(b)} dragons</div></div><span class="chev">›</span></button>`).join(''),
      onMount: (m) => bindActions(m.body, { pick: (d) => { m.close(); doHatch(d.id); } }),
    });
  },
};
