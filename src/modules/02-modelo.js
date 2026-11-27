import { S } from './00-store.js';
import { DATA, FRESH, IDXKEY, KEY, bakPush } from './01-base.js';
import { applyTitle, layout, restoreLayout } from './03-layout.js';
import { col } from './04a-geometria.js';
import { render, renderList, select } from './04b-render-mapa.js';
import { escAttr, perfList, showDetail } from './04c-ficha-formularios.js';
import { rebuildUI } from './07-ui.js';
import { t } from './dom.js';
// ---------- modelo ----------
export function computeNets(n){
  const out=new Set();
  const rs=(typeof S.doc!=='undefined'&&S.doc&&Array.isArray(S.doc.redes)&&S.doc.redes.length)?S.doc.redes:(typeof DEFAULT_REDES==='function'?DEFAULT_REDES():[]);
  (n.ip||[]).forEach(ip=>{
    let hit=null;
    rs.forEach(r=>{ if(r.pre&&String(ip).indexOf(r.pre)===0&&(!hit||r.pre.length>hit.pre.length))hit=r; });
    if(hit)out.add(hit.n);
    else if(ip){ const otra=rs.filter(r=>!r.pre)[0]; if(otra)out.add(otra.n); else out.add('Otra'); }
  });
  return [...out];
}
export function normalize(n){
  if(Array.isArray(n.perifs))n.perifs=perfList(n.perifs);
  if(Array.isArray(n.roles))n.roles=n.roles.map(String);
  if(Array.isArray(n.protocolos))n.protocolos=n.protocolos.map(String);
  n.ip = (n.ip||[]).filter(x=>x&&String(x).trim()).map(x=>String(x).trim());
  n.nets = computeNets(n);
  n.x = (typeof n.nx==='number')?n.nx:(n.x||0);
  n.y = (typeof n.ny==='number')?n.ny:(n.y||0);
  return n;
}
export function hostOf(a,b){
  const A=S.byId[a],B=S.byId[b];
  const isSw=x=>!!x&&(x.tipo==='switch'||x.tipo==='router');
  if(isSw(A)&&isSw(B))return ((parseInt(A.puertos)||0)>=(parseInt(B.puertos)||0))?A:B;
  if(isSw(B)&&!isSw(A))return B;
  return A||B;
}
export function nextFree(hostId){
  const u=new Set(S.doc.edges.filter(e=>e.h===hostId&&e.port).map(e=>e.port));
  let p=1; while(u.has(p))p++; return p;
}
export function portSel(e,side){
  var id=(side==='s')?e.s:e.t, dev=S.byId[id];
  if(!dev)return '';
  var cap=capFor(id), cur=((side==='s')?e.pA:e.pB)||1;
  var ocup={};
  S.doc.edges.forEach(function(x){ if(x===e)return;
    if(x.s===id&&x.pA)ocup[x.pA]=1;
    if(x.t===id&&x.pB)ocup[x.pB]=1; });
  var ops='';
  for(var i=1;i<=cap;i++){ if(ocup[i]&&i!==cur)continue;
    ops+='<option value="'+i+'"'+(i===cur?' selected':'')+'>'+i+'</option>'; }
  return '<select id="e_p'+side+'" class="portsl">'+ops+'</select> '+
    '<span style="color:#7d93b3">'+escAttr(dev.nombre)+'</span>';
}
export function capFor(id){
  var n=S.byId[id]; if(!n)return 8;
  if(n.tipo==='patch') return Math.max(2,parseInt(n.puertos)||24);
  var c=Math.max(parseInt(n.puertos)||0,(n.ports&&n.ports.length)||0);
  S.doc.edges.forEach(function(e){ if(e.s===id&&e.pA>c)c=e.pA; if(e.t===id&&e.pB>c)c=e.pB; });
  if(!c) c=(n.tipo==='switch'||n.tipo==='router'||n.tipo==='firewall')?8:2;
  return c+1;
}
export function freePort(id,side,except){
  var used={};
  S.doc.edges.forEach(function(e){
    if(e===except)return;
    if(e.s===id&&e.pA)used[e.pA]=1;
    if(e.t===id&&e.pB)used[e.pB]=1;
  });
  var cap=capFor(id);
  for(var p=1;p<=cap;p++) if(!used[p]) return p;
  return cap+1;
}
export function syncRackPort(e){
  if(!e.h||!S.byId[e.h])e.h=hostOf(e.s,e.t).id;
  e.port = (e.h===e.s)? (e.pA||1) : (e.pB||1);
}
export function dedupePorts(){
  var seen={};
  function pick(id){
    var cap=capFor(id);
    for(var p=1;p<=cap+40;p++){ if(!seen[id+':'+p]) return p; }
    return cap+41;
  }
  // en un patch panel cada puerto puede tener dos cables (trasero = equipo, delantero = switch)
  function esPatch(id){ var n=S.byId[id]; return !!(n&&n.tipo==='patch'); }
  S.doc.edges.forEach(function(e){
    var k1=e.s+':'+e.pA;
    if(seen[k1]&&!esPatch(e.s)){ e.pA=pick(e.s); k1=e.s+':'+e.pA; }
    seen[k1]=1;
    var k2=e.t+':'+e.pB;
    if(seen[k2]&&!esPatch(e.t)){ e.pB=pick(e.t); k2=e.t+':'+e.pB; }
    seen[k2]=1;
  });
  S.doc.edges.forEach(syncRackPort);
}
// quita enlaces duplicados (mismos equipos y mismos puertos)
export function dedupeEdges(){
  var seen={}, out=[], drop=0;
  S.doc.edges.forEach(function(e){
    var k1=e.s+'|'+e.pA+'|'+e.t+'|'+e.pB, k2=e.t+'|'+e.pB+'|'+e.s+'|'+e.pA;
    var k=k1<k2?k1:k2;
    var prev=seen[k];
    if(prev){
      ['color','cat','etq','net','pts','bx','by'].forEach(function(f){ if(prev[f]===undefined&&e[f]!==undefined)prev[f]=e[f]; });
      drop++; return;
    }
    seen[k]=e; out.push(e);
  });
  if(drop)S.doc.edges=out;
  return drop;
}
export function ensureEdges(){
  S.doc.edges=S.doc.edges.filter(e=>S.byId[e.s]&&S.byId[e.t]&&e.s!==e.t);
  S.doc.edges.forEach(e=>{ if(!e.h||!S.byId[e.h])e.h=hostOf(e.s,e.t).id; e.port=parseInt(e.port)||0;
    if(typeof e.bx==='number'&&!Array.isArray(e.pts))e.pts=[[e.bx,e.by]]; });
  S.doc.edges.forEach(function(e){
    if(typeof e.pA!=='number'||typeof e.pB!=='number'){
      var pt=parseInt(e.port)||0;
      if(typeof e.pA!=='number') e.pA=(e.h===e.s&&pt)?pt:freePort(e.s,'s',e);
      if(typeof e.pB!=='number') e.pB=(e.h===e.t&&pt)?pt:freePort(e.t,'t',e);
    }
    syncRackPort(e);
  });
  dedupeEdges();
  dedupePorts(); dedupePorts();
  const used={};
  S.doc.edges.forEach(e=>{ if(e.port){(used[e.h]=used[e.h]||new Set()).add(e.port);} });
  S.doc.edges.forEach(e=>{ if(!e.port){const u=used[e.h]=used[e.h]||new Set();let p=1;while(u.has(p))p++;u.add(p);e.port=p;} });
}
export function DEFAULT_REDES(){ return [
  {n:'Oficinas',pre:'192.168.41.',col:'#fbbf24'},
  {n:'Producci\u00f3n',pre:'192.168.4.',col:'#38bdf8'},
  {n:'Servidores',pre:'192.168.1.',col:'#a78bfa'},
  {n:'Otra',pre:'',col:'#94a3b8'}]; }
export function netsList(){ return (S.doc.redes||DEFAULT_REDES()).map(function(r){return r.n;}); }
export function netColOf(name){ var rs=S.doc.redes||DEFAULT_REDES(); for(var i=0;i<rs.length;i++){ if(rs[i].n===name)return rs[i].col; } return '#94a3b8'; }
export function rebuild(){
  if(!Array.isArray(S.doc.redes)||!S.doc.redes.length)S.doc.redes=DEFAULT_REDES();
  if(Array.isArray(S.doc.zlock))S.doc.zlock=S.doc.zlock.filter(function(z){return typeof z==='string'&&z.indexOf('${')<0;});
  S.nodes=S.doc.nodes.map(normalize);
  S.byId={}; S.nodes.forEach(n=>S.byId[n.id]=n);
  ensureEdges();
  S.edges=S.doc.edges.filter(e=>S.byId[e.s]&&S.byId[e.t]&&e.s!==e.t);
  S.adj={}; S.nodes.forEach(n=>S.adj[n.id]=new Set());
  S.edges.forEach(e=>{S.adj[e.s].add(e.t);S.adj[e.t].add(e.s);});
  S.zonas=[...new Set(S.nodes.map(n=>n.zona).concat(S.doc.zonasExtra||[]))];
}
S.PROJ={list:[],cur:null};
export function idxLoad(){ try{ S.PROJ.list=JSON.parse(localStorage.getItem(IDXKEY)||'[]')||[]; }catch(e){ S.PROJ.list=[]; } }
export function idxSave(){ try{ localStorage.setItem(IDXKEY,JSON.stringify(S.PROJ.list)); }catch(e){} }
export function newId(){ return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
export function dkey(id){ return 'nmedit:doc:'+id; }
export function projTouch(){
  if(!S.PROJ.cur){ S.PROJ.cur=newId(); }
  var it=S.PROJ.list.filter(function(x){return x.id===S.PROJ.cur;})[0];
  if(!it){ it={id:S.PROJ.cur,title:'Sin titulo',updated:Date.now()}; S.PROJ.list.push(it); }
  it.title=S.doc.title||'Sin titulo'; it.updated=Date.now(); idxSave();
}
export function normDoc(d){
  d.colors=d.colors||{}; d.estyle=d.estyle||'curvo'; d.zpos=d.zpos||[];
  d.nodes=d.nodes||[]; d.edges=d.edges||[]; d.redes=d.redes||[]; d.racks=d.racks||[];
  d.zparent=d.zparent||{}; d.zonasExtra=d.zonasExtra||[]; d.notes=d.notes||[]; d.arrows=d.arrows||[];
  d.title=d.title||DATA.titulo||'Mapa de red'; d.sub=d.sub||DATA.sub||''; d.savedAt=d.savedAt||'';
  return d;
}
export function loadDoc(){
  idxLoad();
  if(!S.PROJ.list.length){
    try{ var raw=localStorage.getItem(KEY);
      if(raw){ var d0=JSON.parse(raw);
        if(d0&&d0.nodes&&d0.nodes.length){ var id=newId();
          localStorage.setItem(dkey(id),raw);
          S.PROJ.list=[{id:id,title:d0.title||'Mi mapa',updated:Date.now()}]; idxSave(); } }
    }catch(e){}
  }
  var seed=null;
  var sd=document.getElementById('seed-data');
  if(sd){ var txt=(sd.textContent||'').trim();
    if(txt.length>2){ try{ seed=JSON.parse(txt); }catch(e){ seed=null; } } }
  var pick=null;
  if(S.PROJ.list.length){
    S.PROJ.list.sort(function(a,b){return (b.updated||0)-(a.updated||0);});
    S.PROJ.cur=S.PROJ.list[0].id;
    try{ var r=localStorage.getItem(dkey(S.PROJ.cur)); if(r)pick=JSON.parse(r); }catch(e){}
  }
  if(!pick&&seed&&seed.nodes&&seed.nodes.length)pick=seed;
  S.doc=normDoc(pick?pick:JSON.parse(JSON.stringify(FRESH)));
  if(!S.PROJ.cur && !(S.doc.nodes||[]).length){
    S.PROJ.cur=newId();
    if(!(S.doc.zonasExtra||[]).length)S.doc.zonasExtra=['Zona 1'];
    S.doc.title=S.doc.title||'Nuevo mapa de red';
    save();
  }
  rebuild();
}
export function applyDoc(d){
  S.doc=normDoc(d);
  rebuild();
  if(typeof restoreLayout==='function')restoreLayout();
  layout(); rebuildUI(); render(); renderList(); showDetail();
  applyTitle();
}
export function save(){ let ok=true; try{ if(typeof bakPush==='function')bakPush(false); }catch(e){}
  try{ if(!S.PROJ.cur)S.PROJ.cur=newId(); localStorage.setItem(dkey(S.PROJ.cur),JSON.stringify(S.doc)); }catch(e){ ok=false; }
  projTouch();
  const b=document.getElementById('dirty');
  if(b)b.textContent=ok?'guardado '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'usa \u22ef para descargar'; }
export function snap(){ S.hist.push(JSON.stringify(S.doc)); if(S.hist.length>50)S.hist.shift(); markDirty(); }
export function markDirty(){ const b=document.getElementById('dirty'); if(b)b.textContent='cambios sin exportar'; }
