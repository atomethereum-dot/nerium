# -*- coding: utf-8 -*-
"""La ruta: las tres fases de adopcion, debajo de la seccion de proyectos.

Tres fases, un rail a la izquierda que se llena segun baja el scroll, y el
mismo suelo que «#builds» —el mismo negro y el mismo resplandor— para que las
dos secciones se lean como un solo campo.

Sobre el texto, que es lo que importa: NO se inventa nada. Las tres fases y su
objetivo estan escritos en el whitepaper desde hace tiempo, en la tabla «Fases
de adopcion» / «Adoption phases», y se traen letra por letra —ingles del
whitepaper en ingles, castellano del whitepaper en castellano—. Un roadmap es
un compromiso con quien pone dinero; no es sitio para que yo redacte.

Por lo mismo no lleva fechas. La referencia que me pasaron las lleva
—«Q4 2024 - Q4 2025»— y aqui hay un hueco preparado para ellas, pero vacio de
fechas y con el estado real en su lugar: la fase 1 dice «In progress», que es
lo que la propia pagina ya afirma dos secciones mas arriba («Testnet · 75 % to
mainnet»), y las otras dos dicen «Planned». Poner trimestres que nadie me ha
dado seria inventarme un calendario.

Tampoco entra en el menu. La cabecera tiene diez entradas y una bateria lo
comprueba; esto es un capitulo de «lo que estamos construyendo», no una
estacion nueva. Por eso no lleva numero de estacion ni «via».

El rail, que era el encargo:

  · una linea base tenue de nodo a nodo;
  · encima, el avance, que crece de 0 a 1 con el scroll y lleva un degradado
    y un halo suave —eso es lo que la referencia no tiene—;
  · tres nodos, uno por fase, que se encienden cuando su fase cruza la linea
    de activacion, con un anillo que late una sola vez;
  · y la flecha del final, como en la referencia.

Los extremos del rail no se ponen a ojo: el guion mide el centro del primer
nodo y el del ultimo y los escribe en dos variables. Puesto a ojo se descuadra
en cuanto un titular pasa a dos renglones, que es justo lo que pasa en movil.

`montar_home.py` lo aplica en el paso 29.
"""
import math
import random

MARCA = '/* ══ la ruta ══'
FIN = '/* ══ fin: ruta ══ */'
MARCA_JS = '<script>\n/* ══ la ruta ══'

# Las tres fases, tal cual las dice el whitepaper. La columna «objetivo» es
# suya; aqui solo se le pone tipografia.
FASES = [
    ('Validation', 'In progress',
     'One asset class issued entirely on Nereum and transferred between '
     'qualified holders with no human intervention in the settlement path.'),
    ('Utility', 'Planned',
     'Tokenized assets accepted as collateral. An asset reaches genuine '
     'liquidity when credit is available against it.'),
    ('Integration', 'Planned',
     'The infrastructure ceases to be a decision factor for the issuer, in '
     'the same way interbank payment rails are not one today.'),
]

ROTULO = 'Nereum &middot; adoption roadmap'
TITULO = 'Three phases, and what each one has to prove.'



# ── la hebra de luz del margen ───────────────────────────────────────────────
# En la referencia la banda de la izquierda no es una linea sobre negro: es una
# hebra luminosa que se trenza consigo misma, tipo ADN, con chispas repartidas
# por ella. La nuestra era plana, que es justo lo que se dijo.
#
# Las curvas se generan aqui, no se pegan a mano: cinco senos de frecuencia y
# fase distintas sobre un lienzo estrecho y muy alto, con la amplitud apretada
# arriba y abajo lo justo para que no se corten en seco.
_ADN_W, _ADN_H = 96, 1000
# Cada hebra con su centro y su fase. Las tuve todas naciendo del mismo punto
# y salia un HUSO: las cinco se juntaban arriba y abajo y se abombaban en
# medio. En la referencia corren parejas y se cruzan por el camino, cada una
# entrando y saliendo del cuadro por su lado.
_HEBRAS = [
    # centro, amplitud, frecuencia, fase, grosor, opacidad
    (44, 10, 2.1, 0.0, 1.0, .85),
    (50, 14, 1.4, 1.9, 0.8, .70),
    (46, 18, 1.0, 3.4, 0.7, .52),
    (54,  8, 3.1, 0.7, 0.7, .60),
    (48, 16, 0.7, 5.1, 0.6, .40),
]


def _camino(cx, amp, frec, fase, pasos=44):
    pts = []
    for k in range(pasos + 1):
        t = k / pasos
        # Sin estrechamiento: la hebra corre entera de arriba abajo. Lo que se
        # difumina en las puntas es la PINTURA, con una mascara, no la
        # geometria: apretando la geometria las cinco convergian y el conjunto
        # se leia como un huso en vez de como una trenza.
        pts.append((round(cx + amp * math.sin(frec * math.tau * t + fase), 1),
                    round(t * _ADN_H, 1)))
    d = 'M%s %s' % pts[0]
    for i in range(1, len(pts)):
        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
        cy = round((y0 + y1) / 2, 1)
        d += ' C%s %s %s %s %s %s' % (x0, cy, x1, cy, x1, y1)
    return d


def _chispas(n=34):
    # Van SOBRE las hebras, no al azar: es lo que hace que se lea como una
    # hebra de luz y no como polvo. Semilla fija para que el dibujo no cambie
    # entre montajes.
    r = random.Random(20260913)
    out = []
    for _ in range(n):
        cx, amp, frec, fase, _g, _o = r.choice(_HEBRAS)
        t = r.uniform(.04, .96)
        x = cx + amp * math.sin(frec * math.tau * t + fase)
        out.append((round(x / _ADN_W * 100, 2), round(t * 100, 2),
                    r.choice([1.4, 1.8, 2.2, 2.8, 3.4]),
                    round(r.uniform(.35, .95), 2), round(r.uniform(0, 7), 1)))
    return out


def _adn():
    caminos = ''.join(
        '<path d="%s" stroke-width="%s" style="--o:%s;--d:%ss"/>'
        % (_camino(cx, amp, frec, fase), gr, op, round(i * 1.7, 1))
        for i, (cx, amp, frec, fase, gr, op) in enumerate(_HEBRAS))
    chispas = ''.join(
        '<i style="left:%s%%;top:%s%%;--s:%spx;--o:%s;--d:%ss"></i>' % c
        for c in _chispas())
    return ('<i class="ruta-adn" aria-hidden="true">'
            '<svg viewBox="0 0 %d %d" preserveAspectRatio="none">%s</svg>'
            '%s</i>' % (_ADN_W, _ADN_H, caminos, chispas))


def _marcado():
    fases = []
    for i, (titulo, estado, objetivo) in enumerate(FASES):
        fases.append(
            '      <li class="ruta-f" data-i="%d">\n'
            '        <div class="ruta-cab">'
            '<span class="ruta-n">%02d&#8201;/&#8201;%02d</span>'
            '<span class="ruta-est">%s</span></div>\n'
            '        <h3 class="ruta-t">%s</h3>\n'
            '        <p class="ruta-p">%s</p>\n'
            '      </li>' % (i, i + 1, len(FASES), estado, titulo, objetivo))
    return (
        '\n\n<section class="ruta" id="ruta" data-bg="#000000" data-acc="#79ABFF">\n'
        '  <div class="wrap ruta-wrap">\n'
        '    %s\n'
        '    <div class="ruta-top">\n'
        '      <span class="ruta-k">Roadmap</span>\n'
        '      <span class="ruta-marca">%s</span>\n'
        '    </div>\n'
        '    <h2 class="ruta-h">%s</h2>\n'
        '    <ol class="ruta-lista" id="rutaLista">\n'
        '      <i class="ruta-rail" aria-hidden="true">'
        '<i class="ruta-punto"></i><i class="ruta-linea"></i>'
        '<i class="ruta-flecha"><svg viewBox="0 0 24 24">'
        '<path d="M6 9.5 12 16l6-6.5"/></svg></i></i>\n%s\n'
        '    </ol>\n'
        '  </div>\n'
        '</section>\n\n'
    ) % (_adn(), ROTULO, TITULO, '\n'.join(fases))


CSS = """
/* ══ la ruta ══════════════════════════════════════════════════════════════
   Las tres fases de adopcion, debajo de «lo que estamos construyendo» y con
   su mismo suelo, para que las dos se lean como un solo campo y no como dos
   secciones pegadas.

   El negro va escrito AQUI, no solo en el paso 30. Este modulo reescribe su
   propia seccion cada vez que se aplica, asi que si se quedaba con el azul de
   antes, volver a aplicarlo deshacia el paso 30 y la ruta salia marina otra
   vez. Lo cazo su bateria comparando el suelo con el de proyectos. */
.ruta{position:relative;overflow:hidden;background:#000;
  padding:clamp(78px,9vw,136px) 0 clamp(72px,8.6vw,132px);
  /* El CARRIL: la franja de la izquierda donde viven el rail y la hebra. Todo
     el texto de la seccion empieza a su derecha.

     Antes no existia: el titular y el rail compartian eje, asi que media hebra
     caia justo debajo de las primeras letras. En la referencia el texto esta
     lejos de la barra, y esa distancia es lo que hace que la hebra se lea. */
  --carril:clamp(56px,8.5vw,140px);
  --eje:calc(var(--carril) * .5);
  --adn:clamp(34px,5.6vw,96px)}
/* El mismo resplandor de «.builds», en el mismo sitio: cada seccion lo tiene
   en su propia esquina, asi que repetirlo es lo que las hace parecer una. */
.ruta::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(1100px 520px at 16% -12%,rgba(47,107,255,.16),transparent 62%)}
.ruta>*{position:relative;z-index:1}

/* ── la hebra de luz, PEGADA a la barra ──
   Primero la puse ancha y a la izquierda del rail, y estaba mal por partida
   doble: en la referencia las hebras van PEGADAS a la barra —se abren unos
   veinte pixeles a cada lado, no media pantalla— y van encendidas, no palidas.

   Por eso el elemento vive DENTRO del wrap y no en la seccion: asi su «left:0»
   es el mismo borde del que cuelga el rail, y centrandolo sobre el se queda
   justo encima. Colgandolo de la seccion caia treinta y cinco pixeles a la
   derecha del rail, que es lo que se veia. */
/* La seccion de arriba entregaba con su pie a 48 px del canto y la ruta
   empezaba enseguida: las dos juntas se leian amontonadas. Se le da aire por
   abajo, que es de donde viene el apreton. */
.builds{padding-bottom:clamp(76px,8.4vw,128px)}
.ruta-wrap{position:relative}
.ruta-top,.ruta-h,.ruta-f{padding-left:var(--carril)}
.ruta-wrap>.ruta-top,.ruta-wrap>.ruta-h,.ruta-wrap>.ruta-lista{position:relative;z-index:1}
.ruta-adn{position:absolute;top:0;bottom:0;z-index:0;pointer-events:none;
  width:var(--adn);left:var(--eje);margin-left:calc(var(--adn) / -2);
  overflow:visible}
/* El campo azul: mas ancho que las hebras, pero CONTENIDO. La primera vez lo
   puse a 390 px y con el doble de fuerza, y lavaba de azul media seccion: el
   resplandor tiene que acompañar a la hebra, no sustituirla. */
.ruta-adn::before{content:"";position:absolute;inset:-4% -55% -4% -115%;
  background:
    radial-gradient(40% 38% at 66% 30%,rgba(56,120,255,.22),transparent 72%),
    radial-gradient(32% 30% at 60% 78%,rgba(70,140,255,.15),transparent 76%),
    linear-gradient(to right,transparent,rgba(40,96,230,.13) 62%,transparent)}
/* Las puntas se apagan con mascara, que es lo que toca: apretando la
   geometria las cinco hebras convergian en un punto. */
.ruta-adn svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 7%,#000 93%,transparent);
          mask-image:linear-gradient(to bottom,transparent,#000 7%,#000 93%,transparent)}
.ruta-adn path{fill:none;stroke:#BBD9FF;stroke-linecap:round;
  opacity:var(--o);filter:drop-shadow(0 0 2px rgba(130,185,255,.9))}
/* Las chispas: redondas de verdad. Van fuera del SVG porque el lienzo se
   estira en vertical —«preserveAspectRatio:none»— y ahi un circulo saldria
   ovalado. */
.ruta-adn i{position:absolute;width:var(--s);height:var(--s);margin:calc(var(--s) / -2);
  border-radius:50%;background:#E4EFFF;opacity:var(--o);
  box-shadow:0 0 calc(var(--s) * 1.7) rgba(160,205,255,.95)}

/* La luz respira. Cada hebra con su retraso, que si laten a la vez es un
   semaforo y no una hebra. */
@keyframes adnHebra{0%,100%{opacity:calc(var(--o) * .62)}50%{opacity:var(--o)}}
@keyframes adnChispa{0%,100%{opacity:calc(var(--o) * .35);transform:scale(.72)}
  50%{opacity:var(--o);transform:none}}
.ruta-adn path{animation:adnHebra 11s ease-in-out var(--d) infinite}
.ruta-adn i{animation:adnChispa 5.5s ease-in-out var(--d) infinite}

@media(prefers-reduced-motion:reduce){
  .ruta-adn path,.ruta-adn i{animation:none}
}

/* ── el rotulo de arriba ──
   Como en la referencia: el nombre a un lado y la seccion al otro, en la
   misma linea. No lleva numero de estacion: esto no entra en el menu. */
.ruta-top{display:flex;justify-content:space-between;align-items:baseline;
  gap:clamp(12px,3vw,40px);
  font-family:var(--m);font-size:clamp(9.5px,1vw,11px);letter-spacing:.24em;
  text-transform:uppercase}
/* El .68 de estos tres rotulos no es gusto: a .5 y .46 se quedaban en 3,3:1 y
   2,99:1 sobre este negro, por debajo del 4,5:1 que pide un cuerpo de 11 px.
   Lo cazo «probar_contraste.mjs», que mide el pixel y no el CSS. */
.ruta-k{color:#79ABFF}
.ruta-marca{color:rgba(160,190,240,.68);text-align:end}
.ruta-h{margin:clamp(18px,2.4vw,30px) 0 clamp(48px,5.8vw,88px);
  font-weight:400;font-size:clamp(26px,4.4vw,56px);letter-spacing:-.04em;
  line-height:1.06;color:#fff;max-width:18ch;text-wrap:balance}

/* ── el rail ──
   Este es el de la referencia, pieza por pieza: un punto LLENO arriba, un
   hueco, una linea BLANCA que baja desde debajo del punto, y un galon fino al
   final. Ni aros, ni tres puntos, ni la linea azul — eso era invencion mia y
   no era lo que se pidio.

   Lo que le pone la pagina es el movimiento: el punto baja de fase en fase
   segun baja el scroll y la linea lo sigue, asi que en cualquier instante el
   dibujo es el mismo de la referencia y ademas dice por donde vas.

   El sitio del punto y los extremos del rail no se ponen a ojo: el guion mide
   el renglon del contador de cada fase. A ojo se descuadra en cuanto un
   titular pasa a dos renglones, que en movil pasa siempre. */
.ruta-lista{list-style:none;margin:0;padding:0;position:relative;
  --x:var(--eje);--a:0px;--b:0px;--y:0px}
.ruta-rail{position:absolute;left:var(--x);top:var(--a);height:var(--b);
  width:2px;margin-left:-1px;pointer-events:none}
/* El punto: lleno, sin aro y SIN HALO, como en la referencia. Le puse uno
   para que no se perdiera entre las hebras y la bateria me paro: el acuerdo
   era que fuera identica, no que a mi me pareciera que se veia poco. Si hace
   falta despegarlo del fondo, se despeja el fondo, no se disfraza el punto. */
.ruta-punto{position:absolute;left:50%;top:var(--y);
  width:13px;height:13px;margin:-6.5px 0 0 -6.5px;border-radius:50%;
  background:#3E86FF;
  transition:top .8s cubic-bezier(.16,.84,.26,1)}
/* La linea: blanca, arranca un buen hueco por debajo del punto —en la
   referencia ese hueco es casi dos veces y media el punto— y baja hasta el
   galon. Va a .9 y no a .6: con la hebra encendida detras, a .6 dejaba de
   mandar, y en la referencia la barra es lo mas claro de todo el margen. */
.ruta-linea{position:absolute;left:0;right:0;
  top:calc(var(--y) + 27px);bottom:15px;
  background:rgba(255,255,255,.9);
  box-shadow:0 0 6px rgba(255,255,255,.25);
  transition:top .8s cubic-bezier(.16,.84,.26,1)}
.ruta-flecha{position:absolute;left:50%;bottom:0;width:15px;height:15px;
  margin-left:-7.5px;display:grid;place-items:center;color:rgba(255,255,255,.9)}
.ruta-flecha svg{width:15px;height:15px;fill:none;stroke:currentColor;
  stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}

.ruta-f{position:relative;padding-block:0 clamp(46px,5.6vw,96px)}
.ruta-f:last-of-type{padding-bottom:0}
/* ── el filete que separa una fase de la siguiente ──
   Tres bloques de texto seguidos, con 33 px entre ellos en el telefono, se
   leian como un muro. El filete los separa y de paso le da a la seccion un
   ritmo que antes no tenia.

   Arranca en la COLUMNA del texto, no en el borde: si cruzara el carril
   partiria el rail en tres, y el rail es una linea continua a proposito. Y se
   desvanece hacia la derecha, que una raya de lado a lado en un sitio donde no
   hay nada a la derecha se lee como un subrayado suelto. */
.ruta-f + .ruta-f{padding-top:clamp(46px,5.6vw,96px)}
.ruta-f + .ruta-f::before{content:"";position:absolute;top:0;
  left:var(--carril);right:0;height:1px;pointer-events:none;
  background:linear-gradient(to right,
    rgba(160,200,255,.24),rgba(160,200,255,.07) 58%,transparent 92%)}

.ruta-cab{display:flex;align-items:baseline;gap:clamp(10px,1.6vw,18px);
  font-family:var(--m);font-size:clamp(9.5px,1vw,11px);letter-spacing:.2em;
  text-transform:uppercase}
.ruta-n{color:rgba(160,190,240,.68);font-variant-numeric:tabular-nums}
.ruta-est{color:rgba(160,190,240,.68);
  transition:color .45s var(--ease,ease)}
.ruta-f.on .ruta-est{color:#79ABFF}
.ruta-t{margin:clamp(8px,1.2vw,16px) 0 0;font-weight:400;
  font-size:clamp(24px,3.6vw,46px);letter-spacing:-.035em;line-height:1.04;
  color:rgba(255,255,255,.5);transition:color .55s var(--ease,ease)}
.ruta-f.on .ruta-t{color:#fff}
.ruta-p{margin:clamp(10px,1.4vw,18px) 0 0;max-width:56ch;
  font-size:clamp(14px,1.35vw,17px);line-height:1.55;
  color:rgba(226,236,250,.5);transition:color .55s var(--ease,ease)}
.ruta-f.on .ruta-p{color:rgba(226,236,250,.76)}


@media(max-width:760px){
  /* En el telefono la hebra pesaba demasiado: ocupaba el mismo sitio relativo
     que en una pantalla de 1440 y ahi es media pantalla. Baja de ancho, de
     trazo y de luz. */
  .ruta{--carril:clamp(58px,17vw,78px);--adn:clamp(28px,8vw,36px)}
  .ruta-adn{opacity:.72}
  .ruta-adn path{filter:drop-shadow(0 0 1.3px rgba(130,185,255,.75))}
  /* Las chispas encogen por tamaño, no por «transform»: el transform ya lo
     usa su propio latido y una cosa pisaria a la otra. */
  .ruta-adn i{width:calc(var(--s) * .72);height:calc(var(--s) * .72);
    margin:calc(var(--s) * -.36);box-shadow:0 0 calc(var(--s) * 1.4) rgba(160,205,255,.9)}
  .ruta-h{max-width:none}
  .ruta-marca{display:none}   /* a 360 px no cabe en la misma linea */
  .ruta-p{max-width:none}
}
/* Sin movimiento el rail sigue puesto —el dibujo es el mismo— y lo unico que
   se quita es el viaje del punto: salta en vez de deslizarse. */
@media(prefers-reduced-motion:reduce){
  .ruta-punto,.ruta-linea,.ruta-t,.ruta-p,.ruta-est{transition:none}
}
""" + '\n' + FIN

JS = """<script>
/* ══ la ruta ══ Lo aplica herramientas/ruta.py ═════════════════════════════ */
(function(){
  var lista = document.getElementById('rutaLista');
  if(!lista) return;
  var fases = [].slice.call(lista.querySelectorAll('.ruta-f'));
  if(!fases.length) return;

  /* ── donde va cada cosa ──
     El renglon del contador de cada fase: ahi se para el punto. Medido, no a
     ojo: a ojo se descuadra en cuanto un titular pasa a dos renglones, que en
     movil pasa siempre. */
  var ys = [];
  function medir(){
    var cl = lista.getBoundingClientRect();
    ys = fases.map(function(f){
      var c = f.querySelector('.ruta-cab').getBoundingClientRect();
      return (c.top - cl.top) + c.height / 2;
    });
    /* El rail baja hasta pasado el texto de la ULTIMA fase, no hasta su
       contador: parado en el contador, el ultimo tramo de linea salia de
       treinta pixeles y en la referencia la linea es larga. */
    var fin = fases[fases.length - 1].querySelector('.ruta-p').getBoundingClientRect();
    var abajo = (fin.bottom - cl.top) + 30;
    lista.style.setProperty('--a', ys[0].toFixed(1) + 'px');
    lista.style.setProperty('--b', (abajo - ys[0]).toFixed(1) + 'px');
    pon(activa);
  }
  var activa = 0;
  function pon(i){
    activa = i;
    lista.style.setProperty('--y', (ys.length ? ys[i] - ys[0] : 0).toFixed(1) + 'px');
    for(var k = 0; k < fases.length; k++) fases[k].classList.toggle('on', k <= i);
  }

  /* La linea de activacion: el 62 % de la pantalla. Mas arriba y la fase se
     enciende antes de que se lea; mas abajo, cuando ya pasaste. */
  var LINEA = 0.62;
  var pendiente = false;

  function paso(){
    pendiente = false;
    var h = innerHeight || document.documentElement.clientHeight;
    var y = h * LINEA;
    /* Aqui habia un atajo —«si la lista queda fuera de pantalla, no calcules»—
       y era un fallo: al volver a subir, la lista se quedaba a un pelo de ese
       margen, el guion se saltaba el calculo y el punto se quedaba clavado en
       la ultima fase con las tres encendidas. El bucle de abajo ya resuelve
       los dos extremos solo —ninguna por encima de la linea da la primera,
       todas por encima dan la ultima—, asi que el atajo no ahorraba nada y
       rompia el unico caso que no se ve al bajar: el de volver. */
    var i = 0;
    for(var k = 0; k < fases.length; k++){
      var c = fases[k].querySelector('.ruta-cab').getBoundingClientRect();
      if(c.top + c.height / 2 <= y) i = k;
    }
    if(i !== activa) pon(i);
  }
  function pedir(){ if(pendiente) return; pendiente = true; requestAnimationFrame(paso); }

  medir(); pedir();
  /* Se escucha el scroll TAMBIEN sin movimiento: quien lo tiene desactivado
     sigue bajando por la pagina y tiene que ver por que fase va. Lo que se
     apaga es el deslizamiento del punto —salta—, y eso lo hace el CSS. */
  addEventListener('scroll', pedir, {passive:true});
  addEventListener('resize', function(){ medir(); pedir(); });
  /* El alto cambia cuando entran las fuentes y cuando las secciones de arriba
     se despliegan: sin esto el rail se queda con la medida del primer cuadro. */
  if(window.ResizeObserver) new ResizeObserver(function(){ medir(); pedir(); }).observe(lista);
  addEventListener('load', function(){ medir(); pedir(); });
})();
</script>"""


# El rotulo de la esquina saca el nombre de un mapa; sin entrada, enseña el
# identificador en crudo —«ruta»—. Se añade la suya.
NOMBRE_VIEJO = "    join:'In the open'\n  };"
NOMBRE_NUEVO = "    join:'In the open', ruta:'Roadmap'\n  };"


def aplicar(html):
    """Idempotente."""
    if NOMBRE_NUEVO not in html:
        assert html.count(NOMBRE_VIEJO) == 1, 'no esta el mapa de nombres del rotulo'
        html = html.replace(NOMBRE_VIEJO, NOMBRE_NUEVO, 1)
    # ── el marcado, justo debajo de la seccion de proyectos ──
    ancla = '<section class="hpin" id="docs"'
    if '<section class="ruta" id="ruta"' in html:
        i = html.index('<section class="ruta" id="ruta"')
        i = html.rindex('\n\n', 0, i)
        j = html.index('</section>', i) + len('</section>')
        html = html[:i] + _marcado().rstrip('\n') + html[j:]
    else:
        assert html.count(ancla) == 1, 'no esta la seccion de documentacion'
        k = html.index(ancla)
        html = html[:k] + _marcado().lstrip('\n') + html[k:]

    # ── el CSS ──
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        html = html[:i] + CSS.strip('\n') + html[j:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)

    # ── el guion ──
    if MARCA_JS in html:
        i = html.index(MARCA_JS)
        j = html.index('</script>', i) + len('</script>')
        html = html[:i] + JS.strip('\n') + html[j:]
    else:
        assert html.count('</body>') == 1
        html = html.replace('</body>', JS.strip('\n') + '\n</body>', 1)
    return html
