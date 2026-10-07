"use client";

import React, { useState } from "react";
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  Save, 
  User, 
  ScanFace, 
  Image as ImageIcon, 
  Info, 
  UserCheck, 
  UserPlus, 
  RefreshCw 
} from "lucide-react";
import { Employee } from "../lib/types";

interface RegisterTabProps {
  onSaveEmployee: (
    employee: Employee,
    embeddingBase64: string | null,
    photoDataUrls: string[]
  ) => Promise<{ success: boolean; message: string }>;
  existingEmployees: Employee[];
  initialEmpCode?: string | null;
  onClearInitialEmpCode?: () => void;
}

export const RegisterTab: React.FC<RegisterTabProps> = ({
  onSaveEmployee,
  existingEmployees,
  initialEmpCode,
  onClearInitialEmpCode,
}) => {
  // Mode: "new" or "existing"
  const [enrollMode, setEnrollMode] = useState<"new" | "existing">("new");
  const [selectedExistingCode, setSelectedExistingCode] = useState<string>("");

  // Form state
  const [empCode, setEmpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");

  // Photo state
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Watch for initialEmpCode passed from other tabs (e.g. from EmployeesTab)
  React.useEffect(() => {
    if (initialEmpCode) {
      const match = existingEmployees.find((e) => e.emp_code === initialEmpCode);
      if (match) {
        setEnrollMode("existing");
        setSelectedExistingCode(match.emp_code);
        setEmpCode(match.emp_code);
        setFullName(match.full_name);
        setDepartment(match.department);
        setDesignation(match.designation);
        setMobile(match.mobile);
        setNotes(match.notes);
        setStatusMessage({
          type: "info",
          text: `Selected existing employee ${match.emp_code} (${match.full_name}). Upload 1 to 3 face photos below to generate and link biometric embeddings.`,
        });
      }
    }
  }, [initialEmpCode, existingEmployees]);

  // Handle existing employee selection change
  const handleSelectExisting = (code: string) => {
    setSelectedExistingCode(code);
    if (!code) {
      clearForm();
      return;
    }
    const match = existingEmployees.find((e) => e.emp_code === code);
    if (match) {
      setEmpCode(match.emp_code);
      setFullName(match.full_name);
      setDepartment(match.department);
      setDesignation(match.designation);
      setMobile(match.mobile);
      setNotes(match.notes);
      setUploadedPhotos([]);
      setStatusMessage({
        type: "info",
        text: `Loaded ${match.emp_code} (${match.full_name}) • Status: ${match.has_embedding ? "Vector Active (will be updated)" : "No Face Vector (Upload photos to activate)"}.`,
      });
    }
  };

  // Switch mode
  const handleModeChange = (mode: "new" | "existing") => {
    setEnrollMode(mode);
    clearForm();
    if (onClearInitialEmpCode) onClearInitialEmpCode();
  };

  // Handle Photo Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - uploadedPhotos.length;
    const filesToRead = Array.from(files).slice(0, remainingSlots);

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedPhotos((prev) => {
            if (prev.length >= 3) return prev;
            return [...prev, event.target!.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setEmpCode("");
    setFullName("");
    setDepartment("");
    setDesignation("");
    setMobile("");
    setNotes("");
    setUploadedPhotos([]);
    setStatusMessage(null);
    setLogs([]);
    setSelectedExistingCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = empCode.trim().toUpperCase();

    if (!cleanCode) {
      setStatusMessage({ type: "error", text: "Employee Code is mandatory." });
      return;
    }

    setIsProcessing(true);
    setLogs([`Validating employee code: ${cleanCode}...`]);

    try {
      let embeddingBase64: string | null = null;

      if (uploadedPhotos.length > 0) {
        setLogs((prev) => [...prev, `Sending ${uploadedPhotos.length} photo(s) to InsightFace ArcFace Engine...`]);
        
        const resp = await fetch("/api/generate-embedding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emp_code: cleanCode,
            photos: uploadedPhotos,
          }),
        });

        const data = await resp.json();

        if (data.logs && Array.isArray(data.logs)) {
          setLogs((prev) => [...prev, ...data.logs]);
        }

        if (data.success && data.embedding_base64) {
          embeddingBase64 = data.embedding_base64;
          setLogs((prev) => [...prev, `InsightFace 512-d ArcFace vector verified ✓`]);
        } else {
          throw new Error(data.error || "InsightFace face feature extraction failed.");
        }
      } else {
        setLogs((prev) => [...prev, "Notice: Saving staff metadata without face vector."]);
      }

      setLogs((prev) => [...prev, "Syncing metadata to Supabase 'employees' & 'face_embeddings' tables..."]);

      // Check if existing registration date exists
      const existingMatch = existingEmployees.find((e) => e.emp_code === cleanCode);

      const newEmp: Employee = {
        emp_code: cleanCode,
        full_name: fullName.trim() || cleanCode,
        department: department.trim() || "General",
        designation: designation.trim() || "Staff",
        mobile: mobile.trim() || "",
        notes: notes.trim() || "",
        registered_date: existingMatch?.registered_date || new Date().toISOString().split("T")[0],
        has_embedding: Boolean(embeddingBase64) || Boolean(existingMatch?.has_embedding),
      };

      const result = await onSaveEmployee(newEmp, embeddingBase64, uploadedPhotos);

      if (result.success) {
        setStatusMessage({ 
          type: "success", 
          text: embeddingBase64 
            ? `Successfully generated & synced 512-d biometric face vector for ${newEmp.emp_code} (${newEmp.full_name})!` 
            : result.message 
        });
        setLogs((prev) => [...prev, "Enrollment completed! Biometric vector is active for desktop kiosk recognition."]);
      } else {
        setStatusMessage({ type: "error", text: result.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to process employee data." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#276F27] flex items-center justify-center shadow-xs text-white">
              <ScanFace className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black">Employee Enrollment & Photo Management</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Register new staff or attach face photos to existing employees to generate biometric recognition vectors.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => handleModeChange("new")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              enrollMode === "new"
                ? "bg-[#276F27] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200/60"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Staff</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("existing")}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              enrollMode === "existing"
                ? "bg-[#276F27] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200/60"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Attach Photos / Update Existing Staff ({existingEmployees.length})</span>
          </button>
        </div>
      </div>

      {/* When in 'existing' mode: Employee Selection Card */}
      {enrollMode === "existing" && (
        <div className="bg-[#8ECA3C]/10 border-2 border-[#276F27]/30 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-[#276F27]">
            <UserCheck className="w-5 h-5 font-bold" />
            <h2 className="text-sm font-black uppercase tracking-wider">Select Existing Staff Member to Attach Photos</h2>
          </div>
          <p className="text-xs text-gray-600">
            Choose any registered employee from the directory below. You can update their details and upload 1 to 3 reference face photos to create their biometric recognition vector.
          </p>
          <div className="pt-2">
            <select
              value={selectedExistingCode}
              onChange={(e) => handleSelectExisting(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-gray-200 text-black text-sm font-bold focus:border-[#276F27] focus:outline-none"
              suppressHydrationWarning
            >
              <option value="">-- Choose an employee from list ({existingEmployees.length} total) --</option>
              {existingEmployees.map((emp) => (
                <option key={emp.emp_code} value={emp.emp_code}>
                  {emp.emp_code} • {emp.full_name} ({emp.department}) — {emp.has_embedding ? "✓ Active Vector" : "⚠️ NO FACE VECTOR"}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Grid: Form Left, Photo Upload Right */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Metadata Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-black text-black flex items-center space-x-2 border-b border-gray-100 pb-3">
            <User className="w-5 h-5 text-[#276F27]" />
            <span>{enrollMode === "existing" ? "Staff Details (Editing)" : "Staff Profile Information"}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Employee Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider flex items-center justify-between">
                <span>Employee Code <span className="text-[#276F27]">*</span></span>
                {enrollMode === "existing" && (
                  <span className="text-[10px] text-gray-500 font-mono">(Locked for existing)</span>
                )}
              </label>
              <input
                type="text"
                required
                disabled={enrollMode === "existing" && Boolean(selectedExistingCode)}
                placeholder="e.g. EMP-104"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27] font-mono uppercase font-bold disabled:opacity-60"
                suppressHydrationWarning
              />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">
                Full Name <span className="text-[#276F27]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Johnathan Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27] font-semibold"
                suppressHydrationWarning
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">
                Department / Team
              </label>
              <input
                type="text"
                placeholder="e.g. AI & Computer Vision"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27]"
                suppressHydrationWarning
              />
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">
                Designation / Role
              </label>
              <input
                type="text"
                placeholder="e.g. Lead Researcher"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27]"
                suppressHydrationWarning
              />
            </div>

            {/* Mobile */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">
                Mobile / Contact Number
              </label>
              <input
                type="text"
                placeholder="e.g. +94 77 123 4567"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27]"
                suppressHydrationWarning
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider">
                Notes & Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Additional notes or remarks for employee..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-black placeholder-gray-400 focus:outline-none focus:border-[#276F27]"
                suppressHydrationWarning
              />
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl bg-[#276F27] hover:bg-[#1e581e] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {isProcessing 
                  ? "Processing Biometrics..." 
                  : enrollMode === "existing" 
                    ? "Update Profile & Generate Face Vector" 
                    : "Save & Synchronize Employee"}
              </span>
            </button>
            <button
              type="button"
              onClick={clearForm}
              className="px-5 py-3.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold border border-gray-200 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border flex items-center space-x-3 text-xs ${
                statusMessage.type === "success"
                  ? "bg-[#8ECA3C]/15 border-[#8ECA3C]/50 text-gray-900"
                  : statusMessage.type === "info"
                    ? "bg-blue-50 border-blue-200 text-blue-900"
                    : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-[#276F27] shrink-0" />
              ) : statusMessage.type === "info" ? (
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="font-bold">{statusMessage.text}</span>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 space-y-1 font-mono text-[11px] text-gray-100">
              <div className="font-bold text-[#8ECA3C] mb-1">Process Pipeline:</div>
              {logs.map((log, idx) => (
                <div key={idx} className="text-gray-300">{log}</div>
              ))}
            </div>
          )}

        </div>

        {/* Right Column: Reference Face Photos for Desktop Kiosk (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-black flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-[#276F27]" />
              <span>Face Photos for Kiosk</span>
            </h2>
            <span className="text-xs font-mono text-white px-2.5 py-0.5 rounded-full bg-[#276F27] font-bold">
              {uploadedPhotos.length}/3 Uploaded
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-[#276F27] shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
              Upload 1 to 3 clear front-facing photos. These photos are automatically processed into 512-d embeddings and synced to the desktop recognition kiosk for live check-ins.
            </p>
          </div>

          {/* Upload Drop Area */}
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center aspect-video rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#276F27] bg-gray-50 cursor-pointer transition-all p-4 text-center">
              <Upload className="w-8 h-8 text-[#276F27] mb-2" />
              <span className="text-xs font-bold text-black">Select or Drag Face Photos</span>
              <span className="text-[10px] text-gray-500 mt-1 font-medium">
                JPG or PNG format (Max 5MB each)
              </span>
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileUpload}
                disabled={uploadedPhotos.length >= 3}
                className="hidden"
              />
            </label>
          </div>

          {/* Uploaded Photos Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Reference Photos
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((idx) => {
                const photo = uploadedPhotos[idx];
                return (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center shadow-xs"
                  >
                    {photo ? (
                      <>
                        <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-white hover:bg-red-600 transition-all cursor-pointer"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] bg-black/80 text-white font-bold font-mono">
                          Photo #{idx + 1}
                        </span>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 text-[10px] font-bold">
                        Slot #{idx + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </form>

    </div>
  );
};
