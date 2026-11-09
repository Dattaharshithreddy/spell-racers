// Two-phone co-op over PeerJS (WebRTC). Host owns the world state; each phone drives its own hero.
export const Net = {
  role: null, code: null, peer: null, conn: null, open: false,
  on: {}, // type -> handler(data)
  onOpen: null, onClose: null, onError: null,
  send(type, data = {}) { if (this.conn && this.open) try { this.conn.send(JSON.stringify({ t: type, d: data })); } catch (e) {} },
  close() { try { this.conn && this.conn.close(); this.peer && this.peer.destroy(); } catch (e) {} this.open = false; this.role = null; },
};
const L = "ABCDEFGHJKMNPQRSTUVWXYZ";
const OPTS = () => window.MAATHU_PEER || undefined;   // tests can point at a local PeerServer
function wire(c) {
  Net.conn = c;
  c.on("open", () => { Net.open = true; Net.onOpen && Net.onOpen(); });
  c.on("data", (raw) => { let m; try { m = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; } const h = Net.on[m.t]; h && h(m.d || {}); });
  c.on("close", () => { Net.open = false; Net.onClose && Net.onClose(); });
  c.on("error", (e) => Net.onError && Net.onError(e));
}
export function hostRoom() {
  return new Promise((resolve, reject) => {
    if (!window.Peer) return reject(new Error("PeerJS missing"));
    const code = Array.from({ length: 4 }, () => L[(Math.random() * L.length) | 0]).join("");
    const p = new window.Peer("maathu-" + code, OPTS());
    Net.peer = p; Net.role = "host"; Net.code = code;
    p.on("open", () => resolve(code));
    p.on("connection", (c) => { if (Net.conn) { c.close(); return; } wire(c); });
    p.on("call", onCall);
    p.on("error", (e) => { Net.onError && Net.onError(e); reject(e); });
  });
}
export function joinRoom(code) {
  return new Promise((resolve, reject) => {
    if (!window.Peer) return reject(new Error("PeerJS missing"));
    const p = new window.Peer(undefined, OPTS()); Net.peer = p; Net.role = "guest"; Net.code = code.toUpperCase();
    p.on("open", () => { const c = p.connect("maathu-" + Net.code, { reliable: true }); wire(c); c.on("open", () => resolve()); });
    p.on("call", onCall);
    p.on("error", (e) => { Net.onError && Net.onError(e); reject(e); });
    setTimeout(() => !Net.open && reject(new Error("timeout")), 15000);
  });
}

// ------------------------------------------------------------ voice chat (one-way calls each direction)
export const Voice = { on: false, wasOn: false, stream: null, call: null, audio: null, level: 0, partnerOn: false, ctx: null };
function remoteId() { return Net.conn && Net.conn.peer; }
export async function voiceOn() {
  if (!Net.open || !remoteId()) throw new Error("not-connected");
  Voice.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  Voice.call = Net.peer.call(remoteId(), Voice.stream);
  Voice.on = true; Net.send("voice", { on: true });
}
export function voiceOff(silent) {
  try { Voice.call && Voice.call.close(); } catch (e) {}
  if (Voice.stream) Voice.stream.getTracks().forEach((t) => t.stop());
  Voice.call = null; Voice.stream = null; Voice.on = false; if (!silent) Net.send("voice", { on: false });
}
export function voicePause() { Voice.wasOn = Voice.wasOn || Voice.on; if (Voice.on) voiceOff(true); }
export async function voiceResume() { if (Voice.wasOn) { Voice.wasOn = false; try { await voiceOn(); } catch (e) {} } }
function onCall(c) {
  c.answer();                       // receive-only; the other phone sends its own call when its mic is on
  c.on("stream", (s) => playRemote(s));
}
function playRemote(s) {
  if (!Voice.audio) { Voice.audio = document.createElement("audio"); Voice.audio.autoplay = true; Voice.audio.setAttribute("playsinline", ""); document.body.appendChild(Voice.audio); }
  Voice.audio.srcObject = s; Voice.audio.play().catch(() => {});
  try {
    const AC = window.AudioContext || window.webkitAudioContext; Voice.ctx = Voice.ctx || new AC();
    const src = Voice.ctx.createMediaStreamSource(s), an = Voice.ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
    const buf = new Float32Array(512);
    const tick = () => { an.getFloatTimeDomainData(buf); let q = 0; for (const v of buf) q += v * v; Voice.level = Math.sqrt(q / 512) * 6; requestAnimationFrame(tick); }; tick();
  } catch (e) {}
}
