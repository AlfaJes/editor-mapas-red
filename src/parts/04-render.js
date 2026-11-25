// ---------- svg ----------
const svg=document.getElementById('map'),world=document.getElementById('world');
const G=document.getElementById('gEdges'),GH=document.getElementById('gHulls'),
      GN=document.getElementById('gNodes'),GL=document.getElementById('gLabels'),
      GE=document.getElementById('gELab'),
      GX=document.getElementById('gHandles');
const tip=document.getElementById('tip');
const t={x:0,y:0,k:1};
function applyT(){ world.setAttribute('transform',`translate(${t.x},${t.y}) scale(${t.k})`);
  GL.style.opacity=t.k<0.30?0.35:1; }
function fit(){
  if(!nodes.length)return;
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const x0=Math.min(...xs)-92,x1=Math.max(...xs)+92,y0=Math.min(...ys)-92,y1=Math.max(...ys)+64;
  const W=svg.clientWidth||1200,H=svg.clientHeight||800;
  t.k=Math.min(W/(x1-x0),H/(y1-y0),2.2); t.x=W/2-(x0+x1)/2*t.k; t.y=H/2-(y0+y1)/2*t.k; applyT();
}
const C=k=>(doc&&doc.colors&&doc.colors[k])||(TYPE[k]||['#94a3b8'])[0];
function hashCol(s){let x=0;s=String(s||'');for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))>>>0;
  return 'hsl('+(x%360)+' 62% 58%)';}
function colOf(n){
  if(state.colorBy==='red')return n.nets.length?netColOf(n.nets[0]):'#475569';
  if(state.colorBy==='zona')return hashCol(n.zona);
  if(state.colorBy==='vlan'){const m=String(n.vlan||'').match(/\d+/);return m?hashCol('v'+m[0]):'#475569';}
  return C(n.tipo);
}
const col=n=>colOf(n);
const ICONS={patch:'<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9v6M9.5 9v6M13 9v6M16.5 9v6M20 9v6"/>',pc:'<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',switch:'<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M6 12h.01M9.5 12h.01M13 12h.01M16.5 12h.01"/>',router:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.6v8.8M7.6 12h8.8M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2"/>',firewall:'<path d="M12 3l7.5 3v6.2c0 4.3-3.1 7.6-7.5 9.3-4.4-1.7-7.5-5-7.5-9.3V6z"/>',server:'<rect x="4" y="3.5" width="16" height="7" rx="1.5"/><rect x="4" y="13.5" width="16" height="7" rx="1.5"/><path d="M7.5 7h.01M7.5 17h.01"/>',nas:'<rect x="4" y="3" width="16" height="4.6" rx="1.2"/><rect x="4" y="9.7" width="16" height="4.6" rx="1.2"/><rect x="4" y="16.4" width="16" height="4.6" rx="1.2"/>',wifi:'<path d="M4 9.5a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M9.8 16.4a4 4 0 0 1 4.4 0"/><circle cx="12" cy="19.6" r="1"/>',nvr:'<path d="M3 8.5h11.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3z"/><path d="M16.5 12l4.5-2.5v7L16.5 14"/><circle cx="7.5" cy="12" r="1.6"/>',otro:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 9v6M9 12h6"/>',maquina:'<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9L18 18M18 6l-2.1 2.1M8.1 15.9L6 18"/>',cnc:'<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M12 9v6M9.5 20h5M12 15l-2.2 2.2h4.4z"/>',plc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7M8.5 11h7M8.5 15h4"/>',impresora:'<path d="M7 8V4h10v4"/><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',camara:'<path d="M3 8h10l4-2.5v13L13 16H3z"/><circle cx="19" cy="12" r="1.6"/>',ups:'<rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M11 7l-1.6 4.5h2.6L10.6 17l4-5.4h-2.6L12 7z"/>',vm:'<rect x="2.5" y="4" width="13" height="9.5" rx="1.5"/><path d="M18 8h2.2a1.3 1.3 0 0 1 1.3 1.3V18a1.3 1.3 0 0 1-1.3 1.3H9.6A1.3 1.3 0 0 1 8.3 18v-1.6"/><path d="M6 8.2h6M6 11h4"/>'};
const netcol=n=>!n.nets.length?'#41547a':n.nets.length>1?'#f472b6':(netColOf(n.nets[0])||'#41547a');
const R=n=>11;
function wrap2(s,max){
  s=String(s||'');
  if(s.length<=max)return [s];
  let c=s.lastIndexOf(' ',max); if(c<5)c=Math.ceil(s.length/2);
  return [s.slice(0,c).trim(), s.slice(c).trim().slice(0,max+2)];
}
const GRID=12;
const sn=v=>state.grid?Math.round(v/GRID)*GRID:v;
const cut=(s,m)=>String(s||'').length>m?String(s).slice(0,m-1)+'…':String(s||'');
function dupInfo(){
  const first={},out={};
  nodes.forEach(n=>(n.ip||[]).forEach(ip=>{
    const k=String(ip||'').trim(); if(!k)return;
    if(first[k]&&first[k].id!==n.id){
      (out[n.id]=out[n.id]||[]).push({ip:k,other:first[k].nombre});
      (out[first[k].id]=out[first[k].id]||[]).push({ip:k,other:n.nombre});
    } else if(!first[k]) first[k]={id:n.id,nombre:n.nombre};
  }));
  return out;
}
function netName(ip){
  if(/^192\.168\.41\./.test(ip))return 'Oficinas';
  if(/^192\.168\.4\./.test(ip))return 'Producción';
  if(/^192\.168\.1\./.test(ip))return 'Servidores';
  return ip?'Otra':'';
}
function dupSet(){ return new Set(Object.keys(DUPI)); }
let DUPI={},DUPS=new Set();
function vis(n){
  if(!state.types.has(n.tipo))return false;
  if(state.nets.size){
    const hit=(state.nets.has('sin')&&!n.nets.length)||n.nets.some(x=>state.nets.has(x));
    if(!hit)return false;
  }
  if(state.zona&&n.zona!==state.zona)return false;
  if(state.red&&!(n.nets.includes(state.red)||(state.red==='sin'&&!n.nets.length)))return false;
  if(state.q){const s=(n.nombre+' '+n.ip.join(' ')+' '+n.mac+' '+n.modelo+' '+n.so+' '+n.ubic+' '+n.zona).toLowerCase();
    if(!s.includes(state.q.toLowerCase()))return false;}
  return true;
}
function ctrl(e){
  const a=byId[e.s],b=byId[e.t];
  if(Array.isArray(e.pts)&&e.pts.length){
    const A=[[a.x,a.y]].concat(e.pts).concat([[b.x,b.y]]);
    const m=Math.floor(A.length/2);
    if(A.length%2)return{x:A[m][0],y:A[m][1]};
    return{x:(A[m-1][0]+A[m][0])/2,y:(A[m-1][1]+A[m][1])/2};
  }
  if(typeof e.bx==='number'&&typeof e.by==='number')return{x:e.bx,y:e.by};
  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2, st=doc.estyle||'curvo';
  if(st==='orto')return{x:mx,y:my};
  if(st==='recto')return{x:mx,y:my};
  return{x:mx,y:my-18};
}
function ptSegDist(p,a,b){
  var vx=b[0]-a[0], vy=b[1]-a[1], wx=p[0]-a[0], wy=p[1]-a[1];
  var L=vx*vx+vy*vy;
  if(!L)return Math.sqrt(wx*wx+wy*wy);
  var t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/L));
  var dx=p[0]-(a[0]+t*vx), dy=p[1]-(a[1]+t*vy);
  return Math.sqrt(dx*dx+dy*dy);
}
function dentroPrune(e){
  if(!e||!Array.isArray(e.pts)||e.pts.length<2)return 0;
  var out=[],quit=0;
  e.pts.forEach(function(p){
    if(out.some(function(q){return Math.sqrt(Math.pow(p[0]-q[0],2)+Math.pow(p[1]-q[1],2))<8;})){quit++;return;}
    out.push(p);
  });
  e.pts=out; return quit;
}
function pruneEdgePoints(e){
  if(!e||!Array.isArray(e.pts))return 0;
  var A=byId[e.s],B=byId[e.t]; if(!A||!B)return 0;
  var salvo=0, out=[];
  e.pts.forEach(function(p,i){
    if(i===e._keep)return;
    var cercaExtremo=Math.sqrt(Math.pow(p[0]-A.x,2)+Math.pow(p[1]-A.y,2))<12 ||
                     Math.sqrt(Math.pow(p[0]-B.x,2)+Math.pow(p[1]-B.y,2))<12;
    var cercaOtro=out.some(function(q){return Math.sqrt(Math.pow(p[0]-q[0],2)+Math.pow(p[1]-q[1],2))<12;});
    if(cercaExtremo||cercaOtro){salvo++;return;}
    out.push(p);
  });
  var cambio=true;
  while(cambio&&out.length>1){
    cambio=false;
    for(var i=0;i<out.length;i++){
      var prev=i===0?[A.x,A.y]:out[i-1], next=(i===out.length-1)?[B.x,B.y]:out[i+1];
      if(out.length===1)break;
      if(ptSegDist(out[i],prev,next)<6){out.splice(i,1);salvo++;cambio=true;break;}
    }
  }
  if(out.length===1){
    var q=out[0], pr=[A.x,A.y], nx=[B.x,B.y];
    if(ptSegDist(q,pr,nx)<6){out=[];salvo++;}
  }
  e.pts=out;
  if(!out.length){delete e.bx;delete e.by;}
  return salvo;
}
function borrarPuntosRedundantes(){
  var n=0;
  doc.edges.forEach(function(e){ if(Array.isArray(e.pts)&&e.pts.length){ var k=pruneEdgePoints(e); n+=k; } });
  return n;
}
function borrarPuntosRedundantes(){
  var n=0;
  doc.edges.forEach(function(e){ if(Array.isArray(e.pts)&&e.pts.length){ var k=pruneEdgePoints(e); n+=k; } });
  return n;
}
function segMid(anch,i,hasPts,e){
  var p1=anch[i], p2=anch[i+1], st=doc.estyle||'curvo';
  if(st==='orto'){
    if(!hasPts){
      if(e&&typeof e.bx==='number')return {x:e.bx, y:p1[1]};
      return {x:(p1[0]+p2[0])/2, y:p1[1]};
    }
    return {x:p2[0], y:p1[1]};
  }
  if(st==='recto')return {x:(p1[0]+p2[0])/2, y:(p1[1]+p2[1])/2};
  if(!hasPts){
    var cx,cy;
    if(e&&typeof e.bx==='number'){ cx=e.bx; cy=e.by; }
    else { cx=(p1[0]+p2[0])/2; cy=(p1[1]+p2[1])/2-18; }
    return {x:(p1[0]+2*cx+p2[0])/4, y:(p1[1]+2*cy+p2[1])/4};
  }
  var p0=anch[i-1]||p1, p3=anch[i+2]||p2;
  var c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
  var c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
  return {x:(p1[0]+3*c1x+3*c2x+p2[0])/8, y:(p1[1]+3*c1y+3*c2y+p2[1])/8};
}

function cabCats(){ if(!Array.isArray(doc.cabcats)||!doc.cabcats.length){ doc.cabcats=[{n:'Fibra',col:'#22d3ee'},{n:'Cobre',col:'#94a3b8'},{n:'Inalambrico',col:'#f472b6'},{n:'Troncal',col:'#fbbf24'}]; } return doc.cabcats; }
function cabColor(e){ if(!e)return '';
  if(e.net){ var c=(doc.redes||[]).filter(function(x){return x.n===e.net;})[0]; if(c)return c.col; }
  var A=byId[e.s], B=byId[e.t];
  if(A&&B){ var sa=(A.nets||[]), sb=(B.nets||[]);
    for(var i=0;i<sa.length;i++){ if(sb.indexOf(sa[i])>=0){ var cc=(doc.redes||[]).filter(function(x){return x.n===sa[i];})[0]; if(cc)return cc.col; } } }
  return e.color||''; }
function edgeD(a,b,e){
  var P=(e&&Array.isArray(e.pts))?e.pts:[];
  var st=doc.estyle||'curvo';
  // arranca en el borde del circulo, no en el centro
  var R=20;
  var toP=(P.length?P[0]:[b.x,b.y]);
  var fromP=(P.length?P[P.length-1]:[a.x,a.y]);
  var v1x=toP[0]-a.x, v1y=toP[1]-a.y, l1=Math.sqrt(v1x*v1x+v1y*v1y)||1;
  var v2x=b.x-fromP[0], v2y=b.y-fromP[1], l2=Math.sqrt(v2x*v2x+v2y*v2y)||1;
  var AX=a.x+v1x/l1*R, AY=a.y+v1y/l1*R;
  var BX=b.x-v2x/l2*R, BY=b.y-v2y/l2*R;
  if(e)e._ends=[AX,AY,BX,BY];
  if(P.length){
    if(st==='recto'){
      var d1='M'+AX.toFixed(1)+','+AY.toFixed(1); P.forEach(function(q){d1+=' L'+q[0]+','+q[1];});
      return d1+' L'+BX.toFixed(1)+','+BY.toFixed(1);
    }
    if(st==='orto'){
      var d2='M'+AX.toFixed(1)+','+AY.toFixed(1); P.forEach(function(q){d2+=' H'+q[0]+' V'+q[1];});
      return d2+' H'+BX.toFixed(1)+' V'+BY.toFixed(1);
    }
    var all=[[AX,AY]].concat(P).concat([[BX,BY]]);
    var s2='M'+all[0][0]+','+all[0][1];
    for(var i=0;i<all.length-1;i++){
      var p0=all[i-1]||all[i], p1=all[i], p2=all[i+1], p3=all[i+2]||all[i+1];
      var c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
      var c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
      s2+=' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0]+','+p2[1];
    }
    return s2;
  }
  const st0=doc.estyle||'curvo';
  if(e&&typeof e.bx==='number'){
    if(st0==='orto') return `M${AX.toFixed(1)},${AY.toFixed(1)} H${e.bx} V${e.by} H${BX.toFixed(1)} V${BY.toFixed(1)}`;
    if(st0==='recto')return `M${AX.toFixed(1)},${AY.toFixed(1)} L${e.bx},${e.by} L${BX.toFixed(1)},${BY.toFixed(1)}`;
    return `M${AX.toFixed(1)},${AY.toFixed(1)} Q${e.bx},${e.by} ${BX.toFixed(1)},${BY.toFixed(1)}`;
  }
  if(st==='recto')return `M${AX.toFixed(1)},${AY.toFixed(1)} L${BX.toFixed(1)},${BY.toFixed(1)}`;
  if(st==='orto'){const mx=(AX+BX)/2;return `M${AX.toFixed(1)},${AY.toFixed(1)} H${mx.toFixed(1)} V${BY.toFixed(1)} H${BX.toFixed(1)}`;}
  const mx=(AX+BX)/2,my=(AY+BY)/2-18;
  return `M${AX.toFixed(1)},${AY.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${BX.toFixed(1)},${BY.toFixed(1)}`;
}
function elabBox(e){
  var nt=e.nt; if(!nt||!String(nt.t||'').trim())return'';
  var c=ctrl(e), w=nt.w||200, sz=nt.sz||12;
  var lines=noteLines(nt.t,w,sz);
  var hh=lines.length*sz*1.35+12;
  var x=Math.round(c.x-w/2), y=Math.round(c.y-hh-9);
  var col=nt.col||'#ffd7a1';
  var tsp=lines.map(function(l,i){return '<tspan x="'+(x+9)+'" dy="'+(i?sz*1.35:0)+'">'+escAttr(l||' ')+'</tspan>';}).join('');
  return '<g class="elab2" data-e="'+e.s+'|'+e.t+'">'+
    '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+hh+'" rx="7" fill="rgba(12,22,38,.95)" stroke="'+col+'" stroke-width="1.2"/>'+
    '<text x="'+(x+9)+'" y="'+(y+sz+2)+'" fill="'+col+'" style="font-size:'+sz+'px">'+tsp+'</text></g>';
}
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
function readHTML(n){
  const nb=[...adj[n.id]].map(x=>byId[x]).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  return `<div class="dtitle">${n.nombre}${DUPS.has(n.id)?'<span class="badge">IP duplicada</span>':''}</div>
   <div class="dtype" style="color:${col(n)}">${(TYPE[n.tipo]||['','Equipo'])[1]} · ${n.zona}</div>
   <dl class="kv">
     <dt>IP</dt><dd class="mono">${n.ip.length?n.ip.map(ip=>{
       const nn=netName(ip);
       const cc=(DUPI[n.id]||[]).filter(x=>x.ip===ip).map(x=>x.other);
       return `<span class="${cc.length?'ipbad':''}">${escAttr(ip)}</span>`+
         (nn?` <span class="netp" style="color:${netColOf(nn)}">${nn}</span>`:'')+
         (cc.length?` <span class="dupw">⚠ ya en ${escAttr(cc.join(', '))}</span>`:'');
     }).join('<br>'):'sin IP'}</dd>
     <dt>MAC</dt><dd class="mono">${v(n.mac)}</dd>
     <dt>Modelo</dt><dd>${v(n.modelo)}</dd>
     <dt>Ubicación</dt><dd>${v(n.ubic)}</dd>
     <dt>Red</dt><dd>${n.nets.length?n.nets.join(' · '):v(n.red)}</dd>
   </dl>
   ${extraHTML(n)}
   ${(function(){
      var L=n.nics||[];
      if(!L.length)return '';
      return '<h4 style="font-size:10.5px;letter-spacing:.1em;color:#7d93b3;margin:10px 0 5px">ADAPTADORES ('+L.length+')</h4>'+
        '<div class="niclist">'+L.map(function(x){
          var det=[x.k,x.m,(x.vlan?'VLAN '+x.vlan:''),x.ip,x.mac,(x.host?'⇢ '+x.host:'')].filter(Boolean).join(' · ');
          return '<div class="nicl"><b>'+(x.n||'adaptador')+'</b><span>'+escAttr(det)+'</span></div>';
        }).join('')+'</div>';
    })()}
   ${(n.tipo==='switch'||n.tipo==='router'||n.tipo==='firewall')?portGrid(n):''}
   <div class="hist"><h4>ENLACES (${nb.length})</h4>
     ${nb.length?nb.map(x=>`<div class="hitem" data-id="${x.id}" style="display:flex;justify-content:space-between;gap:8px">
       <span>${x.nombre}</span><span style="color:#7d93b3">${(TYPE[x.tipo]||['',''])[1]}</span></div>`).join('')
       :'<div class="empty" style="padding:6px 0">Sin enlaces definidos</div>'}
   </div>
   <button class="btn" id="e_start" style="margin-top:10px;width:100%">✎ Editar este equipo</button>`;
}

const PERIFS=['Monitor','2º monitor','Teclado','Ratón','Impresora','Escáner','Lector de códigos',
  'Etiquetadora','Webcam','Auriculares','Altavoces','SAI','Plotter'];
const TYPEF={
 pc:[
  {k:'so',l:'Sistema operativo',ph:'Windows 11 Pro'},
  {k:'sover',l:'Versión',ph:'23H2'},
  {k:'ram',l:'Memoria RAM',ph:'16 GB'},
  {k:'hdd',l:'Almacenamiento',ph:'512 GB SSD'},
  {k:'perifs',l:'Periféricos',type:'list',opts:PERIFS}
 ],
 server:[
  {k:'so',l:'Sistema operativo',ph:'Windows Server 2019'},
  {k:'sover',l:'Versión',ph:'1809'},
  {k:'ram',l:'Memoria RAM',ph:'64 GB ECC'},
  {k:'hdd',l:'Almacenamiento',ph:'2 × 960 GB SSD RAID 1'},
  {k:'roles',l:'Roles y servicios',type:'chips',opts:['Dominio AD','DNS','DHCP','Ficheros','SQL','Virtualización','Backup','Web','Correo','Antivirus']},
  {k:'vms',l:'Nº de máquinas virtuales',ph:'3'}
 ],
 switch:[
  {k:'puertos',l:'Nº de puertos',ph:'24'},
  {k:'gestionable',l:'Gestionable',type:'select',opts:['','Sí','No']},
  {k:'poe',l:'PoE',type:'select',opts:['','Sí','No']},
  {k:'velocidad',l:'Velocidad de puerto',type:'select',opts:['','100 Mbps','1 Gbps','2,5 Gbps','10 Gbps']},
  {k:'vlan',l:'VLANs',ph:'10 oficinas / 20 producción'},
  {k:'firmware',l:'Firmware',ph:'1.2.3'}
 ],
 router:[
  {k:'puertos',l:'Nº de puertos LAN',ph:'4'},
  {k:'wan',l:'Puertos WAN',ph:'2 (1 SFP)'},
  {k:'gestionable',l:'Gestionable',type:'select',opts:['','Sí','No']},
  {k:'vpn',l:'VPN',type:'select',opts:['','Sí','No']},
  {k:'firmware',l:'Firmware / versión',ph:'RouterOS 7.14'},
  {k:'vlan',l:'VLANs / subredes',ph:'192.168.41.0/24'}
 ],
 firewall:[
  {k:'puertos',l:'Puertos',ph:'4 + 2 WAN'},
  {k:'wan',l:'Puertos WAN',ph:'2'},
  {k:'gestionable',l:'Gestionable',type:'select',opts:['','Sí','No']},
  {k:'vpn',l:'VPN',type:'select',opts:['','Sí','No']},
  {k:'firmware',l:'Firmware',ph:'Fireware 12.10'},
  {k:'licencia',l:'Licencia / soporte hasta',ph:'2027-06'}
 ],
 wifi:[
  {k:'ssid',l:'SSID(s)',ph:'CONTROLGLASS / INVITADOS'},
  {k:'banda',l:'Banda',type:'select',opts:['','2,4 GHz','5 GHz','2,4 + 5 GHz','6 GHz']},
  {k:'canales',l:'Canales / potencia',ph:'36 · 80 MHz · 20 dBm'},
  {k:'poe',l:'Alimentación PoE',type:'select',opts:['','Sí','No']},
  {k:'firmware',l:'Firmware',ph:'6.6.55'}
 ],
 nas:[
  {k:'bahias',l:'Nº de bahías',ph:'2'},
  {k:'hdd',l:'Almacenamiento',ph:'2 × 8 TB'},
  {k:'raid',l:'RAID',type:'select',opts:['','RAID 0','RAID 1','RAID 5','RAID 6','JBOD']},
  {k:'protocolos',l:'Protocolos',type:'chips',opts:['SMB/CIFS','NFS','AFP','iSCSI','FTP','Time Machine']},
  {k:'firmware',l:'Firmware',ph:'QTS 5.1'}
 ],
 nvr:[
  {k:'canales',l:'Nº de canales',ph:'16'},
  {k:'camaras',l:'Cámaras conectadas',ph:'8'},
  {k:'hdd',l:'Almacenamiento',ph:'2 × 4 TB'},
  {k:'retencion',l:'Retención de grabación',ph:'30 días'},
  {k:'firmware',l:'Firmware',ph:'4.0'}
 ],
 otro:[
  {k:'so',l:'Sistema / firmware',ph:''},
  {k:'hdd',l:'Almacenamiento',ph:''}
 ]
};
function escAttr(v){return String(v==null?'':v).replace(/"/g,'&quot;');}
function perfList(v){
  const arr=Array.isArray(v)?v:(v?String(v).split(',').map(s=>s.trim()).filter(Boolean):[]);
  return arr.map(x=>typeof x==='string'?{t:x,marca:'',modelo:'',serie:''}:x);
}
function perifRowHTML(p,opts){
  const t=(p&&p.t)||opts[0];
  return `<div class="pdet"><select data-f="t">${opts.map(o=>`<option${o===t?' selected':''}>${o}</option>`).join('')}</select>
    <input data-f="marca" placeholder="Marca" value="${escAttr(p&&p.marca)}">
    <input data-f="modelo" placeholder="Modelo" value="${escAttr(p&&p.modelo)}">
    <input data-f="serie" placeholder="Nº serie" value="${escAttr(p&&p.serie)}">
    <button type="button" class="x" data-pdel="1">✕</button></div>`;
}
function bindLists(pre,tipo){
  (TYPEF[tipo]||[]).forEach(f=>{
    if(f.type!=='list')return;
    const box=document.getElementById('plist_'+pre+'_'+f.k);
    const add=document.getElementById(pre+'_padd_'+f.k);
    if(!box)return;
    const bindRow=r=>{const x=r.querySelector('[data-pdel]'); if(x)x.onclick=()=>r.remove();};
    box.querySelectorAll('.pdet').forEach(bindRow);
    if(add)add.onclick=()=>{
      const d=document.createElement('div');
      d.innerHTML=perifRowHTML({t:f.opts[0],marca:'',modelo:'',serie:''},f.opts);
      const row=d.firstElementChild; box.appendChild(row); bindRow(row);
    };
  });
}
function prowHTML(p){
  return `<div class="prow" data-p="${escAttr(p.t)}"><span class="pnom">${escAttr(p.t)}</span>
    <input data-f="marca" placeholder="Marca" value="${escAttr(p.marca)}">
    <input data-f="modelo" placeholder="Modelo" value="${escAttr(p.modelo)}">
    <input data-f="serie" placeholder="Nº serie" value="${escAttr(p.serie)}"></div>`;
}
function fldVal(v){ if(Array.isArray(v))return v; return v==null?'':String(v); }
function fieldsHTML(pre,tipo,n){
  const list=TYPEF[tipo]||[];
  if(!list.length)return '';
  const head=`<div class="fsep">Datos de ${(TYPE[tipo]||['','equipo'])[1].toLowerCase()}</div>`;
  const body=list.map(f=>{
    const v=n?n[f.k]:undefined, id=pre+'_'+f.k;
    if(f.type==='list'){
      const arr=perfList(v);
      return `<div class="fld"><label>${f.l}</label>
        <div class="plist" id="plist_${pre}_${f.k}">${arr.map(p=>perifRowHTML(p,f.opts)).join('')}</div>
        <button type="button" class="btn sm" id="${pre}_padd_${f.k}" style="margin-top:5px;align-self:flex-start">＋ Añadir periférico</button></div>`;
    }
    if(f.type==='chips'){
      const cur=f.det?perfList(v):(Array.isArray(v)?v:(v?String(v).split(',').map(s=>s.trim()).filter(Boolean):[]));
      const names=f.det?cur.map(x=>x.t):cur;
      const rows=f.det&&cur.length?`<div class="plist" id="plist_${pre}_${f.k}">${cur.map(prowHTML).join('')}</div>`:
        (f.det?`<div class="plist" id="plist_${pre}_${f.k}"></div>`:'');
      return `<div class="fld"><label>${f.l}</label><div class="chips" id="${id}" data-k="${f.k}">
        ${f.opts.map(o=>`<button type="button" class="chip${names.indexOf(o)>=0?' on':''}" data-v="${o}">${o}</button>`).join('')}
      </div>${rows}</div>`;
    }
    if(f.type==='select'){
      return `<div class="fld"><label>${f.l}</label><select id="${id}">${
        f.opts.map(o=>`<option value="${o}"${String(v||'')===o?' selected':''}>${o||'—'}</option>`).join('')}</select></div>`;
    }
    return `<div class="fld"><label>${f.l}</label><input id="${id}" value="${String(v==null?'':v).replace(/"/g,'&quot;')}" placeholder="${f.ph||''}"></div>`;
  }).join('');
  const portsv=(n&&n.id&&doc.edges.some(function(e){return e.s===n.id||e.t===n.id;}))?portGrid(n):'';
  const ports=portsHTML(pre,n);
  return head+body+portsv+ports;
}
function bindChips(root){
  if(!root||!root.querySelectorAll)return;
  root.querySelectorAll('.chips').forEach(c=>{
    const id=c.id||'', pre=id.indexOf('_')>0?id.slice(0,id.indexOf('_')):'e';
    const k=c.dataset.k||'', plist=document.getElementById('plist_'+pre+'_'+k);
    const collect=()=>{
      const out=[];
      if(plist)plist.querySelectorAll('.prow').forEach(r=>{
        const g=x=>{const i=r.querySelector('[data-f="'+x+'"]');return i?i.value.trim():'';};
        out.push({t:r.dataset.p,marca:g('marca'),modelo:g('modelo'),serie:g('serie')});
      });
      return out;
    };
    const rebuild=()=>{
      if(!plist)return;
      const prev=collect();
      const on=[].slice.call(c.querySelectorAll('.chip.on')).map(b=>b.dataset.v);
      plist.innerHTML=on.map(t=>{
        const old=prev.filter(p=>p.t===t)[0]||{t,marca:'',modelo:'',serie:''};
        return prowHTML(old);
      }).join('');
    };
    c.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{b.classList.toggle('on');rebuild();});
  });
}
function readFields(pre,tipo){
  const out={};
  (TYPEF[tipo]||[]).forEach(f=>{
    const el=document.getElementById(pre+'_'+f.k);
    if(!el)return;
    if(f.type==='list'){
      const box=document.getElementById('plist_'+pre+'_'+f.k);
      out[f.k]=box?[].slice.call(box.querySelectorAll('.pdet')).map(r=>{
        const gv=x=>{const i=r.querySelector('[data-f="'+x+'"]');return i?i.value.trim():'';};
        return {t:gv('t'),marca:gv('marca'),modelo:gv('modelo'),serie:gv('serie')};
      }):[];
      return;
    }
    if(f.type==='chips'){
      if(f.det){
        const pl=document.getElementById('plist_'+pre+'_'+f.k);
        const rows=pl?[].slice.call(pl.querySelectorAll('.prow')):[];
        out[f.k]=rows.map(r=>{
          const gv=x=>{const i=r.querySelector('[data-f="'+x+'"]');return i?i.value.trim():'';};
          return {t:r.dataset.p,marca:gv('marca'),modelo:gv('modelo'),serie:gv('serie')};
        });
      } else out[f.k]=[].slice.call(el.querySelectorAll('.chip.on')).map(b=>b.dataset.v);
    }
    else out[f.k]=el.value.trim();
  });
  return out;
}

const PTIPOS=['Cobre RJ45','Cobre RJ45 PoE','Fibra SFP','Fibra SFP+','Fibra SFP28','Fibra QSFP+','Fibra QSFP28','Consola'];
const PVELS=['10 Mbps','100 Mbps','1 Gbps','2,5 Gbps','5 Gbps','10 Gbps','25 Gbps','40 Gbps','100 Gbps'];
let PHOST='';
function portConn(hostId,num){
  const it=mineOn(hostId).filter(function(x){return x.port===num;})[0];
  if(!it)return null;
  const o=byId[it.other];
  return o?{id:o.id,nombre:o.nombre}:null;
}
function portRowHTML(p){
  const tp=PTIPOS.indexOf(p.tipo)>=0?p.tipo:PTIPOS[0], vl=PVELS.indexOf(p.vel)>=0?p.vel:'1 Gbps';
  const c=PHOST?portConn(PHOST,p.n):null;
  return `<div class="pyrow"><span class="pn">${p.n}</span>
    <span class="pconn${c?' on':''}" title="${c?escAttr(c.nombre):'sin conexión'}">${c?escAttr(c.nombre):'\u2014'}</span>
    <select data-f="tipo">${PTIPOS.map(t=>`<option${tp===t?' selected':''}>${t}</option>`).join('')}</select>
    <select data-f="vel">${PVELS.map(t=>`<option${vl===t?' selected':''}>${t}</option>`).join('')}</select>
    <input data-f="nota" placeholder="nota / transceptor" value="${escAttr(p.nota)}">
    <button type="button" class="pnx" data-del="${p.n}" title="Quitar este puerto">\u2715</button></div>`;
}
function portsHTML(pre,n){
  PHOST=(n&&n.id)||'';
  const arr=n&&Array.isArray(n.ports)?n.ports:[];
  const cnt=arr.length||(parseInt(n&&n.puertos)||0);
  return `<div class="fsep">Inventario de puertos</div>
   <div class="bulk">
     <label class="bl">Nº<input id="${pre}_pcount" type="number" min="0" max="96" value="${cnt}"></label>
     <button type="button" class="btn sm" id="${pre}_pgen">Generar</button>
     <select id="${pre}_ptipo">${PTIPOS.map(t=>`<option>${t}</option>`).join('')}</select>
     <select id="${pre}_pvel">${PVELS.map((t,i)=>`<option${i===2?' selected':''}>${t}</option>`).join('')}</select>
     <button type="button" class="btn sm" id="${pre}_pall">Aplicar a todos</button>
   </div>
   <div class="ptable" id="${pre}_ports">${arr.map(portRowHTML).join('')}</div>`;
}
function bindPorts(pre){
  const box=document.getElementById(pre+'_ports');
  if(!box)return;
  box.addEventListener('click',function(ev){
    var b=ev.target.closest?ev.target.closest('.pnx'):null;
    if(!b)return;
    ev.preventDefault(); ev.stopPropagation();
    var pn=parseInt(b.dataset.del)||0;
    if(typeof PHOST==='string'&&PHOST){
      var ed=doc.edges.filter(function(x){return x.h===PHOST&&x.port===pn;})[0];
      if(ed){
        var oo=byId[ed.s===PHOST?ed.t:ed.s];
        if(!confirm('El puerto '+pn+' tiene conectado '+(oo?oo.nombre:'un equipo')+'. \u00bfQuitar tambi\u00e9n ese enlace?'))return;
        doc.edges=doc.edges.filter(function(x){return !(x.h===PHOST&&x.port===pn);});
        save();
      }
    }
    var row=b.closest('.pyrow'); if(row)row.remove();
    var cn=document.getElementById(pre+'_pcount');
    if(cn)cn.value=box.querySelectorAll('.pyrow').length;
  });
  const gen=document.getElementById(pre+'_pgen'), all=document.getElementById(pre+'_pall');
  const collect=()=>[].slice.call(box.querySelectorAll('.pyrow')).map(r=>{
    const g=x=>{const e=r.querySelector('[data-f="'+x+'"]');return e?e.value.trim():'';};
    return {n:parseInt(r.querySelector('.pn').textContent)||0,tipo:g('tipo'),vel:g('vel'),nota:g('nota')};
  });
  if(gen)gen.onclick=()=>{
    const cEl=document.getElementById(pre+'_pcount');
    const c=Math.max(0,Math.min(96,parseInt(cEl.value)||0));
    const prev=collect();
    const dT=document.getElementById(pre+'_ptipo').value, dV=document.getElementById(pre+'_pvel').value;
    let html='';
    for(let i=1;i<=c;i++){
      const old=prev.filter(p=>p.n===i)[0]||{n:i,tipo:dT,vel:dV,nota:''};
      html+=portRowHTML(old);
    }
    box.innerHTML=html;
  };
  if(all)all.onclick=()=>{
    const t=document.getElementById(pre+'_ptipo').value, v=document.getElementById(pre+'_pvel').value;
    box.querySelectorAll('.pyrow').forEach(r=>{
      const st=r.querySelector('[data-f="tipo"]'), sv=r.querySelector('[data-f="vel"]');
      if(st)st.value=t; if(sv)sv.value=v;
    });
  };
}
function readPorts(pre){
  const box=document.getElementById(pre+'_ports');
  if(!box)return null;
  const arr=[].slice.call(box.querySelectorAll('.pyrow')).map(r=>{
    const g=x=>{const e=r.querySelector('[data-f="'+x+'"]');return e?e.value.trim():'';};
    return {n:parseInt(r.querySelector('.pn').textContent)||0,tipo:g('tipo'),vel:g('vel'),nota:g('nota')};
  });
  return arr.length?arr:null;
}
function portsSummary(n){
  const a=n&&n.ports;
  if(!Array.isArray(a)||!a.length)return '';
  const m={};
  a.forEach(p=>{const k=(p.tipo||'?')+(p.vel?' · '+p.vel:'')+(p.nota?' ('+p.nota+')':'');m[k]=(m[k]||0)+1;});
  return `<dt>Puertos</dt><dd>${a.length} — ${Object.keys(m).map(k=>m[k]+'× '+k).join(', ')}</dd>`;
}
function extraHTML(n){
  const list=TYPEF[n.tipo]||[];
  const rows=list.map(f=>{
    let v=n[f.k];
    if(f.type==='list'||f.type==='chips'){
      const arr=(f.type==='list'||f.det)?perfList(v):(Array.isArray(v)?v:[]);
      v=arr.map(x=>{
        if(typeof x==='string')return x;
        const d=[x.marca,x.modelo,x.serie].filter(Boolean).join(' ');
        return d?x.t+' ('+d+')':x.t;
      }).join(' · ');
    } else if(Array.isArray(v))v=v.join(' · ');
    if(v===undefined||v===null||v==='')return '';
    return `<dt>${f.l}</dt><dd>${v}</dd>`;
  }).join('');
  return (rows||portsSummary(n))?`<dl class="kv">${rows}${portsSummary(n)}</dl>`:'';
}
function renderMExtra(){
  const t=document.getElementById('m_tipo').value||'pc';
  const w=document.getElementById('m_extra');
  if(!w)return;
  w.innerHTML=fieldsHTML('m',t,null);
  bindChips(w);
  bindLists('m',t);
  bindPorts('m');
}

function nicsHTML(list){
  list=list||[];
  if(!list.length)list=[{k:'virtual',m:'bridge'}];
  return list.map(function(v){
    v=v||{};
    var ks=['virtual','física'];
    var ms=['bridge','host-only','NAT','trunk','acceso'];
    return '<div class="nicrow">'+
      '<input class="nc-n" placeholder="vNIC1 / eth0" value="'+escAttr(v.n||'')+'">'+
      '<select class="nc-k">'+ks.map(function(k){return '<option'+(String(v.k||'virtual')===k?' selected':'')+'>'+k+'</option>';}).join('')+'</select>'+
      '<select class="nc-m">'+ms.map(function(k){return '<option'+(String(v.m||'bridge')===k?' selected':'')+'>'+k+'</option>';}).join('')+'</select>'+
      '<input class="nc-v" placeholder="VLAN" value="'+escAttr(v.vlan||'')+'">'+
      '<input class="nc-ip" placeholder="IP" value="'+escAttr(v.ip||'')+'">'+
      '<input class="nc-mac" placeholder="MAC" value="'+escAttr(v.mac||'')+'">'+
      '<input class="nc-h" placeholder="en host/switch" value="'+escAttr(v.host||'')+'">'+
      '<button type="button" class="x nc-del" title="Quitar">\u2715</button>'+
    '</div>';
  }).join('');
}
function nicsRead(boxId){
  var box=document.getElementById(boxId); if(!box)return [];
  return [].map.call(box.querySelectorAll('.nicrow'),function(r){
    function v(c){var e=r.querySelector(c);return e?String(e.value||'').trim():'';}
    var o={n:v('.nc-n'),k:v('.nc-k'),m:v('.nc-m'),vlan:v('.nc-v'),ip:v('.nc-ip'),mac:v('.nc-mac'),host:v('.nc-h')};
    return (o.n||o.ip||o.mac||o.host)?o:null;
  }).filter(Boolean);
}
function nicsFill(boxId,list){
  var box=document.getElementById(boxId); if(!box)return;
  box.innerHTML=nicsHTML(list&&list.length?list:[{k:'virtual',m:'bridge'}]);
}
function formHTML(n){
  const links=edges.filter(e=>e.s===n.id||e.t===n.id).map(e=>{
    const o=byId[e.s===n.id?e.t:e.s]; return {o,s:e.s,t:e.t};});
  const opts=Object.entries(TYPE).map(([k,[c,l]])=>`<option value="${k}"${n.tipo===k?' selected':''}>${l}</option>`).join('');
  return `<div class="dtitle">Editar equipo</div>
  <div class="dtype" style="color:${col(n)}">${DUPS.has(n.id)?'<span class="badge">IP duplicada</span>':''}</div>
  <div class="form">
    <div class="fld"><label>Nombre</label><input id="e_nombre" value="${(n.nombre||'').replace(/"/g,'&quot;')}"></div>
    <div class="row2">
      <div class="fld"><label>Tipo</label><select id="e_tipo">${opts}</select></div>
      <div class="fld"><label>Icono</label><select id="e_ico"><option value="">(el del tipo)</option>${Object.keys(ICONS).map(k=>`<option value="${k}"${n.ico===k?" selected":""}>${k}</option>`).join("")}</select></div>
      <div class="fld"><label>Zona</label><select id="e_zona">${allZonas().slice().sort((a,b)=>a.localeCompare(b,'es')).map(z=>`<option value="${z.replace(/"/g,'&quot;')}"${z===n.zona?' selected':''}>${z}</option>`).join('')}<option value="__nueva__">\u002b Crear zona nueva\u2026</option></select>
      <input id="e_zona_new" placeholder="Nombre de la zona nueva" style="display:none;margin-top:5px"></div>
    </div>
    <datalist id="zl">${zonas.map(z=>`<option value="${z}">`).join('')}</datalist>
    <div class="fld"><label>Direcciones IP (una por línea)</label><textarea id="e_ip" placeholder="192.168.4.20">${n.ip.join('\n')}</textarea>
      <div class="iphelp">Una por línea. Si el equipo está en varias redes, ponlas todas: <b>192.168.41.25</b> y <b>192.168.1.25</b> no son duplicado.</div>
      <button type="button" class="btn mini" id="e_ipadd">＋ Añadir otra IP</button></div>
    <div class="fld"><label>MAC</label><input id="e_mac" value="${(n.mac||'').replace(/"/g,'&quot;')}" placeholder="AA:BB:CC:DD:EE:FF"></div>
    <div class="row2">
      <div class="fld"><label>Modelo</label><input id="e_modelo" value="${(n.modelo||'').replace(/"/g,'&quot;')}"></div>
      <div class="fld"><label>Ubicación</label><input id="e_ubic" value="${(n.ubic||'').replace(/"/g,'&quot;')}"></div>
    </div>
    ${fieldsHTML('e',n.tipo,n)}
    <div class="fld"><label>Adaptadores de red (físicos y virtuales)</label>
      <div class="nics" id="e_nics">${nicsHTML(n.nics)}</div>
      <button type="button" class="btn mini" id="e_nicadd">＋ Añadir adaptador</button>
      <div class="iphelp">En una <b>máquina virtual</b>: adaptador virtual (bridge, host-only, NAT o VLAN) y en qué host está. En el <b>servidor anfitrión</b>: sus adaptadores físicos y qué VM los usan.</div>
    </div>
    <div class="fld"><label>Notas</label><textarea id="e_notas" rows="2">${n.notas||''}</textarea></div>
    <div class="acts"><button class="btn on" id="e_save">Guardar cambios</button>
      <button class="btn danger" id="e_del">Eliminar</button></div>
  </div>
  <div class="hist"><h4>ENLACES (${links.length})</h4>
    ${links.map(l=>`<div class="lrow"><span>${l.o?l.o.nombre:'?'}</span>
      <b>${l.o?(TYPE[l.o.tipo]||['',''])[1]:''}</b>
      <button class="x" data-s="${l.s}" data-t="${l.t}">✕</button></div>`).join('')||'<div class="empty" style="padding:6px 0">Sin enlaces</div>'}
    <div class="ladd"><select id="e_lsel"><option value="">— conectar con —</option>
      ${nodes.filter(x=>x.id!==n.id).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'))
        .map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('')}</select>
      <button class="btn" id="e_ladd">＋</button></div>
  </div>`;
}
function showDetail(){
  const d=document.getElementById('detail'),app=document.querySelector('.app');
  if(state.pathMode){
    app.classList.add('sel');
    var org=state.pathA?byId[state.pathA]:null;
    d.innerHTML='<div class="dtitle">\ud83e\udded Ruta</div>'+
      '<div class="dtype">'+(org?('Origen: <b>'+escAttr(org.nombre)+'</b><br>Ahora pulsa el equipo de destino.'):'Pulsa el equipo de <b>origen</b> en el mapa y despu\u00e9s el de destino.')+'</div>'+
      '<div class="frow" style="margin-top:8px"><button class="btn" id="rt_cancel">Cancelar ruta</button></div>';
    var cb=document.getElementById('rt_cancel');
    if(cb)cb.onclick=function(){ state.pathMode=false; state.pathA=null; state.path=null; setBtn('bPath',false); pathHint(false); render(); showDetail(); };
    return;
  }
  if(state.esel){
    const ed0=doc.edges.find(x=>(x.s===state.esel.s&&x.t===state.esel.t)||(x.s===state.esel.t&&x.t===state.esel.s));
    if(!ed0){state.esel=null;}
    else{
      const A=byId[ed0.s],B=byId[ed0.t];
      app.classList.add('sel');
      d.innerHTML=`<div class="dtitle">Conexión</div>
        <div class="dtype">${A.nombre} — ${B.nombre}</div>
        <dl class="kv">
                    <dt>Puerto en ${escAttr(A.nombre)}</dt><dd>${portSel(ed0,'s')}</dd>
          <dt>Puerto en ${escAttr(B.nombre)}</dt><dd>${portSel(ed0,'t')}</dd>
          <dt>Red</dt><dd><select id="e_net" style="width:100%;background:#0c1626;border:1px solid #26374f;border-radius:5px;color:#dbe9ff;font:inherit;font-size:11px;padding:2px 5px">
            <option value="">— automática —</option>
            ${(doc.redes||[]).map(function(c){return '<option value="'+escAttr(c.n)+'"'+(ed0.net===c.n?' selected':'')+'>'+escAttr(c.n)+'</option>';}).join('')}
          </select></dd>
          <dt>Categoría</dt><dd><select id="e_cat" style="width:100%;background:#0c1626;border:1px solid #26374f;border-radius:5px;color:#dbe9ff;font:inherit;font-size:11px;padding:2px 5px">
            <option value="">— sin categoría —</option>
            ${cabCats().map(function(c){return '<option value="'+escAttr(c.n)+'"'+(ed0.cat===c.n?' selected':'')+'>'+escAttr(c.n)+'</option>';}).join('')}
          </select></dd>
          <dt>Color</dt><dd><input type="color" id="e_col" value="${ed0.color||'#6ea8ff'}"
             style="width:34px;height:20px;border:none;background:none;padding:0"></dd>
          <dt>Trazado</dt><dd>${(Array.isArray(ed0.pts)&&ed0.pts.length)?ed0.pts.length+' punto'+(ed0.pts.length>1?'s':'')+' a mano':(doc.estyle||'curvo')}</dd>
          <dt>Etiqueta</dt><dd><input id="e_etq" value="${escAttr(ed0.etq)}" placeholder="1 Gbps fibra…"
             style="width:100%;background:#0c1626;border:1px solid #26374f;border-radius:5px;
             color:#dbe9ff;font:inherit;font-size:11px;padding:2px 5px"></dd>
        </dl>
        <div class="frow" style="display:flex;gap:8px;margin-top:6px">
          <button class="btn" id="e_bend">Quitar curva</button>
          <button class="btn" id="e_clean" title="Quita los puntos que ya no doblan el cable">Limpiar puntos</button>
          <button class="btn" id="e_hide">${ed0.hide?'Mostrar':'Ocultar'}</button>
          <button class="btn danger" id="e_dellink">\ud83d\uddd1 Eliminar</button>
        </div>
        <div class="frow" style="display:flex;gap:8px;margin-top:6px">
          <button class="btn" id="e_ntxt">\u{1F4DD} Caja de texto</button>
          ${ed0.nt&&ed0.nt.t?`<button class="btn" id="e_ntrm">Quitar caja</button>`:''}
        </div>
        ${state.edit?`<button class="btn danger" id="e_del" style="margin-top:8px;width:100%">Eliminar enlace</button>`:''}
        <div class="hint" style="margin-top:10px;font-size:11px;color:#7d93b3">
          Arrastra el punto azul del cable para moverlo a tu gusto.</div>`;
      ['s','t'].forEach(function(side){
        var sel=document.getElementById('e_p'+side); if(!sel)return;
        sel.onchange=function(ev){
          var np=parseInt(ev.target.value)||0; if(!np)return;
          var id=(side==='s')?ed0.s:ed0.t;
          var cur=(side==='s')?ed0.pA:ed0.pB;
          if(np===cur)return;
          var busy=doc.edges.filter(function(x){
            if(x===ed0)return false;
            if(side==='s')return x.s===id&&x.pA===np;
            return x.t===id&&x.pB===np;
          })[0];
          if(busy){
            var otra=byId[busy.s===id?busy.t:busy.s];
            if(!confirm('El puerto '+np+' de '+(byId[id]||{}).nombre+' ya est\u00e1 ocupado por '+(otra?otra.nombre:'otro equipo')+'. \u00bfIntercambiar los dos puertos?')){ showDetail(); return; }
          }
          snap();
          if(side==='s')ed0.pA=np; else ed0.pB=np;
          if(busy){ if(side==='s')busy.pA=cur; else busy.pB=cur; syncRackPort(busy); }
          syncRackPort(ed0);
          save(); render(); showDetail();
        };
      });
      const cnet=document.getElementById('e_net');
      if(cnet)cnet.onchange=function(){
        if(cnet.value)ed0.net=cnet.value; else delete ed0.net;
        snap(); save(); render(); showDetail();
      };
      const cs=document.getElementById('e_cat');
      if(cs)cs.onchange=function(){
        if(cs.value)ed0.cat=cs.value; else delete ed0.cat;
        snap(); save(); render(); showDetail();
      };
      const cc=document.getElementById('e_col');
      if(cc)cc.oninput=ev=>{ed0.color=ev.target.value;save();render();};
      const eq=document.getElementById('e_etq');
      if(eq){eq.oninput=ev=>{ed0.etq=ev.target.value;save();render();};}
      const hb=document.getElementById('e_hide'); if(hb)hb.onclick=()=>{ed0.hide=!ed0.hide;save();render();showDetail();};
      const bb=document.getElementById('e_bend'); if(bb)bb.onclick=()=>{ed0.pts=[];delete ed0.bx;delete ed0.by;save();render();showDetail();};
      const dl=document.getElementById('e_dellink'); if(dl)dl.onclick=()=>{
        if(!confirm('\u00bfEliminar el enlace entre '+A.nombre+' y '+B.nombre+'?'))return;
        snap(); doc.edges=doc.edges.filter(x=>x!==ed0); state.esel=null;
        save(); rebuild(); render(); renderList(); showDetail();
      };
      const cb2=document.getElementById('e_clean'); if(cb2)cb2.onclick=()=>{var q=pruneEdgePoints(ed0);snap();save();render();showDetail();if(!q)alert('No hab\u00eda puntos redundantes.');};
      const nb=document.getElementById('e_ntxt'); if(nb)nb.onclick=()=>openEdgeNote(ed0);
      const nr=document.getElementById('e_ntrm'); if(nr)nr.onclick=()=>{delete ed0.nt;save();render();showDetail();};
      const db=document.getElementById('e_del'); if(db)db.onclick=()=>{delLink(ed0.s,ed0.t);state.esel=null;showDetail();};
      return;
    }
  }
  const n=state.sel?byId[state.sel]:null;
  if(state.path&&state.path.length&&!state.sel){
    var arr=state.path.map(function(i){return byId[i];}).filter(Boolean);
    app.classList.add('sel');
    d.innerHTML='<div class="dtitle">Ruta \u00b7 '+arr.length+' saltos</div>'+
      '<div class="dtype">'+escAttr(arr[0].nombre)+' \u2192 '+escAttr(arr[arr.length-1].nombre)+'</div>'+
      '<div class="hist"><h4>SALTOS</h4>'+arr.map(function(x,i){
        return '<div class="hitem" data-id="'+x.id+'"><span>'+(i+1)+'. '+escAttr(x.nombre)+'</span>'+
          '<span style="color:#7d93b3">'+(TYPE[x.tipo]||['',''])[1]+'</span></div>';
      }).join('')+'</div>'+
      '<button class="btn" id="p_clear" style="margin-top:8px;width:100%">Quitar ruta</button>';
    (function(){var b=document.getElementById('p_clear'); if(b)b.onclick=function(){state.path=null;render();showDetail();};})();
    d.querySelectorAll('.hitem').forEach(function(el){el.onclick=function(){select(el.dataset.id,true);};});
    return;
  }
  if(!n&&state.msel.size){
    const arr=[...state.msel].map(i=>byId[i]).filter(Boolean);
    app.classList.add('sel');
    d.innerHTML=`<div class="dtitle">${arr.length} equipos seleccionados</div>
      <div class="dtype" style="color:#8fb3dd">Arrastra cualquiera de ellos para moverlos juntos</div>
      <div class="hist"><h4>EQUIPOS</h4>
        ${arr.map(x=>`<div class="hitem" style="display:flex;justify-content:space-between;gap:8px">
          <span>${x.nombre}</span><span style="color:#7d93b3">${(TYPE[x.tipo]||['',''])[1]}</span></div>`).join('')}
      </div>
      <button class="btn" id="ms_clear" style="margin-top:8px;width:100%">Deseleccionar todo</button>`;
    const cb=document.getElementById('ms_clear');
    if(cb)cb.onclick=()=>{state.msel.clear();render();showDetail();};
    return;
  }
  if(!n){app.classList.remove('sel');
    d.innerHTML=state.edit?`<div class="dtitle">Modo edición</div>
      <div class="dtype">Selecciona un equipo del mapa o pulsa «＋ Equipo»</div>
      <div class="hintbox">Los cambios se guardan en este navegador. Usa <b>Exportar</b> para llevarlos a otro PC o <b>Abrir</b> para cargar un archivo.</div>`:'';
    return;}
  app.classList.add('sel');
  const isEd=state.edit||state.editing===n.id;
  d.innerHTML=isEd?formHTML(n):readHTML(n);
  if(isEd){
    bindChips(d);
    bindLists('e',n.tipo);
    bindPorts('e');
    document.getElementById('e_save').onclick=()=>saveEdit(n.id);
    document.getElementById('e_del').onclick=()=>delNode(n.id);
    d.querySelectorAll('.x').forEach(b=>b.onclick=()=>delLink(b.dataset.s,b.dataset.t));
    var ipb=document.getElementById('e_ipadd');
    if(ipb)ipb.onclick=function(){var t=document.getElementById('e_ip');
      t.value=(t.value.trim()?t.value.replace(/\s+$/,'')+'\n':''); t.focus();};
    document.getElementById('e_ladd').onclick=()=>{
      const v=document.getElementById('e_lsel').value; if(v)addLink(n.id,v);};
    if(!state.edit){
      const dl=document.getElementById('e_del');
      const acts=dl?dl.parentNode:null;
      if(acts&&!document.getElementById('e_close')){
        const b=document.createElement('button');
        b.className='btn'; b.id='e_close'; b.textContent='✕ Cerrar';
        b.onclick=()=>{state.editing=null;showDetail();};
        acts.appendChild(b);
      }
    }
  } else {
    d.querySelectorAll('.hitem').forEach(el=>el.onclick=()=>select(el.dataset.id,true));
    d.querySelectorAll('.pcell.on').forEach(el=>el.onclick=()=>select(el.dataset.id,true));
    d.querySelectorAll('.plist .prowC').forEach(el=>el.onclick=(ev)=>{ if(ev.target&&(ev.target.tagName==='SELECT'||ev.target.tagName==='OPTION'))return; if(el.dataset.id)select(el.dataset.id,true); });
    d.querySelectorAll('.plist .prow').forEach(el=>el.style.cursor='pointer');
    const st=document.getElementById('e_start');
    if(st)st.onclick=()=>{state.editing=n.id;showDetail();};
  }
}
