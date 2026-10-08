"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { DashboardTab } from "../components/DashboardTab";
import { RegisterTab } from "../components/RegisterTab";
import { EmployeesTab } from "../components/EmployeesTab";
import { AttendanceTab } from "../components/AttendanceTab";
import { ReportsTab } from "../components/ReportsTab";
import { SettingsTab } from "../components/SettingsTab";
import { Employee, AttendanceRecord, AttendanceStats } from "../lib/types";
import { supabase, INITIAL_EMPLOYEES, INITIAL_ATTENDANCE } from "../lib/supabase";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [supabaseOnline, setSupabaseOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Set mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Initial Data from Supabase with Local Fallback
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Employees
      const { data: empData, error: empError } = await supabase
        .from("employees")
        .select("emp_code, full_name, department, designation, mobile, notes, registered_date");

      // 2. Fetch Face Embeddings presence
      const { data: embData } = await supabase
        .from("face_embeddings")
        .select("emp_code");

      const embMap = new Set((embData || []).map((e) => e.emp_code));

      if (!empError && empData && empData.length > 0) {
        setSupabaseOnline(true);
        const mappedEmployees: Employee[] = empData.map((e) => ({
          emp_code: e.emp_code,
          full_name: e.full_name || e.emp_code,
          department: e.department || "General",
          designation: e.designation || "Staff",
          mobile: e.mobile || "",
          notes: e.notes || "",
          registered_date: e.registered_date || "",
          has_embedding: embMap.has(e.emp_code),
        }));
        setEmployees(mappedEmployees);
      } else {
        const saved = localStorage.getItem("facerec_employees");
        if (saved) {
          setEmployees(JSON.parse(saved));
        }
      }

      // 3. Fetch Attendance
      const { data: attData, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .order("checkin_time", { ascending: false });

      if (!attError && attData && attData.length > 0) {
        const empLookup = new Map(
          (empData || []).map((e) => [e.emp_code, e])
        );

        const enrichedAttendance: AttendanceRecord[] = attData.map((r) => {
          const emp = empLookup.get(r.emp_code);
          return {
            ...r,
            employee_name: r.employee_name || emp?.full_name || r.emp_code,
            department: r.department || emp?.department || "General",
            designation: r.designation || emp?.designation || "Staff",
            status: r.status || (r.checkout_time ? "Checked Out" : "Present"),
          };
        });

        setAttendance(enrichedAttendance);
      } else {
        const savedAtt = localStorage.getItem("facerec_attendance");
        if (savedAtt) {
          setAttendance(JSON.parse(savedAtt));
        }
      }
    } catch (err) {
      console.warn("Supabase fetch error, running in local database mode:", err);
      setSupabaseOnline(false);
      const saved = localStorage.getItem("facerec_employees");
      if (saved) setEmployees(JSON.parse(saved));
      const savedAtt = localStorage.getItem("facerec_attendance");
      if (savedAtt) setAttendance(JSON.parse(savedAtt));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    if (employees.length > 0) {
      localStorage.setItem("facerec_employees", JSON.stringify(employees));
    }
  }, [employees]);

  useEffect(() => {
    if (attendance.length > 0) {
      localStorage.setItem("facerec_attendance", JSON.stringify(attendance));
    }
  }, [attendance]);

  // Accurate Local Date calculation
  const getLocalDateIso = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayIso = getLocalDateIso();
  const todayRecords = attendance.filter((r) => r.checkin_date === todayIso);
  const uniquePresentCodes = new Set(todayRecords.map((r) => r.emp_code));
  const presentCount = uniquePresentCodes.size;
  const checkedInNowCount = todayRecords.filter((r) => !r.checkout_time).length;
  const checkedOutCount = todayRecords.filter((r) => Boolean(r.checkout_time)).length;
  const totalCount = employees.length;
  const absentCount = Math.max(0, totalCount - presentCount);
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const stats: AttendanceStats = {
    totalEmployees: totalCount,
    presentToday: presentCount,
    checkedInNow: checkedInNowCount,
    checkedOutToday: checkedOutCount,
    absentToday: absentCount,
    attendanceRate,
  };

  const [selectedEnrollEmpCode, setSelectedEnrollEmpCode] = useState<string | null>(null);

  // Handler: Upload / Update Face Embedding directly from modal
  const handleUploadEmbedding = async (
    empCode: string,
    embeddingBase64: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await supabase.from("face_embeddings").upsert({
        emp_code: empCode,
        embedding_base64: embeddingBase64,
      });

      setEmployees((prev) =>
        prev.map((e) => (e.emp_code === empCode ? { ...e, has_embedding: true } : e))
      );

      return {
        success: true,
        message: `Face biometric vector saved successfully for ${empCode}!`,
      };
    } catch (err: any) {
      console.error("Embedding upload error:", err);
      return {
        success: false,
        message: err.message || "Failed to save face vector to cloud.",
      };
    }
  };

  // Handler: Save / Enroll Employee
  const handleSaveEmployee = async (
    employee: Employee,
    embeddingBase64: string | null,
    photoDataUrls: string[]
  ): Promise<{ success: boolean; message: string }> => {
    try {
      setEmployees((prev) => {
        const filtered = prev.filter((e) => e.emp_code !== employee.emp_code);
        return [employee, ...filtered];
      });

      try {
        await supabase.from("employees").upsert({
          emp_code: employee.emp_code,
          full_name: employee.full_name,
          department: employee.department,
          designation: employee.designation,
          mobile: employee.mobile,
          notes: employee.notes,
          registered_date: employee.registered_date,
        });

        if (embeddingBase64) {
          await supabase.from("face_embeddings").upsert({
            emp_code: employee.emp_code,
            embedding_base64: embeddingBase64,
          });
        }
      } catch (sbErr) {
        console.warn("Supabase upsert failed, stored in local state:", sbErr);
      }

      return {
        success: true,
        message: `Employee ${employee.emp_code} (${employee.full_name}) saved successfully!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Failed to save employee profile.",
      };
    }
  };

  // Handler: Update Employee
  const handleUpdateEmployee = async (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.emp_code === updatedEmp.emp_code ? updatedEmp : e)));
    try {
      await supabase.from("employees").upsert({
        emp_code: updatedEmp.emp_code,
        full_name: updatedEmp.full_name,
        department: updatedEmp.department,
        designation: updatedEmp.designation,
        mobile: updatedEmp.mobile,
        notes: updatedEmp.notes,
      });
    } catch (err) {
      console.warn("Supabase update error:", err);
    }
  };

  // Handler: Delete Employee
  const handleDeleteEmployee = async (empCode: string) => {
    if (!confirm(`Are you sure you want to delete employee ${empCode}?`)) return;
    setEmployees((prev) => prev.filter((e) => e.emp_code !== empCode));
    try {
      await supabase.from("employees").delete().eq("emp_code", empCode);
    } catch (err) {
      console.warn("Supabase delete error:", err);
    }
  };

  // Handler: Mark Check-Out from Dashboard
  const handleMarkCheckOut = async (empCode: string) => {
    const nowTime = new Date().toLocaleTimeString("en-US", { hour12: false });
    setAttendance((prev) =>
      prev.map((r) => {
        if (r.emp_code === empCode && r.checkin_date === todayIso && !r.checkout_time) {
          return { ...r, checkout_time: nowTime, status: "Checked Out" };
        }
        return r;
      })
    );
    try {
      await supabase
        .from("attendance")
        .update({ checkout_time: nowTime })
        .eq("emp_code", empCode)
        .eq("checkin_date", todayIso);
    } catch (err) {
      console.warn("Supabase checkout error:", err);
    }
  };

  // Handler: Manual Attendance Add
  const handleAddManualRecord = async (record: AttendanceRecord) => {
    setAttendance((prev) => [record, ...prev]);
    try {
      const { error } = await supabase.from("attendance").insert({
        emp_code: record.emp_code,
        checkin_date: record.checkin_date,
        checkin_time: record.checkin_time,
        checkout_time: record.checkout_time || null,
      });
      if (error) {
        console.warn("Supabase manual insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase manual insert exception:", err);
    }
  };

  // Handler: Update Attendance Record (Admin Edit Time)
  const handleUpdateAttendanceRecord = async (record: AttendanceRecord) => {
    setAttendance((prev) =>
      prev.map((r) =>
        (record.id ? r.id === record.id : (r.emp_code === record.emp_code && r.checkin_date === record.checkin_date))
          ? record
          : r
      )
    );

    try {
      let query = supabase
        .from("attendance")
        .update({
          checkin_time: record.checkin_time,
          checkout_time: record.checkout_time || null,
        });

      if (record.id) {
        query = query.eq("id", record.id);
      } else {
        query = query.eq("emp_code", record.emp_code).eq("checkin_date", record.checkin_date);
      }

      const { error } = await query;
      if (error) {
        console.warn("Supabase update attendance error:", error);
      }
    } catch (err) {
      console.warn("Supabase update attendance exception:", err);
    }
  };

  // Handler: Remove False Check-Out (Re-open Shift)
  const handleRemoveCheckout = async (empCode: string, checkinDate: string, recordId?: number | string) => {
    setAttendance((prev) =>
      prev.map((r) => {
        const matches = recordId ? r.id === recordId : (r.emp_code === empCode && r.checkin_date === checkinDate);
        if (matches) {
          return {
            ...r,
            checkout_time: null,
            status: "Present",
            is_admin_modified: true,
            notes: (r.notes ? r.notes + " • " : "") + "Admin removed false check-out (Shift Re-opened)",
          };
        }
        return r;
      })
    );

    try {
      let query = supabase
        .from("attendance")
        .update({
          checkout_time: null,
        });

      if (recordId) {
        query = query.eq("id", recordId);
      } else {
        query = query.eq("emp_code", empCode).eq("checkin_date", checkinDate);
      }

      const { error } = await query;
      if (error) {
        console.warn("Supabase remove checkout error:", error);
      }
    } catch (err) {
      console.warn("Supabase remove checkout exception:", err);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f9fafb] text-[#000000] flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#276F27] flex items-center justify-center animate-pulse shadow-lg">
          <span className="text-[#ffffff] font-black text-2xl tracking-tighter">FR</span>
        </div>
        <div className="text-xs font-bold text-[#276F27] tracking-widest uppercase">
          Loading FaceRec Attendance System...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#111827] flex flex-col selection:bg-[#8ECA3C] selection:text-[#000000]">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        supabaseOnline={supabaseOnline}
        totalEmployees={employees.length}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <DashboardTab
            employees={employees}
            attendance={attendance}
            stats={stats}
            onRefresh={fetchData}
            onMarkCheckOut={handleMarkCheckOut}
            onNavigate={setActiveTab}
            onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
            onRemoveCheckout={handleRemoveCheckout}
          />
        )}

        {activeTab === "employees" && (
          <EmployeesTab
            employees={employees}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onReEnroll={(code) => {
              setSelectedEnrollEmpCode(code);
              setActiveTab("register");
            }}
            onUploadEmbedding={handleUploadEmbedding}
          />
        )}

        {activeTab === "register" && (
          <RegisterTab
            onSaveEmployee={handleSaveEmployee}
            existingEmployees={employees}
            initialEmpCode={selectedEnrollEmpCode}
            onClearInitialEmpCode={() => setSelectedEnrollEmpCode(null)}
          />
        )}

        {activeTab === "attendance" && (
          <AttendanceTab
            attendance={attendance}
            employees={employees}
            onAddManualRecord={handleAddManualRecord}
            onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
            onRemoveCheckout={handleRemoveCheckout}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            employees={employees}
            attendance={attendance}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            supabaseOnline={supabaseOnline}
            onRefreshAll={fetchData}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-gray-200 bg-[#ffffff] py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-gray-700">© 2026 FaceRec • AI Biometric Face Recognition Management System</p>
          <p className="text-[11px] font-medium text-[#276F27]">
            Cloud Synchronized Biometric Attendance
          </p>
        </div>
      </footer>

    </div>
  );
}
