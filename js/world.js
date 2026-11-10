// World: real-geography Karnataka terrain, sea, rivers, roads, towns, vegetation, landmarks.
// Every world material is "restore-patched": districts render grey until their words are spoken back.
import * as THREE from "three";

export const W = { meta: null, H: null, D: null, nx: 0, nz: 0 };
const BASE = "world/";

// ------------------------------------------------------------ restore (grey ⇄ colour) per district
export const restore = {
  levels: new Float32Array(64),  // 0 = silent grey, 1 = full colour
  target: new Float32Array(64),
  tex: null,
};
{
  const data = new Uint8Array(64 * 4);
  restore.tex = new THREE.DataTexture(data, 64, 1, THREE.RGBAFormat);
  restore.tex.magFilter = restore.tex.minFilter = THREE.NearestFilter;
  restore.tex.needsUpdate = true;
}
const RU = { restoreTex: { value: restore.tex }, uTime: { value: 0 }, wave: { value: new THREE.Vector4(0, 0, -1, 0) }, uPads: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, -1)) } };
export const worldUniforms = RU;

export function setDistrictTarget(id, v) { restore.target[id] = v; }
export function updateRestore(dt) {
  let dirty = false;
  const data = restore.tex.image.data;
  for (let i = 0; i < 64; i++) {
    const d = restore.target[i] - restore.levels[i];
    if (Math.abs(d) > 0.001) { restore.levels[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 0.45); dirty = true; }
    data[i * 4] = Math.round(restore.levels[i] * 255);
  }
  if (dirty) restore.tex.needsUpdate = true;
}

/** Inject per-district desaturation into a built-in material. Geometry needs `aDid` (per vertex or instanced). */
export function patchRestore(mat, { instanced = false, keepWater = false, detail = false } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.restoreTex = RU.restoreTex; sh.uniforms.uTime = RU.uTime; sh.uniforms.wave = RU.wave; sh.uniforms.uPads = RU.uPads;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aDid;\nvarying float vDid;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;")
      .replace("#include <fog_vertex>", "#include <fog_vertex>\nvDid = aDid;\nvec4 wp4 = vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nwp4 = instanceMatrix * wp4;\n#endif\nvWPos = (modelMatrix * wp4).xyz;\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D restoreTex;\nuniform float uTime;\nuniform vec4 wave;\nuniform vec3 uPads[8];\nvarying float vDid;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nfloat hh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\nfloat vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hh(i), hh(i+vec2(1,0)), f.x), mix(hh(i+vec2(0,1)), hh(i+vec2(1,1)), f.x), f.y); }")
      .replace("#include <fog_fragment>", `
        ${detail ? `{
          // soft multi-scale variation (no hard-edged squares) + rock on steep slopes + sun-warm/shade-cool tint
          float n1 = vnoise(vWPos.xz * 0.045), n2 = vnoise(vWPos.xz * 0.17 + 7.3), n3 = vnoise(vWPos.xz * 0.9 + 3.1);
          float n = n1 * 0.55 + n2 * 0.3 + n3 * 0.15;
          vec3 base = gl_FragColor.rgb;
          base *= 0.84 + 0.32 * n;
          base = mix(base, base * vec3(0.9, 1.06, 0.82), smoothstep(0.55, 0.8, n2) * 0.55);     // lush grass clumps
          base = mix(base, base * vec3(1.08, 0.98, 0.84), smoothstep(0.6, 0.85, n1) * 0.45);    // dry patches
          float slope = 1.0 - clamp(vWNrm.y, 0.0, 1.0);
          vec3 rock = vec3(0.47, 0.42, 0.37) * (0.8 + 0.4 * n3);
          base = mix(base, rock, smoothstep(0.32, 0.6, slope) * 0.85);
          // landmark plazas: sandstone paving with grout lines and a border ring
          for (int k = 0; k < 8; k++) {
            vec3 pd = uPads[k]; if (pd.z <= 0.0) continue;
            float d = distance(vWPos.xz, pd.xy); if (d > pd.z + 2.0) continue;
            vec2 tq = vWPos.xz / 2.6; vec2 tf = fract(tq + vec2(0.5 * mod(floor(tq.y), 2.0), 0.0));
            float grout = 1.0 - smoothstep(0.035, 0.075, min(min(tf.x, 1.0 - tf.x), min(tf.y, 1.0 - tf.y)));
            float tone = hh(floor(tq + vec2(0.5 * mod(floor(tq.y), 2.0), 0.0)));
            vec3 stone = mix(vec3(0.80, 0.71, 0.58), vec3(0.88, 0.80, 0.66), tone) * (0.92 + 0.12 * n3);
            stone = mix(stone, vec3(0.52, 0.45, 0.38), grout * 0.7);
            float ring = smoothstep(pd.z - 3.0, pd.z - 2.4, d) * (1.0 - smoothstep(pd.z - 0.6, pd.z, d));
            stone = mix(stone, vec3(0.62, 0.32, 0.22), ring * 0.8);
            base = mix(base, stone, 1.0 - smoothstep(pd.z - 0.4, pd.z + 1.5, d));
          }
          gl_FragColor.rgb = base;
        }` : ""}
        {
          float lv = texture2D(restoreTex, vec2((floor(vDid + 0.5) + 0.5) / 64.0, 0.5)).r;
          // restoring wave ring sweeps out from the landmark
          if (wave.z > 0.0) {
            float d = distance(vWPos.xz, wave.xy);
            float ring = smoothstep(wave.z - 40.0, wave.z, d) * (1.0 - smoothstep(wave.z, wave.z + 6.0, d));
            gl_FragColor.rgb += vec3(1.0, 0.85, 0.4) * ring * 0.55 * wave.w;
          }
          vec3 c = gl_FragColor.rgb;
          float g = dot(c, vec3(0.3, 0.59, 0.11));
          c = max(mix(vec3(g), c, 1.06), 0.0);
          vec3 silent = mix(vec3(g) * vec3(0.86, 0.88, 0.98) * 0.95 + vec3(0.02, 0.02, 0.05), c, 0.2);
          gl_FragColor.rgb = mix(silent, c, lv);
        }
        #include <fog_fragment>`);
  };
  mat.customProgramCacheKey = () => "restore" + (instanced ? "i" : "") + (keepWater ? "w" : "") + (detail ? "d" : "");
  return mat;
}

// ------------------------------------------------------------ loading + sampling
export async function loadWorld() {
  const [meta, hb, db] = await Promise.all([
    fetch(BASE + "world.json").then((r) => r.json()),
    fetch(BASE + "height.bin").then((r) => r.arrayBuffer()),
    fetch(BASE + "district.bin").then((r) => r.arrayBuffer()),
  ]);
  W.meta = meta; W.nx = meta.nx; W.nz = meta.nz;
  const q = new Uint16Array(hb);
  W.H = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) W.H[i] = q[i] / meta.hq + meta.hmin;
  W.D = new Uint8Array(db);
  const img = await loadImage(BASE + "veg.png");
  W.veg = imageData(img);
  W.colorTex = await new THREE.TextureLoader().loadAsync(BASE + "color.png");
  W.colorTex.colorSpace = THREE.SRGBColorSpace;
  W.colorTex.anisotropy = 4;
  return W;
}
function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function imageData(img) { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height); }

export function lonlat(lon, lat) { const m = W.meta; return { x: (lon - m.lon0) * m.kx, z: (m.lat0 - lat) * m.kz }; }
function gi(x, z) { const m = W.meta; return [(x - m.x0) / m.cell, (z - m.z0) / m.cell]; }
export function heightAt(x, z) {
  let [fx, fz] = gi(x, z);
  fx = Math.max(0, Math.min(W.nx - 1.001, fx)); fz = Math.max(0, Math.min(W.nz - 1.001, fz));
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, n = W.nx, H = W.H;
  const a = H[iz * n + ix], b = H[iz * n + ix + 1], c = H[(iz + 1) * n + ix], d = H[(iz + 1) * n + ix + 1];
  // match the rendered terrain triangles exactly (diagonal runs b -> c), so feet and tyres sit ON the grass
  return tx + tz <= 1 ? a + (b - a) * tx + (c - a) * tz : d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
}
export function districtAt(x, z) {
  const [fx, fz] = gi(x, z); const ix = Math.round(fx), iz = Math.round(fz);
  if (ix < 0 || iz < 0 || ix >= W.nx || iz >= W.nz) return 0;
  return W.D[iz * W.nx + ix];
}
function vegAt(x, z) {
  const [fx, fz] = gi(x, z); const ix = Math.round(fx), iz = Math.round(fz);
  if (ix < 0 || iz < 0 || ix >= W.nx || iz >= W.nz) return [0, 0, 0, 0];
  const o = (iz * W.nx + ix) * 4, d = W.veg.data; return [d[o] / 255, d[o + 1] / 255, d[o + 2] / 255, d[o + 3] / 255];
}
/** flatten a circular pad (for landmarks) — must run before building terrain */
export function flattenPad(x, z, r, fall = 20) {
  const h0 = heightAt(x, z);
  const [cx, cz] = gi(x, z); const R2 = (r + fall) / W.meta.cell;
  for (let iz = Math.floor(cz - R2); iz <= Math.ceil(cz + R2); iz++) for (let ix = Math.floor(cx - R2); ix <= Math.ceil(cx + R2); ix++) {
    if (ix < 0 || iz < 0 || ix >= W.nx || iz >= W.nz) continue;
    const d = Math.hypot(ix - cx, iz - cz) * W.meta.cell;
    const t = d < r ? 1 : d > r + fall ? 0 : 1 - (d - r) / fall;
    const k = t * t * (3 - 2 * t), i = iz * W.nx + ix;
    W.H[i] = W.H[i] * (1 - k) + Math.max(h0, 0.6) * k;
  }
  return Math.max(h0, 0.6);
}

// ------------------------------------------------------------ deterministic rng
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ------------------------------------------------------------ terrain (tiled + LOD)
const TILE = 48;
export function buildTerrain(scene) {
  const m = W.meta, group = new THREE.Group(); group.name = "terrain";
  const mat = patchRestore(new THREE.MeshLambertMaterial({ map: W.colorTex }), { detail: true });
  W.tiles = [];
  for (let tz = 0; tz < W.nz - 1; tz += TILE) for (let tx = 0; tx < W.nx - 1; tx += TILE) {
    const lod = new THREE.LOD();
    for (const [step, dist] of [[1, 0], [2, 260], [4, 520]]) {
      const g = tileGeom(tx, tz, Math.min(TILE, W.nx - 1 - tx), Math.min(TILE, W.nz - 1 - tz), step);
      const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false;
      lod.addLevel(mesh, dist);
    }
    const cx = m.x0 + (tx + TILE / 2) * m.cell, cz = m.z0 + (tz + TILE / 2) * m.cell;
    lod.position.set(cx, 0, cz); lod.updateMatrix(); lod.matrixAutoUpdate = false;
    lod.children.forEach((c) => { c.position.set(-cx, 0, -cz); c.updateMatrix(); });
    lod.userData.c = new THREE.Vector2(cx, cz);
    group.add(lod); W.tiles.push(lod);
  }
  scene.add(group);
  return group;
}
function tileGeom(tx, tz, w, h, step) {
  const m = W.meta, nx = Math.floor(w / step) + 1, nz = Math.floor(h / step) + 1;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), did = new Float32Array(nx * nz);
  let p = 0, u = 0, k = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const gx = Math.min(tx + i * step, W.nx - 1), gz = Math.min(tz + j * step, W.nz - 1), idx = gz * W.nx + gx;
    pos[p++] = m.x0 + gx * m.cell; pos[p++] = W.H[idx]; pos[p++] = m.z0 + gz * m.cell;
    uv[u++] = (gx + 0.5) / W.nx; uv[u++] = 1 - (gz + 0.5) / W.nz;
    did[k++] = W.D[idx];
  }
  const index = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    index.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setAttribute("aDid", new THREE.BufferAttribute(did, 1));
  g.setIndex(index); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------ sea
export function buildSea(scene) {
  const g = new THREE.PlaneGeometry(6000, 7000, 1, 1); g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: RU.uTime, fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 2 } },
    vertexShader: `varying vec3 vW; varying float vFog; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv = viewMatrix*w; vFog = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 fogColor; uniform float fogNear, fogFar; varying vec3 vW; varying float vFog;
      float h(vec2 p){ return sin(p.x*0.08+uTime*0.9)*0.5+sin(p.y*0.11-uTime*0.7)*0.5+sin((p.x+p.y)*0.05+uTime*0.4); }
      void main(){ float w = h(vW.xz); vec3 deep = vec3(0.04,0.27,0.45), lite = vec3(0.2,0.62,0.78);
        vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - max(0.0, V.y), 3.0);
        vec3 c = mix(deep, lite, 0.45 + 0.18*w);
        c = mix(c, vec3(0.78,0.88,0.98), fr * 0.55);
        float sp = pow(max(0.0, sin(vW.x*0.35+uTime*1.3)*sin(vW.z*0.31-uTime*1.1)), 14.0);
        c += sp*0.45;
        float f = smoothstep(fogNear, fogFar, vFog); gl_FragColor = vec4(mix(c, fogColor, f), 1.0); }`,
  });
  mat.fog = false;
  const sea = new THREE.Mesh(g, mat); sea.name = "sea"; sea.position.set(0, -0.05, 0); sea.renderOrder = -1;
  scene.add(sea); W.seaMat = mat;
  return sea;
}

// ------------------------------------------------------------ ribbons (rivers / roads)
function ribbon(pts, width, yfn, attrs = {}) {
  const P = [], N = [], I = [], DID = [], UV = [];
  let along = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx, [x, z] = pts[i];
    if (i > 0) along += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
    for (const s of [-1, 1]) {
      const px = x + nx * width * 0.5 * s, pz = z + nz * width * 0.5 * s;
      P.push(px, yfn(px, pz, x, z), pz); N.push(0, 1, 0); DID.push(districtAt(x, z)); UV.push(s < 0 ? 0 : 1, along / width);
    }
    if (i > 0) { const o = (i - 1) * 2; I.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute("aDid", new THREE.Float32BufferAttribute(DID, 1));
  g.setIndex(I);
  return g;
}
function densify(pts, maxSeg) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / maxSeg));
    for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n]);
  }
  out.push(pts[pts.length - 1]); return out;
}
import { mergeGeometries } from "../vendor/addons/utils/BufferGeometryUtils.js";
export function buildRiversRoads(scene) {
  const rivers = [], roads = [];
  for (const r of W.meta.rivers) {
    const pts = densify(r.pts, 4); const w = r.rank <= 4 ? 9 : r.rank <= 6 ? 6.5 : 4.5;
    rivers.push(ribbon(pts, w, (x, z, cx, cz) => Math.max(heightAt(cx, cz) + 0.55, 0.1)));
  }
  const rmat = patchRestore(new THREE.MeshLambertMaterial({ color: 0x3a9ccf, emissive: 0x0e3550 }));
  const rmesh = new THREE.Mesh(mergeGeometries(rivers), rmat); rmesh.name = "rivers"; scene.add(rmesh);
  // two-lane highways (one lane each way) and a lookup so towns/trees keep off the tarmac
  const RB = 40, rgrid = new Map();
  for (const r of W.meta.roads) {
    const pts = densify(r.pts, 3); const w = r.type === "Major Highway" ? 9 : 7.4; r.w = w;
    roads.push(ribbon(pts, w, (x, z) => heightAt(x, z) + 0.05));
    for (const p of pts) { const k = `${Math.floor(p[0] / RB)},${Math.floor(p[1] / RB)}`; if (!rgrid.has(k)) rgrid.set(k, []); rgrid.get(k).push(p[0], p[1], w / 2); }
  }
  W.nearRoad = (x, z, pad = 0) => {
    const cx = Math.floor(x / RB), cz = Math.floor(z / RB);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = rgrid.get(`${cx + i},${cz + j}`); if (!a) continue;
      for (let k = 0; k < a.length; k += 3) if (Math.hypot(a[k] - x, a[k + 1] - z) < a[k + 2] + pad) return true;
    }
    return false;
  };
  const tex = roadTexture();
  const mat = patchRestore(new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
  const mesh = new THREE.Mesh(mergeGeometries(roads), mat); mesh.name = "roads"; scene.add(mesh);
}
function roadTexture() {
  const c = document.createElement("canvas"); c.width = 32; c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "#5b5a5f"; x.fillRect(0, 0, 32, 64);
  x.fillStyle = "#e8e2c8"; x.fillRect(1, 0, 2, 64); x.fillRect(29, 0, 2, 64);
  x.fillStyle = "#f2c94c"; x.fillRect(15, 0, 2, 32);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------ instanced scatter, grouped per terrain tile for culling
function cellGroups() { const map = new Map(); return { map, key: (x, z) => `${Math.floor(x / 240)},${Math.floor(z / 240)}` }; }
function vcolGeom(g, color, jitter = 0) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color);
  for (let i = 0; i < n; i++) { const k = 1 - jitter + Math.random() * jitter * 2; c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
}
function treeGeom() {
  const trunk = vcolGeom(new THREE.CylinderGeometry(0.25, 0.4, 3, 6).translate(0, 1.5, 0), 0x6b4a32);
  const a = vcolGeom(new THREE.IcosahedronGeometry(2.2, 0).scale(1, 0.85, 1).translate(0, 4.2, 0), 0x3f7f3a, 0.12);
  const b = vcolGeom(new THREE.IcosahedronGeometry(1.5, 0).translate(1.0, 5.2, 0.4), 0x4b8f3f, 0.12);
  const c = vcolGeom(new THREE.IcosahedronGeometry(1.4, 0).translate(-0.9, 4.9, -0.5), 0x356f33, 0.12);
  return mergeGeometries([trunk, a, b, c].map((g) => g.index ? g.toNonIndexed() : g));
}
function palmGeom() {
  const parts = [];
  for (let i = 0; i < 6; i++) parts.push(vcolGeom(new THREE.CylinderGeometry(0.2, 0.26, 1.4, 6).translate(i * 0.12, 0.7 + i * 1.35, 0), 0x8a6a45));
  for (let k = 0; k < 7; k++) {
    const leaf = new THREE.ConeGeometry(0.5, 4.2, 4, 1).rotateZ(Math.PI / 2 + 0.35).translate(2.0, 8.6, 0).rotateY(k * Math.PI * 2 / 7);
    leaf.translate(0.7, 0, 0); parts.push(vcolGeom(leaf, 0x3c8c3a, 0.1));
  }
  parts.push(vcolGeom(new THREE.SphereGeometry(0.5, 6, 4).translate(0.7, 8.2, 0), 0x6b4f2a));
  return mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g));
}
function rockGeom() { return vcolGeom(new THREE.IcosahedronGeometry(1.6, 0).scale(1.2, 0.8, 1), 0xb08a68, 0.1); }

export function buildVegetation(scene, colliders = []) {
  const r = rng(1234), groups = new Map(), m = W.meta;
  const kinds = { tree: treeGeom(), palm: palmGeom(), rock: rockGeom() };
  const mats = {};
  for (const k in kinds) mats[k] = patchRestore(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), { instanced: true });
  const add = (kind, x, z, s, rot, did) => {
    if (W.nearRoad && W.nearRoad(x, z, kind === "rock" ? 3.5 : 2)) return;
    const key = `${Math.floor(x / 240)},${Math.floor(z / 240)}`;
    if (!groups.has(key)) groups.set(key, { tree: [], palm: [], rock: [] });
    const y = heightAt(x, z) - 0.2;
    groups.get(key)[kind].push([x, y, z, s, rot, did]);
    if (kind === "rock") colliders.push({ x, z, r: 1.55 * s, top: y + 1.1 * s });
    else colliders.push({ x, z, r: (kind === "tree" ? 0.45 : 0.32) * s });
  };
  const STEP = 6.5;
  for (let z = m.z0; z < m.z0 + (W.nz - 1) * m.cell; z += STEP) for (let x = m.x0; x < m.x0 + (W.nx - 1) * m.cell; x += STEP) {
    const jx = x + (r() - 0.5) * STEP, jz = z + (r() - 0.5) * STEP;
    const [t, p, k, ka] = vegAt(jx, jz); if (ka < 0.5 && r() > 0.25) continue;  // sparse outside the state
    const h = heightAt(jx, jz); if (h < 0.4) continue;
    if (W.reserved && W.reserved.some((q) => Math.hypot(q.x - jx, q.z - jz) < q.r)) continue;
    const did = districtAt(jx, jz); const roll = r();
    if (roll < t * 0.3) add("tree", jx, jz, 0.75 + r() * 0.7, r() * 6.28, did);
    else if (roll < t * 0.3 + p * 0.32) add("palm", jx, jz, 0.8 + r() * 0.45, r() * 6.28, did);
    else if (roll < t * 0.3 + p * 0.32 + k * 0.22) add("rock", jx, jz, 0.6 + r() * 2.2, r() * 6.28, did);
  }
  const root = new THREE.Group(); root.name = "veg"; W.vegCells = [];
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  for (const [key, g] of groups) {
    const cell = new THREE.Group(); const [kx, kz] = key.split(",").map(Number);
    cell.userData.c = new THREE.Vector2((kx + 0.5) * 240, (kz + 0.5) * 240);
    for (const kind of ["tree", "palm", "rock"]) {
      const list = g[kind]; if (!list.length) continue;
      const im = new THREE.InstancedMesh(kinds[kind], mats[kind], list.length);
      const did = new Float32Array(list.length);
      list.forEach(([x, y, z, s, rot, d], i) => {
        E.set(kind === "palm" ? (r() - 0.5) * 0.15 : 0, rot, 0); Q.setFromEuler(E); S.set(s, s * (kind === "tree" ? 0.85 + r() * 0.4 : 1), s); P.set(x, y, z);
        M4.compose(P, Q, S); im.setMatrixAt(i, M4); did[i] = d;
      });
      im.geometry = im.geometry.clone();
      im.geometry.setAttribute("aDid", new THREE.InstancedBufferAttribute(did, 1));
      im.computeBoundingSphere(); cell.add(im);
    }
    root.add(cell); W.vegCells.push(cell);
  }
  scene.add(root);
}

// ------------------------------------------------------------ sky dome
export function buildSky(scene) {
  const g = new THREE.SphereGeometry(1800, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2f7fd8) }, hor: { value: new THREE.Color(0xffe3bd) }, sunDir: { value: new THREE.Vector3(300, 420, -380).normalize() }, gloom: { value: 0 }, uTime: RU.uTime },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }",
    fragmentShader: `uniform vec3 top, hor, sunDir; uniform float gloom, uTime; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int k=0;k<5;k++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
      void main(){
        float t = smoothstep(-0.04, 0.6, vD.y); vec3 c = mix(hor, top, pow(t, 0.8));
        float s = max(0.0, dot(vD, sunDir));
        c += vec3(1.0,0.82,0.5)*pow(s, 7.0)*0.4 + vec3(1.0,0.95,0.8)*pow(s, 90.0)*0.8 + vec3(1.0)*smoothstep(0.9993, 0.9997, s)*2.5;
        // drifting cumulus clouds, lit from the sun side
        if (vD.y > 0.0) {
          vec2 uv = vD.xz / (vD.y + 0.18) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
          float cl = fbm(uv);
          float cov = smoothstep(0.52, 0.78, cl) * smoothstep(0.0, 0.18, vD.y);
          float lit = 0.75 + 0.35 * fbm(uv + sunDir.xz * 0.08) - 0.25 * smoothstep(0.7, 0.95, cl);
          vec3 cc = mix(vec3(0.82,0.84,0.9), vec3(1.0,0.98,0.94), lit) + vec3(1.0,0.8,0.5) * pow(s, 4.0) * 0.25;
          c = mix(c, cc, cov * 0.92);
        }
        c = mix(c, hor * 1.05, (1.0 - smoothstep(0.0, 0.08, abs(vD.y))) * 0.5);   // horizon haze
        vec3 g = vec3(dot(c, vec3(0.3,0.59,0.11)))*vec3(0.8,0.82,0.92); gl_FragColor = vec4(mix(c, g, gloom), 1.0); }`,
  });
  const sky = new THREE.Mesh(g, mat); sky.name = "sky"; sky.frustumCulled = false; sky.renderOrder = -2; scene.add(sky);
  return sky;
}

/** show/hide far vegetation + tiles near the camera */
export function cull(camPos, far) {
  const f2 = far * far;
  if (W.vegCells) for (const c of W.vegCells) { const dx = c.userData.c.x - camPos.x, dz = c.userData.c.y - camPos.z; c.visible = dx * dx + dz * dz < (far * 0.6 + 140) ** 2; }
  if (W.tiles) for (const t of W.tiles) { const dx = t.userData.c.x - camPos.x, dz = t.userData.c.y - camPos.z; t.visible = dx * dx + dz * dz < (far + 200) ** 2; }
}
