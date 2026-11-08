"use strict";
/* Drawing: helpers, runners, hazards, word boxes, gates, scenery, coins, Yaksharaj. All world art is drawn on the canvas; all text UI lives in the DOM. */
const cv=document.getElementById("cv"),ctx=cv.getContext("2d");
let W=0,H=0;
function resize(){const d=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*d);cv.height=Math.round(H*d);cv.style.width=W+"px";cv.style.height=H+"px";ctx.setTransform(d,0,0,d,0,0)}
addEventListener("resize",resize);resize();
const hash=n=>{n=Math.sin(n*127.1)*43758.5453;return n-Math.floor(n)};
function rrc(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}
const F=(w,s,f)=>`${w} ${s}px ${f==="b"?"Nunito,sans-serif":'"Baloo Tamma 2","Noto Sans Kannada",sans-serif'}`;
function pill(txt,x,y,bg,u,fg="#fff"){ctx.font=F(900,11*u,"b");const tw=ctx.measureText(txt).width+14*u;ctx.fillStyle=bg;ctx.strokeStyle="#1B1530";ctx.lineWidth=2*u;rr(x-tw/2,y-10*u,tw,20*u,10*u);ctx.fill();ctx.stroke();ctx.fillStyle=fg;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(txt,x,y+1*u);ctx.textBaseline="alphabetic"}
/* ================= CHARACTER ART — Judy Hopps & Nick Wilde (Zootopia) ================= */
/* Judy Hopps: grey rabbit, big ears, ZPD blue uniform, purple eyes */
function drawRabbit(x,y,u,ph,air,sc){
  const c=ctx;c.save();c.translate(x,y);c.scale(u*(sc||1),u*(sc||1));c.lineCap="round";c.lineJoin="round";
  const a=air?.9:Math.sin(ph)*.85,b=air?-.4:Math.sin(ph+Math.PI)*.85;
  // legs (blue trousers)
  [[-6,b],[6,a]].forEach(([lx,an])=>{c.strokeStyle="#1B1530";c.lineWidth=6;c.beginPath();c.moveTo(lx,-12);c.lineTo(lx+Math.sin(an)*13,0);c.stroke();c.strokeStyle="#3A6BE8";c.lineWidth=4;c.stroke()});
  // boots
  [[-6,b],[6,a]].forEach(([lx,an])=>{c.fillStyle="#1B1530";c.beginPath();c.ellipse(lx+Math.sin(an)*13,2,6,3.5,0,0,Math.PI*2);c.fill()});
  c.lineWidth=2.5;c.strokeStyle="#1B1530";
  // body — ZPD blue uniform
  c.fillStyle="#2E5BD4";c.beginPath();c.ellipse(0,-22,14,16,0,0,Math.PI*2);c.fill();c.stroke();
  // badge
  c.fillStyle="#FFD700";c.beginPath();c.arc(5,-22,4,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle="#1B1530";c.font="bold 5px sans-serif";c.textAlign="center";c.fillText("ZPD",5,-21);
  // belt + holster
  c.fillStyle="#1B1530";c.fillRect(-14,-12,28,3.5);c.fillStyle="#8B6914";c.beginPath();c.roundRect(-10,-14,8,8,2);c.fill();c.stroke();
  // arms
  const wa=air?0:Math.sin(ph+.5)*.5;
  [[-12,-24,-0.6+wa],[12,-24,0.4-wa]].forEach(([ax,ay,ar])=>{c.save();c.translate(ax,ay);c.rotate(ar);c.fillStyle="#B8C0CC";c.strokeStyle="#1B1530";c.lineWidth=2;c.beginPath();c.ellipse(0,-6,4,8,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle="#2E5BD4";c.beginPath();c.ellipse(0,-2,5,6,0,0,Math.PI*2);c.fill();c.stroke();c.restore()});
  // neck
  c.fillStyle="#B8C0CC";c.beginPath();c.ellipse(0,-36,7,5,0,0,Math.PI*2);c.fill();c.stroke();
  // head — grey rabbit
  c.fillStyle="#C8CDD6";c.beginPath();c.ellipse(0,-44,13,11,0,0,Math.PI*2);c.fill();c.stroke();
  // big ears
  const fl=air?-.3:Math.sin(ph*.5)*.12;
  [[-7,-0.3+fl],[7,0.15+fl]].forEach(([ex,er])=>{c.save();c.translate(ex,-54);c.rotate(er);c.fillStyle="#C8CDD6";c.strokeStyle="#1B1530";c.lineWidth=2.2;c.beginPath();c.ellipse(0,-11,5,14,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle="#E8A4B8";c.beginPath();c.ellipse(0,-11,2.5,10,0,0,Math.PI*2);c.fill();c.restore()});
  // muzzle
  c.fillStyle="#E0C4B4";c.beginPath();c.ellipse(5,-41,7,5,0,0,Math.PI*2);c.fill();c.stroke();
  // nose
  c.fillStyle="#E06080";c.beginPath();c.arc(8,-42,2.2,0,Math.PI*2);c.fill();
  // eyes — big violet Judy eyes
  c.fillStyle="#fff";c.beginPath();c.ellipse(-3,-46,3.5,4,-.1,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle="#7B52D6";c.beginPath();c.ellipse(-2.5,-46,2,2.8,-.1,0,Math.PI*2);c.fill();
  c.fillStyle="#1B1530";c.beginPath();c.ellipse(-2,-46,1,1.5,0,0,Math.PI*2);c.fill();
  c.fillStyle="#fff";c.beginPath();c.arc(-1,-47.5,.7,0,Math.PI*2);c.fill();
  // fluffy tail
  c.fillStyle="#fff";c.beginPath();c.arc(-14,-14,7,0,Math.PI*2);c.fill();c.stroke();
  c.restore();
}

/* Nick Wilde: red-orange fox, green Hawaiian shirt, tie, smug green eyes */
function drawFox(x,y,u,ph,air,sc){
  const c=ctx;c.save();c.translate(x,y);c.scale(u*(sc||1),u*(sc||1));c.lineCap="round";c.lineJoin="round";
  const a=air?.9:Math.sin(ph)*.85,b=air?-.4:Math.sin(ph+Math.PI)*.85;
  // legs (khaki trousers)
  [[-6,b],[6,a]].forEach(([lx,an])=>{c.strokeStyle="#1B1530";c.lineWidth=6;c.beginPath();c.moveTo(lx,-12);c.lineTo(lx+Math.sin(an)*13,0);c.stroke();c.strokeStyle="#B8A878";c.lineWidth=4;c.stroke()});
  // shoes
  [[-6,b],[6,a]].forEach(([lx,an])=>{c.fillStyle="#6B4830";c.beginPath();c.ellipse(lx+Math.sin(an)*13,2,7,3.5,0,0,Math.PI*2);c.fill()});
  c.lineWidth=2.5;c.strokeStyle="#1B1530";
  // body — green Hawaiian shirt
  c.fillStyle="#4CAF50";c.beginPath();c.ellipse(0,-22,14,16,0,0,Math.PI*2);c.fill();c.stroke();
  // shirt pattern dots
  c.fillStyle="rgba(255,255,180,.5)";[[4,-28],[-8,-20],[6,-16],[-4,-14]].forEach(([dx,dy])=>{c.beginPath();c.arc(dx,dy,2,0,Math.PI*2);c.fill()});
  // tie
  c.fillStyle="#2244AA";c.beginPath();c.moveTo(0,-36);c.lineTo(-3,-24);c.lineTo(0,-20);c.lineTo(3,-24);c.closePath();c.fill();c.stroke();
  // arms
  const wa=air?0:Math.sin(ph+.5)*.5;
  [[-12,-24,-0.6+wa],[12,-24,0.4-wa]].forEach(([ax,ay,ar])=>{c.save();c.translate(ax,ay);c.rotate(ar);c.fillStyle="#E07030";c.strokeStyle="#1B1530";c.lineWidth=2;c.beginPath();c.ellipse(0,-6,4,8,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle="#4CAF50";c.beginPath();c.ellipse(0,-2,5,6,0,0,Math.PI*2);c.fill();c.stroke();c.restore()});
  // neck
  c.fillStyle="#E07030";c.beginPath();c.ellipse(0,-36,7,5,0,0,Math.PI*2);c.fill();c.stroke();
  // head — orange fox
  c.fillStyle="#E07030";c.beginPath();c.ellipse(0,-44,13,11,0,0,Math.PI*2);c.fill();c.stroke();
  // white muzzle area
  c.fillStyle="#FFF4E0";c.beginPath();c.ellipse(6,-41,7,5.5,0,0,Math.PI*2);c.fill();c.stroke();
  // nose
  c.fillStyle="#1B1530";c.beginPath();c.arc(10,-43,2,0,Math.PI*2);c.fill();
  // pointy ears
  const tw=air?0:Math.sin(ph*.8)*.1;
  [[-7,-54,-.3+tw],[7,-55,.2+tw]].forEach(([ex,ey,er])=>{c.save();c.translate(ex,ey);c.rotate(er);c.fillStyle="#E07030";c.strokeStyle="#1B1530";c.lineWidth=2;c.beginPath();c.moveTo(-5,6);c.lineTo(0,-10);c.lineTo(5,6);c.closePath();c.fill();c.stroke();c.fillStyle="#C03040";c.beginPath();c.moveTo(-2,3);c.lineTo(0,-6);c.lineTo(2,3);c.fill();c.restore()});
  // dark mask
  c.fillStyle="#2A1810";c.beginPath();c.ellipse(-2,-46,5,3.5,.2,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(8,-44,4,3,-.1,0,Math.PI*2);c.fill();
  // eyes — sly green Nick eyes
  c.fillStyle="#fff";c.beginPath();c.ellipse(9,-44.5,3,3.5,.1,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle="#2E8B2E";c.beginPath();c.ellipse(9.5,-44.5,1.8,2.5,.1,0,Math.PI*2);c.fill();
  c.fillStyle="#1B1530";c.beginPath();c.ellipse(10,-44.5,1,1.5,0,0,Math.PI*2);c.fill();
  c.fillStyle="#fff";c.beginPath();c.arc(10.5,-45.5,.7,0,Math.PI*2);c.fill();
  // smug half-lidded left eyelid
  c.fillStyle="#E07030";c.beginPath();c.moveTo(6.5,-42);c.quadraticCurveTo(9,-40,11.5,-42);c.lineTo(11,-45);c.quadraticCurveTo(9,-44,7,-45);c.closePath();c.fill();
  // fluffy tail
  const tf=Math.sin(ph*.7)*.2;c.save();c.translate(-16,-10);c.rotate(.5+tf);
  c.fillStyle="#E07030";c.beginPath();c.ellipse(0,0,8,14,.3,0,Math.PI*2);c.fill();c.stroke();
  c.fillStyle="#fff";c.beginPath();c.ellipse(2,10,4,6,.2,0,Math.PI*2);c.fill();c.stroke();
  c.restore();c.restore();
}
function drawRunner(L,x,y,u,sc=1){const air=L.y>2,idle=G&&G.phase==="count";if(typeof drawSprite==="function"&&drawSprite(L.kind,x,y,u,sc,L.ph,air,idle))return;if(L.kind==="rabbit")drawRabbit(x,y,u,L.ph,air,sc);else drawFox(x,y,u,L.ph,air,sc)}

/* ================= HAZARD ART (bright, outlined, tagged) ================= */
function drawHazard(h,L,sx,gy,u){
  const t=h.type,D=HZ[t],k=D.kind,done=L.hit.has(h.id);
  ctx.save();ctx.lineWidth=2.6*u;ctx.strokeStyle="#1B1530";
  if(!done&&k!=="slow"){const cy=k==="air"?gy-137*u:gy-(D.h||10)*u*.5,rad=(k==="air"?58:Math.max(30,(D.w+D.h)*.75))*u;
    const g=ctx.createRadialGradient(sx,cy,4*u,sx,cy,rad);g.addColorStop(0,k==="air"?"rgba(122,79,208,.4)":"rgba(226,38,63,.38)");g.addColorStop(1,"rgba(226,38,63,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,cy,rad,0,7);ctx.fill()}
  if(k==="ground"&&t!=="pothole"){ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(sx,gy+3*u,(D.w+4)*u,5*u,0,0,7);ctx.fill()}
  if(t==="pothole"){ctx.fillStyle="#120E19";ctx.beginPath();ctx.ellipse(sx,gy+3*u,26*u,8*u,0,0,7);ctx.fill();ctx.stroke();
    [-1,1].forEach(m=>{ctx.strokeStyle="#1B1530";ctx.lineWidth=2.6*u;ctx.beginPath();ctx.moveTo(sx+m*30*u,gy+2*u);ctx.lineTo(sx+m*30*u,gy-20*u);ctx.stroke();ctx.fillStyle="#E2263F";ctx.beginPath();ctx.moveTo(sx+m*30*u,gy-20*u);ctx.lineTo(sx+m*30*u-m*12*u,gy-16*u);ctx.lineTo(sx+m*30*u,gy-12*u);ctx.closePath();ctx.fill();ctx.stroke()})}
  else if(t==="puddle"||t==="mud"){ctx.fillStyle=t==="mud"?"#8A5A33":"#5BAEE6";ctx.beginPath();ctx.ellipse(sx,gy+3*u,34*u,7*u,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="rgba(255,255,255,.55)";ctx.beginPath();ctx.ellipse(sx-8*u,gy+1*u,10*u,2*u,0,0,7);ctx.fill()}
  else if(t==="barricade"){
    ctx.fillStyle="#1B1530";ctx.fillRect(sx-20*u,gy-44*u,4*u,44*u);ctx.fillRect(sx+16*u,gy-44*u,4*u,44*u);
    for(let r=0;r<2;r++){const yy=gy-(40-r*18)*u;ctx.save();rr(sx-26*u,yy,52*u,12*u,3*u);ctx.clip();ctx.fillStyle="#fff";ctx.fillRect(sx-26*u,yy,52*u,12*u);ctx.fillStyle="#E2263F";for(let q=-3;q<4;q++){ctx.beginPath();ctx.moveTo(sx+q*12*u,yy);ctx.lineTo(sx+q*12*u+8*u,yy);ctx.lineTo(sx+q*12*u,yy+12*u);ctx.lineTo(sx+q*12*u-8*u,yy+12*u);ctx.fill()}ctx.restore();rr(sx-26*u,yy,52*u,12*u,3*u);ctx.stroke()}}
  else if(t==="cone"){ctx.fillStyle="#FF6A1F";ctx.beginPath();ctx.moveTo(sx-12*u,gy);ctx.lineTo(sx-3*u,gy-30*u);ctx.lineTo(sx+3*u,gy-30*u);ctx.lineTo(sx+12*u,gy);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#fff";ctx.fillRect(sx-7*u,gy-17*u,14*u,5*u);ctx.fillStyle="#1B1530";rr(sx-15*u,gy-3*u,30*u,4*u,2*u);ctx.fill()}
  else if(t==="bus"){const x0=sx-58*u,yy=gy-62*u;ctx.fillStyle="#1E9E78";rr(x0,yy,116*u,54*u,10*u);ctx.fill();ctx.stroke();ctx.fillStyle="#F3F0E4";ctx.fillRect(x0+2*u,yy+30*u,112*u,8*u);ctx.fillStyle="#BFE6F7";for(let q=0;q<5;q++){rr(x0+8*u+q*20*u,yy+8*u,15*u,16*u,3*u);ctx.fill();ctx.stroke()}ctx.fillStyle="#1B1530";ctx.font=F(800,9*u,"b");ctx.textAlign="center";ctx.fillText("BMTC",sx,yy+51*u);[x0+24*u,x0+92*u].forEach(wx=>{ctx.fillStyle="#1B1530";ctx.beginPath();ctx.arc(wx,gy-6*u,9*u,0,7);ctx.fill();ctx.fillStyle="#9C95A8";ctx.beginPath();ctx.arc(wx,gy-6*u,3.5*u,0,7);ctx.fill()})}
  else if(t==="log"){ctx.fillStyle="#8B5A2B";rr(sx-32*u,gy-24*u,64*u,24*u,12*u);ctx.fill();ctx.stroke();ctx.fillStyle="#C8935A";ctx.beginPath();ctx.ellipse(sx+26*u,gy-12*u,7*u,11*u,0,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle="#6B4220";ctx.lineWidth=1.5*u;ctx.beginPath();ctx.ellipse(sx+26*u,gy-12*u,3*u,5*u,0,0,7);ctx.stroke()}
  else if(t==="rock"){ctx.fillStyle="#8D8A96";ctx.beginPath();ctx.moveTo(sx-24*u,gy);ctx.quadraticCurveTo(sx-26*u,gy-24*u,sx-6*u,gy-30*u);ctx.quadraticCurveTo(sx+18*u,gy-34*u,sx+24*u,gy-10*u);ctx.lineTo(sx+24*u,gy);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="rgba(255,255,255,.35)";ctx.beginPath();ctx.ellipse(sx-6*u,gy-22*u,7*u,4*u,-.4,0,7);ctx.fill()}
  else if(t==="boulder"){ctx.save();ctx.translate(sx,gy-22*u);ctx.rotate((L.d-h.x)*.03);ctx.fillStyle="#A07E5C";ctx.beginPath();ctx.arc(0,0,22*u,0,7);ctx.fill();ctx.stroke();ctx.strokeStyle="#6E5238";ctx.lineWidth=2*u;ctx.beginPath();ctx.moveTo(-10*u,-8*u);ctx.lineTo(6*u,4*u);ctx.moveTo(4*u,-14*u);ctx.lineTo(12*u,-2*u);ctx.stroke();ctx.restore();
    if(hzX(h,L)<h.x){ctx.fillStyle="rgba(160,126,92,.5)";for(let q=1;q<4;q++){ctx.beginPath();ctx.arc(sx+(24+q*9)*u,gy-4*u,3*u,0,7);ctx.fill()}}}
  else if(t==="coconut"){const p=coconutP(h,L),top=gy-260*u,cy=top+(gy-12*u-top)*p*p;
    if(p<1){ctx.fillStyle="#2F7A3E";ctx.beginPath();ctx.moveTo(sx,top-12*u);for(let q=0;q<5;q++){const a=-Math.PI+q*Math.PI/4;ctx.quadraticCurveTo(sx+Math.cos(a)*30*u,top-10*u+Math.sin(a)*10*u,sx+Math.cos(a)*44*u,top+Math.abs(Math.sin(a))*14*u);ctx.lineTo(sx,top-12*u)}ctx.fill()}
    ctx.fillStyle="#7A4A24";ctx.beginPath();ctx.arc(sx,cy,12*u,0,7);ctx.fill();ctx.stroke();
    if(p>0&&p<1){ctx.fillStyle="rgba(226,38,63,.35)";ctx.beginPath();ctx.ellipse(sx,gy+3*u,16*u*p,5*u,0,0,7);ctx.fill()}}
  else if(k==="air"){const fl=Math.sin(G.t*14);ctx.font=`${30*u}px serif`;ctx.textAlign="center";
    [[0,-136],[-26,-154],[24,-120]].forEach(([dx,dy],q)=>{ctx.save();ctx.translate(sx+dx*u,gy+dy*u+Math.sin(G.t*4+q)*4*u);ctx.scale(1,1+fl*.08);ctx.fillText(D.e,0,10*u);ctx.restore()});
    ctx.strokeStyle="rgba(122,79,208,.9)";ctx.setLineDash([5*u,5*u]);ctx.lineWidth=2*u;ctx.beginPath();ctx.moveTo(sx-40*u,gy-100*u);ctx.lineTo(sx+40*u,gy-100*u);ctx.stroke();ctx.setLineDash([])}
  else{ctx.font=`${D.sz*u}px serif`;ctx.textAlign="center";ctx.fillText(D.e,sx,gy+5*u);
    if(D.move&&hzX(h,L)<h.x){ctx.fillStyle="rgba(255,255,255,.85)";for(let q=1;q<3;q++)ctx.fillRect(sx+(D.w+q*8)*u,gy-(12+q*5)*u,8*u,2.5*u)}}
  ctx.restore();
  if(done||sx<PX()+8*u)return;
  const bob=Math.sin(G.t*6+h.x)*2*u;
  if(k==="air")pill("⬇ STAY LOW",sx,gy-86*u+bob,"#7A4FD0",u);
  else if(k==="slow")pill("SLOW",sx,gy-22*u+bob,"#2F7FD0",u);
  else{const top=t==="coconut"?40:t==="pothole"?28:D.h;pill("JUMP!",sx,gy-top*u-18*u+bob,"#E2263F",u);
    ctx.fillStyle="#E2263F";ctx.beginPath();ctx.moveTo(sx-5*u,gy-top*u-8*u+bob);ctx.lineTo(sx+5*u,gy-top*u-8*u+bob);ctx.lineTo(sx,gy-top*u-2*u+bob);ctx.fill()}
}
function drawBox(b,L,sx,u){
  const y=BOX_Y(),used=L.boxHit.has(b.id),s=30*u,bob=used?0:Math.sin(G.t*4+b.x)*2*u;
  ctx.save();ctx.lineWidth=2.8*u;ctx.strokeStyle="#1B1530";
  ctx.fillStyle="#1B1530";rr(sx-s/2,y-s/2+4*u+bob,s,s,6*u);ctx.fill();
  ctx.fillStyle=used?"#A8794E":"#FFB800";rr(sx-s/2,y-s/2+bob,s,s,6*u);ctx.fill();ctx.stroke();
  if(!used){ctx.fillStyle="#FFE07A";ctx.fillRect(sx-s/2+4*u,y-s/2+4*u+bob,6*u,3*u);ctx.fillStyle="#1B1530";ctx.font=F(800,22*u);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("?",sx,y+2*u+bob);ctx.textBaseline="alphabetic";
    if(sx>PX())pill("NEW WORD",sx,y-s/2-12*u+bob,"#FFB800",u,"#1B1530")}
  ctx.restore();
}
function drawGate(g,sx,gy,u,L){
  // A carved stone arch with a glowing "?" sign. The question itself appears on screen when you reach it.
  const done=L.gateDone.has(g.x),glow=done?0:.5+.5*Math.sin(G.t*4);
  ctx.save();ctx.lineWidth=2.6*u;ctx.strokeStyle="#1B1530";
  if(!done){const g2=ctx.createRadialGradient(sx,gy-110*u,10*u,sx,gy-110*u,120*u);g2.addColorStop(0,`rgba(255,197,49,${.35+.2*glow})`);g2.addColorStop(1,"rgba(255,197,49,0)");ctx.fillStyle=g2;ctx.beginPath();ctx.arc(sx,gy-110*u,120*u,0,7);ctx.fill()}
  ctx.fillStyle=done?"#A89C8C":"#C9A46A";
  ctx.beginPath();ctx.moveTo(sx-58*u,gy);ctx.lineTo(sx-58*u,gy-150*u);ctx.quadraticCurveTo(sx-58*u,gy-212*u,sx,gy-212*u);ctx.quadraticCurveTo(sx+58*u,gy-212*u,sx+58*u,gy-150*u);ctx.lineTo(sx+58*u,gy);
  ctx.lineTo(sx+38*u,gy);ctx.lineTo(sx+38*u,gy-148*u);ctx.quadraticCurveTo(sx+38*u,gy-192*u,sx,gy-192*u);ctx.quadraticCurveTo(sx-38*u,gy-192*u,sx-38*u,gy-148*u);ctx.lineTo(sx-38*u,gy);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle="rgba(27,21,48,.35)";ctx.lineWidth=1.5*u;for(let k=1;k<5;k++){ctx.beginPath();ctx.moveTo(sx-58*u,gy-k*34*u);ctx.lineTo(sx-38*u,gy-k*34*u);ctx.moveTo(sx+38*u,gy-k*34*u);ctx.lineTo(sx+58*u,gy-k*34*u);ctx.stroke()}
  ctx.strokeStyle="#1B1530";ctx.lineWidth=2.6*u;
  const r=20*u,cy=gy-228*u;ctx.fillStyle=done?"#22A06B":"#FFC531";ctx.beginPath();ctx.arc(sx,cy,r,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle="#1B1530";ctx.font=F(800,24*u);ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(done?"✓":"?",sx,cy+2*u);ctx.textBaseline="alphabetic";
  ctx.restore();
}

/* ================= SCENERY (faded so road objects stand out) ================= */
function drawScene(L,h,u,gy){
  const w=WD(),si=Math.max(0,L.sec),th=w.theme,sk=w.sky[si];
  const sky=ctx.createLinearGradient(0,0,0,gy);sky.addColorStop(0,sk[0]);sky.addColorStop(1,sk[1]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,gy);
  const night=th==="palace"&&si===2,sunset=si===3&&th!=="falls";
  const sunX=W*.78,sunY=sunset?gy*.6:gy*.28;
  ctx.fillStyle=night?"rgba(255,250,220,.95)":sunset?"rgba(255,214,120,.95)":"rgba(255,244,200,.9)";ctx.beginPath();ctx.arc(sunX,sunY,(sunset?36:24)*u,0,7);ctx.fill();
  if(night){ctx.fillStyle="rgba(255,255,255,.8)";for(let k=0;k<20;k++)ctx.fillRect(hash(k)*W,hash(k+3)*gy*.5,2*u,2*u)}
  for(let k=0;k<4;k++){const span=W+260;let cx=(k*span/4-L.d*.05*u-G.t*6)%span;if(cx<-130)cx+=span;const cy=gy*(.16+.12*(k%2));ctx.fillStyle=night?"rgba(255,255,255,.18)":"rgba(255,255,255,.85)";[[0,0,22],[20,-8,18],[40,0,20],[18,6,18]].forEach(([a,b,r])=>{ctx.beginPath();ctx.arc(cx+a*u,cy+b*u,r*u,0,7);ctx.fill()})}
  ctx.fillStyle=w.far;ctx.beginPath();ctx.moveTo(0,gy);const fo=L.d*.1*u;
  for(let x=-60;x<=W+60;x+=30){const i=Math.floor((x+fo)/30),off=fo%30;let hh;
    if(th==="forest"||th==="falls")hh=(70+Math.sin(i*.35)*40+hash(i)*14)*u;else if(th==="ruins")hh=(40+Math.abs(Math.sin(i*.5))*50)*u;else hh=(50+hash(i)*90)*u;
    ctx.lineTo(x-off,gy-hh);ctx.lineTo(x-off+30,gy-hh)}ctx.lineTo(W,gy);ctx.fill();
  const mo=L.d*.35*u,bw=70*u;
  for(let k=-2;k<W/bw+3;k++){const i=Math.floor(mo/bw)+k,bx=i*bw-mo,r=hash(i+11),c=w.mid[Math.abs(i)%3];
    ctx.strokeStyle="rgba(27,21,48,.45)";ctx.lineWidth=1.5*u;
    if((th==="city"&&si===3)||th==="forest"){const t2=(60+r*60)*u;ctx.fillStyle="#6B4A2B";ctx.fillRect(bx+bw/2-4*u,gy-t2*.5,8*u,t2*.5);ctx.fillStyle=c;
      if(th==="forest"){ctx.beginPath();ctx.moveTo(bx+bw/2,gy-t2*1.25);ctx.lineTo(bx+bw/2-t2*.4,gy-t2*.35);ctx.lineTo(bx+bw/2+t2*.4,gy-t2*.35);ctx.closePath();ctx.fill()}
      else{ctx.beginPath();ctx.arc(bx+bw/2,gy-t2*.6,t2*.38,0,7);ctx.arc(bx+bw/2-t2*.22,gy-t2*.48,t2*.28,0,7);ctx.arc(bx+bw/2+t2*.22,gy-t2*.48,t2*.28,0,7);ctx.fill()}}
    else if(th==="city"){const bh=(70+r*110)*u,w2=bw-8*u;ctx.fillStyle=c;rr(bx+4*u,gy-bh,w2,bh,4*u);ctx.fill();ctx.stroke();ctx.fillStyle="rgba(255,250,220,.75)";for(let wy=gy-bh+12*u;wy<gy-20*u;wy+=18*u)for(let wx=bx+12*u;wx<bx+w2-6*u;wx+=16*u)if(hash(i*31+wx+wy)>.3)ctx.fillRect(wx,wy,8*u,9*u)}
    else if(th==="palace"){if(Math.abs(i)%5===0){const pw=bw*2.4,ph=110*u;ctx.fillStyle=night?"#5B4A7A":c;ctx.fillRect(bx,gy-ph,pw,ph);ctx.strokeRect(bx,gy-ph,pw,ph);
        [[.5,46],[.15,28],[.85,28]].forEach(([fx,dr])=>{ctx.beginPath();ctx.arc(bx+pw*fx,gy-ph,dr*u,Math.PI,0);ctx.fill();ctx.stroke()});
        ctx.fillStyle=night?"#FFE38A":"rgba(255,255,255,.6)";for(let q=0;q<9;q++)for(let m=0;m<3;m++){ctx.beginPath();ctx.arc(bx+10*u+q*pw/9,gy-ph+20*u+m*30*u,night?2.2*u:4*u,0,7);ctx.fill()}}
      else if(Math.abs(i)%5===3){ctx.fillStyle="#3F8A50";ctx.beginPath();ctx.arc(bx+bw/2,gy-46*u,26*u,0,7);ctx.fill()}}
    else if(th==="ruins"){if(Math.abs(i)%4===0){const gh=(110+r*40)*u,gw=bw*1.1;ctx.fillStyle=c;for(let s=0;s<5;s++){const sw=gw*(1-s*.16),sh=gh/5;ctx.fillRect(bx+(gw-sw)/2,gy-(s+1)*sh,sw,sh);ctx.strokeRect(bx+(gw-sw)/2,gy-(s+1)*sh,sw,sh)}}
      else{ctx.fillStyle=c;[[0,0,24],[20,-14,18],[34,4,20]].forEach(([a,b,rad])=>{ctx.beginPath();ctx.arc(bx+a*u+10*u,gy-20*u+b*u-r*20*u,rad*u,0,7);ctx.fill();ctx.stroke()})}}
    else if(th==="falls"){if(Math.abs(i)%6===0){const fw=bw*1.4;ctx.fillStyle="#4E6E66";ctx.fillRect(bx-10*u,gy-200*u,fw+20*u,200*u);ctx.fillStyle="#E8F8FF";ctx.fillRect(bx,gy-200*u,fw,200*u);ctx.fillStyle="#A9DDF2";for(let s=0;s<6;s++){const yy=((G.t*160+s*40)%200)*u;ctx.fillRect(bx+s*fw/6,gy-200*u+yy,fw/12,30*u)}ctx.fillStyle="rgba(255,255,255,.7)";ctx.beginPath();ctx.arc(bx+fw/2,gy-6*u,40*u,Math.PI,0);ctx.fill()}
      else{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(bx,gy);ctx.lineTo(bx+10*u,gy-(60+r*60)*u);ctx.lineTo(bx+bw,gy-(40+r*40)*u);ctx.lineTo(bx+bw,gy);ctx.fill()}}
  }
  const no=L.d*.8*u,lw=240*u;
  for(let k=-1;k<W/lw+2;k++){const i=Math.floor(no/lw)+k,lx=i*lw-no+40*u;
    if((th==="city"&&si<3)||th==="palace"){ctx.strokeStyle="#3A3350";ctx.lineWidth=4*u;ctx.beginPath();ctx.moveTo(lx,gy);ctx.lineTo(lx,gy-110*u);ctx.quadraticCurveTo(lx,gy-120*u,lx+14*u,gy-120*u);ctx.stroke();ctx.fillStyle="#FFE38A";ctx.beginPath();ctx.ellipse(lx+16*u,gy-116*u,7*u,4*u,0,0,7);ctx.fill()}
    else if(th==="ruins"){ctx.fillStyle="#C59D6E";ctx.fillRect(lx-7*u,gy-90*u,14*u,90*u);ctx.fillRect(lx-12*u,gy-98*u,24*u,10*u)}
    else{ctx.fillStyle=th==="falls"?"#3E6B4F":"#2F6B40";for(let m=0;m<5;m++){const a=-2.4+m*.45;ctx.beginPath();ctx.ellipse(lx+Math.cos(a)*18*u,gy-10*u+Math.sin(a)*18*u,16*u,5*u,a,0,7);ctx.fill()}}}
  // haze: pushes the whole background back so obstacles pop
  ctx.fillStyle=night?"rgba(40,30,70,.28)":"rgba(255,255,255,.36)";ctx.fillRect(0,0,W,gy);
  const [gA,gB,edge]=w.ground;
  ctx.fillStyle=edge;ctx.fillRect(0,gy-6*u,W,8*u);
  if(th==="city"){const ro=(L.d*u)%40;for(let x=-ro;x<W;x+=40){ctx.fillStyle=Math.floor((x+ro+L.d*u)/40)%2?"#FFC531":"#1B1530";ctx.fillRect(x,gy-6*u,20*u,6*u)}}
  const rg=ctx.createLinearGradient(0,gy,0,h);rg.addColorStop(0,gA);rg.addColorStop(1,gB);ctx.fillStyle=rg;ctx.fillRect(0,gy,W,h-gy);
  ctx.fillStyle="rgba(255,255,255,.35)";const dash=(L.d*u)%70;for(let x=-dash;x<W;x+=70)ctx.fillRect(x,gy+11*u,th==="city"?36*u:14*u,3.5*u);
}
function coin(x,y,u,ch,need){
  const sp=Math.abs(Math.cos(G.t*3+x*.01))*.55+.45,r=13*u;
  ctx.save();ctx.translate(x,y);ctx.scale(sp,1);
  ctx.fillStyle=need?"#FFC531":"#E4DEEC";ctx.strokeStyle="#1B1530";ctx.lineWidth=2.4*u;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.stroke();
  ctx.strokeStyle=need?"#C88F08":"#B3AAC2";ctx.lineWidth=1.5*u;ctx.beginPath();ctx.arc(0,0,r-4*u,0,7);ctx.stroke();
  ctx.fillStyle="#1B1530";ctx.font=F(800,15*u);ctx.textAlign="center";ctx.textBaseline="middle";if(sp>.6)ctx.fillText(ch,0,1.5*u);ctx.restore();
  if(need){ctx.fillStyle="rgba(255,255,255,.9)";ctx.beginPath();ctx.arc(x-5*u,y-6*u,2*u,0,7);ctx.fill()}
}


function drawYaksha(x,y,u,talk,c){
  const ctx=c;ctx.save();ctx.translate(x,y+Math.sin(G.t*1.6)*4*u);ctx.scale(u,u);ctx.lineWidth=3;ctx.strokeStyle="#1B1530";ctx.lineJoin="round";
  const ag=ctx.createRadialGradient(0,-40,10,0,-40,150);ag.addColorStop(0,"rgba(255,214,120,.55)");ag.addColorStop(1,"rgba(255,214,120,0)");ctx.fillStyle=ag;ctx.beginPath();ctx.arc(0,-40,150,0,7);ctx.fill();
  // robe and shoulders
  ctx.fillStyle="#8E2C3A";ctx.beginPath();ctx.moveTo(-70,70);ctx.quadraticCurveTo(-74,0,-46,-10);ctx.lineTo(46,-10);ctx.quadraticCurveTo(74,0,70,70);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#FFC531";ctx.beginPath();ctx.moveTo(-14,-10);ctx.lineTo(0,70);ctx.lineTo(14,-10);ctx.closePath();ctx.fill();ctx.stroke();
  // arms with gold bands
  [-1,1].forEach(d=>{ctx.fillStyle="#3F7EA6";ctx.beginPath();ctx.ellipse(d*58,18,13,30,d*-.25,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#FFC531";rrc(ctx,d*58-12,4,24,7,3);ctx.fill();ctx.stroke()});
  // necklace
  ctx.strokeStyle="#FFC531";ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,-14,30,.25,Math.PI-.25);ctx.stroke();ctx.strokeStyle="#1B1530";ctx.lineWidth=3;
  ctx.fillStyle="#E2263F";ctx.beginPath();ctx.arc(0,15,6,0,7);ctx.fill();ctx.stroke();
  // head
  ctx.fillStyle="#4A8FB8";ctx.beginPath();ctx.ellipse(0,-48,34,38,0,0,7);ctx.fill();ctx.stroke();
  // earrings
  ctx.fillStyle="#FFC531";[-1,1].forEach(d=>{ctx.beginPath();ctx.arc(d*36,-36,7,0,7);ctx.fill();ctx.stroke()});
  // crown (kirita)
  ctx.fillStyle="#FFC531";ctx.beginPath();ctx.moveTo(-32,-72);ctx.lineTo(-28,-104);ctx.lineTo(-14,-92);ctx.lineTo(0,-128);ctx.lineTo(14,-92);ctx.lineTo(28,-104);ctx.lineTo(32,-72);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#E2263F";ctx.beginPath();ctx.arc(0,-90,6,0,7);ctx.fill();ctx.stroke();ctx.fillStyle="#22A06B";[-18,18].forEach(dx=>{ctx.beginPath();ctx.arc(dx,-82,4,0,7);ctx.fill()});
  ctx.fillStyle="#C88F08";rrc(ctx,-34,-76,68,8,3);ctx.fill();ctx.stroke();
  // eyes and brows
  [-1,1].forEach(d=>{ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(d*13,-52,9,7,0,0,7);ctx.fill();ctx.stroke();
    ctx.fillStyle="#C88F08";ctx.beginPath();ctx.arc(d*13+Math.sin(G.t*.8)*1.5,-52,4,0,7);ctx.fill();ctx.fillStyle="#1B1530";ctx.beginPath();ctx.arc(d*13+Math.sin(G.t*.8)*1.5,-52,1.8,0,7);ctx.fill();
    ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(d*4,-63);ctx.quadraticCurveTo(d*14,-68,d*24,-62);ctx.stroke();ctx.lineWidth=3});
  ctx.fillStyle="#FF8FAE";ctx.beginPath();ctx.arc(0,-66,3,0,7);ctx.fill();
  // mouth (moves while speaking) and curled moustache
  const open=talk>0?Math.abs(Math.sin(G.t*14))*7:1.5;
  ctx.fillStyle="#3B1A2E";ctx.beginPath();ctx.ellipse(0,-26,9,open,0,0,7);ctx.fill();
  ctx.lineWidth=5;[-1,1].forEach(d=>{ctx.beginPath();ctx.moveTo(0,-34);ctx.quadraticCurveTo(d*16,-40,d*24,-30);ctx.quadraticCurveTo(d*28,-24,d*22,-24);ctx.stroke()});ctx.lineWidth=3;
  ctx.restore();
}
