import { game } from '../game.js';
import * as actions from '../actions.js';
import { openModal, bindActions, tabs, toast, rewardHtml, bar, ICON } from './ui.js';
import { sfx } from '../audio.js';
import { fmt, fmtTime, now } from '../util.js';
import { xpForLevel } from '../economy.js';
import { DAILY_BONUS } from '../data/missions.js';

export const questsPanel = {
  modal: null,
  tab: 'quests',

  open(tab) {
    if (tab) this.tab = tab;
    else {
      // Open on whichever tab has something to claim.
      const st = game.state;
      this.tab = actions.claimableQuests(st) ? 'quests' : actions.claimableMissions(st) ? 'missions' : actions.claimableAchievements(st) ? 'achievements' : this.tab;
    }
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: 'Quests',
      full: true,
      onMount: (m) => bindActions(m.body, {
        claim: (d) => this.claim(() => actions.claimQuest(game.state, d.id)),
        mission: (d) => this.claim(() => actions.claimMission(game.state, d.id)),
        bonus: () => this.claim(() => actions.claimMissionBonus(game.state)),
        ach: (d) => this.claim(() => actions.claimAchievement(game.state, d.id)),
      }),
      onClose: () => { this.modal = null; },
    });
    this.render();
  },

  claim(fn) {
    const r = fn();
    if (!r.ok) { toast(r.error, 'bad'); return; }
    sfx.play('reward');
    toast(`Reward: ${rewardHtml(r.reward)}`, 'good');
    game.levelUp(r.xpEvents);
    game.changed();
    this.render();
  },

  render() {
    const m = this.modal;
    if (!m) return;
    const st = game.state;
    const badge = (n) => (n ? `<span class="tab-badge">${n}</span>` : '');
    m.body.innerHTML = `<div class="tabs">
      <button class="tab ${this.tab === 'quests' ? 'active' : ''}" data-tab="quests">Quests${badge(actions.claimableQuests(st))}</button>
      <button class="tab ${this.tab === 'missions' ? 'active' : ''}" data-tab="missions">Daily${badge(actions.claimableMissions(st))}</button>
      <button class="tab ${this.tab === 'achievements' ? 'active' : ''}" data-tab="achievements">Awards${badge(actions.claimableAchievements(st))}</button>
    </div><div class="tab-body" id="quests-body"></div>`;
    tabs(m.body, (t) => { this.tab = t; this.renderTab(); });
    this.renderTab();
  },

  renderTab() {
    const st = game.state;
    const body = this.modal.body.querySelector('#quests-body');
    if (this.tab === 'missions') {
      const list = actions.missionList(st);
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      body.innerHTML = `<div class="card"><div class="row between"><b>Today's missions</b><span class="muted">${ICON.clock} resets in ${fmtTime(midnight.getTime() - now())}</span></div><p class="hint">New missions every day. Finish all three for a bonus chest.</p></div>
        ${list.map((q) => `<div class="list-item quest ${q.claimed ? 'done' : q.complete ? 'ready' : ''}">
          <div class="info"><div class="name">${q.title}</div><div class="desc">${q.desc}</div>${bar(q.progress, q.target)}<div class="meta">${q.progress}/${q.target} · ${rewardHtml(q.reward)}</div></div>
          ${q.claimed ? '<span class="tag">Done</span>' : q.complete ? `<button class="btn small primary" data-action="mission" data-id="${q.id}">Claim</button>` : ''}
        </div>`).join('')}
        <div class="list-item quest ${st.missions.bonusClaimed ? 'done' : actions.missionBonusReady(st) ? 'ready' : ''}">
          <div class="info"><div class="name">Daily bonus chest</div><div class="desc">Complete all three missions.</div><div class="meta">${rewardHtml(DAILY_BONUS)}</div></div>
          ${st.missions.bonusClaimed ? '<span class="tag">Done</span>' : actions.missionBonusReady(st) ? '<button class="btn small primary" data-action="bonus">Claim</button>' : ''}
        </div>`;
      return;
    }
    if (this.tab === 'achievements') {
      const list = actions.achievementList(st);
      const total = list.reduce((s, a) => s + a.tiers.length, 0);
      const got = list.reduce((s, a) => s + a.claimedTiers, 0);
      const order = (a) => (a.complete ? 0 : a.done ? 2 : 1);
      list.sort((a, b) => order(a) - order(b));
      body.innerHTML = `<div class="card"><div class="row between"><b>Achievements</b><span class="muted">${got} / ${total} tiers</span></div>${bar(got, total, 'gold')}</div>
        ${list.map((a) => `<div class="list-item quest ${a.done ? 'done' : a.complete ? 'ready' : ''}">
          <div class="info"><div class="name">${a.title} <span class="muted">${'★'.repeat(a.claimedTiers)}${'☆'.repeat(a.tiers.length - a.claimedTiers)}</span></div>
            <div class="desc">${a.desc}${a.nextTier != null ? `: ${fmt(a.nextTier)}` : ''}</div>
            ${a.nextTier != null ? bar(a.value, a.nextTier) + `<div class="meta">${fmt(Math.min(a.value, a.nextTier))}/${fmt(a.nextTier)} · ${ICON.gem} ${a.nextReward}</div>` : '<div class="meta">All tiers complete!</div>'}</div>
          ${a.done ? '<span class="tag">Done</span>' : a.complete ? `<button class="btn small primary" data-action="ach" data-id="${a.id}">Claim</button>` : ''}
        </div>`).join('')}`;
      return;
    }
    const list = actions.questList(st);
    const claimable = list.filter((q) => q.complete && !q.claimed);
    const active = list.filter((q) => !q.complete).slice(0, 6);
    const done = list.filter((q) => q.claimed);
    const item = (q) => `<div class="list-item quest ${q.claimed ? 'done' : q.complete ? 'ready' : ''}">
      <div class="info"><div class="name">${q.title}</div><div class="desc">${q.desc}</div>
      ${q.target > 1 && !q.claimed ? bar(q.progress, q.target) + `<div class="meta">${q.progress}/${q.target}</div>` : ''}
      <div class="meta">${rewardHtml(q.reward)}</div></div>
      ${q.claimed ? '<span class="tag">Done</span>' : q.complete ? `<button class="btn small primary" data-action="claim" data-id="${q.id}">Claim</button>` : ''}
    </div>`;
    body.innerHTML = `<div class="card"><div class="row between"><b>Level ${st.player.level}</b><span class="muted">${fmt(st.player.xp)} / ${fmt(xpForLevel(st.player.level))} XP</span></div>${bar(st.player.xp, xpForLevel(st.player.level), 'xp')}</div>
      ${claimable.length ? `<h3 class="group-title">Ready to claim</h3>${claimable.map(item).join('')}` : ''}
      <h3 class="group-title">In progress</h3>${active.length ? active.map(item).join('') : '<p class="hint">All quests complete. Amazing!</p>'}
      ${done.length ? `<h3 class="group-title muted">Completed (${done.length})</h3>${done.slice(-5).reverse().map(item).join('')}` : ''}`;
  },
};
