import React, { useState, useEffect } from 'react';
import { SubjectAnalytics, Subject } from '../types';
import {
  calculateSafeSkipsRemaining,
  calculateImmediateBunks,
  calculateRecoveryClasses,
  getMarksTier,
  MARKS_TIERS,
} from '../utils/marksEngine';
import {
  ShieldCheck,
  AlertTriangle,
  Zap,
  TrendingUp,
  Target,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  CalendarCheck,
  Award,
} from 'lucide-react';

interface BunkPredictorViewProps {
  analyticsList: SubjectAnalytics[];
  initialSubjectId?: string;
}

export const BunkPredictorView: React.FC<BunkPredictorViewProps> = ({
  analyticsList,
  initialSubjectId,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId) return initialSubjectId;
    try {
      const saved = localStorage.getItem('attendiq_predictor_subject');
      if (saved && analyticsList.some((sa) => sa.subject.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return analyticsList[0]?.subject.id || '';
  });

  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    }
  }, [initialSubjectId]);

  useEffect(() => {
    try {
      if (selectedSubjectId) {
        localStorage.setItem('attendiq_predictor_subject', selectedSubjectId);
      }
    } catch {
      // ignore
    }
  }, [selectedSubjectId]);

  const [targetPercentage, setTargetPercentage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('attendiq_target_pct');
      return saved ? Number(saved) : 75;
    } catch {
      return 75;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_target_pct', String(targetPercentage));
    } catch {
      // ignore
    }
  }, [targetPercentage]);

  // What-If Simulator inputs
  const [simExtraAttend, setSimExtraAttend] = useState<number>(0);
  const [simExtraBunk, setSimExtraBunk] = useState<number>(0);

  const currentAnalytics =
    analyticsList.find((sa) => sa.subject.id === selectedSubjectId) || analyticsList[0];

  if (!currentAnalytics) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active subjects found. Please add subjects in the Routine tab.
      </div>
    );
  }

  const {
    subject,
    conductedClasses,
    presentClasses,
    absentClasses,
    canceledClasses,
    attendancePercentage,
    remainingScheduledClasses,
  } = currentAnalytics;

  // Compute metrics for the chosen target percentage
  const safeSkips = calculateSafeSkipsRemaining(
    presentClasses,
    conductedClasses,
    remainingScheduledClasses,
    targetPercentage
  );

  const immediateBunks = calculateImmediateBunks(
    presentClasses,
    conductedClasses,
    targetPercentage
  );

  const recoveryNeeded = calculateRecoveryClasses(
    presentClasses,
    conductedClasses,
    targetPercentage
  );

  const targetTier = getMarksTier(targetPercentage);

  // What-If Sandbox calculations
  const simNewConducted = conductedClasses + simExtraAttend + simExtraBunk;
  const simNewPresent = presentClasses + simExtraAttend;
  const simNewPercentage =
    simNewConducted > 0
      ? Math.round(((simNewPresent / simNewConducted) * 100 + Number.EPSILON) * 10) / 10
      : 0;
  const simNewTier =
    simNewConducted > 0 ? getMarksTier(simNewPercentage) : currentAnalytics.tier;
  const simNewMarks = simNewConducted > 0 ? simNewTier.marks : 0.0;
  const pctDelta = Math.round((simNewPercentage - attendancePercentage) * 10) / 10;
  const marksDelta = Math.round((simNewMarks - currentAnalytics.currentMarks) * 10) / 10;

  const targetOptions = [
    { pct: 70, label: '70% (3.0 Marks)', desc: 'Minimum Pass Threshold' },
    { pct: 75, label: '75% (3.5 Marks)', desc: 'Standard University Target' },
    { pct: 80, label: '80% (4.0 Marks)', desc: 'Very Good Performance' },
    { pct: 85, label: '85% (4.5 Marks)', desc: 'Honors Grade Standing' },
    { pct: 90, label: '90% (5.0 Marks)', desc: 'Max Academic Marks' },
  ];

  return (
    <div className="space-y-6">
      {/* Subject & Target Control Header */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Bunk (Skip) & Recovery Predictive Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculate mathematically verified allowable bunks and consecutive recovery plans based on remaining routine classes.
            </p>
          </div>

          {/* Subject Switcher Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {analyticsList.map((sa) => (
              <button
                key={sa.subject.id}
                onClick={() => {
                  setSelectedSubjectId(sa.subject.id);
                  setSimExtraAttend(0);
                  setSimExtraBunk(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-tight font-semibold whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 ${
                  sa.subject.id === currentAnalytics.subject.id
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                    : 'bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: sa.subject.color }}
                />
                <span>{sa.subject.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Subject Banner & Target Tier Selector */}
        <div className="mt-5 pt-4 border-t border-white/[0.07] grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <span className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                <span className="font-mono tracking-tight">{subject.code}</span>: {subject.name}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Current: <strong className="font-mono tracking-tight text-white">{attendancePercentage}%</strong> (<span className="font-mono tracking-tight text-indigo-300">{currentAnalytics.currentMarks.toFixed(1)}M</span>) • <span className="font-mono tracking-tight">{conductedClasses}</span> conducted (<span className="font-mono tracking-tight text-emerald-400">{presentClasses} P</span>, <span className="font-mono tracking-tight text-rose-400">{absentClasses} A</span>, <span className="font-mono tracking-tight text-slate-400">{canceledClasses} Canceled Excluded</span>)
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Attendance Goal / Target Mark Tier:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {targetOptions.map((opt) => (
                <button
                  key={opt.pct}
                  onClick={() => setTargetPercentage(opt.pct)}
                  className={`p-2 rounded-xl border text-center transition-all duration-300 ${
                    targetPercentage === opt.pct
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white border-transparent shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                      : 'bg-white/[0.03] border-white/[0.08] hover:border-indigo-500/40 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-mono tracking-tight font-bold">{opt.pct}%</div>
                  <div className="text-[10px] font-mono tracking-tight font-medium opacity-85">{opt.label.split(' ')[1]} Marks</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dual Predictor Metric Cards: Safe Bunks & Recovery Calculation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Safe Skip Prediction */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-emerald-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-emerald-500/50 hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)] transition-all duration-300 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Safe Skip Runway for <span className="font-mono tracking-tight">{targetPercentage}%</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Target Mark: <strong className="font-mono tracking-tight text-emerald-400">{targetTier.label}</strong>
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-lg font-mono tracking-tight font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {remainingScheduledClasses} Classes Left
            </span>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-mono tracking-tight font-black text-emerald-400">
                {safeSkips}
              </span>
              <span className="text-sm font-semibold text-slate-200">
                allowable skips in semester
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Out of the remaining <strong className="font-mono tracking-tight text-white">{remainingScheduledClasses}</strong> scheduled classes, you can safely skip up to <strong className="font-mono tracking-tight text-emerald-400">{safeSkips}</strong> class(es) and attend at least <strong className="font-mono tracking-tight text-cyan-400">{Math.max(0, remainingScheduledClasses - safeSkips)}</strong> class(es) to finish the semester at or above <strong className="font-mono tracking-tight text-white">{targetPercentage}%</strong>.
            </p>
          </div>

          <div className="mt-4 space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <span className="font-medium">Immediate consecutive bunks starting today:</span>
              <span className="font-mono tracking-tight font-bold text-white text-sm">
                {immediateBunks} classes
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <span>Final projected score if using all bunks:</span>
              <span className="font-mono tracking-tight font-semibold text-emerald-400">
                ≥ {targetPercentage}.0% ({targetTier.label})
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Recovery Action Engine */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-rose-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-rose-500/50 hover:shadow-[0_0_25px_-5px_rgba(244,63,94,0.25)] transition-all duration-300 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)] flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Consecutive Recovery Plan
                </h4>
                <p className="text-xs text-slate-400">
                  Deficit resolution for <span className="font-mono tracking-tight text-white">{targetPercentage}%</span> threshold
                </p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-lg font-mono tracking-tight font-semibold border ${
                recoveryNeeded === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : recoveryNeeded <= remainingScheduledClasses
                  ? 'bg-indigo-500/10 text-cyan-400 border-indigo-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              }`}
            >
              {recoveryNeeded === 0 ? 'Target Satisfied' : 'Action Required'}
            </span>
          </div>

          <div
            className={`mt-4 p-4 rounded-xl border ${
              recoveryNeeded === 0
                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
            }`}
          >
            {recoveryNeeded === 0 ? (
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-lg">
                  <ShieldCheck className="w-6 h-6" />
                  <span>
                    Already At or Above Target (<span className="font-mono tracking-tight">{attendancePercentage}%</span>)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  No recovery deficit. You currently hold <span className="font-mono tracking-tight font-bold text-emerald-400">{currentAnalytics.currentMarks.toFixed(1)}</span> marks in this course.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-mono tracking-tight font-black text-rose-400">
                    {recoveryNeeded}
                  </span>
                  <span className="text-sm font-semibold text-slate-200">
                    consecutive classes required
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  You must attend the next <strong className="font-mono tracking-tight text-rose-400">{recoveryNeeded}</strong> upcoming classes consecutively (with 0 absences) to raise your attendance to <strong className="font-mono tracking-tight text-white">{targetPercentage}%</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <span>Feasibility vs Remaining Schedule:</span>
              <span
                className={`font-mono tracking-tight font-semibold ${
                  recoveryNeeded <= remainingScheduledClasses
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {recoveryNeeded === 0
                  ? 'Safe'
                  : recoveryNeeded <= remainingScheduledClasses
                  ? `Feasible (${remainingScheduledClasses} left)`
                  : `Impossible in regular routine (${recoveryNeeded} needed > ${remainingScheduledClasses} left)`}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <span>Mark payoff upon recovery:</span>
              <span className="font-mono tracking-tight font-bold text-cyan-400">
                {targetTier.label} (+{(targetTier.marks - currentAnalytics.currentMarks).toFixed(1)} Mark gain)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive What-If Scenario Sandbox */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-bold text-sm flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Interactive "What-If" Bunk & Attendance Sandbox
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate upcoming choices before deciding whether to attend or bunk your next lectures.
            </p>
          </div>
          <button
            onClick={() => {
              setSimExtraAttend(0);
              setSimExtraBunk(0);
            }}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:border-indigo-500/30 transition"
          >
            Reset Simulation
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Attend next upcoming classes:</span>
                <span className="font-mono tracking-tight font-bold text-emerald-400 text-sm">+{simExtraAttend}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(25, remainingScheduledClasses)}
                value={simExtraAttend}
                onChange={(e) => setSimExtraAttend(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono tracking-tight text-slate-500">
                <span>0 classes</span>
                <span>{Math.min(25, remainingScheduledClasses)} classes</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Bunk / Skip next upcoming classes:</span>
                <span className="font-mono tracking-tight font-bold text-rose-400 text-sm">+{simExtraBunk}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(15, remainingScheduledClasses)}
                value={simExtraBunk}
                onChange={(e) => setSimExtraBunk(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono tracking-tight text-slate-500">
                <span>0 skips</span>
                <span>{Math.min(15, remainingScheduledClasses)} skips</span>
              </div>
            </div>

            <div className="p-3 bg-white/[0.03] rounded-xl text-xs text-slate-400 border border-white/[0.07] flex items-start space-x-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Simulates adding <strong className="font-mono tracking-tight text-emerald-400">{simExtraAttend}</strong> attended and <strong className="font-mono tracking-tight text-rose-400">{simExtraBunk}</strong> absent classes to <strong className="font-mono tracking-tight text-white">{subject.code}</strong>.
              </span>
            </div>
          </div>

          {/* Real-time Projected Outcome Panel */}
          <div className="bg-[#070812]/90 backdrop-blur-md text-white rounded-2xl p-5 border border-indigo-500/30 shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>Projected Outcome</span>
              <span className="font-mono tracking-tight text-cyan-400">
                {simExtraAttend + simExtraBunk > 0 ? 'Simulated' : 'Current Baseline'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Current Standing</div>
                <div className="text-xl font-mono tracking-tight font-bold text-slate-200">
                  {attendancePercentage}%
                </div>
                <div className="text-xs font-mono tracking-tight text-slate-400">
                  {currentAnalytics.currentMarks.toFixed(1)} Marks
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-indigo-400" />

              <div className="text-right">
                <div className="text-[11px] text-slate-400">Simulated Result</div>
                <div className="text-2xl font-mono tracking-tight font-extrabold text-white flex items-center justify-end space-x-1.5">
                  <span>{Math.round(simNewPercentage * 10) / 10}%</span>
                  <span
                    className={`text-xs font-mono tracking-tight font-semibold ${
                      pctDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    ({pctDelta >= 0 ? `+${pctDelta}` : pctDelta}%)
                  </span>
                </div>
                <div className={`text-xs font-mono tracking-tight font-bold ${simNewTier.colorClass}`}>
                  {simNewTier.label} ({marksDelta >= 0 ? `+${marksDelta}` : marksDelta})
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs">
              <span className="text-slate-400">Tier Status:</span>
              <span
                className={`font-semibold ${
                  simNewPercentage >= 90
                    ? 'text-emerald-400'
                    : simNewPercentage >= 70
                    ? 'text-cyan-400'
                    : 'text-rose-400'
                }`}
              >
                {simNewTier.gradeDescription}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
