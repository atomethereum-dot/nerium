// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @notice Lo mínimo de un oráculo de Chainlink. Se declara aquí en vez de traer
///         el paquete entero: son cuatro líneas y deja el contrato sin más
///         dependencias que OpenZeppelin, que es una cosa menos que auditar.
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    );
}

/**
 * @title  Ronda de financiación de Nereum
 * @notice Se paga en la moneda nativa de la cadena (ETH en Ethereum, BNB en BNB
 *         Chain) o en USDT. El mismo código sirve en las dos redes.
 *
 *         EL PRECIO SE FIJA EN DÓLARES, UNO SOLO. El contrato pregunta a
 *         Chainlink cuánto vale ETH o BNB en cada compra, así que 0,10 $ siguen
 *         siendo 0,10 $ aunque la moneda se mueva. Y como el precio vive en
 *         dólares y no en unidades de cada moneda, el mismo número vale para
 *         Ethereum y para BNB Chain: se acabó el riesgo de confundir los 6
 *         decimales de USDT en Ethereum con los 18 de BNB Chain.
 *
 *         LA VENTA NO SE PARA NUNCA, Y SIN QUE NADIE TENGA QUE INTERVENIR. El
 *         precio no depende de un oráculo sino de VARIOS, en orden de
 *         preferencia: se pregunta al primero y, si no responde o responde algo
 *         inservible, se pasa al siguiente. Que caigan todos a la vez es
 *         prácticamente imposible, pero incluso entonces se cobra con el último
 *         precio bueno que el propio contrato guardó, y la venta continúa.
 *
 *         La compra anota lo que corresponde a cada dirección; el reparto se
 *         abre cuando la ronda ha terminado y el token está depositado.
 */
contract NereumFundingRound is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @dev Todos los importes en dólares llevan 8 decimales, que es la escala
    ///      en la que Chainlink publica ETH/USD y BNB/USD.
    uint256 private constant USD = 1e8;

    // ─────────────────────────── configuración fija ───────────────────────────

    /// @notice USDT de la red. En Ethereum no devuelve bool en transfer, por eso
    ///         todo el contrato usa SafeERC20.
    IERC20 public immutable usdt;

    uint8 public immutable saleTokenDecimals;

    uint256 private immutable _unit;      // 10**decimales del token en venta
    uint256 private immutable _usdtUnit;  // 10**decimales de USDT

    // ─────────────────────────────── estado ───────────────────────────────────

    /// @notice Precio de UN token entero en dólares, con 8 decimales.
    ///         0,10 $ se escribe 10000000.
    uint256 public priceUsd;

    /// @notice Compra mínima en dólares, 8 decimales. 1 $ se escribe 100000000.
    uint256 public minBuyUsd;

    /// @notice Un oráculo y sus decimales, que se leen una vez y se guardan para
    ///         no gastar una llamada extra en cada compra.
    struct Feed { AggregatorV3Interface oracle; uint256 unit; }

    /// @notice Los oráculos, EN ORDEN DE PREFERENCIA. Se usa el primero que
    ///         responda algo válido. Cualquier proveedor que exponga la interfaz
    ///         de Chainlink sirve: la propia Chainlink, API3, RedStone, Pyth o
    ///         Band a través de sus adaptadores.
    Feed[] public feeds;

    /// @notice A partir de esta antigüedad la respuesta de un oráculo se descarta
    ///         y se prueba el siguiente.
    uint256 public maxPriceAge = 24 hours;

    /// @notice El último precio bueno que se leyó, y cuándo. Lo guarda el propio
    ///         contrato en cada compra: es la red de seguridad para el caso, casi
    ///         imposible, de que TODOS los oráculos fallen a la vez. Nadie tiene
    ///         que ponerlo a mano.
    uint256 public lastGoodPrice;
    uint64 public lastGoodAt;

    uint64 public startTime;
    uint64 public endTime;
    bool public finalized;

    uint256 public hardCapTokens;
    uint256 public totalTokensSold;
    uint256 public totalTokensClaimed;
    uint256 public totalRaisedNative;
    uint256 public totalRaisedUsdt;

    IERC20 public saleToken;
    bool public claimOpen;

    mapping(address => uint256) public allocation;
    mapping(address => uint256) public claimed;

    // ─────────────────────────────── eventos ──────────────────────────────────

    event RoundScheduled(uint64 startTime, uint64 endTime);
    event RoundEnded(uint64 endedAt);
    event PriceUsdUpdated(uint256 priceUsd);
    event MinBuyUsdUpdated(uint256 minBuyUsd);
    event MaxPriceAgeUpdated(uint256 seconds_);
    event FeedsUpdated(uint256 count);
    /// @notice El oráculo preferido no respondió y se usó otro de la lista.
    event OracleFellBack(uint256 indexed usedIndex, uint256 price);
    /// @notice Ninguno respondió y se cobró con el último precio guardado. Es el
    ///         único caso que merece una alerta.
    event AllOraclesDown(uint256 cachedPrice, uint64 cachedAt);
    event HardCapUpdated(uint256 hardCapTokens);
    event Purchased(address indexed buyer, bool paidInUsdt, uint256 paid, uint256 usdValue, uint256 tokens);
    event SaleTokenSet(address indexed token);
    event ClaimsOpened();
    event Claimed(address indexed buyer, uint256 tokens);
    event NativeWithdrawn(address indexed to, uint256 amount);
    event UsdtWithdrawn(address indexed to, uint256 amount);
    event UnsoldTokensWithdrawn(address indexed to, uint256 amount);
    event ForeignTokenRescued(address indexed token, address indexed to, uint256 amount);

    // ─────────────────────────────── errores ──────────────────────────────────

    error RoundNotLive();
    error RoundNotOver();
    error RoundAlreadyFinalized();
    error RoundAlreadyScheduled();
    error BadWindow();
    error PriceNotSet();
    error BelowMinimum(uint256 usdValue, uint256 minimum);
    error HardCapReached();
    error SlippageTooHigh(uint256 got, uint256 min);
    error NoPriceAvailable();
    error NoFeeds();
    error ClaimsNotOpen();
    error NothingToClaim();
    error SaleTokenAlreadySet();
    error SaleTokenNotSet();
    error WrongTokenDecimals(uint8 got, uint8 expected);
    error NotEnoughTokensDeposited(uint256 have, uint256 need);
    error CannotTouchBuyersTokens();
    error ZeroAddress();
    error NativeTransferFailed();
    error UseBuyFunction();

    // ───────────────────────────── constructor ────────────────────────────────

    /**
     * @param usdt_    USDT de la red.
     *                 Ethereum:  0xdAC17F958D2ee523a2206206994597C13D831ec7
     *                 BNB Chain: 0x55d398326f99059fF775485246999027B3197955
     * @param feeds_   Oráculos ETH/USD o BNB/USD, EN ORDEN DE PREFERENCIA.
     *                  Pon al menos dos de proveedores distintos.
     * @param owner_   Quien administra. Usa un multisig.
     */
    constructor(
        IERC20 usdt_,
        AggregatorV3Interface[] memory feeds_,
        uint8 saleTokenDecimals_,
        address owner_
    ) Ownable(owner_) {
        if (address(usdt_) == address(0) || owner_ == address(0)) revert ZeroAddress();
        usdt = usdt_;
        saleTokenDecimals = saleTokenDecimals_;
        _unit = 10 ** saleTokenDecimals_;
        _usdtUnit = 10 ** IERC20Metadata(address(usdt_)).decimals();
        _setFeeds(feeds_);
    }

    // ──────────────────────────── administración ──────────────────────────────

    /// @notice Precio de un token en dólares, 8 decimales. 0,10 $ = 10000000.
    function setPriceUsd(uint256 price) external onlyOwner {
        if (price == 0) revert PriceNotSet();
        priceUsd = price;
        emit PriceUsdUpdated(price);
    }

    /// @notice Compra mínima en dólares, 8 decimales. 1 $ = 100000000.
    function setMinBuyUsd(uint256 min) external onlyOwner {
        minBuyUsd = min;
        emit MinBuyUsdUpdated(min);
    }

    /// @notice Antigüedad a partir de la cual se usa el precio de respaldo.
    function setMaxPriceAge(uint256 seconds_) external onlyOwner {
        if (seconds_ == 0) revert PriceNotSet();
        maxPriceAge = seconds_;
        emit MaxPriceAgeUpdated(seconds_);
    }

    /// @notice Reemplaza la lista de oráculos, en orden de preferencia. Exige que
    ///         al menos uno responda ahora mismo: una lista de oráculos muertos
    ///         dejaría la venta colgando del precio guardado.
    function setFeeds(AggregatorV3Interface[] calldata list) external onlyOwner {
        _setFeeds(list);
    }

    function _setFeeds(AggregatorV3Interface[] memory list) private {
        if (list.length == 0) revert NoFeeds();
        delete feeds;
        for (uint256 i; i < list.length; ++i) {
            if (address(list[i]) == address(0)) revert ZeroAddress();
            feeds.push(Feed({oracle: list[i], unit: 10 ** list[i].decimals()}));
        }
        (uint256 price, bool ok, ) = _readOracles();
        if (!ok) revert NoPriceAvailable();
        lastGoodPrice = price;
        lastGoodAt = uint64(block.timestamp);
        emit FeedsUpdated(list.length);
    }

    function feedCount() external view returns (uint256) { return feeds.length; }

    function startRound(uint64 start, uint64 end) external onlyOwner {
        if (finalized) revert RoundAlreadyFinalized();
        if (startTime != 0) revert RoundAlreadyScheduled();
        if (priceUsd == 0) revert PriceNotSet();

        uint64 s = start == 0 ? uint64(block.timestamp) : start;
        if (end <= s) revert BadWindow();

        startTime = s;
        endTime = end;
        emit RoundScheduled(s, end);
    }

    /// @notice Cierra la ronda ya. No tiene vuelta atrás.
    function endRound() external onlyOwner {
        if (finalized) revert RoundAlreadyFinalized();
        finalized = true;
        endTime = uint64(block.timestamp);
        emit RoundEnded(uint64(block.timestamp));
    }

    function setHardCap(uint256 tokens) external onlyOwner {
        if (tokens != 0 && tokens < totalTokensSold) revert HardCapReached();
        hardCapTokens = tokens;
        emit HardCapUpdated(tokens);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─────────────────────────────── oráculo ──────────────────────────────────

    /**
     * @dev Recorre los oráculos por orden y devuelve el primero que responda algo
     *      válido. Cada llamada va en try/catch: un oráculo pausado, migrado o
     *      retirado revierte, y aquí eso solo significa "pasa al siguiente", no
     *      que se caiga la compra.
     */
    function _readOracles() private view returns (uint256 price, bool ok, uint256 index) {
        uint256 n = feeds.length;
        for (uint256 i; i < n; ++i) {
            Feed storage f = feeds[i];
            try f.oracle.latestRoundData() returns (
                uint80, int256 answer, uint256, uint256 updatedAt, uint80
            ) {
                if (answer > 0 && updatedAt != 0 && block.timestamp - updatedAt <= maxPriceAge) {
                    return ((uint256(answer) * USD) / f.unit, true, i);
                }
            } catch {}
        }
        return (0, false, type(uint256).max);
    }

    /**
     * @notice Cuánto vale una unidad de la moneda nativa en dólares, 8 decimales.
     * @return price La cotización que se va a usar.
     * @return live  Si salió de un oráculo vivo. Falso significa que ninguno
     *               respondió y se está usando el último precio guardado.
     */
    function nativeUsdPrice() public view returns (uint256 price, bool live) {
        (uint256 p, bool ok, ) = _readOracles();
        if (ok) return (p, true);
        if (lastGoodPrice == 0) revert NoPriceAvailable();
        return (lastGoodPrice, false);
    }

    /**
     * @notice Estado de cada oráculo, para vigilarlos desde fuera sin adivinar.
     *         Un `false` en `healthy` dice exactamente cuál está fallando.
     */
    function feedsStatus() external view returns (
        address[] memory oracles, uint256[] memory prices, bool[] memory healthy
    ) {
        uint256 n = feeds.length;
        oracles = new address[](n);
        prices = new uint256[](n);
        healthy = new bool[](n);
        for (uint256 i; i < n; ++i) {
            Feed storage f = feeds[i];
            oracles[i] = address(f.oracle);
            try f.oracle.latestRoundData() returns (
                uint80, int256 answer, uint256, uint256 updatedAt, uint80
            ) {
                if (answer > 0 && updatedAt != 0 && block.timestamp - updatedAt <= maxPriceAge) {
                    prices[i] = (uint256(answer) * USD) / f.unit;
                    healthy[i] = true;
                }
            } catch {}
        }
    }

    // ─────────────────────────────── compra ───────────────────────────────────

    /**
     * @param minTokensOut Mínimo que el comprador acepta recibir. Es su protección
     *                     frente a un movimiento del oráculo o un cambio de precio
     *                     entre que ve la cotización y se mina su transacción.
     */
    function buyWithNative(uint256 minTokensOut)
        external payable nonReentrant whenNotPaused returns (uint256 tokens)
    {
        _requireLive();

        /* Se lee aquí y no en la vista porque esta sí puede escribir: cada compra
           con un oráculo sano deja guardado su precio, que es lo que sostiene la
           venta si algún día caen todos. */
        (uint256 nativeUsd, bool ok, uint256 idx) = _readOracles();
        if (ok) {
            lastGoodPrice = nativeUsd;
            lastGoodAt = uint64(block.timestamp);
            if (idx != 0) emit OracleFellBack(idx, nativeUsd);
        } else {
            nativeUsd = lastGoodPrice;
            if (nativeUsd == 0) revert NoPriceAvailable();
            emit AllOraclesDown(nativeUsd, lastGoodAt);
        }

        uint256 usdValue = (msg.value * nativeUsd) / 1e18;
        tokens = _record(msg.sender, usdValue, minTokensOut);

        totalRaisedNative += msg.value;
        emit Purchased(msg.sender, false, msg.value, usdValue, tokens);
    }

    function buyWithUsdt(uint256 amount, uint256 minTokensOut)
        external nonReentrant whenNotPaused returns (uint256 tokens)
    {
        _requireLive();

        /* Se mide lo que entra de verdad, por si USDT activase algún día una
           comisión de transferencia: cobrar por el importe pedido regalaría tokens. */
        uint256 before = usdt.balanceOf(address(this));
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = usdt.balanceOf(address(this)) - before;

        /* USDT se toma como un dólar. Es lo que hace todo el mundo, pero conviene
           saberlo: si USDT perdiera la paridad, este contrato no se entera. */
        uint256 usdValue = (received * USD) / _usdtUnit;
        tokens = _record(msg.sender, usdValue, minTokensOut);

        totalRaisedUsdt += received;
        emit Purchased(msg.sender, true, received, usdValue, tokens);
    }

    function _record(address buyer, uint256 usdValue, uint256 minTokensOut)
        private returns (uint256 tokens)
    {
        if (usdValue < minBuyUsd) revert BelowMinimum(usdValue, minBuyUsd);

        tokens = (usdValue * _unit) / priceUsd;
        if (tokens == 0) revert BelowMinimum(usdValue, minBuyUsd);
        if (tokens < minTokensOut) revert SlippageTooHigh(tokens, minTokensOut);

        uint256 sold = totalTokensSold + tokens;
        if (hardCapTokens != 0 && sold > hardCapTokens) revert HardCapReached();

        totalTokensSold = sold;
        allocation[buyer] += tokens;
    }

    function _requireLive() private view {
        if (finalized) revert RoundNotLive();
        if (startTime == 0 || block.timestamp < startTime || block.timestamp >= endTime) {
            revert RoundNotLive();
        }
    }

    /// @notice Un envío directo no lleva protección de precio: se rechaza.
    receive() external payable { revert UseBuyFunction(); }

    // ─────────────────────────────── reparto ──────────────────────────────────

    function setSaleToken(IERC20 token) external onlyOwner {
        if (address(saleToken) != address(0)) revert SaleTokenAlreadySet();
        if (address(token) == address(0)) revert ZeroAddress();

        uint8 d = IERC20Metadata(address(token)).decimals();
        if (d != saleTokenDecimals) revert WrongTokenDecimals(d, saleTokenDecimals);

        saleToken = token;
        emit SaleTokenSet(address(token));
    }

    /**
     * @notice Abre el reparto. Exige dos cosas: que la ronda haya TERMINADO
     *         —por fecha o porque se cerró a mano— y que el contrato ya tenga
     *         depositado todo lo vendido, para que nadie reclame contra un saldo
     *         insuficiente y deje sin nada al que llegue último.
     */
    function openClaims() external onlyOwner {
        if (!isOver()) revert RoundNotOver();
        if (address(saleToken) == address(0)) revert SaleTokenNotSet();

        uint256 need = totalTokensSold - totalTokensClaimed;
        uint256 have = saleToken.balanceOf(address(this));
        if (have < need) revert NotEnoughTokensDeposited(have, need);

        claimOpen = true;
        emit ClaimsOpened();
    }

    function claim() external nonReentrant returns (uint256 amount) {
        if (!claimOpen) revert ClaimsNotOpen();
        amount = allocation[msg.sender] - claimed[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimed[msg.sender] += amount;
        totalTokensClaimed += amount;
        saleToken.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    function claimable(address buyer) external view returns (uint256) {
        return allocation[buyer] - claimed[buyer];
    }

    // ────────────────────────────── retiradas ─────────────────────────────────

    function withdrawNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 value = amount == 0 ? address(this).balance : amount;
        (bool ok, ) = to.call{value: value}("");
        if (!ok) revert NativeTransferFailed();
        emit NativeWithdrawn(to, value);
    }

    function withdrawUsdt(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 value = amount == 0 ? usdt.balanceOf(address(this)) : amount;
        usdt.safeTransfer(to, value);
        emit UsdtWithdrawn(to, value);
    }

    /// @notice Solo el excedente sobre lo que se debe a los compradores.
    function withdrawUnsoldTokens(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (address(saleToken) == address(0)) revert SaleTokenNotSet();

        uint256 owed = totalTokensSold - totalTokensClaimed;
        uint256 balance = saleToken.balanceOf(address(this));
        uint256 free = balance > owed ? balance - owed : 0;
        uint256 value = amount == 0 ? free : amount;
        if (value > free) revert CannotTouchBuyersTokens();

        saleToken.safeTransfer(to, value);
        emit UnsoldTokensWithdrawn(to, value);
    }

    function rescueForeignToken(IERC20 token, address to, uint256 amount)
        external onlyOwner nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        if (token == usdt || token == saleToken) revert CannotTouchBuyersTokens();
        token.safeTransfer(to, amount);
        emit ForeignTokenRescued(address(token), to, amount);
    }

    // ──────────────────────────────── vistas ──────────────────────────────────

    function isLive() public view returns (bool) {
        return !finalized && !paused() && startTime != 0
            && block.timestamp >= startTime && block.timestamp < endTime;
    }

    /// @notice La ronda ha terminado: se cerró a mano o pasó la fecha.
    function isOver() public view returns (bool) {
        return finalized || (startTime != 0 && block.timestamp >= endTime);
    }

    /// @notice Cuántos tokens saldrían por un pago en moneda nativa. Es lo que
    ///         debe llamar la web para calcular el mínimo que enviará el comprador.
    function quoteNative(uint256 amount) external view returns (uint256) {
        if (priceUsd == 0) return 0;
        (uint256 nativeUsd, ) = nativeUsdPrice();
        return (((amount * nativeUsd) / 1e18) * _unit) / priceUsd;
    }

    function quoteUsdt(uint256 amount) external view returns (uint256) {
        if (priceUsd == 0) return 0;
        return (((amount * USD) / _usdtUnit) * _unit) / priceUsd;
    }

    /// @notice Cuánta moneda nativa hay que enviar para un importe en dólares.
    ///         Útil para pintar "0,032 ETH" junto a "100 $" en la web.
    function nativeForUsd(uint256 usdAmount) external view returns (uint256) {
        (uint256 nativeUsd, ) = nativeUsdPrice();
        return (usdAmount * 1e18) / nativeUsd;
    }

    function remainingTokens() external view returns (uint256) {
        if (hardCapTokens == 0) return type(uint256).max;
        return hardCapTokens - totalTokensSold;
    }
}
