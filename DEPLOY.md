# Luna 部署指南


## 🚀 快速部署步骤


### 1. 构建项目

```bash
npm run build
```

### 2. 部署到 Firebase

```bash
# 部署 Firestore 规则
firebase deploy --only firestore:rules

# 部署托管（前端）
firebase deploy --only hosting
```

## 📁 重要文件说明

| 文件 | 说明 |
|------|------|
| `firebase.json` | Firebase 配置文件，已配置好托管和 Firestore |
| `firestore.rules` | Firestore 安全规则 |
| `next.config.ts` | Next.js 配置，已配置静态导出到 `dist` 目录 |

## 🔧 配置检查清单

- [x] `firebase.json` - 已配置 `site: "luna-11-02"`
- [x] `next.config.ts` - 已配置 `output: 'export'` 和 `distDir: 'dist'`
- [x] `firestore.rules` - 已配置完整的安全规则

## 📋 部署验证

部署完成后，访问以下 URL 验证：

1. **首页**: `https://luna-11-02.web.app`
2. **后台管理**: `https://luna-11-02.web.app/admin`
3. **支付测试**: 商品详情页应只显示 USDT 支付方式

## 🆘 故障排查

### 如果构建失败

```bash
# 清理缓存
rm -rf .next dist

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### 如果部署失败

```bash
# 检查 Firebase 登录状态
firebase login

# 检查项目配置
firebase use --add

# 重新部署
firebase deploy --only hosting
```

## 🎉 完成！


部署成功后，你的 C2C 交易平台就可以通过 `https://luna-11-02.web.app` 访问了！
