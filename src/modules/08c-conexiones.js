import { S } from './00-store.js';
import { TYPE, state } from './01-base.js';
import { capFor, hostOf, rebuild, save, snap, syncRackPort } from './02-modelo.js';
import { cabColor, col } from './04a-geometria.js';
import { render, renderList, v } from './04b-render-mapa.js';
import { escAttr, showDetail } from './04c-ficha-formularios.js';
import { colision, renderArmarios } from './08b-armarios.js';
import { t } from './dom.js';
// ---------- conexiones dentro del armario ----------
// Clic en un puerto del patch panel o en un puerto de un equipo: elegir
// qué equipo y qué puerto hay al otro lado.

// color de un puerto de patch: el de la conexion que lleva, o el del equipo
export function linkColor(lk){
  if(!lk) return '';
  var d=S.byId[lk.devId];
  if(!d) return '#4f8cff';
  var e=S.doc.edges.filter(function(x){
    return (x.s===lk.devId&&x.pA===lk.port)||(x.t===lk.devId&&x.pB===lk.port);
  })[0];
  if(e){ var c=cabColor(e); if(c) return c; }
  try{ var b=col(d); if(b) return b; }catch(_){}
  return '#4f8cff';
}

S.LN = { kind: null, idx: -1, port: 0, nodeId: null, rackId: null };

export function lnkRack() {
  var id = state.rackId;
  return (S.doc.racks || []).filter(function (r) { return r.id === id; })[0] || null;
}
export function lnkPortsOf(id) { return Math.max(1, capFor(id)); }
export function lnkOcupados(id) {
  var m = {};
  S.doc.edges.forEach(function (e) {
    if (e.s === id) m[e.pA] = 1;
    if (e.t === id) m[e.pB] = 1;
  });
  return m;
}
// rellena un <select> de equipos (excluyendo el propio equipo si se indica)
export function fillDev(selId, selected, exceptId) {
  var sel = document.getElementById(selId); if (!sel) return;
  var cands = S.nodes.filter(function (n) { return lnkPortsOf(n.id) > 0 && n.id !== exceptId; });
  cands.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  sel.innerHTML = '<option value="">— nada —</option>' + cands.map(function (n) {
    return '<option value="' + n.id + '"' + (n.id === selected ? ' selected' : '') + '>' + escAttr(n.nombre) + '</option>';
  }).join('');
}
// rellena un <select> de puertos; exemptFn(p) dice qué puertos no cuentan como ocupados
export function fillPort(selId, devId, want, exemptFn) {
  var sel = document.getElementById(selId); if (!sel) return;
  if (!devId) { sel.innerHTML = ''; return; }
  var cap = lnkPortsOf(devId), ocu = lnkOcupados(devId), ops = '', libres = 0, ok = false;
  for (var p = 1; p <= cap; p++) {
    var ocupado = !!ocu[p] && !(exemptFn && exemptFn(p));
    if (!ocupado) libres++;
    ops += '<option value="' + p + '"' + (ocupado ? ' disabled' : '') + (p === want ? ' selected' : '') + '>P' + p + (ocupado ? ' · ocupado' : '') + '</option>';
    if (p === want) ok = true;
  }
  sel.innerHTML = ops || '<option value="1">P1</option>';
  if (!ok && libres) {
    for (var q = 0; q < sel.options.length; q++) { if (!sel.options[q].disabled) { sel.value = sel.options[q].value; break; } }
  }
}
export function lnkFillDevs(selected) {
  var sel = document.getElementById('lnk_dev');
  var cands = S.nodes.filter(function (n) { return lnkPortsOf(n.id) > 0; });
  if (S.LN.kind === 'dev') cands = cands.filter(function (n) { return n.id !== S.LN.nodeId; });
  cands.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  sel.innerHTML = '<option value="">— nada —</option>' + cands.map(function (n) {
    return '<option value="' + n.id + '"' + (n.id === selected ? ' selected' : '') + '>' + escAttr(n.nombre) + '</option>';
  }).join('');
  lnkFillPorts();
}
export function lnkFillPorts(want) {
  var dev = document.getElementById('lnk_dev').value;
  var sel = document.getElementById('lnk_port');
  if (!dev) { sel.innerHTML = ''; return; }
  var cap = lnkPortsOf(dev);
  var ocu = lnkOcupados(dev);
  var cur = (S.LN.kind === 'patch') ? null : (S.LN.port || null);
  // enlace actual: su puerto en el equipo de destino no cuenta como ocupado,
  // para poder conservarlo o moverlo a otro puerto
  var curT = 0, curPartner = null;
  if (S.LN.kind === 'patch') {
    // el enlace actual del puerto del patch (patch -> equipo/puerto)
    var rp = lnkRack(), itp = rp && rp.items[S.LN.idx];
    var lk = itp && itp.links && itp.links[S.LN.port];
    if (lk) { curPartner = lk.devId; curT = parseInt(lk.port, 10) || 0; }
  } else {
    var ed = S.doc.edges.filter(function (e) {
      return (e.s === S.LN.nodeId && e.pA === cur) || (e.t === S.LN.nodeId && e.pB === cur);
    })[0];
    if (ed) { curPartner = ed.s === S.LN.nodeId ? ed.t : ed.s; curT = ed.s === S.LN.nodeId ? ed.pB : ed.pA; }
  }
  var ops = '', libres = 0, sel2 = false;
  for (var p = 1; p <= cap; p++) {
    var ocupado = ocu[p] && p !== cur && !(dev === curPartner && p === curT);
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

// al cambiar de equipo un cable que solo tenia un codo (bx/by), el codo pasa a ser
// un punto fijo del trazado: asi la linea ya dibujada se respeta y solo se rehace el ultimo tramo
export function keepRoute(e) {
  if (!e) return;
  var st = S.doc.estyle || 'curvo';
  if (st !== 'curvo') return;
  if (Array.isArray(e.pts) && e.pts.length) return;
  if (typeof e.bx === 'number' && typeof e.by === 'number') e.pts = [[e.bx, e.by]];
}

// ---------- patch panel: cada puerto tiene DOS lados (equipo trasero <-> switch delantero) ----------
function ppLink(it, p) {
  var lk = (it.links || {})[p];
  if (!lk) return { a: null, b: null };
  if (lk.a || lk.b) return { a: lk.a || null, b: lk.b || null };
  return { a: lk.devId ? { devId: lk.devId, port: lk.port } : null, b: null };
}
function ppFillSide(sfx, keep) {
  var lk = ppLink(lnkRack() ? lnkRack().items[S.LN.idx] : null, S.LN.port);
  var cur = sfx === '2' ? lk.b : lk.a;
  var selDev = document.getElementById('lnk_dev' + sfx);
  var devId = keep ? (selDev ? selDev.value : '') : (cur ? cur.devId : '');
  fillDev('lnk_dev' + sfx, devId, null);
  var want = keep ? 0 : (cur ? cur.port : 0);
  fillPort('lnk_port' + sfx, document.getElementById('lnk_dev' + sfx).value, want, function (p) {
    return !keep && cur && p === cur.port;
  });
}
// convierte it.links en cables de verdad del nodo del patch (sin tocar los que ya existen)
export function ppApplyLinks(it) {
  if (!it || !it.nid || !S.byId[it.nid]) return;
  var nid = it.nid;
  // cables actuales del patch, indexados por puerto local + equipo + puerto del otro extremo
  var exist = {};
  S.doc.edges.forEach(function (e) {
    if (e.s !== nid && e.t !== nid) return;
    var me = e.s === nid ? e.pA : e.pB;
    var other = e.s === nid ? e.t : e.s;
    var othPort = e.s === nid ? e.pB : e.pA;
    var k = me + '|' + other + '|' + othPort;
    (exist[k] = exist[k] || []).push(e);
  });
  var keepSet = [];
  Object.keys(it.links || {}).forEach(function (p) {
    var lk = ppLink(it, p);
    ['a', 'b'].forEach(function (side) {
      var x = lk[side]; if (!x || !x.devId || !S.byId[x.devId]) return;
      var pt = parseInt(p, 10) || 0, dp = parseInt(x.port, 10) || 0;
      if (!pt || !dp) return;
      var k = pt + '|' + x.devId + '|' + dp;
      var arr = exist[k] || [];
      var e = arr.filter(function (z) { return keepSet.indexOf(z) < 0; })[0];
      if (e) {                      // misma conexión: se reutiliza el cable tal cual
        if (e.pside !== side) e.pside = side;
        keepSet.push(e);
        try { syncRackPort(e); } catch (_) {}
        return;
      }
      var hs = hostOf(nid, x.devId);
      var ne = { s: nid, t: x.devId, h: hs.id, port: 0, pA: pt, pB: dp, pside: side };
      try { syncRackPort(ne); } catch (_) {}
      S.doc.edges.push(ne);
      keepSet.push(ne);
    });
  });
  // se quitan solo los cables del patch que ya no figuran en sus puertos
  S.doc.edges = S.doc.edges.filter(function (e) {
    if (e.s !== nid && e.t !== nid) return true;
    return keepSet.indexOf(e) >= 0;
  });
}
// lee los cables existentes del patch y rellena it.links (a/b)
export function ppBuildLinks(it) {
  if (!it || !it.nid) return;
  var nid = it.nid;
  it.links = it.links || {};
  S.doc.edges.forEach(function (e) {
    if (e.s === nid && e.t !== nid) {
      var p = e.pA, side = e.pside || null;
      var cur = ppLink(it, p);
      if (!side) side = cur.a ? (cur.b ? null : 'b') : 'a';
      if (!side) return;
      if (!cur[side]) { it.links[p] = { a: cur.a, b: cur.b }; it.links[p][side] = { devId: e.t, port: e.pB }; }
    } else if (e.t === nid && e.s !== nid) {
      var p2 = e.pB, side2 = e.pside || null;
      var cur2 = ppLink(it, p2);
      if (!side2) side2 = cur2.a ? (cur2.b ? null : 'b') : 'a';
      if (!side2) return;
      if (!cur2[side2]) { it.links[p2] = { a: cur2.a, b: cur2.b }; it.links[p2][side2] = { devId: e.s, port: e.pA }; }
    }
  });
}
export function lnkOpenPatch(idx, port) {
  var r = lnkRack(); if (!r) return;
  var it = r.items[idx]; if (!it || it.k !== 'pp') return;
  S.LN = { kind: 'patch', idx: idx, port: port, nodeId: null, rackId: r.id };
  var lk = ppLink(it, port);
  document.getElementById('lnk_t').textContent = (it.n || 'Patch') + ' · puerto ' + port;
  var txt = [];
  if (lk.a) txt.push('trasera (equipo): ' + ((S.byId[lk.a.devId] || {}).nombre || '?') + ' P' + lk.a.port);
  if (lk.b) txt.push('delantera (switch): ' + ((S.byId[lk.b.devId] || {}).nombre || '?') + ' P' + lk.b.port);
  document.getElementById('lnk_sub').textContent = txt.length
    ? ('Ahora tiene ' + txt.join(' y ') + '.')
    : 'La parte trasera viene del equipo; la delantera va al switch o router.';
  document.getElementById('lnk_l1').textContent = 'Equipo · parte trasera (del equipo al patch)';
  document.getElementById('lnk_l2').textContent = 'Switch / router · parte delantera (del patch al switch)';
  document.getElementById('lnk_side2').style.display = 'block';
  ppFillSide('', false);
  ppFillSide('2', false);
  document.getElementById('lnkm').classList.add('on');
}
export function lnkOpenDev(nodeId, port) {
  var r = lnkRack();
  S.LN = { kind: 'dev', idx: -1, port: port, nodeId: nodeId, rackId: r ? r.id : null };
  var n = S.byId[nodeId]; if (!n) return;
  var ed = S.doc.edges.filter(function (e) {
    return (e.s === nodeId && e.pA === port) || (e.t === nodeId && e.pB === port);
  })[0];
  var other = ed ? S.byId[ed.s === nodeId ? ed.t : ed.s] : null;
  document.getElementById('lnk_t').textContent = n.nombre + ' · puerto ' + port;
  document.getElementById('lnk_sub').textContent = other
    ? ('Ahora va a ' + other.nombre + ' P' + (ed.s === nodeId ? ed.pB : ed.pA) + '.')
    : 'Elige a qué equipo y puerto se conecta.';
  lnkFillDevs(other ? other.id : '');
  if (other) lnkFillPorts(ed.s === nodeId ? ed.pB : ed.pA);
  var s2 = document.getElementById('lnk_side2');
  if (s2) s2.style.display = 'none';
  var l1 = document.getElementById('lnk_l1'); if (l1) l1.textContent = 'Equipo';
  document.getElementById('lnkm').classList.add('on');
}
export function lnkClose() { document.getElementById('lnkm').classList.remove('on'); }

// lee un lado del modal: {devId,port} o null
function readSide(sfx) {
  var dv = document.getElementById('lnk_dev' + sfx), pt = document.getElementById('lnk_port' + sfx);
  var id = dv ? dv.value : '';
  var p = pt ? (parseInt(pt.value, 10) || 0) : 0;
  if (!id || !p) return null;
  return { devId: id, port: p };
}

export function lnkSave() {
  // ---- patch: dos lados (equipo en la trasera, switch en la delantera) ----
  if (S.LN.kind === 'patch') {
    var rk = lnkRack(), itp = rk && rk.items[S.LN.idx];
    if (!itp) return;
    var A = readSide(''), B = readSide('2');
    if (A && B && A.devId === B.devId && A.port === B.port) { alert('El mismo equipo y puerto en los dos lados.'); return; }
    itp.links = itp.links || {};
    if (!A && !B) delete itp.links[S.LN.port];
    else itp.links[S.LN.port] = { a: A, b: B };
    ppApplyLinks(itp);
    save(); rebuild(); render(); renderList(); renderArmarios(); showDetail(); lnkClose();
    return;
  }
  var dev = document.getElementById('lnk_dev').value;
  var port = parseInt(document.getElementById('lnk_port').value, 10) || 0;
  if (!dev) {
    // sin equipo destino: si el puerto tenía enlace, se quita
    var tenia = S.doc.edges.some(function (e) {
          return (e.s === S.LN.nodeId && e.pA === S.LN.port) || (e.t === S.LN.nodeId && e.pB === S.LN.port);
        });
    if (tenia) lnkDelete(); else lnkClose();
    return;
  }
  if (!port) { alert('Elige equipo y puerto.'); return; }
  var _o = document.getElementById('lnk_port').options[document.getElementById('lnk_port').selectedIndex];
  if (_o && _o.disabled) { alert('Ese puerto ya está ocupado. Elige otro.'); return; }
  var d = S.byId[dev]; if (!d) return;
  {
    var a = S.LN.nodeId, b = dev;
    if (a === b) { alert('No se puede conectar consigo mismo.'); return; }
    // enlace que ya ocupa este puerto: se reutiliza para conservar el trazado
    var old = S.doc.edges.filter(function (e) {
      return (e.s === a && e.pA === S.LN.port) || (e.t === a && e.pB === S.LN.port);
    })[0] || null;
    if (old) keepRoute(old);
    // liberar el puerto del equipo destino (y el enlace viejo, que se reinserta mutado)
    S.doc.edges = S.doc.edges.filter(function (e) {
      if (e === old) return false;
      return !((e.s === b && e.pA === port) || (e.t === b && e.pB === port));
    });
    var hs = hostOf(a, b);
    var e2;
    if (old) {
      // se conservan puntos intermedios, color, categoría, etiqueta y red;
      // solo cambia el extremo que se está editando (el otro tramo se estira)
      e2 = { s: old.s, t: old.t, pA: old.pA, pB: old.pB };
      ['pts', 'bx', 'by', 'color', 'cat', 'etq', 'net', 'vis', 'curve', 'tip', 'dash', 'w'].forEach(function (k) {
        if (old[k] !== undefined) e2[k] = (k === 'pts' ? old.pts.slice() : old[k]);
      });
      if (e2.s !== a) {                    // se orienta para que este puerto quede en 's'
        var _s = e2.s; e2.s = e2.t; e2.t = _s;
        var _p = e2.pA; e2.pA = e2.pB; e2.pB = _p;
        if (e2.pts) e2.pts.reverse();
      }
      e2.pA = S.LN.port; e2.t = b; e2.pB = port; e2.h = hs.id; e2.port = 0;
    } else {
      e2 = { s: a, t: b, h: hs.id, port: 0, pA: S.LN.port, pB: port };
    }
    S.doc.edges.push(e2); syncRackPort(e2);
    save(); rebuild(); render(); renderList(); renderArmarios(); showDetail(); lnkClose();
  }
}
export function lnkDelete() {
  if (S.LN.kind === 'patch') {
    var r = lnkRack(); var it = r && r.items[S.LN.idx];
    if (it && it.links) {
      delete it.links[S.LN.port];
      ppApplyLinks(it);
      save(); rebuild(); render(); renderList(); renderArmarios(); showDetail();
    }
  } else {
    S.doc.edges = S.doc.edges.filter(function (e) {
      return !((e.s === S.LN.nodeId && e.pA === S.LN.port) || (e.t === S.LN.nodeId && e.pB === S.LN.port));
    });
    save(); rebuild(); render(); renderList(); renderArmarios(); showDetail();
  }
  lnkClose();
}

// enlaces directos (el script va al final del body: los elementos ya existen)
(function(){
  var ok = document.getElementById('lnk_ok'); if (ok) ok.onclick = lnkSave;
  var del = document.getElementById('lnk_del'); if (del) del.onclick = lnkDelete;
  var can = document.getElementById('lnk_cancel'); if (can) can.onclick = lnkClose;
  var dv = document.getElementById('lnk_dev');
  if (dv) dv.onchange = function(){
    if (S.LN.kind === 'patch') { ppFillSide('', true); } else { lnkFillPorts(); }
  };
  var dv2 = document.getElementById('lnk_dev2');
  if (dv2) dv2.onchange = function(){ ppFillSide('2', true); };
})();
// clic en los puertos (delegado: sobrevive a los repintados)
document.addEventListener('click', function(ev){
  var t=ev.target;
  if(!t||!t.closest) return;
  var pp=t.closest('.armport');
  if(pp){ ev.stopPropagation(); ev.stopImmediatePropagation();
    var ipp=+pp.getAttribute('data-pp'), ppp=+pp.getAttribute('data-p');
    lnkOpenPatch(ipp, ppp);
    return; }
  var dp=t.closest('.devport');
  if(dp){ ev.stopPropagation(); ev.stopImmediatePropagation(); lnkOpenDev(dp.getAttribute('data-dp'), +dp.getAttribute('data-p')); return; }
});

// ---------- configuracion del patch panel ----------
S.PPX = { idx: -1 };
export function ppInfo() {
  var per = Math.max(6, Math.min(48, parseInt(document.getElementById('ppm_pr').value, 10) || 24));
  var tot = Math.max(per, Math.min(per * 8, parseInt(document.getElementById('ppm_pt').value, 10) || per));
  return { per: per, tot: tot, u: Math.max(1, Math.ceil(tot / per)) };
}
export function ppRefresh() {
  var v = ppInfo();
  document.getElementById('ppm_info').textContent =
    'Ocupará ' + v.u + 'U (' + v.per + ' por fila · ' + v.tot + ' en total)';
}
export function ppOpen(idx) {
  var r = lnkRack(); if (!r) return;
  var it = r.items[idx]; if (!it || it.k !== 'pp') return;
  S.PPX.idx = idx;
  var per = it.ppr || 24, tot = it.pt || (per * (it.u || 1));
  document.getElementById('ppm_n').value = it.n || '';
  document.getElementById('ppm_pr').value = per;
  document.getElementById('ppm_pt').value = tot;
  ppRefresh();
  document.getElementById('ppm').classList.add('on');
}
export function ppSave() {
  var r = lnkRack(); var it = r && r.items[S.PPX.idx]; if (!it) return;
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
  // sincronizar el nodo del mapa (nombre y numero de puertos)
  var nd=it.nid&&S.byId[it.nid];
  if(!nd){ try{ nd=ppMakeNode(it); }catch(e){} }
  if(nd){ nd.nombre=it.n; nd.puertos=v.tot; }
  try{ ppApplyLinks(it); }catch(e){}
  save(); renderArmarios(); render(); renderList();
  document.getElementById('ppm').classList.remove('on');
}
export function ppDel() {
  var r = lnkRack(); var it = r && r.items[S.PPX.idx]; if (!it) return;
  try{ ppDropNode(it); }catch(e){}
  r.items.splice(S.PPX.idx, 1);
  save(); renderArmarios(); render(); renderList();
  document.getElementById('ppm').classList.remove('on');
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
export function trayWhere(id) {
  var out = null;
  (S.doc.racks || []).forEach(function (r) {
    r.items.forEach(function (it) {
      if (it.k === 'dev' && it.id === id) out = { r: r, it: it };
      (it.kids || []).forEach(function (k, ki) { if (k.id === id) out = { r: r, it: it, ki: ki }; });
    });
  });
  return out;
}
export function trayLibres(it) {
  var usada = 0;
  (it.kids || []).forEach(function (k) { usada += Math.max(1, parseInt(k.h) || 1); });
  return Math.max(0, (it.u || 1) - usada);
}
export function trayOpen(idx) {
  var r = lnkRack(); if (!r) return;
  var it = r.items[idx]; if (!it) return;
  S.PPX.tray = idx;
  var lib = S.nodes.slice().sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre), 'es'); });
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
export function trayClose() { document.getElementById('trm').classList.remove('on'); }
export function traySave() {
  var r = lnkRack(); if (!r) return;
  var it = r.items[S.PPX.tray]; if (!it) return trayClose();
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
    var esX = ev.target.classList && ev.target.classList.contains('cabxx');
    if (k && esX) {
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

// ---------- mover equipos dentro de la bandeja ----------
(function () {
  document.addEventListener('mousedown', function (ev) {
    var g = ev.target.closest && ev.target.closest('.armkid');
    if (!g || (ev.target.closest && ev.target.closest('.cabxx'))) return;
    var pr = String(g.getAttribute('data-kid') || '').split(':');
    var ii = +pr[0], from = +pr[1];
    var r = lnkRack(); if (!r) return;
    var it = r.items[ii]; if (!it || !it.kids || !it.kids[from]) return;
    ev.preventDefault(); ev.stopPropagation();
    var up = function (e2) {
      document.removeEventListener('mouseup', up, true);
      var el = document.elementFromPoint(e2.clientX, e2.clientY);
      var t = el && el.closest ? el.closest('.armkid') : null;
      if (!t) return;
      var p2 = String(t.getAttribute('data-kid') || '').split(':');
      if (+p2[0] !== ii) return;
      var to = +p2[1]; if (to === from) return;
      var k = it.kids.splice(from, 1)[0];
      it.kids.splice(to, 0, k);
      save(); renderArmarios();
    };
    document.addEventListener('mouseup', up, true);
  }, true);
})();

// ---------- patch panel como equipo real del mapa ----------
export function ppTotalOf(it){
  var per=Math.max(6,Math.min(48,parseInt(it.ppr)||24));
  var tot=Math.max(per,Math.min(per*8,parseInt(it.pt)||(per*(parseInt(it.u)||1))));
  return {per:per,tot:tot,filas:Math.max(1,Math.ceil(tot/per))};
}
export function ppSpot(){
  for(var yy=110;yy<1000;yy+=95){
    for(var xx=110;xx<1600;xx+=150){
      var ok=true;
      for(var i=0;i<S.nodes.length;i++){var n=S.nodes[i];
        if(Math.abs((n.x||0)-xx)<130&&Math.abs((n.y||0)-yy)<78){ok=false;break;}}
      if(ok)return {x:xx,y:yy};
    }
  }
  return {x:200,y:200};
}
export function ppMakeNode(it){
  var t=ppTotalOf(it);
  var p=ppSpot();
  var id='pp'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  var nd={id:id,nombre:(it.n||'Patch panel'),tipo:'patch',puertos:t.tot,
    x:p.x,y:p.y,nx:p.x,ny:p.y,zona:(S.doc.zonasExtra&&S.doc.zonasExtra[0])||'',
    ip:[],mac:'',modelo:'',so:'',u:1,perifs:[],roles:[],protocolos:[]};
  S.doc.nodes.push(nd); it.nid=id; rebuild();
  return nd;
}
// crea los nodos que falten y mantiene los cables del patch en sintonia con it.links
export function ppMigrate(){
  var changed=false;
  (S.doc.racks||[]).forEach(function(r){
    (r.items||[]).forEach(function(it){
      if(it.k!=='pp')return;
      var t=ppTotalOf(it);
      var nd=(it.nid&&S.byId[it.nid]);
      if(!nd){ ppMakeNode(it); nd=S.byId[it.nid]; changed=true; }
      if((parseInt(nd.puertos)||0)!==t.tot){ nd.puertos=t.tot; changed=true; }
      // los cables que ya existen mandan: se vuelcan en it.links (a/b)
      ppBuildLinks(it);
      ppApplyLinks(it);
    });
  });
  if(changed){ rebuild(); }
  return changed;
}
export function ppDropNode(it){
  if(!it||!it.nid)return;
  S.doc.nodes=S.doc.nodes.filter(function(n){return n.id!==it.nid;});
  S.doc.edges=S.doc.edges.filter(function(e){return e.s!==it.nid&&e.t!==it.nid;});
  it.nid=null; rebuild();
}

// ---------- editor de enlace completo (equipo A + puerto A  <->  equipo B + puerto B) ----------
S.EG = { s: null, t: null };

function egEdgeOf(s, t) {
  return S.doc.edges.filter(function (e) {
    return (e.s === s && e.t === t) || (e.s === t && e.t === s);
  })[0] || null;
}
function egFillDevs() {
  var cur = { a: document.getElementById('eg_a').value, b: document.getElementById('eg_b').value };
  ['a', 'b'].forEach(function (side) {
    var sel = document.getElementById('eg_' + side);
    var other = side === 'a' ? document.getElementById('eg_b').value : document.getElementById('eg_a').value;
    var keep = cur[side];
    sel.innerHTML = S.nodes.slice().sort(function (x, y) { return x.nombre.localeCompare(y.nombre, 'es'); })
      .map(function (n) {
        var dis = (n.id === other) ? ' disabled' : '';
        return '<option value="' + n.id + '"' + (n.id === keep ? ' selected' : '') + dis + '>' + escAttr(n.nombre) + '</option>';
      }).join('');
  });
}
function egFillPorts(side) {
  var sel = document.getElementById('eg_p' + side);
  var id = document.getElementById('eg_' + side).value;
  if (!id) { sel.innerHTML = ''; return; }
  var cap = capFor(id), ocu = {}, ed = egEdgeOf(S.EG.s, S.EG.t);
  S.doc.edges.forEach(function (e) {
    if (e === ed) return;
    if (e.s === id && e.pA) ocu[e.pA] = 1;
    if (e.t === id && e.pB) ocu[e.pB] = 1;
  });
  var want = ed ? (ed.s === id ? ed.pA : (ed.t === id ? ed.pB : 0)) : 0;
  var ops = '';
  for (var p = 1; p <= cap; p++) {
    ops += '<option value="' + p + '"' + (ocu[p] ? ' disabled' : '') + (p === want ? ' selected' : '')
      + '>P' + p + (ocu[p] ? ' · ocupado' : '') + '</option>';
  }
  sel.innerHTML = ops;
  if (!want) { // primer puerto libre
    for (var i = 0; i < sel.options.length; i++) if (!sel.options[i].disabled) { sel.value = sel.options[i].value; break; }
  }
}
export function egOpen(sId, tId) {
  S.EG = { s: sId, t: tId };
  var A = S.byId[sId], B = S.byId[tId];
  var t = document.getElementById('eg_t'), sub = document.getElementById('eg_sub');
  if (t) t.textContent = 'Cambiar conexión';
  if (sub) sub.textContent = (A ? A.nombre : '?') + '  ⇄  ' + (B ? B.nombre : '?')
    + '. Cambia el equipo o el puerto de cada extremo.';
  var a = document.getElementById('eg_a'), b = document.getElementById('eg_b');
  if (a) a.innerHTML = '<option value="' + sId + '">' + escAttr(A ? A.nombre : '?') + '</option>';
  if (b) b.innerHTML = '<option value="' + tId + '">' + escAttr(B ? B.nombre : '?') + '</option>';
  egFillDevs();
  egFillPorts('a'); egFillPorts('b');
  document.getElementById('egm').classList.add('on');
}
export function egClose() { document.getElementById('egm').classList.remove('on'); }
export function egSave() {
  var a = document.getElementById('eg_a').value, b = document.getElementById('eg_b').value;
  var pa = parseInt(document.getElementById('eg_pa').value, 10) || 0;
  var pb = parseInt(document.getElementById('eg_pb').value, 10) || 0;
  if (!a || !b) { alert('Elige los dos equipos.'); return; }
  if (a === b) { alert('Los dos extremos no pueden ser el mismo equipo.'); return; }
  if (!pa || !pb) { alert('Elige los dos puertos.'); return; }
  var old = egEdgeOf(S.EG.s, S.EG.t);
  if (old) keepRoute(old);
  snap();
  // liberar los puertos nuevos si los ocupaba otro enlace
  S.doc.edges = S.doc.edges.filter(function (e) {
    if (e === old) return true;
    return !((e.s === a && e.pA === pa) || (e.t === a && e.pB === pa) ||
             (e.s === b && e.pA === pb) || (e.t === b && e.pB === pb));
  });
  var keep = null, flip = false;
  if (old) {
    var oS = old.s, oT = old.t;
    if (a === oS && b === oT) { keep = old; }
    else if (a === oT && b === oS) { keep = old; flip = true; }
    else if (a === oS) { keep = old; }          // cambia el extremo t
    else if (b === oT) { keep = old; }          // cambia el extremo s
    else if (a === oT) { keep = old; flip = true; }  // A tenia el extremo t: se da la vuelta
    else if (b === oS) { keep = old; flip = true; }
  }
  if (keep) {
    // se conserva el trazado (puntos, color, etiqueta...) y solo cambia (o se mueve) el extremo
    if (flip && Array.isArray(keep.pts) && keep.pts.length) keep.pts = keep.pts.slice().reverse();
    if (flip) { keep.s = b; keep.t = a; keep.pA = pb; keep.pB = pa; }
    else { keep.s = a; keep.t = b; keep.pA = pa; keep.pB = pb; }
    var hsk = hostOf(a, b); keep.h = hsk.id;
    try { syncRackPort(keep); } catch (_) {}
  } else {
    var hs = hostOf(a, b);
    var e2 = { s: a, t: b, h: hs.id, port: 0, pA: pa, pB: pb };
    if (old) { // los dos extremos son nuevos: se copian color, categoria, etiqueta y trazado
      if (old.color) e2.color = old.color;
      if (old.cat) e2.cat = old.cat;
      if (old.etq) e2.etq = old.etq;
      if (old.net) e2.net = old.net;
      if (Array.isArray(old.pts) && old.pts.length) e2.pts = old.pts.slice();
    }
    S.doc.edges.push(e2); try { syncRackPort(e2); } catch (_) {}
  }
  save(); rebuild(); render(); renderList(); renderArmarios(); showDetail(); egClose();
}
export function egDel() {
  var old = egEdgeOf(S.EG.s, S.EG.t);
  if (old) { snap(); S.doc.edges = S.doc.edges.filter(function (e) { return e !== old; }); }
  save(); rebuild(); render(); renderList(); renderArmarios(); showDetail(); egClose();
}
(function () {
  var ok = document.getElementById('eg_ok'); if (ok) ok.onclick = egSave;
  var dl = document.getElementById('eg_del'); if (dl) dl.onclick = egDel;
  var cx = document.getElementById('eg_cancel'); if (cx) cx.onclick = egClose;
  ['a', 'b'].forEach(function (side) {
    var d = document.getElementById('eg_' + side);
    if (d) d.onchange = function () { egFillDevs(); egFillPorts('a'); egFillPorts('b'); };
  });
})();
