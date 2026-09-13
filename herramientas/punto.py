# -*- coding: utf-8 -*-
"""El punto de «Seed Round open» y el eje de la tira de la portada.

En el movil la tira de la portada es una columna de cuatro renglones:

        ●  SEED ROUND OPEN
           1 NRM = $0.20
        ETHEREUM · BNB CHAIN
        CONTRACTS VERIFIED

Los cuatro se centran, pero el primero lleva un punto DENTRO del renglon, y
lo que se centra es el renglon entero —punto, hueco y texto—. Asi que el texto
del primero queda empujado a la derecha media pieza:

    (punto 5 px + hueco 8 px) / 2 = 6,5 px

Medido en el navegador, no a ojo: a 430, 390 y 360 px el texto del primer
renglon cae +6,50 px del eje, y los otros tres caen a ±0,01. Sobre una
pantalla de 390 px, 6,5 px de un renglon contra tres es una linea torcida, y
es lo que hace que el punto parezca fuera de sitio: no es que el punto este
mal puesto respecto a SU texto, es que su texto esta mal puesto respecto a los
otros tres.

El arreglo: el punto sale del centrado y se cuelga en el margen izquierdo. El
renglon pasa a medir lo que mide su texto, se centra con los otros tres, y el
punto queda como lo que es —una marca al margen— en vez de como algo que
empuja la linea.

Sobre la vertical, que es lo que se ve primero: el punto esta a 0,12 px del
centro optico de las mayusculas. No 1, no 2: doce centesimas. Eso no lo
distingue ninguna pantalla, asi que no se toca — poner ahi un numero magico
seria inventarse un arreglo para un fallo que no esta. Lo que el ojo estaba
cogiendo es la horizontal.

En ancho la tira es una FILA, no una columna: no hay eje comun que respetar
—cada renglon esta en un sitio distinto a proposito— y ahi el punto se queda
dentro, donde debe.

No estrena ni un texto.

`montar_home.py` lo aplica en el paso 27.
"""

MARCA = '/* ══ el punto de la tira ══'
FIN = '/* ══ fin: punto de la tira ══ */'

# El mismo corte que usa el paso 19 para pasar la tira a columna. Si se
# cambia alli hay que cambiarlo aqui: el arreglo solo tiene sentido en columna.
CORTE = 700

CSS = """
/* ══ el punto de la tira ═══════════════════════════════════════════════════
   En columna, el primer renglon lleva un punto dentro y se centra el renglon
   entero, asi que su TEXTO queda +6,5 px a la derecha del eje que comparten
   los otros tres —(punto 5 + hueco 8) / 2—. Medido a 430, 390 y 360: +6,50 en
   el primero, ±0,01 en los demas.

   El punto sale del centrado y se cuelga en el margen. El renglon mide lo que
   mide su texto, se centra con los otros tres, y el punto queda como una
   marca al margen en vez de como algo que empuja la linea.

   La vertical NO se toca: el punto esta a 0,12 px del centro optico de las
   mayusculas, que no lo distingue ninguna pantalla. */
@media(max-width:__CORTE__px){
  .lq .hero-pr li:first-child{position:relative}
  /* «right:100 %» lo deja pegado al borde izquierdo del renglon y el margen
     le devuelve el hueco que tenia cuando era una pieza mas. */
  .lq .hero-pr li:first-child>i{
    position:absolute;right:100%;margin-right:8px;
    top:50%;transform:translateY(-50%)}
}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    css = CSS.replace('__CORTE__', str(CORTE)).strip('\n')
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + css + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + css + '\n</style>', 1)
