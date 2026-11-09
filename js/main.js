// MAATHU — Bangara & Gundamma vs the Silence. Game core.
import * as THREE from "three";
import { W, loadWorld, buildTerrain, buildSea, buildRiversRoads, buildVegetation, buildSky, cull, heightAt, districtAt,
  lonlat, flattenPad, updateRestore, setDistrictTarget, restore, worldUniforms, rng } from "./world.js";
import { buildTowns } from "./towns.js";
import { loadHero, play, loadProps, placeProp, gradientMap } from "./chars.js";
import { CHAPTERS, FESTIVAL, MOUNA_TAUNTS } from "./content.js";
import * as UI from "./ui.js";
import { Input, initInput, pollKeys, consume } from "./input.js";
import { Sound } from "./audio.js";
import { Save } from "./save.js";
import { Net, hostRoom, joinRoom } from "./net.js";
import { VS, VT, loadVehicles, spawnVehicles, drive, animateVehicle, cullVehicles, nearestFree, vehicleBlock, seatWorld, initLegs, seatPose } from "./vehicles.js";
import { C as CB, loadCombat, equip, applyAim, heroFire, autoTarget, vCenter, shoot, spawnVillain, damageVillain, killVillain, clearVillains,
  updateCombat, dropPak, WEAPON } from "./combat.js";

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
  mode: "solo", me: "bangara", ch: 0, phase: "prologue",
  heroes: {}, orbs: [], fest: [], colliders: [], boxes: [], landmarks: [], beacons: [],
  playing: false, busy: false, t: 0, lastLook: 0,
  cam: { yaw: Math.PI, pitch: 0.32, dist: 8, pos: new V3() },
  districtIds: {}, mouna: null, tut: null, boss: null,
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
    W.reserved = [];
    for (const c of CHAPTERS) { const p = lonlat(c.lon, c.lat); c.x = p.x; c.z = p.z; c.y = flattenPad(p.x, p.z, c.pad, 26); W.reserved.push({ x: p.x, z: p.z, r: c.pad + 22 }); }
    step(25, "Raising the Western Ghats…"); await tick();
    buildSky(scene); buildTerrain(scene); buildSea(scene);
    step(40, "Filling the rivers…"); await tick();
    buildRiversRoads(scene);
    step(52, "Planting coconut trees…"); await tick();
    buildVegetation(scene, S.colliders);
    step(62, "Building towns and shops…"); await tick();
    try { await Promise.race([document.fonts.load("bold 30px 'Baloo Tamma 2'", "ಹೋಟೆಲ್"), sleep(2500)]); } catch (e) {}
    buildTowns(scene, S.colliders); buildColliderGrid();
    step(72, "Waking up Bangara and Gundamma…");
    const [b, g, pr] = await Promise.all([loadHero("bangara"), loadHero("gundamma"), loadProps()]);
    props = pr;
    buildMouna();
    step(80, "Arming the heroes…");
    await loadCombat(scene, combatCtx());
    for (const h of [b, g]) { scene.add(h.holder); scene.add(h.holder.userData.shadow); const H = makeHeroState(h); S.heroes[h.kind] = H; equip(H); initLegs(H); }
    await loadVehicles(scene, vehCtx());
    step(88, "Placing the landmarks…"); await tick();
    placeLandmarks();
    spawnVehicles(CHAPTERS);
    mapImg = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "world/color.png"; });
    UI.setMapImage(mapImg);
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
    throwT: 0, stun: 0, inv: 0, ctrl: "ai", net: null, anim: "idle", hp: 100, maxHp: 100, ko: 0, hurtT: 9, fireCd: 0, aiFire: 0 };
}
function placeHeroesAt(x, z, yaw = 0) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  const sp = { bangara: [x - fz * 1.6, z + fx * 1.6], gundamma: [x + fz * 1.6, z - fx * 1.6] };
  for (const k in S.heroes) { const H = S.heroes[k]; H.pos.set(sp[k][0], 0, sp[k][1]); H.pos.y = groundAt(H.pos.x, H.pos.z, 999); H.vy = 0; H.vel.set(0, 0, 0); H.yaw = yaw; }
  S.cam.yaw = yaw + Math.PI; S.cam.pos.set(x - fx * 8, S.heroes.bangara.pos.y + 4, z - fz * 8);
}
const active = () => S.heroes[S.me];
const other = () => S.heroes[S.me === "bangara" ? "gundamma" : "bangara"];
const heroList = () => Object.values(S.heroes);

// ============================================================ colliders (circles + oriented boxes in a grid; landmark boxes)
const GRID = new Map(), CELL = 24;
function buildColliderGrid() {
  for (const c of S.colliders) {
    const rr = c.obb ? c.R : c.r, x0 = Math.floor((c.x - rr) / CELL), x1 = Math.floor((c.x + rr) / CELL), z0 = Math.floor((c.z - rr) / CELL), z1 = Math.floor((c.z + rr) / CELL);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = i + "," + j; if (!GRID.has(k)) GRID.set(k, []); GRID.get(k).push(c); }
  }
}
function near(x, z) { return GRID.get(Math.floor(x / CELL) + "," + Math.floor(z / CELL)) || []; }
const LMBOX = {
  lm_vidhana: [[0, 2, 21, 7, 10.2], [0, 2, 4.6, 4.6, 19.5], [0, -6.4, 9.8, 2.4, 10.1]],
  lm_palace: [[0, 2, 22, 7, 12.2], [0, -2, 5, 5, 21], [-14, -1, 3, 3, 15.5], [14, -1, 3, 3, 15.5]],
  lm_hampi: [[0, 0, 4, 2.6, 6.4], [0, 26, 8, 5, 8.0], [0, 26, 6.6, 4.0, 30]],
  lm_jog: [[-22, 13, 6, 8, 34], [-14, 22, 6, 6, 34], [-5, 26, 6, 5, 34], [5, 26, 6, 5, 34], [14, 22, 6, 6, 34], [22, 13, 6, 8, 34]],
  lm_golgumbaz: [[0, 0, 12.2, 12.2, 21.4], [12.6, 12.6, 2.9, 2.9, 27], [-12.6, 12.6, 2.9, 2.9, 27], [12.6, -12.6, 2.9, 2.9, 27], [-12.6, -12.6, 2.9, 2.9, 27]],
  lm_badami: [[0, 9, 33, 5, 16]],
  lm_coorg: [[0, 0, 3.4, 3.4, 6.9]],
  lm_coast: [[0, 0, 7, 4.5, 8.2], [0, 0, 6.2, 3.8, 44], [24, 10, 2.1, 2.1, 25]],
};
const HIGH = { lm_vidhana: [-12, -6.4, 11.3], lm_palace: [-12, 2, 13.4], lm_coorg: [9, 9, 9.5], lm_coast: [5.6, -3.2, 9.4],
  lm_jog: [0, 4, 10], lm_hampi: [0, 0, 7.6], lm_badami: [18, 0.0, 10.2], lm_golgumbaz: [17, -17, 10.5] };
function lmLocalToWorld(c, bx, by) {
  const a = THREE.MathUtils.degToRad(c.rot || 0), lx = bx, lz = -by;
  return [c.x + lx * Math.cos(a) + lz * Math.sin(a), c.z - lx * Math.sin(a) + lz * Math.cos(a)];
}
function inBox(b, x, z, pad = 0) {
  const dx = x - b.x, dz = z - b.z; if (Math.abs(dx) > b.R + pad || Math.abs(dz) > b.R + pad) return null;
  const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
  return Math.abs(lx) < b.hx + pad && Math.abs(lz) < b.hz + pad ? [lx, lz] : null;
}
function groundAt(x, z, y) {
  let g = heightAt(x, z);
  for (const b of S.boxes) if (y >= b.top - 0.7 && inBox(b, x, z)) g = Math.max(g, b.top);
  for (const c of near(x, z)) {
    if (c.top === undefined || y < c.top - 0.7) continue;
    if (c.obb ? inBox(c, x, z) : Math.hypot(x - c.x, z - c.z) < c.r * 0.8) g = Math.max(g, c.top);
  }
  return g;
}
function pushBox(p, b, r) {
  if (p.y >= b.top - 0.7) return;
  const L = inBox(b, p.x, p.z, r); if (!L) return; let [lx, lz] = L;
  const px = b.hx + r - Math.abs(lx), pz = b.hz + r - Math.abs(lz);
  if (px < pz) lx += Math.sign(lx || 1) * px; else lz += Math.sign(lz || 1) * pz;
  p.x = b.x + lx * b.c + lz * b.s; p.z = b.z - lx * b.s + lz * b.c;
}
function collide(p, r) { collideWorld(p, r); vehicleBlock(p, r); }
function collideWorld(p, r) {
  for (const b of S.boxes) pushBox(p, b, r);
  for (const c of near(p.x, p.z)) {
    if (c.obb) { pushBox(p, c, r); continue; }
    if (c.top !== undefined && p.y >= c.top - 0.7) continue;
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m && d > 0.001) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
  }
}
function solidAt(x, y, z) {
  for (const b of S.boxes) if (y < b.top && inBox(b, x, z)) return true;
  for (const c of near(x, z)) { if (c.top !== undefined && y > c.top) continue; if (c.obb ? inBox(c, x, z) : (c.top !== undefined && Math.hypot(x - c.x, z - c.z) < c.r * 0.8)) return true; }
  return false;
}

// ============================================================ landmarks, NPCs, beacons
function placeLandmarks() {
  const beamGeo = new THREE.CylinderGeometry(2.4, 3.2, 420, 16, 1, true).translate(0, 210, 0);
  CHAPTERS.forEach((c) => {
    const did = districtAt(c.x, c.z);
    const lm = placeProp(props[c.lm], did, 0.05); lm.position.set(c.x, c.y - 0.05, c.z); lm.rotation.y = THREE.MathUtils.degToRad(c.rot || 0);
    scene.add(lm); S.landmarks.push(lm);
    for (const [bx, by, hx, hy, top] of LMBOX[c.lm]) {
      const [wx, wz] = lmLocalToWorld(c, bx, by), a = THREE.MathUtils.degToRad(c.rot || 0);
      S.boxes.push({ x: wx, z: wz, hx, hz: hy, top: c.y + top, c: Math.cos(a), s: Math.sin(a), R: Math.hypot(hx, hy) });
    }
    const [nx, nz] = lmLocalToWorld(c, c.npc.at[0], c.npc.at[1]);
    const npc = placeProp(props[c.npc.model], did, 0.02); npc.scale.setScalar(c.npc.scale);
    npc.position.set(nx, groundAt(nx, nz, 999), nz); npc.rotation.y = Math.atan2(c.x - nx, c.z - nz) + Math.PI;
    scene.add(npc); c.npcObj = npc; c.nx = nx; c.nz = nz;
    S.colliders.push({ x: nx, z: nz, r: c.npc.model === "npc_elephant" ? 2.4 : c.npc.model === "npc_bull" ? 1.6 : 0.7 });
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { col: { value: new THREE.Color(0xffc93c) }, a: { value: 0 }, uTime: worldUniforms.uTime },
      vertexShader: "varying float vY; void main(){ vY = position.y/420.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "uniform vec3 col; uniform float a, uTime; varying float vY; void main(){ float f = (1.0-vY)*(0.6+0.4*sin(uTime*2.0-vY*30.0)); gl_FragColor = vec4(col*f*a, 1.0); }",
    });
    const beam = new THREE.Mesh(beamGeo, mat); beam.position.set(c.x, c.y, c.z); beam.frustumCulled = false; scene.add(beam);
    S.beacons.push(beam);
  });
  // NPC colliders were added after the grid was built
  GRID.clear(); buildColliderGrid();
}

// ============================================================ Mouna (prologue + final boss)
function buildMouna() {
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
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a1030 }), glow = new THREE.MeshBasicMaterial({ color: 0xc9a2ff });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), eyeM); e.scale.set(1.5, 0.6, 0.4); e.position.set(sx * 0.27, 3.62, 1.02); e.rotation.z = sx * 0.25; g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glow); p.position.set(sx * 0.27, 3.62, 1.08); g.add(p); }
  const lips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.05), eyeM); lips.position.set(0, 3.15, 1.0); g.add(lips);
  for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.05), eyeM); st.position.set(-0.18 + i * 0.12, 3.15, 1.01); g.add(st); }
  g.scale.setScalar(1); g.visible = false; scene.add(g); S.mouna = g;
}

// ============================================================ orbs + tags
const emojiTex = new Map();
function emojiTexture(e, ring = "#FFD45C") {
  const key = e + ring; if (emojiTex.has(key)) return emojiTex.get(key);
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, "rgba(255,250,220,1)"); g.addColorStop(0.55, ring); g.addColorStop(1, "rgba(255,200,60,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.font = "64px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(e, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; emojiTex.set(key, t); return t;
}
function makeOrbObj(emoji, ring) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji, ring), depthWrite: false, fog: false })); s.scale.setScalar(2.4); scene.add(s); return s; }
const CARRIED = [3, 4];   // these words are carried by villains (the boss carries #4 in the finale)
function spawnChapterOrbs(ci) {
  clearOrbs(); const c = CHAPTERS[ci], r = rng(1000 + ci * 77);
  c.words.forEach((wd, i) => {
    let x, z, y;
    if (i === 5) { const [bx, by, hh] = HIGH[c.lm]; [x, z] = lmLocalToWorld(c, bx, by); y = c.y + hh; }
    else {
      for (let k = 0; k < 40; k++) {
        const a = (i / 5) * Math.PI * 2 + r() * 0.9, d = 34 + r() * 70;
        x = c.x + Math.cos(a) * d; z = c.z + Math.sin(a) * d;
        if (heightAt(x, z) > 0.8 && districtAt(x, z) > 0 && !solidAt(x, heightAt(x, z) + 1, z) && !near(x, z).some((cc) => !cc.obb && Math.hypot(cc.x - x, cc.z - z) < cc.r + 1.5)) break;
      }
      y = groundAt(x, z, 999) + 1.3;
    }
    const o = makeOrbObj(wd.p); o.position.set(x, y, z);
    const carried = CARRIED.includes(i);
    o.visible = !carried;
    S.orbs.push({ i, wd, x, y, z, home: [x, y, z], got: false, obj: o, high: i === 5, carried });
  });
}
function clearOrbs() { for (const o of S.orbs) scene.remove(o.obj); S.orbs = []; }
function dropOrb(o, x, z) { o.carried = false; o.x = x; o.z = z; o.y = groundAt(x, z, 999) + 1.3; o.home = [o.x, o.y, o.z]; o.obj.position.set(o.x, o.y, o.z); o.obj.visible = !o.got; }

// ============================================================ villains per chapter
function spawnChapterVillains(ci) {
  clearVillains(); S.boss = null;
  const c = CHAPTERS[ci], r = rng(500 + ci), final = ci === CHAPTERS.length - 1;
  const nGoon = 4 + ci, nBrute = Math.floor(ci / 2) + (ci >= 2 ? 1 : 0);
  const at = () => { for (let k = 0; k < 30; k++) { const a = r() * 6.28, d = 30 + r() * 75, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; if (heightAt(x, z) > 0.8 && districtAt(x, z) > 0 && !solidAt(x, heightAt(x, z) + 1, z)) return [x, z]; } return [c.x + 30, c.z + 30]; };
  const words = c.words;
  for (let i = 0; i < nGoon; i++) {
    const [x, z] = at(); const carry = i === 0 ? 3 : i === 1 && !final ? 4 : null;
    spawnVillain(i === 0 && ci > 0 ? "brute" : "goon", x, z, { x: c.x, z: c.z }, carry != null ? { word: carry, wordEmoji: words[carry].p } : {});
  }
  for (let i = 0; i < nBrute; i++) { const [x, z] = at(); spawnVillain("brute", x, z, { x: c.x, z: c.z }); }
  if (final) { S.boss = spawnVillain("boss", c.x, c.z, { x: c.x, z: c.z }, { word: 4, wordEmoji: words[4].p }); }
}
function combatCtx() {
  return {
    groundAt, collide, solidAt, mouna: null,
    get mouna() { return S.mouna; },
    inState: (x, z) => districtAt(x, z) > 0,
    makeTag: (e) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(e, "#E79BFF"), depthWrite: false, fog: false })); s.scale.setScalar(1.6); return s; },
    sfx: (n) => Sound.sfx(n),
    hitVillain: (v, dmg, pos) => {
      if (S.mode === "guest") { v.hp = Math.max(1, v.hp - dmg); v.bar.visible = true; Net.send("vhit", { id: v.id, d: dmg }); Sound.sfx("hit"); spark(pos, 0xffd45c); return; }
      damageVillain(v, dmg, pos);
    },
    heroHit: (H, dmg) => heroHit(H, dmg),
    boom: (p, r) => { ring(p, 0xffb347, r / 4); Sound.sfx("boom2"); shake(0.35); },
    spark: (p, col) => spark(p, col),
    healed: (H) => { UI.toast("🟨 Mysore Pak! +35 health", "gold", 1500); Sound.sfx("collect"); },
    onVillainDown: (v) => {
      if (S.mode === "guest") return;
      if (v.word != null) { const o = S.orbs[v.word]; if (o && !o.got) { dropOrb(o, v.pos.x, v.pos.z); UI.toast(`✨ The word <b>${o.wd.w}</b> is free! Grab it!`, "gold"); } }
      if (v.kind === "boss") { UI.toast("💥 Mouna is defeated! Grab the last word!", "gold", 4000); shake(1); }
      else if (Math.random() < 0.38) dropPak(v.pos.x, v.pos.z);
      broadcastState();
    },
    netShot: (f, d, sp) => { if (S.mode === "host") Net.send("vs", { f: [f.x, f.y, f.z].map((n) => +n.toFixed(2)), d: [d.x, d.y, d.z].map((n) => +n.toFixed(3)), s: sp || 0 }); },
    taunt: () => { if (Math.random() < 0.5) UI.toast(`🤫 <i>${MOUNA_TAUNTS[(Math.random() * MOUNA_TAUNTS.length) | 0]}</i>`, "bad", 1600); },
    summon: (b) => { for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28; spawnVillain("goon", b.home.x + Math.cos(a) * 25, b.home.z + Math.sin(a) * 25, b.home); } UI.toast("🤫 Mouna calls more of the Mute Gang!", "bad"); },
  };
}

// ============================================================ hero damage / KO
function heroHit(H, dmg) {
  if (H.inv > 0 || H.dash > 0 || H.ko || S.busy) return;
  H.hp -= dmg * (H.kind === "gundamma" && H.pound > 0 ? 0.3 : 1); H.hurtT = 0;
  if (H.ctrl === "me") { $("hurt").classList.remove("on"); void $("hurt").offsetWidth; $("hurt").classList.add("on"); shake(0.15); }
  Sound.sfx("hurt");
  if (H.hp <= 0) {
    H.hp = 0; H.ko = 3.2; H.vel.set(0, 0, 0);
    if (H.ctrl === "me") UI.toast("😵 Knocked out! Getting back up…", "bad", 2600);
  }
}
function respawn(H) {
  const c = chap(); H.ko = 0; H.hp = H.maxHp; H.inv = 2.5;
  if (S.phase === "hunt" || S.phase === "return") { H.pos.set(c.x + (H.kind === "bangara" ? -2 : 2), 0, c.z + c.pad + 10); H.pos.y = groundAt(H.pos.x, H.pos.z, 999); }
  H.h.model.rotation.x = 0;
}

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
const colourAmount = () => Save.d.done.length / CHAPTERS.length;

async function startStory() {
  S.playing = true; UI.screen(null); UI.show("hud"); Sound.unlock();
  setupControl();
  for (const H of heroList()) { H.hp = H.maxHp; H.ko = 0; }
  const d = Save.d; S.ch = Math.min(d.ch, CHAPTERS.length - 1); S.phase = d.phase;
  if (storyDone()) S.phase = "free";
  const c = chap();
  if (S.phase === "prologue") { placeHeroesAt(c.x, c.z + 62, Math.PI); await prologue(); }
  else {
    if (d.pos) placeHeroesAt(d.pos[0], d.pos[1], d.pos[2] || 0);
    else { const pc = Save.d.done.length ? CHAPTERS[Save.d.done.length - 1] : c; placeHeroesAt(pc.x, pc.z + 40, Math.PI); }
    if (S.phase === "tutorial") { startTutorial(); }
    else if (["hunt", "return", "fill", "speak"].includes(S.phase)) beginHunt(false);
    if (S.phase === "fill" || S.phase === "speak") S.phase = "return";
  }
  refreshFestival(); Sound.setColour(colourAmount()); broadcastState();
}
async function prologue() {
  const c = CHAPTERS[0];
  for (const dn of c.districts) { const id = S.districtIds[dn]; restore.levels[id] = 1; setDistrictTarget(id, 1); }
  S.mouna.visible = true; S.mouna.position.set(c.x, c.y + 14, c.z - 4);
  S.busy = true;
  await sleep(600);
  await UI.dialogue(c.intro.slice(0, 2), c.npc);
  for (const dn of c.districts) setDistrictTarget(S.districtIds[dn], 0);
  UI.flash(); Sound.sfx("steal");
  await UI.dialogue(c.intro.slice(2), c.npc);
  await UI.dialogue([["mouna", null, "My Mute Gang will guard every word. They carry blasters that fire pure silence!"],
    ["gundamma", "talk", "Then we fight back. Bangara, take the Akshara Blaster. Its letters sting. I have my Tiffin Cannon."],
    ["bangara", "cheer", "Words are our weapons! Let's go!"]], c.npc);
  S.mouna.visible = false; S.busy = false;
  if (!localStorage.getItem("maathu-tut")) startTutorial(); else beginHunt(true);
}
function beginHunt(fresh) {
  S.phase = Save.d.phase = "hunt"; Save.write();
  spawnChapterOrbs(S.ch);
  if (S.mode !== "guest") spawnChapterVillains(S.ch);
  if (fresh) UI.toast(`🔎 Find <b>6 glowing words</b> near ${chap().place.split(",")[0]}. Villains with a 💬 bubble carry stolen words!`, "gold", 5000);
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
  if (o.got || o.carried) return;
  o.got = true; o.obj.visible = false; Sound.sfx("collect");
  Save.learn(o.wd.w);
  if (byKind === S.me || S.mode === "solo") { S.busy = true; UI.wordCard(o.wd).then(() => { S.busy = false; afterCollect(); }); }
  else { UI.toast(`${byKind === "bangara" ? "Bangara" : "Gundamma"} found <b>${o.wd.w}</b> · ${o.wd.k}`, "gold"); afterCollect(); }
  updateWordBadge(); broadcastState();
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
function talkToNpc() {
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
  S.busy = true; clearVillains(); clearOrbs(); S.boss = null;
  for (const dn of c.districts) setDistrictTarget(S.districtIds[dn], 1);
  worldUniforms.wave.value.set(c.x, c.z, 1, 1); S.waveT = 0;
  UI.flash(); Sound.sfx("restore"); S.cheer = 3;
  for (const H of heroList()) { H.hp = H.maxHp; H.ko = 0; H.h.model.rotation.x = 0; }
  await sleep(1600);
  await UI.dialogue(c.outro, c.npc);
  S.mouna.visible = false;
  if (S.mode !== "guest") {
    if (!Save.d.done.includes(c.id)) Save.d.done.push(c.id);
    S.ch = Math.min(ci + 1, CHAPTERS.length - 1);
    Save.d.ch = S.ch; S.phase = Save.d.phase = storyDone() ? "free" : "explore"; Save.write();
  }
  Sound.setColour(colourAmount());
  S.busy = false; refreshFestival(); broadcastState();
  if (storyDone()) UI.toast("🎉 Karnataka is fully restored! 🌟 Festival words now sparkle in every town, but the Mute Gang still guards them.", "gold", 6500);
  else UI.toast(`Next: <b>${chap().place}</b>. Follow the golden light!`, "gold", 5000);
}

// ============================================================ festival (endless learning)
function refreshFestival() {
  for (const f of S.fest) scene.remove(f.obj); S.fest = [];
  if (!Save.d.done.length || S.mode === "guest") return;
  const restoredTowns = W.towns.filter((t) => restore.target[districtAt(t.x, t.z)] > 0.5);
  if (!restoredTowns.length) return;
  const pool = FESTIVAL.filter((w) => !Save.d.words[w.w]); const bank = pool.length ? pool : FESTIVAL;
  const r = rng((Date.now() / 864e5) | 0);
  for (let i = 0; i < Math.min(5, bank.length); i++) {
    const t = restoredTowns[(r() * restoredTowns.length) | 0], a = r() * 6.28, d = 8 + r() * (t.r * 0.8);
    const x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d; if (heightAt(x, z) < 0.6 || solidAt(x, heightAt(x, z) + 1, z)) continue;
    const wd = bank[(r() * bank.length) | 0]; if (S.fest.some((f) => f.wd.w === wd.w)) continue;
    const o = makeOrbObj("🌟", "#E79BFF"); const y = groundAt(x, z, 999) + 1.4; o.position.set(x, y, z);
    S.fest.push({ wd, x, y, z, obj: o, town: t.name, guarded: false });
  }
}
async function collectFestival(f) {
  scene.remove(f.obj); S.fest = S.fest.filter((x) => x !== f); S.busy = true; Sound.sfx("collect");
  const ok = await UI.quiz(f.wd, FESTIVAL);
  Save.learn(f.wd.w); S.busy = false; updateWordBadge();
  UI.toast(ok ? `🌟 <b>${f.wd.w}</b> learned first try!` : `🌟 <b>${f.wd.w}</b> is in your tiffin now.`, "gold");
  if (!S.fest.length) setTimeout(refreshFestival, 2000);
}

// ============================================================ tutorial (first time only)
const TUT = () => {
  const B = S.me === "bangara";
  return [
    { t: "👈 Use the <b>LEFT stick</b> to run around. (Keyboard: W A S D)", hi: "joy", ok: () => S.tut.moved > 8 },
    { t: "👉 <b>Drag on the RIGHT side</b> of the screen to turn the camera.", hi: null, ok: () => S.tut.look > 140 },
    { t: "Tap <b>⤒ JUMP</b>. Tap it again in the air for a double jump!", hi: "jump", ok: () => S.tut.jumped },
    { t: "Hold <b>🔫 FIRE</b> to shoot. It aims at the nearest villain by itself. Knock down the practice dummy!", hi: "fire", ok: () => S.tut.dummy && S.tut.dummy.dead, enter: spawnDummy },
    { t: B ? "Tap <b>⚡ DASH</b> to zoom forward. You can't be hit while dashing!" : "Tap <b>💥 POUND</b> to smash the ground and knock back everyone nearby!", hi: "special", ok: () => S.tut.special },
    { t: B ? "Run right next to Gundamma and tap <b>🤝 LAUNCH</b>. She throws you sky-high!" : "Stand right next to Bangara and tap <b>🤝 THROW</b> to launch him sky-high!", hi: "team", ok: () => S.tut.thrown },
    ...(S.mode === "solo" ? [{ t: "Tap <b>🔁 SWAP</b> to switch heroes. Try Gundamma, then come back!", hi: "swap", ok: () => S.tut.swaps >= 1 }] : []),
    { t: "You're ready! Find the <b>6 glowing words</b>. Villains with a 💬 bubble carry stolen words, so beat them to free the words. Eat 🟨 Mysore Pak to heal.", hi: null, ok: () => S.tut.tEnd > 6 },
  ];
};
function startTutorial() {
  S.phase = Save.d.phase = "tutorial"; Save.write();
  S.tut = { i: -1, moved: 0, look: 0, jumped: false, special: false, thrown: false, swaps: 0, dummy: null, tEnd: 0, last: active().pos.clone() };
  UI.show("coach"); nextTut();
}
function nextTut() {
  const steps = TUT(); S.tut.i++;
  document.querySelectorAll(".coach-hi").forEach((e) => e.classList.remove("coach-hi"));
  if (S.tut.i >= steps.length) return endTutorial();
  const st = steps[S.tut.i];
  $("coachN").textContent = `Training ${S.tut.i + 1}/${steps.length}`; $("coachT").innerHTML = st.t;
  if (st.hi) { const el = st.hi === "joy" ? $("joy") : document.querySelector(`[data-act=${st.hi}]`); el && el.classList.add("coach-hi"); }
  if (st.enter) st.enter();
  Sound.sfx("right");
}
function endTutorial() {
  UI.hide("coach"); document.querySelectorAll(".coach-hi").forEach((e) => e.classList.remove("coach-hi"));
  try { localStorage.setItem("maathu-tut", "1"); } catch (e) {}
  if (S.tut && S.tut.dummy && !S.tut.dummy.dead) killVillain(S.tut.dummy);
  S.tut = null; clearVillains(); beginHunt(true);
}
function spawnDummy() {
  const H = active(), x = H.pos.x + Math.sin(H.yaw) * 10, z = H.pos.z + Math.cos(H.yaw) * 10;
  const v = spawnVillain("goon", x, z, { x, z }); v.passive = true; v.K = { ...v.K, speed: 0, sight: 0 }; v.hp = v.maxHp = 30; S.tut.dummy = v;
}
function updateTutorial(dt) {
  const T = S.tut; if (!T) return;
  const H = active(); T.moved += Math.hypot(H.pos.x - T.last.x, H.pos.z - T.last.z); T.last.copy(H.pos);
  const steps = TUT(); const st = steps[T.i];
  if (T.i === steps.length - 1) T.tEnd += dt;
  if (st && st.ok()) nextTut();
}

// ============================================================ control
function setupControl() {
  for (const k in S.heroes) S.heroes[k].ctrl = S.mode === "solo" ? (k === S.me ? "me" : "ai") : k === S.me ? "me" : "remote";
  $("bSwap").hidden = S.mode !== "solo";
  updateSpecialBtn(); updateWordBadge();
}
function updateSpecialBtn() {
  const isB = S.me === "bangara";
  $("bSpecial").innerHTML = isB ? "⚡<small>Dash</small>" : "💥<small>Pound</small>";
  $("bTeam").innerHTML = isB ? "🤝<small>Launch</small>" : "🤝<small>Throw</small>";
  $("bFire").innerHTML = (isB ? "🔫" : "🥫") + `<small>${isB ? "Blaster" : "Cannon"}</small>`;
}
function updateWordBadge() { const n = Object.keys(Save.d.words).length; $("hWords").textContent = n || ""; $("tWords").textContent = n ? `${n} words learned` : ""; }

// ============================================================ vehicles
function vehCtx() {
  return {
    groundAt, collide: collideWorld,
    blocked: (x, z, r) => solidAt(x, heightAt(x, z) + 1, z) || near(x, z).some((c) => (c.obb ? !!inBox(c, x, z, r) : Math.hypot(c.x - x, c.z - z) < c.r + r)),
    crash: (v) => { Sound.sfx("crash"); if (driverIsMe(v)) shake(0.4); },
    edge: (v) => { if (driverIsMe(v) && S.t - (S.lastWall || 0) > 4) { S.lastWall = S.t; UI.toast("🌊 Can't drive there!"); } },
    honk: (v) => { if (S.t - v.honk > 0.6) { v.honk = S.t; Sound.sfx("horn"); if (S.mode !== "solo") Net.send("honk", { i: v.id }); } },
    runOver: (v) => {
      for (const e of CB.villains) {
        if (e.dead || e.kind === "boss" || e.passive) continue;
        if (Math.hypot(e.pos.x - v.pos.x, e.pos.z - v.pos.z) < v.T.r + 0.7) {
          if (S.t - (e.ranT || 0) < 0.6) continue; e.ranT = S.t;
          combatCtx().hitVillain(e, 80, v.pos); const a = v.yaw; e.pos.x += Math.sin(a) * 2.5; e.pos.z += Math.cos(a) * 2.5;
          Sound.sfx("boom"); v.speed *= 0.85;
        }
      }
    },
  };
}
const driverIsMe = (v) => { const k = v.seats[0]; return k && S.heroes[k].ctrl !== "remote"; };
function enterVehicle(H, v, seat, announce = true) {
  if (v.seats[seat]) return false;
  v.seats[seat] = H.kind; H.veh = { v, seat }; H.vel.set(0, 0, 0); H.vy = 0;
  if (seat === 0) v.net = null;
  if (announce && S.mode !== "solo" && H.ctrl === "me") Net.send("vseat", { i: v.id, k: H.kind, s: seat });
  if (H.ctrl === "me") UI.toast(seat === 0 ? `${v.T.icon} You're driving the ${v.T.name}! Stick = steer · ⤒ = horn` : `${v.T.icon} Riding along. Hold 🔫 to shoot from the ${v.T.name}!`, "gold", 3000);
  return true;
}
function exitVehicle(H, announce = true) {
  const R = H.veh; if (!R) return; const v = R.v;
  v.seats[R.seat] = null; H.veh = null;
  const side = R.seat === 0 ? -1 : 1, a = v.yaw;
  H.pos.set(v.pos.x + Math.cos(a) * (v.T.r + 0.9) * side, 0, v.pos.z - Math.sin(a) * (v.T.r + 0.9) * side);
  H.pos.y = groundAt(H.pos.x, H.pos.z, 999); H.vel.set(0, 0, 0); H.vy = 0; H.yaw = v.yaw;
  H.h.model.rotation.x = 0;
  if (announce && S.mode !== "solo" && H.ctrl === "me") Net.send("vseat", { i: v.id, k: H.kind, s: -1 });
}
function toggleVehicle() {
  const H = active();
  if (H.veh) {
    const v = H.veh.v; exitVehicle(H);
    if (S.mode === "solo") { const O = other(); if (O.veh && O.veh.v === v) exitVehicle(O); }
    return;
  }
  const v = nearestFree(H.pos); if (!v) return;
  const seat = v.seats[0] ? 1 : 0;
  enterVehicle(H, v, seat);
  if (S.mode === "solo" && seat === 0) { const O = other(); if (!O.veh && O.pos.distanceTo(H.pos) < 40 && !O.ko) enterVehicle(O, v, 1, false); }
}
function updateHeroInVehicle(H, dt) {
  const R = H.veh, v = R.v;
  if (R.seat === 0 && H.ctrl === "me" && !S.busy && !UI.anyModal()) {
    const honk = consume("jump");
    drive(v, { throttle: Input.move.y, steer: Input.move.x, honk }, dt);
  } else if (R.seat === 0 && H.ctrl !== "remote") drive(v, { throttle: 0, steer: 0 }, dt);
  seatWorld(v, R.seat, H.pos); H.yaw = v.yaw; H.vel.set(Math.sin(v.yaw) * v.speed, 0, Math.cos(v.yaw) * v.speed); H.ground = true;
  // passengers (and AI riders) can shoot from the vehicle
  let firing = false;
  if (R.seat === 1 && H.ctrl === "me" && !S.busy && !UI.anyModal()) firing = Input.held.has("fire") || consume("fire");
  if (R.seat === 1 && H.ctrl === "ai") { H.aiFire -= dt; const tg = autoTarget(H, new V3(Math.sin(v.yaw), 0, Math.cos(v.yaw)), 30); if (tg && !tg.passive && H.aiFire <= 0) { firing = true; H.aiFire = WEAPON[H.kind].cd * 2.2; } }
  if (firing && H.fireCd <= 0) fire(H);
  if (R.seat === 0 && H.ctrl === "me") consume("fire");
  const h = H.h; play(h, "idle"); h.mixer.update(dt);
  h.holder.position.copy(H.pos); h.holder.rotation.set(0, 0, 0); h.holder.rotateY(v.yaw); h.holder.rotateX(-v.pitch); h.holder.rotateZ(v.roll);
  h.model.rotation.x = 0; h.model.position.y = 0; h.model.visible = true;
  h.holder.updateMatrixWorld(true);
  seatPose(H, v.T.legs);
  if (R.seat === 0) { H.aim.dir.set(Math.sin(v.yaw), -0.45, Math.cos(v.yaw)).normalize(); H.aim.t = Math.max(H.aim.t, 0.05); }
  applyAim(H);
  h.holder.userData.shadow.visible = false; H.anim = "ride";
}

// ============================================================ hero update
const tmp = new V3();
function camForward() { return new V3(-Math.sin(S.cam.yaw), 0, -Math.cos(S.cam.yaw)); }
function updateHero(H, dt) {
  const h = H.h;
  H.dashCd = Math.max(0, H.dashCd - dt); H.poundCd = Math.max(0, H.poundCd - dt); H.inv = Math.max(0, H.inv - dt);
  H.dash = Math.max(0, H.dash - dt); H.throwT = Math.max(0, H.throwT - dt); H.stun = Math.max(0, H.stun - dt); H.fireCd = Math.max(0, H.fireCd - dt);
  if (H.aim) H.aim.t = Math.max(0, H.aim.t - dt);
  H.hurtT += dt; if (H.hurtT > 4 && H.hp < H.maxHp && !H.ko) H.hp = Math.min(H.maxHp, H.hp + 5 * dt);
  if (H.ctrl === "remote") { remoteFollow(H, dt); if (H.veh) return updateHeroInVehicle(H, dt); H.h.holder.userData.shadow.visible = true; return animateHero(H, dt); }
  if (H.ko > 0 && H.veh) exitVehicle(H);
  if (H.ko > 0) { H.ko -= dt; if (H.ko <= 0) respawn(H); return animateHero(H, dt); }
  if (H.veh) return updateHeroInVehicle(H, dt);
  H.h.holder.userData.shadow.visible = true; H.h.holder.rotation.set(0, H.yaw, 0);
  let mx = 0, mz = 0, wantJump = false, wantSpecial = false, firing = false;
  if (H.ctrl === "me" && !S.busy && !UI.anyModal()) {
    const y = S.cam.yaw, fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
    mx = fx * Input.move.y + rx * Input.move.x; mz = fz * Input.move.y + rz * Input.move.x;
    wantJump = consume("jump"); wantSpecial = consume("special"); firing = Input.held.has("fire") || consume("fire");
    if (wantJump && S.tut) S.tut.jumped = true; if (wantSpecial && S.tut) S.tut.special = true;
  } else if (H.ctrl === "ai" && !S.busy) {
    const L = active(); const back = 2.6;
    if (L.veh && L.veh.seat === 0 && !L.veh.v.seats[1] && H.pos.distanceTo(L.pos) < 40) { enterVehicle(H, L.veh.v, 1, false); return; }
    const tx = L.pos.x - Math.sin(L.yaw) * back + Math.cos(L.yaw) * 1.3, tz = L.pos.z - Math.cos(L.yaw) * back - Math.sin(L.yaw) * 1.3;
    const dx = tx - H.pos.x, dz = tz - H.pos.z, d = Math.hypot(dx, dz);
    if (d > 70) H.pos.set(tx, groundAt(tx, tz, 999), tz);
    else if (d > 1.2) { const k = Math.min(1, (d - 1.2) / 3); mx = dx / d * k; mz = dz / d * k; }
    if (L.pos.y > H.pos.y + 1.6 && H.ground && d < 6 && H.throwT <= 0) wantJump = true;
    // AI partner fights too
    H.aiFire -= dt; const tg = autoTarget(H, new V3(Math.sin(H.yaw), 0, Math.cos(H.yaw)), 30);
    if (tg && !tg.passive && H.aiFire <= 0) { firing = true; H.aiFire = WEAPON[H.kind].cd * 2.2; }
  }
  if (H.stun > 0) { mx = mz = 0; wantJump = wantSpecial = firing = false; }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const inWater = heightAt(H.pos.x, H.pos.z) < 0.9 && H.pos.y < 1.2;
  let speed = h.speed * (inWater ? 0.6 : 1) * (H.ctrl === "ai" ? 1.12 : 1) * (H.aim && H.aim.t > 0 ? 0.8 : 1);
  if (H.dash > 0) speed = 30;
  if (H.pound > 0 && H.ground) speed = 0;
  const acc = H.ground ? 14 : 5;
  if (H.dash > 0) { const f = Math.hypot(H.vel.x, H.vel.z) || 1; H.vel.x = (H.vel.x / f) * speed; H.vel.z = (H.vel.z / f) * speed; }
  else { H.vel.x += (mx * speed - H.vel.x) * Math.min(1, acc * dt); H.vel.z += (mz * speed - H.vel.z) * Math.min(1, acc * dt); }
  if (wantJump && (H.ground || H.jumps < h.air)) { H.vy = H.ground ? h.jump : h.jump * 0.9; H.jumps++; H.ground = false; Sound.sfx("jump"); }
  if (wantSpecial) special(H);
  if (firing && H.fireCd <= 0) fire(H);
  const prev = tmp.copy(H.pos);
  H.pos.x += H.vel.x * dt; H.pos.z += H.vel.z * dt;
  collide(H.pos, H.kind === "gundamma" ? 0.5 : 0.38);
  const dI = districtAt(H.pos.x, H.pos.z), hg = heightAt(H.pos.x, H.pos.z);
  if (dI === 0 || hg < 0.25) {
    H.pos.x = prev.x; H.pos.z = prev.z; H.vel.x *= -0.2; H.vel.z *= -0.2;
    if (H.ctrl === "me" && S.t - (S.lastWall || 0) > 4) { S.lastWall = S.t; UI.toast(dI === 0 && hg >= 0.25 ? "🌫️ Mouna's silence fog is too thick beyond Karnataka's border." : "🌊 That's the Arabian Sea. Too far to swim!"); }
  }
  H.vy -= G_ACC * dt * (H.pound > 0 && !H.ground ? 2.4 : 1); H.pos.y += H.vy * dt;
  const gnd = groundAt(H.pos.x, H.pos.z, H.pos.y);
  if (H.pos.y <= gnd) { if (!H.ground && H.pound > 0) poundImpact(H); H.pos.y = gnd; H.vy = 0; H.ground = true; H.jumps = 0; }
  else if (H.pos.y > gnd + 0.25) H.ground = false;
  else if (H.vy <= 0) { H.pos.y += (gnd - H.pos.y) * Math.min(1, dt * 12); H.ground = true; H.jumps = 0; }
  if (H.pound > 0) H.pound = Math.max(0, H.pound - dt);
  const sp = Math.hypot(H.vel.x, H.vel.z);
  if (H.aim && H.aim.t > 0) { const ty = Math.atan2(H.aim.dir.x, H.aim.dir.z); H.yaw += angDiff(H.yaw, ty) * Math.min(1, dt * 18); }
  else if (sp > 0.6) { const ty = Math.atan2(H.vel.x, H.vel.z); H.yaw += angDiff(H.yaw, ty) * Math.min(1, dt * 12); }
  animateHero(H, dt);
}
function fire(H) {
  const W2 = WEAPON[H.kind]; H.fireCd = W2.cd;
  const fwd = H.ctrl === "me" ? camForward() : new V3(Math.sin(H.yaw), 0, Math.cos(H.yaw));
  const tg = autoTarget(H, fwd);
  const from = new V3(H.pos.x, H.pos.y + 1.0, H.pos.z);
  let dir;
  if (tg) { const c = vCenter(tg); if (tg.kind !== "boss" && !tg.dead) { c.x += (tg.pos.x - (tg.lastX ?? tg.pos.x)) * 0; } dir = c.sub(from).normalize(); }
  else dir = new V3(fwd.x, 0.03, fwd.z).normalize();
  H.aim.dir.copy(dir); H.aim.t = 0.5;
  H.yaw = Math.atan2(dir.x, dir.z); H.h.holder.rotation.y = H.yaw; H.h.model.updateMatrixWorld(true); applyAim(H); H.h.model.updateMatrixWorld(true);
  const s = heroFire(H, dir, "me");
  if (S.mode !== "solo" && H.ctrl === "me") Net.send("hs", { k: H.kind, f: [s.from.x, s.from.y, s.from.z].map((n) => +n.toFixed(2)), d: [dir.x, dir.y, dir.z].map((n) => +n.toFixed(3)) });
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
  Sound.sfx("pound"); shake(0.5); ring(H.pos, 0x9b7cff, 1.6);
  for (const v of CB.villains) if (!v.dead && v.kind !== "boss" && Math.hypot(v.pos.x - H.pos.x, v.pos.z - H.pos.z) < 7) combatCtx().hitVillain(v, 35, H.pos);
}
function teamUp(byMe) {
  const B = S.heroes.bangara, Gm = S.heroes.gundamma;
  if (B.pos.distanceTo(Gm.pos) > 3.2) { if (byMe) UI.toast("Stand right next to each other to team up! 🤝"); return; }
  if (Gm.throwT > 0) return;
  Gm.throwT = 0.8; play(Gm.h, "throw", 0.08); Sound.sfx("throw");
  if (B.ctrl !== "remote") {
    B.pos.copy(Gm.pos); B.pos.y += 1.2; B.vy = THROW_V; B.ground = false; B.jumps = 1; B.throwT = 1.2;
    B.vel.x = Math.sin(Gm.yaw) * 4; B.vel.z = Math.cos(Gm.yaw) * 4;
  }
  if (S.tut) S.tut.thrown = true;
  if (byMe && S.mode !== "solo") Net.send("team");
}
function animateHero(H, dt) {
  const h = H.h, sp = Math.hypot(H.vel.x, H.vel.z);
  let a = "idle";
  if (S.cheer > 0) a = "cheer";
  else if (H.ko > 0) a = "idle";
  else if (H.throwT > 0 && H.kind === "gundamma") a = "throw";
  else if (H.pound > 0 && H.kind === "gundamma") a = "pound";
  else if (H.dash > 0) a = "dash";
  else if (!H.ground) a = "jump";
  else if (sp > 0.8) a = "run";
  else if (UI.isOpen("dlg") && S.me === H.kind) a = "talk";
  if (H.ctrl === "remote" && H.net) a = H.net.a === "ko" ? "idle" : H.net.a || a;
  play(h, a);
  if (h.actions.run) h.actions.run.setEffectiveTimeScale(Math.max(0.6, sp / h.speed * 1.1));
  h.mixer.update(dt);
  h.holder.position.copy(H.pos); h.holder.rotation.y = H.yaw;
  const down = H.ko > 0 || (H.ctrl === "remote" && H.net && H.net.a === "ko");
  h.model.rotation.x += ((down ? -Math.PI / 2 : 0) - h.model.rotation.x) * Math.min(1, dt * 10);
  h.model.position.y = down ? 0.35 : 0;
  h.model.rotation.z = H.stun > 0 ? Math.sin(S.t * 30) * 0.15 : 0;
  h.model.visible = !(H.inv > 0 && !down && Math.floor(S.t * 14) % 2 && H.hurtT < 3);
  h.holder.updateMatrixWorld(true); applyAim(H);
  const shd = h.holder.userData.shadow, gy = groundAt(H.pos.x, H.pos.z, H.pos.y + 0.1);
  shd.position.set(H.pos.x, gy + 0.06, H.pos.z); shd.material.opacity = 0.28 * Math.max(0.2, 1 - (H.pos.y - gy) / 8);
  H.anim = down ? "ko" : a;
}
function remoteFollow(H, dt) {
  const n = H.net; if (!n) return;
  const k = Math.min(1, dt * 10), dx = n.p[0] - H.pos.x, dz = n.p[2] - H.pos.z;
  H.vel.set(dx * 6, 0, dz * 6);
  H.pos.x += dx * k; H.pos.y += (n.p[1] - H.pos.y) * k; H.pos.z += dz * k;
  if (Math.hypot(dx, dz) > 30) H.pos.set(...n.p);
  H.yaw += angDiff(H.yaw, n.y) * k; H.ground = !!n.g; H.dash = n.a === "dash" ? 0.1 : 0;
  if (n.hp !== undefined) H.hp = n.hp;
}
function syncRemoteSeat(H, d) {
  const want = d.vh ? VS.list[d.vh[0]] : null;
  if (H.veh && (!want || H.veh.v !== want || H.veh.seat !== d.vh[1])) { const R = H.veh; R.v.seats[R.seat] = null; if (R.seat === 0 && R.v.net) { R.v.net.s = 0; R.v.net.st = 0; } H.veh = null; }
  if (want && !H.veh && !want.seats[d.vh[1]]) { want.seats[d.vh[1]] = H.kind; H.veh = { v: want, seat: d.vh[1] }; }
}
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// ============================================================ effects
const rings = [];
function ring(pos, color, size = 1) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(pos); m.position.y = groundAt(pos.x, pos.z, pos.y + 1) + 0.2; scene.add(m); rings.push({ m, t: 0, size });
}
const sparks = [];
const sparkGeo = new THREE.SphereGeometry(0.35, 8, 6);
function spark(pos, color) { const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.copy(pos); scene.add(m); sparks.push({ m, t: 0 }); }
function updateFx(dt) {
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; r.m.scale.setScalar((1 + r.t * 14) * r.size); r.m.material.opacity = 0.9 * (1 - r.t / 0.6); if (r.t > 0.6) { scene.remove(r.m); rings.splice(i, 1); } }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.t += dt; s.m.scale.setScalar(1 + s.t * 6); s.m.material.opacity = 1 - s.t / 0.25; if (s.t > 0.25) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); } }
}
let shakeT = 0; function shake(s) { shakeT = Math.max(shakeT, s); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================ camera
function updateCamera(dt) {
  const H = active(), c = S.cam;
  if (Input.look.dx || Input.look.dy) { if (S.tut) S.tut.look += Math.abs(Input.look.dx) + Math.abs(Input.look.dy); c.yaw -= Input.look.dx * 0.0065; c.pitch = THREE.MathUtils.clamp(c.pitch + Input.look.dy * 0.004, 0.08, 1.15); Input.look.dx = Input.look.dy = 0; S.lastLook = S.t; }
  const sp = Math.hypot(H.vel.x, H.vel.z), inV = H.veh;
  if (inV) { if (S.t - S.lastLook > 1.0 && Math.abs(inV.v.speed) > 1) c.yaw += angDiff(c.yaw, inV.v.yaw + Math.PI) * Math.min(1, dt * 3); }
  else if (sp > 2 && S.t - S.lastLook > 1.6 && H.ground && !(H.aim && H.aim.t > 0)) c.yaw += angDiff(c.yaw, H.yaw + Math.PI) * Math.min(1, dt * 0.9 * (sp / H.h.speed));
  const dist = UI.isOpen("dlg") ? 5.5 : inV ? 11 + Math.abs(inV.v.speed) * 0.08 : c.dist;
  const tgt = inV ? tmp.set(inV.v.pos.x, inV.v.pos.y + 1.9, inV.v.pos.z) : tmp.set(H.pos.x, H.pos.y + 1.35, H.pos.z);
  const want = new V3(tgt.x + Math.sin(c.yaw) * Math.cos(c.pitch) * dist, tgt.y + Math.sin(c.pitch) * dist, tgt.z + Math.cos(c.yaw) * Math.cos(c.pitch) * dist);
  const floor = heightAt(want.x, want.z) + 0.9; if (want.y < floor) want.y = floor;
  { const dir = want.clone().sub(tgt), L = dir.length(); dir.divideScalar(L); let ok = L;
    for (let t = 1.2; t < L; t += 0.7) { if (solidAt(tgt.x + dir.x * t, tgt.y + dir.y * t, tgt.z + dir.z * t)) { ok = Math.max(1.5, t - 0.8); break; } }
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
  const nearNpc = c.npcObj && Math.hypot(H.pos.x - c.nx, H.pos.z - c.nz) < 9;
  $("bTalk").hidden = !(nearNpc && S.phase === "return");
  if (consume("talk") && nearNpc && S.phase === "return") { if (S.mode === "guest") Net.send("talk"); else talkToNpc(); }
  // vehicle button + speedometer
  const nv = H.veh ? null : nearestFree(H.pos);
  $("bCar").hidden = !(H.veh || nv) || H.ko > 0;
  if (H.veh) $("bCar").innerHTML = "🚪<small>Exit</small>"; else if (nv) $("bCar").innerHTML = `${nv.T.icon}<small>${nv.seats[0] ? "Ride" : "Drive"}</small>`;
  if (nv && !S.vehHint) { S.vehHint = true; UI.toast(`${nv.T.icon} A ${nv.T.name}! Tap <b>${nv.T.icon} Drive</b> to hop in.`, "gold", 3500); }
  $("speedo").hidden = !H.veh; if (H.veh) $("speedo").textContent = `${Math.round(Math.abs(H.veh.v.speed) * 3.2)} km/h`;
  $("bJump").innerHTML = H.veh && H.veh.seat === 0 ? "📯<small>Horn</small>" : "⤒<small>Jump</small>";
  // health
  $("hpFill").style.width = (H.hp / H.maxHp * 100).toFixed(1) + "%"; $("hpFill").className = H.hp / H.maxHp < 0.3 ? "low" : "";
  $("hpTxt").textContent = H.ko > 0 ? "KO" : Math.ceil(H.hp);
  const B = S.boss; $("bossBar").hidden = !(B && !B.dead && Math.hypot(H.pos.x - B.pos.x, H.pos.z - B.pos.z) < 120);
  if (B) $("bossFill").style.width = Math.max(0, B.hp / B.maxHp * 100) + "%";
  if (hudT > 0) return; hudT = 0.2;
  let tx = c.x, tz = c.z, text = "", chapTxt = `Chapter ${S.ch + 1} · ${c.title}`;
  const dLm = Math.hypot(H.pos.x - c.x, H.pos.z - c.z);
  if (S.phase === "tutorial") { text = "Training with Gundamma"; tx = H.pos.x; tz = H.pos.z; }
  else if (S.phase === "explore") text = `Go to ${c.place}`;
  else if (S.phase === "hunt") {
    const left = S.orbs.filter((o) => !o.got), free = left.filter((o) => !o.carried);
    text = `Find the glowing words · ${6 - left.length}/6`;
    if (dLm < 170 && left.length) {
      let best = 1e9;
      for (const o of free) { const d = Math.hypot(o.x - H.pos.x, o.z - H.pos.z); if (d < best) { best = d; tx = o.x; tz = o.z; } }
      if (!free.length) { for (const v of CB.villains) if (!v.dead && v.word != null && !S.orbs[v.word]?.got) { const d = Math.hypot(v.pos.x - H.pos.x, v.pos.z - H.pos.z); if (d < best) { best = d; tx = v.pos.x; tz = v.pos.z; } } text = `Beat the villains carrying words 💬 · ${6 - left.length}/6`; }
      else if (free.every((o) => o.high)) text = "A word is up high! 🤝 Team-up throw!";
    }
  } else if (S.phase === "return") { text = `Talk to ${c.npc.name} ${c.npc.icon}`; tx = c.nx; tz = c.nz; }
  else if (S.phase === "free") {
    chapTxt = "Karnataka restored · Word Festival";
    let best = 1e9, f0 = null; for (const f of S.fest) { const d = Math.hypot(f.x - H.pos.x, f.z - H.pos.z); if (d < best) { best = d; f0 = f; } }
    if (f0) { tx = f0.x; tz = f0.z; text = `🌟 Festival word near ${f0.town}`; } else text = "Explore Karnataka!";
  } else text = "…";
  const d = Math.hypot(tx - H.pos.x, tz - H.pos.z);
  UI.objective(chapTxt, text, d > 6 ? fmtDist(d) : "");
  const ang = Math.atan2(tx - H.pos.x, tz - H.pos.z), rel = angDiff(S.cam.yaw + Math.PI, ang);
  UI.compass(-rel, d > 12 && !S.busy);
  if (miniT <= 0) { miniT = 0.25; drawMini(); }
  $("partner").hidden = S.mode === "solo";
  if (S.mode !== "solo") { const o = other(); $("partner").textContent = `${o.kind === "bangara" ? "🐰 Bangara" : "🐼 Gundamma"} ❤️${Math.ceil(o.hp)} · ${fmtDist(o.pos.distanceTo(H.pos))}${Net.open ? "" : " · offline"}`; }
}
const fmtDist = (u) => { const m = u * 4; return m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`; };
function marks(forMap) {
  const out = [];
  CHAPTERS.forEach((c, i) => {
    const done = Save.d.done.includes(c.id), cur = i === S.ch && !storyDone();
    if (done || cur || forMap) out.push({ x: c.x, z: c.z, col: cur ? "#F2B705" : done ? "#3E8E3A" : "#8C83A8", big: cur, label: forMap ? c.place.split(",")[0] : "", travel: done || (cur && (Save.d.visited || []).includes(c.id)), c });
  });
  if (S.phase === "hunt" && !forMap) { for (const o of S.orbs) if (!o.got && !o.carried) out.push({ x: o.x, z: o.z, col: "#FFD45C" }); for (const v of CB.villains) if (!v.dead && !v.passive) out.push({ x: v.pos.x, z: v.pos.z, col: v.word != null ? "#E79BFF" : "#7B3FE4" }); }
  for (const f of S.fest) out.push({ x: f.x, z: f.z, col: "#E79BFF", label: forMap ? "🌟" : "" });
  return out;
}
function mapData(forMap) {
  const H = active(), O = other();
  return { meta: W.meta, me: { x: H.pos.x, z: H.pos.z, yaw: S.cam.yaw, col: H.kind === "bangara" ? "#E89A1C" : "#2E2A2A" },
    other: { x: O.pos.x, z: O.pos.z, col: O.kind === "bangara" ? "#E89A1C" : "#2E2A2A" }, marks: marks(forMap), colour: colourAmount(), greyMask: forMap ? greyMask() : null };
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
  for (const H of heroList()) if (H.veh && H.ctrl !== "remote") exitVehicle(H);
  UI.flash(); placeHeroesAt(c.x, c.z + c.pad + 12, Math.PI);
  UI.toast(`✨ Travelled to <b>${c.place}</b>`, "gold");
  if (S.mode !== "solo") Net.send("h", heroMsg(active()));
}

// ============================================================ networking
function heroMsg(H) { return { k: H.kind, p: [+H.pos.x.toFixed(2), +H.pos.y.toFixed(2), +H.pos.z.toFixed(2)], y: +H.yaw.toFixed(2), a: H.anim, g: H.ground ? 1 : 0, hp: Math.ceil(H.hp), vh: H.veh ? [H.veh.v.id, H.veh.seat] : null }; }
let netT = 0, vT = 0;
const KINDS = ["goon", "brute", "boss"];
function stateMsg() { return { ch: S.ch, ph: S.phase, done: Save.d.done, orbs: S.orbs.map((o) => [o.got ? 1 : 0, o.carried ? 1 : 0, +o.x.toFixed(1), +o.y.toFixed(1), +o.z.toFixed(1)]) }; }
function broadcastState() { if (S.mode === "host") Net.send("state", stateMsg()); }
function netTick(dt) {
  if (S.mode === "solo" || !Net.open) return;
  netT -= dt; vT -= dt;
  if (netT <= 0) { netT = 1 / 12; Net.send("h", heroMsg(active()));
    const R = active().veh; if (R && R.seat === 0) { const v = R.v; Net.send("veh", { i: v.id, p: [v.pos.x, v.pos.y, v.pos.z].map((n) => +n.toFixed(2)), y: +v.yaw.toFixed(3), s: +v.speed.toFixed(2), st: +v.steer.toFixed(2), pt: +v.pitch.toFixed(2), rl: +v.roll.toFixed(2) }); } }
  if (S.mode === "host" && vT <= 0) { vT = 0.12; Net.send("vil", CB.villains.filter((v) => !v.passive).map((v) => [v.id, KINDS.indexOf(v.kind), +v.pos.x.toFixed(1), +v.pos.z.toFixed(1), +v.yaw.toFixed(2), Math.ceil(v.hp), v.anim || 0, v.dead ? 1 : 0, v.word ?? -1])); }
}
function setupNetHandlers() {
  Net.on.h = (d) => { const H = S.heroes[d.k]; if (H && H.ctrl === "remote") { H.net = d; syncRemoteSeat(H, d); if (!H.seen) { H.seen = true; H.pos.set(...d.p); } } };
  Net.on.veh = (d) => { const v = VS.list[d.i]; if (v && !driverIsMe(v)) v.net = d; };
  Net.on.vseat = (d) => { const v = VS.list[d.i], H = S.heroes[d.k]; if (!v || !H || H.ctrl !== "remote") return; syncRemoteSeat(H, { vh: d.s >= 0 ? [d.i, d.s] : null }); };
  Net.on.honk = () => Sound.sfx("horn");
  Net.on.hs = (d) => { const H = S.heroes[d.k]; if (!H) return; const dir = new V3(...d.d); H.aim.dir.copy(dir); H.aim.t = 0.5; const W2 = WEAPON[d.k]; shoot(W2.kind, new V3(...d.f), dir, "remote", 0, { speed: W2.speed, range: W2.range, aoe: W2.aoe }); Sound.sfx(d.k === "bangara" ? "zap" : "boom"); };
  Net.on.vs = (d) => { if (S.mode !== "guest") return; shoot("ink", new V3(...d.f), new V3(...d.d), "villain", 7, d.s ? { speed: d.s, range: 60 } : {}); };
  Net.on.fx = (d) => { if (d.a === "pound") { const H = S.heroes[d.k]; Sound.sfx("pound"); ring(H.pos, 0x9b7cff, 1.6); } else Sound.sfx("dash"); };
  Net.on.team = () => teamUp(false);
  Net.on.collect = (d) => { const o = S.orbs[d.i]; if (o && !o.got && S.mode === "host") { o.got = true; o.obj.visible = false; Sound.sfx("collect"); Save.learn(o.wd.w); UI.toast(`${other().kind === "bangara" ? "Bangara" : "Gundamma"} found <b>${o.wd.w}</b> · ${o.wd.k}`, "gold"); afterCollect(); broadcastState(); } };
  Net.on.vhit = (d) => { const v = CB.villains.find((x) => x.id === d.id); if (v && S.mode === "host") damageVillain(v, d.d); };
  Net.on.talk = () => talkToNpc();
  Net.on.fillDone = () => { if (S.phase === "fill") { UI.hide("fill"); onFillDone(); } };
  Net.on.speakDone = () => { if (S.phase === "speak") { UI.hide("speak"); onSpeakDone(); } };
  Net.on.start = (d) => { if (S.mode !== "guest") return; Save.guest = true; Save.d.ch = d.save.ch; Save.d.phase = d.save.phase === "tutorial" ? "hunt" : d.save.phase; Save.d.done = d.save.done; Save.d.visited = d.save.visited; applyRestoreFromSave(true); startStory(); };
  Net.on.state = (d) => {
    if (S.mode !== "guest") return;
    const chChanged = d.ch !== S.ch; S.ch = d.ch;
    Save.d.done = d.done; applyRestoreFromSave(false);
    if (chChanged || ((d.ph === "hunt" || d.ph === "return") && !S.orbs.length)) { if (d.ph === "hunt" || d.ph === "return") spawnChapterOrbs(S.ch); else clearOrbs(); }
    if (d.ph !== "hunt" && d.ph !== "return") clearVillains();
    S.phase = d.ph;
    d.orbs.forEach(([g, car, x, y, z], i) => { const o = S.orbs[i]; if (!o) return; o.got = !!g; o.carried = !!car; o.x = x; o.y = y; o.z = z; o.obj.position.set(x, y, z); o.obj.visible = !g && !car; });
  };
  Net.on.vil = (d) => {
    if (S.mode !== "guest") return;
    const seen = new Set();
    for (const [id, ki, x, z, yaw, hp, anim, dead, word] of d) {
      seen.add(id); let v = CB.villains.find((q) => q.id === id);
      if (!v) { v = spawnVillain(KINDS[ki], x, z, { x, z }, word >= 0 ? { id, word, wordEmoji: chap().words[word]?.p } : { id }); if (KINDS[ki] === "boss") S.boss = v; }
      v.net = [x, z, yaw, hp, anim]; if (hp < v.hp || v.hp > hp + 1) { v.hp = hp; v.bar.visible = hp < v.maxHp; }
      if (dead && !v.dead) killVillain(v);
    }
    for (const v of [...CB.villains]) if (!seen.has(v.id) && !v.passive) { if (v.kind === "boss") v.obj.visible = false; else scene.remove(v.obj); scene.remove(v.bar); if (v.tag) scene.remove(v.tag); CB.villains.splice(CB.villains.indexOf(v), 1); }
  };
  Net.on.evt = (d) => {
    if (d.e === "fill") { S.phase = "fill"; UI.fillStory(chap(), onFillDone); }
    else if (d.e === "speak") { UI.hide("fill"); S.phase = "speak"; UI.speakChallenge(chap().speak, onSpeakDone); }
    else if (d.e === "restore") { UI.hide("fill"); UI.hide("speak"); restoreChapter(d.ch); }
    else if (d.e === "dlg") { const c = CHAPTERS[d.ch]; UI.dialogue(c[d.which], c.npc); }
  };
  Net.onClose = () => {
    UI.toast("📴 Your friend disconnected. Playing solo now.", "bad", 4000);
    if (S.mode === "guest") { Save.guest = false; Save.load(); applyRestoreFromSave(true); S.ch = Math.min(Save.d.ch, CHAPTERS.length - 1); S.phase = Save.d.phase; clearOrbs(); clearVillains(); S.mode = "solo"; if (S.phase === "hunt" || S.phase === "return") beginHunt(false); }
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
    if (consume("car") && !S.busy && !active().ko) toggleVehicle();
    if (active().veh && Input.pressed.has("swap")) { Input.pressed.delete("swap"); UI.toast("Get out of the vehicle to swap heroes."); }
    if (active().veh && Input.pressed.has("team")) Input.pressed.delete("team");
    if (consume("swap") && S.mode === "solo" && !S.busy) { S.me = S.me === "bangara" ? "gundamma" : "bangara"; setupControl(); UI.toast(S.me === "bangara" ? "🐰 Playing as Bangara" : "🐼 Playing as Gundamma"); if (S.tut) S.tut.swaps++; }
    if (consume("team") && !S.busy) teamUp(true);
    if (consume("map")) openMap();
    for (const k in S.heroes) updateHero(S.heroes[k], dt);
    for (const v of VS.list) { if (!v.seats[0] && !v.net) v.speed *= Math.max(0, 1 - dt * 3); if (v.obj.visible || v.seats[0]) animateVehicle(v, dt); }
    if (S.cheer > 0) S.cheer -= dt;
    updateCombat(dt, S, heroList());
    for (const o of S.orbs) {
      if (o.got || o.carried) continue;
      o.obj.position.y = o.y + Math.sin(S.t * 2.5 + o.i) * 0.25; o.obj.material.rotation = Math.sin(S.t + o.i) * 0.2;
      for (const k in S.heroes) { const H = S.heroes[k]; if (H.ctrl === "remote" || H.ko) continue; if (Math.hypot(H.pos.x - o.x, H.pos.z - o.z) < 2.0 && Math.abs(H.pos.y + 0.8 - o.y) < 2.4 && S.phase === "hunt") collectOrb(o, H.kind); }
    }
    for (const f of S.fest) {
      f.obj.position.y = f.y + Math.sin(S.t * 2) * 0.3; const H = active();
      if (!f.guarded && S.mode !== "guest" && Math.hypot(H.pos.x - f.x, H.pos.z - f.z) < 110) { f.guarded = true; for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28; spawnVillain(k ? "goon" : Math.random() < 0.3 ? "brute" : "goon", f.x + Math.cos(a) * 9, f.z + Math.sin(a) * 9, { x: f.x, z: f.z }); } }
      if (!S.busy && Math.hypot(H.pos.x - f.x, H.pos.z - f.z) < 2.2 && Math.abs(H.pos.y + 0.8 - f.y) < 2.6) { collectFestival(f); break; }
    }
    if (S.phase === "explore" && !S.busy && S.mode !== "guest") { const c = chap(), H = active(); if (Math.hypot(H.pos.x - c.x, H.pos.z - c.z) < 80) arriveAtChapter(); }
    updateTutorial(dt);
    updateHUD(dt); netTick(dt);
    if (S.waveT !== undefined) { S.waveT += dt; worldUniforms.wave.value.z = S.waveT * 140; worldUniforms.wave.value.w = Math.max(0, 1 - S.waveT / 7); if (S.waveT > 7) { worldUniforms.wave.value.z = -1; S.waveT = undefined; } }
    updateCamera(dt);
    if ((S.saveT = (S.saveT || 0) - dt) <= 0 && S.mode !== "guest") { S.saveT = 5; const H = active(); Save.d.pos = [H.pos.x, H.pos.z, H.yaw]; Save.d.me = S.me; Save.write(); }
  } else titleCam(dt);
  updateRestore(dt); updateFx(dt);
  CHAPTERS.forEach((c, i) => { const b = S.beacons[i]; if (!b) return; const done = Save.d.done.includes(c.id), cur = i === S.ch && !storyDone() && S.playing;
    b.material.uniforms.a.value += ((cur ? 0.9 : done ? 0.18 : 0) - b.material.uniforms.a.value) * Math.min(1, dt * 2);
    b.material.uniforms.col.value.setHex(cur ? 0xffc93c : 0xfff2c0); b.visible = b.material.uniforms.a.value > 0.01; });
  const H = S.playing ? active() : null, did = H ? districtAt(H.pos.x, H.pos.z) : S.titleDid || 0;
  const lv = did ? restore.levels[did] : 0;
  scene.fog.color.lerpColors(new THREE.Color(0xb9bccb), FOG, lv); renderer.setClearColor(scene.fog.color);
  if (W.seaMat) { W.seaMat.uniforms.fogColor.value.copy(scene.fog.color); W.seaMat.uniforms.fogNear.value = scene.fog.near; W.seaMat.uniforms.fogFar.value = scene.fog.far; }
  if (!S.sky) S.sky = scene.children.find((o) => o.material && o.material.uniforms && o.material.uniforms.gloom);
  if (S.sky) { S.sky.material.uniforms.gloom.value = (1 - lv) * 0.7; S.sky.position.copy(camera.position); }
  cull(camera.position, scene.fog.far); cullVehicles(camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
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
  $("tReset").onclick = () => { if (confirm("Start a brand-new story? Your learned words stay in the tiffin.")) { const words = Save.d.words; Save.reset(); Save.d.words = words; Save.write(); try { localStorage.removeItem("maathu-tut"); } catch (e) {} applyRestoreFromSave(true); refreshTitle(); } };
  $("tCoop").onclick = () => { Sound.unlock(); UI.screen("lobby"); $("lbCode").hidden = $("lbWait").hidden = true; $("lbMsg").textContent = ""; };
  $("tTiffin").onclick = () => UI.openTiffin(CHAPTERS, FESTIVAL, Save.d.words);
  $("tSound").onclick = () => { Sound.toggle(); refreshTitle(); };
  $("tHelp").onclick = () => UI.show("help");
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
  $("coachSkip").onclick = () => endTutorial();
  $("mnQuit").onclick = () => { for (const H of heroList()) if (H.veh) exitVehicle(H, false); UI.hide("menu"); S.playing = false; Net.close(); if (Save.guest) { Save.guest = false; Save.load(); applyRestoreFromSave(true); } S.mode = "solo"; clearOrbs(); clearVillains(); UI.hide("hud"); UI.hide("coach"); S.tut = null; UI.screen("title"); refreshTitle(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden && S.playing) { const H = active(); Save.d.pos = [H.pos.x, H.pos.z, H.yaw]; Save.write(); } });
}

window.MAATHU = { S, W, CB, VS, damageVillain, restoreChapter, travelTo, placeHeroesAt, camera, Save, CHAPTERS, groundAt, solidAt, endTutorial };
boot();
if ("serviceWorker" in navigator && location.protocol === "https:" && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) navigator.serviceWorker.register("sw.js").catch(() => {});
