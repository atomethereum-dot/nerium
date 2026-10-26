// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    error OwnableUnauthorizedAccount(address account);

    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

abstract contract Ownable2Step is Ownable {
    address private _pendingOwner;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    function transferOwnership(address newOwner) public virtual override onlyOwner {
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual override {
        delete _pendingOwner;
        super._transferOwnership(newOwner);
    }

    function acceptOwnership() public virtual {
        address sender = _msgSender();
        if (pendingOwner() != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC1363 is IERC20, IERC165 {
    function transferAndCall(address to, uint256 value) external returns (bool);

    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    function approveAndCall(address spender, uint256 value) external returns (bool);

    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);
}

library SafeERC20 {
    error SafeERC20FailedOperation(address token);

    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)

            if iszero(and(success, eq(mload(0x00), 1))) {
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }

                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)

            if iszero(and(success, eq(mload(0x00), 1))) {
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }

                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)

            if iszero(and(success, eq(mload(0x00), 1))) {
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }

                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

abstract contract Pausable is Context {
    bool private _paused;

    event Paused(address account);

    event Unpaused(address account);

    error EnforcedPause();

    error ExpectedPause();

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        _nonReentrantBeforeView();

        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound
    );
}

contract NereumSeedRound is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    uint256 private constant USD = 1e8;

    IERC20 public immutable usdt;

    uint8 public immutable saleTokenDecimals;

    uint256 private immutable _unit;
    uint256 private immutable _usdtUnit;

    uint256 public priceUsd;

    uint256 public minBuyUsd;

    uint256 public maxBuyUsd;

    struct Feed { AggregatorV3Interface oracle; uint256 unit; }

    Feed[] public feeds;

    uint256 public maxPriceAge = 24 hours;

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

    mapping(address => uint256) public spentUsd;

    uint256 public referralBps = 1000;
    uint256 public constant MAX_REFERRAL_BPS = 2000;

    mapping(address => uint256) public referralEarnedNative;
    mapping(address => uint256) public referralEarnedUsdt;
    mapping(address => uint256) public referralCount;
    uint256 public totalReferralNative;
    uint256 public totalReferralUsdt;

    event RoundScheduled(uint64 startTime, uint64 endTime);
    event RoundEnded(uint64 endedAt);
    event PriceUsdUpdated(uint256 priceUsd);
    event MinBuyUsdUpdated(uint256 minBuyUsd);
    event MaxBuyUsdUpdated(uint256 maxBuyUsd);
    event MaxPriceAgeUpdated(uint256 seconds_);
    event FeedsUpdated(uint256 count);

    event OracleFellBack(uint256 indexed usedIndex, uint256 price);

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

    event ReferralPaid(address indexed referrer, address indexed buyer, bool inUsdt, uint256 amount);
    event ReferralBpsUpdated(uint256 bps);

    error RoundNotLive();
    error RoundNotOver();
    error RoundAlreadyFinalized();
    error RoundAlreadyScheduled();
    error BadWindow();
    error PriceNotSet();
    error BelowMinimum(uint256 usdValue, uint256 minimum);
    error AboveMaximum(uint256 wouldSpend, uint256 maximum);
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
    error ReferralTooHigh(uint256 bps, uint256 maximum);
    error ReferralPaymentFailed(address referrer);

    constructor(
        IERC20 usdt_,
        AggregatorV3Interface[] memory feeds_,
        uint8 saleTokenDecimals_,
        address owner_,
        uint256 priceUsd_,
        uint256 minBuyUsd_,
        uint256 maxBuyUsd_
    ) Ownable(owner_) {
        if (address(usdt_) == address(0) || owner_ == address(0)) revert ZeroAddress();
        if (priceUsd_ == 0) revert PriceNotSet();
        if (maxBuyUsd_ != 0 && minBuyUsd_ > maxBuyUsd_) revert BadWindow();

        usdt = usdt_;
        saleTokenDecimals = saleTokenDecimals_;
        _unit = 10 ** saleTokenDecimals_;
        _usdtUnit = 10 ** IERC20Metadata(address(usdt_)).decimals();
        _setFeeds(feeds_);

        priceUsd = priceUsd_;
        minBuyUsd = minBuyUsd_;
        maxBuyUsd = maxBuyUsd_;
        emit PriceUsdUpdated(priceUsd_);
        emit MinBuyUsdUpdated(minBuyUsd_);
        emit MaxBuyUsdUpdated(maxBuyUsd_);
    }

    function setPriceUsd(uint256 price) external onlyOwner {
        if (price == 0) revert PriceNotSet();
        priceUsd = price;
        emit PriceUsdUpdated(price);
    }

    function setMinBuyUsd(uint256 min) external onlyOwner {
        if (maxBuyUsd != 0 && min > maxBuyUsd) revert BadWindow();
        minBuyUsd = min;
        emit MinBuyUsdUpdated(min);
    }

    function setMaxBuyUsd(uint256 max) external onlyOwner {
        if (max != 0 && max < minBuyUsd) revert BadWindow();
        maxBuyUsd = max;
        emit MaxBuyUsdUpdated(max);
    }

    function setMaxPriceAge(uint256 seconds_) external onlyOwner {
        if (seconds_ == 0) revert PriceNotSet();
        maxPriceAge = seconds_;
        emit MaxPriceAgeUpdated(seconds_);
    }

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

    function setReferralBps(uint256 bps) external onlyOwner {
        if (bps > MAX_REFERRAL_BPS) revert ReferralTooHigh(bps, MAX_REFERRAL_BPS);
        referralBps = bps;
        emit ReferralBpsUpdated(bps);
    }

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

    function nativeUsdPrice() public view returns (uint256 price, bool live) {
        (uint256 p, bool ok, ) = _readOracles();
        if (ok) return (p, true);
        if (lastGoodPrice == 0) revert NoPriceAvailable();
        return (lastGoodPrice, false);
    }

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

    function buyWithNative(uint256 minTokensOut)
        external payable nonReentrant whenNotPaused returns (uint256 tokens)
    {
        return _buyNative(minTokensOut, address(0));
    }

    function buyWithNativeRef(uint256 minTokensOut, address referrer)
        external payable nonReentrant whenNotPaused returns (uint256 tokens)
    {
        return _buyNative(minTokensOut, referrer);
    }

    function _buyNative(uint256 minTokensOut, address referrer) private returns (uint256 tokens) {
        _requireLive();

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
        _payReferral(referrer, false, msg.value);
    }

    function buyWithUsdt(uint256 amount, uint256 minTokensOut)
        external nonReentrant whenNotPaused returns (uint256 tokens)
    {
        return _buyUsdt(amount, minTokensOut, address(0));
    }

    function buyWithUsdtRef(uint256 amount, uint256 minTokensOut, address referrer)
        external nonReentrant whenNotPaused returns (uint256 tokens)
    {
        return _buyUsdt(amount, minTokensOut, referrer);
    }

    function _buyUsdt(uint256 amount, uint256 minTokensOut, address referrer) private returns (uint256 tokens) {
        _requireLive();

        uint256 before = usdt.balanceOf(address(this));
        usdt.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = usdt.balanceOf(address(this)) - before;

        uint256 usdValue = (received * USD) / _usdtUnit;
        tokens = _record(msg.sender, usdValue, minTokensOut);

        totalRaisedUsdt += received;
        emit Purchased(msg.sender, true, received, usdValue, tokens);
        _payReferral(referrer, true, received);
    }

    function _payReferral(address referrer, bool inUsdt, uint256 paid) private {
        if (referrer == address(0) || referrer == msg.sender || referrer == address(this)) return;
        uint256 cut = (paid * referralBps) / 10_000;
        if (cut == 0) return;

        referralCount[referrer] += 1;
        if (inUsdt) {
            referralEarnedUsdt[referrer] += cut;
            totalReferralUsdt += cut;
            emit ReferralPaid(referrer, msg.sender, true, cut);
            usdt.safeTransfer(referrer, cut);
        } else {
            referralEarnedNative[referrer] += cut;
            totalReferralNative += cut;
            emit ReferralPaid(referrer, msg.sender, false, cut);
            (bool ok, ) = referrer.call{value: cut}("");
            if (!ok) revert ReferralPaymentFailed(referrer);
        }
    }

    function _record(address buyer, uint256 usdValue, uint256 minTokensOut)
        private returns (uint256 tokens)
    {
        if (usdValue < minBuyUsd) revert BelowMinimum(usdValue, minBuyUsd);

        uint256 spent = spentUsd[buyer] + usdValue;
        if (maxBuyUsd != 0 && spent > maxBuyUsd) revert AboveMaximum(spent, maxBuyUsd);

        tokens = (usdValue * _unit) / priceUsd;
        if (tokens == 0) revert BelowMinimum(usdValue, minBuyUsd);
        if (tokens < minTokensOut) revert SlippageTooHigh(tokens, minTokensOut);

        uint256 sold = totalTokensSold + tokens;
        if (hardCapTokens != 0 && sold > hardCapTokens) revert HardCapReached();

        totalTokensSold = sold;
        allocation[buyer] += tokens;
        spentUsd[buyer] = spent;
    }

    function _requireLive() private view {
        if (finalized) revert RoundNotLive();
        if (startTime == 0 || block.timestamp < startTime || block.timestamp >= endTime) {
            revert RoundNotLive();
        }
    }

    receive() external payable { revert UseBuyFunction(); }

    function setSaleToken(IERC20 token) external onlyOwner {
        if (address(saleToken) != address(0)) revert SaleTokenAlreadySet();
        if (address(token) == address(0)) revert ZeroAddress();

        uint8 d = IERC20Metadata(address(token)).decimals();
        if (d != saleTokenDecimals) revert WrongTokenDecimals(d, saleTokenDecimals);

        saleToken = token;
        emit SaleTokenSet(address(token));
    }

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

    function isLive() public view returns (bool) {
        return !finalized && !paused() && startTime != 0
            && block.timestamp >= startTime && block.timestamp < endTime;
    }

    function isOver() public view returns (bool) {
        return finalized || (startTime != 0 && block.timestamp >= endTime);
    }

    function quoteNative(uint256 amount) external view returns (uint256) {
        if (priceUsd == 0) return 0;
        (uint256 nativeUsd, ) = nativeUsdPrice();
        return (((amount * nativeUsd) / 1e18) * _unit) / priceUsd;
    }

    function quoteUsdt(uint256 amount) external view returns (uint256) {
        if (priceUsd == 0) return 0;
        return (((amount * USD) / _usdtUnit) * _unit) / priceUsd;
    }

    function nativeForUsd(uint256 usdAmount) external view returns (uint256) {
        (uint256 nativeUsd, ) = nativeUsdPrice();
        return (usdAmount * 1e18) / nativeUsd;
    }

    function remainingAllowanceUsd(address buyer) external view returns (uint256) {
        if (maxBuyUsd == 0) return type(uint256).max;
        uint256 spent = spentUsd[buyer];
        return spent >= maxBuyUsd ? 0 : maxBuyUsd - spent;
    }

    function remainingTokens() external view returns (uint256) {
        if (hardCapTokens == 0) return type(uint256).max;
        return hardCapTokens - totalTokensSold;
    }
}
