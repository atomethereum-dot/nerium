# Preventa de Nereum

Contrato de preventa que cobra en la moneda nativa de la cadena o en USDT. El
mismo código sirve en Ethereum (ETH + USDT) y en BNB Chain (BNB + USDT): lo
único que cambia son los parámetros del despliegue.

## Qué hace

| Función | Quién | Para qué |
|---|---|---|
| `startPresale(inicio, fin)` | dueño | Abre la ventana. Solo una vez. Exige precios puestos. |
| `endPresale()` | dueño | Cierra antes de tiempo. Sin vuelta atrás. |
| `setPrices(nativo, usdt)` | dueño | Fija los dos precios. |
| `withdrawNative(a, importe)` | dueño | Retira lo recaudado en ETH/BNB. |
| `withdrawUsdt(a, importe)` | dueño | Retira lo recaudado en USDT. |
| `buyWithNative(minTokens)` | cualquiera | Compra pagando en ETH/BNB. |
| `buyWithUsdt(importe, minTokens)` | cualquiera | Compra pagando en USDT. |
| `claim()` | comprador | Retira sus tokens cuando se abre el reparto. |

## Cómo se despliega

El constructor pide tres cosas:

```
constructor(IERC20 usdt, uint8 decimalesDelToken, address dueño)
```

| Red | USDT | Decimales de USDT |
|---|---|---|
| Ethereum | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| BNB Chain | `0x55d398326f99059fF775485246999027B3197955` | 18 |

**Los decimales de USDT no se pasan al constructor pero sí determinan el precio.**
El precio se expresa en unidades mínimas de USDT por UN token entero:

- 1,50 USDT por token en **Ethereum** → `priceUsdt = 1500000` (6 decimales)
- 1,50 USDT por token en **BNB Chain** → `priceUsdt = 1500000000000000000` (18 decimales)

Poner el número de una red en la otra vendería los tokens un billón de veces
más caros o más baratos. Es el error más fácil de cometer aquí.

El precio en moneda nativa va en wei por token entero: 0,0005 ETH → `500000000000000`.

## Orden de uso

1. Desplegar con el USDT de la red y el dueño (**usa un multisig**).
2. `setPrices(...)` y, si quieres, `setHardCap(...)` y `setMinBuy(...)`.
3. `startPresale(0, fin)` — el cero significa "abre ahora".
4. La gente compra. `withdrawNative` y `withdrawUsdt` cuando haga falta.
5. `endPresale()` o esperar a la fecha.
6. Cuando el token exista: `setSaleToken(token)`, transferir al contrato al menos
   `totalTokensSold`, y `openClaims()`.
7. Cada comprador llama a `claim()`.

## Decisiones que conviene entender

**La compra no entrega el token en el acto.** Anota lo que corresponde a cada
dirección y el reparto se abre después. Así la preventa puede empezar antes de
que el token exista, que es lo normal, y nadie compra contra un contrato vacío.

**El comprador va protegido del cambio de precio.** Cada compra lleva un mínimo
de tokens que acepta recibir. Si el precio cambia entre que ve la cotización y
se mina su transacción, la operación revierte en vez de darle de menos. La web
debe llamar a `quoteNative` / `quoteUsdt` y enviar ese número con un margen.

**El dueño no puede tocar los tokens debidos.** `withdrawUnsoldTokens` solo deja
sacar lo que exceda de `totalTokensSold - totalTokensClaimed`.

**Los envíos directos se rechazan.** Mandar ETH sin llamar a `buyWithNative`
revierte, porque no llevaría protección de precio.

**USDT de Ethereum no devuelve `bool`.** Todo el contrato usa `SafeERC20`, que lo
maneja. Un `IERC20` normal fallaría en Ethereum.

## Lo que este contrato NO tiene

- **No hay reembolso ni mínimo de recaudación.** Si la preventa no llega a su
  objetivo, no hay forma de devolver. Habría que añadirlo si lo quieres.
- **No hay vesting.** Al abrir el reparto, cada uno retira el 100% de golpe.
- **No hay lista blanca.** Compra cualquiera.
- **El dueño puede retirar lo recaudado en cualquier momento**, también con la
  preventa abierta. Es lo que pediste, pero conviene que lo sepas: quien mire el
  contrato lo verá, y por eso el dueño debería ser un multisig.

## Pruebas

```
npm install --save-dev hardhat@2 "@nomicfoundation/hardhat-toolbox@hh2" \
                       solc@0.8.24 @openzeppelin/contracts@5.0.2
npx hardhat test
```

`test/preventa.js` cubre 17 casos: cálculo de tokens con USDT de 6 y de 18
decimales, protección de precio, tope, cierre por fecha y manual, reparto
único, la imposibilidad de que el dueño toque los tokens de los compradores, y
el control de acceso de todas las funciones administrativas.
