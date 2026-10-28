import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'emerald' | 'sky' | 'rose' | 'amber';
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
}) => {
  const variantStyles = {
    default: {
      border: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
    },
    emerald: {
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-700',
    },
    sky: {
      border: 'border-sky-200',
      iconBg: 'bg-sky-50 text-sky-700',
    },
    rose: {
      border: 'border-rose-200',
      iconBg: 'bg-rose-50 text-rose-700',
    },
    amber: {
      border: 'border-amber-200',
      iconBg: 'bg-amber-50 text-amber-700',
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div
      className={`bg-white rounded-xl border ${currentVariant.border} p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg ${currentVariant.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{subtitle}</span>
          {trend && <span className="font-medium text-slate-700">{trend}</span>}
        </div>
      )}
    </div>
  );
};
