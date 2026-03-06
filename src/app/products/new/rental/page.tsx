// @ts-nocheck
'use client';

import imageCompression from 'browser-image-compression';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    Home, Building, Tent, Castle, MapPin, 
    Wifi, Tv, Utensils, Shirt, Car, CircleDollarSign, Snowflake, ArrowUpDown, ListStart, TrainFront, CarFront, Laptop,
    Waves, Bath, Sun, Flame, Gamepad2, Heater, Music, Dumbbell, Ship, Umbrella, MountainSnow, Droplets,
    BellRing, BriefcaseMedical, FireExtinguisher, ShieldAlert,
    Camera, Zap, CheckCircle, ChevronLeft, ChevronRight,
    Loader2, Trash2, GripHorizontal, LocateFixed, Search,
    FileText, Cctv, Activity, Crosshair, Ban, User, Users, Sparkles, UserCog, ReceiptText, Coffee
} from 'lucide-react';
import Image from 'next/image';

// --- dnd-kit & Google Maps ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GoogleMap, useLoadScript, Marker, Autocomplete } from '@react-google-maps/api';

// ==========================================
// 🚀 全局自定义发光呼吸动画
// ==========================================
const inlineStyles = `
  @keyframes slowGlow {
    0% { text-shadow: 0 0 2px rgba(255,255,255,0.2); }
    50% { text-shadow: 0 0 8px rgba(255,255,255,0.8); }
    100% { text-shadow: 0 0 2px rgba(255,255,255,0.2); }
  }
  .breathe-text { animation: slowGlow 3s ease-in-out infinite; }
  @keyframes slowPurpleGlow {
    0% { text-shadow: 0 0 2px rgba(168,85,247,0.4); }
    50% { text-shadow: 0 0 12px rgba(168,85,247,1); }
    100% { text-shadow: 0 0 2px rgba(168,85,247,0.4); }
  }
  .breathe-purple { animation: slowPurpleGlow 3s ease-in-out infinite; }
  
  /* 自定义滑动条样式 */
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: #A855F7;
    cursor: pointer;
    box-shadow: 0 0 15px rgba(168,85,247,1);
    margin-top: -10px;
  }
  input[type=range]::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  /* 隐藏数字输入框的上下箭头 */
  input[type=number]::-webkit-inner-spin-button, 
  input[type=number]::-webkit-outer-spin-button { 
    -webkit-appearance: none; 
    margin: 0; 
  }
`;

const PROPERTY_TYPES = [
    { id: 'apartment', label: '高空公寓 (Apartment)', icon: Building },
    { id: 'villa', label: '独栋别墅 (Villa)', icon: Home },
    { id: 'cabin', label: '赛博舱 (Cabin)', icon: Tent },
    { id: 'mansion', label: '豪华庄园 (Mansion)', icon: Castle },
];

const AMENITIES_CATEGORIES = [
    { 
        title: '这些最受客人欢迎的设施呢？', 
        items: [
            { id: 'wifi', label: '无线网络', icon: Wifi }, 
            { id: 'tv', label: '电视', icon: Tv }, 
            { id: 'kitchen', label: '厨房', icon: Utensils }, 
            { id: 'washer', label: '洗衣机', icon: Shirt }, 
            { id: 'free_parking', label: '内部免费停车位', icon: Car }, 
            { id: 'paid_parking', label: '内部付费停车位', icon: CircleDollarSign }, 
            { id: 'ac', label: '空调', icon: Snowflake }, 
            { id: 'elevator', label: '电梯', icon: ArrowUpDown }, 
            { id: 'stairs', label: '步梯', icon: ListStart }, 
            { id: 'subway', label: '临近地铁', icon: TrainFront }, 
            { id: 'no_subway', label: '无地铁站', icon: CarFront }, 
            { id: 'workspace', label: '专门的工作区域', icon: Laptop }
        ] 
    },
    { 
        title: '你提供让人眼前一亮的便利设施吗？', 
        items: [
            { id: 'pool', label: '游泳池', icon: Waves }, 
            { id: 'hot_tub', label: '热水浴缸', icon: Bath }, 
            { id: 'patio', label: '露台', icon: Sun }, 
            { id: 'bbq', label: '烧烤架', icon: Flame }, 
            { id: 'outdoor_dining', label: '户外用餐区', icon: Coffee }, 
            { id: 'fire_pit', label: '篝火炉', icon: Flame }, 
            { id: 'pool_table', label: '台球桌', icon: Gamepad2 }, 
            { id: 'indoor_fireplace', label: '室内壁炉', icon: Heater }, 
            { id: 'piano', label: '钢琴', icon: Music }, 
            { id: 'gym', label: '健身器材', icon: Dumbbell }, 
            { id: 'lake_access', label: '临湖', icon: Ship }, 
            { id: 'beach_access', label: '直达海滩', icon: Umbrella }, 
            { id: 'ski_in_out', label: '雪场民宿', icon: MountainSnow }, 
            { id: 'outdoor_shower', label: '户外淋浴', icon: Droplets }
        ] 
    },
    { 
        title: '房源是否配备这些安全设施？', 
        items: [
            { id: 'smoke_alarm', label: '烟雾报警器', icon: BellRing }, 
            { id: 'first_aid', label: '急救包', icon: BriefcaseMedical }, 
            { id: 'fire_extinguisher', label: '灭火器', icon: FireExtinguisher }, 
            { id: 'co_alarm', label: '一氧化碳报警器', icon: ShieldAlert }
        ] 
    }
];

const SHARED_WITH_OPTIONS = [
    { id: 'me', label: '我', icon: User },
    { id: 'family', label: '我的家人', icon: Users },
    { id: 'other_guests', label: '其他客人', icon: Users },
    { id: 'roommates', label: '室友', icon: Users }
];

const fluidVariants = {
    initial: { opacity: 0, x: 20, filter: 'blur(10px)' },
    in: { opacity: 1, x: 0, filter: 'blur(0px)' },
    out: { opacity: 0, x: -20, filter: 'blur(10px)' }
};

const libraries: ("places")[] = ["places"];
const mapContainerStyle = { width: '100%', height: '100%', borderRadius: '1.5rem' };
const defaultCenter = { lat: 13.7563, lng: 100.5018 }; // 曼谷

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212124" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d1d1d1" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212124" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#d1d1d1" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#d1d1d1" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#d1d1d1" }] }
];

function SortableImage({ id, url, index, onRemove }: { id: string, url: string, index: number, onRemove: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1 };

    return (
        <div ref={setNodeRef} style={style} className={`relative rounded-2xl overflow-hidden border ${isDragging ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-105' : 'border-white/20'} group ${index === 0 ? 'col-span-2 row-span-2' : ''}`}>
            <Image src={url} alt={`Gallery ${index}`} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <div {...attributes} {...listeners} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-purple-500/80 cursor-grab active:cursor-grabbing">
                    <GripHorizontal className="w-5 h-5" />
                </div>
                <button onClick={() => onRemove(id)} className="p-3 bg-red-500/90 rounded-full text-white hover:bg-red-500">
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
            {index === 0 && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-purple-600/90 backdrop-blur-md rounded-lg text-xs font-bold text-white border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)] breathe-text">封面大图</div>
            )}
        </div>
    );
}

export default function RentalPublishPage() {
    const { user, profile } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 12;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [images, setImages] = useState<{id: string, url: string}[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        propertyType: '',
        location: { 
            lat: defaultCenter.lat, lng: defaultCenter.lng, 
            address: '', country: '', state: '', city: '', street: '', zip: '',
            exactLocation: true 
        },
        hostContact: { 
            phone: '',
            email: ''
        },
        maxGuests: 1,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        // 赛博舱专属
        hasBedroomLocks: true,
        bathroomsPrivate: 0,
        bathroomsDedicated: 0,
        bathroomsShared: 1,
        sharedWith: [] as string[],
        
        amenities: [] as string[],
        safetyRules: {
            hasSecurityCamera: false,
            hasNoiseMonitor: false,
            hasWeapons: false,
            noSmoking: false
        },
        bookingType: 'instant', 
        pricePerDay: 0,
        weekendPremium: 0,
        
        cleaningFee: {
            enabled: false,
            amount: 0,
            frequency: 'once'
        },
        staffService: {
            enabled: false,
            amountPerDay: 0
        },

        verificationDocs: {
            ownership: '', 
            idFront: '',   
            selfie: ''     
        }
    });

    const updateData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'ownership' | 'idFront' | 'selfie') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                verificationDocs: { ...prev.verificationDocs, [type]: reader.result as string }
            }));
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // --- Google Maps 逻辑 ---
    const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', libraries });
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const parseAddressComponents = (components: google.maps.GeocoderAddressComponent[]) => {
        let parsed = { country: '', state: '', city: '', street: '', zip: '' };
        components.forEach(comp => {
            if (comp.types.includes('country')) parsed.country = comp.long_name;
            if (comp.types.includes('administrative_area_level_1')) parsed.state = comp.long_name;
            if (comp.types.includes('locality') || comp.types.includes('sublocality')) parsed.city = comp.long_name;
            if (comp.types.includes('route')) parsed.street = comp.long_name;
            if (comp.types.includes('street_number')) parsed.street = comp.long_name + ' ' + parsed.street;
            if (comp.types.includes('postal_code')) parsed.zip = comp.long_name;
        });
        return parsed;
    };

    const reverseGeocode = useCallback((lat: number, lng: number) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const parsed = parseAddressComponents(results[0].address_components);
                updateData('location', { ...formData.location, lat, lng, address: results[0].formatted_address, ...parsed });
            } else {
                updateData('location', { ...formData.location, lat, lng });
            }
        });
    }, [formData.location]);

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setMapCenter({ lat, lng });
            reverseGeocode(lat, lng);
        }
    }, [reverseGeocode]);

    const handleAutoLocate = () => {
        if (navigator.geolocation) {
            toast({ title: "Radar Initiated", description: "正在扫描您的物理位置..." });
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setMapCenter({ lat, lng });
                    reverseGeocode(lat, lng);
                },
                () => toast({ variant: "destructive", title: "定位失败", description: "请允许浏览器定位权限或手动选点。" })
            );
        }
    };

    const onPlaceChanged = () => {
        if (autocomplete !== null) {
            const place = autocomplete.getPlace();
            
            if (place?.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setMapCenter({ lat, lng });
                const parsed = parseAddressComponents(place.address_components || []);
                updateData('location', { ...formData.location, lat, lng, address: place.formatted_address || '', ...parsed });
            } else {
                toast({ 
                    variant: "destructive", 
                    title: "地址无效", 
                    description: "请从下拉列表中选择一个具体的有效地址。" 
                });
            }
        }
    };

    // --- 拖拽与上传 ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setImages((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const remainingSlots = 9 - images.length;
        if (remainingSlots <= 0) {
            toast({ variant: "destructive", title: "上传受限", description: "最多只能上传 9 张照片哦。" });
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        const options = {
            maxSizeMB: 0.1,
            maxWidthOrHeight: 1280,
            useWebWorker: true
        };

        toast({ title: "正在优化影像", description: "执行高质量图片压缩协议中..." });

        for (const file of filesToProcess) {
            try {
                const compressedFile = await imageCompression(file, options);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImages(prev => [...prev, { 
                        id: `img_${Date.now()}_${Math.random()}`, 
                        url: reader.result as string 
                    }]);
                };
                reader.readAsDataURL(compressedFile);
            } catch (err) {
                console.error("Compression Error:", err);
            }
        }
        e.target.value = '';
    };

    // 🚀 --- 提交发布：核心修复区域 ---
    const handlePublish = async () => {
        if (!user || !db) return;
        
        setIsSubmitting(true);
        
        try {
            await user.getIdToken(true); 

            const pureImageUrls = images.map(img => img.url);
            await addDoc(collection(db, 'rentalProperties'), {
                ...formData,
                images: pureImageUrls,
                ownerId: user.uid,
                status: 'pending_review',
                createdAt: serverTimestamp(),
                
                name: formData.title,                 
                price: Number(formData.pricePerDay),  
                category: formData.propertyType || 'Rental', 
                currency: 'USD', 
                seller: {                              
                    id: user.uid,
                    name: profile?.displayName || user.displayName || 'Elite Host',
                    avatarUrl: profile?.photoURL || user.photoURL || '',
                    displayedBadge: profile?.displayedBadge || null
                }
            }); 
            
            toast({ title: "Protocol Submitted", description: "房源资料已提交审计。" });
            
            // 🚀 核心修复：成功后直接跳转！绝不能在这个页面再执行 setIsSubmitting(false) 了，否则会报 DOM 错误！
            router.push('/account');
            
        } catch (error: any) {
            console.error("Publish Error:", error);
            toast({ variant: "destructive", title: "发布失败", description: error.message });
            
            // 只有失败、不跳走的情况下，才把 loading 状态改回来
            setIsSubmitting(false); 
        }
    };

    const CounterRow = ({ label, subLabel, field, value }: { label: string, subLabel?: string, field: string, value: number }) => (
        <div className="flex items-center justify-between py-6 border-b-2 border-white/10 last:border-0">
            <div>
                <span className="text-2xl font-bold text-white tracking-wide breathe-text">{label}</span>
                {subLabel && <p className="text-sm text-white/60 mt-2 font-medium breathe-text">{subLabel}</p>}
            </div>
            <div className="flex items-center gap-6">
                <button onClick={() => updateData(field, Math.max(0, value - 1))} className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center hover:border-purple-400 hover:text-purple-300 transition-all text-2xl font-light text-white">-</button>
                <motion.span key={value} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black font-mono w-10 text-center text-purple-300 breathe-purple">{value}</motion.span>
                <button onClick={() => updateData(field, value + 1)} className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center hover:border-purple-400 hover:text-purple-300 transition-all text-2xl font-light text-white">+</button>
            </div>
        </div>
    );

    const renderStep = () => {
        switch (step) {
            case 1: 
                return (
                    <div className="space-y-12">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Artistic Type</h2>
                            <p className="text-white font-mono text-sm uppercase breathe-text">Select Architecture Protocol</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            {PROPERTY_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => updateData('propertyType', type.label)}
                                    className={`relative p-8 flex flex-col items-center gap-4 rounded-3xl transition-all duration-500 overflow-hidden ${formData.propertyType === type.label ? 'bg-purple-900/30 border-2 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 'bg-transparent border-2 border-white/20 hover:border-purple-400/80 hover:bg-white/5'}`}
                                >
                                    <type.icon className={`w-12 h-12 ${formData.propertyType === type.label ? 'text-purple-300' : 'text-white/80'}`} />
                                    <span className="font-bold text-lg text-white breathe-text">{type.label}</span>
                                    {formData.propertyType === type.label && <motion.div layoutId="outline" className="absolute inset-0 border-2 border-purple-400 rounded-3xl" />}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2: // 地图
                return (
                    <div className="space-y-6 w-full max-w-4xl mx-auto h-[65vh] flex flex-col">
                        <div className="text-center space-y-2 shrink-0">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Fluid Mapping</h2>
                            <p className="text-white/90 font-mono text-sm uppercase breathe-text">Initialize Location Protocol</p>
                        </div>
                        <div className="flex-1 relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.8)] bg-[#0B0B0B]">
                            {loadError && <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold breathe-text">地图加载失败，请检查 API Key。</div>}
                            {!isLoaded ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                    <p className="font-mono text-sm tracking-widest uppercase breathe-text">Booting Satellite...</p>
                                </div>
                            ) : (
                                <>
                                    <GoogleMap mapContainerStyle={mapContainerStyle} zoom={14} center={mapCenter} options={{ styles: darkMapStyle, disableDefaultUI: true, zoomControl: true }} onClick={onMapClick}>
                                        <Marker position={{ lat: formData.location.lat, lng: formData.location.lng }} />
                                    </GoogleMap>
                                    <div className="absolute top-6 left-6 right-6 flex gap-4 items-start pointer-events-none">
                                        <div className="flex-1 bg-black/80 backdrop-blur-2xl border-2 border-white/20 p-4 rounded-2xl pointer-events-auto shadow-2xl">
                                            <div className="space-y-4">
                                                <Autocomplete onLoad={(autoC) => setAutocomplete(autoC)} onPlaceChanged={onPlaceChanged}>
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                                                        <input type="text" placeholder="搜索城市、地标或输入具体地址..." className="w-full bg-white/10 border-2 border-white/20 rounded-xl pl-12 pr-4 py-3 text-white focus:border-purple-400 outline-none transition-colors placeholder:text-white/60 font-bold breathe-text" defaultValue={formData.location.address} />
                                                    </div>
                                                </Autocomplete>
                                                {formData.location.address && (
                                                    <div className="text-sm text-white bg-purple-500/20 p-3 rounded-lg border border-purple-400/50">
                                                        <p className="font-bold text-purple-300 mb-1 breathe-purple">当前锁定位置：</p>
                                                        <p className="line-clamp-2 font-medium breathe-text">{formData.location.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={handleAutoLocate} className="shrink-0 bg-black/90 backdrop-blur-md p-4 rounded-2xl border-2 border-white/20 text-purple-300 hover:bg-purple-500 hover:text-white transition-all pointer-events-auto shadow-2xl flex flex-col items-center gap-2 group">
                                            <LocateFixed className="w-6 h-6 group-hover:animate-pulse" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest breathe-text">Radar</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case 3: // 地址与联系方式确认
                return (
                    <div className="space-y-12 max-w-3xl mx-auto flex flex-col justify-center min-h-[65vh] py-12">
                        <div className="text-center space-y-2 shrink-0 mb-4">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Confirm Address & Contact</h2>
                            <p className="text-white/90 font-mono text-sm uppercase breathe-text">确认位置与房东联系方式</p>
                        </div>
                        
                        <div className="bg-black/60 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] border-2 border-white/20 shadow-2xl space-y-10">
                            {/* 地址确认区 */}
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm text-white uppercase font-bold tracking-widest breathe-text">国家/地区</label>
                                    <input type="text" value={formData.location.country} onChange={e => updateData('location', {...formData.location, country: e.target.value})} className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 mt-1 text-2xl text-white font-bold focus:border-purple-400 outline-none transition-colors breathe-text" />
                                </div>
                                <div>
                                    <label className="text-sm text-white uppercase font-bold tracking-widest breathe-text">街道地址 (含门牌号)</label>
                                    <input type="text" value={formData.location.street} onChange={e => updateData('location', {...formData.location, street: e.target.value})} className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 mt-1 text-2xl text-white font-bold focus:border-purple-400 outline-none transition-colors breathe-text" />
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-sm text-white uppercase font-bold tracking-widest breathe-text">乡/副县/区</label>
                                        <input type="text" value={formData.location.city} onChange={e => updateData('location', {...formData.location, city: e.target.value})} className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 mt-1 text-2xl text-white font-bold focus:border-purple-400 outline-none transition-colors breathe-text" />
                                    </div>
                                    <div>
                                        <label className="text-sm text-white uppercase font-bold tracking-widest breathe-text">省/直辖市</label>
                                        <input type="text" value={formData.location.state} onChange={e => updateData('location', {...formData.location, state: e.target.value})} className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 mt-1 text-2xl text-white font-bold focus:border-purple-400 outline-none transition-colors breathe-text" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-white uppercase font-bold tracking-widest breathe-text">邮政编码</label>
                                    <input type="text" value={formData.location.zip} onChange={e => updateData('location', {...formData.location, zip: e.target.value})} className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 mt-1 text-2xl text-white font-bold focus:border-purple-400 outline-none transition-colors breathe-text" />
                                </div>
                            </div>

                            <hr className="border-white/20" />

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xl font-bold text-white breathe-text">显示房源的确切位置</h4>
                                    <p className="text-white/60 text-sm mt-2 font-medium">让客人清楚了解房源所在位置。只有在客人下单后才会提供。</p>
                                </div>
                                <button
                                    onClick={() => updateData('location', {...formData.location, exactLocation: !formData.location.exactLocation})}
                                    className={`w-16 h-8 rounded-full transition-colors flex items-center px-1 border-2 border-white/20 shadow-inner ${formData.location.exactLocation ? 'bg-purple-500 border-purple-400' : 'bg-transparent'}`}
                                >
                                    <motion.div layout className="w-6 h-6 bg-white rounded-full shadow-md" animate={{ x: formData.location.exactLocation ? 32 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                </button>
                            </div>

                            <hr className="border-white/20" />

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xl font-bold text-white breathe-text">房东联系方式</h4>
                                    <p className="text-white/60 text-sm mt-2 font-medium">请提供您的真实联系方式。此信息仅在客人下单成功后展示。</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-sm text-white uppercase font-bold tracking-widest breathe-text">电话 Phone</label>
                                        <input type="tel" value={formData.hostContact.phone} onChange={e => updateData('hostContact', {...formData.hostContact, phone: e.target.value})} className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 mt-1 text-2xl text-white font-bold focus:border-purple-400 outline-none transition-colors breathe-text placeholder:text-white/30" placeholder="+66 88 888 8888" />
                                    </div>
                                    <div>
                                        <label className="text-sm text-white uppercase font-bold tracking-widest breathe-text">邮箱 Email</label>
                                        <input type="email" value={formData.hostContact.email} onChange={e => updateData('hostContact', {...formData.hostContact, email: e.target.value})} className="w-full bg-transparent border-b-2 border-white/20 px-4 py-4 mt-1 text-2xl text-white font-bold focus:border-purple-400 outline-none transition-colors breathe-text placeholder:text-white/30" placeholder="host@luna.com" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 4: // 架构
                if (formData.propertyType === '赛博舱 (Cabin)') {
                    return (
                        <div className="space-y-16 max-w-3xl mx-auto py-12">
                            <div className="text-center space-y-2 mb-12">
                                <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Cabin Architecture</h2>
                                <p className="text-white/90 font-mono text-sm uppercase breathe-text">定义您的赛博舱空间细节</p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-white breathe-text">先从基本事项开始</h3>
                                <p className="text-white/70 text-lg font-medium breathe-text pb-4">可供多少人入住？</p>
                                <CounterRow label="客人" field="maxGuests" value={formData.maxGuests} />
                                <CounterRow label="卧室" field="bedrooms" value={formData.bedrooms} />
                                <CounterRow label="床铺" field="beds" value={formData.beds} />
                            </div>

                            <div className="pt-8 border-t-2 border-white/20 space-y-8">
                                <h3 className="text-3xl font-black text-white breathe-text">每间卧室都有锁吗？</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <button onClick={() => updateData('hasBedroomLocks', true)} className={`py-6 rounded-3xl border-2 text-center transition-all ${formData.hasBedroomLocks ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-white/20 text-white hover:border-white/50 bg-transparent'}`}>
                                        <span className="text-2xl font-bold breathe-text">是</span>
                                    </button>
                                    <button onClick={() => updateData('hasBedroomLocks', false)} className={`py-6 rounded-3xl border-2 text-center transition-all ${!formData.hasBedroomLocks ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-white/20 text-white hover:border-white/50 bg-transparent'}`}>
                                        <span className="text-2xl font-bold breathe-text">否</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-8 border-t-2 border-white/20 space-y-4">
                                <h3 className="text-3xl font-black text-white breathe-text pb-4">客人可以使用哪些类型的卫生间？</h3>
                                <CounterRow label="卧室私用" subLabel="卫生间与客房相连，仅供客人使用。" field="bathroomsPrivate" value={formData.bathroomsPrivate} />
                                <CounterRow label="房客专用" subLabel="私人卫生间，但需要通过走廊等共用空间进入。" field="bathroomsDedicated" value={formData.bathroomsDedicated} />
                                <CounterRow label="共用" subLabel="需要与他人共用。" field="bathroomsShared" value={formData.bathroomsShared} />
                            </div>

                            <div className="pt-8 border-t-2 border-white/20 space-y-8">
                                <div>
                                    <h3 className="text-3xl font-black text-white breathe-text">还有谁会在房源里？</h3>
                                    <p className="text-white/70 text-lg font-medium breathe-text mt-3">客人需要知道他们在住宿期间是否会遇到其他人。</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    {SHARED_WITH_OPTIONS.map(opt => {
                                        const isSelected = formData.sharedWith.includes(opt.id);
                                        return (
                                            <button 
                                                key={opt.id} 
                                                onClick={() => {
                                                    const newShared = isSelected 
                                                        ? formData.sharedWith.filter(i => i !== opt.id)
                                                        : [...formData.sharedWith, opt.id];
                                                    updateData('sharedWith', newShared);
                                                }}
                                                className={`p-8 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${isSelected ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-white/20 hover:border-white/50 bg-transparent'}`}
                                            >
                                                <opt.icon className={`w-10 h-10 ${isSelected ? 'text-purple-300' : 'text-white/80'}`} strokeWidth={1.5} />
                                                <span className={`text-xl font-bold ${isSelected ? 'text-purple-300 breathe-purple' : 'text-white breathe-text'}`}>{opt.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                } else {
                    return (
                        <div className="space-y-12 max-w-3xl mx-auto py-12">
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Space Architecture</h2>
                                <p className="text-white/90 font-mono text-sm uppercase breathe-text">请提供一些房源基本信息</p>
                            </div>
                            <div className="space-y-2">
                                <CounterRow label="客人 (Guests)" field="maxGuests" value={formData.maxGuests} />
                                <CounterRow label="卧室 (Bedrooms)" field="bedrooms" value={formData.bedrooms} />
                                <CounterRow label="床铺 (Beds)" field="beds" value={formData.beds} />
                                <CounterRow label="卫生间 (Bathrooms)" field="bathrooms" value={formData.bathrooms} />
                            </div>
                        </div>
                    );
                }
            case 5: // 设施
                return (
                    <div className="space-y-8 w-full max-w-5xl mx-auto h-[65vh] flex flex-col">
                        <div className="text-center space-y-2 shrink-0">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">让客人了解房源配置</h2>
                            <p className="text-white/90 font-mono text-sm uppercase breathe-text">房源发布后，你可以添加更多便利设施</p>
                        </div>
                        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] space-y-16 py-8">
                            {AMENITIES_CATEGORIES.map((category, idx) => (
                                <div key={idx} className="space-y-6">
                                    <h3 className="text-2xl font-bold text-white breathe-text border-b-2 border-white/20 pb-4 inline-block">{category.title}</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {category.items.map(item => {
                                            const isSelected = formData.amenities.includes(item.label);
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        const newAmenities = isSelected ? formData.amenities.filter(a => a !== item.label) : [...formData.amenities, item.label];
                                                        updateData('amenities', newAmenities);
                                                    }}
                                                    className={`relative p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col items-start gap-4 text-left group overflow-hidden h-[140px] ${isSelected ? 'bg-purple-900/40 border-purple-400 text-white shadow-[0_0_25px_rgba(168,85,247,0.6)]' : 'bg-transparent border-white/20 text-white hover:border-white/60 hover:bg-white/5'}`}
                                                >
                                                    <item.icon className={`w-10 h-10 transition-colors duration-300 ${isSelected ? 'text-purple-300' : 'text-white/80 group-hover:text-white'}`} strokeWidth={1.5} />
                                                    <span className="font-bold text-base leading-tight breathe-text">{item.label}</span>
                                                    {isSelected && <div className="absolute top-6 right-6"><CheckCircle className="w-6 h-6 text-purple-400" /></div>}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 6: // 安全与房屋守则
                return (
                    <div className="space-y-12 max-w-3xl mx-auto py-12 flex flex-col justify-center min-h-[65vh]">
                        <div className="text-center space-y-2 mb-8">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">提供安全方面的详细信息</h2>
                            <p className="text-white/90 font-mono text-sm uppercase breathe-text">房源是否提供以下设施或有以下规定？</p>
                        </div>
                        
                        <div className="space-y-2">
                            {[
                                { id: 'hasSecurityCamera', label: '安装了室外监控摄像头', icon: Cctv },
                                { id: 'hasNoiseMonitor', label: '安装了噪音分贝监测器', icon: Activity },
                                { id: 'hasWeapons', label: '房源内有武器', icon: Crosshair },
                                { id: 'noSmoking', label: '房屋内禁止吸烟', icon: Ban },
                            ].map((rule) => (
                                <div key={rule.id} className="flex items-center justify-between py-6 border-b-2 border-white/10 last:border-0">
                                    <div className="flex items-center gap-6">
                                        <rule.icon className="w-8 h-8 text-white/80" strokeWidth={1.5} />
                                        <span className="text-2xl font-bold text-white tracking-wide breathe-text">{rule.label}</span>
                                    </div>
                                    <button
                                        onClick={() => updateData('safetyRules', { ...formData.safetyRules, [rule.id]: !(formData.safetyRules as any)[rule.id] })}
                                        className={`w-16 h-8 rounded-full transition-colors flex items-center px-1 border-2 border-white/20 shadow-inner ${
                                            (formData.safetyRules as any)[rule.id] ? 'bg-purple-500 border-purple-400' : 'bg-transparent'
                                        }`}
                                    >
                                        <motion.div layout className="w-6 h-6 bg-white rounded-full shadow-md" animate={{ x: (formData.safetyRules as any)[rule.id] ? 32 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 pt-8 border-t-2 border-white/20">
                            <h4 className="text-white font-bold text-xl mb-4 breathe-text">重要注意事项</h4>
                            <p className="text-white/70 text-base leading-relaxed breathe-text font-medium">
                                不得安装监控室内空间的摄像头，即使设备处于关闭状态也不可以。凡安装室外监控摄像头，必须如实披露。<br/><br/>
                                请务必遵守当地法律，查看不受欢迎的非歧视政策并了解客人和房东服务费。
                            </p>
                        </div>
                    </div>
                );
            case 7: // 相册
                return (
                    <div className="space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Cinematic Gallery</h2>
                            <p className="text-white/90 font-mono text-sm uppercase breathe-text">Upload & Drag to Sort ({images.length} / 9)</p>
                        </div>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-4 gap-6 auto-rows-[220px] py-8">
                                    {images.map((img, idx) => (
                                        <SortableImage key={img.id} id={img.id} url={img.url} index={idx} onRemove={(id) => setImages(prev => prev.filter(i => i.id !== id))} />
                                    ))}
                                    {images.length < 9 && (
                                        <label className={`relative rounded-3xl border-2 border-dashed border-white/40 bg-transparent hover:bg-white/5 hover:border-purple-400 transition-all flex flex-col items-center justify-center cursor-pointer group ${images.length === 0 ? 'col-span-2 row-span-2' : ''}`}>
                                            <Camera className="w-12 h-12 text-white/60 group-hover:text-purple-300 mb-4 transition-colors" />
                                            <span className="text-base text-white font-bold breathe-text">点击或拖拽上传</span>
                                            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        </label>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                );
            case 8: // 文本
                return (
                    <div className="space-y-16 max-w-3xl mx-auto py-12">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest breathe-text">Narrative Title</h2>
                            <div className="relative group">
                                <input type="text" value={formData.title} onChange={(e) => updateData('title', e.target.value)} placeholder="都市边缘的寂静方舟..." className="w-full bg-transparent border-b-2 border-white/20 focus:border-purple-400 text-4xl md:text-5xl font-black text-white py-4 outline-none transition-colors placeholder:text-white/50 breathe-text" maxLength={50} />
                                <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-purple-400 to-fuchsia-500 w-0 group-focus-within:w-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(168,85,247,1)]" />
                            </div>
                            <p className="text-right text-sm text-purple-300 font-mono font-bold breathe-purple">{formData.title.length}/50</p>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest breathe-text">Description</h2>
                            <div className="relative">
                                <textarea value={formData.description} onChange={(e) => updateData('description', e.target.value)} placeholder="详细描述房屋的氛围、周边环境、以及能为房客带来怎样的体验..." className="w-full h-64 bg-transparent border-2 border-white/20 focus:border-purple-400 rounded-3xl p-8 text-white text-xl outline-none transition-all resize-none placeholder:text-white/50 leading-relaxed font-medium breathe-text hover:bg-white/5" maxLength={1000} />
                                <div className="absolute bottom-6 right-6 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-mono font-bold text-white border border-white/20 shadow-2xl breathe-text">{formData.description.length} / 1000</div>
                            </div>
                        </div>
                    </div>
                );
            case 9: { // Finance
                const isVillaOrMansion = formData.propertyType === '独栋别墅 (Villa)' || formData.propertyType === '豪华庄园 (Mansion)';
                const isMansion = formData.propertyType === '豪华庄园 (Mansion)';

                const basePrice = Number(formData.pricePerDay) || 0;
                
                const guestBasePays = basePrice; 
                const hostPlatformFee = basePrice * 0.07;
                const hostBaseEarn = basePrice - hostPlatformFee;
                
                const currentCleaning = formData.cleaningFee.enabled ? (Number(formData.cleaningFee.amount) || 0) : 0;
                const currentStaff = formData.staffService.enabled ? (Number(formData.staffService.amountPerDay) || 0) : 0;

                const previewGuestTotal = guestBasePays + currentCleaning + currentStaff;
                const previewHostTotal = hostBaseEarn + currentCleaning + currentStaff;

                return (
                    <div className="space-y-12 max-w-3xl mx-auto py-12">
                        <div className="text-center space-y-2 mb-12">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Finance & Booking</h2>
                            <p className="text-white font-mono text-sm uppercase breathe-text">Smart Contract Setup (USD)</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <button onClick={() => updateData('bookingType', 'manual')} className={`p-10 rounded-3xl border-2 text-left transition-all ${formData.bookingType === 'manual' ? 'bg-white/10 border-white text-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-transparent border-white/20 text-white hover:border-white/50'}`}>
                                <Shield className="w-12 h-12 mb-6 text-white" />
                                <h4 className="font-bold text-2xl breathe-text">审核模式</h4>
                                <p className="text-base mt-4 font-medium leading-relaxed breathe-text text-white/80">房客预订后，您有24小时查看对方资料并决定是否接待。</p>
                            </button>
                            <button onClick={() => updateData('bookingType', 'instant')} className={`p-10 rounded-3xl border-2 text-left transition-all relative overflow-hidden ${formData.bookingType === 'instant' ? 'bg-purple-900/30 border-purple-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]' : 'bg-transparent border-white/20 text-white hover:border-white/50'}`}>
                                {formData.bookingType === 'instant' && <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/40 blur-3xl rounded-full" />}
                                <Zap className={`relative z-10 w-12 h-12 mb-6 ${formData.bookingType === 'instant' ? 'text-purple-300 fill-purple-300/40' : 'text-white'}`} />
                                <h4 className="relative z-10 font-bold text-2xl breathe-text">闪电确认</h4>
                                <p className="relative z-10 text-base mt-4 font-medium leading-relaxed breathe-text text-white/80">高流量首选。符合信用标准的房客可直接锁定日期。</p>
                            </button>
                        </div>
                        
                        <div className="mt-12 space-y-6">
                            <label className="text-base font-bold text-white uppercase tracking-widest breathe-text">基础定价 Base Price (Per Night)</label>
                            <div className="relative mt-6 group">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"><span className="text-purple-300 font-black text-4xl breathe-purple">$</span></div>
                                <input 
                                    type="number" 
                                    value={formData.pricePerDay === 0 ? '' : formData.pricePerDay} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        updateData('pricePerDay', val === '' ? 0 : Math.max(0, parseFloat(val)));
                                    }} 
                                    className="w-full bg-transparent border-b-2 border-white/20 pl-16 pr-6 py-6 text-6xl font-black text-white focus:border-purple-400 outline-none transition-all breathe-text placeholder:text-white/30" 
                                    placeholder="0" 
                                />
                                <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none"><span className="text-white/30 font-bold text-xl">USD</span></div>
                            </div>
                            <div className="pt-8 border-t-2 border-white/20 space-y-4">
                                <div className="flex justify-between text-lg text-white font-bold breathe-text"><span>房客基础实付 (Guest Base Pays)</span><span>$ {guestBasePays.toFixed(2)} USD</span></div>
                                <div className="flex justify-between text-lg text-white/60 font-bold breathe-text"><span>平台扣除手续费 (Host Fee - 7%)</span><span>- $ {hostPlatformFee.toFixed(2)} USD</span></div>
                                <div className="flex justify-between text-3xl font-black text-purple-300 pt-6 border-t-2 border-white/20 breathe-purple"><span>您的基础收入约 (Base Earn)</span><span>$ {hostBaseEarn.toFixed(2)} USD</span></div>
                            </div>
                        </div>

                        {isVillaOrMansion && (
                            <div className="mt-16 p-10 bg-black/60 backdrop-blur-2xl rounded-[2.5rem] border-2 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] space-y-8">
                                <div>
                                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 breathe-purple tracking-widest uppercase">Premium Services</h3>
                                    <p className="text-white/70 text-sm mt-2 font-medium breathe-text">为您的尊享资产配置专属增值服务。增值服务产生的收益平台不抽成。</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Sparkles className="w-8 h-8 text-purple-400" />
                                            <div>
                                                <h4 className="text-xl font-bold text-white breathe-text">专业清洁费</h4>
                                                <p className="text-sm text-white/50 font-medium">由房客支付的家政费用。</p>
                                            </div>
                                        </div>
                                        <button onClick={() => updateData('cleaningFee', { ...formData.cleaningFee, enabled: !formData.cleaningFee.enabled })} className={`w-16 h-8 rounded-full transition-colors flex items-center px-1 border-2 border-white/20 shadow-inner ${formData.cleaningFee.enabled ? 'bg-purple-500 border-purple-400' : 'bg-transparent'}`}>
                                            <motion.div layout className="w-6 h-6 bg-white rounded-full shadow-md" animate={{ x: formData.cleaningFee.enabled ? 32 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                        </button>
                                    </div>
                                    
                                    {formData.cleaningFee.enabled && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pl-12 flex gap-4">
                                            <div className="relative w-1/2">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-purple-300 font-bold text-xl breathe-purple">$</span></div>
                                                <input 
                                                    type="number" 
                                                    value={formData.cleaningFee.amount === 0 ? '' : formData.cleaningFee.amount} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        updateData('cleaningFee', { ...formData.cleaningFee, amount: val === '' ? 0 : Math.max(0, parseFloat(val)) });
                                                    }} 
                                                    className="w-full bg-white/5 border-2 border-white/20 rounded-xl pl-10 pr-4 py-4 text-xl font-black text-white focus:border-purple-400 outline-none transition-all breathe-text placeholder:text-white/30" 
                                                    placeholder="0.00" 
                                                />
                                            </div>
                                            <div className="flex w-1/2 bg-black/50 border-2 border-white/20 rounded-xl overflow-hidden p-1">
                                                <button onClick={() => updateData('cleaningFee', { ...formData.cleaningFee, frequency: 'once' })} className={`flex-1 rounded-lg text-sm font-bold transition-all ${formData.cleaningFee.frequency === 'once' ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white'}`}>只收一次</button>
                                                <button onClick={() => updateData('cleaningFee', { ...formData.cleaningFee, frequency: 'daily' })} className={`flex-1 rounded-lg text-sm font-bold transition-all ${formData.cleaningFee.frequency === 'daily' ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white'}`}>按天收取</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {isMansion && (
                                    <>
                                        <hr className="border-white/10" />
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <UserCog className="w-8 h-8 text-purple-400" />
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white breathe-text">全天候工作人员 (Butler/Staff)</h4>
                                                        <p className="text-sm text-white/50 font-medium">为庄园配备专属服务人员。</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => updateData('staffService', { ...formData.staffService, enabled: !formData.staffService.enabled })} className={`w-16 h-8 rounded-full transition-colors flex items-center px-1 border-2 border-white/20 shadow-inner ${formData.staffService.enabled ? 'bg-purple-500 border-purple-400' : 'bg-transparent'}`}>
                                                    <motion.div layout className="w-6 h-6 bg-white rounded-full shadow-md" animate={{ x: formData.staffService.enabled ? 32 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                                                </button>
                                            </div>
                                            {formData.staffService.enabled && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pl-12">
                                                    <div className="relative w-1/2">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-purple-300 font-bold text-xl breathe-purple">$</span></div>
                                                        <input 
                                                            type="number" 
                                                            value={formData.staffService.amountPerDay === 0 ? '' : formData.staffService.amountPerDay} 
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                updateData('staffService', { ...formData.staffService, amountPerDay: val === '' ? 0 : Math.max(0, parseFloat(val)) });
                                                            }} 
                                                            className="w-full bg-white/5 border-2 border-white/20 rounded-xl pl-10 pr-4 py-4 text-xl font-black text-white focus:border-purple-400 outline-none transition-all breathe-text placeholder:text-white/30" 
                                                            placeholder="0.00" 
                                                        />
                                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><span className="text-white/50 font-bold text-sm">/ 天</span></div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {(formData.cleaningFee.enabled || formData.staffService.enabled) && (
                                    <div className="mt-8 pt-6 border-t-2 border-purple-500/30">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 breathe-text">首晚综合收益预览 (包含增值服务)</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-white/80">
                                                <span>房客首晚实付总额</span>
                                                <span className="font-mono">$ {previewGuestTotal.toFixed(2)} USD</span>
                                            </div>
                                            <div className="flex justify-between text-white/60">
                                                <span>平台手续费扣减 (7%)</span>
                                                <span className="font-mono">- $ {hostPlatformFee.toFixed(2)} USD</span>
                                            </div>
                                            <div className="flex justify-between text-xl font-black text-purple-300 pt-3 border-t border-purple-500/30 breathe-purple">
                                                <span>您的首晚总收入</span>
                                                <span>$ {previewHostTotal.toFixed(2)} USD</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            }
            case 10: { // 周末溢价
                const basePrice = Number(formData.pricePerDay) || 0;
                const weekendPrice = basePrice * (1 + (Number(formData.weekendPremium) || 0) / 100);
                return (
                    <div className="space-y-12 max-w-2xl mx-auto text-center py-12">
                        <div className="space-y-2">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Weekend Premium</h2>
                            <p className="text-white font-mono text-sm uppercase breathe-text">Weekend Rate Adjustment</p>
                        </div>
                        <div className="py-16">
                            <h1 className="text-[6rem] font-black text-white drop-shadow-2xl breathe-text tracking-tighter leading-none">
                                <span className="text-5xl text-purple-400 mr-2">$</span>{weekendPrice.toFixed(2)}
                            </h1>
                            <p className="text-white/70 text-base mt-6 font-bold tracking-widest uppercase breathe-text">
                                周末基础房客实付 ${weekendPrice.toFixed(2)} USD
                            </p>
                        </div>
                        <div className="text-left space-y-8">
                            <div className="flex justify-between items-center">
                                <div><h3 className="text-2xl font-bold text-white breathe-text">Premium</h3><p className="text-base text-white/70 mt-2 breathe-text">建议：5%~15%</p></div>
                                <div className="flex items-center px-6 py-3 border-2 border-purple-400/50 rounded-2xl bg-black/40 focus-within:border-purple-400 focus-within:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all">
                                    <input type="number" min="0" max="100" value={formData.weekendPremium === 0 ? '' : formData.weekendPremium} onChange={(e) => {
                                        const val = e.target.value;
                                        updateData('weekendPremium', val === '' ? 0 : Math.min(100, Math.max(0, parseInt(val) || 0)));
                                    }} className="w-20 bg-transparent text-4xl font-black text-purple-300 breathe-purple outline-none text-right appearance-none placeholder:text-purple-300/30" placeholder="0" />
                                    <span className="text-4xl font-black text-purple-300 breathe-purple ml-1">%</span>
                                </div>
                            </div>
                            <input type="range" min="0" max="100" value={formData.weekendPremium || 0} onChange={(e) => updateData('weekendPremium', parseInt(e.target.value))} className="w-full mt-8" />
                            <div className="flex justify-between text-sm text-white/60 font-mono font-bold mt-4"><span>0%</span><span>100%</span></div>
                        </div>
                    </div>
                );
            }
            case 11: // KYC
                return (
                    <div className="space-y-12 max-w-4xl mx-auto h-[65vh] flex flex-col justify-center">
                        <div className="text-center space-y-2 shrink-0 mb-8"><h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">Trust & Safety KYC</h2><p className="text-white font-mono text-sm uppercase breathe-text">认证房源真实信息</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[{id:'ownership', label:'房屋证明'}, {id:'idFront', label:'护照正面'}, {id:'selfie', label:'手持自拍'}].map(doc => (
                                <div key={doc.id} className="bg-transparent p-8 rounded-[2rem] border-2 border-white/20 flex flex-col items-center text-center group transition-all hover:border-purple-400 hover:bg-white/5">
                                    <FileText className={`w-16 h-16 mb-6 ${formData.verificationDocs[doc.id as keyof typeof formData.verificationDocs] ? 'text-green-400' : 'text-purple-400 group-hover:animate-bounce'}`} />
                                    <h3 className="text-xl font-bold text-white mb-4 breathe-text">{doc.label}</h3>
                                    {formData.verificationDocs[doc.id as keyof typeof formData.verificationDocs] ? (
                                        <div className="w-full py-4 bg-green-500/20 text-green-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-green-500/30 text-lg"><CheckCircle className="w-5 h-5" /> 已上传</div>
                                    ) : (
                                        <label className="w-full py-4 bg-white/10 hover:bg-purple-600/50 text-white rounded-xl font-bold cursor-pointer transition-colors border border-white/20 text-lg">点击上传<input type="file" accept="image/*" className="hidden" onChange={(e) => handleDocUpload(e, doc.id as any)} /></label>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 12: { 
                // 🚀 第12步最终确认页
                const basePrice = Number(formData.pricePerDay) || 0;
                const finalBasePrice = basePrice * (1 + (Number(formData.weekendPremium) || 0) / 100);
                
                const hostFee = finalBasePrice * 0.07;
                
                const cleaningAmount = formData.cleaningFee.enabled ? (Number(formData.cleaningFee.amount) || 0) : 0;
                const staffAmount = formData.staffService.enabled ? (Number(formData.staffService.amountPerDay) || 0) : 0;
                
                const guestTotal = finalBasePrice + cleaningAmount + staffAmount;
                const hostTotal = (finalBasePrice - hostFee) + cleaningAmount + staffAmount;

                return (
                    <div className="max-w-4xl mx-auto space-y-12 py-12">
                        <div className="text-center space-y-2 mb-12">
                            <h2 className="text-3xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-fuchsia-400 tracking-tight breathe-purple">The Reveal</h2>
                            <p className="text-white font-mono text-sm uppercase breathe-text">Financial Protocol Summary</p>
                        </div>
                        
                        <div className="rounded-[3rem] bg-[#0B0B0B] border-2 border-white/20 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative group">
                            <div className="h-[24rem] w-full relative">
                                {images[0] ? <Image src={images[0].url} alt="Cover" fill className="object-cover" /> : <div className="absolute inset-0 bg-black flex items-center justify-center text-white/50">NO IMAGE</div>}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-transparent" />
                                <div className="absolute bottom-8 left-10"><h1 className="text-5xl font-black text-white breathe-text">{formData.title || 'Untitled'}</h1></div>
                            </div>

                            <div className="p-10 space-y-10 bg-black/40 backdrop-blur-md">
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <ReceiptText className="w-6 h-6 text-purple-400" />
                                        <h3 className="text-xl font-bold text-white uppercase tracking-widest">首晚预订财务明细 (USD)</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {/* --- 房客端明细 --- */}
                                        <div className="flex justify-between text-white/60">
                                            <span>基础房价 (含周末溢价)</span>
                                            <span className="font-mono">$ {finalBasePrice.toFixed(2)}</span>
                                        </div>
                                        {cleaningAmount > 0 && (
                                            <div className="flex justify-between text-white/60">
                                                <span>专业清洁费 ({formData.cleaningFee.frequency === 'once' ? '单次' : '每日'})</span>
                                                <span className="font-mono text-green-400">+ $ {cleaningAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {staffAmount > 0 && (
                                            <div className="flex justify-between text-white/60">
                                                <span>全天候工作人员 (每日)</span>
                                                <span className="font-mono text-green-400">+ $ {staffAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        
                                        <hr className="border-white/10 my-4" />
                                        
                                        <div className="flex justify-between items-center text-lg text-white">
                                            <span className="font-bold breathe-text">房客首晚实付 (Guest Pays)</span>
                                            <span className="font-mono text-fuchsia-400 font-black">$ {guestTotal.toFixed(2)} USD</span>
                                        </div>

                                        <hr className="border-white/10 my-4" />
                                        
                                        {/* --- 房东端明细 --- */}
                                        <div className="flex justify-between text-white/60">
                                            <span>平台扣减 (7% 平台手续费)</span>
                                            <span className="font-mono text-red-400">- $ {hostFee.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xl mt-2">
                                            <span className="font-bold text-white breathe-text">您的首晚总收入 (Host Earns)</span>
                                            <span className="font-mono text-purple-300 font-black breathe-purple">$ {hostTotal.toFixed(2)} USD</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-4 py-8 border-y-2 border-white/10">
                                    <div className="text-center"><p className="text-white/90 text-xs uppercase font-bold tracking-widest mb-3">Guests</p><p className="text-2xl font-black text-white">{formData.maxGuests}</p></div>
                                    <div className="text-center border-l-2 border-white/10"><p className="text-white/90 text-xs uppercase font-bold tracking-widest mb-3">Bedrooms</p><p className="text-2xl font-black text-white">{formData.bedrooms}</p></div>
                                    <div className="text-center border-l-2 border-white/10"><p className="text-white/90 text-xs uppercase font-bold tracking-widest mb-3">Services</p><p className="text-2xl font-black text-purple-400">{(formData.cleaningFee.enabled || formData.staffService.enabled) ? 'ON' : 'OFF'}</p></div>
                                    <div className="text-center border-l-2 border-white/10"><p className="text-white/90 text-xs uppercase font-bold tracking-widest mb-3">Audit</p><p className="text-2xl font-black text-yellow-500">PENDING</p></div>
                                </div>
                                <div><h3 className="text-lg font-bold text-white uppercase tracking-widest mb-6 breathe-text">Narrative</h3><p className="text-white leading-relaxed text-xl font-medium bg-white/5 p-8 rounded-3xl border-2 border-white/20">{formData.description || 'No description provided.'}</p></div>
                            </div>
                        </div>
                    </div>
                );
            }
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0B0B] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] text-white pt-24 pb-32">
            <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />
            <div className="fixed top-0 left-0 w-full h-1 bg-white/10 z-50">
                <motion.div className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-400 shadow-[0_0_20px_rgba(168,85,247,1)]" initial={{ width: 0 }} animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }} transition={{ duration: 0.6, ease: "circOut" }} />
            </div>
            <div className="container mx-auto px-4">
                <AnimatePresence mode="wait">
                    <motion.div key={step} variants={fluidVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.5, ease: "circOut" }} className="min-h-[65vh] flex flex-col justify-center">
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-3xl border-t-2 border-white/20 py-8 z-40">
                <div className="container mx-auto px-6 flex justify-between items-center max-w-6xl">
                    <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="text-white hover:text-purple-300 font-black text-base uppercase tracking-widest flex items-center gap-2 transition-colors breathe-text">
                        <ChevronLeft className="w-6 h-6" /> {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    <div className="hidden md:flex gap-3">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-700 ease-out ${step === i + 1 ? 'bg-purple-400 w-12 shadow-[0_0_15px_rgba(168,85,247,0.9)]' : 'bg-white/40 w-4'}`} />
                        ))}
                    </div>
                    {step < TOTAL_STEPS ? (
                        <button onClick={() => setStep(step + 1)} disabled={(step === 2 && (!formData.location.lat || !formData.location.lng)) || (step === 3 && (!formData.location.country || !formData.location.street || !formData.hostContact.phone.trim() || !formData.hostContact.email.trim())) || (step === 7 && images.length === 0) || (step === 8 && !formData.title.trim()) || (step === 9 && formData.pricePerDay <= 0) || (step === 11 && (!formData.verificationDocs.ownership || !formData.verificationDocs.idFront || !formData.verificationDocs.selfie))} className="bg-white text-black px-12 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:bg-purple-300 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.5)]">Continue <ChevronRight className="w-6 h-6" /></button>
                    ) : (
                        <button onClick={handlePublish} disabled={isSubmitting} className="bg-purple-500 text-white px-12 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:bg-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.8)] transition-all flex items-center gap-2 disabled:opacity-50 breathe-text">{isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />} Submit for Audit</button>
                    )}
                </div>
            </div>
        </div>
    );
}