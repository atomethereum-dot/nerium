# -*- coding: utf-8 -*-
"""El logo de Nereum desde octubre de 2026: la piramide vista desde arriba
(el «modelo 2»), como vector, y puesta en todas las paginas.

  python3 piramide.py vectoriza RENDER.png   -> piramide.svg (el original)
  python3 piramide.py pon                    -> fuentes de iconos y paginas

El RENDER es el original de 4096 px sin fondo:
  descargas/logo-3d/negro/nereum-logo-02-transparente-4096.png

Nada se dibuja a ojo: todo se mide sobre el render.
  · la silueta es un cuadrado girado 45 grados con las esquinas redondeadas:
    la semidiagonal aguda y el radio salen de donde cae el alfa;
  · cada cara es un PLANO de color, ajustado por minimos cuadrados sobre su
    zona limpia (error medio de 1 a 2 sobre 255): de ahi su degradado lineal;
  · las cuatro aristas son biseles de cromo: una tira a lo largo del eje con
    el perfil de color medido de lado a lado, promedio de tres alturas;
  · el canto, por cara, con su perfil medido, y por fuera el marco de cromo
    que sigue la silueta redondeada;
  · el nudo del centro, donde se juntan los cuatro biseles.
Rasterizado y comparado con el render, la diferencia media es de 2,3 sobre
255.

«pon» escribe las fuentes de los iconos (favicon, app, sencillo, mascara) y
cambia el logo dentro de las paginas: cada copia del logo viejo -un <defs>
con dos degradados y un <g> con cuatro caminos- se sustituye por la piramide
con sus ids propios, para que dos copias en la misma pagina no se pisen.
Se puede volver a pasar: reconoce tambien su propia piramide."""
import sys, os, re, math
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
MAESTRO = os.path.join(AQUI, 'piramide.svg')


# ── 1 · vectorizar el render ──────────────────────────────────────────────
def vectoriza(src):
    from PIL import Image
    a = np.asarray(Image.open(src).convert('RGBA')).astype(float)
    N = a.shape[0]; C = (N - 1) / 2
    s2 = 2 ** -.5
    H = lambda c: '#%02X%02X%02X' % tuple(int(max(0, min(255, round(v)))) for v in c)
    px = lambda x, y: a[int(round(y)), int(round(x)), :3]

    def borde(du, dv):
        t = N * .24
        while a[int(round(C + dv * t * s2)), int(round(C + du * t * s2)), 3] >= 128: t += .25
        return t
    D = np.mean([borde(-1, -1), borde(1, -1), borde(-1, 1), borde(1, 1)])  # centro -> lado
    Rs = D * math.sqrt(2)                                                   # semidiagonal aguda
    ys = np.where(a[:, int(C), 3] > 128)[0]
    ext = C - ys.min()                                                      # punta redondeada
    rho = (Rs - ext) / (math.sqrt(2) - 1)
    V = {'N': (C, C - Rs), 'E': (C + Rs, C), 'S': (C, C + Rs), 'W': (C - Rs, C)}
    tri = {'TL': ('W', 'N'), 'TR': ('N', 'E'), 'BR': ('E', 'S'), 'BL': ('S', 'W')}
    f1 = lambda v: ('%.1f' % v).rstrip('0').rstrip('.')
    P = lambda pts: 'M' + ' L'.join(f1(x) + ',' + f1(y) for x, y in pts) + 'Z'

    def paradas(prof, tol=5):
        t0, t1 = prof[0][0], prof[-1][0]; out = []; prev = None
        for i, (t, c) in enumerate(prof):
            if prev is None or np.abs(c - prev).max() > tol or i == len(prof) - 1:
                out.append(((t - t0) / (t1 - t0), c)); prev = c
        return out

    def degradado(gid, x1, y1, x2, y2, st, tag='linearGradient'):
        return (f'<{tag} id="{gid}" gradientUnits="userSpaceOnUse" x1="{f1(x1)}" y1="{f1(y1)}" '
                f'x2="{f1(x2)}" y2="{f1(y2)}">' +
                ''.join(f'<stop offset="{o:.3f}" stop-color="{H(c)}"/>' for o, c in st) + f'</{tag}>')
    defs, cuerpo = [], []

    # caras: plano de color por cara
    paso = max(1, N // 680)
    yy, xx = np.mgrid[0:N:paso, 0:N:paso]
    rgb = a[0:N:paso, 0:N:paso, :3]; al = a[0:N:paso, 0:N:paso, 3]
    ux, vy = xx - C, yy - C
    dentro = (np.abs(ux) + np.abs(vy) < Rs * .9) & (al > 250)
    lejos = Rs * .034
    cuad = {'TL': (ux < -lejos) & (vy < -lejos), 'TR': (ux > lejos) & (vy < -lejos),
            'BL': (ux < -lejos) & (vy > lejos), 'BR': (ux > lejos) & (vy > lejos)}
    for k in ('TL', 'TR', 'BR', 'BL'):
        m = cuad[k] & dentro
        X = np.stack([np.ones(m.sum()), ux[m], vy[m]], 1)
        co = [np.linalg.lstsq(X, rgb[..., c][m], rcond=None)[0] for c in range(3)]
        g = np.mean([c[1:] for c in co], 0); g = g / np.linalg.norm(g)
        pts = [(C, C), V[tri[k][0]], V[tri[k][1]]]
        pr = [(p[0] - C) * g[0] + (p[1] - C) * g[1] for p in pts]; lo, hi = min(pr), max(pr)
        x1, y1, x2, y2 = C + g[0] * lo, C + g[1] * lo, C + g[0] * hi, C + g[1] * hi
        st = [(f, [co[c][0] + co[c][1] * (x1 + (x2 - x1) * f - C) + co[c][2] * (y1 + (y2 - y1) * f - C)
                   for c in range(3)]) for f in np.linspace(0, 1, 7)]
        defs.append(degradado('c' + k, x1, y1, x2, y2, st))
        cuerpo.append(f'<path fill="url(#c{k})" d="{P(pts)}"/>')

    # aristas: biseles de cromo a lo largo de los ejes
    W2 = Rs * .027
    for n, ((dx, dy), (qx, qy)) in {'N': ((0, -1), (1, 0)), 'E': ((1, 0), (0, 1)),
                                    'S': ((0, 1), (1, 0)), 'W': ((-1, 0), (0, 1))}.items():
        prof = [(t, np.mean([px(C + dx * f * Rs + qx * t, C + dy * f * Rs + qy * t) for f in (.3, .45, .6)], 0))
                for t in np.arange(-W2, W2 + .01, 1)]
        defs.append(degradado('a' + n, C - qx * W2, C - qy * W2, C + qx * W2, C + qy * W2, paradas(prof)))
        L = Rs + 40
        tira = [(C - qx * W2, C - qy * W2), (C + qx * W2, C + qy * W2),
                (C + qx * W2 + dx * L, C + qy * W2 + dy * L), (C - qx * W2 + dx * L, C - qy * W2 + dy * L)]
        cuña = [(C, C)] + [(C + math.cos(math.atan2(dy, dx) + sg * math.pi / 4) * Rs * 2,
                            C + math.sin(math.atan2(dy, dx) + sg * math.pi / 4) * Rs * 2) for sg in (-1, 1)]
        defs.append(f'<clipPath id="k{n}"><path d="{P(cuña)}"/></clipPath>')
        cuerpo.append(f'<path fill="url(#a{n})" clip-path="url(#k{n})" d="{P(tira)}"/>')

    # canto por cara: la parte de dentro del marco
    canto = {'TL': (-1, -1), 'TR': (1, -1), 'BR': (1, 1), 'BL': (-1, 1)}
    k_in, k_out = Rs * .0084, Rs * .0039
    for k, (du, dv) in canto.items():
        nx, ny = du * s2, dv * s2; tx, ty = -ny, nx
        prof = []
        for s in np.arange(-k_in, -k_out + .01, 1):
            prof.append((s, np.mean([px(C + nx * (D + s) + tx * f * D, C + ny * (D + s) + ty * f * D)
                                     for f in (-.35, -.15, .15, .35)], 0)))
        s0, s1 = prof[0][0], prof[-1][0]
        defs.append(degradado('e' + k, C + nx * (D + s0), C + ny * (D + s0), C + nx * (D + s1), C + ny * (D + s1),
                              paradas(prof)))
        v1, v2 = V[tri[k][0]], V[tri[k][1]]
        off = lambda p, s: (p[0] + nx * s, p[1] + ny * s)
        defs.append(f'<clipPath id="q{k}"><path d="{P([(C, C), (C + du * 3000, C), (C + du * 3000, C + dv * 3000), (C, C + dv * 3000)])}"/></clipPath>')
        cuerpo.append(f'<path fill="url(#e{k})" clip-path="url(#q{k})" d="{P([off(v1, s0), off(v2, s0), off(v2, 30), off(v1, 30)])}"/>')

    # el nudo del centro: la esfera del vertice, con su reflejo claro arriba a la izquierda
    u = Rs / 1788.3
    defs.append(f'<radialGradient id="nudo" gradientUnits="userSpaceOnUse" cx="{f1(C - 2 * u)}" cy="{f1(C - 2 * u)}" r="{f1(30 * u)}">'
                '<stop offset="0" stop-color="#7C8292"/><stop offset=".7" stop-color="#5E6476"/>'
                '<stop offset="1" stop-color="#3E4352"/></radialGradient>')
    cuerpo.append(f'<circle cx="{f1(C + 5 * u)}" cy="{f1(C + 5 * u)}" r="{f1(27 * u)}" fill="url(#nudo)"/>')
    cuerpo.append(f'<rect x="{f1(C - 36 * u)}" y="{f1(C - 21 * u)}" width="{f1(54 * u)}" height="{f1(24 * u)}" '
                  f'rx="{f1(3 * u)}" fill="#D6DEF1" transform="rotate(-45 {f1(C - 9 * u)} {f1(C - 9 * u)})"/>')

    # la silueta y su marco de cromo
    orden = [V['N'], V['E'], V['S'], V['W']]
    hacia = lambda p, q, L: (p[0] + (q[0] - p[0]) / math.hypot(q[0] - p[0], q[1] - p[1]) * L,
                             p[1] + (q[1] - p[1]) / math.hypot(q[0] - p[0], q[1] - p[1]) * L)
    tg = [(hacia(v, orden[i - 1], rho), hacia(v, orden[(i + 1) % 4], rho)) for i, v in enumerate(orden)]
    sil = f'M{f1(tg[0][1][0])},{f1(tg[0][1][1])}'
    for i in range(1, 5):
        A, B = tg[i % 4]
        sil += f' L{f1(A[0])},{f1(A[1])} A{f1(rho)},{f1(rho)} 0 0 1 {f1(B[0])},{f1(B[1])}'
    sil += 'Z'
    fr = [px(C + du * s2 * (D + q) - dv * s2 * f * D, C + dv * s2 * (D + q) + du * s2 * f * D)
          for (du, dv) in canto.values() for f in (-.35, -.15, .15, .35) for q in np.arange(-k_out, 0, 1)]
    cuerpo.append(f'<path d="{sil}" fill="none" stroke="{H(np.mean(fr, 0))}" stroke-width="{f1(2 * k_out)}"/>')
    defs.append(f'<clipPath id="sil"><path d="{sil}"/></clipPath>')

    caja = (C - ext, C - ext, 2 * ext, 2 * ext)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(f1(v) for v in caja)}">'
           f'<defs>{"".join(defs)}</defs><g clip-path="url(#sil)">{"".join(cuerpo)}</g></svg>\n')
    open(MAESTRO, 'w').write(svg)
    print('  piramide.svg  (%d bytes; semidiagonal %.1f, radio %.1f)' % (len(svg), Rs, rho))


# ── 2 · ponerla en su sitio ───────────────────────────────────────────────
def maestro():
    s = open(MAESTRO).read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    defs = re.search(r'<defs>(.*)</defs>', s, re.S).group(1)
    cuerpo = re.search(r'</defs>(.*)</svg>', s, re.S).group(1)
    return vb, defs, cuerpo

def con_prefijo(texto, p):
    """ids propios: id="x" -> id="p-x" y url(#x) -> url(#p-x)"""
    texto = re.sub(r'id="([^"]+)"', lambda m: f'id="{p}{m.group(1)}"', texto)
    return re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{p}{m.group(1)})', texto)

def encaja(vb, lado, margen):
    """transform que lleva la silueta a un cuadro de LADO con MARGEN a cada lado"""
    s = (lado - 2 * margen) / vb[2]
    return f'translate({margen - vb[0] * s:.3f} {margen - vb[1] * s:.3f}) scale({s:.6f})'

# En los 672 de los simbolos el rombo viejo iba de 14 a 658: la piramide
# ocupa lo mismo, asi que la marca no cambia de tamaño en ninguna pagina.
LADO, MARGEN = 672, 14

def bloque(p):
    vb, defs, cuerpo = maestro()
    d = con_prefijo(defs, p)
    g = f'<g data-logo="piramide" transform="{encaja(vb, LADO, MARGEN)}">{con_prefijo(cuerpo, p)}</g>'
    return d, g

def fin_de_g(s, i):
    """posicion justo despues del </g> que cierra el <g> que empieza en i"""
    prof, j = 0, i
    for m in re.finditer(r'<g\b|</g>', s[i:]):
        prof += 1 if m.group(0) == '<g' else -1
        if prof == 0: return i + m.end()
    raise ValueError('<g> sin cerrar')

def cambia(ruta, prefijos):
    s = open(ruta).read(); n = 0
    marca = re.compile(r'<g transform="translate\(-43\.88 -34\.34\) scale\(1\.0889\)">|<g data-logo="piramide"')
    pos = 0; hechos = {}
    while True:
        m = marca.search(s, pos)
        if not m: break
        i = m.start()
        d0 = s.rfind('<defs>', 0, i); d1 = s.find('</defs>', d0) + len('</defs>')
        primer = re.search(r'id="([^"]+)"', s[d0:d1]).group(1)
        p = prefijos(primer)
        if (d0, p) not in hechos:
            nd, g = bloque(p)
            nuevo_defs = '<defs>' + nd + '</defs>'
            # el <defs> va antes del <g>: se cambia primero el <g> para no mover sus posiciones
            gfin = fin_de_g(s, i)
            s = s[:i] + g + s[gfin:]
            s = s[:d0] + nuevo_defs + s[d1:]
            hechos[(d0, p)] = True
            pos = d0 + len(nuevo_defs) + (i - d1) + len(g)
        else:
            nd, g = bloque(p)
            gfin = fin_de_g(s, i)
            s = s[:i] + g + s[gfin:]
            pos = i + len(g)
        n += 1
    open(ruta, 'w').write(s)
    print('  %-26s %d logo(s)' % (os.path.relpath(ruta, RAIZ), n))

def prefijo(primer):
    """del id viejo -nrmPlata, wpHP, exFP...- o del nuevo -wpH-cTL- sale el prefijo"""
    if '-' in primer: return primer.split('-')[0] + '-'
    for fin in ('Plata', 'P'):
        if primer.endswith(fin): return primer[:-len(fin)] + '-'
    return primer + '-'

def fuentes():
    vb, defs, cuerpo = maestro()
    def svg(lado, margen, defs_, cuerpo_):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lado} {lado}">\n'
                f'<defs>{defs_}</defs>\n<g transform="{encaja(vb, lado, margen)}">{cuerpo_}</g>\n</svg>\n')
    # la pestaña llena su hueco; las de app llevan aire (iOS y Android las
    # recortan en una baldosa redondeada)
    open(os.path.join(AQUI, 'favicon.svg'), 'w').write(svg(512, 8, defs, cuerpo))
    open(os.path.join(AQUI, 'app.svg'), 'w').write(svg(512, 52, defs, cuerpo))
    # a 16 px los biseles son medio pixel y ensucian: solo las caras y el marco
    sencillo = ''.join(re.findall(r'<path fill="url\(#c[A-Z]{2}\)"[^>]*/>', cuerpo))
    marco = re.search(r'<path d="[^"]+" fill="none"[^>]*/>', cuerpo).group(0)
    caras = re.sub(r'<(linearGradient|radialGradient|clipPath) id="(?!c[A-Z]{2}"|sil")[^"]+".*?</\1>', '', defs)
    simple = f'<g clip-path="url(#sil)">{sencillo}{marco}</g>'
    open(os.path.join(AQUI, 'simple.svg'), 'w').write(svg(512, 8, caras, simple))
    open(os.path.join(AQUI, 'app-simple.svg'), 'w').write(svg(512, 52, caras, simple))
    # la mascara de Safari: la silueta, negra y de una pieza
    sil = re.search(r'<clipPath id="sil"><path d="([^"]+)"/>', defs).group(1)
    open(os.path.join(AQUI, 'mask-icon.svg'), 'w').write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n'
        f'<g transform="{encaja(vb, 512, 8)}"><path d="{sil}"/></g>\n</svg>\n')
    print('  favicon.svg, app.svg, simple.svg, app-simple.svg, mask-icon.svg')

def pon():
    fuentes()
    for pag in ('index.html', 'app/index.html', 'explorer/index.html', 'whitepaper/index.html'):
        cambia(os.path.join(RAIZ, pag), prefijo)


if __name__ == '__main__':
    if sys.argv[1:2] == ['vectoriza']: vectoriza(sys.argv[2])
    elif sys.argv[1:2] == ['pon']: pon()
    else: print(__doc__)
