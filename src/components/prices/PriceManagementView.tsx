import React from 'react';
import { useApp } from '../../context/AppContext';
import { PackSize } from '../../types';
import { PackSizeBadge } from '../common/Badge';
import { formatPKR, formatKarachiDateTime } from '../../lib/formatters';
import { UpdatePriceModal } from './UpdatePriceModal';
import { Tag, TrendingUp, ShieldCheck, History, Edit3 } from 'lucide-react';

export const PriceManagementView: React.FC = () => {
  const { prices, priceHistory, openUpdatePriceModal } = useApp();

  const packSizes: PackSize[] = [5, 10, 20];

  return (
    <div className="space-y-6">
      {/* Top Banner & Safety Explanation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            Active Pack Pricing & Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Current rates charged when creating new orders. All updates create permanent audit log entries.
          </p>
        </div>

        <button
          onClick={() => openUpdatePriceModal(10)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors self-start md:self-auto"
        >
          <Edit3 className="w-4 h-4" />
          <span>Update Price</span>
        </button>
      </div>

      {/* 3 Pack Size Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {packSizes.map((size) => {
          const doc = prices.find((p) => p.packSizeKg === size);
          const rate = doc?.pricePerBag || 0;
          const lastUpdated = doc?.updatedAt;

          return (
            <div
              key={size}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <PackSizeBadge packSize={size} className="text-sm px-2.5 py-1" />
                  <span className="text-xs text-slate-400 font-medium">Standard Pack</span>
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Current Price per Bag
                </div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                  {rate > 0 ? formatPKR(rate) : 'Not Set'}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Updated: {formatKarachiDateTime(lastUpdated)}
                </span>
                <button
                  onClick={() => openUpdatePriceModal(size)}
                  className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  Change Rate
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Snapshot Safety Guarantee Card */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 space-y-1 leading-relaxed">
          <strong className="block font-semibold">Strict Pricing Invariance Architecture</strong>
          <span>
            Every order stores an immutable price snapshot at the moment of order placement. Adjusting the
            5 kg, 10 kg, or 20 kg price today will only apply to orders placed in the future. All active,
            delivered, and cancelled orders retain their exact historical price and calculated totals.
          </span>
        </div>
      </div>

      {/* Price History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Historical Price Audit Log</h3>
          </div>
          <span className="text-xs text-slate-400">{priceHistory.length} recorded rate adjustments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Pack Size</th>
                <th className="py-3 px-4 text-right">Previous Price</th>
                <th className="py-3 px-4 text-right">New Price</th>
                <th className="py-3 px-4 text-right">Change</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Recorded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {priceHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    No historical price updates recorded yet.
                  </td>
                </tr>
              ) : (
                priceHistory.map((h) => {
                  const prev = h.previousPrice;
                  const current = h.newPrice;
                  const diff = prev != null ? current - prev : null;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <PackSizeBadge packSize={h.packSizeKg} />
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {prev != null ? formatPKR(prev) : 'Initial'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatPKR(current)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {diff != null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-semibold ${
                              diff > 0
                                ? 'text-amber-600'
                                : diff < 0
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                            }`}
                          >
                            <TrendingUp className="w-3 h-3" />
                            {diff > 0 ? `+${formatPKR(diff)}` : formatPKR(diff)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {formatKarachiDateTime(h.effectiveAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatKarachiDateTime(h.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mount Update Price Modal */}
      <UpdatePriceModal />
    </div>
  );
};
