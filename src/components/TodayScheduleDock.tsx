import React, { useState } from 'react';
import {
  Subject,
  TimetableSlot,
  AttendanceRecord,
  AttendanceStatus,
  AcademicExclusion,
} from '../types';
import {
  getSlotsForDate,
  formatFriendlyDate,
  formatDate,
  getExclusionForDate,
  DAY_NAMES,
} from '../utils/timetableProjections';
import { playSound } from '../utils/audioFeedback';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
  Zap,
  RotateCcw,
  Sparkles,
  Slash,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  AlertCircle,
} from 'lucide-react';

interface TodayScheduleDockProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  subjects: Subject[];
  timetable: TimetableSlot[];
  records: AttendanceRecord[];
  onUpdateRecord: (record: AttendanceRecord) => void;
  onRemoveRecord: (recordId: string) => void;
  exclusions?: AcademicExclusion[];
  onOpenFullLogger: () => void;
  semesterStartDate?: string;
  semesterEndDate?: string;
}

export const TodayScheduleDock: React.FC<TodayScheduleDockProps> = ({
  currentDate,
  onDateChange,
  subjects,
  timetable,
  records,
  onUpdateRecord,
  onRemoveRecord,
  exclusions = [],
  onOpenFullLogger,
  semesterStartDate,
  semesterEndDate,
}) => {
  const [showCelebration, setShowCelebration] = useState(false);

  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
  const scheduledSlots = getSlotsForDate(currentDate, timetable);
  const activeExclusion = getExclusionForDate(currentDate, exclusions);

  // Map records for this date by timetableSlotId (with fallback to subjectId)
  const dateRecords = records.filter((r) => r.date === currentDate);
  const recordMapBySlot = new Map<string, AttendanceRecord>();
  const recordMapBySubject = new Map<string, AttendanceRecord>();
  for (const r of dateRecords) {
    if (r.timetableSlotId) {
      recordMapBySlot.set(r.timetableSlotId, r);
    } else {
      recordMapBySubject.set(r.subjectId, r);
    }
  }

  const getRecordForSlot = (slot: TimetableSlot): AttendanceRecord | undefined => {
    return recordMapBySlot.get(slot.id) || recordMapBySubject.get(slot.subjectId);
  };

  // Count marked states for today
  let presentCount = 0;
  let absentCount = 0;
  let canceledCount = 0;
  for (const slot of scheduledSlots) {
    const rec = getRecordForSlot(slot);
    if (rec?.status === 'present') presentCount++;
    if (rec?.status === 'absent') absentCount++;
    if (rec?.status === 'canceled') canceledCount++;
  }
  const conductedCount = presentCount + absentCount;
  const markedCount = presentCount + absentCount + canceledCount;
  const isFullyLogged = scheduledSlots.length > 0 && markedCount === scheduledSlots.length;

  const handleMarkSlot = (slot: TimetableSlot, status: AttendanceStatus) => {
    const existing = getRecordForSlot(slot);
    if (existing && existing.status === status) {
      // Toggle off / clear
      onRemoveRecord(existing.id);
      playSound('click');
      return;
    }

    const updated: AttendanceRecord = {
      id: existing ? existing.id : `rec_${currentDate}_${slot.id}`,
      date: currentDate,
      timetableSlotId: slot.id,
      subjectId: slot.subjectId,
      status,
      note: existing?.note,
      timestamp: Date.now(),
    };

    onUpdateRecord(updated);

    if (status === 'present') {
      playSound('present');
    } else if (status === 'absent') {
      playSound('absent');
    } else if (status === 'canceled') {
      playSound('canceled');
    }
  };

  const handleMarkAllPresent = () => {
    scheduledSlots.forEach((slot) => {
      const existing = getRecordForSlot(slot);
      const updated: AttendanceRecord = {
        id: existing ? existing.id : `rec_${currentDate}_${slot.id}`,
        date: currentDate,
        timetableSlotId: slot.id,
        subjectId: slot.subjectId,
        status: 'present',
        note: existing?.note,
        timestamp: Date.now(),
      };
      onUpdateRecord(updated);
    });

    playSound('celebrate');
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  // Date shifting helpers (clamped to semester startDate and endDate)
  const shiftDate = (days: number) => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const nextDate = formatDate(dt);
    if (semesterStartDate && nextDate < semesterStartDate) {
      onDateChange(semesterStartDate);
    } else if (semesterEndDate && nextDate > semesterEndDate) {
      onDateChange(semesterEndDate);
    } else {
      onDateChange(nextDate);
    }
    playSound('click');
  };

  return (
    <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] p-5 transition-all duration-300 relative overflow-hidden">
      {/* Decorative subtle background accents */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-indigo-900/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Header with Date Navigation & Quick Batch Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.07] relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-cyan-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-display font-bold text-base bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Today&apos;s Lecture Schedule &amp; Instant Logger
              </h3>
              {isFullyLogged && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>All Marked</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5 font-mono tracking-tight">
              <span className="font-sans">{formatFriendlyDate(currentDate)}</span>
              <span>•</span>
              <span>{scheduledSlots.length} scheduled</span>
              <span>•</span>
              <span className="font-semibold text-slate-200">
                Conducted: {conductedCount} ({presentCount} Present, {absentCount} Absent
                {canceledCount > 0 ? `, ${canceledCount} Canceled` : ''})
              </span>
            </p>
          </div>
        </div>

        {/* Date Jumpers & Batch Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Date Stepper */}
          <div className="flex items-center bg-[#070812]/90 backdrop-blur-md p-1 rounded-xl border border-white/[0.08] text-xs">
            <button
              onClick={() => shiftDate(-1)}
              title="Previous Day"
              className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={currentDate}
              min={semesterStartDate}
              max={semesterEndDate}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  if (semesterStartDate && val < semesterStartDate) {
                    onDateChange(semesterStartDate);
                  } else if (semesterEndDate && val > semesterEndDate) {
                    onDateChange(semesterEndDate);
                  } else {
                    onDateChange(val);
                  }
                  playSound('click');
                }
              }}
              className="bg-transparent border-0 text-xs font-mono tracking-tight font-medium px-2 py-0.5 text-slate-100 focus:outline-hidden"
            />
            <button
              onClick={() => shiftDate(1)}
              title="Next Day"
              className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-300 hover:text-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Batch Button: Mark All Present */}
          {scheduledSlots.length > 0 && !activeExclusion && (
            <button
              onClick={handleMarkAllPresent}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-[0_0_20px_rgba(124,58,237,0.35)] transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark All</span>
              <span>Present</span>
            </button>
          )}
        </div>
      </div>

      {/* Celebration Banner when batch marking */}
      {showCelebration && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)] text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>
              Awesome! All scheduled classes marked Present for {formatFriendlyDate(currentDate)}.
            </span>
          </div>
          <span className="text-[11px] font-mono tracking-tight bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
            +100% Day
          </span>
        </div>
      )}

      {/* Holiday / Exclusion Notification if date is excluded */}
      {activeExclusion && (
        <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <strong className="font-bold text-white">{activeExclusion.title}</strong> — Official academic exclusion. Scheduled class counting is paused; absences will not hurt streaks or bunks.
            </div>
          </div>
          <span className="text-[10px] font-mono tracking-tight uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-300 shrink-0 ml-2">
            Excluded
          </span>
        </div>
      )}

      {/* Slot Cards List */}
      <div className="mt-4">
        {scheduledSlots.length === 0 ? (
          <div className="py-8 text-center bg-white/[0.03] rounded-xl border border-dashed border-white/[0.08] text-slate-400 text-xs">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-slate-500 opacity-60" />
            <p className="font-semibold text-slate-200">
              No classes scheduled for {formatFriendlyDate(currentDate)}
            </p>
            <p className="text-[11px] mt-0.5 text-slate-400">
              Use the Routine tab to add class periods or choose another date above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scheduledSlots.map((slot) => {
              const subject = subjectMap.get(slot.subjectId);
              const rec = getRecordForSlot(slot);
              const status = rec ? rec.status : 'not_marked';

              return (
                <div
                  key={slot.id}
                  className={`p-3.5 rounded-xl border ring-1 ring-inset ring-white/[0.05] transition-all duration-300 flex flex-col justify-between ${
                    status === 'present'
                      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : status === 'absent'
                      ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                      : status === 'canceled'
                      ? 'bg-white/[0.03] border-white/[0.08]'
                      : 'bg-[#070812]/80 border-white/[0.07] hover:border-indigo-500/30 hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]'
                  }`}
                >
                  <div>
                    {/* Top row: Time + Type */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono tracking-tight text-xs font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-200 border border-white/[0.08] flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </span>
                      <span className="font-mono tracking-tight text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
                        {subject ? `${subject.credits} Cr` : 'Lecture'}
                      </span>
                    </div>

                    {/* Subject info */}
                    <div className="flex items-start space-x-2 mt-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: subject?.color || '#6366f1' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent truncate">
                          {subject?.name || 'Class Slot'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono tracking-tight flex items-center space-x-2 mt-0.5">
                          <span className="text-indigo-300">{subject?.code}</span>
                          {slot.room && (
                            <>
                              <span>•</span>
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                                {slot.room}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Attendance Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.07] grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleMarkSlot(slot, 'present')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all duration-300 cursor-pointer ${
                        status === 'present'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)] font-bold scale-[1.02]'
                          : 'bg-white/[0.03] text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 border border-white/[0.08]'
                      }`}
                      title="Mark Present"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Attended</span>
                    </button>

                    <button
                      onClick={() => handleMarkSlot(slot, 'absent')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all duration-300 cursor-pointer ${
                        status === 'absent'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)] font-bold scale-[1.02]'
                          : 'bg-white/[0.03] text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 border border-white/[0.08]'
                      }`}
                      title="Mark Absent"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Skip</span>
                    </button>

                    <button
                      onClick={() => handleMarkSlot(slot, 'canceled')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-all duration-300 cursor-pointer ${
                        status === 'canceled'
                          ? 'bg-white/[0.08] text-slate-200 border border-white/[0.2] font-bold scale-[1.02]'
                          : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 border border-white/[0.08]'
                      }`}
                      title="Mark Canceled (Teacher Absent/Holiday)"
                    >
                      <Slash className="w-3.5 h-3.5" />
                      <span>Canceled</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

