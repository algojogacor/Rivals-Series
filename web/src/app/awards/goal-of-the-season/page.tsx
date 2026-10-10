import Link from 'next/link';
import { getAllGoalNominations, getAllAwardBallots, getParticipants } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateGoalOfTheSeason } from '@/lib/engine';
import { lockAwardBallotAction, submitGoalNominationAction } from '@/lib/actions';
import { PlayerTag } from '@/components/PlayerTag';
import { StatusChip } from '@/components/StatusChip';
import { Sparkles, Trophy, Video, Lock, CheckCircle2, ArrowLeft, ExternalLink, Plus } from 'lucide-react';

export const metadata = {
  title: 'Goal of the Season | Rivals Series Season 1',
  description: 'Alur nominasi dan surat suara peringkat rahasia untuk Goal of the Season Season 1.',
};

export const dynamic = 'force-dynamic';

export default async function GoalOfTheSeasonPage() {
  const [nominations, ballots, participants, session] = await Promise.all([
    getAllGoalNominations(),
    getAllAwardBallots(),
    getParticipants(),
    getSession(),
  ]);

  const pMap = new Map(participants.map((p) => [p.id, p]));
  const officialNominations = nominations.filter((n) => n.status === 'official');

  // Both participants must lock before results are revealed (Pasal 43 ayat 2)
  const paBallot = ballots.find((b) => b.participant_id === 'participant_a');
  const pbBallot = ballots.find((b) => b.participant_id === 'participant_b');
  const bothLocked = Boolean(paBallot?.is_locked && pbBallot?.is_locked);

  const results = bothLocked ? calculateGoalOfTheSeason(officialNominations, ballots) : [];

  // Current participant ballot status
  const currentBallot = session ? ballots.find((b) => b.participant_id === session.participantId) : null;
  const isMyBallotLocked = Boolean(currentBallot?.is_locked);

  // My nominations count
  const myNominationsCount = session
    ? officialNominations.filter((n) => n.participant_id === session.participantId).length
    : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/awards"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Penghargaan</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
          Goal of the Season S1
        </h1>
        <p className="text-[15px] text-[var(--text-dim)] max-w-2xl leading-relaxed">
          Setiap pemain mengajukan maksimal 2 video nominasi gol resmi. Pemenang ditentukan melalui surat suara peringkat rahasia 4–3–2–1 poin (Pasal 43). Hasil baru terbuka setelah kedua pemain mengunci suara.
        </p>
      </div>

      {/* Revealed Results (If both locked) */}
      {bothLocked && results.length > 0 && (
        <section className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--p-a)] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-[var(--p-a)]" />
              <span>Hasil Resmi Goal of the Season</span>
            </h2>
            <StatusChip status="confirmed" label="Kedua Suara Terkunci" />
          </div>

          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.nomination_id}
                className={`p-5 rounded-[8px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  r.is_winner
                    ? 'border-[var(--p-a)] bg-[var(--p-a-soft)]'
                    : 'border-[var(--line)] bg-[var(--ink-2)]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums text-[var(--text)]">
                      #{r.rank}
                    </span>
                    <span className="font-bold text-base text-[var(--text)]">
                      {r.title}
                    </span>
                    {r.is_winner && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-[var(--p-a)] text-[var(--ink-0)] font-extrabold uppercase tracking-wider">
                        Pemenang
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[var(--text-dim)]">
                    Pencetak gol: <strong>{r.scorer_name}</strong> · Diajukan oleh:{' '}
                    {pMap.get(r.participant_id)?.display_name || r.participant_id}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl tabular-nums text-[var(--text)]">
                    {r.total_points} Poin
                  </span>
                  <a
                    href={r.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] hover:border-[var(--text)] text-[var(--text)] transition-colors"
                    title="Tonton Video"
                  >
                    <Video className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lock Status Banner (If not both locked) */}
      {!bothLocked && (
        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[var(--text-dim)]" />
            <div>
              <div className="font-semibold text-sm text-[var(--text)]">
                Status Penguncian Suara Surat Suara
              </div>
              <div className="text-[13px] text-[var(--text-dim)]">
                Pemain A: {paBallot?.is_locked ? 'Terkunci ✅' : 'Belum mengunci ⏳'} · Pemain B:{' '}
                {pbBallot?.is_locked ? 'Terkunci ✅' : 'Belum mengunci ⏳'}
              </div>
            </div>
          </div>
          <span className="text-[12px] text-[var(--text-faint)] italic">
            Hasil otomatis terbuka setelah kedua pemain mengunci suaranya.
          </span>
        </div>
      )}

      {/* Official Nominations List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl uppercase tracking-tight text-[var(--text)]">
            Daftar Video Nominasi Resmi ({officialNominations.length}/4)
          </h2>
          <span className="text-[13px] text-[var(--text-dim)]">Maksimal 2 per pemain</span>
        </div>

        {officialNominations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {officialNominations.map((n) => {
              const p = pMap.get(n.participant_id);
              return (
                <div
                  key={n.id}
                  className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <PlayerTag
                        id={n.participant_id}
                        name={p?.display_name || 'Peserta'}
                        monogram={p?.monogram || 'P'}
                        size="sm"
                      />
                      <span className="font-[family-name:var(--font-display)] font-bold text-sm text-[var(--text-dim)]">
                        {n.match_id}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[var(--text)]">{n.title}</h3>
                    <p className="text-[13px] text-[var(--text-dim)]">
                      Pencetak gol: <strong>{n.scorer_name}</strong>
                    </p>
                    {n.description && (
                      <p className="text-[12px] text-[var(--text-faint)] italic leading-relaxed">
                        &ldquo;{n.description}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[var(--line)] flex justify-end">
                    <a
                      href={n.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text)] hover:underline"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Tonton Bukti Video</span>
                      <ExternalLink className="w-3 h-3 text-[var(--text-dim)]" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] text-center text-[13px] text-[var(--text-dim)]">
            Belum ada nominasi gol resmi yang didaftarkan.
          </div>
        )}
      </section>

      {/* Nomination Form (If logged in and < 2 nominations) */}
      {session && myNominationsCount < 2 && (
        <section className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 space-y-6">
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--text-dim)]" />
              <span>Ajukan Nominasi Gol Resmi Anda ({myNominationsCount}/2)</span>
            </h2>
            <p className="text-[13px] text-[var(--text-dim)] mt-1">
              Setiap pemain berhak mendaftarkan maksimal 2 gol terbaik sepanjang musim.
            </p>
          </div>

          <form
            action={async (formData: FormData) => {
              'use server';
              await submitGoalNominationAction(formData);
            }}
            className="space-y-4 text-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                  Nomor Matchday
                </label>
                <select
                  name="match_id"
                  required
                  className="w-full h-12 px-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                >
                  {[...Array(20)].map((_, i) => (
                    <option key={i + 1} value={`MD${i + 1}`}>
                      MD{i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                  Nama Pencetak Gol
                </label>
                <input
                  type="text"
                  name="scorer_name"
                  placeholder="Contoh: Lionel Messi"
                  required
                  className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                  Judul Gol
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="Contoh: Tendangan Bebas Menit 89"
                  required
                  className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                  Tautan Video (YouTube / Drive / dsb.)
                </label>
                <input
                  type="url"
                  name="video_url"
                  placeholder="https://..."
                  required
                  className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                Keterangan Tambahan (Opsional)
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="Uraian konteks gol..."
                className="w-full p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="h-11 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Kirim Nominasi Gol
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Secret Ballot Voting (If logged in and nominations >= 2 and not locked) */}
      {session && officialNominations.length >= 2 && !isMyBallotLocked && (
        <section className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 space-y-6">
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--text-dim)]" />
              <span>Surat Suara Pemilihan Peringkat Rahasia (Pasal 43)</span>
            </h2>
            <p className="text-[13px] text-[var(--text-dim)] mt-1">
              Urutkan nominasi dari peringkat 1 (4 poin), peringkat 2 (3 poin), dst. Pilihan Anda dirahasiakan hingga kedua pemain mengunci suaranya.
            </p>
          </div>

          <form
            action={async (formData: FormData) => {
              'use server';
              const rankings: string[] = [];
              for (let i = 0; i < officialNominations.length; i++) {
                const val = formData.get(`rank_${i}`)?.toString();
                if (val && !rankings.includes(val)) {
                  rankings.push(val);
                }
              }
              await lockAwardBallotAction(rankings);
            }}
            className="space-y-4"
          >
            <div className="space-y-3">
              {officialNominations.map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="font-[family-name:var(--font-display)] font-bold text-base text-[var(--text-dim)] w-24">
                    Peringkat #{i + 1}
                  </span>
                  <select
                    name={`rank_${i}`}
                    required
                    className="flex-1 h-12 px-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                  >
                    {officialNominations.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({n.scorer_name} · {n.match_id})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--line)]">
              <button
                type="submit"
                className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Kunci Pilihan Suara Secara Rahasia</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {session && isMyBallotLocked && !bothLocked && (
        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--ok)]/40 p-6 flex items-center gap-3 text-sm text-[var(--text)]">
          <CheckCircle2 className="w-5 h-5 text-[var(--ok)] shrink-0" />
          <span>
            Surat suara Anda telah berhasil dikunci secara rahasia. Menunggu lawan tanding mengunci suaranya untuk membuka pengumuman pemenang.
          </span>
        </div>
      )}
    </div>
  );
}
