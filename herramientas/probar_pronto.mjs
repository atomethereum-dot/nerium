// probar_pronto: la espera (NRM_PRONTO) esta apagada: la ronda va en vivo
// («Seed Round open» y el porcentaje que diga la cadena, desde 0 %), lo
// recaudado arranca de $0 sobre la meta de $16,000,000, la compra enseña SOLO
// el precio de la Seed Round -ni precio de listado, ni 5x, ni valor al listar-; y
// Seguridad y el Roadmap dicen que la empresa esta registrada, que CyberScope
// ya audito el contrato del token -con su informe enlazado- y que verifico el
// KYC -con su certificado y su ficha enlazados-.
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
    kyc: /3 \/ 3/.test(sec) && !!document.querySelector('#security .sx-card[data-i="2"] a.sx-go[href="https://github.com/cyberscope-io/kyc/blob/main/nrm/kyc.png"]') && !!document.querySelector('#security .sx-card[data-i="2"] a[href="https://app.cyberscope.io/audits/nrm#fundamentals"]'),
    auditada: /Audited/i.test(sec) && /6 of 6 passed/.test(document.getElementById('security').textContent) && !!document.querySelector('#security a.sx-go[href*="cyberscope-io/audits/blob/main/nrm/audit.pdf"]'),
    registrada: /Registered/.test(sec) && /6697114960CU/.test(sec) && !!document.querySelector('#security a.sx-go[href*="sunbiz.org"]'),
    viejo: /Halborn|Assure DeFi|KYC passed|Audit in progress|Sale, vesting, treasury|L26000341887/.test(document.getElementById('security').innerHTML + document.getElementById('top').innerHTML),
    hb: document.querySelector('.hb.white').textContent.trim(),
    sinListado: !document.querySelector('.pr.up, .pr-mult, .pr-arrow, #wVal, #wGain') && !/Listing price|at listing|\$1\.00|5\u00d7/i.test(document.getElementById('seed-round').textContent + document.getElementById('junta').textContent) && /\$0\.20/.test(document.querySelector('.pr').textContent),
    ruta: [...document.querySelectorAll('#ruta .ruta-est')].map(e => e.textContent.trim()),
    rutaPasado: /Audit passed|KYC passed/.test(document.getElementById('ruta').textContent),
    rutaProc: document.querySelectorAll('#ruta .ruta-proc:not([hidden])').length };
});
di(r.flag === false, 'la ronda esta en vivo en la pagina publicada (sin espera)');
di([r.ann, r.hero, r.stk].every(x => /^\d+(\.\d)?%$/.test(x)), 'aviso, portada y tunel dan la cifra (' + [r.ann, r.hero, r.stk].join(' / ') + ')');
di(r.pcVisibles >= 3, 'y asoman «complete», «Seed Round open» y «Launching soon» (' + r.pcVisibles + ')');
di(Math.round(parseFloat(r.annW)) === parseInt(r.ann) && Math.round(parseFloat(r.stkP)) === parseInt(r.stk), 'las barras van llenas hasta la cifra (' + r.annW + ', ' + r.stkP + ')');
di(/^\$[\d,]+$/.test(r.raised) && /\$16,000,000/.test(r.meta), 'lo recaudado arranca de $0 y sube con la cadena, sobre la meta de siempre (' + r.raised + ' ' + r.meta + ')');
di(r.sinListado, 'la compra enseña solo el precio de la Seed Round ($0.20): sin precio de listado, sin 5x y sin valor al listar');
di(r.auditada, 'Seguridad: contrato del token auditado por CyberScope, 6 de 6, con el enlace al informe');
di(r.enProceso === 0 && r.cyber && r.kyc, 'Seguridad: KYC verificado por CyberScope, 3 / 3, con el certificado y la ficha enlazados (' + r.enProceso + ' en proceso)');
di(r.registrada, 'Seguridad: Nereum Finance LLC registrada, con su numero de seguimiento y el enlace a Sunbiz');
di(!r.viejo, 'Seguridad y la portada ya no dicen Halborn, Assure DeFi, «passed», la auditoria en proceso ni el numero de registro');
di(r.hb === 'Audit & KYC by CyberScope', 'el boton de la portada dice auditoria y KYC por CyberScope (' + r.hb + ')');
di(r.ruta[0] === 'In progress' && r.ruta[1] === 'In progress' && !r.rutaPasado && r.rutaProc === 0,
   'el Roadmap: fases 01 y 02 en proceso; registro, auditoria y KYC hechos, sin hitos de recaudacion (' + r.ruta.join(' / ') + ', ' + r.rutaProc + ' en proceso)');
di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
