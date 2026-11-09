// DOM UI: screens, HUD, dialogue, word cards, story puzzles, map, tiffin.
import { say, listen, matchScore, Speech } from "./speech.js";
import { Sound } from "./audio.js";

export const $ = (id) => document.getElementById(id);
export function screen(id) { for (const s of document.querySelectorAll(".screen")) s.classList.toggle("show", s.id === id); }
export const show = (id) => { $(id).hidden = false; };
export const hide = (id) => { $(id).hidden = true; };
export const isOpen = (id) => !$(id).hidden;
export function anyModal() { return ["wcard", "fill", "speak", "quiz", "map", "tiffin", "menu", "help"].some((m) => isOpen(m)) || isOpen("dlg"); }

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
export function speakChallenge(sentence, onDone) {
  const words = sentence.split(" ");
  const line = $("spLine"); line.innerHTML = words.map((w) => `<span>${w}</span>`).join(" ");
  $("spMsg").textContent = Speech.canListen ? "Tap the mic and read the sentence out loud." : "Your browser can't use the mic. Type the sentence instead.";
  $("spType").hidden = Speech.canListen; $("spAlt").hidden = !Speech.canListen; $("spMic").hidden = !Speech.canListen; $("spIn").value = "";
  const highlight = (heard) => {
    const spans = line.querySelectorAll("span"); const h = heard.toLowerCase();
    spans.forEach((s) => s.classList.toggle("hit", matchScore(h, s.textContent) >= 1));
  };
  const win = () => { Sound.sfx("right"); $("spMsg").innerHTML = "✨ <b>Wonderful!</b> Listen…"; setTimeout(() => { hide("speak"); onDone(); }, 900); };
  $("spMic").onclick = async () => {
    $("spMic").classList.add("rec"); $("spMsg").textContent = "Listening…";
    try {
      const heard = await listen({ timeout: 8000, onInterim: highlight });
      highlight(heard); const sc = matchScore(heard, sentence);
      if (sc >= 0.66) win();
      else { Sound.sfx("wrong"); $("spMsg").innerHTML = heard ? `I heard “${heard}”. Almost! Try again, a little slower.` : "I didn't hear anything. Try again!"; }
    } catch (e) { $("spMsg").textContent = "Mic not available. Type it instead."; $("spType").hidden = false; }
    $("spMic").classList.remove("rec");
  };
  $("spAlt").onclick = () => { $("spType").hidden = false; $("spIn").focus(); };
  const check = () => { const v = $("spIn").value; highlight(v); if (matchScore(v, sentence) >= 0.85) win(); else { Sound.sfx("wrong"); $("spMsg").textContent = "Check the spelling and try again."; } };
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
export function objective(chap, text, dist) {
  $("hChap").textContent = chap; $("hObj").textContent = text; $("hDist").textContent = dist || "";
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

// ------------------------------------------------------------ tiffin (word book)
export function openTiffin(chapters, festival, learned) {
  const list = $("tfList"); list.innerHTML = "";
  let total = 0, known = 0;
  const section = (title, words) => {
    const h = document.createElement("h4"); h.textContent = title; list.appendChild(h);
    const g = document.createElement("div"); g.className = "wl";
    for (const w of words) {
      total++; const k = !!learned[w.w]; if (k) known++;
      const d = document.createElement("div"); d.className = "wi" + (k ? "" : " locked");
      d.innerHTML = k ? `<b>${w.p || ""} ${w.w}</b><span class="kn">${w.k}</span><br><small>${w.m}</small>` : `<b>🔒 ?????</b><small>${title}</small>`;
      if (k) d.onclick = () => say(`${w.w}. ${w.m}`);
      g.appendChild(d);
    }
    list.appendChild(g);
  };
  chapters.forEach((c, i) => section(`${i + 1}. ${c.title} · ${c.place.split(",")[0]}`, c.words));
  const fl = festival.filter((w) => learned[w.w]);
  if (fl.length) section("🌟 Word Festival", fl);
  $("tfSum").textContent = `${known} words in the tiffin. Tap a word to hear it.`;
  show("tiffin");
}
