"use strict";
/* ============================================================
   Save data: profile, currency, cosmetics, word mastery (spaced repetition),
   stats, achievements, daily streak and settings. Lives in localStorage.
   ============================================================ */
const SAVE_KEY="sr-save3";
const DAY=86400000;
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};

function freshSave(){
  return{v:3,name:"",runner:"mithra",trail:"dust",owned:{runners:["mithra","chiku"],trails:["dust"]},
    xp:0,coins:0,stars:{},best:{},words:{},
    stats:{races:0,wins:0,casts:0,gates:0,hits:0,lamps:0},
    ach:{},streak:{n:0,last:""},daily:{date:"",done:false},
    settings:{music:.6,sfx:.8,voice:true,motion:true,diff:1},tut:false,seenIntro:false};
}
let PROG=freshSave();
(function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw){const s=JSON.parse(raw);PROG=Object.assign(freshSave(),s);
      PROG.settings=Object.assign(freshSave().settings,s.settings||{});
      PROG.stats=Object.assign(freshSave().stats,s.stats||{});
      PROG.owned=Object.assign(freshSave().owned,s.owned||{});return}
    // migrate the previous version's progress
    const old=localStorage.getItem("sr-prog2");
    if(old){const o=JSON.parse(old);
      Object.keys(o.book||{}).forEach(w=>PROG.words[w]={lvl:1,seen:o.book[w],right:1,wrong:0,due:Date.now()});
      Object.assign(PROG.stars,o.stars||{});PROG.tut=!!o.seenHelp;}
  }catch(e){}
})();
function saveProg(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(PROG))}catch(e){}}

/* ---------- levels ---------- */
function levelInfo(xp){
  let lvl=1,need=120,acc=0;
  while(xp>=acc+need){acc+=need;lvl++;need=120+(lvl-1)*60}
  return{lvl,into:xp-acc,need,pct:(xp-acc)/need};
}

/* ---------- word mastery (Leitner boxes 0..5) ---------- */
const GAPS=[0,.02,1,2,4,8]; // days until a word is due again, per level
function wordRec(a){a=a.toLowerCase();return PROG.words[a]||(PROG.words[a]={lvl:0,seen:0,right:0,wrong:0,due:0})}
function knows(a){const r=PROG.words[a.toLowerCase()];return !!(r&&r.seen)}
function markSeen(a){const r=wordRec(a);const isNew=!r.seen;r.seen++;if(!r.lvl)r.lvl=1;if(!r.due)r.due=Date.now()+GAPS[1]*DAY;saveProg();return isNew}
function markAnswer(a,ok){
  const r=wordRec(a);r.seen++;
  if(ok){r.right++;r.lvl=Math.min(5,r.lvl+1)}else{r.wrong++;r.lvl=Math.max(1,r.lvl-1)}
  r.due=Date.now()+GAPS[r.lvl]*DAY;saveProg();return r.lvl;
}
/* Prefer words that are due or weak; new words count as weak. */
function pickStudyWords(pool,n,rng){
  const now=Date.now(),R=rng||Math.random;
  const scored=pool.map(w=>{const r=PROG.words[w.a];const due=!r||!r.seen?1.5:r.due<=now?2:0;const weak=r?5-r.lvl:5;return{w,s:due*3+weak+R()*3}});
  return scored.sort((a,b)=>b.s-a.s).slice(0,n).map(x=>x.w);
}
function masteredCount(){return Object.values(PROG.words).filter(r=>r.lvl>=5).length}
function discoveredCount(){return Object.values(PROG.words).filter(r=>r.seen).length}
function dueWords(){const now=Date.now();return allWords().filter(w=>{const r=PROG.words[w.a];return r&&r.seen&&r.due<=now})}
function allWords(){
  const out=[];
  WORLDS.forEach((Wd,wi)=>Wd.words.forEach(x=>out.push({...x,world:Wd.name,wi})));
  Object.entries(POWERS).forEach(([w,p])=>out.push({a:w.toLowerCase(),m:p.m,k:p.k,p:p.icon,world:"Power words",wi:-1}));
  return out;
}

/* ---------- streak ---------- */
function touchStreak(){
  const t=today();if(PROG.streak.last===t)return false;
  const y=new Date(Date.now()-DAY);const ys=y.getFullYear()+"-"+String(y.getMonth()+1).padStart(2,"0")+"-"+String(y.getDate()).padStart(2,"0");
  PROG.streak.n=PROG.streak.last===ys?PROG.streak.n+1:1;PROG.streak.last=t;saveProg();return true;
}

/* ---------- achievements ---------- */
function unlock(id){if(PROG.ach[id])return null;PROG.ach[id]=Date.now();saveProg();return ACHIEVEMENTS.find(a=>a.id===id)}
function checkAchievements(ctx){
  const got=[];const u=id=>{const a=unlock(id);if(a)got.push(a)};
  if(PROG.stats.races>=1)u("first");
  if(ctx&&ctx.place===1)u("win");
  if(ctx&&ctx.gates>=3)u("gates3");
  if(ctx&&ctx.lamps>=3)u("lamps3");
  if(ctx&&ctx.hits===0&&ctx.finished)u("flawless");
  if(PROG.stats.casts>=10)u("spell10");
  if(discoveredCount()>=25)u("words25");
  if(masteredCount()>=10)u("master10");
  if(PROG.streak.n>=3)u("streak3");
  if(WORLDS.every((w,i)=>(PROG.stars[i]||0)>=1))u("allworlds");
  return got;
}

/* ---------- unlocks ---------- */
function worldUnlocked(i){return i===0||(PROG.stars[i-1]||0)>=1}
function runnerById(id){return RUNNERS.find(r=>r.id===id)||RUNNERS[0]}
function trailById(id){return TRAILS.find(r=>r.id===id)||TRAILS[0]}
