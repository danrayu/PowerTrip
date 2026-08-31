// Projects real lon/lat geometry into the SVG's 0..800 / 0..900 viewBox:
//   - GEMEENTE_BOUNDARIES: a Voronoi tile per city (simulation regions),
//     clipped to the national outline — see boundaries.js header.
//   - CITY_POINTS: each city's actual town-center coordinate, used for
//     road anchors / labels / glow so they sit on the real city even on
//     an irregular tile.
//   - PROVINCE_BOUNDARIES: real provincie outlines (provinces.js),
//     drawn as a reference overlay — not simulation units.
//
// All three share one equirectangular projection (same bbox/scale/offset)
// so region tiles and province borders line up correctly on screen.

const VIEW_W = 800;
const VIEW_H = 900;
const PADDING = 40;

function buildProjector() {
  let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;
  const extend = ([lon, lat]) => {
    lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
    latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat);
  };
  Object.values(GEMEENTE_BOUNDARIES).forEach((r) => r.ring.forEach(extend));
  Object.values(PROVINCE_BOUNDARIES).forEach((ring) => ring.forEach(extend));

  const latMid = (latMin + latMax) / 2;
  const lonScale = Math.cos((latMid * Math.PI) / 180); // correct for lon compression at this latitude

  const spanX = (lonMax - lonMin) * lonScale;
  const spanY = latMax - latMin;
  const scale = Math.min((VIEW_W - PADDING * 2) / spanX, (VIEW_H - PADDING * 2) / spanY);

  const offsetX = PADDING + ((VIEW_W - PADDING * 2) - spanX * scale) / 2;
  const offsetY = PADDING + ((VIEW_H - PADDING * 2) - spanY * scale) / 2;

  return ([lon, lat]) => [
    offsetX + (lon - lonMin) * lonScale * scale,
    offsetY + (latMax - lat) * scale, // flip: north = up
  ];
}

const project = buildProjector();

function computeProjectedRegions() {
  const projected = {};
  Object.keys(GEMEENTE_BOUNDARIES).forEach((id) => {
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

function computeProjectedProvinces() {
  const projected = {};
  Object.keys(PROVINCE_BOUNDARIES).forEach((name) => {
    projected[name] = PROVINCE_BOUNDARIES[name].map(project);
  });
  return projected;
}

const PROJECTED_REGIONS = computeProjectedRegions();
const PROJECTED_PROVINCES = computeProjectedProvinces();

function polygonPathD(points) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
}
