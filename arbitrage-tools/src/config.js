// config.js - 交易系统配置
require('dotenv').config();

module.exports = {
  // Twitter配置
  twitter: {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
    // 监控的账户和关键词
    monitoredAccounts: [
      'elonmusk', 'cz_binance', 'saylor', 'BitMEXResearch',
      'cobie', 'HsakaTrades', 'Pentosh1', 'LightCrypto'
    ],
    keywords: [
      '#bitcoin', 'btc', '比特币',
      'pump', 'dump', 'breakout', 'breakdown',
      '5min', 'short term', 'scalp'
    ]
  },
  
  // 交易配置
  trading: {
    pair: process.env.TRADING_PAIR || 'BTC/USDT',
    initialCapital: parseFloat(process.env.INITIAL_CAPITAL) || 15,
    maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE) || 0.5,
    stopLoss: parseFloat(process.env.STOP_LOSS) || 0.02,
    takeProfit: parseFloat(process.env.TAKE_PROFIT) || 0.05,
    // 高频交易参数
    minSignalConfidence: 0.7, // 最小信号置信度
    cooldownMinutes: 5, // 交易后冷却时间
    maxDailyTrades: 10 // 每日最大交易次数
  },
  
  // 风险管理
  risk: {
    maxDrawdown: 0.5, // 最大回撤50%
    dailyLossLimit: 0.2, // 单日最大亏损20%
    positionSizing: 'kelly' // 凯利公式或固定比例
  },
  
  // 技术指标参数
  indicators: {
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    bbPeriod: 20,
    bbStdDev: 2,
    volumeSpikeThreshold: 2.0 // 成交量突增阈值
  }
};
