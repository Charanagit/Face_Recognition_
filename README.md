# 🏢 OnTech AI Biometric Face Attendance System

[![Next.js](https://img.shields.io/badge/Next.js-15.2.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![InsightFace](https://img.shields.io/badge/InsightFace-ArcFace_512--d-FF6F00?style=flat-square)](https://github.com/deepinsight/insightface)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-5C3EE8?style=flat-square&logo=opencv)](https://opencv.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_Cloud-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://vercel.com/)

An enterprise-grade, real-time **AI-Powered Face Attendance and Workforce Management System**. Combines a high-performance **Desktop Recognition Kiosk** (OpenCV + InsightFace 512-d ArcFace neural embeddings) with a modern **Cloud-Synchronized Web Management Portal** (Next.js 15, Tailwind CSS, Supabase PostgreSQL).

---

## 🌐 Live Web Portal Demo
* **Production Deployment:** [https://facerec-ls818y0td-charana1.vercel.app](https://facerec-ls818y0td-charana1.vercel.app)
* **Backend:** Supabase PostgreSQL Cloud (Real-time replication)

---

## 📐 System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           Vercel Cloud Deployment            │
                               │        Next.js 15 Admin / HR Portal          │
                               │  • Real-time Attendance & Shift Tracking     │
                               │  • Staff Directory & Profile Management      │
                               │  • Biometric Face Photo Enrollment Engine    │
                               │  • Monthly Muster Roll & PDF/CSV Export      │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      │ HTTPS / REST & Real-time WebSockets
                                                      ▼
                                           ┌─────────────────────┐
                                           │ Supabase Cloud DB   │
                                           │  • employees        │
                                           │  • face_embeddings  │
                                           │  • attendance logs  │
                                           └──────────▲──────────┘
                                                      │
                                                      │ Instant Cloud Synchronization
                                                      │
                               ┌──────────────────────┴───────────────────────┐
                               │           Physical Desktop Kiosk             │
                               │           (Python 3.11 + OpenCV)             │
                               │  • InsightFace buffalo_s ArcFace 512-d Model │
                               │  • Real-Time Sub-Second Face Matching        │
                               │  • Smart Check-In / Check-Out Auto-Switching │
                               │  • Works Offline with Fallback Local Sync    │
                               └──────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🖥️ 1. Physical Desktop Recognition Terminal (`recognize_webcam.py`)
* **InsightFace buffalo_s (ArcFace 512-d Embeddings):** Deep-metric feature extraction invariant to lighting, pose angles, facial expressions, and eyewear.
* **Real-Time 30+ FPS Inference:** High-throughput computer vision pipeline with cosine similarity distance thresholding (`0.28`).
* **Automated Check-In / Check-Out Engine:** Automatically detects whether an employee is arriving for their shift (Check-In) or finishing their workday (Check-Out).
* **Anti-Double Punch Cooldown:** Enforces rate-limiting to prevent duplicate attendance logs within configurable time windows.
* **Portable Desktop Launcher:** Lightweight Tkinter GUI with one-click model synchronization, cloud health diagnostics, and instant camera launch.

### 📊 2. Cloud Web Admin Dashboard (`frontend/`)
* **Executive Attendance Overview:** Live KPI counters for Total Staff, Present Today, Active on Premises, and Departed.
* **Departmental Analytics:** Dynamic percentage progress bars tracking attendance per department.
* **Staff Directory & Face Enrollment:**
  * Register new employees with role, department, and contact info.
  * Upload 1 to 3 reference face photos to automatically generate and synchronize 512-dimensional biometric feature vectors.
  * Direct photo update modal for existing staff members.
* **Admin Audit & False Check-Out Removal:** Allows administrators to revert mistaken check-outs without corrupting attendance histories.
* **Automated Muster Rolls & Reports:** Monthly attendance aggregations, shift completion metrics, cumulative hours calculated per staff member, with one-click **CSV** and **Print** exports.
* **Corporate Theme:** Styled with professional `#276F27` (Forest Green), `#8ECA3C` (Lime Green), and high-contrast dark accents.

### 🛡️ 3. Biometric Security & Privacy
* **Zero Raw Photo Storage Requirement:** The system converts all reference images into 512-dimensional floating-point vectors (`Float32`) and discards the raw pixels if desired. Recognition runs purely on mathematical distance checks.

---

## 🚀 Quick Start Guide

### Option A: Run the Pre-Packaged Desktop App (For Recruiters / Reviewers)
> No Python, CUDA, or model downloads required!

1. Go to the [Releases](../../releases) tab on this repository.
2. Download `OntechAttendanceKiosk_Standalone.zip`.
3. Extract the ZIP folder on any Windows PC.
4. Double-click **`Ontech Attendance Kiosk.exe`** to launch the camera recognition terminal.

---

### Option B: Run the Desktop Terminal from Source

#### 1. Clone the repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/Face_Recognition.git
cd Face_Recognition
```

#### 2. Create and activate a Python virtual environment
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
```

#### 3. Install Python dependencies
```bash
pip install -r requirements.txt
```

#### 4. Launch the Desktop Recognition App
```bash
python recognize_webcam.py
```

---

### Option C: Run the Web Dashboard Locally

#### 1. Navigate to the frontend directory
```bash
cd frontend
```

#### 2. Install Node dependencies
```bash
npm install
```

#### 3. Configure Environment Variables
Create a `.env.local` file in `frontend/`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://crujjurupavknjwdjjmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydWpqdXJ1cGF2a25qd2Rqam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjI0MTAsImV4cCI6MjA4NjUzODQxMH0.MdQDrEHOyQ0mI6HGX986lNMw5cpj5pfUCnKFh88pnzw
```

#### 4. Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Architecture (Supabase PostgreSQL)

```sql
-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    emp_code        TEXT PRIMARY KEY,
    full_name       TEXT NOT NULL,
    department      TEXT,
    designation     TEXT,
    mobile          TEXT,
    registered_date TEXT,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Face Embeddings (512-dimension Float32 serialized as Base64)
CREATE TABLE IF NOT EXISTS face_embeddings (
    emp_code         TEXT PRIMARY KEY REFERENCES employees(emp_code) ON DELETE CASCADE,
    embedding_base64 TEXT NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Attendance Logs
CREATE TABLE IF NOT EXISTS attendance (
    id                BIGSERIAL PRIMARY KEY,
    emp_code          TEXT NOT NULL REFERENCES employees(emp_code) ON DELETE CASCADE,
    checkin_date      TEXT NOT NULL,
    checkin_time      TEXT NOT NULL,
    checkout_time     TEXT,
    status            TEXT DEFAULT 'Present',
    is_admin_modified BOOLEAN DEFAULT FALSE,
    notes             TEXT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for high-speed sub-millisecond lookups
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(emp_code, checkin_date);
```

---

## 📁 Repository Structure

```
├── frontend/                     # Next.js 15 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/generate-embedding/  # Face embedding extraction API route
│   │   │   ├── globals.css              # Custom corporate CSS design tokens
│   │   │   ├── layout.tsx               # Root layout & meta tags
│   │   │   └── page.tsx                 # Core Dashboard entry point
│   │   ├── components/
│   │   │   ├── AttendanceTab.tsx        # Attendance logs & manual punch override
│   │   │   ├── DashboardTab.tsx         # Executive KPI summary & department stats
│   │   │   ├── EmployeesTab.tsx         # Staff directory & photo management modal
│   │   │   ├── KiosksTab.tsx            # Physical terminal hardware monitor
│   │   │   ├── KioskTab.tsx             # In-browser biometric simulator
│   │   │   ├── Navbar.tsx               # Top navigation & cloud status badge
│   │   │   ├── RegisterTab.tsx          # Employee enrollment & photo upload
│   │   │   ├── ReportsTab.tsx           # Monthly muster roll & CSV export
│   │   │   └── SettingsTab.tsx          # Supabase sync & PostgreSQL schema viewer
│   │   └── lib/
│   │       ├── faceEngine.ts            # Biometric vector math & cosine similarity
│   │       ├── supabase.ts              # Supabase JavaScript client & initial seed
│   │       └── types.ts                 # TypeScript data contracts & interfaces
│   ├── package.json
│   └── tsconfig.json
├── recognize_webcam.py           # Core Desktop Kiosk recognition app & GUI
├── process_photos_embedding.py   # CLI / headless photo vectorization pipeline
├── generate_embeddings_cli.py    # Batch dataset embedding generator utility
├── requirements.txt              # Python dependencies
├── .gitignore                    # Clean repository ignore rules
└── README.md                     # Project documentation & employer guide
```

---

## 🛠️ Technology Stack Summary

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **UI & Styling** | Tailwind CSS v4, Lucide Icons, Custom Corporate Palette |
| **Computer Vision / AI** | InsightFace ArcFace (`buffalo_s`), MediaPipe, OpenCV, ONNX Runtime |
| **Desktop Application** | Python 3.11, Tkinter GUI, PyInstaller Standalone Bundle |
| **Cloud Database** | Supabase PostgreSQL, Realtime WebSockets, REST API |
| **Deployment** | Vercel (Web Dashboard), Standalone Executable (Physical Kiosks) |

---

## 👤 Author
**Charana Gunawardana**
* **Role:** Lead AI & Full-Stack Developer
* **GitHub:** [@Charanagit](https://github.com/Charanagit)
* **LinkedIn:** [Charana Gunawardana](https://www.linkedin.com/)

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
