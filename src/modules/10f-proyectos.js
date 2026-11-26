import { S } from './00-store.js';
import { bakList, state } from './01-base.js';
import { applyDoc, dkey, idxSave, newId, normDoc, rebuild, save } from './02-modelo.js';
import { ZBOX, applyTitle, layout, restoreLayout } from './03-layout.js';
import { GRID, fit } from './04a-geometria.js';
import { render, renderList, v } from './04b-render-mapa.js';
import { escAttr, showDetail } from './04c-ficha-formularios.js';
import { rebuildUI, setBtn } from './07-ui.js';
import { exportPDF } from './10b-export-imagen.js';
import { saveApp } from './10d-guardado-notas.js';
import { t } from './dom.js';
export function blankDoc(){
  return normDoc({title:'Nuevo mapa de red',sub:'',autor:'',version:'',nodes:[],edges:[],
    zonasExtra:['Zona 1'],zparent:{},zpos:[],colors:{},estyle:'curvo',notes:[],arrows:[]});
}
export function renderProjects(){
  var box=document.getElementById('p_list'); if(!box)return;
  if(!S.PROJ.list.length){ box.innerHTML='<div class="empty" style="padding:10px">Sin proyectos guardados.</div>'; return; }
  var arr=S.PROJ.list.slice().sort(function(a,b){return (b.updated||0)-(a.updated||0);});
  box.innerHTML=arr.map(function(it){
    var d=new Date(it.updated||Date.now());
    var dd=d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    return '<div class="prow2'+(it.id===S.PROJ.cur?' cur':'')+'" data-id="'+it.id+'">'+
      '<span class="pt">'+escAttr(it.title||'Sin t\u00edtulo')+'</span>'+
      '<span class="pd">'+dd+'</span>'+
      '<button class="btn sm" data-act="ren" title="Renombrar">\u270e</button>'+
      '<button class="btn sm" data-act="dup" title="Duplicar">\u29c9</button>'+
      '<button class="btn sm danger" data-act="del" title="Borrar">\u2715</button></div>';
  }).join('');
  [].forEach.call(box.querySelectorAll('.prow2'),function(r){
    r.onclick=function(ev){ if(ev.target.closest('button'))return; projOpen(r.dataset.id); };
    [].forEach.call(r.querySelectorAll('button[data-act]'),function(b){
      b.onclick=function(ev){ ev.stopPropagation(); actProject(b.dataset.act,r.dataset.id); };
    });
  });
}
export function actProject(act,id){
  var it=S.PROJ.list.filter(function(x){return x.id===id;})[0];
  if(act==='del'){
    if(!confirm('Borrar el proyecto "'+((it&&it.title)||'')+'" de este navegador?'))return;
    try{ localStorage.removeItem(dkey(id)); }catch(e){}
    S.PROJ.list=S.PROJ.list.filter(function(x){return x.id!==id;});
    idxSave();
    if(S.PROJ.cur===id){
      if(S.PROJ.list.length){ projOpen(S.PROJ.list[0].id); }
      else { S.PROJ.cur=null; applyDoc(blankDoc()); save(); }
    }
    renderProjects(); return;
  }
  if(act==='dup'){
    var src=null; try{ src=localStorage.getItem(dkey(id)); }catch(e){}
    if(!src)return;
    var nid=newId();
    try{ localStorage.setItem(dkey(nid),src); }catch(e){}
    S.PROJ.list.push({id:nid,title:((it&&it.title)||'Mapa')+' (copia)',updated:Date.now()});
    idxSave(); renderProjects(); return;
  }
  if(act==='ren'){
    if(!it)return;
    var nv=window.prompt('Nombre del proyecto',it.title||'');
    if(nv==null)return;
    nv=nv.trim(); if(!nv)return;
    it.title=nv;
    try{ var rr=localStorage.getItem(dkey(id)); if(rr){ var dd=JSON.parse(rr); dd.title=nv; localStorage.setItem(dkey(id),JSON.stringify(dd)); } }catch(e){}
    if(S.PROJ.cur===id){ S.doc.title=nv; applyTitle(); }
    idxSave(); save(); renderProjects(); return;
  }
}
export function projOpen(id){
  var d=null; try{ d=JSON.parse(localStorage.getItem(dkey(id))||'null'); }catch(e){}
  if(!d)return;
  S.PROJ.cur=id;
  applyDoc(d);
  document.getElementById('pmodal').classList.remove('on');
}
document.getElementById('bProj').onclick=function(){ renderProjects(); try{renderBaks();}catch(e){} document.getElementById('pmodal').classList.add('on'); };
document.getElementById('p_close').onclick=function(){ document.getElementById('pmodal').classList.remove('on'); };
document.getElementById('p_new').onclick=function(){
  S.PROJ.cur=newId(); applyDoc(blankDoc()); save();
  document.getElementById('pmodal').classList.remove('on');
};
document.getElementById('p_dup').onclick=function(){ if(S.PROJ.cur)actProject('dup',S.PROJ.cur); };
document.getElementById('p_imp').onclick=function(){ document.getElementById('bOpen').click(); };
document.getElementById('p_html').onclick=function(){ saveApp(); };
document.getElementById('p_json').onclick=function(){ document.getElementById('bSave').click(); };

document.getElementById('bApp').onclick=saveApp;
document.addEventListener('change',function(e){
  if(e.target&&e.target.id==='e_zona'){
    var ni=document.getElementById('e_zona_new');
    if(ni){ ni.style.display=(e.target.value==='__nueva__')?'':'none';
      if(e.target.value==='__nueva__')ni.focus(); }
  }
});
export function snapAll(){
  var g=GRID;
  S.nodes.forEach(function(n){ n.x=Math.round(n.x/g)*g; n.y=Math.round(n.y/g)*g;
    var d=S.doc.nodes.filter(function(x){return x.id===n.id;})[0]; if(d){d.x=n.x;d.y=n.y;} });
  ZBOX.forEach(function(b){ b.x=Math.round(b.x/g)*g; b.y=Math.round(b.y/g)*g; });
  S.doc.zpos=JSON.parse(JSON.stringify(ZBOX));
  S.doc.edges.forEach(function(e){ if(e.bx!=null){e.bx=Math.round(e.bx/g)*g;e.by=Math.round(e.by/g)*g;} });
  save();
}
document.getElementById('bGrid').onclick=function(){
  state.grid=!state.grid;
  setBtn('bGrid',state.grid);
  if(state.grid){ snapAll();
    if(S.doc.estyle==='curvo'){ S.doc.estyle='orto'; var be=document.getElementById('bEdge'); if(be)be.textContent='Ortogonal'; save(); }
    render(); }
  else { render(); }
};
document.getElementById('bLock').onclick=function(){
  state.lockZones=!state.lockZones;
  setBtn('bLock',state.lockZones);
  document.body.classList.toggle('lockz',state.lockZones);
  document.getElementById('bLock').textContent=state.lockZones?'\ud83d\udd12 Secciones fijas':'\ud83d\udd12 Fijar secciones';
  try{ localStorage.setItem('nm_lockz',state.lockZones?'1':'0'); }catch(e){}
};
document.getElementById('bSide').onclick=function(){
  var hide=!document.body.classList.contains('noside');
  document.body.classList.toggle('noside',hide);
  setBtn('bSide',!hide);
  try{ localStorage.setItem('nm_side',hide?'1':'0'); }catch(e){}
  setTimeout(function(){ fit(); },40);
};
try{
  if(localStorage.getItem('nm_side')==='1'){ document.body.classList.add('noside'); setBtn('bSide',false); }
  else { setBtn('bSide',true); }
}catch(e){}

document.getElementById('bPdf').onclick=function(){var m=document.getElementById('moreMenu');if(m)m.classList.remove('on');exportPDF();};
document.getElementById('fColor').onchange=function(e){ state.colorBy=e.target.value; render(); renderList(); };

/* ================= comprobación de conectividad ================= */

// ---------- restaurar copias ----------
export function renderBaks(){
  var box=document.getElementById('p_bak'); if(!box)return;
  var L=bakList().slice().reverse();
  if(!L.length){ box.innerHTML='<div class="empty" style="padding:6px 0">Sin copias todavía</div>'; return; }
  box.innerHTML=L.map(function(b,i){
    var d=new Date(b.t);
    var t=d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    var n=0; try{ n=JSON.parse(b.d).nodes.length; }catch(e){}
    return '<div class="prowC" style="cursor:default"><span>'+t+'</span><i>'+n+' equipos</i>'+
      '<button class="btn sm" data-bak="'+(L.length-1-i)+'">Restaurar</button></div>';
  }).join('');
  box.querySelectorAll('[data-bak]').forEach(function(btn){
    btn.onclick=function(){
      var idx=+btn.getAttribute('data-bak');
      var L2=bakList(); var b=L2[idx]; if(!b)return;
      if(!confirm('¿Restaurar la copia del '+new Date(b.t).toLocaleString('es-ES')+'? Se sustituye el mapa actual.'))return;
      try{
        S.doc=JSON.parse(b.d); save(); rebuild();
        if(!restoreLayout())layout();
        rebuildUI(); render(); renderList(); showDetail(); fit();
      }catch(e){ alert('Copia no válida: '+e.message); }
    };
  });
}
