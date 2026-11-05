import React, { useState } from 'react';
import {
  Subject,
  TimetableSlot,
  AttendanceRecord,
  AttendanceStatus,
  SemesterConfig,
  AcademicExclusion,
} from '../types';
import {
  getSlotsForDate,
  getDayOfWeek,
  formatFriendlyDate,
  formatDate,
  DAY_NAMES,
  getExclusionForDate,
} from '../utils/timetableProjections';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Slash,
  Clock,
  MapPin,
  User,
  Info,
  Plus,
  Sparkles,
  RotateCcw,
  Check,
  PauseCircle,
  Building2,
  BookOpen,
  Palmtree,
  CalendarDays,
} from 'lucide-react';

interface DailyLoggerViewProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  subjects: Subject[];
  timetable: TimetableSlot[];
  records: AttendanceRecord[];
  onUpdateRecord: (record: AttendanceRecord) => void;
  onRemoveRecord: (recordId: string) => void;
  semester: SemesterConfig;
  exclusions?: AcademicExclusion[];
  onNavigateToCalendar?: () => void;
}

export const DailyLoggerView: React.FC<DailyLoggerViewProps> = ({
  selectedDate,
  setSelectedDate,
  subjects,
  timetable,
  records,
  onUpdateRecord,
  onRemoveRecord,
  semester,
  exclusions = [],
  onNavigateToCalendar,
}) => {
  const [showAddAdhoc, setShowAddAdhoc] = useState(false);
  const [adhocSubjectId, setAdhocSubjectId] = useState(subjects[0]?.id || '');
  const [adhocStatus, setAdhocStatus] = useState<AttendanceStatus>('present');
  const [adhocNote, setAdhocNote] = useState('');

  const dayOfWeek = getDayOfWeek(selectedDate);
  const scheduledSlots = getSlotsForDate(selectedDate, timetable);
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  // Check if selected date is an official exclusion (holiday, exam week, vacation)
  const activeExclusion = getExclusionForDate(selectedDate, exclusions);

  // Get records for the selected date
  const dateRecords = records.filter((r) => r.date === selectedDate);
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

  // Shift date backward or forward (clamped to semester startDate and endDate)
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const nextDate = formatDate(d);
    if (semester.startDate && nextDate < semester.startDate) {
      setSelectedDate(semester.startDate);
    } else if (semester.endDate && nextDate > semester.endDate) {
      setSelectedDate(semester.endDate);
    } else {
      setSelectedDate(nextDate);
    }
  };

  const handleSetToday = () => {
    const defaultDate = '2026-09-10';
    if (semester.startDate && defaultDate < semester.startDate) {
      setSelectedDate(semester.startDate);
    } else if (semester.endDate && defaultDate > semester.endDate) {
      setSelectedDate(semester.endDate);
    } else {
      setSelectedDate(defaultDate);
    }
  };

  const handleStatusSelect = (
    subjectId: string,
    slotId: string | undefined,
    status: AttendanceStatus,
    existingRecord?: AttendanceRecord
  ) => {
    // Clicking the already-selected status button unchecks/removes it
    if (existingRecord && existingRecord.status === status) {
      onRemoveRecord(existingRecord.id);
      return;
    }

    const newRecord: AttendanceRecord = {
      id: existingRecord ? existingRecord.id : `rec_${selectedDate}_${slotId || subjectId}`,
      date: selectedDate,
      subjectId,
      timetableSlotId: slotId,
      status,
      note: existingRecord?.note || '',
      timestamp: Date.now(),
    };
    onUpdateRecord(newRecord);
  };

  const handleNoteChange = (
    _subjectId: string,
    slotId: string | undefined,
    note: string,
    existingRecord?: AttendanceRecord
  ) => {
    // Only update note if the user has already clicked Present, Absent, or Canceled
    if (!existingRecord) return;
    onUpdateRecord({
      ...existingRecord,
      timetableSlotId: slotId || existingRecord.timetableSlotId,
      note,
      timestamp: Date.now(),
    });
  };

  const handleMarkAllPresent = () => {
    for (const slot of scheduledSlots) {
      const existing = getRecordForSlot(slot);
      onUpdateRecord({
        id: existing ? existing.id : `rec_${selectedDate}_${slot.id}`,
        date: selectedDate,
        subjectId: slot.subjectId,
        timetableSlotId: slot.id,
        status: 'present',
        note: existing?.note || 'Routine schedule confirmed',
        timestamp: Date.now(),
      });
    }
  };

  const handleClearDateLogs = () => {
    for (const rec of dateRecords) {
      onRemoveRecord(rec.id);
    }
  };

  const handleCreateAdhoc = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSubId = adhocSubjectId || subjects[0]?.id;
    if (!targetSubId) return;

    const newRecord: AttendanceRecord = {
      id: `adhoc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: selectedDate,
      subjectId: targetSubId,
      status: adhocStatus,
      note: adhocNote || 'Ad-hoc / Makeup session',
      timestamp: Date.now(),
    };
    onUpdateRecord(newRecord);
    setShowAddAdhoc(false);
    setAdhocNote('');
  };

  // Compute daily counts (Conducted = Present + Absent)
  let dailyPresent = 0;
  let dailyAbsent = 0;
  let dailyCanceled = 0;

  for (const r of dateRecords) {
    if (r.status === 'present') dailyPresent++;
    else if (r.status === 'absent') dailyAbsent++;
    else if (r.status === 'canceled') dailyCanceled++;
  }
  const dailyConducted = dailyPresent + dailyAbsent;

  return (
    <div className="space-y-6">
      {/* Date Navigation & Summary Card */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Date Picker and Stepper */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={selectedDate}
                min={semester.startDate}
                max={semester.endDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (semester.startDate && val < semester.startDate) {
                    setSelectedDate(semester.startDate);
                  } else if (semester.endDate && val > semester.endDate) {
                    setSelectedDate(semester.endDate);
                  } else {
                    setSelectedDate(val);
                  }
                }}
                className="px-3 py-2 border border-white/[0.1] rounded-xl text-sm font-mono tracking-tight font-semibold bg-[#030308]/80 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleSetToday}
                className="px-3 py-2 text-xs font-mono tracking-tight font-semibold rounded-xl bg-indigo-500/10 text-cyan-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition"
              >
                Today (Sep 10)
              </button>
            </div>

            <button
              onClick={() => shiftDate(1)}
              className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white transition"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Date Actions */}
          <div className="flex items-center space-x-2">
            {scheduledSlots.length > 0 && (
              <button
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] hover:opacity-95 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Check className="w-4 h-4" />
                <span>Mark All Present</span>
              </button>
            )}
            <button
              onClick={() => setShowAddAdhoc(!showAddAdhoc)}
              className="px-3 py-2 bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.08] text-slate-200 rounded-xl text-xs font-medium flex items-center space-x-1 transition"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ad-hoc Class</span>
            </button>
            {dateRecords.length > 0 && (
              <button
                onClick={handleClearDateLogs}
                className="px-2.5 py-2 text-slate-400 hover:text-rose-400 text-xs font-medium transition"
                title="Clear all logs for this date"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Date Context Header */}
        <div className="mt-4 pt-4 border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              {formatFriendlyDate(selectedDate)}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium capitalize">
              {DAY_NAMES[dayOfWeek]} Routine
            </span>
            <span className="text-[11px] font-mono tracking-tight text-slate-500">
              (Active Window: {semester.startDate} to {semester.endDate})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono tracking-tight">
            <span className="text-slate-400">
              Scheduled: <strong className="text-white">{scheduledSlots.length}</strong>
            </span>
            <span className="text-white font-bold">
              Conducted: {dailyConducted}
            </span>
            <span className="text-emerald-400 font-semibold">
              Present: {dailyPresent}
            </span>
            <span className="text-rose-400 font-semibold">
              Absent: {dailyAbsent}
            </span>
            <span className="text-slate-400 font-semibold flex items-center">
              <Slash className="w-3 h-3 mr-0.5" /> Canceled: {dailyCanceled}
            </span>
          </div>
        </div>
      </div>

      {/* Official Holiday / Exam Exclusion Pause Banner */}
      {activeExclusion && (
        <div className="p-4 rounded-2xl border border-indigo-500/30 bg-[#090a14]/80 backdrop-blur-xl text-slate-200 text-xs shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-cyan-400 shrink-0">
            {activeExclusion.type === 'holiday' ? (
              <Building2 className="w-5 h-5" />
            ) : activeExclusion.type === 'exam' ? (
              <BookOpen className="w-5 h-5" />
            ) : (
              <Palmtree className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                {activeExclusion.title}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-tight font-extrabold uppercase bg-indigo-500/15 text-cyan-300 border border-indigo-500/30">
                Class Counting Paused
              </span>
            </div>
            <p className="text-slate-300">
              {activeExclusion.description || 'Official academic calendar exclusion in effect.'}{' '}
              Timetable classes for this date are <strong className="text-white">automatically excluded</strong> from total semester scheduled counts. Absences are not counted against your attendance streak or safe skips.
            </p>
          </div>
          {onNavigateToCalendar && (
            <button
              onClick={onNavigateToCalendar}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] font-semibold text-xs shrink-0 transition"
            >
              View Calendar
            </button>
          )}
        </div>
      )}

      {/* Critical Rule Banner: Cancellation Exclusion Principle */}
      <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-xs shadow-sm flex items-start space-x-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white">Automated Cancellation Exclusion Logic Active:</span>
          <p className="text-slate-300">
            If a professor cancels or a university holiday occurs, mark the slot as <strong className="text-slate-100">Canceled</strong>. It is completely excluded from conducted classes (<code className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-mono tracking-tight text-cyan-300 text-[11px]">Conducted = Present + Absent</code>). It will never dilute your attendance percentage or lower your marks tier.
          </p>
        </div>
      </div>

      {/* Ad-hoc Class Creator Drawer / Panel */}
      {showAddAdhoc && (
        <div className="bg-[#090a14]/85 backdrop-blur-xl rounded-2xl p-5 border border-indigo-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Log Extra / Ad-hoc / Makeup Class
              </span>
            </h4>
            <button
              onClick={() => setShowAddAdhoc(false)}
              className="text-xs text-slate-400 hover:text-white font-semibold"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleCreateAdhoc} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={adhocSubjectId}
                onChange={(e) => setAdhocSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/[0.1] bg-[#030308] text-slate-200 text-xs font-medium"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Status
              </label>
              <select
                value={adhocStatus}
                onChange={(e) => setAdhocStatus(e.target.value as AttendanceStatus)}
                className="w-full px-3 py-2 rounded-xl border border-white/[0.1] bg-[#030308] text-slate-200 text-xs font-medium"
              >
                <option value="present">Present (Attended)</option>
                <option value="absent">Absent (Skipped)</option>
                <option value="canceled">Canceled (Excluded)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Note / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Makeup lab, revision"
                value={adhocNote}
                onChange={(e) => setAdhocNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-white/[0.1] bg-[#030308] text-slate-200 text-xs"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] rounded-xl text-xs font-semibold transition"
              >
                Record Ad-hoc
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scheduled Classes from Weekly Routine */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            Classes Scheduled for {DAY_NAMES[dayOfWeek]} (<span className="font-mono tracking-tight">{scheduledSlots.length}</span>)
          </h3>
          <span className="text-xs text-slate-400">
            Click status to toggle & update live calculations
          </span>
        </div>

        {scheduledSlots.length === 0 ? (
          <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-8 border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] text-center text-slate-400">
            <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="font-semibold text-sm text-slate-200">
              No classes scheduled in timetable for {DAY_NAMES[dayOfWeek]}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Enjoy your free day or log an ad-hoc makeup session using the button above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledSlots.map((slot) => {
              const subject = subjectMap.get(slot.subjectId);
              if (!subject) return null;

              const existingRecord = getRecordForSlot(slot);
              const currentStatus = existingRecord?.status;

              return (
                <div
                  key={slot.id}
                  className={`bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border p-4 sm:p-5 ring-1 ring-inset ring-white/[0.05] transition-all duration-300 ${
                    currentStatus === 'present'
                      ? 'border-emerald-500/40 bg-emerald-500/[0.06] shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]'
                      : currentStatus === 'absent'
                      ? 'border-rose-500/40 bg-rose-500/[0.06] shadow-[0_0_25px_-5px_rgba(244,63,94,0.25)]'
                      : currentStatus === 'canceled'
                      ? 'border-white/[0.15] bg-white/[0.03]'
                      : 'border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] hover:border-indigo-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Class details */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="font-mono tracking-tight font-bold text-sm text-white">
                          {subject.code}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          {subject.name}
                        </span>
                        <span className="text-[10px] font-mono tracking-tight px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400">
                          {subject.credits} Credits
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                        <span className="flex items-center space-x-1 font-mono tracking-tight">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </span>
                        {(slot.room || subject.room) && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{slot.room || subject.room}</span>
                          </span>
                        )}
                        {subject.instructor && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-purple-400" />
                            <span>{subject.instructor}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Status Toggles */}
                    <div className="flex items-center space-x-2">
                      {/* Present Button */}
                      <button
                        onClick={() =>
                          handleStatusSelect(subject.id, slot.id, 'present', existingRecord)
                        }
                        className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
                          currentStatus === 'present'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                            : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-emerald-500/30 hover:text-emerald-400'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Present</span>
                      </button>

                      {/* Absent Button */}
                      <button
                        onClick={() =>
                          handleStatusSelect(subject.id, slot.id, 'absent', existingRecord)
                        }
                        className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
                          currentStatus === 'absent'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                            : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-rose-500/30 hover:text-rose-400'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Absent</span>
                      </button>

                      {/* Canceled Button (Excluded) */}
                      <button
                        onClick={() =>
                          handleStatusSelect(subject.id, slot.id, 'canceled', existingRecord)
                        }
                        title="Excluded from conducted classes denominator"
                        className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
                          currentStatus === 'canceled'
                            ? 'bg-white/[0.1] text-slate-200 border-white/[0.25]'
                            : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:border-white/[0.2] hover:text-slate-200'
                        }`}
                      >
                        <Slash className="w-3.5 h-3.5" />
                        <span>Canceled</span>
                        <span className="text-[10px] opacity-80">(Excluded)</span>
                      </button>
                    </div>
                  </div>

                  {/* Note Field */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500">Note:</span>
                    <input
                      type="text"
                      placeholder="Add class topic, reason for leave, or cancel reason..."
                      value={existingRecord?.note || ''}
                      onChange={(e) =>
                        handleNoteChange(subject.id, slot.id, e.target.value, existingRecord)
                      }
                      className="flex-1 text-xs bg-transparent border-b border-dashed border-white/[0.12] focus:border-indigo-500 focus:outline-none py-0.5 text-slate-200 placeholder:text-slate-600"
                    />
                    {existingRecord && (
                      <button
                        onClick={() => onRemoveRecord(existingRecord.id)}
                        className="text-[10px] text-slate-400 hover:text-rose-400 px-1"
                        title="Clear status"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Non-routine Adhoc classes logged for today */}
      {dateRecords.filter(
        (r) =>
          !r.timetableSlotId &&
          !scheduledSlots.some((s) => s.subjectId === r.subjectId)
      ).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ad-hoc Sessions Logged on this Date
          </h4>
          {dateRecords
            .filter(
              (r) =>
                !r.timetableSlotId &&
                !scheduledSlots.some((s) => s.subjectId === r.subjectId)
            )
            .map((rec) => {
              const sub = subjectMap.get(rec.subjectId);
              return (
                <div
                  key={rec.id}
                  className="p-3.5 bg-[#090a14]/75 backdrop-blur-xl rounded-xl border border-white/[0.07] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono tracking-tight font-bold text-white">
                      {sub?.code}
                    </span>
                    <span className="text-slate-400">{sub?.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      Ad-hoc
                    </span>
                    {rec.note && <span className="text-slate-400 italic">"{rec.note}"</span>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-semibold capitalize px-2 py-0.5 rounded-md border ${
                        rec.status === 'present'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : rec.status === 'absent'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-white/[0.03] text-slate-400 border-white/[0.08]'
                      }`}
                    >
                      {rec.status}
                    </span>
                    <button
                      onClick={() => onRemoveRecord(rec.id)}
                      className="text-slate-400 hover:text-rose-400 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
