import { S } from './00-store.js';
import { state } from './01-base.js';
import { loadDoc } from './02-modelo.js';
import { applyTitle, layout, restoreLayout } from './03-layout.js';
import { fit } from './04a-geometria.js';
import { render, renderList } from './04b-render-mapa.js';
import { showDetail } from './04c-ficha-formularios.js';
import { rebuildUI, setBtn, syncEdit } from './07-ui.js';
import { bindTitle } from './08-rack.js';
import { ppMigrate } from './08c-conexiones.js';
// ---------- init ----------
loadDoc(); if(!restoreLayout())layout(); try{ ppMigrate(); }catch(e){ console.warn(e); } rebuildUI(); syncEdit(); applyTitle(); bindTitle(); fit(); render(); renderList(); showDetail();
document.getElementById('bEdge').textContent='Trazado: '+(S.doc.estyle==='orto'?'ortogonal':(S.doc.estyle||'curvo'));
setBtn('bGrid',!!state.grid);
try{ if(localStorage.getItem('nm_rackonly')==='0')state.rackOnly=false; }catch(e){}
try{ if(localStorage.getItem('nm_lockz')==='1'){ state.lockZones=true; setBtn('bLock',true); document.body.classList.add('lockz'); document.getElementById('bLock').textContent='\ud83d\udd12 Secciones fijas'; } }catch(e){}

