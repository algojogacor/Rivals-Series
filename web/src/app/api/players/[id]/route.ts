import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { EfootballPlayerDetail, EfootballPlayerSummary } from '@/lib/efhub-constants';

function mapDetailRow(r: any): EfootballPlayerDetail {
  let top6Lv1 = [];
  let top6Max = [];
  let statsLv1 = {};
  let statsMax = {};
  let skills: string[] = [];
  let positions = { proficiency: {}, lv1: {}, max: {}, boosted: {} };

  try {
    top6Lv1 = r.top6_lv1_json ? JSON.parse(String(r.top6_lv1_json)) : [];
  } catch {}
  try {
    top6Max = r.top6_max_json ? JSON.parse(String(r.top6_max_json)) : [];
  } catch {}
  try {
    statsLv1 = r.stats_lv1_json ? JSON.parse(String(r.stats_lv1_json)) : {};
  } catch {}
  try {
    statsMax = r.stats_max_json ? JSON.parse(String(r.stats_max_json)) : {};
  } catch {}
  try {
    skills = r.skills_json ? JSON.parse(String(r.skills_json)) : [];
  } catch {}
  try {
    positions = r.positions_json
      ? JSON.parse(String(r.positions_json))
      : { proficiency: {}, lv1: {}, max: {}, boosted: {} };
  } catch {}

  return {
    card_id: String(r.card_id),
    base_player_id: Number(r.base_player_id),
    name: String(r.name),
    accented_name: String(r.accented_name),
    player_type: Number(r.player_type),
    card_type_label: String(r.card_type_label),
    variation_name: r.variation_name ? String(r.variation_name) : null,
    registered_position: Number(r.registered_position),
    position_label: String(r.position_label),
    playing_style: Number(r.playing_style || 0),
    playing_style_label: r.playing_style_label ? String(r.playing_style_label) : null,
    playing_style_defensive: Number(r.playing_style_defensive || 0),
    playing_style_defensive_label: r.playing_style_defensive_label
      ? String(r.playing_style_defensive_label)
      : null,
    overall_lv1: Number(r.overall_lv1),
    overall_max: Number(r.overall_max),
    level_cap: Number(r.level_cap || 1),
    country_id: Number(r.country_id || 0),
    country_name: String(r.country_name || '-'),
    is_indonesian: Number(r.is_indonesian || 0),
    is_trending: Number(r.is_trending || 0),
    club_id: Number(r.club_id || 0),
    team_name: String(r.team_name || '-'),
    league_name: String(r.league_name || '-'),
    height: Number(r.height || 0),
    weight: Number(r.weight || 0),
    age: Number(r.age || 0),
    stronger_foot: Number(r.stronger_foot || 0),
    condition_rating: Number(r.condition_rating || 0),
    stars: Number(r.stars || 0),
    top6_lv1: top6Lv1,
    top6_max: top6Max,
    stats_lv1: statsLv1,
    stats_max: statsMax,
    skills,
    positions,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Akses ditolak. Anda harus masuk untuk melihat detail atribut pemain.' },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const compareWith = (req.nextUrl.searchParams.get('compareWith') || '').trim();
  const db = getDbClient();

  try {
    const res = await db.execute({
      sql: 'SELECT * FROM efootball_players WHERE card_id = ? LIMIT 1;',
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Kartu pemain tidak ditemukan.' }, { status: 404 });
    }

    const player = mapDetailRow(res.rows[0]);

    // Fetch other versions of the same virtual player (lightweight columns only)
    const versionsRes = await db.execute({
      sql: `
        SELECT card_id, base_player_id, name, accented_name, player_type, card_type_label,
               variation_name, registered_position, position_label, overall_lv1, overall_max,
               level_cap, team_name, is_indonesian, is_trending
        FROM efootball_players
        WHERE base_player_id = ?
        ORDER BY overall_max DESC, overall_lv1 DESC
        LIMIT 20;
      `,
      args: [player.base_player_id],
    });

    const versions: Partial<EfootballPlayerSummary>[] = versionsRes.rows.map((v) => ({
      card_id: String(v.card_id),
      base_player_id: Number(v.base_player_id),
      name: String(v.name),
      accented_name: String(v.accented_name),
      player_type: Number(v.player_type),
      card_type_label: String(v.card_type_label),
      variation_name: v.variation_name ? String(v.variation_name) : null,
      registered_position: Number(v.registered_position),
      position_label: String(v.position_label),
      overall_lv1: Number(v.overall_lv1),
      overall_max: Number(v.overall_max),
      level_cap: Number(v.level_cap || 1),
      team_name: String(v.team_name || '-'),
      is_indonesian: Number(v.is_indonesian || 0),
      is_trending: Number(v.is_trending || 0),
    }));

    let comparePlayer: EfootballPlayerDetail | null = null;
    if (compareWith) {
      const compRes = await db.execute({
        sql: 'SELECT * FROM efootball_players WHERE card_id = ? LIMIT 1;',
        args: [compareWith],
      });
      if (compRes.rows.length > 0) {
        comparePlayer = mapDetailRow(compRes.rows[0]);
      }
    }

    return NextResponse.json({
      player,
      versions,
      ...(comparePlayer ? { comparePlayer } : {}),
    });
  } catch (err: any) {
    console.error('/api/players/[id] error:', err);
    return NextResponse.json(
      { error: `Gagal memuat detail pemain: ${err.message}` },
      { status: 500 }
    );
  }
}
