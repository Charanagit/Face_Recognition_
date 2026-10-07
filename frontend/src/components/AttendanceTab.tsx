"use client";

import React, { useState } from "react";
import { 
  CalendarCheck, 
  Search, 
  Download, 
  Plus, 
  X, 
  CheckCircle2,
  Calendar,
  Building,
  Clock,
  Edit3,
  AlertCircle,
  FileEdit,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { Employee, AttendanceRecord } from "../lib/types";

interface AttendanceTabProps {
  attendance: AttendanceRecord[];
  employees: Employee[];
  onAddManualRecord: (record: AttendanceRecord) => void;
  onUpdateAttendanceRecord?: (record: AttendanceRecord) => void;
  onRemoveCheckout?: (empCode: string, checkinDate: string, recordId?: number | string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  attendance,
  employees,
  onAddManualRecord,
  onUpdateAttendanceRecord,
  onRemoveCheckout,
}) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedEmp, setSelectedEmp] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Manual Punch Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualCode, setManualCode] = useState(employees[0]?.emp_code || "");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualCheckin, setManualCheckin] = useState("08:30");
  const [manualCheckout, setManualCheckout] = useState("");
  const [manualNotes, setManualNotes] = useState("Admin Manual Punch (Staff forgot check-in)");

  // Edit / Adjust Attendance Modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editCheckin, setEditCheckin] = useState("");
  const [editCheckout, setEditCheckout] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const filteredAttendance = attendance.filter((rec) => {
    const matchesDate = !selectedDate || rec.checkin_date === selectedDate;
    const matchesDept = selectedDept === "all" || rec.department === selectedDept;
    const matchesEmp = selectedEmp === "all" || rec.emp_code === selectedEmp;
    const matchesSearch =
      rec.emp_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.employee_name && rec.employee_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesDate && matchesDept && matchesEmp && matchesSearch;
  });

  // Calculate work duration string
  const calculateDuration = (inTime: string, outTime: string | null) => {
    if (!outTime) return "In Progress";
    try {
      const [h1, m1] = inTime.split(":").map(Number);
      const [h2, m2] = outTime.split(":").map(Number);
      const totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);
      if (totalMinutes <= 0) return "—";
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return `${hrs}h ${mins}m`;
    } catch {
      return "—";
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Date,Emp Code,Employee Name,Department,Check-In Time,Check-Out Time,Duration,Status,Admin Modified,Notes"];
    const rows = filteredAttendance.map((r) =>
      `"${r.checkin_date}","${r.emp_code}","${r.employee_name || ""}","${r.department || ""}","${r.checkin_time}","${r.checkout_time || "-"}","${calculateDuration(r.checkin_time, r.checkout_time)}","${r.checkout_time ? "Checked Out" : "Present"}","${r.is_admin_modified ? "Yes" : "No"}","${(r.notes || "").replace(/"/g, '""')}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_logs_${selectedDate || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.emp_code === manualCode);
    const inTimeFormatted = manualCheckin.length === 5 ? `${manualCheckin}:00` : manualCheckin;
    const outTimeFormatted = manualCheckout ? (manualCheckout.length === 5 ? `${manualCheckout}:00` : manualCheckout) : null;

    const newRecord: AttendanceRecord = {
      id: Date.now(),
      emp_code: manualCode,
      employee_name: emp?.full_name || manualCode,
      department: emp?.department || "General",
      checkin_date: manualDate,
      checkin_time: inTimeFormatted,
      checkout_time: outTimeFormatted,
      status: outTimeFormatted ? "Checked Out" : "Present",
      confidence_score: 100,
      is_admin_modified: true,
      modified_by: "Admin",
      modified_at: new Date().toISOString(),
      notes: manualNotes || "Admin Manual Punch",
    };
    onAddManualRecord(newRecord);
    setIsManualModalOpen(false);
  };

  // Open Edit Modal
  const openEditModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    // Format check-in time for input (HH:mm)
    const inParts = rec.checkin_time.split(":");
    setEditCheckin(inParts.length >= 2 ? `${inParts[0].padStart(2, '0')}:${inParts[1].padStart(2, '0')}` : rec.checkin_time);
    
    if (rec.checkout_time) {
      const outParts = rec.checkout_time.split(":");
      setEditCheckout(outParts.length >= 2 ? `${outParts[0].padStart(2, '0')}:${outParts[1].padStart(2, '0')}` : rec.checkout_time);
    } else {
      setEditCheckout("");
    }

    setEditNotes(rec.notes || "Admin time adjustment (e.g. Employee missed scanner)");
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
      
      {/* Header Bar */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black flex items-center space-x-3">
            <CalendarCheck className="w-7 h-7 text-[#276F27]" />
            <span>Attendance Logs & Audit Trail</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Historical attendance timestamps, duration calculations, and administrative time adjustments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#276F27] hover:bg-[#1e571e] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            suppressHydrationWarning
          >
            <Plus className="w-4 h-4" />
            <span>Manual Admin Punch</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs border border-gray-200 transition-all shadow-2xs cursor-pointer"
            suppressHydrationWarning
          >
            <Download className="w-4 h-4 text-[#276F27]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27] font-medium"
            suppressHydrationWarning
          />
        </div>

        {/* Date Filter */}
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-semibold focus:outline-none focus:border-[#276F27]"
            suppressHydrationWarning
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-medium focus:outline-none focus:border-[#276F27]"
            suppressHydrationWarning
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Employee Filter */}
        <div>
          <select
            value={selectedEmp}
            onChange={(e) => setSelectedEmp(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-medium focus:outline-none focus:border-[#276F27]"
            suppressHydrationWarning
          >
            <option value="all">All Staff Members</option>
            {employees.map((emp) => (
              <option key={emp.emp_code} value={emp.emp_code}>
                {emp.emp_code} - {emp.full_name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Attendance Records Table */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-800 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Staff Member</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Check-In</th>
                <th className="py-4 px-6">Check-Out</th>
                <th className="py-4 px-6">Duration</th>
                <th className="py-4 px-6">Status / Audit</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-900">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 font-medium">
                    No attendance logs found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((rec, idx) => {
                  const isCheckedOut = Boolean(rec.checkout_time);
                  const duration = calculateDuration(rec.checkin_time, rec.checkout_time);
                  const isAdminEdited = rec.is_admin_modified || Boolean(rec.notes?.toLowerCase().includes("admin"));

                  return (
                    <tr key={`${rec.emp_code}_${rec.checkin_date}_${idx}`} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-semibold text-gray-500">
                        {rec.checkin_date}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-black">{rec.employee_name || rec.emp_code}</div>
                        <div className="text-[10px] text-gray-500 font-mono font-medium">{rec.emp_code}</div>
                      </td>
                      <td className="py-3.5 px-6 text-gray-600 font-semibold">
                        {rec.department || "General"}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-bold text-black">
                        {rec.checkin_time}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-gray-600 font-medium">
                        {rec.checkout_time || "—"}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-black">
                        {duration}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col space-y-1">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border w-fit ${
                              isCheckedOut
                                ? "bg-gray-100 text-gray-600 border-gray-300"
                                : "bg-[#8ECA3C]/20 text-[#276F27] border-[#8ECA3C]"
                            }`}
                          >
                            <span>{isCheckedOut ? "Checked Out" : "Active Present"}</span>
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
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex items-center space-x-2">
                          {isCheckedOut && onRemoveCheckout && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove false check-out for ${rec.employee_name || rec.emp_code} on ${rec.checkin_date}? This will restore them to active shift.`)) {
                                  onRemoveCheckout(rec.emp_code, rec.checkin_date, rec.id);
                                }
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-700 hover:text-red-800 border border-red-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                              title="Remove false check-out and restore to active shift"
                              suppressHydrationWarning
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Remove False Out</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(rec)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Edit check-in or check-out time"
                            suppressHydrationWarning
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-black">Manual Attendance Punch</h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-black">Select Staff Member</label>
                <select
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black font-semibold focus:border-[#276F27]"
                  suppressHydrationWarning
                >
                  {employees.map((emp) => (
                    <option key={emp.emp_code} value={emp.emp_code}>
                      {emp.emp_code} - {emp.full_name} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-black">Date</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black font-semibold focus:border-[#276F27]"
                  suppressHydrationWarning
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-black">Check-In Time</label>
                  <input
                    type="time"
                    required
                    value={manualCheckin}
                    onChange={(e) => setManualCheckin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black font-mono focus:border-[#276F27]"
                    suppressHydrationWarning
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-black">Check-Out Time</label>
                  <input
                    type="time"
                    value={manualCheckout}
                    onChange={(e) => setManualCheckout(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black font-mono focus:border-[#276F27]"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-black">Audit Note / Remarks</label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Reason for manual punch..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black focus:border-[#276F27]"
                  suppressHydrationWarning
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#276F27] hover:bg-[#1e571e] text-white font-bold shadow-md transition-all cursor-pointer"
                >
                  Save Record
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-gray-100 text-black font-bold border border-gray-200 cursor-pointer"
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
