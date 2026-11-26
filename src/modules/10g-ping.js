import { S } from './00-store.js';
import { state } from './01-base.js';
import { applyT, col } from './04a-geometria.js';
import { render, v } from './04b-render-mapa.js';
import { escAttr, showDetail } from './04c-ficha-formularios.js';
import { svg, t, world } from './dom.js';
export function ipSub(ip){ var p=String(ip||'').split('.'); return p.length===4?p.slice(0,3).join('.'):null; }
export function isL2(id){ var n=S.byId[id]; return !!n&&(n.tipo==='switch'||n.tipo==='otro'||n.tipo==='wifi'); }
export function l2Path(a,b){
  var prev={}, seen={}; seen[a]=1;
  var q=[a];
  while(q.length){
    var cur=q.shift();
    var nbs=S.adj[cur]?Array.from(S.adj[cur]):[];
    for(var i=0;i<nbs.length;i++){
      var nb=nbs[i]; if(seen[nb])continue;
      if(nb!==b&&!isL2(nb))continue;
      seen[nb]=1; prev[nb]=cur;
      if(nb===b){ var path=[b],x=b; while(prev[x]!==undefined){x=prev[x];path.unshift(x);} return path; }
      q.push(nb);
    }
  }
  return null;
}
export function pingAnalyze(){
  var hosts=S.nodes.filter(function(n){return n.ip&&n.ip.length;});
  var devSub={}, subDev={};
  hosts.forEach(function(n){
    devSub[n.id]=[];
    n.ip.forEach(function(ip){
      var s=ipSub(ip); if(!s)return;
      if(devSub[n.id].indexOf(s)<0)devSub[n.id].push(s);
      (subDev[s]=subDev[s]||[]).push({id:n.id,ip:ip});
    });
  });
  var subs=Object.keys(subDev);
  var se={};
  S.nodes.forEach(function(n){
    var ss=devSub[n.id]||[];
    for(var i=0;i<ss.length;i++)for(var j=i+1;j<ss.length;j++){
      (se[ss[i]]=se[ss[i]]||[]).push([ss[j],n.id]);
      (se[ss[j]]=se[ss[j]]||[]).push([ss[i],n.id]);
    }
  });
  function l3Path(s1,s2){
    var prev={},seen={};seen[s1]=1;var q=[[s1,[]]];
    while(q.length){
      var cur=q.shift(), nod=cur[0], hops=cur[1];
      var nb=se[nod]||[];
      for(var i=0;i<nb.length;i++){
        var to=nb[i][0], via=nb[i][1];
        if(seen[to])continue;
        seen[to]=1; var hp=hops.concat([via]);
        if(to===s2)return hp;
        q.push([to,hp]);
      }
    }
    return null;
  }
  var ok=0, viaRouter=0, noCable=[], noRoute=[], okPairs=[];
  for(var i=0;i<hosts.length;i++)for(var j=i+1;j<hosts.length;j++){
    var A=hosts[i], B=hosts[j];
    var sa=devSub[A.id]||[], sb=devSub[B.id]||[];
    var shared=sa.filter(function(s){return sb.indexOf(s)>=0;});
    if(shared.length){
      var p=l2Path(A.id,B.id);
      if(p){ ok++; okPairs.push({a:A.id,b:B.id}); }
      else {
        var via=false;
        for(var x2=0;x2<sa.length&&!via;x2++)for(var y2=0;y2<sb.length&&!via;y2++){
          if(l3Path(sa[x2],sb[y2]))via=true;
        }
        if(via){ ok++; viaRouter++; okPairs.push({a:A.id,b:B.id}); }
        else {
          var ipa=(devSub[A.id]&&A.ip)||[], ipb=B.ip||[];
          noCable.push({a:A.id,b:B.id,sub:shared[0],
            ipa:(A.ip.filter(function(q){return ipSub(q)===shared[0];})[0])||A.ip[0],
            ipb:(B.ip.filter(function(q){return ipSub(q)===shared[0];})[0])||B.ip[0]});
        }
      }
    } else {
      var done=false, ruta=null;
      for(var x=0;x<sa.length&&!done;x++)for(var y=0;y<sb.length&&!done;y++){
        var r=l3Path(sa[x],sb[y]);
        if(r){done=true;ruta=r;}
      }
      if(done){ ok++; okPairs.push({a:A.id,b:B.id}); } else noRoute.push({a:A.id,b:B.id,s1:sa[0],s2:sb[0]});
    }
  }
  var noip=S.nodes.filter(function(n){return !(n.ip&&n.ip.length);}).length;
  return {hosts:hosts.length,subs:subs,subDev:subDev,ok:ok,okPairs:okPairs,viaRouter:viaRouter,noCable:noCable,noRoute:noRoute,noip:noip,
          pairs:hosts.length*(hosts.length-1)/2};
}
export function pingRun(){
  var r=pingAnalyze(); S.PINGRES=r;
  if(document.getElementById('p_heat').classList.contains('on')) pingHeat(true);
  var sum=document.getElementById('p_sum'), body=document.getElementById('p_body');
  var fails=r.noCable.length+r.noRoute.length;
  sum.innerHTML='<b style="color:#e8f1ff">'+r.hosts+'</b> equipos con IP en <b style="color:#e8f1ff">'+r.subs.length+
    '</b> subredes · <b style="color:#e8f1ff">'+r.pairs+'</b> pares probados · '+
    '<b style="color:#7ee0a6">'+r.ok+' responden</b> · '+
    '<b style="color:'+(fails?'#ff9a9a':'#7ee0a6')+'">'+fails+' fallos</b>'+
    (r.noip?' · <span style="color:#7d93b3">'+r.noip+' sin IP (no comprobables)</span>':'')+
    '<div style="margin-top:6px;color:#6b83a3;font-size:11.5px">Simulación sobre el mapa: mismo segmento = camino por switches; entre subredes = camino por routers/firewalls con IP en ambas.'+
    (r.viaRouter?' <span style="color:#9ad2ff">'+r.viaRouter+' pares sólo alcanzables vía router</span>.':'')+'</div>';
  function row(f,txt,col){
    var A=S.byId[f.a],B=S.byId[f.b];
    return '<div class="prowC" data-id="'+f.a+'" data-id2="'+f.b+'" style="cursor:pointer">'+
      '<b style="color:'+col+'">'+(txt||'\u2715')+'</b><span>'+escAttr(A?A.nombre:'?')+' \u2192 '+escAttr(B?B.nombre:'?')+
      '</span><i>'+escAttr(f.ipa||(A&&A.ip[0])||'')+' \u2192 '+escAttr(f.ipb||(B&&B.ip[0])||'')+'</i></div>';
  }
  var html='';
  if(!fails){ html+='<div class="empty" style="padding:14px 0">Todas las parejas con IP se ven entre s\u00ed.</div>'; }
  if(r.noCable.length){
    html+='<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ff9a9a;margin:8px 0 4px">Misma subred, sin cable</div>';
    r.noCable.slice(0,120).forEach(function(f){ html+=row(f,'sin cable','#ff9a9a'); });
  }
  if(r.noRoute.length){
    html+='<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ffc86b;margin:12px 0 4px">Sin ruta entre subredes</div>';
    r.noRoute.slice(0,120).forEach(function(f){ html+=row(f,f.s1+' \u2192 '+f.s2,'#ffc86b'); });
  }
  html+='<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7d93b3;margin:14px 0 4px">Subredes detectadas</div>';
  Object.keys(r.subDev).sort().forEach(function(s){
    var ds=r.subDev[s];
    html+='<div style="font-size:12px;color:#9db2d0;padding:3px 0"><b style="color:#dbe9ff">'+s+'.0/24</b> \u00b7 '+ds.length+' equipos: '+
      ds.slice(0,8).map(function(d){return escAttr((S.byId[d.id]||{}).nombre||'?');}).join(', ')+(ds.length>8?'\u2026':'')+'</div>';
  });
  body.innerHTML=html;
  Array.prototype.forEach.call(body.querySelectorAll('[data-id]'),function(el){
    el.onclick=function(){
      var a=el.dataset.id, b=el.dataset.id2;
      pingPulse(bfsPath(a,b),false);
      document.getElementById('pmodal').classList.remove('on');
      state.sel=a; state.selMulti=new Set([a,b]); render(); showDetail();
      if(S.byId[a]){ t.k=Math.max(0.7,Math.min(1.2,t.k)); t.x=-S.byId[a].x*t.k+svg.clientWidth/2; t.y=-S.byId[a].y*t.k+svg.clientHeight/2; applyT(); }
    };
  });
}

/* ---------- capa visual del ping ---------- */
S.PINGRES=null, S.PINGANIM=null;
export function pingLayer(){
  var g=document.getElementById('gPing');
  if(!g){ g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.id='gPing';
    var w=document.getElementById('world')||svg; w.appendChild(g); }
  return g;
}
export function bfsPath(a,b){
  if(a===b)return [a];
  var prev={}, seen={}, q=[a]; seen[a]=1;
  while(q.length){
    var cur=q.shift(), nbs=S.adj[cur]?Array.from(S.adj[cur]):[];
    for(var i=0;i<nbs.length;i++){
      var nb=nbs[i]; if(seen[nb])continue;
      seen[nb]=1; prev[nb]=cur;
      if(nb===b){ var path=[b],x=b; while(x!==a){x=prev[x];path.unshift(x);} return path; }
      q.push(nb);
    }
  }
  return null;
}
export function pingClear(){ var g=document.getElementById('gPing'); if(g)g.innerHTML=''; }
export function pingHalo(id,col,r,op){
  var n=S.byId[id]; if(!n)return;
  var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('cx',n.x); c.setAttribute('cy',n.y); c.setAttribute('r',r||26);
  c.setAttribute('fill',col); c.setAttribute('opacity',op||.28);
  c.setAttribute('class','halo');
  pingLayer().appendChild(c);
}
export function pingHeat(show){
  var g=document.getElementById('gPing'); if(g)g.querySelectorAll('.halo').forEach(function(x){x.remove();});
  if(!show||!S.PINGRES)return;
  var cnt={};
  S.PINGRES.noCable.concat(S.PINGRES.noRoute).forEach(function(f){ cnt[f.a]=(cnt[f.a]||0)+1; cnt[f.b]=(cnt[f.b]||0)+1; });
  S.nodes.forEach(function(n){
    var k=cnt[n.id]||0; if(!k)return;
    var op=Math.min(.62,.10+k/Math.max(4,S.PINGRES.hosts)*1.5);
    pingHalo(n.id,'#ff6b6b',24+k*0.5,op);
  });
  S.nodes.forEach(function(n){ if(n.ip&&n.ip.length&&!cnt[n.id]) pingHalo(n.id,'#4be08a',22,.16); });
  pingLayer().classList.add('on');
}
export function pingPulse(path,ok,cb,speed){
  if(!path||path.length<2){ if(cb)cb(); return null; }
  var pts=path.map(function(id){var n=S.byId[id];return n?[n.x,n.y]:null;}).filter(Boolean);
  if(pts.length<2){ if(cb)cb(); return null; }
  var segs=[],total=0;
  for(var i=1;i<pts.length;i++){var d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])||0.01;segs.push(d);total+=d;}
  var glow=document.createElementNS('http://www.w3.org/2000/svg','circle');
  glow.setAttribute('r','19'); glow.setAttribute('fill',ok?'#5ce89a':'#ff6b6b');
  glow.setAttribute('opacity','.22'); pingLayer().appendChild(glow);
  var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('r','9'); c.setAttribute('fill',ok?'#5ce89a':'#ff6b6b');
  c.setAttribute('stroke','#08111e'); c.setAttribute('stroke-width','1.6');
  pingLayer().appendChild(c);
  var t0=performance.now(), dur=Math.min(1250,Math.max(380,(speed||1.6)*total));
  function step(now){
    if(!c.parentNode)return;
    var k=Math.min(1,(now-t0)/dur), d=k*total, i=0, acc=0;
    while(i<segs.length-1&&acc+segs[i]<d){acc+=segs[i];i++;}
    var r=Math.min(1,(d-acc)/(segs[i]||1));
    var p1=pts[Math.min(i,pts.length-2)], p2=pts[Math.min(i+1,pts.length-1)];
    var px=p1[0]+(p2[0]-p1[0])*r, py=p1[1]+(p2[1]-p1[1])*r;
    c.setAttribute('cx',px); c.setAttribute('cy',py);
    glow.setAttribute('cx',px); glow.setAttribute('cy',py);
    if(k<1){ S.PINGANIM=requestAnimationFrame(step); }
    else{
      var last=c, lastG=glow; setTimeout(function(){ if(last.parentNode)last.remove(); if(lastG.parentNode)lastG.remove(); },160);
      if(cb)setTimeout(cb,90);
    }
  }
  S.PINGANIM=requestAnimationFrame(step);
  return c;
}
export function pingAnimPair(f,ok){
  var p=bfsPath(f.a,f.b);
  pingPulse(p,ok);
}
export function pingFailAt(id){
  var n=S.byId[id]; if(!n)return;
  var t=document.createElementNS('http://www.w3.org/2000/svg','text');
  t.setAttribute('x',n.x+14); t.setAttribute('y',n.y-12);
  t.setAttribute('fill','#ff6b6b'); t.setAttribute('font-size','15'); t.setAttribute('font-weight','700');
  t.setAttribute('class','pingx'); t.textContent='\u2715';
  pingLayer().appendChild(t);
  setTimeout(function(){ if(t.parentNode)t.remove(); },2600);
}
export function nearestNb(from,to){
  var A=S.byId[from],B=S.byId[to]; if(!A||!B)return null;
  var nb=S.adj[from]?Array.from(S.adj[from]):[]; var best=null,bd=1e18;
  nb.forEach(function(id){
    var n=S.byId[id]; if(!n)return;
    var d=Math.hypot(n.x-B.x,n.y-B.y);
    if(d<bd){bd=d;best=id;}
  });
  return best;
}
export function pingAnimAll(){
  if(!S.PINGRES)pingRun();
  var greens=S.PINGRES.okPairs.map(function(f){return {f:f,p:bfsPath(f.a,f.b)};})
    .filter(function(x){return x.p&&x.p.length>1;}).slice(0,12);
  var reds=S.PINGRES.noCable.slice(0,8).map(function(f){
    var nb=nearestNb(f.a,f.b);
    return {f:f,p:nb?[f.a,nb]:null};
  });
  var list=greens.map(function(x){return {p:x.p,ok:true,last:x.p[x.p.length-1]};})
    .concat(reds.map(function(x){return {p:x.p,ok:false,last:x.p?x.p[x.p.length-1]:x.f.a};}));
  if(!list.length)return;
  var i=0;
  (function next(){
    if(i>=list.length)return;
    var it=list[i++];
    pingPulse(it.p,it.ok,function(){ if(!it.ok)pingFailAt(it.last); setTimeout(next,260); },0.72);
  })();
}
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ var g=document.getElementById('gPing'); if(g){g.innerHTML='';} } });

document.getElementById('bPing').onclick=function(){ document.getElementById('pmodal').classList.add('on'); pingRun(); };
document.getElementById('p_run').onclick=pingRun;
document.getElementById('p_heat').onclick=function(){
  var on=!this.classList.contains('on');
  this.classList.toggle('on',on);
  if(on&&!S.PINGRES)pingRun();
  pingHeat(on);
};
document.getElementById('p_anim').onclick=function(){
  this.classList.add('on');
  var m=document.getElementById('pmodal'); if(m)m.classList.remove('on');
  pingAnimAll();
};
document.getElementById('p_stop').onclick=function(){
  try{ cancelAnimationFrame(S.PINGANIM); }catch(e){}
  pingClear();
  document.getElementById('p_heat').classList.remove('on');
  document.getElementById('p_anim').classList.remove('on');
};
document.getElementById('p_close').onclick=function(){ document.getElementById('pmodal').classList.remove('on'); };
