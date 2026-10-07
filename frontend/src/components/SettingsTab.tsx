"use client";

import React, { useState } from "react";
import { 
  Database, 
  RefreshCw, 
  Copy, 
  Check, 
  Server, 
  Terminal, 
  ShieldCheck,
  Activity,
  CheckCircle2
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface SettingsTabProps {
  supabaseOnline: boolean;
  onRefreshAll: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  supabaseOnline,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [testLog, setTestLog] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const supabaseUrl = "https://crujjurupavknjwdjjmj.supabase.co";

  const sqlSchema = `-- OnTech Face Attendance Supabase PostgreSQL Schema

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    emp_code        TEXT PRIMARY KEY,
    full_name       TEXT,
    department      TEXT,
    designation     TEXT,
    mobile          TEXT,
    registered_date TEXT,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Face Embeddings (512-dimension Float32 serialized as Base64)
CREATE TABLE IF NOT EXISTS face_embeddings (
    emp_code         TEXT PRIMARY KEY REFERENCES employees(emp_code) ON DELETE CASCADE,
    embedding_base64 TEXT NOT NULL,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Attendance Logs (with Admin modification audit support)
CREATE TABLE IF NOT EXISTS attendance (
    id                BIGSERIAL PRIMARY KEY,
    emp_code          TEXT NOT NULL REFERENCES employees(emp_code) ON DELETE CASCADE,
    checkin_date      TEXT NOT NULL,
    checkin_time      TEXT NOT NULL,
    checkout_time     TEXT,
    status            TEXT DEFAULT 'Present',
    is_admin_modified BOOLEAN DEFAULT FALSE,
    notes             TEXT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for high-speed terminal and dashboard queries
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(emp_code, checkin_date);
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestLog("Initiating handshake with Supabase Cloud...");
    try {
      const { data, error } = await supabase.from("employees").select("emp_code").limit(1);
      if (error) {
        setTestLog(`Connection returned error: ${error.message} (Code: ${error.code})`);
      } else {
        setTestLog(`Connection OK! Database responded successfully. (${data?.length || 0} sample rows fetched).`);
      }
    } catch (err: any) {
      setTestLog(`Connection exception: ${err.message || err}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-black flex items-center space-x-3">
            <Database className="w-7 h-7 text-[#276F27]" />
            <span>Database & Cloud Backend</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Supabase cloud database configuration, table synchronization, and PostgreSQL schema.
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#276F27] hover:bg-[#1e581e] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
          suppressHydrationWarning
        >
          <RefreshCw className={`w-4 h-4 ${testing ? "animate-spin" : ""}`} />
          <span>{testing ? "Testing Ping..." : "Test Supabase Ping"}</span>
        </button>
      </div>

      {/* Grid: Status & System Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Supabase Status Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-black flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Server className="w-5 h-5 text-[#276F27]" />
            <span>Cloud Backend Details</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-500 font-semibold">Supabase Endpoint:</span>
              <span className="font-mono font-bold text-black truncate max-w-[200px]">{supabaseUrl}</span>
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-500 font-semibold">Live State:</span>
              <span className={`font-bold ${supabaseOnline ? "text-[#276F27]" : "text-amber-600"}`}>
                {supabaseOnline ? "Active & Synchronized" : "Local Database Mode"}
              </span>
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
              <span className="text-gray-500 font-semibold">Biometric Embeddings:</span>
              <span className="font-bold text-black">InsightFace 512-d ArcFace (Float32)</span>
            </div>

            {testLog && (
              <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-[11px] font-mono font-semibold text-gray-200">
                {testLog}
              </div>
            )}
          </div>
        </div>

        {/* System Architecture & Security Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-black flex items-center space-x-2 border-b border-gray-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-[#276F27]" />
            <span>Biometric Security & Sync</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-black">
                <CheckCircle2 className="w-4 h-4 text-[#276F27]" />
                <span>Zero Raw Image Storage</span>
              </div>
              <p className="text-[11px] text-gray-600 pl-6">
                Faces are instantly converted to mathematical 512-dimensional feature vectors. Raw photos are not required for recognition.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <div className="flex items-center space-x-2 font-bold text-black">
                <Activity className="w-4 h-4 text-[#276F27]" />
                <span>Real-Time Cloud Relay</span>
              </div>
              <p className="text-[11px] text-gray-600 pl-6">
                Enrolled faces in this dashboard are immediately synchronized with the desktop recognition kiosk via Supabase.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* SQL Schema Query Viewer */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-base font-bold text-black flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-[#276F27]" />
            <span>PostgreSQL Table Schema Query</span>
          </h2>

          <button
            onClick={handleCopySql}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#276F27] hover:bg-[#1e581e] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            suppressHydrationWarning
          >
            {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSql ? "Copied!" : "Copy SQL"}</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-gray-900 border border-gray-800 text-gray-200 font-mono text-[11px] overflow-x-auto leading-relaxed font-semibold">
          {sqlSchema}
        </pre>
      </div>

    </div>
  );
};
