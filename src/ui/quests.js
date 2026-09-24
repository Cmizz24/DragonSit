import { game } from '../game.js';
import * as actions from '../actions.js';
import { openModal, bindActions, toast, rewardHtml, bar, ICON } from './ui.js';
import { sfx } from '../audio.js';
import { fmt } from '../util.js';
import { xpForLevel } from '../economy.js';

export const questsPanel = {
  modal: null,

  open() {
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: 'Quests',
      full: true,
      onMount: (m) => bindActions(m.body, {
        claim: (d) => {
          const r = actions.claimQuest(game.state, d.id);
          if (!r.ok) { toast(r.error, 'bad'); return; }
          sfx.play('reward');
          toast(`Reward: ${rewardHtml(r.reward)}`, 'good');
          game.levelUp(r.xpEvents);
          game.changed();
          this.render();
        },
      }),
      onClose: () => { this.modal = null; },
    });
    this.render();
  },

  render() {
    const m = this.modal;
    if (!m) return;
    const st = game.state;
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
    m.body.innerHTML = `<div class="card"><div class="row between"><b>Level ${st.player.level}</b><span class="muted">${fmt(st.player.xp)} / ${fmt(xpForLevel(st.player.level))} XP</span></div>${bar(st.player.xp, xpForLevel(st.player.level), 'xp')}</div>
      ${claimable.length ? `<h3 class="group-title">Ready to claim</h3>${claimable.map(item).join('')}` : ''}
      <h3 class="group-title">In progress</h3>${active.length ? active.map(item).join('') : '<p class="hint">All quests complete. Amazing!</p>'}
      ${done.length ? `<h3 class="group-title muted">Completed (${done.length})</h3>${done.slice(-5).reverse().map(item).join('')}` : ''}`;
  },
};
