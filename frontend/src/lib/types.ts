export interface Employee {
  emp_code: string;
  full_name: string;
  department: string;
  designation: string;
  mobile: string;
  notes: string;
  registered_date?: string;
  avatar_url?: string;
  has_embedding?: boolean;
}

export interface AttendanceRecord {
  id?: number | string;
  emp_code: string;
  checkin_date: string;
  checkin_time: string;
  checkout_time: string | null;
  employee_name?: string;
  department?: string;
  designation?: string;
  status?: "Present" | "Checked Out" | "Late" | "Admin Adjusted";
  confidence_score?: number;
  notes?: string;
  is_admin_modified?: boolean;
  modified_by?: string;
  modified_at?: string;
}

export interface FaceEmbeddingRecord {
  emp_code: string;
  embedding_base64: string;
  updated_at?: string;
}

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  checkedInNow: number;
  checkedOutToday: number;
  absentToday: number;
  attendanceRate: number;
}

export interface RecognitionResult {
  matchFound: boolean;
  empCode?: string;
  employee?: Employee;
  confidence: number;
  timestamp: string;
  actionTaken: "checked_in" | "checked_out" | "already_recorded" | "none";
  message: string;
}
