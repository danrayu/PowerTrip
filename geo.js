// Projects the real lon/lat region tiles (GEMEENTE_BOUNDARIES) and city
// points (CITY_POINTS) into the SVG's 0..800 / 0..900 viewBox.
//
// GEMEENTE_BOUNDARIES holds a Voronoi cell per city, already clipped to
// the real national outline (computed offline — see boundaries.js header),
// so the tiles are contiguous: they share borders with their neighbors
// instead of floating as separate shapes. CITY_POINTS holds each city's
// actual town-center coordinate (not a polygon centroid), used as the
// road-anchor / label position so it lines up with the real city, even
// when its tile is irregularly shaped.
//
// Simple equirectangular projection with a shared bbox across all tiles,
// scaled/padded to fit the viewBox — accurate enough at this zoom level
// for the Netherlands' latitude range.

const VIEW_W = 800;
const VIEW_H = 900;
const PADDING = 40;

function computeProjectedRegions() {
  const ids = Object.keys(GEMEENTE_BOUNDARIES);

  let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
  ids.forEach((id) => {
    GEMEENTE_BOUNDARIES[id].ring.forEach(([lon, lat]) => {
      lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
      latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat);
    });
  });

  const latMid = (latMin + latMax) / 2;
  const lonScale = Math.cos((latMid * Math.PI) / 180); // correct for lon compression at this latitude

  const spanX = (lonMax - lonMin) * lonScale;
  const spanY = latMax - latMin;
  const scale = Math.min((VIEW_W - PADDING * 2) / spanX, (VIEW_H - PADDING * 2) / spanY);

  const offsetX = PADDING + ((VIEW_W - PADDING * 2) - spanX * scale) / 2;
  const offsetY = PADDING + ((VIEW_H - PADDING * 2) - spanY * scale) / 2;

  function project([lon, lat]) {
    const x = offsetX + (lon - lonMin) * lonScale * scale;
    const y = offsetY + (latMax - lat) * scale; // flip: north = up
    return [x, y];
  }

  const projected = {};
  ids.forEach((id) => {
    const points = GEMEENTE_BOUNDARIES[id].ring.map(project);
    const city = CITY_POINTS[id];
    const [px, py] = project([city.lon, city.lat]);
    projected[id] = {
      name: GEMEENTE_BOUNDARIES[id].name,
      points,
      centroid: { x: px, y: py }, // actual city-center point, not polygon centroid
    };
  });
  return projected;
}

const PROJECTED_REGIONS = computeProjectedRegions();

function polygonPathD(points) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
}
