# -*- coding: utf-8 -*-
"""Las tarjetas de prensa, con el lenguaje del whitepaper.

Lo que habia no era una tarjeta: era una lamina azul clara con cuatro cuadros
azules en las esquinas —marcas de registro, no diseno—, dentro de ella una
plancha blanca con el logotipo, y debajo el epigrafe y el titular flotando sin
nada que los contuviera. Tres cajas metidas una dentro de otra y ni un borde
que dijera donde empieza y donde acaba la pieza. De ahi lo plano.

Ahora es una tarjeta de verdad, con las reglas del whitepaper: panel blanco,
filete de 1 px (#E6E9EF), esquinas de 12, mucho aire, la etiqueta en mono
espaciada y el azul reservado para el acento. La zona de arriba es una figura
—fondo de papel con pauta fina y una luz suave— y la de abajo, el texto.

`montar_home.py` lo aplica en el paso 13.
"""
import re

MARCA = '/* ══ las tarjetas de prensa ══'

CSS = """
/* ══ las tarjetas de prensa ══════════════════════════════════════════════
   Mismas reglas que el whitepaper: panel blanco, filete fino, esquinas
   suaves, la etiqueta en mono y el azul solo como acento. */
.press-rail{padding:6px 2px 10px}
.pcd{--pl:#E6E9EF;--pl2:#EFF1F5;--pp2:#FAFBFC;--i2:#3A4150;--i3:#6B7484;
  background:#fff;border:1px solid var(--pl);border-radius:12px;overflow:hidden;
  display:flex;flex-direction:column;
  box-shadow:0 1px 2px rgba(10,12,16,.03);
  transition:transform .5s cubic-bezier(.16,.84,.26,1),
             border-color .35s ease, box-shadow .45s ease}
.pcd:hover{transform:translateY(-6px);border-color:#C9D8F6;
  box-shadow:0 26px 54px -30px rgba(12,26,66,.42)}

/* ── la figura de arriba ── */
.pcd-art{position:relative;aspect-ratio:1.62;padding:0;border:0;border-radius:0;
  border-bottom:1px solid var(--pl);
  background:
    radial-gradient(120% 90% at 22% 14%, rgba(47,107,255,.075) 0%, rgba(47,107,255,0) 58%),
    repeating-linear-gradient(90deg, rgba(47,107,255,.055) 0 1px, transparent 1px 26px),
    repeating-linear-gradient(180deg, rgba(47,107,255,.045) 0 1px, transparent 1px 26px),
    linear-gradient(180deg,#FCFDFE 0%,#F3F7FD 100%);
  display:grid;place-items:center;
  transition:background-color .35s ease}
.pcd-art::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,0) 62%,rgba(255,255,255,.55) 100%)}

/* Las esquinas dejan de ser cuadros azules macizos y pasan a ser marcas de
   escuadra de 1 px, que es el mismo gesto sin gritar. */
.cn,.cn.tl,.cn.tr,.cn.bl,.cn.br{background:none}
.cn{position:absolute;width:15px;height:15px;z-index:2}
.cn::before,.cn::after{content:"";position:absolute;background:rgba(47,107,255,.34)}
.cn::before{width:15px;height:1px}
.cn::after{width:1px;height:15px}
.cn.tl{left:14px;top:14px}
.cn.tl::before{left:0;top:0}.cn.tl::after{left:0;top:0}
.cn.tr{right:14px;top:14px}
.cn.tr::before{right:0;top:0}.cn.tr::after{right:0;top:0}
.cn.bl{left:14px;bottom:14px}
.cn.bl::before{left:0;bottom:0}.cn.bl::after{left:0;bottom:0}
.cn.br{right:14px;bottom:14px}
.cn.br::before{right:0;bottom:0}.cn.br::after{right:0;bottom:0}

/* ── el emblema: la marca, el filete y el medio, todo del mismo tamano ── */
.pcd-plate{position:relative;z-index:1;width:auto;height:auto;background:none;
  border:0;box-shadow:none;display:flex;align-items:center;
  gap:clamp(14px,1.8vw,22px);padding:0}
.cb{display:flex;align-items:center;gap:.34em;
  font-size:clamp(17px,1.85vw,24px);font-weight:500;letter-spacing:-.04em;color:#0B0D12}
.cb-rule{width:1px;height:clamp(30px,3.6vw,46px);background:var(--pl);flex:0 0 auto}
/* El medio va en su propia baldosa blanca: los logotipos vienen en azul, en
   negro y en rojo, y sueltos sobre el papel se peleaban entre ellos. */
.cb-tile{flex:0 0 auto;display:grid;place-items:center;
  width:clamp(58px,6.6vw,80px);height:clamp(58px,6.6vw,80px);
  background:#fff;border:1px solid var(--pl);border-radius:12px;padding:9px;
  box-shadow:0 1px 2px rgba(10,12,16,.04)}
.cb-logo{width:100%;height:auto;border-radius:6px;display:block}

/* ── el epigrafe, encima del titular ── */
.pcd-tag{margin:0;display:inline-flex;align-items:center;gap:8px;
  font-family:var(--m);font-size:10.5px;letter-spacing:.20em;color:var(--i3)}
.pcd-tag::before{content:"";width:6px;height:6px;border-radius:1px;background:var(--blue)}

/* ── el texto ── */
.pcd-body{padding:clamp(16px,1.7vw,22px) clamp(16px,1.7vw,22px) clamp(18px,2vw,26px);
  display:flex;flex-direction:column;gap:12px;flex:1 1 auto}
.pcd-t{margin:0;font-weight:500;font-size:clamp(17px,1.75vw,21px);line-height:1.26;
  letter-spacing:-.026em;color:#0A0C10}
/* El filete de abajo crece al pasar por encima: da el final de la pieza sin
   meter un texto que luego habria que traducir a doce idiomas. */
.pcd-body::after{content:"";width:26px;height:2px;border-radius:2px;background:var(--blue);
  opacity:.30;margin-top:auto;transition:width .45s cubic-bezier(.16,.84,.26,1),opacity .3s}
.pcd:hover .pcd-body::after{width:56px;opacity:1}

/* ── la que va en oscuro ── */
.pcd-art.dark{background:
    radial-gradient(120% 90% at 26% 16%, rgba(47,107,255,.30) 0%, rgba(47,107,255,0) 62%),
    repeating-linear-gradient(90deg, rgba(121,171,255,.070) 0 1px, transparent 1px 26px),
    repeating-linear-gradient(180deg, rgba(121,171,255,.055) 0 1px, transparent 1px 26px),
    linear-gradient(180deg,#0B1226 0%,#070B18 100%);
  border-bottom-color:#141C34}
.pcd-art.dark::after{background:linear-gradient(180deg,rgba(0,0,0,0) 60%,rgba(0,0,0,.28) 100%)}
.pcd-art.dark .cn::before,.pcd-art.dark .cn::after{background:rgba(121,171,255,.45)}
.pcd-glow{position:absolute;inset:0;width:100%;height:100%;z-index:1}

@media(max-width:700px){
  .cn{width:12px;height:12px}
  .cn::before{width:12px}.cn::after{height:12px}
  .pcd-tag{font-size:9px;letter-spacing:.14em}
}
@media(prefers-reduced-motion:reduce){
  .pcd,.pcd-body::after{transition:none}
  .pcd:hover{transform:none}
}
"""

_ART = re.compile(r'<article class="pcd">.*?</article>', re.S)


def _una(m):
    a = m.group(0)
    # el logotipo del medio, en su baldosa
    a = re.sub(r'(<img class="cb-logo"[^>]*>)',
               r'<span class="cb-tile">\1</span>', a)
    # el epigrafe y el titular, los dos dentro de la misma caja con aire
    par = re.search(r'\n(\s*)(<div class="pcd-tag">.*?</div>)\n\s*(<h3 class="pcd-t">.*?</h3>)',
                    a, re.S)
    if par:
        sang = par.group(1)
        a = a.replace(par.group(0),
                      '\n%s<div class="pcd-body">\n%s  %s\n%s  %s\n%s</div>'
                      % (sang, sang, par.group(2), sang, par.group(3), sang))
    return a


def aplicar(html):
    """Idempotente."""
    if 'class="pcd-body"' not in html:
        html = _ART.sub(_una, html)
    if MARCA not in html:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS + '</style>', 1)
    return html
