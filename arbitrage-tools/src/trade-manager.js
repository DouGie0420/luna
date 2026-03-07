// trade-manager.js - 交易执行和风险管理
const config = require('./config.js');

class TradeManager {
  constructor() {
    this.activeTrades = [];
    this.tradeHistory = [];
    this.balance = config.trading.initialCapital;
    this.dailyStats = {
      trades: 0,
      wins: 0,
      losses: 0,
      profit: 0,
      date: new Date().toDateString()
    };
    
    this.loadState();
  }
  
  // 加载保存的状态
  loadState() {
    try {
      const fs = require('fs');
      const path = require('path');
      const statePath = path.join(__dirname, '../data/trade-state.json');
      
      if (fs.existsSync(statePath)) {
        const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        this.activeTrades = data.activeTrades || [];
        this.tradeHistory = data.tradeHistory || [];
        this.balance = data.balance || config.trading.initialCapital;
        this.dailyStats = data.dailyStats || this.dailyStats;
        
        console.log('交易状态已加载，当前余额:', this.balance);
      }
    } catch (error) {
      console.warn('无法加载交易状态，使用初始值:', error.message);
    }
  }
  
  // 保存状态
  saveState() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(__dirname, '../data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const state = {
        activeTrades: this.activeTrades,
        tradeHistory: this.tradeHistory,
        balance: this.balance,
        dailyStats: this.dailyStats,
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(dataDir, 'trade-state.json'),
        JSON.stringify(state, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('保存状态失败:', error.message);
    }
  }
  
  // 计算仓位大小
  calculatePositionSize(signalConfidence) {
    const { maxPositionSize, initialCapital } = config.trading;
    
    // 凯利公式简化版
    const winRate = this.dailyStats.trades > 0 ? 
      this.dailyStats.wins / this.dailyStats.trades : 0.5;
    
    const kellyFraction = winRate - ((1 - winRate) / 1); // 简化凯利
    
    // 限制仓位大小
    const maxSize = Math.min(
      maxPositionSize,
      Math.max(0.1, kellyFraction * signalConfidence)
    );
    
    return this.balance * maxSize;
  }
  
  // 检查是否允许交易
  canTrade(signal) {
    // 每日交易次数限制
    if (this.dailyStats.trades >= config.trading.maxDailyTrades) {
      console.log('达到每日交易次数限制');
      return false;
    }
    
    // 检查是否有活跃交易
    if (this.activeTrades.length > 0) {
      console.log('已有活跃交易，跳过');
      return false;
    }
    
    // 检查每日亏损限制
    if (this.dailyStats.profit < -config.risk.dailyLossLimit * config.trading.initialCapital) {
      console.log('达到单日亏损限制');
      return false;
    }
    
    // 检查冷却时间
    if (this.tradeHistory.length > 0) {
      const lastTrade = this.tradeHistory[this.tradeHistory.length - 1];
      const cooldownMs = config.trading.cooldownMinutes * 60 * 1000;
      const timeSinceLastTrade = Date.now() - new Date(lastTrade.exitTime).getTime();
      
      if (timeSinceLastTrade < cooldownMs) {
        console.log('冷却时间内，跳过交易');
        return false;
      }
    }
    
    return true;
  }
  
  // 开仓
  openTrade(signal, price) {
    if (!this.canTrade(signal)) return null;
    
    const positionSize = this.calculatePositionSize(signal.confidence);
    
    if (positionSize < 5) { // 最小交易金额
      console.log('仓位太小，跳过交易');
      return null;
    }
    
    const trade = {
      id: 'trade_' + Date.now(),
      type: signal.type, // long/short
      entryPrice: price,
      positionSize,
      stopLoss: signal.type === 'long' ? 
        price * (1 - config.trading.stopLoss) :
        price * (1 + config.trading.stopLoss),
      takeProfit: signal.type === 'long' ?
        price * (1 + config.trading.takeProfit) :
        price * (1 - config.trading.takeProfit),
      entryTime: new Date(),
      signal: signal,
      status: 'open'
    };
    
    this.activeTrades.push(trade);
    console.log(开仓:  @ {price.toFixed(2)}, 仓位: {positionSize.toFixed(2)});
    
    this.saveState();
    return trade;
  }
  
  // 检查平仓条件
  checkExitConditions(currentPrice) {
    const closedTrades = [];
    
    for (let i = this.activeTrades.length - 1; i >= 0; i--) {
      const trade = this.activeTrades[i];
      let exitReason = null;
      let exitPrice = currentPrice;
      
      // 检查止损
      if (trade.type === 'long' && currentPrice <= trade.stopLoss) {
        exitReason = 'stop_loss';
      } else if (trade.type === 'short' && currentPrice >= trade.stopLoss) {
        exitReason = 'stop_loss';
      }
      // 检查止盈
      else if (trade.type === 'long' && currentPrice >= trade.takeProfit) {
        exitReason = 'take_profit';
      } else if (trade.type === 'short' && currentPrice <= trade.takeProfit) {
        exitReason = 'take_profit';
      }
      
      if (exitReason) {
        // 平仓
        const profit = trade.type === 'long' ?
          (currentPrice - trade.entryPrice) / trade.entryPrice * trade.positionSize :
          (trade.entryPrice - currentPrice) / trade.entryPrice * trade.positionSize;
        
        trade.exitPrice = exitPrice;
        trade.exitTime = new Date();
        trade.exitReason = exitReason;
        trade.profit = profit;
        trade.status = 'closed';
        
        // 更新余额
        this.balance += profit;
        
        // 更新统计数据
        this.dailyStats.trades++;
        this.dailyStats.profit += profit;
        
        if (profit > 0) {
          this.dailyStats.wins++;
        } else {
          this.dailyStats.losses++;
        }
        
        // 移到历史记录
        this.tradeHistory.push(trade);
        this.activeTrades.splice(i, 1);
        closedTrades.push(trade);
        
        console.log(
          平仓:  | 盈亏: {profit.toFixed(2)} |  +
          原因:  | 余额: {this.balance.toFixed(2)}
        );
      }
    }
    
    if (closedTrades.length > 0) {
      this.saveState();
    }
    
    return closedTrades;
  }
  
  // 强制平仓
  forceCloseAll(currentPrice) {
    const closedTrades = [];
    
    for (const trade of this.activeTrades) {
      trade.exitPrice = currentPrice;
      trade.exitTime = new Date();
      trade.exitReason = 'force_close';
      
      const profit = trade.type === 'long' ?
        (currentPrice - trade.entryPrice) / trade.entryPrice * trade.positionSize :
        (trade.entryPrice - currentPrice) / trade.entryPrice * trade.positionSize;
      
      trade.profit = profit;
      trade.status = 'closed';
      
      this.balance += profit;
      this.dailyStats.trades++;
      this.dailyStats.profit += profit;
      
      if (profit > 0) {
        this.dailyStats.wins++;
      } else {
        this.dailyStats.losses++;
      }
      
      this.tradeHistory.push(trade);
      closedTrades.push(trade);
      
      console.log(
        强制平仓:  | 盈亏: {profit.toFixed(2)} |  +
        余额: {this.balance.toFixed(2)}
      );
    }
    
    this.activeTrades = [];
    this.saveState();
    return closedTrades;
  }
  
  // 获取统计数据
  getStats() {
    const totalTrades = this.tradeHistory.length;
    const winRate = totalTrades > 0 ? 
      this.tradeHistory.filter(t => t.profit > 0).length / totalTrades : 0;
    
    const totalProfit = this.tradeHistory.reduce((sum, t) => sum + t.profit, 0);
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    
    return {
      balance: this.balance,
      totalTrades,
      winRate,
      totalProfit,
      avgProfit,
      dailyStats: this.dailyStats,
      activeTrades: this.activeTrades.length
    };
  }
}

module.exports = TradeManager;
