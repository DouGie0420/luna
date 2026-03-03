# Firestore 配置指南

## 初始化配置

在 Firebase Console 的 Firestore 中创建以下文档：

### 1. 支付通道配置

**路径**: `settings/global`

```json
{
  "paymentMethods": {
    "usdt": true,
    "alipay": false,
    "wechat": false,
    "promptpay": false
  },
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

### 2. 系统公告

**路径**: `announcements/live`

```json
{
  "title": "系统公告",
  "content": "欢迎访问 Luna C2C 交易平台！",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

### 3. 首页轮播配置

**路径**: `configs/home_carousel`

```json
{
  "count": 5,
  "items": [
    {
      "title": "欢迎来到 Luna",
      "desc": "Web3 C2C 交易平台",
      "img": "/banner1.jpg",
      "link": "/products"
    }
  ],
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

### 4. 认证商户列表

**路径**: `configs/verified_merchants`

```json
{
  "fixedMerchantIds": [],
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

### 5. 社区推荐

**路径**: `configs/community_recommendations`

```json
{
  "mediumPostIds": [],
  "smallPostIds": [],
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

## Firestore 安全规则

使用提供的 `firestore.rules` 文件已配置好完整规则。

部署命令：

```bash
firebase deploy --only firestore:rules
```

## 验证配置

1. 访问后台 `/admin/promotions`
2. 检查支付通道开关是否正常工作
3. 验证公告发布功能
4. 测试轮播图配置

## 故障排查

如果遇到权限错误：

1. 确认已正确部署 Firestore 规则
2. 检查用户角色是否设置正确（admin/ghost/staff/support）
3. 验证 Firestore 文档路径是否正确
