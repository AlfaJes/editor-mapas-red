// ---------- conexiones dentro del armario ----------
// Clic en un puerto del patch panel o en un puerto de un equipo: elegir
// qué equipo y qué puerto hay al otro lado.
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
