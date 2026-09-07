/* Vuelca el ABI del contrato a la raíz, que es lo que consume la web.
   npm run abi                                                          */
const fs = require("fs");
const art = require("../artifacts/src/NereumSeedRound.sol/NereumSeedRound.json");
fs.writeFileSync("NereumSeedRound.abi.json", JSON.stringify(art.abi, null, 2) + "\n");
console.log("NereumSeedRound.abi.json ·", art.abi.length, "entradas");
