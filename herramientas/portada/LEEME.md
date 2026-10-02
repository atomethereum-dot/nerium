# Portada 3D del DEX

`escena.src.js` es el código de la escena de la portada de `/app` (ciudad, torre,
monedas y velas reales de BTC/USDT). Se publica empaquetado con three.js 0.186.1
(MIT) en `app/portada/escena.js`:

```
npm i esbuild three@0.186.1
npx esbuild herramientas/portada/escena.src.js --bundle --format=esm --minify \
  --target=es2020 --legal-comments=eof --outfile=app/portada/escena.js
```

La app la pide con `import()` solo al abrir la portada; recibe las velas y el
precio en vivo que ya carga el DEX (`cvVelas`, `datos.BTC`).
