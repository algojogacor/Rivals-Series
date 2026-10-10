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
import { formatWibTimestamp } from '@/lib/audit';
import { SquadBuilderWorkbench } from './SquadBuilderWorkbench';
import {
  Check,
  X,
  Loader2,
  ArrowRight,
  RotateCcw,
  Shield,
  Trophy,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lock,
  KeyRound,
  Copy,
  UserPlus,
  LogIn,
  LogOut,
} from 'lucide-react';

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

const COLOR_SWATCHES = [
  { hex: '#ffb02e', name: 'Amber' },
  { hex: '#3ec9e6', name: 'Cyan' },
  { hex: '#ff6b5a', name: 'Koral' },
  { hex: '#a5e44b', name: 'Lime' },
  { hex: '#ff5fa2', name: 'Pink' },
  { hex: '#a78bfa', name: 'Violet' },
];

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

  // Entry gate state (when user opens /setup without ?key=, without ?invite=, and without being logged in)
  const [gateSetupKeyInput, setGateSetupKeyInput] = useState(setupKeyFromUrl || '');
  const [gateInviteInput, setGateInviteInput] = useState(inviteTokenFromUrl || '');

  // Determine active setup role:
  // - 'participant_b' if logged in as participant_b OR holding a valid invite token
  // - 'participant_a' if logged in as participant_a OR holding a valid SETUP_KEY
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

  // Freshly generated invite token state (only visible to Player A right after creation/regeneration)
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

  const steps = [
    { num: 1, title: 'Siapa yang bertanding?', desc: 'Identitas, PIN & undangan' },
    { num: 2, title: 'Format musim', desc: 'Aturan resmi 20 Matchday' },
    { num: 3, title: 'Susun skuad', desc: '26 kartu eFHUB & kunci skuad' },
    { num: 4, title: 'Siapkan sistem', desc: 'Pemeriksaan otomatis database' },
    { num: 5, title: 'Siap kick-off', desc: 'Peluit perdana musim' },
  ];

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
          {steps.map((s) => {
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
              {steps.map((s) => {
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

            {/* STEP 1: SIAPA YANG BERTANDING? (EQUAL PEER ACCOUNTS & ONE-TIME INVITE) */}
            {currentStep === 1 && (
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
                      onClick={() => setCurrentStep(2)}
                      className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <span>Lanjut ke Format Musim</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: FORMAT MUSIM */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
                    Langkah 2: Format Musim
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)] mt-1">
                    Ringkasan regulasi resmi dari <code className="text-[var(--text)]">rules.md</code>. Tidak ada yang perlu diisi di langkah ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--p-a)] font-semibold text-sm">
                      <Trophy className="w-4 h-4" />
                      <span>20 Matchday Duel</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                      MD1–MD10: <strong>Group Stage</strong> (Menang 3, Seri 1, Kalah 0).
                      <br />
                      MD11–MD20: <strong>Knockout Stage</strong> (ET & Penalti on, tidak ada hasil seri).
                    </p>
                  </div>

                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--p-b)] font-semibold text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Kartu Trending & Kuota Indonesia</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                      Wajib minimal 2 pemain <strong>Trending</strong> bermain bersamaan 1 babak reguler penuh di tiap MD (Pasal 17), serta 1 pemain <strong>Indonesia</strong> di DSP tiap laga dan target 5 kredit musiman (Pasal 18–19).
                    </p>
                  </div>

                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Skuad 26 Kartu Tanpa Kembar</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                      Maksimal 26 kartu per peserta tanpa kartu kembar dari pemain virtual yang sama (Pasal 14). Terkunci sampai MD10 selesai dan skuad lawan dirahasiakan sampai keduanya mengunci.
                    </p>
                  </div>

                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
                      <Shield className="w-4 h-4" />
                      <span>Kedudukan Setara & Konsensus</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                      Kedua pemain memiliki hak yang setara. Pengesahan hasil, pembukaan sengketa, dan reset musim membutuhkan persetujuan lawan atau verifikasi bukti sesuai regulasi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
                  >
                    Kembali
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <span>Lanjut ke Susun Skuad</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SUSUN SKUAD (eFHUB WORKBENCH) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
                    Langkah 3: Susun Skuad Musim (Fase 1)
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)] mt-1">
                    Setiap pemain menyusun dan mengunci skuadnya sendiri (maksimal 26 kartu, minimal 2 kartu Trending, tanpa kartu kembar). Skuad lawan tersembunyi di server sampai keduanya terkunci.
                  </p>
                </div>

                <SquadBuilderWorkbench
                  session={session ? { ...session, isAdmin: false } : null}
                  participants={[
                    { ...participantA, display_name: displayNameA, monogram: monogramA },
                    { ...participantB, display_name: displayNameB, monogram: monogramB },
                  ]}
                  initialPhase={1}
                  phase1Status={phase1Status}
                  visibleCardsPhase1={visibleCardsPhase1}
                  shortlistCards={shortlistCards}
                  paSummaryPhase1={paSummaryPhase1}
                  pbSummaryPhase1={pbSummaryPhase1}
                  onSquadLockedChange={() => router.refresh()}
                />

                <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
                  >
                    Kembali
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <span>Lanjut ke Pemeriksaan Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SIAPKAN SISTEM */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
                    Langkah 4: Siapkan Sistem
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)] mt-1">
                    Pemeriksaan otomatis kesiapan koneksi database, struktur tabel, katalog pemain eFHUB, dan data matchday sebelum kick-off.
                  </p>
                </div>

                <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] divide-y divide-[var(--line)]">
                  {/* Item 1 */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text)]">
                        1. Koneksi Database Turso LibSQL
                      </div>
                      <div className="text-[12px] text-[var(--text-faint)]">
                        Menghubungkan ke cloud database endpoint
                      </div>
                    </div>
                    <div>
                      {checkingSystem && systemReadiness.dbConnection === null ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
                      ) : systemReadiness.dbConnection ? (
                        <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Terhubung</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                          <X className="w-5 h-5" />
                          <span>Gagal</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text)]">
                        2. Tabel-tabel Sistem & Undangan Terverifikasi
                      </div>
                      <div className="text-[12px] text-[var(--text-faint)]">
                        Peserta, undangan sekali pakai, jadwal, jejak audit kekal, dan indeks skuad
                      </div>
                    </div>
                    <div>
                      {checkingSystem && systemReadiness.tablesCreated === null ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
                      ) : systemReadiness.tablesCreated ? (
                        <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Lengkap</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                          <X className="w-5 h-5" />
                          <span>Gagal</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text)]">
                        3. Katalog Pemain eFootball™ (eFHUB) Terindeks
                      </div>
                      <div className="text-[12px] text-[var(--text-faint)]">
                        Tabel lookup pemain eFootball™ dengan indeks FTS5
                      </div>
                    </div>
                    <div>
                      {checkingSystem && systemReadiness.playersSynced === null ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
                      ) : systemReadiness.playersSynced ? (
                        <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>
                            {(systemReadiness.playersCount || 0).toLocaleString('id-ID')} Kartu Siap
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                          <X className="w-5 h-5" />
                          <span>Belum Disinkronkan (pnpm sync:players)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text)]">
                        4. 20 Matchday Disiapkan
                      </div>
                      <div className="text-[12px] text-[var(--text-faint)]">
                        Jadwal MD1 sampai MD20 siap dimainkan
                      </div>
                    </div>
                    <div>
                      {checkingSystem && systemReadiness.matchesSeeded === null ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
                      ) : systemReadiness.matchesSeeded ? (
                        <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>20 Laga Siap</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                          <X className="w-5 h-5" />
                          <span>Gagal</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item 5 */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text)]">
                        5. Pengaturan Musim Tersimpan
                      </div>
                      <div className="text-[12px] text-[var(--text-faint)]">
                        Warna pemain dan durasi 8 menit disahkan
                      </div>
                    </div>
                    <div>
                      {checkingSystem && systemReadiness.settingsSaved === null ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
                      ) : systemReadiness.settingsSaved ? (
                        <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Tersimpan</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                          <X className="w-5 h-5" />
                          <span>Gagal</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {systemReadiness.errorMessage && (
                  <div className="rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 p-4 text-[13px] text-[var(--danger)]">
                    {systemReadiness.errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
                    >
                      Kembali ke Skuad
                    </button>

                    <button
                      type="button"
                      disabled={checkingSystem}
                      onClick={runSystemCheck}
                      className="h-12 px-5 rounded-[8px] border border-[var(--line)] text-[var(--text-dim)] font-medium text-sm hover:text-[var(--text)] hover:bg-[var(--ink-2)] transition-colors flex items-center gap-2"
                    >
                      <RotateCcw className={`w-4 h-4 ${checkingSystem ? 'animate-spin' : ''}`} />
                      <span>Coba Lagi</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!allSystemChecksPassed || checkingSystem}
                    onClick={() => setCurrentStep(5)}
                    className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                  >
                    <span>Lanjut ke Kick-off</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: SIAP KICK-OFF */}
            {currentStep === 5 && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
                    Langkah 5: Siap Kick-off
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)] mt-1">
                    Musim baru dapat berstatus berjalan (&ldquo;Live&rdquo;) setelah kedua pemain selesai mendaftarkan akunnya dan kedua skuad Fase 1 terkunci (Pasal 14 ayat 2).
                  </p>
                </div>

                {/* Big VS View with Player Colors, Account Status & Squad Lock Status */}
                <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-8 sm:p-12 text-center space-y-6">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
                    <div className="space-y-2.5">
                      <div
                        className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl uppercase tracking-tight"
                        style={{ color: activeColorA }}
                      >
                        {displayNameA}
                      </div>
                      <div className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
                        Pemain A · Pemulai Setup
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              participantA.profile_completed
                                ? 'text-[var(--ok)]'
                                : 'text-[var(--text-faint)]'
                            }`}
                          />
                          <span>
                            {participantA.profile_completed
                              ? 'Akun & PIN Terdaftar'
                              : 'Akun Belum Terdaftar'}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                          <Lock
                            className={`w-3.5 h-3.5 ${
                              phase1Status.pa_locked === 1 ? 'text-[var(--ok)]' : 'text-[var(--p-a)]'
                            }`}
                          />
                          <span>
                            {phase1Status.pa_locked === 1
                              ? `Skuad Terkunci (${paSummaryPhase1.count}/26)`
                              : 'Skuad Belum Dikunci'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="font-[family-name:var(--font-display)] font-black text-4xl text-[var(--text-faint)]">
                      VS
                    </div>

                    <div className="space-y-2.5">
                      <div
                        className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl uppercase tracking-tight"
                        style={{ color: activeColorB }}
                      >
                        {displayNameB}
                      </div>
                      <div className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
                        Pemain B
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              participantB.profile_completed
                                ? 'text-[var(--ok)]'
                                : 'text-[var(--text-faint)]'
                            }`}
                          />
                          <span>
                            {participantB.profile_completed
                              ? 'Akun & PIN Terdaftar'
                              : 'Belum Bergabung lewat Undangan'}
                          </span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                          <Lock
                            className={`w-3.5 h-3.5 ${
                              phase1Status.pb_locked === 1 ? 'text-[var(--ok)]' : 'text-[var(--p-b)]'
                            }`}
                          />
                          <span>
                            {phase1Status.pb_locked === 1
                              ? `Skuad Terkunci (${pbSummaryPhase1.count}/26)`
                              : 'Skuad Belum Dikunci'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Status */}
                  <div className="pt-4 border-t border-[var(--line)] max-w-lg mx-auto">
                    {bothProfilesReady && phase1Status.both_locked ? (
                      <p className="text-sm text-[var(--ok)] font-semibold">
                        Kedua akun telah terdaftar dan kedua skuad Fase 1 telah terkunci! 20 matchday siap dimainkan mulai dari{' '}
                        <strong>
                          MD1: {displayNameA} vs {displayNameB}
                        </strong>
                        .
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-[var(--p-a)] font-semibold">
                          Menunggu kedua pemain menyelesaikan pendaftaran akun/undangan (Langkah 1) dan mengunci skuad Fase 1 masing-masing (Langkah 3).
                        </p>
                        <div className="flex items-center justify-center gap-4">
                          {!bothProfilesReady && (
                            <button
                              type="button"
                              onClick={() => setCurrentStep(1)}
                              className="text-xs font-bold underline text-[var(--text)]"
                            >
                              Ke Langkah 1 (Identitas & Undangan)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="text-xs font-bold underline text-[var(--text)]"
                          >
                            Ke Langkah 3 (Susun Skuad)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    disabled={isPending || isStartingSeason}
                    className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
                  >
                    Kembali
                  </button>

                  <button
                    type="button"
                    onClick={handleStartSeason}
                    disabled={isPending || isStartingSeason || !canStartSeason}
                    className="h-14 px-10 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-extrabold text-base uppercase tracking-wider font-[family-name:var(--font-display)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-3 shadow-xl"
                  >
                    {isStartingSeason ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Meluncurkan Musim…</span>
                      </>
                    ) : (
                      <>
                        <span>Mulai Musim Rivals Series</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
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
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }
      `}</style>
    </div>
  );
}
