import React from 'react';
import { OrderStatus, PackSize } from '../../types';

interface BadgeProps {
  status?: OrderStatus;
  packSize?: PackSize;
  children?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  className?: string;
}

export const StatusBadge: React.FC<{ status: OrderStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          Active
        </span>
      );
    case 'delivered':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Delivered
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Cancelled
        </span>
      );
    default:
      return null;
  }
};

export const PackSizeBadge: React.FC<{ packSize: PackSize; className?: string }> = ({
  packSize,
  className = '',
}) => {
  const colors = {
    5: 'bg-amber-50 text-amber-800 border-amber-200',
    10: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    20: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors[packSize] || 'bg-slate-100 text-slate-800'} ${className}`}
    >
      {packSize} kg
    </span>
  );
};
