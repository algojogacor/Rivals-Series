// RIVALS SERIES SEASON 1 (RS S1) SQUAD UNLOCK VALIDATION & STATE MACHINE LOGIC
// Governs self-unlock and mutual squad unlock request transitions

import { ParticipantId } from './types';

export interface CanSelfUnlockParams {
  myLocked: boolean;
  opponentLocked: boolean;
  openingMatchStatus: string | null | undefined;
}

export function canSelfUnlockSquad(params: CanSelfUnlockParams): { allowed: boolean; reason?: string } {
  if (!params.myLocked) {
    return { allowed: false, reason: 'Skuad Anda belum dalam keadaan terkunci.' };
  }
  if (params.opponentLocked) {
    return {
      allowed: false,
      reason: 'Lawan sudah mengunci skuad. Pembatalan sepihak tidak diizinkan. Gunakan fitur "Ajukan Buka Kunci Skuad Bersama".',
    };
  }
  if (params.openingMatchStatus && params.openingMatchStatus !== 'scheduled') {
    return {
      allowed: false,
      reason: 'Pembatalan kunci skuad tidak diizinkan karena pertandingan pembuka sudah berjalan atau selesai.',
    };
  }
  return { allowed: true };
}

export interface ValidateUnlockRequestParams {
  phase: number;
  reason: string;
  openingMatchStatus: string | null | undefined;
  hasActivePendingRequest: boolean;
}

export function validateUnlockRequest(params: ValidateUnlockRequestParams): { valid: boolean; error?: string } {
  if (params.phase !== 1 && params.phase !== 2) {
    return { valid: false, error: 'Fase kompetisi tidak valid.' };
  }
  const trimmedReason = params.reason?.trim() || '';
  if (!trimmedReason || trimmedReason.length < 5) {
    return { valid: false, error: 'Alasan permohonan buka kunci wajib diisi minimal 5 karakter.' };
  }
  if (params.openingMatchStatus && params.openingMatchStatus !== 'scheduled') {
    return {
      valid: false,
      error: 'Buka kunci tidak dapat diajukan karena pertandingan pembuka fase ini sudah berjalan atau selesai.',
    };
  }
  if (params.hasActivePendingRequest) {
    return {
      valid: false,
      error: 'Sudah ada permohonan buka kunci skuad yang sedang menunggu persetujuan pada fase ini.',
    };
  }
  return { valid: true };
}

export interface ValidateUnlockResponseParams {
  requestStatus: string;
  requesterId: ParticipantId;
  responderId: ParticipantId;
  openingMatchStatus: string | null | undefined;
  approved: boolean;
}

export function validateUnlockResponse(params: ValidateUnlockResponseParams): { valid: boolean; error?: string } {
  if (params.requestStatus !== 'pending_approval') {
    return { valid: false, error: 'Permohonan ini sudah tidak aktif atau sudah diproses sebelumnya.' };
  }
  if (params.requesterId === params.responderId) {
    return { valid: false, error: 'Anda tidak dapat merespons atau menyetujui permohonan yang Anda buat sendiri.' };
  }
  if (params.openingMatchStatus && params.openingMatchStatus !== 'scheduled') {
    return {
      valid: false,
      error: 'Permohonan buka kunci tidak dapat disetujui karena pertandingan pembuka fase ini sudah berjalan atau selesai.',
    };
  }
  return { valid: true };
}
