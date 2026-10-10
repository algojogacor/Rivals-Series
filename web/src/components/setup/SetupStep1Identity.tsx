'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  ArrowRight,
  UserPlus,
  LogIn,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  RotateCcw,
} from 'lucide-react';
import {
  Participant,
  ParticipantId,
  SeasonSettings,
  RosterPhaseStatus,
  SeasonInvite,
} from '@/lib/types';
import { formatWibTimestamp } from '@/lib/audit';
import { COLOR_SWATCHES } from './setup-constants';

interface SetupStep1IdentityProps {
  activeRole: ParticipantId | null;
  session?: {
    participantId: ParticipantId;
    participant: Participant;
    isAdmin?: boolean;
  } | null;
  participantA: Participant;
  participantB: Participant;
  seasonSettings?: SeasonSettings | null;
  phase1Status: RosterPhaseStatus;
  gateSetupKeyInput: string;
  setGateSetupKeyInput: (val: string) => void;
  gateInviteInput: string;
  setGateInviteInput: (val: string) => void;
  nameA: string;
  monogramA: string;
  colorA: string;
  setColorA: (val: string) => void;
  pinA: string;
  setPinA: (val: string) => void;
  confirmPinA: string;
  setConfirmPinA: (val: string) => void;
  nameB: string;
  monogramB: string;
  colorB: string;
  setColorB: (val: string) => void;
  pinB: string;
  setPinB: (val: string) => void;
  confirmPinB: string;
  setConfirmPinB: (val: string) => void;
  setEditedMonogramA: (val: boolean) => void;
  setEditedMonogramB: (val: boolean) => void;
  setMonogramA: (val: string) => void;
  setMonogramB: (val: string) => void;
  handleNameAChange: (val: string) => void;
  handleNameBChange: (val: string) => void;
  handleSavePlayerA: (e: React.FormEvent) => void;
  handleSavePlayerB: (e: React.FormEvent) => void;
  handleRegenerateInvite: () => void;
  freshInviteToken: string | null;
  freshInviteExpiresAt: string | null;
  latestInvite?: SeasonInvite | null;
  inviteValidation?: {
    valid: boolean;
    status: 'valid' | 'used' | 'expired' | 'revoked' | 'invalid';
    error?: string;
    inviteId?: string;
    expiresAt?: string;
    codeHint?: string;
  } | null;
  copiedType: 'link' | 'code' | null;
  copyToClipboard: (text: string, type: 'link' | 'code') => void;
  fullInviteUrl: string | null;
  activeColorA: string;
  activeColorB: string;
  isPending: boolean;
  onNextStep: () => void;
}

export function SetupStep1Identity({
  activeRole,
  session,
  participantA,
  participantB,
  phase1Status,
  gateSetupKeyInput,
  setGateSetupKeyInput,
  gateInviteInput,
  setGateInviteInput,
  nameA,
  monogramA,
  colorA,
  setColorA,
  pinA,
  setPinA,
  confirmPinA,
  setConfirmPinA,
  nameB,
  monogramB,
  colorB,
  setColorB,
  pinB,
  setPinB,
  confirmPinB,
  setConfirmPinB,
  setEditedMonogramA,
  setEditedMonogramB,
  setMonogramA,
  setMonogramB,
  handleNameAChange,
  handleNameBChange,
  handleSavePlayerA,
  handleSavePlayerB,
  handleRegenerateInvite,
  freshInviteToken,
  freshInviteExpiresAt,
  latestInvite,
  inviteValidation,
  copiedType,
  copyToClipboard,
  fullInviteUrl,
  activeColorA,
  activeColorB,
  isPending,
  onNextStep,
}: SetupStep1IdentityProps) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
          Langkah 1: Identitas & PIN Peserta
        </h2>
        <p className="text-[13px] text-[var(--text-dim)] mt-1">
          Setiap pemain mendaftarkan nama tampilan, warna identitas, dan PIN buatannya sendiri dari perangkatnya masing-masing.
        </p>
      </div>

      {/* ACCESS GATE: Shown when visitor is not logged in and hasn't provided valid SETUP_KEY or valid Invite Token */}
      {!activeRole && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Box 1: Player 1 (Setup Initiator with SETUP_KEY) */}
          <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[var(--p-a)] font-bold text-base uppercase font-[family-name:var(--font-display)]">
              <KeyRound className="w-5 h-5" />
              <span>Pemain Pertama (Pemulai Setup)</span>
            </div>
            {participantA.profile_completed ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Pemain A (<strong>{participantA.display_name}</strong>) sudah terdaftar. Silakan masuk menggunakan PIN yang telah Anda buat untuk melanjutkan penyusunan skuad atau melihat tautan undangan Pemain B.
                </p>
                <Link
                  href="/login?redirect=/setup"
                  className="h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk sebagai {participantA.display_name}</span>
                </Link>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!gateSetupKeyInput.trim()) return;
                  router.push(`/setup?key=${encodeURIComponent(gateSetupKeyInput.trim())}`);
                }}
                className="space-y-3"
              >
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Masukkan <code className="text-[var(--text)]">SETUP_KEY</code> untuk memulai pembuatan musim dan mendapatkan tautan undangan sekali pakai bagi lawan Anda.
                </p>
                <input
                  type="password"
                  value={gateSetupKeyInput}
                  onChange={(e) => setGateSetupKeyInput(e.target.value)}
                  placeholder="Masukkan SETUP_KEY..."
                  required
                  className="w-full h-11 px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-mono text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <span>Buka Setup Pemain A</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Box 2: Player 2 (Joining via One-Time Invite Code) */}
          <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[var(--p-b)] font-bold text-base uppercase font-[family-name:var(--font-display)]">
              <UserPlus className="w-5 h-5" />
              <span>Pemain Kedua (Penerima Undangan)</span>
            </div>
            {participantB.profile_completed ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Pemain B (<strong>{participantB.display_name}</strong>) sudah terdaftar. Silakan masuk menggunakan PIN yang telah Anda buat untuk menyusun dan mengunci skuad Anda.
                </p>
                <Link
                  href="/login?redirect=/setup"
                  className="h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk sebagai {participantB.display_name}</span>
                </Link>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!gateInviteInput.trim()) return;
                  router.push(`/setup?invite=${encodeURIComponent(gateInviteInput.trim())}`);
                }}
                className="space-y-3"
              >
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Masukkan kode undangan sekali pakai (<code className="text-[var(--text)]">RS1-XXXX-XXXX-XXXX</code>) yang dikirimkan oleh Pemain A untuk mendaftarkan akun & PIN Anda.
                </p>
                <input
                  type="text"
                  value={gateInviteInput}
                  onChange={(e) => setGateInviteInput(e.target.value.toUpperCase())}
                  placeholder="RS1-XXXX-XXXX-XXXX"
                  required
                  className="w-full h-11 px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-mono uppercase text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <span>Gunakan Kode Undangan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE ROLE VIEW: Either Player A or Player B */}
      {activeRole && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN: PEMAIN A */}
          <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <span
                className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight"
                style={{ color: colorA }}
              >
                Pemain A · Pemulai Setup
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                  participantA.profile_completed
                    ? 'bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30'
                    : 'bg-[var(--ink-1)] text-[var(--text-dim)] border border-[var(--line)]'
                }`}
              >
                {participantA.profile_completed ? 'Akun Terdaftar' : 'Belum Terdaftar'}
              </span>
            </div>

            {activeRole === 'participant_a' ? (
              <form onSubmit={handleSavePlayerA} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                    Nama Tampilan Anda
                  </label>
                  <input
                    type="text"
                    value={nameA}
                    onChange={(e) => handleNameAChange(e.target.value)}
                    required
                    className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xl font-[family-name:var(--font-display)] uppercase text-[var(--text)] focus:border-[var(--text)] focus:outline-none transition-colors"
                    placeholder="CONTOH: YAYAKGACOR"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                    Inisial / Monogram (2–3 huruf)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={monogramA}
                    onChange={(e) => {
                      setEditedMonogramA(true);
                      setMonogramA(e.target.value.toUpperCase());
                    }}
                    required
                    className="w-24 h-11 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] font-[family-name:var(--font-display)] font-bold uppercase text-[var(--text)] focus:border-[var(--text)] focus:outline-none transition-colors text-center"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-2">
                    Warna Identitas Anda
                  </label>
                  <div className="flex items-center gap-3">
                    {COLOR_SWATCHES.map((swatch) => {
                      const isSelected = colorA.toLowerCase() === swatch.hex.toLowerCase();
                      const isOpponentSelected =
                        Boolean(participantB.profile_completed) &&
                        activeColorB.toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          disabled={isOpponentSelected}
                          onClick={() => setColorA(swatch.hex)}
                          title={
                            swatch.name +
                            (isOpponentSelected ? ' (Dipakai Pemain B)' : '')
                          }
                          className={`relative h-10 w-10 rounded-full transition-transform flex items-center justify-center ${
                            isSelected
                              ? 'ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--ink-2)] scale-110'
                              : isOpponentSelected
                              ? 'opacity-25 cursor-not-allowed'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                        >
                          {isOpponentSelected && (
                            <X className="w-5 h-5 text-[var(--ink-0)] stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line)]">
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-dim)] mb-1">
                      {participantA.profile_completed
                        ? 'PIN Baru (Kosongkan jika tetap)'
                        : 'Buat PIN Akun Anda (Min. 4 karakter)'}
                    </label>
                    <input
                      type="password"
                      value={pinA}
                      onChange={(e) => setPinA(e.target.value)}
                      required={!participantA.profile_completed}
                      placeholder="PIN rahasia Anda"
                      className="w-full h-11 px-3.5 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-mono text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-dim)] mb-1">
                      Konfirmasi PIN
                    </label>
                    <input
                      type="password"
                      value={confirmPinA}
                      onChange={(e) => setConfirmPinA(e.target.value)}
                      required={!participantA.profile_completed || pinA.length > 0}
                      placeholder="Ulangi PIN"
                      className="w-full h-11 px-3.5 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-mono text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Preview PlayerTag */}
                <div className="pt-1">
                  <span className="text-[12px] text-[var(--text-faint)] block mb-1.5">
                    Preview Identitas:
                  </span>
                  <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-[8px] font-[family-name:var(--font-display)] text-xl font-extrabold uppercase"
                      style={{ backgroundColor: colorA, color: 'var(--ink-0)' }}
                    >
                      {monogramA || 'PA'}
                    </div>
                    <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-[var(--text)]">
                      {nameA || 'Pemain A'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan…</span>
                    </>
                  ) : participantA.profile_completed ? (
                    <span>Simpan Perubahan Identitas Saya</span>
                  ) : (
                    <>
                      <span>Simpan Identitas Saya & Buat Undangan Lawan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Read-only view of Player A when Player B is viewing */
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Identitas ini dikelola langsung oleh Pemain A dari perangkatnya sendiri.
                </p>
                <div className="flex items-center gap-3 p-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[8px] font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase"
                    style={{ backgroundColor: activeColorA, color: 'var(--ink-0)' }}
                  >
                    {participantA.monogram || 'PA'}
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-[var(--text)]">
                      {participantA.display_name}
                    </div>
                    <div className="text-xs text-[var(--text-dim)]">
                      Warna: {activeColorA} ·{' '}
                      {phase1Status.pa_locked === 1
                        ? 'Skuad Fase 1 Terkunci'
                        : 'Sedang Menyusun Skuad'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: PEMAIN B (INVITE GENERATOR FOR A, OR REGISTRATION FORM FOR B) */}
          <div className="rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <span
                className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight"
                style={{ color: colorB }}
              >
                Pemain B · Lawan Tanding
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                  participantB.profile_completed
                    ? 'bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30'
                    : 'bg-[var(--ink-1)] text-[var(--text-dim)] border border-[var(--line)]'
                }`}
              >
                {participantB.profile_completed ? 'Akun Terdaftar' : 'Menunggu Undangan'}
              </span>
            </div>

            {activeRole === 'participant_b' ? (
              <form onSubmit={handleSavePlayerB} className="space-y-4">
                {inviteValidation?.valid && !participantB.profile_completed && (
                  <div className="rounded-[8px] bg-[var(--ok)]/10 border border-[var(--ok)]/30 p-3 text-xs text-[var(--ok)] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Undangan sekali pakai terverifikasi! Silakan isi identitas, warna, dan PIN rahasia Anda di bawah ini.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                    Nama Tampilan Anda
                  </label>
                  <input
                    type="text"
                    value={nameB}
                    onChange={(e) => handleNameBChange(e.target.value)}
                    required
                    className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xl font-[family-name:var(--font-display)] uppercase text-[var(--text)] focus:border-[var(--text)] focus:outline-none transition-colors"
                    placeholder="CONTOH: ALGOJOGACOR"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                    Inisial / Monogram (2–3 huruf)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={monogramB}
                    onChange={(e) => {
                      setEditedMonogramB(true);
                      setMonogramB(e.target.value.toUpperCase());
                    }}
                    required
                    className="w-24 h-11 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] font-[family-name:var(--font-display)] font-bold uppercase text-[var(--text)] focus:border-[var(--text)] focus:outline-none transition-colors text-center"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-2">
                    Warna Identitas Anda
                  </label>
                  <div className="flex items-center gap-3">
                    {COLOR_SWATCHES.map((swatch) => {
                      const isSelected = colorB.toLowerCase() === swatch.hex.toLowerCase();
                      const isOpponentSelected =
                        activeColorA.toLowerCase() === swatch.hex.toLowerCase();
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          disabled={isOpponentSelected}
                          onClick={() => setColorB(swatch.hex)}
                          title={
                            swatch.name +
                            (isOpponentSelected ? ' (Dipakai Pemain A)' : '')
                          }
                          className={`relative h-10 w-10 rounded-full transition-transform flex items-center justify-center ${
                            isSelected
                              ? 'ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--ink-2)] scale-110'
                              : isOpponentSelected
                              ? 'opacity-25 cursor-not-allowed'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                        >
                          {isOpponentSelected && (
                            <X className="w-5 h-5 text-[var(--ink-0)] stroke-[3]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line)]">
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-dim)] mb-1">
                      {participantB.profile_completed
                        ? 'PIN Baru (Kosongkan jika tetap)'
                        : 'Buat PIN Akun Anda (Min. 4 karakter)'}
                    </label>
                    <input
                      type="password"
                      value={pinB}
                      onChange={(e) => setPinB(e.target.value)}
                      required={!participantB.profile_completed}
                      placeholder="PIN rahasia Anda"
                      className="w-full h-11 px-3.5 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-mono text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-dim)] mb-1">
                      Konfirmasi PIN
                    </label>
                    <input
                      type="password"
                      value={confirmPinB}
                      onChange={(e) => setConfirmPinB(e.target.value)}
                      required={!participantB.profile_completed || pinB.length > 0}
                      placeholder="Ulangi PIN"
                      className="w-full h-11 px-3.5 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-mono text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Preview PlayerTag */}
                <div className="pt-1">
                  <span className="text-[12px] text-[var(--text-faint)] block mb-1.5">
                    Preview Identitas:
                  </span>
                  <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-[8px] font-[family-name:var(--font-display)] text-xl font-extrabold uppercase"
                      style={{ backgroundColor: colorB, color: 'var(--ink-0)' }}
                    >
                      {monogramB || 'PB'}
                    </div>
                    <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-[var(--text)]">
                      {nameB || 'Pemain B'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan…</span>
                    </>
                  ) : participantB.profile_completed ? (
                    <span>Simpan Perubahan Identitas Saya</span>
                  ) : (
                    <>
                      <span>Simpan Identitas Saya & Bergabung ke Musim</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : participantB.profile_completed ? (
              /* Player B has already joined — show read-only summary to Player A */
              <div className="space-y-4">
                <div className="rounded-[8px] bg-[var(--ok)]/10 border border-[var(--ok)]/30 p-3.5 text-xs text-[var(--ok)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Pemain B telah menerima undangan dan mengatur akun serta PIN-nya sendiri.
                  </span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[8px] font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase"
                    style={{ backgroundColor: activeColorB, color: 'var(--ink-0)' }}
                  >
                    {participantB.monogram || 'PB'}
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase text-[var(--text)]">
                      {participantB.display_name}
                    </div>
                    <div className="text-xs text-[var(--text-dim)]">
                      Warna: {activeColorB} ·{' '}
                      {phase1Status.pb_locked === 1
                        ? 'Skuad Fase 1 Terkunci'
                        : 'Sedang Menyusun Skuad'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Player B has NOT joined yet — show One-Time Invite panel to Player A */
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  Pemain B mengisi nama, warna, PIN, dan skuadnya sendiri dari perangkatnya menggunakan <strong>tautan atau kode undangan sekali pakai</strong> di bawah ini.
                </p>

                {!participantA.profile_completed && !freshInviteToken ? (
                  <div className="rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-5 text-center space-y-2">
                    <UserPlus className="w-6 h-6 mx-auto text-[var(--text-dim)]" />
                    <div className="text-sm font-semibold text-[var(--text)]">
                      Simpan Identitas Pemain A Terlebih Dahulu
                    </div>
                    <p className="text-xs text-[var(--text-faint)]">
                      Begitu Anda menyimpan identitas & PIN Pemain A di kolom kiri, kode dan tautan undangan sekali pakai untuk Pemain B akan langsung dibuat.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-4 space-y-4">
                    {freshInviteToken ? (
                      <>
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ok)]">
                            Kode Undangan Sekali Pakai (Aktif)
                          </span>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] font-mono text-sm font-bold text-[var(--text)] select-all">
                              {freshInviteToken}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(freshInviteToken, 'code')}
                              className="h-10 px-3 rounded-[6px] border border-[var(--line)] bg-[var(--ink-2)] text-xs font-semibold text-[var(--text)] hover:border-[var(--text-dim)] flex items-center gap-1.5 shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedType === 'code' ? 'Tersalin!' : 'Salin Kode'}</span>
                            </button>
                          </div>
                        </div>

                        {fullInviteUrl && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                              Tautan Langsung untuk Pemain B
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={fullInviteUrl}
                                className="flex-1 px-3 py-2 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] font-mono text-xs text-[var(--text-dim)] select-all"
                              />
                              <button
                                type="button"
                                onClick={() => copyToClipboard(fullInviteUrl, 'link')}
                                className="h-9 px-3 rounded-[6px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedType === 'link' ? 'Tersalin!' : 'Salin Link'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : latestInvite ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-dim)]">Kode Terakhir:</span>
                          <code className="font-mono font-bold text-[var(--text)]">
                            {latestInvite.code_hint}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-dim)]">Status:</span>
                          <span className="uppercase font-bold text-[var(--p-a)]">
                            {latestInvite.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-faint)]">
                          Demi keamanan, kode penuh hanya ditampilkan satu kali saat dibuat. Jika Anda belum menyalinnya, klik tombol di bawah untuk membuat tautan undangan baru.
                        </p>
                      </div>
                    ) : null}

                    {(freshInviteExpiresAt || latestInvite?.expires_at) && (
                      <div className="text-[11px] text-[var(--text-faint)] pt-2 border-t border-[var(--line)]">
                        Berlaku sampai:{' '}
                        <strong className="text-[var(--text-dim)]">
                          {formatWibTimestamp(freshInviteExpiresAt || latestInvite?.expires_at)}
                        </strong>{' '}
                        · Sekali pakai
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleRegenerateInvite}
                      className="w-full h-10 rounded-[8px] border border-[var(--line)] bg-[var(--ink-2)] text-xs font-semibold text-[var(--text)] hover:border-[var(--text-dim)] transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Buat Ulang Tautan Undangan Baru</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {session && (
        <div className="flex justify-end pt-4 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onNextStep}
            className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span>Lanjut ke Format Musim</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
