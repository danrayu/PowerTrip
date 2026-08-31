# Power Trip — v1 (basic prototype)

Static, no-build web app simulating cascading infrastructure failure across
major Dutch city-regions, connected by roads.

## Files

- `index.html` — page shell, controls, overlay/event panels
- `boundaries.js` — a Voronoi tile per city (region shape) clipped to the
  real national outline, plus each city's actual town-center coordinate;
  computed offline from PDOK data (see "Region shapes" below)
- `geo.js` — projects those tiles + city points into the SVG viewBox
  (city point is used for road anchors, labels, glow — not a polygon
  centroid, so it lines up with the real city even on an irregular tile)
- `provinces.js` — real provincie outlines from PDOK, drawn as a dashed
  reference overlay on top of the region tiles for geographic context
  (provinces are not simulation units)
- `data.js` — region metadata (name, population), road edges, resource
  keys, event definitions
- `sim.js` — pure simulation engine (no DOM knowledge): world state, `tick()`, `applyEvent()`
- `app.js` — SVG rendering + UI wiring, reads sim state each tick
- `style.css` — visual styling, including the "night map" power overlay

## Model

14 regions (Amsterdam, Rotterdam, Den Haag, Utrecht, Eindhoven, Tilburg,
Groningen, Maastricht, Arnhem, Nijmegen, Breda, Zwolle, Enschede,
Leeuwarden). Connected by 15 hand-picked road edges (between each city's
real point location) approximating the motorway network — not yet real
road geometry.

### Region shapes

Regions are rendered as an actual tiling of the country — every point in
the Netherlands belongs to exactly one region, and neighboring regions
share a border — rather than 14 separate shapes floating with gaps
between them. Built offline (not at runtime) as:

1. Each city's real center point fetched from PDOK Locatieserver
   (`woonplaats` type — the town itself, not the municipality it
   administratively belongs to, which can be centered far from the city).
2. The national outline fetched from PDOK BRK bestuurlijke gebieden
   (`landgebied` collection).
3. A Voronoi diagram computed over the 14 city points (scipy), clipped to
   that national outline (shapely) — each city "claims" the area closest
   to it, bounded by the coastline/border. Verified to have zero overlap
   and full coverage.
4. Baked into `boundaries.js` as `GEMEENTE_BOUNDARIES` (tile polygon per
   region) and `CITY_POINTS` (real city coordinate per region).

This means region shapes are a stylized nearest-city partition, not real
administrative or cultural boundaries — reasonable for "which region does
this event affect," not a substitute for real provincie/gemeente borders
if that distinction ever matters later.

Each region tracks 5 resources (`power`, `water`, `drinkingwater`, `food`,
`internet`), each 0–100, with per-tick `production` and `consumption`
(baseline production == consumption, so a healthy region holds steady).

**Sharing via roads:** each tick, a region's stock also drifts toward its
intact-road neighbors' stock (simple diffusion). This is what lets a
healthy neighbor prop up a failing one — and also means propping up a
neighbor costs the healthy region some of its own supply.

**Cascade rule (v1, hardcoded):** if a region's power drops below 20,
drinking-water production is throttled (pumps need power), and internet
production degrades to a "battery backup" trickle for ~4 ticks before
cutting out (cell towers running on backup batteries).

**Events** (triggered by clicking a region, or randomly ~6%/tick):
power plant failure, water main break, ISP outage, food supply chain
disruption, road blockade (isolates the region — no diffusion in/out), and
an emergency-repair action that restores production. Repair exists mainly
so the sim is toy-playable now and is the natural seam for future
player-driven "game" actions — it already goes through the same
`applyEvent()` path any player action would use.

## Overlays

- **Regions & Events** — neutral map, click a region to inspect/trigger events
- **Power** — map background goes dark ("night sky"); regions light up
  proportional to power level, go dark/grey below the outage threshold
- **Food / Water / Drinking water / Internet** — heatmap coloring
  (red → green) per region for that resource

## Known simplifications / next steps

- Road geometry is still straight lines between city points, not real
  route geometry. Real geometry available from Nationaal Wegenbestand
  (NWB), see `docs/resources.md`.
- Region tiles are a nearest-city Voronoi split, not real administrative
  boundaries (see "Region shapes" above) — revisit if the distinction
  between "region" and "municipality/provincie" starts to matter.
- All 5 resources currently share the same diffusion+cascade logic; food
  realistically moves by truck/supply-chain rather than instant grid-style
  diffusion — fine for a playable v1, worth revisiting if food mechanics
  need to feel distinct.
- No persistence/save state, no real "player vs. disaster" game loop yet —
  the engine/event architecture is built so that layer can be added without
  restructuring `sim.js`.
