"use strict";
/* ============================================================
   Audio: an original procedural soundtrack and sound effects.
   Web Audio graph: voices → music/sfx bus → master → compressor → out,
   with a shared echo send for space. Nothing is loaded from files.
   ============================================================ */
let AC=null,master,musicBus,sfxBus,echoIn,noiseBuf,musicTimer=null,curTrack=null,nextT=0,step=0,duck=1;

function audio(){
  if(AC){if(AC.state==="suspended")AC.resume();return true}
  try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return false}
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(AC.destination);
  master=AC.createGain();master.connect(comp);
  musicBus=AC.createGain();musicBus.connect(master);
  sfxBus=AC.createGain();sfxBus.connect(master);
  // echo send
  echoIn=AC.createGain();echoIn.gain.value=.22;
  const dl=AC.createDelay(1);dl.delayTime.value=.27;const fb=AC.createGain();fb.gain.value=.32;const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2400;
  echoIn.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(master);
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  applyVolumes();
  return true;
}
function applyVolumes(){
  if(!AC)return;const s=PROG.settings;
  musicBus.gain.setTargetAtTime(.32*s.music*duck,AC.currentTime,.08);
  sfxBus.gain.setTargetAtTime(.55*s.sfx,AC.currentTime,.02);
}
const mf=n=>440*Math.pow(2,(n-69)/12);

/* ---------- voices ---------- */
function osc(f,dur,o){
  if(!AC)return;o=o||{};const t=AC.currentTime+(o.when||0),v=AC.createOscillator(),g=AC.createGain();
  v.type=o.type||"square";v.frequency.setValueAtTime(f,t);if(o.slide)v.frequency.exponentialRampToValueAtTime(o.slide,t+dur);
  if(o.detune)v.detune.value=o.detune;
  const vol=o.vol??.4,a=o.attack||.004;
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  let out=g;
  if(o.lp){const f2=AC.createBiquadFilter();f2.type="lowpass";f2.frequency.setValueAtTime(o.lp,t);if(o.lpEnd)f2.frequency.exponentialRampToValueAtTime(o.lpEnd,t+dur);f2.Q.value=o.q||1;g.connect(f2);out=f2}
  v.connect(g);out.connect(o.bus||sfxBus);if(o.echo)out.connect(echoIn);
  v.start(t);v.stop(t+dur+.05);
}
function noise(dur,o){
  if(!AC)return;o=o||{};const t=AC.currentTime+(o.when||0),s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf;f.type=o.ft||"highpass";f.frequency.value=o.f||800;if(o.q)f.Q.value=o.q;
  g.gain.setValueAtTime(o.vol??.3,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  s.connect(f);f.connect(g);g.connect(o.bus||sfxBus);if(o.echo)g.connect(echoIn);s.start(t,Math.random()*.5);s.stop(t+dur+.02);
}
function kick(when,bus){if(!AC)return;const t=AC.currentTime+when,v=AC.createOscillator(),g=AC.createGain();v.frequency.setValueAtTime(150,t);v.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);v.connect(g);g.connect(bus);v.start(t);v.stop(t+.25)}

/* ---------- sound effects ---------- */
const SFX={
  jump:()=>{osc(330,.16,{type:"square",vol:.18,slide:720,lp:3000});osc(660,.1,{type:"sine",vol:.12,slide:1200})},
  jump2:()=>{osc(520,.16,{type:"square",vol:.16,slide:1180,lp:3500});noise(.12,{f:3000,vol:.08})},
  slide:()=>noise(.28,{ft:"bandpass",f:900,q:.8,vol:.22}),
  land:()=>noise(.06,{ft:"lowpass",f:500,vol:.25}),
  coin:()=>{osc(1318,.07,{type:"square",vol:.13,lp:5000});osc(1976,.22,{type:"square",vol:.11,when:.06,lp:5000,echo:true})},
  dud:()=>osc(880,.06,{type:"triangle",vol:.12}),
  ready:()=>[659,784,988,1318].forEach((n,i)=>osc(n,.18,{type:"square",vol:.12,when:i*.055,lp:4500,echo:true})),
  cast:()=>{osc(220,.5,{type:"sawtooth",vol:.18,slide:1600,lp:600,lpEnd:6000});noise(.4,{f:2500,vol:.14,echo:true});osc(880,.3,{type:"sine",vol:.15,when:.12,echo:true})},
  attack:()=>{osc(1200,.45,{type:"square",vol:.16,slide:140,lp:3000});noise(.3,{ft:"bandpass",f:700,vol:.2,when:.05})},
  hit:()=>{noise(.2,{ft:"lowpass",f:900,vol:.45});osc(200,.25,{type:"square",vol:.2,slide:60,lp:1200})},
  shield:()=>{osc(1200,.12,{type:"triangle",vol:.2});osc(1800,.3,{type:"triangle",vol:.18,when:.08,echo:true})},
  splash:()=>noise(.35,{ft:"bandpass",f:1600,q:.6,vol:.3}),
  box:()=>[880,1108,1318,1760].forEach((n,i)=>osc(n,.14,{type:"square",vol:.11,when:i*.05,lp:5000,echo:true})),
  good:()=>[784,988,1175,1568].forEach((n,i)=>osc(n,.16,{type:"square",vol:.13,when:i*.07,lp:4000,echo:true})),
  bad:()=>{osc(330,.2,{type:"square",vol:.16,lp:1500});osc(247,.34,{type:"square",vol:.16,when:.16,lp:1200})},
  beep:()=>osc(660,.14,{type:"square",vol:.18,lp:3000}),
  go:()=>{osc(1320,.45,{type:"square",vol:.18,lp:4000,echo:true});osc(660,.45,{type:"sawtooth",vol:.1,lp:2000})},
  bark:()=>{osc(420,.08,{type:"sawtooth",vol:.16,slide:260});osc(420,.08,{type:"sawtooth",vol:.16,slide:260,when:.12})},
  finish:()=>[523,659,784,1047,784,1047,1318].forEach((n,i)=>osc(n,i===6?.7:.14,{type:"square",vol:.13,when:i*.1,lp:4500,echo:true})),
  roar:()=>{osc(110,.8,{type:"sawtooth",vol:.25,slide:55,lp:900});noise(.7,{ft:"lowpass",f:400,vol:.25})},
  whoosh:()=>noise(.35,{ft:"bandpass",f:1200,q:.5,vol:.18}),
  tap:()=>osc(1500,.04,{type:"sine",vol:.12}),
  ui:()=>{osc(880,.05,{type:"triangle",vol:.12});osc(1320,.08,{type:"triangle",vol:.1,when:.04})},
  back:()=>{osc(660,.05,{type:"triangle",vol:.12});osc(440,.08,{type:"triangle",vol:.1,when:.04})},
  buy:()=>[1046,1318,1568,2093].forEach((n,i)=>osc(n,.12,{type:"square",vol:.1,when:i*.04,echo:true})),
  tick:()=>osc(2200,.03,{type:"square",vol:.05,lp:6000}),
  level:()=>[523,659,784,1047,1318,1568].forEach((n,i)=>osc(n,.25,{type:"square",vol:.12,when:i*.08,lp:5000,echo:true})),
  star:()=>{osc(1568,.3,{type:"triangle",vol:.18,echo:true});osc(2349,.3,{type:"sine",vol:.1,when:.05,echo:true})},
  gate:()=>{osc(392,.6,{type:"sawtooth",vol:.1,lp:800,lpEnd:3000});osc(587,.6,{type:"sawtooth",vol:.08,lp:800,lpEnd:3000,when:.1,echo:true})},
  pass:()=>noise(.25,{ft:"bandpass",f:2400,vol:.12})
};
function sfx(n){if(AC&&PROG.settings.sfx>0)try{SFX[n]()}catch(e){}}

/* ---------- music ----------
   Each track: bpm, chord roots per bar (MIDI), a lead line of 16ths over 2 bars (0 = rest), and a drum feel. */
const TRACKS={
  menu:{bpm:96,feel:"soft",chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],
    lead:[76,0,0,74,0,72,0,0,74,0,76,0,0,0,0,0, 72,0,0,71,0,69,0,0,67,0,69,0,0,0,0,0]},
  race:{bpm:148,feel:"drive",chords:[[48,52,55],[57,60,64],[53,57,60],[55,59,62]],
    lead:[72,0,76,0,79,0,76,79,81,0,79,0,76,0,74,0, 72,0,76,0,79,0,84,0,83,0,81,0,79,0,0,0]},
  race2:{bpm:154,feel:"drive",chords:[[50,54,57],[47,50,54],[43,47,50],[45,49,52]],
    lead:[74,0,78,81,0,78,74,0,76,0,79,83,0,79,76,0, 78,0,81,86,0,81,78,0,79,78,76,0,74,0,0,0]},
  race3:{bpm:150,feel:"drive",chords:[[45,48,52],[41,45,48],[43,47,50],[40,44,47]],
    lead:[69,0,72,0,76,0,74,72,71,0,72,0,74,0,0,0, 76,0,79,0,81,79,76,0,74,0,72,0,71,0,0,0]},
  boss:{bpm:120,feel:"tense",chords:[[45,48,52],[45,48,52],[41,45,48],[44,47,52]],
    lead:[69,0,0,72,0,0,76,0,75,0,0,72,0,0,69,0, 68,0,0,71,0,0,74,0,76,0,0,0,0,0,0,0]},
  win:{bpm:124,feel:"soft",chords:[[48,52,55],[53,57,60],[55,59,62],[48,52,55]],
    lead:[72,0,76,0,79,0,84,0,83,0,79,0,81,0,0,0, 79,0,76,0,77,0,74,0,72,0,0,0,0,0,0,0]}
};
function playMusic(name){
  if(!AC){curTrack=name;return}
  if(curTrack===name&&musicTimer)return;
  stopMusic();curTrack=name;const T=TRACKS[name];if(!T)return;step=0;nextT=AC.currentTime+.08;
  musicTimer=setInterval(()=>{
    const sp=60/T.bpm/4;
    while(nextT<AC.currentTime+.15){
      const w=Math.max(0,nextT-AC.currentTime),bar=Math.floor(step/16)%T.chords.length,s16=step%16,ch=T.chords[bar];
      const L=T.lead[step%T.lead.length];
      if(L)osc(mf(L),sp*1.8,{type:T.feel==="tense"?"sawtooth":"square",vol:.11,when:w,lp:T.feel==="soft"?1800:2600,bus:musicBus,echo:true});
      // bass
      if(T.feel==="drive"){if(s16%2===0)osc(mf(ch[0]-12+(s16%8===6?7:0)),sp*1.6,{type:"sawtooth",vol:.22,when:w,lp:700,bus:musicBus})}
      else if(s16%8===0)osc(mf(ch[0]-12),sp*7,{type:"triangle",vol:.35,when:w,bus:musicBus});
      // pad on bar start
      if(s16===0)ch.forEach((n,i)=>{osc(mf(n),sp*15.5,{type:"sawtooth",vol:.035,when:w,attack:.25,lp:T.feel==="tense"?700:1100,detune:i*6-6,bus:musicBus});osc(mf(n),sp*15.5,{type:"triangle",vol:.05,when:w,attack:.3,bus:musicBus})});
      // arpeggio for drive
      if(T.feel==="drive"&&s16%2===1)osc(mf(ch[(s16>>1)%3]+12),sp*.9,{type:"triangle",vol:.06,when:w,bus:musicBus});
      // drums
      if(T.feel!=="soft"||s16%8===0){
        if(s16%4===0&&(T.feel==="drive"||s16%8===0))kick(w,musicBus);
        if(s16%8===4)noise(.14,{ft:"bandpass",f:1800,vol:T.feel==="soft"?.12:.28,when:w,bus:musicBus});
        if(T.feel==="drive"&&s16%2===0)noise(.035,{f:7000,vol:s16%4===2?.14:.07,when:w,bus:musicBus});
      }else if(s16%4===2)noise(.03,{f:8000,vol:.05,when:w,bus:musicBus});
      step++;nextT+=sp;
    }
  },30);
}
function stopMusic(){clearInterval(musicTimer);musicTimer=null}

/* ---------- voice ---------- */
let VOICE=null;
function pickVoice(){try{const vs=speechSynthesis.getVoices();VOICE=vs.find(v=>/en[-_]IN/i.test(v.lang))||vs.find(v=>/en[-_]GB/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null}catch(e){}}
try{pickVoice();speechSynthesis.onvoiceschanged=pickVoice}catch(e){}
function speak(t,rate){
  if(!PROG.settings.voice)return;
  try{const u=new SpeechSynthesisUtterance(t);if(VOICE)u.voice=VOICE;u.lang=VOICE?VOICE.lang:"en-IN";u.rate=rate||.95;u.pitch=1.05;
    u.onstart=()=>{duck=.35;applyVolumes()};u.onend=u.onerror=()=>{duck=1;applyVolumes()};
    speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}
}
