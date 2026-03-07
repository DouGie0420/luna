# 🎯 寄售功能实施方案

**时间：** 2026-03-02 14:50  
**目标：** 添加官方寄售分类和审核流程

---

## 📋 需求分析

### 寄售功能特点

**什么是寄售：**
- 官方认证的高端商品
- 需要通过严格审核
- 由平台担保真实性
- 更高的信任度

**寄售流程：**
```
1. 用户发布商品，选择"寄售"分类
   ↓
2. 商品状态：pending（待审核）
   ↓
3. 管理员审核商品
   ↓
4. 审核通过：status = approved（展示）
   ↓
5. 审核拒绝：status = rejected（不展示）
```

---

## 🔧 实施方案

### 1. 更新商品分类

**当前分类：**
- Electronics
- Fashion
- Home & Garden
- Sports
- Toys
- Other

**需要添加：**
- **Consignment（寄售）** - 官方认证商品

---

### 2. 商品状态系统

**添加status字段：**
```typescript
type ProductStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

interface Product {
  id: string;
  name: string;
  category: string;
  status: ProductStatus; // 新增
  isConsignment: boolean; // 是否是寄售商品
  // ... 其他字段
}
```

**状态说明：**
- `pending` - 待审核（寄售商品默认状态）
- `approved` - 已审核通过（可以展示）
- `rejected` - 审核拒绝（不展示）
- `inactive` - 已下架

---

### 3. 发布逻辑

**普通商品：**
- 发布后立即展示
- status = 'approved'

**寄售商品：**
- 发布后不展示
- status = 'pending'
- 等待管理员审核

---

### 4. 展示逻辑

**商品列表：**
- 只显示 status = 'approved' 的商品
- 寄售商品有特殊标识（官方认证徽章）

**我的商品：**
- 显示所有自己的商品
- 显示审核状态

---

## 📝 需要修改的文件

### 1. 产品发布页面

**文件：** `src/app/products/new/page.tsx`

**修改：**
- 添加"Consignment（寄售）"分类
- 选择寄售时显示提示："寄售商品需要通过审核后才能展示"
- 发布时根据分类设置status

```typescript
const handleSubmit = async () => {
  const isConsignment = category === 'Consignment';
  
  await addDoc(collection(firestore, 'products'), {
    ...productData,
    status: isConsignment ? 'pending' : 'approved',
    isConsignment,
    createdAt: serverTimestamp()
  });
};
```

---

### 2. 产品列表页面

**文件：** `src/app/products/page.tsx`

**修改：**
- 只查询 status = 'approved' 的商品
- 寄售商品显示官方认证徽章

```typescript
const q = query(
  productsRef,
  where('status', '==', 'approved'),
  orderBy('createdAt', 'desc')
);
```

---

### 3. 管理后台产品管理

**文件：** `src/app/admin/products/page.tsx`

**修改：**
- 显示所有商品（包括待审核）
- 添加状态筛选
- 添加审核按钮（批准/拒绝）
- 寄售商品特殊标识

---

### 4. 我的商品页面

**文件：** `src/app/account/products/page.tsx`

**修改：**
- 显示商品状态
- 待审核商品显示提示
- 已拒绝商品显示原因

---

## 🎨 UI设计

### 寄售商品徽章

```tsx
{product.isConsignment && product.status === 'approved' && (
  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
    <Shield className="h-3 w-3 mr-1" />
    Official Consignment
  </Badge>
)}
```

### 审核状态显示

```tsx
{product.status === 'pending' && (
  <Badge className="bg-yellow-500/20 text-yellow-400">
    <Clock className="h-3 w-3 mr-1" />
    Pending Review
  </Badge>
)}

{product.status === 'rejected' && (
  <Badge className="bg-red-500/20 text-red-400">
    <XCircle className="h-3 w-3 mr-1" />
    Rejected
  </Badge>
)}
```

---

## 🔍 审核流程

### 管理员审核界面

**功能：**
1. 查看待审核商品列表
2. 查看商品详细信息
3. 审核操作：
   - 批准：status = 'approved'
   - 拒绝：status = 'rejected'，添加拒绝原因

**审核标准：**
- 商品真实性
- 图片质量
- 描述准确性
- 价格合理性

---

## 📊 数据结构

### products集合

```javascript
{
  id: string,
  name: string,
  description: string,
  price: number,
  category: string,
  status: 'pending' | 'approved' | 'rejected' | 'inactive',
  isConsignment: boolean,
  rejectionReason?: string, // 拒绝原因
  reviewedBy?: string, // 审核人
  reviewedAt?: timestamp, // 审核时间
  sellerId: string,
  sellerWalletAddress: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🎯 实施步骤

### 第1步：更新类型定义（5分钟）

**文件：** `src/lib/types.ts`

添加：
```typescript
export type ProductStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports',
  'Toys',
  'Consignment', // 新增
  'Other'
] as const;
```

---

### 第2步：更新产品发布页面（15分钟）

**文件：** `src/app/products/new/page.tsx`

- 添加"Consignment"分类
- 添加寄售提示
- 根据分类设置status

---

### 第3步：更新产品列表页面（10分钟）

**文件：** `src/app/products/page.tsx`

- 只查询已审核商品
- 添加寄售徽章

---

### 第4步：更新管理后台（20分钟）

**文件：** `src/app/admin/products/page.tsx`

- 显示所有商品
- 添加审核功能
- 添加状态筛选

---

### 第5步：更新我的商品页面（10分钟）

**文件：** `src/app/account/products/page.tsx`

- 显示审核状态
- 显示拒绝原因

---

## 🎊 预期效果

**用户发布寄售商品：**
1. 选择"Consignment"分类
2. 看到提示："寄售商品需要审核"
3. 发布后在"我的商品"中看到"待审核"状态
4. 商品不会在商品列表中显示

**管理员审核：**
1. 在管理后台看到待审核商品
2. 查看商品详情
3. 批准或拒绝
4. 添加审核备注

**审核通过后：**
1. 商品在商品列表中显示
2. 带有"Official Consignment"徽章
3. 用户收到通知

**审核拒绝：**
1. 商品不显示
2. 用户看到拒绝原因
3. 可以修改后重新提交

---

## 💡 额外功能建议

### 1. 寄售专区
- 创建 `/products/consignment` 页面
- 只显示寄售商品
- 突出官方认证

### 2. 审核通知
- 审核通过/拒绝时发送通知
- 邮件通知
- 站内消息

### 3. 寄售统计
- 管理后台显示寄售商品统计
- 待审核数量
- 审核通过率

---

## 🚀 实施优先级

### 高优先级（今天完成，1小时）
1. ✅ 更新类型定义
2. ✅ 更新产品发布页面
3. ✅ 更新产品列表页面
4. ✅ 更新管理后台审核功能

### 中优先级（明天）
5. ⚪ 更新我的商品页面
6. ⚪ 添加审核通知

### 低优先级（可选）
7. ⚪ 创建寄售专区
8. ⚪ 寄售统计

---

**你想让我开始实施吗？预计1小时完成核心功能。**

---

*方案生成时间：2026-03-02 14:50*  
*预计时间：1小时*
