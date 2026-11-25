// ---------- vista rack ----------
const RACK=document.getElementById('rack');
const ORDT=['router','firewall','switch','server','nas','nvr','wifi','pc','otro'];

/* ---------- armario gráfico ---------- */
function rackZonas(){
  var zs={};
  nodes.forEach(function(n){ if(n.zona){ zs[n.zona]=(zs[n.zona]||0)+1; } });
  return Object.keys(zs).sort(function(a,b){return a.localeCompare(b,'es');});
}
function rackZonasBool(){ return rackZonas(); }
function rackU(n){
  var fijo=parseInt(n.u);
  if(fijo>0)return Math.max(1,Math.min(8,fijo));
  var t=n.tipo;
  if(t==='servidor'||t==='nas')return 2;
  if(t==='ups')return 3;
  return 1;
}
function gotoMapa(id){
  state.view='mapa'; document.body.classList.remove('viewrack');
  var b=document.getElementById('bRack'); if(b){ b.classList.remove('on'); b.textContent='\ud83d\uddc4 Rack'; }
  render(); select(id,true);
}
function rackIdsDom(z){
  var out=[];
  RACK.querySelectorAll('.cabrow').forEach(function(g){
    if(g.getAttribute('data-zone')===z) out.push(g.getAttribute('data-id'));
  });
  return out;
}
function rackMove(dir){
  var id=state.rackSel; if(!id)return;
  var n=byId[id]; if(!n)return;
  var z=n.zona||'';
  var ids=rackIdsDom(z);
  var i=ids.indexOf(id); if(i<0)return;
  var j=i+dir; if(j<0||j>=ids.length)return;
  ids.splice(i,1); ids.splice(j,0,id);
  doc.rackOrder=doc.rackOrder||{}; doc.rackOrder[z]=ids;
  save(); renderRack();
}
function rackOrderOf(z){
  var arr=(doc.rackOrder&&doc.rackOrder[z])?doc.rackOrder[z]:[];
  return Array.isArray(arr)?arr:[];
}
function rackCabinet(zone){
  if(zone==='*'){
    var off=(doc.rackZonesOff||[]);
    var zs=rackZonasBool().filter(function(z){return off.indexOf(z)<0;});
    return zs.map(function(z){ return '<div class="cabttl">'+escAttr(z)+'<span class="cabx" data-zoff="'+escAttr(z)+'" title="Quitar este armario">\u2715</span></div>'+rackCabinet(z); }).join('')
      ||'<div class="empty">No hay armarios visibles</div>';
  }
  var U=22, X0=64, W=430, PADT=26;
  var RT=['patch','switch','router','firewall','servidor','nas','ups','nvr'];
  var hid=(doc.rackHidden||[]);
  var devs=nodes.filter(function(n){
    if(n.zona!==zone)return false;
    if(hid.indexOf(n.id)>=0)return false;
    if(state.rackOnly&&RT.indexOf(n.tipo)<0)return false;
    return true;
  });
  var ord={patch:0,switch:1,router:2,firewall:3,ups:4,servidor:5,nas:6,nvr:7,wifi:8,pc:9};
  var manual=rackOrderOf(zone);
  devs.sort(function(a,b){
    var ia=manual.indexOf(a.id), ib=manual.indexOf(b.id);
    if(ia>=0||ib>=0){
      if(ia<0)return 1; if(ib<0)return -1; return ia-ib;
    }
    var oa=ord[a.tipo]===undefined?9:ord[a.tipo], ob=ord[b.tipo]===undefined?9:ord[b.tipo];
    return (oa-ob)||a.nombre.localeCompare(b.nombre,'es');
  });
  var rows=[], y=PADT, total=1;
  var patches=(doc.patches&&doc.patches[zone])?doc.patches[zone]:[];
  patches.forEach(function(pt,pi){
    rows.push({pp:true,pi:pi,p:pt,n:{id:'__pp'+pi,nombre:(pt.n||'Patch panel'),tipo:'patch',ip:[]},y:y,h:U-4,u:1});
    y+=U; total+=1;
  });
  devs.forEach(function(n){
    var u=rackU(n), h=u*U-4;
    rows.push({n:n,y:y,h:h,u:u});
    y+=u*U; total+=u;
  });
  var H=Math.max(240,y+30), Wtot=830;
  var s='<svg class="cabsvg" viewBox="0 0 '+Wtot+' '+H+'" width="100%" xmlns="http://www.w3.org/2000/svg">';
  s+='<rect x="8" y="8" width="'+(Wtot-16)+'" height="'+(H-16)+'" rx="10" fill="#0d1626" stroke="#243350"/>';
  // regla de U
  for(var i=0;i<total;i++){
    var yy=PADT+i*U;
    s+='<text x="30" y="'+(yy+15)+'" class="cabu">U'+(total-i)+'</text>';
    s+='<line x1="44" y1="'+(yy+U)+'" x2="'+(Wtot-20)+'" y2="'+(yy+U)+'" stroke="#16233a" stroke-width="1"/>';
  }
  // equipos
  rows.forEach(function(r){
    var n=r.n, c=col(n);
    if(r.pp){
      var np=Math.min(48,parseInt(r.p&&r.p.ports)||24);
      s+='<g class="cabrow" data-pp="'+r.pi+'" data-zone="'+escAttr(zone)+'">';
      s+='<rect x="'+X0+'" y="'+r.y+'" width="'+W+'" height="'+r.h+'" rx="4" fill="#182238" stroke="#33435e" stroke-dasharray="4 3"/>';
      s+='<rect x="'+X0+'" y="'+r.y+'" width="5" height="'+r.h+'" rx="2" fill="#8b9cb3"/>';
      var pnm=String(r.p&&r.p.n||'Patch panel');
      s+='<text x="'+(X0+14)+'" y="'+(r.y+14)+'" class="cabn">'+escAttr(pnm.length>24?pnm.slice(0,23)+'\u2026':pnm)+'</text>';
      s+='<text x="'+(X0+W-26)+'" y="'+(r.y+14)+'" class="cabs" text-anchor="end">Patch panel</text>';
      s+='<text class="cabxx" data-pdel="'+r.pi+'" x="'+(X0+W-8)+'" y="'+(r.y+15)+'" text-anchor="end" style="font-size:12px;cursor:pointer;fill:#5d7a9e">\u2715</text>';
      var stX=X0+24+pnm.length*6.0, usW=Math.max(70,(X0+W-80)-stX), stp=usW/np;
      for(var q=1;q<=np;q++){
        s+='<rect x="'+(stX+(q-1)*stp).toFixed(1)+'" y="'+(r.y+r.h-9)+'" width="'+Math.max(1.6,stp-1.2).toFixed(1)+'" height="5" rx="1" fill="'+(q%6===0?'#5b7fae':'#22344f')+'"/>';
      }
      s+='</g>';
      return;
    }
    s+='<g class="cabrow'+(state.rackSel===n.id?' sel':'')+'" data-id="'+n.id+'" data-y="'+r.y+'" data-zone="'+escAttr(zone)+'" style="cursor:pointer">';
    s+='<rect x="'+X0+'" y="'+r.y+'" width="'+W+'" height="'+r.h+'" rx="4" fill="#132239" stroke="#2b4368"/>';
    s+='<rect x="'+X0+'" y="'+r.y+'" width="5" height="'+r.h+'" rx="2" fill="'+c+'"/>';
    var nm=String(n.nombre||'');
    if(nm.length>26)nm=nm.slice(0,25)+'\u2026';
    s+='<text x="'+(X0+14)+'" y="'+(r.y+14)+'" class="cabn">'+escAttr(nm)+'</text>';
    s+='<text x="'+(X0+W-26)+'" y="'+(r.y+14)+'" class="cabs" text-anchor="end">'+escAttr((TYPE[n.tipo]||['',''])[1])+'</text>'+
       '<text class="cabxx" data-hide="'+n.id+'" x="'+(X0+W-8)+'" y="'+(r.y+15)+'" text-anchor="end" style="font-size:12px;cursor:pointer;fill:#5d7a9e">\u2715</text>';
    if(r.u>1){
      s+='<text x="'+(X0+14)+'" y="'+(r.y+32)+'" class="cabi">'+escAttr(n.ip[0]||'sin IP')+'</text>';
    }
    // tiras de puertos
    var cap=Math.min(28, capFor(n.id));
    var nameW=Math.min(240, nm.length*6.4+10);
    var stripX=X0+20+nameW;
    var usable=Math.max(60, (X0+W-78)-stripX);
    var step=usable/Math.max(1,cap);
    for(var p=1;p<=cap;p++){
      var px=stripX+(p-1)*step;
      var used=doc.edges.some(function(e){return (e.s===n.id&&e.pA===p)||(e.t===n.id&&e.pB===p);});
      s+='<rect x="'+px.toFixed(1)+'" y="'+(r.y+r.h-9)+'" width="'+Math.max(2,step-1.5).toFixed(1)+'" height="5" rx="1" fill="'+(used?'#4f8cff':'#22344f')+'"/>';
    }
    s+='</g>';
  });
  if(!rows.length){
    s+='<text x="'+(Wtot/2)+'" y="'+(H/2)+'" class="cabi" text-anchor="middle">Esta sección no tiene equipos</text>';
  }
  // cables
  var idx={}; rows.forEach(function(r,i){ idx[r.n.id]=r; });
  var lane=0;
  doc.edges.forEach(function(e){
    var A=idx[e.s], B=idx[e.t];
    if(!A&&!B)return;
    var c=e.color||'#5f86bd';
    var gap=64+(lane%6)*9; lane++;
    if(A&&B){
      var x1=X0+W+8, y1=A.y+A.h/2, x2=X0+W+8, y2=B.y+B.h/2;
      var mx=X0+W+gap;
      s+='<path d="M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2+'" fill="none" stroke="'+c+'" stroke-width="1.6" opacity=".85"><title>'+
        escAttr(A.n.nombre)+' P'+(e.pA||1)+' \u2194 '+escAttr(B.n.nombre)+' P'+(e.pB||1)+'</title></path>';
    } else {
      var R=A||B, other=byId[A?e.t:e.s];
      var y0=R.y+R.h/2;
      s+='<path d="M'+(X0+W+8)+','+y0+' C'+(X0+W+gap+26)+','+y0+' '+(X0+W+gap+26)+','+(y0+14)+' '+(Wtot-26)+','+(y0+14)+
        '" fill="none" stroke="'+c+'" stroke-width="1.4" stroke-dasharray="5 4" opacity=".65"><title>sale a '+
        escAttr(other?other.nombre:'?')+'</title></path>';
    }
  });
  s+='</svg>';
  return s;
}
function renderRack(){
  if(!RACK)return;
  var mode=state.rackMode||'lista';
  if(mode==='armario'){ renderArmarios(); return; }

  if(!RACK)return;
  var mode=state.rackMode||'lista';
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
      ((doc.rackHidden&&doc.rackHidden.length)?'<button class="btn sm" id="rkrest">Restaurar '+doc.rackHidden.length+'</button>':'')+
      (state.rackSel?'<span class="rkord"><button class="btn sm" id="rkup" title="Subir un puesto">\u25b2 Subir</button><button class="btn sm" id="rkdn" title="Bajar un puesto">\u25bc Bajar</button><button class="btn sm" id="rkgoto">Ver en el mapa</button></span>':'')):'' )+
    '</div>';
  RACK.innerHTML=head+(mode==='armario'?('<div class="cabwrap">'+rackCabinet(cur)+'</div>'):rackLista());
  RACK.querySelectorAll('[data-rm]').forEach(function(b){
    b.onclick=function(){ state.rackMode=b.getAttribute('data-rm'); renderRack(); };
  });
  if(mode!=='armario') rackBind();
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
    doc.patches=doc.patches||{}; doc.patches[z]=doc.patches[z]||[];
    doc.patches[z].push({n:'Patch '+(doc.patches[z].length+1)+' (24)',ports:24});
    save(); renderRack();
  };
  RACK.querySelectorAll('[data-pdel]').forEach(function(x){
    x.onclick=function(ev){ ev.stopPropagation();
      var z=x.closest('[data-zone]')?x.closest('[data-zone]').getAttribute('data-zone'):state.rackZone;
      var i=parseInt(x.getAttribute('data-pdel'),10);
      if(doc.patches&&doc.patches[z]){ doc.patches[z].splice(i,1); save(); renderRack(); }
    };
  });
  var ro=document.getElementById('rkonly'); if(ro)ro.onclick=function(){ state.rackOnly=!state.rackOnly; try{localStorage.setItem('nm_rackonly',state.rackOnly?'1':'0');}catch(e){} renderRack(); };
  var rr=document.getElementById('rkrest'); if(rr)rr.onclick=function(){ doc.rackHidden=[]; save(); renderRack(); };
  RACK.querySelectorAll('.cabxx[data-hide]').forEach(function(x){
    x.onclick=function(ev){ ev.stopPropagation(); var id=x.getAttribute('data-hide');
      doc.rackHidden=(doc.rackHidden||[]); if(doc.rackHidden.indexOf(id)<0)doc.rackHidden.push(id);
      save(); renderRack(); };
  });
  RACK.querySelectorAll('.cabx[data-zoff]').forEach(function(x){
    x.onclick=function(ev){ ev.stopPropagation(); var z=x.getAttribute('data-zoff');
      doc.rackZonesOff=(doc.rackZonesOff||[]); if(doc.rackZonesOff.indexOf(z)<0)doc.rackZonesOff.push(z);
      save(); renderRack(); };
  });
  var bu=document.getElementById('rkup'); if(bu)bu.onclick=function(){ rackMove(-1); };
  var bd=document.getElementById('rkdn'); if(bd)bd.onclick=function(){ rackMove(1); };
  var bg=document.getElementById('rkgoto'); if(bg)bg.onclick=function(){ if(state.rackSel)gotoMapa(state.rackSel); };
  try{bindRackDrag();}catch(e){}
}

function rackLista(){
  if(!RACK)return;
  const rz=[...new Set(nodes.filter(n=>/rack|armario/i.test(n.zona)).map(n=>n.zona))].sort();
  const sws=nodes.filter(n=>n.tipo==='switch'||n.tipo==='router')
    .sort((a,b)=>a.zona.localeCompare(b.zona,'es')||a.nombre.localeCompare(b.nombre,'es'));
  let out='<div class="racks">';
  rz.forEach(z=>{
    const m=nodes.filter(n=>n.zona===z).sort((a,b)=>
      ((ORDT.indexOf(a.tipo)+1||9)-(ORDT.indexOf(b.tipo)+1||9))||a.nombre.localeCompare(b.nombre,'es'));
    out+=`<div class="rcard"><div class="rhead"><div><div class="rname">${z}</div>
      <div class="rmeta">${m.length} equipos en el armario</div></div></div><div class="rslots">`+
      m.map(n=>`<div class="slot used" data-id="${n.id}"><span class="dot" style="background:${col(n)}"></span>
        <span class="sn">${n.nombre}</span><span class="st">${(TYPE[n.tipo]||['',''])[1]}</span>
        <span class="sip">${n.ip[0]||''}</span></div>`).join('')+`</div></div>`;
  });
  sws.forEach(sw=>{
    const cap=parseInt(sw.puertos)||0;
    const mine=doc.edges.filter(e=>e.h===sw.id);
    const N=cap>0?Math.max(cap,...mine.map(e=>e.port)):Math.max(8,...mine.map(e=>e.port));
    const linked=new Set(mine.map(e=>e.s===sw.id?e.t:e.s));
    let rows='';
    for(let p=1;p<=N;p++){
      const e=mine.find(x=>x.port===p);
      if(e){const dev=byId[e.s===sw.id?e.t:e.s];
        rows+=`<div class="slot used" data-id="${dev.id}"><span class="pnum">${p}</span>
          <span class="dot" style="background:${col(dev)}"></span><span class="sn">${dev.nombre}</span>
          <span class="st">${(TYPE[dev.tipo]||['',''])[1]}</span>
          <button class="x" data-h="${sw.id}" data-d="${dev.id}">✕</button></div>`;
      } else {
        const opts=nodes.filter(x=>x.id!==sw.id&&!linked.has(x.id))
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
function rackBind(){
  RACK.querySelectorAll('.slot.used').forEach(el=>el.onclick=ev=>{
    if(ev.target.tagName==='BUTTON'||ev.target.tagName==='SELECT')return; gotoMapa(el.dataset.id);});
  RACK.querySelectorAll('.x').forEach(b=>b.onclick=ev=>{ev.stopPropagation();delLink(b.dataset.h,b.dataset.d);});
  RACK.querySelectorAll('.psel').forEach(s=>s.onchange=ev=>{
    const d=ev.target.value; if(!d)return;
    snap(); doc.edges.push({s:s.dataset.h,t:d,h:s.dataset.h,port:+s.dataset.p});
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
function bindTitle(){
  [['ttl','title'],['sub','sub']].forEach(function(pair){
    var id=pair[0], key=pair[1];
    var el=document.getElementById(id); if(!el)return;
    el.addEventListener('blur',function(){
      var v=el.textContent.replace(/\s+/g,' ').trim();
      doc[key]=v||(key==='title'?DATA.titulo:DATA.sub);
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
function exportRackPNG(){
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
function rackRowIds(zone){
  var out=[];
  Array.prototype.forEach.call(document.querySelectorAll('.cabrow[data-zone]'),function(g){
    if(g.getAttribute('data-pp'))return;
    if(g.getAttribute('data-zone')!==zone)return;
    out.push(g.getAttribute('data-id'));
  });
  return out;
}
function bindRackDrag(){
  Array.prototype.forEach.call(RACK.querySelectorAll('.cabrow'),function(g){
    if(g.getAttribute('data-pp'))return;
    g.addEventListener('mousedown',function(ev){
      if(ev.target.closest('[data-hide]'))return;
      ev.preventDefault();
      var id=g.getAttribute('data-id'), zone=g.getAttribute('data-zone');
      var y0=ev.clientY, moved=false;
      function mm(e2){
        var dy=e2.clientY-y0;
        if(Math.abs(dy)>4){ moved=true; g.setAttribute('transform','translate(0,'+dy+')'); g.style.opacity=.72; }
      }
      function mu(e2){
        window.removeEventListener('mousemove',mm); window.removeEventListener('mouseup',mu);
        g.removeAttribute('transform'); g.style.opacity='';
        if(!moved){ state.rackSel=id; renderRack(); return; }
        var pasos=Math.round((e2.clientY-y0)/22);
        if(!pasos)return;
        var ids=rackRowIds(zone), i=ids.indexOf(id);
        if(i<0)return;
        var j=Math.max(0,Math.min(ids.length-1,i+pasos));
        if(j===i)return;
        ids.splice(i,1); ids.splice(j,0,id);
        doc.rackOrder=doc.rackOrder||{}; doc.rackOrder[zone]=ids;
        state.rackSel=id; save(); renderRack();
      }
      window.addEventListener('mousemove',mm); window.addEventListener('mouseup',mu);
    });
  });
}
