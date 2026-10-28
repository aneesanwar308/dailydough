import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Order } from '../../types';
import { StatusBadge, PackSizeBadge } from '../common/Badge';
import { formatPKR, formatKarachiDateTime } from '../../lib/formatters';
import { ShieldCheck, Clock, MapPin, User, FileText, History } from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { auditLogs } = useApp();

  if (!order) return null;

  // Filter audit logs matching this order
  const relatedLogs = auditLogs.filter(
    (log) =>
      log.entityId === order.orderNumber ||
      log.details?.orderNumber === order.orderNumber ||
      log.entityId === order.id
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order Details: ${order.orderNumber}`}
      description="Permanent price snapshot and lifecycle audit history."
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Top Status & Summary Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <PackSizeBadge packSize={order.packSizeKg} />
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Frozen Total Amount</div>
            <div className="text-xl font-bold text-emerald-700">{formatPKR(order.totalAmount)}</div>
          </div>
        </div>

        {/* Customer & Delivery Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" /> Customer Information
            </h4>
            <div>
              <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{order.deliveryAddress}</span>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Stored Pricing Snapshot
            </h4>
            <div className="text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Pack Size:</span>
                <span className="font-medium text-slate-900">{order.packSizeKg} kg</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="font-medium text-slate-900">{order.quantity} bag(s)</span>
              </div>
              <div className="flex justify-between">
                <span>Frozen Price per Bag:</span>
                <span className="font-semibold text-slate-900">{formatPKR(order.pricePerBag)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-emerald-700">{formatPKR(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps & Status Notes */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <h4 className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Lifecycle Timestamps
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="text-slate-400">Created:</span>{' '}
              <span className="font-medium text-slate-800">{formatKarachiDateTime(order.createdAt)}</span>
            </div>
            {order.deliveredAt && (
              <div>
                <span className="text-slate-400">Delivered:</span>{' '}
                <span className="font-medium text-emerald-800">
                  {formatKarachiDateTime(order.deliveredAt)}
                </span>
              </div>
            )}
            {order.cancelledAt && (
              <div>
                <span className="text-slate-400">Cancelled:</span>{' '}
                <span className="font-medium text-rose-800">
                  {formatKarachiDateTime(order.cancelledAt)}
                </span>
              </div>
            )}
            <div>
              <span className="text-slate-400">Last Updated:</span>{' '}
              <span className="font-medium text-slate-800">{formatKarachiDateTime(order.updatedAt)}</span>
            </div>
          </div>

          {order.cancellationReason && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-rose-700">
              <span className="font-semibold">Cancellation Reason:</span> {order.cancellationReason}
            </div>
          )}

          {order.notes && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-slate-700 flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800">Notes:</strong> {order.notes}
              </span>
            </div>
          )}
        </div>

        {/* Audit Trail Section */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" /> Audit Log Entries
          </h4>
          {relatedLogs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No explicit audit records logged for this order.</p>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs max-h-40 overflow-y-auto">
              {relatedLogs.map((log) => (
                <div key={log.id} className="p-2.5 bg-white flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{log.actionType}</span>
                    <span className="text-slate-400 ml-2">
                      {formatKarachiDateTime(log.timestamp)}
                    </span>
                  </div>
                  <pre className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded max-w-[200px] truncate">
                    {JSON.stringify(log.details)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
