require("@nomicfoundation/hardhat-toolbox");
/* Copia .env.ejemplo a .env y rellena las dos variables. NUNCA subas .env. */
require("dotenv").config();

const CLAVE = process.env.CLAVE_PRIVADA ? [process.env.CLAVE_PRIVADA] : [];

module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    ethereum: { url: process.env.RPC_ETHEREUM || "", accounts: CLAVE, chainId: 1 },
    bsc:      { url: process.env.RPC_BSC || "",      accounts: CLAVE, chainId: 56 },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.API_ETHERSCAN || "",
      bsc: process.env.API_BSCSCAN || "",
    },
  },
};
