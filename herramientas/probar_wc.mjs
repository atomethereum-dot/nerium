import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8934,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};

// Un pixel PNG que hace de logo, para no depender de la red.
const PIX='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==';
const REGISTRO={listings:{
  a:{name:'Trust Wallet',image_id:'t1',mobile:{native:'trust://',universal:'https://link.trustwallet.com'}},
  b:{name:'Rainbow',     image_id:'t2',mobile:{native:'rainbow://',universal:'https://rnbwapp.com'}},
  c:{name:'Zerion',      image_id:'t3',mobile:{native:'zerion://',universal:'https://wallet.zerion.io'}},
  d:{name:'MetaMask',    image_id:'t4',mobile:{native:'metamask://',universal:'https://metamask.app.link'}}
}};
// Un EthereumProvider falso servido en lugar del CDN: mismo camino de codigo.
const SDK=`window.EthereumProvider={init:async function(o){
  window.__wcInit=o;
  const oy={};
  return { on:(e,f)=>{(oy[e]=oy[e]||[]).push(f)}, removeListener(){},
    connect: async function(){ (oy['display_uri']||[]).forEach(f=>f('wc:7f9a2c@2?relay-protocol=irn&symKey=abc123def456'));
      await new Promise(r=>setTimeout(r,60000)); },
    request: async function({method}){ if(method==='eth_requestAccounts')return['0x2222222222222222222222222222222222222222'];
      if(method==='eth_chainId')return '0x1'; throw new Error(method); } };
}};`;

const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

async function montar(extra={}, movil=false){
  const ctx=await nav.newContext(movil?{...devices['iPhone 13']}:{viewport:{width:1400,height:1000}});
  await ctx.addInitScript(({R,conExt})=>{ const of=window.fetch;
    window.fetch=async(u,o)=>{ if(!o||!o.body) return of(u,o);
      const j=JSON.parse(o.body); let res=null;
      if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
      return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
    window.__abierto=[];
    if(conExt){
      const prov={_cid:'0x1',on(){},removeListener(){},async request({method}){
        if(method==='eth_requestAccounts')return['0x1111111111111111111111111111111111111111'];
        if(method==='eth_chainId')return '0x1'; throw new Error(method);}};
      const info={uuid:'w1',name:'Rabby Wallet',rdns:'io.rabby',icon:''};
      window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info,provider:prov})})));
    }
  },{R,conExt:extra.conExt!==false});
  const pg=await ctx.newPage();
  await pg.route('**explorer-api.walletconnect.com/v3/wallets**', r=>
    extra.sinRegistro ? r.abort() : r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(REGISTRO)}));
  await pg.route('**explorer-api.walletconnect.com/v3/logo/**', r=>
    r.fulfill({status:200,contentType:'image/png',body:Buffer.from(PIX.split(',')[1],'base64')}));
  await pg.route('**cdn.jsdelivr.net/**', r=>
    extra.sinSdk ? r.abort() : r.fulfill({status:200,contentType:'text/javascript',body:SDK}));
  return {ctx,pg};
}

// ── 1 · escritorio: lista con logos, buscador y QR ──────────────────────────
{
 const {ctx,pg}=await montar();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('http://127.0.0.1:8934/index.html',{waitUntil:'load'});
 await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1600);
 await pg.locator('#wCta').click(); await pg.waitForTimeout(900);

 // La página oculta el cursor nativo para pintar el suyo, que queda por debajo
 // del modal: dentro hace falta recuperarlo o no se ve qué se está señalando.
 chk('la página esconde el cursor', await pg.evaluate(()=>document.body.classList.contains('cur-on')), true);
 chk('pero en el modal hay puntero',
     await pg.locator('.nrm-caja').evaluate(el=>getComputedStyle(el).cursor), 'default');
 chk('y mano sobre cada cartera',
     await pg.locator('.nrm-w').first().evaluate(el=>getComputedStyle(el).cursor), 'pointer');
 chk('y sobre la ✕',
     await pg.locator('.nrm-cab button[aria-label="Close"]').evaluate(el=>getComputedStyle(el).cursor), 'pointer');
 chk('y cursor de texto en el buscador',
     await pg.locator('.nrm-buscar').evaluate(el=>getComputedStyle(el).cursor), 'text');

 const nombres=await pg.locator('.nrm-w b').allTextContents();
 chk('la extensión encabeza la lista', nombres[0], 'Rabby Wallet');
 chk('y detrás va el registro', nombres.slice(1).join(','), 'Trust Wallet,Rainbow,Zerion,MetaMask');
 chk('la instalada lleva su punto', await pg.locator('.nrm-w i').count(), 1);
 chk('los logos son imágenes', await pg.locator('.nrm-w img.nrm-av').count(), 4);
 chk('la extensión sin icono cae en monograma',
     (await pg.locator('.nrm-w').first().locator('.nrm-av').textContent()).trim(), 'R');

 await pg.locator('.nrm-buscar').fill('rain');
 await pg.waitForTimeout(200);
 chk('el buscador filtra', (await pg.locator('.nrm-w b').allTextContents()).join(','), 'Rainbow');
 await pg.locator('.nrm-buscar').fill('zzz'); await pg.waitForTimeout(200);
 chk('sin resultados avisa', await pg.locator('.nrm-vacia').textContent(), 'No wallet with that name.');
 await pg.locator('.nrm-buscar').fill(''); await pg.waitForTimeout(200);

 await pg.locator('.nrm-w b', {hasText:'Trust Wallet'}).click();
 await pg.waitForTimeout(1500);
 chk('el título pasa a la cartera', await pg.locator('.nrm-cab h3').textContent(), 'Trust Wallet');
 const flecha = pg.locator('.nrm-cab button[aria-label="Back"]');
 chk('la flecha se ve', await flecha.isVisible(), true);
 chk('y está dibujada, no escrita', await flecha.locator('svg path').count(), 1);
 chk('con tamaño real', await flecha.evaluate(el => el.getBoundingClientRect().width > 20), true);
 chk('la ✕ también es un dibujo',
     await pg.locator('.nrm-cab button[aria-label="Close"] svg path').count(), 1);
 chk('aparece el QR', await pg.locator('.nrm-qr .marco svg').count(), 1);
 const mods=await pg.locator('.nrm-qr .marco svg path').evaluate(
   el => (el.getAttribute('d')||'').split('M').length - 1);
 chk('el QR lleva cientos de módulos', mods>300, true);
 chk('y fondo blanco para que se lea',
     await pg.locator('.nrm-qr .marco svg rect').getAttribute('fill'), 'white');
 chk('hay botón de copiar', await pg.locator('.nrm-copiar').textContent(), 'Copy link');
 chk('el SDK arranca sin su modal', await pg.evaluate(()=>window.__wcInit.showQrModal), false);
 chk('y con rpcMap', await pg.evaluate(()=>Object.keys(window.__wcInit.rpcMap).join(',')), '1,56');
 await pg.locator('.nrm-ico').first().click(); await pg.waitForTimeout(300);
 chk('la flecha vuelve a la lista', await pg.locator('.nrm-cab h3').textContent(), 'Connect a wallet');
 chk('y el QR desaparece de verdad', await pg.locator('.nrm-qr').isVisible(), false);
 chk('con la lista otra vez llena', (await pg.locator('.nrm-w').count())>0, true);
 chk('y el buscador de vuelta', await pg.locator('.nrm-buscar').isVisible(), true);
 await pg.locator('.nrm-w b',{hasText:'Trust Wallet'}).click(); await pg.waitForTimeout(1200);
 await pg.locator('.nrm-caja').screenshot({path:'/tmp/m_qr.png'});
 await pg.locator('.nrm-ico').first().click(); await pg.waitForTimeout(400);
 await pg.locator('.nrm-caja').screenshot({path:'/tmp/m_lista.png'});
 chk('sin errores de página', errs.length, 0);
 await ctx.close();
}

// ── 2 · móvil: enlace profundo a la app, sin QR ──────────────────────────────
{
 const {ctx,pg}=await montar({},true);
 await pg.goto('http://127.0.0.1:8934/index.html',{waitUntil:'load'});
 await pg.evaluate(()=>{ const o=Object.getOwnPropertyDescriptor(window.location,'href');
   window.__nav=[]; });
 // Se captura la navegacion en vez de dejar que el esquema desconocido falle.
 pg.on('framenavigated',f=>{});
 await pg.route('trust://**', r=>r.abort());
 let saltos=[];
 pg.on('request', r=>{ if(!r.url().startsWith('http')) saltos.push(r.url()); });
 await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1600);
 await pg.locator('#wCta').click(); await pg.waitForTimeout(900);
 chk('en móvil también sale la lista', (await pg.locator('.nrm-w').count())>0, true);
 await pg.locator('.nrm-w b',{hasText:'Trust Wallet'}).click();
 await pg.waitForTimeout(1500);
 chk('en móvil no dibuja QR', await pg.locator('.nrm-qr .marco').count(), 0);
 chk('ofrece reintentar', await pg.locator('.nrm-copiar').first().textContent(), 'Open Trust Wallet');
 chk('y copiar el enlace', await pg.locator('.nrm-copiar').last().textContent(), 'Copy link');
 await pg.locator('.nrm-caja').screenshot({path:'/tmp/m_movil.png'});
 await ctx.close();
}

// ── 3 · sin registro y sin SDK: sigue habiendo lista y el error se lee ──────
{
 const {ctx,pg}=await montar({sinRegistro:true,sinSdk:true,conExt:false});
 await pg.goto('http://127.0.0.1:8934/index.html',{waitUntil:'load'});
 await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1600);
 await pg.locator('#wCta').click(); await pg.waitForTimeout(1200);
 const n=await pg.locator('.nrm-w b').allTextContents();
 chk('la lista de respaldo aparece', n.length>=20, true);
 chk('encabezada por MetaMask', n[0], 'MetaMask');
 chk('todas con monograma', await pg.locator('.nrm-w img.nrm-av').count(), 0);
 await pg.locator('.nrm-w').first().click();
 await pg.waitForTimeout(2500);
 chk('el SDK caído se explica', await pg.locator('#wNote').textContent(),
     'WalletConnect could not load. Check your connection.');
 chk('y el modal se cierra', await pg.locator('.nrm-fondo').count(), 0);
 await ctx.close();
}

// ── 4 · una extensión que no contesta deja salida ───────────────────────────
{
 const ctx=await nav.newContext({viewport:{width:1400,height:1000}});
 await ctx.addInitScript(()=>{ const of=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).indexOf('explorer-api')>=0)
     return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
   return of(u,o); };
  const prov={on(){},removeListener(){},request(){return new Promise(()=>{})}};  // nunca resuelve
  const info={uuid:'w9',name:'Cartera muda',rdns:'x.muda',icon:''};
  window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info,provider:prov})})));
 });
 const pg=await ctx.newPage();
 await pg.goto('http://127.0.0.1:8934/index.html',{waitUntil:'load'});
 await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1600);
 await pg.locator('#wCta').click(); await pg.waitForTimeout(700);
 await pg.locator('.nrm-w b',{hasText:'Cartera muda'}).click();
 await pg.waitForTimeout(900);
 chk('espera con su aviso', (await pg.locator('.nrm-rej').textContent()).trim(),
     'Confirm the connection in Cartera muda…');
 chk('y con flecha para volver',
     await pg.locator('.nrm-cab button[aria-label="Back"]').isVisible(), true);
 await pg.locator('.nrm-cab button[aria-label="Back"]').click();
 await pg.waitForTimeout(400);
 chk('que devuelve la lista', (await pg.locator('.nrm-w').count())>0, true);
 await pg.locator('.nrm-caja').screenshot({path:'/tmp/flecha.png'});
 await ctx.close();
}

await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
