# Ronda de financiación de Nereum

Cobra en la moneda nativa de la cadena o en USDT. El mismo código sirve en
Ethereum (ETH + USDT) y en BNB Chain (BNB + USDT).

**El precio se fija en dólares, uno solo.** El contrato consulta a los oráculos
cuánto vale ETH o BNB en cada compra, así que 0,10 $ siguen siendo 0,10 $ aunque
la moneda se mueva. Y como el precio vive en dólares, **el mismo número vale
para las dos redes**: no hay que acordarse de que USDT tiene 6 decimales en
Ethereum y 18 en BNB Chain.

## Funciones

**Administración (solo el dueño)**

| Función | Qué hace |
|---|---|
| `setPriceUsd(precio)` | Precio de un token en dólares, 8 decimales. 0,10 $ = `10000000` |
| `setMinBuyUsd(min)` | Compra mínima en dólares. 1 $ = `100000000` |
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
| `allocation(x)` / `claimable(x)` / `remainingTokens()` | Consulta |

## Despliegue

```
constructor(IERC20 usdt, AggregatorV3Interface[] oraculos, uint8 decimalesDelToken, address dueño)
```

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
npx hardhat run scripts/desplegar.js --network bsc
```

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

Tras desplegar deja el precio en 0,10 $ y el mínimo en 1 $, y te dice qué queda
por hacer.

### Añadir un segundo oráculo

El script viene con Chainlink, que es el más asentado. Para añadir un segundo
proveedor —API3, RedStone o Pyth con adaptador— mete su dirección en `oraculos`
dentro de `scripts/desplegar.js`, DESPUÉS de la de Chainlink. La verificación se
aplica igual.

Si ya has desplegado, no hace falta redesplegar: `setFeeds([chainlink, otro])`
actualiza la lista sobre la marcha.

## Orden de uso

1. Desplegar. El dueño debe ser **un multisig**.
2. `setPriceUsd(10000000)` — 0,10 $, el precio que anuncia la web.
3. `setMinBuyUsd(100000000)` — 1 $, y `setHardCap(...)` si quieres tope.
4. `startRound(0, fin)`.
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

## Lo que NO tiene

- **Sin tope por cartera.** La web anuncia «máximo 10.000 $ por cartera» y el
  contrato no lo impone. Hay que añadirlo o quitarlo de la web.
- **Sin reembolso ni mínimo de recaudación.** Si no se llega al objetivo, no hay
  forma de devolver.
- **Sin vesting.** Al abrir el reparto se retira el 100% de golpe.
- **Sin lista blanca.**
- **El dueño puede retirar lo recaudado en cualquier momento**, también con la
  ronda abierta.

## Pruebas

```
npm install --save-dev hardhat@2 "@nomicfoundation/hardhat-toolbox@hh2" \
                       solc@0.8.24 @openzeppelin/contracts@5.0.2
npx hardhat test
```

33 casos, 26 del contrato y 7 de la verificación previa al despliegue.

Los del contrato, entre otros: que el precio siga al dólar cuando ETH sube o baja, que
**la venta siga con el primer oráculo rancio, con los dos primeros caídos, con
uno reventando entero, y con LOS TRES caídos a la vez**, que vuelva sola al
preferido cuando se recupera, que `feedsStatus` señale cuál falla, que el
reparto no se abra antes de terminar la ronda, la protección del comprador, y
que el dueño no pueda tocar los tokens de los compradores.

Los de la verificación prueban **la misma función que ejecuta el despliegue**, no
una copia: que acepta un oráculo correcto y que rechaza el par equivocado, un
precio absurdo, un oráculo parado, un precio cero, una dirección sin contrato y
un contrato que no es un oráculo.
