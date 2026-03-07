# 🎯 环境变量配置 - 3分钟完成

## 方法1：手动复制粘贴（最简单）

### 步骤1：打开Vercel页面
访问：https://vercel.com/0xgoats-projects/luna-marketplace/settings/environment-variables

### 步骤2：逐个添加（共17个变量）

点击 **"Add Environment Variable"**，然后复制粘贴：

---

**变量1：**
- Key: `NEXT_PUBLIC_FIREBASE_API_KEY`
- Value: `AIzaSyApj0czmABuH-DSztmM5fr1x2xJAnEUgJI`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量2：**
- Key: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- Value: `studio-5896500485-92a21.firebaseapp.com`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量3：**
- Key: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- Value: `studio-5896500485-92a21`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量4：**
- Key: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- Value: `studio-5896500485-92a21.appspot.com`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量5：**
- Key: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- Value: `163118389786`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量6：**
- Key: `NEXT_PUBLIC_FIREBASE_APP_ID`
- Value: `1:163118389786:web:d826f2db9cc9b3cb140fa3`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量7：**
- Key: `NEXT_PUBLIC_FCM_VAPID_KEY`
- Value: `BF5GP6gHehfXD-QtzzYJ-UG4TXK1Ka470rprlLtSrpAhaxhH1MwHvipLAXeARNEP09eWtEEF6MjyBWZwGH0k5Ac`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量8：**
- Key: `NEXT_PUBLIC_WC_PROJECT_ID`
- Value: `82acb0de1a1f61579bdadee65e01cf50`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量9：**
- Key: `GOOGLE_GENAI_API_KEY`
- Value: `AIzaSyAFTW4rMfnYFUIAKB4vCeDXZmVf-e86emU`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量10：**
- Key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Value: `AIzaSyAFTW4rMfnYFUIAKB4vCeDXZmVf-e86emU`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量11：**
- Key: `GEMINI_API_KEY`
- Value: `AIzaSyDMVm7SE0VwVm7nd6T62x-TTUoU8TIRiQE`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量12：**
- Key: `NEXT_PUBLIC_CHAIN_ID`
- Value: `8453`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量13：**
- Key: `NEXT_PUBLIC_USDT_ADDRESS`
- Value: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量14：**
- Key: `NEXT_PUBLIC_ALCHEMY_API_KEY`
- Value: `i2W8Dk47iLGaEhcRcwkFl`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量15：**
- Key: `OPENAI_API_KEY`
- Value: `sk-sk-7dd34d7fb24f47368556e17365918fed`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量16：**
- Key: `OPENAI_BASE_URL`
- Value: `https://api.deepseek.com/v1`
- Environment: ✅ Production ✅ Preview ✅ Development

---

**变量17：**
- Key: `OPENAI_MODEL`
- Value: `openai/deepseek-chat`
- Environment: ✅ Production ✅ Preview ✅ Development

---

## 完成后

1. 返回项目首页：https://vercel.com/0xgoats-projects/luna-marketplace
2. 点击 **"Redeploy"** 按钮
3. 等待重新部署完成（约2-3分钟）
4. 访问 https://luna-marketplace-ten.vercel.app 测试

---

## 方法2：使用.env.production文件

如果Vercel支持导入：

1. 在Vercel Dashboard找到 "Import" 或 "Bulk Add" 按钮
2. 上传项目中的 `.env.production` 文件
3. 保存并重新部署

---

**🎯 添加完所有变量后告诉我，我会帮你重新部署！**
