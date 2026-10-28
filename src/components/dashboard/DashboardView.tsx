import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DateRangeFilterToolbar } from '../common/DateRangeFilterToolbar';
import { MetricCard } from '../common/MetricCard';
import {
  getDateRangeBoundaries,
  calculateDashboardStats,
  aggregateDailyRevenue,
  aggregatePackSizeDistribution,
  aggregateStatusDistribution,
} from '../../lib/calculations';
import { formatPKR, formatPercentage } from '../../lib/formatters';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  Banknote,
  Percent,
  TrendingUp,
  BarChart2,
  PieChart as PieIcon,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { orders, dateFilter, setDateFilter, resetDateFilter } = useApp();

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

  const dailyRevenueData = useMemo(() => {
    return aggregateDailyRevenue(orders, interval);
  }, [orders, interval]);

  const packSizeData = useMemo(() => {
    return aggregatePackSizeDistribution(orders);
  }, [orders]);

  const statusData = useMemo(() => {
    return aggregateStatusDistribution(orders);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Date Filter Toolbar */}
      <DateRangeFilterToolbar
        currentFilter={dateFilter}
        onFilterChange={setDateFilter}
        onReset={resetDateFilter}
      />

      {/* KPI Section 1: Financial & Bag Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Delivered Revenue"
          value={formatPKR(stats.totalDeliveredRevenue)}
          subtitle="Delivered orders strictly by delivery date"
          icon={Banknote}
          variant="emerald"
        />

        <MetricCard
          title="Pending Order Value"
          value={formatPKR(stats.pendingOrderValue)}
          subtitle={`${stats.activeOrders} active deliveries queued`}
          icon={Clock}
          variant="sky"
        />

        <MetricCard
          title="Total Bags Delivered"
          value={`${stats.totalBagsDelivered} bags`}
          subtitle={`Across all delivered orders`}
          icon={PackageCheck}
          variant="emerald"
        />

        <MetricCard
          title="Bags Pending Delivery"
          value={`${stats.totalBagsPending} bags`}
          subtitle="Awaiting fulfillment in mill"
          icon={Package}
          variant="amber"
        />
      </div>

      {/* KPI Section 2: Order Counts & Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Orders Placed"
          value={stats.totalOrders}
          subtitle={`In selected period (${interval.label})`}
          icon={ShoppingBag}
        />

        <MetricCard
          title="Delivered Orders"
          value={stats.deliveredOrders}
          subtitle="Completed deliveries"
          icon={CheckCircle2}
          variant="emerald"
        />

        <MetricCard
          title="Cancelled Orders"
          value={stats.cancelledOrders}
          subtitle={`Value: ${formatPKR(stats.cancelledOrderValue)}`}
          icon={XCircle}
          variant="rose"
        />

        <MetricCard
          title="Completion Rate"
          value={formatPercentage(stats.deliveryCompletionRate)}
          subtitle={`Delivered vs total queue`}
          icon={Percent}
          variant="emerald"
        />
      </div>

      {/* KPI Section 3: Averages & Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Delivered Order Value"
          value={formatPKR(stats.avgDeliveredOrderValue)}
          subtitle="Average revenue per delivery"
          icon={TrendingUp}
        />

        <MetricCard
          title="Avg Bags Per Order"
          value={`${stats.avgBagsPerOrder.toFixed(1)} bags`}
          subtitle="Average order pack volume"
          icon={Layers}
        />

        <MetricCard
          title="Avg Revenue / Delivered Order"
          value={formatPKR(stats.avgRevenuePerDeliveredOrder)}
          subtitle="Qualifying delivered orders"
          icon={Banknote}
        />

        <MetricCard
          title="Cancellation Rate"
          value={formatPercentage(stats.cancellationRate)}
          subtitle="Cancelled / Total created"
          icon={AlertTriangle}
          variant="rose"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Area Chart (spans 2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                Daily Delivered Revenue (PKR)
              </h3>
              <p className="text-xs text-slate-500">
                Revenue trends for deliveries fulfilled in {interval.label}
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              {formatPKR(stats.totalDeliveredRevenue)} Total
            </span>
          </div>

          <div className="h-64 w-full">
            {dailyRevenueData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No delivery revenue records found in selected interval.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    tickFormatter={(val) => `Rs.${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatPKR(Number(val)), 'Revenue']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Order Status Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              Order Status Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-4">All-time order queue composition</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any) => [`${value} orders`, name]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Total Queue Orders:</span>
            <span className="font-bold text-slate-900">{orders.length}</span>
          </div>
        </div>
      </div>

      {/* Pack Size Breakdown Chart & Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bags Sold by Pack Size Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bags Delivered by Pack Size</h3>
              <p className="text-xs text-slate-500">Volume comparison: 5 kg vs 10 kg vs 20 kg</p>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {stats.totalBagsDelivered} Total Delivered
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packSizeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="packSize" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    name === 'bags' ? `${val} Bags` : formatPKR(Number(val)),
                    name === 'bags' ? 'Bags Sold' : 'Delivered Revenue',
                  ]}
                />
                <Bar dataKey="bags" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pack Size Summary Table Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Delivered Revenue Share</h3>
          <p className="text-xs text-slate-500 mb-4">Product contribution to total revenue</p>

          <div className="space-y-3">
            {packSizeData.map((item) => (
              <div key={item.packSizeKg} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800">{item.packSize} Bag</span>
                  <span className="font-semibold text-emerald-700">{formatPKR(item.revenue)}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>{item.bags} bags sold</span>
                  <span>{item.percentage.toFixed(1)}% volume</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
