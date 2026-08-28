const { expect } = require("chai");
const { ethers } = require("hardhat");
const USD = (n) => ethers.parseUnits(String(n), 8);

/* Se reutiliza la misma función del script de despliegue, para probar EL código
   que se va a ejecutar de verdad y no una copia parecida. */
const { verificar } = require("../scripts/verificador");

describe("verificación de oráculos antes de desplegar", () => {
  const cfg = { par: "ETH / USD", minUsd: 200, maxUsd: 50000 };
  let F;
  before(async () => { F = await ethers.getContractFactory("MockFeed"); });

  it("acepta un oráculo correcto", async () => {
    const f = await F.deploy(USD("3000"));
    const r = await verificar(await f.getAddress(), cfg, ethers.provider);
    expect(r.fallos).to.deep.equal([]);
    expect(r.precio).to.be.closeTo(3000, 1);
  });

  it("RECHAZA el par equivocado aunque el contrato esté vivo", async () => {
    const f = await F.deploy(USD("90000"));
    await f.setDescription("BTC / USD");
    const r = await verificar(await f.getAddress(), cfg, ethers.provider);
    expect(r.fallos.join(" ")).to.contain("BTC / USD");
    expect(r.fallos.join(" ")).to.contain("fuera de la banda");
  });

  it("RECHAZA un precio fuera de la banda razonable", async () => {
    const f = await F.deploy(USD("90000"));          // par correcto, precio absurdo
    const r = await verificar(await f.getAddress(), cfg, ethers.provider);
    expect(r.fallos.join(" ")).to.contain("fuera de la banda");
  });

  it("RECHAZA un oráculo parado", async () => {
    const f = await F.deploy(USD("3000"));
    await f.setStale(90000);
    const r = await verificar(await f.getAddress(), cfg, ethers.provider);
    expect(r.fallos.join(" ")).to.contain("parado");
  });

  it("RECHAZA un precio cero o negativo", async () => {
    const f = await F.deploy(0);
    const r = await verificar(await f.getAddress(), cfg, ethers.provider);
    expect(r.fallos.join(" ")).to.contain("no positivo");
  });

  it("RECHAZA una dirección sin contrato, como una errata", async () => {
    const r = await verificar("0x000000000000000000000000000000000000dEaD", cfg, ethers.provider);
    expect(r.fallos.join(" ")).to.contain("no hay ningún contrato");
  });

  it("RECHAZA un contrato que no es un oráculo", async () => {
    const t = await (await ethers.getContractFactory("MockToken")).deploy();
    const r = await verificar(await t.getAddress(), cfg, ethers.provider);
    expect(r.fallos.length).to.be.greaterThan(0);
  });
});
