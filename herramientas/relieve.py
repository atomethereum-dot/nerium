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

# La teja de la pauta, 170x170: cuatro lineas finas y una mayor por lado, Y EL
# GRANO dentro. Lo del grano no es por ahorrar un archivo: es lo unico que deja
# meter la rejilla sin sumar una capa. Medido, cualquier sexta capa de fondo
# sobre estas secciones -hasta un degradado transparente- sube el p90 de 33 a
# 50 ms y mete cinco cuadros largos mas. Como el grano ya era una capa y ya
# era una teja que se repite, la pauta viaja dentro de el y el coste es cero.
TEJA_CLARA = '''url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='170'%20height='170'><filter%20id='n'><feTurbulence%20type='fractalNoise'%20baseFrequency='.92'%20numOctaves='3'%20stitchTiles='stitch'/><feColorMatrix%20type='saturate'%20values='0'/></filter><rect%20width='170'%20height='170'%20filter='url%28%2523n%29'%20opacity='.036'/><path%20d='M34.5%200V170M68.5%200V170M102.5%200V170M136.5%200V170M0%2034.5H170M0%2068.5H170M0%20102.5H170M0%20136.5H170'%20fill='none'%20stroke='rgba%2817%2C27%2C48%2C.085%29'%20stroke-width='1'/><path%20d='M.5%200V170M0%20.5H170'%20fill='none'%20stroke='rgba%2817%2C27%2C48%2C.17%29'%20stroke-width='1'/></svg>")'''
TEJA_OSCURA = '''url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='170'%20height='170'><filter%20id='n'><feTurbulence%20type='fractalNoise'%20baseFrequency='.92'%20numOctaves='3'%20stitchTiles='stitch'/><feColorMatrix%20type='saturate'%20values='0'/></filter><rect%20width='170'%20height='170'%20filter='url%28%2523n%29'%20opacity='.036'/><path%20d='M34.5%200V170M68.5%200V170M102.5%200V170M136.5%200V170M0%2034.5H170M0%2068.5H170M0%20102.5H170M0%20136.5H170'%20fill='none'%20stroke='rgba%28140%2C175%2C255%2C.085%29'%20stroke-width='1'/><path%20d='M.5%200V170M0%20.5H170'%20fill='none'%20stroke='rgba%28140%2C175%2C255%2C.16%29'%20stroke-width='1'/></svg>")'''

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
  --grano:__CLARA__;
  --foco:rgba(255,255,255,.88);
  --hondo:rgba(11,16,30,.115)}
main>section:is(.stack,.loop){
  --grano:__OSCURA__;
  --foco:rgba(70,125,255,.20);
  --hondo:rgba(0,0,0,.55)}
/* Las dos oscuras de fondo liso no traen dibujo propio que respetar, asi que
   aqui la pila se escribe entera. */
main>section.loop{
  background-image:
    radial-gradient(74% 48% at 50% 22%, var(--foco) 0%, rgba(255,255,255,0) 70%),
    var(--grano);
  background-repeat:no-repeat,repeat;
  background-size:auto,auto;
  background-position:center,0 0}

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
/* ══ fin: relieve ══ */
""".replace('__B__', SUELO_B).replace('__CLARA__', TEJA_CLARA).replace('__OSCURA__', TEJA_OSCURA)


CAPAS = (
    # 1 · el canto, repintado del color de la banda. Hace la faena que en el
    #     primer intento hacia una mascara: la pagina ENCOGE cada seccion al
    #     entrar, asi que por los cuatro lados se ve el lienzo fijo, y
    #     probar_costura exige que el canto sea EXACTAMENTE el color que la
    #     banda anuncia en su data-bg.
    'radial-gradient(124% 96% at 50% 44%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 52%, var(--tapa) 88%)',
    'radial-gradient(74% 48% at 50% 22%, var(--foco) 0%, rgba(255,255,255,0) 70%)',
    'radial-gradient(112% 76% at 50% 46%, rgba(255,255,255,0) 54%, var(--hondo) 100%)',
)
REPITE = ('no-repeat', 'no-repeat', 'no-repeat')
TAMANO = ('auto', 'auto', 'auto')
SITIO = ('center', 'center', 'center')

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
        if not any(c in sel for c in _CLARAS) or 'var(--tapa)' in html[k:cierre]:
            fin = k + 1
            continue
        bloque = html[ini + 1: cierre]
        img = re.search(r'background-image:\s*([^;}]*)', bloque)
        n = len(_capas(img.group(1)))
        nuevo = bloque.replace(img.group(0),
                               'background-image:\n    ' + ',\n    '.join(CAPAS) + ',\n    ' + img.group(1).strip(), 1)
        for prop, mio, porDefecto in (('background-repeat', REPITE, 'repeat'),
                                      ('background-size', TAMANO, 'auto'),
                                      ('background-position', SITIO, '0 0')):
            m = re.search(prop + r':\s*([^;}]*)', nuevo)
            if m:
                nuevo = nuevo.replace(m.group(0), prop + ':' + ','.join(mio) + ',' + m.group(1).strip(), 1)
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
