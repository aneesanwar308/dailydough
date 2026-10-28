import { Order, DashboardStats } from '../types';
import { formatKarachiDateTime } from './formatters';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Trigger browser download of CSV string
 */
function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a list of orders to CSV
 */
export function exportOrdersToCsv(orders: Order[], filenamePrefix = 'daily-dough-orders'): void {
  const headers = [
    'Order Number',
    'Status',
    'Order Date (Asia/Karachi)',
    'Customer Name',
    'Delivery Address',
    'Pack Size (kg)',
    'Quantity (bags)',
    'Price Per Bag (PKR)',
    'Total Amount (PKR)',
    'Delivery Date (Asia/Karachi)',
    'Cancellation Date (Asia/Karachi)',
    'Cancellation Reason',
    'Notes',
  ];

  const rows = orders.map((o) => [
    escapeCsvCell(o.orderNumber),
    escapeCsvCell(o.status.toUpperCase()),
    escapeCsvCell(formatKarachiDateTime(o.createdAt)),
    escapeCsvCell(o.customerName),
    escapeCsvCell(o.deliveryAddress),
    escapeCsvCell(o.packSizeKg),
    escapeCsvCell(o.quantity),
    escapeCsvCell(o.pricePerBag),
    escapeCsvCell(o.totalAmount),
    escapeCsvCell(o.deliveredAt ? formatKarachiDateTime(o.deliveredAt) : ''),
    escapeCsvCell(o.cancelledAt ? formatKarachiDateTime(o.cancelledAt) : ''),
    escapeCsvCell(o.cancellationReason || ''),
    escapeCsvCell(o.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCsv(csvContent, `${filenamePrefix}-${timestamp}.csv`);
}

/**
 * Export summary KPI metrics to CSV
 */
export function exportSummaryToCsv(
  stats: DashboardStats,
  periodLabel: string,
  filenamePrefix = 'daily-dough-summary'
): void {
  const data = [
    ['Metric', 'Value'],
    ['Reporting Period', periodLabel],
    ['Total Orders Created', stats.totalOrders],
    ['Active Orders', stats.activeOrders],
    ['Delivered Orders', stats.deliveredOrders],
    ['Cancelled Orders', stats.cancelledOrders],
    ['Total Bags Ordered', stats.totalBagsOrdered],
    ['Total Bags Delivered', stats.totalBagsDelivered],
    ['Total Bags Pending', stats.totalBagsPending],
    ['Total Bags Cancelled', stats.totalBagsCancelled],
    ['Delivered Revenue (PKR)', stats.totalDeliveredRevenue],
    ['Pending Order Value (PKR)', stats.pendingOrderValue],
    ['Cancelled Order Value (PKR)', stats.cancelledOrderValue],
    ['Avg Delivered Order Value (PKR)', Math.round(stats.avgDeliveredOrderValue)],
    ['Avg Bags Per Order', stats.avgBagsPerOrder.toFixed(1)],
    ['Delivery Completion Rate (%)', `${stats.deliveryCompletionRate.toFixed(1)}%`],
    ['Cancellation Rate (%)', `${stats.cancellationRate.toFixed(1)}%`],
    ['Generated At', new Date().toISOString()],
  ];

  const csvContent = data.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadCsv(csvContent, `${filenamePrefix}-${timestamp}.csv`);
}
