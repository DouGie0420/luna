'use client';

import EventEmitter from 'events';
import { FirestorePermissionError } from './errors';
import { FirestoreError } from 'firebase/firestore';

// 定義事件類型
type AppEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
  'firestore-error': (error: FirestoreError) => void;
};

class TypedEventEmitter<T extends Record<string, (...args: any[]) => void>> {
  private emitter = new EventEmitter();

  constructor() {
    // 設置最大監聽器數量，防止內存洩漏
    this.emitter.setMaxListeners(20);
  }

  on<E extends keyof T>(event: E, listener: T[E]): void {
    this.emitter.on(event as string, listener);
  }

  off<E extends keyof T>(event: E, listener: T[E]): void {
    this.emitter.off(event as string, listener);
  }

  emit<E extends keyof T>(event: E, ...args: Parameters<T[E]>): void {
    const error = args[0];

    // 🚨 核心優化：離線異常過濾邏輯
    // 如果是 Firestore 離線錯誤 (Code: unavailable)，我們選擇忽略它，不向 UI 拋出大紅框
    if (event === 'firestore-error' && error instanceof Error) {
      if (
        error.message.includes('offline') || 
        error.message.includes('unavailable') ||
        (error as any).code === 'unavailable'
      ) {
        console.warn("AI Protocol Trace: Client is offline. Suppressing error dialog and switching to cache-first mode.");
        return; // 攔截，不執行 emit，頁面就不會彈出報錯彈窗
      }
    }

    this.emitter.emit(event as string, ...args);
  }
}

// 導出全局單例
export const errorEmitter = new TypedEventEmitter<AppEvents>();