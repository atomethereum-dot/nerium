# -*- coding: utf-8 -*-
"""Las secciones oscuras, en negro de verdad. Sin tocar ni una animacion.

Lo que se veia como negro no lo era: «#0A0E18» en «builds», en la ruta y en la
documentacion, «#050609» en la cinta, «#05070C» en el escenario del final. Son
azules muy oscuros, y encima «builds» y la ruta llevaban un resplandor azul de
1100 px cruzandoles la esquina.

Y en las dos escenas de lienzo el azul no estaba en la hoja de estilos sino
DENTRO del guion, que es lo que costo encontrar: el campo de cubos se echaba
encima un lavado radial azul de pantalla completa; el corredor de losetas
arrancaba de «rgb(5,7,12)», tenia un velo «rgba(4,6,11,.95)» en el horizonte y
—esto era lo gordo— rellenaba CADA loseta de «#04060B». Como las losetas cubren
casi toda la pantalla en el tramo oscuro, eran ellas las que dejaban la seccion
en azul marino por mucho que el suelo ya fuera negro.

Lo que NO se toca, y es el encargo entero: las animaciones. Los cubos siguen
volando, la cinta corriendo, las losetas abriendose y la inundacion a blanco
del final llega igual de blanca. Las losetas se siguen viendo porque lo que las
dibuja es su contorno azul claro, no el relleno.

`montar_home.py` lo aplica en el paso 30.
"""

MARCA = '/* ══ el negro de verdad ══'
FIN = '/* ══ fin: negro ══ */'

# Las secciones y el color que traian. El comentario del CSS los deja escritos
# para que se vea de un vistazo lo lejos del negro que estaban.
SECCIONES = [
    ('.builds', '#0A0E18'),
    ('.ruta',   '#0A0E18'),
    ('.hpin',   '#0A0E18'),
    ('.kin',    '#050609'),
    ('.xf',     '#000000'),
    ('.xl',     '#05070C'),
]

# El «data-bg» de cada seccion: la banda que la pagina pinta por detras.
DATA_BG = [
    ('id="builds" data-bg="#0A0E18"', 'id="builds" data-bg="#000000"'),
    ('id="ruta" data-bg="#0A0E18"',   'id="ruta" data-bg="#000000"'),
    ('id="docs" data-bg="#0A0E18"',   'id="docs" data-bg="#000000"'),
    ('class="kin" data-bg="#050609"', 'class="kin" data-bg="#000000"'),
    ('id="xlight" data-bg="#05070C"', 'id="xlight" data-bg="#000000"'),
]

_LAVADO_VIEJO = """    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(W,H)*0.7);
    g.addColorStop(0,'rgba(47,107,255,'+(0.13*fuerza).toFixed(3)+')');
    g.addColorStop(1,'rgba(47,107,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
"""
_LAVADO_NUEVO = """    /* sin lavado de fondo: el suelo de esta seccion es negro */
"""

_SUELO_VIEJO = (
    "    const bg=Math.round(5+(PAPER[0]-5)*flood);\n"
    "    ctx.fillStyle='rgb('+bg+','+Math.round(7+(PAPER[1]-7)*flood)+','"
    "+Math.round(12+(PAPER[2]-12)*flood)+')';")
_SUELO_NUEVO = (
    "    const bg=Math.round(PAPER[0]*flood);\n"
    "    ctx.fillStyle='rgb('+bg+','+Math.round(PAPER[1]*flood)+','"
    "+Math.round(PAPER[2]*flood)+')';")

# Lo que cada LIENZO pinta por su cuenta. No esta en el CSS, asi que cambiarlo
# en la hoja de estilos no habria servido de nada: el canvas se repinta de su
# color en el cuadro siguiente.
LIENZOS = [
    # El escenario del final se limpiaba de «#05070C» cada cuadro.
    ("sctx.fillStyle='#05070C'; sctx.fillRect(0,0,W,H);",
     "sctx.fillStyle='#000000'; sctx.fillRect(0,0,W,H);"),
    ("sctx.fillStyle='rgba(4,6,11,.26)';",
     "sctx.fillStyle='rgba(0,0,0,.26)';"),
    # El lavado radial azul del campo de cubos, en modo «lighter», de esquina a
    # esquina. Eso no es la escena: es un tinte encima de ella.
    (_LAVADO_VIEJO, _LAVADO_NUEVO),
    # El corredor arrancaba de «rgb(5,7,12)» y se inundaba hasta el blanco.
    # Ahora arranca de negro y termina igual de blanco: la inundacion no se
    # toca, solo su punto de salida.
    (_SUELO_VIEJO, _SUELO_NUEVO),
    # El velo del horizonte, que apaga las losetas segun se alejan.
    ("suVelo.addColorStop(0,'rgba(4,6,11,.95)');",
     "suVelo.addColorStop(0,'rgba(0,0,0,.95)');"),
    ("suVelo.addColorStop(1,'rgba(4,6,11,0)');",
     "suVelo.addColorStop(1,'rgba(0,0,0,0)');"),
    # Y el relleno de cada loseta, que era lo gordo: cubren casi toda la
    # pantalla en el tramo oscuro. En negro se siguen viendo igual, porque lo
    # que las dibuja es su contorno azul claro.
    ("ctx.fillStyle='#04060B';", "ctx.fillStyle='#000000';"),
]

_SEL = ','.join(s for s, _ in SECCIONES)
_LISTA = '\n'.join('     %s  venia de %s' % (s.ljust(9), c) for s, c in SECCIONES)

CSS = """
/* ══ el negro de verdad ════════════════════════════════════════════════════
   Lo que parecia negro eran azules muy oscuros:

__LISTA__

   y encima «builds» y la ruta llevaban un resplandor azul de 1100 px por la
   esquina. Suelo negro y fuera el resplandor de esquina.

   El resto del azul no estaba aqui sino dentro del guion, en lo que cada
   lienzo se pinta solo: el lavado del campo de cubos y, sobre todo, el relleno
   de las losetas del corredor. Eso lo cambia «negro.py» en el marcado.

   Las animaciones no se tocan. */
__SEL__{background:#000}
/* El resplandor de esquina era lo que mas tiznaba de azul: 1100 x 520 px de
   «rgba(47,107,255,.16)» entrando por arriba a la izquierda. */
.builds::before,.ruta::before{display:none}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    for viejo, nuevo in DATA_BG + LIENZOS:
        if viejo in html:
            html = html.replace(viejo, nuevo)
    css = CSS.replace('__SEL__', _SEL).replace('__LISTA__', _LISTA).strip('\n')
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + css + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + css + '\n</style>', 1)
