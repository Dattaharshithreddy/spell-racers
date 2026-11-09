// Drivable vehicles: auto-rickshaw, Bullet-style bike, open jeep. Arcade physics, seats for both heroes,
// drive-by shooting for the passenger, run-over damage, co-op sync (the driver's phone owns the vehicle).
import * as THREE from "three";
import { GLTFLoader } from "../vendor/addons/loaders/GLTFLoader.js";
import { heightAt, districtAt, rng, W } from "./world.js";
import { toonify } from "./chars.js";

const V3 = THREE.Vector3;
const SCALE = 1.25;
// seats in vehicle-local (unscaled) coords: [x, feetY, z]; +z is the vehicle's front
export const VT = {
  auto: { name: "Auto-rickshaw", icon: "🛺", max: 30, acc: 15, turn: 1.7, r: 1.35, wheelR: 0.27, seats: [[0, 0.57, 0.4], [0, 0.85, -0.55]], steer: ["wheel_f"], legs: "sit" },
  bike: { name: "Bullet bike", icon: "🏍️", max: 42, acc: 22, turn: 2.3, r: 0.8, wheelR: 0.34, seats: [[0, 0.6, 0.12], [0, 0.6, -0.5]], steer: ["wheel_f"], legs: "straddle" },
  jeep: { name: "Jeep", icon: "🚙", max: 36, acc: 17, turn: 1.45, r: 1.9, wheelR: 0.4, seats: [[-0.4, 1.06, 0.25], [0.4, 1.06, 0.25]], steer: ["wheel_fl", "wheel_fr"], legs: "sit" },
};
export const VS = { list: [], src: {}, ctx: null, scene: null };

export async function loadVehicles(scene, ctx) {
  VS.scene = scene; VS.ctx = ctx;
  const gl = await new GLTFLoader().loadAsync("assets/vehicles.glb");
  for (const c of gl.scene.children) { toonify(c, { outline: 0.02 }); VS.src[c.name.replace("veh_", "")] = c; }
}
function makeVehicle(type, x, z, yaw) {
  const T = VT[type], obj = VS.src[type].clone(true); obj.scale.setScalar(SCALE);
  const wheels = []; obj.traverse((o) => { if (/^wheel/.test(o.name)) wheels.push(o); });
  VS.scene.add(obj);
  const v = { id: VS.list.length, type, T, obj, wheels, pos: new V3(x, 0, z), yaw, speed: 0, steer: 0, vy: 0, pitch: 0, roll: 0, seats: [null, null], net: null, honk: 0 };
  v.pos.y = VS.ctx.groundAt(x, z, 999); place(v);
  VS.list.push(v); return v;
}
/** deterministic parking spots: one auto + one bike at each landmark, more in towns */
export function spawnVehicles(chapters) {
  const r = rng(4242);
  for (const c of chapters) {
    const zz = c.z + c.pad + 16;
    makeVehicle("auto", c.x + 8, zz, Math.PI / 2);
    makeVehicle(r() < 0.5 ? "bike" : "jeep", c.x - 8, zz, -Math.PI / 2);
  }
  const pick = () => { const q = r(); return q < 0.5 ? "auto" : q < 0.82 ? "bike" : "jeep"; };
  for (const t of W.towns) {
    const n = t.r > 100 ? 7 : t.r > 50 ? 3 : 1;
    for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
      const a = r() * 6.28, d = 6 + r() * t.r * 0.8, x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
      if (heightAt(x, z) < 0.8 || districtAt(x, z) === 0 || VS.ctx.blocked(x, z, 2.4)) continue;
      makeVehicle(pick(), x, z, r() * 6.28); k++;
    }
  }
}
function place(v) {
  v.obj.position.copy(v.pos);
  v.obj.rotation.set(0, 0, 0); v.obj.rotateY(v.yaw); v.obj.rotateX(-v.pitch); v.obj.rotateZ(v.roll);
}
export function seatWorld(v, i, out = new V3()) {
  const s = v.T.seats[i]; out.set(s[0], s[1], s[2]).multiplyScalar(SCALE);
  out.applyEuler(v.obj.rotation).add(v.pos); return out;
}
export function nearestFree(pos, maxD = 3.4) {
  let best = null, bd = maxD;
  for (const v of VS.list) { const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z); if (d < bd + v.T.r * 0.5 && (v.seats[0] === null || v.seats[1] === null)) { bd = d; best = v; } }
  return best;
}
export function vehicleBlock(p, r) {
  for (const v of VS.list) {
    const dx = p.x - v.pos.x, dz = p.z - v.pos.z, d = Math.hypot(dx, dz), m = v.T.r + r;
    if (d < m && d > 0.001 && p.y < v.pos.y + 1.6) { p.x = v.pos.x + dx / d * m; p.z = v.pos.z + dz / d * m; }
  }
}

/** drive one frame. input: {throttle -1..1, steer -1..1, honk} — only for vehicles this phone drives */
export function drive(v, input, dt) {
  const T = v.T, ctx = VS.ctx;
  const want = input.throttle;
  if (want > 0.05) v.speed += T.acc * want * dt * (v.speed < 0 ? 2.2 : 1);
  else if (want < -0.05) v.speed += (v.speed > 0.5 ? -T.acc * 2.2 : -T.acc * 0.6) * -want * dt;
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), 6 * dt);
  v.speed = THREE.MathUtils.clamp(v.speed, -T.max * 0.3, T.max);
  v.steer += (input.steer - v.steer) * Math.min(1, dt * 6);
  const grip = THREE.MathUtils.clamp(Math.abs(v.speed) / 7, 0, 1) * (v.speed >= 0 ? 1 : -1);
  v.yaw -= v.steer * T.turn * grip * dt * (1 - Math.min(0.45, Math.abs(v.speed) / T.max * 0.45));
  const prev = v.pos.clone();
  v.pos.x += Math.sin(v.yaw) * v.speed * dt; v.pos.z += Math.cos(v.yaw) * v.speed * dt;
  // collisions with the world
  const p = { x: v.pos.x, z: v.pos.z, y: v.pos.y + 0.3 }; ctx.collide(p, T.r);
  const pushed = Math.hypot(p.x - v.pos.x, p.z - v.pos.z);
  if (pushed > 0.02) { v.pos.x = p.x; v.pos.z = p.z; if (Math.abs(v.speed) > 9) ctx.crash(v); v.speed *= Math.max(0.2, 1 - pushed * 2); }
  if (districtAt(v.pos.x, v.pos.z) === 0 || heightAt(v.pos.x, v.pos.z) < 0.35) { v.pos.x = prev.x; v.pos.z = prev.z; v.speed = -v.speed * 0.25; ctx.edge(v); }
  // ground follow + airtime off ridges
  const g = ctx.groundAt(v.pos.x, v.pos.z, v.pos.y + 0.8);
  v.vy -= 26 * dt; v.pos.y += v.vy * dt;
  if (v.pos.y <= g) { v.pos.y = g; v.vy = 0; } else if (v.pos.y - g < 0.25 && v.vy <= 0) { v.pos.y = g; v.vy = 0; }
  if (v.vy === 0 && Math.abs(v.speed) > 12) { const ahead = heightAt(v.pos.x + Math.sin(v.yaw) * 2, v.pos.z + Math.cos(v.yaw) * 2); if (g - ahead > 1.2) v.vy = Math.abs(v.speed) * 0.18; }
  // tilt to terrain
  const L = 1.2, fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
  const hf = heightAt(v.pos.x + fx * L, v.pos.z + fz * L), hb = heightAt(v.pos.x - fx * L, v.pos.z - fz * L);
  const hr = heightAt(v.pos.x - fz * L * 0.6, v.pos.z + fx * L * 0.6), hl = heightAt(v.pos.x + fz * L * 0.6, v.pos.z - fx * L * 0.6);
  const tp = v.vy !== 0 ? v.pitch : Math.atan2(hf - hb, L * 2), tr = (v.type === "bike" ? -v.steer * 0.35 * Math.min(1, Math.abs(v.speed) / 15) : Math.atan2(hl - hr, L * 1.2));
  v.pitch += (THREE.MathUtils.clamp(tp, -0.6, 0.6) - v.pitch) * Math.min(1, dt * 8); v.roll += (THREE.MathUtils.clamp(tr, -0.5, 0.5) - v.roll) * Math.min(1, dt * 8);
  if (input.honk) ctx.honk(v);
  // run over villains
  if (Math.abs(v.speed) > 8) ctx.runOver(v);
}
export function animateVehicle(v, dt) {
  if (v.net) {
    const n = v.net, k = Math.min(1, dt * 10);
    v.pos.x += (n.p[0] - v.pos.x) * k; v.pos.y += (n.p[1] - v.pos.y) * k; v.pos.z += (n.p[2] - v.pos.z) * k;
    let d = n.y - v.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; v.yaw += d * k;
    v.speed = n.s; v.steer = n.st; v.pitch = n.pt || 0; v.roll = n.rl || 0;
  }
  place(v);
  for (const w of v.wheels) {
    w.rotation.order = "YXZ";
    w.rotation.x += v.speed * dt / (v.T.wheelR * SCALE);
    w.rotation.y = v.T.steer.includes(w.name) ? v.steer * 0.45 : 0;
  }
}
export function cullVehicles(cam) { for (const v of VS.list) v.obj.visible = Math.hypot(v.pos.x - cam.x, v.pos.z - cam.z) < 330; }

// ------------------------------------------------------------ seated pose (legs forward / straddling)
export function initLegs(H) {
  const m = H.h.model; m.updateMatrixWorld(true); H.legs = [];
  for (const n of ["legL", "legR"]) {
    const b = m.getObjectByName(n); if (!b) continue;
    const box = new THREE.Box3(); b.traverse((o) => { if (o.isMesh && !/_ol$/.test(o.name)) box.expandByObject(o); });
    const foot = new V3(); box.getCenter(foot); foot.y = box.min.y;
    const local = b.parent.worldToLocal(foot.clone()).sub(b.position).normalize();
    H.legs.push({ b, rest: b.quaternion.clone(), d0: local, side: n === "legL" ? 1 : -1 });
  }
}
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _d = new V3(), _mq = new THREE.Quaternion();
export function seatPose(H, kind) {
  if (!H.legs) return;
  H.h.model.getWorldQuaternion(_mq);
  for (const L of H.legs) {
    if (kind === "straddle") _d.set(0.35 * L.side, -0.75, 0.55); else _d.set(0.12 * L.side, -0.35, 1);
    _d.normalize().applyQuaternion(_mq);
    L.b.parent.getWorldQuaternion(_q2).invert(); _d.applyQuaternion(_q2).normalize();
    _q.setFromUnitVectors(L.d0, _d); L.b.quaternion.copy(_q).multiply(L.rest);
  }
}
