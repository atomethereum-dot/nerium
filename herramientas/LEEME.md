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
node herramientas/probar_vista.mjs     # importe vacio y volver a la seccion al recargar
```

`probar_wc.mjs` simula también el registro de carteras de WalletConnect y el SDK,
así que cubre el modal entero sin salir a la red: la lista con logos, el
buscador, el QR de escritorio, el enlace a la app en móvil y qué se ve cuando
el registro o el SDK no responden.

`probar_dapp.mjs` comprueba lo que de verdad importa: que el `value` en wei, el
`minTokensOut` y los datos del `approve` y del `buyWithUsdt` son exactamente los
esperados. Un fallo ahí es dinero mal enviado, así que conviene ejecutarlo
después de tocar cualquier cosa del cálculo.

Necesitan Playwright. Si el Chromium del sistema no coincide con la versión que
espera, hay que pasarle `executablePath`.
