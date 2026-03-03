// 决策引擎模块
class DecisionEngine {
  constructor(config) {
    this.config = config || {
      votingAlgorithm: 'weighted_confidence',
      decisionThreshold: 0.7,
      minMembersForDecision: 1
    };
    
    console.log(" 决策引擎初始化\);
 }
 
 // 评估委员会成员的分析
 async evaluate(memberAnalyses, originalSignal) {
 if (!memberAnalyses || memberAnalyses.length === 0) {
 return this.getDefaultDecision(originalSignal);
 }
 
 console.log(\决策引擎评估 个成员分析\);
 
 // 根据配置的算法进行评估
 switch (this.config.votingAlgorithm) {
 case 'weighted_confidence':
 return this.weightedConfidenceVote(memberAnalyses, originalSignal);
 case 'majority':
 return this.majorityVote(memberAnalyses, originalSignal);
 case 'consensus':
 return this.consensusVote(memberAnalyses, originalSignal);
 default:
 return this.weightedConfidenceVote(memberAnalyses, originalSignal);
 }
 }
 
 // 加权置信度投票
 weightedConfidenceVote(memberAnalyses, signal) {
 const votes = {
 long: { total: 0, weighted: 0, count: 0 },
 short: { total: 0, weighted: 0, count: 0 },
 hold: { total: 0, weighted: 0, count: 0 }
 };
 
 // 收集投票
 memberAnalyses.forEach(analysis => {
 const rec = analysis.analysis.recommendation || 'hold';
 const confidence = analysis.confidence || 0.5;
 const memberWeight = this.getMemberWeight(analysis.member);
 
 if (votes[rec]) {
 votes[rec].total += confidence * memberWeight;
 votes[rec].weighted += confidence;
 votes[rec].count++;
 }
 });
 
 // 计算总权重
 const totalWeight = Object.values(votes).reduce((sum, v) => sum + v.total, 0);
 
 // 如果没有投票，返回默认决策
 if (totalWeight === 0) {
 return this.getDefaultDecision(signal);
 }
 
 // 找到最高票选项
 let decision = 'hold';
 let maxVotes = 0;
 let decisionConfidence = 0;
 
 Object.entries(votes).forEach(([rec, data]) => {
 if (data.total > maxVotes) {
 maxVotes = data.total;
 decision = rec;
 decisionConfidence = totalWeight > 0 ? data.total / totalWeight : 0;
 }
 });
 
 // 收集理由
 const reasoning = this.compileReasoning(memberAnalyses, decision);
 
 // 计算风险等级
 const riskLevel = this.calculateRiskLevel(memberAnalyses, decisionConfidence);
 
 return {
 recommendation: decision,
 confidence: decisionConfidence,
 reasoning: reasoning,
 riskLevel: riskLevel,
 votes: votes,
 memberCount: memberAnalyses.length,
 meetsThreshold: decisionConfidence >= this.config.decisionThreshold,
 timestamp: new Date(),
 signal: signal
 };
 }
 
 // 多数投票
 majorityVote(memberAnalyses, signal) {
 const voteCount = {
 long: 0,
 short: 0,
 hold: 0
 };
 
 memberAnalyses.forEach(analysis => {
 const rec = analysis.analysis.recommendation || 'hold';
 if (voteCount[rec] !== undefined) {
 voteCount[rec]++;
 }
 });
 
 // 找到多数票
 let decision = 'hold';
 let maxVotes = 0;
 
 Object.entries(voteCount).forEach(([rec, count]) => {
 if (count > maxVotes) {
 maxVotes = count;
 decision = rec;
 }
 });
 
 const confidence = maxVotes / memberAnalyses.length;
 const reasoning = \多数投票: / 票支持 \;
 const riskLevel = this.calculateRiskLevel(memberAnalyses, confidence);
 
 return {
 recommendation: decision,
 confidence: confidence,
 reasoning: reasoning,
 riskLevel: riskLevel,
 voteCount: voteCount,
 memberCount: memberAnalyses.length,
 meetsThreshold: confidence >= this.config.decisionThreshold,
 timestamp: new Date(),
 signal: signal
 };
 }
 
 // 共识投票（需要高度一致）
 consensusVote(memberAnalyses, signal) {
 const recommendations = memberAnalyses.map(a => a.analysis.recommendation || 'hold');
 
 // 检查是否达成共识（80%以上一致）
 const recommendationCounts = {};
 recommendations.forEach(rec => {
 recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1;
 });
 
 const total = recommendations.length;
 let consensusRecommendation = 'hold';
 let consensusPercentage = 0;
 
 Object.entries(recommendationCounts).forEach(([rec, count]) => {
 const percentage = count / total;
 if (percentage > consensusPercentage) {
 consensusPercentage = percentage;
 consensusRecommendation = rec;
 }
 });
 
 // 需要80%共识
 const meetsConsensus = consensusPercentage >= 0.8;
 const confidence = meetsConsensus ? consensusPercentage : 0;
 
 const reasoning = meetsConsensus 
 ? \达成共识: % 成员同意 \
 : \未达成共识: 最高支持率 %\;
 
 const riskLevel = meetsConsensus ? 'medium' : 'high';
 
 return {
 recommendation: meetsConsensus ? consensusRecommendation : 'hold',
 confidence: confidence,
 reasoning: reasoning,
 riskLevel: riskLevel,
 consensusPercentage: consensusPercentage,
 meetsConsensus: meetsConsensus,
 memberCount: memberAnalyses.length,
 meetsThreshold: meetsConsensus,
 timestamp: new Date(),
 signal: signal
 };
 }
 
 // 获取成员权重
 getMemberWeight(memberType) {
 const weights = {
 gemini: 1.0,
 twitter: 0.8,
 chatgpt: 1.0,
 grok: 0.9,
 default: 0.7
 };
 
 return weights[memberType] || weights.default;
 }
 
 // 编译理由
 compileReasoning(memberAnalyses, finalDecision) {
 const reasons = [];
 
 memberAnalyses.forEach(analysis => {
 const member = analysis.member;
 const analysisResult = analysis.analysis;
 
 if (analysisResult.recommendation === finalDecision) {
 reasons.push(\${member}: \);
 } else if (analysisResult.reasoning) {
 reasons.push(\${member}: \);
 }
 });
 
 return reasons.length > 0 
 ? reasons.join(' | ')
 : \基于 个成员分析的综合评估\;
 }
 
 // 计算风险等级
 calculateRiskLevel(memberAnalyses, confidence) {
 if (confidence >= 0.8) return 'low';
 if (confidence >= 0.6) return 'medium';
 return 'high';
 }
 
 // 默认决策（当没有分析时）
 getDefaultDecision(signal) {
 return {
 recommendation: 'hold',
 confidence: 0.3,
 reasoning: '委员会成员不足，建议观望',
 riskLevel: 'high',
 isDefault: true,
 timestamp: new Date(),
 signal: signal
 };
 }
 
 // 更新配置
 updateConfig(newConfig) {
 this.config = { ...this.config, ...newConfig };
 console.log(\决策引擎配置更新: \);
 }
}

module.exports = DecisionEngine;
