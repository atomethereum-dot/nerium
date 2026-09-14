# -*- coding: utf-8 -*-
"""La ruta: las tres fases de adopcion, debajo de la seccion de proyectos.

Tres fases, un rail a la izquierda que se llena segun baja el scroll, y el
mismo suelo que «#builds» —el mismo negro y el mismo resplandor— para que las
dos secciones se lean como un solo campo.

Sobre el texto, que es lo que importa: NO se inventa nada. Las tres fases y su
objetivo estan escritos en el whitepaper desde hace tiempo, en la tabla «Fases
de adopcion» / «Adoption phases», y se traen letra por letra —ingles del
whitepaper en ingles, castellano del whitepaper en castellano—. Un roadmap es
un compromiso con quien pone dinero; no es sitio para que yo redacte.

Por lo mismo no lleva fechas. La referencia que me pasaron las lleva
—«Q4 2024 - Q4 2025»— y aqui hay un hueco preparado para ellas, pero vacio de
fechas y con el estado real en su lugar: la fase 1 dice «In progress», que es
lo que la propia pagina ya afirma dos secciones mas arriba («Testnet · 75 % to
mainnet»), y las otras dos dicen «Planned». Poner trimestres que nadie me ha
dado seria inventarme un calendario.

Tampoco entra en el menu. La cabecera tiene diez entradas y una bateria lo
comprueba; esto es un capitulo de «lo que estamos construyendo», no una
estacion nueva. Por eso no lleva numero de estacion ni «via».

El rail, que era el encargo:

  · una linea base tenue de nodo a nodo;
  · encima, el avance, que crece de 0 a 1 con el scroll y lleva un degradado
    y un halo suave —eso es lo que la referencia no tiene—;
  · tres nodos, uno por fase, que se encienden cuando su fase cruza la linea
    de activacion, con un anillo que late una sola vez;
  · y la flecha del final, como en la referencia.

Los extremos del rail no se ponen a ojo: el guion mide el centro del primer
nodo y el del ultimo y los escribe en dos variables. Puesto a ojo se descuadra
en cuanto un titular pasa a dos renglones, que es justo lo que pasa en movil.

`montar_home.py` lo aplica en el paso 29.
"""
import math
import random

MARCA = '/* ══ la ruta ══'
FIN = '/* ══ fin: ruta ══ */'
MARCA_JS = '<script>\n/* ══ la ruta ══'

# Las tres fases, tal cual las dice el whitepaper. La columna «objetivo» es
# suya; aqui solo se le pone tipografia.
FASES = [
    ('Validation', 'In progress',
     'One asset class issued entirely on Nereum and transferred between '
     'qualified holders with no human intervention in the settlement path.'),
    ('Utility', 'Planned',
     'Tokenized assets accepted as collateral. An asset reaches genuine '
     'liquidity when credit is available against it.'),
    ('Integration', 'Planned',
     'The infrastructure ceases to be a decision factor for the issuer, in '
     'the same way interbank payment rails are not one today.'),
]

# El rotulo es el NOMBRE DEL CAPITULO, como en el resto de la web: «01
# Network», «08 Token», «06 Security». Cuatro de once son un sustantivo pelado,
# asi que «Roadmap» ahi no desentona: es exactamente el molde, y es donde el
# lector busca saber en que seccion esta.
#
# El titular es la frase, que es lo que hacen todas las demas: «Two pieces,
# both already running.», «One price now. One price at listing.», «Three things
# you can check before you send a dollar.» Todas abren con un numero y cierran
# en punto seco. La de esta seccion ya estaba escrita, pero vivia de entradilla
# gris debajo de un titular de una sola palabra, que no es el patron de la casa
# ni de lejos.
#
# Con eso la entradilla sobra: en las secciones que llevan este molde —02, 08,
# 09— no hay tercera linea, se pasa del titular al contenido.
NUMERO = '10'
ROTULO = 'Roadmap'
TITULO = 'Three phases, and what each one has to prove.'



# ── la hebra de luz del margen ───────────────────────────────────────────────
# En la referencia la banda de la izquierda no es una linea sobre negro: es una
# hebra luminosa que se trenza consigo misma, tipo ADN, con chispas repartidas
# por ella. La nuestra era plana, que es justo lo que se dijo.
#
# Las curvas se generan aqui, no se pegan a mano: cinco senos de frecuencia y
# fase distintas sobre un lienzo estrecho y muy alto, con la amplitud apretada
# arriba y abajo lo justo para que no se corten en seco.
_ADN_W, _ADN_H = 96, 3400
# Cada hebra con su centro y su fase. Las tuve todas naciendo del mismo punto
# y salia un HUSO: las cinco se juntaban arriba y abajo y se abombaban en
# medio. En la referencia corren parejas y se cruzan por el camino, cada una
# entrando y saliendo del cuadro por su lado.
#
# EL PERIODO VA EN ANCHOS DE HEBRA, no en vueltas por seccion.
#
# Antes iba en vueltas —de 0,7 a 3,1 en toda la altura, la mas lenta sin
# llegar a dar UNA curva en 1.200 px—, y eso no es una trenza, son cinco
# arañazos casi verticales. Pero el fallo de fondo era otro: el lienzo se
# estira sin respetar proporciones —«preserveAspectRatio:none»— y la seccion
# no mide igual de alta en cada pantalla, asi que el mismo dibujo salia a
# proporcion 21 en escritorio y 35 en movil. Apretando las vueltas mejoraba,
# pero el telefono seguia con la trenza vez y media mas estirada que el
# ordenador, y eso no se arregla eligiendo mejor un numero.
#
# Asi que el lienzo deja de deformarse: el JS le pone al «viewBox» la altura
# que le toca por su propia proporcion, y una unidad de dibujo mide lo mismo
# a lo ancho que a lo alto en CUALQUIER pantalla. Diciendo el periodo en
# anchos de hebra —3,2 anchos— la trenza sale identica en las dos; en la
# pantalla mas alta simplemente se ve un tramo mas largo de la misma hebra,
# que es lo que hace una hebra de verdad.
#
# El dibujo se genera largo —3.400 unidades, de sobra para la proporcion mas
# alta que se da— y el «viewBox» recorta. Como el periodo es constante,
# recortar por abajo no se nota.
_U = _ADN_W            # una unidad de periodo = un ancho de hebra
_HEBRAS = [
    # centro, amplitud, periodo (en anchos), fase, grosor, opacidad
    (47,  8, 3.2, 0.0, 1.00, .78),
    (49, 11, 4.6, 1.9, 0.88, .62),
    (48,  6, 2.5, 3.4, 0.80, .46),
    (49, 13, 5.8, 0.7, 0.80, .52),
    (48,  7, 3.9, 5.1, 0.74, .34),
]
# El peso mas bajo sube de .64 a .74. Al estrechar la hebra todo encoge con
# ella, y a 320 px la quinta se quedaba en 0,29 px de trazo: por debajo de un
# tercio de pixel el navegador ya no dibuja una linea, dibuja una niebla.
# Las amplitudes bajaron de 9-20 a 6-13. Con las de antes la trenza se abria
# cuarenta unidades de noventa y seis —casi la mitad del lienzo— y a tamaño
# real eso es una mata ancha, no una hebra. Ceñida se lee como un cable.
# El quinto numero es un PESO RELATIVO, no un grosor. El grosor de verdad lo
# pone el CSS en proporcion al ancho de la hebra, con
# «vector-effect:non-scaling-stroke» para que la escala del lienzo no lo toque.
#
# Han hecho falta los dos arreglos. En unidades de lienzo, con el «viewBox» a
# medida, en movil una unidad son 0,25 px y un trazo de 0,9 se quedaba en 0,2:
# invisible. Clavandolo en pixeles pasaba lo contrario: 1,1 px de trazo y 1,6
# de resplandor sobre una hebra de 24 px de ancho pesan cuatro veces mas que
# sobre una de 56, y las cinco se fundian en una barra gris. Proporcional a
# «--adn» las dos pantallas enseñan el MISMO dibujo, que es de lo que iba
# todo esto.


def _x(cx, amp, per, fase, y):
    return cx + amp * math.sin(math.tau * y / (per * _U) + fase)


def _camino(cx, amp, per, fase, pasos=460):
    pts = []
    for k in range(pasos + 1):
        y = round(k / pasos * _ADN_H, 1)
        # Sin estrechamiento: la hebra corre entera de arriba abajo. Lo que se
        # difumina en las puntas es la PINTURA, con una mascara, no la
        # geometria: apretando la geometria las cinco convergian y el conjunto
        # se leia como un huso en vez de como una trenza.
        pts.append((round(_x(cx, amp, per, fase, y), 1), y))
    d = 'M%s %s' % pts[0]
    for i in range(1, len(pts)):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        cy = round((y0 + y1) / 2, 1)
        d += ' C%s %s %s %s %s %s' % (x0, cy, x1, cy, x1, y1)
    return d


def _chispas(n=64):
    # Van SOBRE las hebras, no al azar: es lo que hace que se lea como una
    # hebra de luz y no como polvo. Semilla fija para que el dibujo no cambie
    # entre montajes.
    #
    # Se reparten por las 3.400 unidades enteras y el JS las coloca segun lo
    # que el «viewBox» acabe enseñando, asi que se ven unas veinte en cualquier
    # pantalla. La «y» va en unidades de dibujo, no en tanto por ciento: el
    # tanto por ciento dependia de una altura que ahora cambia con el ancho.
    r = random.Random(20260913)
    out = []
    for _ in range(n):
        cx, amp, per, fase, _g, _o = r.choice(_HEBRAS)
        y = r.uniform(0, _ADN_H)
        out.append((round(_x(cx, amp, per, fase, y) / _ADN_W * 100, 2), round(y, 1),
                    r.choice([1.4, 1.8, 2.2, 2.8, 3.4]),
                    round(r.uniform(.35, .95), 2), round(r.uniform(0, 7), 1)))
    return out


def _adn():
    # Los caminos se declaran UNA vez en <defs> y se usan dos: la trenza
    # apagada y, encima, la misma trenza encendida recortada al tramo que ya
    # has recorrido. Con <use> el dibujo no se repite en el archivo, que son
    # cinco caminos de casi mil curvas cada uno.
    defs = ''.join(
        '<path id="nr-adn-%d" d="%s"/>' % (i, _camino(cx, amp, per, fase))
        for i, (cx, amp, per, fase, _g, _o) in enumerate(_HEBRAS))
    usos = lambda clase: ''.join(
        '<use class="%s" href="#nr-adn-%d" vector-effect="non-scaling-stroke"'
        ' style="--w:%s;--o:%s;--d:%ss"/>' % (clase, i, gr, op, round(i * 1.7, 1))
        for i, (_cx, _a, _p, _f, gr, op) in enumerate(_HEBRAS))
    chispas = ''.join(
        '<i data-y="%s" style="left:%s%%;--s:%spx;--o:%s;--d:%ss"></i>'
        % (c[1], c[0], c[2], c[3], c[4]) for c in _chispas())
    lienzo = lambda dentro: ('<svg viewBox="0 0 %d %d" preserveAspectRatio="none">%s</svg>'
                             % (_ADN_W, _ADN_H, dentro))
    # Las chispas van en su propia caja para que les llegue la MISMA mascara
    # que al trazo. Sueltas no se apagaban con el —tienen su propia opacidad—
    # y quedaban puntos brillando solos contra el canto de la seccion.
    #
    # El punto y el galon viven AQUI DENTRO, no en la lista: son parte de la
    # hebra, no una barra puesta encima de ella.
    return ('<i class="ruta-adn" aria-hidden="true">'
            '<svg width="0" height="0" style="position:absolute">'
            '<defs>%s</defs></svg>'
            '%s<i class="ruta-viva">%s</i>'
            '<i class="ruta-chispas">%s</i>'
            '<i class="ruta-punto"></i>'
            '<i class="ruta-flecha"><svg viewBox="0 0 24 24">'
            '<path d="M6 9.5 12 16l6-6.5"/></svg></i>'
            '</i>' % (defs, lienzo(usos('ruta-h0')), lienzo(usos('ruta-h1')), chispas))


# ── la marca de fondo ────────────────────────────────────────────────────────
# El logo, grande, girando despacio detras del roadmap. Es el MISMO archivo que
# el favicon —la misma geometria y los mismos degradados—, no un dibujo nuevo
# que se le parezca: si algun dia cambia el logo, cambia aqui.
#
# Tres cajas, no una: los «transform» no se suman entre animaciones distintas,
# asi que una pasea, otra gira y el SVG solo se estira. En una sola caja la
# segunda animacion pisaria a la primera.
# ── el titular entra en el grupo de la casa ──────────────────────────────────
# En vez de repetir aqui el interletraje y el interlineado, se añade «.ruta-h»
# a las reglas que ya los definen para todas las demas secciones. Asi hay UNA
# fuente de verdad: el dia que se afine el titular de la web, este va detras
# solo, que es justo lo que no pasaba.
GRUPO = [
    ('.press-h,.builds-h,.tkp-h,.sale-h,.sec-h,.join-h,.tm-h{\n  letter-spacing:-.052em;line-height:.97}',
     '.press-h,.builds-h,.tkp-h,.sale-h,.sec-h,.join-h,.tm-h,.ruta-h{\n  letter-spacing:-.052em;line-height:.97}'),
    ('.press-h,.builds-h,.tkp-h,.sale-h,.sec-h,.join-h,.tm-h{\n    letter-spacing:-.042em;line-height:1.02}',
     '.press-h,.builds-h,.tkp-h,.sale-h,.sec-h,.join-h,.tm-h,.ruta-h{\n    letter-spacing:-.042em;line-height:1.02}'),
]


# ── la marca de fondo ────────────────────────────────────────────────────────
# EL BISEL SE DIBUJA, NO SE APILA.
#
# La primera version hacia el canto apilando copias de la cara cada vez un poco
# mas grandes. Funcionaba como dibujo y era insostenible como pagina: medido,
# 591 ms por fotograma con la marca puesta y 28 ms sin ella. Menos de dos
# imagenes por segundo. Setenta y dos laminas opacas de 1120 px son noventa
# millones de pixeles repintados por cuadro, y encima colgaban de un elemento
# con mascara y opacidad, que obliga a componer el subarbol entero aparte.
#
# No era un problema de afinar el numero de laminas: salia a unos 8 ms POR
# LAMINA, asi que ni con seis se llegaba a tiempo. Tambien explicaba que
# empezaran a fallar las comprobaciones del rail — con cuadros de medio segundo
# una transicion de 0,8 s no termina cuando se la mide.
#
# Asi que el canto pasa a ser geometria: cuatro trapecios entre el contorno
# exterior y la cara, cada uno con su tono segun de donde venga la luz. Un solo
# elemento, un solo repintado, y el bisel sale liso por construccion: no hay
# peldaños que esconder porque no hay escalones.
_O0, _O1 = 6.0, 506.0          # contorno exterior de la pieza
_B = 34.0                      # ancho del bisel
_I0, _I1 = _O0 + _B, _O1 - _B  # la cara, dentro del bisel
_BANDA = .8005                 # donde empieza la franja blanca, en tanto por uno


def _bisel(arriba, derecha, abajo, izquierda):
    """Los cuatro trapecios del canto, con la luz viniendo de arriba a la
    izquierda: la cara de arriba es la que mas recibe y la de abajo la que
    menos. Sin esa diferencia el bisel es un marco y no un canto."""
    car = lambda pts: ' '.join('%s %s' % q for q in pts)
    caras = [
        (arriba,    [(_O0, _O0), (_O1, _O0), (_I1, _I0), (_I0, _I0)]),
        (derecha,   [(_O1, _O0), (_O1, _O1), (_I1, _I1), (_I1, _I0)]),
        (abajo,     [(_O1, _O1), (_O0, _O1), (_I0, _I1), (_I1, _I1)]),
        (izquierda, [(_O0, _O1), (_O0, _O0), (_I0, _I0), (_I0, _I1)]),
    ]
    return ''.join('<path fill="%s" d="M%s Z"/>' % (c, car(p)) for c, p in caras)


def _cara(sufijo, luz):
    """La cara de la pieza: el degradado de plata, el reflejo y la franja."""
    by = _I0 + (_I1 - _I0) * _BANDA
    return (
        '<defs>'
        '<linearGradient id="nr-plata%s" gradientUnits="userSpaceOnUse"'
        ' x1="%s" y1="%s" x2="%s" y2="%s">'
        '<stop offset="0" stop-color="#EDF0F7"/>'
        '<stop offset=".52" stop-color="#A9AEBB"/>'
        '<stop offset="1" stop-color="#4E525C"/></linearGradient>'
        '<linearGradient id="nr-brillo%s" gradientUnits="userSpaceOnUse"'
        ' x1="%s" y1="%s" x2="%s" y2="%s">'
        '<stop offset="0" stop-color="#fff" stop-opacity="0"/>'
        '<stop offset=".42" stop-color="#fff" stop-opacity="%s"/>'
        '<stop offset=".55" stop-color="#fff" stop-opacity="%s"/>'
        '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        '</defs>'
        '<rect x="%s" y="%s" width="%s" height="%s" fill="url(#nr-plata%s)"/>'
        '<rect x="%s" y="%s" width="%s" height="%s" fill="url(#nr-brillo%s)"/>'
        '<rect x="%s" y="%s" width="%s" height="%s" fill="#FCFCFC"/>'
        % (sufijo, _I0, _I0, _I1, _I1,
           sufijo, _I0, _I0, _I1, _I1, luz, round(luz * .28, 3),
           _I0, _I0, _I1 - _I0, _I1 - _I0, sufijo,
           _I0, _I0, _I1 - _I0, _I1 - _I0, sufijo,
           _I0, by, _I1 - _I0, _I1 - by))


def _marca():
    # Dos piezas y nada mas: la cara de delante y la de atras. La de atras es el
    # mismo dibujo con el bisel invertido —la luz le llega por el otro lado— y
    # espejado, que es lo que se ve del reverso de una plancha. Sin ella, pasada
    # la media vuelta lo que miraba a camara era un rectangulo liso.
    delante = ('<svg viewBox="0 0 512 512">%s%s</svg>'
               % (_bisel('#E4E8F1', '#5D616B', '#34373E', '#C2C7D3'),
                  _cara('', .5)))
    detras = ('<svg viewBox="0 0 512 512">%s%s</svg>'
              % (_bisel('#8E93A0', '#2C2F35', '#1B1D22', '#6B6F7A'),
                 _cara('-b', .22)))
    # Y LOS CUATRO LADOS. Sin ellos la pieza esta HUECA: son dos planchas
    # separadas en Z y por el canto se ve a traves, que es exactamente el hueco
    # que se veia por los lados. El bisel de las caras es plano —vive en el
    # plano de cada cara— y no rellena el volumen; esto si.
    #
    # Cada lado lleva su propio tono: los de arriba y la izquierda reciben la
    # luz, los de abajo y la derecha quedan en sombra, igual que el bisel.
    lados = ''.join(
        '<i class="ruta-marca-l %s"></i>' % c
        for c in ('l-ar', 'l-ab', 'l-iz', 'l-de'))
    return (
        '<i class="ruta-marca" aria-hidden="true">'
        '<i class="ruta-marca-v"><i class="ruta-marca-x"><i class="ruta-marca-g">'
        '%s'
        '<i class="ruta-marca-b">%s</i>'
        '<i class="ruta-marca-f">%s<i class="ruta-marca-luz"></i></i>'
        '</i></i></i></i>' % (lados, detras, delante))



def _marcado():
    fases = []
    for i, (titulo, estado, objetivo) in enumerate(FASES):
        fases.append(
            '      <li class="ruta-f" data-i="%d">\n'
            '        <div class="ruta-cab">'
            '<span class="ruta-n">%02d&#8201;/&#8201;%02d</span>'
            '<span class="ruta-est">%s</span></div>\n'
            '        <h3 class="ruta-t">%s</h3>\n'
            '        <p class="ruta-p">%s</p>\n'
            '      </li>' % (i, i + 1, len(FASES), estado, titulo, objetivo))
    return (
        '\n\n<section class="ruta" id="ruta" data-bg="#000000" data-acc="#79ABFF">\n'
        '  %s\n'
        '  %s\n'
        '  <div class="wrap ruta-wrap">\n'
        '    <div class="k sk rv ruta-top">'
        '<i class="sk-n">%s</i>%s</div>\n'
        '    <h2 class="ruta-h">%s</h2>\n'
        '    <ol class="ruta-lista" id="rutaLista">\n'
        '%s\n'
        '    </ol>\n'
        '  </div>\n'
        '</section>\n\n'
    ) % (_marca(), _adn(), NUMERO, ROTULO, TITULO, '\n'.join(fases))


CSS = """
/* ══ la ruta ══════════════════════════════════════════════════════════════
   Las tres fases de adopcion, debajo de «lo que estamos construyendo» y con
   su mismo suelo, para que las dos se lean como un solo campo y no como dos
   secciones pegadas.

   El negro va escrito AQUI, no solo en el paso 30. Este modulo reescribe su
   propia seccion cada vez que se aplica, asi que si se quedaba con el azul de
   antes, volver a aplicarlo deshacia el paso 30 y la ruta salia marina otra
   vez. Lo cazo su bateria comparando el suelo con el de proyectos. */
.ruta{position:relative;overflow:hidden;background:#000;
  padding:clamp(122px,13.6vw,216px) 0 clamp(72px,8.6vw,132px);
  /* El CARRIL: la franja de la izquierda donde viven el rail y la hebra. Todo
     el texto de la seccion empieza a su derecha.

     Antes no existia: el titular y el rail compartian eje, asi que media hebra
     caia justo debajo de las primeras letras. En la referencia el texto esta
     lejos de la barra, y esa distancia es lo que hace que la hebra se lea. */
  /* Cuanto se despega del canto el rail. NO puede bajar de la mitad de
     «--adn»: la hebra va centrada sobre el, asi que por debajo de eso se
     corta contra el borde de la pantalla. A 1280 la mitad son 36 px. */
  --borde:clamp(26px,3.4vw,56px);
  --carril:clamp(56px,8.5vw,140px);
  --eje:calc(var(--carril) * .5);
  --adn:clamp(24px,3.2vw,52px)}
/* El mismo resplandor de «.builds», en el mismo sitio: cada seccion lo tiene
   en su propia esquina, asi que repetirlo es lo que las hace parecer una. */
.ruta::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(1100px 520px at 16% -12%,rgba(47,107,255,.16),transparent 62%)}
.ruta>*{position:relative;z-index:1}

/* ── la hebra de luz, PEGADA a la barra ──
   Primero la puse ancha y a la izquierda del rail, y estaba mal por partida
   doble: en la referencia las hebras van PEGADAS a la barra —se abren unos
   veinte pixeles a cada lado, no media pantalla— y van encendidas, no palidas.

   El elemento cuelga de la SECCION, no del contenedor de texto, porque la
   seccion es la que llega al canto de la pantalla, y se centra sobre «--borde»
   para quedar encima del rail.

   Un intento anterior dejo «--borde» en 11-22 px y la hebra, que mide hasta
   96, se salia 18 px por la izquierda: en pantalla no se veia una hebra sino
   media, cortada a cuchillo contra el canto, con el rail corriendo por su
   flanco en vez de por dentro. «--borde» manda sobre lo pegado que va todo,
   pero tiene un suelo: la mitad de la hebra. */
/* EL AIRE ENTRE LAS DOS SECCIONES.
   Medido de tinta a tinta —el ultimo renglon de una al primero de la otra— el
   hueco era de 223 px. No es poco comparado con los pares de dentro de un
   mismo capitulo (214 entre tesis y kin, 233 entre preventa y token), pero
   estas dos son capitulos distintos, y los saltos de capitulo de esta pagina
   van entre 690 y 820. Por eso se leian pegadas aunque el numero pareciera
   normal: el listón que le corresponde no era ese.

   Sube a unos 400 px de tinta a tinta, repartido entre el pie de una y la
   cabeza de la otra para que ninguna cargue sola con el hueco. */
.builds{padding-bottom:clamp(118px,13vw,208px)}
/* ── la marca de fondo ──
   El logo, grande, girando despacio por detras de todo.

   CUANTA LUZ PUEDE DAR. No es gusto, es una cuenta. El parrafo de una fase
   todavia no alcanzada va en rgba(226,236,250,.6): sobre un fondo de
   luminancia L su contraste es (0,2713 + 0,05)/(L + 0,05), y para no bajar de
   4,5:1 —lo que pide un cuerpo de 14 px— L no puede pasar de 0,0214. Lo mas
   claro que llega a poner la marca, medido en pantalla, es un gris de 32 sobre
   255: 0,0145, que deja el parrafo en casi 5:1.

   Se mide de verdad en «probar_ruta», leyendo el pixel de la pantalla, no
   confiando en esta cuenta.

   Las tres cajas: una pasea, otra gira, el SVG se estira. Los «transform» no
   se suman entre animaciones, asi que en una sola caja la segunda pisaria a
   la primera. Solo se anima «transform», que es lo que la tarjeta grafica
   compone sola sin volver a pintar nada. */
.ruta-marca{position:absolute;inset:0;z-index:0;overflow:hidden;
  /* La perspectiva corta —900 en vez de 1500— es lo que abre la pieza al girar
     y enseña el canto; con 1500 el giro salia casi ortografico y el grosor no
     se leia. Pero acorta y ademas AGRANDA: la primera prueba con 900 dejo la
     pieza tan cerca que se comia el encuadre y se perdia la silueta. Se
     compensa echandola hacia atras en Z y bajandole el lado. */
  pointer-events:none;perspective:1050px;perspective-origin:50% 40%;
  opacity:.32;
  /* DOS MASCARAS, y se cruzan:
       · la redonda apaga los cantos, que un logo cortado a escuadra por el
         borde de la seccion se lee como un error y no como un fondo. Va ancha
         y se apaga tarde: apretada, recortaba la pieza en cuñas y lo que se
         veia no era un solido girando sino poligonos sueltos;
       · la horizontal lo baja donde vive el TEXTO —la mitad izquierda— y lo
         deja entero donde no hay nada que leer.
     Asi el logo se ve de verdad sin comerse las letras: donde importa llega
     al 32% de una cosa y donde no, al 6%. Un solo numero para toda la caja
     obligaba a elegir entre que no se viera o que estorbase. */
  -webkit-mask-image:radial-gradient(145% 125% at 50% 50%,#000 58%,transparent 100%),
                     linear-gradient(to right,rgba(0,0,0,.2) 0 46%,#000 82%);
          mask-image:radial-gradient(145% 125% at 50% 50%,#000 58%,transparent 100%),
                     linear-gradient(to right,rgba(0,0,0,.2) 0 46%,#000 82%);
  -webkit-mask-composite:source-in;
          mask-composite:intersect}
.ruta-marca-v,.ruta-marca-g{position:absolute;inset:0;display:block;
  transform-style:preserve-3d;will-change:transform}
.ruta-marca-v{animation:marcaPasea 47s ease-in-out infinite}
/* Echada hacia atras: asi la perspectiva corta le da profundidad sin
   acercarla tanto como para salirse del encuadre. */
.ruta-marca-g{animation:marcaGira 26s linear infinite;
  transform:translateZ(-260px)}

/* ── la pieza ──
   «--lado» es el tamaño del logo y «--gr» el grosor del canto: un 4,5% del
   lado, que es la proporcion de una pieza solida y no la de una chapa. */
/* Mas grande y MUCHO mas gruesa: el grosor pasa del 5,5% al 22% del lado. A
   0,22 de opacidad un canto fino se funde con la cara y la pieza se lee
   plana; lo que hace el 3D no es que gire, es que se vea el lateral. */
.ruta-marca{--lado:min(90vw,1020px);--gr:calc(var(--lado) * .22)}
.ruta-marca-x{position:absolute;inset:0;display:block;
  transform-style:preserve-3d;animation:marcaCabecea 29s ease-in-out infinite}
.ruta-marca-f,.ruta-marca-b{position:absolute;left:50%;top:50%;
  width:var(--lado);height:var(--lado);
  margin:calc(var(--lado) / -2) 0 0 calc(var(--lado) / -2);
  transform-style:preserve-3d;
  /* Cada cara se deja de pintar cuando da la espalda. En un solido la de
     atras la tapa la de delante de todas formas, asi que pintarlas las dos
     siempre es trabajo tirado: son 1.120 px de lado y cada superficie grande
     costaba unos trece milisegundos por cuadro. Con esto solo se pinta la que
     de verdad se ve. */
  backface-visibility:hidden;-webkit-backface-visibility:hidden}
/* EL CANTO. Dieciocho laminas hacia atras en Z, cada una mas oscura. Vistas
   de frente no se ven —quedan justo detras de la cara—, pero en cuanto la
   pieza cabecea aparecen de lado y forman un lateral macizo con su sombreado.
   Es lo que separa una pieza de un papel: un papel girado sigue sin tener
   canto, y por mucho que se mueva se lee plano. */
/* El canto ya no es una pila de capas: son cuatro trapecios dentro del propio
   SVG. Aqui solo queda separar las dos caras en Z, que es lo que le da cuerpo
   al girar. */
/* La caja, centrada: la cara de delante media pieza hacia fuera y la de atras
   media hacia dentro. Asi los cuatro lados caen donde tienen que caer. */
.ruta-marca-f{transform:translateZ(calc(var(--gr) / 2))}

/* LOS CUATRO LADOS. Lo que rellena el volumen. Cada uno es una tira de
   «--gr» de fondo girada a su sitio; juntos cierran la pieza y se acaba el
   hueco que se veia por los cantos.

   Tambien llevan «backface-visibility»: de los cuatro, a cualquier angulo solo
   hay dos mirando a camara, asi que pintar los otros dos es trabajo tirado. */
.ruta-marca-l{position:absolute;left:50%;top:50%;display:block;
  backface-visibility:hidden;-webkit-backface-visibility:hidden}
.l-ar,.l-ab{width:var(--lado);height:var(--gr);
  margin:calc(var(--gr) / -2) 0 0 calc(var(--lado) / -2)}
.l-iz,.l-de{width:var(--gr);height:var(--lado);
  margin:calc(var(--lado) / -2) 0 0 calc(var(--gr) / -2)}
.l-ar{transform:rotateX(90deg) translateZ(calc(var(--lado) / 2));
  background:linear-gradient(to bottom,#C8CCD8,#6A6E79 62%,#3A3D45)}
.l-ab{transform:rotateX(-90deg) translateZ(calc(var(--lado) / 2));
  background:linear-gradient(to top,#2B2E35,#4A4D55 58%,#22242A)}
.l-iz{transform:rotateY(-90deg) translateZ(calc(var(--lado) / 2));
  background:linear-gradient(to right,#B6BAC6,#63666F 66%,#34373E)}
.l-de{transform:rotateY(90deg) translateZ(calc(var(--lado) / 2));
  background:linear-gradient(to left,#34373E,#4E515A 54%,#24272D)}
/* La trasera, al fondo del canto y espejada. Sin ella, pasada la media vuelta
   lo que miraba a camara era la ultima lamina: un rectangulo gris sin forma. */
.ruta-marca-b{transform:translateZ(calc(var(--gr) / -2)) rotateY(180deg)}
.ruta-marca svg{position:absolute;inset:0;width:100%;height:100%;display:block}
/* El reflejo que recorre la cara. Va aparte del SVG y con su propio tiempo:
   pegado al dibujo giraria con el y un reflejo que gira con la pieza no es un
   reflejo, es una mancha pintada encima. */
/* El reflejo es una BANDA, no un lienzo entero: antes cubria toda la cara y
   pintaba 1.120 px de lado para enseñar una franja de trescientos. Ahora mide
   lo que se ve y recorre la cara moviendose. */
.ruta-marca-luz{position:absolute;top:-10%;bottom:-10%;left:0;width:34%;
  display:block;pointer-events:none;
  background:linear-gradient(104deg,transparent 6%,rgba(255,255,255,.5) 44%,
    rgba(255,255,255,.06) 62%,transparent 94%);
  animation:marcaLuz 17s ease-in-out infinite}
@keyframes marcaLuz{
    0%{transform:translateX(-20%)}
   50%{transform:translateX(214%)}
  100%{transform:translateX(-20%)}}
/* El giro: el logo va de canto —como la referencia, en rombo— y cabecea en
   los tres ejes. El «rotateZ» no vuelve a 45 por el camino corto si lo dejo
   suelto, asi que los fotogramas lo llevan a mano. */
/* LA VUELTA ENTERA SOBRE SU EJE, que es lo unico que dice «esto es un solido»
   sin lugar a dudas: cada media vuelta la pieza pasa DE CANTO, la silueta se
   estrecha hasta ser una barra y se ve el grosor de lado a lado. Ninguna
   cantidad de balanceo hace eso.

   Antes daba tumbos en tres ejes a la vez y era peor de lo que suena: a poca
   opacidad y recortada por la mascara, un solido que voltea sin eje fijo no se
   lee como un solido, se lee como poligonos sueltos moviendose. El eje
   estable es lo que deja seguir la pieza con la vista.

   El cabeceo en X se queda en un vaiven corto —lo justo para que no parezca un
   letrero de tienda— y va en un tiempo distinto del giro, asi que la
   combinacion tarda minutos en repetirse. */
@keyframes marcaGira{
    0%{transform:translateZ(-260px) rotateZ(38deg) rotateY(0deg)}
  100%{transform:translateZ(-260px) rotateZ(38deg) rotateY(360deg)}}
@keyframes marcaCabecea{
    0%{transform:rotateX(-17deg)}
   50%{transform:rotateX(15deg)}
  100%{transform:rotateX(-17deg)}}
/* El paseo: recorre la seccion sin llegar a salirse del todo. */
@keyframes marcaPasea{
    0%{transform:translate3d(-9%,-6%,0) scale(1)}
   33%{transform:translate3d(8%,5%,0)   scale(1.06)}
   66%{transform:translate3d(6%,-7%,0)  scale(.96)}
  100%{transform:translate3d(-9%,-6%,0) scale(1)}}
@media(prefers-reduced-motion:reduce){
  .ruta-marca-v,.ruta-marca-g,.ruta-marca-x{animation:none}}

.ruta-wrap{position:relative}
/* LA CABECERA, AL MISMO BORDE QUE LAS DEMAS SECCIONES.
   El rotulo y el titular llevaban la sangria del carril, asi que arrancaban
   entre 56 y 140 px mas a la derecha que los de «09 What we are building» o
   «02 In the press». Con todas las secciones alineadas en un solo borde, esta
   se salia de la columna y se veia.

   Pasan por encima de la hebra —no por detras— y eso es a proposito: un
   titular de 76 px en blanco sobre una hebra tenue se lee sin problema, y es
   lo que permite alinearlo sin mover la hebra de donde tiene que estar.

   La LISTA de fases si conserva el carril: ahi el texto es de 14 a 17 px y
   apagado, y sobre la hebra no se leeria. Son dos niveles a proposito —la
   cabecera a lo ancho de la seccion, las fases en su propia columna—, no un
   descuadre. */
.ruta-f{padding-left:var(--carril)}
.ruta-wrap>.ruta-top,.ruta-wrap>.ruta-h,.ruta-wrap>.ruta-lista{position:relative;z-index:1}
.ruta-adn{position:absolute;top:0;bottom:0;z-index:0;pointer-events:none;
  width:var(--adn);left:var(--borde);margin-left:calc(var(--adn) / -2);
  overflow:visible}
/* El campo azul: mas ancho que las hebras, pero CONTENIDO. La primera vez lo
   puse a 390 px y con el doble de fuerza, y lavaba de azul media seccion: el
   resplandor tiene que acompañar a la hebra, no sustituirla. */
/* Se desborda 4% por arriba y por abajo, y la seccion recorta: eran treinta
   pixeles de resplandor con el canto cortado a escuadra, que es parte de lo
   que se veia «cortado» en movil. Se apaga con la misma mascara que el
   trazo, asi ninguna pieza termina en seco. */
.ruta-adn::before{content:"";position:absolute;inset:-4% -55% -4% -115%;
  -webkit-mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 88%,transparent);
          mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 88%,transparent);
  background:
    radial-gradient(40% 38% at 66% 30%,rgba(56,120,255,.19),transparent 72%),
    radial-gradient(32% 30% at 60% 78%,rgba(70,140,255,.13),transparent 76%),
    linear-gradient(to right,transparent,rgba(40,96,230,.11) 62%,transparent)}
/* Las puntas se apagan con mascara, que es lo que toca: apretando la
   geometria las cinco hebras convergian en un punto. */
.ruta-adn svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;
  -webkit-mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 93%,transparent);
          mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 93%,transparent)}
/* Todo en proporcion al ancho de la hebra, a traves de «--k»: cuantas veces
   cabe en ella el ancho al que se dibujo, 56 px. Lo escribe el JS ya resuelto
   y SIN unidades.

   Aqui NO se puede escribir «calc(var(--adn) / 56 ...)», y es la tercera vez
   que lo aprendo en esta seccion: una propiedad personalizada llega sin
   resolver, asi que ahi dentro «--adn» es la cadena «clamp(30px,4.4vw,74px)»
   y la cuenta sale px por px —px al cuadrado—, que es invalido. La primera
   vez dejo el rail clavado en un respaldo; la segunda apago este mismo
   resplandor sin avisar; la tercera mando el tamaño de las 64 chispas a
   «auto» y las pinto encima de todo: la trenza desaparecia bajo una barra
   blanca y parecia un problema de diseño. Multiplicar por un numero suelto
   no tiene ese modo de fallo. */
/* LA HEBRA EMPIEZA DONDE EMPIEZAN LAS FASES.
   Antes subia hasta arriba del todo, y al alinear la cabecera con el resto de
   las secciones el titular quedaba encima de ella. Medido: el rotulo, de 11 px,
   caia a 1,54:1 contra un fondo que la hebra ponia en 0,134 de luminancia, y
   el titular blanco cruzaba una hebra casi blanca. Alinear no puede costar que
   no se lea.

   Y tiene sentido por si solo: la hebra ES el recorrido de las fases, asi que
   su sitio es el de la lista y no el de la cabecera. El JS le pasa en «--m0»
   donde cae la primera fase; el 24% es el respaldo hasta que mide. */
.ruta-adn{--k:1;--m0:24%;--m1:30%}
.ruta-adn use{fill:none;stroke-linecap:round;
  stroke-width:calc(var(--k) * var(--w) * 1px)}
.ruta-h0{stroke:#BBD9FF;opacity:var(--o);
  filter:drop-shadow(0 0 calc(var(--k) * 1.6px) rgba(130,185,255,.72))}

/* ── el recorrido ──
   No hay barra. La barra ES la hebra: la misma trenza, encendida, recortada
   al tramo que ya llevas. Antes era una linea recta blanca por encima del
   dibujo y se leian como dos cosas que no se conocian —una trenza curva y un
   palo recto—, que es justo lo que no puede ser.

   Se recorta con «clip-path:inset» y no con una mascara porque el corte se
   anima: baja con el mismo tiempo y la misma curva que el punto, asi que la
   luz y el punto viajan juntos. */
.ruta-viva{position:absolute;inset:0;display:block;pointer-events:none;
  clip-path:inset(var(--v0,100%) 0 var(--v1,0%) 0);
  transition:clip-path .8s cubic-bezier(.16,.84,.26,1)}
.ruta-h1{stroke:#EAF2FF;opacity:calc(var(--o) * .55 + .45);
  filter:drop-shadow(0 0 calc(var(--k) * 3px) rgba(190,220,255,.85))}
/* Las chispas: redondas de verdad. Van fuera del SVG porque el lienzo se
   estira en vertical —«preserveAspectRatio:none»— y ahi un circulo saldria
   ovalado. */
/* La misma mascara que el trazo, para que las chispas se apaguen con el. */
.ruta-chispas{position:absolute;inset:0;display:block;pointer-events:none;
  -webkit-mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 93%,transparent);
          mask-image:linear-gradient(to bottom,transparent var(--m0),#000 var(--m1),#000 93%,transparent)}
/* «.ruta-chispas i», NO «.ruta-adn i». La caja que envuelve a las chispas es
   tambien un <i> dentro de «.ruta-adn», asi que «.ruta-adn i» la pintaba a
   ella: un rectangulo de 41 px relleno de #E4EFFF solido, de arriba abajo,
   tapando la trenza entera. La barra blanca que se veia era esto. */
.ruta-chispas i{position:absolute;
  --sp:calc(var(--s) * var(--k));
  width:var(--sp);height:var(--sp);margin:calc(var(--sp) / -2);
  border-radius:50%;background:#E4EFFF;opacity:var(--o);
  box-shadow:0 0 calc(var(--sp) * 1.4) rgba(160,205,255,.8)}

/* La luz respira. Cada hebra con su retraso, que si laten a la vez es un
   semaforo y no una hebra. */
@keyframes adnHebra{0%,100%{opacity:calc(var(--o) * .62)}50%{opacity:var(--o)}}
@keyframes adnChispa{0%,100%{opacity:calc(var(--o) * .35);transform:scale(.72)}
  50%{opacity:var(--o);transform:none}}
.ruta-adn use{animation:adnHebra 11s ease-in-out var(--d) infinite}
.ruta-chispas i{animation:adnChispa 5.5s ease-in-out var(--d) infinite}

@media(prefers-reduced-motion:reduce){
  .ruta-adn use,.ruta-chispas i,.ruta-marca-luz{animation:none}
}

/* ── el rotulo de arriba ──
   Como en la referencia: el nombre a un lado y la seccion al otro, en la
   misma linea. No lleva numero de estacion: esto no entra en el menu. */
/* Solo la sangria: lo demas —tipo, tamaño, el numerito— lo pone «.k.sk», el
   mismo rotulo que llevan las otras nueve secciones. */
.ruta-top{margin:0}
/* El titular, con el MISMO tratamiento que los de las demas secciones. Se
   habia escrito por su cuenta —56 px y peso 400 frente a los 76 y 300 de la
   casa, con menos interletraje negativo y mas interlineado—, y al lado del de
   «what we are building» se notaba: mas pequeño y mas gordo, como si fuera de
   otra pagina.

   El tamaño sale de «--fs-h2», que es la variable que usan todos, y el
   interletraje y el interlineado se los da la regla comun a la que esta
   seccion se añade mas abajo. Aqui solo queda lo que es suyo: el margen. */
.ruta-h{margin:clamp(18px,2.4vw,30px) 0 clamp(48px,5.8vw,88px);
  font-weight:300;font-size:var(--fs-h2);color:#fff;max-width:22ch}

/* ── el rail ──
   Este es el de la referencia, pieza por pieza: un punto LLENO arriba, un
   hueco, una linea BLANCA que baja desde debajo del punto, y un galon fino al
   final. Ni aros, ni tres puntos, ni la linea azul — eso era invencion mia y
   no era lo que se pidio.

   Lo que le pone la pagina es el movimiento: el punto baja de fase en fase
   segun baja el scroll y la linea lo sigue, asi que en cualquier instante el
   dibujo es el mismo de la referencia y ademas dice por donde vas.

   El sitio del punto y los extremos del rail no se ponen a ojo: el guion mide
   el renglon del contador de cada fase. A ojo se descuadra en cuanto un
   titular pasa a dos renglones, que en movil pasa siempre. */
.ruta-lista{list-style:none;margin:0;padding:0;position:relative}
/* El punto: lleno, sin aro y SIN HALO, como en la referencia. Le puse uno
   para que no se perdiera entre las hebras y la bateria me paro: el acuerdo
   era que fuera identica, no que a mi me pareciera que se veia poco.

   Va SOBRE la hebra, en su «x» y en su «y»: el guion le pregunta al camino
   donde pasa a esa altura, asi que el punto cabalga la curva en vez de
   flotar en un eje recto al lado. Las dos coordenadas se animan igual. */
.ruta-punto{position:absolute;left:var(--px,50%);top:var(--py,0);
  width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border-radius:50%;
  background:#3E86FF;
  transition:top .8s cubic-bezier(.16,.84,.26,1),
             left .8s cubic-bezier(.16,.84,.26,1)}
/* El galon cierra la hebra, tambien sobre la curva. */
.ruta-flecha{position:absolute;left:var(--fx,50%);top:var(--fy,100%);
  width:15px;height:15px;margin:-2px 0 0 -7.5px;display:grid;place-items:center;
  color:rgba(255,255,255,.9)}
.ruta-flecha svg{width:15px;height:15px;fill:none;stroke:currentColor;
  stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}

.ruta-f{position:relative;padding-block:0 clamp(46px,5.6vw,96px)}
.ruta-f:last-of-type{padding-bottom:0}
/* ── el filete que separa una fase de la siguiente ──
   Tres bloques de texto seguidos, con 33 px entre ellos en el telefono, se
   leian como un muro. El filete los separa y de paso le da a la seccion un
   ritmo que antes no tenia.

   Arranca en la COLUMNA del texto, no en el borde: si cruzara el carril
   partiria el rail en tres, y el rail es una linea continua a proposito. Y se
   desvanece hacia la derecha, que una raya de lado a lado en un sitio donde no
   hay nada a la derecha se lee como un subrayado suelto. */
.ruta-f + .ruta-f{padding-top:clamp(46px,5.6vw,96px)}
.ruta-f + .ruta-f::before{content:"";position:absolute;top:0;
  left:var(--carril);right:0;height:1px;pointer-events:none;
  background:linear-gradient(to right,
    rgba(160,200,255,.42) 0 14%,rgba(160,200,255,.16) 52%,transparent 94%)}
/* Y un tope en el arranque: un tramo corto en azul de marca, mas grueso que
   el filete. El filete solo se quedaba en un susurro; el tope le da un
   principio claro y hace que se lea como una division y no como una sombra. */
.ruta-f + .ruta-f::after{content:"";position:absolute;top:-1px;
  left:var(--carril);width:clamp(26px,3.4vw,46px);height:3px;
  pointer-events:none;background:#3E86FF}

.ruta-cab{display:flex;align-items:baseline;gap:clamp(10px,1.6vw,18px);
  font-family:var(--m);font-size:clamp(9.5px,1vw,11px);letter-spacing:.2em;
  text-transform:uppercase}
.ruta-n{color:rgba(160,190,240,.68);font-variant-numeric:tabular-nums}
.ruta-est{color:rgba(160,190,240,.68);
  transition:color .45s var(--ease,ease)}
.ruta-f.on .ruta-est{color:#79ABFF}
.ruta-t{margin:clamp(8px,1.2vw,16px) 0 0;font-weight:400;
  font-size:clamp(24px,3.6vw,46px);letter-spacing:-.035em;line-height:1.04;
  /* .56 y no .5: con el logo detras el fondo deja de ser negro puro, y a .5
     el titulo apagado se quedaba justo en el filo. Sigue siendo mas apagado
     que el encendido, que es lo que tiene que decir. */
  color:rgba(255,255,255,.56);transition:color .55s var(--ease,ease)}
.ruta-f.on .ruta-t{color:#fff}
.ruta-p{margin:clamp(10px,1.4vw,18px) 0 0;max-width:56ch;
  font-size:clamp(14px,1.35vw,17px);line-height:1.55;
  /* .58 y no .5. A .5 sobre negro PURO este parrafo ya daba 4,59:1 contra un
     minimo de 4,5: iba al filo antes de que hubiera nada detras. Con el logo
     de fondo hay que darle margen, y de paso deja de depender de que el negro
     sea exactamente negro. */
  color:rgba(226,236,250,.6);transition:color .55s var(--ease,ease)}
.ruta-f.on .ruta-p{color:rgba(226,236,250,.76)}


@media(max-width:760px){
  /* En el telefono el texto ocupa todo el ancho, asi que no hay mitad libre
     donde subir la marca: se baja entera. */
  .ruta-marca{opacity:.16;
    -webkit-mask-image:radial-gradient(130% 92% at 50% 48%,#000 30%,transparent 94%);
            mask-image:radial-gradient(130% 92% at 50% 48%,#000 30%,transparent 94%);
    -webkit-mask-composite:source-over;
            mask-composite:add}
  /* En el telefono solo cambia el ANCHO de la hebra. El trazo, el resplandor
     y las chispas ya bajan solos con «--k», que es proporcional a ese ancho;
     antes se corregian aparte aqui y acababan discutiendo con la regla de
     arriba. A menos de 34 px no cabe una trenza de cinco: por fino que se
     dibuje, las cinco caen dentro de diez pixeles y se leen como una barra. */
  .ruta{--carril:clamp(58px,17vw,78px);--adn:clamp(28px,7.6vw,34px)}
  .ruta-adn{opacity:.76}
  .ruta-h{max-width:none}
  .ruta-p{max-width:none}
}
/* Sin movimiento el rail sigue puesto —el dibujo es el mismo— y lo unico que
   se quita es el viaje del punto: salta en vez de deslizarse. */
@media(prefers-reduced-motion:reduce){
  .ruta-punto,.ruta-viva,.ruta-t,.ruta-p,.ruta-est{transition:none}
}
""" + '\n' + FIN

JS = """<script>
/* ══ la ruta ══ Lo aplica herramientas/ruta.py ═════════════════════════════ */
(function(){
  var lista = document.getElementById('rutaLista');
  if(!lista) return;
  var seccion = document.getElementById('ruta');
  var fases = [].slice.call(lista.querySelectorAll('.ruta-f'));
  if(!fases.length) return;

  /* EL LIENZO NO SE DEFORMA.
     El SVG va con «preserveAspectRatio:none», asi que estira el dibujo a la
     caja: como la seccion no mide igual de alta en cada pantalla, la misma
     trenza salia a proporcion 21 en escritorio y 35 en movil —vez y media
     mas estirada en el telefono—. Dandole al «viewBox» la altura que le toca
     por su propia proporcion, una unidad mide lo mismo a lo ancho que a lo
     alto y la trenza sale identica en todas; la pantalla mas alta solo
     enseña un tramo mas largo de la misma hebra.

     Las chispas se colocan aqui por lo mismo: su sitio es una «y» en unidades
     de dibujo, y a que tanto por ciento de la caja cae depende de cuanto
     acabe enseñando el «viewBox». */
  var hebra = seccion && seccion.querySelector('.ruta-adn');
  var lienzos = hebra ? [].slice.call(hebra.querySelectorAll('svg:not([width])')) : [];
  var chispas = hebra ? [].slice.call(hebra.querySelectorAll('.ruta-chispas i')) : [];
  var espina = hebra && hebra.querySelector('#nr-adn-0');
  var punto = hebra && hebra.querySelector('.ruta-punto');
  var galon = hebra && hebra.querySelector('.ruta-flecha');
  var ALTO_MAX = 3400, altoVB = 0, caja = null;
  function lienzoAlPunto(){
    if(!lienzos.length) return;
    var h = hebra.getBoundingClientRect();
    if(!h.width || !h.height) return;
    caja = h;
    var alto = Math.min(ALTO_MAX, Math.round(96 * h.height / h.width));
    if(alto === altoVB) return;
    altoVB = alto;
    for(var j = 0; j < lienzos.length; j++)
      lienzos[j].setAttribute('viewBox', '0 0 96 ' + alto);
    /* El mismo sitio para las dos cosas: aqui ya esta medida la caja. 56 es el
       ancho al que se dibujo la trenza; «--k» dice cuantas veces cabe. */
    hebra.style.setProperty('--k', (h.width / 56).toFixed(3));
    for(var i = 0; i < chispas.length; i++){
      var y = +chispas[i].getAttribute('data-y');
      chispas[i].style.top = (y / alto * 100).toFixed(2) + '%';
    }
  }

  /* POR DONDE PASA LA HEBRA A ESA ALTURA.
     El punto ya no se pone en un eje recto: se le pregunta al camino. La «y»
     crece siempre a lo largo de el, asi que una busqueda binaria sobre
     «getPointAtLength» da el sitio exacto en veinte pasos.

     Esto es lo que hace que sean UNA cosa. Antes el recorrido era una linea
     recta blanca por encima del dibujo, y se leian como dos: una trenza que
     curva y un palo que no. Ahora el punto cabalga la curva y lo que baja
     encendido es la propia hebra. */
  function curvaX(f){
    if(!espina) return null;
    var u = f * altoVB;
    var L = espina.getTotalLength(), lo = 0, hi = L, p = null;
    for(var i = 0; i < 20; i++){
      var m = (lo + hi) / 2; p = espina.getPointAtLength(m);
      if(p.y < u) lo = m; else hi = m;
    }
    return p ? p.x / 96 * 100 : null;
  }

  /* ── donde va cada cosa ──
     El renglon del contador de cada fase: ahi se para el punto. Medido, no a
     ojo: a ojo se descuadra en cuanto un titular pasa a dos renglones, que en
     movil pasa siempre. */
  var ys = [];
  function medir(){
    lienzoAlPunto();
    if(!caja) return;
    /* Todo contra la caja de la HEBRA, que es donde viven ahora el punto y la
       luz. Antes se media contra la lista, que va centrada con el texto y no
       tiene nada que ver con el margen. */
    /* En FRACCION de la caja, no en pixeles.
       La seccion lleva un «scale» que va con el scroll, asi que su caja mide
       distinto de un cuadro a otro. Guardando pixeles, «ys» quedaba de una
       medida y «caja.height» de la siguiente, y la luz se pasaba del punto un
       cuatro por ciento —cincuenta pixeles— sin que nada estuviera mal a
       primera vista. En fraccion las dos cosas sobreviven al cambio de
       escala, porque el scale afecta arriba y abajo por igual. */
    ys = fases.map(function(f){
      var c = f.querySelector('.ruta-cab').getBoundingClientRect();
      return ((c.top - caja.top) + c.height / 2) / caja.height;
    });
    /* La luz llega hasta pasado el texto de la ULTIMA fase, no hasta su
       contador: parada ahi, el ultimo tramo salia de treinta pixeles y el
       recorrido de la referencia es largo. */
    var fin = fases[fases.length - 1].querySelector('.ruta-p').getBoundingClientRect();
    fondo = Math.min(1, ((fin.bottom - caja.top) + 30) / caja.height);
    if(galon){
      var xf = curvaX(fondo);
      if(xf !== null) galon.style.setProperty('--fx', xf.toFixed(2) + '%');
      galon.style.setProperty('--fy', (fondo * 100).toFixed(2) + '%');
    }
    pon(activa);
  }
  var activa = 0, fondo = 0;
  function pon(i){
    activa = i;
    if(ys.length && caja && punto){
      var y = ys[i];
      /* El corte de arriba es fijo —donde empieza la fase 1— y el de abajo es
         el punto: la luz y el punto son el MISMO borde, asi que viajan juntos
         con la misma curva y el mismo tiempo. */
      /* Donde empieza la hebra: un poco antes de la primera fase, para que
         entre desvaneciendose y no de un corte. */
      hebra.style.setProperty('--m0', Math.max(0, ys[0] * 100 - 9).toFixed(2) + '%');
      hebra.style.setProperty('--m1', Math.max(2, ys[0] * 100 - 1).toFixed(2) + '%');
      hebra.style.setProperty('--v0', Math.max(0, ys[0] * 100).toFixed(2) + '%');
      hebra.style.setProperty('--v1', Math.max(0, (1 - y) * 100).toFixed(2) + '%');
      punto.style.setProperty('--py', (y * 100).toFixed(2) + '%');
      var x = curvaX(y);
      if(x !== null) punto.style.setProperty('--px', x.toFixed(2) + '%');
    }
    for(var k = 0; k < fases.length; k++) fases[k].classList.toggle('on', k <= i);
  }

  /* La linea de activacion: el 62 % de la pantalla. Mas arriba y la fase se
     enciende antes de que se lea; mas abajo, cuando ya pasaste. */
  var LINEA = 0.62;
  var pendiente = false;

  function paso(){
    pendiente = false;
    lienzoAlPunto();
    var h = innerHeight || document.documentElement.clientHeight;
    var y = h * LINEA;
    /* Aqui habia un atajo —«si la lista queda fuera de pantalla, no calcules»—
       y era un fallo: al volver a subir, la lista se quedaba a un pelo de ese
       margen, el guion se saltaba el calculo y el punto se quedaba clavado en
       la ultima fase con las tres encendidas. El bucle de abajo ya resuelve
       los dos extremos solo —ninguna por encima de la linea da la primera,
       todas por encima dan la ultima—, asi que el atajo no ahorraba nada y
       rompia el unico caso que no se ve al bajar: el de volver. */
    var i = 0;
    for(var k = 0; k < fases.length; k++){
      var c = fases[k].querySelector('.ruta-cab').getBoundingClientRect();
      if(c.top + c.height / 2 <= y) i = k;
    }
    if(i !== activa) pon(i);
  }
  function pedir(){ if(pendiente) return; pendiente = true; requestAnimationFrame(paso); }

  medir(); pedir();
  /* Se escucha el scroll TAMBIEN sin movimiento: quien lo tiene desactivado
     sigue bajando por la pagina y tiene que ver por que fase va. Lo que se
     apaga es el deslizamiento del punto —salta—, y eso lo hace el CSS. */
  addEventListener('scroll', pedir, {passive:true});
  addEventListener('resize', function(){ medir(); pedir(); });
  /* El alto cambia cuando entran las fuentes y cuando las secciones de arriba
     se despliegan: sin esto el rail se queda con la medida del primer cuadro. */
  if(window.ResizeObserver) new ResizeObserver(function(){ medir(); pedir(); }).observe(lista);
  addEventListener('load', function(){ medir(); pedir(); });
})();
</script>"""


# El rotulo de la esquina saca el nombre de un mapa; sin entrada, enseña el
# identificador en crudo —«ruta»—. Se añade la suya.
NOMBRE_VIEJO = "    join:'In the open'\n  };"
NOMBRE_NUEVO = "    join:'In the open', ruta:'Roadmap'\n  };"


def aplicar(html):
    """Idempotente."""
    if NOMBRE_NUEVO not in html:
        assert html.count(NOMBRE_VIEJO) == 1, 'no esta el mapa de nombres del rotulo'
        html = html.replace(NOMBRE_VIEJO, NOMBRE_NUEVO, 1)
    # ── el marcado, justo debajo de la seccion de proyectos ──
    ancla = '<section class="hpin" id="docs"'
    if '<section class="ruta" id="ruta"' in html:
        i = html.index('<section class="ruta" id="ruta"')
        i = html.rindex('\n\n', 0, i)
        j = html.index('</section>', i) + len('</section>')
        html = html[:i] + _marcado().rstrip('\n') + html[j:]
    else:
        assert html.count(ancla) == 1, 'no esta la seccion de documentacion'
        k = html.index(ancla)
        html = html[:k] + _marcado().lstrip('\n') + html[k:]

    # ── el titular, al grupo de titulares de la casa ──
    for viejo, nuevo in GRUPO:
        if nuevo in html:
            continue
        assert html.count(viejo) == 1, 'no esta la regla comun de titulares: ' + viejo[:40]
        html = html.replace(viejo, nuevo, 1)

    # ── el CSS ──
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        html = html[:i] + CSS.strip('\n') + html[j:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)

    # ── el guion ──
    if MARCA_JS in html:
        i = html.index(MARCA_JS)
        j = html.index('</script>', i) + len('</script>')
        html = html[:i] + JS.strip('\n') + html[j:]
    else:
        assert html.count('</body>') == 1
        html = html.replace('</body>', JS.strip('\n') + '\n</body>', 1)
    return html
