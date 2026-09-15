# -*- coding: utf-8 -*-
"""Las bandas dejan de ser una losa: relieve, pauta y dos suelos.

Puesta la pagina entera en una hoja de contactos, el problema salta: nueve de
las diecinueve bandas son claras y las nueve comparten EXACTAMENTE el mismo
gris. Da igual donde pares, el fondo es el mismo plano vacio, y dos secciones
claras seguidas -network y press, o security, presale y token- se leen como una
sola losa de tres pantallas de largo. El contenido flota sobre nada.

Tres cosas, y ninguna decora: las tres son de plano tecnico.

  la pauta     una rejilla de ingenieria: linea fina cada 34 px y linea mayor
               cada cinco, o sea cada 170. Va como TEJA de 170x170 que se
               repite, y no como cuatro repeating-linear-gradient, que fue el
               primer intento: los degradados repetidos hay que rasterizarlos
               a pantalla completa cada vez que la banda entra, y la pagina
               pasaba de 60 a 30 cuadros por segundo en escritorio. Bisecado
               pieza a pieza: quitando solo la rejilla volvia a 60, y la luz,
               la mascara, las cotas y el umbral salian gratis. Una teja se
               cachea una vez y se estampa. No es un adorno de fondo, es la
               medida del sitio: da escala, dice que hay un plano debajo y hace
               que el texto se apoye en algo. En las bandas oscuras va en
               negativo, en azul, para que la pagina entera lea como un solo
               dibujo.
  la luz       una elipse de luz alta y ancha por detras del titular. Sin ella
               una banda plana no tiene donde mirar; con ella el contenido cae
               en la zona iluminada y los bordes se hunden.
  dos suelos   y el suelo deja de ser uno: #E4EAF4 y un paso mas hondo,
               #D6DEEE. Se reparten de modo que dos bandas claras seguidas
               nunca lleven el mismo. Ahi es donde se rompe la losa.

Lo delicado es el borde. La pagina ENCOGE cada seccion al entrar, asi que
encogida deja ver el lienzo fijo por los cuatro lados, y «probar_costura» exige
que cada banda pinte exactamente el color que anuncia en su «data-bg». Por eso
la pauta y la luz van con mascara: a 88 % del centro ya no queda nada, de modo
que el pixel del borde sigue siendo el color puro de la banda. Y por eso, al
cambiar el suelo de press, token y join, se cambia tambien su «data-bg»: los
dos a la vez o sale la franja.

Y el suelo hondo obliga a bajar un paso la tinta de rotulo. La pagina tiene
tres niveles de tinta elegidos a mano y los tres pasaban el minimo sobre
#E4EAF4; sobre #D6DEEE, el tercero -#5B657A- se queda en 4,33:1 contra un
minimo de 4,5, y lo cantan cuatro rotulos de once pixeles. Baja a #525C70, que
sobre el suelo hondo da 4,97:1. No se toca la jerarquia: siguen siendo tres
niveles, y el de en medio y el titular no se mueven.

Va en un «::before» y no en un «::after» porque el «::after» de las secciones
ya lo usa el filete que separa una banda de la siguiente. Y en z-index:-1, que
es lo unico que lo deja por encima del fondo de la seccion y por debajo de su
contenido sin tocar una sola linea de marcado.

Las bandas con arte propio -las marquesinas, el campo de rayas, las dos escenas
de fundido, la ruta- se quedan fuera: ahi ya hay un dibujo y la pauta seria
ruido encima de ruido.

`montar_home.py` lo aplica en el paso 36.
"""

import re

MARCA = '/* ══ relieve ══'
FIN = '/* ══ fin: relieve ══ */'

# El suelo hondo, para las claras que van pegadas a otra clara.
SUELO_B = '#D6DEEE'
# press va detras de network; token detras de presale; join detras de team.
HONDAS = ('press', 'token', 'join')

# El grano, y SOLO el grano. Aqui hubo una rejilla de ingenieria -fina cada 34
# px, mayor cada cinco- y estaba mal: de cerca era una acotacion de plano, pero
# a pantalla completa y repetida por nueve bandas lo que salia era una hoja de
# cuaderno cuadriculado. Barato. Una malla regular a ese paso no da estructura,
# da papel pautado, y compite con todo lo que se pone encima.
# La estructura la dan ahora dos cosas que no son textura: la linea de cota
# sobre cada rotulo y una sola vertical de referencia por banda. Una linea
# puesta a proposito estructura mas que mil.
GRANO_CLARO = '''url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='170'%20height='170'><filter%20id='n'><feTurbulence%20type='fractalNoise'%20baseFrequency='.92'%20numOctaves='3'%20stitchTiles='stitch'/><feColorMatrix%20type='saturate'%20values='0'/></filter><rect%20width='170'%20height='170'%20filter='url%28%2523n%29'%20opacity='.042'/></svg>")'''
GRANO_OSCURO = '''url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='170'%20height='170'><filter%20id='n'><feTurbulence%20type='fractalNoise'%20baseFrequency='.92'%20numOctaves='3'%20stitchTiles='stitch'/><feColorMatrix%20type='saturate'%20values='0'/></filter><rect%20width='170'%20height='170'%20filter='url%28%2523n%29'%20opacity='.055'/></svg>")'''

# El tercer nivel de tinta, un paso mas hondo para que aguante el suelo hondo.
TINTA_VIEJA, TINTA_NUEVA = '#5B657A', '#525C70'

CSS = """
/* ══ relieve ═══════════════════════════════════════════════════════════════
   El plano de fondo: pauta de ingenieria, luz de escena y dos suelos. */
:root{--suelo2:__B__}

/* ── dos suelos, para que dos claras seguidas no sean una losa ──
   background-COLOR, no el atajo: «background» a secas resetea
   background-image, y con el se iban por delante el papel y el grano que las
   bandas claras llevan puestos. Lo canto probar_pagina. */
main>section:is(.press,.tkp,.join){background-color:var(--suelo2);--tapa:var(--suelo2)}

/* ── los tonos de la pauta y de la luz ── */
main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press){
  --tapa:var(--suelo);
  --grano:__GC__;
  --foco:rgba(255,255,255,.92);
  --foco2:rgba(214,232,255,.62);
  --hondo:rgba(11,16,30,.135)}
main>section:is(.stack,.loop){
  --grano:__GO__;
  --foco:rgba(70,125,255,.22);
  --foco2:rgba(120,200,255,.13);
  --hondo:rgba(0,0,0,.58)}
/* Las dos oscuras de fondo liso no traen dibujo propio que respetar, asi que
   aqui la pila se escribe entera. */
main>section.loop{
  background-image:
    radial-gradient(78% 52% at 26% 8%, var(--foco2) 0%, rgba(255,255,255,0) 62%),
    radial-gradient(92% 58% at 62% 18%, var(--foco) 0%, rgba(255,255,255,0) 68%),
    var(--grano);
  background-repeat:no-repeat,no-repeat,repeat;
  background-size:auto,auto,auto;
  background-position:center,center,0 0}

/* ── la linea de cota, encima de cada rotulo de seccion ──
   Once rotulos sueltos repartidos por la pagina no son una serie. Con una
   linea de cota por encima —con su diente en cada extremo, como una acotacion
   de plano— cada seccion pasa a ser una hoja del mismo dibujo, y el titular
   deja de empezar en el aire.
   Se engancha con «:has(.sk)» sobre la caja de contenido, no sobre la que
   envuelve el rotulo. Eso segundo fue el primer intento y no se veia: en tres
   secciones el rotulo va dentro de un «.rv», y un «.rv» lleva clip-path para
   descubrirse tras su mascara, asi que recortaba la linea antes de pintarla.
   Va ARRIBA del rotulo y no atravesandolo: el rotulo mide distinto en cada
   uno de los doce idiomas, y una linea que arranca donde acaba el texto se
   descuadra en cuanto cambias de idioma. */
main>section :is(.wrap,.sec-head,.join-head):has(.sk){position:relative}
main>section :is(.wrap,.sec-head,.join-head):has(.sk)::before{
  content:"";position:absolute;left:0;right:0;top:-22px;height:7px;
  pointer-events:none;opacity:.20;
  background:
    linear-gradient(currentColor,currentColor) 0    0/1px 7px no-repeat,
    linear-gradient(currentColor,currentColor) 100% 0/1px 7px no-repeat,
    linear-gradient(currentColor,currentColor) 0    0/100% 1px no-repeat}
@media(max-width:760px){
  main>section :is(.wrap,.sec-head,.join-head):has(.sk)::before{
    top:-15px;height:5px;
    background:
      linear-gradient(currentColor,currentColor) 0    0/1px 5px no-repeat,
      linear-gradient(currentColor,currentColor) 100% 0/1px 5px no-repeat,
      linear-gradient(currentColor,currentColor) 0    0/100% 1px no-repeat}}
/* ── y una sola vertical de referencia por banda ──
   Estructura no es textura. Una linea puesta donde empieza el carril de
   contenido, de arriba abajo y apagandose por los dos extremos, ordena la
   banda entera; una malla de lineas cada 34 px la ensucia.
   Va en el «::after» del mismo carril que ya lleva la cota, asi que no suma
   ni un elemento ni una capa de fondo. */
main>section :is(.wrap,.sec-head,.join-head):has(.sk)::after{
  content:"";position:absolute;left:-1px;top:-22px;bottom:-40vh;width:1px;
  pointer-events:none;
  background:linear-gradient(180deg,
    currentColor 0%, rgba(0,0,0,0) 4%, rgba(0,0,0,0) 0%);
  opacity:.16;
  mask-image:linear-gradient(180deg,#000 0%,#000 62%,rgba(0,0,0,0) 100%);
  -webkit-mask-image:linear-gradient(180deg,#000 0%,#000 62%,rgba(0,0,0,0) 100%)}
main>section :is(.wrap,.sec-head,.join-head):has(.sk)::after{
  background:currentColor}
@media(max-width:760px){
  main>section :is(.wrap,.sec-head,.join-head):has(.sk)::after{display:none}}
/* ══ fin: relieve ══ */
""".replace('__B__', SUELO_B).replace('__GC__', GRANO_CLARO).replace('__GO__', GRANO_OSCURO)


CAPAS = (
    # 1 · el canto, repintado del color de la banda. Hace la faena que en el
    #     primer intento hacia una mascara: la pagina ENCOGE cada seccion al
    #     entrar, asi que por los cuatro lados se ve el lienzo fijo, y
    #     probar_costura exige que el canto sea EXACTAMENTE el color que la
    #     banda anuncia en su data-bg.
    'radial-gradient(124% 96% at 50% 44%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 52%, var(--tapa) 88%)',
    # la luz de escena: alta, ancha y con temperatura. Dos focos y no uno —uno
    # frio arriba a la izquierda y uno neutro al centro— porque un solo
    # degradado centrado se lee como un flash y dos se leen como una sala.
    'radial-gradient(78% 52% at 26% 8%, var(--foco2) 0%, rgba(255,255,255,0) 62%)',
    'radial-gradient(92% 58% at 62% 18%, var(--foco) 0%, rgba(255,255,255,0) 68%)',
    'radial-gradient(118% 82% at 50% 44%, rgba(255,255,255,0) 48%, var(--hondo) 100%)',
)
REPITE = ('no-repeat', 'no-repeat', 'no-repeat', 'no-repeat')
TAMANO = ('auto', 'auto', 'auto', 'auto')
SITIO = ('center', 'center', 'center', 'center')

_CLARAS = ('.paper', '.paper2', '.secure', '.sale', '.tkp', '.join', '.press')


def _capas(v):
    """Las capas de primer nivel de un valor de fondo, sin partir los parentesis."""
    fuera, hondo, act = [], 0, ''
    for c in v:
        if c == '(':
            hondo += 1
        elif c == ')':
            hondo -= 1
        if c == ',' and hondo == 0:
            fuera.append(act.strip()); act = ''
        else:
            act += c
    if act.strip():
        fuera.append(act.strip())
    return fuera


def _componer(html):
    """Mete las capas del relieve DELANTE de las que cada banda ya tenga.

    Esto es lo que no se puede hacer a mano. Escribi la pila entera en el CSS
    del modulo —grano, papel y todo— y con eso me lleve por delante dos cosas
    que pasos anteriores habian dejado resueltas: el dibujo VERTICAL del
    telefono, que no es el mismo archivo que el de escritorio, y el velo blanco
    que la seccion del reparto lleva para que la rosca se defienda. Dos
    baterias lo cantaron. El modulo va el ultimo, asi que lo correcto es
    componer con lo que encuentre, no sustituirlo.
    """
    hecho = 0
    fin = 0
    while True:
        k = html.find('background-image:', fin)
        if k < 0:
            break
        ini = html.rfind('}', 0, k)
        ini = html.rfind('{', 0, k) if ini < 0 else html.rfind('{', ini, k)
        sel = html[html.rfind('}', 0, ini) + 1: ini] if ini > 0 else ''
        cierre = html.index('}', k)
        if not any(c in sel for c in _CLARAS):
            fin = k + 1
            continue
        bloque = html[ini + 1: cierre]
        img = re.search(r'background-image:\s*([^;}]*)', bloque)
        # Si el modulo ya paso por aqui, sus capas se QUITAN antes de volver a
        # ponerlas. Saltarselas -que fue lo primero que hice- deja la pagina
        # con la version vieja del relieve montada para siempre.
        previas = _capas(img.group(1))
        mias = 0
        for c in previas:
            if any(v in c for v in ('var(--tapa)', 'var(--foco)', 'var(--foco2)',
                                    'var(--hondo)', 'var(--teja)')):
                mias += 1
            else:
                break
        previas = previas[mias:]
        n = len(previas)
        nuevo = bloque.replace(img.group(0),
                               'background-image:\n    ' + ',\n    '.join(CAPAS) + ',\n    ' + ','.join(previas), 1)
        for prop, mio, porDefecto in (('background-repeat', REPITE, 'repeat'),
                                      ('background-size', TAMANO, 'auto'),
                                      ('background-position', SITIO, '0 0')):
            m = re.search(prop + r':\s*([^;}]*)', nuevo)
            if m:
                resto = _capas(m.group(1))[mias:] or [porDefecto] * n
                nuevo = nuevo.replace(m.group(0), prop + ':' + ','.join(mio) + ',' + ','.join(resto), 1)
            else:
                nuevo += ';' + prop + ':' + ','.join(mio) + ',' + ','.join([porDefecto] * n)
        html = html[:ini + 1] + nuevo + html[cierre:]
        fin = ini + 1 + len(nuevo)
        hecho += 1
    assert hecho >= 4, 'no se ha compuesto casi ninguna pila de fondo: ' + str(hecho)
    return html


def aplicar(html):
    """Idempotente."""
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        html = html[:i] + CSS.strip('\n') + html[j:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
    # el tercer nivel de tinta, un paso mas hondo
    html = html.replace(TINTA_VIEJA, TINTA_NUEVA)
    # y el relieve, DELANTE de lo que cada banda ya pintaba
    html = _componer(html)
    # el data-bg tiene que ir con el fondo, o sale la franja del lienzo
    for id_ in HONDAS:
        pat = re.compile(r'(<section[^>]*\b(?:id="%s"|class="[^"]*\b%s\b)[^>]*data-bg=")#[0-9A-Fa-f]{6}(")'
                         % (id_, id_))
        html, n = pat.subn(r'\g<1>' + SUELO_B + r'\g<2>', html)
        assert n == 1, 'no se ha podido teñir la banda: ' + id_
    return html
