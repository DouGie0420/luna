# 🚀 Luna网站快速部署指南

**时间：** 2026-03-02 07:20  
**预计时间：** 15分钟

---

## 方法1：Vercel CLI部署（推荐）

### 步骤1：登录Vercel（正在进行中）

当前状态：等待浏览器授权

**请完成以下操作：**
1. 打开浏览器
2. 访问：https://vercel.com/oauth/device?user_code=KCNC-DJSP
3. 登录Vercel账号
4. 授权设备

### 步骤2：部署项目

登录成功后，在终端运行：

```bash
cd "G:\Luna Website"
vercel --prod
```

按照提示操作：
- Set up and deploy? → Yes
- Which scope? → 选择你的账号
- Link to existing project? → No（首次部署）
- What's your project's name? → luna-website（或其他名称）
- In which directory is your code located? → ./
- Want to override the settings? → No

等待部署完成（约3-5分钟）

### 步骤3：配置环境变量

部署完成后：

1. 访问 https://vercel.com/dashboard
2. 选择你的项目
3. 进入 Settings → Environment Variables
4. 打开 `VERCEL_ENV_VARS.txt` 文件
5. 逐个添加所有环境变量
6. Environment选择：Production, Preview, Development（全选）
7. 保存

### 步骤4：重新部署

配置环境变量后：

```bash
vercel --prod
```

或在Vercel Dashboard点击"Redeploy"

---

## 方法2：GitHub自动部署（更简单）

### 步骤1：推送到GitHub

```bash
cd "G:\Luna Website"
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 步骤2：连接Vercel

1. 访问 https://vercel.com/new
2. 点击"Import Git Repository"
3. 选择你的GitHub仓库
4. 点击"Import"

### 步骤3：配置项目

- Framework Preset: Next.js
- Root Directory: ./
- Build Command: npm run build
- Output Directory: .next
- Install Command: npm install

点击"Deploy"

### 步骤4：配置环境变量

部署完成后：
1. 进入项目设置
2. Environment Variables
3. 添加 `VERCEL_ENV_VARS.txt` 中的所有变量
4. 重新部署

---

## 方法3：Vercel Dashboard手动导入

### 步骤1：访问Vercel

https://vercel.com/new

### 步骤2：导入项目

- 选择"Import Git Repository"
- 或者"Deploy from CLI"

### 步骤3：配置和部署

按照界面提示操作

---

## 📋 部署后检查清单

### 立即检查

- [ ] 访问部署URL
- [ ] 检查首页是否正常显示
- [ ] 测试用户注册/登录
- [ ] 测试产品浏览

### PWA测试

- [ ] 打开Chrome DevTools
- [ ] Application → Manifest（检查manifest.json）
- [ ] Application → Service Workers（检查SW注册）
- [ ] 点击地址栏安装图标
- [ ] 测试PWA安装

### FCM测试

- [ ] 允许通知权限
- [ ] 发送测试消息
- [ ] 验证通知到达
- [ ] 测试点击通知跳转

### 功能测试

- [ ] 钱包连接
- [ ] USDT余额查询
- [ ] 聊天功能
- [ ] 产品发布
- [ ] 订单创建

---

## 🎯 部署URL

部署完成后，你会获得一个URL：

```
https://luna-website-xxx.vercel.app
```

或者自定义域名：

```
https://your-domain.com
```

---

## 🆘 如果遇到问题

### 问题1：部署失败

```bash
# 清除缓存
rm -rf .next node_modules
npm install
npm run build

# 重新部署
vercel --prod
```

### 问题2：环境变量不生效

- 确保变量名正确（NEXT_PUBLIC_前缀）
- 在Vercel Dashboard重新配置
- 重新部署

### 问题3：页面404

- 检查路由配置
- 查看Vercel部署日志
- 确认构建成功

### 问题4：PWA不工作

- 确保在HTTPS环境
- 清除浏览器缓存
- 检查Service Worker状态

---

## 📞 获取部署URL

部署成功后，Vercel会显示：

```
✅ Production: https://luna-website-xxx.vercel.app
```

复制这个URL，然后：

1. 在浏览器中打开
2. 测试PWA安装
3. 测试FCM推送
4. 验证所有功能

---

## 🎊 部署完成后

**立即测试：**
1. PWA安装
2. FCM推送通知
3. 所有核心功能

**然后：**
1. 部署智能合约
2. 配置合约地址
3. 测试USDT支付

---

**🚀 现在开始部署吧！**

**当前状态：等待Vercel登录授权**

**下一步：完成浏览器授权，然后运行 `vercel --prod`**
