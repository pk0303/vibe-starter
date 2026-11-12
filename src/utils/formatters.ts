/**
 * Formatting and Date Utilities for Grant Management
 * File: src/utils/formatters.ts
 */

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr + 'T00:00:00').getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const diffMs = target - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getDeadlineBadgeStyle(daysRemaining: number): {
  text: string;
  className: string;
} {
  if (daysRemaining < 0) {
    return {
      text: `${Math.abs(daysRemaining)}d overdue`,
      className: 'text-rose-400 font-semibold',
    };
  }
  if (daysRemaining === 0) {
    return {
      text: 'Due today',
      className: 'text-amber-400 font-semibold',
    };
  }
  if (daysRemaining <= 7) {
    return {
      text: `${daysRemaining}d left`,
      className: 'text-amber-400 font-medium',
    };
  }
  if (daysRemaining <= 30) {
    return {
      text: `${daysRemaining}d left`,
      className: 'text-neutral-300',
    };
  }
  return {
    text: `${daysRemaining}d left`,
    className: 'text-neutral-500',
  };
}

export function getStageColor(stage: string): {
  dot: string;
  badge: string;
  border: string;
} {
  switch (stage) {
    case 'Prospecting':
      return {
        dot: 'bg-neutral-400',
        badge: 'text-neutral-300',
        border: 'border-neutral-700/60',
      };
    case 'Drafting':
      return {
        dot: 'bg-sky-400',
        badge: 'text-sky-300',
        border: 'border-sky-500/30',
      };
    case 'Submitted':
      return {
        dot: 'bg-indigo-400',
        badge: 'text-indigo-300',
        border: 'border-indigo-500/30',
      };
    case 'Under Review':
      return {
        dot: 'bg-amber-400',
        badge: 'text-amber-300',
        border: 'border-amber-500/30',
      };
    case 'Awarded':
      return {
        dot: 'bg-emerald-400',
        badge: 'text-emerald-300',
        border: 'border-emerald-500/30',
      };
    case 'Rejected':
      return {
        dot: 'bg-rose-400',
        badge: 'text-rose-400',
        border: 'border-rose-500/30',
      };
    default:
      return {
        dot: 'bg-neutral-500',
        badge: 'text-neutral-400',
        border: 'border-neutral-700',
      };
  }
}
