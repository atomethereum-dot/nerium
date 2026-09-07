/**
 * Despliegue del Seed Round de Nereum.
 *
 *   npx hardhat run scripts/desplegar.js --network ethereum
 *   npx hardhat run scripts/desplegar.js --network bsc
 *
 * LA MISMA DIRECCION EN LAS DOS REDES. La direccion de un contrato no sale de
 * su codigo: sale de quien lo despliega y de su nonce, o sea de cuantas
 * transacciones ha enviado esa cartera en esa cadena. Con la misma cartera y el
 * mismo nonce en Ethereum y en BNB Chain, el contrato cae en la MISMA direccion
 * en las dos, aunque los argumentos del constructor sean distintos.
 *
 * Por eso el script exige nonce 0 —una cartera recien creada, cuyo despliegue
 * sea su primerisima transaccion— y aborta si no lo es. Recibir gas no gasta
 * nonce; enviar cualquier cosa, si. Si por lo que sea hay que salir de cero, se
 * pone NONCE_EXIGIDO al valor que toque en AMBAS redes.
 *
 * En el segundo despliegue, pon DIRECCION_ESPERADA con la direccion que salio en
 * el primero: el script calcula la que va a salir ANTES de gastar gas y aborta
 * si no coincide.
 *
 * ANTES de desplegar nada, el script interroga a cada oráculo y comprueba que
 * es el que dice ser. Si algo no cuadra, ABORTA sin gastar gas. Ese es el punto:
 * una dirección de oráculo equivocada no se nota a ojo y arruina la ronda
 * entera, así que la verificación no es opcional ni va en un paso aparte donde
 * se pueda olvidar.
 */
const { ethers, network } = require("hardhat");

/* ── qué se espera en cada red ──────────────────────────────────────────────
   Las direcciones de Chainlink son las oficiales de cada red. El script las
   comprueba igualmente contra la cadena antes de usarlas: si alguna estuviera
   mal, la verificación lo dice y no se despliega.

   Para añadir un segundo proveedor (API3, RedStone, Pyth con adaptador), mete
   su dirección en `oraculos` DESPUÉS de la de Chainlink. También se puede
   añadir más tarde con setFeeds, sin redesplegar.                            */
const REDES = {
  ethereum: {
    nombre: "Ethereum",
    par: "ETH / USD",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    oraculos: [
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",   // Chainlink ETH/USD
    ],
    // banda de cordura: si el oráculo da un precio fuera de aquí, es otro par
    minUsd: 200, maxUsd: 50000,
  },
  bsc: {
    nombre: "BNB Chain",
    par: "BNB / USD",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    oraculos: [
      "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",   // Chainlink BNB/USD
    ],
    minUsd: 50, maxUsd: 5000,
  },
};

/* ── parámetros de la venta ──
   Los tres importes van en dólares con 8 decimales, que es la escala en la que
   Chainlink publica ETH/USD y BNB/USD. Van al constructor: el contrato no
   existe ni un bloque a medio configurar.                                    */
const PRECIO_USD   = 20_000_000n;             // 0,20 $ por NRM
const MINIMO_USD   = 20_000_000n;             // compra mínima 0,20 $ (un token)
const MAXIMO_USD   = 1_000_000_000_000n;      // tope por cartera 10.000 $
const DECIMALES_NRM = 18;

/* Nonce que debe tener la cartera para que la dirección salga igual en las dos
   redes. Cero = cartera recién creada, que es lo recomendado. */
const NONCE_EXIGIDO = Number(process.env.NONCE_EXIGIDO ?? 0);

/* En el segundo despliegue: la dirección que salió en el primero. Vacío en el
   primero. */
const DIRECCION_ESPERADA = (process.env.DIRECCION_ESPERADA || "").trim();

const { verificar } = require("./verificador");

async function main() {
  const cfg = REDES[network.name];
  if (!cfg) {
    throw new Error(
      `Red "${network.name}" sin configurar. Usa --network ethereum o --network bsc`
    );
  }

  const [cuenta] = await ethers.getSigners();
  const proveedor = ethers.provider;

  console.log(`\n─── Nereum Seed Round · ${cfg.nombre} ───`);
  console.log(`Desplegando desde: ${cuenta.address}`);
  console.log(`Saldo: ${ethers.formatEther(await proveedor.getBalance(cuenta.address))}\n`);

  /* ── 0 · la dirección, ANTES de gastar un gas ──
     Se calcula la dirección que va a salir y se comprueba que es la que toca.
     Si algo no cuadra, aquí no se ha desplegado nada todavía. */
  const nonce = await proveedor.getTransactionCount(cuenta.address);
  const futura = ethers.getCreateAddress({ from: cuenta.address, nonce });
  console.log(`Nonce de la cartera en ${cfg.nombre}: ${nonce}`);
  console.log(`El contrato caerá en: ${futura}\n`);

  if (nonce !== NONCE_EXIGIDO) {
    throw new Error(
      `Nonce ${nonce}, se esperaba ${NONCE_EXIGIDO}.\n\n` +
      `La dirección sale del emisor y del nonce, así que con nonce distinto en\n` +
      `cada red el contrato NO cae en la misma dirección en Ethereum y en BSC.\n\n` +
      `Opciones:\n` +
      `  · Usa una cartera recién creada, que no haya enviado nada nunca.\n` +
      `    Mandarle gas no gasta nonce; solo gastan las que ella envía.\n` +
      `  · O, si aceptas direcciones distintas, vuelve a lanzar con\n` +
      `    NONCE_EXIGIDO=${nonce}`
    );
  }

  if (DIRECCION_ESPERADA) {
    if (futura.toLowerCase() !== DIRECCION_ESPERADA.toLowerCase()) {
      throw new Error(
        `La dirección no va a coincidir con la del otro despliegue.\n\n` +
        `  esperada: ${DIRECCION_ESPERADA}\n` +
        `  saldría:  ${futura}\n\n` +
        `Comprueba que es la MISMA cartera y que su nonce es el mismo en las dos redes.`
      );
    }
    console.log(`Coincide con el despliegue anterior: ${DIRECCION_ESPERADA}\n`);
  }

  /* ── 1 · los oráculos, uno por uno ── */
  console.log("Verificando oráculos…\n");
  let hayFallos = false;
  for (let i = 0; i < cfg.oraculos.length; i++) {
    const dir = cfg.oraculos[i];
    const r = await verificar(dir, cfg, proveedor);
    console.log(`  [${i}] ${dir}`);
    console.log(`      par: ${r.desc ?? "?"}   decimales: ${r.dec ?? "?"}` +
                (r.precio !== undefined
                  ? `   precio: ${r.precio.toFixed(2)} $   antigüedad: ${r.edad}s`
                  : ""));
    if (r.fallos.length) {
      hayFallos = true;
      r.fallos.forEach((f) => console.log(`      ✗ ${f}`));
    } else {
      console.log("      ✓ correcto");
    }
    console.log();
  }

  if (hayFallos) {
    throw new Error(
      "Algún oráculo no pasó la verificación. NO se ha desplegado nada.\n" +
      "Corrige las direcciones en REDES dentro de este script y vuelve a ejecutar."
    );
  }

  if (cfg.oraculos.length < 2) {
    console.log("AVISO: solo hay un oráculo. El contrato funciona, y si ese\n" +
                "oráculo cae usará el último precio que guardó. Aun así conviene\n" +
                "añadir un segundo proveedor con setFeeds cuando lo tengas.\n");
  }

  /* ── 2 · USDT ── */
  const usdt = new ethers.Contract(
    cfg.usdt, ["function decimals() view returns (uint8)", "function symbol() view returns (string)"],
    proveedor
  );
  let simbolo = "?", decUsdt = "?";
  try { simbolo = await usdt.symbol(); } catch {}
  try { decUsdt = Number(await usdt.decimals()); } catch {}
  console.log(`USDT: ${cfg.usdt}  (${simbolo}, ${decUsdt} decimales)\n`);

  /* ── 3 · desplegar ── */
  console.log("Desplegando…");
  const P = await ethers.getContractFactory("NereumSeedRound");
  const p = await P.deploy(cfg.usdt, cfg.oraculos, DECIMALES_NRM, cuenta.address,
                           PRECIO_USD, MINIMO_USD, MAXIMO_USD);
  await p.waitForDeployment();
  const dir = await p.getAddress();
  if (dir.toLowerCase() !== futura.toLowerCase()) {
    throw new Error(`Cayó en ${dir} y se había calculado ${futura}. Revisa antes de seguir.`);
  }
  console.log(`  contrato: ${dir}   (la calculada, correcta)\n`);

  /* ── 4 · comprobar lo que quedó escrito ── */
  console.log("Configuración (viene del constructor, no hace falta tocarla):");
  console.log(`  precio: ${Number(await p.priceUsd()) / 1e8} $ por NRM`);
  console.log(`  mínimo: ${Number(await p.minBuyUsd()) / 1e8} $`);
  console.log(`  tope por cartera: ${Number(await p.maxBuyUsd()) / 1e8} $`);

  const [cotiz, vivo] = await p.nativeUsdPrice();
  console.log(`  cotización que ve el contrato: ${Number(cotiz) / 1e8} $ ` +
              `(${vivo ? "de oráculo vivo" : "guardada"})\n`);

  console.log("─── Listo ───");
  console.log(`Contrato: ${dir}`);
  console.log(`Dueño:    ${await p.owner()}   ← la cartera que ha desplegado`);

  if (!DIRECCION_ESPERADA) {
    console.log(`\nPara que la otra red caiga en esta misma dirección, despliega allí con:`);
    console.log(`  DIRECCION_ESPERADA=${dir} npx hardhat run scripts/desplegar.js --network ` +
                (network.name === "ethereum" ? "bsc" : "ethereum"));
    console.log(`  (con la MISMA cartera, y sin haberla usado para nada más)`);
  }

  console.log("\nQueda por hacer, cuando decidas:");
  console.log("  1. startRound(0, <fin en segundos unix>)  ← abre la venta");
  console.log("  2. Al terminar: setSaleToken(NRM), depositar los tokens, openClaims()");
  console.log("\nLa propiedad se queda en la cartera que desplegó. Si algún día la pasas");
  console.log("a un multisig: transferOwnership(multisig) y el multisig acceptOwnership().");
}

main().catch((e) => { console.error("\n" + e.message); process.exit(1); });
