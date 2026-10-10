'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Participant,
  ParticipantId,
  SeasonSettings,
  RosterCard,
  RosterPhaseStatus,
  SeasonInvite,
} from '@/lib/types';
import {
  setupPlayer1AndCreateInviteAction,
  setupPlayer2WithInviteAction,
  regeneratePlayer2InviteAction,
  testSystemReadinessAction,
  completeSeasonSetupAction,
  logoutParticipantAction,
} from '@/lib/actions';
import {
  Check,
  ArrowRight,
  Shield,
  AlertCircle,
  CheckCircle2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { SETUP_STEPS } from './setup/setup-constants';
import { SetupStep1Identity } from './setup/SetupStep1Identity';
import { SetupStep2Format } from './setup/SetupStep2Format';
import { SetupStep3Squad } from './setup/SetupStep3Squad';
import { SetupStep4Readiness } from './setup/SetupStep4Readiness';
import { SetupStep5Kickoff } from './setup/SetupStep5Kickoff';

interface SetupWizardClientProps {
  session?: {
    participantId: ParticipantId;
    participant: Participant;
    isAdmin?: boolean;
  } | null;
  participantA: Participant;
  participantB: Participant;
  seasonSettings?: SeasonSettings | null;
  setupKeyValid?: boolean;
  setupKeyFromUrl?: string | null;
  inviteTokenFromUrl?: string | null;
  inviteValidation?: {
    valid: boolean;
    status: 'valid' | 'used' | 'expired' | 'revoked' | 'invalid';
    error?: string;
    inviteId?: string;
    expiresAt?: string;
    codeHint?: string;
  } | null;
  latestInvite?: SeasonInvite | null;
  phase1Status: RosterPhaseStatus;
  visibleCardsPhase1: RosterCard[];
  shortlistCards?: any[];
  paSummaryPhase1: { count: number; trending: number; indo: number };
  pbSummaryPhase1: { count: number; trending: number; indo: number };
}

export function SetupWizardClient({
  session = null,
  participantA,
  participantB,
  seasonSettings,
  setupKeyValid = false,
  setupKeyFromUrl = null,
  inviteTokenFromUrl = null,
  inviteValidation = null,
  latestInvite = null,
  phase1Status,
  visibleCardsPhase1,
  shortlistCards = [],
  paSummaryPhase1,
  pbSummaryPhase1,
}: SetupWizardClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Entry gate state
  const [gateSetupKeyInput, setGateSetupKeyInput] = useState(setupKeyFromUrl || '');
  const [gateInviteInput, setGateInviteInput] = useState(inviteTokenFromUrl || '');

  // Active role determination
  const activeRole: ParticipantId | null =
    session?.participantId === 'participant_b' || inviteValidation?.valid
      ? 'participant_b'
      : session?.participantId === 'participant_a' || setupKeyValid
      ? 'participant_a'
      : null;

  // Player A Form State
  const [nameA, setNameA] = useState(
    participantA.profile_completed ? participantA.display_name : ''
  );
  const [monogramA, setMonogramA] = useState(
    participantA.profile_completed ? participantA.monogram : 'PA'
  );
  const [colorA, setColorA] = useState(seasonSettings?.player_a_color || '#ffb02e');
  const [pinA, setPinA] = useState('');
  const [confirmPinA, setConfirmPinA] = useState('');
  const [editedMonogramA, setEditedMonogramA] = useState(false);

  // Player B Form State
  const [nameB, setNameB] = useState(
    participantB.profile_completed ? participantB.display_name : ''
  );
  const [monogramB, setMonogramB] = useState(
    participantB.profile_completed ? participantB.monogram : 'PB'
  );
  const [colorB, setColorB] = useState(() => {
    const initialB = seasonSettings?.player_b_color || '#3ec9e6';
    const initialA = seasonSettings?.player_a_color || '#ffb02e';
    if (initialB.toLowerCase() === initialA.toLowerCase()) {
      return initialA.toLowerCase() === '#ffb02e' ? '#3ec9e6' : '#ffb02e';
    }
    return initialB;
  });
  const [pinB, setPinB] = useState('');
  const [confirmPinB, setConfirmPinB] = useState('');
  const [editedMonogramB, setEditedMonogramB] = useState(false);

  // Freshly generated invite token state
  const [freshInviteToken, setFreshInviteToken] = useState<string | null>(null);
  const [freshInviteExpiresAt, setFreshInviteExpiresAt] = useState<string | null>(
    latestInvite?.expires_at || null
  );
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);

  const handleNameAChange = (val: string) => {
    setNameA(val);
    if (!editedMonogramA) {
      setMonogramA(val.trim().slice(0, 2).toUpperCase() || 'PA');
    }
  };

  const handleNameBChange = (val: string) => {
    setNameB(val);
    if (!editedMonogramB) {
      setMonogramB(val.trim().slice(0, 2).toUpperCase() || 'PB');
    }
  };

  // Step 4 Checklist State
  const [checkingSystem, setCheckingSystem] = useState(false);
  const [systemReadiness, setSystemReadiness] = useState<{
    dbConnection: boolean | null;
    tablesCreated: boolean | null;
    matchesSeeded: boolean | null;
    settingsSaved: boolean | null;
    playersSynced?: boolean | null;
    playersCount?: number;
    errorMessage: string | null;
  }>({
    dbConnection: null,
    tablesCreated: null,
    matchesSeeded: null,
    settingsSaved: null,
    playersSynced: null,
    playersCount: 0,
    errorMessage: null,
  });

  useEffect(() => {
    if (currentStep === 4) {
      runSystemCheck();
    }
  }, [currentStep]);

  const runSystemCheck = async () => {
    setCheckingSystem(true);
    setSystemReadiness({
      dbConnection: null,
      tablesCreated: null,
      matchesSeeded: null,
      settingsSaved: null,
      playersSynced: null,
      playersCount: 0,
      errorMessage: null,
    });

    try {
      const res = await testSystemReadinessAction();
      if (res.results) {
        setSystemReadiness(res.results);
      }
    } catch {
      setSystemReadiness({
        dbConnection: false,
        tablesCreated: false,
        matchesSeeded: false,
        settingsSaved: false,
        playersSynced: false,
        playersCount: 0,
        errorMessage: 'Gagal menghubungi server database. Periksa koneksi atau variabel lingkungan.',
      });
    } finally {
      setCheckingSystem(false);
    }
  };

  const allSystemChecksPassed =
    systemReadiness.dbConnection === true &&
    systemReadiness.tablesCreated === true &&
    systemReadiness.matchesSeeded === true &&
    systemReadiness.settingsSaved === true &&
    systemReadiness.playersSynced === true;

  // Save Player A Identity + PIN & Issue Invite for Player B
  const handleSavePlayerA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nameA.trim()) {
      setErrorMessage('Nama tampilan Pemain A wajib diisi.');
      return;
    }

    if (!participantA.profile_completed && pinA.trim().length < 4) {
      setErrorMessage('Buat PIN keamanan Anda (minimal 4 karakter).');
      return;
    }

    if (pinA.trim().length > 0 && pinA.trim() !== confirmPinA.trim()) {
      setErrorMessage('Konfirmasi PIN tidak cocok.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('name_a', nameA.trim());
      formData.set('monogram_a', monogramA.trim() || nameA.trim().slice(0, 2).toUpperCase());
      formData.set('color_a', colorA);
      if (pinA.trim()) {
        formData.set('pin_a', pinA.trim());
        formData.set('confirm_pin_a', confirmPinA.trim());
      }
      if (setupKeyFromUrl || gateSetupKeyInput) {
        formData.set('setup_key', setupKeyFromUrl || gateSetupKeyInput);
      }

      const res = await setupPlayer1AndCreateInviteAction(formData);
      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        document.documentElement.style.setProperty('--p-a', colorA);
        setPinA('');
        setConfirmPinA('');
        if (res.inviteToken) {
          setFreshInviteToken(res.inviteToken);
          setFreshInviteExpiresAt(res.inviteExpiresAt || null);
          setSuccessMessage(
            'Identitas & PIN Pemain A berhasil disimpan! Bagikan tautan atau kode undangan sekali pakai di sebelah kanan kepada Pemain B.'
          );
        } else {
          setSuccessMessage('Identitas Pemain A berhasil diperbarui.');
        }
        router.refresh();
      }
    });
  };

  // Regenerate One-Time Invite for Player B
  const handleRegenerateInvite = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await regeneratePlayer2InviteAction();
      if (res?.error) {
        setErrorMessage(res.error);
      } else if (res.inviteToken) {
        setFreshInviteToken(res.inviteToken);
        setFreshInviteExpiresAt(res.inviteExpiresAt || null);
        setSuccessMessage('Tautan undangan sekali pakai baru untuk Pemain B berhasil dibuat!');
        router.refresh();
      }
    });
  };

  // Save Player B Identity + PIN (Redeeming One-Time Invite)
  const handleSavePlayerB = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nameB.trim()) {
      setErrorMessage('Nama tampilan Pemain B wajib diisi.');
      return;
    }

    if (colorB.toLowerCase() === (seasonSettings?.player_a_color || colorA).toLowerCase()) {
      setErrorMessage('Warna Pemain B tidak boleh sama dengan warna Pemain A.');
      return;
    }

    if (!participantB.profile_completed && pinB.trim().length < 4) {
      setErrorMessage('Buat PIN keamanan Anda (minimal 4 karakter).');
      return;
    }

    if (pinB.trim().length > 0 && pinB.trim() !== confirmPinB.trim()) {
      setErrorMessage('Konfirmasi PIN tidak cocok.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('name_b', nameB.trim());
      formData.set('monogram_b', monogramB.trim() || nameB.trim().slice(0, 2).toUpperCase());
      formData.set('color_b', colorB);
      if (pinB.trim()) {
        formData.set('pin_b', pinB.trim());
        formData.set('confirm_pin_b', confirmPinB.trim());
      }
      if (inviteTokenFromUrl) {
        formData.set('invite_token', inviteTokenFromUrl);
      }

      const res = await setupPlayer2WithInviteAction(formData);
      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        document.documentElement.style.setProperty('--p-b', colorB);
        setPinB('');
        setConfirmPinB('');
        setSuccessMessage(
          'Akun & PIN Pemain B berhasil didaftarkan! Lanjutkan ke Langkah 2 dan Langkah 3 untuk menyusun skuad Anda.'
        );
        router.refresh();
        setCurrentStep(2);
      }
    });
  };

  const copyToClipboard = (text: string, type: 'link' | 'code') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const fullInviteUrl =
    freshInviteToken && typeof window !== 'undefined'
      ? `${window.location.origin}/setup?invite=${encodeURIComponent(freshInviteToken)}`
      : freshInviteToken
      ? `/setup?invite=${encodeURIComponent(freshInviteToken)}`
      : null;

  // Step 5 Complete Setup & Start Season
  const [isStartingSeason, setIsStartingSeason] = useState(false);
  const bothProfilesReady =
    Boolean(participantA.profile_completed) && Boolean(participantB.profile_completed);
  const canStartSeason = bothProfilesReady && phase1Status.both_locked && Boolean(session);

  const handleStartSeason = () => {
    setErrorMessage(null);
    if (!bothProfilesReady || !phase1Status.both_locked) {
      setErrorMessage(
        'Musim belum dapat dimulai: kedua pemain wajib mendaftarkan akun & PIN serta mengunci skuad Fase 1 masing-masing.'
      );
      return;
    }

    setIsStartingSeason(true);

    startTransition(async () => {
      const res = await completeSeasonSetupAction();
      if (res?.error) {
        setIsStartingSeason(false);
        setErrorMessage(res.error);
      } else {
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 600);
      }
    });
  };

  const displayNameA = participantA.profile_completed
    ? participantA.display_name
    : nameA || 'Pemain A';
  const displayNameB = participantB.profile_completed
    ? participantB.display_name
    : nameB || 'Pemain B';
  const activeColorA = seasonSettings?.player_a_color || colorA;
  const activeColorB = seasonSettings?.player_b_color || colorB;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center bg-[var(--ink-0)] text-[var(--text)] overflow-hidden px-4 py-8 md:p-10">
      {/* 1. ATMOSFER HERO: Stadion + Garis Lapangan + Pita Rumput Samar */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent, transparent 120px, rgba(255, 255, 255, 0.02) 120px, rgba(255, 255, 255, 0.02) 240px)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--text) 5%, transparent) 0%, transparent 75%)',
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-white/6"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        preserveAspectRatio="none"
      >
        <line x1="50%" y1="0%" x2="50%" y2="100%" strokeWidth="1.5" />
        <ellipse cx="50%" cy="50%" rx="140" ry="140" strokeWidth="1.5" />
        <circle cx="50%" cy="50%" r="4" fill="rgba(255,255,255,0.06)" />
      </svg>

      {/* Starting Curtain Animation */}
      {isStartingSeason && (
        <div className="fixed inset-0 z-50 bg-[var(--ink-0)] pointer-events-none [animation:curtainSweep_600ms_cubic-bezier(0.16,1,0.3,1)_forwards]" />
      )}

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-[1240px] flex flex-col space-y-6">
        {/* Top Session Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-[var(--text-dim)]">
            <Shield className="w-4 h-4 text-[var(--p-a)]" />
            <span>Model Akun Setara · Setiap pemain mengatur identitas, PIN & skuadnya sendiri</span>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <span className="text-[var(--text-dim)]">
                  Aktif sebagai:{' '}
                  <strong className="text-[var(--text)]">
                    {session.participant.display_name} (
                    {session.participantId === 'participant_a' ? 'Pemain A' : 'Pemain B'})
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      await logoutParticipantAction();
                      router.refresh();
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[var(--line)] bg-[var(--ink-2)] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ganti Akun / Keluar</span>
                </button>
              </>
            ) : (
              <Link
                href="/login?redirect=/setup"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] border border-[var(--line)] bg-[var(--ink-2)] text-[var(--text)] font-semibold hover:border-[var(--text-dim)] transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sudah Punya PIN? Masuk</span>
              </Link>
            )}
          </div>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[13px] font-semibold tracking-wider uppercase text-[var(--text-dim)]">
            <span>Rivals Series Season 1</span>
            <span>·</span>
            <span>Konfigurasi Musim</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.25rem,5vw,4rem)] uppercase tracking-tight text-[var(--text)] leading-none">
            Persiapan Pertandingan
          </h1>
        </div>

        {/* Mobile Stepper: 5 Dots Indicator */}
        <div className="flex md:hidden items-center justify-center gap-3">
          {SETUP_STEPS.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? 'w-8 bg-[var(--text)]'
                    : isCompleted
                    ? 'w-2.5 bg-[var(--ok)]'
                    : 'w-2.5 bg-[var(--line)]'
                }`}
              />
            );
          })}
        </div>

        {/* Wizard Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 md:p-8 shadow-2xl">
          {/* Stepper Kiri (Desktop) */}
          <div className="hidden md:flex flex-col justify-between border-r border-[var(--line)] pr-6 space-y-8">
            <div className="space-y-6">
              {SETUP_STEPS.map((s) => {
                const isCompleted = currentStep > s.num;
                const isCurrent = currentStep === s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setCurrentStep(s.num)}
                    className="flex items-start gap-4 text-left w-full group"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border text-sm font-bold transition-colors ${
                        isCompleted
                          ? 'border-[var(--ok)] bg-[var(--ok)]/15 text-[var(--ok)]'
                          : isCurrent
                          ? 'border-[var(--text)] bg-[var(--ink-2)] text-[var(--text)] ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--ink-1)]'
                          : 'border-[var(--line)] bg-[var(--ink-2)] text-[var(--text-faint)] group-hover:border-[var(--text-dim)]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <div className="space-y-0.5">
                      <div
                        className={`text-sm font-bold uppercase tracking-tight font-[family-name:var(--font-display)] ${
                          isCurrent ? 'text-[var(--text)] text-base' : 'text-[var(--text-dim)]'
                        }`}
                      >
                        {s.title}
                      </div>
                      <div className="text-[12px] text-[var(--text-faint)]">{s.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-6 border-t border-[var(--line)] text-[12px] text-[var(--text-faint)] space-y-1">
              <div>RS S1 Official Regulations</div>
              <div>Kedua pemain memiliki hak setara.</div>
            </div>
          </div>

          {/* Konten Kanan (Active Step) */}
          <div className="flex flex-col justify-center min-w-0">
            {errorMessage && (
              <div className="mb-6 rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 p-4 text-[13px] text-[var(--danger)] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 rounded-[8px] bg-[var(--ok)]/15 border border-[var(--ok)]/40 p-4 text-[13px] text-[var(--ok)] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Invite validation error banner if ?invite= was invalid/expired/used */}
            {inviteTokenFromUrl && inviteValidation && !inviteValidation.valid && !session && (
              <div className="mb-6 rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 p-4 text-[13px] text-[var(--danger)] space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Undangan Tidak Dapat Digunakan ({inviteValidation.status.toUpperCase()})</span>
                </div>
                <p>{inviteValidation.error}</p>
                {inviteValidation.status === 'used' && (
                  <Link
                    href="/login?redirect=/setup"
                    className="inline-flex items-center gap-1.5 font-bold underline text-[var(--text)]"
                  >
                    <span>Masuk dengan PIN Pemain B</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* STEP 1: SIAPA YANG BERTANDING? */}
            {currentStep === 1 && (
              <SetupStep1Identity
                activeRole={activeRole}
                session={session}
                participantA={participantA}
                participantB={participantB}
                seasonSettings={seasonSettings}
                phase1Status={phase1Status}
                gateSetupKeyInput={gateSetupKeyInput}
                setGateSetupKeyInput={setGateSetupKeyInput}
                gateInviteInput={gateInviteInput}
                setGateInviteInput={setGateInviteInput}
                nameA={nameA}
                monogramA={monogramA}
                colorA={colorA}
                setColorA={setColorA}
                pinA={pinA}
                setPinA={setPinA}
                confirmPinA={confirmPinA}
                setConfirmPinA={setConfirmPinA}
                nameB={nameB}
                monogramB={monogramB}
                colorB={colorB}
                setColorB={setColorB}
                pinB={pinB}
                setPinB={setPinB}
                confirmPinB={confirmPinB}
                setConfirmPinB={setConfirmPinB}
                setEditedMonogramA={setEditedMonogramA}
                setEditedMonogramB={setEditedMonogramB}
                setMonogramA={setMonogramA}
                setMonogramB={setMonogramB}
                handleNameAChange={handleNameAChange}
                handleNameBChange={handleNameBChange}
                handleSavePlayerA={handleSavePlayerA}
                handleSavePlayerB={handleSavePlayerB}
                handleRegenerateInvite={handleRegenerateInvite}
                freshInviteToken={freshInviteToken}
                freshInviteExpiresAt={freshInviteExpiresAt}
                latestInvite={latestInvite}
                inviteValidation={inviteValidation}
                copiedType={copiedType}
                copyToClipboard={copyToClipboard}
                fullInviteUrl={fullInviteUrl}
                activeColorA={activeColorA}
                activeColorB={activeColorB}
                isPending={isPending}
                onNextStep={() => setCurrentStep(2)}
              />
            )}

            {/* STEP 2: FORMAT MUSIM */}
            {currentStep === 2 && (
              <SetupStep2Format
                onPrevStep={() => setCurrentStep(1)}
                onNextStep={() => setCurrentStep(3)}
              />
            )}

            {/* STEP 3: SUSUN SKUAD (eFHUB WORKBENCH) */}
            {currentStep === 3 && (
              <SetupStep3Squad
                session={session}
                participantA={participantA}
                participantB={participantB}
                displayNameA={displayNameA}
                displayNameB={displayNameB}
                monogramA={monogramA}
                monogramB={monogramB}
                phase1Status={phase1Status}
                visibleCardsPhase1={visibleCardsPhase1}
                shortlistCards={shortlistCards}
                paSummaryPhase1={paSummaryPhase1}
                pbSummaryPhase1={pbSummaryPhase1}
                onPrevStep={() => setCurrentStep(2)}
                onNextStep={() => setCurrentStep(4)}
              />
            )}

            {/* STEP 4: SIAPKAN SISTEM */}
            {currentStep === 4 && (
              <SetupStep4Readiness
                checkingSystem={checkingSystem}
                systemReadiness={systemReadiness}
                allSystemChecksPassed={allSystemChecksPassed}
                runSystemCheck={runSystemCheck}
                onPrevStep={() => setCurrentStep(3)}
                onNextStep={() => setCurrentStep(5)}
              />
            )}

            {/* STEP 5: SIAP KICK-OFF */}
            {currentStep === 5 && (
              <SetupStep5Kickoff
                participantA={participantA}
                participantB={participantB}
                displayNameA={displayNameA}
                displayNameB={displayNameB}
                activeColorA={activeColorA}
                activeColorB={activeColorB}
                phase1Status={phase1Status}
                paSummaryPhase1={paSummaryPhase1}
                pbSummaryPhase1={pbSummaryPhase1}
                bothProfilesReady={bothProfilesReady}
                canStartSeason={canStartSeason}
                isStartingSeason={isStartingSeason}
                isPending={isPending}
                handleStartSeason={handleStartSeason}
                onPrevStep={() => setCurrentStep(4)}
                onGoToStep={(step) => setCurrentStep(step)}
              />
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes curtainSweep {
          0% {
            clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
          }
          100% {
            clip-path: polygon(0 0, 100% 0, 100% 0, 0 100%);
          }
        }
      `}</style>
    </div>
  );
}
