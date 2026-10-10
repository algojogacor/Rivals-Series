'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { RosterCard } from '@/lib/types';
import { PlayerAvatar } from './PlayerAvatar';
import { getStatTierColor } from '@/lib/efhub-constants';

interface SquadPlayerSelectProps {
  cards: RosterCard[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyOptionLabel?: string;
  emptyOptionValue?: string;
  disabled?: boolean;
}

export function SquadPlayerSelect({
  cards,
  value,
  onChange,
  placeholder = 'Pilih pemain dari skuad...',
  emptyOptionLabel = '— Ketik Manual / Kosongkan Pilihan —',
  emptyOptionValue = '',
  disabled = false,
}: SquadPlayerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === value) || null,
    [cards, value]
  );

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => {
      const name = (c.player_name || '').toLowerCase();
      const pos = (c.position || '').toLowerCase();
      const ver = (c.card_version || '').toLowerCase();
      const club = (c.club_name || '').toLowerCase();
      return (
        name.includes(q) ||
        pos.includes(q) ||
        ver.includes(q) ||
        club.includes(q) ||
        (q === 'trending' && c.is_trending === 1) ||
        ((q === 'idn' || q === 'indonesia') && c.is_indonesian === 1)
      );
    });
  }, [cards, query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 15);
    } else {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full min-h-[44px] px-2.5 py-1.5 rounded-[8px] bg-[var(--ink-2)] border transition-colors flex items-center justify-between gap-2 text-left disabled:opacity-50 ${
          open
            ? 'border-[var(--text)] ring-1 ring-[var(--text)]/30'
            : 'border-[var(--line)] hover:border-[var(--text-dim)]'
        }`}
      >
        {selectedCard ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <PlayerAvatar
              cardId={selectedCard.efootball_card_id}
              basePlayerId={selectedCard.base_player_id}
              name={selectedCard.player_name}
              position={selectedCard.position}
              isTrending={selectedCard.is_trending}
              isIndonesian={selectedCard.is_indonesian}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedCard.position && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)]">
                    {selectedCard.position}
                  </span>
                )}
                <span className="font-bold text-xs text-[var(--text)] truncate">
                  {selectedCard.player_name}
                </span>
                {selectedCard.is_trending === 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--p-a-soft)] text-[var(--p-a)]">
                    TRENDING
                  </span>
                )}
                {selectedCard.is_indonesian === 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--ok)]/15 text-[var(--ok)]">
                    IDN
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-dim)] truncate">
                {selectedCard.card_version}
              </div>
            </div>
            {(selectedCard.overall_max || selectedCard.overall_lv1) && (
              <span
                className="font-[family-name:var(--font-display)] font-extrabold text-lg tabular-nums shrink-0 pr-1"
                style={{
                  color: getStatTierColor(
                    Number(selectedCard.overall_max || selectedCard.overall_lv1 || 80)
                  ),
                }}
              >
                {selectedCard.overall_max || selectedCard.overall_lv1}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)] truncate">
            <Search className="w-3.5 h-3.5 text-[var(--text-faint)] shrink-0" />
            <span className="truncate">{placeholder}</span>
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-[var(--text-dim)] shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] shadow-2xl overflow-hidden">
          {/* Search Input Header */}
          <div className="p-2 border-b border-[var(--line)] bg-[var(--ink-2)] flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--text-dim)] shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik nama pemain, posisi (CF, LWF, GK)..."
              className="w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none py-1"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[var(--line)]/60">
            {emptyOptionLabel && (
              <button
                type="button"
                onClick={() => {
                  onChange(emptyOptionValue);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[var(--ink-2)] transition-colors ${
                  value === emptyOptionValue
                    ? 'bg-[var(--ink-2)] text-[var(--text)] font-semibold'
                    : 'text-[var(--text-dim)]'
                }`}
              >
                <span>{emptyOptionLabel}</span>
                {value === emptyOptionValue && <Check className="w-3.5 h-3.5 text-[var(--ok)]" />}
              </button>
            )}

            {filteredCards.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-faint)]">
                Tidak ada pemain di skuad yang cocok dengan &ldquo;{query}&rdquo;.
              </div>
            ) : (
              filteredCards.map((c) => {
                const isSelected = c.id === value;
                const ovr = c.overall_max || c.overall_lv1;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 text-left flex items-center justify-between gap-2.5 hover:bg-[var(--ink-2)] transition-colors ${
                      isSelected ? 'bg-[var(--ink-2)]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <PlayerAvatar
                        cardId={c.efootball_card_id}
                        basePlayerId={c.base_player_id}
                        name={c.player_name}
                        position={c.position}
                        isTrending={c.is_trending}
                        isIndonesian={c.is_indonesian}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.position && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[var(--ink-0)] border border-[var(--line)] text-[var(--text)]">
                              {c.position}
                            </span>
                          )}
                          <span className="font-bold text-xs text-[var(--text)] truncate">
                            {c.player_name}
                          </span>
                          {c.is_trending === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--p-a-soft)] text-[var(--p-a)]">
                              TRENDING
                            </span>
                          )}
                          {c.is_indonesian === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--ok)]/15 text-[var(--ok)]">
                              IDN
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--text-dim)] truncate">
                          {c.card_version}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ovr && (
                        <span
                          className="font-[family-name:var(--font-display)] font-extrabold text-lg tabular-nums"
                          style={{ color: getStatTierColor(Number(ovr)) }}
                        >
                          {ovr}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-[var(--ok)]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
