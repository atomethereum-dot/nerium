require("@nomicfoundation/hardhat-toolbox");
const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

/* El compilador viene de npm (solc, fijado en package.json) y no de una
   descarga. Dos motivos: la compilacion sale igual en cualquier maquina y en
   cualquier momento, y no depende de que binaries.soliditylang.org este
   accesible desde donde se construya. */
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.24") {
    return {
      compilerPath: require.resolve("solc/soljson.js"),
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: "0.8.24+commit.e11b9ed9",
    };
  }
  return runSuper();
});
/* Copia .env.ejemplo a .env y rellena las dos variables. NUNCA subas .env. */
require("dotenv").config();

const CLAVE = process.env.CLAVE_PRIVADA ? [process.env.CLAVE_PRIVADA] : [];

module.exports = {
  /* Los .sol viven en src/: con sources en la raiz, hardhat se pondria a
     rastrear node_modules entero buscando contratos. */
  paths: { sources: "./src", tests: "./test" },
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    ethereum: { url: process.env.RPC_ETHEREUM || "", accounts: CLAVE, chainId: 1 },
    bsc:      { url: process.env.RPC_BSC || "",      accounts: CLAVE, chainId: 56 },
    /* Robinhood Chain: L2 de Arbitrum Orbit, gas en ether, cadena 4663. */
    robinhood: {
      url: process.env.RPC_ROBINHOOD || "https://rpc.mainnet.chain.robinhood.com",
      accounts: CLAVE, chainId: 4663,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.API_ETHERSCAN || "",
      bsc: process.env.API_BSCSCAN || "",
      /* El explorador oficial de Robinhood Chain es Blockscout, que no pide
         clave. hardhat-verify exige igualmente una cadena no vacia. */
      robinhood: "blockscout",
    },
    /* Blockscout no esta en la lista que trae hardhat-verify, asi que su
       cadena se declara a mano. Con el bloque `etherscan` normal no vale:
       son APIs distintas aunque se parezcan. */
    customChains: [
      {
        network: "robinhood",
        chainId: 4663,
        urls: {
          apiURL: "https://robinhoodchain.blockscout.com/api",
          browserURL: "https://robinhoodchain.blockscout.com",
        },
      },
    ],
  },
};
