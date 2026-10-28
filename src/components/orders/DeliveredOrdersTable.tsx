import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { PackSizeBadge } from '../common/Badge';
import { formatPKR, formatKarachiDateTime } from '../../lib/formatters';
import { OrderDetailsModal } from './OrderDetailsModal';
import { Pagination } from '../common/Pagination';
import { Modal } from '../common/Modal';
import {
  Search,
  Eye,
  FileDown,
  ArrowUpDown,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import { exportOrdersToCsv } from '../../lib/exportCsv';

export const DeliveredOrdersTable: React.FC = () => {
  const { orders, correctDelivered } = useApp();

  const [search, setSearch] = useState('');
  const [packFilter, setPackFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Order>('deliveredAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [viewTarget, setViewTarget] = useState<Order | null>(null);
  const [correctTarget, setCorrectTarget] = useState<Order | null>(null);

  // Correction Form State
  const [correctionCustomer, setCorrectionCustomer] = useState('');
  const [correctionAddress, setCorrectionAddress] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === 'delivered'),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return deliveredOrders.filter((o) => {
      if (packFilter !== 'all' && o.packSizeKg !== Number(packFilter)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesAddress = o.deliveryAddress.toLowerCase().includes(q);
        const matchesOrderNo = o.orderNumber.toLowerCase().includes(q);
        return matchesName || matchesAddress || matchesOrderNo;
      }
      return true;
    });
  }, [deliveredOrders, packFilter, search]);

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

  const openCorrectionModal = (order: Order) => {
    setCorrectTarget(order);
    setCorrectionCustomer(order.customerName);
    setCorrectionAddress(order.deliveryAddress);
    setCorrectionNotes(order.notes || '');
    setCorrectionReason('');
  };

  const handleApplyCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctTarget || !correctionReason.trim()) return;

    setIsSubmittingCorrection(true);
    try {
      await correctDelivered(correctTarget.id, {
        customerName: correctionCustomer,
        deliveryAddress: correctionAddress,
        notes: correctionNotes,
        correctionReason: correctionReason.trim(),
      });
      setCorrectTarget(null);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search delivered orders by customer, address, order #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

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

        <button
          onClick={() => exportOrdersToCsv(filteredOrders, 'daily-dough-delivered-orders')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <FileDown className="w-3.5 h-3.5 text-slate-600" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Delivered Table */}
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
                  onClick={() => handleSort('deliveredAt')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Delivered Date/Time</span>
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
                <th className="py-3 px-4">Address</th>
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
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400 italic">
                    No delivered orders found matching criteria.
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
                    <td className="py-3 px-4 text-emerald-800 font-medium whitespace-nowrap">
                      {formatKarachiDateTime(order.deliveredAt)}
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
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewTarget(order)}
                          title="View Details & Audit"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openCorrectionModal(order)}
                          title="Audited Admin Correction"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Admin Correction Modal */}
      {correctTarget && (
        <Modal
          isOpen={!!correctTarget}
          onClose={() => setCorrectTarget(null)}
          title={`Administrative Correction: ${correctTarget.orderNumber}`}
          description="Delivered orders are read-only. Any corrections must include an explicit audit reason."
          maxWidth="lg"
        >
          <form onSubmit={handleApplyCorrection} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Notice: Frozen Pricing Invariance</p>
              <p>
                Stored price per bag ({formatPKR(correctTarget.pricePerBag)}) and total amount (
                {formatPKR(correctTarget.totalAmount)}) cannot be modified through this correction.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={correctionCustomer}
                onChange={(e) => setCorrectionCustomer(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Address</label>
              <textarea
                rows={2}
                value={correctionAddress}
                onChange={(e) => setCorrectionAddress(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Reason for Correction <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Corrected spelling of customer name as requested by Haji Sb"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setCorrectTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingCorrection || !correctionReason.trim()}
                className="px-5 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm disabled:opacity-50"
              >
                {isSubmittingCorrection ? 'Recording Correction...' : 'Save & Audit'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Details Modal */}
      <OrderDetailsModal
        order={viewTarget}
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
      />
    </div>
  );
};
