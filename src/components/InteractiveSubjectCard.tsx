import React, { useState } from 'react';
import { SubjectAnalytics } from '../types';
import { getMarksTier } from '../utils/marksEngine';
import { playSound } from '../utils/audioFeedback';
import {
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface InteractiveSubjectCardProps {
  analytics: SubjectAnalytics;
  onOpenPredictor: (subjectId: string) => void;
  isFocused?: boolean;
  onFocusSubject?: (subjectId: string) => void;
  onSimulationChange?: (subjectId: string, simulatedPct: number | null) => void;
}

export const InteractiveSubjectCard: React.FC<InteractiveSubjectCardProps> = ({
  analytics: sa,
  onOpenPredictor,
  isFocused = false,
  onFocusSubject,
  onSimulationChange,
}) => {
  // Simulator state: delta of attended classes simulated (+/-)
  const [simAttendedDelta, setSimAttendedDelta] = useState(0);
  const [simMissedDelta, setSimMissedDelta] = useState(0);
  const [showSim, setShowSim] = useState(false);

  // Calculate simulated values
  const isSimulating = simAttendedDelta !== 0 || simMissedDelta !== 0;
  const simulatedConducted = sa.conductedClasses + simAttendedDelta + simMissedDelta;
  const simulatedPresent = sa.presentClasses + simAttendedDelta;
  const simulatedPct =
    simulatedConducted > 0
      ? Math.round(((simulatedPresent / simulatedConducted) * 100 + Number.EPSILON) * 10) / 10
      : 0;
  const simulatedTier =
    simulatedConducted > 0 ? getMarksTier(simulatedPct) : getMarksTier(0);
  const simulatedMarks = simulatedConducted > 0 ? simulatedTier.marks : 0.0;
  const pctDiff = Math.round((simulatedPct - sa.attendancePercentage) * 10) / 10;
  const marksDiff = Math.round((simulatedMarks - sa.currentMarks) * 10) / 10;

  // Active percentage & marks (morphs live when dragging What-If sliders)
  const activePct = isSimulating ? simulatedPct : sa.attendancePercentage;
  const activeMarks = isSimulating ? simulatedMarks : sa.currentMarks;
  const activeTier = isSimulating ? simulatedTier : sa.tier;
  const isWarning = activePct < 70;
  const hasNextTier = sa.nextTier && sa.nextTier.classesNeeded > 0;

  // Reactive Black Nebula Aura & Bioluminescent Semantic Accents based on activePct
  const auraConfig =
    activePct >= 90.0
      ? {
          tierName: 'Supernova Tier',
          borderAndShadow:
            'border-emerald-500/40 shadow-[0_0_30px_-5px_rgba(16,185,129,0.28)] hover:border-emerald-400/50 hover:shadow-[0_0_32px_-4px_rgba(16,185,129,0.35)]',
          radialGlow:
            'bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_65%)]',
          badgeClass:
            'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
          gradStart: '#10b981',
          gradEnd: '#06b6d4',
          dropShadow: 'drop-shadow(0 0 6px rgba(16,185,129,0.45))',
          isCritical: false,
        }
      : activePct >= 75.0
      ? {
          tierName: 'Stable Nebula Tier',
          borderAndShadow:
            'border-indigo-500/35 shadow-[0_0_25px_-5px_rgba(99,102,241,0.22)] hover:border-indigo-500/50 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.3)]',
          radialGlow:
            'bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_65%)]',
          badgeClass:
            'bg-indigo-500/10 text-cyan-400 border-indigo-500/30',
          gradStart: '#8b5cf6',
          gradEnd: '#06b6d4',
          dropShadow: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))',
          isCritical: false,
        }
      : activePct >= 70.0
      ? {
          tierName: 'Edge Warning Tier',
          borderAndShadow:
            'border-amber-500/45 shadow-[0_0_28px_-5px_rgba(245,158,11,0.25)] hover:border-indigo-500/40 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.25)]',
          radialGlow:
            'bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_65%)]',
          badgeClass:
            'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          gradStart: '#8b5cf6',
          gradEnd: '#06b6d4',
          dropShadow: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))',
          isCritical: false,
        }
      : {
          tierName: 'Critical Pulsar Tier',
          borderAndShadow:
            'border-rose-500/50 shadow-[0_0_35px_-5px_rgba(244,63,94,0.35)] hover:border-rose-500/65 hover:shadow-[0_0_38px_-5px_rgba(244,63,94,0.45)]',
          radialGlow:
            'bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.18),transparent_65%)]',
          badgeClass:
            'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)] animate-pulse',
          gradStart: '#f43f5e',
          gradEnd: '#8b5cf6',
          dropShadow: 'drop-shadow(0 0 6px rgba(244,63,94,0.5))',
          isCritical: true,
        };

  const notifySimChange = (newAttended: number, newMissed: number) => {
    if (!onSimulationChange) return;
    if (newAttended === 0 && newMissed === 0) {
      onSimulationChange(sa.subject.id, null);
    } else {
      const cond = sa.conductedClasses + newAttended + newMissed;
      const pres = sa.presentClasses + newAttended;
      const pct =
        cond > 0
          ? Math.round(((pres / cond) * 100 + Number.EPSILON) * 10) / 10
          : 0;
      onSimulationChange(sa.subject.id, pct);
    }
  };

  const handleAdjustSim = (attendChange: number, missChange: number) => {
    const newAttended = Math.max(0, simAttendedDelta + attendChange);
    const newMissed = Math.max(0, simMissedDelta + missChange);
    setSimAttendedDelta(newAttended);
    setSimMissedDelta(newMissed);
    notifySimChange(newAttended, newMissed);

    if (missChange > 0) {
      playSound('warning');
    } else {
      playSound('sim');
    }
  };

  const handleSetAttendSlider = (val: number) => {
    setSimAttendedDelta(val);
    notifySimChange(val, simMissedDelta);
  };

  const handleSetMissSlider = (val: number) => {
    setSimMissedDelta(val);
    notifySimChange(simAttendedDelta, val);
  };

  const handleResetSim = () => {
    setSimAttendedDelta(0);
    setSimMissedDelta(0);
    if (onSimulationChange) onSimulationChange(sa.subject.id, null);
    playSound('click');
  };

  const gaugeGradientId = `nebula-gauge-${sa.subject.id}`;

  return (
    <div
      onClick={() => {
        if (onFocusSubject) onFocusSubject(sa.subject.id);
      }}
      className={`bg-[#090a14]/75 backdrop-blur-xl text-white rounded-2xl border ring-1 ring-inset ring-white/[0.05] p-5 transition-all duration-700 ease-out flex flex-col justify-between relative overflow-hidden ${
        onFocusSubject ? 'cursor-pointer' : ''
      } ${auraConfig.borderAndShadow} ${
        isFocused ? 'ring-cyan-400/40' : ''
      }`}
    >
      {/* Internal Top-Right Radial Nebula Glow Overlay */}
      <div
        className={`pointer-events-none absolute inset-0 transition-all duration-700 ease-out ${auraConfig.radialGlow}`}
      />

      <div className="relative z-10">
        {/* Card Header: Subject Code, Name & Marks Badge */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center flex-wrap gap-1.5">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: sa.subject.color }}
              />
              <span className="font-mono tracking-tight font-bold text-sm text-white">
                {sa.subject.code}
              </span>
              <span className="font-mono tracking-tight text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                {sa.subject.credits} Cr
              </span>
              <span
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border transition-all duration-700 ease-out ${auraConfig.badgeClass}`}
              >
                {auraConfig.tierName}
              </span>
              {isFocused && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/15 text-cyan-400 border border-cyan-500/30">
                  Focused
                </span>
              )}
            </div>
            <h4 className="font-display font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent mt-1 line-clamp-1">
              {sa.subject.name}
            </h4>
          </div>

          {/* Awarded Marks Pill */}
          <div
            className={`text-right px-3 py-1 rounded-xl border shrink-0 transition-all duration-700 ease-out ${
              activeTier.bgClass
            } ${activeTier.borderClass} ${auraConfig.isCritical ? 'animate-pulse' : ''}`}
          >
            <div
              className={`font-mono tracking-tight text-lg font-black leading-none transition-colors duration-700 ease-out ${activeTier.colorClass}`}
            >
              {activeMarks.toFixed(1)}
            </div>
            <div className="text-[9px] uppercase font-mono tracking-tight font-bold text-slate-300 mt-0.5">
              {isSimulating
                ? marksDiff !== 0
                  ? `${marksDiff > 0 ? '+' : ''}${marksDiff.toFixed(1)}M Sim`
                  : 'Simulated'
                : 'Marks / 5.0'}
            </div>
          </div>
        </div>

        {/* Live / Simulated Percentage & Progress */}
        <div className="mt-3.5">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono tracking-tight text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent transition-all duration-700 ease-out">
                {activePct}%
              </span>
              {isSimulating && (
                <span
                  className={`text-xs font-mono tracking-tight font-bold px-1.5 py-0.2 rounded-md transition-all duration-300 ${
                    pctDiff >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                  }`}
                >
                  {pctDiff >= 0 ? `+${pctDiff}%` : `${pctDiff}%`}
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium">
                {isSimulating ? 'projected' : 'attendance'}
              </span>
            </div>
            <span
              className={`text-xs font-mono tracking-tight font-semibold px-2 py-0.5 rounded-full border transition-all duration-700 ease-out ${
                activeTier.colorClass
              } ${activeTier.borderClass} ${activeTier.bgClass} ${
                auraConfig.isCritical ? 'animate-pulse' : ''
              }`}
            >
              {activeTier.label}
            </span>
          </div>

          {/* Neon SVG LinearGradient Progress Gauge */}
          <div className="w-full h-3 rounded-full bg-white/[0.04] border border-white/[0.08] p-0.5 overflow-hidden">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id={gaugeGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={auraConfig.gradStart} />
                  <stop offset="100%" stopColor={auraConfig.gradEnd} />
                </linearGradient>
              </defs>
              <rect
                x="0"
                y="0"
                rx="4"
                ry="4"
                height="100%"
                width={`${Math.min(100, activePct)}%`}
                fill={`url(#${gaugeGradientId})`}
                style={{
                  filter: auraConfig.dropShadow,
                  transition: 'width 700ms ease-out',
                }}
              />
            </svg>
          </div>
        </div>

        {/* Stats Grid: Conducted, Present, Absent, Canceled */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-xs py-2 px-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
          <div>
            <div className="text-[10px] text-slate-400 font-medium uppercase">Conducted</div>
            <div className="font-mono tracking-tight font-bold text-white">
              {isSimulating ? simulatedConducted : sa.conductedClasses}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-medium uppercase">
              Present
            </div>
            <div className="font-mono tracking-tight font-bold text-emerald-400">
              {isSimulating ? simulatedPresent : sa.presentClasses}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-rose-400 font-medium uppercase">Absent</div>
            <div className="font-mono tracking-tight font-bold text-rose-400">
              {sa.absentClasses + simMissedDelta}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-medium uppercase">
              Canceled
            </div>
            <div className="font-mono tracking-tight font-bold text-slate-400">
              {sa.canceledClasses}*
            </div>
          </div>
        </div>

        {/* Interactive What-If Simulator Drawer with Live Sliders */}
        <div
          className="mt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {!showSim ? (
            <button
              onClick={() => {
                setShowSim(true);
                playSound('click');
              }}
              className="w-full py-1.5 px-2.5 rounded-xl bg-indigo-500/10 hover:bg-gradient-to-r hover:from-indigo-600 hover:via-purple-600 hover:to-cyan-600 text-cyan-400 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-300 border border-indigo-500/30 hover:shadow-[0_0_20px_rgba(124,58,237,0.35)] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live What-If Aura Simulator</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-[#070812]/90 backdrop-blur-md border border-indigo-500/30 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>What-If Aura Preview</span>
                </span>
                <button
                  onClick={() => {
                    handleResetSim();
                    setShowSim(false);
                  }}
                  className="text-[11px] text-cyan-400 hover:underline font-medium cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Attend Next X Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-medium">
                    Attend next <strong className="font-mono tracking-tight text-white">{simAttendedDelta}</strong> classes
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleAdjustSim(-1, 0)}
                      className="w-5 h-5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 flex items-center justify-center border border-white/[0.08] cursor-pointer"
                      title="Decrease simulated attended"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => handleAdjustSim(1, 0)}
                      className="w-5 h-5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 cursor-pointer"
                      title="Increase simulated attended"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={simAttendedDelta}
                  onChange={(e) => handleSetAttendSlider(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              {/* Skip Next Y Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-rose-400 font-medium">
                    Skip next <strong className="font-mono tracking-tight text-white">{simMissedDelta}</strong> classes
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleAdjustSim(0, -1)}
                      className="w-5 h-5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 flex items-center justify-center border border-white/[0.08] cursor-pointer"
                      title="Decrease simulated skips"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => handleAdjustSim(0, 1)}
                      className="w-5 h-5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 cursor-pointer"
                      title="Increase simulated skips"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={simMissedDelta}
                  onChange={(e) => handleSetMissSlider(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-rose-400"
                />
              </div>

              {/* Simulation Verdict Feedback */}
              {isSimulating && (
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                  <div className="text-slate-300">
                    Aura:{' '}
                    <strong className={`font-mono tracking-tight ${activeTier.colorClass}`}>
                      {auraConfig.tierName} ({activeMarks.toFixed(1)}M)
                    </strong>
                  </div>
                  <button
                    onClick={handleResetSim}
                    className="flex items-center space-x-1 text-slate-300 hover:text-white font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Regular Status Advice: Bunk Runway or Recovery Action */}
        <div className="mt-2.5">
          {isWarning ? (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)] text-rose-200 text-xs transition-all duration-700 ease-out">
              <div className="flex items-center space-x-1.5 font-semibold text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                <span>Urgent Recovery Needed:</span>
              </div>
              <p className="mt-1 text-[11px] text-rose-100">
                Must attend next{' '}
                <strong className="font-mono tracking-tight underline text-white">
                  {sa.recoveryClassesNeeded}
                </strong>{' '}
                consecutive classes to hit 75% target.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-slate-200 text-xs transition-all duration-700 ease-out">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Safe Bunk Runway:</span>
                </span>
                <span className="font-bold text-emerald-400 text-xs font-mono tracking-tight">
                  {sa.safeSkipsRemaining} skips
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-300">
                <span>Can skip right now:</span>
                <span className="font-mono tracking-tight font-bold text-white">
                  {sa.immediateBunksAllowed} consecutive
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Next Tier Upgrade Opportunity */}
        {hasNextTier && (
          <div className="mt-2 text-[11px] text-slate-300 flex items-center justify-between px-1">
            <span className="flex items-center text-cyan-400 font-semibold font-mono tracking-tight">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              Next: {sa.nextTier?.marks.toFixed(1)}M ({sa.nextTier?.targetPercentage}%)
            </span>
            <span className="font-mono tracking-tight text-slate-200">
              +{sa.nextTier?.classesNeeded} classes
            </span>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="relative z-10 mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs">
        <span className="text-[10px] text-slate-400 font-mono tracking-tight">
          {sa.remainingScheduledClasses} left in semester
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            playSound('click');
            onOpenPredictor(sa.subject.id);
          }}
          className="font-semibold text-cyan-400 hover:text-indigo-300 flex items-center space-x-1 group cursor-pointer"
        >
          <span>Deep Forecast</span>
          <ArrowUpRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
};


