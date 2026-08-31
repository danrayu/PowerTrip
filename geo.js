// Projects the real lon/lat municipality boundaries (GEMEENTE_BOUNDARIES,
// from PDOK) into the SVG's 0..800 / 0..900 viewBox, and derives each
// region's centroid (used for road anchors, labels, and the glow effect).
//
// Simple equirectangular projection with a shared bbox across all regions,
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

  function centroid(points) {
    // polygon centroid (shoelace-weighted); falls back to averaging if degenerate
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const cross = x1 * y2 - x2 * y1;
      area += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    area /= 2;
    if (Math.abs(area) < 1e-6) {
      const n = points.length;
      const avg = points.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
      return [avg[0] / n, avg[1] / n];
    }
    return [cx / (6 * area), cy / (6 * area)];
  }

  const projected = {};
  ids.forEach((id) => {
    const points = GEMEENTE_BOUNDARIES[id].ring.map(project);
    const [cx, cy] = centroid(points);
    projected[id] = {
      name: GEMEENTE_BOUNDARIES[id].name,
      points,
      centroid: { x: cx, y: cy },
    };
  });
  return projected;
}

const PROJECTED_REGIONS = computeProjectedRegions();

function polygonPathD(points) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
}
