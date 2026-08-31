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
share a border — and every tile edge follows either a real province
border or an internal split within a shared province, never cutting
through a province arbitrarily. Built offline (not at runtime) as:

1. Each city's real center point fetched from PDOK Locatieserver
   (`woonplaats` type — the town itself, not the municipality it
   administratively belongs to, which can be centered far from the city).
2. Real provincie polygons fetched from PDOK BRK bestuurlijke gebieden
   (`provinciegebied` collection).
3. Each province is assigned to whichever of the 14 cities are inside it:
   - **exactly one city** → the whole province becomes that city's tile
     (e.g. all of Utrecht province → the Utrecht tile)
   - **multiple cities** (Overijssel: Zwolle/Enschede; Gelderland:
     Arnhem/Nijmegen; Zuid-Holland: Den Haag/Rotterdam; Noord-Brabant:
     Breda/Tilburg/Eindhoven) → the province is split between them via a
     Voronoi diagram clipped to that province's polygon
   - **no city** (Flevoland, Zeeland, Drenthe) → folded into the nearest
     city's tile as a whole province (Flevoland → Zwolle, Zeeland →
     Rotterdam, Drenthe → Groningen)
4. Verified near-zero overlap (<0.01%, floating-point simplification
   noise) and full national coverage.
5. Baked into `boundaries.js` as `GEMEENTE_BOUNDARIES` (tile polygon per
   region) and `CITY_POINTS` (real city coordinate per region).

Region shapes are therefore province-accurate at every internal border
they touch, but are still a stylized "which city owns which province(s)"
partition, not real municipality (gemeente) boundaries.

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
