import React, { useState } from 'react';
import {
  AttendanceStreakData,
  AttendanceBadge,
  BadgeCategory,
  OverallAnalytics,
} from '../types';
import {
  Flame,
  Zap,
  Trophy,
  Award,
  Crown,
  Star,
  CheckCircle2,
  Lock,
  Sparkles,
  Shield,
  GraduationCap,
  Calendar,
  Slash,
  ShieldCheck,
  TrendingUp,
  Target,
  ArrowRight,
} from 'lucide-react';

interface GamificationViewProps {
  streakData: AttendanceStreakData;
  overall: OverallAnalytics;
  onOpenLogger: () => void;
  onOpenCalendar: () => void;
}

export const GamificationView: React.FC<GamificationViewProps> = ({
  streakData,
  overall,
  onOpenLogger,
  onOpenCalendar,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | BadgeCategory>('all');
  const [selectedBadge, setSelectedBadge] = useState<AttendanceBadge | null>(null);

  const filteredBadges = streakData.badges.filter((b) => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  const unlockedCount = streakData.badges.filter((b) => b.isUnlocked).length;
  const totalBadges = streakData.badges.length;

  // Icon mapping
  const renderBadgeIcon = (iconName: string, className = 'w-6 h-6') => {
    switch (iconName) {
      case 'Flame':
        return <Flame className={className} />;
      case 'Zap':
        return <Zap className={className} />;
      case 'Trophy':
        return <Trophy className={className} />;
      case 'Shield':
        return <Shield className={className} />;
      case 'Award':
        return <Award className={className} />;
      case 'Star':
        return <Star className={className} />;
      case 'GraduationCap':
        return <GraduationCap className={className} />;
      case 'Slash':
        return <Slash className={className} />;
      case 'Calendar':
        return <Calendar className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Crown':
        return <Crown className={className} />;
      default:
        return <CheckCircle2 className={className} />;
    }
  };

  const getTierStyles = (tier: 'bronze' | 'silver' | 'gold' | 'platinum', isUnlocked: boolean) => {
    if (!isUnlocked) {
      return {
        card: 'bg-[#090a14]/50 backdrop-blur-xl border-white/[0.05] opacity-65',
        iconBg: 'bg-white/[0.04] border border-white/[0.08] text-slate-500',
        badgePill: 'bg-white/[0.04] border border-white/[0.08] text-slate-400',
        bar: 'bg-slate-700',
      };
    }

    switch (tier) {
      case 'platinum':
        return {
          card: 'bg-[#090a14]/80 backdrop-blur-xl border-indigo-500/40 shadow-[0_0_25px_-5px_rgba(139,92,246,0.28)] ring-1 ring-inset ring-white/[0.06]',
          iconBg: 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]',
          badgePill: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
          bar: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400',
        };
      case 'gold':
        return {
          card: 'bg-[#090a14]/80 backdrop-blur-xl border-emerald-500/35 shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)] ring-1 ring-inset ring-white/[0.06]',
          iconBg: 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
          badgePill: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
          bar: 'bg-gradient-to-r from-emerald-500 to-cyan-400',
        };
      case 'silver':
        return {
          card: 'bg-[#090a14]/80 backdrop-blur-xl border-cyan-500/30 shadow-[0_0_25px_-5px_rgba(6,182,212,0.22)] ring-1 ring-inset ring-white/[0.06]',
          iconBg: 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400',
          badgePill: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
          bar: 'bg-gradient-to-r from-cyan-500 to-indigo-500',
        };
      default: // bronze
        return {
          card: 'bg-[#090a14]/75 backdrop-blur-xl border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05]',
          iconBg: 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400',
          badgePill: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
          bar: 'bg-indigo-500',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Gamification & Streak Banner */}
      <div className="bg-[#090a14]/80 backdrop-blur-xl text-white rounded-2xl p-6 sm:p-7 border border-indigo-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.06] relative overflow-hidden">
        {/* Background decorative radial highlight */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Streak Flame Spotlight */}
          <div className="flex items-start space-x-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_25px_rgba(124,58,237,0.4)] shrink-0">
                <Flame className="w-9 h-9 sm:w-11 sm:h-11 animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[#030308] text-emerald-400 text-[10px] font-mono tracking-tight font-extrabold border border-emerald-500/40">
                ACTIVE
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">
                  Continuous Attendance Streak
                </span>
                <span className="text-[10px] font-mono tracking-tight px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {streakData.levelTitle}
                </span>
              </div>

              <div className="mt-1 flex items-baseline space-x-2">
                <span className="text-4xl sm:text-5xl font-mono tracking-tight font-black text-white">
                  {streakData.currentDayStreak}
                </span>
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Days Without Missing a Class
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Every attended lecture reinforces your academic momentum. Excluded holidays and exam weeks pause your class count without breaking this streak!
              </p>
            </div>
          </div>

          {/* Right: XP, Level & Quick Action */}
          <div className="lg:w-72 bg-[#070812]/90 backdrop-blur-md rounded-2xl p-4 border border-indigo-500/30 shadow-2xl shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Level <span className="font-mono tracking-tight">{streakData.level}</span>: {streakData.levelTitle}</span>
              </span>
              <span className="font-mono tracking-tight font-bold text-emerald-400">{streakData.totalXp} XP</span>
            </div>

            <div className="mt-2.5 w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (streakData.totalXp / streakData.nextLevelXp) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-mono tracking-tight text-slate-400">
              <span>Next Level: {streakData.nextLevelXp} XP</span>
              <span>{Math.max(0, streakData.nextLevelXp - streakData.totalXp)} XP needed</span>
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.07] flex items-center justify-between">
              <div className="text-[11px] text-slate-300">
                <strong className="font-mono tracking-tight text-white">{unlockedCount}</strong> of <span className="font-mono tracking-tight">{totalBadges}</span> Badges
              </div>
              <button
                onClick={onOpenLogger}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] text-[11px] font-semibold flex items-center space-x-1 transition"
              >
                <span>Log Today</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Mini Streak Metrics Bar */}
        <div className="mt-6 pt-5 border-t border-white/[0.07] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-medium">All-Time Longest</div>
            <div className="text-xl font-mono tracking-tight font-bold text-cyan-400 mt-0.5">
              {streakData.longestDayStreak} Days
            </div>
            <div className="text-[10px] text-slate-500">Best semester streak</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 uppercase font-medium">Class Sessions</div>
            <div className="text-xl font-mono tracking-tight font-bold text-indigo-300 mt-0.5">
              {streakData.currentClassStreak} Lectures
            </div>
            <div className="text-[10px] text-slate-500">Consecutive classes present</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 uppercase font-medium">Flawless Weeks</div>
            <div className="text-xl font-mono tracking-tight font-bold text-emerald-400 mt-0.5">
              {streakData.flawlessWeeksCount} Weeks
            </div>
            <div className="text-[10px] text-slate-500">0 absences Sun-Thu</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 uppercase font-medium">GPA Marks</div>
            <div className="text-xl font-mono tracking-tight font-bold text-white mt-0.5">
              {overall.gpaMarks.toFixed(2)} / 5.0
            </div>
            <div className="text-[10px] text-slate-500">Current institutional score</div>
          </div>
        </div>
      </div>

      {/* Streak Timeline / Heatmap Bar */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Recent Class Days Attendance Timeline
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Active academic days with conducted classes. Emerald flame indicates 100% attendance with zero absences.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span>Flawless Day</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span>Absence</span>
            </span>
          </div>
        </div>

        {streakData.recentActiveDays.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No class days logged yet. Log scheduled classes in the Daily Logger to ignite your streak!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {streakData.recentActiveDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col justify-between ${
                  day.isFlawless
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                }`}
              >
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {day.dayName.slice(0, 3)}
                  </div>
                  <div className="text-xs font-mono tracking-tight font-semibold text-white mt-0.5">
                    {day.date.slice(5)}
                  </div>
                </div>

                <div className="my-2 flex justify-center">
                  {day.isFlawless ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-xs font-mono tracking-tight font-bold">
                      {day.absentCount}A
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-mono tracking-tight font-semibold text-slate-300">
                  {day.presentCount} Attended
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Attendance Badges & Achievement Showcase
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Unlock motivational honors by maintaining streaks, acing academic marks, and auditing exclusions.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: 'all', label: 'All Badges' },
                { id: 'streak', label: 'Streaks' },
                { id: 'achievement', label: 'Milestones' },
                { id: 'mastery', label: 'Marks Mastery' },
                { id: 'discipline', label: 'Discipline' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                    : 'bg-[#090a14]/75 text-slate-300 hover:text-white border border-white/[0.08] hover:border-indigo-500/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Badges Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBadges.map((badge) => {
            const styles = getTierStyles(badge.tier, badge.isUnlocked);
            const progressPct = Math.round((badge.progress / badge.maxProgress) * 100);

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`rounded-2xl p-5 border transition-all duration-300 cursor-pointer hover:border-indigo-500/40 ${styles.card}`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
                    {badge.isUnlocked ? (
                      renderBadgeIcon(badge.icon, 'w-6 h-6')
                    ) : (
                      <Lock className="w-5 h-5 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono tracking-tight font-bold uppercase px-2 py-0.5 rounded-full ${styles.badgePill}`}>
                        {badge.tier} • +{badge.rewardXp} XP
                      </span>
                      {badge.isUnlocked && (
                        <span className="text-emerald-400 text-xs font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Unlocked</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-white mt-1 truncate">
                      {badge.title}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {badge.subtitle}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-300 line-clamp-2">
                  {badge.description}
                </p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-mono tracking-tight font-medium text-slate-400 mb-1">
                    <span>Progress:</span>
                    <span>
                      {badge.progress} / {badge.maxProgress} ({progressPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                      style={{ width: `${Math.min(100, progressPct)}%` }}
                    />
                  </div>
                </div>

                {badge.unlockedAt && (
                  <div className="mt-3 text-[10px] font-mono tracking-tight text-slate-400 flex items-center justify-between">
                    <span>Earned: {badge.unlockedAt}</span>
                    <span className="text-cyan-400 font-semibold">Verified</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Motivational Rules Callout */}
      <div className="p-5 rounded-2xl bg-[#090a14]/75 backdrop-blur-xl text-white border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05]">
        <h4 className="font-bold text-sm flex items-center space-x-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            Rules of the Streak & Gamification Engine
          </span>
        </h4>
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <span className="font-bold text-white block mb-1">1. Routine-Aware Counting</span>
            Streaks increment exclusively on scheduled class days. Free days with no timetable classes do not break your streak.
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <span className="font-bold text-white block mb-1">2. Holiday & Exam Protection</span>
            Dates marked in the Exclusion Calendar automatically pause attendance counting. Zero penalty is applied to streaks.
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <span className="font-bold text-white block mb-1">3. Canceled Classes Shield</span>
            Canceled lectures are excluded from conducted classes and never reset your continuous attendance record.
          </div>
        </div>
      </div>

      {/* Modal Dialog: Badge Detail */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#090a14]/90 backdrop-blur-xl rounded-2xl max-w-sm w-full border border-white/[0.1] ring-1 ring-inset ring-white/[0.06] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-[0_0_25px_rgba(124,58,237,0.4)] mb-3">
              {renderBadgeIcon(selectedBadge.icon, 'w-8 h-8')}
            </div>

            <span className="text-[11px] font-mono tracking-tight uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-cyan-300 border border-indigo-500/30">
              {selectedBadge.tier} Tier • +{selectedBadge.rewardXp} XP
            </span>

            <h3 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent mt-2">
              {selectedBadge.title}
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {selectedBadge.subtitle}
            </p>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {selectedBadge.description}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Progress:</span>
                <span className="font-mono tracking-tight font-bold text-white">
                  {selectedBadge.progress} / {selectedBadge.maxProgress}
                </span>
              </div>
              <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-full rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (selectedBadge.progress / selectedBadge.maxProgress) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] text-xs font-semibold transition"
            >
              Close Achievement
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
