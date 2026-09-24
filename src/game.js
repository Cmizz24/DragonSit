// Central game object: owns state, the island renderer and periodic ticks/saves.
import { loadState, saveState } from './state.js';
import * as actions from './actions.js';
import { Island } from './island.js';
import { now } from './util.js';
import { setRarityLookup } from './data/quests.js';
import { DRAGONS } from './data/dragons.js';

setRarityLookup((id) => (DRAGONS[id] ? DRAGONS[id].rarity : 'common'));

export const game = {
  state: null,
  island: null,
  fresh: false,
  panels: {},     // filled by main.js: { shop, dragons, building, breed, battle, quests, settings, hud }
  listeners: new Set(),

  init(canvas) {
    const { state, fresh } = loadState();
    this.state = state;
    this.fresh = fresh;
    const away = now() - state.lastTick;
    const res = actions.tick(state);
    this.offline = { away, earned: res.earned };
    this.island = new Island(canvas, this);
    this.island.centerOnZone0();
    setInterval(() => this.tick(), 1000);
    setInterval(() => this.save(), 15000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
      else {
        actions.tick(this.state);
        this.emit('tick');
      }
    });
    window.addEventListener('pagehide', () => this.save());
    window.addEventListener('beforeunload', () => this.save());
  },

  tick() {
    actions.tick(this.state);
    this.emit('tick');
  },

  save() {
    if (this.state) saveState(this.state);
  },

  // Simple pub/sub so open panels can refresh timers.
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit(evt, data) {
    for (const fn of this.listeners) {
      try {
        fn(evt, data);
      } catch (err) {
        console.error(err);
      }
    }
  },

  // Called after any state change that the HUD/island should reflect.
  changed() {
    this.emit('change');
  },

  // ---- island callbacks ----
  onTapBuilding(b) {
    this.island.selectedId = b.id;
    this.panels.building.open(b);
  },
  onTapEmpty() {
    this.island.selectedId = null;
  },
  onTapLocked(zoneId) {
    this.panels.shop.openExpand(zoneId);
  },
  onPlacementChange(p) {
    if (this.panels.placement) this.panels.placement.update(p);
  },
};
