const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const E = ethers.parseEther;
const U6 = (n) => ethers.parseUnits(String(n), 6);

describe("NereumPresale", function () {
  let owner, ana, luis, tesoreria, usdt, token, p;
  const PRECIO_NATIVO = E("0.0005");   // 0,0005 ETH por token
  const PRECIO_USDT   = U6("1.5");     // 1,50 USDT por token

  beforeEach(async () => {
    [owner, ana, luis, tesoreria] = await ethers.getSigners();
    usdt  = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
    token = await (await ethers.getContractFactory("MockToken")).deploy();
    p = await (await ethers.getContractFactory("NereumPresale"))
          .deploy(await usdt.getAddress(), 18, owner.address);
    for (const u of [ana, luis]) {
      await usdt.transfer(u.address, U6("100000"));
      await usdt.connect(u).approve(await p.getAddress(), ethers.MaxUint256);
    }
  });

  const abrir = async (dur = 3600) => {
    await p.setPrices(PRECIO_NATIVO, PRECIO_USDT);
    await p.startPresale(0, (await time.latest()) + dur);
  };

  it("no deja comprar antes de abrir", async () => {
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "PresaleNotLive");
  });

  it("no deja programar sin precios", async () => {
    await expect(p.startPresale(0, (await time.latest()) + 100))
      .to.be.revertedWithCustomError(p, "PriceNotSet");
  });

  it("calcula bien los tokens en moneda nativa", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(ana.address)).to.equal(E("2000"));   // 1 / 0,0005
  });

  it("calcula bien los tokens en USDT de 6 decimales", async () => {
    await abrir();
    await p.connect(ana).buyWithUsdt(U6("150"), 0);
    expect(await p.allocation(ana.address)).to.equal(E("100"));    // 150 / 1,5
  });

  it("funciona igual con USDT de 18 decimales, como en BNB Chain", async () => {
    const usdt18 = await (await ethers.getContractFactory("MockUSDT")).deploy(18);
    const p2 = await (await ethers.getContractFactory("NereumPresale"))
      .deploy(await usdt18.getAddress(), 18, owner.address);
    await usdt18.transfer(ana.address, E("10000"));
    await usdt18.connect(ana).approve(await p2.getAddress(), ethers.MaxUint256);
    await p2.setPrices(PRECIO_NATIVO, E("1.5"));
    await p2.startPresale(0, (await time.latest()) + 3600);
    await p2.connect(ana).buyWithUsdt(E("150"), 0);
    expect(await p2.allocation(ana.address)).to.equal(E("100"));
  });

  it("protege al comprador si el precio cambia bajo sus pies", async () => {
    await abrir();
    const esperado = await p.quoteNative(E("1"));
    await p.setPrices(E("0.001"), PRECIO_USDT);            // el precio sube al doble
    await expect(p.connect(ana).buyWithNative(esperado, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "SlippageTooHigh");
  });

  it("respeta el tope", async () => {
    await abrir();
    await p.setHardCap(E("2000"));
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await expect(p.connect(luis).buyWithNative(0, { value: E("0.001") }))
      .to.be.revertedWithCustomError(p, "HardCapReached");
  });

  it("rechaza envíos directos sin protección de precio", async () => {
    await abrir();
    await expect(ana.sendTransaction({ to: await p.getAddress(), value: E("1") }))
      .to.be.revertedWithCustomError(p, "UseBuyFunction");
  });

  it("cierra y no se puede reabrir", async () => {
    await abrir();
    await p.endPresale();
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "PresaleNotLive");
    await expect(p.startPresale(0, (await time.latest()) + 100))
      .to.be.revertedWithCustomError(p, "PresaleAlreadyFinalized");
  });

  it("cierra sola al llegar la fecha", async () => {
    await abrir(100);
    await time.increase(200);
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "PresaleNotLive");
  });

  it("no abre el reparto sin tokens suficientes depositados", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.setSaleToken(await token.getAddress());
    await expect(p.openClaims()).to.be.revertedWithCustomError(p, "NotEnoughTokensDeposited");
    await token.transfer(await p.getAddress(), E("2000"));
    await p.openClaims();
  });

  it("reparte una sola vez", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.setSaleToken(await token.getAddress());
    await token.transfer(await p.getAddress(), E("2000"));
    await p.openClaims();
    await p.connect(ana).claim();
    expect(await token.balanceOf(ana.address)).to.equal(E("2000"));
    await expect(p.connect(ana).claim()).to.be.revertedWithCustomError(p, "NothingToClaim");
  });

  it("el dueño NO puede tocar los tokens debidos a los compradores", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.setSaleToken(await token.getAddress());
    await token.transfer(await p.getAddress(), E("2500"));      // 2000 debidos + 500 sobrantes
    await expect(p.withdrawUnsoldTokens(tesoreria.address, E("600")))
      .to.be.revertedWithCustomError(p, "CannotTouchBuyersTokens");
    await p.withdrawUnsoldTokens(tesoreria.address, E("500"));  // solo lo sobrante
    expect(await token.balanceOf(tesoreria.address)).to.equal(E("500"));
  });

  it("retira lo recaudado a la tesorería", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("3") });
    await p.connect(luis).buyWithUsdt(U6("1500"), 0);
    const antes = await ethers.provider.getBalance(tesoreria.address);
    await p.withdrawNative(tesoreria.address, 0);
    await p.withdrawUsdt(tesoreria.address, 0);
    expect((await ethers.provider.getBalance(tesoreria.address)) - antes).to.equal(E("3"));
    expect(await usdt.balanceOf(tesoreria.address)).to.equal(U6("1500"));
  });

  it("solo el dueño administra", async () => {
    for (const llamada of [
      p.connect(ana).setPrices(1, 1),
      p.connect(ana).startPresale(0, 9999999999),
      p.connect(ana).endPresale(),
      p.connect(ana).withdrawNative(ana.address, 0),
      p.connect(ana).withdrawUsdt(ana.address, 0),
    ]) await expect(llamada).to.be.revertedWithCustomError(p, "OwnableUnauthorizedAccount");
  });

  it("la pausa detiene las compras sin cerrar la venta", async () => {
    await abrir();
    await p.pause();
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "EnforcedPause");
    await p.unpause();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
  });

  it("rechaza un token de venta con decimales que no cuadran", async () => {
    const raro = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
    await expect(p.setSaleToken(await raro.getAddress()))
      .to.be.revertedWithCustomError(p, "NotEnoughTokensDeposited");
  });
});
