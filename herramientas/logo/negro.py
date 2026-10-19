# -*- coding: utf-8 -*-
"""La piramide, asentada sobre negro (y suelta, sin fondo).

Robinhood pinta la ficha del token sobre su propio fondo; un PNG transparente
queda a merced de ese fondo. Aqui el negro va dentro del archivo.

El vector se dibuja 8 veces mas grande y luego se reduce: las puntas del
rombo son diagonales y a 48 px, sin ese margen, se escalonan.
"""
import io, cairosvg
from PIL import Image

FUENTE = '/home/user/nerium/herramientas/logo/favicon.svg'
SALIDA = '/home/user/nerium/img/'
NEGRO  = (0, 0, 0)
SUPER  = 8

for px in (48, 256, 512):
    g = px * SUPER
    b = cairosvg.svg2png(url=FUENTE, output_width=g, output_height=g)
    rombo = Image.open(io.BytesIO(b)).convert('RGBA')
    lienzo = Image.new('RGB', (g, g), NEGRO)
    lienzo.paste(rombo, (0, 0), rombo)          # el alpha del rombo manda
    lienzo = lienzo.resize((px, px), Image.LANCZOS)
    ruta = '%snrm-%d-negro.png' % (SALIDA, px)
    lienzo.save(ruta, 'PNG', optimize=True)
    print(' ', ruta)
    # y la misma ficha sin fondo, para quien pinte la suya sobre su color
    suelto = rombo.convert('RGBa').resize((px, px), Image.LANCZOS).convert('RGBA')
    ruta = '%snrm-%d.png' % (SALIDA, px)
    suelto.save(ruta, 'PNG', optimize=True)
    print(' ', ruta)
    # la ficha del token en la raiz -la que se da a carteras y listados-,
    # sobre negro como siempre
    if px in (256, 512):
        ruta = '/home/user/nerium/nrm-token%s.png' % ('' if px == 512 else '-256')
        lienzo.save(ruta, 'PNG', optimize=True)
        print(' ', ruta)
