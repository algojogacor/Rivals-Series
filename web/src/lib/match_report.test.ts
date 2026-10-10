import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

describe('Match Report Submission & Screenshot Optionality', () => {
  it('Sanitizes undefined statement arguments to null so LibSQL never throws TypeError', () => {
    type InStatementLike = { sql: string; args: unknown[] };

    function sanitizeInStatement(statement: string | InStatementLike): string | InStatementLike {
      if (typeof statement === 'string') return statement;
      if (Array.isArray(statement.args)) {
        return { sql: statement.sql, args: statement.args.map((a) => (a === undefined ? null : a)) };
      }
      return statement;
    }

    const rawStmt: InStatementLike = {
      sql: 'INSERT INTO test (a, b, c) VALUES (?, ?, ?);',
      args: ['valid', undefined, 123],
    };

    const sanitized = sanitizeInStatement(rawStmt) as InStatementLike;
    expect(sanitized.args).toEqual(['valid', null, 123]);
    expect(sanitized.args[1]).toBeNull();
  });

  it('Handles goal events payload with participant_id and mapped periods against in-memory SQLite schema', async () => {
    const client = createClient({ url: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'schema.sql'), 'utf8');
    await client.executeMultiple(schemaSql);

    // Seed participants to satisfy FK constraints
    await client.execute({
      sql: `INSERT INTO participants (id, display_name, monogram, is_admin) VALUES ('participant_a', 'algojogacor', 'AG', 0), ('participant_b', 'CHarmed', 'CH', 0);`,
      args: [],
    });

    // Seed match MD1
    await client.execute({
      sql: `INSERT OR REPLACE INTO matches (id, md_number, phase, status, home_participant_id, away_participant_id)
            VALUES ('MD1', 1, 'group_stage', 'scheduled', 'participant_a', 'participant_b');`,
      args: [],
    });

    // Test goal event submitted by client (which sends `participant_id` and `'first_half'` period)
    const incomingGoal = {
      participant_id: 'participant_a',
      scorer_player_name: 'Luis Diaz',
      scorer_card_id: '89132919465292',
      minute: 34,
      period: 'first_half',
      is_own_goal: 0,
    };

    const validPeriods = ['regular_first_half', 'regular_second_half', 'extra_time_first_half', 'extra_time_second_half'];
    let period = validPeriods.includes(incomingGoal.period || '') ? incomingGoal.period : 'regular_first_half';
    if (incomingGoal.period === 'first_half') period = 'regular_first_half';
    else if (incomingGoal.period === 'second_half') period = 'regular_second_half';
    else if (incomingGoal.period === 'et') period = 'extra_time_first_half';

    const scoringPartId = incomingGoal.participant_id || 'participant_a';

    await client.execute({
      sql: `INSERT INTO match_goal_events (
              id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
              scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      args: [
        'goal_MD1_1',
        'MD1',
        scoringPartId,
        incomingGoal.scorer_card_id,
        null,
        incomingGoal.scorer_player_name,
        'Showtime',
        incomingGoal.minute,
        period,
        0,
      ],
    });

    const res = await client.execute({ sql: 'SELECT * FROM match_goal_events WHERE match_id = ?;', args: ['MD1'] });
    expect(res.rows.length).toBe(1);
    expect(String(res.rows[0].scorer_player_name)).toBe('Luis Diaz');
    expect(String(res.rows[0].scoring_participant_id)).toBe('participant_a');
    expect(String(res.rows[0].period)).toBe('regular_first_half');
  });

  it('Successfully updates match without a screenshot (result_screenshot_url is null)', async () => {
    const client = createClient({ url: 'file::memory:' });
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'scripts', 'schema.sql'), 'utf8');
    await client.executeMultiple(schemaSql);

    // Seed participants to satisfy FK constraints
    await client.execute({
      sql: `INSERT INTO participants (id, display_name, monogram, is_admin) VALUES ('participant_a', 'algojogacor', 'AG', 0), ('participant_b', 'CHarmed', 'CH', 0);`,
      args: [],
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO matches (id, md_number, phase, status, home_participant_id, away_participant_id)
            VALUES ('MD1', 1, 'group_stage', 'scheduled', 'participant_a', 'participant_b');`,
      args: [],
    });

    const resultScreenshotUrl: string | null = null;
    await client.execute({
      sql: `UPDATE matches SET
              status = 'awaiting_confirmation',
              home_score = 2,
              away_score = 1,
              result_screenshot_url = ?,
              updated_at = datetime('now')
            WHERE id = 'MD1';`,
      args: [resultScreenshotUrl],
    });

    const check = await client.execute({ sql: 'SELECT home_score, away_score, result_screenshot_url FROM matches WHERE id = ?;', args: ['MD1'] });
    expect(check.rows.length).toBe(1);
    expect(Number(check.rows[0].home_score)).toBe(2);
    expect(Number(check.rows[0].away_score)).toBe(1);
    expect(check.rows[0].result_screenshot_url).toBeNull();
  });
});
