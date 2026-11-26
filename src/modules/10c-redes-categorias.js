import { S } from './00-store.js';
import { DEFAULT_REDES, rebuild, save } from './02-modelo.js';
import { cabCats, col, fit } from './04a-geometria.js';
import { render, renderList } from './04b-render-mapa.js';
import { escAttr, showDetail } from './04c-ficha-formularios.js';
import { rebuildUI, setBtn } from './07-ui.js';
import { renderCmodal } from './10a-ruta-revision.js';
import { exportPNG } from './10b-export-imagen.js';
export function renderCats(){
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
      S.doc.edges.forEach(function(e){ if(e.cat===cat.n)delete e.cat; });
      S.doc.cabcats.splice(i,1); save(); render(); renderRedes();
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
export function renderRedes(){
  var box=document.getElementById('rnlist'); if(!box)return;
  var rs=S.doc.redes||DEFAULT_REDES();
  box.innerHTML=rs.map(function(r,i){
    return '<div class="zrow" style="grid-template-columns:1fr 130px 46px 34px">'+
      '<input class="rn-n" data-i="'+i+'" value="'+escAttr(r.n)+'" style="background:#0c1626;border:1px solid #26374f;border-radius:6px;color:#dbe9ff;font-size:12px;padding:5px 7px">'+
      '<input class="rn-p" data-i="'+i+'" value="'+escAttr(r.pre||'')+'" placeholder="192.168.50." style="background:#0c1626;border:1px solid #26374f;border-radius:6px;color:#dbe9ff;font-size:12px;padding:5px 7px">'+
      '<input type="color" class="rn-c" data-i="'+i+'" value="'+escAttr(r.col||'#94a3b8')+'" style="width:42px;height:28px;padding:0;border:none;background:none">'+
      '<button class="x" data-rdel="'+i+'" title="Quitar esta red">✕</button></div>';
  }).join('')||'<div class="empty">Sin redes</div>';
  box.querySelectorAll('.rn-n,.rn-p,.rn-c').forEach(function(el){
    el.onchange=function(){
      var i=+el.dataset.i; var rs2=S.doc.redes||DEFAULT_REDES();
      if(!rs2[i])return;
      if(el.classList.contains('rn-n'))rs2[i].n=el.value.trim()||rs2[i].n;
      if(el.classList.contains('rn-p'))rs2[i].pre=el.value.trim();
      if(el.classList.contains('rn-c'))rs2[i].col=el.value;
      S.doc.redes=rs2; save(); rebuild(); rebuildUI(); render(); renderList(); showDetail(); renderRedes();
    };
  });
  box.querySelectorAll('[data-rdel]').forEach(function(b){
    b.onclick=function(){
      var i=+b.dataset.rdel; var rs2=S.doc.redes||DEFAULT_REDES();
      var usados=S.nodes.filter(function(n){return (n.nets||[]).indexOf(rs2[i].n)>=0;}).length;
      if(usados && !confirm('Hay '+usados+' equipos en «'+rs2[i].n+'». Si la quitas pasarán a la red sin prefijo. ¿Continuar?'))return;
      rs2.splice(i,1); S.doc.redes=rs2; save(); rebuild(); rebuildUI(); render(); renderList(); renderRedes();
    };
  });
}
export function openRedes(){ var m=document.getElementById('moreMenu'); if(m)m.classList.remove('on');
  renderRedes(); renderCats(); document.getElementById('rnm').classList.add('on'); }
(function(){ var b=document.getElementById('bNets'); if(b)b.onclick=openRedes; })();
(function(){ var b=document.getElementById('bNets2'); if(b)b.onclick=openRedes; })();
document.getElementById('rnclose').onclick=function(){ document.getElementById('rnm').classList.remove('on'); };
document.getElementById('rnadd').onclick=function(){
  var n=document.getElementById('rnname').value.trim(), p=document.getElementById('rnpre').value.trim(), c=document.getElementById('rncol').value;
  if(!n){ document.getElementById('rnname').focus(); return; }
  S.doc.redes=S.doc.redes||DEFAULT_REDES();
  if(S.doc.redes.some(function(r){return r.n===n;})){ alert('Ya existe una red con ese nombre'); return; }
  if(p && S.doc.redes.some(function(r){return r.pre===p;})){ if(!confirm('Ya hay una red con el prefijo '+p+'. Las IPs se asignar\u00e1n a la primera que coincida. \u00bfContinuar?'))return; }
  S.doc.redes.push({n:n,pre:p,col:c});
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
  var nm=document.getElementById('presname'); if(nm)nm.textContent=S.doc.title||'Mapa de red';
  setTimeout(function(){ fit(); },80);
};
document.getElementById('presbar').onclick=function(){
  document.body.classList.remove('present');
  setBtn('bPres',false);
  setTimeout(function(){ fit(); },80);
};
document.getElementById('bPng').onclick=exportPNG;
