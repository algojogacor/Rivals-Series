// RIVALS SERIES SEASON 1 (RS S1) AUTH & PARTICIPANT SERVER ACTIONS
// Covers login, logout, PIN change, and display settings

'use server';

import { revalidatePath } from 'next/cache';
import { InStatement } from '@libsql/client';
import {
  getSession,
  loginParticipant,
  logoutParticipant,
  hashPin,
  verifyPinHash,
  setParticipantSessionCookie,
} from '../auth';
import {
  getDbClient,
  recordAuditEvent,
  executeWithAudit,
  getParticipants,
  getParticipantAuthRecord,
  getSeasonSettings,
} from '../db';
import { ParticipantId } from '../types';

/**
 * 8. Update Logged-In Participant Display Settings (Name, Monogram, and optional Accent Color)
 * Only modifies the currently logged-in participant's own identity.
 */
export async function updateParticipantSettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengubah profil.' };
  }

  const displayName = formData.get('display_name')?.toString()?.trim();
  const monogramRaw = formData.get('monogram')?.toString()?.trim();
  const newColor = formData.get('color')?.toString()?.trim();

  if (!displayName || !monogramRaw) {
    return { error: 'Nama tampilan dan monogram wajib diisi.' };
  }

  const monogram = monogramRaw.toUpperCase().slice(0, 3);
  const oldName = session.participant.display_name;
  const oldMonogram = session.participant.monogram;

  const settings = await getSeasonSettings();
  const isPlayerA = session.participantId === 'participant_a';
  const oldColor = isPlayerA
    ? settings?.player_a_color || '#ffb02e'
    : settings?.player_b_color || '#3ec9e6';
  const opponentColor = isPlayerA
    ? settings?.player_b_color || '#3ec9e6'
    : settings?.player_a_color || '#ffb02e';

  const statements: InStatement[] = [
    {
      sql: "UPDATE participants SET display_name = ?, monogram = ?, updated_at = datetime('now') WHERE id = ?;",
      args: [displayName, monogram, session.participantId],
    },
  ];

  let appliedColor = oldColor;
  if (newColor && newColor !== oldColor) {
    if (newColor.toLowerCase() === opponentColor.toLowerCase()) {
      return { error: 'Warna tersebut sudah dipakai oleh lawan tanding Anda. Pilih warna lain.' };
    }
    appliedColor = newColor;
    statements.push({
      sql: isPlayerA
        ? "UPDATE season_settings SET player_a_color = ?, updated_at = datetime('now') WHERE id = 'season_1';"
        : "UPDATE season_settings SET player_b_color = ?, updated_at = datetime('now') WHERE id = 'season_1';",
      args: [appliedColor],
    });
  }

  await executeWithAudit(statements, {
    actorId: session.participantId,
    actorName: displayName,
    category: 'setup',
    action: 'update_participant_profile',
    entityType: 'participant',
    entityId: session.participantId,
    beforeJson: { displayName: oldName, monogram: oldMonogram, color: oldColor },
    afterJson: { displayName, monogram, color: appliedColor },
    reason:
      appliedColor !== oldColor
        ? `${oldName} memperbarui profil tampilan menjadi "${displayName} (${monogram})" dan warna identitas ke ${appliedColor}.`
        : `${oldName} mengubah profil tampilan dari "${oldName} (${oldMonogram})" menjadi "${displayName} (${monogram})".`,
    ruleArticle: 'Pasal 1 & 50',
  });

  revalidatePath('/');
  revalidatePath('/standings');
  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);

  return { success: true };
}

/**
 * 8B. Change Logged-In Participant's Self-Created PIN
 * Never stores current_pin or new_pin in audit_events!
 */
export async function changeParticipantPinAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengubah PIN keamanan.' };
  }

  const currentPin = formData.get('current_pin')?.toString() || '';
  const newPin = formData.get('new_pin')?.toString()?.trim() || '';
  const confirmPin = formData.get('confirm_pin')?.toString()?.trim() || '';

  if (newPin.length < 4) {
    return { error: 'PIN baru minimal terdiri dari 4 karakter.' };
  }
  if (newPin !== confirmPin) {
    return { error: 'Konfirmasi PIN baru tidak cocok.' };
  }

  const authRecord = await getParticipantAuthRecord(session.participantId);
  if (!authRecord || !authRecord.pin_hash) {
    return { error: 'Akun peserta belum memiliki PIN terdaftar.' };
  }

  if (!verifyPinHash(currentPin, authRecord.pin_hash)) {
    await recordAuditEvent({
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'security',
      action: 'change_pin_failed',
      entityType: 'session',
      entityId: session.participantId,
      afterJson: { outcome: 'invalid_current_pin' },
      reason: `${session.participant.display_name} gagal mengubah PIN keamanan (PIN saat ini tidak sesuai).`,
      ruleArticle: 'Pasal 50',
    });
    return { error: 'PIN saat ini tidak sesuai.' };
  }

  const newPinHash = hashPin(newPin);
  const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19);

  await executeWithAudit(
    [
      {
        sql: `UPDATE participants
              SET pin_hash = ?, pin_updated_at = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now')
              WHERE id = ?;`,
        args: [newPinHash, nowUtc, session.participantId],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'security',
      action: 'change_participant_pin',
      entityType: 'session',
      entityId: session.participantId,
      beforeJson: { pinConfigured: true },
      afterJson: { pinConfigured: true, pinUpdatedAt: nowUtc },
      reason: `${session.participant.display_name} mengubah PIN keamanan akunnya.`,
      ruleArticle: 'Pasal 50',
    }
  );

  // Re-issue signed session cookie with the new pin_updated_at version
  await setParticipantSessionCookie(session.participantId, nowUtc);

  revalidatePath('/control');
  return { success: true };
}

/**
 * 9. Login Participant (Enforces scrypt PIN check, 5-attempt rate limit, and audit logging without secrets)
 */
export async function loginParticipantAction(formData: FormData) {
  const participantId = formData.get('participant_id')?.toString() as ParticipantId;
  const pin = formData.get('pin')?.toString() || '';

  if (!participantId || (participantId !== 'participant_a' && participantId !== 'participant_b')) {
    return { error: 'Pilih peserta yang valid (Pemain A atau Pemain B).' };
  }

  const participants = await getParticipants();
  const targetParticipant = participants.find((p) => p.id === participantId);
  const targetName =
    targetParticipant?.display_name || (participantId === 'participant_a' ? 'Pemain A' : 'Pemain B');

  const result = await loginParticipant(participantId, pin);
  if (!result.ok) {
    try {
      const actionType = result.code === 'locked' ? 'login_locked' : 'login_failed';
      await recordAuditEvent({
        actorId: participantId,
        actorName: targetName,
        category: 'security',
        action: actionType,
        entityType: 'session',
        entityId: participantId,
        afterJson: {
          participantId,
          outcome: result.code || 'failed',
          attemptsUsed: result.attemptsUsed,
          maxAttempts: result.maxAttempts,
          remainingLockMinutes: result.remainingMinutes,
        },
        reason:
          result.code === 'locked'
            ? `Akun ${targetName} dikunci sementara (${result.remainingMinutes || 15} menit) karena melampaui batas percobaan PIN gagal.`
            : result.code === 'not_configured'
            ? `Percobaan masuk ke akun ${targetName} ditolak karena akun belum selesai didaftarkan di Setup.`
            : `Percobaan masuk gagal untuk akun ${targetName} (PIN tidak sesuai · percobaan ${result.attemptsUsed || 1}/${result.maxAttempts || 5}).`,
        ruleArticle: 'Pasal 50',
      });
    } catch (auditErr) {
      console.error('Failed to record login_failed audit event:', auditErr);
    }
    return { error: result.error || 'PIN tidak sesuai.' };
  }

  // Record successful login (NEVER include PIN or session token!)
  await recordAuditEvent({
    actorId: participantId,
    actorName: targetName,
    category: 'security',
    action: 'login_success',
    entityType: 'session',
    entityId: participantId,
    afterJson: {
      participantId,
      outcome: 'authenticated',
    },
    reason: `${targetName} berhasil masuk ke Pusat Kontrol.`,
    ruleArticle: 'Pasal 50',
  });

  revalidatePath('/');
  revalidatePath('/setup');
  revalidatePath('/control');
  return { success: true };
}

/**
 * 10. Logout Participant
 */
export async function logoutParticipantAction() {
  const session = await getSession();
  await logoutParticipant();

  if (session) {
    try {
      await recordAuditEvent({
        actorId: session.participantId,
        actorName: session.participant.display_name,
        category: 'security',
        action: 'logout_session',
        entityType: 'session',
        entityId: session.participantId,
        afterJson: {
          participantId: session.participantId,
          outcome: 'logged_out',
        },
        reason: `${session.participant.display_name} keluar dari sesi Pusat Kontrol.`,
        ruleArticle: 'Pasal 50',
      });
    } catch (err) {
      console.error('Failed to record logout audit event:', err);
    }
  }

  revalidatePath('/');
  revalidatePath('/setup');
  revalidatePath('/control');
  return { success: true };
}
