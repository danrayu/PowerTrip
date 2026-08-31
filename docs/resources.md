# Resources

Useful links and references for this project.

## General

-

## Tools

**PDOK BRK bestuurlijke gebieden** — administrative boundary geometry (OGC API Features, GeoJSON, no API key needed).
https://api.pdok.nl/kadaster/brk-bestuurlijke-gebieden/ogc/v1
Collections used so far:
- `gemeentegebied` — municipality boundaries, one feature per gemeente
  (`properties.naam`, `properties.code`). `?f=json&limit=1000` returns all
  342 in a single call, no pagination needed. Query a specific one with
  `?naam=<gemeente naam>` (e.g. `?naam=Eindhoven`). Note: Den Haag's
  official gemeente name is `'s-Gravenhage`.
- `provinciegebied` — the 12 province boundaries. `?f=json&limit=20` returns all of them in one call, each feature's `properties.naam` is the province name (e.g. `Noord-Brabant`).
- `landgebied` — the national outline of the Netherlands (single MultiPolygon feature, `properties.naam: "Nederland"`). Used to clip region tiles to the coastline/land border.

Used to build `provinces.js` (province outlines) and `boundaries.js`
(one tile per real municipality, simplified and clipped to the national
outline) — see `docs/design-v1.md` § "Region shapes".

**CBS StatLine OData API** — population by municipality (no API key needed).
`https://opendata.cbs.nl/ODataApi/odata/83765NED/TypedDataSet?$filter=startswith(WijkenEnBuurten,'GM')&$select=WijkenEnBuurten,Gemeentenaam_1,AantalInwoners_5&$top=1000`
Table `83765NED` ("Kerncijfers wijken en buurten"), filtered to gemeente-level
rows (`WijkenEnBuurten` starting with `GM`). `AantalInwoners_5` is
population; match on the `GM####` code, not name (names have trailing
padding in this table). Doesn't include municipalities formed by mergers
after the table's vintage — see `docs/design-v1.md` for the fallback used
for those. Used to populate `pop` in `data.js`.

**PDOK Locatieserver** — free-text geocoder (no API key needed), used for accurate real-world city coordinates.
https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=<city name>&fq=type:woonplaats
Returns the town/city itself (`type:woonplaats`) rather than the municipality it administratively belongs to — the two can differ noticeably (a municipality's polygon centroid is not necessarily where the named city actually is). Response includes `centroide_ll` as `POINT(lon lat)`.

No longer used since the move to all-342-municipalities tiling —
`CITY_POINTS` in `boundaries.js` is now each polygon's `representative_point()`
(shapely), not a geocoded town center; 342 individual Locatieserver calls
weren't worth it for a fast in-polygon point. Kept here in case per-city
accuracy matters again for a smaller subset.

road geometry api
Nationaal Wegenbestand (NWB) — not yet integrated; road edges in the sim are still hand-picked straight lines between city points, not real route geometry. Next step if road geometry accuracy matters (see `docs/design-v1.md` "Known simplifications").

## Reading / References

- All PDOK BRK bestuurlijke gebieden data is CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.nl).
