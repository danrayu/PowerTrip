// Major Dutch city-regions used as tiles/nodes in the simulation.
// Real municipality boundaries (used for position + shape) come from
// GEMEENTE_BOUNDARIES (boundaries.js, sourced from PDOK — see geo.js and
// docs/resources.md). `name` here is kept for display fallback; `pop` is
// used to size the glow effect.
//
// Later upgrade path (see docs/resources.md):
//   - real road geometry: Nationaal Wegenbestand (NWB) — roads below are
//     still hand-picked motorway-corridor approximations, not real geometry.

const REGIONS = [
  { id: "groningen",   name: "Groningen",   pop: 235000 },
  { id: "leeuwarden",  name: "Leeuwarden",  pop: 125000 },
  { id: "zwolle",      name: "Zwolle",      pop: 130000 },
  { id: "enschede",    name: "Enschede",    pop: 160000 },
  { id: "amsterdam",   name: "Amsterdam",   pop: 900000 },
  { id: "utrecht",     name: "Utrecht",     pop: 360000 },
  { id: "arnhem",      name: "Arnhem",      pop: 160000 },
  { id: "nijmegen",    name: "Nijmegen",    pop: 180000 },
  { id: "denhaag",     name: "Den Haag",    pop: 550000 },
  { id: "rotterdam",   name: "Rotterdam",   pop: 650000 },
  { id: "breda",       name: "Breda",       pop: 185000 },
  { id: "tilburg",     name: "Tilburg",     pop: 220000 },
  { id: "eindhoven",   name: "Eindhoven",   pop: 235000 },
  { id: "maastricht",  name: "Maastricht",  pop: 120000 },
];

// Undirected road edges (roughly following A-road corridors).
const ROADS = [
  ["groningen", "leeuwarden"],
  ["groningen", "zwolle"],
  ["zwolle", "enschede"],
  ["zwolle", "utrecht"],
  ["enschede", "arnhem"],
  ["amsterdam", "utrecht"],
  ["amsterdam", "denhaag"],
  ["denhaag", "rotterdam"],
  ["rotterdam", "breda"],
  ["utrecht", "arnhem"],
  ["arnhem", "nijmegen"],
  ["breda", "tilburg"],
  ["tilburg", "eindhoven"],
  ["eindhoven", "nijmegen"],
  ["eindhoven", "maastricht"],
];

const RESOURCE_KEYS = ["power", "water", "drinkingwater", "food", "internet"];

const RESOURCE_LABELS = {
  power: "Power",
  water: "Water (raw/treatment)",
  drinkingwater: "Drinking water",
  food: "Food supply",
  internet: "Internet",
};

// Event definitions: what they do to a region when triggered.
// `apply` mutates the sim state for that region.
const EVENT_TYPES = [
  {
    id: "power_plant_failure",
    label: "Power plant failure",
    apply: (region) => { region.production.power = 0; },
  },
  {
    id: "water_main_break",
    label: "Water main break",
    apply: (region) => { region.production.water = 0; },
  },
  {
    id: "isp_outage",
    label: "Cyber attack on ISP",
    apply: (region) => { region.production.internet = 0; },
  },
  {
    id: "supply_chain_disruption",
    label: "Food supply chain disruption",
    apply: (region) => { region.production.food = 0; },
  },
  {
    id: "road_blockade",
    label: "Road blockade (cut all roads)",
    apply: (region, state) => {
      state.cutRegions.add(region.id);
    },
  },
  {
    id: "repair_all",
    label: "Emergency repair (restore production)",
    apply: (region, state) => {
      RESOURCE_KEYS.forEach((k) => { region.production[k] = 10; });
      state.cutRegions.delete(region.id);
    },
  },
];
