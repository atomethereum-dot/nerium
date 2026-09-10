# -*- coding: utf-8 -*-
"""Que la pagina deje de verse blanca y vacia.

Recorrida seccion por seccion, el problema no estaba repartido: estaba en
tres sitios concretos.

  · «Compatible with» era una pantalla entera de blanco con una fila de
    nombres en gris claro pasando. Nada mas.
  · «What it guarantees» eran cuatro titulos sueltos con un icono al fondo y
    el 80 % de cada fila vacio: decia QUE hace, nunca por que importa.
  · «In the open» eran dos tarjetas medio vacias.

Y por debajo, el blanco liso. Seis secciones con #FFFFFF plano seguidas es lo
que hace que una pagina parezca una plantilla sin terminar.

`montar_home.py` lo aplica en el paso 14.
"""
import random
import re

FIN = '/* ══ fin: pagina ══ */'
MARCA = '/* ══ el papel, la compatibilidad y las filas ══'

# ── el tapiz de las secciones claras ─────────────────────────────────────────
# El primer intento fue demasiado fino: dos focos al 6 % y grano al 3,6 %. Se
# notaba, pero no se veia, y lo que hacia falta era un fondo de verdad.
#
# Este es el MISMO campo de bloques de la portada, pero quieto y palido: la
# pagina entera pasa a hablar un solo idioma en vez de tener una portada con
# personalidad y detras seis folios en blanco. Y esta compuesto igual que
# aquel: los bloques se apartan del centro, que es donde va el texto, asi que
# el hueco de leer es parte del dibujo y no una casualidad.
#
# Va como archivo (img/tapiz.svg) y no metido en el CSS: son 18 kB que asi se
# guardan en cache y no engordan cada carga del index.html.
W, H = 1600, 1000
U = 40                                  # la celda, como en la portada
AZUL = [(47,107,255), (121,171,255), (27,58,140), (150,178,232)]

def tapiz(semilla=7):
    r = random.Random(semilla)
    piezas = []
    cols, filas = W // U, H // U
    for _ in range(190):
        # se apartan del centro: ahi va el texto
        while True:
            cx = r.randrange(cols)
            cy = r.randrange(filas)
            dx = abs(cx / cols - .5) * 2
            dy = abs(cy / filas - .5) * 2
            d = (dx * dx * 1.15 + dy * dy) ** .5
            if r.random() < min(1.0, d * 1.35):
                break
        an = r.choice([1, 1, 2, 2, 3, 4]) * U
        al = U
        c = AZUL[r.randrange(len(AZUL))]
        a = round(r.uniform(.022, .072) * (0.42 + d * 0.72), 3)
        piezas.append('<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="rgb(%d,%d,%d)" opacity="%s"/>'
                      % (cx * U, cy * U, an, al, c[0], c[1], c[2], a))
    blooms = (
      '<circle cx="150" cy="70" r="620" fill="url(#b1)"/>'
      '<circle cx="1480" cy="960" r="560" fill="url(#b2)"/>'
      '<circle cx="820" cy="520" r="480" fill="url(#b3)"/>')
    def rg(nid, col, op):
        return ('<radialGradient id="' + nid + '">'
                '<stop offset="0" stop-color="' + col + '" stop-opacity="' + op + '"/>'
                '<stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>')
    defs = ('<defs>' + rg('b1', 'rgb(47,107,255)', '.13')
                     + rg('b2', 'rgb(91,140,255)', '.11')
                     + rg('b3', 'rgb(255,255,255)', '.10') + '</defs>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
            'preserveAspectRatio="xMidYMid slice">%s%s%s</svg>'
            % (W, H, defs, blooms, ''.join(piezas)))


def escribir_tapiz(raiz):
    """Deja img/tapiz.svg al dia. Con semilla fija: el mismo dibujo siempre."""
    import os
    ruta = os.path.join(raiz, 'img', 'tapiz.svg')
    dibujo = tapiz()
    try:
        if open(ruta, encoding='utf-8').read() == dibujo:
            return ruta
    except OSError:
        pass
    open(ruta, 'w', encoding='utf-8').write(dibujo)
    return ruta


# ── el grano ─────────────────────────────────────────────────────────────────
# Un blanco liso de verdad no existe en nada impreso. Este es ruido fractal de
# 140x140 al 3 %, generado por el propio navegador —no es una imagen que
# descargar— y se tesela. No se ve; se nota.
GRANO = ("url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' "
         "width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence "
         "type='fractalNoise' baseFrequency='.92' numOctaves='3' stitchTiles='stitch'/%3E"
         "%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect "
         "width='140' height='140' filter='url(%23n)' opacity='.036'/%3E%3C/svg%3E\")")

CSS = """
/* ══ el papel, la compatibilidad y las filas ═════════════════════════════ */

/* ── 1 · el papel: un fondo de verdad ──
   Seis secciones de #FFFFFF plano seguidas es lo que hace que una pagina
   parezca una plantilla a medio terminar. Y no bastaba con insinuarlo: el
   primer intento fueron dos focos al 6 % y grano, y se notaba pero no se veia.
   Ahora lleva tapiz: el MISMO campo de bloques de la portada, quieto y palido,
   asi que la pagina entera habla un solo idioma en vez de tener una portada
   con caracter y detras seis folios en blanco. Esta compuesto igual que aquel
   —los bloques se apartan del centro—, de modo que el hueco por donde se lee
   es parte del dibujo. Encima va el grano, que es lo que quita el ultimo resto
   de blanco de plantilla. */
:root{--grano:%(GRANO)s}
.paper,.paper2,.secure,.sale,.tkp,.join,.press{
  background-image:var(--grano),url(img/tapiz.svg);
  background-repeat:repeat,no-repeat;
  background-size:auto,cover;
  background-position:0 0,center}
/* Todas lo miran por el centro, y no cada una por una esquina: el tapiz esta
   dibujado para dejar el medio libre, que es por donde se lee, y recortarlo
   por un lado metia los bloques justo detras del titular. */
@media(max-width:760px){
  /* En vertical, «cover» agranda tanto el dibujo que los bloques dejan de
     serlo y se vuelven manchas. Se le fija el ancho y se repite hacia abajo:
     los bloques recuperan su tamano y la costura, a este contraste, no se ve. */
  .paper,.paper2,.secure,.sale,.tkp,.join,.press{
    background-size:auto,860px auto;
    background-repeat:repeat,repeat-y;
    background-position:0 0,center top}
}

/* ── 2 · «Compatible with»: la seccion mas vacia de la pagina ──
   Era una pantalla entera de blanco con siete nombres en gris pasando de
   largo. Ahora cada uno va en su ficha, con el color de su marca, sobre una
   banda con luz. Los puntos son eso, puntos de color: no se falsifica el
   logotipo de nadie. */
.logos{position:relative}
.lane{margin-top:clamp(26px,3vw,40px);padding:clamp(16px,2vw,26px) 0;position:relative}
.lane::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(90deg,rgba(47,107,255,0) 0%,rgba(47,107,255,.045) 18%,
    rgba(47,107,255,.045) 82%,rgba(47,107,255,0) 100%)}
.lane-in{gap:14px}
.lane-in span{display:inline-flex;align-items:center;gap:10px;
  padding:11px 17px 11px 14px;border-radius:12px;
  background:rgba(255,255,255,.92);border:1px solid #E4E8EF;
  box-shadow:0 1px 2px rgba(10,12,16,.04);
  font-size:clamp(14px,1.3vw,16px);font-weight:500;letter-spacing:-.02em;
  color:rgba(10,12,16,.78);
  transition:border-color .25s,box-shadow .3s,color .25s,transform .3s}
.lane-in span::before{content:"";width:9px;height:9px;border-radius:3px;flex:0 0 auto;
  background:var(--pt,#2F6BFF);box-shadow:0 0 0 3px color-mix(in srgb,var(--pt,#2F6BFF) 16%,transparent)}
.lane-in span:hover{color:#0A0C10;border-color:#C9D8F6;transform:translateY(-2px);
  box-shadow:0 10px 24px -14px rgba(12,26,66,.5)}
/* el color de cada uno, por su sitio en la fila (siete, repetidos dos veces) */
.lane-in span:nth-child(7n+1){--pt:#627EEA}   /* Ethereum   */
.lane-in span:nth-child(7n+2){--pt:#F0B90B}   /* BNB        */
.lane-in span:nth-child(7n+3){--pt:#2F6BFF}   /* capital    */
.lane-in span:nth-child(7n+4){--pt:#4C82FB}   /* DexScreener*/
.lane-in span:nth-child(7n+5){--pt:#3375BB}   /* Trust      */
.lane-in span:nth-child(7n+6){--pt:#E2761B}   /* MetaMask   */
.lane-in span:nth-child(7n+7){--pt:#F0B90B}   /* Binance    */
.lane-k{margin-bottom:0}
.lane-sub{margin:12px auto 0;max-width:56ch;text-align:center;
  font-size:clamp(15px,1.35vw,17px);line-height:1.5;color:rgba(10,12,16,.56)}

/* ── 3 · las cuatro garantias decian QUE, nunca POR QUE ──
   Cuatro titulos sueltos con un icono al otro extremo y el 80 % de la fila en
   blanco. Cada uno se lleva ahora su linea, sacada de lo que dice el propio
   whitepaper, y la fila se reparte en dos columnas en vez de dejar el hueco. */
.rows li{align-items:flex-start;padding-top:clamp(20px,2.2vw,28px);
  padding-bottom:clamp(20px,2.2vw,28px)}
.rows b{flex:0 0 auto;width:clamp(200px,26vw,330px)}
.rows .rd{flex:1 1 0;min-width:0;font-size:clamp(14px,1.28vw,16.5px);line-height:1.5;
  font-weight:400;letter-spacing:-.012em;color:rgba(10,12,16,.56);
  padding-right:clamp(12px,2vw,34px)}
.rows li:hover .rd{color:rgba(10,12,16,.78)}
.rows .rn{padding-top:.35em}
.rows .ic{align-self:flex-start;margin-top:-2px}
@media(max-width:820px){
  .rows li{flex-wrap:wrap}
  .rows b{width:auto;flex:1 1 auto}
  .rows .rd{flex:1 0 100%;padding-right:0;margin-top:8px;padding-left:34px}
}

/* ── 4 · «In the open»: dos tarjetas medio vacias ──
   Un halo del color de cada red al fondo, que es lo que llena sin inventar
   datos que no tenemos. Va en z-index 0 —encima del fondo de la tarjeta y
   debajo del contenido—: en -1, con el ::before que ya tenia la tarjeta, se
   quedaba detras del propio fondo y no se veia. */
/* Con el papel ya texturado, una tarjeta transparente deja verse el tapiz por
   dentro y deja de parecer una tarjeta: se le pone fondo propio. */
.jbtn{overflow:hidden;background:rgba(255,255,255,.90)}
.jbtn::after{content:"";position:absolute;z-index:0;right:-12%;bottom:-38%;
  width:60%;aspect-ratio:1;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle at 50% 50%,
    color-mix(in srgb,var(--jb,#2F6BFF) 22%,transparent) 0%, transparent 70%);
  transition:transform .65s cubic-bezier(.16,.84,.26,1),opacity .4s;opacity:.85}
.jbtn:hover::after{transform:scale(1.3);opacity:1}
.jbtn-top,.jbtn-foot{position:relative;z-index:1}
/* y abajo sobraba media pantalla de blanco */
.join{padding-bottom:clamp(48px,5.4vw,84px)}
/* ══ fin: pagina ══ */
"""


TRAD = {
 'es': ['Se liquidan todas las patas o ninguna.',
        'Registro publico; la politica viaja con el activo.',
        'Se comprueba antes de escribir nada, no despues.',
        'Segundos, no dias, y sin revisiones manuales que escalar.'],
 'zh': ['要么全部结算，要么一笔都不结算。',
        '公开账本；规则随资产一同流转。',
        '写入之前就校验，而不是事后补救。',
        '以秒计而非以天计，且无需人工逐笔核查。'],
 'ko': ['전부 결제되거나, 하나도 결제되지 않습니다.',
        '공개 원장이며, 정책이 자산과 함께 이동합니다.',
        '기록한 뒤가 아니라 기록하기 전에 확인합니다.',
        '며칠이 아닌 몇 초, 수작업 검토 없이.'],
 'ja': ['すべての脚が決済されるか、ひとつも決済されないか。',
        '公開台帳。ルールは資産とともに移動します。',
        '記録したあとではなく、記録する前に検証します。',
        '数日ではなく数秒。手作業の確認は要りません。'],
 'pt': ['Ou liquidam todas as pernas, ou nenhuma.',
        'Registo publico; a politica viaja com o ativo.',
        'Verifica-se antes de escrever, nao depois.',
        'Segundos, nao dias, e sem verificacoes manuais a escalar.'],
 'fr': ['Toutes les jambes sont reglees, ou aucune.',
        'Registre public ; la regle voyage avec l’actif.',
        'On verifie avant d’ecrire, pas apres.',
        'Des secondes, pas des jours, et aucun controle manuel a passer a l’echelle.'],
 'de': ['Entweder alle Teile werden abgewickelt oder keiner.',
        'Offenes Register; die Regel reist mit dem Vermogenswert.',
        'Gepruft wird vor dem Schreiben, nicht danach.',
        'Sekunden statt Tage — ohne manuelle Prufungen.'],
 'tr': ['Ya tum bacaklar takas olur ya da hicbiri.',
        'Acik kayit; kural varlikla birlikte yolculuk eder.',
        'Yazmadan once dogrulanir, sonra degil.',
        'Gunler degil saniyeler, elle kontrol buyutmeden.'],
 'vi': ['Hoặc tất cả các chân đều tất toán, hoặc không chân nào.',
        'Sổ cái công khai; quy tắc đi cùng tài sản.',
        'Kiểm tra trước khi ghi, không phải sau.',
        'Vài giây chứ không phải vài ngày, không cần kiểm tra thủ công.'],
 'ru': ['Либо расчёт проходит целиком, либо не проходит вовсе.',
        'Открытый реестр; правило едет вместе с активом.',
        'Проверка до записи, а не после.',
        'Секунды, а не дни, и без ручных проверок.'],
 'id': ['Semua kaki selesai, atau tidak satu pun.',
        'Catatan publik; aturannya ikut bersama asetnya.',
        'Diperiksa sebelum ditulis, bukan sesudahnya.',
        'Hitungan detik, bukan hari, tanpa pemeriksaan manual.'],
 'ar': ['إمّا أن تُسوّى كلّ الأطراف أو لا يُسوّى أيّ منها.',
        'سجلّ علنيّ؛ والقاعدة ترافق الأصل.',
        'يُتحقّق قبل الكتابة لا بعدها.',
        'ثوانٍ لا أيّام، وبلا مراجعات يدوية.'],
}

LINEAS = [
    ('All-or-nothing settlement', 'Every leg settles, or none does.'),
    ('Controlled visibility',     'A public register; the policy travels with the asset.'),
    ('Always-on security',        'Checked before anything is written, not after.'),
    ('Performance under load',    'Seconds, not days, and no manual checks to scale.'),
]

SUB = ('The chains it settles on and the wallets it already works with. '
       'Nothing to install, nothing to migrate.')


# ── el marcado ───────────────────────────────────────────────────────────────
ANCLA_SUB = '<h2 class="rv lane-k">Compatible with</h2>'


def _lineas(html):
    """Cada garantia se lleva su linea. El texto va DESPUES del <b>, que es
       donde el traductor lo encuentra como nodo suelto."""
    for titulo, linea in LINEAS:
        viejo = '<b>%s</b>' % titulo
        nuevo = '<b>%s</b><span class="rd">%s</span>' % (titulo, linea)
        if viejo in html and nuevo not in html:
            html = html.replace(viejo, nuevo, 1)
    return html


def _traducir(html):
    m = re.search(r'(<script id="i18n" type="application/json">)(.*?)(</script>)',
                  html, re.S)
    if not m:
        return html
    import json
    d = json.loads(m.group(2))
    claves = [l for _, l in LINEAS] + [SUB]
    for lang, vals in TRAD.items():
        if lang not in d:
            continue
        for k, v in zip(claves, vals + [SUBS.get(lang, SUB)]):
            d[lang].setdefault(k, v)
    crudo = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    assert '</script' not in crudo
    return html[:m.start(2)] + crudo + html[m.end(2):]


SUBS = {
 'es': 'Las cadenas en las que liquida y las carteras con las que ya funciona. Nada que instalar, nada que migrar.',
 'zh': '它结算所在的链，以及已经支持的钱包。无需安装，无需迁移。',
 'ko': '결제가 이루어지는 체인과 이미 연동되는 지갑들. 설치도, 이전도 필요 없습니다.',
 'ja': '決済に使うチェーンと、すでに使えるウォレット。インストールも移行も不要です。',
 'pt': 'As redes onde liquida e as carteiras com que ja funciona. Nada para instalar, nada para migrar.',
 'fr': 'Les chaines ou il regle et les portefeuilles avec lesquels il fonctionne deja. Rien a installer, rien a migrer.',
 'de': 'Die Chains, auf denen abgewickelt wird, und die Wallets, die schon funktionieren. Nichts zu installieren, nichts zu migrieren.',
 'tr': 'Takasin yapildigi aglar ve halihazirda calisan cuzdanlar. Kurulum yok, gecis yok.',
 'vi': 'Các chuỗi nơi nó tất toán và các ví đã hoạt động. Không cần cài đặt, không cần di chuyển.',
 'ru': 'Сети, в которых идёт расчёт, и кошельки, которые уже работают. Ничего не нужно ставить и переносить.',
 'id': 'Rantai tempat ia menyelesaikan dan dompet yang sudah berfungsi. Tidak ada yang dipasang, tidak ada yang dipindah.',
 'ar': 'الشبكات التي تُسوّى عليها والمحافظ التي تعمل معها بالفعل. لا شيء تُثبّته ولا شيء تنقله.',
}


def aplicar(html):
    """Idempotente."""
    html = _lineas(html)
    if 'lane-sub' not in html and ANCLA_SUB in html:
        html = html.replace(ANCLA_SUB,
                            ANCLA_SUB + '\n    <p class="lane-sub rv">%s</p>' % SUB, 1)
    bloque = CSS.replace('%(GRANO)s', GRANO)   # replace, no %%: el CSS va lleno de porcentajes
    if MARCA in html:
        i = html.index(MARCA)
        # hasta el sello de cierre, NO hasta </style>: detras puede haber otro
        # modulo con su bloque, y cortar hasta el final se lo llevaba por delante
        if FIN in html[i:]:
            j = html.index(FIN, i) + len(FIN)
        else:
            # bloque de antes de que existiera el sello: se corta en el
            # siguiente bloque (todos empiezan por la doble raya) o al final
            cierre = html.index('\n</style>', i)
            sig = html.find('/* \u2550\u2550 ', i + len(MARCA))
            j = cierre if sig < 0 or sig > cierre else sig
        html = html[:i] + bloque.strip('\n') + html[j:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + bloque.strip('\n') + '\n</style>', 1)
    return _traducir(html)
