/* ───────────────────────────────────────────────────────────────────────────
   Nereum · Seed Round — capa web3 de la web.

   Sustituye a la maqueta del widget de compra: los precios ya no son fijos,
   salen del oráculo del contrato, y el botón compra de verdad.

   Sin librerías. Las llamadas al contrato son eth_call con los datos montados
   a mano: todos los argumentos son uint256 o address, así que codificarlos es
   rellenar con ceros hasta 32 bytes. Meter ethers.js aquí serían 300 KB para
   ahorrarse veinte líneas.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ───────────────────────────── configuración ───────────────────────────── */

  /* Project ID de https://cloud.reown.com — gratis. Mientras esté vacío, la web
     conecta con carteras de navegador (MetaMask, Rabby, Trust, Coinbase, OKX,
     Brave, Phantom…) pero NO ofrece WalletConnect, porque el relay lo exige. */
  var PROYECTO_WC = '87eced186475c03170cf7792da6a9ecd';

  /* La misma dirección en las dos redes. No es casualidad: se desplegó desde la
     misma cuenta con el nonce 0 en ambas. */
  var VENTA = '0xaCbf1Add75139D0E926d57EC715FDaB8bee04A89';

  var CADENAS = {
    1: {
      id: 1, hex: '0x1', nombre: 'Ethereum', simbolo: 'ETH', moneda: 'Ether',
      venta: VENTA,
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7', usdtDec: 6,
      explorador: 'https://etherscan.io',
      rpc: [
        'https://ethereum-rpc.publicnode.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://cloudflare-eth.com'
      ]
    },
    56: {
      id: 56, hex: '0x38', nombre: 'BNB Chain', simbolo: 'BNB', moneda: 'BNB',
      venta: VENTA,
      usdt: '0x55d398326f99059fF775485246999027B3197955', usdtDec: 18,
      explorador: 'https://bscscan.com',
      rpc: [
        'https://bsc-rpc.publicnode.com',
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://rpc.ankr.com/bsc'
      ]
    }
  };

  /* Tolerancia de precio entre que el comprador firma y se mina su transacción.
     Va como minTokensOut: si el oráculo se mueve más que esto, la compra
     revierte en vez de darle menos tokens de los que vio. */
  var HOLGURA_BPS = 100;            /* 1 % */

  /* Objetivo de recaudación que muestra la barra cuando el contrato no tiene
     hard cap puesto. Es una cifra de la página, no de la cadena. */
  var OBJETIVO_USD = 16000000;

  var LISTADO = 1.00;               /* precio de listado, solo informativo */

  /* ─────────────────────────── selectores (keccak) ────────────────────────── */

  var SEL = {
    nativeUsdPrice:  '0xaf68130e',
    priceUsd:        '0x8b3948bd',
    minBuyUsd:       '0x3fbb3d1d',
    maxBuyUsd:       '0x4194fdd1',
    totalTokensSold: '0x63b20117',
    hardCapTokens:   '0x4b749535',
    isLive:          '0xb8f7a665',
    isOver:          '0xb4bd9e27',
    paused:          '0x5c975abb',
    finalized:       '0xb3f05b97',
    startTime:       '0x78e97925',
    claimOpen:       '0x4b8bcb58',
    claimable:       '0x402914f5',
    allocation:      '0xb81b8630',
    remaining:       '0x3acd1572',   /* remainingAllowanceUsd(address) */
    spentUsd:        '0x0da8b1c9',
    buyWithNative:   '0x31ad36ab',
    buyWithUsdt:     '0x7789e96e',
    claim:           '0x4e71d92d',
    allowance:       '0xdd62ed3e',
    approve:         '0x095ea7b3',
    balanceOf:       '0x70a08231'
  };

  /* Errores del contrato, para no enseñarle a nadie un "execution reverted"
     pelado cuando el motivo es que puso menos del mínimo. */
  var ERRORES = {
    '0x9946a058': 'The round is not open right now.',
    '0xd93c0665': 'The round is paused.',
    '0xbd49034f': 'Below the minimum purchase.',
    '0x301300f6': 'That would go over the $10,000 cap for this wallet.',
    '0x9788c342': 'The round has sold out.',
    '0x76baadda': 'The price moved while you were signing. Try again.',
    '0xc10e8918': 'No price feed available right now.',
    '0x3b036449': 'Claims are not open yet.',
    '0x969bf728': 'Nothing to claim.',
    '0xa327f805': 'The token has not been set yet.',
    '0x329d6cd8': 'The round is already closed.',
    '0xa9fd8a31': 'Send through the buy button, not a plain transfer.',
    '0x5274afe7': 'The USDT transfer failed.',
    '0x118cdaa7': 'That wallet is not the owner.'
  };

  /* ──────────────────────────── codificar y leer ──────────────────────────── */

  function rell(h) { return h.replace(/^0x/, '').toLowerCase().padStart(64, '0'); }
  function encU(v) { return rell(BigInt(v).toString(16)); }
  function encA(a) { return rell(a.replace(/^0x/, '')); }
  function palabras(hex) {
    hex = (hex || '').replace(/^0x/, '');
    var w = [];
    for (var i = 0; i + 64 <= hex.length; i += 64) w.push(hex.slice(i, i + 64));
    return w;
  }
  function decU(w) { return w ? BigInt('0x' + w) : 0n; }
  function decB(w) { return decU(w) !== 0n; }

  /* Un RPC público puede estar caído, saturado o bloqueado por el país del
     visitante. Se prueban en orden y con límite de tiempo: quedarse colgado en
     el primero dejaría la página en blanco para todo el que lo tenga bloqueado. */
  function rpc(cid, metodo, params) {
    var lista = CADENAS[cid].rpc.slice();
    var i = 0;
    function intento() {
      if (i >= lista.length) return Promise.reject(new Error('no RPC'));
      var url = lista[i++];
      var corte = new AbortController();
      var reloj = setTimeout(function () { corte.abort(); }, 7000);
      return fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: metodo, params: params }),
        signal: corte.signal
      }).then(function (r) {
        clearTimeout(reloj);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        if (j.error) throw new Error(j.error.message || 'rpc');
        return j.result;
      }).catch(function () {
        clearTimeout(reloj);
        return intento();
      });
    }
    return intento();
  }

  /* Si hay cartera conectada y está en esta red, se le pregunta a ella: trae su
     propio nodo, no depende de que el visitante pueda alcanzar un RPC público
     —hay países donde no— y no gasta cuota de nadie. Los públicos quedan como
     respaldo y como única vía antes de conectar. */
  function pedir(cid, metodo, params) {
    if (sesion.prov && sesion.cid === cid) {
      return sesion.prov.request({ method: metodo, params: params })
        .catch(function () { return rpc(cid, metodo, params); });
    }
    return rpc(cid, metodo, params);
  }

  function llamar(cid, to, data) {
    var params = [{ to: to, data: data }, 'latest'];
    if (sesion.prov && sesion.cid === cid) {
      return sesion.prov.request({ method: 'eth_call', params: params })
        .catch(function () { return rpc(cid, 'eth_call', params); });
    }
    return rpc(cid, 'eth_call', params);
  }

  /* ───────────────────────────── estado de venta ──────────────────────────── */

  /* Lo que la cadena dice de cada red. Se refresca solo mientras la sección
     está a la vista; fuera de ella no tiene sentido gastar peticiones. */
  var estado = {
    1:  { ok: false },
    56: { ok: false }
  };

  function leerRed(cid) {
    var c = CADENAS[cid];
    var uno = function (sel) { return llamar(cid, c.venta, sel).catch(function () { return null; }); };
    return Promise.all([
      uno(SEL.nativeUsdPrice), uno(SEL.priceUsd), uno(SEL.minBuyUsd), uno(SEL.maxBuyUsd),
      uno(SEL.totalTokensSold), uno(SEL.hardCapTokens), uno(SEL.isLive), uno(SEL.isOver),
      uno(SEL.paused), uno(SEL.startTime), uno(SEL.claimOpen)
    ]).then(function (r) {
      if (!r[1]) { estado[cid] = { ok: false }; return estado[cid]; }
      var wp = palabras(r[0]);
      estado[cid] = {
        ok: true,
        precioNativo: decU(wp[0]),          /* 8 decimales */
        oraculoVivo: decB(wp[1]),
        precioUsd: decU(palabras(r[1])[0]), /* 8 decimales */
        minUsd: decU(palabras(r[2])[0]),
        maxUsd: decU(palabras(r[3])[0]),
        vendidos: decU(palabras(r[4])[0]),  /* 18 decimales */
        tope: decU(palabras(r[5])[0]),
        viva: decB(palabras(r[6])[0]),
        terminada: decB(palabras(r[7])[0]),
        pausada: decB(palabras(r[8])[0]),
        inicio: decU(palabras(r[9])[0]),
        reparto: decB(palabras(r[10])[0])
      };
      return estado[cid];
    }).catch(function () { estado[cid] = { ok: false }; return estado[cid]; });
  }

  function leerTodo() { return Promise.all([leerRed(1), leerRed(56)]); }

  /* Lo que lleva comprado esta cartera, por red. Son cuatro lecturas más por
     cadena, así que solo se piden con una cartera conectada. */
  var posicion = { 1: null, 56: null };
  var saldos   = { 1: null, 56: null };

  /* Estado de la venta y posición del comprador se piden juntos: si se pintaran
     con lecturas de momentos distintos, el panel podría enseñar una compra que
     el resto de la vista todavía no cuenta. */
  function refrescar() { return Promise.all([leerTodo(), leerPosicion()]); }

  function leerPosicion() {
    var quien = sesion.cuenta;
    if (!quien) {
      posicion = { 1: null, 56: null };
      saldos = { 1: null, 56: null };
      return Promise.resolve();
    }
    return Promise.all([1, 56].map(function (cid) {
      var c = CADENAS[cid];
      var uno = function (sel) {
        return llamar(cid, c.venta, sel + encA(quien)).catch(function () { return null; });
      };
      /* El saldo de la cartera: la moneda de la red y su USDT. Es lo primero
         que alguien mira antes de decidir cuánto compra. */
      var nativo = pedir(cid, 'eth_getBalance', [quien, 'latest'])
        .then(function (h) { return h ? BigInt(h) : null; })
        .catch(function () { return null; });
      var enUsdt = llamar(cid, c.usdt, SEL.balanceOf + encA(quien))
        .then(function (r) { return decU(palabras(r)[0]); })
        .catch(function () { return null; });
      Promise.all([nativo, enUsdt]).then(function (b) {
        saldos[cid] = (b[0] === null && b[1] === null) ? null
                    : { nativo: b[0], usdt: b[1] };
      });

      return Promise.all([uno(SEL.allocation), uno(SEL.spentUsd),
                          uno(SEL.remaining), uno(SEL.claimable)])
        .then(function (r) {
          if (!r[0]) { posicion[cid] = null; return; }
          posicion[cid] = {
            tokens: decU(palabras(r[0])[0]),        /* 18 decimales */
            gastado: decU(palabras(r[1])[0]),       /* 8 decimales  */
            queda: r[2] ? decU(palabras(r[2])[0]) : 0n,
            reclamable: r[3] ? decU(palabras(r[3])[0]) : 0n
          };
        });
    })).then(function () {
      /* Si la cuenta cambió mientras se leía, lo leído ya no es de nadie. */
      if (sesion.cuenta !== quien) {
        posicion = { 1: null, 56: null };
        saldos = { 1: null, 56: null };
      }
    });
  }


  /* ─────────────────────────────── carteras ──────────────────────────────── */

  /* EIP-6963: las carteras se anuncian solas. Es lo que sustituyó al viejo
     window.ethereum, que con dos extensiones instaladas se pisaban entre ellas
     y acababas firmando con la que no era. */
  var carteras = [];
  var vistas = {};

  window.addEventListener('eip6963:announceProvider', function (e) {
    var d = e.detail;
    if (!d || !d.info || vistas[d.info.uuid]) return;
    vistas[d.info.uuid] = true;
    carteras.push({ nombre: d.info.name, icono: d.info.icon, prov: d.provider,
                    rdns: d.info.rdns || '' });
  });
  try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (e) {}

  function listaCarteras() {
    var l = carteras.slice();
    /* Carteras viejas o navegadores dentro de app que aún no anuncian. */
    if (!l.length && window.ethereum) {
      l.push({ nombre: window.ethereum.isMetaMask ? 'MetaMask' : 'Browser wallet',
               icono: '', prov: window.ethereum });
    }
    return l;
  }

  var sesion = { prov: null, cuenta: null, cid: null, nombre: '' };

  /* Una petición de conexión por proveedor, y ni una más.

     La extensión guarda la suya abierta hasta que alguien la contesta —y la
     conserva aunque se recargue la página—, así que a la segunda responde
     «Request of type wallet_requestPermissions already pending». Eso es un
     callejón sin salida: por fuera se ve como que la cartera no conecta, y
     seguir pulsando no lo arregla, lo perpetúa.

     Antes de pedir nada se preguntan las cuentas YA concedidas con
     eth_accounts, que no abre ninguna ventana ni deja peticiones colgando. Si
     el permiso ya estaba dado —lo normal en cuanto alguien conectó una vez—
     no hay nada que pedir y no se toca la extensión. */
  var enVuelo = null;

  function pedirCuentas(prov, silencioso) {
    if (!silencioso && enVuelo && enVuelo.prov === prov) return enVuelo.p;
    var p = prov.request({ method: 'eth_accounts' })
      .catch(function () { return []; })
      .then(function (cs) {
        if (cs && cs.length) return cs;
        /* En silencio se vuelve con las manos vacías y ya está: esto corre al
           cargar la página, y ahí abrirle una ventana a alguien que no ha
           pulsado nada sería salirle al paso. */
        if (silencioso) return [];
        return prov.request({ method: 'eth_requestAccounts' });
      });
    if (silencioso) return p;
    enVuelo = { prov: prov, p: p };
    var soltar = function () { if (enVuelo && enVuelo.p === p) enVuelo = null; };
    p.then(soltar, soltar);
    return p;
  }

  function enchufar(prov, nombre, silencioso) {
    return pedirCuentas(prov, silencioso).then(function (cs) {
      if (!cs || !cs.length) throw new Error('sin cuenta');
      return prov.request({ method: 'eth_chainId' }).then(function (h) {
        sesion = { prov: prov, cuenta: cs[0], cid: parseInt(h, 16), nombre: nombre || '',
                   /* Por WalletConnect la firma ocurre en otra app: hay que
                      saber cómo volver a ella. */
                   wc: prov === wcProv, volver: volverA(prov), logo: logoDe(prov) };
        recordar(prov, nombre);
        if (prov.on) {
          prov.on('accountsChanged', function (a) {
            sesion.cuenta = (a && a[0]) || null;
            if (!sesion.cuenta) { sesion.prov = null; olvidar(); }
            posicion = { 1: null, 56: null };
            refrescar().then(function () { pintar(); });
          });
          prov.on('disconnect', function () {
            sesion = { prov: null, cuenta: null, cid: null, nombre: '' };
            olvidar();
            posicion = { 1: null, 56: null };
            refrescar().then(function () { pintar(); });
          });
          prov.on('chainChanged', function (h2) {
            sesion.cid = parseInt(h2, 16);
            refrescar().then(function () { pintar(); });
          });
        }
        return sesion;
      });
    });
  }

  /* ────────────────── volver a la página ya conectado ────────────────────── */

  /* En el móvil, tocar «Connect wallet» te lleva a la cartera y la pestaña se
     queda en segundo plano. Android e iOS descartan pestañas de fondo sin
     avisar, así que al volver el navegador la RECARGA: la página arranca de
     cero. La sesión de WalletConnect sigue guardada, y la extensión sigue
     teniendo el permiso dado, pero nadie preguntaba al arrancar, así que el
     botón volvía a decir «Connect wallet» después de haber conectado.

     Aquí se pregunta, y se pregunta en silencio: todo esto usa eth_accounts,
     que devuelve lo ya concedido y no abre ninguna ventana. */
  var MEMO = 'nrm:cartera';

  function recordar(prov, nombre) {
    try {
      var q = { tipo: prov === wcProv ? 'wc' : 'inyectada', nombre: nombre || '' };
      if (q.tipo === 'inyectada') {
        var m = listaCarteras().filter(function (w) { return w.prov === prov; })[0];
        q.id = (m && m.rdns) || '';
      }
      localStorage.setItem(MEMO, JSON.stringify(q));
    } catch (e) {}
  }

  function olvidar() { try { localStorage.removeItem(MEMO); } catch (e) {} }

  function memoria() {
    try { return JSON.parse(localStorage.getItem(MEMO) || 'null'); } catch (e) { return null; }
  }

  /* Si hay sesión guardada de WalletConnect. Se mira ANTES de cargar el
     paquete: son 2 MB, y no hay por qué traerlos a quien solo pasa por aquí. */
  function haySesionWC() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('wc@') !== 0 || k.indexOf('session') < 0) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        if (v && v.length) return true;
      }
    } catch (e) {}
    return false;
  }

  function reanudar() {
    var q = memoria();
    if (!q) return Promise.resolve(false);

    if (q.tipo === 'wc') {
      if (!haySesionWC()) { olvidar(); return Promise.resolve(false); }
      /* El registro trae los esquemas de cada app, y volverA() los necesita
         justo aquí: al reanudar no hay cartera elegida de la que sacarlos. */
      traerRegistro();
      return iniciarWC().then(function (prov) {
        /* Que exista una sesión guardada no quiere decir que siga viva: si
           caducó, eth_accounts sigue devolviendo su cuenta de memoria y la
           página se quedaría creyéndose conectada a un fantasma, con un botón
           que manda peticiones que nadie va a ver. */
        var ss = prov.session;
        var viva = ss && (!ss.expiry || ss.expiry * 1000 > Date.now());
        if (!viva) { olvidar(); return false; }
        return enchufar(prov, nombreWC(prov), true).then(function () { return true; });
      }).catch(function () { return false; });
    }

    /* Las extensiones se anuncian en cuanto se les pregunta, pero no siempre en
       el mismo tic: se les da un momento antes de darlas por ausentes. */
    return new Promise(function (ok) { setTimeout(ok, 350); }).then(function () {
      var l = listaCarteras();
      var m = l.filter(function (w) { return q.id && w.rdns === q.id; })[0] ||
              l.filter(function (w) { return w.nombre === q.nombre; })[0];
      if (!m) return false;
      return enchufar(m.prov, m.nombre, true).then(function () { return true; })
        .catch(function () { return false; });
    });
  }

  var scripts = {};
  function cargarScript(src, nombre) {
    if (scripts[src]) return scripts[src];
    scripts[src] = new Promise(function (ok, mal) {
      var s = document.createElement('script');
      var fallo = function () {
        mal(new Error((nombre || 'A script') + ' could not load. Check your connection.'));
      };
      var reloj = setTimeout(fallo, 20000);
      s.src = src; s.async = true;
      s.onload = function () { clearTimeout(reloj); ok(); };
      s.onerror = function () { clearTimeout(reloj); fallo(); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }

  /* El modal es nuestro, así que del SDK solo se usa el transporte: se pide el
     proveedor sin su interfaz (showQrModal: false) y la URI de emparejamiento
     llega por el evento display_uri, que es lo que se convierte en QR o en
     enlace a la app. */
  var wcProv = null;
  function iniciarWC() {
    if (!PROYECTO_WC) return Promise.reject(new Error('WalletConnect is not configured.'));
    if (wcProv) return Promise.resolve(wcProv);
    /* El paquete va servido desde aquí y no desde un CDN. El UMD que publica
       WalletConnect no vale suelto: deja su objeto en
       window["@walletconnect/ethereum-provider"], no en window.EthereumProvider,
       y además espera viem, bs58 y lit como globales del navegador, que no
       están. Este archivo es el mismo paquete compilado con todo dentro —ver
       herramientas/LEEME.md para rehacerlo— y de paso la conexión deja de
       depender de que el visitante alcance un CDN. */
    return cargarScript('assets/walletconnect.js', 'WalletConnect')
      .then(function () {
        if (!window.NereumWC || !window.NereumWC.EthereumProvider) {
          throw new Error('WalletConnect could not start. Reload and try again.');
        }
        return window.NereumWC.EthereumProvider.init({
          projectId: PROYECTO_WC,
          chains: [1],
          optionalChains: [56],
          showQrModal: false,
          /* Sin rpcMap, las lecturas viajan por el relay hasta el móvil y
             vuelven: lentas y a merced de que la app esté despierta. Con él,
             eth_call sale por estos nodos y solo se molesta a la cartera para
             firmar, que es lo único que solo ella puede hacer. */
          rpcMap: { 1: CADENAS[1].rpc[0], 56: CADENAS[56].rpc[0] },
          metadata: {
            name: 'Nereum',
            description: 'Nereum Seed Round',
            url: location.origin,
            icons: [location.origin + '/icon-192.png']
          }
        });
      })
      .then(function (prov) { wcProv = prov; return prov; });
  }

  function cambiarRed(cid, demora) {
    var c = CADENAS[cid];

    var pedida = pedirALaCartera('wallet_switchEthereumChain', [{ chainId: c.hex }], demora)
      .catch(function (e) {
        /* 4902 = la cartera no conoce la red. Pasa siempre con BNB Chain en
           MetaMask recién instalado. */
        if (e && (e.code === 4902 || (e.data && e.data.originalError &&
            e.data.originalError.code === 4902))) {
          return pedirALaCartera('wallet_addEthereumChain', [{
            chainId: c.hex, chainName: c.nombre,
            nativeCurrency: { name: c.moneda, symbol: c.simbolo, decimals: 18 },
            rpcUrls: [c.rpc[0]], blockExplorerUrls: [c.explorador]
          }], demora);
        }
        throw e;
      });

    /* Y una red de seguridad: hay carteras que cambian de red, lo cuentan por
       chainChanged, y dejan la petición colgada para siempre. Sin esto la
       página se quedaba en «Switch network in your wallet…» con la cartera ya
       en la red pedida, que por fuera se ve igual que si no funcionara nada. */
    var reloj = null;
    var yaEsta = new Promise(function (ok) {
      reloj = setInterval(function () { if (sesion.cid === cid) ok(); }, 400);
    });
    var soltar = function () { clearInterval(reloj); };

    return Promise.race([pedida, yaEsta]).then(
      function () { soltar(); sesion.cid = cid; },
      function (e) { soltar(); throw e; });
  }

  /* A dónde saltar para que el visitante vea la petición que acaba de mandarse.
     WalletConnect solo abre la cartera al emparejar; cada firma posterior llega
     como una notificación que el teléfono puede no enseñar, y la web se queda
     diciendo «confirma en tu cartera» sin decir dónde. La propia sesión trae la
     dirección de vuelta que la cartera declaró; si no la trae, se usa la del
     registro de la que se eligió. */
  /* Quién está al otro lado. La sesión lo dice una vez emparejada, y es lo que
     hay que enseñar: «Open WalletConnect» no lleva a ninguna app, «Open
     MetaMask» sí. */
  function nombreWC(prov) {
    try {
      var m = prov && prov.session && prov.session.peer && prov.session.peer.metadata;
      if (m && m.name) return m.name;
    } catch (e) {}
    return (carteraElegida && carteraElegida.nombre) || 'WalletConnect';
  }

  /* El logo del registro va primero, aunque la cartera declare uno suyo en la
     sesión. El del registro es un icono de aplicación, cuadrado y del mismo
     tamaño para todas, y es el que ya se ve bien en la lista. El que cada
     cartera sube por su cuenta viene como quiere —transparente, recortado,
     pequeño—, y ahí es donde unas salían impecables y otras no.

     El de la sesión solo se usa si no hay entrada en el registro: mejor un
     icono raro que ninguno. */
  function logoDe(prov) {
    if (carteraElegida && carteraElegida.logo) return carteraElegida.logo;
    try {
      var m = prov && prov.session && prov.session.peer && prov.session.peer.metadata;
      if (m && m.icons && m.icons.length && m.icons[0]) return m.icons[0];
    } catch (e) {}
    return '';
  }

  /* Siempre el esquema propio (metamask://) antes que el enlace universal
     (https://metamask.app.link). El universal a secas abre la app por su
     pantalla de inicio —la del navegador y el «conectar cartera»—, y desde ahí
     la petición pendiente no se ve: parece que la cartera pide conectarse otra
     vez cuando lo que tiene es una firma esperando. El esquema propio la trae
     al frente donde estaba. */
  function volverA(prov) {
    var m = null;
    try { m = prov && prov.session && prov.session.peer && prov.session.peer.metadata; }
    catch (e) {}
    var r = (m && m.redirect) || {};
    /* Tras recargar la página no hay «cartera elegida» —eso vive en la sesión
       del navegador, no en la de WalletConnect—, así que se busca en el
       registro por el nombre que declara la propia sesión. */
    var w = carteraElegida || porNombre(m && m.name);
    var reg = (w && w.movil) || {};
    return r.native || reg.native || r.universal || reg.universal || null;
  }

  function porNombre(n) {
    if (!n) return null;
    var b = String(n).toLowerCase();
    return (registro || []).filter(function (x) {
      return String(x.nombre).toLowerCase() === b;
    })[0] || null;
  }

  /* Toda petición que el visitante tiene que aprobar EN SU CARTERA sale por
     aquí, y en el mismo paso se le enseña cómo volver a la app.

     Antes esto vivía dentro de enviar(), así que solo lo tenían las firmas de
     transacción. El cambio de red no: por WalletConnect esa petición viaja por
     el relay y llega al teléfono como una notificación que puede no verse, la
     cartera no pasa a primer plano, y la página se quedaba en «Confirm in your
     wallet…» sin decir a dónde ir. Quien venía de comprar en BNB y quería
     comprar en Ethereum se topaba justo con eso: el botón decía «Switch to
     Ethereum», lo pulsaba, y ahí se acababa todo. */
  function pedirALaCartera(metodo, params, demora) {
    var p = sesion.prov.request({ method: metodo, params: params });
    if (!demora) { volverACartera(); return p; }
    /* Con demora: hay peticiones que WalletConnect resuelve él solo, sin salir
       al teléfono —cambiar a una red ya aprobada en la sesión es una de ellas—,
       y ahí una hoja diciendo «abre tu cartera» aparecería y se iría sola en el
       mismo parpadeo. Se espera un momento: si contesta, no se enseña nada; si
       de verdad ha salido hacia la app, se enseña. */
    var reloj = setTimeout(volverACartera, demora);
    var parar = function () { clearTimeout(reloj); };
    p.then(parar, parar);
    return p;
  }

  function enviar(tx) {
    tx.from = sesion.cuenta;
    return pedirALaCartera('eth_sendTransaction', [tx]);
  }

  /* Espera a que la transacción entre en un bloque. Se pregunta por el RPC
     público y no por la cartera: algunas in-app devuelven null para siempre. */
  function esperar(cid, hash) {
    return new Promise(function (ok, mal) {
      var t0 = Date.now();
      (function mirar() {
        var pide = (sesion.prov && sesion.cid === cid)
          ? sesion.prov.request({ method: 'eth_getTransactionReceipt', params: [hash] })
              .catch(function () { return rpc(cid, 'eth_getTransactionReceipt', [hash]); })
          : rpc(cid, 'eth_getTransactionReceipt', [hash]);
        pide.then(function (r) {
          if (r) return ok(r);
          if (Date.now() - t0 > 300000) return mal(new Error('sin confirmar'));
          setTimeout(mirar, 3000);
        }).catch(function () { setTimeout(mirar, 4000); });
      })();
    });
  }

  function motivo(e) {
    var d = '';
    try {
      d = (e && (
            (e.data && e.data.originalError && e.data.originalError.data) ||
            (e.data && e.data.data) || e.data ||
            (e.error && e.error.data) || e.info && e.info.error && e.info.error.data
          ) || '') + '';
      if (!/^0x[0-9a-fA-F]{8}/.test(d)) d = '';
    } catch (x) {}
    if (d) {
      var sel = d.slice(0, 10).toLowerCase();
      if (ERRORES[sel]) return ERRORES[sel];
      if (sel === '0x08c379a0') {           /* Error(string) */
        try {
          var w = palabras(d.slice(10));
          var largo = Number(decU(w[1]));
          var bytes = w.slice(2).join('').slice(0, largo * 2);
          return decodeURIComponent(bytes.replace(/../g, '%$&'));
        } catch (x) {}
      }
    }
    if (e && (e.code === 4001 || /user rejected|denied/i.test(e.message || ''))) {
      return 'Signature cancelled.';
    }
    /* -32002: la cartera ya tiene una petición abierta esperando respuesta. El
       texto que manda la extensión —«already pending for origin…»— no dice qué
       hacer, y lo que hay que hacer es abrirla y contestarla. */
    if (e && (e.code === -32002 || /already pending/i.test(e.message || ''))) {
      return 'Your wallet already has a connection request open. ' +
             'Open the wallet, approve or dismiss it, and try again.';
    }
    return (e && e.message) ? e.message.slice(0, 140) : 'Transaction failed.';
  }

  /* ─────────────── una sección vista no vuelve a cambiar de alto ─────────── */

  /* Con content-visibility:auto el navegador deja de pintar lo que sale de
     pantalla y le vuelve a SUPONER un alto. Si ese supuesto no coincide con el
     real, el documento cambia de tamaño cada vez que una sección entra o sale
     —al bajar y sobre todo al volver a subir— y el scroll pega un tirón.

     Las cifras de la hoja de estilo cubren la primera pasada. Esto cubre el
     resto: en cuanto una sección se pinta, se le fija su alto medido, así que a
     partir de ahí ocupa lo mismo esté pintada o no. Se vuelve a medir cada vez
     que reaparece, para que un cambio posterior —el panel del comprador, sin ir
     más lejos— no deje el número viejo. */
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var secciones = [].slice.call(document.querySelectorAll('main > section'));
    if (!secciones.length) return;

    function fijar(s, forzado) {
      var cs = getComputedStyle(s);
      /* Una sección que nunca se salta no necesita alto supuesto. */
      if (!forzado && cs.contentVisibility === 'visible') return;
      var extra = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) +
                  parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      var h = s.offsetHeight - (extra || 0);
      /* contain-intrinsic-size gobierna la caja de contenido: el relleno y el
         borde los suma el navegador aparte. */
      if (h > 0) s.style.containIntrinsicSize = h.toFixed(1) + 'px';
    }

    /* Las cifras de la hoja de estilo están medidas a dos anchos, y el alto de
       una sección depende del ancho exacto de la ventana: en cualquier otro se
       quedan cortas. Esto las mide de verdad, en la ventana que hay.

       Se pintan todas un instante, se anota su alto y se restauran. Va después
       de que la página haya cargado: la primera pintada, que es la que el
       visitante nota, ya ocurrió, así que este trabajo extra no retrasa nada de
       lo que ve. */
    function medirTodas() {
      var y = window.scrollY || 0;
      var previo = secciones.map(function (s) { return s.style.contentVisibility; });
      var estilaza = secciones.map(function (s) { return getComputedStyle(s).contentVisibility; });
      secciones.forEach(function (s) { s.style.contentVisibility = 'visible'; });
      void document.body.offsetHeight;                 /* fuerza la maquetación */
      secciones.forEach(function (s, i) {
        if (estilaza[i] !== 'visible') fijar(s, true);
      });
      secciones.forEach(function (s, i) { s.style.contentVisibility = previo[i]; });
      void document.body.offsetHeight;
      /* Pintar y despintar cambia el alto del documento un instante, y el
         navegador puede reajustar el scroll: se deja donde estaba. */
      if ((window.scrollY || 0) !== y) window.scrollTo(0, y);
    }

    function cuandoHaya(fn) {
      var lanzar = function () {
        if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 2000 });
        else setTimeout(fn, 400);
      };
      if (document.readyState === 'complete') lanzar();
      else addEventListener('load', lanzar);
    }
    cuandoHaya(medirTodas);

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        /* Un fotograma después: al entrar, la sección acaba de pintarse. */
        requestAnimationFrame(function () { fijar(e.target); });
      });
    }, { rootMargin: '150px 0px' });
    secciones.forEach(function (s) { io.observe(s); });

    /* Al girar el teléfono los altos son otros y lo fijado deja de valer. */
    var reloj = null;
    addEventListener('resize', function () {
      clearTimeout(reloj);
      reloj = setTimeout(function () {
        secciones.forEach(function (s) { s.style.containIntrinsicSize = ''; });
        medirTodas();
      }, 250);
    }, { passive: true });
  })();

  /* ───────────────────── quedarse donde uno estaba ───────────────────────── */

  /* Al recargar, el navegador guarda una posición en píxeles y la repone. Pero
     esta página cambia de alto mientras carga —fuentes, imágenes, lienzos que
     se dimensionan— así que esos píxeles ya no caen donde caían y el visitante
     aparece en otra sección. Se guarda la sección y el desplazamiento dentro
     de ella, que sí sobreviven al cambio de alto.

     En sessionStorage a propósito: solo vale para recargar esta pestaña. Quien
     llegue de nuevo desde un enlace tiene que empezar arriba. */
  (function () {
    var CLAVE = 'nrm:vista';
    var almacen = null;
    try { almacen = window.sessionStorage; } catch (e) { return; }
    if (!almacen) return;
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

    function cima(n) { var y = 0; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; }
    function partes() { return [].slice.call(document.querySelectorAll('main > section[id]')); }

    function guardar() {
      var y = window.scrollY || window.pageYOffset || 0;
      if (y < 40) { try { almacen.removeItem(CLAVE); } catch (e) {} return; }
      var cual = null, suya = -1;
      partes().forEach(function (sec) {
        var t = cima(sec);
        if (t <= y + 4 && t > suya) { suya = t; cual = sec; }
      });
      if (!cual) return;
      try {
        almacen.setItem(CLAVE, JSON.stringify({ id: cual.id, d: Math.round(y - suya) }));
      } catch (e) {}
    }

    var espera = 0;
    addEventListener('scroll', function () {
      if (espera) return;
      espera = setTimeout(function () { espera = 0; guardar(); }, 250);
    }, { passive: true });
    addEventListener('pagehide', guardar);
    addEventListener('beforeunload', guardar);

    var donde = null;
    try { donde = JSON.parse(almacen.getItem(CLAVE) || 'null'); } catch (e) {}
    if (!donde || !donde.id) return;

    /* Si el visitante toca algo antes de que termine de asentarse, manda él:
       nada peor que la página tirando de ti mientras intentas leer. */
    var suyo = false;
    var mio = function () { suyo = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
      addEventListener(ev, mio, { once: true, passive: true });
    });

    function ir() {
      if (suyo) return;
      var sec = document.getElementById(donde.id);
      if (!sec) return;
      var y = Math.max(0, cima(sec) + (donde.d || 0));
      if (Math.abs((window.scrollY || 0) - y) > 2) window.scrollTo(0, y);
    }

    function asentar() {
      ir();
      /* El alto sigue moviéndose un rato después de load. Se reponen unas
         cuantas veces y se deja de insistir. */
      var n = 0;
      var reloj = setInterval(function () {
        ir();
        if (++n > 8 || suyo) clearInterval(reloj);
      }, 120);
    }

    if (document.readyState === 'complete') asentar();
    else addEventListener('load', asentar);
  })();

  /* ─────────────────────────────── el widget ─────────────────────────────── */

  var pay = document.getElementById('wPay');
  if (!pay) return;

  /* La maqueta que viene en el HTML ya dejó puestas sus propias escuchas sobre
     estos controles. Clonar un nodo copia todo menos las escuchas, así que
     reemplazarlo por su clon las borra de una vez. Es la forma de tomar el
     mando sin tener que editar el index.html: cuando llegue el próximo diseño,
     lo único que hay que reinsertar es la etiqueta <script> de este archivo. */
  function relevar(el) {
    if (!el) return el;
    var c = el.cloneNode(true);
    el.parentNode.replaceChild(c, el);
    return c;
  }
  ['wPay', 'wUsd', 'wRange', 'wChips', 'wCta'].forEach(function (id) {
    relevar(document.getElementById(id));
  });
  /* La maqueta también anima la barra de recaudación hasta una cifra fija.
     Se le quitan las escuchas igual, porque ahora esa cifra tiene que subir
     con las compras. */
  relevar(document.querySelector('#presale .raise'));
  pay = document.getElementById('wPay');

  var usdIn  = document.getElementById('wUsd'),
      nrmOut = document.getElementById('wNrm'),
      eq     = document.getElementById('wEq'),
      tasa   = document.getElementById('wRate'),
      val    = document.getElementById('wVal'),
      gain   = document.getElementById('wGain'),
      range  = document.getElementById('wRange'),
      chips  = document.getElementById('wChips'),
      nota   = document.getElementById('wNote'),
      cta    = document.getElementById('wCta'),
      campo  = usdIn.closest('.w-field');

  /* Cada botón de pago es una red y un medio. */
  var BOTONES = [
    { cid: 1,  usdt: false }, { cid: 56, usdt: false },
    { cid: 1,  usdt: true  }, { cid: 56, usdt: true  }
  ];
  var botones = [].slice.call(pay.querySelectorAll('button'));
  var elegido = 0;
  botones.forEach(function (b, i) {
    b.addEventListener('click', function () {
      botones.forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var antes = pago === 0n ? null : usdDe(pago);
      elegido = i;
      pago = 0n;
      if (antes !== null) {
        var u = unidDeUsd(Number(antes) / 1e8);
        if (u !== null) pago = u;
      }
      pintar(false);
    });
  });

  /* ─────────────────────── los logos de cada moneda ──────────────────────── */

  /* Dibujados aquí y no traídos de un CDN: son cuatro figuras, pesan menos que
     la petición que costaría pedirlas, y una página de venta que va a buscar
     imágenes a un tercero le está contando a ese tercero quién la visita. */
  var NS = 'http://www.w3.org/2000/svg';

  var MARCAS = {
    ETH: { fondo: '#627EEA', partes: [
      ['M16 4v9.7l8.2 3.7z', .6], ['M16 4 7.8 17.4 16 13.7z', 1],
      ['M16 23.2V28l8.2-11.4z', .6], ['M16 28v-4.8L7.8 16.6z', 1],
      ['m16 21.6 8.2-4.8-8.2-3.7z', .4], ['m7.8 16.8 8.2 4.8v-8.5z', .8] ] },
    /* La marca de BNB no son cinco rombos: son dos galones, arriba y abajo, y
       tres rombos. Va con su geometría original —un lienzo de 126,61— metida
       en un grupo a escala, que es más fiable que reescribir a mano cada punto
       para que quepa en 32. */
    BNB: { fondo: '#F0B90B', caja: 'translate(4 4) scale(0.18956)', partes: [
      ['M38.73 53.2 63.31 28.62l24.59 24.59 14.3-14.3L63.31 0 24.43 38.9z', 1],
      ['M0 63.31 14.3 49l14.3 14.3-14.3 14.31z', 1],
      ['M38.73 73.41 63.31 98l24.59-24.59 14.31 14.29-.01.01-38.89 38.9-38.88-38.88-.02-.02z', 1],
      ['M98 63.3 112.3 49l14.31 14.3-14.31 14.31z', 1],
      ['M77.83 63.3 63.31 48.78 52.58 59.51l-1.23 1.24-2.54 2.53-.02.02.02.02 14.5 14.51 14.52-14.52.01-.01z', 1] ] },
    USDT: { fondo: '#26A17B', partes: [
      ['M17.9 15.6v-2.3h5.3V9.8H8.8v3.5h5.3v2.3c-4.3.2-7.6 1-7.6 2.1s3.3 1.9 7.6 2.1v6.7h3.8v-6.7' +
       'c4.3-.2 7.6-1 7.6-2.1s-3.3-1.9-7.6-2.1m0 3.6c-.1 0-.7.1-1.9.1-1 0-1.7 0-1.9-.1' +
       'c-3.7-.2-6.5-.8-6.5-1.6s2.8-1.4 6.5-1.6v2.6c.2 0 1 .1 2 .1 1.2 0 1.8-.1 1.9-.1v-2.6' +
       'c3.6.2 6.5.8 6.5 1.6s-2.9 1.4-6.6 1.6', 1] ] }
  };

  function moneda(clave, tam) {
    var m = MARCAS[clave];
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('width', tam); svg.setAttribute('height', tam);
    svg.setAttribute('aria-hidden', 'true');
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '16'); c.setAttribute('cy', '16'); c.setAttribute('r', '16');
    c.setAttribute('fill', m.fondo);
    svg.appendChild(c);
    var dentro = svg;
    if (m.caja) {
      dentro = document.createElementNS(NS, 'g');
      dentro.setAttribute('transform', m.caja);
      svg.appendChild(dentro);
    }
    m.partes.forEach(function (par) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', par[0]);
      p.setAttribute('fill', '#fff');
      if (par[1] !== 1) p.setAttribute('fill-opacity', String(par[1]));
      dentro.appendChild(p);
    });
    return svg;
  }

  function estilosMonedas() {
    if (document.getElementById('nrmMon')) return;
    var e = document.createElement('style');
    e.id = 'nrmMon';
    e.textContent = [
      '.w-pay button{justify-items:center}',
      '.nrm-mon{position:relative;display:block;width:24px;height:24px;margin-bottom:1px}',
      '.nrm-mon > svg{display:block}',
      /* La insignia de red va sobre la moneda, con un aro del color del botón
         para que se despegue del verde de USDT. */
      '.nrm-mon .red{position:absolute;right:-3px;bottom:-2px;border-radius:50%;',
      'background:#fff;padding:1.5px;display:block;line-height:0;box-shadow:0 0 0 .5px rgba(11,13,18,.12)}',
      '.w-pay button.on .nrm-mon .red{background:#F0F5FF}'
    ].join('');
    document.head.appendChild(e);
  }

  function ponerMonedas() {
    estilosMonedas();
    botones.forEach(function (b, i) {
      if (b.querySelector('.nrm-mon')) return;
      var m = BOTONES[i];
      var c = CADENAS[m.cid];
      var caja = document.createElement('span');
      caja.className = 'nrm-mon';
      caja.appendChild(moneda(m.usdt ? 'USDT' : c.simbolo, 24));
      if (m.usdt) {
        var badge = document.createElement('span');
        badge.className = 'red';
        badge.appendChild(moneda(c.simbolo, 11));
        caja.appendChild(badge);
      }
      b.insertBefore(caja, b.firstChild);
    });
  }

  function medio() { return BOTONES[elegido] || BOTONES[0]; }
  function red()   { return CADENAS[medio().cid]; }
  function est()   { return estado[medio().cid] || { ok: false }; }

  /* Límites: los del contrato si se pudieron leer, y si no los de la página,
     que es mejor que dejar el campo sin validar. */
  function minUsd() { var e = est(); return e.ok && e.minUsd ? Number(e.minUsd) / 1e8 : 0.2; }
  function maxUsd() { var e = est(); return e.ok && e.maxUsd ? Number(e.maxUsd) / 1e8 : 10000; }
  function precio() { var e = est(); return e.ok && e.precioUsd ? Number(e.precioUsd) / 1e8 : 0.20; }

  var dinero = function (v, d) {
    return '$' + v.toLocaleString('en-US',
      { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };
  var num   = function (v) { return v.toLocaleString('en-US', { maximumFractionDigits: 0 }); };
  var limpio = function (v) { return parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0; };

  function aBarra(u) { return Math.log10(Math.max(minUsd(), u)); }
  function deBarra(t) { return Math.pow(10, t); }

  /* ─────────────────── el importe va en la moneda de pago ─────────────────── */

  /* Se paga en BNB, se escribe en BNB. Antes el campo pedía dólares y la web
     los convertía: el número que el comprador tecleaba no era el que firmaba,
     y al aparecer otro distinto en la cartera lo normal es desconfiar. Ahora
     lo que se escribe es exactamente el `value` de la transacción, y los
     dólares se muestran debajo, que es el sentido correcto de la conversión
     porque el precio del oráculo se mueve y el importe firmado no. */

  var unidad = document.querySelector('#presale .w-field em');

  function decimales() { return medio().usdt ? red().usdtDec : 18; }
  function cifras()    { return medio().usdt ? 2 : 6; }
  function simbolo()   { return medio().usdt ? 'USDT' : red().simbolo; }

  /* Texto decimal → enteros, sin pasar por coma flotante: 0,1 + 0,2 no da 0,3
     y aquí cada unidad es dinero.

     La coma cuenta como separador decimal. En medio mundo es LA coma, y el
     teclado numérico del teléfono ofrece la que toque según el idioma: quitarla
     como un carácter cualquiera convertía «0,1» en «01», o sea 1 BNB en lugar
     de 0,1. Diez veces más, y firmado sin que nada avisara. */
  function aUnidades(txt, dec) {
    var limpio = String(txt).replace(/,/g, '.').replace(/[^0-9.]/g, '');
    var t = limpio.split('.');
    var ent = t[0] || '0';
    var fr = (t[1] || '').slice(0, dec);
    while (fr.length < dec) fr += '0';
    try { return BigInt(ent) * 10n ** BigInt(dec) + BigInt(fr || '0'); }
    catch (e) { return 0n; }
  }

  /* Lo que el contrato va a contar como dólares por ese pago. Se calcula igual
     que lo hace él: mismas divisiones, mismos truncamientos. */
  function usdDe(unid) {
    var m = medio(), e = est();
    if (m.usdt) return unid * 100000000n / (10n ** BigInt(red().usdtDec));
    if (!e.ok || !e.precioNativo) return null;
    return unid * e.precioNativo / 1000000000000000000n;
  }

  /* Y al revés, para los atajos de la barra y los botones de importe. Redondea
     hacia arriba: el contrato trunca, y un céntimo de menos dejaría la compra
     del mínimo justo por debajo del mínimo. */
  function unidDeUsd(usdCent) {
    var m = medio(), e = est();
    var u8 = BigInt(Math.round(usdCent * 1e8));
    if (m.usdt) {
      var u = 10n ** BigInt(red().usdtDec);
      return (u8 * u + 99999999n) / 100000000n;
    }
    if (!e.ok || !e.precioNativo) return null;
    return (u8 * 1000000000000000000n + e.precioNativo - 1n) / e.precioNativo;
  }

  function tokensPor(usd8) {
    var e = est();
    var p = e.ok && e.precioUsd ? e.precioUsd : 20000000n;
    return usd8 * 1000000000000000000n / p;
  }

  /* Todo en enteros. Pasar por coma flotante para enseñar "0,199525 ETH"
     cuando se envían 0,199524… es pequeño, pero es la cifra que el comprador
     compara con lo que le pide la cartera, y si no cuadra desconfía. */
  function humano(wei, dec, cif) {
    var u = 10n ** BigInt(dec);
    var ent = (wei / u).toString();
    var frac = (wei % u).toString().padStart(dec, '0').slice(0, cif || 6).replace(/0+$/, '');
    return frac ? ent + '.' + frac : ent;
  }

  /* Lo que se paga, en unidades de la moneda elegida. Es el único origen de
     verdad: el resto de la vista se deriva de aquí. Arranca vacío: un importe
     puesto de antemano es una cifra que alguien puede firmar sin haberla
     elegido. */
  var pago = 0n;



  /* El saldo de la moneda elegida, justo debajo del importe: es el número que
     hace falta para decidir cuánto se compra. */
  var lineaSaldo = document.createElement('div');
  lineaSaldo.className = 'nrm-saldo';
  lineaSaldo.hidden = true;
  eq.parentNode.insertBefore(lineaSaldo, eq.nextSibling);

  function saldoDe(m) {
    var b = saldos[m.cid];
    if (!b) return null;
    var v = m.usdt ? b.usdt : b.nativo;
    return (v === null || v === undefined) ? null : v;
  }

  function pintarSaldo() {
    var m = medio();
    var v = saldoDe(m);
    if (!sesion.cuenta || v === null) { lineaSaldo.hidden = true; return; }
    var dec = m.usdt ? red().usdtDec : 18;
    lineaSaldo.hidden = false;
    /* Con USDT hace falta decir en qué red: existe en las dos y el saldo no es
       el mismo. Con ETH o BNB la moneda ya nombra su cadena. */
    lineaSaldo.textContent = 'Balance ' + humano(v, dec, m.usdt ? 2 : 6) + ' ' + simbolo() +
      (m.usdt ? ' on ' + red().nombre : '');
  }

  var caja = cta.closest('.widget');
  var rotulo = caja ? caja.querySelector('.w-top span') : null;
  var rotuloOrig = rotulo ? rotulo.textContent : '';

  /* La ronda no puede reabrirse —isOver() es finalized o pasada la fecha, y
     ninguna de las dos vuelve atrás— así que esto es un cambio de una sola
     dirección, pero se guarda el texto original igualmente por si el diseño
     que llegue mañana trae otro. */
  function modoCerrada(cerrada, reparto) {
    if (caja) caja.classList.toggle('nrm-fin', !!cerrada);
    if (rotulo) rotulo.textContent = cerrada ? 'Seed Round closed' : rotuloOrig;
    if (!cerrada) return;
    nota.classList.remove('bad');
    nota.textContent = reparto
      ? 'Claims are open. Your NRM goes straight to this wallet.'
      : 'The round is closed. Claims open once the tokens are deposited.';
  }

  function pintar(desdeInput) {
    var ec = est();
    if (ec.ok && ec.terminada) {
      modoCerrada(true, ec.reparto);
      pintarCta();
      pintarPanel();
      pintarBarra();
      pintarSaldo();
      return;
    }
    modoCerrada(false);

    var m = medio(), c = red(), e = est();
    var dec = decimales(), cif = cifras(), sim = simbolo();
    if (unidad) unidad.textContent = sim;

    var mn0 = minUsd();
    if (pago === 0n) {
      if (!desdeInput) usdIn.value = '';
      usdIn.placeholder = '0.00';
      nrmOut.value = '';
      val.textContent = dinero(0);
      gain.textContent = '+' + dinero(0);
      range.value = String(Math.log10(mn0));
      campo.classList.remove('bad');
      nota.classList.remove('bad');
      nota.textContent = 'Min ' + dinero(mn0, mn0 < 1 ? 2 : 0) + ' · max ' +
        dinero(maxUsd()) + ' per wallet · live oracle price';
      eq.textContent = e.ok ? '' : 'Reading the price on ' + c.nombre + '…';
      pintarCta();
      pintarPanel();
      pintarBarra();
      pintarSaldo();
      return;
    }

    var usd = usdDe(pago);
    if (usd === null) {
      eq.textContent = 'Price unavailable on ' + c.nombre;
      pintarCta();
      pintarPanel();
      pintarBarra();
      pintarSaldo();
      return;
    }

    var mn = minUsd(), mx = maxUsd(), pr = precio();
    var d = Number(usd) / 1e8;
    var malo = d < mn || d > mx;

    if (!desdeInput) usdIn.value = humano(pago, dec, cif);

    campo.classList.toggle('bad', malo);
    nota.classList.toggle('bad', malo);

    if (malo && d < mn) {
      var minU = unidDeUsd(mn);
      nota.textContent = 'Minimum purchase is ' + dinero(mn, mn < 1 ? 2 : 0) +
        (minU === null ? '' : ' — about ' + humano(minU, dec, cif) + ' ' + sim);
    } else if (malo) {
      var maxU = unidDeUsd(mx);
      nota.textContent = 'Maximum is ' + dinero(mx) + ' per wallet' +
        (maxU === null ? '' : ' — about ' + humano(maxU, dec, cif) + ' ' + sim);
    } else {
      nota.textContent = 'Min ' + dinero(mn, mn < 1 ? 2 : 0) + ' · max ' +
        dinero(mx) + ' per wallet · live oracle price';
    }

    eq.textContent = '≈ ' + dinero(d, d < 100 ? 2 : 0) + ' on ' + c.nombre +
      (m.usdt || e.oraculoVivo ? '' : ' · cached price');

    var tk = tokensPor(usd);
    nrmOut.value = nrm(tk);
    tasa.textContent = '1 NRM = ' + dinero(pr, 2);
    val.textContent  = dinero(d / pr * LISTADO);
    gain.textContent = '+' + dinero(d / pr * LISTADO - d);
    range.value = aBarra(Math.min(mx, Math.max(mn, d))).toFixed(3);

    pintarCta();
    pintarPanel();
    pintarBarra();
    pintarSaldo();
  }

  /* Al cambiar de moneda se conserva el valor en dólares, no el número: pasar
     de 0,5 ETH a 0,5 BNB sería multiplicar por tres lo que se paga sin que
     nadie haya tocado el importe. */
  function ponerUsd(d) {
    var u = unidDeUsd(d);
    if (u !== null) pago = u;
    pintar(false);
  }

  /* ──────────────────────── barra de recaudación ─────────────────────────── */

  /* Lo levantado antes de que existiera el contrato. No vive en ninguna cadena
     —es la ronda privada, cerrada fuera de aquí— así que va escrito, y encima
     se suma lo que entra por Ethereum y BNB Chain. */
  var PRIVADA_USD = 13616000;

  var barra = document.getElementById('saleFill'),
      globo = document.getElementById('saleTip'),
      cifra = document.getElementById('saleRaised'),
      cifraPie = cifra ? cifra.nextElementSibling : null;
  var pintado = 0, animada = false, vuelta = 0;

  function enCadenaUsd() {
    var t = 0;
    [1, 56].forEach(function (k) {
      var e = estado[k];
      if (e && e.ok && e.precioUsd) {
        t += Number(e.vendidos * e.precioUsd / 1000000000000000000n) / 1e8;
      }
    });
    return t;
  }

  function objetivoUsd() {
    var t = 0, hay = false;
    [1, 56].forEach(function (k) {
      var e = estado[k];
      if (e && e.ok && e.tope && e.precioUsd) {
        hay = true;
        t += Number(e.tope * e.precioUsd / 1000000000000000000n) / 1e8;
      }
    });
    return hay ? PRIVADA_USD + t : OBJETIVO_USD;
  }

  function pintarBarra() {
    if (!barra) return;
    var total = PRIVADA_USD + enCadenaUsd();
    var meta = objetivoUsd();
    var pct = meta > 0 ? Math.min(100, total / meta * 100) : 0;

    if (cifraPie) cifraPie.textContent = 'raised of ' + dinero(meta);
    if (globo) {
      globo.querySelector('em').textContent = pct.toFixed(1) + '%';
      globo.style.left = pct + '%';
      globo.classList.add('on');
    }
    barra.style.width = pct + '%';

    /* La primera vez sube contando, como en el diseño. Después, cuando una
       compra cambia la cifra, se escribe sin más: un contador saltando cada
       treinta segundos sería ruido. */
    var hayCadena = (estado[1] && estado[1].ok) || (estado[56] && estado[56].ok);
    if (!animada) {
      /* Sin datos de la cadena todavía no se sabe el total: animar ahora
         significaría contar hasta una cifra que enseguida cambia, y el último
         fotograma de esa cuenta pisaría la buena. */
      if (!hayCadena) { cifra.textContent = dinero(Math.round(total)); return; }
      animada = true;
      pintado = total;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cifra.textContent = dinero(Math.round(total));
        return;
      }
      var mio = ++vuelta, t0 = performance.now(), hasta = total;
      (function paso(t) {
        if (mio !== vuelta) return;      /* llegó una cifra más nueva */
        var q = Math.min(1, (t - t0) / 1800), e = 1 - Math.pow(1 - q, 4);
        cifra.textContent = dinero(Math.round(hasta * e));
        if (q < 1) requestAnimationFrame(paso);
      })(t0);
      return;
    }
    if (Math.round(total) !== Math.round(pintado)) {
      pintado = total;
      vuelta++;                          /* corta cualquier cuenta en curso */
      cifra.textContent = dinero(Math.round(total));
    }
  }

  /* ─────────────────────── lo que lleva el comprador ─────────────────────── */

  /* Durante la ronda la cartera no tiene ni un NRM: el contrato solo anota la
     asignación, y los tokens se transfieren al reclamar. Por eso lo que se
     enseña aquí es `allocation`, no el saldo del token, que sería 0 y haría
     pensar a la gente que su compra no entró. */

  var panel = null;

  function nrm(bi) {
    var ent = bi / 1000000000000000000n;
    var dec = Number((bi % 1000000000000000000n) / 10000000000000000n) / 100;
    var v = Number(ent) + dec;
    return v.toLocaleString('en-US', { maximumFractionDigits: v < 1 ? 4 : (v < 1000 ? 2 : 0) });
  }
  /* Céntimos solo cuando la cifra es pequeña: "$2,500.00" es ruido, pero
     "$1" en lugar de "$0.60" sería mentira. */
  var usd8 = function (bi, d) {
    var v = Number(bi) / 1e8;
    return dinero(v, d === undefined ? (v < 100 ? 2 : 0) : d);
  };

  function estilosPanel() {
    if (document.getElementById('nrmPos')) return;
    var e = document.createElement('style');
    e.id = 'nrmPos';
    e.textContent = [
      '.nrm-pos{margin-top:14px;padding:14px 15px 13px;border:1px solid rgba(10,12,16,.12);',
      'border-radius:14px;font-size:13px;line-height:1.45}',
      /* Con la ronda cerrada la calculadora ya no calcula nada que se pueda
         comprar: se retira entera y el recuadro queda para el reparto. */
      '.widget.nrm-fin .w-lab,.widget.nrm-fin .w-pay,.widget.nrm-fin .w-field,',
      '.widget.nrm-fin .w-eq,.widget.nrm-fin .w-range,.widget.nrm-fin .w-chips,',
      '.widget.nrm-fin .w-swap,.widget.nrm-fin .w-out{display:none!important}',
      '.widget.nrm-fin .w-cta{margin-top:2px}',
      '.nrm-pos .pos-cab{display:flex;align-items:center;justify-content:space-between;',
      'gap:10px;margin-bottom:10px;font-size:11px;opacity:.5}',
      /* La dirección va en monoespaciada y tal cual: en mayúsculas el 0x se lee
         como 0X y parece otra cosa. */
      ".nrm-pos .pos-cab .pos-dir{font-family:var(--m,ui-monospace,monospace);letter-spacing:0}",
      '.nrm-pos .pos-salir{border:0;background:none;color:inherit;font:inherit;font-size:10.5px;',
      'letter-spacing:.08em;text-transform:uppercase;cursor:pointer;opacity:.75;padding:0}',
      '.nrm-pos .pos-salir:hover{opacity:1;text-decoration:underline}',
      '.nrm-pos .pos-gran{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
      '.nrm-pos .pos-gran b{font-size:22px;font-weight:600;letter-spacing:-.02em}',
      '.nrm-pos .pos-gran b em{font-style:normal;font-size:12px;font-weight:500;opacity:.5;margin-left:5px}',
      '.nrm-pos .pos-gran span{opacity:.62}',
      '.nrm-pos ul{list-style:none;margin:11px 0 0;padding:10px 0 0;',
      'border-top:1px solid rgba(10,12,16,.09)}',
      '.nrm-pos li{display:flex;justify-content:space-between;gap:12px;padding:2px 0;opacity:.72}',
      '.nrm-pos .pos-pie{margin:9px 0 0;font-size:12px;opacity:.55}',
      '.nrm-saldo{margin:-4px 0 12px;font-size:12px;opacity:.6;',
      "font-family:var(--m,ui-monospace,monospace)}",
      '.nrm-pos .pos-rec{margin-top:10px;padding-top:10px;border-top:1px solid rgba(10,12,16,.09);',
      'display:flex;justify-content:space-between;gap:12px;color:var(--blue,#2F6BFF);font-weight:500}',
      '@media(prefers-color-scheme:dark){.nrm-pos{border-color:rgba(255,255,255,.14)}',
      '.nrm-pos ul,.nrm-pos .pos-rec{border-color:rgba(255,255,255,.10)}}'
    ].join('');
    document.head.appendChild(e);
  }

  function fila(k, v) {
    var li = document.createElement('li');
    var a = document.createElement('span'); a.textContent = k;
    var b = document.createElement('span'); b.textContent = v;
    li.appendChild(a); li.appendChild(b);
    return li;
  }

  function pintarPanel() {
    var p1 = posicion[1], p56 = posicion[56];
    var hay = sesion.cuenta && (p1 || p56);
    if (!hay) { if (panel) panel.hidden = true; return; }

    var tokens = (p1 ? p1.tokens : 0n) + (p56 ? p56.tokens : 0n);
    var gasto  = (p1 ? p1.gastado : 0n) + (p56 ? p56.gastado : 0n);
    var recl   = (p1 ? p1.reclamable : 0n) + (p56 ? p56.reclamable : 0n);

    estilosPanel();
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'nrm-pos';
      nota.parentNode.insertBefore(panel, nota.nextSibling);
    }
    panel.hidden = false;
    panel.textContent = '';

    var cab = document.createElement('div');
    cab.className = 'pos-cab';
    var quien = document.createElement('span');
    quien.className = 'pos-dir';
    quien.textContent = sesion.cuenta.slice(0, 6) + '…' + sesion.cuenta.slice(-4);
    var salir = document.createElement('button');
    salir.type = 'button'; salir.className = 'pos-salir'; salir.textContent = 'Disconnect';
    salir.addEventListener('click', desconectar);
    cab.appendChild(quien); cab.appendChild(salir);
    panel.appendChild(cab);

    if (tokens === 0n) {
      var v = document.createElement('div');
      v.className = 'pos-pie';
      v.style.margin = '0';
      v.textContent = 'No purchase from this wallet yet.';
      panel.appendChild(v);
      panel.appendChild(topeRestante());
      return;
    }

    var gran = document.createElement('div');
    gran.className = 'pos-gran';
    var b = document.createElement('b');
    b.textContent = nrm(tokens);
    var em = document.createElement('em'); em.textContent = 'NRM';
    b.appendChild(em);
    var g = document.createElement('span');
    g.textContent = usd8(gasto) + ' invested';
    gran.appendChild(b); gran.appendChild(g);
    panel.appendChild(gran);

    /* El desglose solo aporta si compró en las dos: si no, repite la cifra
       de arriba con otras palabras. */
    if (p1 && p56 && p1.tokens > 0n && p56.tokens > 0n) {
      var ul = document.createElement('ul');
      ul.className = 'pos-redes';
      ul.appendChild(fila('Ethereum',  nrm(p1.tokens)  + ' NRM · ' + usd8(p1.gastado)));
      ul.appendChild(fila('BNB Chain', nrm(p56.tokens) + ' NRM · ' + usd8(p56.gastado)));
      panel.appendChild(ul);
    }

    if (recl > 0n) {
      var r = document.createElement('div');
      r.className = 'pos-rec';
      var ra = document.createElement('span'); ra.textContent = 'Ready to claim';
      var rb = document.createElement('span'); rb.textContent = nrm(recl) + ' NRM';
      r.appendChild(ra); r.appendChild(rb);
      panel.appendChild(r);
    } else {
      panel.appendChild(topeRestante());
    }
  }

  /* El tope de $10.000 lo lleva cada contrato por su cuenta, así que es por red
     y no una bolsa común: decir "te quedan X" sin nombrar la red sería mentira
     para quien compre en las dos. */
  function topeRestante() {
    var c = red(), p = posicion[c.id];
    var d = document.createElement('p');
    d.className = 'pos-pie';
    if (!p) { d.textContent = ''; return d; }
    var tope = maxUsd();
    if (!tope || p.queda > 100000000000000n) {
      d.textContent = 'No cap on this wallet.';
    } else if (p.queda === 0n) {
      d.textContent = 'Cap reached on ' + c.nombre + '.';
    } else {
      d.textContent = usd8(p.queda, 0) + ' of your ' + dinero(tope) + ' left on ' + c.nombre + '.';
    }
    return d;
  }

  function desconectar() {
    try { if (sesion.prov && sesion.prov.disconnect) sesion.prov.disconnect(); } catch (e) {}
    sesion = { prov: null, cuenta: null, cid: null, nombre: '' };
    posicion = { 1: null, 56: null };
    saldos = { 1: null, 56: null };
    wcUri = null; wcEstado = 'nada'; wcFallo = null; wcEspera = null; wcProv = null;
    pintar();
  }

  /* ─────────────────────────── el botón principal ─────────────────────────── */

  var ocupado = false;
  var carteraElegida = null;      /* la del registro que se eligió, si fue esa vía */

  /* Con la cartera en otra app, «Confirm in your wallet…» no dice dónde ni deja
     claro que falta un paso. Un enlace pequeño debajo del botón tampoco: quien
     no sepa que hay que pulsarlo da la compra por hecha y se va.

     Así que sale la misma hoja que usa la conexión, tapando la página: es
     imposible no verla, y dice qué falta y dónde se hace. */
  var hojaF = null, pasoActual = '';

  /* El botón ya dice en qué paso va —aprobar el USDT, confirmar la compra—, y
     esa misma frase sirve aquí con el nombre de la cartera en lugar de «your
     wallet», que es lo que hace falta cuando hay que ir a buscarla. */
  function frasePaso(quien) {
    var t = (pasoActual || 'Confirm').replace(/[.…\s]+$/, '');
    t = t.replace(/your wallet/i, quien);
    if (t.toLowerCase().indexOf(quien.toLowerCase()) < 0) t += ' in ' + quien;
    return t + '. Your purchase is not finished until you do.';
  }

  var relojesFirma = [];

  /* Deja la página sin cartera y sin memoria de ella, para empezar de cero. */
  function soltarSesion() {
    try { if (sesion.wc && sesion.prov && sesion.prov.disconnect) sesion.prov.disconnect(); }
    catch (e) {}
    wcProv = null; wcUri = null; wcEstado = 'nada';
    sesion = { prov: null, cuenta: null, cid: null, nombre: '' };
    posicion = { 1: null, 56: null };
    olvidar();
  }

  function cerrarFirma() {
    while (relojesFirma.length) relojesFirma.pop()();
    if (!hojaF) return;
    var h = hojaF; hojaF = null;
    h.classList.remove('on');
    setTimeout(function () { if (h.parentNode) h.remove(); }, 200);
  }

  function volverACartera() {
    if (!sesion.wc) return;               /* la cartera está aquí mismo */
    estilos();
    cerrarFirma();

    /* Se recalcula ahora y no se usa el de la conexión: el registro, que es de
       donde salen los esquemas de cada app, puede haber llegado después. */
    var destino = volverA(sesion.prov) || sesion.volver;
    if (destino && !/^http/.test(destino) && destino.charAt(destino.length - 1) !== '/') {
      destino += '/';
    }
    var quien = sesion.nombre || 'your wallet';

    hojaF = document.createElement('div');
    hojaF.className = 'nrm-fondo';
    hojaF.setAttribute('role', 'dialog');
    hojaF.setAttribute('aria-modal', 'true');

    var caja = document.createElement('div');
    caja.className = 'nrm-caja';

    var cab = document.createElement('div');
    cab.className = 'nrm-cab';
    var hueco = document.createElement('button');
    hueco.type = 'button'; hueco.className = 'nrm-ico'; hueco.hidden = true;
    var tit = document.createElement('h3');
    tit.textContent = quien;
    var equis = document.createElement('button');
    equis.type = 'button'; equis.className = 'nrm-ico';
    equis.appendChild(icono('M4 4l8 8M12 4l-8 8'));
    equis.setAttribute('aria-label', 'Close');
    equis.addEventListener('click', cerrarFirma);
    cab.appendChild(hueco); cab.appendChild(tit); cab.appendChild(equis);

    var cuerpo = document.createElement('div');
    cuerpo.className = 'nrm-qr';
    var cara = avatar({ nombre: quien, logo: sesion.logo || '' });
    cara.classList.add('nrm-grandota');
    cuerpo.appendChild(cara);
    var p = document.createElement('p');
    p.textContent = destino ? frasePaso(quien)
      : 'Open ' + quien + ' on your phone and confirm there. ' +
        'Your purchase is not finished until you do.';
    cuerpo.appendChild(p);

    if (destino) {
      /* Un enlace de verdad: saltar a un esquema propio desde JavaScript, fuera
         de un gesto, lo bloquea el navegador sin decir nada. */
      var a = document.createElement('a');
      a.className = 'nrm-copiar nrm-grande';
      a.href = destino;
      a.rel = 'noopener';
      a.textContent = 'Open ' + quien;
      cuerpo.appendChild(a);
    }

    /* Si la cartera abre por su pantalla de inicio en vez de por la petición
       —pasa cuando el sistema la ha matado y arranca de cero—, desde fuera se
       ve como que pide conectarse otra vez, y ahí no hay salida: la hoja dice
       «confirma» y la app dice «conecta». Pasado un rato se ofrece rehacer la
       conexión, que es lo que de verdad hace falta. */
    var rescate = setTimeout(function () {
      if (!hojaF) return;
      var p2 = document.createElement('p');
      p2.className = 'nrm-flojo';
      p2.textContent = 'Is ' + quien + ' asking you to connect instead? ' +
                       'Then the session is gone and has to be made again.';
      cuerpo.appendChild(p2);
      var re = document.createElement('button');
      re.type = 'button';
      re.className = 'nrm-copiar';
      re.textContent = 'Reconnect';
      re.addEventListener('click', function () {
        cerrarFirma();
        soltarSesion();
        libre();
        abrirCarteras();
      });
      cuerpo.appendChild(re);
    }, 25000);
    var pararRescate = function () { clearTimeout(rescate); };

    caja.appendChild(cab); caja.appendChild(cuerpo);
    hojaF.appendChild(caja);
    hojaF.addEventListener('click', function (e) { if (e.target === hojaF) cerrarFirma(); });
    document.body.appendChild(hojaF);
    relojesFirma.push(pararRescate);
    requestAnimationFrame(function () { if (hojaF) hojaF.classList.add('on'); });
  }

  function ocultarVolver() { cerrarFirma(); }

  function pintarCta() {
    if (ocupado) return;
    var e = est(), c = red();
    cta.disabled = false;
    cta.classList.remove('espera');

    if (!e.ok) {
      /* Sin datos de la cadena no se sabe ni el precio ni si la ronda está
         abierta, así que no se deja comprar. Pero si aún no hay cartera, el
         botón sigue sirviendo: al conectar se leerá a través de ella. */
      if (!sesion.cuenta) { cta.textContent = 'Connect wallet'; return; }
      cta.textContent = c.nombre + ' unavailable'; cta.disabled = true; return;
    }
    if (e.terminada) {
      if (e.reparto) { cta.textContent = 'Claim your NRM'; return; }
      cta.textContent = 'Round closed'; cta.disabled = true; return;
    }
    if (e.pausada)   { cta.textContent = 'Round paused';     cta.disabled = true; return; }
    if (!e.viva)     { cta.textContent = 'Round not open yet'; cta.disabled = true; return; }
    if (!sesion.cuenta) { cta.textContent = 'Connect wallet'; return; }
    /* Por WalletConnect la red NO es la que enseñe la app de la cartera: es la
       de la sesión, y la lleva el proveedor. Volvía de la compra en BNB
       apuntando a BNB, así que con Ethereum elegido el botón decía «Switch to
       Ethereum» aunque en MetaMask se viera Ethereum, y no había forma de
       entenderlo desde fuera.

       Y no hace falta pedírselo a nadie: cambiar a una red ya aprobada en la
       sesión es una operación local del SDK, y la firma viaja con su cadena
       dentro, así que la cartera se pone en la red al confirmar. Se alinea
       sola dentro de la compra. Con una extensión sí hace falta el cambio
       explícito, y ahí se sigue pidiendo. */
    if (!sesion.wc && sesion.cid !== c.id) {
      cta.textContent = 'Switch to ' + c.nombre; return;
    }
    if (pago === 0n) { cta.textContent = 'Enter an amount'; cta.disabled = true; return; }
    var u = usdDe(pago);
    cta.textContent = u === null ? 'Connect wallet'
      : 'Buy ' + nrm(tokensPor(u)) + ' NRM';
  }

  function trabajando(txt) {
    ocupado = true; cta.disabled = true;
    cta.classList.add('espera'); cta.textContent = txt;
    pasoActual = txt;
  }
  function libre() {
    ocupado = false;
    cta.classList.remove('espera');
    ocultarVolver();
    pintarCta();
  }
  function aviso(txt, malo) {
    nota.textContent = txt;
    nota.classList.toggle('bad', !!malo);
  }

  cta.addEventListener('click', function () {
    if (ocupado) return;
    var e = est(), c = red();

    if (e.ok && e.terminada && e.reparto) return reclamar();
    if (!sesion.cuenta) return abrirCarteras();
    if (!sesion.wc && sesion.cid !== c.id) {
      /* Dice qué se está pidiendo, no un «confirma» a secas: lo que llega a la
         cartera es un cambio de red, no la compra. */
      trabajando('Switch network in your wallet…');
      return cambiarRed(c.id).then(function () { return refrescar(); })
        .then(function () { libre(); pintar(); })
        .catch(function (err) { libre(); aviso(motivo(err), true); });
    }
    comprar();
  });

  /* Que el proveedor apunte a la red de la compra antes de firmar. Si ya está,
     no hace nada; si la cadena está aprobada en la sesión, el SDK lo resuelve
     sin salir al teléfono, y por eso la hoja de «abre tu cartera» va con
     retraso: solo aparece si la petición ha salido de verdad. */
  function alinearRed(c) {
    if (sesion.cid === c.id) return Promise.resolve();
    return cambiarRed(c.id, 1200);
  }

  function comprar() {
    var c = red(), m = medio();
    if (pago === 0n) { aviso('Enter an amount first.', true); return; }

    /* Se envía exactamente lo que hay en el campo. El contrato sacará de ahí
       los dólares con la misma cuenta que hace la vista, así que lo que firma
       el comprador y lo que le cuenta el contrato son el mismo número. */
    var usd8 = usdDe(pago);
    if (usd8 === null) { aviso('No price available right now.', true); return; }

    var d = Number(usd8) / 1e8;
    if (d < minUsd()) { aviso('Minimum purchase is ' + dinero(minUsd(), 2), true); return; }
    if (d > maxUsd()) { aviso('Maximum is ' + dinero(maxUsd()) + ' per wallet', true); return; }

    var esperados = tokensPor(usd8);
    var minimo = esperados * BigInt(10000 - HOLGURA_BPS) / 10000n;

    /* El tope es por cartera y para toda la ronda, sumando ETH y USDT. Se
       comprueba antes de firmar para no hacerle gastar gas en un revert. */
    trabajando('Checking…');
    alinearRed(c).then(function () {
      return llamar(c.id, c.venta, SEL.remaining + encA(sesion.cuenta));
    }).then(function (r) {
      var queda = decU(palabras(r)[0]);
      if (queda < usd8) {
        libre();
        aviso(queda === 0n
          ? 'This wallet has already bought its $' + num(maxUsd()) + '.'
          : 'Only ' + dinero(Number(queda) / 1e8, 2) + ' left for this wallet.', true);
        return null;
      }
      return m.usdt ? comprarUsdt(pago, usd8, minimo) : comprarNativo(pago, minimo);
    }).catch(function (err) { libre(); aviso(motivo(err), true); });
  }

  function comprarNativo(wei, minimo) {
    var c = red();
    trabajando('Confirm in your wallet…');
    return enviar({
      to: c.venta,
      value: '0x' + wei.toString(16),
      data: SEL.buyWithNative + encU(minimo)
    }).then(function (h) { return confirmar(h); });
  }

  function comprarUsdt(cantidad, usd8, minimo) {
    var c = red();
    trabajando('Checking allowance…');
    return llamar(c.id, c.usdt, SEL.allowance + encA(sesion.cuenta) + encA(c.venta))
      .then(function (r) {
        var permitido = decU(palabras(r)[0]);
        if (permitido >= cantidad) return null;

        /* El USDT de Ethereum no deja cambiar un permiso distinto de cero: hay
           que ponerlo a cero primero. Es una peculiaridad suya, no del estándar,
           y se traga la compra si no se contempla. */
        var pasos = Promise.resolve();
        if (permitido > 0n && c.usdtDec === 6) {
          trabajando('Resetting allowance…');
          pasos = enviar({ to: c.usdt, data: SEL.approve + encA(c.venta) + encU(0) })
            .then(function (h) { return esperar(c.id, h); });
        }
        /* Se aprueba el hueco que le queda a la cartera en toda la ronda, no
           solo esta compra: así la segunda ya no pide otra firma. */
        return pasos.then(function () {
          trabajando('Approve USDT in your wallet…');
          return llamar(c.id, c.venta, SEL.remaining + encA(sesion.cuenta));
        }).then(function (r2) {
          var queda = decU(palabras(r2)[0]);
          var tope = queda > 0n && queda < 10n ** 30n ? queda : usd8;
          var techo = unidDeUsd(Number(tope) / 1e8);
          if (techo === null) techo = cantidad;
          if (techo < cantidad) techo = cantidad;
          return enviar({ to: c.usdt, data: SEL.approve + encA(c.venta) + encU(techo) });
        }).then(function (h) {
          trabajando('Waiting for the approval…');
          return esperar(c.id, h);
        });
      })
      .then(function () {
        trabajando('Confirm the purchase…');
        return enviar({
          to: c.venta,
          data: SEL.buyWithUsdt + encU(cantidad) + encU(minimo)
        });
      })
      .then(function (h) { return confirmar(h); });
  }

  function reclamar() {
    var c = red();
    if (!sesion.cuenta) return abrirCarteras();
    if (!sesion.wc && sesion.cid !== c.id) {
      /* Dice qué se está pidiendo, no un «confirma» a secas: lo que llega a la
         cartera es un cambio de red, no la compra. */
      trabajando('Switch network in your wallet…');
      return cambiarRed(c.id).then(function () { libre(); }).catch(function (e) {
        libre(); aviso(motivo(e), true);
      });
    }
    trabajando('Confirm in your wallet…');
    alinearRed(c)
      .then(function () { return enviar({ to: c.venta, data: SEL.claim }); })
      .then(function (h) { return confirmar(h, 'NRM sent to your wallet.'); })
      .catch(function (e) { libre(); aviso(motivo(e), true); });
  }

  function confirmar(hash, texto) {
    var c = red();
    trabajando('Confirming on ' + c.nombre + '…');
    return esperar(c.id, hash).then(function (r) {
      libre();
      if (r && r.status && BigInt(r.status) === 0n) {
        aviso('The transaction reverted. Nothing was charged beyond gas.', true);
        return;
      }
      aviso(texto || 'Done. Your NRM allocation is recorded on ' + c.nombre + '.');
      refrescar().then(function () { pintar(); });
    }).catch(function () {
      libre();
      aviso('Sent. It is taking longer than usual to confirm — check your wallet.');
    });
  }

  /* ──────────────────────── carteras: lista y conexión ───────────────────── */

  var MOVIL = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');

  /* Los logos y los enlaces a cada app salen del registro de WalletConnect. Si
     no se puede alcanzar —red del visitante, API caída— la lista sigue saliendo
     con estos nombres y un monograma, y el enlace pasa a ser el `wc:` pelado,
     que el propio sistema operativo enruta a la cartera que haya instalada. */
  var RESPALDO = ['MetaMask', 'Trust Wallet', 'Coinbase Wallet', 'Rainbow', 'Zerion',
    'Uniswap Wallet', 'OKX Wallet', 'Bitget Wallet', 'Binance Web3 Wallet', 'SafePal',
    'TokenPocket', 'imToken', 'Ledger Live', 'Rabby Wallet', 'Argent', '1inch Wallet',
    'Crypto.com Onchain', 'Phantom', 'Exodus', 'Blockchain.com'];

  var registro = null, pidiendo = null;

  function traerRegistro() {
    if (registro) return Promise.resolve(registro);
    if (pidiendo) return pidiendo;
    var raso = function () {
      registro = RESPALDO.map(function (n) { return { nombre: n }; });
      return registro;
    };
    if (!PROYECTO_WC) return Promise.resolve(raso());

    var traer = function (url) {
      var corte = new AbortController();
      var reloj = setTimeout(function () { corte.abort(); }, 8000);
      return fetch(url, { signal: corte.signal })
        .then(function (r) { clearTimeout(reloj); return r.json(); });
    };

    /* El registro viejo (explorer-api) y el de ahora (api.web3modal.org)
       devuelven lo mismo con otros nombres. Se piden en orden y vale el primero
       que conteste: si uno se cae, la lista sigue completa en vez de quedarse
       en los veinte nombres de respaldo, sin logos y sin enlaces a las apps. */
    var deExplorer = function () {
      return traer('https://explorer-api.walletconnect.com/v3/wallets?projectId=' +
          PROYECTO_WC + '&entries=100&page=1').then(function (j) {
        var l = j && j.listings, out = [];
        for (var k in l) if (Object.prototype.hasOwnProperty.call(l, k)) {
          var x = l[k];
          if (!x || !x.name) continue;
          out.push({
            nombre: x.name,
            /* `lg` y no `md`: en una pantalla de 3× un icono de 64 puntos son
               192 píxeles de verdad, y el mediano se queda corto y se ve
               emborronado. */
            logo: x.image_id ? 'https://explorer-api.walletconnect.com/v3/logo/lg/' +
                  x.image_id + '?projectId=' + PROYECTO_WC : '',
            movil: x.mobile || {}, escritorio: x.desktop || {}
          });
        }
        return out;
      });
    };

    var deWeb3Modal = function () {
      return traer('https://api.web3modal.org/getWallets?projectId=' + PROYECTO_WC +
          '&page=1&entries=100&st=nereum&sv=1').then(function (j) {
        return (j && j.data || []).filter(function (x) { return x && x.name; })
          .map(function (x) {
            return {
              nombre: x.name,
              logo: x.image_id ? 'https://api.web3modal.org/getWalletImage/' +
                    x.image_id + '?projectId=' + PROYECTO_WC + '&st=nereum&sv=1' : '',
              /* Aquí los enlaces vienen sueltos, no en un objeto. */
              movil: { native: x.mobile_link || '', universal: x.link_mode || '' },
              escritorio: { native: x.desktop_link || '', universal: x.webapp_link || '' }
            };
          });
      });
    };

    pidiendo = deExplorer()
      .catch(function () { return []; })
      .then(function (out) { return out.length ? out : deWeb3Modal(); })
      .then(function (out) {
        if (!out || !out.length) return raso();
        registro = out;
        return out;
      })
      .catch(raso);
    return pidiendo;
  }

  /* Cuando no hay logo, una inicial sobre un color estable sacado del nombre.
     Estable importa: la misma cartera tiene siempre el mismo color y la lista no
     cambia de aspecto entre visitas. */
  function tono(n) {
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
    return 'hsl(' + h + ' 62% 46%)';
  }

  /* Enlaces tal como los arma WalletConnect. Un esquema propio abre la app
     directamente; el universal es https y, si la app no está, cae en su web. */
  function enlaceNativo(base, uri) {
    if (/^http/.test(base)) return enlaceUniversal(base, uri);
    var b = base;
    if (b.indexOf('://') < 0) b = b.replace(/[/:]/g, '') + '://';
    if (b.charAt(b.length - 1) !== '/') b += '/';
    return b + 'wc?uri=' + encodeURIComponent(uri);
  }
  function enlaceUniversal(base, uri) {
    var b = base;
    if (b.charAt(b.length - 1) !== '/') b += '/';
    return b + 'wc?uri=' + encodeURIComponent(uri);
  }
  function enlaceApp(w, uri) {
    var m = w.movil || {};
    if (m.native) return enlaceNativo(m.native, uri);
    if (m.universal) return enlaceUniversal(m.universal, uri);
    return uri;
  }

  /* ─────────────────────────────── el modal ──────────────────────────────── */

  var hoja = null, buscador = null, rejilla = null, vistaQR = null, atras = null, titulo = null;

  function estilos() {
    if (document.getElementById('nrmCss')) return;
    var e = document.createElement('style');
    e.id = 'nrmCss';
    e.textContent = [
      '.w-cta.espera{opacity:.72;cursor:progress}',
      /* Las vistas del modal traen display propio, que le gana al [hidden] del
         navegador: sin esto el QR se queda encima de la lista al volver atrás. */
      '.nrm-caja [hidden]{display:none!important}',
      '.nrm-caja .nrm-ico[hidden]{display:flex!important;visibility:hidden}',
      /* La página esconde el cursor del sistema y pinta el suyo en #cur, a
         z-index 130. El modal va a 9999, así que ese cursor queda debajo y
         encima no hay puntero de ninguna clase: no se ve qué se va a pulsar.
         Dentro del modal se devuelve el del sistema, que además es lo que se
         espera de un diálogo. */
      '.nrm-fondo,.nrm-fondo *{cursor:default!important}',
      '.nrm-fondo button,.nrm-fondo .nrm-w,.nrm-fondo a{cursor:pointer!important}',
      '.nrm-fondo input{cursor:text!important}',
      '.nrm-fondo{position:fixed;inset:0;z-index:9999;background:rgba(4,7,12,.72);',
      '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;',
      'align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .18s}',
      '.nrm-fondo.on{opacity:1}',
      '@media(max-width:560px){.nrm-fondo{align-items:flex-end;padding:0}}',

      '.nrm-caja{width:100%;max-width:420px;max-height:min(640px,92vh);display:flex;',
      'flex-direction:column;background:var(--paper,#fff);color:var(--ink,#0A0C10);',
      'border-radius:22px;box-shadow:0 36px 90px rgba(0,0,0,.42);overflow:hidden;',
      "font-family:var(--f,'Inter Tight',system-ui,sans-serif);",
      'transform:translateY(10px) scale(.985);transition:transform .22s var(--ease,ease)}',
      '.nrm-fondo.on .nrm-caja{transform:none}',
      '@media(max-width:560px){.nrm-caja{max-width:none;border-radius:22px 22px 0 0;',
      'max-height:88vh;padding-bottom:env(safe-area-inset-bottom,0px)}',
      '.nrm-fondo.on .nrm-caja{transform:none}',
      '.nrm-fondo:not(.on) .nrm-caja{transform:translateY(24px)}}',

      '.nrm-cab{display:flex;align-items:center;gap:8px;padding:16px 16px 10px}',
      '.nrm-cab h3{flex:1;margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em;text-align:center}',
      '.nrm-ico{width:32px;height:32px;flex:0 0 auto;display:flex;align-items:center;',
      'justify-content:center;border:0;border-radius:50%;background:rgba(10,12,16,.05);',
      'color:inherit;cursor:pointer;font-size:15px;line-height:1;transition:background .15s}',
      '.nrm-ico:hover{background:rgba(10,12,16,.1)}',

      '.nrm-buscar{margin:0 16px 12px;padding:11px 14px;border:1px solid rgba(10,12,16,.12);',
      'border-radius:12px;background:rgba(10,12,16,.03);color:inherit;font:inherit;font-size:14px;',
      'outline:0;transition:border-color .15s}',
      '.nrm-buscar:focus{border-color:var(--blue,#2F6BFF)}',
      '.nrm-buscar::placeholder{color:currentColor;opacity:.42}',

      '.nrm-rej{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:0 10px 14px;',
      /* minmax(0,1fr) y no 1fr: `1fr` deja que una columna crezca si su
         contenido no cabe, y con nombres como «Crypto.com Onchain» las cuatro
         salían de anchos distintos y la rejilla quedaba torcida. El min-width:0
         del botón es la otra mitad: sin él su tamaño mínimo sigue siendo el del
         texto entero y el recorte con puntos suspensivos nunca llega a actuar. */
      'display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;',
      '-webkit-overflow-scrolling:touch}',
      /* Cuatro columnas por debajo de 440px dejan el nombre en dos letras y un
         punto: a partir de ahí, tres. */
      '@media(max-width:439px){.nrm-rej{grid-template-columns:repeat(3,minmax(0,1fr))}}',

      '.nrm-w{min-width:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:7px;',
      'padding:12px 4px 11px;border:0;border-radius:14px;background:none;color:inherit;',
      'font:inherit;cursor:pointer;transition:background .15s}',
      '.nrm-w:hover{background:rgba(47,107,255,.08)}',
      '.nrm-w b{font-size:11px;font-weight:500;line-height:1.25;text-align:center;',
      'width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.86}',
      '.nrm-av.nrm-grandota{width:64px;height:64px;border-radius:18px;font-size:26px;',
      'margin:0 auto 2px}',
      /* La placa gris y la sombra son para el monograma, que sin ellas es una
         letra suelta. Un logo de verdad trae su propia forma, y ponerle un
         cuadro detrás le inventa un fondo que no tiene: ni en la hoja ni en la
         lista. `contain` en lugar de `cover` para no recortar el que no sea
         exactamente cuadrado. */
      'img.nrm-av{background:none;box-shadow:none;object-fit:contain}',
      '.nrm-av{width:46px;height:46px;border-radius:13px;object-fit:cover;',
      'background:rgba(10,12,16,.06);display:flex;align-items:center;justify-content:center;',
      'color:#fff;font-size:18px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}',
      '.nrm-w i{position:absolute;top:9px;right:9px;width:8px;height:8px;border-radius:50%;',
      'background:#22C55E;box-shadow:0 0 0 2px var(--paper,#fff)}',
      '.nrm-vacia{grid-column:1/-1;padding:28px 12px;text-align:center;font-size:13px;opacity:.55}',

      '.nrm-qr{flex:1;display:flex;flex-direction:column;align-items:center;',
      'justify-content:center;gap:14px;padding:6px 24px 26px;text-align:center}',
      '.nrm-qr .marco{width:min(268px,68vw);aspect-ratio:1;padding:14px;border-radius:18px;',
      'background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.10);display:flex}',
      '.nrm-qr .marco svg{width:100%;height:100%;display:block}',
      '.nrm-qr p{margin:0;font-size:13px;line-height:1.5;opacity:.62;max-width:280px}',
      '.nrm-copiar{padding:9px 18px;border:1px solid rgba(10,12,16,.14);border-radius:999px;',
      'background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer;transition:background .15s}',
      '.nrm-copiar:hover{background:rgba(47,107,255,.08)}',
      /* La salida de emergencia va en voz baja: es para quien la necesite, no
         una invitación a rehacer la conexión a la primera de cambio. */
      '.nrm-flojo{margin-top:14px;font-size:12.5px;opacity:.6;line-height:1.45}',
      /* Solo cambia de tamaño: el color es el mismo que el de conectar, para
         que las dos hojas se lean como el mismo sitio. */
      '.nrm-copiar.nrm-grande{padding:14px 26px;font-size:15px;font-weight:500;',
      'text-decoration:none}',
      '.nrm-cargando{grid-column:1/-1;padding:34px;text-align:center;font-size:13px;opacity:.5}',
      /* La misma nota, pero al final de una lista ya poblada: ahí 34px de aire
         empujan las fichas fuera de la vista. */
      '.nrm-cargando.nrm-mas{padding:14px 12px}',

      '@media(prefers-color-scheme:dark){',
      '.nrm-caja{background:#12151C;color:#EDF0F6}',
      '.nrm-ico{background:rgba(255,255,255,.07)}.nrm-ico:hover{background:rgba(255,255,255,.13)}',
      '.nrm-buscar{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.12)}',
      '.nrm-av{background:rgba(255,255,255,.08)}',
      '.nrm-w i{box-shadow:0 0 0 2px #12151C}',
      '.nrm-copiar{border-color:rgba(255,255,255,.16)}}'
    ].join('');
    document.head.appendChild(e);
  }

  function icono(d) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '15'); svg.setAttribute('height', '15');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    return svg;
  }

  function cerrar() {
    if (!hoja) return;
    var h = hoja; hoja = null;
    h.classList.remove('on');
    setTimeout(function () { if (h.parentNode) h.remove(); }, 200);
  }

  function avatar(w) {
    if (w.logo) {
      var img = document.createElement('img');
      img.className = 'nrm-av'; img.alt = ''; img.loading = 'lazy'; img.src = w.logo;
      img.addEventListener('error', function () {
        /* Si el tamaño grande no estuviera servido, se prueba el mediano antes
           de rendirse: quedarse sin logo es peor que tenerlo un poco blando. */
        if (img.src.indexOf('/logo/lg/') > 0) {
          img.src = img.src.replace('/logo/lg/', '/logo/md/');
          return;
        }
        if (img.parentNode) img.parentNode.replaceChild(monograma(w), img);
      });
      return img;
    }
    return monograma(w);
  }
  function monograma(w) {
    var d = document.createElement('div');
    d.className = 'nrm-av';
    d.style.background = tono(w.nombre);
    d.textContent = w.nombre.charAt(0).toUpperCase();
    return d;
  }

  function ficha(w, instalada) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'nrm-w';
    b.appendChild(avatar(w));
    var n = document.createElement('b');
    n.textContent = w.nombre;
    b.appendChild(n);
    if (instalada) {
      b.title = w.nombre + ' — installed';
      b.appendChild(document.createElement('i'));
    }
    b.addEventListener('click', function () { elegir(w); });
    return b;
  }

  function pintarLista(filtro) {
    if (!rejilla) return;
    var f = (filtro || '').trim().toLowerCase();
    var mias = listaCarteras().map(function (w) {
      return { nombre: w.nombre, logo: w.icono, prov: w.prov };
    });
    var nombres = {};
    mias.forEach(function (w) { nombres[w.nombre.toLowerCase()] = true; });
    var otras = (registro || []).filter(function (w) {
      return !nombres[w.nombre.toLowerCase()];
    });
    var todas = mias.concat(otras).filter(function (w) {
      return !f || w.nombre.toLowerCase().indexOf(f) >= 0;
    });

    rejilla.textContent = '';
    if (!todas.length) {
      var v = document.createElement('div');
      v.className = registro ? 'nrm-vacia' : 'nrm-cargando';
      v.textContent = registro ? 'No wallet with that name.' : 'Loading wallets…';
      rejilla.appendChild(v);
      return;
    }
    todas.forEach(function (w) { rejilla.appendChild(ficha(w, !!w.prov)); });
    /* Mientras el registro viaja solo están las extensiones detectadas: una o
       dos fichas. Sin avisar de que faltan, la lista parece la lista entera y
       corta, cuando lo que pasa es que aún no ha llegado. */
    if (!registro) {
      var mas = document.createElement('div');
      mas.className = 'nrm-cargando nrm-mas';
      mas.textContent = 'Loading more wallets…';
      rejilla.appendChild(mas);
    }
  }

  function verLista() {
    vistaQR.hidden = true;
    buscador.hidden = false;
    rejilla.hidden = false;
    atras.hidden = true;
    titulo.textContent = 'Connect a wallet';
    /* Elegir una cartera vacía la rejilla para poner el "Opening…", así que al
       volver hay que repintarla: sin esto la flecha atrás lleva a una lista en
       blanco y no hay forma de salir salvo cerrando. */
    pintarLista(buscador.value);
  }

  function verQR(w, uri) {
    titulo.textContent = w.nombre;
    atras.hidden = false;
    buscador.hidden = true;
    rejilla.hidden = true;
    vistaQR.hidden = false;
    vistaQR.textContent = '';

    var caraQ = avatar(w);
    caraQ.classList.add('nrm-grandota');
    vistaQR.appendChild(caraQ);

    var marco = document.createElement('div');
    marco.className = 'marco';
    try {
      var q = window.qrcode(0, 'M');
      q.addData(uri);
      q.make();
      marco.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
      var svg = marco.querySelector('svg');
      if (svg) { svg.setAttribute('shape-rendering', 'crispEdges'); }
    } catch (e) {
      marco.textContent = '';
    }
    vistaQR.appendChild(marco);

    var p = document.createElement('p');
    p.textContent = 'Scan with ' + w.nombre + ', or copy the link and paste it in the app.';
    vistaQR.appendChild(p);

    vistaQR.appendChild(botonCopiar(uri));
  }

  function botonCopiar(uri) {
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'nrm-copiar'; c.textContent = 'Copy link';
    c.addEventListener('click', function () {
      var hecho = function () {
        c.textContent = 'Copied';
        setTimeout(function () { c.textContent = 'Copy link'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(uri).then(hecho, function () {});
      } else {
        /* Safari viejo y cualquier navegador servido sin https no tienen
           clipboard: el textarea de toda la vida sigue funcionando. */
        var t = document.createElement('textarea');
        t.value = uri;
        t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;top:-1000px';
        document.body.appendChild(t);
        t.select(); t.setSelectionRange(0, t.value.length);
        try { document.execCommand('copy'); hecho(); } catch (e) {}
        t.remove();
      }
    });
    return c;
  }

  function abrirCarteras() {
    estilos();
    cerrar();

    hoja = document.createElement('div');
    hoja.className = 'nrm-fondo';
    hoja.setAttribute('role', 'dialog');
    hoja.setAttribute('aria-modal', 'true');
    hoja.setAttribute('aria-label', 'Connect a wallet');

    var caja = document.createElement('div');
    caja.className = 'nrm-caja';

    var cab = document.createElement('div');
    cab.className = 'nrm-cab';
    atras = document.createElement('button');
    atras.type = 'button'; atras.className = 'nrm-ico';
    /* Dibujados, no escritos. `←` y `✕` son caracteres que muchas tipografías
       no traen —Switzer entre ellas— y entonces no se pinta nada: un botón
       invisible que el visitante no sabe que puede pulsar. */
    atras.appendChild(icono('M10 3 5 8l5 5'));
    atras.setAttribute('aria-label', 'Back');
    atras.hidden = true;
    atras.addEventListener('click', verLista);
    titulo = document.createElement('h3');
    titulo.textContent = 'Connect a wallet';
    var equis = document.createElement('button');
    equis.type = 'button'; equis.className = 'nrm-ico';
    equis.appendChild(icono('M4 4l8 8M12 4l-8 8'));
    equis.setAttribute('aria-label', 'Close');
    equis.addEventListener('click', cerrar);
    cab.appendChild(atras); cab.appendChild(titulo); cab.appendChild(equis);

    buscador = document.createElement('input');
    buscador.className = 'nrm-buscar';
    buscador.type = 'search';
    buscador.placeholder = 'Search wallet';
    buscador.setAttribute('aria-label', 'Search wallet');
    buscador.addEventListener('input', function () { pintarLista(buscador.value); });

    rejilla = document.createElement('div');
    rejilla.className = 'nrm-rej';

    vistaQR = document.createElement('div');
    vistaQR.className = 'nrm-qr';
    vistaQR.hidden = true;

    caja.appendChild(cab); caja.appendChild(buscador);
    caja.appendChild(rejilla); caja.appendChild(vistaQR);
    hoja.appendChild(caja);
    hoja.addEventListener('click', function (e) { if (e.target === hoja) cerrar(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key !== 'Escape') return;
      document.removeEventListener('keydown', esc);
      cerrar();
    });
    document.body.appendChild(hoja);
    requestAnimationFrame(function () { if (hoja) hoja.classList.add('on'); });

    pintarLista('');
    traerRegistro().then(function () { if (hoja) pintarLista(buscador.value); });
    /* Se pide ya, para que al elegir una cartera el salto a su app caiga dentro
       del mismo toque. Si falla, se calla hasta que alguien la elija. */
    arrancarWC();
    /* El QR tarda en hacer falta y son 55 KB: se trae mientras el visitante
       mira la lista, para que al elegir ya esté. */
    if (!MOVIL) cargarScript('assets/qr.js', 'QR').catch(function () {});
  }

  /* ─────────────────────────── elegir una cartera ─────────────────────────── */

  function tras(p) {
    return p.then(function () { return refrescar(); })
      .then(function () { cerrar(); libre(); pintar(); })
      .catch(function (e) { cerrar(); libre(); aviso(motivo(e), true); });
  }

  /* La URI de emparejamiento no es de ninguna cartera en concreto: sirve para
     cualquiera. Por eso se pide una sola vez y se reutiliza si el visitante
     vuelve atrás y elige otra, en vez de abrir una conexión nueva por cada
     nombre que toque. */
  /* La URI de emparejamiento no es de ninguna cartera en concreto: sirve para
     cualquiera. Se pide en cuanto se abre el selector, y no al elegir una.

     El motivo es Chrome en Android. Saltar a `trust://…` solo funciona dentro
     del gesto del usuario; si la navegación ocurre en una respuesta asíncrona
     —que es lo que pasaba: se pulsaba, se pedía la URI, y se saltaba cuando
     llegaba— el navegador ya no la considera provocada por nadie y la bloquea
     sin decir nada. Teniendo la URI de antes, el salto ocurre dentro del mismo
     toque y el gesto sigue vivo. */
  var wcUri = null, wcEstado = 'nada', wcFallo = null, wcEspera = null;

  function arrancarWC() {
    if (!PROYECTO_WC || wcEstado === 'pidiendo' || wcEstado === 'lista') return;
    wcEstado = 'pidiendo';
    iniciarWC().then(function (prov) {
      prov.on('display_uri', function (uri) {
        wcUri = uri; wcEstado = 'lista';
        if (wcEspera) { var w = wcEspera; wcEspera = null; mostrarWC(w, uri, false); }
      });
      return prov.connect().then(function () { return enchufar(prov, nombreWC(prov)); });
    }).then(function () { return refrescar(); })
      .then(function () { cerrar(); libre(); pintar(); })
      .catch(function (e) {
        wcEstado = 'fallo'; wcFallo = e; wcUri = null; wcProv = null;
        /* Si nadie está esperando, el fallo se calla: puede que el visitante
           solo quisiera su extensión y no le sirve de nada un error de un
           servicio que no ha pedido. */
        if (wcEspera) { wcEspera = null; cerrar(); libre(); aviso(motivo(e), true); }
      });
  }

  function mostrarWC(w, uri, gesto) {
    if (!hoja) return;
    titulo.textContent = w.nombre;
    atras.hidden = false;
    buscador.hidden = true;
    if (MOVIL) {
      var destino = enlaceApp(w, uri);
      rejilla.hidden = true;
      vistaQR.hidden = false;
      vistaQR.textContent = '';
      var caraM = avatar(w);
      caraM.classList.add('nrm-grandota');
      vistaQR.appendChild(caraM);
      var p = document.createElement('p');
      p.textContent = 'Confirm the connection in ' + w.nombre +
        '. If it did not open, tap below or copy the link into the app.';
      vistaQR.appendChild(p);
      /* Un enlace de verdad y no un botón con JavaScript: pulsar un <a> es una
         navegación provocada por el usuario, y eso los navegadores no lo
         bloquean aunque el esquema sea propio de una app. */
      var abrir = document.createElement('a');
      abrir.className = 'nrm-copiar';
      abrir.href = destino;
      abrir.rel = 'noopener';
      abrir.textContent = 'Open ' + w.nombre;
      vistaQR.appendChild(abrir);
      vistaQR.appendChild(botonCopiar(uri));
      /* Solo se salta solo si esto viene del toque: fuera de él no llegaría. */
      if (gesto) window.location.href = destino;
      return;
    }
    cargarScript('assets/qr.js', 'QR')
      .then(function () { if (hoja) verQR(w, uri); })
      .catch(function () { if (hoja) verQR(w, uri); });
  }

  function nota_(txt) {
    var d = document.createElement('div');
    d.className = 'nrm-cargando';
    d.textContent = txt;
    return d;
  }

  function esperandoA(nombre) {
    if (!hoja) return;
    titulo.textContent = nombre;
    atras.hidden = false;
    buscador.hidden = true;
    rejilla.textContent = '';
    rejilla.appendChild(nota_('Confirm the connection in ' + nombre + '…'));
  }

  function elegir(w) {
    if (w.prov) {                      /* extensión o navegador de cartera */
      trabajando('Confirm in your wallet…');
      esperandoA(w.nombre);
      return tras(enchufar(w.prov, w.nombre));
    }
    if (!PROYECTO_WC) {
      cerrar();
      aviso('Open nereum.xyz inside your wallet app to connect.', true);
      return;
    }
    if (wcEstado === 'fallo') {
      cerrar();
      aviso(motivo(wcFallo), true);
      return;
    }
    carteraElegida = w;
    /* Con la URI ya pedida, el salto ocurre aquí mismo, dentro del toque. */
    if (wcUri) return mostrarWC(w, wcUri, true);

    titulo.textContent = w.nombre;
    atras.hidden = false;
    buscador.hidden = true;
    rejilla.textContent = '';
    rejilla.appendChild(nota_('Opening ' + w.nombre + '…'));
    wcEspera = w;
    arrancarWC();
  }

  /* ─────────────────────────────── arranque ──────────────────────────────── */

  chips.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { ponerUsd(+b.dataset.v); });
  });
  range.addEventListener('input', function () { ponerUsd(deBarra(+range.value)); });
  usdIn.addEventListener('input', function () { pago = aUnidades(usdIn.value, decimales()); pintar(true); });
  usdIn.addEventListener('blur',  function () { pago = aUnidades(usdIn.value, decimales()); pintar(false); });

  ponerMonedas();
  pintar(false);

  /* Antes de nada: ¿veníamos ya conectados? En el móvil esto es lo normal, no
     la excepción, porque volver de la cartera recarga la pestaña. */
  reanudar().then(function (si) {
    if (si) return refrescar().then(function () { pintar(); });
  });

  leerTodo().then(function () {
    /* El primer chip de la maqueta era "$1"; el contrato admite desde $0,20. */
    var primero = chips.querySelector('button');
    if (primero && minUsd() < 1) {
      primero.dataset.v = String(minUsd());
      primero.textContent = dinero(minUsd(), 2);
    }
    range.min = String(Math.log10(minUsd()));
    range.max = String(Math.log10(maxUsd()));

    /* El pie de la barra anuncia el mínimo de compra. La maqueta decía $1 y el
       contrato acepta desde $0,20: dejarlo mal solo sirve para que alguien
       intente comprar $0,50 y no lo haga. La recaudación de la barra no se
       toca, es de la ronda privada y no vive en la cadena. */
    var pie = document.querySelector('#presale .raise-foot');
    if (pie) {
      var ss = pie.querySelectorAll('span');
      if (ss[0]) ss[0].textContent = 'Minimum ' + dinero(minUsd(), minUsd() < 1 ? 2 : 0);
      if (ss[1]) ss[1].textContent = 'Maximum ' + dinero(maxUsd()) + ' per wallet';
    }
    pintar(false);
  });

  /* Refresco mientras la sección está a la vista. Fuera de ella no se pide nada:
     son dos redes por vuelta y la página no tiene por qué sonar a minero. */
  var seccion = document.getElementById('presale');
  if (seccion && 'IntersectionObserver' in window) {
    var reloj = null;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !reloj) {
          reloj = setInterval(function () { refrescar().then(function () { pintar(false); }); }, 30000);
        } else if (!e.isIntersecting && reloj) {
          clearInterval(reloj); reloj = null;
        }
      });
    }, { threshold: 0 }).observe(seccion);
  }

  window.__nereum = { estado: estado, sesion: function () { return sesion; }, leer: leerTodo };
})();
