# ⚡ Luna网站快速启动指南

**最后更新：** 2026-03-02 02:05

---

## 🎯 5分钟快速测试

### 1. 启动开发服务器

```bash
cd "G:\Luna Website"
npm run dev
```

等待编译完成（约10秒），然后访问：
- 首页：http://localhost:3000
- Checkout页面：http://localhost:3000/products/test/checkout

### 2. 测试核心功能

**PWA安装提示：**
- 查看右下角的安装提示
- 点击"🔍 Run PWA Test"
- 检查所有测试项

**钱包连接：**
- 点击"Connect Wallet"
- 选择MetaMask或WalletConnect
- 切换到Base Mainnet

**Checkout页面：**
- 访问任意产品的checkout页面
- 测试地址选择
- 测试运输方式
- 查看订单摘要

---

## 🚀 10分钟部署到生产

### 方法1：Vercel CLI（推荐）

```bash
# 1. 安装Vercel CLI（如果还没有）
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
cd "G:\Luna Website"
vercel --prod
```

### 方法2：GitHub自动部署

```bash
# 1. 提交代码
git add .
git commit -m "Ready for production"
git push origin main

# 2. 在Vercel中连接GitHub仓库
# 3. 自动部署
```

---

## 📋 部署前检查清单

### 必须配置的环境变量

在Vercel Dashboard或.env.production中配置：

```bash
# Firebase（必需）
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# FCM推送（必需）
NEXT_PUBLIC_VAPID_KEY=

# Web3（必需）
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_USDT_ADDRESS=
NEXT_PUBLIC_ESCROW_ADDRESS=

# WalletConnect（必需）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

### 可选配置

```bash
# Google Analytics
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# 其他API密钥
```

---

## 🧪 部署后测试步骤

### 1. PWA安装（2分钟）

```
1. 访问生产URL（HTTPS）
2. 打开Chrome DevTools
3. 检查Application → Manifest
4. 检查Service Workers
5. 点击地址栏的安装图标
6. 测试安装流程
```

### 2. Web3功能（5分钟）

```
1. 连接MetaMask
2. 切换到Base Mainnet
3. 访问产品页面
4. 点击"Buy Now"
5. 测试USDT授权
6. 测试支付流程
```

### 3. FCM推送（3分钟）

```
1. 允许通知权限
2. 发送测试消息
3. 验证通知到达
4. 测试点击通知跳转
```

---

## 🐛 常见问题快速修复

### 构建失败

```bash
# 清除缓存
rm -rf .next node_modules
npm install
npm run build
```

### 环境变量不生效

```bash
# 检查变量名
# 客户端变量必须以NEXT_PUBLIC_开头

# 重启开发服务器
npm run dev
```

### PWA不显示安装提示

```bash
# 1. 确保在HTTPS环境（或localhost）
# 2. 清除浏览器缓存
# 3. 注销Service Worker
# 4. 刷新页面
```

### 钱包连接失败

```bash
# 1. 确认MetaMask已安装
# 2. 检查网络配置
# 3. 查看浏览器控制台错误
# 4. 尝试刷新页面
```

---

## 📊 性能检查

### Lighthouse测试

```bash
# Chrome DevTools
1. 打开DevTools (F12)
2. 切换到Lighthouse标签
3. 选择"Desktop"或"Mobile"
4. 点击"Analyze page load"
5. 等待测试完成

目标分数：
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+
- PWA: 100
```

### 构建分析

```bash
# 查看打包大小
npm run build

# 检查输出
# First Load JS应该 < 200kB
```

---

## 🔧 开发工具

### 推荐的VS Code扩展

```
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- GitLens
```

### 有用的命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 启动生产服务器
npm start

# 类型检查
npx tsc --noEmit

# Lint检查
npm run lint

# 格式化代码
npm run format
```

---

## 📞 获取帮助

### 查看日志

**开发环境：**
- 浏览器控制台（F12）
- 终端输出

**生产环境：**
- Vercel Dashboard → Logs
- Firebase Console → Logs
- Browser Console

### 调试工具

**PWA调试：**
```
Chrome DevTools → Application
- Manifest
- Service Workers
- Storage
- Cache Storage
```

**Web3调试：**
```
MetaMask → Activity
- 查看交易历史
- 检查网络状态
```

**Firebase调试：**
```
Firebase Console
- Firestore数据
- Authentication
- Cloud Messaging
```

---

## 🎉 成功指标

部署成功后，你应该看到：

- ✅ 网站可以访问
- ✅ PWA可以安装
- ✅ 钱包可以连接
- ✅ 支付流程正常
- ✅ 推送通知工作
- ✅ 所有页面加载正常
- ✅ 图片正常显示
- ✅ 聊天系统工作

---

## 📝 下一步

完成基础部署后：

1. **优化性能**
   - 压缩图片
   - 启用CDN
   - 优化数据库查询

2. **增强安全**
   - 配置CSP
   - 启用CORS
   - 审查Firebase规则

3. **监控和分析**
   - 设置Google Analytics
   - 配置错误追踪
   - 监控性能指标

4. **用户测试**
   - 邀请测试用户
   - 收集反馈
   - 迭代改进

---

**🚀 准备好了！开始测试和部署吧！**

*需要帮助？查看 DEPLOYMENT_GUIDE.md 获取详细信息*
