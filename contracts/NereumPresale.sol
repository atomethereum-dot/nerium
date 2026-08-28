// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title  Preventa de Nereum
 * @notice Se paga en la moneda nativa de la cadena (ETH en Ethereum, BNB en BNB
 *         Chain) o en USDT. El mismo código sirve en las dos redes: lo único que
 *         cambia es la dirección de USDT y sus decimales, que se pasan al
 *         desplegar.
 *
 *         La compra NO entrega el token en el acto: anota cuánto le corresponde
 *         a cada dirección. El reparto se abre después, cuando el proyecto ha
 *         depositado el token en el contrato. Así la preventa puede arrancar
 *         antes de que el token exista, que es el caso habitual, y nadie compra
 *         contra un contrato vacío.
 */
contract NereumPresale is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─────────────────────────── configuración fija ───────────────────────────

    /// @notice USDT de la red. En Ethereum no devuelve bool en transfer, por eso
    ///         todo el contrato usa SafeERC20 y nunca comprueba el valor devuelto.
    IERC20 public immutable usdt;

    /// @notice Decimales del token que se vende. Se fija al desplegar porque el
    ///         token puede no existir todavía cuando arranca la preventa.
    uint8 public immutable saleTokenDecimals;

    /// @dev 10**saleTokenDecimals. Un "token entero" en unidades mínimas.
    uint256 private immutable _unit;

    // ─────────────────────────────── estado ───────────────────────────────────

    /// @notice Precio de UN token entero, en wei de la moneda nativa.
    uint256 public priceNative;

    /// @notice Precio de UN token entero, en unidades mínimas de USDT.
    ///         Ojo: USDT tiene 6 decimales en Ethereum y 18 en BNB Chain, así que
    ///         el mismo precio en dólares es un número distinto en cada red.
    uint256 public priceUsdt;

    uint64 public startTime;
    uint64 public endTime;

    /// @notice Una vez cerrada, la preventa no se puede reabrir.
    bool public finalized;

    /// @notice Tope de tokens vendibles. Cero significa sin tope.
    uint256 public hardCapTokens;

    /// @notice Compra mínima por operación, en unidades de cada medio de pago.
    uint256 public minBuyNative;
    uint256 public minBuyUsdt;

    uint256 public totalTokensSold;
    uint256 public totalTokensClaimed;
    uint256 public totalRaisedNative;
    uint256 public totalRaisedUsdt;

    /// @notice El token que se entrega. Se fija cuando existe.
    IERC20 public saleToken;

    /// @notice Mientras esté cerrado nadie puede reclamar.
    bool public claimOpen;

    mapping(address => uint256) public allocation;
    mapping(address => uint256) public claimed;

    // ─────────────────────────────── eventos ──────────────────────────────────

    event PresaleScheduled(uint64 startTime, uint64 endTime);
    event PresaleEnded(uint64 endedAt);
    event PricesUpdated(uint256 priceNative, uint256 priceUsdt);
    event HardCapUpdated(uint256 hardCapTokens);
    event MinBuyUpdated(uint256 minBuyNative, uint256 minBuyUsdt);
    event Purchased(address indexed buyer, bool paidInUsdt, uint256 paid, uint256 tokens);
    event SaleTokenSet(address indexed token);
    event ClaimsOpened();
    event Claimed(address indexed buyer, uint256 tokens);
    event NativeWithdrawn(address indexed to, uint256 amount);
    event UsdtWithdrawn(address indexed to, uint256 amount);
    event UnsoldTokensWithdrawn(address indexed to, uint256 amount);
    event ForeignTokenRescued(address indexed token, address indexed to, uint256 amount);

    // ─────────────────────────────── errores ──────────────────────────────────

    error PresaleNotLive();
    error PresaleAlreadyFinalized();
    error PresaleAlreadyScheduled();
    error BadWindow();
    error PriceNotSet();
    error AmountTooSmall();
    error HardCapReached();
    error SlippageTooHigh(uint256 got, uint256 min);
    error ClaimsNotOpen();
    error NothingToClaim();
    error SaleTokenAlreadySet();
    error SaleTokenNotSet();
    error NotEnoughTokensDeposited(uint256 have, uint256 need);
    error CannotTouchBuyersTokens();
    error ZeroAddress();
    error NativeTransferFailed();
    error UseBuyFunction();

    // ───────────────────────────── constructor ────────────────────────────────

    /**
     * @param usdt_              USDT de la red.
     *                           Ethereum: 0xdAC17F958D2ee523a2206206994597C13D831ec7
     *                           BNB Chain: 0x55d398326f99059fF775485246999027B3197955
     * @param saleTokenDecimals_ Decimales del token en venta. Normalmente 18.
     * @param owner_             Quien administra. Usa un multisig, no una llave suelta.
     */
    constructor(IERC20 usdt_, uint8 saleTokenDecimals_, address owner_) Ownable(owner_) {
        if (address(usdt_) == address(0) || owner_ == address(0)) revert ZeroAddress();
        usdt = usdt_;
        saleTokenDecimals = saleTokenDecimals_;
        _unit = 10 ** saleTokenDecimals_;
    }

    // ──────────────────────────── administración ──────────────────────────────

    /// @notice Programa la ventana de la preventa. Solo se puede hacer una vez.
    /// @param  start Momento de apertura. Cero significa "ahora mismo".
    function startPresale(uint64 start, uint64 end) external onlyOwner {
        if (finalized) revert PresaleAlreadyFinalized();
        if (startTime != 0) revert PresaleAlreadyScheduled();
        if (priceNative == 0 || priceUsdt == 0) revert PriceNotSet();

        uint64 s = start == 0 ? uint64(block.timestamp) : start;
        if (end <= s) revert BadWindow();

        startTime = s;
        endTime = end;
        emit PresaleScheduled(s, end);
    }

    /// @notice Cierra la preventa ya, sin esperar a la fecha. No tiene vuelta atrás.
    function endPresale() external onlyOwner {
        if (finalized) revert PresaleAlreadyFinalized();
        finalized = true;
        endTime = uint64(block.timestamp);
        emit PresaleEnded(uint64(block.timestamp));
    }

    /**
     * @notice Fija los dos precios. Se puede hacer con la preventa en marcha: los
     *         compradores van protegidos por el mínimo de tokens que exigen en su
     *         propia transacción, así que un cambio de precio no puede darles
     *         menos de lo que aceptaron.
     */
    function setPrices(uint256 native, uint256 usdt_) external onlyOwner {
        if (native == 0 || usdt_ == 0) revert PriceNotSet();
        priceNative = native;
        priceUsdt = usdt_;
        emit PricesUpdated(native, usdt_);
    }

    /// @notice Tope de tokens. Cero lo desactiva. No puede quedar por debajo de lo vendido.
    function setHardCap(uint256 tokens) external onlyOwner {
        if (tokens != 0 && tokens < totalTokensSold) revert HardCapReached();
        hardCapTokens = tokens;
        emit HardCapUpdated(tokens);
    }

    function setMinBuy(uint256 native, uint256 usdt_) external onlyOwner {
        minBuyNative = native;
        minBuyUsdt = usdt_;
        emit MinBuyUpdated(native, usdt_);
    }

    /// @notice Para la venta sin cerrarla. Útil para corregir algo sobre la marcha.
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─────────────────────────────── compra ───────────────────────────────────

    /**
     * @param minTokensOut Mínimo de tokens que el comprador acepta recibir. Es su
     *                     protección: si el precio cambió entre que vio la
     *                     cotización y se minó su transacción, esta revierte en
     *                     vez de darle menos de lo esperado.
     */
    function buyWithNative(uint256 minTokensOut)
        external payable nonReentrant whenNotPaused returns (uint256 tokens)
    {
        _requireLive();
        if (msg.value < minBuyNative || msg.value == 0) revert AmountTooSmall();

        tokens = (msg.value * _unit) / priceNative;
        _record(msg.sender, tokens, minTokensOut);

        totalRaisedNative += msg.value;
        emit Purchased(msg.sender, false, msg.value, tokens);
    }

    function buyWithUsdt(uint256 amount, uint256 minTokensOut)
        external nonReentrant whenNotPaused returns (uint256 tokens)
    {
        _requireLive();
        if (amount < minBuyUsdt || amount == 0) revert AmountTooSmall();

        /* Se mide lo que entra de verdad. Si algún día USDT activase una comisión
           de transferencia, cobrar por el importe pedido regalaría tokens. */
        uint256 before = usdt.balanceOf(address(this));
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = usdt.balanceOf(address(this)) - before;

        tokens = (received * _unit) / priceUsdt;
        _record(msg.sender, tokens, minTokensOut);

        totalRaisedUsdt += received;
        emit Purchased(msg.sender, true, received, tokens);
    }

    function _record(address buyer, uint256 tokens, uint256 minTokensOut) private {
        if (tokens == 0) revert AmountTooSmall();
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

    /// @notice Un envío directo sin datos no lleva protección de precio, así que
    ///         se rechaza en vez de aceptarlo a ciegas.
    receive() external payable { revert UseBuyFunction(); }

    // ─────────────────────────────── reparto ──────────────────────────────────

    /// @notice Fija el token que se entregará. Solo una vez.
    function setSaleToken(IERC20 token) external onlyOwner {
        if (address(saleToken) != address(0)) revert SaleTokenAlreadySet();
        if (address(token) == address(0)) revert ZeroAddress();

        /* Si los decimales no coinciden con los que se fijaron al desplegar, todas
           las cantidades vendidas estarían mal. Mejor fallar aquí que repartir mal. */
        if (IERC20Metadata(address(token)).decimals() != saleTokenDecimals) {
            revert NotEnoughTokensDeposited(0, 0);
        }
        saleToken = token;
        emit SaleTokenSet(address(token));
    }

    /**
     * @notice Abre el reparto. Exige que el contrato ya tenga depositado todo lo
     *         vendido: nadie debe poder reclamar contra un saldo insuficiente y
     *         dejar sin nada al que llegue último.
     */
    function openClaims() external onlyOwner {
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

    /// @notice Retira lo recaudado en moneda nativa. Cero retira todo el saldo.
    function withdrawNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 value = amount == 0 ? address(this).balance : amount;
        (bool ok, ) = to.call{value: value}("");
        if (!ok) revert NativeTransferFailed();
        emit NativeWithdrawn(to, value);
    }

    /// @notice Retira lo recaudado en USDT. Cero retira todo el saldo.
    function withdrawUsdt(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 value = amount == 0 ? usdt.balanceOf(address(this)) : amount;
        usdt.safeTransfer(to, value);
        emit UsdtWithdrawn(to, value);
    }

    /**
     * @notice Retira el token en venta que sobre, nunca el que se debe a los
     *         compradores. Es la garantía de que el proyecto no puede vaciar el
     *         contrato y dejar a nadie sin reclamar.
     */
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

    /// @notice Recupera cualquier otro token enviado por error. No toca USDT ni el
    ///         token en venta, que tienen sus propias vías con sus límites.
    function rescueForeignToken(IERC20 token, address to, uint256 amount)
        external onlyOwner nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        if (token == usdt || token == saleToken) revert CannotTouchBuyersTokens();
        token.safeTransfer(to, amount);
        emit ForeignTokenRescued(address(token), to, amount);
    }

    // ──────────────────────────────── vistas ──────────────────────────────────

    function isLive() external view returns (bool) {
        return !finalized && !paused() && startTime != 0
            && block.timestamp >= startTime && block.timestamp < endTime;
    }

    /// @notice Cuántos tokens saldrían por un pago dado. Es lo que debe llamar la
    ///         web para calcular el mínimo que enviará el comprador.
    function quoteNative(uint256 amount) external view returns (uint256) {
        if (priceNative == 0) return 0;
        return (amount * _unit) / priceNative;
    }

    function quoteUsdt(uint256 amount) external view returns (uint256) {
        if (priceUsdt == 0) return 0;
        return (amount * _unit) / priceUsdt;
    }

    function remainingTokens() external view returns (uint256) {
        if (hardCapTokens == 0) return type(uint256).max;
        return hardCapTokens - totalTokensSold;
    }
}
