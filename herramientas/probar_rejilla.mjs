import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8951,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});
const TOL=1;   // un píxel: el redondeo de medio píxel del navegador
for(const [nombre,op] of [['iPhone 14 Pro',{viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}],
                          ['móvil estrecho',{viewport:{width:360,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true}],
                          ['escritorio',{viewport:{width:1400,height:900}}]]){
  const ctx=await nav.newContext(op);
  await ctx.addInitScript(({R})=>{const of=window.fetch;
   window.fetch=async(u,o)=>{const url=String(u);
    if(url.indexOf('explorer-api')>=0) throw new TypeError('bloqueado');
    if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);let res=null;
    if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
    return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
  },{R});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8951/index.html',{waitUntil:'load'});
  await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1600);
  await pg.locator('#wCta').click(); await pg.waitForTimeout(900);
  const m = await pg.evaluate(()=>{
    const rej=document.querySelector('.nrm-rej'), caja=document.querySelector('.nrm-caja');
    const cs=getComputedStyle(rej);
    const items=[...rej.querySelectorAll('.nrm-w')].slice(0,8).map(b=>{
      const r=b.getBoundingClientRect(); return {x:Math.round(r.left), an:Math.round(r.width), c:Math.round(r.left+r.width/2)};
    });
    const rr=rej.getBoundingClientRect(), rc=caja.getBoundingClientRect();
    return {cols:cs.gridTemplateColumns, gap:cs.gap, pad:cs.padding,
      rejIzq:Math.round(rr.left), rejAn:Math.round(rr.width),
      cajaIzq:Math.round(rc.left), cajaAn:Math.round(rc.width),
      barra: rej.offsetWidth - rej.clientWidth, items};
  });
  const fila = m.items.slice(0, m.cols.split(' ').length);
  const anchos = m.cols.split(' ').map(parseFloat);
  chk(`${nombre}: columnas iguales (${m.cols})`,
      Math.max(...anchos) - Math.min(...anchos) <= TOL, true);
  const huecos = fila.slice(1).map((v,i)=>v.c-fila[i].c);
  chk(`${nombre}: separación pareja (${huecos.join(', ')})`,
      Math.max(...huecos) - Math.min(...huecos) <= TOL, true);
  const margenIzq = fila[0].x - m.rejIzq;
  const margenDer = (m.rejIzq + m.rejAn) - (fila[fila.length-1].x + fila[fila.length-1].an);
  chk(`${nombre}: centrada (izq ${margenIzq}, der ${margenDer})`,
      Math.abs(margenIzq - margenDer) <= TOL, true);
  chk(`${nombre}: no se sale por la derecha`, margenDer >= 0, true);
  if (nombre.startsWith('iPhone')) await pg.locator('.nrm-caja').screenshot({path:'/tmp/rejilla.png'});
  await ctx.close();
}
await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}  obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
