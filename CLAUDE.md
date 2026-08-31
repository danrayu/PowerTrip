# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Power Trip" — a static, no-build web app simulating cascading infrastructure
failure (power/water/drinking water/food/internet) across a tiled map of
major Dutch city-regions. Built to be shareable/viral first, with the
simulation engine kept separate from rendering so a player-driven "game"
layer can be added later without restructuring.

## Running it

No build step, no dependencies, no package manager. Just open `index.html`
in a browser (`file://` works directly — no server required).

There is no test suite, linter, or build command in this repo.

## Architecture

Plain HTML/SVG/JS, loaded via `<script>` tags in this order (`index.html`):
`boundaries.js` → `provinces.js` → `geo.js` → `data.js` → `sim.js` → `app.js`.
Everything is a global (no modules/bundler), so load order matters.

- **`sim.js`** — pure simulation engine, no DOM knowledge. Owns `WorldState`
  (`createInitialState()`), advances it one tick at a time (`tick()`), and
  applies discrete events (`applyEvent()`). This separation is deliberate:
  a later player-driven "game" layer is meant to feed new event types into
  `applyEvent()` rather than requiring a rewrite.
- **`data.js`** — static region metadata (id/name/population), road edges
  between regions, the 5 resource keys, and `EVENT_TYPES` (what each event
  does to a region's `production`/`state.cutRegions`).
- **`boundaries.js`** (generated, not hand-written — see below) — each
  region's real-world polygon (`GEMEENTE_BOUNDARIES`) and each city's real
  center point (`CITY_POINTS`).
- **`provinces.js`** (generated) — real province outlines, drawn as a
  reference overlay only; provinces are not simulation units.
- **`geo.js`** — projects the lon/lat geometry from `boundaries.js` /
  `provinces.js` into the SVG's `0..800 / 0..900` viewBox with one shared
  equirectangular projection, so regions/city points/provinces all line up.
  Exposes `PROJECTED_REGIONS`, `PROJECTED_PROVINCES`, `polygonPathD()`.
- **`app.js`** — SVG rendering + UI wiring. Builds the static SVG once
  (`buildStaticElements()`), then re-paints per tick/overlay change
  (`render()`). Reads sim state, never mutates it directly except through
  `applyEvent()`/`tick()`.

### Region shapes are generated, not hand-authored

`boundaries.js` and `provinces.js` are baked output from one-off Python
scripts (using `shapely`/`scipy` in a throwaway venv) that fetch real
geometry from PDOK and compute a province-accurate Voronoi tessellation —
see `docs/design-v1.md` § "Region shapes" for the exact algorithm and
`docs/resources.md` for the PDOK endpoints/collections used. There is no
committed build script; regenerating these files means re-deriving that
process (fetch from PDOK → shapely/scipy → write the JS literal). Do not
hand-edit the polygon data in these two files.

### Simulation model

Each region tracks 5 resources (`power`, `water`, `drinkingwater`, `food`,
`internet`), 0–100, with per-tick `production`/`consumption` (healthy
baseline: production == consumption). Two mechanics drive the cascade:

- **Diffusion**: each tick, a region's stock drifts toward its intact-road
  neighbors' stock — this is what lets a healthy region prop up a failing
  one, at a cost to its own supply.
- **Cascade rule**: power below 20 throttles `drinkingwater` production and
  degrades `internet` production to a "battery backup" trickle before it
  cuts out after a few ticks (see `sim.js`).

`EVENT_TYPES` in `data.js` are the only way region state changes outside
the tick loop (plant failures, road blockades, ISP outages, repairs, plus
random events in `app.js`'s `maybeRandomEvent()`).

## Docs

- `docs/design-v1.md` — the authoritative design writeup: file responsibilities,
  simulation model, overlays, and known simplifications/next steps.
- `docs/resources.md` — external data sources (PDOK API collections/endpoints)
  used for geographic accuracy, with exact query patterns.

Keep both updated when the simulation model or data sources change — they're
the source of truth for *why* the code looks the way it does, not just prose
seen once during a chat session.
