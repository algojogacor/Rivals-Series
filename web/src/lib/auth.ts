// RIVALS SERIES SEASON 1 (RS S1) AUTHENTICATION MODULE
// Implements allowlist-only authentication for Participant A and Participant B

import { cookies } from 'next/headers';
import { ParticipantId, Participant } from './types';
import { getParticipants } from './db';

const SESSION_COOKIE_NAME = 'rs_s1_session_participant';

// Default PINs for the two official participants (can be overridden via environment variables)
const PARTICIPANT_PINS: Record<ParticipantId, string> = {
  participant_a: process.env.PARTICIPANT_A_PIN || 'rs2026a',
  participant_b: process.env.PARTICIPANT_B_PIN || 'rs2026b',
};

export interface AuthSession {
  participantId: ParticipantId;
  participant: Participant;
  isAdmin: boolean;
}

/**
 * Get the currently logged-in participant from cookies
 */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue || (sessionValue !== 'participant_a' && sessionValue !== 'participant_b')) {
    return null;
  }

  const participantId = sessionValue as ParticipantId;
  const participants = await getParticipants();
  const participant = participants.find(p => p.id === participantId);

  if (!participant) return null;

  return {
    participantId,
    participant,
    isAdmin: participant.is_admin === 1,
  };
}

/**
 * Authenticate participant with PIN
 */
export async function loginParticipant(participantId: ParticipantId, pin: string): Promise<boolean> {
  const expectedPin = PARTICIPANT_PINS[participantId];
  if (!expectedPin || pin !== expectedPin) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, participantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return true;
}

/**
 * Logout current participant
 */
export async function logoutParticipant(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
