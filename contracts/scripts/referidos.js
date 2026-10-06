/* ═══ Comisiones de referidos de la Seed Round ═══════════════════════════════
   La web pega al final de cada compra hecha desde un enlace de referido cuatro
   bytes de marca, «NRMR» (0x4e524d52), y la direccion de quien la trajo. El
   contrato no los lee; quedan en la cadena, en los datos de la transaccion.
   Este script recorre las compras (evento Purchased) de cada red, lee esos
   datos y calcula lo que se debe: el 10 % de lo pagado, en la MISMA moneda
   (ETH, BNB o USDT).

   Una compra cuenta como referida solo si:
     · la transaccion va directa al contrato de la venta, con buyWithNative o
       buyWithUsdt y sus argumentos exactos, y detras EXACTAMENTE la marca y una
       direccion (24 bytes);
     · el referidor no es el comprador (referirse a uno mismo no cuenta).

   Uso (desde contracts/):
     RPC_ETH=https://...  DESDE_ETH=<bloque>  RPC_BSC=https://...  DESDE_BSC=<bloque> \
       node scripts/referidos.js
   Deja en referidos/:
     · resumen.json            todo lo calculado, compra a compra
     · safe-ethereum.csv,
       safe-bnb.csv            lo pendiente, en el formato de la app «CSV Airdrop»
                               de Safe: se sube y se paga todo en un lote
   Lo ya pagado se apunta a mano en referidos/pagados.json
   ({"1":{"0xref":{"native":"wei","usdt":"unidades"}}, "56":{...}}) y se descuenta. */
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const VENTA = "0xaCbf1Add75139D0E926d57EC715FDaB8bee04A89";
const REDES = {
  1:  { nombre: "ethereum", simbolo: "ETH", usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7", usdtDec: 6 },
  56: { nombre: "bnb",      simbolo: "BNB", usdt: "0x55d398326f99059fF775485246999027B3197955", usdtDec: 18 },
};
const MARCA = "4e524d52";
const PCT = 10n;
const SEL_NATIVO = "0x31ad36ab", SEL_USDT = "0x7789e96e";
const ABI = ["event Purchased(address indexed buyer, bool paidInUsdt, uint256 paid, uint256 usdValue, uint256 tokens)"];

/* el referidor escrito al final de los datos, o null */
function leerReferidor(data) {
  data = (data || "").toLowerCase();
  const sel = data.slice(0, 10);
  const largo = sel === SEL_NATIVO ? 10 + 64 : sel === SEL_USDT ? 10 + 128 : -1;
  if (largo < 0) return null;
  const cola = data.slice(largo);
  if (cola.length !== 48 || !cola.startsWith(MARCA)) return null;
  return "0x" + cola.slice(8);
}

/* las compras referidas de una red, compra a compra */
async function calcular(provider, { venta = VENTA, desde = 0, hasta = "latest", paso = 5000 } = {}) {
  const c = new ethers.Contract(venta, ABI, provider);
  const fin = hasta === "latest" ? await provider.getBlockNumber() : hasta;
  const compras = [];
  for (let a = desde; a <= fin; a += paso) {
    const b = Math.min(fin, a + paso - 1);
    for (const ev of await c.queryFilter(c.filters.Purchased(), a, b)) {
      const tx = await provider.getTransaction(ev.transactionHash);
      if (!tx || (tx.to || "").toLowerCase() !== venta.toLowerCase()) continue;
      const ref = leerReferidor(tx.data);
      if (!ref) continue;
      const comprador = ev.args.buyer.toLowerCase();
      const propio = ref === comprador || ref === tx.from.toLowerCase();
      compras.push({
        tx: ev.transactionHash, bloque: ev.blockNumber, comprador, referidor: ref,
        moneda: ev.args.paidInUsdt ? "usdt" : "native",
        pagado: ev.args.paid.toString(), usd8: ev.args.usdValue.toString(),
        comision: propio ? "0" : (ev.args.paid * PCT / 100n).toString(),
        excluida: propio ? "se refiere a si mismo" : null,
      });
    }
  }
  return compras;
}

/* lo que se debe a cada referidor, por moneda, descontando lo pagado */
function deudas(compras, pagados = {}) {
  const d = {};
  for (const x of compras) {
    if (x.excluida) continue;
    const r = (d[x.referidor] ??= { native: 0n, usdt: 0n, compras: 0 });
    r[x.moneda] += BigInt(x.comision); r.compras++;
  }
  for (const [ref, p] of Object.entries(pagados)) {
    const r = d[ref.toLowerCase()]; if (!r) continue;
    r.native -= BigInt(p.native || 0); r.usdt -= BigInt(p.usdt || 0);
    if (r.native < 0n) r.native = 0n; if (r.usdt < 0n) r.usdt = 0n;
  }
  return d;
}

/* el CSV de la app «CSV Airdrop» de Safe: token_type,token_address,receiver,amount,id */
function csvSafe(deuda, red) {
  const filas = ["token_type,token_address,receiver,amount,id"];
  for (const [ref, r] of Object.entries(deuda)) {
    if (r.native > 0n) filas.push(`native,,${ethers.getAddress(ref)},${ethers.formatUnits(r.native, 18)},`);
    if (r.usdt > 0n) filas.push(`erc20,${red.usdt},${ethers.getAddress(ref)},${ethers.formatUnits(r.usdt, red.usdtDec)},`);
  }
  return filas.join("\n") + "\n";
}

async function main() {
  const dir = path.join(__dirname, "..", "referidos");
  fs.mkdirSync(dir, { recursive: true });
  let pagados = {};
  try { pagados = JSON.parse(fs.readFileSync(path.join(dir, "pagados.json"), "utf8")); } catch (e) {}
  const resumen = {};
  for (const [id, red] of Object.entries(REDES)) {
    const rpc = process.env[id === "1" ? "RPC_ETH" : "RPC_BSC"];
    if (!rpc) { console.log(red.nombre + ": sin RPC, se salta"); continue; }
    const desde = Number(process.env[id === "1" ? "DESDE_ETH" : "DESDE_BSC"] || 0);
    const compras = await calcular(new ethers.JsonRpcProvider(rpc), { desde });
    const d = deudas(compras, pagados[id] || {});
    fs.writeFileSync(path.join(dir, `safe-${red.nombre}.csv`), csvSafe(d, red));
    resumen[id] = {
      red: red.nombre, compras,
      deudas: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, {
        [red.simbolo]: ethers.formatUnits(v.native, 18), USDT: ethers.formatUnits(v.usdt, red.usdtDec), compras: v.compras }])),
    };
    console.log(`${red.nombre}: ${compras.length} compras referidas, ${Object.keys(d).length} referidores`);
  }
  fs.writeFileSync(path.join(dir, "resumen.json"), JSON.stringify(resumen, null, 2) + "\n");
}

module.exports = { leerReferidor, calcular, deudas, csvSafe, MARCA };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
