// Intro de Nereum: escena 3D que se renderiza cuadro a cuadro (window.frame(t))
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Q = new URLSearchParams(location.search);
const W = +Q.get('w') || 1920, H = +Q.get('h') || 1080, VERT = H > W;
const NSUB = +Q.get('n') || 8;
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => cl((t - a) / (b - a));
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const eo5 = t => 1 - Math.pow(1 - t, 5);
const ei = t => t * t * t;
const sm = t => t * t * (3 - 2 * t);
const col = (h, k = 1) => new THREE.Color(h).multiplyScalar(k);

// ---------- tiempos (segundos) ----------
export const T = { s2: 1.15, s3: 2.25, barra0: 2.55, barra1: 4.35, rell0: 4.42, rell1: 4.66, s5: 4.6, s6: 5.95, s7: 6.85, fin: 7.7 };
const TOMAS = [0, T.s2, T.s3, T.s6, T.s7, T.fin];
const toma = t => { for (let i = TOMAS.length - 2; i >= 0; i--) if (t >= TOMAS[i]) return i; return 0 };

// ---------- motor ----------
const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, alpha: false });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
renderer.localClippingEnabled = true; renderer.autoClear = false;

const scene = new THREE.Scene();
const VFOV = VERT ? 40 : 26;
const camera = new THREE.PerspectiveCamera(VFOV, W / H, 50, 400000);
const tanV = Math.tan(THREE.MathUtils.degToRad(VFOV / 2)), tanH = tanV * W / H;

// ---------- entorno (reflejos) ----------
function entorno() {
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float y=vP.y; vec3 top=vec3(.07,.10,.22); vec3 mid=vec3(.010,.016,.04); vec3 c= y>0.? mix(mid,top,pow(y,.8)) : mid*(1.+y); gl_FragColor=vec4(c,1.); }'
  })));
  const panel = (w, h, c, k, p) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col(c, k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); es.add(m) };
  panel(64, 30, '#eef3ff', 2.0, [-50, 48, 50]);   // principal, arriba a la izquierda
  panel(40, 26, '#8fb0ff', 1.1, [52, 50, 48]);    // arriba a la derecha, azulada
  panel(16, 80, '#2E86FF', 2.6, [80, -6, 16]);    // azul a la derecha
  panel(56, 7, '#76d6ff', 1.5, [-40, -50, 40]);   // cian abajo a la izquierda
  panel(34, 34, '#6b5cff', 1.4, [-74, -14, -22]); // violeta
  panel(7, 110, '#ffffff', 5.0, [30, 0, 82]);     // franja del barrido
  panel(60, 36, '#c9d6ff', .45, [0, 10, 96]);     // frente suave, para las letras
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(es, 0.0, 1, 300).texture;
}
scene.environment = entorno();
const luzKey = new THREE.DirectionalLight('#f2f5ff', 3.4); luzKey.position.set(-1.2, 1.6, 2.2); scene.add(luzKey);
const luzRim = new THREE.DirectionalLight('#5aa0ff', 1.6); luzRim.position.set(2, -.4, -.6); scene.add(luzRim);
scene.add(new THREE.HemisphereLight('#c8d4ff', '#05070d', .55));

// ---------- fondo ----------
const fondoMat = new THREE.ShaderMaterial({
  uniforms: { cA: { value: new THREE.Color() }, cB: { value: new THREE.Color() }, centro: { value: new THREE.Vector2(.5, .5) },
    asp: { value: W / H }, glow: { value: new THREE.Color() }, gR: { value: .35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,.9999,1.); }',
  fragmentShader: `uniform vec3 cA,cB,glow; uniform vec2 centro; uniform float asp,gR; varying vec2 vUv;
    void main(){ vec2 d=vUv-centro; d.x*=asp; vec2 e=vUv-.5; e.x*=asp; float r=length(e);
      vec3 c=mix(cA,cB,smoothstep(0.,1.05,r)); c+=glow*exp(-dot(d,d)/(gR*gR)); gl_FragColor=vec4(c,1.); }`,
  depthTest: false, depthWrite: false
});
const fondo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fondoMat);
fondo.frustumCulled = false; fondo.renderOrder = -100; scene.add(fondo);

// ---------- piramide ----------
const R = 520, HP = 0.40 * R, PY = 340;
const pir = new THREE.Group(); scene.add(pir);
const pirIn = new THREE.Group(); pir.add(pirIn);
const matPir = new THREE.MeshPhysicalMaterial({ color: '#dfe6ff', metalness: 1, roughness: .2, clearcoat: .7, clearcoatRoughness: .08 });
{
  const A = [0, 0, HP], Tp = [0, R, 0], Rp = [R, 0, 0], Bp = [0, -R, 0], Lp = [-R, 0, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([A, Tp, Lp, A, Rp, Tp, A, Bp, Rp, A, Lp, Bp, Tp, Rp, Bp, Tp, Bp, Lp].flat(), 3));
  g.computeVertexNormals();
  pirIn.add(new THREE.Mesh(g, matPir));
  const v = p => new THREE.Vector3(...p);
  const matArista = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 1, roughness: .12 });
  for (const [a, b] of [[A, Tp], [A, Rp], [A, Bp], [A, Lp], [Tp, Rp], [Rp, Bp], [Bp, Lp], [Lp, Tp]])
    pirIn.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(v(a), v(b)), 1, R * .007, 10), matArista));
}
pir.position.set(0, PY, 0);

// ---------- letras ----------
const glif = await (await fetch('glifos.json')).json();
const LX = 662, DEP = 170, BT = 20, BS = 14;
const matFrente = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: .0, roughness: .28, clearcoat: 1, clearcoatRoughness: .05, emissive: '#2a3350', emissiveIntensity: .22 });
const matLado = new THREE.MeshPhysicalMaterial({ color: '#2a63e8', metalness: .8, roughness: .24 });
const matFant = new THREE.MeshBasicMaterial({ color: col('#2E86FF', 1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const matOculto = new THREE.MeshBasicMaterial({ visible: false });
const planoSol = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), planoFan = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
matFrente.clippingPlanes = matLado.clippingPlanes = [planoSol];
const fantasmas = []; // por letra: material propio (opacidad por letra)
const letras = new THREE.Group(); scene.add(letras);
const loader = new SVGLoader();
const LETRAS = [];
const lineaMat = (k = 1) => { const m = new LineMaterial({ color: 0xffffff, linewidth: VERT ? 2.4 : 2.8, transparent: true, depthTest: false, worldUnits: false }); m.color.setRGB(.95 * k, 1.12 * k, 1.5 * k); m.resolution.set(W, H); return m };
const flecha = (s) => { const sh = new THREE.Shape(); sh.moveTo(s, 0); sh.lineTo(-s * .6, s * .62); sh.lineTo(-s * .6, -s * .62); sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col('#ffffff', 1.4), transparent: true, depthTest: false })); m.renderOrder = 20; return m };
for (const l of glif.letras) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${l.d}"/></svg>`;
  const sp = loader.parse(svg).paths[0];
  const shapes = SVGLoader.createShapes(sp);
  const g = new THREE.ExtrudeGeometry(shapes, { depth: DEP, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelOffset: -BS, bevelSegments: 5, curveSegments: 14 });
  g.rotateX(Math.PI); g.translate(LX, 0, 0);
  const sol = new THREE.Mesh(g, [matFrente, matLado]); letras.add(sol);
  const mf = matFant.clone(); mf.clippingPlanes = [planoFan];
  const fan = new THREE.Mesh(g, [mf, matOculto]); fan.renderOrder = 5; letras.add(fan);
  // contornos para trazar
  const trazos = [];
  for (const sub of sp.subPaths) {
    const largo = sub.getLength(); const n = Math.max(24, Math.ceil(largo / 5));
    const pts = sub.getSpacedPoints(n).map(p => [p.x + LX, -p.y, BT + 4]);
    const a = pts[0], b = pts[pts.length - 1]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > .5) pts.push(a.slice());
    const lg = new LineGeometry(); lg.setPositions(pts.flat());
    const ln = new Line2(lg, lineaMat()); ln.renderOrder = 10; ln.frustumCulled = false; letras.add(ln);
    const fl = flecha(26); letras.add(fl);
    trazos.push({ ln, fl, pts, nseg: pts.length - 1 });
  }
  LETRAS.push({ l, sol, fan, mf, trazos, x0: LX + l.x + l.bounds[0], x1: LX + l.x + l.bounds[2] });
}
const XL0 = -R, XL1 = LX + 3377, LW = XL1 - XL0, LCX = (XL0 + XL1) / 2, LCY = PY;

// ---------- barra (la carga 0-100) ----------
const BX0 = R + 30, BX1 = XL1 + 70;
const barraPista = (() => { const g = new LineGeometry(); g.setPositions([0, 0, 0, 1, 0, 0]); const m = lineaMat(.35); m.linewidth = VERT ? 1.4 : 1.6; const ln = new Line2(g, m); ln.position.set(BX0, PY, -40); ln.frustumCulled = false; ln.renderOrder = 8; scene.add(ln); return ln })();
const barra = (() => { const g = new LineGeometry(); g.setPositions([0, 0, 0, 1, 0, 0]); const m = lineaMat(1.25); m.linewidth = VERT ? 3 : 3.4; const ln = new Line2(g, m); ln.position.set(BX0, PY, -40); ln.frustumCulled = false; ln.renderOrder = 9; scene.add(ln); return ln })();
const puntaBarra = flecha(34); scene.add(puntaBarra);
// el contorno del rombo, que se recorre antes de soltar la barra
const rombo = (() => { const pts = []; const vs = [[R, 0], [0, R], [-R, 0], [0, -R], [R, 0]];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 40; k++) { const u = k / 40; pts.push([lerp(vs[i][0], vs[i + 1][0], u), lerp(vs[i][1], vs[i + 1][1], u), 2]) }
  pts.push([R, 0, 2]); const g = new LineGeometry(); g.setPositions(pts.flat()); const ln = new Line2(g, lineaMat(1.1)); ln.frustumCulled = false; ln.renderOrder = 10; pirIn.add(ln); return { ln, nseg: pts.length - 1 } })();

// el contador
await document.fonts.load('400 64px "DM Mono"');
const cnv = document.createElement('canvas'); cnv.width = 320; cnv.height = 112;
const cctx = cnv.getContext('2d'); const ctex = new THREE.CanvasTexture(cnv); ctex.colorSpace = THREE.SRGBColorSpace;
const contador = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex, transparent: true, depthTest: false }));
contador.renderOrder = 30; contador.center.set(.5, 0); scene.add(contador);
let ultimoN = -1;
function pintaContador(n) {
  if (n === ultimoN) return; ultimoN = n;
  cctx.clearRect(0, 0, cnv.width, cnv.height);
  cctx.font = '400 74px "DM Mono"'; cctx.textAlign = 'center'; cctx.textBaseline = 'alphabetic';
  cctx.fillStyle = '#d6e6ff'; cctx.fillText(String(n), cnv.width / 2, 88);
  ctex.needsUpdate = true;
}
// la marca vertical que lleva el numero sobre las letras
const marca = (() => { const g = new LineGeometry(); g.setPositions([0, 0, 0, 0, 1, 0]); const m = lineaMat(.7); m.linewidth = VERT ? 1.3 : 1.5; const ln = new Line2(g, m); ln.frustumCulled = false; ln.renderOrder = 9; scene.add(ln); return ln })();
// la luz del relleno (barre de izquierda a derecha)
const luzRelleno = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
  uniforms: { k: { value: 1 }, c: { value: col('#a9c8ff', 2.2) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: 'uniform float k; uniform vec3 c; varying vec2 vUv; void main(){ float x=vUv.x-.5, y=vUv.y-.5; float a=exp(-x*x*60.)*(1.-smoothstep(.25,.5,abs(y))); gl_FragColor=vec4(c*a*k,1.); }',
  transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
luzRelleno.renderOrder = 25; scene.add(luzRelleno);

// ---------- postproceso ----------
class Acumula extends Pass {
  constructor() {
    super(); this.n = NSUB; this.preparar = () => {};
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, w: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: 'uniform sampler2D tex; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=texture2D(tex,vUv)*w; }',
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false, transparent: true
    }));
  }
  render(r, writeBuffer) {
    r.setRenderTarget(writeBuffer); r.setClearColor(0x000000, 0); r.clear();
    for (let i = 0; i < this.n; i++) {
      this.preparar(i, this.n);
      r.setRenderTarget(this.rt); r.setClearColor(0x000000, 1); r.clear(); r.render(scene, camera);
      r.setRenderTarget(writeBuffer); this.quad.material.uniforms.tex.value = this.rt.texture; this.quad.material.uniforms.w.value = 1 / this.n; this.quad.render(r);
    }
  }
}
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
composer.setPixelRatio(1); composer.setSize(W, H);
const acc = new Acumula(); composer.addPass(acc);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .8, .55, .92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const final = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, luz: { value: 1 }, ca: { value: 0 }, gl: { value: 0 }, seed: { value: 0 }, vig: { value: .25 }, grano: { value: 1.6 / 255 }, res: { value: new THREE.Vector2(W, H) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float luz,ca,gl,seed,vig,grano; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+seed*17.31)*43758.5453); }
    void main(){
      vec2 uv=vUv;
      float band=floor(uv.y*28.); float g=step(1.-gl*.5,h(vec2(band,3.)))*(h(vec2(band,7.))-.5)*gl*.08; uv.x+=g;
      vec2 d=(uv-.5); float k=ca*(.4+length(d));
      vec3 c; c.r=texture2D(tDiffuse,uv+vec2(k,0.)).r; c.g=texture2D(tDiffuse,uv).g; c.b=texture2D(tDiffuse,uv-vec2(k,0.)).b;
      vec2 e=(vUv-.5)*vec2(res.x/res.y,1.); if(res.y>res.x) e=(vUv-.5)*vec2(1.,res.y/res.x);
      c*=1.-vig*smoothstep(.35,1.25,length(e));
      c*=luz; c+=(h(vUv*res)-.5)*grano;
      gl_FragColor=vec4(c,1.);
    }`
});
composer.addPass(final);

// ---------- camara ----------
const _t = new THREE.Vector3();
function ponCamara(tx, ty, tz, d, yaw, pitch) {
  _t.set(tx, ty, tz);
  camera.position.set(tx + d * Math.sin(yaw) * Math.cos(pitch), ty + d * Math.sin(pitch), tz + d * Math.cos(yaw) * Math.cos(pitch));
  camera.lookAt(_t);
}
const dAncho = (w) => (w / 2) / tanH, dAlto = (h) => (h / 2) / tanV;
const dMin = (s) => VERT ? dAncho(s) : dAlto(s); // que s quepa en la dimension menor
// fraccion del ancho que ocupa el logotipo completo
const fr = (land, port) => VERT ? port : land;
const dLogo = (f) => dAncho(LW / f);

const C = { oscuro: ['#07122b', '#000000'], claro: ['#f3f6fd', '#cfd9ef'] };
const AZUL = new THREE.Color('#2E86FF'), PLATA = new THREE.Color('#bcd0ff'), MARINO = new THREE.Color('#0e1d45');
const _v = new THREE.Vector3();

// ---------- el estado de la escena en el tiempo t ----------
function estado(t) {
  const s = toma(t);
  const claro = s === 1 || s === 3;
  fondoMat.uniforms.cA.value.set(claro ? C.claro[0] : C.oscuro[0]);
  fondoMat.uniforms.cB.value.set(claro ? C.claro[1] : C.oscuro[1]);
  fondoMat.uniforms.glow.value.set(claro ? '#000000' : '#082058').multiplyScalar(claro ? 0 : 1);
  bloom.strength = claro ? .1 : .42; bloom.threshold = claro ? 1.3 : 1.12; bloom.radius = .45;
  let yawP = 0, pitP = 0, verLetras = s >= 2, verBarra = s === 2;
  pir.position.set(0, PY, 0); pir.scale.setScalar(1);
  scene.environmentRotation.set(0, 0, 0);
  matPir.color.copy(PLATA); matPir.roughness = .2; matPir.metalness = 1; matPir.clearcoat = .7;
  const azulPir = () => { matPir.color.copy(AZUL); matPir.roughness = .2; matPir.metalness = .62 };
  if (s === 0) {
    const u = seg(t, 0, T.s2);
    yawP = lerp(-.62, -.14, eo(u)); pitP = lerp(.30, .08, eo(u));
    scene.environmentRotation.y = lerp(-1.1, .7, eio(u));
    const d = dMin(2 * R / lerp(.36, .45, u));
    ponCamara(0, PY, 0, d, 0, 0);
    fondoMat.uniforms.glow.value.multiplyScalar(sm(seg(t, 0, .5)));
  } else if (s === 1) {
    const u = seg(t, T.s2, T.s3);
    yawP = lerp(.42, .16, eo(u)); pitP = lerp(-.22, -.08, eo(u));
    scene.environmentRotation.y = lerp(.5, -.4, u);
    matPir.color.copy(MARINO); matPir.metalness = .7; matPir.roughness = .14; matPir.clearcoat = 1;
    ponCamara(0, PY, 0, dMin(2 * R / lerp(.5, .57, u)), 0, 0);
  } else if (s === 2) {
    // dibujo + relleno + toma pequena, todo en la misma toma oscura
    const u = seg(t, T.s3, T.s5 + .05);
    azulPir();
    yawP = .10 * Math.sin(t * 1.3); pitP = .05 * Math.cos(t * 1.1);
    scene.environmentRotation.y = lerp(-.6, .5, seg(t, T.s3, T.s6));
    let f = lerp(fr(.80, .74), fr(.85, .78), sm(u)), yaw = lerp(.22, .1, eo(u)), pit = lerp(.1, .05, u);
    const k = eo5(seg(t, T.rell0 + .12, T.rell0 + .6));
    f = lerp(f, fr(.5, .64), k) + fr(.03, .03) * seg(t, T.rell0 + .6, T.s6);
    yaw = lerp(yaw, .28, k) - .36 * sm(seg(t, T.rell0 + .4, T.s6)); pit = lerp(pit, .13, k);
    ponCamara(LCX, LCY, 0, dLogo(f), yaw, pit);
  } else if (s === 3) {
    const u = seg(t, T.s6, T.s7);
    azulPir();
    yawP = lerp(-.12, -.05, u); pitP = .04;
    scene.environmentRotation.y = lerp(.9, .4, u);
    ponCamara(LCX, LCY, 0, dLogo(lerp(fr(.6, .72), fr(.64, .76), eo(u))), lerp(-.26, -.16, eo(u)), .09);
  } else {
    const u = seg(t, T.s7, T.fin);
    azulPir();
    const z = ei(u);
    yawP = lerp(.18, .4, u); pitP = lerp(-.05, -.15, u);
    pir.position.set(lerp(1150, 2250, z), PY + 60, lerp(600, 980, z));
    scene.environmentRotation.y = lerp(-.3, .5, u);
    const f = lerp(fr(1.35, 2.1), fr(3.2, 5), z);
    ponCamara(lerp(2100, 2600, z), LCY - 20, 0, dLogo(f), lerp(.1, .03, u), .04);
  }
  pirIn.rotation.set(-pitP, yawP, 0);
  letras.visible = verLetras;

  // fondo: brillo detras de la piramide
  _v.set(pir.position.x, pir.position.y, pir.position.z).project(camera);
  fondoMat.uniforms.centro.value.set(_v.x * .5 + .5, _v.y * .5 + .5);

  // materiales de las letras segun la toma
  if (s === 3) { matFrente.color.set('#0f1c40'); matFrente.emissiveIntensity = 0; matFrente.metalness = .4; matFrente.roughness = .22; matLado.color.set('#2E86FF'); matLado.roughness = .2 }
  else { matFrente.color.set('#ffffff'); matFrente.emissiveIntensity = .22; matFrente.metalness = 0; matFrente.roughness = .28; matLado.color.set('#1f4fc4'); matLado.roughness = .26 }

  // relleno: barrido de izquierda a derecha
  let wipe;
  if (s < 2) wipe = -1e9; else if (s > 2) wipe = 1e9; else wipe = lerp(XL0 + 2 * R + 80, XL1 + 120, eio(seg(t, T.rell0, T.rell1)));
  if (s === 2 && t < T.rell0) wipe = -1e9;
  planoSol.constant = wipe; planoFan.constant = -wipe;
  const enRell = s === 2 && t >= T.rell0 && t <= T.rell1 + .02;
  luzRelleno.visible = enRell;
  if (enRell) { luzRelleno.position.set(wipe, PY, BT + 6); luzRelleno.scale.set(520, 1500, 1); luzRelleno.material.uniforms.k.value = Math.sin(Math.PI * seg(t, T.rell0, T.rell1)) }

  // barra y contador
  const pb = eio(seg(t, T.barra0, T.barra1));
  const apagar = 1 - seg(t, T.rell0, T.rell1 + .1);
  const xb = lerp(BX0, BX1, pb);
  barra.visible = barraPista.visible = puntaBarra.visible = contador.visible = marca.visible = verBarra && t >= T.barra0 - .01 && apagar > 0;
  if (barra.visible) {
    barra.scale.x = Math.max(.001, xb - BX0); barra.material.opacity = apagar;
    barraPista.scale.x = (BX1 - BX0) * eo(seg(t, T.barra0 - .1, T.barra0 + .5)); barraPista.material.opacity = apagar;
    puntaBarra.position.set(xb + 10, PY, BT + 8); puntaBarra.material.opacity = apagar;
    const n = Math.round(pb * 100); pintaContador(n);
    const yTope = 760, ent = eo(seg(t, T.barra0 - .05, T.barra0 + .3));
    marca.position.set(xb, PY, BT + 8); marca.scale.y = (yTope - PY) * ent; marca.material.opacity = apagar * .9;
    const hs = VERT ? 260 : 190; contador.scale.set(hs * cnv.width / cnv.height, hs, 1);
    contador.position.set(xb, yTope + 10, BT + 10); contador.material.opacity = apagar * ent;
  }
  // el rombo que se recorre
  const pr = s === 2 ? eio(seg(t, T.s3 + .05, T.barra0 + .05)) : 0;
  rombo.ln.visible = s === 2 && pr > 0 && t < T.rell1;
  rombo.ln.geometry.instanceCount = Math.max(1, Math.round(pr * rombo.nseg));
  rombo.ln.material.opacity = 1 - seg(t, T.barra1 - .2, T.rell0);

  // trazos de cada letra
  for (const L of LETRAS) {
    const t0 = lerp(T.barra0, T.barra1, inv(cl((L.x0 - BX0) / (BX1 - BX0))));
    const p = eio(seg(t, t0 - .05, t0 + .8));
    L.mf.opacity = (s === 2 ? .3 * sm(seg(t, t0, t0 + .9)) : 0);
    const fuera = 1 - seg(t, T.rell0 + .05, T.rell1 + .12);
    for (const tr of L.trazos) {
      const k = Math.round(p * tr.nseg);
      tr.ln.visible = s === 2 && k > 0 && fuera > 0;
      tr.ln.geometry.instanceCount = Math.max(1, k);
      tr.ln.material.opacity = fuera;
      tr.fl.visible = s === 2 && p > 0 && p < 1;
      if (tr.fl.visible) {
        const i = Math.min(tr.pts.length - 2, k); const a = tr.pts[i], b = tr.pts[i + 1];
        tr.fl.position.set(a[0], a[1], BT + 8); tr.fl.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
        tr.fl.material.opacity = sm(seg(p, 0, .1)) * (1 - sm(seg(p, .9, 1)));
      }
    }
  }
  return s;
}
// inversa de eio (para saber cuando la barra pasa por un punto)
function inv(y) { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (eio(m) < y) a = m; else b = m } return (a + b) / 2 }

// ---------- un cuadro ----------
const HALTON = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b) } return r };
const FPS = +Q.get('fps') || 60, OBT = .5 / FPS; // obturador de 180 grados
window.frame = (t, nsub) => {
  const s = toma(t);
  const a = TOMAS[s], b = TOMAS[s + 1] - 1e-4;
  const rapido = (t > T.rell0 && t < T.rell0 + .7) || t > T.s7;
  acc.n = nsub || (rapido ? Math.max(NSUB, 14) : NSUB);
  acc.preparar = (i, n) => {
    const ti = cl(t + ((i + .5) / n - .5) * OBT * (rapido ? 1.6 : 1), a, b);
    estado(ti);
    camera.setViewOffset(W, H, HALTON(i + 1, 2) - .5, HALTON(i + 1, 3) - .5, W, H);
    camera.updateProjectionMatrix();
  };
  // aberracion y glitch al entrar en la toma clara final
  const g = s === 3 ? 1 - seg(t, T.s6, T.s6 + .28) : 0;
  final.uniforms.ca.value = g * .014 + (s === 4 ? .003 * seg(t, T.s7, T.fin) : 0);
  final.uniforms.gl.value = s === 3 && t < T.s6 + .12 ? 1 : 0;
  final.uniforms.seed.value = Math.floor(t * 60) % 97;
  final.uniforms.luz.value = sm(seg(t, 0, .4));
  final.uniforms.vig.value = (s === 1 || s === 3) ? .12 : .3;
  composer.render();
  return canvas.toDataURL('image/png');
};
window.T = T; window.listo = true;
