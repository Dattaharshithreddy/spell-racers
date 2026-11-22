// Speech: text-to-speech + speech recognition that also measures HOW FAST the learner answers.
// Android app (Capacitor) uses the native plugins; browsers use the Web Speech API.
const CAP = window.Capacitor;
const NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
const NSR = NATIVE ? CAP.Plugins.SpeechRecognition : null;
const NTTS = NATIVE ? CAP.Plugins.TextToSpeech : null;
const WSR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const Speech = { canListen: !!(NSR || WSR), native: NATIVE, voice: null, knVoice: null };
function pickVoice() {
  const vs = window.speechSynthesis?.getVoices?.() || [];
  Speech.voice = vs.find((v) => /en-IN/i.test(v.lang)) || vs.find((v) => /en-GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  Speech.knVoice = vs.find((v) => /^kn/i.test(v.lang)) || null;
}
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

/** speak text; resolves when finished (best effort) */
// English voices misread some Kannada names (Bangara -> "Banjara"), so speak a phonetic spelling instead
const SAYFIX = [[/\bBangara\b/gi, "Bungaara"], [/\bTeju\b/gi, "Thay-ju"]];
// names the recogniser can spell any way: never count them against a spoken sentence
const NAMES = new Set(["bangara", "kumbu", "gundamma", "teju", "harshith", "ajja", "chintu", "meena", "dosti", "ramu", "shankar"]);
export function say(text, { rate = 0.92, kn = false } = {}) {
  const lang = kn ? "kn-IN" : "en-IN";
  if (!kn) for (const [re, to] of SAYFIX) text = String(text).replace(re, to);
  if (NTTS) return NTTS.stop().catch(() => {}).then(() => NTTS.speak({ text, lang, rate, pitch: 1, volume: 1, category: "playback" })).catch(() => {});
  return new Promise((res) => {
    if (!window.speechSynthesis) return res();
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = rate;
      const v = kn ? Speech.knVoice : Speech.voice; if (v) u.voice = v; u.lang = v?.lang || lang;
      u.onend = u.onerror = () => res(); speechSynthesis.speak(u);
      setTimeout(res, 1500 + text.length * 120);
    } catch (e) { res(); }
  });
}
export function stopSpeaking() { try { NTTS ? NTTS.stop() : speechSynthesis.cancel(); } catch (e) {} }

let permOk = false;
export async function micPermission() {
  if (NSR) {
    try {
      const p = await NSR.checkPermissions(); if (p.speechRecognition === "granted") return (permOk = true);
      const r = await NSR.requestPermissions(); return (permOk = r.speechRecognition === "granted");
    } catch (e) { return false; }
  }
  if (!navigator.mediaDevices?.getUserMedia) return !!WSR;
  try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); return (permOk = true); } catch (e) { return false; }
}

/**
 * Listen once. done(text) may return true to stop early (e.g. the right word was heard).
 * Resolves { text, ms } where ms = time from start until done() first returned true (or null).
 * Rejects with Error("not-allowed") / Error("no-sr").
 */
export function listen({ timeout = 6000, onInterim, done } = {}) {
  if (NSR) return nativeListen({ timeout, onInterim, done });
  return new Promise((resolve, reject) => {
    if (!WSR) return reject(new Error("no-sr"));
    const r = new WSR(); r.lang = "en-IN"; r.interimResults = true; r.maxAlternatives = 3; r.continuous = false;
    const t0 = performance.now(); let best = "", ms = null, fin = false;
    const finish = () => { if (fin) return; fin = true; clearTimeout(to); try { r.abort(); } catch (e) {} resolve({ text: best, ms }); };
    r.onresult = (e) => {
      let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " ";
      // also look at alternatives of the latest result (better chance of catching the word)
      const last = e.results[e.results.length - 1]; const alts = []; for (let a = 0; a < last.length; a++) alts.push(last[a].transcript);
      best = t.trim(); onInterim && onInterim(best);
      if (done && ms === null && [best, ...alts].some((x) => done(x))) { ms = performance.now() - t0; best = [best, ...alts].find((x) => done(x)); finish(); return; }
      if (last.isFinal) finish();
    };
    r.onerror = (e) => { if (fin) return; if (e.error === "no-speech" || e.error === "aborted") finish(); else { fin = true; clearTimeout(to); reject(new Error(e.error)); } };
    r.onend = finish;
    const to = setTimeout(finish, timeout);
    try { r.start(); } catch (e) { reject(e); }
  });
}
async function nativeListen({ timeout, onInterim, done }) {
  if (!permOk && !(await micPermission())) throw new Error("not-allowed");
  const t0 = performance.now(); let best = "", ms = null, h = null, fin = false;
  return new Promise(async (resolve) => {
    const finish = async () => {
      if (fin) return; fin = true; clearTimeout(to);
      try { await NSR.stop(); } catch (e) {} try { h && h.remove(); } catch (e) {}
      resolve({ text: best, ms });
    };
    try {
      h = await NSR.addListener("partialResults", (d) => {
        const m = (d && d.matches) || []; if (!m.length) return;
        best = m[0]; onInterim && onInterim(best);
        if (done && ms === null) { const hit = m.find((x) => done(x)); if (hit) { ms = performance.now() - t0; best = hit; finish(); } }
      });
    } catch (e) {}
    const to = setTimeout(finish, timeout + 800);
    try {
      const res = await NSR.start({ language: "en-IN", maxResults: 5, popup: false, partialResults: true });
      if (res && res.matches && res.matches.length) { best = res.matches[0]; if (done && ms === null) { const hit = res.matches.find((x) => done(x)); if (hit) { ms = performance.now() - t0; best = hit; } } finish(); }
    } catch (e) { finish(); }
  });
}

// ---------------- matching
export const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
export function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const close = (x, w) => x === w || (w.length > 4 && lev(x, w) <= 1) || (w.length > 7 && lev(x, w) <= 2) || x.replace(/s$/, "") === w.replace(/s$/, "");
/** is the target word / short phrase inside what was heard? */
export function heardWord(heard, target) {
  const h = norm(heard), t = norm(target); if (!t.length) return false;
  if (t.length === 1) return h.some((x) => close(x, t[0]));
  for (let i = 0; i + t.length <= h.length; i++) if (t.every((w, k) => close(h[i + k], w))) return true;
  return t.every((w) => h.some((x) => close(x, w)));
}
/** sentence score: which words of the target were said (order tolerant). returns { score, hit:[bool] } */
export function sentenceScore(heard, target) {
  const h = norm(heard), t = norm(target).filter((w) => !NAMES.has(w.replace(/'s$/, ""))); const used = new Array(h.length).fill(false);
  const hit = t.map((w) => { const i = h.findIndex((x, k) => !used[k] && close(x, w)); if (i >= 0) { used[i] = true; return true; } return false; });
  return { score: t.length ? hit.filter(Boolean).length / t.length : 0, hit };
}
