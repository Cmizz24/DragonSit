import { game } from '../game.js';
import { DRAGONS, RARITY } from '../data/dragons.js';
import { ELEMENTS, elementBadge, elementMultiplier } from '../data/elements.js';
import { CAMPAIGN_STAGES, STAGE_COUNT, heroicStage, leagueFor, LEAGUES, towerFloor } from '../data/campaign.js';
import { dragonSVG } from '../art/dragon.js';
import * as actions from '../actions.js';
import * as eco from '../economy.js';
import { createBattle, playRound, unitsFromDragons, unitsFromTeam, makeArenaOpponent, describeMultiplier } from '../battle.js';
import { openModal, bindActions, tabs, toast, ICON, confirmDialog, bar, rewardHtml } from './ui.js';
import { fmt, fmtTime, now, escapeHtml } from '../util.js';
import { sfx } from '../audio.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const battlePanel = {
  modal: null,
  tab: 'campaign',
  arenaOpp: null,
  unsub: null,
  battle: null,
  busy: false,

  open(tab = 'campaign') {
    this.tab = tab;
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: 'Battle',
      full: true,
      onMount: (m) => bindActions(m.body, {
        stage: (d) => this.prepare({ mode: 'campaign', stageId: +d.id, heroic: game.state.battle.heroic }),
        heroic: (d) => { game.state.battle.heroic = d.on === '1'; this.renderTab(); },
        arena: () => this.prepare({ mode: 'arena' }),
        skip: () => this.skipCooldown(),
        reroll: () => { this.arenaOpp = null; this.renderTab(); },
        towerstart: () => this.prepare({ mode: 'tower' }),
        towercontinue: () => this.fightTower(),
        towerretreat: async () => {
          const r = game.state.tower.run;
          if (!r) return;
          const ok = await confirmDialog('Retreat?', `End this run at floor ${r.floor - 1}? You keep everything you earned.`, 'Retreat');
          if (!ok) return;
          actions.towerRetreat(game.state);
          game.changed();
          this.renderTab();
        },
        towerweekly: () => {
          const r = actions.claimTowerWeekly(game.state);
          if (!r.ok) { toast(r.error, 'bad'); return; }
          sfx.play('reward');
          toast(`Weekly chest: ${rewardHtml(r.reward)}`, 'good', 3000);
          game.levelUp(r.xpEvents);
          game.changed();
          this.renderTab();
        },
      }),
      onClose: () => {
        this.modal = null;
        if (this.unsub) this.unsub();
        this.unsub = null;
      },
    });
    this.unsub = game.on((evt) => { if (evt === 'tick' && this.tab === 'arena') this.tickArena(); });
    this.render();
  },

  render() {
    const m = this.modal;
    if (!m) return;
    m.body.innerHTML = `<div class="tabs"><button class="tab ${this.tab === 'campaign' ? 'active' : ''}" data-tab="campaign">Campaign</button><button class="tab ${this.tab === 'arena' ? 'active' : ''}" data-tab="arena">Arena</button><button class="tab ${this.tab === 'tower' ? 'active' : ''}" data-tab="tower">Tower</button></div><div class="tab-body" id="battle-body"></div>`;
    tabs(m.body, (t) => { this.tab = t; this.renderTab(); });
    this.renderTab();
  },

  renderTab() {
    const st = game.state;
    const body = this.modal.body.querySelector('#battle-body');
    if (!body) return;
    if (this.tab === 'campaign') this.renderCampaign(body, st);
    else if (this.tab === 'tower') this.renderTower(body, st);
    else this.renderArena(body, st);
  },

  renderCampaign(body, st) {
    const heroicUnlocked = st.battle.campaignCleared >= STAGE_COUNT;
    const heroic = heroicUnlocked && st.battle.heroic;
    const cleared = heroic ? st.battle.heroicCleared : st.battle.campaignCleared;
    let html = heroicUnlocked ? `<div class="row gap" style="margin-bottom:8px"><button class="btn small grow ${heroic ? '' : 'primary'}" data-action="heroic" data-on="0">Normal</button><button class="btn small grow ${heroic ? 'primary' : ''}" data-action="heroic" data-on="1">Heroic</button></div>` : '';
    html += `<p class="hint">${heroic ? 'Heroic: enemies are 10 levels stronger and rewards are tripled.' : 'Clear stages in order. First clears award full rewards; replays give 30%.' + (st.battle.campaignCleared >= 30 ? ' Heroic mode unlocks after stage 60.' : '')}</p>`;
    let lastArea = '';
    const nextIdx = Math.min(cleared, STAGE_COUNT - 1);
    for (const base of CAMPAIGN_STAGES) {
      const s = heroic ? heroicStage(base) : base;
      // Keep the list short: show cleared stages collapsed except the last few.
      if (s.id < cleared - 3) continue;
      if (s.id > cleared + 8) break;
      if (s.area !== lastArea) {
        lastArea = s.area;
        html += `<h3 class="group-title">${s.area}</h3>`;
      }
      const state = s.id <= cleared ? 'done' : s.id === cleared + 1 ? 'next' : 'locked';
      html += `<div class="list-item stage ${state} ${s.boss ? 'boss' : ''}">
        <div class="stage-num">${state === 'done' ? '✓' : s.id}</div>
        <div class="info">
          <div class="name">${s.name}</div>
          <div class="team-preview">${s.team.map((t) => `<span class="mini ${state === 'locked' ? 'dim' : ''}">${dragonSVG(t.species, eco.dragonStage(t.level), { size: 34 })}<i>${t.level}</i></span>`).join('')}</div>
          <div class="meta">${rewardHtml(s.reward)}</div>
        </div>
        <button class="btn small ${state === 'next' ? 'primary' : ''}" data-action="stage" data-id="${s.id}" ${state === 'locked' ? 'disabled' : ''}>${state === 'done' ? 'Replay' : state === 'next' ? 'Fight' : ICON.lock}</button>
      </div>`;
    }
    if (cleared >= STAGE_COUNT) html += `<p class="hint center-text">${heroic ? 'You have conquered Heroic mode. Legendary!' : 'Campaign complete! Try Heroic mode.'}</p>`;
    body.innerHTML = html;
  },

  renderArena(body, st) {
    if (!this.arenaOpp) {
      const top = [...st.dragons].sort((a, b) => b.level - a.level).slice(0, 3).map((d) => d.level);
      this.arenaOpp = makeArenaOpponent(st, top.length ? top : [1]);
    }
    const opp = this.arenaOpp;
    const league = leagueFor(st.battle.trophies);
    const nextLeague = LEAGUES.find((l) => l.min > st.battle.trophies);
    const cooling = now() < st.battle.nextArenaAt;
    body.innerHTML = `<div class="card">
      <div class="row between"><b>${league.name} League</b><span>🏆 ${st.battle.trophies}</span></div>
      ${nextLeague ? bar(st.battle.trophies - league.min, nextLeague.min - league.min, 'time') + `<div class="meta">${nextLeague.min - st.battle.trophies} trophies to ${nextLeague.name}</div>` : '<div class="meta">Top league reached!</div>'}
      <div class="meta">Wins ${st.battle.arenaWins} · Losses ${st.battle.arenaLosses} · Streak ${st.battle.streak}</div>
    </div>
    <div class="card">
      <div class="row between"><b>Opponent: ${opp.name}</b><button class="link" data-action="reroll">New opponent</button></div>
      <div class="team-preview big">${opp.team.map((t) => `<span class="mini">${dragonSVG(t.species, eco.dragonStage(t.level), { size: 56 })}<i>${t.level}</i><em>${DRAGONS[t.species].name.replace(' Dragon', '')}</em></span>`).join('')}</div>
      <div class="meta">Win for ~${fmt(150 + opp.level * 45)} gold, food and trophies. Losing costs 10 trophies.</div>
      ${cooling ? `<div class="row gap"><button class="btn ghost grow" disabled>Rest: <span data-arena-timer>${fmtTime(st.battle.nextArenaAt - now())}</span></button><button class="btn small" data-action="skip">${ICON.gem} ${actions.speedUpCost({ doneAt: st.battle.nextArenaAt })}</button></div>` : `<button class="btn primary wide" data-action="arena">Fight!</button>`}
    </div>
    <p class="hint center-text">Want to fight real people? Add friends in the Friends tab and battle their teams.</p>`;
  },

  renderTower(body, st) {
    actions.ensureTowerWeek(st);
    const run = st.tower.run;
    const weekly = actions.towerWeeklyReward(st);
    const weeklyDone = st.tower.weeklyClaimed === st.tower.weekKey;
    let html = `<div class="card">
      <div class="row between"><b>Dragon Tower</b><span class="muted">Best floor <b>${st.tower.best}</b></span></div>
      <p class="hint">Climb endless floors with one team. Your dragons keep their damage between floors and heal a little after each win. Enemies get stronger every floor.</p>
      <div class="row between"><span>This week's best: <b>${st.tower.weekBest}</b></span>${weeklyDone ? '<span class="tag">Chest claimed</span>' : `<button class="btn small ${st.tower.weekBest >= 5 ? 'primary' : ''}" data-action="towerweekly" ${st.tower.weekBest >= 5 ? '' : 'disabled'}>Weekly chest</button>`}</div>
      <div class="meta">Weekly chest grows with your best floor: ${rewardHtml(weekly)} ${st.tower.weekBest < 5 ? '(reach floor 5)' : ''}</div>
    </div>`;
    if (run) {
      const floor = towerFloor(run.floor);
      const units = actions.towerUnits(st);
      html += `<div class="card">
        <div class="row between"><b>Run in progress</b><span class="muted">Next: floor ${run.floor}${floor.boss ? ' (boss)' : ''}</span></div>
        <div class="team-row left">${units.map((u) => `<div class="team-btn ${u.hp <= 0 ? 'ko' : ''}">${dragonSVG(u.species, eco.dragonStage(u.level), { size: 40 })}<div class="bar hp mini"><div class="bar-fill ${u.hp / u.maxHp > 0.5 ? 'ok' : u.hp / u.maxHp > 0.2 ? 'warn' : 'low'}" style="width:${(u.hp / u.maxHp) * 100}%"></div></div></div>`).join('')}</div>
        <div class="meta">Enemies: ${floor.team.map((t) => `${DRAGONS[t.species].name.replace(' Dragon', '')} L${t.level}`).join(', ')}</div>
        <div class="meta">Floor reward: ${rewardHtml(floor.reward)}</div>
        <div class="row gap"><button class="btn primary grow" data-action="towercontinue" ${units.some((u) => u.hp > 0) ? '' : 'disabled'}>Fight floor ${run.floor}</button><button class="btn ghost" data-action="towerretreat">Retreat</button></div>
      </div>`;
    } else {
      const preview = [1, 2, 3].map((n) => towerFloor(Math.max(1, st.tower.best + n)));
      html += `<div class="card"><b>Start a new run</b><p class="hint">Pick up to 3 dragons. The run starts at floor 1.</p>
        <div class="meta">Upcoming floors near your best: ${preview.map((f) => `F${f.floor} L${Math.round(f.team.reduce((s, t) => s + t.level, 0) / f.team.length)}`).join(' · ')}</div>
        <button class="btn primary wide" data-action="towerstart">Start climbing</button></div>`;
    }
    body.innerHTML = html;
  },

  tickArena() {
    const m = this.modal;
    if (!m) return;
    const el = m.body.querySelector('[data-arena-timer]');
    const st = game.state;
    if (el) {
      const rem = st.battle.nextArenaAt - now();
      if (rem <= 0) this.renderTab();
      else el.textContent = fmtTime(rem);
    }
  },

  skipCooldown() {
    const st = game.state;
    const target = { doneAt: st.battle.nextArenaAt };
    const r = actions.speedUp(st, target);
    if (!r.ok) { toast(r.error, 'bad'); return; }
    st.battle.nextArenaAt = 0;
    game.changed();
    this.renderTab();
  },

  // ---------- team select ----------
  prepare(meta) {
    const st = game.state;
    const ready = actions.battleReady(st);
    if (!ready.ok) { toast(ready.error, 'bad'); return; }
    let enemyTeam, title;
    if (meta.mode === 'campaign') {
      const stage = actions.campaignStageFor(st, meta.stageId, meta.heroic);
      enemyTeam = stage.team;
      title = stage.name;
    } else if (meta.mode === 'friend') {
      const f = st.friends.find((x) => x.id === meta.friendId);
      if (!f) return;
      enemyTeam = f.team.map((t) => ({ ...t }));
      title = `vs ${f.name}`;
      meta.level = Math.round(enemyTeam.reduce((s, t) => s + t.level, 0) / enemyTeam.length);
    } else if (meta.mode === 'tower') {
      if (st.tower.run) { this.fightTower(); return; }
      enemyTeam = towerFloor(1).team;
      title = 'Dragon Tower';
    } else {
      if (now() < st.battle.nextArenaAt) { toast('Your dragons are still resting'); return; }
      enemyTeam = this.arenaOpp.team;
      title = `Arena vs ${this.arenaOpp.name}`;
      meta.level = this.arenaOpp.level;
    }
    meta.title = title;
    const selected = st.battle.lastTeam.filter((id) => st.dragons.some((d) => d.id === id)).slice(0, 3);
    if (selected.length === 0) [...st.dragons].sort((a, b) => b.level - a.level).slice(0, 3).forEach((d) => selected.push(d.id));
    const m = openModal({
      title: meta.mode === 'tower' ? 'Choose your tower team' : 'Choose your team',
      full: true,
      onMount: (mm) => bindActions(mm.body, {
        toggle: (d) => {
          const i = selected.indexOf(d.id);
          if (i >= 0) selected.splice(i, 1);
          else if (selected.length < 3) selected.push(d.id);
          else toast('Max 3 dragons');
          render();
        },
        fight: () => {
          if (selected.length === 0) { toast('Pick at least one dragon', 'bad'); return; }
          st.battle.lastTeam = [...selected];
          mm.close();
          if (this.modal) this.modal.close();
          if (meta.mode === 'tower') {
            const r = actions.towerStart(st, selected);
            if (!r.ok) { toast(r.error, 'bad'); return; }
            game.changed();
            this.fightTower();
            return;
          }
          const team = selected.map((id) => st.dragons.find((d) => d.id === id));
          this.fight(meta, unitsFromDragons(team), unitsFromTeam(enemyTeam));
        },
      }),
    });
    const render = () => {
      const list = [...st.dragons].sort((a, b) => b.level - a.level);
      m.body.innerHTML = `<div class="card"><div class="meta">${meta.mode === 'tower' ? 'Floor 1 enemies (they get stronger every floor)' : 'Enemy team'}</div><div class="team-preview big">${enemyTeam.map((t) => `<span class="mini">${dragonSVG(t.species, eco.dragonStage(t.level), { size: 48 })}<i>${t.level}</i><em>${escapeHtml(t.name || DRAGONS[t.species].name.replace(' Dragon', ''))}</em></span>`).join('')}</div></div>
        <p class="hint">Pick up to 3 dragons (${selected.length}/3). Element advantages deal 1.75x damage.</p>
        ${list.map((d) => {
          const sp = DRAGONS[d.species];
          const idx = selected.indexOf(d.id);
          const adv = enemyTeam.some((t) => sp.elements.some((e) => elementMultiplier(e, DRAGONS[t.species].elements) >= 1.5));
          return `<button class="list-item tappable ${idx >= 0 ? 'selected' : ''}" data-action="toggle" data-id="${d.id}">
            <div class="thumb">${dragonSVG(d.species, eco.dragonStage(d.level), { size: 56 })}</div>
            <div class="info"><div class="name">${escapeHtml(d.name)} <span class="muted">Lv ${d.level}</span> ${starsHtml(d.stars)}</div><div class="badges">${sp.elements.map((e) => elementBadge(e, 14)).join('')} ${adv ? '<span class="tag good">Advantage</span>' : ''}</div></div>
            <span class="pick-mark">${idx >= 0 ? idx + 1 : ''}</span></button>`;
        }).join('')}
        <div class="sticky-bottom"><button class="btn primary wide" data-action="fight">${ICON.swords} ${meta.mode === 'tower' ? 'Start climbing' : 'Fight!'}</button></div>`;
    };
    render();
  },

  fightTower() {
    const st = game.state;
    const run = st.tower.run;
    if (!run) return;
    const units = actions.towerUnits(st);
    if (!units.some((u) => u.hp > 0)) { toast('Your team is knocked out. Retreat to start a new run.', 'bad'); return; }
    const floor = towerFloor(run.floor);
    if (this.modal) this.modal.close();
    this.fight({ mode: 'tower', floor: run.floor, title: floor.name }, units, unitsFromTeam(floor.team));
  },

  // ---------- the battle screen ----------
  fight(meta, playerUnits, enemyUnits) {
    const root = document.getElementById('battle-root');
    const battle = createBattle(playerUnits, enemyUnits, meta);
    this.battle = battle;
    this.busy = false;
    root.hidden = false;
    root.innerHTML = `<div class="battle-screen">
      <div class="battle-head"><span class="title">${escapeHtml(meta.title)}</span><span class="round" data-round>Round 1</span><button class="btn small ghost" data-action="flee">Flee</button></div>
      <div class="battle-field">
        <div class="fighter enemy" data-side="enemy"><div class="hp-box"><div class="hp-name"></div><div class="bar hp"><div class="bar-fill"></div></div><div class="hp-num"></div></div><div class="sprite-wrap"><div class="shadow"></div><div class="sprite"></div></div></div>
        <div class="fighter player" data-side="player"><div class="hp-box"><div class="hp-name"></div><div class="bar hp"><div class="bar-fill"></div></div><div class="hp-num"></div></div><div class="sprite-wrap"><div class="shadow"></div><div class="sprite"></div></div></div>
      </div>
      <div class="battle-log" data-log>Choose an attack!</div>
      <div class="battle-controls">
        <div class="moves" data-moves></div>
        <div class="team-row" data-team></div>
      </div>
    </div>`;
    bindActions(root, {
      move: (d) => this.turn({ type: 'attack', move: battle.player[battle.active.player].moves[+d.i] }),
      switch: (d) => this.turn({ type: 'switch', index: +d.i }),
      flee: async () => {
        if (this.busy) return;
        const ok = await confirmDialog('Flee?', meta.mode === 'tower' ? 'Fleeing ends your tower run.' : 'Running away counts as a loss.', 'Flee', true);
        if (ok) this.finish(false);
      },
    });
    this.renderFighter('player');
    this.renderFighter('enemy');
    this.renderControls();
  },

  unit(side) {
    return this.battle[side][this.battle.active[side]];
  },

  renderFighter(side, animate = false) {
    const root = document.getElementById('battle-root');
    const el = root.querySelector(`.fighter[data-side="${side}"]`);
    const u = this.unit(side);
    el.querySelector('.hp-name').innerHTML = `${escapeHtml(u.name)} <span class="lv">Lv ${u.level}</span> ${u.stars ? `<span class="stars">${'★'.repeat(u.stars)}</span>` : ''} ${u.elements.map((e) => elementBadge(e, 12)).join('')}`;
    const sprite = el.querySelector('.sprite');
    sprite.innerHTML = dragonSVG(u.species, eco.dragonStage(u.level), { size: 200, facing: side === 'player' ? 'right' : 'left' });
    sprite.className = 'sprite' + (animate ? ' enter' : '') + (u.hp <= 0 ? ' faint' : '');
    this.updateHp(side);
  },

  updateHp(side) {
    const root = document.getElementById('battle-root');
    const el = root.querySelector(`.fighter[data-side="${side}"]`);
    const u = this.unit(side);
    const pct = (u.hp / u.maxHp) * 100;
    const fill = el.querySelector('.bar-fill');
    fill.style.width = `${pct}%`;
    fill.className = 'bar-fill ' + (pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low');
    el.querySelector('.hp-num').textContent = `${u.hp} / ${u.maxHp}`;
  },

  renderControls() {
    const root = document.getElementById('battle-root');
    const b = this.battle;
    if (!b) return;
    const pu = this.unit('player');
    const eu = this.unit('enemy');
    root.querySelector('[data-round]').textContent = `Round ${b.round}`;
    root.querySelector('[data-moves]').innerHTML = pu.moves.map((m, i) => {
      const mult = m.el ? elementMultiplier(m.el, eu.elements) : 1;
      const eff = mult >= 1.5 ? 'super' : mult < 1 ? 'weak' : '';
      return `<button class="move-btn ${eff}" data-action="move" data-i="${i}" ${this.busy || b.over ? 'disabled' : ''} style="--el:${m.el ? ELEMENTS[m.el].color : '#9aa5b5'}">
        <span class="mv-name">${m.el ? elementBadge(m.el, 14) : '<span class="elbadge phys">•</span>'} ${m.name}</span>
        <span class="mv-meta">${m.power} pw · ${Math.round(m.acc * 100)}% ${eff === 'super' ? '· ▲' : eff === 'weak' ? '· ▼' : ''}</span></button>`;
    }).join('');
    root.querySelector('[data-team]').innerHTML = b.player.map((u, i) => `<button class="team-btn ${i === b.active.player ? 'active' : ''} ${u.hp <= 0 ? 'ko' : ''}" data-action="switch" data-i="${i}" ${this.busy || b.over || i === b.active.player || u.hp <= 0 ? 'disabled' : ''}>
      ${dragonSVG(u.species, eco.dragonStage(u.level), { size: 40 })}<div class="bar hp mini"><div class="bar-fill ${u.hp / u.maxHp > 0.5 ? 'ok' : u.hp / u.maxHp > 0.2 ? 'warn' : 'low'}" style="width:${(u.hp / u.maxHp) * 100}%"></div></div></button>`).join('');
  },

  log(text) {
    const el = document.querySelector('#battle-root [data-log]');
    if (el) el.innerHTML = text;
  },

  popDamage(side, text, cls = '') {
    const el = document.querySelector(`#battle-root .fighter[data-side="${side}"] .sprite-wrap`);
    if (!el) return;
    const d = document.createElement('div');
    d.className = `dmg ${cls}`;
    d.textContent = text;
    el.appendChild(d);
    setTimeout(() => d.remove(), 900);
  },

  async turn(action) {
    if (this.busy || !this.battle || this.battle.over) return;
    this.busy = true;
    this.renderControls();
    const events = playRound(this.battle, action);
    await this.animate(events);
    this.busy = false;
    if (this.battle && this.battle.over) {
      await sleep(500);
      this.finish(this.battle.winner === 'player');
    } else if (this.battle) {
      this.renderControls();
    }
  },

  async animate(events) {
    const root = document.getElementById('battle-root');
    for (const ev of events) {
      if (!this.battle || !root.querySelector('.battle-screen')) return;
      if (ev.type === 'switch') {
        const u = this.battle[ev.side].find((x) => x.id === ev.unit);
        this.log(ev.side === 'player' ? `Go, ${escapeHtml(u.name)}!` : `${escapeHtml(u.name)} steps in!`);
        this.renderFighter(ev.side, true);
        this.renderControls();
        await sleep(650);
      } else if (ev.type === 'attack') {
        const other = ev.side === 'player' ? 'enemy' : 'player';
        const attacker = this.battle[ev.side].find((x) => x.id === ev.attacker);
        const spriteA = root.querySelector(`.fighter[data-side="${ev.side}"] .sprite`);
        const spriteT = root.querySelector(`.fighter[data-side="${other}"] .sprite`);
        spriteA.classList.add(ev.side === 'player' ? 'lunge-right' : 'lunge-left');
        await sleep(260);
        if (ev.miss) {
          sfx.play('miss');
          this.log(`${escapeHtml(attacker.name)} used ${ev.move.name}... but missed!`);
          this.popDamage(other, 'Miss', 'miss');
        } else {
          sfx.play(ev.crit ? 'crit' : 'hit');
          spriteT.classList.add('shake');
          this.popDamage(other, `-${ev.dmg}`, ev.crit ? 'crit' : ev.mult >= 1.5 ? 'super' : ev.mult < 1 ? 'weak' : '');
          const note = [describeMultiplier(ev.mult), ev.crit ? 'Critical hit!' : ''].filter(Boolean).join(' ');
          this.log(`${escapeHtml(attacker.name)} used <b>${ev.move.name}</b>! ${note}`);
          this.updateHp(other);
        }
        await sleep(520);
        spriteA.classList.remove('lunge-right', 'lunge-left');
        spriteT.classList.remove('shake');
        await sleep(180);
      } else if (ev.type === 'faint') {
        const u = this.battle[ev.side].find((x) => x.id === ev.unit);
        const sprite = root.querySelector(`.fighter[data-side="${ev.side}"] .sprite`);
        sprite.classList.add('faint');
        this.log(`${escapeHtml(u.name)} fainted!`);
        if (ev.side === 'player') this.renderControls();
        await sleep(700);
      } else if (ev.type === 'end') {
        await sleep(200);
      }
    }
  },

  closeScreen() {
    const root = document.getElementById('battle-root');
    root.hidden = true;
    root.innerHTML = '';
    this.battle = null;
  },

  finish(won) {
    const st = game.state;
    const battle = this.battle;
    const meta = battle ? battle.meta : { mode: 'arena', level: 1 };
    const heroSpecies = battle ? battle.player[0].species : 'flame';
    const heroLevel = battle ? battle.player[0].level : 1;
    sfx.play(won ? 'win' : 'lose');

    if (meta.mode === 'tower') {
      const r = actions.towerAfterFloor(st, battle.player, won);
      game.changed();
      game.save();
      const alive = battle.player.some((u) => u.hp > 0);
      openModal({
        title: won ? `Floor ${r.floor} cleared!` : `Run over at floor ${r.floor}`,
        cls: `center ${won ? 'celebrate' : ''}`,
        hideClose: true,
        html: `<div class="result-art">${won ? dragonSVG(heroSpecies, eco.dragonStage(heroLevel), { size: 130 }) : '<div class="big-icon">💤</div>'}</div>
          <p class="dialog-text">${won ? `Your team heals a little. Floor ${r.nextFloor} awaits${towerFloor(r.nextFloor).boss ? ' with a boss' : ''}.` : `You reached floor ${r.floor}. Best: ${st.tower.best}.`}</p>
          <p class="reward-line">${rewardHtml(r.reward)}</p>
          <div class="row gap center">
            <button class="btn ghost" data-action="stop">${won ? 'Retreat' : 'Back'}</button>
            ${won && alive ? '<button class="btn primary" data-action="next">Next floor</button>' : ''}
          </div>`,
        onMount: (m) => bindActions(m.body, {
          stop: () => { m.close(); this.closeScreen(); if (won) { actions.towerRetreat(st); game.changed(); } this.open('tower'); game.levelUp(r.xpEvents); },
          next: () => { m.close(); this.closeScreen(); game.levelUp(r.xpEvents); this.fightTower(); },
        }),
      });
      return;
    }

    const { reward, xpEvents } = actions.applyBattleResult(st, meta, won);
    if (meta.mode === 'arena') this.arenaOpp = null;
    game.changed();
    game.save();
    const progress = meta.heroic ? st.battle.heroicCleared : st.battle.campaignCleared;
    const nextStage = meta.mode === 'campaign' && won && meta.stageId < STAGE_COUNT && progress >= meta.stageId;
    const backTab = meta.mode === 'friend' ? null : meta.mode;
    openModal({
      title: won ? 'Victory!' : 'Defeat',
      cls: `center ${won ? 'celebrate' : ''}`,
      hideClose: true,
      html: `<div class="result-art">${won ? dragonSVG(heroSpecies, eco.dragonStage(heroLevel), { size: 130 }) : '<div class="big-icon">💤</div>'}</div>
        <p class="dialog-text">${won ? (meta.mode === 'campaign' ? 'Stage cleared!' : meta.mode === 'friend' ? `You beat ${escapeHtml(meta.title.replace('vs ', ''))}'s team! Brag about it.` : `You defeated ${escapeHtml(meta.title.replace('Arena vs ', ''))}!`) : 'Your dragons need more training. Feed them to level up, and pick elements your enemies are weak to.'}</p>
        <p class="reward-line">${rewardHtml(reward)}</p>
        <div class="row gap center">
          <button class="btn ghost" data-action="done">Back</button>
          ${nextStage ? `<button class="btn primary" data-action="next">Next stage</button>` : meta.mode === 'campaign' ? `<button class="btn primary" data-action="retry">${won ? 'Replay' : 'Try again'}</button>` : ''}
        </div>`,
      onMount: (m) => bindActions(m.body, {
        done: () => { m.close(); this.closeScreen(); if (backTab) this.open(backTab); else game.panels.friends.open(); game.levelUp(xpEvents); },
        next: () => { m.close(); this.closeScreen(); this.prepare({ mode: 'campaign', stageId: meta.stageId + 1, heroic: meta.heroic }); game.levelUp(xpEvents); },
        retry: () => { m.close(); this.closeScreen(); this.prepare({ mode: 'campaign', stageId: meta.stageId, heroic: meta.heroic }); game.levelUp(xpEvents); },
      }),
    });
  },
};

export function starsHtml(n) {
  return n ? `<span class="stars">${'★'.repeat(n)}</span>` : '';
}
