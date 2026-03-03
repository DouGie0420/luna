// polymarket-arb.js - Polymarket预测市场套利工具
const axios = require('axios');

class PolymarketArbitrage {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: 'https://gamma-api.polymarket.com/query',
      minArbitrageSpread: 0.02, // 最小套利价差2%
      maxPositionPerMarket: 10,  // 单市场最大仓位
      ...config
    };
    
    this.client = axios.create({
      baseURL: this.config.apiEndpoint,
      timeout: 10000
    });
  }
  
  // GraphQL查询
  async queryPolymarket(query, variables = {}) {
    try {
      const response = await this.client.post('', {
        query,
        variables
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Polymarket查询失败:', error.message);
      return null;
    }
  }
  
  // 获取活跃市场
  async getActiveMarkets(limit = 50) {
    const query = 
      query GetActiveMarkets {
        markets(
          first: ,
          orderBy: volume,
          orderDirection: desc,
          where: { status: " Active\ }
 ) {
 id
 slug
 question
 volume
 endDate
 outcomes {
 id
 name
 price
 volume
 }
 }
 }
 ;
 
 const data = await this.queryPolymarket(query);
 return data?.markets || [];
 }
 
 // 扫描套利机会
 async scanArbitrageOpportunities() {
 const markets = await this.getActiveMarkets(30);
 const opportunities = [];
 
 for (const market of markets) {
 const opportunity = this.analyzeMarket(market);
 if (opportunity) {
 opportunities.push(opportunity);
 }
 }
 
 // 按套利收益率排序
 return opportunities.sort((a, b) => b.return - a.return);
 }
 
 // 分析单个市场
 analyzeMarket(market) {
 // 确保是二元市场（是/否）
 if (!market.outcomes || market.outcomes.length !== 2) return null;
 
 const [outcome1, outcome2] = market.outcomes;
 const price1 = parseFloat(outcome1.price);
 const price2 = parseFloat(outcome2.price);
 
 // 检查价格是否有效
 if (isNaN(price1) || isNaN(price2) || price1 <= 0 || price2 <= 0) {
 return null;
 }
 
 const totalCost = price1 + price2;
 const spread = 1 - totalCost; // 价差
 
 // 筛选机会：价差足够大，流动性足够
 if (spread > this.config.minArbitrageSpread && 
 parseFloat(market.volume) > 1000) {
 
 const returnPercentage = (spread / totalCost) * 100;
 
 return {
 marketId: market.id,
 marketSlug: market.slug,
 question: market.question,
 endDate: market.endDate,
 outcomes: market.outcomes,
 price1,
 price2,
 totalCost,
 spread,
 returnPercentage,
 volume: parseFloat(market.volume),
 liquidityScore: this.calculateLiquidityScore(market),
 // 交易建议
 buyYes: price1 < 0.5 ? outcome1.id : outcome2.id,
 buyNo: price1 < 0.5 ? outcome2.id : outcome1.id,
 suggestedPosition: Math.min(
 this.config.maxPositionPerMarket,
 10 * spread // 根据价差调整仓位
 )
 };
 }
 
 return null;
 }
 
 // 计算流动性分数
 calculateLiquidityScore(market) {
 const volume = parseFloat(market.volume);
 if (volume > 10000) return 3; // 高流动性
 if (volume > 5000) return 2; // 中等流动性
 if (volume > 1000) return 1; // 低流动性
 return 0; // 流动性不足
 }
 
 // 估算套利收益率
 calculateExpectedReturn(opportunity, gasCost = 0.5) {
 const investment = opportunity.suggestedPosition;
 const grossReturn = investment * (opportunity.spread / opportunity.totalCost);
 const netReturn = grossReturn - gasCost;
 
 return {
 investment,
 grossReturn,
 netReturn,
 gasCost,
 roi: (netReturn / investment) * 100,
 breakEvenSpread: (gasCost / investment) * opportunity.totalCost
 };
 }
 
 // 生成交易报告
 generateReport(opportunities, limit = 5) {
 const topOpportunities = opportunities.slice(0, limit);
 
 let report = 📊 Polymarket套利机会报告\n;
 report += 扫描时间: \n;
 report += 发现机会: 个\n\n;
 
 topOpportunities.forEach((opp, index) => {
 const expectedReturn = this.calculateExpectedReturn(opp);
 
 report += ${index + 1}. \n;
 report += 市场: \n;
 report += 价格: {opp.price1.toFixed(3)} / {opp.price2.toFixed(3)}\n;
 report += 价差: %\n;
 report += 预期收益: {expectedReturn.netReturn.toFixed(2)} (% ROI)\n;
 report += 建议仓位: {opp.suggestedPosition.toFixed(2)}\n;
 report += 结算时间: \n;
 report += 流动性: \n\n;
 });
 
 return report;
 }
 
 // 监控循环
 startMonitoring(callback, interval = 300000) { // 5分钟
 console.log('开始Polymarket套利监控，间隔:', interval / 60000, '分钟');
 
 const monitor = async () => {
 try {
 const opportunities = await this.scanArbitrageOpportunities();
 
 if (opportunities.length > 0) {
 const report = this.generateReport(opportunities);
 console.log(report);
 
 if (callback) {
 callback(opportunities, report);
 }
 } else {
 console.log('未发现套利机会');
 }
 } catch (error) {
 console.error('监控错误:', error.message);
 }
 };
 
 // 立即运行一次
 monitor();
 
 // 设置定期监控
 return setInterval(monitor, interval);
 }
}

// 使用示例
if (require.main === module) {
 const arb = new PolymarketArbitrage();
 
 console.log('测试Polymarket套利扫描...');
 
 arb.scanArbitrageOpportunities().then(opportunities => {
 if (opportunities.length > 0) {
 console.log(arb.generateReport(opportunities));
 } else {
 console.log('未发现套利机会');
 }
 process.exit(0);
 }).catch(error => {
 console.error('测试失败:', error);
 process.exit(1);
 });
}

module.exports = PolymarketArbitrage;
