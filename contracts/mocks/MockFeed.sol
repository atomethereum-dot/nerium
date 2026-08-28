// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract MockFeed {
    uint8 public decimals = 8;
    int256 public answer;
    uint256 public updatedAt;
    constructor(int256 a) { answer = a; updatedAt = block.timestamp; }
    function set(int256 a) external { answer = a; updatedAt = block.timestamp; }
    function setStale(uint256 age) external { updatedAt = block.timestamp - age; }
    function setDecimals(uint8 d) external { decimals = d; }
    function latestRoundData() external view returns (uint80,int256,uint256,uint256,uint80) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
