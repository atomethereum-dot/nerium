/* Con la cartera en otra app, la web tiene que ofrecer el camino de vuelta:
   WalletConnect solo la abre al emparejar, no en cada firma posterior. */
import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8952,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(74605336765n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0),'0xb81b8630':'0x'+w(0),'0x0da8b1c9':'0x'+w(0),
'0x402914f5':'0x'+w(0),'0x70a08231':'0x'+w(0)};
const CARTERAS=[
  {nombre:'MetaMask',      esquema:'metamask://', icono:true},
  {nombre:'Trust Wallet',  esquema:'trust://',    icono:true},
  /* Sin icono en la sesión: tiene que caer en el del registro. */
  {nombre:'Rainbow',       esquema:'rainbow://'},
  /* Sin `redirect` en la sesión: tiene que caer en el enlace del registro. */
  {nombre:'Zerion',        esquema:null, delRegistro:'zerion://'},
];
const sdkDe=(c)=>`window.NereumWC={EthereumProvider:{init:async function(o){
  const oy={};
  const prov={
    session:{peer:{metadata:{name:${JSON.stringify(c.nombre)},icons:${JSON.stringify(c.icono?['https://ejemplo.invalid/logo.png']:[])}${c.esquema?`,redirect:{native:${JSON.stringify(c.esquema)}}`:''}}}},
    on:(e,f)=>{(oy[e]=oy[e]||[]).push(f)}, removeListener(){},
    // El connect de verdad no resuelve hasta que el usuario aprueba en su
    // cartera: si aquí resolviera al instante, la web se conectaría sola antes
    // de que nadie eligiera nada.
    connect: async function(){ (oy['display_uri']||[]).forEach(f=>f('wc:abc@2?relay-protocol=irn&symKey=deadbeef'));
      await new Promise(r=>{ const t=setInterval(()=>{ if(window.__aprobado){clearInterval(t);r();} },40); }); },
    request: async function({method,params}){
      if(method==='eth_requestAccounts')return['0x1a30000000000000000000000000000000002d15'];
      if(method==='eth_chainId')return '0x38';
      if(method==='eth_getBalance')return '0x'+(26551000000000000n).toString(16);
      if(method==='eth_call')return ${JSON.stringify(R)}[params[0].data.slice(0,10)]||'0x'+'0'.repeat(64);
      if(method==='eth_sendTransaction'){ window.__mandada=params[0]; return new Promise(()=>{}); }
      throw new Error(method); } };
  window.__prov=prov; return prov;
}}};`;
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

for (const C of CARTERAS) {
const REGISTRO={listings:{a:{name:C.nombre,image_id:'m',
  mobile:{native:C.esquema||C.delRegistro, universal:'https://ejemplo.invalid'}}}};
const SDK=sdkDe(C);
// La primera se corre en modo oscuro: las dos hojas tienen que salir iguales.
const oscuro = C.nombre === 'MetaMask';
const ctx=await nav.newContext({...devices['iPhone 13'], colorScheme: oscuro ? 'dark' : 'light'});
await ctx.addInitScript(({R})=>{const of=window.fetch;
 window.fetch=async(u,o)=>{const url=String(u);
  if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);let res=null;
  if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
  else if(j.method==='eth_getBalance')res='0x0';
  return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
 delete window.ethereum;
},{R});
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push('ERROR '+e));
pg.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLA '+m.text()); });
await pg.route('**explorer-api.walletconnect.com/v3/wallets**', r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(REGISTRO)}));
// Iconos cuadrados de 200px, como los que sirve el registro de verdad.
const PIX=fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname),
  'iconos', 'icono_'+C.nombre.split(' ')[0].toLowerCase()+'.png'));
await pg.route('**explorer-api.walletconnect.com/v3/logo/**', r=>r.fulfill({status:200,contentType:'image/png',body:PIX}));
await pg.route('**ejemplo.invalid/logo.png', r=>r.fulfill({status:200,contentType:'image/png',body:PIX}));
await pg.route('**/assets/walletconnect.js', r=>r.fulfill({status:200,contentType:'text/javascript',body:SDK}));


await pg.goto('http://127.0.0.1:8952/index.html',{waitUntil:'load'});
await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1700);
await pg.locator('#wPay button').nth(1).click();            // BNB
await pg.waitForTimeout(300);
await pg.locator('#wCta').click(); await pg.waitForTimeout(900);   // abre el selector
chk(C.nombre+': aparece en la lista',
    await pg.locator('.nrm-w b').first().textContent(), C.nombre);
await pg.locator('.nrm-w b',{hasText:C.nombre}).click();
await pg.waitForTimeout(600);
chk(C.nombre+': espera la conexión', (await pg.locator('.nrm-qr').innerText()).includes('Confirm the connection in '+C.nombre), true);
chk(C.nombre+': la conexión también lleva logo', await pg.locator('.nrm-qr .nrm-av.nrm-grandota').count(), 1);
let botonConectar = null;
if (oscuro) {
  await pg.locator('.nrm-caja').screenshot({path:'/tmp/hoja_conectar.png'});
  botonConectar = await pg.evaluate(()=>{ const b=document.querySelector('.nrm-qr a.nrm-copiar'),
    cs=getComputedStyle(b); return cs.color+' | '+cs.borderTopColor; });
}
await pg.evaluate(()=>{ window.__aprobado = true; });   // el usuario aprueba
await pg.waitForTimeout(1800);
chk(C.nombre+': conecta por WalletConnect', await pg.locator('.nrm-pos .pos-dir').textContent(), '0x1a30…2d15');
chk(C.nombre+': sin firmar, no hay hoja', await pg.locator('.nrm-fondo').count(), 0);

await pg.locator('#wUsd').fill('0,01');
await pg.locator('#wUsd').blur(); await pg.waitForTimeout(400);
chk(C.nombre+': la coma se entiende', await pg.locator('#wEq').textContent(), '≈ $7.46 on BNB Chain');
chk(C.nombre+': antes de comprar nada tapa el botón', await pg.evaluate(()=>{
  const b=document.getElementById('wCta'), r=b.getBoundingClientRect();
  return document.elementFromPoint(r.left+r.width/2, r.top+r.height/2) === b;
}), true);
/* click() y no tap(): el toque simulado de Playwright no siempre llega al
   botón en emulación móvil, y aquí lo que se prueba es lo que pasa después. */
await pg.evaluate(()=>document.getElementById('wCta').click());
await pg.waitForTimeout(1500);
chk(C.nombre+': el botón dice que confirmes', await pg.locator('#wCta').textContent(), 'Confirm in your wallet…');
chk(C.nombre+': sale la hoja', await pg.locator('.nrm-fondo').isVisible(), true);
chk(C.nombre+': titulada con SU nombre', await pg.locator('.nrm-fondo .nrm-cab h3').textContent(), C.nombre);
chk(C.nombre+': y lo nombra en el mensaje', await pg.locator('.nrm-fondo .nrm-qr p').textContent(),
    'Confirm in '+C.nombre+'. Your purchase is not finished until you do.');
const a = pg.locator('.nrm-fondo a.nrm-copiar');
chk(C.nombre+': y en el botón', await a.textContent(), 'Open '+C.nombre);
chk(C.nombre+': es un enlace de verdad', await a.evaluate(el=>el.tagName), 'A');
chk(C.nombre+': al esquema correcto', await a.getAttribute('href'), C.esquema || C.delRegistro);
chk(C.nombre+': se puede cerrar', await pg.locator('.nrm-fondo .nrm-cab button[aria-label="Close"]').isVisible(), true);
chk(C.nombre+': la hoja lleva su logo', await pg.locator('.nrm-fondo .nrm-qr .nrm-av.nrm-grandota').count(), 1);
chk(C.nombre+': y es imagen, no inicial',
    await pg.locator('.nrm-fondo .nrm-qr .nrm-av').evaluate(el=>el.tagName), 'IMG');
/* Las carteras suben a la sesión el icono que quieren, de cualquier tamaño y
   con o sin transparencia. El del registro es el mismo formato para todas, y
   es el que ya se ve bien en la lista. */
chk(C.nombre+': el logo es el del registro, no el que sube la cartera',
    (await pg.locator('.nrm-fondo .nrm-qr img.nrm-av').getAttribute('src')).indexOf('explorer-api') >= 0, true);
chk(C.nombre+': y en tamaño grande',
    (await pg.locator('.nrm-fondo .nrm-qr img.nrm-av').getAttribute('src')).indexOf('/logo/lg/') > 0, true);
chk(C.nombre+': sin placa detrás del logo',
    await pg.locator('.nrm-fondo .nrm-qr .nrm-av').evaluate(el=>{
      const cs=getComputedStyle(el); return cs.backgroundColor+'|'+cs.boxShadow; }),
    'rgba(0, 0, 0, 0)|none');
chk(C.nombre+': se mandó la transacción', await pg.evaluate(()=>!!window.__mandada), true);
chk(C.nombre+': sin errores de página', errs.length, 0);
if (oscuro) await pg.locator('.nrm-caja').last().screenshot({path:'/tmp/hoja_firmar.png'});
if (C.nombre==='Trust Wallet') await pg.locator('.nrm-caja').last().screenshot({path:'/tmp/volver2.png'});
if (oscuro) {
  const fondos = await pg.evaluate(()=>{
    const c = document.querySelector('.nrm-fondo .nrm-caja');
    return getComputedStyle(c).backgroundColor;
  });
  chk('la hoja de firma es oscura como la de conexión', fondos, 'rgb(18, 21, 28)');
  /* El botón de confirmar tiene que verse igual que el de conectar: son el
     mismo gesto en dos momentos, y dos colores distintos los separan sin
     motivo. */
  chk('y su botón, del mismo color que el de conectar',
      await pg.evaluate(()=>{ const b=document.querySelector('.nrm-fondo a.nrm-copiar'),
        cs=getComputedStyle(b); return cs.color+' | '+cs.borderTopColor; }),
      botonConectar);
}
await ctx.close();
}

await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
