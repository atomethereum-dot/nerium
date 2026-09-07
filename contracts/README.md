# Nereum Seed Round

Cobra en la moneda nativa de la cadena o en USDT. El mismo código sirve en
Ethereum (ETH + USDT) y en BNB Chain (BNB + USDT).

**El precio se fija en dólares, uno solo.** El contrato consulta a los oráculos
cuánto vale ETH o BNB en cada compra, así que 0,20 $ siguen siendo 0,20 $ aunque
la moneda se mueva. Y como el precio vive en dólares, **el mismo número vale
para las dos redes**: no hay que acordarse de que USDT tiene 6 decimales en
Ethereum y 18 en BNB Chain.

## Funciones

**Administración (solo el dueño)**

| Función | Qué hace |
|---|---|
| `setPriceUsd(precio)` | Precio de un token en dólares, 8 decimales. 0,20 $ = `20000000` |
| `setMinBuyUsd(min)` | Compra mínima en dólares. 0,20 $ = `20000000` |
| `setMaxBuyUsd(max)` | Tope por cartera. 10.000 $ = `1000000000000`. Cero = sin tope |
| `startRound(inicio, fin)` | Abre la ventana. Cero = ahora. Solo una vez |
| `endRound()` | Cierra antes de tiempo. Sin vuelta atrás |
| `setHardCap(tokens)` | Tope total. Cero = sin tope |
| `setMaxPriceAge(segundos)` | A partir de aquí se descarta un oráculo. Por defecto 24 h |
| `setFeeds([...])` | Reemplaza la lista de oráculos, en orden de preferencia |
| `pause()` / `unpause()` | Detiene compras sin cerrar la venta |
| `withdrawNative(a, importe)` | Retira ETH/BNB. Cero = todo |
| `withdrawUsdt(a, importe)` | Retira USDT. Cero = todo |
| `setSaleToken(token)` | Fija el NRM cuando exista. Solo una vez |
| `openClaims()` | Abre el reparto. Exige ronda terminada y tokens depositados |
| `withdrawUnsoldTokens(a, importe)` | Solo el excedente sobre lo debido |
| `rescueForeignToken(...)` | Recupera tokens enviados por error |

**Público**

| Función | Qué hace |
|---|---|
| `buyWithNative(minTokens)` | Compra con ETH/BNB |
| `buyWithUsdt(importe, minTokens)` | Compra con USDT |
| `claim()` | Retira sus tokens cuando el reparto está abierto |
| `quoteNative(wei)` / `quoteUsdt(importe)` | Cuántos tokens saldrían |
| `nativeForUsd(usd)` | Cuánto ETH son X dólares. Para pintar la web |
| `nativeUsdPrice()` | Cotización actual y si viene de un oráculo vivo |
| `feedsStatus()` | Estado de cada oráculo: cuál está sano y a qué precio |
| `feedCount()` | Cuántos oráculos hay configurados |
| `isLive()` / `isOver()` | Estado |
| `spentUsd(x)` | Lo gastado por esa cartera, en dólares con 8 decimales |
| `remainingAllowanceUsd(x)` | Lo que le queda antes de topar. Para pintar la web |
| `allocation(x)` / `claimable(x)` / `remainingTokens()` | Consulta |

## Despliegue

```
constructor(
  IERC20 usdt, AggregatorV3Interface[] oraculos, uint8 decimalesDelToken, address dueño,
  uint256 precioUsd,   // 0,20 $  →  20000000
  uint256 minimoUsd,   // 0,20 $  →  20000000
  uint256 maximoUsd    // 10.000 $ →  1000000000000   (cero = sin tope)
)
```

**La economía entra al desplegar**, no en llamadas sueltas después: así no
existe el momento en que el contrato está desplegado pero a medio configurar.
Los setters siguen ahí para corregir en marcha.

Los oráculos van **en orden de preferencia**. Pon al menos dos, y de proveedores
distintos: dos oráculos del mismo proveedor caen juntos.

| Red | USDT | Oráculo principal |
|---|---|---|
| Ethereum | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | Chainlink ETH/USD `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| BNB Chain | `0x55d398326f99059fF775485246999027B3197955` | Chainlink BNB/USD `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` |

Como segundo y tercero sirve cualquier proveedor que exponga la interfaz de
Chainlink: **API3, RedStone, Pyth o Band** a través de sus adaptadores. Busca sus
direcciones para ETH/USD y BNB/USD en la documentación de cada uno.

**Verifica todas las direcciones antes de desplegar.** Un oráculo equivocado es
un contrato vendiendo a un precio inventado. El constructor exige que al menos
uno responda en ese momento, así que una dirección muerta se detecta al
desplegar, pero una dirección viva del par equivocado no.

## Despliegue en una orden

```
cp .env.ejemplo .env        # y rellénalo
npm install
npx hardhat run scripts/desplegar.js --network ethereum
DIRECCION_ESPERADA=0x…  npx hardhat run scripts/desplegar.js --network bsc
```

### La misma dirección en las dos redes

La dirección de un contrato **no sale de su código**: sale de quién lo despliega
y de su *nonce*, o sea de cuántas transacciones ha enviado esa cartera en esa
cadena. Con la misma cartera y el mismo nonce en Ethereum y en BNB Chain, el
contrato cae en **la misma dirección en las dos** — y da igual que el USDT y el
oráculo de cada red sean distintos, porque los argumentos del constructor no
entran en el cálculo.

Por eso el script **exige nonce 0 y aborta si no lo es**. Los pasos:

1. Crea una cartera **nueva**, que no haya enviado nada nunca.
2. Mándale gas en las dos redes. Recibir no gasta nonce; solo gastan las
   transacciones que ella envía.
3. Despliega en Ethereum. El script imprime la dirección.
4. Despliega en BNB Chain pasando esa dirección en `DIRECCION_ESPERADA`. El
   script calcula la que va a salir **antes de gastar gas** y aborta si no
   coincide.

Si algo obliga a salir de cero, `NONCE_EXIGIDO=<n>` fija otro valor — pero tiene
que ser el mismo en las dos redes.

El script **verifica los oráculos antes de desplegar** y aborta sin gastar gas
si alguno no cuadra. Comprueba, para cada uno:

| Comprobación | Qué error caza |
|---|---|
| Hay contrato en esa dirección | Una errata al copiar |
| Responde a `description()`, `decimals()`, `latestRoundData()` | No es un oráculo |
| `description()` es exactamente el par esperado | **Un oráculo vivo del par equivocado** |
| El precio cae en una banda razonable | Lo mismo, por si `description` engaña |
| El dato tiene menos de 24 h | El oráculo está parado |
| El precio es positivo | Oráculo roto |

La tercera y la cuarta son las que importan: una dirección viva de BTC/USD en
lugar de ETH/USD no se ve a ojo y haría vender los NRM al 3% de su precio. El
script lo detecta antes de que exista el contrato.

Tras desplegar imprime el precio, el mínimo y el tope que quedaron escritos, y
te dice qué queda por hacer.

### Añadir un segundo oráculo

El script viene con Chainlink, que es el más asentado. Para añadir un segundo
proveedor —API3, RedStone o Pyth con adaptador— mete su dirección en `oraculos`
dentro de `scripts/desplegar.js`, DESPUÉS de la de Chainlink. La verificación se
aplica igual.

Si ya has desplegado, no hace falta redesplegar: `setFeeds([chainlink, otro])`
actualiza la lista sobre la marcha.

## Orden de uso

1. Desplegar con `precio = 20000000`, `mínimo = 20000000` y
   `máximo = 1000000000000`. **La propiedad se queda en la cartera que
   despliega**; pasarla a un multisig es opcional y se hace cuando se decida,
   con `transferOwnership` y `acceptOwnership` desde el multisig.
2. `setHardCap(...)` si quieres además un tope total de tokens.
3. `startRound(0, fin)`.
5. La gente compra. `withdrawNative` / `withdrawUsdt` cuando haga falta.
6. `endRound()` o esperar a la fecha.
7. `setSaleToken(NRM)`, transferir al contrato al menos `totalTokensSold`,
   y `openClaims()`.
8. Cada comprador llama a `claim()`.

## Decisiones que conviene entender

**El reparto solo se abre con la ronda terminada.** `openClaims()` revierte si
la venta sigue viva, y además exige que el contrato ya tenga depositado todo lo
vendido: nadie debe poder reclamar contra un saldo insuficiente y dejar sin nada
al último.

**El comprador va protegido.** Cada compra lleva un mínimo de tokens que acepta.
Si el oráculo se mueve o cambias el precio entre que ve la cotización y se mina
su transacción, revierte en vez de darle de menos. La web debe llamar a
`quoteNative` / `quoteUsdt` y enviar ese número con un margen.

**LA VENTA NO SE PARA NUNCA, y sin que nadie tenga que intervenir.** El precio
no cuelga de un oráculo sino de varios. El contrato pregunta al primero de la
lista; si no responde, o responde cero, o su dato tiene más de `maxPriceAge`,
pasa al siguiente. Cada llamada va en `try/catch`, así que un oráculo pausado,
migrado o retirado solo significa "prueba el siguiente".

Que caigan todos a la vez es prácticamente imposible, pero incluso entonces se
cobra con **el último precio bueno que el propio contrato guardó** en la compra
anterior. Nadie tiene que poner nada a mano.

Y en cuanto el preferido se recupera, vuelve solo a usarlo.

**Para vigilarlo sin adivinar:** `feedsStatus()` devuelve, oráculo por oráculo,
si está sano y a qué precio. Y hay dos eventos: `OracleFellBack` cuando se usa
uno que no es el primero, y `AllOraclesDown` —el único que merece una alerta—
cuando ninguno responde.

**USDT se toma como un dólar.** Es lo que hace todo el mundo, pero si USDT
perdiera la paridad, el contrato no se entera.

**El dueño no puede tocar los tokens debidos.** `withdrawUnsoldTokens` solo
alcanza el excedente sobre `totalTokensSold - totalTokensClaimed`.

**Los envíos directos revierten**, porque no llevarían protección de precio.

**USDT de Ethereum no devuelve `bool`.** Todo usa `SafeERC20`; un `IERC20`
normal fallaría en Ethereum.

**El tope por cartera es acumulado y suma las dos monedas.** `spentUsd` cuenta
lo gastado por dirección a lo largo de toda la ronda: no se esquiva partiendo la
compra en trozos ni pagando mitad en ETH y mitad en USDT.

Ahora bien, conviene tener claro qué es y qué no es. **Nadie pasa de 10.000 $ con
una cartera, pero cualquiera puede abrir otra y volver a empezar.** Sirve para
que la venta reparta y para sostener lo que anuncia la web; no es un control de
identidad. Si hace falta limitar por persona de verdad, eso se hace con lista
blanca, y eso es otra cosa.

## Lo que NO tiene

- **Sin reembolso ni mínimo de recaudación.** Si no se llega al objetivo, no hay
  forma de devolver.
- **Sin vesting.** Al abrir el reparto se retira el 100% de golpe.
- **Sin lista blanca.**
- **El dueño puede retirar lo recaudado en cualquier momento**, también con la
  ronda abierta.

## Pruebas

```
npm install
npm test
```

55 casos: 26 del contrato, 16 del Seed Round —precio, mínimo y tope por
cartera—, 6 de la dirección y la propiedad, y 7 de la verificación previa al
despliegue.

El compilador viene fijado en `package.json` (`solc@0.8.24`) y `hardhat.config.js`
lo toma de ahí en vez de descargarlo, así que la compilación sale igual en
cualquier máquina y no depende de que el repositorio de binarios esté accesible.

Los del contrato, entre otros: que el precio siga al dólar cuando ETH sube o baja, que
**la venta siga con el primer oráculo rancio, con los dos primeros caídos, con
uno reventando entero, y con LOS TRES caídos a la vez**, que vuelva sola al
preferido cuando se recupera, que `feedsStatus` señale cuál falla, que el
reparto no se abra antes de terminar la ronda, la protección del comprador, y
que el dueño no pueda tocar los tokens de los compradores.

Los del Seed Round comprueban los números que anuncia la web: que a 0,20 $ el
token 1 ETH de 3.000 $ da 15.000 NRM, que 0,19 $ se rechaza y 0,20 $ pasa, que se
llega justo a 10.000 $ y el dólar siguiente revierte, que **el tope es acumulado
y suma ETH con USDT**, que bajarlo no anula lo ya comprado, que lo recaudado
llega al contrato y sale a la cartera que se indique, y que en pausa no se
compra.

Los de la dirección fijan la propiedad de la que depende desplegar en dos redes:
que una cartera nueva tiene nonce 0 aunque le manden gas, que el contrato cae
exactamente en la dirección calculada de antemano, que **los argumentos del
constructor no la cambian**, que con el nonce ya gastado deja de coincidir —por
eso el script lo exige— y que la propiedad se queda en el deployer hasta que se
pase a un multisig en dos pasos.

Los de la verificación prueban **la misma función que ejecuta el despliegue**, no
una copia: que acepta un oráculo correcto y que rechaza el par equivocado, un
precio absurdo, un oráculo parado, un precio cero, una dirección sin contrato y
un contrato que no es un oráculo.
