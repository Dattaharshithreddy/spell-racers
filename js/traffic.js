// Live traffic: autos, bikes, cars, KSRTC buses and jeeps driving on highways and town streets (keep LEFT, like India).
// They brake and honk for anything in front, knock heroes back, and can be carjacked.
import * as THREE from "three";
import { VS, VT, animateVehicle } from "./vehicles.js";
import { W, heightAt, districtAt } from "./world.js";

const V3 = THREE.Vector3;
export const TR = { paths: [], buckets: new Map(), cars: [], pool: {}, ctx: null, scene: null, max: 16, spawnT: 0 };
const B = 120;
// half width / half length (world units, already scaled) used for lane-aware braking
const DIM = { auto: [0.85, 1.9], bike: [0.45, 1.3], bus: [1.6, 5.8], car: [1.1, 2.35], jeep: [1.15, 2.35] };
const ext = (type, relYaw) => { const [hw, hl] = DIM[type] || [1, 2]; return Math.abs(Math.sin(relYaw)) * hl + Math.abs(Math.cos(relYaw)) * hw; };

export function initTraffic(scene, ctx) {
  TR.scene = scene; TR.ctx = ctx;
  const push = (P, kind, w) => {
    if (P.length < 3) return;
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    if (cum[cum.length - 1] < 40) return;
    const id = TR.paths.length; TR.paths.push({ P, cum, len: cum[cum.length - 1], kind, lane: kind === "hw" ? w / 4 : 1.8 });
    for (let i = 0; i < P.length; i += 3) { const k = `${Math.floor(P[i][0] / B)},${Math.floor(P[i][1] / B)}`; if (!TR.buckets.has(k)) TR.buckets.set(k, []); TR.buckets.get(k).push([id, i]); }
  };
  // split a road wherever it runs into water, the border, a landmark or a building, so cars never drive through things
  const ok = (x, z) => heightAt(x, z) >= 0.6 && districtAt(x, z) > 0 && !(ctx.blocked && ctx.blocked(x, z, 1.4));
  const add = (pts, kind, w) => {
    if (!pts || pts.length < 2) return;
    let run = [];
    for (const p of densify(pts, 6)) { if (ok(p[0], p[1])) run.push(p); else { push(run, kind, w); run = []; } }
    push(run, kind, w);
  };
  for (const r of W.meta.roads) add(r.pts.map((p) => [p[0], p[1]]), "hw", r.w || 7.4);
  for (const s of W.streets || []) add(s, "st", 7.2);
}
function densify(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
    for (let k = 0; k < n; k++) out.push([x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n]);
  }
  out.push(pts[pts.length - 1]); return out;
}
function at(path, s) {
  const { P, cum } = path; s = Math.max(0, Math.min(path.len - 0.01, s));
  let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const t = (s - cum[lo]) / Math.max(0.001, cum[hi] - cum[lo]);
  return [P[lo][0] + (P[hi][0] - P[lo][0]) * t, P[lo][1] + (P[hi][1] - P[lo][1]) * t, Math.atan2(P[hi][0] - P[lo][0], P[hi][1] - P[lo][1])];
}
const HW = [["auto", 30], ["bike", 22], ["car", 22], ["bus", 14], ["jeep", 12]], ST = [["auto", 45], ["bike", 30], ["car", 25]];
function pickType(kind) { const L = kind === "hw" ? HW : ST, tot = L.reduce((a, b) => a + b[1], 0); let r = Math.random() * tot; for (const [t, w] of L) { if ((r -= w) <= 0) return t; } return "auto"; }
function obtain(type) {
  const pool = TR.pool[type] || (TR.pool[type] = []);
  if (pool.length) { const o = pool.pop(); o.visible = true; return o; }
  const o = VS.src[type].clone(true); o.scale.setScalar(1.25); TR.scene.add(o); return o;
}
function spawn(focus) {
  // a random path point in a ring 70–260 units from the player
  const cx = Math.floor(focus.x / B), cz = Math.floor(focus.z / B), cands = [];
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const b = TR.buckets.get(`${cx + i},${cz + j}`); if (b) cands.push(...b); }
  if (!cands.length) return;
  for (let tries = 0; tries < 8; tries++) {
    const [pid, idx] = cands[(Math.random() * cands.length) | 0], path = TR.paths[pid], p = path.P[idx];
    const d = Math.hypot(p[0] - focus.x, p[1] - focus.z); if (d < 70 || d > 260) continue;
    if (heightAt(p[0], p[1]) < 0.6) continue;
    if (TR.cars.some((c) => Math.hypot(c.pos.x - p[0], c.pos.z - p[1]) < 16) || VS.list.some((v) => Math.hypot(v.pos.x - p[0], v.pos.z - p[1]) < 10)) continue;
    const type = pickType(path.kind), T = VT[type], obj = obtain(type);
    const wheels = []; obj.traverse((o) => { if (/^wheel/.test(o.name)) wheels.push(o); });
    const dir = Math.random() < 0.5 ? 1 : -1;
    const car = { type, T, obj, wheels, path, s: path.cum[idx], dir, pos: new V3(p[0], 0, p[1]), yaw: 0, speed: 0, steer: 0, pitch: 0, roll: 0, net: null,
      cruise: (path.kind === "hw" ? 17 : 10) * (type === "bus" ? 0.8 : type === "bike" ? 1.15 : 1) * (0.85 + Math.random() * 0.3), wait: 0, honk: 0 };
    place(car, 0, true); TR.cars.push(car); return;
  }
}
function place(c, dt, snap) {
  const [x, z, a] = at(c.path, c.s), yaw = c.dir > 0 ? a : a + Math.PI;
  const lane = c.path.lane;                                     // keep left
  const tx = x + Math.cos(yaw) * lane, tz = z - Math.sin(yaw) * lane;
  if (snap) { c.pos.set(tx, 0, tz); c.yaw = yaw; }
  else { c.pos.x += (tx - c.pos.x) * Math.min(1, dt * 8); c.pos.z += (tz - c.pos.z) * Math.min(1, dt * 8); let d = yaw - c.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; c.steer = THREE.MathUtils.clamp(-d * 3, -1, 1); c.yaw += d * Math.min(1, dt * 5); }
  c.pos.y = TR.ctx.groundAt(c.pos.x, c.pos.z, heightAt(c.pos.x, c.pos.z) + 1.2);
}
function release(i) { const c = TR.cars[i]; c.obj.visible = false; (TR.pool[c.type] || (TR.pool[c.type] = [])).push(c.obj); TR.cars.splice(i, 1); }

export function updateTraffic(dt, focus, heroes) {
  if (!TR.paths.length) return;
  for (let i = TR.cars.length - 1; i >= 0; i--) if (Math.hypot(TR.cars[i].pos.x - focus.x, TR.cars[i].pos.z - focus.z) > 330) release(i);
  TR.spawnT -= dt; if (TR.cars.length < TR.max && TR.spawnT <= 0) { TR.spawnT = 0.35; spawn(focus); }
  for (const c of TR.cars) {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    // anything in my lane ahead?
    let block = false, blockHero = null;
    const myW = DIM[c.type][0], myL = DIM[c.type][1];
    // something in MY lane ahead? (lateral overlap test, so oncoming traffic in the other lane doesn't stop us)
    const check = (x, z, halfW, halfL = halfW) => {
      const dx = x - c.pos.x, dz = z - c.pos.z, along = dx * fx + dz * fz;
      if (along <= 0 || along > myL + halfL + 5.5) return false;
      return Math.abs(dx * fz - dz * fx) < myW + halfW + 0.35;
    };
    for (const H of heroes) if (!H.veh && check(H.pos.x, H.pos.z, 0.5)) { block = true; blockHero = H; }
    for (const v of VS.list) if (check(v.pos.x, v.pos.z, ext(v.type, v.yaw - c.yaw), ext(v.type, v.yaw - c.yaw + Math.PI / 2))) block = true;
    for (const o of TR.cars) if (o !== c && check(o.pos.x, o.pos.z, ext(o.type, o.yaw - c.yaw), ext(o.type, o.yaw - c.yaw + Math.PI / 2))) block = true;
    if (c.wait > 0) { c.wait -= dt; block = true; }
    // jammed for too long (parked car, crossing traffic)? turn around
    c.jam = block && c.wait <= 0 ? (c.jam || 0) + dt : 0;
    if (c.jam > 5) { c.dir *= -1; c.jam = 0; c.wait = 0.8; }
    const target = block ? 0 : c.cruise;
    c.speed += THREE.MathUtils.clamp(target - c.speed, -30 * dt, 8 * dt);
    if (blockHero && TR.ctx.colourAt(c.pos) && performance.now() / 1000 - c.honk > 2.5) { c.honk = performance.now() / 1000; TR.ctx.honk(c); }
    c.s += c.speed * dt * c.dir;
    if (c.s <= 0 || c.s >= c.path.len) { c.dir *= -1; c.s = THREE.MathUtils.clamp(c.s, 0.01, c.path.len - 0.01); c.wait = 1.2; }
    place(c, dt, false);
    // knock heroes on foot out of the way
    if (c.speed > 4) for (const H of heroes) {
      if (H.veh || H.ctrl === "remote" || H.ko) continue;
      const dx = H.pos.x - c.pos.x, dz = H.pos.z - c.pos.z, d = Math.hypot(dx, dz);
      if (d < c.T.r + 0.45 && H.pos.y < c.pos.y + 2) { TR.ctx.bumpHero(H, dx / (d || 1), dz / (d || 1), c); c.speed = 0; c.wait = 1.5; }
    }
    // the player's vehicle crashing into traffic
    for (const v of VS.list) {
      if (!v.seats[0]) continue;
      const dx = v.pos.x - c.pos.x, dz = v.pos.z - c.pos.z, d = Math.hypot(dx, dz), m = v.T.r + c.T.r;
      if (d < m && d > 0.01) { v.pos.x = c.pos.x + dx / d * m; v.pos.z = c.pos.z + dz / d * m; if (Math.abs(v.speed) > 6) TR.ctx.crash(v); v.speed *= -0.3; c.speed = 0; c.wait = 2; }
    }
    // tilt to terrain
    const L = 1.2, hf = heightAt(c.pos.x + fx * L, c.pos.z + fz * L), hb = heightAt(c.pos.x - fx * L, c.pos.z - fz * L);
    c.pitch += (THREE.MathUtils.clamp(Math.atan2(hf - hb, L * 2), -0.5, 0.5) - c.pitch) * Math.min(1, dt * 6);
    c.pos.y = Math.max(c.pos.y, (hf + hb) / 2);
    c.roll = c.type === "bike" ? -c.steer * 0.25 : 0;
    animateVehicle(c, dt);
  }
}
/** heroes/vehicles bump into traffic */
export function trafficBlock(p, r) {
  for (const c of TR.cars) { const dx = p.x - c.pos.x, dz = p.z - c.pos.z, d = Math.hypot(dx, dz), m = c.T.r + r; if (d < m && d > 0.001 && p.y < c.pos.y + 2) { p.x = c.pos.x + dx / d * m; p.z = c.pos.z + dz / d * m; } }
}
export function nearestTraffic(pos, maxD = 3.6) {
  let best = null, bd = 1e9;
  for (const c of TR.cars) { const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z) - c.T.r * 0.5; if (d < maxD && d < bd) { bd = d; best = c; } }
  return best;
}
/** carjack: take this traffic vehicle out of the traffic system (caller makes it a drivable vehicle) */
export function takeTraffic(c) { const i = TR.cars.indexOf(c); if (i >= 0) release(i); }
