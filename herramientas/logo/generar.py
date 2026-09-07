# -*- coding: utf-8 -*-
"""Genera todo el juego de iconos desde el vector."""
import io, struct, cairosvg
from PIL import Image

def png(fuente, px):
    b = cairosvg.svg2png(url=fuente, output_width=px, output_height=px)
    return Image.open(io.BytesIO(b)).convert('RGBA')

# Por debajo de 48 px el brillo y los matices del degradado se convierten en
# ruido: ahí va la versión sencilla, que a ese tamaño se lee mejor.
def icono(px, app=False):
    sencillo = px <= 16   # solo a 16 px sobra el reflejo: ahi ocupa un pixel
    if app:
        return png('app-simple.svg' if sencillo else 'app.svg', px)
    return png('simple.svg' if sencillo else 'favicon.svg', px)

SALIDA = '/home/user/nerium/'
# El de la pestaña llena su hueco. Los de app llevan algo de margen: iOS y
# Android los dibujan sobre una baldosa redondeada y pegados al borde quedan
# apretados.
for nombre, px, app in [('favicon-32.png',32,False),
                        ('icon-192.png',192,True), ('icon-512.png',512,True),
                        ('apple-touch-icon.png',180,True), ('apple-touch-icon-167.png',167,True),
                        ('apple-touch-icon-152.png',152,True), ('apple-touch-icon-120.png',120,True),
                        ('mstile-150.png',150,True)]:
    icono(px, app).save(SALIDA + nombre, 'PNG', optimize=True)
    print(' ', nombre)

# ── el .ico, escrito a mano ────────────────────────────────────────────────
# PIL redimensiona una sola imagen para todos los tamaños; aquí cada uno se
# dibuja desde el vector al tamaño que le toca, que es lo que evita que el de
# 16 px salga de reducir el de 256.
TAM = [16, 32, 48, 64, 128, 256]
trozos = []
for t in TAM:
    b = io.BytesIO()
    icono(t).save(b, 'PNG', optimize=True)
    trozos.append(b.getvalue())

cab = struct.pack('<HHH', 0, 1, len(TAM))
desplazamiento = 6 + 16*len(TAM)
entradas, cuerpos = b'', b''
for t, datos in zip(TAM, trozos):
    entradas += struct.pack('<BBBBHHII',
        0 if t >= 256 else t, 0 if t >= 256 else t, 0, 0, 1, 32,
        len(datos), desplazamiento)
    cuerpos += datos
    desplazamiento += len(datos)
open(SALIDA + 'favicon.ico','wb').write(cab + entradas + cuerpos)
print('  favicon.ico  (%s)' % ', '.join(str(t) for t in TAM))

open(SALIDA + 'favicon.svg','w').write(open('favicon.svg').read())
cab_mask = ('<!-- Safari, al anclar una pestana, ignora el color y pinta la silueta con\n'
            '     el tono que elija el usuario: por eso va negra y de una pieza. -->\n')
sv = open('mask-icon.svg').read()
open(SALIDA + 'mask-icon.svg','w').write(
    sv.replace('>\n', '>\n' + cab_mask, 1))
print('  favicon.svg, mask-icon.svg')
