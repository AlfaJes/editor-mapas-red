// ---------- ruta, revisión, export ----------
function inPath(s,t){
  if(!state.path)return false;
  for(var i=0;i<state.path.length-1;i++){
    var a=state.path[i],b=state.path[i+1];
    if((a===s&&b===t)||(a===t&&b===s))return true;
  }
  return false;
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
