// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
/// @dev Un oráculo que revierte, como si lo hubieran pausado o retirado.
contract MockFeedRoto {
    uint8 public decimals = 8;
    function latestRoundData() external pure returns (uint80,int256,uint256,uint256,uint80) {
        revert("oraculo caido");
    }
}
