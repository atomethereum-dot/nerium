# -*- coding: utf-8 -*-
"""El branding pasa a negro y verde fosforescente.

La pagina estaba construida sobre un azul -#2F6BFF y su familia- repartido por
cuarenta y siete usos de variable y otro centenar escrito a mano. Cambiarlo a
ojo, color por color, es como se estropea un sistema de color: se pierde la
relacion entre los tonos y, sobre todo, se pierde el CONTRASTE, que en esta
pagina esta peleado a mano hasta el ultimo rotulo de once pixeles.

Asi que no se cambia a ojo: se ROTA EL TONO y se IGUALA LA LUMINANCIA. Cada
color azul se pasa a HSL, se le gira el tono a la banda del verde, y despues se
le busca la luz que hace que su luminancia RELATIVA coincida con la del azul
que sustituye. Con eso, todo lo que pasaba el minimo de contraste lo sigue
pasando: mismo ratio contra el mismo fondo.

Lo segundo no es un adorno del parrafo anterior, es el nucleo. La primera
version se limitaba a conservar la L de HSL y estaba MAL: la L de HSL no es la
luminancia percibida. En la formula de contraste el verde pesa 0,7152 y el azul
0,0722, diez veces mas, asi que un verde con la misma L que un azul es mucho
mas claro a efectos de lectura. El ordinal de seccion, que en azul daba de
sobra sobre el papel, paso a 1,2:1 —invisible—. Dieciocho textos por debajo del
minimo, y lo canto probar_contraste.

  la banda     tonos de 196 a 268 grados, que es el azul. Fuera de ahi no se
               toca nada: ni el rojo de Morningstar, ni el verde de
               MarketWatch, ni los ambar de los avisos.
  el neutro    y solo si la saturacion pasa de 0,12. Los casi-negros de la
               pagina -#0B0D12, #0A0C10- tienen un pelo de azul y son tinta,
               no marca: rotarlos no cambiaria nada visible y si cambiaria el
               sitio donde vive el gris.
  el destino   77 grados: lima acido. Muestreado de la referencia -RGB
               198,245,76- y no elegido a ojo. El primer intento fue a 152,
               verde primavera, y estaba mal: a esa altura del circulo el verde
               es de monte, no de pantalla. El fosforito de cripto vive entre el
               amarillo y el verde, no en el verde puro.
  el acento    y SUBE. Igualar la luminancia al azul que sustituye era lo
               correcto mientras media pagina era papel: alli el acento tiene
               que ser oscuro para leerse. Con la pagina en negro es al reves, y
               manteniendo la luminancia del azul el lima se quedaba en un oliva
               de 0,18 que sobre negro no es un acento, es una mancha. Los
               colores vivos se llevan a la altura de la referencia; los
               apagados y los oscuros no se tocan, que esos son estructura
               -sombras, fondos, filetes- y no marca.
  sin blanco   y no queda un solo neutro claro. Todo lo que pasa de 0,55 de
               luminancia sin llegar a 0,26 de saturacion recibe el tono de la
               marca con saturacion BAJA. Baja y no alta por una razon: un
               parrafo entero en lima saturado sobre negro vibra y no se lee. El
               lima vivo es para el acento; el texto lo lleva en la sangre, no
               en la cara. Al blanco puro se le deja bajar a 0,90 de luminancia:
               ningun lima llega a 1, y sin ese tope #FFFFFF se quedaba
               #FFFFFF.

Se gira la hoja de estilo, los «data-acc», los «data-bg», los colores de marca
del navegador Y LOS GUIONES. Lo ultimo costo verlo: las escenas de lienzo -el
campo de la portada, la rosca del reparto, las dos cortinas- llevan sus colores
escritos dentro del <script>, y ahi no llega un giro sobre <style>. La rosca se
quedo azul en una pagina ya verde. Los JSON no se tocan: ahi no hay color, hay
traducciones.

El marcado NO se gira, porque ahi viven los colores de marca AJENOS -el azul de
Benzinga, el verde de MarketWatch, el rojo de Morningstar, los logotipos de las
carteras-. La excepcion es la tarjeta de anuncio, que lleva el azul de LA CASA
escrito a mano igual que las otras tres llevan el suyo: esa si, por su valor
exacto.

`montar_home.py` lo aplica en el paso 38.
"""
import colorsys
import re

MARCA = '/* ══ neon ══'
CIERRE = '/* ══ fin: neon ══ */'
FIN = '/* ══ fin: neon ══ */'

TONO_MIN, TONO_MAX = 196.0, 268.0    # la banda del azul, en grados
DESTINO = 77.0 / 360.0               # lima acido, muestreado de la referencia
SAT_MIN = 0.12                       # por debajo es tinta, no marca


def _lum(r, g, b):
    """La luminancia relativa de WCAG, que es donde vive el contraste."""
    def c(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)


def _verde(r, g, b, realza=True):
    """El mismo color, girado al verde y con la MISMA luminancia.

    Con «realza=False» no se aplica el tiron de los acentos. Eso hace falta en
    las PALETAS: son seis tonos que juntos dan la profundidad del campo, y
    subirlos todos al mismo minimo dejaba tres identicos. Lo mismo que con las
    superficies en oscuro -se remapea conservando el orden, no se aplasta-.
    """
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    grados = h * 360.0
    if not (TONO_MIN <= grados <= TONO_MAX) or s < SAT_MIN:
        return None
    s2 = min(1.0, max(s * 1.22, 0.62 if s > 0.45 else s * 1.22))
    objetivo = _lum(r, g, b)
    if realza and s >= 0.40 and objetivo >= 0.06:
        objetivo = max(objetivo, 0.62)
    # Se busca la luz que iguala la luminancia. Binaria y no formula porque la
    # conversion HLS->RGB satura por arriba y por abajo y no es invertible a
    # pelo; cuarenta pasos dan mas precision que un byte de color.
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2.0
        rr, gg, bb = colorsys.hls_to_rgb(DESTINO, mid, s2)
        if _lum(rr * 255, gg * 255, bb * 255) < objetivo:
            lo = mid
        else:
            hi = mid
    r2, g2, b2 = colorsys.hls_to_rgb(DESTINO, (lo + hi) / 2.0, s2)
    return (round(r2 * 255), round(g2 * 255), round(b2 * 255))


BLANCO_LUM = 0.55      # de aqui para arriba es «claro»
BLANCO_SAT = 0.26      # de aqui para abajo es «neutro»
BLANCO_TINTE = 0.62    # la saturacion que se le deja: la de la tinta


def _verdea_neutro(r, g, b):
    """Un claro neutro deja de ser neutro: recibe el tono de la marca."""
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    if s > BLANCO_SAT or _lum(r, g, b) < BLANCO_LUM:
        return None
    # El tope es el de la tinta, no 0,90: a luminancia alta no cabe un verde
    # saturado -a 77 grados la lima llena tope en 0,62- y lo que salia era un
    # casi-blanco con un punto de verde que en pantalla se sigue leyendo BLANCO.
    # El encargo era que no hubiera blanco, asi que se le baja la luz hasta
    # donde el verde si entra. Sobre el suelo de noche eso son 11,4:1.
    objetivo = min(_lum(r, g, b), TINTA_TOPE)
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2.0
        rr, gg, bb = colorsys.hls_to_rgb(DESTINO, mid, BLANCO_TINTE)
        if _lum(rr * 255, gg * 255, bb * 255) < objetivo:
            lo = mid
        else:
            hi = mid
    r2, g2, b2 = colorsys.hls_to_rgb(DESTINO, (lo + hi) / 2.0, BLANCO_TINTE)
    return (round(r2 * 255), round(g2 * 255), round(b2 * 255))


def _alfa(viejo, nuevo, a, fondo):
    """El alfa que devuelve la MISMA luminancia compuesta, con la tinta nueva.

    La tinta clara baja de luz para poder ser verde, y las tintas apagadas -que
    se apoyan en el alfa para su nivel- bajan con ella. Se resuelve el alfa que
    recompone el nivel de antes sobre el suelo que de verdad hay detras.
    """
    def mez(c, al):
        return tuple(c[i] * al + fondo[i] * (1 - al) for i in range(3))

    meta = _lum(*mez(viejo, a))
    lo, hi = a, 1.0
    for _ in range(30):
        mid = (lo + hi) / 2.0
        if _lum(*mez(nuevo, mid)) < meta:
            lo = mid
        else:
            hi = mid
    return min(1.0, round((lo + hi) / 2.0, 3))


SUELO_MEZCLA = (20, 22, 18)   # el suelo tipico de la pagina de noche


def _hex(m):
    t = m.group(0)
    c = t[1:]
    if len(c) == 3:
        c = ''.join(x * 2 for x in c)
    r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
    v = _verde(r, g, b) or _verdea_neutro(r, g, b)
    if not v:
        return t
    return '#%02X%02X%02X' % v


def _rgba(m):
    n = [x.strip() for x in m.group(2).split(',')]
    if len(n) < 3:
        return m.group(0)
    try:
        r, g, b = (float(n[0]), float(n[1]), float(n[2]))
    except ValueError:
        return m.group(0)
    v = _verde(r, g, b) or _verdea_neutro(r, g, b)
    if not v:
        return m.group(0)
    resto = (',' + ','.join(n[3:])) if len(n) > 3 else ''
    if len(n) > 3 and _lum(r, g, b) >= 0.45:
        # solo a los claros apagados: son los que pierden nivel al bajar la
        # tinta. Sin esto quedaban tres textos entre 3,7:1 y 4,5:1.
        try:
            a = float(n[3])
        except ValueError:
            a = None
        if a is not None and 0 < a < 1:
            resto = ',' + ','.join([str(_alfa((r, g, b), v, a, SUELO_MEZCLA))] + n[4:])
    return '%s(%d,%d,%d%s)' % (m.group(1), v[0], v[1], v[2], resto)


_HEX = re.compile(r'#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b')
_RGBA = re.compile(r'\b(rgba?)\(([^)]*)\)')


def _girar(txt):
    return _RGBA.sub(_rgba, _HEX.sub(_hex, txt))


CSS = """
/* ══ neon ══════════════════════════════════════════════════════════════════
   El acento de la casa, ya en verde. Esto va DESPUES del giro de tono para
   rematar los dos sitios donde el verde pide algo que el azul no pedia. */
/* El verde vivo sobre negro brilla mas que el azul a la misma luz: el rotulo
   de seccion no necesita tanto cuerpo. */
.sk-n{text-shadow:0 0 18px rgba(0,229,138,.30)}
/* Y el foco de la portada, que era un azul de ambiente, pasa a verde sin
   subir de intensidad: un verde saturado a la intensidad del azul quema. */
:root{--neon:#00E58A;--neon-lite:#5CFFB8;--neon-d:#00A863}
/* ══ fin: neon ══ */
"""


CASA = ('#2F6BFF', '#12204A', '#05080F')

# Las bandas claras, y el suelo de noche que le toca a cada una. Dos suelos,
# igual que en claro, para que dos seguidas no sean una losa.
# El suelo de noche: el valor de «--suelo» en RAICES. Lo comparten el pie,
# «.team», «.hero-hold» y el escenario del fundido, que pintan con esa misma
# variable, y por eso tienen que ANUNCIAR lo mismo.
SUELO_NOCHE = '#07090A'

SUELO_A = ('network', 'thesis', 'solutions', 'security', 'presale', 'team')
SUELO_B = ('press', 'token', 'join')


_TRIO = re.compile(r'\[\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\]')
_VEC3 = re.compile(r'vec3\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)')


# Las marcas que NO son nuestras y por tanto no se giran: el color de cada
# medio en las tarjetas de prensa («--w1», «--w2», «--ac») y el de cada red en
# los botones de contacto («--jb»). Girar el azul de Telegram a lima no es
# rebranding, es pintar mal el logotipo de otro.
AJENAS = ('--w1:', '--jb:')


TINTA_SAT = 0.62       # la saturacion de la tinta clara
TINTA_TOPE = 0.62      # y su luminancia maxima


def _masverde(css):
    """La tinta clara, verde de verdad.

    El giro dejaba los claros en un casi-blanco con un punto de lima -#F2F5EC,
    saturacion 0,31- que sobre negro se sigue leyendo BLANCO, y el encargo era
    que no hubiera blanco. El problema no es la regla: es la fisica del color.
    A luminancia 0,88 no cabe un verde saturado -la lima llena tope en 0,62-,
    asi que para que la tinta sea verde hay que BAJARLE la luz.

    Se baja, y no cuesta nada de contraste: sobre el suelo de noche 0,58 de
    luminancia entra a 11,4:1, y sobre el panel mas claro de la pagina a 10,4:1.
    El minimo son 4,5.

    Se aplica solo al bloque de noche, que es donde vive la tinta generada; la
    transparencia se conserva, que es lo que sostiene la jerarquia.
    """
    def uno(m):
        cab, cuerpo = m.group(1), m.group(2)
        n = [x.strip() for x in cuerpo.split(',')]
        try:
            r, g, b = float(n[0]), float(n[1]), float(n[2])
        except (ValueError, IndexError):
            return m.group(0)
        h, l, sat = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
        if _lum(r, g, b) < 0.45 or sat > 0.40:
            return m.group(0)
        objetivo = min(_lum(r, g, b), TINTA_TOPE)
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2.0
            rr, gg, bb = colorsys.hls_to_rgb(DESTINO, mid, TINTA_SAT)
            if _lum(rr * 255, gg * 255, bb * 255) < objetivo:
                lo = mid
            else:
                hi = mid
        rr, gg, bb = colorsys.hls_to_rgb(DESTINO, (lo + hi) / 2.0, TINTA_SAT)
        rr, gg, bb = round(rr * 255), round(gg * 255), round(bb * 255)
        resto = (',' + ','.join(n[3:])) if len(n) > 3 else ''
        if len(n) > 3:
            # Y SE COMPENSA LA TRANSPARENCIA. La tinta baja de luz para poder
            # ser verde -a 77 grados y saturacion 0,62 el techo es 0,62-, asi
            # que las tintas apagadas, que se apoyan en el alfa para su nivel,
            # bajan con ella: nueve botones del widget y tres parrafos se
            # quedaban entre 4,1:1 y 4,3:1. Se resuelve el alfa que devuelve la
            # MISMA luminancia compuesta que tenia antes, sobre el panel mas
            # claro de la noche, que es el caso peor.
            try:
                a = float(n[3])
            except ValueError:
                a = None
            if a is not None and 0 < a < 1:
                resto = ',' + ','.join([str(_alfa((r, g, b), (rr, gg, bb), a,
                                                  (34, 35, 32)))] + n[4:])
        return '%scolor:%s(%d,%d,%d%s)' % (cab, 'rgba' if resto else 'rgb',
                                           rr, gg, bb, resto)

    return re.sub(r'([;{]|border-)color:rgba?\(([^)]*)\)', uno, css)


# El cubo de la marca, que es plata. Va aparte de todo lo demas por dos
# razones: sus colores viven en el SVG en linea -no en la hoja, no en un
# «style=»- y no son un color cualquiera, son el degradado que le da volumen.
# Girarlo con la maquina generica lo habria dejado en un verde apagado; aqui se
# elige el metal entero. En una pagina negra el cubo plata se leia como un
# cuadrado gris de relleno, que es lo primero que se ve arriba a la izquierda.
CUBO = (
    ('#C6CAD7', '#C8F24A'),   # cara, arriba
    ('#9498A1', '#7FAE00'),   # cara, abajo
    ('#57595E', '#2C3D06'),   # el canto en sombra
    ('#FCFCFC', '#EAFF9E'),   # la franja del pie
    ('"#fff"', '"#EAFF9E"'),  # el brillo especular
)


def _marca(html):
    """El cubo, en negro y lima. Solo dentro de su propio bloque de SVG."""
    a = html.index('<linearGradient id="nrmPlata"')
    b = html.index('</symbol>', html.index('<symbol id="nlogo-s"')) + len('</symbol>')
    trozo = html[a:b]
    for viejo, nuevo in CUBO:
        trozo = trozo.replace(viejo, nuevo)
    return html[:a] + trozo + html[b:]


def _enlinea(html):
    """Los colores escritos en «style=», que el girador de la hoja no ve.

    La rueda de reparto del token y su leyenda llevan los ocho colores puestos
    a mano en el marcado. Despues del giro seguian azules en una pagina verde,
    que es de lo primero que se ve al bajar.
    """
    def uno(m):
        cuerpo = m.group(1)
        if any(a in cuerpo for a in AJENAS):
            return m.group(0)
        return 'style="' + _HEX.sub(_hex, cuerpo) + '"'

    return re.sub(r'style="([^"]*)"', uno, html)


def _paletas(txt):
    """Los colores que NO estan escritos como colores.

    El campo de la portada -lo mas visible de la pagina- se quedo azul despues
    del giro, y no se vio hasta que probar_fondo midio el tono real: el 96 % de
    los pixeles encendidos caia en 210-220 grados. El motivo es que sus paletas
    no son «#hex» ni «rgb()», sino listas de numeros -«[[64,132,255],...]»- en
    el camino de lienzo y «vec3(0.184,0.420,1.0)» en el sombreador de WebGL.
    El girador busca colores escritos como colores y ahi no habia ninguno.

    Se giran los dos formatos con la misma regla que todo lo demas. Los tercios
    que son geometria -«[[0,0,1],[-1,-1,1]...]», los vertices del cubo- quedan
    fuera porque ninguno de sus tres numeros pasa de 8: un color de verdad
    tiene al menos un canal alto.
    """
    def trio(m):
        r, g, b = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if max(r, g, b) <= 8:
            return m.group(0)          # geometria, no color
        v = _verde(r, g, b, realza=False) or _verdea_neutro(r, g, b)
        return m.group(0) if not v else '[%d,%d,%d]' % v

    def vec(m):
        f = [float(m.group(i)) for i in (1, 2, 3)]
        v = (_verde(*[x * 255 for x in f], realza=False)
             or _verdea_neutro(*[x * 255 for x in f]))
        if not v:
            return m.group(0)
        return 'vec3(%.3f,%.3f,%.3f)' % tuple(x / 255.0 for x in v)

    return _VEC3.sub(vec, _TRIO.sub(trio, txt))


def _guiones(html):
    """Gira los colores que viven DENTRO de los guiones.

    Las escenas de lienzo llevan sus colores escritos en el <script>. Un giro
    sobre <style> no los ve, y la rosca del reparto se quedaba azul en una
    pagina ya verde. Los JSON quedan fuera: ahi no hay color.
    """
    fuera, i = [], 0
    while True:
        a = html.find('<script', i)
        if a < 0:
            break
        ini = html.index('>', a) + 1
        fin = html.index('</script>', ini)
        cab = html[a:ini]
        fuera.append(html[i:ini])
        fuera.append(html[ini:fin] if 'application/json' in cab
                     else _paletas(_girar(html[ini:fin])))
        i = fin
    fuera.append(html[i:])
    return ''.join(fuera)


PREFIJO = (':is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer)'
           ':not(.zz):not(.zz) ')


def _prensa(html):
    """La palabra Nereum sobre el color de cada medio, sin blanco.

    Las cuatro tarjetas de prensa llevan el color REAL del medio -y tiene que
    seguir siendo el suyo, por eso el giro no toca los «style=» en linea-. Con
    blanco daba igual: el blanco se lee sobre los cuatro. Quitado el blanco, ya
    no hay un color que valga para todos: la lima entra a 12,2:1 sobre el verde
    oscuro y a 2,6:1 sobre el rojo.

    Asi que no se elige un color, se elige POR TARJETA y midiendo: de los dos
    que tiene la marca -lima y casi negro- gana el que mas contraste saca sobre
    ese fondo. Se genera leyendo los «--w1» que hay puestos, asi que si manana
    entra otro medio sale su regla sola.
    """
    LIMA, NEGRO = '#A2E200', '#0B0E10'

    def lee(a, b):
        la = _lum(int(a[1:3], 16), int(a[3:5], 16), int(a[5:7], 16))
        lb = _lum(int(b[1:3], 16), int(b[3:5], 16), int(b[5:7], 16))
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

    reglas = []
    for w1 in sorted(set(re.findall(r'--w1:(#[0-9A-Fa-f]{6})', html))):
        tinta = LIMA if lee(LIMA, w1) >= lee(NEGRO, w1) else NEGRO
        # con el mismo prefijo que las generadas, o pierde: la regla de noche
        # para «.cb» pesa (0,4,2) y «.pcd[style*=] .cb» a secas solo (0,3,0).
        # a «.cb» Y a «.cb-word»: los glifos viven en el hijo, y la regla de
        # noche lo pinta por su cuenta. Pintando solo el padre, la palabra
        # seguia saliendo verde sobre el rojo -a 2,4:1- y la bateria daba por
        # buena la del padre, que no se ve.
        reglas.append(PREFIJO + '.pcd[style*="--w1:%s"] :is(.cb,.cb-word){color:%s}'
                      % (w1, tinta))
    return '\n'.join(reglas)


def _suelos(html):
    """Ningun elemento puede ANUNCIAR un suelo claro en una pagina de noche.

    El lienzo fijo se tiñe del «data-bg» de cada banda y de ahi se pintan el
    pie y las bandas oscuras. Si el pintado gira a negro y el anunciado no,
    vuelve la franja clara entre secciones y el pie se queda claro con tinta
    clara encima: 1,6:1.

    Girarlo por «id» -que es lo que hacia antes- no alcanza: el <footer> no
    tiene id, y los <span class="hold"> que sostienen el color de una banda
    tampoco. Los tres se quedaban claros. Asi que no se pregunta por el id: se
    recorren TODOS los «data-bg» en orden de documento arrastrando el suelo de
    la ultima seccion, y el que anuncia claro hereda ese suelo. El pie hereda
    el de «join», y cada «hold» el de su seccion.
    """
    piso = ['#07090A']

    def uno(m):
        tag, col = m.group(1), m.group(2)
        if tag == 'footer':
            # el pie pinta con «--suelo», asi que anuncia «--suelo». Heredar el
            # de «join» lo dejaba anunciando #0E1215 y pintando #07090A, que es
            # justo la costura que esto viene a cerrar.
            col = SUELO_NOCHE
            piso[0] = col
        elif tag == 'section':
            ident = re.search(r'\bid="([^"]+)"', m.group(0))
            ident = ident.group(1) if ident else ''
            if ident in SUELO_A:
                col = '#07090A'
            elif ident in SUELO_B:
                col = '#0E1215'
            piso[0] = col
        elif _lum(int(col[1:3], 16), int(col[3:5], 16), int(col[5:7], 16)) > 0.18:
            col = piso[0]
        return m.group(0).replace(m.group(2), col)

    return re.sub(r'<(section|footer|span)\b[^>]*\bdata-bg="(#[0-9A-Fa-f]{6})"[^>]*>',
                  uno, html)


def aplicar(html, noche=True):
    """Idempotente: si ya esta girado, girar otra vez no mueve nada.

    Con «noche=False» se monta solo el giro y la pagina se queda clara. No es
    una opcion de diseno: es lo que hace falta para REGENERAR el bloque de
    noche, que se calcula midiendo los colores de la pagina CLARA. Generandolo
    contra la ya oscura salen cero fondos, que es lo que me paso.
    """
    i = html.index('<style>')
    j = html.index('\n</style>') + len('\n</style>')
    hoja = _girar(html[i:j])
    html = html[:i] + hoja + html[j:]
    html = _guiones(html)
    html = _enlinea(html)
    html = _marca(html)
    for c in CASA:
        html = html.replace(c, _hex(re.match(r'#[0-9A-Fa-f]{6}', c)))
    # los acentos que cada banda declara en su marcado, y la marca del
    # navegador: la barra del movil y el icono anclado tambien son branding
    for pat in (r'(data-acc=")(#[0-9A-Fa-f]{6})(")',
                r'(data-bg=")(#[0-9A-Fa-f]{6})(")',
                # el data-bg TAMBIEN: es el color que la banda anuncia, y si el
                # pintado gira y el anunciado no, vuelve la franja del lienzo
                # entre secciones. Lo cantaron probar_costura y probar_giro.
                r'(data-bg=")(#[0-9A-Fa-f]{6})(")',
                r'(<meta name="theme-color"[^>]*content=")(#[0-9A-Fa-f]{6})(")',
                r'(<link rel="mask-icon"[^>]*color=")(#[0-9A-Fa-f]{6})(")',
                r'(<meta name="msapplication-TileColor"[^>]*content=")(#[0-9A-Fa-f]{6})(")'):
        html = re.sub(pat,
                      lambda m: m.group(1) + _hex(re.match(r'#[0-9A-Fa-f]{6}', m.group(2))) + m.group(3),
                      html)
    if noche:
        html = _suelos(html)
    cuerpo = (CSS if not noche else
              CSS.replace(CIERRE, _masverde(NOCHE) + RAICES + _prensa(html) + '\n' + CIERRE))
    if MARCA in html:
        a = html.index(MARCA)
        b = html.index(FIN, a) + len(FIN)
        html = html[:a] + cuerpo.strip('\n') + html[b:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + cuerpo.strip('\n') + '\n</style>', 1)
    return html


# Generado por herramientas/noche_gen.mjs midiendo la pagina CLARA.
NOCHE = """
/* ── las bandas claras, de noche ──
   Generado midiendo el color CALCULADO de cada elemento que vive dentro de una
   banda clara, no leyendo el CSS: media pagina pinta con var(--ink) y un
   recorrido por el texto no ve el color detras de una variable. Ahi se cayo el
   primer intento de pasar esta pagina a oscuro: ochenta y cuatro titulares se
   quedaron negros sobre negro.
   Cuatro reglas, y las cuatro se ganaron a golpes:
   · el FONDO no se invierte, se remapea a una banda oscura conservando el
     orden. En oscuro la elevacion va al reves que en claro, y una tarjeta
     blanca invertida a pelo sale NEGRA sobre un suelo mas claro: hundida en su
     propio fondo;
   · y se desatura casi del todo, que el encargo era negro, no verde botella;
   · la TINTA si se voltea, con suelo de luminancia: a pelo el tercer nivel
     caia a 2,3:1 sobre el panel oscuro;
   · y entran las firmas SIN clase -«button», «dd»-. Descartandolas, los
     botones de moneda del widget se quedaban blancos en una pagina negra, con
     su texto negro encima, a 1:1. El prefijo las acota a las bandas claras.
     Pero eso vale para la TINTA y para «button», no para el FONDO de «span»:
     esa regla se quito a mano. Se escribio por los botones de moneda -que son
     «button», no «span»- y lo que pintaba de verdad eran 78 «.ws» y 78 «.wi»,
     que son los envoltorios de palabra de los titulares. En pantalla salia un
     recuadro negro detras de cada palabra de cada titular de la pagina. De los
     212 «span» que alcanzaba, ni uno era una superficie.
   Los dos «:not(.zz)» tampoco son un capricho: las reglas originales van
   scopeadas con dos clases y pesan (0,2,0); el prefijo a secas pesa (0,1,2), y
   una clase gana a tres tipos. Mis reglas perdian. Con los dos «:not» el
   prefijo pasa a (0,3,2) y gana sin recurrir a !important, que se llevaria por
   delante tambien los estados de hover. */
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz){--paper:#0E1113;--paper2:#121618;--ink:#B0D651;
  --mute-d:rgba(176,214,81,.58);--line-d:rgba(176,214,81,.14);
  --grano:url("data:image/svg+xml,<svg%20xmlns='http://www.w3.org/2000/svg'%20width='170'%20height='170'><filter%20id='n'><feTurbulence%20type='fractalNoise'%20baseFrequency='.92'%20numOctaves='3'%20stitchTiles='stitch'/><feColorMatrix%20type='saturate'%20values='0'/></filter><rect%20width='170'%20height='170'%20filter='url%28%2523n%29'%20opacity='.055'/></svg>");
  /* La luz de escena, MUY floja y casi neutra: sobre negro un velo de
     color pesa mucho mas que sobre papel, y a .11 salia una nube verde. */
  --tapa:#030405;--foco:rgba(176,214,81,.085);--foco2:rgba(162,226,0,.055);
  --hondo:rgba(0,0,0,.62);color:#B0D651}
/* El dibujo de fondo, en su version de noche (papel_noche.py). Quitarlo
   seria peor: es lo unico que ata estas bandas con el campo de la portada. */
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz){background-image:
    radial-gradient(124% 96% at 50% 44%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 52%, var(--tapa) 88%),
    radial-gradient(78% 52% at 26% 8%, var(--foco2) 0%, rgba(0,0,0,0) 62%),
    radial-gradient(92% 58% at 62% 18%, var(--foco) 0%, rgba(0,0,0,0) 68%),
    var(--grano),
    url(img/papel-noche.svg);
  background-repeat:no-repeat,no-repeat,no-repeat,repeat,no-repeat;
  background-size:auto,auto,auto,auto,cover;
  background-position:center,center,center,0 0,center}
@media(max-width:760px){:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz){background-image:
    radial-gradient(124% 96% at 50% 44%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 52%, var(--tapa) 88%),
    radial-gradient(78% 52% at 26% 8%, var(--foco2) 0%, rgba(0,0,0,0) 62%),
    radial-gradient(92% 58% at 62% 18%, var(--foco) 0%, rgba(0,0,0,0) 68%),
    var(--grano),
    url(img/papel-alto-noche.svg);
  background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat-y;
  background-size:auto,auto,auto,auto,100% auto;
  background-position:center,center,center,0 0,left top}}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).paper.logos{background-color:#07090A}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).press.paper{background-color:#0E1215}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pcd.luz{background-color:rgba(34,35,32,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).paper.say{background-color:#07090A}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).paper2.pad{background-color:#07090A}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .ic{background-color:rgba(8,8,6,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).secure{background-color:#07090A}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-card.luz{background-color:rgba(34,35,32,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-ic{background-color:rgba(27,29,22,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-ok{background-color:rgba(32,37,34,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).sale{background-color:#07090A}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .prices{background-color:rgba(34,35,32,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr.up{background-color:rgba(30,32,25,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr-mult{background-color:rgba(33,37,34,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) em{background-color:rgba(8,8,6,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .widget{background-color:rgba(34,35,32,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) button{background-color:rgba(34,35,32,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .red{background-color:rgba(37,37,37,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-field{background-color:rgba(34,35,32,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-field.out{background-color:rgba(35,37,31,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-cta{background-color:rgba(8,8,6,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).tkp{background-color:#0E1215}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) i{background-color:rgba(18,21,23,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).join{background-color:#0E1215}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .jbtn.luz.iman{background-color:rgba(34,35,32,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) footer{background-color:#07090A}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tec-cur{background-color:rgba(29,30,26,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .[object.SVGAnimatedString]{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .f-legal{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .fbrand{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .fcopy{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .fgrid{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .fmark{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .ftop{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .jbtn-foot{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .jbtn-name{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .jbtn-sub{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .jbtn.luz.iman{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).join{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .join-grid{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .join-h{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .join-head{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .join-note{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .join-rule{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .k.sk{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .lane{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .lane-in{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .lane-k{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .lane-sub{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).paper.logos{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).paper.say{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).paper2.pad{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pcd-body{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pcd-t{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pcd-tag{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pcd.luz{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr-k.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr-mult{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr-n.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr-v{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .pr.up{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .press-all{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .press-h{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .press-rail{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).press.paper{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .prices{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .raise{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .raise-bar{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .raise-foot.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .raise-head{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .raise-tip{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .rd{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .rn{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .rows{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).sale{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sale-grid{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sale-h{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sale-left{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sale-live.sk{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sale-net.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sale-sub{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sale-top{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-card.luz{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-cue{color:rgba(245,247,241,0.4)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-fields{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-foot{color:rgba(245,247,241,0.42)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-go{color:rgb(129,150,85)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-grid{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-h{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-h.rows-h{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-head{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-k{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-live.sk{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-n{color:rgba(245,247,241,0.2)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-ok{color:rgb(129,151,86)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-p{color:rgba(245,247,241,0.6)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-stage{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-sub{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-t{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-top{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).secure{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tec{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tec-fantasma{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tec-real{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz).tkp{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tkp-core{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tkp-fig{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tkp-h{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .tkp-row{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .up{color:rgb(96,112,64)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-chips{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-cta{color:rgb(112,131,75)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-eq.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-field{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-field.out{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-lab.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-note.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-out{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-pay{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-rate.mono{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-top{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .wi{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .widget{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .wrap{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .wrap.press-foot{color:rgba(201,209,183,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .wrap.press-head{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .wrap.press-hold{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .wrap.tkp-head{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .wrap.tkp-list{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .ws{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) a{color:rgba(245,247,241,0.66)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) b{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) button{color:rgba(245,247,241,0.58)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) dd{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) div{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) dt{color:rgba(182,190,160,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) em{color:rgba(245,247,241,0.62)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) footer{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) li{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) p{color:rgba(246,248,242,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) span{color:rgba(245,247,241,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) span{border-color:rgba(137,156,82,1)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .sec-ic{border-color:rgba(191,255,29,0.18)}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) button{border-color:rgba(191,255,29,1)}
/* Las tintas de arriba salen de DOS pasadas fundidas: la que mide la pagina
   clara y la que mide la pagina ya oscura y corrige lo que se quedo corto. Un
   tema oscuro hecho a mano siempre tiene cola -cada ronda saca un grupo nuevo-
   y perseguirla a ojo no termina. La segunda pasada mide el contraste real
   contra el fondo que de verdad hay detras -subiendo por los padres hasta uno
   opaco, no el del propio elemento- y calcula la tinta que si llega. */
"""


# Lo que el generador NO puede ver, y por eso va a mano.
#
# El generador recorre la pagina y escribe una regla por FIRMA calculada. Dos
# cosas se le escapan por construccion, y las dos dejaban texto claro sobre
# fondo claro:
#
# · «--suelo», que es una variable de :root. El pie pinta con ella y la pierde
#   contra el bloque de noche porque ahi se escribe «background-image» y el pie
#   trae «background» -la forma corta, que si fija el color-. El generador solo
#   sabe leer colores calculados: una variable de raiz no tiene firma. El pie
#   se quedaba en #E4EECA con tinta #E7F3CA encima: 1,08:1. Se arregla donde
#   nace, no en el pie, porque «.hero-hold» pinta con la misma variable y
#   tambien tiene que ser suelo de noche.
#
# · «.w-out>div», que lleva el hex claro escrito a mano. Su firma calculada es
#   la de un «div» pelado, y como «div» pelado ya lo pinta otra regla, esta se
#   perdia al fundir las dos pasadas. Es la rejilla de «Value at listing» y
#   «Unrealised gain» del widget: 1,02:1.
#
# · y los «<span class="hold">», que no son fondo: son marcas de un pixel que
#   solo anuncian un color al lienzo. La regla generada para «span» pelado
#   -que existe por los botones de moneda del widget- los pintaba tambien, y
#   probar_costura los contaba como bandas que pintan un color distinto del
#   que anuncian. No se pintan.
#
# · las escuadras «.cn» de las tarjetas de prensa, por lo mismo con «<i>»: la
#   regla generada para «i» pelado las volvia cuadros macizos, que es justo el
#   dibujo viejo que se quito a mano. Vuelven a ser escuadras de 1 px.
#
# · y la palabra Nereum de esas tarjetas, que iba en blanco sobre el color del
#   medio. El encargo era quitar el blanco, asi que va en el acento: sobre los
#   cuatro fondos -luminancia 0,06 a 0,28- la lima entra a 6,1:1 en el peor.
#
# · y el ACENTO, que el generador apaga al reves de como hace falta. Midiendo
#   la pagina clara ve lima sobre blanco -que no se lee- y la baja a un oliva
#   rgb(96,112,64). Sobre el suelo de noche ese oliva cae a 3,16:1, cuando la
#   lima de partida iba a 10,9:1. El acento ya esta afinado PARA el negro: no
#   se retoca. La regla va despues de las generadas y con el mismo peso, asi
#   que gana por orden.
RAICES = """
:root{--suelo:#07090A}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .up{color:#A2E200}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .hold{background-color:transparent}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .cn,
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .cn.tl,:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .cn.tr,:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .cn.bl,:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .cn.br{background-color:transparent}
:is(main>section:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press),footer):not(.zz):not(.zz) .w-out>div{background-color:#1A1D16}
"""
