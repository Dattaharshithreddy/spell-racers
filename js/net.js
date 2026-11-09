"use strict";
/* ============================================================
   Online races over WebRTC (PeerJS). No accounts: one phone creates
   a room with a 4-letter code, the other joins with it.
   ============================================================ */
const NET=(()=>{
  let peer=null,conn=null,_code="",_seed=0,_rival=null,_lastSend=0;
  const me=()=>({name:PROG.name||"Friend",runner:PROG.runner,trail:PROG.trail});
  const rndCode=()=>{const A="ABCDEFGHJKLMNPQRSTUVWXYZ";let s="";for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];return s};
  const peerId=(code,role)=>"spellracers-"+code+"-"+(role==="host"?"h":"g");
  const $n=id=>document.getElementById(id);
  const log=m=>{const e=$n("lbMsg");if(e)e.textContent=m};
  const err=m=>{const e=$n("lbErr");if(e){e.textContent=m;e.hidden=false}};
  function players(list){const e=$n("lbList");if(!e)return;e.innerHTML="";list.forEach(p=>{const li=document.createElement("li");const c=document.createElement("canvas");c.className="mini";li.appendChild(c);const s=document.createElement("span");s.textContent=p.name+(p.you?" (you)":"");li.appendChild(s);e.appendChild(li);requestAnimationFrame(()=>portrait(c,runnerById(p.runner),{head:true}))})}
  function mkPeer(id){
    if(typeof Peer==="undefined"){err("Online play needs an internet connection.");return null}
    peer=new Peer(id,window.PEER_OPTS||{});
    peer.on("error",e=>err(e.type==="peer-unavailable"?"No room with that code. Check it and try again.":e.type==="unavailable-id"?"That room code is taken. Try again.":"Connection problem: "+(e.message||e.type)));
    return peer;
  }
  function openLobby(){
    cleanup();
    $n("lbChoose").hidden=false;$n("lbRoom").hidden=true;$n("lbErr").hidden=true;
    $n("lbCreate").onclick=()=>{sfx("ui");createRoom()};
    const join=()=>{sfx("ui");joinRoom($n("lbCode").value.trim().toUpperCase().slice(0,4))};
    $n("lbJoin").onclick=join;$n("lbCode").onkeydown=e=>{if(e.key==="Enter")join()};
  }
  function wire(c,role){
    conn=c;
    c.on("data",d=>{
      if(d.t==="hello"){_rival={name:String(d.name||"Friend").slice(0,12),runner:d.runner,trail:d.trail};players([{...me(),you:true},_rival]);
        if(role==="host"){const b=$n("lbStart");b.disabled=false;b.textContent="Start the race";log("Your friend is here!");sfx("ready")}else log("Connected! Waiting for the host to start…")}
      else if(d.t==="start"){WI=d.wi||0;_seed=d.seed;UI.hideAll();startRace(3,_seed,{..._rival,host:false})}
      else onMsg(d);
    });
    c.on("open",()=>c.send({t:"hello",...me()}));
    c.on("close",()=>{if(G&&G.mode===3)rivalLeft();else{log("Your friend left the room.");const b=$n("lbStart");if(b){b.disabled=true;b.textContent="Waiting for your friend…"}}});
  }
  function createRoom(){
    _code=rndCode();_seed=Math.floor(Math.random()*1e9);
    $n("lbChoose").hidden=true;$n("lbRoom").hidden=false;$n("lbCodeBig").textContent=_code;
    log("Creating your room…");players([{...me(),you:true}]);
    const b=$n("lbStart");b.disabled=true;b.textContent="Waiting for your friend…";
    const p=mkPeer(peerId(_code,"host"));if(!p)return;
    p.on("open",()=>log("Share this code with your friend"));
    p.on("connection",c=>wire(c,"host"));
    b.onclick=()=>{if(!conn||!conn.open)return;sfx("go");conn.send({t:"start",seed:_seed,wi:WI});UI.hideAll();startRace(3,_seed,{..._rival,host:true})};
  }
  function joinRoom(code){
    if(!code||code.length<4){err("Type the 4-letter code from your friend's screen.");return}
    _code=code;$n("lbChoose").hidden=true;$n("lbRoom").hidden=false;$n("lbCodeBig").textContent=_code;
    log("Connecting…");players([{...me(),you:true}]);
    const b=$n("lbStart");b.disabled=true;b.textContent="Waiting for the host…";
    const p=mkPeer(peerId(_code,"guest")+"-"+Math.floor(Math.random()*1e4));if(!p)return;
    p.on("open",()=>wire(p.connect(peerId(_code,"host"),{reliable:true}),"guest"));
  }
  function onMsg(d){
    if(!G||!G.lanes||G.mode!==3)return;const R=G.lanes[1];if(!R)return;
    if(d.t==="st"){R.td=d.d;R.ty=d.y;R.tsl=d.sl;R.stun=d.st||0}
    else if(d.t==="atk")applyAttack(d.w,R.name);
    else if(d.t==="fin"){if(!R.finished){R.finished=true;R.finT=d.t;R.place=1+G.lanes.filter(o=>o!==R&&o.finished&&o.place).length}}
  }
  function rivalLeft(){if(!G||!G.lanes[1])return;UI.toast(`<span>⚠️</span><span>${G.lanes[1].name} left. A bot takes over.</span>`);const R=G.lanes[1];R.remote=false;R.bot=true;R.skill=.8}
  function cleanup(){if(peer){try{peer.destroy()}catch(e){}}peer=null;conn=null}
  return{
    openLobby,cleanup,
    send(type,data){if(conn&&conn.open)try{conn.send(Object.assign({t:type},data))}catch(e){}},
    tick(){
      if(!G||!conn||!conn.open)return;const now=performance.now();if(now-_lastSend<70)return;_lastSend=now;
      const L=G.lanes[0];conn.send({t:"st",d:L.d,y:L.y,sl:L.slide>0?1:0,st:L.stun});
    }
  };
})();
