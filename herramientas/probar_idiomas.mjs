// Comprueba que las frases de la Seed Round SE TRADUCEN de verdad.
// El fallo que cazó esto: las claves del diccionario seguian diciendo
// "Whitelist" mientras el texto visible ya decia "Seed Round", asi que el
// traductor no encontraba nada y esas frases se quedaban en ingles.
import { chromium } from 'playwright';
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const pg = await (await nav.newContext({ viewport:{width:1280,height:900} })).newPage();
await pg.goto('file:///home/user/nerium/index.html');
await pg.waitForTimeout(900);

const dic = await pg.evaluate(() => JSON.parse(document.getElementById('i18n').textContent));
const ESPERA = {
  es:'Seed Round abierta', fr:'Seed Round ouvert', de:'Seed Round geöffnet',
  pt:'Seed Round aberta', tr:'Seed Round açık', id:'Seed Round dibuka',
  vi:'Seed Round đang mở', ru:'Seed Round открыт', ar:'Seed Round مفتوحة',
  ja:'Seed Round 受付中', ko:'Seed Round 진행 중', zh:'Seed Round 开放中',
};
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; } else { mal++; console.log('  FALLA:', t); } };

for (const [lang, frase] of Object.entries(ESPERA)) {
  const d = dic[lang] || {};
  di(d['Seed Round open'] === frase, `${lang}: "Seed Round open" -> ${JSON.stringify(d['Seed Round open'])}`);
  di(!Object.keys(d).some(k => /hitelist/.test(k)), `${lang}: quedan claves con Whitelist`);
  const larga = Object.entries(d).find(([k]) => k.startsWith('Every contract that touches'));
  di(larga && larga[0].includes('Seed Round funds'), `${lang}: la clave larga sigue en whitelist`);
  di(larga && !/lista blanca|liste blanche|Whitelist-|lista branca|Beyaz liste|daftar putih|danh sách trắng|белого списка|القائمة البيضاء|ホワイトリスト|화이트리스트|白名单/.test(larga[1]),
     `${lang}: el valor largo aun dice lista blanca -> ${larga && larga[1].slice(0,60)}`);
}
console.log(mal ? `${ok} bien, ${mal} MAL` : `${ok}/${ok} correctas`);
await nav.close();
process.exit(mal ? 1 : 0);
