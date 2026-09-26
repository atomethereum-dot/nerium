import { chromium } from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1920,height:1000}});
await p.goto('file://'+process.cwd()+'/index.html',{waitUntil:'load'});
await p.waitForTimeout(1800);
await p.evaluate(()=>document.getElementById('press').scrollIntoView({block:'start'}));
await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>{
  const x=s=>{const e=document.querySelector(s); return e?Math.round(e.getBoundingClientRect().left):null};
  return {prensa:x('#press .prs-w'), red:x('#network .wrap'), seguridad:x('#security .wrap'),
          tituloPrensa:x('.press-h'), tituloRed:x('#network h2')};
})));
await p.screenshot({path:'/tmp/vid/w1920.png'});
await b.close();
