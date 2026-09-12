# -*- coding: utf-8 -*-
"""Un solo suelo para todas las secciones: el de la preventa.

Dos cosas, y las dos vienen del mismo sitio: la pagina se leia como trozos
sueltos porque cada trozo tenia su propio suelo. Siete tonos de papel distintos
y tres secciones enteras en negro. Por bien resuelta que estuviera cada una, al
bajar la pagina el suelo cambiaba doce veces.

Ahora hay uno. El de la preventa, que es el que se eligio: papel claro con las
placas, el grano y las auroras azules muy abiertas por detras. Las tres
secciones que eran oscuras —lo que construimos, la documentacion y el diario—
pasan a ese mismo suelo y se les rehace la tinta; sus laminas de arte se quedan
oscuras, igual que las placas de color de las tarjetas de prensa, porque eso es
dibujo y no fondo.

Y la raya de la via dejaba de ser una costura y se metia dentro: medida, se
pasaba 71 px hacia dentro de la seccion y chocaba con el epigrafe en dos de
las diez. Ahora acaba en el cubo de la estacion, que es lo que tenia que hacer
desde el principio: la linea llega y cierra, no sigue.

`montar_home.py` lo aplica en el paso 22.
"""

MARCA = '/* ══ un solo suelo ══'
FIN = '/* ══ fin: suelo ══ */'

# Las tres que eran oscuras pierden su data-bg de noche: de el salen el color
# de la regla del HUD y el del cursor.
# Las tres profundas —lo que construimos, la documentacion y el diario— se
# quedan en negro. Las pase a claro siguiendo «que el fondo sea siempre igual»,
# y la respuesta fue que volvieran al oscuro que tenian. Asi que el suelo unico
# es el de las SIETE de papel; estas tres son otro acto de la pagina.
FONDOS = []

CSS = """
/* ══ un solo suelo ═════════════════════════════════════════════════════════
   Siete tonos de papel y tres secciones en negro: al bajar la pagina el suelo
   cambiaba doce veces. Ahora hay uno, el de la preventa. */

:root{--suelo:#F5F8FC}

/* ── el suelo, y es el mismo para todas ──
   Papel claro, las auroras muy abiertas por detras —lo que hacia que la
   preventa se viera mejor que el resto—, las placas y el grano. En ese orden:
   el grano va arriba del todo porque es lo que quita el ultimo resto de
   blanco de plantilla. */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press){
  background-color:var(--suelo);
  background-image:
    radial-gradient(62% 74% at 6% -10%,rgba(150,190,255,.34),transparent 68%),
    radial-gradient(58% 70% at 96% -14%,rgba(158,194,255,.30),transparent 66%),
    radial-gradient(64% 72% at 18% 112%,rgba(196,214,246,.26),transparent 70%),
    var(--grano),url(img/papel.svg);
  background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat;
  /* Las placas, a TAMANO FIJO. Con «cover» el navegador estira el dibujo hasta
     tapar la seccion, y las secciones miden cosas muy distintas: medido, la
     misma placa salia a 36 px en la tesis, 39 en seguridad, 40 en la preventa,
     47 en build y 56 en token. O sea que el fondo cambiaba de escala un 55 %
     de una seccion a otra. Eso es lo que se ve como «un fondo que no va con
     los demas», y no se arregla retocando un color: se arregla no dejando que
     la altura de la seccion decida el tamano del dibujo. Ancho fijo y se
     repite; la placa mide lo mismo en las diez. */
  background-size:auto,auto,auto,auto,1600px auto;
  background-position:0 0,0 0,0 0,0 0,center top}
@media(max-width:760px){
  :is(.paper,.paper2,.secure,.sale,.tkp,.join,.press){
    background-image:
      radial-gradient(78% 48% at 6% -6%,rgba(150,190,255,.32),transparent 68%),
      radial-gradient(74% 44% at 96% -8%,rgba(158,194,255,.28),transparent 66%),
      radial-gradient(80% 46% at 18% 106%,rgba(196,214,246,.24),transparent 70%),
      var(--grano),url(img/papel-alto.svg);
    background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat-y;
    background-size:auto,auto,auto,auto,100% auto;
    background-position:0 0,0 0,0 0,0 0,left top}
}
/* La preventa traia sus auroras como elementos animados. Se quedan: son las
   mismas, moviendose despacio, y es la seccion de la que salio el suelo. */

/* Y la rosca llevaba ademas un velo blanco propio de una ronda anterior, que
   le tapaba las auroras y la dejaba con cinco capas cuando las demas tienen
   doce. Fuera: el suelo es el mismo o no lo es. */
.tkp.tkp{background-image:
  radial-gradient(62% 74% at 6% -10%,rgba(150,190,255,.34),transparent 68%),
  radial-gradient(58% 70% at 96% -14%,rgba(158,194,255,.30),transparent 66%),
  radial-gradient(64% 72% at 18% 112%,rgba(196,214,246,.26),transparent 70%),
  var(--grano),url(img/papel.svg);
  background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat;
  background-size:auto,auto,auto,auto,1600px auto;
  background-position:0 0,0 0,0 0,0 0,center top}
@media(max-width:760px){
  .tkp.tkp{background-image:
    radial-gradient(78% 48% at 6% -6%,rgba(150,190,255,.32),transparent 68%),
    radial-gradient(74% 44% at 96% -8%,rgba(158,194,255,.28),transparent 66%),
    radial-gradient(80% 46% at 18% 106%,rgba(196,214,246,.24),transparent 70%),
    var(--grano),url(img/papel-alto.svg);
    background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat-y;
    background-size:auto,auto,auto,auto,100% auto;
    background-position:0 0,0 0,0 0,0 0,left top}
}

/* Las tres profundas se quedan en negro y con su tinta de siempre: no se
   tocan. Lo unico que se les deja es la estacion de la via en su color claro,
   que ahi el azul de marca no llega. */
:is(.builds,.hpin,.loop) .sk-n{color:#79ABFF}
:is(.builds,.hpin,.loop) .via{--via-c:rgba(160,200,255,.5)}
:is(.builds,.hpin,.loop) .via::after{background:#79ABFF}

/* Token era la unica de las siete claras SIN tinta propia: heredaba el blanco
   de la pagina sobre un suelo claro. Hoy no se nota porque todos sus textos
   llevan color propio, pero cualquier texto que se anada ahi nace invisible.
   La bateria no lo cazaria —solo mide lo que existe—, asi que se cierra la
   puerta en vez de esperar a pisarla. */
.tkp{color:var(--ink)}

/* Los rotulos de columna del pie iban a 3:1. Los escopados de papel no
   llegan ahi —el pie no es una de las siete— y el efecto de texto revuelto
   les clona el contenido dentro de un «.tec-real», que es lo que delata la
   bateria. */
footer .fgrid h4,footer .tec-real{color:#5B657A}

/* ── la via, que acaba donde tiene que acabar ──
   Medida, se metia 71 px dentro de la seccion y chocaba con el epigrafe en
   dos de las diez. Es una COSTURA: tiene que vivir en el solape y cerrar en
   el cubo, no seguir hacia dentro. */
.via{--via-h:clamp(56px,8vh,104px);
  top:calc(-1 * var(--via-h));height:var(--via-h);
  background:linear-gradient(to bottom,
    transparent,var(--via-c,rgba(27,73,224,.5)) 46%,var(--via-c,rgba(27,73,224,.5)))}
.via::after{top:auto;bottom:-3px}
@media(max-width:760px){.via{--via-h:clamp(40px,7vh,72px)}}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    for viejo, color in FONDOS:
        if viejo in html:
            html = html.replace(viejo, viejo.rsplit('data-bg="', 1)[0] +
                                'data-bg="' + color + '"', 1)
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
