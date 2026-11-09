"use strict";
/* ============================================================
   Yaksharaj's Cave — three calm trials after every race (no reflexes):
   1. Riddle  — read a little story, pick the word it describes.
   2. Build   — tap word tiles into the right order to make the sentence.
   3. Speak   — say the sentence aloud (the phone listens if it can),
                otherwise type the missing word.
   Each trial passed lights a lamp.
   ============================================================ */
const YK={lamps:[null,null,null],talk:0,raf:0,t:0};
const ykCv=document.getElementById("yk");
const $y=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function ykDraw(){
  const c=ykCv.getContext("2d"),d=Math.min(2,devicePixelRatio||1),w=ykCv.clientWidth||300,h=ykCv.clientHeight||260;
  if(ykCv.width!==Math.round(w*d)){ykCv.width=Math.round(w*d);ykCv.height=Math.round(h*d)}
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  YK.t+=1/60;YK.talk=Math.max(0,YK.talk-1/60);
  // embers
  for(let k=0;k<18;k++){const x=hash(k)*w,y=h-((YK.t*30+hash(k+4)*h)%h);c.fillStyle=`rgba(255,${150+hash(k)*80|0},60,${.25+.4*hash(k+9)})`;c.beginPath();c.arc(x+Math.sin(YK.t+k)*6,y,1.5+hash(k+2)*2,0,7);c.fill()}
  const s=Math.min(1.1,h/250);drawYaksha(w/2,h*.74,s,YK.talk>0,c,YK.t);
  YK.raf=requestAnimationFrame(ykDraw);
}
function say(t,dur){YK.talk=dur||Math.min(4,1+t.length*.055);speak(t)}
function bubble(html){const b=$y("cvBubble");b.innerHTML=html;b.classList.remove("in");void b.offsetWidth;b.classList.add("in")}
function trial(html){$y("cvTrial").innerHTML=html}
function renderLamps(){[...$y("lamps").children].forEach((el,i)=>{el.className="lamp"+(YK.lamps[i]===true?" lit":YK.lamps[i]===false?" out":"")})}
function stepTag(n,name){$y("cvTag").textContent=`Trial ${n} of 3 · ${name}`}

function startYaksha(){
  stopMusic();playMusic("boss");sfx("roar");
  YK.lamps=[null,null,null];G.lampWords=[];
  UI.show("cave");cancelAnimationFrame(YK.raf);ykDraw();renderLamps();
  const n=WORLDS[(WI+1)%WORLDS.length];
  $y("cvTag").textContent="Yaksharaj · Guardian of the path";
  bubble(`<span class="big">Welcome, ${esc(PROG.name||"traveller")}.</span>I am <b>Yaksharaj</b>. Pass my three trials and the path to <b>${n.name}</b> will open.`);
  trial(`<div class="trial-map"><div><i>🧩</i>Riddle</div><div><i>🧱</i>Build</div><div><i>🎙️</i>Speak</div></div><button class="btn primary big" id="ykBegin">I'm ready</button>`);
  say(`Welcome. I am Yaksharaj. Pass my three trials and the path to ${n.name} will open.`);
  $y("ykBegin").onclick=()=>{sfx("ui");trialRiddle()};
}
function finishTrial(i,ok,q,extra,next){
  YK.lamps[i]=ok;renderLamps();markAnswer(q.a,ok);G.seen.add(q.a);G.lampWords.push({a:q.a,ok});
  if(ok){sfx("good");PROG.stats.lamps++}else sfx("bad");
  const node=document.createElement("div");
  node.innerHTML=`<div class="feedback ${ok?"ok":"no"}"><span class="h">${ok?"🪔 Lamp lit!":"Not this time — learn it:"}</span>
    <span class="w">${q.p} ${esc(q.a)}</span><span>${esc(q.m)} · <span class="kn">${q.k}</span></span>${extra?`<span class="ex">“${esc(extra)}”</span>`:""}</div>`;
  $y("cvTrial").appendChild(node.firstElementChild);
  const b=document.createElement("button");b.className="btn primary big";b.textContent=i<2?"Next trial ›":"Open the path";b.onclick=()=>{sfx("ui");next()};$y("cvTrial").appendChild(b);
  say(ok?`Correct! ${q.a} means ${q.m}.`:`The word is ${q.a}. It means ${q.m}.`);
  setTimeout(()=>{b.focus({preventScroll:true});b.scrollIntoView({behavior:"smooth",block:"nearest"})},50);
}

/* ---- trial 1: riddle ---- */
function trialRiddle(){
  const q=G.yq.riddle;stepTag(1,"Riddle");
  bubble(`<span class="k">🧩 Riddle</span>${esc(q.r)}`);
  trial(`<div class="opts">${q.opts.map(o=>`<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`);
  say(q.r);
  $y("cvTrial").querySelectorAll(".opt").forEach(b=>b.onclick=()=>{
    const ok=b.dataset.o===q.a;$y("cvTrial").querySelectorAll(".opt").forEach(x=>{x.disabled=true;x.classList.add(x.dataset.o===q.a?"right":x===b?"wrong":"dim")});
    finishTrial(0,ok,q,null,trialBuild);
  });
}

/* ---- trial 2: build the sentence ---- */
function trialBuild(){
  const q=G.yq.build;stepTag(2,"Build the sentence");
  const words=q.s.replace("___",q.a).replace(/[.,!?]/g,"").split(" ");const target=words.join(" ");
  let pool=shuffle(words.map((w,i)=>({w,i})));for(let k=0;k<6&&pool.length>2&&pool.map(x=>x.w).join(" ")===target;k++)pool=shuffle(pool);
  const picked=[];
  bubble(`<span class="k">🧱 Build the sentence</span>Use <b>${esc(q.a)}</b> <span class="hint">(${esc(q.m)})</span>. Tap the words in the right order.`);
  say(`Build a sentence with the word ${q.a}.`);
  function render(state){
    trial(`<div class="slots ${state||""}">${picked.map((t,i)=>`<button class="tile ${t.w===q.a?"key":""}" data-p="${i}">${esc(t.w)}</button>`).join("")||'<span class="ph">Tap the words below…</span>'}</div>
      <div class="pool">${pool.map((t,i)=>`<button class="tile ${t.w===q.a?"key":""}" data-i="${i}">${esc(t.w)}</button>`).join("")}</div>
      ${state?"":`<div class="row"><button class="btn ghost" id="ykClr">Clear</button><button class="btn primary" id="ykChk" ${pool.length?"disabled":""}>Check</button></div>`}`);
    if(state)return;
    $y("cvTrial").querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{picked.push(pool.splice(+b.dataset.i,1)[0]);sfx("tap");render()});
    $y("cvTrial").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{pool.push(picked.splice(+b.dataset.p,1)[0]);sfx("back");render()});
    $y("ykClr").onclick=()=>{pool=pool.concat(picked.splice(0));render()};
    $y("ykChk").onclick=()=>{const ok=picked.map(t=>t.w).join(" ").toLowerCase()===target.toLowerCase();render(ok?"ok":"no");finishTrial(1,ok,q,q.s.replace("___",q.a),trialSpeak)};
  }
  render();
}

/* ---- trial 3: say it aloud ---- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const norm=s=>s.toLowerCase().replace(/[^a-z\s]/g," ").replace(/\s+/g," ").trim();
function trialSpeak(){
  const q=G.yq.speak,full=q.s.replace("___",q.a);stepTag(3,"Speak");
  bubble(`<span class="k">🎙️ Say it out loud</span><span class="big">${esc(q.s).replace("___",`<u>${esc(q.a)}</u>`)}</span><span class="hint">${q.p} ${esc(q.a)} = ${esc(q.m)}</span>`);
  say(`Now say this sentence out loud. ${full}`);
  const typeIt=()=>{trial(`<p class="center">Type the missing word:</p>
      <div class="join"><label class="field"><span>Missing word</span><input id="ykType" autocomplete="off" autocapitalize="off" spellcheck="false"></label><button class="btn primary" id="ykTypeGo">Check</button></div>`);
    const go=()=>{const v=norm($y("ykType").value);if(!v)return;const ok=v===q.a;$y("ykTypeGo").disabled=true;$y("ykType").disabled=true;finishTrial(2,ok,q,full,openPath)};
    $y("ykTypeGo").onclick=go;$y("ykType").addEventListener("keydown",e=>{if(e.key==="Enter")go()});$y("ykType").focus()};
  if(!SR){typeIt();return}
  trial(`<button class="mic" id="ykMic" aria-label="Tap and speak"><span>🎙️</span></button><p class="heard" id="ykHeard">Tap the mic and read the sentence</p>
    <button class="link" id="ykSkip">Can't speak now? Type it instead</button>`);
  let tries=0,rec=null;
  $y("ykSkip").onclick=()=>{try{rec&&rec.abort()}catch(e){}typeIt()};
  $y("ykMic").onclick=()=>{
    try{speechSynthesis.cancel()}catch(e){}
    rec=new SR();rec.lang="en-IN";rec.interimResults=true;rec.maxAlternatives=3;
    const mic=$y("ykMic");mic.classList.add("on");$y("ykHeard").textContent="Listening…";
    let best="";
    rec.onresult=e=>{best=[...e.results].map(r=>r[0].transcript).join(" ");$y("ykHeard").innerHTML=`You said: <b>${esc(best)}</b>`};
    rec.onerror=e=>{mic.classList.remove("on");$y("ykHeard").textContent=e.error==="not-allowed"?"The microphone is blocked. Type the word instead.":"Didn't catch that. Tap and try again.";if(e.error==="not-allowed")setTimeout(typeIt,1200)};
    rec.onend=()=>{mic.classList.remove("on");if(!best)return;tries++;
      const said=norm(best).split(" "),target=norm(full).split(" "),hit=target.filter(w=>said.includes(w)).length/target.length,hasKey=said.includes(q.a);
      const ok=hasKey&&hit>=.6;
      if(ok||tries>=3){$y("ykMic").disabled=true;$y("ykSkip").hidden=true;finishTrial(2,ok,q,full,openPath)}
      else $y("ykHeard").innerHTML=`You said: <b>${esc(best)}</b><br>${hasKey?"Almost! Say the whole sentence.":`Say the word <b>${esc(q.a)}</b> clearly.`} (${3-tries} tries left)`;
    };
    try{rec.start()}catch(e){typeIt()}
  };
}

/* ---- the path opens ---- */
function openPath(){
  const lit=YK.lamps.filter(Boolean).length,n=WORLDS[(WI+1)%WORLDS.length];
  $y("cvTag").textContent=lit?"The path is open":"Come back stronger";
  bubble(lit===3?`<span class="big">Splendid!</span>All three lamps burn bright. The path to <b>${n.name}</b> is yours.`:
    lit?`You lit <b>${lit} of 3</b> lamps. Remember the words you missed. The path to <b>${n.name}</b> is open.`:
    `No lamps tonight. Study these words and try again. I will be waiting.`);
  trial(`<div class="door-open"><div class="arch"><span>${n.e}</span></div><b>${n.name}</b></div><button class="btn primary big" id="ykDone">See results</button>`);
  say(lit===3?`Splendid. The path to ${n.name} is yours.`:lit?"The path is open.":"Study these words and come back.");
  sfx("finish");
  $y("ykDone").onclick=()=>{cancelAnimationFrame(YK.raf);UI.results(lit)};
}
