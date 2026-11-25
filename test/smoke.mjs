// Comprobacion rapida del HTML generado, sin dependencias externas:
// abre el archivo con Chromium headless y cuenta lo que hay dibujado.
// Uso: node test/smoke.mjs [archivo] [equiposEsperados]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'dist/mapa.html';
const expectNodes = process.argv.length > 3 ? Number(process.argv[3]) : 55;
const abs = path.resolve(file);
if (!existsSync(abs)) { console.error('No existe ' + abs); process.exit(2); }

const chrome = ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p));
if (!chrome) { console.error('Chromium no encontrado'); process.exit(2); }

const args = [
  '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--virtual-time-budget=4000', '--dump-dom', 'file://' + abs,
];
const dom = execFileSync(chrome, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const live = dom.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');
const count = (re) => (live.match(re) || []).length;
const full = expectNodes > 0;
const checks = [
  ['equipos dibujados', count(/class="node(?: |")/g), full ? expectNodes : 0],
  ['enlaces dibujados', count(/class="edge(?: |")/g), full ? 21 : 0],
  ['puntos de conexion', count(/class="epin"/g), full ? 42 : 0],
  ['secciones', count(/class="hull(?: |")/g), full ? 9 : 0],
];

let bad = 0;
for (const [name, got, want] of checks) {
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? 'OK   ' : 'FALLO') + ' ' + name + ': ' + got + ' (esperado ' + want + ')');
}
if (!/MAPA DE RED/.test(dom)) { console.log('FALLO titulo'); bad++; }

// La version publica no debe llevar datos del mapa dentro
const html = readFileSync(abs, 'utf8');
const iData = html.indexOf('const DATA=');
const tail = iData >= 0 ? html.slice(iData + 11, iData + 60).trimStart() : '';
const dataM = iData >= 0 ? [null, tail] : null;
if (!full) {
  const vacio = !!dataM && dataM[1].startsWith('{}');
  console.log((vacio ? 'OK   ' : 'FALLO') + ' version publica sin datos: ' + (vacio ? 'si' : 'NO'));
  if (!vacio) bad++;
} else {
  const conDatos = /"nodes"\s*:\s*\[\s*\{/.test(html);
  console.log((conDatos ? 'OK   ' : 'FALLO') + ' version privada con datos: ' + (conDatos ? 'si' : 'NO'));
  if (!conDatos) bad++;
}

console.log(bad ? bad + ' comprobacion(es) fallidas' : 'Todo correcto');
process.exit(bad ? 1 : 0);
