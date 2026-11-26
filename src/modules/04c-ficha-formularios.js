import { S } from './00-store.js';
import { TYPE, state } from './01-base.js';
import { netColOf, portSel, rebuild, save, snap, syncRackPort } from './02-modelo.js';
import { allZonas } from './03-layout.js';
import { C, ICONS, cabCats, col, netName, pruneEdgePoints } from './04a-geometria.js';
import { mineOn, pathHint, portGrid, render, renderList, select, v } from './04b-render-mapa.js';
import { addLink, delLink, delNode, saveEdit } from './05-mutaciones.js';
import { setBtn } from './07-ui.js';
import { openEdgeNote } from './10d-guardado-notas.js';
import { lnkOpenDev } from './08c-conexiones.js';
import { t } from './dom.js';
export function readHTML(n){
  const nb=[...S.adj[n.id]].map(x=>{
    const ed=S.doc.edges.find(e=>(e.s===n.id&&e.t===x)||(e.t===n.id&&e.s===x));
    const p=ed?(ed.s===n.id?ed.pA:ed.pB):0;
    return {id:x,nombre:(S.byId[x]||{}).nombre||'',tipo:(S.byId[x]||{}).tipo,port:p};
  }).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  return `<div class="dtitle">${n.nombre}${S.DUPS.has(n.id)?'<span class="badge">IP duplicada</span>':''}</div>
   <div class="dtype" style="color:${col(n)}">${(TYPE[n.tipo]||['','Equipo'])[1]} · ${n.zona}</div>
   <dl class="kv">
     <dt>IP</dt><dd class="mono">${n.ip.length?n.ip.map(ip=>{
       const nn=netName(ip);
       const cc=(S.DUPI[n.id]||[]).filter(x=>x.ip===ip).map(x=>x.other);
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
     ${nb.length?nb.map(x=>`<div class="hitem" data-id="${x.id}" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
       <span>${x.nombre}</span>
       <span style="display:flex;align-items:center;gap:6px">
         <span style="color:#7d93b3">${x.port?'P'+x.port:''}</span>
         <button class="btn sm" data-chg="${x.port}" title="Cambiar la conexión de este puerto">⇄</button>
       </span></div>`).join('')
       :'<div class="empty" style="padding:6px 0">Sin enlaces definidos</div>'}
   </div>
   <button class="btn" id="e_start" style="margin-top:10px;width:100%">✎ Editar este equipo</button>`;
}

export const PERIFS=['Monitor','2º monitor','Teclado','Ratón','Impresora','Escáner','Lector de códigos',
  'Etiquetadora','Webcam','Auriculares','Altavoces','SAI','Plotter'];
export const TYPEF={
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
 patch:[
  {k:'puertos',l:'Nº de puertos',ph:'24'},
  {k:'tipo_patch',l:'Tipo de panel',type:'select',opts:['','24 puertos 1U','48 puertos 2U','Fibra / otro']},
  {k:'ubic_rack',l:'Armario y U',ph:'Rack Oficinas · U12'}
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
export function escAttr(v){return String(v==null?'':v).replace(/"/g,'&quot;');}
export function perfList(v){
  const arr=Array.isArray(v)?v:(v?String(v).split(',').map(s=>s.trim()).filter(Boolean):[]);
  return arr.map(x=>typeof x==='string'?{t:x,marca:'',modelo:'',serie:''}:x);
}
export function perifRowHTML(p,opts){
  const t=(p&&p.t)||opts[0];
  return `<div class="pdet"><select data-f="t">${opts.map(o=>`<option${o===t?' selected':''}>${o}</option>`).join('')}</select>
    <input data-f="marca" placeholder="Marca" value="${escAttr(p&&p.marca)}">
    <input data-f="modelo" placeholder="Modelo" value="${escAttr(p&&p.modelo)}">
    <input data-f="serie" placeholder="Nº serie" value="${escAttr(p&&p.serie)}">
    <button type="button" class="x" data-pdel="1">✕</button></div>`;
}
export function bindLists(pre,tipo){
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
export function prowHTML(p){
  return `<div class="prow" data-p="${escAttr(p.t)}"><span class="pnom">${escAttr(p.t)}</span>
    <input data-f="marca" placeholder="Marca" value="${escAttr(p.marca)}">
    <input data-f="modelo" placeholder="Modelo" value="${escAttr(p.modelo)}">
    <input data-f="serie" placeholder="Nº serie" value="${escAttr(p.serie)}"></div>`;
}
export function fldVal(v){ if(Array.isArray(v))return v; return v==null?'':String(v); }
export function fieldsHTML(pre,tipo,n){
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
  const portsv=(n&&n.id&&S.doc.edges.some(function(e){return e.s===n.id||e.t===n.id;}))?portGrid(n):'';
  const ports=portsHTML(pre,n);
  return head+body+portsv+ports;
}
export function bindChips(root){
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
export function readFields(pre,tipo){
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

export const PTIPOS=['Cobre RJ45','Cobre RJ45 PoE','Fibra SFP','Fibra SFP+','Fibra SFP28','Fibra QSFP+','Fibra QSFP28','Consola'];
export const PVELS=['10 Mbps','100 Mbps','1 Gbps','2,5 Gbps','5 Gbps','10 Gbps','25 Gbps','40 Gbps','100 Gbps'];
S.PHOST='';
export function portConn(hostId,num){
  const it=mineOn(hostId).filter(function(x){return x.port===num;})[0];
  if(!it)return null;
  const o=S.byId[it.other];
  return o?{id:o.id,nombre:o.nombre}:null;
}
export function portRowHTML(p){
  const tp=PTIPOS.indexOf(p.tipo)>=0?p.tipo:PTIPOS[0], vl=PVELS.indexOf(p.vel)>=0?p.vel:'1 Gbps';
  const c=S.PHOST?portConn(S.PHOST,p.n):null;
  return `<div class="pyrow"><span class="pn">${p.n}</span>
    <span class="pconn${c?' on':''}" title="${c?escAttr(c.nombre):'sin conexión'}">${c?escAttr(c.nombre):'\u2014'}</span>
    <select data-f="tipo">${PTIPOS.map(t=>`<option${tp===t?' selected':''}>${t}</option>`).join('')}</select>
    <select data-f="vel">${PVELS.map(t=>`<option${vl===t?' selected':''}>${t}</option>`).join('')}</select>
    <input data-f="nota" placeholder="nota / transceptor" value="${escAttr(p.nota)}">
    <button type="button" class="pnx" data-del="${p.n}" title="Quitar este puerto">\u2715</button></div>`;
}
export function portsHTML(pre,n){
  S.PHOST=(n&&n.id)||'';
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
export function bindPorts(pre){
  const box=document.getElementById(pre+'_ports');
  if(!box)return;
  box.addEventListener('click',function(ev){
    var b=ev.target.closest?ev.target.closest('.pnx'):null;
    if(!b)return;
    ev.preventDefault(); ev.stopPropagation();
    var pn=parseInt(b.dataset.del)||0;
    if(typeof S.PHOST==='string'&&S.PHOST){
      var ed=S.doc.edges.filter(function(x){return x.h===S.PHOST&&x.port===pn;})[0];
      if(ed){
        var oo=S.byId[ed.s===S.PHOST?ed.t:ed.s];
        if(!confirm('El puerto '+pn+' tiene conectado '+(oo?oo.nombre:'un equipo')+'. \u00bfQuitar tambi\u00e9n ese enlace?'))return;
        S.doc.edges=S.doc.edges.filter(function(x){return !(x.h===S.PHOST&&x.port===pn);});
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
export function readPorts(pre){
  const box=document.getElementById(pre+'_ports');
  if(!box)return null;
  const arr=[].slice.call(box.querySelectorAll('.pyrow')).map(r=>{
    const g=x=>{const e=r.querySelector('[data-f="'+x+'"]');return e?e.value.trim():'';};
    return {n:parseInt(r.querySelector('.pn').textContent)||0,tipo:g('tipo'),vel:g('vel'),nota:g('nota')};
  });
  return arr.length?arr:null;
}
export function portsSummary(n){
  const a=n&&n.ports;
  if(!Array.isArray(a)||!a.length)return '';
  const m={};
  a.forEach(p=>{const k=(p.tipo||'?')+(p.vel?' · '+p.vel:'')+(p.nota?' ('+p.nota+')':'');m[k]=(m[k]||0)+1;});
  return `<dt>Puertos</dt><dd>${a.length} — ${Object.keys(m).map(k=>m[k]+'× '+k).join(', ')}</dd>`;
}
export function extraHTML(n){
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
export function renderMExtra(){
  const t=document.getElementById('m_tipo').value||'pc';
  const w=document.getElementById('m_extra');
  if(!w)return;
  w.innerHTML=fieldsHTML('m',t,null);
  bindChips(w);
  bindLists('m',t);
  bindPorts('m');
}

export function nicsHTML(list){
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
export function nicsRead(boxId){
  var box=document.getElementById(boxId); if(!box)return [];
  return [].map.call(box.querySelectorAll('.nicrow'),function(r){
    function v(c){var e=r.querySelector(c);return e?String(e.value||'').trim():'';}
    var o={n:v('.nc-n'),k:v('.nc-k'),m:v('.nc-m'),vlan:v('.nc-v'),ip:v('.nc-ip'),mac:v('.nc-mac'),host:v('.nc-h')};
    return (o.n||o.ip||o.mac||o.host)?o:null;
  }).filter(Boolean);
}
export function nicsFill(boxId,list){
  var box=document.getElementById(boxId); if(!box)return;
  box.innerHTML=nicsHTML(list&&list.length?list:[{k:'virtual',m:'bridge'}]);
}
export function formHTML(n){
  const links=S.edges.filter(e=>e.s===n.id||e.t===n.id).map(e=>{
    const o=S.byId[e.s===n.id?e.t:e.s]; return {o,s:e.s,t:e.t};});
  const opts=Object.entries(TYPE).map(([k,[c,l]])=>`<option value="${k}"${n.tipo===k?' selected':''}>${l}</option>`).join('');
  return `<div class="dtitle">Editar equipo</div>
  <div class="dtype" style="color:${col(n)}">${S.DUPS.has(n.id)?'<span class="badge">IP duplicada</span>':''}</div>
  <div class="form">
    <div class="fld"><label>Nombre</label><input id="e_nombre" value="${(n.nombre||'').replace(/"/g,'&quot;')}"></div>
    <div class="row2">
      <div class="fld"><label>Tipo</label><select id="e_tipo">${opts}</select></div>
      <div class="fld"><label>Icono</label><select id="e_ico"><option value="">(el del tipo)</option>${Object.keys(ICONS).map(k=>`<option value="${k}"${n.ico===k?" selected":""}>${k}</option>`).join("")}</select></div>
      <div class="fld"><label>Zona</label><select id="e_zona">${allZonas().slice().sort((a,b)=>a.localeCompare(b,'es')).map(z=>`<option value="${z.replace(/"/g,'&quot;')}"${z===n.zona?' selected':''}>${z}</option>`).join('')}<option value="__nueva__">\u002b Crear zona nueva\u2026</option></select>
      <input id="e_zona_new" placeholder="Nombre de la zona nueva" style="display:none;margin-top:5px"></div>
    </div>
    <datalist id="zl">${S.zonas.map(z=>`<option value="${z}">`).join('')}</datalist>
    <div class="fld"><label>Direcciones IP (una por línea)</label><textarea id="e_ip" placeholder="192.168.4.20">${n.ip.join('\n')}</textarea>
      <div class="iphelp">Una por línea. Si el equipo está en varias redes, ponlas todas: <b>192.168.41.25</b> y <b>192.168.1.25</b> no son duplicado.</div>
      <button type="button" class="btn mini" id="e_ipadd">＋ Añadir otra IP</button></div>
    <div class="fld"><label>MAC</label><input id="e_mac" value="${(n.mac||'').replace(/"/g,'&quot;')}" placeholder="AA:BB:CC:DD:EE:FF"></div>
    <div class="row2">
      <div class="fld"><label>Modelo</label><input id="e_modelo" value="${(n.modelo||'').replace(/"/g,'&quot;')}"></div>
      <div class="fld"><label>Ubicación</label><input id="e_ubic" value="${(n.ubic||'').replace(/"/g,'&quot;')}"></div>
      <div class="fld"><label>Altura en el armario (U)</label><input id="e_u" type="number" min="1" max="8" value="${n.u||''}" placeholder="auto"></div>
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
      ${S.nodes.filter(x=>x.id!==n.id).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'))
        .map(x=>`<option value="${x.id}">${x.nombre}</option>`).join('')}</select>
      <button class="btn" id="e_ladd">＋</button></div>
  </div>`;
}
export function showDetail(){
  const d=document.getElementById('detail'),app=document.querySelector('.app');
  if(state.pathMode){
    app.classList.add('sel');
    var org=state.pathA?S.byId[state.pathA]:null;
    d.innerHTML='<div class="dtitle">\ud83e\udded Ruta</div>'+
      '<div class="dtype">'+(org?('Origen: <b>'+escAttr(org.nombre)+'</b><br>Ahora pulsa el equipo de destino.'):'Pulsa el equipo de <b>origen</b> en el mapa y despu\u00e9s el de destino.')+'</div>'+
      '<div class="frow" style="margin-top:8px"><button class="btn" id="rt_cancel">Cancelar ruta</button></div>';
    var cb=document.getElementById('rt_cancel');
    if(cb)cb.onclick=function(){ state.pathMode=false; state.pathA=null; state.path=null; setBtn('bPath',false); pathHint(false); render(); showDetail(); };
    return;
  }
  if(state.esel){
    const ed0=S.doc.edges.find(x=>(x.s===state.esel.s&&x.t===state.esel.t)||(x.s===state.esel.t&&x.t===state.esel.s));
    if(!ed0){state.esel=null;}
    else{
      const A=S.byId[ed0.s],B=S.byId[ed0.t];
      app.classList.add('sel');
      d.innerHTML=`<div class="dtitle">Conexión</div>
        <div class="dtype">${A.nombre} — ${B.nombre}</div>
        <dl class="kv">
                    <dt>Puerto en ${escAttr(A.nombre)}</dt><dd>${portSel(ed0,'s')}</dd>
          <dt>Puerto en ${escAttr(B.nombre)}</dt><dd>${portSel(ed0,'t')}</dd>
          <dt>Red</dt><dd><select id="e_net" style="width:100%;background:#0c1626;border:1px solid #26374f;border-radius:5px;color:#dbe9ff;font:inherit;font-size:11px;padding:2px 5px">
            <option value="">— automática —</option>
            ${(S.doc.redes||[]).map(function(c){return '<option value="'+escAttr(c.n)+'"'+(ed0.net===c.n?' selected':'')+'>'+escAttr(c.n)+'</option>';}).join('')}
          </select></dd>
          <dt>Categoría</dt><dd><select id="e_cat" style="width:100%;background:#0c1626;border:1px solid #26374f;border-radius:5px;color:#dbe9ff;font:inherit;font-size:11px;padding:2px 5px">
            <option value="">— sin categoría —</option>
            ${cabCats().map(function(c){return '<option value="'+escAttr(c.n)+'"'+(ed0.cat===c.n?' selected':'')+'>'+escAttr(c.n)+'</option>';}).join('')}
          </select></dd>
          <dt>Color</dt><dd><input type="color" id="e_col" value="${ed0.color||'#6ea8ff'}"
             style="width:34px;height:20px;border:none;background:none;padding:0"></dd>
          <dt>Trazado</dt><dd>${(Array.isArray(ed0.pts)&&ed0.pts.length)?ed0.pts.length+' punto'+(ed0.pts.length>1?'s':'')+' a mano':(S.doc.estyle||'curvo')}</dd>
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
          var busy=S.doc.edges.filter(function(x){
            if(x===ed0)return false;
            if(side==='s')return x.s===id&&x.pA===np;
            return x.t===id&&x.pB===np;
          })[0];
          if(busy){
            var otra=S.byId[busy.s===id?busy.t:busy.s];
            if(!confirm('El puerto '+np+' de '+(S.byId[id]||{}).nombre+' ya est\u00e1 ocupado por '+(otra?otra.nombre:'otro equipo')+'. \u00bfIntercambiar los dos puertos?')){ showDetail(); return; }
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
        snap(); S.doc.edges=S.doc.edges.filter(x=>x!==ed0); state.esel=null;
        save(); rebuild(); render(); renderList(); showDetail();
      };
      const cb2=document.getElementById('e_clean'); if(cb2)cb2.onclick=()=>{var q=pruneEdgePoints(ed0);snap();save();render();showDetail();if(!q)alert('No hab\u00eda puntos redundantes.');};
      const nb=document.getElementById('e_ntxt'); if(nb)nb.onclick=()=>openEdgeNote(ed0);
      const nr=document.getElementById('e_ntrm'); if(nr)nr.onclick=()=>{delete ed0.nt;save();render();showDetail();};
      const db=document.getElementById('e_del'); if(db)db.onclick=()=>{delLink(ed0.s,ed0.t);state.esel=null;showDetail();};
      return;
    }
  }
  const n=state.sel?S.byId[state.sel]:null;
  if(state.path&&state.path.length&&!state.sel){
    var arr=state.path.map(function(i){return S.byId[i];}).filter(Boolean);
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
    const arr=[...state.msel].map(i=>S.byId[i]).filter(Boolean);
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
    d.querySelectorAll('[data-chg]').forEach(el=>el.onclick=(ev)=>{
      ev.stopPropagation();
      var p=parseInt(el.getAttribute('data-chg'),10)||0;
      if(p) lnkOpenDev(n.id,p); else select(el.closest('.hitem').dataset.id,true);
    });
    d.querySelectorAll('.pcell.on').forEach(el=>el.onclick=()=>select(el.dataset.id,true));
    d.querySelectorAll('.plist .prowC').forEach(el=>el.onclick=(ev)=>{ if(ev.target&&(ev.target.tagName==='SELECT'||ev.target.tagName==='OPTION'))return; if(el.dataset.id)select(el.dataset.id,true); });
    d.querySelectorAll('.plist .prow').forEach(el=>el.style.cursor='pointer');
    const st=document.getElementById('e_start');
    if(st)st.onclick=()=>{state.editing=n.id;showDetail();};
  }
}
