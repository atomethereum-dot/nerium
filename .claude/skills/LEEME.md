# Las skills de diseño

Cuatro guiones de diseño de Anthropic, copiados aquí para que viajen con el
repositorio en vez de depender de que alguien tenga el plugin activado en su
cuenta. Son ficheros de instrucciones: ningún código, ninguna dependencia,
ninguna conexión a servicios de fuera.

| skill | para qué |
|---|---|
| `design-critique` | crítica estructurada de una pantalla: jerarquía, consistencia, uso |
| `accessibility-review` | auditoría de accesibilidad más allá del contraste |
| `design-system` | revisar y endurecer los tokens y los componentes |
| `ux-copy` | microcopia y jerarquía del mensaje |

## De dónde salen

`anthropics/knowledge-work-plugins`, carpeta `design/skills`, bajo licencia
Apache 2.0 — la copia íntegra está en `LICENSE`, al lado. Lo único que se les
ha tocado es una línea que remitía a un `CONNECTORS.md` que no viaja con
ellas.

## Por qué aquí y no en la cuenta

El plugin se activa por cuenta y se monta al ARRANCAR la sesión: si lo
enciendes con la sesión ya abierta, no entra, y una sesión en la nube que
clona este repositorio no lo lleva. Puestas en `.claude/skills/` van con el
código, así que cualquiera que trabaje en Nereum las tiene sin instalar nada.

GitHub Pages no las publica: Jekyll se salta todo lo que empieza por punto.

## Para actualizarlas

    git clone --depth 1 https://github.com/anthropics/knowledge-work-plugins /tmp/kwp
    cp -r /tmp/kwp/design/skills/<nombre> .claude/skills/
