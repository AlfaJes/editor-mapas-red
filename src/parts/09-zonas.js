// ---------- zonas: crear / borrar ----------
function crearZona(nombre){
  nombre=(nombre||'').trim();
  if(!nombre)return;
  if(allZonas().indexOf(nombre)>=0){alert('Ya existe una zona con ese nombre.');return;}
  snap();
  doc.zonasExtra=(doc.zonasExtra||[]).concat([nombre]);
  rebuild();
  var maxY=ZBOX.length?Math.max.apply(null,ZBOX.map(function(b){return b.y+b.h;})):0;
  ZBOX.push({z:nombre,x:0,y:maxY+26,w:340,h:150});
  doc.zpos=JSON.parse(JSON.stringify(ZBOX));
  save(); rebuildUI(); render(); renderList(); renderZmodal();
  const inp=document.getElementById('znueva'); if(inp)inp.value='';
}
document.getElementById('zadd').onclick=function(){
  crearZona(document.getElementById('znueva').value);
};
document.getElementById('znueva').onkeydown=function(e){
  if(e.key==='Enter'){e.preventDefault();crearZona(e.target.value);}
};
