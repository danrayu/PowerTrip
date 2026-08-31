const svg = document.getElementById("map");
const SVG_NS = "http://www.w3.org/2000/svg";

let state = createInitialState();
let overlay = "events";
let selectedId = null;
let playing = false;
let timer = null;

function glowRadiusFor(pop) {
  return clamp(10 + Math.sqrt(pop) / 40, 14, 46);
}

// value 0-100 -> red (bad) to green (good)
function heatColor(value) {
  const hue = clamp(value, 0, 100) * 1.2; // 0=red, 120=green
  return `hsl(${hue}, 70%, 45%)`;
}

function buildStaticElements() {
  svg.innerHTML = "";

  const viewport = document.createElementNS(SVG_NS, "g");
  viewport.setAttribute("id", "viewport");
  svg.appendChild(viewport);

  const roadsGroup = document.createElementNS(SVG_NS, "g");
  roadsGroup.setAttribute("id", "roads");
  ROADS.forEach(([aId, bId]) => {
    const a = PROJECTED_REGIONS[aId].centroid;
    const b = PROJECTED_REGIONS[bId].centroid;
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("class", "road");
    line.dataset.a = aId;
    line.dataset.b = bId;
    roadsGroup.appendChild(line);
  });
  viewport.appendChild(roadsGroup);

  const regionsGroup = document.createElementNS(SVG_NS, "g");
  regionsGroup.setAttribute("id", "regionNodes");
  REGIONS.forEach((r) => {
    const proj = PROJECTED_REGIONS[r.id];
    const { x: cx, y: cy } = proj.centroid;

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "region-node");
    g.dataset.id = r.id;
    g.style.cursor = "pointer";

    const glow = document.createElementNS(SVG_NS, "circle");
    glow.setAttribute("class", "glow");
    glow.setAttribute("cx", cx);
    glow.setAttribute("cy", cy);
    glow.setAttribute("r", glowRadiusFor(r.pop));
    g.appendChild(glow);

    const shape = document.createElementNS(SVG_NS, "path");
    shape.setAttribute("class", "region-shape");
    shape.setAttribute("d", polygonPathD(proj.points));
    g.appendChild(shape);

    // No always-on label at this density (342 tiles) — name shows in a
    // hover tooltip instead (see hoverLabel below), plus in the region
    // info panel on click.
    g.addEventListener("mouseenter", () => showHoverLabel(proj.name, cx, cy));
    g.addEventListener("mouseleave", hideHoverLabel);
    g.addEventListener("click", () => selectRegion(r.id));
    regionsGroup.appendChild(g);
  });
  viewport.appendChild(regionsGroup);

  const hoverLabel = document.createElementNS(SVG_NS, "text");
  hoverLabel.setAttribute("id", "hoverLabel");
  hoverLabel.setAttribute("class", "region-label hover-label");
  hoverLabel.style.pointerEvents = "none";
  hoverLabel.style.display = "none";
  viewport.appendChild(hoverLabel);

  // Selection highlight: an outline-only path drawn above every tile, so
  // selecting a (possibly tiny) region doesn't eat into its fill area the
  // way thickening its own border would (SVG strokes straddle the path).
  const selectOutline = document.createElementNS(SVG_NS, "path");
  selectOutline.setAttribute("id", "selectOutline");
  selectOutline.setAttribute("class", "region-select-outline");
  selectOutline.style.pointerEvents = "none";
  selectOutline.style.display = "none";
  viewport.appendChild(selectOutline);

  const provincesGroup = document.createElementNS(SVG_NS, "g");
  provincesGroup.setAttribute("id", "provinceBorders");
  provincesGroup.style.pointerEvents = "none";
  Object.entries(PROJECTED_PROVINCES).forEach(([name, points]) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("class", "province-border");
    path.setAttribute("d", polygonPathD(points));
    path.dataset.province = name;
    provincesGroup.appendChild(path);
  });
  viewport.appendChild(provincesGroup);
}

function showHoverLabel(name, x, y) {
  const label = document.getElementById("hoverLabel");
  label.setAttribute("x", x);
  label.setAttribute("y", y);
  label.textContent = name;
  label.style.display = "";
}

function hideHoverLabel() {
  document.getElementById("hoverLabel").style.display = "none";
}

function render() {
  const mapWrap = document.querySelector(".map-wrap");
  mapWrap.classList.toggle("night", overlay === "power");

  document.querySelectorAll(".road").forEach((line) => {
    const cut = state.cutRegions.has(line.dataset.a) || state.cutRegions.has(line.dataset.b);
    line.classList.toggle("cut", cut);
  });

  const selectOutline = document.getElementById("selectOutline");
  if (selectedId && PROJECTED_REGIONS[selectedId]) {
    selectOutline.setAttribute("d", polygonPathD(PROJECTED_REGIONS[selectedId].points));
    selectOutline.style.display = "";
  } else {
    selectOutline.style.display = "none";
  }

  document.querySelectorAll(".region-node").forEach((g) => {
    const region = state.regions[g.dataset.id];
    const shape = g.querySelector(".region-shape");
    const glow = g.querySelector(".glow");

    if (overlay === "events") {
      shape.setAttribute("fill", "#3d6fa5");
      glow.setAttribute("opacity", 0);
    } else if (overlay === "power") {
      const p = region.stats.power;
      const lit = p > 20;
      shape.setAttribute("fill", lit ? "#ffd27a" : "#2a2f3a");
      glow.setAttribute("opacity", lit ? clamp(p / 100, 0.15, 0.8) : 0);
      glow.setAttribute("fill", "#ffe9b0");
    } else {
      const val = region.stats[overlay];
      shape.setAttribute("fill", heatColor(val));
      glow.setAttribute("opacity", 0);
    }
  });

  document.getElementById("tickCount").textContent = state.tick;
  renderNews();
  if (selectedId) renderRegionInfo(selectedId);
}

function renderNews() {
  const el = document.getElementById("newsTicker");
  el.innerHTML = state.log.map((line) => `<div class="news-line">${line}</div>`).join("");
}

function selectRegion(id) {
  selectedId = id;
  renderRegionInfo(id);
  renderEventButtons(id);
  render();
}

function renderRegionInfo(id) {
  const region = state.regions[id];
  const el = document.getElementById("regionInfo");
  el.innerHTML = `
    <p class="region-name">${region.name} <span class="muted">(${region.pop.toLocaleString()} people)</span></p>
    <ul class="stat-list">
      ${RESOURCE_KEYS.map((k) => `
        <li>
          <span>${RESOURCE_LABELS[k]}</span>
          <div class="bar"><div class="bar-fill" style="width:${region.stats[k]}%; background:${heatColor(region.stats[k])}"></div></div>
          <span class="stat-value">${Math.round(region.stats[k])}</span>
        </li>`).join("")}
    </ul>
    ${state.cutRegions.has(id) ? '<p class="warning">Roads cut — isolated from grid sharing.</p>' : ""}
  `;
}

function renderEventButtons(id) {
  const el = document.getElementById("eventButtons");
  el.innerHTML = "";
  EVENT_TYPES.forEach((def) => {
    const btn = document.createElement("button");
    btn.textContent = def.label;
    btn.addEventListener("click", () => {
      applyEvent(state, id, def.id);
      render();
    });
    el.appendChild(btn);
  });
}

function stepOnce() {
  tick(state);
  maybeRandomEvent();
  render();
}

function maybeRandomEvent() {
  if (Math.random() > 0.06) return;
  const ids = Object.keys(state.regions);
  const regionId = ids[Math.floor(Math.random() * ids.length)];
  const candidates = EVENT_TYPES.filter((e) => e.id !== "repair_all");
  const def = candidates[Math.floor(Math.random() * candidates.length)];
  applyEvent(state, regionId, def.id);
}

function setOverlay(name) {
  overlay = name;
  document.querySelectorAll(".overlay-buttons button").forEach((b) => {
    b.classList.toggle("active", b.dataset.overlay === name);
  });
  render();
}

function togglePlay() {
  playing = !playing;
  document.getElementById("playBtn").textContent = playing ? "⏸ Pause" : "▶ Play";
  if (playing) {
    const speed = document.getElementById("speed").value;
    timer = setInterval(stepOnce, speed);
  } else {
    clearInterval(timer);
  }
}

document.getElementById("playBtn").addEventListener("click", togglePlay);
document.getElementById("tickBtn").addEventListener("click", stepOnce);
document.getElementById("speed").addEventListener("input", (e) => {
  if (playing) {
    clearInterval(timer);
    timer = setInterval(stepOnce, e.target.value);
  }
});
document.querySelectorAll(".overlay-buttons button").forEach((b) => {
  b.addEventListener("click", () => setOverlay(b.dataset.overlay));
});

// --- Zoom & pan ---
// Applied as a transform on the #viewport group only, so every layer
// (roads, tiles, hover/selection outlines, province borders) pans/zooms
// together and all existing hit-testing/coordinates stay untouched.
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
// Start zoomed out to MIN_ZOOM, centered in the viewBox (geo.js's
// projector fills the viewBox at scale 1, so shrinking without
// re-centering would leave the map pinned to the top-left corner).
let zoom = {
  k: MIN_ZOOM,
  tx: (VIEW_W * (1 - MIN_ZOOM)) / 2,
  ty: (VIEW_H * (1 - MIN_ZOOM)) / 2,
};

function applyZoom() {
  document.getElementById("viewport").setAttribute(
    "transform",
    `translate(${zoom.tx},${zoom.ty}) scale(${zoom.k})`
  );
}

// Screen (client) point -> viewBox-space point. svg#map's own CTM maps
// screen pixels to the 0..800/0..900 viewBox space based on viewBox +
// element size alone — it's unaffected by the transform we put on the
// inner #viewport group, so this stays correct at any zoom/pan level.
function toSvgPoint(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function zoomAt(clientX, clientY, factor) {
  const p = toSvgPoint(clientX, clientY);
  const newK = clamp(zoom.k * factor, MIN_ZOOM, MAX_ZOOM);
  // Keep the point under the cursor fixed on screen: solve for the new
  // translation given the map-space point currently under the cursor.
  const ox = (p.x - zoom.tx) / zoom.k;
  const oy = (p.y - zoom.ty) / zoom.k;
  zoom = { k: newK, tx: p.x - newK * ox, ty: p.y - newK * oy };
  applyZoom();
}

svg.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0015);
  zoomAt(e.clientX, e.clientY, factor);
}, { passive: false });

let panning = false;
let panLast = null;
let panMoved = false; // did this drag move enough to not be a click?
svg.addEventListener("mousedown", (e) => {
  panning = true;
  panMoved = false;
  panLast = toSvgPoint(e.clientX, e.clientY);
});
window.addEventListener("mousemove", (e) => {
  if (!panning) return;
  const p = toSvgPoint(e.clientX, e.clientY);
  zoom.tx += p.x - panLast.x;
  zoom.ty += p.y - panLast.y;
  if (Math.abs(p.x - panLast.x) > 0.5 || Math.abs(p.y - panLast.y) > 0.5) panMoved = true;
  panLast = p;
  applyZoom();
});
window.addEventListener("mouseup", () => { panning = false; });
// A drag that actually panned shouldn't also select the region under the
// cursor — swallow the click that follows it (capture phase, so it never
// reaches a region-node's own click listener).
svg.addEventListener("click", (e) => {
  if (panMoved) { e.stopPropagation(); panMoved = false; }
}, true);
svg.style.cursor = "grab";

buildStaticElements();
applyZoom();
render();
