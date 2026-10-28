import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  format,
} from 'date-fns';
import { Order, DashboardStats, DateRangePreset } from '../types';

/**
 * Computes date boundaries for filtering in Asia/Karachi time
 */
export function getDateRangeBoundaries(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date; label: string } {
  const now = new Date();

  switch (preset) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: 'Today',
      };
    case 'yesterday': {
      const y = subDays(now, 1);
      return {
        start: startOfDay(y),
        end: endOfDay(y),
        label: 'Yesterday',
      };
    }
    case 'last7':
      return {
        start: startOfDay(subDays(now, 6)),
        end: endOfDay(now),
        label: 'Last 7 Days',
      };
    case 'last30':
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
        label: 'Last 30 Days',
      };
    case 'thisWeek':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday start
        end: endOfWeek(now, { weekStartsOn: 1 }),
        label: 'This Week',
      };
    case 'lastWeek': {
      const prevWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(prevWeek, { weekStartsOn: 1 }),
        end: endOfWeek(prevWeek, { weekStartsOn: 1 }),
        label: 'Last Week',
      };
    }
    case 'thisMonth':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: 'This Month',
      };
    case 'lastMonth': {
      const prevMonth = subMonths(now, 1);
      return {
        start: startOfMonth(prevMonth),
        end: endOfMonth(prevMonth),
        label: 'Last Month',
      };
    }
    case 'thisYear':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        label: 'This Year',
      };
    case 'custom': {
      const s = customStart ? startOfDay(parseISO(customStart)) : startOfDay(subDays(now, 30));
      const e = customEnd ? endOfDay(parseISO(customEnd)) : endOfDay(now);
      return {
        start: s,
        end: e,
        label: 'Custom Range',
      };
    }
    default:
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
        label: 'Last 30 Days',
      };
  }
}

/**
 * Check if a timestamp string is within the given interval [start, end]
 */
export function isDateWithin(dateString: string | null | undefined, interval: { start: Date; end: Date }): boolean {
  if (!dateString) return false;
  try {
    const d = parseISO(dateString);
    return isWithinInterval(d, interval);
  } catch {
    return false;
  }
}

/**
 * Calculates Dashboard Statistics strictly per requirements:
 *
 * - Total Orders = all orders created within the selected reporting period.
 * - Active Orders = orders currently active that were created within the selected period.
 * - Delivered Orders = orders delivered within the selected period (delivery-based).
 * - Cancelled Orders = orders cancelled within the selected period (cancellation-based).
 * - Total Bags Ordered = sum of quantities for qualifying created orders.
 * - Total Bags Delivered = sum of quantities for qualifying delivered orders.
 * - Total Bags Pending = sum of quantities for qualifying active orders.
 * - Total Bags Cancelled = sum of quantities for qualifying cancelled orders.
 * - Total Delivered Revenue = sum of stored order totals for qualifying delivered orders.
 * - Pending Order Value = sum of stored totals for currently active orders.
 * - Cancelled Order Value = sum of stored totals for cancelled orders.
 * - Delivery Completion Rate = delivered / (delivered + cancelled + active)
 * - Cancellation Rate = cancelled / total
 */
export function calculateDashboardStats(
  orders: Order[],
  interval: { start: Date; end: Date }
): DashboardStats {
  // Orders created in period
  const createdInPeriod = orders.filter((o) => isDateWithin(o.createdAt, interval));

  // Orders active in period
  const activeOrdersList = createdInPeriod.filter((o) => o.status === 'active');

  // Orders delivered in period (by deliveredAt date)
  const deliveredInPeriod = orders.filter((o) =>
    o.status === 'delivered' && isDateWithin(o.deliveredAt || o.createdAt, interval)
  );

  // Orders cancelled in period (by cancelledAt date)
  const cancelledInPeriod = orders.filter((o) =>
    o.status === 'cancelled' && isDateWithin(o.cancelledAt || o.createdAt, interval)
  );

  const totalOrders = createdInPeriod.length;
  const activeOrders = activeOrdersList.length;
  const deliveredOrders = deliveredInPeriod.length;
  const cancelledOrders = cancelledInPeriod.length;

  const totalBagsOrdered = createdInPeriod.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const totalBagsDelivered = deliveredInPeriod.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const totalBagsPending = activeOrdersList.reduce((sum, o) => sum + (o.quantity || 0), 0);
  const totalBagsCancelled = cancelledInPeriod.reduce((sum, o) => sum + (o.quantity || 0), 0);

  // Delivered revenue strictly uses stored order totals for delivered orders
  const totalDeliveredRevenue = deliveredInPeriod.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Pending order value
  const pendingOrderValue = activeOrdersList.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Cancelled order value
  const cancelledOrderValue = cancelledInPeriod.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Averages with zero-denominator guards
  const avgDeliveredOrderValue = deliveredOrders > 0 ? totalDeliveredRevenue / deliveredOrders : 0;
  const avgBagsPerOrder = totalOrders > 0 ? totalBagsOrdered / totalOrders : 0;
  const avgRevenuePerDeliveredOrder = deliveredOrders > 0 ? totalDeliveredRevenue / deliveredOrders : 0;

  // Completion rate: delivered / (delivered + cancelled + active)
  const totalRelevantOrders = deliveredOrders + cancelledOrders + activeOrders;
  const deliveryCompletionRate = totalRelevantOrders > 0 ? (deliveredOrders / totalRelevantOrders) * 100 : 0;

  // Cancellation rate: cancelled / total orders
  const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

  return {
    totalOrders,
    activeOrders,
    deliveredOrders,
    cancelledOrders,
    totalBagsOrdered,
    totalBagsDelivered,
    totalBagsPending,
    totalBagsCancelled,
    totalDeliveredRevenue,
    pendingOrderValue,
    cancelledOrderValue,
    avgDeliveredOrderValue,
    avgBagsPerOrder,
    avgRevenuePerDeliveredOrder,
    deliveryCompletionRate,
    cancellationRate,
  };
}

/**
 * Aggregate daily revenue trend for charts
 */
export function aggregateDailyRevenue(
  orders: Order[],
  interval: { start: Date; end: Date }
): Array<{ date: string; displayDate: string; revenue: number; bags: number; ordersCount: number }> {
  const delivered = orders.filter((o) =>
    o.status === 'delivered' && isDateWithin(o.deliveredAt || o.createdAt, interval)
  );

  const map = new Map<string, { revenue: number; bags: number; ordersCount: number }>();

  for (const o of delivered) {
    const dStr = o.deliveredAt || o.createdAt;
    const key = format(parseISO(dStr), 'yyyy-MM-dd');
    const existing = map.get(key) || { revenue: 0, bags: 0, ordersCount: 0 };
    existing.revenue += o.totalAmount;
    existing.bags += o.quantity;
    existing.ordersCount += 1;
    map.set(key, existing);
  }

  // Sort chronologically
  const sortedKeys = Array.from(map.keys()).sort();
  return sortedKeys.map((k) => ({
    date: k,
    displayDate: format(parseISO(k), 'dd MMM'),
    revenue: map.get(k)!.revenue,
    bags: map.get(k)!.bags,
    ordersCount: map.get(k)!.ordersCount,
  }));
}

/**
 * Aggregate bags and revenue sold by pack size (5kg, 10kg, 20kg)
 */
export function aggregatePackSizeDistribution(orders: Order[]): Array<{
  packSize: string;
  packSizeKg: number;
  bags: number;
  revenue: number;
  percentage: number;
}> {
  const delivered = orders.filter((o) => o.status === 'delivered');
  const totalBags = delivered.reduce((sum, o) => sum + o.quantity, 0);

  const sizes = [5, 10, 20];
  return sizes.map((size) => {
    const sizeOrders = delivered.filter((o) => o.packSizeKg === size);
    const bags = sizeOrders.reduce((sum, o) => sum + o.quantity, 0);
    const revenue = sizeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const percentage = totalBags > 0 ? (bags / totalBags) * 100 : 0;
    return {
      packSize: `${size} kg`,
      packSizeKg: size,
      bags,
      revenue,
      percentage,
    };
  });
}

/**
 * Orders breakdown by status for pie charts
 */
export function aggregateStatusDistribution(orders: Order[]): Array<{
  name: string;
  status: string;
  count: number;
  color: string;
}> {
  const activeCount = orders.filter((o) => o.status === 'active').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  return [
    { name: 'Active', status: 'active', count: activeCount, color: '#0284c7' },       // Sky blue
    { name: 'Delivered', status: 'delivered', count: deliveredCount, color: '#16a34a' }, // Emerald green
    { name: 'Cancelled', status: 'cancelled', count: cancelledCount, color: '#ef4444' }, // Red
  ];
}

/**
 * Top customers by order count and delivered revenue
 */
export function aggregateTopCustomers(orders: Order[]): Array<{
  customerName: string;
  totalOrders: number;
  deliveredOrders: number;
  deliveredRevenue: number;
  totalBags: number;
}> {
  const customerMap = new Map<
    string,
    { totalOrders: number; deliveredOrders: number; deliveredRevenue: number; totalBags: number }
  >();

  for (const o of orders) {
    const name = o.customerName.trim();
    const entry = customerMap.get(name) || {
      totalOrders: 0,
      deliveredOrders: 0,
      deliveredRevenue: 0,
      totalBags: 0,
    };

    entry.totalOrders += 1;
    if (o.status === 'delivered') {
      entry.deliveredOrders += 1;
      entry.deliveredRevenue += o.totalAmount;
      entry.totalBags += o.quantity;
    }
    customerMap.set(name, entry);
  }

  return Array.from(customerMap.entries())
    .map(([customerName, data]) => ({ customerName, ...data }))
    .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);
}
