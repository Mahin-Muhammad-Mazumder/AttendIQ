import { MarksTier, Subject, SubjectAnalytics, OverallAnalytics, AttendanceRecord } from '../types';

export const MARKS_TIERS: MarksTier[] = [
  {
    minPercentage: 90.0,
    maxPercentage: 100.0,
    marks: 5.0,
    label: '5.0 Marks',
    gradeDescription: 'Outstanding (>= 90%)',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    bgClass: 'bg-emerald-500/10',
  },
  {
    minPercentage: 85.0,
    maxPercentage: 89.99,
    marks: 4.5,
    label: '4.5 Marks',
    gradeDescription: 'Excellent (85% - 89.9%)',
    colorClass: 'text-cyan-400',
    borderClass: 'border-indigo-500/30',
    bgClass: 'bg-indigo-500/10',
  },
  {
    minPercentage: 80.0,
    maxPercentage: 84.99,
    marks: 4.0,
    label: '4.0 Marks',
    gradeDescription: 'Very Good (80% - 84.9%)',
    colorClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
    bgClass: 'bg-indigo-500/10',
  },
  {
    minPercentage: 75.0,
    maxPercentage: 79.99,
    marks: 3.5,
    label: '3.5 Marks',
    gradeDescription: 'Good / Benchmark (75% - 79.9%)',
    colorClass: 'text-cyan-400',
    borderClass: 'border-indigo-500/30',
    bgClass: 'bg-indigo-500/10',
  },
  {
    minPercentage: 70.0,
    maxPercentage: 74.99,
    marks: 3.0,
    label: '3.0 Marks',
    gradeDescription: 'Marginal (70% - 74.9%)',
    colorClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
    bgClass: 'bg-indigo-500/10',
  },
  {
    minPercentage: 0.0,
    maxPercentage: 69.99,
    marks: 0.0,
    label: '0.0 Marks',
    gradeDescription: 'Warning Zone (< 70%)',
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
    bgClass: 'bg-rose-500/10',
  },
];

/**
 * Returns the exact MarksTier matching an attendance percentage:
 * - Attendance >= 90.0%: 5.0 Marks
 * - 85.0% <= Attendance < 90.0%: 4.5 Marks
 * - 80.0% <= Attendance < 85.0%: 4.0 Marks
 * - 75.0% <= Attendance < 80.0%: 3.5 Marks
 * - 70.0% <= Attendance < 75.0%: 3.0 Marks
 * - Attendance < 70.0%: 0.0 Marks
 */
export function getMarksTier(percentage: number): MarksTier {
  const normalized = Math.round((percentage + Number.EPSILON) * 100) / 100;
  const clamped = Math.min(100, Math.max(0, normalized));
  if (clamped >= 90.0) return MARKS_TIERS[0];
  if (clamped >= 85.0) return MARKS_TIERS[1];
  if (clamped >= 80.0) return MARKS_TIERS[2];
  if (clamped >= 75.0) return MARKS_TIERS[3];
  if (clamped >= 70.0) return MARKS_TIERS[4];
  return MARKS_TIERS[5];
}

/**
 * Safe Skip Calculation:
 * Calculates allowable skips out of remaining scheduled semester classes
 * while maintaining target attendance percentage (targetPct e.g. 75).
 */
export function calculateSafeSkipsRemaining(
  present: number,
  conducted: number,
  remainingClasses: number,
  targetPct: number = 75
): number {
  if (remainingClasses <= 0) return 0;
  const T = targetPct / 100;
  const totalConductedAtEnd = conducted + remainingClasses;
  const minPresentNeededAtEnd = Math.ceil(T * totalConductedAtEnd - 1e-9);
  const neededFromRemaining = Math.max(0, minPresentNeededAtEnd - present);

  const allowableSkips = remainingClasses - neededFromRemaining;
  return Math.max(0, allowableSkips);
}

/**
 * Immediate Bunks Allowed Right Now:
 * Consecutive classes a student can skip starting today before dropping below targetPct.
 */
export function calculateImmediateBunks(
  present: number,
  conducted: number,
  targetPct: number = 75
): number {
  if (conducted === 0 || present === 0) return 0;
  const T = targetPct / 100;
  const currentPct = Math.round(((present / conducted) * 100 + Number.EPSILON) * 100) / 100;
  if (currentPct < targetPct) return 0;

  // P / (C + b) >= T => b <= (P / T) - C
  const maxAdditionalSkips = Math.floor(present / T - conducted + 1e-9);
  return Math.max(0, maxAdditionalSkips);
}

/**
 * Recovery Calculation:
 * Number of consecutive upcoming classes the student must attend (0 skips)
 * to bring attendance back up to targetPct (e.g. 75%).
 */
export function calculateRecoveryClasses(
  present: number,
  conducted: number,
  targetPct: number = 75
): number {
  if (conducted === 0) return 0;
  const currentPct = Math.round(((present / conducted) * 100 + Number.EPSILON) * 100) / 100;
  if (currentPct >= targetPct) return 0;

  const T = targetPct / 100;
  // (P + r) / (C + r) >= T => r * (1 - T) >= T * C - P
  const numerator = T * conducted - present;
  const denominator = 1 - T;
  if (denominator <= 0) return 0;

  return Math.max(1, Math.ceil(numerator / denominator - 1e-9));
}

/**
 * Calculates next tier upgrade target and classes required to reach it
 */
export function getNextTierOpportunity(
  present: number,
  conducted: number,
  currentPct: number
): { targetPercentage: number; marks: number; classesNeeded: number } | undefined {
  if (conducted === 0) {
    return undefined;
  }

  // Find the next higher tier
  const tiersAscending = [
    { pct: 70.0, marks: 3.0 },
    { pct: 75.0, marks: 3.5 },
    { pct: 80.0, marks: 4.0 },
    { pct: 85.0, marks: 4.5 },
    { pct: 90.0, marks: 5.0 },
  ];

  const nextTier = tiersAscending.find((t) => t.pct > currentPct);
  if (!nextTier) return undefined;

  const classesNeeded = calculateRecoveryClasses(present, conducted, nextTier.pct);
  return {
    targetPercentage: nextTier.pct,
    marks: nextTier.marks,
    classesNeeded: Math.max(1, classesNeeded),
  };
}

/**
 * Computes individual analytics for a single subject.
 * Strictly adheres to:
 * 1. Percentage = (Present / (Present + Absent)) * 100
 * 2. If Conducted (Present + Absent) == 0, Attendance = 0% and Marks = 0.0
 * 3. Canceled classes remain completely excluded from the denominator.
 */
export function computeSubjectAnalytics(
  subject: Subject,
  records: AttendanceRecord[],
  totalSemesterScheduled: number,
  semesterStartDate?: string,
  semesterEndDate?: string
): SubjectAnalytics {
  const filtered = records.filter((r) => {
    if (r.subjectId !== subject.id) return false;
    if (r.status !== 'present' && r.status !== 'absent' && r.status !== 'canceled') return false;
    if (semesterStartDate && r.date < semesterStartDate) return false;
    if (semesterEndDate && r.date > semesterEndDate) return false;
    return true;
  });

  // Deduplicate by (date + timetableSlotId) or record id so a slot on a date is never counted twice
  const dedupedMap = new Map<string, AttendanceRecord>();
  for (const r of filtered) {
    const key = r.timetableSlotId ? `${r.date}__slot__${r.timetableSlotId}` : `${r.date}__id__${r.id}`;
    const existing = dedupedMap.get(key);
    if (!existing || (r.timestamp || 0) >= (existing.timestamp || 0)) {
      dedupedMap.set(key, r);
    }
  }
  const subjectRecords = Array.from(dedupedMap.values());

  let presentClasses = 0;
  let absentClasses = 0;
  let canceledClasses = 0;

  for (const record of subjectRecords) {
    if (record.status === 'present') presentClasses++;
    else if (record.status === 'absent') absentClasses++;
    else if (record.status === 'canceled') canceledClasses++;
  }

  // CANCELLATION EXCLUSION LOGIC:
  // Conducted is strictly Present + Absent. Canceled is completely excluded from the denominator!
  const conductedClasses = presentClasses + absentClasses;

  // Projected total conducted in semester excludes canceled classes
  const projectedConductedSemester = Math.max(
    conductedClasses,
    totalSemesterScheduled - canceledClasses
  );

  // Remaining scheduled classes between start and end date
  const remainingScheduledClasses = Math.max(0, projectedConductedSemester - conductedClasses);

  // Percentage = (Present / (Present + Absent)) * 100; if Conducted == 0, Attendance = 0%
  const rawPercentage =
    conductedClasses > 0 ? (presentClasses / conductedClasses) * 100 : 0;
  const attendancePercentage =
    conductedClasses > 0 ? Math.round((rawPercentage + Number.EPSILON) * 10) / 10 : 0;

  // Map strictly using the institutional scale table
  const tier: MarksTier =
    conductedClasses > 0
      ? getMarksTier(attendancePercentage)
      : {
          ...MARKS_TIERS[5],
          marks: 0.0,
          label: '0.0 Marks',
          gradeDescription: 'No Classes Conducted (0%)',
        };

  const currentMarks = conductedClasses > 0 ? tier.marks : 0.0;
  const isWarningZone = conductedClasses > 0 && attendancePercentage < 70.0;

  const targetPct = subject.targetPercentage || 75;

  const safeSkipsRemaining = calculateSafeSkipsRemaining(
    presentClasses,
    conductedClasses,
    remainingScheduledClasses,
    targetPct
  );

  const immediateBunksAllowed = calculateImmediateBunks(
    presentClasses,
    conductedClasses,
    targetPct
  );

  const recoveryClassesNeeded = calculateRecoveryClasses(
    presentClasses,
    conductedClasses,
    targetPct
  );

  const nextTier =
    conductedClasses > 0
      ? getNextTierOpportunity(presentClasses, conductedClasses, attendancePercentage)
      : undefined;

  return {
    subject,
    totalSemesterScheduled,
    conductedClasses,
    presentClasses,
    absentClasses,
    canceledClasses,
    attendancePercentage,
    currentMarks,
    tier,
    projectedConductedSemester,
    remainingScheduledClasses,
    safeSkipsRemaining,
    immediateBunksAllowed,
    recoveryClassesNeeded,
    isWarningZone,
    nextTier,
  };
}

/**
 * Computes overall attendance percentage and scale marks across all active subjects.
 */
export function computeOverallAnalytics(
  subjectAnalyticsList: SubjectAnalytics[]
): OverallAnalytics {
  const activeList = subjectAnalyticsList.filter((sa) => !sa.subject.isArchived);

  let totalPresent = 0;
  let totalAbsent = 0;
  let totalCanceled = 0;
  let totalWeightedMarks = 0;
  let totalCredits = 0;
  let conductedCredits = 0;
  let totalRawMarks = 0;
  let conductedSubjectsCount = 0;
  let warningSubjectsCount = 0;
  let perfectSubjectsCount = 0;

  for (const sa of activeList) {
    totalPresent += sa.presentClasses;
    totalAbsent += sa.absentClasses;
    totalCanceled += sa.canceledClasses;

    const credits = sa.subject.credits || 3;
    totalCredits += credits;

    if (sa.conductedClasses > 0) {
      conductedSubjectsCount++;
      conductedCredits += credits;
      totalWeightedMarks += sa.currentMarks * credits;
      totalRawMarks += sa.currentMarks;
      if (sa.isWarningZone) warningSubjectsCount++;
      if (sa.attendancePercentage >= 90.0) perfectSubjectsCount++;
    }
  }

  // Strictly Conducted = Present + Absent
  const totalConducted = totalPresent + totalAbsent;

  const rawOverallPercentage =
    totalConducted > 0 ? (totalPresent / totalConducted) * 100 : 0;
  const overallPercentage =
    totalConducted > 0 ? Math.round((rawOverallPercentage + Number.EPSILON) * 10) / 10 : 0;

  // Map overall attendance percentage directly to the institutional marks scale
  // so overall marks and overall percentage always match the scale table
  const overallScaleTier = getMarksTier(overallPercentage);
  const gpaMarks = totalConducted > 0 ? overallScaleTier.marks : 0.0;

  const unweightedMarks =
    conductedCredits > 0
      ? Math.round(((totalWeightedMarks / conductedCredits) + Number.EPSILON) * 100) / 100
      : conductedSubjectsCount > 0
      ? Math.round(((totalRawMarks / conductedSubjectsCount) + Number.EPSILON) * 100) / 100
      : 0.0;

  return {
    totalConducted,
    totalPresent,
    totalAbsent,
    totalCanceled,
    overallPercentage,
    totalCredits,
    gpaMarks,
    unweightedMarks,
    totalSubjectsCount: activeList.length,
    warningSubjectsCount,
    perfectSubjectsCount,
  };
}
