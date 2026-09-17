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
    'p1.jpg': {'ac': '#0A11CE', 'w1': '#1C24E4', 'w2': '#05086B',
               'luz': 'rgba(255,255,255,.22)', 'rej': 'rgba(255,255,255,.085)',
               'rej2': 'rgba(255,255,255,.060)', 'sh': '10,17,206'},
    'p2.jpg': {'ac': '#1FA800', 'w1': '#0D110D', 'w2': '#000000',
               'luz': 'rgba(51,255,0,.26)', 'rej': 'rgba(51,255,0,.11)',
               'rej2': 'rgba(51,255,0,.075)', 'sh': '20,90,0'},
    'p3.jpg': {'ac': '#DC0206', 'w1': '#F6181E', 'w2': '#960007',
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
/* El medio va en su propia baldosa blanca: sobre el color, su logotipo
   necesita el fondo con el que esta hecho. */
/* El tamano NO es decorativo. En un ordenador corriente —un pixel de pantalla
   por pixel de CSS— la baldosa de 80 dejaba el logotipo en 62 pixeles reales, y
   el de Morningstar son ONCE letras de palo seco en ese ancho: cuatro pixeles
   por letra, con trazos por debajo del pixel. Se deshacia. En el telefono no
   pasaba porque alli hay tres pixeles de pantalla por cada uno de CSS y ese
   mismo logotipo se dibujaba con 120. Subiendo la baldosa a 112, el ordenador
   pasa de 62 a 94 pixeles reales y las letras vuelven a tener cuerpo. */
.cb-tile{flex:0 0 auto;display:grid;place-items:center;
  width:clamp(72px,8vw,112px);height:clamp(72px,8vw,112px);
  background:#fff;border-radius:14px;padding:clamp(7px,.72vw,9px);
  box-shadow:0 8px 22px -10px rgba(0,0,0,.48)}
.cb-logo{width:100%;height:auto;border-radius:6px;display:block}

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
/* ══ LA SECCION DE PRENSA, EN CLAVE CINEMATOGRAFICA ═════════════════════════
   Lo de arriba pintaba cada tarjeta del color del medio, a toda la caja: un
   campo azul, uno verde y uno rojo, saturados, con el logotipo en una baldosa
   blanca encima. La intencion era que se distinguieran unas de otras. El
   efecto es el contrario del que se busca: tres rectangulos de color plano en
   fila no se leen como una seccion de prensa, se leen como tres banners, y un
   banner es lo mas barato que puede haber en una pagina.

   El color del medio no desaparece, cambia de papel: deja de ser el RELLENO y
   pasa a ser el ACENTO. Las tres laminas comparten ahora la misma superficie
   de grafito -la misma que el resto de la pagina usa para lo oscuro-, y de
   cada medio quedan dos cosas: un filete de 2 px arriba con su color y un
   resplandor suyo al 30 % en una esquina. Uniformes se leen como una serie; lo
   que las distingue pasa a ser el logotipo y el titular, que es lo que hay que
   mirar.

   Y se mueven, que es lo que pedia la seccion. Tres gestos, los tres atados a
   la entrada y no a un bucle que gire porque si:
     · la lamina se DESTAPA de abajo arriba, como un fotograma revelandose;
     · el filete del medio CRECE de izquierda a derecha justo detras;
     · una luz CRUZA la lamina una vez, en diagonal, y no vuelve.
   Escalonados card a card, que es lo que convierte tres animaciones en una
   escena. */

/* ── la lamina: una sola superficie, el color como acento ── */
.pcd-art{
  border-bottom:1px solid rgba(255,255,255,.07);
  background:
    linear-gradient(180deg,rgba(0,0,0,0) 54%,rgba(0,0,0,.42) 100%),
    radial-gradient(84% 118% at 80% -12%, rgba(var(--sh),var(--gl,.34)) 0%, rgba(0,0,0,0) 60%),
    radial-gradient(70% 90% at 14% 100%, rgba(255,255,255,.055) 0%, rgba(0,0,0,0) 62%),
    linear-gradient(168deg,#171C26 0%,#0B0F17 54%,#06080D 100%);
  clip-path:inset(100% 0 0 0);
  overflow:hidden}
.press-rail.in .pcd .pcd-art{
  clip-path:inset(0 0 0 0);
  transition:clip-path 1.05s cubic-bezier(.16,.84,.26,1) var(--d,0s)}

/* el filete del medio, creciendo por detras de la lamina */
.pcd-art::before{content:"";position:absolute;left:0;top:0;z-index:3;
  width:100%;height:2px;background:var(--ac);
  transform:scaleX(0);transform-origin:left center}
.press-rail.in .pcd .pcd-art::before{transform:none;
  transition:transform 1.15s cubic-bezier(.16,.84,.26,1) calc(var(--d,0s) + .12s)}

/* la luz que cruza una vez: un haz estrecho en diagonal que entra por la
   izquierda y sale por la derecha, y ahi se queda parado fuera de cuadro */
.pcd-art::after{content:"";position:absolute;inset:-30% -60%;z-index:2;
  pointer-events:none;
  background:linear-gradient(74deg,
    rgba(255,255,255,0) 42%, rgba(255,255,255,.10) 48%,
    rgba(255,255,255,.26) 50%, rgba(255,255,255,.10) 52%,
    rgba(255,255,255,0) 58%);
  transform:translateX(-72%)}
.press-rail.in .pcd .pcd-art::after{transform:translateX(72%);
  transition:transform 1.5s cubic-bezier(.30,.72,.28,1) calc(var(--d,0s) + .34s)}

/* ── el emblema, sin gritar ──
   La baldosa del logotipo llevaba una sombra de 22 px y se despegaba de la
   lamina como una pegatina. Ahora es una placa con filete, del tamano justo
   que «probar_prensa» exige para que las once letras de Morningstar tengan
   cuerpo en una pantalla de un pixel por pixel. */
/* La baldosa es lo que mas grita de la lamina: un rectangulo blanco al 100 %
   sobre grafito. Se baja de tamano -sigue por encima del minimo que
   «probar_prensa» exige para que las once letras de Morningstar tengan
   cuerpo a un pixel por pixel- y se le quita la sombra, que la despegaba como
   una pegatina. Un filete y nada mas. */
.cb-tile{background:#fff;border-radius:9px;
  width:clamp(72px,7.8vw,108px);height:clamp(72px,7.8vw,108px);
  box-shadow:0 0 0 1px rgba(255,255,255,.13)}

/* ── y la lamina responde al pasar por encima ──
   El resplandor del medio sube, las escuadras se meten hacia dentro y la luz
   vuelve a cruzar. Es el mismo gesto de la entrada, repetido a peticion: no
   hay que inventarse uno nuevo. */
.pcd-art{--gl:.34;transition:--gl .5s ease}
@property --gl{syntax:'<number>';inherits:true;initial-value:.34}
.pcd:hover .pcd-art{--gl:.58}
.pcd .cn{transition:inset .45s cubic-bezier(.16,.84,.26,1)}
.pcd:hover .cn.tl{left:11px;top:11px}
.pcd:hover .cn.tr{right:11px;top:11px}
.pcd:hover .cn.bl{left:11px;bottom:11px}
.pcd:hover .cn.br{right:11px;bottom:11px}
.press-rail.in .pcd:hover .pcd-art::after{transform:translateX(72%);
  transition:transform 1.25s cubic-bezier(.30,.72,.28,1)}
.cb{font-weight:400;letter-spacing:-.035em;text-shadow:none;color:#fff}
.cb-rule{background:rgba(255,255,255,.18)}
.pcd-plate{gap:clamp(16px,2vw,26px)}
/* y el conjunto entra un poco despues que su lamina, no a la vez */
.pcd-plate{opacity:0;transform:translateY(14px)}
.press-rail.in .pcd .pcd-plate{opacity:1;transform:none;
  transition:opacity .7s ease calc(var(--d,0s) + .42s),
             transform .9s cubic-bezier(.16,.84,.26,1) calc(var(--d,0s) + .42s)}

/* ── las escuadras: mas finas y mas dentro, que son una nota al pie ── */
.cn::before,.cn::after{background:rgba(255,255,255,.26)}
.cn{width:13px;height:13px}
.cn::before{width:13px}.cn::after{height:13px}
.cn.tl{left:16px;top:16px}.cn.tr{right:16px;top:16px}
.cn.bl{left:16px;bottom:16px}.cn.br{right:16px;bottom:16px}

/* ── la tarjeta: papel, filete y nada mas ──
   Sin sombra en reposo. La sombra es para cuando algo se levanta; puesta
   siempre, es relleno. */
.pcd{background:#fff;border:1px solid rgba(11,13,18,.09);border-radius:14px;
  box-shadow:none;
  transition:transform .55s cubic-bezier(.16,.84,.26,1),
             box-shadow .45s ease, border-color .35s ease}
.pcd:hover{transform:translateY(-5px);
  border-color:rgba(var(--sh),.30);
  box-shadow:0 30px 60px -34px rgba(var(--sh),.42)}

/* ── el texto ── */
.pcd-body{background:none;padding:clamp(18px,1.9vw,26px) clamp(18px,1.9vw,26px) clamp(20px,2.1vw,28px);
  gap:14px}
.pcd-tag{font-size:10px;letter-spacing:.24em;color:rgba(11,13,18,.44)}
.pcd-tag::before{width:5px;height:5px;border-radius:1px;background:var(--ac)}
.pcd-t{font-weight:450;font-size:clamp(18px,1.9vw,23px);line-height:1.25;
  letter-spacing:-.028em;color:#0A0C10}
.pcd-body::after{height:1px;width:100%;border-radius:0;opacity:1;
  background:linear-gradient(90deg,var(--ac) 0%,var(--ac) var(--av,18%),
             rgba(11,13,18,.10) var(--av,18%),rgba(11,13,18,.10) 100%);
  transition:--av .5s ease}
.pcd:hover .pcd-body::after{width:100%;--av:62%}
@property --av{syntax:'<percentage>';inherits:false;initial-value:18%}

/* ── el escalonado, que es lo que hace la escena ── */
.pcd:nth-child(1){--d:0s}
.pcd:nth-child(2){--d:.13s}
.pcd:nth-child(3){--d:.26s}
.pcd:nth-child(4){--d:.39s}
.pcd:nth-child(5){--d:.52s}
/* la tarjeta ya no se mueve por su cuenta: quien entra es la lamina */
.pcd{opacity:1;transform:none}
.press-rail.in .pcd{opacity:1;transform:none;transition-delay:0s}

/* ── y el paralaje del riel ──
   Al arrastrar, el contenido de cada lamina se desplaza un poco CONTRA el
   riel. Es lo que separa una fila de imagenes de una fila de ventanas: si lo
   de dentro y el marco van pegados, es un mosaico; si lo de dentro se retrasa,
   hay profundidad. El desplazamiento lo escribe el riel en «--px». */
.pcd-plate{will-change:transform}
.press-rail.in .pcd .pcd-plate{transform:translate3d(var(--px,0px),0,0)}

@media(prefers-reduced-motion:reduce){
  .pcd-art,.pcd-art::before,.pcd-art::after,.pcd-plate{
    clip-path:none !important;transform:none !important;opacity:1 !important;
    transition:none !important}
}
/* ══ fin: prensa ══ */
"""

def _color(m):
    a = m.group(0)
    med = re.search(r'src="img/(p\d\.jpg)"', a)
    col = MEDIOS.get(med.group(1)) if med else CASA
    return a.replace('<article class="pcd">',
                     '<article class="pcd" style="%s">' % _estilo(col), 1)


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
    """Idempotente: repone su CSS si ya estaba y respeta el marcado ya hecho."""
    if 'class="pcd-body"' not in html:
        html = _ART.sub(_una, html)
    # el color de cada medio va en la propia tarjeta, y se repone aparte del
    # traspaso de marcado: asi vale igual para un archivo recien subido que
    # para el que ya esta publicado
    if 'style="--ac:' not in html:
        html = _ART.sub(_color, html)
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
