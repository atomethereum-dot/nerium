# -*- coding: utf-8 -*-
"""Paso 35 · la mitad clara, de noche.

La pagina era mitad negra y mitad papel. Las piezas que mejor funcionan
—las tarjetas de prensa, las tres fichas de seguridad, el donut del token, el
panel de compra— estaban todas en la mitad clara, y sobre blanco se leen como
una web; sobre negro se leen como un instrumento. Se pasan las ocho secciones
claras a oscuro.

COMO, sin escribir doscientas reglas a mano y sin dejarse ninguna.

Primero se pregunta al navegador que clases viven SOLO dentro de las secciones
claras: se recorre la pagina entera, se anota en que lado cae cada clase, y las
que nunca aparecen fuera son las que se pueden tocar sin miedo. Son 121.

Despues se recorre la hoja de estilos regla por regla. De cada regla se queda
la parte del selector que menciona una de esas 121 —una regla como
«.press-h,.builds-h,.ruta-h» se parte, y solo «.press-h» entra—, y de sus
declaraciones solo las que pintan: color, fondo, borde, relleno de svg,
sombra. Los colores se traducen con una tabla: las dos tintas negras a un
blanco azulado, los grises medios a grises claros, los blancos de tarjeta a un
azul casi negro, los bordes negros translucidos a bordes claros translucidos.

Lo que sale es un bloque al final de la hoja que gana por orden, no por
«!important», y que se puede leer entero.

El resultado se comprueba con el mismo censo que lo empezo: se vuelve a
recorrer la pagina y se cuentan las superficies claras y las tintas oscuras que
quedan dentro de las ocho secciones. Y encima va la bateria de contraste, que
mide texto contra fondo de verdad.

Cada seccion se lleva su propio negro, del mas azulado al mas puro, para que
el recorrido siga teniendo latido y no sea un unico paño negro.
"""
import io
import re

MARCA = '/* ══ nocturno ══ Lo aplica herramientas/nocturno.py ═══'

# Las clases que solo existen dentro de las ocho secciones claras. Sale de
# preguntarselo al navegador, no de leer el marcado a ojo: herramientas/
# censo_clases.mjs recorre la pagina y anota en que lado cae cada clase.
SOLO_CLARAS = """cb cb-logo cb-mark cb-rule cb-tile cb-word cuenta ic jbtn jbtn-foot jbtn-go
jbtn-mark jbtn-name jbtn-sub jbtn-top join join-grid join-h join-head join-note join-rule lane
lane-in lane-k lane-sub logos luz nrm-mon nrm-saldo out paper paper2 pcd pcd-art pcd-body
pcd-plate pcd-t pcd-tag pn pr pr-arrow pr-k pr-mult pr-n pr-v press press-foot press-h
press-head press-hold press-nav press-rail prices raise raise-bar raise-foot raise-head
raise-tip rd red rn rows rows-h sale sale-field sale-grid sale-h sale-left sale-live sale-net
sale-sub sale-top say sec-card sec-cue sec-dots sec-fields sec-foot sec-go sec-grid sec-h
sec-head sec-ic sec-k sec-live sec-n sec-ok sec-p sec-stage sec-sub sec-t sec-top secure tkp
tkp-cal tkp-core tkp-cv tkp-dot tkp-fig tkp-h tkp-head tkp-l tkp-lead tkp-list tkp-n tkp-row
tkp-svg up w-chips w-cta w-eq w-field w-lab w-note w-out w-pay w-range w-rate w-swap w-top
widget""".split()
SOLO_IDS = ['network', 'press', 'thesis', 'solutions', 'security', 'presale', 'token', 'join']

# El pie no esta en el grupo del papel —se pinta del lavado, como la portada—
# pero su texto tambien se escribio para ir sobre claro. Sus clases propias
# entran en el mismo recorrido; el fondo se lo trae el lavado ya oscuro.
SOLO_PIE = 'f-legal fbrand fcopy fend ffield fgrid fmark fmark-logo ftop'.split()
SOLO_CLARAS += SOLO_PIE

# Las secciones, con el negro que le toca a cada una. No es el mismo en todas
# a proposito: bajando, el azul se va yendo y el negro se cierra, asi el
# recorrido tiene latido en vez de un unico paño.
NOCHES = [
    ('network',   '#070B14'),
    ('press',     '#05080F'),
    ('thesis',    '#060A12'),
    ('solutions', '#080C16'),
    ('security',  '#05080F'),
    ('presale',   '#070B15'),
    ('token',     '#04070D'),
    ('join',      '#060911'),
]

# ── la tabla de colores ──────────────────────────────────────────────────────
# Izquierda, lo que hay; derecha, lo que va. Las dos tintas negras del sitio
# —#0A0C10 y #0B0D12— van al mismo blanco azulado; los dos grises medios, a
# dos grises claros que guardan la misma distancia entre si.
TINTA = {
    '#0a0c10': '#E9EFFA', '#0b0d12': '#E9EFFA', '#0d0f14': '#E9EFFA',
    '#5b657a': '#93A2BD', '#3c4557': '#AEBBD2', '#627085': '#9FADC6',
    '#1b49e0': '#79ABFF', '#2a5bff': '#7AA6FF', '#2f6bff': '#7AA6FF',
    '#12a45e': '#3FD68C', '#0e8a4e': '#3FD68C',
    '#00131f': '#00131F', '#00070f': '#00070F',
}
FONDO = {
    '#ffffff': '#0B1220', '#fff': '#0B1220',
    '#f5f8fc': '#0D1422', '#edf1f8': '#0D1422', '#e5ebf5': '#101828',
    '#e4eaf4': '#0D1422', '#f0f5ff': '#101A2C', '#f4f7ff': '#101A2C',
    '#f7f9fc': '#0E1626', '#f1fbf5': '#0C2019', '#f3fbf6': '#0C2019',
    '#e7eaee': '#131C2C', '#f1f2f4': '#0D1422', '#f5f5f7': '#0D1422',
    '#fbfcfd': '#0D1422', '#f6f8fb': '#0E1626', '#eef2f9': '#101828',
}
# Los negros translucidos que hacian de borde o de velo sobre papel: sobre
# negro no se ven, asi que se les da la vuelta y pasan a ser claros.
def _voltea_alfa(r, g, b, a):
    """Un negro translucido pasa a blanco azulado translucido, con algo mas de
    cuerpo: sobre negro hace falta mas alfa para la misma presencia."""
    return 'rgba(150,180,235,%s)' % _corta(min(0.30, a * 1.5))


def _corta(x):
    return ('%.3f' % x).rstrip('0').rstrip('.')


# ── el analizador de color ───────────────────────────────────────────────────
_COLOR = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)', re.I)
_TINTA_P = ('color', 'fill', 'stroke', '-webkit-text-fill-color', 'caret-color',
            'text-decoration-color', 'column-rule-color')
_FONDO_P = ('background', 'background-color', 'background-image')
_BORDE_P = ('border', 'border-color', 'border-top', 'border-right', 'border-bottom',
            'border-left', 'border-top-color', 'border-right-color',
            'border-bottom-color', 'border-left-color', 'outline', 'outline-color')
_SOMBRA_P = ('box-shadow', 'text-shadow', 'filter')
PINTAN = _TINTA_P + _FONDO_P + _BORDE_P + _SOMBRA_P


def _lee(c):
    """Devuelve (r,g,b,a) de un color CSS, o None si no se sabe leerlo."""
    c = c.strip().lower()
    if c.startswith('#'):
        h = c[1:]
        if len(h) == 3:
            h = ''.join(x * 2 for x in h)
        if len(h) == 8:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255)
        if len(h) != 6:
            return None
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
    m = re.match(r'rgba?\(([^)]*)\)', c)
    if not m:
        return None
    partes = [p.strip() for p in re.split(r'[,\s/]+', m.group(1)) if p.strip()]
    if len(partes) < 3:
        return None
    try:
        r, g, b = (int(float(p.rstrip('%'))) for p in partes[:3])
        a = float(partes[3].rstrip('%')) if len(partes) > 3 else 1.0
        if len(partes) > 3 and partes[3].endswith('%'):
            a /= 100
    except ValueError:
        return None
    return (r, g, b, a)


def _luz(c):
    """Luminancia relativa, como la ve el ojo."""
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2])


def _clave(c):
    """La forma corta de un color opaco, para buscarlo en las tablas."""
    return '#%02x%02x%02x' % (c[0], c[1], c[2])


def _tinta(txt):
    c = _lee(txt)
    if c is None:
        return None
    k = _clave(c)
    if k in TINTA:
        base = TINTA[k]
        return base if c[3] >= .999 else 'rgba(%d,%d,%d,%s)' % (
            int(base[1:3], 16), int(base[3:5], 16), int(base[5:7], 16),
            _corta(min(1.0, c[3] + .14)))
    if _luz(c) < .22:                      # cualquier otra tinta oscura
        a = 1.0 if c[3] >= .999 else min(1.0, c[3] + .14)
        return '#E9EFFA' if a >= .999 else 'rgba(233,239,250,%s)' % _corta(a)
    return None


def _fondo(txt):
    c = _lee(txt)
    if c is None:
        return None
    k = _clave(c)
    if c[3] >= .999 and k in FONDO:
        return FONDO[k]
    if _luz(c) > .55:
        if c[3] >= .55:
            return FONDO.get(k, '#0B1220')
        return _voltea_alfa(*c)            # velos blancos: pasan a velos claros tenues
    return None


def _borde(txt):
    c = _lee(txt)
    if c is None:
        return None
    if _luz(c) < .30:
        return _voltea_alfa(*c)
    return None


def _sombra(txt):
    c = _lee(txt)
    if c is None:
        return None
    if _luz(c) < .30:                      # las sombras azuladas del papel
        return 'rgba(0,0,0,%s)' % _corta(min(.85, max(.45, c[3] * 1.6)))
    return None


def _traduce(prop, valor):
    """Devuelve el valor con los colores cambiados, o None si no cambia nada."""
    if prop in _TINTA_P:
        f = _tinta
    elif prop in _FONDO_P:
        f = _fondo
    elif prop in _BORDE_P:
        f = _borde
    elif prop in _SOMBRA_P:
        f = _sombra
    else:
        return None
    cambio = [False]

    def uno(m):
        n = f(m.group(0))
        if n is None:
            return m.group(0)
        cambio[0] = True
        return n
    salida = _COLOR.sub(uno, valor)
    if prop in _TINTA_P and 'var(--blue)' in salida:
        salida = salida.replace('var(--blue)', 'var(--blue-lite)')
        cambio[0] = True
    return salida if cambio[0] else None


# ── el recorrido de la hoja ──────────────────────────────────────────────────
# «footer» va como elemento, no como clase: sus reglas se escriben «footer
# .fcopy» y tambien «footer» a secas, que es la que pinta el fondo. Con el
# limite de palabra no se cuela ninguna «.press-foot» ni «.sec-foot».
_SEL_CLARA = re.compile(
    r'(?:\.(?:%s)|#(?:%s))(?![\w-])|\bfooter\b' % ('|'.join(map(re.escape, SOLO_CLARAS)),
                                                     '|'.join(SOLO_IDS)))


def _es_clara(sel):
    return bool(_SEL_CLARA.search(sel))


def _reglas(css):
    """Recorre la hoja y va soltando (media, selector, declaraciones). Solo hay
    un nivel de anidamiento —@media— asi que no hace falta un analizador de
    verdad: basta con contar llaves."""
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            return
        cabeza = css[i:j].strip()
        if cabeza.startswith('@'):
            if cabeza.split()[0].lower() in ('@media', '@supports'):
                # se entra dentro
                k, prof = j + 1, 1
                while k < n and prof:
                    if css[k] == '{':
                        prof += 1
                    elif css[k] == '}':
                        prof -= 1
                    k += 1
                for _, s, d in _reglas(css[j + 1:k - 1]):
                    yield (cabeza, s, d)
                i = k
                continue
            # @font-face, @keyframes, @property... se saltan enteros
            k, prof = j + 1, 1
            while k < n and prof:
                if css[k] == '{':
                    prof += 1
                elif css[k] == '}':
                    prof -= 1
                k += 1
            i = k
            continue
        k = css.find('}', j)
        if k < 0:
            return
        yield ('', cabeza, css[j + 1:k])
        i = k + 1


def _limpia(sel):
    """Quita comentarios y espacios sobrantes de un selector."""
    return re.sub(r'\s+', ' ', re.sub(r'/\*.*?\*/', '', sel, flags=re.S)).strip()


# La ilustracion de las tarjetas de prensa no es una superficie clara: es el
# color de marca del medio —el azul de Benzinga, el rojo de Morningstar— con
# los dos logotipos encima. Nunca dependio de que la pagina fuera blanca, asi
# que aqui no se toca nada; darle la vuelta le ponia una placa oscura delante.
AJENAS = ('.pcd-art', '.pcd-plate', '.cb', '.cb-mark', '.cb-word', '.cb-rule',
          '.cb-tile', '.cb-logo')
_SEL_AJENA = re.compile(r'(?:%s)(?![\w-])' % '|'.join(map(re.escape, AJENAS)))


def noche(css):
    """El bloque de noche: una linea por regla que hubiera que dar la vuelta.

    Solo cuenta la ULTIMA declaracion de cada pareja selector/propiedad. La
    hoja redefine cosas mas abajo —«.pcd-plate» nace con fondo blanco y cuatro
    reglas despues se queda sin fondo—, y traducir la primera y ponerla al
    final resucitaba declaraciones que llevaban muertas desde el principio."""
    ultima, orden_sel = {}, []
    for media, sel, decl in _reglas(css):
        sel = _limpia(sel)
        if not sel or sel.startswith('@'):
            continue
        partes = [p.strip() for p in re.split(r',(?![^()]*\))', sel) if p.strip()]
        claras = [p for p in partes if _es_clara(p) and not _SEL_AJENA.search(p)]
        if not claras:
            continue
        clave_sel = (media, ','.join(claras))
        for trozo in decl.split(';'):
            if ':' not in trozo:
                continue
            prop, _, valor = trozo.partition(':')
            prop = prop.strip().lower()
            if prop not in PINTAN:
                continue
            k = (clave_sel, prop)
            if k not in ultima:
                orden_sel.append(k)
            ultima[k] = valor
    porMedia, orden, juntos = {}, [], {}
    for k in orden_sel:
        (media, sel), prop = k
        valor = ultima[k]
        imp = '!important' in valor
        v = re.sub(r'\s+', ' ', valor.replace('!important', '')).strip()
        nuevo = _traduce(prop, v)
        if not nuevo:
            continue
        juntos.setdefault((media, sel), []).append(
            '%s:%s%s' % (prop, nuevo, ' !important' if imp else ''))
    for (media, sel), decls in juntos.items():
        linea = '%s{%s}' % (sel, ';'.join(decls))
        if media not in porMedia:
            porMedia[media] = []
            orden.append(media)
        porMedia[media].append(linea)
    trozos = []
    for media in orden:
        cuerpo = '\n'.join(porMedia[media])
        trozos.append(cuerpo if not media else '%s{\n%s\n}' % (media, cuerpo))
    return '\n'.join(trozos)


def _noche_viejo(css):
    porMedia, orden = {}, []
    for media, sel, decl in _reglas(css):
        sel = _limpia(sel)
        if not sel or sel.startswith('@'):
            continue
        partes = [p.strip() for p in re.split(r',(?![^()]*\))', sel) if p.strip()]
        claras = [p for p in partes if _es_clara(p)]
        if not claras:
            continue
        salida = []
        for trozo in decl.split(';'):
            if ':' not in trozo:
                continue
            prop, _, valor = trozo.partition(':')
            prop = prop.strip().lower()
            if prop not in PINTAN:
                continue
            imp = '!important' in valor
            v = valor.replace('!important', '').strip()
            nuevo = _traduce(prop, v)
            if nuevo:
                salida.append('%s:%s%s' % (prop, nuevo, ' !important' if imp else ''))
        if not salida:
            continue
        linea = '%s{%s}' % (','.join(claras), ';'.join(salida))
        if media not in porMedia:
            porMedia[media] = []
            orden.append(media)
        porMedia[media].append(linea)
    trozos = []
    for media in orden:
        cuerpo = '\n'.join(porMedia[media])
        trozos.append(cuerpo if not media else '%s{\n%s\n}' % (media, cuerpo))
    return '\n'.join(trozos)


# ── el suelo de cada noche ───────────────────────────────────────────────────
# Va por ID —una pieza de especificidad mas alta que cualquier clase— porque el
# suelo claro se repinta en tres sitios distintos de la hoja, uno de ellos con
# «.tkp.tkp», y pelearse por orden con eso es perder el tiempo.
#
# Y se va el papel: «papel.svg», «tapiz.svg» y el grano estaban dibujados para
# ir SOBRE BLANCO. Sobre negro no se leen como textura, se leen como suciedad.
# En su sitio quedan los tres halos azules que ya habia, que sobre negro por
# fin hacen lo que prometian.
# ── el campo de placas, de noche ─────────────────────────────────────────────
# El dibujo de fondo de la mitad clara no era papel: era el MISMO campo de
# bloques de la portada, ejecutado como placas con su canto iluminado. Eso no
# se tira, que es la textura que le da caracter a la pagina y la cose con la
# portada. Lo unico que no valia son las tres luces del dibujo, y sobre todo la
# primera: un foco BLANCO al 96 % en el rincon del titular, que sobre papel es
# lo que levanta la esquina y sobre negro es una mancha.
#
# Asi que el dibujo se reaprovecha entero —las mismas placas, la misma semilla,
# la misma composicion en diagonal— y solo se le cambian las luces. Sale un
# «noche.svg» y un «noche-alto.svg» para la pantalla vertical.
LUCES_NOCHE = [
    # (id, color de dia, opacidad de dia, color de noche, opacidad de noche)
    ('l1', 'rgb(255,255,255)', '.96', 'rgb(150,185,255)', '.10'),
    ('l2', 'rgb(47,107,255)',  '.09', 'rgb(47,107,255)',  '.20'),
    ('l3', 'rgb(120,150,215)', '.12', 'rgb(120,160,235)', '.16'),
    ('m1', 'rgb(255,255,255)', '.94', 'rgb(150,185,255)', '.10'),
    ('m2', 'rgb(47,107,255)',  '.07', 'rgb(47,107,255)',  '.20'),
]


def dibujos(raiz):
    """Escribe img/noche.svg y img/noche-alto.svg. Devuelve los que ha tocado."""
    import os
    hechos = []
    for origen, destino in (('papel.svg', 'noche.svg'),
                            ('papel-alto.svg', 'noche-alto.svg')):
        ruta = os.path.join(raiz, 'img', origen)
        if not os.path.exists(ruta):
            continue
        svg = io.open(ruta, encoding='utf-8').read()
        for nid, coldia, opdia, colnoche, opnoche in LUCES_NOCHE:
            viejo = ('<radialGradient id="' + nid + '">'
                     '<stop offset="0" stop-color="' + coldia + '" stop-opacity="' + opdia + '"/>'
                     '<stop offset="1" stop-color="' + coldia + '" stop-opacity="0"/>'
                     '</radialGradient>')
            nuevo = ('<radialGradient id="' + nid + '">'
                     '<stop offset="0" stop-color="' + colnoche + '" stop-opacity="' + opnoche + '"/>'
                     '<stop offset="1" stop-color="' + colnoche + '" stop-opacity="0"/>'
                     '</radialGradient>')
            svg = svg.replace(viejo, nuevo)
        assert 'stop-color="rgb(255,255,255)" stop-opacity=".9' not in svg, (
            'queda un foco blanco sin apagar en ' + destino)
        io.open(os.path.join(raiz, 'img', destino), 'w', encoding='utf-8').write(svg)
        hechos.append(destino)
    return hechos


def _suelo():
    ids = ','.join('#' + i for i in SOLO_IDS)
    lineas = ['%s{--noche:%s}' % ('#' + i, c) for i, c in NOCHES]
    halos = """
    radial-gradient(72% 80% at 6% -12%,rgba(47,107,255,.15),transparent 66%),
    radial-gradient(62% 74% at 96% -14%,rgba(47,107,255,.11),transparent 64%),
    radial-gradient(68% 76% at 18% 112%,rgba(58,96,190,.10),transparent 70%),"""
    lineas.append(ids + """{
  background-color:var(--noche,#05080F) !important;
  background-image:""" + halos + """
    var(--grano),url(img/noche.svg) !important;
  background-repeat:no-repeat,no-repeat,no-repeat,repeat,no-repeat !important;
  background-size:auto,auto,auto,auto,cover !important;
  background-position:0 0,0 0,0 0,0 0,center top !important;
  background-attachment:scroll !important;
  color:#E9EFFA}""")
    # La pantalla vertical pide el dibujo vertical, del ancho de la pantalla y
    # repitiendose hacia abajo, que es como lo dejo el paso 17.
    lineas.append("@media(max-width:760px){" + ids + """{
  background-image:""" + halos + """
    var(--grano),url(img/noche-alto.svg) !important;
  background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat-y !important;
  background-size:auto,auto,auto,auto,100% auto !important;
  background-position:0 0,0 0,0 0,0 0,center top !important}}""")
    return '\n'.join(lineas)


# Lo que el recorrido automatico no puede saber, porque no esta escrito en
# ningun color: piezas que se apoyaban en que el fondo era blanco.
REMATE = """
/* Lo primero: las fichas de color. Media hoja no escribe un color, escribe el
   nombre de uno —«var(--ink)», «var(--p-linea)»— y ahi el recorrido automatico
   no puede entrar, porque lo que lee es el nombre, no el valor. Se les da su
   version de noche SOLO dentro de estas ocho secciones, que es donde importa.
   Una linea arregla los ochenta y cuatro titulares que se quedaban negros. */
#network,#press,#thesis,#solutions,#security,#presale,#token,#join{
  --ink:#E9EFFA;
  --mute-d:rgba(233,239,250,.60);
  --line-d:rgba(150,180,235,.16);
  --p-linea:rgba(150,180,235,.16);
  --p-linea2:rgba(150,180,235,.06);
  --p-relieve:0 24px 54px -30px rgba(0,0,0,.85);
  --p-relieve2:0 30px 66px -34px rgba(0,0,0,.9);
  --paper:#0B1220;
  --paper2:#0D1422;
  --p-papel:#0B1220;
  --p-papel2:#0D1422;
  --p-alto:#0D1422;
  --pl:rgba(150,180,235,.16);
  --luz:rgba(47,107,255,.42)}
/* La fila de compatibilidad: las pastillas eran blancas con el logotipo
   encima. Ahora son de cristal oscuro, y los logotipos —que vienen en su
   color de marca— se quedan como estan, que es lo que se quiere ver. */
.lane-in span{background:rgba(255,255,255,.045);border:1px solid rgba(150,180,235,.14);
  color:#D7E1F2;box-shadow:none}
.lane::before,.lane::after{background:linear-gradient(90deg,var(--noche,#070B14),transparent)}
.lane::after{background:linear-gradient(270deg,var(--noche,#070B14),transparent)}

/* Las pildoras de estado —«VERIFIED», el multiplicador de la ronda— iban en
   verde palido sobre blanco. En verde encendido sobre negro. */
.sec-ok,.pr-mult{background:rgba(40,190,120,.12) !important;color:#5FE3A4 !important;
  border-color:rgba(63,214,140,.28) !important}
.sec-ok *,.pr-mult *{color:inherit !important}

/* El icono de cada ficha de seguridad. */
.sec-ic{background:rgba(70,120,255,.14) !important;border-color:rgba(122,166,255,.26) !important;
  color:#9CC0FF !important}

/* El panel de compra: los campos eran blancos con borde gris. */
.w-field,.w-out,.w-chips button,.pn{background:rgba(255,255,255,.035) !important;
  border-color:rgba(150,180,235,.16) !important;color:#E9EFFA !important}
.w-chips button.on,.w-pay button.on{background:rgba(70,120,255,.20) !important;
  border-color:#5E8CFF !important;color:#FFFFFF !important}
.w-pay button{background:rgba(255,255,255,.035) !important;
  border-color:rgba(150,180,235,.14) !important;color:#D7E1F2 !important}

/* El separador de la mitad «listing» de la tarjeta de precios. */
.pr.up{background:rgba(70,120,255,.10) !important}

/* El cursor del tecleo se pinta del color del lavado, y el lavado ya es
   negro: encima del texto claro se lo comia. Va al color del texto. */
.tec-cur{color:#E9EFFA !important}

/* El pie: las fichas de color, igual que las ocho secciones. */
footer{--ink:#E9EFFA;--mute-d:rgba(233,239,250,.60);--line-d:rgba(150,180,235,.16)}

/* El NEREUM gigante del pie no es un fondo: es un degradado recortado con la
   forma de las letras. Iba de negro a transparente, asi que sobre negro
   desaparecia entero. Va de claro a transparente. */
footer .fmark span{background-image:linear-gradient(180deg,
  rgba(233,239,250,.20),rgba(233,239,250,.035)) !important}
"""


def aplicar(html, raiz='/home/user/nerium'):
    """Idempotente: si el bloque ya esta, no lo repite."""
    dibujos(raiz)
    if MARCA in html:
        return html
    css = re.search(r'<style[^>]*>(.*?)</style>', html, re.S)
    assert css, 'no esta la hoja de estilos'
    bloque = '\n'.join([
        MARCA + '═══════════════════════════════════════════',
        '   Las ocho secciones claras, de noche. Lo de abajo del todo lo escribe',
        '   el recorrido automatico: una linea por cada regla de la hoja que',
        '   pintaba dando por hecho un fondo blanco. */',
        _suelo(),
        REMATE,
        '/* ── y aqui lo que sale de recorrer la hoja ── */',
        noche(css.group(1)),
    ])
    html = html[:css.end(1)] + '\n' + bloque + '\n' + html[css.end(1):]
    # El lavado y el tono de la interfaz salen de «data-bg»: si no cambian,
    # el fondo fijo de la pagina seguiria aclarandose en estas secciones y el
    # HUD seguiria poniendose en modo claro encima de un fondo negro.
    for sec, color in NOCHES:
        viejo = re.search(r'<(?:section|footer)[^>]*id="%s"[^>]*>' % sec, html)
        assert viejo, 'no esta la seccion ' + sec
        nuevo = re.sub(r'data-bg="[^"]*"', 'data-bg="%s"' % color, viejo.group(0))
        html = html.replace(viejo.group(0), nuevo, 1)
    # Dos escenas llevan dentro un «<span class=hold>» que sostiene el lavado
    # mientras la escena esta pegada arriba; si se queda con el blanco viejo,
    # el fondo se aclara justo donde no debe. Y el equipo, que esta oculto,
    # tambien: el dia que se encienda, que nazca de noche.
    for marca, color in (('<span class="hold" data-bg="#FFFFFF"', '#05080F'),
                         ('<span class="hold" data-bg="#FBFCFD"', '#070B15'),
                         ('<section class="team" id="team" data-bg="#FBFCFD"', '#06090F'),
                         ('<footer data-bg="#FBFCFD"', '#04060C')):
        assert html.count(marca) == 1, 'no esta, o esta repetido: ' + marca[:40]
        html = html.replace(marca, re.sub(r'data-bg="[^"]*"', 'data-bg="%s"' % color, marca), 1)
    return html


if __name__ == '__main__':
    import sys, io
    p = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    s = io.open(p, encoding='utf-8').read()
    salida = aplicar(s)
    io.open(p, 'w', encoding='utf-8').write(salida)
    print('nocturno aplicado')
