"use strict";
/* ============================================================
   3D runner sprites — rendered in Blender by tools/blender/runners.py
   (sculpted bodies, particle fur, glossy eyes, fabric clothes).
   Each sheet is one row of 17 frames:
     0-3 idle (3 = blink) · 4-11 run cycle · 12 jump up · 13 jump down
     14 slide · 15 victory · 16 dizzy
   ============================================================ */
const SPRITE={fw:240,fh:300,ax:120,ay:284,unit:.47}; // unit = game units per sprite pixel
const SPR_IMG={};
function loadSprites(){
  fetch("img/runners/sheet.json").then(r=>r.ok?r.json():null).then(m=>{
    if(m){const a=Object.values(m)[0];if(a){SPRITE.fw=a.fw;SPRITE.fh=a.fh;SPRITE.ax=a.ax;SPRITE.ay=a.ay}}
  }).catch(()=>{}).finally(()=>{
    RUNNERS.forEach(r=>{const im=new Image();im.decoding="async";im.src="img/runners/"+r.id+".png";SPR_IMG[r.id]=im});
  });
}
loadSprites();
function spriteFrame(p){
  if(p.stun>0)return 16;
  if(p.win)return 15;
  if((p.slide||0)>.5)return 14;
  if(p.air)return p.vy>0?12:13;
  if(p.idle){const t=(p.t||0)%4;return t>3.82?3:Math.floor(t*1.2)%3}
  const c=((p.ph||0)/(Math.PI*2))%1;return 4+Math.floor((c<0?c+1:c)*8)%8;
}
/* draws a runner with feet at (0,0) in the current transform; returns false if the sheet isn't ready */
function drawSpriteRunner(c,R,pose){
  const im=SPR_IMG[R.id];if(!im||!im.complete||!im.naturalWidth)return false;
  const f=spriteFrame(pose),k=SPRITE.unit,S=SPRITE;
  c.drawImage(im,f*S.fw,0,S.fw,S.fh,-S.ax*k,-S.ay*k,S.fw*k,S.fh*k);
  return true;
}
