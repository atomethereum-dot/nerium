// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Un receptor que no acepta ETH: sirve para probar que la comisión de
///      un referido que no se puede entregar queda apartada y la compra sigue.
contract RechazaEth {
    receive() external payable { revert("no"); }
    function reclamar(address venta, address payable a) external {
        (bool ok, bytes memory r) = venta.call(abi.encodeWithSignature("claimReferral(address)", a));
        if (!ok) assembly { revert(add(r, 32), mload(r)) }
    }
}
