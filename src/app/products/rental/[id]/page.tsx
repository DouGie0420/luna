'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
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
    ShieldCheck as VerifiedIcon, ThumbsUp, Minus, ThumbsDown
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, differenceInDays, startOfDay, eachDayOfInterval, isFriday, isSaturday, isWithinInterval } from 'date-fns';
import { UserAvatar } from '@/components/ui/user-avatar';
import { CyberCalendar } from '@/components/cyber-calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { cn } from '@/lib/utils';

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
    USDT: () => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#26A17B"/><path d="M12.64 8.71V6.66h4.52V4.4H6.84v2.26h4.51v2.05c-3.1.15-5.46.77-5.46 1.51v.1c0 .75 2.37 1.36 5.46 1.52v4.86c0 .41-.34.75-.75.75h-.36v2.16h4.52v-2.16h-.37a.75.75 0 0 1-.75-.75v-4.85c3.09-.16 5.46-.77 5.46-1.52v-.1c0-.74-2.37-1.36-5.46-1.51zm0 2.52c-2.73-.13-4.75-.62-4.75-1.07v-.06c0-.46 2.02-.95 4.75-1.08v2.21z" fill="#FFF"/>
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
  .obsidian-elite { background: #0A0A0B; color: #FFFFFF; font-family: 'Inter', sans-serif; }
  .glass-card { background: rgba(20, 20, 22, 0.7); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.05); }
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
`;

export default function PropertyDetailPage() {
    const { id } = useParams();
    const db = useFirestore();
    const { user: currentUser, profile: currentProfile } = useUser();
    const router = useRouter();
    
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
    // 🚀 将 ReviewScore 替换为 ReviewType 用于好评系统中评系统
    const [reviewType, setReviewType] = useState<'good'|'neutral'|'bad'|null>(null); 
    const [submittingReview, setSubmittingReview] = useState(false);
    
    // 图库状态
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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
        // 🚀 确保必须输入评价内容且选择了评价类型
        if (!reviewContent || !reviewType || submittingReview) return;
        setSubmittingReview(true);
        try {
            const adminRoles = ['admin', 'ghost', 'staff', 'support'];
            const isManager = adminRoles.includes(currentProfile?.role || '');
            const baseName = currentProfile?.displayName || currentProfile?.nickname || 'Elite Node';
            
            // 🚀 根据类型设置分数底层
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
            
            // 🚀 核心结算逻辑：将打分结果写入该房源房东的 GlobalTrustScore
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
            alert("Protocol Deployed.");
        } catch (err) { alert("Error."); } finally { setSubmittingReview(false); }
    };

    const handleFinalConfirm = async () => {
        if (!db || !property) return;
        setIsBooking(true);
        try {
            const checkIn = startOfDay(new Date(bookingRange.start));
            const checkOut = startOfDay(new Date(bookingRange.end));
            const bookingDates = eachDayOfInterval({ start: checkIn, end: checkOut });
            const bookingRef = await addDoc(collection(db, 'bookings'), {
                propertyId: id, tenantId: currentUser.uid, hostId: property.ownerId,
                checkIn, checkOut, billing, status: 'pending_payment', createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000) 
            });
            await updateDoc(doc(db, 'rentalProperties', id as string), { blockedDates: arrayUnion(...bookingDates) });
            setIsConfirmOpen(false);
            router.push(`/checkout/${bookingRef.id}`); 
        } catch (err) { alert("Occupied."); } finally { setIsBooking(false); }
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
                setHost(prev => ({ ...prev, followerCount: Math.max(0, (prev.followerCount || 1) - 1) }));
            } else {
                await updateDoc(hostRef, { followers: arrayUnion(currentUser.uid), followerCount: increment(1) });
                await updateDoc(userRef, { following: arrayUnion(host.id) });
                setIsFollowing(true);
                setHost(prev => ({ ...prev, followerCount: (prev.followerCount || 0) + 1 }));
            }
        } catch (err) { console.error("Follow error:", err); } finally { setFollowLoading(false); }
    };

    const handleMessageHost = () => {
        if (!currentUser) return alert("System Auth: Please login.");
        router.push(`/messages?target=${property.ownerId}`);
    };

    const onPrepareBooking = () => {
        if (!currentUser) return alert("Security Auth: Login required.");
        if (!bookingRange.start) return alert("Select duration.");
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

    const aiLocationAnalysis = useMemo(() => [
        { label: 'AIRPORT DISTANCE', val: 'Est. 45 Mins', icon: Plane },
        { label: 'NEAREST SUBWAY', val: '< 500m Walk', icon: TrainFront },
        { label: 'DOWNTOWN DISTANCE', val: 'City Center', icon: Building },
        { label: 'BANK / FINANCIAL', val: 'Within 1km', icon: Landmark }
    ], []);

    const billing = useMemo(() => {
        if (!property || !bookingRange.start || !bookingRange.end) return null;
        const start = startOfDay(new Date(bookingRange.start));
        const end = startOfDay(new Date(bookingRange.end));
        const days = differenceInDays(end, start);
        if (days <= 0) return null;
        let baseTotal = 0;
        eachDayOfInterval({ start, end: new Date(end.getTime() - 86400000) }).forEach(date => {
            const isWeekend = date.getDay() === 5 || date.getDay() === 6;
            baseTotal += isWeekend ? property.pricePerDay * (1 + (property.weekendPremium || 0) / 100) : property.pricePerDay;
        });
        const cleaning = property.cleaningFee?.enabled ? property.cleaningFee.amount : 0;
        return { days, baseTotal, cleaning, total: (baseTotal + cleaning) * 1.14 };
    }, [property, bookingRange]);

    const currentHeroProp = allHostProperties[heroIndex] || property;
    const displayRating = property?.rating ? Number(property.rating).toFixed(1) : 'New';

    if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-purple-500 w-10" /></div>;
    if (!property) return <div className="h-screen bg-black flex items-center justify-center text-white/50 font-mono uppercase tracking-widest">Asset_Not_Found</div>;

    return (
        <div className="obsidian-elite pb-32">
            <style dangerouslySetInnerHTML={{ __html: eliteStyles }} />
            
            <header className="relative h-[48vh] w-full border-b border-white/5 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div key={currentHeroProp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5 }} className="absolute inset-0 flex">
                        <div className="relative w-1/2 h-full"><Image src={currentHeroProp.images?.[0] || '/placeholder.jpg'} alt="P1" fill className="object-cover object-center" /></div>
                        <div className="relative w-1/2 h-full border-l border-black/50"><Image src={currentHeroProp.images?.[1] || currentHeroProp.images?.[0]} alt="P2" fill className="object-cover object-center" /></div>
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/40 to-transparent z-10" />
                <div className="absolute inset-0 flex flex-col items-center justify-end z-20 pb-12">
                    <h1 className="text-5xl font-black titanium-title tracking-tighter uppercase text-white text-center drop-shadow-2xl">{currentHeroProp.title}</h1>
                    <p className="mt-4 text-purple-400 font-bold tracking-[0.4em] uppercase text-[11px] flex items-center gap-2 drop-shadow-lg"><MapPin className="w-4 h-4 shrink-0" /> {currentHeroProp.location?.address}</p>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto px-12 grid grid-cols-12 gap-16 mt-12">
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
                                    <button onClick={handleToggleFollow} disabled={followLoading} className={cn("px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all", isFollowing ? "bg-white/10 text-white border border-white/5" : "action-btn")}>{followLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isFollowing ? 'Following' : 'Follow'}</button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 py-8 border-y border-white/5 text-center mt-8">
                            <Link href={`/@${host?.loginId || property.ownerId}`} className="group block"><p className="text-[10px] text-white/20 uppercase font-black mb-1 group-hover:text-purple-400 transition-colors">Properties</p><p className="text-4xl font-black titanium-title group-hover:text-purple-300 transition-colors">{hostPropertyCount}</p></Link>
                            <div><p className="text-[10px] text-white/20 uppercase font-black mb-1 tracking-tighter">Trust Score</p><p className="text-4xl font-black titanium-title text-purple-400">{host?.globalTrustScore || '99.8'}%</p></div>
                        </div>
                        <button onClick={handleMessageHost} className="w-full mt-8 py-5 message-host-btn rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-purple-500/10 transition-colors"><MessageSquare className="w-4 h-4" /> Message Host</button>
                    </div>

                    <div className="sticky top-12 flex flex-col gap-8">
                        <div className="glass-card rounded-[3rem] p-10">
                            <div className="flex justify-between items-start mb-8">
                                <div><p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Starting at</p><p className="text-5xl font-black italic tracking-tighter titanium-title">₮ {property.pricePerDay} <span className="text-sm font-normal text-white/20">/ night</span></p></div>
                                <div className="text-yellow-500 font-black flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-500" /> {displayRating}</div>
                            </div>
                            <div className="mb-8">
                                <label className="text-[10px] font-black text-purple-400 uppercase block mb-4 tracking-[0.3em]">Temporal Selection</label>
                                <CyberCalendar 
                                    blockedDates={property.blockedDates} pricePerDay={property.pricePerDay} weekendPremium={property.weekendPremium}
                                    onRangeSelect={(range) => {
                                        if (range.start && range.end) setBookingRange({ start: format(range.start, 'yyyy-MM-dd'), end: format(range.end, 'yyyy-MM-dd') });
                                        else setBookingRange({ start: '', end: '' });
                                    }}
                                />
                            </div>
                            {billing && (
                                <div className="space-y-3 font-mono text-[11px] text-white/40 border-t border-white/5 pt-6 mb-8">
                                    <div className="flex justify-between"><span>₮ {property.pricePerDay} x {billing.days} nights</span><span>₮ {billing.baseTotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-2xl font-black text-white pt-4"><span>Total</span><span className="text-purple-400">₮ {billing.total.toFixed(2)}</span></div>
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

                        <div className="glass-card rounded-[2.5rem] p-8 bg-gradient-to-br from-[#0A0A0B] to-purple-900/10 border border-purple-500/20 overflow-hidden text-center space-y-8">
                            <div className="flex w-full justify-around border-b border-white/5 pb-8">
                                {/* 🚀 修复1：使用 flex-col items-center 强制居中对齐数字、图标和文字 */}
                                <button onClick={handleToggleLike} className="flex flex-col items-center space-y-2 group">
                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", property.likedBy?.includes(currentUser?.uid) ? "bg-pink-500 shadow-[0_0_15px_#ec4899]" : "bg-white/5 group-hover:bg-pink-500/20")}><Heart className={cn("w-5 h-5", property.likedBy?.includes(currentUser?.uid) && "fill-white")} /></div>
                                    <p className="text-3xl font-black titanium-title">{property.likesCount || 0}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Appreciations</p>
                                </button>
                                <div className="w-px bg-white/5" />
                                {/* 🚀 修复1：使用 flex-col items-center 强制居中对齐 */}
                                <button onClick={handleToggleSave} className="flex flex-col items-center space-y-2 group">
                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all", property.favoritedBy?.includes(currentUser?.uid) ? "bg-blue-500 shadow-[0_0_15px_#3b82f6]" : "bg-white/5 group-hover:bg-blue-500/20")}><Bookmark className={cn("w-5 h-5", property.favoritedBy?.includes(currentUser?.uid) && "fill-white")} /></div>
                                    <p className="text-3xl font-black titanium-title">{property.savesCount || 0}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Vault Saves</p>
                                </button>
                            </div>
                            <h4 className="text-2xl font-black italic titanium-title tracking-tighter text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">HAVE A NICE TRIP!</h4>
                        </div>
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
                                        
                                        {/* 🚀 修复2：移除滑块，替换为好评/中评/差评系统 */}
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
                                            {/* 🚀 加入类型校验限制 */}
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
                                                
                                                {/* 🚀 修复3：将右侧的分数改为状态徽章，并且彻底移除了底部的 Helpful 按钮 */}
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

            {/* 🚀 沉浸式图库预览层（修复了关闭按钮） */}
            <AnimatePresence>
                {isGalleryOpen && property.images && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center"
                        onClick={() => setIsGalleryOpen(false)} // 🚀 点击黑色背景区域关闭
                    >
                        {/* 🚀 显著的关闭按钮 */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsGalleryOpen(false); }} 
                            className="absolute top-8 right-8 w-16 h-16 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center text-white/50 hover:text-white z-[120] transition-all border border-white/10 group shadow-2xl"
                        >
                            <X size={32} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                        
                        <div className="relative w-full h-full max-w-6xl flex items-center justify-center p-4 md:p-12" onClick={(e) => e.stopPropagation()}>
                            {/* 上一张按钮 */}
                            <button 
                                onClick={() => setActivePhotoIndex(prev => (prev > 0 ? prev - 1 : property.images.length - 1))}
                                className="absolute left-4 md:left-0 p-4 text-white/30 hover:text-purple-400 transition-colors z-[110]"
                            >
                                <ChevronLeft size={60} />
                            </button>

                            <motion.div 
                                key={activePhotoIndex}
                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                className="relative w-full h-[80vh] rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(0,0,0,1)]"
                            >
                                <Image src={property.images[activePhotoIndex]} alt="Gallery" fill className="object-contain" unoptimized />
                            </motion.div>

                            {/* 下一张按钮 */}
                            <button 
                                onClick={() => setActivePhotoIndex(prev => (prev < property.images.length - 1 ? prev + 1 : 0))}
                                className="absolute right-4 md:right-0 p-4 text-white/30 hover:text-purple-400 transition-colors z-[110]"
                            >
                                <ChevronRight size={60} />
                            </button>

                            {/* 指示器 */}
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-8 py-3 rounded-full border border-white/10 backdrop-blur-2xl">
                                <span className="font-mono text-xs text-purple-400 font-black uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                                    NODE_{activePhotoIndex + 1} / {property.images.length}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="bg-[#050505]/80 border border-white/10 rounded-[2.5rem] max-w-md p-8 text-white backdrop-blur-[50px] shadow-[0_0_100px_rgba(0,0,0,1)] focus:outline-none overflow-hidden transition-all duration-500">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-[80px]" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-[80px]" />
                    <DialogHeader><DialogTitle className="titanium-title text-3xl font-black italic uppercase tracking-tighter text-purple-400">Confirm Booking</DialogTitle></DialogHeader>
                    <div className="space-y-6 mt-6 relative z-10">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[9px] text-white/30 uppercase font-black mb-1">Check-In</p><p className="font-mono text-xs text-purple-200">{bookingRange.start}</p></div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center"><p className="text-[9px] text-white/30 uppercase font-black mb-1">Check-Out</p><p className="font-mono text-xs text-purple-200">{bookingRange.end}</p></div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">Settlement Node</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="pay-option active p-4 rounded-2xl flex items-center justify-between border-purple-500/50 group"><div className="flex items-center gap-3"><PaymentIcons.USDT /><span className="text-xs font-black uppercase">USDT (BASE)</span></div><div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shadow-[0_0_10px_#A855F7]"><Check className="w-2.5 h-2.5 text-black stroke-[4]" /></div></div>
                                <div className="pay-option disabled p-4 rounded-2xl flex items-center gap-3"><PaymentIcons.PromptPay /><span className="text-xs font-black uppercase text-white/40">PromptPay</span></div>
                                <div className="pay-option disabled p-4 rounded-2xl flex items-center gap-3"><PaymentIcons.WeChat /><span className="text-xs font-black uppercase text-white/40">WeChat</span></div>
                                <div className="pay-option disabled p-4 rounded-2xl flex items-center gap-3"><PaymentIcons.Alipay /><span className="text-xs font-black uppercase text-white/40">Alipay</span></div>
                            </div>
                        </div>
                        <div className="border-t border-white/10 pt-6 flex justify-between items-center px-1">
                            <span className="text-sm font-black uppercase text-white/50 tracking-widest">Protocol Total</span>
                            <span className="text-4xl font-black titanium-title text-primary drop-shadow-[0_0_15px_#A855F7]">₮ {billing?.total.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 py-2.5 bg-purple-500/5 rounded-xl border border-purple-500/10 shadow-inner">
                            <Shield className="w-3.5 h-3.5 text-purple-400" />
                            <p className="text-[10px] font-black uppercase tracking-[0.05em] text-purple-400/80 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">Transaction secured and executed on-chain</p>
                        </div>
                        <Button onClick={handleFinalConfirm} disabled={isBooking} className="w-full h-16 rounded-2xl liquid-pay-btn text-black font-black uppercase tracking-[0.2em] hover:scale-[1.02] transition-transform shadow-[0_10px_30px_rgba(168,85,247,0.3)]">
                            {isBooking ? <Loader2 className="animate-spin" /> : "Deploy Smart Contract"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}