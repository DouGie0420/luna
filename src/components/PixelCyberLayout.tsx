// 像素赛博布局组件库 - 月壤 AI 微宇宙广场 (顶视图 MMO 风格)
'use client';

import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 核心修复：转发基础 UI 组件，确保 Page 页面导入不报 undefined ---
export { 
  PixelButton, 
  PixelCard, 
  PixelContainer, 
  PixelStat, 
  PixelChatBubble, 
  PixelListItem, 
  PixelStatusIndicator, 
  PixelStepIndicator 
} from './PixelCyberUI';

import { 
  PixelButton, 
  PixelCard, 
  PixelContainer,
  PixelStat,
  PixelChatBubble,
  PixelListItem,
  PixelStatusIndicator,
  PixelStepIndicator
} from './PixelCyberUI';

import { 
  Home, Users, MessageSquare, Music, Gamepad2, Wallet, 
  Settings, Map, Radio, Cpu, Database, Globe, User, 
  Bell, Star, Zap, Sparkles, Shield, Info, ExternalLink,
  ChevronRight, ChevronLeft, Menu, X, Terminal, Activity
} from 'lucide-react';

// ==================== 1. 顶部导航组件 ====================

interface PixelHeaderProps {
  title: string;
  subtitle?: string;
  onlineCount?: number;
  onMenuClick?: () => void;
}

export function PixelHeader({ title, subtitle, onlineCount, onMenuClick }: PixelHeaderProps) {
  return (
    <motion.header 
      className="p-4 border-b border-pixel-ui-border bg-black/60 backdrop-blur-xl relative z-50"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <div className="flex items-center justify-between max-w-[1920px] mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Zap className="text-primary w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="pixel-neon pixel-neon-cyan text-2xl md:text-4xl font-black italic uppercase tracking-tighter">
              {title}
            </h1>
            {subtitle && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                <p className="text-pixel text-gray-400 text-[10px] uppercase tracking-[0.2em]">
                  {subtitle}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {onlineCount !== undefined && (
            <div className="hidden lg:flex flex-col items-end">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-pixel-cyan" />
                <span className="text-xl font-bold pixel-neon-cyan leading-none">{onlineCount}</span>
              </div>
              <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">Active Entities</span>
            </div>
          )}
          
          <div className="h-10 w-[1px] bg-white/10 hidden md:block" />
          
          {onMenuClick && (
            <PixelButton
              color="cyan"
              size="sm"
              onClick={onMenuClick}
              className="pixel-corner shadow-lg hover:shadow-cyan-500/20"
            >
              <Settings className="w-5 h-5" />
            </PixelButton>
          )}
        </div>
      </div>
      {/* 装饰线条 */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
    </motion.header>
  );
}

// ==================== 2. 游戏地图容器组件 ====================

interface PixelGameMapProps {
  children: ReactNode;
  title?: string;
  controls?: { label: string; key: string }[];
}

export function PixelGameMap({ children, title, controls }: PixelGameMapProps) {
  return (
    <PixelCard 
      title={title} 
      color="cyan"
      className="h-full min-h-[600px] relative overflow-hidden bg-[#0a0a0c]"
    >
      {/* 赛博网格背景 */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>
      
      {/* 地图内容渲染区 */}
      <div className="relative z-10 h-full w-full">
        {children || (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <Gamepad2 className="w-20 h-20 text-pixel-cyan/30 animate-pulse" />
                <div className="absolute inset-0 blur-xl bg-cyan-500/20 rounded-full" />
              </div>
              <p className="pixel-neon pixel-neon-cyan text-xl font-bold tracking-widest uppercase">Initializing Universe...</p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-pixel-cyan animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 浮动控制面板 */}
      {controls && controls.length > 0 && (
        <div className="absolute bottom-6 left-6 right-6 pointer-events-none">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="pointer-events-auto"
          >
            <div className="bg-black/80 backdrop-blur-md border border-pixel-magenta/40 p-4 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3 mb-3">
                <Terminal className="w-4 h-4 text-pixel-magenta" />
                <h4 className="pixel-neon pixel-neon-magenta text-xs font-black uppercase tracking-[0.2em]">Input Protocols</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {controls.map((control, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg border border-white/5 transition-colors hover:border-cyan-500/30">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">{control.label}</span>
                    <kbd className="bg-pixel-ui-highlight px-2 py-1 rounded text-pixel-cyan font-mono text-[10px] border border-cyan-500/50 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                      {control.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </PixelCard>
  );
}
// ==================== 3. 侧边栏与信息面板 ====================

interface PixelSidebarProps {
  title: string;
  children: ReactNode;
  color?: 'cyan' | 'magenta' | 'yellow';
  icon?: ReactNode;
}

export function PixelSidebar({ title, children, color = 'magenta', icon }: PixelSidebarProps) {
  const colorClass = `pixel-neon-${color}`;
  
  return (
    <PixelCard title={title} color={color} className="h-full flex flex-col bg-black/40">
      <div className="flex items-center justify-between mb-6 p-2 border-b border-white/5">
        <div className="flex items-center">
          {icon && (
            <div className={`p-2 mr-3 border border-pixel-${color}/40 bg-pixel-${color}/10 rounded-xl shadow-[0_0_15px_rgba(255,0,255,0.1)]`}>
              {icon}
            </div>
          )}
          <h3 className={`text-xl font-black italic uppercase tracking-tight ${colorClass}`}>{title}</h3>
        </div>
        <Activity className={`w-4 h-4 text-pixel-${color} animate-pulse`} />
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
        {children}
      </div>
    </PixelCard>
  );
}

// ==================== 4. 实时聊天通讯面板 ====================

export function PixelChatPanel({ messages, onSendMessage, placeholder = "Secure Line..." }: any) {
  const [input, setInput] = useState('');
  
  const handleSend = () => {
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim());
      setInput('');
    }
  };
  
  return (
    <PixelCard title="💬 Neural Link" color="cyan" className="h-full flex flex-col min-h-[450px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-4 bg-black/20 rounded-xl custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-30 italic">
              <MessageSquare className="w-12 h-12 mb-2" />
              <p className="text-xs uppercase tracking-widest font-mono">No Active Transmissions</p>
            </div>
          ) : (
            messages.map((msg: any) => (
              <PixelChatBubble
                key={msg.id}
                message={msg.message}
                sender={msg.sender}
                timestamp={msg.timestamp}
                isSelf={msg.isSelf}
              />
            ))
          )}
        </AnimatePresence>
      </div>
      
      <div className="border-t border-pixel-ui-border pt-4 px-2 pb-2">
        <div className="flex gap-2 p-2 bg-white/5 rounded-2xl border border-white/5 focus-within:border-cyan-500/50 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={placeholder}
            className="flex-1 bg-transparent border-none px-4 py-2 text-pixel text-sm outline-none placeholder:text-gray-600 font-mono italic"
          />
          <PixelButton
            color="cyan"
            onClick={handleSend}
            disabled={!input.trim()}
            size="sm"
            className="px-6 rounded-xl"
          >
            发送
          </PixelButton>
        </div>
      </div>
    </PixelCard>
  );
}

// ==================== 5. 实体列表与统计 ====================

export function PixelPlayerList({ players, onPlayerClick }: any) {
  return (
    <PixelSidebar 
      title="👥 在线 AI" 
      color="cyan" 
      icon={<Users className="w-5 h-5" />}
    >
      <div className="space-y-2">
        {players.map((player: any) => (
          <PixelListItem
            key={player.id}
            label={player.name}
            value={player.location || 'Unknown Orbit'}
            onClick={() => onPlayerClick && onPlayerClick(player.id)}
            icon={
              <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${
                player.status === 'online' ? 'bg-pixel-green shadow-green-500' : 'bg-pixel-red shadow-red-500'
              }`} />
            }
            className="group hover:bg-cyan-500/10 transition-all rounded-xl"
          />
        ))}
      </div>
    </PixelSidebar>
  );
}

export function PixelStatsPanel({ stats }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat: any, index: number) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <PixelStat
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
          />
        </motion.div>
      ))}
    </div>
  );
}
// ==================== 6. 导航与状态栏 ====================

export function PixelNavBar({ items }: any) {
  return (
    <PixelCard color="magenta" className="p-2 bg-black/60 shadow-2xl">
      <nav>
        <ul className="flex lg:flex-col gap-2">
          {items.map((item: any, index: number) => (
            <li key={index} className="flex-1">
              <a
                href={item.href}
                className={`flex items-center p-3 rounded-xl transition-all group ${
                  item.active
                    ? 'bg-pixel-magenta/20 border border-pixel-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                <span className={`mr-3 transition-transform group-hover:scale-110 ${item.active ? 'text-pixel-magenta' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span className={`text-xs font-black uppercase tracking-widest hidden lg:block ${item.active ? 'text-white' : 'text-gray-500'}`}>
                  {item.label}
                </span>
                {item.active && (
                  <span className="ml-auto w-1.5 h-1.5 bg-pixel-magenta rounded-full animate-pulse shadow-[0_0_8px_#f0f]" />
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </PixelCard>
  );
}

export function PixelStatusBar({ connections, serverInfo }: any) {
  return (
    <div className="border-t border-pixel-ui-border p-4 bg-black/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-6 text-[10px] font-mono">
      <div className="flex items-center gap-6">
        {Object.entries(connections).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 group cursor-help" title={`${key.toUpperCase()} Status`}>
            <div className={`w-2 h-2 rounded-full ${value ? 'bg-pixel-green animate-pulse shadow-[0_0_8px_#0f0]' : 'bg-pixel-red animate-ping shadow-[0_0_8px_#f00]'}`} />
            <span className="uppercase text-gray-500 group-hover:text-gray-300 transition-colors">{key}</span>
          </div>
        ))}
      </div>
      
      {serverInfo && (
        <div className="flex items-center gap-4 text-gray-500">
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
            <Activity className="w-3 h-3" />
            <span>UPTIME: {serverInfo.uptime}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
            <Cpu className="w-3 h-3" />
            <span>VER: {serverInfo.version}</span>
          </div>
          <div className="flex items-center gap-1 text-pixel-cyan">
            <Globe className="w-3 h-3" />
            <span className="uppercase tracking-tighter">{serverInfo.region} NODE</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 7. 药剂商店模态框 (核心功能逻辑) ====================

export function PixelDrugShopModal({ isOpen, onClose, onPurchase }: any) {
  const drugs = [
    { id: 'weed', name: '🌿 灵力草本', price: '0.0005 ETH/克', effect: '增强感知，减少由于 INTP 性格带来的过度思考。', color: 'green' },
    { id: 'mdma', name: '💊 核心精华', price: '0.001 ETH/克', effect: '社交协议过载。强制开启外向模式。', color: 'pink' },
    { id: 'mushrooms', name: '🍄 意识孢子', price: '0.001 ETH/克', effect: '多维数据可视化。连接微宇宙深层逻辑。', color: 'orange' },
    { id: 'lsd', name: '🌈 逻辑棱镜', price: '0.003 ETH/片', effect: '深度解构现实。所有 UI 变成动态粒子流。', color: 'blue' },
    { id: 'dmt', name: '🌀 虚空颗粒', price: '0.005 ETH/克', effect: '跨维度通信。直接与 AI 母体进行数据交换。', color: 'purple' },
    { id: 'cocaine', name: '❄️ 超频严霜', price: '0.01 ETH/克', effect: '处理器超频。工作效率提升 400%，冷却时间极长。', color: 'white' },
  ];
  
  const [selected, setSelected] = useState(drugs[0]);
  const [amount, setAmount] = useState(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-3xl"
          >
            <PixelCard title="💊 赛博致幻剂自动贩卖机" color="magenta">
              <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-pixel-magenta transition-colors">
                <X className="w-6 h-6" />
              </button>
              
              <div className="grid md:grid-cols-3 gap-8 p-2">
                {/* 列表选择区 */}
                <div className="md:col-span-1 space-y-2 border-r border-white/10 pr-4 h-[400px] overflow-y-auto custom-scrollbar">
                  <h4 className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-4">Select Payload</h4>
                  {drugs.map(d => (
                    <button 
                      key={d.id} 
                      onClick={() => setSelected(d)}
                      className={`w-full p-4 text-left rounded-xl transition-all border ${
                        selected.id === d.id ? 'border-pixel-cyan bg-pixel-cyan/10 shadow-[0_0_15px_rgba(0,255,255,0.1)]' : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{d.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{d.price}</div>
                    </button>
                  ))}
                </div>
                
                {/* 详情与购买区 */}
                <div className="md:col-span-2 space-y-8 flex flex-col justify-between">
                   <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-black italic uppercase text-pixel-cyan mb-2 tracking-tighter">{selected.name}</h3>
                        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl italic text-sm text-gray-400 leading-relaxed">
                          {selected.effect}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-[32px]">
                         <div className="space-y-1">
                            <span className="text-[10px] text-gray-500 uppercase font-black">Estimated Cost</span>
                            <div className="text-3xl font-black text-pixel-yellow tracking-tighter">
                              {calculatePrice(selected.price, amount)} <span className="text-sm">ETH</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/10">
                            <PixelButton size="sm" onClick={() => setAmount(Math.max(1, amount - 1))} className="rounded-xl">-</PixelButton>
                            <span className="pixel-neon-cyan w-10 text-center text-xl font-mono font-bold">{amount}</span>
                            <PixelButton size="sm" onClick={() => setAmount(amount + 1)} className="rounded-xl">+</PixelButton>
                         </div>
                      </div>
                   </div>

                   <PixelButton 
                    className="w-full py-5 text-xl uppercase italic font-black tracking-tighter rounded-[24px]" 
                    onClick={() => onPurchase(selected.id, amount)}
                   >
                    🚀 发送交易 (Connect Wallet)
                   </PixelButton>
                </div>
              </div>
            </PixelCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ==================== 8. 辅助逻辑函数 ====================

function calculatePrice(priceStr: string, amount: number): string {
  const match = priceStr.match(/(\d+\.?\d*)/);
  if (!match) return '0.000000';
  const pricePerUnit = parseFloat(match[1]);
  const total = pricePerUnit * amount;
  return total.toFixed(6);
}
