import React, { useState, useMemo, useEffect } from 'react';
import {
  SubjectAnalytics,
  OverallAnalytics,
  AttendanceRecord,
  Subject,
  SemesterConfig,
} from '../types';
import { exportAttendanceCSV, exportAnalyticsSummaryCSV } from '../utils/exportUtils';
import { formatFriendlyDate } from '../utils/timetableProjections';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface ReportsViewProps {
  analyticsList: SubjectAnalytics[];
  overall: OverallAnalytics;
  records: AttendanceRecord[];
  subjects: Subject[];
  semester: SemesterConfig;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  analyticsList,
  overall,
  records,
  subjects,
  semester,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      return localStorage.getItem('attendiq_reports_month') || 'all';
    } catch {
      return 'all';
    }
  });
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    try {
      return localStorage.getItem('attendiq_reports_status') || 'all';
    } catch {
      return 'all';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_reports_month', selectedMonth);
    } catch {
      // ignore
    }
  }, [selectedMonth]);

  useEffect(() => {
    try {
      localStorage.setItem('attendiq_reports_status', statusFilter);
    } catch {
      // ignore
    }
  }, [statusFilter]);

  // Discover available months from records
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      set.add(r.date.slice(0, 7)); // YYYY-MM
    }
    return Array.from(set).sort();
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchMonth = selectedMonth === 'all' || r.date.startsWith(selectedMonth);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchMonth && matchStatus;
    });
  }, [records, selectedMonth, statusFilter]);

  // Compute smart insight callouts
  const insights = useMemo(() => {
    const list: { type: 'warning' | 'success' | 'info'; title: string; message: string }[] = [];

    for (const sa of analyticsList) {
      if (sa.isWarningZone) {
        list.push({
          type: 'warning',
          title: `Action Required: ${sa.subject.code} (${sa.subject.name})`,
          message: `Attendance is in the warning zone at ${sa.attendancePercentage}% (0.0 marks). Student must attend ${sa.recoveryClassesNeeded} consecutive upcoming classes to recover to 75% for 3.5 marks.`,
        });
      } else if (sa.nextTier && sa.nextTier.classesNeeded <= 3) {
        list.push({
          type: 'info',
          title: `Grade Boost Opportunity: ${sa.subject.code}`,
          message: `${sa.subject.name} is currently at ${sa.attendancePercentage}% (${sa.currentMarks.toFixed(1)} marks). Attending just ${sa.nextTier.classesNeeded} more consecutive class(es) upgrades the course to ${sa.nextTier.marks.toFixed(1)} marks!`,
        });
      } else if (sa.attendancePercentage >= 90) {
        list.push({
          type: 'success',
          title: `Honors Standing: ${sa.subject.code}`,
          message: `Maintained outstanding ${sa.attendancePercentage}% attendance, securing maximum 5.0 marks! Safe to skip up to ${sa.safeSkipsRemaining} classes while keeping target standing.`,
        });
      }
    }

    if (overall.totalCanceled > 0) {
      list.push({
        type: 'info',
        title: `Cancellation Audit Compliance`,
        message: `${overall.totalCanceled} total class sessions were verified as Canceled and strictly excluded from conducted count (${overall.totalConducted}) without penalty.`,
      });
    }

    return list;
  }, [analyticsList, overall]);

  const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));

  const handlePrint = () => {
    window.print();
  };

  const getMonthLabel = (m: string) => {
    if (m === 'all') return 'Full Semester (All Months)';
    const [year, month] = m.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Filter */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Automated Academic Reports & Export Hub
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Generate institutional attendance dossiers, filtered monthly audit logs, and export CSV/PDF reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-slate-400">
                Period:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#070812]/80 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500/50 transition"
              >
                <option value="all">Full Semester (All Months)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {getMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Buttons */}
            <button
              onClick={() =>
                exportAttendanceCSV(
                  records,
                  subjects,
                  selectedMonth === 'all' ? undefined : selectedMonth
                )
              }
              className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-500/30 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Logs (CSV)</span>
            </button>

            <button
              onClick={() => exportAnalyticsSummaryCSV(analyticsList, overall, semester.name)}
              className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-500/30 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Summary CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] hover:brightness-110 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Smart Automated Insight Callouts */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Smart Academic Insights & Advisory Callouts</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 backdrop-blur-xl transition-all duration-300 ${
                insight.type === 'warning'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.18)]'
                  : insight.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.18)]'
                  : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200'
              }`}
            >
              {insight.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : insight.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h5 className="font-bold text-xs">{insight.title}</h5>
                <p className="mt-0.5 opacity-90 leading-relaxed">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Academic Grade Sheet / Summary Table */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300 print:border-none print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-white/[0.07]">
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
              Official Academic Transcript
            </span>
            <h3 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              {semester.name} - Attendance & Academic Marks Statement
            </h3>
            <p className="text-xs text-slate-400">
              Report Period: <strong className="text-slate-200">{getMonthLabel(selectedMonth)}</strong>
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 font-medium">Weighted Cumulative GPA</div>
            <div className="text-xl font-black font-mono tracking-tight text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              {overall.gpaMarks.toFixed(2)} / 5.00
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3 text-center">Credits</th>
                <th className="py-2.5 px-3 text-center">Conducted*</th>
                <th className="py-2.5 px-3 text-center">Attended</th>
                <th className="py-2.5 px-3 text-center">Absent</th>
                <th className="py-2.5 px-3 text-center">Canceled (Excluded)</th>
                <th className="py-2.5 px-3 text-center">Attendance %</th>
                <th className="py-2.5 px-3 text-center">Awarded Marks</th>
                <th className="py-2.5 px-3 text-right">Standing Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {analyticsList.map((sa) => (
                <tr key={sa.subject.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-white font-mono tracking-tight">
                      {sa.subject.code}
                    </div>
                    <div className="text-slate-400 text-[11px]">{sa.subject.name}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono tracking-tight font-medium text-slate-300">{sa.subject.credits}</td>
                  <td className="py-3 px-3 text-center font-mono tracking-tight font-bold text-slate-200">
                    {sa.conductedClasses}
                  </td>
                  <td className="py-3 px-3 text-center font-mono tracking-tight font-bold text-emerald-400">
                    {sa.presentClasses}
                  </td>
                  <td className="py-3 px-3 text-center font-mono tracking-tight font-semibold text-rose-400">
                    {sa.absentClasses}
                  </td>
                  <td className="py-3 px-3 text-center font-mono tracking-tight font-semibold text-slate-400">
                    {sa.canceledClasses}
                  </td>
                  <td className="py-3 px-3 text-center font-mono tracking-tight font-black text-white">
                    {sa.attendancePercentage}%
                  </td>
                  <td className="py-3 px-3 text-center font-mono tracking-tight">
                    <span className={`font-black text-sm ${sa.tier.colorClass}`}>
                      {sa.currentMarks.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-500"> / 5.0</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold ${sa.tier.bgClass} ${sa.tier.colorClass} border ${sa.tier.borderClass}`}
                    >
                      {sa.tier.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/[0.12] font-bold text-white bg-white/[0.03] font-mono tracking-tight">
                <td className="py-3 px-3 uppercase text-[11px] font-sans">Total / Overall Summary</td>
                <td className="py-3 px-3 text-center">{overall.totalCredits}</td>
                <td className="py-3 px-3 text-center">{overall.totalConducted}</td>
                <td className="py-3 px-3 text-center text-emerald-400">{overall.totalPresent}</td>
                <td className="py-3 px-3 text-center text-rose-400">{overall.totalAbsent}</td>
                <td className="py-3 px-3 text-center text-slate-400">{overall.totalCanceled}</td>
                <td className="py-3 px-3 text-center text-cyan-400 text-sm">
                  {overall.overallPercentage}%
                </td>
                <td className="py-3 px-3 text-center text-emerald-400 text-sm">
                  {overall.gpaMarks.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right text-[11px] text-slate-400 font-sans font-medium">
                  {overall.warningSubjectsCount === 0 ? 'Compliant' : `${overall.warningSubjectsCount} At Risk`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-500 italic">
          *Conducted classes represent Present + Absent. Canceled classes are completely excluded from conducted and target calculations per institutional academic guidelines.
        </p>
      </div>

      {/* Filtered Attendance Class Log History */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              Detailed Class Log Records (<span className="font-mono tracking-tight">{filteredRecords.length}</span>)
            </h4>
            <p className="text-xs text-slate-400">
              Audit trail for {getMonthLabel(selectedMonth)}.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-white/[0.08] rounded-lg bg-[#070812]/80 text-slate-200 font-medium focus:outline-none focus:border-indigo-500/50 transition"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
              <option value="canceled">Canceled (Excluded) Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#070812]/95 backdrop-blur-md">
              <tr className="border-b border-white/[0.08] text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Subject</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Log Notes / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredRecords
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((rec) => {
                  const sub = subjectMap.get(rec.subjectId);
                  return (
                    <tr key={rec.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 font-mono tracking-tight text-slate-300 whitespace-nowrap">
                        {formatFriendlyDate(rec.date)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold font-mono tracking-tight text-slate-200 mr-1.5">
                          {sub?.code}
                        </span>
                        <span className="text-slate-400 text-[11px] hidden sm:inline">
                          {sub?.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                            rec.status === 'present'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                              : rec.status === 'absent'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                              : 'bg-white/[0.03] text-slate-400 border-white/[0.08]'
                          }`}
                        >
                          {rec.status === 'canceled' ? 'Canceled (Excluded)' : rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 italic text-[11px]">
                        {rec.note || '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
