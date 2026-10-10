import React from 'react';
import { Clock } from 'lucide-react';
import { MatchStatus, ConfirmationStatus } from '@/lib/types';

export type StatusVariant = 
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'disputed'
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'setup'
  | 'provisional';

interface StatusChipProps {
  status?: MatchStatus | StatusVariant;
  confirmationStatus?: ConfirmationStatus;
  label?: string;
  className?: string;
}

export function StatusChip({
  status = 'scheduled',
  confirmationStatus,
  label,
  className = '',
}: StatusChipProps) {
  // Determine variant
  let variant: StatusVariant = 'scheduled';
  let defaultLabel = 'Terjadwal';

  if (status === 'awaiting_confirmation' || confirmationStatus === 'pending') {
    variant = 'awaiting_confirmation';
    defaultLabel = 'Menunggu konfirmasi';
  } else if (status === 'disputed' || confirmationStatus === 'disputed') {
    variant = 'disputed';
    defaultLabel = 'Sengketa';
  } else if (
    status === 'confirmed' ||
    status === 'reconstructed' ||
    status === 'forfeited' ||
    status === 'technical_win' ||
    confirmationStatus === 'confirmed_both' ||
    confirmationStatus === 'admin_auto_confirmed'
  ) {
    variant = 'confirmed';
    defaultLabel = 'Terkonfirmasi';
  } else if (status === 'live' || status === 'in_progress') {
    variant = 'live';
    defaultLabel = 'Berjalan';
  } else if (status === 'setup') {
    variant = 'setup';
    defaultLabel = 'Tahap Persiapan';
  } else if (status === 'completed') {
    variant = 'completed';
    defaultLabel = 'Selesai';
  } else if (status === 'provisional') {
    variant = 'provisional';
    defaultLabel = 'Provisional';
  } else {
    variant = 'scheduled';
    defaultLabel = 'Terjadwal';
  }

  const textLabel = label || defaultLabel;

  switch (variant) {
    case 'awaiting_confirmation':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-[10px] py-[4px] text-[13px] font-medium leading-none rounded-full border border-[var(--text-dim)] text-[var(--text-dim)] ${className}`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          <span>{textLabel}</span>
        </span>
      );

    case 'confirmed':
      return (
        <span
          className={`inline-flex items-center px-[10px] py-[4px] text-[13px] font-semibold leading-none rounded-full text-[var(--ok)] ${className}`}
          style={{ backgroundColor: 'color-mix(in oklab, var(--ok) 16%, transparent)' }}
        >
          {textLabel}
        </span>
      );

    case 'disputed':
      return (
        <span
          className={`inline-flex items-center px-[10px] py-[4px] text-[13px] font-semibold leading-none rounded-full border border-[var(--danger)] text-[var(--danger)] ${className}`}
        >
          {textLabel}
        </span>
      );

    case 'live':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-[10px] py-[4px] text-[13px] font-semibold leading-none rounded-full border border-[var(--p-a)] text-[var(--p-a)] ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--p-a)] animate-pulse" />
          <span>{textLabel}</span>
        </span>
      );

    case 'setup':
      return (
        <span
          className={`inline-flex items-center px-[10px] py-[4px] text-[13px] font-medium leading-none rounded-full border border-[var(--text-dim)] text-[var(--text-dim)] ${className}`}
        >
          {textLabel}
        </span>
      );

    case 'completed':
      return (
        <span
          className={`inline-flex items-center px-[10px] py-[4px] text-[13px] font-semibold leading-none rounded-full border border-[var(--line)] text-[var(--text)] ${className}`}
        >
          {textLabel}
        </span>
      );

    case 'provisional':
      return (
        <span
          className={`inline-flex items-center px-[10px] py-[4px] text-[13px] font-medium leading-none rounded-full border border-[var(--text-dim)] text-[var(--text-dim)] ${className}`}
        >
          {textLabel}
        </span>
      );

    case 'scheduled':
    default:
      return (
        <span
          className={`inline-flex items-center px-[10px] py-[4px] text-[13px] font-medium leading-none rounded-full border border-[var(--line)] text-[var(--text-dim)] ${className}`}
        >
          {textLabel}
        </span>
      );
  }
}
