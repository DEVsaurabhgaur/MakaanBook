import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupee currency string.
 * e.g. formatINR(12500) → "₹12,500"
 */
export function formatINR(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  if (isNaN(num)) return "₹0";
  return "₹" + num.toLocaleString("en-IN");
}

/**
 * Returns month name for a 1-indexed month number.
 * e.g. getMonthName(3) → "March"
 */
export function getMonthName(month: number): string {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return MONTHS[(month - 1)] ?? "Unknown";
}

/**
 * Returns short month name (e.g. "Jan") for a 1-indexed month number.
 */
export function getShortMonthName(month: number): string {
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return MONTHS[(month - 1)] ?? "?";
}

/**
 * Returns a status badge color class based on payment status string.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "paid": return "bg-emerald-500/10 text-emerald-400";
    case "partial": return "bg-amber-500/10 text-amber-400";
    case "overdue": return "bg-red-600/10 text-red-400";
    case "pending":
    default: return "bg-red-500/10 text-red-400";
  }
}
