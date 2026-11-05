import { AttendanceRecord, AttendanceStreakData, AttendanceBadge, SubjectAnalytics, AcademicExclusion } from '../types';
import { getDayOfWeek, DAY_NAMES } from './timetableProjections';

/**
 * Calculates attendance streaks, XP, level status, and evaluates motivational badges.
 */
export function calculateAttendanceStreakData(
  records: AttendanceRecord[],
  analyticsList: SubjectAnalytics[] = [],
  exclusions: AcademicExclusion[] = []
): AttendanceStreakData {
  // Sort all records chronologically
  const sortedRecords = [...records].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timestamp - b.timestamp;
  });

  // Group records by date
  const dateGroups = new Map<string, AttendanceRecord[]>();
  for (const rec of sortedRecords) {
    const list = dateGroups.get(rec.date) || [];
    list.push(rec);
    dateGroups.set(rec.date, list);
  }

  // Identify distinct active class dates
  const sortedDates = Array.from(dateGroups.keys()).sort();
  
  interface DaySummary {
    date: string;
    dayName: string;
    presentCount: number;
    absentCount: number;
    canceledCount: number;
    conductedCount: number;
    isFlawless: boolean;
  }

  const activeDays: DaySummary[] = [];

  for (const date of sortedDates) {
    const dayRecords = dateGroups.get(date)!;
    let presentCount = 0;
    let absentCount = 0;
    let canceledCount = 0;

    for (const r of dayRecords) {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'absent') absentCount++;
      else if (r.status === 'canceled') canceledCount++;
    }

    const conductedCount = presentCount + absentCount;
    // If no classes were conducted (e.g. all canceled or no logs), it is not an active class day
    if (conductedCount > 0) {
      const isFlawless = absentCount === 0 && presentCount > 0;
      activeDays.push({
        date,
        dayName: DAY_NAMES[getDayOfWeek(date)],
        presentCount,
        absentCount,
        canceledCount,
        conductedCount,
        isFlawless,
      });
    }
  }

  // Calculate day streaks
  let currentDayStreak = 0;
  let longestDayStreak = 0;
  let runningDayStreak = 0;

  for (const day of activeDays) {
    if (day.isFlawless) {
      runningDayStreak++;
      if (runningDayStreak > longestDayStreak) {
        longestDayStreak = runningDayStreak;
      }
    } else {
      runningDayStreak = 0;
    }
  }

  // Current day streak is the streak ending on the latest active day
  if (activeDays.length > 0) {
    let revStreak = 0;
    for (let i = activeDays.length - 1; i >= 0; i--) {
      if (activeDays[i].isFlawless) {
        revStreak++;
      } else {
        break;
      }
    }
    currentDayStreak = revStreak;
  }

  // Calculate consecutive class session streaks (individual classes attended)
  const conductedRecords = sortedRecords.filter((r) => r.status !== 'canceled');
  let currentClassStreak = 0;
  let longestClassStreak = 0;
  let runningClassStreak = 0;

  for (const r of conductedRecords) {
    if (r.status === 'present') {
      runningClassStreak++;
      if (runningClassStreak > longestClassStreak) {
        longestClassStreak = runningClassStreak;
      }
    } else {
      runningClassStreak = 0;
    }
  }

  if (conductedRecords.length > 0) {
    let revClassStreak = 0;
    for (let i = conductedRecords.length - 1; i >= 0; i--) {
      if (conductedRecords[i].status === 'present') {
        revClassStreak++;
      } else {
        break;
      }
    }
    currentClassStreak = revClassStreak;
  }

  // Calculate flawless weeks (consecutive groups of 5 flawless days or calendar week grouping)
  let flawlessWeeksCount = 0;
  const weekMap = new Map<string, { present: number; absent: number }>();

  for (const r of conductedRecords) {
    const d = new Date(r.date + 'T12:00:00');
    // Approximate week number
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
    const weekKey = `${d.getFullYear()}-W${weekNum}`;

    const current = weekMap.get(weekKey) || { present: 0, absent: 0 };
    if (r.status === 'present') current.present++;
    if (r.status === 'absent') current.absent++;
    weekMap.set(weekKey, current);
  }

  for (const [, stats] of weekMap.entries()) {
    if (stats.present >= 4 && stats.absent === 0) {
      flawlessWeeksCount++;
    }
  }

  // Total attended classes count
  const totalAttendedClasses = conductedRecords.filter((r) => r.status === 'present').length;
  const totalCanceledClasses = sortedRecords.filter((r) => r.status === 'canceled').length;

  // Subjects with 90%+
  const highScoringSubjects = analyticsList.filter((sa) => sa.attendancePercentage >= 90.0).length;
  const warningSubjects = analyticsList.filter((sa) => sa.isWarningZone).length;

  // Badges catalog
  const badges: AttendanceBadge[] = [
    {
      id: 'badge-first-class',
      title: 'First Step',
      subtitle: 'First lecture logged',
      description: 'Successfully recorded your first attended class session.',
      icon: 'CheckCircle2',
      category: 'achievement',
      tier: 'bronze',
      isUnlocked: totalAttendedClasses >= 1,
      progress: Math.min(1, totalAttendedClasses),
      maxProgress: 1,
      unlockedAt: totalAttendedClasses >= 1 ? 'Aug 17, 2026' : undefined,
      rewardXp: 50,
    },
    {
      id: 'badge-streak-3',
      title: 'Spark of Habit',
      subtitle: '3-Day Attendance Streak',
      description: 'Attended all scheduled lectures for 3 consecutive active class days.',
      icon: 'Flame',
      category: 'streak',
      tier: 'bronze',
      isUnlocked: longestDayStreak >= 3,
      progress: Math.min(3, longestDayStreak),
      maxProgress: 3,
      unlockedAt: longestDayStreak >= 3 ? 'Week 1' : undefined,
      rewardXp: 100,
    },
    {
      id: 'badge-streak-5',
      title: 'Momentum Builder',
      subtitle: '5-Day Attendance Streak',
      description: 'Logged 5 consecutive active class days without a single missed lecture.',
      icon: 'Zap',
      category: 'streak',
      tier: 'silver',
      isUnlocked: longestDayStreak >= 5,
      progress: Math.min(5, longestDayStreak),
      maxProgress: 5,
      unlockedAt: longestDayStreak >= 5 ? 'Week 2' : undefined,
      rewardXp: 200,
    },
    {
      id: 'badge-streak-10',
      title: 'Tenacious Scholar',
      subtitle: '10-Day Attendance Streak',
      description: 'Reached 10 consecutive active class days with 100% presence.',
      icon: 'Shield',
      category: 'streak',
      tier: 'gold',
      isUnlocked: longestDayStreak >= 10,
      progress: Math.min(10, longestDayStreak),
      maxProgress: 10,
      unlockedAt: longestDayStreak >= 10 ? 'Week 3' : undefined,
      rewardXp: 350,
    },
    {
      id: 'badge-streak-15',
      title: 'Iron Attendance',
      subtitle: '15-Day Attendance Streak',
      description: '15 consecutive active days without missing a class! An unbreakable routine.',
      icon: 'Trophy',
      category: 'streak',
      tier: 'platinum',
      isUnlocked: longestDayStreak >= 15,
      progress: Math.min(15, longestDayStreak),
      maxProgress: 15,
      rewardXp: 500,
    },
    {
      id: 'badge-class-25',
      title: 'Silver Centurion',
      subtitle: '25 Classes Attended',
      description: 'Accumulated 25 individual attended class lectures across all subjects.',
      icon: 'Award',
      category: 'achievement',
      tier: 'silver',
      isUnlocked: totalAttendedClasses >= 25,
      progress: Math.min(25, totalAttendedClasses),
      maxProgress: 25,
      rewardXp: 250,
    },
    {
      id: 'badge-flawless-week',
      title: 'Flawless Week',
      subtitle: 'Zero Absences in a Week',
      description: 'Completed an entire Monday–Friday academic week with zero absences.',
      icon: 'Star',
      category: 'discipline',
      tier: 'gold',
      isUnlocked: flawlessWeeksCount >= 1,
      progress: Math.min(1, flawlessWeeksCount),
      maxProgress: 1,
      unlockedAt: flawlessWeeksCount >= 1 ? 'Week 1' : undefined,
      rewardXp: 300,
    },
    {
      id: 'badge-marks-90',
      title: 'Apex Marks Tier',
      subtitle: '5.0 Marks in 2+ Subjects',
      description: 'Achieved ≥ 90% attendance in at least two subjects for top GPA marks.',
      icon: 'GraduationCap',
      category: 'mastery',
      tier: 'gold',
      isUnlocked: highScoringSubjects >= 2,
      progress: Math.min(2, highScoringSubjects),
      maxProgress: 2,
      rewardXp: 350,
    },
    {
      id: 'badge-exclusion-auditor',
      title: 'Exclusion Auditor',
      subtitle: 'Canceled Class Excluded',
      description: 'Properly audited and excluded canceled classes so they do not hurt your score.',
      icon: 'Slash',
      category: 'discipline',
      tier: 'silver',
      isUnlocked: totalCanceledClasses >= 1,
      progress: Math.min(1, totalCanceledClasses),
      maxProgress: 1,
      unlockedAt: totalCanceledClasses >= 1 ? 'Aug 24, 2026' : undefined,
      rewardXp: 150,
    },
    {
      id: 'badge-holiday-planner',
      title: 'Calendar Architect',
      subtitle: 'Exclusion Dates Defined',
      description: 'Configured official holidays or exam weeks to pause routine class counting.',
      icon: 'Calendar',
      category: 'discipline',
      tier: 'bronze',
      isUnlocked: exclusions.length >= 1,
      progress: Math.min(1, exclusions.length),
      maxProgress: 1,
      rewardXp: 150,
    },
    {
      id: 'badge-bunk-tactician',
      title: 'Runway Tactician',
      subtitle: 'Zero Warning Subjects',
      description: 'Kept every single subject safely above the 70% threshold with 0.0 marks danger.',
      icon: 'ShieldCheck',
      category: 'mastery',
      tier: 'gold',
      isUnlocked: analyticsList.length > 0 && warningSubjects === 0,
      progress: analyticsList.length > 0 && warningSubjects === 0 ? 1 : 0,
      maxProgress: 1,
      rewardXp: 300,
    },
    {
      id: 'badge-semester-titan',
      title: 'Attendance Grandmaster',
      subtitle: '500+ XP Milestone',
      description: 'Demonstrated exceptional semester attendance discipline and logging mastery.',
      icon: 'Crown',
      category: 'mastery',
      tier: 'platinum',
      isUnlocked: totalAttendedClasses >= 30 && longestDayStreak >= 10,
      progress: Math.min(30, totalAttendedClasses),
      maxProgress: 30,
      rewardXp: 600,
    },
  ];

  // Calculate XP & Level
  let totalXp = 0;
  // 15 XP per attended class
  totalXp += totalAttendedClasses * 15;
  // 25 XP per day of current streak
  totalXp += currentDayStreak * 25;
  // 40 XP per day of longest streak
  totalXp += longestDayStreak * 40;
  // XP from unlocked badges
  for (const b of badges) {
    if (b.isUnlocked) {
      totalXp += b.rewardXp;
    }
  }

  // Level thresholds
  const levelThresholds = [
    { level: 1, title: 'Academic Novice', minXp: 0, nextXp: 300 },
    { level: 2, title: 'Consistent Student', minXp: 300, nextXp: 750 },
    { level: 3, title: 'Honor Vanguard', minXp: 750, nextXp: 1400 },
    { level: 4, title: 'Attendance Champion', minXp: 1400, nextXp: 2200 },
    { level: 5, title: 'Grandmaster Scholar', minXp: 2200, nextXp: 3500 },
  ];

  let currentTier = levelThresholds[0];
  for (const t of levelThresholds) {
    if (totalXp >= t.minXp) {
      currentTier = t;
    }
  }

  // Recent 10 active days for visual timeline / heatmap
  const recentActiveDays = activeDays.slice(-12).map((d) => ({
    date: d.date,
    dayName: d.dayName,
    presentCount: d.presentCount,
    absentCount: d.absentCount,
    isFlawless: d.isFlawless,
  }));

  return {
    currentDayStreak,
    longestDayStreak,
    currentClassStreak,
    longestClassStreak,
    flawlessWeeksCount,
    totalXp,
    level: currentTier.level,
    levelTitle: currentTier.title,
    nextLevelXp: currentTier.nextXp,
    recentActiveDays,
    badges,
  };
}
