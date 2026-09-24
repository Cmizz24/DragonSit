import { game } from '../game.js';
import { DRAGONS, RARITY } from '../data/dragons.js';
import { ELEMENTS, elementBadge } from '../data/elements.js';
import { dragonSVG, eggSVG, mysteryEggSVG } from '../art/dragon.js';
import * as actions from '../actions.js';
import * as eco from '../economy.js';
import { breedOutcomes, BREED_MIN_LEVEL } from '../breeding.js';
import { openModal, bindActions, toast, ICON, bar } from './ui.js';
import { fmt, fmtTime, now, escapeHtml } from '../util.js';
import { sfx } from '../audio.js';

export const breedPanel = {
  modal: null,
  a: null,
  b: null,
  unsub: null,

  open() {
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: 'Breeding Mountain',
      full: true,
      onMount: (m) => bindActions(m.body, {
        pick: (d) => this.choose(d.slot),
        clear: (d) => { this[d.slot] = null; this.render(); },
        breed: () => this.breed(),
        collect: () => this.collect(),
        speed: () => this.speed(),
        shop: () => { m.close(); game.panels.shop.open('buildings'); },
        dragons: () => { m.close(); game.panels.dragons.open('mine'); },
      }),
      onClose: () => {
        this.modal = null;
        if (this.unsub) this.unsub();
        this.unsub = null;
      },
    });
    this.unsub = game.on((evt) => { if (evt === 'tick') this.tick(); });
    this.render();
  },

  render() {
    const m = this.modal;
    if (!m) return;
    const st = game.state;
    if (!actions.breedingMountain(st)) {
      m.body.innerHTML = `<div class="card center-text"><p class="dialog-text">Build the Breeding Mountain to pair your dragons and discover new species.</p><button class="btn primary" data-action="shop">Open shop</button></div>`;
      return;
    }
    if (st.breeding) {
      const br = st.breeding;
      const da = st.dragons.find((d) => d.id === br.a);
      const db = st.dragons.find((d) => d.id === br.b);
      const done = now() >= br.doneAt;
      m.body.innerHTML = `<div class="breed-stage">
        <div class="parent">${da ? dragonSVG(da.species, eco.dragonStage(da.level), { size: 90, facing: 'right' }) : ''}<div class="cap">${da ? escapeHtml(da.name) : '?'}</div></div>
        <div class="heart-big ${done ? '' : 'pulse'}">${done ? eggSVG(br.species, { size: 70 }) : ICON.heart}</div>
        <div class="parent">${db ? dragonSVG(db.species, eco.dragonStage(db.level), { size: 90 }) : ''}<div class="cap">${db ? escapeHtml(db.name) : '?'}</div></div>
      </div>
      <div class="card center-text">
        ${done ? `<p class="dialog-text">An egg has appeared! Move it to the Hatchery to see what hatches.</p><button class="btn primary wide" data-action="collect" ${actions.freeEggSlots(st) <= 0 ? 'disabled' : ''}>Move egg to Hatchery</button>${actions.freeEggSlots(st) <= 0 ? '<p class="hint">The Hatchery is full. Hatch or upgrade first.</p>' : ''}`
          : `<div class="timer" data-done="${br.doneAt}">${fmtTime(br.doneAt - now())}</div>${bar(now() - br.startedAt, br.doneAt - br.startedAt, 'time')}<button class="btn ghost wide" data-action="speed">${ICON.gem} Finish now (${actions.speedUpCost(br)})</button>`}
      </div>`;
      return;
    }
    const slot = (key) => {
      const d = this[key];
      if (!d) return `<button class="parent pick" data-action="pick" data-slot="${key}"><div class="plus">+</div><div class="cap">Choose dragon</div></button>`;
      return `<button class="parent" data-action="pick" data-slot="${key}">${dragonSVG(d.species, eco.dragonStage(d.level), { size: 90, facing: key === 'a' ? 'right' : 'left' })}<div class="cap">${escapeHtml(d.name)} <span class="muted">Lv ${d.level}</span></div><div class="badges center">${DRAGONS[d.species].elements.map((e) => elementBadge(e, 12)).join('')}</div></button>`;
    };
    let outcomes = '';
    if (this.a && this.b) {
      const list = breedOutcomes(this.a.species, this.b.species).slice(0, 10);
      outcomes = `<h3 class="group-title">Possible offspring</h3><div class="outcomes">${list.map((o) => {
        const sp = DRAGONS[o.species];
        const known = st.discovered.includes(o.species);
        return `<div class="outcome ${known ? '' : 'unknown'}"><div class="thumb">${dragonSVG(o.species, 'baby', { size: 48 })}</div><div class="info"><div class="name">${known ? sp.name : '???'} <span class="rarity" style="color:${RARITY[sp.rarity].color}">${RARITY[sp.rarity].name}</span></div><div class="badges">${sp.elements.map((e) => elementBadge(e, 12)).join('')} <span class="muted">${(o.chance * 100).toFixed(o.chance < 0.1 ? 1 : 0)}%</span></div></div></div>`;
      }).join('')}</div>`;
    }
    const eligible = st.dragons.filter((d) => d.level >= BREED_MIN_LEVEL).length;
    m.body.innerHTML = `<div class="breed-stage">${slot('a')}<div class="heart-big">${ICON.heart}</div>${slot('b')}</div>
      <div class="row center"><button class="btn primary wide" data-action="breed" ${this.a && this.b ? '' : 'disabled'}>Breed</button></div>
      ${eligible < 2 ? `<p class="hint center-text">Dragons must be level ${BREED_MIN_LEVEL}+ to breed. Feed them at their habitat. <button class="link" data-action="dragons">My dragons</button></p>` : ''}
      ${outcomes}
      <p class="hint">Offspring inherit elements from both parents. Rare hybrids, Epic three-element dragons and Legendaries get likelier with rarer parents.</p>`;
  },

  choose(slotKey) {
    const st = game.state;
    const other = slotKey === 'a' ? this.b : this.a;
    const list = st.dragons.filter((d) => !other || d.id !== other.id).sort((x, y) => y.level - x.level);
    const m = openModal({
      title: 'Choose a parent',
      html: list.length === 0 ? '<p class="dialog-text">No dragons available.</p>' : list.map((d) => {
        const ok = d.level >= BREED_MIN_LEVEL;
        const sp = DRAGONS[d.species];
        return `<button class="list-item tappable" data-action="sel" data-id="${d.id}" ${ok ? '' : 'disabled'}>
          <div class="thumb">${dragonSVG(d.species, eco.dragonStage(d.level), { size: 60 })}</div>
          <div class="info"><div class="name">${escapeHtml(d.name)} <span class="muted">Lv ${d.level}</span></div><div class="badges">${sp.elements.map((e) => elementBadge(e, 14)).join('')} <span class="muted">${sp.name}</span></div>${ok ? '' : `<div class="meta bad">Needs level ${BREED_MIN_LEVEL}</div>`}</div><span class="chev">›</span></button>`;
      }).join(''),
      onMount: (mm) => bindActions(mm.body, {
        sel: (d) => {
          this[slotKey] = st.dragons.find((x) => x.id === d.id);
          mm.close();
          this.render();
        },
      }),
    });
  },

  breed() {
    const st = game.state;
    const r = actions.startBreeding(st, this.a, this.b);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('breed');
    toast('Breeding started!', 'good');
    this.a = null;
    this.b = null;
    game.changed();
    this.render();
  },

  collect() {
    const r = actions.collectBreeding(game.state);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('reward');
    toast('Egg moved to the Hatchery', 'good');
    game.changed();
    this.render();
  },

  speed() {
    const st = game.state;
    if (!st.breeding) return;
    const r = actions.speedUp(st, st.breeding);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('reward');
    game.changed();
    this.render();
  },

  tick() {
    const m = this.modal;
    if (!m) return;
    let rerender = false;
    m.body.querySelectorAll('[data-done]').forEach((el) => {
      const rem = +el.dataset.done - now();
      if (rem <= 0) rerender = true;
      else el.textContent = fmtTime(rem);
    });
    if (rerender) this.render();
  },
};
