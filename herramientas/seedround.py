# -*- coding: utf-8 -*-
"""El cambio de «Whitelist» a «Seed Round», en inglés y en los doce idiomas.

Vive aparte porque hay que aplicarlo dos veces: una vez sobre lo que ya está
publicado, y otra sobre cada index.html nuevo que llegue, porque el bloque de
traducciones viaja dentro del archivo subido y volvería a traer el texto viejo.
`montar_home.py` lo importa.
"""
import json, os, io, re

ING = {
 'Whitelist': 'Seed Round',
 'Join the whitelist': 'Join the Seed Round',
 'Whitelist open': 'Seed Round open',
 'Whitelist price': 'Seed Round price',
 'from whitelist to listing': 'from Seed Round to listing',
}
LARGA_VIEJA = ('Every contract that touches whitelist funds has been reviewed by an independent '
  'security firm. The full report is published, including the findings and how each one was resolved.')
LARGA_NUEVA = LARGA_VIEJA.replace('whitelist funds', 'Seed Round funds')

# Las cinco cortas, escritas a mano en cada idioma. "Seed Round" se deja tal cual:
# es el nombre de la ronda, igual que en el contrato, y es como se nombra en cripto.
CORTAS = {
 'es': ['Seed Round', 'Únete a la Seed Round', 'Seed Round abierta', 'Precio en la Seed Round', 'de la Seed Round al listado'],
 'fr': ['Seed Round', 'Rejoindre le Seed Round', 'Seed Round ouvert', 'Prix du Seed Round', 'du Seed Round à la cotation'],
 'de': ['Seed Round', 'An der Seed Round teilnehmen', 'Seed Round geöffnet', 'Seed-Round-Preis', 'von der Seed Round bis zum Listing'],
 'pt': ['Seed Round', 'Entrar na Seed Round', 'Seed Round aberta', 'Preço na Seed Round', 'da Seed Round à listagem'],
 'tr': ['Seed Round', "Seed Round'a katıl", 'Seed Round açık', 'Seed Round fiyatı', "Seed Round'dan listelenmeye"],
 'id': ['Seed Round', 'Gabung Seed Round', 'Seed Round dibuka', 'Harga Seed Round', 'dari Seed Round ke pencatatan'],
 'vi': ['Seed Round', 'Tham gia Seed Round', 'Seed Round đang mở', 'Giá Seed Round', 'từ Seed Round đến niêm yết'],
 'ru': ['Seed Round', 'Участвовать в Seed Round', 'Seed Round открыт', 'Цена в Seed Round', 'от Seed Round до листинга'],
 'ar': ['Seed Round', 'انضم إلى Seed Round', 'Seed Round مفتوحة', 'سعر Seed Round', 'من Seed Round إلى الإدراج'],
 'ja': ['Seed Round', 'Seed Round に参加', 'Seed Round 受付中', 'Seed Round 価格', 'Seed Round から上場まで'],
 'ko': ['Seed Round', 'Seed Round 참여', 'Seed Round 진행 중', 'Seed Round 가격', 'Seed Round에서 상장까지'],
 'zh': ['Seed Round', '加入 Seed Round', 'Seed Round 开放中', 'Seed Round 价格', '从 Seed Round 到上线'],
}
ORDEN_CORTAS = ['Whitelist','Join the whitelist','Whitelist open','Whitelist price','from whitelist to listing']

# En la frase larga solo cambia el sintagma: reescribirla entera invitaría a erratas.
LARGA_SUB = {
 'es': ('los fondos de la lista blanca', 'los fondos de la Seed Round'),
 'fr': ('aux fonds de la liste blanche', 'aux fonds du Seed Round'),
 'de': ('Whitelist-Mittel', 'Seed-Round-Mittel'),
 'pt': ('os fundos da lista branca', 'os fundos da Seed Round'),
 'tr': ('Beyaz liste fonlarıyla', 'Seed Round fonlarıyla'),
 'id': ('dana daftar putih', 'dana Seed Round'),
 'vi': ('quỹ danh sách trắng', 'quỹ Seed Round'),
 'ru': ('средствами белого списка', 'средствами Seed Round'),
 'ar': ('أموال القائمة البيضاء', 'أموال Seed Round'),
 'ja': ('ホワイトリストの資金', 'Seed Round の資金'),
 'ko': ('화이트리스트 자금', 'Seed Round 자금'),
 'zh': ('白名单资金', 'Seed Round 资金'),
}

def convertir(d, lang):
    """Devuelve un diccionario nuevo conservando el orden de las claves.

    Acepta el diccionario en cualquiera de los dos estados. Antes solo miraba
    las claves viejas y daba por convertido lo que no reconocía: bastaba que
    algo hubiera tocado una clave para que se saltara el idioma entero y
    dejara las otras cinco sin renombrar, con lo que el traductor ya no las
    encontraba y esas frases se quedaban en inglés."""
    import collections
    cortas = {}
    for k_viejo, frase in zip(ORDEN_CORTAS, CORTAS[lang]):
        cortas[k_viejo] = frase                  # sin convertir
        cortas[ING[k_viejo]] = frase             # ya convertida
    viejo, nuevo = LARGA_SUB[lang]
    salida = collections.OrderedDict()
    tocadas = 0
    for k, v in d.items():
        if k in cortas:
            salida[ING.get(k, k)] = cortas[k]; tocadas += 1
        elif k in (LARGA_VIEJA, LARGA_NUEVA):
            if viejo in v:
                v = v.replace(viejo, nuevo)
            elif nuevo not in v:
                raise SystemExit('no encuentro %r ni %r en %s' % (viejo, nuevo, lang))
            salida[LARGA_NUEVA] = v; tocadas += 1
        else:
            salida[k] = v
    if tocadas != 6:
        raise SystemExit('%s: esperaba 6 frases, toqué %d' % (lang, tocadas))
    return salida


# ── el inglés del index ──────────────────────────────────────────────────────
# Cada regla dice cuántas veces debe aparecer: si el diseño nuevo cambió la
# frase, salta aquí y no en la web ya publicada.
HTML = [
 ('<span class="pr-k mono">Whitelist price</span>',
  '<span class="pr-k mono">Seed Round price</span>'),
 ('Every contract that touches whitelist funds has been reviewed',
  'Every contract that touches Seed Round funds has been reviewed'),
 ('<a class="hb white" href="#presale">Join the whitelist</a>',
  '<a class="hb white" href="#presale">Join the Seed Round</a>'),
 ('<span class="sale-live"><i></i>Whitelist open</span>',
  '<span class="sale-live"><i></i>Seed Round open</span>'),
 ("presale:'Whitelist',sale:'Whitelist',token:'Tokenomics',tkp:'Tokenomics',",
  "presale:'Seed Round',sale:'Seed Round',token:'Tokenomics',tkp:'Tokenomics',"),
 ("security:'Security', presale:'Whitelist', token:'Tokenomics',",
  "security:'Security', presale:'Seed Round', token:'Tokenomics',"),
 ("token:'Tokenomics',presale:'Whitelist',sale:'Whitelist',docs:'Get started',",
  "token:'Tokenomics',presale:'Seed Round',sale:'Seed Round',docs:'Get started',"),
 ('<span class="mono">from whitelist to listing</span>',
  '<span class="mono">from Seed Round to listing</span>'),
 ('<a href="https://nereum.xyz/whitepaper#/whitelist">Join the whitelist</a>',
  '<a href="https://nereum.xyz/whitepaper#/seedround">Join the Seed Round</a>'),
 ('a chain built for them. Whitelist open.',
  'a chain built for them. Seed Round open.'),
]


def aplicar(html):
    """Devuelve el html con el cambio hecho, tanto en el texto como en el
    bloque de traducciones. Es idempotente: pasarlo dos veces no rompe nada."""
    import json, collections

    # Las traducciones van PRIMERO. Una de las reglas de HTML es texto suelto,
    # sin etiquetas, y también casaba dentro del JSON del diccionario: al
    # cambiarla ahí antes de tiempo, el bloque quedaba a medio convertir.
    marca = '<script id="i18n"'
    if marca in html:
        i = html.index(marca)
        ab = html.index('>', i) + 1
        cierre = html.index('</script>', i)
        d = json.loads(html[ab:cierre], object_pairs_hook=collections.OrderedDict)
        hecho = collections.OrderedDict()
        for lang, frases in d.items():
            hecho[lang] = convertir(frases, lang) if lang in CORTAS else frases
        html = (html[:ab]
                + json.dumps(hecho, ensure_ascii=False, separators=(',', ':'))
                + html[cierre:])

    for viejo, nuevo in HTML:
        html = html.replace(viejo, nuevo)
    return html
