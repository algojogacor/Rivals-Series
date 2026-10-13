'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  Search,
  Filter,
  Flame,
  Flag,
  Sparkles,
  LayoutGrid,
  List,
  Columns,
  Eye,
  Info,
  ChevronRight,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Participant, ParticipantId, RosterCard, RosterPhaseStatus } from '@/lib/types';
import { PlayerCardMetadata } from '@/lib/db';
import { PlayerCardVisual } from '@/components/PlayerCardVisual';
import { PlayerTag } from '@/components/PlayerTag';
import { PlayerDetailModal } from '@/components/PlayerDetailModal';

export interface SquadViewerClientProps {
  participants: Participant[];
  phase1Cards: RosterCard[];
  phase2Cards: RosterCard[];
  phase1Status: RosterPhaseStatus;
  phase2Status?: RosterPhaseStatus;
  playersMeta: Record<string, PlayerCardMetadata>;
  initialParticipantId?: ParticipantId;
  md10Completed?: boolean;
}

// Group positions by tactical lines
export function getPositionLine(pos?: string | null): 'GK' | 'DEF' | 'MID' | 'FWD' {
  if (!pos) return 'MID';
  const p = pos.toUpperCase();
  if (p === 'GK') return 'GK';
  if (['CB', 'LB', 'RB'].includes(p)) return 'DEF';
  if (['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(p)) return 'MID';
  return 'FWD';
}

const POSITION_ORDER: Record<string, number> = {
  GK: 1,
  CB: 2,
  LB: 3,
  RB: 4,
  DMF: 5,
  CMF: 6,
  AMF: 7,
  LMF: 8,
  RMF: 9,
  LWF: 10,
  RWF: 11,
  SS: 12,
  CF: 13,
};

const LINE_CONFIG = [
  {
    key: 'GK' as const,
    label: 'Penjaga Gawang',
    sublabel: 'Goalkeepers',
    icon: '🧤',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgBadge: 'bg-amber-500/15 text-amber-300',
  },
  {
    key: 'DEF' as const,
    label: 'Lini Pertahanan',
    sublabel: 'Defenders (CB, LB, RB)',
    icon: '🛡️',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgBadge: 'bg-cyan-500/15 text-cyan-300',
  },
  {
    key: 'MID' as const,
    label: 'Lini Tengah',
    sublabel: 'Midfielders (DMF, CMF, AMF, WMF)',
    icon: '⚙️',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgBadge: 'bg-emerald-500/15 text-emerald-300',
  },
  {
    key: 'FWD' as const,
    label: 'Lini Serang',
    sublabel: 'Forwards (CF, SS, LWF, RWF)',
    icon: '⚡',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    bgBadge: 'bg-rose-500/15 text-rose-300',
  },
];

export function SquadViewerClient({
  participants,
  phase1Cards,
  phase2Cards,
  phase1Status,
  phase2Status,
  playersMeta,
  initialParticipantId = 'participant_a',
  md10Completed = false,
}: SquadViewerClientProps) {
  // Navigation & selection state
  const [selectedParticipantId, setSelectedParticipantId] = useState<ParticipantId | 'compare'>(
    initialParticipantId
  );
  const [activePhase, setActivePhase] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLine, setSelectedLine] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [specialFilter, setSpecialFilter] = useState<'ALL' | 'TRENDING' | 'IDN'>('ALL');

  // Modal detail state
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  const pA = participants.find((p) => p.id === 'participant_a') || {
    id: 'participant_a' as const,
    display_name: 'algojogacor',
    monogram: 'COR',
  };
  const pB = participants.find((p) => p.id === 'participant_b') || {
    id: 'participant_b' as const,
    display_name: 'CHarmed',
    monogram: 'CMS',
  };

  // Cards for active phase
  const allActiveCards = activePhase === 2 ? phase2Cards : phase1Cards;
  const activeStatus = activePhase === 2 ? phase2Status : phase1Status;

  // Metadata lookup helper
  const getMeta = (cardId?: string | null, baseId?: number | null, name?: string) => {
    if (cardId && playersMeta[cardId]) return playersMeta[cardId];
    if (baseId && playersMeta[`base_${baseId}`]) return playersMeta[`base_${baseId}`];
    if (name && playersMeta[`name_${name.toLowerCase()}`]) return playersMeta[`name_${name.toLowerCase()}`];
    return null;
  };

  // Filter helper for a specific team's cards
  const filterTeamCards = (teamId: ParticipantId) => {
    let cards = allActiveCards.filter((c) => c.participant_id === teamId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      cards = cards.filter(
        (c) =>
          c.player_name.toLowerCase().includes(q) ||
          c.position?.toLowerCase().includes(q) ||
          c.card_version.toLowerCase().includes(q)
      );
    }

    if (selectedLine !== 'ALL') {
      cards = cards.filter((c) => getPositionLine(c.position) === selectedLine);
    }

    if (specialFilter === 'TRENDING') {
      cards = cards.filter((c) => c.is_trending === 1);
    } else if (specialFilter === 'IDN') {
      cards = cards.filter((c) => c.is_indonesian === 1);
    }

    // Sort by position hierarchy, then by overall rating descending
    return cards.sort((a, b) => {
      const posA = POSITION_ORDER[a.position?.toUpperCase() || ''] || 99;
      const posB = POSITION_ORDER[b.position?.toUpperCase() || ''] || 99;
      if (posA !== posB) return posA - posB;
      return (b.overall_max || 0) - (a.overall_max || 0);
    });
  };

  const paCards = useMemo(() => filterTeamCards('participant_a'), [allActiveCards, searchQuery, selectedLine, specialFilter]);
  const pbCards = useMemo(() => filterTeamCards('participant_b'), [allActiveCards, searchQuery, selectedLine, specialFilter]);

  // Overall metrics per team (unfiltered for full squad quota verification)
  const computeTeamMetrics = (teamId: ParticipantId) => {
    const raw = allActiveCards.filter((c) => c.participant_id === teamId);
    const count = raw.length;
    const trendingCount = raw.filter((c) => c.is_trending === 1).length;
    const indoCount = raw.filter((c) => c.is_indonesian === 1).length;
    const ratings = raw.map((c) => c.overall_max || 0).filter((r) => r > 0);
    const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';
    const maxPlayer = raw.reduce<RosterCard | null>((max, c) => {
      if (!max || (c.overall_max || 0) > (max.overall_max || 0)) return c;
      return max;
    }, null);

    const lineCounts = {
      GK: raw.filter((c) => getPositionLine(c.position) === 'GK').length,
      DEF: raw.filter((c) => getPositionLine(c.position) === 'DEF').length,
      MID: raw.filter((c) => getPositionLine(c.position) === 'MID').length,
      FWD: raw.filter((c) => getPositionLine(c.position) === 'FWD').length,
    };

    return {
      count,
      trendingCount,
      indoCount,
      avgRating,
      maxPlayer,
      lineCounts,
      isLocked: activeStatus?.both_locked || false,
    };
  };

  const paMetrics = useMemo(() => computeTeamMetrics('participant_a'), [allActiveCards, activeStatus]);
  const pbMetrics = useMemo(() => computeTeamMetrics('participant_b'), [allActiveCards, activeStatus]);

  // Render individual player card/row
  const renderPlayerItem = (card: RosterCard) => {
    const meta = getMeta(card.efootball_card_id, card.base_player_id, card.player_name);
    const isTrending = card.is_trending === 1;
    const isIndo = card.is_indonesian === 1;

    if (viewMode === 'list') {
      return (
        <div
          key={card.id}
          onClick={() => card.efootball_card_id && setDetailCardId(card.efootball_card_id)}
          className="group flex items-center justify-between p-2.5 sm:p-3 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--ink-2)]/60 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <PlayerCardVisual
              cardId={card.efootball_card_id}
              basePlayerId={card.base_player_id}
              name={card.player_name}
              participantId={card.participant_id}
              metadata={meta}
              cardVersion={card.card_version}
              size="thumb"
              showOwnerBadge={false}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {card.position && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)] font-mono text-[10px] font-bold text-[var(--text)]">
                    {card.position}
                  </span>
                )}
                {card.overall_max && (
                  <span className="font-[family-name:var(--font-display)] font-extrabold text-sm sm:text-base tabular-nums text-[var(--gold)]">
                    {card.overall_max}
                  </span>
                )}
                <span className="font-semibold text-sm text-[var(--text)] truncate group-hover:text-white transition-colors">
                  {card.player_name}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-faint)] block truncate mt-0.5">
                {card.card_version}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isTrending && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <Flame className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">TRENDING</span>
              </span>
            )}
            {isIndo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Flag className="w-2.5 h-2.5" />
                <span>IDN</span>
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-[var(--text-faint)] group-hover:text-[var(--text)] transition-colors" />
          </div>
        </div>
      );
    }

    // Default Grid Tile
    return (
      <div
        key={card.id}
        onClick={() => card.efootball_card_id && setDetailCardId(card.efootball_card_id)}
        className="group relative flex items-center gap-3 p-3 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--ink-2)]/50 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.01]"
      >
        <div className="shrink-0">
          <PlayerCardVisual
            cardId={card.efootball_card_id}
            basePlayerId={card.base_player_id}
            name={card.player_name}
            participantId={card.participant_id}
            metadata={meta}
            cardVersion={card.card_version}
            size="sm"
            showOwnerBadge={false}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                {card.position && (
                  <span className="px-1.5 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)] font-mono text-[10px] font-extrabold text-[var(--text)]">
                    {card.position}
                  </span>
                )}
                {card.overall_max && (
                  <span className="font-[family-name:var(--font-display)] font-extrabold text-lg tabular-nums text-[var(--gold)] leading-none">
                    {card.overall_max}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isTrending && (
                  <span className="p-1 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30" title="Kewajiban Trending (Pasal 17)">
                    <Flame className="w-3 h-3" />
                  </span>
                )}
                {isIndo && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Pemain Indonesia (Pasal 18 & 20)">
                    IDN
                  </span>
                )}
              </div>
            </div>

            <p className="font-[family-name:var(--font-display)] font-bold text-sm sm:text-[15px] text-[var(--text)] truncate group-hover:text-white transition-colors leading-snug">
              {card.player_name}
            </p>
          </div>

          <p className="text-[11px] text-[var(--text-faint)] truncate font-mono mt-1">
            {card.card_version}
          </p>
        </div>
      </div>
    );
  };

  // Render a specific team's full roster grouped by tactical line
  const renderTeamSquadSection = (
    teamId: ParticipantId,
    participant: { display_name: string; monogram: string },
    cards: RosterCard[],
    metrics: ReturnType<typeof computeTeamMetrics>,
    isSideBySide: boolean = false
  ) => {
    const isA = teamId === 'participant_a';
    const accentColor = isA ? 'var(--p-a)' : 'var(--p-b)';
    const accentBorder = isA ? 'border-[var(--p-a)]/40' : 'border-[var(--p-b)]/40';

    return (
      <div className={`space-y-6 ${isSideBySide ? 'min-w-0' : ''}`}>
        {/* Team Summary Card */}
        <div className={`rounded-[16px] bg-[var(--ink-1)] border ${accentBorder} p-5 sm:p-6 shadow-sm space-y-5 relative overflow-hidden`}>
          {/* Background Ambient Glow */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-10 blur-3xl -mr-20 -mt-20"
            style={{ backgroundColor: accentColor }}
          />

          {/* Header Identity */}
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <PlayerTag
                id={teamId}
                name=""
                monogram={participant.monogram}
                size="md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text)]">
                    {participant.display_name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)]">
                    {isA ? 'Tim A' : 'Tim B'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-dim)] mt-0.5">
                  Rivals Series S1 · Skuad Resmi Fase {activePhase}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30">
              <ShieldCheck className="w-4 h-4" />
              <span>Terkunci & Sah</span>
            </div>
          </div>

          {/* Key Stat Badges Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 relative z-10 pt-1">
            {/* Total Kartu */}
            <div className="p-3 rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)] block">
                Total Skuad
              </span>
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl text-[var(--text)] mt-0.5 block">
                {metrics.count} <span className="text-sm font-normal text-[var(--text-dim)]">/ 26</span>
              </span>
            </div>

            {/* Rata-rata OVR */}
            <div className="p-3 rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)] block">
                Rata-rata OVR
              </span>
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl text-[var(--gold)] mt-0.5 block">
                {metrics.avgRating}
              </span>
            </div>

            {/* Kuota Trending */}
            <div className="p-3 rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)] block flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" />
                <span>Trending (P.17)</span>
              </span>
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl text-rose-400 mt-0.5 block">
                {metrics.trendingCount} <span className="text-xs font-normal text-[var(--text-dim)]">/ min 2</span>
              </span>
            </div>

            {/* Kuota Indonesia */}
            <div className="p-3 rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)] block flex items-center gap-1">
                <Flag className="w-3 h-3 text-emerald-400" />
                <span>IDN (P.18)</span>
              </span>
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl text-emerald-400 mt-0.5 block">
                {metrics.indoCount} <span className="text-xs font-normal text-[var(--text-dim)]">/ min 1</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Position Lines */}
        {cards.length === 0 ? (
          <div className="p-10 rounded-[14px] bg-[var(--ink-1)] border border-[var(--line)] text-center space-y-2">
            <Info className="w-6 h-6 text-[var(--text-faint)] mx-auto" />
            <p className="font-semibold text-sm text-[var(--text)]">Tidak ada pemain yang sesuai kriteria pencarian.</p>
            <p className="text-xs text-[var(--text-dim)]">Coba reset filter atau kata kunci pencarian Anda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {LINE_CONFIG.map((line) => {
              const lineCards = cards.filter((c) => getPositionLine(c.position) === line.key);
              if (lineCards.length === 0) return null;

              return (
                <div key={line.key} className="space-y-3">
                  {/* Line Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg">{line.icon}</span>
                      <h4 className="font-[family-name:var(--font-display)] font-extrabold text-base sm:text-lg uppercase tracking-tight text-[var(--text)]">
                        {line.label}
                      </h4>
                      <span className="text-xs text-[var(--text-dim)] font-mono hidden sm:inline">
                        ({line.sublabel})
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${line.bgBadge}`}>
                      {lineCards.length} Pemain
                    </span>
                  </div>

                  {/* Player Cards */}
                  <div className={viewMode === 'list' ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
                    {lineCards.map(renderPlayerItem)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* 1. Header Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--line)] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[var(--ink-2)] border border-[var(--line)] text-[var(--gold)]">
              Rivals Series S1 · Lembar Skuad Resmi
            </span>
            <span className="text-xs text-[var(--text-faint)] font-mono">
              BAB V Regulasi (Pasal 14–20)
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight text-[var(--text)]">
            Skuad Resmi Kompetisi
          </h1>
          <p className="text-[13px] sm:text-sm text-[var(--text-dim)] max-w-2xl leading-relaxed">
            Daftar lengkap 26 kartu pemain virtual resmi yang didaftarkan oleh masing-masing pemilik tim.
            Seluruh kartu telah dikunci dan disahkan untuk mengarungi putaran tanding resmi.
          </p>
        </div>

        {/* Phase selector if Fase 2 is ready/active and locked by both */}
        {md10Completed && Boolean(phase2Status?.both_locked) && phase2Cards.length > 0 && (
          <div className="flex items-center gap-2 p-1 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActivePhase(1)}
              className={`px-3 py-1.5 rounded-[7px] text-xs font-bold uppercase tracking-wider transition-all ${
                activePhase === 1
                  ? 'bg-[var(--text)] text-[var(--ink-0)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Fase 1 (MD1–10)
            </button>
            <button
              onClick={() => setActivePhase(2)}
              className={`px-3 py-1.5 rounded-[7px] text-xs font-bold uppercase tracking-wider transition-all ${
                activePhase === 2
                  ? 'bg-[var(--text)] text-[var(--ink-0)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Fase 2 (MD11–20)
            </button>
          </div>
        )}
      </div>

      {/* 2. Team Switcher Tabs (Large prominent duel selector) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 flex-1 max-w-xl">
          {/* Button Team A */}
          <button
            onClick={() => setSelectedParticipantId('participant_a')}
            className={`flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-3 rounded-[12px] border transition-all text-left ${
              selectedParticipantId === 'participant_a'
                ? 'bg-[var(--ink-1)] border-[var(--p-a)] shadow-[0_0_16px_var(--p-a-glow)] ring-1 ring-[var(--p-a)]'
                : 'bg-[var(--ink-1)] border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--line-strong)]'
            }`}
          >
            <PlayerTag
              id="participant_a"
              name=""
              monogram={pA.monogram}
              size="sm"
            />
            <div className="min-w-0">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-sm sm:text-base uppercase tracking-tight text-[var(--text)] block truncate">
                {pA.display_name}
              </span>
              <span className="text-[11px] text-[var(--text-dim)] block">
                {paMetrics.count} Kartu Skuad
              </span>
            </div>
          </button>

          {/* Button Team B */}
          <button
            onClick={() => setSelectedParticipantId('participant_b')}
            className={`flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-3 rounded-[12px] border transition-all text-left ${
              selectedParticipantId === 'participant_b'
                ? 'bg-[var(--ink-1)] border-[var(--p-b)] shadow-[0_0_16px_var(--p-b-glow)] ring-1 ring-[var(--p-b)]'
                : 'bg-[var(--ink-1)] border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--line-strong)]'
            }`}
          >
            <PlayerTag
              id="participant_b"
              name=""
              monogram={pB.monogram}
              size="sm"
            />
            <div className="min-w-0">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-sm sm:text-base uppercase tracking-tight text-[var(--text)] block truncate">
                {pB.display_name}
              </span>
              <span className="text-[11px] text-[var(--text-dim)] block">
                {pbMetrics.count} Kartu Skuad
              </span>
            </div>
          </button>

          {/* Button Compare Side-by-Side (Desktop only) */}
          <button
            onClick={() => setSelectedParticipantId('compare')}
            className={`hidden lg:flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] border transition-all font-[family-name:var(--font-display)] font-bold text-xs uppercase tracking-wider ${
              selectedParticipantId === 'compare'
                ? 'bg-[var(--ink-1)] border-[var(--gold)] text-[var(--gold)] shadow-[0_0_14px_rgba(251,191,36,0.25)] ring-1 ring-[var(--gold)]'
                : 'bg-[var(--ink-1)] border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--line-strong)]'
            }`}
          >
            <Columns className="w-4 h-4" />
            <span>Bandingkan Kedua Tim</span>
          </button>
        </div>

        {/* View mode toggle (Grid vs List) */}
        <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] self-end sm:self-center shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-[7px] text-xs font-semibold transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
            title="Tampilan Grid Kartu"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-[7px] text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
            title="Tampilan Daftar Baris"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Search and Tactical Filters Bar */}
      <div className="rounded-[14px] bg-[var(--ink-1)] border border-[var(--line)] p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Quick Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-dim)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pemain virtual, klub, atau edisi..."
              className="w-full h-10 pl-10 pr-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--p-a)] transition-colors"
            />
          </div>

          {/* Positional Line Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 py-0.5">
            {[
              { id: 'ALL', label: 'Semua Lini' },
              { id: 'GK', label: '🧤 GK' },
              { id: 'DEF', label: '🛡️ DEF' },
              { id: 'MID', label: '⚙️ MID' },
              { id: 'FWD', label: '⚡ FWD' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedLine(f.id as any)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  selectedLine === f.id
                    ? 'bg-[var(--text)] text-[var(--ink-0)] font-bold shadow-sm'
                    : 'bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Special Quota Badges Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSpecialFilter((prev) => (prev === 'TRENDING' ? 'ALL' : 'TRENDING'))}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                specialFilter === 'TRENDING'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'bg-[var(--ink-2)] border border-[var(--line)] text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Trending</span>
            </button>

            <button
              onClick={() => setSpecialFilter((prev) => (prev === 'IDN' ? 'ALL' : 'IDN'))}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                specialFilter === 'IDN'
                  ? 'bg-emerald-500 text-white font-bold shadow-sm'
                  : 'bg-[var(--ink-2)] border border-[var(--line)] text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Indonesia</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Squad Content Display */}
      {selectedParticipantId === 'compare' ? (
        /* Side-by-Side Comparison Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {renderTeamSquadSection('participant_a', pA, paCards, paMetrics, true)}
          {renderTeamSquadSection('participant_b', pB, pbCards, pbMetrics, true)}
        </div>
      ) : selectedParticipantId === 'participant_a' ? (
        /* Single Team: algojogacor */
        renderTeamSquadSection('participant_a', pA, paCards, paMetrics, false)
      ) : (
        /* Single Team: CHarmed */
        renderTeamSquadSection('participant_b', pB, pbCards, pbMetrics, false)
      )}

      {/* 5. Player Detail Modal (eFootball Full Stats & Skills) */}
      {detailCardId && (
        <PlayerDetailModal
          cardId={detailCardId}
          onClose={() => setDetailCardId(null)}
          onSelectCardId={(id) => setDetailCardId(id)}
          canModifySquad={false}
        />
      )}
    </div>
  );
}
