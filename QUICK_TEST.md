# ⚡ 快速测试清单

**测试URL：** https://luna-marketplace-ten.vercel.app

---

## 🎯 5分钟快速测试

### 1. PWA安装（2分钟）

✅ **步骤：**
1. 访问 https://luna-marketplace-ten.vercel.app
2. 查看Chrome地址栏右侧是否有安装图标
3. 点击安装图标
4. 确认安装

✅ **成功标志：**
- 打开独立窗口
- 没有浏览器地址栏
- 看起来像原生应用

---

### 2. FCM推送通知（2分钟）

✅ **步骤：**
1. 网站会请求通知权限
2. 点击"允许"
3. 在右下角PWA调试面板点击"Send Test Notification"
4. 查看是否收到通知

✅ **成功标志：**
- 收到测试通知
- 通知显示"Test Notification"

---

### 3. 核心功能（1分钟）

✅ **快速检查：**
- [ ] 页面正常显示
- [ ] 没有明显错误
- [ ] 可以浏览产品
- [ ] 可以点击Connect Wallet

---

## 🐛 如果遇到问题

### PWA安装图标不显示
→ 等待10秒，或刷新页面

### 通知权限被拒绝
→ 点击地址栏锁图标 → 通知 → 允许

### 页面报错
→ 按F12查看Console错误，截图给我

---

## 📊 测试结果

完成测试后，告诉我：
- ✅ PWA安装：成功/失败
- ✅ FCM推送：成功/失败
- ✅ 核心功能：正常/异常

---

**🚀 等部署完成后就开始测试吧！**

**部署状态查看：**
https://vercel.com/0xgoats-projects/luna-marketplace/deployments
