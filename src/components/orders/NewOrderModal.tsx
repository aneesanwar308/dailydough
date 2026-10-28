import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { PackSize } from '../../types';
import { formatPKR } from '../../lib/formatters';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export const NewOrderModal: React.FC = () => {
  const {
    isNewOrderModalOpen,
    closeNewOrderModal,
    prices,
    createNewOrder,
    openUpdatePriceModal,
  } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [packSizeKg, setPackSizeKg] = useState<PackSize>(10);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isNewOrderModalOpen) {
      setValidationError(null);
    }
  }, [isNewOrderModalOpen]);

  // Current price lookup for selected pack size
  const currentPriceDoc = prices.find((p) => p.packSizeKg === packSizeKg);
  const pricePerBag = currentPriceDoc?.pricePerBag || 0;
  const hasValidPrice = pricePerBag > 0;
  const totalAmount = hasValidPrice && quantity > 0 ? pricePerBag * quantity : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!customerName.trim()) {
      setValidationError('Customer name is required.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setValidationError('Delivery address is required.');
      return;
    }
    if (!hasValidPrice) {
      setValidationError(
        `Cannot create order: No active price configured for ${packSizeKg} kg pack. Please set a price first.`
      );
      return;
    }
    if (quantity <= 0) {
      setValidationError('Quantity must be at least 1 bag.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createNewOrder({
        customerName: customerName.trim(),
        deliveryAddress: deliveryAddress.trim(),
        packSizeKg,
        quantity,
        notes: notes.trim(),
      });

      // Reset fields
      setCustomerName('');
      setDeliveryAddress('');
      setQuantity(1);
      setNotes('');
      closeNewOrderModal();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to create order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isNewOrderModalOpen}
      onClose={closeNewOrderModal}
      title="Create New Atta Order"
      description="Enter customer details and select pack size. Price snapshot will be frozen at current rates."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {validationError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{validationError}</span>
              {!hasValidPrice && (
                <button
                  type="button"
                  onClick={() => {
                    closeNewOrderModal();
                    openUpdatePriceModal(packSizeKg);
                  }}
                  className="block mt-1 font-semibold underline hover:text-rose-900"
                >
                  Configure price for {packSizeKg} kg pack now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Customer Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Customer Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Haji Muhammad Tariq"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Delivery Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Delivery Address <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            placeholder="e.g. House 42, Block C, Model Town, Lahore"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Pack Size & Quantity Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pack Size <span className="text-rose-500">*</span>
            </label>
            <select
              value={packSizeKg}
              onChange={(e) => setPackSizeKg(Number(e.target.value) as PackSize)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value={5}>5 kg Bag</option>
              <option value={10}>10 kg Bag</option>
              <option value={20}>20 kg Bag</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity (Bags) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={500}
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Special Instructions / Delivery Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Ring bell twice, deliver before 5 PM"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Live Calculation & Freeze Notice */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Price Per Bag ({packSizeKg} kg):</span>
            <span className="font-semibold text-slate-900">
              {hasValidPrice ? formatPKR(pricePerBag) : 'Not configured'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Number of Bags:</span>
            <span className="font-semibold text-slate-900">{quantity} bag{quantity > 1 ? 's' : ''}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Total Order Amount:</span>
            <span className="text-lg font-bold text-emerald-700">{formatPKR(totalAmount)}</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>Price Snapshot Guaranteed: Future price changes will not alter this order.</span>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={closeNewOrderModal}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !hasValidPrice}
            className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving Order...' : 'Confirm & Save Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
