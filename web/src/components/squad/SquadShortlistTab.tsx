'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { getStatTierColor } from '@/lib/efhub-constants';
import { PlayerAvatar } from '../PlayerAvatar';

interface SquadShortlistTabProps {
  localShortlist: any[];
  statMode: 'lv1' | 'max';
  canModifyMySquad: boolean;
  isPending: boolean;
  getSquadCardStatus: (
    cardId: string,
    basePlayerId: number
  ) => {
    inSquad: boolean;
    duplicateVirtualPlayer: boolean;
    existingVersion?: string;
  };
  onSelectCardDetail: (cardId: string) => void;
  onAddCard: (cardId: string, basePlayerId?: number, playerObj?: any) => void;
  onToggleShortlist: (playerObj: any) => void;
}

export function SquadShortlistTab({
  localShortlist,
  statMode,
  canModifyMySquad,
  isPending,
  getSquadCardStatus,
  onSelectCardDetail,
  onAddCard,
  onToggleShortlist,
}: SquadShortlistTabProps) {
  return (
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
                  onClick={() => onSelectCardDetail(p.card_id)}
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
                    onClick={() => onAddCard(p.card_id, p.base_player_id, p)}
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
                    onClick={() => onSelectCardDetail(p.card_id)}
                    className="h-8 px-2.5 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text-dim)]"
                  >
                    Detail
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleShortlist(p)}
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
  );
}
