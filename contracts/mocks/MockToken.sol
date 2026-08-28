// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract MockToken is ERC20 {
    constructor() ERC20("Nereum","NRM") { _mint(msg.sender, 1e9 ether); }
}
