// Rough (not geographically precise) layout of major Dutch city-regions
// and the motorway-ish connections between them, used as tiles/nodes in
// the simulation. Coordinates are hand-placed on an 800x900 viewBox to
// loosely resemble the shape of the Netherlands.
//
// Later upgrade path (see docs/resources.md):
//   - region boundaries: PDOK BRK bestuurlijke gebieden API
//   - real road geometry: Nationaal Wegenbestand (NWB)

const REGIONS = [
  { id: "groningen",   name: "Groningen",   x: 560, y: 80,  pop: 235000 },
  { id: "leeuwarden",  name: "Leeuwarden",  x: 460, y: 90,  pop: 125000 },
  { id: "zwolle",      name: "Zwolle",      x: 520, y: 230, pop: 130000 },
  { id: "enschede",    name: "Enschede",    x: 660, y: 270, pop: 160000 },
  { id: "amsterdam",   name: "Amsterdam",   x: 380, y: 260, pop: 900000 },
  { id: "utrecht",     name: "Utrecht",     x: 440, y: 335, pop: 360000 },
  { id: "arnhem",      name: "Arnhem",      x: 570, y: 350, pop: 160000 },
  { id: "nijmegen",    name: "Nijmegen",    x: 545, y: 415, pop: 180000 },
  { id: "denhaag",     name: "Den Haag",    x: 290, y: 340, pop: 550000 },
  { id: "rotterdam",   name: "Rotterdam",   x: 340, y: 400, pop: 650000 },
  { id: "breda",       name: "Breda",       x: 390, y: 470, pop: 185000 },
  { id: "tilburg",     name: "Tilburg",     x: 440, y: 480, pop: 220000 },
  { id: "eindhoven",   name: "Eindhoven",   x: 480, y: 520, pop: 235000 },
  { id: "maastricht",  name: "Maastricht",  x: 500, y: 660, pop: 120000 },
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
