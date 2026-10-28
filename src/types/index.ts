export type PackSize = 5 | 10 | 20;

export type OrderStatus = 'active' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  packSizeKg: PackSize;
  quantity: number;
  pricePerBag: number;
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  updatedAt: string;
}

export interface CurrentPrice {
  id?: string;
  packSizeKg: PackSize;
  pricePerBag: number;
  effectiveAt?: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  packSizeKg: PackSize;
  previousPrice: number | null;
  newPrice: number;
  effectiveAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actionType:
    | 'ORDER_CREATED'
    | 'ORDER_EDITED'
    | 'ORDER_DELIVERED'
    | 'ORDER_CANCELLED'
    | 'ORDER_CORRECTED'
    | 'PRICE_UPDATED'
    | 'SYSTEM_INIT';
  entityId: string;
  details: Record<string, any>;
  timestamp: string;
}

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export interface DateFilter {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalBagsOrdered: number;
  totalBagsDelivered: number;
  totalBagsPending: number;
  totalBagsCancelled: number;
  totalDeliveredRevenue: number;
  pendingOrderValue: number;
  cancelledOrderValue: number;
  avgDeliveredOrderValue: number;
  avgBagsPerOrder: number;
  avgRevenuePerDeliveredOrder: number;
  deliveryCompletionRate: number;
  cancellationRate: number;
}

export type ActiveTab =
  | 'dashboard'
  | 'active-orders'
  | 'delivered-orders'
  | 'cancelled-orders'
  | 'price-management'
  | 'reports-analytics';
