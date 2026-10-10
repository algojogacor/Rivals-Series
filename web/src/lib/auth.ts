// RIVALS SERIES SEASON 1 (RS S1) EQUAL-PEER AUTHENTICATION & INVITE MODULE
// Implements:
// 1. Equal-peer accounts (no permanent admin; both participants have equal rights)
// 2. Cryptographic PIN hashing via Node.js scrypt + timingSafeEqual (never stored in env vars)
// 3. Per-participant login rate limiting (max 5 failed attempts -> 15 minute lockout)
// 4. HMAC-SHA256 signed HTTP-only session cookies bound to participant's pin_updated_at
// 5. One-time expiring invite tokens for the second participant in /setup

import crypto from 'crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { ParticipantId, Participant } from './types';
import { getDbClient, getParticipantAuthRecord, getParticipants } from './db';

const SESSION_COOKIE_NAME = 'rs_s1_session_participant';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;
export const INVITE_EXPIRY_HOURS = 48;

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
};
const SCRYPT_KEYLEN = 64;

export interface AuthSession {
  participantId: ParticipantId;
  participant: Participant;
  isAdmin: boolean; // Always false under the equal-peer account model; retained for prop compatibility
}

function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SETUP_KEY ||
    process.env.TURSO_AUTH_TOKEN ||
    'rs-s1-equal-peer-hmac-secret-2026'
  );
}

/**
 * Hashes a user-created PIN using memory-hard `crypto.scryptSync` with a random 16-byte salt.
 * Output format: `scrypt$<saltHex>$<derivedKeyHex>`
 */
export function hashPin(pin: string): string {
  const normalized = (pin || '').trim();
  if (normalized.length < 4) {
    throw new Error('PIN minimal terdiri dari 4 karakter.');
  }
  if (normalized.length > 64) {
    throw new Error('PIN maksimal terdiri dari 64 karakter.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .scryptSync(normalized, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)
    .toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifies a plaintext PIN against a stored `scrypt$<saltHex>$<derivedKeyHex>` hash
 * using constant-time `crypto.timingSafeEqual`.
 */
export function verifyPinHash(pin: string, storedHash?: string | null): boolean {
  if (!pin || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const actualBuf = crypto.scryptSync(
      pin.trim(),
      salt,
      SCRYPT_KEYLEN,
      SCRYPT_PARAMS
    );
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy one-time invite code (`RS1-XXXX-XXXX-XXXX`) and its SHA-256 hash.
 * Only the SHA-256 hash is stored in the database (`season_invites.token_hash`).
 */
export function generateInviteToken(): {
  rawToken: string;
  tokenHash: string;
  codeHint: string;
} {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Unambiguous uppercase alphanumeric
  const bytes = crypto.randomBytes(12);
  let chars = '';
  for (let i = 0; i < 12; i++) {
    chars += alphabet[bytes[i] % alphabet.length];
  }
  const rawToken = `RS1-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
  const tokenHash = hashInviteToken(rawToken);
  const codeHint = `${rawToken.slice(0, 8)}••••${rawToken.slice(-4)}`;
  return { rawToken, tokenHash, codeHint };
}

/**
 * Normalizes and hashes a one-time invite code using SHA-256.
 */
export function hashInviteToken(rawToken: string): string {
  const normalized = (rawToken || '').trim().toUpperCase();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Creates an HMAC-SHA256 signed session cookie value bound to `participantId` and `pinUpdatedAt`.
 */
export function createSessionToken(
  participantId: ParticipantId,
  pinUpdatedAt?: string | null,
  secretOverride?: string
): string {
  const payload = `${participantId}|${pinUpdatedAt || 'v1'}`;
  const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', secretOverride || getSigningSecret())
    .update(encodedPayload, 'utf8')
    .digest('hex');
  return `${encodedPayload}.${sig}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token against the participant's current DB state.
 * Automatically rejects forged tokens, accounts that were reset to zero (`profile_completed === 0`),
 * or tokens issued before a PIN change (`pin_updated_at` mismatch).
 */
export function verifySessionToken(
  token: string,
  participant: Participant & { pin_hash?: string | null },
  secretOverride?: string
): boolean {
  if (!token || !token.includes('.')) return false;
  if (!participant.profile_completed) return false;

  const [encodedPayload, providedSig] = token.split('.');
  if (!encodedPayload || !providedSig) return false;

  try {
    const expectedSig = crypto
      .createHmac('sha256', secretOverride || getSigningSecret())
      .update(encodedPayload, 'utf8')
      .digest('hex');

    const a = Buffer.from(expectedSig, 'hex');
    const b = Buffer.from(providedSig, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return false;
    }

    const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const [tokenParticipantId, tokenPinVersion] = decoded.split('|');
    if (tokenParticipantId !== participant.id) {
      return false;
    }
    const expectedVersion = participant.pin_updated_at || 'v1';
    return tokenPinVersion === expectedVersion;
  } catch {
    return false;
  }
}

/**
 * Checks whether an account is currently locked due to too many failed PIN attempts.
 */
export function checkAccountLockout(
  lockedUntil?: string | null,
  nowMs: number = Date.now()
): { locked: boolean; remainingMinutes: number } {
  if (!lockedUntil) {
    return { locked: false, remainingMinutes: 0 };
  }
  const normalized =
    lockedUntil.includes('T') || lockedUntil.endsWith('Z')
      ? lockedUntil
      : `${lockedUntil.replace(' ', 'T')}Z`;
  const lockTimeMs = new Date(normalized).getTime();
  if (isNaN(lockTimeMs) || lockTimeMs <= nowMs) {
    return { locked: false, remainingMinutes: 0 };
  }
  const remainingMinutes = Math.max(1, Math.ceil((lockTimeMs - nowMs) / 60000));
  return { locked: true, remainingMinutes };
}

/**
 * Sets the signed HTTP-only session cookie for a participant.
 */
export async function setParticipantSessionCookie(
  participantId: ParticipantId,
  pinUpdatedAt?: string | null
): Promise<void> {
  const token = createSessionToken(participantId, pinUpdatedAt);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Get the currently logged-in participant from signed cookies.
 * Memoized per-request with React.cache to avoid duplicate DB/cookie lookups across layout and pages.
 */
export const getSession = cache(async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionValue) return null;

    const participants = await getParticipants();
    for (const participant of participants) {
      if (verifySessionToken(sessionValue, participant)) {
        return {
          participantId: participant.id,
          participant,
          isAdmin: false,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
});

export interface LoginAttemptResult {
  ok: boolean;
  code?: 'not_configured' | 'locked' | 'invalid_pin';
  error?: string;
  attemptsUsed?: number;
  maxAttempts?: number;
  remainingMinutes?: number;
}

/**
 * Authenticates a participant with their self-created PIN, enforcing rate-limiting (5 attempts -> 15m lockout).
 */
export async function loginParticipant(
  participantId: ParticipantId,
  pin: string
): Promise<LoginAttemptResult> {
  const record = await getParticipantAuthRecord(participantId);
  if (!record || !record.profile_completed || !record.pin_hash) {
    return {
      ok: false,
      code: 'not_configured',
      error:
        participantId === 'participant_a'
          ? 'Akun Pemain A belum diatur. Silakan buka halaman /setup untuk mengatur identitas dan PIN Anda.'
          : 'Akun Pemain B belum diatur. Gunakan tautan atau kode undangan sekali pakai dari Pemain A di halaman /setup.',
    };
  }

  const lockCheck = checkAccountLockout(record.locked_until);
  if (lockCheck.locked) {
    return {
      ok: false,
      code: 'locked',
      remainingMinutes: lockCheck.remainingMinutes,
      error: `Terlalu banyak percobaan PIN gagal. Akun ${record.display_name} dikunci sementara selama ${lockCheck.remainingMinutes} menit.`,
    };
  }

  const db = getDbClient();
  const isValid = verifyPinHash(pin, record.pin_hash);

  if (!isValid) {
    // If previous lock had expired, start fresh from 1; otherwise increment
    const hadExpiredLock = Boolean(record.locked_until);
    const nextAttempts = hadExpiredLock ? 1 : (record.failed_login_attempts || 0) + 1;

    if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockUntilUtc = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);

      await db.execute({
        sql: `UPDATE participants
              SET failed_login_attempts = ?, locked_until = ?, updated_at = datetime('now')
              WHERE id = ?;`,
        args: [nextAttempts, lockUntilUtc, participantId],
      });

      return {
        ok: false,
        code: 'locked',
        attemptsUsed: nextAttempts,
        maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        remainingMinutes: LOGIN_LOCKOUT_MINUTES,
        error: `PIN tidak sesuai (${nextAttempts}/${MAX_FAILED_LOGIN_ATTEMPTS}). Akun dikunci selama ${LOGIN_LOCKOUT_MINUTES} menit karena melampaui batas percobaan login.`,
      };
    } else {
      await db.execute({
        sql: `UPDATE participants
              SET failed_login_attempts = ?, locked_until = NULL, updated_at = datetime('now')
              WHERE id = ?;`,
        args: [nextAttempts, participantId],
      });

      const remaining = MAX_FAILED_LOGIN_ATTEMPTS - nextAttempts;
      return {
        ok: false,
        code: 'invalid_pin',
        attemptsUsed: nextAttempts,
        maxAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
        error: `PIN tidak sesuai. Sisa percobaan sebelum akun dikunci sementara: ${remaining} kali.`,
      };
    }
  }

  // Valid PIN: clear failed_login_attempts & locked_until, and issue signed session cookie
  await db.execute({
    sql: `UPDATE participants
          SET failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now')
          WHERE id = ?;`,
    args: [participantId],
  });

  await setParticipantSessionCookie(participantId, record.pin_updated_at);
  return { ok: true };
}

/**
 * Logout current participant
 */
export async function logoutParticipant(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
