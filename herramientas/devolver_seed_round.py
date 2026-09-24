# -*- coding: utf-8 -*-
"""Devuelve la seccion de la venta a la pagina, tal como estaba.

   Se escondio el 24 de septiembre de 2026 a peticion del dueno. Se escondio
   en cuatro sitios, asi que devolverla a mano es acordarse de cuatro cosas —y
   de una quinta, el bloque «.umb», que fue la que costo encontrar porque NO
   esta dentro de la seccion—. Esto lo hace de una vez y avisa si algo no
   estaba donde deberia.

       python3 herramientas/devolver_seed_round.py

   Lo que NO deshace, a proposito: las dos guardas que se le pusieron al guion
   del «.umb» para que no reviente cuando su lienzo mide cero. Eso era un fallo
   de verdad y se queda arreglado.
"""
import io, re, sys

RAIZ = '/home/user/nerium/'
fallos = []

def cambia(texto, viejo, nuevo, que):
    if viejo not in texto:
        fallos.append(que)
        return texto
    return texto.replace(viejo, nuevo, 1)

# ── 1 · el bloque vuelve a su sitio ─────────────────────────────────────────
g = io.open(RAIZ + 'herramientas/seed-round.guardada.html', encoding='utf-8').read()
bloque = g[g.index('<section class="sale" id="presale"'):].rstrip() + '\n'
# El bloque se guardo CUANDO YA ESTABA ESCONDIDO, asi que trae el candado
# dentro. Si no se le quita, la seccion vuelve al archivo pero sigue sin verse
# —pasó en el primer ensayo—.
bloque = bloque.replace(' hidden style="display:none"><i class="via"',
                        '><i class="via"', 1)

h = io.open(RAIZ + 'index.html', encoding='utf-8').read()
marca = ('<!-- AQUI IBA LA SECCION DE LA VENTA (id="presale").\n'
         '     Guardada entera en herramientas/seed-round.guardada.html, con las\n'
         '     instrucciones para devolverla. -->')
h = cambia(h, marca, bloque, 'el hueco donde iba la seccion')

# ── 2 · fuera la regla que esconde las puertas y el 85% ─────────────────────
antes = h
h = re.sub(r'/\* «\.umb» es el 85% gigante.*?\.ann, #lq, \.umb, a\[href="#presale"\]\{display:none !important\}\n',
           '', h, flags=re.S)
if h == antes:
    fallos.append('la regla que esconde .ann, #lq, .umb y los enlaces')

# ── 3 · fuera los candados escritos en las etiquetas ────────────────────────
h = cambia(h, '<div class="lq" id="lq" style="display:none">',
              '<div class="lq" id="lq">', 'el candado de la fila de la portada')
h = cambia(h, '<div class="ann" id="ann" style="display:none">',
              '<div class="ann" id="ann">', 'el candado de la barra de aviso')
h = cambia(h, '<div class="umb" aria-hidden="true" style="display:none">',
              '<div class="umb" aria-hidden="true">', 'el candado del 85% gigante')

# ── 4 · fuera el candado del guion ──────────────────────────────────────────
j = io.open(RAIZ + 'assets/dapp.js', encoding='utf-8').read()
antes = j
j = re.sub(r'/\* ══ LA VENTA, ESCONDIDA.*?\n\}\)\(\);\n\n', '', j, flags=re.S)
if j == antes:
    fallos.append('el bloque «LA VENTA, ESCONDIDA» de assets/dapp.js')

if fallos:
    print('NO se ha tocado nada. No encontre:')
    for f in fallos:
        print('  ·', f)
    print('\nAlguien ha movido esas lineas. Revisalo antes de seguir.')
    sys.exit(1)

io.open(RAIZ + 'index.html', 'w', encoding='utf-8').write(h)
io.open(RAIZ + 'assets/dapp.js', 'w', encoding='utf-8').write(j)
print('Listo. La seccion de la venta ha vuelto.')
print('Pasa la bateria antes de subir:  bash herramientas/bateria.sh')
