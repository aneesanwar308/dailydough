import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Menu, PlusCircle, Tag, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    activeTab,
    openNewOrderModal,
    openUpdatePriceModal,
    refreshAllData,
    loading,
  } = useApp();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      // Asia/Karachi time
      const now = new Date();
      setCurrentTime(format(now, 'EEE, dd MMM yyyy • hh:mm:ss a'));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabTitles = {
    dashboard: 'Business Dashboard',
    'active-orders': 'Active Orders Queue',
    'delivered-orders': 'Delivered Orders History',
    'cancelled-orders': 'Cancelled Orders Archive',
    'price-management': 'Pack Pricing & History',
    'reports-analytics': 'Reports & Business Analytics',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Left Title & Mobile Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {tabTitles[activeTab]}
          </h2>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Asia/Karachi: {currentTime}</span>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => refreshAllData()}
          title="Refresh Data"
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={() => openUpdatePriceModal(10)}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Tag className="w-3.5 h-3.5 text-emerald-600" />
          <span>Update Prices</span>
        </button>

        <button
          onClick={openNewOrderModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-200 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Order</span>
        </button>
      </div>
    </header>
  );
};
