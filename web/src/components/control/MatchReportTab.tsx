'use client';

import React, { useState } from 'react';
import { 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Sparkles, 
  Flag 
} from 'lucide-react';
import { 
  Participant, 
  ParticipantId, 
  Match, 
  RosterCard, 
  RosterPhaseStatus 
} from '@/lib/types';
import { submitMatchReportAction } from '@/lib/actions';
import { PlayerTag } from '../PlayerTag';
import { PlayerAvatar } from '../PlayerAvatar';
import { SquadPlayerSelect } from '../SquadPlayerSelect';
import { EvidenceUploadInput } from '../EvidenceUploadInput';
import { DraftGoalEvent } from './control-types';
import { burstRivalryConfetti } from '../fx/ConfettiBurst';

interface MatchReportTabProps {
  matches: Match[];
  participants: Participant[];
  pA: Participant;
  pB: Participant;
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
  isPending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export function MatchReportTab({
  matches,
  participants,
  pA,
  pB,
  rosterCards,
  phase1Roster,
  phase2Roster,
  isPending,
  startTransition,
  showMessage,
}: MatchReportTabProps) {
  const [selectedMd, setSelectedMd] = useState<number>(() => {
    const unplayed = matches.find((m) => m.status === 'scheduled');
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
  const activeRosterForMd =
    activePhaseForMd === 2 && phase2Roster ? phase2Roster.cards : phase1Roster?.cards || rosterCards;
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
  const [draftAssistRosterId, setDraftAssistRosterId] = useState<string>('');
  const [draftManualAssistName, setDraftManualAssistName] = useState<string>('');
  const [draftGoalMinute, setDraftGoalMinute] = useState<number>(45);
  const [draftGoalPeriod, setDraftGoalPeriod] = useState<'first_half' | 'second_half' | 'et'>('first_half');
  const [draftIsOwnGoal, setDraftIsOwnGoal] = useState<boolean>(false);

  // Per-MD Trending compliance state (Pasal 17)
  const [paTrendingH1, setPaTrendingH1] = useState<boolean>(true);
  const [paTrendingH2, setPaTrendingH2] = useState<boolean>(false);
  const [pbTrendingH1, setPbTrendingH1] = useState<boolean>(true);
  const [pbTrendingH2, setPbTrendingH2] = useState<boolean>(false);

  const selectedMatch = matches.find((m) => m.md_number === selectedMd);
  const isKnockout = selectedMd >= 11;

  const handleAddDraftGoal = () => {
    const squadPool = draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards;
    const chosenCard = squadPool.find((c) => c.id === draftScorerRosterId);
    const scorerName = chosenCard ? chosenCard.player_name : draftManualScorerName.trim();
    if (!scorerName) {
      showMessage('error', 'Pilih pemain pencetak gol dari skuad atau ketik nama pemain.');
      return;
    }

    let assistPlayerName: string | null = null;
    let assistCardId: string | null = null;
    let assistBasePlayerId: number | null = null;
    let assistCardVersion: string | null = null;

    if (!draftIsOwnGoal) {
      const chosenAssistCard = squadPool.find((c) => c.id === draftAssistRosterId);
      const manualAssist = draftManualAssistName.trim();
      const assistName = chosenAssistCard ? chosenAssistCard.player_name : (manualAssist || null);

      if (assistName) {
        if (chosenCard && chosenAssistCard && chosenCard.id === chosenAssistCard.id) {
          showMessage('error', 'Pencetak gol dan pemberi asis tidak boleh pemain yang sama.');
          return;
        }
        if (scorerName.toLowerCase() === assistName.toLowerCase()) {
          showMessage('error', 'Pencetak gol dan pemberi asis tidak boleh pemain yang sama.');
          return;
        }
        assistPlayerName = assistName;
        assistCardId = chosenAssistCard?.efootball_card_id || chosenAssistCard?.id || null;
        assistBasePlayerId = chosenAssistCard?.base_player_id ?? null;
        assistCardVersion = chosenAssistCard?.card_version || 'Standard';
      }
    }

    const newGoal: DraftGoalEvent = {
      id: `draft_goal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      participant_id: draftScorerParticipant,
      scoring_participant_id: draftScorerParticipant,
      scorer_card_id: chosenCard?.efootball_card_id || chosenCard?.id || null,
      scorer_base_player_id: chosenCard?.base_player_id ?? null,
      scorer_player_name: scorerName,
      scorer_card_version: chosenCard?.card_version || 'Standard',
      is_indonesian: chosenCard?.is_indonesian || 0,
      is_trending: chosenCard?.is_trending || 0,
      minute: Number(draftGoalMinute) || 45,
      period: draftGoalPeriod,
      is_own_goal: draftIsOwnGoal ? 1 : 0,
      assist_player_name: assistPlayerName,
      assist_card_id: assistCardId,
      assist_base_player_id: assistBasePlayerId,
      assist_card_version: assistCardVersion,
    };
    setGoalEvents((prev) => [...prev, newGoal]);
    setDraftManualScorerName('');
    setDraftAssistRosterId('');
    setDraftManualAssistName('');
    setDraftIsOwnGoal(false);
  };

  const handleRemoveDraftGoal = (id: string) => {
    setGoalEvents((prev) => prev.filter((g) => g.id !== id));
  };

  return (
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
              burstRivalryConfetti();
              showMessage('success', `Laporan hasil MD${selectedMd} berhasil dikirim. Menunggu konfirmasi lawan.`);
            }
          });
        }}
        className="space-y-8"
      >
        <input type="hidden" name="md_number" value={selectedMd} />

        {/* SCOREBOARD DISPLAY */}
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
                <div className="bg-[var(--ink-1)] p-3.5 rounded-[8px] border border-[var(--line)] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
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
                          setDraftAssistRosterId('');
                          setDraftManualAssistName('');
                        }}
                        className="w-full h-[44px] px-2.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold text-[var(--text)]"
                      >
                        <option value="participant_a">{pA.display_name} (A)</option>
                        <option value="participant_b">{pB.display_name} (B)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                        Pencetak Gol (Wajib)
                      </label>
                      {(draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards).length > 0 ? (
                        <SquadPlayerSelect
                          cards={draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards}
                          value={draftScorerRosterId}
                          onChange={(val) => {
                            setDraftScorerRosterId(val);
                            if (val && draftAssistRosterId === val) {
                              setDraftAssistRosterId('');
                            }
                          }}
                          placeholder="Cari & pilih pencetak gol..."
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

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                        Pemberi Asis (Opsional)
                      </label>
                      {draftIsOwnGoal ? (
                        <div className="h-[44px] px-3 rounded-[8px] bg-[var(--ink-2)]/50 border border-[var(--line)] text-xs text-[var(--text-faint)] flex items-center italic">
                          Gol bunuh diri tidak mencatat asis
                        </div>
                      ) : (
                        <>
                          {(draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards).length > 0 ? (
                            <SquadPlayerSelect
                              cards={(draftScorerParticipant === 'participant_a' ? paSquadCards : pbSquadCards).filter(
                                (c) => c.id !== draftScorerRosterId
                              )}
                              value={draftAssistRosterId}
                              onChange={(val) => {
                                setDraftAssistRosterId(val);
                                if (val) setDraftManualAssistName('');
                              }}
                              placeholder="Tanpa asis (solo/rebound/penalti)..."
                              emptyOptionLabel="— Tanpa Asis / Ketik Manual —"
                              emptyOptionValue=""
                            />
                          ) : null}
                          {!draftAssistRosterId && (
                            <input
                              type="text"
                              value={draftManualAssistName}
                              onChange={(e) => setDraftManualAssistName(e.target.value)}
                              placeholder="Kosongkan jika tanpa asis, atau ketik nama..."
                              className="w-full h-9 px-2.5 mt-1.5 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-xs text-[var(--text)]"
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1 border-t border-[var(--line)]/40">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-[var(--text-dim)] mb-1">
                        Menit & Babak
                      </label>
                      <div className="flex items-center gap-1.5">
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
                          className="w-16 h-[40px] px-2 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-mono text-center text-[var(--text)]"
                        />
                        <select
                          value={draftGoalPeriod}
                          onChange={(e) => setDraftGoalPeriod(e.target.value as any)}
                          className="flex-1 h-[40px] px-2 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[11px] text-[var(--text)]"
                        >
                          <option value="first_half">Babak 1 (B1)</option>
                          <option value="second_half">Babak 2 (B2)</option>
                          {isKnockout && <option value="et">Extra Time (ET)</option>}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="flex items-center gap-2 text-xs text-[var(--text-dim)] cursor-pointer mt-4 sm:mt-0">
                        <input
                          type="checkbox"
                          checked={draftIsOwnGoal}
                          onChange={(e) => {
                            setDraftIsOwnGoal(e.target.checked);
                            if (e.target.checked) {
                              setDraftAssistRosterId('');
                              setDraftManualAssistName('');
                            }
                          }}
                          className="w-4 h-4 rounded accent-[var(--danger)] cursor-pointer"
                        />
                        <span className="font-medium text-[var(--text)]">Gol Bunuh Diri (OG)</span>
                      </label>
                    </div>

                    <div className="sm:col-span-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddDraftGoal}
                        className="w-full sm:w-auto h-[40px] px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Gol</span>
                      </button>
                    </div>
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
                          {g.assist_player_name && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)]">
                              <span className="text-[9px] uppercase font-bold text-[var(--text-faint)]">Asis:</span>
                              <span className="font-semibold text-[var(--text)]">{g.assist_player_name}</span>
                              {g.assist_card_version && (
                                <span className="text-[10px] text-[var(--text-faint)]">({g.assist_card_version})</span>
                              )}
                            </span>
                          )}
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
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-[var(--text)] uppercase">
                  Bukti Screenshot & Catatan Laporan (Opsional)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ink-1)] text-[var(--text-dim)] border border-[var(--line)]">
                  Boleh Dilewati
                </span>
              </div>
              {stepEvidenceOpen ? <ChevronUp className="w-4 h-4 text-[var(--text-dim)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-dim)]" />}
            </button>
            {stepEvidenceOpen && (
              <div className="p-4 pt-3 border-t border-[var(--line)] space-y-4 text-xs">
                <EvidenceUploadInput
                  name="result_screenshot_url"
                  prefix={`md${selectedMd}_hasil`}
                  defaultValue={selectedMatch?.result_screenshot_url || ''}
                  label="Unggah Bukti Screenshot Hasil Pertandingan (Opsional)"
                  helperText="Opsional — jika ada foto layar akhir pertandingan, unggah, seret & lepas (drag & drop), atau paste (Ctrl+V) langsung. Jika tidak ada foto, langkah ini boleh dilewati."
                />
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
  );
}
