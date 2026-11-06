"use strict";
/* PeerJS networking. No sign-in; 4-letter room code. */

const NET=(()=>{
  let peer=null,conn=null,_role=null,_code="",_seed=0,_rival=null;

  function rndCode(){return "ABCDEFGHJKLMNPQRSTUVWXYZ".split("").sort(()=>Math.random()-.5).slice(0,4).join("")}
  function peerId(code,role){return"sr-"+code+"-"+(role==="host"?"h":"g")}

  function log(msg){const e=$("lbMsg");if(e)e.textContent=msg}
  function err(msg){const e=$("lbErr");if(e){e.textContent=msg;e.hidden=false}}
  function listPlayers(a){const e=$("lbList");if(!e)return;e.innerHTML=a.map(p=>`<li>${p}</li>`).join("")}

  function mkPeer(id){
    peer=new Peer(id,window.PEER_OPTS||{});
    peer.on("error",e=>err("Connection error: "+e.message));
    return peer;
  }

  function openLobby(){
    const ch=$("lbChoose"),rm=$("lbRoom"),eb=$("lbErr");
    if(ch)ch.hidden=false;if(rm)rm.hidden=true;if(eb){eb.hidden=true;eb.textContent=""}
    const lbStart=$("lbStart");
    if(lbStart){lbStart.disabled=true;lbStart.textContent="Waiting for friend…"}
    $("lbCreate").onclick=createRoom;
    $("lbJoin").onclick=()=>joinRoom($("lbCode").value.trim().toUpperCase().slice(0,4));
    $("lbCode").onkeydown=e=>{if(e.key==="Enter")joinRoom($("lbCode").value.trim().toUpperCase().slice(0,4))};
    $("lbBack").onclick=()=>{cleanup();showOnly("menu");buildWorlds()};
  }

  function createRoom(){
    _code=rndCode();_role="host";_seed=Math.floor(Math.random()*1e9);
    $("lbChoose").hidden=true;$("lbRoom").hidden=false;
    $("lbCodeBig").textContent=_code;
    log("Share this code with your friend!");
    listPlayers([myName()+" (you)"]);
    const lbStart=$("lbStart");lbStart.disabled=true;lbStart.textContent="Waiting…";
    const p=mkPeer(peerId(_code,"host"));
    p.on("open",()=>{log("Room ready. Share code: "+_code)});
    p.on("connection",c=>{
      conn=c;_rival={name:"Friend",kind:MYKIND==="rabbit"?"fox":"rabbit",host:false};
      c.on("open",()=>{
        c.send({t:"hello",name:myName(),kind:MYKIND});
        listPlayers([myName()+" (you)","Friend"]);
        lbStart.disabled=false;lbStart.textContent="▶ Start race!";
        log("Friend connected! Press Start.");
      });
      c.on("data",d=>{
        if(d.t==="hello"){_rival.name=d.name||"Friend";_rival.kind=d.kind==="rabbit"?"fox":"rabbit";listPlayers([myName()+" (you)",_rival.name]);lbStart.disabled=false;lbStart.textContent="▶ Start race!"}
        else if(d.t==="start"){}
        else onMsg(d);
      });
      c.on("close",()=>{if(G&&G.mode===3)rivalLeft()});
    });
    lbStart.onclick=()=>{
      if(conn&&conn.open)conn.send({t:"start",seed:_seed,wi:WI,rival:{name:myName(),kind:MYKIND,host:false}});
      $("lobby").hidden=true;
      _rival.host=true;
      startRace(3,_seed,_rival);
    };
  }

  function joinRoom(code){
    if(!code||code.length<4){err("Enter the 4-letter code");return}
    _code=code;_role="guest";
    $("lbChoose").hidden=true;$("lbRoom").hidden=false;
    $("lbCodeBig").textContent=_code;
    log("Connecting…");listPlayers([myName()+" (you)"]);
    $("lbStart").disabled=true;$("lbStart").textContent="Waiting for host…";
    const p=mkPeer(peerId(_code,"guest"));
    p.on("open",()=>{
      const c=p.connect(peerId(_code,"host"),{reliable:true});conn=c;
      c.on("open",()=>{c.send({t:"hello",name:myName(),kind:MYKIND});log("Connected! Waiting for host to start…")});
      c.on("data",d=>{
        if(d.t==="hello"){_rival={name:d.name,kind:d.kind==="rabbit"?"fox":"rabbit",host:false};listPlayers([myName()+" (you)",_rival.name])}
        else if(d.t==="start"){
          WI=d.wi||0;_seed=d.seed;_rival=d.rival||_rival;_rival.host=false;
          $("lobby").hidden=true;startRace(3,_seed,_rival);
        }else onMsg(d);
      });
      c.on("close",()=>{if(G&&G.mode===3)rivalLeft()});
    });
    p.on("error",e=>err("Can't connect. Check the code and try again. ("+e.message+")"));
  }

  function onMsg(d){
    if(!G||!G.lanes)return;
    const R=G.lanes[1];
    if(d.t==="st"){R.td=d.d;R.ty=d.y}
    else if(d.t==="atk"){applyAttack(d.w,R.name)}
    else if(d.t==="fin"){R.finished=true;R.finT=d.t}
  }
  function rivalLeft(){UI.toast("⚠️ "+((G.lanes[1]||{}).name||"Friend")+" disconnected – racing as bot");G.lanes[1].remote=false;G.lanes[1].bot=true}

  function cleanup(){if(peer){try{peer.destroy()}catch(e){}}peer=null;conn=null}

  let _lastSend=0;
  return{
    openLobby,
    send(type,data){
      if(!conn||!conn.open)return;
      try{conn.send(Object.assign({t:type},data))}catch(e){}
    },
    tick(){
      if(!G||!conn||!conn.open)return;
      const now=performance.now();
      if(now-_lastSend<80)return;_lastSend=now;
      const L=G.lanes[0];conn.send({t:"st",d:L.d,y:L.y});
      if(L.finished&&!G._sentFin){G._sentFin=true;conn.send({t:"fin",t:L.finT})}
    }
  };
})();
