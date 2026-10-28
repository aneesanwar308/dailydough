import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { ActiveOrdersTable } from './components/orders/ActiveOrdersTable';
import { DeliveredOrdersTable } from './components/orders/DeliveredOrdersTable';
import { CancelledOrdersTable } from './components/orders/CancelledOrdersTable';
import { PriceManagementView } from './components/prices/PriceManagementView';
import { ReportsView } from './components/reports/ReportsView';
import { NewOrderModal } from './components/orders/NewOrderModal';
import { ToastContainer } from './components/common/Toast';

export const AppContent: React.FC = () => {
  const { activeTab } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'active-orders':
        return <ActiveOrdersTable />;
      case 'delivered-orders':
        return <DeliveredOrdersTable />;
      case 'cancelled-orders':
        return <CancelledOrdersTable />;
      case 'price-management':
        return <PriceManagementView />;
      case 'reports-analytics':
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <NewOrderModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
