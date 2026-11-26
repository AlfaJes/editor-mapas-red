// ---------- conexiones dentro del armario ----------
// Clic en un puerto del patch panel o en un puerto de un equipo: elegir
// qué equipo y qué puerto hay al otro lado.

// color de un puerto de patch: el de la conexion que lleva, o el del equipo
function linkColor(lk){
  if(!lk) return '';
  var d=byId[lk.devId];
  if(!d) return '#4f8cff';
  var e=doc.edges.filter(function(x){
    return (x.s===lk.devId&&x.pA===lk.port)||(x.t===lk.devId&&x.pB===lk.port);
  })[0];
  if(e){ var c=cabColor(e); if(c) return c; }
  try{ var b=col(d); if(b) return b; }catch(_){}
  return '#4f8cff';
}

var LN = { kind: null, idx: -1, port: 0, nodeId: null, rackId: null };

function lnkRack() {
  var id = state.rackId;
  return (doc.racks || []).filter(function (r) { return r.id === id; })[0] || null;
}
function lnkPortsOf(id) { return Math.max(1, capFor(id)); }
function lnkOcupados(id) {
  var m = {};
  doc.edges.forEach(function (e) {
    if (e.s === id) m[e.pA] = 1;
    if (e.t === id) m[e.pB] = 1;
  });
  return m;
}
function lnkFillDevs(selected) {
  var sel = document.getElementById('lnk_dev');
  var cands = nodes.filter(function (n) { return lnkPortsOf(n.id) > 0; });
  if (LN.kind === 'dev') cands = cands.filter(function (n) { return n.id !== LN.nodeId; });
  cands.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  sel.innerHTML = '<option value="">— nada —</option>' + cands.map(function (n) {
    return '<option value="' + n.id + '"' + (n.id === selected ? ' selected' : '') + '>' + escAttr(n.nombre) + '</option>';
  }).join('');
  lnkFillPorts();
}
function lnkFillPorts(want) {
  var dev = document.getElementById('lnk_dev').value;
  var sel = document.getElementById('lnk_port');
  if (!dev) { sel.innerHTML = ''; return; }
  var cap = lnkPortsOf(dev);
  var ocu = lnkOcupados(dev);
  var cur = (LN.kind === 'patch') ? null : (LN.port || null);
  var ops = '', libres = 0, sel2 = false;
  for (var p = 1; p <= cap; p++) {
    var ocupado = ocu[p] && p !== cur;
    if (!ocupado) libres++;
    ops += '<option value="' + p + '"' + (ocupado ? ' disabled' : '') + (p === want ? ' selected' : '') + '>P' + p + (ocupado ? ' · ocupado' : '') + '</option>';
    if (p === want) sel2 = true;
  }
  sel.innerHTML = ops || '<option value="1">P1</option>';
  if (!sel2 && libres) {
    for (var q = 0; q < sel.options.length; q++) {
      if (!sel.options[q].disabled) { sel.value = sel.options[q].value; break; }
    }
  }
}
function lnkOpenPatch(idx, port) {
  var r = lnkRack(); if (!r) return;
  var it = r.items[idx]; if (!it || it.k !== 'pp') return;
  LN = { kind: 'patch', idx: idx, port: port, nodeId: null, rackId: r.id };
  var lk = (it.links || {})[port] || null;
  document.getElementById('lnk_t').textContent = 'Puerto ' + port + ' del patch panel';
  document.getElementById('lnk_sub').textContent = lk
    ? ('Ahora va a ' + lk.dev + ' P' + lk.port + '. Puedes cambiarlo o quitarlo.')
    : 'Elige a qué equipo y puerto llega este latiguillo.';
  lnkFillDevs(lk ? lk.devId : '');
  if (lk) lnkFillPorts(lk.port);
  document.getElementById('lnkm').classList.add('on');
}
function lnkOpenDev(nodeId, port) {
  var r = lnkRack(); if (!r) return;
  LN = { kind: 'dev', idx: -1, port: port, nodeId: nodeId, rackId: r ? r.id : null };
  var n = byId[nodeId]; if (!n) return;
  var ed = doc.edges.filter(function (e) {
    return (e.s === nodeId && e.pA === port) || (e.t === nodeId && e.pB === port);
  })[0];
  var other = ed ? byId[ed.s === nodeId ? ed.t : ed.s] : null;
  document.getElementById('lnk_t').textContent = n.nombre + ' · puerto ' + port;
  document.getElementById('lnk_sub').textContent = other
    ? ('Ahora va a ' + other.nombre + ' P' + (ed.s === nodeId ? ed.pB : ed.pA) + '.')
    : 'Elige a qué equipo y puerto se conecta.';
  lnkFillDevs(other ? other.id : '');
  if (other) lnkFillPorts(ed.s === nodeId ? ed.pB : ed.pA);
  document.getElementById('lnkm').classList.add('on');
}
function lnkClose() { document.getElementById('lnkm').classList.remove('on'); }

function lnkSave() {
  var dev = document.getElementById('lnk_dev').value;
  var port = parseInt(document.getElementById('lnk_port').value, 10) || 0;
  if (!dev || !port) { alert('Elige equipo y puerto.'); return; }
  var _o = document.getElementById('lnk_port').options[document.getElementById('lnk_port').selectedIndex];
  if (_o && _o.disabled) { alert('Ese puerto ya está ocupado. Elige otro.'); return; }
  var d = byId[dev]; if (!d) return;
  if (LN.kind === 'patch') {
    var r = lnkRack(); var it = r && r.items[LN.idx];
    if (!it) return;
    it.links = it.links || {};
    it.links[LN.port] = { devId: dev, dev: d.nombre, port: port };
    save(); renderArmarios(); lnkClose();
  } else {
    var a = LN.nodeId, b = dev;
    if (a === b) { alert('No se puede conectar consigo mismo.'); return; }
    // liberar los puertos implicados
    doc.edges = doc.edges.filter(function (e) {
      return !((e.s === a && e.pA === LN.port) || (e.t === a && e.pB === LN.port) ||
               (e.s === b && e.pA === port) || (e.t === b && e.pB === port));
    });
    var hs = hostOf(a, b);
    var e2 = { s: a, t: b, h: hs.id, port: 0, pA: LN.port, pB: port };
    doc.edges.push(e2); syncRackPort(e2);
    save(); rebuild(); render(); renderList(); renderArmarios(); lnkClose();
  }
}
function lnkDelete() {
  if (LN.kind === 'patch') {
    var r = lnkRack(); var it = r && r.items[LN.idx];
    if (it && it.links) { delete it.links[LN.port]; save(); renderArmarios(); }
  } else {
    doc.edges = doc.edges.filter(function (e) {
      return !((e.s === LN.nodeId && e.pA === LN.port) || (e.t === LN.nodeId && e.pB === LN.port));
    });
    save(); rebuild(); render(); renderList(); renderArmarios();
  }
  lnkClose();
}

// enlaces directos (el script va al final del body: los elementos ya existen)
(function(){
  var ok = document.getElementById('lnk_ok'); if (ok) ok.onclick = lnkSave;
  var del = document.getElementById('lnk_del'); if (del) del.onclick = lnkDelete;
  var can = document.getElementById('lnk_cancel'); if (can) can.onclick = lnkClose;
  var dv = document.getElementById('lnk_dev'); if (dv) dv.onchange = function(){ lnkFillPorts(); };
})();
// clic en los puertos (delegado: sobrevive a los repintados)
document.addEventListener('click', function(ev){
  var t=ev.target;
  if(!t||!t.closest) return;
  var pp=t.closest('.armport');
  if(pp){ ev.stopPropagation(); lnkOpenPatch(+pp.getAttribute('data-pp'), +pp.getAttribute('data-p')); return; }
  var dp=t.closest('.devport');
  if(dp){ ev.stopPropagation(); lnkOpenDev(dp.getAttribute('data-dp'), +dp.getAttribute('data-p')); return; }
});

// ---------- configuracion del patch panel ----------
var PPX = { idx: -1 };
function ppInfo() {
  var per = Math.max(6, Math.min(48, parseInt(document.getElementById('ppm_pr').value, 10) || 24));
  var tot = Math.max(per, Math.min(per * 8, parseInt(document.getElementById('ppm_pt').value, 10) || per));
  return { per: per, tot: tot, u: Math.max(1, Math.ceil(tot / per)) };
}
function ppRefresh() {
  var v = ppInfo();
  document.getElementById('ppm_info').textContent =
    'Ocupará ' + v.u + 'U (' + v.per + ' por fila · ' + v.tot + ' en total)';
}
function ppOpen(idx) {
  var r = lnkRack(); if (!r) return;
  var it = r.items[idx]; if (!it || it.k !== 'pp') return;
  PPX.idx = idx;
  var per = it.ppr || 24, tot = it.pt || (per * (it.u || 1));
  document.getElementById('ppm_n').value = it.n || '';
  document.getElementById('ppm_pr').value = per;
  document.getElementById('ppm_pt').value = tot;
  ppRefresh();
  document.getElementById('ppm').classList.add('on');
}
function ppSave() {
  var r = lnkRack(); var it = r && r.items[PPX.idx]; if (!it) return;
  var v = ppInfo();
  var viejo = it.u || 1;
  it.n = document.getElementById('ppm_n').value.trim() || ('Patch ' + v.tot + 'p');
  it.ppr = v.per; it.pt = v.tot; it.u = v.u;
  if (colision(r, it)) {
    it.u = viejo; it.ppr = v.per; it.pt = v.tot;
    // intentar reubicar hacia arriba y luego abajo
    var ok = false;
    for (var d = 1; d <= 8 && !ok; d++) { it.u0 = (it.u0 || 1) + d; ok = !colision(r, it); if (!ok) it.u0 -= d; }
    if (!ok) { it.u = viejo; alert('No cabe: el armario no tiene hueco para ' + v.u + 'U seguidas.'); return; }
  }
  save(); renderArmarios(); document.getElementById('ppm').classList.remove('on');
}
function ppDel() {
  var r = lnkRack(); var it = r && r.items[PPX.idx]; if (!it) return;
  r.items.splice(PPX.idx, 1);
  save(); renderArmarios(); document.getElementById('ppm').classList.remove('on');
}
(function(){
  var o = document.getElementById('ppm_ok'); if (o) o.onclick = ppSave;
  var c = document.getElementById('ppm_cancel'); if (c) c.onclick = function(){ document.getElementById('ppm').classList.remove('on'); };
  var d = document.getElementById('ppm_del'); if (d) d.onclick = ppDel;
  ['ppm_pr','ppm_pt'].forEach(function(id){
    var e = document.getElementById(id); if (e) e.oninput = function(){
      var per = parseInt(document.getElementById('ppm_pr').value,10)||24;
      ppRefresh();
    };
  });
})();
document.addEventListener('click', function(ev){
  var t = ev.target;
  if (!t || !t.closest) return;
  var c = t.closest('[data-cfg]');
  if (c) { ev.stopPropagation(); ppOpen(+c.getAttribute('data-cfg')); }
}, true);

// ---------- equipos dentro de una bandeja ----------
// La bandeja NO cambia de altura: los equipos van dentro del hueco libre.
function trayWhere(id) {
  var out = null;
  (doc.racks || []).forEach(function (r) {
    r.items.forEach(function (it) {
      if (it.k === 'dev' && it.id === id) out = { r: r, it: it };
      (it.kids || []).forEach(function (k, ki) { if (k.id === id) out = { r: r, it: it, ki: ki }; });
    });
  });
  return out;
}
function trayLibres(it) {
  var usada = 0;
  (it.kids || []).forEach(function (k) { usada += Math.max(1, parseInt(k.h) || 1); });
  return Math.max(0, (it.u || 1) - usada);
}
function trayOpen(idx) {
  var r = lnkRack(); if (!r) return;
  var it = r.items[idx]; if (!it) return;
  PPX.tray = idx;
  var lib = nodes.slice().sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); });
  document.getElementById('trm_dev').innerHTML = lib.map(function (n) {
    var w = trayWhere(n.id);
    var donde = w ? (w.ki !== undefined ? ' · ya en ' + w.it.n : ' · ya en ' + w.r.n) : '';
    return '<option value="' + n.id + '">' + (n.nombre || '(sin nombre)') + ' — ' + ((TYPE[n.tipo] || ['', ''])[1] || n.tipo) + donde + '</option>';
  }).join('');
  var tope = Math.max(1, parseInt(it.u) || 1);
  var hs = document.getElementById('trm_h');
  hs.innerHTML = '';
  for (var k = 1; k <= tope; k++) hs.innerHTML += '<option value="' + k + '">' + k + ' U</option>';
  hs.disabled = false;
  var usada = 0; (it.kids || []).forEach(function (x) { usada += Math.max(1, parseInt(x.h) || 1); });
  document.getElementById('trm_libre').textContent =
    'La bandeja mide ' + tope + 'U y no cambia. Lleva ' + usada + 'U en ' + (it.kids || []).length +
    ' equipo(s): si metes más, se reparten el alto.';
  document.getElementById('trm_ok').disabled = false;
  document.getElementById('trm').classList.add('on');
}
function trayClose() { document.getElementById('trm').classList.remove('on'); }
function traySave() {
  var r = lnkRack(); if (!r) return;
  var it = r.items[PPX.tray]; if (!it) return trayClose();
  var id = document.getElementById('trm_dev').value;
  var h = Math.max(1, parseInt(document.getElementById('trm_h').value) || 1);
  if (!id) { alert('Elige un equipo.'); return; }
  var libre = trayLibres(it);
  var tope = Math.max(1, parseInt(it.u) || 1);
  h = Math.min(h, tope);
  // si ya estaba colocado en otro sitio, se mueve aquí
  var w = trayWhere(id);
  if (w) {
    if (w.ki !== undefined) w.it.kids.splice(w.ki, 1);
    else w.r.items = w.r.items.filter(function (x) { return !(x.k === 'dev' && x.id === id); });
  }
  it.kids = it.kids || [];
  it.kids.push({ id: id, h: h });
  // la bandeja no cambia de altura: los equipos se reparten el hueco
  save(); renderArmarios(); trayClose();
}
(function () {
  var ok = document.getElementById('trm_ok'); if (!ok) return;
  ok.onclick = traySave;
  document.getElementById('trm_cancel').onclick = trayClose;
  document.getElementById('trm').addEventListener('click', function (e) { if (e.target.id === 'trm') trayClose(); });
  document.addEventListener('pointerdown', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-tray]');
    if (t) { ev.stopPropagation(); ev.preventDefault(); trayOpen(+t.getAttribute('data-tray')); }
  }, true);
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-tray]');
    if (t) { ev.stopPropagation(); return; }
    var k = ev.target.closest && ev.target.closest('[data-kid]');
    if (k) {
      ev.stopPropagation();
      var p = String(k.getAttribute('data-kid')).split(':');
      var rr = lnkRack(); var itm = rr && rr.items[+p[0]];
      if (itm && itm.kids && itm.kids[+p[1]]) {
        itm.kids.splice(+p[1], 1);
        save(); renderArmarios();
      }
    }
  });
})();
