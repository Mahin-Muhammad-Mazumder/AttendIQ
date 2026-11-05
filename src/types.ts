export type AttendanceStatus = 'present' | 'absent' | 'canceled';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  targetPercentage: number;
  color: string; // Tailwind-friendly hex or color identifier
  isArchived: boolean;
  room?: string;
  instructor?: string;
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // e.g. "10:00"
  endTime: string;   // e.g. "11:00"
  room?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  timetableSlotId?: string;
  status: AttendanceStatus;
  note?: string;
  timestamp: number;
}

export interface SemesterConfig {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  defaultTargetPercentage: number;
}

export interface MarksTier {
  minPercentage: number;
  maxPercentage: number;
  marks: number;
  label: string;
  gradeDescription: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

export interface SubjectAnalytics {
  subject: Subject;
  totalSemesterScheduled: number;
  conductedClasses: number; // Present + Absent (Canceled is excluded)
  presentClasses: number;
  absentClasses: number;
  canceledClasses: number;
  attendancePercentage: number; // (present / conducted) * 100
  currentMarks: number;
  tier: MarksTier;
  projectedConductedSemester: number; // totalSemesterScheduled - canceledClasses
  remainingScheduledClasses: number;
  safeSkipsRemaining: number;
  immediateBunksAllowed: number;
  recoveryClassesNeeded: number;
  isWarningZone: boolean;
  nextTier?: {
    targetPercentage: number;
    marks: number;
    classesNeeded: number;
  };
}

export interface OverallAnalytics {
  totalConducted: number;
  totalPresent: number;
  totalAbsent: number;
  totalCanceled: number;
  overallPercentage: number;
  totalCredits: number;
  gpaMarks: number; // Weighted average attendance marks across subjects
  unweightedMarks: number;
  totalSubjectsCount: number;
  warningSubjectsCount: number;
  perfectSubjectsCount: number;
}

export type ExclusionType = 'holiday' | 'exam' | 'vacation' | 'other';

export interface AcademicExclusion {
  id: string;
  title: string;
  type: ExclusionType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description?: string;
}

export type BadgeCategory = 'streak' | 'achievement' | 'mastery' | 'discipline';

export interface AttendanceBadge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
  rewardXp: number;
}

export interface AttendanceStreakData {
  currentDayStreak: number;
  longestDayStreak: number;
  currentClassStreak: number;
  longestClassStreak: number;
  flawlessWeeksCount: number;
  totalXp: number;
  level: number;
  levelTitle: string;
  nextLevelXp: number;
  recentActiveDays: {
    date: string;
    dayName: string;
    presentCount: number;
    absentCount: number;
    isFlawless: boolean;
  }[];
  badges: AttendanceBadge[];
}
