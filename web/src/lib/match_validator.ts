import { deriveMatchSettings } from './engine';
import { ParticipantId } from './types';

export interface ValidatedGoalEvent {
  scoring_participant_id: ParticipantId;
  scorer_player_name: string;
  period: 'regular_first_half' | 'regular_second_half' | 'extra_time_first_half' | 'extra_time_second_half';
  minute: number | null;
  scorer_card_id: string | null;
  scorer_base_player_id: number | null;
  scorer_card_version: string | null;
  is_own_goal: number;
  assist_player_name: string | null;
  assist_card_id: string | null;
  assist_base_player_id: number | null;
  assist_card_version: string | null;
}

export interface ValidatedMatchReportPayload {
  mdNumber: number;
  matchId: string;
  matchSettings: ReturnType<typeof deriveMatchSettings>;
  homeScore: number;
  awayScore: number;
  etPlayed: boolean;
  homeEtScore: number | null;
  awayEtScore: number | null;
  pkPlayed: boolean;
  homePkScore: number | null;
  awayPkScore: number | null;
  finalHomeGoals: number;
  finalAwayGoals: number;
  paGkName: string;
  paGkCardId: string | null;
  paGkBaseId: number | null;
  paGkCardVersion: string | null;
  paGkFull: number;
  pbGkName: string;
  pbGkCardId: string | null;
  pbGkBaseId: number | null;
  pbGkCardVersion: string | null;
  pbGkFull: number;
  validatedGoals: ValidatedGoalEvent[];
  resultScreenshotUrl: string | null;
  matchReportText: string | null;
  lineupWaShared: boolean;
  paFirstCredit: number;
  paSecondCredit: number;
  pbFirstCredit: number;
  pbSecondCredit: number;
  paIndoInDsp: number;
  pbIndoInDsp: number;
  paTrendingFirst: number;
  paTrendingSecond: number;
  pbTrendingFirst: number;
  pbTrendingSecond: number;
}

/**
 * Pure validation for match report submissions.
 * Rejects missing required fields with explicit error messages.
 * Normalizes optional fields explicitly to null or typed values without silent defaults.
 */
export function validateMatchReportInput(
  formData: FormData
): { success: true; data: ValidatedMatchReportPayload } | { success: false; error: string } {
  // 1. Validasi Nomor Matchday (Wajib)
  const mdNumberRaw = formData.get('md_number');
  const mdNumber = Number(mdNumberRaw);
  if (!mdNumberRaw || isNaN(mdNumber) || mdNumber < 1 || mdNumber > 20 || !Number.isInteger(mdNumber)) {
    return { success: false, error: 'Nomor Matchday tidak valid (wajib bilangan bulat antara MD1 sampai MD20).' };
  }

  const matchSettings = deriveMatchSettings(mdNumber);

  // 2. Validasi Skor Waktu Reguler (Wajib)
  const homeScoreRaw = formData.get('home_score');
  const awayScoreRaw = formData.get('away_score');
  if (
    homeScoreRaw === null ||
    homeScoreRaw === undefined ||
    String(homeScoreRaw).trim() === '' ||
    awayScoreRaw === null ||
    awayScoreRaw === undefined ||
    String(awayScoreRaw).trim() === ''
  ) {
    return { success: false, error: 'Skor waktu reguler untuk Peserta A dan Peserta B wajib diisi.' };
  }

  const homeScore = Number(homeScoreRaw);
  const awayScore = Number(awayScoreRaw);
  if (
    isNaN(homeScore) ||
    isNaN(awayScore) ||
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return { success: false, error: 'Skor waktu reguler harus berupa bilangan bulat positif (0 atau lebih besar).' };
  }

  // 3. Validasi Extra Time & Adu Penalti
  const etPlayed = formData.get('et_played') === 'true' || formData.get('et_played') === 'on';
  let homeEtScore: number | null = null;
  let awayEtScore: number | null = null;

  if (etPlayed) {
    const homeEtRaw = formData.get('home_et_score');
    const awayEtRaw = formData.get('away_et_score');
    if (
      homeEtRaw === null ||
      homeEtRaw === undefined ||
      String(homeEtRaw).trim() === '' ||
      awayEtRaw === null ||
      awayEtRaw === undefined ||
      String(awayEtRaw).trim() === ''
    ) {
      return { success: false, error: 'Skor Extra Time (ET) wajib diisi jika babak Extra Time dimainkan.' };
    }
    homeEtScore = Number(homeEtRaw);
    awayEtScore = Number(awayEtRaw);
    if (
      isNaN(homeEtScore) ||
      isNaN(awayEtScore) ||
      !Number.isInteger(homeEtScore) ||
      !Number.isInteger(awayEtScore) ||
      homeEtScore < 0 ||
      awayEtScore < 0
    ) {
      return { success: false, error: 'Skor Extra Time harus berupa bilangan bulat positif.' };
    }
    if (homeEtScore < homeScore || awayEtScore < awayScore) {
      return { success: false, error: 'Skor setelah Extra Time tidak boleh lebih kecil dari skor waktu reguler.' };
    }
  }

  const pkPlayed = formData.get('pk_played') === 'true' || formData.get('pk_played') === 'on';
  let homePkScore: number | null = null;
  let awayPkScore: number | null = null;

  if (pkPlayed) {
    const homePkRaw = formData.get('home_pk_score');
    const awayPkRaw = formData.get('away_pk_score');
    if (
      homePkRaw === null ||
      homePkRaw === undefined ||
      String(homePkRaw).trim() === '' ||
      awayPkRaw === null ||
      awayPkRaw === undefined ||
      String(awayPkRaw).trim() === ''
    ) {
      return { success: false, error: 'Skor adu penalti (PK) wajib diisi jika babak adu penalti dimainkan.' };
    }
    homePkScore = Number(homePkRaw);
    awayPkScore = Number(awayPkRaw);
    if (
      isNaN(homePkScore) ||
      isNaN(awayPkScore) ||
      !Number.isInteger(homePkScore) ||
      !Number.isInteger(awayPkScore) ||
      homePkScore < 0 ||
      awayPkScore < 0
    ) {
      return { success: false, error: 'Skor adu penalti harus berupa bilangan bulat positif.' };
    }
    if (homePkScore === awayPkScore) {
      return { success: false, error: 'Adu penalti wajib menghasilkan pemenang (skor adu penalti tidak boleh sama/imbang).' };
    }
  }

  const finalHomeGoals = etPlayed ? homeEtScore! : homeScore;
  const finalAwayGoals = etPlayed ? awayEtScore! : awayScore;

  // Knockout stage validation: must yield a winner
  if (matchSettings.phase === 'knockout_stage') {
    if (finalHomeGoals === finalAwayGoals && (!pkPlayed || homePkScore === awayPkScore)) {
      return {
        success: false,
        error: 'Pada Knockout Stage (MD11-MD20), pertandingan yang selesai normal wajib menghasilkan pemenang melalui ET atau adu penalti.',
      };
    }
  }

  // 4. Validasi Kiper Starter (Wajib Pasal 42 Golden Glove)
  const paGkName = formData.get('pa_gk_name')?.toString()?.trim();
  const pbGkName = formData.get('pb_gk_name')?.toString()?.trim();

  if (!paGkName || paGkName.length < 2) {
    return { success: false, error: 'Nama kiper starter Peserta A wajib diisi atau dipilih dari skuad.' };
  }
  if (!pbGkName || pbGkName.length < 2) {
    return { success: false, error: 'Nama kiper starter Peserta B wajib diisi atau dipilih dari skuad.' };
  }

  // Metadata kiper opsional — eksplisit null
  const paGkCardId = formData.get('pa_gk_card_id')?.toString()?.trim() || null;
  const paGkBaseIdRaw = formData.get('pa_gk_base_player_id')?.toString()?.trim();
  const paGkBaseId = paGkBaseIdRaw && !isNaN(Number(paGkBaseIdRaw)) ? Number(paGkBaseIdRaw) : null;
  const paGkCardVersion = formData.get('pa_gk_card_version')?.toString()?.trim() || null;
  const paGkFull = formData.get('pa_gk_full') === '1' ? 1 : 0;

  const pbGkCardId = formData.get('pb_gk_card_id')?.toString()?.trim() || null;
  const pbGkBaseIdRaw = formData.get('pb_gk_base_player_id')?.toString()?.trim();
  const pbGkBaseId = pbGkBaseIdRaw && !isNaN(Number(pbGkBaseIdRaw)) ? Number(pbGkBaseIdRaw) : null;
  const pbGkCardVersion = formData.get('pb_gk_card_version')?.toString()?.trim() || null;
  const pbGkFull = formData.get('pb_gk_full') === '1' ? 1 : 0;

  // 5. Validasi Pencetak Gol (Wajib & Terstruktur jika ada event gol)
  const goalEventsJsonRaw = formData.get('goal_events_json')?.toString();
  let rawGoalsList: any[] = [];
  if (goalEventsJsonRaw && goalEventsJsonRaw.trim()) {
    try {
      const parsed = JSON.parse(goalEventsJsonRaw);
      if (!Array.isArray(parsed)) {
        return { success: false, error: 'Format data pencetak gol tidak valid (bukan array JSON).' };
      }
      rawGoalsList = parsed;
    } catch {
      return { success: false, error: 'Data pencetak gol rusak (gagal membaca format JSON).' };
    }
  }

  const validatedGoals: ValidatedGoalEvent[] = [];

  for (let i = 0; i < rawGoalsList.length; i++) {
    const g = rawGoalsList[i];
    if (!g || typeof g !== 'object') {
      return { success: false, error: `Data gol baris #${i + 1} tidak valid.` };
    }

    // Tim pencetak wajib
    const partId = g.scoring_participant_id || g.participant_id;
    if (partId !== 'participant_a' && partId !== 'participant_b') {
      return { success: false, error: `Pencetak gol #${i + 1} wajib memiliki tim pemilik yang valid (Peserta A atau Peserta B).` };
    }

    // Nama pencetak gol wajib
    const scorerName = g.scorer_player_name?.toString()?.trim();
    if (!scorerName || scorerName.length < 2) {
      return { success: false, error: `Nama pencetak gol #${i + 1} wajib diisi dengan benar (minimal 2 karakter).` };
    }

    // Periode babak gol wajib
    let mappedPeriod: 'regular_first_half' | 'regular_second_half' | 'extra_time_first_half' | 'extra_time_second_half' | null = null;
    const rawPeriod = (g.period || '').toString().trim();
    if (rawPeriod === 'regular_first_half' || rawPeriod === 'first_half') {
      mappedPeriod = 'regular_first_half';
    } else if (rawPeriod === 'regular_second_half' || rawPeriod === 'second_half') {
      mappedPeriod = 'regular_second_half';
    } else if (rawPeriod === 'extra_time_first_half' || rawPeriod === 'et') {
      mappedPeriod = 'extra_time_first_half';
    } else if (rawPeriod === 'extra_time_second_half') {
      mappedPeriod = 'extra_time_second_half';
    }

    if (!mappedPeriod) {
      return { success: false, error: `Periode/babak untuk gol #${i + 1} (${scorerName}) tidak valid (pilih Babak 1, Babak 2, atau Extra Time).` };
    }

    // Menit gol (opsional, tapi jika diisi wajib valid)
    let minuteVal: number | null = null;
    if (g.minute !== undefined && g.minute !== null && String(g.minute).trim() !== '') {
      const m = Number(g.minute);
      if (isNaN(m) || !Number.isInteger(m) || m < 1 || m > 130) {
        return { success: false, error: `Menit terjadinya gol #${i + 1} harus antara menit 1 sampai 130.` };
      }
      minuteVal = m;
    }

    // Metadata opsional kartu pencetak
    const scorerCardId = g.scorer_card_id ? String(g.scorer_card_id).trim() : null;
    const baseIdNum = g.scorer_base_player_id ? Number(g.scorer_base_player_id) : null;
    const scorerBasePlayerId = baseIdNum && !isNaN(baseIdNum) ? baseIdNum : null;
    const scorerCardVersion = g.scorer_card_version ? String(g.scorer_card_version).trim() : null;
    const isOwnGoal = g.is_own_goal === 1 || g.is_own_goal === true ? 1 : 0;

    // Metadata opsional asis (bisa null jika tanpa asis)
    const rawAssistName = g.assist_player_name ? String(g.assist_player_name).trim() : null;
    const assistPlayerName = rawAssistName && rawAssistName.length > 0 ? rawAssistName : null;

    if (isOwnGoal === 1 && assistPlayerName) {
      return { success: false, error: `Gol bunuh diri #${i + 1} tidak dapat memiliki pencatat asis.` };
    }

    if (assistPlayerName) {
      const assistCardId = g.assist_card_id ? String(g.assist_card_id).trim() : null;
      if (scorerCardId && assistCardId && scorerCardId === assistCardId) {
        return { success: false, error: `Pencetak gol #${i + 1} dan pemberi asis tidak boleh pemain yang sama (${scorerName}).` };
      }
      if (scorerName.toLowerCase() === assistPlayerName.toLowerCase()) {
        return { success: false, error: `Pencetak gol #${i + 1} dan pemberi asis tidak boleh pemain yang sama (${scorerName}).` };
      }
    }

    const assistCardId = assistPlayerName && g.assist_card_id ? String(g.assist_card_id).trim() : null;
    const assistBaseIdNum = assistPlayerName && g.assist_base_player_id ? Number(g.assist_base_player_id) : null;
    const assistBasePlayerId = assistBaseIdNum && !isNaN(assistBaseIdNum) ? assistBaseIdNum : null;
    const assistCardVersion = assistPlayerName && g.assist_card_version ? String(g.assist_card_version).trim() : null;

    validatedGoals.push({
      scoring_participant_id: partId as ParticipantId,
      scorer_player_name: scorerName,
      period: mappedPeriod,
      minute: minuteVal,
      scorer_card_id: scorerCardId,
      scorer_base_player_id: scorerBasePlayerId,
      scorer_card_version: scorerCardVersion,
      is_own_goal: isOwnGoal,
      assist_player_name: assistPlayerName,
      assist_card_id: assistCardId,
      assist_base_player_id: assistBasePlayerId,
      assist_card_version: assistCardVersion,
    });
  }

  // 6. Screenshot & Catatan Laporan (OPSIONAL: Eksplisit null jika kosong)
  const rawReportText = formData.get('match_report_text')?.toString()?.trim();
  const matchReportText = rawReportText && rawReportText.length > 0 ? rawReportText : null;

  const rawScreenshotUrl = formData.get('result_screenshot_url')?.toString()?.trim();
  const resultScreenshotUrl = rawScreenshotUrl && rawScreenshotUrl.length > 0 ? rawScreenshotUrl : null;
  const lineupWaShared = formData.get('lineup_wa_shared') === 'true' || formData.get('lineup_wa_shared') === 'on';

  // 7. Indonesian Player Credits & Trending attestation (Pasal 17, 18, 19)
  const paFirstCredit = formData.get('pa_first_half_credit') === '1' ? 1 : 0;
  const paSecondCredit = formData.get('pa_second_half_credit') === '1' ? 1 : 0;
  const pbFirstCredit = formData.get('pb_first_half_credit') === '1' ? 1 : 0;
  const pbSecondCredit = formData.get('pb_second_half_credit') === '1' ? 1 : 0;

  const paIndoInDsp = formData.get('pa_indonesia_in_dsp') === '0' ? 0 : 1;
  const pbIndoInDsp = formData.get('pb_indonesia_in_dsp') === '0' ? 0 : 1;

  const paTrendingFirst = formData.get('pa_trending_first_half') === '1' ? 1 : 0;
  const paTrendingSecond = formData.get('pa_trending_second_half') === '1' ? 1 : 0;
  const pbTrendingFirst = formData.get('pb_trending_first_half') === '1' ? 1 : 0;
  const pbTrendingSecond = formData.get('pb_trending_second_half') === '1' ? 1 : 0;

  return {
    success: true,
    data: {
      mdNumber,
      matchId: `MD${mdNumber}`,
      matchSettings,
      homeScore,
      awayScore,
      etPlayed,
      homeEtScore,
      awayEtScore,
      pkPlayed,
      homePkScore,
      awayPkScore,
      finalHomeGoals,
      finalAwayGoals,
      paGkName,
      paGkCardId,
      paGkBaseId,
      paGkCardVersion,
      paGkFull,
      pbGkName,
      pbGkCardId,
      pbGkBaseId,
      pbGkCardVersion,
      pbGkFull,
      validatedGoals,
      resultScreenshotUrl,
      matchReportText,
      lineupWaShared,
      paFirstCredit,
      paSecondCredit,
      pbFirstCredit,
      pbSecondCredit,
      paIndoInDsp,
      pbIndoInDsp,
      paTrendingFirst,
      paTrendingSecond,
      pbTrendingFirst,
      pbTrendingSecond,
    },
  };
}
