import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import {
  canSelfUnlockSquad,
  validateUnlockRequest,
  validateUnlockResponse,
} from './squad_unlock';

describe('Squad Unlock and Reopen Logic & Persistence Suite', () => {
  describe('1. Self-Unlock Rules (canSelfUnlockSquad)', () => {
    it('allows self-unlock when participant is locked, opponent is not, and opening match is scheduled', () => {
      const res = canSelfUnlockSquad({
        myLocked: true,
        opponentLocked: false,
        openingMatchStatus: 'scheduled',
      });
      expect(res.allowed).toBe(true);
    });

    it('rejects self-unlock if participant is not locked', () => {
      const res = canSelfUnlockSquad({
        myLocked: false,
        opponentLocked: false,
        openingMatchStatus: 'scheduled',
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Skuad Anda belum dalam keadaan terkunci');
    });

    it('rejects self-unlock if opponent is already locked', () => {
      const res = canSelfUnlockSquad({
        myLocked: true,
        opponentLocked: true,
        openingMatchStatus: 'scheduled',
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Lawan sudah mengunci skuad');
    });

    it('rejects self-unlock if opening match has kicked off or completed', () => {
      const res1 = canSelfUnlockSquad({
        myLocked: true,
        opponentLocked: false,
        openingMatchStatus: 'awaiting_confirmation',
      });
      expect(res1.allowed).toBe(false);
      expect(res1.reason).toContain('pertandingan pembuka sudah berjalan');

      const res2 = canSelfUnlockSquad({
        myLocked: true,
        opponentLocked: false,
        openingMatchStatus: 'confirmed',
      });
      expect(res2.allowed).toBe(false);
      expect(res2.reason).toContain('pertandingan pembuka sudah berjalan');
    });
  });

  describe('2. Mutual Squad Unlock Request Validation (validateUnlockRequest)', () => {
    it('approves a valid request with reason >= 5 chars and scheduled opening match', () => {
      const res = validateUnlockRequest({
        phase: 1,
        reason: 'Salah pilih versi kartu Messi',
        openingMatchStatus: 'scheduled',
        hasActivePendingRequest: false,
      });
      expect(res.valid).toBe(true);
    });

    it('rejects request with invalid phase', () => {
      const res = validateUnlockRequest({
        phase: 3,
        reason: 'Salah kartu',
        openingMatchStatus: 'scheduled',
        hasActivePendingRequest: false,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Fase kompetisi tidak valid');
    });

    it('rejects request with empty or short reason (< 5 chars)', () => {
      const res1 = validateUnlockRequest({
        phase: 2,
        reason: '   ',
        openingMatchStatus: 'scheduled',
        hasActivePendingRequest: false,
      });
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('minimal 5 karakter');

      const res2 = validateUnlockRequest({
        phase: 2,
        reason: 'tes',
        openingMatchStatus: 'scheduled',
        hasActivePendingRequest: false,
      });
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('minimal 5 karakter');
    });

    it('rejects request if opening match is already played/reported', () => {
      const res = validateUnlockRequest({
        phase: 2,
        reason: 'Mau ganti kartu striker',
        openingMatchStatus: 'confirmed',
        hasActivePendingRequest: false,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('pertandingan pembuka fase ini sudah berjalan');
    });

    it('rejects request if an active pending request already exists', () => {
      const res = validateUnlockRequest({
        phase: 1,
        reason: 'Mau ganti formasi',
        openingMatchStatus: 'scheduled',
        hasActivePendingRequest: true,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Sudah ada permohonan buka kunci skuad');
    });
  });

  describe('3. Mutual Squad Unlock Response Validation (validateUnlockResponse)', () => {
    it('approves valid response from opponent when match is scheduled', () => {
      const res = validateUnlockResponse({
        requestStatus: 'pending_approval',
        requesterId: 'participant_a',
        responderId: 'participant_b',
        openingMatchStatus: 'scheduled',
        approved: true,
      });
      expect(res.valid).toBe(true);
    });

    it('rejects response if request is not pending_approval', () => {
      const res = validateUnlockResponse({
        requestStatus: 'approved',
        requesterId: 'participant_a',
        responderId: 'participant_b',
        openingMatchStatus: 'scheduled',
        approved: true,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('sudah tidak aktif');
    });

    it('rejects self-response (requester approving own request)', () => {
      const res = validateUnlockResponse({
        requestStatus: 'pending_approval',
        requesterId: 'participant_a',
        responderId: 'participant_a',
        openingMatchStatus: 'scheduled',
        approved: true,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Anda tidak dapat merespons');
    });

    it('rejects approval if opening match has begun or completed', () => {
      const res = validateUnlockResponse({
        requestStatus: 'pending_approval',
        requesterId: 'participant_a',
        responderId: 'participant_b',
        openingMatchStatus: 'awaiting_confirmation',
        approved: true,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('pertandingan pembuka fase ini sudah berjalan');
    });
  });

  describe('4. SQLite Database Schema & State Transitions', () => {
    async function setupDb() {
      const client = createClient({ url: 'file::memory:' });
      const schemaSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'schema.sql'), 'utf8');
      await client.executeMultiple(schemaSql);

      await client.execute({
        sql: `INSERT INTO participants (id, display_name, monogram, is_admin)
              VALUES ('participant_a', 'algojogacor', 'AG', 0), ('participant_b', 'CHarmed', 'CH', 0);`,
        args: [],
      });

      await client.execute({
        sql: `INSERT INTO matches (id, md_number, phase, status, home_participant_id, away_participant_id)
              VALUES ('MD1', 1, 'group_stage', 'scheduled', 'participant_a', 'participant_b'),
                     ('MD11', 11, 'knockout_stage', 'scheduled', 'participant_a', 'participant_b');`,
        args: [],
      });

      return client;
    }

    it('Self-unlocks participant squad cleanly in SQLite', async () => {
      const client = setupDb();
      const db = await client;

      // Initial state: PA locked, PB unlocked, both unlocked
      await db.execute({
        sql: `INSERT INTO roster_phases (phase, label, is_locked, pa_locked, pb_locked)
              VALUES (1, 'Fase 1', 0, 1, 0);`,
        args: [],
      });

      // Execute self-unlock for PA
      await db.execute({
        sql: `UPDATE roster_phases SET pa_locked = 0, pa_locked_at = NULL WHERE phase = 1;`,
        args: [],
      });

      const res = await db.execute({ sql: 'SELECT pa_locked, pb_locked, is_locked FROM roster_phases WHERE phase = 1;', args: [] });
      expect(Number(res.rows[0].pa_locked)).toBe(0);
      expect(Number(res.rows[0].pb_locked)).toBe(0);
      expect(Number(res.rows[0].is_locked)).toBe(0);
    });

    it('Executes mutual unlock approval flow: resets both locks to 0', async () => {
      const client = setupDb();
      const db = await client;

      // Both locked
      await db.execute({
        sql: `INSERT INTO roster_phases (phase, label, is_locked, pa_locked, pb_locked)
              VALUES (2, 'Fase 2', 1, 1, 1);`,
        args: [],
      });

      // Insert unlock request
      const reqId = 'sur_test_123';
      await db.execute({
        sql: `INSERT INTO squad_unlock_requests (id, phase, requested_by, reason, status)
              VALUES (?, 2, 'participant_a', 'Mau ganti kartu bek salah ambil', 'pending_approval');`,
        args: [reqId],
      });

      // Verify request created
      const reqCheck = await db.execute({ sql: 'SELECT * FROM squad_unlock_requests WHERE id = ?;', args: [reqId] });
      expect(reqCheck.rows.length).toBe(1);
      expect(reqCheck.rows[0].status).toBe('pending_approval');

      // PB approves request
      await db.execute({
        sql: `UPDATE squad_unlock_requests
              SET status = 'approved', responded_by = 'participant_b', responded_at = datetime('now')
              WHERE id = ?;`,
        args: [reqId],
      });
      await db.execute({
        sql: `UPDATE roster_phases
              SET pa_locked = 0, pa_locked_at = NULL, pb_locked = 0, pb_locked_at = NULL, is_locked = 0, locked_at = NULL, locked_by = NULL
              WHERE phase = 2;`,
        args: [],
      });

      // Verify roster_phases are reset to 0
      const phaseCheck = await db.execute({ sql: 'SELECT pa_locked, pb_locked, is_locked FROM roster_phases WHERE phase = 2;', args: [] });
      expect(Number(phaseCheck.rows[0].pa_locked)).toBe(0);
      expect(Number(phaseCheck.rows[0].pb_locked)).toBe(0);
      expect(Number(phaseCheck.rows[0].is_locked)).toBe(0);

      // Verify request is approved
      const reqAfter = await db.execute({ sql: 'SELECT status, responded_by FROM squad_unlock_requests WHERE id = ?;', args: [reqId] });
      expect(reqAfter.rows[0].status).toBe('approved');
      expect(reqAfter.rows[0].responded_by).toBe('participant_b');
    });

    it('Executes mutual unlock rejection flow: keeps locks intact', async () => {
      const client = setupDb();
      const db = await client;

      await db.execute({
        sql: `INSERT INTO roster_phases (phase, label, is_locked, pa_locked, pb_locked)
              VALUES (2, 'Fase 2', 1, 1, 1);`,
        args: [],
      });

      const reqId = 'sur_test_reject';
      await db.execute({
        sql: `INSERT INTO squad_unlock_requests (id, phase, requested_by, reason, status)
              VALUES (?, 2, 'participant_b', 'Ganti kartu', 'pending_approval');`,
        args: [reqId],
      });

      // PA rejects
      await db.execute({
        sql: `UPDATE squad_unlock_requests
              SET status = 'rejected', responded_by = 'participant_a', responded_at = datetime('now'), rejection_reason = 'Match segera dimulai'
              WHERE id = ?;`,
        args: [reqId],
      });

      // Verify locks remain 1
      const phaseCheck = await db.execute({ sql: 'SELECT pa_locked, pb_locked, is_locked FROM roster_phases WHERE phase = 2;', args: [] });
      expect(Number(phaseCheck.rows[0].pa_locked)).toBe(1);
      expect(Number(phaseCheck.rows[0].pb_locked)).toBe(1);
      expect(Number(phaseCheck.rows[0].is_locked)).toBe(1);

      const reqAfter = await db.execute({ sql: 'SELECT status, rejection_reason FROM squad_unlock_requests WHERE id = ?;', args: [reqId] });
      expect(reqAfter.rows[0].status).toBe('rejected');
      expect(reqAfter.rows[0].rejection_reason).toBe('Match segera dimulai');
    });

    it('Executes cancellation flow: requester cancels pending request', async () => {
      const client = setupDb();
      const db = await client;

      const reqId = 'sur_test_cancel';
      await db.execute({
        sql: `INSERT INTO squad_unlock_requests (id, phase, requested_by, reason, status)
              VALUES (?, 1, 'participant_a', 'Nggak jadi ganti', 'pending_approval');`,
        args: [reqId],
      });

      await db.execute({
        sql: `UPDATE squad_unlock_requests SET status = 'cancelled' WHERE id = ?;`,
        args: [reqId],
      });

      const reqAfter = await db.execute({ sql: 'SELECT status FROM squad_unlock_requests WHERE id = ?;', args: [reqId] });
      expect(reqAfter.rows[0].status).toBe('cancelled');
    });
  });
});
