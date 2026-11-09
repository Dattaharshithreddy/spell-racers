// Towns: street-grid cities with a Karnataka building kit (tiled houses, concrete homes with water tanks,
// apartments, Kannada-signboard shop rows). Every building gets an oriented-box collider you can stand on.
import * as THREE from "three";
import { W, heightAt, districtAt, patchRestore, rng } from "./world.js";
import { mergeGeometries } from "../vendor/addons/utils/BufferGeometryUtils.js";

// ------------------------------------------------------------ geometry helpers
/** box with per-face UV rects. origin at bottom centre. faces: f(+z) b(-z) l(-x) r(+x) t(+y). uv rect = [u0,v0,u1,v1] */
function boxUV(w, h, d, uv) {
  const P = [], N = [], U = [], I = [];
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
  const face = (a, b, c, e, n, r) => { // a,b,c,e = bl, br, tr, tl
    const o = P.length / 3; P.push(...a, ...b, ...c, ...e); for (let i = 0; i < 4; i++) N.push(...n);
    U.push(r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]); I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  if (uv.f) face([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], [0, 0, 1], uv.f);
  if (uv.b) face([x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], [0, 0, -1], uv.b);
  if (uv.l) face([x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], [-1, 0, 0], uv.l);
  if (uv.r) face([x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], [1, 0, 0], uv.r);
  if (uv.t) face([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], [0, 1, 0], uv.t);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g;
}
/** gable roof prism (ridge along x), sits at y=0, with overhang */
function gable(w, d, rise) {
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2, P = [], N = [], U = [], I = [];
  const quad = (a, b, c, e, n, uw, uh) => { const o = P.length / 3; P.push(...a, ...b, ...c, ...e); for (let i = 0; i < 4; i++) N.push(...n); U.push(0, 0, uw, 0, uw, uh, 0, uh); I.push(o, o + 1, o + 2, o, o + 2, o + 3); };
  const tri = (a, b, c, n) => { const o = P.length / 3; P.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) N.push(...n); U.push(0, 0, 1, 0, 0.5, 0.5); I.push(o, o + 1, o + 2); };
  const sl = Math.hypot(d / 2, rise), ny = (d / 2) / sl, nz = rise / sl;
  quad([x0, 0, z1], [x1, 0, z1], [x1, rise, 0], [x0, rise, 0], [0, ny, nz], w / 1.2, sl / 1.2);
  quad([x1, 0, z0], [x0, 0, z0], [x0, rise, 0], [x1, rise, 0], [0, ny, -nz], w / 1.2, sl / 1.2);
  tri([x0, 0, z0], [x0, 0, z1], [x0, rise, 0], [-1, 0, 0]); tri([x1, 0, z1], [x1, 0, z0], [x1, rise, 0], [1, 0, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g;
}
function vc(g, hex) { const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(hex); for (let i = 0; i < n; i++) col.toArray(c, i * 3); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g; }
const ni = (g) => (g.index ? g.toNonIndexed() : g);
function stripUV(g) { g.deleteAttribute("uv"); return g; }
function solid(geos) { return mergeGeometries(geos.map((g) => stripUV(ni(g)))); }

// ------------------------------------------------------------ textures (painted on canvas)
function tex(w, h, draw, rep = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function win(x, X, Y, w, h, shutter = "#2f7d6d") {
  x.fillStyle = "#e9dfc9"; x.fillRect(X - 3, Y - 3, w + 6, h + 6);           // frame
  x.fillStyle = "#33505f"; x.fillRect(X, Y, w, h);                            // glass
  x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(X + 2, Y + 2, w * 0.35, h - 4);
  x.strokeStyle = "#e9dfc9"; x.lineWidth = 2; x.beginPath(); x.moveTo(X + w / 2, Y); x.lineTo(X + w / 2, Y + h); x.moveTo(X, Y + h * 0.45); x.lineTo(X + w, Y + h * 0.45); x.stroke();
  x.fillStyle = shutter; x.fillRect(X - 11, Y - 2, 8, h + 4); x.fillRect(X + w + 3, Y - 2, 8, h + 4);   // shutters
  x.fillStyle = "rgba(0,0,0,.15)"; x.fillRect(X - 4, Y + h + 3, w + 8, 4);                               // sill shadow
}
function door(x, X, Y, w, h) {
  x.fillStyle = "#e9dfc9"; x.fillRect(X - 4, Y - 4, w + 8, h + 4);
  x.fillStyle = "#6b3f22"; x.fillRect(X, Y, w, h); x.fillStyle = "#7d4a29"; x.fillRect(X + 4, Y + 4, w / 2 - 6, h - 8); x.fillRect(X + w / 2 + 2, Y + 4, w / 2 - 6, h - 8);
  x.fillStyle = "#e2b13c"; x.fillRect(X + w / 2 - 3, Y + h * 0.5, 6, 6);
  x.fillStyle = "#c8102e"; x.beginPath(); x.arc(X + w / 2, Y - 10, 5, 0, 7); x.fill();   // kumkum mark / thoran dot
  x.fillStyle = "#3e8e3a"; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(X + 4 + i * (w - 8) / 5, Y - 2); x.lineTo(X + 8 + i * (w - 8) / 5, Y + 10); x.lineTo(X + i * (w - 8) / 5, Y + 10); x.fill(); } // mango-leaf thorana
}
function wallBase(x, w, h) {
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  x.fillStyle = "rgba(0,0,0,.16)"; x.fillRect(0, h - 14, w, 14);   // plinth
}
let T = null;
function textures() {
  if (T) return T;
  T = {};
  // house: [0,.5] front (door + 2 windows), [.5,1] side (2 windows)
  T.house = tex(512, 256, (x, w, h) => {
    wallBase(x, w, h);
    door(x, 104, 120, 48, 122); win(x, 34, 120, 42, 52, "#2f7d6d"); win(x, 182, 120, 42, 52, "#2f7d6d");
    win(x, 300, 110, 46, 56, "#2f6f9c"); win(x, 420, 110, 46, 56, "#2f6f9c");
  });
  T.tile = tex(128, 128, (x, w, h) => {
    x.fillStyle = "#b5532f"; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const X = c * 16 + (r % 2) * 8, Y = r * 16; const g = x.createLinearGradient(0, Y, 0, Y + 16);
      g.addColorStop(0, "#d0683c"); g.addColorStop(1, "#8e3a1e"); x.fillStyle = g; x.beginPath(); x.roundRect(X + 1, Y + 1, 14, 15, 5); x.fill();
    }
  }, true);
  // concrete 2-storey: [0,.5] front, [.5,1] side
  T.conc = tex(512, 512, (x, w, h) => {
    wallBase(x, w, h);
    x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(0, 250, w, 10);   // floor band
    door(x, 40, 380, 50, 118); win(x, 150, 380, 54, 60, "#8a5a2b");
    win(x, 40, 120, 54, 70, "#8a5a2b"); x.fillStyle = "#6b3f22"; x.fillRect(150, 100, 60, 130);       // balcony door
    win(x, 300, 120, 56, 70, "#2f6f9c"); win(x, 410, 120, 56, 70, "#2f6f9c"); win(x, 300, 370, 56, 64, "#2f6f9c"); win(x, 410, 370, 56, 64, "#2f6f9c");
  });
  // apartment floor (repeats vertically), 3 windows with balcony rails
  T.apt = tex(256, 128, (x, w, h) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(0,0,0,.1)"; x.fillRect(0, h - 10, w, 10);
    for (let i = 0; i < 3; i++) {
      const X = 14 + i * 82; x.fillStyle = "#2e4a5c"; x.fillRect(X, 20, 64, 70); x.fillStyle = "rgba(255,255,255,.2)"; x.fillRect(X + 4, 24, 20, 62);
      x.fillStyle = Math.random() < 0.3 ? "#f5d76e" : "#3d5f73"; x.fillRect(X + 34, 30, 24, 50);       // some lit rooms
      x.fillStyle = "#f4f1ea"; x.fillRect(X - 4, 74, 72, 6); for (let k = 0; k < 9; k++) x.fillRect(X - 2 + k * 8, 80, 3, 26); x.fillRect(X - 4, 104, 72, 4);
      if (Math.random() < 0.5) { x.fillStyle = ["#e8435a", "#3d7fc4", "#f2b705"][i]; x.fillRect(X + 10, 82, 22, 14); }   // drying clothes
    }
  }, true);
  // shop rows (4 variants, one per 128px row): shutters + Kannada signboard
  const SIGNS = [["ಹೋಟೆಲ್ ಅನ್ನಪೂರ್ಣ", "#c8102e"], ["ದರ್ಶಿನಿ · ಕಾಫಿ", "#2e7d32"], ["ಬೇಕರಿ & ಸ್ವೀಟ್ಸ್", "#6a1b9a"], ["ಜನರಲ್ ಸ್ಟೋರ್ಸ್", "#1565c0"]];
  T.shop = tex(1024, 512, (x, w, h) => {
    SIGNS.forEach(([txt, col], r) => {
      const Y = r * 128; x.fillStyle = "#f4efe6"; x.fillRect(0, Y, w, 128);
      x.fillStyle = col; x.fillRect(0, Y + 4, w, 40); x.fillStyle = "#fff"; x.font = "bold 30px 'Baloo Tamma 2','Noto Sans Kannada',sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, w / 2, Y + 25);
      x.fillStyle = "#ffd45c"; x.fillRect(0, Y + 44, w, 4);
      for (let i = 0; i < 4; i++) {
        const X = 14 + i * 252, open = (i + r) % 2 === 0;
        if (open) { x.fillStyle = "#3a2a1e"; x.fillRect(X, Y + 54, 230, 72); x.fillStyle = "#d9b26a"; for (let k = 0; k < 6; k++) x.fillRect(X + 10 + k * 36, Y + 70 + (k % 2) * 16, 26, 14); x.fillStyle = "#8b5a2b"; x.fillRect(X, Y + 104, 230, 22); }
        else { x.fillStyle = "#9aa3ab"; x.fillRect(X, Y + 54, 230, 72); x.fillStyle = "rgba(0,0,0,.18)"; for (let k = 0; k < 12; k++) x.fillRect(X, Y + 56 + k * 6, 230, 2); }
      }
    });
  });
  T.awning = tex(64, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#ffffff" : ["#c8102e", "#2e7d32", "#1565c0", "#f2b705"][Math.floor(Math.random() * 4)]; x.fillRect(i * 8, 0, 8, h); } }, true);
  return T;
}

// ------------------------------------------------------------ building kit
function kit() {
  const t = textures();
  const K = {};
  const H1 = 3.4, H2 = 6.4;
  // T1: tiled house 5.2 x 4.6
  K.house = {
    w: 5.2, d: 4.6, h: H1 + 1.9,
    body: boxUV(5.2, H1, 4.6, { f: [0, 0, 0.5, 1], b: [0.5, 0, 1, 1], l: [0.5, 0, 1, 1], r: [0.5, 0, 1, 1] }),
    roof: gable(6.2, 5.6, 1.9).translate(0, H1, 0),
    trim: solid([vc(new THREE.BoxGeometry(5.6, 0.25, 1.6).translate(0, 0.12, 3.0), 0xb9ac98), vc(new THREE.CylinderGeometry(0.12, 0.12, H1 - 0.2, 6).translate(-2.3, H1 / 2, 3.6), 0xf4efe6), vc(new THREE.CylinderGeometry(0.12, 0.12, H1 - 0.2, 6).translate(2.3, H1 / 2, 3.6), 0xf4efe6),
      vc(new THREE.BoxGeometry(5.8, 0.15, 1.8).translate(0, H1 - 0.05, 3.1), 0x8e3a1e)]),
    top: H1 + 1.0, bodyMat: "house", roofMat: "tile",
  };
  // T2: concrete 2-storey with balcony, parapet, black water tank
  const tank = vc(new THREE.CylinderGeometry(0.75, 0.75, 1.3, 14).translate(1.4, H2 + 0.85, -1.2), 0x1b1b1f);
  const tankRing = vc(new THREE.CylinderGeometry(0.78, 0.78, 0.12, 14).translate(1.4, H2 + 1.1, -1.2), 0x2a2a30);
  const par = [[0, 3.1, 6.4, 0.2], [0, -3.1, 6.4, 0.2], [3.1, 0, 0.2, 6.4], [-3.1, 0, 0.2, 6.4]].map(([x, z, w, d]) => vc(new THREE.BoxGeometry(w, 0.6, d).translate(x, H2 + 0.3, z), 0xe9e2d4));
  K.conc = {
    w: 6.2, d: 6.2, h: H2 + 0.6,
    body: boxUV(6.2, H2, 6.2, { f: [0, 0, 0.5, 1], b: [0.5, 0, 1, 1], l: [0.5, 0, 1, 1], r: [0.5, 0, 1, 1], t: [0.02, 0.02, 0.04, 0.04] }),
    trim: solid([...par, tank, tankRing, vc(new THREE.BoxGeometry(3.4, 0.2, 1.4).translate(-1.3, 3.25, 3.75), 0xe9e2d4),
      vc(new THREE.BoxGeometry(3.4, 0.9, 0.08).translate(-1.3, 3.8, 4.42), 0x5b6670), vc(new THREE.BoxGeometry(2.2, 0.08, 1.6).translate(1.5, 3.0, 3.8), 0x6b6f7a)]),
    top: H2 + 0.05, bodyMat: "conc",
  };
  // T3: apartments (6 / 9 / 12 floors, 3.0 per floor)
  K.apt = [6, 9, 12].map((fl) => {
    const h = fl * 3.0;
    const par2 = [[0, 4.1, 8.4, 0.25], [0, -4.1, 8.4, 0.25], [4.1, 0, 0.25, 8.4], [-4.1, 0, 0.25, 8.4]].map(([x, z, w, d]) => vc(new THREE.BoxGeometry(w, 0.7, d).translate(x, h + 0.35, z), 0xe2ddd3));
    return {
      w: 8.2, d: 8.2, h: h + 0.7,
      body: boxUV(8.2, h, 8.2, { f: [0, 0, 3, fl], b: [0, 0, 3, fl], l: [0, 0, 3, fl], r: [0, 0, 3, fl], t: [0.02, 0.02, 0.03, 0.03] }),
      trim: solid([...par2, vc(new THREE.CylinderGeometry(0.8, 0.8, 1.4, 12).translate(-2, h + 0.7, -2), 0x1b1b1f), vc(new THREE.CylinderGeometry(0.8, 0.8, 1.4, 12).translate(0.2, h + 0.7, -2), 0x1b1b1f),
        vc(new THREE.BoxGeometry(2.2, 2.6, 2.2).translate(2.2, h + 1.3, 2.2), 0xd8d2c6)]),
      top: h + 0.05, bodyMat: "apt",
    };
  });
  // T4: shop row, 4 signboard variants (texture rows)
  K.shop = [0, 1, 2, 3].map((r) => {
    const v0 = 1 - (r + 1) / 4, v1 = 1 - r / 4, GH = 4.2;
    return {
      w: 12, d: 6, h: GH + 3.4 + 0.5,
      body: boxUV(12, GH, 6, { f: [0, v0, 1, v1], b: [0.02, v0 + 0.01, 0.03, v0 + 0.02], l: [0.02, v0 + 0.01, 0.03, v0 + 0.02], r: [0.02, v0 + 0.01, 0.03, v0 + 0.02] }),
      upper: boxUV(12, 3.4, 6, { f: [0.5, 0, 1, 1], b: [0.5, 0, 1, 1], l: [0.5, 0, 1, 1], r: [0.5, 0, 1, 1], t: [0.52, 0.02, 0.53, 0.03] }).translate(0, GH, 0),
      awning: boxUV(12.2, 0.12, 2.0, { t: [0, 0, 6, 1], f: [0, 0, 6, 0.1] }).rotateX(0.32).translate(0, GH - 0.4, 3.9),
      trim: solid([[0, 3.05, 12.2, 0.2], [0, -3.05, 12.2, 0.2], [6.05, 0, 0.2, 6.2], [-6.05, 0, 0.2, 6.2]].map(([x, z, w, d]) => vc(new THREE.BoxGeometry(w, 0.5, d).translate(x, GH + 3.65, z), 0xe9e2d4))),
      top: GH + 3.45, bodyMat: "shop",
    };
  });
  K.mats = {
    house: patchRestore(new THREE.MeshLambertMaterial({ map: t.house }), { instanced: true }),
    conc: patchRestore(new THREE.MeshLambertMaterial({ map: t.conc }), { instanced: true }),
    apt: patchRestore(new THREE.MeshLambertMaterial({ map: t.apt }), { instanced: true }),
    shop: patchRestore(new THREE.MeshLambertMaterial({ map: t.shop }), { instanced: true }),
    tile: patchRestore(new THREE.MeshLambertMaterial({ map: t.tile }), { instanced: true }),
    awning: patchRestore(new THREE.MeshLambertMaterial({ map: t.awning, side: THREE.DoubleSide }), { instanced: true }),
    trim: patchRestore(new THREE.MeshLambertMaterial({ vertexColors: true }), { instanced: true }),
    street: patchRestore(new THREE.MeshLambertMaterial({ color: 0x6a6870, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 })),
  };
  return K;
}

// ------------------------------------------------------------ city layout
const PAL = { warm: [0xf6d48f, 0xf2a7b8, 0xa9d6e5, 0xc5e1a5, 0xfff3e0, 0xf6c28b, 0xd7c6f2, 0xffffff, 0xf9e79f, 0xb3e5fc],
  north: [0xe8d3a8, 0xdcc49a, 0xf0e2c4, 0xcfd8dc, 0xf6c28b, 0xffffff], apt: [0xf3efe7, 0xe6e2da, 0xdcd6cc, 0xf0e3d0, 0xd9e3ea] };
export function buildTowns(scene, colliders) {
  const K = kit(), r = rng(77), root = new THREE.Group(); root.name = "towns";
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
  W.towns = [];
  for (const city of W.meta.cities) {
    const big = city.pop > 3e6, mid = city.pop > 2e5, coastal = city.lon < 75.2, north = city.lat > 15.6;
    const R = big ? 120 : mid ? 58 : 34;
    const ang = (r() - 0.5) * 0.5, ca = Math.cos(ang), sa = Math.sin(ang);
    const LOT = 10, lists = { house: [], conc: [], apt0: [], apt1: [], apt2: [], shop0: [], shop1: [], shop2: [], shop3: [] }, streets = [];
    const N = Math.ceil(R / LOT);
    for (let j = -N; j <= N; j++) for (let i = -N; i <= N; i++) {
      const sx = ((i % 4) + 4) % 4, sz = ((j % 3) + 3) % 3;
      if (sx === 3 || sz === 2) continue;                       // street columns / rows
      const lx = i * LOT, lz = j * LOT, d = Math.hypot(lx, lz); if (d > R) continue;
      const fill = big ? 0.92 : 0.82 - (d / R) * 0.35; if (r() > fill) continue;
      const x = city.x + lx * ca - lz * sa, z = city.z + lx * sa + lz * ca;
      if (heightAt(x, z) < 0.6 || districtAt(x, z) === 0) continue;
      if (W.reserved && W.reserved.some((p) => Math.hypot(p.x - x, p.z - z) < p.r)) continue;
      // face the nearest street row
      const face = sz === 0 ? Math.PI : 0;                       // row 0 faces -z street, row 1 faces +z street
      const t = d / R; let type;
      const roll = r();
      if (big) type = t < 0.4 ? (roll < 0.55 ? "apt" : roll < 0.85 ? "shop" : "conc") : t < 0.75 ? (roll < 0.35 ? "shop" : roll < 0.8 ? "conc" : "apt") : roll < 0.6 ? "conc" : "house";
      else if (mid) type = t < 0.35 ? (roll < 0.55 ? "shop" : "conc") : roll < (coastal ? 0.6 : north ? 0.15 : 0.4) ? "house" : "conc";
      else type = t < 0.25 && roll < 0.5 ? "shop" : roll < (coastal ? 0.75 : north ? 0.25 : 0.6) ? "house" : "conc";
      let key = type, def;
      if (type === "apt") { const k = big && t < 0.25 ? 2 : (r() * 2) | 0; key = "apt" + k; def = K.apt[k]; }
      else if (type === "shop") { const k = (r() * 4) | 0; key = "shop" + k; def = K.shop[k]; }
      else def = K[type];
      const s = 0.92 + r() * 0.16, yaw = ang + face + (type === "house" ? (r() - 0.5) * 0.1 : 0);
      const y = Math.min(heightAt(x - 3, z - 3), heightAt(x + 3, z + 3), heightAt(x, z)) - 0.15;
      const pal = type === "apt" ? PAL.apt : north ? PAL.north : PAL.warm;
      lists[key].push({ x, y, z, s, yaw, col: pal[(r() * pal.length) | 0], did: districtAt(x, z) });
      const c = Math.cos(yaw), si = Math.sin(yaw);
      colliders.push({ x, z, hx: def.w * s / 2 + 0.15, hz: def.d * s / 2 + 0.15, c, s: si, R: Math.hypot(def.w, def.d) * s / 2 + 0.3, top: y + def.top * s, obb: true });
    }
    // asphalt streets (rows + columns inside the radius)
    const sg = [];
    for (let j = -N; j <= N; j++) if (((j % 3) + 3) % 3 === 2) sg.push(streetLine(city, ca, sa, -R, j * LOT, R, j * LOT, R));
    for (let i = -N; i <= N; i++) if (((i % 4) + 4) % 4 === 3) sg.push(streetLine(city, ca, sa, i * LOT, -R, i * LOT, R, R));
    const sgs = sg.filter(Boolean);
    if (sgs.length) { const m = new THREE.Mesh(mergeGeometries(sgs), K.mats.street); root.add(m); }
    // instanced meshes
    const emit = (list, geo, mat, tint, scaleY = 1) => {
      if (!list.length) return;
      const g = geo.clone(); const did = new Float32Array(list.length);
      const im = new THREE.InstancedMesh(g, mat, list.length);
      list.forEach((b, k) => { Q.setFromAxisAngle(Y, b.yaw); M4.compose(P.set(b.x, b.y, b.z), Q, S.set(b.s, b.s * scaleY, b.s)); im.setMatrixAt(k, M4); if (tint) im.setColorAt(k, C.setHex(b.col)); did[k] = b.did; });
      g.setAttribute("aDid", new THREE.InstancedBufferAttribute(did, 1)); im.computeBoundingSphere(); root.add(im);
    };
    emit(lists.house, K.house.body, K.mats.house, true); emit(lists.house, K.house.roof, K.mats.tile, false); emit(lists.house, K.house.trim, K.mats.trim, false);
    emit(lists.conc, K.conc.body, K.mats.conc, true); emit(lists.conc, K.conc.trim, K.mats.trim, false);
    K.apt.forEach((a, k) => { emit(lists["apt" + k], a.body, K.mats.apt, true); emit(lists["apt" + k], a.trim, K.mats.trim, false); });
    K.shop.forEach((sh, k) => { const l = lists["shop" + k]; emit(l, sh.body, K.mats.shop, false); emit(l, sh.upper, K.mats.house, true); emit(l, sh.awning, K.mats.awning, false); emit(l, sh.trim, K.mats.trim, false); });
    W.towns.push({ name: city.name, x: city.x, z: city.z, r: R });
  }
  scene.add(root);
}
function streetLine(city, ca, sa, ax, az, bx, bz, R) {
  const pts = [], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 4);
  for (let k = 0; k <= n; k++) {
    const lx = ax + (bx - ax) * k / n, lz = az + (bz - az) * k / n; if (Math.hypot(lx, lz) > R + 2) continue;
    pts.push([city.x + lx * ca - lz * sa, city.z + lx * sa + lz * ca]);
  }
  if (pts.length < 2) return null;
  const P = [], I = [], N = [], D = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    for (const s of [-1, 1]) { const x = pts[i][0] - dz * 3.6 * s, z = pts[i][1] + dx * 3.6 * s; if (heightAt(x, z) < 0.4) { P.push(x, -50, z); } else P.push(x, heightAt(x, z) + 0.05, z); N.push(0, 1, 0); D.push(districtAt(pts[i][0], pts[i][1])); }
    if (i) { const o = (i - 1) * 2; I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); g.setAttribute("aDid", new THREE.Float32BufferAttribute(D, 1)); g.setIndex(I); return g;
}
