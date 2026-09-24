// Modal sheets, toasts, dialogs and shared DOM helpers.
import { escapeHtml, fmt } from '../util.js';
import { sfx } from '../audio.js';

export const ICON = {
  gold: `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#ffd54f" stroke="#b8860b" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="#f9a825" stroke-width="1.5"/></svg>`,
  food: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 5C7 5 4 10 4 14c0 4 4 6 8 6s8-2 8-6c0-4-3-9-8-9z" fill="#ff7043" stroke="#bf360c" stroke-width="1.2"/><path d="M12 5c1-2 2-3 4-3-1 2-2 3-4 3z" fill="#7cb342"/></svg>`,
  gem: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 3h12l4 6-10 13L2 9z" fill="#7c4dff" stroke="#4527a0" stroke-width="1.2"/><path d="M6 3l6 6 6-6M2 9h20M12 9l-4 13M12 9l4 13" fill="none" stroke="#d1c4e9" stroke-width="1" opacity=".8"/></svg>`,
  xp: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l2.6 6.9 7.4.5-5.7 4.7 1.9 7.1L12 17.3l-6.2 3.9 1.9-7.1L2 9.4l7.4-.5z" fill="#4fc3ff" stroke="#0277bd" stroke-width="1"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21C4 15 3 10 6 7c2-2 5-1 6 1 1-2 4-3 6-1 3 3 2 8-6 14z" fill="#ff4081"/></svg>`,
  swords: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 21l6-6M21 21l-6-6M3 3l9 9M21 3l-9 9M14 14l2 2M8 14l-2 2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" width="16" height="16"><rect x="5" y="10" width="14" height="11" rx="2" fill="#ffd54f" stroke="#7a5a00" stroke-width="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#7a5a00" stroke-width="2"/></svg>`,
};

export function cost(costObj, state) {
  if (!costObj) return '<span class="cost free">Free</span>';
  const parts = [];
  if (costObj.gold != null) parts.push(`<span class="cost ${state && state.player.gold < costObj.gold ? 'no' : ''}">${ICON.gold}${fmt(costObj.gold)}</span>`);
  if (costObj.gems != null) parts.push(`<span class="cost ${state && state.player.gems < costObj.gems ? 'no' : ''}">${ICON.gem}${fmt(costObj.gems)}</span>`);
  if (costObj.food != null) parts.push(`<span class="cost ${state && state.player.food < costObj.food ? 'no' : ''}">${ICON.food}${fmt(costObj.food)}</span>`);
  return parts.join(' ');
}

export function rewardHtml(r) {
  const parts = [];
  if (r.gold) parts.push(`<span class="cost">${ICON.gold}${fmt(r.gold)}</span>`);
  if (r.gems) parts.push(`<span class="cost">${ICON.gem}${fmt(r.gems)}</span>`);
  if (r.food) parts.push(`<span class="cost">${ICON.food}${fmt(r.food)}</span>`);
  if (r.xp) parts.push(`<span class="cost">${ICON.xp}${fmt(r.xp)}</span>`);
  return parts.join(' ');
}

export function bar(value, max, cls = '') {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `<div class="bar ${cls}"><div class="bar-fill" style="width:${pct.toFixed(1)}%"></div></div>`;
}

// ---------- modals ----------
const stack = [];
let root;
let stackListener = null;

export function setModalStackListener(fn) {
  stackListener = fn;
}
function notifyStack() {
  if (stackListener) setTimeout(stackListener, 0);
}

function ensureRoot() {
  if (!root) root = document.getElementById('modal-root');
  return root;
}

export function openModal({ title = '', html = '', onMount, onClose, cls = '', full = false, hideClose = false }) {
  const r = ensureRoot();
  const wrap = document.createElement('div');
  wrap.className = `modal-backdrop ${cls}`;
  wrap.innerHTML = `<div class="sheet ${full ? 'full' : ''}" role="dialog" aria-label="${escapeHtml(title)}">
    <header class="sheet-head"><h2>${title}</h2>${hideClose ? '' : '<button class="icon-btn close" data-close aria-label="Close">&times;</button>'}</header>
    <div class="sheet-body">${html}</div>
  </div>`;
  r.appendChild(wrap);
  const modal = {
    el: wrap,
    body: wrap.querySelector('.sheet-body'),
    closed: false,
    close() {
      if (modal.closed) return;
      modal.closed = true;
      wrap.classList.add('closing');
      const idx = stack.indexOf(modal);
      if (idx >= 0) stack.splice(idx, 1);
      setTimeout(() => wrap.remove(), 180);
      if (onClose) onClose();
      notifyStack();
    },
    setBody(newHtml) {
      modal.body.innerHTML = newHtml;
      if (onMount) onMount(modal);
    },
    setTitle(t) {
      wrap.querySelector('h2').innerHTML = t;
    },
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) {
      sfx.play('tap');
      modal.close();
    }
  });
  stack.push(modal);
  requestAnimationFrame(() => wrap.classList.add('open'));
  if (onMount) onMount(modal);
  return modal;
}

export function closeAllModals() {
  for (const m of [...stack]) m.close();
}

export function topModal() {
  return stack[stack.length - 1] || null;
}

export function modalCount() {
  return stack.length;
}

// Delegated click handling: <button data-action="feed" data-id="...">
export function bindActions(el, handlers) {
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !el.contains(btn)) return;
    const fn = handlers[btn.dataset.action];
    if (fn) {
      if (btn.disabled) return;
      sfx.play('tap');
      fn(btn.dataset, btn, e);
    }
  });
}

export function confirmDialog(title, message, okLabel = 'OK', danger = false) {
  return new Promise((resolve) => {
    const m = openModal({
      title,
      cls: 'center',
      html: `<p class="dialog-text">${message}</p><div class="row gap"><button class="btn ghost" data-action="no">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-action="yes">${okLabel}</button></div>`,
      onMount: (modal) => bindActions(modal.body, { yes: () => { resolve(true); modal.close(); }, no: () => { resolve(false); modal.close(); } }),
      onClose: () => resolve(false),
    });
  });
}

export function promptDialog(title, value = '', placeholder = '') {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title,
      cls: 'center',
      html: `<input class="input" id="prompt-input" maxlength="16" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"><div class="row gap"><button class="btn ghost" data-action="no">Cancel</button><button class="btn primary" data-action="yes">Save</button></div>`,
      onMount: (modal) => {
        const input = modal.body.querySelector('#prompt-input');
        setTimeout(() => input.focus(), 100);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { done = true; resolve(input.value); modal.close(); } });
        bindActions(modal.body, { yes: () => { done = true; resolve(input.value); modal.close(); }, no: () => modal.close() });
      },
      onClose: () => { if (!done) resolve(null); },
    });
  });
}

export function infoDialog(title, html, okLabel = 'OK') {
  return new Promise((resolve) => {
    openModal({
      title,
      cls: 'center',
      html: `${html}<div class="row gap center"><button class="btn primary" data-action="ok">${okLabel}</button></div>`,
      onMount: (modal) => bindActions(modal.body, { ok: () => modal.close() }),
      onClose: () => resolve(),
    });
  });
}

// ---------- toasts ----------
export function toast(message, type = 'info', ms = 2200) {
  const r = document.getElementById('toast-root');
  if ([...r.children].some((c) => c.innerHTML === message)) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = message;
  r.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

export function tabs(el, onChange) {
  const buttons = el.querySelectorAll('[data-tab]');
  buttons.forEach((b) => b.addEventListener('click', () => {
    buttons.forEach((x) => x.classList.toggle('active', x === b));
    sfx.play('tap');
    onChange(b.dataset.tab);
  }));
}
