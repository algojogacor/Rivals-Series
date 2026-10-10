// RIVALS SERIES SEASON 1 (RS S1) - TAMPER-EVIDENT AUDIT TRAIL TESTS
// Verifies Pasal 50 & Pasal 54 compliance: secret sanitization, SHA-256 hash chain,
// opponent squad secrecy redaction, and SQLite append-only triggers.

import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import {
  sanitizeAuditPayload,
  parseCoarseDeviceOrigin,
  inferAuditCategory,
  computeAuditEntryHash,
  verifyAuditChain,
  redactAuditEventsForViewer,
  formatWibTimestamp,
  getWibDateKey,
  AuditEventRecord,
} from './audit';

describe('Rivals Series Season 1: Jejak Audit Kekal (Pasal 50 & 54) Test Suite', () => {
  it('Criterion 1: Strips PINs, tokens, passwords, and secrets from audit payloads (including nested objects)', () => {
    const raw = {
      participant_id: 'participant_a',
      display_name: 'yayakgacor',
      pin: '1234',
      participant_a_pin: '1111',
      access_token: 'secret-jwt-token',
      nested: {
        safe_field: 'ok',
        cookie: 'rivals_session=xyz',
        password_hash: 'abcd',
        secretKey: 'top-secret',
      },
    };

    const sanitized = sanitizeAuditPayload(raw) as Record<string, any>;
    const sanitizedJson = JSON.stringify(sanitized);

    expect(sanitized.participant_id).toBe('participant_a');
    expect(sanitized.display_name).toBe('yayakgacor');
    expect(sanitized.pin).toBeUndefined();
    expect(sanitized.participant_a_pin).toBeUndefined();
    expect(sanitized.access_token).toBeUndefined();
    expect(sanitized.nested.safe_field).toBe('ok');
    expect(sanitized.nested.cookie).toBeUndefined();
    expect(sanitized.nested.secretKey).toBeUndefined();
    expect(sanitizedJson).not.toContain('1234');
    expect(sanitizedJson).not.toContain('secret-jwt-token');
  });

  it('Criterion 2: Parses coarse device origin without leaking IP or full User-Agent', () => {
    const winChrome = parseCoarseDeviceOrigin(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );
    expect(winChrome).toBe('Desktop · Windows (Chrome)');

    const androidFirefox = parseCoarseDeviceOrigin(
      'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0'
    );
    expect(androidFirefox).toBe('Ponsel · Android (Firefox)');

    const iphoneSafari = parseCoarseDeviceOrigin(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    );
    expect(iphoneSafari).toBe('Ponsel · iOS (Safari)');
  });

  it('Criterion 3: Builds and verifies a tamper-evident SHA-256 hash chain and detects modifications', () => {
    const e1Base = {
      id: 'audit-1',
      timestamp: '2026-10-10 12:00:00',
      actor_id: 'participant_a' as const,
      action: 'complete_season_setup',
      entity_type: 'season_settings',
      entity_id: 'season_status',
      before_json: JSON.stringify(sanitizeAuditPayload({ status: 'setup_pending' })),
      after_json: JSON.stringify(sanitizeAuditPayload({ status: 'active' })),
      reason: 'yayakgacor membuka musim resmi Rivals Series Season 1',
      prev_hash: 'GENESIS',
    };
    const e1Hash = computeAuditEntryHash(e1Base);

    const e2Base = {
      id: 'audit-2',
      timestamp: '2026-10-10 12:05:00',
      actor_id: 'participant_a' as const,
      action: 'lock_participant_squad',
      entity_type: 'roster_phase',
      entity_id: 'phase_1_participant_a',
      before_json: JSON.stringify(sanitizeAuditPayload({ locked: false, total_cards: 26 })),
      after_json: JSON.stringify(sanitizeAuditPayload({ locked: true, total_cards: 26, trending_cards: 4 })),
      reason: 'yayakgacor mengunci skuad Fase 1 (26 kartu, 4 Trending, 2 Indonesia)',
      prev_hash: e1Hash,
    };
    const e2Hash = computeAuditEntryHash(e2Base);

    const chainDesc: AuditEventRecord[] = [
      {
        ...e2Base,
        actor_name: 'yayakgacor',
        category: inferAuditCategory(e2Base.action, e2Base.entity_type),
        rule_article: 'Pasal 14 & Pasal 15',
        device_info: 'Desktop · Windows (Chrome)',
        entry_hash: e2Hash,
      },
      {
        ...e1Base,
        actor_name: 'yayakgacor',
        category: inferAuditCategory(e1Base.action, e1Base.entity_type),
        rule_article: 'Pasal 1 & Pasal 50',
        device_info: 'Desktop · Windows (Chrome)',
        entry_hash: e1Hash,
      },
    ];

    const validResult = verifyAuditChain(chainDesc);
    expect(validResult.intact).toBe(true);
    expect(validResult.totalEntries).toBe(2);
    expect(validResult.verifiedCount).toBe(2);
    expect(validResult.brokenAtId).toBeNull();

    // Tamper with reason in entry 1
    const tamperedReasonChain: AuditEventRecord[] = [
      chainDesc[0],
      {
        ...chainDesc[1],
        reason: 'yayakgacor mengubah alasan secara diam-diam',
      },
    ];
    const tamperedResult = verifyAuditChain(tamperedReasonChain);
    expect(tamperedResult.intact).toBe(false);
    expect(tamperedResult.brokenAtId).toBe('audit-1');

    // Tamper with prev_hash in entry 2
    const brokenLinkChain: AuditEventRecord[] = [
      {
        ...chainDesc[0],
        prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      },
      chainDesc[1],
    ];
    const brokenResult = verifyAuditChain(brokenLinkChain);
    expect(brokenResult.intact).toBe(false);
    expect(brokenResult.brokenAtId).toBe('audit-2');
  });

  it('Criterion 4: Redacts opponent squad card & shortlist details before both squads are locked (server-side secrecy)', () => {
    const events: AuditEventRecord[] = [
      {
        id: 'ev-own-card',
        timestamp: '2026-10-10 12:01:00',
        actor_id: 'participant_a',
        actor_name: 'yayakgacor',
        category: 'squad',
        action: 'add_efootball_roster_card',
        entity_type: 'roster_card',
        entity_id: 'card-a-1',
        before_json: null,
        after_json: JSON.stringify({ phase: 1, player_name: 'Kylian Mbappé', card_type: 'Trending' }),
        reason: 'yayakgacor menambahkan Kylian Mbappé (CF · OVR 101 · Trending) ke skuad Fase 1',
        rule_article: 'Pasal 14 & Pasal 16',
        device_info: 'Desktop · Windows (Chrome)',
        prev_hash: 'GENESIS',
        entry_hash: 'hash-1',
      },
      {
        id: 'ev-opp-card',
        timestamp: '2026-10-10 12:02:00',
        actor_id: 'participant_b',
        actor_name: 'algojogacor',
        category: 'squad',
        action: 'add_efootball_roster_card',
        entity_type: 'roster_card',
        entity_id: 'card-b-1',
        before_json: null,
        after_json: JSON.stringify({ phase: 1, player_name: 'Lionel Messi', card_type: 'Epic' }),
        reason: 'algojogacor menambahkan Lionel Messi (RWF · OVR 103 · Epic) ke skuad Fase 1',
        rule_article: 'Pasal 14 & Pasal 16',
        device_info: 'Ponsel · Android (Chrome)',
        prev_hash: 'hash-1',
        entry_hash: 'hash-2',
      },
      {
        id: 'ev-opp-shortlist',
        timestamp: '2026-10-10 12:03:00',
        actor_id: 'participant_b',
        actor_name: 'algojogacor',
        category: 'squad',
        action: 'add_shortlist_card',
        entity_type: 'squad_shortlist',
        entity_id: 'short-b-1',
        before_json: null,
        after_json: JSON.stringify({ player_name: 'Marselino Ferdinan' }),
        reason: 'algojogacor menyimpan Marselino Ferdinan ke daftar kandidat sementara (My Team)',
        rule_article: 'Pasal 14',
        device_info: 'Ponsel · Android (Chrome)',
        prev_hash: 'hash-2',
        entry_hash: 'hash-3',
      },
      {
        id: 'ev-opp-lock',
        timestamp: '2026-10-10 12:04:00',
        actor_id: 'participant_b',
        actor_name: 'algojogacor',
        category: 'squad',
        action: 'lock_participant_squad',
        entity_type: 'roster_phase',
        entity_id: 'phase_1_participant_b',
        before_json: JSON.stringify({ locked: false }),
        after_json: JSON.stringify({ locked: true, total_cards: 26 }),
        reason: 'algojogacor mengunci skuad Fase 1 (26 kartu, 3 Trending, 1 Indonesia)',
        rule_article: 'Pasal 14 & Pasal 15',
        device_info: 'Ponsel · Android (Chrome)',
        prev_hash: 'hash-3',
        entry_hash: 'hash-4',
      },
    ];

    // Before both squads are locked: viewer is participant_a
    const beforeBothLocked = redactAuditEventsForViewer({
      events,
      viewerId: 'participant_a',
      phase1BothLocked: false,
      phase2BothLocked: false,
    });

    // Own card is visible
    expect(beforeBothLocked[0].is_redacted).toBeUndefined();
    expect(beforeBothLocked[0].reason).toContain('Kylian Mbappé');
    expect(beforeBothLocked[0].after_json).toContain('Kylian Mbappé');

    // Opponent's roster card is redacted
    expect(beforeBothLocked[1].is_redacted).toBe(true);
    expect(beforeBothLocked[1].reason).not.toContain('Lionel Messi');
    expect(beforeBothLocked[1].after_json).not.toContain('Lionel Messi');
    expect(beforeBothLocked[1].before_json).toBeNull();

    // Opponent's shortlist is redacted
    expect(beforeBothLocked[2].is_redacted).toBe(true);
    expect(beforeBothLocked[2].reason).not.toContain('Marselino Ferdinan');
    expect(beforeBothLocked[2].after_json).not.toContain('Marselino Ferdinan');

    // Opponent's SQUAD_LOCKED event is public/visible
    expect(beforeBothLocked[3].is_redacted).toBeUndefined();
    expect(beforeBothLocked[3].reason).toContain('mengunci skuad Fase 1');

    // After both Phase 1 squads are locked:
    const afterBothLocked = redactAuditEventsForViewer({
      events,
      viewerId: 'participant_a',
      phase1BothLocked: true,
      phase2BothLocked: false,
    });

    // Opponent's Phase 1 roster card is now unredacted!
    expect(afterBothLocked[1].is_redacted).toBeUndefined();
    expect(afterBothLocked[1].reason).toContain('Lionel Messi');
    expect(afterBothLocked[1].after_json).toContain('Lionel Messi');
  });

  it('Criterion 5: Formats timestamps in WIB (UTC+7) accurately', () => {
    const wibDisplay = formatWibTimestamp('2026-10-10 12:30:00');
    expect(wibDisplay).toContain('19.30.00 WIB');
    expect(getWibDateKey('2026-10-10 18:30:00')).toBe('2026-10-11');
  });

  it('Criterion 6: Enforces SQLite append-only triggers (rejects UPDATE and DELETE on audit_events)', async () => {
    const client = createClient({ url: 'file::memory:' });
    const schemaSql = fs.readFileSync(
      path.join(process.cwd(), 'scripts', 'schema.sql'),
      'utf8'
    );
    await client.executeMultiple(schemaSql);

    // Seed participant_a to satisfy FOREIGN KEY (actor_id) REFERENCES participants(id)
    await client.execute({
      sql: `INSERT INTO participants (id, display_name, monogram, is_admin) VALUES ('participant_a', 'yayakgacor', 'YG', 1)`,
      args: [],
    });

    await client.execute({
      sql: `INSERT INTO audit_events (
              id, timestamp, actor_id, actor_name, category, action, entity_type, entity_id,
              before_json, after_json, reason, rule_article, device_info, prev_hash, entry_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        'audit-immutable-1',
        '2026-10-10 12:00:00',
        'participant_a',
        'yayakgacor',
        'security',
        'login_success',
        'session',
        'participant_a',
        null,
        '{"status":"authenticated"}',
        'yayakgacor berhasil masuk ke Pusat Kontrol',
        'Pasal 50',
        'Desktop · Windows (Chrome)',
        'GENESIS',
        'abc123hash',
      ],
    });

    // Attempt to UPDATE an audit row must fail
    await expect(
      client.execute({
        sql: `UPDATE audit_events SET reason = 'diubah diam-diam' WHERE id = 'audit-immutable-1'`,
        args: [],
      })
    ).rejects.toThrow(/append-only/i);

    // Attempt to DELETE an audit row must fail
    await expect(
      client.execute({
        sql: `DELETE FROM audit_events WHERE id = 'audit-immutable-1'`,
        args: [],
      })
    ).rejects.toThrow(/append-only/i);

    // Verify the row is still intact
    const check = await client.execute(`SELECT reason FROM audit_events WHERE id = 'audit-immutable-1'`);
    expect(check.rows.length).toBe(1);
    expect(String(check.rows[0].reason)).toBe('yayakgacor berhasil masuk ke Pusat Kontrol');
  });
});
