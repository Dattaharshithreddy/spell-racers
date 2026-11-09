"use strict";
/* ============================================================
   ENGINE — track generation, physics, racers, bots, spells, gates,
   tutorial coaching, camera feel (hit-stop, shake, slow-mo), rendering.
   Design rule: while running you only react (jump, slide, cast).
   Anything you have to read happens while time is stopped.
   ============================================================ */
let G=null,running=false,last=0,WI=0,FIN=10000;
const GRAV=2600,JUMP1=880,JUMP2=720,BODY=58,BODY_SL=24;
const WD=()=>WORLDS[WI%WORLDS.length];
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function mkRng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const sShuffle=(a,r)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const DIFF=[{name:"Relaxed",speed:.88,bot:.62,hz:1.25},{name:"Normal",speed:1,bot:.8,hz:1},{name:"Speedy",speed:1.12,bot:.93,hz:.85}];

/* ---------- geometry ---------- */
const U=()=>Math.max(.75,Math.min(1.35,Math.min(W/380,H/700)));
const groundY=()=>Math.round(Math.min(H-(typeof UI!=="undefined"?UI.bottomH():100),H*.7));
const PX=()=>Math.max(90,Math.min(W*.3,190));
function hzX(h){const m=HZ[h.type].move;if(!m||!G)return h.x;const ref=G.lanes[0].d,s=h.x-1100;return ref>s?h.x-(ref-s)*m:h.x}

/* ---------- racers ---------- */
function newRacer(name,runner,trail,bot,skill){
  return{name,R:runner,trail:trail||"dust",bot,skill:skill||.8,remote:false,d:0,y:0,vy:0,jumps:0,slide:0,sl:0,buf:0,
    stun:0,boost:0,tired:0,weak:0,wet:0,shield:0,soar:0,magnet:0,flash:0,squash:0,
    cards:[null,null,null],letters:[],nextL:520,hit:new Set(),chestHit:new Set(),gateDone:new Set(),padHit:new Set(),
    finished:false,finT:null,place:0,gates:0,chests:0,hits:0,combo:0,bestCombo:0,casts:0,score:0,coins:0,
    decide:{},castT:0,wait:0,ph:0,td:0,ty:0,tsl:0,sec:-1,lane:0}
}
function dealCard(L,avoid){
  const have=new Set(L.cards.filter(Boolean).map(c=>c.w));
  let pool=Object.keys(POWERS).filter(w=>!have.has(w)&&w!==avoid);
  // offensive words only make sense with someone to hit
  if(G&&G.lanes&&G.lanes.length<2)pool=pool.filter(w=>POWERS[w].tgt==="self");
  return{w:pick(pool),n:0,pop:0};
}
const secAt=x=>Math.max(0,Math.min(3,Math.floor(x/FIN*4)));

/* ---------- track ---------- */
function gateQuestion(q,i,r,words){
  const lvl=(PROG.words[q.a]||{}).lvl||0;
  const types=lvl>=3?["sentence","kannada","reverse"]:lvl>=1?["meaning","kannada","sentence"]:["meaning","meaning","kannada"];
  const type=types[(i+Math.floor(r()*3))%3];
  const others=sShuffle(words.filter(w=>w.a!==q.a),r).slice(0,2);
  const opts=type==="reverse"?sShuffle([q,...others],r).map(w=>({v:w.a,label:w.m})):sShuffle([q,...others],r).map(w=>({v:w.a,label:w.a}));
  return{q,type,opts};
}
function buildTrack(seed,study){
  const r=mkRng(seed),rp=a=>a[Math.floor(r()*a.length)],rr2=(a,b)=>a+r()*(b-a);
  const w=WD(),dif=DIFF[PROG.settings.diff],pool=w.words;
  const gw=study&&study.length>=3?study:pickStudyWords(pool,3,r);
  G.studyPool=study&&study.length>=3?study:pool;
  G.gates=GATE_AT.map((f,i)=>({x:Math.round(FIN*f),...gateQuestion(gw[i],i,r,G.studyPool)}));
  const rest=sShuffle(pool.filter(p=>!gw.includes(p)),r);
  const yw=rest.slice(0,3).concat(sShuffle(pool,r)).slice(0,3);
  G.yq={riddle:{...yw[0],opts:sShuffle([yw[0].a,...sShuffle(pool.filter(p=>p.a!==yw[0].a),r).slice(0,3).map(p=>p.a)],r)},build:yw[1],speak:yw[2]};
  G.hazards=[];G.chests=[];G.pads=[];
  let x=900,id=0;
  const tut=G.tut&&G.tut.on;
  if(tut){G.hazards.push({x:1000,type:w.pool.jump[0]==="pothole"?"barricade":w.pool.jump[0],id:id++});G.hazards.push({x:1700,type:w.pool.duck[0],id:id++});x=2300}
  while(x<FIN-500){
    if(!G.gates.some(g=>Math.abs(g.x-x)<700)){
      const roll=r(),kind=roll<.62?"jump":roll<.86?"duck":"slow";
      G.hazards.push({x,type:rp(w.pool[kind]),id:id++});
      // later in the race: occasional quick pairs
      if(x>FIN*.4&&r()<.25&&kind!=="slow"){const x2=x+rr2(260,320);G.hazards.push({x:x2,type:rp(w.pool[r()<.5?"jump":"duck"]),id:id++});x=x2}
    }
    x+=rr2(520,780)*dif.hz*(1-WI*.02);
  }
  let ci=0;for(let cx=1600;cx<FIN-600;cx+=rr2(1300,1700)){
    if(G.gates.some(g=>Math.abs(g.x-cx)<560))continue;
    G.hazards=G.hazards.filter(h=>Math.abs(h.x-cx)>200);
    G.chests.push({x:cx,word:rest[(3+ci)%rest.length]||pool[ci%pool.length],id:ci});ci++;
  }
  for(let px=2000;px<FIN-800;px+=rr2(1600,2400)){if(G.hazards.some(h=>Math.abs(h.x-px)<160)||G.gates.some(g=>Math.abs(g.x-px)<500))continue;G.pads.push({x:px,id:G.pads.length})}
}

/* ---------- race start ----------
   mode 0 = attract (menus), 1 = solo vs 3 bots, 2 = daily race, 3 = online vs a friend */
function startRace(mode,seed,rival,study){
  audio();
  const dif=DIFF[PROG.settings.diff];
  FIN=9600+WI%WORLDS.length*500;
  const me=newRacer(PROG.name||"You",runnerById(PROG.runner),PROG.trail,false);
  G={mode,phase:"count",cnt:3.4,lastBeep:4,t:0,start:0,ts:1,tsT:1,hitstop:0,shake:0,parts:[],floats:[],seen:new Set(),newWords:[],
     host:!!(rival&&rival.host),lanes:[me],gate:null,tut:{on:!PROG.tut&&mode===1,step:0},speedLines:0,flashT:0,camKick:0};
  if(mode===3){const o=newRacer(String(rival.name||"Friend").slice(0,12),runnerById(rival.runner),rival.trail,false);o.remote=true;G.lanes.push(o)}
  else{
    const used=new Set([PROG.runner]),names=shuffle(BOT_NAMES);
    for(let i=0;i<3;i++){const rr=shuffle(RUNNERS).find(x=>!used.has(x.id))||RUNNERS[i];used.add(rr.id);
      const L=newRacer(names[i],rr,pick(TRAILS).id,true,dif.bot*(.88+i*.07));L.d=-(i+1)*30;G.lanes.push(L)}
  }
  G.lanes.forEach((L,i)=>{L.lane=i;for(let k=0;k<3;k++)L.cards[k]=dealCard(L)});
  if(G.tut.on)me.cards=[{w:"RUSH",n:0,pop:0},{w:"CONFIDENT",n:0,pop:0},{w:"SOAR",n:0,pop:0}];
  buildTrack(seed??Math.floor(Math.random()*1e9),study);
  UI.enterRace();
  kick();
  playMusic(["race","race2","race3"][WI%3]);
}

/* ---------- actions ---------- */
function puff(L,n,col,spd){for(let i=0;i<n;i++)G.parts.push({x:L.d+rnd(-8,4),y:L.y+2,vx:rnd(-1,.3)*(spd||90),vy:rnd(20,90),t:0,life:rnd(.3,.55),c:col||"rgba(255,255,255,.8)",s:rnd(2,4.5)})}
function burst(x,y,n,cols,spd,size){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=rnd(.4,1)*(spd||180);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,life:rnd(.4,.8),c:pick(cols),s:rnd(2,size||4.5),g:1})}}
function floatText(txt,col,big){G.floats.push({txt,col:col||"#fff",t:0,big:!!big,off:G.floats.length})}
function haptic(ms){if(navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}}

function jump(L){
  if(L.finished||L.wait>0)return false;
  if(L.soar>0)return false;
  if(L.slide>0){L.slide=0}
  if(L.jumps>=2){L.buf=.14;return false}
  L.vy=(L.jumps?JUMP2:JUMP1)*(L.weak>0?.68:1);L.jumps++;
  if(!L.bot&&!L.remote){sfx(L.jumps>1?"jump2":"jump");if(L.jumps>1)burst(L.d-6,L.y+10,8,["#fff","#FFE27A"],120,3);else puff(L,6);
    if(G.tut.on&&G.tut.step===0&&G.tut.waiting){G.tut.waiting=false;G.tut.step=1;G.tsT=1;UI.coach(null)}}
  return true;
}
function slide(L){
  if(L.finished||L.wait>0)return;
  if(L.y>0){L.vy=-1500;L.slideBuf=.35;if(!L.bot)sfx("whoosh");return}
  if(L.slide<=0&&!L.bot)sfx("slide");
  L.slide=.62;
  if(!L.bot){puff(L,8,"rgba(255,255,255,.7)",160);
    if(G.tut.on&&G.tut.step===1&&G.tut.waiting){G.tut.waiting=false;G.tut.step=2;G.tsT=1;UI.coach(null)}}
}
/* rival = racer just ahead (or just behind when you lead) */
function targetOf(i){
  const me=G.lanes[i],others=G.lanes.filter((L,j)=>j!==i&&!L.finished);if(!others.length)return null;
  const ahead=others.filter(L=>L.d>=me.d).sort((a,b)=>a.d-b.d);
  if(ahead.length)return ahead[0];
  return others.sort((a,b)=>b.d-a.d)[0];
}
function cast(i,ci){
  const L=G.lanes[i],c=L.cards[ci];
  if(!G||G.phase!=="run"||!c||c.n<c.w.length||L.finished)return;
  const P=POWERS[c.w];L.casts++;let res="";
  if(i===0){PROG.stats.casts++;learnSeen(c.w.toLowerCase());L.score+=40}
  if(c.w==="RUSH"){L.boost=3.2;res="Turbo boost!"}
  if(c.w==="SOAR"){L.soar=3.2;L.vy=Math.max(L.vy,700);L.slide=0;res="You're flying!"}
  if(c.w==="ATTRACT"){L.magnet=6;res="Letters fly to you!"}
  if(c.w==="CONFIDENT"){L.shield=1;res="Shield up!"}
  if(c.w==="MANAGE"){L.stun=0;L.tired=0;L.weak=0;L.wet=0;res="All slowdowns cleared!"}
  if(P.tgt==="rival"){
    const T=targetOf(i);
    if(!T)res="Nobody to hit!";
    else if(T.remote){res=`Sent to ${T.name}!`;NET.send("atk",{w:c.w})}
    else if(T.shield){T.shield=0;res=`${T.name}'s shield blocked it`;if(T===G.lanes[0])sfx("shield")}
    else{applyEffect(T,c.w);res=`${T.name}: ${P.eff.replace("Rival","").replace("Rival's","").trim()}!`;
      if(T===G.lanes[0]){UI.flash({icon:P.icon,w:c.w,m:P.m,k:P.k,res:`${L.name} cast ${c.w} on you!`,tone:"hit",col:P.col});sfx("attack");haptic(80)}}
  }
  if(i===0){
    UI.flash({icon:P.icon,w:c.w,m:P.m,k:P.k,res,tone:P.tgt==="rival"?"atk":"me",col:P.col});sfx(P.tgt==="rival"?"attack":"cast");
    burst(L.d,L.y+34,26,[P.col,"#fff","#FFE27A"],320,5);G.flashT=.25;G.flashCol=P.col;G.camKick=.5;
    setTimeout(()=>speak(c.w.toLowerCase()+". "+P.m),250);
    if(G.tut.on&&G.tut.step===2){G.tut.step=3;UI.coach(null);G.tut.on=false;PROG.tut=true;saveProg()}
  }
  L.cards[ci]=dealCard(L,c.w);if(i===0)UI.dirty=true;
}
function applyEffect(L,w){
  L.flash=.5;
  if(L===G.lanes[0])G.shake=.35;
  if(w==="AWKWARD"){L.stun=1.3;L.flash=1.3}
  if(w==="EXHAUSTED")L.tired=3.4;
  if(w==="NERVOUS")L.weak=4;
}
function applyAttack(w,from){
  if(!G||!POWERS[w])return;const L=G.lanes[0];if(L.finished)return;
  if(L.shield){L.shield=0;floatText("Blocked!","#2BD49A");sfx("shield");return}
  applyEffect(L,w);const P=POWERS[w];learnSeen(w.toLowerCase());sfx("attack");haptic(80);
  UI.flash({icon:P.icon,w,m:P.m,k:P.k,res:`${from} cast ${w} on you!`,tone:"hit",col:P.col});
}
function hurt(L,msg){
  if(L.shield){L.shield=0;if(!L.bot&&!L.remote){floatText("Shield saved you!","#2BD49A");sfx("shield");burst(L.d,L.y+30,16,["#2BD49A","#fff"],220)}return}
  L.stun=.75;L.flash=.9;L.combo=0;L.hits++;L.squash=.3;
  if(!L.bot&&!L.remote){floatText(msg,"#FF4E6B");sfx("hit");haptic(60);G.shake=.4;G.hitstop=.07;burst(L.d+10,L.y+30,14,["#FFC531","#fff","#FF4E6B"],240);PROG.stats.hits++}
}
function learnSeen(a){if(G&&G.seen&&!G.seen.has(a)){G.seen.add(a)}if(markSeen(a)&&G&&G.newWords)G.newWords.push(a)}
function neededLetters(L){return L.cards.filter(c=>c&&c.n<c.w.length).map(c=>c.w[c.n])}
function fillNext(L){for(const c of L.cards){if(c.n<c.w.length){c.n++;c.pop=1;if(c.n===c.w.length&&!L.bot)sfx("ready");UI.dirty=true;return}}}
function collect(L,l){
  for(const c of L.cards){if(c.n<c.w.length&&c.w[c.n]===l.ch){
    c.n++;c.pop=1;L.combo++;L.bestCombo=Math.max(L.bestCombo,L.combo);L.score+=10*Math.min(5,1+Math.floor(L.combo/5));L.coins++;
    if(!L.bot){UI.dirty=true;if(c.n===c.w.length){sfx("ready");floatText(c.w+" ready!",POWERS[c.w].col,true);
        if(G.tut.on&&G.tut.step===2&&!G.tut.cardShown){G.tut.cardShown=true;UI.coach("Tap the glowing card to cast <b>"+c.w+"</b>!","card")}}
      else sfx("coin");
      burst(l.x,l.high?140:30,8,["#FFC531","#FFE27A"],140,3);
      if(L.combo>0&&L.combo%5===0){floatText(`Combo ×${Math.min(5,1+L.combo/5)}`,"#FFC531");sfx("box")}}
    return}}
  L.score+=2;
  if(!L.bot){sfx("dud");burst(l.x,l.high?140:30,4,["#E4DEEC"],100,2.5)}
}
function openChest(L,b){
  L.chestHit.add(b.id);L.chests++;fillNext(L);L.score+=50;L.coins+=5;
  if(L.bot)return;
  learnSeen(b.word.a);sfx("box");UI.toast(`<span class="tw-pic">${b.word.p}</span><span><b>${b.word.a}</b> ${b.word.m}<br><span class="kn">${b.word.k}</span></span>`,"word");
  burst(b.x,120,18,["#FFC531","#fff","#FF8A1F"],220);setTimeout(()=>speak(b.word.a),150);
}
function spawnLetters(L){
  const ahead=L.d+W/U()+300;
  while(L.nextL<Math.min(ahead,FIN-180)){
    const x=L.nextL;
    const nearHz=G.hazards.find(h=>Math.abs(h.x-x)<110);
    if(!G.gates.some(g=>Math.abs(g.x-x)<340)&&!G.chests.some(b=>Math.abs(b.x-x)<130)){
      const need=neededLetters(L);
      // letters above a ground hazard reward the jump; under a duck hazard reward the slide
      let high=Math.random()<.4;
      if(nearHz){const k=HZ[nearHz.type].kind;if(k==="jump")high=true;else if(k==="duck"){high=false}}
      L.letters.push({x,ch:need.length&&Math.random()<.75?pick(need):pick("AEIOURSTNDHCKWMG".split("")),high,got:false,fly:0});
    }
    L.nextL+=rnd(110,165);
  }
  L.letters=L.letters.filter(l=>l.x>L.d-260&&!(l.got&&l.fly>=1));
}

/* ---------- gates: time stops, you choose, the race goes on ---------- */
function gateAnswer(v){
  const g=G.gate,L=G.lanes[0];if(!g)return false;
  const ok=v===g.q.a;L.gateDone.add(g.x);
  const lvl=markAnswer(g.q.a,ok);G.seen.add(g.q.a);
  if(ok){L.gates++;PROG.stats.gates++;L.boost=Math.max(L.boost,2.8);fillNext(L);L.score+=150;L.coins+=10;sfx("good")}
  else{L.tired=1.8;L.combo=0;sfx("bad")}
  return{ok,lvl};
}
function resumeRun(){if(G&&G.phase==="gate"){G.gate=null;G.phase="run";G.ts=.2;G.tsT=1;last=performance.now();sfx("pass")}}

/* ---------- update ---------- */
function update(rawDt){
  // time scale for slow-mo, hit-stop freezes the world briefly
  G.ts+=(G.tsT-G.ts)*Math.min(1,rawDt*8);
  if(G.hitstop>0){G.hitstop-=rawDt;return}
  const dt=rawDt*G.ts;
  G.shake=Math.max(0,G.shake-rawDt);G.flashT=Math.max(0,G.flashT-rawDt);G.camKick=Math.max(0,G.camKick-rawDt*2);
  G.parts.forEach(p=>{p.t+=rawDt;p.x+=p.vx*rawDt;p.y+=p.vy*rawDt;p.vy-=(p.g?600:120)*rawDt});G.parts=G.parts.filter(p=>p.t<p.life);
  G.floats.forEach(f=>f.t+=rawDt);G.floats=G.floats.filter(f=>f.t<1.3);
  if(G.parts.length>400)G.parts.splice(0,G.parts.length-400);
  if(G.mode===3)NET.tick();
  G.lanes.forEach(L=>{if(L.remote){L.d+=(L.td-L.d)*Math.min(1,rawDt*10);L.y+=(L.ty-L.y)*Math.min(1,rawDt*14);L.sl+=((L.tsl?1:0)-L.sl)*Math.min(1,rawDt*14);L.ph+=rawDt*12;L.flash=Math.max(0,L.flash-rawDt)}});
  if(G.phase==="count"){G.cnt-=rawDt;G.t+=rawDt;const n=Math.ceil(G.cnt);if(n<G.lastBeep&&n>0&&n<=3){G.lastBeep=n;sfx("beep");UI.count(n)}
    if(G.cnt<=0){G.phase="run";G.start=performance.now();sfx("go");UI.count(0);G.lanes.forEach(L=>{if(!L.remote)L.boost=.5});
      if(G.tut.on)setTimeout(()=>{if(G&&G.tut.on&&G.tut.step===0&&!G.tut.waiting)UI.coach("Grab <b>gold letters</b> to spell the power words below.","info",3000)},2600)}return}
  if(G.phase==="gate"||G.phase==="paused")return;
  if(G.phase==="gateIn"){G.gateT-=rawDt;stepAll(dt);if(G.gateT<=0){G.phase="gate";UI.showGate(G.gate)}return}
  if(G.phase==="finished"){G.finWait-=rawDt;stepAll(dt);if(G.finWait<=0){G.phase="yaksha";running=false;UI.startYaksha()}return}
  if(G.phase==="attract"){stepAll(dt);return}
  if(G.phase!=="run")return;
  G.t+=dt;
  stepAll(dt);
  // tutorial coaching: slow time right before the first obstacles
  if(G.tut.on){const L=G.lanes[0];
    if(G.tut.step===0&&!G.tut.waiting){const h=G.hazards[0];if(h&&h.x-L.d<200&&h.x-L.d>0){G.tut.waiting=true;G.tsT=.06;UI.coach("<b>Tap</b> anywhere to jump!","tap")}}
    if(G.tut.step===1&&!G.tut.waiting){const h=G.hazards[1];if(h&&h.x-L.d<190&&h.x-L.d>0){G.tut.waiting=true;G.tsT=.06;UI.coach("<b>Swipe down</b> to slide under!","swipe")}}
  }
}
function stepAll(dt){G.lanes.forEach((L,i)=>{if(!L.remote)stepLane(L,i,dt)})}
function stepLane(L,i,dt){
  const me=i===0&&G.mode!==0;
  // vertical physics
  const g=L.soar>0?GRAV*.25:GRAV;
  if(L.soar>0&&L.y<210)L.vy=Math.max(L.vy,260);
  if(L.soar>0&&L.y>=210)L.vy=Math.min(L.vy,30)-(L.y-210)*2*dt;
  L.vy-=g*dt;L.y+=L.vy*dt;
  if(L.y<=0){
    if(L.vy<-500){L.squash=.18;if(me){puff(L,5);if(L.vy<-1200)sfx("land")}}
    L.y=0;L.vy=0;L.jumps=0;
    if(L.slideBuf>0){L.slideBuf=0;L.slide=.55}
    if(L.buf>0){L.buf=0;jump(L)}
  }
  L.buf=Math.max(0,L.buf-dt);L.slideBuf=Math.max(0,(L.slideBuf||0)-dt);L.squash=Math.max(0,L.squash-dt);
  L.slide=Math.max(0,L.slide-dt);L.sl+=((L.slide>0?1:0)-L.sl)*Math.min(1,dt*18);
  if(L.finished){L.d+=140*dt;L.ph+=dt*7;return}
  ["stun","boost","tired","weak","wet","flash","soar","magnet"].forEach(k=>L[k]=Math.max(0,L[k]-dt));
  if(L.wait>0){L.wait-=dt;return}
  const dif=DIFF[PROG.settings.diff],prog=L.d/FIN;
  let v=(240+WI%5*6)*dif.speed*(1+prog*.12);
  if(L.boost)v*=1.6;if(L.soar)v*=1.15;if(L.tired)v*=.6;if(L.wet)v*=.72;if(L.stun)v*=.32;
  // gentle rubber-banding keeps races close
  if(L.bot&&G.mode!==0){const p=G.lanes[0],gap=p.d-L.d;if(gap>650)v*=1.1;else if(gap<-900)v*=.93}
  L.d=Math.min(FIN,L.d+v*dt);L.ph+=v*dt*.05;
  if(me){
    if(L.y===0&&L.sl<.5&&Math.random()<.35){const T=trailById(L.trail);G.parts.push({x:L.d-10,y:2,vx:-rnd(40,90),vy:rnd(10,50),t:0,life:.4,c:pick(T.cols),s:rnd(2,4)})}
    if((L.boost||L.soar)&&Math.random()<.8){const T=trailById(L.trail==="dust"?"spark":L.trail);G.parts.push({x:L.d-14,y:L.y+rnd(10,50),vx:-rnd(180,260),vy:rnd(-20,20),t:0,life:.35,c:pick(T.cols),s:rnd(2.5,4.5)})}
    const s=secAt(L.d);if(s!==L.sec){L.sec=s;if(G.t>1)UI.place(WD().secs[s][0],WD().secs[s][1])}
  }
  spawnLetters(L);
  if(L.bot)botThink(L,i,v);
  // gates
  for(const gt of G.gates){
    if(L.gateDone.has(gt.x))continue;
    if(me&&G.phase==="run"&&gt.x-L.d<150&&gt.x>L.d-10){G.gate=gt;G.phase="gateIn";G.gateT=.45;G.tsT=0;sfx("gate");UI.coach(null);return}
    if(L.bot&&L.d>=gt.x){L.gateDone.add(gt.x);L.wait=rnd(1.0,2.0);if(Math.random()<L.skill){L.gates++;L.boost=2.4;fillNext(L)}else L.tired=1.6}
    if(G.mode===0&&L.d>=gt.x)L.gateDone.add(gt.x);
  }
  // speed pads
  for(const p of G.pads){if(L.padHit.has(p.id))continue;if(Math.abs(p.x-L.d)<26&&L.y<10){L.padHit.add(p.id);L.boost=Math.max(L.boost,1.1);if(me){sfx("whoosh");floatText("Boost!","#5CC8FF");G.camKick=.4}}}
  // collisions — hitboxes are a little smaller than the art so near misses feel fair
  const top=L.y+(L.sl>.5?BODY_SL:BODY);
  for(const h of G.hazards){
    const hx=hzX(h);if(hx<L.d-100||hx>L.d+100||L.hit.has(h.id))continue;
    const D=HZ[h.type];if(Math.abs(hx-L.d)>D.w*.8+8)continue;
    if(D.kind==="duck"){if(top>D.lo+4&&L.soar<=0){L.hit.add(h.id);hurt(L,D.msg)}}
    else if(D.kind==="slow"){if(L.y<6){L.hit.add(h.id);L.wet=1.1;if(me){floatText(D.msg,"#5CC8FF");sfx("splash");burst(L.d,4,14,["#8FD3FF","#fff"],200,3)}}}
    else if(L.y<D.h-5){L.hit.add(h.id);hurt(L,D.msg);if(h.type==="dog"&&me)sfx("bark")}
    else if(me&&!h.cleared&&hx<L.d){h.cleared=1}
  }
  for(const b of G.chests){if(L.chestHit.has(b.id))continue;if(Math.abs(b.x-L.d)>26)continue;if(top>104&&L.y<136)openChest(L,b)}
  for(const l of L.letters){if(l.got)continue;
    const ly=l.high?140:30;
    if(L.magnet>0&&!L.bot&&l.x-L.d<340&&l.x-L.d>-20){l.mag=true}
    if(l.mag){l.x+=(L.d-l.x)*Math.min(1,dt*9);l.y=(l.y??ly)+((L.y+30)-(l.y??ly))*Math.min(1,dt*9);if(Math.abs(l.x-L.d)<20){l.got=true;collect(L,l)}continue}
    if(Math.abs(l.x-L.d)>24)continue;if(top>ly-18&&L.y<ly+20){l.got=true;collect(L,l)}}
  if(L.d>=FIN){
    L.finished=true;L.finT=G.mode===3?(performance.now()-G.start)/1000:G.t;
    L.place=1+G.lanes.filter(o=>o!==L&&o.finished&&o.place).length;
    if(me){sfx("finish");G.phase="finished";G.finWait=1.8;G.tsT=.35;burst(L.d+20,120,60,["#FF3B4E","#FFC531","#2BD49A","#3EA2FF","#fff"],420,6);if(G.mode===3)NET.send("fin",{t:L.finT});UI.finishBanner(L.place)}
  }
}
function botThink(L,i,v){
  const lead=v*.32;
  for(const h of G.hazards){const hx=hzX(h);if(hx<L.d||hx>L.d+lead+70)continue;const key="h"+h.id;if(key in L.decide)continue;
    if(hx<L.d+lead){L.decide[key]=1;const k=HZ[h.type].kind,ok=Math.random()<L.skill+.08;
      if(k==="jump"&&ok&&L.y===0)jump(L);if(k==="duck"&&ok)slide(L)}}
  for(const b of G.chests){if(b.x<L.d||b.x>L.d+lead+40)continue;const key="b"+b.id;if(key in L.decide)continue;if(b.x<L.d+lead*.95){L.decide[key]=1;if(Math.random()<L.skill*.7&&L.y===0)jump(L)}}
  for(const l of L.letters){if(l.got||l.x<L.d||l.x>L.d+lead+40)continue;const key="l"+l.x;if(key in L.decide)continue;
    if(l.x<L.d+lead*.9){L.decide[key]=1;if(l.high&&neededLetters(L).includes(l.ch)&&Math.random()<L.skill*.6&&L.y===0)jump(L)}}
  if(G.mode===0)return;
  const ready=L.cards.findIndex(c=>c.n>=c.w.length);
  if(ready>=0){if(!L.castT)L.castT=rnd(1.2,3.2);else{L.castT-=1/60;if(L.castT<=0){L.castT=0;cast(i,ready)}}}
}

/* ---------- rendering ---------- */
function drawWorld(){
  const L=G.lanes[0],u=U(),gy=groundY(),px=PX(),t=G.t,Wd=WD();
  const sec=Math.max(0,secAt(L.d)),wi=WI%WORLDS.length;
  // blend the sky between sections
  const fp=L.d/FIN*4,s0=Math.min(3,Math.floor(fp)),s1=Math.min(3,s0+1),bl=clamp((fp-s0-.8)/.2,0,1);
  const sk0=Wd.sky[s0],sk1=Wd.sky[s1],night=Wd.theme==="palace"&&sec===2,sunset=sec===3&&Wd.theme!=="falls"&&Wd.theme!=="forest";
  ctx.save();
  if(G.shake>0&&PROG.settings.motion){const m=G.shake*12;ctx.translate(rnd(-m,m),rnd(-m,m)*.7)}
  drawSky(mix(sk0[0],sk1[0],bl),mix(sk0[1],sk1[1],bl),gy,sunset,night,t,u);
  drawClouds(L.d,gy,u,t,night);
  drawLayers(wi,L.d,gy,u,night,t);
  if(Wd.theme==="forest"&&sec===1){ctx.fillStyle="rgba(240,245,245,.35)";ctx.fillRect(0,0,W,gy)}
  drawGround(Wd,L.d,gy,u,t);
  const sx=x=>(x-L.d)*u+px;
  // speed pads
  for(const p of G.pads){const x=sx(p.x);if(x<-60||x>W+60)continue;ctx.save();ctx.translate(x,gy+12*u);ctx.scale(u,u);const used=L.padHit.has(p.id);
    ctx.fillStyle=used?"rgba(92,200,255,.25)":"rgba(92,200,255,.85)";rrc(ctx,-30,-6,60,12,6);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=INK;ctx.stroke();
    ctx.fillStyle="#fff";for(let k=0;k<3;k++){const o=((t*60+k*16)%48)-24;ctx.globalAlpha=used?.3:1;ctx.beginPath();ctx.moveTo(o-4,-4);ctx.lineTo(o+3,0);ctx.lineTo(o-4,4);ctx.lineTo(o-1,0);ctx.fill()}ctx.restore()}
  const fx=sx(FIN);if(fx<W+120)drawFinish(fx,gy,u,t);
  for(const g of G.gates){const x=sx(g.x);if(x>-90&&x<W+90)drawGate(x,gy,u,t,L.gateDone.has(g.x),Wd.pal.accent)}
  for(const b of G.chests){const x=sx(b.x);if(x>-50&&x<W+50)drawChest(x,gy-120*u,u,L.chestHit.has(b.id),t)}
  for(const h of G.hazards){const hx=hzX(h),x=sx(hx);if(x<-160||x>W+160)continue;drawHazard(h,x,gy,u,t,hx,L.hit.has(h.id),L.d)}
  // rivals, a little behind on the road (depth lanes)
  const others=G.lanes.slice(1).map((R,j)=>({R,j})).sort((a,b)=>b.j-a.j);
  for(const {R,j} of others){const x=sx(R.d);if(x<-60||x>W+60)continue;const dy=-(j+1)*7*u,sc=.86-j*.03;
    ctx.fillStyle="rgba(0,0,0,.18)";ctx.beginPath();ctx.ellipse(x,gy+dy+2*u,15*u*sc,4*u,0,0,7);ctx.fill();
    ctx.globalAlpha=R.flash>0&&Math.floor(R.flash*14)%2?.35:.92;drawRacer(R,x,gy+dy,u*sc);ctx.globalAlpha=1;
    if(R.shield)shieldFx(x,gy+dy-R.y*u*sc,u*sc,t);
    if(R.name)pill(R.name,x,gy+dy-(R.y+92)*u*sc,R.remote?"#FF8A1F":"#5B4A8A",u*.92)}
  // letters
  const need=neededLetters(L);
  for(const l of L.letters){if(l.got&&!l.mag)continue;if(l.got)continue;const x=sx(l.x);if(x<-30||x>W+30)continue;const ly=l.y??(l.high?140:30);drawCoin(x,gy-ly*u+Math.sin(t*4+l.x)*3*u,u,l.ch,need.includes(l.ch),t)}
  // tags for upcoming hazards
  for(const h of G.hazards){if(L.hit.has(h.id))continue;const hx=hzX(h),x=sx(hx);if(x<px+30*u||x>W+80)continue;ctx.globalAlpha=clamp((x-px-30*u)/(80*u),0,1);hazardTag(h,x,gy,u,t);ctx.globalAlpha=1}
  // player
  if(G.mode!==0){
    ctx.fillStyle="rgba(0,0,0,.28)";ctx.beginPath();ctx.ellipse(px,gy+3*u,Math.max(6,18-L.y*.05)*u,4.5*u,0,0,7);ctx.fill();
    if(L.soar>0){ctx.save();ctx.globalAlpha=.6;ctx.fillStyle="#fff";[-1,1].forEach(m=>{ctx.beginPath();ctx.ellipse(px-8*u,gy-(L.y+44)*u,22*u,8*u,m*.5+Math.sin(t*18)*.3,0,7);ctx.fill()});ctx.restore()}
    if(!(L.flash>0&&Math.floor(L.flash*14)%2))drawRacer(L,px,gy,u*1.08);
    if(L.shield)shieldFx(px,gy-L.y*u,u*1.08,t);
    if(L.magnet>0){ctx.strokeStyle=`rgba(255,92,138,${.4+.3*Math.sin(t*10)})`;ctx.lineWidth=2*u;ctx.setLineDash([6*u,6*u]);ctx.lineDashOffset=-t*40;ctx.beginPath();ctx.arc(px,gy-(L.y+32)*u,70*u,0,7);ctx.stroke();ctx.setLineDash([])}
    const st=[L.stun&&"💫",L.tired&&"😩",L.weak&&"😰",L.wet&&"💦"].filter(Boolean).join("");
    if(st){ctx.font=`${18*u}px serif`;ctx.textAlign="center";ctx.fillText(st,px+4*u,gy-(L.y+96)*u)}
  }else{
    // attract mode: show the leader as the hero
    drawRacer(L,px,gy,u*1.05);
  }
  // particles (world space)
  for(const p of G.parts){const x=sx(p.x),y=gy-p.y*u;if(x<-20||x>W+20)continue;ctx.globalAlpha=clamp(1-p.t/p.life,0,1);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(x,y,p.s*u*(1-p.t/p.life*.5),0,7);ctx.fill()}
  ctx.globalAlpha=1;
  // floating text near the player
  G.floats.forEach((f,j)=>{const a=f.t<.15?f.t/.15:clamp((1.3-f.t)/.4,0,1),y=gy-(L.y+86+f.t*40+(G.floats.length-1-j)*22)*u;
    ctx.globalAlpha=a;ctx.font=F(800,(f.big?22:17)*u);ctx.textAlign="left";ctx.lineWidth=5*u;ctx.strokeStyle=INK;ctx.lineJoin="round";const x=px+30*u;ctx.strokeText(f.txt,x,y);ctx.fillStyle=f.col;ctx.fillText(f.txt,x,y)});
  ctx.globalAlpha=1;
  ctx.restore();
  // screen effects
  if(G.mode!==0&&(L.boost>0||L.soar>0)&&PROG.settings.motion){ctx.strokeStyle="rgba(255,255,255,.5)";ctx.lineWidth=2;for(let k=0;k<14;k++){const y=hash(k+Math.floor(t*20))*gy,x=((hash(k*3)*W*1.4)-(t*1800)%(W*1.4)+W*1.4)%(W*1.4);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+60+hash(k)*80,y);ctx.stroke()}}
  if(G.flashT>0){ctx.fillStyle=G.flashCol||"#fff";ctx.globalAlpha=G.flashT*1.2;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
  if(G.mode!==0&&G.ts<.5){ctx.fillStyle=`rgba(20,12,40,${(.5-G.ts)*.6})`;ctx.fillRect(0,0,W,H)}
  // vignette
  const vg=ctx.createRadialGradient(W/2,H*.45,Math.min(W,H)*.35,W/2,H*.45,Math.max(W,H)*.8);vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(10,5,30,.35)");ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}
function shieldFx(x,y,u,t){const r=(46+Math.sin(t*6)*2)*u;ctx.fillStyle="rgba(43,212,154,.16)";ctx.strokeStyle="rgba(43,212,154,.9)";ctx.lineWidth=3*u;ctx.beginPath();ctx.arc(x,y-34*u,r,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle="rgba(255,255,255,.7)";ctx.lineWidth=2*u;ctx.beginPath();ctx.arc(x,y-34*u,r*.8,-2.4+t,-1.6+t);ctx.stroke()}
function drawRacer(L,x,gy,u){
  const sq=L.squash>0?Math.sin(L.squash/.3*Math.PI)*.18:0,stretch=L.y>0?clamp(L.vy/3000,-.08,.12):0;
  ctx.save();ctx.translate(x,gy-L.y*u);ctx.scale(u*(1+sq-stretch*.5),u*(1-sq+stretch));
  drawCritter(ctx,L.R,{ph:L.ph,air:L.y>2,vy:L.vy,slide:L.sl,stun:L.stun,idle:G.phase==="count",win:L.finished,t:G.t});
  ctx.restore();
}
let loopGen=0;
function kick(){const my=++loopGen;running=true;last=performance.now();
  const f=t=>{if(!running||my!==loopGen)return;const dt=Math.min(.05,Math.max(0,(t-last)/1000));last=t;update(dt);if(G){drawWorld();if(G.mode!==0)UI.hud()}requestAnimationFrame(f)};
  requestAnimationFrame(f)}

/* ---------- input ---------- */
let touch=null;
cv.addEventListener("pointerdown",e=>{e.preventDefault();audio();if(!G||!running||G.mode===0)return;
  touch={x:e.clientX,y:e.clientY,t:performance.now(),jumped:false,slid:false};
  if(G.phase==="run"||G.phase==="finished"){if(G.tut.on&&G.tut.step===1&&G.tut.waiting)return;touch.jumped=jump(G.lanes[0]);touch.y0=G.lanes[0].y}},{passive:false});
cv.addEventListener("pointermove",e=>{if(!touch||touch.slid||!G||G.phase!=="run")return;const dy=e.clientY-touch.y;
  if(dy>26&&dy>Math.abs(e.clientX-touch.x)){touch.slid=true;const L=G.lanes[0];
    // a swipe that started with a tap-jump becomes a slide, not a hop
    if(touch.jumped&&performance.now()-touch.t<260&&L.jumps===1&&L.y<60){L.y=0;L.vy=0;L.jumps=0}
    slide(L)}});
addEventListener("pointerup",()=>{touch=null});
addEventListener("keydown",e=>{
  if(!G||!running||G.mode===0)return;const k=e.key;
  if((k===" "||k==="ArrowUp"||k==="w"||k==="W")&&(G.phase==="run"||G.phase==="finished")){e.preventDefault();if(!(G.tut.on&&G.tut.step===1&&G.tut.waiting))jump(G.lanes[0])}
  if((k==="ArrowDown"||k==="s"||k==="S")&&G.phase==="run"){e.preventDefault();slide(G.lanes[0])}
  if("123".includes(k)&&k.length===1&&G.phase==="run")cast(0,+k-1);
  if(k==="Escape"||k==="p"||k==="P")UI.pause();
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&G&&running&&G.mode!==0&&(G.phase==="run"||G.phase==="count"))UI.pause()});

/* ---------- attract mode behind the menus ---------- */
function startAttract(){
  if(G&&G.mode===0&&running)return;
  FIN=1e9;const wi=WI%WORLDS.length;
  G={mode:0,phase:"attract",t:0,ts:1,tsT:1,hitstop:0,shake:0,parts:[],floats:[],seen:new Set(),lanes:[],hazards:[],gates:[],chests:[],pads:[],tut:{on:false},flashT:0,camKick:0};
  const rs=shuffle(RUNNERS.filter(r=>r.id!==PROG.runner));
  [PROG.runner,rs[0].id,rs[1].id].forEach((id,i)=>{const L=newRacer("",runnerById(id),"dust",true,.97);L.d=-i*50;G.lanes.push(L);L.cards=[{w:"RUSH",n:0},{w:"SOAR",n:0},{w:"MANAGE",n:0}]});
  for(let x=700;x<2e5;x+=rnd(520,760)){const W2=WD(),k=Math.random()<.7?"jump":"duck";G.hazards.push({x,type:pick(W2.pool[k].filter(t=>!HZ[t].move)),id:G.hazards.length})}
  kick();
}
function stopRace(){running=false;G=null}
