/**
 * app.js – SIG GoRide: Peta Interaktif Mirip Google Maps
 *
 * Menggunakan CrootJS dari versi tetap:
 *   https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.16/element.js
 *
 * API CrootJS yang digunakan:
 *   - onClick(id, fn)  → event listener klik melalui CrootJS
 *
 * Peta menggunakan tile OpenStreetMap (tile.openstreetmap.org) yang
 * diambil langsung dengan fetch/img — tanpa library pemetaan.
 * Proyeksi: Web Mercator (EPSG:3857) untuk akurasi seperti Google Maps.
 */

// ── Import CrootJS (element.js) ──────────────────────────────────────────────
import { onClick } from "https://cdn.jsdelivr.net/gh/crootjs/lib@0.0.16/element.js";

const getElement = id => document.getElementById(id);

// ── Konstanta ────────────────────────────────────────────────────────────────
const GEOJSON_PATH   = "./rute-cimahi.geojson";
const TARIF          = "Rp10.000";
const TILE_SIZE      = 256;
const MIN_ZOOM       = 13;
const MAX_ZOOM       = 19;
const TILE_URL       = (z, x, y) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

// ── State Peta ───────────────────────────────────────────────────────────────
let state = {
  zoom:    16,
  centerX: 0,     // pixel X titik tengah pada zoom saat ini
  centerY: 0,     // pixel Y titik tengah pada zoom saat ini
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartCX: 0,
  dragStartCY: 0,
  routeCoords: [], // [[lon, lat], …]
  geoData: null,
};

// ── Proyeksi Web Mercator ─────────────────────────────────────────────────────
/**
 * Konversi (lon, lat) ke koordinat tile pixel (px, py) global
 * pada tingkat zoom z.
 * Formula standar OpenStreetMap / Google Maps.
 */
function lonLatToPixel(lon, lat, zoom) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = (lon + 180) / 360 * scale;
  const sinLat = Math.sin(lat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Konversi koordinat pixel global ke (lon, lat).
 */
function pixelToLonLat(px, py, zoom) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lon = px / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * py / scale;
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lon, lat };
}

/**
 * Koordinat global pixel → koordinat layar (relatif terhadap viewport).
 */
function globalToScreen(gx, gy) {
  const mapEl = getElement("map-fullscreen");
  const w = mapEl ? mapEl.offsetWidth  : window.innerWidth;
  const h = mapEl ? mapEl.offsetHeight : window.innerHeight;
  return {
    sx: gx - state.centerX + w / 2,
    sy: gy - state.centerY + h / 2,
  };
}

// ── Haversine ────────────────────────────────────────────────────────────────
function haversine(c1, c2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(c2[1] - c1[1]);
  const dLon = toRad(c2[0] - c1[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1[1])) * Math.cos(toRad(c2[1])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalLength(coords) {
  let d = 0;
  for (let i = 1; i < coords.length; i++) d += haversine(coords[i-1], coords[i]);
  return d;
}

function fmtDist(m) {
  return m >= 1000 ? (m / 1000).toFixed(2) + " km" : Math.round(m) + " m";
}

function fmtCoord([lon, lat]) {
  return `${lat.toFixed(6)}° LS, ${lon.toFixed(6)}° BT`;
}

function fmtTime(m) {
  // Asumsi rata-rata 25 km/jam (kota)
  const menit = Math.round(m / (25000 / 60));
  if (menit < 60) return menit + " menit";
  return Math.floor(menit / 60) + " jam " + (menit % 60) + " mnt";
}

// ── Render Tile ───────────────────────────────────────────────────────────────
function renderTiles() {
  const tileLayer = getElement("tile-layer");
  if (!tileLayer) return;

  const mapEl = getElement("map-fullscreen");
  const W = mapEl ? mapEl.offsetWidth  : window.innerWidth;
  const H = mapEl ? mapEl.offsetHeight : window.innerHeight;

  const z = state.zoom;
  const totalTiles = Math.pow(2, z);

  // Hitung tile asal (kiri atas viewport)
  const topLeftGX = state.centerX - W / 2;
  const topLeftGY = state.centerY - H / 2;

  const tileX0 = Math.floor(topLeftGX / TILE_SIZE);
  const tileY0 = Math.floor(topLeftGY / TILE_SIZE);
  const tileX1 = Math.ceil((topLeftGX + W) / TILE_SIZE);
  const tileY1 = Math.ceil((topLeftGY + H) / TILE_SIZE);

  // Offset pixel: jarak dari tepi kiri viewport ke batas kiri tile pertama
  const offsetX = tileX0 * TILE_SIZE - topLeftGX;
  const offsetY = tileY0 * TILE_SIZE - topLeftGY;

  // Build tile nodes without inline HTML or event-handler attributes.
  const tileGrid = document.createElement("div");
  tileGrid.className = "tile-grid";
  tileGrid.style.transform = `translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px)`;

  for (let ty = tileY0; ty < tileY1; ty++) {
    const row = document.createElement("div");
    row.className = "tile-row";
    for (let tx = tileX0; tx < tileX1; tx++) {
      const xtile = ((tx % totalTiles) + totalTiles) % totalTiles;
      const ytile = Math.max(0, Math.min(totalTiles - 1, ty));
      const tile = document.createElement("img");
      tile.className = "map-tile";
      tile.width = TILE_SIZE;
      tile.height = TILE_SIZE;
      tile.loading = "eager";
      tile.draggable = false;
      tile.alt = "";
      tile.addEventListener("load", () => tile.classList.add("loaded"), { once: true });
      tile.src = TILE_URL(z, xtile, ytile);
      row.appendChild(tile);
    }
    tileGrid.appendChild(row);
  }
  tileLayer.replaceChildren(tileGrid);
}

// ── Render Rute SVG ───────────────────────────────────────────────────────────
function renderRoute() {
  const svg = getElement("route-svg");
  if (!svg || state.routeCoords.length < 2) return;

  const coords = state.routeCoords;
  const z = state.zoom;

  // Konversi semua koordinat ke layar
  const pts = coords.map(([lon, lat]) => {
    const { x, y } = lonLatToPixel(lon, lat, z);
    const { sx, sy } = globalToScreen(x, y);
    return `${sx.toFixed(1)},${sy.toFixed(1)}`;
  });
  const pointsStr = pts.join(" ");

  // Titik awal & akhir
  const [slon, slat] = coords[0];
  const [elon, elat] = coords[coords.length - 1];
  const sp = lonLatToPixel(slon, slat, z);
  const ep = lonLatToPixel(elon, elat, z);
  const ss = globalToScreen(sp.x, sp.y);
  const es = globalToScreen(ep.x, ep.y);

  svg.innerHTML = `
    <defs>
      <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.22)"/>
      </filter>
      <filter id="marker-shadow" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>

    <!-- Halo putih -->
    <polyline points="${pointsStr}" class="route-outline"/>
    <!-- Garis biru utama -->
    <polyline points="${pointsStr}" class="route-line"/>
    <!-- Dash arah -->
    <polyline points="${pointsStr}" class="route-dash"/>

    ${buildPin(ss.sx, ss.sy, "#0f9d58", "#fff", "A", "ULBI")}
    ${buildPin(es.sx, es.sy, "#d93025", "#fff", "B", "Cihanjuang")}
  `;
}

/**
 * Membangun SVG untuk pin marker ala Google Maps.
 */
function buildPin(x, y, color, textColor, label, title) {
  // Posisi bayangan elips di bawah pin
  const shadowY = y + 32;
  return `
    <g class="pin-group" aria-label="${title}">
      <!-- Bayangan -->
      <ellipse cx="${x}" cy="${shadowY}" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/>
      <!-- Tubuh pin (teardrop) -->
      <path d="
        M ${x} ${y - 28}
        m -14 0
        a 14 14 0 1 1 28 0
        q 0 10 -14 28
        q -14 -18 -14 -28
        z
      " fill="${color}" filter="url(#marker-shadow)"/>
      <!-- Lingkaran dalam -->
      <circle cx="${x}" cy="${y - 28}" r="7" fill="white" opacity="0.9"/>
      <!-- Label -->
      <text x="${x}" y="${y - 24}" text-anchor="middle"
        font-family="'Roboto','Inter',sans-serif" font-size="9" font-weight="700"
        fill="${color}">${label}</text>
      <!-- Tooltip kecil -->
      <rect x="${x - 30}" y="${y - 56}" width="60" height="18" rx="4"
        fill="rgba(0,0,0,0.7)" opacity="0"/>
      <text x="${x}" y="${y - 43}" text-anchor="middle"
        font-family="'Roboto','Inter',sans-serif" font-size="8.5" fill="#fff" opacity="0">${title}</text>
    </g>
  `;
}

// ── Render Semua ─────────────────────────────────────────────────────────────
function renderAll() {
  renderTiles();
  renderRoute();
  updateZoomUI();
}

function updateZoomUI() {
  // Update status zoom indicator jika ada
  const zi = getElement("zoom-indicator");
  if (zi) zi.textContent = `Zoom ${state.zoom}`;

  // Disable/enable tombol zoom
  const zin  = getElement("btn-zoom-in");
  const zout = getElement("btn-zoom-out");
  if (zin)  zin.disabled  = state.zoom >= MAX_ZOOM;
  if (zout) zout.disabled = state.zoom <= MIN_ZOOM;
}

// ── Pusatkan ke Rute ─────────────────────────────────────────────────────────
function centerOnRoute() {
  if (state.routeCoords.length === 0) return;

  const mapEl    = getElement("map-fullscreen");
  const W = mapEl ? mapEl.offsetWidth  : window.innerWidth;
  const H = mapEl ? mapEl.offsetHeight : window.innerHeight;
  const panelH = 200; // reservasi untuk bottom panel

  // Hitung bounds koordinat
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of state.routeCoords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Cari zoom terbaik agar rute muat di layar (dengan padding)
  const PAD = 80;
  let bestZoom = MIN_ZOOM;
  for (let z = MAX_ZOOM; z >= MIN_ZOOM; z--) {
    const p1 = lonLatToPixel(minLon, minLat, z);
    const p2 = lonLatToPixel(maxLon, maxLat, z);
    const rw = Math.abs(p2.x - p1.x);
    const rh = Math.abs(p1.y - p2.y);
    if (rw <= W - PAD * 2 && rh <= H - panelH - PAD * 2) {
      bestZoom = z;
      break;
    }
  }

  state.zoom = bestZoom;

  // Tengah koordinat → pixel global
  const midLon = (minLon + maxLon) / 2;
  const midLat = (minLat + maxLat) / 2;
  const mid = lonLatToPixel(midLon, midLat, state.zoom);

  // Offset ke atas agar tidak tertutup panel
  state.centerX = mid.x;
  state.centerY = mid.y + panelH / 2;

  renderAll();
}

// ── Drag (Pan) ────────────────────────────────────────────────────────────────
function initDrag() {
  const tileLayer = getElement("tile-layer");
  if (!tileLayer) return;

  // Mouse
  tileLayer.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    state.dragStartCX = state.centerX;
    state.dragStartCY = state.centerY;
  });

  document.addEventListener("mousemove", (e) => {
    if (!state.dragging) return;
    state.centerX = state.dragStartCX - (e.clientX - state.dragStartX);
    state.centerY = state.dragStartCY - (e.clientY - state.dragStartY);
    renderAll();
  });

  document.addEventListener("mouseup", () => { state.dragging = false; });

  // Touch
  let lastTouches = null;
  tileLayer.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      state.dragging = true;
      state.dragStartX = e.touches[0].clientX;
      state.dragStartY = e.touches[0].clientY;
      state.dragStartCX = state.centerX;
      state.dragStartCY = state.centerY;
    }
    lastTouches = e.touches;
  }, { passive: true });

  tileLayer.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && state.dragging) {
      state.centerX = state.dragStartCX - (e.touches[0].clientX - state.dragStartX);
      state.centerY = state.dragStartCY - (e.touches[0].clientY - state.dragStartY);
      renderAll();
    } else if (e.touches.length === 2 && lastTouches && lastTouches.length === 2) {
      // Pinch zoom
      const d1 = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const d0 = Math.hypot(
        lastTouches[0].clientX - lastTouches[1].clientX,
        lastTouches[0].clientY - lastTouches[1].clientY
      );
      if (d1 > d0 + 8 && state.zoom < MAX_ZOOM) {
        zoomAt(
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2,
          1
        );
      } else if (d1 < d0 - 8 && state.zoom > MIN_ZOOM) {
        zoomAt(
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2,
          -1
        );
      }
    }
    lastTouches = e.touches;
  }, { passive: true });

  tileLayer.addEventListener("touchend", () => { state.dragging = false; lastTouches = null; });

  // Scroll wheel zoom
  tileLayer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    zoomAt(e.clientX, e.clientY, dir);
  }, { passive: false });

  // Double click zoom
  tileLayer.addEventListener("dblclick", (e) => {
    zoomAt(e.clientX, e.clientY, 1);
  });
}

/**
 * Zoom masuk/keluar di titik layar (cx, cy).
 */
function zoomAt(cx, cy, dir) {
  const mapEl = getElement("map-fullscreen");
  const W = mapEl ? mapEl.offsetWidth  : window.innerWidth;
  const H = mapEl ? mapEl.offsetHeight : window.innerHeight;

  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom + dir));
  if (newZoom === state.zoom) return;

  // Koordinat global di titik kursor (zoom lama)
  const gxOld = state.centerX + (cx - W / 2);
  const gyOld = state.centerY + (cy - H / 2);

  // Konversi ke lon/lat
  const { lon, lat } = pixelToLonLat(gxOld, gyOld, state.zoom);

  // Hitung pixel global koordinat itu di zoom baru
  const pNew = lonLatToPixel(lon, lat, newZoom);

  // Sesuaikan center agar kursor tetap menunjuk koordinat yang sama
  state.zoom    = newZoom;
  state.centerX = pNew.x - (cx - W / 2);
  state.centerY = pNew.y - (cy - H / 2);

  renderAll();
}

// ── Update Panel Info ─────────────────────────────────────────────────────────
function updatePanel(coords) {
  const len   = totalLength(coords);
  const start = coords[0];
  const end   = coords[coords.length - 1];

  const el = id => getElement(id);

  if (el("info-panjang"))     el("info-panjang").textContent     = fmtDist(len);
  if (el("info-estimasi"))    el("info-estimasi").textContent    = fmtTime(len);
  if (el("info-titik"))       el("info-titik").textContent       = coords.length + " titik";
  if (el("info-coord-start")) el("info-coord-start").textContent = fmtCoord(start);
  if (el("info-coord-end"))   el("info-coord-end").textContent   = fmtCoord(end);
  if (el("info-tarif"))       el("info-tarif").textContent       = TARIF;
}

// ── Validasi GeoJSON ──────────────────────────────────────────────────────────
function validasiGeoJSON(data) {
  if (!data || typeof data !== "object")
    return "Data bukan objek JSON yang valid.";
  if (data.type !== "FeatureCollection")
    return `Tipe GeoJSON tidak valid: "${data.type}".`;
  if (!Array.isArray(data.features) || data.features.length === 0)
    return "GeoJSON tidak memiliki fitur.";
  const hasLine = data.features.some(
    f => f.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
  );
  if (!hasLine) return "GeoJSON tidak mengandung geometri LineString.";
  return null;
}

// ── Tampilkan / Sembunyikan Error ─────────────────────────────────────────────
function tampilkanError(pesan) {
  const ov = getElement("error-overlay");
  const em = getElement("error-message");
  const ld = getElement("map-loading");
  if (ov) ov.classList.remove("is-hidden");
  if (em) em.textContent = pesan;
  if (ld) ld.classList.add("is-hidden");
}

function sembunyikanError() {
  const ov = getElement("error-overlay");
  if (ov) ov.classList.add("is-hidden");
}

// ── Muat GeoJSON ──────────────────────────────────────────────────────────────
async function muatGeoJSON() {
  const ld = getElement("map-loading");
  if (ld) ld.classList.remove("is-hidden");
  sembunyikanError();

  try {
    const resp = await fetch(GEOJSON_PATH);
    if (!resp.ok) {
      tampilkanError(`HTTP ${resp.status}: File GeoJSON tidak ditemukan.`);
      return;
    }

    const data = await resp.json();
    const err  = validasiGeoJSON(data);
    if (err) { tampilkanError(err); return; }

    // Kumpulkan semua koordinat
    const allCoords = [];
    for (const feature of data.features) {
      if (!feature.geometry) continue;
      const { type, coordinates } = feature.geometry;
      if (type === "LineString")      allCoords.push(...coordinates);
      else if (type === "MultiLineString")
        for (const line of coordinates) allCoords.push(...line);
    }

    state.geoData      = data;
    state.routeCoords  = allCoords;

    // Sembunyikan loading, render
    if (ld) ld.classList.add("is-hidden");

    updatePanel(allCoords);
    centerOnRoute();

  } catch (e) {
    tampilkanError(`Gagal memuat GeoJSON: ${e.message}. Jalankan via HTTP server.`);
  }
}

// ── Panel Toggle ──────────────────────────────────────────────────────────────
function initPanelToggle() {
  const panel  = getElement("bottom-panel");
  const toggle = getElement("panel-toggle");
  const label  = getElement("toggle-label");
  if (!panel || !toggle) return;

  toggle.addEventListener("click", () => {
    const expanded = panel.classList.toggle("expanded");
    toggle.setAttribute("aria-expanded", expanded);
    if (label) label.textContent = expanded ? "Sembunyikan" : "Detail Rute";
    // Jika diperkecil, re-render agar rute benar
    setTimeout(renderAll, 20);
  });
}

// ── Resize handler ────────────────────────────────────────────────────────────
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderAll, 150);
});

// ── Inisialisasi aplikasi ────────────────────────────
function initializeApp() {
  // Event handler tombol via CrootJS onClick()
  onClick("btn-zoom-in",    () => zoomAt(
    (getElement("map-fullscreen")?.offsetWidth  ?? window.innerWidth)  / 2,
    (getElement("map-fullscreen")?.offsetHeight ?? window.innerHeight) / 2,
    1
  ));
  onClick("btn-zoom-out",   () => zoomAt(
    (getElement("map-fullscreen")?.offsetWidth  ?? window.innerWidth)  / 2,
    (getElement("map-fullscreen")?.offsetHeight ?? window.innerHeight) / 2,
    -1
  ));
  onClick("btn-reset-view", centerOnRoute);
  onClick("btn-reload",     muatGeoJSON);

  onClick("btn-retry", muatGeoJSON);

  // Inisialisasi drag/pan/zoom interaksi
  initDrag();

  // Panel expandable
  initPanelToggle();

  // Muat data dan render
  muatGeoJSON();
}

initializeApp();
