// probar_pronto: la espera (NRM_PRONTO) se apago al terminar las pruebas del
// dueño: la ronda vuelve en vivo («Seed Round open», 85 % complete en el
// aviso, la portada y el tunel, barras al 85 %) y la dapp suma la privada
// sobre la meta de $16,000,000. Seguridad y el Roadmap siguen diciendo que
// registro, auditoria y KYC estan en proceso con CyberScope.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = '/home/user/nerium';
const T = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg'};
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  const p = path.join(RAIZ, f); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': T[path.extname(p)] || 'application/octet-stream'}); r.end(fs.readFileSync(p)) });
await new Promise(r => srv.listen(0, r));
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (c, t) => { if (c) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };
const pg = await (await nav.newContext({ viewport:{ width:1440, height:900 } })).newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:' + srv.address().port + '/', { waitUntil:'load' }); await pg.waitForTimeout(2500);
const r = await pg.evaluate(() => {
  const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
  const t = id => (document.getElementById(id) || {}).textContent;
  const pcVisibles = [...document.querySelectorAll('.pc')].filter(vis).length;
  const sec = document.getElementById('security').innerText;
  return { flag: window.NRM_PRONTO, ann: t('annPct'), hero: t('heroPct'), stk: t('stkPct'),
    annW: document.getElementById('annFill').style.width, stkP: document.getElementById('stkBar').style.getPropertyValue('--p'),
    pcVisibles, raised: t('saleRaised'), meta: document.querySelector('#saleRaised + span').textContent,
    enProceso: (sec.match(/In progress/gi) || []).length, cyber: /CyberScope/.test(sec),
    viejo: /Halborn|Assure DeFi|KYC passed|Audited|L26000341887/.test(document.getElementById('security').innerHTML + document.getElementById('top').innerHTML),
    hb: document.querySelector('.hb.white').textContent.trim(),
    ruta: [...document.querySelectorAll('#ruta .ruta-est')].map(e => e.textContent.trim()),
    rutaPasado: /Audit passed|KYC passed/.test(document.getElementById('ruta').textContent),
    rutaProc: document.querySelectorAll('#ruta .ruta-proc:not([hidden])').length };
});
di(r.flag === false, 'la ronda esta en vivo en la pagina publicada (sin espera)');
di([r.ann, r.hero, r.stk].every(x => /^\d+(\.\d)?%$/.test(x)), 'aviso, portada y tunel dan la cifra (' + [r.ann, r.hero, r.stk].join(' / ') + ')');
di(r.pcVisibles >= 3, 'y asoman «complete», «Seed Round open» y «Launching soon» (' + r.pcVisibles + ')');
di(parseFloat(r.annW) > 80 && parseFloat(r.stkP) > 80, 'las barras van llenas hasta la cifra (' + r.annW + ', ' + r.stkP + ')');
di(/^\$[\d,]+$/.test(r.raised) && r.raised !== '$0' && /\$16,000,000/.test(r.meta), 'la dapp suma la privada sobre la meta de siempre (' + r.raised + ' ' + r.meta + ')');
di(r.enProceso >= 6 && r.cyber, 'Seguridad: registro, auditoria y KYC en proceso, con CyberScope (' + r.enProceso + ')');
di(!r.viejo, 'Seguridad y la portada ya no dicen Halborn, Assure DeFi, «passed» ni el numero de registro');
di(r.hb === 'Audit in progress', 'el boton de la portada tampoco dice ya «audited» (' + r.hb + ')');
di(r.ruta[0] === 'In progress' && r.ruta[1] === 'In progress' && !r.rutaPasado && r.rutaProc === 3,
   'el Roadmap: fases 01 y 02 en proceso; auditoria, KYC y registro en proceso, sin hitos de recaudacion (' + r.ruta.join(' / ') + ', ' + r.rutaProc + ' en proceso)');
di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
