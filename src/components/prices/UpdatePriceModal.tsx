import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { PackSize } from '../../types';
import { formatPKR } from '../../lib/formatters';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export const UpdatePriceModal: React.FC = () => {
  const {
    isUpdatePriceModalOpen,
    closeUpdatePriceModal,
    selectedPackForPriceModal,
    prices,
    updatePrice,
  } = useApp();

  const [packSizeKg, setPackSizeKg] = useState<PackSize>(selectedPackForPriceModal);
  const [newPrice, setNewPrice] = useState<string>('');
  const [effectiveAt, setEffectiveAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when selectedPackForPriceModal changes
  useEffect(() => {
    if (isUpdatePriceModalOpen) {
      setPackSizeKg(selectedPackForPriceModal);
      const current = prices.find((p) => p.packSizeKg === selectedPackForPriceModal);
      setNewPrice(current ? String(current.pricePerBag) : '');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setEffectiveAt(`${year}-${month}-${day}T${hours}:${minutes}`);
      setError(null);
    }
  }, [isUpdatePriceModalOpen, selectedPackForPriceModal, prices]);

  const currentPriceDoc = prices.find((p) => p.packSizeKg === packSizeKg);
  const currentRate = currentPriceDoc?.pricePerBag || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be a valid positive number in PKR.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePrice({
        packSizeKg,
        newPrice: priceNum,
        effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined,
      });
      closeUpdatePriceModal();
    } catch (err: any) {
      setError(err.message || 'Failed to update price.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isUpdatePriceModalOpen}
      onClose={closeUpdatePriceModal}
      title="Update Pack Price"
      description="Set a new per-bag rate. This new price will apply strictly to future orders."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Pack Size</label>
          <select
            value={packSizeKg}
            onChange={(e) => {
              const sz = Number(e.target.value) as PackSize;
              setPackSizeKg(sz);
              const found = prices.find((p) => p.packSizeKg === sz);
              if (found) setNewPrice(String(found.pricePerBag));
            }}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value={5}>5 kg Flour Pack</option>
            <option value={10}>10 kg Flour Pack</option>
            <option value={20}>20 kg Flour Pack</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              New Price Per Bag (PKR) <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">
              Current: <strong className="text-slate-700">{formatPKR(currentRate)}</strong>
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              Rs.
            </span>
            <input
              type="number"
              min={1}
              step="any"
              required
              placeholder="e.g. 1300"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full text-sm font-semibold rounded-lg border border-slate-300 pl-10 pr-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Effective From (Asia/Karachi) <span className="text-slate-400 font-normal">(defaults to now)</span>
          </label>
          <input
            type="datetime-local"
            value={effectiveAt}
            onChange={(e) => setEffectiveAt(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Permanent Snapshot Safety Notice */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Guaranteed Price Invariance</span>
          </div>
          <p className="text-emerald-800 leading-relaxed">
            Updating the price for this pack size records a historical log entry and activates for all future
            orders. All previously created active, delivered, and cancelled orders retain their original frozen price snapshot.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={closeUpdatePriceModal}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save & Activate Price'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
