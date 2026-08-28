/* Extraído del script de despliegue para poder probarlo. desplegar.js lo
   importa, así que las pruebas cubren el código real. */
const { ethers } = require("hardhat");

const ABI_ORACULO = [
  "function decimals() view returns (uint8)",
  "function description() view returns (string)",
  "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
];

async function verificar(direccion, cfg, proveedor) {
  const o = new ethers.Contract(direccion, ABI_ORACULO, proveedor);
  const fallos = [];

  const codigo = await proveedor.getCode(direccion);
  if (codigo === "0x") {
    fallos.push("no hay ningún contrato en esa dirección");
    return { fallos };
  }

  let desc = "(sin description)";
  try { desc = await o.description(); } catch { fallos.push("no responde a description()"); }

  let dec;
  try { dec = Number(await o.decimals()); }
  catch { fallos.push("no responde a decimals()"); return { fallos, desc }; }

  let precio, edad;
  try {
    const [, answer, , updatedAt] = await o.latestRoundData();
    if (answer <= 0n) fallos.push(`devuelve un precio no positivo (${answer})`);
    precio = Number(answer) / 10 ** dec;
    edad = Math.floor(Date.now() / 1000) - Number(updatedAt);
  } catch {
    fallos.push("no responde a latestRoundData()");
    return { fallos, desc, dec };
  }

  /* el par tiene que ser EXACTAMENTE el esperado: una dirección viva del par
     equivocado es el único error que no se ve venir */
  const limpia = (t) => t.replace(/\s+/g, "").toUpperCase();
  if (desc && limpia(desc) !== limpia(cfg.par)) {
    fallos.push(`el par es "${desc}" y se esperaba "${cfg.par}"`);
  }
  if (precio < cfg.minUsd || precio > cfg.maxUsd) {
    fallos.push(`precio ${precio.toFixed(2)} $ fuera de la banda razonable ` +
                `(${cfg.minUsd}-${cfg.maxUsd} $): casi seguro que es otro par`);
  }
  if (edad > 24 * 3600) {
    fallos.push(`el dato tiene ${Math.floor(edad / 3600)} h: el oráculo está parado`);
  }

  return { fallos, desc, dec, precio, edad };
}


module.exports = { verificar, ABI_ORACULO };
