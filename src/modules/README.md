# Módulos del editor

El editor se escribe en **módulos ES** y `build.mjs` los empaqueta con esbuild en un único
`<script>` dentro de un HTML autocontenido (sin red, sin dependencias).

## Estado compartido

`00-store.js` exporta el objeto **`S`**, dueño de todo lo mutable:

- `S.doc` — documento del mapa (nodos, enlaces, zonas, redes…)
- `S.nodes`, `S.edges`, `S.byId`, `S.adj` — índices derivados de `S.doc` (los rehace `rebuild()`)
- `S.zonas`, `S.hist` — zonas calculadas e historial de deshacer
- `S.DUPI`, `S.DUPS`, `S.PROJ`, `S.PHOST`, `S.LN`, `S.PPX`, `S.NETS`, `S.NT`, `S.arrowSel`,
  `S.pan`, `S.drag`, `S.ndrag`, `S.adrag`, … — estado efímero de interfaz (arrastres, modales)

Se escribe siempre como `S.doc`, `S.nodes`… para que la reasignación funcione entre módulos
(las importaciones de un módulo son de solo lectura).

`dom.js` exporta las referencias al DOM (`svg`, `world`, `G`, `GH`, `GN`, `GL`, `GE`, `GX`,
`tip`, `t` — transformación actual, `RACK`). No importa nada: así siempre está inicializado
antes que cualquier módulo que lo use, aunque haya ciclos de importación.

## Orden de los módulos

| Módulo | Responsabilidad |
|---|---|
| `00-store.js` | objeto `S` con el estado mutable |
| `dom.js` | referencias al DOM y transformación de la vista |
| `01-base.js` | `DATA`, `TYPE`, `NETCOL`, `state`, copias de seguridad |
| `02-modelo.js` | `rebuild()`, `capFor()`, utilidades de modelo, índice de proyectos |
| `03-layout.js` | zonas (`ZBOX`), `layout()`, guardar/restaurar disposición |
| `04a-geometria.js` | matemáticas, `applyT()`, colores, iconos |
| `04b-render-mapa.js` | dibujo del mapa (`render()`), lista lateral |
| `04c-ficha-formularios.js` | ficha del equipo y formularios de alta/edición |
| `05-mutaciones.js` | alta/baja de equipos y enlaces, deshacer |
| `06-interaccion.js` | ratón: arrastrar, seleccionar, atajos de teclado |
| `07-ui.js` | barra, menús, paneles |
| `08-rack.js` / `08b-armarios.js` | vista de armario, equipos, patch y bandejas |
| `08c-conexiones.js` | modales de conexión, patch y bandeja |
| `09-zonas.js` | utilidades de zonas |
| `10a…10g` | ruta/revisión, imagen, redes, notas, flechas, proyectos, ping |
| `11-init.js` | arranque |
| `12-touch.js` | táctil y pinza |

`main.js` los importa en ese orden y ejecuta el arranque.

## Reglas al editar

- No añadir `document.getElementById` a nivel de módulo salvo en `dom.js`.
- Cualquier variable que se reasigne desde varios módulos va en `S`.
- El seed (`src/data.json`) se inyecta como `DATA` al compilar: la versión pública se
  construye con `--public` y sale vacía.
- Tras tocar código: `npm run build && npm run check`.
