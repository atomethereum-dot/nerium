/* El documento no debe cambiar de alto mientras se recorre la página, ni
   bajando ni subiendo. Cuando cambia, todo lo que hay por debajo se mueve y el
   scroll pega un tirón: es el fallo que se vio en el móvil. */
import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8949,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};
const TOLERANCIA = 8;   // px: por debajo de esto nadie ve nada
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

for (const [nombre, opciones] of [['móvil', {...devices['iPhone 13']}],
                                  ['escritorio', {viewport:{width:1400,height:900}}]]) {
  const ctx=await nav.newContext(opciones);
  await ctx.addInitScript(({R})=>{const of=window.fetch;
   window.fetch=async(u,o)=>{const url=String(u);
    if(url.indexOf('explorer-api')>=0)return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
    if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);let res=null;
    if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
    return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
  },{R});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8949/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(1600);
  const total = await pg.evaluate(()=>document.documentElement.scrollHeight);
  const paso = 260, ruta=[];
  for(let y=0;y<total;y+=paso) ruta.push(y);
  for(let y=total;y>=0;y-=paso) ruta.push(y);
  const altos=[];
  for(const y of ruta){
    await pg.evaluate(v=>scrollTo(0,v), y);
    await pg.waitForTimeout(80);
    altos.push(await pg.evaluate(()=>document.documentElement.scrollHeight));
  }
  const rango = Math.max(...altos) - Math.min(...altos);
  chk(`${nombre}: el documento no cambia de alto (±${rango}px)`, rango <= TOLERANCIA, true);

  // Y ninguna sección debe cambiar de tamaño entre pasadas
  const cambios = await pg.evaluate(async ()=>{
    const secs=[...document.querySelectorAll('main>section')];
    const antes=secs.map(s=>s.offsetHeight);
    const h=document.documentElement.scrollHeight;
    for(let y=h;y>=0;y-=400){ scrollTo(0,y); await new Promise(r=>setTimeout(r,70)); }
    for(let y=0;y<h;y+=400){ scrollTo(0,y); await new Promise(r=>setTimeout(r,70)); }
    return secs.map((s,i)=>({i, id:s.id||s.className.split(' ')[0], de:antes[i], a:s.offsetHeight}))
               .filter(x=>Math.abs(x.a-x.de)>2);
  });
  chk(`${nombre}: ninguna sección cambia al volver a pasar`,
      cambios.map(c=>`${c.id} ${c.de}→${c.a}`).join(', ') || 'ninguna', 'ninguna');
  await ctx.close();
}
await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
