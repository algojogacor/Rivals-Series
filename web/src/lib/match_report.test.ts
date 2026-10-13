import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { validateMatchReportInput } from './match_validator';

describe('Match Report Validation & Data Integrity Suite', () => {
  function createValidFormData(overrides: Record<string, string> = {}): FormData {
    const fd = new FormData();
    fd.append('md_number', '1');
    fd.append('home_score', '2');
    fd.append('away_score', '1');
    fd.append('pa_gk_name', 'Alisson Becker');
    fd.append('pb_gk_name', 'Thibaut Courtois');
    fd.append('pa_gk_full', '1');
    fd.append('pb_gk_full', '1');
    fd.append('goal_events_json', JSON.stringify([
      {
        participant_id: 'participant_a',
        scorer_player_name: 'Luis Diaz',
        scorer_card_id: '89132919465292',
        scorer_base_player_id: 105234,
        minute: 23,
        period: 'first_half',
      },
      {
        participant_id: 'participant_a',
        scorer_player_name: 'Mohamed Salah',
        minute: 54,
        period: 'second_half',
      },
      {
        participant_id: 'participant_b',
        scorer_player_name: 'Vinicius Jr',
        minute: 88,
        period: 'second_half',
      },
    ]));

    for (const [key, val] of Object.entries(overrides)) {
      if (val === '__DELETE__') {
        fd.delete(key);
      } else {
        fd.set(key, val);
      }
    }
    return fd;
  }

  describe('1. Rejection of Missing or Invalid Required Fields', () => {
    it('Rejects missing or invalid matchday number', () => {
      const fdMissing = createValidFormData({ md_number: '__DELETE__' });
      const res1 = validateMatchReportInput(fdMissing);
      expect(res1.success).toBe(false);
      if (!res1.success) expect(res1.error).toContain('Nomor Matchday tidak valid');

      const fdOutOfRange = createValidFormData({ md_number: '25' });
      const res2 = validateMatchReportInput(fdOutOfRange);
      expect(res2.success).toBe(false);
      if (!res2.success) expect(res2.error).toContain('Nomor Matchday tidak valid');
    });

    it('Rejects missing, negative, or non-numeric regulation scores', () => {
      const fdNoHome = createValidFormData({ home_score: '__DELETE__' });
      const res1 = validateMatchReportInput(fdNoHome);
      expect(res1.success).toBe(false);
      if (!res1.success) expect(res1.error).toContain('Skor waktu reguler untuk Peserta A dan Peserta B wajib diisi');

      const fdNegative = createValidFormData({ home_score: '-1' });
      const res2 = validateMatchReportInput(fdNegative);
      expect(res2.success).toBe(false);
      if (!res2.success) expect(res2.error).toContain('bilangan bulat positif');

      const fdDecimal = createValidFormData({ away_score: '2.5' });
      const res3 = validateMatchReportInput(fdDecimal);
      expect(res3.success).toBe(false);
      if (!res3.success) expect(res3.error).toContain('bilangan bulat positif');
    });

    it('Rejects missing or empty goalkeeper names (Pasal 42 Golden Glove)', () => {
      const fdNoPaGk = createValidFormData({ pa_gk_name: '  ' });
      const res1 = validateMatchReportInput(fdNoPaGk);
      expect(res1.success).toBe(false);
      if (!res1.success) expect(res1.error).toContain('Nama kiper starter Peserta A wajib diisi');

      const fdNoPbGk = createValidFormData({ pb_gk_name: '__DELETE__' });
      const res2 = validateMatchReportInput(fdNoPbGk);
      expect(res2.success).toBe(false);
      if (!res2.success) expect(res2.error).toContain('Nama kiper starter Peserta B wajib diisi');
    });

    it('Rejects goal events with missing or invalid participant team', () => {
      const fd = createValidFormData({
        goal_events_json: JSON.stringify([
          {
            participant_id: 'invalid_team',
            scorer_player_name: 'Mystery Striker',
            period: 'first_half',
          },
        ]),
      });
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toContain('wajib memiliki tim pemilik yang valid');
    });

    it('Rejects goal events with missing or whitespace-only scorer name', () => {
      const fd = createValidFormData({
        goal_events_json: JSON.stringify([
          {
            participant_id: 'participant_a',
            scorer_player_name: '  ',
            period: 'first_half',
          },
        ]),
      });
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toContain('Nama pencetak gol #1 wajib diisi dengan benar');
    });

    it('Rejects goal events with invalid period', () => {
      const fd = createValidFormData({
        goal_events_json: JSON.stringify([
          {
            participant_id: 'participant_a',
            scorer_player_name: 'Luis Diaz',
            period: 'invalid_half',
          },
        ]),
      });
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toContain('Periode/babak untuk gol #1 (Luis Diaz) tidak valid');
    });

    it('Rejects knockout stage match (MD11-MD20) ending in a draw without winner', () => {
      const fd = createValidFormData({
        md_number: '12',
        home_score: '2',
        away_score: '2',
        et_played: 'false',
        pk_played: 'false',
      });
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.error).toContain('Pada Knockout Stage (MD11-MD20), pertandingan yang selesai normal wajib menghasilkan pemenang');
    });
  });

  describe('2. Acceptance and Normalization of Valid Reports & Optional Fields', () => {
    it('Accepts valid input and explicitly sets optional fields to null when omitted', () => {
      const fd = createValidFormData();
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.homeScore).toBe(2);
        expect(res.data.awayScore).toBe(1);
        expect(res.data.paGkName).toBe('Alisson Becker');
        expect(res.data.pbGkName).toBe('Thibaut Courtois');
        expect(res.data.resultScreenshotUrl).toBeNull();
        expect(res.data.matchReportText).toBeNull();
        expect(res.data.validatedGoals.length).toBe(3);
        expect(res.data.validatedGoals[0].scorer_player_name).toBe('Luis Diaz');
        expect(res.data.validatedGoals[0].period).toBe('regular_first_half');
        expect(res.data.validatedGoals[0].minute).toBe(23);
      }
    });

    it('Properly accepts optional screenshot URL and notes when provided', () => {
      const fd = createValidFormData({
        result_screenshot_url: 'https://efimg.aryariap.my.id/evidence/md1_hasil.jpg',
        match_report_text: 'Pertandingan sengit dan sportif.',
      });
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.resultScreenshotUrl).toBe('https://efimg.aryariap.my.id/evidence/md1_hasil.jpg');
        expect(res.data.matchReportText).toBe('Pertandingan sengit dan sportif.');
      }
    });
  });

  describe('3. Database Integrity & Persistence against SQLite Schema', () => {
    it('Persists match, goalkeepers, and goal events with complete integrity into SQLite', async () => {
      const client = createClient({ url: 'file::memory:' });
      const schemaSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'schema.sql'), 'utf8');
      await client.executeMultiple(schemaSql);

      await client.execute({
        sql: `INSERT INTO participants (id, display_name, monogram, is_admin)
              VALUES ('participant_a', 'algojogacor', 'AG', 0), ('participant_b', 'CHarmed', 'CH', 0);`,
        args: [],
      });

      await client.execute({
        sql: `INSERT OR REPLACE INTO matches (id, md_number, phase, status, home_participant_id, away_participant_id)
              VALUES ('MD1', 1, 'group_stage', 'scheduled', 'participant_a', 'participant_b');`,
        args: [],
      });

      const fd = createValidFormData();
      const validation = validateMatchReportInput(fd);
      expect(validation.success).toBe(true);
      if (!validation.success) return;

      const data = validation.data;

      // 1. Update match
      await client.execute({
        sql: `UPDATE matches SET
                status = 'awaiting_confirmation',
                home_score = ?,
                away_score = ?,
                result_screenshot_url = ?,
                match_report_text = ?,
                updated_at = datetime('now')
              WHERE id = ?;`,
        args: [
          data.homeScore,
          data.awayScore,
          data.resultScreenshotUrl,
          data.matchReportText,
          data.matchId,
        ],
      });

      // 2. Insert Goalkeepers
      await client.execute({
        sql: `INSERT INTO goalkeeper_match_records (id, match_id, participant_id, goalkeeper_name, is_starter, remained_full_match, clean_sheet_eligible)
              VALUES (?, ?, ?, ?, 1, ?, ?);`,
        args: ['gk_MD1_pa', 'MD1', 'participant_a', data.paGkName, data.paGkFull, data.awayScore === 0 ? 1 : 0],
      });

      await client.execute({
        sql: `INSERT INTO goalkeeper_match_records (id, match_id, participant_id, goalkeeper_name, is_starter, remained_full_match, clean_sheet_eligible)
              VALUES (?, ?, ?, ?, 1, ?, ?);`,
        args: ['gk_MD1_pb', 'MD1', 'participant_b', data.pbGkName, data.pbGkFull, data.homeScore === 0 ? 1 : 0],
      });

      // 3. Insert Goal Events
      for (let i = 0; i < data.validatedGoals.length; i++) {
        const g = data.validatedGoals[i];
        await client.execute({
          sql: `INSERT INTO match_goal_events (
                  id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
                  scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
          args: [
            `goal_MD1_${i + 1}`,
            'MD1',
            g.scoring_participant_id,
            g.scorer_card_id,
            g.scorer_base_player_id,
            g.scorer_player_name,
            g.scorer_card_version,
            g.minute,
            g.period,
            g.is_own_goal,
          ],
        });
      }

      // Assert Match integrity
      const matchRes = await client.execute({ sql: 'SELECT * FROM matches WHERE id = ?;', args: ['MD1'] });
      expect(matchRes.rows.length).toBe(1);
      expect(Number(matchRes.rows[0].home_score)).toBe(2);
      expect(Number(matchRes.rows[0].away_score)).toBe(1);
      expect(matchRes.rows[0].result_screenshot_url).toBeNull();
      expect(matchRes.rows[0].status).toBe('awaiting_confirmation');

      // Assert Goal Events integrity
      const goalsRes = await client.execute({ sql: 'SELECT * FROM match_goal_events WHERE match_id = ? ORDER BY minute ASC;', args: ['MD1'] });
      expect(goalsRes.rows.length).toBe(3);
      expect(String(goalsRes.rows[0].scorer_player_name)).toBe('Luis Diaz');
      expect(String(goalsRes.rows[0].scoring_participant_id)).toBe('participant_a');
      expect(String(goalsRes.rows[0].scorer_card_id)).toBe('89132919465292');
      expect(Number(goalsRes.rows[0].scorer_base_player_id)).toBe(105234);
      expect(Number(goalsRes.rows[0].minute)).toBe(23);
      expect(String(goalsRes.rows[0].period)).toBe('regular_first_half');

      // Assert Goalkeeper records integrity
      const gkRes = await client.execute({ sql: 'SELECT * FROM goalkeeper_match_records WHERE match_id = ? ORDER BY participant_id ASC;', args: ['MD1'] });
      expect(gkRes.rows.length).toBe(2);
      expect(String(gkRes.rows[0].goalkeeper_name)).toBe('Alisson Becker');
      expect(Number(gkRes.rows[0].clean_sheet_eligible)).toBe(0); // PB scored 1
      expect(String(gkRes.rows[1].goalkeeper_name)).toBe('Thibaut Courtois');
      expect(Number(gkRes.rows[1].clean_sheet_eligible)).toBe(0); // PA scored 2
    });

    it('Fails fast at LibSQL layer when undefined is passed as query argument (no silent masking)', async () => {
      const client = createClient({ url: 'file::memory:' });
      await client.execute('CREATE TABLE test (id TEXT, val TEXT);');

      // Passing undefined to LibSQL execute MUST throw TypeError directly
      let thrownError: any = null;
      try {
        await client.execute({
          sql: 'INSERT INTO test (id, val) VALUES (?, ?);',
          args: ['1', undefined as any],
        });
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(TypeError);
      expect(thrownError.message).toMatch(/undefined cannot be passed as argument|Unsupported type of value/);
    });

    it('Enforces SQLite NOT NULL constraint on match_goal_events columns', async () => {
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
              VALUES ('MD1', 1, 'group_stage', 'scheduled', 'participant_a', 'participant_b');`,
        args: [],
      });

      // Attempting to insert a goal with NULL scorer_player_name must violate SQLite schema constraint
      let constraintError: any = null;
      try {
        await client.execute({
          sql: `INSERT INTO match_goal_events (
                  id, match_id, scoring_participant_id, scorer_player_name, period
                ) VALUES (?, ?, ?, ?, ?);`,
          args: ['g1', 'MD1', 'participant_a', null, 'regular_first_half'],
        });
      } catch (err: any) {
        constraintError = err;
      }

      expect(constraintError).not.toBeNull();
      expect(String(constraintError)).toContain('NOT NULL');
    });
  });

  describe('6. Knockout Stage (MD11+) Stage Settings & Format', () => {
    it('Correctly identifies MD11 as Knockout Stage with Extra Time & PK rules', () => {
      const fd = createValidFormData({
        md_number: '11',
        et_played: '1',
        home_et_score: '3',
        away_et_score: '2',
      });
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.matchSettings.phase).toBe('knockout_stage');
        expect(res.data.matchSettings.extraTimeAllowed).toBe(true);
        expect(res.data.matchSettings.penaltiesAllowed).toBe(true);
        expect(res.data.etPlayed).toBe(true);
        expect(res.data.homeEtScore).toBe(3);
        expect(res.data.awayEtScore).toBe(2);
      }
    });

    it('Rejects drawn results in Knockout Stage when Extra Time is drawn without PK', () => {
      const fd = createValidFormData({
        md_number: '11',
        home_score: '2',
        away_score: '2',
        et_played: '1',
        home_et_score: '2',
        away_et_score: '2',
        pk_played: '0',
      });
      const res = validateMatchReportInput(fd);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('wajib menghasilkan pemenang');
      }
    });
  });
});
