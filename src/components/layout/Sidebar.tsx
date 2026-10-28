import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import {
  LayoutDashboard,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Tag,
  BarChart3,
  PlusCircle,
  Wheat,
  Database,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    activeCount,
    deliveredCount,
    cancelledCount,
    openNewOrderModal,
    backendMode,
    refreshAllData,
  } = useApp();

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    count?: number;
    countColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'active-orders',
      label: 'Active Orders',
      icon: PackageCheck,
      count: activeCount,
      countColor: 'bg-sky-100 text-sky-700',
    },
    {
      id: 'delivered-orders',
      label: 'Delivered Orders',
      icon: CheckCircle2,
      count: deliveredCount,
      countColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'cancelled-orders',
      label: 'Cancelled Orders',
      icon: XCircle,
      count: cancelledCount,
      countColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'price-management',
      label: 'Price Management',
      icon: Tag,
    },
    {
      id: 'reports-analytics',
      label: 'Reports & Analytics',
      icon: BarChart3,
    },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Quick Action */}
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                <Wheat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-base leading-tight">Daily Dough</h1>
                <p className="text-xs text-emerald-700 font-medium">Atta Chaki Admin</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <button
              onClick={() => {
                openNewOrderModal();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all shadow-emerald-200 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Order</span>
            </button>
          </div>

          {/* Nav links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <a
                  key={item.id}
                  href={`?tab=${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${item.countColor || 'bg-slate-100 text-slate-700'}`}
                    >
                      {item.count}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Footer / Connection Badge */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <div>
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      backendMode === 'mongodb' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <span>{backendMode === 'mongodb' ? 'MongoDB Atlas' : 'Local Storage'}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                  {backendMode === 'mongodb' ? 'Cluster Active' : 'Offline Mode'}
                </p>
              </div>
            </div>
            <button
              onClick={() => refreshAllData()}
              title="Refresh connection status"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
