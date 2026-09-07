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
const E=ethers.parseEther, U6=(n)=>ethers.parseUnits(String(n),6), USD=(n)=>ethers.parseUnits(String(n),8);
async function g(tx){ const r=await (await tx).wait(); return Number(r.gasUsed); }
(async()=>{
  const [owner,ana,luis]=await ethers.getSigners();
  const usdt=await (await ethers.getContractFactory("MockUSDT")).deploy(6);
  const F=await ethers.getContractFactory("MockFeed");
  const f1=await F.deploy(USD("3000")), f2=await F.deploy(USD("2990"));
  const P=await ethers.getContractFactory("NereumSeedRound");
  const p=await P.deploy(await usdt.getAddress(),[await f1.getAddress(),await f2.getAddress()],
    18,owner.address,USD("0.2"),USD("0.2"),USD("10000"));
  const dep=Number((await (await p.deploymentTransaction()).wait()).gasUsed);
  for(const u of [ana,luis]){ await usdt.transfer(u.address,U6("100000"));
    await usdt.connect(u).approve(await p.getAddress(),ethers.MaxUint256); }
  await p.startRound(0,(await time.latest())+3600);
  const n1=await g(p.connect(ana).buyWithNative(0,{value:E("0.1")}));
  const n2=await g(p.connect(ana).buyWithNative(0,{value:E("0.1")}));
  const u1=await g(p.connect(luis).buyWithUsdt(U6("100"),0));
  const u2=await g(p.connect(luis).buyWithUsdt(U6("100"),0));
  await f1.setStale(90000);
  const nf=await g(p.connect(ana).buyWithNative(0,{value:E("0.1")}));
  const tok=await (await ethers.getContractFactory("MockToken")).deploy();
  await p.setSaleToken(await tok.getAddress());
  await tok.transfer(await p.getAddress(),E("100000"));
  await p.endRound(); await p.openClaims();
  const c=await g(p.connect(ana).claim());
  const wn=await g(p.withdrawNative(owner.address,0));
  const wu=await g(p.withdrawUsdt(owner.address,0));
  const filas=[["despliegue",dep],["buyWithNative (1ª de esa cartera)",n1],["buyWithNative (siguientes)",n2],
    ["buyWithUsdt (1ª de esa cartera)",u1],["buyWithUsdt (siguientes)",u2],
    ["buyWithNative con el 1º caído",nf],["claim",c],["withdrawNative",wn],["withdrawUsdt",wu]];
  for(const [k,v] of filas) console.log(k.padEnd(36), String(v).padStart(8));
})().catch(e=>{console.error(e);process.exit(1)});
