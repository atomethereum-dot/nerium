// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Un receptor que no acepta ETH: sirve para probar que, si la comisión
///      de un referido no se puede entregar, la compra entera revierte.
contract RechazaEth {
    receive() external payable { revert("no"); }
}
