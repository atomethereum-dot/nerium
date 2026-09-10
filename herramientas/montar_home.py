#!/usr/bin/env python3
"""Monta el index.html de nereum.xyz: cabecera publicada + diseno nuevo del usuario.

  python3 montar_home.py <index.html subido>

Copia tal cual el <style> y el cuerpo del archivo subido y le repone encima
todo lo que se hizo aqui y el archivo subido no trae:
  1. la cabecera publicada (fuentes locales, juego de iconos, og con ?v=)
  2. el suelo del HUD sobre el marcado nuevo
  3. translate="no" en el logotipo
  4. el enlace del boton de X
  5. el reflejo del canto inferior en arabe y el carril del boton de subir
  6. el bloque que devuelve las frases enteras al traductor del navegador
  7. la etiqueta que carga assets/dapp.js, la capa que conecta los contratos
  8. el cambio de «Whitelist» a «Seed Round», texto y traducciones
  9. la marca nueva: el cubo, en lugar del semidisco
 10. los arreglos de la portada: la cursiva falsa del titular, la paleta del
     mosaico, el orden de los botones y las cuatro pruebas
 11. la cabecera: el aviso de la ronda arriba y el menu del centro con fichas
"""
import sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import seedround
import marca
import portada
import cabecera
subido, publicado = sys.argv[1], '/home/user/nerium/index.html'
z = open(subido, encoding='utf-8').read()
p = open(publicado, encoding='utf-8').read()

pre  = p[:p.index('<style>')]     # 1 · cabecera publicada
rest = z[z.index('<style>'):]     # diseno nuevo, intacto

def sub(old, new, n=1):
    global rest
    c = rest.count(old)
    assert c == n, f"esperaba {n} de {old[:70]!r}, encontradas {c}"
    rest = rest.replace(old, new)

# ── 2 · suelo del HUD ──
sub("  --blue:#2F6BFF; --blue-lite:#79ABFF; --blue-d:#1B49E0; --blue-deep:#0A2564;",
    "  --blue:#2F6BFF; --blue-lite:#79ABFF; --blue-d:#1B49E0; --blue-deep:#0A2564;\n"
    "  /* suelo del HUD: 14px, o la barra de gestos del telefono si es mas alta.\n"
    "     Todo lo que se ancla abajo mide desde aqui, no desde el borde. */\n"
    "  --hud-b:max(14px,env(safe-area-inset-bottom,0px));")
sub(".hud .lang{position:absolute;left:16px;bottom:14px;",
    ".hud .lang{position:absolute;left:16px;bottom:var(--hud-b);")
sub(".scrollbtn{position:fixed;left:14px;bottom:44px;",
    ".scrollbtn{position:fixed;left:14px;bottom:calc(var(--hud-b) + 30px);")
sub("  .hud-count{right:14px;bottom:12px;font-size:10px}",
    "  .hud-count{right:14px;bottom:var(--hud-b);font-size:10px}")
sub("  .hud .lang{bottom:12px;font-size:10px}",
    "  .hud .lang{bottom:var(--hud-b);font-size:10px}")
sub("  .scrollbtn{bottom:40px;width:30px;height:30px}",
    "  .scrollbtn{bottom:calc(var(--hud-b) + 26px);width:30px;height:30px}")
sub(".hud-band{position:absolute;right:16px;bottom:38px;",
    ".hud-band{position:absolute;right:16px;bottom:calc(var(--hud-b) + 24px);")
sub("  .hud-band{right:14px;bottom:calc(36px + env(safe-area-inset-bottom));font-size:8.5px;",
    "  .hud-band{right:14px;bottom:calc(var(--hud-b) + 22px);font-size:8.5px;")
sub("  .hud-count{right:14px;bottom:calc(14px + env(safe-area-inset-bottom));font-size:10px}",
    "  .hud-count{right:14px;bottom:var(--hud-b);font-size:10px}")
sub("  .hud .lang{left:14px;bottom:calc(14px + env(safe-area-inset-bottom))}",
    "  .hud .lang{left:14px;bottom:var(--hud-b)}")
sub("  bottom:calc(18px + 54px);z-index:38;width:42px;height:42px;",
    "  bottom:calc(var(--hud-b) + 48px);z-index:38;width:42px;height:42px;")
sub(".hud-count{position:absolute;right:16px;bottom:14px;",
    ".hud-count{position:absolute;right:16px;bottom:var(--hud-b);")
# el idioma y el rotulo se vuelven a fijar aparte, con !important y mas abajo
# en la hoja: sin repetir el suelo aqui, las reglas de arriba no llegan a
# aplicarse y los dos quedan pegados al borde en un telefono con barra
PAR = [
 (".hud .lang{position:fixed !important;left:16px;bottom:14px;z-index:61}",
  ".hud .lang{position:fixed !important;left:16px;bottom:var(--hud-b) !important;z-index:61}"),
 (".hud-band{position:fixed !important;right:16px;bottom:38px;z-index:61}",
  ".hud-band{position:fixed !important;right:16px;bottom:calc(var(--hud-b) + 24px) !important;z-index:61}"),
 ("  .hud .lang{left:12px;bottom:12px}",
  "  .hud .lang{left:12px;bottom:var(--hud-b) !important}"),
 ("  .hud-band{right:12px;bottom:34px}",
  "  .hud-band{right:12px;bottom:calc(var(--hud-b) + 20px) !important}"),
]
for a, b_ in PAR:
    if a in rest: sub(a, b_)

# ── 3 · el logotipo es un nombre propio ──
sub('<span class="lk-word" id="lkWord"></span>',
    '<span class="lk-word" id="lkWord" translate="no"></span>')

# ── 4 · el boton de X apunta a la cuenta ──
# solo si viene vacio: si el archivo ya trae el enlace puesto, se respeta el suyo
VACIO = '<a class="jbtn" href="#" style="--jb:#111318" aria-label="Nereum on X">'
if VACIO in rest:
    sub(VACIO,
        '<a class="jbtn" href="https://x.com/nereumlab?s=21" target="_blank" '
        'rel="noopener noreferrer" style="--jb:#111318" aria-label="Nereum on X">')

# ── 5 · reflejo del canto inferior en arabe y carril del boton de subir ──
css = open(os.path.join(AQUI, 'bloque_css.txt'), encoding='utf-8').read()
assert rest.count('\n</style>') == 1
rest = rest.replace('\n</style>', '\n' + css + '</style>', 1)

# ── 6 · frases enteras para el traductor del navegador ──
bloque = open(os.path.join(AQUI, 'bloque_traductor.txt'), encoding='utf-8').read()
assert rest.count('\n</body>') == 1
rest = rest.replace('\n</body>', '\n' + bloque + '</body>', 1)

# ── 7 · la capa web3 ──
# Un solo <script>. Toda la logica vive en assets/dapp.js y toma el mando del
# widget clonando sus controles, asi que el diseno que llega puede cambiar sin
# que haya que reponer nada mas que esta linea.
DAPP = '<script defer src="assets/dapp.js"></script>\n'
if DAPP not in rest:
    assert rest.count('</body>') == 1
    rest = rest.replace('</body>', DAPP + '</body>', 1)

# ── 8 · «Whitelist» pasó a ser «Seed Round» ──
# El bloque de traducciones viaja dentro del archivo subido, así que cada
# diseño nuevo vuelve a traer el texto viejo si no se rehace aquí.
rest = seedround.aplicar(rest)

# ── 9 · la marca ──
# Los <symbol> del logotipo viajan dentro del archivo subido, igual que las
# traducciones: sin esto, cada diseno nuevo devolveria el semidisco.
rest = marca.aplicar(rest)

# ── 10 · la portada ──
# Viaja dentro del archivo subido igual que la marca y las traducciones.
rest = portada.aplicar(rest)

# ── 11 · la cabecera ──
# El aviso de la ronda y el menu del centro. Va DESPUES de la portada porque
# su CSS tiene que caer por detras del bloque grande para poder pisarlo.
rest = cabecera.aplicar(rest)

salida = pre + rest
open(publicado, 'w', encoding='utf-8').write(salida)
print("montado:", len(salida), "bytes ·", salida.count('var(--hud-b)'), "usos de --hud-b ·",
      "traductor:", 'si' if 'translated-(ltr' in salida else 'NO', "·",
      "dapp:", 'si' if 'assets/dapp.js' in salida else 'NO', "·",
      "whitelist restante:", salida.lower().count('whitelist'), "·",
      "marca:", 'cubo' if 'nrmPlata' in salida else 'LA VIEJA', "·",
      "portada:", 'arreglada' if portada.MARCA in salida else 'SIN TOCAR', "·",
      "cabecera:", 'aviso + menu' if '<div class="ann" id="ann">' in salida else 'SIN TOCAR')
