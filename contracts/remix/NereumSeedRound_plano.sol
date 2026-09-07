// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// Sources flattened with hardhat v2.29.1 https://hardhat.org

// File @openzeppelin/contracts/utils/Context.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
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

// File @openzeppelin/contracts/access/Ownable.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// File @openzeppelin/contracts/access/Ownable2Step.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (access/Ownable2Step.sol)

/**
 * @dev Contract module which provides access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This extension of the {Ownable} contract includes a two-step mechanism to transfer
 * ownership, where the new owner must call {acceptOwnership} in order to replace the
 * old one. This can help prevent common mistakes, such as transfers of ownership to
 * incorrect accounts, or to contracts that are unable to interact with the
 * permission system.
 *
 * The initial owner is specified at deployment time in the constructor for `Ownable`. This
 * can later be changed with {transferOwnership} and {acceptOwnership}.
 *
 * This module is used through inheritance. It will make available all functions
 * from parent (Ownable).
 */
abstract contract Ownable2Step is Ownable {
    address private _pendingOwner;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Returns the address of the pending owner.
     */
    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    /**
     * @dev Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one.
     * Can only be called by the current owner.
     *
     * Setting `newOwner` to the zero address is allowed; this can be used to cancel an initiated ownership transfer.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`) and deletes any pending owner.
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual override {
        delete _pendingOwner;
        super._transferOwnership(newOwner);
    }

    /**
     * @dev The new owner accepts the ownership transfer.
     */
    function acceptOwnership() public virtual {
        address sender = _msgSender();
        if (pendingOwner() != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }
}

// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// File @openzeppelin/contracts/interfaces/IERC165.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File @openzeppelin/contracts/interfaces/IERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// File @openzeppelin/contracts/interfaces/IERC1363.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// File @openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

// File @openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
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

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
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
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// File @openzeppelin/contracts/utils/Pausable.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// File @openzeppelin/contracts/utils/StorageSlot.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
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

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
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
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// File src/NereumSeedRound.sol

// Original license: SPDX_License_Identifier: MIT

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
 * @title  Seed Round de Nereum
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
contract NereumSeedRound is Ownable2Step, ReentrancyGuard, Pausable {
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

    /// @notice Tope POR CARTERA en dólares, 8 decimales. 10.000 $ se escribe
    ///         1000000000000. Cero significa sin tope.
    ///
    ///         CONVIENE SABER QUÉ ES Y QUÉ NO ES: cuenta lo gastado por
    ///         dirección, sumando pagos en moneda nativa y en USDT. Nadie pasa
    ///         de aquí con una cartera, pero cualquiera puede abrir otra y
    ///         volver a empezar. Sirve para que la venta reparta y para
    ///         sostener lo que anuncia la web; NO es un control de identidad.
    ///         Si hace falta de verdad limitar por persona, eso se hace con
    ///         lista blanca, y eso es otra cosa.
    uint256 public maxBuyUsd;

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

    /// @notice Lo gastado por cada dirección, en dólares con 8 decimales, para
    ///         poder aplicar el tope por cartera.
    mapping(address => uint256) public spentUsd;

    // ─────────────────────────────── eventos ──────────────────────────────────

    event RoundScheduled(uint64 startTime, uint64 endTime);
    event RoundEnded(uint64 endedAt);
    event PriceUsdUpdated(uint256 priceUsd);
    event MinBuyUsdUpdated(uint256 minBuyUsd);
    event MaxBuyUsdUpdated(uint256 maxBuyUsd);
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

        /* La economía se fija al desplegar y no en llamadas sueltas despues:
           asi no existe el momento en que el contrato esta desplegado pero a
           medio configurar. Los setters siguen ahi para corregir en marcha. */
        priceUsd = priceUsd_;
        minBuyUsd = minBuyUsd_;
        maxBuyUsd = maxBuyUsd_;
        emit PriceUsdUpdated(priceUsd_);
        emit MinBuyUsdUpdated(minBuyUsd_);
        emit MaxBuyUsdUpdated(maxBuyUsd_);
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
        if (maxBuyUsd != 0 && min > maxBuyUsd) revert BadWindow();
        minBuyUsd = min;
        emit MinBuyUsdUpdated(min);
    }

    /// @notice Tope por cartera en dólares, 8 decimales. 10.000 $ = 1000000000000.
    ///         Cero quita el tope. Bajarlo no anula lo ya comprado: quien
    ///         estuviera por encima simplemente no puede comprar más.
    function setMaxBuyUsd(uint256 max) external onlyOwner {
        if (max != 0 && max < minBuyUsd) revert BadWindow();
        maxBuyUsd = max;
        emit MaxBuyUsdUpdated(max);
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

        /* El tope cuenta lo gastado por la dirección a lo largo de toda la
           ronda, sumando moneda nativa y USDT: no es un tope por transacción. */
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

    /// @notice Cuánto le queda por gastar a una dirección antes de topar.
    ///         Sin tope devuelve el máximo, que es como decir "sin límite".
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
