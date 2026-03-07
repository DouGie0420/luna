// monitor-twitter.js - Twitter信号监控
const config = require('./config.js');
const { TwitterApi } = require('twitter-api-v2');

class TwitterMonitor {
  constructor() {
    this.client = null;
    this.signals = [];
    this.initialize();
  }
  
  initialize() {
    // 检查Twitter API配置
    const { twitter } = config;
    if (!twitter.apiKey || !twitter.apiSecret) {
      console.warn('Twitter API密钥未配置，监控功能受限');
      return;
    }
    
    try {
      this.client = new TwitterApi({
        appKey: twitter.apiKey,
        appSecret: twitter.apiSecret,
        accessToken: twitter.accessToken,
        accessSecret: twitter.accessSecret,
      });
      
      console.log('Twitter监控器初始化成功');
    } catch (error) {
      console.error('Twitter初始化失败:', error.message);
    }
  }
  
  // 监控特定账户的推文
  async monitorAccounts() {
    if (!this.client) {
      console.warn('Twitter客户端未初始化');
      return [];
    }
    
    const signals = [];
    const { monitoredAccounts, keywords } = config.twitter;
    
    for (const account of monitoredAccounts) {
      try {
        const user = await this.client.v2.userByUsername(account);
        const tweets = await this.client.v2.userTimeline(user.data.id, {
          max_results: 10,
          'tweet.fields': ['created_at', 'public_metrics']
        });
        
        for (const tweet of tweets.data.data) {
          const signal = this.analyzeTweet(tweet, account);
          if (signal) {
            signals.push(signal);
          }
        }
      } catch (error) {
        console.error(获取账户 @ 推文失败:, error.message);
      }
    }
    
    return signals;
  }
  
  // 分析推文内容，提取交易信号
  analyzeTweet(tweet, source) {
    const text = tweet.text.toLowerCase();
    const { keywords } = config.twitter;
    
    // 检查是否包含关键词
    const matchedKeywords = keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length === 0) return null;
    
    // 简单的情感分析
    const sentiment = this.analyzeSentiment(text);
    
    // 信号强度计算
    let confidence = 0.5; // 基础置信度
    
    // 关键词数量增加置信度
    confidence += matchedKeywords.length * 0.1;
    
    // 情感分数影响
    confidence += sentiment.score * 0.2;
    
    // 账户影响力（简化版）
    const influence = this.getAccountInfluence(source);
    confidence *= influence;
    
    // 只返回高置信度信号
    if (confidence < config.trading.minSignalConfidence) return null;
    
    return {
      id: tweet.id,
      text: tweet.text,
      source,
      timestamp: new Date(tweet.created_at),
      keywords: matchedKeywords,
      sentiment,
      confidence: Math.min(confidence, 0.95), // 限制最大置信度
      type: this.determineSignalType(text, sentiment)
    };
  }
  
  // 简单情感分析
  analyzeSentiment(text) {
    const positiveWords = ['bull', 'bullish', 'buy', 'long', 'pump', 'moon', 'rocket', '突破', '上涨'];
    const negativeWords = ['bear', 'bearish', 'sell', 'short', 'dump', 'crash', '下跌', '跌破'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    const score = total > 0 ? (positiveCount - negativeCount) / total : 0;
    
    return {
      score,
      direction: score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral',
      positiveCount,
      negativeCount
    };
  }
  
  // 获取账户影响力系数
  getAccountInfluence(account) {
    const influenceMap = {
      'elonmusk': 1.0,
      'cz_binance': 0.9,
      'saylor': 0.8,
      'BitMEXResearch': 0.7,
      'default': 0.5
    };
    
    return influenceMap[account] || influenceMap.default;
  }
  
  // 确定信号类型
  determineSignalType(text, sentiment) {
    if (text.includes('5min') || text.includes('short term')) {
      return 'scalp';
    }
    
    if (sentiment.direction === 'bullish') {
      return text.includes('breakout') ? 'breakout_long' : 'long';
    } else if (sentiment.direction === 'bearish') {
      return text.includes('breakdown') ? 'breakdown_short' : 'short';
    }
    
    return 'neutral';
  }
  
  // 获取最新信号
  async getLatestSignals(limit = 5) {
    const signals = await this.monitorAccounts();
    // 按置信度排序
    return signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}

module.exports = TwitterMonitor;
