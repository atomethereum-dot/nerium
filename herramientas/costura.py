# -*- coding: utf-8 -*-
"""La costura entre cada banda animada y la seccion que le sigue.

Lo que habia: un triangulo. Literalmente un triangulo, recortado con
«clip-path: polygon(0 0, 100% 0, 50.7% 100%, 49.3% 100%)», pintado de un color
fijo y puesto encima del final de cada escena. Dos problemas, y son distintos.

1 · El color estaba invertido en dos de las cuatro
    Muestreando el pixel de verdad en el borde de cada banda, con el embudo
    apagado para no medirse a si mismo:

        chroma  embudo #000000   escena #1E293C   va bien
        kin     embudo #050609   escena #080A0C   va bien
        xf      embudo #F5F5F7   escena #0A101B   AL REVES
        xl      embudo #0A0E18   escena #E0E4E6   AL REVES

    En «xf» eso es un triangulo casi blanco encima de una escena casi negra
    —la luz blanca que se ve en pantalla—, y en «xl» el mismo error al reves:
    un triangulo casi negro encima de una escena casi blanca. El comentario
    del paso 20 avisaba justo de esto («sale un triangulo palido gigante
    encima del negro») y aun asi dos quedaron cambiadas: el color se escribio
    de memoria, mirando «data-bg», en vez de mirar la pantalla. «data-bg» dice
    de que color EMPIEZA la banda; el embudo vive donde ACABA, y estas dos
    cambian de claro a oscuro por el camino.

2 · La forma era un recorte, no un final
    Un «clip-path» de poligono no tiene medio tono: sus dos diagonales son un
    corte, y en cuanto el color del embudo no es exactamente el del fondo se
    ven las dos rectas cruzando la escena. Eso es lo que hace que se lea como
    una figura puesta encima y no como la escena apagandose.

Lo que hay ahora: ningun borde recto. Dos capas de degradado, las dos del
color que la escena tiene DE VERDAD ahi:

    · un suelo — la escena se hunde en su propio color, de lado a lado;
    · una convergencia — una elipse anclada abajo en el centro, que llega mas
      arriba por el medio que por los lados. Es la misma idea de antes —todo
      baja hacia la via— pero con caida suave: mas alto en el centro sin que
      haya una sola recta que lo diga.

El color va en CSS y no en el marcado. El paso 20 escribe «--emb» en cada
elemento y aqui se ignora: se pinta con «--embc», que es el mismo color en
componentes sueltos. Se hace asi por dos razones — no tocar el marcado que
otro paso escribe, y que los degradados puedan bajar la opacidad sin pasar
por gris. Un degradado a «transparent» interpola hacia rgba(0,0,0,0), asi que
un color claro que se desvanece a «transparent» pasa por un halo sucio; con
las componentes sueltas se baja solo la alfa y el tono no se mueve.

No estrena ni un texto.

`montar_home.py` lo aplica en el paso 26.
"""

MARCA = '/* ══ la costura ══'
FIN = '/* ══ fin: costura ══ */'

# El color MEDIDO en pantalla al final de cada banda, con el embudo apagado.
# No es «data-bg»: eso es donde la banda empieza, y dos de ellas terminan del
# color contrario.
SUELOS = [
    ('chroma', '0 0 0',        '#000000', 'campo de rayas sobre negro'),
    ('kin',    '8 10 12',      '#080A0C', 'cinta oscura'),
    ('xf',     '10 16 27',     '#0A101B', 'acaba OSCURA, no clara'),
    ('xl',     '224 228 230',  '#E0E4E6', 'acaba CLARA, no oscura'),
]

_POR_BANDA = '\n'.join(
    '.%s .emb{--embc:%s}   /* %s · %s */' % (c, rgb, hexa, nota)
    for c, rgb, hexa, nota in SUELOS)

CSS = """
/* ══ la costura ═══════════════════════════════════════════════════════════
   Entre cada banda animada y la seccion que le sigue. Antes era un triangulo
   recortado con «clip-path» y pintado de un color fijo; dos de los cuatro
   colores estaban invertidos y las dos diagonales del recorte se veian. Ahora
   no hay ni un borde recto y el color es el que la escena tiene de verdad
   ahi, muestreado en pantalla. */

/* ── el color de cada suelo ──
   Medido con el embudo apagado, que si no se mide a si mismo. En componentes
   sueltas y no en «#RRGGBB» porque los degradados tienen que bajar la alfa
   sin tocar el tono: un color claro que se desvanece hacia «transparent»
   interpola hacia rgba(0,0,0,0) y pasa por un halo gris. */
__BANDAS__

/* ── las dos capas ──
   Suelo: la escena se hunde en su propio color, de lado a lado.
   Convergencia: una elipse anclada abajo en el centro, mas alta por el medio
   que por los lados. La misma idea que el triangulo —todo baja hacia la via—
   pero con caida suave, sin una sola recta que lo diga. */
.emb{
  clip-path:none;
  background:
    radial-gradient(132% 106% at 50% 100%,
      rgb(var(--embc,10 16 27) / 1)    0%,
      rgb(var(--embc,10 16 27) / .74) 24%,
      rgb(var(--embc,10 16 27) / .30) 50%,
      rgb(var(--embc,10 16 27) / 0)   74%),
    linear-gradient(to bottom,
      rgb(var(--embc,10 16 27) / 0)    0%,
      rgb(var(--embc,10 16 27) / .30) 56%,
      rgb(var(--embc,10 16 27) / .84) 88%,
      rgb(var(--embc,10 16 27) / 1)  100%)}

/* Un poco mas alto que el triangulo: la caida es suave y necesita recorrido
   para no acabar siendo una raya. Las cuatro iguales —el paso 20 daba dos
   alturas distintas— porque ahora la forma no depende de la escena. */
.chroma .emb,.kin .emb,.xf .emb,.xl .emb{height:clamp(104px,12vw,180px)}
@media(max-width:760px){
  .chroma .emb,.kin .emb,.xf .emb,.xl .emb{height:clamp(64px,18vw,104px)}
}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    css = CSS.replace('__BANDAS__', _POR_BANDA).strip('\n')
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + css + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + css + '\n</style>', 1)
