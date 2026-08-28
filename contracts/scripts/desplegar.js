/**
 * Despliegue de la ronda de Nereum.
 *
 *   npx hardhat run scripts/desplegar.js --network ethereum
 *   npx hardhat run scripts/desplegar.js --network bsc
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

/* ── parámetros de la venta ── */
const PRECIO_USD   = 10_000_000n;         // 0,10 $ por NRM, con 8 decimales
const MINIMO_USD   = 100_000_000n;        // 1 $
const DECIMALES_NRM = 18;

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

  console.log(`\n─── Ronda de financiación de Nereum · ${cfg.nombre} ───`);
  console.log(`Desplegando desde: ${cuenta.address}`);
  console.log(`Saldo: ${ethers.formatEther(await proveedor.getBalance(cuenta.address))}\n`);

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
  const P = await ethers.getContractFactory("NereumFundingRound");
  const p = await P.deploy(cfg.usdt, cfg.oraculos, DECIMALES_NRM, cuenta.address);
  await p.waitForDeployment();
  const dir = await p.getAddress();
  console.log(`  contrato: ${dir}\n`);

  /* ── 4 · configurar ── */
  console.log("Configurando…");
  await (await p.setPriceUsd(PRECIO_USD)).wait();
  console.log(`  precio: ${Number(PRECIO_USD) / 1e8} $ por NRM`);
  await (await p.setMinBuyUsd(MINIMO_USD)).wait();
  console.log(`  mínimo: ${Number(MINIMO_USD) / 1e8} $`);

  const [cotiz, vivo] = await p.nativeUsdPrice();
  console.log(`  cotización que ve el contrato: ${Number(cotiz) / 1e8} $ ` +
              `(${vivo ? "de oráculo vivo" : "guardada"})\n`);

  console.log("─── Listo ───");
  console.log(`Contrato: ${dir}`);
  console.log("\nQueda por hacer, cuando decidas:");
  console.log("  1. Traspasar la propiedad a un multisig (transferOwnership + acceptOwnership)");
  console.log("  2. startRound(0, <fin en segundos unix>)  ← abre la venta");
  console.log("  3. Al terminar: setSaleToken(NRM), depositar los tokens, openClaims()");
}

main().catch((e) => { console.error("\n" + e.message); process.exit(1); });
