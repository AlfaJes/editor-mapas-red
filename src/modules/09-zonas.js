import { S } from './00-store.js';
import { rebuild, save, snap } from './02-modelo.js';
import { ZBOX, allZonas, renderZmodal } from './03-layout.js';
import { render, renderList } from './04b-render-mapa.js';
import { rebuildUI } from './07-ui.js';
// ---------- zonas: crear / borrar ----------
export function crearZona(nombre){
  nombre=(nombre||'').trim();
  if(!nombre)return;
  if(allZonas().indexOf(nombre)>=0){alert('Ya existe una zona con ese nombre.');return;}
  snap();
  S.doc.zonasExtra=(S.doc.zonasExtra||[]).concat([nombre]);
  rebuild();
  var maxY=ZBOX.length?Math.max.apply(null,ZBOX.map(function(b){return b.y+b.h;})):0;
  ZBOX.push({z:nombre,x:0,y:maxY+26,w:340,h:150});
  S.doc.zpos=JSON.parse(JSON.stringify(ZBOX));
  save(); rebuildUI(); render(); renderList(); renderZmodal();
  const inp=document.getElementById('znueva'); if(inp)inp.value='';
}
document.getElementById('zadd').onclick=function(){
  crearZona(document.getElementById('znueva').value);
};
document.getElementById('znueva').onkeydown=function(e){
  if(e.key==='Enter'){e.preventDefault();crearZona(e.target.value);}
};
