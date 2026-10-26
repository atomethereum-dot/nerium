// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Una cartera que es un contrato (como una multisig) y gasta bastante gas
///      al recibir: escribe en almacenamiento y emite un evento. Sirve para
///      probar que la comisión le llega igual, porque se le pasa todo el gas.
contract CarteraContrato {
    uint256 public recibido;
    uint256 public veces;
    event Recibido(address de, uint256 cuanto);
    receive() external payable { recibido += msg.value; veces += 1; emit Recibido(msg.sender, msg.value); }
}
