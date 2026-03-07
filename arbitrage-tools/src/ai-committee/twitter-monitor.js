// Twitter监控器模块
const axios = require('axios');

class TwitterMonitor {
  constructor(config) {
    this.config = config;
    this.bearerToken = config.bearer_token;
    this.consumerKey = config.consumer_key;
    this.consumerSecret = config.consumer_secret;
    this.apiVersion = config.api_version || 'v2';
    
    this.baseURL = 'https://api.twitter.com/2';
    this.streamURL = 'https://api.twitter.com/2/tweets/search/stream';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': Bearer ,
        'Content-Type': 'application/json'
      }
    });
    
    // 监控的账户和关键词
    this.monitoredAccounts = [
      'elonmusk', 'cz_binance', 'saylor', 'BitMEXResearch',
      'cobie', 'HsakaTrades', 'Pentosh1', 'LightCrypto',
      'rektcapital', 'AltcoinSherpa', 'CryptoCred', 'MayneTraders'
    ];
    
    this.cryptoKeywords = [
      'bitcoin', 'btc', '比特币',
      'ethereum', 'eth', '以太坊',
      'crypto', 'cryptocurrency', '加密货币',
      'bull', 'bear', 'bullish', 'bearish',
      'pump', 'dump', 'breakout', 'breakdown',
      'long', 'short', '做多', '做空',
      '5min', 'short term', 'scalp', '高频'
    ];
    
    this.recentSignals = [];
    this.maxSignals = 100;
    
    console.log(" Twitter监控器初始化完成\);
 }
 
 // 搜索最近的推文
 async searchRecentTweets(query, maxResults = 10) {
 try {
 const response = await this.client.get('/tweets/search/recent', {
 params: {
 query: query,
 'tweet.fields': 'created_at,public_metrics,author_id',
 'user.fields': 'username,name',
 max_results: maxResults,
 expansions: 'author_id'
 }
 });
 
 return response.data;
 } catch (error) {
 console.error('Twitter搜索失败:', error.message);
 return null;
 }
 }
 
 // 获取监控账户的最新推文
 async getMonitoredAccountsTweets() {
 const allTweets = [];
 
 for (const account of this.monitoredAccounts.slice(0, 5)) { // 限制前5个账户
 try {
 const query = rom: () -is:retweet;
 const tweets = await this.searchRecentTweets(query, 5);
 
 if (tweets && tweets.data) {
 const userMap = {};
 if (tweets.includes && tweets.includes.users) {
 tweets.includes.users.forEach(user => {
 userMap[user.id] = user;
 });
 }
 
 tweets.data.forEach(tweet => {
 const user = userMap[tweet.author_id];
 const signal = this.tweetToSignal(tweet, user, account);
 if (signal) {
 allTweets.push(signal);
 }
 });
 }
 
 // 避免速率限制
 await new Promise(resolve => setTimeout(resolve, 500));
 
 } catch (error) {
 console.error(\获取账户 @ 推文失败:\, error.message);
 }
 }
 
 return allTweets;
 }
 
 // 将推文转换为交易信号
 tweetToSignal(tweet, user, sourceAccount) {
 const text = tweet.text.toLowerCase();
 
 // 检查是否包含关键词
 const matchedKeywords = this.cryptoKeywords.filter(keyword => 
 text.includes(keyword.toLowerCase())
 );
 
 if (matchedKeywords.length === 0) return null;
 
 // 简单的情感分析
 const sentiment = this.analyzeSentiment(text);
 
 // 信号强度计算
 let confidence = 0.5;
 confidence += matchedKeywords.length * 0.1;
 confidence += sentiment.score * 0.2;
 
 // 账户影响力
 const influence = this.getAccountInfluence(sourceAccount);
 confidence *= influence;
 
 // 推文互动指标
 const engagement = this.calculateEngagement(tweet.public_metrics);
 confidence += engagement * 0.1;
 
 // 确定信号类型
 const signalType = this.determineSignalType(text, sentiment);
 
 const signal = {
 id: tweet.id,
 type: signalType,
 source: 'twitter',
 sourceAccount: sourceAccount,
 author: user ? user.username : 'unknown',
 text: tweet.text,
 keywords: matchedKeywords,
 sentiment: sentiment,
 confidence: Math.min(confidence, 0.95),
 metrics: tweet.public_metrics,
 engagement: engagement,
 createdAt: new Date(tweet.created_at),
 url: \https://twitter.com//status/\
 };
 
 this.recentSignals.unshift(signal);
 if (this.recentSignals.length > this.maxSignals) {
 this.recentSignals.pop();
 }
 
 return signal;
 }
 
 // 简单情感分析
 analyzeSentiment(text) {
 const positiveWords = ['bull', 'bullish', 'buy', 'long', 'pump', 'moon', 'rocket', '突破', '上涨', 'good', 'great'];
 const negativeWords = ['bear', 'bearish', 'sell', 'short', 'dump', 'crash', '下跌', '跌破', 'bad', 'worry'];
 
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
 
 // 账户影响力系数
 getAccountInfluence(account) {
 const influenceMap = {
 'elonmusk': 1.0,
 'cz_binance': 0.9,
 'saylor': 0.8,
 'BitMEXResearch': 0.7,
 'cobie': 0.6,
 'default': 0.5
 };
 
 return influenceMap[account] || influenceMap.default;
 }
 
 // 计算互动指标
 calculateEngagement(metrics) {
 if (!metrics) return 0;
 
 const { like_count = 0, retweet_count = 0, reply_count = 0, quote_count = 0 } = metrics;
 const totalEngagement = like_count + retweet_count * 2 + reply_count + quote_count;
 
 // 归一化到0-1之间
 return Math.min(totalEngagement / 1000, 1);
 }
 
 // 确定信号类型
 determineSignalType(text, sentiment) {
 if (text.includes('5min') || text.includes('short term') || text.includes('scalp')) {
 return 'scalp';
 }
 
 if (text.includes('breakout')) {
 return sentiment.direction === 'bullish' ? 'breakout_long' : 'breakout_short';
 }
 
 if (text.includes('breakdown')) {
 return sentiment.direction === 'bullish' ? 'breakdown_long' : 'breakdown_short';
 }
 
 if (sentiment.direction === 'bullish') {
 return 'long';
 } else if (sentiment.direction === 'bearish') {
 return 'short';
 }
 
 return 'neutral';
 }
 
 // 分析信号（供委员会调用）
 async analyzeSignal(signal) {
 // 这里可以添加更复杂的分析逻辑
 return {
 recommendation: signal.type.includes('long') ? 'long' : signal.type.includes('short') ? 'short' : 'hold',
 confidence: signal.confidence,
 reasoning: \Twitter信号分析: 提到 \,
 riskLevel: signal.confidence > 0.7 ? 'medium' : 'high',
 analyzedAt: new Date()
 };
 }
 
 // 获取最新信号
 async getLatestSignals(limit = 5) {
 const tweets = await this.getMonitoredAccountsTweets();
 
 // 按置信度排序
 return tweets
 .sort((a, b) => b.confidence - a.confidence)
 .slice(0, limit);
 }
 
 // 测试连接
 async testConnection() {
 try {
 const response = await this.client.get('/tweets/search/recent', {
 params: {
 query: 'bitcoin',
 max_results: 1
 }
 });
 
 return {
 success: true,
 rateLimit: response.headers['x-rate-limit-remaining'],
 data: response.data
 };
 
 } catch (error) {
 return {
 success: false,
 error: error.message,
 status: error.response?.status
 };
 }
 }
}

module.exports = TwitterMonitor;
