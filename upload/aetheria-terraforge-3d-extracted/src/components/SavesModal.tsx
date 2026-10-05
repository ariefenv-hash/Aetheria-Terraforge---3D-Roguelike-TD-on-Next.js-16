import React, { useState, useEffect } from 'react';
import { Save, Download, Upload, Trash2, Play, Check, X, Clock, ShieldCheck } from 'lucide-react';
import { SaveGameSlot } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface SavesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToSlot: (slotId: number) => void;
  onLoadFromSlot: (slot: SaveGameSlot) => void;
  getCurrentSaveData: (slotId: number) => SaveGameSlot;
}

export const SavesModal: React.FC<SavesModalProps> = ({
  isOpen,
  onClose,
  onSaveToSlot,
  onLoadFromSlot,
  getCurrentSaveData,
}) => {
  const [slots, setSlots] = useState<(SaveGameSlot | null)[]>([null, null, null]);
  const [importCode, setImportCode] = useState('');
  const [copiedSlot, setCopiedSlot] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadSlotsFromStorage();
  }, [isOpen]);

  const loadSlotsFromStorage = () => {
    const loaded: (SaveGameSlot | null)[] = [1, 2, 3].map((slotId) => {
      const data = localStorage.getItem(`terraforge_save_slot_${slotId}`);
      if (data) {
        try {
          return JSON.parse(data) as SaveGameSlot;
        } catch {
          return null;
        }
      }
      return null;
    });
    setSlots(loaded);
  };

  if (!isOpen) return null;

  const handleSave = (slotId: number) => {
    soundManager.playBuild();
    const data = getCurrentSaveData(slotId);
    localStorage.setItem(`terraforge_save_slot_${slotId}`, JSON.stringify(data));
    loadSlotsFromStorage();
    setStatusMsg(`已成功保存至档案槽位 ${slotId}`);
    setTimeout(() => setStatusMsg(''), 2500);
  };

  const handleLoad = (slot: SaveGameSlot) => {
    soundManager.playWarHorn();
    onLoadFromSlot(slot);
    onClose();
  };

  const handleDelete = (slotId: number) => {
    soundManager.playClick();
    localStorage.removeItem(`terraforge_save_slot_${slotId}`);
    loadSlotsFromStorage();
    setStatusMsg(`已清空槽位 ${slotId}`);
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const handleExportSlot = (slot: SaveGameSlot, idx: number) => {
    navigator.clipboard.writeText(JSON.stringify(slot));
    setCopiedSlot(idx);
    setTimeout(() => setCopiedSlot(null), 2000);
  };

  const handleImportText = () => {
    try {
      const parsed = JSON.parse(importCode) as SaveGameSlot;
      if (!parsed.mapData || typeof parsed.wave !== 'number') {
        throw new Error('无效的存档数据');
      }
      handleLoad(parsed);
    } catch {
      setStatusMsg('存档代码解析失败，请检查复制内容');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full parchment-panel rounded-3xl border-2 border-[#997843] shadow-2xl p-6 relative flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#6e5336] pb-3">
          <div className="flex items-center gap-2">
            <Save size={20} className="text-[#ffd700]" />
            <h2 className="text-xl font-bold font-decorative text-[#fff0d0]">
              古卷档案室·纪事存续 (Archives)
            </h2>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-[#3d2e1f] text-[#c9b79b] hover:text-[#ffd700]"
          >
            <X size={20} />
          </button>
        </div>

        {statusMsg && (
          <div className="p-2 rounded-lg bg-[#3d2e18] border border-[#a8824f] text-xs text-[#ffd700] text-center font-cinzel">
            {statusMsg}
          </div>
        )}

        {/* 3 Save Slots */}
        <div className="space-y-3">
          {slots.map((slot, idx) => {
            const slotId = idx + 1;
            return (
              <div
                key={slotId}
                className="parchment-card p-3.5 rounded-2xl border border-[#6b5235] flex items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#140e0a] border border-[#523e29] flex items-center justify-center font-cinzel font-bold text-base text-[#ffd700]">
                    {slotId}
                  </div>
                  {slot ? (
                    <div>
                      <div className="font-bold font-cinzel text-sm text-[#fff0d0] flex items-center gap-2">
                        <span>{slot.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#332214] text-[#ffd580] border border-[#694827]">
                          波次: {slot.wave}
                        </span>
                      </div>
                      <div className="text-xs text-[#a89070] flex items-center gap-3 mt-1 font-mono-code">
                        <span>核心HP: {Math.round(slot.heartHealth)}</span>
                        <span>晶石: {slot.resources.aether}🪨</span>
                        <span>秘宝: {slot.unlockedRelicIds.length}枚</span>
                        <span className="flex items-center gap-1 text-[10px] text-[#8c7457]">
                          <Clock size={11} /> {new Date(slot.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#8c7457] italic">—— 空白纪事卷轴 (尚未归档) ——</div>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSave(slotId)}
                    className="brass-button py-1.5 px-3 rounded-lg text-xs font-bold font-cinzel"
                    title="覆盖当前进度至此槽位"
                  >
                    保存
                  </button>

                  {slot && (
                    <>
                      <button
                        onClick={() => handleLoad(slot)}
                        className="py-1.5 px-3 rounded-lg bg-[#2a441e] hover:bg-[#395e28] text-xs font-cinzel text-[#d4f7c5] font-bold flex items-center gap-1"
                        title="读取此进度"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>载入</span>
                      </button>

                      <button
                        onClick={() => handleExportSlot(slot, slotId)}
                        className="p-1.5 rounded-lg border border-[#523e29] hover:bg-[#382b1d] text-[#c9b79b] hover:text-[#ffd700]"
                        title="复制存档代码"
                      >
                        {copiedSlot === slotId ? <Check size={14} className="text-green-400" /> : <Download size={14} />}
                      </button>

                      <button
                        onClick={() => handleDelete(slotId)}
                        className="p-1.5 rounded-lg border border-[#521b1b] hover:bg-[#3a1414] text-[#ff8080]"
                        title="删除存档"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Import Code Area */}
        <div className="pt-3 border-t border-[#523e29] space-y-2">
          <label className="text-xs font-cinzel text-[#aa9577]">从剪贴板跨设备载入存档代码</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="在此粘贴存档 JSON 代码..."
              className="flex-1 bg-[#120d09] border border-[#523e29] rounded-lg px-3 py-1.5 text-xs text-[#fff0d0] font-mono-code"
            />
            <button
              onClick={handleImportText}
              className="brass-button py-1.5 px-4 rounded-lg text-xs font-bold font-cinzel flex items-center gap-1.5"
            >
              <Upload size={14} />
              <span>载入代码</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
