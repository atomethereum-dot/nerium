/* Portada de Nereum DEX: la ciudad, la torre tokenizada, las monedas y un gráfico
   de velas reales de BTC/USDT sobre el cielo. render(t) pinta el estado exacto del
   segundo t; la entrada dura ~9 s y después la escena sigue viva (cámara, monedas,
   precio). Solo dibuja mientras la portada está a la vista. */
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {Reflector} from 'three/addons/objects/Reflector.js';

const cl = v => Math.max(0, Math.min(1, v)), seg = (t, a, b) => cl((t - a) / (b - a));
const eo = v => 1 - Math.pow(1 - cl(v), 3);
const e5 = v => { v = cl(v); return v < .5 ? 16 * v ** 5 : 1 - Math.pow(-2 * v + 2, 5) / 2; };
const eio = v => { v = cl(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const spr = v => { v = cl(v); return v >= 1 ? 1 : 1 - Math.exp(-6.5 * v) * Math.cos(10.5 * v); };
const lerp = (a, b, k) => a + (b - a) * k;
function rnd(i){ const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function ruido(x, sem = 0){ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rnd(i + sem * 97), rnd(i + 1 + sem * 97), u); }
const imagen = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
export const esMovil = (w, h) => w <= 700 || w / h < 1.05;

const LOGOS = ['btc', 'eth', 'sol', 'usdt', 'bnb', 'xrp'];

export function arrancar(sec, api){
  const q = s => sec.querySelector(s), qq = s => [...sec.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const negro = q('.c3-negro'); negro.style.animation = 'none';
  let E = null, activa = true, vis = true, reloj = quieto ? 9.4 : 0, prev = null, pend = false, imgs = null;

  /* ── la escena entera, para un tamaño dado ── */
  function monta(){
    const W = sec.clientWidth, H = sec.clientHeight, MOVIL = esMovil(W, H);
    sec.classList.toggle('m', MOVIL);
    const EX = MOVIL ? 0 : W / H > 1.3 ? 3.1 : 2.4;
    const PR = Math.min(devicePixelRatio || 1, MOVIL ? 1.5 : 1.25);
    let R;
    try { R = new THREE.WebGLRenderer({antialias: false, powerPreference: 'high-performance'}); }
    catch (e){ sec.classList.add('sin3d'); return {W, H, MOVIL, sin: true}; }
    R.setPixelRatio(PR); R.setSize(W, H); R.domElement.className = 'c3-gl';
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace;
    sec.prepend(R.domElement);
    const S = new THREE.Scene(); S.background = new THREE.Color(0x020302); S.fog = new THREE.FogExp2(0x020302, .022);
    const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(new RoomEnvironment(), .04).texture; S.environmentIntensity = .5; pm.dispose();
    const C = new THREE.PerspectiveCamera(MOVIL ? 46 : 30, W / H, .1, 200);
    const rs = sec.getBoundingClientRect(), fin = (q('.c3-ctas').getBoundingClientRect().bottom - rs.top) / H;
    const LY = Math.max(6.4, Math.min(8.0, 7.9 - (.40 - fin) * 27));
    const espejo = new Reflector(new THREE.PlaneGeometry(140, 140), {textureWidth: W * PR * .5, textureHeight: H * PR * .5, color: 0x7a7a7a});
    espejo.rotation.x = -Math.PI / 2; S.add(espejo);
    const laca = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({color: 0x030403, roughness: .5, metalness: .2, transparent: true, opacity: .8}));
    laca.rotation.x = -Math.PI / 2; laca.position.y = .002; S.add(laca);
    const clave = new THREE.DirectionalLight(0xffffff, 1.5); clave.position.set(-5, 9, 7); S.add(clave);
    const contra = new THREE.PointLight(0xA6F03C, 45, 30, 1.4); contra.position.set(7, 6, -6); S.add(contra);
    const fria = new THREE.PointLight(0x9fb4ff, 18, 26, 1.5); fria.position.set(-6, 4, -3); S.add(fria);

    /* la torre: plantas de vidrio oscuro con ventanas, losas claras y un remate */
    function texVentanas(sem){ const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, 256, 64);
      for (let i = 0; i < 16; i++){ const on = rnd(i * 3.3 + sem) > .42, l = .35 + rnd(i * 7 + sem) * .65; x.fillStyle = on ? `rgba(220,255,170,${l})` : 'rgba(40,46,40,.6)'; x.fillRect(i * 16 + 2, 10, 12, 44); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
    const EDIF = new THREE.Group(), plantas = [];
    const losaM = new THREE.MeshStandardMaterial({color: 0xb9bcc4, metalness: .2, roughness: .45});
    const NP = 26, HP = .26, AN = 1.7, FO = 1.7;
    for (let i = 0; i < NP; i++){
      const ret = i > 19 ? .78 : 1, aw = AN * ret, af = FO * ret;
      const m = new THREE.MeshStandardMaterial({color: 0x0b0e0c, metalness: .9, roughness: .12, emissive: 0xffffff, emissiveMap: texVentanas(i * 11), emissiveIntensity: 0});
      const p = new THREE.Mesh(new THREE.BoxGeometry(aw, HP * .82, af), m); p.position.y = i * HP + HP * .41 + .06; EDIF.add(p);
      const l = new THREE.Mesh(new THREE.BoxGeometry(aw + .06, HP * .18, af + .06), losaM); l.position.y = i * HP + HP * .91 + .06; EDIF.add(l);
      plantas.push({m, y: p.position.y});
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(AN + .5, .12, FO + .5), losaM); base.position.y = .06; EDIF.add(base);
    const remate = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.1, .05), new THREE.MeshBasicMaterial({color: new THREE.Color(0xA6F03C).multiplyScalar(2)})); remate.position.y = NP * HP + .65; EDIF.add(remate);
    const ALTO = NP * HP + .06;
    EDIF.position.set(EX, 0, -.6); S.add(EDIF);

    /* la ciudad */
    function texCiudad(sem){ const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++){ const r = rnd(i * 13.1 + j * 7.7 + sem); if (r < .5) continue;
        const l = .25 + rnd(i * 3.9 + j * 5.3 + sem) * .75, lima = r > .93; x.fillStyle = lima ? `rgba(166,240,60,${l})` : `rgba(235,240,225,${l * .8})`; x.fillRect(i * 16 + 3, j * 16 + 4, 10, 9); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
    const TEXC = [0, 1, 2, 3].map(i => texCiudad(i * 31));
    const CIUDAD = [];
    for (let i = 0, n = 0; i < 400 && n < 46; i++){
      const x = EX + (rnd(i * 2.1) - .5) * (MOVIL ? 20 : 30), z = -2 - rnd(i * 4.7) * 22 + (rnd(i * 9.1) > .8 ? 5 : 0);
      if (Math.abs(x - EX) < 2.2 && z > -4.5) continue;
      if (!MOVIL && x < EX - 5.5 && z > -9) continue;
      if (z > -3.6 || x > EX + 10.5) continue;
      if (CIUDAD.some(c => Math.abs(c.x - x) < 1.7 && Math.abs(c.z - z) < 1.7)) continue;
      const w = .9 + rnd(i * 3.3) * .9, d = .9 + rnd(i * 6.1) * .9, h = 1.6 + Math.pow(rnd(i * 8.8), 1.6) * 8.5;
      const tx = TEXC[n % 4].clone(); tx.needsUpdate = true; tx.repeat.set(Math.max(1, Math.round(w * 2.2)), Math.max(1, Math.round(h * 2.2)));
      const m = new THREE.MeshStandardMaterial({color: 0x0a0c0b, metalness: .85, roughness: .2, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0});
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, h / 2, z); S.add(b);
      const tapa = new THREE.Mesh(new THREE.BoxGeometry(w + .04, .06, d + .04), losaM); tapa.position.set(x, h + .03, z); S.add(tapa);
      CIUDAD.push({x, z, h, b, tapa, k0: .2 + rnd(i * 5.5) * 1.6}); n++;
    }

    /* monedas con los logos de las principales */
    function caraLogo(img){ const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
      x.fillStyle = '#101113'; x.fillRect(0, 0, 512, 512);
      if (img){ x.save(); x.beginPath(); x.arc(256, 256, 236, 0, 7); x.clip(); x.drawImage(img, 20, 20, 472, 472); x.restore(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
    const sitios = MOVIL ? [[-2.7, 7.0, -6.5], [2.8, 7.6, -6], [-1.7, 9.2, -11], [3.5, 5.6, -8.5], [1.7, 9.8, -13], [-3.5, 8.4, -11]]
      : [[EX - 4.4, 7.4, -6.5], [EX + 4.2, 8.4, -6], [EX - 2.4, 9.0, -11], [EX + 6.6, 6.2, -8.5], [EX + 2.8, 9.4, -13], [EX - 6.4, 9.0, -11]];
    const cuerpoM = new THREE.MeshStandardMaterial({color: 0x17181c, metalness: 1, roughness: .22});
    const aroM = new THREE.MeshBasicMaterial({color: new THREE.Color(0xA6F03C).multiplyScalar(1.4)});
    const FLOT = LOGOS.map((s, i) => {
      const g = new THREE.Group(), r = .68;
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .1, 64), cuerpoM); cuerpo.rotation.x = Math.PI / 2; g.add(cuerpo);
      const tex = caraLogo(imgs[i]), mat = new THREE.MeshStandardMaterial({map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .55, metalness: .3, roughness: .35});
      for (const z of [1, -1]){ const f = new THREE.Mesh(new THREE.CircleGeometry(r * .94, 64), mat); f.position.z = z * .051; if (z < 0) f.rotation.y = Math.PI; g.add(f); }
      const aro = new THREE.Mesh(new THREE.TorusGeometry(r * .98, .014, 8, 96), aroM); aro.position.z = .05; g.add(aro);
      const [x, y, z] = sitios[i]; g.userData = {x, y, z, f: i * 1.3}; S.add(g); return g;
    });

    /* gráfico de velas reales de BTC/USDT sobre la ciudad */
    const CH = MOVIL ? {x0: EX - 5.0, x1: EX + 5.0, y0: 8.6, y1: 11.2, z: -11} : {x0: EX - .5, x1: EX + 9.8, y0: 6.8, y1: 9.9, z: -10};
    const NV = MOVIL ? 30 : 42, PV = (CH.x1 - CH.x0) / (NV - 1);
    const mSube = new THREE.MeshStandardMaterial({color: 0xA6F03C, emissive: 0xA6F03C, emissiveIntensity: .75, transparent: true, opacity: .9, fog: false});
    const mBaja = new THREE.MeshStandardMaterial({color: 0xFF4D6A, emissive: 0xFF4D6A, emissiveIntensity: .5, transparent: true, opacity: .8, fog: false});
    const caja = new THREE.BoxGeometry(1, 1, 1);
    const GV = new THREE.Group(); S.add(GV);
    const rejilla = new THREE.Group(); S.add(rejilla);
    for (let k = 0; k <= 4; k++){ const y = CH.y0 + (CH.y1 - CH.y0) * k / 4;
      rejilla.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(CH.x0 - .4, y, CH.z - .1), new THREE.Vector3(CH.x1 + .4, y, CH.z - .1)]),
        new THREE.LineBasicMaterial({color: 0xA6F03C, transparent: true, opacity: 0, fog: false}))); }
    const V = {L: null, fuente: null, velas: [], tubo: null, total: 0, t0: null, aY: null, ult: [CH.x1, (CH.y0 + CH.y1) / 2, CH.z]};
    const pone = (g, v, sube) => { const ya = V.aY(Math.min(v.a, v.c)), yb = V.aY(Math.max(v.a, v.c)), alto = Math.max(.06, yb - ya);
      const [me, cu] = g.children; cu.material = me.material = sube ? mSube : mBaja;
      cu.scale.set(PV * .58, alto, .12); cu.position.y = ya + alto / 2 - CH.y0;
      const hy = V.aY(v.h), ly = V.aY(v.l); me.scale.set(.03, Math.max(.02, hy - ly), .03); me.position.y = (hy + ly) / 2 - CH.y0; };
    function velas(fuente, t){
      const L = fuente.slice(-NV).map(v => ({...v})); if (L.length < 2) return;
      const mn = Math.min(...L.map(v => v.l)), mx = Math.max(...L.map(v => v.h)), r = mx - mn || 1;
      V.aY = v => CH.y0 + (v - mn) / r * (CH.y1 - CH.y0);
      while (V.velas.length < L.length){ const g = new THREE.Group(); g.add(new THREE.Mesh(caja, mSube), new THREE.Mesh(caja, mSube)); GV.add(g); V.velas.push(g); }
      V.velas.forEach((g, i) => { g.visible = i < L.length; });
      const x0 = CH.x1 - (L.length - 1) * PV;
      L.forEach((v, i) => { const g = V.velas[i]; g.position.set(x0 + i * PV, CH.y0, CH.z); pone(g, v, v.c >= v.a); });
      if (V.tubo){ GV.remove(V.tubo); V.tubo.geometry.dispose(); }
      const curva = new THREE.CatmullRomCurve3(L.map((v, i) => new THREE.Vector3(x0 + i * PV, V.aY(v.c), CH.z + .2)));
      const geo = new THREE.TubeGeometry(curva, 400, .025, 6, false);
      V.tubo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: new THREE.Color(0xC8FF6A).multiplyScalar(1.6), fog: false})); GV.add(V.tubo);
      V.total = geo.index.count; V.L = L; V.fuente = fuente;
      if (V.t0 === null) V.t0 = Math.max(t, 1.3) - (quieto ? 99 : 0);
    }
    function vivo(){
      if (!V.L) return; const p = api.precio(); if (!p) return;
      const u = {...V.L[V.L.length - 1]}; u.c = p; u.h = Math.max(u.h, p); u.l = Math.min(u.l, p);
      pone(V.velas[V.L.length - 1], u, u.c >= u.a); V.ult = [CH.x1, V.aY(u.c), CH.z];
    }

    /* anillo láser que recorre la torre */
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(1.0, .012, 8, 96), new THREE.MeshBasicMaterial({color: new THREE.Color(0xA6F03C).multiplyScalar(3.2)}));
    anillo.rotation.x = Math.PI / 2; anillo.scale.set(1.62, 1.62, 1); S.add(anillo);
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({color: 0xA6F03C, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false}));
    plano.rotation.x = -Math.PI / 2; S.add(plano);

    const comp = new EffectComposer(R); comp.setPixelRatio(PR); comp.setSize(W, H);
    comp.addPass(new RenderPass(S, C));
    comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), .6, .5, .88));
    comp.addPass(new OutputPass()); comp.addPass(new SMAAPass());

    const v3 = new THREE.Vector3();
    const aPant = (x, y, z) => { v3.set(x, y, z).project(C); return [(v3.x * .5 + .5) * W, (-v3.y * .5 + .5) * H]; };
    const ETQ = MOVIL
      ? [['#c3e1', 4.2, () => V.ult, [-12, 50]], ['#c3e2', 3.3, () => FLOT[1].position.toArray(), [-30, 26]], ['#c3e3', 4.9, () => [EX - .85, 4.2, -.6], [-12, 0]]]
      : [['#c3e1', 4.2, () => V.ult, [-30, 70]], ['#c3e3', 4.9, () => [EX - .85, 1.8, -.6], [-70, 0]], ['#c3e2', 3.3, () => FLOT[1].position.toArray(), [-60, 95]]];
    const lin = q('.c3-lin'), fi = q('#c3fi'), vela = {};
    const caja2 = e => { const b = e.getBoundingClientRect(), rs = sec.getBoundingClientRect(); return {l: b.left - rs.left, t: b.top - rs.top, r: b.right - rs.left, b: b.bottom - rs.top}; };
    const choca = (a, b) => a.l < b.r + 8 && a.r > b.l - 8 && a.t < b.b + 8 && a.b > b.t - 8;
    let fijos = null;

    function render(t){
      if (api.velas() && api.velas() !== V.fuente) velas(api.velas(), t);
      vivo();
      const ent = e5(seg(t, 0, 3.4)), ang = lerp(-.55, -.18, ent) + Math.sin(t * .16) * .06;
      if (MOVIL){ const rm = lerp(19, 22, ent);
        C.position.set(EX + Math.sin(ang * .6) * rm, lerp(2.4, 4.2, ent), -.6 + Math.cos(ang * .6) * rm); C.lookAt(EX, LY, -.6); }
      else { const rad = lerp(18, 21, ent);
        C.position.set(EX + .6 + Math.sin(ang) * rad, lerp(2.2, 4.4, ent), -.6 + Math.cos(ang) * rad); C.lookAt(EX - 2.4, 3.7, -.6); }
      const red = seg(t, 6.2, 7.6);
      CIUDAD.forEach((c, i) => { const k = e5(seg(t, .1 + c.k0 * .5, 1.2 + c.k0 * .5)); c.b.scale.y = Math.max(.001, k); c.b.position.y = c.h * k / 2;
        c.tapa.position.y = c.h * k + .03; c.tapa.visible = k > .02;
        c.b.material.emissiveIntensity = (.16 + .2 * red) * cl(k * 1.3) * (.85 + .15 * ruido(t * .7 + i, i)); });
      FLOT.forEach((g, i) => { const u = g.userData, k = spr(seg(t, 1.6 + i * .22, 2.6 + i * .22));
        g.position.set(u.x, u.y + Math.sin(t * 1.0 + u.f) * .18, u.z); g.scale.setScalar(Math.max(.001, k));
        g.rotation.set(.08, Math.sin(t * .45 + u.f) * .7 - .4, Math.sin(t * .3 + u.f) * .05); });
      EDIF.children.forEach((m, i) => { const k = e5(seg(t, .2 + i * .028, .9 + i * .028)); m.scale.y = Math.max(.001, k); });
      const sc = seg(t, 2.4, 4.8), ys = lerp(ALTO + .3, .1, eio(sc));
      anillo.visible = t > 2.2 && t < 5.4; anillo.position.set(EX, ys, -.6); plano.position.set(EX, ys, -.6);
      plano.material.opacity = anillo.visible ? .07 * Math.sin(Math.PI * sc) : 0;
      anillo.material.color.set(0xA6F03C).multiplyScalar(3.2 * (anillo.visible ? cl((t - 2.2) * 3) * (1 - seg(t, 4.8, 5.4)) : 0));
      plantas.forEach(p => { const enc = t > 4.8 ? 1 : (p.y > ys ? 1 : 0), k = enc * cl((t - 2.4) * 2);
        p.m.emissiveIntensity = (.1 + .38 * k) * (.85 + .15 * Math.sin(t * 2 + p.y)); });
      const tv = V.t0 === null ? -1 : t - V.t0 + 1.3;
      V.velas.forEach((g, i) => { const k = e5(seg(tv, 1.3 + i * .065, 1.8 + i * .065)); g.scale.y = Math.max(.001, k); if (V.L) g.visible = i < V.L.length && k > 0; });
      if (V.tubo) V.tubo.geometry.setDrawRange(0, Math.floor(V.total * eio(seg(tv, 1.6, 4.4)) / 6) * 6);
      rejilla.children.forEach(l => l.material.opacity = .13 * eo(seg(t, 1.0, 2.0)));
      comp.render();
      /* etiquetas con su línea al punto de la escena */
      let h = '';
      const kf = e5(seg(t, 5.6, 6.5)), fx = MOVIL ? 20 : W - 96 - 340, fy = MOVIL ? H - 58 : H * .86;
      if (!fijos && t > 2.4) fijos = [...qq('.c3-eye, .c3 h1 .mask, .c3-sub, .c3-ctas a')].filter(e => e.offsetWidth).map(caja2);
      const puestos = (fijos || []).slice(); if (kf > 0) puestos.push({l: fx, t: fy - fi.offsetHeight, r: fx + fi.offsetWidth, b: fy});
      ETQ.forEach(([s, a, p, off]) => { const el = q(s), sin = s === '#c3e1' && !V.L;
        const [x, y] = aPant(...p()), ew = el.offsetWidth, eh = el.offsetHeight, ly = y + off[1];
        const izq = Math.max(8, Math.min(W - 8 - ew, off[0] < 0 ? x + off[0] - ew : x + off[0])), lx = off[0] < 0 ? izq + ew : izq;
        const rc = {l: izq, t: ly - eh / 2, r: izq + ew, b: ly + eh / 2}, libre = !puestos.some(o => choca(rc, o));
        vela[s] = lerp(vela[s] ?? (libre ? 1 : 0), libre ? 1 : 0, quieto ? 1 : .12); if (vela[s] > .5) puestos.push(rc);
        const k = (sin ? 0 : e5(seg(s === '#c3e1' ? Math.min(t, tv) : t, a, a + .7)) * (MOVIL && s !== '#c3e1' ? 1 - e5(seg(t, 5.4, 5.9)) : 1)) * vela[s];
        el.style.opacity = k; el.style.visibility = k > 0 ? 'visible' : 'hidden';
        el.style.transform = `translate(${izq}px,${ly}px) translate(0,-50%) scale(${.9 + .1 * k})`;
        if (k > 0) h += `<line x1="${x}" y1="${y}" x2="${lerp(x, lx, k)}" y2="${lerp(y, ly, k)}" stroke="rgba(166,240,60,${.7 * k})" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${3.5 * k}" fill="#A6F03C"/>`; });
      lin.innerHTML = h;
      fi.style.width = MOVIL ? (W - 40) + 'px' : ''; fi.style.opacity = kf; fi.style.visibility = kf > 0 ? 'visible' : 'hidden';
      fi.style.transform = `translate(${fx}px,${fy + (1 - kf) * 20}px) translate(0,-100%)`;
    }
    function suelta(){
      S.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m){ (Array.isArray(m) ? m : [m]).forEach(x => { if (x.map) x.map.dispose(); if (x.emissiveMap) x.emissiveMap.dispose(); x.dispose(); }); } });
      espejo.getRenderTarget().dispose(); comp.dispose(); R.dispose(); R.forceContextLoss(); R.domElement.remove();
    }
    return {W, H, MOVIL, EX, R, C, comp, espejo, PR, render, suelta, olvida: () => { fijos = null; }};
  }

  /* palabras y bloques que entran (solo DOM) */
  function dom(t){
    for (const e of qq('[data-t0]')){ const k = e5(seg(t, +e.dataset.t0, +e.dataset.t0 + .75)); e.style.transform = k >= 1 ? '' : `translateY(${(1 - k) * 105}%)`; }
    for (const e of qq('[data-fade]')){ const [a, b] = e.dataset.fade.split(',').map(Number), k = eo(seg(t, a, b));
      e.style.opacity = k; e.style.transform = k >= 1 ? '' : `translateY(${(1 - k) * 14}px)`; }
    q('.c3-top').style.opacity = eo(seg(t, 0, .6));
    negro.style.opacity = 1 - eo(seg(t, 0, .9));
    for (let i = 0; i < 6; i++){ const a = 2.2 + i * 1.1; q('#c3p' + (i + 1)).style.width = (100 * seg(t, a, a + 1.1)) + '%'; q('#c3s' + (i + 1)).classList.toggle('on', t >= a); }
  }
  /* un solo bucle a la vez; con movimiento reducido, un cuadro por segundo para el precio */
  function cuadro(ahora){
    pend = false; if (!activa || !vis || document.hidden){ prev = null; return; }
    if (!quieto){ if (prev !== null) reloj += Math.min(.1, (ahora - prev) / 1000); prev = ahora; }
    dom(reloj); if (E && !E.sin) E.render(reloj);
    pend = true; if (quieto) setTimeout(() => requestAnimationFrame(cuadro), 1000); else requestAnimationFrame(cuadro);
  }
  const sigue = () => { if (!pend){ pend = true; requestAnimationFrame(cuadro); } };
  let ro = null;
  function redimensiona(){
    if (!E) return; const W = sec.clientWidth, H = sec.clientHeight; if (!W || !H || (W === E.W && H === E.H)) return;
    if (E.sin || esMovil(W, H) !== E.MOVIL || (!E.MOVIL && (W / H > 1.3) !== (E.W / E.H > 1.3))){ if (!E.sin) E.suelta(); E = monta(); sigue(); return; }
    E.W = W; E.H = H; E.R.setSize(W, H); E.comp.setSize(W, H); E.C.aspect = W / H; E.C.updateProjectionMatrix();
    E.espejo.getRenderTarget().setSize(W * E.PR * .5, H * E.PR * .5); E.olvida(); sigue();
  }
  Promise.all(LOGOS.map(s => imagen('/app/coins/' + s + '.svg'))).then(i => {
    imgs = i; E = monta(); sigue();
    ro = new ResizeObserver(() => redimensiona()); ro.observe(sec);
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) sigue(); }).observe(sec);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sigue(); });
  });
  return { activa(v){ activa = v; if (v) sigue(); },
    /* para las pruebas: pinta el segundo t exacto y sigue desde ahí */
    ve(t){ reloj = t; prev = null; dom(t); if (E && !E.sin) E.render(t); } };
}
