import React, { useState } from 'react';
import { Calendar, RotateCcw, ChevronDown } from 'lucide-react';
import { DateFilter, DateRangePreset } from '../../types';
import { getDateRangeBoundaries } from '../../lib/calculations';
import { formatKarachiDate } from '../../lib/formatters';

interface DateRangeFilterToolbarProps {
  currentFilter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
  onReset: () => void;
}

export const DateRangeFilterToolbar: React.FC<DateRangeFilterToolbarProps> = ({
  currentFilter,
  onFilterChange,
  onReset,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStart, setCustomStart] = useState(
    currentFilter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState(
    currentFilter.endDate || new Date().toISOString().slice(0, 10)
  );

  const presets: Array<{ id: DateRangePreset; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7', label: 'Last 7 Days' },
    { id: 'last30', label: 'Last 30 Days' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'lastWeek', label: 'Last Week' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'thisYear', label: 'This Year' },
  ];

  const boundaries = getDateRangeBoundaries(
    currentFilter.preset,
    currentFilter.startDate,
    currentFilter.endDate
  );

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      preset: 'custom',
      startDate: customStart,
      endDate: customEnd,
    });
    setShowCustomModal(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Preset Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        {presets.map((p) => {
          const isActive = currentFilter.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onFilterChange({ preset: p.id })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Custom Range Button */}
        <button
          onClick={() => setShowCustomModal(!showCustomModal)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
            currentFilter.preset === 'custom'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Custom</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Selected Period Badge & Reset */}
      <div className="flex items-center gap-2 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
          <span className="font-semibold text-emerald-800">{boundaries.label}:</span>
          <span>
            {formatKarachiDate(boundaries.start)} – {formatKarachiDate(boundaries.end)}
          </span>
        </div>

        <button
          onClick={onReset}
          title="Reset date filter to Last 30 Days"
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Custom Range Dropdown / Modal */}
      {showCustomModal && (
        <div className="absolute top-full mt-2 left-4 md:left-auto right-4 md:right-8 z-30 bg-white border border-slate-200 rounded-xl p-4 shadow-xl max-w-sm">
          <h4 className="text-xs font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" /> Select Custom Date Range
          </h4>
          <form onSubmit={handleCustomApply} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
              >
                Apply Range
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
