"use strict";
/* ================= AUDIO (original chiptune) ================= */
let AC=null,master,musicBus,sfxBus,noiseBuf,muted=false,musicTimer=null,track=null,nextT=0,step=0;
try{muted=localStorage.getItem("sr-muted")==="1"}catch(e){}
function audio(){
  if(AC){if(AC.state==="suspended")AC.resume();return true}
  try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return false}
  master=AC.createGain();master.gain.value=muted?0:1;master.connect(AC.destination);
  musicBus=AC.createGain();musicBus.gain.value=.15;musicBus.connect(master);
  sfxBus=AC.createGain();sfxBus.gain.value=.32;sfxBus.connect(master);
  noiseBuf=AC.createBuffer(1,AC.sampleRate*.5,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return true;
}
const mf=n=>440*Math.pow(2,(n-69)/12);
function tone(f,dur,type="square",vol=.5,slide=0,when=0,bus){
  if(!AC)return;const t=AC.currentTime+when,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(bus||sfxBus);o.start(t);o.stop(t+dur+.02);
}
function noise(dur,vol=.4,when=0,hp=800,bus){
  if(!AC)return;const t=AC.currentTime+when,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf;f.type="highpass";f.frequency.value=hp;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(bus||sfxBus);s.start(t);s.stop(t+dur);
}
const SFX={
  jump:()=>tone(380,.16,"square",.35,760), jump2:()=>tone(560,.14,"square",.3,1100),
  coin:()=>{tone(988,.07,"square",.3);tone(1319,.2,"square",.3,0,.07)}, dud:()=>tone(520,.06,"triangle",.22),
  box:()=>{tone(660,.08,"square",.3);tone(880,.08,"square",.3,0,.08);tone(1320,.25,"square",.3,0,.16)},
  ready:()=>[523,659,784,1047].forEach((n,i)=>tone(n,.12,"square",.28,0,i*.07)),
  cast:()=>{tone(220,.45,"sawtooth",.25,1400);noise(.35,.25,0,2000)}, attack:()=>{tone(900,.4,"square",.25,120);noise(.25,.3,.05,600)},
  hit:()=>{noise(.18,.5,0,300);tone(180,.25,"square",.35,55)}, shield:()=>{tone(1200,.1,"triangle",.3);tone(1600,.18,"triangle",.3,0,.08)},
  splash:()=>noise(.3,.35,0,1500), good:()=>[784,988,1175,1568].forEach((n,i)=>tone(n,.1,"square",.25,0,i*.06)),
  bad:()=>{tone(330,.18,"square",.3);tone(247,.3,"square",.3,0,.16)}, beep:()=>tone(660,.12,"square",.3), go:()=>tone(1320,.35,"square",.3),
  bark:()=>{tone(420,.08,"sawtooth",.25,260);tone(420,.08,"sawtooth",.25,260,.12)},
  finish:()=>[523,659,784,1047,784,1047].forEach((n,i)=>tone(n,i===5?.5:.12,"square",.28,0,i*.11)),
  bossHit:()=>{noise(.3,.5,0,200);tone(140,.4,"sawtooth",.35,40)}, roar:()=>{tone(110,.7,"sawtooth",.35,60);noise(.6,.25,0,150)}
};
function sfx(n){if(AC&&!muted)try{SFX[n]()}catch(e){}}
const TRACKS={
  race:{bpm:150,lead:[72,0,76,0,79,0,76,79,81,0,79,0,76,0,74,0,72,0,76,0,79,0,84,0,83,0,81,0,79,0,0,0,76,0,79,0,84,0,79,0,81,0,84,0,86,0,84,0,83,0,79,0,76,0,74,0,76,0,72,0,0,0,0,0],
        bass:[48,0,55,0,48,0,55,0,53,0,60,0,53,0,60,0,48,0,55,0,48,0,55,0,55,0,62,0,55,0,62,0,52,0,59,0,52,0,59,0,53,0,60,0,53,0,60,0,55,0,62,0,55,0,62,0,48,0,55,0,48,0,0,0]},
  race2:{bpm:156,lead:[74,0,78,81,0,78,74,0,76,0,79,83,0,79,76,0,78,0,81,86,0,81,78,0,79,78,76,0,74,0,0,0],
        bass:[50,0,57,0,50,0,57,0,52,0,59,0,52,0,59,0,54,0,61,0,54,0,61,0,55,0,62,0,57,0,0,0]},
  boss:{bpm:168,lead:[69,0,72,69,76,0,72,0,71,0,74,71,77,0,74,0,69,0,72,69,76,0,81,0,80,0,76,0,71,0,0,0],
        bass:[45,45,0,45,52,0,45,0,50,50,0,50,57,0,50,0,45,45,0,45,52,0,45,0,52,52,0,52,59,0,56,0]}
};
function playMusic(name){
  stopMusic();if(!AC)return;track=TRACKS[name];step=0;nextT=AC.currentTime+.05;
  musicTimer=setInterval(()=>{const sp=60/track.bpm/2;
    while(nextT<AC.currentTime+.12){const L=track.lead[step%track.lead.length],B=track.bass[step%track.bass.length],w=nextT-AC.currentTime;
      if(L)tone(mf(L),sp*.9,"square",.32,0,w,musicBus);if(B)tone(mf(B),sp*.95,"triangle",.6,0,w,musicBus);
      if(step%2===0)noise(.04,step%8===0?.5:.18,w,step%8===0?100:6000,musicBus);step++;nextT+=sp}},25);
}
function stopMusic(){clearInterval(musicTimer);musicTimer=null}
function setMute(m){muted=m;try{localStorage.setItem("sr-muted",m?"1":"0")}catch(e){}if(master)master.gain.value=m?0:1}
function speak(t){if(muted)return;try{const u=new SpeechSynthesisUtterance(t);u.lang="en-IN";u.rate=.95;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}

