import { createClient } from "@supabase/supabase-js";
import { Employee, AttendanceRecord } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://crujjurupavknjwdjjmj.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNydWpqdXJ1cGF2a25qd2Rqam1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjI0MTAsImV4cCI6MjA4NjUzODQxMH0.MdQDrEHOyQ0mI6HGX986lNMw5cpj5pfUCnKFh88pnzw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

// Initial Seed Data for Instant Local Testing if Supabase is offline
export const INITIAL_EMPLOYEES: Employee[] = [
  {
    emp_code: "EMP-001",
    full_name: "Charana Gunawardana",
    department: "AI & Engineering",
    designation: "Lead AI Engineer",
    mobile: "+94 77 123 4567",
    notes: "System Administrator & Core Developer",
    registered_date: "2026-03-01",
    has_embedding: true,
  },
  {
    emp_code: "EMP-002",
    full_name: "Kamal Perera",
    department: "Computer Vision",
    designation: "Senior Vision Researcher",
    mobile: "+94 71 987 6543",
    notes: "Model training & evaluation lead",
    registered_date: "2026-03-05",
    has_embedding: true,
  },
  {
    emp_code: "EMP-003",
    full_name: "Nadeesha Silva",
    department: "Operations",
    designation: "HR & Attendance Manager",
    mobile: "+94 70 555 1234",
    notes: "Kiosk supervision & staff coordination",
    registered_date: "2026-03-10",
    has_embedding: true,
  },
  {
    emp_code: "EMP-004",
    full_name: "Tharindu Wickramasinghe",
    department: "AI & Engineering",
    designation: "Fullstack Developer",
    mobile: "+94 76 444 8888",
    notes: "Next.js UI & Supabase backend",
    registered_date: "2026-03-15",
    has_embedding: false,
  },
  {
    emp_code: "EMP-005",
    full_name: "Dilini Fernando",
    department: "Design & UX",
    designation: "UI/UX Specialist",
    mobile: "+94 78 333 9999",
    notes: "Brand identity & accessibility",
    registered_date: "2026-03-20",
    has_embedding: true,
  },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 1,
    emp_code: "EMP-001",
    employee_name: "Charana Gunawardana",
    department: "AI & Engineering",
    checkin_date: new Date().toISOString().split("T")[0],
    checkin_time: "08:42:15",
    checkout_time: null,
    status: "Present",
    confidence_score: 98.4,
  },
  {
    id: 2,
    emp_code: "EMP-002",
    employee_name: "Kamal Perera",
    department: "Computer Vision",
    checkin_date: new Date().toISOString().split("T")[0],
    checkin_time: "09:05:30",
    checkout_time: null,
    status: "Present",
    confidence_score: 96.8,
  },
  {
    id: 3,
    emp_code: "EMP-003",
    employee_name: "Nadeesha Silva",
    department: "Operations",
    checkin_date: new Date().toISOString().split("T")[0],
    checkin_time: "08:30:10",
    checkout_time: "17:05:22",
    status: "Checked Out",
    confidence_score: 99.1,
  },
];
