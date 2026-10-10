'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Bookmark,
  Scale,
  Loader2,
  Check,
  Sparkles,
  Flag,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { STAT_DEFINITIONS, getStatTierColor } from '@/lib/efhub-constants';

interface PlayerDetailModalProps {
  cardId: string | null;
  compareCardId?: string | null;
  initialStatMode?: 'lv1' | 'max';
  onClose: () => void;
  onSelectCardId: (cardId: string) => void;
  onSetCompareCardId?: (cardId: string | null) => void;
  onAddToSquad?: (cardId: string) => void;
  onToggleShortlist?: (cardId: string) => void;
  isShortlisted?: (cardId: string) => boolean;
  getSquadCardStatus?: (
    cardId: string,
    basePlayerId: number
  ) => {
    inSquad: boolean;
    duplicateVirtualPlayer: boolean;
    existingVersion?: string;
  };
  canModifySquad?: boolean;
}

const PITCH_ROWS: Array<Array<{ pos: string; label: string }>> = [
  [
    { pos: 'LWF', label: 'LWF' },
    { pos: 'CF', label: 'CF' },
    { pos: 'RWF', label: 'RWF' },
  ],
  [{ pos: 'SS', label: 'SS' }],
  [
    { pos: 'LMF', label: 'LMF' },
    { pos: 'AMF', label: 'AMF' },
    { pos: 'RMF', label: 'RMF' },
  ],
  [{ pos: 'CMF', label: 'CMF' }],
  [{ pos: 'DMF', label: 'DMF' }],
  [
    { pos: 'LB', label: 'LB' },
    { pos: 'CB', label: 'CB' },
    { pos: 'RB', label: 'RB' },
  ],
  [{ pos: 'GK', label: 'GK' }],
];

const STAT_CATEGORIES = ['Attacking', 'Dribbling', 'Defending', 'Athleticism', 'Goalkeeping'];

export function PlayerDetailModal({
  cardId,
  compareCardId,
  initialStatMode = 'max',
  onClose,
  onSelectCardId,
  onSetCompareCardId,
  onAddToSquad,
  onToggleShortlist,
  isShortlisted,
  getSquadCardStatus,
  canModifySquad = true,
}: PlayerDetailModalProps) {
  const [statMode, setStatMode] = useState<'lv1' | 'max'>(initialStatMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<any | null>(null);
  const [otherVersions, setOtherVersions] = useState<any[]>([]);
  const [comparePlayer, setComparePlayer] = useState<any | null>(null);

  useEffect(() => {
    setStatMode(initialStatMode);
  }, [initialStatMode]);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = compareCardId && compareCardId !== cardId ? `?compareWith=${encodeURIComponent(compareCardId)}` : '';
    fetch(`/api/players/${encodeURIComponent(cardId)}${qs}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Gagal memuat detail pemain.');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPlayer(data.player || null);
        setOtherVersions(data.other_versions || []);
        setComparePlayer(data.compare_player || null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err.message || 'Gagal memuat detail pemain.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardId, compareCardId]);

  if (!cardId) return null;

  const squadStatus =
    player && getSquadCardStatus
      ? getSquadCardStatus(player.card_id, player.base_player_id)
      : { inSquad: false, duplicateVirtualPlayer: false };

  const shortlisted = player && isShortlisted ? isShortlisted(player.card_id) : false;

  const activeStats = player
    ? statMode === 'max'
      ? player.stats_max || {}
      : player.stats_lv1 || {}
    : {};

  const compareStats = comparePlayer
    ? statMode === 'max'
      ? comparePlayer.stats_max || {}
      : comparePlayer.stats_lv1 || {}
    : null;

  const activeOvr = player ? (statMode === 'max' ? player.overall_max : player.overall_lv1) : 0;
  const compareOvr = comparePlayer
    ? statMode === 'max'
      ? comparePlayer.overall_max
      : comparePlayer.overall_lv1
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] shadow-2xl text-[var(--text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[var(--ink-1)]/95 backdrop-blur border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-lg uppercase tracking-tight text-[var(--text)]">
              {comparePlayer ? 'Perbandingan Atribut Pemain (eFHUB)' : 'Profil & Atribut Lengkap Pemain'}
            </span>
            {player && (
              <span className="text-[11px] font-mono text-[var(--text-faint)]">
                ID #{player.card_id} · Virtual #{player.base_player_id}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Level 1 vs Max Level Toggle */}
            <div className="inline-flex rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-0.5">
              <button
                type="button"
                onClick={() => setStatMode('lv1')}
                className={`px-3 py-1 rounded-[6px] text-xs font-bold uppercase transition-colors ${
                  statMode === 'lv1'
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Lv. 1
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
                Lv. Maks {player?.max_level ? `(${player.max_level})` : ''}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[var(--text-dim)]">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Memuat atribut lengkap dari database eFHUB…
              </span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 text-xs text-[var(--danger)]">
              {error}
            </div>
          ) : player ? (
            <>
              {/* Hero Header (Single or Side-by-Side Comparison) */}
              <div
                className={`grid grid-cols-1 ${
                  comparePlayer ? 'md:grid-cols-2' : ''
                } gap-4`}
              >
                {/* Primary Player Card */}
                <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <PlayerAvatar
                      cardId={player.card_id}
                      basePlayerId={player.base_player_id}
                      name={player.name}
                      position={player.position}
                      isTrending={player.is_trending}
                      isIndonesian={player.is_indonesian}
                      size="xl"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)] font-mono">
                          {player.position}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text-dim)]">
                          {player.player_type_label}
                        </span>
                        {player.is_trending === 1 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--p-a-soft)] text-[var(--p-a)] border border-[var(--p-a)]/40 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>TRENDING</span>
                          </span>
                        )}
                        {player.is_indonesian === 1 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/40 flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            <span>INDONESIA</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)] truncate">
                        {player.name}
                      </h3>

                      <div className="text-xs text-[var(--text-dim)] space-y-0.5">
                        <div>
                          {player.club_name || 'Free Agent'} · {player.nationality_name}
                        </div>
                        {player.variation_name && (
                          <div className="text-[11px] text-[var(--text-faint)]">
                            Paket: {player.variation_name}
                          </div>
                        )}
                        <div className="text-[11px] text-[var(--text-faint)]">
                          Gaya Main: <strong className="text-[var(--text)]">{player.playing_style_label}</strong> · Usia {player.age} · {player.height}cm/{player.weight}kg · Kaki {player.foot === 1 ? 'Kiri' : 'Kanan'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-faint)] block">
                        OVR ({statMode === 'max' ? 'MAKS' : 'LV.1'})
                      </span>
                      <span
                        className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums leading-none"
                        style={{ color: getStatTierColor(activeOvr) }}
                      >
                        {activeOvr}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons for Primary Player */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--line)]">
                    {canModifySquad && onAddToSquad && (
                      <button
                        type="button"
                        disabled={squadStatus.inSquad || squadStatus.duplicateVirtualPlayer}
                        onClick={() => onAddToSquad(player.card_id)}
                        className={`h-9 px-3.5 rounded-[8px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-opacity ${
                          squadStatus.inSquad
                            ? 'bg-[var(--ok)]/20 text-[var(--ok)] border border-[var(--ok)]/40 cursor-default'
                            : squadStatus.duplicateVirtualPlayer
                            ? 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/40 cursor-not-allowed'
                            : 'bg-[var(--text)] text-[var(--ink-0)] hover:opacity-90'
                        }`}
                      >
                        {squadStatus.inSquad ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Sudah di Skuad</span>
                          </>
                        ) : squadStatus.duplicateVirtualPlayer ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Kartu Kembar Ditolak ({squadStatus.existingVersion})</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Pilih ke Skuad</span>
                          </>
                        )}
                      </button>
                    )}

                    {onToggleShortlist && (
                      <button
                        type="button"
                        onClick={() => onToggleShortlist(player.card_id)}
                        className={`h-9 px-3 rounded-[8px] border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          shortlisted
                            ? 'border-[var(--p-a)] bg-[var(--p-a-soft)] text-[var(--p-a)]'
                            : 'border-[var(--line)] bg-[var(--ink-1)] text-[var(--text-dim)] hover:text-[var(--text)]'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{shortlisted ? 'Tersimpan di My Team' : 'Simpan ke My Team'}</span>
                      </button>
                    )}

                    {onSetCompareCardId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (compareCardId === player.card_id) {
                            onSetCompareCardId(null);
                          } else {
                            onSetCompareCardId(player.card_id);
                          }
                        }}
                        className="h-9 px-3 rounded-[8px] border border-[var(--line)] bg-[var(--ink-1)] text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] flex items-center gap-1.5"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>
                          {compareCardId === player.card_id
                            ? 'Batal Bandingkan'
                            : 'Jadikan Pembanding'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Comparison Second Player Card (if active) */}
                {comparePlayer && (
                  <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--p-b)]/40 p-4 space-y-4">
                    <div className="flex items-start gap-4">
                      <PlayerAvatar
                        cardId={comparePlayer.card_id}
                        basePlayerId={comparePlayer.base_player_id}
                        name={comparePlayer.name}
                        position={comparePlayer.position}
                        isTrending={comparePlayer.is_trending}
                        isIndonesian={comparePlayer.is_indonesian}
                        size="xl"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)] font-mono">
                            {comparePlayer.position}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text-dim)]">
                            {comparePlayer.player_type_label}
                          </span>
                          {comparePlayer.is_trending === 1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--p-a-soft)] text-[var(--p-a)] border border-[var(--p-a)]/40">
                              TRENDING
                            </span>
                          )}
                          {comparePlayer.is_indonesian === 1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/40">
                              IDN
                            </span>
                          )}
                        </div>

                        <h3 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)] truncate">
                          {comparePlayer.name}
                        </h3>

                        <div className="text-xs text-[var(--text-dim)] space-y-0.5">
                          <div>
                            {comparePlayer.club_name || 'Free Agent'} · {comparePlayer.nationality_name}
                          </div>
                          {comparePlayer.variation_name && (
                            <div className="text-[11px] text-[var(--text-faint)]">
                              Paket: {comparePlayer.variation_name}
                            </div>
                          )}
                          <div className="text-[11px] text-[var(--text-faint)]">
                            Gaya Main: <strong className="text-[var(--text)]">{comparePlayer.playing_style_label}</strong> · Usia {comparePlayer.age}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-faint)] block">
                          OVR ({statMode === 'max' ? 'MAKS' : 'LV.1'})
                        </span>
                        <span
                          className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums leading-none"
                          style={{ color: getStatTierColor(compareOvr) }}
                        >
                          {compareOvr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
                      <span className="text-[11px] font-semibold text-[var(--p-b)] uppercase">
                        Pemain Pembanding
                      </span>
                      {onSetCompareCardId && (
                        <button
                          type="button"
                          onClick={() => onSetCompareCardId(null)}
                          className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] underline"
                        >
                          Hapus Pembanding
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Position Proficiency Mini-Pitch & Player Skills */}
              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                {/* Mini Pitch */}
                <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] block">
                    Kecocokan Posisi
                  </span>
                  <div className="rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-3 space-y-1.5">
                    {PITCH_ROWS.map((row, rIdx) => (
                      <div key={rIdx} className="flex items-center justify-center gap-1.5">
                        {row.map((cell) => {
                          const prof = Number(player.positions?.[cell.pos] ?? 0);
                          const isPrimary = player.position === cell.pos;
                          return (
                            <div
                              key={cell.pos}
                              className={`w-14 py-1 rounded text-center text-[10px] font-mono font-bold border ${
                                isPrimary || prof === 2
                                  ? 'bg-[var(--ok)]/20 border-[var(--ok)] text-[var(--ok)]'
                                  : prof === 1
                                  ? 'bg-[var(--p-a-soft)] border-[var(--p-a)]/50 text-[var(--p-a)]'
                                  : 'bg-[var(--ink-2)]/50 border-[var(--line)] text-[var(--text-faint)] opacity-45'
                              }`}
                            >
                              {cell.label}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills & Other Versions of Virtual Player */}
                <div className="space-y-4">
                  {/* Player Skills */}
                  <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] block">
                      Keahlian Pemain (Player Skills · {player.skills?.length || 0})
                    </span>
                    {player.skills && player.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {player.skills.map((sk: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] font-medium"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-faint)]">
                        Tidak ada keahlian khusus terdaftar pada kartu ini.
                      </p>
                    )}
                  </div>

                  {/* Other Card Versions of Same Virtual Player (base_player_id) */}
                  {otherVersions.length > 0 && (
                    <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          <span>
                            Versi Kartu Lain dari {player.name} ({otherVersions.length})
                          </span>
                        </span>
                        <span className="text-[11px] text-[var(--text-faint)]">
                          Klik untuk lihat / bandingkan
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {otherVersions.map((ver) => (
                          <div
                            key={ver.card_id}
                            className="inline-flex items-center gap-2 p-1.5 pr-2.5 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] hover:border-[var(--text-dim)] transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => onSelectCardId(ver.card_id)}
                              className="flex items-center gap-2 text-left"
                            >
                              <span
                                className="font-[family-name:var(--font-display)] font-extrabold text-sm tabular-nums px-1.5 py-0.5 rounded bg-[var(--ink-2)]"
                                style={{
                                  color: getStatTierColor(
                                    statMode === 'max' ? ver.overall_max : ver.overall_lv1
                                  ),
                                }}
                              >
                                {statMode === 'max' ? ver.overall_max : ver.overall_lv1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-[var(--text)] flex items-center gap-1">
                                  <span>{ver.player_type_label}</span>
                                  {ver.is_trending === 1 && (
                                    <span className="text-[9px] px-1 rounded bg-[var(--p-a-soft)] text-[var(--p-a)]">
                                      TRENDING
                                    </span>
                                  )}
                                </div>
                                {ver.variation_name && (
                                  <div className="text-[10px] text-[var(--text-faint)] truncate max-w-[140px]">
                                    {ver.variation_name}
                                  </div>
                                )}
                              </div>
                            </button>
                            {onSetCompareCardId && (
                              <button
                                type="button"
                                onClick={() => onSetCompareCardId(ver.card_id)}
                                title="Bandingkan dengan versi ini"
                                className="p-1 rounded bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-[var(--text)]"
                              >
                                <Scale className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 26 Complete Attributes Grouped by Category */}
              <div className="space-y-4">
                <h4 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)]">
                  Atribut Lengkap ({statMode === 'max' ? 'Level Maksimum' : 'Level 1'})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {STAT_CATEGORIES.map((category) => {
                    const statsInCategory = STAT_DEFINITIONS.filter(
                      (s) => s.group === category
                    );
                    return (
                      <div
                        key={category}
                        className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-2.5"
                      >
                        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] border-b border-[var(--line)] pb-1.5">
                          {category}
                        </div>

                        <div className="space-y-2">
                          {statsInCategory.map((st) => {
                            const valA = Number(activeStats[st.key] ?? 40);
                            const valB = compareStats ? Number(compareStats[st.key] ?? 40) : null;
                            const diff = valB !== null ? valA - valB : 0;

                            return (
                              <div key={st.key} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[var(--text-dim)]">{st.label}</span>
                                  <div className="flex items-center gap-2 font-mono font-bold tabular-nums">
                                    <span style={{ color: getStatTierColor(valA) }}>{valA}</span>
                                    {valB !== null && (
                                      <>
                                        <span className="text-[var(--text-faint)]">vs</span>
                                        <span style={{ color: getStatTierColor(valB) }}>
                                          {valB}
                                        </span>
                                        <span
                                          className={`text-[10px] px-1 rounded ${
                                            diff > 0
                                              ? 'bg-[var(--ok)]/15 text-[var(--ok)]'
                                              : diff < 0
                                              ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
                                              : 'text-[var(--text-faint)]'
                                          }`}
                                        >
                                          {diff > 0 ? `+${diff}` : diff}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-[var(--ink-1)] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(100, Math.max(10, valA))}%`,
                                      backgroundColor: getStatTierColor(valA),
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
