import { S } from './00-store.js';
import { snap } from './02-modelo.js';
import { C } from './04a-geometria.js';
import { t } from './dom.js';
export const DATA=__DATA__;
export const TYPE={pc:['#4f8cff','PC'],switch:['#a78bfa','Switch'],router:['#f472b6','Router'],
 firewall:['#fb7185','Firewall'],server:['#34d399','Servidor'],nas:['#fbbf24','NAS'],
 wifi:['#22d3ee','Wi-Fi'],nvr:['#e879f9','Grabador'],otro:['#94a3b8','Otro'],
 maquina:['#f59e0b','Máquina'],cnc:['#fb923c','CNC'],plc:['#60a5fa','PLC'],
 impresora:['#cbd5e1','Impresora'],camara:['#f472b6','Cámara'],ups:['#22c55e','SAI'],vm:['#818cf8','Máquina virtual'],
 patch:['#64748b','Patch panel','PP']};
export const NETCOL={'Oficinas':'#fbbf24','Producción':'#38bdf8','Servidores':'#a78bfa','Otra':'#94a3b8'};
export const KEY='mapared.levante.v1';
export const IDXKEY='nmedit:index';
export const FRESH=JSON.parse(JSON.stringify(DATA));
S.doc, S.nodes=[], S.edges=[], S.byId={}, S.adj={}, S.zonas=[], S.hist=[];
export const state={rackMode:'armario',editing:null,q:'',types:new Set(Object.keys(TYPE)),zona:'',red:'',labels:true,edges:true,hulls:true,showIp:true,
  sel:null,edit:false,linkMode:false,pending:null,view:'mapa',msel:new Set(),
  nets:new Set(),colorBy:'tipo',grid:true,snap:true,path:null,pathA:null,pathMode:false,elab:true,lockZones:false,rackOnly:true};

// ---------- copias de seguridad automáticas ----------
export function bakKey(){ return 'nm_bak_'+S.PROJ.cur; }
export function bakList(){ try{ return JSON.parse(localStorage.getItem(bakKey())||'[]'); }catch(e){ return []; } }
export function bakPush(force){
  var now=Date.now(), L=bakList();
  var last=L.length?L[L.length-1].t:0;
  if(!force && now-last<60000) return;
  L.push({t:now, d:JSON.stringify(S.doc)});
  while(L.length>5)L.shift();
  try{ localStorage.setItem(bakKey(),JSON.stringify(L)); }catch(e){}
}
