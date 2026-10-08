"use client";

import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  Phone, 
  Briefcase, 
  Building, 
  LayoutGrid,
  Table as TableIcon,
  X,
  ScanFace,
  Plus
} from "lucide-react";
import { Employee } from "../lib/types";

interface EmployeesTabProps {
  employees: Employee[];
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (empCode: string) => void;
  onReEnroll: (empCode: string) => void;
  onUploadEmbedding?: (empCode: string, embeddingBase64: string) => Promise<{ success: boolean; message: string }>;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  onUpdateEmployee,
  onDeleteEmployee,
  onUploadEmbedding,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [embeddingFilter, setEmbeddingFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Edit Modal State
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Photo Upload Modal State
  const [photoModalEmp, setPhotoModalEmp] = useState<Employee | null>(null);
  const [modalPhotos, setModalPhotos] = useState<string[]>([]);
  const [isProcessingModal, setIsProcessingModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalLogs, setModalLogs] = useState<string[]>([]);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.emp_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    const matchesEmb =
      embeddingFilter === "all" ||
      (embeddingFilter === "active" && emp.has_embedding) ||
      (embeddingFilter === "missing" && !emp.has_embedding);

    return matchesSearch && matchesDept && matchesEmb;
  });

  // Export CSV
  const exportCSV = () => {
    const headers = ["Employee Code,Full Name,Department,Designation,Mobile,Embedding Active,Registration Date,Notes"];
    const rows = filteredEmployees.map((e) =>
      `"${e.emp_code}","${e.full_name}","${e.department}","${e.designation}","${e.mobile}","${e.has_embedding ? "Yes" : "No"}","${e.registered_date || ""}","${e.notes.replace(/"/g, '""')}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `facerec_staff_directory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    onUpdateEmployee(editingEmp);
    setEditingEmp(null);
  };

  // Handle Photo Upload inside Modal
  const handleModalPhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - modalPhotos.length;
    const filesToRead = Array.from(files).slice(0, remainingSlots);

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setModalPhotos((prev) => {
            if (prev.length >= 3) return prev;
            return [...prev, event.target!.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveFaceVector = async () => {
    if (!photoModalEmp || modalPhotos.length === 0) return;
    setIsProcessingModal(true);
    setModalLogs([`Sending ${modalPhotos.length} face image(s) to InsightFace ArcFace Engine for ${photoModalEmp.emp_code}...`]);

    try {
      const resp = await fetch("/api/generate-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_code: photoModalEmp.emp_code,
          photos: modalPhotos,
        }),
      });

      const data = await resp.json();

      if (data.logs && Array.isArray(data.logs)) {
        setModalLogs((prev) => [...prev, ...data.logs]);
      }

      if (data.success && data.embedding_base64) {
        if (onUploadEmbedding) {
          await onUploadEmbedding(photoModalEmp.emp_code, data.embedding_base64);
        }
        setModalMessage({
          type: "success",
          text: `InsightFace 512-d biometric vector generated and saved for ${photoModalEmp.emp_code}!`,
        });
        setModalLogs((prev) => [...prev, "Sync completed! Desktop kiosk will match instantly."]);
      } else {
        setModalMessage({ type: "error", text: data.error || "Failed to extract face vector." });
      }
    } catch (err: any) {
      setModalMessage({ type: "error", text: err.message || "Failed to extract face vector." });
    } finally {
      setIsProcessingModal(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black flex items-center space-x-3">
            <Users className="w-7 h-7 text-[#276F27]" />
            <span>Staff Directory & Profiles</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Total {employees.length} employees enrolled across {departments.length} departments.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="bg-gray-100 p-1 rounded-2xl border border-gray-200 flex items-center">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-xl transition-all ${
                viewMode === "grid" ? "bg-[#276F27] text-white shadow-xs" : "text-gray-500 hover:text-black"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-xl transition-all ${
                viewMode === "table" ? "bg-[#276F27] text-white shadow-xs" : "text-gray-500 hover:text-black"
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-900 font-bold text-xs border border-gray-200 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#276F27]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Search */}
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code, name, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27] font-medium"
            suppressHydrationWarning
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-medium focus:outline-none focus:border-[#276F27]"
            suppressHydrationWarning
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Embedding Filter */}
        <div>
          <select
            value={embeddingFilter}
            onChange={(e) => setEmbeddingFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black font-medium focus:outline-none focus:border-[#276F27]"
            suppressHydrationWarning
          >
            <option value="all">All Biometric Statuses</option>
            <option value="active">Active Biometric Vector</option>
            <option value="missing">Pending Face Vector</option>
          </select>
        </div>

      </div>

      {/* Content View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-500 bg-white border border-gray-200 rounded-3xl font-medium">
              No staff members found matching your search.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp.emp_code}
                className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4 hover:border-[#276F27] transition-all group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#276F27] flex items-center justify-center font-black text-sm text-white shadow-xs">
                        {emp.emp_code.slice(-3)}
                      </div>
                      <div>
                        <h3 className="font-black text-base text-black">
                          {emp.full_name}
                        </h3>
                        <div className="text-xs text-gray-500 font-mono font-semibold">{emp.emp_code}</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        emp.has_embedding
                          ? "bg-[#8ECA3C]/20 text-[#276F27] border-[#8ECA3C]/50"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      <ScanFace className="w-3 h-3" />
                      <span>{emp.has_embedding ? "Vector Active" : "No Face Vector"}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <Building className="w-3.5 h-3.5 text-[#276F27]" />
                      <span className="text-black font-semibold">{emp.department}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700">{emp.designation}</span>
                    </div>
                    {emp.mobile && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-700 font-mono">{emp.mobile}</span>
                      </div>
                    )}
                  </div>

                  {emp.notes && (
                    <p className="text-[11px] text-gray-600 line-clamp-2 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100 font-medium">
                      "{emp.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                  <button
                    onClick={() => {
                      setPhotoModalEmp(emp);
                      setModalPhotos([]);
                      setModalMessage(null);
                      setModalLogs([]);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      emp.has_embedding
                        ? "bg-white hover:bg-gray-50 text-gray-900 border border-gray-200"
                        : "bg-[#276F27] hover:bg-[#1e581e] text-white shadow-xs"
                    }`}
                  >
                    <ScanFace className="w-3.5 h-3.5" />
                    <span>{emp.has_embedding ? "Update Photos" : "⚡ Add Face Photos"}</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setEditingEmp(emp)}
                      className="p-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all cursor-pointer"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(emp.emp_code)}
                      className="p-1.5 rounded-xl bg-white hover:bg-red-600 hover:text-white text-red-600 border border-gray-200 transition-all cursor-pointer"
                      title="Delete Employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-900 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-4 px-6">Code</th>
                <th className="py-4 px-6">Full Name</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Designation</th>
                <th className="py-4 px-6">Mobile</th>
                <th className="py-4 px-6">Kiosk Vector</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-900">
              {filteredEmployees.map((emp) => (
                <tr key={emp.emp_code} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-bold text-[#276F27]">{emp.emp_code}</td>
                  <td className="py-3.5 px-6 font-bold text-black">{emp.full_name}</td>
                  <td className="py-3.5 px-6 text-gray-600 font-semibold">{emp.department}</td>
                  <td className="py-3.5 px-6 text-gray-800">{emp.designation}</td>
                  <td className="py-3.5 px-6 font-mono text-gray-500">{emp.mobile || "—"}</td>
                  <td className="py-3.5 px-6">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        emp.has_embedding
                          ? "bg-[#8ECA3C]/20 text-[#276F27] border-[#8ECA3C]/50"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      <span>{emp.has_embedding ? "Active Vector" : "Pending"}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setPhotoModalEmp(emp);
                          setModalPhotos([]);
                          setModalMessage(null);
                          setModalLogs([]);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#276F27] hover:text-white text-gray-900 border border-gray-200 font-bold transition-all flex items-center space-x-1 cursor-pointer"
                        title="Upload Face Photos"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span>Photos</span>
                      </button>
                      <button
                        onClick={() => setEditingEmp(emp)}
                        className="p-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 cursor-pointer"
                        title="Edit Profile"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEmployee(emp.emp_code)}
                        className="p-1.5 rounded-xl bg-white hover:bg-red-600 hover:text-white text-red-600 border border-gray-200 cursor-pointer"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Direct Face Photo Upload Modal */}
      {photoModalEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-gray-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#276F27] flex items-center justify-center text-white">
                  <ScanFace className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-black">
                    Upload Photos for {photoModalEmp.full_name}
                  </h3>
                  <div className="text-xs text-gray-500 font-mono font-semibold">
                    Code: {photoModalEmp.emp_code} • {photoModalEmp.department}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPhotoModalEmp(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Callout */}
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
              photoModalEmp.has_embedding
                ? "bg-[#8ECA3C]/15 text-[#276F27] border-[#8ECA3C]/40"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}>
              <span>
                {photoModalEmp.has_embedding 
                  ? "✓ Active Biometric Vector present in Cloud. Uploading new photos will replace/update the vector." 
                  : "⚠️ No Face Vector registered yet. Add 1 to 3 clear photos to activate recognition."}
              </span>
            </div>

            {/* Photo Upload Area */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-black uppercase tracking-wider">
                  Select Face Photos ({modalPhotos.length}/3)
                </label>
                {modalPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setModalPhotos([])}
                    className="text-[11px] text-[#276F27] font-bold hover:underline cursor-pointer"
                  >
                    Clear all photos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {modalPhotos.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-[#276F27] bg-gray-50 group">
                    <img src={src} alt="Face sample" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setModalPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-[#276F27] text-white opacity-90 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1.5 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                      #{idx + 1}
                    </div>
                  </div>
                ))}

                {modalPhotos.length < 3 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#276F27] bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-all p-2 text-center">
                    <Plus className="w-6 h-6 text-[#276F27] mb-1" />
                    <span className="text-[10px] font-bold text-black">Add Photo</span>
                    <span className="text-[9px] text-gray-500">JPG/PNG max 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleModalPhotoAdd}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Status Message / Notification */}
              {modalMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  modalMessage.type === "success" 
                    ? "bg-[#8ECA3C]/20 text-[#276F27] border border-[#8ECA3C]/50" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {modalMessage.text}
                </div>
              )}

              {/* Live Processing Logs */}
              {modalLogs.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-3 text-[11px] font-mono text-gray-100 space-y-1 max-h-28 overflow-y-auto border border-gray-800">
                  {modalLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  disabled={modalPhotos.length === 0 || isProcessingModal}
                  onClick={handleSaveFaceVector}
                  className="flex-1 py-3 rounded-2xl bg-[#276F27] hover:bg-[#1e581e] disabled:opacity-50 text-white font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ScanFace className="w-4 h-4" />
                  <span>{isProcessingModal ? "Processing Face Vectors..." : "Save Face Vector to Cloud"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoModalEmp(null)}
                  className="px-5 py-3 rounded-2xl bg-white text-gray-700 font-bold border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Metadata Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-gray-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-black">Edit Staff Profile ({editingEmp.emp_code})</h3>
              <button
                onClick={() => setEditingEmp(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-black">Full Name</label>
                <input
                  type="text"
                  value={editingEmp.full_name}
                  onChange={(e) => setEditingEmp({ ...editingEmp, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black font-semibold focus:border-[#276F27]"
                  suppressHydrationWarning
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-black">Department</label>
                  <input
                    type="text"
                    value={editingEmp.department}
                    onChange={(e) => setEditingEmp({ ...editingEmp, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black focus:border-[#276F27]"
                    suppressHydrationWarning
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-black">Designation</label>
                  <input
                    type="text"
                    value={editingEmp.designation}
                    onChange={(e) => setEditingEmp({ ...editingEmp, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black focus:border-[#276F27]"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-black">Mobile Number</label>
                <input
                  type="text"
                  value={editingEmp.mobile}
                  onChange={(e) => setEditingEmp({ ...editingEmp, mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black focus:border-[#276F27]"
                  suppressHydrationWarning
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-black">Notes</label>
                <textarea
                  rows={2}
                  value={editingEmp.notes}
                  onChange={(e) => setEditingEmp({ ...editingEmp, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-black focus:border-[#276F27]"
                  suppressHydrationWarning
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-[#276F27] hover:bg-[#1e581e] text-white font-bold shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-5 py-3 rounded-2xl bg-white text-gray-700 font-bold border border-gray-200 hover:bg-gray-50 cursor-pointer"
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
