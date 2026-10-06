const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { leerReferidor, calcular, deudas, csvSafe, MARCA } = require("../scripts/referidos");

const E = ethers.parseEther, U6 = n => ethers.parseUnits(String(n), 6), USD = n => ethers.parseUnits(String(n), 8);

/* El referido va pegado al final de la transaccion de compra: el contrato no
   lo lee y la compra tiene que ser EXACTAMENTE la misma; el script de
   comisiones lo saca de la cadena y calcula el 10 % en la moneda pagada. */
describe("referidos", function () {
  let owner, ana, luis, eva, ref, usdt, p;
  beforeEach(async () => {
    [owner, ana, luis, eva, ref] = await ethers.getSigners();
    usdt = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
    const feed = await (await ethers.getContractFactory("MockFeed")).deploy(USD("3000"));
    p = await (await ethers.getContractFactory("NereumSeedRound")).deploy(
      await usdt.getAddress(), [await feed.getAddress()], 18, owner.address, USD("0.10"), USD("1"), 0);
    await p.startRound(0, (await time.latest()) + 3600);
    for (const u of [luis, eva]) { await usdt.transfer(u.address, U6("1000")); await usdt.connect(u).approve(await p.getAddress(), ethers.MaxUint256); }
  });
  const cola = a => MARCA + a.slice(2).toLowerCase();
  const compraNativa = (quien, wei, r) => quien.sendTransaction({ to: p.target, value: wei,
    data: p.interface.encodeFunctionData("buyWithNative", [0]) + (r ? cola(r) : "") });
  const compraUsdt = (quien, n, r) => quien.sendTransaction({ to: p.target,
    data: p.interface.encodeFunctionData("buyWithUsdt", [n, 0]) + (r ? cola(r) : "") });

  it("la compra es la misma con o sin referido", async () => {
    await (await compraNativa(ana, E("1"), ref.address)).wait();
    expect(await p.allocation(ana.address)).to.equal(E("30000"));
    await (await compraUsdt(luis, U6("100"), ref.address)).wait();
    expect(await p.allocation(luis.address)).to.equal(E("1000"));
  });

  it("el 10 % en la moneda pagada; sin referido o a si mismo no cuenta", async () => {
    await (await compraNativa(ana, E("1"), ref.address)).wait();       // 0,1 ETH
    await (await compraUsdt(luis, U6("100"), ref.address)).wait();     // 10 USDT
    await (await compraUsdt(eva, U6("50"), null)).wait();              // sin referido
    await (await compraUsdt(eva, U6("40"), eva.address)).wait();       // a si misma
    const compras = await calcular(ethers.provider, { venta: p.target, desde: 0 });
    expect(compras.length).to.equal(3);
    expect(compras.find(c => c.comprador === eva.address.toLowerCase()).excluida).to.equal("se refiere a si mismo");
    const d = deudas(compras);
    const r = d[ref.address.toLowerCase()];
    expect(r.native).to.equal(E("0.1"));
    expect(r.usdt).to.equal(U6("10"));
    expect(d[eva.address.toLowerCase()]).to.equal(undefined);
    // lo ya pagado se descuenta
    const d2 = deudas(compras, { [ref.address]: { native: E("0.1").toString() } });
    expect(d2[ref.address.toLowerCase()].native).to.equal(0n);
    expect(d2[ref.address.toLowerCase()].usdt).to.equal(U6("10"));
    // y el CSV de Safe lleva una fila por moneda pendiente
    const csv = csvSafe(d, { usdt: await usdt.getAddress(), usdtDec: 6 }).trim().split("\n");
    expect(csv[0]).to.equal("token_type,token_address,receiver,amount,id");
    expect(csv).to.include(`native,,${ref.address},0.1,`);
    expect(csv).to.include(`erc20,${await usdt.getAddress()},${ref.address},10.0,`);
  });

  it("solo acepta la marca y una direccion exactas detras de los argumentos", async () => {
    const base = p.interface.encodeFunctionData("buyWithNative", [0]);
    expect(leerReferidor(base + cola(ref.address))).to.equal(ref.address.toLowerCase());
    expect(leerReferidor(base)).to.equal(null);
    expect(leerReferidor(base + "deadbeef" + ref.address.slice(2))).to.equal(null);
    expect(leerReferidor(base + cola(ref.address) + "00")).to.equal(null);
    expect(leerReferidor("0x12345678" + cola(ref.address))).to.equal(null);
  });
});
