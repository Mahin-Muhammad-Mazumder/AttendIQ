# 🌌 AttendIQ — Academic Attendance Tracker & Bunk Predictor

![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-Analytics-8B5CF6?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-10B981?style=flat-square)

**AttendIQ** is an academic attendance management web application and dynamic "what-if" bunk simulator engineered for university engineering students. Wrapped in a bespoke **Black Nebula** frosted-obsidian interface, it combines automated weekly timetable projection (Sunday–Thursday 5-day academic week), real-time institutional GPA attendance marks scaling, and strict click-verified cancellation exclusion logic—all running locally in the browser with zero backend latency.

---

## ✨ Key Features

* **📊 Real-Time Dashboard & Telemetry:** Track weighted and unweighted GPA attendance marks, overall attendance percentages, individual course standings, and at-risk subjects using neon SVG gauges, radar polygons, and 30-day trend charts.
* **📝 Strict Click-Verified Daily Logger:** Log daily classes as *Attended (Present)*, *Skip (Absent)*, or *Canceled* with custom notes, ad-hoc extra class support, and one-click bulk logging (*Mark All Present*). Only classes explicitly clicked by the user are counted, preventing phantom pre-seeded data from skewing metrics.
* **🛡️ Automated Cancellation & Holiday Exclusion Engine:** Canceled classes, Fridays/Saturdays, and official institutional holidays are strictly excluded from conducted class totals (`Conducted = Present + Absent`), ensuring teacher cancellations never dilute your attendance percentage.
* **🔮 Live What-If Aura & Bunk Predictor:** Interactive simulator calculating your exact safe-bunk runway (total skips allowed and consecutive skips available right now) or the exact consecutive classes required to recover to target thresholds (`70%`, `75%`, `90%+`).
* **🗓️ Routine & Timetable Manager:** Configure weekly schedules with course codes, credit hours, time slots, and semester start/end boundary validation (`timetableSlotId`).
* **🔥 Gamification & Semester Heatmap:** Track continuous attendance streaks, earn XP and milestone badges, and inspect your entire semester across an interactive Sunday–Thursday calendar heatmap.

---

## 🧮 Institutional Attendance Marks Scaling

AttendIQ enforces strict mathematical rules across all components:

* **Conducted Classes Formula:** `Conducted = Present + Absent` *(Canceled classes and holidays are omitted from the denominator).*
* **Attendance Percentage:** `Attendance % = (Present / Conducted) × 100`

| Attendance Tier | Percentage Range | Awarded Marks (Out of 5.0) | Standing Status |
| :--- | :--- | :--- | :--- |
| 🟢 **Supernova Tier** | `90.0% – 100%` | **5.0 Marks** | Outstanding |
| 🔵 **Stable Nebula** | `85.0% – 89.9%` | **4.5 Marks** | Excellent |
| 🔵 **Stable Nebula** | `80.0% – 84.9%` | **4.0 Marks** | Very Good |
|  indigo **Stable Nebula** | `75.0% – 79.9%` | **3.5 Marks** | Good (Target Benchmark) |
| 🟡 **Marginal Zone** | `70.0% – 74.9%` | **3.0 Marks** | Marginal |
| 🔴 **Critical Pulsar** | `< 70.0%` | **0.0 Marks** | Warning / Disqualification Risk |

---

## 🎨 Design System: Black Nebula

* **Abyssal Obsidian Canvas:** Deep space background (`#030308`) layered with a subtle starlight dot grid and ambient purple, indigo, and cyan nebula glows.
* **Frosted Glassmorphism:** Multi-layered translucent cards (`backdrop-blur-xl`) with top-edge specular highlights and bioluminescent semantic status badges.
* **Keyboard-First Workflow:** Built-in hotkey reference modal for rapid view switching and instant daily logging.

---

## 🛠️ Tech Stack

* **Framework:** React 18 + TypeScript + Vite
* **Styling:** Tailwind CSS (Custom *Black Nebula* glassmorphism utilities & gradients)
* **Data Visualization:** Recharts (Radar, Area, & Bar Charts) + Custom SVG Linear-Gradient Gauges
* **Icons:** Lucide React
* **Persistence:** Client-side `localStorage` schema with strict `userClicked: true` and `timetableSlotId` boundary verification

---

## 🚀 Quick Start & Local Installation

1. **Clone the repository:**
   `git clone https://github.com/mahin/attendiq.git && cd attendiq`
2. **Install dependencies:**
   `npm install`
3. **Run the development server:**
   `npm run dev`
4. **Build for production:**
   `npm run build`

---

## 📂 Project Architecture

* `src/App.tsx` — Root layout, Black Nebula ambient canvas, navigation & state sync
* `src/types.ts` — TypeScript interfaces for courses, slots, logs, and telemetry
* `src/utils/marksEngine.ts` — Core attendance math, GPA credit weighting, and bunk/recovery calculations
* `src/components/DashboardView.tsx` — Main telemetry, Recharts analytics, and Sun–Thu semester heatmap
* `src/components/TodayScheduleDock.tsx` — Instant daily lecture logger and bulk action dock
* `src/components/InteractiveSubjectCard.tsx` — Per-course telemetry card with Live What-If Aura Simulator
* `src/components/DailyLoggerView.tsx` — Full date-filtered attendance log manager
* `src/components/RoutineView.tsx` — Weekly timetable and course credit configuration
* `src/components/BunkPredictorView.tsx` — Deep forecast what-if simulator and recovery planner
* `src/components/ExclusionCalendarView.tsx` — Holiday, exam week, and weekend (Fri/Sat) exclusion manager
* `src/components/GamificationView.tsx` — Attendance streaks, XP level progression, and badges
* `src/components/ReportsView.tsx` — Monthly attendance breakdown and exportable summaries
* `src/components/ArchitectureSchemaModal.tsx` — Interactive system architecture and state schema viewer
* `src/components/KeyboardShortcutsModal.tsx` — Hotkey navigation reference

---

## 👤 Author

**Mahin Muhammad Mazumder (M. Mahin)**  
B.Sc. in Electrical and Electronic Engineering (EEE)  
University of Chittagong

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.