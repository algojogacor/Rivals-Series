import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getMatchByMd,
  getParticipants,
  getAllGoalEvents,
  getAllGoalkeeperRecords,
  getAllQuotaCredits,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { deriveMatchSettings } from '@/lib/engine';
import { PlayerTag } from '@/components/PlayerTag';
import { StatusChip } from '@/components/StatusChip';
import { confirmMatchReportAction } from '@/lib/actions';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  Shield,
  FileText,
  Settings2,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ md: string }>;
}) {
  const { md } = await params;
  const mdNumber = Number(md);
  if (isNaN(mdNumber) || mdNumber < 1 || mdNumber > 20) {
    notFound();
  }

  const [match, participants, session] = await Promise.all([
    getMatchByMd(mdNumber),
    getParticipants(),
    getSession(),
  ]);

  if (!match) {
    notFound();
  }

  const settings = deriveMatchSettings(mdNumber);
  const pMap = new Map(participants.map((p) => [p.id, p]));
  const homeP = pMap.get(match.home_participant_id);
  const awayP = pMap.get(match.away_participant_id);

  const [goalEvents, gkRecords, quotaCredits] = await Promise.all([
    getAllGoalEvents(match.id),
    getAllGoalkeeperRecords(match.id),
    getAllQuotaCredits(match.id),
  ]);

  const isPlayed = match.home_score !== null && match.away_score !== null;
  const isConfirmed = ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(match.status);

  const isAWinner = isConfirmed && match.winner_id === 'participant_a';
  const isBWinner = isConfirmed && match.winner_id === 'participant_b';

  const paCredits = quotaCredits.find((c) => c.participant_id === 'participant_a');
  const pbCredits = quotaCredits.find((c) => c.participant_id === 'participant_b');

  const paGk = gkRecords.find((r) => r.participant_id === 'participant_a');
  const pbGk = gkRecords.find((r) => r.participant_id === 'participant_b');

  // Can current user confirm?
  const canConfirm =
    session &&
    match.status === 'awaiting_confirmation' &&
    ((session.participantId === 'participant_a' && !match.confirmed_by_pa_at) ||
      (session.participantId === 'participant_b' && !match.confirmed_by_pb_at) ||
      session.isAdmin);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Match Center</span>
        </Link>
      </div>

      {/* Main Scoreboard Header */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl text-[var(--text)]">
              {match.id}
            </span>
            <span className="text-[13px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
              {settings.phaseLabel}
            </span>
          </div>

          <StatusChip
            status={match.status}
            confirmationStatus={match.confirmation_status}
          />
        </div>

        {/* Scoreboard Row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8 py-2">
          {/* Home Player (Left) */}
          <div className="flex flex-col items-end text-right space-y-1">
            <PlayerTag
              id={match.home_participant_id}
              name={homeP?.display_name || 'Peserta A'}
              monogram={homeP?.monogram || 'PA'}
              size="lg"
            />
            <span className="text-[12px] text-[var(--text-faint)]">
              Room Creator (Tuan Rumah)
            </span>
          </div>

          {/* Center Score or VS */}
          <div className="flex flex-col items-center justify-center text-center px-4 shrink-0">
            {isPlayed ? (
              <div className="space-y-1">
                <div className="font-[family-name:var(--font-display)] font-extrabold text-5xl sm:text-6xl tabular-nums leading-none tracking-tight flex items-center gap-2 sm:gap-3">
                  <span
                    style={{
                      color:
                        match.home_participant_id === 'participant_a'
                          ? isAWinner
                            ? 'var(--p-a)'
                            : 'var(--text)'
                          : isBWinner
                          ? 'var(--p-b)'
                          : 'var(--text)',
                    }}
                  >
                    {match.home_score}
                  </span>
                  <span className="text-[var(--text-dim)] text-3xl sm:text-4xl">:</span>
                  <span
                    style={{
                      color:
                        match.away_participant_id === 'participant_b'
                          ? isBWinner
                            ? 'var(--p-b)'
                            : 'var(--text)'
                          : isAWinner
                          ? 'var(--p-a)'
                          : 'var(--text)',
                    }}
                  >
                    {match.away_score}
                  </span>
                </div>
                {match.et_played === 1 && (
                  <span className="text-[12px] font-semibold text-[var(--text-dim)] block">
                    Setelah Perpanjangan Waktu (AET)
                  </span>
                )}
                {match.pk_played === 1 && (
                  <span className="text-[12px] font-bold text-[var(--ok)] block tabular-nums">
                    Adu Penalti: {match.home_pk_score} – {match.away_pk_score}
                  </span>
                )}
              </div>
            ) : (
              <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl sm:text-4xl text-[var(--text-dim)] uppercase">
                vs
              </span>
            )}
          </div>

          {/* Away Player (Right) */}
          <div className="flex flex-col items-start text-left space-y-1">
            <PlayerTag
              id={match.away_participant_id}
              name={awayP?.display_name || 'Peserta B'}
              monogram={awayP?.monogram || 'PB'}
              size="lg"
            />
            <span className="text-[12px] text-[var(--text-faint)]">
              Tamu (Away)
            </span>
          </div>
        </div>

        {/* Match Settings Chips */}
        <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-dim)]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
              <Settings2 className="w-3.5 h-3.5" />
              <span>{settings.durationMinutes} Menit</span>
            </span>
            <span className="px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
              {settings.extraTimeAllowed ? 'Extra Time on' : 'Extra Time off'}
            </span>
            <span className="px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
              {settings.penaltiesAllowed ? 'Penalti on' : 'Penalti off'}
            </span>
            <span className="px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
              Kondisi Acak
            </span>
          </div>

          {/* Confirm Action Button if awaiting confirmation */}
          {canConfirm && (
            <form
              action={async () => {
                'use server';
                await confirmMatchReportAction(match.id);
              }}
            >
              <button
                type="submit"
                className="h-10 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Konfirmasi & Sahkan Hasil
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Match Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Gol & Kiper */}
        <div className="space-y-6">
          {/* Gol Terdaftar */}
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--text-dim)]" />
              <span>Gol & Pencetak Skor</span>
            </h2>

            {goalEvents.length > 0 ? (
              <div className="divide-y divide-[var(--line)]">
                {goalEvents.map((g) => {
                  const isA = g.scoring_participant_id === 'participant_a';
                  return (
                    <div key={g.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="font-[family-name:var(--font-display)] font-bold text-base tabular-nums text-[var(--text-dim)] w-8">
                          {g.minute ? `${g.minute}'` : '—'}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[var(--text)]">
                              {g.scorer_player_name}
                            </span>
                            {g.scorer_card_version && (
                              <span className="text-[11px] text-[var(--text-faint)]">
                                ({g.scorer_card_version})
                              </span>
                            )}
                            {g.is_own_goal === 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--danger)]/15 text-[var(--danger)]">
                                OG
                              </span>
                            )}
                          </div>
                          {g.assist_player_name && (
                            <div className="text-[12px] text-[var(--text-dim)] flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] uppercase font-bold text-[var(--text-faint)] tracking-wider">Asis:</span>
                              <span className="font-medium text-[var(--text)]">{g.assist_player_name}</span>
                              {g.assist_card_version && (
                                <span className="text-[10px] text-[var(--text-faint)]">({g.assist_card_version})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-[12px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: isA ? 'var(--p-a-soft)' : 'var(--p-b-soft)',
                          color: isA ? 'var(--p-a)' : 'var(--p-b)',
                        }}
                      >
                        {isA ? 'Pemain A' : 'Pemain B'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-dim)]">
                {isPlayed ? 'Tidak ada gol tercatat dalam pertandingan ini (0–0).' : 'Pertandingan belum dimainkan.'}
              </p>
            )}
          </div>

          {/* Kiper Starter (Golden Glove) */}
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--text-dim)]" />
              <span>Kiper Starter (Pasal 42)</span>
            </h2>

            <div className="space-y-3">
              <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider block">
                    Kiper Pemain A
                  </span>
                  <span className="font-semibold text-sm text-[var(--text)]">
                    {paGk?.goalkeeper_name || '—'}
                  </span>
                </div>
                {paGk?.clean_sheet_eligible === 1 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30">
                    Clean Sheet Sah
                  </span>
                )}
              </div>

              <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider block">
                    Kiper Pemain B
                  </span>
                  <span className="font-semibold text-sm text-[var(--text)]">
                    {pbGk?.goalkeeper_name || '—'}
                  </span>
                </div>
                {pbGk?.clean_sheet_eligible === 1 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30">
                    Clean Sheet Sah
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Kuota Indonesia & Bukti Audit */}
        <div className="space-y-6">
          {/* Kepatuhan Kartu Trending per Matchday (Pasal 17) */}
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Flag className="w-4 h-4 text-[var(--p-a)]" />
              <span>Kepatuhan Kartu Trending (Pasal 17)</span>
            </h2>

            <div className="space-y-3">
              {(() => {
                const paH1 = Number(paCredits?.trending_first_half ?? 1);
                const paH2 = Number(paCredits?.trending_second_half ?? 0);
                const paCompliant = paH1 === 1 || paH2 === 1;
                return (
                  <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider block">
                        Trending Pemain A (Wajib ≥2 Kartu di ≥1 Babak)
                      </span>
                      <span className="font-semibold text-sm text-[var(--text)]">
                        Babak 1: {paH1 ? 'Ya (≥2)' : 'Tidak'} · Babak 2: {paH2 ? 'Ya (≥2)' : 'Tidak'}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded uppercase shrink-0 ${
                        paCompliant
                          ? 'bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30'
                          : 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30'
                      }`}
                    >
                      {paCompliant ? 'Memenuhi Pasal 17' : 'Melanggar Pasal 17'}
                    </span>
                  </div>
                );
              })()}

              {(() => {
                const pbH1 = Number(pbCredits?.trending_first_half ?? 1);
                const pbH2 = Number(pbCredits?.trending_second_half ?? 0);
                const pbCompliant = pbH1 === 1 || pbH2 === 1;
                return (
                  <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider block">
                        Trending Pemain B (Wajib ≥2 Kartu di ≥1 Babak)
                      </span>
                      <span className="font-semibold text-sm text-[var(--text)]">
                        Babak 1: {pbH1 ? 'Ya (≥2)' : 'Tidak'} · Babak 2: {pbH2 ? 'Ya (≥2)' : 'Tidak'}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded uppercase shrink-0 ${
                        pbCompliant
                          ? 'bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30'
                          : 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30'
                      }`}
                    >
                      {pbCompliant ? 'Memenuhi Pasal 17' : 'Melanggar Pasal 17'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Kuota Indonesia Attestation */}
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Flag className="w-4 h-4 text-[var(--text-dim)]" />
              <span>DSP & Kredit Pemain Indonesia (Pasal 18 & 19)</span>
            </h2>

            <div className="space-y-3">
              <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider block">
                    Kredit Pemain A · DSP: {paCredits?.indonesia_in_dsp !== 0 ? 'Tercantum' : 'Tidak Ada'}
                  </span>
                  <span className="font-semibold text-sm text-[var(--text)]">
                    Babak 1: {paCredits?.first_half_credit ? 'Sah (1)' : 'Tidak (0)'} · Babak 2: {paCredits?.second_half_credit ? 'Sah (1)' : 'Tidak (0)'}
                  </span>
                </div>
                <span className="font-[family-name:var(--font-display)] font-extrabold text-xl text-[var(--p-a)]">
                  {(paCredits?.first_half_credit || 0) + (paCredits?.second_half_credit || 0)} Kredit
                </span>
              </div>

              <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider block">
                    Kredit Pemain B · DSP: {pbCredits?.indonesia_in_dsp !== 0 ? 'Tercantum' : 'Tidak Ada'}
                  </span>
                  <span className="font-semibold text-sm text-[var(--text)]">
                    Babak 1: {pbCredits?.first_half_credit ? 'Sah (1)' : 'Tidak (0)'} · Babak 2: {pbCredits?.second_half_credit ? 'Sah (1)' : 'Tidak (0)'}
                  </span>
                </div>
                <span className="font-[family-name:var(--font-display)] font-extrabold text-xl text-[var(--p-b)]">
                  {(pbCredits?.first_half_credit || 0) + (pbCredits?.second_half_credit || 0)} Kredit
                </span>
              </div>
            </div>
          </div>

          {/* Bukti & Catatan Laporan */}
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--text-dim)]" />
              <span>Bukti Laporan & Verifikasi</span>
            </h2>

            <div className="space-y-3 text-[13px] text-[var(--text-dim)]">
              {match.match_report_text && (
                <div className="p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] italic">
                  &ldquo;{match.match_report_text}&rdquo;
                </div>
              )}

              {match.result_screenshot_url && (
                <div>
                  <a
                    href={match.result_screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[var(--text)] hover:underline font-medium"
                  >
                    <span>Buka Tangkapan Layar Hasil Pertandingan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-[var(--line)] space-y-1 text-[12px] text-[var(--text-faint)]">
                <div>Dilaporkan oleh: {match.reported_by || '—'}</div>
                <div>Konfirmasi Pemain A: {match.confirmed_by_pa_at ? new Date(match.confirmed_by_pa_at).toLocaleString('id-ID') : 'Belum'}</div>
                <div>Konfirmasi Pemain B: {match.confirmed_by_pb_at ? new Date(match.confirmed_by_pb_at).toLocaleString('id-ID') : 'Belum'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
