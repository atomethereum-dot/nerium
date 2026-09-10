// El fondo de la portada: los tres planos, lo que se posa y el hueco del medio.
//
// Lo que vigila:
//  · que el hueco del centro EXISTA. Es la razon de ser del diseno —ahi va el
//    titular— y es lo primero que se pierde si alguien toca las filas o el
//    reparto horizontal. Se mide: la banda del medio tiene que estar muy por
//    debajo de la de arriba y la de abajo.
//  · que no vuelva el cian. La mezcla suma luz; con la de antes, dos azules
//    encima daban rgb(111,239,255).
//  · que los dos caminos arranquen sin reventar. El de lienzo se rompio dos
//    veces por leer una variable antes de declararla y en pantalla no se
//    notaba: la portada se quedaba quieta y parecia una decision.
import { chromium } from 'playwright';
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const URL = 'file:///home/user/nerium/index.html';
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

// ── el camino de lienzo, forzado: es el unico que deja leer los pixeles ──
const ctx = await nav.newContext({ viewport:{width:1280,height:820} });
await ctx.addInitScript(() => {
  const o = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) {
    return t === 'webgl2' ? null : o.call(this, t, ...a);
  };
});
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(URL, { waitUntil:'load' });
await pg.waitForTimeout(5000);

di((await pg.evaluate(() => window.__campo)) === 'canvas', 'sin WebGL tira del camino de lienzo');
di(errs.length === 0, 'y arranca sin reventar' + (errs.length ? ': ' + errs[0] : ''));

const lee = () => pg.evaluate(() => {
  const cv = document.getElementById('burst');
  const c2 = document.createElement('canvas');
  c2.width = cv.width; c2.height = cv.height;
  c2.getContext('2d').drawImage(cv, 0, 0);
  const d = c2.getContext('2d').getImageData(0, 0, c2.width, c2.height).data;
  const H = c2.height;
  const bandas = [0, 0, 0], n = [0, 0, 0];
  let cian = 0, gris = 0, vivos = 0, suma = 0;
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % c2.width, py = ((i / 4) / c2.width) | 0;
    const r = d[i], g = d[i+1], b = d[i+2];
    const luz = r + g + b;
    const k = py < H * 0.34 ? 0 : (py < H * 0.66 ? 1 : 2);
    bandas[k] += luz; n[k]++;
    suma += luz;
    if (luz < 90) continue;
    vivos++;
    const M = Math.max(r, g, b), m = Math.min(r, g, b), D = M - m;
    const s = M ? D / M : 0;
    let h = 0;
    if (D) h = (M === r ? (((g-b)/D)%6) : M === g ? ((b-r)/D+2) : ((r-g)/D+4)) * 60;
    h = (h + 360) % 360;
    if (h >= 170 && h <= 205 && s > 0.25) cian++;
    if (M > 90 && s < 0.10) gris++;
  }
  return { arriba: bandas[0]/n[0], medio: bandas[1]/n[1], abajo: bandas[2]/n[2],
           cian, gris, vivos, suma };
});
const a = await lee();
di(a.vivos > 2000, 'el campo esta pintado (' + a.vivos + ' pixeles con luz)');
di(a.medio < a.arriba * 0.5, `el medio esta vacio para el titular (arriba ${a.arriba.toFixed(1)}, medio ${a.medio.toFixed(1)})`);
di(a.medio < a.abajo * 0.5, `y tambien respecto a abajo (abajo ${a.abajo.toFixed(1)})`);
di(a.cian === 0, 'no hay un solo pixel cian (' + a.cian + ')');
di(a.gris === 0, 'ni un gris neutro: todo lleva azul dentro (' + a.gris + ')');

// que siga vivo: dos instantes distintos no pueden dar la misma imagen
const b1 = a.suma;
await pg.waitForTimeout(1400);
const b2 = (await lee()).suma;
di(Math.abs(b1 - b2) > 1, 'el campo se mueve: dos instantes no dan lo mismo');

// tres planos: los bloques no pueden ser todos del mismo tamano
const planos = await pg.evaluate(() => {
  const s = [...document.scripts].map(x => x.textContent).join('');
  return { esc: /ESC=\[0\.55,1,1\.38\]/.test(s), vel: /VEL=\[0\.42,1,1\.62\]/.test(s),
           par: /PAR=\[0\.32,0\.76,1\.20\]/.test(s), filas: (s.match(/FILAS=\[([^\]]+)\]/)||[])[1] };
});
di(planos.esc && planos.vel && planos.par, 'tres planos con celda, velocidad y paralaje propios');
di(planos.filas && !planos.filas.split(',').some(v => +v > 0.34 && +v < 0.66),
   'ninguna fila de aterrizaje cae en la banda del titular');
await ctx.close();

// ── y el camino normal, con WebGL disponible ──
const ctx2 = await nav.newContext({ viewport:{width:1280,height:820} });
const pg2 = await ctx2.newPage();
const errs2 = []; pg2.on('pageerror', e => errs2.push(e.message));
await pg2.goto(URL, { waitUntil:'load' });
await pg2.waitForTimeout(4500);
const motor = await pg2.evaluate(() => window.__campo);
di(['webgl', 'canvas', 'canvas (webgl iba lento)'].includes(motor), 'el motor se declara: ' + motor);
di(errs2.length === 0, 'sin errores de pagina' + (errs2.length ? ': ' + errs2[0] : ''));
di((await pg2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0,
   'y no se sale nada por el lado');
await ctx2.close();

console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close();
process.exit(mal ? 1 : 0);
