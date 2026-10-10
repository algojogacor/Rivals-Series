import { Participant, ParticipantId, Match, RosterCard, RosterPhaseStatus } from '@/lib/types';

export interface DraftGoalEvent {
  id: string;
  participant_id: ParticipantId;
  scoring_participant_id?: ParticipantId;
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

export interface ControlSession {
  participantId: ParticipantId;
  participant: Participant;
  isAdmin: boolean;
}
