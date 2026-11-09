// Local save: story progress (per phone) + each player's own word tiffin.
const KEY = "maathu-save-v1";
const fresh = () => ({ ch: 0, phase: "prologue", done: [], words: {}, festival: {}, me: "bangara", pos: null, name: "", visited: [] });
export const Save = {
  d: fresh(),
  load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s === "object") this.d = { ...fresh(), ...s }; } catch (e) {} return this.d; },
  guest: false, // while visiting a friend's game, only words are saved (their story progress is theirs)
  write() {
    try {
      if (this.guest) { const own = JSON.parse(localStorage.getItem(KEY) || "{}"); own.words = { ...(own.words || {}), ...this.d.words }; localStorage.setItem(KEY, JSON.stringify(own)); return; }
      localStorage.setItem(KEY, JSON.stringify(this.d));
    } catch (e) {}
  },
  reset() { this.d = fresh(); this.write(); },
  learn(w) { if (!this.d.words[w]) { this.d.words[w] = Date.now(); this.write(); return true; } return false; },
  get started() { return this.d.phase !== "prologue" || this.d.done.length > 0; },
};
