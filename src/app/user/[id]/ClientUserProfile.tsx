'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import {
    Gem, ShoppingBag, ShoppingCart, Star, ShieldCheck, Plus, Check,
    Globe, Fingerprint, Crown, MapPin, Link2, Home, Zap, Award,
    TrendingUp, MessageSquare, Users, Package, BadgeCheck, Sparkles,
    Building2, ChevronRight,
} from "lucide-react";
import { notFound } from "next/navigation";
import type { UserProfile, Product } from "@/lib/types";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { UserAvatar } from '@/components/ui/user-avatar';
import { ProductCard } from "@/components/product-card";
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { doc, collection, query, where, increment, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from "next/image";
import { motion } from "framer-motion";

interface ClientUserProfileProps {
    id: string;
}

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z" />
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z" />
    </svg>
);

const proStyles = `
  @keyframes pro-blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-25px,20px) scale(0.95)} }
  @keyframes pro-blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-30px,25px) scale(1.05)} 66%{transform:translate(25px,-20px) scale(1.1)} }
  @keyframes pro-blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,30px) scale(0.9)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .pro-blob1 { animation: pro-blob1 9s ease-in-out infinite; }
  .pro-blob2 { animation: pro-blob2 11s ease-in-out infinite; }
  .pro-blob3 { animation: pro-blob3 13s ease-in-out infinite; }
  .pro-zigzag {
    background-image: repeating-linear-gradient(45deg, rgba(255,215,0,0.06) 0px, rgba(255,215,0,0.06) 2px, transparent 2px, transparent 14px),
                      repeating-linear-gradient(-45deg, rgba(168,85,247,0.06) 0px, rgba(168,85,247,0.06) 2px, transparent 2px, transparent 14px);
  }
  .pro-dots {
    background-image: radial-gradient(circle, rgba(255,215,0,0.15) 1.5px, transparent 1.5px),
                      radial-gradient(circle, rgba(168,85,247,0.1) 1px, transparent 1px);
    background-size: 22px 22px, 11px 11px;
    background-position: 0 0, 11px 11px;
  }
  .pro-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,215,0,0.1), transparent);
    background-size: 200% 100%;
    animation: shimmer 3s infinite;
  }
`;

function ProStatCard({ icon: Icon, label, value, accent = 'purple', href }: { icon: any; label: string; value: string | number; accent?: string; href?: string }) {
    const colors: Record<string, string> = {
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        gold: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
    };
    const inner = (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${colors[accent]} backdrop-blur-sm`}>
            <Icon className={`w-5 h-5 ${accent === 'gold' ? 'text-yellow-400' : accent === 'cyan' ? 'text-cyan-400' : accent === 'green' ? 'text-green-400' : 'text-purple-400'} shrink-0`} />
            <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">{label}</p>
                <p className="text-lg font-black text-white">{value}</p>
            </div>
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

function ProUserProfile({ user, products, currentUser, isFollowing, onFollowToggle, t }: any) {
    const rentalProducts = (products || []).filter((p: any) => p.listingType === 'rental' || p.category === 'rental' || p.isRental === true);
    const regularProducts = (products || []).filter((p: any) => p.listingType !== 'rental' && p.category !== 'rental' && !p.isRental);

    return (
        <div className="min-h-screen relative overflow-hidden pb-24" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1a0a2e 0%, #0d0d1a 40%, #050508 100%)' }}>
            <style dangerouslySetInnerHTML={{ __html: proStyles }} />

            {/* Page header */}
            <div className="relative z-50"><PageHeaderWithBackAndClose /></div>

            {/* ── Banner ── */}
            <div className="relative w-full h-[280px] md:h-[360px] overflow-hidden">
                {user.bannerUrl ? (
                    <Image src={user.bannerUrl} alt="Banner" fill className="object-cover object-center" priority />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-fuchsia-900/50 to-yellow-900/40" />
                )}
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/40 to-transparent" />
                {/* PRO shimmer line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
            </div>

            {/* ── Avatar + Identity ── */}
            <div className="relative z-20 container mx-auto px-4 -mt-16 md:-mt-20">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-10">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-yellow-400/60 shadow-[0_0_40px_rgba(255,215,0,0.3)]">
                            <UserAvatar profile={user} className="w-full h-full" />
                        </div>
                        {/* PRO crown */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-400 text-black text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                            <Crown className="w-3 h-3" /> PRO
                        </div>
                    </div>

                    {/* Name + bio */}
                    <div className="flex-1 min-w-0 pb-2">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{user.displayName}</h1>
                            {user.kycStatus === 'Verified' && (
                                <BadgeCheck className="w-6 h-6 text-yellow-400 shrink-0" />
                            )}
                        </div>
                        {user.loginId && (
                            <p className="text-sm font-mono text-purple-300/70 mb-2">luna.gift/@{user.loginId}</p>
                        )}
                        {user.bio && (
                            <p className="text-white/70 text-sm leading-relaxed max-w-xl">{user.bio}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-white/50">
                            <Link href={`/user/${user.uid}/followers`} className="hover:text-white transition-colors">
                                <span className="font-black text-white">{user.followersCount || 0}</span> {t('userProfile.proFollowers')}
                            </Link>
                            <Link href={`/user/${user.uid}/following`} className="hover:text-white transition-colors">
                                <span className="font-black text-white">{user.followingCount || 0}</span> {t('userProfile.proFollowing')}
                            </Link>
                            <Link href={`/bbs?author=${user.uid}`} className="hover:text-white transition-colors">
                                <span className="font-black text-white">{user.postsCount || 0}</span> {t('userProfile.proPosts')}
                            </Link>
                        </div>
                    </div>

                    {/* Follow button */}
                    {currentUser && currentUser.uid !== user.uid && (
                        <Button
                            onClick={onFollowToggle}
                            className={cn(
                                "shrink-0 h-11 px-8 rounded-2xl font-black uppercase tracking-wider text-sm transition-all",
                                isFollowing
                                    ? "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                                    : "bg-gradient-to-r from-yellow-500 to-amber-400 text-black hover:scale-105 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                            )}
                        >
                            {isFollowing ? <><Check className="w-4 h-4 mr-2" />{t('userProfile.alreadyFollowing')}</> : <><Plus className="w-4 h-4 mr-2" />{t('userProfile.follow')}</>}
                        </Button>
                    )}
                </div>

                {/* ── Stats row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                    <ProStatCard icon={Star} label={t('accountPage.rating')} value={`${(user.rating || 0).toFixed(1)} ★`} accent="gold" />
                    <ProStatCard icon={ShoppingBag} label={t('sellerProfile.onSale')} value={user.onSaleCount ?? 0} accent="purple" href={`/user/${user.uid}/listings`} />
                    <ProStatCard icon={ShoppingCart} label={t('sellerProfile.sold')} value={user.salesCount || 0} accent="cyan" href={`/user/${user.uid}/sold`} />
                    <ProStatCard icon={Gem} label={t('accountPage.creditLevel')} value={user.creditLevel || t('userProfile.newcomer')} accent="green" />
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: PRO privileges cards */}
                    <div className="space-y-6">

                        {/* Verifications */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                            className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-white/10 rounded-[28px] p-6">
                            <div className="pro-blob1 absolute -top-12 -right-12 w-40 h-40 rounded-full blur-[60px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFE66D 0%, #FF8E53 60%, transparent 100%)' }} />
                            <div className="absolute inset-0 pro-dots pointer-events-none rounded-[28px]" />
                            <div className="relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 flex items-center gap-2 mb-4">
                                    <BadgeCheck className="w-4 h-4" /> {t('userProfile.proVerifications')}
                                </h3>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                        <Crown className="w-4 h-4 text-yellow-400" />
                                        <span className="text-sm font-bold text-yellow-400">{t('userProfile.proMerchant')}</span>
                                        <span className="ml-auto text-[10px] font-mono text-yellow-400/60">{t('userProfile.proActive')}</span>
                                    </div>
                                    {user.kycStatus === 'Verified' && (
                                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                                            <Fingerprint className="w-4 h-4 text-green-400" />
                                            <span className="text-sm font-bold text-green-400">{t('userProfile.kycVerified')}</span>
                                        </div>
                                    )}
                                    {user.isWeb3Verified && (
                                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <Globe className="w-4 h-4 text-blue-400" />
                                            <span className="text-sm font-bold text-blue-400">{t('userProfile.web3Identity')}</span>
                                        </div>
                                    )}
                                    {user.isNftVerified && (
                                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                            <EthereumIcon className="w-4 h-4 stroke-indigo-400" />
                                            <span className="text-sm font-bold text-indigo-400">{t('userProfile.nftHolder')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* PRO Privileges */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-white/10 rounded-[28px] p-6">
                            <div className="pro-blob2 absolute -bottom-10 -left-10 w-36 h-36 rounded-full blur-[55px] opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #A855F7 0%, transparent 70%)' }} />
                            <div className="absolute inset-0 pro-zigzag pointer-events-none rounded-[28px]" />
                            <div className="relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2 mb-4">
                                    <Sparkles className="w-4 h-4" /> {t('userProfile.proPrivileges')}
                                </h3>
                                <ul className="space-y-2 text-sm text-white/70">
                                    {[
                                        { icon: Home, label: t('userProfile.privilege_propertyRental') },
                                        { icon: TrendingUp, label: t('userProfile.privilege_prioritySearch') },
                                        { icon: Award, label: t('userProfile.privilege_featuredBadge') },
                                        { icon: Package, label: t('userProfile.privilege_unlimitedListings') },
                                        { icon: Zap, label: t('userProfile.privilege_instantEscrow') },
                                        { icon: MessageSquare, label: t('userProfile.privilege_dedicatedSupport') },
                                    ].map(({ icon: Icon, label }) => (
                                        <li key={label} className="flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                                                <Icon className="w-3.5 h-3.5 text-purple-400" />
                                            </div>
                                            <span>{label}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>

                        {/* Credit score */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-white/10 rounded-[28px] p-6">
                            <div className="pro-blob3 absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[50px] opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #4ECDC4 0%, transparent 70%)' }} />
                            <div className="relative z-10">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-4 h-4" /> {t('userProfile.trustScore')}
                                </h3>
                                <div className="text-center py-2">
                                    <p className="text-5xl font-black text-white">{user.creditScore || 0}</p>
                                    <p className="text-sm font-bold text-cyan-400 mt-1">{user.creditLevel || t('userProfile.newcomer')}</p>
                                    <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all" style={{ width: `${Math.min((user.creditScore || 0) / 10, 100)}%` }} />
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-2 font-mono uppercase tracking-widest">{user.reviewsCount || 0} {t('userProfile.reviews')}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Listings */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Property / Rental showcase */}
                        {rentalProducts.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-yellow-500/20 rounded-[28px] p-6">
                                <div className="pro-blob1 absolute -top-14 -right-14 w-48 h-48 rounded-full blur-[65px] opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFE66D 0%, #FF8E53 60%, transparent 100%)' }} />
                                <div className="absolute inset-0 pro-dots pointer-events-none rounded-[28px] opacity-60" />
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
                                <div className="relative z-10">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 flex items-center gap-2 mb-5">
                                        <Building2 className="w-4 h-4" /> {t('userProfile.propertyRentalListings')}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {rentalProducts.slice(0, 4).map((p: Product) => (
                                            <ProductCard key={p.id} product={p} />
                                        ))}
                                    </div>
                                    {rentalProducts.length > 4 && (
                                        <Link href={`/user/${user.uid}/listings`} className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-yellow-400/70 hover:text-yellow-400 transition-colors">
                                            {t('userProfile.viewAllProperties').replace('{count}', String(rentalProducts.length))} <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Regular product listings */}
                        {regularProducts.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-white/10 rounded-[28px] p-6">
                                <div className="pro-blob2 absolute -top-12 -left-12 w-44 h-44 rounded-full blur-[60px] opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #A855F7 0%, #FF6B6B 60%, transparent 100%)' }} />
                                <div className="absolute inset-0 pro-zigzag pointer-events-none rounded-[28px]" />
                                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4" /> {t('userProfile.activeListings')}
                                        </h3>
                                        <Link href={`/user/${user.uid}/listings`} className="text-[10px] font-mono uppercase tracking-widest text-white/30 hover:text-white transition-colors flex items-center gap-1">
                                            {t('userProfile.viewAll')} <ChevronRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {regularProducts.slice(0, 6).map((p: Product) => (
                                            <ProductCard key={p.id} product={p} />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {regularProducts.length === 0 && rentalProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-white/20">
                                <Package className="w-12 h-12 mb-4" />
                                <p className="text-sm font-mono uppercase tracking-widest">{t('userProfile.noListingsYet')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RegularUserProfile({ user, products, currentUser, isFollowing, onFollowToggle, t }: any) {
    return (
        <div className="min-h-screen bg-[#050508]">
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

                {/* Profile card */}
                <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <UserAvatar profile={user} className="h-16 w-16 rounded-full border-2 border-white/15" />
                            <div>
                                <h1 className="text-xl font-black text-white">{user.displayName}</h1>
                                {user.loginId && <p className="text-xs font-mono text-white/40 mt-0.5">@{user.loginId}</p>}
                                <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                                    <Link href={`/user/${user.uid}/followers`} className="hover:text-white transition-colors">
                                        <span className="font-bold text-white/70">{user.followersCount || 0}</span> {t('userProfile.followers')}
                                    </Link>
                                    <span>·</span>
                                    <Link href={`/user/${user.uid}/following`} className="hover:text-white transition-colors">
                                        <span className="font-bold text-white/70">{user.followingCount || 0}</span> {t('userProfile.following')}
                                    </Link>
                                    <span>·</span>
                                    <Link href={`/bbs?author=${user.uid}`} className="hover:text-white transition-colors">
                                        <span className="font-bold text-white/70">{user.postsCount || 0}</span> {t('userProfile.posts')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                        {currentUser && currentUser.uid !== user.uid && (
                            <Button
                                onClick={onFollowToggle}
                                size="sm"
                                className={cn(
                                    "rounded-xl font-bold text-xs px-5",
                                    isFollowing ? "bg-white/10 border border-white/20 text-white hover:bg-white/20" : "bg-purple-600 hover:bg-purple-500 text-white"
                                )}
                            >
                                {isFollowing ? <><Check className="w-3 h-3 mr-1.5" />{t('userProfile.alreadyFollowing')}</> : <><Plus className="w-3 h-3 mr-1.5" />{t('userProfile.follow')}</>}
                            </Button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mt-5">
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 text-center">
                            <p className="text-lg font-black text-white">{(user.rating || 0).toFixed(1)}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{t('accountPage.rating')}</p>
                        </div>
                        <Link href={`/user/${user.uid}/listings`} className="p-3 rounded-xl bg-white/[0.03] border border-white/8 text-center hover:border-white/20 transition-colors">
                            <p className="text-lg font-black text-white">{user.onSaleCount ?? 0}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{t('sellerProfile.onSale')}</p>
                        </Link>
                        <Link href={`/user/${user.uid}/sold`} className="p-3 rounded-xl bg-white/[0.03] border border-white/8 text-center hover:border-white/20 transition-colors">
                            <p className="text-lg font-black text-white">{user.salesCount || 0}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{t('sellerProfile.sold')}</p>
                        </Link>
                    </div>

                    {/* Verifications */}
                    {(user.isWeb3Verified || user.isNftVerified || user.kycStatus === 'Verified') && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {user.kycStatus === 'Verified' && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
                                    <Fingerprint className="w-3 h-3" /> KYC
                                </span>
                            )}
                            {user.isWeb3Verified && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                                    <Globe className="w-3 h-3" /> WEB3
                                </span>
                            )}
                            {user.isNftVerified && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                                    <EthereumIcon className="w-3 h-3 stroke-indigo-400" /> NFT
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Listings */}
                {products && products.length > 0 && (
                    <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[24px] p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-black uppercase tracking-widest text-white/60">
                                {t('userProfile.latestListings').replace('{userName}', user.displayName)}
                            </h2>
                            <Link href={`/user/${user.uid}/listings`} className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                                {t('userProfile.viewAll')} <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.slice(0, 6).map((product: Product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function UserProfileSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full bg-white/5" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-36 bg-white/5" />
                            <Skeleton className="h-3 w-48 bg-white/5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[0,1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />)}
                    </div>
                </div>
            </div>
        </>
    );
}

export default function ClientUserProfile({ id }: ClientUserProfileProps) {
    const { t } = useTranslation();
    const userId = id;

    const { user: currentUser, profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userRef = useMemo(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: user, loading: userLoading } = useDoc<UserProfile>(userRef);

    const productsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'products'), where('sellerId', '==', userId), where('status', '==', 'active'));
    }, [firestore, userId]);
    const { data: products, loading: productsLoading } = useCollection<Product>(productsQuery);

    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (currentUserProfile && user) {
            setIsFollowing(currentUserProfile.following?.includes(user.uid) || false);
        }
    }, [currentUserProfile, user]);

    const handleFollowToggle = async () => {
        if (!currentUser || !currentUserProfile || !user || !firestore) {
            toast({ variant: 'destructive', title: t('common.loginToInteract') });
            return;
        }
        const newFollowingState = !isFollowing;
        setIsFollowing(newFollowingState);
        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        const targetUserRef = doc(firestore, 'users', user.uid);
        const batch = writeBatch(firestore);
        try {
            batch.update(currentUserRef, {
                following: newFollowingState ? arrayUnion(user.uid) : arrayRemove(user.uid),
                followingCount: increment(newFollowingState ? 1 : -1)
            });
            batch.update(targetUserRef, {
                followers: newFollowingState ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
                followersCount: increment(newFollowingState ? 1 : -1)
            });
            await batch.commit();
            toast({ title: newFollowingState ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess') });
        } catch (error) {
            setIsFollowing(!newFollowingState);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${user.uid} or users/${currentUser.uid}`,
                operation: 'update',
            }));
        }
    };

    if (userLoading || productsLoading) return <UserProfileSkeleton />;
    if (!user) return notFound();

    const props = { user, products, currentUser, isFollowing, onFollowToggle: handleFollowToggle, t };

    return user.isPro
        ? <ProUserProfile {...props} />
        : <RegularUserProfile {...props} />;
}
