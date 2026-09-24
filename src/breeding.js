import { DRAGONS, DRAGON_LIST, RARITY } from './data/dragons.js';

export const BREED_MIN_LEVEL = 3;

// Returns weighted candidates for the offspring of two species.
export function breedOutcomes(speciesA, speciesB) {
  const a = DRAGONS[speciesA];
  const b = DRAGONS[speciesB];
  const union = new Set([...a.elements, ...b.elements]);
  const bothElite = ['epic', 'legendary'].includes(a.rarity) && ['epic', 'legendary'].includes(b.rarity);
  const bothLegendary = a.rarity === 'legendary' && b.rarity === 'legendary';
  const out = [];
  for (const sp of DRAGON_LIST) {
    if (sp.rarity === 'legendary') {
      if (!bothElite) continue;
      const extra = sp.elements.filter((e) => e !== 'legend');
      const extraOk = extra.every((e) => union.has(e));
      let w = bothLegendary ? 60 : sp.id === 'legend' ? 30 : 15;
      if (!extraOk && sp.id !== 'legend') w *= 0.4;
      out.push({ species: sp.id, weight: w });
      continue;
    }
    if (!sp.elements.every((e) => union.has(e))) continue;
    let w = RARITY[sp.rarity].weight;
    // The "true" hybrid of two pure parents is a bit more likely.
    if (sp.elements.length === union.size && sp.elements.length > 1) w *= 1.5;
    // Two hybrids that share an element skew towards new hybrids rather than the pure parents.
    if (sp.elements.length === 1 && union.size >= 3) w *= 0.6;
    out.push({ species: sp.id, weight: w });
  }
  const total = out.reduce((s, o) => s + o.weight, 0);
  for (const o of out) o.chance = o.weight / total;
  out.sort((x, y) => y.chance - x.chance);
  return out;
}

export function pickOffspring(speciesA, speciesB, rng = Math.random) {
  const outcomes = breedOutcomes(speciesA, speciesB);
  let r = rng() * outcomes.reduce((s, o) => s + o.weight, 0);
  for (const o of outcomes) {
    r -= o.weight;
    if (r <= 0) return o.species;
  }
  return outcomes[outcomes.length - 1].species;
}

// Combined breeding duration: the offspring's breed time.
export function breedDuration(speciesId) {
  return DRAGONS[speciesId].breedTime;
}
