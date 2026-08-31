// Pure simulation engine — no DOM/rendering knowledge.
// Owns world state, advances it one tick at a time, and applies events.
// A later "game" layer can feed player-driven events into the same
// applyEvent() / tick() functions used here.

const BASELINE = 10;      // production == consumption at full health
const DIFFUSION_RATE = 0.12; // fraction of neighbor gap shared per tick over an intact road

function createInitialState() {
  const regions = {};
  REGIONS.forEach((r) => {
    regions[r.id] = {
      ...r,
      stats: Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 100])),
      production: Object.fromEntries(RESOURCE_KEYS.map((k) => [k, BASELINE])),
      consumption: Object.fromEntries(RESOURCE_KEYS.map((k) => [k, BASELINE])),
      hoursWithoutPower: 0,
      activeEvents: [],
    };
  });

  const neighbors = {};
  REGIONS.forEach((r) => { neighbors[r.id] = []; });
  ROADS.forEach(([a, b]) => {
    neighbors[a].push(b);
    neighbors[b].push(a);
  });

  return {
    tick: 0,
    regions,
    neighbors,
    cutRegions: new Set(), // regions currently isolated by a road blockade
    log: [],
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function isRoadIntact(state, a, b) {
  return !state.cutRegions.has(a) && !state.cutRegions.has(b);
}

function applyEvent(state, regionId, eventTypeId) {
  const region = state.regions[regionId];
  const def = EVENT_TYPES.find((e) => e.id === eventTypeId);
  if (!region || !def) return;
  def.apply(region, state);
  region.activeEvents.push(def.id);
  state.log.unshift(`[t${state.tick}] ${def.label} — ${region.name}`);
  state.log = state.log.slice(0, 50);
}

function tick(state) {
  state.tick += 1;
  const { regions, neighbors } = state;

  // Cascade: no power degrades drinking water treatment and (after a
  // battery-backup grace window) internet connectivity.
  Object.values(regions).forEach((r) => {
    if (r.stats.power < 20) {
      r.hoursWithoutPower += 1;
      r.production.drinkingwater = Math.min(r.production.drinkingwater, BASELINE * 0.3);
      r.production.internet = r.hoursWithoutPower > 4
        ? Math.min(r.production.internet, 0)
        : Math.min(r.production.internet, BASELINE * 0.5);
    } else {
      r.hoursWithoutPower = 0;
    }
  });

  // Net change per resource: production - consumption + diffusion via intact roads.
  const deltas = {};
  Object.keys(regions).forEach((id) => { deltas[id] = {}; });

  RESOURCE_KEYS.forEach((key) => {
    Object.values(regions).forEach((r) => {
      let delta = r.production[key] - r.consumption[key];

      neighbors[r.id].forEach((nId) => {
        if (!isRoadIntact(state, r.id, nId)) return;
        const neighbor = regions[nId];
        delta += (neighbor.stats[key] - r.stats[key]) * DIFFUSION_RATE;
      });

      deltas[r.id][key] = delta;
    });
  });

  Object.values(regions).forEach((r) => {
    RESOURCE_KEYS.forEach((key) => {
      r.stats[key] = clamp(r.stats[key] + deltas[r.id][key], 0, 100);
    });
  });

  return state;
}
