import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8940,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({viewport:{width:1400,height:900}});
await ctx.addInitScript(({R})=>{const of=window.fetch;
 window.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('explorer-api')>=0)return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
  if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);let res=null;
  if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
},{R});
const pg=await ctx.newPage();
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

await pg.goto('http://127.0.0.1:8940/index.html',{waitUntil:'load'});
await pg.waitForTimeout(1800);

// ── el importe arranca vacío ─────────────────────────────────────────────────
await pg.locator('#presale').scrollIntoViewIfNeeded();
await pg.waitForTimeout(1800);
await pg.locator('#presale .widget').screenshot({path:'/tmp/vacio.png'});
await pg.locator('#wPay').screenshot({path:'/tmp/monedas.png'});
// Cinco medios: ETH · BNB · ETH en Robinhood arriba, y los dos USDT abajo.
chk('cada botón lleva su moneda', await pg.locator('#wPay .nrm-mon').count(), 5);
// La insignia de red ya no es «la de los USDT»: la lleva el botón que no se
// explica con su moneda. En Robinhood Chain la moneda de red tambien es ETH,
// asi que sin insignia ese boton seria identico al de Ethereum.
chk('la insignia la llevan los tres que no se explican solos',
    await pg.locator('#wPay .nrm-mon .red').count(), 3);
chk('el ETH de Robinhood la lleva verde',
    await pg.locator('#wPay button').nth(2).locator('.red circle').getAttribute('fill'), '#00C805');
// Ahi iba una «R» mientras no se tuvo el vector. Ya es la pluma: si alguien
// vuelve a la inicial, estas dos lo dicen.
chk('   y dentro va la pluma, no una inicial',
    await pg.locator('#wPay button').nth(2).locator('.red path').count(), 1);
chk('   sin texto en la insignia',
    await pg.locator('#wPay button').nth(2).locator('.red text').count(), 0);
chk('la del USDT de Ethereum es Ethereum',
    await pg.locator('#wPay button').nth(3).locator('.red circle').getAttribute('fill'), '#627EEA');
chk('la del USDT de BNB es BNB',
    await pg.locator('#wPay button').nth(4).locator('.red circle').getAttribute('fill'), '#F0B90B');
chk('el primero es ETH',
    await pg.locator('#wPay button').nth(0).locator('.nrm-mon > svg > circle').getAttribute('fill'), '#627EEA');
chk('el segundo BNB',
    await pg.locator('#wPay button').nth(1).locator('.nrm-mon > svg > circle').getAttribute('fill'), '#F0B90B');
chk('el tercero ETH otra vez, que en Robinhood el gas es ether',
    await pg.locator('#wPay button').nth(2).locator('.nrm-mon > svg > circle').getAttribute('fill'), '#627EEA');
chk('y los dos USDT en verde',
    await pg.locator('#wPay button').nth(3).locator('.nrm-mon > svg > circle').getAttribute('fill'), '#26A17B');
chk('el campo arranca vacío', await pg.locator('#wUsd').inputValue(), '');
chk('con marca de agua',      await pg.locator('#wUsd').getAttribute('placeholder'), '0.00');
chk('sin NRM de salida',      await pg.locator('#wNrm').inputValue(), '');
// Aqui vivia el cable trampa del «coming soon»: mientras el USDT de Robinhood
// Chain no tuvo direccion comprobada, el boton lo decia en vez de fallar al
// pedir el permiso de gasto. Ahora ese boton no existe — en la 4663 apenas hay
// USDT puenteado y se decidio ofrecer solo ETH, que es su moneda de gas. Lo
// que se vigila es la decision: cinco medios, y ninguno USDT sobre Robinhood.
chk('cinco medios de pago', await pg.locator('#wPay button').count(), 5);
chk('sin USDT sobre Robinhood',
    await pg.locator('#wPay button[data-net="Robinhood Chain"][data-sym="USDT"]').count(), 0);
chk('pero si ETH sobre Robinhood',
    await pg.locator('#wPay button[data-net="Robinhood Chain"][data-sym="ETH"]').count(), 1);
await pg.locator('#wPay button').nth(0).click(); await pg.waitForTimeout(350);
// Sin cartera, conectar va antes que el importe: el orden en que uno lo hace.
chk('sin cartera pide cartera', await pg.locator('#wCta').textContent(), 'Connect wallet');
// El navegador guarda el valor con 15 cifras y el mínimo con 17: iguales de
// hecho, distintos como cadena.
chk('la barra a la izquierda',
    await pg.locator('#wRange').evaluate(el=>Math.abs(+el.value - +el.min) < 1e-9), true);
chk('los límites siguen visibles', await pg.locator('#wNote').textContent(),
    'Min $0.20 · max $10,000 per wallet · live oracle price');

// al escribir, revive
await pg.locator('#wUsd').fill('1');
await pg.locator('#wUsd').blur();
await pg.waitForTimeout(400);
chk('al teclear vuelve a calcular', await pg.locator('#wEq').textContent(), '≈ $2,506 on Ethereum');
chk('y el botón deja de bloquear', await pg.locator('#wCta').isDisabled(), false);
chk('pide cartera, que no hay', await pg.locator('#wCta').textContent(), 'Connect wallet');

// y un chip lo rellena
await pg.locator('#wChips button').nth(1).click();   // $100
await pg.waitForTimeout(300);
chk('un atajo lo rellena', await pg.locator('#wEq').textContent(), '≈ $100 on Ethereum');

// ── recargar estando en la sección de compra ────────────────────────────────
const antes = await pg.evaluate(()=>{
  const s=document.getElementById('presale');
  let y=0,n=s; while(n){y+=n.offsetTop;n=n.offsetParent;}
  window.scrollTo(0, y+120); return y+120;
});
await pg.waitForTimeout(700);
await pg.reload({waitUntil:'load'});
await pg.waitForTimeout(2600);
const despues = await pg.evaluate(()=>window.scrollY);
const seccion = await pg.evaluate(()=>{
  const s=document.getElementById('presale');
  let y=0,n=s; while(n){y+=n.offsetTop;n=n.offsetParent;}
  return {top:y, alto:s.offsetHeight, y:window.scrollY};
});
/* Esto medía «el borde de arriba cae dentro de 20 px del borde de la
   sección», que es identidad de PÍXEL, no lo que la frase dice. Y el scroll se
   restaura por píxel guardado: cualquier cambio de maquetación por encima lo
   desplaza. Con la vía, el epígrafe centrado sumó unos 40 px por sección y el
   píxel restaurado cayó 22 px por encima del borde — con la compra ocupando el
   95 % de la pantalla. Eso es «sigue en la compra» por cualquier lectura
   razonable, y la comprobación decía que no.
   Se mide lo que importa: cuánto de lo que ves ES la sección de compra. */
const visible = Math.max(0, Math.min(seccion.y + 900, seccion.top + seccion.alto)
                          - Math.max(seccion.y, seccion.top));
chk('tras recargar sigue en la compra (' + Math.round(visible / 9) + '% de la pantalla)',
    visible >= 450, true);
chk('y muy cerca de donde estaba', Math.abs(despues - antes) < 200, true);

// ── una visita nueva empieza arriba ─────────────────────────────────────────
const ctx2 = await nav.newContext({viewport:{width:1400,height:900}});
const pg2 = await ctx2.newPage();
await pg2.goto('http://127.0.0.1:8940/index.html',{waitUntil:'load'});
await pg2.waitForTimeout(2200);
chk('una visita nueva empieza arriba', await pg2.evaluate(()=>window.scrollY) < 40, true);

await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
