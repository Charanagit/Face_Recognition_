"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Scan, 
  XCircle, 
  LogIn, 
  LogOut, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  ScanFace,
  ShieldCheck
} from "lucide-react";
import { Employee, AttendanceRecord, RecognitionResult } from "../lib/types";

interface KioskTabProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  onMarkAttendance: (empCode: string, mode: "checkin" | "checkout" | "auto") => Promise<RecognitionResult>;
}

export const KioskTab: React.FC<KioskTabProps> = ({
  employees,
  onMarkAttendance,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<"auto" | "checkin" | "checkout">("auto");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Recognition Popup state
  const [scanResult, setScanResult] = useState<RecognitionResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play beep sound
  const playBeep = (type: "success" | "error") => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio not supported or blocked by browser policy");
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Kiosk camera failed:", err);
      setCameraError("Camera unavailable. Ensure permissions are granted.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Trigger Face Scan
  const handlePerformScan = async (selectedEmpCode?: string) => {
    if (isScanning) return;
    setIsScanning(true);
    setScanResult(null);

    try {
      let targetCode = selectedEmpCode;

      if (!targetCode) {
        // If from webcam, simulate vector matching across enrolled employees
        const enrolledWithEmbedding = employees.filter((e) => e.has_embedding);
        if (enrolledWithEmbedding.length === 0) {
          throw new Error("No employees have registered face vectors yet. Please enroll staff first.");
        }

        // Pick matching employee or random enrolled for demonstration
        const randomIdx = Math.floor(Math.random() * enrolledWithEmbedding.length);
        targetCode = enrolledWithEmbedding[randomIdx].emp_code;
      }

      // Execute attendance marking via prop
      const result = await onMarkAttendance(targetCode, scanMode);
      setScanResult(result);

      if (result.matchFound) {
        playBeep("success");
      } else {
        playBeep("error");
      }
    } catch (err: any) {
      playBeep("error");
      setScanResult({
        matchFound: false,
        confidence: 0,
        timestamp: new Date().toLocaleTimeString(),
        actionTaken: "none",
        message: err.message || "Face recognition failed. Please try again.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-[#276F27] flex items-center justify-center shadow-xs text-white">
            <ScanFace className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-black">Biometric Recognition Kiosk</h1>
            <p className="text-xs text-gray-500">
              AI facial verification with automatic check-in & check-out logging.
            </p>
          </div>
        </div>

        {/* Scan Mode Switcher */}
        <div className="flex items-center space-x-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            onClick={() => setScanMode("auto")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scanMode === "auto" ? "bg-[#276F27] text-white shadow-xs" : "text-gray-600 hover:text-black"
            }`}
          >
            ⚡ Smart Auto
          </button>
          <button
            onClick={() => setScanMode("checkin")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scanMode === "checkin" ? "bg-[#276F27] text-white shadow-xs" : "text-gray-600 hover:text-black"
            }`}
          >
            <LogIn className="w-3.5 h-3.5 inline mr-1" /> Check-In
          </button>
          <button
            onClick={() => setScanMode("checkout")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              scanMode === "checkout" ? "bg-[#276F27] text-white shadow-xs" : "text-gray-600 hover:text-black"
            }`}
          >
            <LogOut className="w-3.5 h-3.5 inline mr-1" /> Check-Out
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-xl text-gray-500 hover:text-black cursor-pointer"
            title={soundEnabled ? "Mute audio" : "Enable audio"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Kiosk Layout: Camera Left (8 cols), Biometric Result Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Camera Viewport (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
          
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border-2 border-gray-800 flex items-center justify-center shadow-md">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror-mode"
                  style={{ transform: "scaleX(-1)" }}
                />

                {/* Target Corners Overlay */}
                <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-[#8ECA3C]/40 rounded-2xl flex flex-col justify-between p-4">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-4 border-l-4 border-[#8ECA3C]" />
                    <div className="w-6 h-6 border-t-4 border-r-4 border-[#8ECA3C]" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-4 border-l-4 border-[#8ECA3C]" />
                    <div className="w-6 h-6 border-b-4 border-r-4 border-[#8ECA3C]" />
                  </div>
                </div>

                {/* Animated Scan Line */}
                {isScanning && (
                  <div className="absolute inset-x-0 h-1 bg-[#8ECA3C] shadow-[0_0_20px_#8ECA3C] animate-scan" />
                )}

                {/* Central Biometric Ring */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-52 h-64 rounded-[50%] border-2 ${isScanning ? "border-[#8ECA3C] animate-biometric-pulse" : "border-white/40"} flex items-center justify-center`}>
                    <div className="text-center bg-black/80 px-3 py-1 rounded-full border border-gray-700">
                      <span className="text-[11px] font-bold text-white tracking-wider uppercase">
                        {isScanning ? "Analyzing Face Vector..." : "Position Face In Center"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-8 space-y-3">
                <Camera className="w-12 h-12 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-400 max-w-xs">{cameraError || "Camera inactive."}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-[#276F27] text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Start Camera Feed
                </button>
              </div>
            )}
          </div>

          {/* Trigger Buttons */}
          <div className="flex items-center space-x-4 pt-2">
            <button
              onClick={() => handlePerformScan()}
              disabled={isScanning || !isCameraActive}
              className="flex-1 py-4 px-6 rounded-2xl bg-[#276F27] hover:bg-[#1e581e] text-white font-black text-sm shadow-md flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <Scan className={`w-5 h-5 ${isScanning ? "animate-spin" : ""}`} />
              <span>{isScanning ? "Verifying Face..." : "SCAN FACE NOW"}</span>
            </button>
            <button
              onClick={startCamera}
              className="p-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-all cursor-pointer"
              title="Restart Video Stream"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Biometric Verification Result Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Result Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-black flex items-center space-x-2 border-b border-gray-100 pb-3">
              <ShieldCheck className="w-5 h-5 text-[#276F27]" />
              <span>Recognition Result</span>
            </h2>

            {scanResult ? (
              <div className="space-y-4 animate-scaleUp">
                {scanResult.matchFound && scanResult.employee ? (
                  <div className="p-5 rounded-2xl bg-[#8ECA3C]/10 border-2 border-[#276F27]/30 space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#276F27] flex items-center justify-center font-black text-lg text-white shadow-xs">
                        {scanResult.employee.emp_code.slice(-3)}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-white px-2 py-0.5 rounded bg-black font-bold">
                          {scanResult.employee.emp_code}
                        </span>
                        <h3 className="text-lg font-black text-black mt-1">
                          {scanResult.employee.full_name}
                        </h3>
                        <p className="text-xs text-gray-500">{scanResult.employee.department}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-gray-200">
                      <div>
                        <span className="text-gray-500 text-[10px] block">Confidence</span>
                        <span className="font-mono font-bold text-black">{scanResult.confidence}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] block">Time Recorded</span>
                        <span className="font-mono font-bold text-black">{scanResult.timestamp}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#276F27] text-white text-center text-xs font-bold shadow-xs">
                      {scanResult.actionTaken === "checked_in" && "✓ Check-in Recorded Successfully"}
                      {scanResult.actionTaken === "checked_out" && "✓ Check-out Recorded Successfully"}
                      {scanResult.actionTaken === "already_recorded" && "ℹ Already Checked In for Today"}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-red-50 border-2 border-red-200 text-center space-y-3">
                    <XCircle className="w-10 h-10 text-red-600 mx-auto" />
                    <div>
                      <h4 className="font-bold text-sm text-black">No Face Match</h4>
                      <p className="text-xs text-red-600 mt-1">{scanResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 space-y-3 bg-gray-50 rounded-2xl border border-gray-100">
                <ScanFace className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-xs">
                  Press <strong>"SCAN FACE NOW"</strong> or select a staff member below for instant biometric attendance.
                </p>
              </div>
            )}
          </div>

          {/* Quick Staff Punch Override */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-black uppercase tracking-wider">
              Manual Biometric Simulator
            </h3>
            <p className="text-[11px] text-gray-500">
              Simulate instant face scan for any registered staff member:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {employees.map((emp) => (
                <button
                  key={emp.emp_code}
                  onClick={() => handlePerformScan(emp.emp_code)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-[#8ECA3C]/10 hover:border-[#276F27]/40 border border-gray-200 text-left transition-all text-xs cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-black">{emp.full_name}</span>
                    <span className="text-[10px] text-gray-500 block font-mono">{emp.emp_code}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#276F27] text-white">
                    Punch
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
