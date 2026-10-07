"use client";

import React, { useState } from "react";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  Search, 
  ArrowUpRight, 
  CheckCircle2, 
  LogOut,
  RefreshCw,
  Sparkles,
  Building2,
  Calendar,
  FileSpreadsheet,
  Edit3,
  FileEdit,
  X,
  AlertCircle,
  Briefcase,
  RotateCcw
} from "lucide-react";
import { Employee, AttendanceRecord, AttendanceStats } from "../lib/types";

interface DashboardTabProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  stats: AttendanceStats;
  onRefresh: () => void;
  onMarkCheckOut: (empCode: string) => void;
  onNavigate: (tab: string) => void;
  onUpdateAttendanceRecord?: (record: AttendanceRecord) => void;
  onRemoveCheckout?: (empCode: string, checkinDate: string, recordId?: number | string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  employees,
  attendance,
  stats,
  onRefresh,
  onMarkCheckOut,
  onNavigate,
  onUpdateAttendanceRecord,
  onRemoveCheckout,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");

  // Edit / Adjust Attendance Modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editCheckin, setEditCheckin] = useState("");
  const [editCheckout, setEditCheckout] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getLocalDateIso = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayIso = getLocalDateIso();
  const todayRecords = attendance.filter((r) => r.checkin_date === todayIso);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  // Calculate accurate department breakdown by matching employee codes
  const deptBreakdown = departments.map((dept) => {
    const deptEmployees = employees.filter((e) => e.department === dept);
    const deptEmpCodes = new Set(deptEmployees.map((e) => e.emp_code));

    // Get today's attendance logs for this department
    const deptTodayLogs = todayRecords.filter((r) => deptEmpCodes.has(r.emp_code));
    const uniquePresentInDept = new Set(deptTodayLogs.map((r) => r.emp_code)).size;
    const inShiftInDept = deptTodayLogs.filter((r) => !r.checkout_time).length;
    const checkedOutInDept = deptTodayLogs.filter((r) => Boolean(r.checkout_time)).length;
    const totalInDept = deptEmployees.length;
    const absentInDept = Math.max(0, totalInDept - uniquePresentInDept);
    const pct = totalInDept > 0 ? Math.round((uniquePresentInDept / totalInDept) * 100) : 0;

    return { 
      dept, 
      total: totalInDept, 
      present: uniquePresentInDept, 
      activeNow: inShiftInDept,
      checkedOut: checkedOutInDept,
      absent: absentInDept,
      pct 
    };
  });

  const filteredTodayRecords = todayRecords.filter((record) => {
    const emp = employees.find((e) => e.emp_code === record.emp_code);
    const empName = record.employee_name || emp?.full_name || record.emp_code;
    const empDept = record.department || emp?.department || "General";

    const matchesSearch =
      record.emp_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empDept.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDept === "all" || empDept === filterDept;
    return matchesSearch && matchesDept;
  });

  // Export Today CSV
  const handleExportTodayCSV = () => {
    const headers = ["Employee Code,Name,Department,Check-In Time,Check-Out Time,Status,Admin Modified,Notes"];
    const rows = filteredTodayRecords.map((r) =>
      `"${r.emp_code}","${r.employee_name || ""}","${r.department || ""}","${r.checkin_time}","${r.checkout_time || "-"}","${r.checkout_time ? "Checked Out" : "Present"}","${r.is_admin_modified ? "Yes" : "No"}","${(r.notes || "").replace(/"/g, '""')}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `today_attendance_${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Edit Modal
  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    const inParts = rec.checkin_time.split(":");
    setEditCheckin(inParts.length >= 2 ? `${inParts[0].padStart(2, '0')}:${inParts[1].padStart(2, '0')}` : rec.checkin_time);
    
    if (rec.checkout_time) {
      const outParts = rec.checkout_time.split(":");
      setEditCheckout(outParts.length >= 2 ? `${outParts[0].padStart(2, '0')}:${outParts[1].padStart(2, '0')}` : rec.checkout_time);
    } else {
      setEditCheckout("");
    }
    setEditNotes(rec.notes || "Admin time adjustment");
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const inTimeFormatted = editCheckin.length === 5 ? `${editCheckin}:00` : editCheckin;
    const outTimeFormatted = editCheckout ? (editCheckout.length === 5 ? `${editCheckout}:00` : editCheckout) : null;

    const updatedRecord: AttendanceRecord = {
      ...editingRecord,
      checkin_time: inTimeFormatted,
      checkout_time: outTimeFormatted,
      status: outTimeFormatted ? "Checked Out" : "Present",
      is_admin_modified: true,
      modified_by: "Admin",
      modified_at: new Date().toISOString(),
      notes: editNotes.trim() || (outTimeFormatted ? "Adjusted by Admin" : "Admin removed false check-out (Shift Re-opened)"),
    };

    if (onUpdateAttendanceRecord) {
      onUpdateAttendanceRecord(updatedRecord);
    }
    setEditingRecord(null);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Welcome Banner */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#276F27]/10 border border-[#276F27]/20 text-[#276F27] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#276F27]" />
              <span>Admin Management Dashboard</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              Executive Attendance Overview
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 flex items-center space-x-2 font-medium">
              <Calendar className="w-4 h-4 text-[#276F27]" />
              <span className="text-black font-semibold">{todayStr}</span>
              <span>• Desktop Recognition Kiosk Sync Active</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("register")}
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-[#276F27] hover:bg-[#1e571e] text-white font-bold text-sm shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              suppressHydrationWarning
            >
              <Users className="w-4 h-4" />
              <span>Enroll Staff</span>
            </button>
            <button
              onClick={handleExportTodayCSV}
              className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-sm border border-gray-200 transition-all cursor-pointer shadow-2xs"
              suppressHydrationWarning
            >
              <FileSpreadsheet className="w-4 h-4 text-[#276F27]" />
              <span>Export Today CSV</span>
            </button>
            <button
              onClick={onRefresh}
              className="p-3 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 transition-all shadow-2xs cursor-pointer"
              title="Refresh Data"
              suppressHydrationWarning
            >
              <RefreshCw className="w-4 h-4 text-[#276F27]" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Registered */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:border-[#276F27] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Staff</span>
            <div className="w-10 h-10 rounded-xl bg-[#276F27]/10 border border-[#276F27]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#276F27]" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-black">{stats.totalEmployees}</span>
            <span className="text-xs text-gray-500 block mt-1 font-medium">
              {employees.filter((e) => e.has_embedding).length} Active Biometric Vectors
            </span>
          </div>
          <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
            <div
              className="bg-[#276F27] h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.totalEmployees > 0 ? (employees.filter((e) => e.has_embedding).length / stats.totalEmployees) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:border-[#276F27] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Present Today</span>
            <div className="w-10 h-10 rounded-xl bg-[#276F27] flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-black">{stats.presentToday}</span>
            <span className="text-xs text-[#276F27] font-bold block mt-1">
              {stats.attendanceRate}% Attendance Rate
            </span>
          </div>
          <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
            <div
              className="bg-[#8ECA3C] h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Active On-Premises */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:border-[#276F27] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active On-Premises</span>
            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#276F27]" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-black">{stats.checkedInNow}</span>
            <span className="text-xs text-gray-500 block mt-1 font-medium">
              {stats.checkedOutToday} Completed Check-Out
            </span>
          </div>
          <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
            <div
              className="bg-[#276F27] h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.presentToday > 0 ? (stats.checkedInNow / stats.presentToday) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Absent */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:border-[#276F27] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Absent / Pending</span>
            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <UserX className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-black">{stats.absentToday}</span>
            <span className="text-xs text-gray-500 block mt-1 font-medium">
              Unmarked for today
            </span>
          </div>
          <div className="mt-3 w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
            <div
              className="bg-gray-300 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.totalEmployees > 0 ? (stats.absentToday / stats.totalEmployees) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

      </div>

      {/* Prominent Department Attendance Section */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-black flex items-center space-x-2.5">
              <Building2 className="w-6 h-6 text-[#276F27]" />
              <span>Department Attendance Breakdown</span>
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Real-time headcount, attendance rates, and on-premises tracking per operational team
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#276F27]">
            <span className="px-3 py-1.5 rounded-xl bg-[#276F27]/10 border border-[#276F27]/20">
              {departments.length} Active Departments
            </span>
          </div>
        </div>

        {/* Department Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deptBreakdown.map((item) => {
            const isSelected = filterDept === item.dept;
            return (
              <div 
                key={item.dept}
                onClick={() => setFilterDept(isSelected ? "all" : item.dept)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  isSelected 
                    ? "bg-[#276F27]/5 border-2 border-[#276F27] shadow-sm" 
                    : "bg-white hover:bg-gray-50/80 border-gray-200 hover:border-[#276F27]/50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-[#276F27] flex items-center justify-center text-white font-bold text-xs shadow-xs">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-black">{item.dept}</h3>
                      <span className="text-[10px] text-gray-500 font-semibold">{item.total} Total Staff</span>
                    </div>
                  </div>
                  <span className={`text-base font-black ${item.pct >= 75 ? "text-[#276F27]" : "text-black"}`}>
                    {item.pct}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200 mb-3">
                  <div 
                    className="bg-[#8ECA3C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>

                {/* Mini Stats Row */}
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-100 text-center">
                  <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <div className="text-[9px] text-gray-500 font-bold uppercase">Present</div>
                    <div className="text-xs font-black text-black">{item.present}</div>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <div className="text-[9px] text-gray-500 font-bold uppercase">In Shift</div>
                    <div className="text-xs font-black text-[#276F27]">{item.activeNow}</div>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <div className="text-[9px] text-gray-500 font-bold uppercase">Absent</div>
                    <div className="text-xs font-black text-gray-500">{item.absent}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content: Real-Time Today Feed */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-black">Live Attendance Feed</h2>
            <p className="text-xs text-gray-500 font-medium">
              Live check-ins streamed from desktop kiosk terminals (with manual time adjustment support)
            </p>
          </div>
          
          {/* Search & Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter today..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27] font-medium"
                suppressHydrationWarning
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-medium focus:outline-none focus:border-[#276F27]"
              suppressHydrationWarning
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-800 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Check-In</th>
                <th className="py-3.5 px-4">Check-Out</th>
                <th className="py-3.5 px-4">Status / Audit</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-900">
              {filteredTodayRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-medium">
                    No check-in logs match your criteria for today.
                  </td>
                </tr>
              ) : (
                filteredTodayRecords.map((rec, idx) => {
                  const isCheckedOut = Boolean(rec.checkout_time);
                  const isAdminEdited = rec.is_admin_modified || Boolean(rec.notes?.toLowerCase().includes("admin"));
                  const emp = employees.find((e) => e.emp_code === rec.emp_code);
                  const empName = rec.employee_name || emp?.full_name || rec.emp_code;
                  const empDept = rec.department || emp?.department || "General";

                  return (
                    <tr key={rec.id || `${rec.emp_code}_${rec.checkin_time}_${idx}`} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-[#276F27] flex items-center justify-center font-bold text-xs text-white shadow-xs">
                            {rec.emp_code.slice(-3)}
                          </div>
                          <div>
                            <div className="font-bold text-black">{empName}</div>
                            <div className="text-[10px] text-gray-500 font-mono font-medium">{rec.emp_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-semibold">
                        {empDept}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-black">
                        {rec.checkin_time}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600 font-medium">
                        {rec.checkout_time || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border w-fit ${
                              isCheckedOut
                                ? "bg-gray-100 text-gray-600 border-gray-300"
                                : "bg-[#8ECA3C]/20 text-[#276F27] border-[#8ECA3C] shadow-xs"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isCheckedOut ? "bg-gray-400" : "bg-[#276F27] animate-ping"}`} />
                            <span>{isCheckedOut ? "Shift Closed" : "Active Present"}</span>
                          </span>

                          {isAdminEdited && (
                            <span 
                              className="inline-flex items-center space-x-1 text-[9px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 w-fit"
                              title={rec.notes || "Adjusted by Admin"}
                            >
                              <Edit3 className="w-2.5 h-2.5 text-amber-700" />
                              <span>Admin Adjusted</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-2">
                          {!isCheckedOut ? (
                            <button
                              onClick={() => onMarkCheckOut(rec.emp_code)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#276F27] hover:bg-[#1e571e] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                              title="Mark shift check-out"
                              suppressHydrationWarning
                            >
                              <LogOut className="w-3 h-3" />
                              <span>Check Out</span>
                            </button>
                          ) : (
                            onRemoveCheckout && (
                              <button
                                onClick={() => {
                                  if (confirm(`Remove false check-out for ${rec.employee_name || rec.emp_code}? This will restore them to active shift.`)) {
                                    onRemoveCheckout(rec.emp_code, rec.checkin_date, rec.id);
                                  }
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white hover:bg-red-50 text-red-700 hover:text-red-800 border border-red-300 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                                title="Remove false check-out and restore to active on-premises shift"
                                suppressHydrationWarning
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Remove False Out</span>
                              </button>
                            )
                          )}
                          <button
                            onClick={() => openEditModal(rec)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            title="Edit time"
                            suppressHydrationWarning
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Time</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit / Adjust Attendance Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#276F27] text-white">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-black">Adjust Staff Attendance Time</h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {editingRecord.emp_code} • {editingRecord.employee_name || editingRecord.emp_code} ({editingRecord.checkin_date})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Notice */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-800 space-y-1">
              <div className="font-bold text-[#276F27] flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Admin Audit Trail Notice</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                This modification will be logged and flagged with an <strong className="text-black">Admin Adjusted</strong> badge for transparency.
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-black uppercase tracking-wider">
                    Check-In Time <span className="text-[#276F27]">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    step="1"
                    value={editCheckin}
                    onChange={(e) => setEditCheckin(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono font-bold text-black focus:border-[#276F27] focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-black uppercase tracking-wider">
                      Check-Out Time (Optional)
                    </label>
                    {editCheckout && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditCheckout("");
                          setEditNotes((prev) => (prev ? prev + " • " : "") + "Admin removed false check-out");
                        }}
                        className="text-[10px] font-bold text-[#276F27] hover:underline flex items-center space-x-1 cursor-pointer"
                        title="Clear check-out and re-open shift"
                        suppressHydrationWarning
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Clear (Re-open Shift)</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    step="1"
                    value={editCheckout}
                    onChange={(e) => setEditCheckout(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono font-bold text-black focus:border-[#276F27] focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider">
                  Admin Audit Reason / Note <span className="text-[#276F27]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Employee forgot to punch in; time confirmed with supervisor."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:border-[#276F27] focus:outline-none"
                  suppressHydrationWarning
                />
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#276F27] hover:bg-[#1e571e] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Save & Update Audit Log
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs border border-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
