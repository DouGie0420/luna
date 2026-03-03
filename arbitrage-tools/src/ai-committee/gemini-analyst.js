// Gemini分析师模块
const axios = require( axios);

class GeminiAnalyst {
  constructor(config) {
    this.config = config;
    this.apiKey = config.api_key;
    this.model = config.model || gemini-2.5;
    this.baseURL = https://generativelanguage.googleapis.com/v1beta;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000
    });
    
    console.log(Gemini分析师初始化: );
  }
  
  // 分析交易信号
  async analyzeSignal(signal) {
    console.log(Gemini分析信号: );
    
    try {
      const prompt = this.buildAnalysisPrompt(signal);
      
      const response = await this.client.post(
        /models/:generateContent?key=,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 500
          }
        }
      );
      
      const analysis = this.parseGeminiResponse(response.data, signal);
      console.log(Gemini分析完成: );
      
      return analysis;
      
    } catch (error) {
      console.error(Gemini分析失败:, error.message);
      return this.getFallbackAnalysis(signal);
    }
  }
}
