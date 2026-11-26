// Bangara English Coach: daily vocabulary, fast recall, shadowing and conversation practice (Kannada help).
import { Store, PHRASES, WORDS, dayNum } from "./store.js";
import { CONVS as C1 } from "./convs.js";
import { CONVS2 } from "./convs2.js";
import { STORIES, GLOSS } from "./stories.js";
const CONVS = [...C1, ...CONVS2];
import { Speech, say, stopSpeaking, stopListening, listen, heardWord, sentenceScore, micPermission } from "./speech.js";

const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TRACK = { daily: ["🏠", "Daily life"], work: ["💼", "Work"], study: ["📚", "Study"], doctor: ["🩺", "Doctor"], mine: ["✍️", "My words"] };
const CAP = window.Capacitor, NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
const Plug = (n) => (NATIVE && CAP.Plugins[n]) || null;
let leaving = null;          // cleanup for the current screen (stop mic / speech)
function toast(t, ms = 2200) { const el = $("#toast"); el.innerHTML = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), ms); }
function show(html) { if (leaving) { try { leaving(); } catch (e) {} leaving = null; } stopSpeaking(); stopListening(); app.innerHTML = html; window.scrollTo(0, 0); }
const top = (title, back = "home") => `<div class="top"><button class="back" data-go="${back}">‹</button><h2>${title}</h2></div>`;
app.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); const s = e.target.closest("[data-say]"); if (s) say(s.dataset.say, { rate: 0.88 }); });
const dots = (b = 0) => `<span class="dots">${"●".repeat(Math.min(5, b))}${"○".repeat(Math.max(0, 5 - b))}</span>`;
const exHtml = (s, w) => esc(s).replace(new RegExp(`\\b(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "i"), "<b>$1</b>");
const secs = (ms) => (ms / 1000).toFixed(1) + " s";

// ============================================================ routing
const ROUTES = { home, welcome, session: () => runSession(), recall: () => recallDrill(), shadow: shadowMenu, convs: convList, stories: storyList, phrases: phraseList, mine: myWords, progress, share, settings };
function go(r) { (ROUTES[r] || home)(); }

// ============================================================ welcome / profiles
function welcome() {
  let tracks = ["daily", "work", "study", "doctor"], per = 5;
  show(`
    <div class="logo"><span class="bun">🐰</span><div><b>Bangara</b><small>English Coach</small></div></div>
    <div class="card col">
      <h1>Speak English fast and with confidence.</h1>
      <p class="muted">10 minutes a day. New words, quick recall, speaking out loud, and real conversations, with Kannada help.</p>
    </div>
    <label>Your name<input id="nm" placeholder="e.g. Bangara" autocomplete="off"></label>
    <div class="col"><b>What do you need English for?</b><div class="seg" id="tr">${Object.entries(TRACK).filter(([k]) => k !== "mine").map(([k, [i, n]]) => `<button data-t="${k}" class="on">${i} ${n}</button>`).join("")}</div></div>
    <div class="col"><b>New words per day</b><div class="seg" id="pd">${[3, 5, 8, 10].map((n) => `<button data-n="${n}" class="${n === 5 ? "on" : ""}">${n}</button>`).join("")}</div></div>
    <button class="btn gold" id="go">Start learning 🐰</button>`);
  $("#tr").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; b.classList.toggle("on"); tracks = [...$("#tr").querySelectorAll(".on")].map((x) => x.dataset.t); };
  $("#pd").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; $("#pd").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); per = +b.dataset.n; };
  $("#go").onclick = async () => {
    const name = $("#nm").value.trim(); if (!name) return toast("Please type your name");
    if (!tracks.length) return toast("Pick at least one");
    const p = Store.create(name); p.tracks = tracks; p.perDay = per; Store.save();
    await micPermission(); setReminder(true); home();
  };
}

// ============================================================ home
function home() {
  if (!Store.p) return welcome();
  const p = Store.p, st = Store.stats(), due = st.due, fresh = Math.min(p.perDay, Store.newWords(p.perDay).length);
  const est = Math.max(4, Math.round(Math.min(due, 15) * 0.25 + fresh * 1.2 + 3));
  const hr = new Date().getHours(), hi = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const f = p.friend;
  show(`
    <div class="row between"><div class="logo"><span class="bun">🐰</span><div><b>Bangara</b><small>English Coach</small></div></div>
      <button class="btn small" data-go="settings">⚙️</button></div>
    <div class="hero">
      <h1>${hi}, ${esc(p.name)}!</h1>
      ${st.doneToday ? `<p>Today's session is done. 🔥 ${st.streak}-day streak!</p><div class="done">Want more? Try fast recall or a conversation below.</div>`
        : `<p>Today: ${due ? `${Math.min(due, 15)} words to review, ` : ""}${fresh} new words, speaking practice · about ${est} min</p><button class="btn" data-go="session">▶ Start today's session</button>`}
    </div>
    <div class="stats">
      <div class="stat"><b>🔥 ${st.streak}</b><small>day streak</small></div>
      <div class="stat"><b>${st.learned}</b><small>words learned</small></div>
      <div class="stat"><b>${st.avgMs ? secs(st.avgMs) : "–"}</b><small>avg recall time</small></div>
    </div>
    <div class="tiles">
      <button class="tile t1" data-go="recall"><i>⚡</i><b>Fast recall</b><small>See Kannada, say the English word in 3 seconds</small></button>
      <button class="tile t2" data-go="shadow"><i>🗣️</i><b>Shadowing</b><small>Hear a sentence, say it back</small></button>
      <button class="tile t3" data-go="convs"><i>💬</i><b>Conversations</b><small>Doctor, work, study, daily life</small></button>
      <button class="tile t4" data-go="phrases"><i>🧩</i><b>Speaking phrases</b><small>Words that keep you talking</small></button>
    </div>
    <button class="item story-cta" data-go="stories"><i>📚</i><div class="grow"><b>Stories with friends</b><small class="muted">Bangara, Kumbu, Gundamma, Teju & Harshith · ${Object.keys(p.stories || {}).length} / ${STORIES.length} read</small></div><span>›</span></button>
    <button class="item" data-go="mine"><i>✍️</i><div class="grow"><b>My words</b><small class="muted">Add words you meet while reading</small></div><span>›</span></button>
    <button class="item" data-go="progress"><i>📈</i><div class="grow"><b>My progress</b><small class="muted">${st.strong} strong words · ${st.sentences} sentences spoken</small></div><span>›</span></button>
    <button class="item" data-go="share"><i>${f ? "🤝" : "📤"}</i><div class="grow"><b>${f ? `${esc(f.n)}'s progress` : "Share progress with a friend"}</b><small class="muted">${f ? `${f.l} words · 🔥 ${f.k} days · updated ${ago(f.ts)}` : "Send your progress on WhatsApp"}</small></div><span>›</span></button>
    ${Speech.canListen ? "" : `<div class="card"><b>🎤 Speech recognition is not available here.</b><p class="muted">You can still learn, but speaking checks need the Android app or Chrome.</p></div>`}
  `);
}
function ago(ts) { const d = dayNum() - dayNum(ts); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; }

// ============================================================ daily session
async function runSession() {
  const p = Store.p, t0 = Date.now();
  const review = shuffle(Store.due(15)), fresh = Store.newWords(p.perDay);
  const shadows = shuffle(fresh.filter((w) => w.s)).slice(0, 3);
  const phrase = shuffle(PHRASES.filter((x) => p.tracks.includes(x[2]) || !["doctor", "work"].includes(x[2])))[0];
  const steps = [
    ...review.map((w) => (c) => recallCardRun(w, c, { label: "🔁 Review" })),
    ...fresh.map((w) => (c) => learnCard(w, c)),
    ...shuffle(fresh).map((w) => (c) => recallCardRun(w, c, { label: "✔️ Check new word", soft: true })),
    ...shadows.map((w) => (c) => shadowCard(w.s, "", { label: "🗣️ Say the sentence" })(c)),
    ...(phrase ? [(c) => shadowCard(phrase[0], phrase[1], { label: "🧩 Speaking phrase" })(c)] : []),
  ];
  if (!steps.length) { toast("Nothing to do right now. Add more topics in settings."); return home(); }
  let quit = false;
  for (let i = 0; i < steps.length && !quit; i++) {
    const r = await steps[i]({ i, n: steps.length });
    if (r === "quit") quit = true;
  }
  Store.addMinutes((Date.now() - t0) / 60000);
  if (quit) return home();
  const streak = Store.finishSession(); const st = Store.stats();
  show(`<div class="stage">
    <div class="celebrate">🎉🐰</div><h1 class="center">Session complete!</h1>
    <div class="stats"><div class="stat"><b>🔥 ${streak}</b><small>day streak</small></div><div class="stat"><b>${st.today.ok}/${st.today.n}</b><small>answers right</small></div><div class="stat"><b>${st.today.msn ? secs(st.today.ms / st.today.msn) : "–"}</b><small>avg recall</small></div></div>
    <p class="center muted">Words come back just before you'd forget them. See you tomorrow!</p>
    <button class="btn gold" data-go="home">Done</button></div>`);
}
const frame = (ctx, label, body) => `
  <div class="row"><button class="back btn small" id="quit">✕</button><div class="prog grow"><i style="width:${ctx ? ((ctx.i / ctx.n) * 100).toFixed(0) : 0}%"></i></div></div>
  <div class="stage"><span class="tag">${label}</span>${body}</div>`;

// ---------------- learn a new word
function learnCard(w, ctx) {
  return new Promise((resolve) => {
    Store.meet(w.w);
    show(frame(ctx, `New word · ${TRACK[w.t]?.[1] || ""}`, `
      <div class="card col">
        <div class="row between"><div class="big grow">${esc(w.w)}</div><button class="speak-ico" data-say="${esc(w.w)}">🔊</button></div>
        <div class="bigkn kn">${esc(w.k)}</div>
        <p class="mean">${esc(w.m)}</p>
        ${w.s ? `<div class="row ex"><div class="grow">${exHtml(w.s, w.w)}</div><button class="speak-ico" data-say="${esc(w.s)}">🔊</button></div>` : ""}
      </div>
      ${Speech.canListen ? `<button class="mic" id="mic">🎤</button><p class="heard" id="hd">Tap the mic and say “${esc(w.w)}”</p>` : ""}
      <button class="btn gold" id="next">Next ›</button>`));
    $("#quit").onclick = () => resolve("quit");
    say(w.w).then(() => w.s && wait(300)).then(() => w.s && app.contains($("#next")) && say(w.s, { rate: 0.88 }));
    if ($("#mic")) $("#mic").onclick = () => micTry(w.w, $("#mic"), $("#hd"), () => Store.spoke("word"));
    $("#next").onclick = () => resolve("ok");
  });
}
async function micTry(target, btn, out, onOk) {
  if (btn.classList.contains("rec")) return;
  stopSpeaking(); btn.classList.add("rec"); out.textContent = "Listening…";
  try {
    const r = await listen({ timeout: 5000, onInterim: (t) => (out.textContent = `“${t}”`), done: (x) => heardWord(x, target) });
    if (r.ms !== null) { out.innerHTML = `✅ <b>Perfect!</b>`; onOk && onOk(); }
    else out.innerHTML = r.text ? `I heard “${esc(r.text)}”. Try again.` : "I didn't hear you. Try again.";
  } catch (e) { out.textContent = e.message === "not-allowed" ? "Please allow the microphone in settings." : "Mic not available."; }
  btn.classList.remove("rec");
}

// ---------------- fast recall: Kannada -> say the English word
function recallCardRun(w, ctx, { label = "Fast recall", soft = false } = {}) {
  return new Promise((resolve) => {
    const LIMIT = 4000;
    show(frame(ctx, label, `
      <div class="card col">
        <p class="center muted">Say it in English</p>
        <div class="bigkn kn">${esc(w.k)}</div>
        <p class="mean">${esc(w.m)}</p>
      </div>
      <div class="timer"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" id="ring" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="0"/></svg><b id="tm">0.0</b></div>
      <div id="zone" class="col"></div>`));
    let over = false, t0 = performance.now(), raf = 0;
    const end = (r) => { if (over) return; over = true; cancelAnimationFrame(raf); resolve(r); };
    $("#quit").onclick = () => { stopSpeaking(); end("quit"); };
    const tick = () => {
      const el = performance.now() - t0, k = Math.min(1, el / LIMIT);
      if (!$("#ring")) return;
      $("#ring").style.strokeDashoffset = (264 * k).toFixed(1); $("#tm").textContent = (el / 1000).toFixed(1);
      $("#ring").style.stroke = el < 2000 ? "var(--leaf)" : el < LIMIT ? "var(--gold)" : "var(--red)";
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    const reveal = (ok, ms, why) => {
      cancelAnimationFrame(raf);
      $("#zone").innerHTML = `
        <div class="result ${ok ? (ms !== null && ms < 2000 ? "ok" : "mid") : "bad"}">${ok ? (ms !== null ? `${ms < 2000 ? "⚡ Fast!" : "✅ Right!"} ${secs(ms)}` : "✅ Right!") : why || "The word is:"}</div>
        <div class="big">${esc(w.w)}</div>
        ${w.s ? `<div class="row ex"><div class="grow">${exHtml(w.s, w.w)}</div><button class="speak-ico" data-say="${esc(w.s)}">🔊</button></div>` : ""}
        ${!ok && Speech.canListen ? `<button class="mic" id="mic2">🎤</button><p class="heard" id="hd2">Say “${esc(w.w)}” once now</p>` : ""}
        ${!ok && Speech.canListen && why && !why.startsWith("No problem") ? `<button class="btn ghost" id="fix">✋ I said it right. Count it.</button>` : ""}
        <button class="btn gold" id="next">Next ›</button>`;
      say(w.w);
      if ($("#mic2")) $("#mic2").onclick = () => micTry(w.w, $("#mic2"), $("#hd2"), () => Store.spoke("word"));
      if ($("#fix")) $("#fix").onclick = () => { Store.grade(w.w, true, null); end("ok"); };
      $("#next").onclick = () => end(ok ? "ok" : "bad");
    };
    if (!Speech.canListen) {
      $("#zone").innerHTML = `<button class="btn ink" id="rv">Show answer</button>`;
      requestAnimationFrame(tick);
      $("#rv").onclick = () => {
        const ms = performance.now() - t0; cancelAnimationFrame(raf);
        $("#zone").innerHTML = `<div class="big">${esc(w.w)}</div><div class="row"><button class="btn" id="no">I didn't know</button><button class="btn gold" id="yes">I knew it</button></div>`; say(w.w);
        $("#yes").onclick = () => { Store.grade(w.w, true, soft ? null : ms < 6000 ? ms : null); end("ok"); };
        $("#no").onclick = () => { Store.grade(w.w, false); end("bad"); };
      };
      return;
    }
    $("#zone").innerHTML = `<p class="heard" id="hd">Listening… say the English word</p><button class="btn ghost" id="skip">I don't know</button>`;
    let cancelled = false;
    $("#skip").onclick = () => { cancelled = true; Store.grade(w.w, false); reveal(false, null, "No problem. Learn it now:"); };
    t0 = performance.now(); requestAnimationFrame(tick);
    listen({ timeout: 7000, onInterim: (t) => $("#hd") && ($("#hd").textContent = `“${t}”`), done: (x) => heardWord(x, w.w) })
      .then((r) => {
        if (cancelled || over) return;
        if (r.ms !== null) { Store.grade(w.w, true, soft ? null : r.ms); Store.spoke("word"); reveal(true, r.ms); setTimeout(() => !over && $("#next") && end("ok"), r.ms < 2000 ? 1400 : 2200); }
        else { Store.grade(w.w, false); reveal(false, null, r.text ? `I heard “${esc(r.text)}”. The word is:` : "Time's up. The word is:"); }
      })
      .catch((e) => {
        if (cancelled || over) return;
        $("#zone").innerHTML = `<p class="heard">${e.message === "not-allowed" ? "Allow the microphone to practise speaking." : "Mic not available."}</p><button class="btn ink" id="rv">Show answer</button>`;
        $("#rv").onclick = () => { reveal(false, null, "The word is:"); };
      });
    leaving = () => { cancelled = true; };
  });
}

// ---------------- shadowing: hear a sentence, say it back
function shadowCard(sentence, kn, { label = "Shadowing" } = {}) {
  return (ctx) => new Promise((resolve) => {
    show(frame(ctx, label, `
      <div class="card col">
        <div class="row"><div class="grow" style="font-size:1.3rem;font-weight:700;line-height:1.35" id="sent">${esc(sentence)}</div><button class="speak-ico" id="play">🔊</button></div>
        ${kn ? `<p class="kn muted" style="font-weight:600">${esc(kn)}</p>` : ""}
        <div class="seg"><button id="slow">🐢 Slow</button><button id="norm" class="on">Normal</button></div>
      </div>
      ${Speech.canListen ? `<button class="mic" id="mic">🎤</button><p class="heard" id="hd">Listen, then tap the mic and say it</p>` : `<p class="heard">Read it out loud 3 times.</p>`}
      <div id="res"></div>
      <button class="btn gold" id="next">Next ›</button>`));
    let rate = 0.9; $("#quit").onclick = () => resolve("quit");
    const play = () => say(sentence, { rate });
    $("#play").onclick = play;
    $("#slow").onclick = () => { rate = 0.65; $("#slow").classList.add("on"); $("#norm").classList.remove("on"); play(); };
    $("#norm").onclick = () => { rate = 0.9; $("#norm").classList.add("on"); $("#slow").classList.remove("on"); play(); };
    play();
    let best = 0;
    if ($("#mic")) $("#mic").onclick = async () => {
      const btn = $("#mic"); if (btn.classList.contains("rec")) return; stopSpeaking(); btn.classList.add("rec"); $("#hd").textContent = "Listening…";
      const t0 = performance.now();
      try {
        const r = await listen({ timeout: 9000, onInterim: (t) => ($("#hd").textContent = `“${t}”`), done: (x) => sentenceScore(x, sentence).score >= 0.999 });
        if (!document.body.contains(btn)) return;
        const sc = sentenceScore(r.text, sentence), pct = Math.round(sc.score * 100);
        const words = sentence.split(/\s+/); let k = 0;
        const marked = words.map((wd) => { const clean = wd.replace(/[^A-Za-z']/g, ""); if (!clean) return esc(wd); const cls = sc.hit[k++] ? "hit" : "miss"; return `<span class="${cls}">${esc(wd)}</span>`; }).join(" ");
        $("#sent").innerHTML = `<div class="words" style="justify-content:flex-start">${marked}</div>`;
        const dur = ((r.ms ?? performance.now() - t0) / 1000);
        $("#res").innerHTML = `<div class="result ${pct >= 85 ? "ok" : pct >= 60 ? "mid" : "bad"}">${pct >= 85 ? "🌟 Excellent!" : pct >= 60 ? "👍 Good, try once more" : "Try again, slowly"} · ${pct}% matched</div>`;
        $("#hd").textContent = r.text ? `You said: “${r.text}”` : "I didn't hear you.";
        if (pct >= 60 && best < 60) Store.spoke("sentence");
        best = Math.max(best, pct); void dur;
      } catch (e) { $("#hd").textContent = e.message === "not-allowed" ? "Please allow the microphone." : "Mic not available."; }
      btn.classList.remove("rec");
    };
    $("#next").onclick = () => resolve("ok");
  });
}

// ============================================================ practice modes
async function recallDrill() {
  const pool = Store.learned();
  if (pool.length < 4) { toast("Do today's session first to learn some words."); return home(); }
  const due = Store.due(10), rest = shuffle(pool.filter((w) => !due.includes(w)));
  // weakest and slowest words first
  rest.sort((a, b) => ((Store.mem(a.w)?.b || 0) - (Store.mem(b.w)?.b || 0)) || ((Store.mem(b.w)?.ms || 9e3) - (Store.mem(a.w)?.ms || 9e3)));
  const list = [...due, ...rest].slice(0, 10), t0 = Date.now();
  for (let i = 0; i < list.length; i++) { const r = await recallCardRun(list[i], { i, n: list.length }, { label: "⚡ Fast recall" }); if (r === "quit") break; }
  Store.addMinutes((Date.now() - t0) / 60000); home();
}
function shadowMenu() {
  const learned = Store.learned().filter((w) => w.s), p = Store.p;
  const sets = [
    ["🆕", "My recent words", "Sentences with words you learned", learned.slice(-12)],
    ...p.tracks.map((t) => [TRACK[t][0], TRACK[t][1], "Real sentences from this topic", WORDS.filter((w) => w.t === t)]),
  ];
  show(`${top("🗣️ Shadowing")}
    <p class="muted">Listen to a sentence, then say it the same way. This trains your mouth to speak English smoothly and faster.</p>
    <div class="list">${sets.map((s, i) => `<button class="item" data-i="${i}" ${s[3].length ? "" : "disabled"}><i>${s[0]}</i><div class="grow"><b>${s[1]}</b><small class="muted">${s[3].length ? s[2] : "Learn some words first"}</small></div><span>›</span></button>`).join("")}</div>`);
  app.querySelectorAll(".item[data-i]").forEach((b) => (b.onclick = async () => {
    const list = shuffle(sets[+b.dataset.i][3]).slice(0, 6), t0 = Date.now();
    for (let i = 0; i < list.length; i++) { const r = await shadowCard(list[i].s, "", { label: `🗣️ Shadowing · ${list[i].w}` })({ i, n: list.length }); if (r === "quit") break; }
    Store.addMinutes((Date.now() - t0) / 60000); shadowMenu();
  }));
}
function phraseList() {
  const groups = {}; for (const ph of PHRASES) (groups[ph[2]] = groups[ph[2]] || []).push(ph);
  const NAMES = { listening: "When you don't understand", thinking: "When you need time to think", opinion: "Giving your opinion", linking: "Joining your ideas", polite: "Being polite", social: "Friendly talk", doctor: "As a doctor", work: "At work", study: "In college" };
  show(`${top("🧩 Speaking phrases")}
    <p class="muted">Fluent speakers use these all the time. Learn them and you'll never get stuck in the middle of a sentence.</p>
    <button class="btn gold" id="drill">▶ Practise 6 phrases</button>
    ${Object.entries(groups).map(([g, list]) => `<h3>${NAMES[g] || g}</h3><div class="list">${list.map((ph) => `<button class="item" data-say="${esc(ph[0])}"><div class="grow"><b>${esc(ph[0])}</b><small class="kn muted">${esc(ph[1])}</small></div><span>🔊</span></button>`).join("")}</div>`).join("")}`);
  $("#drill").onclick = async () => {
    const list = shuffle(PHRASES.filter((x) => Store.p.tracks.includes(x[2]) || !["doctor", "work"].includes(x[2]))).slice(0, 6), t0 = Date.now();
    for (let i = 0; i < list.length; i++) { const r = await shadowCard(list[i][0], list[i][1], { label: "🧩 Speaking phrase" })({ i, n: list.length }); if (r === "quit") break; }
    Store.addMinutes((Date.now() - t0) / 60000); phraseList();
  };
}

// ============================================================ conversations
function convList() {
  const p = Store.p, order = [...p.tracks, ...Object.keys(TRACK).filter((t) => !p.tracks.includes(t) && t !== "mine")];
  show(`${top("💬 Conversations")}
    <p class="muted">Real situations. You see what you want to say in Kannada, pick the right English, then <b>say it out loud</b>.</p>
    ${order.map((t) => { const list = CONVS.filter((c) => c.track === t); if (!list.length) return "";
      return `<h3>${TRACK[t][0]} ${TRACK[t][1]}</h3><div class="list">${list.map((c) => { const d = p.convs[c.id];
        return `<button class="item" data-c="${c.id}"><i>${c.icon}</i><div class="grow"><b>${esc(c.title)}</b><small class="muted kn">${esc(c.kn)}</small></div><span>${d ? "✅" : "›"}</span></button>`; }).join("")}</div>`; }).join("")}`);
  app.querySelectorAll("[data-c]").forEach((b) => (b.onclick = () => runConv(CONVS.find((c) => c.id === b.dataset.c))));
}
function runConv(cv) {
  const me = Store.p.name, fill = (t) => t.replace(/\{me\}/g, me), t0 = Date.now();
  show(`<div class="top"><button class="back" id="x">‹</button><div class="grow"><h3>${cv.icon} ${esc(cv.name)}</h3><small class="muted">${esc(cv.title)}</small></div></div>
    <div class="chat" id="chat"></div><div id="turn" class="col"></div>`);
  let i = 0, spoken = 0, closed = false;
  const close = () => { closed = true; Store.addMinutes((Date.now() - t0) / 60000); convList(); };
  $("#x").onclick = close; leaving = () => { closed = true; };
  const chat = $("#chat"), turn = $("#turn");
  const bubble = (cls, en, kn) => { const d = document.createElement("div"); d.className = "bub " + cls; d.innerHTML = `${esc(en)}${kn ? `<small class="kn muted">${esc(kn)}</small>` : ""}`; chat.appendChild(d); d.scrollIntoView({ behavior: "smooth", block: "end" }); return d; };
  const step = async () => {
    if (closed) return;
    if (i >= cv.lines.length) {
      Store.convDone(cv.id, spoken); Store.addMinutes((Date.now() - t0) / 60000);
      turn.innerHTML = `<div class="result ok">🎉 Conversation complete! You spoke ${spoken} sentence${spoken === 1 ? "" : "s"} out loud.</div><div class="row"><button class="btn" id="again">↻ Again</button><button class="btn gold" id="done">Done</button></div>`;
      $("#again").onclick = () => runConv(cv); $("#done").onclick = () => { closed = true; convList(); };
      return;
    }
    const L = cv.lines[i++];
    if (L[0] === "n") {
      turn.innerHTML = `<p class="heard">…</p>`; bubble("them", L[1], L[2]); await say(L[1], { rate: 0.9 }); await wait(350); step();
    } else yourTurn(L);
  };
  const yourTurn = (L) => {
    const right = fill(L[2]), opts = shuffle([L[2], L[3], L[4]].map(fill));
    turn.innerHTML = `<div class="want"><small>You want to say</small><span class="kn">${esc(fill(L[1]))}</span></div><div class="opts">${opts.map((o, k) => `<button class="btn" data-k="${k}">${esc(o)}</button>`).join("")}</div><p class="heard" id="msg">Pick the correct English sentence.</p>`;
    turn.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => {
      const o = opts[+b.dataset.k];
      if (o !== right) { b.classList.add("bad"); b.disabled = true; $("#msg").innerHTML = "Not quite. Look at the grammar again."; return; }
      b.classList.add("ok"); setTimeout(() => sayIt(right), 350);
    }));
  };
  const sayIt = (right) => {
    const mine = bubble("me", right, "");
    if (!Speech.canListen) { turn.innerHTML = `<p class="heard">Read it out loud, then continue.</p><button class="btn gold" id="nx">Next ›</button>`; say(right, { rate: 0.85 }); $("#nx").onclick = step; return; }
    turn.innerHTML = `<p class="heard" id="msg">Now <b>say it out loud</b>. Tap the mic.</p><div class="row"><button class="speak-ico" id="hear">🔊</button><button class="mic" id="mic">🎤</button><button class="btn ghost small" id="sk">Skip</button></div>`;
    $("#hear").onclick = () => say(right, { rate: 0.85 });
    $("#sk").onclick = step;
    say(right, { rate: 0.85 });
    $("#mic").onclick = async () => {
      const btn = $("#mic"); if (btn.classList.contains("rec")) return; stopSpeaking(); btn.classList.add("rec"); $("#msg").textContent = "Listening…";
      try {
        const r = await listen({ timeout: 9000, onInterim: (t) => ($("#msg").textContent = `“${t}”`), done: (x) => sentenceScore(x, right).score >= 0.999 });
        if (!document.body.contains(btn)) return;
        const sc = Math.round(sentenceScore(r.text, right).score * 100);
        if (sc >= 70) { spoken++; Store.spoke("sentence"); mine.classList.add("said"); $("#msg").innerHTML = `🌟 Well said! (${sc}%)`; await wait(700); step(); return; }
        $("#msg").innerHTML = r.text ? `I heard “${esc(r.text)}” (${sc}%). Try again slowly, or skip.` : "I didn't hear you. Try again.";
      } catch (e) { $("#msg").textContent = "Mic not available. Tap Skip."; }
      btn.classList.remove("rec");
    };
  };
  step();
}

// ============================================================ stories
const WMAP = new Map(WORDS.map((w) => [w.w.toLowerCase(), w]));
for (const [w, [k, m]] of Object.entries(GLOSS)) if (!WMAP.has(w)) WMAP.set(w, { w, k, m, gloss: true });
const lookup = (raw) => { const t = raw.toLowerCase().replace(/[^a-z'-]/g, "").replace(/'s$/, ""); if (!t) return null;
  for (const c of [t, t.replace(/s$/, ""), t.replace(/es$/, ""), t.replace(/ed$/, ""), t.replace(/d$/, ""), t.replace(/ing$/, ""), t.replace(/ing$/, "e"), t.replace(/ies$/, "y"), t.replace(/ied$/, "y"), t.replace(/ly$/, "")]) { const w = WMAP.get(c); if (w) return w; }
  return { w: t, k: "", m: "" }; };
const CAST = [["🐰", "Bangara", "kind, wants to be a doctor"], ["🍛", "Kumbu", "always hungry, very funny"], ["💪", "Gundamma", "brave and practical"], ["🌀", "Teju", "good heart, slightly crazy ideas"], ["😇", "Harshith", "good boy, innocent and honest"]];
function storyList() {
  const p = Store.p; p.stories = p.stories || {};
  show(`${top("📚 Stories with friends")}
    <p class="muted">Short stories about five friends. Listen, read along, <b>tap any word</b> for its meaning, say lines out loud, then answer 3 questions.</p>
    <div class="cast">${CAST.map(([i, n, d]) => `<div><i>${i}</i><b>${n}</b><small>${d}</small></div>`).join("")}</div>
    <div class="list">${STORIES.map((s) => { const d = p.stories[s.id];
      return `<button class="item" data-s="${s.id}"><i>${s.icon}</i><div class="grow"><b>${esc(s.title)}</b><small class="muted"><span class="chip">${esc(s.genre)}</span> <span class="kn">${esc(s.kn)}</span></small></div><span>${d ? `✅ ${d.best}/3` : "›"}</span></button>`; }).join("")}</div>`);
  app.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => runStory(STORIES.find((s) => s.id === b.dataset.s))));
}
function runStory(st) {
  const p = Store.p, t0 = Date.now(); p.stories = p.stories || {};
  let i = 0, spoken = 0, closed = false, kn = p.storyKn !== false;
  show(`<div class="top"><button class="back" id="x">‹</button><div class="grow"><h3>${st.icon} ${esc(st.title)}</h3><small class="muted">${esc(st.genre)} · <span class="kn">${esc(st.kn)}</span></small></div><button class="btn small ghost" id="kn">ಕನ್ನಡ</button></div>
    <div class="prog"><i id="pr" style="width:0"></i></div>
    <div class="story" id="past"></div><div id="now" class="col"></div><div id="wsheet" class="wsheet" hidden></div>`);
  const close = () => { closed = true; Store.addMinutes((Date.now() - t0) / 60000); storyList(); };
  $("#x").onclick = close; leaving = () => { closed = true; };
  const setKn = () => { $("#kn").classList.toggle("on", kn); app.querySelectorAll(".story .kn, #now .kn").forEach((e) => (e.hidden = !kn)); };
  $("#kn").onclick = () => { kn = !kn; p.storyKn = kn; Store.save(); setKn(); };
  const words = (en) => en.split(/(\s+)/).map((t) => (/\S/.test(t) ? `<span class="w">${esc(t)}</span>` : t)).join("");
  app.addEventListener("click", function tap(e) {
    if (closed) return app.removeEventListener("click", tap);
    const sp = e.target.closest(".w"); if (!sp) return;
    const w = lookup(sp.textContent), ws = $("#wsheet"), sent = sp.closest("[data-en]")?.dataset.en || "";
    say(w.w, { rate: 0.8 });
    ws.innerHTML = `<div class="row between"><b class="big">${esc(w.w)}</b><button class="speak-ico" data-say="${esc(w.w)}">🔊</button></div>${w.k ? `<div class="kn">${esc(w.k)}</div>` : ""}${w.m ? `<small class="muted">${esc(w.m)}</small>` : w.k ? "" : `<small class="muted">Not in the word list yet.</small>`}
      <div class="row"><button class="btn small" id="addw">＋ My words</button><button class="btn small ghost" id="cw">Close</button></div>`;
    ws.hidden = false;
    $("#cw").onclick = () => (ws.hidden = true);
    $("#addw").onclick = () => { const inBank = WMAP.has(w.w) && !WMAP.get(w.w).gloss;
      if (!inBank && !p.mine.some((m) => m.w === w.w)) p.mine.push({ w: w.w, k: w.k || "", m: w.m || "", s: sent }); else if (inBank) Store.meet(w.w); Store.save(); ws.hidden = true; toast(`“${esc(w.w)}” saved for practice`); };
  });
  const past = $("#past"), now = $("#now");
  const line = () => {
    if (closed) return;
    $("#pr").style.width = (i / st.lines.length) * 100 + "%";
    if (i >= st.lines.length) return quiz();
    const [en, k] = st.lines[i];
    now.innerHTML = `<div class="sline" data-en="${esc(en)}"><p class="en">${words(en)}</p><p class="kn">${esc(k)}</p></div>
      <p class="heard" id="msg">${Speech.canListen ? "Listen, then say it — or tap Next." : "Listen and read along."}</p>
      <div class="row"><button class="speak-ico" id="hear">🔊</button>${Speech.canListen ? `<button class="mic" id="mic">🎤</button>` : ""}<button class="btn gold" id="nx">Next ›</button></div>`;
    setKn();
    say(en, { rate: 0.88 });
    $("#hear").onclick = () => say(en, { rate: 0.75 });
    $("#nx").onclick = () => { stopSpeaking(); const d = document.createElement("div"); d.className = "pl"; d.dataset.en = en; d.innerHTML = `<span>${words(en)}</span> <small class="kn">${esc(k)}</small>`; past.appendChild(d); i++; setKn(); line(); now.scrollIntoView({ behavior: "smooth", block: "end" }); };
    const mic = $("#mic"); if (mic) mic.onclick = async () => {
      if (mic.classList.contains("rec")) return; stopSpeaking(); mic.classList.add("rec"); $("#msg").textContent = "Listening…";
      try {
        const r = await listen({ timeout: 10000, onInterim: (t) => ($("#msg").textContent = `“${t}”`), done: (x) => sentenceScore(x, en).score >= 0.999 });
        if (!document.body.contains(mic)) return;
        const sc = Math.round(sentenceScore(r.text, en).score * 100);
        if (sc >= 70) { spoken++; Store.spoke("sentence"); $("#msg").innerHTML = `🌟 Well said! (${sc}%)`; await wait(650); if (!closed) $("#nx").click(); return; }
        $("#msg").innerHTML = r.text ? `I heard “${esc(r.text)}” (${sc}%). Try again or tap Next.` : "I didn't hear you. Try again.";
      } catch (e) { $("#msg").textContent = "Mic not available. Tap Next."; }
      mic.classList.remove("rec");
    };
  };
  const quiz = () => {
    let q = 0, score = 0;
    const ask = () => {
      if (closed) return;
      if (q >= st.quiz.length) {
        const d = p.stories[st.id] || (p.stories[st.id] = { n: 0, best: 0 }); d.n++; d.best = Math.max(d.best, score); Store.addMinutes((Date.now() - t0) / 60000); Store.save();
        now.innerHTML = `<div class="result ${score === 3 ? "ok" : "mid"}">${score === 3 ? "🎉" : "👍"} Story finished! Questions: ${score}/3 · You said ${spoken} line${spoken === 1 ? "" : "s"} out loud.</div>
          <p class="muted">Try telling this story to a friend in your own words, in English. That is the best practice.</p>
          <div class="row"><button class="btn" id="again">↻ Read again</button><button class="btn gold" id="done">More stories</button></div>`;
        $("#again").onclick = () => runStory(st); $("#done").onclick = close; now.scrollIntoView({ behavior: "smooth", block: "end" }); return;
      }
      const [qq, right, ...wrong] = st.quiz[q], opts = shuffle([right, ...wrong]); let first = true;
      now.innerHTML = `<div class="want"><small>Question ${q + 1} of ${st.quiz.length}</small><span>${esc(qq)}</span></div><div class="opts">${opts.map((o, k) => `<button class="btn" data-k="${k}">${esc(o)}</button>`).join("")}</div>`;
      say(qq, { rate: 0.9 }); now.scrollIntoView({ behavior: "smooth", block: "end" });
      now.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => {
        const o = opts[+b.dataset.k];
        if (o !== right) { first = false; b.classList.add("bad"); b.disabled = true; return; }
        if (first) score++; b.classList.add("ok"); say(right, { rate: 0.9 }); q++; setTimeout(ask, 900);
      }));
    };
    ask();
  };
  line();
}

// ============================================================ my words
function myWords() {
  const p = Store.p, learned = Store.learned().sort((a, b) => (Store.mem(a.w).b - Store.mem(b.w).b));
  show(`${top("✍️ My words")}
    <div class="card col">
      <h3>Add a word you met</h3>
      <label>English word<input id="w" autocomplete="off" autocapitalize="none" placeholder="e.g. tremendous"></label>
      <label>Kannada meaning<input id="k" class="kn" placeholder="ಅರ್ಥ"></label>
      <label>Meaning in simple English (optional)<input id="m" placeholder="very big"></label>
      <label>Your example sentence (optional)<input id="s" placeholder="The response was tremendous."></label>
      <button class="btn gold" id="add">Add to my words</button>
    </div>
    <h3>All my words (${learned.length})</h3>
    <p class="muted">●●●●● means you know it well. Weakest words are on top. Tap to hear.</p>
    <div class="list">${learned.map((w) => `<button class="item" data-say="${esc(w.w)}"><div class="grow"><b>${esc(w.w)} <span class="kn muted" style="font-weight:600">· ${esc(w.k)}</span></b><small class="muted">${esc(w.m || "")}</small></div><div class="col" style="gap:0;align-items:flex-end">${dots(Store.mem(w.w).b)}<small class="muted">${Store.mem(w.w).ms ? secs(Store.mem(w.w).ms) : ""}</small></div></button>`).join("") || `<p class="muted">No words yet.</p>`}</div>`);
  $("#add").onclick = () => {
    const w = $("#w").value.trim().toLowerCase(), k = $("#k").value.trim();
    if (!w || !k) return toast("Type the word and its Kannada meaning");
    if (Store.word(w) && Store.mem(w)) return toast("You already have this word");
    p.mine = p.mine.filter((x) => x.w !== w); p.mine.push({ w, k, m: $("#m").value.trim(), s: $("#s").value.trim() });
    Store.save(); toast(`“${esc(w)}” added. It will appear in your next session.`); myWords();
  };
}

// ============================================================ progress
function progress() {
  const st = Store.stats(), days = [];
  for (let d = dayNum() - 13; d <= dayNum(); d++) days.push(st.days.find((x) => x.d === d) || { d, ms: null, n: 0 });
  const max = Math.max(4000, ...days.map((d) => d.ms || 0));
  const trend = st.avgMs && st.avgMsBefore ? Math.round((1 - st.avgMs / st.avgMsBefore) * 100) : null;
  const byTrack = {}, totals = {}; for (const w of Store.learned()) byTrack[w.t] = (byTrack[w.t] || 0) + 1;
  for (const w of WORDS) totals[w.t] = (totals[w.t] || 0) + 1; totals.mine = Store.p.mine.length;
  show(`${top("📈 My progress")}
    <div class="stats">
      <div class="stat"><b>${st.learned}</b><small>words learned</small></div>
      <div class="stat"><b>${st.strong}</b><small>strong words</small></div>
      <div class="stat"><b>${st.fast}</b><small>instant (&lt;2 s)</small></div>
      <div class="stat"><b>${st.sentences}</b><small>sentences spoken</small></div>
      <div class="stat"><b>🔥 ${st.streak}</b><small>streak (best ${st.best})</small></div>
      <div class="stat"><b>${st.minutes}</b><small>minutes practised</small></div>
    </div>
    <div class="card col">
      <h3>⚡ Recall speed, last 14 days</h3>
      <p class="muted">How long you take to say a word. Shorter bars = faster speaking.${trend !== null ? ` <b style="color:var(--leaf)">${trend > 0 ? `${trend}% faster` : `${-trend}% slower`}</b> than before.` : ""}</p>
      <div class="chart">${days.map((d) => `<div class="${d.ms ? "" : "none"}" style="height:${d.ms ? Math.max(6, (d.ms / max) * 100) : 4}%" title="${d.ms ? secs(d.ms) : ""}"></div>`).join("")}</div>
      <div class="chart-x">${days.map((d, i) => `<span>${i % 2 ? "" : new Date(d.d * 864e5).getDate()}</span>`).join("")}</div>
    </div>
    <div class="card col"><h3>Words by topic</h3>${Object.entries(TRACK).map(([t, [i, n]]) => totals[t] ? `<div class="col" style="gap:4px"><div class="row between"><span>${i} ${n}</span><b>${byTrack[t] || 0} / ${totals[t]}</b></div><div class="prog"><i style="width:${(((byTrack[t] || 0) / totals[t]) * 100).toFixed(1)}%"></i></div></div>` : "").join("")}</div>
    <p class="muted center">${Math.max(0, st.total - st.learned)} words left to learn · about ${Math.ceil(Math.max(0, st.total - st.learned) / Store.p.perDay)} days at ${Store.p.perDay} a day</p>`);
}

// ============================================================ share with a friend
function share() {
  const p = Store.p, f = p.friend;
  show(`${top("🤝 Learn together")}
    <div class="card col">
      <h3>📤 Send my progress</h3>
      <p class="muted">Sends a short code with your numbers (no personal data). Your friend pastes it in their app.</p>
      <button class="btn gold" id="send">Share on WhatsApp</button>
    </div>
    <div class="card col">
      <h3>📥 Friend's progress</h3>
      ${f ? `<div class="friend"><div class="av">🐼</div><div class="grow"><b>${esc(f.n)}</b><br><small class="muted">updated ${ago(f.ts)}</small></div></div>
        <div class="stats"><div class="stat"><b>${f.l}</b><small>words</small></div><div class="stat"><b>🔥 ${f.k}</b><small>streak</small></div><div class="stat"><b>${f.a ? secs(f.a) : "–"}</b><small>avg recall</small></div>
        <div class="stat"><b>${f.s}</b><small>strong</small></div><div class="stat"><b>${f.t}</b><small>sentences</small></div><div class="stat"><b>${f.m}</b><small>minutes</small></div></div>
        ${compare(f)}` : `<p class="muted">No code yet. Ask your friend to share theirs.</p>`}
      <textarea id="code" placeholder="Paste your friend's BANGARA-… code here"></textarea>
      <button class="btn ink" id="read">Show friend's progress</button>
    </div>`);
  $("#send").onclick = async () => {
    const st = Store.stats(), code = Store.shareCode();
    const text = `🐰 ${p.name}'s English progress: ${st.learned} words, 🔥 ${st.streak}-day streak, ${st.sentences} sentences spoken.\nPaste this code in Bangara English Coach:\n${code}`;
    const S = Plug("Share");
    try { if (S) await S.share({ title: "My English progress", text, dialogTitle: "Share progress" }); else if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast("Copied! Paste it in WhatsApp."); } }
    catch (e) { try { await navigator.clipboard.writeText(text); toast("Copied! Paste it in WhatsApp."); } catch (e2) {} }
  };
  $("#read").onclick = () => { const d = Store.readCode($("#code").value); if (!d) return toast("That code doesn't look right. Copy the whole message."); Store.setFriend(d); toast(`Showing ${esc(d.n)}'s progress`); share(); };
}
function compare(f) {
  const st = Store.stats(), lines = [];
  if (st.learned !== f.l) lines.push(st.learned > f.l ? `You know <b>${st.learned - f.l}</b> more words.` : `${esc(f.n)} knows <b>${f.l - st.learned}</b> more words. Catch up!`);
  if (st.streak && f.k) lines.push(`Together: 🔥 ${st.streak + f.k} streak days.`);
  return lines.length ? `<div class="result mid">${lines.join(" ")}</div>` : "";
}

// ============================================================ settings
function settings() {
  const p = Store.p, profs = Object.entries(Store.all.profiles);
  show(`${top("⚙️ Settings")}
    <div class="card col"><b>Topics</b><div class="seg" id="tr">${Object.entries(TRACK).filter(([k]) => k !== "mine").map(([k, [i, n]]) => `<button data-t="${k}" class="${p.tracks.includes(k) ? "on" : ""}">${i} ${n}</button>`).join("")}</div></div>
    <div class="card col"><b>New words per day</b><div class="seg" id="pd">${[3, 5, 8, 10, 15].map((n) => `<button data-n="${n}" class="${n === p.perDay ? "on" : ""}">${n}</button>`).join("")}</div></div>
    <div class="card col"><b>Daily reminder</b><input type="time" id="rm" value="${p.remind || "20:00"}"><small class="muted">A notification reminds you to practise.</small></div>
    <div class="card col"><b>Microphone</b><button class="btn" id="mt">🎤 Test microphone</button><p class="heard" id="mth"></p></div>
    <div class="card col"><b>People on this phone</b>
      ${profs.map(([id, x]) => `<div class="row between"><span>${id === Store.all.cur ? "✅" : "👤"} ${esc(x.name)}</span>${id === Store.all.cur ? "" : `<button class="btn small" data-sw="${id}">Switch</button>`}</div>`).join("")}
      <button class="btn" id="np">+ Add another person</button>
    </div>
    <p class="muted center">Bangara English Coach · ${WORDS.length} words · ${CONVS.length} conversations · ${PHRASES.length} phrases</p>`);
  $("#tr").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; const t = b.dataset.t; const on = !p.tracks.includes(t); if (!on && p.tracks.length === 1) return toast("Keep at least one topic"); p.tracks = on ? [...p.tracks, t] : p.tracks.filter((x) => x !== t); b.classList.toggle("on", on); Store.save(); };
  $("#pd").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; p.perDay = +b.dataset.n; Store.save(); $("#pd").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); };
  $("#rm").onchange = () => { p.remind = $("#rm").value; Store.save(); setReminder(); toast("Reminder set for " + p.remind); };
  $("#mt").onclick = async () => {
    $("#mth").textContent = "Say: “Hello, my name is " + p.name + "”";
    try { const r = await listen({ timeout: 6000, onInterim: (t) => ($("#mth").textContent = `“${t}”`) }); if (!$("#mth")) return; $("#mth").innerHTML = r.text ? `✅ Working! I heard: “${esc(r.text)}”` : "I didn't hear anything. Check the mic permission."; }
    catch (e) { $("#mth").textContent = e.message === "not-allowed" ? "Microphone blocked. Allow it in Android Settings › Apps › Bangara › Permissions." : "Speech recognition isn't available on this device."; }
  };
  app.querySelectorAll("[data-sw]").forEach((b) => (b.onclick = () => { Store.switchTo(b.dataset.sw); home(); }));
  $("#np").onclick = () => { Store.all.cur = null; welcome(); };
}

// ============================================================ reminders (Android)
async function setReminder(first) {
  const LN = Plug("LocalNotifications"); if (!LN || !Store.p) return;
  try {
    const perm = await LN.checkPermissions(); if (perm.display !== "granted") { const r = await LN.requestPermissions(); if (r.display !== "granted") return; }
    const [h, m] = (Store.p.remind || "20:00").split(":").map(Number);
    await LN.cancel({ notifications: [{ id: 1 }] }).catch(() => {});
    await LN.schedule({ notifications: [{ id: 1, title: "🐰 Time for English!", body: "10 minutes today keeps your words fresh. Your streak is waiting!", schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } }] });
    if (first) toast(`Daily reminder at ${Store.p.remind}`);
  } catch (e) {}
}

// ============================================================ start
Store.load(); if (Store.p) setReminder();
if (Plug("App")) Plug("App").addListener("backButton", () => { if ($(".back[data-go]")) go($(".back[data-go]").dataset.go); else if ($("#quit")) $("#quit").click(); else if ($("#x")) $("#x").click(); else Plug("App").exitApp(); });
go(Store.p ? "home" : "welcome");
window.COACH = { Store, go };
