'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  LogOut,
  LogIn,
  Send,
  CheckCircle,
  Users,
  FileText,
  Scale,
  Lock,
} from 'lucide-react';
import {
  Participant,
  ParticipantId,
  Match,
  GoalNomination,
  ResetRequest,
  RosterCard,
  RosterPhaseStatus,
} from '@/lib/types';
import {
  loginParticipantAction,
  logoutParticipantAction,
} from '@/lib/actions';
import { PlayerTag } from './PlayerTag';
import { SquadBuilderWorkbench } from './SquadBuilderWorkbench';
import { AuditTrailPanel } from './AuditTrailPanel';
import { AuditChainVerification, AuditEventRecord } from '@/lib/audit';
import { MatchReportTab } from './control/MatchReportTab';
import { PendingMatchesTab } from './control/PendingMatchesTab';
import { DisputesTab } from './control/DisputesTab';
import { ProfileSettingsTab } from './control/ProfileSettingsTab';

interface ControlCenterClientProps {
  session: {
    participantId: ParticipantId;
    participant: Participant;
    isAdmin: boolean;
  } | null;
  participants: Participant[];
  matches: Match[];
  rosterCards: RosterCard[];
  phase1Roster?: {
    cards: RosterCard[];
    phaseStatus: RosterPhaseStatus;
    paCount: number;
    pbCount: number;
    paTrendingCount: number;
    pbTrendingCount: number;
    paIndoCount: number;
    pbIndoCount: number;
  };
  phase2Roster?: {
    cards: RosterCard[];
    phaseStatus: RosterPhaseStatus;
    paCount: number;
    pbCount: number;
    paTrendingCount: number;
    pbTrendingCount: number;
    paIndoCount: number;
    pbIndoCount: number;
  };
  shortlistCards?: any[];
  disputes: any[];
  auditEvents: AuditEventRecord[];
  auditChainVerification?: AuditChainVerification;
  unreadOpponentAuditCount?: number;
  lastAuditSeenAt?: string | null;
  goalNominations: GoalNomination[];
  pendingReset?: ResetRequest | null;
}

export function ControlCenterClient({
  session,
  participants,
  matches,
  rosterCards,
  phase1Roster,
  phase2Roster,
  shortlistCards = [],
  disputes,
  auditEvents,
  auditChainVerification,
  unreadOpponentAuditCount = 0,
  lastAuditSeenAt = null,
  pendingReset,
}: ControlCenterClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'report' | 'pending' | 'roster' | 'disputes' | 'audit' | 'profile'>('report');
  const [unreadAuditBadge, setUnreadAuditBadge] = useState<number>(unreadOpponentAuditCount);
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pendingMatches = matches.filter(
    (m) => m.status === 'awaiting_confirmation' || m.confirmation_status === 'pending'
  );

  const pA = participants.find((p) => p.id === 'participant_a') || {
    id: 'participant_a' as const,
    display_name: 'Peserta A',
    monogram: 'PA',
    is_admin: 1,
  };
  const pB = participants.find((p) => p.id === 'participant_b') || {
    id: 'participant_b' as const,
    display_name: 'Peserta B',
    monogram: 'PB',
    is_admin: 0,
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 6000);
  };

  // IF NOT LOGGED IN: Authentication form
  if (!session) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--ink-1)] p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--p-a)] mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
              Pusat Kontrol Peserta
            </h1>
            <p className="text-[13px] text-[var(--text-dim)]">
              Akses terbatas hanya untuk Peserta A dan Peserta B Rivals Series Season 1
            </p>
          </div>

          <form
            action={(formData) => {
              startTransition(async () => {
                const res = await loginParticipantAction(formData);
                if (res?.error) {
                  showMessage('error', res.error);
                }
              });
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-2">
                Pilih Identitas Peserta
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--ink-2)] p-3.5 hover:border-[var(--text-dim)] transition-colors has-[:checked]:border-[var(--p-a)] has-[:checked]:bg-[var(--p-a)]/10">
                  <input
                    type="radio"
                    name="participant_id"
                    value="participant_a"
                    defaultChecked
                    className="accent-[var(--p-a)]"
                  />
                  <div>
                    <div className="font-semibold text-sm text-[var(--text)]">{pA.display_name}</div>
                    <div className="text-[11px] text-[var(--text-dim)] uppercase">Pemain A</div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--ink-2)] p-3.5 hover:border-[var(--text-dim)] transition-colors has-[:checked]:border-[var(--p-b)] has-[:checked]:bg-[var(--p-b)]/10">
                  <input
                    type="radio"
                    name="participant_id"
                    value="participant_b"
                    className="accent-[var(--p-b)]"
                  />
                  <div>
                    <div className="font-semibold text-sm text-[var(--text)]">{pB.display_name}</div>
                    <div className="text-[11px] text-[var(--text-dim)] uppercase">Pemain B</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[var(--text-dim)] mb-1">
                PIN Akses Pribadi
              </label>
              <input
                type="password"
                name="pin"
                required
                placeholder="Masukkan PIN pribadi Anda"
                className="w-full h-12 px-4 rounded-[8px] border border-[var(--line)] bg-[var(--ink-2)] font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isPending ? 'Memverifikasi…' : 'Masuk ke Pusat Kontrol'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-[var(--line)] text-center">
            <Link
              href="/rules"
              className="text-[13px] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors underline underline-offset-4"
            >
              Baca Regulasi Resmi & Prosedur Pelaporan (BAB VI)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD
  const isA = session.participantId === 'participant_a';

  return (
    <div className="space-y-8 pb-24">
      {/* Top Banner: Logged-in State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[12px] border border-[var(--line)] bg-[var(--ink-1)] p-5">
        <div className="flex items-center gap-3">
          <PlayerTag
            id={session.participantId}
            name={session.participant.display_name}
            monogram={session.participant.monogram}
            size="md"
          />
          <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)]">
            {isA ? 'Pemain A' : 'Pemain B'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('profile')}
            className="h-10 px-4 rounded-[8px] border border-[var(--line)] bg-[var(--ink-2)] text-xs font-semibold text-[var(--text)] hover:border-[var(--text-dim)] transition-colors flex items-center gap-2"
          >
            <User className="w-3.5 h-3.5" />
            <span>Ubah Profil & PIN</span>
          </button>

          <form
            action={() => {
              startTransition(async () => {
                await logoutParticipantAction();
              });
            }}
          >
            <button
              type="submit"
              disabled={isPending}
              className="h-10 px-4 rounded-[8px] border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)] hover:text-[var(--ink-0)] transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`rounded-[8px] p-4 text-xs font-semibold flex items-center justify-between ${
            actionMessage.type === 'error'
              ? 'border border-[var(--danger)]/40 bg-[var(--danger)]/15 text-[var(--danger)]'
              : 'border border-[var(--ok)]/40 bg-[var(--ok)]/15 text-[var(--ok)]'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-xs underline ml-4">
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Left Tabs Sidebar (Desktop) + Right Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Left Tabs (Desktop) / Horizontal Tabs (Mobile) */}
        <nav className="flex lg:flex-col overflow-x-auto no-scrollbar gap-1.5 p-1 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)]">
          {[
            { id: 'report', label: 'Lapor Hasil', icon: Send },
            {
              id: 'pending',
              label: 'Konfirmasi',
              icon: CheckCircle,
              badge: pendingMatches.length + (pendingReset ? 1 : 0) || null,
            },
            { id: 'roster', label: 'Manajemen Skuad', icon: Users },
            { id: 'disputes', label: 'Sengketa', icon: Scale, badge: disputes.length || null },
            { id: 'audit', label: 'Jejak Audit', icon: FileText, badge: unreadAuditBadge || null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-between px-4 py-3 rounded-[8px] text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[var(--ink-2)] text-[var(--text)] font-bold'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--ink-2)]/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--danger)] text-white font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Content Column */}
        <div className="min-w-0">
          {/* TAB 1: LAPOR HASIL */}
          {activeTab === 'report' && (
            <MatchReportTab
              matches={matches}
              participants={participants}
              pA={pA}
              pB={pB}
              rosterCards={rosterCards}
              phase1Roster={phase1Roster}
              phase2Roster={phase2Roster}
              isPending={isPending}
              startTransition={startTransition}
              showMessage={showMessage}
            />
          )}

          {/* TAB 2: PENDING CONFIRMATIONS */}
          {activeTab === 'pending' && (
            <PendingMatchesTab
              session={session}
              participants={participants}
              pendingMatches={pendingMatches}
              pendingReset={pendingReset}
              pA={pA}
              pB={pB}
              isPending={isPending}
              startTransition={startTransition}
              showMessage={showMessage}
              onNavigateToDisputes={() => setActiveTab('disputes')}
            />
          )}

          {/* TAB 3: MANAJEMEN SKUAD (FULL eFHUB SQUAD BUILDER WORKBENCH) */}
          {activeTab === 'roster' && (
            <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 sm:p-7">
              <SquadBuilderWorkbench
                session={session}
                participants={participants}
                phase1Status={phase1Roster?.phaseStatus || { phase: 1, is_locked: 0, pa_locked: 0, pb_locked: 0, both_locked: false, md10_completed: false }}
                phase2Status={phase2Roster?.phaseStatus}
                visibleCardsPhase1={phase1Roster?.cards || rosterCards.filter((c) => c.roster_phase === 1)}
                visibleCardsPhase2={phase2Roster?.cards || rosterCards.filter((c) => c.roster_phase === 2)}
                shortlistCards={shortlistCards}
                paSummaryPhase1={{
                  count: phase1Roster?.paCount || 0,
                  trending: phase1Roster?.paTrendingCount || 0,
                  indo: phase1Roster?.paIndoCount || 0,
                }}
                pbSummaryPhase1={{
                  count: phase1Roster?.pbCount || 0,
                  trending: phase1Roster?.pbTrendingCount || 0,
                  indo: phase1Roster?.pbIndoCount || 0,
                }}
                onSquadLockedChange={() => router.refresh()}
              />
            </div>
          )}

          {/* TAB 4: SENGKETA RESMI */}
          {activeTab === 'disputes' && (
            <DisputesTab
              matches={matches}
              disputes={disputes}
              isPending={isPending}
              startTransition={startTransition}
              showMessage={showMessage}
            />
          )}

          {/* TAB 5: JEJAK AUDIT */}
          {activeTab === 'audit' && (
            <AuditTrailPanel
              sessionParticipantId={session.participantId}
              participants={participants}
              events={auditEvents}
              chainVerification={auditChainVerification}
              lastSeenAt={lastAuditSeenAt}
              onMarkedSeen={() => setUnreadAuditBadge(0)}
            />
          )}

          {/* TAB 6: PENGATURAN PROFIL & PIN */}
          {activeTab === 'profile' && (
            <ProfileSettingsTab
              session={session}
              isPending={isPending}
              startTransition={startTransition}
              showMessage={showMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlCenterClient;
