"use strict";
/* UI module – menus, HUD, gate sheet, results, pause.
   Characters: Judy Hopps (rabbit 🐰) and Nick Wilde (fox 🦊) from Zootopia. */

/* ---- globals every module uses ---- */
let MYKIND="rabbit";
function myName(){return(document.getElementById("nmIn")||{}).value||"Judy";}

/* ---- tiny helpers ---- */
const $=id=>document.getElementById(id);
const hide=id=>{const e=$(id);if(e)e.hidden=true};
const show=id=>{const e=$(id);if(e)e.hidden=false};
function showOnly(id){
  ["menu","intro","help","lobby","results","book","pause","cave","hud"].forEach(hide);
  show(id);
}

/* ---- sound toggle ---- */
let _muted=false;
function applySound(){
  _muted=PROG.muted||false;
  setMute(_muted);
  const lbl=_muted?"🔇 Sound off":"🔊 Sound on";
  const psS=$("psSound");if(psS)psS.textContent=lbl;
  const mS=$("mSound");if(mS)mS.textContent=lbl;
}
$("mSound").onclick=()=>{PROG.muted=!PROG.muted;saveProg();applySound()};
$("psSound").onclick=()=>{PROG.muted=!PROG.muted;saveProg();applySound()};
applySound();

/* ======== MENU ======== */
function buildWorlds(){
  const c=$("worlds");c.innerHTML="";
  WORLDS.forEach((w,i)=>{
    const btn=document.createElement("button");
    btn.className="world-btn"+(WI===i?" sel":"");
    btn.setAttribute("role","option");
    btn.setAttribute("aria-selected",WI===i?"true":"false");
    const stars=PROG.stars[i]??0;
    btn.innerHTML=`<span class="we">${w.e}</span><span class="wn">${w.name}</span><span class="ws">${"★".repeat(stars)}${"☆".repeat(3-stars)}</span>`;
    btn.onclick=()=>{WI=i;buildWorlds()};
    c.appendChild(btn);
  });
}

// Endless: add worlds from loop if needed
function ensureWorldsLoaded(){
  // WORLDS defined in data.js; we loop endlessly using modulo in startRace
}

$("pkR").onclick=()=>{MYKIND="rabbit";$("pkR").classList.add("on");$("pkF").classList.remove("on");$("pkR").setAttribute("aria-checked","true");$("pkF").setAttribute("aria-checked","false")};
$("pkF").onclick=()=>{MYKIND="fox";$("pkF").classList.add("on");$("pkR").classList.remove("on");$("pkF").setAttribute("aria-checked","true");$("pkR").setAttribute("aria-checked","false")};

$("mSolo").onclick=()=>{
  const seed=Math.floor(Math.random()*1e9);
  showOnly("intro");openIntro(seed);
};
$("mOnline").onclick=()=>{showOnly("lobby");NET.openLobby()};
$("mBook").onclick=()=>openBook();
$("mHelp").onclick=()=>{showOnly("help");helpSlide(0)};

// First run: auto-show help
(function(){
  if(!PROG.seenHelp){PROG.seenHelp=true;saveProg();setTimeout(()=>{showOnly("help");helpSlide(0)},400)}
  buildWorlds();
  updateBookCount();
})();

/* ======== INTRO ======== */
let _introSeed=0;
function openIntro(seed){
  _introSeed=seed??Math.floor(Math.random()*1e9);
  const w=WORLDS[WI%WORLDS.length];
  $("inTag").textContent=`World ${WI+1} · ${w.name}`;
  $("inTitle").textContent=w.name+" "+w.e;
  $("inStory").textContent=w.story||"Race through Karnataka and collect words!";
  const ul=$("inWords");ul.innerHTML="";
  w.words.forEach(x=>{
    const li=document.createElement("li");
    li.innerHTML=`<span class="wp">${x.p}</span><b>${x.a}</b> <span class="wm">${x.m}</span> <span class="kn">${x.k}</span>`;
    ul.appendChild(li);
  });
  showOnly("intro");
}
$("inHear").onclick=()=>{WORLDS[WI%WORLDS.length].words.forEach((x,i)=>setTimeout(()=>speak(x.a+". "+x.m),i*1600))};
$("inGo").onclick=()=>{startRace(1,_introSeed,null)};
$("inBack").onclick=()=>{showOnly("menu");buildWorlds()};

/* ======== HELP ======== */
let _hSlide=0;
const SLIDES=document.querySelectorAll(".slide");
function helpSlide(n){
  _hSlide=Math.max(0,Math.min(SLIDES.length-1,n));
  SLIDES.forEach((s,i)=>s.hidden=i!==_hSlide);
  $("hpN").textContent=`${_hSlide+1}/${SLIDES.length}`;
  $("hpPrev").disabled=_hSlide===0;
  $("hpNext").textContent=_hSlide===SLIDES.length-1?"Let's race!":"Next ›";
}
$("hpPrev").onclick=()=>helpSlide(_hSlide-1);
$("hpNext").onclick=()=>{if(_hSlide===SLIDES.length-1){showOnly("menu");buildWorlds()}else helpSlide(_hSlide+1)};

/* ======== BOOK ======== */
function updateBookCount(){
  const n=Object.keys(PROG.book||{}).length;
  const bc=$("bookCount");if(bc)bc.textContent=n?`${n} words`:"";
}
function openBook(){
  showOnly("book");
  const all=allWords();const total=all.length;
  const learned=Object.keys(PROG.book||{});
  $("bkFill").style.width=(learned.length/Math.max(1,total)*100)+"%";
  $("bkSum").textContent=`You know ${learned.length} of ${total} words across all worlds.`;
  const div=$("bkList");div.innerHTML="";
  WORLDS.forEach((w,wi)=>{
    const h=document.createElement("h3");h.className="label";h.style.marginTop="20px";h.textContent=`${w.e} ${w.name}`;div.appendChild(h);
    const ul=document.createElement("ul");ul.className="words";
    w.words.forEach(x=>{
      const li=document.createElement("li");
      const known=PROG.book[x.a]||PROG.book[x.a.toLowerCase()];
      li.className=known?"known":"";
      li.innerHTML=`${known?"✅ ":"🔒 "}<span class="wp">${x.p}</span><b>${x.a}</b> – ${x.m} <span class="kn">${x.k}</span>`;
      ul.appendChild(li);
    });
    div.appendChild(ul);
  });
  updateBookCount();
}
$("bkBack").onclick=()=>{showOnly("menu");buildWorlds()};

/* ======== HUD ======== */
const UI={
  dirty:true,
  enterRace(){
    showOnly("hud");
    show("hud");
    $("hud").hidden=false;
    $("count").hidden=false;
    this._buildCards();
    this.dirty=true;
    // Pause button
    $("btnPause").onclick=()=>{
      if(!G||G.phase==="finished"||G.phase==="yaksha")return;
      G.phase="paused";running=false;
      $("psNote").textContent=`World ${WI+1}: ${WORLDS[WI%WORLDS.length].name}`;
      showOnly("pause");show("hud");
    };
  },
  bottomH(){
    const c=$("cards");return c?(c.offsetHeight||88)+8:96;
  },
  menuOpen(){return !$("menu").hidden||!$("intro").hidden||!$("help").hidden||!$("lobby").hidden||!$("results").hidden||!$("book").hidden||!$("pause").hidden},
  _buildCards(){
    const c=$("cards");if(!c)return;
    c.innerHTML="";
    if(!G)return;
    const L=G.lanes[0];
    for(let i=0;i<3;i++){
      const btn=document.createElement("button");
      btn.className="card";btn.dataset.ci=i;
      btn.onclick=()=>cast(0,+btn.dataset.ci);
      c.appendChild(btn);
    }
    this.dirty=true;
  },
  hud(){
    if(!G)return;
    // track
    const L=G.lanes[0],R=G.lanes[1];
    const me=Math.min(1,L.d/FIN),rv=Math.min(1,R.d/FIN);
    $("trkFill").style.width=(me*100)+"%";
    $("trkMe").style.left=(me*100)+"%";
    $("trkRv").style.left=(rv*100)+"%";
    $("trkMe").textContent=MYKIND==="rabbit"?"🐰":"🦊";
    $("trkRv").textContent=MYKIND==="rabbit"?"🦊":"🐰";
    $("hudWords").textContent="📖 "+(G.seen?G.seen.size:0);
    // effects chips
    const efx=$("effects");
    if(efx){
      const chips=[];
      if(L.boost>0)chips.push(`<span class="chip green">⚡ FAST</span>`);
      if(L.shield>0)chips.push(`<span class="chip blue">🛡️ SHIELD</span>`);
      if(L.stun>0)chips.push(`<span class="chip red">🙈 STUNNED</span>`);
      if(L.tired>0)chips.push(`<span class="chip orange">😩 TIRED</span>`);
      if(L.wet>0)chips.push(`<span class="chip blue">💧 WET</span>`);
      efx.innerHTML=chips.join("");
    }
    // cards
    if(!this.dirty)return;this.dirty=false;
    const c=$("cards");if(!c)return;
    const cards=c.querySelectorAll(".card");
    cards.forEach((btn,i)=>{
      const card=L.cards[i];
      if(!card){btn.className="card empty";btn.innerHTML="";return}
      const full=card.n>=card.w.length;
      btn.className="card"+(full?" ready":"");
      const P=POWERS[card.w];
      const prog=card.w.slice(0,card.n)+`<span style="opacity:.35">${card.w.slice(card.n)}</span>`;
      btn.innerHTML=`<span class="ci">${P.icon}</span><span class="cw">${prog}</span>`;
      btn.setAttribute("aria-label",`${card.w}: ${P.m}${full?" – ready to use!":""}`);
    });
  },
  count(n){
    const el=$("count");if(!el)return;
    if(n<=0){el.hidden=true;return}
    el.hidden=false;el.textContent=n<=0?"GO!":n;
    el.className="count big";
    void el.offsetWidth;el.className="count big pop";
  },
  toast(html,cls){
    const t=$("toasts");if(!t)return;
    const d=document.createElement("div");
    d.className="toast"+(cls?" "+cls:"");
    d.innerHTML=html;t.appendChild(d);
    setTimeout(()=>d.classList.add("out"),2200);
    setTimeout(()=>d.remove(),2800);
  },
  flash({icon,w,m,k,res,tone}){
    const f=$("flash");if(!f)return;
    f.hidden=false;f.className="flash "+(tone||"");
    $("flW").innerHTML=`${icon} <b>${w}</b>`;
    $("flM").textContent=m+(k?` · ${k}`:"");
    $("flR").textContent=res||"";
    clearTimeout(this._flt);this._flt=setTimeout(()=>{f.hidden=true},1800);
  },
  showGate(g){
    $("gate").hidden=false;
    $("gtN").textContent=`${G.gates.indexOf(g)+1}/3`;
    $("gtPic").textContent=g.q.p||"❓";
    $("gtQ").textContent=g.q.m;
    $("gtK").textContent=g.q.k||"";
    $("gtFb").hidden=true;$("gtGo").hidden=true;
    const doors=$("gtDoors");doors.innerHTML="";
    g.opts.forEach(o=>{
      const btn=document.createElement("button");
      btn.className="door";btn.textContent=o;
      btn.onclick=()=>{
        doors.querySelectorAll(".door").forEach(b=>{b.disabled=true;b.classList.add(b.textContent===g.q.a?"right":b===btn?"wrong":"dim")});
        const ok=gateAnswer(o);
        const fb=$("gtFb");fb.hidden=false;fb.className="feedback "+(ok?"":"no");
        fb.innerHTML=ok?`<b>✅ Correct!</b> ${g.q.a} = ${g.q.m} <span class="kn">${g.q.k}</span>`:
          `<b>❌ Not quite.</b> The word is <b>${g.q.a}</b> = ${g.q.m} <span class="kn">${g.q.k}</span>`;
        const ex=WD().words.find(x=>x.a===g.q.a);
        if(ex&&ex.s)fb.innerHTML+=`<br><span class="ex">"${ex.s.replace("___",`<b>${ex.a}</b>`)}"</span>`;
        $("gtGo").hidden=false;speak(ok?`Correct. ${g.q.a}. ${g.q.m}`:`The answer is ${g.q.a}. ${g.q.m}`);
      };
      doors.appendChild(btn);
    });
    $("gtGo").onclick=()=>{$("gate").hidden=true;resumeRun()};
  },
  startYaksha(){
    startYaksha();
  },
  results(lit){
    if(!G)return;
    showOnly("results");
    const L=G.lanes[0],R=G.lanes[1];
    const wi=WI%WORLDS.length;
    const w=WORLDS[wi];
    const iWon=L.d>=R.d||R.finished&&!L.finished===false;
    // stars: 1 for finishing, +1 for 2+ gates, +1 for 2+ lamps
    const gateS=L.gates>=2?1:0,lampS=lit>=2?1:0,baseS=1;
    const stars=Math.min(3,baseS+gateS+lampS+(L.boxes>=2?0:0));
    if(!PROG.stars[wi]||PROG.stars[wi]<stars){PROG.stars[wi]=stars;saveProg()}
    $("rsTag").textContent=`World ${WI+1} · ${w.name}`;
    const title=G.mode===3?(iWon?`🏆 ${myName()} wins!`:`${R.name} wins!`):("Well done, "+myName()+"!");
    $("rsTitle").textContent=title;
    const starEl=$("rsStars");starEl.innerHTML="";
    for(let i=0;i<3;i++){const s=document.createElement("span");s.textContent=i<stars?"★":"☆";s.className=i<stars?"star lit":"star";starEl.appendChild(s)}
    const sc=$("rsScore");
    sc.innerHTML=`<dl><dt>🚪 Gates</dt><dd>${L.gates}/3</dd><dt>📦 Boxes</dt><dd>${L.boxes}</dd><dt>🪔 Lamps</dt><dd>${lit}/3</dd><dt>📖 Words seen</dt><dd>${G.seen?G.seen.size:0}</dd></dl>`;
    // words list
    const ul=$("rsWords");ul.innerHTML="";
    if(G.seen)G.seen.forEach(a=>{
      const word=allWords().find(x=>x.a===a);if(!word)return;
      const li=document.createElement("li");
      li.innerHTML=`${word.p||""} <b>${word.a}</b> – ${word.m} <span class="kn">${word.k||""}</span>`;
      ul.appendChild(li);
    });
    $("rsWait").hidden=true;
    // endless: always allow next world
    const hasNext=true;
    $("rsNext").hidden=!hasNext;
    $("rsNext").textContent=`Next world ›`;
    $("rsNext").onclick=()=>{WI++;buildWorlds();showOnly("menu")};
    $("rsAgain").onclick=()=>{showOnly("intro");openIntro()};
    $("rsMenu").onclick=()=>{showOnly("menu");buildWorlds()};
    updateBookCount();
    playMusic("race");
  },
  pause(){
    running=false;G.phase="paused";
    $("psNote").textContent=`World ${WI+1}: ${WORLDS[WI%WORLDS.length].name}`;
    showOnly("pause");show("hud");
  }
};

/* ======== PAUSE ======== */
$("psResume").onclick=()=>{
  if(!G||G.phase!=="paused")return;
  G.phase="run";running=true;last=performance.now();
  $("pause").hidden=true;show("hud");requestAnimationFrame(loop);
};
$("psQuit").onclick=()=>{
  running=false;G=null;stopMusic();
  $("hud").hidden=true;$("count").hidden=true;$("gate").hidden=true;$("cave").hidden=true;$("flash").hidden=true;
  showOnly("menu");buildWorlds();
};

// Start attract animation (defined in game.js)
setTimeout(()=>idleAttract(),100);
