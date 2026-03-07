# 🔐 Luna智能合约部署完整指南

**最后更新：** 2026-03-02 04:20  
**状态：** ⚠️ 待部署

---

## 📋 部署前检查清单

### 必需准备

- [ ] 有Base Mainnet的ETH（用于Gas费，约0.01-0.05 ETH）
- [ ] 部署钱包私钥（安全存储）
- [ ] Base Mainnet RPC URL
- [ ] USDT合约地址（Base Mainnet）：`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- [ ] 仲裁员地址（Arbiter）
- [ ] Basescan API Key（用于验证合约）

---

## 🛠️ 方法1：使用Hardhat部署（推荐）

### 步骤1：安装依赖

```bash
cd "G:\Luna Website"
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

选择：Create a TypeScript project

### 步骤2：配置Hardhat

创建 `hardhat.config.ts`：

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 8453
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 84532
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      baseSepolia: process.env.BASESCAN_API_KEY || ""
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};

export default config;
```

### 步骤3：准备智能合约

将合约代码放在 `contracts/USDTEscrow.sol`：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract USDTEscrow is ReentrancyGuard, Ownable {
    IERC20 public usdtToken;
    address public arbiter;
    
    enum OrderStatus { Created, Locked, Completed, Disputed, Refunded }
    
    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        OrderStatus status;
        uint256 createdAt;
        uint256 lockedAt;
        uint256 completedAt;
    }
    
    mapping(string => Order) public orders;
    
    event OrderCreated(string indexed orderId, address buyer, address seller, uint256 amount);
    event FundsLocked(string indexed orderId, uint256 amount);
    event DeliveryConfirmed(string indexed orderId);
    event DisputeOpened(string indexed orderId);
    event DisputeResolved(string indexed orderId, bool refundToBuyer);
    event Refunded(string indexed orderId, uint256 amount);
    
    constructor(address _usdtToken, address _arbiter) {
        usdtToken = IERC20(_usdtToken);
        arbiter = _arbiter;
    }
    
    function createOrder(
        string memory orderId,
        address seller,
        uint256 amount
    ) external {
        require(orders[orderId].buyer == address(0), "Order already exists");
        require(seller != address(0), "Invalid seller");
        require(amount > 0, "Invalid amount");
        
        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            status: OrderStatus.Created,
            createdAt: block.timestamp,
            lockedAt: 0,
            completedAt: 0
        });
        
        emit OrderCreated(orderId, msg.sender, seller, amount);
    }
    
    function lockFunds(string memory orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not the buyer");
        require(order.status == OrderStatus.Created, "Invalid status");
        
        require(
            usdtToken.transferFrom(msg.sender, address(this), order.amount),
            "Transfer failed"
        );
        
        order.status = OrderStatus.Locked;
        order.lockedAt = block.timestamp;
        
        emit FundsLocked(orderId, order.amount);
    }
    
    function confirmDelivery(string memory orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Not the buyer");
        require(order.status == OrderStatus.Locked, "Invalid status");
        
        require(
            usdtToken.transfer(order.seller, order.amount),
            "Transfer failed"
        );
        
        order.status = OrderStatus.Completed;
        order.completedAt = block.timestamp;
        
        emit DeliveryConfirmed(orderId);
    }
    
    function openDispute(string memory orderId) external {
        Order storage order = orders[orderId];
        require(
            order.buyer == msg.sender || order.seller == msg.sender,
            "Not authorized"
        );
        require(order.status == OrderStatus.Locked, "Invalid status");
        
        order.status = OrderStatus.Disputed;
        
        emit DisputeOpened(orderId);
    }
    
    function resolveDispute(
        string memory orderId,
        bool refundToBuyer
    ) external {
        require(msg.sender == arbiter, "Not arbiter");
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Disputed, "Not disputed");
        
        address recipient = refundToBuyer ? order.buyer : order.seller;
        require(
            usdtToken.transfer(recipient, order.amount),
            "Transfer failed"
        );
        
        order.status = refundToBuyer ? OrderStatus.Refunded : OrderStatus.Completed;
        order.completedAt = block.timestamp;
        
        emit DisputeResolved(orderId, refundToBuyer);
    }
    
    function updateArbiter(address newArbiter) external onlyOwner {
        require(newArbiter != address(0), "Invalid arbiter");
        arbiter = newArbiter;
    }
}
```

### 步骤4：创建部署脚本

创建 `scripts/deploy.ts`：

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 开始部署Luna USDTEscrow合约...");
  
  // Base Mainnet USDT地址
  const USDT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // 仲裁员地址（可以是你的管理员地址）
  const ARBITER_ADDRESS = process.env.ARBITER_ADDRESS || "";
  
  if (!ARBITER_ADDRESS) {
    throw new Error("请设置ARBITER_ADDRESS环境变量");
  }
  
  console.log("USDT地址:", USDT_ADDRESS);
  console.log("仲裁员地址:", ARBITER_ADDRESS);
  
  // 部署合约
  const USDTEscrow = await ethers.getContractFactory("USDTEscrow");
  const escrow = await USDTEscrow.deploy(USDT_ADDRESS, ARBITER_ADDRESS);
  
  await escrow.waitForDeployment();
  
  const address = await escrow.getAddress();
  
  console.log("✅ USDTEscrow合约已部署到:", address);
  console.log("📋 请将以下地址添加到.env.local:");
  console.log(`NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=${address}`);
  
  // 等待几个区块确认
  console.log("⏳ 等待区块确认...");
  await escrow.deploymentTransaction()?.wait(5);
  
  console.log("✅ 部署完成！");
  console.log("🔍 在Basescan验证合约:");
  console.log(`npx hardhat verify --network base ${address} ${USDT_ADDRESS} ${ARBITER_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 步骤5：配置环境变量

在 `.env` 中添加：

```bash
# 部署钱包私钥（不要提交到Git！）
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Base RPC URL（可选，使用公共RPC）
BASE_RPC_URL=https://mainnet.base.org

# 仲裁员地址
ARBITER_ADDRESS=your_arbiter_address_here

# Basescan API Key（用于验证合约）
BASESCAN_API_KEY=your_basescan_api_key_here
```

### 步骤6：部署到Base Mainnet

```bash
# 先在测试网测试（推荐）
npx hardhat run scripts/deploy.ts --network baseSepolia

# 确认无误后部署到主网
npx hardhat run scripts/deploy.ts --network base
```

### 步骤7：验证合约

```bash
npx hardhat verify --network base <合约地址> \
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" \
  "<仲裁员地址>"
```

### 步骤8：更新前端配置

在 `.env.local` 中添加：

```bash
NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=<部署的合约地址>
```

---

## 🛠️ 方法2：使用Remix IDE部署（简单）

### 步骤1：准备合约

1. 访问 https://remix.ethereum.org
2. 创建新文件 `USDTEscrow.sol`
3. 粘贴合约代码

### 步骤2：编译合约

1. 切换到"Solidity Compiler"标签
2. 选择编译器版本 0.8.20
3. 点击"Compile USDTEscrow.sol"

### 步骤3：部署合约

1. 切换到"Deploy & Run Transactions"标签
2. Environment选择"Injected Provider - MetaMask"
3. 确保MetaMask连接到Base Mainnet
4. 在构造函数参数中输入：
   - `_usdtToken`: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - `_arbiter`: 你的仲裁员地址
5. 点击"Deploy"
6. 在MetaMask中确认交易

### 步骤4：复制合约地址

部署成功后，复制合约地址并添加到 `.env.local`

---

## 🧪 测试合约

### 测试脚本

创建 `scripts/test-escrow.ts`：

```typescript
import { ethers } from "hardhat";

async function main() {
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
  
  if (!escrowAddress) {
    throw new Error("请设置NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS");
  }
  
  const escrow = await ethers.getContractAt("USDTEscrow", escrowAddress);
  
  console.log("🧪 测试合约功能...");
  
  // 测试1：创建订单
  const orderId = "test-" + Date.now();
  const seller = "0x..."; // 卖家地址
  const amount = ethers.parseUnits("10", 6); // 10 USDT
  
  console.log("创建订单...");
  const tx1 = await escrow.createOrder(orderId, seller, amount);
  await tx1.wait();
  console.log("✅ 订单创建成功");
  
  // 测试2：查询订单
  const order = await escrow.orders(orderId);
  console.log("订单信息:", {
    buyer: order.buyer,
    seller: order.seller,
    amount: ethers.formatUnits(order.amount, 6),
    status: order.status
  });
  
  console.log("✅ 合约测试完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

运行测试：

```bash
npx hardhat run scripts/test-escrow.ts --network base
```

---

## 📝 部署后检查清单

- [ ] 合约已部署到Base Mainnet
- [ ] 合约地址已添加到 `.env.local`
- [ ] 合约已在Basescan验证
- [ ] 测试创建订单功能
- [ ] 测试锁定资金功能
- [ ] 测试确认收货功能
- [ ] 测试争议功能
- [ ] 前端可以正常调用合约
- [ ] 重启开发服务器

---

## 🔒 安全注意事项

1. **私钥安全**
   - 永远不要将私钥提交到Git
   - 使用环境变量存储
   - 考虑使用硬件钱包

2. **合约安全**
   - 部署前进行审计
   - 测试网充分测试
   - 考虑使用多签钱包作为Owner

3. **仲裁员权限**
   - 仲裁员地址应该是可信的
   - 考虑使用多签地址
   - 定期审查争议处理

4. **Gas费优化**
   - 启用Solidity优化器
   - 批量操作减少交易次数
   - 监控Gas价格

---

## 🆘 常见问题

### Q: 部署失败，提示Gas不足
A: 确保钱包有足够的ETH（约0.01-0.05 ETH）

### Q: 合约验证失败
A: 确保编译器版本、优化设置和构造函数参数完全一致

### Q: 前端无法调用合约
A: 检查合约地址是否正确配置，网络是否匹配

### Q: USDT转账失败
A: 确保已经授权（approve）合约使用USDT

---

## 📞 获取帮助

- Base官方文档：https://docs.base.org
- Hardhat文档：https://hardhat.org/docs
- OpenZeppelin文档：https://docs.openzeppelin.com
- Basescan：https://basescan.org

---

**🚀 准备好部署了吗？按照上述步骤操作即可！**

*部署完成后，Luna网站将拥有完整的去中心化托管功能！*
