import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Order,
  CurrentPrice,
  PriceHistory,
  AuditLog,
  ActiveTab,
  DateFilter,
  PackSize,
} from '../types';
import {
  fetchOrders,
  createOrder,
  markOrderAsDelivered,
  cancelOrder,
  editOrder,
  correctDeliveredOrder,
  fetchPrices,
  updatePackPrice,
  fetchPriceHistory,
  fetchAuditLogs,
  checkBackendHealth,
} from '../lib/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface AppContextType {
  orders: Order[];
  prices: CurrentPrice[];
  priceHistory: PriceHistory[];
  auditLogs: AuditLog[];
  loading: boolean;
  activeTab: ActiveTab;
  dateFilter: DateFilter;
  backendMode: 'mongodb' | 'local';
  toasts: ToastMessage[];
  // Counts for sidebar badges
  activeCount: number;
  deliveredCount: number;
  cancelledCount: number;
  // Modal states
  isNewOrderModalOpen: boolean;
  isUpdatePriceModalOpen: boolean;
  selectedPackForPriceModal: PackSize;
  // Methods
  setActiveTab: (tab: ActiveTab) => void;
  setDateFilter: (filter: DateFilter) => void;
  resetDateFilter: () => void;
  openNewOrderModal: () => void;
  closeNewOrderModal: () => void;
  openUpdatePriceModal: (packSize?: PackSize) => void;
  closeUpdatePriceModal: () => void;
  // Business Actions
  createNewOrder: (payload: {
    customerName: string;
    deliveryAddress: string;
    packSizeKg: PackSize;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  deliverOrder: (orderId: string) => Promise<void>;
  cancelSingleOrder: (orderId: string, reason?: string) => Promise<void>;
  editExistingOrder: (
    orderId: string,
    updates: {
      customerName: string;
      deliveryAddress: string;
      packSizeKg: PackSize;
      quantity: number;
      notes?: string;
    }
  ) => Promise<void>;
  correctDelivered: (
    orderId: string,
    payload: {
      customerName?: string;
      deliveryAddress?: string;
      notes?: string;
      correctionReason: string;
    }
  ) => Promise<void>;
  updatePrice: (payload: {
    packSizeKg: PackSize;
    newPrice: number;
    effectiveAt?: string;
  }) => Promise<void>;
  refreshAllData: () => Promise<void>;
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const VALID_TABS: ActiveTab[] = [
  'dashboard',
  'active-orders',
  'delivered-orders',
  'cancelled-orders',
  'price-management',
  'reports-analytics',
];

function getTabFromUrl(): ActiveTab {
  if (typeof window === 'undefined') return 'dashboard';
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab') as ActiveTab;
  if (tabParam && VALID_TABS.includes(tabParam)) {
    return tabParam;
  }
  const hash = window.location.hash.replace('#', '') as ActiveTab;
  if (hash && VALID_TABS.includes(hash)) {
    return hash;
  }
  return 'dashboard';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [prices, setPrices] = useState<CurrentPrice[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTabState] = useState<ActiveTab>(getTabFromUrl);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ preset: 'last30' });
  const [backendMode, setBackendMode] = useState<'mongodb' | 'local'>('local');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isUpdatePriceModalOpen, setIsUpdatePriceModalOpen] = useState(false);
  const [selectedPackForPriceModal, setSelectedPackForPriceModal] = useState<PackSize>(10);

  // Synchronize activeTab with URL query parameter & browser history
  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({ tab }, '', url.toString());
    }
  }, []);

  // Listen for browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const currentTab = getTabFromUrl();
      setActiveTabState(currentTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const health = await checkBackendHealth();
      setBackendMode(health.live ? 'mongodb' : 'local');

      const [ordersData, pricesData, historyData, logsData] = await Promise.all([
        fetchOrders(),
        fetchPrices(),
        fetchPriceHistory(),
        fetchAuditLogs(),
      ]);

      setOrders(ordersData);
      setPrices(pricesData);
      setPriceHistory(historyData);
      setAuditLogs(logsData);
    } catch (err: any) {
      console.error('Data refresh error:', err);
      showToast({
        type: 'error',
        title: 'Connection Notice',
        description: 'Loaded cached data. Server or MongoDB is in offline mode.',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Order Counts
  const activeCount = useMemo(() => orders.filter((o) => o.status === 'active').length, [orders]);
  const deliveredCount = useMemo(() => orders.filter((o) => o.status === 'delivered').length, [orders]);
  const cancelledCount = useMemo(() => orders.filter((o) => o.status === 'cancelled').length, [orders]);

  // Reset filter
  const resetDateFilter = useCallback(() => {
    setDateFilter({ preset: 'last30' });
  }, []);

  // Modal actions
  const openNewOrderModal = useCallback(() => setIsNewOrderModalOpen(true), []);
  const closeNewOrderModal = useCallback(() => setIsNewOrderModalOpen(false), []);

  const openUpdatePriceModal = useCallback((packSize: PackSize = 10) => {
    setSelectedPackForPriceModal(packSize);
    setIsUpdatePriceModalOpen(true);
  }, []);
  const closeUpdatePriceModal = useCallback(() => setIsUpdatePriceModalOpen(false), []);

  // Order Business Actions
  const createNewOrder = useCallback(
    async (payload: {
      customerName: string;
      deliveryAddress: string;
      packSizeKg: PackSize;
      quantity: number;
      notes?: string;
    }) => {
      try {
        const newOrder = await createOrder(payload);
        setOrders((prev) => [newOrder, ...prev]);
        showToast({
          type: 'success',
          title: 'Order Created',
          description: `Order ${newOrder.orderNumber} for ${payload.customerName} successfully created.`,
        });
        await refreshAllData();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Failed to Create Order',
          description: err.message || 'Validation error or network issue.',
        });
        throw err;
      }
    },
    [refreshAllData, showToast]
  );

  const deliverOrder = useCallback(
    async (orderId: string) => {
      try {
        await markOrderAsDelivered(orderId);
        showToast({
          type: 'success',
          title: 'Order Delivered',
          description: 'Order status updated to Delivered and delivery timestamp recorded.',
        });
        await refreshAllData();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Update Failed',
          description: err.message || 'Could not mark order as delivered.',
        });
        throw err;
      }
    },
    [refreshAllData, showToast]
  );

  const cancelSingleOrder = useCallback(
    async (orderId: string, reason?: string) => {
      try {
        await cancelOrder(orderId, reason);
        showToast({
          type: 'info',
          title: 'Order Cancelled',
          description: 'Order moved to Cancelled Orders. Historical record preserved.',
        });
        await refreshAllData();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Cancellation Failed',
          description: err.message || 'Could not cancel order.',
        });
        throw err;
      }
    },
    [refreshAllData, showToast]
  );

  const editExistingOrder = useCallback(
    async (
      orderId: string,
      updates: {
        customerName: string;
        deliveryAddress: string;
        packSizeKg: PackSize;
        quantity: number;
        notes?: string;
      }
    ) => {
      try {
        await editOrder(orderId, updates);
        showToast({
          type: 'success',
          title: 'Order Updated',
          description: 'Order details saved successfully.',
        });
        await refreshAllData();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Edit Failed',
          description: err.message || 'Could not edit order.',
        });
        throw err;
      }
    },
    [refreshAllData, showToast]
  );

  const correctDelivered = useCallback(
    async (
      orderId: string,
      payload: {
        customerName?: string;
        deliveryAddress?: string;
        notes?: string;
        correctionReason: string;
      }
    ) => {
      try {
        await correctDeliveredOrder(orderId, payload);
        showToast({
          type: 'success',
          title: 'Order Corrected',
          description: 'Administrative correction recorded with audit entry.',
        });
        await refreshAllData();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Correction Failed',
          description: err.message || 'Could not update delivered order.',
        });
        throw err;
      }
    },
    [refreshAllData, showToast]
  );

  const updatePrice = useCallback(
    async (payload: { packSizeKg: PackSize; newPrice: number; effectiveAt?: string }) => {
      try {
        await updatePackPrice(payload);
        showToast({
          type: 'success',
          title: 'Price Updated',
          description: `Price for ${payload.packSizeKg} kg pack updated to Rs. ${payload.newPrice.toLocaleString()}. Past orders remain untouched.`,
        });
        await refreshAllData();
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Price Update Failed',
          description: err.message || 'Failed to update price.',
        });
        throw err;
      }
    },
    [refreshAllData, showToast]
  );

  return (
    <AppContext.Provider
      value={{
        orders,
        prices,
        priceHistory,
        auditLogs,
        loading,
        activeTab,
        dateFilter,
        backendMode,
        toasts,
        activeCount,
        deliveredCount,
        cancelledCount,
        isNewOrderModalOpen,
        isUpdatePriceModalOpen,
        selectedPackForPriceModal,
        setActiveTab,
        setDateFilter,
        resetDateFilter,
        openNewOrderModal,
        closeNewOrderModal,
        openUpdatePriceModal,
        closeUpdatePriceModal,
        createNewOrder,
        deliverOrder,
        cancelSingleOrder,
        editExistingOrder,
        correctDelivered,
        updatePrice,
        refreshAllData,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
