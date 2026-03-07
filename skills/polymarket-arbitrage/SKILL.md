---
name: polymarket-arbitrage
description: " Polymarket预测市场套利和加密货币高频交易工具。使用时机： 1 检测Polymarket价格错配机会， 2 执行加密货币高频交易， 3 监控Twitter信号和价格突增， 4 小额资金（15-100美元）自动化套利。\
metadata:
 category: finance
 risk-level: high
 requires-api-keys: true
---
# Polymarket Arbitrage Skill

专业级的预测市场和加密货币高频交易工具，专注于小额资金（15-100美元）的自动化套利机会。

## 🎯 核心功能

### 1. Polymarket套利检测
- **价格错配扫描**：检测" 是/否\股票价格组合 < 0.98的机会
- **无风险套利**：买入组合，持有至结算，获得确定性收益
- **实时监控**：持续扫描高概率市场

### 2. 加密货币高频交易
- **5分钟级别交易**：专注于比特币短线机会
- **技术指标**：RSI、布林带、移动平均线
- **价格突增检测**：5分钟内涨跌幅>3%的快速识别
- **Twitter情绪分析**：追踪关键影响者信号

### 3. 风险管理
- **凯利公式仓位管理**：根据胜率动态调整
- **多层止损**：2%单笔止损，20%单日限额，50%最大回撤
- **Gas优化**：Base链低Gas时段交易

## 🚀 快速开始

### 安装依赖
`ash
# 在项目根目录
cd arbitrage-tools
npm install
`

### 配置API密钥
1. 复制环境模板：
`ash
copy .env.example .env
`

2. 编辑.env文件，配置以下密钥：

**必需配置**：
- **Polymarket API**：需要GraphQL端点访问
- **交易所API**：币安或Bybit用于加密货币交易
- **Twitter开发者账号**：信号监控

**可选配置**：
- **Telegram Bot**：交易警报推送
- **Alchemy/Infura**：链上数据

### 启动系统
`ash
# 启动完整交易系统
npm start

# 或单独启动组件
npm run monitor    # Twitter信号监控
npm run trade      # 价格监控和交易
npm run backtest   # 策略回测
`
