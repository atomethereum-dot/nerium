# Herramientas

## `montar_home.py`

Cada vez que llega un diseño nuevo de `index.html`, este script coge la cabecera
del publicado y el cuerpo del subido, y le repone encima las siete cosas que se
hicieron aquí y el archivo nuevo no trae. Se ejecuta así:

```
python3 herramientas/montar_home.py /ruta/al/index.html/subido
```

Escribe directamente sobre `index.html`. Si alguna de las piezas que busca ya no
está en el diseño nuevo, falla con un `assert` en vez de dejar el archivo a
medias: es preferible que pare a que la web se publique sin el suelo del HUD.

`bloque_css.txt` y `bloque_traductor.txt` son dos de esas piezas, guardadas
aparte porque son largas.

`seedround.py` es otra: el cambio de «Whitelist» a «Seed Round», en inglés y en
los doce idiomas. Está aparte porque hay que aplicarlo a cada archivo nuevo —el
bloque de traducciones viaja dentro del index.html que se sube, así que un
diseño nuevo vuelve a traer el texto viejo—. Es idempotente: pasarlo sobre algo
ya convertido no hace nada.

El whitepaper no tiene script de montaje: si llega uno nuevo, el cambio hay que
rehacerlo a mano, y `probar_seed.mjs` avisa si se olvidó.

## `probar_dapp.mjs` y `probar_estados.mjs`

Prueban `assets/dapp.js` contra una cadena y una cartera simuladas. No tocan las
redes de verdad: montan un servidor local con la web, interceptan `fetch` para
responder a los `eth_call` con valores conocidos y anuncian una cartera falsa
por EIP-6963.

```
node herramientas/probar_dapp.mjs      # 26 comprobaciones del flujo de compra
node herramientas/probar_estados.mjs   # los cinco estados de la ronda
node herramientas/probar_wc.mjs        # el modal de carteras, el QR y el movil
node herramientas/probar_panel.mjs     # lo que ve el comprador de su posicion
node herramientas/probar_barra.mjs     # la recaudacion: privada + cadena
node herramientas/probar_vista.mjs     # importe vacio, logos y volver a la seccion
node herramientas/probar_seed.mjs      # que no quede ni un «whitelist» en ningun idioma
node herramientas/probar_salto.mjs     # que el documento no cambie de alto al recorrerlo
node herramientas/probar_rejilla.mjs   # que la lista de carteras salga pareja y centrada
node herramientas/probar_volver.mjs    # el camino de vuelta a la cartera al firmar
node herramientas/probar_iconos.mjs    # que ningun favicon declarado falte
```

`probar_wc.mjs` simula también el registro de carteras de WalletConnect y el SDK,
así que cubre el modal entero sin salir a la red: la lista con logos, el
buscador, el QR de escritorio, el enlace a la app en móvil y qué se ve cuando
el registro o el SDK no responden.

`probar_dapp.mjs` comprueba lo que de verdad importa: que el `value` en wei, el
`minTokensOut` y los datos del `approve` y del `buyWithUsdt` son exactamente los
esperados. Un fallo ahí es dinero mal enviado, así que conviene ejecutarlo
después de tocar cualquier cosa del cálculo.

## `assets/walletconnect.js` — cómo se rehace

No se puede usar el UMD que publica WalletConnect: deja su objeto en
`window["@walletconnect/ethereum-provider"]` y no en `window.EthereumProvider`,
y además espera `viem`, `bs58` y `lit` como globales del navegador, que no
existen. Hay que compilarlo con todo dentro:

```
mkdir wc && cd wc && npm init -y
npm i @walletconnect/ethereum-provider@2.24.0 esbuild
cat > entrada.js <<'EOF'
import { EthereumProvider } from '@walletconnect/ethereum-provider';
window.NereumWC = { EthereumProvider: EthereumProvider };
EOF
./node_modules/.bin/esbuild entrada.js --bundle --format=iife --platform=browser \
  --target=es2020 --minify --legal-comments=none \
  --define:process.env.NODE_ENV='"production"' --outfile=../assets/walletconnect.js
```

Son 2 MB (577 KB comprimidos) y solo se descargan cuando alguien pulsa
WalletConnect. `probar_bundle.mjs` comprueba que el archivo compilado expone un
proveedor con `init`, `on`, `connect` y `request`, y `probar_wc.mjs` lo carga
sobre la web de verdad: esa es la comprobación que habría cazado el fallo del
nombre del global.

## `logo/` — de dónde salen los iconos

`logo/origen.png` es el render que llegó del cubo. `logo/logo.py` lo reconstruye
como vector: se midieron sobre el render el giro de la cara (17,1°), la altura
de la banda blanca (18 % inferior), el grosor del canto y la rampa de la plata.
`logo/generar.py` lo rasteriza a todos los tamaños y escribe el `.ico`.

```
cd herramientas/logo && python3 logo.py && python3 generar.py
```

Por debajo de 48 px se usa una variante sencilla, sin brillo ni matices del
degradado: a ese tamaño esos detalles son ruido y el icono se lee peor con ellos
que sin ellos. El `.ico` no se hace reduciendo el de 256: cada tamaño se dibuja
desde el vector, que es la diferencia entre un favicon nítido y uno pastoso.

## `orden.mjs`, `medir.mjs` y `salto.mjs`

No prueban nada: miden. `orden.mjs` recorre las secciones llevando cada una a
pantalla y da su alto real, el de su caja de contenido y su relleno —que es lo
que hay que saber para poner un `contain-intrinsic-size` que no mienta—.
`medir.mjs` hace lo mismo a varios anchos. `salto.mjs` baja la página a saltos
y dice qué sección cambia de alto en cada momento y cuánto se mueve el
documento: es lo que localiza un tirón del scroll.

`prensa.mjs` sigue a una sola sección bajando y subiendo, que es como se aisló
el caso de la de prensa.

Si llega un diseño nuevo con secciones distintas, hay que volver a pasarlos y
actualizar las cifras de `bloque_css.txt`. Ojo con los selectores: tres
secciones comparten la clase `paper`, así que van con `section.` delante para
que no se pisen entre ellas.

Necesitan Playwright. Si el Chromium del sistema no coincide con la versión que
espera, hay que pasarle `executablePath`.
