// ---------- modelo ----------
function computeNets(n){
  const out=new Set();
  const rs=(typeof doc!=='undefined'&&doc&&Array.isArray(doc.redes)&&doc.redes.length)?doc.redes:(typeof DEFAULT_REDES==='function'?DEFAULT_REDES():[]);
  (n.ip||[]).forEach(ip=>{
    let hit=null;
    rs.forEach(r=>{ if(r.pre&&String(ip).indexOf(r.pre)===0&&(!hit||r.pre.length>hit.pre.length))hit=r; });
    if(hit)out.add(hit.n);
    else if(ip){ const otra=rs.filter(r=>!r.pre)[0]; if(otra)out.add(otra.n); else out.add('Otra'); }
  });
  return [...out];
}
function normalize(n){
  if(Array.isArray(n.perifs))n.perifs=perfList(n.perifs);
  if(Array.isArray(n.roles))n.roles=n.roles.map(String);
  if(Array.isArray(n.protocolos))n.protocolos=n.protocolos.map(String);
  n.ip = (n.ip||[]).filter(x=>x&&String(x).trim()).map(x=>String(x).trim());
  n.nets = computeNets(n);
  n.x = (typeof n.nx==='number')?n.nx:(n.x||0);
  n.y = (typeof n.ny==='number')?n.ny:(n.y||0);
  return n;
}
function hostOf(a,b){
  const A=byId[a],B=byId[b];
  const isSw=x=>!!x&&(x.tipo==='switch'||x.tipo==='router');
  if(isSw(A)&&isSw(B))return ((parseInt(A.puertos)||0)>=(parseInt(B.puertos)||0))?A:B;
  if(isSw(B)&&!isSw(A))return B;
  return A||B;
}
function nextFree(hostId){
  const u=new Set(doc.edges.filter(e=>e.h===hostId&&e.port).map(e=>e.port));
  let p=1; while(u.has(p))p++; return p;
}
function portSel(e,side){
  var id=(side==='s')?e.s:e.t, dev=byId[id];
  if(!dev)return '';
  var cap=capFor(id), cur=((side==='s')?e.pA:e.pB)||1;
  var ocup={};
  doc.edges.forEach(function(x){ if(x===e)return;
    if(x.s===id&&x.pA)ocup[x.pA]=1;
    if(x.t===id&&x.pB)ocup[x.pB]=1; });
  var ops='';
  for(var i=1;i<=cap;i++){ if(ocup[i]&&i!==cur)continue;
    ops+='<option value="'+i+'"'+(i===cur?' selected':'')+'>'+i+'</option>'; }
  return '<select id="e_p'+side+'" class="portsl">'+ops+'</select> '+
    '<span style="color:#7d93b3">'+escAttr(dev.nombre)+'</span>';
}
function capFor(id){
  var n=byId[id]; if(!n)return 8;
  var c=Math.max(parseInt(n.puertos)||0,(n.ports&&n.ports.length)||0);
  doc.edges.forEach(function(e){ if(e.s===id&&e.pA>c)c=e.pA; if(e.t===id&&e.pB>c)c=e.pB; });
  var base=(n.tipo==='switch'||n.tipo==='router'||n.tipo==='firewall')?8:2;
  return Math.max(base,c||0)+1;
}
function freePort(id,side,except){
  var used={};
  doc.edges.forEach(function(e){
    if(e===except)return;
    if(e.s===id&&e.pA)used[e.pA]=1;
    if(e.t===id&&e.pB)used[e.pB]=1;
  });
  var cap=capFor(id);
  for(var p=1;p<=cap;p++) if(!used[p]) return p;
  return cap+1;
}
function syncRackPort(e){
  if(!e.h||!byId[e.h])e.h=hostOf(e.s,e.t).id;
  e.port = (e.h===e.s)? (e.pA||1) : (e.pB||1);
}
function dedupePorts(){
  var seen={};
  function pick(id){
    var cap=capFor(id);
    for(var p=1;p<=cap+40;p++){ if(!seen[id+':'+p]) return p; }
    return cap+41;
  }
  doc.edges.forEach(function(e){
    var k1=e.s+':'+e.pA;
    if(seen[k1]){ e.pA=pick(e.s); k1=e.s+':'+e.pA; }
    seen[k1]=1;
    var k2=e.t+':'+e.pB;
    if(seen[k2]){ e.pB=pick(e.t); k2=e.t+':'+e.pB; }
    seen[k2]=1;
  });
  doc.edges.forEach(syncRackPort);
}
function ensureEdges(){
  doc.edges=doc.edges.filter(e=>byId[e.s]&&byId[e.t]&&e.s!==e.t);
  doc.edges.forEach(e=>{ if(!e.h||!byId[e.h])e.h=hostOf(e.s,e.t).id; e.port=parseInt(e.port)||0;
    if(typeof e.bx==='number'&&!Array.isArray(e.pts))e.pts=[[e.bx,e.by]]; });
  doc.edges.forEach(function(e){
    if(typeof e.pA!=='number'||typeof e.pB!=='number'){
      var pt=parseInt(e.port)||0;
      if(typeof e.pA!=='number') e.pA=(e.h===e.s&&pt)?pt:freePort(e.s,'s',e);
      if(typeof e.pB!=='number') e.pB=(e.h===e.t&&pt)?pt:freePort(e.t,'t',e);
    }
    syncRackPort(e);
  });
  dedupePorts(); dedupePorts();
  const used={};
  doc.edges.forEach(e=>{ if(e.port){(used[e.h]=used[e.h]||new Set()).add(e.port);} });
  doc.edges.forEach(e=>{ if(!e.port){const u=used[e.h]=used[e.h]||new Set();let p=1;while(u.has(p))p++;u.add(p);e.port=p;} });
}
function DEFAULT_REDES(){ return [
  {n:'Oficinas',pre:'192.168.41.',col:'#fbbf24'},
  {n:'Producci\u00f3n',pre:'192.168.4.',col:'#38bdf8'},
  {n:'Servidores',pre:'192.168.1.',col:'#a78bfa'},
  {n:'Otra',pre:'',col:'#94a3b8'}]; }
function netsList(){ return (doc.redes||DEFAULT_REDES()).map(function(r){return r.n;}); }
function netColOf(name){ var rs=doc.redes||DEFAULT_REDES(); for(var i=0;i<rs.length;i++){ if(rs[i].n===name)return rs[i].col; } return '#94a3b8'; }
function rebuild(){
  if(!Array.isArray(doc.redes)||!doc.redes.length)doc.redes=DEFAULT_REDES();
  if(Array.isArray(doc.zlock))doc.zlock=doc.zlock.filter(function(z){return typeof z==='string'&&z.indexOf('${')<0;});
  nodes=doc.nodes.map(normalize);
  byId={}; nodes.forEach(n=>byId[n.id]=n);
  ensureEdges();
  edges=doc.edges.filter(e=>byId[e.s]&&byId[e.t]&&e.s!==e.t);
  adj={}; nodes.forEach(n=>adj[n.id]=new Set());
  edges.forEach(e=>{adj[e.s].add(e.t);adj[e.t].add(e.s);});
  zonas=[...new Set(nodes.map(n=>n.zona).concat(doc.zonasExtra||[]))];
}
var PROJ={list:[],cur:null};
function idxLoad(){ try{ PROJ.list=JSON.parse(localStorage.getItem(IDXKEY)||'[]')||[]; }catch(e){ PROJ.list=[]; } }
function idxSave(){ try{ localStorage.setItem(IDXKEY,JSON.stringify(PROJ.list)); }catch(e){} }
function newId(){ return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function dkey(id){ return 'nmedit:doc:'+id; }
function projTouch(){
  if(!PROJ.cur){ PROJ.cur=newId(); }
  var it=PROJ.list.filter(function(x){return x.id===PROJ.cur;})[0];
  if(!it){ it={id:PROJ.cur,title:'Sin titulo',updated:Date.now()}; PROJ.list.push(it); }
  it.title=doc.title||'Sin titulo'; it.updated=Date.now(); idxSave();
}
function normDoc(d){
  d.colors=d.colors||{}; d.estyle=d.estyle||'curvo'; d.zpos=d.zpos||[];
  d.zparent=d.zparent||{}; d.zonasExtra=d.zonasExtra||[]; d.notes=d.notes||[]; d.arrows=d.arrows||[];
  d.title=d.title||DATA.titulo; d.sub=d.sub||DATA.sub; d.savedAt=d.savedAt||'';
  return d;
}
function loadDoc(){
  idxLoad();
  if(!PROJ.list.length){
    try{ var raw=localStorage.getItem(KEY);
      if(raw){ var d0=JSON.parse(raw);
        if(d0&&d0.nodes&&d0.nodes.length){ var id=newId();
          localStorage.setItem(dkey(id),raw);
          PROJ.list=[{id:id,title:d0.title||'Mi mapa',updated:Date.now()}]; idxSave(); } }
    }catch(e){}
  }
  var seed=null;
  var sd=document.getElementById('seed-data');
  if(sd){ var txt=(sd.textContent||'').trim();
    if(txt.length>2){ try{ seed=JSON.parse(txt); }catch(e){ seed=null; } } }
  var pick=null;
  if(PROJ.list.length){
    PROJ.list.sort(function(a,b){return (b.updated||0)-(a.updated||0);});
    PROJ.cur=PROJ.list[0].id;
    try{ var r=localStorage.getItem(dkey(PROJ.cur)); if(r)pick=JSON.parse(r); }catch(e){}
  }
  if(!pick&&seed&&seed.nodes&&seed.nodes.length)pick=seed;
  doc=normDoc(pick?pick:JSON.parse(JSON.stringify(FRESH)));
  if(!PROJ.cur && !(doc.nodes||[]).length){
    PROJ.cur=newId();
    if(!(doc.zonasExtra||[]).length)doc.zonasExtra=['Zona 1'];
    doc.title=doc.title||'Nuevo mapa de red';
    save();
  }
  rebuild();
}
function applyDoc(d){
  doc=normDoc(d);
  rebuild();
  if(typeof restoreLayout==='function')restoreLayout();
  layout(); rebuildUI(); render(); renderList(); showDetail();
  applyTitle();
}
function save(){ let ok=true; try{ if(typeof bakPush==='function')bakPush(false); }catch(e){}
  try{ if(!PROJ.cur)PROJ.cur=newId(); localStorage.setItem(dkey(PROJ.cur),JSON.stringify(doc)); }catch(e){ ok=false; }
  projTouch();
  const b=document.getElementById('dirty');
  if(b)b.textContent=ok?'guardado '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'usa \u22ef para descargar'; }
function snap(){ hist.push(JSON.stringify(doc)); if(hist.length>50)hist.shift(); markDirty(); }
function markDirty(){ const b=document.getElementById('dirty'); if(b)b.textContent='cambios sin exportar'; }
