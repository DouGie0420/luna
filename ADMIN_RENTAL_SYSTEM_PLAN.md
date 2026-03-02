# 🎯 管理后台权限系统和租赁功能完善方案

**时间：** 2026-03-02 14:35  
**目标：** 完善管理后台权限系统和租赁功能

---

## 📋 需求分析

### 1. 管理后台权限系统

**四个权限等级：**
1. **admin** - 最高权限
   - 所有功能访问权限
   - 用户管理
   - 订单管理
   - 产品管理
   - 房源管理
   - 系统设置
   - 权限管理

2. **ghost** - 超级管理员
   - 类似admin，但可能有特殊权限
   - 查看所有数据
   - 审核功能

3. **staff** - 员工
   - 订单管理
   - 产品审核
   - 房源审核
   - 客户支持

4. **support** - 客服
   - 查看订单
   - 查看用户信息
   - 处理客户问题
   - 不能修改系统设置

---

### 2. 租赁系统需求

**PRO用户房源发布：**
- PRO用户可以发布房源
- 房源需要管理员审核
- 房源与用户钱包地址绑定

**管理后台房源管理：**
- 查看所有房源
- 审核房源
- 下架房源
- 查看预订记录

**日历预订系统：**
- 日历显示可用日期
- 选择日期范围
- 计算总价
- 接入支付系统
- 创建预订订单

---

## 🔧 实施方案

### 阶段1：权限系统重构（1小时）

#### 1.1 更新用户类型定义

**文件：** `src/lib/types.ts`

```typescript
// 用户角色
export type UserRole = 'user' | 'pro' | 'support' | 'staff' | 'ghost' | 'admin';

// 权限级别
export const ROLE_PERMISSIONS = {
  admin: {
    level: 5,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageOrders: true,
    canManageProducts: true,
    canManageRentals: true,
    canManageSettings: true,
    canManageRoles: true
  },
  ghost: {
    level: 4,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageOrders: true,
    canManageProducts: true,
    canManageRentals: true,
    canManageSettings: false,
    canManageRoles: false
  },
  staff: {
    level: 3,
    canAccessAdmin: true,
    canManageUsers: false,
    canManageOrders: true,
    canManageProducts: true,
    canManageRentals: true,
    canManageSettings: false,
    canManageRoles: false
  },
  support: {
    level: 2,
    canAccessAdmin: true,
    canManageUsers: false,
    canManageOrders: false, // 只能查看
    canManageProducts: false,
    canManageRentals: false,
    canManageSettings: false,
    canManageRoles: false
  },
  pro: {
    level: 1,
    canAccessAdmin: false,
    canPublishRentals: true
  },
  user: {
    level: 0,
    canAccessAdmin: false
  }
};
```

#### 1.2 更新AdminGuard

**文件：** `src/components/admin/AdminGuard.tsx`

```typescript
// 检查用户角色
const checkAdminAccess = (role: UserRole): boolean => {
  return ['admin', 'ghost', 'staff', 'support'].includes(role);
};

// 检查特定权限
const hasPermission = (role: UserRole, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.[permission] ?? false;
};
```

---

### 阶段2：租赁管理后台（1.5小时）

#### 2.1 创建租赁管理页面

**文件：** `src/app/admin/rentals/page.tsx`

**功能：**
- 查看所有房源列表
- 筛选（待审核/已审核/已下架）
- 审核房源
- 下架房源
- 查看房源详情
- 查看预订记录

#### 2.2 创建房源详情页面

**文件：** `src/app/admin/rentals/[id]/page.tsx`

**功能：**
- 房源详细信息
- 房东信息
- 预订历史
- 审核操作
- 下架操作

---

### 阶段3：PRO用户房源发布（1小时）

#### 3.1 创建房源发布页面

**文件：** `src/app/account/rentals/new/page.tsx`

**功能：**
- 只有PRO用户可以访问
- 房源信息表单
- 图片上传
- 价格设置
- 日历可用性设置
- 自动绑定钱包地址

#### 3.2 创建我的房源管理

**文件：** `src/app/account/rentals/page.tsx`

**功能：**
- 查看我发布的房源
- 编辑房源
- 查看预订记录
- 收入统计

---

### 阶段4：日历预订支付（1小时）

#### 4.1 更新租赁详情页

**文件：** `src/app/rentals/[id]/page.tsx`

**需要添加：**
- 日期选择后显示总价
- "确认预订"按钮
- 跳转到支付页面

#### 4.2 创建租赁支付页面

**文件：** `src/app/rentals/[id]/checkout/page.tsx`

**功能：**
- 显示预订详情
- 选择支付方式
- USDT支付
- 创建预订订单

---

## 📊 数据结构

### rentals集合
```javascript
{
  id: string,
  title: string,
  description: string,
  ownerId: string,
  ownerWalletAddress: string,
  pricePerNight: number,
  location: string,
  images: string[],
  amenities: string[],
  status: 'pending' | 'approved' | 'rejected' | 'inactive',
  availableDates: Date[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### rental_bookings集合
```javascript
{
  id: string,
  rentalId: string,
  renterId: string,
  ownerId: string,
  checkIn: Date,
  checkOut: Date,
  totalPrice: number,
  status: 'pending_payment' | 'paid' | 'confirmed' | 'completed' | 'cancelled',
  paymentMethod: string,
  txHash: string,
  createdAt: timestamp
}
```

---

## 🎯 实施优先级

### 高优先级（今天完成，3小时）
1. ✅ 更新权限系统
2. ✅ 创建租赁管理后台
3. ✅ 更新日历预订支付

### 中优先级（明天完成，2小时）
4. ⚪ PRO用户房源发布
5. ⚪ 我的房源管理

### 低优先级（本周完成）
6. ⚪ 房源详情页面优化
7. ⚪ 预订管理系统

---

## 💡 权限检查示例

```typescript
// 检查是否可以访问管理后台
if (!['admin', 'ghost', 'staff', 'support'].includes(userRole)) {
  router.push('/');
}

// 检查是否可以管理用户
if (!['admin', 'ghost'].includes(userRole)) {
  // 显示"无权限"提示
}

// 检查是否可以修改系统设置
if (userRole !== 'admin') {
  // 禁用设置按钮
}

// 检查是否可以发布房源
if (userType !== 'pro') {
  // 显示"升级到PRO"提示
}
```

---

**你想让我开始实施吗？建议按照优先级顺序进行。**

**预计总时间：** 5小时

---

*方案生成时间：2026-03-02 14:35*  
*等待确认开始实施*
