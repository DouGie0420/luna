// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev 用于测试的模拟 USDT 合约
 * 部署时自动给部署者铸造 1,000,000 个代币
 * 精度：6 位小数（与真实 USDT 相同）
 */
contract MockUSDT is ERC20, Ownable {

    uint8 private constant _DECIMALS = 6;
    uint256 private constant _INITIAL_MINT = 1_000_000 * 10**6; // 1,000,000 USDT

    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {
        // 给部署者铸造初始代币
        _mint(msg.sender, _INITIAL_MINT);
    }

    /**
     * @dev 返回小数位数 (6位，与真实 USDT 一致)
     */
    function decimals() public view virtual override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev  faucet 功能：任何人都可以领取测试代币
     * @param amount 请求的代币数量（不含小数位）
     */
    function faucet(uint256 amount) external {
        require(amount <= 10000, "Amount too large (max 10000)");
        uint256 mintAmount = amount * 10**_DECIMALS;
        _mint(msg.sender, mintAmount);
    }

    /**
     * @dev 批量转账（方便测试）
     */
    function batchTransfer(address[] calldata recipients, uint256 amount) external {
        for (uint i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amount);
        }
    }

    /**
     * @dev 查询 faucet 可用余额
     */
    function faucetBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }
}
