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
  el destino   152 grados: verde primavera, el verde de terminal. Con la
               saturacion empujada -x1,22 y suelo de 0,62 en los acentos
               vivos- es lo que da el fosforito sin irse al lima de neon de
               feria.

Solo dentro de <style> y de los «data-acc». El marcado lleva los colores de
marca AJENOS escritos a mano -el azul de Benzinga, el verde de MarketWatch, el
rojo de Morningstar, los logotipos de las carteras- y esos no son nuestros: no
se rotan.

`montar_home.py` lo aplica en el paso 38.
"""
import colorsys
import re

MARCA = '/* ══ neon ══'
FIN = '/* ══ fin: neon ══ */'

TONO_MIN, TONO_MAX = 196.0, 268.0    # la banda del azul, en grados
DESTINO = 152.0 / 360.0              # verde primavera
SAT_MIN = 0.12                       # por debajo es tinta, no marca


def _lum(r, g, b):
    """La luminancia relativa de WCAG, que es donde vive el contraste."""
    def c(v):
        v = v / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)


def _verde(r, g, b):
    """El mismo color, girado al verde y con la MISMA luminancia."""
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    grados = h * 360.0
    if not (TONO_MIN <= grados <= TONO_MAX) or s < SAT_MIN:
        return None
    s2 = min(1.0, max(s * 1.22, 0.62 if s > 0.45 else s * 1.22))
    objetivo = _lum(r, g, b)
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


def _hex(m):
    t = m.group(0)
    c = t[1:]
    if len(c) == 3:
        c = ''.join(x * 2 for x in c)
    v = _verde(int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))
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
    v = _verde(r, g, b)
    if not v:
        return m.group(0)
    resto = (',' + ','.join(n[3:])) if len(n) > 3 else ''
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


def aplicar(html):
    """Idempotente: si ya esta girado, girar otra vez no mueve nada."""
    i = html.index('<style>')
    j = html.index('\n</style>') + len('\n</style>')
    hoja = _girar(html[i:j])
    html = html[:i] + hoja + html[j:]
    # los acentos que cada banda declara en su marcado, y la marca del
    # navegador: la barra del movil y el icono anclado tambien son branding
    for pat in (r'(data-acc=")(#[0-9A-Fa-f]{6})(")',
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
    if MARCA in html:
        a = html.index(MARCA)
        b = html.index(FIN, a) + len(FIN)
        html = html[:a] + CSS.strip('\n') + html[b:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
    return html
