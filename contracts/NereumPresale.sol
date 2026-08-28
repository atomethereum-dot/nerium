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
 * @title  Preventa de Nereum
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
 *         LA VENTA NO SE PARA NUNCA. Si el oráculo revierte, devuelve cero o se
 *         queda atascado, se cobra con un precio de respaldo que fija el
 *         proyecto. El contrato nunca deja de vender por culpa del oráculo.
 *
 *         La compra anota lo que corresponde a cada dirección; el reparto se
 *         abre cuando la preventa ha terminado y el token está depositado.
 */
contract NereumPresale is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @dev Todos los importes en dólares llevan 8 decimales, que es la escala
    ///      en la que Chainlink publica ETH/USD y BNB/USD.
    uint256 private constant USD = 1e8;

    // ─────────────────────────── configuración fija ───────────────────────────

    /// @notice USDT de la red. En Ethereum no devuelve bool en transfer, por eso
    ///         todo el contrato usa SafeERC20.
    IERC20 public immutable usdt;

    /// @notice Oráculo de la moneda nativa contra el dólar.
    ///         Ethereum ETH/USD:  0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
    ///         BNB Chain BNB/USD: 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE
    AggregatorV3Interface public immutable nativeUsdFeed;

    uint8 public immutable saleTokenDecimals;

    uint256 private immutable _unit;      // 10**decimales del token en venta
    uint256 private immutable _usdtUnit;  // 10**decimales de USDT
    uint256 private immutable _feedUnit;  // 10**decimales del oráculo

    // ─────────────────────────────── estado ───────────────────────────────────

    /// @notice Precio de UN token entero en dólares, con 8 decimales.
    ///         0,10 $ se escribe 10000000.
    uint256 public priceUsd;

    /// @notice Compra mínima en dólares, 8 decimales. 1 $ se escribe 100000000.
    uint256 public minBuyUsd;

    /// @notice A partir de esta antigüedad el precio del oráculo se considera
    ///         inservible y se pasa al de respaldo. No detiene la venta.
    uint256 public maxPriceAge = 24 hours;

    /// @notice Precio de respaldo de la moneda nativa en dólares, 8 decimales.
    ///         LA VENTA NO SE PARA NUNCA: si el oráculo revierte, devuelve cero o
    ///         se queda atascado, se cobra con este número. Es obligatorio tenerlo
    ///         puesto antes de abrir, porque sin él la caída del oráculo sí pararía
    ///         las compras en ETH o BNB.
    ///         Mantenlo al día: mientras el oráculo esté caído, este es EL precio.
    uint256 public fallbackNativeUsd;

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

    event PresaleScheduled(uint64 startTime, uint64 endTime);
    event PresaleEnded(uint64 endedAt);
    event PriceUsdUpdated(uint256 priceUsd);
    event MinBuyUsdUpdated(uint256 minBuyUsd);
    event MaxPriceAgeUpdated(uint256 seconds_);
    event FallbackNativeUsdUpdated(uint256 price);
    /// @notice Salta cada vez que una compra se cobra sin el oráculo. Vigílalo:
    ///         significa que el precio lo estás poniendo tú a mano.
    event FallbackPriceUsed(uint256 price);
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

    error PresaleNotLive();
    error PresaleNotOver();
    error PresaleAlreadyFinalized();
    error PresaleAlreadyScheduled();
    error BadWindow();
    error PriceNotSet();
    error BelowMinimum(uint256 usdValue, uint256 minimum);
    error HardCapReached();
    error SlippageTooHigh(uint256 got, uint256 min);
    error NoPriceAvailable();
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
     * @param feed_    Oráculo ETH/USD o BNB/USD de Chainlink.
     * @param owner_   Quien administra. Usa un multisig.
     */
    constructor(
        IERC20 usdt_,
        AggregatorV3Interface feed_,
        uint8 saleTokenDecimals_,
        address owner_
    ) Ownable(owner_) {
        if (address(usdt_) == address(0) || address(feed_) == address(0) || owner_ == address(0)) {
            revert ZeroAddress();
        }
        usdt = usdt_;
        nativeUsdFeed = feed_;
        saleTokenDecimals = saleTokenDecimals_;
        _unit = 10 ** saleTokenDecimals_;
        _usdtUnit = 10 ** IERC20Metadata(address(usdt_)).decimals();
        _feedUnit = 10 ** feed_.decimals();
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

    /// @notice Precio de respaldo de ETH o BNB en dólares, 8 decimales.
    ///         3.000 $ se escribe 300000000000.
    function setFallbackNativeUsd(uint256 price) external onlyOwner {
        if (price == 0) revert PriceNotSet();
        fallbackNativeUsd = price;
        emit FallbackNativeUsdUpdated(price);
    }

    function startPresale(uint64 start, uint64 end) external onlyOwner {
        if (finalized) revert PresaleAlreadyFinalized();
        if (startTime != 0) revert PresaleAlreadyScheduled();
        if (priceUsd == 0 || fallbackNativeUsd == 0) revert PriceNotSet();

        uint64 s = start == 0 ? uint64(block.timestamp) : start;
        if (end <= s) revert BadWindow();

        startTime = s;
        endTime = end;
        emit PresaleScheduled(s, end);
    }

    /// @notice Cierra la preventa ya. No tiene vuelta atrás.
    function endPresale() external onlyOwner {
        if (finalized) revert PresaleAlreadyFinalized();
        finalized = true;
        endTime = uint64(block.timestamp);
        emit PresaleEnded(uint64(block.timestamp));
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
     * @notice Cuánto vale una unidad de la moneda nativa en dólares, 8 decimales.
     * @return price      La cotización que se va a usar.
     * @return fromOracle Si salió del oráculo. Falso significa que se usó el
     *                    respaldo porque el oráculo no servía.
     *
     * La llamada va en try/catch a propósito: si el oráculo revierte —porque lo
     * pausan, lo migran o lo retiran— la compra NO se cae con él. Se cobra con el
     * respaldo y la venta sigue.
     */
    function nativeUsdPrice() public view returns (uint256 price, bool fromOracle) {
        try nativeUsdFeed.latestRoundData() returns (
            uint80, int256 answer, uint256, uint256 updatedAt, uint80
        ) {
            if (answer > 0 && updatedAt != 0 && block.timestamp - updatedAt <= maxPriceAge) {
                return ((uint256(answer) * USD) / _feedUnit, true);
            }
        } catch {}

        if (fallbackNativeUsd == 0) revert NoPriceAvailable();
        return (fallbackNativeUsd, false);
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
        (uint256 nativeUsd, bool fromOracle) = nativeUsdPrice();
        if (!fromOracle) emit FallbackPriceUsed(nativeUsd);

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
        if (finalized) revert PresaleNotLive();
        if (startTime == 0 || block.timestamp < startTime || block.timestamp >= endTime) {
            revert PresaleNotLive();
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
     * @notice Abre el reparto. Exige dos cosas: que la preventa haya TERMINADO
     *         —por fecha o porque se cerró a mano— y que el contrato ya tenga
     *         depositado todo lo vendido, para que nadie reclame contra un saldo
     *         insuficiente y deje sin nada al que llegue último.
     */
    function openClaims() external onlyOwner {
        if (!isOver()) revert PresaleNotOver();
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

    /// @notice La preventa ha terminado: se cerró a mano o pasó la fecha.
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
