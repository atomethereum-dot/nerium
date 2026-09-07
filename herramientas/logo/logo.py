# -*- coding: utf-8 -*-
"""El cubo de Nereum, reconstruido como vector desde el render entregado.

Todo lo de aqui esta medido sobre nereum_cube_logo_v4_polished.png (787x785),
no estimado a ojo. La cara se ajusto como cuadrado girado: lado 517,9 px,
centro (393,0 · 390,8), giro -16,96 grados. Sobre esa cara, y en sus propios
ejes, se midio lo demas:

  · el degradado de la plata es un PLANO, ajustado por minimos cuadrados sobre
    la zona limpia (sin brillo y sin banda):
        R = 172,7 - 30,3·u - 20,2·v      G = 176,7 - 30,3·u - 20,2·v
        B = 187,8 - 32,9·u - 21,7·v      (u,v en fracciones del lado)
    o sea: claro en la esquina de arriba a la izquierda, oscuro en la de abajo
    a la derecha, y la direccion del gradiente es (0,832 · 0,555).
  · el brillo es una raya larga y estrecha, no una franja recta ni un ovalo
    redondo: su cresta sigue u = -0,710·v - 0,321, o sea que va inclinada 35,4
    grados respecto al eje vertical de la cara. Mide 0,080 del lado de ancho a
    media altura y 0,429 de largo, y su punto mas brillante esta en
    (u -0,175 · v -0,200), donde la cara sube +67 sobre su base: blanco al 92%.
  · el canto es plano, #57595E, y asoma 0,031 del lado por la derecha y 0,060
    por abajo, medido en los ejes de la cara. Iba calculado en ejes de PANTALLA
    con un 1,4 puesto a ojo, asi que al girar el cubo el grosor cambiaba.
  · la banda es #FCFCFC y ocupa el 18,5% inferior de la cara.

Lo unico del render que no se traslada es el grano metalico y la sombra
arrojada: el grano no se ve por debajo de 200 px y pedirlo en un favicon
significa un filtro que a 16 px solo ensucia, y la sombra es de la lamina
flotando sobre blanco, no de la marca (en la web la pone el CSS).
"""
import math

GIRO = -45.0                     # grados; negativo = sentido antihorario en pantalla
BANDA = 0.185                    # fracción inferior de la cara que es blanca
CANTO_U, CANTO_V = 0.031, 0.060  # cuánto asoma el canto, en ejes de la cara

PLATA_CLARA = '#C6CAD7'          # esquina superior izquierda de la cara
PLATA_OSCURA = '#9498A1'         # esquina inferior derecha
CANTO_COLOR = '#57595E'
BANDA_COLOR = '#FCFCFC'

EJE_U, EJE_V = 0.832, 0.555      # dirección del degradado, en ejes de la cara
BRILLO_U, BRILLO_V = -0.175, -0.200   # punto más brillante, desde el centro de la cara
BRILLO_RU, BRILLO_RV = 0.118, 0.631   # radios de la raya: estrecha y larga
BRILLO_INCL = 35.4                    # grados que se inclina respecto al eje vertical
BRILLO_ALFA = 0.92


def cara(lado, cx, cy, giro=None):
    """Las cuatro esquinas de un cuadrado girado alrededor de (cx,cy)."""
    if giro is None:
        giro = GIRO              # se lee al llamar, no al definir
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


def piezas(lado, cx, cy):
    """La cara, el canto y la banda, ya girados. Sin escalar ni encajar."""
    sup_izq, sup_der, inf_der, inf_izq = cara(lado, cx, cy)
    r = math.radians(GIRO)
    ux, uy = math.cos(r), math.sin(r)
    vx, vy = -math.sin(r), math.cos(r)
    dx = (CANTO_U*ux + CANTO_V*vx) * lado
    dy = (CANTO_U*uy + CANTO_V*vy) * lado
    canto = [sup_der, (sup_der[0]+dx, sup_der[1]+dy), (inf_der[0]+dx, inf_der[1]+dy),
             (inf_izq[0]+dx, inf_izq[1]+dy), inf_izq, inf_der]
    return [sup_izq, sup_der, inf_der, inf_izq], canto


def degradados(caraf, id_plata, id_brillo):
    """Los dos degradados, en el espacio en que se dibuja la cara.

    Van en userSpaceOnUse y atados a los ejes de la propia cara: asi la luz
    sigue viniendo de la misma esquina se gire lo que se gire el cubo. Con el
    degradado atado a la caja del dibujo, girar la figura le movia la luz."""
    sup_izq, sup_der, inf_der, inf_izq = caraf
    cx = sum(p[0] for p in caraf) / 4.0
    cy = sum(p[1] for p in caraf) / 4.0
    lado = math.dist(sup_izq, sup_der)
    ux = ((sup_der[0]-sup_izq[0])/lado, (sup_der[1]-sup_izq[1])/lado)
    vx = ((inf_izq[0]-sup_izq[0])/lado, (inf_izq[1]-sup_izq[1])/lado)

    # el plano de la plata, como recta que va de proyección mínima a máxima
    ejex = EJE_U*ux[0] + EJE_V*vx[0]
    ejey = EJE_U*ux[1] + EJE_V*vx[1]
    medio = (EJE_U + EJE_V) / 2.0 * lado
    x1, y1 = cx - ejex*medio, cy - ejey*medio
    x2, y2 = cx + ejex*medio, cy + ejey*medio

    plata = ('<linearGradient id="%s" gradientUnits="userSpaceOnUse" '
             'x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f">'
             '<stop offset="0" stop-color="%s"/>'
             '<stop offset="1" stop-color="%s"/></linearGradient>'
             % (id_plata, x1, y1, x2, y2, PLATA_CLARA, PLATA_OSCURA))

    # el reflejo: un óvalo alineado con los ejes de la cara
    bx = cx + (BRILLO_U*ux[0] + BRILLO_V*vx[0]) * lado
    by = cy + (BRILLO_U*ux[1] + BRILLO_V*vx[1]) * lado
    # la raya no baja recta por la cara: cae hacia la izquierda, y su eje
    # corto (el que le da el grosor) va girado otro tanto
    ang = math.degrees(math.atan2(ux[1], ux[0])) + BRILLO_INCL
    brillo = ('<radialGradient id="%s" gradientUnits="userSpaceOnUse" '
              'cx="0" cy="0" r="1" '
              'gradientTransform="translate(%.2f %.2f) rotate(%.2f) scale(%.2f %.2f)">'
              '<stop offset="0" stop-color="#fff" stop-opacity="%.2f"/>'
              '<stop offset=".36" stop-color="#fff" stop-opacity="%.2f"/>'
              '<stop offset=".70" stop-color="#fff" stop-opacity="%.2f"/>'
              '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
              % (id_brillo, bx, by, ang, BRILLO_RU*lado, BRILLO_RV*lado,
                 BRILLO_ALFA, BRILLO_ALFA*0.47, BRILLO_ALFA*0.11))
    return plata, brillo


def trozos(caraf, canto, id_plata, id_brillo, brillo_si=True):
    """Los <path> del cubo, de atrás a delante."""
    sup_izq, sup_der, inf_der, inf_izq = caraf
    banda = [entre(sup_izq, inf_izq, 1 - BANDA), entre(sup_der, inf_der, 1 - BANDA),
             inf_der, inf_izq]
    salida = ['<path fill="%s" d="%s"/>' % (CANTO_COLOR, d(canto)),
              '<path fill="url(#%s)" d="%s"/>' % (id_plata, d(caraf)),
              '<path fill="%s" d="%s"/>' % (BANDA_COLOR, d(banda))]
    if brillo_si:
        # el reflejo va sobre la cara y NO sobre la banda: en el render la
        # banda es blanco liso, el brillo muere donde empieza
        salida.insert(2, '<path fill="url(#%s)" d="%s"/>' % (id_brillo, d(caraf)))
    return salida


def svg(px=512, sencillo=False, plano=False, margen=0.04):
    """`sencillo` quita el reflejo, para 16 px, donde ocupa un píxel.
       `plano` devuelve una silueta negra de una pieza, para Safari.
       `margen` es la fracción de lienzo que queda libre a cada lado.

       El cubo se encaja para LLENAR el lienzo. Antes ocupaba dos tercios y el
       resto era transparente: el navegador dibuja el favicon dentro de un hueco
       fijo, así que ese aire salía como separación entre el icono y el título
       de la pestaña, y el logo parecía más pequeño de lo que es."""
    caraf, canto = piezas(px * 0.66, px / 2, px / 2)

    todos = caraf + canto
    xs = [p[0] for p in todos]; ys = [p[1] for p in todos]
    ancho, alto = max(xs)-min(xs), max(ys)-min(ys)
    m = px * margen
    esc = (px - 2*m) / max(ancho, alto)
    tx = m + (px - 2*m - ancho*esc)/2 - min(xs)*esc
    ty = m + (px - 2*m - alto*esc)/2 - min(ys)*esc
    enc = lambda p: (tx + p[0]*esc, ty + p[1]*esc)
    caraf = [enc(p) for p in caraf]; canto = [enc(p) for p in canto]

    if plano:
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">\n'
                '<path d="%s"/>\n<path d="%s"/>\n</svg>\n'
                % (px, px, d(caraf), d(canto)))

    plata, brillo = degradados(caraf, 'plata', 'brillo')
    defs = plata if sencillo else plata + brillo
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">\n'
            '<defs>%s</defs>\n%s\n</svg>\n'
            % (px, px, defs,
               '\n'.join(trozos(caraf, canto, 'plata', 'brillo', not sencillo))))


if __name__ == '__main__':
    # La pestaña llena su hueco; los iconos de app respiran algo más, que se
    # dibujan sobre una baldosa con esquinas redondeadas.
    open('favicon.svg','w').write(svg(512, margen=0.04))
    open('simple.svg','w').write(svg(512, sencillo=True, margen=0.04))
    open('app.svg','w').write(svg(512, margen=0.09))
    open('app-simple.svg','w').write(svg(512, sencillo=True, margen=0.09))
    open('mask-icon.svg','w').write(svg(512, plano=True, margen=0.04))
    print('svg listos')


# ── el mismo cubo, para los <symbol> que la web usa por dentro ──────────────
def _encajado(caja, margen):
    caraf, canto = piezas(400.0, caja/2.0, caja/2.0)
    todos = caraf + canto
    xs = [p[0] for p in todos]; ys = [p[1] for p in todos]
    ancho, alto = max(xs)-min(xs), max(ys)-min(ys)
    esc = (caja - 2*margen) / max(ancho, alto)
    tx = margen + (caja - 2*margen - ancho*esc)/2 - min(xs)*esc
    ty = margen + (caja - 2*margen - alto*esc)/2 - min(ys)*esc
    return caraf, canto, tx, ty, esc


def defs_web(caja=672, margen=14):
    """Los degradados que van sueltos en el documento, en el espacio LOCAL del
       <g> (userSpaceOnUse se resuelve dentro de la transformación del grupo)."""
    caraf, _, _, _, _ = _encajado(caja, margen)
    plata, brillo = degradados(caraf, 'nrmPlata', 'nrmBrillo')
    return plata, brillo


def simbolo(caja=672, margen=14, brillo_si=True):
    """Devuelve el interior de un <symbol viewBox="0 0 caja caja">, encajado
       para ocupar el mismo hueco que la marca anterior."""
    caraf, canto, tx, ty, esc = _encajado(caja, margen)
    return ('  <g transform="translate(%.2f %.2f) scale(%.4f)">\n    %s\n  </g>'
            % (tx, ty, esc,
               '\n    '.join(trozos(caraf, canto, 'nrmPlata', 'nrmBrillo', brillo_si))))
