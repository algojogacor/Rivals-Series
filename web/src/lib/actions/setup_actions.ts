// RIVALS SERIES SEASON 1 (RS S1) SETUP SERVER ACTIONS
// Covers season setup, invite tokens, readiness verification, and kickoff

'use server';

import { revalidatePath } from 'next/cache';
import { InStatement } from '@libsql/client';
import {
  getSession,
  generateInviteToken,
  hashInviteToken,
  hashPin,
  INVITE_EXPIRY_HOURS,
  setParticipantSessionCookie,
} from '../auth';
import {
  getDbClient,
  executeWithAudit,
  getParticipants,
  getParticipantAuthRecord,
  getSeasonSettings,
  getLatestSeasonInvite,
  getSeasonInviteByTokenHash,
  getRosterPhaseStatus,
} from '../db';
import { ParticipantId } from '../types';

/**
 * 12A. Setup Step 1 for Player 1 (participant_a — Pemulai Setup):
 * Registers Player 1's own identity, color, and self-created PIN, logs Player 1 in,
 * and issues a one-time expiring invite token for Player 2 (`participant_b`).
 */
export async function setupPlayer1AndCreateInviteAction(formData: FormData) {
  const nameA = formData.get('name_a')?.toString().trim();
  const monogramRaw = formData.get('monogram_a')?.toString().trim();
  const colorA = formData.get('color_a')?.toString().trim() || '#ffb02e';
  const pinA = formData.get('pin_a')?.toString().trim() || '';
  const confirmPinA = formData.get('confirm_pin_a')?.toString().trim() || '';
  const setupKey = formData.get('setup_key')?.toString().trim() || '';

  if (!nameA) {
    return { error: 'Nama tampilan Pemain A wajib diisi.' };
  }

  const monogramA = (monogramRaw || nameA.slice(0, 2)).toUpperCase().slice(0, 3);

  try {
    const [paRecord, pbRecord, existingSettings, session, latestInvite] = await Promise.all([
      getParticipantAuthRecord('participant_a'),
      getParticipantAuthRecord('participant_b'),
      getSeasonSettings(),
      getSession(),
      getLatestSeasonInvite('participant_b'),
    ]);

    if (existingSettings && existingSettings.status !== 'setup') {
      return { error: 'Musim sudah berjalan. Pengaturan awal sudah ditutup.' };
    }

    const isAlreadyLoggedInAsA = session?.participantId === 'participant_a';
    const isInitialUnconfiguredA = !paRecord?.profile_completed;
    const isSetupKeyValid = Boolean(
      process.env.SETUP_KEY && setupKey && setupKey === process.env.SETUP_KEY
    );

    // Authorization check:
    // Must either be logged in as participant_a, OR (if participant_a is not configured yet) provide valid SETUP_KEY
    if (!isAlreadyLoggedInAsA) {
      if (!isInitialUnconfiguredA) {
        return {
          error:
            'Akun Pemain A sudah terdaftar. Silakan masuk menggunakan PIN Pemain A terlebih dahulu untuk mengubah profil.',
        };
      }
      if (!isSetupKeyValid) {
        return {
          error: 'Kunci Setup (SETUP_KEY) tidak valid. Hanya pemulai setup yang memiliki SETUP_KEY yang dapat membuat musim.',
        };
      }
    }

    const currentColorB = existingSettings?.player_b_color || '#3ec9e6';
    if (pbRecord?.profile_completed && colorA.toLowerCase() === currentColorB.toLowerCase()) {
      return {
        error: 'Warna tersebut sudah dipilih oleh Pemain B. Silakan pilih warna identitas lain.',
      };
    }

    // PIN is mandatory when registering for the first time; optional when logged-in Player A updates name/color
    let nextPinHash = paRecord?.pin_hash || null;
    let nextPinUpdatedAt = paRecord?.pin_updated_at || null;
    const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (!paRecord?.profile_completed || pinA.length > 0) {
      if (pinA.length < 4) {
        return { error: 'PIN Pemain A wajib diisi (minimal 4 karakter).' };
      }
      if (confirmPinA && pinA !== confirmPinA) {
        return { error: 'Konfirmasi PIN Pemain A tidak cocok.' };
      }
      nextPinHash = hashPin(pinA);
      nextPinUpdatedAt = nowUtc;
    }

    // If Player B hasn't joined yet and colorA collides with default colorB, auto-shift default colorB so they never match
    const adjustedColorB =
      !pbRecord?.profile_completed && colorA.toLowerCase() === currentColorB.toLowerCase()
        ? colorA.toLowerCase() === '#ffb02e'
          ? '#3ec9e6'
          : '#ffb02e'
        : currentColorB;

    const statements: InStatement[] = [
      {
        sql: `UPDATE participants SET
                display_name = ?,
                monogram = ?,
                is_admin = 0,
                pin_hash = ?,
                pin_updated_at = ?,
                profile_completed = 1,
                failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = datetime('now')
              WHERE id = 'participant_a';`,
        args: [nameA, monogramA, nextPinHash, nextPinUpdatedAt],
      },
      {
        sql: `UPDATE season_settings SET
                player_a_color = ?,
                player_b_color = ?,
                updated_at = datetime('now')
              WHERE id = 'season_1';`,
        args: [colorA, adjustedColorB],
      },
    ];

    // Generate a one-time invite for Player B if Player B hasn't completed their profile yet
    // and there isn't an active pending invite (or if this is initial registration)
    let generatedInviteToken: string | null = null;
    let generatedInviteExpiresAt: string | null = null;
    let generatedInviteHint: string | null = null;

    const hasActivePendingInvite =
      latestInvite &&
      latestInvite.status === 'pending' &&
      new Date(`${latestInvite.expires_at.replace(' ', 'T')}Z`).getTime() > Date.now();

    if (!pbRecord?.profile_completed && (!hasActivePendingInvite || isInitialUnconfiguredA)) {
      const { rawToken, tokenHash, codeHint } = generateInviteToken();
      const inviteId = `inv_${Date.now()}`;
      const expiresAtUtc = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);

      statements.push({
        sql: "UPDATE season_invites SET status = 'revoked' WHERE target_participant_id = 'participant_b' AND status = 'pending';",
        args: [],
      });
      statements.push({
        sql: `INSERT INTO season_invites (
                id, created_by, target_participant_id, token_hash, code_hint, status, expires_at, created_at
              ) VALUES (?, 'participant_a', 'participant_b', ?, ?, 'pending', ?, datetime('now'));`,
        args: [inviteId, tokenHash, codeHint, expiresAtUtc],
      });

      generatedInviteToken = rawToken;
      generatedInviteExpiresAt = expiresAtUtc;
      generatedInviteHint = codeHint;
    }

    await executeWithAudit(statements, {
      actorId: 'participant_a',
      actorName: nameA,
      category: 'setup',
      action: isInitialUnconfiguredA ? 'setup_player_a_and_invite' : 'update_player_a_setup',
      entityType: 'participant',
      entityId: 'participant_a',
      beforeJson: {
        displayName: paRecord?.display_name || 'Pemain A',
        monogram: paRecord?.monogram || 'PA',
        color: existingSettings?.player_a_color || '#ffb02e',
        profileCompleted: Boolean(paRecord?.profile_completed),
      },
      afterJson: {
        displayName: nameA,
        monogram: monogramA,
        color: colorA,
        profileCompleted: true,
        inviteIssuedForPlayerB: Boolean(generatedInviteToken),
        inviteCodeHint: generatedInviteHint || latestInvite?.code_hint || null,
        inviteExpiresAt: generatedInviteExpiresAt || latestInvite?.expires_at || null,
      },
      reason: generatedInviteToken
        ? `${nameA} memulai setup musim, mendaftarkan identitas & PIN Pemain A (${monogramA}, ${colorA}), dan membuat undangan sekali pakai untuk Pemain B.`
        : `${nameA} memperbarui identitas Pemain A (${monogramA}, ${colorA}) pada Setup Musim.`,
      ruleArticle: 'Pasal 1 & 50',
    });

    // Automatically log Player A into their session cookie
    await setParticipantSessionCookie('participant_a', nextPinUpdatedAt);

    revalidatePath('/');
    revalidatePath('/setup');
    revalidatePath('/control');

    return {
      success: true,
      inviteToken: generatedInviteToken,
      inviteExpiresAt: generatedInviteExpiresAt || latestInvite?.expires_at || null,
      inviteCodeHint: generatedInviteHint || latestInvite?.code_hint || null,
    };
  } catch (err: any) {
    console.error('setupPlayer1AndCreateInviteAction error:', err);
    return { error: `Gagal menyimpan identitas Pemain A: ${err.message}` };
  }
}

/**
 * 12B. Regenerate a One-Time Invite Token for Player 2 (`participant_b`)
 * Only callable by logged-in Player 1 while season is in 'setup' mode and Player 2 has not completed setup.
 */
export async function regeneratePlayer2InviteAction() {
  const session = await getSession();
  if (!session || session.participantId !== 'participant_a') {
    return { error: 'Hanya Pemain A (pemulai setup) yang dapat membuat ulang tautan undangan untuk Pemain B.' };
  }

  const [pbRecord, settings] = await Promise.all([
    getParticipantAuthRecord('participant_b'),
    getSeasonSettings(),
  ]);

  if (settings && settings.status !== 'setup') {
    return { error: 'Musim sudah berjalan, undangan baru tidak diperlukan.' };
  }

  if (pbRecord?.profile_completed) {
    return { error: 'Pemain B sudah menyelesaikan pendaftaran akunnya.' };
  }

  const { rawToken, tokenHash, codeHint } = generateInviteToken();
  const inviteId = `inv_${Date.now()}`;
  const expiresAtUtc = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  await executeWithAudit(
    [
      {
        sql: "UPDATE season_invites SET status = 'revoked' WHERE target_participant_id = 'participant_b' AND status = 'pending';",
        args: [],
      },
      {
        sql: `INSERT INTO season_invites (
                id, created_by, target_participant_id, token_hash, code_hint, status, expires_at, created_at
              ) VALUES (?, 'participant_a', 'participant_b', ?, ?, 'pending', ?, datetime('now'));`,
        args: [inviteId, tokenHash, codeHint, expiresAtUtc],
      },
    ],
    {
      actorId: 'participant_a',
      actorName: session.participant.display_name,
      category: 'setup',
      action: 'create_season_invite',
      entityType: 'season_settings',
      entityId: inviteId,
      afterJson: {
        targetParticipantId: 'participant_b',
        codeHint,
        expiresAt: expiresAtUtc,
        status: 'pending',
      },
      reason: `${session.participant.display_name} membuat ulang tautan undangan sekali pakai untuk Pemain B (${codeHint}, berlaku ${INVITE_EXPIRY_HOURS} jam).`,
      ruleArticle: 'Pasal 1 & 50',
    }
  );

  revalidatePath('/setup');
  return {
    success: true,
    inviteToken: rawToken,
    inviteExpiresAt: expiresAtUtc,
    inviteCodeHint: codeHint,
  };
}

/**
 * 12C. Inspect & Validate a One-Time Invite Token (Marks & audits expiration if expired)
 */
export async function validateInviteTokenServer(rawToken: string): Promise<{
  valid: boolean;
  status: 'valid' | 'used' | 'expired' | 'revoked' | 'invalid';
  error?: string;
  inviteId?: string;
  expiresAt?: string;
  codeHint?: string;
}> {
  if (!rawToken || !rawToken.trim()) {
    return { valid: false, status: 'invalid', error: 'Kode undangan kosong.' };
  }

  const tokenHash = hashInviteToken(rawToken);
  const invite = await getSeasonInviteByTokenHash(tokenHash);

  if (!invite) {
    return {
      valid: false,
      status: 'invalid',
      error: 'Kode atau tautan undangan tidak ditemukan. Pastikan tautan sudah benar.',
    };
  }

  if (invite.status === 'used') {
    return {
      valid: false,
      status: 'used',
      error:
        'Undangan sekali pakai ini sudah pernah digunakan oleh Pemain B. Silakan masuk melalui halaman Login dengan PIN Anda.',
    };
  }

  if (invite.status === 'revoked') {
    return {
      valid: false,
      status: 'revoked',
      error:
        'Undangan ini sudah tidak berlaku karena Pemain A telah membuat undangan baru. Gunakan tautan undangan terbaru.',
    };
  }

  const expiresMs = new Date(`${invite.expires_at.replace(' ', 'T')}Z`).getTime();
  if (invite.status === 'expired' || (!isNaN(expiresMs) && expiresMs <= Date.now())) {
    if (invite.status === 'pending') {
      try {
        await executeWithAudit(
          [
            {
              sql: "UPDATE season_invites SET status = 'expired' WHERE id = ?;",
              args: [invite.id],
            },
          ],
          {
            actorId: 'participant_b',
            actorName: 'Pemain B',
            category: 'security',
            action: 'invite_expired',
            entityType: 'season_settings',
            entityId: invite.id,
            beforeJson: { status: 'pending', expiresAt: invite.expires_at, codeHint: invite.code_hint },
            afterJson: { status: 'expired', expiresAt: invite.expires_at, codeHint: invite.code_hint },
            reason: `Undangan sekali pakai untuk Pemain B (${invite.code_hint}) tercatat kedaluwarsa saat diakses.`,
            ruleArticle: 'Pasal 50',
          }
        );
      } catch (err) {
        console.error('Failed to mark invite expired:', err);
      }
    }
    return {
      valid: false,
      status: 'expired',
      error: 'Undangan sekali pakai ini telah kedaluwarsa. Minta Pemain A membuat undangan baru di halaman Setup.',
    };
  }

  return {
    valid: true,
    status: 'valid',
    inviteId: invite.id,
    expiresAt: invite.expires_at,
    codeHint: invite.code_hint,
  };
}

/**
 * 12D. Setup Step 1 for Player 2 (`participant_b` — Redeeming One-Time Invite or Updating Own Profile in Setup)
 */
export async function setupPlayer2WithInviteAction(formData: FormData) {
  const nameB = formData.get('name_b')?.toString().trim();
  const monogramRaw = formData.get('monogram_b')?.toString().trim();
  const colorB = formData.get('color_b')?.toString().trim() || '#3ec9e6';
  const pinB = formData.get('pin_b')?.toString().trim() || '';
  const confirmPinB = formData.get('confirm_pin_b')?.toString().trim() || '';
  const inviteToken = formData.get('invite_token')?.toString().trim() || '';

  if (!nameB) {
    return { error: 'Nama tampilan Pemain B wajib diisi.' };
  }

  const monogramB = (monogramRaw || nameB.slice(0, 2)).toUpperCase().slice(0, 3);

  try {
    const [pbRecord, existingSettings, session] = await Promise.all([
      getParticipantAuthRecord('participant_b'),
      getSeasonSettings(),
      getSession(),
    ]);

    if (existingSettings && existingSettings.status !== 'setup') {
      return { error: 'Musim sudah berjalan. Pendaftaran awal sudah ditutup.' };
    }

    const isAlreadyLoggedInAsB = session?.participantId === 'participant_b';
    let verifiedInviteId: string | null = null;
    let verifiedCodeHint: string | null = null;

    if (!isAlreadyLoggedInAsB) {
      const inviteCheck = await validateInviteTokenServer(inviteToken);
      if (!inviteCheck.valid || !inviteCheck.inviteId) {
        return { error: inviteCheck.error || 'Undangan tidak valid atau sudah kedaluwarsa.' };
      }
      verifiedInviteId = inviteCheck.inviteId;
      verifiedCodeHint = inviteCheck.codeHint || null;
    }

    const colorA = existingSettings?.player_a_color || '#ffb02e';
    if (colorB.toLowerCase() === colorA.toLowerCase()) {
      return {
        error: 'Warna Pemain B tidak boleh sama dengan warna Pemain A. Pilih warna identitas yang berbeda.',
      };
    }

    let nextPinHash = pbRecord?.pin_hash || null;
    let nextPinUpdatedAt = pbRecord?.pin_updated_at || null;
    const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (!pbRecord?.profile_completed || pinB.length > 0) {
      if (pinB.length < 4) {
        return { error: 'PIN Pemain B wajib diisi (minimal 4 karakter).' };
      }
      if (confirmPinB && pinB !== confirmPinB) {
        return { error: 'Konfirmasi PIN Pemain B tidak cocok.' };
      }
      nextPinHash = hashPin(pinB);
      nextPinUpdatedAt = nowUtc;
    }

    const statements: InStatement[] = [
      {
        sql: `UPDATE participants SET
                display_name = ?,
                monogram = ?,
                is_admin = 0,
                pin_hash = ?,
                pin_updated_at = ?,
                profile_completed = 1,
                failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = datetime('now')
              WHERE id = 'participant_b';`,
        args: [nameB, monogramB, nextPinHash, nextPinUpdatedAt],
      },
      {
        sql: `UPDATE season_settings SET
                player_b_color = ?,
                updated_at = datetime('now')
              WHERE id = 'season_1';`,
        args: [colorB],
      },
    ];

    if (verifiedInviteId) {
      statements.push({
        sql: "UPDATE season_invites SET status = 'used', used_at = datetime('now') WHERE id = ? AND status = 'pending';",
        args: [verifiedInviteId],
      });
    }

    await executeWithAudit(statements, {
      actorId: 'participant_b',
      actorName: nameB,
      category: 'setup',
      action: verifiedInviteId ? 'use_season_invite' : 'update_player_b_setup',
      entityType: 'participant',
      entityId: 'participant_b',
      beforeJson: {
        displayName: pbRecord?.display_name || 'Pemain B',
        monogram: pbRecord?.monogram || 'PB',
        color: existingSettings?.player_b_color || '#3ec9e6',
        profileCompleted: Boolean(pbRecord?.profile_completed),
      },
      afterJson: {
        displayName: nameB,
        monogram: monogramB,
        color: colorB,
        profileCompleted: true,
        inviteRedeemed: Boolean(verifiedInviteId),
        inviteCodeHint: verifiedCodeHint,
      },
      reason: verifiedInviteId
        ? `${nameB} menggunakan undangan sekali pakai (${verifiedCodeHint}) dan mendaftarkan identitas serta PIN Pemain B (${monogramB}, ${colorB}).`
        : `${nameB} memperbarui identitas Pemain B (${monogramB}, ${colorB}) pada Setup Musim.`,
      ruleArticle: 'Pasal 1 & 50',
    });

    // Automatically log Player B into their session cookie on their device
    await setParticipantSessionCookie('participant_b', nextPinUpdatedAt);

    revalidatePath('/');
    revalidatePath('/setup');
    revalidatePath('/control');

    return { success: true };
  } catch (err: any) {
    console.error('setupPlayer2WithInviteAction error:', err);
    return { error: `Gagal menyimpan identitas Pemain B: ${err.message}` };
  }
}

/**
 * Legacy compatibility wrapper (delegates to the appropriate player action based on formData)
 */
export async function saveSetupStep1Action(formData: FormData) {
  const role = formData.get('setup_role')?.toString();
  if (role === 'participant_b') {
    return setupPlayer2WithInviteAction(formData);
  }
  return setupPlayer1AndCreateInviteAction(formData);
}

/**
 * 13. Test System Readiness Checklist (Runs automatically in Setup Wizard)
 */
export async function testSystemReadinessAction() {
  const results = {
    dbConnection: false,
    tablesCreated: false,
    matchesSeeded: false,
    settingsSaved: false,
    playersSynced: false,
    playersCount: 0,
    errorMessage: null as string | null,
  };

  try {
    const db = getDbClient();

    // Check 1: Database connection
    await db.execute('SELECT 1 as connected;');
    results.dbConnection = true;

    // Check 2: Core tables exist
    const tablesRes = await db.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = new Set(tablesRes.rows.map((r) => String(r.name)));
    const requiredTables = [
      'participants',
      'season_settings',
      'matches',
      'audit_events',
      'efootball_players',
      'season_invites',
    ];
    results.tablesCreated = requiredTables.every((t) => tableNames.has(t));

    // Check 3: Exactly 20 matches exist
    const matchesRes = await db.execute('SELECT count(*) as count FROM matches;');
    const count = Number(matchesRes.rows[0]?.count || 0);
    results.matchesSeeded = count === 20;

    // Check 4: Season settings record exists
    const settingsRes = await db.execute("SELECT id FROM season_settings WHERE id = 'season_1';");
    results.settingsSaved = settingsRes.rows.length > 0;

    // Check 5: eFootball players lookup table synced
    if (tableNames.has('efootball_players')) {
      const playersRes = await db.execute('SELECT count(*) as count FROM efootball_players;');
      const pCount = Number(playersRes.rows[0]?.count || 0);
      results.playersCount = pCount;
      results.playersSynced = pCount > 0;
    }

    return { success: true, results };
  } catch (err: any) {
    console.error('testSystemReadinessAction error:', err);
    results.errorMessage =
      'Server database tidak terjangkau, kemungkinan masalah jaringan atau DNS. Mode development dapat memakai database lokal.';
    return { success: false, results };
  }
}

/**
 * 14. Complete Season Setup & Start Season ('setup' -> 'live')
 * Enforces rule: Season can ONLY become 'live' after:
 * 1. Caller is logged in as Participant A or Participant B
 * 2. Both Participant A and Participant B have completed their account & PIN registration
 * 3. Both Participant A and Participant B have locked their Phase 1 squads
 */
export async function completeSeasonSetupAction() {
  try {
    const [session, participants, phase1Status, currentSettings] = await Promise.all([
      getSession(),
      getParticipants(),
      getRosterPhaseStatus(1),
      getSeasonSettings(),
    ]);

    if (!session) {
      return { error: 'Anda harus masuk sebagai peserta resmi untuk meresmikan dimulainya musim.' };
    }

    const pA = participants.find((p) => p.id === 'participant_a');
    const pB = participants.find((p) => p.id === 'participant_b');

    if (!pA?.profile_completed || !pB?.profile_completed) {
      const missingProfiles: string[] = [];
      if (!pA?.profile_completed) missingProfiles.push('Akun Pemain A belum terdaftar');
      if (!pB?.profile_completed) missingProfiles.push('Akun Pemain B belum bergabung lewat undangan');
      return {
        error: `Musim belum dapat dimulai: kedua pemain wajib menyelesaikan pendaftaran akun & PIN (${missingProfiles.join(', ')}).`,
      };
    }

    if (!phase1Status.both_locked) {
      const missing: string[] = [];
      if (phase1Status.pa_locked !== 1) missing.push(`Skuad ${pA.display_name} belum dikunci`);
      if (phase1Status.pb_locked !== 1) missing.push(`Skuad ${pB.display_name} belum dikunci`);
      return {
        error: `Musim belum dapat dimulai: kedua skuad wajib dikunci terlebih dahulu (${missing.join(', ')} · Pasal 14 ayat 2).`,
      };
    }

    const actorId: ParticipantId = session.participantId;
    const actorName = session.participant.display_name;

    await executeWithAudit(
      [
        {
          sql: "UPDATE season_settings SET status = 'live', updated_at = datetime('now') WHERE id = 'season_1';",
          args: [],
        },
      ],
      {
        actorId,
        actorName,
        category: 'setup',
        action: 'start_season',
        entityType: 'season_settings',
        entityId: 'season_1',
        beforeJson: { status: currentSettings?.status || 'setup', paLocked: true, pbLocked: true },
        afterJson: { status: 'live', paLocked: true, pbLocked: true },
        reason: `${actorName} meresmikan dimulainya musim Rivals Series Season 1 setelah kedua pemain terdaftar dan kedua skuad Fase 1 terkunci.`,
        ruleArticle: 'Pasal 1, 4 & 14',
      }
    );

    revalidatePath('/');
    revalidatePath('/setup');
    revalidatePath('/control');
    return { success: true };
  } catch (err: any) {
    console.error('completeSeasonSetupAction error:', err);
    return { error: `Gagal memulai musim: ${err.message}` };
  }
}
