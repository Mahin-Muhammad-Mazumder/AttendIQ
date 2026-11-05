import { Subject, TimetableSlot, SemesterConfig, AttendanceRecord, AcademicExclusion } from '../types';

export const INITIAL_SEMESTER_CONFIG: SemesterConfig = {
  id: 'sem-fall-2026',
  name: 'Fall 2026 Semester',
  startDate: '2026-08-17',
  endDate: '2026-12-18',
  defaultTargetPercentage: 75,
};

export const INITIAL_EXCLUSIONS: AcademicExclusion[] = [
  {
    id: 'ex-1',
    title: 'Labor Day (National Holiday)',
    type: 'holiday',
    startDate: '2026-09-07',
    endDate: '2026-09-07',
    description: 'Federal holiday — university campus closed, routine lectures paused.',
  },
  {
    id: 'ex-2',
    title: 'Mid-Term Exam Week',
    type: 'exam',
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    description: 'Mid-term written exam evaluations period. Regular timetable classes suspended.',
  },
  {
    id: 'ex-3',
    title: 'Fall Reading Recess',
    type: 'vacation',
    startDate: '2026-11-02',
    endDate: '2026-11-03',
    description: 'Autonomous research and project study days. Class counting paused.',
  },
  {
    id: 'ex-4',
    title: 'Thanksgiving Break',
    type: 'holiday',
    startDate: '2026-11-25',
    endDate: '2026-11-27',
    description: 'Official university Thanksgiving recess.',
  },
];

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-cs301',
    code: 'CS-301',
    name: 'Algorithms & Data Structures',
    credits: 4,
    targetPercentage: 80,
    color: '#4f46e5', // indigo
    isArchived: false,
    room: 'Hall 304',
    instructor: 'Prof. Vance',
  },
  {
    id: 'sub-phys202',
    code: 'PHYS-202',
    name: 'Classical Mechanics & Waves',
    credits: 4,
    targetPercentage: 75,
    color: '#0284c7', // sky
    isArchived: false,
    room: 'Physics Hall B',
    instructor: 'Dr. Aris',
  },
  {
    id: 'sub-math240',
    code: 'MATH-240',
    name: 'Differential Equations',
    credits: 3,
    targetPercentage: 75,
    color: '#d97706', // amber
    isArchived: false,
    room: 'Math 101',
    instructor: 'Prof. Lin',
  },
  {
    id: 'sub-ee210',
    code: 'EE-210',
    name: 'Digital Logic & Microprocessors',
    credits: 3,
    targetPercentage: 75,
    color: '#059669', // emerald
    isArchived: false,
    room: 'ECE Lab 2',
    instructor: 'Dr. Meyer',
  },
  {
    id: 'sub-hum105',
    code: 'HUM-105',
    name: 'Engineering Ethics & Seminar',
    credits: 2,
    targetPercentage: 70,
    color: '#e11d48', // rose
    isArchived: false,
    room: 'Auditorium A',
    instructor: 'Dr. Gomez',
  },
];

export const INITIAL_TIMETABLE: TimetableSlot[] = [
  // CS-301: Mon & Wed 09:00 - 10:30
  {
    id: 'tt-cs1',
    subjectId: 'sub-cs301',
    dayOfWeek: 'monday',
    startTime: '09:00',
    endTime: '10:30',
    room: 'Hall 304',
  },
  {
    id: 'tt-cs2',
    subjectId: 'sub-cs301',
    dayOfWeek: 'wednesday',
    startTime: '09:00',
    endTime: '10:30',
    room: 'Hall 304',
  },

  // PHYS-202: Mon & Thu 11:00 - 12:30
  {
    id: 'tt-ph1',
    subjectId: 'sub-phys202',
    dayOfWeek: 'monday',
    startTime: '11:00',
    endTime: '12:30',
    room: 'Physics Hall B',
  },
  {
    id: 'tt-ph2',
    subjectId: 'sub-phys202',
    dayOfWeek: 'thursday',
    startTime: '11:00',
    endTime: '12:30',
    room: 'Physics Hall B',
  },

  // MATH-240: Tue 10:00 - 11:30 & Thu 14:00 - 15:30
  {
    id: 'tt-ma1',
    subjectId: 'sub-math240',
    dayOfWeek: 'tuesday',
    startTime: '10:00',
    endTime: '11:30',
    room: 'Math 101',
  },
  {
    id: 'tt-ma2',
    subjectId: 'sub-math240',
    dayOfWeek: 'thursday',
    startTime: '14:00',
    endTime: '15:30',
    room: 'Math 101',
  },

  // EE-210: Sun 10:00 - 11:30 & Tue 13:00 - 14:30
  {
    id: 'tt-ee2',
    subjectId: 'sub-ee210',
    dayOfWeek: 'sunday',
    startTime: '10:00',
    endTime: '11:30',
    room: 'ECE Lab 2',
  },
  {
    id: 'tt-ee1',
    subjectId: 'sub-ee210',
    dayOfWeek: 'tuesday',
    startTime: '13:00',
    endTime: '14:30',
    room: 'ECE Lab 2',
  },

  // HUM-105: Wed 14:00 - 15:30
  {
    id: 'tt-hu1',
    subjectId: 'sub-hum105',
    dayOfWeek: 'wednesday',
    startTime: '14:00',
    endTime: '15:30',
    room: 'Auditorium A',
  },
];

/**
 * Starts with zero pre-populated attendance logs so calculations strictly reflect
 * only the classes where the user explicitly clicks Present, Absent, or Canceled.
 */
export function generateInitialAttendanceRecords(): AttendanceRecord[] {
  return [];
}
