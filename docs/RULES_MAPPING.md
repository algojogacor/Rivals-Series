# RIVALS SERIES SEASON 1 (RS S1) — RULES TO FEATURE MAPPING

Dokumen ini memetakan setiap pasal dari dokumen otoritatif `rules.md` ke dalam arsitektur data, komponen UI, modul kalkulasi server, dan pengujian unit pada website resmi RS S1.

---

## 1. BAB I: KETENTUAN UMUM

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 1** | Nama kompetisi RS S1, eFootball 1v1 independen, dua peserta saja. | Tabel `season_settings` (`name`, `season_number`, `game_title`). | Header, Navigasi, Footer, Meta Title. | Identitas tetap RS S1. |
| **Pasal 2** | Definisi resmi: Peserta, MD1-MD20, Group Stage (1-10), Knockout Stage (11-20), Starting XI, DSP, Kartu Trending, Pemain Indonesia, Kredit babak, Forfeit, Rekonstruksi, Birdcaging, Administrator, AI Adjudicator. | Enum tipe data: `MatchPhase`, `MatchStatus`, `DisputeType`. | Tooltips glosarium, Halaman `/rules`, badge status. | Type guards TypeScript di `types/rules.ts`. |
| **Pasal 3** | Prinsip objektivitas, beban pembuktian pada penuduh, status quo jika bukti tidak cukup, sanksi hanya sesuai regulasi tertulis. | Tabel `audit_events`, `disputes` (`status_quo_retained`). | Halaman Sengketa `/control/disputes`, Banner Status Quo. | Tidak ada sanksi otomatis tanpa pembuktian. |

---

## 2. BAB II: FORMAT KOMPETISI, MATCHDAY, DAN KLASEMEN

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 4** | 20 MD reguler dalam satu klasemen tunggal terpadu. | Tabel `matches` (MD1-MD20 terdaftar otomatis). | `/standings`, `/matches`. | Tidak ada eliminasi peserta setelah MD10. |
| **Pasal 5** | Jadwal fleksibel, boleh dimainkan tidak berurutan, tidak ada denda penundaan, pengaturan game terikat pada nomor MD. | Kolom `played_at`, `status = scheduled`. Tanpa kolom `deadline`. | `/matches` (Filter fase dan status, tanpa countdown fiktif). | `deriveMatchSettings(mdNumber)`. |
| **Pasal 6** | Sistem poin: Group Stage (W: 3, D: 1, L: 0); Knockout Stage (W: 3, L: 0, ET/PK wajib hasilkan pemenang). Skor adu penalti dicatat terpisah dan tidak masuk GF/GA. | `matches` (`home_score`, `away_score`, `et_played`, `pk_home_score`, `pk_away_score`). | `/matches/[md]` (Rincian reguler, ET, dan PK). | `calculateMatchPoints()`, `testMatchPointsCalculation()`. |
| **Pasal 7** | Komponen Official League Table: MP, W, D, L, GF, GA, GD (GF - GA), PTS, Kredit Indonesia (/5), Catatan Sanksi. Skor forfeit 0-3 masuk GF/GA tim tapi bukan gol pemain. Technical Win koin: 3 poin tapi 0-0 GF/GA. | Tabel `standings_view` / kalkulasi agregat. | `/standings` (Tabel 10 kolom resmi + rincian kredit). | `calculateStandings()`, `testStandingsAggregation()`. |
| **Pasal 8** | Urutan tie-breaker: 1. GD, 2. GF, 3. Total Kemenangan, 4. Kemenangan MD11-MD20, 5. GD MD11-MD20, 6. GF MD11-MD20, 7. Championship Playoff. | Objek `TiebreakerBreakdown`. | `/standings` (Modal rincian kalkulasi peringkat). | `calculateTiebreakers()`, `testTiebreakerOrder()`. |
| **Pasal 9** | Juara matematis awal: formula `G_adj > 3 * R`, dengan `G_adj = G - 3` jika pemimpin belum capai 5 kredit Indonesia. Berlaku setelah jendela keberatan 24 jam tutup. | Flag `early_champion_secured`, `g_adj`, `remaining_md`. | `/` (Dashboard notice), `/standings` (Banner status). | `calculateEarlyChampion()`, `testEarlyChampionFormula()`. |
| **Pasal 10** | RS Champion S1 diberikan kepada pemenang klasemen akhir setelah semua MD dan sengketa selesai. | Status `season_completed`, field `champion_participant_id`. | `/awards`, `/` (Hero recap saat selesai). | Pengesahan akhir musim. |

---

## 3. BAB III: PENGATURAN PERTANDINGAN

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 11** | Durasi 8 menit, Condition Random, Max 6 pergantian/sesi. MD1-10: ET OFF, PK OFF. MD11-20: ET ON, PK ON. | `season_settings` (`match_duration_minutes = 8`, `condition = 'random'`). | Form input laporan pertandingan `/control/report`. | Validasi form agar tidak menerima hasil draw pada MD11-20. |
| **Pasal 12** | Kepatuhan pengaturan, larangan perubahan sepihak. | Field `attestation_settings_verified: boolean`. | Checkbox pengesahan sebelum kirim laporan. | Server-side validation check. |
| **Pasal 13** | Maksimal 6 pergantian, disiplin in-game tidak terbawa lintas pertandingan. | Input opsional log pergantian di form laporan. | Rincian pertandingan. | Bebas hukuman akumulasi kartu kuning/merah. |

---

## 4. BAB IV: SKUAD DAN PERUBAHAN SKUAD

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 14** | Maksimal 26 kartu per peserta per fase, wajib minimal 2 kartu Trending, dan tidak boleh ada kartu kembar dari pemain virtual (`base_player_id`) yang sama dalam satu skuad. Snapshot dikunci sebelum MD1. | Tabel `roster_cards`, `roster_phases` (`is_locked`, `snapshot_json`). | `/control/roster`, `/participants/[id]`. | Validasi kuota maksimal 26 kartu, min 2 kartu Trending, dan larangan duplikat `base_player_id` per fase. |
| **Pasal 15** | Perubahan bebas antara MD10 dan MD11 (boleh mengganti kartu ke versi lain dari pemain virtual yang sama). Skuad fase 2 dikunci sebelum MD11. | Roster Phase 1 (MD1-10) vs Phase 2 (MD11-20). | Modal jendela transfer pertengahan musim. | Validasi fase snapshot aktif. |
| **Pasal 16** | Keabsahan kartu dan kebangsaan didasarkan pada snapshot registrasi di dalam game. | Kolom `nationality`, `is_trending`, `card_version` (Trending, Standard, Epic, Highlight, dll). | Daftar kartu skuad peserta. | Rujukan snapshot independen dari update game kemudian. |

---

## 5. BAB V: PERSYARATAN KARTU TRENDING DAN PEMAIN INDONESIA

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 17** | Minimal 2 pemain berkartu Trending bermain secara bersamaan di lapangan selama minimal 1 babak reguler penuh (45 menit penuh) pada setiap MD. Pelanggaran berakibat forfeit 0-3. Bukti screenshot sebelum kick-off di WhatsApp. | Tabel `match_quota_credits` (`trending_first_half`, `trending_second_half`), `sanctions` (`trending_forfeit`). | Form laporan hasil, dialog keberatan sengketa. | Forfeit trigger saat pelanggaran terbukti. |
| **Pasal 18** | Minimal 1 pemain Indonesia dalam DSP (starter/cadangan) pada setiap MD. Pelanggaran berakibat forfeit 0-3. | Field `indonesia_in_dsp: boolean`. | Form laporan hasil. | Forfeit trigger saat pelanggaran terbukti. |
| **Pasal 19** | Kuota 5 kredit babak Indonesia sepanjang musim. 1 babak reguler penuh tanpa jeda = 1 kredit. Max 2 kredit per pertandingan. Kekurangan di akhir musim = pengurangan 3 poin klasemen. | Tabel `match_quota_credits` (`participant_id`, `match_id`, `first_half_credit: boolean`, `second_half_credit: boolean`). | Indikator progress `kredit / 5`, peringatan risiko sanksi -3 poin. | `calculateIndonesianCredits()`, `testQuotaDeductionRisk()`. |
| **Pasal 20** | Bukti screenshot lineup pra-pertandingan disimpan dan dikirim di WhatsApp. Tidak ada audit manual rutin jika tidak ada sengketa. | Field `lineup_screenshot_shared_wa: boolean`. | Checklist administrasi pra-kickoff. | Bukti disimpan privat untuk keperluan sengketa. |

---

## 6. BAB VI: PELAPORAN DAN PENGESAHAN HASIL

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 21** | Persiapan sebelum kick-off (7 butir checklist). | Form checklist pra-pertandingan. | `/control/report`. | Checklist interaktif. |
| **Pasal 22** | Pelaporan di WhatsApp max 24 jam. Lawan wajib konfirmasi atau mengajukan keberatan spesifik max 24 jam. Jika diam 24 jam dengan screenshot valid = pengesahan administratif. | Tabel `matches` (`confirmation_status`, `reported_at`, `confirmed_at`, `admin_auto_confirmed`). | `/control/matches/pending` (Aksi Konfirmasi / Keberatan). | `calculateConfirmationTimeout()`. |
| **Pasal 23** | Pengesahan hasil dan koreksi. Setiap koreksi mencatat nilai lama, nilai baru, alasan, tanggal, dan pasal. Log tidak boleh dihapus. | Tabel `audit_events` (`action = 'score_correction'`, `before_json`, `after_json`, `reason`, `article`). | `/control/audit`, tab Riwayat Koreksi di detail pertandingan. | Append-only audit logger. |
| **Pasal 24** | Jadwal fleksibel, penundaan bebas tanpa sanksi, MD dimainkan sesuai kesepakatan. | Filter status `scheduled` dan `postponed`. | Kalender jadwal dinamis tanpa batas waktu kadaluwarsa. | Tidak ada penalti jadwal otomatis. |

---

## 7. BAB VII: GANGGUAN KONEKSI DAN REKONSTRUKSI

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 25** | Prinsip rekonstruksi waktu dan skor, dilarang restart bebas 0-0. | Tabel `connection_incidents` (`interrupted_minute`, `interrupted_home_score`, `interrupted_away_score`). | `/control/reconstruction`, status badge `Reconstructed`. | Pertahankan skor sebelum gangguan. |
| **Pasal 26** | Prosedur gol bunuh diri untuk memulihkan skor. Gol rekonstruksi dikeluarkan dari GF/GA gol baru, Golden Boot, clean sheet, dan GOTS. | Tabel `match_goal_events` (`is_reconstruction_only: boolean`). | Detail gol dengan penanda khusus (tidak menambah statistik pemain). | `filterReconstructionGoals()`, `testReconstructionIsolation()`. |
| **Pasal 27** | Gangguan pada Extra Time atau adu penalti. Pengulangan penalti dari tendangan pertama setelah pemulihan skor ET. | Field `et_interrupted`, `pk_restarted`. | Wizard panduan rekonstruksi teknis. | Rekam status pemulihan bertahap. |
| **Pasal 28** | Batas penyelesaian teknis 24 jam. Fallback undian koin digital: Heads = Peserta A, Tails = Peserta B. Pemenang dapat Technical Win (3 poin, 0-0 GF/GA, no streak). | Tabel `connection_incidents` (`coin_toss_used`, `coin_toss_result`, `coin_toss_tool`, `video_proof_url`). | Modal eksekusi undian koin digital & pencatatan bukti video. | `testTechnicalWinRules()`. |
| **Pasal 29** | Gangguan ke-3 yang terbukti objektif berasal dari koneksi peserta yang sama berakibat forfeit 0-3. | Penghitung atribusi gangguan per peserta. | Log teknis koneksi, peringatan sanksi ke-3. | `testAttributedInterruptionCount()`. |
| **Pasal 30** | Rekonstruksi tetap merupakan 1 pertandingan yang sama. | ID pertandingan tetap tunggal. | Riwayat timeline pertandingan. | Integritas ID MD1-MD20. |

---

## 8. BAB VIII: SPORTIVITAS DAN BIRDCAGING

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 31** | Sportivitas, taktik normal diizinkan, larangan manipulasi. | Kebijakan kompetisi. | `/rules`. | Transparansi aturan. |
| **Pasal 32** | Definisi objektif birdcaging: unggul skor, 30 detik video kontinu di area sendiri, tanpa lewati garis tengah, operan defensif berulang. | Tabel `disputes` (`category = 'birdcaging'`, `video_evidence_url`, `duration_seconds`). | Form pelaporan birdcaging dengan panduan kriteria 4 unsur. | Validasi kelengkapan 4 unsur sebelum klaim diproses. |
| **Pasal 33** | Sanksi birdcaging kumulatif: 1. Peringatan, 2. Pengurangan 1 poin, 3. Forfeit 0-3. | Tabel `sanctions` (`type = 'birdcaging_warning' \| 'birdcaging_point_deduction' \| 'birdcaging_forfeit'`). | Daftar sanksi disiplin di `/standings` dan `/control/sanctions`. | `testBirdcagingSanctionsProgression()`. |
| **Pasal 34** | Larangan manipulasi bukti, laporan, atau pengaturan. | Tabel `sanctions`. | Log pelanggaran resmi. | Tidak ada sanksi retroaktif tanpa dasar pasal. |

---

## 9. BAB IX: SENGKETA DAN AI ADJUDICATOR

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 35** | Forfeit Kartu Trending/DSP = 0-3 tim, tanpa gol individual. Double forfeit = 0 poin untuk kedua peserta. | Tabel `matches` (`result_type = 'forfeit' \| 'double_forfeit'`). | Tampilan khusus double forfeit di `/matches`. | `testDoubleForfeitCalculation()`. |
| **Pasal 36** | Beban pembuktian pada penuduh, status quo jika bukti tidak cukup. | Flag `status_quo_retained`. | Rekap putusan perkara sengketa. | Status quo default. |
| **Pasal 37** | Tenggat sengketa 24 jam keberatan, 48 jam tanggapan pihak lawan. Hasil ditandai `Disputed` sementara. | Kolom `filed_at`, `response_deadline_at`, `status = 'pending_response'`. | Badge `Disputed` di `/matches` dan `/standings`. | Hasil disengketakan tidak mengubah klasemen resmi sampai putus. |
| **Pasal 38** | AI Adjudicator: model dan prompt identik pra-MD1. Evaluasi berbasis bukti paket. Tombol export paket sengketa (Markdown/JSON). Status quo jika bukti kurang. | Tabel `disputes` (`ai_model_name`, `ruling_summary`, `ruling_text`, `dispute_package_json`). | Tombol "Download / Export Paket Sengketa AI", Form Input Hasil Putusan AI. | Format ekspor terstandarisasi untuk copy-paste ke Claude / GPT. |
| **Pasal 39** | Sanksi hanya yang tertulis dalam regulasi. | Validasi enum tipe sanksi. | Log sanksi resmi. | Tidak ada sanksi tak terdaftar. |

---

## 10. BAB X: STATISTIK DAN PENGHARGAAN

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 40** | Prinsip statistik resmi: gol reguler + ET dihitung; gol penalti, forfeit, dan rekonstruksi tidak dihitung. Gabungkan versi kartu virtual player yang sama. | Query agregasi gol dan clean sheet. | `/statistics`. | `aggregatePlayerStats()`. |
| **Pasal 41** | RS Champion S1: juara resmi klasemen. | Field `champion_participant_id`. | `/awards`, `/`. | Pengesahan juara. |
| **Pasal 42** | Golden Boot S1: pencetak gol terbanyak, co-winners diizinkan jika seri. | Ranking gol virtual player. | Kartu Golden Boot di `/awards`. | `calculateGoldenBoot()`, `testGoldenBootCombiningVersions()`. |
| **Pasal 43** | Goal of the Season S1: max 2 nominasi per peserta (total 4), voting privat 2 peserta, bobot peringkat 4-3-2-1, tiebreaker poin dari lawan (non-owner). Buka suara serentak setelah kedua peserta kunci pilihan. | Tabel `goal_nominations`, `award_ballots`, `award_ballot_items`. | `/awards/goal-of-the-season` (Galeri video, ballot drag-and-drop, kunci suara privat). | `calculateGoalOfTheSeason()`, `testGotsTiebreakerNonOwner()`. |
| **Pasal 44** | Golden Glove S1: clean sheet individual kiper starter yang bermain penuh tanpa diganti. Adu penalti bukan kebobolan. Co-winners diizinkan. | Tabel `goalkeeper_match_records` (`is_starter`, `played_until_whistle`, `clean_sheet_earned`). | Kartu Golden Glove di `/awards`. | `calculateGoldenGlove()`, `testGoldenGloveSubstitutedKeeper()`. |
| **Pasal 45** | Best Defence S1: GA tim paling sedikit, tiebreaker tim clean sheets terbanyak. | Kolom `GA` dan clean sheets klasemen. | Kartu Best Defence di `/awards`. | `calculateBestDefence()`. |
| **Pasal 46** | Longest Winning Streak S1: rentetan kemenangan berturut-turut sportif (termasuk ET dan PK). Forfeit dan Technical Win tidak dihitung sebagai kemenangan sportif. | Agregasi streak berbasis urutan waktu pertandingan yang disahkan. | Kartu Longest Winning Streak di `/awards`. | `calculateWinningStreak()`, `testWinningStreakExcludesAdminWins()`. |
| **Pasal 47** | Most Clean Sheets S1: clean sheet tim terbanyak. | Agregasi clean sheet tim. | Kartu Most Clean Sheets di `/awards`. | `calculateMostCleanSheets()`. |
| **Pasal 48** | Publikasi 7 penghargaan resmi, tanpa bonus poin liga. | Halaman `/awards`. | Tampilan 7 kartu penghargaan proporsional. | Tampilkan status Provisional vs Final. |

---

## 11. BAB XI: WEBSITE DAN ADMINISTRASI

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 49** | Pusat informasi resmi publik: klasemen, hasil MD1-20, statistik, progress kuota, sanksi, penghargaan, log koreksi. Label sementara untuk hasil belum terkonfirmasi. | Rute halaman publik Next.js App Router. | `/`, `/standings`, `/matches`, `/statistics`, `/awards`, `/rules`. | Navigasi terstruktur. |
| **Pasal 50** | Administrator bertugas input data, dilarang merubah sepihak, konfirmasi WhatsApp sebagai rujukan, log koreksi wajib terlihat. | Role `administrator` vs `participant`. | Panel Operasi `/control`, Audit Log `/control/audit`. | Dual-confirmation checks, tamper-proof history. |
| **Pasal 51** | Status hasil resmi: `Scheduled`, `In Progress`, `Completed`, `Reconstructed`, `Forfeited`, `Technical Win`, `Disputed`, `Postponed`. | Enum `MatchStatus`. | Badge warna dan teks semantik di seluruh aplikasi. | Konsistensi status antar halaman. |

---

## 12. BAB XII: AMENDEMEN DAN PENUTUP

| Pasal | Ringkasan Aturan | Pemetaan Data / Database | Pemetaan UI / Halaman | Fungsi Mesin & Pengujian |
|---|---|---|---|---|
| **Pasal 52** | Perubahan dicatat di Appendix E, berlaku ke depan, dilarang sepihak. | Tabel `regulations_amendments`. | Tab Amendemen di `/rules` dan `/control/amendments`. | Rekam riwayat versi regulasi. |
| **Pasal 53** | Lampiran A-E terintegrasi untuk kebutuhan operasional. | View model khusus lampiran. | Tersedia di panduan administrasi dan cetak laporan. | Format sesuai buku master regulasi. |
| **Pasal 54** | Persetujuan kedua peserta, musim selesai setelah seluruh 20 MD disahkan dan sengketa ditutup. | Status kompetisi `setup` -> `live` -> `completed`. | Status bar global di header website. | State machine musim kompetisi. |
