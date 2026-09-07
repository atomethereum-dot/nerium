// Comprar en Ethereum con una sesión de WalletConnect ya abierta.
//
// Ninguna suite habia llegado hasta aqui: probar_panel enchufa una cartera
// INYECTADA (extension), donde la firma la pide el navegador solo, y el falso
// WalletConnect de probar_wc tiene un connect() que nunca resuelve, asi que
// jamas se llegaba a tener sesion. Todo lo que solo pasa con sesion abierta
// —cambiar de red, firmar la compra— estaba sin mirar.
import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8941,r));

const w=v=>BigInt(v).toString(16).padStart(64,'0');
const ronda={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),
'0x3fbb3d1d':'0x'+w(20000000n),'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),
'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),
'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),'0xdd62ed3e':'0x'+w(0),
'0xb81b8630':'0x'+w(0),'0x0da8b1c9':'0x'+w(0),'0x3acd1572':'0x'+w(1000000000000n),
'0x402914f5':'0x'+w(0),'0x70a08231':'0x'+w(0)};

const REGISTRO={listings:{d:{name:'MetaMask',image_id:'t4',
  mobile:{native:'metamask://',universal:'https://metamask.app.link'}}}};

// Un WalletConnect falso que SI conecta, con sesion y redirect como la de
// verdad, y que empieza en BNB Chain: es donde se queda quien acaba de
// comprar en BNB y luego quiere comprar en Ethereum.
const SDK=`window.NereumWC={EthereumProvider:{init:async function(o){
  const oy={}; window.__pedidos=[];
  // connect() NO resuelve solo: en la vida real espera a que la persona
  // apruebe en su cartera. Un doble que resuelve al momento cierra el
  // selector antes de que nadie elija nada, y entonces la prueba mide otra
  // cosa. Aqui lo aprueba el test llamando a window.__aprobar().
  let soltar; const aprobado=new Promise(r=>{soltar=r;});
  window.__aprobar=()=>soltar();
  window.__tx=null; window.__txs=[];
  const prov={ _cid: window.__cid0 || '0x38',
    session:{ peer:{ metadata:{ name:'MetaMask', icons:['https://x/i.png'],
                                redirect:{ native:'metamask://', universal:'https://metamask.app.link' } } } },
    on:(e,f)=>{(oy[e]=oy[e]||[]).push(f)}, removeListener(){},
    _emit:(e,a)=>{(oy[e]||[]).forEach(f=>f(a));},
    connect: async function(){
      (oy['display_uri']||[]).forEach(f=>f('wc:7f9a2c@2?relay-protocol=irn&symKey=abc'));
      await aprobado; },
    request: async function({method,params}){
      window.__pedidos.push(method);
      if(method==='eth_requestAccounts')return['0x2222222222222222222222222222222222222222'];
      if(method==='eth_chainId')return prov._cid;
      // el cambio de red y la firma viajan por el relay y tardan: la cartera
      // no se abre sola, que es justo de lo que va esta prueba
      if(method==='wallet_switchEthereumChain'){
        const pedida=parseInt(params[0].chainId,16);
        // igual que handleSwitchChain: si la cadena esta aprobada en la sesion
        // el SDK la cambia el solo y no molesta a la cartera
        if((window.__aprobadas||[1,56]).includes(pedida)){ prov._cid=params[0].chainId; return null; }
        await new Promise(r=>setTimeout(r,30000)); return null; }
      if(method==='eth_sendTransaction'){ window.__tx=params[0]; window.__txs.push(params[0]);
        if(window.__firmaLenta) await new Promise(r=>setTimeout(r,30000));
        return '0x'+String(window.__txs.length).repeat(64).slice(0,64); }
      if(method==='eth_call')return (window.__R||{})[params[0].data.slice(0,10)] ?? '0x'+'0'.repeat(64);
      if(method==='eth_getBalance')return '0x0';
      if(method==='eth_getTransactionReceipt')return {status:'0x1',transactionHash:params[0]};
      throw new Error(method); } };
  // para que la prueba pueda decir «la cartera ya cambio de red», como hace
  // la persona al aprobar en su app
  window.__cid=(h)=>{ prov._cid=h; prov._emit('chainChanged', h); };
  return prov;
}}};`;

const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

async function abrir(op={}){
  const ctx=await nav.newContext({...devices['iPhone 13']});
  await ctx.addInitScript(({R,cid0,lenta})=>{ const of=window.fetch;
    window.__R=R; window.__firmaLenta=lenta; window.__cid0=cid0;
    window.fetch=async(u,o)=>{ if(!o||!o.body) return of(u,o);
      const j=JSON.parse(o.body);
      const res = j.method==='eth_call' ? (R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64))
        : j.method==='eth_getTransactionReceipt' ? {status:'0x1',transactionHash:j.params[0]} : '0x0';
      return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),
        {status:200,headers:{'content-type':'application/json'}});};
  },{R:ronda, cid0:op.cid0||'0x38', lenta:op.lenta!==false});
  const pg=await ctx.newPage();
  pg.on('pageerror',e=>console.log('PAGEERROR:',String(e).slice(0,300)));
  pg.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE:',m.text().slice(0,300)); });
  await pg.route('**explorer-api.walletconnect.com/v3/wallets**', r=>
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(REGISTRO)}));
  await pg.route('**explorer-api.walletconnect.com/v3/logo/**', r=>r.abort());
  await pg.route('**/assets/walletconnect.js', r=>
    r.fulfill({status:200,contentType:'text/javascript',body:SDK}));
  await pg.goto('http://127.0.0.1:8941/index.html',{waitUntil:'load'});
  await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1500);
  return {ctx,pg};
}

const {ctx,pg}=await abrir();
// conectar: la lista, y MetaMask dentro
await pg.evaluate(()=>document.getElementById('wCta').click()); await pg.waitForTimeout(1200);
chk('el selector se abre', await pg.locator('.nrm-fondo').count(), 1);
await pg.locator('.nrm-w', {hasText:'MetaMask'}).first().click(); await pg.waitForTimeout(900);
chk('y ofrece abrir MetaMask para emparejar',
    await pg.locator('.nrm-fondo a[href^="metamask://"]').count(), 1);
await pg.evaluate(()=>window.__aprobar()); await pg.waitForTimeout(1800);
chk('aprobada, el selector se cierra', await pg.locator('.nrm-fondo').count(), 0);

// El widget arranca en ETH y la SESION de WalletConnect apunta a BNB, que es
// lo que pasa al volver de una compra en BNB: en MetaMask se ve Ethereum, pero
// la red de WalletConnect es la de la sesion. Antes el boton decia «Switch to
// Ethereum» y no habia forma de entenderlo desde fuera.
chk('el boton NO pide cambiar de red por WalletConnect',
    (await pg.locator('#wCta').textContent()).trim(), 'Enter an amount');
chk('  aunque la sesion siga en BNB',
    await pg.evaluate(()=>window.__pedidos.length>0), true);

await pg.locator('#wUsd').fill('0,05'); await pg.waitForTimeout(700);
chk('  y deja poner el importe',
    await pg.evaluate(()=>document.getElementById('wCta').textContent.indexOf('Buy')===0), true);

// el toque simulado de Playwright no siempre llega a #wCta en movil; el
// click desde dentro de la pagina recorre el mismo camino de codigo
await pg.evaluate(()=>document.getElementById('wCta').click());
await pg.waitForTimeout(1800);
chk('la compra alinea la red ella sola',
    await pg.evaluate(()=>window.__pedidos.includes('wallet_switchEthereumChain')), true);
chk('  sin enseñar la hoja para un cambio que no sale al teléfono',
    await pg.evaluate(()=>{const f=[...document.querySelectorAll('.nrm-fondo')];
      return f.some(x=>/Switch network/i.test(x.textContent));}), false);
chk('sale la hoja para firmar', await pg.locator('.nrm-fondo').count(), 1);
chk('   y lleva el boton de abrir MetaMask',
    await pg.locator('.nrm-fondo a[href^="metamask://"]').count(), 1);


// ── ya en Ethereum: comprar con ETH ─────────────────────────────────────────
const tx = await pg.evaluate(()=>window.__tx);
chk('se firma una transaccion', !!tx, true);
chk('   al contrato de venta', (tx&&tx.to||'').toLowerCase(),
    '0xacbf1add75139d0e926d57ec715fdab8bee04a89');
chk('   con buyWithNative', (tx&&tx.data||'').slice(0,10), '0x31ad36ab');
chk('   y el valor que se escribio', BigInt(tx&&tx.value||'0x0').toString(), (5n*10n**16n).toString());
chk('sale la hoja para firmar en MetaMask',
    await pg.locator('.nrm-fondo a[href^="metamask://"]').count(), 1);


// ── si la cadena NO esta aprobada en la sesion, si sale al telefono ────────
// Ahi el SDK reenvia la peticion a la cartera y puede tardar: la hoja tiene
// que aparecer, con retraso pero aparecer, o volvemos al bloqueo mudo.
{
  const {ctx:ctx3, pg:pg3} = await abrir({cid0:'0x38', lenta:false});
  await pg3.evaluate(()=>{ window.__aprobadas=[56]; });   // Ethereum sin aprobar
  await pg3.evaluate(()=>document.getElementById('wCta').click()); await pg3.waitForTimeout(1000);
  await pg3.locator('.nrm-w',{hasText:'MetaMask'}).first().click(); await pg3.waitForTimeout(700);
  await pg3.evaluate(()=>window.__aprobar()); await pg3.waitForTimeout(1800);
  await pg3.locator('#wUsd').fill('0,05'); await pg3.waitForTimeout(700);
  await pg3.evaluate(()=>document.getElementById('wCta').click());
  await pg3.waitForTimeout(600);
  chk('cadena sin aprobar: al principio no molesta', await pg3.locator('.nrm-fondo').count(), 0);
  await pg3.waitForTimeout(1600);
  chk('  pero si tarda, enseña cómo volver a la cartera',
      await pg3.locator('.nrm-fondo a[href^="metamask://"]').count(), 1);
  await ctx3.close();
}

// ── USDT en Ethereum: el permiso hay que ponerlo a cero primero ─────────────
// Tether en Ethereum no deja cambiar un permiso distinto de cero. Este camino
// nunca se habia ejecutado, ni en una cadena de verdad ni aqui.
// pestana nueva: la compra anterior deja una firma pendiente, y con ella la
// interfaz ocupada, igual que en el telefono de verdad
const {ctx:ctx2, pg:pg2} = await abrir({cid0:'0x1', lenta:false});
await pg2.evaluate(()=>{
  // ya hay permiso puesto, y menor que la compra: es el caso que revienta
  window.__R['0xdd62ed3e']='0x'+(500000n).toString(16).padStart(64,'0');
  window.__R['0x70a08231']='0x'+(50000000n).toString(16).padStart(64,'0'); });
await pg2.evaluate(()=>document.getElementById('wCta').click()); await pg2.waitForTimeout(1000);
await pg2.locator('.nrm-w', {hasText:'MetaMask'}).first().click(); await pg2.waitForTimeout(700);
await pg2.evaluate(()=>window.__aprobar()); await pg2.waitForTimeout(1800);
await pg2.evaluate(()=>{ window.__txs=[];
  document.querySelectorAll('#presale .w-pay button')[2].click(); });
await pg2.waitForTimeout(900);
await pg2.locator('#wUsd').fill('1');
await pg2.waitForTimeout(600);
await pg2.evaluate(()=>document.getElementById('wCta').click());
await pg2.waitForTimeout(4000);
const txs = await pg2.evaluate(()=>window.__txs.map(t=>({to:(t.to||'').toLowerCase(),sel:(t.data||'').slice(0,10),
  quien:(t.data||'').slice(10,74), arg:(t.data||'').slice(74,138)})));
const USDT='0xdac17f958d2ee523a2206206994597c13d831ec7';
chk('USDT: son tres firmas', txs.length, 3);
chk('  1) approve al contrato de USDT', (txs[0]||{}).to+' '+(txs[0]||{}).sel, USDT+' 0x095ea7b3');
chk('  1) ... y pone el permiso a CERO',
    BigInt('0x'+((txs[0]||{}).arg||'0')).toString(), '0');
chk('  2) approve otra vez, ya con tope', (txs[1]||{}).sel, '0x095ea7b3');
chk('  2) ... por encima de la compra',
    BigInt('0x'+((txs[1]||{}).arg||'0')) >= 1000000n, true);
chk('  3) y la compra con buyWithUsdt', (txs[2]||{}).sel, '0x7789e96e');
chk('  3) ... al contrato de venta', (txs[2]||{}).to,
    '0xacbf1add75139d0e926d57ec715fdab8bee04a89');

console.log('');
Rs.forEach(r=>console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`   (era ${r.a}, se esperaba ${r.b})`)));
const mal=Rs.filter(r=>!r.ok).length;
console.log(mal?`${Rs.length-mal} bien, ${mal} MAL`:`${Rs.length}/${Rs.length} correctas`);
await ctx.close(); await ctx2.close(); await nav.close(); srv.close();
process.exit(mal?1:0);
