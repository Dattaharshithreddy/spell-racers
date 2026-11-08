"use strict";
/* Judy & Nick sprite sheets — 3D models rendered in Blender (see tools/blender/chars.py).
   Each sheet is one row of 10 frames: idle, jump, run0..run7.
   ax/ay = pixel position of the character's feet inside a frame. */
const SPR={
  rabbit:{src:"img/judy.png",fw:127,fh:328,ax:56,ay:322},
  fox:{src:"img/nick.png",fw:153,fh:278,ax:77,ay:272}
};
const SPR_SCALE=.3; // game units per rendered pixel (same for both, so Judy stays smaller than Nick)
for(const k in SPR){const s=SPR[k];s.img=new Image();s.img.src=s.src}

/* frame: 0 idle, 1 jump, 2..9 run cycle */
function sprFrame(ph,air,idle){
  if(air)return 1;
  if(idle)return 0;
  const t=((ph/(Math.PI*2))%1+1)%1;
  return 2+Math.floor(t*8)%8;
}
/* Returns false if the sheet isn't loaded yet, so the caller can fall back to the canvas drawing. */
function drawSprite(kind,x,y,u,sc,ph,air,idle){
  const s=SPR[kind];if(!s||!s.img.complete||!s.img.naturalWidth)return false;
  const f=sprFrame(ph,air,idle),k=SPR_SCALE*u*(sc||1);
  ctx.drawImage(s.img,f*s.fw,0,s.fw,s.fh,x-s.ax*k,y-s.ay*k,s.fw*k,s.fh*k);
  return true;
}
