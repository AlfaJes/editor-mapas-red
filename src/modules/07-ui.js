import { S } from './00-store.js';
import { FRESH, KEY, TYPE, state } from './01-base.js';
import { rebuild, save, snap } from './02-modelo.js';
import { ZBOX, layout, restoreLayout } from './03-layout.js';
import { C, applyT, fit } from './04a-geometria.js';
import { render, renderList, v } from './04b-render-mapa.js';
import { addrRowHTML, nicsHTML, showDetail } from './04c-ficha-formularios.js';
import { addNode, closeModal, createFromModal, undo } from './05-mutaciones.js';
import { renderNets } from './10a-ruta-revision.js';
import { t } from './dom.js';
// ---------- UI ----------
export function setBtn(id,on){const b=document.getElementById(id);if(b)b.classList.toggle('on',!!on);}
export function syncEdit(){document.body.classList.toggle('editing',state.edit);
  setBtn('bEdit',state.edit);
  document.getElementById('bAdd').style.display=state.edit?'':'none';
  document.getElementById('bNote').style.display=state.edit?'':'none';
  var _ba=document.getElementById('bArrow'); if(_ba)_ba.style.display=state.edit?'':'none';
  document.getElementById('bLink').style.display=state.edit?'':'none';
  document.getElementById('bUndo').style.display=state.edit?'':'none';}
export function rebuildUI(){
  const fT=document.getElementById('fTypes');
  fT.innerHTML=Object.entries(TYPE).map(([k,[c,l]])=>{
    const cnt=S.nodes.filter(x=>x.tipo===k).length; if(!cnt)return '';
    const on=state.types.has(k);
    return `<span class="tchip${on?' on':''}" data-k="${k}" style="${on?`background:${c}26;border-color:${c}66;color:${c}`:''}">${l} ${cnt}</span>`;}).join('');
  fT.querySelectorAll('.tchip').forEach(el=>el.onclick=()=>{
    const k=el.dataset.k,c=(TYPE[k]||['#94a3b8'])[0];
    if(state.types.has(k)){state.types.delete(k);el.classList.remove('on');
      el.style.background='#0d1626';el.style.borderColor='#22314b';el.style.color='#8ba0bd';}
    else{state.types.add(k);el.classList.add('on');el.style.background=c+'26';el.style.borderColor=c+'66';el.style.color=c;}
    render();renderList();});
  const sz=document.getElementById('fZona'),sr=document.getElementById('fRed');
  sz.innerHTML='<option value="">Todas las S.zonas</option>'+S.zonas.map(z=>`<option${z===state.zona?' selected':''}>${z}</option>`).join('');
  sr.innerHTML='<option value="">Todas las redes</option>'+
    ['Oficinas','Producción','Servidores','Otra'].map(r=>`<option value="${r}"${state.red===r?' selected':''}>${r}</option>`).join('')+
    `<option value="sin"${state.red==='sin'?' selected':''}>Sin IP asignada</option>`;
  const LG=document.getElementById('legend');
  if(LG){
    renderNets();
    LG.innerHTML=Object.keys(TYPE).map(k=>
      `<span class="lg"><input type="color" data-k="${k}" value="${C(k)}" title="${TYPE[k][1]}"><span>${TYPE[k][1]}</span></span>`).join('');
    LG.querySelectorAll('input[type=color]').forEach(inp=>{
      inp.oninput=ev=>{S.doc.colors[ev.target.dataset.k]=ev.target.value;save();render();};});
  }
  document.getElementById('total').textContent=S.nodes.length;
  document.getElementById('nEdges').textContent=S.edges.length;
  document.getElementById('nZonas').textContent=ZBOX.length||S.zonas.length;
}
document.getElementById('fZona').onchange=e=>{state.zona=e.target.value;render();renderList();};
document.getElementById('fRed').onchange=e=>{state.red=e.target.value;render();renderList();};
document.getElementById('q').oninput=e=>{state.q=e.target.value;render();renderList();};
document.getElementById('bLabels').onclick=e=>{state.labels=!state.labels;e.target.classList.toggle('on',state.labels);render();};
document.getElementById('bIp').onclick=e=>{state.showIp=!state.showIp;e.target.classList.toggle('on',state.showIp);render();};
document.getElementById('bEdges').onclick=e=>{state.edges=!state.edges;e.target.classList.toggle('on',state.edges);render();};
document.getElementById('bHull').onclick=e=>{state.hulls=!state.hulls;e.target.classList.toggle('on',state.hulls);render();};
document.addEventListener('click',function(ev){
  var t=ev.target;
  if(t&&(t.id==='e_nicadd'||t.id==='m_nicadd')){
    var box=document.getElementById(t.id==='e_nicadd'?'e_nics':'m_nics');
    if(box){ var d=document.createElement('div'); d.innerHTML=nicsHTML([{k:'virtual',m:'bridge'}]); box.appendChild(d.firstChild); }
    return;
  }
  if(t&&t.classList&&t.classList.contains('nc-del')){
    var row=t.closest('.nicrow'); var bx=row&&row.parentNode;
    if(row&&bx){
      // las IPs del adaptador se quitan tambien de la lista del equipo
      var ips=Array.prototype.map.call(row.querySelectorAll('.na-ip'),function(i){return String(i.value||'').trim();}).filter(Boolean);
      if(ips.length){
        var bi=document.getElementById('e_ip')||document.getElementById('m_ip');
        if(bi){ bi.value=String(bi.value||'').split(/\n|,/).map(function(s){return s.trim();})
          .filter(function(s){return s&&ips.indexOf(s)<0;}).join('\n'); }
      }
      row.remove();
      if(!bx.querySelector('.nicrow')) bx.innerHTML=nicsHTML([{k:'virtual',m:'bridge'}]);
    }
    return;
  }
  if(t&&t.classList&&t.classList.contains('pcell')&&t.classList.contains('on')){
    var ds=t.getAttribute('data-sel')||'';
    var parts=ds.split('|');
    if(parts.length===2&&parts[0]&&parts[1]){
      state.esel={s:parts[0],t:parts[1]}; state.sel=null;
      render(); renderList(); showDetail();
    }
    return;
  }
  if(t&&t.classList&&t.classList.contains('na-add')){
    var c=t.closest('.nicrow'); var box2=c&&c.querySelector('.naddrs');
    if(box2){ var d2=document.createElement('div'); d2.innerHTML=addrRowHTML({}); box2.appendChild(d2.firstElementChild); }
    return;
  }
  if(t&&t.classList&&t.classList.contains('na-del')){
    var ar=t.closest('.naddr'); var nb=ar&&ar.parentNode;
    if(ar&&nb){
      // quitar la IP tambien de la lista "DIRECCIONES IP" del equipo
      var ipEl=ar.querySelector('.na-ip'), ipv=ipEl?String(ipEl.value||'').trim():'';
      if(ipv){
        var boxIP=document.getElementById('e_ip')||document.getElementById('m_ip');
        if(boxIP){
          boxIP.value=String(boxIP.value||'').split(/\n|,/).map(function(s){return s.trim();})
            .filter(function(s){return s&&s!==ipv;}).join('\n');
        }
      }
      ar.remove();
      if(!nb.querySelector('.naddr')){ var d3=document.createElement('div'); d3.innerHTML=addrRowHTML({}); nb.appendChild(d3.firstElementChild); }
    }
    return;
  }
});
document.getElementById('m_ok').onclick=createFromModal;
document.getElementById('m_cancel').onclick=closeModal;
document.getElementById('modal').onclick=e=>{if(e.target.id==='modal')closeModal();};
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeModal();});
document.getElementById('cpick').oninput=e=>{
  const k=e.target.dataset.k; if(!k)return;
  S.doc.colors[k]=e.target.value; save(); render(); rebuildUI();};
document.getElementById('bEdge').onclick=()=>{
  const seq=['curvo','recto','orto'];
  S.doc.estyle=seq[(seq.indexOf(S.doc.estyle||'curvo')+1)%3];
  if(S.doc.estyle==='recto')S.doc.edges.forEach(x=>{delete x.bx;delete x.by;});
  save(); render();
  document.getElementById('bEdge').textContent=(S.doc.estyle==='orto'?'Ortogonal':(S.doc.estyle==='recto'?'Recto':'Curvo'));};
document.getElementById('bFit').onclick=()=>{fit();};
document.getElementById('bEdit').onclick=()=>{state.edit=!state.edit;syncEdit();showDetail();render();};
document.getElementById('bAdd').onclick=addNode;
document.getElementById('bUndo').onclick=undo;
document.getElementById('bLink').onclick=()=>{
  state.linkMode=!state.linkMode; state.pending=null; setBtn('bLink',state.linkMode); render();};
document.getElementById('bSave').onclick=()=>{
  S.doc.view={k:t.k,x:t.x,y:t.y};
  S.doc.zpos=JSON.parse(JSON.stringify(ZBOX));
  S.nodes.forEach(function(n){n.nx=n.x;n.ny=n.y;});
  const blob=new Blob([JSON.stringify(S.doc,null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='mapa_red_levante.json';a.click();
  document.getElementById('dirty').textContent='exportado';};
document.getElementById('bOpen').onclick=()=>document.getElementById('fFile').click();
export function importDoc(d){
  if(!d||!d.nodes||!Array.isArray(d.nodes))throw new Error('formato');
  snap();
  S.doc=d;
  S.doc.zonasExtra=S.doc.zonasExtra||[]; S.doc.zpos=S.doc.zpos||[];
  S.doc.notes=S.doc.notes||[]; S.doc.arrows=S.doc.arrows||[]; S.doc.zparent=S.doc.zparent||{};
  save(); rebuild();
  ZBOX.length=0;
  var okPos=restoreLayout();
  if(!okPos)layout();
  if(d.view&&typeof d.view.k==='number'){ t.k=d.view.k; t.x=d.view.x||0; t.y=d.view.y||0; applyT(); }
  rebuildUI(); render(); renderList(); showDetail();
  if(!d.view){ fit(); }
  var b=document.getElementById('dirty'); if(b)b.textContent='archivo cargado';
  return true;
}
document.getElementById('fFile').onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{ try{ importDoc(JSON.parse(rd.result)); }
    catch(err){ alert('Archivo no válido: '+err.message); } };
  rd.readAsText(f); e.target.value='';};
document.getElementById('bRelayout').onclick=function(){
  if(!confirm('Se recolocar\u00e1n todos los equipos y S.zonas en rejilla y perder\u00e1s la distribuci\u00f3n actual. \u00bfContinuar?'))return;
  snap();
  layout();
  S.doc.zpos=JSON.parse(JSON.stringify(ZBOX));
  S.nodes.forEach(function(n){ n.nx=n.x; n.ny=n.y; });
  save(); render(); fit();
};
document.getElementById('bReset').onclick=()=>{
  if(!confirm('¿Volver a la plantilla? Se perderán los equipos de este proyecto; los demás proyectos no se tocan.'))return;
  try{localStorage.removeItem(KEY);}catch(e){}
  S.hist=[]; S.doc=JSON.parse(JSON.stringify(FRESH)); rebuild(); layout(); rebuildUI();
  render(); renderList(); fit(); showDetail();
  document.getElementById('dirty').textContent='original';};
document.getElementById('bCsv').onclick=()=>{
  const h=['ID','Nombre','Tipo','Zona','IP','MAC','Modelo','SO','Ubicacion','Red','Puertos','Gestionable','HDD'];
  const rows=S.nodes.map(n=>[n.id,n.nombre,n.tipo,n.zona,n.ip.join(' '),n.mac,n.modelo,n.so,n.ubic,n.nets.join('/'),n.puertos,n.gestionable,n.hdd]
    .map(x=>'"'+String(x||'').replace(/"/g,'""')+'"').join(';'));
  const blob=new Blob(['\ufeff'+h.join(';')+'\n'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='inventario_red_levante.csv';a.click();};

// ---------- movil: cajon de la lista y hoja inferior de la ficha ----------
(function(){
  var bm=document.getElementById('bMenu');
  var sh=document.getElementById('mshade');
  var as=document.querySelector('aside');
  function drawer(on){ if(!as)return; as.classList.toggle('open',!!on); if(sh)sh.classList.toggle('on',!!on); }
  if(bm)bm.onclick=function(){ drawer(!as.classList.contains('open')); };
  if(sh)sh.onclick=function(){ drawer(false); };
  var dc=document.getElementById('dClose');
  if(dc)dc.onclick=function(){
    state.sel=null; state.esel=null; state.edit=null;
    var app=document.querySelector('.app'); if(app)app.classList.remove('sel');
    render(); renderList(); showDetail();
  };
  // al elegir un equipo en la lista, se cierra el cajon
  document.addEventListener('click',function(ev){
    var t=ev.target;
    if(!t||!t.closest)return;
    if(as&&as.contains(t)&&t.closest('.item, .litem, .zitem')) drawer(false);
  });
})();

// estado vacio: abrir un mapa o crear uno nuevo
(function(){
  var eo=document.getElementById('eOpen'), en=document.getElementById('eNew');
  if(eo)eo.onclick=function(){ document.getElementById('fFile').click(); };
  if(en)en.onclick=function(){
    var be=document.getElementById('bEdit'); if(be&&!be.classList.contains('on'))be.click();
    var ba=document.getElementById('bAdd'); if(ba)ba.click();
  };
})();
export function syncEmpty(){
  var e=document.getElementById('empty'); if(!e)return;
  var vacio=!S.nodes||!S.nodes.length;
  e.classList.toggle('on',vacio);
}

// al girar el movil o cambiar el tamano de la ventana, encajar el mapa
(function(){
  var tmr=null;
  window.addEventListener('resize',function(){
    clearTimeout(tmr);
    tmr=setTimeout(function(){ try{ fit(); render(); }catch(e){} },180);
  });
})();
