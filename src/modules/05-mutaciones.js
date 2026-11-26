import { S } from './00-store.js';
import { TYPE, state } from './01-base.js';
import { freePort, hostOf, nextFree, rebuild, save, snap } from './02-modelo.js';
import { ZBOX, applyTitle, layout, restoreLayout } from './03-layout.js';
import { sn } from './04a-geometria.js';
import { centerOn, render, renderList } from './04b-render-mapa.js';
import { bindPorts, escAttr, nicsFill, nicsRead, readFields, readPorts, renderMExtra, showDetail } from './04c-ficha-formularios.js';
import { rebuildUI, syncEdit } from './07-ui.js';
import { t } from './dom.js';
// ---------- mutaciones ----------
export const IPRE=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
export function saveEdit(id){
  const g=x=>{const e=document.getElementById(x);return e?e.value.trim():'';};
  const ips=g('e_ip').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
  let bad=false;
  ips.forEach(ip=>{ const m=IPRE.exec(ip);
    if(!m||m.slice(1).some(o=>+o>255)){bad=true;} });
  const el=document.getElementById('e_ip');
  if(bad){ el.classList.add('bad'); el.focus(); return; } else el.classList.remove('bad');
  if(!g('e_nombre')){ document.getElementById('e_nombre').focus(); return; }
  snap();
  const n=S.byId[id];
  const tipo=g('e_tipo');
  Object.assign(n,{nombre:g('e_nombre'),tipo,zona:(function(){var s=document.getElementById('e_zona');var nv=document.getElementById('e_zona_new');return (s&&s.value==='__nueva__')?((nv&&nv.value.trim())||'Sin zona'):((s&&s.value)||'Sin zona');})(),
    ip:ips,mac:g('e_mac'),modelo:g('e_modelo'),ubic:g('e_ubic'),notas:g('e_notas')},
    readFields('e',tipo));
  const ic=document.getElementById('e_ico'); if(ic){ if(ic.value)n.ico=ic.value; else delete n.ico; }
  const _u=document.getElementById('e_u'); if(_u){ var uv=parseInt(_u.value); if(uv>0)n.u=uv; else delete n.u; }
  const pr=readPorts('e'); if(pr){n.ports=pr;n.puertos=String(pr.length);}
  const nics=nicsRead('e_nics'); if(nics.length)n.nics=nics; else delete n.nics;
  save(); rebuild(); rebuildUI();
  if(S.nodes.some(x=>!ZBOX.find(b=>b.z===x.zona)))layout();
  render(); renderList(); showDetail();
}
export function openModal(zona){
  const tsel=document.getElementById('m_tipo');
  tsel.innerHTML=Object.keys(TYPE).map(k=>`<option value="${k}">${TYPE[k][1]}</option>`).join('');
  var _sel=document.getElementById('m_zona');
  var _zz=S.zonas.slice().sort(function(a,b){return a.localeCompare(b,'es');});
  _sel.innerHTML=_zz.map(function(z){return '<option value="'+escAttr(z)+'">'+escAttr(z)+'</option>';}).join('')+'<option value="Sin zona">\u2014 Sin zona \u2014</option><option value="__nueva__">\u002b Crear zona nueva\u2026</option>';
  nicsFill('m_nics',[{k:'virtual',m:'bridge'}]);
  var _want=zona||'';
  if(_want&&_zz.indexOf(_want)>=0){ _sel.value=_want; document.getElementById('m_znueva').value=''; }
  else if(_want&&_want!=='Sin zona'){ _sel.value='__nueva__'; document.getElementById('m_znueva').value=_want; }
  var _ni=document.getElementById('m_znueva');
  _ni.style.display=(_sel.value==='__nueva__')?'':'none';
  _sel.onchange=function(){ _ni.style.display=(_sel.value==='__nueva__')?'':'none'; if(_sel.value==='__nueva__')_ni.focus(); };
  ['m_ip','m_mac','m_modelo','m_ubic','m_notas'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m_nombre').value='Nuevo equipo';
  document.getElementById('m_zona').value=zona||'Sin zona';
  document.getElementById('m_tipo').onchange=renderMExtra;
  renderMExtra();
  bindPorts('m');
  document.getElementById('modal').classList.add('on');
  setTimeout(()=>{const el=document.getElementById('m_nombre'); el.focus(); if(el.select)el.select();},40);
}
export function closeModal(){document.getElementById('modal').classList.remove('on');}
export function createFromModal(){
  const g=id=>document.getElementById(id).value.trim();
  const nombre=g('m_nombre')||'Nuevo equipo';
  const ips=g('m_ip').split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean).filter(s=>IPRE.test(s));
  var _zs=document.getElementById('m_zona');
  let zona=(_zs&&_zs.value==='__nueva__')?((document.getElementById('m_znueva').value||'').trim()||'Sin zona'):((_zs&&_zs.value)||'Sin zona');
  const box=ZBOX.find(b=>b.z===zona);
  const tipo=document.getElementById('m_tipo').value||'pc';
  const n={id:'n'+Date.now().toString(36),nombre,tipo,zona,
    ip:ips,mac:g('m_mac'),modelo:g('m_modelo'),ubic:g('m_ubic'),notas:g('m_notas'),
    red:'',detalle:'', nx:box?box.x+box.w/2:0, ny:box?box.y+box.h/2:0};
  Object.assign(n,readFields('m',tipo));
  const prm=readPorts('m'); if(prm){n.ports=prm;n.puertos=String(prm.length);}
  if(tipo==='patch'&&!parseInt(n.puertos)){ n.puertos='24'; }
  const nicsm=nicsRead('m_nics'); if(nicsm.length)n.nics=nicsm;
  snap(); S.doc.nodes.push(n); save(); rebuild();
  if(!ZBOX.find(b=>b.z===zona))layout();
  rebuildUI(); state.sel=n.id; state.esel=null;
  if(!state.edit){state.edit=true;syncEdit();}
  closeModal(); render(); renderList(); showDetail(); centerOn(S.byId[n.id]);
}
export function addNode(){ openModal(state.zona||S.zonas[0]||'Sin zona'); }
export function delNode(id){
  const n=S.byId[id]; if(!n)return;
  if(!confirm('¿Eliminar «'+n.nombre+'» del mapa?'))return;
  snap();
  S.doc.nodes=S.doc.nodes.filter(x=>x.id!==id);
  S.doc.edges=S.doc.edges.filter(e=>e.s!==id&&e.t!==id);
  if(state.sel===id)state.sel=null;
  save(); rebuild(); rebuildUI(); render(); renderList(); showDetail();
}
export function addLink(a,b){
  if(!a||!b||a===b||!S.byId[a]||!S.byId[b])return;
  if(S.doc.edges.some(e=>(e.s===a&&e.t===b)||(e.s===b&&e.t===a)))return;
  const hs=hostOf(a,b);
  snap(); S.doc.edges.push({s:a,t:b,h:hs.id,port:nextFree(hs.id),pA:freePort(a,'s'),pB:freePort(b,'t')});
  save(); rebuild(); render(); renderList(); showDetail();
}
export function delLink(s,t){
  snap(); S.doc.edges=S.doc.edges.filter(e=>!((e.s===s&&e.t===t)||(e.s===t&&e.t===s)));
  save(); rebuild(); render(); renderList(); showDetail();
}
export function undo(){
  if(!S.hist.length)return;
  S.doc=JSON.parse(S.hist.pop());
  rebuild();
  if(typeof restoreLayout==='function'&&restoreLayout()){ /* conserva posiciones guardadas */ }
  else layout();
  applyTitle(); rebuildUI(); render(); renderList(); showDetail(); save();
  const b=document.getElementById('dirty'); if(b)b.textContent='deshecho ('+S.hist.length+')';
}

// ---------- alinear / distribuir la selección ----------
export function msList(){ return Array.from(state.msel).map(function(k){return S.byId[k];}).filter(Boolean); }
export function updateMsbar(){
  var bar=document.getElementById('msbar'); if(!bar)return;
  var n=state.msel.size;
  bar.classList.toggle('on', n>1 && state.view!=='rack');
  var c=bar.querySelector('.msc'); if(c)c.textContent=n+' equipos';
}
export function alignSel(kind){
  var L=msList(); if(L.length<2)return;
  snap();
  if(kind==='l'){ var x=Math.min.apply(null,L.map(function(n){return n.x;})); L.forEach(function(n){n.x=x;n.nx=x;}); }
  else if(kind==='r'){ var x2=Math.max.apply(null,L.map(function(n){return n.x;})); L.forEach(function(n){n.x=x2;n.nx=x2;}); }
  else if(kind==='cx'){ var xs=L.map(function(n){return n.x;}); var mx=(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2;
    L.forEach(function(n){n.x=sn(mx);n.nx=n.x;}); }
  else if(kind==='t'){ var y=Math.min.apply(null,L.map(function(n){return n.y;})); L.forEach(function(n){n.y=y;n.ny=y;}); }
  else if(kind==='b'){ var y2=Math.max.apply(null,L.map(function(n){return n.y;})); L.forEach(function(n){n.y=y2;n.ny=y2;}); }
  else if(kind==='cy'){ var ys=L.map(function(n){return n.y;}); var my=(Math.min.apply(null,ys)+Math.max.apply(null,ys))/2;
    L.forEach(function(n){n.y=sn(my);n.ny=n.y;}); }
  else if(kind==='dh'){
    L.sort(function(a,b){return a.x-b.x;});
    var x0=L[0].x, x1=L[L.length-1].x, paso=(x1-x0)/(L.length-1);
    L.forEach(function(n,i){ n.x=sn(x0+paso*i); n.nx=n.x; });
  }
  else if(kind==='dv'){
    L.sort(function(a,b){return a.y-b.y;});
    var y0=L[0].y, y1=L[L.length-1].y, paso2=(y1-y0)/(L.length-1);
    L.forEach(function(n,i){ n.y=sn(y0+paso2*i); n.ny=n.y; });
  }
  save(); render();
}
document.addEventListener('click',function(ev){
  var b=ev.target.closest && ev.target.closest('#msbar [data-al]');
  if(!b)return;
  var k=b.getAttribute('data-al');
  if(k==='q'){ state.msel.clear(); render(); return; }
  alignSel(k);
});
