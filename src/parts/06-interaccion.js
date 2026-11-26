// ---------- interacción ----------
svg.addEventListener('wheel',e=>{e.preventDefault();
  const r=svg.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  const k2=Math.max(.25,Math.min(3.5,t.k*(e.deltaY<0?1.12:1/1.12)));
  t.x=mx-(mx-t.x)*(k2/t.k); t.y=my-(my-t.y)*(k2/t.k); t.k=k2; applyT();},{passive:false});
let pan=null,drag=null,zdrag=null,zres=null,bh=null,dgroup=null,d0=null,suppressClick=false,sbox=null;
svg.addEventListener('mousedown',e=>{
  if(e.shiftKey){
    const r=svg.getBoundingClientRect();
    const wx=(e.clientX-r.left-t.x)/t.k, wy=(e.clientY-r.top-t.y)/t.k;
    sbox={x:wx,y:wy,x0:wx,y0:wy,add:e.ctrlKey||e.metaKey};
    const sb=document.getElementById('selbox');
    if(sb){sb.setAttribute('x',wx);sb.setAttribute('y',wy);sb.setAttribute('width',0);sb.setAttribute('height',0);sb.style.display='';}
    svg.classList.add('pan'); return;
  }
  const ehEl=e.target.closest?e.target.closest('.eh,.ehadd'):null;
  if(ehEl){const pp=ehEl.dataset.e.split('|');
    const ed=doc.edges.find(x=>(x.s===pp[0]&&x.t===pp[1])||(x.s===pp[1]&&x.t===pp[0]));
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
    const nn=gy?(doc.notes||[]).filter(x=>x.id===gy.dataset.nid)[0]:null;
    if(nn){ nres={n:nn,sx:e.clientX,sy:e.clientY,w0:nn.w||220,h0:nn.h||40}; svg.classList.add('pan'); return; }
  }
  const ntEl=e.target.closest?e.target.closest('.note'):null;
  if(ntEl){
    const nn=(doc.notes||[]).filter(x=>x.id===ntEl.dataset.nid)[0];
    if(nn){
      if(nn.z){ nn.x=(typeof nn._x==='number')?nn._x:nn.x; nn.y=(typeof nn._y==='number')?nn._y:nn.y;
        delete nn.z; delete nn.ox; delete nn.oy; }
      ndrag={n:nn,sx:e.clientX,sy:e.clientY,ox:nn.x,oy:nn.y,moved:false};
      svg.classList.add('pan'); return; }
  }
  const zd=e.target.dataset&&e.target.dataset.zona;
  if(zd&&e.target.classList.contains('zh')){
    if(state.lockZones||((doc.zlock||[]).indexOf(zd)>=0)){ pan={x:e.clientX,y:e.clientY,tx:t.x,ty:t.y}; svg.classList.add('pan'); return; }
    const box=ZBOX.find(b=>b.z===zd);
    zres={z:zd,sx:e.clientX,sy:e.clientY,w0:box?box.w:220,h0:box?box.h:130};
    svg.classList.add('pan'); return;
  }
  const ahd=e.target.closest?e.target.closest('.ah'):null;
  if(ahd){
    const ar=(doc.arrows||[]).filter(x=>x.id===ahd.dataset.aid)[0];
    if(ar){ if(ahd.dataset.end==='2'){delete ar.n2;delete ar.z2;delete ar.nt2;} else {delete ar.n1;delete ar.z1;delete ar.nt1;}
      adrag={a:ar,end:ahd.dataset.end==='2'?2:1}; svg.classList.add('pan'); }
    return;
  }
  const aht=e.target.closest?e.target.closest('.ahit'):null;
  if(aht){
    const ar=(doc.arrows||[]).filter(x=>x.id===aht.dataset.aid)[0];
    if(ar){ state.arrowSel=ar.id; state.sel=null; state.esel=null;
      delete ar.n1; delete ar.n2; delete ar.z1; delete ar.z2; delete ar.nt1; delete ar.nt2;
      adrag={a:ar,move:true,sx:e.clientX,sy:e.clientY,ox:ar.x1,oy:ar.y1,ox2:ar.x2,oy2:ar.y2};
      svg.classList.add('pan'); }
    return;
  }
  const isHull=zd&&(e.target.classList.contains('hull')||e.target.classList.contains('hull-l')||e.target.classList.contains('hull-pill'));
  if(isHull){
    if(state.lockZones||((doc.zlock||[]).indexOf(zd)>=0)){ pan={x:e.clientX,y:e.clientY,tx:t.x,ty:t.y}; svg.classList.add('pan'); return; }
    const zs=[zd].concat(descZonas(zd));
    zdrag={z:zd,sx:e.clientX,sy:e.clientY,moved:false,
      boxes:zs.map(z=>{const b=ZBOX.find(x=>x.z===z);return b?{b,x:b.x,y:b.y}:null;}).filter(Boolean),
      orig:nodes.filter(n=>zs.indexOf(n.zona)>=0).map(n=>({n,x:n.x,y:n.y}))};
    svg.classList.add('pan'); return;
  }
  const g=e.target.closest('.node');
  if(g&&byId[g.dataset.id]){
    const id=g.dataset.id;
    if(state.msel.size>1&&state.msel.has(id)){
      dgroup=[...state.msel].map(k=>byId[k]).filter(Boolean).map(n=>({n,x:n.x,y:n.y}));
      d0={cx:e.clientX,cy:e.clientY,moved:false};
      svg.classList.add('pan'); return;
    }
    drag=byId[g.dataset.id];drag._moved=false;return;}
  pan={x:e.clientX,y:e.clientY,tx:t.x,ty:t.y};svg.classList.add('pan');});
window.addEventListener('mousemove',e=>{
  if(sbox){
    const r=svg.getBoundingClientRect();
    const wx=(e.clientX-r.left-t.x)/t.k, wy=(e.clientY-r.top-t.y)/t.k;
    const x=Math.min(sbox.x0,wx), y=Math.min(sbox.y0,wy), w=Math.abs(wx-sbox.x0), hh=Math.abs(wy-sbox.y0);
    sbox.cur={x:x,y:y,w:w,h:hh};
    const sb=document.getElementById('selbox');
    if(sb){sb.setAttribute('x',x.toFixed(1));sb.setAttribute('y',y.toFixed(1));sb.setAttribute('width',w.toFixed(1));sb.setAttribute('height',hh.toFixed(1));}
    return;
  }
  if(adrag){
    const r=svg.getBoundingClientRect();
    const ax=(e.clientX-r.left-t.x)/t.k, ay=(e.clientY-r.top-t.y)/t.k;
    if(adrag.move){
      const dx=(e.clientX-adrag.sx)/t.k, dy=(e.clientY-adrag.sy)/t.k;
      adrag.a.x1=sn(adrag.ox+dx); adrag.a.y1=sn(adrag.oy+dy);
      adrag.a.x2=sn(adrag.ox2+dx); adrag.a.y2=sn(adrag.oy2+dy);
    } else if(adrag.end===1){ adrag.a.x1=sn(ax); adrag.a.y1=sn(ay); }
    else { adrag.a.x2=sn(ax); adrag.a.y2=sn(ay); }
    render(); return;
  }
  if(nres){
    const dx=(e.clientX-nres.sx)/t.k, dy=(e.clientY-nres.sy)/t.k;
    nres.n.w=Math.max(40,sn(nres.w0+dx));
    nres.n.hFix=Math.max(22,sn(nres.h0+dy));
    render(); return;
  }
  if(ndrag){
    const dx=(e.clientX-ndrag.sx)/t.k, dy=(e.clientY-ndrag.sy)/t.k;
    if(Math.abs(dx)>2||Math.abs(dy)>2)ndrag.moved=true;
    ndrag.n.x=sn(ndrag.ox+dx); ndrag.n.y=sn(ndrag.oy+dy);
    render(); return;
  }
  if(zres){
    const dx=(e.clientX-zres.sx)/t.k, dy=(e.clientY-zres.sy)/t.k;
    const box=ZBOX.find(b=>b.z===zres.z);
    if(box){box.w=Math.max(160,zres.w0+dx);box.h=Math.max(120,zres.h0+dy);}
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
  if(zdrag){
    const dx=sn((e.clientX-zdrag.sx)/t.k), dy=sn((e.clientY-zdrag.sy)/t.k);
    if(Math.abs(dx)>2||Math.abs(dy)>2)zdrag.moved=true;
    zdrag.orig.forEach(o=>{o.n.x=o.x+dx;o.n.y=o.y+dy;});
    (zdrag.boxes||[]).forEach(o=>{o.b.x=o.x+dx;o.b.y=o.y+dy;});
    render(); return;
  }
  if(pan){t.x=pan.tx+(e.clientX-pan.x);t.y=pan.ty+(e.clientY-pan.y);applyT();}
  if(dgroup&&d0){
    const dx=sn((e.clientX-d0.cx)/t.k), dy=sn((e.clientY-d0.cy)/t.k);
    if(Math.abs(dx)>2||Math.abs(dy)>2)d0.moved=true;
    dgroup.forEach(o=>{o.n.x=o.x+dx;o.n.y=o.y+dy;});
    render(); return;
  }
  if(drag){const r=svg.getBoundingClientRect();
    drag.x=sn((e.clientX-r.left-t.x)/t.k); drag.y=sn((e.clientY-r.top-t.y)/t.k);
    drag._moved=true; render();}
  const g=e.target.closest?e.target.closest('.node'):null;
  if(g&&byId[g.dataset.id]){const n=byId[g.dataset.id];
    tip.innerHTML=`<b>${n.nombre}</b><span>${(TYPE[n.tipo]||['','Equipo'])[1]} · ${n.zona}${n.ip.length?'<br>'+n.ip.join(' · '):''}</span>`;
    tip.style.opacity=1; tip.style.left=Math.min(e.clientX+16,window.innerWidth-300)+'px';
    tip.style.top=(e.clientY+16)+'px';}
  else tip.style.opacity=0;
});
function anyDrag(){
  try{ return !!(drag||ndrag||zdrag||zres||nres||bh||dgroup||adrag||pan); }catch(e){ return false; }
}
function forceRelease(){ if(anyDrag()){ try{ window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); }catch(e){} } }
document.addEventListener('mouseleave',forceRelease);
window.addEventListener('blur',forceRelease);
document.addEventListener('visibilitychange',function(){ if(document.hidden)forceRelease(); });
window.addEventListener('pointercancel',forceRelease);
window.addEventListener('mouseup',(ev)=>{
  if(adrag){ if(!adrag.move)snapArrowEnd(adrag.a,adrag.end);
    snap(); save(); adrag=null; svg.classList.remove('pan'); suppressClick=true; render(); return; }
  if(nres){ snap(); save(); nres=null; svg.classList.remove('pan'); suppressClick=true; return; }
  if(ndrag){ if(ndrag.moved){ var nn=ndrag.n; var z=zoneAt(nn._x+20,nn._y+14);
      if(z){ var bb=ZBOX.filter(function(q){return q.z===z;})[0]; nn.z=z;
        nn.ox=Math.round(nn.x-(bb?bb.x:0)); nn.oy=Math.round(nn.y-(bb?bb.y:0)); }
      snap(); save(); render(); suppressClick=true;} ndrag=null; svg.classList.remove('pan'); }
  if(zres){doc.zpos=JSON.parse(JSON.stringify(ZBOX));save();zres=null;suppressClick=true;
    svg.classList.remove('pan');return;}
  if(bh){ var quit=0; if(bh.moved)quit=dentroPrune(bh.e);
    snap(); save(); bh=null; suppressClick=true; svg.classList.remove('pan');
    if(quit){ render(); }
    return; }
  if(zdrag){
    if(zdrag.moved){zdrag.orig.forEach(o=>{o.n.nx=o.n.x;o.n.ny=o.n.y;});
      doc.zpos=JSON.parse(JSON.stringify(ZBOX)); save(); suppressClick=true;}
    zdrag=null; svg.classList.remove('pan');
  }
  if(dgroup){
    if(d0&&d0.moved){dgroup.forEach(o=>{o.n.nx=o.n.x;o.n.ny=o.n.y;});save();suppressClick=true;}
    dgroup=null;d0=null;svg.classList.remove('pan');return;
  }
  if(drag){ if(drag._moved){drag.nx=drag.x;drag.ny=drag.y;save();} else if(!(ev&&ev.__touch)) select(drag.id,false); drag=null; }
  if(sbox){
    var sb=document.getElementById('selbox'); if(sb)sb.style.display='none';
    var cur=sbox.cur;
    if(cur&&cur.w>6&&cur.h>6){
      if(!sbox.add)state.msel.clear();
      nodes.filter(vis).forEach(function(n){
        if(n.x>=cur.x&&n.x<=cur.x+cur.w&&n.y>=cur.y&&n.y<=cur.y+cur.h)state.msel.add(n.id);
      });
      state.sel=null; state.esel=null; render(); renderList(); showDetail(); suppressClick=true;
    }
    sbox=null; svg.classList.remove('pan'); return;
  }
  pan=null; svg.classList.remove('pan');});
svg.addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;return;}
  const z=e.target.dataset&&e.target.dataset.zona;
  if(z&&!(state.edit&&state.linkMode)){state.zona=state.zona===z?'':z;
    document.getElementById('fZona').value=state.zona;render();renderList();return;}
  const hit=e.target.closest('.edge-hit');
  if(hit){const[p1,p2]=hit.dataset.e.split('|');
    const ed=doc.edges.find(x=>(x.s===p1&&x.t===p2)||(x.s===p2&&x.t===p1));
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
      doc.nodes=doc.nodes.filter(x=>ids.indexOf(x.id)<0);
      doc.edges=doc.edges.filter(x=>ids.indexOf(x.s)<0&&ids.indexOf(x.t)<0);
      state.msel.clear(); state.sel=null;
      save(); rebuild(); layout(); rebuildUI(); render(); renderList(); showDetail(); return;
    }
    if(state.arrowSel){
      const ar=(doc.arrows||[]).filter(x=>x.id===state.arrowSel)[0];
      if(ar){ e.preventDefault();
        if(confirm('\u00bfEliminar esta flecha?')){
          snap(); doc.arrows=doc.arrows.filter(x=>x.id!==ar.id);
          state.arrowSel=null; save(); render();
        }
        return; }
    }
    if(state.esel){
      const ed=doc.edges.find(x=>(x.s===state.esel.s&&x.t===state.esel.t)||(x.s===state.esel.t&&x.t===state.esel.s));
      if(ed){ e.preventDefault();
        if(confirm('\u00bfEliminar el enlace entre '+(byId[ed.s]||{}).nombre+' y '+(byId[ed.t]||{}).nombre+'?')){
          snap(); doc.edges=doc.edges.filter(x=>x!==ed);
          state.esel=null; save(); rebuild(); render(); renderList(); showDetail();
        }
        return; }
    }
    if(state.sel&&byId[state.sel]){ e.preventDefault(); delNode(state.sel); return; }
  }
});

// red de seguridad: si algo falla al soltar, nunca dejar el equipo pegado al raton
window.addEventListener('mouseup',function(){
  try{
    if(drag){ if(drag._moved){ drag.nx=drag.x; drag.ny=drag.y; try{save();}catch(e){} } drag=null; svg.classList.remove('pan'); }
    if(dgroup){ dgroup=null; d0=null; svg.classList.remove('pan'); }
    if(ndrag){ ndrag=null; svg.classList.remove('pan'); }
    if(zdrag){ zdrag=null; svg.classList.remove('pan'); }
    if(pan){ pan=null; svg.classList.remove('pan'); }
  }catch(e){}
});
