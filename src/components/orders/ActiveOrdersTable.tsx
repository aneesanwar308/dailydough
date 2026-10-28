import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, PackSize } from '../../types';
import { PackSizeBadge, StatusBadge } from '../common/Badge';
import { formatPKR, formatKarachiDateTime } from '../../lib/formatters';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EditOrderModal } from './EditOrderModal';
import { OrderDetailsModal } from './OrderDetailsModal';
import { Pagination } from '../common/Pagination';
import {
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Eye,
  PlusCircle,
  FileDown,
  ArrowUpDown,
} from 'lucide-react';
import { exportOrdersToCsv } from '../../lib/exportCsv';

export const ActiveOrdersTable: React.FC = () => {
  const {
    orders,
    deliverOrder,
    cancelSingleOrder,
    openNewOrderModal,
  } = useApp();

  const [search, setSearch] = useState('');
  const [packFilter, setPackFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Order>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [deliverTarget, setDeliverTarget] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [editTarget, setEditTarget] = useState<Order | null>(null);
  const [viewTarget, setViewTarget] = useState<Order | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === 'active'),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      // Pack size filter
      if (packFilter !== 'all' && o.packSizeKg !== Number(packFilter)) {
        return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesAddress = o.deliveryAddress.toLowerCase().includes(q);
        const matchesOrderNo = o.orderNumber.toLowerCase().includes(q);
        return matchesName || matchesAddress || matchesOrderNo;
      }
      return true;
    });
  }, [activeOrders, packFilter, search]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null || bVal == null) return 0;
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortAsc]);

  // Paginated chunk
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage]);

  const handleSort = (field: keyof Order) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, address, or order #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Pack Size Filter */}
          <select
            value={packFilter}
            onChange={(e) => {
              setPackFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Pack Sizes</option>
            <option value="5">5 kg</option>
            <option value="10">10 kg</option>
            <option value="20">20 kg</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportOrdersToCsv(filteredOrders, 'daily-dough-active-orders')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openNewOrderModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th
                  onClick={() => handleSort('orderNumber')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Order ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('createdAt')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Order Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('customerName')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Delivery Address</th>
                <th className="py-3 px-4">Pack Size</th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Bags</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Price / Bag</th>
                <th
                  onClick={() => handleSort('totalAmount')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 italic">
                    No active orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatKarachiDateTime(order.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {order.customerName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={order.deliveryAddress}>
                      {order.deliveryAddress}
                    </td>
                    <td className="py-3 px-4">
                      <PackSizeBadge packSize={order.packSizeKg} />
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {order.quantity}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatPKR(order.pricePerBag)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {formatPKR(order.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate" title={order.notes}>
                      {order.notes || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Mark Delivered */}
                        <button
                          onClick={() => setDeliverTarget(order)}
                          title="Mark as Delivered"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>

                        {/* Edit Order */}
                        <button
                          onClick={() => setEditTarget(order)}
                          title="Edit Order"
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => setViewTarget(order)}
                          title="View Details & Audit"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Cancel Order */}
                        <button
                          onClick={() => setCancelTarget(order)}
                          title="Cancel Order"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Confirmation Dialog: Mark as Delivered */}
      <ConfirmDialog
        isOpen={!!deliverTarget}
        onClose={() => setDeliverTarget(null)}
        onConfirm={async () => {
          if (deliverTarget) {
            await deliverOrder(deliverTarget.id);
          }
        }}
        title="Mark Order as Delivered?"
        message={`Are you sure you want to mark order ${deliverTarget?.orderNumber} (${deliverTarget?.customerName}) as delivered? This will record the delivery timestamp and move it to Delivered Orders.`}
        confirmText="Confirm Delivery"
        variant="success"
      />

      {/* Confirmation Dialog: Cancel Order */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={async (reason) => {
          if (cancelTarget) {
            await cancelSingleOrder(cancelTarget.id, reason);
          }
        }}
        title="Cancel Active Order?"
        message={`Are you sure you want to cancel order ${cancelTarget?.orderNumber}? Cancelled orders remain in the archive for auditing but will not count toward delivered revenue.`}
        confirmText="Cancel Order"
        variant="danger"
        optionalReason={true}
        reasonLabel="Cancellation Reason"
        reasonPlaceholder="e.g. Customer cancelled on phone, incorrect address..."
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        order={editTarget}
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
      />

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={viewTarget}
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </div>
  );
};
