import { describe, it, expect } from 'vitest';
import {
  hashPin,
  verifyPinHash,
  generateInviteToken,
  hashInviteToken,
  createSessionToken,
  verifySessionToken,
  checkAccountLockout,
} from './auth';

describe('Auth Helpers & Security Tests', () => {
  describe('PIN Hashing and Verification', () => {
    it('hashes PIN with scrypt salt and correctly verifies match', () => {
      const pin = '123456';
      const hash = hashPin(pin);
      expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]+$/);
      expect(verifyPinHash(pin, hash)).toBe(true);
      expect(verifyPinHash('wrong', hash)).toBe(false);
      expect(verifyPinHash('123457', hash)).toBe(false);
    });

    it('rejects short PINs under 4 characters', () => {
      expect(() => hashPin('123')).toThrow('PIN minimal terdiri dari 4 karakter.');
    });

    it('rejects verification on invalid hash format or null', () => {
      expect(verifyPinHash('123456', null)).toBe(false);
      expect(verifyPinHash('123456', 'invalid-format')).toBe(false);
      expect(verifyPinHash('', 'scrypt$1234$5678')).toBe(false);
    });
  });

  describe('Invite Token Generation & Hashing', () => {
    it('generates high-entropy RS1 format invite tokens', () => {
      const { rawToken, tokenHash, codeHint } = generateInviteToken();
      expect(rawToken).toMatch(/^RS1-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      expect(tokenHash).toHaveLength(64);
      expect(tokenHash).toBe(hashInviteToken(rawToken));
      expect(codeHint).toContain('••••');
    });

    it('produces identical hash for case-insensitive and trimmed raw token', () => {
      const raw = 'rs1-abcd-efgh-jkmn';
      expect(hashInviteToken(raw)).toBe(hashInviteToken('RS1-ABCD-EFGH-JKMN'));
      expect(hashInviteToken(`  ${raw}  `)).toBe(hashInviteToken(raw.toUpperCase()));
    });
  });

  describe('Session Token Sign & Verification', () => {
    const dummySecret = 'test-secret-32-chars-long-12345678';

    it('creates and verifies a valid session token', () => {
      const token = createSessionToken('participant_a', '2026-10-11T00:00:00Z', dummySecret);
      const participant = {
        id: 'participant_a' as const,
        display_name: 'Pemain A',
        monogram: 'PA',
        is_admin: 0,
        profile_completed: 1,
        pin_updated_at: '2026-10-11T00:00:00Z',
        last_audit_seen_at: null,
      };

      expect(verifySessionToken(token, participant, dummySecret)).toBe(true);
    });

    it('rejects token if participant profile_completed is 0', () => {
      const token = createSessionToken('participant_a', '2026-10-11T00:00:00Z', dummySecret);
      const participant = {
        id: 'participant_a' as const,
        display_name: 'Pemain A',
        monogram: 'PA',
        is_admin: 0,
        profile_completed: 0,
        pin_updated_at: '2026-10-11T00:00:00Z',
        last_audit_seen_at: null,
      };

      expect(verifySessionToken(token, participant, dummySecret)).toBe(false);
    });

    it('rejects token if PIN version changed', () => {
      const token = createSessionToken('participant_a', 'old-version', dummySecret);
      const participant = {
        id: 'participant_a' as const,
        display_name: 'Pemain A',
        monogram: 'PA',
        is_admin: 0,
        profile_completed: 1,
        pin_updated_at: 'new-version',
        last_audit_seen_at: null,
      };

      expect(verifySessionToken(token, participant, dummySecret)).toBe(false);
    });

    it('rejects forged token or wrong secret', () => {
      const token = createSessionToken('participant_a', 'v1', dummySecret);
      const participant = {
        id: 'participant_a' as const,
        display_name: 'Pemain A',
        monogram: 'PA',
        is_admin: 0,
        profile_completed: 1,
        pin_updated_at: 'v1',
        last_audit_seen_at: null,
      };

      expect(verifySessionToken(token, participant, 'wrong-secret-12345678901234567890')).toBe(false);
    });
  });

  describe('Account Lockout Verification', () => {
    it('returns not locked if lockedUntil is null', () => {
      const result = checkAccountLockout(null);
      expect(result.locked).toBe(false);
      expect(result.remainingMinutes).toBe(0);
    });

    it('detects active lockout and computes remaining minutes', () => {
      const now = Date.now();
      const futureIso = new Date(now + 10 * 60 * 1000).toISOString();
      const result = checkAccountLockout(futureIso, now);
      expect(result.locked).toBe(true);
      expect(result.remainingMinutes).toBe(10);
    });

    it('clears lockout if past the expiry time', () => {
      const now = Date.now();
      const pastIso = new Date(now - 5 * 60 * 1000).toISOString();
      const result = checkAccountLockout(pastIso, now);
      expect(result.locked).toBe(false);
      expect(result.remainingMinutes).toBe(0);
    });
  });
});
