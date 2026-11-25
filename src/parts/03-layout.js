// ---------- layout ----------
const ZBOX=[];
function descZonas(z,acc){
  acc=acc||[];
  Object.keys(doc.zparent||{}).forEach(k=>{
    if(doc.zparent[k]===z&&acc.indexOf(k)<0&&k!==z){acc.push(k);descZonas(k,acc);}
  });
  return acc;
}
function allZonas(){const s=[];nodes.forEach(n=>{if(s.indexOf(n.zona)<0)s.push(n.zona);});
  (doc.zonasExtra||[]).forEach(z=>{if(s.indexOf(z)<0)s.push(z);});
  return s.sort((a,b)=>a.localeCompare(b,'es'));}
function zonasConEquipos(z){ return nodes.filter(function(n){return n.zona===z;}); }
function zonasHijas(z){ return Object.keys(doc.zparent||{}).filter(function(k){return doc.zparent[k]===z;}); }
function renombrarZona(oldN,newN){
  var z=String(newN==null?'':newN).trim();
  if(!z||z===oldN)return false;
  if(allZonas().indexOf(z)>=0){alert('Ya existe una sección llamada "'+z+'".');return false;}
  nodes.forEach(function(n){ if(n.zona===oldN)n.zona=z; });
  if(doc.nodes)doc.nodes.forEach(function(n){ if(n.zona===oldN)n.zona=z; });
  if(doc.zonasExtra)doc.zonasExtra=doc.zonasExtra.map(function(x){return x===oldN?z:x;});
  if(doc.zparent){
    var np={};
    Object.keys(doc.zparent).forEach(function(k){
      var vv=doc.zparent[k];
      np[k===oldN?z:k]=(vv===oldN?z:vv);
    });
    doc.zparent=np;
  }
  ZBOX.forEach(function(b){ if(b.z===oldN)b.z=z; });
  if(doc.zpos)doc.zpos.forEach(function(b){ if(b.z===oldN)b.z=z; });
  save(); rebuild(); render(); renderZmodal();
  if(typeof renderRack==='function')try{renderRack();}catch(e){}
  return true;
}
function moverEquiposDe(z){
  var otros=allZonas().filter(function(x){return x!==z;});
  if(!otros.length){ alert('No hay otra zona a la que mover los equipos. Crea una primero.'); return; }
  var fila=[].slice.call(document.querySelectorAll('#zmodal .zrow')).filter(function(row){
    var s=row.querySelector('.zn'); return s&&s.dataset.ren===z; })[0];
  if(!fila)return;
  var sel=document.createElement('select');
  sel.className='mvsel';
  sel.innerHTML='<option value="">Mover los equipos a...</option>'+otros.map(function(x){
    return '<option value="'+escAttr(x)+'">'+escAttr(x)+'</option>';}).join('');
  sel.onchange=function(){
    var t=sel.value; if(!t)return;
    snap();
    doc.nodes.forEach(function(n){ if(n.zona===z)n.zona=t; });
    nodes.forEach(function(n){ if(n.zona===z)n.zona=t; });
    save(); rebuild(); layout(); render(); renderList(); renderZmodal();
  };
  var c=fila.querySelector('.zc'); if(c)c.replaceWith(sel); else fila.appendChild(sel);
}
function borrarZona(z){
  var dentro=zonasConEquipos(z);
  if(dentro.length){
    var lista=dentro.slice(0,6).map(function(n){return '\u00b7 '+n.nombre;}).join('\n');
    alert('No se puede eliminar la zona "'+z+'".\n\nTiene '+dentro.length+
      ' equipo(s) vinculado(s):\n'+lista+(dentro.length>6?'\n\u2026 y '+(dentro.length-6)+' m\u00e1s':'')+
      '\n\nPulsa el bot\u00f3n ⇄ de esta fila para moverlos a otra zona y despu\u00e9s b\u00f3rrrala.');
    return false;
  }
  var hijos=zonasHijas(z);
  if(hijos.length){
    if(!confirm('Las subzonas '+hijos.join(', ')+' quedar\u00e1n sin zona padre. \u00bfEliminar la zona igualmente?'))return false;
    Object.keys(doc.zparent).forEach(function(k){ if(doc.zparent[k]===z)delete doc.zparent[k]; });
  }

  if(!confirm('\u00bfEliminar la zona "'+z+'"?'))return false;
  snap();
  doc.zonasExtra=(doc.zonasExtra||[]).filter(function(x){return x!==z;});
  delete doc.zparent[z];
  for(var i=ZBOX.length-1;i>=0;i--){ if(ZBOX[i].z===z)ZBOX.splice(i,1); }
  doc.zpos=JSON.parse(JSON.stringify(ZBOX));
  save(); rebuild(); rebuildUI(); render(); renderList(); renderZmodal();
  return true;
}
function renderZmodal(){
  const box=document.getElementById('zlist'); if(!box)return;
  const zs=allZonas();
  box.innerHTML=zs.map(z=>{
    const bad=[z].concat(descZonas(z));
    const opts=['<option value="">— sin padre —</option>'].concat(
      zs.filter(o=>bad.indexOf(o)<0).map(o=>`<option value="${escAttr(o)}"${(doc.zparent[z]===o)?' selected':''}>${escAttr(o)}</option>`)
    ).join('');
    const kids=Object.keys(doc.zparent).filter(k=>doc.zparent[k]===z).length;
    const cnt=nodes.filter(n=>n.zona===z).length;
    const vacia=cnt===0;
    return `<div class="zrow"><span class="zn" data-ren="${escAttr(z)}" title="Clic para cambiar el nombre">${escAttr(z)}<i class="pen">✎</i></span>
      <span class="zc">${cnt} equipos${kids?' · '+kids+' sub':''}</span>
      <select data-z="${escAttr(z)}">${opts}</select>
      <span class="zact">${((doc.zlock||[]).indexOf(z)>=0
        ? '<button class="x" data-lock="'+escAttr(z)+'" title="Sección fija: no se puede mover. Pulsa para desbloquear" style="color:#4f8cff">\ud83d\udd12</button>'
        : '<button class="x" data-lock="'+escAttr(z)+'" title="Fijar esta sección para que no se mueva">\ud83d\udd13</button>')}${vacia?'':'<button class="x" data-mv="${escAttr(z)}" title="Mover estos equipos a otra zona">⇄</button>'}
      <button class="x" data-del="${escAttr(z)}" title="${vacia?'Eliminar zona':'Tiene '+cnt+' equipos: no se puede eliminar'}"
        style="${vacia?'':'opacity:.45;cursor:not-allowed'}">✕</button></span></div>`;
  }).join('');
  box.querySelectorAll('button[data-lock]').forEach(function(b){
    b.onclick=function(){ var z=b.dataset.lock;
      doc.zlock=doc.zlock||[];
      var i=doc.zlock.indexOf(z);
      if(i>=0)doc.zlock.splice(i,1); else doc.zlock.push(z);
      save(); renderZmodal(); render();
    };
  });
  box.querySelectorAll('button[data-del]').forEach(function(b){
    b.onclick=function(){ borrarZona(b.dataset.del); };
  });
  box.querySelectorAll('button[data-mv]').forEach(function(b){
    b.onclick=function(ev){ ev.stopPropagation(); moverEquiposDe(b.dataset.mv); };
  });
  box.querySelectorAll('.zn[data-ren]').forEach(function(sp){
    sp.onclick=function(ev){
      ev.stopPropagation();
      if(sp.dataset.ed)return;
      var zz=sp.dataset.ren;
      sp.dataset.ed='1';
      var inp=document.createElement('input');
      inp.className='znedit'; inp.value=zz;
      sp.textContent=''; sp.appendChild(inp);
      inp.focus(); inp.select();
      var fin=function(ok){
        if(!sp.dataset.ed)return;
        delete sp.dataset.ed;
        var nv=String(inp.value||'').trim();
        if(ok&&nv&&nv!==zz){ if(!renombrarZona(zz,nv))renderZmodal(); }
        else renderZmodal();
      };
      inp.onkeydown=function(e){
        if(e.key==='Enter'){e.preventDefault();fin(true);}
        else if(e.key==='Escape'){e.preventDefault();fin(false);}
      };
      inp.onblur=function(){fin(true);};
    };
  });
  box.querySelectorAll('select[data-z]').forEach(sel=>{
    sel.onchange=()=>{
      const z=sel.dataset.z, v=sel.value;
      snap();
      if(v)doc.zparent[z]=v; else delete doc.zparent[z];
      save(); render(); renderZmodal();
    };
  });
}
function applyTitle(){
  const t=document.getElementById('ttl'), s=document.getElementById('sub');
  if(t)t.textContent=doc.title; if(s)s.textContent=doc.sub;
  document.title=doc.title;
}
function layout(){
  ZBOX.length=0;
  const ORD=['Rack Oficinas PB','OFICINAS PB','OFICINAS P1','Oficina Ángel PB',
             'NAVE 1','Sección Corte','NAVE 3','Línea DA FOREL','NAVE 2'];
  const zs=ORD.filter(z=>zonas.includes(z)).concat(zonas.filter(z=>!ORD.includes(z)));
  const w={switch:0,router:0,firewall:0,server:1,nas:1,nvr:2,wifi:2,pc:3,otro:4};
  const SX=124,SY=100,boxes=[];
  zs.forEach(z=>{
    const m=nodes.filter(n=>n.zona===z); if(!m.length)return;
    m.sort((a,b)=>((w[a.tipo]??9)-(w[b.tipo]??9))||a.nombre.localeCompare(b.nombre,'es'));
    const cols=Math.max(1,Math.ceil(Math.sqrt(m.length*1.15)));
    const rows=Math.ceil(m.length/cols);
    boxes.push({z,m,cols,rows,bw:cols*SX+26,bh:rows*SY+54});
  });
  (doc.zonasExtra||[]).forEach(z=>{
    if(boxes.some(b=>b.z===z))return;
    boxes.push({z,m:[],cols:0,rows:0,bw:340,bh:150});
  });
  const MAXW=1330, GAP=26; const rows=[]; let row=[],wsum=0;
  boxes.forEach(b=>{ if(wsum>0&&wsum+GAP+b.bw>MAXW){rows.push(row);row=[];wsum=0;}
    row.push(b); wsum+=b.bw+GAP; });
  if(row.length)rows.push(row);
  let y=0;
  rows.forEach(r=>{ const maxh=Math.max(...r.map(b=>b.bh));
    const total=r.reduce((s,b)=>s+b.bw,0)+GAP*(r.length-1);
    let x=Math.max(0,(MAXW-total)/2);
    r.forEach(b=>{ b.x=x; b.y=y+(maxh-b.bh)/2; x+=b.bw+GAP; });
    y+=maxh+GAP; });
  boxes.forEach(b=>{
    b.m.forEach((n,k)=>{
      const c=k%b.cols,r=Math.floor(k/b.cols);
      n.x=b.x+b.bw/2+(c-(b.cols-1)/2)*SX;
      n.y=b.y+42+r*SY;
      n.nx=n.x; n.ny=n.y;
    });
    ZBOX.push({z:b.z,x:b.x,y:b.y,w:b.bw,h:b.bh});
  });
  if(doc){doc.zpos=JSON.parse(JSON.stringify(ZBOX));nodes.forEach(function(n){n.nx=n.x;n.ny=n.y;});}
}

function restoreLayout(){
  if(!(doc.zpos&&doc.zpos.length))return false;
  ZBOX.length=0; doc.zpos.forEach(b=>ZBOX.push({z:b.z,x:b.x,y:b.y,w:b.w,h:b.h}));
  nodes.forEach(n=>{ if(typeof n.nx!=='number'||typeof n.ny!=='number'){
    const b=ZBOX.find(x=>x.z===n.zona); if(b){n.nx=b.x+b.w/2; n.ny=b.y+b.h/2;} } });
  return true;
}
