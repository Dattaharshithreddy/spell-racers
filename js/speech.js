// Text-to-speech + speech recognition with graceful fallbacks.
export const Speech = {
  canListen: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  voice: null,
};
function pickVoice() {
  const vs = speechSynthesis?.getVoices?.() || [];
  Speech.voice = vs.find((v) => /en-IN/i.test(v.lang)) || vs.find((v) => /en-GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  Speech.knVoice = vs.find((v) => /kn/i.test(v.lang)) || null;
}
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

export function say(text, { rate = 0.92, pitch = 1.05, kn = false } = {}) {
  if (!window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate; u.pitch = pitch;
    const v = kn ? Speech.knVoice : Speech.voice; if (v) u.voice = v; u.lang = kn ? "kn-IN" : (v?.lang || "en-IN");
    speechSynthesis.speak(u);
  } catch (e) {}
}

/** Listen once. Resolves with the transcript ("" on silence). Rejects if the mic is unavailable. */
export function listen({ timeout = 7000, onInterim } = {}) {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return reject(new Error("no-sr"));
    const r = new SR(); r.lang = "en-IN"; r.interimResults = true; r.maxAlternatives = 3;
    let best = "", done = false;
    const finish = () => { if (done) return; done = true; try { r.stop(); } catch (e) {} resolve(best); };
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " ";
      best = t.trim(); onInterim && onInterim(best);
      if (e.results[e.results.length - 1].isFinal) finish();
    };
    r.onerror = (e) => { if (done) return; done = true; (e.error === "no-speech" ? resolve("") : reject(new Error(e.error))); };
    r.onend = finish;
    try { r.start(); } catch (e) { return reject(e); }
    setTimeout(finish, timeout);
  });
}

const norm = (s) => s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
/** How much of `target` did the speaker say? 0..1 (word-level, order-tolerant, allows near-misses). */
export function matchScore(heard, target) {
  const h = norm(heard), t = norm(target); if (!t.length) return 0;
  let hit = 0;
  for (const w of t) if (h.some((x) => x === w || (w.length > 4 && lev(x, w) <= 1) || (w.length > 7 && lev(x, w) <= 2))) hit++;
  return hit / t.length;
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
