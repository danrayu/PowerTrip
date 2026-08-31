# Resources

Useful links and references for this project.

## General

-

## Tools

**PDOK BRK bestuurlijke gebieden** — administrative boundary geometry (OGC API Features, GeoJSON, no API key needed).
https://api.pdok.nl/kadaster/brk-bestuurlijke-gebieden/ogc/v1
Collections used so far:
- `gemeentegebied` — municipality boundaries. Query a specific one with `?naam=<gemeente naam>` (e.g. `?naam=Eindhoven`). Note: Den Haag's official gemeente name is `'s-Gravenhage`.
- `provinciegebied` — the 12 province boundaries. `?f=json&limit=20` returns all of them in one call, each feature's `properties.naam` is the province name (e.g. `Noord-Brabant`).
- `landgebied` — the national outline of the Netherlands (single MultiPolygon feature, `properties.naam: "Nederland"`). Used to clip region tiles to the coastline/land border.

Used to build `provinces.js` (province outlines) and the province-clipping step in `boundaries.js` (region tiles) — see `docs/design-v1.md` § "Region shapes".

**PDOK Locatieserver** — free-text geocoder (no API key needed), used for accurate real-world city coordinates.
https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=<city name>&fq=type:woonplaats
Returns the town/city itself (`type:woonplaats`) rather than the municipality it administratively belongs to — the two can differ noticeably (a municipality's polygon centroid is not necessarily where the named city actually is). Response includes `centroide_ll` as `POINT(lon lat)`.

Used to build `CITY_POINTS` in `boundaries.js` — the anchor point for each region's road connections, label, and glow marker.

road geometry api
Nationaal Wegenbestand (NWB) — not yet integrated; road edges in the sim are still hand-picked straight lines between city points, not real route geometry. Next step if road geometry accuracy matters (see `docs/design-v1.md` "Known simplifications").

## Reading / References

- All PDOK BRK bestuurlijke gebieden data is CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.nl).
