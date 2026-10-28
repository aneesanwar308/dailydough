import { format, parseISO } from 'date-fns';

/**
 * Format a numeric amount into PKR currency string, e.g. "Rs. 1,250"
 */
export function formatPKR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rs. 0';
  }
  const formatted = Math.round(amount).toLocaleString('en-PK');
  return `Rs. ${formatted}`;
}

/**
 * Format date string into readable Asia/Karachi local date: "28 Oct 2026"
 */
export function formatKarachiDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

/**
 * Format date string into readable Asia/Karachi local date & time: "28 Oct 2026, 04:30 PM"
 */
export function formatKarachiDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return '—';
  }
}

/**
 * Format date into short time: "04:30 PM"
 */
export function formatKarachiTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'hh:mm a');
  } catch {
    return '—';
  }
}

/**
 * Format percentage string with 1 decimal place: e.g. "94.5%"
 */
export function formatPercentage(rate: number): string {
  if (isNaN(rate)) return '0.0%';
  return `${rate.toFixed(1)}%`;
}
