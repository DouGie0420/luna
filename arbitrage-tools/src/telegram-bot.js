// telegram-bot.js - 简化的Telegram Bot实现
const axios = require('axios');

class TelegramBot {
  constructor(config = {}) {
    this.token = config.token || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = config.chatId || process.env.TELEGRAM_CHAT_ID;
    this.baseUrl = https://api.telegram.org/bot;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000
    });
    
    if (!this.token || !this.chatId) {
      console.warn('Telegram Bot配置不完整');
    }
  }
  
  async sendMessage(text, options = {}) {
    if (!this.token || !this.chatId) {
      console.warn('无法发送Telegram消息：缺少配置');
      return false;
    }
    
    try {
      const params = {
        chat_id: this.chatId,
        text: text,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview || true,
        disable_notification: options.disable_notification || false
      };
      
      const response = await this.client.post('/sendMessage', params);
      
      if (response.data.ok) {
        console.log('Telegram消息已发送');
        return { success: true, messageId: response.data.result.message_id };
      } else {
        console.error('Telegram API错误:', response.data.description);
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      console.error('发送Telegram消息失败:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  async testConnection() {
    if (!this.token) {
      console.error('未配置Telegram Bot Token');
      return { success: false, error: 'No token' };
    }
    
    try {
      const response = await this.client.get('/getMe');
      
      if (response.data.ok) {
        const botInfo = response.data.result;
        console.log(Telegram Bot: @);
        return { success: true, bot: botInfo };
      } else {
        console.error('Telegram连接失败:', response.data.description);
        return { success: false, error: response.data.description };
      }
    } catch (error) {
      console.error('Telegram连接测试失败:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = TelegramBot;
