# -*- coding: utf-8 -*-
"""Esconde o devuelve TODO lo de la seed round, de una vez.

       python3 herramientas/seed_round.py esconder
       python3 herramientas/seed_round.py devolver

   Son CINCO piezas, y la quinta es la que costo seis rondas encontrar:

     1 · <section id="presale">   la seccion entera, con la dapp de compra
     2 · #lq                       la fila de la portada (Seed Round open, 85%…)
     3 · #ann                       la barra de aviso del 85%
     4 · .umb                       el 85% GIGANTE a pantalla completa — y este
                                    NO vive dentro de la seccion: es un bloque
                                    suelto entre Security y Token. Esconder la
                                    seccion no lo quitaba nunca.
     5 · los enlaces a #presale     menu, hoja del movil, boton de portada

   Y un candado extra en assets/dapp.js, que viaja aparte del HTML: asi la
   pagina queda tapada aunque el navegador este sirviendo una copia vieja.

   Nada se borra del archivo. El carril lateral y el contador de secciones ya
   filtran por «display:none», asi que la marca desaparece y el «01/10» se
   recuenta solo.
"""
import io, re, sys

RAIZ = '/home/user/nerium/'

PIEZAS = [
    ('<section class="sale" id="presale" data-bg="#0E3AC4" data-acc="#7FB0FF">',
     '<section class="sale" id="presale" data-bg="#0E3AC4" data-acc="#7FB0FF" hidden style="display:none">',
     'la seccion de la venta'),
    ('<div class="lq" id="lq">',
     '<div class="lq" id="lq" style="display:none">',
     'la fila de la portada'),
    ('<div class="ann" id="ann">',
     '<div class="ann" id="ann" style="display:none">',
     'la barra de aviso'),
    ('<div class="umb" aria-hidden="true">',
     '<div class="umb" aria-hidden="true" style="display:none">',
     'el 85% gigante (.umb)'),
]

ANCLA_CSS = '.kin[hidden],#thesis[hidden]{display:none !important}'
REGLA = '''
/* ══ SEED ROUND ESCONDIDA ══════════════════════════════════════════════════
   Puesto por herramientas/seed_round.py. Para quitarlo:
       python3 herramientas/seed_round.py devolver
   «.umb» es el 85% gigante y NO esta dentro de la seccion: es un bloque
   suelto. Los enlaces se esconden porque apuntarian a algo que no se ve. */
#presale[hidden]{display:none !important}
.ann, #lq, .umb, a[href="#presale"]{display:none !important}'''

ANCLA_JS = '(function () {'
CANDADO = '''/* ══ LA VENTA, ESCONDIDA ══════════════════════════════════════════════════
   Puesto por herramientas/seed_round.py. Este archivo viaja aparte del HTML y
   se pide por su cuenta, asi que tapa la venta aunque el navegador este
   sirviendo una copia vieja de la pagina — que es lo que pasaba. */
(function () {
  function tapa() {
    ['presale', 'lq', 'ann'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) { e.style.setProperty('display', 'none', 'important'); }
    });
    var u = document.querySelectorAll('.umb');   /* el 85% gigante, sin id */
    for (var i = 0; i < u.length; i++) {
      u[i].style.setProperty('display', 'none', 'important');
    }
  }
  tapa();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tapa);
  }
  addEventListener('load', tapa);
  var n = 0, t = setInterval(function () { tapa(); if (++n > 20) clearInterval(t); }, 250);
})();

(function () {'''

def leer(f):  return io.open(RAIZ + f, encoding='utf-8').read()
def escribir(f, s): io.open(RAIZ + f, 'w', encoding='utf-8').write(s)

def esconder():
    h, j, faltan = leer('index.html'), leer('assets/dapp.js'), []
    for viejo, nuevo, que in PIEZAS:
        if nuevo in h: continue                 # ya escondida
        if viejo not in h: faltan.append(que); continue
        h = h.replace(viejo, nuevo, 1)
    if ANCLA_CSS not in h: faltan.append('el sitio donde va la regla')
    if faltan: return faltan
    if '#presale[hidden]{display:none !important}' not in h:
        h = h.replace(ANCLA_CSS, ANCLA_CSS + REGLA, 1)
    if 'LA VENTA, ESCONDIDA' not in j:
        j = j.replace(ANCLA_JS, CANDADO, 1)
    escribir('index.html', h); escribir('assets/dapp.js', j)
    return []

def devolver():
    h, j, faltan = leer('index.html'), leer('assets/dapp.js'), []
    for viejo, nuevo, que in PIEZAS:
        if viejo in h and nuevo not in h: continue   # ya devuelta
        if nuevo not in h: faltan.append(que); continue
        h = h.replace(nuevo, viejo, 1)
    n = re.sub(r'\n/\* ══ SEED ROUND ESCONDIDA ═+\n.*?a\[href="#presale"\]\{display:none !important\}', '', h, flags=re.S)
    if n == h and '#presale[hidden]' in h: faltan.append('la regla de la hoja')
    h = n
    k = re.sub(r'/\* ══ LA VENTA, ESCONDIDA.*?\n\}\)\(\);\n\n', '', j, flags=re.S)
    if k == j and 'LA VENTA, ESCONDIDA' in j: faltan.append('el candado de dapp.js')
    j = k
    if faltan: return faltan
    escribir('index.html', h); escribir('assets/dapp.js', j)
    return []

if __name__ == '__main__':
    orden = sys.argv[1] if len(sys.argv) > 1 else ''
    if orden not in ('esconder', 'devolver'):
        print(__doc__); sys.exit(2)
    faltan = (esconder if orden == 'esconder' else devolver)()
    if faltan:
        print('NO se ha tocado nada. No encontre:')
        for f in faltan: print('  ·', f)
        sys.exit(1)
    print('Listo: seed round ' + ('escondida.' if orden == 'esconder' else 'devuelta.'))
    print('Pasa la bateria antes de subir.')
