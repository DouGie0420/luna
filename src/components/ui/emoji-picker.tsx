'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Shuffle, Star } from 'lucide-react';
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

/* ===============================
   1️⃣ 生成 1500+ Emoji（Unicode区间）
================================= */
function generateEmojiPool(): string[] {
  const ranges = [
    [0x1F300, 0x1F6FF], // symbols & transport
    [0x1F700, 0x1F77F],
    [0x1F780, 0x1F7FF],
    [0x1F800, 0x1F8FF],
    [0x1F900, 0x1F9FF],
    [0x1FA00, 0x1FAFF],
    [0x2600, 0x26FF],   // misc symbols
    [0x2700, 0x27BF]    // dingbats
  ];
  const emojis: string[] = [];

  ranges.forEach(([start, end]) => {
    for (let code = start; code <= end; code++) {
      try {
        const char = String.fromCodePoint(code);
        if (/\p{Emoji}/u.test(char)) {
          emojis.push(char);
        }
      } catch {}
    }
  });
  return emojis;
}

const EMOJI_POOL = generateEmojiPool();

/* ===============================
   2️⃣ 工具函数
================================= */
function shuffleArray(array: string[], seed: number) {
  const arr = [...array];
  let random = seed;

  for (let i = arr.length - 1; i > 0; i--) {
    random = (random * 9301 + 49297) % 233280;
    const j = Math.floor((random / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

const STORAGE_KEY = "emoji_usage_v1";
const FAVORITE_KEY = "emoji_favorites_v1";

/* ===============================
   3️⃣ 组件
================================= */
export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [refreshSeed, setRefreshSeed] = useState(Date.now());

  /* ---- Load storage ---- */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const fav = localStorage.getItem(FAVORITE_KEY);
    if (stored) setUsage(JSON.parse(stored));
    if (fav) setFavorites(JSON.parse(fav));
  }, []);

  /* ---- Smart 推荐 ---- */
  const smartEmojis = useMemo(() => {
    return Object.entries(usage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([emoji]) => emoji);
  }, [usage]);

  /* ---- AI 随机池（每天自动刷新）---- */
  const dailySeed = useMemo(() => {
    const today = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = today.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }, []);

  const randomEmojis = useMemo(() => {
    return shuffleArray(EMOJI_POOL, dailySeed + refreshSeed).slice(0, 200);
  }, [dailySeed, refreshSeed]);

  /* ---- 选择处理 ---- */
  const handleSelect = (emoji: string) => {
    const newUsage = {
      ...usage,
      [emoji]: (usage[emoji] || 0) + 1
    };
    setUsage(newUsage);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsage));
    onSelect(emoji);
  };

  const toggleFavorite = (emoji: string) => {
    let updated;
    if (favorites.includes(emoji)) {
      updated = favorites.filter(e => e !== emoji);
    } else {
      updated = [...favorites, emoji];
    }
    setFavorites(updated);
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(updated));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("p-2 hover:bg-white/10 rounded-full transition-colors", className)}>
          <Smile className="w-5 h-5 text-white/40 hover:text-white" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        className="w-[350px] max-h-[450px] overflow-y-auto bg-[#0A0A0B]/95 backdrop-blur-xl border-white/10 p-4 rounded-2xl shadow-2xl custom-scrollbar"
      >
        {/* Smart Picks */}
        {smartEmojis.length > 0 && (
          <>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 ml-1">Smart Picks</h3>
            <div className="grid grid-cols-8 gap-2 mb-6">
              {smartEmojis.map(e => (
                <button
                  key={`smart-${e}`}
                  onClick={() => handleSelect(e)}
                  className="text-xl hover:scale-125 transition-transform duration-200"
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-3 ml-1">Favorites</h3>
            <div className="grid grid-cols-8 gap-2 mb-6">
              {favorites.map(e => (
                <button
                  key={`fav-${e}`}
                  onClick={() => handleSelect(e)}
                  className="text-xl hover:scale-125 transition-transform duration-200"
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        )}

        {/* AI Random Pool */}
        <div className="flex justify-between items-center mb-3 ml-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20">AI Random Pool</h3>
          <button
            onClick={() => setRefreshSeed(Date.now())}
            className="text-white/20 hover:text-purple-400 transition-colors"
          >
            <Shuffle size={12} />
          </button>
        </div>

        <div className="grid grid-cols-8 gap-2">
          {randomEmojis.map(e => (
            <div key={`rand-${e}`} className="relative group">
              <button
                onClick={() => handleSelect(e)}
                className="text-xl hover:scale-125 transition-transform duration-200"
              >
                {e}
              </button>

              <button
                onClick={() => toggleFavorite(e)}
                className={cn(
                  "absolute -top-1 -right-1 transition-all duration-200",
                  favorites.includes(e) ? "opacity-100 scale-100" : "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100"
                )}
              >
                <Star 
                  size={10} 
                  className={cn(favorites.includes(e) ? "text-yellow-400 fill-yellow-400" : "text-white/40")} 
                />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}