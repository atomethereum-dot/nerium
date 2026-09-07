const { expect } = require("chai");
const { ethers } = require("hardhat");

const USD = (n) => ethers.parseUnits(String(n), 8);

/* La misma dirección en Ethereum y en BNB Chain no es magia: la dirección de un
   contrato sale de QUIEN lo despliega y de su NONCE, y de nada más. Ni del
   código ni de los argumentos del constructor. Estas pruebas fijan esa
   propiedad, que es de lo que depende el despliegue en dos redes.            */
describe("Seed Round · misma dirección en las dos redes", function () {
  let dueño, usdt6, usdt18, feed, P;

  const nueva = async () => {
    const w = ethers.Wallet.createRandom().connect(ethers.provider);
    await dueño.sendTransaction({ to: w.address, value: ethers.parseEther("10") });
    return w;                       // recibir gas NO gasta nonce
  };

  beforeEach(async () => {
    [dueño] = await ethers.getSigners();
    const U = await ethers.getContractFactory("MockUSDT");
    usdt6  = await U.deploy(6);     // USDT de Ethereum
    usdt18 = await U.deploy(18);    // USDT de BNB Chain
    feed = await (await ethers.getContractFactory("MockFeed")).deploy(USD("3000"));
    P = await ethers.getContractFactory("NereumSeedRound");
  });

  it("una cartera nueva tiene nonce 0, aunque le manden gas", async () => {
    const w = await nueva();
    expect(await ethers.provider.getTransactionCount(w.address)).to.equal(0);
  });

  it("cae exactamente en la dirección que se calcula ANTES de desplegar", async () => {
    const w = await nueva();
    const prevista = ethers.getCreateAddress({ from: w.address, nonce: 0 });
    const p = await P.connect(w).deploy(await usdt6.getAddress(), [await feed.getAddress()],
      18, w.address, USD("0.2"), USD("0.2"), USD("10000"));
    await p.waitForDeployment();
    expect(await p.getAddress()).to.equal(prevista);
  });

  it("LOS ARGUMENTOS DEL CONSTRUCTOR NO CAMBIAN LA DIRECCIÓN", async () => {
    /* Es lo que permite usar el USDT y el oráculo de cada red y aun así caer
       en la misma dirección. Dos carteras nuevas, argumentos distintos: cada
       una cae en la dirección que le corresponde por emisor y nonce. */
    const wA = await nueva(), wB = await nueva();
    const prevA = ethers.getCreateAddress({ from: wA.address, nonce: 0 });
    const prevB = ethers.getCreateAddress({ from: wB.address, nonce: 0 });

    const a = await P.connect(wA).deploy(await usdt6.getAddress(), [await feed.getAddress()],
      18, wA.address, USD("0.2"), USD("0.2"), USD("10000"));
    const b = await P.connect(wB).deploy(await usdt18.getAddress(), [await feed.getAddress()],
      18, wB.address, USD("0.5"), USD("1"), 0);          // otra economía, otro USDT
    await a.waitForDeployment(); await b.waitForDeployment();

    expect(await a.getAddress()).to.equal(prevA);
    expect(await b.getAddress()).to.equal(prevB);
    /* y la prevista se calcula sin mirar los argumentos: solo emisor y nonce */
    expect(ethers.getCreateAddress({ from: wA.address, nonce: 0 })).to.equal(prevA);
  });

  it("con el nonce gastado la dirección YA NO coincide: por eso se exige 0", async () => {
    const w = await nueva();
    await w.sendTransaction({ to: dueño.address, value: 1 });   // gasta el nonce 0
    expect(await ethers.provider.getTransactionCount(w.address)).to.equal(1);

    const conCero = ethers.getCreateAddress({ from: w.address, nonce: 0 });
    const p = await P.connect(w).deploy(await usdt6.getAddress(), [await feed.getAddress()],
      18, w.address, USD("0.2"), USD("0.2"), USD("10000"));
    await p.waitForDeployment();
    expect(await p.getAddress()).to.not.equal(conCero);
  });

  it("la propiedad se queda en la cartera que despliega", async () => {
    const w = await nueva();
    const p = await P.connect(w).deploy(await usdt6.getAddress(), [await feed.getAddress()],
      18, w.address, USD("0.2"), USD("0.2"), USD("10000"));
    await p.waitForDeployment();
    expect(await p.owner()).to.equal(w.address);
    expect(await p.pendingOwner()).to.equal(ethers.ZeroAddress);
  });

  it("y se pasa a un multisig en dos pasos, cuando se decida", async () => {
    const [, multisig] = await ethers.getSigners();
    const w = await nueva();
    const p = await P.connect(w).deploy(await usdt6.getAddress(), [await feed.getAddress()],
      18, w.address, USD("0.2"), USD("0.2"), USD("10000"));
    await p.waitForDeployment();

    await p.connect(w).transferOwnership(multisig.address);
    expect(await p.owner()).to.equal(w.address);              // todavía manda el deployer
    expect(await p.pendingOwner()).to.equal(multisig.address);

    await p.connect(multisig).acceptOwnership();
    expect(await p.owner()).to.equal(multisig.address);
    await expect(p.connect(w).pause())
      .to.be.revertedWithCustomError(p, "OwnableUnauthorizedAccount");
  });
});
