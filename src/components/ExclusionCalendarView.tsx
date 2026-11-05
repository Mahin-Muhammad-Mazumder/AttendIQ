import React, { useState, useMemo } from 'react';
import {
  AcademicExclusion,
  ExclusionType,
  TimetableSlot,
  SemesterConfig,
  Subject,
} from '../types';
import {
  getDayOfWeek,
  formatFriendlyDate,
  formatDate,
  isDateInExclusion,
  isWeekendDay,
  calculatePausedClassesSummary,
  DAY_NAMES,
} from '../utils/timetableProjections';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  Palmtree,
  BookOpen,
  Building2,
  CalendarDays,
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ExclusionCalendarViewProps {
  exclusions: AcademicExclusion[];
  onAddExclusion: (exclusion: AcademicExclusion) => void;
  onUpdateExclusion: (exclusion: AcademicExclusion) => void;
  onRemoveExclusion?: (id: string) => void;
  onDeleteExclusion?: (id: string) => void;
  timetable: TimetableSlot[];
  semester: SemesterConfig;
  subjects: Subject[];
  onSelectDateToLog?: (date: string) => void;
  onJumpToLogger?: (date: string) => void;
}

export const ExclusionCalendarView: React.FC<ExclusionCalendarViewProps> = ({
  exclusions,
  onAddExclusion,
  onUpdateExclusion,
  onRemoveExclusion,
  onDeleteExclusion,
  timetable,
  semester,
  subjects,
  onSelectDateToLog,
  onJumpToLogger,
}) => {
  const handleRemove = (id: string) => {
    if (onRemoveExclusion) onRemoveExclusion(id);
    else if (onDeleteExclusion) onDeleteExclusion(id);
  };

  const handleJump = (date: string) => {
    if (onSelectDateToLog) onSelectDateToLog(date);
    else if (onJumpToLogger) onJumpToLogger(date);
  };

  // Calendar month state (default to September 2026 or semester start)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 8 = September (0-indexed)

  // Filter state
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | ExclusionType>('all');

  // Modal form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    type: ExclusionType;
    startDate: string;
    endDate: string;
    description: string;
  }>({
    title: '',
    type: 'holiday',
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    description: '',
  });

  // Overall pause analytics
  const pauseSummary = useMemo(() => {
    return calculatePausedClassesSummary(timetable, semester, exclusions);
  }, [timetable, semester, exclusions]);

  // Filtered exclusions
  const filteredExclusions = useMemo(() => {
    return exclusions.filter((ex) => {
      if (selectedTypeFilter === 'all') return true;
      return ex.type === selectedTypeFilter;
    });
  }, [exclusions, selectedTypeFilter]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Build days grid for currently selected month (Sunday = 0 ... Saturday = 6, so Fri & Sat are weekend columns)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Day of week for 1st day (0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday)
    const startDay = firstDayOfMonth.getDay();

    const totalDays = lastDayOfMonth.getDate();
    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      exclusions: AcademicExclusion[];
      isWeekend: boolean;
      isSemesterDate: boolean;
      isToday: boolean;
    }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = formatDate(prevDate);
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        exclusions: exclusions.filter((ex) => isDateInExclusion(dateStr, ex)),
        isWeekend: isWeekendDay(prevDate),
        isSemesterDate: dateStr >= semester.startDate && dateStr <= semester.endDate,
        isToday: dateStr === '2026-09-10',
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(currentYear, currentMonth, d);
      const dateStr = formatDate(curDate);
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        exclusions: exclusions.filter((ex) => isDateInExclusion(dateStr, ex)),
        isWeekend: isWeekendDay(curDate),
        isSemesterDate: dateStr >= semester.startDate && dateStr <= semester.endDate,
        isToday: dateStr === '2026-09-10',
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const dateStr = formatDate(nextDate);
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        exclusions: exclusions.filter((ex) => isDateInExclusion(dateStr, ex)),
        isWeekend: isWeekendDay(nextDate),
        isSemesterDate: dateStr >= semester.startDate && dateStr <= semester.endDate,
        isToday: dateStr === '2026-09-10',
      });
    }

    return days;
  }, [currentYear, currentMonth, exclusions, semester]);

  const handleOpenAdd = (defaultDate?: string) => {
    setEditingId(null);
    setFormData({
      title: '',
      type: 'holiday',
      startDate: defaultDate || '2026-09-15',
      endDate: defaultDate || '2026-09-15',
      description: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ex: AcademicExclusion) => {
    setEditingId(ex.id);
    setFormData({
      title: ex.title,
      type: ex.type,
      startDate: ex.startDate,
      endDate: ex.endDate,
      description: ex.description || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.startDate || !formData.endDate) return;

    // Ensure startDate <= endDate
    const start = formData.startDate <= formData.endDate ? formData.startDate : formData.endDate;
    const end = formData.startDate <= formData.endDate ? formData.endDate : formData.startDate;

    if (editingId) {
      onUpdateExclusion({
        id: editingId,
        title: formData.title.trim(),
        type: formData.type,
        startDate: start,
        endDate: end,
        description: formData.description.trim(),
      });
    } else {
      onAddExclusion({
        id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: formData.title.trim(),
        type: formData.type,
        startDate: start,
        endDate: end,
        description: formData.description.trim(),
      });
    }
    setIsFormOpen(false);
  };

  const handleQuickAddPreset = (preset: {
    title: string;
    type: ExclusionType;
    startDate: string;
    endDate: string;
    description: string;
  }) => {
    onAddExclusion({
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...preset,
    });
  };

  // Helper for type styling
  const getTypeBadge = (type: ExclusionType) => {
    switch (type) {
      case 'holiday':
        return {
          label: 'Official Holiday',
          icon: Building2,
          bg: 'bg-purple-500/15',
          text: 'text-purple-300',
          border: 'border-purple-500/35',
          indicator: 'bg-purple-400',
        };
      case 'exam':
        return {
          label: 'Exam Week',
          icon: BookOpen,
          bg: 'bg-indigo-500/15',
          text: 'text-cyan-300',
          border: 'border-indigo-500/35',
          indicator: 'bg-cyan-400',
        };
      case 'vacation':
        return {
          label: 'Vacation / Recess',
          icon: Palmtree,
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-300',
          border: 'border-emerald-500/35',
          indicator: 'bg-emerald-400',
        };
      default:
        return {
          label: 'Campus Event',
          icon: CalendarDays,
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-300',
          border: 'border-cyan-500/35',
          indicator: 'bg-cyan-400',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Exclusion Analytics Banner */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-cyan-400">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Holiday, Exam & Weekend Exclusion Calendar
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All Fridays & Saturdays are automatically excluded as weekends, alongside official holidays and exam weeks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="btn-add-exclusion"
              onClick={() => handleOpenAdd()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] font-semibold text-xs flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exclusion Event</span>
            </button>
          </div>
        </div>

        {/* Dynamic Impact Counters */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <div className="text-[11px] font-medium text-rose-400 uppercase">
              Fri & Sat Weekends
            </div>
            <div className="text-xl font-mono tracking-tight font-bold text-rose-300 mt-0.5">
              {pauseSummary.weekendDayCount} Days Auto-Off
            </div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">
              Every Friday & Saturday excluded
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Custom Exclusions</div>
            <div className="text-xl font-mono tracking-tight font-bold text-white mt-0.5">
              {exclusions.length} Events
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Holidays, exams & recesses</div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
            <div className="text-[11px] font-medium text-indigo-400 uppercase">
              Weekday Classes Paused
            </div>
            <div className="text-xl font-mono tracking-tight font-bold text-cyan-300 mt-0.5">
              {pauseSummary.totalPausedSlots} Lecture Slots
            </div>
            <div className="text-[10px] text-indigo-300/80 mt-0.5">
              Excluded from Sun–Thu schedule
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <div className="text-[11px] font-medium text-emerald-400 uppercase">
              Counting Status
            </div>
            <div className="text-xl font-mono tracking-tight font-bold text-emerald-400 mt-0.5 flex items-center space-x-1.5">
              <PauseCircle className="w-4 h-4" />
              <span>Auto-Paused</span>
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">
              Zero attendance penalties
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Month Calendar + Exclusions Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Calendar Grid (7 cols on lg) */}
        <div className="lg:col-span-7 bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] p-5">
          {/* Month Header with Steppers */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                {monthNames[currentMonth]} <span className="font-mono tracking-tight">{currentYear}</span>
              </h3>
              <span className="text-[11px] font-mono tracking-tight font-medium px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                Sun–Thu Active • Fri/Sat Off
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCurrentYear(2026);
                  setCurrentMonth(8); // September 2026
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels (Sunday to Thursday active, Friday & Saturday weekend) */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div className="text-rose-400 font-bold">Fri (Wknd)</div>
            <div className="text-rose-400 font-bold">Sat (Wknd)</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, idx) => {
              const hasCustomExclusion = d.exclusions.length > 0;
              const primaryExclusion = d.exclusions[0];
              const badgeStyle = primaryExclusion ? getTypeBadge(primaryExclusion.type) : null;
              const dayNameShort = getDayOfWeek(d.dateStr) === 'friday' ? 'Friday' : 'Saturday';

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (primaryExclusion) {
                      handleOpenEdit(primaryExclusion);
                    } else {
                      handleOpenAdd(d.dateStr);
                    }
                  }}
                  className={`min-h-[76px] p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    !d.isCurrentMonth
                      ? 'bg-white/[0.01] text-slate-600 border-transparent opacity-40'
                      : d.isToday
                      ? 'border-indigo-500 bg-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                      : hasCustomExclusion
                      ? `${badgeStyle?.bg} ${badgeStyle?.border}`
                      : d.isWeekend
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-white/[0.03] border-white/[0.07] hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono tracking-tight font-semibold ${
                        d.isToday
                          ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]'
                          : hasCustomExclusion
                          ? badgeStyle?.text
                          : d.isWeekend
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-300'
                      }`}
                    >
                      {d.dayNumber}
                    </span>
                    {d.isToday && (
                      <span className="text-[9px] font-bold text-cyan-400 uppercase">Today</span>
                    )}
                    {!d.isToday && d.isWeekend && (
                      <span className="text-[8px] font-bold text-rose-400 uppercase">
                        Wknd
                      </span>
                    )}
                  </div>

                  {hasCustomExclusion ? (
                    <div className="mt-1">
                      <div
                        className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate ${badgeStyle?.bg} ${badgeStyle?.text}`}
                        title={primaryExclusion.title}
                      >
                        {primaryExclusion.title}
                      </div>
                      <div className="flex items-center space-x-1 text-[8px] text-slate-400 mt-0.5">
                        <PauseCircle className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                        <span>Paused</span>
                      </div>
                    </div>
                  ) : d.isWeekend ? (
                    <div className="mt-1">
                      <div
                        className="text-[9px] font-semibold px-1 py-0.5 rounded truncate bg-rose-500/15 text-rose-300"
                        title={`${dayNameShort} Weekend — Auto-Excluded`}
                      >
                        Weekend Off
                      </div>
                      <div className="flex items-center space-x-1 text-[8px] text-rose-400 mt-0.5">
                        <PauseCircle className="w-2.5 h-2.5 shrink-0" />
                        <span>Auto-Excluded</span>
                      </div>
                    </div>
                  ) : (
                    d.isSemesterDate && (
                      <div className="text-[8px] text-slate-500 mt-auto text-right">Routine</div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="mt-4 pt-3 border-t border-white/[0.07] flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Legend:</span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Fri & Sat Weekend (Auto-Excluded)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Holiday</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Exam Week</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Vacation</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Today (Simulated)</span>
            </span>
          </div>
        </div>

        {/* Right Column: Active Exclusions Management & Quick Presets (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Pinned System Rule: Auto-Excluded Fridays & Saturdays */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                <PauseCircle className="w-3 h-3" />
                <span>System Auto-Exclusion Rule</span>
              </span>
              <span className="text-[10px] font-mono tracking-tight font-bold text-rose-400">
                Always Active
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1.5">
              All Fridays & Saturdays (Weekly Weekend)
            </h4>
            <p className="text-xs text-slate-300 mt-1">
              Academic schedule operates 5 days/week (Sunday–Thursday). All <span className="font-mono tracking-tight font-bold text-rose-300">{pauseSummary.weekendDayCount}</span> Fridays and Saturdays in the semester are automatically excluded from class counting.
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center space-x-1.5">
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Configured Exclusions
              </span>
              <span className="text-xs font-mono tracking-tight px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
                {filteredExclusions.length}
              </span>
            </h3>

            <div className="flex items-center space-x-1 text-xs">
              {(['all', 'holiday', 'exam', 'vacation'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                    selectedTypeFilter === type
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Exclusions List */}
          {filteredExclusions.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-white/[0.12] text-center text-slate-400 bg-[#090a14]/75 backdrop-blur-xl">
              <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-200">
                No exclusions configured in this category
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Add official holidays or exam periods to pause class counting automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredExclusions.map((ex) => {
                const badge = getTypeBadge(ex.type);
                const Icon = badge.icon;
                const isSingleDay = ex.startDate === ex.endDate;

                return (
                  <div
                    key={ex.id}
                    className="p-4 rounded-2xl bg-[#090a14]/75 backdrop-blur-xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 transition relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center space-x-1 border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white pt-0.5">
                          {ex.title}
                        </h4>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(ex)}
                          className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] transition"
                          title="Edit Exclusion"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(ex.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition"
                          title="Delete Exclusion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center space-x-2 text-xs text-slate-300 font-mono tracking-tight">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-semibold">
                        {isSingleDay
                          ? formatFriendlyDate(ex.startDate)
                          : `${formatFriendlyDate(ex.startDate)} → ${formatFriendlyDate(ex.endDate)}`}
                      </span>
                    </div>

                    {ex.description && (
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">
                        {ex.description}
                      </p>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                      <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Class counting paused</span>
                      </span>
                      {(onSelectDateToLog || onJumpToLogger) && (
                        <button
                          onClick={() => handleJump(ex.startDate)}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          View in Logger →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Academic Presets */}
          <div className="p-4 rounded-2xl bg-[#090a14]/75 backdrop-blur-xl border border-indigo-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quick Presets: Common Academic Exclusions</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() =>
                  handleQuickAddPreset({
                    title: 'Fall Mid-Term Exam Week',
                    type: 'exam',
                    startDate: '2026-10-19',
                    endDate: '2026-10-23',
                    description: 'Mid-term written exam evaluations. Routine lectures paused.',
                  })
                }
                className="p-2 text-left rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 transition text-[11px] font-semibold text-slate-200"
              >
                + Mid-Term Week (Oct 19–23)
              </button>

              <button
                onClick={() =>
                  handleQuickAddPreset({
                    title: 'Thanksgiving Recess',
                    type: 'holiday',
                    startDate: '2026-11-25',
                    endDate: '2026-11-27',
                    description: 'National holiday — campus closed.',
                  })
                }
                className="p-2 text-left rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 transition text-[11px] font-semibold text-slate-200"
              >
                + Thanksgiving (Nov 25–27)
              </button>

              <button
                onClick={() =>
                  handleQuickAddPreset({
                    title: 'University Sports Day',
                    type: 'vacation',
                    startDate: '2026-10-02',
                    endDate: '2026-10-02',
                    description: 'Annual inter-department sports fest. Lectures suspended.',
                  })
                }
                className="p-2 text-left rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 transition text-[11px] font-semibold text-slate-200"
              >
                + Sports Day (Oct 02)
              </button>

              <button
                onClick={() =>
                  handleQuickAddPreset({
                    title: 'Final Exam Period',
                    type: 'exam',
                    startDate: '2026-12-14',
                    endDate: '2026-12-18',
                    description: 'Semester finals written evaluations.',
                  })
                }
                className="p-2 text-left rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/40 transition text-[11px] font-semibold text-slate-200"
              >
                + Final Exam Week (Dec 14–18)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Paused Classes Breakdown Table */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] p-5">
        <h3 className="text-sm font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent mb-1">
          Subject-by-Subject Suspended Hours & Classes Audit
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Because of active exclusions, these routine lecture hours are completely omitted from each subject's semester denominator.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {subjects.map((sub) => {
            const pausedCount = pauseSummary.perSubject[sub.id] || 0;
            return (
              <div
                key={sub.id}
                className="p-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02]"
              >
                <div className="flex items-center space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="font-mono tracking-tight font-bold text-xs text-white">
                    {sub.code}
                  </span>
                </div>
                <div className="mt-2 text-lg font-mono tracking-tight font-extrabold text-cyan-400">
                  {pausedCount} <span className="text-xs font-sans font-normal text-slate-400">classes</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Automatically excluded
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Dialog: Add / Edit Exclusion */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#090a14]/90 backdrop-blur-xl rounded-2xl max-w-md w-full border border-white/[0.1] ring-1 ring-inset ring-white/[0.06] shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/[0.07] flex items-center justify-between">
              <h3 className="font-bold text-base bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                {editingId ? 'Edit Exclusion Event' : 'Add New Exclusion Event'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Labor Day, Mid-Term Exam Week, Thanksgiving Break"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/[0.1] bg-[#030308] text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exclusion Category
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ExclusionType })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/[0.1] bg-[#030308] text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="holiday">Official Government / National Holiday</option>
                  <option value="exam">Mid-term / Final Exam Period</option>
                  <option value="vacation">Academic Vacation / Reading Break</option>
                  <option value="other">Campus Special Event / Weather Closure</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono tracking-tight rounded-xl border border-white/[0.1] bg-[#030308] text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono tracking-tight rounded-xl border border-white/[0.1] bg-[#030308] text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. University closed by decree, mid-term examinations conducted."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-white/[0.1] bg-[#030308] text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-slate-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>
                  Any timetable classes falling in this date range will automatically be paused and omitted from the semester class count.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 shadow-[0_0_20px_rgba(124,58,237,0.35)] rounded-xl transition"
                >
                  {editingId ? 'Update Exclusion' : 'Confirm Exclusion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
