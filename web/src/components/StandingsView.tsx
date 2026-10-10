'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ParticipantStanding } from '@/lib/types';
import { PlayerTag } from './PlayerTag';
import { ChevronDown, ChevronUp, Flag, ShieldAlert, Award } from 'lucide-react';

interface StandingsViewProps {
  standings: ParticipantStanding[];
}

export function StandingsView({ standings }: StandingsViewProps) {
  const [openQuota, setOpenQuota] = useState(false);
  const [openTiebreaker, setOpenTiebreaker] = useState(false);

  // Check if points are tied
  const isTied = standings.length >= 2 && standings[0].points === standings[1].points && standings[0].mp > 0;
  let activeTiebreakerStep = 0;
  if (isTied) {
    if (standings[0].gd !== standings[1].gd) activeTiebreakerStep = 1;
    else if (standings[0].gf !== standings[1].gf) activeTiebreakerStep = 2;
    else if (standings[0].w !== standings[1].w) activeTiebreakerStep = 3;
    else if (standings[0].wins_knockout !== standings[1].wins_knockout) activeTiebreakerStep = 4;
    else if (standings[0].gd_knockout !== standings[1].gd_knockout) activeTiebreakerStep = 5;
    else activeTiebreakerStep = 6;
  }

  const renderFormDot = (res: 'W' | 'D' | 'L' | null, participantId: string, index: number) => {
    let dotStyle = 'border border-[var(--text-dim)] bg-transparent';
    let title = 'Belum bertanding';
    const isPlayerA = participantId === 'participant_a';

    if (res === 'W') {
      dotStyle = isPlayerA ? 'bg-[var(--p-a)] border-transparent' : 'bg-[var(--p-b)] border-transparent';
      title = 'Menang';
    } else if (res === 'D') {
      dotStyle = 'bg-[var(--text-dim)] border-transparent';
      title = 'Seri';
    } else if (res === 'L') {
      dotStyle = 'border border-[var(--danger)] bg-transparent';
      title = 'Kalah';
    }

    return (
      <span
        key={index}
        className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${dotStyle}`}
        title={title}
      />
    );
  };

  const renderQuotaDots = (credits: number, participantId: string) => {
    const isPlayerA = participantId === 'participant_a';
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((dot) => {
          const isFilled = dot <= credits;
          return (
            <span
              key={dot}
              className={`w-2 h-2 rounded-full ${
                isFilled
                  ? isPlayerA
                    ? 'bg-[var(--p-a)]'
                    : 'bg-[var(--p-b)]'
                  : 'border border-[var(--line)] bg-transparent'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
          Klasemen
        </h1>
        <p className="text-[15px] text-[var(--text-dim)] max-w-2xl">
          Tabel klasemen otoritatif Rivals Series Season 1 yang diperbarui otomatis setelah tiap pertandingan disahkan kedua pemain.
        </p>
      </div>

      {/* 2. Desktop Table (Tinggi baris 72px, lebar penuh, kolom Poin beralas --ink-2) */}
      <div className="hidden md:block rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] text-[12px] font-semibold text-[var(--text-dim)] uppercase tracking-wider h-12">
                <th className="py-3 px-4 w-12 text-center">Pos</th>
                <th className="py-3 px-4">Pemain</th>
                <th className="py-3 px-3 text-center">Main</th>
                <th className="py-3 px-3 text-center">M</th>
                <th className="py-3 px-3 text-center">S</th>
                <th className="py-3 px-3 text-center">K</th>
                <th className="py-3 px-3 text-center">GF</th>
                <th className="py-3 px-3 text-center">GA</th>
                <th className="py-3 px-3 text-center">GD</th>
                <th className="py-3 px-6 text-center bg-[var(--ink-2)] text-[var(--text)] font-bold">
                  Poin
                </th>
                <th className="py-3 px-4 text-center">Kredit ID</th>
                <th className="py-3 px-4 text-center">Sanksi</th>
                <th className="py-3 px-4 text-center">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {standings.map((s) => {
                const paddedForm = [...Array(Math.max(0, 5 - s.form.length)).fill(null), ...s.form.slice(-5)];
                return (
                  <tr key={s.participant_id} className="h-[72px] hover:bg-[var(--ink-2)]/40 transition-colors">
                    {/* Pos */}
                    <td className="py-3 px-4 text-center font-[family-name:var(--font-display)] font-extrabold text-2xl text-[var(--text-dim)]">
                      #{s.rank}
                    </td>

                    {/* Pemain */}
                    <td className="py-3 px-4">
                      <Link href={`/participants/${s.participant_id}`} className="hover:opacity-85 transition-opacity inline-flex items-center">
                        <PlayerTag
                          id={s.participant_id}
                          name={s.display_name}
                          monogram={s.monogram}
                          size="md"
                        />
                      </Link>
                    </td>

                    {/* Main */}
                    <td className="py-3 px-3 text-center tabular-nums text-sm font-medium text-[var(--text)]">
                      {s.mp}
                    </td>

                    {/* M */}
                    <td className="py-3 px-3 text-center tabular-nums text-sm font-semibold text-[var(--text)]">
                      {s.w}
                    </td>

                    {/* S */}
                    <td className="py-3 px-3 text-center tabular-nums text-sm text-[var(--text-dim)]">
                      {s.d}
                    </td>

                    {/* K */}
                    <td className="py-3 px-3 text-center tabular-nums text-sm text-[var(--text-dim)]">
                      {s.l}
                    </td>

                    {/* GF */}
                    <td className="py-3 px-3 text-center tabular-nums text-sm text-[var(--text)]">
                      {s.gf}
                    </td>

                    {/* GA */}
                    <td className="py-3 px-3 text-center tabular-nums text-sm text-[var(--text-dim)]">
                      {s.ga}
                    </td>

                    {/* GD */}
                    <td className="py-3 px-3 text-center tabular-nums text-sm font-semibold">
                      <span className={s.gd > 0 ? 'text-[var(--text)]' : s.gd < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-dim)]'}>
                        {s.gd > 0 ? `+${s.gd}` : s.gd}
                      </span>
                    </td>

                    {/* POIN (Display paling besar, alas --ink-2) */}
                    <td className="py-3 px-6 text-center bg-[var(--ink-2)] font-[family-name:var(--font-display)] font-extrabold text-3xl tabular-nums text-[var(--text)]">
                      {s.points}
                    </td>

                    {/* Kredit ID */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {renderQuotaDots(s.id_credits, s.participant_id)}
                        <span className="text-[11px] tabular-nums text-[var(--text-faint)]">
                          {s.id_credits}/5
                        </span>
                      </div>
                    </td>

                    {/* Sanksi */}
                    <td className="py-3 px-4 text-center text-xs">
                      {s.sanction_deductions > 0 ? (
                        <span className="text-[var(--danger)] font-bold tabular-nums">
                          -{s.sanction_deductions}
                        </span>
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )}
                    </td>

                    {/* Form */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {paddedForm.map((res, i) => renderFormDot(res, s.participant_id, i))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Mobile View (390px): Dua kartu bertumpuk dengan statistik 2 kolom */}
      <div className="block md:hidden space-y-4">
        {standings.map((s) => {
          const paddedForm = [...Array(Math.max(0, 5 - s.form.length)).fill(null), ...s.form.slice(-5)];
          return (
            <div
              key={s.participant_id}
              className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4"
            >
              {/* Header: Rank + PlayerTag + Points */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-3">
                  <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl text-[var(--text-dim)]">
                    #{s.rank}
                  </span>
                  <PlayerTag
                    id={s.participant_id}
                    name={s.display_name}
                    monogram={s.monogram}
                    size="md"
                  />
                </div>
                <div className="text-right">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                    Poin
                  </span>
                  <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl tabular-nums text-[var(--text)]">
                    {s.points}
                  </span>
                </div>
              </div>

              {/* Stats Grid: 2 Kolom */}
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex justify-between items-center">
                  <span className="text-[var(--text-dim)]">Main / M-S-K</span>
                  <span className="font-semibold tabular-nums text-[var(--text)]">
                    {s.mp} · {s.w}-{s.d}-{s.l}
                  </span>
                </div>
                <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex justify-between items-center">
                  <span className="text-[var(--text-dim)]">Gol / Selisih</span>
                  <span className="font-semibold tabular-nums text-[var(--text)]">
                    {s.gf}:{s.ga} ({s.gd > 0 ? `+${s.gd}` : s.gd})
                  </span>
                </div>
                <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex justify-between items-center">
                  <span className="text-[var(--text-dim)]">Kredit ID</span>
                  <div className="flex items-center gap-1.5">
                    {renderQuotaDots(s.id_credits, s.participant_id)}
                    <span className="text-[12px] font-semibold tabular-nums text-[var(--text)]">
                      {s.id_credits}/5
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex justify-between items-center">
                  <span className="text-[var(--text-dim)]">Form Terakhir</span>
                  <div className="flex items-center gap-1">
                    {paddedForm.map((res, i) => renderFormDot(res, s.participant_id, i))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Accordions (Tertutup default) */}
      <div className="space-y-3 pt-2">
        {/* Accordion 1: Ketentuan kuota 5 kredit pemain Indonesia */}
        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenQuota(!openQuota)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--ink-2)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Flag className="w-4 h-4 text-[var(--text-dim)]" />
              <span className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)]">
                Ketentuan Kuota 5 Kredit Pemain Indonesia
              </span>
            </div>
            {openQuota ? <ChevronUp className="w-5 h-5 text-[var(--text-dim)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-dim)]" />}
          </button>

          {openQuota && (
            <div className="p-5 pt-0 border-t border-[var(--line)] space-y-3 text-[14px] text-[var(--text-dim)] leading-relaxed">
              <p>
                Setiap peserta wajib mengumpulkan sekurang-kurangnya <strong>lima (5) kredit babak Indonesia</strong> sepanjang Season 1.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Satu kredit dihitung apabila minimal satu pemain berkebangsaan Indonesia berada di lapangan sepanjang satu babak reguler penuh (babak pertama atau kedua).</li>
                <li>Pemain pengganti di tengah babak tidak menghasilkan kredit untuk babak tersebut.</li>
                <li>Jika pada akhir musim (setelah MD20) peserta mengumpulkan kurang dari 5 kredit, dikenakan sanksi pemotongan <strong>3 poin</strong> dari total klasemen akhir.</li>
              </ul>
              <div className="pt-2">
                <Link href="/rules#pasal-19" className="text-[13px] text-[var(--text)] hover:underline inline-flex items-center gap-1">
                  <span>Lihat Pasal 19 Regulasi Resmi</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Penentuan peringkat jika poin sama */}
        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenTiebreaker(!openTiebreaker)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--ink-2)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-[var(--text-dim)]" />
              <span className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)]">
                Penentuan Peringkat Jika Poin Sama
              </span>
            </div>
            {openTiebreaker ? <ChevronUp className="w-5 h-5 text-[var(--text-dim)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-dim)]" />}
          </button>

          {openTiebreaker && (
            <div className="p-5 pt-0 border-t border-[var(--line)] space-y-3 text-[14px] text-[var(--text-dim)] leading-relaxed">
              <p>
                Jika kedua peserta memiliki perolehan poin yang sama, pemeringkatan ditentukan berdasarkan urutan kriteria berikut secara berjenjang:
              </p>
              <ol className="space-y-2">
                {[
                  { step: 1, title: 'Selisih Gol (GD) Keseluruhan', desc: 'Dihitung dari seluruh 20 matchday (GF − GA).' },
                  { step: 2, title: 'Jumlah Gol Masuk (GF)', desc: 'Total seluruh gol yang dicetak pada waktu reguler dan ET.' },
                  { step: 3, title: 'Jumlah Kemenangan Keseluruhan', desc: 'Total seluruh kemenangan yang diraih sepanjang musim.' },
                  { step: 4, title: 'Kemenangan Fase Knockout (MD11–MD20)', desc: 'Jumlah kemenangan khusus pada sepuluh matchday fase kedua.' },
                  { step: 5, title: 'Selisih Gol Fase Knockout (MD11–MD20)', desc: 'Selisih gol khusus pada sepuluh matchday fase kedua.' },
                  { step: 6, title: 'Championship Playoff', desc: 'Satu pertandingan penentuan 10 menit dengan ET & Penalti.' },
                ].map((item) => {
                  const isDeciding = activeTiebreakerStep === item.step;
                  return (
                    <li
                      key={item.step}
                      className={`p-3 rounded-[8px] border flex items-start gap-3 ${
                        isDeciding
                          ? 'bg-[var(--ink-2)] border-[var(--text)] text-[var(--text)]'
                          : 'bg-[var(--ink-2)]/40 border-[var(--line)]'
                      }`}
                    >
                      <span className="font-[family-name:var(--font-display)] font-bold text-base text-[var(--text)]">
                        {item.step}.
                      </span>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-sm text-[var(--text)] flex items-center gap-2">
                          <span>{item.title}</span>
                          {isDeciding && (
                            <span className="px-2 py-0.5 rounded text-[11px] bg-[var(--text)] text-[var(--ink-0)] font-bold uppercase tracking-wider">
                              Kriteria Penentu Saat Ini
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-[var(--text-dim)]">{item.desc}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="pt-2">
                <Link href="/rules#pasal-8" className="text-[13px] text-[var(--text)] hover:underline inline-flex items-center gap-1">
                  <span>Lihat Pasal 8 Regulasi Resmi</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
