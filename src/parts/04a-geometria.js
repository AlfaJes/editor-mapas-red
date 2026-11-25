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
