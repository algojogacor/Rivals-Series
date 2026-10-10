'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { updateParticipantSettingsAction, changeParticipantPinAction } from '@/lib/actions';
import { ControlSession } from './control-types';

interface ProfileSettingsTabProps {
  session: ControlSession;
  isPending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export function ProfileSettingsTab({
  session,
  isPending,
  startTransition,
  showMessage,
}: ProfileSettingsTabProps) {
  const router = useRouter();
  const isA = session.participantId === 'participant_a';

  return (
    <div className="space-y-6">
      {/* Identitas & Warna */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
            Ubah Profil Identitas
          </h2>
          <p className="text-[13px] text-[var(--text-dim)]">
            Nama tampilan, inisial monogram, dan warna identitas Anda di situs (Pasal 1 & 50).
          </p>
        </div>

        <form
          action={(formData) => {
            startTransition(async () => {
              const res = await updateParticipantSettingsAction(formData);
              if (res?.error) {
                showMessage('error', res.error);
              } else {
                showMessage('success', 'Profil identitas berhasil diperbarui.');
                router.refresh();
              }
            });
          }}
          className="space-y-4 max-w-md"
        >
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
              Nama Tampilan
            </label>
            <input
              type="text"
              name="display_name"
              defaultValue={session.participant.display_name}
              required
              className="w-full h-11 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-sm font-semibold text-[var(--text)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                Monogram (2–3 Huruf)
              </label>
              <input
                type="text"
                name="monogram"
                maxLength={3}
                defaultValue={session.participant.monogram}
                required
                className="w-full h-11 px-3 text-center rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] font-bold uppercase text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                Warna Identitas
              </label>
              <input
                type="color"
                name="color"
                defaultValue={session.participant.color || (isA ? '#E5A93B' : '#3AB7A0')}
                className="w-full h-11 p-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="h-11 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
          >
            Simpan Profil Identitas
          </button>
        </form>
      </div>

      {/* Ubah PIN Pribadi */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
            Ubah PIN Keamanan Pribadi
          </h2>
          <p className="text-[13px] text-[var(--text-dim)]">
            PIN Anda disimpan menggunakan hash kriptografi satu arah (scrypt). Perubahan PIN tercatat di Jejak Audit tanpa menyimpan nilai PIN.
          </p>
        </div>

        <form
          action={(formData) => {
            startTransition(async () => {
              const res = await changeParticipantPinAction(formData);
              if (res?.error) {
                showMessage('error', res.error);
              } else {
                showMessage('success', 'PIN keamanan pribadi berhasil diperbarui.');
                router.refresh();
              }
            });
          }}
          className="space-y-4 max-w-md"
        >
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
              PIN Saat Ini
            </label>
            <input
              type="password"
              name="current_pin"
              required
              placeholder="Masukkan PIN saat ini"
              className="w-full h-11 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] font-mono text-sm text-[var(--text)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                PIN Baru (Min. 4 Karakter)
              </label>
              <input
                type="password"
                name="new_pin"
                minLength={4}
                maxLength={32}
                required
                placeholder="PIN baru"
                className="w-full h-11 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] font-mono text-sm text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                Konfirmasi PIN Baru
              </label>
              <input
                type="password"
                name="new_pin_confirm"
                minLength={4}
                maxLength={32}
                required
                placeholder="Ulangi PIN baru"
                className="w-full h-11 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] font-mono text-sm text-[var(--text)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="h-11 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
          >
            Perbarui PIN Keamanan
          </button>
        </form>
      </div>
    </div>
  );
}
