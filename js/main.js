// MAATHU — Bangara & Gundamma vs the Silence. Game core.
import * as THREE from "three";
import { W, loadWorld, buildTerrain, buildSea, buildRiversRoads, buildVegetation, buildTowns, buildSky, cull, heightAt, districtAt,
  lonlat, flattenPad, updateRestore, setDistrictTarget, restore, worldUniforms, rng } from "./world.js";
import { loadHero, play, loadProps, placeProp, gradientMap } from "./chars.js";
import { CHAPTERS, FESTIVAL, MOUNA_TAUNTS } from "./content.js";
import * as UI from "./ui.js";
import { Input, initInput, pollKeys, consume } from "./input.js";
import { Sound } from "./audio.js";
import { Save } from "./save.js";
import { Net, hostRoom, joinRoom } from "./net.js";
import { say } from "./speech.js";

const $ = UI.$;
const V3 = THREE.Vector3;
const G_ACC = 26, THROW_V = 27;

// ============================================================ renderer / scene
const canvas = $("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const FOG = new THREE.Color(0xf3dcb8);
scene.fog = new THREE.Fog(FOG, 70, 560);
const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 2600);
const sun = new THREE.DirectionalLight(0xffeccc, 2.9); sun.position.set(300, 420, -380); scene.add(sun);
const hemi = new THREE.HemisphereLight(0xd6ebff, 0x5c4a30, 1.05); scene.add(hemi);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 68 : 58; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

// ============================================================ state
const S = {
  mode: "solo",          // solo | host | guest
  me: "bangara",         // hero this phone drives (solo: currently active)
  ch: 0, phase: "prologue", // prologue | explore | hunt | return | fill | speak | free
  heroes: {}, orbs: [], wisps: [], fest: [], colliders: [], boxes: [], landmarks: [], beacons: [],
  playing: false, busy: false, t: 0, lastLook: 0,
  cam: { yaw: Math.PI, pitch: 0.32, dist: 8, pos: new V3() },
  districtIds: {}, mouna: null,
};
let props = null, mapImg = null;

// ============================================================ boot
async function boot() {
  const step = (p, m) => { $("loadFill").style.width = p + "%"; $("loadMsg").textContent = m; };
  try {
    Save.load();
    step(8, "Unrolling the map of Karnataka…");
    await loadWorld();
    for (const d of W.meta.districts) S.districtIds[d.name] = d.id;
    // landmarks: flatten pads before terrain is built
    W.reserved = [];
    for (const c of CHAPTERS) { const p = lonlat(c.lon, c.lat); c.x = p.x; c.z = p.z; c.y = flattenPad(p.x, p.z, c.pad, 26); W.reserved.push({ x: p.x, z: p.z, r: c.pad + 46 }); }
    step(25, "Raising the Western Ghats…");
    await tick();
    buildSky(scene); buildTerrain(scene); buildSea(scene);
    step(40, "Filling the rivers…"); await tick();
    buildRiversRoads(scene);
    step(52, "Planting coconut trees…"); await tick();
    buildVegetation(scene);
    step(62, "Building towns…"); await tick();
    buildTowns(scene, S.colliders); buildColliderGrid();
    step(72, "Waking up Bangara and Gundamma…");
    const [b, g, pr] = await Promise.all([loadHero("bangara"), loadHero("gundamma"), loadProps()]);
    props = pr;
    for (const h of [b, g]) { scene.add(h.holder); scene.add(h.holder.userData.shadow); S.heroes[h.kind] = makeHeroState(h); }
    step(86, "Placing the landmarks…"); await tick();
    placeLandmarks();
    mapImg = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "world/color.png"; });
    UI.setMapImage(mapImg);
    buildMouna();
    step(100, "Ready!");
    initInput(canvas); bindUI(); applyRestoreFromSave(true);
    S.playing = false; requestAnimationFrame(loop);
    setTimeout(() => { UI.screen("title"); refreshTitle(); }, 300);
  } catch (e) {
    console.error(e); $("loadMsg").textContent = "Something went wrong loading the game: " + e.message;
  }
}
const tick = () => new Promise((r) => setTimeout(r, 16));

// ============================================================ heroes
function makeHeroState(h) {
  return { h, kind: h.kind, pos: new V3(), vel: new V3(), vy: 0, yaw: 0, ground: true, jumps: 0, dash: 0, dashCd: 0, pound: 0, poundCd: 0,
    throwT: 0, stun: 0, inv: 0, ctrl: "ai", net: null, anim: "idle", air: 0 };
}
function placeHeroesAt(x, z, yaw = 0) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const sp = { bangara: [x - fz * 1.6, z + fx * 1.6], gundamma: [x + fz * 1.6, z - fx * 1.6] };
  for (const k in S.heroes) { const H = S.heroes[k]; H.pos.set(sp[k][0], 0, sp[k][1]); H.pos.y = groundAt(H.pos.x, H.pos.z, 999); H.vy = 0; H.vel.set(0, 0, 0); H.yaw = yaw; }
  S.cam.yaw = yaw + Math.PI; S.cam.pos.set(x - fx * 8, S.heroes.bangara.pos.y + 4, z - fz * 8);
}
const active = () => S.heroes[S.me];
const other = () => S.heroes[S.me === "bangara" ? "gundamma" : "bangara"];

// ============================================================ colliders
const GRID = new Map(), CELL = 24;
function buildColliderGrid() {
  for (const c of S.colliders) {
    const k = `${Math.floor(c.x / CELL)},${Math.floor(c.z / CELL)}`;
    if (!GRID.has(k)) GRID.set(k, []); GRID.get(k).push(c);
  }
}
function nearCircles(x, z) {
  const out = [], cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = GRID.get(`${cx + i},${cz + j}`); if (a) out.push(...a); }
  return out;
}
// landmark collider boxes, defined in Blender coords [x, y, halfX, halfY, top] (three z = -blender y)
const LMBOX = {
  lm_vidhana: [[0, 2, 21, 7, 10.2], [0, 2, 4.6, 4.6, 19.5], [0, -6.4, 9.8, 2.4, 10.1]],
  lm_palace: [[0, 2, 22, 7, 12.2], [0, -2, 5, 5, 21], [-14, -1, 3, 3, 15.5], [14, -1, 3, 3, 15.5]],
  lm_hampi: [[0, 0, 4, 2.6, 6.4], [0, 26, 8, 5, 8.0], [0, 26, 6.6, 4.0, 30]],
  lm_jog: [],
  lm_golgumbaz: [[0, 0, 12.2, 12.2, 21.4], [12.6, 12.6, 2.9, 2.9, 27], [-12.6, 12.6, 2.9, 2.9, 27], [12.6, -12.6, 2.9, 2.9, 27], [-12.6, -12.6, 2.9, 2.9, 27]],
  lm_badami: [[0, 9, 33, 5, 16]],
  lm_coorg: [[0, 0, 3.4, 3.4, 6.9]],
  lm_coast: [[0, 0, 7, 4.5, 8.2], [0, 0, 6.2, 3.8, 44], [24, 10, 2.1, 2.1, 25]],
};
// one special high orb per chapter (Blender local coords x, y, height-above-pad) — needs Gundamma's throw
const HIGH = { lm_vidhana: [-12, -6.4, 11.3], lm_palace: [-12, 2, 13.4], lm_coorg: [9, 9, 9.5], lm_coast: [5.6, -3.2, 9.4],
  lm_jog: [0, 4, 10], lm_hampi: [0, 0, 7.6], lm_badami: [18, 0.0, 10.2], lm_golgumbaz: [17, -17, 10.5] };
function lmLocalToWorld(c, bx, by) {
  const a = THREE.MathUtils.degToRad(c.rot || 0), lx = bx, lz = -by;
  return [c.x + lx * Math.cos(a) + lz * Math.sin(a), c.z - lx * Math.sin(a) + lz * Math.cos(a)];
}
function groundAt(x, z, y) {
  let g = heightAt(x, z);
  for (const b of S.boxes) {
    const dx = x - b.x, dz = z - b.z; if (Math.abs(dx) > b.R || Math.abs(dz) > b.R) continue;
    const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
    if (Math.abs(lx) < b.hx && Math.abs(lz) < b.hz && y >= b.top - 0.7) g = Math.max(g, b.top);
  }
  return g;
}
function collide(p, r) {
  for (const b of S.boxes) {
    const dx = p.x - b.x, dz = p.z - b.z; if (Math.abs(dx) > b.R + r || Math.abs(dz) > b.R + r) continue;
    if (p.y >= b.top - 0.7) continue;
    let lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
    const px = b.hx + r - Math.abs(lx), pz = b.hz + r - Math.abs(lz);
    if (px > 0 && pz > 0) {
      if (px < pz) lx += Math.sign(lx) * px; else lz += Math.sign(lz) * pz;
      p.x = b.x + lx * b.c + lz * b.s; p.z = b.z - lx * b.s + lz * b.c;
    }
  }
  for (const c of nearCircles(p.x, p.z)) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m && d > 0.001) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
  }
}

// ============================================================ landmarks, NPCs, beacons
function placeLandmarks() {
  const beamGeo = new THREE.CylinderGeometry(2.4, 3.2, 420, 16, 1, true).translate(0, 210, 0);
  CHAPTERS.forEach((c, i) => {
    const did = districtAt(c.x, c.z);
    const lm = placeProp(props[c.lm], did, 0.05); lm.position.set(c.x, c.y - 0.05, c.z); lm.rotation.y = THREE.MathUtils.degToRad(c.rot || 0);
    scene.add(lm); S.landmarks.push(lm);
    for (const [bx, by, hx, hy, top] of LMBOX[c.lm]) {
      const [wx, wz] = lmLocalToWorld(c, bx, by), a = THREE.MathUtils.degToRad(c.rot || 0);
      S.boxes.push({ x: wx, z: wz, hx, hz: hy, top: c.y + top, c: Math.cos(a), s: Math.sin(a), R: Math.hypot(hx, hy) });
    }
    // NPC guardian
    const [nx, nz] = lmLocalToWorld(c, c.npc.at[0], c.npc.at[1]);
    const npc = placeProp(props[c.npc.model], did, 0.02); npc.scale.setScalar(c.npc.scale);
    npc.position.set(nx, groundAt(nx, nz, 999), nz); npc.rotation.y = Math.atan2(c.x - nx, c.z - nz) + Math.PI;
    scene.add(npc); c.npcObj = npc; c.nx = nx; c.nz = nz;
    // beacon
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { col: { value: new THREE.Color(0xffc93c) }, a: { value: 0 }, uTime: worldUniforms.uTime },
      vertexShader: "varying float vY; void main(){ vY = position.y/420.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform vec3 col; uniform float a, uTime; varying float vY; void main(){ float f = (1.0-vY)*(0.6+0.4*sin(uTime*2.0-vY*30.0)); gl_FragColor = vec4(col*f*a, 1.0); }",
    });
    const beam = new THREE.Mesh(beamGeo, mat); beam.position.set(c.x, c.y, c.z); beam.frustumCulled = false; scene.add(beam);
    S.beacons.push(beam);
  });
}

// ============================================================ Mouna + wisps
function buildMouna() {
  // Mouna: a drifting ink cloak with a pale mask, mouth stitched shut
  const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(0.15 + Math.sin(t * Math.PI * 0.95) * 1.5 + t * t * 0.9, t * 4.2)); }
  const cloak = new THREE.Mesh(new THREE.LatheGeometry(pts.reverse(), 28), new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, uniforms: { uTime: worldUniforms.uTime },
    vertexShader: "uniform float uTime; varying float vY; void main(){ vec3 p = position; float w = sin(p.y*2.0+uTime*2.5+atan(p.x,p.z)*3.0)*0.18*(1.0-p.y/4.2); p.xz *= 1.0 + w; vY = p.y/4.2; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }",
    fragmentShader: "varying float vY; void main(){ vec3 c = mix(vec3(0.05,0.03,0.12), vec3(0.32,0.22,0.55), vY); gl_FragColor = vec4(c, smoothstep(0.0,0.35,vY)*0.96); }",
  }));
  cloak.position.y = -1.0; g.add(cloak);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshToonMaterial({ color: 0xf2eee8, gradientMap: gradientMap() }));
  mask.scale.set(1, 1.15, 0.65); mask.position.set(0, 3.5, 0.55); g.add(mask);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), eyeM); e.scale.set(1.5, 0.6, 0.4); e.position.set(sx * 0.27, 3.62, 1.02); e.rotation.z = sx * 0.25; g.add(e); }
  const lips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), eyeM); lips.position.set(0, 3.15, 1.0); g.add(lips);
  for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.05), eyeM); st.position.set(-0.18 + i * 0.12, 3.15, 1.01); g.add(st); }
  g.visible = false; scene.add(g); S.mouna = g;
  // wisp template
  S.wispGeo = new THREE.IcosahedronGeometry(0.6, 2);
  S.wispMat = new THREE.ShaderMaterial({
    uniforms: { uTime: worldUniforms.uTime },
    vertexShader: "uniform float uTime; varying float vN; void main(){ vec3 p = position*(1.0+0.22*sin(position.y*7.0+uTime*6.0+position.x*5.0)); vN = normal.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }",
    fragmentShader: "varying float vN; void main(){ gl_FragColor = vec4(mix(vec3(0.07,0.04,0.14), vec3(0.35,0.25,0.6), vN*0.5+0.5), 1.0); }",
  });
  S.wispEye = new THREE.MeshBasicMaterial({ color: 0xffffff });
  S.orbGeo = new THREE.IcosahedronGeometry(0.55, 1);
}
function makeWisp(x, z, home) {
  const g = new THREE.Group(); g.add(new THREE.Mesh(S.wispGeo, S.wispMat));
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), S.wispEye); e.position.set(sx * 0.2, 0.12, 0.52); e.scale.set(1, 1.4, 0.5); g.add(e); }
  g.position.set(x, heightAt(x, z) + 1.4, z); scene.add(g);
  return { obj: g, home, tx: x, tz: z, alive: true, respawn: 0, speed: 5.4 + S.ch * 0.35, t: Math.random() * 10 };
}
function clearWisps() { for (const w of S.wisps) scene.remove(w.obj); S.wisps = []; }

// ============================================================ orbs
const emojiTex = new Map();
function emojiTexture(e, ring = "#FFD45C") {
  const key = e + ring; if (emojiTex.has(key)) return emojiTex.get(key);
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, "rgba(255,250,220,1)"); g.addColorStop(0.55, ring); g.addColorStop(1, "rgba(255,200,60,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.font = "64px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(e, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; emojiTex.set(key, t); return t;
}
function makeOrbObj(emoji, ring) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji, ring), depthWrite: false, fog: false }));
  s.scale.setScalar(2.4); scene.add(s); return s;
}
function spawnChapterOrbs(ci) {
  clearOrbs(); const c = CHAPTERS[ci], r = rng(1000 + ci * 77);
  c.words.forEach((wd, i) => {
    let x, z, y;
    if (i === 5) { const [bx, by, hh] = HIGH[c.lm]; [x, z] = lmLocalToWorld(c, bx, by); y = c.y + hh; }
    else {
      for (let k = 0; k < 40; k++) {
        const a = (i / 5) * Math.PI * 2 + r() * 0.9, d = 34 + r() * 70;
        x = c.x + Math.cos(a) * d; z = c.z + Math.sin(a) * d;
        const blocked = nearCircles(x, z).some((cc) => Math.hypot(cc.x - x, cc.z - z) < cc.r + 2) || S.boxes.some((bb) => Math.hypot(bb.x - x, bb.z - z) < bb.R + 3);
        if (heightAt(x, z) > 0.8 && districtAt(x, z) > 0 && !blocked) break;
      }
      y = groundAt(x, z, 999) + 1.3;
    }
    const o = makeOrbObj(wd.p); o.position.set(x, y, z);
    S.orbs.push({ i, wd, x, y, z, home: [x, y, z], got: false, obj: o, high: i === 5 });
  });
}
function clearOrbs() { for (const o of S.orbs) scene.remove(o.obj); S.orbs = []; }

// ============================================================ story flow
function chap() { return CHAPTERS[Math.min(S.ch, CHAPTERS.length - 1)]; }
function storyDone() { return Save.d.done.length >= CHAPTERS.length; }
function applyRestoreFromSave(instant) {
  const done = new Set(Save.d.done);
  for (const c of CHAPTERS) for (const dn of c.districts) {
    const id = S.districtIds[dn]; if (!id) continue;
    const v = done.has(c.id) ? 1 : 0; setDistrictTarget(id, v); if (instant) restore.levels[id] = v;
  }
  if (instant) updateRestore(0.0001);
}
function colourAmount() { return Save.d.done.length / CHAPTERS.length; }

async function startStory() {
  S.playing = true; UI.screen(null); UI.show("hud"); Sound.unlock();
  setupControl();
  const d = Save.d; S.ch = Math.min(d.ch, CHAPTERS.length - 1); S.phase = d.phase;
  if (storyDone()) S.phase = "free";
  const c = chap();
  if (S.phase === "prologue") {
    placeHeroesAt(c.x, c.z + 62, Math.PI);
    await prologue();
  } else {
    if (d.pos) placeHeroesAt(d.pos[0], d.pos[1], d.pos[2] || 0);
    else { const pc = Save.d.done.length ? CHAPTERS[Save.d.done.length - 1] : c; placeHeroesAt(pc.x, pc.z + 40, Math.PI); }
    if (S.phase === "hunt" || S.phase === "return" || S.phase === "fill" || S.phase === "speak") beginHunt(false);
    if (S.phase === "fill" || S.phase === "speak") S.phase = "return";
  }
  refreshFestival();
  Sound.setColour(colourAmount());
  broadcastState();
}
async function prologue() {
  const c = CHAPTERS[0];
  // Bengaluru starts in full colour, then Mouna drains it.
  for (const dn of c.districts) { const id = S.districtIds[dn]; restore.levels[id] = 1; setDistrictTarget(id, 1); }
  S.mouna.visible = true; S.mouna.position.set(c.x, c.y + 14, c.z - 4);
  S.busy = true;
  await sleep(600);
  await UI.dialogue(c.intro.slice(0, 2), c.npc);
  for (const dn of c.districts) setDistrictTarget(S.districtIds[dn], 0);
  UI.flash(); Sound.sfx("steal");
  await UI.dialogue(c.intro.slice(2), c.npc);
  S.mouna.visible = false;
  Save.d.phase = "hunt"; Save.write();
  S.busy = false; beginHunt(true);
  setTimeout(() => { if (!localStorage.getItem("maathu-helped")) { localStorage.setItem("maathu-helped", "1"); UI.show("help"); } }, 400);
}
function beginHunt(fresh) {
  S.phase = Save.d.phase = "hunt"; Save.write();
  spawnChapterOrbs(S.ch);
  clearWisps(); const c = chap(), r = rng(500 + S.ch);
  const n = 4 + S.ch;
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = 40 + r() * 60; S.wisps.push(makeWisp(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, c)); }
  S.mouna.visible = S.ch === CHAPTERS.length - 1;
  if (fresh) UI.toast(`🔎 Find the <b>6 glowing words</b> near ${c.place.split(",")[0]}!`, "gold", 4000);
  broadcastState();
}
async function arriveAtChapter() {
  const c = chap(); S.busy = true;
  Save.d.visited = [...new Set([...(Save.d.visited || []), c.id])];
  if (S.mode === "host") Net.send("evt", { e: "dlg", ch: S.ch, which: "intro" });
  await UI.dialogue(c.intro, c.npc); S.busy = false;
  beginHunt(true);
}
function collectOrb(o, byKind) {
  if (o.got) return;
  o.got = true; o.obj.visible = false; Sound.sfx("collect");
  const isMine = byKind === S.me || S.mode === "solo";
  const newWord = Save.learn(o.wd.w);
  if (isMine) { S.busy = true; UI.wordCard(o.wd).then(() => { S.busy = false; afterCollect(); }); }
  else { UI.toast(`${byKind === "bangara" ? "Bangara" : "Gundamma"} found <b>${o.wd.w}</b> · ${o.wd.k}`, "gold"); afterCollect(); }
  updateWordBadge();
  broadcastState();
  if (S.mode === "guest") Net.send("collect", { i: o.i });
}
function afterCollect() {
  const left = S.orbs.filter((o) => !o.got).length;
  if (left === 0 && S.phase === "hunt") {
    S.phase = Save.d.phase = "return"; Save.write();
    UI.toast(`All six words found! Now go talk to <b>${chap().npc.name}</b> ${chap().npc.icon}`, "gold", 4200);
    broadcastState();
  } else if (left > 0) UI.toast(`${6 - left}/6 words in the tiffin`, "", 1800);
}
async function talkToNpc() {
  if (S.phase !== "return") return;
  S.phase = "fill"; S.busy = true; broadcastState();
  if (S.mode !== "solo") Net.send("evt", { e: "fill" });
  UI.fillStory(chap(), onFillDone);
}
function onFillDone() {
  if (S.mode === "guest") { Net.send("fillDone"); return; }
  S.phase = "speak"; broadcastState(); Net.send("evt", { e: "speak" });
  UI.speakChallenge(chap().speak, onSpeakDone);
}
async function onSpeakDone() {
  if (S.mode === "guest") { Net.send("speakDone"); return; }
  if (S.phase !== "speak") return;
  S.phase = "restoring"; Net.send("evt", { e: "restore", ch: S.ch });
  await restoreChapter(S.ch);
}
async function restoreChapter(ci) {
  const c = CHAPTERS[ci];
  ["fill", "speak"].forEach((m) => UI.hide(m));
  S.busy = true; clearWisps(); clearOrbs();
  for (const dn of c.districts) setDistrictTarget(S.districtIds[dn], 1);
  worldUniforms.wave.value.set(c.x, c.z, 1, 1); S.waveT = 0;
  UI.flash(); Sound.sfx("restore"); play(S.heroes.bangara.h, "cheer"); play(S.heroes.gundamma.h, "cheer");
  S.cheer = 3;
  await sleep(1600);
  await UI.dialogue(c.outro, c.npc);
  if (ci === CHAPTERS.length - 1) { S.mouna.visible = false; }
  if (S.mode !== "guest") {
    if (!Save.d.done.includes(c.id)) Save.d.done.push(c.id);
    S.ch = Math.min(ci + 1, CHAPTERS.length - 1);
    Save.d.ch = S.ch; S.phase = Save.d.phase = storyDone() ? "free" : "explore"; Save.write();
  }
  Sound.setColour(colourAmount());
  S.busy = false; refreshFestival(); broadcastState();
  if (storyDone()) UI.toast("🎉 Karnataka is fully restored! 🌟 Festival words now sparkle in every town.", "gold", 6000);
  else UI.toast(`Next: <b>${chap().place}</b>. Follow the golden light!`, "gold", 5000);
}

// ============================================================ festival (endless learning)
function refreshFestival() {
  for (const f of S.fest) scene.remove(f.obj); S.fest = [];
  if (!Save.d.done.length || S.mode === "guest") return;
  const restoredTowns = W.towns.filter((t) => restore.target[districtAt(t.x, t.z)] > 0.5);
  if (!restoredTowns.length) return;
  const pool = FESTIVAL.filter((w) => !Save.d.words[w.w]); const bank = pool.length ? pool : FESTIVAL;
  const r = rng((Date.now() / 864e5) | 0);  // a new set every day
  for (let i = 0; i < Math.min(5, bank.length); i++) {
    const t = restoredTowns[(r() * restoredTowns.length) | 0], a = r() * 6.28, d = 8 + r() * (t.r * 0.8);
    const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d; if (heightAt(x, z) < 0.6) continue;
    const wd = bank[(r() * bank.length) | 0]; if (S.fest.some((f) => f.wd.w === wd.w)) continue;
    const o = makeOrbObj("🌟", "#E79BFF"); const y = groundAt(x, z, 999) + 1.4; o.position.set(x, y, z);
    S.fest.push({ wd, x, y, z, obj: o, town: t.name });
  }
}
async function collectFestival(f) {
  scene.remove(f.obj); S.fest = S.fest.filter((x) => x !== f); S.busy = true; Sound.sfx("collect");
  const ok = await UI.quiz(f.wd, FESTIVAL);
  Save.learn(f.wd.w); S.busy = false; updateWordBadge();
  UI.toast(ok ? `🌟 <b>${f.wd.w}</b> learned first try!` : `🌟 <b>${f.wd.w}</b> is in your tiffin now.`, "gold");
  if (!S.fest.length) setTimeout(refreshFestival, 2000);
}

// ============================================================ control setup
function setupControl() {
  for (const k in S.heroes) S.heroes[k].ctrl = S.mode === "solo" ? (k === S.me ? "me" : "ai") : k === S.me ? "me" : "remote";
  $("bSwap").hidden = S.mode !== "solo";
  updateSpecialBtn(); updateWordBadge();
}
function updateSpecialBtn() {
  const b = $("bSpecial"); const isB = S.me === "bangara";
  b.innerHTML = isB ? "⚡<small>Dash</small>" : "💥<small>Pound</small>";
  $("bTeam").innerHTML = isB ? "🤝<small>Launch</small>" : "🤝<small>Throw</small>";
}
function updateWordBadge() { const n = Object.keys(Save.d.words).length; $("hWords").textContent = n || ""; $("tWords").textContent = n ? `${n} words learned` : ""; }

// ============================================================ hero update
const tmp = new V3();
function updateHero(H, dt) {
  const h = H.h;
  H.dashCd = Math.max(0, H.dashCd - dt); H.poundCd = Math.max(0, H.poundCd - dt); H.inv = Math.max(0, H.inv - dt);
  H.dash = Math.max(0, H.dash - dt); H.throwT = Math.max(0, H.throwT - dt); H.stun = Math.max(0, H.stun - dt);
  if (H.ctrl === "remote") { remoteFollow(H, dt); return animateHero(H, dt); }
  let mx = 0, mz = 0, wantJump = false, wantSpecial = false;
  if (H.ctrl === "me" && !S.busy && !UI.anyModal()) {
    const y = S.cam.yaw, fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
    mx = fx * Input.move.y + rx * Input.move.x; mz = fz * Input.move.y + rz * Input.move.x;
    wantJump = consume("jump"); wantSpecial = consume("special");
  } else if (H.ctrl === "ai" && !S.busy) {
    const L = active(); const back = 2.6;
    const tx = L.pos.x - Math.sin(L.yaw) * back + Math.cos(L.yaw) * 1.3, tz = L.pos.z - Math.cos(L.yaw) * back - Math.sin(L.yaw) * 1.3;
    const dx = tx - H.pos.x, dz = tz - H.pos.z, d = Math.hypot(dx, dz);
    if (d > 70) { H.pos.set(tx, groundAt(tx, tz, 999), tz); }
    else if (d > 1.2) { const k = Math.min(1, (d - 1.2) / 3); mx = dx / d * k; mz = dz / d * k; }
    if (L.pos.y > H.pos.y + 1.6 && H.ground && d < 6 && H.throwT <= 0) wantJump = true;
  }
  if (H.stun > 0) { mx = mz = 0; wantJump = wantSpecial = false; }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const inWater = heightAt(H.pos.x, H.pos.z) < 0.9 && H.pos.y < 1.2;
  let speed = h.speed * (inWater ? 0.6 : 1) * (H.ctrl === "ai" ? 1.12 : 1);
  if (H.dash > 0) speed = 30;
  if (H.pound > 0 && H.ground) speed = 0;
  const acc = H.ground ? 14 : 5;
  if (H.dash > 0) { const f = Math.hypot(H.vel.x, H.vel.z) || 1; H.vel.x = (H.vel.x / f) * speed; H.vel.z = (H.vel.z / f) * speed; }
  else { H.vel.x += (mx * speed - H.vel.x) * Math.min(1, acc * dt); H.vel.z += (mz * speed - H.vel.z) * Math.min(1, acc * dt); }
  // abilities
  if (wantJump && (H.ground || H.jumps < h.air)) { H.vy = H.ground ? h.jump : h.jump * 0.9; H.jumps++; H.ground = false; Sound.sfx("jump"); }
  if (wantSpecial) special(H);
  // integrate
  const prev = tmp.copy(H.pos);
  H.pos.x += H.vel.x * dt; H.pos.z += H.vel.z * dt;
  collide(H.pos, H.kind === "gundamma" ? 0.5 : 0.38);
  // keep inside Karnataka and out of the sea
  const dI = districtAt(H.pos.x, H.pos.z), hg = heightAt(H.pos.x, H.pos.z);
  if (dI === 0 || hg < 0.25) {
    H.pos.x = prev.x; H.pos.z = prev.z; H.vel.x *= -0.2; H.vel.z *= -0.2;
    if (H.ctrl === "me" && S.t - (S.lastWall || 0) > 4) { S.lastWall = S.t; UI.toast(dI === 0 && hg >= 0.25 ? "🌫️ Mouna's silence fog is too thick beyond Karnataka's border." : "🌊 That's the Arabian Sea. Bangara can't swim that far!"); }
  }
  H.vy -= G_ACC * dt * (H.pound > 0 && !H.ground ? 2.4 : 1); H.pos.y += H.vy * dt;
  const gnd = groundAt(H.pos.x, H.pos.z, H.pos.y);
  if (H.pos.y <= gnd) {
    if (!H.ground && H.pound > 0) poundImpact(H);
    H.pos.y = gnd; H.vy = 0; H.ground = true; H.jumps = 0;
  } else if (H.pos.y > gnd + 0.25) H.ground = false;
  else if (H.vy <= 0) { H.pos.y += (gnd - H.pos.y) * Math.min(1, dt * 12); H.ground = true; H.jumps = 0; }
  if (H.pound > 0) H.pound = Math.max(0, H.pound - dt);
  const sp = Math.hypot(H.vel.x, H.vel.z);
  if (sp > 0.6) { const ty = Math.atan2(H.vel.x, H.vel.z); H.yaw += angDiff(H.yaw, ty) * Math.min(1, dt * 12); }
  animateHero(H, dt);
}
function special(H) {
  if (H.kind === "bangara") {
    if (H.dashCd > 0) return;
    const f = Math.hypot(H.vel.x, H.vel.z);
    if (f < 0.5) { H.vel.x = Math.sin(H.yaw); H.vel.z = Math.cos(H.yaw); }
    H.dash = 0.32; H.dashCd = 0.9; H.inv = 0.5; Sound.sfx("dash");
  } else {
    if (H.poundCd > 0) return;
    H.poundCd = 1.4; H.pound = 0.9; Sound.sfx("jump");
    if (H.ground) { H.vy = 7; H.ground = false; }
  }
  if (S.mode !== "solo") Net.send("fx", { k: H.kind, a: H.kind === "bangara" ? "dash" : "pound" });
}
function poundImpact(H) {
  Sound.sfx("pound"); shake(0.5); ring(H.pos, 0x9b7cff);
  for (const w of S.wisps) if (w.alive && w.obj.position.distanceTo(H.pos) < 7) killWisp(w);
  if (S.mode === "guest") Net.send("pound", { x: H.pos.x, z: H.pos.z });
}
function teamUp(byMe) {
  const B = S.heroes.bangara, Gm = S.heroes.gundamma;
  if (B.pos.distanceTo(Gm.pos) > 3.2) { if (byMe) UI.toast("Stand right next to each other to team up! 🤝"); return; }
  if (Gm.throwT > 0) return;
  Gm.throwT = 0.8; play(Gm.h, "throw", 0.08); Sound.sfx("throw");
  if (B.ctrl !== "remote") {
    B.pos.copy(Gm.pos); B.pos.y += 1.2;
    B.vy = THROW_V; B.ground = false; B.jumps = 1; B.throwT = 1.2;
    B.vel.x = Math.sin(Gm.yaw) * 4; B.vel.z = Math.cos(Gm.yaw) * 4;
  }
  if (byMe && S.mode !== "solo") Net.send("team");
}
function animateHero(H, dt) {
  const h = H.h, sp = Math.hypot(H.vel.x, H.vel.z);
  let a = "idle";
  if (S.cheer > 0) a = "cheer";
  else if (H.throwT > 0 && H.kind === "gundamma") a = "throw";
  else if (H.pound > 0 && H.kind === "gundamma") a = "pound";
  else if (H.dash > 0) a = "dash";
  else if (!H.ground) a = "jump";
  else if (sp > 0.8) a = "run";
  else if (UI.isOpen("dlg") && S.me === H.kind) a = "talk";
  if (H.ctrl === "remote" && H.net) a = H.net.a || a;
  if (H.stun > 0) a = "idle";
  play(h, a);
  if (h.actions.run) h.actions.run.setEffectiveTimeScale(Math.max(0.6, sp / h.speed * 1.1));
  h.mixer.update(dt);
  h.holder.position.copy(H.pos); h.holder.rotation.y = H.yaw;
  h.model.rotation.z = H.stun > 0 ? Math.sin(S.t * 30) * 0.15 : 0;
  h.model.visible = !(H.inv > 0 && H.stun > 0 && Math.floor(S.t * 12) % 2);
  const sh = h.holder.userData.shadow, gy = groundAt(H.pos.x, H.pos.z, H.pos.y + 0.1);
  sh.position.set(H.pos.x, gy + 0.06, H.pos.z); sh.material.opacity = 0.28 * Math.max(0.2, 1 - (H.pos.y - gy) / 8);
  H.anim = a;
}
function remoteFollow(H, dt) {
  const n = H.net; if (!n) return;
  const k = Math.min(1, dt * 10);
  H.vel.set((n.p[0] - H.pos.x) / Math.max(dt, 0.016), 0, (n.p[2] - H.pos.z) / Math.max(dt, 0.016)).multiplyScalar(0.0);
  const dx = n.p[0] - H.pos.x, dz = n.p[2] - H.pos.z;
  H.vel.set(dx * 6, 0, dz * 6);
  H.pos.x += dx * k; H.pos.y += (n.p[1] - H.pos.y) * k; H.pos.z += dz * k;
  if (Math.hypot(dx, dz) > 30) H.pos.set(...n.p);
  H.yaw += angDiff(H.yaw, n.y) * k; H.ground = !!n.g; H.dash = n.a === "dash" ? 0.1 : 0;
}
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ============================================================ wisps update
function updateWisps(dt) {
  const heroes = Object.values(S.heroes);
  for (const w of S.wisps) {
    if (!w.alive) { w.respawn -= dt; if (w.respawn <= 0 && S.mode !== "guest") { w.alive = true; w.obj.visible = true; w.obj.position.set(w.home.x + (Math.random() - 0.5) * 120, 0, w.home.z + (Math.random() - 0.5) * 120); } continue; }
    w.t += dt; const p = w.obj.position;
    if (S.mode !== "guest") {
      let tgt = null, best = 15;
      for (const H of heroes) { const d = Math.hypot(H.pos.x - p.x, H.pos.z - p.z); if (d < best && H.inv <= 0) { best = d; tgt = H; } }
      if (tgt) { w.tx = tgt.pos.x; w.tz = tgt.pos.z; }
      else if (Math.hypot(w.tx - p.x, w.tz - p.z) < 3 || Math.random() < dt * 0.15) { const a = Math.random() * 6.28, d = 20 + Math.random() * 80; w.tx = w.home.x + Math.cos(a) * d; w.tz = w.home.z + Math.sin(a) * d; }
      const dx = w.tx - p.x, dz = w.tz - p.z, d = Math.hypot(dx, dz) || 1, sp = (tgt ? w.speed : w.speed * 0.45) * dt;
      p.x += dx / d * Math.min(sp, d); p.z += dz / d * Math.min(sp, d);
      p.y = heightAt(p.x, p.z) + 1.4 + Math.sin(w.t * 3) * 0.3;
      w.obj.rotation.y = Math.atan2(dx, dz);
      for (const H of heroes) {
        if (Math.hypot(H.pos.x - p.x, H.pos.z - p.z) < 1.3 && Math.abs(H.pos.y + 0.8 - p.y) < 1.8) {
          if (H.dash > 0 || (H.ctrl === "remote" && H.net && H.net.a === "dash")) killWisp(w);
          else if (H.inv <= 0) wispSteal(w, H);
        }
      }
    } else if (w.net) {
      p.x += (w.net[0] - p.x) * Math.min(1, dt * 6); p.z += (w.net[2] - p.z) * Math.min(1, dt * 6); p.y = heightAt(p.x, p.z) + 1.4 + Math.sin(w.t * 3) * 0.3;
    }
    w.obj.scale.setScalar(1 + Math.sin(w.t * 5) * 0.06);
  }
}
function killWisp(w) {
  if (!w.alive) return;
  w.alive = false; w.obj.visible = false; w.respawn = 14; Sound.sfx("poof"); ring(w.obj.position, 0xffe066);
  if (S.mode === "guest") Net.send("kill", { i: S.wisps.indexOf(w) });
}
function wispSteal(w, H) {
  H.inv = 2.2; H.stun = 0.7; H.vel.set(-(w.obj.position.x - H.pos.x) * 4, 0, -(w.obj.position.z - H.pos.z) * 4); H.vy = 6; H.ground = false;
  Sound.sfx("steal"); shake(0.35);
  const got = S.orbs.filter((o) => o.got);
  if (got.length && (S.phase === "hunt" || S.phase === "return")) {
    const o = got[got.length - 1]; o.got = false; o.obj.visible = true;
    const a = Math.random() * 6.28; o.x = o.home[0]; o.y = o.home[1]; o.z = o.home[2]; o.obj.position.set(o.x, o.y, o.z);
    if (S.phase === "return") { S.phase = Save.d.phase = "hunt"; }
    UI.toast(`👻 A wisp snatched <b>${o.wd.w}</b>! It flew back to its hiding place.`, "bad", 3200);
    if (S.mode !== "solo") Net.send("evt", { e: "stolen", w: o.wd.w });
  } else UI.toast("👻 Shhh! A wisp bumped you.", "bad", 1500);
  broadcastState();
}

// ============================================================ effects
const rings = [];
function ring(pos, color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(pos); m.position.y = groundAt(pos.x, pos.z, pos.y + 1) + 0.2; scene.add(m); rings.push({ m, t: 0 });
}
function updateRings(dt) { for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; r.m.scale.setScalar(1 + r.t * 14); r.m.material.opacity = 0.9 * (1 - r.t / 0.6); if (r.t > 0.6) { scene.remove(r.m); rings.splice(i, 1); } } }
let shakeT = 0; function shake(s) { shakeT = Math.max(shakeT, s); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================ camera
function updateCamera(dt) {
  const H = active(), c = S.cam;
  if (Input.look.dx || Input.look.dy) { c.yaw -= Input.look.dx * 0.0065; c.pitch = THREE.MathUtils.clamp(c.pitch + Input.look.dy * 0.004, 0.08, 1.15); Input.look.dx = Input.look.dy = 0; S.lastLook = S.t; }
  const sp = Math.hypot(H.vel.x, H.vel.z);
  if (sp > 2 && S.t - S.lastLook > 1.6 && H.ground) c.yaw += angDiff(c.yaw, H.yaw + Math.PI) * Math.min(1, dt * 0.9 * (sp / H.h.speed));
  const dist = UI.isOpen("dlg") ? 5.5 : c.dist;
  const tgt = tmp.set(H.pos.x, H.pos.y + 1.35, H.pos.z);
  const want = new V3(tgt.x + Math.sin(c.yaw) * Math.cos(c.pitch) * dist, tgt.y + Math.sin(c.pitch) * dist, tgt.z + Math.cos(c.yaw) * Math.cos(c.pitch) * dist);
  const floor = heightAt(want.x, want.z) + 0.9; if (want.y < floor) want.y = floor;
  { const dir = want.clone().sub(tgt), L = dir.length(); dir.divideScalar(L); let ok = L;
    for (let t = 1.2; t < L; t += 0.8) { const px = tgt.x + dir.x * t, py = tgt.y + dir.y * t, pz = tgt.z + dir.z * t;
      if (nearCircles(px, pz).some((c) => Math.hypot(px - c.x, pz - c.z) < c.r + 0.3 && py < c.top)) { ok = Math.max(1.6, t - 0.8); break; } }
    if (ok < L) want.copy(tgt).addScaledVector(dir, ok); }
  c.pos.lerp(want, 1 - Math.exp(-dt * 9));
  camera.position.copy(c.pos);
  if (shakeT > 0) { shakeT = Math.max(0, shakeT - dt); camera.position.x += (Math.random() - 0.5) * shakeT; camera.position.y += (Math.random() - 0.5) * shakeT; }
  camera.lookAt(tgt);
}

// ============================================================ HUD
let hudT = 0, miniT = 0;
function updateHUD(dt) {
  hudT -= dt; miniT -= dt; const H = active(), c = chap();
  // talk button
  const nearNpc = c.npcObj && Math.hypot(H.pos.x - c.nx, H.pos.z - c.nz) < 9;
  $("bTalk").hidden = !(nearNpc && S.phase === "return" && S.mode !== "guest") && !(nearNpc && S.phase === "return");
  if (consume("talk") && nearNpc && S.phase === "return") { if (S.mode === "guest") Net.send("talk"); else talkToNpc(); }
  if (hudT > 0) return; hudT = 0.2;
  let tx = c.x, tz = c.z, text = "", chapTxt = `Chapter ${S.ch + 1} · ${c.title}`;
  const dLm = Math.hypot(H.pos.x - c.x, H.pos.z - c.z);
  if (S.phase === "explore") text = `Go to ${c.place}`;
  else if (S.phase === "hunt") {
    const left = S.orbs.filter((o) => !o.got);
    text = `Find the glowing words · ${6 - left.length}/6`;
    if (dLm < 160 && left.length) { let best = 1e9; for (const o of left) { const d = Math.hypot(o.x - H.pos.x, o.z - H.pos.z); if (d < best) { best = d; tx = o.x; tz = o.z; } } if (left.every((o) => o.high)) text = "Last word is up high! 🤝 Team-up throw!"; }
  } else if (S.phase === "return") { text = `Talk to ${c.npc.name} ${c.npc.icon}`; tx = c.nx; tz = c.nz; }
  else if (S.phase === "free") {
    chapTxt = "Karnataka restored · Word Festival";
    let best = 1e9, f0 = null; for (const f of S.fest) { const d = Math.hypot(f.x - H.pos.x, f.z - H.pos.z); if (d < best) { best = d; f0 = f; } }
    if (f0) { tx = f0.x; tz = f0.z; text = `🌟 Festival word near ${f0.town}`; } else text = "Explore Karnataka!";
  } else text = "…";
  if (S.phase !== "free" && S.phase !== "explore" && S.fest.length && dLm > 400) chapTxt += " · 🌟 " + S.fest.length;
  const d = Math.hypot(tx - H.pos.x, tz - H.pos.z);
  UI.objective(chapTxt, text, d > 6 ? fmtDist(d) : "");
  const ang = Math.atan2(tx - H.pos.x, tz - H.pos.z), rel = angDiff(S.cam.yaw + Math.PI, ang);
  UI.compass(-rel, d > 12 && !S.busy);
  if (miniT <= 0) { miniT = 0.25; drawMini(); }
  $("partner").hidden = S.mode === "solo";
  if (S.mode !== "solo") { const o = other(); $("partner").textContent = `${o.kind === "bangara" ? "🐰 Bangara" : "🐼 Gundamma"} · ${fmtDist(o.pos.distanceTo(H.pos))}${Net.open ? "" : " · offline"}`; }
}
const fmtDist = (u) => { const m = u * 4; return m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`; };
function marks(forMap) {
  const out = [];
  CHAPTERS.forEach((c, i) => {
    const done = Save.d.done.includes(c.id), cur = i === S.ch && !storyDone();
    if (done || cur || forMap) out.push({ x: c.x, z: c.z, col: cur ? "#F2B705" : done ? "#3E8E3A" : "#8C83A8", big: cur, label: forMap ? c.place.split(",")[0] : "", travel: done || (cur && (Save.d.visited || []).includes(c.id)), c });
  });
  if (S.phase === "hunt" && !forMap) for (const o of S.orbs) if (!o.got) out.push({ x: o.x, z: o.z, col: "#FFD45C" });
  for (const f of S.fest) out.push({ x: f.x, z: f.z, col: "#E79BFF", label: forMap ? "🌟" : "" });
  return out;
}
function mapData(forMap) {
  const H = active(), O = other();
  return { meta: W.meta, me: { x: H.pos.x, z: H.pos.z, yaw: S.cam.yaw, col: H.kind === "bangara" ? "#E89A1C" : "#2E2A2A" },
    other: S.mode !== "solo" || true ? { x: O.pos.x, z: O.pos.z, col: O.kind === "bangara" ? "#E89A1C" : "#2E2A2A" } : null,
    marks: marks(forMap), colour: colourAmount(), greyMask: forMap ? greyMask() : null };
}
function drawMini() { UI.drawMap($("mini"), mapData(false), { mini: true, view: 240 }); }
let gm = null, gmKey = "";
function greyMask() {
  const key = Save.d.done.join(","); if (gm && gmKey === key) return gm; gmKey = key;
  gm = document.createElement("canvas"); gm.width = W.nx; gm.height = W.nz; const x = gm.getContext("2d"), im = x.createImageData(W.nx, W.nz);
  for (let i = 0; i < W.D.length; i++) { const d = W.D[i]; const silent = d > 0 && restore.target[d] < 0.5; im.data[i * 4 + 3] = silent ? 200 : d === 0 ? 120 : 0; im.data[i * 4] = im.data[i * 4 + 1] = 120; im.data[i * 4 + 2] = 135; }
  x.putImageData(im, 0, 0); return gm;
}
function openMap() {
  const cv = $("mapCv"); const w = Math.min(520, innerWidth - 60); cv.width = w * 2; cv.height = Math.round(w * 2 * W.nz / W.nx);
  const d = mapData(true); UI.drawMap(cv, d); UI.show("map");
  cv.onclick = (e) => {
    const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * cv.width / r.width, py = (e.clientY - r.top) * cv.height / r.height;
    const hit = d.hits.find((h) => Math.hypot(h.x - px, h.y - py) < 26);
    if (hit) { UI.hide("map"); travelTo(hit.b.c); }
  };
}
function travelTo(c) {
  UI.flash(); placeHeroesAt(c.x, c.z + c.pad + 12, Math.PI);
  UI.toast(`✨ Travelled to <b>${c.place}</b>`, "gold");
  if (S.mode !== "solo") Net.send("h", heroMsg(active()));
}

// ============================================================ networking
function heroMsg(H) { return { k: H.kind, p: [+H.pos.x.toFixed(2), +H.pos.y.toFixed(2), +H.pos.z.toFixed(2)], y: +H.yaw.toFixed(2), a: H.anim, g: H.ground ? 1 : 0 }; }
let netT = 0, wT = 0;
function stateMsg() {
  return { ch: S.ch, ph: S.phase, done: Save.d.done, orbs: S.orbs.map((o) => (o.got ? 1 : 0)) };
}
function broadcastState() { if (S.mode === "host") Net.send("state", stateMsg()); }
function netTick(dt) {
  if (S.mode === "solo" || !Net.open) return;
  netT -= dt; wT -= dt;
  if (netT <= 0) { netT = 1 / 12; Net.send("h", heroMsg(active())); }
  if (S.mode === "host" && wT <= 0) { wT = 0.2; Net.send("wisps", S.wisps.map((w) => [+w.obj.position.x.toFixed(1), 0, +w.obj.position.z.toFixed(1), w.alive ? 1 : 0])); }
}
function setupNetHandlers() {
  Net.on.h = (d) => { const H = S.heroes[d.k]; if (H && H.ctrl === "remote") { H.net = d; if (!H.seen) { H.seen = true; H.pos.set(...d.p); } } };
  Net.on.fx = (d) => { if (d.a === "pound") { const H = S.heroes[d.k]; Sound.sfx("pound"); ring(H.pos, 0x9b7cff); } else Sound.sfx("dash"); };
  Net.on.team = () => teamUp(false);
  Net.on.hello = (d) => { if (S.mode === "host") { Net.send("start", { me: d.me, save: { ch: Save.d.ch, phase: Save.d.phase, done: Save.d.done, visited: Save.d.visited } }); } };
  // host-side requests from guest
  Net.on.collect = (d) => { const o = S.orbs[d.i]; if (o && !o.got && S.mode === "host") { o.got = true; o.obj.visible = false; Sound.sfx("collect"); Save.learn(o.wd.w); UI.toast(`${other().kind === "bangara" ? "Bangara" : "Gundamma"} found <b>${o.wd.w}</b> · ${o.wd.k}`, "gold"); afterCollect(); broadcastState(); } };
  Net.on.kill = (d) => { const w = S.wisps[d.i]; if (w && w.alive) { w.alive = false; w.obj.visible = false; w.respawn = 14; Sound.sfx("poof"); } };
  Net.on.pound = (d) => { for (const w of S.wisps) if (w.alive && Math.hypot(w.obj.position.x - d.x, w.obj.position.z - d.z) < 7) killWisp(w); };
  Net.on.talk = () => talkToNpc();
  Net.on.fillDone = () => { if (S.phase === "fill") { UI.hide("fill"); onFillDone(); } };
  Net.on.speakDone = () => { if (S.phase === "speak") { UI.hide("speak"); onSpeakDone(); } };
  // guest-side
  Net.on.start = (d) => { if (S.mode !== "guest") return; Save.guest = true; Save.d.ch = d.save.ch; Save.d.phase = d.save.phase; Save.d.done = d.save.done; Save.d.visited = d.save.visited; applyRestoreFromSave(true); startStory(); };
  Net.on.state = (d) => {
    if (S.mode !== "guest") return;
    const chChanged = d.ch !== S.ch; S.ch = d.ch;
    Save.d.done = d.done; applyRestoreFromSave(false);
    if (chChanged || (d.ph === "hunt" && !S.orbs.length)) { if (d.ph === "hunt" || d.ph === "return") spawnChapterOrbs(S.ch); else clearOrbs(); }
    if (d.ph === "hunt" && !S.wisps.length) { const c = chap(); for (let i = 0; i < 4 + S.ch; i++) S.wisps.push(makeWisp(c.x, c.z, c)); }
    if (d.ph !== "hunt" && d.ph !== "return") clearWisps();
    S.phase = d.ph;
    d.orbs.forEach((g, i) => { const o = S.orbs[i]; if (!o) return; if (g && !o.got) { o.got = true; o.obj.visible = false; } else if (!g && o.got) { o.got = false; o.obj.visible = true; o.obj.position.set(...o.home); } });
    S.mouna.visible = S.ch === CHAPTERS.length - 1 && (d.ph === "hunt" || d.ph === "return");
  };
  Net.on.wisps = (d) => { if (S.mode !== "guest") return; d.forEach((w, i) => { const W2 = S.wisps[i]; if (!W2) return; W2.net = w; W2.alive = !!w[3]; W2.obj.visible = W2.alive; }); };
  Net.on.evt = (d) => {
    if (d.e === "fill") { S.phase = "fill"; UI.fillStory(chap(), onFillDone); }
    else if (d.e === "speak") { UI.hide("fill"); S.phase = "speak"; UI.speakChallenge(chap().speak, onSpeakDone); }
    else if (d.e === "restore") { UI.hide("fill"); UI.hide("speak"); restoreChapter(d.ch); }
    else if (d.e === "stolen") UI.toast(`👻 A wisp snatched <b>${d.w}</b>!`, "bad");
    else if (d.e === "dlg") { const c = CHAPTERS[d.ch]; UI.dialogue(c[d.which], c.npc); }
  };
  Net.onClose = () => {
    UI.toast("📴 Your friend disconnected. Playing solo now.", "bad", 4000);
    if (S.mode === "guest") { Save.guest = false; Save.load(); applyRestoreFromSave(true); S.ch = Math.min(Save.d.ch, CHAPTERS.length - 1); S.phase = Save.d.phase; clearOrbs(); clearWisps(); if (S.phase === "hunt" || S.phase === "return") beginHunt(false); }
    S.mode = "solo"; setupControl();
  };
}

// ============================================================ main loop
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt;
  worldUniforms.uTime.value = S.t;
  if (S.playing) {
    pollKeys();
    if (consume("swap") && S.mode === "solo" && !S.busy) { S.me = S.me === "bangara" ? "gundamma" : "bangara"; setupControl(); UI.toast(S.me === "bangara" ? "🐰 Playing as Bangara" : "🐼 Playing as Gundamma"); }
    if (consume("team") && !S.busy) teamUp(true);
    if (consume("map")) openMap();
    for (const k in S.heroes) updateHero(S.heroes[k], dt);
    if (S.cheer > 0) S.cheer -= dt;
    // orb pickups
    for (const o of S.orbs) {
      if (o.got) continue;
      o.obj.position.y = o.y + Math.sin(S.t * 2.5 + o.i) * 0.25; o.obj.material.rotation = Math.sin(S.t + o.i) * 0.2;
      for (const k in S.heroes) { const H = S.heroes[k]; if (H.ctrl === "remote") continue; if (Math.hypot(H.pos.x - o.x, H.pos.z - o.z) < 2.0 && Math.abs(H.pos.y + 0.8 - o.y) < 2.4 && S.phase === "hunt") collectOrb(o, H.kind); }
    }
    for (const f of S.fest) { f.obj.position.y = f.y + Math.sin(S.t * 2) * 0.3; const H = active(); if (!S.busy && Math.hypot(H.pos.x - f.x, H.pos.z - f.z) < 2.2 && Math.abs(H.pos.y + 0.8 - f.y) < 2.6) { collectFestival(f); break; } }
    updateWisps(dt);
    if (S.mouna.visible) { const c = chap(); S.mouna.position.set(c.x + Math.sin(S.t * 0.3) * 20, c.y + 30 + Math.sin(S.t) * 2, c.z + Math.cos(S.t * 0.3) * 20); S.mouna.rotation.y = Math.atan2(active().pos.x - S.mouna.position.x, active().pos.z - S.mouna.position.z); }
    // arriving at the next landmark triggers its intro
    if (S.phase === "explore" && !S.busy && S.mode !== "guest") { const c = chap(), H = active(); if (Math.hypot(H.pos.x - c.x, H.pos.z - c.z) < 80) arriveAtChapter(); }
    updateHUD(dt); netTick(dt);
    if (S.waveT !== undefined) { S.waveT += dt; worldUniforms.wave.value.z = S.waveT * 140; worldUniforms.wave.value.w = Math.max(0, 1 - S.waveT / 7); if (S.waveT > 7) { worldUniforms.wave.value.z = -1; S.waveT = undefined; } }
    updateCamera(dt);
    // save position now and then
    if ((S.saveT = (S.saveT || 0) - dt) <= 0 && S.mode !== "guest") { S.saveT = 5; const H = active(); Save.d.pos = [H.pos.x, H.pos.z, H.yaw]; Save.d.me = S.me; Save.write(); }
  } else titleCam(dt);
  updateRestore(dt); updateRings(dt);
  // beacons
  CHAPTERS.forEach((c, i) => { const b = S.beacons[i]; if (!b) return; const done = Save.d.done.includes(c.id), cur = i === S.ch && !storyDone() && S.playing;
    b.material.uniforms.a.value += ((cur ? 0.9 : done ? 0.18 : 0) - b.material.uniforms.a.value) * Math.min(1, dt * 2);
    b.material.uniforms.col.value.setHex(cur ? 0xffc93c : 0xfff2c0); b.visible = b.material.uniforms.a.value > 0.01; });
  // grey world → greyer sky/fog
  const H = S.playing ? active() : null, did = H ? districtAt(H.pos.x, H.pos.z) : S.titleDid || 0;
  const lv = did ? restore.levels[did] : 0;
  scene.fog.color.lerpColors(new THREE.Color(0xb9bccb), FOG, lv); renderer.setClearColor(scene.fog.color);
  if (W.seaMat) { W.seaMat.uniforms.fogColor.value.copy(scene.fog.color); W.seaMat.uniforms.fogNear.value = scene.fog.near; W.seaMat.uniforms.fogFar.value = scene.fog.far; }
  scene.traverse && 0;
  const sky = scene.children.find((o) => o.material && o.material.uniforms && o.material.uniforms.gloom); if (sky) { sky.material.uniforms.gloom.value = (1 - lv) * 0.7; sky.position.copy(camera.position); }
  cull(camera.position, scene.fog.far);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
// title screen: slow aerial drift over Bengaluru → Mysuru
function titleCam(dt) {
  const c = CHAPTERS[Math.min(Save.d.ch, CHAPTERS.length - 1)], t = S.t * 0.05;
  const x = c.x + Math.sin(t) * 120, z = c.z + Math.cos(t) * 120, y = Math.max(heightAt(x, z), c.y) + 45;
  camera.position.set(x, y, z); camera.lookAt(c.x, c.y + 8, c.z); S.titleDid = districtAt(c.x, c.z);
  for (const k in S.heroes) { const H = S.heroes[k]; if (!H.pos.lengthSq()) placeHeroesAt(c.x, c.z + c.pad + 6, Math.PI); animateHero(H, dt); }
}

// ============================================================ UI wiring
function refreshTitle() {
  const started = Save.started;
  $("tPlayTxt").textContent = started ? (storyDone() ? "Explore Karnataka" : `Continue · Ch ${Math.min(Save.d.ch, 7) + 1}`) : "Start the story";
  $("tReset").hidden = !started; updateWordBadge();
  $("tSound").textContent = Sound.muted ? "🔇" : "🔊";
}
function bindUI() {
  const pick = (cb, taken) => {
    UI.screen("pick"); $("pickHint").textContent = taken ? "Your friend already took the other hero!" : S.mode === "solo" ? "In solo play you can swap between them any time." : "Each phone plays one hero.";
    document.querySelectorAll(".hero").forEach((b) => { b.classList.toggle("taken", b.dataset.hero === taken); b.onclick = () => { Sound.unlock(); cb(b.dataset.hero); }; });
  };
  $("tPlay").onclick = () => { Sound.unlock(); S.mode = "solo"; if (Save.started) { S.me = Save.d.me || "bangara"; startStory(); } else pick((h) => { S.me = h; Save.d.me = h; startStory(); }); };
  $("tReset").onclick = () => { if (confirm("Start a brand-new story? Your learned words stay in the tiffin.")) { const words = Save.d.words; Save.reset(); Save.d.words = words; Save.write(); applyRestoreFromSave(true); refreshTitle(); } };
  $("tCoop").onclick = () => { Sound.unlock(); UI.screen("lobby"); $("lbCode").hidden = $("lbWait").hidden = true; $("lbMsg").textContent = ""; };
  $("tTiffin").onclick = () => UI.openTiffin(CHAPTERS, FESTIVAL, Save.d.words);
  $("tSound").onclick = () => { Sound.toggle(); refreshTitle(); };
  document.querySelectorAll("[data-back]").forEach((b) => (b.onclick = () => { Net.close(); UI.screen("title"); refreshTitle(); }));
  setupNetHandlers();
  $("lbHost").onclick = async () => {
    $("lbMsg").textContent = "Creating…";
    try {
      const code = await hostRoom(); $("lbCode").textContent = code; $("lbCode").hidden = false; $("lbWait").hidden = false; $("lbMsg").textContent = "Tell your friend this code.";
      Net.onOpen = () => { S.mode = "host"; pick((h) => { S.me = h; Net.send("start", { me: h, save: { ch: Save.d.ch, phase: Save.d.phase, done: Save.d.done, visited: Save.d.visited } }); startStory(); }); };
    } catch (e) { $("lbMsg").textContent = "Couldn't create a room. Check your internet and try again."; }
  };
  $("lbJoin").onclick = async () => {
    const code = $("lbIn").value.trim().toUpperCase(); if (code.length !== 4) { $("lbMsg").textContent = "Codes are 4 letters."; return; }
    $("lbMsg").textContent = "Joining…";
    try {
      S.mode = "guest";
      const origStart = Net.on.start;
      Net.on.start = (d) => { S.me = d.me === "bangara" ? "gundamma" : "bangara"; UI.toast(`You are ${S.me === "bangara" ? "Bangara 🐰" : "Gundamma 🐼"}!`, "gold"); origStart(d); };
      await joinRoom(code); $("lbMsg").textContent = "Connected! Waiting for your friend to pick a hero…";
    } catch (e) { S.mode = "solo"; $("lbMsg").textContent = "Couldn't find that code. Check it and try again."; }
  };
  $("hTiffin").onclick = () => UI.openTiffin(CHAPTERS, FESTIVAL, Save.d.words);
  $("tfClose").onclick = () => UI.hide("tiffin");
  $("hMap").onclick = openMap; $("mpClose").onclick = () => UI.hide("map");
  $("hMenu").onclick = () => { $("mnSound").textContent = Sound.muted ? "🔇 Sound off" : "🔊 Sound on"; UI.show("menu"); };
  $("mnResume").onclick = () => UI.hide("menu");
  $("mnSound").onclick = () => { Sound.toggle(); $("mnSound").textContent = Sound.muted ? "🔇 Sound off" : "🔊 Sound on"; };
  $("mnHelp").onclick = () => { UI.hide("menu"); UI.show("help"); };
  $("hpOk").onclick = () => UI.hide("help");
  $("mnQuit").onclick = () => { UI.hide("menu"); S.playing = false; Net.close(); if (Save.guest) { Save.guest = false; Save.load(); applyRestoreFromSave(true); } S.mode = "solo"; clearOrbs(); clearWisps(); UI.hide("hud"); UI.screen("title"); refreshTitle(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && S.playing) { const H = active(); Save.d.pos = [H.pos.x, H.pos.z, H.yaw]; Save.write(); } });
}

window.MAATHU = { S, W, restoreChapter, travelTo, placeHeroesAt, camera, Save, CHAPTERS, groundAt };
boot();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
