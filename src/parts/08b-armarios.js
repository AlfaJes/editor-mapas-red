// ---------- armarios reales (rack con U configurables) ----------
// Modelo: doc.racks = [{id, n, u, items:[{k:'dev'|'pp', id?, n?, u0, u, ports?, links?}]}]
// u0 = U más baja que ocupa el elemento (1..u). Se dibuja de arriba abajo.


var ACCESORIOS=[
  {k:'bandeja',  n:'Bandeja',                u:1, col:'#64748b'},
  {k:'bandeja2', n:'Bandeja 2U',             u:2, col:'#64748b'},
  {k:'escobilla',n:'Escobilla',              u:1, col:'#475569'},
  {k:'organizador',n:'Organizador de cables',u:1, col:'#475569'},
  {k:'regleta',  n:'Regleta (PDU)',          u:1, col:'#94a3b8'},
  {k:'ventilador',n:'Ventilador',            u:2, col:'#38bdf8'},
  {k:'ciego',    n:'Ciego',                  u:1, col:'#334155'}
];
function accById(k){ return ACCESORIOS.filter(function(a){return a.k===k;})[0]||ACCESORIOS[0]; }

function rackUOf(n){
  var fijo=parseInt(n&&n.u);
  if(fijo>0)return Math.max(1,Math.min(8,fijo));
  var t=n&&n.tipo;
  if(t==='servidor'||t==='nas')return 2;
  if(t==='ups')return 3;
  return 1;
}

function armariosInit(){
  if(!Array.isArray(doc.racks)){
    doc.racks=armariosDesdeZonas();
    save();
  }
  doc.racks.forEach(function(r){
    if(!Array.isArray(r.items))r.items=[];
    r.u=Math.max(6,Math.min(48,parseInt(r.u)||42));
    r.items.forEach(function(it){ if(!it.k)it.k='dev'; });
  });
}

function armariosDesdeZonas(){
  var out=[], porZ={};
  nodes.forEach(function(n){ var z=n.zona||'Sin zona'; (porZ[z]=porZ[z]||[]).push(n); });
  var i=0;
  Object.keys(porZ).sort(function(a,b){return a.localeCompare(b,'es');}).forEach(function(z){
    var devs=porZ[z].slice().sort(function(a,b){
      var oa=({patch:0,switch:1,router:2,firewall:3,ups:4,servidor:5,nas:6,nvr:7,wifi:8,pc:9})[a.tipo];
      var ob=({patch:0,switch:1,router:2,firewall:3,ups:4,servidor:5,nas:6,nvr:7,wifi:8,pc:9})[b.tipo];
      return ((oa===undefined?9:oa)-(ob===undefined?9:ob))||a.nombre.localeCompare(b.nombre,'es');
    });
    var r={id:'rk'+(++i), n:z.slice(0,28), u:42, items:[]};
    var libre=42;
    devs.forEach(function(n){
      var h=rackUOf(n);
      if(libre-h<1)return;
      r.items.push({k:'dev',id:n.id,u0:libre-h+1,u:h});
      libre-=h;
    });
    out.push(r);
  });
  return out;
}

function currentRack(){
  if(!Array.isArray(doc.racks)||!doc.racks.length)return null;
  var id=state.rackId;
  var r=doc.racks.filter(function(x){return x.id===id;})[0];
  if(!r){ r=doc.racks[0]; state.rackId=r.id; }
  return r;
}

function rackOcupados(r,skip){
  var m={};
  r.items.forEach(function(it){
    if(it===skip)return;
    var h=Math.max(1,parseInt(it.u)||1);
    for(var k=0;k<h;k++) m[(it.u0||1)+k]=it;
  });
  return m;
}

// y de la fila superior del elemento
function yDeU(u0,h,uTotal,U){
  var fila=uTotal-(u0+h-1);        // 0 = arriba del todo
  return {y:26+fila*U};
}

function renderArmarios(){
  var wrap=document.getElementById('rack');
  if(!wrap)return;
  armariosInit();
  var r=currentRack();
  if(!r){ wrap.innerHTML='<div class="empty" style="padding:20px">Sin armarios</div>'; return; }

  var opts=doc.racks.map(function(x){
    return '<option value="'+x.id+'"'+(x.id===r.id?' selected':'')+'>'+escAttr(x.n)+' ('+x.u+'U)</option>';
  }).join('');
  var libres=nodes.filter(function(n){ return !r.items.some(function(it){return it.k==='dev'&&it.id===n.id;}); });
  var selDev='<select id="armadd" class="rkz"><option value="">+ Equipo…</option>'+
    libres.slice().sort(function(a,b){return a.nombre.localeCompare(b.nombre,'es');})
      .map(function(n){return '<option value="'+n.id+'">'+escAttr(n.nombre)+'</option>';}).join('')+'</select>';

  var head='<div class="rkbar">'+
    '<span class="rkttl">🗄 Armarios</span>'+
    '<div class="rkseg"><button class="btn sm" data-rm="lista">☰ Lista</button><button class="btn sm on" data-rm="armario">🖼 Armario</button></div>'+
    '<select id="rksel" class="rkz">'+opts+'</select>'+
    '<input id="rkname" value="'+escAttr(r.n)+'" title="Nombre del armario" style="width:150px">'+
    '<label class="rklbl">U <input id="rku" type="number" min="6" max="48" value="'+r.u+'" style="width:56px"></label>'+
    selDev+
    '<button class="btn sm" id="rkpp" title="Añadir patch panel de 24 puertos">＋ Patch</button>'+
    '<select id="armacc" class="rkz" title="Añadir accesorio de armario"><option value="">＋ Accesorio…</option>'+
      ACCESORIOS.map(function(a){return '<option value="'+a.k+'">'+a.n+'</option>';}).join('')+'</select>'+
    '<button class="btn sm" id="rknew" title="Crear otro armario">＋ Armario</button>'+
    '<button class="btn sm" id="rkdel" title="Borrar este armario">✕</button>'+
    '<button class="btn sm" id="rkpng2" title="Descargar en PNG">⤓ PNG</button>'+
    '</div>';

  var U=30, uTot=r.u, H=26+uTot*U+18, X0=64, W=490, Wtot=900;
  var s='<div class="cabwrap"><svg class="cabsvg armcab" data-rid="'+r.id+'" viewBox="0 0 '+Wtot+' '+H+'" width="100%" xmlns="http://www.w3.org/2000/svg">';
  s+='<rect x="8" y="8" width="'+(Wtot-16)+'" height="'+(H-16)+'" rx="10" fill="#0d1626" stroke="#243350"/>';
  for(var i=0;i<uTot;i++){
    var yy=26+i*U;
    s+='<text x="30" y="'+(yy+14)+'" class="cabu">U'+(uTot-i)+'</text>';
    s+='<line x1="44" y1="'+(yy+U)+'" x2="'+(Wtot-20)+'" y2="'+(yy+U)+'" stroke="#16233a"/>';
    s+='<rect class="armslot" data-u="'+(uTot-i)+'" x="'+X0+'" y="'+yy+'" width="'+W+'" height="'+U+'" fill="transparent"/>';
  }

  var occ=rackOcupados(r,null);
  r.items.forEach(function(it,idx){
    var h=Math.max(1,parseInt(it.u)||1);
    var pos=yDeU(it.u0||1,h,uTot,U);
    var y=pos.y, hh=h*U-2;
    if(it.k==='acc'){
      var ac=accById(it.acc);
      s+='<g class="armitem acc" data-idx="'+idx+'" data-y="'+y+'">';
      s+='<rect x="'+X0+'" y="'+y+'" width="'+W+'" height="'+hh+'" rx="3" fill="#0f1b2e" stroke="#2a3b57"/>';
      s+='<rect x="'+X0+'" y="'+y+'" width="5" height="'+hh+'" rx="2" fill="'+(ac.col||'#64748b')+'"/>';
      s+='<text x="'+(X0+14)+'" y="'+(y+13)+'" class="cabn">'+escAttr(it.n||ac.n)+'</text>';
      s+='<text x="'+(X0+190)+'" y="'+(y+13)+'" class="cabs">accesorio</text>';
      s+='<text class="armu" data-hu="'+idx+'" x="'+(X0+W-96)+'" y="'+(y+13)+'" title="Altura ('+(it.u||1)+'U). Clic para cambiarla.">'+(it.u||1)+'U</text>';
      s+='<text class="cabxx" data-del="'+idx+'" x="'+(X0+W-8)+'" y="'+(y+13)+'" text-anchor="end">✕</text>';
      s+='</g>';
    } else if(it.k==='pp'){
      var filas=Math.max(1,Math.min(3,it.u||1));
      var per=Math.max(6,Math.min(48,it.ppr||24)), total=per*filas;
      var WPP=W+120;                       // el panel aprovecha el hueco de cables
      s+='<g class="armitem pp" data-idx="'+idx+'" data-pp="1" data-y="'+y+'">';
      // chapa frontal con dos tonos
      s+='<rect x="'+X0+'" y="'+y+'" width="'+WPP+'" height="'+hh+'" rx="3" fill="#1b2a42" stroke="#5a7699" stroke-width="1.2"/>';
      s+='<rect x="'+(X0+3)+'" y="'+(y+2)+'" width="'+(WPP-6)+'" height="'+(hh-4)+'" rx="2" fill="#0e1a2b" opacity=".5"/>';
      // orejas de montaje 19" con tornillos
      s+='<rect x="'+(X0-6)+'" y="'+(y+hh/2-7)+'" width="8" height="14" rx="1.5" fill="#243449" stroke="#5a7699" stroke-width=".8"/>';
      s+='<rect x="'+(X0+WPP-2)+'" y="'+(y+hh/2-7)+'" width="8" height="14" rx="1.5" fill="#243449" stroke="#5a7699" stroke-width=".8"/>';
      s+='<circle cx="'+(X0-2)+'" cy="'+(y+hh/2)+'" r="1.8" fill="#93a9c6"/>';
      s+='<circle cx="'+(X0+WPP+2)+'" cy="'+(y+hh/2)+'" r="1.8" fill="#93a9c6"/>';
      // etiqueta y controles
      s+='<text x="'+(X0+16)+'" y="'+(y+(filas>1?13:hh/2+3.5))+'" class="cabn">'+escAttr(it.n||('Patch '+total+'p'))+'</text>';
      s+='<text class="armu" data-hu="'+idx+'" x="'+(X0+16)+'" y="'+(y+(filas>1?25:hh/2+3.5))+'" title="Altura de este patch ('+filas+'U). Clic para cambiarla.">'+filas+'U</text>';
      s+='<text class="armu" data-ppn="'+idx+'" x="'+(X0+40)+'" y="'+(y+(filas>1?25:hh/2+3.5))+'" title="Puertos por fila. Clic para cambiarlos.">'+per+'P/fila</text>';
      s+='<text class="cabbulk" data-bulk="'+idx+'" x="'+(X0+WPP-74)+'" y="'+(y+13)+'" title="Enlazar los puertos con el mismo número de un switch">⚡</text>';
      s+='<text class="cabxx" data-del="'+idx+'" x="'+(X0+WPP-10)+'" y="'+(y+13)+'" text-anchor="end" title="Quitar">✕</text>';
      // conectores RJ45 en dos bloques, con tira de numeracion como los paneles reales
      var px0=X0+72, pfin=X0+WPP-84, huecoG=10;
      var pw=(pfin-px0-huecoG)/per;
      var rowH=(hh-4)/filas;                 // alto de cada fila
      var stripH=8;                          // tira blanca de numeros
      var sockH=Math.max(7,rowH-stripH-2);
      for(var r2=0;r2<filas;r2++){
        var ry=y+2+r2*rowH;
        // tira de rotulacion
        s+='<rect x="'+px0+'" y="'+(ry+sockH+1).toFixed(1)+'" width="'+(pfin-px0)+'" height="'+stripH+'" rx="1" fill="#c9d4e2" opacity=".92"/>';
        for(var c=0;c<per;c++){
          var p=r2*per+c+1;
          var lk=(it.links&&it.links[p])||null;
          var bx2=px0+c*pw+(c>=Math.ceil(per/2)?huecoG:0);
          var w2=Math.max(4,pw-2.6);
          // cuerpo del keystone
          s+='<rect class="armport'+(lk?' on':'')+'" data-pp="'+idx+'" data-p="'+p+'" x="'+(bx2+1.2).toFixed(1)+'" y="'+ry.toFixed(1)+'" width="'+w2.toFixed(1)+'" height="'+sockH.toFixed(1)+'" rx="1.4"'+
             '><title>Puerto '+p+(lk?(' → '+lk.dev+' P'+lk.port):' (libre)')+'</title></rect>';
          // boca hundida
          s+='<rect x="'+(bx2+2.6).toFixed(1)+'" y="'+(ry+1.8).toFixed(1)+'" width="'+Math.max(2,w2-3).toFixed(1)+'" height="'+Math.max(2,sockH-4.6).toFixed(1)+'" rx="0.7" fill="#04101c" stroke="#2b405c" stroke-width=".6" pointer-events="none"/>';
          // contactos dorados
          if(sockH>10){
            s+='<g pointer-events="none" opacity=".55"><rect x="'+(bx2+3.6).toFixed(1)+'" y="'+(ry+3).toFixed(1)+'" width="'+(w2-6).toFixed(1)+'" height="1" fill="#d9b45a"/><rect x="'+(bx2+3.6).toFixed(1)+'" y="'+(ry+5).toFixed(1)+'" width="'+(w2-6).toFixed(1)+'" height="1" fill="#d9b45a"/></g>';
          }
          // pestaña inferior
          s+='<rect x="'+(bx2+w2/2-1.6).toFixed(1)+'" y="'+(ry+sockH-4).toFixed(1)+'" width="2.4" height="3" rx="0.6" fill="#93a9c6" opacity=".9" pointer-events="none"/>';
          // numero en la tira
          s+='<text x="'+(bx2+pw/2-1.2).toFixed(1)+'" y="'+(ry+sockH+stripH-1.4).toFixed(1)+'" class="cabpn2" text-anchor="middle">'+p+'</text>';
        }
      }
      s+='</g>';
    } else {
      var n=byId[it.id];
      if(!n){ return; }
      var c=col(n);
      s+='<g class="armitem" data-idx="'+idx+'" data-id="'+n.id+'" data-y="'+y+'">';
      s+='<rect x="'+X0+'" y="'+y+'" width="'+W+'" height="'+hh+'" rx="4" fill="#132239" stroke="#2b4368"/>';
      s+='<rect x="'+X0+'" y="'+y+'" width="5" height="'+hh+'" rx="2" fill="'+c+'"/>';
      var nm=String(n.nombre||'');
      var maxc=hh>26?26:22; if(nm.length>maxc)nm=nm.slice(0,maxc-1)+'…';
      var baseY=y+(hh>26?13:Math.min(hh-4,Math.round(hh/2+3.5)));
      // nombre a la izquierda, con hueco reservado
      s+='<text x="'+(X0+12)+'" y="'+baseY+'" class="cabn">'+escAttr(nm)+'<title>'+escAttr(n.nombre)+' · '+escAttr((TYPE[n.tipo]||['',''])[1])+'</title></text>';
      // tira de puertos en su banda
      var cap=Math.min(32,capFor(n.id));
      var px1=X0+178, px2=X0+W-64, step=Math.min(9,(px2-px1)/Math.max(1,cap));
      s+='<rect x="'+(px1-3)+'" y="'+(y+hh-11)+'" width="'+((cap*step)+5).toFixed(1)+'" height="9" rx="2" fill="#0b1524" opacity=".65" pointer-events="none"/>';
      for(var q=1;q<=cap;q++){
        var used=doc.edges.some(function(e){return (e.s===n.id&&e.pA===q)||(e.t===n.id&&e.pB===q);});
        s+='<rect class="devport'+(used?' on':'')+'" data-dp="'+n.id+'" data-p="'+q+'" x="'+(px1+(q-1)*step).toFixed(1)+'" y="'+(y+hh-9.5)+'" width="'+Math.max(2,step-1.6).toFixed(1)+'" height="6" rx="1"'+
           '><title>P'+q+(used?' (ocupado)':' (libre)')+'</title></rect>';
      }
      // altura y quitar, en el margen derecho
      s+='<text class="armu" data-hu="'+idx+'" x="'+(X0+W-56)+'" y="'+baseY+'" title="Altura en U. Clic para cambiarla.">'+h+'U</text>';
      s+='<text class="cabxx" data-del="'+idx+'" x="'+(X0+W-12)+'" y="'+baseY+'" text-anchor="end" title="Quitar">✕</text>';
      s+='</g>';
    }
  });
  s+='</svg></div>';
  wrap.innerHTML=head+s;
  bindArmarios();
}


function colision(r,it){
  var occ=rackOcupados(r,it);
  var top=(it.u0||1)+(it.u||1)-1;
  for(var u=it.u0||1;u<=top;u++){ if(occ[u])return true; }
  return false;
}
function ajustarU(r,v){
  var occ={}, out=[], fuera=[];
  function marca(it){ var h=it.u||1; for(var k=0;k<h;k++) occ[(it.u0||1)+k]=1; }
  r.items.forEach(function(it){
    var h=it.u||1;
    if((it.u0||1)+h-1<=v){ out.push(it); marca(it); } else fuera.push(it);
  });
  var perdidos=0;
  fuera.forEach(function(it){
    var h=it.u||1, u0=0;
    for(var u=v-h+1;u>=1;u--){
      var libre=true;
      for(var k=0;k<h;k++){ if(occ[u+k]){ libre=false; break; } }
      if(libre){ u0=u; break; }
    }
    if(!u0){ perdidos++; return; }
    it.u0=u0; out.push(it); marca(it);
  });
  r.u=v; r.items=out;
  return perdidos;
}

function bindArmarios(){
  var r=currentRack(); if(!r)return;
  Array.prototype.forEach.call(document.querySelectorAll('[data-rm]'),function(b){
    b.onclick=function(){ state.rackMode=b.getAttribute('data-rm'); renderRack(); };
  });
  Array.prototype.forEach.call(document.querySelectorAll('.cabbulk'),function(x){
    x.addEventListener('click',function(ev){ ev.stopPropagation(); enlazarPatchCompleto(+x.getAttribute('data-bulk')); });
  });
  var sel=document.getElementById('rksel');
  if(sel)sel.onchange=function(){ state.rackId=sel.value; renderArmarios(); };
  var nm=document.getElementById('rkname');
  if(nm)nm.onchange=function(){ r.n=nm.value.trim()||'Armario'; save(); renderArmarios(); };
  var ku=document.getElementById('rku');
  if(ku)ku.onchange=function(){
    var v=Math.max(6,Math.min(48,parseInt(ku.value)||42));
    var perdidos=ajustarU(r,v);
    if(perdidos) alert('Se han quedado fuera '+perdidos+' equipos: no caben en '+v+'U.');
    save(); renderArmarios();
  };
  var add=document.getElementById('armadd');
  if(add)add.onchange=function(){
    var id=add.value; if(!id)return;
    var n=byId[id]; if(!n)return;
    var h=rackUOf(n), occ=rackOcupados(r,null), u0=0;
    for(var u=r.u-h+1;u>=1;u--){
      var libre=true;
      for(var k=0;k<h;k++){ if(occ[u+k]){ libre=false; break; } }
      if(libre){ u0=u; break; }
    }
    if(!u0){ alert('No cabe en este armario. Sube el número de U o crea otro armario.'); return; }
    r.items.push({k:'dev',id:id,u0:u0,u:h});
    save(); renderArmarios();
  };
  var pp=document.getElementById('rkpp');
  if(pp)pp.onclick=function(){
    var occ=rackOcupados(r,null), u0=0;
    for(var u=r.u;u>=1;u--){ if(!occ[u]){ u0=u; break; } }
    if(!u0){ alert('No quedan huecos libres.'); return; }
    r.items.push({k:'pp',n:'Patch '+(r.items.filter(function(x){return x.k==='pp';}).length+1)+' (24)',u0:u0,u:1,ports:24,links:{}});
    save(); renderArmarios();
  };
  RACK.querySelectorAll('[data-hu]').forEach(function(el){
    el.onclick=function(ev){
      ev.stopPropagation();
      var i2=+el.getAttribute('data-hu'), it=r.items[i2]; if(!it)return;
      var maxU=it.k==='pp'?6:8;
      var def=it.u||1;
      var v=prompt('Altura en U (1-'+maxU+'):', def);
      if(v===null)return;
      var nu=parseInt(v,10); if(!nu||nu<1)nu=1; if(nu>maxU)nu=maxU;
      var viejo=it.u||1; it.u=nu;
      var fuera=colision(r,it);
      if(fuera){ it.u=viejo; alert('No cabe: hay algo justo encima. Mueve ese elemento primero.'); return; }
      if(it.k==='dev' && byId[it.id]) byId[it.id].u=nu;
      save(); renderArmarios();
    };
  });
  RACK.querySelectorAll('[data-ppn]').forEach(function(el){
    el.onclick=function(ev){
      ev.stopPropagation();
      var i2=+el.getAttribute('data-ppn'), it=r.items[i2]; if(!it)return;
      var v=prompt('Puertos por fila del patch panel (6-48):', it.ppr||24);
      if(v===null)return;
      var n2=parseInt(v,10); if(!n2||n2<6)n2=6; if(n2>48)n2=48;
      it.ppr=n2; save(); renderArmarios();
    };
  });
  var acSel=document.getElementById('armacc');
  if(acSel)acSel.onchange=function(){
    var k=acSel.value; if(!k)return;
    var ac=accById(k), h=ac.u||1;
    var occ=rackOcupados(r,null), u0=0;
    for(var u=r.u-h+1;u>=1;u--){
      var libre=true;
      for(var j=0;j<h;j++){ if(occ[u+j]){ libre=false; break; } }
      if(libre){ u0=u; break; }
    }
    if(!u0){ alert('No hay hueco libre para '+ac.n+'.'); return; }
    r.items.push({k:'acc',acc:k,n:ac.n,u:h,u0:u0});
    save(); renderArmarios();
  };
  var nw=document.getElementById('rknew');
  if(nw)nw.onclick=function(){
    var id='rk'+Date.now().toString(36);
    doc.racks.push({id:id,n:'Armario '+(doc.racks.length+1),u:42,items:[]});
    state.rackId=id; save(); renderArmarios();
  };
  var del=document.getElementById('rkdel');
  if(del)del.onclick=function(){
    if(doc.racks.length<2){ alert('Debe quedar al menos un armario.'); return; }
    if(!confirm('¿Borrar el armario «'+r.n+'»? Los equipos siguen en el mapa.'))return;
    doc.racks=doc.racks.filter(function(x){return x.id!==r.id;});
    state.rackId=doc.racks[0].id; save(); renderArmarios();
  };
  var png=document.getElementById('rkpng2');
  if(png)png.onclick=function(){ exportRackPNG(); };

  // quitar elemento
  Array.prototype.forEach.call(document.querySelectorAll('.armitem [data-del]'),function(x){
    x.addEventListener('click',function(ev){
      ev.stopPropagation();
      var i=+x.getAttribute('data-del');
      r.items.splice(i,1); save(); renderArmarios();
    });
  });

  // arrastrar elementos en vertical
  Array.prototype.forEach.call(document.querySelectorAll('.armitem'),function(g){
    g.addEventListener('mousedown',function(ev){
      if(ev.target.closest('[data-del]'))return;
      if(ev.target.closest('.armport'))return;
      if(ev.target.closest('.devport'))return;
      if(ev.target.hasAttribute('data-hu'))return;
      if(ev.target.hasAttribute('data-bulk'))return;
      ev.preventDefault();
      var idx=+g.getAttribute('data-idx');
      var it=r.items[idx]; if(!it)return;
      var y0=ev.clientY, u0=it.u0, movido=false;
      function mm(e2){
        var dy=e2.clientY-y0;
        if(Math.abs(dy)>3){ movido=true; g.setAttribute('transform','translate(0,'+dy+')'); g.style.opacity=.8; }
      }
      function mu(e2){
        window.removeEventListener('mousemove',mm); window.removeEventListener('mouseup',mu);
        g.removeAttribute('transform'); g.style.opacity='';
        if(!movido){ state.rackSelItem=idx; renderArmarios(); return; }
        var svgEl=g.ownerSVGElement||document.querySelector('.cabsvg');
        var esc=1;
        try{ esc=svgEl.getBoundingClientRect().width/(svgEl.viewBox.baseVal.width||830); }catch(e){}
        var Upx=Math.max(8,30*(esc||1));
        var pasos=Math.round((e2.clientY-y0)/Upx);
        var nuevo=Math.max(1,Math.min(r.u-(it.u||1)+1, u0-pasos));
        if(nuevo===u0)return;
        var prueba={k:it.k,id:it.id,u0:nuevo,u:it.u};
        var occ=rackOcupados(r,it); var choque=false;
        for(var k=0;k<(it.u||1);k++){ if(occ[nuevo+k]){ choque=true; break; } }
        if(choque){ alert('Ese hueco está ocupado.'); return; }
        it.u0=nuevo; save(); renderArmarios();
      }
      window.addEventListener('mousemove',mm); window.addEventListener('mouseup',mu);
    });
  });

  // los clics en puertos se gestionan en 08c-conexiones.js (ventana de enlace)
}

// rellena de una vez los 24 puertos de un patch panel con el mismo número de puerto del switch
function enlazarPatchCompleto(itIdx){
  var r=currentRack(); if(!r)return;
  var it=r.items[itIdx]; if(!it||it.k!=='pp')return;
  var sws=nodes.filter(function(n){return n.tipo==='switch';});
  if(!sws.length){ alert('No hay switches.'); return; }
  var nombres=sws.map(function(s,i){return (i+1)+') '+s.nombre+' ('+(s.puertos||'?')+' puertos)';}).join('\n');
  var resp=prompt('Enlazar todos los puertos con el switch nº:\n\n'+nombres,'1');
  if(resp===null)return;
  var sw=sws[parseInt(resp)-1]||sws[0];
  it.links=it.links||{};
  var cap=parseInt(sw.puertos)||24;
  for(var p=1;p<=Math.min((it.ppr||24)*Math.max(1,it.u||1),cap);p++) it.links[p]={dev:sw.nombre,port:p,nid:sw.id};
  save(); renderArmarios();
}
