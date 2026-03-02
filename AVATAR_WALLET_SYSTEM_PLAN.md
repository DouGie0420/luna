# 🎯 Luna头像系统和钱包深度绑定实施方案

**时间：** 2026-03-02 13:55  
**目标：** 实现完整的头像系统、勋章系统、钱包绑定和商品锁定

---

## 📊 系统架构

### 1. 头像系统

#### 用户类型
```typescript
type UserType = 'normal' | 'pro';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  userType: UserType;
  
  // 头像相关
  avatarType: 'pixel' | 'custom' | 'nft';
  pixelAvatarSeed: string; // 像素头像种子
  customAvatarUrl?: string; // 自定义头像（仅PRO）
  nftAvatarUrl?: string; // NFT头像
  nftTokenId?: string; // NFT Token ID
  nftContractAddress?: string; // NFT合约地址
  
  // 钱包相关
  walletAddress?: string;
  walletBindTime?: Date;
  walletChangeRequests?: WalletChangeRequest[];
  
  // 勋章
  badges: string[]; // ['WEB3', 'NFT', 'PRO', ...]
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 头像生成逻辑
```typescript
// 注册时生成像素头像
function generatePixelAvatar(userId: string): string {
  // 使用用户ID作为种子
  const seed = userId;
  // 使用DiceBear API生成CryptoPunks风格头像
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}&style=cryptopunks`;
}
```

---

### 2. 勋章系统

#### 勋章类型
```typescript
interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: string;
}

const BADGES = {
  WEB3: {
    id: 'web3',
    name: 'WEB3',
    icon: '🔗',
    description: 'Connected Web3 wallet',
    condition: 'walletAddress !== null'
  },
  NFT: {
    id: 'nft',
    name: 'NFT',
    icon: '🖼️',
    description: 'Using NFT as avatar',
    condition: 'avatarType === "nft"'
  },
  PRO: {
    id: 'pro',
    name: 'PRO',
    icon: '⭐',
    description: 'PRO merchant',
    condition: 'userType === "pro"'
  }
};
```

#### 勋章授予逻辑
```typescript
// 绑定钱包时
async function onWalletConnected(userId: string, walletAddress: string) {
  await addBadge(userId, 'WEB3');
}

// 设置NFT头像时
async function onNFTAvatarSet(userId: string) {
  await addBadge(userId, 'NFT');
}
```

---

### 3. 钱包绑定系统

#### 数据结构
```typescript
interface WalletBinding {
  userId: string;
  walletAddress: string;
  bindTime: Date;
  status: 'active' | 'pending_change' | 'inactive';
}

interface WalletChangeRequest {
  id: string;
  userId: string;
  oldWalletAddress: string;
  newWalletAddress: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTime: Date;
  reviewTime?: Date;
  reviewedBy?: string;
  reviewNote?: string;
}
```

#### 绑定流程
```
1. 用户连接钱包
   ↓
2. 检查是否已绑定
   ↓
3. 如果未绑定：
   - 保存钱包地址
   - 授予WEB3勋章
   - 检测NFT
   ↓
4. 如果已绑定：
   - 显示当前地址
   - 提供"申请更换"按钮
```

#### 更换钱包流程
```
1. 用户提交更换申请
   ↓
2. 创建WalletChangeRequest
   ↓
3. 管理员审核
   ↓
4. 审核通过：
   - 更新钱包地址
   - 更新所有关联商品/房源
   ↓
5. 审核拒绝：
   - 通知用户
```

---

### 4. 商品/房源绑定

#### 数据结构
```typescript
interface Product {
  id: string;
  name: string;
  sellerId: string;
  sellerWalletAddress: string; // 发布时的钱包地址
  // ... 其他字段
}

interface RentalProperty {
  id: string;
  name: string;
  ownerId: string;
  ownerWalletAddress: string; // 发布时的钱包地址
  // ... 其他字段
}
```

#### 发布时绑定
```typescript
async function publishProduct(userId: string, productData: any) {
  // 获取用户当前钱包地址
  const userProfile = await getDoc(doc(firestore, 'users', userId));
  const walletAddress = userProfile.data()?.walletAddress;
  
  if (!walletAddress) {
    throw new Error('Please connect wallet first');
  }
  
  // 绑定钱包地址到商品
  await addDoc(collection(firestore, 'products'), {
    ...productData,
    sellerId: userId,
    sellerWalletAddress: walletAddress,
    createdAt: serverTimestamp()
  });
}
```

---

### 5. 商品锁定系统

#### 数据结构
```typescript
interface ProductLock {
  productId: string;
  lockedBy: string; // 用户ID
  lockedAt: Date;
  expiresAt: Date; // 30分钟后
  status: 'locked' | 'expired' | 'completed';
}
```

#### 锁定逻辑
```typescript
async function lockProduct(productId: string, userId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30分钟
  
  // 检查是否已被锁定
  const existingLock = await getDoc(doc(firestore, 'product_locks', productId));
  
  if (existingLock.exists()) {
    const lock = existingLock.data();
    if (lock.expiresAt.toDate() > now && lock.status === 'locked') {
      throw new Error('Product is locked by another user');
    }
  }
  
  // 创建锁定
  await setDoc(doc(firestore, 'product_locks', productId), {
    productId,
    lockedBy: userId,
    lockedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: 'locked'
  });
}

// 自动释放过期锁定（Cloud Function）
async function releaseExpiredLocks() {
  const now = new Date();
  const locksRef = collection(firestore, 'product_locks');
  const q = query(
    locksRef,
    where('status', '==', 'locked'),
    where('expiresAt', '<', Timestamp.fromDate(now))
  );
  
  const snapshot = await getDocs(q);
  snapshot.forEach(async (doc) => {
    await updateDoc(doc.ref, {
      status: 'expired'
    });
  });
}
```

---

## 🎨 UI组件

### 1. NFT头像选择器
**文件：** `src/components/profile/NFTAvatarSelector.tsx`

**功能：**
- 连接钱包
- 获取用户持有的NFT
- 显示NFT列表
- 选择NFT作为头像

### 2. 钱包管理面板
**文件：** `src/components/wallet/WalletManagement.tsx`

**功能：**
- 显示当前绑定的钱包地址
- 申请更换钱包
- 查看更换申请状态

### 3. 勋章显示
**文件：** `src/components/profile/BadgeDisplay.tsx`

**功能：**
- 显示用户获得的勋章
- 勋章说明

### 4. 商品锁定提示
**文件：** `src/components/product/ProductLockNotice.tsx`

**功能：**
- 显示商品锁定状态
- 倒计时显示
- 锁定期内禁止其他用户购买

---

## 🔧 实施步骤

### 阶段1：头像系统（1小时）
1. ✅ 修改用户注册流程，生成像素头像
2. ✅ 创建NFT头像选择器
3. ✅ 实现头像切换逻辑
4. ✅ 添加PRO用户自定义头像功能

### 阶段2：勋章系统（30分钟）
1. ✅ 创建勋章数据结构
2. ✅ 实现勋章授予逻辑
3. ✅ 创建勋章显示组件

### 阶段3：钱包绑定（1小时）
1. ✅ 实现钱包绑定逻辑
2. ✅ 创建钱包管理面板
3. ✅ 实现更换申请流程
4. ✅ 管理后台审核功能

### 阶段4：商品锁定（1小时）
1. ✅ 实现商品锁定逻辑
2. ✅ 创建锁定提示组件
3. ✅ 实现自动释放机制
4. ✅ 修改购买流程

---

## 📝 Firestore集合结构

```
users/
  {userId}/
    - userType: 'normal' | 'pro'
    - avatarType: 'pixel' | 'custom' | 'nft'
    - pixelAvatarSeed: string
    - walletAddress: string
    - badges: string[]
    
wallet_change_requests/
  {requestId}/
    - userId: string
    - oldWalletAddress: string
    - newWalletAddress: string
    - status: 'pending' | 'approved' | 'rejected'
    
product_locks/
  {productId}/
    - lockedBy: string
    - lockedAt: timestamp
    - expiresAt: timestamp
    - status: 'locked' | 'expired' | 'completed'
    
nft_avatars/
  {userId}/
    - nftTokenId: string
    - nftContractAddress: string
    - nftImageUrl: string
```

---

## 🎯 预期成果

**完成后：**
- ✅ 普通用户使用像素头像
- ✅ PRO用户可以自定义头像
- ✅ 持有NFT用户可以使用NFT头像
- ✅ 绑定钱包自动获得WEB3勋章
- ✅ 使用NFT头像自动获得NFT勋章
- ✅ 钱包地址与商品/房源深度绑定
- ✅ 更换钱包需要审批
- ✅ 商品购买30分钟锁定期
- ✅ 自动释放过期锁定

---

**你想让我开始实施吗？预计总时间：3-4小时**

**建议分阶段实施，先做哪个？**
A. 头像系统
B. 勋章系统
C. 钱包绑定
D. 商品锁定
E. 全部一起做

---

*方案生成时间：2026-03-02 13:55*  
*等待确认开始实施*
