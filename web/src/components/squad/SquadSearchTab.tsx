'use client';

import React from 'react';
import {
  Search,
  Sparkles,
  Flag,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Plus,
  Bookmark,
  Scale,
} from 'lucide-react';
import {
  OFFENSIVE_PLAYSTYLE_IDS,
  DEFENSIVE_PLAYSTYLE_IDS,
  PLAYSTYLE_MAP,
  getStatTierColor,
} from '@/lib/efhub-constants';
import { PlayerAvatar } from '../PlayerAvatar';
import { POSITIONS, CARD_TYPES } from './squad-constants';

interface SquadSearchTabProps {
  searchLoading: boolean;
  searchResults: any[];
  totalResults: number;
  totalPages: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  query: string;
  setQuery: (q: string) => void;
  posFilter: string;
  setPosFilter: (p: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  onlyTrending: boolean;
  setOnlyTrending: (b: boolean) => void;
  onlyIndonesian: boolean;
  setOnlyIndonesian: (b: boolean) => void;
  sortBy: 'overall_max' | 'overall_lv1' | 'name';
  setSortBy: (s: 'overall_max' | 'overall_lv1' | 'name') => void;
  clubFilter: string;
  setClubFilter: (c: string) => void;
  countryFilter: string;
  setCountryFilter: (c: string) => void;
  offStyleFilter: string;
  setOffStyleFilter: (s: string) => void;
  defStyleFilter: string;
  setDefStyleFilter: (s: string) => void;
  facets: {
    clubs: Array<{ name: string; count: number }>;
    countries: Array<{ name: string; count: number }>;
  } | null;
  statMode: 'lv1' | 'max';
  canModifyMySquad: boolean;
  isPending: boolean;
  compareCardId: string | null;
  getSquadCardStatus: (
    cardId: string,
    basePlayerId: number
  ) => {
    inSquad: boolean;
    duplicateVirtualPlayer: boolean;
    existingVersion?: string;
  };
  isShortlisted: (cardId: string) => boolean;
  onSelectCardDetail: (cardId: string) => void;
  onSetCompareCardId: (cardId: string | null) => void;
  onAddCard: (cardId: string, basePlayerId?: number, playerObj?: any) => void;
  onToggleShortlist: (playerObj: any) => void;
  showToast: (type: 'success' | 'error', text: string) => void;
}

export function SquadSearchTab({
  searchLoading,
  searchResults,
  totalResults,
  totalPages,
  page,
  setPage,
  query,
  setQuery,
  posFilter,
  setPosFilter,
  typeFilter,
  setTypeFilter,
  showAdvancedFilters,
  setShowAdvancedFilters,
  onlyTrending,
  setOnlyTrending,
  onlyIndonesian,
  setOnlyIndonesian,
  sortBy,
  setSortBy,
  clubFilter,
  setClubFilter,
  countryFilter,
  setCountryFilter,
  offStyleFilter,
  setOffStyleFilter,
  defStyleFilter,
  setDefStyleFilter,
  facets,
  statMode,
  canModifyMySquad,
  isPending,
  compareCardId,
  getSquadCardStatus,
  isShortlisted,
  onSelectCardDetail,
  onSetCompareCardId,
  onAddCard,
  onToggleShortlist,
  showToast,
}: SquadSearchTabProps) {
  return (
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
                  onClick={() => onSelectCardDetail(p.card_id)}
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
                    onClick={() => onSelectCardDetail(p.card_id)}
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
                    onClick={() => onAddCard(p.card_id, p.base_player_id, p)}
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
                    onClick={() => onToggleShortlist(p)}
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
                        onSelectCardDetail(p.card_id);
                      } else {
                        onSetCompareCardId(p.card_id);
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
                    onClick={() => onSelectCardDetail(p.card_id)}
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
  );
}
