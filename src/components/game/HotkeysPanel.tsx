'use client';

import React from 'react';
import { soundManager } from '@/audio/soundManager';

interface HotkeysPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOTKEYS: { keys: string; desc: string }[] = [
  { keys: '空格', desc: '暂停 / 继续' },
  { keys: 'Q', desc: '勘探视界 (Inspect)' },
  { keys: 'W', desc: '隆起山峦 (+1 高度)' },
  { keys: 'E', desc: '开凿地沟 (-1 高度)' },
  { keys: 'R', desc: '深渊天堑 (挖至 0 层)' },
  { keys: 'T', desc: '熔岩灌注' },
  { keys: 'Y', desc: '灵脉涌泉' },
  { keys: 'U', desc: '平整大地' },
  { keys: 'X', desc: '拆除工事' },
  { keys: '1-8', desc: '选择防御塔 (按顺序)' },
  { keys: 'Esc', desc: '取消选中' },
  { keys: 'H', desc: '显示 / 隐藏此快捷键面板' },
  { keys: 'Shift+点击', desc: '持续建造 (同型塔连点)' },
  { keys: '右键', desc: '取消当前选中 / 关闭面板' },
  { keys: '鼠标拖拽', desc: '旋转相机' },
  { keys: '滚轮 / 双指', desc: '缩放相机' },
];

/** In-game quick reference for keyboard shortcuts. Press H to toggle. */
export const HotkeysPanel: React.FC<HotkeysPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="parchment-panel rounded-2xl border border-[#997843] p-5 max-w-md w-full shadow-2xl"
        onClick={(e) => {
          e.stopPropagation();
          soundManager.playClick();
        }}
      >
        <div className="flex items-center justify-between mb-3 border-b border-[#634f35] pb-2">
          <h3 className="font-cinzel text-base text-[#ffd700] tracking-wider">⌨️ 快捷键档案 · HOTKEYS</h3>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="text-[#8c7457] hover:text-[#ffd700] text-xl leading-none"
            title="关闭 (H)"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {HOTKEYS.map((h) => (
            <div
              key={h.keys}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[#1a1510]/70 border border-[#3d3022]"
            >
              <kbd className="text-[11px] font-mono-code font-bold text-[#ffd700] bg-[#0c0a08] border border-[#52402b] px-1.5 py-0.5 rounded">
                {h.keys}
              </kbd>
              <span className="text-[11px] text-[#c7b299] text-right flex-1 ml-2">{h.desc}</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-[#7c6241] mt-3 text-center italic">
          按 H 随时呼出 / 收起
        </div>
      </div>
    </div>
  );
};
