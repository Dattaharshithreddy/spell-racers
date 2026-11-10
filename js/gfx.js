// Graphics quality: real-time sun shadows that follow the player, tone mapping, quality presets.
import * as THREE from "three";

const KEY = "maathu-gfx";
export const GFX = {
  q: "medium", renderer: null, sun: null, scene: null,
  presets: {
    low: { shadow: 0, ratio: 1, far: 420 },
    medium: { shadow: 1024, ratio: 1.25, far: 560 },
    high: { shadow: 2048, ratio: 1.75, far: 700 },
  },
};
function guess() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (mem <= 2 || cores <= 4) return "low";
  if (mem >= 8 && cores >= 8 && !/Android|iPhone/i.test(navigator.userAgent)) return "high";
  return "medium";
}
export function initGfx(renderer, scene, sun) {
  GFX.renderer = renderer; GFX.scene = scene; GFX.sun = sun;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = true;
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 900;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun.target);
  let q = null; try { q = localStorage.getItem(KEY); } catch (e) {}
  setQuality(GFX.presets[q] ? q : guess());
}
export function setQuality(q) {
  GFX.q = q; const P = GFX.presets[q]; try { localStorage.setItem(KEY, q); } catch (e) {}
  GFX.renderer.setPixelRatio(Math.min(devicePixelRatio, P.ratio));
  const sun = GFX.sun; sun.castShadow = P.shadow > 0;
  if (P.shadow) { sun.shadow.mapSize.set(P.shadow, P.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  GFX.renderer.shadowMap.needsUpdate = true;
  if (GFX.scene.fog) GFX.scene.fog.far = P.far;
  window.dispatchEvent(new Event("resize"));
}
const SKIPCAST = /^(terrain|roads|rivers|sky|sea|shadow|beam)|_ol$/;
/** decide which meshes cast/receive shadows (call after building the world and on new model sources) */
export function shadowFlags(root, { cast = true, receive = true } = {}) {
  root.traverse((o) => {
    if (!(o.isMesh || o.isInstancedMesh) || o.isSprite) return;
    const mat = o.material, basic = mat && (mat.isMeshBasicMaterial || mat.isShaderMaterial);
    o.receiveShadow = receive && !basic;
    let p = o, skip = false; while (p) { if (SKIPCAST.test(p.name || "")) { skip = true; break; } p = p.parent; }
    o.castShadow = cast && !skip && !basic && !(mat && mat.transparent);
  });
}
const _snap = new THREE.Vector3();
/** keep the shadow box centred on the player, snapped to texels so shadows don't shimmer */
export function followSun(focus, dir) {
  const sun = GFX.sun; if (!sun.castShadow) return;
  const P = GFX.presets[GFX.q], texel = 140 / P.shadow;
  _snap.set(Math.round(focus.x / texel) * texel, Math.round(focus.y / texel) * texel, Math.round(focus.z / texel) * texel);
  sun.target.position.copy(_snap); sun.position.copy(_snap).addScaledVector(dir, 400);
  sun.target.updateMatrixWorld();
}
