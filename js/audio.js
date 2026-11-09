// Procedural music (Mohanam pentatonic, soft tabla pulse) + sound effects. Music muffles while the world is silent.
let ctx = null, master, musicBus, filt, sfxBus, muted = false, started = false, colourful = 0;
try { muted = localStorage.getItem("maathu-mute") === "1"; } catch (e) {}
export const Sound = {
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem("maathu-mute", muted ? "1" : "0"); } catch (e) {} if (master) master.gain.value = muted ? 0 : 0.9; return muted; },
  unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
      filt = ctx.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 900; filt.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(filt);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    if (!started) { started = true; loop(); }
  },
  /** 0 = grey world (muffled), 1 = full colour (bright) */
  setColour(v) { colourful = v; if (filt) filt.frequency.setTargetAtTime(700 + v * 5200, ctx.currentTime, 0.8); },
  sfx(name) { if (!ctx || muted) return; (SFX[name] || (() => {}))(); },
};
const SCALE = [0, 2, 4, 7, 9]; // Mohanam (C D E G A)
function note(f, t, dur, type = "triangle", g = 0.18, bus = musicBus) {
  const o = ctx.createOscillator(), a = ctx.createGain();
  o.type = type; o.frequency.value = f; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + 0.015);
  a.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(a); a.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
function drum(t, f0, g, dur = 0.25, bus = musicBus) {
  const o = ctx.createOscillator(), a = ctx.createGain(); o.type = "sine";
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + dur);
  a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(a); a.connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
let step = 0, nextT = 0, phrase = [];
function hz(deg, oct = 0) { const s = SCALE[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct); return 261.63 * Math.pow(2, s / 12); }
function newPhrase() { phrase = []; let d = 2 + ((Math.random() * 3) | 0); for (let i = 0; i < 8; i++) { d += [-1, 0, 1, 1, -2, 2][(Math.random() * 6) | 0]; d = Math.max(0, Math.min(9, d)); phrase.push(Math.random() < 0.28 ? null : d); } }
function loop() {
  if (!ctx) return;
  const BEAT = 0.34; if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.4) {
    const t = nextT, s = step % 16;
    if (s === 0) { newPhrase(); note(hz(0, -1), t, BEAT * 15, "sine", 0.13); note(hz(2, -1), t, BEAT * 15, "sine", 0.07); }
    if (s === 8) { note(hz(4, -2), t, BEAT * 7, "sine", 0.1); }
    if (s % 2 === 0) { const d = phrase[(s / 2) | 0]; if (d !== null && d !== undefined) note(hz(d, 0), t, BEAT * 1.6, "triangle", 0.12 + colourful * 0.06); }
    if (s % 4 === 0) drum(t, 110, 0.32); if (s % 4 === 2) drum(t, 320, 0.12, 0.12); if (s === 7 || s === 15) drum(t, 240, 0.1, 0.1);
    nextT += BEAT; step++;
  }
  setTimeout(loop, 120);
}
const SFX = {
  collect() { const t = ctx.currentTime; [0, 2, 4, 7].forEach((d, i) => note(hz(d + 5, 0), t + i * 0.06, 0.4, "triangle", 0.25, sfxBus)); },
  jump() { const t = ctx.currentTime; note(hz(3, 0), t, 0.12, "square", 0.06, sfxBus); note(hz(6, 0), t + 0.05, 0.12, "square", 0.05, sfxBus); },
  dash() { const t = ctx.currentTime; noise(t, 0.25, 1800, 0.25); },
  pound() { const t = ctx.currentTime; drum(t, 90, 0.9, 0.5, sfxBus); noise(t, 0.35, 500, 0.4); },
  throw() { const t = ctx.currentTime; [0, 1, 2, 3, 4].forEach((d, i) => note(hz(d + 3, 0), t + i * 0.04, 0.2, "square", 0.05, sfxBus)); },
  steal() { const t = ctx.currentTime; [6, 4, 2, 0].forEach((d, i) => note(hz(d, 0), t + i * 0.08, 0.3, "sawtooth", 0.06, sfxBus)); },
  wrong() { const t = ctx.currentTime; note(160, t, 0.25, "square", 0.08, sfxBus); note(120, t + 0.12, 0.3, "square", 0.08, sfxBus); },
  right() { const t = ctx.currentTime; [0, 4, 7].forEach((d, i) => note(hz(d + 5), t + i * 0.08, 0.5, "triangle", 0.2, sfxBus)); },
  restore() { const t = ctx.currentTime; [0, 2, 4, 5, 7, 9, 10].forEach((d, i) => note(hz(d + 3), t + i * 0.12, 1.4, "triangle", 0.16, sfxBus)); drum(t, 80, 0.6, 1.2, sfxBus); },
  talk() { const t = ctx.currentTime; note(hz(5 + ((Math.random() * 4) | 0)), t, 0.06, "square", 0.025, sfxBus); },
  zap() { const t = ctx.currentTime; const o = ctx.createOscillator(), a = ctx.createGain(); o.type = "square"; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.09); a.gain.setValueAtTime(0.05, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(a); a.connect(sfxBus); o.start(t); o.stop(t + 0.12); },
  boom() { const t = ctx.currentTime; drum(t, 140, 0.5, 0.3, sfxBus); noise(t, 0.2, 900, 0.25); },
  boom2() { const t = ctx.currentTime; drum(t, 70, 0.8, 0.6, sfxBus); noise(t, 0.5, 400, 0.5); },
  pew() { const t = ctx.currentTime; const o = ctx.createOscillator(), a = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.15); a.gain.setValueAtTime(0.035, t); a.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.connect(a); a.connect(sfxBus); o.start(t); o.stop(t + 0.18); },
  hit() { const t = ctx.currentTime; noise(t, 0.08, 3000, 0.18); },
  hurt() { const t = ctx.currentTime; note(220, t, 0.15, "square", 0.08, sfxBus); note(165, t + 0.06, 0.2, "square", 0.08, sfxBus); },
  down() { const t = ctx.currentTime; [7, 5, 3, 0].forEach((d, i) => note(hz(d), t + i * 0.05, 0.2, "triangle", 0.12, sfxBus)); noise(t, 0.3, 1500, 0.2); },
  poof() { const t = ctx.currentTime; noise(t, 0.3, 2400, 0.2); note(hz(9), t, 0.2, "triangle", 0.1, sfxBus); },
};
function noise(t, dur, f, g) {
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(); s.buffer = b; const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f;
  const a = ctx.createGain(); a.gain.value = g; s.connect(bp); bp.connect(a); a.connect(sfxBus); s.start(t);
}
