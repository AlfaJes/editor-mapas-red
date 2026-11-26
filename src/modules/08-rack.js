import { S } from './00-store.js';
import { DATA, TYPE, state } from './01-base.js';
import { rebuild, save, snap } from './02-modelo.js';
import { applyTitle, renderZmodal } from './03-layout.js';
import { col, sn } from './04a-geometria.js';
import { render, renderList, select, v } from './04b-render-mapa.js';
import { escAttr } from './04c-ficha-formularios.js';
import { delLink } from './05-mutaciones.js';
import { renderArmarios } from './08b-armarios.js';
import { RACK, svg, t } from './dom.js';
// ---------- vista rack ----------

export const ORDT=['router','firewall','switch','server','nas','nvr','wifi','pc','otro'];

/* ---------- armario gráfico ---------- */
export function rackZonas(){
  var zs={};
  S.nodes.forEach(function(n){ if(n.zona){ zs[n.zona]=(zs[n.zona]||0)+1; } });
  return Object.keys(zs).sort(function(a,b){return a.localeCompare(b,'es');});
}

export function rackU(n){
  var fijo=parseInt(n.u);
  if(fijo>0)return Math.max(1,Math.min(8,fijo));
  var t=n.tipo;
  if(t==='servidor'||t==='nas')return 2;
  if(t==='ups')return 3;
  return 1;
}
export function gotoMapa(id){
  state.view='mapa'; document.body.classList.remove('viewrack');
  var b=document.getElementById('bRack'); if(b){ b.classList.remove('on'); b.textContent='\ud83d\uddc4 Rack'; }
  render(); select(id,true);
}
export function rackIdsDom(z){
  var out=[];
  RACK.querySelectorAll('.cabrow').forEach(function(g){
    if(g.getAttribute('data-zone')===z) out.push(g.getAttribute('data-id'));
  });
  return out;
}
export function rackMove(dir){
  var id=state.rackSel; if(!id)return;
  var n=S.byId[id]; if(!n)return;
  var z=n.zona||'';
  var ids=rackIdsDom(z);
  var i=ids.indexOf(id); if(i<0)return;
  var j=i+dir; if(j<0||j>=ids.length)return;
  ids.splice(i,1); ids.splice(j,0,id);
  S.doc.rackOrder=S.doc.rackOrder||{}; S.doc.rackOrder[z]=ids;
  save(); renderRack();
}


export function renderRack(){
  if(!RACK)return;
  var mode=state.rackMode||'lista';
  if(mode==='armario'){ renderArmarios(); return; }
  var zs=rackZonas();
  var cur=(state.rackZone==='*')?'*':(state.rackZone&&zs.indexOf(state.rackZone)>=0?state.rackZone:(zs.filter(function(z){return /rack|armario/i.test(z);})[0]||zs[0]||''));
  state.rackZone=cur;
  var head='<div class="rkbar"><span class="rkttl">\ud83d\uddc4 Armario</span>'+
    '<div class="rkseg">'+
      '<button class="btn sm'+(mode==='lista'?' on':'')+'" data-rm="lista">\u2630 Lista</button>'+
      '<button class="btn sm'+(mode==='armario'?' on':'')+'" data-rm="armario">\ud83d\uddbc Armario</button>'+
    '</div>'+
    (mode==='armario'?('<select id="rkz" class="rkz">'+zs.map(function(z){
        return '<option value="'+escAttr(z)+'"'+(z===cur?' selected':'')+'>'+escAttr(z)+'</option>';}).join('')+
      '<option value="*"'+(cur==='*'?' selected':'')+'>— todos los armarios —</option></select>'+
      '<button class="btn sm" id="rkpng" title="Descargar este armario en PNG">\u2913 PNG</button>'+
      '<button class="btn sm" id="rkpatch" title="Añadir un patch panel a este armario">\uFF0B Patch</button>'+
      '<button class="btn sm tog'+(state.rackOnly?' on':'')+'" id="rkonly" title="Mostrar solo equipos de armario (switch, router, servidor…)">Solo armario</button>'+
      '<span class="rkleg"><i style="background:#4f8cff"></i>ocupado <i style="background:#22344f"></i>libre</span>'+
      ((S.doc.rackHidden&&S.doc.rackHidden.length)?'<button class="btn sm" id="rkrest">Restaurar '+S.doc.rackHidden.length+'</button>':'')+
      (state.rackSel?'<span class="rkord"><button class="btn sm" id="rkup" title="Subir un puesto">\u25b2 Subir</button><button class="btn sm" id="rkdn" title="Bajar un puesto">\u25bc Bajar</button><button class="btn sm" id="rkgoto">Ver en el mapa</button></span>':'')):'' )+
    '</div>';
  RACK.innerHTML=head+rackLista();
  RACK.querySelectorAll('[data-rm]').forEach(function(b){
    b.onclick=function(){ state.rackMode=b.getAttribute('data-rm'); renderRack(); };
  });
  rackBind();
  var zz=document.getElementById('rkz');
  if(zz)zz.onchange=function(){ state.rackZone=zz.value; renderRack(); };
  RACK.querySelectorAll('.cabrow').forEach(function(g){
    g.onclick=function(){ var id=g.getAttribute('data-id'); if(!id)return; if(state.rackSel!==id){ state.rackSel=id; renderRack(); } };
    g.ondblclick=function(){ var id=g.getAttribute('data-id'); gotoMapa(id); };
  });
  var rg=document.getElementById('rkpng'); if(rg)rg.onclick=function(){ exportRackPNG(); };
  var rp=document.getElementById('rkpatch'); if(rp)rp.onclick=function(){
    var z=state.rackZone&&state.rackZone!=='*'?state.rackZone:(rackZonas()[0]||'');
    if(!z)return;
    S.doc.patches=S.doc.patches||{}; S.doc.patches[z]=S.doc.patches[z]||[];
    S.doc.patches[z].push({n:'Patch '+(S.doc.patches[z].length+1)+' (24)',ports:24});
    save(); renderRack();
  };
  RACK.querySelectorAll('[data-pdel]').forEach(function(x){
    x.onclick=function(ev){ ev.stopPropagation();
      var z=x.closest('[data-zone]')?x.closest('[data-zone]').getAttribute('data-zone'):state.rackZone;
      var i=parseInt(x.getAttribute('data-pdel'),10);
      if(S.doc.patches&&S.doc.patches[z]){ S.doc.patches[z].splice(i,1); save(); renderRack(); }
    };
  });
  var ro=document.getElementById('rkonly'); if(ro)ro.onclick=function(){ state.rackOnly=!state.rackOnly; try{localStorage.setItem('nm_rackonly',state.rackOnly?'1':'0');}catch(e){} renderRack(); };
  var rr=document.getElementById('rkrest'); if(rr)rr.onclick=function(){ S.doc.rackHidden=[]; save(); renderRack(); };
  RACK.querySelectorAll('.cabxx[data-hide]').forEach(function(x){
    x.onclick=function(ev){ ev.stopPropagation(); var id=x.getAttribute('data-hide');
      S.doc.rackHidden=(S.doc.rackHidden||[]); if(S.doc.rackHidden.indexOf(id)<0)S.doc.rackHidden.push(id);
      save(); renderRack(); };
  });
  RACK.querySelectorAll('.cabx[data-zoff]').forEach(function(x){
    x.onclick=function(ev){ ev.stopPropagation(); var z=x.getAttribute('data-zoff');
      S.doc.rackZonesOff=(S.doc.rackZonesOff||[]); if(S.doc.rackZonesOff.indexOf(z)<0)S.doc.rackZonesOff.push(z);
      save(); renderRack(); };
  });
  var bu=document.getElementById('rkup'); if(bu)bu.onclick=function(){ rackMove(-1); };
  var bd=document.getElementById('rkdn'); if(bd)bd.onclick=function(){ rackMove(1); };
  var bg=document.getElementById('rkgoto'); if(bg)bg.onclick=function(){ if(state.rackSel)gotoMapa(state.rackSel); };
  try{bindRackDrag();}catch(e){}
}

export function rackLista(){
  if(!RACK)return;
  const rz=[...new Set(S.nodes.filter(n=>/rack|armario/i.test(n.zona)).map(n=>n.zona))].sort();
  const sws=S.nodes.filter(n=>n.tipo==='switch'||n.tipo==='router')
    .sort((a,b)=>a.zona.localeCompare(b.zona,'es')||a.nombre.localeCompare(b.nombre,'es'));
  let out='<div class="racks">';
  rz.forEach(z=>{
    const m=S.nodes.filter(n=>n.zona===z).sort((a,b)=>
      ((ORDT.indexOf(a.tipo)+1||9)-(ORDT.indexOf(b.tipo)+1||9))||a.nombre.localeCompare(b.nombre,'es'));
    out+=`<div class="rcard"><div class="rhead"><div><div class="rname">${z}</div>
      <div class="rmeta">${m.length} equipos en el armario</div></div></div><div class="rslots">`+
      m.map(n=>`<div class="slot used" data-id="${n.id}"><span class="dot" style="background:${col(n)}"></span>
        <span class="sn">${n.nombre}</span><span class="st">${(TYPE[n.tipo]||['',''])[1]}</span>
        <span class="sip">${n.ip[0]||''}</span></div>`).join('')+`</div></div>`;
  });
  sws.forEach(sw=>{
    const cap=parseInt(sw.puertos)||0;
    const mine=S.doc.edges.filter(e=>e.h===sw.id);
    const N=cap>0?Math.max(cap,...mine.map(e=>e.port)):Math.max(8,...mine.map(e=>e.port));
    const linked=new Set(mine.map(e=>e.s===sw.id?e.t:e.s));
    let rows='';
    for(let p=1;p<=N;p++){
      const e=mine.find(x=>x.port===p);
      if(e){const dev=S.byId[e.s===sw.id?e.t:e.s];
        rows+=`<div class="slot used" data-id="${dev.id}"><span class="pnum">${p}</span>
          <span class="dot" style="background:${col(dev)}"></span><span class="sn">${dev.nombre}</span>
          <span class="st">${(TYPE[dev.tipo]||['',''])[1]}</span>
          <button class="x" data-h="${sw.id}" data-d="${dev.id}">✕</button></div>`;
      } else {
        const opts=S.nodes.filter(x=>x.id!==sw.id&&!linked.has(x.id))
          .sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'))
          .map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('');
        rows+=`<div class="slot free"><span class="pnum">${p}</span>
          <select class="psel" data-h="${sw.id}" data-p="${p}"><option value="">libre</option>${opts}</select></div>`;
      }
    }
    out+=`<div class="rcard"><div class="rhead"><div><div class="rname">${sw.nombre}</div>
      <div class="rmeta">${sw.zona} · ${(TYPE[sw.tipo]||['',''])[1]}${cap?' · '+cap+' puertos':''}</div></div>
      <span class="chip">${mine.length}/${N}</span></div><div class="rslots">${rows}</div></div>`;
  });
  return out+'</div>';
}
export function rackBind(){
  RACK.querySelectorAll('.slot.used').forEach(el=>el.onclick=ev=>{
    if(ev.target.tagName==='BUTTON'||ev.target.tagName==='SELECT')return; gotoMapa(el.dataset.id);});
  RACK.querySelectorAll('.x').forEach(b=>b.onclick=ev=>{ev.stopPropagation();delLink(b.dataset.h,b.dataset.d);});
  RACK.querySelectorAll('.psel').forEach(s=>s.onchange=ev=>{
    const d=ev.target.value; if(!d)return;
    snap(); S.doc.edges.push({s:s.dataset.h,t:d,h:s.dataset.h,port:+s.dataset.p});
    save(); rebuild(); render(); renderList();});
}
document.getElementById('bRack').onclick=()=>{
  state.view = state.view==='rack'?'mapa':'rack';
  const on=state.view==='rack';
  document.body.classList.toggle('viewrack',on);
  document.getElementById('bRack').classList.toggle('on',on);
  document.getElementById('bRack').textContent=on?'🗺 Mapa':'🗄 Rack';
  if(on)renderRack(); else render();
};
export function bindTitle(){
  [['ttl','title'],['sub','sub']].forEach(function(pair){
    var id=pair[0], key=pair[1];
    var el=document.getElementById(id); if(!el)return;
    el.addEventListener('blur',function(){
      var v=el.textContent.replace(/\s+/g,' ').trim();
      S.doc[key]=v||(key==='title'?DATA.titulo:DATA.sub);
      save(); applyTitle();
    });
    el.addEventListener('keydown',function(ev){ if(ev.key==='Enter'){ev.preventDefault();el.blur();} });
  });
}
document.getElementById('bZonas').onclick=function(){
  renderZmodal(); document.getElementById('zmodal').classList.add('on');
};
document.getElementById('z_close').onclick=function(){document.getElementById('zmodal').classList.remove('on');};

// ---------- exportar el armario a PNG ----------
export function exportRackPNG(){
  var svgEl=document.querySelector('.cabsvg');
  if(!svgEl){ alert('Abre un armario para poder exportarlo.'); return; }
  var clone=svgEl.cloneNode(true);
  var vb=svgEl.viewBox.baseVal, W=Math.round(vb.width), H=Math.round(vb.height);
  clone.setAttribute('width',W); clone.setAttribute('height',H);
  // pasar estilos calculados a atributos para que no dependan de la hoja de la página
  var src=svgEl.querySelectorAll('*'), dst=clone.querySelectorAll('*');
  for(var i=0;i<src.length;i++){
    var cs=getComputedStyle(src[i]);
    var d=dst[i]; if(!d||!d.style)continue;
    if(cs.fill&&cs.fill!=='none')d.setAttribute('fill',cs.fill);
    if(cs.stroke&&cs.stroke!=='none')d.setAttribute('stroke',cs.stroke);
    if(cs.strokeWidth)d.setAttribute('stroke-width',cs.strokeWidth);
    if(cs.fontSize)d.setAttribute('font-size',cs.fontSize);
    d.setAttribute('font-family','Segoe UI,Arial,sans-serif');
    if(cs.fontWeight)d.setAttribute('font-weight',cs.fontWeight);
    if(cs.opacity&&cs.opacity!=='1')d.setAttribute('opacity',cs.opacity);
  }
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  var xml=new XMLSerializer().serializeToString(clone);
  var img=new Image();
  img.onload=function(){
    var sc=2, cv=document.createElement('canvas');
    cv.width=W*sc; cv.height=H*sc;
    var ctx=cv.getContext('2d');
    ctx.fillStyle='#0d1626'; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.setTransform(sc,0,0,sc,0,0);
    ctx.drawImage(img,0,0);
    cv.toBlob(function(b){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(b);
      a.download='armario_'+(state.rackZone||'rack').replace(/[^\w]+/g,'_')+'.png';
      a.click();
      document.getElementById('dirty').textContent='armario exportado';
    },'image/png');
  };
  img.onerror=function(){ alert('No se pudo generar la imagen del armario.'); };
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
}

// ---------- arrastrar equipos dentro del armario ----------


