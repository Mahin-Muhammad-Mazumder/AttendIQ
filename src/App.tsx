import React, { useState, useEffect, useMemo } from 'react';
import {
  Subject,
  TimetableSlot,
  SemesterConfig,
  AttendanceRecord,
  AcademicExclusion,
} from './types';
import {
  INITIAL_SEMESTER_CONFIG,
  INITIAL_SUBJECTS,
  INITIAL_TIMETABLE,
  INITIAL_EXCLUSIONS,
  generateInitialAttendanceRecords,
} from './utils/sampleData';
import {
  calculateSemesterProjections,
  formatDate,
} from './utils/timetableProjections';
import {
  computeSubjectAnalytics,
  computeOverallAnalytics,
} from './utils/marksEngine';
import { calculateAttendanceStreakData } from './utils/streakEngine';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DailyLoggerView } from './components/DailyLoggerView';
import { RoutineView } from './components/RoutineView';
import { BunkPredictorView } from './components/BunkPredictorView';
import { ReportsView } from './components/ReportsView';
import { ArchitectureSchemaModal } from './components/ArchitectureSchemaModal';
import { ExclusionCalendarView } from './components/ExclusionCalendarView';
import { GamificationView } from './components/GamificationView';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { playSound } from './utils/audioFeedback';

export default function App() {
  // Current active view persisted in localStorage
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem('attendiq_active_tab');
      return (saved as ActiveTab) || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  // Selected date for Daily Logger (persisted in localStorage, default to 2026-09-10)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('attendiq_selected_date');
      return saved || '2026-09-10';
    } catch {
      return '2026-09-10';
    }
  });

  // Focused subject for Bunk Predictor
  const [predictorSubjectId, setPredictorSubjectId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('attendiq_predictor_subject') || undefined;
    } catch {
      return undefined;
    }
  });

  // Audio effects enabled state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('attendiq_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  // Keyboard shortcuts modal visibility
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);

  // In-app reset confirmation modal & toast banner (avoids window.confirm / window.alert)
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Persistent State with local storage fallback (keeps existing courses, weekly routine, and calendar intact)
  const [semester, setSemester] = useState<SemesterConfig>(() => {
    try {
      const saved = localStorage.getItem('attendiq_semester');
      return saved ? JSON.parse(saved) : INITIAL_SEMESTER_CONFIG;
    } catch {
      return INITIAL_SEMESTER_CONFIG;
    }
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem('attendiq_subjects');
      return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
    } catch {
      return INITIAL_SUBJECTS;
    }
  });

  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    try {
      const saved = localStorage.getItem('attendiq_timetable');
      return saved ? JSON.parse(saved) : INITIAL_TIMETABLE;
    } catch {
      return INITIAL_TIMETABLE;
    }
  });

  const [exclusions, setExclusions] = useState<AcademicExclusion[]>(() => {
    try {
      const saved = localStorage.getItem('attendiq_exclusions');
      return saved ? JSON.parse(saved) : INITIAL_EXCLUSIONS;
    } catch {
      return INITIAL_EXCLUSIONS;
    }
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem('attendiq_records');
      if (saved) {
        const parsed: AttendanceRecord[] = JSON.parse(saved);
        // Strip out pre-seeded fake sample records (id 'rec-1'..'rec-33' or timestamp < 100000)
        // so ONLY records explicitly clicked by the user (Present / Absent / Canceled) remain
        const userClickedOnly = parsed.filter(
          (r) =>
            r &&
            (r.status === 'present' || r.status === 'absent' || r.status === 'canceled') &&
            !/^rec-\d+$/.test(r.id) &&
            (typeof r.timestamp !== 'number' || r.timestamp >= 100000)
        );

        // Deduplicate by (date + timetableSlotId) or id, keeping the latest click
        const deduped = new Map<string, AttendanceRecord>();
        for (const r of userClickedOnly) {
          const key = r.timetableSlotId
            ? `${r.date}__slot__${r.timetableSlotId}`
            : `${r.date}__id__${r.id}`;
          const existing = deduped.get(key);
          if (!existing || (r.timestamp || 0) >= (existing.timestamp || 0)) {
            deduped.set(key, r);
          }
        }
        return Array.from(deduped.values());
      }
      return generateInitialAttendanceRecords();
    } catch {
      return generateInitialAttendanceRecords();
    }
  });

  // Ensure selectedDate stays within class start and end date when semester bounds change
  useEffect(() => {
    if (semester.startDate && selectedDate < semester.startDate) {
      setSelectedDate(semester.startDate);
    } else if (semester.endDate && selectedDate > semester.endDate) {
      setSelectedDate(semester.endDate);
    }
  }, [semester.startDate, semester.endDate]);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('attendiq_active_tab', activeTab);
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_selected_date', selectedDate);
    } catch (e) {
      console.error(e);
    }
  }, [selectedDate]);

  useEffect(() => {
    try {
      if (predictorSubjectId) {
        localStorage.setItem('attendiq_predictor_subject', predictorSubjectId);
      }
    } catch (e) {
      console.error(e);
    }
  }, [predictorSubjectId]);

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_semester', JSON.stringify(semester));
    } catch (e) {
      console.error(e);
    }
  }, [semester]);

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_subjects', JSON.stringify(subjects));
    } catch (e) {
      console.error(e);
    }
  }, [subjects]);

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_timetable', JSON.stringify(timetable));
    } catch (e) {
      console.error(e);
    }
  }, [timetable]);

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_exclusions', JSON.stringify(exclusions));
    } catch (e) {
      console.error(e);
    }
  }, [exclusions]);

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_records', JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }, [records]);

  // Filter records strictly between class startDate and endDate for all calculations
  const semesterBoundedRecords = useMemo(() => {
    const activeSubjectIds = new Set(subjects.filter((s) => !s.isArchived).map((s) => s.id));
    return records.filter((r) => {
      if (!activeSubjectIds.has(r.subjectId)) return false;
      if (r.status !== 'present' && r.status !== 'absent' && r.status !== 'canceled') return false;
      if (semester.startDate && r.date < semester.startDate) return false;
      if (semester.endDate && r.date > semester.endDate) return false;
      return true;
    });
  }, [records, semester.startDate, semester.endDate, subjects]);

  // Projections & Analytics Computation (Strictly between semester.startDate and semester.endDate)
  const projections = useMemo(() => {
    return calculateSemesterProjections(timetable, semester, exclusions);
  }, [timetable, semester, exclusions]);

  const subjectAnalyticsList = useMemo(() => {
    return subjects
      .filter((s) => !s.isArchived)
      .map((sub) => {
        const totalProjected = projections[sub.id] || 0;
        return computeSubjectAnalytics(
          sub,
          semesterBoundedRecords,
          totalProjected,
          semester.startDate,
          semester.endDate
        );
      });
  }, [subjects, semesterBoundedRecords, projections, semester.startDate, semester.endDate]);

  const overall = useMemo(() => {
    return computeOverallAnalytics(subjectAnalyticsList);
  }, [subjectAnalyticsList]);

  // Compute Gamification Streaks & Badges strictly from semester-bounded clicked records
  const streakData = useMemo(() => {
    return calculateAttendanceStreakData(semesterBoundedRecords, subjectAnalyticsList, exclusions);
  }, [semesterBoundedRecords, subjectAnalyticsList, exclusions]);

  // System-wide Ambient Nebula state tied to course attendance health
  const hasCriticalRiskCourse = useMemo(() => {
    return subjectAnalyticsList.some((sa) => sa.attendancePercentage < 70);
  }, [subjectAnalyticsList]);

  const allCoursesHighAurora = useMemo(() => {
    return (
      subjectAnalyticsList.length > 0 &&
      subjectAnalyticsList.every((sa) => sa.attendancePercentage >= 85)
    );
  }, [subjectAnalyticsList]);


  // Handlers with synchronous localStorage persistence
  const handleUpdateSemester = (newSemester: SemesterConfig) => {
    setSemester(newSemester);
    try {
      localStorage.setItem('attendiq_semester', JSON.stringify(newSemester));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRecord = (newRec: AttendanceRecord) => {
    // Only allow valid clicked statuses within class start and end date
    if (
      newRec.status !== 'present' &&
      newRec.status !== 'absent' &&
      newRec.status !== 'canceled'
    ) {
      return;
    }
    setRecords((prev) => {
      // Remove any existing record for the same id OR same (date + timetableSlotId)
      // OR legacy non-adhoc record for the same (date + subjectId) when updating a routine slot
      const filtered = prev.filter((r) => {
        if (r.id === newRec.id) return false;
        if (
          newRec.timetableSlotId &&
          r.date === newRec.date &&
          r.timetableSlotId === newRec.timetableSlotId
        ) {
          return false;
        }
        if (
          newRec.timetableSlotId &&
          !r.timetableSlotId &&
          !r.id.startsWith('adhoc-') &&
          r.date === newRec.date &&
          r.subjectId === newRec.subjectId
        ) {
          return false;
        }
        return true;
      });
      const next = [...filtered, newRec];
      try {
        localStorage.setItem('attendiq_records', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleRemoveRecord = (recordId: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== recordId);
      try {
        localStorage.setItem('attendiq_records', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleAddSubject = (newSubject: Subject) => {
    setSubjects((prev) => {
      const next = [...prev, newSubject];
      try {
        localStorage.setItem('attendiq_subjects', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleUpdateSubject = (updated: Subject) => {
    setSubjects((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      try {
        localStorage.setItem('attendiq_subjects', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects((prev) => {
      const next = prev.filter((s) => s.id !== subjectId);
      try {
        localStorage.setItem('attendiq_subjects', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    setTimetable((prev) => {
      const next = prev.filter((t) => t.subjectId !== subjectId);
      try {
        localStorage.setItem('attendiq_timetable', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    setRecords((prev) => {
      const next = prev.filter((r) => r.subjectId !== subjectId);
      try {
        localStorage.setItem('attendiq_records', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleAddSlot = (newSlot: TimetableSlot) => {
    setTimetable((prev) => {
      const next = [...prev, newSlot];
      try {
        localStorage.setItem('attendiq_timetable', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleUpdateSlot = (updatedSlot: TimetableSlot) => {
    setTimetable((prev) => {
      const next = prev.map((t) => (t.id === updatedSlot.id ? updatedSlot : t));
      try {
        localStorage.setItem('attendiq_timetable', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleRemoveSlot = (slotId: string) => {
    setTimetable((prev) => {
      const next = prev.filter((t) => t.id !== slotId);
      try {
        localStorage.setItem('attendiq_timetable', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleAddExclusion = (newExclusion: AcademicExclusion) => {
    setExclusions((prev) => {
      const next = [...prev, newExclusion];
      try {
        localStorage.setItem('attendiq_exclusions', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleUpdateExclusion = (updated: AcademicExclusion) => {
    setExclusions((prev) => {
      const next = prev.map((e) => (e.id === updated.id ? updated : e));
      try {
        localStorage.setItem('attendiq_exclusions', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleDeleteExclusion = (id: string) => {
    setExclusions((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem('attendiq_exclusions', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleImportTimetable = (data: {
    semester?: SemesterConfig;
    subjects?: Subject[];
    timetable?: TimetableSlot[];
  }) => {
    if (data.semester) handleUpdateSemester(data.semester);
    if (data.subjects && Array.isArray(data.subjects)) {
      setSubjects(data.subjects);
      try {
        localStorage.setItem('attendiq_subjects', JSON.stringify(data.subjects));
      } catch (e) {
        console.error(e);
      }
    }
    if (data.timetable && Array.isArray(data.timetable)) {
      setTimetable(data.timetable);
      try {
        localStorage.setItem('attendiq_timetable', JSON.stringify(data.timetable));
      } catch (e) {
        console.error(e);
      }
    }
    showToast('Routine timetable and subject data imported and saved!');
  };

  const handleResetDemo = () => {
    setShowResetConfirm(true);
  };

  const confirmResetDemo = () => {
    const initialRecords = generateInitialAttendanceRecords();
    setSemester(INITIAL_SEMESTER_CONFIG);
    setSubjects(INITIAL_SUBJECTS);
    setTimetable(INITIAL_TIMETABLE);
    setExclusions(INITIAL_EXCLUSIONS);
    setRecords(initialRecords);
    setSelectedDate('2026-09-10');
    setActiveTab('dashboard');
    try {
      localStorage.setItem('attendiq_semester', JSON.stringify(INITIAL_SEMESTER_CONFIG));
      localStorage.setItem('attendiq_subjects', JSON.stringify(INITIAL_SUBJECTS));
      localStorage.setItem('attendiq_timetable', JSON.stringify(INITIAL_TIMETABLE));
      localStorage.setItem('attendiq_exclusions', JSON.stringify(INITIAL_EXCLUSIONS));
      localStorage.setItem('attendiq_records', JSON.stringify(initialRecords));
      localStorage.setItem('attendiq_selected_date', '2026-09-10');
      localStorage.setItem('attendiq_active_tab', 'dashboard');
    } catch (e) {
      console.error(e);
    }
    setShowResetConfirm(false);
    showToast('Sample semester dataset restored and saved.');
  };

  const handleOpenPredictor = (subjectId?: string) => {
    if (subjectId) {
      setPredictorSubjectId(subjectId);
    }
    setActiveTab('predictor');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('attendiq_sound_enabled', String(next));
    } catch (e) {
      console.error(e);
    }
    if (next) playSound('success');
  };

  // Global Keyboard Shortcuts for Students
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form controls
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        setActiveTab('dashboard');
        playSound('toggle');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveTab('logger');
        playSound('toggle');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveTab('routine');
        playSound('toggle');
      } else if (e.key === '4') {
        e.preventDefault();
        setActiveTab('predictor');
        playSound('toggle');
      } else if (e.key === '5') {
        e.preventDefault();
        setActiveTab('calendar');
        playSound('toggle');
      } else if (e.key === '6') {
        e.preventDefault();
        setActiveTab('gamification');
        playSound('toggle');
      } else if (e.key === '7') {
        e.preventDefault();
        setActiveTab('reports');
        playSound('toggle');
      } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        playSound('toggle');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleSound();
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowResetConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundEnabled]);

  return (
    <div className="min-h-screen bg-[#030308] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden transition-all duration-700 ease-out">
      {/* Deep Space Obsidian Canvas, Starlight Dot Grid & Ambient Nebula Mesh Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Ultra-faint Starlight Dot Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Top-Left Ambient Aura */}
        <div className="absolute -top-36 -left-24 w-[520px] h-[520px] bg-purple-900/15 blur-[130px] rounded-full pointer-events-none transition-all duration-700 ease-out" />

        {/* Top-Right Ambient Aura (Dynamic shift on critical risk or high aurora) */}
        <div
          className={`absolute -top-36 -right-24 w-[560px] h-[560px] blur-[130px] rounded-full pointer-events-none transition-all duration-700 ease-out ${
            hasCriticalRiskCourse
              ? 'bg-rose-900/25 scale-105'
              : allCoursesHighAurora
              ? 'bg-emerald-900/20 scale-105'
              : 'bg-indigo-900/15 scale-100'
          }`}
        />

        {/* Bottom-Center Ambient Aura */}
        <div
          className={`absolute -bottom-44 left-1/2 -translate-x-1/2 w-[680px] h-[480px] blur-[150px] rounded-full pointer-events-none transition-all duration-700 ease-out ${
            hasCriticalRiskCourse
              ? 'bg-fuchsia-900/15'
              : allCoursesHighAurora
              ? 'bg-cyan-900/18'
              : 'bg-cyan-900/10'
          }`}
        />
      </div>

      {/* Sticky Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        overall={overall}
        onResetDemo={handleResetDemo}
        selectedDate={selectedDate}
        streakData={streakData}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
      />

      {/* In-app Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#070812]/90 backdrop-blur-md border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)] text-xs font-bold flex items-center space-x-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* In-app Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090a14]/90 backdrop-blur-xl border border-white/[0.07] ring-1 ring-inset ring-white/[0.05] rounded-2xl max-w-md w-full p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
            <h3 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              Reset Attendance Calculations?
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              This will clear all clicked Present, Absent, and Canceled attendance counts back to 0 while keeping your existing course names, weekly timetable, and course calendar intact.
            </p>
            <div className="flex items-center justify-end space-x-2.5 mt-5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setRecords([]);
                  try {
                    localStorage.setItem('attendiq_records', JSON.stringify([]));
                  } catch (e) {
                    console.error(e);
                  }
                  setShowResetConfirm(false);
                  showToast('Attendance counts reset to 0. Courses, weekly routine, and calendar kept intact.');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)] transition cursor-pointer"
              >
                Clear Attendance Counts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-700 ease-out">
        {activeTab === 'dashboard' && (
          <DashboardView
            analyticsList={subjectAnalyticsList}
            overall={overall}
            semester={semester}
            records={semesterBoundedRecords}
            onOpenLogger={() => setActiveTab('logger')}
            onOpenPredictor={handleOpenPredictor}
            streakData={streakData}
            exclusions={exclusions}
            onOpenGamification={() => setActiveTab('gamification')}
            onOpenCalendar={() => setActiveTab('calendar')}
            subjects={subjects.filter((s) => !s.isArchived)}
            timetable={timetable}
            currentDate={selectedDate}
            onDateChange={setSelectedDate}
            onUpdateRecord={handleUpdateRecord}
            onRemoveRecord={handleRemoveRecord}
          />
        )}

        {activeTab === 'logger' && (
          <DailyLoggerView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            subjects={subjects.filter((s) => !s.isArchived)}
            timetable={timetable}
            records={semesterBoundedRecords}
            onUpdateRecord={handleUpdateRecord}
            onRemoveRecord={handleRemoveRecord}
            semester={semester}
            exclusions={exclusions}
            onNavigateToCalendar={() => setActiveTab('calendar')}
          />
        )}

        {activeTab === 'routine' && (
          <RoutineView
            semester={semester}
            onUpdateSemester={handleUpdateSemester}
            subjects={subjects}
            onAddSubject={handleAddSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
            timetable={timetable}
            onAddSlot={handleAddSlot}
            onUpdateSlot={handleUpdateSlot}
            onRemoveSlot={handleRemoveSlot}
            onImportTimetable={handleImportTimetable}
            exclusions={exclusions}
          />
        )}

        {activeTab === 'predictor' && (
          <BunkPredictorView
            analyticsList={subjectAnalyticsList}
            initialSubjectId={predictorSubjectId}
          />
        )}

        {activeTab === 'calendar' && (
          <ExclusionCalendarView
            exclusions={exclusions}
            onAddExclusion={handleAddExclusion}
            onUpdateExclusion={handleUpdateExclusion}
            onRemoveExclusion={handleDeleteExclusion}
            onDeleteExclusion={handleDeleteExclusion}
            semester={semester}
            timetable={timetable}
            subjects={subjects}
            onSelectDateToLog={(date) => {
              setSelectedDate(date);
              setActiveTab('logger');
            }}
            onJumpToLogger={(date) => {
              setSelectedDate(date);
              setActiveTab('logger');
            }}
          />
        )}

        {activeTab === 'gamification' && (
          <GamificationView
            streakData={streakData}
            overall={overall}
            onOpenLogger={() => setActiveTab('logger')}
            onOpenCalendar={() => setActiveTab('calendar')}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            analyticsList={subjectAnalyticsList}
            overall={overall}
            records={semesterBoundedRecords}
            subjects={subjects}
            semester={semester}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureSchemaModal />}
      </main>

      {/* Application Footer */}
      <footer className="relative z-10 border-t border-white/[0.07] py-4 text-center text-xs text-slate-400 bg-[#090a14]/75 backdrop-blur-xl print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              AttendIQ Academic Engine
            </span>
            <span> • Automated routine projection, cancellation exclusion & marks scaling</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono tracking-tight">
            <span>Semester Span: {semester.startDate} to {semester.endDate}</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('architecture')}
              className="text-cyan-400 hover:text-indigo-300 hover:underline font-sans font-medium cursor-pointer"
            >
              View System Architecture
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}

