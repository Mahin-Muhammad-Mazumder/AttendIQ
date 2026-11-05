import { DayOfWeek, TimetableSlot, SemesterConfig, AcademicExclusion } from '../types';

export const ACTIVE_WEEKDAYS: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
];

export const WEEKEND_DAYS: DayOfWeek[] = ['friday', 'saturday'];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const DAY_NAMES: Record<DayOfWeek, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

/**
 * Checks if a given date string (YYYY-MM-DD) or Date falls on Friday or Saturday (Weekend).
 */
export function isWeekendDay(dateInput: string | Date): boolean {
  const day = getDayOfWeek(dateInput);
  return day === 'friday' || day === 'saturday';
}

/**
 * Checks if a given date string (YYYY-MM-DD) falls within an exclusion range inclusive.
 */
export function isDateInExclusion(dateStr: string, exclusion: AcademicExclusion): boolean {
  return dateStr >= exclusion.startDate && dateStr <= exclusion.endDate;
}

/**
 * Returns the matching exclusion if dateStr falls on an exclusion date or a Friday/Saturday weekend.
 */
export function getExclusionForDate(
  dateStr: string,
  exclusions: AcademicExclusion[] = []
): AcademicExclusion | undefined {
  const customMatch = exclusions.find((ex) => isDateInExclusion(dateStr, ex));
  if (customMatch) return customMatch;

  if (isWeekendDay(dateStr)) {
    const dayName = DAY_NAMES[getDayOfWeek(dateStr)];
    return {
      id: `auto-weekend-${dateStr}`,
      title: `${dayName} (Weekend)`,
      type: 'holiday',
      startDate: dateStr,
      endDate: dateStr,
      description:
        'Official weekly weekend (Friday & Saturday). Automatically excluded from class counting.',
    };
  }

  return undefined;
}

/**
 * Converts a JS Date or 'YYYY-MM-DD' string to DayOfWeek.
 */
export function getDayOfWeek(dateInput: string | Date): DayOfWeek {
  const d = typeof dateInput === 'string' ? new Date(dateInput + 'T12:00:00') : dateInput;
  const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday, ...
  const map: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[dayIndex];
}

/**
 * Counts occurrences of each day of week between startDate and endDate inclusive,
 * automatically excluding all Fridays and Saturdays (weekends) as well as any dates
 * marked as official holidays, exam weeks, or vacations.
 */
export function countDayOccurrences(
  startDateStr: string,
  endDateStr: string,
  exclusions: AcademicExclusion[] = [],
  includeCustomExclusions: boolean = true
): { counts: Record<DayOfWeek, number>; pausedDayCount: number; weekendDayCount: number } {
  const counts: Record<DayOfWeek, number> = {
    sunday: 0,
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
  };

  let pausedDayCount = 0;
  let weekendDayCount = 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { counts, pausedDayCount, weekendDayCount };
  }

  // Iterate day by day
  const current = new Date(start);
  while (current <= end) {
    const dateStr = formatDate(current);
    const dayName = getDayOfWeek(current);
    const isWeekend = dayName === 'friday' || dayName === 'saturday';

    if (isWeekend) {
      weekendDayCount++;
      pausedDayCount++;
    } else if (
      includeCustomExclusions &&
      exclusions.some((ex) => isDateInExclusion(dateStr, ex))
    ) {
      pausedDayCount++;
    } else {
      counts[dayName]++;
    }

    current.setDate(current.getDate() + 1);
  }

  return { counts, pausedDayCount, weekendDayCount };
}

/**
 * Calculates total projected classes for each subject across the entire semester date range,
 * taking into account automatic pause on Fridays, Saturdays, holidays, exams, and vacations.
 */
export function calculateSemesterProjections(
  timetable: TimetableSlot[],
  semester: SemesterConfig,
  exclusions: AcademicExclusion[] = []
): Record<string, number> {
  const { counts } = countDayOccurrences(semester.startDate, semester.endDate, exclusions, true);
  const projections: Record<string, number> = {};

  for (const slot of timetable) {
    const day = slot.dayOfWeek;
    if (day === 'friday' || day === 'saturday') continue;
    const occurrences = counts[day] || 0;
    projections[slot.subjectId] = (projections[slot.subjectId] || 0) + occurrences;
  }

  return projections;
}

/**
 * Calculates the exact number of classes suspended/paused due to academic exclusions per subject,
 * plus total auto-excluded weekend days (Fridays & Saturdays) in the semester.
 */
export function calculatePausedClassesSummary(
  timetable: TimetableSlot[],
  semester: SemesterConfig,
  exclusions: AcademicExclusion[] = []
): { totalPausedSlots: number; perSubject: Record<string, number>; weekendDayCount: number } {
  // Unconstrained active weekday counts without custom exclusions (weekends already excluded)
  const unconstrained = countDayOccurrences(semester.startDate, semester.endDate, [], false);
  // Constrained counts with custom exclusions
  const constrained = countDayOccurrences(semester.startDate, semester.endDate, exclusions, true);

  const perSubject: Record<string, number> = {};
  let totalPausedSlots = 0;

  for (const slot of timetable) {
    if (slot.dayOfWeek === 'friday' || slot.dayOfWeek === 'saturday') continue;
    const origOccurrences = unconstrained.counts[slot.dayOfWeek] || 0;
    const actOccurrences = constrained.counts[slot.dayOfWeek] || 0;
    const diff = Math.max(0, origOccurrences - actOccurrences);

    perSubject[slot.subjectId] = (perSubject[slot.subjectId] || 0) + diff;
    totalPausedSlots += diff;
  }

  return {
    totalPausedSlots,
    perSubject,
    weekendDayCount: constrained.weekendDayCount,
  };
}

/**
 * Returns all timetable slots scheduled for a given date.
 */
export function getSlotsForDate(
  dateStr: string,
  timetable: TimetableSlot[]
): TimetableSlot[] {
  const day = getDayOfWeek(dateStr);
  return timetable
    .filter((slot) => slot.dayOfWeek === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Formats a Date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string to a human friendly format e.g. "Wed, Sep 10, 2026"
 */
export function formatFriendlyDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
