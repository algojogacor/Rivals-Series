'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { RosterCard } from '@/lib/types';
import { getStatTierColor } from '@/lib/efhub-constants';
import { PlayerAvatar } from '../PlayerAvatar';

interface SquadOpponentTabProps {
  activePhase: number;
  opponentDisplayName: string;
  opponentCards: RosterCard[];
  bothLocked: boolean;
  statMode: 'lv1' | 'max';
  onSelectCardDetail: (cardId: string) => void;
}

export function SquadOpponentTab({
  activePhase,
  opponentDisplayName,
  opponentCards,
  bothLocked,
  statMode,
  onSelectCardDetail,
}: SquadOpponentTabProps) {
  return (
    <div className="space-y-4">
      {!bothLocked ? (
        <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-8 sm:p-12 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink-1)] border border-[var(--line)] text-[var(--p-a)]">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase text-[var(--text)]">
            Skuad {opponentDisplayName} Masih Dirahasiakan
          </h3>
          <p className="text-xs text-[var(--text-dim)] max-w-md mx-auto leading-relaxed">
            Sesuai <strong>Pasal 14 ayat (2)</strong>, daftar kartu skuad lawan disembunyikan sepenuhnya di server dan tidak dikirim ke peramban sampai <strong>kedua peserta</strong> mengunci skuad masing-masing untuk Fase {activePhase}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase text-[var(--text)]">
              Skuad Resmi {opponentDisplayName} — Fase {activePhase} ({opponentCards.length}/26)
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
                    c.efootball_card_id && onSelectCardDetail(String(c.efootball_card_id))
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
  );
}
