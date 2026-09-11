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
FONDOS = [
    ('<section class="builds" id="builds" data-bg="#0A0E18"', '#F5F8FC'),
    ('<section class="hpin" id="docs" data-bg="#0A0E18"', '#F5F8FC'),
    ('<section class="dark pad loop" id="blog" data-bg="#060C1A"', '#F5F8FC'),
]

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
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press,.builds,.hpin,.loop){
  background-color:var(--suelo);
  background-image:
    radial-gradient(62% 74% at 6% -10%,rgba(150,190,255,.34),transparent 68%),
    radial-gradient(58% 70% at 96% -14%,rgba(158,194,255,.30),transparent 66%),
    radial-gradient(64% 72% at 18% 112%,rgba(196,214,246,.26),transparent 70%),
    var(--grano),url(img/papel.svg);
  background-repeat:no-repeat,no-repeat,no-repeat,repeat,no-repeat;
  background-size:auto,auto,auto,auto,cover;
  background-position:0 0,0 0,0 0,0 0,center}
@media(max-width:760px){
  :is(.paper,.paper2,.secure,.sale,.tkp,.join,.press,.builds,.hpin,.loop){
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
.tkp{background-blend-mode:normal}
/* El velo extra de la rosca ya no hace falta: el suelo es igual de claro en
   todas partes y la rosca no compite con nada. */

/* ── las tres que eran oscuras ──
   Suelo claro y tinta nueva. Las laminas de arte se quedan oscuras: eso es
   dibujo, como las placas de color de las tarjetas de prensa. */
:is(.builds,.hpin,.loop){color:#0A0D14}
:is(.builds,.hpin,.loop) :is(h2,h3,b,strong){color:#0A0D14}
.builds-h,.hp-t,.loop h2{color:#0A0D14}
.loop .sub{color:#3C4557}
.loop .card b{color:#0A0D14}
.hp-ghost{color:rgba(10,13,20,.05)}
/* El resplandor azul que llevaban por detras sobraba en claro: era para
   levantar el negro. */
.builds::before{display:none}

/* El epigrafe de estas tres iba con «--mute», que es el gris de los fondos
   OSCUROS: sobre papel se queda en blanco sobre blanco. Y no lo caza la
   bateria de contraste —esos rotulos estan en su lista de «sin medir», porque
   ahi el fondo lo pinta un degradado y no una regla—, asi que esto se ve
   mirando o no se ve. */
:is(.builds,.hpin,.loop) .k{color:#5B657A}
:is(.builds,.hpin,.loop) .sk-n{color:#1B49E0}
:is(.builds,.hpin,.loop) .via{--via-c:rgba(27,73,224,.5)}
:is(.builds,.hpin,.loop) .via::after{background:#1B49E0}

/* Las dos tarjetas de build: la lamina de arte sigue oscura, el pie pasa a
   papel con el mismo relieve que el resto de tarjetas claras. «.bcd» no traia
   fondo —sobre negro no le hacia falta— y sin el, el pie de la tarjeta se
   confundia con el suelo. */
.bcd{background:#fff;border:1px solid var(--p-linea);
  box-shadow:var(--p-relieve);overflow:hidden}
.bcd>*:last-child{padding:clamp(16px,1.6vw,22px) clamp(16px,1.6vw,22px)
  clamp(18px,1.8vw,24px)}
.bcd:hover{box-shadow:var(--p-relieve2)}
.bcd-t{color:#0A0D14}
.bcd-d{color:#3C4557}
.bcd-tag{color:#5B657A}
.bcd-go{color:#1B49E0}

/* El diario: las tarjetas llevan su propio lienzo pintado y se quedan como
   estan; lo que cambia es lo que hay alrededor. */
.loop h2 i{background:#1B49E0}
.loop .sub s{background:#1B49E0}

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
