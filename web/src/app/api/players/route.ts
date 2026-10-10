import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDbClient } from '@/lib/db';
import { EfootballPlayerSummary } from '@/lib/efhub-constants';

const LIGHTWEIGHT_COLUMNS = `
  p.card_id, p.base_player_id, p.name, p.accented_name,
  p.player_type, p.card_type_label, p.variation_name,
  p.registered_position, p.position_label,
  p.playing_style, p.playing_style_label,
  p.playing_style_defensive, p.playing_style_defensive_label,
  p.overall_lv1, p.overall_max, p.level_cap,
  p.country_id, p.country_name, p.is_indonesian, p.is_trending,
  p.club_id, p.team_name, p.league_name,
  p.height, p.weight, p.age, p.stronger_foot, p.condition_rating, p.stars,
  p.top6_lv1_json, p.top6_max_json
`;

function stripDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeTop6(rawJson: any) {
  try {
    const parsed = rawJson ? JSON.parse(String(rawJson)) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => {
      const k = String(item?.k || item?.key || '');
      const l = String(item?.l || item?.label || k);
      const v = Number(item?.v ?? item?.val ?? 0);
      return { k, l, v, key: k, label: l, val: v };
    });
  } catch {
    return [];
  }
}

function mapSummaryRow(r: any): EfootballPlayerSummary & Record<string, any> {
  const top6Lv1 = normalizeTop6(r.top6_lv1_json);
  const top6Max = normalizeTop6(r.top6_max_json);
  const posLabel = String(r.position_label || '');
  const cardTypeLabel = String(r.card_type_label || 'Standard');
  const teamName = String(r.team_name || '-');
  const countryName = String(r.country_name || '-');
  const levelCap = Number(r.level_cap || 1);
  const strongerFoot = Number(r.stronger_foot || 0);

  return {
    card_id: String(r.card_id),
    base_player_id: Number(r.base_player_id),
    name: String(r.name),
    accented_name: String(r.accented_name),
    player_type: Number(r.player_type),
    card_type_label: cardTypeLabel,
    player_type_label: cardTypeLabel,
    variation_name: r.variation_name ? String(r.variation_name) : null,
    registered_position: Number(r.registered_position),
    position_label: posLabel,
    position: posLabel,
    playing_style: Number(r.playing_style || 0),
    playing_style_label: r.playing_style_label ? String(r.playing_style_label) : null,
    playing_style_defensive: Number(r.playing_style_defensive || 0),
    playing_style_defensive_label: r.playing_style_defensive_label
      ? String(r.playing_style_defensive_label)
      : null,
    overall_lv1: Number(r.overall_lv1),
    overall_max: Number(r.overall_max),
    level_cap: levelCap,
    max_level: levelCap,
    country_id: Number(r.country_id || 0),
    country_name: countryName,
    nationality_name: countryName,
    is_indonesian: Number(r.is_indonesian || 0),
    is_trending: Number(r.is_trending || 0),
    club_id: Number(r.club_id || 0),
    team_name: teamName,
    club_name: teamName,
    league_name: String(r.league_name || '-'),
    height: Number(r.height || 0),
    weight: Number(r.weight || 0),
    age: Number(r.age || 0),
    stronger_foot: strongerFoot,
    foot: strongerFoot,
    condition_rating: Number(r.condition_rating || 0),
    stars: Number(r.stars || 0),
    top6_lv1: top6Lv1,
    top6_max: top6Max,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Akses ditolak. Anda harus masuk sebagai peserta untuk mencari pemain.' },
      { status: 401 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const rawQuery = (sp.get('q') || '').trim();
  const pos = (sp.get('pos') || '').trim();
  const type = (sp.get('type') || '').trim();
  const club = (sp.get('club') || '').trim();
  const country = (sp.get('country') || '').trim();
  const indonesian = sp.get('indonesian') === '1' || sp.get('indonesian') === 'true';
  const trending = sp.get('trending') === '1' || sp.get('trending') === 'true';
  const style = (sp.get('style') || '').trim();
  const defStyle = (sp.get('defStyle') || '').trim();
  const basePlayerId = (sp.get('basePlayerId') || '').trim();
  const sort = sp.get('sort') || 'overall_max';
  const page = Math.max(1, Number(sp.get('page') || 1));
  const limit = Math.min(50, Math.max(1, Number(sp.get('limit') || 24)));
  const offset = (page - 1) * limit;
  const wantFacets = sp.get('facets') === '1';

  const db = getDbClient();

  try {
    const whereClauses: string[] = [];
    const args: any[] = [];

    if (pos !== '') {
      if (/^\d+$/.test(pos)) {
        whereClauses.push('p.registered_position = ?');
        args.push(Number(pos));
      } else {
        whereClauses.push('p.position_label = ?');
        args.push(pos.toUpperCase());
      }
    }

    if (type !== '') {
      if (/^\d+$/.test(type)) {
        whereClauses.push('p.player_type = ?');
        args.push(Number(type));
      } else {
        whereClauses.push('lower(p.card_type_label) = lower(?)');
        args.push(type);
      }
    }

    if (club !== '') {
      whereClauses.push('lower(p.team_name) LIKE ?');
      args.push(`%${club.toLowerCase()}%`);
    }

    if (country !== '') {
      whereClauses.push('lower(p.country_name) = lower(?)');
      args.push(country);
    }

    if (indonesian) {
      whereClauses.push('p.is_indonesian = 1');
    }

    if (trending) {
      whereClauses.push('p.is_trending = 1');
    }

    if (style !== '' && /^\d+$/.test(style)) {
      whereClauses.push('p.playing_style = ?');
      args.push(Number(style));
    }

    if (defStyle !== '' && /^\d+$/.test(defStyle)) {
      whereClauses.push('p.playing_style_defensive = ?');
      args.push(Number(defStyle));
    }

    if (basePlayerId !== '' && /^\d+$/.test(basePlayerId)) {
      whereClauses.push('p.base_player_id = ?');
      args.push(Number(basePlayerId));
    }

    const orderBy =
      sort === 'overall_lv1'
        ? 'p.overall_lv1 DESC, p.overall_max DESC, p.name ASC'
        : sort === 'name'
        ? 'p.name ASC, p.overall_max DESC'
        : 'p.overall_max DESC, p.overall_lv1 DESC, p.name ASC';

    let rows: any[] = [];
    let total = 0;

    if (rawQuery.length > 0) {
      const normalizedQ = stripDiacritics(rawQuery);
      const tokens = normalizedQ
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z0-9]/g, ''))
        .filter(Boolean);

      // 1. Try FTS5 prefix search first for speed and multi-token matching
      if (tokens.length > 0) {
        try {
          const ftsExpr = tokens.map((t) => `"${t}"*`).join(' AND ');
          const ftsWhere = ['efootball_players_fts MATCH ?', ...whereClauses].join(' AND ');
          const ftsArgs = [ftsExpr, ...args];

          const countRes = await db.execute({
            sql: `
              SELECT COUNT(*) as c
              FROM efootball_players_fts
              JOIN efootball_players p ON p.rowid = efootball_players_fts.rowid
              WHERE ${ftsWhere};
            `,
            args: ftsArgs,
          });
          total = Number(countRes.rows[0]?.c || 0);

          if (total > 0) {
            const listRes = await db.execute({
              sql: `
                SELECT ${LIGHTWEIGHT_COLUMNS}
                FROM efootball_players_fts
                JOIN efootball_players p ON p.rowid = efootball_players_fts.rowid
                WHERE ${ftsWhere}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?;
              `,
              args: [...ftsArgs, limit, offset],
            });
            rows = listRes.rows;
          }
        } catch {
          // Fallback to indexed name_search below
        }
      }

      // 2. Fallback to indexed prefix + substring search on name_search if FTS5 returned 0 (e.g. mid-word substring like "dzes" for "Idzes")
      if (total === 0) {
        const prefixClause = 'p.name_search LIKE ?';
        const subClause = '(p.name_search LIKE ? OR lower(p.team_name) LIKE ?)';
        const combinedWhere = [
          `(${prefixClause} OR ${subClause})`,
          ...whereClauses,
        ].join(' AND ');
        const fallbackArgs = [
          `${normalizedQ}%`,
          `%${normalizedQ}%`,
          `%${normalizedQ}%`,
          ...args,
        ];

        const countRes = await db.execute({
          sql: `SELECT COUNT(*) as c FROM efootball_players p WHERE ${combinedWhere};`,
          args: fallbackArgs,
        });
        total = Number(countRes.rows[0]?.c || 0);

        const listRes = await db.execute({
          sql: `
            SELECT ${LIGHTWEIGHT_COLUMNS}
            FROM efootball_players p
            WHERE ${combinedWhere}
            ORDER BY CASE WHEN p.name_search LIKE ? THEN 0 ELSE 1 END, ${orderBy}
            LIMIT ? OFFSET ?;
          `,
          args: [...fallbackArgs, `${normalizedQ}%`, limit, offset],
        });
        rows = listRes.rows;
      }
    } else {
      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const countRes = await db.execute({
        sql: `SELECT COUNT(*) as c FROM efootball_players p ${whereSql};`,
        args,
      });
      total = Number(countRes.rows[0]?.c || 0);

      const listRes = await db.execute({
        sql: `
          SELECT ${LIGHTWEIGHT_COLUMNS}
          FROM efootball_players p
          ${whereSql}
          ORDER BY ${orderBy}
          LIMIT ? OFFSET ?;
        `,
        args: [...args, limit, offset],
      });
      rows = listRes.rows;
    }

    let facets: { clubs: string[]; countries: string[] } | undefined;
    if (wantFacets) {
      const [clubsRes, countriesRes] = await Promise.all([
        db.execute(`
          SELECT team_name, COUNT(*) as c
          FROM efootball_players
          WHERE team_name != '-' AND team_name != ''
          GROUP BY team_name
          ORDER BY c DESC, team_name ASC
          LIMIT 80;
        `),
        db.execute(`
          SELECT country_name, COUNT(*) as c
          FROM efootball_players
          WHERE country_name != '-' AND country_name != ''
          GROUP BY country_name
          ORDER BY CASE WHEN country_name = 'INDONESIA' THEN 0 ELSE 1 END, c DESC, country_name ASC
          LIMIT 80;
        `),
      ]);
      facets = {
        clubs: clubsRes.rows.map((r) => String(r.team_name)),
        countries: countriesRes.rows.map((r) => String(r.country_name)),
      };
    }

    return NextResponse.json({
      players: rows.map(mapSummaryRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ...(facets ? { facets } : {}),
    });
  } catch (err: any) {
    console.error('/api/players error:', err);
    return NextResponse.json(
      { error: `Gagal memuat daftar pemain: ${err.message}` },
      { status: 500 }
    );
  }
}
