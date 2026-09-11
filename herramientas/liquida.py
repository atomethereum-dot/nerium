# -*- coding: utf-8 -*-
"""La portada ejecuta lo que la cadena promete.

Lo que le faltaba a la portada no era acabado: era ser de alguien. Un campo de
bloques cayendo con el titular centrado encima lo tiene media industria, y
hecho con mas o menos gusto, pero de nadie.

Nereum si tiene algo que no tiene el resto, y esta escrito en su propia
pagina, tres secciones mas abajo: «Every leg settles, or none does». Todo o
nada. Esa es la promesa, y una portada que la ENSENA vale mas que cualquier
efecto.

Asi que la tira de pruebas —hoy cuatro datos en gris claro flotando, lo mas
flojo que hay arriba— pasa a ser un RAIL DE LIQUIDACION. Las cuatro patas
llegan de los lados a destiempo, se quedan esperando, y cuando llega la ultima
cierran LAS CUATRO EN EL MISMO FOTOGRAMA, con un barrido que las sella. Lo
hace tres veces y se queda liquidado. Si una no llega, no cierra ninguna: eso
es justamente lo que se quiere contar.

No estrena ni un texto: las cuatro patas son los cuatro datos que ya estaban
—ronda abierta, precio, redes, contratos verificados— con sus traducciones.

Y de paso lo que el telefono dejaba ver y yo no habia mirado nunca:

  · los dos botones partian en dos renglones —«Join the Seed / Round»—, que es
    el detalle que mas barata una portada;
  · los botones median 38 px debajo de un titular de 100: parecian una nota;
  · la tira se amontonaba en dos renglones sin separadores.

`montar_home.py` lo aplica en el paso 19.
"""

MARCA = '/* ══ la portada liquida ══'
FIN = '/* ══ fin: liquida ══ */'

# El rail envuelve la tira que ya existe: no se toca ni un texto ni el orden.
ANCLA = '<ul class="hero-pr">'
ABRE = '<div class="lq" id="lq"><i class="lq-rail" aria-hidden="true"></i>\n    '
CIERRA = '\n    <i class="lq-sweep" aria-hidden="true"></i></div>'
FIN_UL = '</ul>'


CSS = """
/* ══ la portada liquida ═══════════════════════════════════════════════════
   «Every leg settles, or none does» lo dice la propia pagina tres secciones
   mas abajo. Una portada que lo ENSENA vale mas que cualquier efecto, y es lo
   unico de aqui arriba que no puede tener otro. */

/* ── 1 · el rail ── */
.lq{position:relative;display:inline-block;max-width:100%;
  margin:clamp(30px,3.6vw,46px) auto 0;padding:0 clamp(6px,1.4vw,18px) 15px}
/* La linea no esta desde el principio: se DIBUJA al cerrar. Antes de eso hay
   cuatro datos sueltos; despues hay un asiento. */
.lq-rail{position:absolute;left:0;right:0;bottom:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(164,200,255,.8) 10%,
    rgba(164,200,255,.8) 90%,transparent);
  transform:scaleX(0);transform-origin:50% 50%}
/* Los topes del rail. Una linea suelta es una linea; una linea con sus dos
   topes es un asiento cerrado, que es lo que se quiere decir. */
.lq::before,.lq::after{content:"";position:absolute;bottom:0;width:1px;height:9px;
  background:#BBD4FF;box-shadow:0 0 6px rgba(160,200,255,.7);
  transform:scaleY(0);transform-origin:50% 100%}
.lq::before{left:0}
.lq::after{right:0}
.ready .lq::before,.ready .lq::after{
  animation:lqMarca 7.2s cubic-bezier(.16,.84,.26,1) 3 forwards}
@media(prefers-reduced-motion:reduce){
  .lq::before,.lq::after{transform:scaleY(1);animation:none}
}

/* El barrido que las sella: pasa una vez, en el fotograma del cierre. */
.lq-sweep{position:absolute;left:0;right:0;bottom:0;height:1px;opacity:0;
  background:linear-gradient(90deg,transparent,#CFE0FF,transparent);
  box-shadow:0 0 12px rgba(180,210,255,.85)}

.lq .hero-pr{margin:0;gap:10px clamp(14px,2vw,30px)}
/* Cada pata entra por su lado y espera. La 4 llega la ultima: hasta que no
   esta, no cierra ninguna. */
.lq .hero-pr li{position:relative;opacity:.34;
  transform:translateX(var(--lq-x,0)) translateY(0)}
.lq .hero-pr li:nth-child(1){--lq-x:-26px}
.lq .hero-pr li:nth-child(2){--lq-x:-14px}
.lq .hero-pr li:nth-child(3){--lq-x:14px}
.lq .hero-pr li:nth-child(4){--lq-x:26px}
/* La marca de cada pata en el rail: aparece al cerrar, no antes. */
.lq .hero-pr li::after{content:"";position:absolute;left:50%;bottom:-15px;
  width:1px;height:8px;background:#BBD4FF;box-shadow:0 0 6px rgba(160,200,255,.7);
  transform:translateX(-50%) scaleY(0);transform-origin:50% 100%}

/* ── 2 · el cierre ──
   Todas las animaciones duran LO MISMO y solo cambia el retardo dentro del
   ciclo: asi el cierre cae en el mismo fotograma para las cuatro, que es todo
   el asunto. Tres vueltas y se queda liquidado —«forwards» deja el ultimo
   fotograma puesto—, porque una portada que repite un efecto sin parar cansa;
   lo ensena, lo demuestra y se calla. */
@keyframes lqPata{
  0%{opacity:.34}
  14%{opacity:.34;transform:translateX(var(--lq-x,0))}
  /* llega y espera, quieta y a media luz */
  26%{opacity:.62;transform:translateX(0)}
  40%{opacity:.62;transform:translateX(0)}
  /* el fotograma del cierre */
  42%{opacity:1;transform:translateX(0)}
  100%{opacity:1;transform:translateX(0)}
}
@keyframes lqRail{0%,40%{transform:scaleX(0)}52%,100%{transform:scaleX(1)}}
/* Dos juegos: las marcas de cada pata van centradas bajo ella —de ahi el
   translateX—, y los topes van pegados a los extremos y no se centran. */
@keyframes lqMarca{0%,40%{transform:scaleY(0)}50%,100%{transform:scaleY(1)}}
@keyframes lqMarcaPata{0%,40%{transform:translateX(-50%) scaleY(0)}
  50%,100%{transform:translateX(-50%) scaleY(1)}}
@keyframes lqBarrido{
  0%,40%{opacity:0;transform:translateX(-38%) scaleX(.25)}
  44%{opacity:1}
  58%{opacity:0;transform:translateX(38%) scaleX(.25)}
  100%{opacity:0}
}
.ready .lq .hero-pr li{animation:lqPata 7.2s cubic-bezier(.16,.84,.26,1) 3 forwards}
.ready .lq .hero-pr li:nth-child(1){animation-delay:.55s}
.ready .lq .hero-pr li:nth-child(2){animation-delay:.30s}
.ready .lq .hero-pr li:nth-child(3){animation-delay:.15s}
.ready .lq .hero-pr li:nth-child(4){animation-delay:0s}
.ready .lq .hero-pr li::after{animation:lqMarcaPata 7.2s cubic-bezier(.16,.84,.26,1) 3 forwards}
.ready .lq-rail{animation:lqRail 7.2s cubic-bezier(.16,.84,.26,1) 3 forwards}
.ready .lq-sweep{animation:lqBarrido 7.2s cubic-bezier(.16,.84,.26,1) 3 forwards}

/* Quien pida menos movimiento lo ve ya liquidado, que es el estado que
   importa: el efecto es el argumento, no el adorno. */
@media(prefers-reduced-motion:reduce){
  .lq .hero-pr li{opacity:1;transform:none;animation:none}
  .lq .hero-pr li::after{transform:translateX(-50%) scaleY(1);animation:none}
  .lq-rail{transform:scaleX(1);animation:none}
  .lq-sweep{display:none}
}

/* ── 3 · los botones ──
   Los subi de 38 a 52 px porque me parecian una nota al pie debajo de un
   titular de 100. Vuelven a su tamano: era una opinion mia y no la del que
   mira la pagina. Lo que SI se queda arreglado es que no partan en dos
   renglones, que eso no era opinion, era un defecto. */
.hero-act{gap:clamp(10px,1.2vw,14px)}
.hero-act .hb.blue{box-shadow:0 14px 30px -18px rgba(47,107,255,.6)}

/* ── 4 · el telefono ──
   Aqui es donde de verdad se veia barata, y no lo habia mirado nunca: los dos
   botones partian en dos renglones —«Join the Seed / Round»— y la tira se
   amontonaba sin separadores. Los botones pasan a ocupar el ancho, uno encima
   del otro, y cada uno cabe en su renglon. */
@media(max-width:700px){
  /* Uno encima del otro y del MISMO ancho: puestos en fila no caben y parten
     en dos renglones, y puestos a lo ancho de su texto quedan uno mas largo
     que otro, que se ve descuadrado. Del tamano de siempre. */
  .hero-act{flex-direction:column;align-items:center;gap:10px}
  .hero-act .hb{justify-content:center;width:min(100%,264px);white-space:nowrap}

  /* La tira, en UNA columna centrada.
     La puse en rejilla de dos columnas y quedaba torcida, y medido se ve por
     que: los cuatro textos miden cosas muy distintas —«1 NRM = $0.20» y
     «ETHEREUM · BNB CHAIN» no se parecen en nada—, asi que en dos columnas
     cada pata caia en un sitio, con centros en 100 y 270 y la pantalla en 195.
     Con cuatro largos que no se parecen, dos columnas no cuadran nunca. Una
     sola columna centrada no puede torcerse. */
  .lq{display:block;width:100%;padding-inline:0;padding-bottom:13px}
  /* Y el «max-width» hay que soltarlo. La tira traia de antes
     «max-width:330px; margin-inline:auto», que se centraba sola; mi regla de
     arriba puso «margin:0» para quitarle el margen superior y de paso se
     llevo por delante el «auto». Resultado: 330 px de texto pegados a la
     izquierda dentro de un rail de 390, y el desvio creciendo con la
     pantalla —0 a 360 px, 10 a 390, 30 a 430—. Eso era lo torcido, y es mio.
     Sin tope, el texto y el rail miden lo mismo y no pueden discrepar. */
  .lq .hero-pr{display:flex;flex-direction:column;align-items:center;
    max-width:none;gap:9px;font-size:10px;letter-spacing:.12em}
  .lq .hero-pr li{justify-content:center}
  /* En columna las patas entran alternando arriba/abajo en vez de por los
     lados: en vertical un desplazamiento lateral no se lee como «llegar». */
  .lq .hero-pr li{--lq-x:0}
  .lq .hero-pr li:nth-child(odd){--lq-x:-16px}
  .lq .hero-pr li:nth-child(even){--lq-x:16px}
  /* Las marcas de cada pata se caen: en columna quedarian colgando contra
     nada. El cierre lo cuentan el rail, sus topes y el barrido. */
  .lq .hero-pr li::after{display:none}
}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    if '<div class="lq"' not in html and ANCLA in html:
        i = html.index(ANCLA)
        j = html.index(FIN_UL, i) + len(FIN_UL)
        html = html[:i] + ABRE + html[i:j] + CIERRA + html[j:]
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
