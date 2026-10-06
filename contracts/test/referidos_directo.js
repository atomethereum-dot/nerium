const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const E = ethers.parseEther, U6 = n => ethers.parseUnits(String(n), 6), USD = n => ethers.parseUnits(String(n), 8);

/* El referidor cobra EN EL ACTO: el 10 % de lo pagado sale en la misma
   transaccion de la compra, en la misma moneda. El comprador recibe los
   mismos tokens que sin referido. Si el envio no se puede hacer, la compra
   sigue y la comision queda apartada para claimReferral(destino). */
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
      .to.emit(p, "ReferralPaid").withArgs(ref.address, ana.address, false, E("0.1"), true);
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

  it("si el referidor rechaza ETH, la compra sigue y la comision queda apartada; la cobra en otra direccion", async () => {
    const r = await (await ethers.getContractFactory("RechazaEth")).deploy();
    await expect(p.connect(ana).buyWithNativeRef(0, r.target, { value: E("1") }))
      .to.emit(p, "ReferralPaid").withArgs(r.target, ana.address, false, E("0.1"), false);
    expect(await p.allocation(ana.address)).to.equal(E("30000"));
    expect(await p.referralOwedNative(r.target)).to.equal(E("0.1"));
    // el dueño no puede llevarse lo apartado
    await expect(p.withdrawNative(owner.address, E("1"))).to.be.revertedWithCustomError(p, "AboveFreeBalance");
    const antes = await ethers.provider.getBalance(owner.address);
    const tx = await p.withdrawNative(owner.address, 0);                       // todo lo libre
    const rc = await tx.wait();
    expect(await ethers.provider.getBalance(owner.address) - antes + rc.gasUsed * rc.gasPrice).to.equal(E("0.9"));
    // el referidor cobra en otra direccion
    const a0 = await ethers.provider.getBalance(otro.address);
    await r.reclamar(p.target, otro.address);
    expect(await ethers.provider.getBalance(otro.address) - a0).to.equal(E("0.1"));
    expect(await p.referralOwedNative(r.target)).to.equal(0n);
    expect(await ethers.provider.getBalance(p.target)).to.equal(0n);
  });

  it("la comision se ajusta y tiene techo del 20 %", async () => {
    await expect(p.setReferralBps(2001)).to.be.revertedWithCustomError(p, "ReferralTooHigh");
    await expect(p.connect(ana).setReferralBps(500)).to.be.reverted;          // solo el dueño
    await p.setReferralBps(0);
    await p.connect(ana).buyWithNativeRef(0, ref.address, { value: E("1") });
    expect(await p.totalReferralNative()).to.equal(0n);
  });

  it("claimReferral sin nada pendiente revierte", async () => {
    await expect(p.connect(ref).claimReferral(ref.address)).to.be.revertedWithCustomError(p, "NothingToClaim");
  });
});
