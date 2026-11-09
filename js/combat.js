// Combat: hero weapons (auto-aim), projectiles, Mute Gang villains, Mouna boss, health pickups.
import * as THREE from "three";
import { GLTFLoader } from "../vendor/addons/loaders/GLTFLoader.js";
import { heightAt } from "./world.js";
import { toonify, play } from "./chars.js";

const V3 = THREE.Vector3;
const loader = new GLTFLoader();
export const C = { scene: null, ctx: null, villains: [], shots: [], pickups: [], goonSrc: null, goonClips: null, weapons: {}, boss: null };

export const WEAPON = {
  bangara: { name: "Akshara Blaster", cd: 0.15, dmg: 12, speed: 58, range: 46, kind: "letter" },
  gundamma: { name: "Tiffin Cannon", cd: 0.8, dmg: 42, speed: 34, range: 40, kind: "lid", aoe: 4.6 },
};
export const HERO_HP = { bangara: 100, gundamma: 160 };
const VK = {
  goon: { hp: 40, speed: 5.6, sight: 34, range: 16, burst: 3, gap: 0.2, cd: [1.4, 2.4], dmg: 7, scale: 1.25, tint: null },
  brute: { hp: 130, speed: 4.2, sight: 28, range: 11, burst: 1, pellets: 5, gap: 0, cd: [1.8, 2.6], dmg: 6, scale: 1.75, tint: 0xff6b6b },
  boss: { hp: 750, speed: 0, sight: 80, range: 60, dmg: 9, scale: 1 },
};

export async function loadCombat(scene, ctx) {
  C.scene = scene; C.ctx = ctx;
  const [g, w] = await Promise.all([loader.loadAsync("assets/goon.glb"), loader.loadAsync("assets/weapons.glb")]);
  C.goonSrc = g.scene; C.goonClips = g.animations;
  toonify(C.goonSrc, { outline: 0.012 });
  for (const c of w.scene.children) { toonify(c, { outline: 0.008 }); C.weapons[c.name] = c; }
}

// ------------------------------------------------------------ hero weapon + aim pose
export function equip(H) {
  const model = H.h.model; model.updateMatrixWorld(true);
  const arm = model.getObjectByName("armR"); if (!arm) return;
  const box = new THREE.Box3();
  arm.traverse((o) => { if (o.isMesh && !/_ol$/.test(o.name)) box.expandByObject(o); });
  const c = box.getCenter(new V3()); const hand = new V3(c.x, box.min.y + 0.07, c.z);
  const gun = C.weapons[H.kind === "bangara" ? "w_blaster" : "w_cannon"].clone(true);
  gun.position.copy(hand); gun.scale.setScalar(1.25 * (H.kind === "bangara" ? 1.5 : 1.35)); gun.updateMatrixWorld(true);
  arm.attach(gun);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, H.kind === "bangara" ? -0.26 : -0.4, 0); gun.add(muzzle);
  const parent = arm.parent; const pPos = arm.position.clone();
  const handLocal = parent.worldToLocal(hand.clone());
  H.aim = { arm, gun, muzzle, rest: arm.quaternion.clone(), d0: handLocal.sub(pPos).normalize(), t: 0, dir: new V3(0, 0, 1) };
  H.hp = H.maxHp = HERO_HP[H.kind]; H.fireCd = 0;
}
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new V3();
export function applyAim(H) {
  const A = H.aim; if (!A || A.t <= 0) return;
  const parent = A.arm.parent; parent.getWorldQuaternion(_q2).invert();
  _v.copy(A.dir).applyQuaternion(_q2).normalize();
  _q.setFromUnitVectors(A.d0, _v);
  A.arm.quaternion.copy(_q).multiply(A.rest);
}

// ------------------------------------------------------------ projectiles
const letterTex = new Map();
function letterTexture(ch) {
  if (letterTex.has(ch)) return letterTex.get(ch);
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(255,240,170,1)"); g.addColorStop(0.5, "rgba(255,190,40,.85)"); g.addColorStop(1, "rgba(255,150,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = "#7D1630"; x.font = "bold 34px 'Baloo 2','Baloo Tamma 2',sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, 32, 35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; letterTex.set(ch, t); return t;
}
const LETTERS = "ಅಆಇಈಉಕಗಮನಬABCDEFGHKMRSWY".split("");
const inkMat = new THREE.MeshBasicMaterial({ color: 0xb98cff });
const inkCore = new THREE.MeshBasicMaterial({ color: 0x2a1450 });
const inkGeo = new THREE.SphereGeometry(0.28, 10, 8), coreGeo = new THREE.SphereGeometry(0.16, 8, 6);
const lidGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16);
const lidMat = new THREE.MeshPhongMaterial({ color: 0xd8dde2, shininess: 90, specular: 0xffffff, emissive: 0x333333 });

/** spawn a projectile. owner: 'me' (deals damage), 'remote' (visual only), 'villain' */
export function shoot(kind, from, dir, owner, dmg, extra = {}) {
  let obj;
  if (kind === "letter") { obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture(LETTERS[(Math.random() * LETTERS.length) | 0]), depthWrite: false, fog: false })); obj.scale.setScalar(0.85); }
  else if (kind === "lid") { obj = new THREE.Mesh(lidGeo, lidMat); }
  else { obj = new THREE.Group(); obj.add(new THREE.Mesh(inkGeo, inkMat)); obj.add(new THREE.Mesh(coreGeo, inkCore)); }
  obj.position.copy(from); C.scene.add(obj);
  const speed = extra.speed || (kind === "letter" ? 58 : kind === "lid" ? 34 : 24);
  const s = { kind, obj, pos: obj.position, vel: dir.clone().normalize().multiplyScalar(speed), owner, dmg, life: (extra.range || 46) / speed, aoe: extra.aoe || 0, by: extra.by };
  if (kind === "lid") s.vel.y += 5;
  C.shots.push(s); return s;
}
function killShot(i) { const s = C.shots[i]; C.scene.remove(s.obj); if (s.obj.material && s.obj.isSprite) s.obj.material.dispose(); C.shots.splice(i, 1); }

// ------------------------------------------------------------ villains
let VID = 0;
export function spawnVillain(kind, x, z, home, opts = {}) {
  const K = VK[kind];
  let obj, mixer = null, actions = {};
  if (kind === "boss") { obj = C.ctx.mouna; obj.visible = true; }
  else {
    obj = C.goonSrc.clone(true); obj.scale.setScalar(K.scale);
    if (K.tint) obj.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshToonMaterial && /mask/.test(o.material.name)) { o.material = o.material.clone(); o.material.color.setHex(K.tint); } });
    mixer = new THREE.AnimationMixer(obj);
    for (const c of C.goonClips) actions[c.name] = mixer.clipAction(c);
    C.scene.add(obj);
  }
  const v = { id: opts.id ?? VID++, kind, K, obj, mixer, actions, cur: null, hp: K.hp, maxHp: K.hp, pos: obj.position, yaw: 0, home: home || { x, z },
    state: "patrol", tx: x, tz: z, aimT: 0, burst: 0, burstT: 0, cd: 1 + Math.random() * 2, hitT: 0, dead: false, deadT: 0, word: opts.word ?? null,
    strafe: Math.random() < 0.5 ? 1 : -1, net: null, summonT: 12, ringT: 3, volleyT: 1.5 };
  obj.position.set(x, heightAt(x, z), z);
  if (kind === "boss") obj.position.y += 9;
  if (opts.word != null) { v.tag = C.ctx.makeTag(opts.wordEmoji || "💬"); C.scene.add(v.tag); }
  v.bar = makeBar(); C.scene.add(v.bar);
  vplay(v, "idle"); C.villains.push(v); return v;
}
function vplay(v, a, fade = 0.15) {
  if (!v.mixer || v.cur === a || !v.actions[a]) return;
  const n = v.actions[a], p = v.cur && v.actions[v.cur]; n.reset();
  if (a === "die" || a === "hit" || a === "shoot") { n.setLoop(THREE.LoopOnce, 1); n.clampWhenFinished = true; }
  n.fadeIn(fade).play(); if (p) p.fadeOut(fade); v.cur = a;
}
function makeBar() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 10;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, fog: false }));
  s.scale.set(1.6, 0.25, 1); s.userData.c = c; s.visible = false; s.renderOrder = 5; return s;
}
function drawBar(v) {
  const c = v.bar.userData.c, x = c.getContext("2d"), k = Math.max(0, v.hp / v.maxHp);
  x.clearRect(0, 0, 64, 10); x.fillStyle = "#1E1B3A"; x.fillRect(0, 0, 64, 10); x.fillStyle = k > 0.5 ? "#7FD07A" : k > 0.25 ? "#F2B705" : "#E5484D"; x.fillRect(2, 2, 60 * k, 6);
  v.bar.material.map.needsUpdate = true;
}
export function damageVillain(v, dmg, fromPos) {
  if (v.dead) return;
  v.hp -= dmg; v.hitT = 0.25; v.bar.visible = true; drawBar(v);
  if (v.state === "patrol") v.state = "chase";
  if (fromPos && v.kind !== "boss") { const dx = v.pos.x - fromPos.x, dz = v.pos.z - fromPos.z, d = Math.hypot(dx, dz) || 1; v.pos.x += dx / d * 0.35; v.pos.z += dz / d * 0.35; }
  if (v.kind !== "boss" && dmg >= 10) vplay(v, "hit", 0.05);
  C.ctx.sfx("hit");
  if (v.hp <= 0) killVillain(v);
}
export function killVillain(v) {
  if (v.dead) return;
  v.dead = true; v.deadT = 0; v.bar.visible = false; vplay(v, "die", 0.05); C.ctx.sfx("down");
  if (v.tag) { C.scene.remove(v.tag); v.tag = null; }
  C.ctx.onVillainDown(v);
}
export function clearVillains() {
  for (const v of C.villains) { if (v.kind === "boss") v.obj.visible = false; else C.scene.remove(v.obj); C.scene.remove(v.bar); if (v.tag) C.scene.remove(v.tag); }
  C.villains = []; for (let i = C.shots.length - 1; i >= 0; i--) killShot(i);
}

// ------------------------------------------------------------ pickups (Mysore Pak heals)
let pakTex = null;
function pak() {
  if (!pakTex) { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
    x.fillStyle = "rgba(255,240,190,.55)"; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill(); x.fillStyle = "#F2B705"; x.strokeStyle = "#8a5a12"; x.lineWidth = 3;
    x.beginPath(); x.roundRect(14, 20, 36, 24, 5); x.fill(); x.stroke(); x.fillStyle = "#c98a14"; for (let i = 0; i < 6; i++) x.fillRect(18 + (i % 3) * 10, 25 + ((i / 3) | 0) * 9, 5, 3);
    pakTex = new THREE.CanvasTexture(c); pakTex.colorSpace = THREE.SRGBColorSpace; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pakTex, depthWrite: false })); s.scale.setScalar(1.2); return s;
}
export function dropPak(x, z) { const s = pak(); const y = C.ctx.groundAt(x, z, 999) + 0.9; s.position.set(x, y, z); C.scene.add(s); C.pickups.push({ obj: s, x, y, z, t: 0 }); }

// ------------------------------------------------------------ hero firing
export function heroFire(H, aimDir, owner = "me") {
  const W = WEAPON[H.kind];
  const from = new V3(); H.aim.muzzle.getWorldPosition(from);
  const dir = aimDir.clone();
  shoot(W.kind, from, dir, owner, W.dmg, { speed: W.speed, range: W.range, aoe: W.aoe, by: H.kind });
  C.ctx.sfx(H.kind === "bangara" ? "zap" : "boom");
  return { from, dir };
}
/** nearest live villain in front of `fwd` from hero */
export function autoTarget(H, fwd, maxD = 44) {
  let best = null, bs = 1e9;
  for (const v of C.villains) {
    if (v.dead) continue;
    const c = vCenter(v), dx = c.x - H.pos.x, dz = c.z - H.pos.z, d = Math.hypot(dx, dz);
    if (d > maxD) continue;
    const dot = (dx * fwd.x + dz * fwd.z) / (d || 1); if (dot < 0.2 && d > 6) continue;
    const s = d * (1.6 - dot); if (s < bs) { bs = s; best = v; }
  }
  return best;
}
export function vCenter(v) { return v.kind === "boss" ? new V3(v.pos.x, v.pos.y + 2.6, v.pos.z) : new V3(v.pos.x, v.pos.y + 0.95 * v.K.scale, v.pos.z); }

// ------------------------------------------------------------ update
const _d = new V3();
export function updateCombat(dt, S, heroes) {
  const ctx = C.ctx, host = S.mode !== "guest";
  // villains
  for (const v of C.villains) {
    if (v.dead) {
      v.deadT += dt; v.mixer && v.mixer.update(dt);
      if (v.deadT > 2.5 && v.obj.visible) { if (v.kind === "boss") { v.obj.scale.multiplyScalar(0.92); if (v.obj.scale.x < 0.05) { v.obj.visible = false; v.obj.scale.setScalar(1); } } else v.obj.visible = false; }
      continue;
    }
    const live = heroes.filter((H) => !H.ko);
    if (host) aiVillain(v, dt, live);
    else if (v.net) { v.pos.x += (v.net[0] - v.pos.x) * Math.min(1, dt * 8); v.pos.z += (v.net[1] - v.pos.z) * Math.min(1, dt * 8); v.pos.y = v.kind === "boss" ? v.pos.y : heightAt(v.pos.x, v.pos.z); v.yaw = v.net[2]; vplay(v, ["idle", "run", "aim"][v.net[4]] || "idle"); }
    v.obj.rotation.y = v.yaw;
    if (v.mixer) v.mixer.update(dt);
    const top = v.kind === "boss" ? 5.4 : 2.0 * v.K.scale;
    v.bar.position.set(v.pos.x, v.pos.y + top, v.pos.z);
    if (v.tag) { v.tag.position.set(v.pos.x, v.pos.y + top + 0.9 + Math.sin(S.t * 3) * 0.15, v.pos.z); }
  }
  // projectiles
  for (let i = C.shots.length - 1; i >= 0; i--) {
    const s = C.shots[i];
    s.life -= dt; if (s.kind === "lid") { s.vel.y -= 14 * dt; s.obj.rotation.x += dt * 14; s.obj.rotation.z += dt * 9; }
    s.pos.addScaledVector(s.vel, dt);
    let hit = s.life <= 0 || s.pos.y < heightAt(s.pos.x, s.pos.z) + 0.05 || ctx.solidAt(s.pos.x, s.pos.y, s.pos.z);
    if (!hit && s.owner !== "villain") {
      for (const v of C.villains) {
        if (v.dead) continue; const c = vCenter(v), r = v.kind === "boss" ? 2.3 : 0.75 * v.K.scale;
        if (c.distanceTo(s.pos) < r) { hit = true; if (s.owner === "me" && !s.aoe) ctx.hitVillain(v, s.dmg, s.pos); break; }
      }
    }
    if (!hit && s.owner === "villain") {
      for (const H of heroes) { if (H.ctrl === "remote" || H.ko) continue; _d.set(H.pos.x, H.pos.y + 0.8, H.pos.z); if (_d.distanceTo(s.pos) < 0.75) { hit = true; ctx.heroHit(H, s.dmg); break; } }
    }
    if (hit) {
      if (s.aoe) { ctx.boom(s.pos, s.aoe); if (s.owner === "me") for (const v of C.villains) if (!v.dead && vCenter(v).distanceTo(s.pos) < s.aoe + (v.kind === "boss" ? 2 : 0.5)) ctx.hitVillain(v, s.dmg, s.pos); }
      else ctx.spark(s.pos, s.owner === "villain" ? 0xb98cff : 0xffd45c);
      killShot(i);
    }
  }
  // pickups
  for (let i = C.pickups.length - 1; i >= 0; i--) {
    const p = C.pickups[i]; p.t += dt; p.obj.position.y = p.y + Math.sin(p.t * 3) * 0.2;
    for (const H of heroes) if (H.ctrl !== "remote" && !H.ko && Math.hypot(H.pos.x - p.x, H.pos.z - p.z) < 1.6 && H.hp < H.maxHp) {
      H.hp = Math.min(H.maxHp, H.hp + 35); ctx.healed(H); C.scene.remove(p.obj); C.pickups.splice(i, 1); break;
    }
    if (p.t > 40 && C.pickups[i] === p) { C.scene.remove(p.obj); C.pickups.splice(i, 1); }
  }
}
function aiVillain(v, dt, heroes) {
  const K = v.K, p = v.pos, ctx = C.ctx;
  v.hitT = Math.max(0, v.hitT - dt); v.cd -= dt;
  let tgt = null, best = K.sight;
  for (const H of heroes) { const d = Math.hypot(H.pos.x - p.x, H.pos.z - p.z); if (d < best) { best = d; tgt = H; } }
  if (v.kind === "boss") return aiBoss(v, dt, heroes, tgt);
  if (tgt) v.state = best > K.range ? "chase" : "aim"; else if (v.state !== "patrol" && (!tgt)) v.state = "patrol";
  let mx = 0, mz = 0, sp = 0;
  if (v.state === "patrol") {
    if (Math.hypot(v.tx - p.x, v.tz - p.z) < 2 || Math.random() < dt * 0.08) { const a = Math.random() * 6.28, d = 10 + Math.random() * 45; v.tx = v.home.x + Math.cos(a) * d; v.tz = v.home.z + Math.sin(a) * d; }
    const dx = v.tx - p.x, dz = v.tz - p.z, d = Math.hypot(dx, dz) || 1; mx = dx / d; mz = dz / d; sp = K.speed * 0.45;
  } else if (v.state === "chase") {
    const dx = tgt.pos.x - p.x, dz = tgt.pos.z - p.z, d = Math.hypot(dx, dz) || 1; mx = dx / d; mz = dz / d; sp = K.speed;
  } else {
    const dx = tgt.pos.x - p.x, dz = tgt.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
    mx = -dz / d * v.strafe; mz = dx / d * v.strafe; sp = K.speed * 0.28; if (Math.random() < dt * 0.3) v.strafe *= -1;
    if (d < 5) { mx -= dx / d; mz -= dz / d; sp = K.speed * 0.6; }
    v.yaw = Math.atan2(dx, dz);
    if (v.cd <= 0 && v.hitT <= 0) { v.burst = K.burst; v.burstT = 0; v.cd = K.cd[0] + Math.random() * (K.cd[1] - K.cd[0]); }
    if (v.burst > 0) {
      v.burstT -= dt;
      if (v.burstT <= 0) {
        v.burst--; v.burstT = K.gap; vplay(v, "shoot", 0.05); if (v.actions.shoot) v.actions.shoot.reset().play();
        const from = new V3(p.x + Math.sin(v.yaw) * 0.6 * K.scale - Math.cos(v.yaw) * 0.25 * K.scale, p.y + 1.15 * K.scale, p.z + Math.cos(v.yaw) * 0.6 * K.scale + Math.sin(v.yaw) * 0.25 * K.scale);
        const aim = new V3(tgt.pos.x + tgt.vel.x * 0.25, tgt.pos.y + 0.8, tgt.pos.z + tgt.vel.z * 0.25).sub(from).normalize();
        const n = K.pellets || 1;
        for (let k = 0; k < n; k++) {
          const sp2 = n > 1 ? 0.16 : 0.06, d2 = aim.clone().add(new V3((Math.random() - 0.5) * sp2, (Math.random() - 0.5) * sp2 * 0.5, (Math.random() - 0.5) * sp2)).normalize();
          shoot("ink", from, d2, "villain", K.dmg); ctx.netShot(from, d2);
        }
        ctx.sfx("pew");
      }
    }
  }
  if (v.hitT > 0) sp *= 0.2;
  if (sp > 0) {
    const nx = p.x + mx * sp * dt, nz = p.z + mz * sp * dt;
    const t = { x: nx, z: nz, y: p.y }; ctx.collide(t, 0.45 * K.scale);
    if (heightAt(t.x, t.z) > 0.3 && ctx.inState(t.x, t.z)) { p.x = t.x; p.z = t.z; }
    if (v.state !== "aim") v.yaw += angD(v.yaw, Math.atan2(mx, mz)) * Math.min(1, dt * 8);
  }
  p.y = ctx.groundAt(p.x, p.z, p.y + 0.5);
  if (v.hitT <= 0 && !(v.cur === "shoot" && v.burst > 0)) vplay(v, v.state === "aim" ? "aim" : sp > 1 ? "run" : "idle");
  v.anim = v.state === "aim" ? 2 : sp > 1 ? 1 : 0;
}
function aiBoss(v, dt, heroes, tgt) {
  const ctx = C.ctx, h = v.home, t = performance.now() / 1000;
  v.pos.set(h.x + Math.sin(t * 0.35) * 22, ctx.groundAt(h.x, h.z, 999) + 7 + Math.sin(t * 1.3) * 1.5, h.z + Math.cos(t * 0.35) * 22);
  if (tgt) v.yaw = Math.atan2(tgt.pos.x - v.pos.x, tgt.pos.z - v.pos.z);
  if (!tgt) return;
  const enraged = v.hp < v.maxHp * 0.4;
  v.ringT -= dt; v.volleyT -= dt; v.summonT -= dt;
  const c = vCenter(v);
  if (v.ringT <= 0) {
    v.ringT = enraged ? 2.2 : 3.4; const n = enraged ? 18 : 12;
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + t; const d = new V3(Math.cos(a), -0.18, Math.sin(a)); shoot("ink", c, d, "villain", 8, { speed: 16, range: 60 }); ctx.netShot(c, d, 16); }
    ctx.sfx("pew"); ctx.taunt();
  }
  if (v.volleyT <= 0) {
    v.volleyT = enraged ? 0.9 : 1.5;
    const aim = new V3(tgt.pos.x, tgt.pos.y + 0.8, tgt.pos.z).sub(c).normalize();
    for (const o of [-0.08, 0, 0.08]) { const d = aim.clone().applyAxisAngle(new V3(0, 1, 0), o); shoot("ink", c, d, "villain", 9, { speed: 26, range: 70 }); ctx.netShot(c, d, 26); }
  }
  if (v.summonT <= 0) { v.summonT = 16; ctx.summon(v); }
}
const angD = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
