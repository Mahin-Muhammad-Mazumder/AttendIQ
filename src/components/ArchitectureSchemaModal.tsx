import React, { useState } from 'react';
import {
  Database,
  Layers,
  Code,
  Cpu,
  Check,
  Copy,
  Server,
  BookOpen,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';

export const ArchitectureSchemaModal: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'stack' | 'sql' | 'firestore' | 'math'>('stack');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const postgresDDL = `-- ==========================================================
-- AttendIQ: Production Academic Attendance & Bunk Predictor
-- Database: PostgreSQL 15+ / Cloud SQL
-- ==========================================================

-- 1. Semesters Table
CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    default_target_percentage NUMERIC(5, 2) DEFAULT 75.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_semester_dates CHECK (end_date >= start_date)
);

-- 2. Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    credits NUMERIC(3, 1) NOT NULL DEFAULT 3.0,
    target_percentage NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
    color VARCHAR(20) DEFAULT '#4f46e5',
    room VARCHAR(50),
    instructor VARCHAR(100),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Routine Timetable Slots Table
CREATE TYPE day_of_week_enum AS ENUM (
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

CREATE TABLE timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week day_of_week_enum NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    CONSTRAINT valid_slot_time CHECK (end_time > start_time)
);

-- 4. Attendance Records Table
CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'canceled');

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL,
    log_date DATE NOT NULL,
    status attendance_status_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_subject_slot_date UNIQUE (subject_id, timetable_slot_id, log_date)
);

-- Indexes for lightning fast analytics
CREATE INDEX idx_attd_subject_date ON attendance_records (subject_id, log_date);
CREATE INDEX idx_attd_status ON attendance_records (status);
CREATE INDEX idx_slots_day ON timetable_slots (day_of_week);

-- 5. Cancellation-Excluded Attendance Analytics View
CREATE OR REPLACE VIEW v_subject_attendance_analytics AS
SELECT 
    s.id AS subject_id,
    s.code,
    s.name,
    s.credits,
    s.target_percentage,
    COUNT(*) FILTER (WHERE r.status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE r.status = 'absent') AS absent_count,
    COUNT(*) FILTER (WHERE r.status = 'canceled') AS canceled_count,
    -- CANCELLATION EXCLUSION:
    -- Conducted is strictly Present + Absent (Canceled excluded from denominator)
    (COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent')) AS conducted_count,
    CASE 
        WHEN (COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent')) = 0 THEN 100.00
        ELSE ROUND(
            (COUNT(*) FILTER (WHERE r.status = 'present')::NUMERIC / 
            (COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent'))::NUMERIC) * 100, 2
        )
    END AS attendance_percentage,
    -- Marks Engine Scaling Tiers
    CASE 
        WHEN (COUNT(*) FILTER (WHERE r.status = 'present')::NUMERIC / 
             NULLIF((COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent')), 0)::NUMERIC) >= 0.90 THEN 5.0
        WHEN (COUNT(*) FILTER (WHERE r.status = 'present')::NUMERIC / 
             NULLIF((COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent')), 0)::NUMERIC) >= 0.85 THEN 4.5
        WHEN (COUNT(*) FILTER (WHERE r.status = 'present')::NUMERIC / 
             NULLIF((COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent')), 0)::NUMERIC) >= 0.80 THEN 4.0
        WHEN (COUNT(*) FILTER (WHERE r.status = 'present')::NUMERIC / 
             NULLIF((COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent')), 0)::NUMERIC) >= 0.75 THEN 3.5
        WHEN (COUNT(*) FILTER (WHERE r.status = 'present')::NUMERIC / 
             NULLIF((COUNT(*) FILTER (WHERE r.status = 'present') + COUNT(*) FILTER (WHERE r.status = 'absent')), 0)::NUMERIC) >= 0.70 THEN 3.0
        ELSE 0.0
    END AS awarded_marks
FROM subjects s
LEFT JOIN attendance_records r ON s.id = r.subject_id
GROUP BY s.id, s.code, s.name, s.credits, s.target_percentage;
`;

  const firestoreSchema = `// ==========================================================
// AttendIQ: Google Cloud Firestore Schema Specification
// Model: Document-Store with Sub-collections
// ==========================================================

users/{userId}
  ├── profile: { name: string, email: string, university: string }
  │
  ├── semesters/{semesterId}
  │     ├── name: "Fall 2026 Semester"
  │     ├── startDate: "2026-08-17"
  │     ├── endDate: "2026-12-18"
  │     ├── defaultTargetPercentage: 75.0
  │     │
  │     ├── subjects/{subjectId}
  │     │     ├── code: "CS-301"
  │     │     ├── name: "Algorithms & Data Structures"
  │     │     ├── credits: 4
  │     │     ├── targetPercentage: 80.0
  │     │     ├── color: "#4f46e5"
  │     │     ├── room: "Hall 304"
  │     │     ├── instructor: "Prof. Vance"
  │     │     └── isArchived: false
  │     │
  │     ├── timetableSlots/{slotId}
  │     │     ├── subjectId: "sub-cs301"
  │     │     ├── dayOfWeek: "monday" // "monday" | "tuesday" | ...
  │     │     ├── startTime: "09:00"
  │     │     ├── endTime: "10:30"
  │     │     └── room: "Hall 304"
  │     │
  │     └── attendanceRecords/{recordId}
  │           ├── date: "2026-09-10" // YYYY-MM-DD
  │           ├── subjectId: "sub-cs301"
  │           ├── timetableSlotId: "tt-cs1"
  │           ├── status: "present" // "present" | "absent" | "canceled"
  │           ├── note: "Completed binary tree balance"
  │           └── updatedAt: timestamp
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Full-Stack Architecture & Database Schema Deliverable
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Architectural blueprints, relational PostgreSQL DDL, Cloud Firestore schema, and mathematical algorithms.
            </p>
          </div>

          {/* Section Switcher */}
          <div className="flex items-center space-x-1 bg-[#070812]/80 border border-white/[0.07] p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSection('stack')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${
                activeSection === 'stack'
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Tech Stack
            </button>
            <button
              onClick={() => setActiveSection('sql')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${
                activeSection === 'sql'
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              PostgreSQL DDL
            </button>
            <button
              onClick={() => setActiveSection('firestore')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${
                activeSection === 'firestore'
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Firestore Schema
            </button>
            <button
              onClick={() => setActiveSection('math')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${
                activeSection === 'math'
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Formulas & Logic
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Tech Stack & System Architecture */}
      {activeSection === 'stack' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Frontend Architecture
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                React 19 + TypeScript with Vite bundler. High performance, zero-latency reactive state management with client persistence and instant HMR-free compilation.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-semibold">React 19</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">Tailwind v4</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">Recharts</span>
              </div>
            </div>

            <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center mb-3">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Backend & APIs
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Node.js / Express or Next.js App Router API endpoints. Restful routes for calendar synchronization, timetable JSON parsing, and institutional CSV streaming.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">Node.js</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">Express REST</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">JSON Streaming</span>
              </div>
            </div>

            <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl p-5 border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Database Layer
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                PostgreSQL with relational views or Google Cloud Firestore with subcollections. Full transactional ACID guarantees for daily attendance audits.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-semibold">PostgreSQL</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">Firestore</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[10px] font-semibold">ACID Logs</span>
              </div>
            </div>
          </div>

          {/* Architectural Data Flow Diagram */}
          <div className="bg-[#090a14]/75 backdrop-blur-xl text-white rounded-2xl p-6 border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] hover:border-indigo-500/30 hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.2)] transition-all duration-300">
            <h4 className="text-sm font-bold flex items-center space-x-2 text-cyan-400 mb-4">
              <Activity className="w-4 h-4" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Routine-Aware Academic System Pipeline
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="font-bold text-slate-100 font-mono tracking-tight">1. Routine Projection Engine</div>
                <p className="text-slate-400 mt-1 text-[11px]">
                  Counts day-of-week frequencies across Semester Start and End dates to compute total expected classes per subject.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="font-bold text-slate-100 font-mono tracking-tight">2. Cancellation Exclusion Filter</div>
                <p className="text-slate-400 mt-1 text-[11px]">
                  Classes flagged as Canceled are strictly omitted from Conducted (<code className="text-cyan-400 font-mono tracking-tight">P + A</code>) and Projected counts.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="font-bold text-slate-100 font-mono tracking-tight">3. Bunk Runway Solver</div>
                <p className="text-slate-400 mt-1 text-[11px]">
                  Evaluates allowable skips <code className="text-emerald-400 font-mono tracking-tight">S</code> out of remaining routine lectures to maintain mark tier.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="font-bold text-slate-100 font-mono tracking-tight">4. Marks Scaling Machine</div>
                <p className="text-slate-400 mt-1 text-[11px]">
                  Maps exact percentages into 5.0 tier scale and weights by subject credit hours for semester GPA marks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: PostgreSQL DDL */}
      {activeSection === 'sql' && (
        <div className="bg-[#090a14]/75 backdrop-blur-xl text-slate-200 rounded-2xl p-5 border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] relative">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08] text-xs text-slate-400">
            <span className="font-semibold text-slate-300">PostgreSQL 15+ Schema & DDL Script</span>
            <button
              onClick={() => copyToClipboard(postgresDDL, 'sql')}
              className="px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white font-medium flex items-center space-x-1.5 transition"
            >
              {copiedSection === 'sql' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[11px] font-mono tracking-tight overflow-x-auto leading-relaxed text-slate-300 max-h-[500px]">
            {postgresDDL}
          </pre>
        </div>
      )}

      {/* Section 3: Cloud Firestore Schema */}
      {activeSection === 'firestore' && (
        <div className="bg-[#090a14]/75 backdrop-blur-xl text-slate-200 rounded-2xl p-5 border border-white/[0.07] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] relative">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08] text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Google Cloud Firestore Document Schema Hierarchy</span>
            <button
              onClick={() => copyToClipboard(firestoreSchema, 'firestore')}
              className="px-3 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white font-medium flex items-center space-x-1.5 transition"
            >
              {copiedSection === 'firestore' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy Schema</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[11px] font-mono tracking-tight overflow-x-auto leading-relaxed text-slate-300 max-h-[500px]">
            {firestoreSchema}
          </pre>
        </div>
      )}

      {/* Section 4: Mathematical Logic & Formulations */}
      {activeSection === 'math' && (
        <div className="bg-[#090a14]/75 backdrop-blur-xl rounded-2xl border border-white/[0.07] p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] ring-1 ring-inset ring-white/[0.05] space-y-6">
          <div className="space-y-4">
            <h4 className="font-bold text-sm flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Mathematical Proofs & Computational Formulation
              </span>
            </h4>

            {/* Formula 1 */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="font-bold text-xs text-slate-200">
                1. Safe Skip Capacity ($S$) out of Remaining Routine ($R$):
              </div>
              <div className="my-2 p-2.5 bg-[#070812]/90 text-cyan-400 font-mono tracking-tight text-xs rounded-lg border border-indigo-500/20">
                S = R - max(0, ⌈ T × (C + R) - P ⌉)
              </div>
              <p className="text-xs text-slate-400">
                Where $P$ is present classes, $C$ is conducted classes ($P + A$; canceled excluded), $R$ is future scheduled classes until semester end date, and $T$ is target ratio (e.g. 0.75).
              </p>
            </div>

            {/* Formula 2 */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="font-bold text-xs text-slate-200">
                2. Immediate Consecutive Bunk Allowance ($B$) Today:
              </div>
              <div className="my-2 p-2.5 bg-[#070812]/90 text-cyan-400 font-mono tracking-tight text-xs rounded-lg border border-indigo-500/20">
                B = max(0, ⌊ (P / T) - C ⌋)
              </div>
              <p className="text-xs text-slate-400">
                Determines how many consecutive classes can be skipped starting today before dipping below target threshold $T$.
              </p>
            </div>

            {/* Formula 3 */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="font-bold text-xs text-slate-200">
                3. Consecutive Recovery Classes ($K$):
              </div>
              <div className="my-2 p-2.5 bg-[#070812]/90 text-rose-400 font-mono tracking-tight text-xs rounded-lg border border-rose-500/20">
                K = ⌈ (T × C - P) / (1 - T) ⌉   [when P / C &lt; T]
              </div>
              <p className="text-xs text-slate-400">
                Number of upcoming classes the student must attend consecutively with zero skips to raise attendance back up to target $T$.
              </p>
            </div>

            {/* Formula 4 */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="font-bold text-xs text-slate-200">
                4. Academic Marks Scaling & Credit-Weighted GPA:
              </div>
              <div className="my-2 p-2.5 bg-[#070812]/90 text-emerald-400 font-mono tracking-tight text-xs rounded-lg border border-emerald-500/20">
                GPA_Marks = ∑(Marks_i × Credits_i) / ∑(Credits_i)
              </div>
              <p className="text-xs text-slate-400">
                Each subject awards marks based on tier: ≥90%: 5.0, 85-89.9%: 4.5, 80-84.9%: 4.0, 75-79.9%: 3.5, 70-74.9%: 3.0, &lt;70%: 0.0 Marks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
