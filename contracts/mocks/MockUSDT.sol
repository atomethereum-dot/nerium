// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract MockUSDT is ERC20 {
    uint8 private immutable d;
    constructor(uint8 decimals_) ERC20("Mock USDT","USDT") { d = decimals_; _mint(msg.sender, 1e12 * 10**decimals_); }
    function decimals() public view override returns (uint8) { return d; }
}
