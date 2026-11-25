import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const args = process.argv.slice(2);
const isPublic = args.includes('--public');
const minify = !args.includes('--nominify');

const root = path.resolve('.');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const template = read('src/template.html');
const cssSrc = read('src/styles.css');
// app.js lleva:  const DATA=__DATA__;
const parts = fs.readdirSync(path.join(root, 'src/parts')).filter(f => f.endsWith('.js')).sort();
let appSrc = parts.map(f => read('src/parts/' + f)).join('');

const data = isPublic ? {} : JSON.parse(read('src/data.json'));

// 1) CSS minificado (opcional)
const cssOut = minify
  ? (await esbuild.transform(cssSrc, { loader: 'css', minify: true })).code
  : cssSrc;

// 2) JS: por ahora un unico archivo (script clasico), asi conserva los globos
const jsMin = await esbuild.transform(appSrc, { loader: 'js', minify, target: 'es2019', legalComments: 'none' });
let jsOut = jsMin.code;
jsOut = jsOut.replace('__DATA__', () => JSON.stringify(data));
// seguridad al inlinear dentro de <script>
jsOut = jsOut.replace(/<\/script>/gi, '<\\/script>');

const html = template
  .replace('/*__CSS__*/', () => cssOut)
  .replace('//__JS__', () => jsOut);

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, isPublic ? 'publico.html' : 'mapa.html');
fs.writeFileSync(outFile, html);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log(`${isPublic ? 'PUBLICO' : 'PRIVADO'} -> ${path.relative(root, outFile)}`);
console.log(`  html ${kb(html)} · css ${kb(cssOut)} · js ${kb(jsOut)} · datos ${kb(JSON.stringify(data))}`);
console.log(`  equipos en el seed: ${(data.nodes || []).length}`);
