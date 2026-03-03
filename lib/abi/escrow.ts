// 托管合约ABI占位文件（部署合约后替换为实际ABI）
// 从Base Sepolia测试网区块浏览器获取部署合约的ABI后更新此文件

/**
 * 示例ABI结构（实际需与部署的合约匹配）
 * 包含托管合约核心方法：deposit、release、refund等
 */
export const EscrowContractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "seller", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
