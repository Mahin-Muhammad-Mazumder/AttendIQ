import React, { useState, useMemo, useEffect } from 'react';
import {
  SubjectAnalytics,
  OverallAnalytics,
  SemesterConfig,
  AttendanceRecord,
  AttendanceStreakData,
  AcademicExclusion,
  Subject,
  TimetableSlot,
} from '../types';
import { MARKS_TIERS, getMarksTier } from '../utils/marksEngine';
import {
  getSlotsForDate,
  formatDate,
  formatFriendlyDate,
  getExclusionForDate,
} from '../utils/timetableProjections';
import { TodayScheduleDock } from './TodayScheduleDock';
import { InteractiveSubjectCard } from './InteractiveSubjectCard';
import {
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Slash,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  Flame,
  CalendarOff,
  Trophy,
  Sparkles,
  Search,
  Filter,
  Lightbulb,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  analyticsList: SubjectAnalytics[];
  overall: OverallAnalytics;
  semester: SemesterConfig;
  records: AttendanceRecord[];
  onOpenLogger: () => void;
  onOpenPredictor: (subjectId?: string) => void;
  streakData?: AttendanceStreakData;
  exclusions?: AcademicExclusion[];
  onOpenGamification?: () => void;
  onOpenCalendar?: () => void;
  subjects?: Subject[];
  timetable?: TimetableSlot[];
  currentDate?: string;
  onDateChange?: (date: string) => void;
  onUpdateRecord?: (record: AttendanceRecord) => void;
  onRemoveRecord?: (recordId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analyticsList,
  overall,
  semester,
  records,
  onOpenLogger,
  onOpenPredictor,
  streakData,
  exclusions = [],
  onOpenGamification,
  onOpenCalendar,
  subjects = [],
  timetable = [],
  currentDate = '2026-09-10',
  onDateChange,
  onUpdateRecord,
  onRemoveRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'warning' | 'safe' | 'today'>('all');

  // Track live What-If simulator percentage overrides per subject so the room lighting & nebula react in real time
  const [simulatedOverrides, setSimulatedOverrides] = useState<Record<string, number>>({});

  const handleSimulationChange = (subjectId: string, simulatedPct: number | null) => {
    setSimulatedOverrides((prev) => {
      if (simulatedPct === null) {
        if (!(subjectId in prev)) return prev;
        const next = { ...prev };
        delete next[subjectId];
        return next;
      }
      return { ...prev, [subjectId]: simulatedPct };
    });
  };

  // Ambient Nebula state: reacts to both live attendance and active What-If slider previews
  const anyCourseCriticalRisk = useMemo(() => {
    return analyticsList.some((sa) => {
      const pct = simulatedOverrides[sa.subject.id] ?? sa.attendancePercentage;
      return pct < 70;
    });
  }, [analyticsList, simulatedOverrides]);

  const allCoursesSereneAurora = useMemo(() => {
    return (
      analyticsList.length > 0 &&
      analyticsList.every((sa) => {
        const pct = simulatedOverrides[sa.subject.id] ?? sa.attendancePercentage;
        return pct >= 85;
      })
    );
  }, [analyticsList, simulatedOverrides]);

  // Currently focused subject for the 30-day attendance trend LineChart
  const [focusedSubjectId, setFocusedSubjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('attendiq_focused_subject_id');
      if (saved && analyticsList.some((sa) => sa.subject.id === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return analyticsList[0]?.subject.id || '';
  });

  useEffect(() => {
    if (
      analyticsList.length > 0 &&
      !analyticsList.some((sa) => sa.subject.id === focusedSubjectId)
    ) {
      setFocusedSubjectId(analyticsList[0].subject.id);
    }
  }, [analyticsList, focusedSubjectId]);

  useEffect(() => {
    try {
      if (focusedSubjectId) {
        localStorage.setItem('attendiq_focused_subject_id', focusedSubjectId);
      }
    } catch {
      // ignore
    }
  }, [focusedSubjectId]);

  const focusedAnalytics =
    analyticsList.find((sa) => sa.subject.id === focusedSubjectId) || analyticsList[0];

  // Compute 30-day attendance percentage trend for the currently focused subject
  const subjectLast30DaysTrend = useMemo(() => {
    if (!focusedAnalytics) return [];
    const targetSubId = focusedAnalytics.subject.id;

    // Filter & deduplicate records for the focused subject
    const subRecords = records.filter(
      (r) =>
        r.subjectId === targetSubId &&
        (r.status === 'present' || r.status === 'absent' || r.status === 'canceled') &&
        (!semester.startDate || r.date >= semester.startDate) &&
        (!semester.endDate || r.date <= semester.endDate)
    );

    const dedupedMap = new Map<string, AttendanceRecord>();
    for (const r of subRecords) {
      const key = r.timetableSlotId
        ? `${r.date}__slot__${r.timetableSlotId}`
        : `${r.date}__id__${r.id}`;
      const existing = dedupedMap.get(key);
      if (!existing || (r.timestamp || 0) >= (existing.timestamp || 0)) {
        dedupedMap.set(key, r);
      }
    }
    const cleanSubRecords = Array.from(dedupedMap.values());

    // Determine the 30-day window ending on currentDate (clamped to semester range)
    let endDateStr = currentDate || '2026-09-10';
    if (semester.endDate && endDateStr > semester.endDate) {
      endDateStr = semester.endDate;
    }
    if (semester.startDate && endDateStr < semester.startDate) {
      endDateStr = semester.startDate;
    }

    const endDt = new Date(endDateStr + 'T12:00:00');
    const startDt = new Date(endDt);
    startDt.setDate(startDt.getDate() - 29); // 30 days inclusive
    const windowStartStr = formatDate(startDt);

    // Group subject records by date
    const recordsByDate = new Map<
      string,
      { present: number; absent: number; canceled: number }
    >();
    let runningPresent = 0;
    let runningAbsent = 0;

    for (const r of cleanSubRecords) {
      if (r.date < windowStartStr) {
        if (r.status === 'present') runningPresent++;
        else if (r.status === 'absent') runningAbsent++;
      } else if (r.date <= endDateStr) {
        const entry = recordsByDate.get(r.date) || {
          present: 0,
          absent: 0,
          canceled: 0,
        };
        if (r.status === 'present') entry.present++;
        else if (r.status === 'absent') entry.absent++;
        else if (r.status === 'canceled') entry.canceled++;
        recordsByDate.set(r.date, entry);
      }
    }

    const points: {
      date: string;
      fullDate: string;
      attendancePct: number;
      marks: number;
      present: number;
      absent: number;
      conducted: number;
      dailyPresent: number;
      dailyAbsent: number;
      dailyCanceled: number;
    }[] = [];

    const cursor = new Date(startDt);
    for (let i = 0; i < 30; i++) {
      const dStr = formatDate(cursor);
      const dayStats = recordsByDate.get(dStr) || {
        present: 0,
        absent: 0,
        canceled: 0,
      };
      runningPresent += dayStats.present;
      runningAbsent += dayStats.absent;
      const runningConducted = runningPresent + runningAbsent;
      const pct =
        runningConducted > 0
          ? Math.round(((runningPresent / runningConducted) * 100 + Number.EPSILON) * 10) / 10
          : 0;
      const marks = runningConducted > 0 ? getMarksTier(pct).marks : 0.0;

      points.push({
        date: dStr.slice(5), // MM-DD
        fullDate: dStr,
        attendancePct: pct,
        marks,
        present: runningPresent,
        absent: runningAbsent,
        conducted: runningConducted,
        dailyPresent: dayStats.present,
        dailyAbsent: dayStats.absent,
        dailyCanceled: dayStats.canceled,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return points;
  }, [focusedAnalytics, records, currentDate, semester.startDate, semester.endDate]);

  // Chart data for subject comparison & Course Health Radar Chart
  const barChartData = analyticsList.map((sa) => ({
    subjectId: sa.subject.id,
    name: sa.subject.code,
    fullName: sa.subject.name,
    attendance: sa.attendancePercentage,
    benchmark: 75,
    marks: sa.currentMarks,
    conducted: sa.conductedClasses,
    present: sa.presentClasses,
    color: sa.subject.color,
  }));

  // Compute Sunday–Thursday Semester Attendance Heatmap across semester.startDate to semester.endDate
  const semesterHeatmap = useMemo(() => {
    const startStr = semester.startDate || '2026-08-17';
    const endStr = semester.endDate || '2026-12-18';
    const startDt = new Date(startStr + 'T12:00:00');
    const endDt = new Date(endStr + 'T12:00:00');

    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime()) || startDt > endDt) {
      return { weeks: [], counts: { emerald: 0, amber: 0, rose: 0, slate: 0 } };
    }

    // Deduplicate valid semester records per (date, slot/id)
    const dedupedRecords = new Map<string, AttendanceRecord>();
    for (const r of records) {
      if (r.status !== 'present' && r.status !== 'absent' && r.status !== 'canceled') continue;
      if (r.date < startStr || r.date > endStr) continue;
      const key = r.timetableSlotId
        ? `${r.date}__slot__${r.timetableSlotId}`
        : `${r.date}__id__${r.id}`;
      const existing = dedupedRecords.get(key);
      if (!existing || (r.timestamp || 0) >= (existing.timestamp || 0)) {
        dedupedRecords.set(key, r);
      }
    }

    const dailyMap = new Map<
      string,
      { present: number; absent: number; canceled: number }
    >();
    for (const r of dedupedRecords.values()) {
      const entry = dailyMap.get(r.date) || { present: 0, absent: 0, canceled: 0 };
      if (r.status === 'present') entry.present++;
      else if (r.status === 'absent') entry.absent++;
      else if (r.status === 'canceled') entry.canceled++;
      dailyMap.set(r.date, entry);
    }

    // Align first row to the Sunday on or before startDt
    const firstSunday = new Date(startDt);
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay());

    interface HeatmapCell {
      date: string;
      dayLabel: string;
      inSemester: boolean;
      state: 'emerald' | 'amber' | 'rose' | 'slate';
      present: number;
      absent: number;
      canceled: number;
      conducted: number;
      scheduledCount: number;
      exclusionTitle?: string;
    }

    const weeks: { weekIndex: number; weekLabel: string; days: HeatmapCell[] }[] = [];
    const counts = { emerald: 0, amber: 0, rose: 0, slate: 0 };

    const cursor = new Date(firstSunday);
    let weekIdx = 1;

    while (cursor <= endDt) {
      const weekSunday = new Date(cursor);
      const days: HeatmapCell[] = [];

      // Sunday (0) through Thursday (4)
      for (let dOffset = 0; dOffset < 5; dOffset++) {
        const cellDt = new Date(weekSunday);
        cellDt.setDate(weekSunday.getDate() + dOffset);
        const dStr = formatDate(cellDt);
        const inSemester = dStr >= startStr && dStr <= endStr;

        const stats = dailyMap.get(dStr) || { present: 0, absent: 0, canceled: 0 };
        const conducted = stats.present + stats.absent;
        const scheduledCount = getSlotsForDate(dStr, timetable).length;
        const exclusion = getExclusionForDate(dStr, exclusions);

        let state: 'emerald' | 'amber' | 'rose' | 'slate' = 'slate';
        if (inSemester && conducted > 0) {
          if (stats.present === conducted) {
            state = 'emerald';
          } else if (stats.absent === conducted) {
            state = 'rose';
          } else {
            state = 'amber';
          }
        }

        if (inSemester) {
          counts[state]++;
        }

        days.push({
          date: dStr,
          dayLabel: dStr.slice(5), // MM-DD
          inSemester,
          state,
          present: stats.present,
          absent: stats.absent,
          canceled: stats.canceled,
          conducted,
          scheduledCount,
          exclusionTitle: exclusion?.title,
        });
      }

      const weekStartLabel = days[0].date.slice(5);
      weeks.push({
        weekIndex: weekIdx++,
        weekLabel: `W${weeks.length + 1} (${weekStartLabel})`,
        days,
      });

      // Advance cursor by 7 days to next Sunday
      cursor.setDate(cursor.getDate() + 7);
    }

    return { weeks, counts };
  }, [semester.startDate, semester.endDate, records, timetable, exclusions]);

  const totalSafeSkipsAcrossAll = analyticsList.reduce(
    (acc, curr) => acc + curr.safeSkipsRemaining,
    0
  );

  // Filtered subjects
  const filteredAnalytics = useMemo(() => {
    return analyticsList.filter((sa) => {
      const matchesSearch =
        sa.subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sa.subject.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === 'warning') return sa.isWarningZone;
      if (filterType === 'safe') return sa.safeSkipsRemaining >= 2;
      if (filterType === 'today' && timetable.length > 0 && currentDate) {
        const slotsForDate = getSlotsForDate(currentDate, timetable);
        return slotsForDate.some((s) => s.subjectId === sa.subject.id);
      }
      return true;
    });
  }, [analyticsList, searchQuery, filterType, timetable, currentDate]);

  return (
    <div className="space-y-6 relative transition-all duration-700 ease-out">
      {/* Ambient Dashboard Nebula Drift Overlay (Reacts to <70% critical risk or >=85% serene aurora) */}
      <div
        className={`pointer-events-none absolute -top-10 right-0 w-96 h-96 rounded-full blur-3xl -z-10 transition-all duration-700 ease-out ${
          anyCourseCriticalRisk
            ? 'bg-gradient-to-br from-rose-600/20 via-fuchsia-600/15 to-violet-700/10 opacity-95'
            : allCoursesSereneAurora
            ? 'bg-gradient-to-br from-cyan-500/20 via-emerald-500/18 to-teal-500/10 opacity-95'
            : 'bg-gradient-to-br from-indigo-500/12 via-violet-500/8 to-transparent opacity-75'
        }`}
      />

      {/* Top Banner Alert if Warning Zone subjects exist */}
      {overall.warningSubjectsCount > 0 && (
        <div className="rounded-2xl bg-rose-500/10 backdrop-blur-xl border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)] p-4 text-rose-200 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-rose-300">
              Attendance Alert:{' '}
              <span className="font-mono tracking-tight">{overall.warningSubjectsCount}</span>{' '}
              Subject(s) Below <span className="font-mono tracking-tight">70%</span> Threshold (
              <span className="font-mono tracking-tight">0.0</span> Marks)
            </h4>
            <p className="text-xs text-rose-200/80 mt-1">
              Course regulations award <span className="font-mono tracking-tight">0.0</span> marks for attendance under{' '}
              <span className="font-mono tracking-tight">70%</span>. Review the Bunk &amp; Recovery engine to view the exact consecutive classes needed to return to{' '}
              <span className="font-mono tracking-tight">75%</span> (
              <span className="font-mono tracking-tight">3.5</span> marks).
            </p>
          </div>
          <button
            onClick={() => onOpenPredictor()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white rounded-xl text-xs font-semibold shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.35)] transition cursor-pointer"
          >
            Open Recovery Plan
          </button>
        </div>
      )}

      {/* Attendance Streak & Holiday Exclusion Quick Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Streak Spotlight */}
        {streakData && (
          <div className="bg-[#090a14]/75 backdrop-blur-xl text-white rounded-2xl p-5 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10 flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] shrink-0">
                <Flame className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Continuous Attendance Streak
                  </span>
                  <span className="font-mono tracking-tight text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    Level {streakData.level}
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className="font-mono tracking-tight text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                    {streakData.currentDayStreak}
                  </span>
                  <span className="text-xs font-semibold text-cyan-400">
                    Days Without Missing a Class
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono tracking-tight">
                  Best streak: {streakData.longestDayStreak}d • {streakData.totalXp} XP •{' '}
                  {streakData.badges.filter((b) => b.isUnlocked).length} Badges Earned
                </p>
              </div>
            </div>

            {onOpenGamification && (
              <button
                onClick={onOpenGamification}
                className="relative z-10 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white text-xs font-semibold shrink-0 transition flex items-center space-x-1 shadow-[0_0_20px_rgba(124,58,237,0.35)] cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 mr-1" />
                <span>Badges</span>
              </button>
            )}
          </div>
        )}

        {/* Exclusion Calendar Spotlight */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <CalendarOff className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  Holiday &amp; Weekend Calendar
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 font-semibold">
                  Fri &amp; Sat Auto-Excluded
                </span>
              </div>
              <div className="font-display text-sm font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent mt-0.5">
                All Fridays &amp; Saturdays +{' '}
                <span className="font-mono tracking-tight">{exclusions.length}</span> Official Exclusions
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                5-day week (Sun–Thu). Weekends, holidays, and exam weeks omitted from totals.
              </p>
            </div>
          </div>

          {onOpenCalendar && (
            <button
              onClick={onOpenCalendar}
              className="px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-gradient-to-r hover:from-indigo-600 hover:via-purple-600 hover:to-cyan-600 text-cyan-400 hover:text-white text-xs font-semibold shrink-0 transition-all duration-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Today's Schedule & Quick Attendance Action Dock */}
      {subjects.length > 0 && timetable.length > 0 && onDateChange && onUpdateRecord && onRemoveRecord && (
        <TodayScheduleDock
          currentDate={currentDate}
          onDateChange={onDateChange}
          subjects={subjects}
          timetable={timetable}
          records={records}
          onUpdateRecord={onUpdateRecord}
          onRemoveRecord={onRemoveRecord}
          exclusions={exclusions}
          onOpenFullLogger={onOpenLogger}
          semesterStartDate={semester.startDate}
          semesterEndDate={semester.endDate}
        />
      )}

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GPA Marks */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Weighted GPA Marks
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono tracking-tight text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              {overall.gpaMarks.toFixed(2)}
            </span>
            <span className="text-sm font-mono tracking-tight font-medium text-slate-400">/ 5.00</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-mono tracking-tight">
              Unweighted: {overall.unweightedMarks.toFixed(2)}
            </span>
            <span className="font-semibold text-emerald-400">
              {overall.totalConducted === 0
                ? 'No Classes Logged'
                : overall.gpaMarks >= 4.5
                ? 'Top Tier'
                : overall.gpaMarks >= 3.5
                ? 'Benchmark'
                : 'Action Required'}
            </span>
          </div>
          <div className="mt-3 w-full h-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] p-0.5 overflow-hidden">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="kpi-gpa-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <rect
                x="0"
                y="0"
                rx="4"
                ry="4"
                height="100%"
                width={`${(overall.gpaMarks / 5.0) * 100}%`}
                fill="url(#kpi-gpa-grad)"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))',
                  transition: 'width 700ms ease-out',
                }}
              />
            </svg>
          </div>
        </div>

        {/* Overall Percentage */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overall Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono tracking-tight text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent transition-all duration-700 ease-out">
              {overall.overallPercentage.toFixed(1)}%
            </span>
            <span className="text-xs font-mono tracking-tight px-2 py-0.5 rounded font-semibold bg-indigo-500/10 text-cyan-400 border border-indigo-500/30">
              Target 75%+
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span className="font-mono tracking-tight">
              {overall.totalPresent} P / {overall.totalConducted} Cond.
            </span>
            <span
              className={
                overall.totalConducted === 0
                  ? 'text-slate-400 font-medium'
                  : overall.overallPercentage >= 75
                  ? 'text-emerald-400 font-medium'
                  : 'text-rose-400 font-medium'
              }
            >
              {overall.totalConducted === 0
                ? 'Awaiting Clicks'
                : overall.overallPercentage >= 75
                ? 'Compliant'
                : 'Shortfall'}
            </span>
          </div>
          <div className="mt-3 w-full h-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] p-0.5 overflow-hidden">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="kpi-attd-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <rect
                x="0"
                y="0"
                rx="4"
                ry="4"
                height="100%"
                width={`${Math.min(100, overall.overallPercentage)}%`}
                fill="url(#kpi-attd-grad)"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))',
                  transition: 'width 700ms ease-out',
                }}
              />
            </svg>
          </div>
        </div>

        {/* Conducted vs Canceled (Exclusion Highlight) */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Conducted (P + A)
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 flex items-center justify-center">
              <Slash className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono tracking-tight text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              {overall.totalConducted}
            </span>
            <span className="text-xs font-mono tracking-tight text-slate-400">
              = {overall.totalPresent} P + {overall.totalAbsent} A
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between font-mono tracking-tight">
            <span className="flex items-center text-slate-400 font-medium">
              <Slash className="w-3.5 h-3.5 mr-1" />
              {overall.totalCanceled} Canceled (Excl.)
            </span>
            <span className="text-rose-400 font-semibold">{overall.totalAbsent} Absent</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 italic">
            *Only counts classes where Present or Absent was clicked ({semester.startDate} to {semester.endDate}).
          </p>
        </div>

        {/* Bunk Capacity Runway */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Safe Bunk Runway
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono tracking-tight text-3xl font-extrabold text-emerald-400">
              {totalSafeSkipsAcrossAll}
            </span>
            <span className="text-xs text-slate-400">Total Skips Allowed</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Preserving 75% target tier</span>
            <button
              onClick={() => onOpenPredictor()}
              className="text-cyan-400 hover:text-indigo-300 font-semibold flex items-center text-[11px] cursor-pointer"
            >
              Simulate <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center space-x-1 text-[11px] text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Semester: {semester.name}</span>
          </div>
        </div>
      </div>

      {/* Marks Tier Reference Table */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl text-white rounded-2xl p-5 border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold flex items-center space-x-2 bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Official Academic Attendance Marks Scaling Scale</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated institutional scoring model based on official percentage tiers.
            </p>
          </div>
          <span className="text-[11px] text-slate-300 font-mono tracking-tight mt-2 sm:mt-0">
            Max Scale: 5.0 Marks / Subject
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MARKS_TIERS.map((tier) => (
            <div
              key={tier.label}
              className={`p-2.5 rounded-xl border text-center transition-all duration-300 ${tier.bgClass} ${tier.borderClass}`}
            >
              <div className={`text-base font-mono tracking-tight font-extrabold ${tier.colorClass}`}>
                {tier.label}
              </div>
              <div className="text-[11px] font-mono tracking-tight font-semibold text-white mt-0.5">
                {tier.minPercentage >= 90
                  ? '≥ 90.0%'
                  : tier.minPercentage === 0
                  ? '< 70.0%'
                  : `${tier.minPercentage.toFixed(1)}% - ${(tier.minPercentage + 4.9).toFixed(1)}%`}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {tier.marks === 0 ? 'Warning Zone' : tier.gradeDescription.split(' ')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Cards Grid with Interactive Search & Filter Controls */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent flex items-center space-x-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Subject Attendance &amp; Marks Roster</span>
            </h3>
            <p className="text-xs text-slate-400">
              Live status, cancellation exclusions, interactive what-if simulator &amp; safe bunk runway.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#090a14]/75 backdrop-blur-xl border border-white/[0.07] text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500/40 w-44 sm:w-56 transition"
              />
            </div>

            <button
              onClick={onOpenLogger}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-[0_0_20px_rgba(124,58,237,0.35)] transition shrink-0 cursor-pointer"
            >
              <span>Full Logger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-none text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-300 shrink-0 cursor-pointer ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white font-bold shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                : 'bg-[#090a14]/75 backdrop-blur-xl text-slate-300 hover:text-white border border-white/[0.07] hover:border-indigo-500/30'
            }`}
          >
            All Subjects (<span className="font-mono tracking-tight">{analyticsList.length}</span>)
          </button>
          <button
            onClick={() => setFilterType('warning')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              filterType === 'warning'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white font-bold shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.25)]'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>
              At Risk &lt;70% (
              <span className="font-mono tracking-tight">
                {analyticsList.filter((s) => s.isWarningZone).length}
              </span>
              )
            </span>
          </button>
          <button
            onClick={() => setFilterType('safe')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              filterType === 'safe'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white font-bold shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Safe to Bunk (2+ skips)</span>
          </button>
          <button
            onClick={() => setFilterType('today')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-300 flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              filterType === 'today'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white font-bold shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                : 'bg-indigo-500/10 text-cyan-400 border border-indigo-500/30'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Today&apos;s Classes</span>
          </button>
        </div>

        {/* Filtered Subject Cards Grid with Live What-If Simulator */}
        {filteredAnalytics.length === 0 ? (
          <div className="py-12 text-center bg-[#090a14]/75 backdrop-blur-xl text-white rounded-2xl border border-dashed border-white/[0.08] text-xs">
            <Search className="w-6 h-6 mx-auto mb-2 text-slate-400 opacity-60" />
            <p className="font-semibold text-white">No subjects match this filter</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="mt-2 text-cyan-400 hover:underline font-semibold cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div
            className={`bg-[#090a14]/75 backdrop-blur-xl text-white p-4 rounded-2xl border ring-1 ring-inset ring-white/[0.05] relative overflow-hidden transition-all duration-700 ease-out grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${
              anyCourseCriticalRisk
                ? 'border-rose-500/35 shadow-[0_0_45px_-12px_rgba(244,63,94,0.25)]'
                : allCoursesSereneAurora
                ? 'border-emerald-500/35 shadow-[0_0_45px_-12px_rgba(16,185,129,0.25)]'
                : 'border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]'
            }`}
          >
            {/* Ambient Top-Right Black Nebula Backdrop inside Subject Roster */}
            <div
              className={`pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl transition-all duration-700 ease-out ${
                anyCourseCriticalRisk
                  ? 'bg-gradient-to-br from-rose-600/20 via-fuchsia-600/15 to-transparent'
                  : allCoursesSereneAurora
                  ? 'bg-gradient-to-br from-cyan-500/20 via-emerald-500/15 to-transparent'
                  : 'bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-transparent'
              }`}
            />
            {filteredAnalytics.map((sa) => (
              <InteractiveSubjectCard
                key={sa.subject.id}
                analytics={sa}
                onOpenPredictor={onOpenPredictor}
                isFocused={sa.subject.id === focusedAnalytics?.subject.id}
                onFocusSubject={setFocusedSubjectId}
                onSimulationChange={handleSimulationChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Visual Tracking: Interactive Recharts Graphs (Bar Chart, Course Health Radar Chart, 30-Day Trend Line Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Attendance Comparison Bar Chart */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Subject Attendance Comparison
              </h4>
              <p className="text-xs text-slate-400">
                Percentage vs 75% Benchmark &amp; 90% Top Tier
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono tracking-tight">
              <span className="inline-block w-2.5 h-2.5 rounded bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]" />
              <span className="text-slate-400">Attd %</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const clickedSubId = state.activePayload[0].payload?.subjectId;
                    if (clickedSubId) setFocusedSubjectId(clickedSubId);
                  }
                }}
              >
                <defs>
                  <linearGradient id="nebulaBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                  unit="%"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#070812]/90 backdrop-blur-md border border-indigo-500/30 rounded-xl shadow-2xl text-white p-3 text-xs space-y-1">
                          <p className="font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                            {data.name} - {data.fullName}
                          </p>
                          <p className="text-cyan-400 font-mono tracking-tight mt-1">
                            Attendance: {data.attendance}%
                          </p>
                          <p className="text-emerald-400 font-mono tracking-tight">
                            Awarded Marks: {data.marks.toFixed(1)} / 5.0
                          </p>
                          <p className="text-slate-400 font-mono tracking-tight text-[11px] mt-0.5">
                            {data.present} present of {data.conducted} conducted
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={75}
                  stroke="#06b6d4"
                  strokeDasharray="4 4"
                  label={{
                    value: '75% Pass',
                    fill: '#06b6d4',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <ReferenceLine
                  y={90}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: '90% Max',
                    fill: '#10b981',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Bar
                  dataKey="attendance"
                  fill="url(#nebulaBarGradient)"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Course Health Radar Chart */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Course Health Radar Chart</span>
              </h4>
              <p className="text-xs text-slate-400">
                All courses&apos; Attendance % vs 75% benchmark polygon
              </p>
            </div>
            <span className="font-mono tracking-tight text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-500/10 text-cyan-400 border border-indigo-500/30">
              75% Benchmark
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={barChartData}>
                <defs>
                  <linearGradient id="nebulaRadarStroke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="nebulaRadarFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.35)" />
                    <stop offset="100%" stopColor="rgba(6, 182, 212, 0.02)" />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: '#cbd5e1',
                    fontWeight: 600,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#070812]/90 backdrop-blur-md border border-indigo-500/30 rounded-xl shadow-2xl text-white p-3 text-xs space-y-1">
                          <p className="font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                            {data.name} - {data.fullName}
                          </p>
                          <p className="text-cyan-400 font-mono tracking-tight font-semibold">
                            Course Attendance: {data.attendance}% ({data.marks.toFixed(1)} Marks)
                          </p>
                          <p className="text-indigo-400 font-mono tracking-tight">
                            Benchmark Polygon: {data.benchmark}%
                          </p>
                          <p className="text-slate-400 font-mono tracking-tight text-[11px]">
                            {data.present} Present / {data.conducted} Conducted
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar
                  name="75% Benchmark"
                  dataKey="benchmark"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="#06b6d4"
                  fillOpacity={0.08}
                />
                <Radar
                  name="Attendance %"
                  dataKey="attendance"
                  stroke="url(#nebulaRadarStroke)"
                  strokeWidth={2.5}
                  fill="url(#nebulaRadarFill)"
                  fillOpacity={1}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. 30-Day Focused Subject Attendance Percentage Trend Line Chart */}
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
          <div className="flex flex-col justify-between gap-2 mb-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>
                  30-Day Trend:{' '}
                  {focusedAnalytics ? `${focusedAnalytics.subject.code}` : 'Focused Subject'}
                </span>
              </h4>
              {focusedAnalytics && (
                <span className="text-[11px] font-mono tracking-tight font-bold text-emerald-400">
                  {focusedAnalytics.attendancePercentage}% ({focusedAnalytics.currentMarks.toFixed(1)}M)
                </span>
              )}
            </div>

            {/* Focused Subject Selector Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
              {analyticsList.map((sa) => {
                const isSelected = sa.subject.id === focusedAnalytics?.subject.id;
                return (
                  <button
                    key={sa.subject.id}
                    onClick={() => setFocusedSubjectId(sa.subject.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono tracking-tight font-semibold whitespace-nowrap transition-all duration-300 flex items-center space-x-1 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                        : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.07]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: sa.subject.color }}
                    />
                    <span>{sa.subject.code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={subjectLast30DaysTrend}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="nebulaLineStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                  minTickGap={16}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'JetBrains Mono' }}
                  unit="%"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#070812]/90 backdrop-blur-md border border-indigo-500/30 rounded-xl shadow-2xl text-white p-3 text-xs space-y-1">
                          <p className="font-semibold text-slate-300">
                            {formatFriendlyDate(data.fullDate)}
                          </p>
                          <p className="font-mono tracking-tight font-bold text-cyan-400 text-sm">
                            Attendance: {data.attendancePct}% ({data.marks.toFixed(1)} Marks)
                          </p>
                          <p className="text-[11px] font-mono tracking-tight text-slate-400">
                            Cumulative: {data.present} P / {data.conducted} Cond. ({data.absent} A)
                          </p>
                          {(data.dailyPresent > 0 ||
                            data.dailyAbsent > 0 ||
                            data.dailyCanceled > 0) && (
                            <p className="text-[11px] font-mono tracking-tight text-indigo-300 pt-0.5 border-t border-white/[0.08]">
                              Logged on date: {data.dailyPresent} P, {data.dailyAbsent} A
                              {data.dailyCanceled > 0 ? `, ${data.dailyCanceled} Canceled` : ''}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={75}
                  stroke="#06b6d4"
                  strokeDasharray="4 4"
                  label={{
                    value: '75% (3.5M)',
                    fill: '#06b6d4',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <ReferenceLine
                  y={90}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: '90% (5.0M)',
                    fill: '#10b981',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="attendancePct"
                  stroke="url(#nebulaLineStroke)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#06b6d4', stroke: '#8b5cf6', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 1.5 }}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.4))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Semester Attendance Heatmap (Sunday–Thursday Grid across Semester Span) */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>
                Semester Attendance Heatmap (Sunday–Thursday •{' '}
                <span className="font-mono tracking-tight">{semester.startDate}</span> to{' '}
                <span className="font-mono tracking-tight">{semester.endDate}</span>)
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any date cell to select that date in the Today&apos;s Lecture Schedule dock above.
            </p>
          </div>

          {/* Color Legend & Day Counts */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tracking-tight">
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)] inline-block" />
              <span className="text-emerald-400 font-medium">
                All Present ({semesterHeatmap.counts.emerald})
              </span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-indigo-500/20 border border-indigo-500/40 inline-block" />
              <span className="text-cyan-400 font-medium">
                Mixed ({semesterHeatmap.counts.amber})
              </span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500/20 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)] inline-block" />
              <span className="text-rose-400 font-medium">
                All Absent ({semesterHeatmap.counts.rose})
              </span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-xs bg-white/[0.03] border border-white/[0.08] inline-block" />
              <span className="text-slate-400">
                No Classes / Canceled / Holiday ({semesterHeatmap.counts.slate})
              </span>
            </span>
          </div>
        </div>

        {/* Sunday–Thursday Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[540px]">
            {/* Day Column Headers */}
            <div className="grid grid-cols-6 gap-2 pb-2 border-b border-white/[0.07] text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <div>Academic Week</div>
              <div className="text-center">Sunday</div>
              <div className="text-center">Monday</div>
              <div className="text-center">Tuesday</div>
              <div className="text-center">Wednesday</div>
              <div className="text-center">Thursday</div>
            </div>

            {/* Week Rows */}
            <div className="divide-y divide-white/[0.05] max-h-96 overflow-y-auto pr-1">
              {semesterHeatmap.weeks.map((week) => (
                <div
                  key={week.weekIndex}
                  className="grid grid-cols-6 gap-2 py-1.5 items-center text-xs"
                >
                  <div className="font-mono tracking-tight text-[11px] font-semibold text-slate-400">
                    {week.weekLabel}
                  </div>
                  {week.days.map((cell) => {
                    const isSelected = cell.date === currentDate;
                    const colorClasses = !cell.inSemester
                      ? 'bg-white/[0.01] text-slate-600 border-white/[0.04] cursor-not-allowed opacity-35'
                      : cell.state === 'emerald'
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer'
                      : cell.state === 'amber'
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer'
                      : cell.state === 'rose'
                      ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border-rose-500/35 shadow-[0_0_15px_rgba(244,63,94,0.25)] cursor-pointer'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 border-white/[0.08] cursor-pointer';

                    const tooltipText = !cell.inSemester
                      ? `${cell.date} (Outside semester span)`
                      : cell.conducted > 0
                      ? `${formatFriendlyDate(cell.date)} — Present: ${cell.present}, Absent: ${cell.absent}${
                          cell.canceled > 0 ? `, Canceled: ${cell.canceled}` : ''
                        }`
                      : cell.exclusionTitle
                      ? `${formatFriendlyDate(cell.date)} — ${cell.exclusionTitle} (Excluded)`
                      : cell.canceled > 0
                      ? `${formatFriendlyDate(cell.date)} — ${cell.canceled} Canceled (Excluded)`
                      : `${formatFriendlyDate(cell.date)} — No classes conducted (${cell.scheduledCount} scheduled)`;

                    return (
                      <button
                        key={cell.date}
                        type="button"
                        disabled={!cell.inSemester}
                        title={tooltipText}
                        onClick={() => {
                          if (cell.inSemester && onDateChange) {
                            onDateChange(cell.date);
                          }
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-center transition-all duration-300 flex flex-col items-center justify-center ${colorClasses} ${
                          isSelected
                            ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#030308] font-extrabold scale-[1.03]'
                            : ''
                        }`}
                      >
                        <span className="font-mono tracking-tight text-[11px] leading-tight">
                          {cell.dayLabel}
                        </span>
                        <span className="font-mono tracking-tight text-[9px] leading-tight opacity-90 mt-0.5">
                          {!cell.inSemester
                            ? '—'
                            : cell.conducted > 0
                            ? `${cell.present}P / ${cell.absent}A`
                            : cell.exclusionTitle
                            ? 'Holiday'
                            : cell.canceled > 0
                            ? 'Canceled'
                            : '0 Cond.'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

