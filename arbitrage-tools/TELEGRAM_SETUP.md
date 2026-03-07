# 🚀 Telegram Bot配置指南

## 创建Telegram Bot步骤

### 1. 创建新的Bot
1. 打开Telegram，搜索 **@BotFather**
2. 发送 /newbot 命令
3. 按照提示设置：
   - Bot名称（例如：CryptoArbitrageBot）
   - Bot用户名（必须以ot结尾，例如：crypto_arbitrage_bot）

### 2. 获取Bot Token
Bot创建成功后，@BotFather会提供一个Token，格式如下：
`
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
`
**重要**：这个Token是你的Bot密码，不要泄露！

### 3. 获取Chat ID
#### 方法A：个人聊天
1. 给你的Bot发送一条消息（例如：/start）
2. 访问：https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
3. 在响应中找到chat.id字段

#### 方法B：使用脚本
`ash
curl -s https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates | jq '.result[0].message.chat.id'
`

#### 方法C：群组/频道
1. 将Bot添加到群组/频道
2. 获取群组ID：-1001234567890（负号表示群组）

### 4. 配置环境变量
编辑 .env 文件：
`env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
TELEGRAM_CHAT_ID=987654321
`

### 5. 测试Bot连接
`ash
# 测试连接
node src/telegram-test.js

# 或通过主系统测试
npm start monitor
`

## 📱 Bot功能

### 接收的通知类型
1. **交易信号**：Twitter和技术指标信号
2. **套利机会**：Polymarket价格错配
3. **交易结果**：盈亏报告
4. **系统状态**：余额、胜率等统计
5. **紧急警报**：余额过低、API错误等

### 消息格式示例
`
📈 <b>交易信号警报</b>

<b>类型：</b>做多
<b>来源：</b>Twitter
<b>价格：</b>,231.50
<b>置信度：</b>85.5%
<b>时间：</b>14:30

<b>信号详情：</b>
Bitcoin looks bullish for the next 5 minutes...

#交易信号 #long #Twitter
`

## 🔧 高级配置

### 1. 设置Webhook（可选）
`ash
# 设置Webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H  Content-Type: application/json \
  -d '\url\:\https://your-server.com/webhook\}'
`

### 2. 自定义命令
通过 @BotFather 设置：
`
/start - 启动Bot
/status - 查看系统状态
/stats - 查看交易统计
/stop - 停止系统（需要验证）
`

### 3. 权限设置
- **群组权限**：限制Bot在群组中的操作
- **隐私模式**：防止Bot读取群组消息
- **管理权限**：如果需要删除消息等

## 🛡️ 安全建议

### 1. Token安全
- ✅ 使用环境变量，不要硬编码
- ✅ 定期轮换Token（通过@BotFather）
- ✅ 限制IP访问（如果有服务器）

### 2. 访问控制
- ✅ 只允许信任的Chat ID接收消息
- ✅ 设置命令白名单
- ✅ 记录所有Bot活动

### 3. 数据隐私
- 🔒 Bot不会存储敏感交易信息
- 🔒 所有通信通过HTTPS加密
- 🔒 定期清理旧消息

## 🚨 故障排除

### 常见问题
1. **Bot was blocked by the user**
   - 用户屏蔽了Bot，需要用户解除屏蔽

2. **Chat not found**
   - Chat ID错误或Bot不在该聊天中

3. **Not enough rights**
   - 在群组中权限不足，需要管理员权限

4. **Message is too long**
   - Telegram限制4096字符，分割消息

### 调试命令
`ash
# 检查Bot信息
curl https://api.telegram.org/bot<TOKEN>/getMe

# 查看最近的更新
curl https://api.telegram.org/bot<TOKEN>/getUpdates

# 发送测试消息
curl -X POST https://api.telegram.org/bot<TOKEN>/sendMessage \
  -d chat_id=<CHAT_ID> \
  -d text=Test message
`

## 📚 API参考

### 核心方法
- sendMessage - 发送文本消息
- sendPhoto - 发送图片
- sendDocument - 发送文件
- editMessageText - 编辑消息
- deleteMessage - 删除消息

### 消息格式选项
`javascript
{
  parse_mode: HTML,  // 或 MarkdownV2
  disable_web_page_preview: true,
  disable_notification: false,
  reply_to_message_id: 123,
  reply_markup: { ... } // 内联键盘
}
`

### 内联键盘示例
`javascript
{
  reply_markup: {
    inline_keyboard: [
      [
        { text: ✅ 确认交易, callback_data: confirm_trade },
        { text: ❌ 取消, callback_data: cancel_trade }
      ]
    ]
  }
}
`

## 🎯 最佳实践

### 1. 消息频率控制
- 高置信度信号：立即通知
- 低置信度信号：静默发送（disable_notification: true）
- 状态报告：每小时一次
- 紧急警报：总是通知

### 2. 用户体验
- 使用表情符号增强可读性
- 重要信息加粗（<b>标签）
- 包含时间戳和来源
- 提供相关标签便于搜索

### 3. 监控和维护
- 监控Bot运行状态
- 定期检查Token有效期
- 更新依赖库
- 备份配置

## 🔗 有用链接

- [官方Bot API文档](https://core.telegram.org/bots/api)
- [@BotFather](https://t.me/botfather)
- [Bot API库列表](https://core.telegram.org/bots/samples)
- [Telegram Bot开发社区](https://t.me/BotTalk)

## ⚡ 快速开始脚本

创建一个 setup-telegram.bat 文件：
`atch
@echo off
echo === Telegram Bot配置工具 ===
echo.
echo 请按照以下步骤操作：
echo 1. 打开Telegram，搜索 @BotFather
echo 2. 发送 /newbot 创建新Bot
echo 3. 复制Token到下面的输入
echo.
set /p TOKEN=请输入Bot Token: 
set /p CHAT_ID=请输入Chat ID: 

echo TELEGRAM_BOT_TOKEN=%TOKEN% > .env
echo TELEGRAM_CHAT_ID=%CHAT_ID% >> .env

echo.
echo ✅ 配置完成！
echo 运行 npm start 测试Bot连接
pause
`

---

**重要提示**：Bot只是通知工具，所有交易决策由系统自动执行。确保理解并接受交易风险。
