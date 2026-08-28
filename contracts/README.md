# Preventa de Nereum

Cobra en la moneda nativa de la cadena o en USDT. El mismo código sirve en
Ethereum (ETH + USDT) y en BNB Chain (BNB + USDT).

**El precio se fija en dólares, uno solo.** El contrato consulta a Chainlink
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
| `startPresale(inicio, fin)` | Abre la ventana. Cero = ahora. Solo una vez |
| `endPresale()` | Cierra antes de tiempo. Sin vuelta atrás |
| `setHardCap(tokens)` | Tope total. Cero = sin tope |
| `setMaxPriceAge(segundos)` | Antigüedad máxima del precio del oráculo. Por defecto 1 hora |
| `pause()` / `unpause()` | Detiene compras sin cerrar la venta |
| `withdrawNative(a, importe)` | Retira ETH/BNB. Cero = todo |
| `withdrawUsdt(a, importe)` | Retira USDT. Cero = todo |
| `setSaleToken(token)` | Fija el NRM cuando exista. Solo una vez |
| `openClaims()` | Abre el reparto. Exige preventa terminada y tokens depositados |
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
| `nativeUsdPrice()` | Cotización actual del oráculo |
| `isLive()` / `isOver()` | Estado |
| `allocation(x)` / `claimable(x)` / `remainingTokens()` | Consulta |

## Despliegue

```
constructor(IERC20 usdt, AggregatorV3Interface feed, uint8 decimalesDelToken, address dueño)
```

| Red | USDT | Oráculo |
|---|---|---|
| Ethereum | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | ETH/USD `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| BNB Chain | `0x55d398326f99059fF775485246999027B3197955` | BNB/USD `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` |

**Verifica esas direcciones en docs.chain.link antes de desplegar.** Un oráculo
equivocado es un contrato que vende a un precio inventado.

## Orden de uso

1. Desplegar. El dueño debe ser **un multisig**.
2. `setPriceUsd(10000000)` — 0,10 $, el precio que anuncia la web.
3. `setMinBuyUsd(100000000)` — 1 $, y `setHardCap(...)` si quieres tope.
4. `startPresale(0, fin)`.
5. La gente compra. `withdrawNative` / `withdrawUsdt` cuando haga falta.
6. `endPresale()` o esperar a la fecha.
7. `setSaleToken(NRM)`, transferir al contrato al menos `totalTokensSold`,
   y `openClaims()`.
8. Cada comprador llama a `claim()`.

## Decisiones que conviene entender

**El reparto solo se abre con la preventa terminada.** `openClaims()` revierte si
la venta sigue viva, y además exige que el contrato ya tenga depositado todo lo
vendido: nadie debe poder reclamar contra un saldo insuficiente y dejar sin nada
al último.

**El comprador va protegido.** Cada compra lleva un mínimo de tokens que acepta.
Si el oráculo se mueve o cambias el precio entre que ve la cotización y se mina
su transacción, revierte en vez de darle de menos. La web debe llamar a
`quoteNative` / `quoteUsdt` y enviar ese número con un margen.

**Si el oráculo se queda atascado, las compras en ETH/BNB revierten.** Es
deliberado: mejor no vender que vender a una cotización rancia. Las compras en
USDT siguen funcionando, porque no dependen del oráculo.

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
  preventa abierta.

## Pruebas

```
npm install --save-dev hardhat@2 "@nomicfoundation/hardhat-toolbox@hh2" \
                       solc@0.8.24 @openzeppelin/contracts@5.0.2
npx hardhat test
```

21 casos. Entre ellos: que el precio siga al dólar cuando ETH sube o baja, que
se rechace un precio de oráculo rancio o negativo, que el reparto no se abra
antes de terminar la preventa, la protección del comprador, y que el dueño no
pueda tocar los tokens de los compradores.
