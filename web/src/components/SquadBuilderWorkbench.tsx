'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Search,
  Sparkles,
  Flag,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Bookmark,
  Scale,
  Check,
  AlertCircle,
  Loader2,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Layers,
  LayoutGrid,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Participant,
  ParticipantId,
  RosterCard,
  RosterPhaseStatus,
} from '@/lib/types';
import {
  addEfootballRosterCardAction,
  removeRosterCardAction,
  updateRosterCardSlotAction,
  toggleShortlistCardAction,
  lockParticipantSquadAction,
  initializePhase2SquadAction,
  loginParticipantAction,
  logoutParticipantAction,
} from '@/lib/actions';
import {
  OFFENSIVE_PLAYSTYLE_IDS,
  DEFENSIVE_PLAYSTYLE_IDS,
  PLAYSTYLE_MAP,
  getStatTierColor,
} from '@/lib/efhub-constants';
import { PlayerAvatar } from './PlayerAvatar';
import { PlayerDetailModal } from './PlayerDetailModal';
import { PlayerTag } from './PlayerTag';

interface SquadBuilderWorkbenchProps {
  session: {
    participantId: ParticipantId;
    participant: Participant;
    isAdmin: boolean;
  } | null;
  participants: Participant[];
  initialPhase?: number;
  phase1Status: RosterPhaseStatus;
  phase2Status?: RosterPhaseStatus;
  visibleCardsPhase1: RosterCard[];
  visibleCardsPhase2?: RosterCard[];
  shortlistCards?: any[];
  paSummaryPhase1: { count: number; trending: number; indo: number };
  pbSummaryPhase1: { count: number; trending: number; indo: number };
  onSquadLockedChange?: () => void;
}

const POSITIONS = [
  'ALL',
  'CF',
  'SS',
  'LWF',
  'RWF',
  'AMF',
  'LMF',
  'RMF',
  'CMF',
  'DMF',
  'LB',
  'RB',
  'CB',
  'GK',
];

const CARD_TYPES = [
  { value: 'ALL', label: 'Semua Tipe Kartu' },
  { value: 'Trending', label: 'Trending (Wajib Min. 2)' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Highlight', label: 'Highlight' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Show Time', label: 'Show Time' },
  { value: 'Featured', label: 'Featured' },
  { value: 'Big Time', label: 'Big Time' },
  { value: 'Legend', label: 'Legend' },
];

const FORMATION_SLOTS = [
  { code: 'LWF', label: 'LWF', line: 'FWD' },
  { code: 'CF', label: 'CF', line: 'FWD' },
  { code: 'RWF', label: 'RWF', line: 'FWD' },
  { code: 'CMF1', label: 'CMF / AMF (Kiri)', line: 'MID' },
  { code: 'DMF', label: 'DMF / CMF (Tengah)', line: 'MID' },
  { code: 'CMF2', label: 'CMF / AMF (Kanan)', line: 'MID' },
  { code: 'LB', label: 'LB', line: 'DEF' },
  { code: 'CB1', label: 'CB (Kiri)', line: 'DEF' },
  { code: 'CB2', label: 'CB (Kanan)', line: 'DEF' },
  { code: 'RB', label: 'RB', line: 'DEF' },
  { code: 'GK', label: 'GK (Starter)', line: 'GK' },
];

export function SquadBuilderWorkbench({
  session,
  participants,
  initialPhase = 1,
  phase1Status,
  phase2Status,
  visibleCardsPhase1,
  visibleCardsPhase2 = [],
  shortlistCards = [],
  paSummaryPhase1,
  pbSummaryPhase1,
  onSquadLockedChange,
}: SquadBuilderWorkbenchProps) {
  const [activePhase, setActivePhase] = useState<number>(initialPhase);
  const [activeSubTab, setActiveSubTab] = useState<
    'search' | 'shortlist' | 'my_squad' | 'opponent_squad'
  >('search');
  const [statMode, setStatMode] = useState<'lv1' | 'max'>('max');
  const [squadViewMode, setSquadViewMode] = useState<'grid' | 'slots'>('grid');

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Search & Filter states
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [clubFilter, setClubFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [offStyleFilter, setOffStyleFilter] = useState('');
  const [defStyleFilter, setDefStyleFilter] = useState('');
  const [onlyTrending, setOnlyTrending] = useState(false);
  const [onlyIndonesian, setOnlyIndonesian] = useState(false);
  const [sortBy, setSortBy] = useState<'overall_max' | 'overall_lv1' | 'name'>('overall_max');
  const [page, setPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Search results state
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<{
    clubs: Array<{ name: string; count: number }>;
    countries: Array<{ name: string; count: number }>;
  } | null>(null);

  // Detail & Compare Modal state
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [compareCardId, setCompareCardId] = useState<string | null>(null);

  // Local optimistic shortlist IDs
  const [localShortlist, setLocalShortlist] = useState<any[]>(shortlistCards);
  useEffect(() => {
    setLocalShortlist(shortlistCards);
  }, [shortlistCards]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 240);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    posFilter,
    typeFilter,
    clubFilter,
    countryFilter,
    offStyleFilter,
    defStyleFilter,
    onlyTrending,
    onlyIndonesian,
    sortBy,
  ]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 6500);
  };

  // Fetch players from server-indexed API
  const fetchPlayers = useCallback(async () => {
    if (!session) return;
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
      if (posFilter !== 'ALL') params.set('pos', posFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (clubFilter.trim()) params.set('club', clubFilter.trim());
      if (countryFilter.trim()) params.set('country', countryFilter.trim());
      if (offStyleFilter) params.set('style', offStyleFilter);
      if (defStyleFilter) params.set('defStyle', defStyleFilter);
      if (onlyTrending) params.set('trending', '1');
      if (onlyIndonesian) params.set('indonesian', '1');
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', '24');
      if (!facets) params.set('facets', '1');

      const res = await fetch(`/api/players?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Gagal memuat daftar pemain');
      }
      const data = await res.json();
      setSearchResults(data.players || []);
      setTotalResults(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.facets && !facets) {
        setFacets(data.facets);
      }
    } catch (err: any) {
      console.error('fetchPlayers error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [
    session,
    debouncedQuery,
    posFilter,
    typeFilter,
    clubFilter,
    countryFilter,
    offStyleFilter,
    defStyleFilter,
    onlyTrending,
    onlyIndonesian,
    sortBy,
    page,
    facets,
  ]);

  useEffect(() => {
    if (session && activeSubTab === 'search') {
      fetchPlayers();
    }
  }, [session, activeSubTab, fetchPlayers]);

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

  const currentPhaseStatus =
    activePhase === 2 && phase2Status ? phase2Status : phase1Status;
  const activeVisibleCards =
    activePhase === 2 ? visibleCardsPhase2 : visibleCardsPhase1;

  const myCards = session
    ? activeVisibleCards.filter((c) => c.participant_id === session.participantId)
    : [];
  const opponentId: ParticipantId =
    session?.participantId === 'participant_a' ? 'participant_b' : 'participant_a';
  const opponentParticipant = opponentId === 'participant_a' ? pA : pB;
  const opponentCards = currentPhaseStatus.both_locked
    ? activeVisibleCards.filter((c) => c.participant_id === opponentId)
    : [];

  const myLocked = session
    ? session.participantId === 'participant_a'
      ? currentPhaseStatus.pa_locked === 1
      : currentPhaseStatus.pb_locked === 1
    : false;

  const canModifyMySquad =
    Boolean(session) &&
    !myLocked &&
    currentPhaseStatus.is_locked === 0 &&
    (activePhase === 1 || currentPhaseStatus.md10_completed);

  // My Squad Counters
  const myTotalCount = myCards.length;
  const myTrendingCount = myCards.filter((c) => c.is_trending === 1).length;
  const myIndonesianCount = myCards.filter((c) => c.is_indonesian === 1).length;

  // Duplicate virtual player check helper
  const getSquadCardStatus = useCallback(
    (cardId: string, basePlayerId: number) => {
      const exactMatch = myCards.find(
        (c) => String(c.efootball_card_id) === String(cardId)
      );
      if (exactMatch) {
        return { inSquad: true, duplicateVirtualPlayer: false };
      }
      if (basePlayerId) {
        const sameVirtual = myCards.find(
          (c) => Number(c.base_player_id) === Number(basePlayerId)
        );
        if (sameVirtual) {
          return {
            inSquad: false,
            duplicateVirtualPlayer: true,
            existingVersion: sameVirtual.card_version,
          };
        }
      }
      return { inSquad: false, duplicateVirtualPlayer: false };
    },
    [myCards]
  );

  const isShortlisted = useCallback(
    (cardId: string) => {
      return localShortlist.some((item) => String(item.card_id) === String(cardId));
    },
    [localShortlist]
  );

  // Handlers
  const handleAddCard = (cardId: string, basePlayerId?: number, playerObj?: any) => {
    if (!session) {
      showToast('error', 'Silakan masuk ke akun peserta Anda terlebih dahulu.');
      return;
    }
    if (basePlayerId) {
      const st = getSquadCardStatus(cardId, basePlayerId);
      if (st.inSquad) {
        showToast('error', 'Kartu ini sudah ada di dalam skuad Anda.');
        return;
      }
      if (st.duplicateVirtualPlayer) {
        showToast(
          'error',
          `Tidak boleh ada kartu kembar: pemain virtual ini sudah terdaftar di skuad Anda dengan versi "${st.existingVersion}" (Pasal 14 ayat 3).`
        );
        return;
      }
    }

    startTransition(async () => {
      const res = await addEfootballRosterCardAction({
        cardId: String(cardId),
        phase: activePhase,
      });
      if (res?.error) {
        showToast('error', res.error);
      } else {
        showToast(
          'success',
          `${playerObj?.name || 'Kartu pemain'} berhasil ditambahkan ke Skuad Fase ${activePhase}.`
        );
        onSquadLockedChange?.();
      }
    });
  };

  const handleRemoveCard = (rosterCardId: string, playerName: string) => {
    startTransition(async () => {
      const res = await removeRosterCardAction({
        rosterCardId,
        phase: activePhase,
      });
      if (res?.error) {
        showToast('error', res.error);
      } else {
        showToast('success', `${playerName} dihapus dari skuad.`);
        onSquadLockedChange?.();
      }
    });
  };

  const handleToggleShortlist = (card: any) => {
    const cardId = String(card.card_id || card.efootball_card_id);
    startTransition(async () => {
      const res = await toggleShortlistCardAction(cardId);
      if (res?.error) {
        showToast('error', res.error);
      } else if (res?.added) {
        setLocalShortlist((prev) => [card, ...prev]);
        showToast('success', `${card.name || card.player_name} disimpan ke Pilihan Sementara (My Team).`);
      } else {
        setLocalShortlist((prev) =>
          prev.filter((item) => String(item.card_id) !== cardId)
        );
        showToast('success', 'Dihapus dari Pilihan Sementara (My Team).');
      }
    });
  };

  const handleLockMySquad = () => {
    startTransition(async () => {
      const res = await lockParticipantSquadAction(activePhase);
      if (res?.error) {
        showToast('error', res.error);
      } else {
        showToast(
          'success',
          res?.bothLocked
            ? `Skuad Anda berhasil dikunci! Kedua skuad Fase ${activePhase} kini resmi terkunci dan dapat dilihat bersama.`
            : `Skuad Anda berhasil dikunci! Menunggu lawan mengunci skuadnya sebelum kedua skuad dibuka.`
        );
        onSquadLockedChange?.();
      }
    });
  };

  // Check lock readiness message for UI banner
  const lockMissingReasons: string[] = [];
  if (myTotalCount === 0) {
    lockMissingReasons.push('skuad masih kosong (pilih minimal 2 kartu)');
  }
  if (myTotalCount > 26) {
    lockMissingReasons.push(`kelebihan ${myTotalCount - 26} kartu (maksimal 26 kartu)`);
  }
  if (myTrendingCount < 2) {
    lockMissingReasons.push(
      `kurang ${2 - myTrendingCount} kartu Trending (baru ada ${myTrendingCount} dari minimal 2 wajib)`
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Status & Account Switcher Banner */}
      <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl uppercase tracking-tight text-[var(--text)]">
                Penyusun Skuad eFootball™ (eFHUB)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text-dim)]">
                Pasal 14, 15 & 17
              </span>
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              Tiap peserta memilih sendiri maksimal 26 kartu dari akunnya (tanpa kartu kembar pemain virtual yang sama, minimal 2 kartu Trending). Skuad lawan disembunyikan sampai keduanya terkunci.
            </p>
          </div>

          {/* Phase Selector (Phase 1 vs Phase 2 after MD10) */}
          {phase2Status && (
            <div className="inline-flex rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-1 shrink-0">
              <button
                type="button"
                onClick={() => setActivePhase(1)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-bold uppercase transition-colors ${
                  activePhase === 1
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Fase 1 (MD1–10)
              </button>
              <button
                type="button"
                onClick={() => setActivePhase(2)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-bold uppercase transition-colors flex items-center gap-1.5 ${
                  activePhase === 2
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                <span>Fase 2 (Setelah MD10)</span>
                {!phase2Status.md10_completed && <Lock className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Two-Participant Lock Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Participant A Status */}
          <div
            className={`rounded-[8px] p-3.5 border flex items-center justify-between ${
              currentPhaseStatus.pa_locked === 1
                ? 'bg-[var(--ok)]/10 border-[var(--ok)]/40'
                : 'bg-[var(--ink-1)] border-[var(--line)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlayerTag
                id="participant_a"
                name={pA.display_name}
                monogram={pA.monogram}
                size="sm"
              />
              <div className="text-xs">
                <div className="font-bold text-[var(--text)]">
                  {currentPhaseStatus.pa_locked === 1 ? 'Skuad Terkunci' : 'Sedang Menyusun'}
                </div>
                <div className="text-[11px] text-[var(--text-faint)]">
                  {session?.participantId === 'participant_a' || currentPhaseStatus.both_locked
                    ? `${activePhase === 1 ? paSummaryPhase1.count : myCards.length}/26 Kartu · ${
                        activePhase === 1 ? paSummaryPhase1.trending : myTrendingCount
                      } Trending · ${activePhase === 1 ? paSummaryPhase1.indo : myIndonesianCount} IDN`
                    : `${paSummaryPhase1.count}/26 Kartu (Detail Rahasia)`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {currentPhaseStatus.pa_locked === 1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ok)]/20 text-[var(--ok)]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Terkunci</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ink-2)] text-[var(--text-dim)]">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Belum Kunci</span>
                </span>
              )}
            </div>
          </div>

          {/* Participant B Status */}
          <div
            className={`rounded-[8px] p-3.5 border flex items-center justify-between ${
              currentPhaseStatus.pb_locked === 1
                ? 'bg-[var(--ok)]/10 border-[var(--ok)]/40'
                : 'bg-[var(--ink-1)] border-[var(--line)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlayerTag
                id="participant_b"
                name={pB.display_name}
                monogram={pB.monogram}
                size="sm"
              />
              <div className="text-xs">
                <div className="font-bold text-[var(--text)]">
                  {currentPhaseStatus.pb_locked === 1 ? 'Skuad Terkunci' : 'Sedang Menyusun'}
                </div>
                <div className="text-[11px] text-[var(--text-faint)]">
                  {session?.participantId === 'participant_b' || currentPhaseStatus.both_locked
                    ? `${activePhase === 1 ? pbSummaryPhase1.count : myCards.length}/26 Kartu · ${
                        activePhase === 1 ? pbSummaryPhase1.trending : myTrendingCount
                      } Trending · ${activePhase === 1 ? pbSummaryPhase1.indo : myIndonesianCount} IDN`
                    : `${pbSummaryPhase1.count}/26 Kartu (Detail Rahasia)`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {currentPhaseStatus.pb_locked === 1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ok)]/20 text-[var(--ok)]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Terkunci</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ink-2)] text-[var(--text-dim)]">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Belum Kunci</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account Login / Switcher Inside Workbench (so each player builds from their own account) */}
        <div className="pt-2 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {session ? (
            <>
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-[var(--text-dim)]">Masuk sebagai:</span>
                <PlayerTag
                  id={session.participantId}
                  name={session.participant.display_name}
                  monogram={session.participant.monogram}
                  size="sm"
                />
                <span className="text-[11px] text-[var(--text-faint)]">
                  (Anda hanya dapat menyusun & mengunci skuad milik Anda sendiri)
                </span>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await logoutParticipantAction();
                    onSquadLockedChange?.();
                  });
                }}
                className="h-8 px-3 rounded-[6px] border border-[var(--line)] bg-[var(--ink-1)] text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] flex items-center gap-1.5 self-start sm:self-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ganti Akun Peserta</span>
              </button>
            </>
          ) : (
            <form
              action={(formData) => {
                startTransition(async () => {
                  const res = await loginParticipantAction(formData);
                  if (res?.error) {
                    showToast('error', res.error);
                  } else {
                    showToast('success', 'Berhasil masuk ke akun peserta.');
                    onSquadLockedChange?.();
                  }
                });
              }}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--ink-1)] p-3 rounded-[8px] border border-[var(--line)]"
            >
              <div className="text-xs font-semibold text-[var(--text)]">
                Masuk ke akun Anda untuk memilih dan mengunci 26 kartu skuad:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="participant_id"
                  className="h-9 px-3 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold text-[var(--text)]"
                >
                  <option value="participant_a">{pA.display_name} (Pemain A)</option>
                  <option value="participant_b">{pB.display_name} (Pemain B)</option>
                </select>
                <input
                  type="password"
                  name="pin"
                  placeholder="PIN Peserta"
                  required
                  className="h-9 w-36 px-3 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-mono text-[var(--text)]"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-4 rounded-[6px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`rounded-[8px] p-4 text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'error'
              ? 'bg-[var(--danger)]/15 border border-[var(--danger)]/40 text-[var(--danger)]'
              : 'bg-[var(--ok)]/15 border border-[var(--ok)]/40 text-[var(--ok)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Logged-in Participant Counters & Lock Control Bar */}
      {session && (
        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-4 sm:p-5 space-y-4">
          {/* Phase 2 MD10 Gate Notice */}
          {activePhase === 2 && !currentPhaseStatus.md10_completed && (
            <div className="rounded-[8px] bg-[var(--p-a-soft)] border border-[var(--p-a)]/40 p-4 text-xs text-[var(--p-a)] flex items-center gap-3">
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-bold uppercase">
                  Bursa Fase 2 Terkunci Sampai MD10 Selesai (Pasal 14 & 15)
                </div>
                <p className="text-[var(--text-dim)] mt-0.5">
                  Skuad Fase 1 tetap berlaku penuh untuk MD1 sampai MD10. Anda baru dapat melakukan perubahan atau mengganti versi kartu untuk Fase 2 setelah pertandingan MD10 selesai dan disahkan.
                </p>
              </div>
            </div>
          )}

          {activePhase === 2 && currentPhaseStatus.md10_completed && myCards.length === 0 && !myLocked && (
            <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-[var(--text)]">
                  MD10 Telah Selesai — Bursa Skuad Fase 2 Dibuka!
                </div>
                <p className="text-[var(--text-dim)]">
                  Salin 26 kartu Fase 1 Anda ke Fase 2 untuk melakukan pergantian pemain atau meng-upgrade versi kartu dari pemain virtual yang sama.
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await initializePhase2SquadAction();
                    if (res?.error) showToast('error', res.error);
                    else {
                      showToast('success', 'Skuad Fase 1 berhasil disalin ke Fase 2. Silakan sesuaikan skuad Anda.');
                      onSquadLockedChange?.();
                    }
                  });
                }}
                className="h-9 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider shrink-0"
              >
                Salin dari Skuad Fase 1
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Three Distinct Counters: Total (max 26), Trending (min 2), Indonesian */}
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                  Total Kartu Skuad
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums ${
                      myTotalCount > 26
                        ? 'text-[var(--danger)]'
                        : myTotalCount === 26
                        ? 'text-[var(--ok)]'
                        : 'text-[var(--text)]'
                    }`}
                  >
                    {myTotalCount}
                  </span>
                  <span className="text-xs text-[var(--text-dim)] font-mono">/ 26 maks</span>
                </div>
              </div>

              <div
                className={`rounded-[8px] border p-3 ${
                  myTrendingCount >= 2
                    ? 'bg-[var(--ok)]/10 border-[var(--ok)]/40'
                    : 'bg-[var(--p-a-soft)] border-[var(--p-a)]/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--p-a)]" />
                  <span>Kartu Trending</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums ${
                      myTrendingCount >= 2 ? 'text-[var(--ok)]' : 'text-[var(--p-a)]'
                    }`}
                  >
                    {myTrendingCount}
                  </span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    (min. 2 wajib)
                  </span>
                </div>
              </div>

              <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] flex items-center gap-1">
                  <Flag className="w-3 h-3 text-[var(--ok)]" />
                  <span>Pemain Indonesia</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums text-[var(--ok)]">
                    {myIndonesianCount}
                  </span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    terdaftar
                  </span>
                </div>
              </div>
            </div>

            {/* Lock My Squad Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {myLocked ? (
                <div className="px-4 py-2.5 rounded-[8px] bg-[var(--ok)]/15 border border-[var(--ok)]/40 text-xs font-bold text-[var(--ok)] flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Skuad Fase {activePhase} Anda Sudah Terkunci</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending || !canModifyMySquad}
                  onClick={handleLockMySquad}
                  className="h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-extrabold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Kunci Skuad Saya ({myTotalCount}/26)</span>
                </button>
              )}
            </div>
          </div>

          {/* Clear Validation Hint if Not Ready to Lock */}
          {!myLocked && lockMissingReasons.length > 0 && (
            <div className="text-xs text-[var(--p-a)] bg-[var(--p-a-soft)] border border-[var(--p-a)]/30 rounded-[8px] px-3.5 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Syarat mengunci skuad belum terpenuhi: <strong>{lockMissingReasons.join('; ')}</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Comparison Sticky Pill if a player is selected for comparison */}
      {compareCardId && (
        <div className="rounded-[8px] bg-[var(--p-b-soft)] border border-[var(--p-b)]/40 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[var(--p-b)] font-semibold">
            <Scale className="w-4 h-4" />
            <span>
              Mode Bandingkan Aktif (Pemain Pembanding ID #{compareCardId}). Klik &ldquo;Bandingkan&rdquo; atau buka detail pemain kedua untuk melihat perbandingan atribut berdampingan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompareCardId(null)}
            className="text-xs font-bold text-[var(--text)] underline ml-3"
          >
            Reset
          </button>
        </div>
      )}

      {/* Workbench Navigation Tabs & Lv.1/Max Toggle */}
      {session && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSubTab('search')}
                className={`h-9 px-3.5 rounded-[8px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  activeSubTab === 'search'
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Database eFHUB</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('shortlist')}
                className={`h-9 px-3.5 rounded-[8px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  activeSubTab === 'shortlist'
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>My Team / Pilihan Sementara ({localShortlist.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('my_squad')}
                className={`h-9 px-3.5 rounded-[8px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  activeSubTab === 'my_squad'
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Skuad Saya ({myTotalCount}/26)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('opponent_squad')}
                className={`h-9 px-3.5 rounded-[8px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  activeSubTab === 'opponent_squad'
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                {currentPhaseStatus.both_locked ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>Skuad {opponentParticipant.display_name}</span>
              </button>
            </div>

            {/* Level 1 vs Max Level Stat Toggle */}
            <div className="inline-flex items-center rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-0.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStatMode('lv1')}
                className={`px-3 py-1 rounded-[6px] text-xs font-bold uppercase transition-colors ${
                  statMode === 'lv1'
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Stat Lv. 1
              </button>
              <button
                type="button"
                onClick={() => setStatMode('max')}
                className={`px-3 py-1 rounded-[6px] text-xs font-bold uppercase transition-colors ${
                  statMode === 'max'
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Stat Lv. Maks
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: SEARCH EFOOTBALL DATABASE */}
          {activeSubTab === 'search' && (
            <div className="space-y-4">
              {/* Search & Filter Controls */}
              <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_210px_auto] gap-2.5">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari nama pemain (termasuk beraksen: Mbappé, Çalhanoğlu) atau ketik posisi (CF, AMF)…"
                      className="w-full h-10 pl-10 pr-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none"
                    />
                  </div>

                  {/* Position Filter */}
                  <select
                    value={posFilter}
                    onChange={(e) => setPosFilter(e.target.value)}
                    className="h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs font-semibold text-[var(--text)]"
                  >
                    <option value="ALL">Semua Posisi</option>
                    {POSITIONS.filter((p) => p !== 'ALL').map((p) => (
                      <option key={p} value={p}>
                        Posisi: {p}
                      </option>
                    ))}
                  </select>

                  {/* Card Type Filter */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs font-semibold text-[var(--text)]"
                  >
                    {CARD_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>

                  {/* Toggle Advanced Filters */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`h-10 px-3.5 rounded-[8px] border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      showAdvancedFilters
                        ? 'border-[var(--text)] bg-[var(--ink-1)] text-[var(--text)]'
                        : 'border-[var(--line)] bg-[var(--ink-1)] text-[var(--text-dim)]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter Lanjut</span>
                  </button>
                </div>

                {/* Quick Filter Toggles Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOnlyTrending(!onlyTrending)}
                      className={`h-8 px-3 rounded-[6px] border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                        onlyTrending
                          ? 'bg-[var(--p-a-soft)] border-[var(--p-a)] text-[var(--p-a)]'
                          : 'bg-[var(--ink-1)] border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Hanya Kartu Trending</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOnlyIndonesian(!onlyIndonesian)}
                      className={`h-8 px-3 rounded-[6px] border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                        onlyIndonesian
                          ? 'bg-[var(--ok)]/15 border-[var(--ok)] text-[var(--ok)]'
                          : 'bg-[var(--ink-1)] border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Pemain Indonesia</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                    <span>Urutkan:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="h-8 px-2.5 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                    >
                      <option value="overall_max">Rating Maks Tertinggi</option>
                      <option value="overall_lv1">Rating Lv.1 Tertinggi</option>
                      <option value="name">Nama (A–Z)</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Filters (Club, Country, Offensive & Defensive Playstyle) */}
                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-[var(--line)]">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                        Filter Klub
                      </label>
                      <input
                        type="text"
                        list="efhub-clubs-list"
                        value={clubFilter}
                        onChange={(e) => setClubFilter(e.target.value)}
                        placeholder="Ketik / pilih klub (mis. Barcelona)"
                        className="w-full h-9 px-3 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                      />
                      <datalist id="efhub-clubs-list">
                        {facets?.clubs?.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name} ({c.count})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                        Filter Negara
                      </label>
                      <input
                        type="text"
                        list="efhub-countries-list"
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        placeholder="Ketik / pilih negara (mis. Indonesia)"
                        className="w-full h-9 px-3 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                      />
                      <datalist id="efhub-countries-list">
                        {facets?.countries?.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name} ({c.count})
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                        Gaya Main Ofensif
                      </label>
                      <select
                        value={offStyleFilter}
                        onChange={(e) => {
                          setOffStyleFilter(e.target.value);
                          if (e.target.value) setDefStyleFilter('');
                        }}
                        className="w-full h-9 px-2.5 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                      >
                        <option value="">Semua Gaya Ofensif</option>
                        {OFFENSIVE_PLAYSTYLE_IDS.map((id) => (
                          <option key={id} value={String(id)}>
                            {PLAYSTYLE_MAP[id]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                        Gaya Main Defensif & GK
                      </label>
                      <select
                        value={defStyleFilter}
                        onChange={(e) => {
                          setDefStyleFilter(e.target.value);
                          if (e.target.value) setOffStyleFilter('');
                        }}
                        className="w-full h-9 px-2.5 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                      >
                        <option value="">Semua Gaya Defensif/GK</option>
                        {DEFENSIVE_PLAYSTYLE_IDS.map((id) => (
                          <option key={id} value={String(id)}>
                            {PLAYSTYLE_MAP[id]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Results Header & Pagination */}
              <div className="flex items-center justify-between text-xs text-[var(--text-dim)] px-1">
                <span>
                  Menampilkan <strong>{searchResults.length}</strong> dari{' '}
                  <strong>{totalResults.toLocaleString('id-ID')}</strong> kartu pemain
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1 || searchLoading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] disabled:opacity-40 flex items-center gap-1 text-[var(--text)]"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <span className="font-mono text-[11px]">
                      Hal {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages || searchLoading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 px-2.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] disabled:opacity-40 flex items-center gap-1 text-[var(--text)]"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Compact Player Cards Grid */}
              {searchLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-[var(--text-dim)]">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Mencari kartu pemain di indeks server…
                  </span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-10 rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] text-center text-xs text-[var(--text-dim)]">
                  Tidak ada kartu pemain yang cocok dengan pencarian / filter Anda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {searchResults.map((p) => {
                    const ovr = statMode === 'max' ? p.overall_max : p.overall_lv1;
                    const top6 = statMode === 'max' ? p.top6_max || [] : p.top6_lv1 || [];
                    const status = getSquadCardStatus(p.card_id, p.base_player_id);
                    const saved = isShortlisted(p.card_id);

                    return (
                      <div
                        key={p.card_id}
                        className={`rounded-[10px] bg-[var(--ink-2)] border p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                          status.inSquad
                            ? 'border-[var(--ok)]/60'
                            : p.is_trending === 1
                            ? 'border-[var(--p-a)]/40 hover:border-[var(--p-a)]'
                            : 'border-[var(--line)] hover:border-[var(--text-dim)]'
                        }`}
                      >
                        {/* Top Section: Avatar, Identity, Rating */}
                        <div
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => setDetailCardId(p.card_id)}
                        >
                          <PlayerAvatar
                            cardId={p.card_id}
                            basePlayerId={p.base_player_id}
                            name={p.name}
                            position={p.position || p.position_label}
                            isTrending={p.is_trending}
                            isIndonesian={p.is_indonesian}
                            size="lg"
                          />

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)]">
                                {p.position || p.position_label}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--ink-1)] text-[var(--text-dim)]">
                                {p.player_type_label || p.card_type_label}
                              </span>
                              {p.is_trending === 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--p-a-soft)] text-[var(--p-a)] border border-[var(--p-a)]/30">
                                  TRENDING
                                </span>
                              )}
                              {p.is_indonesian === 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30">
                                  IDN
                                </span>
                              )}
                            </div>

                            <div className="font-bold text-sm text-[var(--text)] truncate">
                              {p.name}
                            </div>

                            <div className="text-[11px] text-[var(--text-dim)] truncate">
                              {p.club_name || p.team_name || 'Free Agent'} · {p.nationality_name || p.country_name || '-'}
                            </div>

                            {p.variation_name && (
                              <div className="text-[10px] text-[var(--text-faint)] truncate">
                                {p.variation_name}
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className="font-[family-name:var(--font-display)] font-extrabold text-3xl tabular-nums leading-none block"
                              style={{ color: getStatTierColor(ovr) }}
                            >
                              {ovr}
                            </span>
                            <span className="text-[9px] font-mono uppercase text-[var(--text-faint)]">
                              {statMode === 'max' ? 'MAKS' : 'LV.1'}
                            </span>
                          </div>
                        </div>

                        {/* Middle Section: Top 6 Prominent Stats (eFHUB Compact View) */}
                        {top6.length > 0 && (
                          <div
                            className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[var(--line)] cursor-pointer"
                            onClick={() => setDetailCardId(p.card_id)}
                          >
                            {top6.slice(0, 6).map((st: any, sIdx: number) => {
                              const rawLabel = String(st?.label || st?.l || st?.k || st?.key || '');
                              const val = Number(st?.val ?? st?.v ?? 0);
                              return (
                                <div
                                  key={st?.key || st?.k || sIdx}
                                  className="px-2 py-1 rounded bg-[var(--ink-1)] flex items-center justify-between text-[10px]"
                                >
                                  <span className="text-[var(--text-faint)] truncate mr-1">
                                    {rawLabel
                                      .replace('Awareness', 'Awr')
                                      .replace('Defensive', 'Def')
                                      .replace('Offensive', 'Off')}
                                  </span>
                                  <span
                                    className="font-mono font-bold tabular-nums"
                                    style={{ color: getStatTierColor(val) }}
                                  >
                                    {val}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Bottom Action Row */}
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[var(--line)]">
                          <button
                            type="button"
                            disabled={
                              !canModifyMySquad ||
                              status.inSquad ||
                              status.duplicateVirtualPlayer ||
                              isPending
                            }
                            onClick={() => handleAddCard(p.card_id, p.base_player_id, p)}
                            className={`flex-1 h-8 px-2.5 rounded-[6px] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-opacity ${
                              status.inSquad
                                ? 'bg-[var(--ok)]/20 text-[var(--ok)] border border-[var(--ok)]/40'
                                : status.duplicateVirtualPlayer
                                ? 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30 cursor-not-allowed'
                                : 'bg-[var(--text)] text-[var(--ink-0)] hover:opacity-90 disabled:opacity-40'
                            }`}
                          >
                            {status.inSquad ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Di Skuad</span>
                              </>
                            ) : status.duplicateVirtualPlayer ? (
                              <span>Kembar Ditolak</span>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Pilih Skuad</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleShortlist(p)}
                            title="Simpan ke Pilihan Sementara (My Team)"
                            className={`h-8 w-8 rounded-[6px] border flex items-center justify-center transition-colors ${
                              saved
                                ? 'border-[var(--p-a)] bg-[var(--p-a-soft)] text-[var(--p-a)]'
                                : 'border-[var(--line)] bg-[var(--ink-1)] text-[var(--text-dim)] hover:text-[var(--text)]'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (compareCardId && compareCardId !== p.card_id) {
                                setDetailCardId(p.card_id);
                              } else {
                                setCompareCardId(p.card_id);
                                showToast(
                                  'success',
                                  `${p.name} dipilih sebagai pembanding. Klik pemain lain untuk membandingkan atribut.`
                                );
                              }
                            }}
                            title="Bandingkan Pemain"
                            className={`h-8 px-2.5 rounded-[6px] border text-[11px] font-semibold flex items-center gap-1 ${
                              compareCardId === p.card_id
                                ? 'border-[var(--p-b)] bg-[var(--p-b-soft)] text-[var(--p-b)]'
                                : 'border-[var(--line)] bg-[var(--ink-1)] text-[var(--text-dim)] hover:text-[var(--text)]'
                            }`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailCardId(p.card_id)}
                            className="h-8 px-2.5 rounded-[6px] border border-[var(--line)] bg-[var(--ink-1)] text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)]"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: SHORTLIST ("MY TEAM") */}
          {activeSubTab === 'shortlist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase text-[var(--text)]">
                    Daftar Pilihan Sementara (My Team · {localShortlist.length})
                  </h3>
                  <p className="text-xs text-[var(--text-dim)]">
                    Simpan kandidat pemain di sini sebelum memasukkannya ke dalam 26 kartu skuad resmi.
                  </p>
                </div>
              </div>

              {localShortlist.length === 0 ? (
                <div className="p-10 rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] text-center text-xs text-[var(--text-dim)]">
                  Belum ada pemain di daftar Pilihan Sementara (My Team). Klik ikon Bookmark pada kartu hasil pencarian untuk menyimpan kandidat.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {localShortlist.map((p) => {
                    const ovr = statMode === 'max' ? p.overall_max : p.overall_lv1;
                    const status = getSquadCardStatus(p.card_id, p.base_player_id);
                    return (
                      <div
                        key={p.card_id}
                        className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => setDetailCardId(p.card_id)}
                        >
                          <PlayerAvatar
                            cardId={p.card_id}
                            basePlayerId={p.base_player_id}
                            name={p.name}
                            position={p.position}
                            isTrending={p.is_trending}
                            isIndonesian={p.is_indonesian}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--ink-1)] text-[var(--text)]">
                                {p.position}
                              </span>
                              <span className="text-[10px] font-bold uppercase text-[var(--text-dim)]">
                                {p.player_type_label}
                              </span>
                              {p.is_trending === 1 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--p-a-soft)] text-[var(--p-a)]">
                                  TRENDING
                                </span>
                              )}
                              {p.is_indonesian === 1 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--ok)]/15 text-[var(--ok)]">
                                  IDN
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-sm text-[var(--text)] truncate mt-1">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-[var(--text-dim)] truncate">
                              {p.club_name} · {p.nationality_name}
                            </div>
                          </div>
                          <span
                            className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums"
                            style={{ color: getStatTierColor(ovr) }}
                          >
                            {ovr}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
                          <button
                            type="button"
                            disabled={
                              !canModifyMySquad ||
                              status.inSquad ||
                              status.duplicateVirtualPlayer ||
                              isPending
                            }
                            onClick={() => handleAddCard(p.card_id, p.base_player_id, p)}
                            className="flex-1 h-8 px-3 rounded-[6px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase disabled:opacity-40"
                          >
                            {status.inSquad
                              ? 'Sudah di Skuad'
                              : status.duplicateVirtualPlayer
                              ? 'Kartu Kembar Ditolak'
                              : 'Pindahkan ke Skuad'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailCardId(p.card_id)}
                            className="h-8 px-2.5 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text-dim)]"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleShortlist(p)}
                            className="h-8 w-8 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] flex items-center justify-center text-[var(--danger)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 3: MY REGISTERED SQUAD (0-26 CARDS + SLOT HELPER) */}
          {activeSubTab === 'my_squad' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase text-[var(--text)]">
                    Skuad Terdaftar {session.participant.display_name} — Fase {activePhase} ({myTotalCount}/26)
                  </h3>
                  <p className="text-xs text-[var(--text-dim)]">
                    Maksimal 26 kartu, tanpa kartu kembar dari pemain virtual yang sama, minimal 2 kartu Trending.
                  </p>
                </div>

                <div className="inline-flex rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setSquadViewMode('grid')}
                    className={`px-3 py-1 rounded-[6px] text-xs font-bold uppercase flex items-center gap-1.5 ${
                      squadViewMode === 'grid'
                        ? 'bg-[var(--text)] text-[var(--ink-0)]'
                        : 'text-[var(--text-dim)]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Daftar 26 Kartu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSquadViewMode('slots')}
                    className={`px-3 py-1 rounded-[6px] text-xs font-bold uppercase flex items-center gap-1.5 ${
                      squadViewMode === 'slots'
                        ? 'bg-[var(--text)] text-[var(--ink-0)]'
                        : 'text-[var(--text-dim)]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Alat Bantu Slot Posisi</span>
                  </button>
                </div>
              </div>

              {myCards.length === 0 ? (
                <div className="p-10 rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] text-center space-y-3">
                  <p className="text-xs text-[var(--text-dim)]">
                    Belum ada kartu pemain di skuad Anda untuk Fase {activePhase}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('search')}
                    className="h-9 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase"
                  >
                    Cari & Pilih Pemain di Database eFHUB
                  </button>
                </div>
              ) : squadViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {myCards.map((c, idx) => {
                    const ovr =
                      statMode === 'max'
                        ? c.overall_max ?? c.overall_lv1 ?? 80
                        : c.overall_lv1 ?? c.overall_max ?? 75;
                    const top6 = statMode === 'max' ? c.top6_max || [] : c.top6_lv1 || [];

                    return (
                      <div
                        key={c.id}
                        className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <PlayerAvatar
                            cardId={c.efootball_card_id}
                            basePlayerId={c.base_player_id}
                            name={c.player_name}
                            position={c.position}
                            isTrending={c.is_trending}
                            isIndonesian={c.is_indonesian}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] font-mono text-[var(--text-faint)]">
                                #{idx + 1}
                              </span>
                              {c.position && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--ink-1)] text-[var(--text)]">
                                  {c.position}
                                </span>
                              )}
                              {c.is_trending === 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--p-a-soft)] text-[var(--p-a)]">
                                  TRENDING
                                </span>
                              )}
                              {c.is_indonesian === 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--ok)]/15 text-[var(--ok)]">
                                  IDN
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-sm text-[var(--text)] truncate mt-0.5">
                              {c.player_name}
                            </div>
                            <div className="text-[11px] text-[var(--text-dim)] truncate">
                              {c.card_version}
                            </div>
                          </div>
                          {ovr && (
                            <span
                              className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums"
                              style={{ color: getStatTierColor(ovr) }}
                            >
                              {ovr}
                            </span>
                          )}
                        </div>

                        {top6.length > 0 && (
                          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[var(--line)]">
                            {top6.slice(0, 6).map((st: any, sIdx: number) => {
                              const rawLabel = String(st?.label || st?.l || st?.k || st?.key || '');
                              const val = Number(st?.val ?? st?.v ?? 0);
                              return (
                                <div
                                  key={st?.key || st?.k || sIdx}
                                  className="px-1.5 py-0.5 rounded bg-[var(--ink-1)] flex items-center justify-between text-[10px]"
                                >
                                  <span className="text-[var(--text-faint)] truncate mr-1">
                                    {rawLabel.slice(0, 8)}
                                  </span>
                                  <span
                                    className="font-mono font-bold"
                                    style={{ color: getStatTierColor(val) }}
                                  >
                                    {val}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
                          {c.efootball_card_id ? (
                            <button
                              type="button"
                              onClick={() => setDetailCardId(String(c.efootball_card_id))}
                              className="h-8 px-3 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)]"
                            >
                              Atribut Lengkap
                            </button>
                          ) : (
                            <span />
                          )}

                          {canModifyMySquad && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleRemoveCard(c.id, c.player_name)}
                              className="h-8 px-3 rounded-[6px] border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Slot / Formation Helper View */
                <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-4 sm:p-6 space-y-5">
                  <div className="text-xs text-[var(--text-dim)]">
                    <strong>Alat Bantu Slot Formasi (4-3-3):</strong> Anda bebas memetakan pemain skuad Anda ke slot starter di bawah ini sebagai panduan komposisi (bukan syarat mengunci skuad).
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FORMATION_SLOTS.map((slot) => {
                      const assigned = myCards.find((c) => c.slot_code === slot.code);
                      return (
                        <div
                          key={slot.code}
                          className="rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[var(--text-dim)]">
                            <span>SLOT: {slot.label}</span>
                            <span className="text-[10px] text-[var(--text-faint)]">
                              {slot.line}
                            </span>
                          </div>

                          <select
                            disabled={!canModifyMySquad || isPending}
                            value={assigned?.id || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              startTransition(async () => {
                                if (val) {
                                  await updateRosterCardSlotAction({
                                    rosterCardId: val,
                                    slotCode: slot.code,
                                    phase: activePhase,
                                  });
                                } else if (assigned) {
                                  await updateRosterCardSlotAction({
                                    rosterCardId: assigned.id,
                                    slotCode: null,
                                    phase: activePhase,
                                  });
                                }
                                onSquadLockedChange?.();
                              });
                            }}
                            className="w-full h-9 px-2.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-xs text-[var(--text)]"
                          >
                            <option value="">— Pilih Pemain dari Skuad —</option>
                            {myCards.map((c) => (
                              <option key={c.id} value={c.id}>
                                [{c.position || '—'}] {c.player_name} ({c.overall_max || '—'})
                                {c.is_trending ? ' ★TRENDING' : ''}
                                {c.is_indonesian ? ' 🇮🇩IDN' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 4: OPPONENT SQUAD (SERVER-HIDDEN UNTIL BOTH LOCKED) */}
          {activeSubTab === 'opponent_squad' && (
            <div className="space-y-4">
              {!currentPhaseStatus.both_locked ? (
                <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-8 sm:p-12 text-center space-y-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink-1)] border border-[var(--line)] text-[var(--p-a)]">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase text-[var(--text)]">
                    Skuad {opponentParticipant.display_name} Masih Dirahasiakan
                  </h3>
                  <p className="text-xs text-[var(--text-dim)] max-w-md mx-auto leading-relaxed">
                    Sesuai <strong>Pasal 14 ayat (2)</strong>, daftar kartu skuad lawan disembunyikan sepenuhnya di server dan tidak dikirim ke peramban sampai <strong>kedua peserta</strong> mengunci skuad masing-masing untuk Fase {activePhase}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase text-[var(--text)]">
                      Skuad Resmi {opponentParticipant.display_name} — Fase {activePhase} ({opponentCards.length}/26)
                    </h3>
                    <span className="text-xs text-[var(--ok)] font-bold">
                      Kedua Skuad Terkunci & Terbuka
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {opponentCards.map((c, idx) => {
                      const ovr =
                        statMode === 'max'
                          ? c.overall_max ?? c.overall_lv1 ?? 80
                          : c.overall_lv1 ?? c.overall_max ?? 75;
                      return (
                        <div
                          key={c.id}
                          onClick={() =>
                            c.efootball_card_id && setDetailCardId(String(c.efootball_card_id))
                          }
                          className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--text-dim)]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <PlayerAvatar
                              cardId={c.efootball_card_id}
                              basePlayerId={c.base_player_id}
                              name={c.player_name}
                              position={c.position}
                              isTrending={c.is_trending}
                              isIndonesian={c.is_indonesian}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-[var(--text-faint)]">
                                  #{idx + 1}
                                </span>
                                {c.position && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--ink-1)] text-[var(--text)]">
                                    {c.position}
                                  </span>
                                )}
                                {c.is_trending === 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--p-a-soft)] text-[var(--p-a)]">
                                    TRENDING
                                  </span>
                                )}
                                {c.is_indonesian === 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--ok)]/15 text-[var(--ok)]">
                                    IDN
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-sm text-[var(--text)] truncate">
                                {c.player_name}
                              </div>
                              <div className="text-[11px] text-[var(--text-dim)] truncate">
                                {c.card_version}
                              </div>
                            </div>
                          </div>

                          {ovr && (
                            <span
                              className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums shrink-0"
                              style={{ color: getStatTierColor(ovr) }}
                            >
                              {ovr}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Player Detail & Comparison Modal */}
      {detailCardId && (
        <PlayerDetailModal
          cardId={detailCardId}
          compareCardId={compareCardId !== detailCardId ? compareCardId : null}
          initialStatMode={statMode}
          onClose={() => setDetailCardId(null)}
          onSelectCardId={(id) => setDetailCardId(id)}
          onSetCompareCardId={(id) => setCompareCardId(id)}
          onAddToSquad={(id) => handleAddCard(id)}
          onToggleShortlist={(id) => handleToggleShortlist({ card_id: id })}
          isShortlisted={isShortlisted}
          getSquadCardStatus={getSquadCardStatus}
          canModifySquad={canModifyMySquad}
        />
      )}
    </div>
  );
}
