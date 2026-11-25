// Comprobacion rapida del HTML generado, sin dependencias externas:
// abre el archivo con Chromium headless y cuenta lo que hay dibujado.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'dist/mapa.html';
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
const checks = [
  ['equipos dibujados', count(/class="node(?: |")/g), 55],
  ['enlaces dibujados', count(/class="edge(?: |")/g), 21],
  ['puntos de conexion', count(/class="epin"/g), 42],
  ['secciones', count(/class="hull(?: |")/g), 9],
];

let bad = 0;
for (const [name, got, want] of checks) {
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? 'OK   ' : 'FALLO') + ' ' + name + ': ' + got + ' (esperado ' + want + ')');
}
if (!/MAPA DE RED/.test(dom)) { console.log('FALLO titulo'); bad++; }
console.log(bad ? bad + ' comprobacion(es) fallidas' : 'Todo correcto');
process.exit(bad ? 1 : 0);
