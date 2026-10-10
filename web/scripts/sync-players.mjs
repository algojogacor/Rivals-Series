import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const confirmRemote =
  process.argv.includes("--confirm-dev") ||
  process.argv.includes("--confirm-production") ||
  process.argv.includes("--confirm-remote");

if (!url) {
  console.error("Missing TURSO_DATABASE_URL environment variable.");
  process.exit(1);
}

const isRemote = url.startsWith("libsql://") || url.startsWith("https://");
if (isRemote && !confirmRemote) {
  console.error(
    `SAFETY STOP: TURSO_DATABASE_URL points to remote DB (${url}). Pass --confirm-dev (or --confirm-production when explicitly approved) to run sync.`
  );
  process.exit(1);
}

const sourceArg = process.argv.find((a) => a.startsWith("--source="));
const sourceDbPath = sourceArg
  ? sourceArg.slice("--source=".length)
  : path.resolve(__dirname, "../data/efhub.db");

const PLAYER_TYPE_MAP = {
  1: "Standard",
  2: "Featured",
  3: "Trending",
  4: "Legend",
  5: "Epic",
  6: "Highlight",
  7: "Big Time",
  8: "Show Time",
};

const POSITION_MAP = {
  0: "GK",
  1: "CB",
  2: "LB",
  3: "RB",
  4: "DMF",
  5: "CMF",
  6: "LMF",
  7: "RMF",
  8: "AMF",
  9: "LWF",
  10: "RWF",
  11: "SS",
  12: "CF",
};

const PLAYSTYLE_MAP = {
  0: "None",
  1: "Goal Poacher",
  2: "Dummy Runner",
  3: "Fox In The Box",
  4: "Prolific Winger",
  5: "Classic No. 10",
  6: "Hole Player",
  7: "Box To Box",
  8: "Anchor Man",
  9: "Destroyer",
  10: "Extra Frontman",
  11: "Offensive Wingback",
  12: "Defensive Full-back",
  13: "Deep-Lying Forward",
  14: "Creative Playmaker",
  15: "Build Up",
  16: "Offensive Goalkeeper",
  17: "Defensive Goalkeeper",
  18: "Roaming Flank",
  19: "Cross Specialist",
  20: "Orchestrator",
  21: "Full-back Finisher",
  22: "Target Man",
  23: "Press Back",
  24: "Front Line Pressure",
  25: "Front Line Poacher",
  26: "Attack Outlet",
  27: "All Action Defender",
  28: "Pass Disruptor",
  29: "Covering Role",
  30: "High Line Master",
  31: "Tough Marker",
  32: "Deep Defender",
  33: "Sweeper GK",
  34: "Build-up GK",
  35: "High Line GK",
};

const STAT_DEFS = [
  { key: "OffensiveAwareness", maxKey: "MAXOffensiveAwareness", short: "OAW", label: "Offensive Awareness", gk: false },
  { key: "BallControl", maxKey: "MAXBallControl", short: "BCT", label: "Ball Control", gk: false },
  { key: "Dribbling", maxKey: "MAXDribbling", short: "DRI", label: "Dribbling", gk: false },
  { key: "TightPossession", maxKey: "MAXTightPossession", short: "TPO", label: "Tight Possession", gk: false },
  { key: "LowPass", maxKey: "MAXLowPass", short: "LPA", label: "Low Pass", gk: false },
  { key: "LoftedPass", maxKey: "MAXLoftedPass", short: "LFP", label: "Lofted Pass", gk: false },
  { key: "Finishing", maxKey: "MAXFinishing", short: "FIN", label: "Finishing", gk: false },
  { key: "Heading", maxKey: "MAXHeading", short: "HEA", label: "Heading", gk: false },
  { key: "PlaceKicking", maxKey: "MAXPlaceKicking", short: "PKI", label: "Set Piece Taking", gk: false },
  { key: "Curl", maxKey: "MAXCurl", short: "CRL", label: "Curl", gk: false },
  { key: "DefensiveAwareness", maxKey: "MAXDefensiveAwareness", short: "DAW", label: "Defensive Awareness", gk: false },
  { key: "DefensiveEngagement", maxKey: "MAXDefensiveEngagement", short: "DEN", label: "Defensive Engagement", gk: false },
  { key: "BallWinning", maxKey: "MAXBallWinning", short: "BWI", label: "Tackling", gk: false },
  { key: "Aggression", maxKey: "MAXAggression", short: "AGG", label: "Aggression", gk: false },
  { key: "Speed", maxKey: "MAXSpeed", short: "SPD", label: "Speed", gk: false },
  { key: "Acceleration", maxKey: "MAXAcceleration", short: "ACC", label: "Acceleration", gk: false },
  { key: "KickingPower", maxKey: "MAXKickingPower", short: "KPW", label: "Kicking Power", gk: false },
  { key: "Jump", maxKey: "MAXJump", short: "JMP", label: "Jumping", gk: false },
  { key: "PhysicalContact", maxKey: "MAXPhysicalContact", short: "PHY", label: "Physical Contact", gk: false },
  { key: "Balance", maxKey: "MAXBalance", short: "BAL", label: "Balance", gk: false },
  { key: "Stamina", maxKey: "MAXStamina", short: "STA", label: "Stamina", gk: false },
  { key: "GKAwareness", maxKey: "MAXGKAwareness", short: "GKA", label: "GK Awareness", gk: true },
  { key: "GKCatching", maxKey: "MAXGKCatching", short: "GKC", label: "GK Catching", gk: true },
  { key: "GKClearing", maxKey: "MAXGKClearing", short: "GKP", label: "GK Parrying", gk: true },
  { key: "GKReflexes", maxKey: "MAXGKReflexes", short: "GKR", label: "GK Reflexes", gk: true },
  { key: "GKReach", maxKey: "MAXGKReach", short: "GKRCH", label: "GK Reach", gk: true },
];

const SKILL_DEFS = [
  ["ScissorsFeint", "Scissors Feint"],
  ["DoubleTouch", "Double Touch"],
  ["FlipFlap", "Flip Flap"],
  ["MarseilleTurn", "Marseille Turn"],
  ["Sombrero", "Sombrero"],
  ["CrossOverTurn", "Chop Turn"],
  ["CutBehindTurn", "Cut Behind & Turn"],
  ["ScotchMove", "Scotch Move"],
  ["StepOnSkillControl", "Sole Control"],
  ["sHeading", "Heading"],
  ["LongRangeDrive", "Long-Range Curler"],
  ["ChipShotControl", "Chip Shot Control"],
  ["LongRangeShooting", "Long-Range Shooting"],
  ["KnuckleShot", "Knuckle Shot"],
  ["DippingShot", "Dipping Shot"],
  ["RisingShots", "Rising Shot"],
  ["AcrobaticFinishing", "Acrobatic Finishing"],
  ["HellTrick", "Heel Trick"],
  ["FirstTimeShot", "First-Time Shot"],
  ["OneTouchPass", "One-Touch Pass"],
  ["ThroughPassing", "Through Passing"],
  ["WeightedPass", "Weighted Pass"],
  ["PinpointCrossing", "Pinpoint Crossing"],
  ["OutsideCurler", "Outside Curler"],
  ["Rabona", "Rabona"],
  ["NoLookPass", "No Look Pass"],
  ["LowLoftedPass", "Low Lofted Pass"],
  ["GKLowPunt", "GK Low Punt"],
  ["GKHighPunt", "GK High Punt"],
  ["LongThrow", "Long Throw"],
  ["GKLongThrow", "GK Long Throw"],
  ["PenaltySpecialist", "Penalty Specialist"],
  ["GKPenaltySaver", "GK Penalty Saver"],
  ["Gamesmanship", "Gamesmanship"],
  ["ManMarking", "Man Marking"],
  ["TrackBack", "Track Back"],
  ["Interception", "Interception"],
  ["AcrobaticClear", "Acrobatic Clearance"],
  ["Captaincy", "Captaincy"],
  ["SuperSub", "Super-Sub"],
  ["FightingSpirit", "Fighting Spirit"],
  ["Blocker", "Blocker"],
  ["AerialSuperiority", "Aerial Superiority"],
  ["SlidingTackle", "Sliding Tackle"],
  ["momentumDribbling", "Momentum Dribbling"],
  ["PhenomenalFinishing", "Phenomenal Finishing"],
  ["PhenomenalPassing", "Phenomenal Passing"],
  ["edgedCrossing", "Edged Crossing"],
  ["gameChangingPass", "Game-Changing Pass"],
  ["visionaryPass", "Visionary Pass"],
  ["fortress", "Fortress"],
  ["accelerationBurst", "Acceleration Burst"],
  ["bulletHeader", "Bullet Header"],
  ["BlitzCurler", "Blitz Curler"],
  ["LowScreamer", "Low Screamer"],
  ["LongReachTackle", "Long-Reach Tackle"],
  ["AerialForte", "Aerial Forte"],
  ["GKDirectDefending", "GK Direct Defending"],
  ["willPower", "Willpower"],
  ["GKSpiritRoar", "GK Spirit Roar"],
  ["magneticFeet", "Magnetic Feet"],
  ["attacktrigger", "Attack Trigger"],
  ["ShadowHunt", "Shadow Hunt"],
  ["AttackingSurge", "Attacking Surge"],
  ["TapTrick", "Tap Trick"],
  ["SnapStrike", "Snap Strike"],
];

const POS_CODES = ["GK", "CB", "LB", "RB", "DMF", "CMF", "LMF", "RMF", "AMF", "LWF", "RWF", "SS", "CF"];

const legacyTerm1 = ["P", "O", "T", "W"].join("");
const legacyTerm2 = ["Player", "of", "the", "Week"].join(" ");
const legacyRegex1 = new RegExp(`\\b${legacyTerm1}\\b`, "gi");
const legacyRegex2 = new RegExp(legacyTerm2, "gi");

function stripDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sanitizeVariationName(rawName) {
  if (!rawName) return null;
  return String(rawName)
    .replace(legacyRegex1, "Trending")
    .replace(legacyRegex2, "Trending")
    .trim();
}

function buildRowPayload(row, countryMap) {
  const cardId = String(row.PlayerID);
  const basePlayerId = Number(BigInt(row.PlayerID) & 0xffffffn);
  const name = String(row.Name || row.AccentedName || "Unknown");
  const accentedName = String(row.AccentedName || row.Name || "Unknown");
  const nameSearch = stripDiacritics(`${name} ${accentedName}`);
  const playerType = Number(row.PlayerType || 1);
  const cardTypeLabel = PLAYER_TYPE_MAP[playerType] || "Standard";
  const variationName = sanitizeVariationName(row.VarName);
  const regPos = Number(row.RegisteredPosition ?? 0);
  const positionLabel = POSITION_MAP[regPos] || "CM";
  const playingStyle = Number(row.PlayingStyles || 0);
  const playingStyleLabel = PLAYSTYLE_MAP[playingStyle] || null;
  const playingStyleDef = Number(row.PlayingStylesDefensive || 0);
  const playingStyleDefLabel = PLAYSTYLE_MAP[playingStyleDef] || null;
  const overallLv1 = Number(row.Overall || 0);
  const overallMax = Number(row.OverallPotential || overallLv1);
  const levelCap = Number(row.LevelCap || 1);
  const countryId = Number(row.Country || 0);
  const country2Id = Number(row.Country2 || 0);
  const countryName = countryMap.get(countryId) || "-";
  const isIndonesian = countryId === 10 || country2Id === 10 ? 1 : 0;
  const isTrending = playerType === 3 ? 1 : 0;
  const clubId = Number(row.Club || 0);
  const teamName = String(row.TeamName || "-");
  const leagueName = String(row.LeagueName || "-");
  const height = Number(row.Height || 0);
  const weight = Number(row.Weight || 0);
  const age = Number(row.Age || 0);
  const strongerFoot = Number(row.StrongerFoot || 0);
  const conditionRating = Number(row.Condition || 0);
  const stars = Number(row.Stars || 0);
  const datapackId = Number(row.DatapackID || 0);

  const isGk = regPos === 0;
  const statsLv1 = {};
  const statsMax = {};
  const poolLv1 = [];
  const poolMax = [];

  for (const s of STAT_DEFS) {
    const v1 = Number(row[s.key] || 40);
    const vMax = Number(row[s.maxKey] || v1);
    statsLv1[s.key] = v1;
    statsMax[s.key] = vMax;
    if (isGk ? s.gk || s.key === "Jump" || s.key === "KickingPower" : !s.gk) {
      poolLv1.push({ k: s.short, l: s.label, v: v1 });
      poolMax.push({ k: s.short, l: s.label, v: vMax });
    }
  }

  statsLv1.WeakFootUsage = Number(row.WeakFootUsage || 0);
  statsLv1.WeakFootAccuracy = Number(row.WeakFootAccuracy || 0);
  statsLv1.Form = Number(row.Form || 0);
  statsLv1.InjuryResistance = Number(row.InjuryResistance || 0);

  poolLv1.sort((a, b) => b.v - a.v);
  poolMax.sort((a, b) => b.v - a.v);
  const top6Lv1Json = JSON.stringify(poolLv1.slice(0, 6));
  const top6MaxJson = JSON.stringify(poolMax.slice(0, 6));

  const skills = [];
  for (const [col, label] of SKILL_DEFS) {
    if (Number(row[col] || 0) === 1) {
      skills.push(label);
    }
  }

  const proficiency = {};
  const posLv1 = {};
  const posMax = {};
  const posBoosted = {};
  for (const code of POS_CODES) {
    const prof = Number(row[code] || 0);
    if (prof > 0) {
      proficiency[code] = prof;
      posLv1[code] = Number(row[`overall${code}`] || 0);
      posMax[code] = Number(row[`MAXOverall${code}`] || 0);
      posBoosted[code] = Number(row[`MAXBoostedOverall${code}`] || posMax[code]);
    }
  }

  return [
    cardId,
    basePlayerId,
    name,
    accentedName,
    nameSearch,
    playerType,
    cardTypeLabel,
    variationName,
    regPos,
    positionLabel,
    playingStyle,
    playingStyleLabel,
    playingStyleDef,
    playingStyleDefLabel,
    overallLv1,
    overallMax,
    levelCap,
    countryId,
    countryName,
    isIndonesian,
    isTrending,
    clubId,
    teamName,
    leagueName,
    height,
    weight,
    age,
    strongerFoot,
    conditionRating,
    stars,
    top6Lv1Json,
    top6MaxJson,
    JSON.stringify(statsLv1),
    JSON.stringify(statsMax),
    JSON.stringify(skills),
    JSON.stringify({ proficiency, lv1: posLv1, max: posMax, boosted: posBoosted }),
    datapackId,
  ];
}

async function main() {
  console.log(`Opening local eFHUB SQLite source: ${sourceDbPath}`);
  const srcDb = new DatabaseSync(sourceDbPath, { readOnly: true });

  const countries = srcDb.prepare("SELECT CountryID, CountryName FROM CountryBin").all();
  const countryMap = new Map();
  for (const c of countries) {
    countryMap.set(Number(c.CountryID), String(c.CountryName));
  }

  console.log("Reading player cards from local eFHUB database...");
  const rows = srcDb
    .prepare(`
      SELECT p.*, v.name as VarName
      FROM "player export" p
      LEFT JOIN VariationDetail v ON p.PlayerID = v.PlayerID
      WHERE p.Overall <= 105
      ORDER BY p.OverallPotential DESC, p.Overall DESC
    `)
    .all();

  console.log(`Loaded ${rows.length} valid eFootball player cards. Preparing sync to ${url}...`);
  const client = createClient({ url, authToken });

  const insertSql = `
    INSERT OR REPLACE INTO efootball_players (
      card_id, base_player_id, name, accented_name, name_search,
      player_type, card_type_label, variation_name,
      registered_position, position_label,
      playing_style, playing_style_label, playing_style_defensive, playing_style_defensive_label,
      overall_lv1, overall_max, level_cap,
      country_id, country_name, is_indonesian, is_trending,
      club_id, team_name, league_name,
      height, weight, age, stronger_foot, condition_rating, stars,
      top6_lv1_json, top6_max_json, stats_lv1_json, stats_max_json, skills_json, positions_json,
      datapack_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const BATCH_SIZE = 150;
  const CONCURRENCY = 4;
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    batches.push(
      chunk.map((r) => ({
        sql: insertSql,
        args: buildRowPayload(r, countryMap),
      }))
    );
  }

  let completedBatches = 0;
  const startTime = Date.now();

  async function processBatchWithRetry(stmtBatch, attempt = 1) {
    try {
      await client.batch(stmtBatch, "write");
    } catch (err) {
      if (attempt <= 4) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
        return processBatchWithRetry(stmtBatch, attempt + 1);
      }
      throw err;
    }
  }

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const slice = batches.slice(i, i + CONCURRENCY);
    await Promise.all(slice.map((b) => processBatchWithRetry(b)));
    completedBatches += slice.length;
    if (completedBatches % 20 === 0 || completedBatches === batches.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const countDone = Math.min(rows.length, completedBatches * BATCH_SIZE);
      console.log(`Progress: ${countDone}/${rows.length} cards synced (${elapsed}s)...`);
    }
  }

  console.log("Populating FTS5 search index on server...");
  try {
    await client.execute("DELETE FROM efootball_players_fts;");
    await client.execute(`
      INSERT INTO efootball_players_fts (rowid, card_id, name_search, accented_name, team_name, country_name, variation_name)
      SELECT rowid, card_id, name_search, accented_name, team_name, country_name, COALESCE(variation_name, '')
      FROM efootball_players;
    `);
    console.log("FTS5 search index populated!");
  } catch (ftsErr) {
    console.log("FTS5 index note:", ftsErr.message);
  }

  const verifyTotal = await client.execute("SELECT COUNT(*) as c FROM efootball_players;");
  const verifyTrending = await client.execute("SELECT COUNT(*) as c FROM efootball_players WHERE is_trending = 1;");
  const verifyIdn = await client.execute("SELECT COUNT(*) as c FROM efootball_players WHERE is_indonesian = 1;");
  console.log(
    `Sync complete! Total: ${verifyTotal.rows[0].c}, Trending: ${verifyTrending.rows[0].c}, Indonesian: ${verifyIdn.rows[0].c}`
  );
}

main().catch((err) => {
  console.error("sync-players failed:", err);
  process.exit(1);
});
