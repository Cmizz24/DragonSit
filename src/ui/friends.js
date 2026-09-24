import { game } from '../game.js';
import { DRAGONS } from '../data/dragons.js';
import { leagueFor } from '../data/campaign.js';
import { dragonSVG } from '../art/dragon.js';
import * as actions from '../actions.js';
import * as eco from '../economy.js';
import { myCard, encodeCard } from '../social.js';
import { cloudEnabled, fetchLeaderboard, fetchPlayer, publishCard } from '../cloud.js';
import { openModal, bindActions, tabs, toast, ICON, confirmDialog, promptDialog, rewardHtml, infoDialog } from './ui.js';
import { fmt, fmtTime, escapeHtml, now } from '../util.js';
import { sfx } from '../audio.js';

export async function shareText(text, label = 'Copied!') {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast(label, 'good');
    return true;
  } catch (err) {
    openModal({ title: 'Copy this', html: `<textarea class="input code" readonly>${escapeHtml(text)}</textarea><p class="hint">Select the text and copy it.</p>` });
    return false;
  }
}

export const friendsPanel = {
  modal: null,
  tab: 'friends',
  board: null,
  loading: false,

  open(tab = 'friends') {
    this.tab = tab;
    if (this.modal && !this.modal.closed) {
      this.render();
      return;
    }
    this.modal = openModal({
      title: 'Friends',
      full: true,
      onMount: (m) => bindActions(m.body, {
        share: () => this.shareCard(),
        gift: () => this.shareGift(),
        rename: async () => {
          const name = await promptDialog('Your trainer name', game.state.player.name, 'Name');
          if (name == null) return;
          const r = actions.renamePlayer(game.state, name);
          if (!r.ok) { toast(r.error, 'bad'); return; }
          game.changed();
          this.render();
        },
        add: () => this.addFromInput(),
        redeem: () => this.redeemFromInput(),
        battle: (d) => this.battle(d.id),
        remove: async (d) => {
          const f = game.state.friends.find((x) => x.id === d.id);
          if (!f) return;
          const ok = await confirmDialog('Remove friend', `Remove ${escapeHtml(f.name)} from your friends?`, 'Remove', true);
          if (!ok) return;
          actions.removeFriend(game.state, d.id);
          game.changed();
          this.render();
        },
        refresh: () => this.refreshFromCloud(),
        addcloud: () => this.addFromCloud(),
        addboard: (d) => {
          const card = (this.board || []).find((c) => c.id === d.id);
          if (!card) return;
          const r = actions.upsertFriend(game.state, card);
          if (!r.ok) { toast(r.error, 'bad'); return; }
          toast(r.isNew ? `${escapeHtml(card.name)} added!` : `${escapeHtml(card.name)} updated`, 'good');
          game.changed();
          this.render();
        },
        settings: () => { this.modal.close(); game.panels.settings.open(); },
        info: () => infoDialog('How friends work', `<p class="dialog-text">Send your <b>trainer card</b> to friends (Messages, WhatsApp, anything). They paste it here to add you, then they can battle your best team and see your progress.</p><p class="dialog-text">Every day you can send a <b>gift code</b>: each friend who redeems it gets gems, gold and food. Cards are a snapshot, so re-share yours now and then.</p><p class="dialog-text">With cloud sync enabled in Settings, cards update automatically and a global leaderboard appears.</p>`),
      }),
      onClose: () => { this.modal = null; },
    });
    this.render();
  },

  render() {
    const m = this.modal;
    if (!m) return;
    const cloud = cloudEnabled(game.state);
    m.body.innerHTML = `<div class="tabs"><button class="tab ${this.tab === 'friends' ? 'active' : ''}" data-tab="friends">Friends</button><button class="tab ${this.tab === 'board' ? 'active' : ''}" data-tab="board">Leaderboard${cloud ? '' : ' ☁'}</button></div><div class="tab-body" id="friends-body"></div>`;
    tabs(m.body, (t) => { this.tab = t; this.renderTab(); });
    this.renderTab();
  },

  renderTab() {
    const st = game.state;
    const body = this.modal.body.querySelector('#friends-body');
    if (!body) return;
    if (this.tab === 'board') {
      this.renderBoard(body);
      return;
    }
    const me = myCard(st);
    const league = leagueFor(me.trophies);
    const cloud = cloudEnabled(st);
    const friends = [...st.friends].sort((a, b) => (b.trophies || 0) - (a.trophies || 0) || (b.tower || 0) - (a.tower || 0));
    const rows = [{ ...me, me: true }, ...friends].sort((a, b) => (b.trophies || 0) - (a.trophies || 0) || (b.tower || 0) - (a.tower || 0));
    body.innerHTML = `
      <div class="card me-card">
        <div class="row between"><div><b>${escapeHtml(me.name)}</b> <button class="icon-btn tiny" data-action="rename" aria-label="Rename">✎</button><div class="meta">ID <b class="mono">${me.id}</b> · Lv ${me.level} · ${league.name} League</div></div><button class="link" data-action="info">How it works</button></div>
        <div class="stat-grid four"><div>🏆 <b>${me.trophies}</b></div><div>Tower <b>${me.tower}</b></div><div>Stages <b>${me.campaign}</b></div><div>Species <b>${me.discovered}</b></div></div>
        <div class="team-preview">${me.team.map((t) => `<span class="mini">${dragonSVG(t.species, eco.dragonStage(t.level), { size: 40 })}<i>${t.level}</i></span>`).join('')}<span class="muted small">your best team</span></div>
        <div class="row gap wrap"><button class="btn primary grow" data-action="share">Share my card</button><button class="btn grow" data-action="gift">${ICON.gem} Send today's gift</button></div>
      </div>
      <div class="card">
        <b>Add a friend</b>
        <p class="hint">Paste a friend's trainer card. Pasting it again later updates their stats.</p>
        <textarea class="input small" id="friend-code" placeholder="DS1.…"></textarea>
        <div class="row gap"><button class="btn primary grow" data-action="add">Add friend</button></div>
        ${cloud ? `<div class="row gap" style="margin-top:8px"><input class="input grow" id="friend-id" placeholder="Or enter a friend ID (e.g. AB12CD34)" maxlength="12"><button class="btn" data-action="addcloud">Look up</button></div>` : ''}
        <p class="hint" style="margin-top:10px"><b>Got a gift code?</b></p>
        <div class="row gap"><input class="input grow" id="gift-code" placeholder="GIFT-…"><button class="btn" data-action="redeem">Redeem</button></div>
      </div>
      <h3 class="group-title">Friends leaderboard <span class="muted">(${friends.length})</span> ${cloud ? '<button class="link" data-action="refresh">Refresh</button>' : ''}</h3>
      ${rows.map((f, i) => `<div class="list-item friend ${f.me ? 'me' : ''}">
        <div class="rank">${i + 1}</div>
        <div class="info">
          <div class="name">${escapeHtml(f.name)} ${f.me ? '<span class="tag">You</span>' : ''} <span class="muted">Lv ${f.level}</span></div>
          <div class="meta">🏆 ${f.trophies} · Tower ${f.tower} · Stage ${f.campaign}${f.heroic ? ` (H${f.heroic})` : ''} · ${f.discovered} species${f.me ? '' : ` · Record ${f.wins || 0}-${f.losses || 0}`}</div>
          <div class="team-preview">${(f.team || []).map((t) => `<span class="mini">${dragonSVG(t.species, eco.dragonStage(t.level), { size: 34 })}<i>${t.level}</i></span>`).join('')}${f.me ? '' : `<span class="muted small">${fmtAgo(f.updatedAt)}</span>`}</div>
        </div>
        ${f.me ? '' : `<div class="col gap"><button class="btn small primary" data-action="battle" data-id="${f.id}" ${(f.team || []).length ? '' : 'disabled'}>Battle</button><button class="btn small ghost" data-action="remove" data-id="${f.id}">Remove</button></div>`}
      </div>`).join('')}
      ${friends.length === 0 ? '<p class="hint center-text">No friends yet. Share your card and ask for theirs!</p>' : ''}`;
  },

  async renderBoard(body) {
    const st = game.state;
    if (!cloudEnabled(st)) {
      body.innerHTML = `<div class="card"><b>Global leaderboard</b><p class="hint">Turn on cloud sync in Settings (a free Firebase database URL) and everyone using the same URL shares a live leaderboard and can add each other by ID. Without it, the Friends tab works fully offline through shared cards.</p><button class="btn" data-action="settings">Open settings</button></div>`;
      return;
    }
    body.innerHTML = '<p class="hint center-text">Loading leaderboard…</p>';
    try {
      await publishCard(st);
      this.board = await fetchLeaderboard(st, 50);
    } catch (err) {
      body.innerHTML = `<div class="card"><b>Could not reach the cloud</b><p class="hint">${escapeHtml(err.message)}. Check the URL in Settings and your connection.</p></div>`;
      return;
    }
    if (this.tab !== 'board') return;
    body.innerHTML = `<p class="hint">Top players sharing your cloud. Tap Add to follow someone.</p>` + this.board.map((c, i) => `<div class="list-item friend ${c.id === st.player.id ? 'me' : ''}">
      <div class="rank">${i + 1}</div>
      <div class="info"><div class="name">${escapeHtml(String(c.name || 'Keeper'))} <span class="muted">Lv ${c.level || 1}</span></div><div class="meta">🏆 ${c.trophies || 0} · Tower ${c.tower || 0} · Stage ${c.campaign || 0}</div></div>
      ${c.id === st.player.id ? '<span class="tag">You</span>' : st.friends.some((f) => f.id === c.id) ? '<span class="tag good">Friend</span>' : `<button class="btn small" data-action="addboard" data-id="${escapeHtml(c.id)}">Add</button>`}
    </div>`).join('') || '<p class="hint center-text">Nobody here yet. You are the first!</p>';
  },

  async shareCard() {
    const code = encodeCard(myCard(game.state));
    await shareText(`My DragonSit trainer card: ${code}`, 'Card copied! Send it to a friend.');
  },

  async shareGift() {
    const code = actions.myGiftCode(game.state);
    await shareText(`A DragonSit gift for you: ${code}`, 'Gift code copied! Send it to your friends.');
  },

  extractCode(text) {
    const m = String(text || '').match(/DS1\.[A-Za-z0-9_-]+/);
    return m ? m[0] : String(text || '').trim();
  },

  addFromInput() {
    const input = this.modal.body.querySelector('#friend-code');
    const r = actions.addFriendCard(game.state, this.extractCode(input.value));
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('reward');
    toast(r.isNew ? `${escapeHtml(r.friend.name)} added!` : `${escapeHtml(r.friend.name)} updated`, 'good');
    game.changed();
    this.render();
  },

  redeemFromInput() {
    const input = this.modal.body.querySelector('#gift-code');
    const m = String(input.value || '').toUpperCase().match(/GIFT-[A-Z0-9-]+/);
    const r = actions.redeemGift(game.state, m ? m[0] : input.value);
    if (!r.ok) { sfx.play('error'); toast(r.error, 'bad'); return; }
    sfx.play('reward');
    const from = game.state.friends.find((f) => f.id === r.from);
    infoDialog('Gift opened!', `<p class="dialog-text">From ${escapeHtml(from ? from.name : r.from)}:</p><p class="reward-line">${rewardHtml(r.reward)}</p>`);
    game.levelUp(r.xpEvents);
    game.changed();
    this.render();
  },

  async refreshFromCloud() {
    const st = game.state;
    let updated = 0;
    toast('Refreshing…');
    for (const f of st.friends) {
      try {
        const card = await fetchPlayer(st, f.id);
        if (card) { actions.upsertFriend(st, card); updated++; }
      } catch (err) { /* keep going */ }
    }
    toast(`${updated} friend${updated === 1 ? '' : 's'} updated`, 'good');
    game.changed();
    this.render();
  },

  async addFromCloud() {
    const input = this.modal.body.querySelector('#friend-id');
    const id = String(input.value || '').trim().toUpperCase();
    if (!id) return;
    try {
      const card = await fetchPlayer(game.state, id);
      if (!card) { toast('No player with that ID', 'bad'); return; }
      const r = actions.upsertFriend(game.state, card);
      if (!r.ok) { toast(r.error, 'bad'); return; }
      toast(`${escapeHtml(card.name)} added!`, 'good');
      game.changed();
      this.render();
    } catch (err) {
      toast('Could not reach the cloud', 'bad');
    }
  },

  battle(friendId) {
    const f = game.state.friends.find((x) => x.id === friendId);
    if (!f || !f.team || f.team.length === 0) return;
    this.modal.close();
    game.panels.battle.prepare({ mode: 'friend', friendId });
  },
};

function fmtAgo(t) {
  if (!t) return '';
  const d = now() - t;
  if (d < 60000) return 'just now';
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}
