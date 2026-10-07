"use client";

import React, { useState } from "react";
import { 
  BarChart3, 
  Download, 
  Printer 
} from "lucide-react";
import { Employee, AttendanceRecord } from "../lib/types";

interface ReportsTabProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  employees,
  attendance,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedDept, setSelectedDept] = useState("all");

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  // Filter attendance by selected month
  const monthlyAttendance = attendance.filter((r) => {
    const matchesMonth = r.checkin_date.startsWith(selectedMonth);
    const matchesDept = selectedDept === "all" || r.department === selectedDept;
    return matchesMonth && matchesDept;
  });

  // Calculate Employee-level monthly attendance summary
  const employeeSummaries = employees
    .filter((emp) => selectedDept === "all" || emp.department === selectedDept)
    .map((emp) => {
      const records = monthlyAttendance.filter((r) => r.emp_code === emp.emp_code);
      const daysPresent = records.length;
      const completedShifts = records.filter((r) => Boolean(r.checkout_time)).length;
      
      // Calculate total work hours
      let totalMinutes = 0;
      records.forEach((r) => {
        if (r.checkin_time && r.checkout_time) {
          const [h1, m1] = r.checkin_time.split(":").map(Number);
          const [h2, m2] = r.checkout_time.split(":").map(Number);
          const diff = h2 * 60 + m2 - (h1 * 60 + m1);
          if (diff > 0) totalMinutes += diff;
        }
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMins = totalMinutes % 60;

      return {
        emp_code: emp.emp_code,
        name: emp.full_name,
        department: emp.department,
        daysPresent,
        completedShifts,
        totalHoursStr: `${totalHours}h ${remainingMins}m`,
        totalMinutes,
      };
    });

  // Export Report CSV
  const handleExportReportCSV = () => {
    const headers = ["Employee Code,Name,Department,Days Present,Completed Shifts,Total Work Hours"];
    const rows = employeeSummaries.map((s) =>
      `"${s.emp_code}","${s.name}","${s.department}",${s.daysPresent},${s.completedShifts},"${s.totalHoursStr}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monthly_attendance_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black flex items-center space-x-3">
            <BarChart3 className="w-7 h-7 text-[#276F27]" />
            <span>Monthly HR & Attendance Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Aggregated monthly staff attendance, work duration totals, and exportable muster rolls.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-900 font-bold text-xs border border-gray-200 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#276F27]" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportReportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#276F27] hover:bg-[#1e581e] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Month Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Select Billing Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-bold focus:outline-none focus:border-[#276F27]"
            suppressHydrationWarning
          />
        </div>

        {/* Department Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Filter Department
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-bold focus:outline-none focus:border-[#276F27]"
            suppressHydrationWarning
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Summary Table */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-black">
            Staff Muster Roll for {selectedMonth}
          </h2>
          <span className="text-xs text-gray-500 font-semibold">
            {employeeSummaries.length} Staff Members Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-4 px-6">Emp Code</th>
                <th className="py-4 px-6">Employee Name</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Days Present</th>
                <th className="py-4 px-6">Completed Shifts</th>
                <th className="py-4 px-6 text-right">Total Hours Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-900">
              {employeeSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-medium">
                    No records found for the selected month.
                  </td>
                </tr>
              ) : (
                employeeSummaries.map((s) => (
                  <tr key={s.emp_code} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-[#276F27]">{s.emp_code}</td>
                    <td className="py-3.5 px-6 font-bold text-black">{s.name}</td>
                    <td className="py-3.5 px-6 text-gray-600 font-semibold">{s.department}</td>
                    <td className="py-3.5 px-6 font-bold text-black">{s.daysPresent} days</td>
                    <td className="py-3.5 px-6 text-gray-600 font-medium">{s.completedShifts} shifts</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-[#276F27] text-right">
                      {s.totalHoursStr}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
