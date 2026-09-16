# -*- coding: utf-8 -*-
"""Curvas de nivel: un campo escalar suave, cortado a varias alturas."""
import math, random


def campo(semilla, nb, W, H, sesgo=0.0):
    r = random.Random(semilla)
    bultos = []
    for _ in range(nb):
        # «sesgo» empuja las lomas hacia abajo. Hace falta en la version
        # vertical: ahi el hueco limpio es la FRANJA DE ARRIBA, y una mascara
        # sola no basta —el relieve seguia siendo mas denso justo en el corte—.
        # Lo que hay que mover es el terreno, no taparlo.
        bultos.append((r.uniform(-0.15, 1.15) * W,
                       (sesgo + r.uniform(-0.15, 1.15) * (1.0 - sesgo)) * H,
                       r.uniform(0.055, 0.17) * max(W, H), r.choice((1.0, 1.0, -1.0)) * r.uniform(.5, 1.0)))
    # El campo se APAGA hacia fuera. Sin esto las curvas salen del lienzo, se
    # quedan abiertas y no hay manera de rellenarlas: lo que se dibuja son
    # rayas sueltas, no un relieve. Con la ventana, toda curva por encima de
    # cero es un lazo cerrado dentro del papel, y apilados dan el volumen.
    #
    # Y la ventana es RADIAL, no rectangular. Con una rectangular las curvas
    # mas bajas seguian el borde del papel y lo que aparecia era un marco de
    # esquinas redondeadas: veintiseis rectangulos concentricos, o sea el
    # cuaderno otra vez por otro camino. En radial las de fuera son elipses.
    def ventana(t):
        t = min(1.0, max(0.0, t))
        return t * t * (3 - 2 * t)
    def f(x, y):
        v = 0.0
        for (cx, cy, s, a) in bultos:
            d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s)
            if d2 < 24:
                v += a * math.exp(-d2)
        dx, dy = (x - W / 2.0) / (W / 2.0), (y - H / 2.0) / (H / 2.0)
        rr = math.hypot(dx, dy) / 1.28
        return v * ventana((1.0 - rr) / 0.30)
    return f


def marchar(f, W, H, paso, nivel):
    """Marching squares: devuelve segmentos [(x1,y1,x2,y2)] del nivel."""
    nx, ny = int(W / paso) + 1, int(H / paso) + 1
    g = [[f(i * paso, j * paso) - nivel for i in range(nx + 1)] for j in range(ny + 1)]
    seg = []
    def interp(xa, ya, va, xb, yb, vb):
        t = 0.5 if va == vb else va / (va - vb)
        return (xa + (xb - xa) * t, ya + (yb - ya) * t)
    for j in range(ny):
        for i in range(nx):
            x0, y0, x1, y1 = i * paso, j * paso, (i + 1) * paso, (j + 1) * paso
            v = (g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i])
            idx = (1 if v[0] > 0 else 0) | (2 if v[1] > 0 else 0) | (4 if v[2] > 0 else 0) | (8 if v[3] > 0 else 0)
            if idx in (0, 15):
                continue
            A = interp(x0, y0, v[0], x1, y0, v[1])   # arriba
            B = interp(x1, y0, v[1], x1, y1, v[2])   # derecha
            C = interp(x1, y1, v[2], x0, y1, v[3])   # abajo
            D = interp(x0, y1, v[3], x0, y0, v[0])   # izquierda
            T = {1:(D,A),2:(A,B),3:(D,B),4:(B,C),6:(A,C),7:(D,C),
                 8:(C,D),9:(C,A),11:(C,B),12:(B,D),13:(B,A),14:(A,D)}
            if idx in (5, 10):
                seg.append((D[0],D[1],A[0],A[1])); seg.append((B[0],B[1],C[0],C[1]))
                continue
            p, q = T[idx]
            seg.append((p[0],p[1],q[0],q[1]))
    return seg


def cadenas(seg, tol=0.6):
    """Encadena segmentos sueltos en polilineas, que es lo que se puede dibujar
       como un <path> continuo en vez de mil trozos."""
    from collections import defaultdict
    key = lambda x, y: (round(x / tol), round(y / tol))
    ady = defaultdict(list)
    for s in seg:
        ady[key(s[0], s[1])].append(s)
        ady[key(s[2], s[3])].append(s)
    usados = set()
    salida = []
    for i, s in enumerate(seg):
        if i in usados:
            continue
        idx = {id(x): k for k, x in enumerate(seg)}
        pts = [(s[0], s[1]), (s[2], s[3])]
        usados.add(i)
        for extremo in (0, 1):
            while True:
                p = pts[0] if extremo == 0 else pts[-1]
                sig = None
                for c in ady[key(p[0], p[1])]:
                    k = idx[id(c)]
                    if k in usados:
                        continue
                    a, b = (c[0], c[1]), (c[2], c[3])
                    if key(*a) == key(*p):
                        sig = (k, b); break
                    if key(*b) == key(*p):
                        sig = (k, a); break
                if not sig:
                    break
                usados.add(sig[0])
                if extremo == 0:
                    pts.insert(0, sig[1])
                else:
                    pts.append(sig[1])
        if len(pts) > 3:
            salida.append(pts)
    return salida


def adelgaza(pts, tol):
    """Quita puntos que no cambian el dibujo (Douglas-Peucker).

    Marching squares saca un punto por celda y eso son curvas de trescientos
    puntos donde con treinta se ve igual. Sin esto el archivo se fue a 392 KB,
    que para un fondo es un disparate: lo que se gana en el dibujo se pierde
    en la carga.
    """
    if len(pts) < 3:
        return pts

    def dist(p, a, b):
        (x, y), (xa, ya), (xb, yb) = p, a, b
        dx, dy = xb - xa, yb - ya
        L = dx * dx + dy * dy
        if L == 0:
            return ((x - xa) ** 2 + (y - ya) ** 2) ** 0.5
        t = max(0.0, min(1.0, ((x - xa) * dx + (y - ya) * dy) / L))
        return ((x - xa - t * dx) ** 2 + (y - ya - t * dy) ** 2) ** 0.5

    def dp(a, b):
        peor, idx = 0.0, -1
        for i in range(a + 1, b):
            dd = dist(pts[i], pts[a], pts[b])
            if dd > peor:
                peor, idx = dd, i
        if peor <= tol:
            return [pts[a]]
        return dp(a, idx) + dp(idx, b)

    import sys as _s
    lim = _s.getrecursionlimit()
    _s.setrecursionlimit(max(lim, len(pts) * 3 + 100))
    try:
        return dp(0, len(pts) - 1) + [pts[-1]]
    finally:
        _s.setrecursionlimit(lim)
