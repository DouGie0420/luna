'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy, startAfter } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore } from "@/firebase";
import { UserProfile, Product, BbsPost } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";

// UI Components
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { ProductCard } from "@/components/product-card";
import { BbsPostCard } from "@/components/bbs-post-card";
import { UserAvatar } from "@/components/ui/user-avatar";

// Icons
import {
    LayoutGrid, ScrollText, Bookmark, Gamepad2, X, ShieldCheck,
    Globe, Activity, Cpu, History, Home, ShoppingBag, Sparkles,
    Crown, BadgeCheck, Fingerprint, Star, Package, TrendingUp,
    Award, Zap, MessageSquare, Users, Check, Plus, Building2,
    ChevronRight, MapPin
} from "lucide-react";

const safeNum = (val: any, fallback = 0): number => (val === undefined || val === null || isNaN(Number(val))) ? fallback : Number(val);

// 根据用户ID生成专属渐变横幅（确定性，每人唯一）
function generateUserBanner(userId: string): string {
    const palettes = [
        ['#1a0a2e', '#4a1060', '#0d1a3a', '#1a0a2e'],
        ['#0a1a2e', '#0d3a5a', '#1a2a0a', '#0a1a2e'],
        ['#2e0a1a', '#5a0d2a', '#2e1a0a', '#1a0a2e'],
        ['#0a2e1a', '#0d5a3a', '#1a0a2e', '#0a1a2e'],
        ['#2e2a0a', '#5a4a0d', '#1a0a2e', '#0a0a2e'],
        ['#1a0a2e', '#3a0d5a', '#0a2e2e', '#050508'],
        ['#2e0a0a', '#5a1a0d', '#2e0a2e', '#050508'],
        ['#0a0a2e', '#1a0d5a', '#0a2e1a', '#050508'],
    ];
    const accents = [
        ['#A855F7', '#EC4899'], ['#3B82F6', '#06B6D4'], ['#F59E0B', '#EF4444'],
        ['#10B981', '#3B82F6'], ['#F97316', '#A855F7'], ['#EC4899', '#F59E0B'],
        ['#06B6D4', '#10B981'], ['#8B5CF6', '#EC4899'],
    ];
    // 简单哈希
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = Math.abs(hash);
    const p = palettes[hash % palettes.length];
    const a = accents[(hash >> 4) % accents.length];
    return `linear-gradient(135deg, ${p[0]} 0%, ${p[1]} 40%, ${p[2]} 70%, ${p[3]} 100%)`;
}

const getNodeLevel = (score: number) => {
    if (score <= 200) return { id: 'CRISIS', label: 'CRISIS_NODE', color: 'text-red-500 border-red-500/50 bg-red-500/10 animate-pulse' };
    if (score <= 500) return { id: 'STABLE', label: 'STABLE_NODE', color: 'text-white/40 border-white/10 bg-white/5' };
    if (score <= 800) return { id: 'TRUSTED', label: 'TRUSTED_NODE', color: 'text-primary border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]' };
    return { id: 'APEX', label: 'APEX_NODE', color: 'text-purple-400 border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)]' };
};

const proStyles = `
  @keyframes pro-glow { 0%,100%{box-shadow:0 0 30px rgba(255,215,0,0.4),0 0 80px rgba(255,215,0,0.15),inset 0 0 30px rgba(255,215,0,0.05)} 50%{box-shadow:0 0 60px rgba(255,215,0,0.6),0 0 120px rgba(255,215,0,0.25),inset 0 0 50px rgba(255,215,0,0.08)} }
  @keyframes pro-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes pro-ring-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes pro-blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-25px,20px) scale(0.95)} }
  @keyframes pro-blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-30px,25px) scale(1.05)} 66%{transform:translate(25px,-20px) scale(1.1)} }
  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); filter: blur(150px); }
    33% { transform: translate(50px, -70px) scale(1.2); filter: blur(120px); }
    66% { transform: translate(-40px, 40px) scale(0.8); filter: blur(180px); }
    100% { transform: translate(0px, 0px) scale(1); filter: blur(150px); }
  }
  @keyframes float-up { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  .animate-blob { animation: blob 15s infinite alternate ease-in-out; }
  .animate-spin-slow { animation: spin 12s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .pro-blob1 { animation: pro-blob1 9s ease-in-out infinite; }
  .pro-blob2 { animation: pro-blob2 11s ease-in-out infinite; }
  .pro-avatar-ring { animation: pro-glow 3s ease-in-out infinite; }
  .pro-float { animation: float-up 4s ease-in-out infinite; }
  .pro-shimmer-text {
    background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700, #FFEC8B, #FFD700);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: pro-shimmer 3s infinite;
  }
  .pro-gold-border {
    border: 1px solid transparent;
    background-clip: padding-box;
    position: relative;
  }
  .pro-gold-border::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    background: linear-gradient(135deg, rgba(255,215,0,0.5), rgba(168,85,247,0.3), rgba(255,215,0,0.5));
    z-index: -1;
  }
  .pro-zigzag {
    background-image: repeating-linear-gradient(45deg, rgba(255,215,0,0.03) 0px, rgba(255,215,0,0.03) 2px, transparent 2px, transparent 18px),
                      repeating-linear-gradient(-45deg, rgba(168,85,247,0.03) 0px, rgba(168,85,247,0.03) 2px, transparent 2px, transparent 18px);
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// ─── PRO Profile ─────────────────────────────────────────────
function ProUserProfile({ user, products, currentUser, isFollowing, onFollowToggle, activeTab, setActiveTab, userPosts, feedbacks, collections, hasMoreProducts, hasMorePosts, hasMoreFeedbacks, onLoadMore }: any) {
    const rentalProducts = (products || []).filter((p: any) => p.listingType === 'rental' || p.category === 'rental' || p.isRental === true);
    const saleProducts = (products || []).filter((p: any) => p.listingType !== 'rental' && p.category !== 'rental' && !p.isRental);
    const displayScore = useMemo(() => (user?.creditScore === undefined || user?.creditScore === 0) ? 500 : safeNum(user.creditScore), [user]);
    const nodeInfo = useMemo(() => getNodeLevel(displayScore), [displayScore]);
    const bannerSrc = user.bannerUrl || (user as any).bannerURL || null;

    const proPrivileges = [
        { icon: Building2, label: 'Property & Rental', desc: 'Exclusive listing type' },
        { icon: TrendingUp, label: 'Priority Ranking', desc: 'Top search results' },
        { icon: Package, label: 'Unlimited Listings', desc: 'No posting cap' },
        { icon: Zap, label: 'Instant Settlement', desc: 'Fast escrow release' },
        { icon: ShieldCheck, label: 'Contract Shield', desc: 'Smart escrow protection' },
        { icon: MessageSquare, label: 'VIP Support', desc: 'Dedicated channel' },
    ];

    return (
        <div className="min-h-screen relative overflow-hidden pb-32" style={{ background: 'radial-gradient(ellipse at 15% 0%, #130820 0%, #0a0a14 45%, #050508 100%)' }}>
            {/* Fixed luxury background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#FFD70010_1px,transparent_1px),linear-gradient(to_bottom,#FFD70010_1px,transparent_1px)] bg-[size:80px_80px]" />
                <div className="pro-blob1 absolute top-[-25%] left-[-15%] w-[90vw] h-[90vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 65%)', filter: 'blur(140px)' }} />
                <div className="pro-blob2 absolute bottom-[-25%] right-[-15%] w-[80vw] h-[80vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 65%)', filter: 'blur(150px)' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vw] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.03) 0%, transparent 70%)', filter: 'blur(120px)' }} />
            </div>

            <div className="relative z-50"><PageHeaderWithBackAndClose backPath="/" /></div>

            {/* ══ HERO BANNER ══ */}
            <div className="relative w-full h-[320px] md:h-[420px] overflow-hidden">
                {bannerSrc ? (
                    <Image src={bannerSrc} alt="Banner" fill className="object-cover object-center scale-105" priority />
                ) : (
                    <div className="absolute inset-0" style={{ background: generateUserBanner(user.id || user.uid || 'default') }}>
                        <div className="absolute inset-0 pro-zigzag" />
                        <div className="absolute top-12 left-20 w-56 h-56 rounded-full blur-[80px] opacity-50" style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />
                        <div className="absolute bottom-12 right-24 w-72 h-72 rounded-full blur-[100px] opacity-35" style={{ background: 'radial-gradient(circle, #A855F7 0%, transparent 70%)' }} />
                        <div className="absolute top-1/3 right-1/3 w-48 h-48 rounded-full blur-[70px] opacity-25" style={{ background: 'radial-gradient(circle, #FF8C00 0%, transparent 70%)' }} />
                    </div>
                )}
                {/* Dramatic multi-stop overlay */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #050508 0%, rgba(5,5,8,0.7) 40%, rgba(5,5,8,0.2) 70%, transparent 100%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(5,5,8,0.6) 0%, transparent 50%, rgba(5,5,8,0.3) 100%)' }} />

                {/* PRO badge — top right */}
                <div className="absolute top-6 right-6 z-10">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-2xl border border-yellow-400/40 px-5 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span className="text-[12px] font-black uppercase tracking-[0.35em] pro-shimmer-text">PRO MERCHANT</span>
                    </div>
                </div>

                {/* Name overlaid on banner bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-10 container mx-auto px-6 md:px-10 pb-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none drop-shadow-[0_4px_40px_rgba(0,0,0,0.8)]">
                            {user.displayName}
                        </h1>
                        {user.loginId && (
                            <p className="text-sm font-mono mt-1 tracking-[0.3em] pro-shimmer-text">@{user.loginId}</p>
                        )}
                    </motion.div>
                </div>

                {/* Gold shimmer bottom border */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.8) 30%, rgba(255,180,0,1) 50%, rgba(255,215,0,0.8) 70%, transparent)' }} />
            </div>

            {/* ══ IDENTITY STRIP ══ */}
            <div className="relative z-20 container mx-auto px-6 md:px-10">

                {/* Avatar + actions row */}
                <div className="flex items-end justify-between gap-6 -mt-12 mb-8">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        {/* Animated outer rings */}
                        <div className="absolute inset-[-10px] rounded-full border-2 border-yellow-400/20 animate-spin-slow" style={{ animationDuration: '8s' }} />
                        <div className="absolute inset-[-20px] rounded-full border border-yellow-400/10 animate-spin-slow" style={{ animationDuration: '14s', animationDirection: 'reverse' }} />
                        <div className="w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden pro-avatar-ring relative z-10">
                            <UserAvatar profile={user} className="w-full h-full" />
                        </div>
                        {/* PRO crown */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                            <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_25px_rgba(255,215,0,0.7)]">
                                <Crown className="w-3 h-3" /> PRO
                            </div>
                        </div>
                        {/* KYC dot */}
                        {user.kycStatus === 'Verified' && (
                            <div className="absolute bottom-0 right-0 z-20 w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 border-2 border-[#050508] flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.6)]">
                                <BadgeCheck className="w-5 h-5 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Right: bio + follow */}
                    <div className="flex-1 min-w-0 pb-2 hidden md:block">
                        {user.bio && <p className="text-white/50 text-sm leading-relaxed max-w-lg">{user.bio}</p>}
                        <div className="flex flex-wrap gap-2 mt-3">
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-400/30 px-3 py-1 rounded-full">
                                <Crown className="w-3 h-3" /> PRO Merchant
                            </span>
                            {user.kycStatus === 'Verified' && (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/25 px-3 py-1 rounded-full">
                                    <Fingerprint className="w-3 h-3" /> KYC Verified
                                </span>
                            )}
                            {(user.web3Verified || user.isWeb3Verified) && (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/25 px-3 py-1 rounded-full">
                                    <Globe className="w-3 h-3" /> Web3
                                </span>
                            )}
                            {(user.isNftVerified) && (
                                <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-3 py-1 rounded-full">
                                    <Sparkles className="w-3 h-3" /> NFT Holder
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Follow button */}
                    {currentUser && currentUser.uid !== user.id && (
                        <Button onClick={onFollowToggle}
                            className={cn("shrink-0 h-14 px-10 rounded-2xl font-black uppercase tracking-wider text-sm transition-all duration-300",
                                isFollowing
                                    ? "bg-white/8 border border-white/15 text-white/70 hover:bg-white/15"
                                    : "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black hover:scale-105 hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] shadow-[0_0_25px_rgba(255,215,0,0.3)]"
                            )}>
                            {isFollowing ? <><Check className="w-4 h-4 mr-2" />Following</> : <><Plus className="w-4 h-4 mr-2" />Follow</>}
                        </Button>
                    )}
                </div>

                {/* Mobile bio */}
                <div className="md:hidden mb-6">
                    {user.bio && <p className="text-white/50 text-sm leading-relaxed">{user.bio}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-400/30 px-3 py-1 rounded-full"><Crown className="w-3 h-3" /> PRO Merchant</span>
                        {user.kycStatus === 'Verified' && <span className="flex items-center gap-1.5 text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/25 px-3 py-1 rounded-full"><Fingerprint className="w-3 h-3" /> KYC</span>}
                    </div>
                </div>

                {/* ── GRAND STATS ROW ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="relative overflow-hidden rounded-[28px] mb-10 p-[1px]"
                    style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.4), rgba(168,85,247,0.2), rgba(255,215,0,0.4))' }}>
                    <div className="relative bg-[#0C0C10]/95 backdrop-blur-3xl rounded-[27px] overflow-hidden">
                        <div className="absolute inset-0 pro-zigzag pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)' }} />
                        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/5 relative z-10">
                            {[
                                { icon: Users, label: 'Followers', value: safeNum(user.followersCount), color: 'text-purple-400' },
                                { icon: ShoppingBag, label: 'On Sale', value: safeNum(user.onSaleCount), color: 'text-blue-400' },
                                { icon: Award, label: 'Sold', value: safeNum(user.salesCount), color: 'text-cyan-400' },
                                { icon: Star, label: 'Rating', value: `${safeNum(user.rating).toFixed(1)}★`, color: 'text-yellow-400' },
                                { icon: Cpu, label: 'Trust Score', value: displayScore, color: displayScore >= 800 ? 'text-purple-400' : displayScore >= 500 ? 'text-primary' : 'text-red-400' },
                            ].map(({ icon: Icon, label, value, color }, i) => (
                                <div key={label} className="flex flex-col items-center justify-center py-7 px-4 gap-1 group hover:bg-white/[0.02] transition-colors">
                                    <Icon className={`w-4 h-4 ${color} mb-1 opacity-60`} />
                                    <p className={`text-3xl md:text-4xl font-black ${color} tracking-tight`}>{value}</p>
                                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ── PRO PRIVILEGES GRID ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] pro-shimmer-text">PRO Exclusive Privileges</h2>
                        <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.3), transparent)' }} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {proPrivileges.map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="group relative overflow-hidden bg-[#0C0C10]/80 backdrop-blur-xl border border-yellow-500/10 rounded-[20px] p-4 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-300 cursor-default pro-float" style={{ animationDelay: `${proPrivileges.indexOf({ icon: Icon, label, desc }) * 0.3}s` }}>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,215,0,0.06), transparent 70%)' }} />
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                    <Icon className="w-5 h-5 text-yellow-400" />
                                </div>
                                <p className="text-xs font-black text-white/90 leading-tight mb-1">{label}</p>
                                <p className="text-[10px] text-white/30 font-mono">{desc}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* ── TRUST SCORE PANEL ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="relative overflow-hidden rounded-[28px] mb-10 p-[1px]"
                    style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(168,85,247,0.15), rgba(6,182,212,0.2))' }}>
                    <div className="relative bg-[#0C0C10]/95 backdrop-blur-3xl rounded-[27px] p-8 overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] opacity-20" style={{ background: 'radial-gradient(circle, #FFD700, transparent)' }} />
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            {/* Score ring */}
                            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-white/5 animate-spin-slow opacity-30" />
                                <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                                    <circle cx="88" cy="88" r="76" stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="transparent" />
                                    <motion.circle cx="88" cy="88" r="76" stroke="url(#goldGrad)" strokeWidth="10" fill="transparent"
                                        initial={{ strokeDashoffset: 478 }}
                                        animate={{ strokeDashoffset: 478 - (478 * displayScore) / 1000 }}
                                        strokeDasharray={478} strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#FFD700" />
                                            <stop offset="50%" stopColor="#FFA500" />
                                            <stop offset="100%" stopColor="#FFD700" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="flex flex-col items-center z-10">
                                    <span className="text-6xl font-black text-white italic tracking-tighter">{displayScore}</span>
                                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest mt-1">Trust_Index</span>
                                </div>
                            </div>
                            {/* Stats */}
                            <div className="flex-1 space-y-4 w-full">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-2xl font-black italic text-white uppercase tracking-tight">Trust_Aggregator</h3>
                                    <div className={cn("px-4 py-1 rounded-full border text-[10px] font-mono font-black tracking-widest uppercase", nodeInfo.color)}>{nodeInfo.label}</div>
                                </div>
                                <p className="text-white/30 text-xs font-mono uppercase tracking-widest">{safeNum(user.reviewsCount)} completed transactions</p>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Positive', count: safeNum(user.goodReviews), color: 'from-green-500 to-emerald-400', text: 'text-green-400' },
                                        { label: 'Neutral', count: safeNum(user.neutralReviews), color: 'from-white/30 to-white/10', text: 'text-white/40' },
                                        { label: 'Negative', count: safeNum(user.badReviews), color: 'from-red-500 to-orange-500', text: 'text-red-400' },
                                    ].map(({ label, count, color, text }) => (
                                        <div key={label} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
                                                <span className={`text-sm font-black ${text}`}>{count}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div className={`h-full rounded-full bg-gradient-to-r ${color}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(count / (safeNum(user.reviewsCount) || 1)) * 100}%` }}
                                                    transition={{ duration: 1, delay: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── PROPERTY SHOWCASE (PRO-only) ── */}
                {rentalProducts.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-10">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-yellow-400" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-yellow-400">Property & Rental</h2>
                            <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.3), transparent)' }} />
                            <span className="text-[10px] font-mono text-yellow-400/40">{rentalProducts.length} listings</span>
                        </div>
                        <div className="relative overflow-hidden rounded-[28px] p-[1px]" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.35), rgba(255,140,0,0.2), rgba(255,215,0,0.35))' }}>
                            <div className="bg-[#0C0C10]/95 rounded-[27px] p-6">
                                <div className="absolute inset-0 pro-zigzag rounded-[27px] pointer-events-none" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                    {rentalProducts.slice(0, 6).map((p: Product) => <ProductCard key={p.id} product={p} />)}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── CONTENT TABS ── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <div className="flex items-center gap-8 border-b border-white/[0.06] pb-0 overflow-x-auto no-scrollbar mb-8">
                        {[
                            { id: 'marketplace', label: 'Market', icon: LayoutGrid },
                            { id: 'posts', label: 'Social', icon: ScrollText },
                            { id: 'reputation', label: 'Reputation', icon: ShieldCheck },
                            { id: 'collections', label: 'Vault', icon: Bookmark },
                        ].map((t) => (
                            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                                className={cn("relative flex items-center gap-2.5 text-xs font-black uppercase tracking-[0.25em] pb-5 shrink-0 transition-all duration-300",
                                    activeTab === t.id ? "text-yellow-400" : "text-white/20 hover:text-white/50"
                                )}>
                                <t.icon className="h-4 w-4" /> {t.label}
                                {activeTab === t.id && (
                                    <motion.div layoutId="proTabLine" className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full"
                                        style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)', boxShadow: '0 0 20px rgba(255,215,0,0.8)' }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[400px]">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                                {activeTab === 'marketplace' && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                        {saleProducts.map((p: Product) => <ProductCard key={p.id} product={p} />)}
                                        {saleProducts.length === 0 && <EmptyState icon={LayoutGrid} text="NO_ASSETS_DEPLOYED" />}
                                        {hasMoreProducts && <Button onClick={() => onLoadMore('marketplace')} className="col-span-full mx-auto mt-8 rounded-full border-yellow-500/20 bg-yellow-500/5 text-yellow-400 py-6 px-10 font-black">LOAD MORE</Button>}
                                    </div>
                                )}
                                {activeTab === 'posts' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {userPosts.map((p: BbsPost) => <BbsPostCard key={p.id} post={p} />)}
                                        {userPosts.length === 0 && <EmptyState icon={ScrollText} text="NO_TRANSMISSIONS" />}
                                        {hasMorePosts && <Button onClick={() => onLoadMore('posts')} className="col-span-full mx-auto mt-8 rounded-full border-yellow-500/20 bg-yellow-500/5 text-yellow-400 py-6 px-10 font-black">LOAD MORE</Button>}
                                    </div>
                                )}
                                {activeTab === 'reputation' && <ReputationTab feedbacks={feedbacks} hasMore={hasMoreFeedbacks} onLoadMore={() => onLoadMore('reputation')} user={user} displayScore={displayScore} nodeInfo={nodeInfo} />}
                                {activeTab === 'collections' && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                        {collections.map((c: Product) => <ProductCard key={c.id} product={c} />)}
                                        {collections.length === 0 && <EmptyState icon={Bookmark} text="VAULT_EMPTY" />}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// ─── Regular Profile ──────────────────────────────────────────
function RegularUserProfile({ user, products, currentUser, isFollowing, onFollowToggle, activeTab, setActiveTab, userPosts, feedbacks, collections, hasMoreProducts, hasMorePosts, hasMoreFeedbacks, onLoadMore }: any) {
    const displayScore = useMemo(() => (user?.creditScore === undefined || user?.creditScore === 0) ? 500 : safeNum(user.creditScore), [user]);
    const nodeInfo = useMemo(() => getNodeLevel(displayScore), [displayScore]);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    return (
        <div onMouseMove={(e) => setMousePos({ x: e.clientX - window.innerWidth / 2, y: e.clientY - window.innerHeight / 2 })}
            className="min-h-screen bg-[#050508] text-white relative overflow-hidden font-sans selection:bg-primary/30">

            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[#050508]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1a1025_0%,#050508_70%)]" />
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
                <motion.div animate={{ x: mousePos.x * -0.05, y: mousePos.y * -0.05 }} className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-primary/10 blur-[150px] rounded-full animate-blob" />
                <motion.div animate={{ x: mousePos.x * 0.04, y: mousePos.y * 0.04 }} className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-purple-600/10 blur-[150px] rounded-full animate-blob animation-delay-2000" />
            </div>

            <PageHeaderWithBackAndClose backPath="/" />

            <div className="h-screen w-full overflow-y-auto relative z-10 no-scrollbar pb-32">
                <main className="container mx-auto px-4 pt-40">
                    <div className="max-w-6xl mx-auto space-y-16">

                        {/* Profile card */}
                        <div className="relative group isolate overflow-hidden rounded-[40px] shadow-2xl" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-[40px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="relative z-10 bg-white/[0.03] border border-white/10 p-10 backdrop-blur-3xl ring-1 ring-white/10 rounded-[40px]">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    <UserAvatar profile={user} className="h-20 w-20 rounded-full border-2 border-white/20 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-2xl md:text-3xl font-black text-white">{user.displayName}</h1>
                                        {user.loginId && <p className="text-xs font-mono text-white/40 mt-1">@{user.loginId}</p>}
                                        {user.bio && <p className="text-sm text-white/50 mt-2 leading-relaxed max-w-lg">{user.bio}</p>}
                                        <div className="flex flex-wrap gap-5 mt-3 text-sm text-white/40">
                                            <span><span className="font-bold text-white/70">{safeNum(user.followersCount)}</span> Followers</span>
                                            <span><span className="font-bold text-white/70">{safeNum(user.followingCount)}</span> Following</span>
                                            <span><span className="font-bold text-white/70">{safeNum(user.postsCount)}</span> Posts</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {user.kycStatus === 'Verified' && <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full"><Fingerprint className="w-3 h-3" /> KYC</span>}
                                            {user.web3Verified && <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full"><Globe className="w-3 h-3" /> Web3</span>}
                                        </div>
                                    </div>
                                    {currentUser && currentUser.uid !== user.id && (
                                        <Button onClick={onFollowToggle}
                                            className={cn("shrink-0 h-10 px-6 rounded-xl font-black uppercase tracking-wider text-xs transition-all",
                                                isFollowing ? "bg-white/10 border border-white/20 text-white hover:bg-white/20" : "bg-purple-600 hover:bg-purple-500 text-white"
                                            )}>
                                            {isFollowing ? <><Check className="w-3 h-3 mr-1.5" />Following</> : <><Plus className="w-3 h-3 mr-1.5" />Follow</>}
                                        </Button>
                                    )}
                                </div>
                                {/* Badges row */}
                                <div className="absolute top-8 right-8 flex gap-2">
                                    {user.web3Verified && <div className="flex items-center gap-1.5 bg-[#A855F7]/20 border border-[#A855F7]/40 px-3 py-1.5 rounded-full text-[#A855F7] font-black text-[10px] uppercase"><Globe className="h-3 w-3" /> WEB3</div>}
                                    {user.kycVerified && <div className="flex items-center gap-1.5 bg-[#22C55E]/20 border border-[#22C55E]/40 px-3 py-1.5 rounded-full text-[#22C55E] font-black text-[10px] uppercase"><ShieldCheck className="h-3 w-3" /> KYC</div>}
                                </div>
                            </div>
                        </div>

                        {/* Trust Aggregator */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Card className="bg-black/40 backdrop-blur-3xl border-white/10 rounded-[40px] p-10 flex flex-col items-center justify-center space-y-6 ring-1 ring-white/10 overflow-hidden isolate" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                                <div className="relative w-44 h-44 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border border-white/5 animate-spin-slow opacity-20" />
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                        <motion.circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="10" fill="transparent"
                                            initial={{ strokeDashoffset: 502 }}
                                            animate={{ strokeDashoffset: 502 - (502 * displayScore) / 1000 }}
                                            strokeDasharray={502}
                                            className={displayScore <= 200 ? "text-red-500" : "text-primary"}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center text-white">
                                        <span className="text-5xl font-black italic tracking-tighter">{displayScore}</span>
                                        <span className="text-[9px] font-mono text-white/40 uppercase mt-1 tracking-widest">Trust_Index</span>
                                    </div>
                                </div>
                                <div className={cn("px-6 py-2 rounded-full border text-[11px] font-mono font-black tracking-[0.2em] uppercase shadow-inner", nodeInfo.color)}>{nodeInfo.label}</div>
                            </Card>

                            <Card className="bg-black/40 backdrop-blur-3xl border-white/10 rounded-[40px] p-10 md:col-span-2 space-y-8 relative overflow-hidden ring-1 ring-white/10 isolate" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                                <div className="flex items-center gap-6 border-b border-white/5 pb-6">
                                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary">
                                        <Cpu className={cn("h-8 w-8", displayScore <= 200 && "text-red-500 animate-pulse")} />
                                    </div>
                                    <div>
                                        <h4 className="text-4xl font-black italic uppercase tracking-tighter text-white">Trust_Aggregator</h4>
                                        <p className="text-white/30 text-[11px] font-mono uppercase tracking-widest">Operational History: {safeNum(user.reviewsCount)} Deployments</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-8">
                                    {[
                                        { l: 'POSITIVE', c: user.goodReviews, color: 'from-green-500 to-emerald-400' },
                                        { l: 'NEUTRAL', c: user.neutralReviews, color: 'from-white/30 to-white/10' },
                                        { l: 'NEGATIVE', c: user.badReviews, color: 'from-red-500 to-orange-500' }
                                    ].map(i => (
                                        <div key={i.l} className="space-y-3">
                                            <div className="flex justify-between text-[10px] font-mono font-black uppercase text-white/40 tracking-widest">
                                                <span>{i.l}</span><span className="text-white">{safeNum(i.c)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className={cn("h-full rounded-full bg-gradient-to-r", i.color)} style={{ width: `${(safeNum(i.c) / (safeNum(user.reviewsCount) || 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Tabs */}
                        <div className="space-y-12 pb-24">
                            <div className="flex items-center gap-10 border-b border-white/5 pb-0">
                                {[
                                    { id: 'marketplace', label: 'Market', icon: LayoutGrid },
                                    { id: 'posts', label: 'Social', icon: ScrollText },
                                    { id: 'reputation', label: 'Reputation', icon: ShieldCheck },
                                    { id: 'collections', label: 'Vault', icon: Bookmark }
                                ].map((t) => (
                                    <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                                        className={cn("relative flex items-center gap-2.5 text-xs font-black uppercase tracking-[0.3em] pb-6 transition-all duration-300",
                                            activeTab === t.id ? "text-primary" : "text-white/20 hover:text-white/60"
                                        )}>
                                        <t.icon className="h-4 w-4" /> {t.label}
                                        {activeTab === t.id && <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary shadow-[0_0_20px_#ec4899]" />}
                                    </button>
                                ))}
                            </div>
                            <div className="min-h-[600px]">
                                <AnimatePresence mode="wait">
                                    <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                        {activeTab === 'marketplace' && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                                {products.map((p: Product) => <ProductCard key={p.id} product={p} />)}
                                                {products.length === 0 && <EmptyState icon={LayoutGrid} text="SYSTEM_EMPTY: NO_ASSETS_DEPLOYED" />}
                                                {hasMoreProducts && <Button onClick={() => onLoadMore('marketplace')} className="col-span-full mx-auto mt-16 rounded-full border-white/10 bg-white/5 py-8 px-12 font-black">LOAD_MORE_MARKET_DATA</Button>}
                                            </div>
                                        )}
                                        {activeTab === 'posts' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {userPosts.map((p: BbsPost) => <BbsPostCard key={p.id} post={p} />)}
                                                {userPosts.length === 0 && <EmptyState icon={ScrollText} text="CONNECTION_IDLE: NO_TRANSMISSIONS" />}
                                                {hasMorePosts && <Button onClick={() => onLoadMore('posts')} className="col-span-full mx-auto mt-16 rounded-full border-white/10 bg-white/5 py-8 px-12 font-black">SYNC_ARCHIVED_LOGS</Button>}
                                            </div>
                                        )}
                                        {activeTab === 'reputation' && <ReputationTab feedbacks={feedbacks} hasMore={hasMoreFeedbacks} onLoadMore={() => onLoadMore('reputation')} user={user} displayScore={displayScore} nodeInfo={nodeInfo} />}
                                        {activeTab === 'collections' && (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                                {collections.map((c: Product) => <ProductCard key={c.id} product={c} />)}
                                                {collections.length === 0 && <EmptyState icon={Bookmark} text="VAULT_SECURED: NO_COLLECTIONS" />}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

// ─── Reputation Tab (shared) ──────────────────────────────────
function ReputationTab({ feedbacks, hasMore, onLoadMore, user, displayScore, nodeInfo }: any) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
            {feedbacks.map((f: any) => (
                <Card key={f.id} className={cn(
                    "bg-white/[0.03] border-l-[6px] p-8 rounded-[32px] backdrop-blur-3xl border-white/5 relative transition-all hover:bg-white/[0.05]",
                    f.type === 'positive' ? "border-l-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]" :
                    f.type === 'negative' ? "border-l-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-l-white/20"
                )}>
                    <div className="flex justify-between items-start mb-6 font-mono text-[11px] uppercase text-white/60">
                        <span>{f.type}_FEEDBACK</span>
                        <span>{f.createdAt?.seconds ? new Date(f.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <p className="text-base text-white/80 italic mb-6 leading-relaxed font-medium">"{f.comment || 'Transaction finalized.'}"</p>
                    <div className="flex items-center gap-4 py-4 px-4 bg-white/5 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/5">
                        <div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                            <img src={f.itemImage || '/placeholder.png'} className="object-cover w-full h-full" alt="asset" />
                        </div>
                        <div className="overflow-hidden space-y-1">
                            <p className="text-[10px] text-white/40 uppercase font-mono truncate">{f.itemName || 'Asset_Unknown'}</p>
                            <p className="text-[9px] text-primary font-black">REF_ID: {f.orderId?.substring(0, 8).toUpperCase()}</p>
                        </div>
                    </div>
                </Card>
            ))}
            {feedbacks.length === 0 && <EmptyState icon={ShieldCheck} text="CLEAN_RECORD: NO_FEEDBACK_DETECTED" />}
            {hasMore && <Button onClick={onLoadMore} className="col-span-full mx-auto mt-8 rounded-full border-white/10 bg-white/5 py-8 px-12 font-black">LOAD MORE</Button>}
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────
function EmptyState({ icon: Icon, text }: any) {
    return (
        <div className="col-span-full h-72 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[40px] bg-white/[0.01] animate-in fade-in zoom-in">
            <div className="p-5 rounded-full bg-white/[0.02] border border-white/5 mb-6">
                <Icon className="h-8 w-8 text-white/10" />
            </div>
            <p className="font-mono text-primary/50 text-[10px] uppercase tracking-[0.5em] font-black">{text}</p>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────
function UserProfileSkeleton() {
    return (
        <div className="min-h-screen bg-[#050508] p-8 pt-48 space-y-12">
            <Skeleton className="h-96 w-full max-w-6xl mx-auto rounded-[40px] bg-white/5" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <Skeleton className="h-64 rounded-[40px] bg-white/5" />
                <Skeleton className="h-64 md:col-span-2 rounded-[40px] bg-white/5" />
            </div>
        </div>
    );
}

// ─── Main Export ──────────────────────────────────────────────
export default function ClientUserProfile() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { user: currentUser } = useUser();

    const identifier = params.loginId as string;

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'marketplace' | 'posts' | 'reputation' | 'collections'>('marketplace');
    const [isFollowing, setIsFollowing] = useState(false);
    const [showSnake, setShowSnake] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [lastProduct, setLastProduct] = useState<any>(null);
    const [hasMoreProducts, setHasMoreProducts] = useState(false);

    const [userPosts, setUserPosts] = useState<BbsPost[]>([]);
    const [lastPost, setLastPost] = useState<any>(null);
    const [hasMorePosts, setHasMorePosts] = useState(false);

    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [lastFeedback, setLastFeedback] = useState<any>(null);
    const [hasMoreFeedbacks, setHasMoreFeedbacks] = useState(false);

    const [collections, setCollections] = useState<Product[]>([]);
    const [lastCollection, setLastCollection] = useState<any>(null);

    useEffect(() => {
        if (!firestore || !identifier) return;
        (async () => {
            setLoading(true);
            try {
                let userDoc;
                if (/^\d{3,}$/.test(identifier)) {
                    const q = query(collection(firestore, 'users'), where('loginId', '==', identifier), limit(1));
                    const snap = await getDocs(q);
                    userDoc = snap.docs[0];
                } else {
                    userDoc = await getDoc(doc(firestore, 'users', identifier));
                }
                if (userDoc?.exists()) setUser({ id: userDoc.id, ...userDoc.data() } as UserProfile);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        })();
    }, [firestore, identifier]);

    useEffect(() => {
        if (!firestore || !user) return;
        (async () => {
            try {
                const [pS, bS, rS, cS] = await Promise.all([
                    getDocs(query(collection(firestore, 'products'), where('sellerId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(50))),
                    getDocs(query(collection(firestore, 'bbs'), where('authorId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(50))),
                    getDocs(query(collection(firestore, 'reviews'), where('targetUserId', '==', user.id), orderBy('createdAt', 'desc'), limit(50))),
                    getDocs(query(collection(firestore, 'products'), where('favoritedBy', 'array-contains', user.id), limit(50)))
                ]);
                setProducts(pS.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
                setLastProduct(pS.docs[pS.docs.length - 1]); setHasMoreProducts(pS.docs.length === 50);
                setUserPosts(bS.docs.map(d => ({ id: d.id, ...d.data() } as BbsPost)));
                setLastPost(bS.docs[bS.docs.length - 1]); setHasMorePosts(bS.docs.length === 50);
                setFeedbacks(rS.docs.map(d => ({ id: d.id, ...d.data() })));
                setLastFeedback(rS.docs[rS.docs.length - 1]); setHasMoreFeedbacks(rS.docs.length === 50);
                setCollections(cS.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
                setLastCollection(cS.docs[cS.docs.length - 1]);
            } catch (e) { console.warn("Data sync partially failed."); }
        })();
    }, [firestore, user]);

    const handleLoadMore = useCallback(async (tab: string) => {
        if (!firestore || !user) return;
        if (tab === 'marketplace' && lastProduct) {
            const s = await getDocs(query(collection(firestore, 'products'), where('sellerId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), startAfter(lastProduct), limit(50)));
            setProducts(p => [...p, ...s.docs.map(d => ({ id: d.id, ...d.data() } as Product))]);
            setLastProduct(s.docs[s.docs.length - 1]); setHasMoreProducts(s.docs.length === 50);
        } else if (tab === 'posts' && lastPost) {
            const s = await getDocs(query(collection(firestore, 'bbs'), where('authorId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), startAfter(lastPost), limit(50)));
            setUserPosts(p => [...p, ...s.docs.map(d => ({ id: d.id, ...d.data() } as BbsPost))]);
            setLastPost(s.docs[s.docs.length - 1]); setHasMorePosts(s.docs.length === 50);
        } else if (tab === 'reputation' && lastFeedback) {
            const s = await getDocs(query(collection(firestore, 'reviews'), where('targetUserId', '==', user.id), orderBy('createdAt', 'desc'), startAfter(lastFeedback), limit(50)));
            setFeedbacks(p => [...p, ...s.docs.map(d => ({ id: d.id, ...d.data() }))]);
            setLastFeedback(s.docs[s.docs.length - 1]); setHasMoreFeedbacks(s.docs.length === 50);
        }
    }, [firestore, user, lastProduct, lastPost, lastFeedback]);

    if (loading) return <UserProfileSkeleton />;
    if (!user) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-primary animate-pulse tracking-[0.5em]">
            PROTOCOL_SYNC_ERROR
            <Button onClick={() => router.push('/')} variant="ghost" className="mt-8 text-white/40 hover:text-white uppercase tracking-[0.2em]">Force_Return_Home</Button>
        </div>
    );

    const sharedProps = {
        user, products, currentUser, isFollowing,
        onFollowToggle: () => setIsFollowing(f => !f),
        activeTab, setActiveTab,
        userPosts, feedbacks, collections,
        hasMoreProducts, hasMorePosts, hasMoreFeedbacks,
        onLoadMore: handleLoadMore,
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: proStyles }} />
            {(user as any).isPro
                ? <ProUserProfile {...sharedProps} />
                : <RegularUserProfile {...sharedProps} />
            }
            <button onClick={() => setShowSnake(true)} className="fixed bottom-12 left-8 z-[60] text-white/10 hover:text-primary transition-all">
                <Gamepad2 className="h-6 w-6" />
            </button>
            <AnimatePresence>
                {showSnake && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CyberSnakeGame onClose={() => setShowSnake(false)} /></motion.div>}
            </AnimatePresence>
        </>
    );
}

// ─── Snake Game ───────────────────────────────────────────────
function CyberSnakeGame({ onClose }: any) {
    const [snake, setSnake] = useState([[10, 10]]);
    const [food, setFood] = useState([5, 5]);
    const [dir, setDir] = useState([0, -1]);
    const [gameOver, setGameOver] = useState(false);
    const move = useCallback(() => {
        if (gameOver) return;
        setSnake((prev) => {
            const h = [prev[0][0] + dir[0], prev[0][1] + dir[1]];
            if (h[0] < 0 || h[0] >= 20 || h[1] < 0 || h[1] >= 20 || prev.some(s => s[0] === h[0] && s[1] === h[1])) { setGameOver(true); return prev; }
            const n = [h, ...prev];
            if (h[0] === food[0] && h[1] === food[1]) setFood([Math.floor(Math.random() * 20), Math.floor(Math.random() * 20)]);
            else n.pop();
            return n;
        });
    }, [dir, food, gameOver]);
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') setDir([0, -1]); else if (e.key === 'ArrowDown') setDir([0, 1]);
            else if (e.key === 'ArrowLeft') setDir([-1, 0]); else if (e.key === 'ArrowRight') setDir([1, 0]);
        };
        window.addEventListener('keydown', h);
        const i = setInterval(move, 120);
        return () => { window.removeEventListener('keydown', h); clearInterval(i); };
    }, [move]);
    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#0A0A0C] border border-primary/30 p-10 rounded-[40px] relative shadow-[0_0_100px_rgba(236,72,153,0.1)]">
                <button onClick={onClose} className="absolute top-8 right-8 text-white/30 hover:text-white transition-all"><X className="h-6 w-6" /></button>
                <div className="mb-8 flex justify-between font-mono text-primary uppercase text-xs tracking-widest font-black"><span>Luna_Snake_v1.0</span><span>Score: {snake.length - 1}</span></div>
                <div className="w-[320px] h-[320px] bg-black/50 border border-white/5" style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gridTemplateRows: 'repeat(20, 1fr)' }}>
                    {snake.map((s, i) => <div key={i} className={cn("bg-primary", i === 0 && "bg-white shadow-[0_0_15px_#fff]")} style={{ gridColumnStart: s[0] + 1, gridRowStart: s[1] + 1 }} />)}
                    <div className="bg-red-500 animate-pulse shadow-[0_0_15px_red]" style={{ gridColumnStart: food[0] + 1, gridRowStart: food[1] + 1 }} />
                </div>
                {gameOver && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-[40px] p-8 text-center animate-in fade-in duration-500">
                        <Activity className="h-12 w-12 text-red-500 mb-4 animate-pulse" />
                        <p className="text-red-500 font-black text-xl mb-6 uppercase tracking-tighter italic">Critical_System_Failure</p>
                        <Button onClick={() => { setSnake([[10, 10]]); setDir([0, -1]); setGameOver(false); }} className="rounded-full bg-red-500 text-black font-black px-10 h-14 shadow-[0_0_20px_rgba(239,68,68,0.4)]">REBOOT_CORE</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
