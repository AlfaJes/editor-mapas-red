import { S } from './00-store.js';
import { state } from './01-base.js';
import { ZBOX, allZonas } from './03-layout.js';
import { C } from './04a-geometria.js';
import { assignPort, pathHint, render } from './04b-render-mapa.js';
import { showDetail } from './04c-ficha-formularios.js';
import { setBtn } from './07-ui.js';
import { svg, t, world } from './dom.js';
export function buildStaticSVG(light){
  var svgEl=document.getElementById('map');
  var clone=svgEl.cloneNode(true);
  Array.prototype.forEach.call(clone.querySelectorAll('.edge-hit,.zh,.ahit,.ah'),function(e){ if(e.parentNode)e.parentNode.removeChild(e); });
  var xs=[],ys=[];
  S.nodes.forEach(function(n){xs.push(n.x);ys.push(n.y);});
  ZBOX.forEach(function(b){xs.push(b.x,b.x+(b.w||340));ys.push(b.y,b.y+(b.h||150));});
  var x0=Math.min.apply(null,xs)-40,x1=Math.max.apply(null,xs)+40;
  var y0=Math.min.apply(null,ys)-40,y1=Math.max.apply(null,ys)+40;
  var W=Math.round(x1-x0),H=Math.round(y1-y0);
  clone.setAttribute('viewBox',x0+' '+y0+' '+W+' '+H);
  clone.setAttribute('width',W); clone.setAttribute('height',H);
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  var w=clone.querySelector('#world'); if(w)w.removeAttribute('transform');
  var C = light
    ? {bg:'#ffffff',txt:'#16233a',ip:'#41597c',edge:'#3f5b86',eo:'.85',hull:'#f3f8ff',hs:'#c3d3ea',pill:'#e8f0fc',ps:'#c3d3ea',hl:'#24344d'}
    : {bg:'#0a1120',txt:'#dbe9ff',ip:'#8fb3dd',edge:'#5b7cae',eo:'.6',hull:'rgba(79,140,255,.05)',hs:'rgba(120,160,230,.3)',pill:'#152238',ps:'#2a4166',hl:'#dbe9ff'};
  var bg=document.createElementNS('http://www.w3.org/2000/svg','rect');
  bg.setAttribute('x',x0); bg.setAttribute('y',y0);
  bg.setAttribute('width',W); bg.setAttribute('height',H);
  bg.setAttribute('fill',C.bg);
  clone.insertBefore(bg,clone.firstChild);
  Array.prototype.forEach.call(clone.querySelectorAll('text'),function(t){
    var cl=t.getAttribute('class')||'';
    if(cl.indexOf('hull-l')>=0) t.setAttribute('fill',C.hl);
    else if(cl.indexOf('ip')>=0||cl.indexOf('elab')>=0) t.setAttribute('fill',C.ip);
    else t.setAttribute('fill',C.txt);
  });
  Array.prototype.forEach.call(clone.querySelectorAll('path.edge'),function(pt){
    var cl=pt.getAttribute('class')||'';
    var on=cl.indexOf('on')>=0;
    pt.setAttribute('fill','none');
    if(!on) pt.setAttribute('stroke',C.edge);
    pt.setAttribute('stroke-opacity',on?'1':C.eo);
    pt.setAttribute('stroke-width',on?'3':'1.6');
  });
  var st=document.createElementNS('http://www.w3.org/2000/svg','style');
  st.setAttribute('type','text/css');
  st.textContent='text{font:11px system-ui,-apple-system,Segoe UI,sans-serif;text-anchor:middle;fill:'+C.txt+'}'+
    '.ip{font-size:10px}.elab{font-size:9.5px}'+
    '.edge{fill:none;stroke:'+C.edge+';stroke-opacity:'+C.eo+';stroke-width:1.6}'+
    '.edge.on{stroke:#fbbf24;stroke-opacity:1;stroke-width:3}.edge.hid{opacity:.12}'+
    '.hull{fill:'+C.hull+';stroke:'+C.hs+';stroke-dasharray:5 5}'+
    '.hull-l{font-size:11.5px;font-weight:700;text-anchor:start;fill:'+C.hl+'}'+
    '.hull-pill{fill:'+C.pill+';stroke:'+C.ps+'}'+
    '.zh{display:none}';
  clone.insertBefore(st,bg.nextSibling);
  var data=new XMLSerializer().serializeToString(clone);
  return {data:data,W:W,H:H,url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data)};
}
export function exportPNG(){
  var s=buildStaticSVG(false),W=s.W,H=s.H;
  if(W>4200){ H=Math.round(H*4200/W); W=4200; }
  var img=new Image();
  img.onload=function(){
    var c=document.createElement('canvas'); c.width=W*2; c.height=H*2;
    var ctx=c.getContext('2d'); ctx.scale(2,2);
    ctx.fillStyle='#0a1120'; ctx.fillRect(0,0,W,H);
    ctx.drawImage(img,0,0,W,H);
    c.toBlob(function(b){
      var a=document.createElement('a'); a.href=URL.createObjectURL(b);
      a.download='mapa_red_levante.png'; a.click();
    });
  };
  img.src=s.url;
}
export function exportPDF(){
  var s=buildStaticSVG(true);
  var tit=(S.doc.title||'Mapa de red');
  var sub=(S.doc.subtitle||'');
  var hoy=new Date().toLocaleDateString('es-ES');
  var win=window.open('','_blank');
  if(!win){ alert('Permite las ventanas emergentes para exportar a PDF.'); return; }
  var css='@page{size:A4 landscape;margin:8mm}'+
    'body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#16233a}'+
    'h1{font-size:14pt;margin:0 0 2px}'+
    '.sub{font-size:8.5pt;color:#5a6b85;margin:0 0 4px}'+
    '.sheet{display:flex;align-items:center;justify-content:center;height:168mm;border:0}'+
    'img{max-width:100%;max-height:168mm;width:auto;height:auto}'+
    '.ft{font-size:7.5pt;color:#7b8aa3;margin-top:2px}';
  var html='<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">'+
    '<title>'+tit+'</title><style>'+css+'</style></head><body>'+
    '<h1>'+tit+'</h1><div class="sub">'+sub+'</div>'+
    '<div class="sheet"><img src="'+s.url+'"></div>'+
    '<div class="ft">'+S.nodes.length+' equipos \u00b7 '+S.edges.length+' enlaces \u00b7 '+allZonas().length+' secciones \u00b7 '+hoy+'</div>'+
    '</body></html>';
  win.document.open(); win.document.write(html); win.document.close();
  win.focus();
  setTimeout(function(){ try{win.print();}catch(e){} },700);
}

document.addEventListener('change',function(ev){
  var s=ev.target;
  if(!s||!s.classList||!s.classList.contains('psel'))return;
  var ei=parseInt(s.dataset.ei,10), side=s.dataset.side, np=parseInt(s.value,10);
  var e=S.doc.edges[ei];
  if(!e||!assignPort(e,side,np)){ showDetail(); }
});
document.getElementById('bPath').onclick=function(){
  state.pathMode=!state.pathMode; state.pathA=null; state.path=null;
  setBtn('bPath',state.pathMode);
  pathHint(state.pathMode,'\ud83e\udded Ruta: pulsa el equipo de origen');
  render(); showDetail();
};
