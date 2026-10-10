'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Participant, ParticipantId, RosterCard, RosterPhaseStatus } from '@/lib/types';
import { SquadBuilderWorkbench } from '../SquadBuilderWorkbench';

interface SetupStep3SquadProps {
  session?: {
    participantId: ParticipantId;
    participant: Participant;
    isAdmin?: boolean;
  } | null;
  participantA: Participant;
  participantB: Participant;
  displayNameA: string;
  displayNameB: string;
  monogramA: string;
  monogramB: string;
  phase1Status: RosterPhaseStatus;
  visibleCardsPhase1: RosterCard[];
  shortlistCards?: any[];
  paSummaryPhase1: { count: number; trending: number; indo: number };
  pbSummaryPhase1: { count: number; trending: number; indo: number };
  onPrevStep: () => void;
  onNextStep: () => void;
}

export function SetupStep3Squad({
  session,
  participantA,
  participantB,
  displayNameA,
  displayNameB,
  monogramA,
  monogramB,
  phase1Status,
  visibleCardsPhase1,
  shortlistCards = [],
  paSummaryPhase1,
  pbSummaryPhase1,
  onPrevStep,
  onNextStep,
}: SetupStep3SquadProps) {
  const router = useRouter();

  return (
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
          onClick={onPrevStep}
          className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
        >
          Kembali
        </button>

        <button
          type="button"
          onClick={onNextStep}
          className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span>Lanjut ke Pemeriksaan Sistem</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
