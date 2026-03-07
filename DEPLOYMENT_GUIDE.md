# 🚀 Luna网站部署指南

**最后更新：** 2026-03-02 02:00

---

## ✅ 部署前检查清单

### 代码状态
- [x] 构建成功（0错误，0警告）
- [x] TypeScript编译通过
- [x] 所有页面正常渲染
- [x] PWA配置完整

### 环境变量配置

需要在生产环境配置以下变量：

```bash
# Firebase配置
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# FCM推送通知
NEXT_PUBLIC_VAPID_KEY=your_vapid_key

# Web3配置
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_USDT_ADDRESS=your_usdt_address
NEXT_PUBLIC_ESCROW_ADDRESS=your_escrow_address

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

---

## 📦 Vercel部署（推荐）

### 方法1：通过CLI部署

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署到生产环境
vercel --prod
```

### 方法2：通过GitHub集成

1. 访问 https://vercel.com
2. 点击"Import Project"
3. 连接GitHub仓库
4. 配置环境变量
5. 点击"Deploy"

### Vercel配置

在项目根目录创建 `vercel.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "env": {
    "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase-api-key",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN": "@firebase-auth-domain"
  }
}
```

---

## 🐳 Docker部署

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

# 依赖安装
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t luna-website .

# 运行容器
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY=your_key \
  luna-website
```

---

## 🔥 Firebase Hosting部署

### 1. 安装Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 2. 初始化Firebase

```bash
firebase init hosting
```

选择：
- 使用现有项目
- Public directory: `out`
- Configure as SPA: Yes
- Set up automatic builds: No

### 3. 配置next.config.ts

添加静态导出：

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  // ... 其他配置
};
```

### 4. 构建和部署

```bash
npm run build
firebase deploy --only hosting
```

---

## ⚙️ 环境变量管理

### 开发环境 (.env.local)

```bash
# 已存在，用于本地开发
```

### 生产环境 (.env.production)

创建此文件并添加生产环境变量：

```bash
# Firebase生产配置
NEXT_PUBLIC_FIREBASE_API_KEY=prod_key
# ... 其他生产变量
```

### Vercel环境变量

在Vercel Dashboard中：
1. 进入项目设置
2. 点击"Environment Variables"
3. 添加所有必需的变量
4. 选择环境：Production / Preview / Development

---

## 🧪 部署后测试

### 1. PWA安装测试

```bash
# 访问生产URL
https://your-domain.vercel.app

# 检查：
- Chrome地址栏是否显示安装图标
- Service Worker是否注册成功
- manifest.json是否加载正确
```

### 2. Web3功能测试

```bash
# 测试钱包连接
- MetaMask连接
- WalletConnect连接
- 网络切换到Base Mainnet

# 测试USDT支付
- 授权USDT
- 锁定资金到托管合约
- 验证交易记录
```

### 3. FCM推送测试

```bash
# 测试推送通知
- 允许通知权限
- 发送测试消息
- 验证通知到达
```

### 4. 性能测试

使用Lighthouse测试：
```bash
# Chrome DevTools
- 打开DevTools
- 切换到Lighthouse标签
- 运行测试
- 目标分数：90+
```

---

## 🔒 安全检查

### SSL/TLS证书
- [x] Vercel自动提供
- [ ] 自定义域名需要配置

### 环境变量
- [ ] 不要在代码中硬编码密钥
- [ ] 使用环境变量管理敏感信息
- [ ] 定期轮换API密钥

### Firebase安全规则
- [ ] 检查Firestore规则
- [ ] 检查Storage规则
- [ ] 限制API访问

---

## 📊 监控和分析

### 推荐工具

1. **Vercel Analytics**
   - 自动集成
   - 实时性能监控

2. **Google Analytics**
   - 已配置（NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID）
   - 用户行为分析

3. **Sentry**（可选）
   ```bash
   npm install @sentry/nextjs
   ```

4. **LogRocket**（可选）
   - 会话回放
   - 错误追踪

---

## 🐛 常见问题

### 构建失败

```bash
# 清除缓存重试
rm -rf .next node_modules
npm install
npm run build
```

### 环境变量未生效

```bash
# 检查变量名前缀
# 客户端变量必须以NEXT_PUBLIC_开头
```

### PWA不工作

```bash
# 检查HTTPS
# PWA只在HTTPS环境工作（localhost除外）

# 清除Service Worker
# Chrome DevTools → Application → Service Workers → Unregister
```

### 图片加载失败

```bash
# 检查next.config.ts中的remotePatterns
# 确保图片域名已添加
```

---

## 📝 部署后任务

- [ ] 配置自定义域名
- [ ] 设置DNS记录
- [ ] 配置CDN（Vercel自带）
- [ ] 设置监控告警
- [ ] 配置备份策略
- [ ] 文档更新
- [ ] 团队培训

---

## 🎯 性能优化建议

### 图片优化
```bash
# 使用Next.js Image组件
import Image from 'next/image'

# 启用图片优化
<Image src="/image.jpg" width={500} height={300} alt="..." />
```

### 代码分割
```bash
# 已实现懒加载
# 见src/app/layout.tsx
```

### 缓存策略
```bash
# Service Worker已配置
# 见public/sw.js
```

---

## 📞 支持

遇到问题？
1. 检查构建日志
2. 查看Vercel部署日志
3. 检查浏览器控制台
4. 查看Firebase日志

---

**🌟 准备就绪！可以部署了！**
