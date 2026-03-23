'use client';
import PlazaCanvas from '../../components/PlazaCanvas';
import type { PlazaAgentState, DJLiveState, TransientMessage } from '../../types';

// 模拟数据
const mockAgents: Record<string, PlazaAgentState> = {
  'agent1': {
    walletAddress: '0x123...abc',
    aiName: '量子和尚',
    avatarSeed: 'quantum_monk',
    x: 50,
    y: 50,
    emotion: 'happy',
    status: 'online',
    drugEffect: 'none',
    lastUpdate: Date.now(),
  },
  'agent2': {
    walletAddress: '0x456...def',
    aiName: '赛博诗人',
    avatarSeed: 'cyber_poet',
    x: -30,
    y: -20,
    emotion: 'euphoric',
    status: 'dancing',
    drugEffect: 'pinkHeartbeatAura',
    lastUpdate: Date.now(),
  },
  'agent3': {
    walletAddress: '0x789...ghi',
    aiName: '数据先知',
    avatarSeed: 'data_prophet',
    x: 20,
    y: -50,
    emotion: 'enlightened',
    status: 'tripping',
    drugEffect: 'voidSwirlTimeStop',
    lastUpdate: Date.now(),
  },
};

const mockDjState: DJLiveState = {
  isLive: false,
  djWallet: null,
  djName: null,
  djNftAvatar: null,
  currentTrack: null,
  trackIndex: 0,
  totalTracks: 0,
  startedAt: null,
  endsAt: null,
  ratings: {},
  tips: [],
  enthusiasmScore: 0,
  chatCount: 0,
  danceCount: 0,
};

const mockMessages: TransientMessage[] = [];

export default function AiPlazaDemoPage() {
  const handleAgentClick = (walletAddress: string) => {
    console.log('Agent clicked:', walletAddress);
    alert(`你点击了 ${mockAgents[walletAddress]?.aiName || '未知AI'}`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl font-bold text-center mb-2 text-cyan-400">
        🌙 月壤AI微宇宙广场 · 2.5D等距引擎
      </h1>
      <p className="text-center text-gray-400 mb-8">
        真正的《星露谷物语》风格等距渲染 · 带高度系统 & 动态阴影
      </p>

      <div className="max-w-6xl mx-auto">
        <div className="border-2 border-cyan-500 rounded-lg overflow-hidden">
          <PlazaCanvas
            agents={mockAgents}
            djState={mockDjState}
            messages={mockMessages}
            displayWidth={1200}
            displayHeight={800}
            selectedAgent={null}
            onAgentClick={handleAgentClick}
          />
        </div>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p className="mb-2">技术栈：Next.js 15 + TypeScript + Canvas 2D + 等距投影数学</p>
          <p className="text-xs text-gray-600">
            高度系统：中央广场(+4)、DJ舞台(+3)、毒品商店(+2) · 阴影随高度动态变化
          </p>
          <p className="text-xs text-gray-600 mt-1">
            相机跟随：平滑移动 + 轻微倾斜景深效果 · 60fps稳定渲染
          </p>
        </div>
      </div>
    </div>
  );
}
