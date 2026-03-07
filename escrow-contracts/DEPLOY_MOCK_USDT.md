# MockUSDT 部署指南

## 📋 前置要求

1. **Node.js** (v18+)
2. **Hardhat** 或 **Foundry** 安装
3. **Base Sepolia 测试网 ETH** (用于支付 Gas)

## 🔧 安装依赖

```bash
# 创建新的 Hardhat 项目（如果还没有）
mkdir mock-usdt-deploy
cd mock-usdt-deploy
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# 安装 OpenZeppelin 合约
npm install @openzeppelin/contracts

# 初始化 Hardhat
npx hardhat init
```

## 📝 创建合约文件

将 `MockUSDT.sol` 复制到 `contracts/MockUSDT.sol`：

```solidity
// 文件: contracts/MockUSDT.sol
// 内容就是上面提供的合约代码
```

## ⚙️ Hardhat 配置

编辑 `hardhat.config.ts`：

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY!,
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

export default config;
```

创建 `.env` 文件：

```bash
# 你的钱包私钥（注意：必须是测试钱包，不要用在主网有钱的钱包！）
PRIVATE_KEY=0x你的私钥

# Base Sepolia Etherscan API Key（用于验证合约）
BASESCAN_API_KEY=你的APIKey
```

## 🚀 部署合约

```bash
# 编译合约
npx hardhat compile

# 部署到 Base Sepolia
npx hardhat run scripts/deploy.ts --network baseSepolia
```

创建部署脚本 `scripts/deploy.ts`：

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MockUSDT...");

  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUSDT = await MockUSDT.deploy();

  await mockUSDT.waitForDeployment();

  const address = await mockUSDT.getAddress();
  console.log(`MockUSDT deployed to: ${address}`);
  console.log(`Deployer received 1,000,000 mUSDT`);

  // 保存部署信息
  const deploymentInfo = {
    contract: "MockUSDT",
    address: address,
    network: "baseSepolia",
    chainId: 84532,
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

## ✅ 验证合约（可选但推荐）

```bash
npx hardhat verify --network baseSepolia 部署的合约地址
```

## 🎯 部署后操作

### 1. 查看余额
```typescript
const balance = await mockUSDT.balanceOf(你的地址);
console.log("Balance:", ethers.formatUnits(balance, 6), "mUSDT");
```

### 2. 转账给朋友测试
```typescript
// 转账 1000 mUSDT 给朋友
await mockUSDT.transfer("朋友地址", ethers.parseUnits("1000", 6));
```

### 3. 授权给 LunaEscrow 合约
```typescript
// 授权 LunaEscrow 合约可以使用你的 mUSDT
const escrowAddress = "0x5CcD28825df05AEAf6F55b62c9a35695B070740F";
await mockUSDT.approve(escrowAddress, ethers.parseUnits("1000000", 6));
```

## 📋 前端配置

部署成功后，将合约地址填入前端配置：

**文件：`src/lib/web3/config.ts`**

```typescript
// Mock USDT 合约地址 (Base Sepolia)
export const MOCK_USDT_ADDRESS = "你的MockUSDT合约地址";
```

## 🆘 故障排除

### 1. 余额不足
```
Error: insufficient funds for intrinsic transaction cost
```
**解决**：到 [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-sepolia-faucet) 领取更多测试 ETH

### 2. 合约验证失败
```
Error: The address ... does not have bytecode
```
**解决**：等待几分钟后重试，或检查部署是否成功

### 3. 无法连接网络
```
Error: could not detect network
```
**解决**：检查网络连接，或尝试使用其他 RPC URL：
- `https://base-sepolia-rpc.publicnode.com`
- `https://rpc.notadegen.com/base/sepolia`

## 🎉 恭喜！

部署成功后，您就有无限的测试 USDT 可以用来测试 LunaEscrow 合约了！

**下一步**：
1. 将 MockUSDT 地址告诉前端开发者
2. 开始真实的闭环测试
3. 享受您的测试吧！🚀
