# Power Trip — v1 (basic prototype)

Static, no-build web app simulating cascading infrastructure failure across
major Dutch city-regions, connected by roads.

## Files

- `index.html` — page shell, controls, overlay/event panels
- `data.js` — region positions/population, road edges, resource keys, event definitions
- `sim.js` — pure simulation engine (no DOM knowledge): world state, `tick()`, `applyEvent()`
- `app.js` — SVG rendering + UI wiring, reads sim state each tick
- `style.css` — visual styling, including the "night map" power overlay

## Model

14 regions (Amsterdam, Rotterdam, Den Haag, Utrecht, Eindhoven, Tilburg,
Groningen, Maastricht, Arnhem, Nijmegen, Breda, Zwolle, Enschede,
Leeuwarden), positions hand-placed to loosely resemble NL geography — not
real coordinates. Connected by 15 hand-picked road edges approximating the
motorway network.

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

- Region shapes are simplified dots, not real administrative boundaries.
  Real boundary polygons are available from the PDOK BRK bestuurlijke
  gebieden API (see `docs/resources.md`).
- Road geometry is straight lines between hand-placed points, not real
  route geometry. Real geometry available from Nationaal Wegenbestand
  (NWB), also in `docs/resources.md`.
- All 5 resources currently share the same diffusion+cascade logic; food
  realistically moves by truck/supply-chain rather than instant grid-style
  diffusion — fine for a playable v1, worth revisiting if food mechanics
  need to feel distinct.
- No persistence/save state, no real "player vs. disaster" game loop yet —
  the engine/event architecture is built so that layer can be added without
  restructuring `sim.js`.
