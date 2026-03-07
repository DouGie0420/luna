# Firebase 部署指南

## 1. 部署 Firestore 规则

```bash
firebase deploy --only firestore:rules
```

## 2. 初始化 Firestore 数据

在 Firebase Console 中创建以下文档：

### settings/global
```json
{
  "paymentMethods": {
    "usdt": true,
    "alipay": false,
    "wechat": false,
    "promptpay": false
  }
}
```

### announcements/live
```json
{
  "title": "系统公告",
  "content": "欢迎访问 Luna C2C 交易平台！"
}
```

## 3. 构建并部署前端

```bash
npm run build
firebase deploy --only hosting
```

## 4. 部署 Functions (可选)

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## 注意事项

1. 确保 Firebase CLI 已登录：`firebase login`
2. 确保项目已初始化：`firebase use <project-id>`
3. Functions 部署需要配置环境变量（私钥等敏感信息）
