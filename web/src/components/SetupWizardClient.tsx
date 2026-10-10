'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Participant, SeasonSettings } from '@/lib/types';
import { PlayerTag } from './PlayerTag';
import { 
  saveSetupStep1Action, 
  testSystemReadinessAction, 
  completeSeasonSetupAction 
} from '@/lib/actions';
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
  AlertCircle
} from 'lucide-react';

interface SetupWizardClientProps {
  participantA: Participant;
  participantB: Participant;
  seasonSettings?: SeasonSettings | null;
  isAdmin: boolean;
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
  participantA,
  participantB,
  seasonSettings,
  isAdmin,
}: SetupWizardClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1 State
  const [nameA, setNameA] = useState(participantA.display_name || 'Peserta A');
  const [monogramA, setMonogramA] = useState(participantA.monogram || 'PA');
  const [colorA, setColorA] = useState(seasonSettings?.player_a_color || '#ffb02e');
  const [adminId, setAdminId] = useState<'participant_a' | 'participant_b'>(
    participantA.is_admin ? 'participant_a' : 'participant_b'
  );

  const [nameB, setNameB] = useState(participantB.display_name || 'Peserta B');
  const [monogramB, setMonogramB] = useState(participantB.monogram || 'PB');
  const [colorB, setColorB] = useState(seasonSettings?.player_b_color || '#3ec9e6');

  // Track if user manually touched monograms
  const [editedMonogramA, setEditedMonogramA] = useState(false);
  const [editedMonogramB, setEditedMonogramB] = useState(false);

  // Auto-update monogram from name if not manually edited
  const handleNameAChange = (val: string) => {
    setNameA(val);
    if (!editedMonogramA) {
      setMonogramA(val.slice(0, 2).toUpperCase() || 'PA');
    }
  };

  const handleNameBChange = (val: string) => {
    setNameB(val);
    if (!editedMonogramB) {
      setMonogramB(val.slice(0, 2).toUpperCase() || 'PB');
    }
  };

  // Step 3 Checklist State
  const [checkingSystem, setCheckingSystem] = useState(false);
  const [systemReadiness, setSystemReadiness] = useState<{
    dbConnection: boolean | null;
    tablesCreated: boolean | null;
    matchesSeeded: boolean | null;
    settingsSaved: boolean | null;
    errorMessage: string | null;
  }>({
    dbConnection: null,
    tablesCreated: null,
    matchesSeeded: null,
    settingsSaved: null,
    errorMessage: null,
  });

  // Run automated system readiness check when entering step 3
  useEffect(() => {
    if (currentStep === 3) {
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
      errorMessage: null,
    });

    try {
      const res = await testSystemReadinessAction();
      if (res.results) {
        setSystemReadiness(res.results);
      }
    } catch (err: any) {
      setSystemReadiness({
        dbConnection: false,
        tablesCreated: false,
        matchesSeeded: false,
        settingsSaved: false,
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
    systemReadiness.settingsSaved === true;

  // Handle Step 1 Save
  const handleSaveStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (colorA === colorB) {
      setErrorMessage('Warna Pemain A dan Pemain B tidak boleh sama.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('name_a', nameA);
      formData.set('name_b', nameB);
      formData.set('color_a', colorA);
      formData.set('color_b', colorB);
      formData.set('admin_id', adminId);

      const res = await saveSetupStep1Action(formData);
      if (res?.error) {
        setErrorMessage(res.error);
      } else {
        // Dynamically update CSS root variables so the rest of the wizard uses selected colors immediately
        document.documentElement.style.setProperty('--p-a', colorA);
        document.documentElement.style.setProperty('--p-b', colorB);
        setCurrentStep(2);
      }
    });
  };

  // Step 4 Complete Setup & Start Season
  const [isStartingSeason, setIsStartingSeason] = useState(false);
  const handleStartSeason = () => {
    setErrorMessage(null);
    setIsStartingSeason(true);

    startTransition(async () => {
      const res = await completeSeasonSetupAction();
      if (res?.error) {
        setIsStartingSeason(false);
        setErrorMessage(res.error);
      } else {
        // Dramatic curtain sweep before navigating to home
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 600);
      }
    });
  };

  const steps = [
    { num: 1, title: 'Siapa yang bertanding?', desc: 'Identitas & warna pemain' },
    { num: 2, title: 'Format musim', desc: 'Aturan resmi 20 Matchday' },
    { num: 3, title: 'Siapkan sistem', desc: 'Pemeriksaan otomatis database' },
    { num: 4, title: 'Siap kick-off', desc: 'Peluit perdana musim' },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center bg-[var(--ink-0)] text-[var(--text)] overflow-hidden px-4 py-8 md:p-12">
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
      <div className="relative z-10 w-full max-w-[1100px] flex flex-col space-y-8">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[13px] font-semibold tracking-wider uppercase text-[var(--text-dim)]">
            <span>Rivals Series Season 1</span>
            <span>·</span>
            <span>Konfigurasi Musim</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,4.5rem)] uppercase tracking-tight text-[var(--text)] leading-none">
            Persiapan Pertandingan
          </h1>
        </div>

        {/* Mobile Stepper: 4 Dots Indicator */}
        <div className="flex md:hidden items-center justify-center gap-3">
          {steps.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
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
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 md:p-10 shadow-2xl">
          {/* Stepper Kiri (Desktop) */}
          <div className="hidden md:flex flex-col justify-between border-r border-[var(--line)] pr-8 space-y-8">
            <div className="space-y-6">
              {steps.map((s) => {
                const isCompleted = currentStep > s.num;
                const isCurrent = currentStep === s.num;
                return (
                  <div key={s.num} className="flex items-start gap-4">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border text-sm font-bold transition-colors ${
                        isCompleted
                          ? 'border-[var(--ok)] bg-[var(--ok)]/15 text-[var(--ok)]'
                          : isCurrent
                          ? 'border-[var(--text)] bg-[var(--ink-2)] text-[var(--text)] ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--ink-1)]'
                          : 'border-[var(--line)] bg-[var(--ink-2)] text-[var(--text-faint)]'
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
                  </div>
                );
              })}
            </div>

            <div className="pt-6 border-t border-[var(--line)] text-[12px] text-[var(--text-faint)] space-y-1">
              <div>RS S1 Official Regulations</div>
              <div>Semua perubahan tersimpan otomatis di audit log.</div>
            </div>
          </div>

          {/* Konten Kanan (Active Step) */}
          <div className="flex flex-col justify-center">
            {errorMessage && (
              <div className="mb-6 rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 p-4 text-[13px] text-[var(--danger)] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: SIAPA YANG BERTANDING? */}
            {currentStep === 1 && (
              <form onSubmit={handleSaveStep1} className="space-y-8">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
                    Langkah 1: Siapa yang Bertanding?
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)] mt-1">
                    Atur nama tampilan dan warna identitas dua pemain. Warna ini menjadi warna utama siaran seluruh situs.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* KOLOM PEMAIN A (Kiri) */}
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                      <span className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)]" style={{ color: colorA }}>
                        Pemain A
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-[12px] font-medium text-[var(--text-dim)]">
                        <input
                          type="radio"
                          name="admin_choice"
                          checked={adminId === 'participant_a'}
                          onChange={() => setAdminId('participant_a')}
                          className="accent-[var(--text)]"
                        />
                        <span>Jadikan admin</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                          Nama Tampilan
                        </label>
                        <input
                          type="text"
                          value={nameA}
                          onChange={(e) => handleNameAChange(e.target.value)}
                          required
                          className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xl font-[family-name:var(--font-display)] uppercase text-[var(--text)] focus:border-[var(--text)] focus:outline-none transition-colors"
                          placeholder="NAMA PEMAIN A"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                          Inisial / Monogram (2 huruf)
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

                      {/* 6 Color Swatches */}
                      <div>
                        <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-2">
                          Warna Pemain A
                        </label>
                        <div className="flex items-center gap-3">
                          {COLOR_SWATCHES.map((swatch) => {
                            const isSelected = colorA === swatch.hex;
                            const isOpponentSelected = colorB === swatch.hex;
                            return (
                              <button
                                key={swatch.hex}
                                type="button"
                                disabled={isOpponentSelected}
                                onClick={() => setColorA(swatch.hex)}
                                title={swatch.name + (isOpponentSelected ? ' (Dipakai Pemain B)' : '')}
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

                      {/* Live Preview PlayerTag lg */}
                      <div className="pt-2">
                        <span className="text-[12px] text-[var(--text-faint)] block mb-1.5">
                          Preview PlayerTag:
                        </span>
                        <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-[8px] font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase"
                            style={{ backgroundColor: colorA, color: 'var(--ink-0)' }}
                          >
                            {monogramA || 'PA'}
                          </div>
                          <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-[var(--text)]">
                            {nameA || 'Pemain A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KOLOM PEMAIN B (Kanan) */}
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                      <span className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)]" style={{ color: colorB }}>
                        Pemain B
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-[12px] font-medium text-[var(--text-dim)]">
                        <input
                          type="radio"
                          name="admin_choice"
                          checked={adminId === 'participant_b'}
                          onChange={() => setAdminId('participant_b')}
                          className="accent-[var(--text)]"
                        />
                        <span>Jadikan admin</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                          Nama Tampilan
                        </label>
                        <input
                          type="text"
                          value={nameB}
                          onChange={(e) => handleNameBChange(e.target.value)}
                          required
                          className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xl font-[family-name:var(--font-display)] uppercase text-[var(--text)] focus:border-[var(--text)] focus:outline-none transition-colors"
                          placeholder="NAMA PEMAIN B"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                          Inisial / Monogram (2 huruf)
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

                      {/* 6 Color Swatches */}
                      <div>
                        <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-2">
                          Warna Pemain B
                        </label>
                        <div className="flex items-center gap-3">
                          {COLOR_SWATCHES.map((swatch) => {
                            const isSelected = colorB === swatch.hex;
                            const isOpponentSelected = colorA === swatch.hex;
                            return (
                              <button
                                key={swatch.hex}
                                type="button"
                                disabled={isOpponentSelected}
                                onClick={() => setColorB(swatch.hex)}
                                title={swatch.name + (isOpponentSelected ? ' (Dipakai Pemain A)' : '')}
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

                      {/* Live Preview PlayerTag lg */}
                      <div className="pt-2">
                        <span className="text-[12px] text-[var(--text-faint)] block mb-1.5">
                          Preview PlayerTag:
                        </span>
                        <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-[8px] font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase"
                            style={{ backgroundColor: colorB, color: 'var(--ink-0)' }}
                          >
                            {monogramB || 'PB'}
                          </div>
                          <span className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-[var(--text)]">
                            {nameB || 'Pemain B'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-[var(--line)]">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan…</span>
                      </>
                    ) : (
                      <>
                        <span>Simpan & Lanjut</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
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
                      <span>Kuota Indonesia</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                      Wajib minimal 1 pemain Indonesia di DSP tiap laga. Target 5 kredit per pemain sepanjang musim untuk menghindari penalti 3 poin.
                    </p>
                  </div>

                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Batas Waktu Pelaporan</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                      Hasil pertandingan wajib dikonfirmasi oleh lawan dalam waktu 24 jam setelah dilaporkan. Setelah itu auto-confirm sistem aktif.
                    </p>
                  </div>

                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
                      <Shield className="w-4 h-4" />
                      <span>Penyelesaian Sengketa</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                      Setiap sengketa diselesaikan secara musyawarah atau diajukan ke AI Adjudicator netral berpandukan BAB IX regulasi resmi.
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
                    <span>Lanjut ke Pemeriksaan Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SIAPKAN SISTEM */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
                    Langkah 3: Siapkan Sistem
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)] mt-1">
                    Pemeriksaan otomatis kesiapan koneksi database, struktur tabel, dan data matchday sebelum kick-off.
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
                        2. Tabel-tabel Sistem Terverifikasi
                      </div>
                      <div className="text-[12px] text-[var(--text-faint)]">
                        Peserta, jadwal, jejak audit, dan kuota
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
                        3. 20 Matchday Disiapkan
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

                  {/* Item 4 */}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[var(--text)]">
                        4. Pengaturan Musim Tersimpan
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
                      onClick={() => setCurrentStep(2)}
                      className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
                    >
                      Kembali
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
                    onClick={() => setCurrentStep(4)}
                    className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                  >
                    <span>Lanjut ke Kick-off</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SIAP KICK-OFF */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
                    Langkah 4: Siap Kick-off
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)] mt-1">
                    Semua persiapan telah tuntas. Tekan tombol di bawah untuk meluncurkan kompetisi.
                  </p>
                </div>

                {/* Big VS View with Player Colors */}
                <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-8 sm:p-12 text-center space-y-6">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
                    <div className="space-y-1">
                      <div
                        className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl uppercase tracking-tight"
                        style={{ color: colorA }}
                      >
                        {nameA}
                      </div>
                      <div className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
                        Pemain A {adminId === 'participant_a' ? '(Admin)' : ''}
                      </div>
                    </div>

                    <div className="font-[family-name:var(--font-display)] font-black text-4xl text-[var(--text-faint)]">
                      VS
                    </div>

                    <div className="space-y-1">
                      <div
                        className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl uppercase tracking-tight"
                        style={{ color: colorB }}
                      >
                        {nameB}
                      </div>
                      <div className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
                        Pemain B {adminId === 'participant_b' ? '(Admin)' : ''}
                      </div>
                    </div>
                  </div>

                  {/* 1-Line Summary */}
                  <div className="pt-4 border-t border-[var(--line)] max-w-lg mx-auto">
                    <p className="text-sm text-[var(--text-dim)] font-medium">
                      20 matchday siap dimainkan. Mulai dari <strong>MD1: {nameA} vs {nameB}</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={isPending || isStartingSeason}
                    className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
                  >
                    Kembali
                  </button>

                  <button
                    type="button"
                    onClick={handleStartSeason}
                    disabled={isPending || isStartingSeason}
                    className="h-14 px-10 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-extrabold text-base uppercase tracking-wider font-[family-name:var(--font-display)] hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-3 shadow-xl"
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
