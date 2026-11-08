"use strict";
/* Engine: track generation, physics, collisions, bot, rendering of the world.
   Rule of the design: while running you only react (jump, grab, cast). Anything you must read happens at a stop. */

let G=null,running=false,last=0,WI=0,FIN=10500;
const GRAV=2700, WD=()=>WORLDS[WI%WORLDS.length];
const rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function mkRng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const sShuffle=(a,r)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

/* ---------- progress, saved on this phone ---------- */
let PROG={stars:{},book:{},seenHelp:false};
try{const r=localStorage.getItem("sr-prog2");if(r)PROG=Object.assign(PROG,JSON.parse(r))}catch(e){}
function saveProg(){try{localStorage.setItem("sr-prog2",JSON.stringify(PROG))}catch(e){}}
function learn(w){w=w.toLowerCase();PROG.book[w]=(PROG.book[w]||0)+1;if(G&&G.seen)G.seen.add(w);saveProg()}
function allWords(){const out=[];Object.entries(POWERS).forEach(([w,p])=>out.push({a:w.toLowerCase(),m:p.m,k:p.k,p:p.icon,world:"Power words"}));WORLDS.forEach(Wd=>Wd.words.forEach(x=>out.push({...x,world:Wd.name})));return out}

/* ---------- lanes ---------- */
function newLane(name,kind,bot){
  return{name,kind,emoji:kind==="rabbit"?"🐰":"🦊",bot,remote:false,d:0,y:0,vy:0,jumps:0,buf:0,stun:0,boost:0,tired:0,weak:0,wet:0,shield:0,flash:0,shake:0,
    cards:[],letters:[],nextL:600,hit:new Set(),boxHit:new Set(),gateDone:new Set(),pop:[],parts:[],sec:-1,finished:false,finT:null,
    gates:0,boxes:0,combo:0,decide:{},used:new Set(),castT:0,wait:0,ph:0,td:0,ty:0,lamps:null}
}
function dealCard(L,avoid){const have=new Set(L.cards.filter(Boolean).map(c=>c.w));return{w:pick(Object.keys(POWERS).filter(w=>!have.has(w)&&w!==avoid)),n:0}}
const secAt=x=>Math.max(0,Math.min(3,Math.floor(x/FIN*4)));

function buildTrack(seed){
  const r=mkRng(seed),rp=a=>a[Math.floor(r()*a.length)],rr2=(a,b)=>a+r()*(b-a);
  const w=WD(),words=sShuffle(w.words,r);
  G.gates=GATE_AT.map((f,i)=>{const q=words[i],o=words[(i+3)%words.length];return{x:Math.round(FIN*f),q,opts:sShuffle([q.a,o.a],r)}});
  // Yaksharaj's three trials use three other words from this world
  const yw=words.slice(3,6);
  G.yq={riddle:{...yw[0],opts:sShuffle([yw[0].a,...sShuffle(w.words.filter(p=>p.a!==yw[0].a),r).slice(0,3).map(p=>p.a)],r)},build:yw[1],speak:yw[2]};
  G.hazards=[];G.boxes=[];let x=950;
  while(x<FIN-420){
    if(!G.gates.some(g=>Math.abs(g.x-x)<650))G.hazards.push({x,type:rp(w.pool),id:G.hazards.length});
    x+=rr2(540-WI*16,800-WI*22);
  }
  let bi=0;for(let bx=1700;bx<FIN-600;bx+=rr2(1300,1700)){
    if(G.gates.some(g=>Math.abs(g.x-bx)<520))continue;
    G.hazards=G.hazards.filter(h=>Math.abs(h.x-bx)>190);
    G.boxes.push({x:bx,word:words[(6+bi)%words.length],id:bi});bi++;
  }
}

/* mode 1 = solo vs bot, mode 3 = online vs the other phone */
function startRace(mode,seed,rival){
  audio();FIN=10500+WI*600;
  const other=k=>k==="rabbit"?"fox":"rabbit",rk=rival&&rival.kind?rival.kind:other(MYKIND);
  G={mode,phase:"count",cnt:3.2,lastBeep:4,t:0,start:0,seen:new Set(),host:!!(rival&&rival.host),race:null,lastSend:0,
     lanes:[newLane(myName(),MYKIND,false),newLane(mode===1?(rk==="fox"?"Nick":"Judy"):String(rival.name||"Friend").slice(0,12),rk,mode===1)]};
  G.lanes[1].remote=mode===3;
  G.lanes.forEach(L=>{L.cards=[null,null,null];for(let i=0;i<3;i++)L.cards[i]=dealCard(L)});
  buildTrack(seed??Math.floor(Math.random()*1e9));
  UI.enterRace();
  running=true;last=performance.now();requestAnimationFrame(loop);
  playMusic(WI%2?"race2":"race");
}

/* ---------- geometry ---------- */
const U=()=>Math.max(.8,Math.min(1.35,Math.min(W/400,H/740)));
const groundY=()=>H-UI.bottomH()-16;
const PX=()=>Math.min(W*.26,150);
const BOX_Y=()=>groundY()-128*U();
const SIDE=()=>0;
function hzX(h){const m=HZ[h.type].move,ref=G.lanes[0].d;if(m){const s=h.x-1000;return ref>s?h.x-(ref-s)*m:h.x}return h.x}
function coconutP(h){const ref=G.lanes[0].d;return Math.max(0,Math.min(1,(ref-(h.x-330))/260))}

/* ---------- actions ---------- */
function jump(L){
  if(L.finished)return;
  if(L.jumps>=2){L.buf=.14;return}
  L.vy=-(L.jumps?740:910)*U()*(L.weak>0?.62:1);if(!L.bot)sfx(L.jumps?"jump2":"jump");L.jumps++;
  for(let i=0;i<5;i++)L.parts.push({x:PX()-6,y:groundY(),vx:rnd(-80,-20),vy:rnd(-60,-10),t:.4,c:"rgba(255,255,255,.8)",s:rnd(2,4)});
}
function cast(i,ci){
  const L=G.lanes[i],R=G.lanes[1-i],c=L.cards[ci];
  if(G.phase!=="run"||!c||c.n<c.w.length||L.finished)return;
  const P=POWERS[c.w];L.used.add(c.w);if(i===0)learn(c.w);let res="";
  if(c.w==="RUSH"){L.boost=3.4;res="Speed boost!"}
  if(c.w==="CONFIDENT"){L.shield=1;res="Shield on"}
  if(c.w==="MANAGE"){L.stun=0;L.tired=0;L.weak=0;L.wet=0;res="All slowdowns cleared"}
  if(P.tgt==="rival"){
    if(R.remote){res=`Sent to ${R.name}!`;NET.send("atk",{w:c.w})}
    else if(R.finished)res=`${R.name} already finished`;
    else if(R.shield){R.shield=0;res=`${R.name}'s shield blocked it`}
    else{applyEffect(R,c.w);res=c.w==="AWKWARD"?`${R.name} tripped!`:c.w==="EXHAUSTED"?`${R.name} slowed down!`:`${R.name}'s jumps are weak!`}
  }
  if(i===0){UI.flash({icon:P.icon,w:c.w,m:P.m,k:P.k,res,tone:"me"});sfx(P.tgt==="rival"?"attack":"cast");setTimeout(()=>speak(c.w.toLowerCase()+". "+P.m),200)}
  else if(P.tgt==="rival")UI.flash({icon:P.icon,w:c.w,m:P.m,k:P.k,res:`${L.name} used ${c.w} on you!`,tone:"hit"});
  L.cards[ci]=dealCard(L,c.w);if(i===0)UI.dirty=true;
}
function applyEffect(L,w){
  L.shake=.4;
  if(w==="AWKWARD"){L.stun=1.3;L.flash=1.3;L.pop.push({t:1.1,txt:"🙈 Awkward!",c:"#E2457A"})}
  if(w==="EXHAUSTED"){L.tired=3.6;L.pop.push({t:1.1,txt:"😩 So tired…",c:"#E2457A"})}
  if(w==="NERVOUS"){L.weak=4;L.pop.push({t:1.1,txt:"😰 Nervous!",c:"#E2457A"})}
}
function applyAttack(w,from){
  const L=G.lanes[0];if(!G||L.finished||!POWERS[w])return;
  if(L.shield){L.shield=0;L.pop.push({t:1.2,txt:"🛡️ Blocked!",c:"#22A06B"});sfx("shield");return}
  applyEffect(L,w);const P=POWERS[w];learn(w);sfx("attack");
  UI.flash({icon:P.icon,w,m:P.m,k:P.k,res:`${from} used ${w} on you!`,tone:"hit"});
}
function hurt(L,msg){
  if(L.shield){L.shield=0;L.pop.push({t:1,txt:"🛡️ Saved!",c:"#22A06B"});if(!L.bot)sfx("shield");return}
  L.stun=.7;L.flash=.7;L.shake=.3;L.combo=0;L.pop.push({t:1,txt:msg,c:"#E2263F"});if(!L.bot)sfx("hit");
  if(!L.bot&&navigator.vibrate)try{navigator.vibrate(60)}catch(e){}
  for(let i=0;i<10;i++)L.parts.push({x:PX(),y:groundY()-L.y-20*U(),vx:rnd(-160,160),vy:rnd(-220,-40),t:.6,c:pick(["#FFC531","#fff","#E2263F"]),s:rnd(2,5)});
}
function fillNext(L){for(const c of L.cards){if(c.n<c.w.length){c.n++;if(c.n===c.w.length&&!L.bot){sfx("ready")}UI.dirty=true;return}}}
function neededLetters(L){return L.cards.filter(c=>c.n<c.w.length).map(c=>c.w[c.n])}
function collect(L,l){
  for(const c of L.cards){if(c.n<c.w.length&&c.w[c.n]===l.ch){c.n++;L.combo++;
    if(!L.bot){if(c.n===c.w.length)sfx("ready");else sfx("coin");UI.dirty=true;
      const u=U(),y=l.high?groundY()-150*u:groundY()-34*u;for(let i=0;i<8;i++){const a=i/8*6.28;L.parts.push({x:PX(),y,vx:Math.cos(a)*140,vy:Math.sin(a)*140,t:.45,c:"#FFC531",s:3})}}
    return}}
  if(!L.bot)sfx("dud");
}
function openBox(L,b){
  L.boxHit.add(b.id);L.boxes++;fillNext(L);
  if(L.bot)return;
  learn(b.word.a);sfx("box");UI.toast(`${b.word.p} New word: <b>${b.word.a}</b>`);
  const u=U();for(let i=0;i<12;i++){const a=i/12*6.28;L.parts.push({x:(b.x-L.d)*u+PX(),y:BOX_Y(),vx:Math.cos(a)*170,vy:Math.sin(a)*170-60,t:.6,c:pick(["#FFC531","#fff","#FF7A2F"]),s:3.5})}
}
function spawnLetters(L){
  const ahead=L.d+W/U()+240;
  while(L.nextL<Math.min(ahead,FIN-160)){
    const x=L.nextL;
    if(!G.hazards.some(h=>Math.abs(h.x-x)<100)&&!G.gates.some(g=>Math.abs(g.x-x)<320)&&!G.boxes.some(b=>Math.abs(b.x-x)<130)){
      const need=neededLetters(L);L.letters.push({x,ch:need.length&&Math.random()<.78?pick(need):pick("AEIOURSTNDHCKWMG".split("")),high:Math.random()<.45,got:false});
    }
    L.nextL+=rnd(115,170);
  }
  L.letters=L.letters.filter(l=>l.x>L.d-240);
}

/* ---------- gates: the race stops, you choose, the race goes on ---------- */
function gateAnswer(word){
  const g=G.gate,L=G.lanes[0];if(!g)return;
  const ok=word===g.q.a;L.gateDone.add(g.x);G.gate=null;
  if(ok){L.gates++;learn(g.q.a);L.boost=Math.max(L.boost,2.6);fillNext(L);sfx("good")}
  else{L.tired=2;L.combo=0;sfx("bad")}
  return ok;
}
function resumeRun(){if(G&&G.phase==="gate"){G.phase="run";last=performance.now()}}

/* ---------- update ---------- */
function update(dt){
  const u=U(),gy=groundY(),px=PX();
  G.lanes.forEach(L=>{L.pop.forEach(p=>p.t-=dt);L.pop=L.pop.filter(p=>p.t>0);L.parts.forEach(p=>{p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt});L.parts=L.parts.filter(p=>p.t>0);L.shake=Math.max(0,L.shake-dt)});
  if(G.mode===3)NET.tick();
  const R=G.lanes[1];
  if(R.remote){R.d+=(R.td-R.d)*Math.min(1,dt*10);R.y+=(R.ty-R.y)*Math.min(1,dt*14);R.ph+=dt*11}
  if(G.phase==="count"){G.cnt-=dt;const n=Math.ceil(G.cnt);if(n<G.lastBeep&&n>0){G.lastBeep=n;sfx("beep")}UI.count(n);if(G.cnt<=0){G.phase="run";G.start=performance.now();sfx("go");UI.count(0)}return}
  if(G.phase==="gate"){return}
  if(G.phase==="finished"){G.finWait-=dt;stepLane(G.lanes[0],0,dt,u,gy,px);if(!R.remote)stepLane(R,1,dt,u,gy,px);if(G.finWait<=0){G.phase="yaksha";running=false;UI.startYaksha()}return}
  if(G.phase!=="run")return;
  G.t+=dt;
  G.lanes.forEach((L,i)=>{if(!L.remote)stepLane(L,i,dt,u,gy,px)});
}
function stepLane(L,i,dt,u,gy,px){
  L.vy+=GRAV*u*dt;L.y-=L.vy*dt;
  if(L.y<=0){if(L.vy>300*u&&!L.finished&&!L.bot)for(let k=0;k<4;k++)L.parts.push({x:px,y:gy,vx:rnd(-90,90),vy:rnd(-50,-10),t:.3,c:"rgba(255,255,255,.7)",s:3});L.y=0;L.vy=0;L.jumps=0;if(L.buf>0){L.buf=0;jump(L)}}
  L.buf=Math.max(0,L.buf-dt);
  if(L.finished){L.d+=120*dt;L.ph+=dt*6;return}
  ["stun","boost","tired","weak","wet","flash"].forEach(k=>L[k]=Math.max(0,L[k]-dt));
  if(L.wait>0){L.wait-=dt;return}
  let v=225+WI*9;if(L.boost)v*=1.7;if(L.tired)v*=.58;if(L.wet)v*=.7;if(L.stun)v*=.35;
  // a little catch-up help for whoever is far behind keeps races close
  if(G.mode===1){const o=G.lanes[1-i];if(o.d-L.d>600)v*=1.12}
  L.d=Math.min(FIN,L.d+v*dt);L.ph+=v*dt*.045;
  if(!L.bot){
    if(L.y===0&&Math.random()<.3)L.parts.push({x:px-10*u,y:gy,vx:rnd(-90,-40),vy:rnd(-40,-5),t:.35,c:"rgba(255,255,255,.55)",s:rnd(2,3.5)});
    if(L.boost&&Math.random()<.6)L.parts.push({x:px-16*u,y:gy-L.y-rnd(8,34)*u,vx:-260,vy:0,t:.25,c:"#FFC531",s:3});
    const s=secAt(L.d);if(s!==L.sec){L.sec=s;if(G.t>1)UI.toast(`📍 ${WD().secs[s][1]}`,"place")}
  }
  spawnLetters(L);
  if(L.bot)botRun(L,i,v);
  // gates
  for(const g of G.gates){
    if(L.gateDone.has(g.x))continue;
    if(!L.bot&&g.x-L.d<150&&g.x>L.d-10){G.gate=g;G.phase="gate";UI.showGate(g);return}
    if(L.bot&&L.d>=g.x){L.gateDone.add(g.x);L.wait=rnd(1.3,2.4);if(Math.random()<.65){L.gates++;L.boost=2.2}else L.tired=1.6}
  }
  // collisions (hit boxes are a little smaller than the art, so near misses feel fair)
  const pTop=gy-L.y-42*u,pBot=gy-L.y;
  for(const h of G.hazards){
    const hx=hzX(h);if(hx<L.d-90||hx>L.d+90||L.hit.has(h.id))continue;
    const D=HZ[h.type];if(Math.abs((hx-L.d)*u)>(D.w*.8+8)*u)continue;
    if(D.kind==="air"){if(pTop<gy-(D.lo+6)*u&&pBot>gy-D.hi*u){L.hit.add(h.id);hurt(L,D.msg)}}
    else if(D.kind==="slow"){if(pBot>gy-8*u){L.hit.add(h.id);L.wet=1.1;if(!L.bot){L.pop.push({t:.9,txt:D.msg,c:"#2F7FD0"});sfx("splash")}}}
    else if(h.type==="coconut"&&coconutP(h)<1){}
    else if(pBot>gy-(D.h-4)*u){L.hit.add(h.id);hurt(L,D.msg);if(h.type==="dog"&&!L.bot)sfx("bark")}
  }
  for(const b of G.boxes){if(L.boxHit.has(b.id))continue;if(Math.abs((b.x-L.d)*u)>26*u)continue;const by=BOX_Y();if(pTop<by+18*u&&pBot>by-18*u)openBox(L,b)}
  for(const l of L.letters){if(l.got)continue;if(Math.abs((l.x-L.d)*u)>24*u)continue;const ly=l.high?gy-150*u:gy-34*u;if(pTop<ly+20*u&&pBot>ly-20*u){l.got=true;collect(L,l)}}
  if(L.d>=FIN){
    L.finished=true;L.finT=G.mode===3?(performance.now()-G.start)/1000:G.t;
    if(!L.bot){sfx("finish");G.phase="finished";G.finWait=1.4;if(G.mode===3)NET.send("fin",{t:L.finT})}
  }
}
function botRun(L,i,v){
  const lead=v*.3;
  for(const h of G.hazards){const hx=hzX(h);if(hx<L.d||hx>L.d+lead+60)continue;const key="h"+h.id;if(key in L.decide)continue;
    if(hx<L.d+lead){L.decide[key]=1;if(HZ[h.type].kind==="ground"&&Math.random()<.78&&L.y===0)jump(L)}}
  for(const b of G.boxes){if(b.x<L.d||b.x>L.d+lead+40)continue;const key="b"+b.id;if(key in L.decide)continue;if(b.x<L.d+lead*.9){L.decide[key]=1;if(Math.random()<.5&&L.y===0)jump(L)}}
  for(const l of L.letters){if(l.got||l.x<L.d||l.x>L.d+lead+40)continue;const key="l"+l.x;if(key in L.decide)continue;
    if(l.x<L.d+lead){L.decide[key]=1;if(l.high&&neededLetters(L).includes(l.ch)&&Math.random()<.5&&L.y===0)jump(L)}}
  const ready=L.cards.findIndex(c=>c.n>=c.w.length);
  if(ready>=0){if(!L.castT)L.castT=rnd(1,2.6);else{L.castT-=1/60;if(L.castT<=0){L.castT=0;cast(i,ready)}}}
}

/* ---------- rendering of the world ---------- */
function drawWorld(){
  const L=G.lanes[0],R=G.lanes[1],u=U(),gy=groundY(),px=PX(),h=H;
  ctx.clearRect(0,0,W,H);
  ctx.save();
  if(L.shake>0)ctx.translate(rnd(-5,5)*u*L.shake*2,rnd(-4,4)*u*L.shake*2);
  drawScene(L,h,u,gy);
  const fx=(FIN-L.d)*u+px;
  if(fx<W+80){ctx.fillStyle="#1B1530";ctx.fillRect(fx-50*u,gy-150*u,8*u,150*u);ctx.fillRect(fx+42*u,gy-150*u,8*u,150*u);
    ctx.save();rr(fx-56*u,gy-176*u,112*u,30*u,8*u);ctx.clip();for(let k=0;k<14;k++)for(let m=0;m<2;m++){ctx.fillStyle=(k+m)%2?"#fff":"#1B1530";ctx.fillRect(fx-56*u+k*8*u,gy-176*u+m*15*u,8*u,15*u)}ctx.restore()}
  for(const g of G.gates){const sx=(g.x-L.d)*u+px;if(sx>-90&&sx<W+90)drawGate(g,sx,gy,u,L)}
  for(const b of G.boxes){const sx=(b.x-L.d)*u+px;if(sx>-40&&sx<W+40)drawBox(b,L,sx,u)}
  for(const hz of G.hazards){const sx=(hzX(hz)-L.d)*u+px;if(sx<-140||sx>W+140)continue;const done=L.hit.has(hz.id)&&HZ[hz.type].kind!=="slow";if(done)ctx.globalAlpha=.35;drawHazard(hz,L,sx,gy,u);ctx.globalAlpha=1}
  const need=neededLetters(L);
  for(const l of L.letters){if(l.got)continue;const sx=(l.x-L.d)*u+px;if(sx<-30||sx>W+30)continue;coin(sx,(l.high?gy-150*u:gy-34*u)+Math.sin(G.t*4+l.x)*3*u,u,l.ch,need.includes(l.ch))}
  // rival on the same road
  const gx=px+(R.d-L.d)*u;
  if(gx>-30&&gx<W+30){ctx.fillStyle="rgba(0,0,0,.18)";ctx.beginPath();ctx.ellipse(gx,gy+3*u,16*u,4*u,0,0,7);ctx.fill();ctx.globalAlpha=.9;drawRunner(R,gx,gy-R.y,u,1);ctx.globalAlpha=1;pill(R.name,gx+4*u,gy-R.y-(R.kind==="rabbit"?104:90)*u,R.kind==="fox"?"#D9531E":"#7A4FD0",u)}
  L.parts.forEach(p=>{ctx.globalAlpha=Math.min(1,p.t*3);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.s*u,0,7);ctx.fill()});ctx.globalAlpha=1;
  ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(px,gy+3*u,Math.max(6,18*u-L.y*.06),4.5*u,0,0,7);ctx.fill();
  if(L.shield){const r=40*u+Math.sin(G.t*6)*2*u;ctx.fillStyle="rgba(34,160,107,.18)";ctx.strokeStyle="rgba(34,160,107,.9)";ctx.lineWidth=3*u;ctx.beginPath();ctx.arc(px+4*u,gy-L.y-40*u,r*1.3,0,7);ctx.fill();ctx.stroke()}
  if(!(L.flash>0&&Math.floor(L.flash*12)%2))drawRunner(L,px,gy-L.y,u,1.15);
  const st=[L.tired&&"😩",L.weak&&"😰",L.wet&&"💦",L.stun&&"💫"].filter(Boolean).join("");
  if(st){ctx.font=`${16*u}px serif`;ctx.textAlign="center";ctx.fillText(st,px+6*u,gy-L.y-(L.kind==="rabbit"?118:102)*u)}
  L.pop.slice(-2).forEach((p,j,arr)=>{ctx.globalAlpha=Math.min(1,p.t*2);ctx.font=F(800,17*u);ctx.textAlign="left";const tx=px+34*u,ty=gy-L.y-64*u-(arr.length-1-j)*22*u-(1-Math.min(1,p.t))*14*u;ctx.lineWidth=4*u;ctx.strokeStyle="#fff";ctx.strokeText(p.txt,tx,ty);ctx.fillStyle=p.c;ctx.fillText(p.txt,tx,ty);ctx.globalAlpha=1});
  ctx.restore();
}
function drawRunner(L,x,y,u,sc=1){const air=L.y>2,idle=G&&G.phase==="count";if(typeof drawSprite==="function"&&drawSprite(L.kind,x,y,u,sc,L.ph,air,idle))return;if(L.kind==="rabbit")drawRabbit(x,y,u,L.ph,air,sc);else drawFox(x,y,u,L.ph,air,sc)}
function loop(t){if(!running)return;const dt=Math.min(.05,(t-last)/1000);last=t;update(dt);if(G){drawWorld();UI.hud()}if(running)requestAnimationFrame(loop)}

/* ---------- input ---------- */
cv.addEventListener("pointerdown",e=>{e.preventDefault();audio();if(G&&running&&G.phase==="run")jump(G.lanes[0])},{passive:false});
addEventListener("keydown",e=>{
  if(!G||!running)return;const k=e.key;
  if((k===" "||k==="ArrowUp")&&G.phase==="run"){e.preventDefault();jump(G.lanes[0])}
  if("123".includes(k)&&k.length===1&&G.phase==="run")cast(0,+k-1);
  if(k==="Escape")UI.pause();
});

/* ---------- attract mode behind the menus ---------- */
let idleOn=false;
function idleAttract(){
  if(idleOn)return;idleOn=true;FIN=10500;
  G={mode:1,phase:"run",t:0,seen:new Set(),lanes:[newLane("Judy","rabbit",true),newLane("Nick","fox",true)],hazards:[],gates:[],boxes:[]};
  G.lanes.forEach(L=>{L.cards=[{w:"RUSH",n:2},{w:"CONFIDENT",n:4},{w:"EXHAUSTED",n:1}]});
  for(let x=700;x<FIN;x+=rnd(480,700))G.hazards.push({x,type:pick(WD().pool.filter(t=>HZ[t].kind==="ground"&&!HZ[t].move&&t!=="coconut")),id:G.hazards.length});
  G.lanes[1].d=-90;let t0=performance.now();
  (function f(t){
    if(running||!UI.menuOpen()){idleOn=false;return}
    const dt=Math.min(.05,(t-t0)/1000);t0=t;const u=U();G.t+=dt;
    G.lanes.forEach(L=>{L.vy+=GRAV*u*dt;L.y-=L.vy*dt;if(L.y<=0){L.y=0;L.vy=0;L.jumps=0}
      let nd=L.d+230*dt;if(nd>FIN-700){nd=0;L.letters=[];L.nextL=300;L.decide={};L.hit=new Set()}L.d=nd;L.ph+=230*dt*.045;spawnLetters(L);L.sec=secAt(L.d);
      L.parts.forEach(p=>{p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt});L.parts=L.parts.filter(p=>p.t>0);
      for(const h of G.hazards){if(h.x<L.d||h.x>L.d+95)continue;if(!(("h"+h.id) in L.decide)){L.decide["h"+h.id]=1;jump(L)}}
      for(const l of L.letters){if(!l.got&&Math.abs(l.x-L.d)<10&&((l.high&&L.y>60*u)||(!l.high&&L.y<30*u)))l.got=true}});
    drawWorld();requestAnimationFrame(f);
  })(t0);
}
