// ---------- init ----------
loadDoc(); if(!restoreLayout())layout(); try{ ppMigrate(); }catch(e){ console.warn(e); } rebuildUI(); syncEdit(); applyTitle(); bindTitle(); fit(); render(); renderList(); showDetail();
document.getElementById('bEdge').textContent='Trazado: '+(doc.estyle==='orto'?'ortogonal':(doc.estyle||'curvo'));
setBtn('bGrid',!!state.grid);
try{ if(localStorage.getItem('nm_rackonly')==='0')state.rackOnly=false; }catch(e){}
try{ if(localStorage.getItem('nm_lockz')==='1'){ state.lockZones=true; setBtn('bLock',true); document.body.classList.add('lockz'); document.getElementById('bLock').textContent='\ud83d\udd12 Secciones fijas'; } }catch(e){}

