# -*- coding: utf-8 -*-
"""Los titulos a la izquierda. Todos menos el de la portada.

En el paso 20 («via.py») los titulares se centraron: la idea era que las diez
estaciones cayeran en el mismo sitio, sobre la linea que cose la pagina, y que
eso diera simetria. Da simetria, pero cuesta lectura. Un titular centrado se
lee desde el centro hacia fuera: el ojo tiene que buscar donde empieza cada
renglon, y con dos o tres renglones eso son dos o tres busquedas por seccion.
Alineados a la izquierda hay un solo borde, el mismo para el epigrafe, el
titular, la entradilla y las tarjetas de debajo, y el ojo no vuelve a buscar.

La portada se queda centrada. Ahi no hay nada debajo con lo que alinearse
—es una pantalla entera con un titulo y dos botones— y centrado es lo que le
corresponde.

Lo que NO se toca, y conviene decirlo:

  · Las dos bandas animadas, «#stack» y «#xfade». Su texto no es la cabecera
    de una seccion sino el pie de una escena: en «#stack» cae debajo de un
    cubo de cubos centrado en pantalla, y en «#xfade» encima de la marca de
    agua «Nereum», tambien centrada. Moverlo a la izquierda y dejar el dibujo
    en el centro no es alinear, es descuadrar. Un interludio a pantalla
    completa centrado entre secciones alineadas se lee como lo que es.

  · La via. La linea y su cubo siguen por el centro porque no pertenecen a
    ninguna cabecera: son la costura entre dos secciones, y la costura va por
    donde va la pagina. El epigrafe, que antes se colgaba del cubo, ahora se
    alinea con su titular.

Todo esto es CSS puro que pisa reglas anteriores por orden, no por peso: cada
selector repite la especificidad del que anula y va despues. Por eso el modulo
es el ULTIMO paso de «montar_home.py» —si se adelanta, no pisa nada—.

No estrena ni un texto.
"""

MARCA = '/* ══ los titulos a la izquierda ══'
FIN = '/* ══ fin: titulos a la izquierda ══ */'

# Las secciones cuyo epigrafe numerado se alinea con su titular. «#stack» no
# esta: su epigrafe vive dentro de la escena animada y se queda con ella.
SECCIONES = ['#network', '#press', '#thesis', '#solutions', '#security',
             '#presale', '#token', '#builds', '#join']

_SEL = ','.join('%s .sk' % s for s in SECCIONES)

CSS = """
/* ══ los titulos a la izquierda ═══════════════════════════════════════════
   Todos menos el de la portada. Un titular centrado obliga al ojo a buscar
   donde empieza cada renglon; alineados hay un solo borde para el epigrafe,
   el titular, la entradilla y las tarjetas, y no se vuelve a buscar.

   Cada regla repite la especificidad de la que anula y va DESPUES: este
   modulo es el ultimo paso del montaje justamente para eso.

   «start», no «left». El sitio se traduce al arabe y el cuerpo se pone en
   «direction:rtl»: con «left» los titulos arabes se quedarian a la izquierda,
   que en arabe es el final del renglon. «start» es el principio del renglon
   sea cual sea el idioma, y es lo que ya usan los titulos de las tarjetas. */

/* ── 1 · la caja de la cabecera ──
   «.sec-head» es la unica que existe en el marcado; las otras cuatro se
   nombran porque el paso 20 las nombraba y asi la vuelta es exacta. */
:is(.press-head,.sec-head,.tkp-head,.builds-head,.join-head,.say .wrap){
  text-align:start}
:is(.press-head,.sec-head,.tkp-head,.builds-head,.join-head)>*{
  margin-inline:0}

/* ── 2 · el titular y su entradilla ──
   El «margin-inline:0» importa tanto como el «text-align»: las entradillas
   llevan «max-width:52ch», y una caja estrecha centrada con el texto ya
   alineado a la izquierda se queda flotando en medio del hueco. */
:is(.press-h,.sec-h,.tkp-h,.builds-h,.join-h,.sec-sub,.join-note,.say p){
  margin-inline:0;text-align:start}

/* ── 3 · el epigrafe numerado ──
   «.sk» es un flex al 100 % del ancho: no se mueve con «text-align», se
   mueve con «justify-content». Es el mismo sitio donde el paso 20 lo centro. */
__SEL__{justify-content:flex-start}
/* La ronda tiene su propia fila —el epigrafe y las dos cadenas— y se centraba
   con «justify-content» desde el identificador: hace falta el mismo peso. */
#presale .sale-top{justify-content:flex-start}

/* ── 4 · la fila de compatibles ──
   Aqui el centrado no venia del paso 20 sino de la hoja original, que centra
   la seccion entera. El carrusel no se entera: sus fichas son casillas de un
   flex, y «text-align» no las coloca. */
.logos{text-align:start}
.logos h2,.logos .lane-sub{margin-inline:0;text-align:start}

/* ── 5 · «Stay in the loop» ──
   Su entradilla es un flex con un cuadradito delante, asi que ademas del
   texto hay que mover la fila. */
.loop h2,.loop .sub{text-align:start}
.loop .sub{justify-content:flex-start}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    css = CSS.replace('__SEL__', _SEL).strip('\n')
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + css + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + css + '\n</style>', 1)
