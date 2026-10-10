import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getParticipants,
  getSeasonSettings,
  getAllMatches,
  getAllGoalEvents,
  getAllGoalkeeperRecords,
  getAllQuotaCredits,
  getAllSanctions,
  getAllGoalNominations,
  getAllAuditEvents,
  recordAuditEvent,
} from '@/lib/db';
import { calculateStandings } from '@/lib/engine';

export async function GET(request: NextRequest) {
  // Requirement 5: /api/archive hanya untuk admin yang sudah login
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json(
      { error: 'Akses ditolak: Hanya administrator resmi yang dapat mengunduh arsip musim.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'json').toLowerCase();

  await recordAuditEvent({
    actorId: session.participantId,
    actorName: session.participant.display_name,
    category: 'mutual',
    action: 'export_season_archive',
    entityType: 'archive',
    entityId: 'season_1',
    afterJson: {
      format: format.toUpperCase(),
      exportedBy: session.participant.display_name,
    },
    reason: `${session.participant.display_name} mengekspor arsip resmi musim dalam format ${format.toUpperCase()}.`,
    ruleArticle: 'Pasal 50',
  });

  const [
    participants,
    seasonSettings,
    matches,
    goalEvents,
    goalkeeperRecords,
    quotaCredits,
    sanctions,
    goalNominations,
    auditEvents,
  ] = await Promise.all([
    getParticipants(),
    getSeasonSettings(),
    getAllMatches(),
    getAllGoalEvents(),
    getAllGoalkeeperRecords(),
    getAllQuotaCredits(),
    getAllSanctions(),
    getAllGoalNominations(),
    getAllAuditEvents(1000),
  ]);

  const standings = calculateStandings(
    participants,
    matches,
    sanctions,
    quotaCredits,
    seasonSettings?.status === 'completed'
  );

  const archiveData = {
    exported_at: new Date().toISOString(),
    exported_by: session.participantId,
    season: seasonSettings,
    standings,
    participants,
    matches,
    goal_events: goalEvents,
    goalkeeper_records: goalkeeperRecords,
    quota_credits: quotaCredits,
    sanctions,
    goal_nominations: goalNominations,
    audit_events: auditEvents,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (format === 'csv') {
    // Generate CSV for matches and standings
    let csv = '# RIVALS SERIES SEASON 1 ARCHIVE SUMMARY\n';
    csv += `# Exported: ${archiveData.exported_at}\n\n`;

    csv += '## STANDINGS\n';
    csv += 'Rank,Participant,MP,W,D,L,GF,GA,GD,PTS,ID_Credits\n';
    standings.forEach((s) => {
      csv += `${s.rank},"${s.display_name}",${s.mp},${s.w},${s.d},${s.l},${s.gf},${s.ga},${s.gd},${s.points},${s.id_credits}\n`;
    });

    csv += '\n## MATCHES\n';
    csv += 'ID,MD,Phase,Status,Home,Away,HomeScore,AwayScore,ResultType,Winner\n';
    matches.forEach((m) => {
      csv += `${m.id},${m.md_number},${m.phase},${m.status},${m.home_participant_id},${m.away_participant_id},${m.home_score ?? ''},${m.away_score ?? ''},${m.result_type},${m.winner_id ?? ''}\n`;
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rs_s1_archive_${timestamp}.csv"`,
      },
    });
  }

  // JSON format
  return new NextResponse(JSON.stringify(archiveData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="rs_s1_archive_${timestamp}.json"`,
    },
  });
}
