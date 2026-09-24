// Weekly element events: everyone on the same calendar week sees the same event.
import { ELEMENT_ORDER, ELEMENTS } from './elements.js';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const EPOCH = Date.UTC(2024, 0, 1); // a Monday

export function weekNumber(t = Date.now()) {
  return Math.floor((t - EPOCH) / WEEK);
}

export function weekKey(t = Date.now()) {
  return `w${weekNumber(t)}`;
}

export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayNumber(t = Date.now()) {
  return Math.floor((t - EPOCH) / (24 * 60 * 60 * 1000));
}

export function currentEvent(t = Date.now()) {
  const w = weekNumber(t);
  const element = ELEMENT_ORDER[w % ELEMENT_ORDER.length];
  const E = ELEMENTS[element];
  return {
    element,
    name: `${E.name} Week`,
    endsAt: EPOCH + (w + 1) * WEEK,
    goldMult: 1.5,
    breedMult: 1.6,
    shopDiscount: 0.25,
    desc: `${E.name} habitats earn +50% gold, ${E.name} dragons are 25% off in the shop, and breeding ${E.name} hybrids is more likely.`,
  };
}
