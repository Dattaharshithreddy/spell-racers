"use strict";
/* ============================================================
   UI — screens & navigation, home hub, world map, shop, word book,
   awards, settings, the in-race HUD, word gates and results.
   The game world is always alive on the canvas behind the menus.
   ============================================================ */
const $=id=>document.getElementById(id);
const SCREENS=["title","onboard","home","map","intro","help","lobby","runners","book","awards","settings","pause","results","cave"];
let navStack=[];
const ord=n=>n+(["th","st","nd","rd"][(n%100>10&&n%100<14)?0:n%10<4?n%10:0]||"th");

/* ---------- animated portraits in menus ---------- */
const PORTRAITS=new Map();
let ptRaf=0,ptT=0;
function regPortrait(c,R,opts){PORTRAITS.set(c,{R,opts:opts||{}})}
function ptLoop(){ptT+=1/60;PORTRAITS.forEach((v,c)=>{if(!c.isConnected){PORTRAITS.delete(c);return}if(!c.offsetParent)return;portrait(c,v.R,{...v.opts,t:ptT,ph:ptT*11})});ptRaf=requestAnimationFrame(ptLoop)}
ptLoop();

/* ---------- navigation ---------- */
function hideAllScreens(){SCREENS.forEach(id=>{const e=$(id);if(e)e.hidden=true})}
function go(id,opts){
  opts=opts||{};
  const cur=SCREENS.find(s=>!$(s).hidden);
  if(cur&&cur!==id&&!opts.replace&&!["pause","cave","results","title","onboard"].includes(cur))navStack.push(cur);
  hideAllScreens();const el=$(id);el.hidden=false;el.classList.remove("enter");void el.offsetWidth;el.classList.add("enter");
  document.body.dataset.screen=id;
  if(OPEN[id])OPEN[id](opts);
  if(!G||G.mode===0){startAttract()}
}
function back(){sfx("back");const p=navStack.pop()||"home";go(p,{replace:true})}
document.querySelectorAll("[data-back]").forEach(b=>b.onclick=back);
document.addEventListener("click",e=>{const b=e.target.closest("button");if(b&&!b.dataset.back&&!b.classList.contains("door")&&!b.classList.contains("opt")&&!b.classList.contains("tile")&&!b.classList.contains("card"))audio()},true);

/* ---------- toggles & settings ---------- */
function setToggle(el,on){el.classList.toggle("on",!!on);el.setAttribute("aria-checked",on?"true":"false")}

/* ---------- screens ---------- */
const OPEN={
  home(){
    playMusic("menu");
    const R=runnerById(PROG.runner);regPortrait($("hMini"),R,{head:true});
    $("hName").textContent=PROG.name||"Racer";
    const li=levelInfo(PROG.xp);$("hLvl").textContent=li.lvl;$("hXp").style.width=(li.pct*100)+"%";
    $("hCoins").textContent=PROG.coins;$("hStreak").querySelector("b").textContent=PROG.streak.n||0;
    if(!worldUnlocked(WI%WORLDS.length))WI=0;
    const w=WD(),wi=WI%WORLDS.length,st=PROG.stars[wi]||0;
    $("hWorldTag").textContent=`World ${wi+1} · ${w.tag}`;$("hWorldName").textContent=w.name;$("hWorldKn").textContent=w.kn;
    $("hWorldStars").innerHTML=[0,1,2].map(i=>`<i class="${i<st?"on":""}">★</i>`).join("");
    $("hWorldBg").style.background=`linear-gradient(160deg,${w.sky[0][0]},${w.sky[3][0]})`;$("hWorldBg").dataset.e=w.e;
    const dd=PROG.daily.date===today()&&PROG.daily.done;$("hDaily").classList.toggle("done",dd);$("hDailySub").textContent=dd?"Done today ✓":"×2 coins today";
    const due=dueWords().length;$("hDue").hidden=!due;$("hDue").textContent=due;
    G&&G.mode===0&&G.lanes[0]&&(G.lanes[0].R=R);
  },
  map(){
    const p=$("mapPath");p.innerHTML="";
    WORLDS.forEach((w,i)=>{const un=worldUnlocked(i),st=PROG.stars[i]||0;
      const b=document.createElement("button");b.className="map-node"+(un?"":" locked")+(WI%WORLDS.length===i?" sel":"");b.style.setProperty("--a",w.sky[0][0]);b.style.setProperty("--b",w.sky[3][0]);b.style.setProperty("--off",(i%2?1:-1)*8+"px");
      b.innerHTML=`<span class="mn-orb"><span>${un?w.e:"🔒"}</span></span><span class="mn-txt"><small>World ${i+1}</small><b>${w.name}</b><span class="kn">${w.kn}</span><span class="mn-stars">${[0,1,2].map(k=>`<i class="${k<st?"on":""}">★</i>`).join("")}</span>${un?"":`<em>Earn a ★ in ${WORLDS[i-1].name}</em>`}</span>`;
      b.onclick=()=>{if(!un){sfx("bad");b.classList.remove("shake");void b.offsetWidth;b.classList.add("shake");return}sfx("ui");WI=i;LAYERS={};if(G&&G.mode===0)G.hazards.forEach(h=>{const k=HZ[h.type].kind;h.type=pick(WD().pool[k==="slow"?"jump":k].filter(t=>!HZ[t].move))});go("intro")};
      p.appendChild(b)});
  },
  intro(){
    const w=WD(),wi=WI%WORLDS.length;
    $("inTag").textContent=`World ${wi+1} · ${w.tag}`;$("inTitle").innerHTML=`${w.name} <span class="kn">${w.kn}</span>`;$("inStory").textContent=w.story;$("inEmoji").textContent=w.e;
    $("inHero").style.background=`linear-gradient(180deg,${w.sky[0][0]},${w.sky[0][1]} 68%,${w.pal.edge} 68%,${w.pal.edge} 72%,${w.pal.ground[0]} 72%)`;
    const box=$("inWords");box.innerHTML="";
    w.words.forEach(x=>{const r=PROG.words[x.a],b=document.createElement("button");b.className="wchip"+(r&&r.seen?" known":"");
      b.innerHTML=`<span>${x.p}</span><b>${x.a}</b><small>${x.m}</small>${masteryDots(x.a)}`;b.onclick=()=>speak(`${x.a}. ${x.m}`);box.appendChild(b)});
  },
  help(){helpSlide(0)},
  lobby(){NET.openLobby()},
  runners(){shopTab="r";shopSel=PROG.runner;renderShop()},
  book(){bookTab="all";renderBook()},
  awards(){renderAwards()},
  settings(){renderSettings()}
};

/* ---------- title & onboarding ---------- */
$("tPlay").onclick=()=>{audio();sfx("go");playMusic("menu");if(touchStreak())checkAchievements();if(!PROG.name)go("onboard");else go("home")};
let obPick=PROG.runner;
function renderOnboard(){const box=$("obRunners");box.innerHTML="";
  RUNNERS.filter(r=>PROG.owned.runners.includes(r.id)).forEach(r=>{const b=document.createElement("button");b.className="ob-r"+(obPick===r.id?" on":"");b.setAttribute("role","radio");b.setAttribute("aria-checked",obPick===r.id);
    const c=document.createElement("canvas");b.appendChild(c);const s=document.createElement("span");s.innerHTML=`<b>${r.name}</b><small>${r.bio}</small>`;b.appendChild(s);
    b.onclick=()=>{obPick=r.id;sfx("ui");renderOnboard()};box.appendChild(b);regPortrait(c,r,{run:obPick===r.id})})}
OPEN.onboard=()=>{$("obName").value=PROG.name||"";renderOnboard();setTimeout(()=>$("obName").focus(),300)};
$("obGo").onclick=()=>{const n=$("obName").value.trim();if(!n){$("obName").classList.remove("shake");void $("obName").offsetWidth;$("obName").classList.add("shake");$("obName").focus();return}
  PROG.name=n.slice(0,12);PROG.runner=obPick;saveProg();sfx("go");
  if(!PROG.tut){WI=0;startRace(1)}else go("home")};

/* ---------- home ---------- */
$("hWorld").onclick=()=>{sfx("ui");go("map")};
$("hRace").onclick=()=>{sfx("ui");go("intro")};
$("hDaily").onclick=()=>{sfx("ui");startDaily()};
$("hOnline").onclick=()=>{sfx("ui");go("lobby")};
$("hRunners").onclick=()=>{sfx("ui");go("runners")};
$("hBook").onclick=()=>{sfx("ui");go("book")};
$("hAch").onclick=()=>{sfx("ui");go("awards")};
$("hHelp").onclick=()=>{sfx("ui");go("help")};
$("hSettings").onclick=()=>{sfx("ui");go("settings")};
$("hProfile").onclick=()=>{sfx("ui");go("awards")};
$("inGo").onclick=()=>{sfx("go");startRace(1)};
$("inHear").onclick=()=>{WD().words.forEach((x,i)=>setTimeout(()=>speak(x.a+". "+x.m),i*1700))};
function startDaily(){
  const t=today();let h=0;for(const ch of t)h=(h*31+ch.charCodeAt(0))>>>0;
  const unlocked=WORLDS.map((w,i)=>i).filter(worldUnlocked);WI=unlocked[h%unlocked.length];
  const due=dueWords().filter(w=>w.wi>=0),pool=WD().words;
  const study=shuffle(due).slice(0,3);while(study.length<3){const c=pick(pool);if(!study.some(s=>s.a===c.a))study.push(c)}
  startRace(2,h,null,study.concat(pool.filter(p=>!study.some(s=>s.a===p.a))).slice(0,8));
}
function masteryDots(a){const r=PROG.words[a],l=r?r.lvl:0;return`<span class="mdots" aria-label="Mastery ${l} of 5">${[1,2,3,4,5].map(i=>`<i class="${i<=l?"on":""}"></i>`).join("")}</span>`}

/* ---------- help ---------- */
let hSlide=0;const SLIDES=document.querySelectorAll(".slide");
$("hpDots").innerHTML=[...SLIDES].map(()=>"<i></i>").join("");
function helpSlide(n){hSlide=clamp(n,0,SLIDES.length-1);SLIDES.forEach((s,i)=>s.hidden=i!==hSlide);$("hpN").textContent=`${hSlide+1}/${SLIDES.length}`;$("hpPrev").disabled=hSlide===0;
  $("hpNext").textContent=hSlide===SLIDES.length-1?"Got it!":"Next ›";[...$("hpDots").children].forEach((d,i)=>d.classList.toggle("on",i===hSlide))}
$("hpPrev").onclick=()=>{sfx("back");helpSlide(hSlide-1)};
$("hpNext").onclick=()=>{sfx("ui");if(hSlide===SLIDES.length-1)back();else helpSlide(hSlide+1)};

/* ---------- shop ---------- */
let shopTab="r",shopSel="mithra";
document.querySelectorAll("#runners .tabs button").forEach(b=>b.onclick=()=>{sfx("ui");shopTab=b.dataset.tab;shopSel=shopTab==="r"?PROG.runner:PROG.trail;document.querySelectorAll("#runners .tabs button").forEach(x=>x.classList.toggle("on",x===b));renderShop()});
function renderShop(){
  $("shCoins").textContent=PROG.coins;
  const items=shopTab==="r"?RUNNERS:TRAILS,owned=shopTab==="r"?PROG.owned.runners:PROG.owned.trails,eq=shopTab==="r"?PROG.runner:PROG.trail;
  const grid=$("shGrid");grid.innerHTML="";
  items.forEach(it=>{const b=document.createElement("button");const own=owned.includes(it.id);b.className="shop-item"+(shopSel===it.id?" sel":"")+(own?"":" locked")+(eq===it.id?" eq":"");
    if(shopTab==="r"){const c=document.createElement("canvas");b.appendChild(c);regPortrait(c,it,{locked:!own,pad:4})}
    else{const sw=document.createElement("span");sw.className="swatch";sw.style.background=`linear-gradient(90deg,${it.cols.join(",")})`;b.appendChild(sw)}
    const s=document.createElement("span");s.className="si-name";s.innerHTML=`${it.name}${own?(eq===it.id?" <em>✓</em>":""):`<small><i class="coin-ic"></i>${it.cost}</small>`}`;b.appendChild(s);
    b.onclick=()=>{sfx("tap");shopSel=it.id;renderShop()};grid.appendChild(b)});
  const it=items.find(x=>x.id===shopSel)||items[0],own=owned.includes(it.id);
  if(shopTab==="r"){regPortrait($("shHero"),it,{run:true,locked:!own});$("shName").textContent=it.name;$("shKn").textContent=it.kn;$("shBio").textContent=it.bio}
  else{regPortrait($("shHero"),runnerById(PROG.runner),{run:true});$("shName").textContent=it.name+" trail";$("shKn").textContent="";$("shBio").textContent="Shows behind you while you run and when you boost."}
  const btn=$("shAct");
  if(eq===it.id){btn.textContent="Equipped ✓";btn.disabled=true;btn.onclick=null}
  else if(own){btn.disabled=false;btn.textContent="Equip";btn.onclick=()=>{sfx("ui");if(shopTab==="r")PROG.runner=it.id;else PROG.trail=it.id;saveProg();renderShop()}}
  else{const can=PROG.coins>=it.cost;btn.disabled=!can;btn.innerHTML=can?`Buy for <i class="coin-ic"></i> ${it.cost}`:`Need <i class="coin-ic"></i> ${it.cost-PROG.coins} more`;
    btn.onclick=()=>{if(PROG.coins<it.cost)return;PROG.coins-=it.cost;owned.push(it.id);if(shopTab==="r")PROG.runner=it.id;else PROG.trail=it.id;saveProg();sfx("buy");confetti();renderShop()}}
}

/* ---------- word book ---------- */
let bookTab="all";
function renderBook(){
  const all=allWords(),found=all.filter(w=>knows(w.a)).length;
  $("bkFound").textContent=found;$("bkMaster").textContent=masteredCount();$("bkDue").textContent=dueWords().length;
  $("bkFill").style.width=(found/all.length*100)+"%";
  const tabs=[["all","All"],["due","Review"],["pw","Power"]].concat(WORLDS.map((w,i)=>[String(i),w.e+" "+w.name]));
  $("bkTabs").innerHTML="";tabs.forEach(([k,l])=>{const b=document.createElement("button");b.textContent=l;b.className=bookTab===k?"on":"";b.onclick=()=>{sfx("tap");bookTab=k;renderBook()};$("bkTabs").appendChild(b)});
  const due=new Set(dueWords().map(w=>w.a));
  const list=all.filter(w=>bookTab==="all"||(bookTab==="due"?due.has(w.a):bookTab==="pw"?w.wi===-1:w.wi===+bookTab));
  const box=$("bkList");box.innerHTML="";
  if(!list.length){box.innerHTML=`<p class="empty">${bookTab==="due"?"Nothing to review right now. Great job! 🎉":"No words here yet."}</p>`;return}
  list.forEach(w=>{const k=knows(w.a),d=document.createElement("button");d.className="book-row"+(k?"":" locked");
    d.innerHTML=k?`<span class="bp">${w.p}</span><span class="bw"><b>${w.a}</b><small>${w.m}</small><span class="kn">${w.k}</span></span>${masteryDots(w.a)}`
      :`<span class="bp">🔒</span><span class="bw"><b>${w.a[0]}${"•".repeat(w.a.length-1)}</b><small>Find it in ${w.world}</small></span>`;
    if(k)d.onclick=()=>speak(`${w.a}. ${w.m}`+(w.s?". "+w.s.replace("___",w.a):""));box.appendChild(d)});
}

/* ---------- awards ---------- */
function renderAwards(){
  const s=PROG.stats,li=levelInfo(PROG.xp);
  $("awStats").innerHTML=[["Level",li.lvl],["Races",s.races],["Wins",s.wins],["Words",discoveredCount()],["Mastered",masteredCount()],["Spells",s.casts],["Gates",s.gates],["Streak",PROG.streak.n+" 🔥"]].map(([k,v])=>`<div><b>${v}</b><small>${k}</small></div>`).join("");
  $("awList").innerHTML=ACHIEVEMENTS.map(a=>`<div class="ach ${PROG.ach[a.id]?"got":""}"><i>${a.icon}</i><span><b>${a.name}</b><small>${a.desc}</small></span>${PROG.ach[a.id]?"<em>✓</em>":""}</div>`).join("");
}

/* ---------- settings ---------- */
function renderSettings(){
  const s=PROG.settings;$("stName").value=PROG.name;$("stMusic").value=s.music;$("stSfx").value=s.sfx;setToggle($("stVoice"),s.voice);setToggle($("stMotion"),s.motion);
  document.querySelectorAll("#stDiff button").forEach(b=>{b.classList.toggle("on",+b.dataset.d===s.diff);b.setAttribute("aria-checked",+b.dataset.d===s.diff)});
}
$("stName").oninput=e=>{PROG.name=e.target.value.slice(0,12);saveProg()};
$("stMusic").oninput=$("psMusic").oninput=e=>{PROG.settings.music=+e.target.value;applyVolumes();saveProg()};
$("stSfx").oninput=e=>{PROG.settings.sfx=+e.target.value;applyVolumes();saveProg()};
$("stSfx").onchange=()=>sfx("coin");
$("stVoice").onclick=()=>{PROG.settings.voice=!PROG.settings.voice;saveProg();renderSettings();if(PROG.settings.voice)speak("Voice on")};
$("stMotion").onclick=()=>{PROG.settings.motion=!PROG.settings.motion;saveProg();renderSettings();document.body.classList.toggle("calm",!PROG.settings.motion)};
document.querySelectorAll("#stDiff button").forEach(b=>b.onclick=()=>{sfx("tap");PROG.settings.diff=+b.dataset.d;saveProg();renderSettings()});
$("stTut").onclick=()=>{PROG.tut=false;saveProg();WI=0;startRace(1)};
$("stReset").onclick=()=>{modal(`<h2>Reset everything?</h2><p>Your words, stars, coins and runners will be deleted from this device.</p><div class="row"><button class="btn ghost" id="mNo">Keep</button><button class="btn danger" id="mYes">Reset</button></div>`);
  $("mNo").onclick=closeModal;$("mYes").onclick=()=>{try{localStorage.removeItem(SAVE_KEY)}catch(e){}location.reload()}};
document.body.classList.toggle("calm",!PROG.settings.motion);

/* ---------- modal & confetti ---------- */
function modal(html){$("modalCard").innerHTML=html;$("modal").hidden=false;$("modal").classList.remove("in");void $("modal").offsetWidth;$("modal").classList.add("in")}
function closeModal(){$("modal").hidden=true;sfx("back")}
function confetti(n){
  if(!PROG.settings.motion)return;const box=document.createElement("div");box.className="confetti";document.body.appendChild(box);
  for(let i=0;i<(n||60);i++){const p=document.createElement("i");p.style.left=Math.random()*100+"%";p.style.background=pick(["#FF3B4E","#FFC531","#2BD49A","#3EA2FF","#B57BFF","#fff"]);p.style.animationDelay=Math.random()*.5+"s";p.style.setProperty("--x",(Math.random()*200-100)+"px");p.style.setProperty("--r",(Math.random()*720)+"deg");box.appendChild(p)}
  setTimeout(()=>box.remove(),3200);
}

/* ======================= IN-RACE ======================= */
let _bottomH=110;
const UI={
  dirty:true,
  show(id){hideAllScreens();$(id).hidden=false;document.body.dataset.screen=id},
  hideAll(){hideAllScreens();$("modal").hidden=true},
  bottomH(){
    if(!$("hud").hidden)return _bottomH;
    if(!$("home").hidden){const s=document.querySelector(".home-sheet");return s?Math.min(H*.62,s.offsetHeight+6):H*.5}
    if(!$("title").hidden)return H*.3;
    return H*.24;
  },
  enterRace(){
    hideAllScreens();$("modal").hidden=true;navStack=[];document.body.dataset.screen="race";
    $("hud").hidden=false;$("gate").hidden=true;$("coach").hidden=true;$("finishBanner").hidden=true;$("flash").hidden=true;
    const c=$("cards");c.innerHTML="";
    for(let i=0;i<3;i++){const b=document.createElement("button");b.className="card";b.dataset.ci=i;b.onpointerdown=e=>{e.stopPropagation();cast(0,i)};b.onclick=e=>e.preventDefault();c.appendChild(b)}
    $("trkDots").innerHTML=G.lanes.map((L,i)=>`<span class="tdot ${i?"":"me"}" style="--c:${L.R.top}"><i></i></span>`).join("");
    _bottomH=(c.offsetHeight||96)+Math.max(14,parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sab"))||14);
    this.dirty=true;this._pos=0;this._coins=-1;this._fx="";
  },
  hud(){
    if(!G)return;const L=G.lanes[0];
    const order=G.lanes.slice().sort((a,b)=>(b.finished?1e9-(b.place||9)*1e6:b.d)-(a.finished?1e9-(a.place||9)*1e6:a.d)),pos=order.indexOf(L)+1;
    if(pos!==this._pos){this._pos=pos;const el=$("hudPos");el.innerHTML=`<b>${pos}</b><small>${ord(pos).slice(-2)}</small><span>/${G.lanes.length}</span>`;el.className="pos p"+pos;el.classList.remove("bump");void el.offsetWidth;el.classList.add("bump")}
    $("trkFill").style.width=Math.min(100,L.d/FIN*100)+"%";
    const dots=$("trkDots").children;G.lanes.forEach((R,i)=>{if(dots[i])dots[i].style.left=Math.min(100,Math.max(0,R.d/FIN*100))+"%"});
    if(L.coins!==this._coins){this._coins=L.coins;$("hudCoins").querySelector("b").textContent=L.coins;$("hudCoins").classList.remove("bump");void $("hudCoins").offsetWidth;$("hudCoins").classList.add("bump")}
    const fx=[L.boost>0&&'<span class="chip green">⚡ Boost</span>',L.soar>0&&'<span class="chip sky">🪽 Soaring</span>',L.magnet>0&&'<span class="chip pink">🧲 Magnet</span>',L.shield>0&&'<span class="chip mint">🛡️ Shield</span>',
      L.stun>0&&'<span class="chip red">💫 Tripped</span>',L.tired>0&&'<span class="chip orange">😩 Tired</span>',L.weak>0&&'<span class="chip purple">😰 Nervous</span>',L.wet>0&&'<span class="chip blue">💦 Wet</span>',
      L.combo>=5&&`<span class="chip gold">🔥 Combo ×${Math.min(5,1+Math.floor(L.combo/5))}</span>`].filter(Boolean).join("");
    if(fx!==this._fx){this._fx=fx;$("effects").innerHTML=fx}
    if(!this.dirty)return;this.dirty=false;
    const cards=$("cards").children;
    [...cards].forEach((btn,i)=>{const c=L.cards[i];if(!c){btn.className="card empty";btn.innerHTML="";return}
      const P=POWERS[c.w],full=c.n>=c.w.length;btn.className="card"+(full?" ready":"")+(c.pop?" pop":"");btn.style.setProperty("--c",P.col);
      btn.innerHTML=`<span class="ci">${P.icon}</span><span class="cw">${[...c.w].map((ch,k)=>`<i class="${k<c.n?"on":""}${k===c.n?" next":""}">${ch}</i>`).join("")}</span><span class="ce">${full?"TAP!":P.eff}</span>`+(full?`<kbd>${i+1}</kbd>`:"");
      btn.setAttribute("aria-label",`${c.w}: ${P.m}${full?". Ready, tap to cast":""}`);c.pop=0});
  },
  count(n){const el=$("count");if(n<=0){el.textContent="GO!";el.className="count go";el.hidden=false;setTimeout(()=>el.hidden=true,700);return}
    el.hidden=false;el.textContent=n;el.className="count";void el.offsetWidth;el.className="count pop"},
  toast(html,cls){const t=$("toasts");const d=document.createElement("div");d.className="toast"+(cls?" "+cls:"");d.innerHTML=html;t.appendChild(d);
    while(t.children.length>3)t.firstChild.remove();setTimeout(()=>d.classList.add("out"),2600);setTimeout(()=>d.remove(),3100)},
  place(name,line){const b=$("placeBanner");$("pbName").textContent=name;$("pbSub").textContent=line;b.hidden=false;b.classList.remove("in");void b.offsetWidth;b.classList.add("in");clearTimeout(this._pt);this._pt=setTimeout(()=>b.hidden=true,2400)},
  flash({icon,w,m,k,res,tone,col}){const f=$("flash");f.hidden=false;f.className="flash "+(tone||"");f.style.setProperty("--c",col||"#FFC531");
    $("flI").textContent=icon;$("flW").textContent=w;$("flM").innerHTML=`${m} · <span class="kn">${k}</span>`;$("flR").textContent=res||"";
    void f.offsetWidth;f.classList.add("in");clearTimeout(this._flt);this._flt=setTimeout(()=>{f.hidden=true},2000)},
  coach(html,kind,ms){const c=$("coach");clearTimeout(this._ct);if(!html){c.hidden=true;return}$("coachTxt").innerHTML=html;c.className="coach "+(kind||"");c.hidden=false;if(ms)this._ct=setTimeout(()=>c.hidden=true,ms)},
  finishBanner(place){const b=$("finishBanner");$("fbPlace").textContent=G.mode===3||G.lanes.length>1?ord(place):"";b.hidden=false;b.className="finish-banner p"+place;void b.offsetWidth;b.classList.add("in");$("hud").hidden=true;stopMusic();if(place===1)confetti(80)},
  showGate(g){
    const L=G.lanes[0];$("gate").hidden=false;$("gate").classList.remove("in");void $("gate").offsetWidth;$("gate").classList.add("in");
    $("gtN").textContent=`${G.gates.indexOf(g)+1}/3`;
    const q=g.q,T={meaning:"Which word means…",kannada:"Which English word is…",sentence:"Fill the gap",reverse:"What does it mean?"};
    $("gtType").textContent=T[g.type];$("gtPic").textContent=q.p||"❓";$("gtK").textContent="";$("gtQ").className="";
    if(g.type==="meaning"){$("gtQ").textContent=q.m;$("gtK").textContent=q.k}
    else if(g.type==="kannada"){$("gtQ").textContent=q.k;$("gtQ").className="kn big"}
    else if(g.type==="sentence"){$("gtQ").innerHTML=esc(q.s).replace("___",'<span class="blank">?</span>');$("gtPic").textContent="✍️"}
    else{$("gtQ").textContent=q.a;$("gtQ").className="word"}
    const hearTxt=g.type==="reverse"?q.a:g.type==="sentence"?q.s.replace("___","blank"):q.m;
    $("gtHear").onclick=()=>speak(hearTxt);
    $("gtFb").hidden=true;$("gtGo").hidden=true;
    const doors=$("gtDoors");doors.innerHTML="";doors.className="doors"+(g.type==="reverse"?" long":"");
    g.opts.forEach((o,i)=>{const btn=document.createElement("button");btn.className="door";btn.style.animationDelay=(i*.06)+"s";btn.innerHTML=`<span>${esc(o.label)}</span>`;
      btn.onclick=()=>{
        doors.querySelectorAll(".door").forEach((b,j)=>{b.disabled=true;b.classList.add(g.opts[j].v===q.a?"right":b===btn?"wrong":"dim")});
        const {ok,lvl}=gateAnswer(o.v);
        const fb=$("gtFb");fb.hidden=false;fb.className="feedback "+(ok?"ok":"no");
        fb.innerHTML=`<span class="h">${ok?"✅ Correct! Boost!":"❌ Not quite"}</span><span class="w">${q.p} <b>${q.a}</b> ${masteryDots(q.a)}</span><span>${q.m} · <span class="kn">${q.k}</span></span>`+(q.s?`<span class="ex">“${esc(q.s.replace("___",q.a))}”</span>`:"");
        $("gtGo").hidden=false;$("gtGo").focus({preventScroll:true});
        if(ok)confetti(30);
        speak(ok?`Correct! ${q.a}. ${q.m}`:`The answer is ${q.a}. ${q.m}`);
      };doors.appendChild(btn)});
    $("gtGo").onclick=()=>{$("gate").hidden=true;resumeRun()};
    speak(hearTxt);
  },
  startYaksha(){$("hud").hidden=true;$("finishBanner").hidden=true;$("coach").hidden=true;startYaksha()},
  pause(){
    if(!G||G.mode===0||!["run","count","gateIn"].includes(G.phase))return;
    G.prevPhase=G.phase;G.phase="paused";running=false;try{speechSynthesis.cancel()}catch(e){}
    $("psNote").textContent=`${WD().name} · ${Math.round(G.lanes[0].d/FIN*100)}% done`;$("psMusic").value=PROG.settings.music;
    $("pause").hidden=false;sfx("back");
  },
  results(lit){
    const g=G,L=g.lanes[0],wi=WI%WORLDS.length,w=WORLDS[wi];
    stopRace();startAttract();hideAllScreens();$("results").hidden=false;document.body.dataset.screen="results";
    const place=L.place||g.lanes.length;
    // order for the podium
    const order=g.lanes.slice().sort((a,b)=>(a.finished&&b.finished)?a.place-b.place:a.finished?-1:b.finished?1:b.d-a.d);
    // stars
    const why=[[place<=3||g.mode===3,place<=3?`Finished ${ord(place)}`:"Finish in the top 3"],[L.gates>=2,`${L.gates}/3 gates passed`],[lit>=2,`${lit}/3 lamps lit`]];
    const stars=why.filter(x=>x[0]).length;
    const prevStars=PROG.stars[wi]||0;if(stars>prevStars)PROG.stars[wi]=stars;
    // rewards
    const daily=g.mode===2&&!(PROG.daily.date===today()&&PROG.daily.done);
    const xp=40+L.gates*20+lit*20+Math.floor(L.score/25)+Math.max(0,(4-place))*15;
    let coins=L.coins+[0,30,20,10,5][Math.min(4,place)]+stars*5;if(daily){coins*=2;PROG.daily={date:today(),done:true}}
    const before=levelInfo(PROG.xp);PROG.xp+=xp;PROG.coins+=coins;const after=levelInfo(PROG.xp);
    PROG.stats.races++;if(place===1)PROG.stats.wins++;
    if(!PROG.best[wi]||L.finT<PROG.best[wi])PROG.best[wi]=L.finT;
    touchStreak();
    const newAch=checkAchievements({place,gates:L.gates,lamps:lit,hits:L.hits,finished:true});
    saveProg();
    // render
    $("rsTag").textContent=g.mode===2?"Daily race · "+w.name:g.mode===3?"Online race · "+w.name:`World ${wi+1} · ${w.name}`;
    $("rsTitle").textContent=place===1?"Victory!":place===2?"So close!":place===3?"On the podium!":"Race complete!";
    $("rsPodium").innerHTML="";
    order.slice(0,3).forEach((R,i)=>{const d=document.createElement("div");d.className="pod p"+(i+1)+(R===L?" me":"");const c=document.createElement("canvas");d.appendChild(c);
      const s=document.createElement("span");s.innerHTML=`<b>${ord(i+1)}</b>${esc(R===L?"You":R.name)}`;d.appendChild(s);$("rsPodium").appendChild(d);regPortrait(c,R.R,{win:i===0,pad:4})});
    const starEls=$("rsStars").children;[...starEls].forEach((s,i)=>{s.className="star";setTimeout(()=>{if(i<stars){s.className="star lit";sfx("star")}},500+i*380)});
    $("rsWhy").innerHTML=why.map(([ok,t])=>`<li class="${ok?"ok":""}">${ok?"★":"☆"} ${t}</li>`).join("");
    $("rsScore").innerHTML=[["🚪","Gates",`${L.gates}/3`],["🪔","Lamps",`${lit}/3`],["✨","Spells",L.casts],["🔥","Best combo",L.bestCombo],["💥","Hits",L.hits],["⏱️","Time",L.finT?L.finT.toFixed(1)+"s":"—"]].map(([i,k,v])=>`<div><i>${i}</i><b>${v}</b><small>${k}</small></div>`).join("");
    // xp bar animation
    $("rsLvl").textContent=before.lvl;$("rsXp").style.transition="none";$("rsXp").style.width=(before.pct*100)+"%";
    countUp($("rsXpTxt"),xp,"+"," XP");countUp($("rsCoins"),coins,"+","");
    setTimeout(()=>{$("rsXp").style.transition="";if(after.lvl>before.lvl){$("rsXp").style.width="100%";setTimeout(()=>{$("rsLvl").textContent=after.lvl;$("rsXp").style.transition="none";$("rsXp").style.width="0%";void $("rsXp").offsetWidth;$("rsXp").style.transition="";$("rsXp").style.width=(after.pct*100)+"%";sfx("level");
      levelUpModal(after.lvl)},800)}else $("rsXp").style.width=(after.pct*100)+"%"},1500);
    // words
    const box=$("rsWords");box.innerHTML="";
    [...g.seen].forEach(a=>{const x=allWords().find(y=>y.a===a);if(!x)return;const b=document.createElement("button");const isNew=g.newWords.includes(a);b.className="wchip known"+(isNew?" new":"");
      b.innerHTML=`<span>${x.p}</span><b>${x.a}</b><small>${x.m}</small><span class="kn">${x.k}</span>${masteryDots(a)}${isNew?"<em>NEW</em>":""}`;b.onclick=()=>speak(`${x.a}. ${x.m}`);box.appendChild(b)});
    if(!box.children.length)box.innerHTML='<p class="empty">No words this time.</p>';
    newAch.forEach((a,i)=>setTimeout(()=>{UI.toast(`<span class="tw-pic">${a.icon}</span><span><small>Award unlocked</small><br><b>${a.name}</b></span>`,"ach");sfx("box")},2400+i*900));
    if(place===1)setTimeout(()=>confetti(90),300);
    playMusic("win");
    const next=(wi+1)%WORLDS.length,nu=worldUnlocked(next);
    $("rsNext").textContent=nu?`Next: ${WORLDS[next].name} ›`:`Earn a ★ to unlock ${WORLDS[next].name}`;$("rsNext").disabled=!nu;
    $("rsNext").onclick=()=>{sfx("ui");WI=next;LAYERS={};navStack=["home"];go("intro")};
    const mode=g.mode;$("rsAgain").onclick=()=>{sfx("ui");if(mode===2)startDaily();else if(mode===3)go("lobby");else startRace(1)};
    $("rsMenu").onclick=()=>{sfx("back");navStack=[];go("home")};
  }
};
function countUp(el,to,pre,post){const t0=performance.now(),dur=1100;const f=t=>{const k=Math.min(1,(t-t0)/dur),v=Math.round(to*(1-Math.pow(1-k,3)));el.textContent=pre+v+post;if(k<1)requestAnimationFrame(f);else if(to)sfx("tick")};requestAnimationFrame(f)}
function levelUpModal(lvl){
  const bonus=50+lvl*10;PROG.coins+=bonus;saveProg();confetti(100);
  modal(`<div class="lvl-burst">${lvl}</div><h2>Level up!</h2><p>You reached level <b>${lvl}</b>. Here's a gift of <b><i class="coin-ic"></i> ${bonus}</b> coins.</p><button class="btn primary big" id="mOk">Awesome!</button>`);
  $("mOk").onclick=closeModal;
}

/* ---------- pause ---------- */
$("btnPause").onclick=()=>UI.pause();
$("psResume").onclick=()=>{if(!G||G.phase!=="paused")return;sfx("ui");G.phase=G.prevPhase||"run";$("pause").hidden=true;kick()};
$("psRestart").onclick=()=>{if(!G)return;sfx("ui");const m=G.mode;$("pause").hidden=true;$("gate").hidden=true;if(m===2)startDaily();else if(m===3){quitRace()}else startRace(1)};
function quitRace(){running=false;G=null;stopMusic();try{speechSynthesis.cancel()}catch(e){}
  ["hud","count","gate","cave","flash","coach","finishBanner","placeBanner"].forEach(id=>$(id).hidden=true);navStack=[];go("home")}
$("psQuit").onclick=()=>{sfx("back");if(G&&G.mode===3)NET.cleanup();quitRace()};

/* ---------- boot ---------- */
resize();
addEventListener("resize",()=>{if(G&&G.mode!==0&&!$("hud").hidden)_bottomH=($("cards").offsetHeight||96)+14});
WI=Math.max(0,WORLDS.findIndex((w,i)=>worldUnlocked(i)&&!(PROG.stars[i]>=1)));if(!worldUnlocked(WI))WI=0;
go("title");
