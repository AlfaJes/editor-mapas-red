# Editor de mapas de red

Editor de mapas de red en un único archivo HTML, sin dependencias ni instalación. Funciona en cualquier navegador y guarda los proyectos **en el propio navegador**.

**App publicada:** https://alfajes.github.io/editor-mapas-red/

## Qué incluye

- Equipos con nombre, IP (varias, incluso en subredes distintas), MAC, modelo, ubicación, SO, puertos, periféricos y notas.
- 15 tipos de equipo con icono y color propios: PC, switch, router, firewall, servidor, NAS, Wi-Fi, grabadora, máquina, CNC, PLC, impresora, cámara, SAI y otro. El icono se puede sobrescribir por equipo.
- Zonas o secciones: crear, renombrar, redimensionar, mover, anidar (zona padre) y borrar. No deja borrar una zona con equipos dentro; hay un botón para mover los equipos a otra zona y luego borrarla.
- Enlaces entre equipos con puerto asignado, color, etiqueta, visibilidad y trazado curvo / recto / ortogonal, con varios puntos de control.
- Cajones de texto y flechas, ambas movibles; las flechas se pueden anclar a equipos y los siguen.
- Vista de rack con los equipos ordenados por el puerto al que están conectados.
- Inventario de puertos por equipo (tipo, velocidad, nota y qué hay conectado en cada boca).
- Rejilla con ajuste, multiselección, deshacer, búsqueda y filtros por tipo, zona y red.
- Revisión de inventario: IPs duplicadas, MACs repetidas, datos que faltan.
- Exportar a PNG, PDF (A4 horizontal), JSON y HTML con los datos dentro.

## Privacidad y datos

- No hay servidor ni cuentas: cada navegador guarda sus mapas en `localStorage`.
- El repositorio se publica **sin datos**: la app arranca con un mapa vacío.
- Para mover un mapa entre equipos: **⋯ → Guardar copia (HTML)**, que genera un archivo autónomo con el editor y los datos.

## Atajos

- `Ctrl+Z` deshacer · `Supr` borrar el equipo seleccionado
- Rueda: zoom · arrastrar el fondo: desplazar
- Doble clic en el título de una sección: renombrarla

## Uso local

Abre `index.html` en el navegador. Para que el guardado automático funcione de forma fiable, sírvelo por HTTP:

```bash
python3 -m http.server 8099
```

## Desarrollo

El editor se construye desde `src/` y el resultado es **un único HTML** autosuficiente.

```
src/template.html   estructura (head, cuerpo, diálogos)
src/styles.css      estilos
src/parts/*.js      código, por áreas (base, modelo, layout, render, interacción, UI, rack, zonas, ruta/export, init)
src/data.json       mapa real (NO se publica; está en .gitignore)
build.mjs           empaqueta y minifica en un solo archivo
```

```bash
npm install
npm run build          # dist/mapa.html   (privado, con tus datos)
npm run build:public   # dist/publico.html (vacío, para publicar)
npm run build:all
```

Para desplegar: `dist/publico.html` → `index.html` del repo (GitHub Pages) y del servidor local.
