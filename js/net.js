// Two-phone co-op over PeerJS (WebRTC). Host owns the world state; each phone drives its own hero.
export const Net = {
  role: null, code: null, peer: null, conn: null, open: false,
  on: {}, // type -> handler(data)
  onOpen: null, onClose: null, onError: null,
  send(type, data = {}) { if (this.conn && this.open) try { this.conn.send(JSON.stringify({ t: type, d: data })); } catch (e) {} },
  close() { try { this.conn && this.conn.close(); this.peer && this.peer.destroy(); } catch (e) {} this.open = false; this.role = null; },
};
const L = "ABCDEFGHJKMNPQRSTUVWXYZ";
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
    const p = new window.Peer("maathu-" + code);
    Net.peer = p; Net.role = "host"; Net.code = code;
    p.on("open", () => resolve(code));
    p.on("connection", (c) => { if (Net.conn) { c.close(); return; } wire(c); });
    p.on("error", (e) => { Net.onError && Net.onError(e); reject(e); });
  });
}
export function joinRoom(code) {
  return new Promise((resolve, reject) => {
    if (!window.Peer) return reject(new Error("PeerJS missing"));
    const p = new window.Peer(); Net.peer = p; Net.role = "guest"; Net.code = code.toUpperCase();
    p.on("open", () => { const c = p.connect("maathu-" + Net.code, { reliable: true }); wire(c); c.on("open", () => resolve()); });
    p.on("error", (e) => { Net.onError && Net.onError(e); reject(e); });
    setTimeout(() => !Net.open && reject(new Error("timeout")), 15000);
  });
}
