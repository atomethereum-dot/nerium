# -*- coding: utf-8 -*-
"""La mitad clara, decidida.

Puntuada la pagina seccion por seccion, la mitad oscura estaba a 9 y la clara
a 6. No por falta de trabajo: por falta de DECISION. El blanco no estaba
elegido, estaba por defecto, y encima llevaba un tapiz al 5 % que ni decora ni
sostiene —se queda en ruido—. Seis folios detras de una portada con caracter.

Esto no uniforma la pagina: la alternancia claro/oscuro se queda, porque es la
que se decidio. Lo que cambia es que la mitad clara pasa a ser un mundo hecho
a proposito, con el MISMO motivo que el oscuro —el campo de bloques— pero
ejecutado como lo que es: placas, con su canto iluminado y su direccion de luz.

Cinco cosas, que son las cinco que bajaban la nota:

  1. el suelo: papel frio con grano y placas de verdad, no blanco liso;
  2. la elevacion: una sola direccion de luz para todas las tarjetas claras;
  3. «In the open»: dos cajas con un agujero de 200 px en medio, recompuestas;
  4. el ritmo: «Compatible with» deja de ser una pantalla y pasa a ser banda;
  5. los tres textos por debajo del minimo de contraste.

`montar_home.py` lo aplica en el paso 17.
"""
import os
import random

MARCA = '/* ══ la mitad clara, decidida ══'
FIN = '/* ══ fin: papel ══ */'


# ── 1 · el suelo ─────────────────────────────────────────────────────────────
def placas(semilla=31):
    """El campo de bloques de la portada, quieto, pero como PLACAS.

       Dos diferencias con el tapiz que sustituye, y las dos son la misma
       decision tomada en serio:

       · opacidad. El otro iba de .022 a .072 y por eso no se veia. Este llega
         a .34. Un fondo que no se ve no es sutil, es un fondo que no esta.
       · composicion. El otro dejaba libre el CENTRO, pensando en texto
         centrado. Pero en esta pagina el titular de cada seccion va arriba a
         la IZQUIERDA, asi que el hueco no protegia lo unico que habia que
         proteger. El primer intento de este las aparto en vertical —limpio en
         la franja de en medio— y salio peor todavia: densas justo detras del
         titular, que es donde mas estorban.

         Van en diagonal. Limpio arriba a la izquierda, que es el rincon del
         titular en las siete secciones; denso abajo y a la derecha, que es
         donde o no hay nada o hay tarjetas opacas por encima. La composicion
         sale del sitio real del contenido, no de una simetria bonita.

       Cada placa lleva un filete claro de 1 px en el canto de arriba. Es lo
       que la convierte en una placa con luz encima y no en una mancha."""
    W, H, U = 1600, 1000, 40
    FRIO = [(176, 196, 226), (150, 176, 216), (198, 213, 236), (128, 158, 206)]
    r = random.Random(semilla)
    piezas = []
    cols, filas = W // U, H // U
    for _ in range(200):
        for _ in range(40):
            cx, cy = r.randrange(cols), r.randrange(filas)
            hx, hy = cx / (cols - 1), cy / (filas - 1)
            d = .42 * hx + .58 * hy          # 0 arriba-izquierda, 1 abajo-derecha
            if r.random() < d ** 1.45:
                break
        else:
            continue
        an = r.choice([2, 3, 3, 4, 4, 5, 6]) * U     # placas largas: arquitectura
        c = FRIO[r.randrange(len(FRIO))]
        a = round((.07 + .27 * d) * r.uniform(.6, 1.0), 3)
        x, y = cx * U, cy * U
        piezas.append('<rect x="%d" y="%d" width="%d" height="%d" fill="rgb(%d,%d,%d)" '
                      'opacity="%s"/>' % (x, y, an, U, c[0], c[1], c[2], a))
        # el filete de arriba: la luz viene de arriba, siempre la misma
        piezas.append('<rect x="%d" y="%d" width="%d" height="1" fill="#FFFFFF" '
                      'opacity="%s"/>' % (x, y, an, round(min(.85, a * 2.6), 3)))

    def rg(nid, col, op):
        return ('<radialGradient id="' + nid + '">'
                '<stop offset="0" stop-color="' + col + '" stop-opacity="' + op + '"/>'
                '<stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>')
    defs = ('<defs>' + rg('l1', 'rgb(255,255,255)', '.96')
                     + rg('l2', 'rgb(47,107,255)', '.09')
                     + rg('l3', 'rgb(120,150,215)', '.12') + '</defs>')
    # el foco blanco remata el rincon del titular; los otros dos tinan de azul
    # la esquina cargada, para que el peso no sea gris
    luces = ('<ellipse cx="270" cy="150" rx="900" ry="460" fill="url(#l1)"/>'
             '<circle cx="1480" cy="900" r="560" fill="url(#l2)"/>'
             '<circle cx="1560" cy="120" r="420" fill="url(#l3)"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
            'preserveAspectRatio="xMidYMid slice">%s%s%s</svg>'
            % (W, H, defs, ''.join(piezas), luces))


def escribir(raiz):
    ruta = os.path.join(raiz, 'img', 'papel.svg')
    dibujo = placas()
    try:
        if open(ruta, encoding='utf-8').read() == dibujo:
            return ruta
    except OSError:
        pass
    open(ruta, 'w', encoding='utf-8').write(dibujo)
    return ruta


# ── el bloque ────────────────────────────────────────────────────────────────
# «@@» es el escopado de las siete secciones claras. Se escribe corto y se
# expande al final a «:is(...)», nunca a la lista suelta: «.a,.b .c» significa
# «.a» O «.b .c», que no es lo que se quiere ni una sola vez aqui.
#
# Y va escopado por lo mismo que el modulo anterior: para no tocar lo que ya
# era oscuro, y para GANARLE en especificidad a lo original —«.rd» pierde
# contra «.rows .rd» y se queda en tinta negra sobre fondo negro—.
SECS = ':is(.paper,.paper2,.secure,.sale,.tkp,.join,.press)'

CSS = """
/* ══ la mitad clara, decidida ════════════════════════════════════════════
   La mitad oscura estaba a 9 y la clara a 6. No por falta de trabajo: por
   falta de DECISION. El blanco no estaba elegido, estaba por defecto.

   La alternancia claro / oscuro se queda —es la que se decidio—. Lo que
   cambia es que la mitad clara pasa a ser un mundo hecho a proposito, con el
   MISMO motivo que el oscuro: el campo de bloques de la portada. */

:root{
  --p-papel:#EDF1F8;  --p-papel2:#E5EBF5;  --p-alto:#F5F8FC;
  --p-linea:rgba(30,58,116,.15); --p-linea2:rgba(30,58,116,.07);
  /* Una sola direccion de luz para toda la mitad clara: de arriba. El filete
     blanco en el canto superior y la sombra tirando a azul debajo son la misma
     decision. Es lo que da relieve sin un solo borde gris. */
  --p-relieve:inset 0 1px 0 rgba(255,255,255,.92),
              0 1px 2px rgba(20,42,92,.05),
              0 18px 40px -26px rgba(20,42,92,.44);
  --p-relieve2:inset 0 1px 0 rgba(255,255,255,.95),
               0 2px 4px rgba(20,42,92,.07),
               0 34px 70px -34px rgba(20,42,92,.52);
}

/* ── 1 · el suelo ──
   Papel frio, no blanco. El blanco puro no existe en nada impreso ni en
   ningun sitio que se vea caro: es justo lo que hace que algo parezca una
   plantilla a medio terminar. Encima van las placas —el campo de bloques,
   quieto— y el grano que ya habia. */
.paper,.press,.secure{background-color:var(--p-papel)}
.paper2,.tkp{background-color:var(--p-papel2)}
.sale,.join{background-color:var(--p-alto)}
@@{background-image:var(--grano),url(img/papel.svg);
   background-repeat:repeat,no-repeat;background-size:auto,cover;
   background-position:0 0,center}
/* El canto de arriba de cada lamina clara: el mismo filete blanco que llevan
   las placas y las tarjetas, aplicado a la seccion entera. */
main>section@@{box-shadow:inset 0 1px 0 rgba(255,255,255,.92)}

/* ── 2 · la elevacion ──
   Cada tarjeta clara era un rectangulo blanco con un borde gris. Un borde gris
   no es relieve: es no haber decidido de donde viene la luz. Ahora todas
   comparten la misma, y el borde pasa a ser azulado, de la familia de la
   marca, en vez de gris neutro. */
@@ :is(.sec-card,.prices,.pcd,.w-field,.jbtn,.widget){border-color:var(--p-linea)}
/* .jbtn no tenia fondo propio: sobre el blanco liso de antes daba igual, pero
   sobre un suelo con placas se transparenta y parece a medio hacer. */
@@ :is(.sec-card,.pcd,.jbtn){background:#fff;box-shadow:var(--p-relieve)}
@@ .jbtn:hover{box-shadow:var(--p-relieve2)}
@@ .widget{background:#fff;box-shadow:var(--p-relieve2)}
@@ .prices{box-shadow:var(--p-relieve)}
@@ .w-out{border-color:var(--p-linea);background:var(--p-linea2)}
@@ :is(.sec-card,.pcd):hover{box-shadow:var(--p-relieve2)}

/* ── 3 · «In the open» ──
   Era la seccion mas floja de la pagina con diferencia: dos cajas de 268 px de
   alto con el icono arriba a la izquierda, el titulo abajo, y un agujero de
   200 px en medio que no hacia nada. Eso no es minimalismo, es una caja sin
   llenar.

   Se quita el alto forzado y el «space-between» que separaba las dos filas, y
   la marca del canal pasa a una placa de SU color —negro para X, azul para
   Telegram—, como las tarjetas de prensa. La tarjeta se queda a la altura de
   lo que lleva dentro, que es lo que tenia que haber hecho siempre. */
@@ .jbtn{align-content:start;gap:clamp(20px,2.2vw,30px);min-height:0;
   padding:clamp(20px,2.3vw,30px)}
@@ .jbtn-mark{width:clamp(48px,4.6vw,60px);height:clamp(48px,4.6vw,60px);
   box-sizing:border-box;padding:clamp(11px,1.15vw,15px);border-radius:3px;
   background:var(--jb);color:#fff;
   box-shadow:0 16px 30px -18px color-mix(in srgb,var(--jb) 68%,transparent)}
@@ .jbtn:hover .jbtn-mark{background:#fff;color:var(--jb)}
@@ .jbtn-go{border-color:var(--p-linea)}

/* ── 4 · el ritmo ──
   Casi todas las secciones eran titular grande + dos o tres tarjetas: la
   pagina es larga pero respiraba siempre igual. «Compatible with» ocupaba una
   pantalla entera para decir una fila de nombres. Pasa a ser lo que es —una
   banda entre la portada y la prensa—, y con eso la pagina cambia de paso al
   menos una vez. */
/* La rosca es lo unico que hay en su seccion y las placas le competian por
   detras. Un velo blanco extra solo ahi: el dibujo manda, el suelo acompana. */
@@.tkp{background-image:
   linear-gradient(rgba(247,250,253,.72),rgba(247,250,253,.72)),
   var(--grano),url(img/papel.svg)}

@@.logos{padding:clamp(30px,3.2vw,46px) 0 clamp(34px,3.6vw,52px)}
/* El titular de la banda vuelve a ser un titular. Cuando le puse encima el
   epigrafe numerado del paso 18, los dos eran mono en versales del mismo
   cuerpo y la banda tartamudeaba: «01 NETWORK» y debajo «COMPATIBLE WITH».
   Un epigrafe y un titular tienen que distinguirse en algo. */
@@.logos h2{font-size:clamp(15px,1.6vw,19px);font-family:var(--f);
   letter-spacing:-.02em;text-transform:none;font-weight:400;color:#1A2233}
@@.logos .lane-sub{display:none}
@@.logos .lane{margin-top:clamp(16px,1.8vw,24px)}

/* ── 5 · la escala de tinta ──
   Esto es lo que el medidor destapo, y no era el detalle que yo pensaba: TODA
   la capa de etiquetas pequenas de la mitad clara vivia entre 2,5 y 3,2:1.
   «Entity», «Auditor», «Provider», «Pay with», «per NRM», los rotulos de cada
   tarjeta, el pie. Cuarenta y tantos sitios con el mismo gris de relleno.

   No es un problema de accesibilidad que arreglar aparte: es exactamente POR
   QUE la pagina se veia descolorida. Un rotulo que no se lee no es discreto,
   es un rotulo que sobra. Tres niveles de tinta, los tres por encima del
   minimo, y la jerarquia se mantiene igual —solo que ahora se ve—. */
@@ :is(.rd,.sec-sub,.sale-sub,.join-note,.press-foot,.tkp-row span,
       .jbtn-sub,.lane-sub){color:#3C4557}
@@ :is(dt,.k,.mono,.sec-k,.pr-k,.pr-n,.w-lab,.w-note,.w-rate,.w-eq,.sale-net,
       .tec-real,.tec-fantasma,
       .join-rule,.raise-foot,.raise-foot span,.tkp-core span,.tkp-core em,
       .press-all,.w-swap){color:#5B657A}
/* «.wi» NO entra aqui, y casi entra. Es el tramo de palabra de CUALQUIER
   titular partido, no un rotulo: meterlo en la tinta de rotulo dejaba grises
   todos los titulares de la pagina para que el medidor callara. Salio en una
   captura. Arreglar una medida estropeando el diseno es hacerlo al reves. */
/* Los ordinales de las tarjetas iban a 1,56:1, o sea invisibles. Un numero
   que no se ve no es una marca de agua: es tinta desperdiciada. Van a la misma
   tinta de rotulo que el resto —un gris intermedio propio se quedaba corto
   sobre el papel, que no es blanco— y a 10 px siguen sin pesar mas que el
   titulo. */
@@ :is(.sec-n,.rn){color:#5B657A}
/* El rotulo del medio de la rosca y su cifra: 2,20 y 2,65 sobre el papel. */
@@ .tkp-core b{color:#1A2233}
/* El epigrafe de cada tarjeta de prensa iba en el acento del medio, que en
   verde y en rojo no llega: el cuadradito se queda de color y el texto no. */
@@ .pcd-tag{color:#3C4557}
footer :is(.fcopy,.f-legal){color:#5B657A}
/* La palabra gigante del pie llevaba un degradado en blanco roto —hecho para
   un fondo oscuro— sobre un pie claro: casi no se veia. Misma marca de agua,
   en tinta. */
.fmark span{background:linear-gradient(180deg,rgba(10,13,20,.20),rgba(10,13,20,.03))}
/* Y el cubo, a silueta: con su plata puesta se quedaba en un bloque pálido y
   plano al lado de unas letras que son marca de agua. El conjunto es una sola
   cosa, asi que se comporta como una sola cosa. */
.fmark-logo{filter:brightness(0) opacity(.15)}

/* ── 6 · el contraste ──
   Los tres que estaban por debajo del minimo de la norma —4,5:1—, medidos, no
   estimados. Ninguno era del cambio: estaban desde antes. */
.hero-pr{color:rgba(226,236,250,.72)}   /* la tira de pruebas: 4,10 */
.bcd-tag{color:rgba(255,255,255,.58)}   /* el pie de las tarjetas: 4,08 */
/* Los dos botones azules daban 4,43 con tinta casi negra y 3,54 con blanca: el
   azul de marca esta en mitad de la escala y no gana por ningun lado. Sube un
   escalon y con tinta negra se va a 5,8. */
.hb.blue,.get{background:#4C82FF;color:#00070F}
""".replace('@@', SECS) + '\n' + FIN


# ── 7 · el logo del pie ──────────────────────────────────────────────────────
# La marca gigante del pie es una TERCERA copia del logotipo, con su SVG propio
# metido a mano en el marcado, y se quedo en el semidisco: el arco «A336 336».
# O sea que la pagina termina ensenando dos logos distintos. `marca.py` cambio
# el del encabezado y `marca_paginas.py` los de whitepaper y explorador; a este
# no llegaba nadie porque no comparte ni el id ni la forma.
#
# Pasa a usar el simbolo bueno, el que ya esta en la propia pagina, con la
# opacidad de marca de agua que tenia. Un sitio menos donde se pueda volver a
# descolgar.
VIEJO = ('<path fill="url(#fmg)" d="M336 0 H464 V224 H672 V336 H560 V560 H464 '
         'V672 H336 A336 336 0 0 1 336 0 Z"/>\n'
         '      <rect fill="url(#fmg)" x="464" y="112" width="112" height="112"/>\n'
         '      <rect fill="url(#fmg)" x="560" y="336" width="112" height="112"/>')
NUEVO = '<use href="#nlogo" opacity="var(--fmg-a,.30)"/>'


def aplicar(html):
    """Idempotente."""
    if VIEJO in html:
        html = html.replace(VIEJO, NUEVO, 1)
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
