// telegram-test.js - Telegram Bot配置测试
require('dotenv').config();

const TelegramBot = require('./src/telegram-bot.js');

async function testTelegramBot() {
  console.log('=== Telegram Bot配置测试 ===');
  
  // 检查环境变量
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || token === 'your_telegram_bot_token') {
    console.error('❌ 未配置 TELEGRAM_BOT_TOKEN');
    console.log('请编辑 .env 文件，设置正确的Bot Token');
    return false;
  }
  
  if (!chatId || chatId === 'your_chat_id') {
    console.error('❌ 未配置 TELEGRAM_CHAT_ID');
    console.log('请编辑 .env 文件，设置正确的Chat ID');
    return false;
  }
  
  console.log('✅ 环境变量检查通过');
  console.log(Token: ...);
  console.log(Chat ID: );
  
  // 测试Bot连接
  const bot = new TelegramBot();
  console.log('\n测试Bot连接...');
  
  const connectionResult = await bot.testConnection();
  
  if (!connectionResult.success) {
    console.error('❌ Bot连接测试失败');
    console.error(错误: );
    return false;
  }
  
  console.log('✅ Bot连接测试成功');
  
  // 测试消息发送
  console.log('\n测试消息发送...');
  
  const testMessages = [
    {
      text: '🤖 交易系统Telegram Bot测试成功！',
      type: 'info'
    },
    {
      text: '📊 <b>系统状态</b>\n\n✅ 所有组件运行正常\n🕐 ' + new Date().toLocaleString(),
      options: { parse_mode: 'HTML' }
    }
  ];
  
  for (const message of testMessages) {
    const result = await bot.sendMessage(message.text, message.options || {});
    
    if (!result.success) {
      console.error(❌ 消息发送失败: );
      return false;
    }
    
    console.log(✅ 消息发送成功 (ID: ));
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
  }
  
  console.log('\n🎉 所有测试通过！');
  console.log('你的Telegram Bot已成功配置并可以接收交易通知。');
  
  return true;
}

// 运行测试
if (require.main === module) {
  testTelegramBot()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = testTelegramBot;
