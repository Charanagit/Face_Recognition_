"use client";

import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  CalendarCheck, 
  BarChart3,
  Database,
  ShieldCheck,
  Clock,
  Sparkles
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  supabaseOnline: boolean;
  totalEmployees: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  supabaseOnline,
  totalEmployees,
}) => {
  const [time, setTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Staff Directory", icon: Users },
    { id: "register", label: "Enroll Staff", icon: UserPlus },
    { id: "attendance", label: "Attendance Logs", icon: CalendarCheck },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Database", icon: Database },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 border-b border-gray-200 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group" 
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#276F27] flex items-center justify-center shadow-md transform group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-black">FACEREC</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8ECA3C] text-black font-black uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">
                Face Attendance Management
              </p>
            </div>
          </div>

          {/* Clean Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-[#276F27] text-white shadow-sm"
                      : "text-gray-700 hover:text-black hover:bg-gray-200/60"
                  }`}
                  suppressHydrationWarning
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#8ECA3C]" : "text-gray-500"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Badges */}
          <div className="flex items-center space-x-2.5">
            
            {/* Live Clock */}
            {mounted && time && (
              <div className="hidden sm:flex items-center space-x-1.5 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 text-xs shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#276F27]" />
                <span className="font-mono font-bold text-black text-[11px]">{time}</span>
              </div>
            )}

            {/* Supabase Status Pill */}
            <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  supabaseOnline ? "bg-[#8ECA3C] animate-pulse" : "bg-gray-400"
                }`}
              />
              <span className="text-xs font-bold text-black">
                {supabaseOnline ? "Cloud Active" : "Local Database"}
              </span>
            </div>

          </div>

        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1.5 border-t border-gray-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-bold transition-all ${
                  isActive
                    ? "bg-[#276F27] text-white shadow-xs"
                    : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                }`}
                suppressHydrationWarning
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
