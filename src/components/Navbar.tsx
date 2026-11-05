import React from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  CheckCircle2,
  TrendingUp,
  FileText,
  Database,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Flame,
  CalendarOff,
  Trophy,
  Volume2,
  VolumeX,
  Keyboard,
} from 'lucide-react';
import { OverallAnalytics, AttendanceStreakData } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'logger'
  | 'routine'
  | 'predictor'
  | 'calendar'
  | 'gamification'
  | 'reports'
  | 'architecture';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  overall: OverallAnalytics;
  onResetDemo: () => void;
  selectedDate: string;
  streakData?: AttendanceStreakData;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenShortcuts?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  overall,
  onResetDemo,
  streakData,
  soundEnabled = true,
  onToggleSound,
  onOpenShortcuts,
}) => {
  const tabs: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeText?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard & Analytics', icon: LayoutDashboard },
    { id: 'logger', label: 'Daily Logger', icon: CheckCircle2 },
    { id: 'routine', label: 'Routine & Timetable', icon: CalendarDays },
    { id: 'predictor', label: 'Bunk & Recovery', icon: TrendingUp },
    { id: 'calendar', label: 'Exclusion Calendar', icon: CalendarOff },
    {
      id: 'gamification',
      label: 'Streaks & Badges',
      icon: Trophy,
      badgeText: streakData?.currentDayStreak ? `${streakData.currentDayStreak}d` : undefined,
    },
    { id: 'reports', label: 'Monthly Reports', icon: FileText },
    { id: 'architecture', label: 'Architecture & Schema', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#090a14]/75 backdrop-blur-xl border-b border-white/[0.07] ring-1 ring-inset ring-white/[0.05] text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] transition hover:scale-105">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex items-center space-x-2.5">
              <span className="font-display font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                AttendIQ
              </span>
              <span className="text-slate-600 font-semibold">•</span>
              <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                M.Mahin
              </span>
            </div>
          </div>

          {/* Real-time Overall Score, Sound, Shortcuts & Streak Badge */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {streakData && (
              <button
                onClick={() => setActiveTab('gamification')}
                className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#090a14]/75 backdrop-blur-xl border border-indigo-500/30 ring-1 ring-inset ring-white/[0.05] hover:border-cyan-500/40 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.25)] transition-all duration-300 cursor-pointer"
                title="View Attendance Streaks and Badges"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center text-cyan-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-mono tracking-tight text-[11px] font-bold text-cyan-400 leading-none">
                    {streakData.currentDayStreak}d Streak
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    {streakData.levelTitle}
                  </div>
                </div>
              </button>
            )}

            <div className="hidden md:flex items-center space-x-3 px-3.5 py-1.5 rounded-xl bg-[#090a14]/75 backdrop-blur-xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Semester GPA Marks
                </div>
                <div className="text-sm font-bold text-emerald-400 flex items-center justify-end space-x-1 font-mono tracking-tight">
                  <span className="font-mono tracking-tight font-bold text-base text-emerald-400">
                    {overall.gpaMarks.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">/ 5.00</span>
                </div>
              </div>
              <div className="h-7 w-[1px] bg-white/[0.08]" />
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Overall Attd.
                </div>
                <div className="text-base font-bold text-white font-mono tracking-tight">
                  {overall.overallPercentage.toFixed(1)}%
                </div>
              </div>
              {overall.warningSubjectsCount > 0 && (
                <div className="flex items-center text-rose-400 text-xs font-mono tracking-tight font-semibold pl-1">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  <span>{overall.warningSubjectsCount} at risk</span>
                </div>
              )}
            </div>

            {/* Interactive Audio Toggle */}
            {onToggleSound && (
              <button
                onClick={onToggleSound}
                title={soundEnabled ? 'Mute Sound Effects (M)' : 'Enable Sound Effects (M)'}
                className={`p-2 rounded-xl border text-xs transition-all duration-300 flex items-center justify-center cursor-pointer ${
                  soundEnabled
                    ? 'bg-[#090a14]/75 backdrop-blur-xl text-cyan-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'bg-[#090a14]/75 backdrop-blur-xl text-slate-500 border-white/[0.07]'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}

            {/* Keyboard Shortcuts Trigger */}
            {onOpenShortcuts && (
              <button
                onClick={onOpenShortcuts}
                title="Keyboard Shortcuts (?)"
                className="hidden sm:flex p-2 rounded-xl bg-[#090a14]/75 backdrop-blur-xl hover:border-indigo-500/30 text-slate-300 hover:text-white border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] transition-all duration-300 items-center justify-center cursor-pointer"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* Demo Reset Button */}
            <button
              id="btn-reset-demo"
              onClick={onResetDemo}
              title="Reset attendance counts to 0"
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#090a14]/75 backdrop-blur-xl hover:border-indigo-500/30 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] transition-all duration-300 flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-1.5 border-t border-white/[0.07]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badgeText && (
                  <span
                    className={`text-[10px] font-mono tracking-tight font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-500/10 text-cyan-400 border border-indigo-500/30'
                    }`}
                  >
                    {tab.badgeText}
                  </span>
                )}
                {tab.id === 'architecture' && (
                  <Sparkles className="w-3 h-3 text-cyan-400 hidden sm:inline" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

