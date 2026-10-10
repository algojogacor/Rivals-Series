'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  User, 
  LogOut, 
  LogIn, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  FileText, 
  Scale, 
  Download, 
  Copy, 
  Lock, 
  Check, 
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  Flag,
  RefreshCw,
  Search,
  Settings2,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import { 
  Participant, 
  ParticipantId, 
  Match, 
  GoalNomination,
  ResetRequest,
  RosterCard,
  RosterPhaseStatus
} from '@/lib/types';
import { 
  loginParticipantAction, 
  logoutParticipantAction, 
  submitMatchReportAction, 
  confirmMatchReportAction, 
  disputeMatchAction, 
  updateParticipantSettingsAction,
  changeParticipantPinAction,
  respondSeasonResetAction
} from '@/lib/actions';
import { PlayerTag } from './PlayerTag';
import { StatusChip } from './StatusChip';
import { SquadBuilderWorkbench } from './SquadBuilderWorkbench';
import { AuditTrailPanel } from './AuditTrailPanel';
import { SquadPlayerSelect } from './SquadPlayerSelect';
import { PlayerAvatar } from './PlayerAvatar';
import { AuditChainVerification, AuditEventRecord } from '@/lib/audit';

interface DraftGoalEvent {
  id: string;
  participant_id: ParticipantId;
  scorer_card_id: string | null;
  scorer_base_player_id: number | null;
  scorer_player_name: string;
  scorer_card_version: string;
  is_indonesian: number;
  is_trending: number;
  minute: number;
  period: 'first_half' | 'second_half' | 'et';
  is_own_goal: number;
}

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
  goalNominations,
  pendingReset,
}: ControlCenterClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'report' | 'pending' | 'roster' | 'disputes' | 'audit' | 'profile'>('report');
  const [unreadAuditBadge, setUnreadAuditBadge] = useState<number>(unreadOpponentAuditCount);
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Match report form state
  const [selectedMd, setSelectedMd] = useState<number>(() => {
    const unplayed = matches.find(m => m.status === 'scheduled');
    return unplayed ? unplayed.md_number : 1;
  });
  const [etPlayed, setEtPlayed] = useState<boolean>(false);
  const [pkPlayed, setPkPlayed] = useState<boolean>(false);

  // Accordion toggle states for steps inside report form
  const [stepScorersOpen, setStepScorersOpen] = useState(true);
  const [stepGkOpen, setStepGkOpen] = useState(true);
  const [stepTrendingOpen, setStepTrendingOpen] = useState(true);
  const [stepQuotaOpen, setStepQuotaOpen] = useState(true);
  const [stepEvidenceOpen, setStepEvidenceOpen] = useState(false);

  // Active phase squad cards for selected MD
  const activePhaseForMd = selectedMd >= 11 && (phase2Roster?.cards?.length || 0) > 0 ? 2 : 1;
  const activeRosterForMd = activePhaseForMd === 2 && phase2Roster ? phase2Roster.cards : (phase1Roster?.cards || rosterCards);
  const paSquadCards = activeRosterForMd.filter((c) => c.participant_id === 'participant_a');
  const pbSquadCards = activeRosterForMd.filter((c) => c.participant_id === 'participant_b');

  // Starting Goalkeeper state (Pemain A & Pemain B)
  const paDefaultGk = paSquadCards.find((c) => c.position === 'GK') || paSquadCards[0] || null;
  const pbDefaultGk = pbSquadCards.find((c) => c.position === 'GK') || pbSquadCards[0] || null;
  const [paSelectedGkCardId, setPaSelectedGkCardId] = useState<string>(paDefaultGk?.id || 'manual');
  const [pbSelectedGkCardId, setPbSelectedGkCardId] = useState<string>(pbDefaultGk?.id || 'manual');
  const [paManualGkName, setPaManualGkName] = useState<string>('Kiper A');
  const [pbManualGkName, setPbManualGkName] = useState<string>('Kiper B');

  const paChosenGkCard = paSquadCards.find((c) => c.id === paSelectedGkCardId) || null;
  const pbChosenGkCard = pbSquadCards.find((c) => c.id === pbSelectedGkCardId) || null;

  // Goal Scorers Builder state
  const [goalEvents, setGoalEvents] = useState<DraftGoalEvent[]>([]);
  const [draftScorerParticipant, setDraftScorerParticipant] = useState<ParticipantId>('participant_a');
  const [draftScorerRosterId, setDraftScorerRosterId] = useState<string>('');
  const [draftManualScorerName, setDraftManualScorerName] = useState<string>('');
  const [draftGoalMinute, setDraftGoalMinute] = useState<number>(45);
  const [draftGoalPeriod, setDraftGoalPeriod] = useState<'first_half' | 'second_half' | 'et'>('first_half');
  const [draftIsOwnGoal, setDraftIsOwnGoal] = useState<boolean>(false);

  // Per-MD Trending compliance state (Pasal 17)
  const [paTrendingH1, setPaTrendingH1] = useState<boolean>(true);
  const [paTrendingH2, setPaTrendingH2] = useState<boolean>(false);
  const [pbTrendingH1, setPbTrendingH1] = useState<boolean>(true);
  const [pbTrendingH2, setPbTrendingH2] = useState<boolean>(false);

  // Dispute package export modal/drawer state
  const [selectedDisputeForExport, setSelectedDisputeForExport] = useState<any | null>(null);
  const [copiedDisputeText, setCopiedDisputeText] = useState(false);

  const selectedMatch = matches.find(m => m.md_number === selectedMd);
  const isKnockout = selectedMd >= 11;

  // Pending confirmations
  const pendingMatches = matches.filter(
    m => m.status === 'awaiting_confirmation' || m.confirmation_status === 'pending'
  );

  const pA = participants.find(p => p.id === 'participant_a') || {
    id: 'participant_a' as const,
    display_name: 'Peserta A',
    monogram: 'PA',
    is_admin: 1,
  };
  const pB = participants.find(p => p.id === 'participant_b') || {
    id: 'participant_b' as const,
    display_name: 'Peserta B',
    monogram: 'PB',
    is_admin: 0,
  };

  const handleAddDraftGoal = () => {
    const squadPool = draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards;
    const chosenCard = squadPool.find((c) => c.id === draftScorerRosterId);
    const scorerName = chosenCard ? chosenCard.player_name : draftManualScorerName.trim();
    if (!scorerName) {
      showMessage('error', 'Pilih pemain pencetak gol dari skuad atau ketik nama pemain.');
      return;
    }
    const newGoal: DraftGoalEvent = {
      id: `draft_goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      participant_id: draftScorerParticipant,
      scorer_card_id: chosenCard?.efootball_card_id || chosenCard?.id || null,
      scorer_base_player_id: chosenCard?.base_player_id ?? null,
      scorer_player_name: scorerName,
      scorer_card_version: chosenCard?.card_version || 'Standard',
      is_indonesian: chosenCard?.is_indonesian || 0,
      is_trending: chosenCard?.is_trending || 0,
      minute: Number(draftGoalMinute) || 45,
      period: draftGoalPeriod,
      is_own_goal: draftIsOwnGoal ? 1 : 0,
    };
    setGoalEvents((prev) => [...prev, newGoal]);
    setDraftManualScorerName('');
    setDraftIsOwnGoal(false);
  };

  const handleRemoveDraftGoal = (id: string) => {
    setGoalEvents((prev) => prev.filter((g) => g.id !== id));
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 6000);
  };

  const generateDisputePackageText = (dispute: any) => {
    const match = matches.find(m => m.id === dispute.match_id);
    return `### DISPUTE ARBITRATION PACKAGE - RIVALS SERIES SEASON 1 (RS S1)
Dokumen ini disusun untuk evaluasi netral AI Adjudicator berdasarkan Pasal 38 Regulasi Resmi RS S1.

1. IDENTITAS SENGKETA
- Dispute ID: ${dispute.id}
- Matchday: ${dispute.match_id} (Fase: ${match ? (match.md_number <= 10 ? 'Group Stage' : 'Knockout Stage') : 'Unknown'})
- Pihak Pengaju: ${dispute.filed_by === 'participant_a' ? 'Peserta A' : 'Peserta B'}
- Tanggal Diajukan: ${dispute.filed_at}
- Batas Respons: ${dispute.response_deadline_at || '48 jam'}
- Kategori Sengketa: ${dispute.dispute_type}
- Pasal Regulasi Terkait: ${dispute.rule_article}

2. URAIAN KLAIM & FAKTA
${dispute.claim_summary}

3. DATA PERTANDINGAN TERKAIT
- Skor Waktu Reguler: ${match ? `${match.home_score ?? 0} - ${match.away_score ?? 0}` : 'Belum selesai'}
- Status Konfirmasi: ${match ? match.confirmation_status : 'Pending'}

4. TAUTAN BUKTI TERLAMPIR
${dispute.evidence_urls ? JSON.parse(dispute.evidence_urls).map((url: string, i: number) => `- Bukti ${i+1}: ${url}`).join('\n') : '- Tidak ada tautan langsung'}

5. INSTRUKSI UNTUK AI ADJUDICATOR (PASAL 3)
a. Nilai kasus secara ketat berdasarkan bukti yang terverifikasi dan bunyi regulasi RS S1.
b. Jangan menciptakan sanksi baru di luar ketentuan BAB IX regulasi resmi.
c. Jika bukti tidak mencukupi untuk membuktikan pelanggaran di atas ambang objektif, hasil pertandingan di lapangan tetap berlaku.
d. Berikan kesimpulan akhir yang jelas: TERBUKTI atau TIDAK TERBUKTI.`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDisputeText(true);
    setTimeout(() => setCopiedDisputeText(false), 3000);
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
              label: `Konfirmasi`, 
              icon: CheckCircle,
              badge: (pendingMatches.length + (pendingReset ? 1 : 0)) || null
            },
            { id: 'roster', label: 'Manajemen Skuad', icon: Users },
            { id: 'disputes', label: `Sengketa`, icon: Scale, badge: disputes.length || null },
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
            <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-8">
              {/* Header with Matchday Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
                    Lapor Hasil Pertandingan
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)]">
                    Hasil berstatus Menunggu Konfirmasi sampai lawan mengesahkan (Pasal 22).
                  </p>
                </div>

                {/* Matchday Selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-[12px] font-semibold text-[var(--text-dim)] uppercase">
                    Matchday:
                  </label>
                  <select
                    value={selectedMd}
                    onChange={(e) => setSelectedMd(Number(e.target.value))}
                    className="h-10 px-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-sm font-bold text-[var(--text)] focus:outline-none"
                  >
                    {matches.map((m) => (
                      <option key={m.id} value={m.md_number}>
                        MD{m.md_number} ({m.md_number <= 10 ? 'Group' : 'Knockout'}) {m.status === 'confirmed' ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Match Setting Notice */}
              <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-4 text-[13px] text-[var(--text-dim)] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text)] uppercase">
                    Aturan MD{selectedMd}:
                  </span>
                  <span className="font-semibold text-xs">
                    {isKnockout ? 'Knockout Stage (MD11–20)' : 'Group Stage (MD1–10)'}
                  </span>
                </div>
                <p>
                  {isKnockout
                    ? 'Extra Time & Penalti ON. Wajib menghasilkan pemenang (tanpa hasil seri). Pemenang meraih 3 poin.'
                    : 'Extra Time & Penalti OFF. Pertandingan normal dapat berakhir imbang (1 poin masing-masing).'}
                </p>
              </div>

              <form
                action={(formData) => {
                  startTransition(async () => {
                    const res = await submitMatchReportAction(formData);
                    if (res?.error) {
                      showMessage('error', res.error);
                    } else {
                      showMessage('success', `Laporan hasil MD${selectedMd} berhasil dikirim. Menunggu konfirmasi lawan.`);
                    }
                  });
                }}
                className="space-y-8"
              >
                <input type="hidden" name="md_number" value={selectedMd} />

                {/* SCOREBOARD DISPLAY (Per DESIGN.md: [Nama A] [ 0 ] : [ 0 ] [Nama B], input 96px display 3rem) */}
                <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-6 sm:p-8 text-center space-y-4">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-faint)] block">
                    Papan Skor Pertandingan (90 Menit Reguler)
                  </span>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                    {/* Player A (Tuan Rumah) */}
                    <div className="flex-1 flex flex-col items-center sm:items-end text-center sm:text-right">
                      <PlayerTag
                        id="participant_a"
                        name={pA.display_name}
                        monogram={pA.monogram}
                        size="md"
                      />
                      <span className="text-[11px] text-[var(--text-faint)] mt-1">
                        Pemain A (Tuan Rumah)
                      </span>
                    </div>

                    {/* Inputs Center */}
                    <div className="flex items-center gap-3 shrink-0">
                      <input
                        type="number"
                        name="home_score"
                        min="0"
                        required
                        placeholder="0"
                        defaultValue={selectedMatch?.home_score ?? ''}
                        className="w-24 h-20 text-center font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl tabular-nums rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                      />
                      <span className="font-[family-name:var(--font-display)] text-3xl text-[var(--text-dim)] font-bold">
                        :
                      </span>
                      <input
                        type="number"
                        name="away_score"
                        min="0"
                        required
                        placeholder="0"
                        defaultValue={selectedMatch?.away_score ?? ''}
                        className="w-24 h-20 text-center font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl tabular-nums rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)] focus:border-[var(--text)] focus:outline-none"
                      />
                    </div>

                    {/* Player B (Tamu) */}
                    <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <PlayerTag
                        id="participant_b"
                        name={pB.display_name}
                        monogram={pB.monogram}
                        size="md"
                      />
                      <span className="text-[11px] text-[var(--text-faint)] mt-1">
                        Pemain B (Tamu)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extra Time & Penalti (If Knockout) */}
                {isKnockout && (
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-4 space-y-4">
                    <span className="font-semibold text-xs text-[var(--text)] uppercase block">
                      Extra Time & Adu Penalti
                    </span>
                    <div className="flex flex-wrap items-center gap-6">
                      <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
                        <input
                          type="checkbox"
                          name="et_played"
                          checked={etPlayed}
                          onChange={(e) => setEtPlayed(e.target.checked)}
                          className="accent-[var(--text)]"
                        />
                        <span>Laga berlanjut ke Extra Time (ET)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[var(--text)] cursor-pointer">
                        <input
                          type="checkbox"
                          name="pk_played"
                          checked={pkPlayed}
                          onChange={(e) => setPkPlayed(e.target.checked)}
                          className="accent-[var(--text)]"
                        />
                        <span>Laga berlanjut ke Adu Penalti (PK)</span>
                      </label>
                    </div>

                    {etPlayed && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--line)]">
                        <div>
                          <label className="block text-[11px] text-[var(--text-dim)] mb-1">Skor Akhir ET (A)</label>
                          <input
                            type="number"
                            name="home_et_score"
                            min="0"
                            placeholder="Skor setelah ET"
                            className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-bold text-[var(--text)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--text-dim)] mb-1">Skor Akhir ET (B)</label>
                          <input
                            type="number"
                            name="away_et_score"
                            min="0"
                            placeholder="Skor setelah ET"
                            className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-bold text-[var(--text)]"
                          />
                        </div>
                      </div>
                    )}

                    {pkPlayed && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--line)]">
                        <div>
                          <label className="block text-[11px] text-[var(--text-dim)] mb-1">Gol Penalti (A)</label>
                          <input
                            type="number"
                            name="home_pk_score"
                            min="0"
                            placeholder="Gol adu penalti"
                            className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-bold text-[var(--text)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--text-dim)] mb-1">Gol Penalti (B)</label>
                          <input
                            type="number"
                            name="away_pk_score"
                            min="0"
                            placeholder="Gol adu penalti"
                            className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-sm font-bold text-[var(--text)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hidden JSON payload for structured Goal Events */}
                <input type="hidden" name="goal_events_json" value={JSON.stringify(goalEvents)} />

                {/* Collapsible Steps */}
                <div className="space-y-3">
                  {/* Step 0: Pencetak Gol Resmi (Golden Boot · Pasal 41) */}
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setStepScorersOpen(!stepScorersOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--ink-1)]/50 transition-colors rounded-t-[8px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[var(--text)] uppercase">
                          Pencetak Gol Resmi (Golden Boot · Pasal 41)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text-dim)]">
                          {goalEvents.length} Gol Tercatat
                        </span>
                      </div>
                      {stepScorersOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-dim)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-dim)]" />}
                    </button>
                    {stepScorersOpen && (
                      <div className="p-4 pt-3 border-t border-[var(--line)] space-y-4 text-xs">
                        <p className="text-[11px] text-[var(--text-dim)]">
                          Pilih pencetak gol dari skuad terdaftar peserta (otomatis menggabungkan gol antar versi kartu dari pemain virtual yang sama untuk Golden Boot).
                        </p>

                        {/* Add Goal Builder Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end bg-[var(--ink-1)] p-3 rounded-[8px] border border-[var(--line)]">
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                              Tim Pencetak Gol
                            </label>
                            <select
                              value={draftScorerParticipant}
                              onChange={(e) => {
                                const nextP = e.target.value as ParticipantId;
                                setDraftScorerParticipant(nextP);
                                setDraftScorerRosterId('');
                              }}
                              className="w-full h-[44px] px-2.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold text-[var(--text)]"
                            >
                              <option value="participant_a">{pA.display_name} (A)</option>
                              <option value="participant_b">{pB.display_name} (B)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                              Pilih Pemain dari Skuad ({draftScorerParticipant === 'participant_a' ? pA.display_name : pB.display_name})
                            </label>
                            {(draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards).length > 0 ? (
                              <SquadPlayerSelect
                                cards={draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards}
                                value={draftScorerRosterId}
                                onChange={(val) => setDraftScorerRosterId(val)}
                                placeholder="Cari & pilih pemain pencetak gol..."
                                emptyOptionLabel="— Ketik Manual Nama Pencetak Gol —"
                                emptyOptionValue=""
                              />
                            ) : null}
                            {(!draftScorerRosterId ||
                              (draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards).length === 0) && (
                              <input
                                type="text"
                                value={draftManualScorerName}
                                onChange={(e) => setDraftManualScorerName(e.target.value)}
                                placeholder="Atau ketik nama pencetak gol..."
                                className="w-full h-9 px-2.5 mt-1.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-xs text-[var(--text)]"
                              />
                            )}
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                              Menit & Babak
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={125}
                                value={draftGoalMinute}
                                onChange={(e) => {
                                  const m = Number(e.target.value);
                                  setDraftGoalMinute(m);
                                  if (m <= 45) setDraftGoalPeriod('first_half');
                                  else if (m <= 90) setDraftGoalPeriod('second_half');
                                  else setDraftGoalPeriod('et');
                                }}
                                className="w-14 h-[44px] px-2 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-mono text-center text-[var(--text)]"
                              />
                              <select
                                value={draftGoalPeriod}
                                onChange={(e) => setDraftGoalPeriod(e.target.value as any)}
                                className="flex-1 h-[44px] px-1.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[11px] text-[var(--text)]"
                              >
                                <option value="first_half">B1</option>
                                <option value="second_half">B2</option>
                                {isKnockout && <option value="et">ET</option>}
                              </select>
                            </div>
                          </div>

                          <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={draftIsOwnGoal}
                                onChange={(e) => setDraftIsOwnGoal(e.target.checked)}
                                className="accent-[var(--danger)]"
                              />
                              <span>Gol Bunuh Diri (OG)</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleAddDraftGoal}
                              className="h-[44px] px-3 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 hover:opacity-90"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tambah Gol</span>
                            </button>
                          </div>
                        </div>

                        {/* Added Goal Events List */}
                        {goalEvents.length > 0 && (
                          <div className="space-y-1.5">
                            {goalEvents.map((g) => (
                              <div
                                key={g.id}
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] bg-[var(--ink-1)] border border-[var(--line)]"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  {(g.scorer_card_id || g.scorer_base_player_id) && (
                                    <PlayerAvatar
                                      cardId={g.scorer_card_id}
                                      basePlayerId={g.scorer_base_player_id}
                                      name={g.scorer_player_name}
                                      isTrending={g.is_trending}
                                      isIndonesian={g.is_indonesian}
                                      size="sm"
                                    />
                                  )}
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                    style={{
                                      backgroundColor:
                                        g.participant_id === 'participant_a'
                                          ? 'var(--p-a-soft)'
                                          : 'var(--p-b-soft)',
                                      color:
                                        g.participant_id === 'participant_a'
                                          ? 'var(--p-a)'
                                          : 'var(--p-b)',
                                    }}
                                  >
                                    {g.participant_id === 'participant_a' ? pA.display_name : pB.display_name}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-[var(--text)]">
                                    {g.minute}&apos;
                                  </span>
                                  <span className="font-semibold text-xs text-[var(--text)]">
                                    {g.scorer_player_name}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-faint)]">
                                    ({g.scorer_card_version})
                                  </span>
                                  {g.is_trending === 1 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--p-a-soft)] text-[var(--p-a)]">
                                      TRENDING
                                    </span>
                                  )}
                                  {g.is_indonesian === 1 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--ok)]/15 text-[var(--ok)]">
                                      IDN
                                    </span>
                                  )}
                                  {g.is_own_goal === 1 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--danger)]/15 text-[var(--danger)]">
                                      OG (Dikecualikan Golden Boot)
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftGoal(g.id)}
                                  className="text-[var(--danger)] hover:opacity-80 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 1: Kiper Starter */}
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setStepGkOpen(!stepGkOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--ink-1)]/50 transition-colors rounded-t-[8px]"
                    >
                      <span className="font-semibold text-xs text-[var(--text)] uppercase">
                        Kiper Starter (Golden Glove · Pasal 42)
                      </span>
                      {stepGkOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-dim)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-dim)]" />}
                    </button>
                    {stepGkOpen && (
                      <div className="p-4 pt-3 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        {/* Kiper Pemain A */}
                        <div className="space-y-2">
                          <label className="font-bold text-[var(--text)] block">
                            Kiper Starter {pA.display_name} (A)
                          </label>
                          {paSquadCards.length > 0 && (
                            <SquadPlayerSelect
                              cards={paSquadCards
                                .slice()
                                .sort((a, b) => (a.position === 'GK' ? -1 : b.position === 'GK' ? 1 : 0))}
                              value={paSelectedGkCardId}
                              onChange={(val) => setPaSelectedGkCardId(val)}
                              placeholder="Cari & pilih kiper starter A..."
                              emptyOptionLabel="— Ketik Nama Kiper Manual —"
                              emptyOptionValue="manual"
                            />
                          )}
                          {(paSelectedGkCardId === 'manual' || paSquadCards.length === 0) && (
                            <input
                              type="text"
                              value={paManualGkName}
                              onChange={(e) => setPaManualGkName(e.target.value)}
                              placeholder="Nama Kiper A"
                              required
                              className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)]"
                            />
                          )}
                          <input
                            type="hidden"
                            name="pa_gk_name"
                            value={paChosenGkCard ? paChosenGkCard.player_name : paManualGkName}
                          />
                          <input
                            type="hidden"
                            name="pa_gk_card_id"
                            value={paChosenGkCard?.efootball_card_id || paChosenGkCard?.id || ''}
                          />
                          <input
                            type="hidden"
                            name="pa_gk_base_player_id"
                            value={paChosenGkCard?.base_player_id ?? ''}
                          />
                          <input
                            type="hidden"
                            name="pa_gk_card_version"
                            value={paChosenGkCard?.card_version || 'Standard'}
                          />
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                            <input type="checkbox" name="pa_gk_full" value="1" defaultChecked className="accent-[var(--text)]" />
                            <span>Bermain penuh 90 menit reguler</span>
                          </label>
                        </div>

                        {/* Kiper Pemain B */}
                        <div className="space-y-2">
                          <label className="font-bold text-[var(--text)] block">
                            Kiper Starter {pB.display_name} (B)
                          </label>
                          {pbSquadCards.length > 0 && (
                            <SquadPlayerSelect
                              cards={pbSquadCards
                                .slice()
                                .sort((a, b) => (a.position === 'GK' ? -1 : b.position === 'GK' ? 1 : 0))}
                              value={pbSelectedGkCardId}
                              onChange={(val) => setPbSelectedGkCardId(val)}
                              placeholder="Cari & pilih kiper starter B..."
                              emptyOptionLabel="— Ketik Nama Kiper Manual —"
                              emptyOptionValue="manual"
                            />
                          )}
                          {(pbSelectedGkCardId === 'manual' || pbSquadCards.length === 0) && (
                            <input
                              type="text"
                              value={pbManualGkName}
                              onChange={(e) => setPbManualGkName(e.target.value)}
                              placeholder="Nama Kiper B"
                              required
                              className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)]"
                            />
                          )}
                          <input
                            type="hidden"
                            name="pb_gk_name"
                            value={pbChosenGkCard ? pbChosenGkCard.player_name : pbManualGkName}
                          />
                          <input
                            type="hidden"
                            name="pb_gk_card_id"
                            value={pbChosenGkCard?.efootball_card_id || pbChosenGkCard?.id || ''}
                          />
                          <input
                            type="hidden"
                            name="pb_gk_base_player_id"
                            value={pbChosenGkCard?.base_player_id ?? ''}
                          />
                          <input
                            type="hidden"
                            name="pb_gk_card_version"
                            value={pbChosenGkCard?.card_version || 'Standard'}
                          />
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                            <input type="checkbox" name="pb_gk_full" value="1" defaultChecked className="accent-[var(--text)]" />
                            <span>Bermain penuh 90 menit reguler</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Kepatuhan Kartu Trending per Matchday (Pasal 17) */}
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setStepTrendingOpen(!stepTrendingOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--ink-1)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--p-a)]" />
                        <span className="font-semibold text-xs text-[var(--text)] uppercase">
                          Kewajiban Kartu Trending per Matchday (Pasal 17)
                        </span>
                      </div>
                      {stepTrendingOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-dim)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-dim)]" />}
                    </button>
                    {stepTrendingOpen && (
                      <div className="p-4 pt-3 border-t border-[var(--line)] space-y-3 text-xs">
                        <p className="text-[11px] text-[var(--text-dim)]">
                          Di setiap Matchday (MD1–MD20), tiap peserta wajib menampilkan minimal <strong>2 pemain bertipe Trending</strong> berada di lapangan secara bersamaan selama minimal <strong>1 babak reguler penuh (45 menit)</strong>.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Trending Pemain A */}
                          <div className="p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--text)]">{pA.display_name} (A)</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  paTrendingH1 || paTrendingH2
                                    ? 'bg-[var(--ok)]/15 text-[var(--ok)]'
                                    : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                                }`}
                              >
                                {paTrendingH1 || paTrendingH2 ? 'Memenuhi Pasal 17' : 'Belum Memenuhi'}
                              </span>
                            </div>
                            {paSquadCards.filter((c) => c.is_trending === 1).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {paSquadCards
                                  .filter((c) => c.is_trending === 1)
                                  .map((c) => (
                                    <span
                                      key={c.id}
                                      className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--p-a-soft)] text-[var(--p-a)] font-semibold"
                                    >
                                      ★ {c.player_name}
                                    </span>
                                  ))}
                              </div>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                              <input
                                type="checkbox"
                                name="pa_trending_first_half"
                                value="1"
                                checked={paTrendingH1}
                                onChange={(e) => setPaTrendingH1(e.target.checked)}
                                className="accent-[var(--p-a)]"
                              />
                              <span>Babak 1 Penuh: ≥2 pemain Trending di lapangan</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                              <input
                                type="checkbox"
                                name="pa_trending_second_half"
                                value="1"
                                checked={paTrendingH2}
                                onChange={(e) => setPaTrendingH2(e.target.checked)}
                                className="accent-[var(--p-a)]"
                              />
                              <span>Babak 2 Penuh: ≥2 pemain Trending di lapangan</span>
                            </label>
                          </div>

                          {/* Trending Pemain B */}
                          <div className="p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[var(--text)]">{pB.display_name} (B)</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  pbTrendingH1 || pbTrendingH2
                                    ? 'bg-[var(--ok)]/15 text-[var(--ok)]'
                                    : 'bg-[var(--danger)]/15 text-[var(--danger)]'
                                }`}
                              >
                                {pbTrendingH1 || pbTrendingH2 ? 'Memenuhi Pasal 17' : 'Belum Memenuhi'}
                              </span>
                            </div>
                            {pbSquadCards.filter((c) => c.is_trending === 1).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {pbSquadCards
                                  .filter((c) => c.is_trending === 1)
                                  .map((c) => (
                                    <span
                                      key={c.id}
                                      className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--p-a-soft)] text-[var(--p-a)] font-semibold"
                                    >
                                      ★ {c.player_name}
                                    </span>
                                  ))}
                              </div>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                              <input
                                type="checkbox"
                                name="pb_trending_first_half"
                                value="1"
                                checked={pbTrendingH1}
                                onChange={(e) => setPbTrendingH1(e.target.checked)}
                                className="accent-[var(--p-b)]"
                              />
                              <span>Babak 1 Penuh: ≥2 pemain Trending di lapangan</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                              <input
                                type="checkbox"
                                name="pb_trending_second_half"
                                value="1"
                                checked={pbTrendingH2}
                                onChange={(e) => setPbTrendingH2(e.target.checked)}
                                className="accent-[var(--p-b)]"
                              />
                              <span>Babak 2 Penuh: ≥2 pemain Trending di lapangan</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Kuota Indonesia & DSP */}
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setStepQuotaOpen(!stepQuotaOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--ink-1)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-[var(--ok)]" />
                        <span className="font-semibold text-xs text-[var(--text)] uppercase">
                          DSP & Kredit Pemain Indonesia (Pasal 18, 19 & 20)
                        </span>
                      </div>
                      {stepQuotaOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-dim)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-dim)]" />}
                    </button>
                    {stepQuotaOpen && (
                      <div className="p-4 pt-3 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] space-y-2">
                          <label className="font-bold text-[var(--text)] block">
                            Pemain Indonesia {pA.display_name} (A)
                          </label>
                          {paSquadCards.filter((c) => c.is_indonesian === 1).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {paSquadCards
                                .filter((c) => c.is_indonesian === 1)
                                .map((c) => (
                                  <span
                                    key={c.id}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--ok)]/15 text-[var(--ok)] font-semibold"
                                  >
                                    🇮🇩 {c.player_name}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-faint)] block">
                              Otomatis mendeteksi pemain berkewarganegaraan Indonesia di skuad.
                            </span>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text)] font-medium">
                            <input type="checkbox" name="pa_indonesia_in_dsp" value="1" defaultChecked className="accent-[var(--ok)]" />
                            <span>Tercantum di DSP MD{selectedMd} (Wajib Pasal 18)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                            <input type="checkbox" name="pa_first_half_credit" value="1" defaultChecked className="accent-[var(--p-a)]" />
                            <span>Tampil Babak 1 Penuh (+1 Kredit Musiman)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                            <input type="checkbox" name="pa_second_half_credit" value="1" className="accent-[var(--p-a)]" />
                            <span>Tampil Babak 2 Penuh (+1 Kredit Musiman)</span>
                          </label>
                        </div>

                        <div className="p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] space-y-2">
                          <label className="font-bold text-[var(--text)] block">
                            Pemain Indonesia {pB.display_name} (B)
                          </label>
                          {pbSquadCards.filter((c) => c.is_indonesian === 1).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {pbSquadCards
                                .filter((c) => c.is_indonesian === 1)
                                .map((c) => (
                                  <span
                                    key={c.id}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--ok)]/15 text-[var(--ok)] font-semibold"
                                  >
                                    🇮🇩 {c.player_name}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-faint)] block">
                              Otomatis mendeteksi pemain berkewarganegaraan Indonesia di skuad.
                            </span>
                          )}
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text)] font-medium">
                            <input type="checkbox" name="pb_indonesia_in_dsp" value="1" defaultChecked className="accent-[var(--ok)]" />
                            <span>Tercantum di DSP MD{selectedMd} (Wajib Pasal 18)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                            <input type="checkbox" name="pb_first_half_credit" value="1" defaultChecked className="accent-[var(--p-b)]" />
                            <span>Tampil Babak 1 Penuh (+1 Kredit Musiman)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-dim)]">
                            <input type="checkbox" name="pb_second_half_credit" value="1" className="accent-[var(--p-b)]" />
                            <span>Tampil Babak 2 Penuh (+1 Kredit Musiman)</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 4: Bukti & Catatan */}
                  <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setStepEvidenceOpen(!stepEvidenceOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--ink-1)]/50 transition-colors"
                    >
                      <span className="font-semibold text-xs text-[var(--text)] uppercase">
                        Bukti Screenshot & Catatan Laporan
                      </span>
                      {stepEvidenceOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-dim)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-dim)]" />}
                    </button>
                    {stepEvidenceOpen && (
                      <div className="p-4 pt-3 border-t border-[var(--line)] space-y-3 text-xs">
                        <div>
                          <label className="block text-[var(--text-dim)] mb-1">Tautan Screenshot Hasil</label>
                          <input
                            type="url"
                            name="result_screenshot_url"
                            placeholder="https://..."
                            className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--text-dim)] mb-1">Catatan Tambahan Pertandingan</label>
                          <textarea
                            name="match_report_text"
                            rows={2}
                            placeholder="Contoh: Laga berjalan lancar, kartu kuning menit 75"
                            className="w-full p-2.5 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky Action Bar */}
                <div className="pt-4 border-t border-[var(--line)] flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isPending ? 'Mengirimkan…' : `Kirim Laporan Hasil MD${selectedMd}`}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PENDING CONFIRMATIONS */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              {/* Mutual Consent Reset Box if any */}
              {pendingReset && (
                <div className="rounded-[12px] border border-[var(--danger)] bg-[var(--danger)]/10 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-[var(--danger)] shrink-0" />
                    <div>
                      <h3 className="text-base font-bold uppercase tracking-tight text-[var(--text)]">
                        Permintaan Reset Musim Menunggu Konfirmasi
                      </h3>
                      <p className="text-xs text-[var(--text-dim)]">
                        Diajukan oleh {participants.find(p => p.id === pendingReset.requested_by)?.display_name || pendingReset.requested_by} · Mode: {pendingReset.reset_mode === 'total_reset' ? 'Reset Total Musim' : 'Reset Hasil Saja'}
                      </p>
                    </div>
                  </div>

                  {session && session.participantId !== pendingReset.requested_by ? (
                    <div className="space-y-3 pt-2 border-t border-[var(--danger)]/20">
                      <p className="text-xs text-[var(--text)] leading-relaxed">
                        Lawan tanding Anda mengajukan permohonan reset musim resmi. Berdasarkan Pasal 50 Regulasi Resmi RS S1, reset hanya akan dieksekusi secara permanen dalam satu transaksi database setelah Anda memberikan persetujuan di bawah ini.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              const res = await respondSeasonResetAction({
                                requestId: pendingReset.id,
                                approved: true,
                              });
                              if (res?.error) {
                                showMessage('error', res.error);
                              } else {
                                showMessage('success', 'Reset musim berhasil disetujui dan dieksekusi.');
                                window.location.reload();
                              }
                            });
                          }}
                          disabled={isPending}
                          className="px-5 py-2.5 rounded-[8px] bg-[var(--danger)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isPending ? 'Mengeksekusi…' : 'Setujui & Eksekusi Reset'}
                        </button>

                        <button
                          onClick={() => {
                            startTransition(async () => {
                              const res = await respondSeasonResetAction({
                                requestId: pendingReset.id,
                                approved: false,
                                rejectionReason: 'Ditolak oleh lawan',
                              });
                              if (res?.error) {
                                showMessage('error', res.error);
                              } else {
                                showMessage('success', 'Permintaan reset berhasil ditolak.');
                                window.location.reload();
                              }
                            });
                          }}
                          disabled={isPending}
                          className="px-5 py-2.5 rounded-[8px] border border-[var(--line)] text-[var(--text)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--ink-2)] transition-colors disabled:opacity-50"
                        >
                          Tolak Permintaan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--danger)]/20">
                      Anda adalah pengaju permohonan reset ini. Menunggu persetujuan dari lawan tanding Anda ({participants.find(p => p.id !== pendingReset.requested_by)?.display_name || 'Lawan'}).
                    </div>
                  )}
                </div>
              )}

              {/* Pending Matches Box */}
              <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
                    Kotak Masuk Konfirmasi Hasil
                  </h2>
                  <p className="text-[13px] text-[var(--text-dim)]">
                    Hasil pertandingan sah setelah disahkan oleh kedua peserta (Pasal 22).
                  </p>
                </div>

                {pendingMatches.length === 0 ? (
                  <div className="p-8 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-[var(--ok)] mx-auto" />
                    <h3 className="font-bold text-sm text-[var(--text)]">Tidak Ada Laporan Menunggu Konfirmasi</h3>
                    <p className="text-xs text-[var(--text-dim)]">
                      Seluruh pertandingan yang dilaporkan telah berstatus sah.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingMatches.map((m) => {
                      const reportedByP = participants.find(p => p.id === m.reported_by);
                      const isReportedByMe = m.reported_by === session.participantId;

                      return (
                        <div
                          key={m.id}
                          className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-[family-name:var(--font-display)] font-bold text-base text-[var(--text)]">
                                {m.id}
                              </span>
                              <span className="font-bold text-base text-[var(--text)]">
                                {pA.display_name} {m.home_score} : {m.away_score} {pB.display_name}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-dim)]">
                              Dilaporkan oleh: <strong>{reportedByP?.display_name || m.reported_by}</strong>
                            </p>
                            {m.match_report_text && (
                              <p className="text-xs text-[var(--text-faint)] italic">
                                &ldquo;{m.match_report_text}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              onClick={() => {
                                startTransition(async () => {
                                  const res = await confirmMatchReportAction(m.id);
                                  if (res?.error) {
                                    showMessage('error', res.error);
                                  } else {
                                    showMessage('success', `Hasil ${m.id} berhasil dikonfirmasi dan disahkan.`);
                                  }
                                });
                              }}
                              disabled={isPending}
                              className="h-10 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {isReportedByMe ? 'Konfirmasi Ulang' : 'Setujui & Sahkan'}
                            </button>

                            <button
                              onClick={() => {
                                setActiveTab('disputes');
                              }}
                              className="h-10 px-4 rounded-[8px] border border-[var(--danger)] text-[var(--danger)] font-semibold text-xs uppercase tracking-wider hover:bg-[var(--danger)]/10 transition-colors"
                            >
                              Ajukan Sengketa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MANAJEMEN SKUAD (FULL eFHUB SQUAD BUILDER WORKBENCH) */}
          {activeTab === 'roster' && (
            <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 sm:p-7">
              <SquadBuilderWorkbench
                session={session}
                participants={participants}
                initialPhase={phase2Roster?.phaseStatus.md10_completed ? 2 : 1}
                phase1Status={
                  phase1Roster?.phaseStatus || {
                    phase: 1,
                    is_locked: 0,
                    pa_locked: 0,
                    pb_locked: 0,
                    both_locked: false,
                    md10_completed: false,
                  }
                }
                phase2Status={phase2Roster?.phaseStatus}
                visibleCardsPhase1={phase1Roster?.cards || rosterCards}
                visibleCardsPhase2={phase2Roster?.cards || []}
                shortlistCards={shortlistCards}
                paSummaryPhase1={{
                  count: phase1Roster?.paCount ?? 0,
                  trending: phase1Roster?.paTrendingCount ?? 0,
                  indo: phase1Roster?.paIndoCount ?? 0,
                }}
                pbSummaryPhase1={{
                  count: phase1Roster?.pbCount ?? 0,
                  trending: phase1Roster?.pbTrendingCount ?? 0,
                  indo: phase1Roster?.pbIndoCount ?? 0,
                }}
                onSquadLockedChange={() => router.refresh()}
              />
            </div>
          )}

          {/* TAB 4: SENGKETA */}
          {activeTab === 'disputes' && (
            <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-8">
              <div>
                <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
                  Penyelesaian Sengketa Resmi (BAB IX)
                </h2>
                <p className="text-[13px] text-[var(--text-dim)]">
                  Keberatan resmi diajukan berlandaskan bukti tangkapan layar atau rekaman video (Pasal 35).
                </p>
              </div>

              {/* Form Ajukan Sengketa */}
              <form
                action={(formData) => {
                  startTransition(async () => {
                    const res = await disputeMatchAction(formData);
                    if (res?.error) {
                      showMessage('error', res.error);
                    } else {
                      showMessage('success', 'Sengketa resmi berhasil diajukan.');
                    }
                  });
                }}
                className="space-y-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-[var(--text-dim)] mb-1">Pilih Matchday</label>
                    <select
                      name="match_id"
                      required
                      className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                    >
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id} ({m.home_participant_id === 'participant_a' ? 'A vs B' : 'B vs A'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-dim)] mb-1">Pasal Terkait</label>
                    <input
                      type="text"
                      name="rule_article"
                      placeholder="Contoh: Pasal 19"
                      required
                      className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-dim)] mb-1">Kategori Sengketa</label>
                    <select
                      name="dispute_type"
                      required
                      className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                    >
                      <option value="violation_roster">Pelanggaran Roster / Skuad</option>
                      <option value="violation_quota_idn">Pelanggaran Kuota Indonesia</option>
                      <option value="disconnection_dispute">Sengketa Gangguan Koneksi</option>
                      <option value="score_mismatch">Perbedaan Catatan Skor</option>
                      <option value="unsporting_behavior">Perilaku Tidak Sportif</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-dim)] mb-1">Uraian Klaim & Fakta</label>
                  <textarea
                    name="claim_summary"
                    rows={3}
                    placeholder="Jelaskan fakta objektif dan kronologi kejadian..."
                    required
                    className="w-full p-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--text-dim)] mb-1">Tautan Bukti Video / Gambar</label>
                  <input
                    type="url"
                    name="evidence_url"
                    placeholder="https://..."
                    className="w-full h-10 px-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="h-10 px-6 rounded-[8px] bg-[var(--danger)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
                >
                  Ajukan Keberatan Resmi
                </button>
              </form>

              {/* Active Disputes List */}
              <div className="space-y-3">
                <span className="font-bold text-xs text-[var(--text)] uppercase block">
                  Daftar Sengketa ({disputes.length})
                </span>
                {disputes.length > 0 ? (
                  disputes.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text)]">{d.id} · {d.match_id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--danger)]/15 text-[var(--danger)] uppercase font-bold">
                          {d.status}
                        </span>
                      </div>
                      <p className="text-[var(--text-dim)]">{d.claim_summary}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-dim)]">Tidak ada sengketa aktif.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: JEJAK AUDIT */}
          {activeTab === 'audit' && (
            <AuditTrailPanel
              sessionParticipantId={session.participantId}
              participants={participants}
              events={auditEvents}
              chainVerification={
                auditChainVerification || {
                  intact: true,
                  totalEntries: auditEvents.length,
                  verifiedCount: auditEvents.length,
                  brokenAtId: null,
                  brokenReason: null,
                  latestHash: 'GENESIS',
                }
              }
              unreadOpponentCount={unreadAuditBadge}
              lastSeenAt={lastAuditSeenAt}
              onMarkedSeen={() => setUnreadAuditBadge(0)}
            />
          )}

          {/* TAB 6: PROFIL & PIN KEAMANAN */}
          {activeTab === 'profile' && (
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
          )}
        </div>
      </div>
    </div>
  );
}
