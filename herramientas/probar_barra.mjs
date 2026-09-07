
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8938,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const E18=10n**18n;
function tabla(vendidos, tope=0n){return {
 '0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),
 '0x3fbb3d1d':'0x'+w(20000000n),'0x4194fdd1':'0x'+w(1000000000000n),
 '0x63b20117':'0x'+w(vendidos),'0x4b749535':'0x'+w(tope),
 '0xb8f7a665':'0x'+w(1),'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),
 '0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
 '0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};}

const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});
async function ver(eth,bsc){
 const ctx=await nav.newContext({viewport:{width:1400,height:1000}});
 await ctx.addInitScript(({eth,bsc})=>{const of=window.fetch;
  window.fetch=async(u,o)=>{const url=String(u);
   if(url.indexOf('explorer-api')>=0)return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
   if(!o||!o.body)return of(u,o); const j=JSON.parse(o.body);
   const t=/bsc|binance|defibit/.test(url)?bsc:eth; let res=null;
   if(j.method==='eth_call')res=t[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
   return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
 },{eth,bsc});
 const pg=await ctx.newPage();
 await pg.goto('http://127.0.0.1:8938/index.html',{waitUntil:'load'});
 await pg.locator('#presale').scrollIntoViewIfNeeded();
 await pg.waitForTimeout(3200);
 return {ctx,pg};
}
// sin ventas en cadena: solo la privada
{ const {ctx,pg}=await ver(tabla(0n),tabla(0n));
  chk('sin ventas, solo la privada', await pg.locator('#saleRaised').textContent(), '$13,616,000');
  chk('objetivo de la pagina', await pg.locator('#saleRaised + span').textContent(), 'raised of $16,000,000');
  await ctx.close(); }
// 1.000.000 NRM en Ethereum + 500.000 en BSC = $300.000
{ const {ctx,pg}=await ver(tabla(1000000n*E18),tabla(500000n*E18));
  chk('suma lo vendido en las dos redes', await pg.locator('#saleRaised').textContent(), '$13,916,000');
  chk('y el porcentaje sube', await pg.locator('#saleTip em').textContent(), '87.0%');
  await ctx.close(); }
// con hard cap puesto, el objetivo sale de la cadena
{ const {ctx,pg}=await ver(tabla(1000000n*E18, 11920000n*E18), tabla(0n));
  chk('el objetivo lo marca el hard cap', await pg.locator('#saleRaised + span').textContent(), 'raised of $16,000,000');
  await ctx.close(); }
// una compra pequena mueve la cifra, aunque poco
{ const {ctx,pg}=await ver(tabla(50000n*E18),tabla(0n));
  chk('$10.000 de ventas se ven', await pg.locator('#saleRaised').textContent(), '$13,626,000');
  await ctx.close(); }
await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
