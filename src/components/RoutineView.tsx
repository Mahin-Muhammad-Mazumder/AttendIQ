import React, { useState } from 'react';
import {
  Subject,
  TimetableSlot,
  SemesterConfig,
  DayOfWeek,
  AcademicExclusion,
} from '../types';
import {
  ACTIVE_WEEKDAYS,
  DAY_NAMES,
  calculateSemesterProjections,
} from '../utils/timetableProjections';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Archive,
  Download,
  Upload,
  BookOpen,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface RoutineViewProps {
  semester: SemesterConfig;
  onUpdateSemester: (config: SemesterConfig) => void;
  subjects: Subject[];
  onAddSubject: (subject: Subject) => void;
  onUpdateSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  timetable: TimetableSlot[];
  onAddSlot: (slot: TimetableSlot) => void;
  onUpdateSlot?: (slot: TimetableSlot) => void;
  onRemoveSlot: (slotId: string) => void;
  onImportTimetable: (data: {
    semester?: SemesterConfig;
    subjects?: Subject[];
    timetable?: TimetableSlot[];
  }) => void;
  exclusions?: AcademicExclusion[];
}

export const RoutineView: React.FC<RoutineViewProps> = ({
  semester,
  onUpdateSemester,
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  timetable,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  onImportTimetable,
  exclusions = [],
}) => {
  // Modal states
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotDay, setSlotDay] = useState<DayOfWeek>('sunday');
  const [slotSubjectId, setSlotSubjectId] = useState(subjects[0]?.id || '');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('10:30');
  const [slotRoom, setSlotRoom] = useState('');

  // Subject Form State
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subCredits, setSubCredits] = useState(3);
  const [subTarget, setSubTarget] = useState(75);
  const [subColor, setSubColor] = useState('#4f46e5');
  const [subRoom, setSubRoom] = useState('');
  const [subInstructor, setSubInstructor] = useState('');

  // Projections (strictly aware of Friday/Saturday weekends & exclusions)
  const projections = calculateSemesterProjections(timetable, semester, exclusions);
  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const openAddSubject = () => {
    setEditingSubject(null);
    setSubName('');
    setSubCode('');
    setSubCredits(3);
    setSubTarget(75);
    setSubColor('#4f46e5');
    setSubRoom('');
    setSubInstructor('');
    setShowSubjectModal(true);
  };

  const openEditSubject = (sub: Subject) => {
    setEditingSubject(sub);
    setSubName(sub.name);
    setSubCode(sub.code);
    setSubCredits(sub.credits);
    setSubTarget(sub.targetPercentage);
    setSubColor(sub.color);
    setSubRoom(sub.room || '');
    setSubInstructor(sub.instructor || '');
    setShowSubjectModal(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subCode.trim()) return;

    if (editingSubject) {
      onUpdateSubject({
        ...editingSubject,
        name: subName.trim(),
        code: subCode.trim().toUpperCase(),
        credits: Number(subCredits),
        targetPercentage: Number(subTarget),
        color: subColor,
        room: subRoom.trim(),
        instructor: subInstructor.trim(),
      });
      showToast('success', `Subject ${subCode.trim().toUpperCase()} updated and saved.`);
    } else {
      const newSubject: Subject = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: subName.trim(),
        code: subCode.trim().toUpperCase(),
        credits: Number(subCredits),
        targetPercentage: Number(subTarget),
        color: subColor,
        isArchived: false,
        room: subRoom.trim(),
        instructor: subInstructor.trim(),
      };
      onAddSubject(newSubject);
      if (!slotSubjectId) {
        setSlotSubjectId(newSubject.id);
      }
      showToast('success', `Subject ${newSubject.code} added and saved.`);
    }
    setShowSubjectModal(false);
  };

  const openAddSlotModal = (day: DayOfWeek = 'sunday') => {
    setEditingSlotId(null);
    setSlotDay(day);
    setSlotSubjectId(subjects[0]?.id || '');
    setSlotStartTime('09:00');
    setSlotEndTime('10:30');
    setSlotRoom('');
    setShowSlotModal(true);
  };

  const openEditSlotModal = (slot: TimetableSlot) => {
    setEditingSlotId(slot.id);
    setSlotDay(slot.dayOfWeek === 'friday' || slot.dayOfWeek === 'saturday' ? 'sunday' : slot.dayOfWeek);
    setSlotSubjectId(slot.subjectId);
    setSlotStartTime(slot.startTime);
    setSlotEndTime(slot.endTime);
    setSlotRoom(slot.room || '');
    setShowSlotModal(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const targetSubjectId = slotSubjectId || subjects[0]?.id;
    if (!targetSubjectId) return;

    if (editingSlotId && onUpdateSlot) {
      onUpdateSlot({
        id: editingSlotId,
        subjectId: targetSubjectId,
        dayOfWeek: slotDay,
        startTime: slotStartTime,
        endTime: slotEndTime,
        room: slotRoom.trim(),
      });
      showToast('success', `Routine slot updated for ${DAY_NAMES[slotDay]}.`);
    } else {
      const newSlot: TimetableSlot = {
        id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        subjectId: targetSubjectId,
        dayOfWeek: slotDay,
        startTime: slotStartTime,
        endTime: slotEndTime,
        room: slotRoom.trim(),
      };
      onAddSlot(newSlot);
      showToast('success', `New routine slot saved for ${DAY_NAMES[slotDay]}.`);
    }
    setShowSlotModal(false);
  };

  const handleExportJSON = () => {
    const exportData = {
      semester,
      subjects,
      timetable,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `${semester.name.toLowerCase().replace(/\s+/g, '-')}-routine.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onImportTimetable(parsed);
        showToast('success', 'Routine timetable and subject data imported and saved!');
      } catch {
        showToast('error', 'Invalid JSON timetable format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Semester Date Range Setup Card */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Semester Calendar & Term Boundary Setup
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Expected class projections are dynamically computed from this date span across your 5-day (Sun–Thu) weekly timetable.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Routine</span>
            </button>

            <label className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.08] text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/[0.07]">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Semester Term Title
            </label>
            <input
              type="text"
              value={semester.name}
              onChange={(e) => onUpdateSemester({ ...semester, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-xl bg-[#030308] text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Semester Start Date
            </label>
            <input
              type="date"
              value={semester.startDate}
              onChange={(e) => onUpdateSemester({ ...semester, startDate: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono tracking-tight border border-white/[0.1] rounded-xl bg-[#030308] text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Semester End Date
            </label>
            <input
              type="date"
              value={semester.endDate}
              onChange={(e) => onUpdateSemester({ ...semester, endDate: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono tracking-tight border border-white/[0.1] rounded-xl bg-[#030308] text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Subject Management & Total Class Projections */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Subject Management & Projections (<span className="font-mono tracking-tight">{subjects.length}</span>)
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, edit, or archive course modules. Expected classes update automatically from your 5-day timetable.
            </p>
          </div>

          <button
            onClick={openAddSubject}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Subject & Code</th>
                <th className="py-2.5 px-3">Credits</th>
                <th className="py-2.5 px-3">Weekly Slots</th>
                <th className="py-2.5 px-3">Expected Semester Classes</th>
                <th className="py-2.5 px-3">Target %</th>
                <th className="py-2.5 px-3">Instructor / Room</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {subjects.map((sub) => {
                const weeklyCount = timetable.filter(
                  (s) =>
                    s.subjectId === sub.id &&
                    s.dayOfWeek !== 'friday' &&
                    s.dayOfWeek !== 'saturday'
                ).length;
                const totalProjected = projections[sub.id] || 0;

                return (
                  <tr
                    key={sub.id}
                    className={`hover:bg-white/[0.03] transition ${
                      sub.isArchived ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                        <div>
                          <div className="font-mono tracking-tight font-bold text-white flex items-center space-x-1.5">
                            <span>{sub.code}</span>
                            {sub.isArchived && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 uppercase font-bold">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px]">{sub.name}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono tracking-tight font-semibold text-slate-300">
                      {sub.credits} Credits
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 font-mono tracking-tight font-semibold text-[11px]">
                        {weeklyCount} / week
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono tracking-tight font-bold text-cyan-400">
                        {totalProjected} classes
                      </div>
                      <div className="text-[10px] font-mono tracking-tight text-slate-500">
                        ({(totalProjected * sub.credits).toFixed(0)} study hrs)
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono tracking-tight font-bold text-white">
                        {sub.targetPercentage}%
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">minimum</span>
                    </td>

                    <td className="py-3 px-3 text-slate-400">
                      {sub.instructor || 'Staff'} {sub.room ? `• ${sub.room}` : ''}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditSubject(sub)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-400 transition"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            onUpdateSubject({ ...sub, isArchived: !sub.isArchived })
                          }
                          className="p-1 rounded text-slate-400 hover:text-indigo-400 transition"
                          title={sub.isArchived ? 'Unarchive' : 'Archive'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteSubjectId === sub.id ? (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                onDeleteSubject(sub.id);
                                setConfirmDeleteSubjectId(null);
                                showToast('success', `Subject ${sub.code} deleted.`);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteSubjectId(null)}
                              className="px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteSubjectId(sub.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly Routine Timetable Matrix (5 Days a Week: Sunday - Thursday) */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Weekly Class Routine Matrix (5 Days / Week)
                </span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-tight font-bold bg-indigo-500/10 text-cyan-300 border border-indigo-500/30">
                Sun – Thu Active • Fri & Sat Weekend
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              5 instructional days per week (Sunday to Thursday). Friday and Saturday are official weekends and auto-excluded.
            </p>
          </div>

          <button
            onClick={() => openAddSlotModal('sunday')}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Routine Slot</span>
          </button>
        </div>

        {/* Timetable Columns for the 5 Active Days of the Week (Sunday - Thursday) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {ACTIVE_WEEKDAYS.map((day) => {
            const daySlots = timetable
              .filter((slot) => slot.dayOfWeek === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            return (
              <div
                key={day}
                className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.07] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.07]">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      {DAY_NAMES[day]}
                    </span>
                    <span className="text-[10px] font-mono tracking-tight font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                      {daySlots.length}
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs italic">
                      No classes
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => {
                        const sub = subjectMap.get(slot.subjectId);
                        if (!sub) return null;

                        return (
                          <div
                            key={slot.id}
                            className="bg-[#090a14]/90 rounded-xl p-2.5 border border-white/[0.07] hover:border-indigo-500/40 transition group relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono tracking-tight font-bold text-xs text-white flex items-center space-x-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: sub.color }}
                                />
                                <span>{sub.code}</span>
                              </span>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => openEditSlotModal(slot)}
                                  className="text-slate-400 hover:text-cyan-400 transition p-0.5"
                                  title="Edit Slot"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    onRemoveSlot(slot.id);
                                    showToast('success', 'Routine slot removed.');
                                  }}
                                  className="text-slate-400 hover:text-rose-400 transition p-0.5"
                                  title="Delete Slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-300 truncate mt-0.5">
                              {sub.name}
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono tracking-tight text-slate-400 mt-2 pt-1 border-t border-white/[0.06]">
                              <span className="font-medium text-cyan-300">
                                {slot.startTime} - {slot.endTime}
                              </span>
                              {(slot.room || sub.room) && (
                                <span className="flex items-center text-slate-400">
                                  <MapPin className="w-2.5 h-2.5 mr-0.5 text-indigo-400" />
                                  {slot.room || sub.room}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openAddSlotModal(day)}
                  className="w-full mt-2.5 py-1.5 rounded-lg border border-dashed border-white/[0.12] text-slate-400 hover:text-cyan-400 hover:border-indigo-500/40 text-[11px] font-medium flex items-center justify-center space-x-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Slot</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#090a14]/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 border border-white/[0.1] ring-1 ring-inset ring-white/[0.06] shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent mb-4">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>

            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject Code (e.g., CS-301)
                </label>
                <input
                  type="text"
                  required
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  placeholder="CS-301"
                  className="w-full px-3 py-2 text-xs font-mono tracking-tight border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Algorithms & Data Structures"
                  className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Credits / Weight
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={subCredits}
                    onChange={(e) => setSubCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono tracking-tight border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Minimum %
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={subTarget}
                    onChange={(e) => setSubTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono tracking-tight border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Color Badge
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={subColor}
                      onChange={(e) => setSubColor(e.target.value)}
                      className="w-9 h-8 p-0 border border-white/[0.1] rounded cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono tracking-tight text-slate-400">{subColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Classroom / Room
                  </label>
                  <input
                    type="text"
                    value={subRoom}
                    onChange={(e) => setSubRoom(e.target.value)}
                    placeholder="Hall 304"
                    className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Instructor / Professor
                </label>
                <input
                  type="text"
                  value={subInstructor}
                  onChange={(e) => setSubInstructor(e.target.value)}
                  placeholder="Prof. Vance"
                  className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 shadow-[0_0_20px_rgba(124,58,237,0.35)] rounded-xl transition"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#090a14]/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 border border-white/[0.1] ring-1 ring-inset ring-white/[0.06] shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]">
            <h3 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent mb-4">
              {editingSlotId ? `Edit Routine Slot` : `Add Routine Slot to ${DAY_NAMES[slotDay]}`}
            </h3>

            <form onSubmit={handleSaveSlot} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={slotSubjectId || subjects[0]?.id || ''}
                  onChange={(e) => setSlotSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-xl bg-[#030308] text-slate-200"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Day of Week (5-Day Active Schedule: Sun – Thu)
                </label>
                <select
                  value={slotDay}
                  onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                  className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-xl bg-[#030308] text-slate-200"
                >
                  {ACTIVE_WEEKDAYS.map((day) => (
                    <option key={day} value={day}>
                      {DAY_NAMES[day]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tracking-tight border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tracking-tight border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Specific Classroom / Lab (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab 2"
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-white/[0.1] rounded-xl bg-[#030308] text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 shadow-[0_0_20px_rgba(124,58,237,0.35)] rounded-xl transition"
                >
                  {editingSlotId ? 'Save Changes' : 'Add Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
