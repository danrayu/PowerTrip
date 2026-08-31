const svg = document.getElementById("map");
const SVG_NS = "http://www.w3.org/2000/svg";

let state = createInitialState();
let overlay = "events";
let selectedId = null;
let playing = false;
let timer = null;

function radiusFor(pop) {
  return clamp(6 + Math.sqrt(pop) / 60, 6, 26);
}

// value 0-100 -> red (bad) to green (good)
function heatColor(value) {
  const hue = clamp(value, 0, 100) * 1.2; // 0=red, 120=green
  return `hsl(${hue}, 70%, 45%)`;
}

function buildStaticElements() {
  svg.innerHTML = "";

  const roadsGroup = document.createElementNS(SVG_NS, "g");
  roadsGroup.setAttribute("id", "roads");
  ROADS.forEach(([aId, bId]) => {
    const a = REGIONS.find((r) => r.id === aId);
    const b = REGIONS.find((r) => r.id === bId);
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
  svg.appendChild(roadsGroup);

  const regionsGroup = document.createElementNS(SVG_NS, "g");
  regionsGroup.setAttribute("id", "regionNodes");
  REGIONS.forEach((r) => {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "region-node");
    g.dataset.id = r.id;
    g.style.cursor = "pointer";

    const glow = document.createElementNS(SVG_NS, "circle");
    glow.setAttribute("class", "glow");
    glow.setAttribute("cx", r.x);
    glow.setAttribute("cy", r.y);
    g.appendChild(glow);

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("class", "region-circle");
    circle.setAttribute("cx", r.x);
    circle.setAttribute("cy", r.y);
    circle.setAttribute("r", radiusFor(r.pop));
    g.appendChild(circle);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", r.x);
    label.setAttribute("y", r.y - radiusFor(r.pop) - 6);
    label.setAttribute("class", "region-label");
    label.textContent = r.name;
    g.appendChild(label);

    g.addEventListener("click", () => selectRegion(r.id));
    regionsGroup.appendChild(g);
  });
  svg.appendChild(regionsGroup);
}

function render() {
  const mapWrap = document.querySelector(".map-wrap");
  mapWrap.classList.toggle("night", overlay === "power");

  document.querySelectorAll(".road").forEach((line) => {
    const cut = state.cutRegions.has(line.dataset.a) || state.cutRegions.has(line.dataset.b);
    line.classList.toggle("cut", cut);
  });

  document.querySelectorAll(".region-node").forEach((g) => {
    const region = state.regions[g.dataset.id];
    const circle = g.querySelector(".region-circle");
    const glow = g.querySelector(".glow");
    const r = radiusFor(region.pop);
    glow.setAttribute("r", r * 2.2);
    g.classList.toggle("selected", g.dataset.id === selectedId);

    if (overlay === "events") {
      circle.setAttribute("fill", "#3d6fa5");
      glow.setAttribute("opacity", 0);
    } else if (overlay === "power") {
      const p = region.stats.power;
      const lit = p > 20;
      circle.setAttribute("fill", lit ? "#ffd27a" : "#2a2f3a");
      glow.setAttribute("opacity", lit ? clamp(p / 100, 0.15, 0.8) : 0);
      glow.setAttribute("fill", "#ffe9b0");
    } else {
      const val = region.stats[overlay];
      circle.setAttribute("fill", heatColor(val));
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

buildStaticElements();
render();
