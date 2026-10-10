import { MatchStatus, ResultType, ConfirmationStatus } from '@/lib/types';
import { Clock, CheckCircle2, AlertTriangle, RefreshCw, XCircle, ShieldAlert, Calendar } from 'lucide-react';

interface StatusBadgeProps {
  status: MatchStatus;
  resultType?: ResultType;
  confirmationStatus?: ConfirmationStatus;
  className?: string;
}

export function StatusBadge({ status, resultType, confirmationStatus, className = '' }: StatusBadgeProps) {
  if (status === 'awaiting_confirmation' || confirmationStatus === 'pending') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        Menunggu Konfirmasi
      </span>
    );
  }

  if (status === 'disputed' || confirmationStatus === 'disputed') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        Disengketakan (Disputed)
      </span>
    );
  }

  if (resultType === 'forfeit_pa' || resultType === 'forfeit_pb' || status === 'forfeited') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-purple-400" />
        Kekalahan Administratif (Forfeit 0–3)
      </span>
    );
  }

  if (resultType === 'double_forfeit') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-purple-600/40 bg-purple-600/10 text-purple-300 ${className}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
        Double Forfeit (0 Poin)
      </span>
    );
  }

  if (resultType === 'technical_win_pa' || resultType === 'technical_win_pb' || status === 'technical_win') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
        Technical Win (Undian Koin)
      </span>
    );
  }

  if (status === 'reconstructed' || resultType === 'reconstructed') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 ${className}`}>
        <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
        Hasil Rekonstruksi
      </span>
    );
  }

  if (status === 'confirmed') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        Disahkan Resmi
      </span>
    );
  }

  if (status === 'in_progress') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-amber-400/40 bg-amber-400/10 text-amber-300 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        Sedang Berlangsung
      </span>
    );
  }

  // Default Scheduled
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-slate-700 bg-slate-800/40 text-slate-400 ${className}`}>
      <Calendar className="w-3.5 h-3.5 text-slate-500" />
      Terjadwal (Fleksibel)
    </span>
  );
}
