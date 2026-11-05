import { SubjectAnalytics, OverallAnalytics, AttendanceRecord, Subject } from '../types';

export function exportAttendanceCSV(
  records: AttendanceRecord[],
  subjects: Subject[],
  monthFilter?: string
): void {
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const filtered = monthFilter
    ? records.filter((r) => r.date.startsWith(monthFilter))
    : records;

  const headers = ['Date', 'Subject Code', 'Subject Name', 'Status', 'Note'];
  const rows = filtered
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((rec) => {
      const sub = subjectMap.get(rec.subjectId);
      const code = sub ? sub.code : 'UNKNOWN';
      const name = sub ? `"${sub.name.replace(/"/g, '""')}"` : 'Unknown';
      const status = rec.status.toUpperCase();
      const note = rec.note ? `"${rec.note.replace(/"/g, '""')}"` : '';
      return [rec.date, code, name, status, note].join(',');
    });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `attendance-report-${monthFilter || 'full-semester'}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportAnalyticsSummaryCSV(
  analyticsList: SubjectAnalytics[],
  overall: OverallAnalytics,
  semesterName: string
): void {
  const headers = [
    'Subject Code',
    'Subject Name',
    'Credits',
    'Conducted (Excluded Canceled)',
    'Present',
    'Absent',
    'Canceled',
    'Attendance %',
    'Awarded Marks (Scale 5.0)',
    'Tier Label',
    'Safe Skips Remaining',
    'Recovery Classes Needed',
  ];

  const rows = analyticsList.map((sa) => [
    sa.subject.code,
    `"${sa.subject.name.replace(/"/g, '""')}"`,
    sa.subject.credits,
    sa.conductedClasses,
    sa.presentClasses,
    sa.absentClasses,
    sa.canceledClasses,
    `${sa.attendancePercentage}%`,
    sa.currentMarks.toFixed(1),
    `"${sa.tier.gradeDescription}"`,
    sa.safeSkipsRemaining,
    sa.recoveryClassesNeeded,
  ].join(','));

  // Add overall summary row
  rows.push('');
  rows.push(`OVERALL WEIGHTED GPA MARKS,${overall.gpaMarks.toFixed(2)} / 5.0`);
  rows.push(`OVERALL ATTENDANCE,${overall.overallPercentage}%`);
  rows.push(`TOTAL CONDUCTED,${overall.totalConducted}`);
  rows.push(`TOTAL ATTENDED,${overall.totalPresent}`);
  rows.push(`TOTAL ABSENT,${overall.totalAbsent}`);
  rows.push(`TOTAL CANCELED (EXCLUDED),${overall.totalCanceled}`);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${semesterName.toLowerCase().replace(/\s+/g, '-')}-marks-summary.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
