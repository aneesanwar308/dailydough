import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DateRangeFilterToolbar } from '../common/DateRangeFilterToolbar';
import {
  getDateRangeBoundaries,
  calculateDashboardStats,
  aggregateTopCustomers,
  aggregatePackSizeDistribution,
  aggregateDailyRevenue,
} from '../../lib/calculations';
import { formatPKR, formatPercentage } from '../../lib/formatters';
import { exportOrdersToCsv, exportSummaryToCsv } from '../../lib/exportCsv';
import {
  FileSpreadsheet,
  Download,
  Users,
  Calendar,
  Layers,
  ArrowUpDown,
  Building2,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, dateFilter, setDateFilter, resetDateFilter } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'customers' | 'daily' | 'pack-sizes'>(
    'customers'
  );

  const interval = useMemo(() => {
    return getDateRangeBoundaries(
      dateFilter.preset,
      dateFilter.startDate,
      dateFilter.endDate
    );
  }, [dateFilter]);

  const stats = useMemo(() => {
    return calculateDashboardStats(orders, interval);
  }, [orders, interval]);

  const topCustomers = useMemo(() => {
    return aggregateTopCustomers(orders);
  }, [orders]);

  const packSizeData = useMemo(() => {
    return aggregatePackSizeDistribution(orders);
  }, [orders]);

  const dailyRevenueData = useMemo(() => {
    return aggregateDailyRevenue(orders, interval);
  }, [orders, interval]);

  const handleExportFilteredOrders = () => {
    exportOrdersToCsv(orders, `daily-dough-report-${dateFilter.preset}`);
  };

  const handleExportSummaryMetrics = () => {
    exportSummaryToCsv(stats, interval.label, `daily-dough-kpi-summary`);
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Toolbar */}
      <DateRangeFilterToolbar
        currentFilter={dateFilter}
        onFilterChange={setDateFilter}
        onReset={resetDateFilter}
      />

      {/* Export & Summary Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Financial & Operational Reports ({interval.label})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate and download business summaries, customer purchase rankings, and volume audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportSummaryMetrics}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Summary CSV</span>
          </button>

          <button
            onClick={handleExportFilteredOrders}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export All Orders CSV</span>
          </button>
        </div>
      </div>

      {/* Key Metric Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">Delivered Revenue</span>
          <h4 className="text-xl font-bold text-emerald-700 mt-1">{formatPKR(stats.totalDeliveredRevenue)}</h4>
          <span className="text-[11px] text-slate-400 mt-1 block">
            From {stats.deliveredOrders} delivered orders
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">Pending Order Value</span>
          <h4 className="text-xl font-bold text-sky-700 mt-1">{formatPKR(stats.pendingOrderValue)}</h4>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats.activeOrders} orders awaiting dispatch
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">Cancelled Order Value</span>
          <h4 className="text-xl font-bold text-rose-700 mt-1">{formatPKR(stats.cancelledOrderValue)}</h4>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Isolated from delivered revenue
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500">Delivery Completion Rate</span>
          <h4 className="text-xl font-bold text-slate-900 mt-1">
            {formatPercentage(stats.deliveryCompletionRate)}
          </h4>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cancellation: {formatPercentage(stats.cancellationRate)}
          </span>
        </div>
      </div>

      {/* Sub-Navigation for Detailed Tables */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveReportTab('customers')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeReportTab === 'customers'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Top Customers by Revenue & Orders</span>
        </button>

        <button
          onClick={() => setActiveReportTab('daily')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeReportTab === 'daily'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Revenue Breakdown</span>
        </button>

        <button
          onClick={() => setActiveReportTab('pack-sizes')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeReportTab === 'pack-sizes'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pack Size Distribution Report</span>
        </button>
      </div>

      {/* Table 1: Top Customers */}
      {activeReportTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Customer Lifetime Rankings</h3>
              <p className="text-xs text-slate-500">Sorted by total delivered revenue</p>
            </div>
            <span className="text-xs text-slate-400">{topCustomers.length} unique customers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4 text-right">Total Orders</th>
                  <th className="py-3 px-4 text-right">Delivered Orders</th>
                  <th className="py-3 px-4 text-right">Total Bags Delivered</th>
                  <th className="py-3 px-4 text-right">Delivered Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCustomers.map((c, index) => (
                  <tr key={c.customerName} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-400">{index + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.customerName}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{c.totalOrders}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-medium">
                      {c.deliveredOrders}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">{c.totalBags}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatPKR(c.deliveredRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table 2: Daily Breakdown */}
      {activeReportTab === 'daily' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Delivery Log ({interval.label})</h3>
              <p className="text-xs text-slate-500">Delivered revenue aggregated by delivery date</p>
            </div>
            <span className="text-xs text-slate-400">{dailyRevenueData.length} active delivery dates</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Delivered Orders</th>
                  <th className="py-3 px-4 text-right">Bags Delivered</th>
                  <th className="py-3 px-4 text-right">Daily Delivered Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyRevenueData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400 italic">
                      No delivery data in this period.
                    </td>
                  </tr>
                ) : (
                  dailyRevenueData.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{d.date}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{d.ordersCount}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">{d.bags}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatPKR(d.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table 3: Pack Sizes Breakdown */}
      {activeReportTab === 'pack-sizes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pack Size Sales Performance</h3>
              <p className="text-xs text-slate-500">All-time volume and revenue breakdown</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Pack Size</th>
                  <th className="py-3 px-4 text-right">Bags Delivered</th>
                  <th className="py-3 px-4 text-right">Volume Share (%)</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packSizeData.map((p) => (
                  <tr key={p.packSizeKg} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.packSize} Bag</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{p.bags} bags</td>
                    <td className="py-3 px-4 text-right text-slate-600">{p.percentage.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatPKR(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
