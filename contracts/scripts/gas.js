/**
 * Mide el gas de las operaciones principales sobre la red local.
 *
 *   npx hardhat run scripts/gas.js
 *
 * Los numeros de la ficha tecnica salen de aqui: si cambia el contrato, se
 * vuelven a medir en vez de estimarlos.
 */
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const E = ethers.parseEther;
const U6 = (n) => ethers.parseUnits(String(n), 6);
const USD = (n) => ethers.parseUnits(String(n), 8);
const g = async (tx) => Number((await (await tx).wait()).gasUsed);

(async () => {
  const [owner, ana, luis] = await ethers.getSigners();
  const usdt = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
  const F = await ethers.getContractFactory("MockFeed");
  const f1 = await F.deploy(USD("3000")), f2 = await F.deploy(USD("2990"));
  const P = await ethers.getContractFactory("NereumSeedRound");
  const p = await P.deploy(await usdt.getAddress(), [await f1.getAddress(), await f2.getAddress()],
    18, owner.address, USD("0.2"), USD("0.2"), USD("10000"));
  const dep = Number((await (await p.deploymentTransaction()).wait()).gasUsed);
  for (const u of [ana, luis]) await usdt.transfer(u.address, U6("100000"));
  await p.startRound(0, (await time.latest()) + 3600);

  /* ana estrena el contrato: su compra paga tambien las posiciones que se
     comparten entre todos —el precio guardado y los totales— y por eso es la
     mas cara de todas. */
  const apA = await g(usdt.connect(ana).approve(await p.getAddress(), ethers.MaxUint256));
  const primeraDeTodas = await g(p.connect(ana).buyWithUsdt(U6("100"), 0));

  /* luis llega despues: solo paga lo suyo */
  const apL = await g(usdt.connect(luis).approve(await p.getAddress(), ethers.MaxUint256));
  const primeraDeLuis = await g(p.connect(luis).buyWithUsdt(U6("100"), 0));
  const repetida = await g(p.connect(luis).buyWithUsdt(U6("100"), 0));

  const nat1 = await g(p.connect(ana).buyWithNative(0, { value: E("0.1") }));
  const nat2 = await g(p.connect(ana).buyWithNative(0, { value: E("0.1") }));
  await f1.setStale(90000);
  const natCaido = await g(p.connect(ana).buyWithNative(0, { value: E("0.1") }));

  const tok = await (await ethers.getContractFactory("MockToken")).deploy();
  await p.setSaleToken(await tok.getAddress());
  await tok.transfer(await p.getAddress(), E("100000"));
  await p.endRound(); await p.openClaims();
  const rec = await g(p.connect(ana).claim());
  const retN = await g(p.withdrawNative(owner.address, 0));
  const retU = await g(p.withdrawUsdt(owner.address, 0));

  const filas = [
    ["despliegue", dep],
    ["approve de USDT (una sola vez por cartera)", apA],
    ["buyWithUsdt · primera compra de la ronda", primeraDeTodas],
    ["buyWithUsdt · primera de esa cartera", primeraDeLuis],
    ["buyWithUsdt · siguientes", repetida],
    ["buyWithNative · primera de esa cartera", nat1],
    ["buyWithNative · siguientes", nat2],
    ["buyWithNative · con el primer oraculo caido", natCaido],
    ["claim", rec],
    ["withdrawNative", retN],
    ["withdrawUsdt", retU],
  ];
  for (const [k, v] of filas) console.log(k.padEnd(44), String(v).padStart(9));
  console.log("".padEnd(44), "".padStart(9, "─"));
  console.log("primera compra en USDT (approve + compra)".padEnd(44),
              String(apA + primeraDeTodas).padStart(9));
  if (apA !== apL) console.log("(approve de luis:", apL + ")");
})().catch((e) => { console.error(e); process.exit(1); });
