# -*- coding: utf-8 -*-
"""El detalle: como aparece cada cosa y como responde al raton.

Lo que hacia que la pagina se leyera «simple» no era el contenido ni el color:
era que TODO aparecia igual. Un `opacity 0 -> 1` con dieciocho pixeles de
subida, la transicion por defecto de cualquier plantilla, en las veintiseis
piezas que se revelan. Da igual lo trabajada que este una seccion: si entra
como entran todas, se lee como todas.

Aqui hay tres cosas, y ninguna es decoracion suelta:

  1. Los titulares se descubren tras una mascara, de abajo arriba, como si se
     imprimieran. El resto de piezas sube con su propia mascara y un punto de
     desenfoque que se va. Y lo que va en grupo entra escalonado, no de golpe.
  2. Un poco de paralaje en las cabeceras de seccion. Nada que se note como
     efecto: solo que la pagina deje de moverse como un bloque.
  3. Una red de seguridad para las apariciones, que arregla algo real: si un
     elemento no llega a CRUZAR el borde de la pantalla —enlace directo a
     media pagina, salto con la barra, cuadros perdidos— la clase no le llega
     nunca y se queda invisible para siempre. Medido: saltando de golpe a la
     seccion de seguridad, solo 4 de 32 piezas habian aparecido.

Aqui NO hay cursor propio, y es a proposito: la pagina ya traia el suyo —un
lienzo (#cur) que dibuja el recuadro de lo que hay bajo el puntero y se
enciende al primer movimiento de raton—. Estuve a punto de poner otro encima
sin verlo. Todo se apaga con `prefers-reduced-motion`.
`montar_home.py` lo aplica en el paso 15.
"""

MARCA = '/* ══ el detalle: como aparece y como responde ══'
FIN = '/* ══ fin: detalle ══ */'

CSS = """
/* ══ el detalle: como aparece y como responde ════════════════════════════ */

/* ── 1 · las apariciones ──
   Antes: opacity 0→1 y 18 px de subida, igual en las veintiseis piezas. Ahora
   cada una se descubre tras su propia mascara, que es lo que hace que parezca
   impresa y no encendida. El desenfoque de salida es minimo, .8 px: por encima
   de eso se nota como efecto y se abarata. */
.rv{opacity:0;transform:translateY(30px);filter:blur(.8px);
  clip-path:inset(0 0 100% 0);
  transition:opacity .55s ease,
             transform 1.15s cubic-bezier(.16,.84,.26,1),
             clip-path 1.15s cubic-bezier(.16,.84,.26,1),
             filter .7s ease}
.rv.in{opacity:1;transform:none;filter:none;clip-path:inset(-30% -20% -30% -20%)}

/* Lo que va en grupo entra escalonado: cuatro tarjetas apareciendo a la vez
   son un bloque; con 90 ms entre una y otra son una secuencia. */
.rv.in>*{--d:0ms}
.sec-grid>.rv:nth-child(2),.join-grid>*:nth-child(2){transition-delay:.10s}
.sec-grid>.rv:nth-child(3){transition-delay:.20s}

/* ── los titulares, tras la mascara ──
   Se marcan desde el guion (data-tit) para no tocar el marcado que llega del
   diseno. La holgura lateral y de abajo es para que no se coma ni la coma de
   una «g» ni la sombra. */
[data-tit]{clip-path:inset(0 -.4em 108% -.4em);
  transform:translateY(.14em);
  transition:clip-path 1.25s cubic-bezier(.16,.84,.26,1),
             transform 1.25s cubic-bezier(.16,.84,.26,1)}
[data-tit].vis{clip-path:inset(-.34em -.4em -.34em -.4em);transform:none}

/* ── 2 · el paralaje ──
   Se mueve con transform, que no toca la maquetacion: las secciones siguen
   midiendo lo mismo y nada salta. */
[data-par]{will-change:transform}

@media(prefers-reduced-motion:reduce){
  .rv,.rv.in,[data-tit],[data-tit].vis{
    transition:none;clip-path:none;filter:none;transform:none;opacity:1}
}
""" + '\n' + FIN


JS = """
<script>
/* ══ el detalle ══ Lo aplica herramientas/detalle.py ══════════════════════ */
(function(){
  var CALMA = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var FINO  = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ── los titulares, tras su mascara ──
     Se marcan aqui y no en el marcado para no tocar el archivo del diseno, y
     se excluye el de la portada, que ya tiene su propia entrada. */
  var tits = [];
  if(!CALMA){
    tits = [].slice.call(document.querySelectorAll(
      'main h2, .press-h, .sec-h, .join-h, .builds-h, .stk-t, .tkp-h, .sale-h'))
      .filter(function(h){ return !h.closest('.hero') });
    tits.forEach(function(h){ h.setAttribute('data-tit','') });
    var ioT = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        ioT.unobserve(e.target);
        e.target.classList.add('vis');
      });
    },{threshold:.15, rootMargin:'0px 0px -8% 0px'});
    tits.forEach(function(h){ ioT.observe(h) });
  }

  /* ── la red de seguridad ──
     Esto no es un adorno, arregla algo real. Todo lo que se revela en esta
     pagina depende de que un IntersectionObserver vea al elemento CRUZAR el
     borde de la pantalla. Si no cruza —porque se llega con un enlace directo
     a media pagina, porque se baja de golpe con la barra, o porque el
     navegador se salta cuadros— la clase no llega nunca y la pieza se queda
     invisible para siempre. Comprobado: saltando de golpe a la seccion de
     seguridad, solo 4 de 32 piezas habian aparecido.
     Asi que cada poco se repasa lo que queda pendiente y se enciende lo que
     este en pantalla. Cuando no queda nada pendiente, el repaso se apaga. */
  var pend = [].slice.call(document.querySelectorAll('.rv:not(.in)'))
               .map(function(el){ return {el:el, c:'in'} })
             .concat(tits.map(function(el){ return {el:el, c:'vis'} }));
  var ultimo = 0;
  function repaso(t){
    if(t - ultimo < 160) return;
    ultimo = t;
    var h = innerHeight, quedan = [];
    for(var i = 0; i < pend.length; i++){
      var q = pend[i];
      if(q.el.classList.contains(q.c)) continue;
      var r = q.el.getBoundingClientRect();
      if(r.top < h * 0.94 && r.bottom > 0 && r.height >= 0) q.el.classList.add(q.c);
      else quedan.push(q);
    }
    pend = quedan;
  }

  /* ── el paralaje ──
     El cursor NO se toca: la pagina ya trae el suyo, un lienzo que dibuja el
     recuadro de lo que hay debajo del puntero. Poner otro encima habria sido
     tener dos. */
  var flota = [];
  if(!CALMA && FINO){
    [].slice.call(document.querySelectorAll(
      '.press-head, .sec-head, .join-head, .lane-k, .sale-top'))
      .forEach(function(el, i){
        el.setAttribute('data-par','');
        flota.push({el:el, k:(i % 2 ? 1 : -1) * (9 + (i % 3) * 5)});
      });
  }

  /* un solo bucle para las dos cosas */
  (function paso(t){
    requestAnimationFrame(paso);
    if(pend.length) repaso(t || 0);
    if(!flota.length) return;
    var h = innerHeight;
    for(var i = 0; i < flota.length; i++){
      var f = flota[i], r = f.el.getBoundingClientRect();
      if(r.bottom < -240 || r.top > h + 240) continue;
      var p = (r.top + r.height / 2 - h / 2) / h;   /* -1 arriba, +1 abajo */
      f.el.style.transform = 'translate3d(0,' + (p * f.k).toFixed(2) + 'px,0)';
    }
  })(0);
})();
</script>
"""


def aplicar(html):
    """Idempotente."""
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        html = html[:i] + CSS.strip('\n') + html[j:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
    ini = '<script>\n/* ══ el detalle ══'
    if ini in html:
        i = html.index(ini)
        j = html.index('</script>', i) + len('</script>')
        html = html[:i] + JS.strip('\n') + html[j:]
    else:
        assert html.count('</body>') == 1
        html = html.replace('</body>', JS.strip('\n') + '\n</body>', 1)
    return html
