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

import contorno

MARCA = '/* ══ la mitad clara, decidida ══'
FIN = '/* ══ fin: papel ══ */'


# ── 1 · el suelo ─────────────────────────────────────────────────────────────
def _curvas(semilla, W, H, paso, niveles, bultos, sesgo=0.0):
    """Las lineas de nivel del campo, ya encadenadas y listas para <path>."""
    f = contorno.campo(semilla, bultos, W, H, sesgo)
    m = [f(x * 20, y * 20) for x in range(W // 20 + 1) for y in range(H // 20 + 1)]
    hi = max(m)
    salida = []
    # Los niveles arrancan por encima de CERO, no del minimo: con la ventana de
    # borde el minimo es cero en todo el contorno del papel, y un nivel ahi
    # dibujaria el marco.
    for k in range(1, niveles + 1):
        n = hi * (0.10 + 0.86 * k / (niveles + 1.0))
        for pts in contorno.cadenas(contorno.marchar(f, W, H, paso, n)):
            crudo = pts
            pts = contorno.adelgaza(pts, 2.4)
            if len(pts) < 5:
                continue
            d = 'M' + ' L'.join('%d %d' % (round(x), round(y)) for x, y in pts)
            # cerrada o abierta: solo las cerradas se pueden RELLENAR. Una
            # abierta -la que se sale del lienzo- rellenada da un manchon con
            # un canto recto en el borde, que fue lo primero que salio.
            cerrada = (abs(crudo[0][0] - crudo[-1][0]) < 2.0
                       and abs(crudo[0][1] - crudo[-1][1]) < 2.0)
            salida.append((k / float(niveles), d, cerrada))
    return salida


def placas(semilla=31):
    """El suelo de la mitad clara: un relieve, no un campo de bloques.

       Lo que habia antes eran ciento veinte rectangulos de 40 px alineados a
       una rejilla de 40. Da igual con cuanto mimo se iluminen: rectangulos en
       filas, a la misma altura y con el mismo alto, es papel pautado. Se
       intento salvarlo dos veces -subiendo la opacidad, poniendoles sombra y
       canto- y las dos veces siguio leyendose como un cuaderno, porque el
       problema no era el acabado sino la FORMA.

       Esto no tiene ni un rectangulo. Es un campo escalar suave cortado a
       catorce alturas: curvas de nivel. Cerradas, anidadas, ninguna igual a
       otra y ninguna alineada con nada. Una superficie con cotas se lee como
       una superficie —eso es lo que le faltaba—, y ademas dice de que va la
       casa: es el dibujo de un plano, no una decoracion.

       Cada curva va GRABADA: una linea clara un pixel arriba y la oscura
       encima. Es el truco del bajorrelieve y es lo que hace que la linea se
       hunda en el papel en vez de estar pintada sobre el.

       Y se apaga hacia arriba a la izquierda con una mascara, que es donde va
       el titular en las siete secciones. El hueco limpio no se compone a ojo:
       se recorta."""
    W, H = 1600, 1000
    curvas = _curvas(semilla, W, H, 9, 26, 28)
    # PRIMERO LOS RELLENOS, despues las lineas. Con lineas solas lo que hay es
    # un degradado con rayas encima: se ve el dibujo pero no el volumen. Lo que
    # da volumen en un plano de cotas es que cada escalon entre dos curvas
    # tenga su tono. Apiladas, las cerradas van construyendo el relieve.
    trazos = []
    for prof, d, cerrada in curvas:
        if not cerrada:
            continue
        trazos.append('<path d="%sZ" fill="rgb(96,126,184)" opacity="%.4f"/>'
                      % (d, 0.030 + 0.016 * prof))
    for prof, d, cerrada in curvas:
        # las cotas altas -el centro de cada loma- van mas marcadas: es lo que
        # da el orden de lectura, igual que en un plano de verdad
        op = 0.20 + 0.34 * prof
        trazos.append('<path d="%s" stroke="rgb(255,255,255)" stroke-width="1.1" '
                      'fill="none" opacity="%.3f" transform="translate(0,-1.2)"/>'
                      % (d, op * 0.85))
        trazos.append('<path d="%s" stroke="rgb(86,116,172)" stroke-width="1" '
                      'fill="none" opacity="%.3f"/>' % (d, op))

    def rg(nid, col, op):
        return ('<radialGradient id="' + nid + '">'
                '<stop offset="0" stop-color="' + col + '" stop-opacity="' + op + '"/>'
                '<stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>')
    # La mascara: el relieve se desvanece hacia el rincon del titular.
    mascara = ('<linearGradient id="mk" x1="0" y1="0" x2="1" y2="1">'
               '<stop offset="0" stop-color="#000"/>'
               '<stop offset=".22" stop-color="#5c5c5c"/>'
               '<stop offset=".58" stop-color="#e4e4e4"/>'
               '<stop offset="1" stop-color="#fff"/></linearGradient>'
               '<mask id="mrel"><rect x="0" y="0" width="%d" height="%d" fill="url(#mk)"/></mask>'
               % (W, H))
    # Y la luz rasante, que es la que da direccion. Un foco redondo ilumina un
    # punto; una rasante dice de donde viene la luz.
    rasante = ('<linearGradient id="rasa" x1="0" y1="0" x2="1" y2="1">'
               '<stop offset="0" stop-color="rgb(255,255,255)" stop-opacity=".58"/>'
               '<stop offset=".34" stop-color="rgb(255,255,255)" stop-opacity=".18"/>'
               '<stop offset=".64" stop-color="rgb(255,255,255)" stop-opacity="0"/>'
               '<stop offset="1" stop-color="rgb(26,44,88)" stop-opacity=".10"/>'
               '</linearGradient>')
    defs = ('<defs>' + mascara + rasante
                     + rg('l1', 'rgb(255,255,255)', '.24')
                     + rg('l2', 'rgb(47,107,255)', '.11')
                     + rg('l3', 'rgb(120,150,215)', '.13') + '</defs>')
    luces = ('<rect x="0" y="0" width="%d" height="%d" fill="url(#rasa)"/>'
             '<ellipse cx="200" cy="90" rx="600" ry="320" fill="url(#l1)"/>'
             '<circle cx="1480" cy="900" r="560" fill="url(#l2)"/>'
             '<circle cx="1560" cy="120" r="420" fill="url(#l3)"/>' % (W, H))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
            'preserveAspectRatio="xMidYMid slice">%s'
            '<g mask="url(#mrel)">%s</g>%s</svg>'
            % (W, H, defs, ''.join(trazos), luces))


def placas_alto(semilla=47):
    """El mismo relieve, compuesto para una pantalla VERTICAL.

       No es un ajuste de tamano: la composicion depende de la FORMA del hueco.
       Arriba el rincon limpio es la esquina del titular; en vertical el
       titular ocupa todo el ancho, asi que lo que hay que dejar despejado es
       la FRANJA DE ARRIBA, y la mascara va de arriba abajo en vez de en
       diagonal. Y la caja es del ancho del telefono y se repite hacia abajo,
       para que las cotas conserven su escala en vez de agrandarse ocho veces.
    """
    W, H = 420, 1200
    curvas = _curvas(semilla, W, H, 5, 22, 24, sesgo=0.42)
    trazos = []
    for prof, d, cerrada in curvas:
        if not cerrada:
            continue
        trazos.append('<path d="%sZ" fill="rgb(96,126,184)" opacity="%.4f"/>'
                      % (d, 0.030 + 0.016 * prof))
    for prof, d, cerrada in curvas:
        op = 0.20 + 0.34 * prof
        trazos.append('<path d="%s" stroke="rgb(255,255,255)" stroke-width="1.1" '
                      'fill="none" opacity="%.3f" transform="translate(0,-1.2)"/>'
                      % (d, op * 0.85))
        trazos.append('<path d="%s" stroke="rgb(70,102,162)" stroke-width="1" '
                      'fill="none" opacity="%.3f"/>' % (d, op))

    def rg(nid, col, op):
        return ('<radialGradient id="' + nid + '">'
                '<stop offset="0" stop-color="' + col + '" stop-opacity="' + op + '"/>'
                '<stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>')
    mascara = ('<linearGradient id="mkv" x1="0" y1="0" x2="0" y2="1">'
               '<stop offset="0" stop-color="#000"/>'
               '<stop offset=".14" stop-color="#151515"/>'
               '<stop offset=".34" stop-color="#5e5e5e"/>'
               '<stop offset=".64" stop-color="#e2e2e2"/>'
               '<stop offset="1" stop-color="#fff"/></linearGradient>'
               '<mask id="mrelv"><rect x="0" y="0" width="%d" height="%d" fill="url(#mkv)"/></mask>'
               % (W, H))
    rasante = ('<linearGradient id="mrasa" x1="0" y1="0" x2=".7" y2="1">'
               '<stop offset="0" stop-color="rgb(255,255,255)" stop-opacity=".50"/>'
               '<stop offset=".38" stop-color="rgb(255,255,255)" stop-opacity=".16"/>'
               '<stop offset=".68" stop-color="rgb(255,255,255)" stop-opacity="0"/>'
               '<stop offset="1" stop-color="rgb(26,44,88)" stop-opacity=".085"/>'
               '</linearGradient>')
    defs = ('<defs>' + mascara + rasante
                     + rg('m1', 'rgb(255,255,255)', '.26')
                     + rg('m2', 'rgb(47,107,255)', '.09') + '</defs>')
    luces = ('<rect x="0" y="0" width="%d" height="%d" fill="url(#mrasa)"/>'
             '<ellipse cx="210" cy="110" rx="400" ry="280" fill="url(#m1)"/>'
             '<circle cx="400" cy="1140" r="300" fill="url(#m2)"/>' % (W, H))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">%s'
            '<g mask="url(#mrelv)">%s</g>%s</svg>'
            % (W, H, defs, ''.join(trazos), luces))


def escribir(raiz):
    escritas = []
    for nombre, dibujo in (('papel.svg', placas()), ('papel-alto.svg', placas_alto())):
        ruta = os.path.join(raiz, 'img', nombre)
        try:
            if open(ruta, encoding='utf-8').read() == dibujo:
                escritas.append(ruta)
                continue
        except OSError:
            pass
        open(ruta, 'w', encoding='utf-8').write(dibujo)
        escritas.append(ruta)
    return escritas


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
  /* Tres sombras por tarjeta era acumular. Una, y se acabo. */
  --p-relieve:0 14px 34px -24px rgba(20,42,92,.40);
  --p-relieve2:0 26px 58px -30px rgba(20,42,92,.46);
}

/* ── 1 · el suelo ──
   Papel frio, no blanco. El blanco puro no existe en nada impreso ni en
   ningun sitio que se vea caro: es justo lo que hace que algo parezca una
   plantilla a medio terminar. Encima van las placas —el campo de bloques,
   quieto— y el grano que ya habia. */
.paper,.press,.secure{background-color:var(--p-papel)}
.paper2,.tkp{background-color:var(--p-papel2)}
.sale,.join{background-color:var(--p-alto)}
@@{background-image:var(--grano),url(img/papel.webp);
   background-repeat:repeat,no-repeat;background-size:auto,cover;
   background-position:0 0,center}
/* En el TELEFONO nada de lo de arriba vale, y esto es el fallo que me costo
   tres rondas de «lo veo igual»: yo miraba capturas de 1440 y el sitio se ve
   en un movil. Con «cover» sobre una seccion de 390x1900 el navegador agranda
   el dibujo casi ocho veces y recorta el centro; las placas dejan de ser
   placas y se quedan en dos manchas azules del tamano de la pantalla. Todo el
   trabajo de fondo, invisible, y en algun tramo peor que invisible.

   El modulo anterior YA tenia resuelto esto y yo lo pise sin darme cuenta: su
   regla vivia dentro de una media query y la mia, que va despues en la hoja,
   le gana igual —las media queries no suman especificidad—.

   Aqui va el dibujo VERTICAL, del ancho de la pantalla y repitiendose hacia
   abajo, asi que las placas conservan su tamano de verdad. */
@media(max-width:760px){
  @@{background-image:var(--grano),url(img/papel-alto.webp);
     background-size:auto,100% auto;
     background-repeat:repeat,repeat-y;
     background-position:0 0,left top}
}

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
   var(--grano),url(img/papel.webp)}
@media(max-width:760px){
  @@.tkp{background-image:
     linear-gradient(rgba(247,250,253,.72),rgba(247,250,253,.72)),
     var(--grano),url(img/papel-alto.webp);
     background-size:auto,auto,100% auto;
     background-repeat:repeat,repeat,repeat-y}
}

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
/* Los ordinales del canto de las tarjetas: fuera. Estaban a 1,56:1 —o sea,
   invisibles— y mi primera reaccion fue subirlos a que se leyeran. Con eso
   sumaban tres marcas mas por pantalla para decir lo que ya dice el orden de
   las tarjetas: nada. Un numero que no se ve sobra; uno que se ve y no aporta,
   tambien. El de las filas SI se queda: ahi la lista esta numerada de verdad. */
@@ .sec-n{display:none}
@@ .rn{color:#5B657A}
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
