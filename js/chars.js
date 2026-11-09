// Characters + props: GLB loading, toon shading with ink outlines, animation control.
import * as THREE from "three";
import { GLTFLoader } from "../vendor/addons/loaders/GLTFLoader.js";
import { patchRestore } from "./world.js";

const loader = new GLTFLoader();
let GRAD = null;
export function gradientMap() {
  if (GRAD) return GRAD;
  const d = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  GRAD = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;
  return GRAD;
}
const OUTLINE = new Map();
function outlineMat(th, color = 0x22141a) {
  const key = th + ":" + color; if (OUTLINE.has(key)) return OUTLINE.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\ntransformed += normalize(normal) * ${th.toFixed(4)};`); };
  m.customProgramCacheKey = () => "ol" + key;
  OUTLINE.set(key, m); return m;
}
const SKIP_OUTLINE = /glint|pupil|iris|mouth|bindi|jas|leaf|glow|fall|water/;

/** Convert glTF PBR materials to stylised toon; add inverted-hull outlines. */
export function toonify(root, { outline = 0.011, did = null, outlineColor } = {}) {
  const cache = new Map(); const meshes = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const src = o.material; const name = (src.name || "").toLowerCase();
    let m = cache.get(src);
    if (!m) {
      const hasVC = !!o.geometry.attributes.color;
      const metal = (src.metalness || 0) > 0.5;
      const emissive = src.emissive && src.emissive.getHex() !== 0 && (src.emissiveIntensity || 1) > 0;
      if (emissive && /glint/.test(name)) m = new THREE.MeshBasicMaterial({ color: 0xffffff });
      else if (metal) m = new THREE.MeshPhongMaterial({ vertexColors: hasVC, color: hasVC ? 0xffffff : src.color, shininess: 90, specular: 0xbbbbbb, emissive: hasVC ? 0x222222 : src.color.clone().multiplyScalar(0.25) });
      else m = new THREE.MeshToonMaterial({ vertexColors: hasVC, color: hasVC ? 0xffffff : src.color, gradientMap: gradientMap(),
        emissive: emissive ? src.emissive : 0x000000, emissiveIntensity: emissive ? Math.min(2, src.emissiveIntensity || 1) : 1 });
      m.name = src.name;
      if (/fall|water/.test(name)) { m.transparent = true; m.opacity = /fall/.test(name) ? 0.85 : 0.9; }
      if (did !== null) patchRestore(m);
      cache.set(src, m);
    }
    o.material = m;
    if (did !== null) {
      const n = o.geometry.attributes.position.count;
      o.geometry.setAttribute("aDid", new THREE.BufferAttribute(new Float32Array(n).fill(did), 1));
    }
    if (outline && !SKIP_OUTLINE.test(name)) {
      const ol = new THREE.Mesh(o.geometry, outlineMat(outline, outlineColor)); ol.name = o.name + "_ol"; ol.raycast = () => {};
      o.add(ol);
    }
    o.frustumCulled = did !== null;
  }
  return root;
}

// ------------------------------------------------------------ heroes
export const HERO = {
  bangara: { file: "assets/bangara.glb", speed: 11, jump: 10, air: 2, scale: 1.25, color: "#E89A1C", name: "Bangara", kn: "ಬಂಗಾರ", special: "dash" },
  gundamma: { file: "assets/gundamma.glb", speed: 9.5, jump: 8.5, air: 1, scale: 1.25, color: "#2E2A2A", name: "Gundamma", kn: "ಗುಂಡಮ್ಮ", special: "pound" },
};
export async function loadHero(kind) {
  const gl = await loader.loadAsync(HERO[kind].file);
  const root = gl.scene; root.scale.setScalar(HERO[kind].scale);
  toonify(root, { outline: 0.011 });
  const holder = new THREE.Group(); holder.add(root); holder.name = kind;
  // soft blob shadow
  const sh = new THREE.Mesh(new THREE.CircleGeometry(kind === "gundamma" ? 0.55 : 0.4, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
  sh.renderOrder = 1; holder.userData.shadow = sh;
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of gl.animations) actions[clip.name] = mixer.clipAction(clip);
  return { kind, holder, model: root, mixer, actions, cur: null, ...HERO[kind] };
}
const ONCE = new Set(["pound", "throw"]);
export function play(h, name, fade = 0.18) {
  if (!h.actions[name] || h.cur === name) return;
  const next = h.actions[name], prev = h.cur && h.actions[h.cur];
  next.reset();
  if (ONCE.has(name)) { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
  next.setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
  if (prev) prev.fadeOut(fade);
  h.cur = name;
}

// ------------------------------------------------------------ props (landmarks + NPCs)
export async function loadProps() {
  const gl = await loader.loadAsync("assets/props.glb");
  const out = {};
  for (const c of [...gl.scene.children]) out[c.name] = c;
  return out;
}
export function placeProp(src, did, outline = 0.06) {
  const o = src.clone(true);
  o.traverse((m) => { if (m.isMesh) m.geometry = m.geometry.clone(); });
  toonify(o, { outline, did });
  return o;
}
