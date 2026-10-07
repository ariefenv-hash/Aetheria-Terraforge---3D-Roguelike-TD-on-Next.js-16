'use client';

import React, { useState, useEffect } from 'react';
import { soundManager } from '@/audio/soundManager';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  highlight?: string; // CSS selector for element to spotlight
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '欢迎，地脉塑者',
    description: '欢迎来到 Aetheria · Terraforge。你将扮演最后的守护者，用大地为砧、塔为锤，抵御异界魔物。点击"下一步"了解核心机制。',
    icon: '⚜️',
  },
  {
    id: 'heart',
    title: '地脉核心 — 你的生命',
    description: '左上角的水晶是地脉核心。一旦它倒下，征程即终结。下方数值是你的剩余血量，色环颜色随血量变化。',
    icon: '💎',
  },
  {
    id: 'resources',
    title: '四维资源',
    description: '顶部资源栏：🪨 原石用于建造/重塑，⚡ 灵能驱动奥术塔，🔨 造物印记每波恢复用于地貌改造，🔮 魂髓用于解锁秘宝。',
    icon: '📊',
  },
  {
    id: 'wave',
    title: '吹响号角',
    description: '准备好后，点右上角金色"吹响号角"按钮开始一波。每波魔物从异界裂隙涌来，抵达核心即造成伤害。抵御所有 20 波即胜利！',
    icon: '📯',
  },
  {
    id: 'tower',
    title: '建造防御工械',
    description: '底部 8 张塔卡片代表 8 种防御工械。点击选中后，在地形上点击即可建造。弩炮射程远，炼金炎塔造成燃烧，奥术棱镜伤害最高但消耗灵能。',
    icon: '🏰',
  },
  {
    id: 'terraform',
    title: '地貌重塑 (核心机制)',
    description: '左侧工具栏可升降地形、开凿深渊、引动熔岩与灵泉。高处塔射程更远，深渊让魔物绕路，熔岩造成持续灼烧！',
    icon: '⛰️',
  },
  {
    id: 'hotkey',
    title: '快捷键',
    description: '游戏中按 H 显示完整快捷键面板。空格暂停，1-8 选塔，Q-X 切换地貌工具，Shift+点击连建。这些都是高玩必备！',
    icon: '⌨️',
  },
  {
    id: 'combo',
    title: '连击系统 (新机制)',
    description: '连续击杀魔物（2.5 秒内）触发连击，每 5 连击 +1 个增益档位，最高 ×3.0 倍资源奖励。看到右上角连击表就证明你打出了精彩瞬间！',
    icon: '🔥',
  },
  {
    id: 'events',
    title: '波次随机事件 (新机制)',
    description: '征程中会触发 3-5 次战场异变：陨石坠落、宝藏哥布林、先祖祝福、以太之雨、战场狂热。它们让每局都独一无二！',
    icon: '☄️',
  },
  {
    id: 'relics',
    title: '秘宝选择 (Roguelike)',
    description: '每波胜利后从三件秘宝中选一，永久改变战局走向。19 件秘宝各有独特效果，组合构筑是你的策略核心。',
    icon: '💎',
  },
  {
    id: 'specialization',
    title: '塔专精 (新机制)',
    description: '塔升至 Lv.3 时可从 3 个专精路径中选一进化。例如：弩炮可选急速射击/破甲专精/过载充能，永久塑造其角色。',
    icon: '⚔️',
  },
  {
    id: 'start',
    title: '准备启程',
    description: '建议新手从「学徒」难度开始熟悉机制。无尽模式适合挑战极限。准备好就回到主菜单开启征程吧！',
    icon: '🚀',
  },
];

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_SEEN_KEY = 'aetheria_tutorial_seen_v1';

/**
 * First-time user tutorial. Shows once on first visit; can be re-triggered
 * from the start menu's "玩法说明" button.
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onClose }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const step = TUTORIAL_STEPS[stepIdx];
  const total = TUTORIAL_STEPS.length;
  const isLast = stepIdx === total - 1;

  if (!isOpen) return null;

  const handleNext = () => {
    soundManager.playClick();
    if (isLast) {
      try { localStorage.setItem(TUTORIAL_SEEN_KEY, 'true'); } catch { /* ignore */ }
      onClose();
    } else {
      setStepIdx((i) => i + 1);
    }
  };

  const handlePrev = () => {
    soundManager.playClick();
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  };

  const handleSkip = () => {
    soundManager.playClick();
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, 'true'); } catch { /* ignore */ }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full parchment-panel rounded-3xl border-2 border-[#b8860b] p-6 shadow-2xl flex flex-col gap-4">
        {/* Header with icon */}
        <div className="text-center">
          <div className="text-5xl mb-2 animate-bounce">{step.icon}</div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-cinzel font-bold mb-1">
            · 新手引导 ·
          </div>
          <h2 className="text-xl font-bold font-decorative text-[#fff5e1]">{step.title}</h2>
        </div>

        {/* Description */}
        <div className="bg-[#18120c]/90 p-3 rounded-xl border border-[#4a3926] text-sm text-[#ecdcb9] leading-relaxed text-center min-h-[80px]">
          {step.description}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {TUTORIAL_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { soundManager.playClick(); setStepIdx(i); }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === stepIdx ? 'bg-[#ffd700] w-6' : i < stepIdx ? 'bg-[#d6af68]' : 'bg-[#3d3022]'
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleSkip}
            className="text-[11px] text-[#8c7457] hover:text-[#aa9577] px-2 py-1"
          >
            跳过
          </button>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button
                onClick={handlePrev}
                className="brass-button py-1.5 px-3 rounded-lg text-xs font-cinzel"
              >
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              className="brass-button py-1.5 px-4 rounded-lg text-xs font-cinzel font-bold"
            >
              {isLast ? '开始游戏' : '下一步'} ({stepIdx + 1}/{total})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Check if tutorial has been completed before. */
export function hasSeenTutorial(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true'; } catch { return false; }
}

/** Reset the "has seen tutorial" flag (e.g., when player explicitly wants to replay it). */
export function resetTutorialFlag(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(TUTORIAL_SEEN_KEY); } catch { /* ignore */ }
}
