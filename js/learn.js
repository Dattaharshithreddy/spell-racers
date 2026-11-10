// Word memory: every word the player has met is tracked and brought back at growing gaps
// (10 minutes -> 1 day -> 3 days -> 1 week -> 3 weeks), so words are practised just before they would be forgotten.
import { Save } from "./save.js";
import { CHAPTERS, FESTIVAL } from "./content.js";
import { TALKS, ALL_TALKS } from "./talks.js";

const MIN = 60e3, DAY = 864e5;
const GAP = [0, 10 * MIN, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
let index = null;
function idx() {
  if (!index) {
    index = new Map();
    for (const w of FESTIVAL) index.set(w.w, w);
    for (const t of ALL_TALKS) for (const w of t.words) index.set(w.w, w);
    for (const c of CHAPTERS) for (const w of c.words) index.set(w.w, w);
  }
  return index;
}
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * MIN) / DAY);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const Learn = {
  word: (w) => idx().get(w) || null,
  all: () => [...idx().values()],
  mem(w) { const m = Save.d.mem || (Save.d.mem = {}); return m[w] || (m[w] = { b: 0, due: 0, ok: 0, bad: 0, said: 0 }); },
  /** first meeting with a word: it comes back for a first review 10 minutes later */
  meet(w) { const fresh = Save.learn(w); const m = this.mem(w); if (!m.b) { m.b = 1; m.due = Date.now() + GAP[1]; Save.write(); } return fresh; },
  result(w, ok) {
    if (!Save.d.words[w]) Save.learn(w);
    const m = this.mem(w);
    if (ok) { m.ok++; m.b = Math.min(5, Math.max(1, m.b) + 1); } else { m.bad++; m.b = Math.max(1, m.b - 1); }
    m.due = Date.now() + GAP[m.b] * (ok ? 1 : 0.2); Save.write();
  },
  said(w) { this.mem(w).said++; Save.write(); },
  sentence() { Save.d.spoken = (Save.d.spoken || 0) + 1; Save.write(); },
  known() { return Object.keys(Save.d.words).map((w) => idx().get(w)).filter(Boolean); },
  strength(w) { return Save.d.words[w] ? Math.max(1, (Save.d.mem && Save.d.mem[w] ? Save.d.mem[w].b : 1)) : 0; },
  /** words that most need practice: overdue first, then the weakest */
  due(n) {
    const now = Date.now();
    return this.known().map((w) => ({ w, m: this.mem(w.w) })).sort((a, b) => (a.m.due - now) - (b.m.due - now) || a.m.b - b.m.b).slice(0, n).map((x) => x.w);
  },
  dueCount() { const now = Date.now(); return this.known().filter((w) => this.mem(w.w).due <= now).length; },
  stats() {
    const k = this.known(), mem = Save.d.mem || {};
    const st = Save.d.streak || { n: 0, last: 0 }, alive = st.last >= today() - 1;
    return { learned: k.length, total: idx().size, strong: k.filter((w) => (mem[w.w]?.b || 0) >= 4).length, saidWords: k.filter((w) => (mem[w.w]?.said || 0) > 0).length,
      sentences: Save.d.spoken || 0, streak: alive ? st.n : 0, practisedToday: st.last === today(), due: this.dueCount() };
  },
  touchDay() {
    const st = Save.d.streak || (Save.d.streak = { n: 0, last: 0 }), t = today();
    if (st.last === t) return st.n;
    st.n = st.last === t - 1 ? st.n + 1 : 1; st.last = t; Save.write(); return st.n;
  },
  /** build one question. kind: "pick" (Kannada -> choose the English word), "listen" (hear it -> choose the meaning), "say" (Kannada -> say the English word) */
  question(wd, kind = "pick", extra = []) {
    const pool = shuffle([...new Map([...this.known(), ...extra, ...this.all()].map((w) => [w.w, w])).values()].filter((w) => w.w !== wd.w && w.k !== wd.k));
    // prefer distractors of a similar length so the answer is not obvious from its shape
    pool.sort((a, b) => Math.abs(a.w.length - wd.w.length) - Math.abs(b.w.length - wd.w.length));
    const opts = shuffle([wd, ...shuffle(pool.slice(0, 6)).slice(0, 2)]);
    return { kind, wd, opts };
  },
  /** the word for a Word Power: a due word if any, otherwise one from the current chapter */
  powerWord(chapterWords = []) {
    const now = Date.now(), known = this.known();
    const due = known.filter((w) => this.mem(w.w).due <= now);
    if (due.length) return due[(Math.random() * due.length) | 0];
    const weak = this.due(6); if (weak.length >= 3) return weak[(Math.random() * weak.length) | 0];
    const pool = chapterWords.length ? chapterWords : this.all();
    return pool[(Math.random() * pool.length) | 0];
  },
  talksFor: (chapterId) => TALKS[chapterId] || [],
  talkDone(chapterId, talkId) { const t = Save.d.talks || (Save.d.talks = {}); const a = t[chapterId] || (t[chapterId] = []); if (!a.includes(talkId)) { a.push(talkId); Save.write(); } },
  talksDone(chapterId) { return ((Save.d.talks || {})[chapterId] || []); },
};
