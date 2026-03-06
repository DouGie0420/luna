// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { 
    MapPin, ShieldCheck, Star, Users, Bed, Bath, 
    Zap, Globe, Maximize2, MessageSquare, 
    UserPlus, Key, Car, Map as MapIcon, Loader2, 
    CheckCircle2, Wifi, Tv, Utensils, Shirt, Snowflake, 
    Laptop, Waves, Coffee, Flame, Gamepad2, Heater, 
    Music, Dumbbell, Ship, Umbrella, MountainSnow, 
    Droplets, BellRing, BriefcaseMedical, FireExtinguisher, 
    ShieldAlert, Building, ArrowUpDown, UserCheck, TrainFront,
    Plane, Landmark, Navigation, MessageCircle, Heart, Bookmark, Edit3,
    MessageSquareQuote, Crown, Shield, Check, Send, X, ChevronLeft, ChevronRight,
    ShieldCheck as VerifiedIcon, ThumbsUp, Minus, ThumbsDown,
    ArrowLeft, Home, Receipt, Activity, RefreshCcw
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, differenceInDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { ethers } from 'ethers';

// Components
import { UserAvatar } from '@/components/ui/user-avatar';
import { CyberCalendar } from '@/components/cyber-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Web3 Hooks
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { useEscrowContract } from '@/hooks/useEscrowContract';
// 🚀 引入实时 ETH 汇率 Hook
import { useEthPrice } from '@/hooks/useEthPrice';
// 🚀 引入我们刚刚封装的全局网络守卫插件
import { useNetworkGuard } from '@/hooks/useNetworkGuard';

const REQUIRED_CHAIN_ID = 84532; 

// 🚀 支付图标映射组件
const PaymentIcons = {
    PromptPay: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="5"/>
        </svg>
    ),
    WeChat: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.5 13c.83 0 1.5-.67 1.5-1.5S9.33 10 8.5 10 7 10.67 7 11.5 7.67 13 8.5 13zm7 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM12 2C6.48 2 2 5.58 2 10c0 2.39 1.15 4.54 3 6.07V19c0 .55.45 1 1 1h.5c.34 0 .65-.17.82-.47L8.75 17h.25c.34 0 .67-.03 1-.09 1.14.41 2.45.69 3.8.69 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
        </svg>
    ),
    Alipay: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.35 15.65L12 13.3 7.65 17.65c-.2.2-.51.2-.71 0l-.71-.71c-.2-.2-.2-.51 0-.71L10.59 12 6.24 7.65c-.2-.2-.2-.51 0-.71l.71-.71c.2-.2.51-.2.71 0L12 10.7l4.35-4.35c.2-.2.51-.2.71 0l.71.71c.2.2.2.51 0 .71L13.41 12l4.35 4.35c.2.2.2.51 0 .71l-.71.71c-.2.2-.51.2-.71 0z"/>
        </svg>
    ),
    ETH: () => (
        <svg viewBox="0 0 256 417" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
            <path fill="#627EEA" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/>
            <path fill="#627EEA" d="M127.962 0L0 212.32l127.962 75.638V127.961z" opacity="0.8"/>
            <path fill="#627EEA" d="M127.962 287.958l-2.09 2.543v124.741l2.09 6.06 128.038-180.894z" opacity="0.6"/>
            <path fill="#627EEA" d="M127.962 421.302v-133.344L0 360.445z" opacity="0.4"/>
            <path fill="#627EEA" d="M127.962 272.321l127.962-75.639-127.962-58.721z" opacity="0.2"/>
        </svg>
    )
};

const AMENITY_LOOKUP: Record<string, { icon: any, desc: string }> = {
    '无线网络': { icon: Wifi, desc: 'High-speed neural link coverage.' },
    '电视': { icon: Tv, desc: '4K Cinematic streaming interface.' },
    '厨房': { icon: Utensils, desc: 'Professional-grade culinary suite.' },
    '洗衣机': { icon: Shirt, desc: 'Automated fabric care system.' },
    '内部免费停车位': { icon: Car, desc: 'Secure onsite vehicle docking.' },
    '内部付费停车位': { icon: Car, desc: 'Premium valet-ready parking.' },
    '空调': { icon: Snowflake, desc: 'Adaptive climate control protocol.' },
    '专门的工作区域': { icon: Laptop, desc: 'Ergonomic deep-work sanctuary.' },
    '游泳池': { icon: Waves, desc: 'Obsidian infinity-edge aquatic zone.' },
    '热水浴缸': { icon: Bath, desc: 'Therapeutic hydro-massage system.' },
    '露台': { icon: Globe, desc: 'Panoramic sky-deck vantage point.' },
    '烧烤架': { icon: Flame, desc: 'Premium outdoor fire-grill setup.' },
    '户外用餐区': { icon: Coffee, desc: 'Al-fresco dining experience.' },
    '篝火炉': { icon: Flame, desc: 'Primal hearth for evening gatherings.' },
    '台球桌': { icon: Gamepad2, desc: 'Precision gaming & entertainment.' },
    '室内壁炉': { icon: Heater, desc: 'Ambient thermal comfort center.' },
    '钢琴': { icon: Music, desc: 'Acoustic grand performance tool.' },
    '健身器材': { icon: Dumbbell, desc: 'Elite kinetic-training modules.' },
    '临湖': { icon: Ship, desc: 'Exclusive waterfront access.' },
    '直达海滩': { icon: Umbrella, desc: 'Direct shorefront portal.' },
    '雪场民宿': { icon: MountainSnow, desc: 'Zero-distance ski-out access.' },
    '户外淋浴': { icon: Droplets, desc: 'Refreshing open-air rinse station.' },
    '烟雾报警器': { icon: BellRing, desc: 'Active aerosol threat detection.' },
    '急救包': { icon: BriefcaseMedical, desc: 'Emergency bio-recovery kit.' },
    '灭火器': { icon: FireExtinguisher, desc: 'Thermal suppression equipment.' },
    '一氧化碳报警器': { icon: ShieldAlert, desc: 'Molecular toxicity monitoring.' }
};

const eliteStyles = `
  .obsidian-elite { background: transparent; color: #FFFFFF; font-family: 'Inter', sans-serif; }
  .glass-card { background: rgba(10, 10, 12, 0.5); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 30px 60px rgba(0,0,0,0.6); }
  .purple-glow-btn { background: linear-gradient(135deg, #A855F7 0%, #7E22CE 100%); box-shadow: 0 10px 40px rgba(168, 85, 247, 0.4); }
  .liquid-pay-btn {
    background: linear-gradient(270deg, #A855F7, #7E22CE, #D946EF, #A855F7);
    background-size: 600% 600%;
    animation: liquid-flow 4s ease infinite;
    box-shadow: 0 10px 50px rgba(168, 85, 247, 0.4);
  }
  @keyframes liquid-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
  .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }
  .council-badge { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); box-shadow: 0 0 10px rgba(168, 85, 247, 0.2); }
  .pay-option { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); transition: all 0.3s ease; }
  .pay-option.active { background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.5); box-shadow: 0 0 20px rgba(168, 85, 247, 0.1); }
  .pay-option.disabled { opacity: 0.3; cursor: not-allowed; }
  .fluid-bg-container { position: fixed; inset: 0; background: #020004; overflow: hidden; z-index: -1; }
  .fluid-entity { position: absolute; border-radius: 50%; filter: blur(120px); will-change: transform; mix-blend-mode: screen; transform: translateZ(0); }
  
  @keyframes astral-drift-1 {
      0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.7; }
      50% { transform: translate3d(10vw, -10vh, 0) scale(1.1); opacity: 1; }
      100% { transform: translate3d(-5vw, 5vh, 0) scale(1); opacity: 0.7; }
  }
  @keyframes astral-drift-2 {
      0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.6; }
      50% { transform: translate3d(-10vw, 15vh, 0) scale(1.2); opacity: 0.9; }
      100% { transform: translate3d(5vw, -5vh, 0) scale(1); opacity: 0.6; }
  }
  @keyframes astral-drift-3 {
      0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.5; }
      50% { transform: translate3d(8vw, 8vh, 0) scale(1.15); opacity: 0.8; }
      100% { transform: translate3d(-8vw, -8vh, 0) scale(1); opacity: 0.5; }
  }
  
  .astral-1 { width: 80vw; height: 80vw; top: -20%; left: -20%; background: rgba(168, 85, 247, 0.4); animation: astral-drift-1 25s ease-in-out infinite; }
  .astral-2 { width: 90vw; height: 90vw; bottom: -30%; right: -20%; background: rgba(245, 158, 11, 0.25); animation: astral-drift-2 30s ease-in-out infinite; }
  .astral-3 { width: 60vw; height: 60vw; top: 30%; left: 20%; background: rgba(59, 130, 246, 0.35); animation: astral-drift-3 35s ease-in-out infinite; }
`;

export default function ClientRentalDetail() {
    const { id } = useParams();
    const db = useFirestore();
    const { user: currentUser, profile: currentProfile } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [property, setProperty] = useState<any>(null);
    const [host, setHost] = useState<any>(null);
    const [allHostProperties, setAllHostProperties] = useState<any[]>([]);
    const [hostPropertyCount, setHostPropertyCount] = useState(0);
    const [reviews, setReviews] = useState<any[]>([]);
    const [heroIndex, setHeroIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [bookingRange, setBookingRange] = useState({ start: '', end: '' });
    const [isBooking, setIsBooking] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [canReview, setCanReview] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewContent, setReviewContent] = useState('');
    const [reviewType, setReviewType] = useState<'good'|'neutral'|'bad'|null>(null); 
    const [submittingReview, setSubmittingReview] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
    const { lockFunds, isInteracting, interactionError } = useEscrowContract();

    // 🚀 引入实时 ETH 汇率 Hook
    const { ethPrice, loadingPrice, refetchPrice } = useEthPrice();

    // 🚀 极简调用：开启全局网络安全守卫插件
    useNetworkGuard(REQUIRED_CHAIN_ID, isConnected, chainId);

    useEffect(() => {
        const fetchAssetChain = async () => {
            if (!db || !id) return;
            try {
                const propSnap = await getDoc(doc(db, 'rentalProperties', id as string));
                if (!propSnap.exists()) return;
                const propData = { id: propSnap.id, ...propSnap.data() };
                setProperty(propData);

                const hostSnap = await getDoc(doc(db, 'users', propData.ownerId));
                if (hostSnap.exists()) {
                    const hostData = hostSnap.data();
                    setHost({ id: hostSnap.id, ...hostData });
                    if (currentUser && hostData.followers?.includes(currentUser.uid)) setIsFollowing(true);
                }

                const qProps = query(collection(db, 'rentalProperties'), where('ownerId', '==', propData.ownerId), where('status', '==', 'active'));
                const listSnap = await getDocs(qProps);
                setAllHostProperties(listSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setHostPropertyCount(listSnap.size);

                const qReviews = query(collection(db, 'reviews'), where('propertyId', '==', id), limit(10));
                const revSnap = await getDocs(qReviews);
                setReviews(revSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                if (currentUser) {
                    try {
                        const adminRoles = ['admin', 'ghost', 'staff', 'support'];
                        if (adminRoles.includes(currentProfile?.role || '')) setCanReview(true);
                        else {
                            const qBooking = query(collection(db, 'bookings'), where('propertyId', '==', id), where('tenantId', '==', currentUser.uid), where('status', 'in', ['paid', 'completed']));
                            const bSnap = await getDocs(qBooking);
                            setCanReview(!bSnap.empty);
                        }
                    } catch (err) { setCanReview(false); }
                }
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchAssetChain();
    }, [db, id, currentUser, currentProfile]);

    useEffect(() => {
        if (allHostProperties.length <= 1) return;
        const timer = setInterval(() => setHeroIndex((p) => (p + 1) % allHostProperties.length), 10000);
        return () => clearInterval(timer);
    }, [allHostProperties]);

    const handleToggleLike = async () => {
        if (!currentUser || !db || !property) return alert("System Auth: Login required.");
        const isLiked = property.likedBy?.includes(currentUser.uid);
        const propRef = doc(db, 'rentalProperties', id as string);
        try {
            if (isLiked) {
                await updateDoc(propRef, { likedBy: arrayRemove(currentUser.uid), likesCount: increment(-1) });
                setProperty((p: any) => ({ ...p, likedBy: p.likedBy.filter((u: string) => u !== currentUser.uid), likesCount: p.likesCount - 1 }));
            } else {
                await updateDoc(propRef, { likedBy: arrayUnion(currentUser.uid), likesCount: increment(1) });
                setProperty((p: any) => ({ ...p, likedBy: [...(p.likedBy || []), currentUser.uid], likesCount: (p.likesCount || 0) + 1 }));
            }
        } catch (err) { console.error(err); }
    };

    const handleToggleSave = async () => {
        if (!currentUser || !db || !property) return alert("System Auth: Login required.");
        const isSaved = property.favoritedBy?.includes(currentUser.uid);
        const propRef = doc(db, 'rentalProperties', id as string);
        try {
            if (isSaved) {
                await updateDoc(propRef, { favoritedBy: arrayRemove(currentUser.uid), savesCount: increment(-1) });
                setProperty((p: any) => ({ ...p, favoritedBy: p.favoritedBy.filter((u: string) => u !== currentUser.uid), savesCount: p.savesCount - 1 }));
            } else {
                await updateDoc(propRef, { favoritedBy: arrayUnion(currentUser.uid), savesCount: increment(1) });
                setProperty((p: any) => ({ ...p, favoritedBy: [...(p.favoritedBy || []), currentUser.uid], savesCount: (p.savesCount || 0) + 1 }));
            }
        } catch (err) { console.error(err); }
    };

    const handleLeaveLog = () => {
        if (!currentUser) return alert("System Auth: Login first.");
        const adminRoles = ['admin', 'ghost', 'staff', 'support'];
        if (adminRoles.includes(currentProfile?.role || '') || canReview) setShowReviewForm(!showReviewForm);
        else alert("Verification Protocol: Verified guests or Management only.");
    };

    const handleSubmitReview = async () => {
        if (!reviewContent || !reviewType || submittingReview) return;
        setSubmittingReview(true);
        try {
            const adminRoles = ['admin', 'ghost', 'staff', 'support'];
            const isManager = adminRoles.includes(currentProfile?.role || '');
            const baseName = currentProfile?.displayName || currentProfile?.nickname || 'Elite Node';
            let score = 10;
            if (reviewType === 'neutral') score = 5;
            if (reviewType === 'bad') score = 1;
            const reviewData: any = {
                propertyId: id, userId: currentUser?.uid, userName: isManager ? `${baseName} [Council]` : baseName,
                userAvatar: currentProfile?.photoURL || currentProfile?.avatarUrl, userLocation: currentProfile?.location?.city || 'Global',
                content: reviewContent, score: score, type: reviewType,
                createdAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, 'reviews'), reviewData);
            setReviews(prev => [{ id: docRef.id, ...reviewData, createdAt: { toDate: () => new Date() } }, ...prev]);
            if (property.ownerId) {
                const hostRef = doc(db, 'users', property.ownerId);
                const scoreChange = reviewType === 'good' ? 1 : reviewType === 'bad' ? -1 : 0;
                if (scoreChange !== 0) {
                    await updateDoc(hostRef, { 
                        globalTrustScore: increment(scoreChange),
                        totalReviews: increment(1) 
                    });
                }
            }
            setShowReviewForm(false); setReviewContent(''); setReviewType(null);
            toast({ title: "Protocol Deployed", description: "Review successfully logged." });
        } catch (err) { toast({ variant: 'destructive', title: "Error", description: "Failed to broadcast log." }); } finally { setSubmittingReview(false); }
    };

    // 🚀 【完美升级计算引擎】：法币逻辑算总价 -> 拆分周末溢价 -> 汇率换算 ETH -> 1% 滑点加入
    const billing = useMemo(() => {
        if (!property || !bookingRange.start || !bookingRange.end) return null;
        const start = startOfDay(new Date(bookingRange.start));
        const end = startOfDay(new Date(bookingRange.end));
        const days = differenceInDays(end, start);
        if (days <= 0) return null;
        
        // 1. 计算基础房费 USD (提取出周末溢价)
        let baseTotalUSD = 0;
        let weekendPremiumTotalUSD = 0; 
        const pricePerDayUSD = Number(property.pricePerDay) || 0;
        const weekendPremium = Number(property.weekendPremium) || 0;
        
        eachDayOfInterval({ start, end: new Date(end.getTime() - 86400000) }).forEach(date => {
            const isWeekend = date.getDay() === 5 || date.getDay() === 6;
            baseTotalUSD += pricePerDayUSD; // 基础价
            if (isWeekend) {
                weekendPremiumTotalUSD += pricePerDayUSD * (weekendPremium / 100); // 独立出来的周末溢价
            }
        });

        // 2. 解析高级增值服务 USD (Premium Services)
        let cleaningTotalUSD = 0;
        if (property.cleaningFee?.enabled) {
            const amt = Number(property.cleaningFee.amount) || 0;
            cleaningTotalUSD = property.cleaningFee.frequency === 'daily' ? amt * days : amt; 
        }

        let staffTotalUSD = 0;
        const staffObj = property.staffFee || property.butlerFee || property.staffService; 
        if (staffObj?.enabled) {
            const amt = Number(staffObj.amount) || Number(staffObj.amountPerDay) || 0;
            staffTotalUSD = amt * days; 
        }

        // 3. 房客最终要付的法币总额 (基础价 + 周末溢价 + 增值服务)
        const totalUSD = baseTotalUSD + weekendPremiumTotalUSD + cleaningTotalUSD + staffTotalUSD; 

        // 平台抽成 7% (基于基础价 + 溢价。此值只为了展示，实际是后端从房东处扣减)
        const platformFeeUSD = (baseTotalUSD + weekendPremiumTotalUSD) * 0.07; 

        // 4. 🚀 法币 -> 智能合约需要的 ETH (附带 1% 交易滑点)
        let exactEthAmount = 0;
        let ethAmountWithSlippage = 0;

        if (ethPrice && ethPrice > 0) {
            exactEthAmount = totalUSD / ethPrice;
            // 增加 1% 滑点缓冲，确保交易不因为价格微动而抛出 CALL_EXCEPTION
            ethAmountWithSlippage = exactEthAmount * 1.01; 
        }

        return { 
            days, 
            baseTotalUSD, 
            weekendPremiumTotalUSD, // 用于UI展示
            cleaningTotalUSD, 
            staffTotalUSD, 
            totalUSD, 
            platformFeeUSD, 
            exactEthAmount,
            ethAmountWithSlippage
        };
    }, [property, bookingRange, ethPrice]);

    const handleFinalConfirm = async () => {
        if (!db || !property || !currentUser || !billing) return;
        if (!isConnected || !address) {
            toast({ variant: "destructive", title: "Wallet Offline", description: "Please connect your Web3 wallet to deploy the smart contract." });
            return;
        }
        
        if (!ethPrice || ethPrice <= 0) {
            toast({ variant: "destructive", title: "Oracle Offline", description: "无法获取实时 ETH 汇率，正在重试..." });
            refetchPrice();
            return;
        }

        const currentChainId = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
        if (currentChainId !== REQUIRED_CHAIN_ID) {
            toast({ variant: "destructive", title: "Network Mismatch", description: `Please switch to Base Sepolia (ID: ${REQUIRED_CHAIN_ID}).` });
            return;
        }

        setIsBooking(true);
        try {
            const hostRefSnap = await getDoc(doc(db, 'users', property.ownerId));
            const hostData = hostRefSnap.exists() ? hostRefSnap.data() : null;
            const finalSellerAddress = property.sellerEthAddress || hostData?.walletAddress || hostData?.ethAddress || ethers.ZeroAddress;

            if (!finalSellerAddress || finalSellerAddress === ethers.ZeroAddress) {
                throw new Error("Host missing valid Web3 receiving node.");
            }
            if (finalSellerAddress.toLowerCase() === address.toLowerCase()) {
                setIsBooking(false);
                toast({
                    variant: "destructive",
                    className: "bg-[#0A0A0B]/90 border border-orange-500/50 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(249,115,22,0.2)]",
                    title: (
                        <div className="flex flex-col gap-2">
                            <span className="text-orange-500 font-black text-2xl uppercase italic tracking-tighter drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                                Oops, my money's gone
                            </span>
                            <div className="h-px w-full bg-gradient-to-r from-orange-500/50 to-transparent" />
                        </div>
                    ),
                    description: (
                        <div className="mt-4 space-y-2">
                            <p className="text-white/90 font-black text-sm uppercase tracking-widest leading-relaxed">
                                Is that address seeing double?
                            </p>
                            <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em]">
                                Your funds deserve a safe home, not a black hole.
                            </p>
                        </div>
                    ),
                    duration: 6000,
                });
                return;
            }

            toast({ title: "Initiating Contract", description: "等待 Web3 钱包签名授权..." });
            const checkIn = startOfDay(new Date(bookingRange.start));
            const checkOut = startOfDay(new Date(bookingRange.end));
            const bookingDates = eachDayOfInterval({ start: checkIn, end: checkOut });
            const bookingRef = doc(collection(db, 'bookings')); 
            const newBookingId = bookingRef.id;

            if (typeof lockFunds !== 'function') throw new Error("Escrow module offline.");
            
            // 🚀 核心突破：将带有滑点的 ETH 数字，以安全的字符串格式传递给智能合约
            // 保留 6 位小数，确保精度且避免 Gas 计算失败 (CALL_EXCEPTION)
            const ethStringToPay = billing.ethAmountWithSlippage.toFixed(6);

            const txResult = await lockFunds(newBookingId, ethStringToPay, finalSellerAddress);
            
            if (!txResult || !txResult.success || !txResult.hash) {
                throw new Error(txResult?.error || interactionError || "Transaction reverted or failed.");
            }

            // 🚀 写入快照数据：锁定发生交易这一秒的所有金融状态，防止日后汇率波动产生纠纷
            await setDoc(bookingRef, {
                propertyId: id, tenantId: currentUser.uid, hostId: property.ownerId,
                checkIn, checkOut, status: 'paid', txHash: txResult.hash, createdAt: serverTimestamp(),
                billingSnapshot: {
                    totalUSD: billing.totalUSD,
                    platformFeeUSD: billing.platformFeeUSD,
                    ethPriceAtBooking: ethPrice,
                    paidETH: Number(ethStringToPay)
                }
            });

            await updateDoc(doc(db, 'rentalProperties', id as string), { blockedDates: arrayUnion(...bookingDates) });
            
            setIsConfirmOpen(false);
            toast({ title: "Booking Secured!", description: "资金已进入安全池。日期已为您锁定。" });
            setTimeout(() => { router.push(`/account/purchases/${newBookingId}`); }, 1500);

        } catch (err: any) {
            console.error("Booking Error:", err);
            toast({ variant: 'destructive', title: 'Protocol Terminated', description: err.message || "未能完成交易，请确保余额充足。" });
        } finally { setIsBooking(false); }
    };

    const handleToggleFollow = async () => {
        if (!currentUser) return alert("System Auth: Please login.");
        if (!db || !host || followLoading) return;
        setFollowLoading(true);
        try {
            const hostRef = doc(db, 'users', host.id);
            const userRef = doc(db, 'users', currentUser.uid);
            if (isFollowing) {
                await updateDoc(hostRef, { followers: arrayRemove(currentUser.uid), followerCount: increment(-1) });
                await updateDoc(userRef, { following: arrayRemove(host.id) });
                setIsFollowing(false);
                setHost((prev: any) => ({ ...prev, followerCount: Math.max(0, (prev.followerCount || 1) - 1) }));
            } else {
                await updateDoc(hostRef, { followers: arrayUnion(currentUser.uid), followerCount: increment(1) });
                await updateDoc(userRef, { following: arrayUnion(host.id) });
                setIsFollowing(true);
                setHost((prev: any) => ({ ...prev, followerCount: (prev.followerCount || 0) + 1 }));
            }
        } catch (err) { console.error("Follow error:", err); } finally { setFollowLoading(false); }
    };

    const handleMessageHost = () => {
        if (!currentUser) return alert("System Auth: Please login.");
        router.push(`/messages?target=${property.ownerId}`);
    };

    const onPrepareBooking = () => {
        if (!currentUser) return alert("Security Auth: Login required.");
        if (!bookingRange.start) return alert("Please select duration.");
        setIsConfirmOpen(true); 
    };

    const openGallery = (index: number) => {
        setActivePhotoIndex(index);
        setIsGalleryOpen(true);
    };

    const estateSpecs = useMemo(() => {
        if (!property) return [];
        return [
            { label: 'ARCHITECTURE', val: property.propertyType || '豪华庄园 (Mansion)', icon: Building },
            { label: 'VERTICAL_ACCESS', val: property.amenities?.includes('电梯') ? 'ELEVATOR' : 'STAIRWAY', icon: ArrowUpDown },
            { label: 'DIGITAL CHECK IN', val: property.bookingType === 'instant' ? 'FAST MODE' : 'MANUAL', icon: Zap },
            { label: 'TRANSIT_PROXIMITY', val: 'PUBLIC TRANSPORT', icon: TrainFront },
        ];
    }, [property]);

    const currentHeroProp = allHostProperties[heroIndex] || property;
    const displayRating = property?.rating ? Number(property.rating).toFixed(1) : 'New';

    if (loading || !mounted) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-purple-500 w-10" /></div>;
    if (!property) return <div className="h-screen bg-black flex items-center justify-center text-white/50 font-mono uppercase tracking-widest">Asset_Not_Found</div>;

    return (
        <div className="obsidian-elite pb-32 relative">
            <style dangerouslySetInnerHTML={{ __html: eliteStyles }} />
            <div className="fluid-bg-container pointer-events-none">
                <div className="fluid-entity astral-1" /><div className="fluid-entity astral-2" /><div className="fluid-entity astral-3" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48L3N2Zz4=')] opacity-50 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020004] via-[#020004]/40 to-transparent" />
            </div>

            <div className="fixed top-[90px] md:top-[110px] left-0 w-full px-4 md:px-10 flex items-center justify-between z-[90] pointer-events-none">
                <motion.button onClick={() => router.back()} whileHover="hover" initial="initial" className="flex-shrink-0 flex items-center gap-4 group cursor-pointer pointer-events-auto">
                    <div className="relative">
                        <motion.div variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }} className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-full blur-2xl transition-all duration-700" />
                        <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050508]/80 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:border-purple-400 group-hover:bg-black transition-colors duration-300">
                            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <span className="hidden lg:block text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-white/50 group-hover:text-purple-300 transition-all drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">[ BACK ]</span>
                </motion.button>
                <Link href="/" className="flex-shrink-0 flex flex-row-reverse items-center gap-4 group cursor-pointer pointer-events-auto">
                    <motion.div whileHover="hover" initial="initial" className="flex flex-row-reverse items-center gap-4">
                        <div className="relative">
                            <motion.div variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }} className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full blur-2xl transition-all duration-700" />
                            <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050508]/80 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:border-cyan-400 group-hover:bg-black transition-colors duration-300">
                                <Home className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                        <span className="hidden lg:block text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-white/50 group-hover:text-cyan-300 transition-all drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">[ HOME ]</span>
                    </motion.div>
                </Link>
            </div>
            
            <header className="relative h-[55vh] w-full border-b border-white/5 overflow-hidden rounded-b-[4rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                <AnimatePresence mode="wait">
                    <motion.div key={currentHeroProp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="absolute inset-0 flex">
                        <div className="relative w-1/2 h-full"><Image src={currentHeroProp.images?.[0] || '/placeholder.jpg'} alt="P1" fill className="object-cover object-center" /></div>
                        <div className="relative w-1/2 h-full border-l border-black/50"><Image src={currentHeroProp.images?.[1] || currentHeroProp.images?.[0]} alt="P2" fill className="object-cover object-center" /></div>
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020004] via-[#020004]/50 to-transparent z-10" />
                <div className="absolute inset-0 flex flex-col items-center justify-end z-20 pb-16">
                    <h1 className="text-6xl md:text-7xl font-black titanium-title tracking-tighter uppercase text-white text-center drop-shadow-2xl">{currentHeroProp.title}</h1>
                    <p className="mt-4 text-purple-400 font-bold tracking-[0.4em] uppercase text-xs flex items-center gap-2 drop-shadow-lg"><MapPin className="w-4 h-4 shrink-0" /> {currentHeroProp.location?.address}</p>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto px-12 grid grid-cols-12 gap-16 mt-16 relative z-20">
                <aside className="col-span-4 flex flex-col gap-8">
                    <div className="glass-card rounded-[2.5rem] p-8 relative">
                        <div className="flex items-center gap-6">
                            <div className="relative w-24 h-24 rounded-full ring-2 ring-purple-500 ring-offset-4 ring-offset-[#0A0A0B] bg-zinc-900 flex-shrink-0">
                                <UserAvatar profile={host} className="w-full h-full rounded-full" />
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-[8px] px-2 py-0.5 rounded-full font-black uppercase z-20 whitespace-nowrap shadow-[0_0_10px_#9333ea]">PRO</div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-3xl font-black titanium-title">{host?.displayName || host?.nickname || 'ELITE_USER'}</h4>
                                <p className="text-[10px] text-white/40 font-black uppercase">Elite Host since {host?.createdAt ? format(host.createdAt.toDate(), 'yyyy') : '2021'}</p>
                                <div className="flex items-center gap-6 pt-4">
                                    <div className="text-left"><p className="text-[9px] font-black uppercase text-purple-400">Followers</p><p className="text-3xl font-black titanium-title text-purple-400 mt-0.5">{host?.followerCount || 0}</p></div>
                                    <button onClick={handleToggleFollow} disabled={followLoading} className={cn("px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 border flex items-center justify-center min-w-[110px]", isFollowing ? "bg-purple-500/30 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" : "border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]")}>
                                        {followLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 py-8 border-y border-white/5 text-center mt-8">
                            <Link href={`/@${host?.loginId || property.ownerId}`} className="group block"><p className="text-[10px] text-white/20 uppercase font-black mb-1 group-hover:text-purple-400 transition-colors">Properties</p><p className="text-4xl font-black titanium-title group-hover:text-purple-300 transition-colors">{hostPropertyCount}</p></Link>
                            <div><p className="text-[10px] text-white/20 uppercase font-black mb-1 tracking-tighter">Trust Score</p><p className="text-4xl font-black titanium-title text-purple-400">{host?.globalTrustScore || '99.8'}%</p></div>
                        </div>
                        <button onClick={handleMessageHost} className="w-full mt-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all duration-300 group">
                            <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" /> Message Host
                        </button>
                    </div>

                    <div className="sticky top-[140px] flex flex-col gap-8">
                        <div className="glass-card rounded-[3rem] p-10">
                            <div className="flex justify-between items-start mb-8">
                                <div><p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Starting at</p><p className="text-5xl font-black italic tracking-tighter titanium-title">$ {property.pricePerDay} <span className="text-sm font-normal text-white/20">/ night</span></p></div>
                                <div className="text-yellow-500 font-black flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-500" /> {displayRating}</div>
                            </div>
                            <div className="mb-8">
                                <label className="text-[10px] font-black text-purple-400 uppercase block mb-4 tracking-[0.3em]">Temporal Selection</label>
                                <CyberCalendar blockedDates={property.blockedDates} pricePerDay={property.pricePerDay} weekendPremium={property.weekendPremium} onRangeSelect={(range) => {
                                    if (range.start && range.end) setBookingRange({ start: format(range.start, 'yyyy-MM-dd'), end: format(range.end, 'yyyy-MM-dd') });
                                    else setBookingRange({ start: '', end: '' });
                                }} />
                            </div>
                            
                            {/* 🚀 账单明细：法币展示 */}
                            {billing && (
                                <div className="space-y-4 font-mono text-[11px] text-white/60 border-t border-white/5 pt-6 mb-8">
                                    <div className="flex justify-between items-center">
                                        <span>Base Price (${property.pricePerDay} x {billing.days} nights)</span>
                                        <span className="text-white">$ {billing.baseTotalUSD.toFixed(2)}</span>
                                    </div>
                                    
                                    {/* 🚀 新增：如果产生了周末溢价，单独作为一行高亮显示 */}
                                    {billing.weekendPremiumTotalUSD > 0 && (
                                        <div className="flex justify-between items-center text-orange-400/80">
                                            <span>Weekend Premium (+{property.weekendPremium}%)</span>
                                            <span className="text-orange-400">+ $ {billing.weekendPremiumTotalUSD.toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {billing.cleaningTotalUSD > 0 && (
                                        <div className="flex justify-between items-center text-blue-400/80">
                                            <span>Professional Cleaning</span>
                                            <span className="text-blue-400">+ $ {billing.cleaningTotalUSD.toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {billing.staffTotalUSD > 0 && (
                                        <div className="flex justify-between items-center text-green-400/80">
                                            <span>Staff / Butler (x {billing.days} days)</span>
                                            <span className="text-green-400">+ $ {billing.staffTotalUSD.toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-end pt-4 border-t border-white/5">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-white/40">Total</span>
                                        <span className="text-3xl font-black text-purple-400 titanium-title">$ {billing.totalUSD.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            <button onClick={onPrepareBooking} disabled={!billing || isBooking} className="w-full py-6 rounded-2xl purple-glow-btn font-black text-lg uppercase flex items-center justify-center gap-3 disabled:opacity-50 tracking-widest transition-transform hover:scale-[1.02]"><Zap className="w-5 h-5 fill-white" /> Instant Book</button>
                        </div>
                        {property.amenities && property.amenities.length > 0 && (
                            <div className="glass-card rounded-[2.5rem] p-8">
                                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-white/60 mb-6 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Included Amenities</h4>
                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                    {property.amenities.map((am: string, idx: number) => {
                                        const amData = AMENITY_LOOKUP[am] || { icon: CheckCircle2 };
                                        const Icon = amData.icon;
                                        return (
                                            <div key={idx} className="flex items-center gap-3 text-white/80 group">
                                                <div className="p-2.5 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors"><Icon className="w-5 h-5 text-purple-400 shrink-0" /></div>
                                                <span className="text-sm font-bold uppercase tracking-wider truncate">{am}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="col-span-8 flex flex-col gap-12">
                    <section className="space-y-8">
                        <div className="flex items-center gap-4"><div className="w-1 h-10 bg-purple-500 shadow-[0_0_15px_#A855F7]" /><h2 className="text-5xl font-black italic titanium-title tracking-tighter uppercase">The Experience</h2></div>
                        <p className="text-xl text-white/80 leading-relaxed font-medium whitespace-pre-wrap pl-4 border-l-2 border-white/5">{property.description || "No description provided."}</p>
                    </section>
                    <section className="space-y-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.8em] text-white/20">Curated Advantages</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {estateSpecs.map((s, i) => (
                                <div key={i} className="glass-card p-6 text-center space-y-3 rounded-[2rem] border border-white/5 hover:border-purple-500/30 group transition-all">
                                    <div className="w-10 h-10 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><s.icon className="w-5 h-5" /></div>
                                    <div><p className="text-[11px] font-black italic text-white uppercase tracking-tighter">{s.val}</p><p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">{s.label}</p></div>
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="space-y-8">
                        <div className="flex items-end gap-4"><Crown className="w-10 h-10 text-purple-400 mb-1 drop-shadow-[0_0_10px_#9333ea]" /><h2 className="text-4xl font-black italic titanium-title">{property.title}</h2></div>
                        <div className="grid grid-cols-12 gap-6 h-[600px]">
                            <div className="col-span-8 relative rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl cursor-pointer hover:scale-[0.99] transition-transform" onClick={() => openGallery(0)}>
                                <Image src={property.images?.[0] || '/placeholder.jpg'} alt="Main" fill className="object-cover" />
                            </div>
                            <div className="col-span-4 grid grid-rows-2 gap-6">
                                <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 shadow-xl cursor-pointer hover:scale-[0.98] transition-transform" onClick={() => openGallery(1)}>
                                    <Image src={property.images?.[1] || property.images?.[0]} alt="Side1" fill className="object-cover" />
                                </div>
                                <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-white/5 flex items-center justify-center group cursor-pointer shadow-xl hover:scale-[0.98] transition-transform" onClick={() => openGallery(2)}>
                                    {property.images?.[2] ? <Image src={property.images[2]} alt="Side2" fill className="object-cover" /> : <Maximize2 className="w-12 h-12 opacity-10" />}
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-[10px] font-black uppercase tracking-widest text-white">+ {property.images?.length || 0} Photos</p></div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="space-y-8 pt-8 border-t border-white/5">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-4"><MessageSquareQuote className="w-10 h-10 text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" /><h2 className="text-4xl font-black italic titanium-title tracking-tighter uppercase">Guest Manifest</h2></div>
                            <button onClick={handleLeaveLog} className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-6 py-2.5 rounded-full border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:bg-blue-500/20 transition-all"><Edit3 className="w-3.5 h-3.5" />{showReviewForm ? 'Cancel Log' : 'Leave a Log'}</button>
                        </div>
                        <AnimatePresence>
                            {showReviewForm && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="glass-card p-8 rounded-[2rem] border-blue-500/30 space-y-6 shadow-2xl">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 block">Select Execution Outcome</label>
                                            <div className="flex gap-4">
                                                <button onClick={() => setReviewType('good')} className={cn("flex-1 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all", reviewType === 'good' ? "bg-green-500/20 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "bg-white/5 border-white/10 opacity-50 hover:opacity-100")}>
                                                    <ThumbsUp className={cn("w-5 h-5", reviewType === 'good' ? "text-green-400" : "text-white/50")} />
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", reviewType === 'good' ? "text-green-400" : "text-white/50")}>POSITIVE (+1 Trust)</span>
                                                </button>
                                                <button onClick={() => setReviewType('neutral')} className={cn("flex-1 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all", reviewType === 'neutral' ? "bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "bg-white/5 border-white/10 opacity-50 hover:opacity-100")}>
                                                    <Minus className={cn("w-5 h-5", reviewType === 'neutral' ? "text-yellow-400" : "text-white/50")} />
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", reviewType === 'neutral' ? "text-yellow-400" : "text-white/50")}>NEUTRAL (0 Trust)</span>
                                                </button>
                                                <button onClick={() => setReviewType('bad')} className={cn("flex-1 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all", reviewType === 'bad' ? "bg-red-500/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]" : "bg-white/5 border-white/10 opacity-50 hover:opacity-100")}>
                                                    <ThumbsDown className={cn("w-5 h-5", reviewType === 'bad' ? "text-red-400" : "text-white/50")} />
                                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", reviewType === 'bad' ? "text-red-400" : "text-white/50")}>NEGATIVE (-1 Trust)</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative mt-4">
                                            <textarea value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} placeholder="Synchronize Experience Data..." className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-blue-500/50 outline-none transition-all resize-none shadow-inner" />
                                            <div className="absolute bottom-4 right-4 flex items-center gap-2"><EmojiPicker onSelect={(emoji) => setReviewContent(prev => prev + emoji)} /></div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button onClick={handleSubmitReview} disabled={!reviewContent || !reviewType || submittingReview} className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl px-10 h-12 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                                                {submittingReview ? <Loader2 className="animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Broadcast Log</>}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {reviews.length > 0 ? reviews.map((rev, index) => {
                                const isCouncil = rev.userName?.includes('[Council]');
                                const cleanName = rev.userName?.replace('[Council]', '').trim();
                                return (
                                    <div key={rev.id || `review-${index}`} className="glass-card p-8 rounded-[2.5rem] border border-white/5 transition-all flex flex-col justify-between group hover:border-purple-500/20">
                                        <div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex gap-4 items-center">
                                                    <UserAvatar profile={{ avatarUrl: rev.userAvatar, name: cleanName }} className="w-12 h-12 rounded-full ring-2 ring-white/5" />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={cn("font-black text-sm uppercase transition-colors", isCouncil ? "text-purple-400" : "text-white/90")}>{cleanName}</p>
                                                            {isCouncil && (
                                                                <div className="flex items-center gap-1 council-badge px-2 py-0.5 rounded-md animate-pulse council-tag">
                                                                    <VerifiedIcon className="w-2.5 h-2.5 text-purple-400 fill-purple-400/20" />
                                                                    <span className="text-[7px] font-black text-purple-400 uppercase tracking-tighter">Council</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-white/30 font-mono mt-1 uppercase tracking-widest">{rev.createdAt ? format(rev.createdAt.toDate ? rev.createdAt.toDate() : new Date(), 'yyyy.MM.dd') : 'Recently'}</p>
                                                    </div>
                                                </div>
                                                <div className={cn("px-3 py-1 rounded-md border text-[9px] font-black uppercase tracking-widest", rev.type === 'good' ? 'bg-green-500/20 text-green-400 border-green-500/30' : rev.type === 'bad' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-white/50 border-white/20')}>
                                                    {rev.type === 'good' ? 'POSITIVE' : rev.type === 'bad' ? 'NEGATIVE' : 'NEUTRAL'}
                                                </div>
                                            </div>
                                            <p className="text-sm text-white/70 italic leading-relaxed pl-4 border-l border-white/5 font-medium">"{rev.content || rev.comment || 'Transaction executed.'}"</p>
                                        </div>
                                    </div>
                                );
                            }) : <div className="col-span-2 p-12 text-center border border-dashed border-white/10 rounded-[2rem] bg-black/20 text-white/30 font-mono uppercase tracking-widest text-xs">No guest logs found yet.</div>}
                        </div>
                    </section>
                    <section className="space-y-8 pb-12 pt-8 border-t border-white/5">
                        <h2 className="text-3xl font-black italic titanium-title flex items-center gap-4 uppercase"><Navigation className="w-8 h-8 text-purple-400" /> Location Intel</h2>
                        <div className="w-full h-[450px] rounded-[3rem] overflow-hidden border border-white/10 relative bg-[#050505] shadow-2xl">
                            <Image src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop" alt="Map" fill className="object-cover opacity-20 grayscale mix-blend-screen" unoptimized />
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_90%)]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"><div className="w-48 h-48 bg-purple-500/10 rounded-full animate-ping absolute duration-1000" /><div className="w-24 h-24 bg-purple-500/20 rounded-full absolute animate-pulse" /><div className="relative z-10 w-10 h-10 bg-purple-500 rounded-full border-[3px] border-white flex items-center justify-center shadow-[0_0_30px_#A855F7]"><div className="w-2.5 h-2.5 bg-white rounded-full" /></div></div>
                            <div className="absolute bottom-8 left-8 right-8 bg-black/70 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl"><div><p className="text-white font-black text-xl uppercase tracking-widest">{property.location?.city || 'Bangkok'}, {property.location?.country || 'Thailand'}</p><p className="text-purple-400 font-mono text-xs mt-2 uppercase tracking-[0.2em]">{property.location?.address || 'Exact coordinates provided post-booking'}</p></div><button className="px-8 py-4 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl font-black text-xs text-purple-300 border border-purple-500/30 transition-all shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-purple-500/30">Initiate Map Sync</button></div>
                        </div>
                    </section>
                </main>
            </div>

            <AnimatePresence>
                {isGalleryOpen && property.images && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center" onClick={() => setIsGalleryOpen(false)}>
                        <button onClick={(e) => { e.stopPropagation(); setIsGalleryOpen(false); }} className="absolute top-8 right-8 w-16 h-16 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white/50 hover:text-white z-[120] transition-all border border-white/10 group shadow-2xl">
                            <X size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                        <div className="relative w-full h-full max-w-6xl flex items-center justify-center p-4 md:p-12" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setActivePhotoIndex(prev => (prev > 0 ? prev - 1 : property.images.length - 1))} className="absolute left-4 md:left-0 p-4 text-white/30 hover:text-purple-400 transition-colors z-[110]"><ChevronLeft size={60} /></button>
                            <motion.div key={activePhotoIndex} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full h-[80vh] rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(0,0,0,1)]">
                                <Image src={property.images[activePhotoIndex]} alt="Gallery" fill className="object-contain" unoptimized />
                            </motion.div>
                            <button onClick={() => setActivePhotoIndex(prev => (prev < property.images.length - 1 ? prev + 1 : 0))} className="absolute right-4 md:right-0 p-4 text-white/30 hover:text-purple-400 transition-colors z-[110]"><ChevronRight size={60} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="bg-[#050505]/90 border border-white/10 rounded-[2.5rem] max-w-md p-8 text-white backdrop-blur-[50px] shadow-[0_0_100px_rgba(0,0,0,1)] focus:outline-none overflow-hidden transition-all duration-500">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-[80px]" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-[80px]" />
                    <DialogHeader>
                        <DialogTitle className="titanium-title text-3xl font-black italic uppercase tracking-tighter text-purple-400">Deploy Contract</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-6 relative z-10">
                        {/* 🚀 实时汇率面板 */}
                        <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2 text-purple-300">
                                {loadingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                <span className="text-[10px] font-bold uppercase tracking-widest">Oracle Live Rate</span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="text-sm font-mono font-bold text-white flex items-center gap-2">
                                    1 ETH = ${ethPrice?.toFixed(2) || '---'}
                                    <button onClick={refetchPrice} disabled={loadingPrice} className="hover:text-purple-400 transition-colors">
                                        <RefreshCcw className={`w-3 h-3 ${loadingPrice ? 'animate-spin' : ''}`} />
                                    </button>
                                </p>
                                <p className="text-[9px] text-purple-400/60 uppercase mt-1">Auto-updates every 60s</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Settlement Node</p>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="pay-option active p-4 rounded-2xl flex items-center justify-between border-purple-500/50 group">
                                    <div className="flex items-center gap-3">
                                        <PaymentIcons.ETH />
                                        <div>
                                            <span className="text-sm font-black uppercase block">ETH (BASE)</span>
                                            <span className="text-[10px] text-white/50 uppercase tracking-widest">Base Sepolia L2</span>
                                        </div>
                                    </div>
                                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_10px_#A855F7]">
                                        <Check className="w-3 h-3 text-black stroke-[4]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
             {/* 🚀 弹窗内的账单明细与滑点展示 */}
                    <div className="border-t border-white/10 pt-6 space-y-3">
                    <div className="flex justify-between items-end">
                    <span className="text-xs uppercase font-black tracking-widest text-white/40">Total (USD)</span>
                    <span className="text-2xl font-black text-white titanium-title">${(billing?.totalUSD || 0).toFixed(2)}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2 mt-4">
                    <div className="flex justify-between text-[11px] font-mono text-white/60 tracking-widest">
                    <span>Market Conversion</span>
                    <span>{(billing?.exactEthAmount || 0).toFixed(6)} ETH</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-fuchsia-400/80 tracking-widest pb-2 border-b border-white/5">
                    <span>Max Slippage Tolerance (1%)</span>
                    <span>+ {(billing ? (billing.ethAmountWithSlippage - billing.exactEthAmount) : 0).toFixed(6)} ETH</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-black uppercase text-purple-300 tracking-widest drop-shadow-[0_0_5px_#A855F7]">Contract Payload</span>
                    <span className="text-xl font-black font-mono text-purple-400 drop-shadow-[0_0_15px_#A855F7]">
                    {(billing?.ethAmountWithSlippage || 0).toFixed(6)} ETH
                    </span>
                    </div>
                    </div>
                    </div>
                        
                        <Button 
                            onClick={handleFinalConfirm} 
                            disabled={isBooking || loadingPrice || !ethPrice} 
                            className="w-full h-16 rounded-2xl liquid-pay-btn text-black font-black text-sm uppercase tracking-[0.2em] hover:scale-[1.02] transition-transform shadow-[0_10px_30px_rgba(168,85,247,0.3)] relative overflow-hidden mt-4"
                        >
                            {isBooking ? (
                                <><Loader2 className="animate-spin w-5 h-5 mr-3" /> <span className="text-xs">AWAITING SIGNATURE...</span></>
                            ) : "Sign & Deploy"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}