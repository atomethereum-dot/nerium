# Portada 3D del DEX

`escena.src.js` es el código de la escena de la portada de `/app` (ciudad, torre
y monedas). Se publica empaquetado con three.js 0.186.1
(MIT) en `app/portada/escena.js`:

```
npm i esbuild three@0.186.1
npx esbuild herramientas/portada/escena.src.js --bundle --format=esm --minify \
  --target=es2020 --legal-comments=eof --outfile=app/portada/escena.js
```

La app la pide con `import()` solo al abrir la portada; recibe el precio en vivo
que ya carga el DEX (`datos.BTC`).
