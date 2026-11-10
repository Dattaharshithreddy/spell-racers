// DOM UI: screens, HUD, dialogue, word cards, story puzzles, map, tiffin.
import { say, listen, matchScore, Speech, openMic, levelMeter } from "./speech.js";
import { Sound } from "./audio.js";

export const $ = (id) => document.getElementById(id);
export function screen(id) { for (const s of document.querySelectorAll(".screen")) s.classList.toggle("show", s.id === id); }
export const show = (id) => { $(id).hidden = false; };
export const hide = (id) => { $(id).hidden = true; };
export const isOpen = (id) => !$(id).hidden;
export const hooks = { micStart: () => {}, micEnd: () => {} };
export function anyModal() { return ["wcard", "fill", "speak", "quiz", "map", "tiffin", "menu", "help", "micchk", "ask", "conv", "alert"].some((m) => isOpen(m)) || isOpen("dlg"); }

export function toast(html, cls = "", ms = 2600) {
  const t = $("toasts"); const d = document.createElement("div"); d.className = "toast " + cls; d.innerHTML = html; t.appendChild(d);
  while (t.children.length > 3) t.firstChild.remove();
  setTimeout(() => d.classList.add("out"), ms); setTimeout(() => d.remove(), ms + 450);
}
export function flash() { const f = $("flash"); f.hidden = true; void f.offsetWidth; f.hidden = false; setTimeout(() => (f.hidden = true), 950); }
export function voice(text, who) {
  if (Sound.muted) return;
  const P = { bangara: [1.0, 1.45], gundamma: [0.88, 0.82], npc: [1.0, 1.25], mouna: [0.72, 0.55] }[who] || [0.95, 1];
  say(text.replace(/[…*]/g, " ").replace(/\(.*?\)/g, ""), { rate: P[0], pitch: P[1] });
}

// ------------------------------------------------------------ dialogue
let dlgResolve = null, dlgQueue = [], dlgTyping = null, dlgFull = "", dlgNpc = null;
export const talk = { who: null, until: 0 };
export function dialogue(lines, npc) {
  return new Promise((res) => {
    dlgQueue = lines.slice(); dlgNpc = npc; dlgResolve = res; show("dlg"); nextLine();
  });
}
function nextLine() {
  if (dlgTyping) { clearInterval(dlgTyping); dlgTyping = null; $("dlgText").textContent = dlgFull; return; }
  const l = dlgQueue.shift();
  if (!l) { hide("dlg"); if (window.speechSynthesis) speechSynthesis.cancel(); const r = dlgResolve; dlgResolve = null; r && r(); return; }
  const [who, pose, text] = l;
  const pt = document.querySelector("#dlg .pt"), img = $("dlgImg"), icon = $("dlgIcon"), nm = $("dlgName");
  pt.className = "pt " + who; nm.className = who;
  if (who === "bangara" || who === "gundamma") { img.hidden = false; icon.hidden = true; img.src = `assets/art/${who}_${pose || "talk"}.webp`; nm.textContent = who === "bangara" ? "Bangara" : "Gundamma"; }
  else if (who === "mouna") { img.hidden = true; icon.hidden = false; icon.textContent = "🤫"; nm.textContent = "Mouna"; }
  else { img.hidden = true; icon.hidden = false; icon.textContent = dlgNpc?.icon || "🦜"; nm.textContent = dlgNpc?.name || "Friend"; }
  dlgFull = text; const el = $("dlgText"); el.textContent = ""; let i = 0;
  talk.who = who; talk.until = performance.now() + 600 + text.length * 62;
  dlgTyping = setInterval(() => {
    i += 2; el.textContent = text.slice(0, i); if (i % 6 === 0) Sound.sfx("talk");
    if (i >= text.length) { clearInterval(dlgTyping); dlgTyping = null; }
  }, 24);
  voice(text, who);
}
$("dlg").addEventListener("pointerdown", (e) => { e.preventDefault(); nextLine(); });

// ------------------------------------------------------------ word card
export function wordCard(wd, { onSay } = {}) {
  return new Promise((res) => {
    $("wcPic").textContent = wd.p || "🌟"; $("wcWord").textContent = wd.w; $("wcKn").textContent = wd.k; $("wcMean").textContent = wd.m;
    $("wcEx").innerHTML = wd.s ? wd.s.replace("___", `<b>${wd.w}</b>`) : ""; $("wcEx").hidden = !wd.s; $("wcHeard").textContent = "";
    show("wcard"); setTimeout(() => say(`${wd.w}. ${wd.m}.`), 250);
    $("wcHear").onclick = () => say(`${wd.w}. ${wd.s ? wd.s.replace("___", wd.w) : wd.m}`);
    $("wcSay").onclick = async () => {
      if (!Speech.canListen) { $("wcHeard").textContent = "Your browser can't use the mic. Try saying it to Gundamma anyway!"; return; }
      $("wcSay").classList.add("down"); $("wcHeard").textContent = "Listening…";
      try {
        const heard = await listen({ timeout: 5000, onInterim: (t) => ($("wcHeard").textContent = `“${t}”`) });
        const ok = matchScore(heard, wd.w) >= 1;
        $("wcHeard").innerHTML = ok ? `✅ Perfect! You said <b>${wd.w}</b>.` : heard ? `I heard “${heard}”. Try once more!` : "I didn't catch that. Try again!";
        Sound.sfx(ok ? "right" : "wrong"); if (ok && onSay) onSay();
      } catch (e) { $("wcHeard").textContent = "Mic not allowed. Check permissions."; }
      $("wcSay").classList.remove("down");
    };
    $("wcOk").onclick = () => { hide("wcard"); res(); };
  });
}

// ------------------------------------------------------------ fill the story
export function fillStory(ch, onDone) {
  const words = ch.words.map((w) => w.w);
  const order = [...words].sort(() => Math.random() - 0.5);
  $("flTag").textContent = `${ch.title} · ${ch.place}`;
  const story = $("flStory"); story.innerHTML = "";
  ch.words.forEach((wd, i) => {
    const [a, b] = wd.s.split("___");
    const span = document.createElement("span");
    span.innerHTML = `${a}<span class="blank" data-i="${i}">?</span>${b} `;
    story.appendChild(span);
  });
  const chips = $("flChips"); chips.innerHTML = ""; let sel = null; let solved = 0;
  order.forEach((w) => {
    const b = document.createElement("button"); b.className = "chip"; b.textContent = w; b.dataset.w = w;
    b.onclick = () => { chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("sel")); sel = b; b.classList.add("sel"); say(w); };
    chips.appendChild(b);
  });
  $("flHint").textContent = "Tap a word, then tap the blank where it belongs.";
  story.onclick = (e) => {
    const bl = e.target.closest(".blank"); if (!bl || bl.classList.contains("ok") || !sel) return;
    const i = +bl.dataset.i, want = ch.words[i];
    if (sel.dataset.w === want.w) {
      bl.textContent = want.w; bl.classList.add("ok"); sel.classList.add("used"); sel.classList.remove("sel"); sel = null; solved++;
      Sound.sfx("right");
      if (solved === ch.words.length) { setTimeout(() => { hide("fill"); say(ch.words.map((w) => w.s.replace("___", w.w)).join(" ")); onDone(); }, 700); }
    } else {
      bl.classList.remove("bad"); void bl.offsetWidth; bl.classList.add("bad"); Sound.sfx("wrong");
      $("flHint").innerHTML = `Hint: this blank needs a word meaning <b>“${want.m}”</b> (${want.k}).`;
    }
  };
  show("fill");
}

// ------------------------------------------------------------ speak challenge
/** Live mic check. Resolves "ok" (heard you), "type" (use keyboard) or "skip". */
export function micCheck({ standalone = false } = {}) {
  return new Promise((resolve) => {
    hooks.micStart();
    const bar = $("mcBar"), st = $("mcSt"), go = $("mcGo"), again = $("mcAgain"), typ = $("mcType");
    let stream = null, meter = null, heard = 0, timer = null, done = false;
    const native = Speech.native;
    const cleanup = () => { if (meter) meter.stop(); meter = null; if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; clearTimeout(timer); };
    const finish = (r) => { if (done) return; done = true; cleanup(); hide("micchk"); hooks.micEnd(); resolve(r); };
    const start = async () => {
      cleanup(); heard = 0; go.disabled = true; again.hidden = true; bar.style.width = "0%"; bar.className = "";
      st.innerHTML = "Say <b>“Namaskara Gundamma!”</b> out loud…";
      try { stream = await openMic(); }
      catch (e) {
        st.innerHTML = native ? "🚫 <b>The microphone is blocked.</b> Open phone <b>Settings → Apps → MAATHU → Permissions → Microphone → Allow</b>, then tap Try again."
          : "🚫 <b>The microphone is blocked.</b> Tap the 🔒 icon next to the address bar → allow <b>Microphone</b>, then tap Try again.";
        again.hidden = false; Sound.sfx("wrong"); return;
      }
      let last = performance.now();
      meter = levelMeter(stream, (lv) => {
        const now = performance.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
        bar.style.width = Math.round(lv * 100) + "%";
        if (lv > 0.12) heard += dt;
        if (heard > 0.3 && go.disabled) {
          go.disabled = false; bar.className = "ok"; st.innerHTML = "✅ <b>Your mic is working!</b> I can hear you clearly."; Sound.sfx("right");
          clearTimeout(timer); if (!standalone) setTimeout(() => finish("ok"), 1100);
        }
      });
      timer = setTimeout(() => { if (go.disabled) { st.innerHTML = "🤔 <b>I can't hear you.</b> Hold the phone closer, check nothing is covering the mic, and speak a little louder."; again.hidden = false; } }, 8000);
    };
    go.onclick = () => finish("ok"); again.onclick = start; typ.onclick = () => finish("type"); $("mcClose").onclick = () => finish("skip");
    $("mcClose").hidden = !standalone; typ.hidden = standalone;
    $("mcTitle").textContent = standalone ? "🎤 Microphone test" : "🎤 Mic check before you speak";
    show("micchk"); start();
  });
}

/** Speaking ladder: a word, another word, a phrase, then the whole sentence. steps: [{ label, text, kn }] */
export function speakLadder(steps, onDone, opts = {}) {
  let i = 0;
  const next = () => {
    if (i >= steps.length) return onDone();
    const st = steps[i++];
    speakChallenge(st.text, next, { ...opts, step: `Step ${i} of ${steps.length} · ${st.label}`, kn: st.kn, onSpoken: opts.onSpoken });
  };
  next();
}
export function speakChallenge(sentence, onDone, { typing = false, step = "Wake the land", kn = "", onSpoken } = {}) {
  $("spStep").textContent = step; $("spKn").textContent = kn || ""; $("spKn").hidden = !kn;
  const words = sentence.split(" ");
  const line = $("spLine"); line.innerHTML = words.map((w) => `<span>${w}</span>`).join(" ");
  $("spMsg").textContent = Speech.canListen ? "Tap the mic and read the sentence out loud." : "Your browser can't use the mic. Type the sentence instead.";
  const useMic = Speech.canListen && !typing;
  $("spType").hidden = useMic; $("spAlt").hidden = !useMic; $("spMic").hidden = !useMic; $("spIn").value = "";
  if (typing) $("spMsg").textContent = "Type the sentence exactly as shown.";
  const highlight = (heard) => {
    const spans = line.querySelectorAll("span"); const h = heard.toLowerCase();
    spans.forEach((s) => s.classList.toggle("hit", matchScore(h, s.textContent) >= 1));
  };
  const win = (spoke) => { Sound.sfx("right"); if (spoke && onSpoken) onSpoken(sentence); $("spMsg").innerHTML = "✨ <b>Wonderful!</b>"; setTimeout(() => { hide("speak"); hooks.micEnd(); onDone(); }, 900); };
  let misses = 0;
  hooks.micStart();
  $("spMic").onclick = async () => {
    $("spMic").classList.add("rec"); $("spMsg").textContent = "Listening…";
    try {
      const heard = await listen({ timeout: 8000, onInterim: highlight });
      highlight(heard); const sc = matchScore(heard, sentence);
      if (sc >= 0.66) win(true);
      else { Sound.sfx("wrong"); misses++; $("spMsg").innerHTML = heard ? `I heard “${heard}”. Almost! Try again, a little slower.` : "I didn't hear anything. Try again!";
        if (misses >= 3) { $("spMsg").innerHTML += "<br><small>Still not working? You can <b>type it instead</b> below.</small>"; $("spType").hidden = false; } }
    } catch (e) { $("spMsg").textContent = "Mic not available. Type it instead."; $("spType").hidden = false; }
    $("spMic").classList.remove("rec");
  };
  $("spAlt").onclick = () => { $("spType").hidden = false; $("spIn").focus(); };
  const check = () => { const v = $("spIn").value; highlight(v); if (matchScore(v, sentence) >= 0.85) win(false); else { Sound.sfx("wrong"); $("spMsg").textContent = "Check the spelling and try again."; } };
  $("spGo").onclick = check; $("spIn").onkeydown = (e) => { if (e.key === "Enter") check(); };
  show("speak"); setTimeout(() => say(sentence, { rate: 0.85 }), 300);
}

// ------------------------------------------------------------ festival quiz
export function quiz(wd, pool) {
  return new Promise((res) => {
    $("qzWord").textContent = wd.w;
    const opts = [wd, ...pool.filter((x) => x.w !== wd.w).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
    const box = $("qzOpts"); box.innerHTML = "";
    let tries = 0;
    for (const o of opts) {
      const b = document.createElement("button"); b.innerHTML = `${o.m} <span class="kn" style="color:var(--kumkum)">· ${o.k}</span>`;
      b.onclick = () => {
        tries++;
        if (o.w === wd.w) { b.classList.add("ok"); Sound.sfx("right"); say(`${wd.w}. ${wd.m}`); setTimeout(() => { hide("quiz"); res(tries === 1); }, 900); }
        else { b.classList.add("bad"); Sound.sfx("wrong"); }
      };
      box.appendChild(b);
    }
    show("quiz"); say(wd.w);
  });
}

// ------------------------------------------------------------ HUD bits
export function objective(chap, text, dist, kn) {
  $("hChap").textContent = chap; $("hObj").textContent = text; $("hDist").textContent = dist || ""; $("hObjKn").textContent = kn || "";
}
export function compass(angle, visible) {
  const c = $("compass"); c.style.display = visible ? "" : "none"; if (visible) c.style.transform = `rotate(${angle}rad)`;
}

// ------------------------------------------------------------ map rendering
let mapImg = null;
export function setMapImage(img) { mapImg = img; }
export function drawMap(cv, d, { mini = false, view = 260 } = {}) {
  const x = cv.getContext("2d"), W = cv.width, H = cv.height;
  x.clearRect(0, 0, W, H);
  if (!mapImg) return;
  const m = d.meta, sx = mapImg.width / (m.nx * m.cell), sz = mapImg.height / (m.nz * m.cell);
  const toImg = (px, pz) => [(px - m.x0) * sx, (pz - m.z0) * sz];
  if (mini) {
    x.save(); x.beginPath(); x.arc(W / 2, H / 2, W / 2, 0, 7); x.clip();
    const [cx, cz] = toImg(d.me.x, d.me.z), span = view * sx;
    x.filter = "saturate(" + (0.25 + d.colour * 0.75) + ")";
    x.drawImage(mapImg, cx - span, cz - span, span * 2, span * 2, 0, 0, W, H); x.filter = "none";
    const k = W / (span * 2);
    const P = (px, pz) => { const [ix, iz] = toImg(px, pz); return [(ix - cx) * k + W / 2, (iz - cz) * k + H / 2]; };
    for (const b of d.marks) { let [mx, mz] = P(b.x, b.z); const dd = Math.hypot(mx - W / 2, mz - H / 2), R = W / 2 - 9; if (dd > R) { mx = W / 2 + (mx - W / 2) * R / dd; mz = H / 2 + (mz - H / 2) * R / dd; } dot(x, mx, mz, b.big ? 8 : 5, b.col); }
    if (d.other) { const [ox, oz] = P(d.other.x, d.other.z); dot(x, ox, oz, 6, d.other.col); }
    x.translate(W / 2, H / 2); x.rotate(-d.me.yaw); x.fillStyle = "#fff"; x.strokeStyle = "#1E1B3A"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, -12); x.lineTo(8, 9); x.lineTo(0, 5); x.lineTo(-8, 9); x.closePath(); x.stroke(); x.fill();
    x.restore();
    return;
  }
  x.drawImage(mapImg, 0, 0, W, H);
  // grey wash over silent districts
  if (d.greyMask) { x.globalAlpha = 0.7; x.drawImage(d.greyMask, 0, 0, W, H); x.globalAlpha = 1; }
  const k = W / mapImg.width;
  const P = (px, pz) => { const [ix, iz] = toImg(px, pz); return [ix * k, iz * k]; };
  x.font = "bold 13px 'Baloo 2', sans-serif"; x.textAlign = "center";
  d.hits = [];
  for (const b of d.marks) {
    const [mx, mz] = P(b.x, b.z); dot(x, mx, mz, b.big ? 9 : 6, b.col);
    if (b.label) { x.fillStyle = "#1E1B3A"; x.lineWidth = 3; x.strokeStyle = "rgba(255,248,236,.9)"; x.strokeText(b.label, mx, mz - 13); x.fillText(b.label, mx, mz - 13); }
    if (b.travel) d.hits.push({ x: mx, y: mz, b });
  }
  const [px, pz] = P(d.me.x, d.me.z); dot(x, px, pz, 8, "#ffffff"); dot(x, px, pz, 5, d.me.col);
  if (d.other) { const [ox, oz] = P(d.other.x, d.other.z); dot(x, ox, oz, 7, d.other.col); }
}
function dot(x, px, py, r, col) { x.beginPath(); x.arc(px, py, r, 0, 7); x.fillStyle = col; x.fill(); x.lineWidth = 2.5; x.strokeStyle = "#1E1B3A"; x.stroke(); }

// ------------------------------------------------------------ one question (word powers, daily practice)
/** q: { kind: "pick" | "listen" | "say", wd, opts }. Resolves { ok, said, timeout }. */
export function ask(q, { title = "Word power", timer = 0, sayBonus = "", closable = false } = {}) {
  return new Promise((resolve) => {
    const wd = q.wd; let kind = q.kind; if (kind === "say" && !Speech.canListen) kind = "pick";
    let done = false, tm = null, t0 = performance.now(), micOn = false;
    $("askTitle").textContent = title; $("askMsg").textContent = ""; $("askTimer").hidden = !timer;
    const box = $("askOpts"); box.innerHTML = "";
    const finish = (ok, said, timeout) => {
      if (done) return; done = true; clearInterval(tm);
      for (const b of box.children) { if (b.dataset.w === wd.w) b.classList.add("ok"); b.disabled = true; }
      $("askMic").hidden = true; $("askSkipSay").hidden = true;
      $("askMsg").innerHTML = ok ? (said ? `🎤 <b>${wd.w}</b>! Perfectly said.` : `✅ <b>${wd.w}</b> = ${wd.k}`) : `${timeout ? "⏱️ Time!" : "❌"} The word is <b>${wd.w}</b> · ${wd.k}<br><small>${wd.m}</small>`;
      Sound.sfx(ok ? "right" : "wrong"); if (!micOn) say(wd.w);
      setTimeout(() => { hide("ask"); if (micOn) hooks.micEnd(); resolve({ ok, said: !!said, timeout: !!timeout }); }, ok ? 1000 : 2100);
    };
    const options = () => {
      box.innerHTML = "";
      for (const o of q.opts) {
        const b = document.createElement("button"); b.dataset.w = o.w;
        b.innerHTML = kind === "listen" ? `${o.m} <span class="kn">· ${o.k}</span>` : `<b>${o.w}</b>`;
        b.onclick = () => { if (done) return; if (o.w === wd.w) finish(true, false); else { b.classList.add("bad"); finish(false, false); } };
        box.appendChild(b);
      }
    };
    const listenFor = async () => {
      if (done) return; micOn = true; hooks.micStart();
      $("askMic").classList.add("rec"); $("askMsg").textContent = "Listening… say the English word";
      try {
        const heard = await listen({ timeout: 4500, onInterim: (t) => ($("askMsg").textContent = `“${t}”`) });
        if (done) return;
        if (matchScore(heard, wd.w) >= 1) finish(true, true);
        else { $("askMsg").innerHTML = heard ? `I heard “${heard}”. Try again or tap the word.` : "I didn't hear you. Try again or tap the word."; Sound.sfx("wrong"); if (kind === "say") { kind = "pick"; options(); } }
      } catch (e) { $("askMsg").textContent = "Mic not available. Tap the word instead."; if (kind === "say") { kind = "pick"; options(); } }
      $("askMic").classList.remove("rec");
    };
    if (kind === "listen") { $("askPic").textContent = "🔊"; $("askQ").textContent = "Listen. What does it mean?"; $("askQ").className = ""; $("askSub").textContent = "Tap 🔊 to hear it again"; $("askPic").onclick = () => say(wd.w); }
    else { $("askPic").textContent = wd.p || "🌟"; $("askQ").textContent = wd.k; $("askQ").className = "kn"; $("askSub").textContent = wd.m; $("askPic").onclick = null; }
    $("askMic").hidden = kind === "listen" || !Speech.canListen; $("askMic").onclick = listenFor;
    $("askMicTxt").textContent = kind === "say" ? "Say the English word" : (sayBonus || "Or say it out loud");
    $("askSkipSay").hidden = kind !== "say"; $("askSkipSay").onclick = () => { kind = "pick"; options(); $("askSkipSay").hidden = true; };
    if (kind !== "say") options();
    $("askClose").hidden = !closable; $("askClose").onclick = () => { if (done) return; done = true; clearInterval(tm); hide("ask"); if (micOn) hooks.micEnd(); resolve({ ok: false, quit: true }); };
    if (timer) { const bar = $("askTimerFill"); bar.style.width = "100%"; tm = setInterval(() => { const k = 1 - (performance.now() - t0) / (timer * 1000); bar.style.width = Math.max(0, k * 100) + "%"; if (k <= 0 && !$("askMic").classList.contains("rec")) finish(false, false, true); }, 100); }
    show("ask"); if (kind === "listen") setTimeout(() => say(wd.w), 250);
  });
}

// ------------------------------------------------------------ everyday conversation
/** talk: { icon, name, title, kn, lines, words }. Resolves { finished, spoken, picks, wrong }. */
export function conversation(talk, meName, { onSentence } = {}) {
  return new Promise((resolve) => {
    const fill = (t) => t.replace(/\{me\}/g, meName);
    const log = $("cvLog"); log.innerHTML = ""; let i = 0, spoken = 0, wrong = 0, closed = false, micUsed = false;
    $("cvIcon").textContent = talk.icon; $("cvName").textContent = talk.name; $("cvTitle").textContent = talk.title; $("cvKn").textContent = talk.kn;
    $("cvEnd").hidden = true; $("cvTurn").hidden = false;
    const end = (finished) => { if (closed) return; closed = true; hide("conv"); if (window.speechSynthesis) speechSynthesis.cancel(); if (micUsed) hooks.micEnd(); resolve({ finished, spoken, wrong }); };
    $("cvClose").onclick = () => end(false);
    const bubble = (cls, en, kn) => { const d = document.createElement("div"); d.className = "bub " + cls; d.innerHTML = `<p>${en}</p>${kn ? `<small class="kn">${kn}</small>` : ""}`; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
    const step = () => {
      if (closed) return;
      if (i >= talk.lines.length) return finishScene();
      const L = talk.lines[i++];
      if (L[0] === "n") {
        bubble("npc", L[1], L[2]); voice(L[1], "npc");
        $("cvWant").textContent = ""; $("cvOpts").innerHTML = ""; $("cvSay").hidden = true; $("cvMsg").textContent = "";
        setTimeout(step, Math.min(3800, 900 + L[1].length * 38));
      } else yourTurn(L);
    };
    const yourTurn = (L) => {
      const right = fill(L[2]);
      $("cvWant").innerHTML = `<small>You want to say</small><span class="kn">${fill(L[1])}</span>`;
      $("cvMsg").textContent = "Pick the correct English sentence."; $("cvSay").hidden = true;
      const box = $("cvOpts"); box.innerHTML = "";
      for (const o of [L[2], L[3], L[4]].map(fill).sort(() => Math.random() - 0.5)) {
        const b = document.createElement("button"); b.textContent = o;
        b.onclick = () => {
          if (o !== right) { wrong++; b.classList.add("bad"); b.disabled = true; Sound.sfx("wrong"); $("cvMsg").textContent = "Not quite. Read each one slowly and try again."; return; }
          Sound.sfx("right"); box.innerHTML = ""; $("cvWant").textContent = "";
          const mine = bubble("me", right, ""); sayIt(right, mine);
        };
        box.appendChild(b);
      }
    };
    const sayIt = (right, mine) => {
      say(right, { rate: 0.85 });
      if (!Speech.canListen) { $("cvMsg").textContent = "Read it out loud, then tap Next."; $("cvSay").hidden = false; $("cvMic").hidden = true; $("cvSkip").textContent = "Next ▶"; $("cvSkip").hidden = false; $("cvSkip").onclick = () => { $("cvSay").hidden = true; step(); }; return; }
      let misses = 0;
      $("cvSay").hidden = false; $("cvMic").hidden = false; $("cvSkip").hidden = true; $("cvSkip").textContent = "Skip speaking ▶";
      $("cvMsg").innerHTML = "Now <b>say it out loud</b>. Tap the mic.";
      $("cvSkip").onclick = () => { $("cvSay").hidden = true; step(); };
      $("cvMic").onclick = async () => {
        if (!micUsed) { micUsed = true; hooks.micStart(); }
        $("cvMic").classList.add("rec"); $("cvMsg").textContent = "Listening…";
        try {
          const heard = await listen({ timeout: 7000, onInterim: (t) => ($("cvMsg").textContent = `“${t}”`) });
          if (closed) return;
          if (matchScore(heard, right) >= 0.6) { spoken++; mine.classList.add("said"); Sound.sfx("right"); onSentence && onSentence(right); $("cvMsg").innerHTML = "🎤 <b>Well said!</b>"; $("cvSay").hidden = true; setTimeout(step, 700); }
          else { misses++; Sound.sfx("wrong"); $("cvMsg").innerHTML = heard ? `I heard “${heard}”. Try once more, slowly.` : "I didn't hear you. Try again!"; $("cvSkip").hidden = false; }
        } catch (e) { $("cvMsg").textContent = "Mic not available."; $("cvSkip").hidden = false; }
        $("cvMic").classList.remove("rec");
      };
    };
    const finishScene = () => {
      $("cvTurn").hidden = true; $("cvEnd").hidden = false;
      const g = $("cvWords"); g.innerHTML = "";
      for (const w of talk.words) {
        const d = document.createElement("div"); d.className = "wi";
        d.innerHTML = `<b>${w.p || ""} ${w.w}</b><span class="kn">${w.k}</span><br><small>${w.m}</small>`;
        d.onclick = () => say(`${w.w}. ${w.s ? w.s.replace("___", w.w) : w.m}`); g.appendChild(d);
      }
      $("cvSum").innerHTML = `${talk.name} can talk again! You spoke <b>${spoken}</b> sentence${spoken === 1 ? "" : "s"} out loud.`;
      $("cvDone").onclick = () => end(true);
    };
    show("conv"); step();
  });
}

// ------------------------------------------------------------ tiffin (word book + progress)
export function openTiffin(chapters, festival, learned, { talks = {}, stats = null, strength = () => 1, onPractice } = {}) {
  const list = $("tfList"); list.innerHTML = "";
  let total = 0, known = 0;
  const dots = (n) => `<i class="dots">${"●".repeat(Math.min(5, n))}${"○".repeat(5 - Math.min(5, n))}</i>`;
  const section = (title, words) => {
    const h = document.createElement("h4"); h.textContent = title; list.appendChild(h);
    const g = document.createElement("div"); g.className = "wl";
    for (const w of words) {
      total++; const k = !!learned[w.w]; if (k) known++;
      const d = document.createElement("div"); d.className = "wi" + (k ? "" : " locked");
      d.innerHTML = k ? `<b>${w.p || ""} ${w.w}</b><span class="kn">${w.k}</span><br><small>${w.m}</small>${dots(strength(w.w))}` : `<b>🔒 ?????</b><small>${title}</small>`;
      if (k) d.onclick = () => say(`${w.w}. ${w.m}`);
      g.appendChild(d);
    }
    list.appendChild(g);
  };
  chapters.forEach((c, i) => section(`${i + 1}. ${c.title} · ${c.place.split(",")[0]}`, [...c.words, ...(talks[c.id] || []).flatMap((t) => t.words)]));
  const fl = festival.filter((w) => learned[w.w]);
  if (fl.length) section("🌟 Word Festival", fl);
  if (stats) {
    $("tfStats").hidden = false;
    $("tfStats").innerHTML = `<div><b>${stats.learned}</b><small>words learned</small></div><div><b>${stats.strong}</b><small>strong words</small></div><div><b>${stats.sentences}</b><small>sentences spoken</small></div><div><b>🔥 ${stats.streak}</b><small>day streak</small></div>`;
    $("tfPractice").hidden = stats.learned < 3; $("tfPractice").textContent = stats.due ? `🧠 Practise now · ${stats.due} word${stats.due === 1 ? "" : "s"} waiting` : "🧠 Practise now";
    $("tfPractice").onclick = () => { hide("tiffin"); onPractice && onPractice(); };
  } else { $("tfStats").hidden = true; $("tfPractice").hidden = true; }
  $("tfSum").textContent = `${known} of ${total} words in the tiffin. ●●●●● = you know it well. Tap a word to hear it.`;
  show("tiffin");
}
