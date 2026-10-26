const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const E = ethers.parseEther, U6 = n => ethers.parseUnits(String(n), 6), USD = n => ethers.parseUnits(String(n), 8);

/* El referidor cobra EN EL ACTO: el 10 % de lo pagado sale en la misma
   transaccion de la compra, en la misma moneda. El comprador recibe los
   mismos tokens que sin referido. No hay comisiones pendientes: si el envio
   no se puede hacer, la compra entera revierte (y la dapp, que la simula
   antes, compra entonces sin referido para no perder la venta). */
describe("referidos pagados en el acto", function () {
  let owner, ana, luis, ref, otro, usdt, p;
  beforeEach(async () => {
    [owner, ana, luis, ref, otro] = await ethers.getSigners();
    usdt = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
    const feed = await (await ethers.getContractFactory("MockFeed")).deploy(USD("3000"));
    p = await (await ethers.getContractFactory("NereumSeedRound")).deploy(
      await usdt.getAddress(), [await feed.getAddress()], 18, owner.address, USD("0.10"), USD("1"), 0);
    await p.startRound(0, (await time.latest()) + 3600);
    await usdt.transfer(luis.address, U6("1000"));
    await usdt.connect(luis).approve(p.target, ethers.MaxUint256);
  });

  it("ETH: el referidor cobra el 10 % en la misma transaccion y el comprador recibe lo mismo", async () => {
    const antes = await ethers.provider.getBalance(ref.address);
    await expect(p.connect(ana).buyWithNativeRef(0, ref.address, { value: E("1") }))
      .to.emit(p, "ReferralPaid").withArgs(ref.address, ana.address, false, E("0.1"));
    expect(await ethers.provider.getBalance(ref.address) - antes).to.equal(E("0.1"));
    expect(await p.allocation(ana.address)).to.equal(E("30000"));          // igual que sin referido
    expect(await ethers.provider.getBalance(p.target)).to.equal(E("0.9"));
    expect(await p.referralEarnedNative(ref.address)).to.equal(E("0.1"));
    expect(await p.referralCount(ref.address)).to.equal(1n);
  });

  it("USDT: el 10 % sale en USDT en el acto", async () => {
    await p.connect(luis).buyWithUsdtRef(U6("100"), 0, ref.address);
    expect(await usdt.balanceOf(ref.address)).to.equal(U6("10"));
    expect(await usdt.balanceOf(p.target)).to.equal(U6("90"));
    expect(await p.allocation(luis.address)).to.equal(E("1000"));
    expect(await p.referralEarnedUsdt(ref.address)).to.equal(U6("10"));
  });

  it("sin referidor, a uno mismo o al propio contrato no hay comision", async () => {
    await p.connect(ana).buyWithNativeRef(0, ethers.ZeroAddress, { value: E("1") });
    await p.connect(ana).buyWithNativeRef(0, ana.address, { value: E("1") });
    await p.connect(ana).buyWithNativeRef(0, p.target, { value: E("1") });
    await p.connect(ana).buyWithNative(0, { value: E("1") });                 // la funcion de siempre
    expect(await ethers.provider.getBalance(p.target)).to.equal(E("4"));
    expect(await p.totalReferralNative()).to.equal(0n);
  });

  it("si el referidor rechaza ETH, la compra entera revierte: nadie cobra y el comprador conserva su dinero", async () => {
    const r = await (await ethers.getContractFactory("RechazaEth")).deploy();
    const antes = await ethers.provider.getBalance(ana.address);
    await expect(p.connect(ana).buyWithNativeRef(0, r.target, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "ReferralPaymentFailed").withArgs(r.target);
    expect(await p.allocation(ana.address)).to.equal(0n);
    expect(await ethers.provider.getBalance(p.target)).to.equal(0n);
    expect(await p.totalReferralNative()).to.equal(0n);
    expect(antes - await ethers.provider.getBalance(ana.address)).to.be.lessThan(E("0.01")); // solo el gas
    // y la misma compra sin referido entra
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(ana.address)).to.equal(E("30000"));
  });

  it("una cartera que es un contrato (multisig) cobra aunque gaste gas al recibir", async () => {
    const w = await (await ethers.getContractFactory("CarteraContrato")).deploy();
    await p.connect(ana).buyWithNativeRef(0, w.target, { value: E("1") });
    expect(await w.recibido()).to.equal(E("0.1"));
    expect(await w.veces()).to.equal(1n);
    expect(await p.referralEarnedNative(w.target)).to.equal(E("0.1"));
  });

  it("el dueño retira todo lo recaudado: no queda nada apartado", async () => {
    await p.connect(ana).buyWithNativeRef(0, ref.address, { value: E("1") });
    await p.connect(luis).buyWithUsdtRef(U6("100"), 0, ref.address);
    await p.withdrawNative(owner.address, 0);
    await p.withdrawUsdt(owner.address, 0);
    expect(await ethers.provider.getBalance(p.target)).to.equal(0n);
    expect(await usdt.balanceOf(p.target)).to.equal(0n);
  });

  it("la comision se ajusta y tiene techo del 20 %", async () => {
    await expect(p.setReferralBps(2001)).to.be.revertedWithCustomError(p, "ReferralTooHigh");
    await expect(p.connect(ana).setReferralBps(500)).to.be.reverted;          // solo el dueño
    await p.setReferralBps(0);
    await p.connect(ana).buyWithNativeRef(0, ref.address, { value: E("1") });
    expect(await p.totalReferralNative()).to.equal(0n);
  });
});
