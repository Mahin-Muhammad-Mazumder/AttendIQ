import React from 'react';
import { Keyboard, X, Sparkles, Volume2 } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'D', description: 'Jump to Dashboard & Analytics' },
    { key: 'L', description: 'Jump to Daily Attendance Logger' },
    { key: 'R', description: 'Jump to Routine & Timetable Manager' },
    { key: 'P', description: 'Jump to Bunk & Recovery Predictor' },
    { key: 'C', description: 'Jump to Exclusion & Holiday Calendar' },
    { key: 'G', description: 'Jump to Streaks & Badges Showcase' },
    { key: 'T', description: 'Quick jump to Today in Daily Logger' },
    { key: 'M', description: 'Toggle Audio & Chime Sound Effects' },
    { key: '?', description: 'Show / Hide Keyboard Shortcuts' },
    { key: 'Esc', description: 'Close any open modal or dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#090a14]/90 backdrop-blur-xl border border-white/[0.08] ring-1 ring-inset ring-white/[0.06] rounded-2xl max-w-md w-full p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-cyan-400 flex items-center justify-center">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Student Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-400">Navigate AttendIQ at lightning speed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-white/[0.04] transition border border-transparent hover:border-white/[0.08]"
            >
              <span className="text-xs text-slate-300 font-medium">
                {sc.description}
              </span>
              <kbd className="px-2.5 py-1 text-xs font-mono tracking-tight font-bold bg-[#030308] text-cyan-400 border border-indigo-500/30 rounded-lg">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.07] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Shortcuts work across all tabs</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] font-semibold text-xs transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
