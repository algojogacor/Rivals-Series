import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getParticipants } from '@/lib/db';
import { loginParticipantAction } from '@/lib/actions';
import { Lock, Shield, User } from 'lucide-react';

export const metadata = {
  title: 'Masuk | Rivals Series Season 1',
  description: 'Autentikasi resmi Peserta A dan Peserta B Rivals Series Season 1.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const redirectTarget = params.redirect || '/control';

  if (session) {
    redirect(redirectTarget);
  }

  const participants = await getParticipants();
  const pA = participants.find((p) => p.id === 'participant_a');
  const pB = participants.find((p) => p.id === 'participant_b');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--p-a)] mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
            Masuk Peserta
          </h1>
          <p className="text-[13px] text-[var(--text-dim)]">
            Akses terbatas hanya untuk Peserta A dan Peserta B Rivals Series Season 1
          </p>
        </div>

        {params.error && (
          <div className="rounded-[8px] bg-[var(--danger)]/10 border border-[var(--danger)]/30 p-3 text-[13px] text-[var(--danger)]">
            {params.error}
          </div>
        )}

        <form
          action={async (formData: FormData) => {
            'use server';
            const res = await loginParticipantAction(formData);
            if (res?.error) {
              redirect(`/login?error=${encodeURIComponent(res.error)}&redirect=${encodeURIComponent(redirectTarget)}`);
            }
            redirect(redirectTarget);
          }}
          className="space-y-5"
        >
          {/* Participant Choice */}
          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-[var(--text-dim)]">
              Pilih Identitas Peserta
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] cursor-pointer hover:border-[var(--text-dim)] transition-colors has-[:checked]:border-[var(--p-a)] has-[:checked]:bg-[var(--p-a)]/10">
                <input
                  type="radio"
                  name="participant_id"
                  value="participant_a"
                  defaultChecked
                  className="accent-[var(--p-a)]"
                />
                <div>
                  <div className="font-semibold text-sm text-[var(--text)]">
                    {pA?.display_name || 'Peserta A'}
                  </div>
                  <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider">
                    Pemain A {pA?.profile_completed === 1 ? '· Terdaftar' : '· Belum Setup'}
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] cursor-pointer hover:border-[var(--text-dim)] transition-colors has-[:checked]:border-[var(--p-b)] has-[:checked]:bg-[var(--p-b)]/10">
                <input
                  type="radio"
                  name="participant_id"
                  value="participant_b"
                  className="accent-[var(--p-b)]"
                />
                <div>
                  <div className="font-semibold text-sm text-[var(--text)]">
                    {pB?.display_name || 'Peserta B'}
                  </div>
                  <div className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider">
                    Pemain B {pB?.profile_completed === 1 ? '· Terdaftar' : '· Belum Setup'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* PIN Input */}
          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-[var(--text-dim)]" htmlFor="pin">
              PIN Akses Pribadi
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              required
              placeholder="Masukkan PIN pribadi Anda"
              className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] placeholder-[var(--text-faint)] focus:outline-none focus:border-[var(--text)] transition-colors font-mono"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-12 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none flex items-center justify-center gap-2"
          >
            <span>Masuk ke Konsol</span>
          </button>
        </form>
      </div>
    </div>
  );
}
