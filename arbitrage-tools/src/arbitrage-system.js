// arbitrage-system.js - 整合Polymarket套利和加密货币高频交易
const PolymarketArbitrage = require('./polymarket-arb.js');
const TwitterMonitor = require('./monitor-twitter.js');
const PriceMonitor = require('./price-monitor.js');
const TradeManager = require('./trade-manager.js');

class IntegratedArbitrageSystem {
  constructor(config = {}) {
    console.log('=== 整合套利系统启动 ===');
    
    // 初始化组件
    this.polymarket = new PolymarketArbitrage(config.polymarket);
    this.twitter = new TwitterMonitor();
    this.priceMonitor = new PriceMonitor();
    this.tradeManager = new TradeManager();
    
    // 状态
    this.isRunning = false;
    this.mode = config.mode || 'monitor'; // monitor, paper, live
    
    // 资金分配
    this.capitalAllocation = {
      polymarket: config.polymarketAllocation || 0.3,  // 30%资金给Polymarket
      crypto: config.cryptoAllocation || 0.7,          // 70%资金给加密货币
      maxTotalCapital: config.maxTotalCapital || 15
    };
    
    // 统计
    this.stats = {
      polymarketScans: 0,
      polymarketOpportunities: 0,
      polymarketTrades: 0,
      cryptoSignals: 0,
      cryptoTrades: 0,
      startTime: new Date()
    };
  }
  
  // 启动系统
  async start() {
    if (this.isRunning) {
      console.log('系统已在运行');
      return;
    }
    
    this.isRunning = true;
    console.log(启动整合套利系统 (模式: ));
    console.log(资金分配: Polymarket %, Crypto %);
    
    // 1. 启动Polymarket监控
    this.startPolymarketMonitoring();
    
    // 2. 启动加密货币监控
    this.startCryptoMonitoring();
    
    // 3. 启动定期报告
    this.startReporting();
    
    console.log('系统已完全启动');
  }
  
  // Polymarket监控
  startPolymarketMonitoring() {
    const interval = 5 * 60 * 1000; // 5分钟
    
    const monitor = async () => {
      this.stats.polymarketScans++;
      
      try {
        const opportunities = await this.polymarket.scanArbitrageOpportunities();
        
        if (opportunities.length > 0) {
          this.stats.polymarketOpportunities += opportunities.length;
          
          // 过滤高价值机会
          const bestOpportunities = opportunities
            .filter(opp => opp.spread > 0.03) // 至少3%价差
            .slice(0, 3); // 前3个
          
          if (bestOpportunities.length > 0) {
            console.log('\n🎯 Polymarket套利机会发现:');
            console.log(this.polymarket.generateReport(bestOpportunities));
            
            // 根据模式执行
            if (this.mode === 'live') {
              await this.executePolymarketArbitrage(bestOpportunities[0]);
            }
          }
        }
      } catch (error) {
        console.error('Polymarket监控错误:', error.message);
      }
    };
    
    // 立即运行一次
    monitor();
    
    // 设置定期监控
    this.polymarketInterval = setInterval(monitor, interval);
  }
  
  // 执行Polymarket套利
  async executePolymarketArbitrage(opportunity) {
    console.log(执行Polymarket套利: );
    
    // 计算仓位
    const maxPosition = this.capitalAllocation.maxTotalCapital * this.capitalAllocation.polymarket;
    const position = Math.min(opportunity.suggestedPosition, maxPosition);
    
    if (position < 5) {
      console.log('仓位太小，跳过交易');
      return;
    }
    
    console.log(投资: {position.toFixed(2)});
    console.log(预期收益: %);
    console.log(结算时间: );
    
    // 这里添加实际交易逻辑
    // 需要Polymarket交易API集成
    
    this.stats.polymarketTrades++;
    return { success: true, position, opportunity };
  }
  
  // 加密货币监控
  startCryptoMonitoring() {
    // 启动Twitter监控
    setInterval(async () => {
      try {
        const signals = await this.twitter.getLatestSignals(3);
        const highConfidenceSignals = signals.filter(s => s.confidence > 0.8);
        
        if (highConfidenceSignals.length > 0) {
          this.stats.cryptoSignals += highConfidenceSignals.length;
          
          for (const signal of highConfidenceSignals) {
            console.log(\n📢 Twitter信号: );
            console.log(置信度: %);
            
            if (this.mode === 'live') {
              // 获取当前价格
              const priceData = await this.priceMonitor.getCurrentPrice();
              if (priceData) {
                const trade = this.tradeManager.openTrade(signal, priceData.price);
                if (trade) {
                  this.stats.cryptoTrades++;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Twitter监控错误:', error.message);
      }
    }, 60000); // 1分钟
    
    // 启动技术指标监控
    this.priceMonitor.startMonitoring(async (signal) => {
      this.stats.cryptoSignals++;
      
      console.log(\n📈 技术信号:  (%));
      
      if (this.mode === 'live' && signal.confidence > 0.7) {
        const trade = this.tradeManager.openTrade(signal, signal.price);
        if (trade) {
          this.stats.cryptoTrades++;
        }
      }
    }, 30000); // 30秒
  }
  
  // 定期报告
  startReporting() {
    setInterval(() => {
      const tradeStats = this.tradeManager.getStats();
      const uptime = Math.floor((Date.now() - this.stats.startTime) / 60000); // 分钟
      
      console.log('\n📊 === 整合系统报告 ===');
      console.log(运行时间: 分钟);
      console.log(模式: );
      console.log(当前余额: {tradeStats.balance.toFixed(2)});
      console.log(总盈亏: {tradeStats.totalProfit.toFixed(2)});
      console.log(胜率: %);
      
      console.log(\nPolymarket统计:);
      console.log(  扫描次数: );
      console.log(  发现机会: );
      console.log(  执行交易: );
      
      console.log(\n加密货币统计:);
      console.log(  信号数量: );
      console.log(  交易次数: );
      console.log(  活跃交易: );
      
      // 检查停止条件
      this.checkStopConditions(tradeStats);
      
    }, 300000); // 5分钟
  }
  
  // 检查停止条件
  checkStopConditions(tradeStats) {
    // 余额过低
    if (tradeStats.balance <= 5) {
      console.error('❌ 余额过低 ()，停止系统');
      this.stop();
      return;
    }
    
    // 单日亏损过大
    if (tradeStats.dailyStats.profit < -3) {
      console.warn('⚠️  单日亏损超过，考虑暂停');
    }
    
    // 最大回撤
    const drawdown = (15 - tradeStats.balance) / 15;
    if (drawdown > 0.5) {
      console.error('❌ 达到最大回撤50%，停止系统');
      this.stop();
    }
  }
  
  // 停止系统
  stop() {
    this.isRunning = false;
    
    // 清除定时器
    if (this.polymarketInterval) {
      clearInterval(this.polymarketInterval);
    }
    
    // 平仓所有交易
    this.priceMonitor.getCurrentPrice().then(priceData => {
      if (priceData) {
        this.tradeManager.forceCloseAll(priceData.price);
      }
      
      const finalStats = this.tradeManager.getStats();
      console.log('\n🎯 === 最终统计 ===');
      console.log(最终余额: {finalStats.balance.toFixed(2)});
      console.log(总交易次数: );
      console.log(总盈亏: {finalStats.totalProfit.toFixed(2)});
      console.log(胜率: %);
      
      console.log(\nPolymarket: 次交易);
      console.log(加密货币: 次交易);
    });
  }
  
  // 切换模式
  setMode(mode) {
    const validModes = ['monitor', 'paper', 'live'];
    if (!validModes.includes(mode)) {
      console.error('无效模式，可用:', validModes.join(', '));
      return;
    }
    
    this.mode = mode;
    console.log(系统模式切换为: );
    
    if (mode === 'monitor') {
      console.log('仅监控模式，不执行交易');
    } else if (mode === 'paper') {
      console.log('模拟交易模式，记录交易但不实际执行');
    } else if (mode === 'live') {
      console.log('实盘交易模式，谨慎！');
    }
  }
  
  // 获取系统状态
  getStatus() {
    const tradeStats = this.tradeManager.getStats();
    
    return {
      running: this.isRunning,
      mode: this.mode,
      balance: tradeStats.balance,
      stats: this.stats,
      tradeStats,
      allocation: this.capitalAllocation,
      uptime: Math.floor((Date.now() - this.stats.startTime) / 60000)
    };
  }
}

// 命令行接口
if (require.main === module) {
  const system = new IntegratedArbitrageSystem({
    mode: process.argv[2] || 'monitor',
    polymarketAllocation: 0.3,
    cryptoAllocation: 0.7,
    maxTotalCapital: 15
  });
  
  system.start();
  
  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n接收到关闭信号...');
    system.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n接收到终止信号...');
    system.stop();
    process.exit(0);
  });
}

module.exports = IntegratedArbitrageSystem;
