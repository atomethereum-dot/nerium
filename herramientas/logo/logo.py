# -*- coding: utf-8 -*-
"""El cubo de Nereum, reconstruido como vector desde el render entregado.

Medido sobre nereum_cube_logo_v4_polished.png (787x785):
  · la cara gira 17,1 grados
  · la banda blanca ocupa el 18 % inferior de la cara
  · el canto del cubo asoma a la derecha y abajo
  · la plata va de #DCE0EA arriba a #9B9FA9 abajo
"""
import math

GIRO = -17.1                     # grados; negativo = sentido antihorario en pantalla
BANDA = 0.185                    # fracción inferior de la cara que es blanca
CANTO = 0.058                    # grosor del cubo, en fracción del lado

def cara(lado, cx, cy, giro=GIRO):
    """Las cuatro esquinas de un cuadrado girado alrededor de (cx,cy)."""
    r = math.radians(giro)
    h = lado / 2
    return [(cx + x*math.cos(r) - y*math.sin(r),
             cy + x*math.sin(r) + y*math.cos(r))
            for x, y in ((-h,-h), (h,-h), (h,h), (-h,h))]

def d(pts, cerrar=True):
    s = 'M' + ' L'.join('%.2f %.2f' % p for p in pts)
    return s + ' Z' if cerrar else s

def entre(a, b, t):
    return (a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t)

def svg(px=512, sencillo=False, plano=False):
    """`sencillo` quita brillo y matices, para 16 y 32 px.
       `plano` devuelve una silueta negra de una pieza, para Safari."""
    lado = px * 0.66
    cx = cy = px / 2
    dx = lado * CANTO * math.cos(math.radians(GIRO + 45)) * 1.4
    dy = lado * CANTO * math.sin(math.radians(GIRO + 45)) * 1.4 + lado * CANTO

    sup_izq, sup_der, inf_der, inf_izq = cara(lado, cx, cy)
    # el canto: la misma cara desplazada, y el puente entre las dos
    c_sup_der = (sup_der[0]+dx, sup_der[1]+dy)
    c_inf_der = (inf_der[0]+dx, inf_der[1]+dy)
    c_inf_izq = (inf_izq[0]+dx, inf_izq[1]+dy)
    canto = [sup_der, c_sup_der, c_inf_der, c_inf_izq, inf_izq, inf_der]

    if plano:
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">\n'
                '<path d="%s"/>\n<path d="%s"/>\n</svg>\n'
                % (px, px, d([sup_izq, sup_der, inf_der, inf_izq]), d(canto)))

    # la banda blanca: el trozo inferior de la cara
    corte_izq = entre(sup_izq, inf_izq, 1 - BANDA)
    corte_der = entre(sup_der, inf_der, 1 - BANDA)
    banda = [corte_izq, corte_der, inf_der, inf_izq]

    brillo = ''
    if not sencillo:
        # el reflejo, una franja estrecha que cruza la cara cerca del canto izquierdo
        a = entre(sup_izq, sup_der, 0.30); b = entre(sup_izq, sup_der, 0.375)
        c = entre(inf_izq, inf_der, 0.115); e = entre(inf_izq, inf_der, 0.045)
        brillo = ('<path fill="url(#brillo)" opacity=".8" d="%s"/>\n'
                  % d([a, b, c, e]))

    grad = ('<linearGradient id="plata" x1="0" y1="0" x2=".28" y2="1">'
            '<stop offset="0" stop-color="#E7EAF1"/>'
            '<stop offset=".38" stop-color="#C6CBD7"/>'
            '<stop offset=".74" stop-color="#A9AEBB"/>'
            '<stop offset="1" stop-color="#9298A6"/></linearGradient>')
    if sencillo:
        grad = ('<linearGradient id="plata" x1="0" y1="0" x2=".28" y2="1">'
                '<stop offset="0" stop-color="#D8DCE6"/>'
                '<stop offset="1" stop-color="#9AA0AE"/></linearGradient>')
    brillo_def = ('<linearGradient id="brillo" x1="0" y1="0" x2="1" y2="0">'
                  '<stop offset="0" stop-color="#fff" stop-opacity="0"/>'
                  '<stop offset=".5" stop-color="#fff"/>'
                  '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>')

    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">\n'
            '<defs>%s%s</defs>\n'
            '<path fill="#6E7482" d="%s"/>\n'
            '<path fill="url(#plata)" d="%s"/>\n'
            '<path fill="#FAFBFC" d="%s"/>\n'
            '%s</svg>\n'
            % (px, px, grad, brillo_def,
               d(canto), d([sup_izq, sup_der, inf_der, inf_izq]), d(banda), brillo))

if __name__ == '__main__':
    open('favicon.svg','w').write(svg(512))
    open('simple.svg','w').write(svg(512, sencillo=True))
    open('mask-icon.svg','w').write(svg(512, plano=True))
    print('svg listos')
