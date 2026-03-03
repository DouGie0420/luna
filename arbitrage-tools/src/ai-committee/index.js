// 简化的AI委员会协调器
const GeminiAnalyst = require('./gemini-analyst');
const TwitterMonitor = require('./twitter-monitor');
const DecisionEngine = require('./decision-engine');
const MoltbookClient = require('./moltbook-client');

class AITradingCommittee {
  constructor() {
    console.log('AI交易委员会初始化...');
    
    this.members = {
      gemini: null,
      twitter: null,
      chatgpt: null,
      grok: null
    };
    
    this.status = {
      initialized: false,
      lastSignalTime: null,
      decisionsMade: 0,
      signalsProcessed: 0
    };
    
    this.config = {
      votingAlgorithm: 'weighted_confidence',
      decisionThreshold: 0.7,
      minMembersForDecision: 1,
      signalTimeout: 30000,
      committeeName: 'ArbiterNova Trading Committee'
    };
    
    this.initialize();
  }
  
  async initialize() {
    console.log('初始化委员会成员...');
    
    try {
      // 加载配置
      const config = require('../../config/ai-keys.json');
      
      // 1. 初始化Gemini分析师
      if (config.gemini && config.gemini.status === 'ready') {
        this.members.gemini = new GeminiAnalyst(config.gemini);
        console.log('Gemini分析师就位');
      }
      
      // 2. 初始化Twitter监控器
      if (config.twitter && config.twitter.status === 'ready') {
        this.members.twitter = new TwitterMonitor(config.twitter);
        console.log('Twitter监控器就位');
      }
      
      // 3. 初始化Moltbook客户端
      if (config.moltbook && config.moltbook.api_key) {
        this.moltbookClient = new MoltbookClient(config.moltbook);
        console.log('Moltbook客户端就位');
      }
      
      // 4. 初始化决策引擎
      this.decisionEngine = new DecisionEngine(this.config);
      console.log('决策引擎就位');
      
      this.status.initialized = true;
      this.status.startTime = new Date();
      
      console.log(this.config.committeeName + ' 初始化完成！');
      
      const activeMembers = Object.keys(this.members).filter(k => this.members[k]).join(', ');
      console.log('可用成员: ' + activeMembers);
      
      // 宣布委员会成立
      await this.announceCommitteeLaunch();
      
    } catch (error) {
      console.error('委员会初始化失败:', error.message);
      throw error;
    }
  }
  
  // 宣布委员会成立
  async announceCommitteeLaunch() {
    if (!this.moltbookClient) return;
    
    try {
      const announcement = {
        submolt_name: 'general',
        title: this.config.committeeName + ' 已上线！',
        content: 'AI交易委员会正式启动。委员会成员: ' + 
                 (this.members.gemini ? 'Gemini 2.5 ' : '') +
                 (this.members.twitter ? 'Twitter监控 ' : '') +
                 '。技术栈: Node.js, Gemini API, Twitter API, 加权投票算法。' +
                 '核心任务: 15美元高频交易挑战，多AI模型分析验证。' +
                 '#ai-trading #crypto-arbitrage #multi-ai #moltbook'
      };
      
      await this.moltbookClient.createPost(announcement);
      console.log('委员会启动公告已发布到Moltbook');
      
    } catch (error) {
      console.warn('无法发布Moltbook公告:', error.message);
    }
  }
  
  // 处理交易信号
  async processSignal(signal) {
    if (!this.status.initialized) {
      throw new Error('委员会未初始化');
    }
    
    this.status.lastSignalTime = new Date();
    this.status.signalsProcessed++;
    
    console.log('处理信号 #' + this.status.signalsProcessed + ': ' + (signal.type || 'unknown'));
    
    // 收集各成员的分析意见
    const memberAnalyses = [];
    
    // 1. Twitter监控器分析信号来源
    if (this.members.twitter) {
      const twitterAnalysis = await this.members.twitter.analyzeSignal(signal);
      memberAnalyses.push({
        member: 'twitter',
        analysis: twitterAnalysis,
        confidence: twitterAnalysis.confidence || 0.5
      });
    }
    
    // 2. Gemini技术分析
    if (this.members.gemini) {
      const geminiAnalysis = await this.members.gemini.analyzeSignal(signal);
      memberAnalyses.push({
        member: 'gemini',
        analysis: geminiAnalysis,
        confidence: geminiAnalysis.confidence || 0.5
      });
    }
    
    // 3. 决策引擎综合评估
    const committeeDecision = await this.decisionEngine.evaluate(memberAnalyses, signal);
    
    // 4. 记录决策
    this.status.decisionsMade++;
    
    // 5. 在Moltbook分享重要决策
    if (committeeDecision.confidence >= this.config.decisionThreshold) {
      await this.shareDecisionOnMoltbook(signal, committeeDecision, memberAnalyses);
    }
    
    return {
      signal,
      memberAnalyses,
      committeeDecision,
      timestamp: new Date(),
      committeeStats: this.status
    };
  }
  
  // 在Moltbook分享决策
  async shareDecisionOnMoltbook(signal, decision, memberAnalyses) {
    if (!this.moltbookClient) return;
    
    try {
      const analysisSummary = memberAnalyses.map(a => 
        a.member + ': ' + (a.analysis.recommendation || '无建议') + ' (置信度: ' + (a.confidence * 100).toFixed(1) + '%)'
      ).join('\\n');
      
      const post = {
        submolt_name: 'general',
        title: 'AI委员会交易信号分析 #' + this.status.decisionsMade,
        content: '信号分析报告。信号类型: ' + (signal.type || '未知') + 
                 '。信号来源: ' + (signal.source || '未知') + 
                 '。检测时间: ' + new Date().toLocaleString() + 
                 '。委员会分析: ' + analysisSummary + 
                 '。最终决策: ' + (decision.recommendation || '保持观望') + 
                 '。委员会置信度: ' + (decision.confidence * 100).toFixed(1) + '%' +
                 '。风险评估: ' + (decision.riskLevel || '中等') + 
                 '。#trading-signal #ai-analysis #crypto #arbitragenova'
      };
      
      await this.moltbookClient.createPost(post);
      console.log('决策分析已分享到Moltbook');
      
    } catch (error) {
      console.warn('无法分享决策到Moltbook:', error.message);
    }
  }
  
  // 获取委员会状态
  getStatus() {
    const membersStatus = {};
    Object.keys(this.members).forEach(key => {
      membersStatus[key] = this.members[key] ? 'active' : 'inactive';
    });
    
    return {
      committee: this.config.committeeName,
      status: this.status,
      members: membersStatus,
      config: this.config,
      uptime: this.status.startTime ? 
        Date.now() - new Date(this.status.startTime).getTime() : 0
    };
  }
  
  // 开始监控循环
  startMonitoring(interval = 60000) {
    console.log('开始监控循环，间隔: ' + interval + 'ms');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        // 1. 从Twitter获取新信号
        if (this.members.twitter) {
          const signals = await this.members.twitter.getLatestSignals();
          
          // 2. 处理每个信号
          for (const signal of signals.slice(0, 3)) {
            await this.processSignal(signal);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        // 3. 定期报告状态
        if (this.status.signalsProcessed % 5 === 0) {
          await this.postStatusUpdate();
        }
        
      } catch (error) {
        console.error('监控循环错误:', error.message);
      }
    }, interval);
  }
  
  // 发布状态更新
  async postStatusUpdate() {
    if (!this.moltbookClient) return;
    
    try {
      const status = this.getStatus();
      const post = {
        submolt_name: 'general',
        title: 'AI委员会运行状态报告 #' + Math.floor(status.status.signalsProcessed / 5),
        content: '委员会运行状态。运行时间: ' + Math.floor(status.uptime / 3600000) + '小时' + 
                 Math.floor((status.uptime % 3600000) / 60000) + '分钟。' +
                 '处理信号: ' + status.status.signalsProcessed + '个。' +
                 '做出决策: ' + status.status.decisionsMade + '次。' +
                 '成员状态: ' + Object.entries(status.members).map(([k, v]) => k + ': ' + v).join(', ') + 
                 '。当前配置: 投票算法: ' + status.config.votingAlgorithm + 
                 '，决策阈值: ' + (status.config.decisionThreshold * 100) + '%' +
                 '。#ai-trading #status-update #arbitragenova'
      };
      
      await this.moltbookClient.createPost(post);
      
    } catch (error) {
      console.warn('无法发布状态更新:', error.message);
    }
  }
  
  // 停止监控
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('监控循环已停止');
    }
  }
}

// 导出单例实例
let committeeInstance = null;

function getCommittee() {
  if (!committeeInstance) {
    committeeInstance = new AITradingCommittee();
  }
  return committeeInstance;
}

module.exports = { AITradingCommittee, getCommittee };
