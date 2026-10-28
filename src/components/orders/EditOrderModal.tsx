import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Order, PackSize } from '../../types';
import { formatPKR } from '../../lib/formatters';
import { AlertTriangle, Info } from 'lucide-react';

interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, isOpen, onClose }) => {
  const { prices, editExistingOrder } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [packSizeKg, setPackSizeKg] = useState<PackSize>(10);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [priceWarningAcknowledged, setPriceWarningAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName);
      setDeliveryAddress(order.deliveryAddress);
      setPackSizeKg(order.packSizeKg);
      setQuantity(order.quantity);
      setNotes(order.notes || '');
      setPriceWarningAcknowledged(false);
      setError(null);
    }
  }, [order]);

  if (!order) return null;

  // Check if pack size or quantity changed from original
  const hasItemChanges = packSizeKg !== order.packSizeKg || quantity !== order.quantity;

  const currentPriceDoc = prices.find((p) => p.packSizeKg === packSizeKg);
  const newPricePerBag = currentPriceDoc?.pricePerBag || order.pricePerBag;
  const recalculatedTotal = newPricePerBag * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (hasItemChanges && !priceWarningAcknowledged) {
      setError('Please acknowledge the price recalculation before saving modifications.');
      return;
    }

    setIsSubmitting(true);
    try {
      await editExistingOrder(order.id, {
        customerName: customerName.trim(),
        deliveryAddress: deliveryAddress.trim(),
        packSizeKg,
        quantity,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Order ${order.orderNumber}`}
      description="Update customer information or order configuration."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
          <input
            type="text"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Address</label>
          <textarea
            required
            rows={2}
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pack Size</label>
            <select
              value={packSizeKg}
              onChange={(e) => {
                setPackSizeKg(Number(e.target.value) as PackSize);
                setPriceWarningAcknowledged(false);
              }}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value={5}>5 kg Bag</option>
              <option value={10}>10 kg Bag</option>
              <option value={20}>20 kg Bag</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => {
                setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1));
                setPriceWarningAcknowledged(false);
              }}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Warning if pack size or quantity changed */}
        {hasItemChanges ? (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-900 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Explicit Warning: Order Total Will Change</span>
            </div>
            <div className="text-xs text-amber-800 space-y-1">
              <p>
                Original Order Snapshot: {order.quantity} × {formatPKR(order.pricePerBag)} ={' '}
                <span className="font-bold">{formatPKR(order.totalAmount)}</span>
              </p>
              <p>
                New Calculated Total: {quantity} × {formatPKR(newPricePerBag)} ={' '}
                <span className="font-bold text-emerald-800">{formatPKR(recalculatedTotal)}</span>
              </p>
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={priceWarningAcknowledged}
                onChange={(e) => setPriceWarningAcknowledged(e.target.checked)}
                className="rounded border-amber-400 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-amber-950">
                I understand and confirm that this order total will be updated to {formatPKR(recalculatedTotal)}
              </span>
            </label>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Current Frozen Snapshot:</span>
            </div>
            <span className="font-bold text-slate-900">
              {order.quantity} × {formatPKR(order.pricePerBag)} = {formatPKR(order.totalAmount)}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (hasItemChanges && !priceWarningAcknowledged)}
            className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Save Order Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
