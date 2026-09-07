const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const E   = ethers.parseEther;
const U6  = (n) => ethers.parseUnits(String(n), 6);
const USD = (n) => ethers.parseUnits(String(n), 8);

/* La economía tal y como sale a producción: 0,20 $ por token, mínimo 0,20 $ y
   tope de 10.000 $ por cartera. Es lo que anuncia la web, así que se comprueba
   con esos números y no con otros de laboratorio. */
const PRECIO = USD("0.2");
const MINIMO = USD("0.2");
const TOPE   = USD("10000");

describe("Seed Round · precio, mínimo y tope por cartera", function () {
  let owner, ana, luis, usdt, feed, p;

  beforeEach(async () => {
    [owner, ana, luis] = await ethers.getSigners();
    usdt = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
    feed = await (await ethers.getContractFactory("MockFeed")).deploy(USD("3000"));
    p = await (await ethers.getContractFactory("NereumSeedRound")).deploy(
      await usdt.getAddress(), [await feed.getAddress()], 18, owner.address,
      PRECIO, MINIMO, TOPE);
    for (const u of [ana, luis]) {
      await usdt.transfer(u.address, U6("1000000"));
      await usdt.connect(u).approve(await p.getAddress(), ethers.MaxUint256);
    }
    await p.startRound(0, (await time.latest()) + 3600);
  });

  it("queda configurado al desplegar, sin llamadas sueltas después", async () => {
    expect(await p.priceUsd()).to.equal(PRECIO);
    expect(await p.minBuyUsd()).to.equal(MINIMO);
    expect(await p.maxBuyUsd()).to.equal(TOPE);
  });

  it("a 0,20 $ el token, 1 ETH de 3.000 $ da 15.000 NRM", async () => {
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(ana.address)).to.equal(E("15000"));
  });

  it("a 0,20 $ el token, 100 USDT dan 500 NRM", async () => {
    await p.connect(ana).buyWithUsdt(U6("100"), 0);
    expect(await p.allocation(ana.address)).to.equal(E("500"));
  });

  it("el mínimo son 0,20 $: 0,19 $ se rechaza y 0,20 $ pasa", async () => {
    await expect(p.connect(ana).buyWithUsdt(U6("0.19"), 0))
      .to.be.revertedWithCustomError(p, "BelowMinimum");
    await p.connect(ana).buyWithUsdt(U6("0.2"), 0);
    expect(await p.allocation(ana.address)).to.equal(E("1"));   // 0,20 $ = 1 NRM
  });

  it("deja llegar justo a 10.000 $ y rechaza el dólar siguiente", async () => {
    await p.connect(ana).buyWithUsdt(U6("10000"), 0);
    expect(await p.spentUsd(ana.address)).to.equal(TOPE);
    expect(await p.allocation(ana.address)).to.equal(E("50000"));   // 10.000 / 0,20

    await expect(p.connect(ana).buyWithUsdt(U6("1"), 0))
      .to.be.revertedWithCustomError(p, "AboveMaximum");
  });

  it("EL TOPE ES ACUMULADO, no por transacción", async () => {
    for (let i = 0; i < 5; i++) await p.connect(ana).buyWithUsdt(U6("1900"), 0);
    expect(await p.spentUsd(ana.address)).to.equal(USD("9500"));
    // 9.500 + 600 se pasa de 10.000
    await expect(p.connect(ana).buyWithUsdt(U6("600"), 0))
      .to.be.revertedWithCustomError(p, "AboveMaximum");
    // 500 justos entran
    await p.connect(ana).buyWithUsdt(U6("500"), 0);
    expect(await p.spentUsd(ana.address)).to.equal(TOPE);
  });

  it("EL TOPE SUMA LAS DOS MONEDAS: no se esquiva pagando mitad y mitad", async () => {
    await p.connect(ana).buyWithUsdt(U6("7000"), 0);              // 7.000 $
    await p.connect(ana).buyWithNative(0, { value: E("1") });     // 3.000 $
    expect(await p.spentUsd(ana.address)).to.equal(TOPE);
    await expect(p.connect(ana).buyWithNative(0, { value: E("0.001") }))
      .to.be.revertedWithCustomError(p, "AboveMaximum");
  });

  it("el tope es por dirección: a otra cartera no le afecta", async () => {
    await p.connect(ana).buyWithUsdt(U6("10000"), 0);
    await p.connect(luis).buyWithUsdt(U6("10000"), 0);
    expect(await p.allocation(luis.address)).to.equal(E("50000"));
  });

  it("remainingAllowanceUsd es lo que la web debe pintar", async () => {
    expect(await p.remainingAllowanceUsd(ana.address)).to.equal(TOPE);
    await p.connect(ana).buyWithUsdt(U6("2500"), 0);
    expect(await p.remainingAllowanceUsd(ana.address)).to.equal(USD("7500"));
    await p.connect(ana).buyWithUsdt(U6("7500"), 0);
    expect(await p.remainingAllowanceUsd(ana.address)).to.equal(0);
  });

  it("sin tope, remainingAllowanceUsd no limita", async () => {
    await p.setMaxBuyUsd(0);
    expect(await p.remainingAllowanceUsd(ana.address)).to.equal(ethers.MaxUint256);
    await p.connect(ana).buyWithUsdt(U6("500000"), 0);
    expect(await p.allocation(ana.address)).to.equal(E("2500000"));
  });

  it("bajar el tope no anula lo comprado, solo impide comprar más", async () => {
    await p.connect(ana).buyWithUsdt(U6("8000"), 0);
    await p.setMaxBuyUsd(USD("5000"));
    expect(await p.allocation(ana.address)).to.equal(E("40000"));   // intacto
    expect(await p.remainingAllowanceUsd(ana.address)).to.equal(0);
    await expect(p.connect(ana).buyWithUsdt(U6("1"), 0))
      .to.be.revertedWithCustomError(p, "AboveMaximum");
  });

  it("no se puede dejar un mínimo por encima del tope, ni al revés", async () => {
    await expect(p.setMinBuyUsd(USD("20000"))).to.be.revertedWithCustomError(p, "BadWindow");
    await expect(p.setMaxBuyUsd(USD("0.1"))).to.be.revertedWithCustomError(p, "BadWindow");
    const F = await ethers.getContractFactory("NereumSeedRound");
    await expect(F.deploy(await usdt.getAddress(), [await feed.getAddress()], 18,
      owner.address, PRECIO, USD("100"), USD("10"))).to.be.revertedWithCustomError(F, "BadWindow");
  });

  it("no se despliega sin precio ni se abre ronda sin precio", async () => {
    const F = await ethers.getContractFactory("NereumSeedRound");
    await expect(F.deploy(await usdt.getAddress(), [await feed.getAddress()], 18,
      owner.address, 0, MINIMO, TOPE)).to.be.revertedWithCustomError(F, "PriceNotSet");
  });

  it("el tope no estorba al reparto: se reclama lo comprado", async () => {
    await p.connect(ana).buyWithUsdt(U6("10000"), 0);
    const token = await (await ethers.getContractFactory("MockToken")).deploy();
    await p.setSaleToken(await token.getAddress());
    await token.transfer(await p.getAddress(), E("50000"));
    await p.endRound();
    await p.openClaims();
    await p.connect(ana).claim();
    expect(await token.balanceOf(ana.address)).to.equal(E("50000"));
  });

  it("lo recaudado llega al contrato y sale a la cartera del owner", async () => {
    await p.connect(ana).buyWithUsdt(U6("10000"), 0);
    await p.connect(luis).buyWithNative(0, { value: E("2") });

    expect(await usdt.balanceOf(await p.getAddress())).to.equal(U6("10000"));
    expect(await ethers.provider.getBalance(await p.getAddress())).to.equal(E("2"));

    const antesU = await usdt.balanceOf(owner.address);
    await p.withdrawUsdt(owner.address, 0);                 // 0 = todo
    expect(await usdt.balanceOf(owner.address) - antesU).to.equal(U6("10000"));

    const antesN = await ethers.provider.getBalance(luis.address);
    await p.withdrawNative(luis.address, 0);                // a la cartera que se diga
    expect(await ethers.provider.getBalance(luis.address) - antesN).to.equal(E("2"));
    expect(await ethers.provider.getBalance(await p.getAddress())).to.equal(0);
  });

  it("en pausa no se compra, y al reanudar sí", async () => {
    await p.pause();
    await expect(p.connect(ana).buyWithUsdt(U6("100"), 0))
      .to.be.revertedWithCustomError(p, "EnforcedPause");
    await p.unpause();
    await p.connect(ana).buyWithUsdt(U6("100"), 0);
    expect(await p.allocation(ana.address)).to.equal(E("500"));
  });
});
