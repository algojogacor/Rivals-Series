'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { Search, Bookmark, Users, Lock, Unlock, Scale } from 'lucide-react';
import {
  Participant,
  ParticipantId,
  RosterCard,
  RosterPhaseStatus,
} from '@/lib/types';
import {
  addEfootballRosterCardAction,
  removeRosterCardAction,
  toggleShortlistCardAction,
  lockParticipantSquadAction,
} from '@/lib/actions';
import { PlayerDetailModal } from './PlayerDetailModal';
import { SquadQuotaBanner } from './squad/SquadQuotaBanner';
import { SquadSearchTab } from './squad/SquadSearchTab';
import { SquadShortlistTab } from './squad/SquadShortlistTab';
import { SquadRosterTab } from './squad/SquadRosterTab';
import { SquadOpponentTab } from './squad/SquadOpponentTab';

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
      <SquadQuotaBanner
        session={session}
        pA={pA}
        pB={pB}
        activePhase={activePhase}
        setActivePhase={setActivePhase}
        phase2Status={phase2Status}
        currentPhaseStatus={currentPhaseStatus}
        paSummaryPhase1={paSummaryPhase1}
        pbSummaryPhase1={pbSummaryPhase1}
        myCards={myCards}
        myTotalCount={myTotalCount}
        myTrendingCount={myTrendingCount}
        myIndonesianCount={myIndonesianCount}
        myLocked={myLocked}
        canModifyMySquad={canModifyMySquad}
        lockMissingReasons={lockMissingReasons}
        isPending={isPending}
        startTransition={startTransition}
        handleLockMySquad={handleLockMySquad}
        showToast={showToast}
        onSquadLockedChange={onSquadLockedChange}
      />

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
            <SquadSearchTab
              searchLoading={searchLoading}
              searchResults={searchResults}
              totalResults={totalResults}
              totalPages={totalPages}
              page={page}
              setPage={setPage}
              query={query}
              setQuery={setQuery}
              posFilter={posFilter}
              setPosFilter={setPosFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              onlyTrending={onlyTrending}
              setOnlyTrending={setOnlyTrending}
              onlyIndonesian={onlyIndonesian}
              setOnlyIndonesian={setOnlyIndonesian}
              sortBy={sortBy}
              setSortBy={setSortBy}
              clubFilter={clubFilter}
              setClubFilter={setClubFilter}
              countryFilter={countryFilter}
              setCountryFilter={setCountryFilter}
              offStyleFilter={offStyleFilter}
              setOffStyleFilter={setOffStyleFilter}
              defStyleFilter={defStyleFilter}
              setDefStyleFilter={setDefStyleFilter}
              facets={facets}
              statMode={statMode}
              canModifyMySquad={canModifyMySquad}
              isPending={isPending}
              compareCardId={compareCardId}
              getSquadCardStatus={getSquadCardStatus}
              isShortlisted={isShortlisted}
              onSelectCardDetail={(id) => setDetailCardId(id)}
              onSetCompareCardId={(id) => setCompareCardId(id)}
              onAddCard={handleAddCard}
              onToggleShortlist={handleToggleShortlist}
              showToast={showToast}
            />
          )}

          {/* SUB-TAB 2: SHORTLIST ("MY TEAM") */}
          {activeSubTab === 'shortlist' && (
            <SquadShortlistTab
              localShortlist={localShortlist}
              statMode={statMode}
              canModifyMySquad={canModifyMySquad}
              isPending={isPending}
              getSquadCardStatus={getSquadCardStatus}
              onSelectCardDetail={(id) => setDetailCardId(id)}
              onAddCard={handleAddCard}
              onToggleShortlist={handleToggleShortlist}
            />
          )}

          {/* SUB-TAB 3: MY REGISTERED SQUAD (0-26 CARDS + SLOT HELPER) */}
          {activeSubTab === 'my_squad' && (
            <SquadRosterTab
              activePhase={activePhase}
              participantDisplayName={session.participant.display_name}
              myCards={myCards}
              myTotalCount={myTotalCount}
              squadViewMode={squadViewMode}
              setSquadViewMode={setSquadViewMode}
              statMode={statMode}
              canModifyMySquad={canModifyMySquad}
              isPending={isPending}
              startTransition={startTransition}
              onSelectCardDetail={(id) => setDetailCardId(id)}
              onRemoveCard={handleRemoveCard}
              onSquadLockedChange={onSquadLockedChange}
              onSwitchToSearch={() => setActiveSubTab('search')}
            />
          )}

          {/* SUB-TAB 4: OPPONENT SQUAD (SERVER-HIDDEN UNTIL BOTH LOCKED) */}
          {activeSubTab === 'opponent_squad' && (
            <SquadOpponentTab
              activePhase={activePhase}
              opponentDisplayName={opponentParticipant.display_name}
              opponentCards={opponentCards}
              bothLocked={currentPhaseStatus.both_locked}
              statMode={statMode}
              onSelectCardDetail={(id) => setDetailCardId(id)}
            />
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
