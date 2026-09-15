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

# ── el color de cada medio ───────────────────────────────────────────────────
# Muestreado de los propios logotipos, no elegido a ojo: Benzinga es #080EBE,
# Morningstar #F40103 y MarketWatch es verde #33FF00 sobre negro. Cada tarjeta
# se pinta con el suyo, que es lo que las hace distinguibles de un vistazo.
#
#   ac   el acento sobre papel blanco: el cuadrito del rotulo, el filete de
#        abajo y el tinte del borde. Va oscurecido lo justo para que se lea.
#   w1   w2   el degradado de la figura
#   luz  la luz de arriba a la izquierda, dentro de la figura
#   rej  la pauta sobre ese fondo
#   sh   la sombra al pasar por encima, en componentes
MEDIOS = {
    'p1': {'clase': 't-benzinga', 'ac': '#0A11CE', 'w1': '#1C24E4', 'w2': '#05086B',
               'luz': 'rgba(255,255,255,.22)', 'rej': 'rgba(255,255,255,.085)',
               'rej2': 'rgba(255,255,255,.060)', 'sh': '10,17,206'},
    'p2': {'clase': 't-marketwatch', 'ac': '#1FA800', 'w1': '#0D110D', 'w2': '#000000',
               'luz': 'rgba(51,255,0,.26)', 'rej': 'rgba(51,255,0,.11)',
               'rej2': 'rgba(51,255,0,.075)', 'sh': '20,90,0'},
    'p3': {'clase': 't-morningstar', 'ac': '#DC0206', 'w1': '#F6181E', 'w2': '#960007',
               'luz': 'rgba(255,255,255,.24)', 'rej': 'rgba(255,255,255,.090)',
               'rej2': 'rgba(255,255,255,.065)', 'sh': '200,10,14'},
}
# la que no lleva medio —el anuncio— se queda con el azul de la casa
CASA = {'ac': '#2F6BFF', 'w1': '#12204A', 'w2': '#05080F',
        'luz': 'rgba(47,107,255,.30)', 'rej': 'rgba(121,171,255,.085)',
        'rej2': 'rgba(121,171,255,.060)', 'sh': '12,26,66'}


def _estilo(c):
    return ('--ac:%(ac)s;--w1:%(w1)s;--w2:%(w2)s;--luz:%(luz)s;'
            '--rej:%(rej)s;--rej2:%(rej2)s;--sh:%(sh)s' % c)


# ── el haz de la tarjeta oscura ──────────────────────────────────────────────
# Lo pintaba un <canvas> por JavaScript, una vez al cargar y otra a los 700 ms.
# Y ahi estaba el fallo: a los 700 ms la seccion de prensa esta debajo del
# pliegue, y la pagina lleva un guardia que silencia el dibujado de cualquier
# lienzo fuera de pantalla. Esa segunda llamada hacia lo unico que puede hacer
# sin dibujar —cambiar el tamano del lienzo, que lo BORRA— y la tarjeta se
# quedaba en un rectangulo liso para todo el que abriera la pagina por arriba,
# que son todos. Encima la seccion lleva content-visibility:auto, asi que ni
# siquiera se puede confiar en volver a pintarla cuando entra.
#
# El haz es una raya de luz en diagonal y un halo: dos degradados. En CSS no
# hay lienzo que borrar, ni guardia, ni momento en que pintarlo.
CANVAS = '            <canvas class="pcd-glow"></canvas>\n'


FIN = '/* ══ fin: prensa ══ */'
MARCA = '/* ══ las tarjetas de prensa ══'

CSS = """
/* ══ las tarjetas de prensa ══════════════════════════════════════════════
   Estructura del whitepaper —panel, filete fino, esquinas suaves, el rotulo
   en mono— y el color de cada medio: Benzinga el azul suyo, MarketWatch su
   verde sobre negro, Morningstar su rojo. Blancas y todas iguales no se
   distinguian unas de otras ni pedian que las miraras. */
.press-rail{padding:6px 2px 12px}
.pcd{--pl:#E6E9EF;--i3:#6B7484;
  --ac:#2F6BFF;--w1:#12204A;--w2:#05080F;
  --luz:rgba(47,107,255,.30);--rej:rgba(121,171,255,.085);--rej2:rgba(121,171,255,.060);
  --sh:12,26,66;
  background:#fff;border:1px solid var(--pl);border-radius:12px;overflow:hidden;
  display:flex;flex-direction:column;
  box-shadow:0 1px 2px rgba(10,12,16,.04);
  transition:transform .5s cubic-bezier(.16,.84,.26,1),
             box-shadow .45s ease}
.pcd:hover{transform:translateY(-6px);
  box-shadow:0 28px 56px -28px rgba(var(--sh),.45), 0 0 0 1px rgba(var(--sh),.22)}

/* ── la figura: el color del medio, a toda la caja ── */
.pcd-art{position:relative;aspect-ratio:1.62;padding:0;border:0;border-radius:0;
  border-bottom:1px solid rgba(var(--sh),.30);
  background:
    radial-gradient(120% 92% at 22% 12%, var(--luz) 0%, rgba(255,255,255,0) 60%),
    linear-gradient(162deg, var(--w1) 0%, var(--w2) 100%);
  display:grid;place-items:center}
/* un velo abajo, para que la figura no choque a hueso con el texto */
.pcd-art::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(0,0,0,0) 58%,rgba(0,0,0,.22) 100%)}

/* Las esquinas dejan de ser cuadros azules macizos y pasan a ser marcas de
   escuadra de 1 px, que es el mismo gesto sin gritar. */
.cn,.cn.tl,.cn.tr,.cn.bl,.cn.br{background:none}
.cn{position:absolute;width:15px;height:15px;z-index:2}
.cn::before,.cn::after{content:"";position:absolute;background:rgba(255,255,255,.48)}
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

/* ── el emblema, ya sobre color: la palabra va en blanco ── */
.pcd-plate{position:relative;z-index:1;width:auto;height:auto;background:none;
  border:0;box-shadow:none;display:flex;align-items:center;
  gap:clamp(14px,1.8vw,22px);padding:0}
.cb{display:flex;align-items:center;gap:.34em;color:#fff;
  font-size:clamp(17px,1.85vw,24px);font-weight:500;letter-spacing:-.04em;
  text-shadow:0 1px 14px rgba(0,0,0,.28)}
.cb-rule{width:1px;height:clamp(30px,3.6vw,46px);background:rgba(255,255,255,.34);flex:0 0 auto}
/* El medio ya no va en baldosa. La baldosa existia porque el logotipo llegaba
   como un JPEG cuadrado con su fondo cocido dentro —Benzinga blanco sobre azul,
   MarketWatch verde sobre negro, Morningstar blanco sobre rojo— y un cuadro de
   color no se puede posar sobre otro color. Salian tres capas: la figura azul,
   la baldosa blanca y dentro otro cuadro azul. Dos saltos de color para ensenar
   ocho letras, y encima el color del cuadro era el mismo de la figura.
   Ahora la marca viene recortada y con transparencia (prensa_marcas.py) y se
   posa directamente sobre el color de su tarjeta, al lado del de Nereum y con
   la misma sombra, para que los dos se lean como una sola linea.
   Y de paso deja de desperdiciar el sitio: la palabra BENZINGA ocupaba 229x32
   de un archivo de 260x260, o sea el 11% de la superficie, asi que dentro de
   una baldosa de 92 se dibujaba con 11 px de alto. Once. Recortada, esos 92 px
   son todo palabra.
   El ancho va por marca y no por una medida comun, porque cada una reparte su
   caja de otro modo: la flecha de MarketWatch sube por encima de las letras y
   la O de Morningstar baja por debajo, de modo que igualar el ancho las dejaria
   con alturas de letra distintas. Los maximos son los que aguanta cada archivo:
   a dos pixeles de pantalla por pixel de CSS ninguna pide mas de lo que tiene. */
.cb-tile{flex:0 0 auto;display:grid;place-items:center;
  filter:drop-shadow(0 1px 14px rgba(0,0,0,.28))}
.cb-logo{width:100%;height:auto;display:block;border-radius:0}
.cb-tile.t-benzinga{width:clamp(84px,9.4vw,112px)}
.cb-tile.t-marketwatch{width:clamp(52px,5.7vw,68px)}
.cb-tile.t-morningstar{width:clamp(80px,9vw,108px)}

/* ── el texto: papel, pero teñido de su color, no blanco pelado ── */
.pcd-body{padding:clamp(16px,1.7vw,22px) clamp(16px,1.7vw,22px) clamp(18px,2vw,26px);
  display:flex;flex-direction:column;gap:12px;flex:1 1 auto;
  background:linear-gradient(180deg, rgba(var(--sh),.055) 0%, rgba(var(--sh),.012) 100%)}
.pcd-tag{margin:0;display:inline-flex;align-items:center;gap:8px;
  font-family:var(--m);font-size:10.5px;letter-spacing:.20em;color:var(--ac)}
.pcd-tag::before{content:"";width:6px;height:6px;border-radius:1px;background:var(--ac)}
.pcd-t{margin:0;font-weight:500;font-size:clamp(17px,1.75vw,21px);line-height:1.26;
  letter-spacing:-.026em;color:#0A0C10}
/* El filete de abajo crece al pasar por encima: da el final de la pieza sin
   meter un texto que luego habria que traducir a doce idiomas. */
.pcd-body::after{content:"";width:28px;height:2px;border-radius:2px;background:var(--ac);
  opacity:.55;margin-top:auto;transition:width .45s cubic-bezier(.16,.84,.26,1),opacity .3s}
.pcd:hover .pcd-body::after{width:64px;opacity:1}

/* ── la del anuncio: el haz de luz, en degradados ── */
.pcd-art.dark{background:
    linear-gradient(56deg, rgba(10,16,36,0) 38%, rgba(60,130,255,.50) 46.5%,
      rgba(206,228,255,.96) 50%, rgba(60,130,255,.42) 53.5%, rgba(10,16,36,0) 62%),
    radial-gradient(54% 64% at 62% 42%, rgba(70,140,255,.34) 0%, rgba(70,140,255,0) 72%),
    linear-gradient(162deg, var(--w1) 0%, var(--w2) 100%)}

@media(max-width:700px){
  .cn{width:12px;height:12px}
  .cn::before{width:12px}.cn::after{height:12px}
  .pcd-tag{font-size:9.5px;letter-spacing:.16em}
}
@media(prefers-reduced-motion:reduce){
  .pcd,.pcd-body::after{transition:none}
  .pcd:hover{transform:none}
}
/* ══ fin: prensa ══ */
"""

def _color(m):
    a = m.group(0)
    med = re.search(r'src="img/(p\d)\.(?:jpg|png)"', a)
    col = MEDIOS.get(med.group(1)) if med else CASA
    return a.replace('<article class="pcd">',
                     '<article class="pcd" style="%s">' % _estilo(col), 1)


_ART = re.compile(r'<article class="pcd">.*?</article>', re.S)


# ── la marca recortada, sin baldosa ─────────────────────────────────────
# El .jpg cuadrado se cambia por el .png recortado que saca prensa_marcas.py, y
# la baldosa recibe la clase de su medio, que es la que le da el ancho. Va
# aparte de _una y de _color porque tiene que correr TAMBIEN sobre la pagina ya
# montada, donde aquellos dos ya no entran.
_BALDOSA = re.compile(
    r'<span class="cb-tile[^"]*"><img class="cb-logo"([^>]*?)'
    r'src="img/(p\d)\.(?:jpg|png)"([^>]*)></span>')


def _marca(m):
    ant, med, post = m.group(1), m.group(2), m.group(3)
    return ('<span class="cb-tile %s"><img class="cb-logo"%ssrc="img/%s.png"%s></span>'
            % (MEDIOS[med]['clase'], ant, med, post))


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
    """Idempotente: repone su CSS si ya estaba y respeta el marcado ya hecho."""
    if 'class="pcd-body"' not in html:
        html = _ART.sub(_una, html)
    # el color de cada medio va en la propia tarjeta, y se repone aparte del
    # traspaso de marcado: asi vale igual para un archivo recien subido que
    # para el que ya esta publicado
    if 'style="--ac:' not in html:
        html = _ART.sub(_color, html)
    # la marca de cada medio: recortada, transparente y con su ancho
    html = _BALDOSA.sub(_marca, html)
    html = html.replace(CANVAS, '')
    if MARCA in html:
        i = html.index(MARCA)
        # hasta el sello de cierre, NO hasta </style>: detras puede haber otro
        # modulo con su bloque, y cortar hasta el final se lo llevaba por delante
        if FIN in html[i:]:
            j = html.index(FIN, i) + len(FIN)
        else:
            # bloque de antes de que existiera el sello: se corta en el
            # siguiente bloque (todos empiezan por la doble raya) o al final
            cierre = html.index('\n</style>', i)
            sig = html.find('/* \u2550\u2550 ', i + len(MARCA))
            j = cierre if sig < 0 or sig > cierre else sig
        html = html[:i] + CSS.strip('\n') + html[j:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
    return html
