const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const E = ethers.parseEther;
const U6 = (n) => ethers.parseUnits(String(n), 6);
const USD = (n) => ethers.parseUnits(String(n), 8);   // dólares con 8 decimales

describe("NereumFundingRound", function () {
  let owner, ana, luis, tesoreria, usdt, feed, feed2, feed3, token, p;
  const PRECIO = USD("0.10");        // 0,10 $ por NRM, como dice la web
  const MINIMO = USD("1");           // 1 $ mínimo

  beforeEach(async () => {
    [owner, ana, luis, tesoreria] = await ethers.getSigners();
    usdt  = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
    const F = await ethers.getContractFactory("MockFeed");
    feed  = await F.deploy(USD("3000"));      // principal: ETH a 3.000 $
    feed2 = await F.deploy(USD("2900"));      // segundo proveedor
    feed3 = await F.deploy(USD("2800"));      // tercero
    token = await (await ethers.getContractFactory("MockToken")).deploy();
    p = await (await ethers.getContractFactory("NereumFundingRound")).deploy(
      await usdt.getAddress(),
      [await feed.getAddress(), await feed2.getAddress(), await feed3.getAddress()],
      18, owner.address);
    for (const u of [ana, luis]) {
      await usdt.transfer(u.address, U6("1000000"));
      await usdt.connect(u).approve(await p.getAddress(), ethers.MaxUint256);
    }
  });

  const abrir = async (dur = 3600) => {
    await p.setPriceUsd(PRECIO);
    await p.setMinBuyUsd(MINIMO);
    await p.startRound(0, (await time.latest()) + dur);
  };

  it("el precio en dólares es un solo número para las dos redes", async () => {
    await abrir();
    // 1 ETH a 3.000 $ / 0,10 $ = 30.000 NRM
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(ana.address)).to.equal(E("30000"));
    // 100 USDT / 0,10 $ = 1.000 NRM
    await p.connect(luis).buyWithUsdt(U6("100"), 0);
    expect(await p.allocation(luis.address)).to.equal(E("1000"));
  });

  it("EL PRECIO SIGUE AL DÓLAR: si ETH sube, se dan menos tokens", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(ana.address)).to.equal(E("30000"));

    await feed.set(USD("6000"));                     // ETH se dobla
    await p.connect(luis).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(luis.address)).to.equal(E("60000"));   // el doble de NRM
    // los dos pagaron 1 ETH; el segundo pagó el doble en dólares y recibió el doble
  });

  it("si ETH baja, se dan más tokens por el mismo ETH", async () => {
    await abrir();
    await feed.set(USD("1500"));
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(ana.address)).to.equal(E("15000"));
  });

  it("SIGUE VENDIENDO: si el primero está rancio, usa el segundo", async () => {
    await abrir();
    await feed.setStale(90000);
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.emit(p, "OracleFellBack").withArgs(1, USD("2900"));
    expect(await p.allocation(ana.address)).to.equal(E("29000"));   // 2.900 / 0,10
  });

  it("SIGUE VENDIENDO: si caen los dos primeros, usa el tercero", async () => {
    await abrir();
    await feed.setStale(90000);
    await feed2.set(0);
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.emit(p, "OracleFellBack").withArgs(2, USD("2800"));
    expect(await p.allocation(ana.address)).to.equal(E("28000"));
  });

  it("SIGUE VENDIENDO aunque un oráculo reviente entero: salta al siguiente", async () => {
    const roto = await (await ethers.getContractFactory("MockFeedRoto")).deploy();
    const F = await ethers.getContractFactory("MockFeed");
    const bueno = await F.deploy(USD("3000"));
    const p2 = await (await ethers.getContractFactory("NereumFundingRound")).deploy(
      await usdt.getAddress(), [await roto.getAddress(), await bueno.getAddress()],
      18, owner.address);
    await p2.setPriceUsd(PRECIO);
    await p2.startRound(0, (await time.latest()) + 3600);
    await p2.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p2.allocation(ana.address)).to.equal(E("30000"));
  });

  it("SIGUE VENDIENDO aunque caigan LOS TRES, con el último precio guardado", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });      // guarda 3.000 $
    for (const f of [feed, feed2, feed3]) await f.setStale(90000);
    await expect(p.connect(luis).buyWithNative(0, { value: E("1") }))
      .to.emit(p, "AllOraclesDown");
    expect(await p.allocation(luis.address)).to.equal(E("30000"));  // el guardado
  });

  it("vuelve solo al primero en cuanto se recupera", async () => {
    await abrir();
    await feed.setStale(90000);
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(ana.address)).to.equal(E("29000"));   // el segundo
    await feed.set(USD("3000"));
    await p.connect(luis).buyWithNative(0, { value: E("1") });
    expect(await p.allocation(luis.address)).to.equal(E("30000"));  // el primero otra vez
  });

  it("feedsStatus dice exactamente cuál está fallando", async () => {
    await abrir();
    await feed2.setStale(90000);
    const [dirs, precios, sanos] = await p.feedsStatus();
    expect(dirs.length).to.equal(3);
    expect(sanos[0]).to.equal(true);
    expect(sanos[1]).to.equal(false);          // el segundo, señalado
    expect(sanos[2]).to.equal(true);
    expect(precios[0]).to.equal(USD("3000"));
  });

  it("no acepta una lista de oráculos vacía ni toda muerta", async () => {
    await expect(p.setFeeds([])).to.be.revertedWithCustomError(p, "NoFeeds");
    const roto = await (await ethers.getContractFactory("MockFeedRoto")).deploy();
    await expect(p.setFeeds([await roto.getAddress()]))
      .to.be.revertedWithCustomError(p, "NoPriceAvailable");
  });

  it("se adapta a un oráculo con otros decimales", async () => {
    const f18 = await (await ethers.getContractFactory("MockFeed")).deploy(E("3000"));
    await f18.setDecimals(18);
    const p2 = await (await ethers.getContractFactory("NereumFundingRound"))
      .deploy(await usdt.getAddress(), [await f18.getAddress()], 18, owner.address);
    await p2.setPriceUsd(PRECIO);
    await p2.startRound(0, (await time.latest()) + 3600);
    await p2.connect(ana).buyWithNative(0, { value: E("1") });
    expect(await p2.allocation(ana.address)).to.equal(E("30000"));
  });

  it("respeta la compra mínima en dólares", async () => {
    await abrir();
    await expect(p.connect(ana).buyWithUsdt(U6("0.5"), 0))
      .to.be.revertedWithCustomError(p, "BelowMinimum");
    await p.connect(ana).buyWithUsdt(U6("1"), 0);
  });

  it("EL REPARTO SOLO SE ABRE AL TERMINAR LA RONDA", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.setSaleToken(await token.getAddress());
    await token.transfer(await p.getAddress(), E("30000"));

    await expect(p.openClaims()).to.be.revertedWithCustomError(p, "RoundNotOver");
    await expect(p.connect(ana).claim()).to.be.revertedWithCustomError(p, "ClaimsNotOpen");

    await p.endRound();
    await p.openClaims();
    await p.connect(ana).claim();
    expect(await token.balanceOf(ana.address)).to.equal(E("30000"));
  });

  it("también se abre si la ronda vence por fecha", async () => {
    await abrir(100);
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.setSaleToken(await token.getAddress());
    await token.transfer(await p.getAddress(), E("30000"));
    await expect(p.openClaims()).to.be.revertedWithCustomError(p, "RoundNotOver");
    await time.increase(200);
    await p.openClaims();
  });

  it("no abre el reparto sin los tokens depositados", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.endRound();
    await p.setSaleToken(await token.getAddress());
    await expect(p.openClaims()).to.be.revertedWithCustomError(p, "NotEnoughTokensDeposited");
  });

  it("protege al comprador del movimiento del oráculo", async () => {
    await abrir();
    const esperado = await p.quoteNative(E("1"));
    await feed.set(USD("1500"));                     // ETH se desploma a la mitad
    await expect(p.connect(ana).buyWithNative(esperado, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "SlippageTooHigh");
  });

  it("reparte una sola vez", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.endRound();
    await p.setSaleToken(await token.getAddress());
    await token.transfer(await p.getAddress(), E("30000"));
    await p.openClaims();
    await p.connect(ana).claim();
    await expect(p.connect(ana).claim()).to.be.revertedWithCustomError(p, "NothingToClaim");
  });

  it("el dueño NO puede tocar los tokens debidos", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await p.setSaleToken(await token.getAddress());
    await token.transfer(await p.getAddress(), E("30500"));
    await expect(p.withdrawUnsoldTokens(tesoreria.address, E("600")))
      .to.be.revertedWithCustomError(p, "CannotTouchBuyersTokens");
    await p.withdrawUnsoldTokens(tesoreria.address, E("500"));
    expect(await token.balanceOf(tesoreria.address)).to.equal(E("500"));
  });

  it("retira lo recaudado", async () => {
    await abrir();
    await p.connect(ana).buyWithNative(0, { value: E("3") });
    await p.connect(luis).buyWithUsdt(U6("1500"), 0);
    const antes = await ethers.provider.getBalance(tesoreria.address);
    await p.withdrawNative(tesoreria.address, 0);
    await p.withdrawUsdt(tesoreria.address, 0);
    expect((await ethers.provider.getBalance(tesoreria.address)) - antes).to.equal(E("3"));
    expect(await usdt.balanceOf(tesoreria.address)).to.equal(U6("1500"));
  });

  it("respeta el tope", async () => {
    await abrir();
    await p.setHardCap(E("30000"));
    await p.connect(ana).buyWithNative(0, { value: E("1") });
    await expect(p.connect(luis).buyWithUsdt(U6("100"), 0))
      .to.be.revertedWithCustomError(p, "HardCapReached");
  });

  it("cierra, y no se reabre", async () => {
    await abrir();
    await p.endRound();
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "RoundNotLive");
    await expect(p.startRound(0, (await time.latest()) + 100))
      .to.be.revertedWithCustomError(p, "RoundAlreadyFinalized");
  });

  it("rechaza envíos directos", async () => {
    await abrir();
    await expect(ana.sendTransaction({ to: await p.getAddress(), value: E("1") }))
      .to.be.revertedWithCustomError(p, "UseBuyFunction");
  });

  it("la pausa detiene sin cerrar", async () => {
    await abrir();
    await p.pause();
    await expect(p.connect(ana).buyWithNative(0, { value: E("1") }))
      .to.be.revertedWithCustomError(p, "EnforcedPause");
    await p.unpause();
    await p.connect(ana).buyWithNative(0, { value: E("1") });
  });

  it("rechaza un token con decimales que no cuadran", async () => {
    const raro = await (await ethers.getContractFactory("MockUSDT")).deploy(6);
    await expect(p.setSaleToken(await raro.getAddress()))
      .to.be.revertedWithCustomError(p, "WrongTokenDecimals");
  });

  it("solo el dueño administra", async () => {
    for (const llamada of [
      p.connect(ana).setPriceUsd(1), p.connect(ana).setFeeds([]), p.connect(ana).startRound(0, 9999999999),
      p.connect(ana).endRound(),   p.connect(ana).openClaims(),
      p.connect(ana).withdrawNative(ana.address, 0), p.connect(ana).withdrawUsdt(ana.address, 0),
    ]) await expect(llamada).to.be.revertedWithCustomError(p, "OwnableUnauthorizedAccount");
  });

  it("la web puede preguntar cuánto ETH son 100 $", async () => {
    await abrir();
    expect(await p.nativeForUsd(USD("3000"))).to.equal(E("1"));
  });
});
