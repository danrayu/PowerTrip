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

All 342 Dutch municipalities (gemeenten), one tile per real municipality.
Connected by shared-border adjacency (see below) — 934 edges, not a
hand-picked motorway-corridor approximation.

### Region shapes

Regions are rendered as an actual tiling of the country — every point in
the Netherlands belongs to exactly one region, and neighboring regions
share a border. Every tile *is* a real municipality (gemeente) boundary,
not a stylized province split. Built offline (not at runtime) as:

1. All 342 `gemeentegebied` features fetched in one call from PDOK BRK
   bestuurlijke gebieden (no pagination needed — the collection fits
   under the default query limit).
2. Each municipality polygon clipped to the national outline
   (`landgebied` collection).
3. Each polygon simplified (Douglas-Peucker, ~30m tolerance, topology
   preserved) to keep `boundaries.js` a reasonable size — raw PDOK vertex
   density produced a 14MB file; simplified it's ~800KB.
4. Adjacency (`ROADS` in `data.js`) derived automatically: an edge exists
   between any two municipalities whose (slightly buffered, to bridge
   floating-point gaps) polygons touch.
5. Each tile's anchor point (`CITY_POINTS`, used for road lines, glow
   marker, hover label) is the polygon's `representative_point()` —
   guaranteed inside the shape. Not a geocoded town center: at 342 tiles,
   342 individual PDOK Locatieserver calls no longer materially change
   the map over a fast in-polygon point.
6. Population (`pop` in `data.js`, drives glow-marker sizing only) comes
   from CBS StatLine table `83765NED` (`AantalInwoners`), matched by
   gemeente code. A handful of municipalities formed by post-2020 mergers
   (e.g. Land van Cuijk, Voorne aan Zee) aren't in that table; their `pop`
   is an area × average-density estimate instead — fine for glow sizing,
   not accurate for anything else.
7. Baked into `boundaries.js` as `GEMEENTE_BOUNDARIES` (tile polygon per
   region) and `CITY_POINTS` (anchor point per region), and into
   `data.js` as `REGIONS`/`ROADS`.

`sim.js` is unaffected by this change — it only ever consumed `ROADS` as
an edge list to build a neighbor map, regardless of how those edges were
derived.

At this density, per-tile labels are shown on hover (and in the region
info panel on click) rather than always-on, to keep the map legible —
see `showHoverLabel()`/`hideHoverLabel()` in `app.js`.

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

- Road geometry is still straight lines between tile anchor points, not
  real route geometry. Real geometry available from Nationaal Wegenbestand
  (NWB), see `docs/resources.md`.
- `CITY_POINTS` are polygon representative points, not real town centers —
  fine for anchoring road lines/labels but not meant as a precise city
  coordinate.
- `pop` for a handful of post-2020 merged municipalities is an area-density
  estimate, not a real CBS figure (see "Region shapes" above).
- All 5 resources currently share the same diffusion+cascade logic; food
  realistically moves by truck/supply-chain rather than instant grid-style
  diffusion — fine for a playable v1, worth revisiting if food mechanics
  need to feel distinct.
- No persistence/save state, no real "player vs. disaster" game loop yet —
  the engine/event architecture is built so that layer can be added without
  restructuring `sim.js`.
