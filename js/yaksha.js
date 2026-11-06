"use strict";
/* Yaksharaj's Cave. Three trials, played at your own pace (no reflexes):
   1. Riddle: read a short situation, pick the word it describes.
   2. Build: put shuffled word tiles in order to make the example sentence.
   3. Speak: say the sentence aloud. The phone listens if it can; otherwise type the missing word.
   Each trial passed lights a lamp. In an online race both players do the trials on their own phones. */

const YK={step:0,lamps:[null,null,null],score:0,talk:0,raf:0,results:[]};
const ykCv=document.getElementById("yk"),ykCtx=ykCv.getContext("2d");
function ykDraw(){
  const d=Math.min(2,devicePixelRatio||1);if(ykCv.width!==320*d){ykCv.width=320*d;ykCv.height=300*d}
  ykCtx.setTransform(d,0,0,d,0,0);ykCtx.clearRect(0,0,320,300);
  G.t=(G.t||0)+1/60;YK.talk=Math.max(0,YK.talk-1/60);
  drawYaksha(160,190,1.05,YK.talk>0,ykCtx);
  YK.raf=requestAnimationFrame(ykDraw);
}
function say(t,dur){YK.talk=dur||Math.min(4,1+t.length*.055);speak(t)}
const $y=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function startYaksha(){
  stopMusic();playMusic("boss");sfx("roar");
  YK.step=0;YK.lamps=[null,null,null];YK.results=[];
  $y("cave").hidden=false;$y("hud").hidden=true;
  cancelAnimationFrame(YK.raf);ykDraw();renderLamps();
  const n=WORLDS[(WI+1)%WORLDS.length];
  $y("cvTag").textContent="Yaksharaj's Cave · Guardian of the path";
  bubble(`<span class="big">Welcome, ${esc(myName())}.</span><br>I am Yaksharaj. Pass my three trials${n?` and the path to <b>${n.name}</b> will open`:""}.`);
  trial(`<div class="opts" style="grid-template-columns:1fr 1fr 1fr">
    <div class="opt" style="cursor:default;font-size:.95rem">🧩<br>Riddle</div><div class="opt" style="cursor:default;font-size:.95rem">🧱<br>Build</div><div class="opt" style="cursor:default;font-size:.95rem">🎙️<br>Speak</div></div>
    <button class="btn primary" id="ykBegin">I'm ready</button>`);
  say(`Welcome. I am Yaksharaj. Pass my three trials${n?" and the path to "+n.name+" will open":""}.`);
  $y("ykBegin").onclick=()=>{sfx("coin");trialRiddle()};
}
function bubble(html){$y("cvBubble").innerHTML=html}
function trial(html){$y("cvTrial").innerHTML=html}
function renderLamps(){[...$y("lamps").children].forEach((el,i)=>{el.className="lamp"+(YK.lamps[i]===true?" lit":YK.lamps[i]===false?" out":"")})}
function stepTag(n,name){$y("cvTag").textContent=`Trial ${n} of 3 · ${name}`}
function teach(q,ok,extra){
  return `<div class="feedback ${ok?"":"no"}"><span class="h">${ok?"🪔 Lamp lit!":"Not this time. Learn it:"}</span>
    <span class="w">${q.p} ${esc(q.a)}</span><span>${esc(q.m)} · <span class="kn">${q.k}</span></span>${extra?`<span class="ex">"${esc(extra)}"</span>`:""}</div>`;
}
function finishTrial(i,ok,q,extra,next){
  YK.lamps[i]=ok;renderLamps();if(ok){learn(q.a);sfx("good")}else sfx("bad");
  YK.results.push({a:q.a,ok});
  const node=document.createElement("div");node.innerHTML=teach(q,ok,extra);$y("cvTrial").appendChild(node.firstElementChild);
  const b=document.createElement("button");b.className="btn primary";b.textContent=i<2?"Next trial ›":"Open the path";b.onclick=()=>{sfx("coin");next()};$y("cvTrial").appendChild(b);
  say(ok?`Correct. ${q.a} means ${q.m}.`:`The word is ${q.a}. It means ${q.m}.`);
  b.focus({preventScroll:true});b.scrollIntoView({behavior:"smooth",block:"nearest"});
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
  let pool=shuffle(words.map((w,i)=>({w,i})));while(pool.length>2&&pool.map(x=>x.w).join(" ")===target)pool=shuffle(pool);
  const picked=[];
  bubble(`<span class="k">🧱 Build the sentence</span>Use <b>${esc(q.a)}</b> (${esc(q.m)}). Tap the words in the right order.`);
  say(`Build a sentence with the word ${q.a}.`);
  function render(state){
    trial(`<div class="slots ${state||""}" id="ykSlots">${picked.map((t,i)=>`<button class="tile ${t.w===q.a?"key":""}" data-p="${i}">${esc(t.w)}</button>`).join("")||'<span style="opacity:.6;padding:8px">Tap words below…</span>'}</div>
      <div class="pool">${pool.map((t,i)=>`<button class="tile ${t.w===q.a?"key":""}" data-i="${i}">${esc(t.w)}</button>`).join("")}</div>
      ${state?"":`<div class="row"><button class="btn ghost" id="ykClr">Clear</button><button class="btn primary" id="ykChk" ${pool.length?"disabled":""}>Check</button></div>`}`);
    if(state)return;
    $y("cvTrial").querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{picked.push(pool.splice(+b.dataset.i,1)[0]);sfx("dud");render()});
    $y("cvTrial").querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{pool.push(picked.splice(+b.dataset.p,1)[0]);render()});
    $y("ykClr").onclick=()=>{pool=pool.concat(picked.splice(0));render()};
    $y("ykChk").onclick=()=>{const ok=picked.map(t=>t.w).join(" ").toLowerCase()===target.toLowerCase();render(ok?"ok":"no");finishTrial(1,ok,q,q.s.replace("___",q.a),trialSpeak)};
  }
  render();
}

/* ---- trial 3: say it aloud ---- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function norm(s){return s.toLowerCase().replace(/[^a-z\s]/g," ").replace(/\s+/g," ").trim()}
function trialSpeak(){
  const q=G.yq.speak,full=q.s.replace("___",q.a);stepTag(3,"Speak");
  bubble(`<span class="k">🎙️ Say it out loud</span><span class="big">${esc(q.s).replace("___",`<u>${esc(q.a)}</u>`)}</span><br><span class="hint">${q.p} ${esc(q.a)} = ${esc(q.m)}</span>`);
  say(`Now say this sentence out loud. ${full}`);
  const typeIt=()=>{trial(`<p style="text-align:center;font-weight:800">Type the missing word:</p>
      <div class="join" style="margin:0"><label class="field" for="ykType"><span>Missing word</span><input id="ykType" autocomplete="off" autocapitalize="off" spellcheck="false"></label><button class="btn primary" id="ykTypeGo" style="width:auto;padding:12px 18px">Check</button></div>`);
    const go=()=>{const v=norm($y("ykType").value),ok=v===q.a;$y("ykTypeGo").disabled=true;$y("ykType").disabled=true;finishTrial(2,ok,q,full,openPath)};
    $y("ykTypeGo").onclick=go;$y("ykType").addEventListener("keydown",e=>{if(e.key==="Enter")go()});$y("ykType").focus()};
  if(!SR){bubble($y("cvBubble").innerHTML+`<br><span style="font-size:.85rem;color:var(--muted)">Your browser can't listen, so read it aloud and then type the word.</span>`);typeIt();return}
  trial(`<button class="mic" id="ykMic" aria-label="Tap and speak">🎙️</button><p class="heard" id="ykHeard">Tap the mic and read the sentence</p>
    <button class="link" id="ykSkip" style="color:#cfc6e6">Can't speak now? Type it instead</button>`);
  let tries=0,rec=null;
  $y("ykSkip").onclick=()=>{try{rec&&rec.abort()}catch(e){}typeIt()};
  $y("ykMic").onclick=()=>{
    try{speechSynthesis.cancel()}catch(e){}
    rec=new SR();rec.lang="en-IN";rec.interimResults=true;rec.maxAlternatives=3;
    const mic=$y("ykMic");mic.classList.add("on");$y("ykHeard").textContent="Listening…";
    let best="";
    rec.onresult=e=>{best=[...e.results].map(r=>r[0].transcript).join(" ");$y("ykHeard").innerHTML=`You said: <b>${esc(best)}</b>`};
    rec.onerror=e=>{mic.classList.remove("on");$y("ykHeard").textContent=e.error==="not-allowed"?"Microphone is blocked. Type the word instead.":"Didn't catch that. Tap and try again.";if(e.error==="not-allowed")setTimeout(typeIt,1200)};
    rec.onend=()=>{mic.classList.remove("on");if(!best)return;tries++;
      const said=norm(best),target=norm(full).split(" "),hit=target.filter(w=>said.split(" ").includes(w)).length/target.length,hasKey=said.split(" ").includes(q.a);
      const ok=hasKey&&hit>=.6;
      if(ok||tries>=3){$y("ykMic").disabled=true;$y("ykSkip").hidden=true;$y("ykHeard").innerHTML=`You said: <b>${esc(best)}</b>`;finishTrial(2,ok,q,full,openPath)}
      else{$y("ykHeard").innerHTML=`You said: <b>${esc(best)}</b><br>${hasKey?"Almost! Say the whole sentence.":`Say the word <b>${esc(q.a)}</b> clearly.`} Try again (${3-tries} left).`}
    };
    try{rec.start()}catch(e){typeIt()}
  };
}

/* ---- the path opens ---- */
function openPath(){
  const lit=YK.lamps.filter(Boolean).length,n=WORLDS[WI+1];
  $y("cvTag").textContent=lit?"The path is open":"Come back stronger";
  bubble(lit===3?`<span class="big">Splendid!</span> All three lamps burn bright.${n?` The path to <b>${n.name}</b> is yours.`:" You have completed the Karnataka Quest!"}`:
    lit?`You lit ${lit} of 3 lamps. Remember the words you missed.${n?` The path to <b>${n.name}</b> is open.`:""}`:
    `No lamps tonight. Study these words and try again. The path still opens, but I will be waiting.`);
  trial(`<div class="door-open"><div class="arch">${n?n.e:"🏆"}</div><b>${n?n.name:"Quest complete"}</b></div><button class="btn primary" id="ykDone">See results</button>`);
  say(lit===3?`Splendid. ${n?"The path to "+n.name+" is yours.":"You have completed the quest."}`:lit?"The path is open.":"Study these words and come back.");
  sfx("finish");
  $y("ykDone").onclick=()=>{cancelAnimationFrame(YK.raf);$y("cave").hidden=true;stopMusic();UI.results(lit)};
}
