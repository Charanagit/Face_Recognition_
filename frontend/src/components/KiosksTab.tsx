"use client";

import React, { useState } from "react";
import { 
  Monitor, 
  Camera, 
  Terminal, 
  Copy, 
  Check
} from "lucide-react";
import { Employee, AttendanceRecord } from "../lib/types";

interface KiosksTabProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
}

export const KiosksTab: React.FC<KiosksTabProps> = ({
  employees,
  attendance,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);

  const vectorizedCount = employees.filter((e) => e.has_embedding).length;
  const lastAttendance = attendance[0];

  const launchCommand = `& "C:\\Users\\chara\\OneDrive\\Desktop\\FR\\ontech-face-attendance\\venv\\Scripts\\python.exe" "C:\\Users\\chara\\OneDrive\\Desktop\\face_app\\ontech-face-attendance\\recognize_webcam.py"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(launchCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const kioskTerminals = [
    {
      id: "KIOSK-01",
      name: "Main Reception & Front Lobby Terminal",
      location: "Building A • Ground Floor",
      status: "Online & Listening",
      camera: "Webcam HD (InsightFace buffalo_s + MediaPipe)",
      vectorCount: vectorizedCount,
      lastActive: "Just now",
      ipAddress: "192.168.1.104",
      fps: "30 FPS",
    },
    {
      id: "KIOSK-02",
      name: "Engineering & R&D Floor Terminal",
      location: "Building B • 3rd Floor",
      status: "Standby / Ready",
      camera: "Integrated Camera (InsightFace ONNX)",
      vectorCount: vectorizedCount,
      lastActive: "2 mins ago",
      ipAddress: "192.168.1.108",
      fps: "30 FPS",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black flex items-center space-x-3">
            <Monitor className="w-7 h-7 text-[#276F27]" />
            <span>Desktop Kiosks & Hardware Terminals</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Monitor and launch physical desktop recognition kiosks running local webcam biometric models.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#8ECA3C]/20 px-4 py-2.5 rounded-2xl border border-[#8ECA3C]/50">
          <div className="w-2.5 h-2.5 rounded-full bg-[#276F27] animate-pulse" />
          <span className="text-xs font-bold text-[#276F27]">
            {vectorizedCount} Face Vectors Synced
          </span>
        </div>
      </div>

      {/* Terminal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kioskTerminals.map((kiosk) => (
          <div
            key={kiosk.id}
            className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 hover:border-[#276F27] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-[#276F27] flex items-center justify-center text-white shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded bg-black">
                    {kiosk.id}
                  </span>
                  <h3 className="text-base font-black text-black mt-1">{kiosk.name}</h3>
                  <p className="text-xs text-gray-500 font-medium">{kiosk.location}</p>
                </div>
              </div>

              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#8ECA3C]/20 text-[#276F27] border border-[#8ECA3C]/50">
                <span className="w-1.5 h-1.5 rounded-full bg-[#276F27] animate-ping" />
                <span>{kiosk.status}</span>
              </span>
            </div>

            <div className="space-y-2 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Vision Engine:</span>
                <span className="font-bold text-black">InsightFace buffalo_s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Synced Vectors:</span>
                <span className="font-bold text-[#276F27]">{kiosk.vectorCount} Enrolled Staff</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Terminal IP:</span>
                <span className="font-mono text-black">{kiosk.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Capture Speed:</span>
                <span className="font-bold text-black">{kiosk.fps} Live</span>
              </div>
            </div>

            {lastAttendance && (
              <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-3 font-medium">
                <span>Latest Scan:</span>
                <span className="font-bold text-black">
                  {lastAttendance.employee_name} ({lastAttendance.checkin_time})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Launch Desktop Application Command Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-base font-black text-black flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-[#276F27]" />
            <span>Launch Physical Recognition Terminal (Desktop App)</span>
          </h2>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#276F27] hover:bg-[#1e581e] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCmd ? "Copied Command!" : "Copy PowerShell Command"}</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 font-medium leading-relaxed">
          Run this command on the kiosk terminal PC to launch the high-speed webcam recognition window. It connects directly to Supabase to verify faces against your enrolled database:
        </p>

        <pre className="p-4 rounded-2xl bg-gray-900 border border-gray-800 text-[#8ECA3C] font-mono text-xs overflow-x-auto font-bold">
          {launchCommand}
        </pre>
      </div>

    </div>
  );
};
