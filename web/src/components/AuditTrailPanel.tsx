'use client';

import { useState, useMemo, useTransition } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Monitor,
  Smartphone,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Sparkles,
  Hash,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Participant, ParticipantId } from '@/lib/types';
import {
  AuditCategory,
  AuditEventRecord,
  AuditChainVerification,
  formatWibTimestamp,
  getWibDateKey,
} from '@/lib/audit';
import { markAuditTrailSeenAction } from '@/lib/actions';
import { PlayerTag } from './PlayerTag';

interface AuditTrailPanelProps {
  sessionParticipantId: ParticipantId;
  participants: Participant[];
  events: AuditEventRecord[];
  chainVerification?: AuditChainVerification;
  unreadOpponentCount?: number;
  lastSeenAt?: string | null;
  onMarkedSeen?: () => void;
}

const CATEGORY_META: Record<
  AuditCategory | 'all',
  { label: string; badgeClass: string }
> = {
  all: {
    label: 'Semua Kejadian',
    badgeClass: 'bg-[var(--ink-2)] text-[var(--text)] border-[var(--line)]',
  },
  setup: {
    label: 'Setup & Identitas',
    badgeClass: 'bg-[var(--p-a)]/15 text-[var(--p-a)] border-[var(--p-a)]/30',
  },
  squad: {
    label: 'Skuad & Kartu',
    badgeClass: 'bg-[var(--p-b)]/15 text-[var(--p-b)] border-[var(--p-b)]/30',
  },
  match: {
    label: 'Pertandingan & Sengketa',
    badgeClass: 'bg-[var(--ok)]/15 text-[var(--ok)] border-[var(--ok)]/30',
  },
  mutual: {
    label: 'Hal Bersama & Reset',
    badgeClass: 'bg-[var(--warn)]/15 text-[var(--warn)] border-[var(--warn)]/30',
  },
  security: {
    label: 'Keamanan & Sesi',
    badgeClass: 'bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30',
  },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  season_settings: 'Pengaturan Musim',
  participant: 'Profil Peserta',
  roster_card: 'Kartu Skuad',
  roster_phase: 'Kunci Fase Skuad',
  squad_shortlist: 'Kandidat Sementara (My Team)',
  match: 'Pertandingan',
  dispute: 'Sengketa Resmi',
  goal_nomination: 'Nominasi Gol',
  award_ballot: 'Suara Penghargaan',
  reset_request: 'Permintaan Reset',
  archive: 'Arsip Musim',
  session: 'Sesi Autentikasi',
};

function formatJsonSummary(rawJson: string | null): Array<{ key: string; value: string }> {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') return [];
    const entries: Array<{ key: string; value: string }> = [];
    for (const [k, v] of Object.entries(parsed)) {
      if (v === null || v === undefined || k === 'redacted') continue;
      let formattedVal = '';
      if (typeof v === 'boolean') {
        formattedVal = v ? 'Ya' : 'Tidak';
      } else if (Array.isArray(v)) {
        if (v.length === 0) formattedVal = 'Kosong (0)';
        else if (typeof v[0] === 'object') {
          formattedVal = v
            .map((item: any) =>
              item.player
                ? `${item.player}${item.minute ? ` (${item.minute}')` : ''}`
                : JSON.stringify(item)
            )
            .join(', ');
        } else {
          formattedVal = v.join(', ');
        }
      } else if (typeof v === 'object') {
        formattedVal = Object.entries(v as Record<string, any>)
          .map(([subK, subV]) => {
            if (typeof subV === 'object' && subV !== null) {
              return `${subK}: ${Object.entries(subV)
                .map(([ik, iv]) => `${ik}=${typeof iv === 'boolean' ? (iv ? 'Ya' : 'Tidak') : iv}`)
                .join(', ')}`;
            }
            return `${subK}: ${typeof subV === 'boolean' ? (subV ? 'Ya' : 'Tidak') : subV}`;
          })
          .join(' | ');
      } else {
        formattedVal = String(v);
      }
      entries.push({ key: k, value: formattedVal });
    }
    return entries;
  } catch {
    return [];
  }
}

export function AuditTrailPanel({
  sessionParticipantId,
  participants,
  events,
  chainVerification,
  unreadOpponentCount = 0,
  lastSeenAt,
  onMarkedSeen,
}: AuditTrailPanelProps) {
  const [actorFilter, setActorFilter] = useState<'all' | ParticipantId>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditCategory>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [localSeenAt, setLocalSeenAt] = useState<string | null>(lastSeenAt || null);
  const [localUnreadCount, setLocalUnreadCount] = useState<number>(unreadOpponentCount);
  const [isPending, startTransition] = useTransition();

  const pA = participants.find((p) => p.id === 'participant_a') || {
    id: 'participant_a' as const,
    display_name: 'Peserta A',
    monogram: 'PA',
    is_admin: 1,
  };
  const pB = participants.find((p) => p.id === 'participant_b') || {
    id: 'participant_b' as const,
    display_name: 'Peserta B',
    monogram: 'PB',
    is_admin: 0,
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMarkSeen = () => {
    startTransition(async () => {
      const res = await markAuditTrailSeenAction();
      if (res?.seenAt) {
        setLocalSeenAt(res.seenAt);
        setLocalUnreadCount(0);
        onMarkedSeen?.();
      }
    });
  };

  const resetFilters = () => {
    setActorFilter('all');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (actorFilter !== 'all' && ev.actor_id !== actorFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && ev.category !== categoryFilter) {
        return false;
      }
      if (dateFrom || dateTo) {
        const wibDate = getWibDateKey(ev.timestamp);
        if (dateFrom && wibDate && wibDate < dateFrom) return false;
        if (dateTo && wibDate && wibDate > dateTo) return false;
      }
      if (q) {
        const haystack = [
          ev.reason,
          ev.action,
          ev.actor_name || '',
          ev.entity_type,
          ev.entity_id,
          ev.rule_article || '',
          ev.device_info || '',
          ev.before_json || '',
          ev.after_json || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, actorFilter, categoryFilter, dateFrom, dateTo, searchQuery]);

  const isIntact = chainVerification ? chainVerification.intact : true;

  return (
    <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 sm:p-8 space-y-6">
      {/* Header & Integrity Status Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
              Jejak Audit Aktivitas & Integritas (Pasal 50)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)]">
              Tambah-Saja (Append-Only)
            </span>
          </div>
          <p className="text-[13px] text-[var(--text-dim)]">
            Catatan kronologis permanen seluruh aktivitas kedua peserta dalam waktu WIB. Dilindungi pemicu database anti-hapus & rantai hash SHA-256.
          </p>
        </div>

        {/* Chain Integrity Status Box */}
        <div
          className={`shrink-0 rounded-[8px] border px-4 py-3 flex items-center gap-3 ${
            isIntact
              ? 'bg-[var(--ok)]/10 border-[var(--ok)]/30 text-[var(--ok)]'
              : 'bg-[var(--danger)]/10 border-[var(--danger)]/40 text-[var(--danger)]'
          }`}
        >
          {isIntact ? (
            <ShieldCheck className="w-5 h-5 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 shrink-0" />
          )}
          <div className="text-xs">
            <div className="font-bold uppercase tracking-wider">
              {isIntact ? 'Status: Riwayat Utuh' : 'Peringatan: Ada Ketidakcocokan'}
            </div>
            <div className="text-[11px] opacity-85 font-mono">
              {isIntact
                ? `${chainVerification?.verifiedCount ?? events.length} entri terverifikasi · #${(chainVerification?.latestHash || 'GENESIS').slice(0, 10)}`
                : chainVerification?.brokenReason || 'Rantai hash integritas tidak cocok'}
            </div>
          </div>
        </div>
      </div>

      {/* Unread Opponent Activity Banner ("Ada perubahan baru sejak terakhir kamu melihat") */}
      {localUnreadCount > 0 && (
        <div className="rounded-[8px] bg-[var(--p-a)]/10 border border-[var(--p-a)]/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--p-a)] shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[var(--text)]">
                Ada {localUnreadCount} perubahan baru dari lawan sejak terakhir kamu melihat Jejak Audit
              </div>
              <p className="text-[11px] text-[var(--text-dim)]">
                Entri baru dari lawan ditandai dengan label <span className="font-bold text-[var(--p-a)]">BARU</span> di daftar bawah.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleMarkSeen}
            disabled={isPending}
            className="h-9 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{isPending ? 'Menyimpan…' : 'Tandai Sudah Dilihat'}</span>
          </button>
        </div>
      )}

      {/* Filter Bar: Actor, Category, Date Range (WIB), and Text Search */}
      <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1">
              Cari Teks / Aktivitas
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-faint)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pemain, kartu, MD, pasal..."
                className="w-full h-9 pl-8 pr-3 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none"
              />
            </div>
          </div>

          {/* Actor Filter */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1">
              Pelaku (Pemain)
            </label>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value as any)}
              className="w-full h-9 px-2.5 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
            >
              <option value="all">Semua Pemain</option>
              <option value="participant_a">{pA.display_name} (A)</option>
              <option value="participant_b">{pB.display_name} (B)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1">
              Jenis Kejadian
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full h-9 px-2.5 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
            >
              <option value="all">Semua Jenis Kejadian</option>
              <option value="setup">Setup & Identitas</option>
              <option value="squad">Skuad & Kartu</option>
              <option value="match">Pertandingan & Sengketa</option>
              <option value="mutual">Hal Bersama & Reset</option>
              <option value="security">Keamanan & Sesi</option>
            </select>
          </div>

          {/* Date Range (WIB) */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1">
                Dari (WIB)
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-9 px-2 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-[11px] text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-1">
                Sampai (WIB)
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-9 px-2 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-[11px] text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary & Quick Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)] text-[11px] text-[var(--text-dim)]">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-faint)]" />
            <span>
              Menampilkan <strong className="text-[var(--text)]">{filteredEvents.length}</strong> dari{' '}
              <strong className="text-[var(--text)]">{events.length}</strong> catatan aktivitas
            </span>
          </div>

          {(actorFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo || searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--p-a)] hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Chronological Activity List (Newest First) */}
      {filteredEvents.length === 0 ? (
        <div className="p-10 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-center space-y-2">
          <p className="text-sm font-bold text-[var(--text)]">Tidak Ada Catatan Aktivitas yang Cocok</p>
          <p className="text-xs text-[var(--text-dim)]">
            Coba ubah saringan pemain, kategori, tanggal, atau kata kunci pencarian di atas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev) => {
            const actorP = ev.actor_id === 'participant_a' ? pA : pB;
            const catMeta = CATEGORY_META[ev.category] || CATEGORY_META.setup;
            const entityLabel = ENTITY_TYPE_LABELS[ev.entity_type] || ev.entity_type;
            const beforeItems = formatJsonSummary(ev.before_json);
            const afterItems = formatJsonSummary(ev.after_json);
            const hasDiff = beforeItems.length > 0 || afterItems.length > 0;
            const isExpanded = Boolean(expandedIds[ev.id]);
            const isUnreadFromOpponent =
              ev.actor_id !== sessionParticipantId &&
              (!localSeenAt || ev.timestamp > localSeenAt);
            const isMobileOrigin = (ev.device_info || '').toLowerCase().includes('ponsel');

            return (
              <div
                key={ev.id}
                className={`rounded-[10px] border transition-colors overflow-hidden ${
                  isUnreadFromOpponent
                    ? 'bg-[var(--ink-2)] border-[var(--p-a)]/50'
                    : 'bg-[var(--ink-2)] border-[var(--line)]'
                }`}
              >
                <div className="p-4 space-y-2.5">
                  {/* Top Row: Actor + Category Badge + Rule Article + WIB Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlayerTag
                        id={ev.actor_id}
                        name={ev.actor_name || actorP.display_name}
                        monogram={actorP.monogram}
                        size="sm"
                      />

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${catMeta.badgeClass}`}
                      >
                        {catMeta.label}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text-dim)]">
                        {entityLabel}: {ev.is_redacted ? 'Dirahasiakan' : ev.entity_id}
                      </span>

                      {ev.rule_article && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text-faint)]">
                          {ev.rule_article}
                        </span>
                      )}

                      {isUnreadFromOpponent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[var(--p-a)] text-[var(--ink-0)]">
                          BARU
                        </span>
                      )}

                      {ev.is_redacted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--warn)]/15 text-[var(--warn)] border border-[var(--warn)]/30">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Kartu Lawan Dirahasiakan</span>
                        </span>
                      )}
                    </div>

                    {/* WIB Timestamp */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-dim)] shrink-0">
                      <Calendar className="w-3 h-3 text-[var(--text-faint)]" />
                      <span>{formatWibTimestamp(ev.timestamp)}</span>
                    </div>
                  </div>

                  {/* Main Human-Readable Indonesian Sentence */}
                  <p className="text-[13px] sm:text-sm font-medium text-[var(--text)] leading-relaxed">
                    {ev.reason}
                  </p>

                  {/* Inline Compact Diff Preview (Before -> After) */}
                  {hasDiff && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(ev.id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isExpanded
                            ? 'Sembunyikan Rincian Perubahan (Sebelum & Sesudah)'
                            : `Lihat Rincian Perubahan (${beforeItems.length > 0 ? 'Sebelum & Sesudah' : 'Ringkasan Data'})`}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-3.5 text-xs">
                          {/* Before Box */}
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] flex items-center gap-1">
                              <span>Sebelum Perubahan</span>
                            </div>
                            {beforeItems.length > 0 ? (
                              <dl className="space-y-1">
                                {beforeItems.map((item) => (
                                  <div key={item.key} className="flex items-baseline justify-between gap-2 border-b border-[var(--line)]/50 pb-1 last:border-none">
                                    <dt className="text-[11px] text-[var(--text-dim)] font-mono">{item.key}</dt>
                                    <dd className="text-[11px] text-[var(--text)] font-medium text-right break-all">{item.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <p className="text-[11px] text-[var(--text-faint)] italic">
                                Tidak ada data sebelumnya (entri baru).
                              </p>
                            )}
                          </div>

                          {/* After Box */}
                          <div className="space-y-1.5 md:border-l md:border-[var(--line)] md:pl-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ok)] flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              <span>Sesudah Perubahan</span>
                            </div>
                            {afterItems.length > 0 ? (
                              <dl className="space-y-1">
                                {afterItems.map((item) => (
                                  <div key={item.key} className="flex items-baseline justify-between gap-2 border-b border-[var(--line)]/50 pb-1 last:border-none">
                                    <dt className="text-[11px] text-[var(--text-dim)] font-mono">{item.key}</dt>
                                    <dd className="text-[11px] text-[var(--text)] font-medium text-right break-all">{item.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <p className="text-[11px] text-[var(--text-faint)] italic">
                                Tidak ada rincian tambahan.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Metadata: Coarse Device Origin + Hash Chain Signature */}
                  <div className="pt-2 border-t border-[var(--line)]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-faint)]">
                    <div className="flex items-center gap-1.5">
                      {isMobileOrigin ? (
                        <Smartphone className="w-3 h-3" />
                      ) : (
                        <Monitor className="w-3 h-3" />
                      )}
                      <span>Asal: {ev.device_info || 'Perangkat Web'}</span>
                    </div>

                    {ev.entry_hash && (
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span title={`Prev Hash: ${ev.prev_hash || 'GENESIS'}`}>
                          prev: {(ev.prev_hash || 'GENESIS').slice(0, 8)}
                        </span>
                        <span>→</span>
                        <span
                          className="text-[var(--text-dim)] font-semibold"
                          title={`Entry SHA-256: ${ev.entry_hash}`}
                        >
                          <Hash className="w-2.5 h-2.5 inline -mt-0.5" />
                          {ev.entry_hash.slice(0, 10)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
