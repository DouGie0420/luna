'use client';

import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isAfter, isBefore, startOfDay, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CyberCalendarProps {
  blockedDates: any[]; // 来自 Firebase 的 Timestamp 数组
  pricePerDay: number;
  weekendPremium?: number;
  onRangeSelect: (range: { start: Date | null, end: Date | null }) => void;
}

export function CyberCalendar({ blockedDates, pricePerDay, weekendPremium = 0, onRangeSelect }: CyberCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selection, setSelection] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

  // 1. 将 Firebase Timestamps 转换为 JS Date 易于比较
  const disabledDates = useMemo(() => {
    return blockedDates?.map(d => startOfDay(d.toDate())) || [];
  }, [blockedDates]);

  // 2. 检查日期是否被占用
  const isDateBlocked = (date: Date) => {
    return disabledDates.some(d => isSameDay(d, date));
  };

  // 3. 处理点击逻辑
  const handleDateClick = (date: Date) => {
    if (isDateBlocked(date)) return; // 物理屏蔽

    if (!selection.start || (selection.start && selection.end)) {
      // 重新开始选择
      setSelection({ start: date, end: null });
      onRangeSelect({ start: date, end: null });
    } else {
      // 结束日期不能在开始日期之前
      if (isBefore(date, selection.start)) {
        setSelection({ start: date, end: null });
        onRangeSelect({ start: date, end: null });
        return;
      }

      // 🚀 核心逻辑：检查选择范围内是否有被占用的日期（拦截跨越选择）
      const range = eachDayOfInterval({ start: selection.start, end: date });
      const hasBlocked = range.some(d => isDateBlocked(d));
      
      if (hasBlocked) {
        // 如果中间有被占用的，直接将开始点设为当前点击的点
        setSelection({ start: date, end: null });
        onRangeSelect({ start: date, end: null });
      } else {
        setSelection({ ...selection, end: date });
        onRangeSelect({ start: selection.start, end: date });
      }
    }
  };

  // 4. 计算格子样式
  const getDayClass = (date: Date) => {
    const isPast = isBefore(date, startOfDay(new Date()));
    const isBlocked = isDateBlocked(date);
    const isSelected = (selection.start && isSameDay(date, selection.start)) || (selection.end && isSameDay(date, selection.end));
    const isInRange = selection.start && selection.end && isAfter(date, selection.start) && isBefore(date, selection.end);

    return cn(
      "relative h-14 w-full flex flex-col items-center justify-center rounded-xl transition-all duration-300 border mb-1",
      isPast || isBlocked 
        ? "opacity-20 cursor-not-allowed border-transparent bg-white/5 grayscale" 
        : "cursor-pointer border-white/5 hover:border-purple-500/50 hover:bg-purple-500/5",
      isSelected && "bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] z-10",
      isInRange && "bg-purple-500/20 border-purple-500/30 text-purple-200"
    );
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="w-full bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="titanium-title text-xl font-black uppercase tracking-tighter italic">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded-full"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <span key={d} className="text-[9px] font-black uppercase text-white/20 tracking-widest">{d}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Fill empty slots for start of month */}
        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="h-14" />
        ))}
        
        {days.map((day) => {
          const isBlocked = isDateBlocked(day) || isBefore(day, startOfDay(new Date()));
          const isWeekend = day.getDay() === 5 || day.getDay() === 6;
          const currentPrice = isWeekend ? pricePerDay * (1 + weekendPremium / 100) : pricePerDay;

          return (
            <div 
              key={day.toString()} 
              onClick={() => handleDateClick(day)}
              className={getDayClass(day)}
            >
              <span className="text-xs font-black">{format(day, 'd')}</span>
              {!isBlocked && (
                <span className="text-[8px] font-mono text-white/40 mt-1">₮{currentPrice.toFixed(0)}</span>
              )}
              {isBlocked && <X className="absolute w-4 h-4 text-white/20" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}