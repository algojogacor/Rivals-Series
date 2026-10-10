'use client';

import React from 'react';
import { Trash2, LayoutGrid, Layers } from 'lucide-react';
import { RosterCard } from '@/lib/types';
import { updateRosterCardSlotAction } from '@/lib/actions';
import { getStatTierColor } from '@/lib/efhub-constants';
import { PlayerAvatar } from '../PlayerAvatar';
import { SquadPlayerSelect } from '../SquadPlayerSelect';
import { FORMATION_SLOTS } from './squad-constants';

interface SquadRosterTabProps {
  activePhase: number;
  participantDisplayName: string;
  myCards: RosterCard[];
  myTotalCount: number;
  squadViewMode: 'grid' | 'slots';
  setSquadViewMode: (mode: 'grid' | 'slots') => void;
  statMode: 'lv1' | 'max';
  canModifyMySquad: boolean;
  isPending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  onSelectCardDetail: (cardId: string) => void;
  onRemoveCard: (cardId: string, playerName: string) => void;
  onSquadLockedChange?: () => void;
  onSwitchToSearch: () => void;
}

export function SquadRosterTab({
  activePhase,
  participantDisplayName,
  myCards,
  myTotalCount,
  squadViewMode,
  setSquadViewMode,
  statMode,
  canModifyMySquad,
  isPending,
  startTransition,
  onSelectCardDetail,
  onRemoveCard,
  onSquadLockedChange,
  onSwitchToSearch,
}: SquadRosterTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase text-[var(--text)]">
            Skuad Terdaftar {participantDisplayName} — Fase {activePhase} ({myTotalCount}/26)
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
            onClick={onSwitchToSearch}
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
                      onClick={() => onSelectCardDetail(String(c.efootball_card_id))}
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
                      onClick={() => onRemoveCard(c.id, c.player_name)}
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

                  <SquadPlayerSelect
                    cards={myCards}
                    disabled={!canModifyMySquad || isPending}
                    value={assigned?.id || ''}
                    placeholder="Cari & pilih pemain dari skuad..."
                    emptyOptionLabel="— Kosongkan Slot Ini —"
                    emptyOptionValue=""
                    onChange={(val) => {
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
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
