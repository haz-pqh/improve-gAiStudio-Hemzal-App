import React from 'react';
import { Home, CalendarCheck, TrendingUp, FileText, User } from 'lucide-react';

export type TabType = 'home' | 'attendance' | 'sales' | 'payslip' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingLeaveCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, pendingLeaveCount = 0 }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Terminal', icon: Home },
    { id: 'attendance' as TabType, label: 'Attendance', icon: CalendarCheck },
    { id: 'sales' as TabType, label: 'Sales Report', icon: TrendingUp },
    { id: 'payslip' as TabType, label: 'Payslip', icon: FileText },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1E293B]/95 backdrop-blur-xl border-t border-slate-700 py-2 px-3 shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1.5 text-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-150 relative cursor-pointer ${
                isActive
                  ? 'bg-slate-700/60 text-white border border-slate-600/60 font-semibold shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 border border-transparent'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-4 h-4 transition-transform duration-150 ${isActive ? 'text-blue-400 scale-105' : 'text-slate-400'}`} />
                {tab.id === 'home' && pendingLeaveCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-[#1E293B]" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-full font-medium ${isActive ? 'text-white font-semibold' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
