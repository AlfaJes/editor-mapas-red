import { S } from './00-store.js';
import { TYPE, state } from './01-base.js';
import { rebuild, save, snap } from './02-modelo.js';
import { ZBOX, descZonas } from './03-layout.js';
import { applyT, dentroPrune, fit, sn, vis } from './04a-geometria.js';
import { render, renderList, select } from './04b-render-mapa.js';
import { showDetail } from './04c-ficha-formularios.js';
import { delNode, undo } from './05-mutaciones.js';
import { rebuildUI, setBtn } from './07-ui.js';
import { snapArrowEnd, zoneAt } from './10e-flechas.js';
import { svg, t, tip } from './dom.js';
// ---------- interacción ----------
svg.addEventListener('wheel',e=>{e.preventDefault();
  const r=svg.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  const k2=Math.max(.25,Math.min(3.5,t.k*(e.deltaY<0?1.12:1/1.12)));
  t.x=mx-(mx-t.x)*(k2/t.k); t.y=my-(my-t.y)*(k2/t.k); t.k=k2; applyT();},{passive:false});
S.pan=null;S.drag=null;S.zdrag=null;S.zres=null;let bh=null,d0=null;S.dgroup=null;S.suppressClick=false;S.sbox=null;
svg.addEventListener('mousedown',e=>{
  if(e.shiftKey){
    const r=svg.getBoundingClientRect();
    const wx=(e.clientX-r.left-t.x)/t.k, wy=(e.clientY-r.top-t.y)/t.k;
    S.sbox={x:wx,y:wy,x0:wx,y0:wy,add:e.ctrlKey||e.metaKey};
    const sb=document.getElementById('selbox');
    if(sb){sb.setAttribute('x',wx);sb.setAttribute('y',wy);sb.setAttribute('width',0);sb.setAttribute('height',0);sb.style.display='';}
    svg.classList.add('pan'); return;
  }
  const ehEl=e.target.closest?e.target.closest('.eh,.ehadd'):null;
  if(ehEl){const pp=ehEl.dataset.e.split('|');
    const ed=S.doc.edges.find(x=>(x.s===pp[0]&&x.t===pp[1])||(x.s===pp[1]&&x.t===pp[0]));
    if(ed){
      ed.pts=Array.isArray(ed.pts)?ed.pts:[];
      let idx=0;
      if(ehEl.classList.contains('ehadd')){
        if(ed.pts.length>=12){ alert('M\u00e1ximo 12 puntos por cable. Arrastra o junta los que ya hay.'); return; }
        idx=parseInt(ehEl.dataset.mi)||0;
        ed.pts.splice(idx,0,[sn(parseFloat(ehEl.getAttribute('cx'))),sn(parseFloat(ehEl.getAttribute('cy')))]);
      } else {
        idx=parseInt(ehEl.dataset.i); if(isNaN(idx))idx=0;
      }
      bh={e:ed,i:idx}; svg.classList.add('pan');
    }
    return;}
  if(e.target.classList&&(e.target.classList.contains('nzh')||e.target.classList.contains('nzh2'))){
    const gy=e.target.closest('.note');
    const nn=gy?(S.doc.notes||[]).filter(x=>x.id===gy.dataset.nid)[0]:null;
    if(nn){ S.nres={n:nn,sx:e.clientX,sy:e.clientY,w0:nn.w||220,h0:nn.h||40}; svg.classList.add('pan'); return; }
  }
  const ntEl=e.target.closest?e.target.closest('.note'):null;
  if(ntEl){
    const nn=(S.doc.notes||[]).filter(x=>x.id===ntEl.dataset.nid)[0];
    if(nn){
      if(nn.z){ nn.x=(typeof nn._x==='number')?nn._x:nn.x; nn.y=(typeof nn._y==='number')?nn._y:nn.y;
        delete nn.z; delete nn.ox; delete nn.oy; }
      S.ndrag={n:nn,sx:e.clientX,sy:e.clientY,ox:nn.x,oy:nn.y,moved:false};
      svg.classList.add('pan'); return; }
  }
  const zd=e.target.dataset&&e.target.dataset.zona;
  if(zd&&e.target.classList.contains('zh')){
    if(state.lockZones||((S.doc.zlock||[]).indexOf(zd)>=0)){ S.pan={x:e.clientX,y:e.clientY,tx:t.x,ty:t.y}; svg.classList.add('pan'); return; }
    const box=ZBOX.find(b=>b.z===zd);
    S.zres={z:zd,sx:e.clientX,sy:e.clientY,w0:box?box.w:220,h0:box?box.h:130};
    svg.classList.add('pan'); return;
  }
  const ahd=e.target.closest?e.target.closest('.ah'):null;
  if(ahd){
    const ar=(S.doc.arrows||[]).filter(x=>x.id===ahd.dataset.aid)[0];
    if(ar){ if(ahd.dataset.end==='2'){delete ar.n2;delete ar.z2;delete ar.nt2;} else {delete ar.n1;delete ar.z1;delete ar.nt1;}
      S.adrag={a:ar,end:ahd.dataset.end==='2'?2:1}; svg.classList.add('pan'); }
    return;
  }
  const aht=e.target.closest?e.target.closest('.ahit'):null;
  if(aht){
    const ar=(S.doc.arrows||[]).filter(x=>x.id===aht.dataset.aid)[0];
    if(ar){ state.arrowSel=ar.id; state.sel=null; state.esel=null;
      delete ar.n1; delete ar.n2; delete ar.z1; delete ar.z2; delete ar.nt1; delete ar.nt2;
      S.adrag={a:ar,move:true,sx:e.clientX,sy:e.clientY,ox:ar.x1,oy:ar.y1,ox2:ar.x2,oy2:ar.y2};
      svg.classList.add('pan'); }
    return;
  }
  const isHull=zd&&(e.target.classList.contains('hull')||e.target.classList.contains('hull-l')||e.target.classList.contains('hull-pill'));
  if(isHull){
    if(state.lockZones||((S.doc.zlock||[]).indexOf(zd)>=0)){ S.pan={x:e.clientX,y:e.clientY,tx:t.x,ty:t.y}; svg.classList.add('pan'); return; }
    const zs=[zd].concat(descZonas(zd));
    S.zdrag={z:zd,sx:e.clientX,sy:e.clientY,moved:false,
      boxes:zs.map(z=>{const b=ZBOX.find(x=>x.z===z);return b?{b,x:b.x,y:b.y}:null;}).filter(Boolean),
      orig:S.nodes.filter(n=>zs.indexOf(n.zona)>=0).map(n=>({n,x:n.x,y:n.y}))};
    svg.classList.add('pan'); return;
  }
  const g=e.target.closest('.node');
  if(g&&S.byId[g.dataset.id]){
    const id=g.dataset.id;
    if(state.msel.size>1&&state.msel.has(id)){
      S.dgroup=[...state.msel].map(k=>S.byId[k]).filter(Boolean).map(n=>({n,x:n.x,y:n.y}));
      d0={cx:e.clientX,cy:e.clientY,moved:false};
      svg.classList.add('pan'); return;
    }
    S.drag=S.byId[g.dataset.id];S.drag._moved=false;return;}
  S.pan={x:e.clientX,y:e.clientY,tx:t.x,ty:t.y};svg.classList.add('pan');});
window.addEventListener('mousemove',e=>{
  if(S.sbox){
    const r=svg.getBoundingClientRect();
    const wx=(e.clientX-r.left-t.x)/t.k, wy=(e.clientY-r.top-t.y)/t.k;
    const x=Math.min(S.sbox.x0,wx), y=Math.min(S.sbox.y0,wy), w=Math.abs(wx-S.sbox.x0), hh=Math.abs(wy-S.sbox.y0);
    S.sbox.cur={x:x,y:y,w:w,h:hh};
    const sb=document.getElementById('selbox');
    if(sb){sb.setAttribute('x',x.toFixed(1));sb.setAttribute('y',y.toFixed(1));sb.setAttribute('width',w.toFixed(1));sb.setAttribute('height',hh.toFixed(1));}
    return;
  }
  if(S.adrag){
    const r=svg.getBoundingClientRect();
    const ax=(e.clientX-r.left-t.x)/t.k, ay=(e.clientY-r.top-t.y)/t.k;
    if(S.adrag.move){
      const dx=(e.clientX-S.adrag.sx)/t.k, dy=(e.clientY-S.adrag.sy)/t.k;
      S.adrag.a.x1=sn(S.adrag.ox+dx); S.adrag.a.y1=sn(S.adrag.oy+dy);
      S.adrag.a.x2=sn(S.adrag.ox2+dx); S.adrag.a.y2=sn(S.adrag.oy2+dy);
    } else if(S.adrag.end===1){ S.adrag.a.x1=sn(ax); S.adrag.a.y1=sn(ay); }
    else { S.adrag.a.x2=sn(ax); S.adrag.a.y2=sn(ay); }
    render(); return;
  }
  if(S.nres){
    const dx=(e.clientX-S.nres.sx)/t.k, dy=(e.clientY-S.nres.sy)/t.k;
    S.nres.n.w=Math.max(40,sn(S.nres.w0+dx));
    S.nres.n.hFix=Math.max(22,sn(S.nres.h0+dy));
    render(); return;
  }
  if(S.ndrag){
    const dx=(e.clientX-S.ndrag.sx)/t.k, dy=(e.clientY-S.ndrag.sy)/t.k;
    if(Math.abs(dx)>2||Math.abs(dy)>2)S.ndrag.moved=true;
    S.ndrag.n.x=sn(S.ndrag.ox+dx); S.ndrag.n.y=sn(S.ndrag.oy+dy);
    render(); return;
  }
  if(S.zres){
    const dx=(e.clientX-S.zres.sx)/t.k, dy=(e.clientY-S.zres.sy)/t.k;
    const box=ZBOX.find(b=>b.z===S.zres.z);
    if(box){box.w=Math.max(160,S.zres.w0+dx);box.h=Math.max(120,S.zres.h0+dy);}
    render(); return;
  }
  if(bh){
    const r=svg.getBoundingClientRect();
    const bx=sn((e.clientX-r.left-t.x)/t.k), by=sn((e.clientY-r.top-t.y)/t.k);
    if(!Array.isArray(bh.e.pts))bh.e.pts=[];
    if(typeof bh.i!=='number')bh.i=0;
    bh.e.pts[bh.i]=[bx,by];
    bh.e.bx=bx; bh.e.by=by;
    bh.moved=true;
    render(); return;
  }
  if(S.zdrag){
    const dx=sn((e.clientX-S.zdrag.sx)/t.k), dy=sn((e.clientY-S.zdrag.sy)/t.k);
    if(Math.abs(dx)>2||Math.abs(dy)>2)S.zdrag.moved=true;
    S.zdrag.orig.forEach(o=>{o.n.x=o.x+dx;o.n.y=o.y+dy;});
    (S.zdrag.boxes||[]).forEach(o=>{o.b.x=o.x+dx;o.b.y=o.y+dy;});
    render(); return;
  }
  if(S.pan){t.x=S.pan.tx+(e.clientX-S.pan.x);t.y=S.pan.ty+(e.clientY-S.pan.y);applyT();}
  if(S.dgroup&&d0){
    const dx=sn((e.clientX-d0.cx)/t.k), dy=sn((e.clientY-d0.cy)/t.k);
    if(Math.abs(dx)>2||Math.abs(dy)>2)d0.moved=true;
    S.dgroup.forEach(o=>{o.n.x=o.x+dx;o.n.y=o.y+dy;});
    render(); return;
  }
  if(S.drag){const r=svg.getBoundingClientRect();
    S.drag.x=sn((e.clientX-r.left-t.x)/t.k); S.drag.y=sn((e.clientY-r.top-t.y)/t.k);
    S.drag._moved=true; render();}
  const g=e.target.closest?e.target.closest('.node'):null;
  if(g&&S.byId[g.dataset.id]){const n=S.byId[g.dataset.id];
    tip.innerHTML=`<b>${n.nombre}</b><span>${(TYPE[n.tipo]||['','Equipo'])[1]} · ${n.zona}${n.ip.length?'<br>'+n.ip.join(' · '):''}</span>`;
    tip.style.opacity=1; tip.style.left=Math.min(e.clientX+16,window.innerWidth-300)+'px';
    tip.style.top=(e.clientY+16)+'px';}
  else tip.style.opacity=0;
});
export function anyDrag(){
  try{ return !!(S.drag||S.ndrag||S.zdrag||S.zres||S.nres||bh||S.dgroup||S.adrag||S.pan); }catch(e){ return false; }
}
export function forceRelease(){ if(anyDrag()){ try{ window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); }catch(e){} } }
document.addEventListener('mouseleave',forceRelease);
window.addEventListener('blur',forceRelease);
document.addEventListener('visibilitychange',function(){ if(document.hidden)forceRelease(); });
window.addEventListener('pointercancel',forceRelease);
window.addEventListener('mouseup',(ev)=>{
  if(S.adrag){ if(!S.adrag.move)snapArrowEnd(S.adrag.a,S.adrag.end);
    snap(); save(); S.adrag=null; svg.classList.remove('pan'); S.suppressClick=true; render(); return; }
  if(S.nres){ snap(); save(); S.nres=null; svg.classList.remove('pan'); S.suppressClick=true; return; }
  if(S.ndrag){ if(S.ndrag.moved){ var nn=S.ndrag.n; var z=zoneAt(nn._x+20,nn._y+14);
      if(z){ var bb=ZBOX.filter(function(q){return q.z===z;})[0]; nn.z=z;
        nn.ox=Math.round(nn.x-(bb?bb.x:0)); nn.oy=Math.round(nn.y-(bb?bb.y:0)); }
      snap(); save(); render(); S.suppressClick=true;} S.ndrag=null; svg.classList.remove('pan'); }
  if(S.zres){S.doc.zpos=JSON.parse(JSON.stringify(ZBOX));save();S.zres=null;S.suppressClick=true;
    svg.classList.remove('pan');return;}
  if(bh){ var quit=0; if(bh.moved)quit=dentroPrune(bh.e);
    snap(); save(); bh=null; S.suppressClick=true; svg.classList.remove('pan');
    if(quit){ render(); }
    return; }
  if(S.zdrag){
    if(S.zdrag.moved){S.zdrag.orig.forEach(o=>{o.n.nx=o.n.x;o.n.ny=o.n.y;});
      S.doc.zpos=JSON.parse(JSON.stringify(ZBOX)); save(); S.suppressClick=true;}
    S.zdrag=null; svg.classList.remove('pan');
  }
  if(S.dgroup){
    if(d0&&d0.moved){S.dgroup.forEach(o=>{o.n.nx=o.n.x;o.n.ny=o.n.y;});save();S.suppressClick=true;}
    S.dgroup=null;d0=null;svg.classList.remove('pan');return;
  }
  if(S.drag){ if(S.drag._moved){S.drag.nx=S.drag.x;S.drag.ny=S.drag.y;save();} else if(!(ev&&ev.__touch)) select(S.drag.id,false); S.drag=null; }
  if(S.sbox){
    var sb=document.getElementById('selbox'); if(sb)sb.style.display='none';
    var cur=S.sbox.cur;
    if(cur&&cur.w>6&&cur.h>6){
      if(!S.sbox.add)state.msel.clear();
      S.nodes.filter(vis).forEach(function(n){
        if(n.x>=cur.x&&n.x<=cur.x+cur.w&&n.y>=cur.y&&n.y<=cur.y+cur.h)state.msel.add(n.id);
      });
      state.sel=null; state.esel=null; render(); renderList(); showDetail(); S.suppressClick=true;
    }
    S.sbox=null; svg.classList.remove('pan'); return;
  }
  S.pan=null; svg.classList.remove('pan');});
svg.addEventListener('click',e=>{
  if(S.suppressClick){S.suppressClick=false;return;}
  const z=e.target.dataset&&e.target.dataset.zona;
  if(z&&!(state.edit&&state.linkMode)){state.zona=state.zona===z?'':z;
    document.getElementById('fZona').value=state.zona;render();renderList();return;}
  const hit=e.target.closest('.edge-hit');
  if(hit){const[p1,p2]=hit.dataset.e.split('|');
    const ed=S.doc.edges.find(x=>(x.s===p1&&x.t===p2)||(x.s===p2&&x.t===p1));
    if(!ed)return;
    if(e.shiftKey){ed.hide=!ed.hide;save();render();return;}
    state.esel={s:ed.s,t:ed.t}; state.sel=null; render(); showDetail(); return;}
  const g=e.target.closest('.node');
  if(g){
    const id=g.dataset.id;
    if(e.shiftKey||e.ctrlKey||e.metaKey){
      if(state.msel.has(id))state.msel.delete(id);else state.msel.add(id);
      state.sel=null;render();renderList();showDetail();return;
    }
    state.msel.clear(); select(id,false); return;
  }
  if(state.msel.size){state.msel.clear();render();showDetail();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(state.linkMode||state.pending){state.linkMode=false;state.pending=null;setBtn('bLink',false);render();return;}
    if(state.path){state.path=null;state.pathA=null;state.pathMode=false;setBtn('bPath',false);render();showDetail();return;}
    if(document.body.classList.contains('present')){document.body.classList.remove('present');fit();return;}
    state.sel=null;state.msel.clear();render();renderList();showDetail();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}
  if(e.key==='Delete'){
    const tg=(e.target.tagName||'').toLowerCase();
    if(tg==='input'||tg==='textarea'||tg==='select'||e.target.isContentEditable)return;
    if(state.msel&&state.msel.size){
      e.preventDefault();
      if(!confirm('\u00bfEliminar los '+state.msel.size+' equipos seleccionados? Tambi\u00e9n se borrar\u00e1n sus enlaces.'))return;
      snap();
      const ids=Array.from(state.msel);
      S.doc.nodes=S.doc.nodes.filter(x=>ids.indexOf(x.id)<0);
      S.doc.edges=S.doc.edges.filter(x=>ids.indexOf(x.s)<0&&ids.indexOf(x.t)<0);
      state.msel.clear(); state.sel=null;
      save(); rebuild(); rebuildUI(); render(); renderList(); showDetail(); return;
    }
    if(state.arrowSel){
      const ar=(S.doc.arrows||[]).filter(x=>x.id===state.arrowSel)[0];
      if(ar){ e.preventDefault();
        if(confirm('\u00bfEliminar esta flecha?')){
          snap(); S.doc.arrows=S.doc.arrows.filter(x=>x.id!==ar.id);
          state.arrowSel=null; save(); render();
        }
        return; }
    }
    if(state.esel){
      const ed=S.doc.edges.find(x=>(x.s===state.esel.s&&x.t===state.esel.t)||(x.s===state.esel.t&&x.t===state.esel.s));
      if(ed){ e.preventDefault();
        if(confirm('\u00bfEliminar el enlace entre '+(S.byId[ed.s]||{}).nombre+' y '+(S.byId[ed.t]||{}).nombre+'?')){
          snap(); S.doc.edges=S.doc.edges.filter(x=>x!==ed);
          state.esel=null; save(); rebuild(); render(); renderList(); showDetail();
        }
        return; }
    }
    if(state.sel&&S.byId[state.sel]){ e.preventDefault(); delNode(state.sel); return; }
  }
});

// red de seguridad: si algo falla al soltar, nunca dejar el equipo pegado al raton
window.addEventListener('mouseup',function(){
  try{
    if(S.drag){ if(S.drag._moved){ S.drag.nx=S.drag.x; S.drag.ny=S.drag.y; try{save();}catch(e){} } S.drag=null; svg.classList.remove('pan'); }
    if(S.dgroup){ S.dgroup=null; d0=null; svg.classList.remove('pan'); }
    if(S.ndrag){ S.ndrag=null; svg.classList.remove('pan'); }
    if(S.zdrag){ S.zdrag=null; svg.classList.remove('pan'); }
    if(S.pan){ S.pan=null; svg.classList.remove('pan'); }
  }catch(e){}
});
