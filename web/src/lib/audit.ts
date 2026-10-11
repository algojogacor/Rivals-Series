// RIVALS SERIES SEASON 1 (RS S1) IMMUTABLE AUDIT TRAIL & INTEGRITY ENGINE
// Implements:
// 1. Secret/PIN sanitization (never writes PINs, tokens, cookies, or secrets)
// 2. Coarse device origin parsing (privacy-preserving device + browser summary)
// 3. Cryptographic SHA-256 hash chain (prev_hash -> entry_hash) & chain verification
// 4. Server-side opponent squad secrecy redaction before both squads are locked
// 5. WIB (Asia/Jakarta) timestamp formatting

import crypto from 'crypto';
import { ParticipantId } from './types';

export type AuditCategory = 'setup' | 'squad' | 'match' | 'mutual' | 'security';

export interface AuditEventRecord {
  id: string;
  actor_id: ParticipantId;
  actor_name?: string | null;
  category: AuditCategory;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: string | null;
  after_json: string | null;
  reason: string;
  rule_article: string | null;
  device_info: string | null;
  prev_hash: string | null;
  entry_hash: string | null;
  timestamp: string;
  is_redacted?: boolean;
}

export interface AuditChainVerification {
  intact: boolean;
  totalEntries: number;
  verifiedCount: number;
  brokenAtId: string | null;
  brokenReason: string | null;
  latestHash: string | null;
}

const SENSITIVE_KEY_PATTERN =
  /^(pin|password|passwd|secret|token|auth_token|access_token|refresh_token|cookie|session_token|api_key|private_key|authorization)$/i;

/**
 * Recursively strips any sensitive keys (PIN, token, secret, password, cookie)
 * from an object before it is serialized to JSON for audit logging.
 */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditPayload(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (
        SENSITIVE_KEY_PATTERN.test(k) ||
        k.toLowerCase().includes('pin') ||
        k.toLowerCase().includes('secret') ||
        k.toLowerCase().includes('token') ||
        k.toLowerCase().includes('setup_key')
      ) {
        continue;
      }
      out[k] = sanitizeAuditPayload(v);
    }
    return out;
  }
  return value;
}

/**
 * Parses a raw User-Agent header into a coarse, privacy-preserving origin label
 * e.g. "Desktop · Windows (Chrome)" or "Ponsel · Android (Chrome)"
 * Never stores raw IP addresses or full fingerprinting strings.
 */
export function parseCoarseDeviceOrigin(userAgent?: string | null): string {
  if (!userAgent || !userAgent.trim()) {
    return 'Perangkat Web';
  }
  const ua = userAgent.toLowerCase();

  let formFactor = 'Desktop';
  if (ua.includes('ipad') || ua.includes('tablet')) {
    formFactor = 'Tablet';
  } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    formFactor = 'Ponsel';
  }

  let os = 'OS Lain';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os') || ua.includes('macintosh')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  let browser = 'Browser';
  if (ua.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    browser = 'Opera';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
  }

  return `${formFactor} · ${os} (${browser})`;
}

/**
 * Infers the high-level audit category from the action or entity_type when not explicitly supplied.
 */
export function inferAuditCategory(action: string, entityType: string): AuditCategory {
  const act = action.toLowerCase();
  const ent = entityType.toLowerCase();

  if (
    act.includes('login') ||
    act.includes('logout') ||
    act.includes('pin') ||
    act.includes('auth') ||
    act.includes('invite_expired') ||
    ent === 'security' ||
    ent === 'session'
  ) {
    return 'security';
  }

  if (
    act.includes('roster') ||
    act.includes('squad') ||
    act.includes('shortlist') ||
    act.includes('card') ||
    ent === 'roster_card' ||
    ent === 'roster_phase' ||
    ent === 'squad_shortlist'
  ) {
    return 'squad';
  }

  if (
    act.includes('match') ||
    act.includes('dispute') ||
    act.includes('goal') ||
    act.includes('ballot') ||
    ent === 'match' ||
    ent === 'dispute' ||
    ent === 'goal_nomination' ||
    ent === 'award_ballot'
  ) {
    return 'match';
  }

  if (
    act.includes('reset') ||
    act.includes('archive') ||
    ent === 'reset_request' ||
    ent === 'archive'
  ) {
    return 'mutual';
  }

  return 'setup';
}

/**
 * Computes a deterministic SHA-256 hash for an audit entry linked to `prevHash`.
 */
export function computeAuditEntryHash(params: {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: string | null;
  after_json: string | null;
  reason: string;
  timestamp: string;
  prev_hash: string;
}): string {
  const canonicalPayload = JSON.stringify([
    params.prev_hash || 'GENESIS',
    params.id,
    params.actor_id,
    params.action,
    params.entity_type,
    params.entity_id,
    params.before_json ?? '',
    params.after_json ?? '',
    params.reason,
    params.timestamp,
  ]);
  return crypto.createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}

/**
 * Verifies the cryptographic hash chain of audit events.
 * Expects events in any order; sorts them chronologically (oldest first) to walk the chain.
 */
export function verifyAuditChain(events: AuditEventRecord[]): AuditChainVerification {
  if (!events || events.length === 0) {
    return {
      intact: true,
      totalEntries: 0,
      verifiedCount: 0,
      brokenAtId: null,
      brokenReason: null,
      latestHash: 'GENESIS',
    };
  }

  // Sort oldest -> newest by timestamp, tie-breaking by id order if needed
  // Since `getAllAuditEvents` returns newest first (ORDER BY rowid DESC / timestamp DESC),
  // reversing a DESC list preserves exact insertion order.
  const chronological = [...events].reverse();

  const verifiedHashes = new Set<string>(['GENESIS']);
  let expectedPrevHash = 'GENESIS';
  let verifiedCount = 0;

  for (let i = 0; i < chronological.length; i++) {
    const ev = chronological[i];
    if (!ev.entry_hash || !ev.prev_hash) {
      return {
        intact: false,
        totalEntries: chronological.length,
        verifiedCount,
        brokenAtId: ev.id,
        brokenReason: `Entri ${ev.id} tidak memiliki tanda tangan hash integritas.`,
        latestHash: expectedPrevHash,
      };
    }

    const isLinear = i === 0 ? ev.prev_hash === 'GENESIS' : ev.prev_hash === expectedPrevHash;
    const isConcurrentSibling =
      !isLinear &&
      i > 0 &&
      verifiedHashes.has(ev.prev_hash) &&
      chronological[i - 1]?.prev_hash === ev.prev_hash;

    if (!isLinear && !isConcurrentSibling) {
      return {
        intact: false,
        totalEntries: chronological.length,
        verifiedCount,
        brokenAtId: ev.id,
        brokenReason: `Rantai hash terputus sebelum entri ${ev.id} (prev_hash tidak cocok).`,
        latestHash: expectedPrevHash,
      };
    }

    const recomputed = computeAuditEntryHash({
      id: ev.id,
      actor_id: ev.actor_id,
      action: ev.action,
      entity_type: ev.entity_type,
      entity_id: ev.entity_id,
      before_json: ev.before_json,
      after_json: ev.after_json,
      reason: ev.reason,
      timestamp: ev.timestamp,
      prev_hash: ev.prev_hash,
    });

    if (recomputed !== ev.entry_hash) {
      return {
        intact: false,
        totalEntries: chronological.length,
        verifiedCount,
        brokenAtId: ev.id,
        brokenReason: `Isi entri ${ev.id} tidak sesuai dengan entry_hash yang tercatat.`,
        latestHash: expectedPrevHash,
      };
    }

    verifiedHashes.add(ev.entry_hash);
    expectedPrevHash = ev.entry_hash;
    verifiedCount++;
  }

  return {
    intact: true,
    totalEntries: chronological.length,
    verifiedCount,
    brokenAtId: null,
    brokenReason: null,
    latestHash: expectedPrevHash,
  };
}

/**
 * Redacts opponent squad card details on the server before both participants have locked
 * their squads for that phase (Pasal 14 & DESIGN.md secrecy rule).
 * Important: Chain verification MUST be run on raw events BEFORE calling this function,
 * because redaction masks `reason`, `before_json`, `after_json`, and `entity_id` for the viewer.
 */
export function redactAuditEventsForViewer(params: {
  events: AuditEventRecord[];
  viewerId: ParticipantId | null;
  phase1BothLocked: boolean;
  phase2BothLocked: boolean;
  participantNames?: Record<ParticipantId, string>;
}): AuditEventRecord[] {
  const {
    events,
    viewerId,
    phase1BothLocked,
    phase2BothLocked,
    participantNames = { participant_a: 'Pemain A', participant_b: 'Pemain B' },
  } = params;

  return events.map((ev) => {
    const category = ev.category || inferAuditCategory(ev.action, ev.entity_type);
    if (category !== 'squad') {
      return ev;
    }

    // Locking the squad ("lock_participant_squad") or initializing phase 2 does not leak individual card names,
    // EXCEPT if before_json/after_json contains a card list. Let's inspect what action it is.
    const isOpponentEvent = !viewerId || ev.actor_id !== viewerId;
    if (!isOpponentEvent) {
      return ev;
    }

    // Determine which phase this squad event belongs to
    let phase = 1;
    if (
      ev.entity_id.includes('_p2_') ||
      ev.entity_id.includes('phase_2') ||
      ev.reason.includes('Fase 2')
    ) {
      phase = 2;
    } else if (ev.after_json) {
      try {
        const parsed = JSON.parse(ev.after_json);
        if (Number(parsed?.phase) === 2) phase = 2;
      } catch {
        // ignore
      }
    }

    const isPhaseLockedByBoth = phase === 2 ? phase2BothLocked : phase1BothLocked;

    // Shortlist ("My Team") is private candidate preparation; keep opponent shortlist details hidden while phase is unlocked
    const isCardLevelSecret =
      ev.action === 'add_roster_card' ||
      ev.action === 'add_efootball_roster_card' ||
      ev.action === 'remove_roster_card' ||
      ev.action === 'update_roster_card_slot' ||
      ev.action === 'add_shortlist_card' ||
      ev.action === 'remove_shortlist_card' ||
      ev.entity_type === 'roster_card' ||
      ev.entity_type === 'squad_shortlist';

    if (!isPhaseLockedByBoth && isCardLevelSecret) {
      const actorLabel = ev.actor_name || participantNames[ev.actor_id] || ev.actor_id;
      let genericReason = `${actorLabel} melakukan aktivitas penyusunan skuad Fase ${phase} (rincian kartu dirahasiakan sampai kedua skuad terkunci).`;

      if (ev.action === 'add_roster_card' || ev.action === 'add_efootball_roster_card') {
        genericReason = `${actorLabel} menambahkan 1 kartu ke skuad Fase ${phase} (nama kartu dirahasiakan sampai kedua skuad terkunci).`;
      } else if (ev.action === 'remove_roster_card') {
        genericReason = `${actorLabel} menghapus 1 kartu dari skuad Fase ${phase} (nama kartu dirahasiakan sampai kedua skuad terkunci).`;
      } else if (ev.action === 'update_roster_card_slot') {
        genericReason = `${actorLabel} mengatur slot posisi kartu di skuad Fase ${phase} (rincian kartu dirahasiakan sampai kedua skuad terkunci).`;
      } else if (ev.action === 'add_shortlist_card' || ev.action === 'remove_shortlist_card' || ev.entity_type === 'squad_shortlist') {
        genericReason = `${actorLabel} memperbarui daftar kandidat sementara / My Team (rincian kartu dirahasiakan sampai kedua skuad terkunci).`;
      }

      return {
        ...ev,
        entity_id: `redacted_phase_${phase}`,
        before_json: null,
        after_json: JSON.stringify({
          redacted: true,
          phase,
          note: 'Rincian kartu skuad lawan disembunyikan hingga kedua peserta mengunci skuad (Pasal 14).',
        }),
        reason: genericReason,
        is_redacted: true,
      };
    }

    return ev;
  });
}

/**
 * Formats an ISO or SQLite UTC timestamp into Indonesian WIB (Asia/Jakarta) display string.
 * SQLite `datetime('now')` produces "YYYY-MM-DD HH:MM:SS" in UTC.
 */
export function formatWibTimestamp(rawTimestamp?: string | null): string {
  if (!rawTimestamp) return '—';
  const normalized =
    rawTimestamp.includes('T') || rawTimestamp.endsWith('Z')
      ? rawTimestamp
      : `${rawTimestamp.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    return rawTimestamp;
  }

  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return `${formatted} WIB`;
}

/**
 * Returns YYYY-MM-DD in WIB (Asia/Jakarta) for date filtering in the UI.
 */
export function getWibDateKey(rawTimestamp?: string | null): string {
  if (!rawTimestamp) return '';
  const normalized =
    rawTimestamp.includes('T') || rawTimestamp.endsWith('Z')
      ? rawTimestamp
      : `${rawTimestamp.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')?.value || '';
  const m = parts.find((p) => p.type === 'month')?.value || '';
  const d = parts.find((p) => p.type === 'day')?.value || '';
  return `${y}-${m}-${d}`;
}
