// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToR2 } from '@/lib/upload';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Loader2, ArrowLeft, Save, Home, MapPin, DollarSign,
  Users, Bed, Bath, Wifi, Tv, Utensils, Car, Snowflake,
  Waves, Dumbbell, Trash2, Plus, Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const AMENITY_OPTIONS = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'tv', label: '电视', icon: Tv },
  { id: 'kitchen', label: '厨房', icon: Utensils },
  { id: 'free_parking', label: '停车位', icon: Car },
  { id: 'ac', label: '空调', icon: Snowflake },
  { id: 'pool', label: '游泳池', icon: Waves },
  { id: 'gym', label: '健身房', icon: Dumbbell },
];

export default function RentalEditPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    pricePerDay: 0,
    maxGuests: 1,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [] as string[],
  });

  useEffect(() => {
    if (!firestore || !id) return;
    getDoc(doc(firestore, 'rentalProperties', id))
      .then(snap => {
        if (!snap.exists()) { setLoading(false); return; }
        const data = snap.data();
        setProperty({ id: snap.id, ...data });
        setImages(data.images || []);
        setForm({
          title: data.title || '',
          description: data.description || '',
          pricePerDay: data.pricePerDay || data.pricePerNight || data.price || 0,
          maxGuests: data.maxGuests || 1,
          bedrooms: data.bedrooms || 1,
          bathrooms: data.bathrooms || 1,
          amenities: data.amenities || [],
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [firestore, id]);

  // Access check
  useEffect(() => {
    if (!loading && property && user) {
      const isOwner = property.ownerId === user.uid || property.hostId === user.uid;
      const isAdmin = ['admin', 'ghost', 'staff'].includes(profile?.role || '');
      if (!isOwner && !isAdmin) {
        toast({ variant: 'destructive', title: '无权限', description: '你无法编辑此房源。' });
        router.push('/account/my-rentals');
      }
    }
  }, [loading, property, user, profile]);

  const toggleAmenity = (id: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter(a => a !== id)
        : [...prev.amenities, id],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingImage(true);
    try {
      const url = await uploadToR2(file, 'rental-images');
      setImages(prev => [...prev, url]);
    } catch (err) {
      toast({ variant: 'destructive', title: '上传失败', description: '图片上传失败，请重试。' });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!firestore || !property) return;
    if (!form.title.trim()) {
      toast({ variant: 'destructive', title: '请填写房源标题' });
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(firestore, 'rentalProperties', id), {
        title: form.title.trim(),
        description: form.description.trim(),
        pricePerDay: Number(form.pricePerDay),
        pricePerNight: Number(form.pricePerDay),
        price: Number(form.pricePerDay),
        maxGuests: Number(form.maxGuests),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        amenities: form.amenities,
        images,
        updatedAt: serverTimestamp(),
        // Reset to pending_review only if it was active (re-review after edit)
        ...(property.status === 'active' ? { status: 'pending_review' } : {}),
      });
      toast({ title: '保存成功', description: property.status === 'active' ? '房源已提交重新审核。' : '房源信息已更新。' });
      router.push('/account/my-rentals');
    } catch (err: any) {
      toast({ variant: 'destructive', title: '保存失败', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white/30">
        <Home className="w-12 h-12 opacity-20" />
        <p className="text-sm font-mono uppercase tracking-widest">房源不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">编辑房源</h1>
            <p className="text-sm text-white/35">修改后将重新提交审核</p>
          </div>
        </motion.div>

        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-white/8 bg-[#0d0715]/80 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">基本信息</h2>

          <div className="space-y-2">
            <label className="text-xs text-white/40 font-mono uppercase tracking-wider">房源标题</label>
            <input
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/50"
              placeholder="给你的房源起个吸引人的名字"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/40 font-mono uppercase tracking-wider">房源描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={5}
              className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/50 resize-none"
              placeholder="详细描述你的房源..."
            />
          </div>
        </motion.div>

        {/* Pricing & Details */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/8 bg-[#0d0715]/80 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">价格与配置</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-white/40 font-mono uppercase tracking-wider flex items-center gap-1"><DollarSign className="w-3 h-3" /> 每晚价格 (฿)</label>
              <input
                type="number"
                value={form.pricePerDay}
                onChange={e => setForm(prev => ({ ...prev, pricePerDay: Number(e.target.value) }))}
                min={0}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/40 font-mono uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> 最多入住人数</label>
              <input
                type="number"
                value={form.maxGuests}
                onChange={e => setForm(prev => ({ ...prev, maxGuests: Number(e.target.value) }))}
                min={1}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/40 font-mono uppercase tracking-wider flex items-center gap-1"><Bed className="w-3 h-3" /> 卧室数</label>
              <input
                type="number"
                value={form.bedrooms}
                onChange={e => setForm(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
                min={0}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/40 font-mono uppercase tracking-wider flex items-center gap-1"><Bath className="w-3 h-3" /> 卫生间数</label>
              <input
                type="number"
                value={form.bathrooms}
                onChange={e => setForm(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
                min={0}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>
        </motion.div>

        {/* Amenities */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/8 bg-[#0d0715]/80 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">设施</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {AMENITY_OPTIONS.map(({ id, label, icon: Icon }) => {
              const active = form.amenities.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleAmenity(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    active
                      ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                      : 'border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/8 hover:text-white/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Images */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/8 bg-[#0d0715]/80 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">房源图片</h2>
          <div className="grid grid-cols-3 gap-3">
            {images.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                <Image src={url} alt={`Image ${i}`} fill className="object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
                {i === 0 && (
                  <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-purple-600/80 rounded text-[10px] text-white font-bold">封面</div>
                )}
              </div>
            ))}
            <label className="aspect-square rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-white/30 hover:border-purple-500/40 hover:text-purple-400 transition-all cursor-pointer bg-white/[0.02]">
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span className="text-xs">添加图片</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            保存修改
          </Button>
          {property.status === 'active' && (
            <p className="text-center text-xs text-amber-400/70 mt-2">保存后将重新提交审核，审核通过后才会重新上架。</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
