/**
 * Genera remix/NereumSeedRound_plano.sol: el contrato en un solo archivo, con
 * OpenZeppelin dentro y SIN COMENTARIOS (asi se pidio el codigo que se publica
 * en Etherscan y BscScan). Solo queda la linea de licencia y un pragma.
 *
 *   npx hardhat run scripts/plano.js
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/* Quita // y /* *\/ respetando las cadenas; conserva solo la linea SPDX. */
function sinComentarios(src) {
  let out = "", i = 0, enCadena = null;
  while (i < src.length) {
    const c = src[i];
    if (enCadena) {
      out += c;
      if (c === "\\") { out += src[i + 1]; i += 2; continue; }
      if (c === enCadena) enCadena = null;
      i++; continue;
    }
    if (c === '"' || c === "'") { enCadena = c; out += c; i++; continue; }
    if (src.startsWith("//", i)) {
      let j = src.indexOf("\n", i); if (j < 0) j = src.length;
      const linea = src.slice(i, j);
      if (linea.startsWith("// SPDX-License-Identifier")) out += linea;
      i = j; continue;
    }
    if (src.startsWith("/*", i)) { i = src.indexOf("*/", i + 2) + 2; continue; }
    out += c; i++;
  }
  return out.split("\n").map((l) => l.trimEnd()).join("\n")
    .replace(/\n{3,}/g, "\n\n").replace(/\{\n\n/g, "{\n").replace(/\n\n(\s*\})/g, "\n$1").trim() + "\n";
}

async function main() {
  const plano = await hre.run("flatten:get-flattened-sources", { files: ["src/NereumSeedRound.sol"] });
  const cuerpo = sinComentarios(plano)
    .replace(/^\/\/ SPDX-License-Identifier:.*\n/gm, "")
    .replace(/^pragma solidity [^;]+;\n/gm, "")
    .replace(/\n{3,}/g, "\n\n").trim();
  const destino = path.join(__dirname, "..", "remix", "NereumSeedRound_plano.sol");
  fs.writeFileSync(destino, "// SPDX-License-Identifier: MIT\npragma solidity 0.8.24;\n\n" + cuerpo + "\n");
  console.log("escrito", path.relative(process.cwd(), destino));
}

main().catch((e) => { console.error(e); process.exit(1); });
