// ---------- ruta, revisión, export ----------
function inPath(s,t){
  if(!state.path)return false;
  for(var i=0;i<state.path.length-1;i++){
    var a=state.path[i],b=state.path[i+1];
    if((a===s&&b===t)||(a===t&&b===s))return true;
  }
  return false;
}
function bfsPath(a,b){
  if(!byId[a]||!byId[b])return null;
  var prev={},seen={},q=[a]; seen[a]=1;
  while(q.length){
    var cur=q.shift(); if(cur===b)break;
    var nb=adj[cur]; if(!nb)continue;
    nb.forEach(function(nx){ if(!seen[nx]){seen[nx]=1;prev[nx]=cur;q.push(nx);} });
  }
  if(!seen[b])return null;
  var out=[b],c=b;
  while(c!==a){c=prev[c]; if(!c)return null; out.unshift(c);}
  return out;
}
function reviewIssues(){
  var out=[],ipM={},macM={};
  nodes.forEach(function(n){
    (n.ip||[]).forEach(function(ip){(ipM[ip]=ipM[ip]||[]).push(n);});
    var m=(n.mac||'').trim().toUpperCase();
    if(m&&m!=='—'&&m!=='?'){(macM[m]=macM[m]||[]).push(n);}
  });
  Object.keys(ipM).forEach(function(ip){ if(ipM[ip].length>1)out.push({ic:'\u29c9',t:'IP duplicada \u00b7 '+ip+(netName(ip)?' \u00b7 '+netName(ip):''),who:ipM[ip],n:ipM[ip][0]}); });
  Object.keys(macM).forEach(function(m){ if(macM[m].length>1)out.push({ic:'\u29c9',t:'MAC duplicada \u00b7 '+m,who:macM[m],n:macM[m][0]}); });
  nodes.forEach(function(n){
    if(!(n.ip||[]).length)out.push({ic:'\u00b7',t:'Sin IP',who:[n],n:n});
    (n.ip||[]).forEach(function(ip){
      if(!/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip))
        out.push({ic:'!',t:'IP fuera de rango privado \u00b7 '+ip,who:[n],n:n});
    });
    if(!n.modelo)out.push({ic:'\u00b7',t:'Sin modelo',who:[n],n:n});
    if((n.tipo==='switch'||n.tipo==='router')&&!(n.ports&&n.ports.length))
      out.push({ic:'\u00b7',t:'Sin inventario de puertos',who:[n],n:n});
    if((n.tipo==='pc'||n.tipo==='server')&&!(n.perifs&&n.perifs.length)&&!n.so)
      out.push({ic:'\u00b7',t:'PC/servidor sin SO ni perif\u00e9ricos',who:[n],n:n});
  });
  return out;
}
function renderCmodal(){
  var box=document.getElementById('clist'); if(!box)return;
  var iss=reviewIssues();
  if(!iss.length){box.innerHTML='<div class="empty" style="padding:14px">Sin incidencias: el inventario est\u00e1 completo.</div>';return;}
  box.innerHTML='<div class="cnorm">Un mismo equipo con IPs en subredes distintas (p. ej. 192.168.41.25 y 192.168.1.25) <b>no</b> es duplicado. Aquí solo se marcan IPs repetidas entre equipos distintos.</div><div class="chead">'+iss.length+' avisos</div>'+iss.map(function(x,i){
    return '<div class="crow" data-i="'+i+'"><span class="ci">'+x.ic+'</span><span class="cn">'+
      escAttr(x.t)+'</span><span class="cd">'+escAttr(x.who.map(function(w){return w.nombre;}).join(' / ').slice(0,58))+'</span></div>';
  }).join('');
  box.querySelectorAll('.crow').forEach(function(el){
    el.onclick=function(){
      var x=iss[+el.dataset.i]; if(!x)return;
      document.getElementById('cmodal').classList.remove('on');
      select(x.n.id,true);
    };
  });
}
var NETS=['Oficinas','Producci\u00f3n','Servidores','sin'];
function netsChips(){ var l=netsList(); if(l.indexOf('sin')<0)l=l.concat(['sin']); return l; }
function renderNets(){
  var box=document.getElementById('fNets'); if(!box)return;
  box.innerHTML=netsChips().map(function(k){
    return '<button type="button" class="nc'+(state.nets.has(k)?' on':'')+'" data-k="'+k+'">'+
      '<i style="background:'+(k==='sin'?'#475569':netColOf(k))+'"></i>'+(k==='sin'?'Sin red':k)+'</button>';
  }).join('');
  box.querySelectorAll('.nc').forEach(function(b){
    b.onclick=function(){
      var k=b.dataset.k;
      if(state.nets.has(k))state.nets.delete(k); else state.nets.add(k);
      renderNets(); render(); renderList();
    };
  });
}
function buildStaticSVG(light){
  var svgEl=document.getElementById('map');
  var clone=svgEl.cloneNode(true);
  Array.prototype.forEach.call(clone.querySelectorAll('.edge-hit,.zh,.ahit,.ah'),function(e){ if(e.parentNode)e.parentNode.removeChild(e); });
  var xs=[],ys=[];
  nodes.forEach(function(n){xs.push(n.x);ys.push(n.y);});
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
function exportPNG(){
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
function exportPDF(){
  var s=buildStaticSVG(true);
  var tit=(doc.title||'Mapa de red');
  var sub=(doc.subtitle||'');
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
    '<div class="ft">'+nodes.length+' equipos \u00b7 '+edges.length+' enlaces \u00b7 '+allZonas().length+' secciones \u00b7 '+hoy+'</div>'+
    '</body></html>';
  win.document.open(); win.document.write(html); win.document.close();
  win.focus();
  setTimeout(function(){ try{win.print();}catch(e){} },700);
}

document.addEventListener('change',function(ev){
  var s=ev.target;
  if(!s||!s.classList||!s.classList.contains('psel'))return;
  var ei=parseInt(s.dataset.ei,10), side=s.dataset.side, np=parseInt(s.value,10);
  var e=doc.edges[ei];
  if(!e||!assignPort(e,side,np)){ showDetail(); }
});
document.getElementById('bPath').onclick=function(){
  state.pathMode=!state.pathMode; state.pathA=null; state.path=null;
  setBtn('bPath',state.pathMode);
  pathHint(state.pathMode,'\ud83e\udded Ruta: pulsa el equipo de origen');
  render(); showDetail();
};
function renderCats(){
  var box=document.getElementById('rncat'); if(!box)return;
  box.innerHTML=cabCats().map(function(c,i){
    return '<div class="zrow" data-ci="'+i+'">'+
      '<input class="rc-n" value="'+escAttr(c.n)+'" style="flex:1;min-width:90px">'+
      '<input type="color" class="rc-c" value="'+(c.col||'#22d3ee')+'" style="width:42px;height:24px;padding:0;border:none;background:none">'+
      '<button class="x" data-cdel="'+i+'" title="Quitar categoría">\u2715</button></div>';
  }).join('')||'<div class="empty" style="padding:6px 0">Sin categorías</div>';
  box.querySelectorAll('.rc-n').forEach(function(inp,i){
    inp.onchange=function(){ cabCats()[i].n=inp.value.trim()||cabCats()[i].n; save(); render(); renderRedes(); };
  });
  box.querySelectorAll('.rc-c').forEach(function(inp,i){
    inp.oninput=function(){ cabCats()[i].col=inp.value; save(); render(); };
  });
  box.querySelectorAll('[data-cdel]').forEach(function(b){
    b.onclick=function(){
      var i=+b.getAttribute('data-cdel'); var cat=cabCats()[i];
      if(!confirm('¿Quitar la categoría «'+cat.n+'»? Los cables que la usan se quedarán sin categoría.'))return;
      doc.edges.forEach(function(e){ if(e.cat===cat.n)delete e.cat; });
      doc.cabcats.splice(i,1); save(); render(); renderRedes();
    };
  });
}
document.getElementById('cnadd').onclick=function(){
  var n=document.getElementById('cnname').value.trim();
  var c=document.getElementById('cncol').value||'#22d3ee';
  if(!n)return;
  if(cabCats().some(function(x){return x.n===n;})){ alert('Ya existe esa categoría'); return; }
  cabCats().push({n:n,col:c}); document.getElementById('cnname').value='';
  save(); render(); renderRedes();
};
function renderRedes(){
  var box=document.getElementById('rnlist'); if(!box)return;
  var rs=doc.redes||DEFAULT_REDES();
  box.innerHTML=rs.map(function(r,i){
    return '<div class="zrow" style="grid-template-columns:1fr 130px 46px 34px">'+
      '<input class="rn-n" data-i="'+i+'" value="'+escAttr(r.n)+'" style="background:#0c1626;border:1px solid #26374f;border-radius:6px;color:#dbe9ff;font-size:12px;padding:5px 7px">'+
      '<input class="rn-p" data-i="'+i+'" value="'+escAttr(r.pre||'')+'" placeholder="192.168.50." style="background:#0c1626;border:1px solid #26374f;border-radius:6px;color:#dbe9ff;font-size:12px;padding:5px 7px">'+
      '<input type="color" class="rn-c" data-i="'+i+'" value="'+escAttr(r.col||'#94a3b8')+'" style="width:42px;height:28px;padding:0;border:none;background:none">'+
      '<button class="x" data-rdel="'+i+'" title="Quitar esta red">✕</button></div>';
  }).join('')||'<div class="empty">Sin redes</div>';
  box.querySelectorAll('.rn-n,.rn-p,.rn-c').forEach(function(el){
    el.onchange=function(){
      var i=+el.dataset.i; var rs2=doc.redes||DEFAULT_REDES();
      if(!rs2[i])return;
      if(el.classList.contains('rn-n'))rs2[i].n=el.value.trim()||rs2[i].n;
      if(el.classList.contains('rn-p'))rs2[i].pre=el.value.trim();
      if(el.classList.contains('rn-c'))rs2[i].col=el.value;
      doc.redes=rs2; save(); rebuild(); rebuildUI(); render(); renderList(); showDetail(); renderRedes();
    };
  });
  box.querySelectorAll('[data-rdel]').forEach(function(b){
    b.onclick=function(){
      var i=+b.dataset.rdel; var rs2=doc.redes||DEFAULT_REDES();
      var usados=nodes.filter(function(n){return (n.nets||[]).indexOf(rs2[i].n)>=0;}).length;
      if(usados && !confirm('Hay '+usados+' equipos en «'+rs2[i].n+'». Si la quitas pasarán a la red sin prefijo. ¿Continuar?'))return;
      rs2.splice(i,1); doc.redes=rs2; save(); rebuild(); rebuildUI(); render(); renderList(); renderRedes();
    };
  });
}
function openRedes(){ var m=document.getElementById('moreMenu'); if(m)m.classList.remove('on');
  renderRedes(); renderCats(); document.getElementById('rnm').classList.add('on'); }
(function(){ var b=document.getElementById('bNets'); if(b)b.onclick=openRedes; })();
(function(){ var b=document.getElementById('bNets2'); if(b)b.onclick=openRedes; })();
document.getElementById('rnclose').onclick=function(){ document.getElementById('rnm').classList.remove('on'); };
document.getElementById('rnadd').onclick=function(){
  var n=document.getElementById('rnname').value.trim(), p=document.getElementById('rnpre').value.trim(), c=document.getElementById('rncol').value;
  if(!n){ document.getElementById('rnname').focus(); return; }
  doc.redes=doc.redes||DEFAULT_REDES();
  if(doc.redes.some(function(r){return r.n===n;})){ alert('Ya existe una red con ese nombre'); return; }
  if(p && doc.redes.some(function(r){return r.pre===p;})){ if(!confirm('Ya hay una red con el prefijo '+p+'. Las IPs se asignar\u00e1n a la primera que coincida. \u00bfContinuar?'))return; }
  doc.redes.push({n:n,pre:p,col:c});
  document.getElementById('rnname').value=''; document.getElementById('rnpre').value='';
  save(); rebuild(); rebuildUI(); render(); renderList(); showDetail(); renderRedes();
};
document.getElementById('bCheck').onclick=function(){ renderCmodal(); document.getElementById('cmodal').classList.add('on'); };
document.getElementById('c_close').onclick=function(){ document.getElementById('cmodal').classList.remove('on'); };
document.getElementById('bMore').onclick=function(ev){
  ev.stopPropagation();
  document.getElementById('moreMenu').classList.toggle('on');
};
document.addEventListener('click',function(ev){
  var m=document.getElementById('moreMenu');
  if(m&&m.classList.contains('on')&&!ev.target.closest('#moreMenu')&&ev.target.id!=='bMore')
    m.classList.remove('on');
});
document.getElementById('bPres').onclick=function(){
  var on=!document.body.classList.contains('present');
  document.body.classList.toggle('present',on);
  setBtn('bPres',on);
  var nm=document.getElementById('presname'); if(nm)nm.textContent=doc.title||'Mapa de red';
  setTimeout(function(){ fit(); },80);
};
document.getElementById('presbar').onclick=function(){
  document.body.classList.remove('present');
  setBtn('bPres',false);
  setTimeout(function(){ fit(); },80);
};
document.getElementById('bPng').onclick=exportPNG;
function saveApp(){
  try{ doc.savedAt=new Date().toISOString(); save(); }catch(e){}
  var clone=document.documentElement.cloneNode(true);
  var body=clone.querySelector('body'); if(body)body.classList.remove('present');
  var sc=clone.querySelector('#seed-data');
  if(sc) sc.textContent=JSON.stringify(doc).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  var html='<!DOCTYPE html>\n'+clone.outerHTML;
  var blob=new Blob([html],{type:'text/html;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='Mapa_Red_Levante_'+new Date().toISOString().slice(0,10)+'.html';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1500);
  var b=document.getElementById('dirty'); if(b)b.textContent='archivo guardado';
}
var ndrag=null, nres=null, NT={kind:'note',e:null};
function noteLines(txt,w,sz){
  var maxc=Math.max(4,Math.floor((w-20)/(sz*0.55)));
  var out=[];
  String(txt||'').split(/\n/).forEach(function(par){
    if(!par.length){ out.push(''); return; }
    var ln='';
    par.split(/\s+/).forEach(function(wd){
      var cand=ln?ln+' '+wd:wd;
      if(cand.length>maxc){ if(ln)out.push(ln); ln=wd; } else ln=cand;
    });
    if(ln)out.push(ln);
  });
  return out.length?out:[''];
}
function notesHTML(){
  return (doc.notes||[]).map(function(nn){
    var sz=nn.sz||13, w=nn.w||220;
    var zb=nn.z?(ZBOX.filter(function(b){return b.z===nn.z;})[0]||null):null;
    var nx=zb?(zb.x+(nn.ox||0)):nn.x, ny=zb?(zb.y+(nn.oy||0)):nn.y;
    nn._x=nx; nn._y=ny;
    var lines=noteLines(nn.t,w,sz);
    var hh=Math.max(20,lines.length*sz*1.4+14);
    if(nn.hFix)hh=Math.max(hh,nn.hFix);
    nn.h=hh;
    var cls='note'+(state.noteId===nn.id?' sel2':'');
    var tsp=lines.map(function(l,i){
      return '<tspan x="10" dy="'+(i?sz*1.4:0)+'">'+escAttr(l||' ')+'</tspan>';
    }).join('');
    return '<g class="'+cls+'" data-nid="'+nn.id+'" transform="translate('+nx+','+ny+')">'+
      '<rect class="ntbg" width="'+w+'" height="'+hh+'" rx="8"/>'+
      '<text class="ntt" x="10" y="'+(sz+3)+'" fill="'+(nn.col||'#dbe9ff')+'" style="font-size:'+sz+'px">'+tsp+'</text>'+
      '<rect class="nzh" x="'+(w-12)+'" y="'+(hh-12)+'" width="10" height="10" rx="2"/></g>';
  }).join('');
}
function openNote(id){
  var nn=id?(doc.notes||[]).filter(function(x){return x.id===id;})[0]:null;
  state.noteId=nn?nn.id:null; NT={kind:'note',e:null};
  document.getElementById('n_text').value=nn?nn.t:'';
  document.getElementById('n_sz').value=nn?(nn.sz||13):13;
  document.getElementById('n_w').value=nn?(nn.w||220):220;
  document.getElementById('n_col').value=nn&&nn.col?nn.col:'#8fc7ff';
  document.getElementById('n_del').style.display=nn?'':'none';
  var wsw0=document.getElementById('n_style_wrap'); if(wsw0)wsw0.style.display='none';
  var zsel=document.getElementById('n_zone');
  if(zsel){
    var zz=(typeof zonas!=='undefined'?zonas:[]).slice().sort(function(x,y){return x.localeCompare(y,'es');});
    zsel.innerHTML='<option value="">\u2014 suelto \u2014</option>'+zz.map(function(z){
      return '<option value="'+escAttr(z)+'">'+escAttr(z)+'</option>';}).join('');
    zsel.value=(nn&&nn.z)?nn.z:'';
  }
  document.getElementById('nmodal').classList.add('on');
  setTimeout(function(){ document.getElementById('n_text').focus(); },60);
}
function openEdgeNote(ed){
  if(!ed)return;
  NT={kind:'edge',e:ed};
  state.noteId=null;
  var wswE=document.getElementById('n_style_wrap'); if(wswE)wswE.style.display='none';
  var nt=ed.nt||{};
  document.getElementById('n_text').value=nt.t||'';
  document.getElementById('n_sz').value=nt.sz||12;
  document.getElementById('n_w').value=nt.w||200;
  document.getElementById('n_col').value=nt.col||'#ffd7a1';
  document.getElementById('n_del').style.display=(nt.t?'':'none');
  document.getElementById('nmodal').classList.add('on');
  setTimeout(function(){ document.getElementById('n_text').focus(); },60);
}
function saveNote(){
  var txt=document.getElementById('n_text').value;
  var sz=Math.max(8,Math.min(30,parseInt(document.getElementById('n_sz').value)||13));
  var w=Math.max(40,Math.min(600,parseInt(document.getElementById('n_w').value)||220));
  var col=document.getElementById('n_col').value;
  if(NT.kind==='arrow'&&NT.ar){
    snap();
    NT.ar.t=txt; NT.ar.col=col; NT.ar.w=w;
    var stEl=document.getElementById('n_style'); if(stEl)NT.ar.st=stEl.value||'line';
    NT.ar.sw=Math.max(1,Math.min(9,parseInt(document.getElementById('n_sz').value)||2));
    save(); render(); document.getElementById('nmodal').classList.remove('on'); return;
  }
  if(NT.kind==='edge'&&NT.e){
    snap();
    NT.e.nt={t:txt,sz:sz,w:w,col:col};
    save(); render(); showDetail();
    document.getElementById('nmodal').classList.remove('on');
    return;
  }
  doc.notes=doc.notes||[];
  snap();
  var zn=document.getElementById('n_zone');
  var zval=(zn&&!zn.disabled)?zn.value:'';
  function linkZone(nn){
    if(!nn)return;
    if(zval){
      var b=ZBOX.filter(function(q){return q.z===zval;})[0];
      nn.z=zval; nn.ox=Math.round((nn.x||0)-(b?b.x:0)); nn.oy=Math.round((nn.y||0)-(b?b.y:0));
    } else { delete nn.z; delete nn.ox; delete nn.oy; }
  }
  if(state.noteId){
    var ex=doc.notes.filter(function(x){return x.id===state.noteId;})[0];
    if(ex){ ex.t=txt; ex.sz=sz; ex.w=w; ex.col=col; linkZone(ex); }
  } else {
    var cx=(-t.x+svg.clientWidth/2)/t.k, cy=(-t.y+svg.clientHeight/2)/t.k;
    var nn2={id:'nt'+Date.now().toString(36),x:sn(cx-110),y:sn(cy-40),w:w,sz:sz,t:txt,col:col};
    doc.notes.push(nn2); linkZone(nn2);
  }
  save(); render();
  document.getElementById('nmodal').classList.remove('on');
}
document.getElementById('bNote').onclick=function(){ openNote(null); };
document.getElementById('n_ok').onclick=saveNote;
document.getElementById('n_cancel').onclick=function(){ document.getElementById('nmodal').classList.remove('on'); };
document.getElementById('n_del').onclick=function(){
  if(NT.kind==='arrow'&&NT.ar){
    snap(); doc.arrows=(doc.arrows||[]).filter(function(x){return x.id!==NT.ar.id;});
    state.arrowSel=null; save(); render();
    document.getElementById('nmodal').classList.remove('on'); return;
  }
  if(NT.kind==='edge'&&NT.e){
    if(!NT.e.nt)return;
    snap(); delete NT.e.nt; save(); render(); showDetail();
    document.getElementById('nmodal').classList.remove('on');
    return;
  }
  if(!state.noteId)return;
  var id=state.noteId; snap();
  doc.notes=(doc.notes||[]).filter(function(x){return x.id!==id;});
  state.noteId=null; save(); render();
  document.getElementById('nmodal').classList.remove('on');
};
svg.addEventListener('dblclick',function(e){
  var af=e.target.closest?e.target.closest('.arrow'):null;
  if(af&&af.dataset.aid){
    var ar=(doc.arrows||[]).filter(function(x){return x.id===af.dataset.aid;})[0];
    if(ar){ openArrow(ar); return; }
  }
  var hp=e.target.closest?e.target.closest('.eh'):null;
  if(hp&&hp.dataset.i!=null){
    var q=hp.dataset.e.split('|');
    var qe=doc.edges.filter(function(x){return (x.s===q[0]&&x.t===q[1])||(x.s===q[1]&&x.t===q[0]);})[0];
    if(qe&&Array.isArray(qe.pts)){
      snap(); qe.pts.splice(parseInt(hp.dataset.i)||0,1);
      if(!qe.pts.length){delete qe.bx;delete qe.by;}
      save(); render(); return;
    }
  }
  var eb=e.target.closest?e.target.closest('.elab2'):null;
  if(eb&&eb.dataset.e){
    var pp=eb.dataset.e.split('|');
    var ed=doc.edges.filter(function(x){return (x.s===pp[0]&&x.t===pp[1])||(x.s===pp[1]&&x.t===pp[0]);})[0];
    if(ed){ state.esel={s:ed.s,t:ed.t}; openEdgeNote(ed); return; }
  }
  var el=e.target.closest?e.target.closest('.note'):null;
  if(el){ openNote(el.dataset.nid); }
});

function noteAt(x,y){
  var hit=(doc.notes||[]).filter(function(nn){
    var nb=noteBox(nn.id);
    return nb&&x>=nb.x&&x<=nb.x+nb.w&&y>=nb.y&&y<=nb.y+nb.h;
  })[0];
  return hit?hit.id:null;
}
function snapArrowEnd(a,end){
  var p = end===2?[a.x2,a.y2]:[a.x1,a.y1];
  var best=null,bd=1e9;
  nodes.forEach(function(n){
    var d=Math.sqrt(Math.pow(n.x-p[0],2)+Math.pow(n.y-p[1],2));
    if(d<bd){bd=d;best=n;}
  });
  if(best&&bd<34){
    if(end===2){a.n2=best.id;a.x2=best.x;a.y2=best.y;}
    else {a.n1=best.id;a.x1=best.x;a.y1=best.y;}
  } else {
    if(end===2)delete a.n2; else delete a.n1;
    var nAt=noteAt(p[0],p[1]);
    if(nAt){
      if(end===2){a.nt2=nAt; delete a.z2;} else {a.nt1=nAt; delete a.z1;}
      if(end===2){a.x2=p[0];a.y2=p[1];} else {a.x1=p[0];a.y1=p[1];}
    } else {
      if(end===2)delete a.nt2; else delete a.nt1;
      var z=zoneAt(p[0],p[1]);
      if(z){ var c=zoneCenter(z)||p; 
        if(end===2){a.z2=z;a.x2=c[0];a.y2=c[1];} else {a.z1=z;a.x1=c[0];a.y1=c[1];}
      } else { if(end===2)delete a.z2; else delete a.z1; }
    }
  }
}
var adrag=null;
function zoneAt(x,y){
  var b=ZBOX.filter(function(q){return x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h;})[0];
  return b?b.z:null;
}
function zoneCenter(z){
  var b=ZBOX.filter(function(q){return q.z===z;})[0];
  return b?[b.x+b.w/2,b.y+b.h/2]:null;
}
function boxOf(z){ return ZBOX.filter(function(q){return q.z===z;})[0]||null; }
function noteBox(id){
  var nn=(doc.notes||[]).filter(function(x){return x.id===id;})[0];
  if(!nn)return null;
  var x=(typeof nn._x==='number')?nn._x:nn.x, y=(typeof nn._y==='number')?nn._y:nn.y;
  return {x:x,y:y,w:nn.w||220,h:nn.h||40};
}
function rawPt(a,end){
  var nid=(end===2)?a.n2:a.n1, zid=(end===2)?a.z2:a.z1;
  if(nid&&byId[nid])return [byId[nid].x,byId[nid].y];
  var tid=(end===2)?a.nt2:a.nt1;
  if(tid){var nb=noteBox(tid); if(nb)return [nb.x+nb.w/2,nb.y+nb.h/2];}
  if(zid){var b=boxOf(zid); if(b)return [b.x+b.w/2,b.y+b.h/2];}
  return (end===2)?[a.x2,a.y2]:[a.x1,a.y1];
}
function borderPoint(b,from){
  if(!b)return from;
  var cx=b.x+b.w/2, cy=b.y+b.h/2;
  var fx=from[0], fy=from[1];
  if(fx>=b.x&&fx<=b.x+b.w&&fy>=b.y&&fy<=b.y+b.h) return [fx,fy];
  var dx=fx-cx, dy=fy-cy;
  if(!dx&&!dy) return [cx,cy];
  var tx=(dx>0)?((b.x+b.w-cx)/dx):((b.x-cx)/dx);
  var ty=(dy>0)?((b.y+b.h-cy)/dy):((b.y-cy)/dy);
  var t=Math.min(Math.abs(tx),Math.abs(ty));
  return [cx+dx*t, cy+dy*t];
}
function arrowPt(a,end){
  var nid=(end===2)?a.n2:a.n1, zid=(end===2)?a.z2:a.z1;
  if(nid&&byId[nid])return [byId[nid].x,byId[nid].y];
  var tid=(end===2)?a.nt2:a.nt1;
  if(tid){
    var nb=noteBox(tid);
    if(nb)return borderPoint(nb, rawPt(a, end===2?1:2));
  }
  if(zid){
    var b=boxOf(zid);
    if(b)return borderPoint(b, rawPt(a, end===2?1:2));
  }
  return (end===2)?[a.x2,a.y2]:[a.x1,a.y1];
}
function arrowsHTML(){
  var arr=doc.arrows||[];
  return arr.map(function(a){
    var col=a.col||'#ffd7a1', sw=a.sw||2.2;
    var P1=arrowPt(a,1), P2=arrowPt(a,2);
    a.x1=P1[0]; a.y1=P1[1]; a.x2=P2[0]; a.y2=P2[1];
    var st=a.st||'line';
    var x1=a.x1,y1=a.y1,x2=a.x2,y2=a.y2;
    var ang=Math.atan2(y2-y1,x2-x1), L=Math.max(11,sw*5.5);
    var dash=(st==='dash')?' stroke-dasharray="9 6"':(st==='dotted'?' stroke-dasharray="2 6"':'');
    var s='<g class="arrow" data-aid="'+a.id+'">';
    if(st==='block'){
      var len=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1))||1;
      var ux=(x2-x1)/len, uy=(y2-y1)/len, px=-uy, py=ux;
      var hw=Math.max(4,sw*2.2), hl=Math.max(13,sw*6), hw2=Math.max(9,sw*4.2);
      var bx=x2-ux*hl, by=y2-uy*hl;
      var pts=[[x1+px*hw,y1+py*hw],[bx+px*hw,by+py*hw],[bx+px*hw2,by+py*hw2],[x2,y2],
               [bx-px*hw2,by-py*hw2],[bx-px*hw,by-py*hw],[x1-px*hw,y1-py*hw]]
        .map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ');
      s+='<polygon points="'+pts+'" fill="'+col+'"/>';
    } else {
      s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="'+sw+'" stroke-linecap="round"'+dash+'/>';
      var ax=x2-L*Math.cos(ang-Math.PI/7), ay=y2-L*Math.sin(ang-Math.PI/7);
      var bx2=x2-L*Math.cos(ang+Math.PI/7), by2=y2-L*Math.sin(ang+Math.PI/7);
      s+='<polygon points="'+x2+','+y2+' '+ax.toFixed(1)+','+ay.toFixed(1)+' '+bx2.toFixed(1)+','+by2.toFixed(1)+'" fill="'+col+'"/>';
      if(st==='double'){
        var a2=Math.atan2(y1-y2,x1-x2);
        var cx1=x1-L*Math.cos(a2-Math.PI/7), cy1=y1-L*Math.sin(a2-Math.PI/7);
        var cx2=x1-L*Math.cos(a2+Math.PI/7), cy2=y1-L*Math.sin(a2+Math.PI/7);
        s+='<polygon points="'+x1+','+y1+' '+cx1.toFixed(1)+','+cy1.toFixed(1)+' '+cx2.toFixed(1)+','+cy2.toFixed(1)+'" fill="'+col+'"/>';
      }
    }
    s+='<line class="ahit" data-aid="'+a.id+'" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="transparent" stroke-width="16"/>';
    if(a.t){
      var lw=a.w||160, lines=noteLines(a.t,lw,11);
      var hh=lines.length*11*1.35+12;
      var mx=(a.x1+a.x2)/2, my=(a.y1+a.y2)/2;
      var lx=Math.round(mx-lw/2), ly=Math.round(my-hh-10);
      s+='<rect x="'+lx+'" y="'+ly+'" width="'+lw+'" height="'+hh+'" rx="6" fill="rgba(12,22,38,.95)" stroke="'+col+'" stroke-width="1"/>'+
         '<text x="'+(lx+8)+'" y="'+(ly+13)+'" fill="'+col+'" style="font-size:11px">'+
         lines.map(function(l,i){return '<tspan x="'+(lx+8)+'" dy="'+(i?14.85:0)+'">'+escAttr(l||' ')+'</tspan>';}).join('')+'</text>';
    }
    if(state.arrowSel===a.id){
      s+='<circle class="ah'+(a.n1?' vin':'')+'" data-aid="'+a.id+'" data-end="1" cx="'+a.x1+'" cy="'+a.y1+'" r="6"/>'+
         '<circle class="ah'+(a.n2?' vin':'')+'" data-aid="'+a.id+'" data-end="2" cx="'+a.x2+'" cy="'+a.y2+'" r="6"/>';
    }
    return s+'</g>';
  }).join('');
}
function addArrow(){
  var cx=(-t.x+svg.clientWidth/2)/t.k, cy=(-t.y+svg.clientHeight/2)/t.k;
  snap();
  var a={id:'ar'+Date.now().toString(36),x1:sn(cx-100),y1:sn(cy+30),x2:sn(cx+90),y2:sn(cy-30),col:'#ffd7a1',sw:2.2,t:''};
  doc.arrows=(doc.arrows||[]).concat([a]);
  state.arrowSel=a.id; state.sel=null; state.esel=null;
  save(); render();
  return a;
}
function openArrow(ar){
  if(!ar)return;
  NT={kind:'arrow',e:null,ar:ar};
  state.noteId=null;
  document.getElementById('n_text').value=ar.t||'';
  document.getElementById('n_sz').value=ar.sw||2;
  document.getElementById('n_w').value=ar.w||160;
  document.getElementById('n_col').value=ar.col||'#ffd7a1';
  var wsw=document.getElementById('n_style_wrap'); if(wsw)wsw.style.display='';
  var sts=document.getElementById('n_style'); if(sts)sts.value=ar.st||'line';
  document.getElementById('n_del').style.display='';
  document.getElementById('nmodal').classList.add('on');
  setTimeout(function(){ document.getElementById('n_text').focus(); },60);
}
document.getElementById('bArrow').onclick=function(){ addArrow(); };

function blankDoc(){
  return normDoc({title:'Nuevo mapa de red',sub:'',autor:'',version:'',nodes:[],edges:[],
    zonasExtra:['Zona 1'],zparent:{},zpos:[],colors:{},estyle:'curvo',notes:[],arrows:[]});
}
function renderProjects(){
  var box=document.getElementById('p_list'); if(!box)return;
  if(!PROJ.list.length){ box.innerHTML='<div class="empty" style="padding:10px">Sin proyectos guardados.</div>'; return; }
  var arr=PROJ.list.slice().sort(function(a,b){return (b.updated||0)-(a.updated||0);});
  box.innerHTML=arr.map(function(it){
    var d=new Date(it.updated||Date.now());
    var dd=d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    return '<div class="prow2'+(it.id===PROJ.cur?' cur':'')+'" data-id="'+it.id+'">'+
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
function actProject(act,id){
  var it=PROJ.list.filter(function(x){return x.id===id;})[0];
  if(act==='del'){
    if(!confirm('Borrar el proyecto "'+((it&&it.title)||'')+'" de este navegador?'))return;
    try{ localStorage.removeItem(dkey(id)); }catch(e){}
    PROJ.list=PROJ.list.filter(function(x){return x.id!==id;});
    idxSave();
    if(PROJ.cur===id){
      if(PROJ.list.length){ projOpen(PROJ.list[0].id); }
      else { PROJ.cur=null; applyDoc(blankDoc()); save(); }
    }
    renderProjects(); return;
  }
  if(act==='dup'){
    var src=null; try{ src=localStorage.getItem(dkey(id)); }catch(e){}
    if(!src)return;
    var nid=newId();
    try{ localStorage.setItem(dkey(nid),src); }catch(e){}
    PROJ.list.push({id:nid,title:((it&&it.title)||'Mapa')+' (copia)',updated:Date.now()});
    idxSave(); renderProjects(); return;
  }
  if(act==='ren'){
    if(!it)return;
    var nv=window.prompt('Nombre del proyecto',it.title||'');
    if(nv==null)return;
    nv=nv.trim(); if(!nv)return;
    it.title=nv;
    try{ var rr=localStorage.getItem(dkey(id)); if(rr){ var dd=JSON.parse(rr); dd.title=nv; localStorage.setItem(dkey(id),JSON.stringify(dd)); } }catch(e){}
    if(PROJ.cur===id){ doc.title=nv; applyTitle(); }
    idxSave(); save(); renderProjects(); return;
  }
}
function projOpen(id){
  var d=null; try{ d=JSON.parse(localStorage.getItem(dkey(id))||'null'); }catch(e){}
  if(!d)return;
  PROJ.cur=id;
  applyDoc(d);
  document.getElementById('pmodal').classList.remove('on');
}
document.getElementById('bProj').onclick=function(){ renderProjects(); document.getElementById('pmodal').classList.add('on'); };
document.getElementById('p_close').onclick=function(){ document.getElementById('pmodal').classList.remove('on'); };
document.getElementById('p_new').onclick=function(){
  PROJ.cur=newId(); applyDoc(blankDoc()); save();
  document.getElementById('pmodal').classList.remove('on');
};
document.getElementById('p_dup').onclick=function(){ if(PROJ.cur)actProject('dup',PROJ.cur); };
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
function snapAll(){
  var g=GRID;
  nodes.forEach(function(n){ n.x=Math.round(n.x/g)*g; n.y=Math.round(n.y/g)*g;
    var d=doc.nodes.filter(function(x){return x.id===n.id;})[0]; if(d){d.x=n.x;d.y=n.y;} });
  ZBOX.forEach(function(b){ b.x=Math.round(b.x/g)*g; b.y=Math.round(b.y/g)*g; });
  doc.zpos=JSON.parse(JSON.stringify(ZBOX));
  doc.edges.forEach(function(e){ if(e.bx!=null){e.bx=Math.round(e.bx/g)*g;e.by=Math.round(e.by/g)*g;} });
  save();
}
document.getElementById('bGrid').onclick=function(){
  state.grid=!state.grid;
  setBtn('bGrid',state.grid);
  if(state.grid){ snapAll();
    if(doc.estyle==='curvo'){ doc.estyle='orto'; var be=document.getElementById('bEdge'); if(be)be.textContent='Ortogonal'; save(); }
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
function ipSub(ip){ var p=String(ip||'').split('.'); return p.length===4?p.slice(0,3).join('.'):null; }
function isL2(id){ var n=byId[id]; return !!n&&(n.tipo==='switch'||n.tipo==='otro'||n.tipo==='wifi'); }
function l2Path(a,b){
  var prev={}, seen={}; seen[a]=1;
  var q=[a];
  while(q.length){
    var cur=q.shift();
    var nbs=adj[cur]?Array.from(adj[cur]):[];
    for(var i=0;i<nbs.length;i++){
      var nb=nbs[i]; if(seen[nb])continue;
      if(nb!==b&&!isL2(nb))continue;
      seen[nb]=1; prev[nb]=cur;
      if(nb===b){ var path=[b],x=b; while(prev[x]!==undefined){x=prev[x];path.unshift(x);} return path; }
      q.push(nb);
    }
  }
  return null;
}
function pingAnalyze(){
  var hosts=nodes.filter(function(n){return n.ip&&n.ip.length;});
  var devSub={}, subDev={};
  hosts.forEach(function(n){
    devSub[n.id]=[];
    n.ip.forEach(function(ip){
      var s=ipSub(ip); if(!s)return;
      if(devSub[n.id].indexOf(s)<0)devSub[n.id].push(s);
      (subDev[s]=subDev[s]||[]).push({id:n.id,ip:ip});
    });
  });
  var subs=Object.keys(subDev);
  var se={};
  nodes.forEach(function(n){
    var ss=devSub[n.id]||[];
    for(var i=0;i<ss.length;i++)for(var j=i+1;j<ss.length;j++){
      (se[ss[i]]=se[ss[i]]||[]).push([ss[j],n.id]);
      (se[ss[j]]=se[ss[j]]||[]).push([ss[i],n.id]);
    }
  });
  function l3Path(s1,s2){
    var prev={},seen={};seen[s1]=1;var q=[[s1,[]]];
    while(q.length){
      var cur=q.shift(), nod=cur[0], hops=cur[1];
      var nb=se[nod]||[];
      for(var i=0;i<nb.length;i++){
        var to=nb[i][0], via=nb[i][1];
        if(seen[to])continue;
        seen[to]=1; var hp=hops.concat([via]);
        if(to===s2)return hp;
        q.push([to,hp]);
      }
    }
    return null;
  }
  var ok=0, viaRouter=0, noCable=[], noRoute=[], okPairs=[];
  for(var i=0;i<hosts.length;i++)for(var j=i+1;j<hosts.length;j++){
    var A=hosts[i], B=hosts[j];
    var sa=devSub[A.id]||[], sb=devSub[B.id]||[];
    var shared=sa.filter(function(s){return sb.indexOf(s)>=0;});
    if(shared.length){
      var p=l2Path(A.id,B.id);
      if(p){ ok++; okPairs.push({a:A.id,b:B.id}); }
      else {
        var via=false;
        for(var x2=0;x2<sa.length&&!via;x2++)for(var y2=0;y2<sb.length&&!via;y2++){
          if(l3Path(sa[x2],sb[y2]))via=true;
        }
        if(via){ ok++; viaRouter++; okPairs.push({a:A.id,b:B.id}); }
        else {
          var ipa=(devSub[A.id]&&A.ip)||[], ipb=B.ip||[];
          noCable.push({a:A.id,b:B.id,sub:shared[0],
            ipa:(A.ip.filter(function(q){return ipSub(q)===shared[0];})[0])||A.ip[0],
            ipb:(B.ip.filter(function(q){return ipSub(q)===shared[0];})[0])||B.ip[0]});
        }
      }
    } else {
      var done=false, ruta=null;
      for(var x=0;x<sa.length&&!done;x++)for(var y=0;y<sb.length&&!done;y++){
        var r=l3Path(sa[x],sb[y]);
        if(r){done=true;ruta=r;}
      }
      if(done){ ok++; okPairs.push({a:A.id,b:B.id}); } else noRoute.push({a:A.id,b:B.id,s1:sa[0],s2:sb[0]});
    }
  }
  var noip=nodes.filter(function(n){return !(n.ip&&n.ip.length);}).length;
  return {hosts:hosts.length,subs:subs,subDev:subDev,ok:ok,okPairs:okPairs,viaRouter:viaRouter,noCable:noCable,noRoute:noRoute,noip:noip,
          pairs:hosts.length*(hosts.length-1)/2};
}
function pingRun(){
  var r=pingAnalyze(); PINGRES=r;
  if(document.getElementById('p_heat').classList.contains('on')) pingHeat(true);
  var sum=document.getElementById('p_sum'), body=document.getElementById('p_body');
  var fails=r.noCable.length+r.noRoute.length;
  sum.innerHTML='<b style="color:#e8f1ff">'+r.hosts+'</b> equipos con IP en <b style="color:#e8f1ff">'+r.subs.length+
    '</b> subredes · <b style="color:#e8f1ff">'+r.pairs+'</b> pares probados · '+
    '<b style="color:#7ee0a6">'+r.ok+' responden</b> · '+
    '<b style="color:'+(fails?'#ff9a9a':'#7ee0a6')+'">'+fails+' fallos</b>'+
    (r.noip?' · <span style="color:#7d93b3">'+r.noip+' sin IP (no comprobables)</span>':'')+
    '<div style="margin-top:6px;color:#6b83a3;font-size:11.5px">Simulación sobre el mapa: mismo segmento = camino por switches; entre subredes = camino por routers/firewalls con IP en ambas.'+
    (r.viaRouter?' <span style="color:#9ad2ff">'+r.viaRouter+' pares sólo alcanzables vía router</span>.':'')+'</div>';
  function row(f,txt,col){
    var A=byId[f.a],B=byId[f.b];
    return '<div class="prowC" data-id="'+f.a+'" data-id2="'+f.b+'" style="cursor:pointer">'+
      '<b style="color:'+col+'">'+(txt||'\u2715')+'</b><span>'+escAttr(A?A.nombre:'?')+' \u2192 '+escAttr(B?B.nombre:'?')+
      '</span><i>'+escAttr(f.ipa||(A&&A.ip[0])||'')+' \u2192 '+escAttr(f.ipb||(B&&B.ip[0])||'')+'</i></div>';
  }
  var html='';
  if(!fails){ html+='<div class="empty" style="padding:14px 0">Todas las parejas con IP se ven entre s\u00ed.</div>'; }
  if(r.noCable.length){
    html+='<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ff9a9a;margin:8px 0 4px">Misma subred, sin cable</div>';
    r.noCable.slice(0,120).forEach(function(f){ html+=row(f,'sin cable','#ff9a9a'); });
  }
  if(r.noRoute.length){
    html+='<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#ffc86b;margin:12px 0 4px">Sin ruta entre subredes</div>';
    r.noRoute.slice(0,120).forEach(function(f){ html+=row(f,f.s1+' \u2192 '+f.s2,'#ffc86b'); });
  }
  html+='<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7d93b3;margin:14px 0 4px">Subredes detectadas</div>';
  Object.keys(r.subDev).sort().forEach(function(s){
    var ds=r.subDev[s];
    html+='<div style="font-size:12px;color:#9db2d0;padding:3px 0"><b style="color:#dbe9ff">'+s+'.0/24</b> \u00b7 '+ds.length+' equipos: '+
      ds.slice(0,8).map(function(d){return escAttr((byId[d.id]||{}).nombre||'?');}).join(', ')+(ds.length>8?'\u2026':'')+'</div>';
  });
  body.innerHTML=html;
  Array.prototype.forEach.call(body.querySelectorAll('[data-id]'),function(el){
    el.onclick=function(){
      var a=el.dataset.id, b=el.dataset.id2;
      pingPulse(bfsPath(a,b),false);
      document.getElementById('pmodal').classList.remove('on');
      state.sel=a; state.selMulti=new Set([a,b]); render(); showDetail();
      if(byId[a]){ t.k=Math.max(0.7,Math.min(1.2,t.k)); t.x=-byId[a].x*t.k+svg.clientWidth/2; t.y=-byId[a].y*t.k+svg.clientHeight/2; applyT(); }
    };
  });
}

/* ---------- capa visual del ping ---------- */
var PINGRES=null, PINGANIM=null;
function pingLayer(){
  var g=document.getElementById('gPing');
  if(!g){ g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.id='gPing';
    var w=document.getElementById('world')||svg; w.appendChild(g); }
  return g;
}
function bfsPath(a,b){
  if(a===b)return [a];
  var prev={}, seen={}, q=[a]; seen[a]=1;
  while(q.length){
    var cur=q.shift(), nbs=adj[cur]?Array.from(adj[cur]):[];
    for(var i=0;i<nbs.length;i++){
      var nb=nbs[i]; if(seen[nb])continue;
      seen[nb]=1; prev[nb]=cur;
      if(nb===b){ var path=[b],x=b; while(x!==a){x=prev[x];path.unshift(x);} return path; }
      q.push(nb);
    }
  }
  return null;
}
function pingClear(){ var g=document.getElementById('gPing'); if(g)g.innerHTML=''; }
function pingHalo(id,col,r,op){
  var n=byId[id]; if(!n)return;
  var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('cx',n.x); c.setAttribute('cy',n.y); c.setAttribute('r',r||26);
  c.setAttribute('fill',col); c.setAttribute('opacity',op||.28);
  c.setAttribute('class','halo');
  pingLayer().appendChild(c);
}
function pingHeat(show){
  var g=document.getElementById('gPing'); if(g)g.querySelectorAll('.halo').forEach(function(x){x.remove();});
  if(!show||!PINGRES)return;
  var cnt={};
  PINGRES.noCable.concat(PINGRES.noRoute).forEach(function(f){ cnt[f.a]=(cnt[f.a]||0)+1; cnt[f.b]=(cnt[f.b]||0)+1; });
  nodes.forEach(function(n){
    var k=cnt[n.id]||0; if(!k)return;
    var op=Math.min(.62,.10+k/Math.max(4,PINGRES.hosts)*1.5);
    pingHalo(n.id,'#ff6b6b',24+k*0.5,op);
  });
  nodes.forEach(function(n){ if(n.ip&&n.ip.length&&!cnt[n.id]) pingHalo(n.id,'#4be08a',22,.16); });
  pingLayer().classList.add('on');
}
function pingPulse(path,ok,cb,speed){
  if(!path||path.length<2){ if(cb)cb(); return null; }
  var pts=path.map(function(id){var n=byId[id];return n?[n.x,n.y]:null;}).filter(Boolean);
  if(pts.length<2){ if(cb)cb(); return null; }
  var segs=[],total=0;
  for(var i=1;i<pts.length;i++){var d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])||0.01;segs.push(d);total+=d;}
  var glow=document.createElementNS('http://www.w3.org/2000/svg','circle');
  glow.setAttribute('r','19'); glow.setAttribute('fill',ok?'#5ce89a':'#ff6b6b');
  glow.setAttribute('opacity','.22'); pingLayer().appendChild(glow);
  var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('r','9'); c.setAttribute('fill',ok?'#5ce89a':'#ff6b6b');
  c.setAttribute('stroke','#08111e'); c.setAttribute('stroke-width','1.6');
  pingLayer().appendChild(c);
  var t0=performance.now(), dur=Math.min(1250,Math.max(380,(speed||1.6)*total));
  function step(now){
    if(!c.parentNode)return;
    var k=Math.min(1,(now-t0)/dur), d=k*total, i=0, acc=0;
    while(i<segs.length-1&&acc+segs[i]<d){acc+=segs[i];i++;}
    var r=Math.min(1,(d-acc)/(segs[i]||1));
    var p1=pts[Math.min(i,pts.length-2)], p2=pts[Math.min(i+1,pts.length-1)];
    var px=p1[0]+(p2[0]-p1[0])*r, py=p1[1]+(p2[1]-p1[1])*r;
    c.setAttribute('cx',px); c.setAttribute('cy',py);
    glow.setAttribute('cx',px); glow.setAttribute('cy',py);
    if(k<1){ PINGANIM=requestAnimationFrame(step); }
    else{
      var last=c, lastG=glow; setTimeout(function(){ if(last.parentNode)last.remove(); if(lastG.parentNode)lastG.remove(); },160);
      if(cb)setTimeout(cb,90);
    }
  }
  PINGANIM=requestAnimationFrame(step);
  return c;
}
function pingAnimPair(f,ok){
  var p=bfsPath(f.a,f.b);
  pingPulse(p,ok);
}
function pingFailAt(id){
  var n=byId[id]; if(!n)return;
  var t=document.createElementNS('http://www.w3.org/2000/svg','text');
  t.setAttribute('x',n.x+14); t.setAttribute('y',n.y-12);
  t.setAttribute('fill','#ff6b6b'); t.setAttribute('font-size','15'); t.setAttribute('font-weight','700');
  t.setAttribute('class','pingx'); t.textContent='\u2715';
  pingLayer().appendChild(t);
  setTimeout(function(){ if(t.parentNode)t.remove(); },2600);
}
function nearestNb(from,to){
  var A=byId[from],B=byId[to]; if(!A||!B)return null;
  var nb=adj[from]?Array.from(adj[from]):[]; var best=null,bd=1e18;
  nb.forEach(function(id){
    var n=byId[id]; if(!n)return;
    var d=Math.hypot(n.x-B.x,n.y-B.y);
    if(d<bd){bd=d;best=id;}
  });
  return best;
}
function pingAnimAll(){
  if(!PINGRES)pingRun();
  var greens=PINGRES.okPairs.map(function(f){return {f:f,p:bfsPath(f.a,f.b)};})
    .filter(function(x){return x.p&&x.p.length>1;}).slice(0,12);
  var reds=PINGRES.noCable.slice(0,8).map(function(f){
    var nb=nearestNb(f.a,f.b);
    return {f:f,p:nb?[f.a,nb]:null};
  });
  var list=greens.map(function(x){return {p:x.p,ok:true,last:x.p[x.p.length-1]};})
    .concat(reds.map(function(x){return {p:x.p,ok:false,last:x.p?x.p[x.p.length-1]:x.f.a};}));
  if(!list.length)return;
  var i=0;
  (function next(){
    if(i>=list.length)return;
    var it=list[i++];
    pingPulse(it.p,it.ok,function(){ if(!it.ok)pingFailAt(it.last); setTimeout(next,260); },0.72);
  })();
}
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ var g=document.getElementById('gPing'); if(g){g.innerHTML='';} } });

document.getElementById('bPing').onclick=function(){ document.getElementById('pmodal').classList.add('on'); pingRun(); };
document.getElementById('p_run').onclick=pingRun;
document.getElementById('p_heat').onclick=function(){
  var on=!this.classList.contains('on');
  this.classList.toggle('on',on);
  if(on&&!PINGRES)pingRun();
  pingHeat(on);
};
document.getElementById('p_anim').onclick=function(){
  this.classList.add('on');
  var m=document.getElementById('pmodal'); if(m)m.classList.remove('on');
  pingAnimAll();
};
document.getElementById('p_stop').onclick=function(){
  try{ cancelAnimationFrame(PINGANIM); }catch(e){}
  pingClear();
  document.getElementById('p_heat').classList.remove('on');
  document.getElementById('p_anim').classList.remove('on');
};
document.getElementById('p_close').onclick=function(){ document.getElementById('pmodal').classList.remove('on'); };
