// price-monitor.js - 实时价格监控和技术分析
const ccxt = require('ccxt');
const { RSI, BollingerBands, SMA } = require('technicalindicators');
const config = require('./config.js');

class PriceMonitor {
  constructor() {
    this.exchange = new ccxt.binance({
      enableRateLimit: true,
      options: { defaultType: 'spot' }
    });
    
    this.priceHistory = [];
    this.maxHistory = 100;
    this.lastUpdate = null;
  }
  
  // 获取当前价格
  async getCurrentPrice() {
    try {
      const ticker = await this.exchange.fetchTicker(config.trading.pair);
      return {
        price: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
        volume: ticker.quoteVolume,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('获取价格失败:', error.message);
      return null;
    }
  }
  
  // 获取K线数据
  async getOHLCV(timeframe = '5m', limit = 20) {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(
        config.trading.pair,
        timeframe,
        undefined,
        limit
      );
      
      return ohlcv.map(candle => ({
        timestamp: new Date(candle[0]),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5]
      }));
    } catch (error) {
      console.error('获取K线数据失败:', error.message);
      return [];
    }
  }
  
  // 计算技术指标
  calculateIndicators(prices) {
    if (prices.length < 20) return null;
    
    const closes = prices.map(p => p.close);
    
    // RSI
    const rsiValues = RSI.calculate({
      values: closes,
      period: config.indicators.rsiPeriod
    });
    
    // 布林带
    const bbInput = {
      values: closes,
      period: config.indicators.bbPeriod,
      stdDev: config.indicators.bbStdDev
    };
    const bbValues = BollingerBands.calculate(bbInput);
    
    // 简单移动平均线
    const sma20 = SMA.calculate({
      values: closes,
      period: 20
    });
    
    const sma50 = SMA.calculate({
      values: closes,
      period: 50
    });
    
    const latestRsi = rsiValues[rsiValues.length - 1];
    const latestBB = bbValues[bbValues.length - 1];
    const latestSma20 = sma20[sma20.length - 1];
    const latestSma50 = sma50[sma50.length - 1];
    
    return {
      rsi: latestRsi,
      bb: latestBB,
      sma20: latestSma20,
      sma50: latestSma50,
      currentPrice: closes[closes.length - 1],
      isOverbought: latestRsi > config.indicators.rsiOverbought,
      isOversold: latestRsi < config.indicators.rsiOversold,
      bbPosition: (closes[closes.length - 1] - latestBB.lower) / 
                 (latestBB.upper - latestBB.lower), // 0-1之间，越低越接近下轨
      trend: latestSma20 > latestSma50 ? 'bullish' : 'bearish'
    };
  }
  
  // 检测价格异常（5分钟涨跌幅超阈值）
  detectPriceSpike(prices, threshold = 0.03) {
    if (prices.length < 10) return null;
    
    const recentPrices = prices.slice(-10); // 最近10个5分钟K线
    const priceChanges = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
      const change = (recentPrices[i].close - recentPrices[i-1].close) / recentPrices[i-1].close;
      priceChanges.push(change);
    }
    
    const maxChange = Math.max(...priceChanges.map(Math.abs));
    const latestChange = priceChanges[priceChanges.length - 1];
    
    if (Math.abs(latestChange) > threshold) {
      return {
        change: latestChange,
        isSpike: true,
        direction: latestChange > 0 ? 'up' : 'down',
        magnitude: Math.abs(latestChange),
        timestamp: new Date()
      };
    }
    
    return null;
  }
  
  // 综合技术信号
  async getTechnicalSignals() {
    const prices = await this.getOHLCV('5m', 100);
    if (prices.length === 0) return null;
    
    const indicators = this.calculateIndicators(prices);
    if (!indicators) return null;
    
    const spike = this.detectPriceSpike(prices, 0.03); // 3%阈值
    
    let signal = null;
    let confidence = 0.5;
    
    // 基于技术指标生成信号
    if (indicators.isOversold && indicators.bbPosition < 0.2) {
      signal = 'long';
      confidence = 0.7;
    } else if (indicators.isOverbought && indicators.bbPosition > 0.8) {
      signal = 'short';
      confidence = 0.7;
    }
    
    // 价格突增检测
    if (spike && spike.isSpike) {
      // 如果是下跌突增，可能考虑做空
      if (spike.direction === 'down' && spike.magnitude > 0.05) {
        signal = 'short';
        confidence = 0.8;
      }
      // 如果是上涨突增，谨慎追多（可能已到顶部）
    }
    
    // 趋势跟随
    if (!signal && indicators.trend === 'bullish') {
      signal = 'long';
      confidence = 0.6;
    } else if (!signal && indicators.trend === 'bearish') {
      signal = 'short';
      confidence = 0.6;
    }
    
    return signal ? {
      type: signal,
      confidence,
      indicators,
      spike,
      price: indicators.currentPrice,
      timestamp: new Date()
    } : null;
  }
  
  // 监控循环
  async startMonitoring(callback, interval = 30000) {
    console.log('开始价格监控，间隔:', interval, 'ms');
    
    setInterval(async () => {
      try {
        const signal = await this.getTechnicalSignals();
        if (signal) {
          callback(signal);
        }
      } catch (error) {
        console.error('监控循环错误:', error.message);
      }
    }, interval);
  }
}

module.exports = PriceMonitor;
