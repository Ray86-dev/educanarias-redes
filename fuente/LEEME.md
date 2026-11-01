# Fuente de las piezas

No hace falta para usar los materiales: es lo que los genera, por si hay que cambiar un texto o un tamaño y volver
a sacarlos con el mismo estilo.

- `generar.mjs`: banner, foto de perfil, marca de agua, miniaturas, pantalla final, portadas de Shorts, hoja de marca,
  logotipos (SVG y PNG) y la cortinilla. Plantillas HTML que se fotografían con Chromium (Playwright); la cortinilla,
  fotograma a fotograma y montada con ffmpeg. Los textos de las miniaturas de ejemplo están en `SERIES` y `NOVEDAD`.
- `fuentes.py`: tipografías estáticas (`marca/tipografias/`) y el nombre «EduCanarias» en trazos (`wordmark.json`),
  a partir de las fuentes variables de la web (`fonts/`).

```bash
cd fuente
npm install && npx playwright install chromium   # la primera vez
node generar.mjs                                  # todo
node generar.mjs miniaturas                       # solo lo que tenga «miniaturas» en la ruta
pip install fonttools brotli && python fuentes.py # tipografías y wordmark.json (rara vez hace falta)
```

Requisitos: Node 20 o más reciente y ffmpeg (solo para la cortinilla). Las capturas se recortan de las originales de la
app con `CAPTURAS=<carpeta con desktop-*.png> node generar.mjs capturas`.
