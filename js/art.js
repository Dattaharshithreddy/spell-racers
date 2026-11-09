"use strict";
/* ============================================================
   ART — everything drawn on the game canvas.
   · cached parallax scenery for each world (built once per size)
   · the character rig used by every runner
   · hazards, letter coins, word chests, gates, finish arch
   · Yaksharaj, guardian of the path
   All art is original and procedural: no image files.
   ============================================================ */
const cv=document.getElementById("cv"),ctx=cv.getContext("2d");
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+"px";cv.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0);LAYERS={}}
addEventListener("resize",resize);
const INK="#1B1530";
const hash=n=>{n=Math.sin(n*127.1+311.7)*43758.5453;return n-Math.floor(n)};
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hex2rgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");const n=parseInt(h,16);return[n>>16&255,n>>8&255,n&255]}
function mix(a,b,t){const A=hex2rgb(a),B=hex2rgb(b);return"#"+A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,"0")).join("")}
function rrc(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function rr(x,y,w,h,r){rrc(ctx,x,y,w,h,r)}
const F=(w,s,f)=>`${w} ${s}px ${f==="b"?"Nunito,system-ui,sans-serif":'"Baloo Tamma 2","Noto Sans Kannada",system-ui,sans-serif'}`;
function ell(c,x,y,rx,ry,rot){c.beginPath();c.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot||0,0,Math.PI*2)}
/* proper cel: fill shade colour, then fill base colour shifted up-right inside a clip */
function toon(c,fn,base,dark,ox,oy,lw){
  c.save();fn();c.fillStyle=dark||base;c.fill();
  if(dark){c.clip();c.translate(ox,oy);fn();c.fillStyle=base;c.fill()}
  c.restore();
  if(lw!==0){fn();c.lineWidth=lw||2.4;c.strokeStyle=INK;c.stroke()}
}
function pill(txt,x,y,bg,u,fg="#fff",icon){
  ctx.save();ctx.font=F(900,10.5*u,"b");const tw=ctx.measureText(txt).width+16*u;
  ctx.fillStyle="rgba(0,0,0,.25)";rr(x-tw/2,y-8*u,tw,20*u,10*u);ctx.fill();
  ctx.fillStyle=bg;ctx.strokeStyle=INK;ctx.lineWidth=2*u;rr(x-tw/2,y-10*u,tw,20*u,10*u);ctx.fill();ctx.stroke();
  ctx.fillStyle=fg;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(txt,x,y+.5*u);ctx.restore();
}

/* ================= SCENERY ================= */
let LAYERS={};
const TILE=1400; // units per repeating strip
/* each layer: parallax factor, height in units */
const LAYER_DEF=[{f:.12,h:260},{f:.32,h:250},{f:.62,h:190}];
function layerCanvas(wi,li,night){
  const u=U(),key=wi+"|"+li+"|"+(night?1:0)+"|"+Math.round(u*100)+"|"+DPR;
  if(LAYERS[key])return LAYERS[key];
  const d=LAYER_DEF[li],w=Math.ceil(TILE*u),h=Math.ceil(d.h*u);
  const c=document.createElement("canvas");c.width=Math.ceil(w*DPR);c.height=Math.ceil(h*DPR);
  const g=c.getContext("2d");g.setTransform(DPR*u,0,0,DPR*u,0,0);g.translate(0,d.h);g.lineJoin="round";g.lineCap="round";
  const Wd=PLACES[wi];
  // draw twice so the strip tiles seamlessly
  for(const off of [0,-TILE,TILE]){g.save();g.translate(off,0);SCENES[Wd.theme](g,li,Wd.pal,night);g.restore()}
  LAYERS[key]={c,w,h,meta:SCENES_META[Wd.theme+li]||null};
  return LAYERS[key];
}
const SCENES_META={};
function haze(col,li,night){const t=[.55,.3,.08][li];return mix(col,night?"#2A2350":"#E8F0F8",t)}
const SCENES={
  city(g,li,p,night){
    if(li===0){ // distant skyline + domed assembly hall
      g.fillStyle=haze(p.far,0,night);
      for(let i=0;i<40;i++){const x=i*35,h=60+hash(i+3)*120;g.fillRect(x,-h,30,h);if(hash(i+9)>.7){g.fillRect(x+12,-h-24,6,24)}}
      const dx=700;g.fillRect(dx-120,-90,240,90);g.beginPath();g.arc(dx,-90,52,Math.PI,0);g.fill();g.fillRect(dx-6,-160,12,30);
      [-90,90].forEach(o=>{g.beginPath();g.arc(dx+o,-90,22,Math.PI,0);g.fill()});
      g.fillStyle=haze("#FFF6D8",0,night);for(let i=0;i<120;i++){if(hash(i*7)>.55)g.fillRect(hash(i)*TILE,-hash(i+1)*140-10,3,4)}
    }else if(li===1){ // colourful buildings & trees
      let x=0,i=0;while(x<TILE){const bw=70+hash(i)*60,bh=80+hash(i+50)*140,col=haze(p.mid[i%4],1,night);
        g.fillStyle=col;rrc(g,x,-bh,bw-8,bh,6);g.fill();g.lineWidth=2;g.strokeStyle="rgba(27,21,48,.35)";g.stroke();
        g.fillStyle="rgba(0,0,0,.08)";g.fillRect(x+bw-24,-bh,16,bh);
        g.fillStyle=night?"#FFE38A":"rgba(255,252,235,.8)";for(let wy=-bh+14;wy<-24;wy+=22)for(let wx=x+10;wx<x+bw-22;wx+=18)if(hash(i*31+wx*.7+wy)>.25)g.fillRect(wx,wy,9,12);
        if(hash(i+5)>.6){g.fillStyle=haze("#FF5C5C",1,night);g.fillRect(x+6,-bh-14,bw-20,14)}
        x+=bw;i++;
        if(hash(i+77)>.5){const tx=x+10;g.fillStyle=haze("#6B4A2B",1,night);g.fillRect(tx-4,-70,8,70);g.fillStyle=haze(hash(i)>.5?"#3E8E4E":"#E8513A",1,night);[[0,-86,34],[-24,-66,24],[24,-66,24]].forEach(([a,b,r])=>{g.beginPath();g.arc(tx+a,b,r,0,7);g.fill()});x+=50}}
    }else{ // street lamps and gulmohar trees
      for(let i=0;i<7;i++){const x=i*200+40;g.strokeStyle="#2E2944";g.lineWidth=5;g.beginPath();g.moveTo(x,0);g.lineTo(x,-120);g.quadraticCurveTo(x,-132,x+16,-132);g.stroke();g.fillStyle="#FFE38A";ell(g,x+18,-128,8,4);g.fill();
        if(i%2){const tx=x+100;g.fillStyle="#5A3A22";g.fillRect(tx-5,-90,10,90);g.fillStyle=p.near;[[0,-110,40],[-30,-90,28],[30,-90,28]].forEach(([a,b,r])=>{g.beginPath();g.arc(tx+a,b,r,0,7);g.fill()});g.fillStyle="#F2553C";for(let k=0;k<14;k++){g.beginPath();g.arc(tx-40+hash(k+i)*80,-130+hash(k*3+i)*50,4,0,7);g.fill()}}}
    }
  },
  palace(g,li,p,night){
    if(li===0){ // Chamundi hill with a temple on top
      g.fillStyle=haze(night?"#4A3A6E":p.far,0,night);g.beginPath();g.moveTo(0,0);
      for(let x=0;x<=TILE;x+=20){g.lineTo(x,-60-Math.sin(x/TILE*Math.PI*2)*40-Math.sin(x/170)*14)}g.lineTo(TILE,0);g.fill();
      const hx=350;g.beginPath();g.moveTo(hx-260,0);g.quadraticCurveTo(hx,-330,hx+260,0);g.fill();
      g.fillRect(hx-14,-196,28,30);for(let s=0;s<4;s++)g.fillRect(hx-10+s*2.5,-210-s*10,20-s*5,10);
    }else if(li===1){ // the palace + market stalls
      const px=420,pw=520,ph=120,body=night?"#6A5690":haze("#F3D9A4",1,night),trim=night?"#8A74B4":haze("#E3B868",1,night);
      g.fillStyle=body;g.fillRect(px,-ph,pw,ph);g.lineWidth=2;g.strokeStyle="rgba(27,21,48,.4)";g.strokeRect(px,-ph,pw,ph);
      g.fillStyle=trim;g.fillRect(px-10,-ph-8,pw+20,10);
      [[.5,60,-ph-8],[.12,32,-ph-8],[.88,32,-ph-8],[.32,24,-ph-8],[.68,24,-ph-8]].forEach(([f,r,y])=>{const cx=px+pw*f;g.fillStyle=trim;g.fillRect(cx-r*.7,y-r*.6,r*1.4,r*.6);g.fillStyle=night?"#C47AA0":haze("#D9615A",1,night);g.beginPath();g.arc(cx,y-r*.6,r*.75,Math.PI,0);g.fill();g.fillRect(cx-1.5,y-r*1.5,3,r*.2+8)});
      g.fillStyle=night?"#3A2E5A":"rgba(120,70,40,.5)";for(let k=0;k<9;k++){const ax=px+20+k*56;rrc(g,ax,-70,30,70,[15,15,0,0]);g.fill()}
      if(night){g.fillStyle="#FFE38A";for(let k=0;k<60;k++){g.beginPath();g.arc(px+(k%20)*26+8,-ph+14+Math.floor(k/20)*30,2.4,0,7);g.fill()}
        for(let k=0;k<26;k++){g.beginPath();g.arc(px-10+k*21,-ph-12,2.2,0,7);g.fill()}}
      for(let i=0;i<4;i++){const sx=40+i*95+(i>1?620:0);const cols=["#FF5C8A","#FFB020","#2BD49A","#5CC8FF"];g.fillStyle=haze("#7A4A2A",1,night);g.fillRect(sx,-50,70,50);
        g.fillStyle=haze(cols[i],1,night);g.beginPath();g.moveTo(sx-8,-50);g.lineTo(sx+78,-50);g.lineTo(sx+70,-70);g.lineTo(sx,-70);g.fill();
        g.fillStyle=haze("#FFFFFF",1,night);for(let k=0;k<4;k++){g.beginPath();g.moveTo(sx-8+k*22,-50);g.lineTo(sx+3+k*22,-50);g.lineTo(sx+3+k*20,-70);g.lineTo(sx-2+k*20,-70);g.fill()}
        g.fillStyle=haze("#FF9F1C",1,night);for(let k=0;k<8;k++){g.beginPath();g.arc(sx+8+k*8,-44,4,0,7);g.fill()}}
    }else{
      for(let i=0;i<7;i++){const x=i*200+60;g.strokeStyle="#3A2A40";g.lineWidth=5;g.beginPath();g.moveTo(x,0);g.lineTo(x,-110);g.stroke();g.fillStyle=night?"#FFE38A":"#FFF1C2";g.beginPath();g.arc(x,-116,9,0,7);g.fill();
        g.strokeStyle=night?"#FFE38A":"rgba(255,200,80,.8)";g.lineWidth=1.5;g.beginPath();g.moveTo(x,-104);g.quadraticCurveTo(x+100,-70,x+200,-104);g.stroke();
        if(night){g.fillStyle="#FFF4B0";for(let k=1;k<10;k++){const t=k/10;g.beginPath();g.arc(x+t*200,-104+Math.sin(t*Math.PI)*34*.98,2,0,7);g.fill()}}
        g.fillStyle="#B5532E";rrc(g,x+80,-26,40,26,5);g.fill();g.fillStyle=p.near==="#7A3A2A"?"#2F7A3E":p.near;[[0,-36,16],[-12,-30,12],[12,-30,12]].forEach(([a,b,r])=>{g.beginPath();g.arc(x+100+a,b,r,0,7);g.fill()});
        g.fillStyle="#FF5C8A";for(let k=0;k<5;k++){g.beginPath();g.arc(x+88+k*6,-40+hash(k+i)*10,3,0,7);g.fill()}}
    }
  },
  forest(g,li,p,night){
    if(li===0){[0,1].forEach(r=>{g.fillStyle=haze(mix(p.far,"#FFFFFF",r?.0:.25),0,night);g.beginPath();g.moveTo(0,0);for(let x=0;x<=TILE;x+=20)g.lineTo(x,-90-r*-40-Math.sin(x/TILE*Math.PI*4+r*2)*50-Math.sin(x/90+r)*10);g.lineTo(TILE,0);g.fill()})}
    else if(li===1){ // coffee bushes + silver oaks
      for(let i=0;i<12;i++){const x=i*118+20,h=170+hash(i)*60;g.strokeStyle=haze("#8A7A66",1,night);g.lineWidth=6;g.beginPath();g.moveTo(x,0);g.lineTo(x+4,-h);g.stroke();
        g.fillStyle=haze(p.mid[i%4],1,night);for(let k=0;k<5;k++){g.beginPath();g.ellipse(x+4+(hash(i*9+k)-.5)*34,-h+k*24,26-k*2,14,0,0,7);g.fill()}}
      for(let i=0;i<24;i++){const x=i*60;g.fillStyle=haze(p.mid[(i+1)%4],1,night);g.beginPath();g.ellipse(x+30,-14,40,26,0,Math.PI,0);g.fill();
        g.fillStyle=haze("#C8243A",1,night);for(let k=0;k<5;k++){g.beginPath();g.arc(x+14+hash(i+k)*34,-20+hash(i*k+2)*14,3,0,7);g.fill()}}
    }else{
      for(let i=0;i<6;i++){const x=i*240+60;g.fillStyle="#3B2A1C";g.fillRect(x,-190,22,190);g.fillStyle=p.near;g.beginPath();g.arc(x+11,-190,60,0,7);g.arc(x-30,-160,40,0,7);g.arc(x+50,-160,40,0,7);g.fill();
        for(let k=0;k<6;k++){const a=-2.6+k*.42;g.fillStyle="#2E6B3A";g.beginPath();g.ellipse(x+120+Math.cos(a)*22,-6+Math.sin(a)*22,22,6,a,0,7);g.fill()}}
    }
  },
  ruins(g,li,p,night){
    if(li===0){g.fillStyle=haze(p.far,0,night);for(let i=0;i<60;i++){const x=hash(i)*TILE,r=20+hash(i+4)*45;g.beginPath();g.arc(x,-r*.8-hash(i+8)*40,r,0,7);g.fill()}g.fillRect(0,-30,TILE,30)}
    else if(li===1){
      const gx=500;g.fillStyle=haze("#C9935B",1,night);for(let s=0;s<7;s++){const sw=150-s*17,sh=26;g.fillRect(gx-sw/2,-(s+1)*sh,sw,sh);g.fillStyle=haze(s%2?"#B67D48":"#C9935B",1,night)}
      g.beginPath();g.arc(gx,-7*26,16,Math.PI,0);g.fill();g.fillStyle=haze("#7A4A2A",1,night);rrc(g,gx-16,-60,32,60,[16,16,0,0]);g.fill();
      for(let i=0;i<10;i++){const x=900+i*42;g.fillStyle=haze("#D9A974",1,night);g.fillRect(x,-80,16,80);g.fillRect(x-4,-86,24,8)}g.fillRect(896,-94,10*42,10);
      for(let i=0;i<7;i++){const x=60+i*50;g.fillStyle=haze(p.mid[i%4],1,night);g.beginPath();g.arc(x,-30-hash(i)*30,30+hash(i+2)*16,0,7);g.fill()}
    }else{
      for(let i=0;i<5;i++){const x=i*280+40;g.fillStyle="#9E7148";[[0,0,40],[46,-6,30],[24,-50,28]].forEach(([a,b,r])=>{g.beginPath();g.arc(x+a,b-r*.6,r,0,7);g.fill()});g.fillStyle="rgba(255,255,255,.18)";g.beginPath();g.arc(x+10,-40,12,0,7);g.fill();
        g.strokeStyle="#C9A060";g.lineWidth=2;for(let k=0;k<10;k++){g.beginPath();g.moveTo(x+140+k*6,0);g.lineTo(x+136+k*6+hash(k)*8,-16-hash(k+i)*12);g.stroke()}}
    }
  },
  falls(g,li,p,night){
    if(li===0){g.fillStyle=haze(p.far,0,night);g.beginPath();g.moveTo(0,0);for(let x=0;x<=TILE;x+=20)g.lineTo(x,-120-Math.sin(x/TILE*Math.PI*2)*30-hash(Math.floor(x/60))*20);g.lineTo(TILE,0);g.fill();}
    else if(li===1){ // the great cliff with falls
      const fx=600,fw=200;g.fillStyle=haze("#4E6E66",1,night);g.beginPath();g.moveTo(fx-180,0);g.lineTo(fx-150,-230);g.lineTo(fx+fw+150,-236);g.lineTo(fx+fw+180,0);g.fill();
      g.fillStyle=haze("#3D5A52",1,night);g.fillRect(fx-150,-236,fw+300,14);
      for(let s=0;s<4;s++){g.fillStyle=haze(["#E8F8FF","#C9ECFA","#E8F8FF","#B4E2F5"][s],1,night);g.fillRect(fx+s*fw/4,-224,fw/4-6,224)}
      g.fillStyle="rgba(255,255,255,.8)";g.beginPath();g.ellipse(fx+fw/2,0,fw*.8,30,0,Math.PI,0);g.fill();
      SCENES_META.falls1={x:fx,w:fw,top:-224};
      for(let i=0;i<8;i++){const x=i<4?i*90:900+(i-4)*120;g.fillStyle=haze(p.mid[i%4],1,night);g.beginPath();g.moveTo(x,0);g.lineTo(x+20,-60-hash(i)*60);g.lineTo(x+80,-40-hash(i+3)*40);g.lineTo(x+100,0);g.fill()}
    }else{
      for(let i=0;i<6;i++){const x=i*240+60;g.fillStyle="#2E4A40";g.fillRect(x,-150,18,150);g.beginPath();g.arc(x+9,-150,50,0,7);g.arc(x-24,-130,32,0,7);g.arc(x+40,-130,32,0,7);g.fill();
        g.fillStyle="#56707A";g.beginPath();g.ellipse(x+140,0,44,22,0,Math.PI,0);g.fill()}
    }
  },
  coast(g,li,p,night){
    if(li===0){ // the sea with distant islands
      g.fillStyle=haze(mix(p.far,"#FFFFFF",.15),0,night);g.fillRect(0,-70,TILE,70);
      g.fillStyle=haze(p.far,0,night);[[200,60,26],[760,90,34],[1150,50,20]].forEach(([x,w,h])=>{g.beginPath();g.ellipse(x,-70,w,h,0,Math.PI,0);g.fill()});
      g.fillStyle="rgba(255,255,255,.35)";for(let i=0;i<40;i++){g.fillRect(hash(i)*TILE,-60+hash(i+5)*55,14+hash(i+2)*20,2)}
      g.fillStyle=haze("#FFFFFF",0,night);for(let i=0;i<3;i++){const x=300+i*420;g.beginPath();g.moveTo(x,-74);g.lineTo(x+14,-74);g.lineTo(x+7,-96);g.fill();g.fillRect(x-4,-74,22,4)}
    }else if(li===1){ // lighthouse, temple tower, tiled huts, palms
      const lx=260;g.fillStyle=haze("#FFFFFF",1,night);g.beginPath();g.moveTo(lx-22,0);g.lineTo(lx-12,-190);g.lineTo(lx+12,-190);g.lineTo(lx+22,0);g.fill();
      g.fillStyle=haze("#E8384F",1,night);for(let k=0;k<4;k++){const y=-30-k*44;g.beginPath();g.moveTo(lx-21+k*2.4,y);g.lineTo(lx+21-k*2.4,y);g.lineTo(lx+19-k*2.6,y-18);g.lineTo(lx-19+k*2.6,y-18);g.fill()}
      g.fillStyle=haze("#3A3350",1,night);g.fillRect(lx-16,-210,32,20);g.fillStyle="#FFE38A";g.fillRect(lx-10,-206,20,12);g.fillStyle=haze("#3A3350",1,night);g.beginPath();g.moveTo(lx-18,-210);g.lineTo(lx,-228);g.lineTo(lx+18,-210);g.fill();
      const tx=820;g.fillStyle=haze(p.mid[0],1,night);for(let s2=0;s2<8;s2++){const sw=120-s2*13;g.fillRect(tx-sw/2,-(s2+1)*24,sw,24)}g.beginPath();g.arc(tx,-8*24,10,Math.PI,0);g.fill();
      for(let i=0;i<5;i++){const hx=420+i*80+(i>2?440:0);g.fillStyle=haze(p.mid[2],1,night);g.fillRect(hx,-46,60,46);g.fillStyle=haze("#C2502E",1,night);g.beginPath();g.moveTo(hx-10,-44);g.lineTo(hx+30,-74);g.lineTo(hx+70,-44);g.fill();g.fillStyle=haze("#6B4A2B",1,night);g.fillRect(hx+22,-28,16,28)}
      for(let i=0;i<6;i++){const px=60+i*240,h=150+hash(i)*50;palm(g,px,h,haze("#7A5A3A",1,night),haze(p.near,1,night))}
    }else{
      for(let i=0;i<5;i++){const x=i*280+80;palm(g,x,200+hash(i+3)*40,"#6B4A2B",p.near);
        g.fillStyle="#3E7BFA";g.beginPath();g.moveTo(x+110,-4);g.lineTo(x+200,-4);g.quadraticCurveTo(x+190,10,x+155,12);g.quadraticCurveTo(x+120,10,x+110,-4);g.fill()}
    }
  }
};
function palm(g,x,h,trunk,leaf){g.strokeStyle=trunk;g.lineWidth=9;g.beginPath();g.moveTo(x,0);g.quadraticCurveTo(x+20,-h*.5,x+10,-h);g.stroke();
  g.fillStyle=leaf;for(let k=0;k<7;k++){const a=-Math.PI+k*Math.PI/6;g.save();g.translate(x+10,-h);g.rotate(a+.2);g.beginPath();g.ellipse(34,8,36,9,.35,0,7);g.fill();g.restore()}
  g.fillStyle="#6B4A2B";[[4,-h+8],[16,-h+10],[10,-h+16]].forEach(([a,b])=>{g.beginPath();g.arc(x+a,b,5,0,7);g.fill()})}


function drawSky(top,bot,gy,sunset,night,t,u){
  const g=ctx.createLinearGradient(0,0,0,gy);g.addColorStop(0,top);g.addColorStop(1,bot);ctx.fillStyle=g;ctx.fillRect(0,0,W,gy+2);
  if(night){ctx.fillStyle="#fff";for(let k=0;k<50;k++){const tw=.5+.5*Math.sin(t*2+k);ctx.globalAlpha=.3+.6*tw;ctx.fillRect(hash(k)*W,hash(k+3)*gy*.6,1.6*u,1.6*u)}ctx.globalAlpha=1}
  const sx=W*.78,sy=sunset?gy*.62:gy*.24,r=(sunset?40:28)*u,col=night?"#FFF6D8":sunset?"#FFD27A":"#FFF6D0";
  const gl=ctx.createRadialGradient(sx,sy,r*.5,sx,sy,r*4);gl.addColorStop(0,col+"AA");gl.addColorStop(1,col+"00");ctx.fillStyle=gl;ctx.fillRect(sx-r*4,sy-r*4,r*8,r*8);
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(sx,sy,r,0,7);ctx.fill();
  if(night){ctx.fillStyle=top;ctx.beginPath();ctx.arc(sx+r*.45,sy-r*.25,r*.85,0,7);ctx.fill()}
}
function drawClouds(d,gy,u,t,night){
  for(let k=0;k<5;k++){const span=W+400*u;let cx=((k*span/5-d*.04*u-t*8*u)%span+span)%span-200*u;const cy=gy*(.12+.1*(k%3)),s=(.8+hash(k)*.6)*u;
    ctx.fillStyle=night?"rgba(255,255,255,.12)":"rgba(255,255,255,.9)";
    ctx.beginPath();[[0,0,22],[24,-10,20],[48,0,22],[24,6,20],[70,4,14],[-20,4,14]].forEach(([a,b,r])=>{ctx.moveTo(cx+a*s+r*s,cy+b*s);ctx.arc(cx+a*s,cy+b*s,r*s,0,7)});ctx.fill();
    if(!night){ctx.fillStyle="rgba(170,190,220,.35)";ctx.beginPath();ctx.ellipse(cx+24*s,cy+16*s,50*s,6*s,0,0,7);ctx.fill()}}
}
function drawLayers(wi,d,gy,u,night,t){
  for(let li=0;li<3;li++){
    const L=layerCanvas(wi,li,night),f=LAYER_DEF[li].f;let off=((d*f*u)%L.w+L.w)%L.w;
    for(let x=-off;x<W;x+=L.w)ctx.drawImage(L.c,x,gy-L.h,L.w,L.h);
    if(li===1&&PLACES[wi].theme==="falls"){const m=SCENES_META.falls1;if(m){ // animated water streaks
      for(let x=-off;x<W;x+=L.w){const fx=x+m.x*u;if(fx>W||fx+m.w*u<0)continue;ctx.fillStyle="rgba(255,255,255,.55)";
        for(let s=0;s<10;s++){const yy=((t*220+s*53)%220)*u;ctx.fillRect(fx+(s*21%m.w)*u,gy+m.top*u+yy,5*u,26*u)}}}}
    if(li===0){ctx.fillStyle=night?"rgba(42,35,80,.15)":"rgba(255,255,255,.12)";ctx.fillRect(0,gy-L.h,W,L.h)}
  }
}
function drawGround(Wd,d,gy,u,t){
  const p=Wd.pal,gh=H-gy;
  const rg=ctx.createLinearGradient(0,gy,0,H);rg.addColorStop(0,p.ground[0]);rg.addColorStop(1,p.ground[1]);ctx.fillStyle=rg;ctx.fillRect(0,gy,W,gh);
  ctx.fillStyle=p.edge;ctx.fillRect(0,gy-5*u,W,9*u);ctx.fillStyle="rgba(0,0,0,.18)";ctx.fillRect(0,gy+4*u,W,4*u);
  if(Wd.theme==="city"){const s=40*u,o=(d*u)%(s*2);for(let x=-o;x<W;x+=s*2){ctx.fillStyle="#FFC531";ctx.fillRect(x,gy-5*u,s,9*u)}}
  if(Wd.theme==="coast"){ctx.fillStyle="rgba(255,255,255,.55)";const o=(d*u*.5)%(60*u);for(let x=-o;x<W;x+=60*u){ctx.beginPath();ctx.ellipse(x+20*u,gy-2*u,22*u,3*u,0,0,7);ctx.fill()}}
  if(Wd.theme==="forest"){ctx.fillStyle="#4E9E44";const o=(d*u)%(18*u);for(let x=-o;x<W;x+=18*u){ctx.beginPath();ctx.moveTo(x,gy-4*u);ctx.lineTo(x+5*u,gy-12*u);ctx.lineTo(x+9*u,gy-4*u);ctx.fill()}}
  // road texture
  ctx.fillStyle="rgba(255,255,255,.22)";const dash=(d*u)%(80*u);for(let x=-dash;x<W;x+=80*u)rr(x,gy+20*u,(Wd.theme==="city"?40:16)*u,4*u,2*u),ctx.fill();
  ctx.fillStyle="rgba(0,0,0,.12)";const o2=(d*u*1.0)%(140*u);for(let x=-o2;x<W+140*u;x+=140*u){ctx.beginPath();ctx.ellipse(x+40*u,gy+48*u,18*u,3*u,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(x+100*u,gy+70*u,10*u,2*u,0,0,7);ctx.fill()}
}

/* ================= THE CHARACTER RIG =================
   Feet at (0,0), facing right, ~74 units tall. pose = {ph, air, vy, slide, stun, idle, win, t, blink} */
function drawCritter(c,R,pose,lw){
  lw=lw||2.4;const t=pose.t||0;
  c.save();c.lineJoin="round";c.lineCap="round";
  const air=pose.air,sl=pose.slide||0,ph=pose.ph||0;
  const run=!air&&!pose.idle&&!pose.win&&sl<.5;
  const bob=run?-Math.abs(Math.sin(ph))*4:pose.idle?Math.sin(t*3)*1.2:0;
  const lean=run?.12:air?(pose.vy<0?.05:-.08):0;
  if(sl>0){c.translate(-6*sl,-2*sl);c.rotate(-1.15*sl)}
  c.translate(0,bob);c.rotate(lean);
  const sp=R.species;
  // limb angles
  let lh=Math.sin(ph)*1.0,rh=Math.sin(ph+Math.PI)*1.0,lk=Math.max(0,Math.cos(ph))*1.3,rk=Math.max(0,Math.cos(ph+Math.PI))*1.3;
  if(air){lh=pose.vy<0?-.9:.5;rh=pose.vy<0?.7:-.3;lk=1.4;rk=.6}
  if(pose.idle||pose.win){lh=.06;rh=-.06;lk=.1;rk=.1}
  if(sl>.5){lh=-1.35;rh=-1.2;lk=.15;rk=.35}
  const armA=air?-2.4:pose.win?-2.6:run?Math.sin(ph+Math.PI)*1.1:.2,armB=air?-2.0:pose.win?-2.6:run?Math.sin(ph)*1.1:-.2;
  const hip=[0,-22];
  const leg=(a,k,col,shoeCol,back)=>{c.save();c.translate(hip[0]+(back?-3:3),hip[1]);c.rotate(-a*.75);
    const L1=11,L2=11,fx=-Math.sin(k)*L2,fy=L1+Math.cos(k)*L2;
    const path=()=>{c.beginPath();c.moveTo(0,0);c.lineTo(0,L1);c.lineTo(fx,fy)};
    path();c.lineWidth=9;c.strokeStyle=INK;c.stroke();path();c.lineWidth=5.4;c.strokeStyle=col;c.stroke();
    c.save();c.translate(fx,fy);c.rotate(a*.75-(air?.3:0));ell(c,3,0,7,4);c.fillStyle=shoeCol;c.fill();c.lineWidth=lw;c.strokeStyle=INK;c.stroke();c.fillStyle="#fff";c.fillRect(-3,.6,10,1.6);c.restore();
    c.restore()};
  const arm=(a,col,back)=>{c.save();c.translate(back?-4:4,-40);c.rotate(-a);c.lineWidth=8;c.strokeStyle=INK;c.beginPath();c.moveTo(0,0);c.lineTo(0,13);c.stroke();c.lineWidth=4.8;c.strokeStyle=col;c.stroke();
    ell(c,0,15,4,4);c.fillStyle=sp==="peacock"?R.fur:R.fur;c.fill();c.lineWidth=lw*.9;c.strokeStyle=INK;c.stroke();c.restore()};
  const backShade=mix(R.fur,"#000000",.18);
  // tail (behind)
  drawTail(c,R,pose,lw,run,t,ph);
  // back limbs
  arm(armB,sp==="peacock"?R.fur2:mix(R.top,"#000000",.2),true);
  leg(rh,rk,sp==="peacock"?"#E8A33D":mix(R.fur,"#000000",.15),mix(R.shoe,"#000000",.2),true);
  // scarf tail flutters behind
  const fl=t*14;c.save();c.translate(-4,-46);c.fillStyle=R.acc;c.beginPath();c.moveTo(0,0);
  for(let k=0;k<=5;k++){c.lineTo(-k*5.2,Math.sin(fl-k*.9)*(1+k*.7)+k*.8*(run?0:2))}
  for(let k=5;k>=0;k--){c.lineTo(-k*5.2,Math.sin(fl-k*.9)*(1+k*.7)+k*.8*(run?0:2)+5+k*.3)}c.closePath();c.fill();c.lineWidth=lw*.8;c.strokeStyle=INK;c.stroke();c.restore();
  // torso
  toon(c,()=>{c.beginPath();c.ellipse(0,-33,12.5,14,0,0,7)},R.top,R.top2,2,-2.5,lw);
  if(sp==="squirrel"){c.save();c.beginPath();c.ellipse(0,-33,12.5,14,0,0,7);c.clip();c.strokeStyle="rgba(255,255,255,.75)";c.lineWidth=2;[-6,-2,2].forEach(o=>{c.beginPath();c.moveTo(-11,-40+o*1.4+6);c.lineTo(-4,-44+o*1.4+6);c.stroke()});c.restore()}
  c.fillStyle="rgba(255,255,255,.85)";c.font="900 8px Nunito,sans-serif";c.textAlign="center";c.textBaseline="middle";
  c.beginPath();c.arc(3,-31,5.5,0,7);c.fillStyle=R.acc;c.fill();c.lineWidth=1.4;c.strokeStyle=INK;c.stroke();c.fillStyle=INK;c.fillText(R.name[0],3,-30.5);
  // front leg
  leg(lh,lk,sp==="peacock"?"#FFB347":R.fur,R.shoe,false);
  // scarf knot
  c.fillStyle=R.acc;ell(c,1,-45,9,3.6);c.fill();c.lineWidth=lw*.8;c.strokeStyle=INK;c.stroke();
  // head
  c.save();c.translate(4,-58);c.rotate(run?Math.sin(ph*2)*.04:pose.idle?Math.sin(t*1.5)*.05:0);
  drawHead(c,R,pose,lw,t);
  c.restore();
  // front arm
  arm(armA,sp==="peacock"?R.fur:R.top,false);
  c.restore();
}
function drawTail(c,R,pose,lw,run,t,ph){
  const sp=R.species,w=run?Math.sin(ph*2)*.12:Math.sin(t*2)*.1;
  c.save();c.translate(-10,-27);c.rotate(w);
  if(sp==="hare"){c.beginPath();c.arc(-2,0,7,0,7);c.fillStyle="#fff";c.fill();c.lineWidth=lw;c.strokeStyle=INK;c.stroke()}
  else if(sp==="squirrel"){const fn=()=>{c.beginPath();c.moveTo(0,4);c.bezierCurveTo(-30,8,-34,-30,-14,-44);c.bezierCurveTo(-4,-52,10,-46,6,-36);c.bezierCurveTo(-10,-38,-18,-20,-4,-6);c.closePath()};
    toon(c,fn,R.fur,R.fur2,3,-2,lw);c.save();fn();c.clip();c.strokeStyle="rgba(255,255,255,.5)";c.lineWidth=3;c.beginPath();c.moveTo(-6,0);c.bezierCurveTo(-24,-4,-24,-30,-10,-40);c.stroke();c.restore()}
  else if(sp==="tiger"){c.lineWidth=8;c.strokeStyle=INK;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-18,4,-22,-14);c.stroke();c.lineWidth=5;c.strokeStyle=R.fur;c.stroke();
    c.strokeStyle=INK;c.lineWidth=2;[[-8,3],[-15,1],[-20,-6]].forEach(([x,y])=>{c.beginPath();c.moveTo(x-2,y-3);c.lineTo(x+2,y+3);c.stroke()})}
  else if(sp==="elephant"){c.lineWidth=4;c.strokeStyle=INK;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-8,6,-10,12);c.stroke();c.lineWidth=2;c.strokeStyle=R.fur;c.stroke();c.fillStyle=INK;ell(c,-10,13,2,3);c.fill()}
  else if(sp==="peacock"){c.rotate(-.5+w);for(let k=0;k<5;k++){c.save();c.rotate(-.35+k*.18);const fn=()=>{c.beginPath();c.ellipse(-22,0,24,5,0,0,7)};toon(c,fn,k%2?"#20C3A0":"#2BA06E",k%2?"#128A72":"#1E7A50",1,-1,lw*.8);
    c.beginPath();c.arc(-40,0,4.5,0,7);c.fillStyle="#FFD23F";c.fill();c.beginPath();c.arc(-40,0,2.6,0,7);c.fillStyle="#2F6FE0";c.fill();c.restore()}}
  c.restore();
}
function drawHead(c,R,pose,lw,t){
  const sp=R.species,blink=((t+R.id.length)%3.6)<.12||pose.stun>0;
  // ears behind head
  if(sp==="hare"){const flop=pose.air?-.25:Math.sin(t*6)*.05;
    [[-5,-.35+flop,R.fur2],[3,.1+flop,R.fur]].forEach(([x,r,col],i)=>{c.save();c.translate(x,-10);c.rotate(r);const fn=()=>{c.beginPath();c.ellipse(0,-14,5.5,15,0,0,7)};toon(c,fn,col,mix(col,"#000",.12),1.5,0,lw);c.fillStyle=R.inner;ell(c,.5,-14,2.6,10.5);c.fill();c.restore()})}
  if(sp==="tiger"||sp==="squirrel"){[[-9,-11],[6,-13]].forEach(([x,y],i)=>{c.save();c.translate(x,y);c.rotate(i?.2:-.3);const fn=()=>{c.beginPath();c.ellipse(0,0,5.5,sp==="squirrel"?7:6,0,0,7)};toon(c,fn,R.fur,R.fur2,1,1,lw);c.fillStyle=sp==="tiger"?INK:R.inner;ell(c,0,1,2.6,3.2);c.fill();
    if(sp==="squirrel"){c.fillStyle=R.fur2;c.beginPath();c.moveTo(-2,-6);c.lineTo(0,-12);c.lineTo(2,-6);c.fill()}c.restore()})}
  if(sp==="elephant"){const flap=Math.sin(t*5)*.12;c.save();c.translate(-8,-1);c.rotate(flap);const fn=()=>{c.beginPath();c.moveTo(0,-12);c.bezierCurveTo(-22,-18,-26,10,-8,16);c.bezierCurveTo(-2,18,4,8,2,0);c.closePath()};toon(c,fn,R.fur,R.fur2,2,-1,lw);c.fillStyle=R.inner;c.beginPath();c.moveTo(-2,-8);c.bezierCurveTo(-16,-12,-18,8,-7,11);c.bezierCurveTo(-3,11,0,4,-1,-2);c.fill();c.restore()}
  if(sp==="peacock"){for(let k=0;k<3;k++){c.save();c.translate(-2+k*3,-14);c.rotate(-.4+k*.3);c.strokeStyle=INK;c.lineWidth=1.6;c.beginPath();c.moveTo(0,0);c.lineTo(0,-12);c.stroke();c.fillStyle="#20C3A0";ell(c,0,-14,3.2,4);c.fill();c.stroke();c.fillStyle="#2F6FE0";ell(c,0,-14,1.4,1.8);c.fill();c.restore()}}
  // head
  const headFn=()=>{c.beginPath();if(sp==="elephant")c.ellipse(0,0,15,14,0,0,7);else c.ellipse(0,0,14.5,13.5,0,0,7)};
  toon(c,headFn,R.fur,R.fur2,2.5,-2.5,lw);
  if(sp==="tiger"){c.save();headFn();c.clip();c.fillStyle=INK;[[-3,-14,0],[2,-14,.2],[-8,-11,-.4]].forEach(([x,y,r])=>{c.save();c.translate(x,y);c.rotate(r);c.beginPath();c.moveTo(-1.6,0);c.lineTo(0,7);c.lineTo(1.6,0);c.fill();c.restore()});
    [[-13,-2],[-13,3]].forEach(([x,y])=>{c.beginPath();c.moveTo(x,y);c.lineTo(x+6,y+1);c.lineTo(x,y+2.5);c.fill()});c.restore()}
  if(sp==="elephant"){c.fillStyle=R.top;c.beginPath();c.moveTo(-6,-13);c.quadraticCurveTo(4,-17,12,-9);c.lineTo(6,4);c.lineTo(2,-2);c.closePath();c.fill();c.lineWidth=1.5;c.strokeStyle=INK;c.stroke();c.fillStyle=R.acc;[[2,-9],[6,-6],[5,-1]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,1.6,0,7);c.fill()})}
  // muzzle / beak / trunk
  if(sp==="elephant"){c.save();c.translate(11,3);const sw=Math.sin(t*3)*.15;c.rotate(sw);c.lineWidth=9;c.strokeStyle=INK;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(8,8,6,16);c.quadraticCurveTo(5,20,10,20);c.stroke();c.lineWidth=5.5;c.strokeStyle=R.fur;c.stroke();c.restore()}
  else if(sp==="peacock"){c.fillStyle="#FFB020";c.beginPath();c.moveTo(11,0);c.lineTo(20,3);c.lineTo(11,6);c.closePath();c.fill();c.lineWidth=1.6;c.strokeStyle=INK;c.stroke();c.fillStyle="#fff";ell(c,4,-2,6,3,-.3);c.fill()}
  else{c.fillStyle=R.belly;ell(c,7,4,8,6);c.fill();c.lineWidth=1.4;c.strokeStyle="rgba(27,21,48,.35)";c.stroke();
    c.fillStyle=sp==="tiger"?"#E8506A":sp==="hare"?R.inner:"#3A2A1E";ell(c,13,1.5,2.6,2);c.fill();
    c.strokeStyle=INK;c.lineWidth=1.3;c.beginPath();c.moveTo(13,3.5);c.quadraticCurveTo(12,7,8.5,6.5);c.stroke();
    if(sp==="hare"||sp==="squirrel"){c.fillStyle="#fff";c.fillRect(10,6.4,3.2,3.2);c.strokeRect(10,6.4,3.2,3.2)}
    if(sp==="tiger"){c.strokeStyle="rgba(27,21,48,.5)";c.lineWidth=.8;[[0],[2]].forEach(([o])=>{c.beginPath();c.moveTo(10,5+o);c.lineTo(20,4+o*1.5);c.stroke()})}}
  // cheek blush
  c.fillStyle="rgba(255,110,140,.35)";ell(c,1,6,3.4,2.2);c.fill();
  // eye
  if(pose.stun>0){c.strokeStyle=INK;c.lineWidth=1.6;c.beginPath();for(let a=0;a<12;a+=.5)c.lineTo(5+Math.cos(a+t*10)*a*.32,-3+Math.sin(a+t*10)*a*.32);c.stroke()}
  else if(blink){c.strokeStyle=INK;c.lineWidth=1.8;c.beginPath();c.moveTo(1.5,-3);c.quadraticCurveTo(5,-1,8.5,-3);c.stroke()}
  else{c.fillStyle="#fff";ell(c,5,-3.5,4.2,5.2);c.fill();c.lineWidth=1.5;c.strokeStyle=INK;c.stroke();
    c.fillStyle=R.eye;ell(c,6.3,-3.2,2.8,3.6);c.fill();c.fillStyle=INK;ell(c,6.8,-3,1.4,1.9);c.fill();
    c.fillStyle="#fff";c.beginPath();c.arc(7.6,-4.6,1.1,0,7);c.fill();
    c.strokeStyle=INK;c.lineWidth=1.6;c.beginPath();c.moveTo(1,-10.5);c.quadraticCurveTo(5,pose.win?-13:-12,9,-10);c.stroke()}
  if(pose.win||pose.happy){c.strokeStyle=INK;c.lineWidth=1.4;c.beginPath();c.moveTo(6,8);c.quadraticCurveTo(9,11,12,8);c.stroke()}
}

/* ================= HAZARDS ================= */
function drawHazard(h,sx,gy,u,t,hx,done,ref){
  const D=HZ[h.type],k=D.kind;
  ctx.save();ctx.translate(sx,gy);ctx.scale(u,u);ctx.lineJoin="round";ctx.lineCap="round";ctx.lineWidth=2.4;ctx.strokeStyle=INK;
  if(done&&k!=="slow")ctx.globalAlpha=.4;
  if(k==="jump"&&h.type!=="pothole"){ctx.fillStyle="rgba(0,0,0,.22)";ell(ctx,0,3,D.w+6,5);ctx.fill()}
  const moving=D.move&&hx<h.x;
  (HZART[h.type]||HZART.rock)(ctx,D,t,moving,h,ref);
  ctx.restore();
}
const leg4=(c,xs,y,len,col,t,move)=>xs.forEach((x,i)=>{const a=move?Math.sin(t*14+i*1.6)*.4:0;c.save();c.translate(x,y);c.rotate(a);c.lineWidth=6;c.strokeStyle=INK;c.beginPath();c.moveTo(0,0);c.lineTo(0,len);c.stroke();c.lineWidth=3.4;c.strokeStyle=col;c.stroke();c.restore()});
const eye=(c,x,y,r)=>{c.fillStyle="#fff";c.beginPath();c.arc(x,y,r,0,7);c.fill();c.lineWidth=1.2;c.strokeStyle=INK;c.stroke();c.fillStyle=INK;c.beginPath();c.arc(x-r*.3,y,r*.5,0,7);c.fill()};
const flock=(c,t,body,wing,n)=>{[[0,-60],[-24,-78],[22,-90],[-6,-104]].slice(0,n||4).forEach(([x,y],i)=>{const f=Math.sin(t*16+i*2);c.save();c.translate(x,y+Math.sin(t*4+i)*4);
  c.fillStyle=wing;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(6,-12*f,14,-14*f);c.quadraticCurveTo(8,-2,0,0);c.fill();c.lineWidth=1.6;c.strokeStyle=INK;c.stroke();
  toon(c,()=>{c.beginPath();c.ellipse(0,0,10,6,0,0,7)},body,mix(body,"#000",.2),1,-1.5,1.8);eye(c,-5,-1.5,2.2);c.restore()})};
const HZART={
  pothole(c){c.fillStyle="#120E19";ell(c,0,3,24,7);c.fill();c.stroke();[-1,1].forEach(m=>{c.lineWidth=3;c.beginPath();c.moveTo(m*30,2);c.lineTo(m*30,-22);c.stroke();c.fillStyle="#FF3B4E";c.beginPath();c.moveTo(m*30,-22);c.lineTo(m*30-m*14,-18);c.lineTo(m*30,-13);c.closePath();c.fill();c.lineWidth=2;c.stroke()})},
  barricade(c){c.fillStyle=INK;c.fillRect(-20,-42,4,42);c.fillRect(16,-42,4,42);
    for(let r=0;r<2;r++){const y=-38+r*16;c.save();rrc(c,-27,y,54,12,3);c.clip();c.fillStyle="#fff";c.fillRect(-27,y,54,12);c.fillStyle="#FF3B4E";for(let q=-3;q<4;q++){c.beginPath();c.moveTo(q*12,y);c.lineTo(q*12+7,y);c.lineTo(q*12-1,y+12);c.lineTo(q*12-8,y+12);c.fill()}c.restore();rrc(c,-27,y,54,12,3);c.lineWidth=2.2;c.stroke()}
    c.fillStyle="#FFB020";c.beginPath();c.arc(-18,-46,4,0,7);c.fill();c.stroke()},
  cone(c){toon(c,()=>{c.beginPath();c.moveTo(-11,0);c.lineTo(-3,-28);c.lineTo(3,-28);c.lineTo(11,0);c.closePath()},"#FF6A1F","#D9480F",2,0);c.fillStyle="#fff";c.fillRect(-7,-17,14,5);rrc(c,-15,-3,30,4,2);c.fillStyle=INK;c.fill()},
  auto(c,D,t){c.save();c.translate(0,Math.sin(t*20)*.6);
    toon(c,()=>{c.beginPath();c.moveTo(-30,-10);c.lineTo(-30,-34);c.quadraticCurveTo(-28,-48,-10,-48);c.lineTo(14,-48);c.quadraticCurveTo(30,-46,32,-26);c.lineTo(32,-10);c.closePath()},"#FFD02A","#E0A800",3,-2);
    c.fillStyle="#2BA36A";c.fillRect(-30,-22,62,12);c.strokeRect(-30,-22,62,12);c.fillStyle="#BFE6F7";c.beginPath();c.moveTo(8,-44);c.lineTo(26,-44);c.quadraticCurveTo(29,-36,29,-26);c.lineTo(8,-26);c.closePath();c.fill();c.stroke();
    c.fillStyle=INK;c.fillRect(-26,-44,26,20);c.fillStyle="#FFF1A0";c.beginPath();c.arc(31,-18,3,0,7);c.fill();
    [[-18,-6],[20,-6]].forEach(([x,y])=>{c.fillStyle=INK;c.beginPath();c.arc(x,y,7.5,0,7);c.fill();c.fillStyle="#9C95A8";c.beginPath();c.arc(x,y,3,0,7);c.fill()});c.restore()},
  cow(c,D,t){leg4(c,[-20,-12,14,22],-18,18,"#FFFFFF",t);
    toon(c,()=>{c.beginPath();c.ellipse(0,-28,28,14,0,0,7)},"#FFFFFF","#E6DED4",2,-2);
    c.save();c.beginPath();c.ellipse(0,-28,28,14,0,0,7);c.clip();c.fillStyle=INK;[[-12,-34,8],[8,-22,7],[-2,-38,5]].forEach(([x,y,r])=>{c.beginPath();c.ellipse(x,y,r,r*.8,.3,0,7);c.fill()});c.restore();
    c.save();c.translate(28,-38);c.rotate(Math.sin(t*2)*.08);toon(c,()=>{c.beginPath();c.ellipse(0,0,10,9,0,0,7)},"#FFFFFF","#E6DED4",1,-1);c.fillStyle="#FFB3B3";ell(c,6,4,6,4.5);c.fill();c.stroke();
    c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.moveTo(-4,-7);c.quadraticCurveTo(-6,-16,0,-16);c.moveTo(4,-8);c.quadraticCurveTo(6,-16,10,-14);c.stroke();eye(c,2,-2,2.4);c.restore();
    c.lineWidth=2;c.beginPath();c.moveTo(-28,-30);c.quadraticCurveTo(-36,-24,-34,-12);c.stroke()},
  dog(c,D,t,mv){leg4(c,[-10,-4,6,12],-12,12,"#C8874A",t,mv);toon(c,()=>{c.beginPath();c.ellipse(0,-18,15,8,0,0,7)},"#D9985A","#B4743A",1.5,-1.5);
    c.save();c.translate(-15,-20);c.rotate(Math.sin(t*20)*.4);c.lineWidth=4;c.strokeStyle=INK;c.beginPath();c.moveTo(0,0);c.lineTo(-8,-8);c.stroke();c.lineWidth=2;c.strokeStyle="#D9985A";c.stroke();c.restore();
    toon(c,()=>{c.beginPath();c.ellipse(16,-26,8,7,0,0,7)},"#D9985A","#B4743A",1,-1);c.fillStyle="#8A5228";ell(c,13,-31,3,6,-.4);c.fill();c.stroke();c.fillStyle=INK;c.beginPath();c.arc(24,-25,2,0,7);c.fill();eye(c,18,-28,2)},
  elephant(c,D,t){leg4(c,[-20,-10,12,22],-22,22,"#8C99AE",t);toon(c,()=>{c.beginPath();c.ellipse(0,-36,30,20,0,0,7)},"#9AA7BD","#7A869C",2,-3);
    c.fillStyle="#C2185B";c.beginPath();c.moveTo(-14,-55);c.lineTo(14,-55);c.lineTo(10,-26);c.lineTo(-10,-26);c.closePath();c.fill();c.stroke();c.fillStyle="#FFC531";for(let k=0;k<4;k++){c.beginPath();c.arc(-8+k*5.3,-28,2,0,7);c.fill()}
    c.save();c.translate(30,-42);toon(c,()=>{c.beginPath();c.ellipse(0,0,14,13,0,0,7)},"#9AA7BD","#7A869C",1,-2);c.fillStyle="#FFC531";c.beginPath();c.moveTo(-6,-12);c.lineTo(8,-12);c.lineTo(2,2);c.closePath();c.fill();c.stroke();
    c.lineWidth=8;c.strokeStyle=INK;c.beginPath();c.moveTo(10,4);c.quadraticCurveTo(18,16,14,26);c.stroke();c.lineWidth=4.6;c.strokeStyle="#9AA7BD";c.stroke();eye(c,4,-2,2.6);
    c.fillStyle="#7A869C";c.beginPath();c.ellipse(-10,2,8,12,.2,0,7);c.fill();c.lineWidth=2;c.strokeStyle=INK;c.stroke();c.restore()},
  flowercart(c){[[-18,-7],[18,-7]].forEach(([x,y])=>{c.fillStyle=INK;c.beginPath();c.arc(x,y,7,0,7);c.fill();c.fillStyle="#C88F08";c.beginPath();c.arc(x,y,3,0,7);c.fill()});
    toon(c,()=>{rrc(c,-28,-26,56,16,3)},"#8B5A2B","#6B4220",1,-1);for(let k=0;k<16;k++){c.fillStyle=["#FF9F1C","#FFD23F","#FF5C8A","#FFFFFF"][k%4];c.beginPath();c.arc(-24+(k%8)*7,-30-Math.floor(k/8)*7+hash(k)*3,4.5,0,7);c.fill();c.lineWidth=1;c.stroke()}},
  log(c){toon(c,()=>{rrc(c,-30,-22,60,22,11)},"#9A6A3A","#7A4E28",0,-3);c.fillStyle="#D9A86A";ell(c,24,-11,7,10);c.fill();c.stroke();c.lineWidth=1.4;ell(c,24,-11,3,5);c.stroke();c.strokeStyle="rgba(27,21,48,.4)";c.beginPath();c.moveTo(-20,-14);c.lineTo(6,-14);c.moveTo(-14,-7);c.lineTo(12,-7);c.stroke()},
  stump(c){toon(c,()=>{c.beginPath();c.moveTo(-16,0);c.lineTo(-13,-30);c.lineTo(13,-30);c.lineTo(16,0);c.closePath()},"#8A5A32","#6B4220",2,0);c.fillStyle="#D9A86A";ell(c,0,-30,13,4.5);c.fill();c.stroke();c.fillStyle="#4E9E44";c.beginPath();c.arc(-8,-33,4,0,7);c.fill()},
  rock(c){toon(c,()=>{c.beginPath();c.moveTo(-24,0);c.quadraticCurveTo(-27,-22,-8,-29);c.quadraticCurveTo(16,-34,24,-10);c.lineTo(24,0);c.closePath()},"#A09BAA","#7E7888",3,-3);c.fillStyle="rgba(255,255,255,.4)";ell(c,-6,-21,7,3.5,-.4);c.fill()},
  pillar(c){toon(c,()=>{c.beginPath();c.rect(-12,-32,24,32)},"#D9A974","#B98A54",3,0);c.fillStyle="#C9935B";c.fillRect(-16,-38,32,8);c.strokeRect(-16,-38,32,8);c.strokeStyle="rgba(27,21,48,.4)";c.lineWidth=1.6;c.beginPath();c.moveTo(-4,-28);c.lineTo(-4,-4);c.moveTo(4,-28);c.lineTo(4,-4);c.stroke()},
  boulder(c,D,t,mv,h,ref){c.save();c.translate(0,-22);c.rotate((ref-h.x)*.035);toon(c,()=>{c.beginPath();c.arc(0,0,22,0,7)},"#B08560","#8A6440",3,-3);c.strokeStyle="#6E5238";c.lineWidth=2;c.beginPath();c.moveTo(-10,-8);c.lineTo(6,4);c.moveTo(4,-14);c.lineTo(12,-2);c.stroke();c.restore();
    if(mv){c.fillStyle="rgba(180,140,100,.5)";for(let q=1;q<4;q++){c.beginPath();c.arc(24+q*9,-4,4-q*.6,0,7);c.fill()}}},
  monkey(c,D,t,mv){leg4(c,[-6,6],-12,12,"#8A6248",t,mv);c.lineWidth=4;c.strokeStyle=INK;c.beginPath();c.moveTo(-10,-14);c.bezierCurveTo(-26,-14,-26,-40,-14,-36);c.stroke();c.lineWidth=2;c.strokeStyle="#8A6248";c.stroke();
    toon(c,()=>{c.beginPath();c.ellipse(0,-20,10,10,0,0,7)},"#9A7258","#7A5238",1,-1);c.save();c.translate(2,-34);toon(c,()=>{c.beginPath();c.arc(0,0,9,0,7)},"#9A7258","#7A5238",1,-1);c.fillStyle="#F2C9A0";ell(c,3,2,6,5);c.fill();c.stroke();
    c.fillStyle="#F2C9A0";[-9,9].forEach(x=>{c.beginPath();c.arc(x,-1,3.5,0,7);c.fill();c.stroke()});eye(c,0,-1,1.8);eye(c,5,-1,1.8);c.restore();
    c.save();c.translate(8,-24);c.rotate(Math.sin(t*10)*.6-1);c.lineWidth=4;c.strokeStyle=INK;c.beginPath();c.moveTo(0,0);c.lineTo(0,-10);c.stroke();c.lineWidth=2;c.strokeStyle="#9A7258";c.stroke();c.fillStyle="#FFE14D";c.beginPath();c.ellipse(0,-14,3,6,.5,0,7);c.fill();c.lineWidth=1.2;c.strokeStyle=INK;c.stroke();c.restore()},
  crab(c,D,t,mv){[-1,1].forEach(m=>{for(let k=0;k<3;k++){c.lineWidth=2;c.beginPath();c.moveTo(m*8,-8);c.lineTo(m*(14+k*2),-2+Math.sin(t*20+k)*1.5);c.stroke()}});
    toon(c,()=>{c.beginPath();c.ellipse(0,-11,13,8,0,0,7)},"#FF5A3C","#D63A20",1,-1);[-1,1].forEach(m=>{c.save();c.translate(m*14,-20);c.rotate(m*.3+Math.sin(t*8)*.2*m);c.fillStyle="#FF5A3C";c.beginPath();c.moveTo(0,0);c.arc(0,0,6,-.6,4.6);c.closePath();c.fill();c.lineWidth=1.6;c.stroke();c.restore()});
    c.lineWidth=1.6;c.beginPath();c.moveTo(-3,-17);c.lineTo(-3,-22);c.moveTo(3,-17);c.lineTo(3,-22);c.stroke();eye(c,-3,-23,2.2);eye(c,3,-23,2.2)},
  pigeons(c,D,t){flock(c,t,"#9AA3B5","#7A8396")},
  bees(c,D,t){[[0,-58],[-20,-70],[18,-82],[-4,-96],[22,-62]].forEach(([x,y],i)=>{c.save();c.translate(x+Math.sin(t*9+i)*4,y+Math.cos(t*7+i*2)*4);c.fillStyle="rgba(255,255,255,.8)";ell(c,-2,-6,4,6*Math.abs(Math.sin(t*40+i)),-.3);c.fill();c.lineWidth=1;c.strokeStyle=INK;c.stroke();
    c.fillStyle="#FFD02A";ell(c,0,0,7,5);c.fill();c.lineWidth=1.6;c.stroke();c.fillStyle=INK;c.fillRect(-2,-4.5,2,9);c.fillRect(2.5,-4,2,8);c.restore()});
    c.fillStyle="#C88F08";c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.ellipse(0,-120,12,14,0,0,7);c.fill();c.stroke();c.lineWidth=2;c.beginPath();c.moveTo(0,-134);c.lineTo(0,-160);c.stroke()},
  bats(c,D,t){[[0,-60],[-24,-76],[20,-88],[-6,-104]].forEach(([x,y],i)=>{const f=Math.sin(t*18+i*2);c.save();c.translate(x,y+Math.sin(t*5+i)*5);c.fillStyle="#4A3A5E";c.strokeStyle=INK;c.lineWidth=1.6;
    [-1,1].forEach(m=>{c.beginPath();c.moveTo(0,0);c.lineTo(m*16,-8*f);c.lineTo(m*12,2);c.lineTo(m*6,0);c.closePath();c.fill();c.stroke()});c.beginPath();c.arc(0,0,5,0,7);c.fill();c.stroke();c.fillStyle="#FFE14D";c.fillRect(-3,-1.5,1.6,1.6);c.fillRect(1.4,-1.5,1.6,1.6);c.restore()})},
  banner(c,D,t){c.lineWidth=4;c.beginPath();c.moveTo(-40,-200);c.lineTo(-40,0);c.moveTo(40,-200);c.lineTo(40,0);c.stroke();c.strokeStyle="#3A3350";c.lineWidth=2;c.stroke();
    c.save();c.translate(0,Math.sin(t*3)*1.5);c.fillStyle="#2BD49A";c.beginPath();c.moveTo(-40,-110);c.lineTo(40,-110);c.lineTo(40,-50);c.quadraticCurveTo(0,-40+Math.sin(t*4)*3,-40,-50);c.closePath();c.fill();c.lineWidth=2.4;c.strokeStyle=INK;c.stroke();
    c.fillStyle="#fff";c.font="900 13px Nunito,sans-serif";c.textAlign="center";c.fillText("NAMMA",0,-86);c.fillText("OOTA",0,-70);c.restore()},
  garland(c,D,t){c.lineWidth=4;c.beginPath();c.moveTo(-42,-200);c.lineTo(-42,0);c.moveTo(42,-200);c.lineTo(42,0);c.stroke();
    for(let r=0;r<3;r++){for(let k=0;k<=12;k++){const x=-42+k*7,y=-66-r*16+Math.sin(k/12*Math.PI)*(16)+Math.sin(t*3+r)*1.5;c.fillStyle=["#FF9F1C","#FFD23F","#FF6B00"][(k+r)%3];c.beginPath();c.arc(x,y,4.6,0,7);c.fill();c.lineWidth=1;c.strokeStyle=INK;c.stroke()}}
    c.fillStyle="#2BA06E";for(let k=0;k<6;k++){c.beginPath();c.ellipse(-30+k*12,-48+Math.sin(k)*2,3,7,0,0,7);c.fill()}},
  branch(c,D,t){c.save();c.translate(0,Math.sin(t*2)*1.5);c.lineWidth=10;c.strokeStyle=INK;c.beginPath();c.moveTo(-60,-130);c.quadraticCurveTo(-10,-70,40,-58);c.stroke();c.lineWidth=6.4;c.strokeStyle="#6B4A2B";c.stroke();
    for(let k=0;k<8;k++){const x=-40+k*11,y=-104+k*6;c.fillStyle=k%2?"#3E8E4E":"#2F6B40";c.beginPath();c.ellipse(x,y+8,9,5,.6+k*.2,0,7);c.fill();c.lineWidth=1.4;c.strokeStyle=INK;c.stroke()}
    c.restore()},
  arch(c){toon(c,()=>{c.beginPath();c.moveTo(-36,0);c.lineTo(-36,-160);c.lineTo(36,-160);c.lineTo(36,0);c.lineTo(22,0);c.lineTo(22,-48);c.quadraticCurveTo(22,-58,12,-58);c.lineTo(-12,-58);c.quadraticCurveTo(-22,-58,-22,-48);c.lineTo(-22,0);c.closePath()},"#D9A974","#B98A54",3,0);
    c.strokeStyle="rgba(27,21,48,.35)";c.lineWidth=1.5;for(let k=1;k<6;k++){c.beginPath();c.moveTo(-36,-58-k*18);c.lineTo(36,-58-k*18);c.stroke()}},
  boat(c){toon(c,()=>{c.beginPath();c.moveTo(-34,-26);c.lineTo(34,-26);c.quadraticCurveTo(30,0,0,0);c.quadraticCurveTo(-30,0,-34,-26);c.closePath()},"#2F8FE0","#1E6AB0",2,-2);c.fillStyle="#FFC531";c.fillRect(-30,-24,60,5);c.strokeRect(-30,-24,60,5);c.fillStyle="#fff";c.font="900 8px Nunito";c.textAlign="center";c.fillText("MALPE",0,-8)},
  gulls(c,D,t){flock(c,t,"#F4F4F8","#C9CCD8")},
  frond(c,D,t){c.save();c.translate(0,Math.sin(t*2)*2);c.lineWidth=5;c.strokeStyle=INK;c.beginPath();c.moveTo(-70,-200);c.quadraticCurveTo(-20,-80,40,-56);c.stroke();c.lineWidth=3;c.strokeStyle="#6B8E3A";c.stroke();
    for(let k=0;k<12;k++){const tt=k/12,x=-70+tt*110,y=-200+tt*144-tt*tt*20;c.fillStyle=k%2?"#3E8E4E":"#2F7A3E";c.beginPath();c.ellipse(x+6,y+12,5,16,.5,0,7);c.fill();c.lineWidth=1.2;c.strokeStyle=INK;c.stroke()}c.restore()},
  puddle(c,D,t){c.fillStyle="#5BAEE6";ell(c,0,3,32,7);c.fill();c.stroke();c.fillStyle="rgba(255,255,255,.6)";ell(c,-8,1,10,2);c.fill();c.strokeStyle="rgba(255,255,255,.6)";c.lineWidth=1.2;const r=(t*20)%14;ell(c,10,3,r,r*.25);c.stroke()},
  mud(c){c.fillStyle="#7A4E2A";ell(c,0,3,34,7);c.fill();c.stroke();c.fillStyle="#5A3618";[[-12,2],[6,4],[16,1]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,2.5,0,7);c.fill()})}
};
/* warning tag above a hazard */
function hazardTag(h,sx,gy,u,t){
  const D=HZ[h.type],bob=Math.sin(t*6+h.x)*2*u;
  if(D.kind==="duck")pill("▼ SLIDE",sx,gy-34*u+bob,"#8B5CF6",u);
  else if(D.kind==="slow")pill("SLOW",sx,gy-22*u+bob,"#2F8FE0",u);
  else{const top=h.type==="pothole"?28:D.h+16;pill("▲ JUMP",sx,gy-top*u-14*u+bob,"#FF3B4E",u)}
}

/* ================= PICKUPS & LANDMARKS ================= */
function drawCoin(x,y,u,ch,need,t){
  const sp=Math.abs(Math.cos(t*3+x*.01))*.55+.45,r=13*u;
  if(need){const g=ctx.createRadialGradient(x,y,2,x,y,r*2.2);g.addColorStop(0,"rgba(255,214,80,.55)");g.addColorStop(1,"rgba(255,214,80,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*2.2,0,7);ctx.fill()}
  ctx.save();ctx.translate(x,y);ctx.scale(sp,1);
  ctx.fillStyle=need?"#C88F08":"#9C93AE";ctx.beginPath();ctx.arc(0,2*u,r,0,7);ctx.fill();
  ctx.fillStyle=need?"#FFC531":"#E4DEEC";ctx.strokeStyle=INK;ctx.lineWidth=2.2*u;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle=need?"#E8A508":"#B9B0C8";ctx.lineWidth=1.6*u;ctx.beginPath();ctx.arc(0,0,r-4*u,0,7);ctx.stroke();
  ctx.fillStyle=INK;ctx.font=F(800,15*u);ctx.textAlign="center";ctx.textBaseline="middle";if(sp>.6)ctx.fillText(ch,0,1.5*u);ctx.restore();
  ctx.fillStyle="rgba(255,255,255,.9)";ctx.beginPath();ctx.arc(x-5*u*sp,y-6*u,2*u,0,7);ctx.fill();
}
function drawChest(x,y,u,used,t){
  const bob=used?0:Math.sin(t*4+x*.01)*3*u;
  ctx.save();ctx.translate(x,y+bob);ctx.scale(u,u);ctx.lineWidth=2.4;ctx.strokeStyle=INK;ctx.lineJoin="round";
  if(!used){const g=ctx.createRadialGradient(0,0,4,0,0,40);g.addColorStop(0,"rgba(255,200,60,.55)");g.addColorStop(1,"rgba(255,200,60,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,40,0,7);ctx.fill()}
  toon(ctx,()=>{rrc(ctx,-17,-6,34,22,4)},used?"#8A6A50":"#B8642A","#8A4418",2,-2);
  ctx.save();if(used){ctx.translate(-17,-6);ctx.rotate(-.6);ctx.translate(17,6)}toon(ctx,()=>{ctx.beginPath();ctx.moveTo(-18,-6);ctx.lineTo(-18,-14);ctx.quadraticCurveTo(0,-26,18,-14);ctx.lineTo(18,-6);ctx.closePath()},used?"#9A7A60":"#D27A3A","#A85A22",2,-2);ctx.restore();
  ctx.fillStyle="#FFC531";ctx.fillRect(-3,-10,6,12);ctx.strokeRect(-3,-10,6,12);ctx.fillRect(-17,2,34,3);
  if(!used){ctx.fillStyle="#fff";ctx.font="900 11px Nunito";ctx.textAlign="center";[[-24,-24],[24,-20],[0,-34]].forEach(([sx,sy],i)=>{ctx.globalAlpha=.5+.5*Math.sin(t*5+i*2);ctx.fillText("✦",sx,sy)});ctx.globalAlpha=1}
  ctx.restore();
}
function drawGate(x,gy,u,t,done,col){
  ctx.save();ctx.translate(x,gy);ctx.scale(u,u);ctx.lineWidth=2.6;ctx.strokeStyle=INK;ctx.lineJoin="round";
  const glow=done?0:.5+.5*Math.sin(t*4);
  if(!done){const g=ctx.createRadialGradient(0,-110,10,0,-110,140);g.addColorStop(0,`rgba(255,210,90,${.35+.25*glow})`);g.addColorStop(1,"rgba(255,210,90,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,-110,140,0,7);ctx.fill();
    ctx.fillStyle=`rgba(255,240,180,${.18+.12*glow})`;ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(-40,-150);ctx.quadraticCurveTo(-40,-196,0,-196);ctx.quadraticCurveTo(40,-196,40,-150);ctx.lineTo(40,0);ctx.fill()}
  const arch=()=>{ctx.beginPath();ctx.moveTo(-60,0);ctx.lineTo(-60,-150);ctx.quadraticCurveTo(-60,-214,0,-214);ctx.quadraticCurveTo(60,-214,60,-150);ctx.lineTo(60,0);ctx.lineTo(40,0);ctx.lineTo(40,-150);ctx.quadraticCurveTo(40,-194,0,-194);ctx.quadraticCurveTo(-40,-194,-40,-150);ctx.lineTo(-40,0);ctx.closePath()};
  toon(ctx,arch,done?"#B8AE9E":"#E0B872","#B98A4A",4,0);
  ctx.strokeStyle="rgba(27,21,48,.3)";ctx.lineWidth=1.5;for(let k=1;k<5;k++){ctx.beginPath();ctx.moveTo(-60,-k*34);ctx.lineTo(-40,-k*34);ctx.moveTo(40,-k*34);ctx.lineTo(60,-k*34);ctx.stroke()}
  ctx.fillStyle=done?"#8FA08A":col||"#FF5C8A";[-50,50].forEach(px=>{for(let k=0;k<4;k++){ctx.beginPath();ctx.arc(px,-20-k*34,3,0,7);ctx.fill()}});
  ctx.strokeStyle=INK;ctx.lineWidth=2.6;ctx.fillStyle=done?"#2BD49A":"#FFC531";ctx.beginPath();ctx.arc(0,-232,22,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle=INK;ctx.font=F(800,26);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(done?"✓":"?",0,-229);
  ctx.restore();
}
function drawFinish(x,gy,u,t){
  ctx.save();ctx.translate(x,gy);ctx.scale(u,u);ctx.lineWidth=2.6;ctx.strokeStyle=INK;
  [-70,62].forEach(px=>{toon(ctx,()=>{ctx.beginPath();ctx.rect(px,-170,8,170)},"#3A3350","#241E36",0,0)});
  ctx.save();rrc(ctx,-78,-200,156,34,10);ctx.clip();for(let k=0;k<20;k++)for(let m=0;m<3;m++){ctx.fillStyle=(k+m)%2?"#fff":INK;ctx.fillRect(-78+k*8,-200+m*11.4,8,11.4)}ctx.restore();rrc(ctx,-78,-200,156,34,10);ctx.stroke();
  for(let k=0;k<9;k++){const fx=-70+k*17;ctx.fillStyle=["#FF3B4E","#FFC531","#2BD49A","#3EA2FF"][k%4];ctx.beginPath();ctx.moveTo(fx,-166);ctx.lineTo(fx+12,-166);ctx.lineTo(fx+6,-150+Math.sin(t*6+k)*2);ctx.closePath();ctx.fill();ctx.lineWidth=1.2;ctx.stroke()}
  ctx.restore();
}

/* ================= YAKSHARAJ (Yakshagana-inspired guardian) ================= */
function drawYaksha(x,y,u,talk,c,t){
  c.save();c.translate(x,y+Math.sin(t*1.6)*4*u);c.scale(u,u);c.lineWidth=3;c.strokeStyle=INK;c.lineJoin="round";
  const ag=c.createRadialGradient(0,-40,10,0,-40,160);ag.addColorStop(0,"rgba(255,214,120,.55)");ag.addColorStop(1,"rgba(255,214,120,0)");c.fillStyle=ag;c.beginPath();c.arc(0,-40,160,0,7);c.fill();
  // rotating halo of the crown
  c.save();c.translate(0,-70);c.rotate(t*.2);c.strokeStyle="rgba(255,197,49,.5)";c.lineWidth=2;for(let k=0;k<16;k++){c.rotate(Math.PI/8);c.beginPath();c.moveTo(0,-96);c.lineTo(0,-112);c.stroke()}c.restore();
  c.strokeStyle=INK;c.lineWidth=3;
  toon(c,()=>{c.beginPath();c.moveTo(-74,80);c.quadraticCurveTo(-78,0,-48,-10);c.lineTo(48,-10);c.quadraticCurveTo(78,0,74,80);c.closePath()},"#A8324A","#7E1E34",6,0,3);
  c.fillStyle="#FFC531";c.beginPath();c.moveTo(-14,-10);c.lineTo(0,80);c.lineTo(14,-10);c.closePath();c.fill();c.stroke();
  [-1,1].forEach(d=>{toon(c,()=>{c.beginPath();c.ellipse(d*60,18,14,32,d*-.25,0,7)},"#4A8FB8","#336E92",d*2,0,3);c.fillStyle="#FFC531";rrc(c,d*60-13,4,26,7,3);c.fill();c.stroke()});
  c.strokeStyle="#FFC531";c.lineWidth=6;c.beginPath();c.arc(0,-14,30,.25,Math.PI-.25);c.stroke();c.strokeStyle=INK;c.lineWidth=3;
  c.fillStyle="#E2263F";c.beginPath();c.arc(0,15,6,0,7);c.fill();c.stroke();
  toon(c,()=>{c.beginPath();c.ellipse(0,-48,34,38,0,0,7)},"#5AA0C8","#3E80A8",3,-3,3);
  c.fillStyle="#FFC531";[-1,1].forEach(d=>{c.beginPath();c.arc(d*36,-36,7,0,7);c.fill();c.stroke()});
  c.fillStyle="#FFC531";c.beginPath();c.moveTo(-34,-72);c.lineTo(-30,-108);c.lineTo(-15,-94);c.lineTo(0,-134);c.lineTo(15,-94);c.lineTo(30,-108);c.lineTo(34,-72);c.closePath();c.fill();c.stroke();
  c.fillStyle="#E2263F";c.beginPath();c.arc(0,-92,6,0,7);c.fill();c.stroke();c.fillStyle="#22A06B";[-18,18].forEach(dx=>{c.beginPath();c.arc(dx,-84,4,0,7);c.fill();c.stroke()});
  c.fillStyle="#C88F08";rrc(c,-36,-78,72,8,3);c.fill();c.stroke();
  [-1,1].forEach(d=>{c.fillStyle="#fff";c.beginPath();c.ellipse(d*13,-52,9,7,0,0,7);c.fill();c.stroke();
    const lx=Math.sin(t*.8)*1.5;c.fillStyle="#C88F08";c.beginPath();c.arc(d*13+lx,-52,4,0,7);c.fill();c.fillStyle=INK;c.beginPath();c.arc(d*13+lx,-52,1.8,0,7);c.fill();
    c.lineWidth=5;c.beginPath();c.moveTo(d*4,-63);c.quadraticCurveTo(d*14,-68,d*24,-62);c.stroke();c.lineWidth=3});
  c.fillStyle="#FF8FAE";c.beginPath();c.arc(0,-66,3,0,7);c.fill();
  c.strokeStyle="#fff";c.lineWidth=2;[-1,1].forEach(d=>{c.beginPath();c.moveTo(d*24,-44);c.lineTo(d*30,-30);c.stroke()});c.strokeStyle=INK;c.lineWidth=3;
  const open=talk>0?Math.abs(Math.sin(t*14))*7:1.5;
  c.fillStyle="#3B1A2E";c.beginPath();c.ellipse(0,-26,9,open,0,0,7);c.fill();
  c.lineWidth=5;[-1,1].forEach(d=>{c.beginPath();c.moveTo(0,-34);c.quadraticCurveTo(d*16,-40,d*24,-30);c.quadraticCurveTo(d*28,-24,d*22,-24);c.stroke()});
  c.restore();
}

/* draw a runner portrait into any small canvas (menus, shop, HUD) */
function portrait(canvas,R,opts){
  opts=opts||{};const d=Math.min(2,devicePixelRatio||1),w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height;
  canvas.width=w*d;canvas.height=h*d;const c=canvas.getContext("2d");c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  let s=h/104*(opts.zoom||1);
  if(opts.head){s=h/46;c.translate(w/2-8*s,h*.55+58*s)}else c.translate(w/2-4*s,h-(opts.pad??4));c.scale(s,s);
  if(opts.locked){c.globalAlpha=.9;c.filter="brightness(0) opacity(.45)"}
  drawCritter(c,R,{idle:!opts.run,ph:opts.ph||0,t:opts.t||0,win:opts.win,happy:true});
  c.filter="none";
}
