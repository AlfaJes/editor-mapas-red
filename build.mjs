import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

// Compila el editor a un unico HTML autocontenido.
//   node build.mjs            -> dist/mapa.html    (version privada, con datos)
//   node build.mjs --public   -> dist/publico.html (version publica, vacia)
//   --nominify                -> sin minificar (para depurar)
const args = process.argv.slice(2);
const isPublic = args.includes('--public');
const minify = !args.includes('--nominify');

const root = path.resolve('.');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const template = read('src/template.html');
const cssSrc = read('src/styles.css');
// 01-base.js contiene:  export const DATA=__DATA__;
const data = isPublic ? {} : JSON.parse(read('src/data.json'));

// 1) CSS
const cssOut = minify
  ? (await esbuild.transform(cssSrc, { loader: 'css', minify: true })).code
  : cssSrc;

// 2) JS: modulos ES de src/modules empaquetados en un solo bloque
const jsBuild = await esbuild.build({
  entryPoints: [path.join(root, 'src/modules/main.js')],
  bundle: true, write: false, format: 'iife', target: 'es2019',
  minify, legalComments: 'none',
});
let jsOut = jsBuild.outputFiles[0].text;
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
