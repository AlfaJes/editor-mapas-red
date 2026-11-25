function render(){
  var _gr=document.getElementById('gridrect'); if(_gr)_gr.style.display=state.grid?'':'none';
  var _gn=document.getElementById('gNotes'); if(_gn)_gn.innerHTML=notesHTML();
  var _ga=document.getElementById('gArrows'); if(_ga)_ga.innerHTML=arrowsHTML();
  DUPI=dupInfo(); DUPS=dupSet();
  const shown=nodes.filter(vis);
  GH.ondblclick=function(ev){
    var t=ev.target; if(!t||!t.getAttribute)return;
    var zz=t.getAttribute('data-zona'); if(!zz)return;
    ev.preventDefault(); ev.stopPropagation();
    var nv=window.prompt('Nuevo nombre para la secci\u00f3n "'+zz+'"',zz);
    if(nv!=null)renombrarZona(zz,nv);
  };
  GH.innerHTML=state.hulls?ZBOX.filter(b=>shown.some(n=>n.zona===b.z)||(doc.zonasExtra||[]).indexOf(b.z)>=0).map(b=>{
    const pw=Math.round(b.z.length*7.6+24);
    return `<rect class="hull${doc.zparent&&doc.zparent[b.z]?' sub':''}" data-zona="${b.z}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="14"/>
    <rect class="hull-pill" data-zona="${b.z}" x="${b.x+11}" y="${b.y+8}" width="${pw}" height="21" rx="10"/>
    <text class="hull-l" data-zona="${b.z}" x="${b.x+23}" y="${b.y+23}">${b.z}</text>
    <rect class="zh" data-zona="${b.z}" x="${b.x+b.w-10}" y="${b.y+b.h-10}" width="15" height="15" rx="3"/>`;}).join(''):'';
  G.innerHTML=(state.edges?edges.filter(e=>vis(byId[e.s])&&vis(byId[e.t])).map(e=>{
    const a=byId[e.s],b=byId[e.t];
    const isSel=state.esel&&((state.esel.s===e.s&&state.esel.t===e.t)||(state.esel.s===e.t&&state.esel.t===e.s));
    const hl=isSel||(state.sel&&(state.sel===e.s||state.sel===e.t));
    const d=edgeD(a,b,e);
    const onP=state.path&&inPath(e.s,e.t);
    var EN=e._ends||[a.x,a.y,b.x,b.y];
    var pinCol=cabColor(e)||'#6ea8ff';
    const ecol=cabColor(e);
    return `<path class="edge${hl?' hl':''}${e.hide?' hid':''}${onP?' on':''}" d="${d}"${ecol?` style="stroke:${ecol}"`:''}/>
      <path class="edge-hit" data-e="${e.s}|${e.t}" d="${d}"/>`+
      (e.hide?'':`<circle class="epin" cx="${EN[0].toFixed(1)}" cy="${EN[1].toFixed(1)}" r="5.2" style="fill:${pinCol}"/>`+
        `<circle class="epin" cx="${EN[2].toFixed(1)}" cy="${EN[3].toFixed(1)}" r="5.2" style="fill:${pinCol}"/>`)+
      elabBox(e);}).join(''):'')
    ;
  GX.innerHTML=(state.esel?(()=>{const e=doc.edges.find(x=>(x.s===state.esel.s&&x.t===state.esel.t)||(x.s===state.esel.t&&x.t===state.esel.s));
      if(!e)return'';
      const AA=byId[e.s],BB=byId[e.t],PP=Array.isArray(e.pts)?e.pts:[];
      const anch=[[AA.x,AA.y]].concat(PP).concat([[BB.x,BB.y]]);
      let out='';
      PP.forEach((q,i)=>{ out+=`<circle class="eh" data-e="${e.s}|${e.t}" data-i="${i}" cx="${q[0]}" cy="${q[1]}" r="6"/>`; });
      for(let i=0;i<anch.length-1;i++){
        const dxs=anch[i+1][0]-anch[i][0], dys=anch[i+1][1]-anch[i][1];
        if(Math.sqrt(dxs*dxs+dys*dys)<40)continue;
        const m=segMid(anch,i,PP.length,e);
        out+=`<circle class="ehadd" data-e="${e.s}|${e.t}" data-mi="${i}" cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="4.5"/>`;
      }
      return out;})():'');
  (function ajustarAsas(){
    var asas=GX.querySelectorAll('.ehadd,.eh');
    for(var i=0;i<asas.length;i++){
      var c=asas[i], key=c.getAttribute('data-e');
      if(!key)continue;
      var hit=G.querySelector('path.edge-hit[data-e="'+key+'"]');
      if(!hit)continue;
      var L=hit.getTotalLength(); if(!L)continue;
      var cx=parseFloat(c.getAttribute('cx')), cy=parseFloat(c.getAttribute('cy'));
      var best=1e12, bx=cx, by=cy, paso=Math.max(1,L/240);
      for(var t=0;t<=L;t+=paso){
        var pp=hit.getPointAtLength(t);
        var dx=pp.x-cx, dy=pp.y-cy, d=dx*dx+dy*dy;
        if(d<best){ best=d; bx=pp.x; by=pp.y; if(best<0.04)break; }
      }
      c.setAttribute('cx',bx.toFixed(1)); c.setAttribute('cy',by.toFixed(1));
    }
  })();
  GN.innerHTML=shown.map(n=>{
    const cls=['node']; if(state.sel===n.id)cls.push('sel');
    if(DUPS.has(n.id))cls.push('dup');
    if(state.linkMode)cls.push('linking');
    if(state.pending===n.id)cls.push('pend');
    if(state.msel.has(n.id))cls.push('msel');
    if(state.path&&state.path.indexOf(n.id)>=0)cls.push('path');
    const c=col(n);
    const halo=state.sel&&adj[state.sel]&&adj[state.sel].has(n.id)
      ?`<circle class="halo" cx="${n.x}" cy="${n.y}" r="25"/>`:'';
    return `<g class="${cls.join(' ')}" data-id="${n.id}"><title>${escAttr(n.nombre)}</title>
      <circle class="badge" cx="${n.x}" cy="${n.y}" r="18" fill="${c}2e" stroke="${c}" stroke-width="2"/>
      <g class="ic" transform="translate(${n.x-11},${n.y-11}) scale(0.92)" fill="none" stroke="${c}"
         stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${ICONS[n.ico]||ICONS[n.tipo]||ICONS.otro}</g>
      ${halo}</g>`;}).join('');
  GL.innerHTML=state.labels?shown.map(n=>{
    const L=wrap2(n.nombre,17);
    const ip=state.showIp&&n.ip.length?`<text class="ip" x="${n.x}" y="${n.y+37+13*L.length}" fill="#8fb3dd">${n.ip[0]}${n.ip.length>1?' +'+(n.ip.length-1):''}</text>`:'';
    return L.map((t,i)=>`<text x="${n.x}" y="${n.y+37+13*i}" fill="#dbe9ff">${escAttr(t)}</text>`).join('')+ip;}).join(''):'';
  if(GE)GE.innerHTML=(state.edges&&state.elab)?edges.filter(e=>e.etq&&!e.hide).map(e=>{
    const a=byId[e.s],b=byId[e.t];
    return `<text class="elab" x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2-6}" text-anchor="middle">${escAttr(e.etq)}</text>`;
  }).join(''):'';
}
function renderList(){
  const l=document.getElementById('list'),items=nodes.filter(vis);
  const _c=document.getElementById('count'); if(_c)_c.textContent=items.length;
  if(!items.length){l.innerHTML='<div class="empty">Sin resultados</div>';return;}
  items.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  l.innerHTML=items.map(n=>`<div class="item${state.sel===n.id?' on':''}" data-id="${n.id}">
    <span class="dot" style="background:${col(n)};box-shadow:0 0 0 2px ${netcol(n)}55"></span>
    <span style="min-width:0;flex:1"><div class="iname">${n.nombre}</div>
    <div class="iip">${n.ip.length?n.ip.join(' · '):cut(n.zona,26)}</div></span></div>`).join('');
  l.querySelectorAll('.item').forEach(el=>el.onclick=()=>select(el.dataset.id,true));
  if(state.view==='rack')renderRack();
}
function select(id,center){
  if(state.editing&&state.editing!==id)state.editing=null;
  if(state.pathMode){
    if(!state.pathA){state.pathA=id;state.sel=id;pathHint(true,'Origen: '+(byId[id]?byId[id].nombre:'')+' \u2014 pulsa el destino');render();showDetail();return;}
    state.path=bfsPath(state.pathA,id);
    state.pathA=null; state.pathMode=false; setBtn('bPath',false); pathHint(false);
    state.sel=null; render(); showDetail(); return;
  }
  if(state.edit&&state.linkMode){
    if(!state.pending){state.pending=id;render();return;}
    if(state.pending!==id){addLink(state.pending,id);state.pending=null;state.linkMode=false;setBtn('bLink',false);render();renderList();}
    return;
  }
  state.sel=state.sel===id?null:id; state.esel=null; render(); renderList(); showDetail();
  if(state.sel&&center)centerOn(byId[id]);
}
function pathHint(on,txt){
  var el=document.getElementById('pathhint');
  if(!el){
    el=document.createElement('div'); el.id='pathhint';
    el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:80;'+
      'background:#132a4a;border:1px solid #2f5d97;color:#dcebff;padding:8px 16px;border-radius:999px;'+
      'font-size:12.5px;box-shadow:0 10px 28px rgba(0,0,0,.5);display:none;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent=txt||'';
  el.style.display=on?'':'none';
}
function centerOn(n){const W=svg.clientWidth||1200,H=svg.clientHeight||800;
  t.x=W/2-n.x*t.k; t.y=H/2-n.y*t.k; applyT();}

const v=x=>x&&x!==''?x:'—';
function mineOn(nid){
  return doc.edges.map(function(e){
    if(e.s===nid)return {port:e.pA||1,other:e.t,e:e};
    if(e.t===nid)return {port:e.pB||1,other:e.s,e:e};
    return null;
  }).filter(Boolean);
}
function portGrid(n){
  const cap=parseInt(n.puertos)||0;
  const items=[];
  doc.edges.forEach(function(e,idx){
    if(e.s===n.id)items.push({port:e.pA||1,other:e.t,e:e,idx:idx,side:'s'});
    else if(e.t===n.id)items.push({port:e.pB||1,other:e.s,e:e,idx:idx,side:'t'});
  });
  const capN=capFor(n.id);
  const N=Math.max(cap||8, capN);
  let cells='';
  for(let p=1;p<=N;p++){
    const it=items.find(x=>x.port===p);
    if(it){const d=byId[it.other];
      cells+=`<div class="pcell on" data-id="${d.id}" title="P${p} · ${escAttr(d.nombre)}">${p}<span class="d" style="background:${col(d)}"></span></div>`;}
    else cells+=`<div class="pcell">${p}</div>`;
  }
  const rows=items.slice().sort((a,b)=>a.port-b.port).map(it=>{
    const d=byId[it.other]; if(!d)return '';
    const ocup={};
    items.forEach(function(y){ if(y.e!==it.e) ocup[y.port]=1; });
    let ops='';
    for(let q=1;q<=capN;q++){ if(ocup[q]&&q!==it.port)continue;
      ops+=`<option value="${q}"${q===it.port?' selected':''}>P${q}</option>`; }
    const tip=(TYPE[d.tipo]||['',''])[1]||'', ipp=(d.ip&&d.ip[0])?d.ip[0]:'';
    return `<div class="prowC" data-id="${d.id}"><select class="psel" data-ei="${it.idx}" data-side="${it.side}" title="Cambiar el puerto de este cable">${ops}</select>`+
      `<div class="pconn"><b>${escAttr(d.nombre)}</b><small>${escAttr(tip)}${ipp?' · '+escAttr(ipp):''}</small></div></div>`;
  }).join('');
  return `<div class="pcap"><span>Puertos · cambia el puerto en la lista</span><span>${items.length}/${N}</span></div>
    <div class="pgrid">${cells}</div>
    <div class="plist">${rows||'<div class="empty" style="padding:5px 0">Sin conexiones</div>'}</div>`;
}
function assignPort(e,side,np){
  if(!e||!np)return false;
  var id=(side==='s')?e.s:e.t, dev=byId[id]; if(!dev)return false;
  var cur=(side==='s')?e.pA:e.pB;
  if(np===cur)return true;
  var busy=null;
  doc.edges.forEach(function(x){ if(x===e)return;
    if(side==='s'&&x.s===id&&x.pA===np)busy=x;
    if(side==='t'&&x.t===id&&x.pB===np)busy=x; });
  if(busy){
    var otro=byId[busy.s===id?busy.t:busy.s];
    if(!confirm('El puerto '+np+' de '+dev.nombre+' ya lo ocupa '+(otro?otro.nombre:'otro equipo')+'. ¿Intercambiar los dos?'))return false;
    if(side==='s')busy.pA=cur; else busy.pB=cur;
    syncRackPort(busy);
  }
  if(side==='s')e.pA=np; else e.pB=np;
  syncRackPort(e); snap(); save(); render(); showDetail();
  return true;
}
