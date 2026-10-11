import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { validateMatchReportInput } from './match_validator';
import { computeAuditEntryHash, verifyAuditChain, inferAuditCategory, AuditEventRecord } from './audit';

describe('Assist (Asis) Feature - Comprehensive Test Suite', () => {
  function createReportFormData(goals: any[]): FormData {
    const fd = new FormData();
    fd.append('md_number', '2');
    fd.append('home_score', '2');
    fd.append('away_score', '1');
    fd.append('pa_gk_name', 'Ernando Ari');
    fd.append('pb_gk_name', 'Maarten Paes');
    fd.append('pa_gk_full', '1');
    fd.append('pb_gk_full', '1');
    fd.append('goal_events_json', JSON.stringify(goals));
    return fd;
  }

  describe('1. Domain Validation for Assists', () => {
    it('Accurately validates a goal with complete roster assist metadata', () => {
      const fd = createReportFormData([
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Rafael Struick',
          scorer_card_id: '105771941650392',
          scorer_base_player_id: 105771,
          scorer_card_version: 'AFC Asian Cup 2023',
          minute: 12,
          period: 'first_half',
          assist_player_name: 'Marselino Ferdinan',
          assist_card_id: '105771941650399',
          assist_base_player_id: 105772,
          assist_card_version: 'Highlight Indonesia',
        },
      ]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        const g = res.data.validatedGoals[0];
        expect(g.scorer_player_name).toBe('Rafael Struick');
        expect(g.assist_player_name).toBe('Marselino Ferdinan');
        expect(g.assist_card_id).toBe('105771941650399');
        expect(g.assist_base_player_id).toBe(105772);
        expect(g.assist_card_version).toBe('Highlight Indonesia');
      }
    });

    it('Accurately validates a goal without assist (tanpa asis) as explicit null', () => {
      const fd = createReportFormData([
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Rafael Struick',
          scorer_card_id: '105771941650392',
          minute: 34,
          period: 'first_half',
          // no assist fields provided
        },
      ]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        const g = res.data.validatedGoals[0];
        expect(g.scorer_player_name).toBe('Rafael Struick');
        expect(g.assist_player_name).toBeNull();
        expect(g.assist_card_id).toBeNull();
        expect(g.assist_base_player_id).toBeNull();
        expect(g.assist_card_version).toBeNull();
      }
    });

    it('Accurately validates a goal with manual assist name (without roster card)', () => {
      const fd = createReportFormData([
        {
          participant_id: 'participant_b',
          scorer_player_name: 'Witan Sulaeman',
          minute: 78,
          period: 'second_half',
          assist_player_name: 'Asnawi Mangkualam',
        },
      ]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        const g = res.data.validatedGoals[0];
        expect(g.scorer_player_name).toBe('Witan Sulaeman');
        expect(g.assist_player_name).toBe('Asnawi Mangkualam');
        expect(g.assist_card_id).toBeNull();
        expect(g.assist_base_player_id).toBeNull();
        expect(g.assist_card_version).toBeNull();
      }
    });

    it('Accurately processes mixed goals (some with assist, some solo)', () => {
      const fd = createReportFormData([
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Goal 1 Scorer',
          scorer_card_id: 'card_1',
          minute: 10,
          period: 'first_half',
          assist_player_name: 'Assist 1 Player',
          assist_card_id: 'card_2',
        },
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Goal 2 Solo',
          scorer_card_id: 'card_3',
          minute: 44,
          period: 'first_half',
        },
        {
          participant_id: 'participant_b',
          scorer_player_name: 'Goal 3 Scorer',
          minute: 60,
          period: 'second_half',
          assist_player_name: 'Assist 3 Player',
        },
      ]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.validatedGoals.length).toBe(3);
        expect(res.data.validatedGoals[0].assist_player_name).toBe('Assist 1 Player');
        expect(res.data.validatedGoals[1].assist_player_name).toBeNull();
        expect(res.data.validatedGoals[2].assist_player_name).toBe('Assist 3 Player');
      }
    });

    it('Rejects when scorer and assister are the same card (scorer_card_id === assist_card_id)', () => {
      const fd = createReportFormData([
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Rafael Struick',
          scorer_card_id: '105771941650392',
          minute: 25,
          period: 'first_half',
          assist_player_name: 'Rafael Struick',
          assist_card_id: '105771941650392',
        },
      ]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('tidak boleh pemain yang sama');
      }
    });

    it('Rejects when scorer and assister have the same name (case-insensitive trim)', () => {
      const fd = createReportFormData([
        {
          participant_id: 'participant_b',
          scorer_player_name: 'Mohamed Salah',
          minute: 50,
          period: 'second_half',
          assist_player_name: '  mohamed salah  ',
        },
      ]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('tidak boleh pemain yang sama');
      }
    });

    it('Rejects when an assist is assigned to an Own Goal (Gol Bunuh Diri)', () => {
      const fd = createReportFormData([
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Defender A',
          minute: 15,
          period: 'first_half',
          is_own_goal: 1,
          assist_player_name: 'Attacker B',
        },
      ]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('tidak dapat memiliki pencatat asis');
      }
    });

    it('Maintains backward compatibility with legacy payloads lacking assist keys', () => {
      // Old payload format before assist feature was added
      const legacyGoal = {
        participant_id: 'participant_a',
        scorer_player_name: 'Rafael Struick',
        scorer_card_id: '105771941650392',
        scorer_base_player_id: 105771,
        scorer_card_version: 'AFC Asian Cup 2023',
        minute: 25,
        period: 'first_half',
        is_own_goal: 0,
      };
      const fd = createReportFormData([legacyGoal]);
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        const g = res.data.validatedGoals[0];
        expect(g.scorer_player_name).toBe('Rafael Struick');
        expect(g.assist_player_name).toBeNull();
        expect(g.assist_card_id).toBeNull();
        expect(g.assist_base_player_id).toBeNull();
        expect(g.assist_card_version).toBeNull();
      }
    });
  });

  describe('2. Database Storage, Retrieval & Null Integrity', () => {
    it('Persists assist columns as explicit NULL when no assist is provided, and retrieves accurately', async () => {
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
              VALUES ('MD2', 2, 'group_stage', 'scheduled', 'participant_a', 'participant_b');`,
        args: [],
      });

      // Goal 1: With full assist
      await client.execute({
        sql: `INSERT INTO match_goal_events (
                id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
                scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only,
                assist_player_name, assist_card_id, assist_base_player_id, assist_card_version
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?);`,
        args: [
          'g_with_assist',
          'MD2',
          'participant_a',
          'card_scorer_1',
          101,
          'Scorer One',
          'Ver 1',
          20,
          'regular_first_half',
          0,
          'Assist One',
          'card_assist_1',
          102,
          'Ver 2',
        ],
      });

      // Goal 2: Without assist (explicit null)
      await client.execute({
        sql: `INSERT INTO match_goal_events (
                id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
                scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only,
                assist_player_name, assist_card_id, assist_base_player_id, assist_card_version
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?);`,
        args: [
          'g_no_assist',
          'MD2',
          'participant_b',
          'card_scorer_2',
          103,
          'Scorer Two',
          'Ver 1',
          55,
          'regular_second_half',
          0,
          null,
          null,
          null,
          null,
        ],
      });

      const rows = await client.execute({
        sql: 'SELECT * FROM match_goal_events WHERE match_id = ? ORDER BY minute ASC;',
        args: ['MD2'],
      });

      expect(rows.rows.length).toBe(2);

      // Check Goal 1
      const g1 = rows.rows[0];
      expect(g1.scorer_player_name).toBe('Scorer One');
      expect(g1.assist_player_name).toBe('Assist One');
      expect(g1.assist_card_id).toBe('card_assist_1');
      expect(Number(g1.assist_base_player_id)).toBe(102);
      expect(g1.assist_card_version).toBe('Ver 2');

      // Check Goal 2 (null integrity)
      const g2 = rows.rows[1];
      expect(g2.scorer_player_name).toBe('Scorer Two');
      expect(g2.assist_player_name).toBeNull();
      expect(g2.assist_card_id).toBeNull();
      expect(g2.assist_base_player_id).toBeNull();
      expect(g2.assist_card_version).toBeNull();
    });
  });

  describe('3. Database Migration & Preservation of Existing MD1 Production Data', () => {
    it('Simulates old schema with MD1 data, executes migration, and proves MD1 data is 100% preserved', async () => {
      const client = createClient({ url: 'file::memory:' });

      // Create old schema without assist columns
      await client.executeMultiple(`
        CREATE TABLE participants (
          id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          monogram TEXT NOT NULL,
          is_admin INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE matches (
          id TEXT PRIMARY KEY,
          md_number INTEGER NOT NULL,
          phase TEXT NOT NULL,
          status TEXT NOT NULL,
          home_participant_id TEXT NOT NULL,
          away_participant_id TEXT NOT NULL,
          home_score INTEGER,
          away_score INTEGER
        );
        CREATE TABLE match_goal_events (
          id TEXT PRIMARY KEY,
          match_id TEXT NOT NULL,
          scoring_participant_id TEXT NOT NULL,
          scorer_card_id TEXT,
          scorer_base_player_id INTEGER,
          scorer_player_name TEXT NOT NULL,
          scorer_card_version TEXT,
          minute INTEGER,
          period TEXT NOT NULL,
          is_own_goal INTEGER NOT NULL DEFAULT 0,
          is_reconstruction_only INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Insert MD1 production record
      await client.execute({
        sql: `INSERT INTO participants (id, display_name, monogram) VALUES
              ('participant_a', 'algojogacor', 'AG'),
              ('participant_b', 'CHarmed', 'CH');`,
        args: [],
      });
      await client.execute({
        sql: `INSERT INTO matches (id, md_number, phase, status, home_participant_id, away_participant_id, home_score, away_score)
              VALUES ('MD1', 1, 'group_stage', 'confirmed', 'participant_a', 'participant_b', 1, 0);`,
        args: [],
      });

      // Exactly replicate Rafael Struick's goal in MD1
      await client.execute({
        sql: `INSERT INTO match_goal_events (
                id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
                scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          'goal_MD1_1',
          'MD1',
          'participant_a',
          '105771941650392',
          105771,
          'Rafael Struick',
          'AFC Asian Cup 2023',
          25,
          'regular_first_half',
          0,
          0,
        ],
      });

      // Verify MD1 goal exists in old schema
      const beforeMigration = await client.execute("SELECT * FROM match_goal_events WHERE match_id = 'MD1';");
      expect(beforeMigration.rows.length).toBe(1);
      expect(beforeMigration.rows[0].scorer_player_name).toBe('Rafael Struick');

      // Now run the exact migration queries from scripts/migrate-add-assist-columns.mjs
      const tableInfo = await client.execute('PRAGMA table_info(match_goal_events);');
      const existingCols = new Set(tableInfo.rows.map((r: any) => String(r.name)));

      const neededColumns = [
        { name: 'assist_player_name', type: 'TEXT' },
        { name: 'assist_card_id', type: 'TEXT' },
        { name: 'assist_base_player_id', type: 'INTEGER' },
        { name: 'assist_card_version', type: 'TEXT' },
      ];

      for (const col of neededColumns) {
        if (!existingCols.has(col.name)) {
          await client.execute(`ALTER TABLE match_goal_events ADD COLUMN ${col.name} ${col.type};`);
        }
      }

      // Verify post-migration columns and MD1 row
      const afterMigration = await client.execute("SELECT * FROM match_goal_events WHERE match_id = 'MD1';");
      expect(afterMigration.rows.length).toBe(1);
      const preservedGoal = afterMigration.rows[0];

      // Scorer data must be completely identical
      expect(preservedGoal.id).toBe('goal_MD1_1');
      expect(preservedGoal.match_id).toBe('MD1');
      expect(preservedGoal.scoring_participant_id).toBe('participant_a');
      expect(preservedGoal.scorer_player_name).toBe('Rafael Struick');
      expect(preservedGoal.scorer_card_id).toBe('105771941650392');
      expect(Number(preservedGoal.scorer_base_player_id)).toBe(105771);
      expect(preservedGoal.scorer_card_version).toBe('AFC Asian Cup 2023');
      expect(Number(preservedGoal.minute)).toBe(25);
      expect(preservedGoal.period).toBe('regular_first_half');
      expect(Number(preservedGoal.is_own_goal)).toBe(0);

      // Assist columns must be NULL (no corrupted defaults, no errors)
      expect(preservedGoal.assist_player_name).toBeNull();
      expect(preservedGoal.assist_card_id).toBeNull();
      expect(preservedGoal.assist_base_player_id).toBeNull();
      expect(preservedGoal.assist_card_version).toBeNull();
    });
  });

  describe('4. Audit Trail Hash & Chain Verification Compatibility', () => {
    it('Verifies historical audit events without assist retain authentic cryptographic hashes', () => {
      // Historical MD1 event payload before assist feature
      const legacyPayload = {
        matchId: 'MD1',
        homeScore: 1,
        awayScore: 0,
        scorers: [
          {
            participant: 'participant_a',
            player: 'Rafael Struick',
            cardId: '105771941650392',
            minute: 25,
            period: 'first_half',
          },
        ],
      };
      const afterJson = JSON.stringify(legacyPayload);
      const reason = 'Laporan hasil MD1 diserahkan oleh algojogacor: algojogacor 1 - 0 CHarmed (Rafael Struick)';

      const base1 = {
        id: 'audit_01',
        actor_id: 'participant_a' as const,
        action: 'match_report_submitted',
        entity_type: 'match',
        entity_id: 'MD1',
        before_json: null,
        after_json: afterJson,
        reason,
        timestamp: '2026-03-20T10:00:00.000Z',
        prev_hash: 'GENESIS',
      };

      const hash1 = computeAuditEntryHash(base1);
      const hash2 = computeAuditEntryHash(base1);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64);
    });

    it('Verifies complete audit chain integrity when new events include assist data', () => {
      // Event 1 (Legacy MD1 without assist)
      const ev1Base = {
        id: 'ev_1',
        actor_id: 'participant_a' as const,
        action: 'match_report_submitted',
        entity_type: 'match',
        entity_id: 'MD1',
        before_json: null,
        after_json: JSON.stringify({ matchId: 'MD1', score: '1-0' }),
        reason: 'MD1 report without assist',
        timestamp: '2026-03-20T10:00:00.000Z',
        prev_hash: 'GENESIS',
      };
      const ev1Hash = computeAuditEntryHash(ev1Base);

      // Event 2 (MD2 with assist)
      const ev2Base = {
        id: 'ev_2',
        actor_id: 'participant_a' as const,
        action: 'match_report_submitted',
        entity_type: 'match',
        entity_id: 'MD2',
        before_json: null,
        after_json: JSON.stringify({
          matchId: 'MD2',
          scorers: [
            {
              participant: 'participant_a',
              player: 'Rafael Struick',
              minute: 15,
              assist: 'Marselino Ferdinan',
            },
          ],
        }),
        reason: 'Laporan hasil MD2 diserahkan: Rafael Struick (as. Marselino Ferdinan)',
        timestamp: '2026-03-21T10:00:00.000Z',
        prev_hash: ev1Hash,
      };
      const ev2Hash = computeAuditEntryHash(ev2Base);

      const chainDesc: AuditEventRecord[] = [
        {
          ...ev2Base,
          actor_name: 'algojogacor',
          category: inferAuditCategory(ev2Base.action, ev2Base.entity_type),
          rule_article: 'Pasal 22',
          device_info: 'Chrome on Windows',
          entry_hash: ev2Hash,
        },
        {
          ...ev1Base,
          actor_name: 'algojogacor',
          category: inferAuditCategory(ev1Base.action, ev1Base.entity_type),
          rule_article: 'Pasal 22',
          device_info: 'Chrome on Windows',
          entry_hash: ev1Hash,
        },
      ];

      const verification = verifyAuditChain(chainDesc);
      expect(verification.intact).toBe(true);
      expect(verification.totalEntries).toBe(2);
      expect(verification.verifiedCount).toBe(2);
      expect(verification.brokenAtId).toBeNull();
    });
  });

  describe('5. Full End-to-End Match Report & Confirmation Flow with Assists', () => {
    it('Simulates full report submission, assist persistence, opponent confirmation, and audit logging', async () => {
      const client = createClient({ url: 'file::memory:' });
      const schemaSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'schema.sql'), 'utf8');
      await client.executeMultiple(schemaSql);

      // Seed Participants
      await client.execute({
        sql: `INSERT INTO participants (id, display_name, monogram, is_admin)
              VALUES ('participant_a', 'algojogacor', 'AG', 0), ('participant_b', 'CHarmed', 'CH', 0);`,
        args: [],
      });

      // Seed MD1 (Already Confirmed)
      await client.execute({
        sql: `INSERT INTO matches (
                id, md_number, phase, status, home_participant_id, away_participant_id,
                home_score, away_score, points_home, points_away, reported_by, confirmation_status
              ) VALUES ('MD1', 1, 'group_stage', 'confirmed', 'participant_a', 'participant_b', 1, 0, 3, 0, 'participant_a', 'confirmed_both');`,
        args: [],
      });

      // Seed MD1 Goal (Rafael Struick - Legacy without assist)
      await client.execute({
        sql: `INSERT INTO match_goal_events (
                id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
                scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only,
                assist_player_name, assist_card_id, assist_base_player_id, assist_card_version
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?);`,
        args: [
          'goal_MD1_1',
          'MD1',
          'participant_a',
          '105771941650392',
          105771,
          'Rafael Struick',
          'AFC Asian Cup 2023',
          25,
          'regular_first_half',
          0,
          null,
          null,
          null,
          null,
        ],
      });

      // Seed MD2 (Scheduled)
      await client.execute({
        sql: `INSERT INTO matches (
                id, md_number, phase, status, home_participant_id, away_participant_id
              ) VALUES ('MD2', 2, 'group_stage', 'scheduled', 'participant_a', 'participant_b');`,
        args: [],
      });

      // Step 1: Participant A submits match report for MD2 with 3 goals (with, without, manual assist)
      const fd = new FormData();
      fd.append('md_number', '2');
      fd.append('home_score', '2');
      fd.append('away_score', '1');
      fd.append('pa_gk_name', 'Ernando Ari');
      fd.append('pb_gk_name', 'Maarten Paes');
      fd.append('pa_gk_full', '1');
      fd.append('pb_gk_full', '1');
      fd.append('goal_events_json', JSON.stringify([
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Rafael Struick',
          scorer_card_id: 'card_struick',
          scorer_base_player_id: 105771,
          scorer_card_version: 'Highlight',
          minute: 18,
          period: 'first_half',
          assist_player_name: 'Marselino Ferdinan',
          assist_card_id: 'card_marselino',
          assist_base_player_id: 105772,
          assist_card_version: 'Standard',
        },
        {
          participant_id: 'participant_a',
          scorer_player_name: 'Witan Sulaeman',
          scorer_card_id: 'card_witan',
          scorer_base_player_id: 105773,
          scorer_card_version: 'Club Selection',
          minute: 42,
          period: 'first_half',
          // No assist
        },
        {
          participant_id: 'participant_b',
          scorer_player_name: 'Ramadhan Sananta',
          minute: 85,
          period: 'second_half',
          assist_player_name: 'Egy Maulana Vikri',
        },
      ]));

      const validation = validateMatchReportInput(fd);
      expect(validation.success).toBe(true);
      if (!validation.success) return;

      const { validatedGoals } = validation.data;

      // Update match to awaiting_confirmation
      await client.execute({
        sql: `UPDATE matches SET
                status = 'awaiting_confirmation',
                home_score = 2,
                away_score = 1,
                reported_by = 'participant_a'
              WHERE id = 'MD2';`,
        args: [],
      });

      // Insert the 3 validated goal events
      for (let i = 0; i < validatedGoals.length; i++) {
        const g = validatedGoals[i];
        await client.execute({
          sql: `INSERT INTO match_goal_events (
                  id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
                  scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only,
                  assist_player_name, assist_card_id, assist_base_player_id, assist_card_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?);`,
          args: [
            `goal_MD2_${i + 1}`,
            'MD2',
            g.scoring_participant_id,
            g.scorer_card_id,
            g.scorer_base_player_id,
            g.scorer_player_name,
            g.scorer_card_version,
            g.minute,
            g.period,
            g.is_own_goal,
            g.assist_player_name,
            g.assist_card_id,
            g.assist_base_player_id,
            g.assist_card_version,
          ],
        });
      }

      // Record Audit Event for submission
      const reportAuditJson = JSON.stringify({
        matchId: 'MD2',
        homeScore: 2,
        awayScore: 1,
        scorers: validatedGoals.map((g) => ({
          player: g.scorer_player_name,
          minute: g.minute,
          assist: g.assist_player_name || null,
        })),
      });

      const reportAuditHash = computeAuditEntryHash({
        id: 'audit_md2_report',
        actor_id: 'participant_a',
        action: 'submit_match_report',
        entity_type: 'match',
        entity_id: 'MD2',
        before_json: null,
        after_json: reportAuditJson,
        reason: 'algojogacor mengirim laporan hasil MD2: algojogacor 2 - 1 CHarmed',
        timestamp: '2026-03-21T14:00:00.000Z',
        prev_hash: 'GENESIS',
      });

      await client.execute({
        sql: `INSERT INTO audit_events (
                id, actor_id, actor_name, category, action, entity_type, entity_id,
                before_json, after_json, reason, prev_hash, entry_hash, timestamp
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          'audit_md2_report',
          'participant_a',
          'algojogacor',
          'match',
          'submit_match_report',
          'match',
          'MD2',
          null,
          reportAuditJson,
          'algojogacor mengirim laporan hasil MD2',
          'GENESIS',
          reportAuditHash,
          '2026-03-21T14:00:00.000Z',
        ],
      });

      // Verify goals in DB
      const md2GoalsRes = await client.execute({
        sql: "SELECT * FROM match_goal_events WHERE match_id = 'MD2' ORDER BY minute ASC;",
        args: [],
      });
      expect(md2GoalsRes.rows.length).toBe(3);

      // Goal 1: Full assist
      expect(md2GoalsRes.rows[0].scorer_player_name).toBe('Rafael Struick');
      expect(md2GoalsRes.rows[0].assist_player_name).toBe('Marselino Ferdinan');
      expect(md2GoalsRes.rows[0].assist_card_id).toBe('card_marselino');
      expect(Number(md2GoalsRes.rows[0].assist_base_player_id)).toBe(105772);
      expect(md2GoalsRes.rows[0].assist_card_version).toBe('Standard');

      // Goal 2: No assist
      expect(md2GoalsRes.rows[1].scorer_player_name).toBe('Witan Sulaeman');
      expect(md2GoalsRes.rows[1].assist_player_name).toBeNull();
      expect(md2GoalsRes.rows[1].assist_card_id).toBeNull();

      // Goal 3: Manual assist
      expect(md2GoalsRes.rows[2].scorer_player_name).toBe('Ramadhan Sananta');
      expect(md2GoalsRes.rows[2].assist_player_name).toBe('Egy Maulana Vikri');
      expect(md2GoalsRes.rows[2].assist_card_id).toBeNull();

      // Step 2: Opponent (CHarmed / participant_b) confirms match report
      await client.execute({
        sql: `UPDATE matches SET
                status = 'confirmed',
                confirmation_status = 'confirmed_both',
                confirmed_by_pb_at = '2026-03-21T14:15:00.000Z',
                points_home = 3,
                points_away = 0
              WHERE id = 'MD2';`,
        args: [],
      });

      const confirmAuditHash = computeAuditEntryHash({
        id: 'audit_md2_confirm',
        actor_id: 'participant_b',
        action: 'confirm_match_report',
        entity_type: 'match',
        entity_id: 'MD2',
        before_json: JSON.stringify({ status: 'awaiting_confirmation' }),
        after_json: JSON.stringify({ status: 'confirmed' }),
        reason: 'CHarmed mengesahkan laporan hasil MD2',
        timestamp: '2026-03-21T14:15:00.000Z',
        prev_hash: reportAuditHash,
      });

      await client.execute({
        sql: `INSERT INTO audit_events (
                id, actor_id, actor_name, category, action, entity_type, entity_id,
                before_json, after_json, reason, prev_hash, entry_hash, timestamp
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          'audit_md2_confirm',
          'participant_b',
          'CHarmed',
          'match',
          'confirm_match_report',
          'match',
          'MD2',
          JSON.stringify({ status: 'awaiting_confirmation' }),
          JSON.stringify({ status: 'confirmed' }),
          'CHarmed mengesahkan laporan hasil MD2',
          reportAuditHash,
          confirmAuditHash,
          '2026-03-21T14:15:00.000Z',
        ],
      });

      // Verify Match status is now confirmed
      const finalMatchRes = await client.execute("SELECT * FROM matches WHERE id = 'MD2';");
      expect(finalMatchRes.rows[0].status).toBe('confirmed');
      expect(Number(finalMatchRes.rows[0].points_home)).toBe(3);
      expect(Number(finalMatchRes.rows[0].points_away)).toBe(0);

      // Verify MD1 goal was never modified
      const md1GoalRes = await client.execute("SELECT * FROM match_goal_events WHERE match_id = 'MD1';");
      expect(md1GoalRes.rows.length).toBe(1);
      expect(md1GoalRes.rows[0].scorer_player_name).toBe('Rafael Struick');
      expect(md1GoalRes.rows[0].assist_player_name).toBeNull();
    });
  });
});
