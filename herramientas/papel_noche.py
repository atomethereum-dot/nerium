# -*- coding: utf-8 -*-
"""El dibujo de fondo, en version de noche.

Las bandas claras llevan un campo de placas dibujado -papel.svg en escritorio y
papel-alto.svg en vertical-. Al pasar la pagina a negro ese dibujo se queda
siendo claro, y sobre un suelo de #07090A no es una textura: es una mancha
blanca del tamano de la pantalla.

Se podria quitar. Seria peor: el dibujo es la unica cosa que ata el fondo de la
mitad clara con el campo de losas de la portada, y sin el las bandas quedan en
color liso, que es de donde se venia.

Asi que se voltea: a cada color del archivo se le invierte la luminancia. Y
DESPUES se gira al tono de la marca con el mismo girador que la pagina, que es
el paso que faltaba: volteando solo la luz, las placas conservaban su azul y en
pantalla se veian rectangulos azules flotando sobre el negro de una pagina
verde. El dibujo es el mismo -misma composicion, mismas placas, mismo hueco en
el medio para leer-, pero en negativo y en lima.

    python3 herramientas/papel_noche.py
"""
import colorsys
import io
import re
import sys

sys.path.insert(0, '/home/user/nerium/herramientas')
import neon

RAIZ = '/home/user/nerium/img/'
FUENTES = ('papel.svg', 'papel-alto.svg')


def _voltea(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    r2, g2, b2 = [x * 255 for x in colorsys.hls_to_rgb(h, 1.0 - l, s)]
    # y al tono de la marca, sin el tiron de acento: son seis grises de placa y
    # subirlos al minimo del acento los dejaria todos iguales.
    v = neon._verde(r2, g2, b2, realza=False) or neon._verdea_neutro(r2, g2, b2)
    if v:
        return v
    return (round(r2), round(g2), round(b2))


def _hex(m):
    c = m.group(0)[1:]
    if len(c) == 3:
        c = ''.join(x * 2 for x in c)
    return '#%02X%02X%02X' % _voltea(int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))


def _rgb(m):
    n = [int(float(x)) for x in m.group(1).split(',')[:3]]
    return 'rgb(%d,%d,%d)' % _voltea(*n)


def generar():
    for f in FUENTES:
        s = io.open(RAIZ + f, encoding='utf-8').read()
        s = re.sub(r'#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b', _hex, s)
        s = re.sub(r'rgb\(([^)]*)\)', _rgb, s)
        salida = f.replace('.svg', '-noche.svg')
        io.open(RAIZ + salida, 'w', encoding='utf-8').write(s)
        print('  %s  %d bytes' % (salida, len(s)))


if __name__ == '__main__':
    generar()
