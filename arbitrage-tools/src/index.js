// index.js - 主交易系统
const TwitterMonitor = require('./monitor-twitter.js');
const PriceMonitor = require('./price-monitor.js');
const TradeManager = require('./trade-manager.js');
const config = require('./config.js');

class CryptoTradingBot {
  constructor() {
    console.log('=== 加密货币高频交易系统启动 ===');
    console.log('初始资金:', config.trading.initialCapital, '美元');
    console.log('交易对:', config.trading.pair);
    
    // 初始化组件
    this.twitterMonitor = new TwitterMonitor();
    this.priceMonitor = new PriceMonitor();
    this.tradeManager = new TradeManager();
    
    // 状态
    this.isRunning = false;
    this.lastSignalTime = null;
    
    // 统计
    this.stats = {
      twitterSignals: 0,
      technicalSignals: 0,
      tradesExecuted: 0
    };
  }
  
  // 启动系统
  async start() {
    if (this.isRunning) {
      console.log('系统已在运行');
      return;
    }
    
    this.isRunning = true;
    console.log('交易系统启动...');
    
    // 1. 启动Twitter监控（如果有配置）
    this.startTwitterMonitoring();
    
    // 2. 启动价格监控
    this.startPriceMonitoring();
    
    // 3. 启动定期报告
    this.startReporting();
    
    console.log('系统已完全启动');
  }
  
  // 启动Twitter监控
  startTwitterMonitoring() {
    setInterval(async () => {
      try {
        const signals = await this.twitterMonitor.getLatestSignals(3);
        
        if (signals.length > 0) {
          this.stats.twitterSignals += signals.length;
          
          // 处理高置信度信号
          const highConfidenceSignals = signals.filter(s => s.confidence > 0.8);
          
          for (const signal of highConfidenceSignals) {
            console.log(\n📢 Twitter信号: );
            console.log(内容: ...);
            console.log(置信度: %);
            console.log(类型: );
            
            // 获取当前价格并考虑交易
            const priceData = await this.priceMonitor.getCurrentPrice();
            if (priceData) {
              await this.evaluateTradeSignal({
                ...signal,
                source: 'twitter',
                price: priceData.price
              });
            }
          }
        }
      } catch (error) {
        console.error('Twitter监控错误:', error.message);
      }
    }, 60000); // 每60秒检查一次
  }
  
  // 启动价格监控
  startPriceMonitoring() {
    this.priceMonitor.startMonitoring(async (signal) => {
      this.stats.technicalSignals++;
      
      console.log(\n📈 技术信号: );
      console.log(价格: {signal.price.toFixed(2)});
      console.log(置信度: %);
      
      if (signal.spike) {
        console.log(价格突增: % );
      }
      
      await this.evaluateTradeSignal({
        ...signal,
        source: 'technical'
      });
    }, 30000); // 每30秒检查一次
  }
  
  // 评估交易信号
  async evaluateTradeSignal(signal) {
    // 检查冷却时间
    if (this.lastSignalTime) {
      const timeSinceLastSignal = Date.now() - this.lastSignalTime;
      const cooldownMs = config.trading.cooldownMinutes * 60 * 1000;
      
      if (timeSinceLastSignal < cooldownMs) {
        console.log('信号冷却中，跳过');
        return;
      }
    }
    
    this.lastSignalTime = Date.now();
    
    // 获取当前价格
    const priceData = await this.priceMonitor.getCurrentPrice();
    if (!priceData) return;
    
    const currentPrice = priceData.price;
    
    // 检查信号是否仍然有效（价格未大幅变化）
    if (signal.price) {
      const priceChange = Math.abs(currentPrice - signal.price) / signal.price;
      if (priceChange > 0.02) { // 价格已变化超过2%
        console.log('信号价格已过时，跳过');
        return;
      }
    }
    
    // 开仓
    const trade = this.tradeManager.openTrade(signal, currentPrice);
    
    if (trade) {
      this.stats.tradesExecuted++;
      console.log(✅ 执行交易:  @ {currentPrice.toFixed(2)});
    }
  }
  
  // 启动定期报告
  startReporting() {
    // 每5分钟报告一次
    setInterval(() => {
      const stats = this.tradeManager.getStats();
      
      console.log('\n📊 === 系统报告 ===');
      console.log(当前余额: {stats.balance.toFixed(2)});
      console.log(总盈亏: {stats.totalProfit.toFixed(2)});
      console.log(胜率: %);
      console.log(活跃交易: );
      console.log(Twitter信号: );
      console.log(技术信号: );
      console.log(执行交易: );
      
      // 检查是否达到亏损限制
      if (stats.balance < config.trading.initialCapital * (1 - config.risk.maxDrawdown)) {
        console.warn('⚠️  达到最大回撤限制，考虑停止交易');
      }
      
      if (stats.balance <= 5) {
        console.error('❌ 余额过低，停止交易系统');
        this.stop();
      }
    }, 300000); // 5分钟
  }
  
  // 停止系统
  stop() {
    this.isRunning = false;
    console.log('交易系统停止');
    
    // 强制平仓所有活跃交易
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
    });
  }
  
  // 获取系统状态
  getStatus() {
    const tradeStats = this.tradeManager.getStats();
    
    return {
      running: this.isRunning,
      balance: tradeStats.balance,
      stats: this.stats,
      tradeStats,
      config: {
        initialCapital: config.trading.initialCapital,
        maxDailyTrades: config.trading.maxDailyTrades,
        riskLimits: config.risk
      }
    };
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const bot = new CryptoTradingBot();
  
  // 启动
  bot.start();
  
  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n接收到关闭信号...');
    bot.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n接收到终止信号...');
    bot.stop();
    process.exit(0);
  });
}

module.exports = CryptoTradingBot;
