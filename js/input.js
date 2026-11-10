// Touch joystick + buttons + camera drag + keyboard.
export const Input = {
  move: { x: 0, y: 0 },        // joystick (-1..1), y = forward
  look: { dx: 0, dy: 0 },      // accumulated camera drag
  pressed: new Set(),          // one-shot actions this frame: jump, special, team, swap, talk
  held: new Set(),
  enabled: true,
};
const keys = new Set();
export function initInput(root) {
  const joy = document.getElementById("joy"), knob = document.getElementById("joyKnob");
  let jid = null, jx = 0, jy = 0, R = 52;
  const jstart = (e) => {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    jid = t.identifier ?? "m"; const r = joy.getBoundingClientRect();
    jx = r.left + r.width / 2; jy = r.top + r.height / 2; jmove(e); e.preventDefault();
  };
  const jmove = (e) => {
    if (jid === null) return;
    const ts = e.changedTouches ? [...e.changedTouches] : [e];
    for (const t of ts) {
      if ((t.identifier ?? "m") !== jid) continue;
      let dx = t.clientX - jx, dy = t.clientY - jy; const l = Math.hypot(dx, dy);
      if (l > R) { dx *= R / l; dy *= R / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      Input.move.x = dx / R; Input.move.y = -dy / R;
    }
    e.preventDefault();
  };
  const jend = (e) => {
    const ts = e.changedTouches ? [...e.changedTouches] : [e];
    if (ts.some((t) => (t.identifier ?? "m") === jid)) { jid = null; Input.move.x = Input.move.y = 0; knob.style.transform = ""; }
  };
  joy.addEventListener("touchstart", jstart, { passive: false });
  joy.addEventListener("mousedown", jstart);
  window.addEventListener("touchmove", jmove, { passive: false });
  window.addEventListener("mousemove", (e) => { if (jid === "m") jmove(e); });
  window.addEventListener("touchend", jend); window.addEventListener("touchcancel", jend);
  window.addEventListener("mouseup", (e) => { if (jid === "m") jend(e); });

  // camera drag anywhere on the canvas that isn't a control
  const cv = root; let lid = null, lx = 0, ly = 0;
  cv.addEventListener("touchstart", (e) => {
    for (const t of e.changedTouches) if (lid === null && t.clientX > innerWidth * 0.38) { lid = t.identifier; lx = t.clientX; ly = t.clientY; }
  }, { passive: true });
  cv.addEventListener("touchmove", (e) => {
    for (const t of e.changedTouches) if (t.identifier === lid) { Input.look.dx += t.clientX - lx; Input.look.dy += t.clientY - ly; lx = t.clientX; ly = t.clientY; }
  }, { passive: true });
  cv.addEventListener("touchend", (e) => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; });
  let mdown = false;
  cv.addEventListener("mousedown", (e) => { mdown = true; lx = e.clientX; ly = e.clientY; });
  window.addEventListener("mouseup", () => (mdown = false));
  window.addEventListener("mousemove", (e) => { if (mdown && jid === null) { Input.look.dx += e.clientX - lx; Input.look.dy += e.clientY - ly; lx = e.clientX; ly = e.clientY; } });

  for (const b of document.querySelectorAll("[data-act]")) {
    const act = b.dataset.act;
    const down = (e) => { e.preventDefault(); e.stopPropagation(); Input.pressed.add(act); Input.held.add(act); b.classList.add("down"); };
    const up = (e) => { Input.held.delete(act); b.classList.remove("down"); };
    b.addEventListener("touchstart", down, { passive: false }); b.addEventListener("mousedown", down);
    b.addEventListener("touchend", up); b.addEventListener("mouseup", up); b.addEventListener("mouseleave", up);
  }
  const KM = { " ": "jump", Shift: "special", q: "team", Q: "team", e: "talk", E: "talk", Tab: "swap", m: "map", M: "map", f: "fire", F: "fire", j: "fire", J: "fire", v: "car", V: "car", g: "car", G: "car", r: "word", R: "word" };
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    keys.add(e.key.toLowerCase()); const a = KM[e.key]; if (a) { Input.pressed.add(a); Input.held.add(a); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => { keys.delete(e.key.toLowerCase()); const a = KM[e.key]; if (a) Input.held.delete(a); });
}
let kbMoved = false;
export function pollKeys() {
  let x = 0, y = 0;
  if (keys.has("w") || keys.has("arrowup")) y += 1;
  if (keys.has("s") || keys.has("arrowdown")) y -= 1;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1;
  if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (x || y) { const l = Math.hypot(x, y); Input.move.x = x / l; Input.move.y = y / l; kbMoved = true; }
  else if (kbMoved) { Input.move.x = Input.move.y = 0; kbMoved = false; }
}
export function consume(a) { if (Input.pressed.has(a)) { Input.pressed.delete(a); return true; } return false; }
