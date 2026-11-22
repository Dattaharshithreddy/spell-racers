// Progress storage (per profile, on this phone) + spaced repetition + share codes.
import { WORDS, PHRASES } from "./words.js";

const MIN = 60e3, DAY = 864e5;
const GAP = [0, 10 * MIN, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
export const dayNum = (t = Date.now()) => Math.floor((t - new Date(t).getTimezoneOffset() * MIN) / DAY);
const KEY = "bangara-coach-v1";

const blank = (name) => ({ name, tracks: ["daily", "work", "study", "doctor"], perDay: 5, remind: "20:00", created: Date.now(),
  mem: {}, mine: [], log: {}, streak: { n: 0, last: 0, best: 0 }, convs: {}, friend: null });

export const Store = {
  all: { cur: null, profiles: {} },
  load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.profiles) this.all = s; } catch (e) {} return this; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.all)); } catch (e) {} },
  get p() { return this.all.profiles[this.all.cur] || null; },
  create(name) { const id = "p" + Date.now().toString(36); this.all.profiles[id] = blank(name); this.all.cur = id; this.save(); return this.p; },
  switchTo(id) { if (this.all.profiles[id]) { this.all.cur = id; this.save(); } },
  remove(id) { delete this.all.profiles[id]; if (this.all.cur === id) this.all.cur = Object.keys(this.all.profiles)[0] || null; this.save(); },

  // ---------------- words
  bank() {
    const p = this.p, ts = new Set(p.tracks), out = [], seen = new Set();
    for (const w of [...p.mine.map((m) => ({ ...m, t: "mine" })), ...WORDS]) {
      if (w.t !== "mine" && !ts.has(w.t)) continue;
      if (seen.has(w.w)) continue; seen.add(w.w); out.push(w);
    }
    return out;
  },
  word(w) { return this.p.mine.find((m) => m.w === w) || WORDS.find((x) => x.w === w) || null; },
  mem(w) { return this.p.mem[w] || null; },
  learned() { return Object.keys(this.p.mem).map((w) => this.word(w)).filter(Boolean); },
  /** next unseen words, cycling through the chosen tracks so each day mixes topics */
  newWords(n) {
    const p = this.p, order = [...p.tracks]; const pools = { mine: p.mine.filter((m) => !p.mem[m.w]) };
    for (const t of order) pools[t] = WORDS.filter((w) => w.t === t && !p.mem[w.w]);
    const out = [], seq = ["mine", ...order]; let k = 0, guard = 0;
    while (out.length < n && guard++ < 400) { const t = seq[k++ % seq.length]; const w = pools[t] && pools[t].shift(); if (w && !out.some((o) => o.w === w.w)) out.push(w); if (seq.every((s) => !pools[s] || !pools[s].length)) break; }
    return out;
  },
  /** words whose review time has come, most overdue first */
  due(limit = 99) {
    const now = Date.now();
    return Object.entries(this.p.mem).filter(([, m]) => m.due <= now).sort((a, b) => a[1].due - b[1].due).slice(0, limit).map(([w]) => this.word(w)).filter(Boolean);
  },
  dueCount() { const now = Date.now(); return Object.values(this.p.mem).filter((m) => m.due <= now).length; },
  meet(w) { const p = this.p; if (!p.mem[w]) { p.mem[w] = { b: 1, due: Date.now() + GAP[1], ok: 0, bad: 0, ms: null, seen: Date.now() }; this.save(); } },
  /** record an answer. ok: correct; ms: time to answer (spoken) */
  grade(w, ok, ms = null) {
    const p = this.p; const m = p.mem[w] || (p.mem[w] = { b: 0, due: 0, ok: 0, bad: 0, ms: null, seen: Date.now() });
    // fast + correct jumps further; slow correct moves one step; wrong drops back
    if (ok) { m.ok++; m.b = Math.min(6, m.b + (ms !== null && ms < 1800 && m.b >= 1 ? 2 : 1)); } else { m.bad++; m.b = Math.max(1, m.b - 2); }
    m.due = Date.now() + (ok ? GAP[m.b] : 5 * MIN);
    if (ms !== null && ok) m.ms = m.ms === null ? ms : Math.round(m.ms * 0.6 + ms * 0.4);
    const L = this.today(); L.n++; if (ok) L.ok++; if (ms !== null && ok) { L.ms += ms; L.msn++; }
    this.save();
  },
  spoke(kind = "sentence") { const L = this.today(); L[kind === "sentence" ? "sent" : "said"]++; this.save(); },
  today() { const d = dayNum(); return this.p.log[d] || (this.p.log[d] = { n: 0, ok: 0, ms: 0, msn: 0, sent: 0, said: 0, min: 0, done: false }); },
  addMinutes(m) { this.today().min += m; this.save(); },
  finishSession() {
    const s = this.p.streak, t = dayNum(); this.today().done = true;
    if (s.last !== t) { s.n = s.last === t - 1 ? s.n + 1 : 1; s.last = t; s.best = Math.max(s.best, s.n); }
    this.save(); return s.n;
  },
  streakNow() { const s = this.p.streak; return s.last >= dayNum() - 1 ? s.n : 0; },
  stats() {
    const p = this.p, mem = Object.values(p.mem), logs = Object.entries(p.log).map(([d, l]) => ({ d: +d, ...l })).sort((a, b) => a.d - b.d);
    const fastWords = mem.filter((m) => m.ms !== null && m.ms < 2000).length;
    const recent = logs.filter((l) => l.d > dayNum() - 7 && l.msn), older = logs.filter((l) => l.d <= dayNum() - 7 && l.d > dayNum() - 30 && l.msn);
    const avg = (a) => { const s = a.reduce((x, l) => x + l.ms, 0), n = a.reduce((x, l) => x + l.msn, 0); return n ? Math.round(s / n) : null; };
    return {
      learned: mem.length, strong: mem.filter((m) => m.b >= 4).length, fast: fastWords,
      avgMs: avg(recent), avgMsBefore: avg(older), sentences: logs.reduce((x, l) => x + l.sent, 0), minutes: Math.round(logs.reduce((x, l) => x + (l.min || 0), 0)),
      streak: this.streakNow(), best: p.streak.best, due: this.dueCount(), today: this.today(), doneToday: !!this.today().done,
      days: logs.slice(-14).map((l) => ({ d: l.d, ms: l.msn ? Math.round(l.ms / l.msn) : null, n: l.n })),
      total: WORDS.length + p.mine.length,
    };
  },
  convDone(id, spoken) { const c = this.p.convs[id] || (this.p.convs[id] = { n: 0, best: 0 }); c.n++; c.best = Math.max(c.best, spoken); this.save(); },

  // ---------------- share codes (send by WhatsApp, friend pastes it)
  shareCode() {
    const st = this.stats(), p = this.p;
    const data = { v: 1, n: p.name, l: st.learned, s: st.strong, f: st.fast, a: st.avgMs, k: st.streak, t: st.sentences, m: st.minutes, d: st.days.slice(-7).map((x) => [x.d, x.n, x.ms]), ts: Date.now() };
    return "BANGARA-" + btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/=+$/, "");
  },
  readCode(code) {
    const m = String(code).match(/BANGARA-([A-Za-z0-9+/]+)/); if (!m) return null;
    try { const d = JSON.parse(decodeURIComponent(escape(atob(m[1])))); return d && d.v === 1 && d.n ? d : null; } catch (e) { return null; }
  },
  setFriend(d) { this.p.friend = d; this.save(); },
};
export { PHRASES, WORDS };
