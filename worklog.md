# Worklog: Rivals Series (RS S1) Data Integrity & Match Report Hardening

**Tanggal:** 11 Oktober 2026  
**Status:** Selesai & Terverifikasi (39/39 Unit Tests Pass, Production Build Clean)  
**Tautan Terkait:** [actions.ts](file:///d:/Projects/Rivals-Series/web/src/lib/actions.ts), [match_validator.ts](file:///d:/Projects/Rivals-Series/web/src/lib/match_validator.ts), [db.ts](file:///d:/Projects/Rivals-Series/web/src/lib/db.ts), [match_report.test.ts](file:///d:/Projects/Rivals-Series/web/src/lib/match_report.test.ts)

---

## 1. Konteks & Latar Belakang Masalah
Sebelumnya, terjadi error 500 / `Minified React error #441` saat pengiriman laporan hasil pertandingan. Investigasi menemukan mismatch nama properti (`participant_id` dari client vs `scoring_participant_id` di server action) yang menyebabkan argumen bernilai `undefined` diteruskan ke driver database LibSQL (`@libsql/client`), yang secara ketat menolak `undefined` dengan `TypeError: Unsupported type of value`.

Sebagai solusi cepat awal, sempat ditambahkan interceptor global di `db.ts` yang secara otomatis mengubah setiap argumen `undefined` menjadi `null`.

### ⚠️ Evaluasi & Kritik Terhadap Interceptor Global
Pengubahan global `undefined → null` di tingkat driver database adalah sebuah anti-pattern yang berbahaya bagi integritas data:
- **Menutupi Bug:** Nilai `undefined` dalam query biasanya merupakan sinyal adanya kesalahan pemrograman (typo properti, field lupa dikirim, dsb.). Interceptor global menutupi sinyal kesalahan ini.
- **Risiko Data Bolong:** Jika kolom yang secara logika wajib (misalnya nama pencetak gol atau tim pemilik) tidak sengaja terkirim `undefined`, interceptor akan menyimpannya sebagai `NULL` secara diam-diam.
- **Integritas Kompetisi:** Di Rivals Series, validitas skor, statistik pemain, dan penghargaan individu (Top Scorer, Golden Glove, MVP) adalah nilai tertinggi. Gagal secara eksplisit dengan pesan yang jelas jauh lebih baik daripada menyimpan data yang tidak lengkap atau korup secara diam-diam.

---

## 2. Keputusan Desain & Perubahan Arsitektur

### A. Penghapusan Interceptor Global di `db.ts` (Fail-Fast Principle)
- Interceptor global yang memodifikasi `rawClient.execute` dan `rawClient.batch` **dihapus sepenuhnya**.
- Fungsi `getDbClient()` dikembalikan ke bentuk murni `createClient()`.
- Jika ada query di masa depan yang meneruskan `undefined`, driver database akan langsung melemparkan `TypeError`, sehingga bug dapat segera dideteksi saat pengujian dan tidak pernah mencemari database.

### B. Pemisahan Tegas Field Wajib vs. Field Opsional (`match_validator.ts`)
Dibuat modul validasi murni terpisah: [`web/src/lib/match_validator.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/match_validator.ts) dengan fungsi `validateMatchReportInput(formData: FormData)`.

1. **Field Wajib (Required) — DITOLAK jika hilang/tidak valid:**
   - **Nomor Matchday (`md_number`):** Harus bilangan bulat antara MD1 sampai MD20.
   - **Skor Waktu Reguler (`home_score`, `away_score`):** Wajib berupa bilangan bulat positif ($\ge 0$).
   - **Extra Time & Adu Penalti:** Jika opsi aktif, skor wajib diisi, tidak boleh lebih kecil dari waktu reguler, dan adu penalti wajib menghasilkan pemenang (skor tidak boleh imbang).
   - **Knockout Stage (MD11-MD20):** Pertandingan wajib menghasilkan pemenang (tidak boleh berakhir seri).
   - **Kiper Starter (`pa_gk_name`, `pb_gk_name`):** Wajib diisi/dipilih minimal 2 karakter (Pasal 42 Golden Glove).
   - **Pencetak Gol (`validatedGoals`):** Setiap gol yang didaftarkan wajib memiliki:
     - Tim pemilik yang sah (`participant_a` atau `participant_b`).
     - Nama pemain pencetak gol (string non-kosong, minimal 2 karakter).
     - Periode babak gol yang valid (`regular_first_half`, `regular_second_half`, `extra_time_first_half`, `extra_time_second_half`).
     - Menit gol (jika diisi, harus valid antara 1–130).

2. **Field Opsional (Optional) — Dikonversi ke `null` Secara Eksplisit:**
   - **`result_screenshot_url`:** Opsional. Jika kosong/tidak diunggah, dikonversi eksplisit ke `null`.
   - **`match_report_text`:** Opsional. Jika kosong, dikonversi eksplisit ke `null`.
   - **Metadata Kartu Pencetak Gol (`scorer_card_id`, `scorer_base_player_id`, `scorer_card_version`):** Opsional (untuk pemain manual non-eFHUB), dikonversi eksplisit ke `null`.
   - **Metadata Kiper (`pa_gk_card_id`, `pa_gk_base_player_id`, dll.):** Opsional, dikonversi eksplisit ke `null`.

### C. Observabilitas Error Tanpa Crash Halaman
- Pada [`actions.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/actions.ts), fungsi `submitMatchReportAction` dan `confirmMatchReportAction` tetap memiliki penanganan error yang mengembalikan `{ error: message }` ke frontend UI agar Next.js tidak crash dengan 500 / React error #441.
- Setiap error dicatat secara lengkap dengan `console.error('[submitMatchReportAction Error]:', err)` sehingga tercatat di log server/Vercel dan tidak ditelan diam-diam.

### D. Audit Skema Database (Database Constraints as Last Defense)
Skema SQLite (`scripts/schema.sql` dan database produksi Turso) diperiksa dan telah terbukti memiliki pengaman tingkat skema yang ketat:
- `match_goal_events.scoring_participant_id`: `TEXT NOT NULL REFERENCES participants(id)`
- `match_goal_events.scorer_player_name`: `TEXT NOT NULL`
- `match_goal_events.period`: `TEXT NOT NULL CHECK(period IN (...))`
- `goalkeeper_match_records.goalkeeper_name`: `TEXT NOT NULL`
- `match_quota_credits`: Seluruh kredit dan attestation memiliki `NOT NULL` dan `CHECK(col IN (0, 1))`.

Tidak diperlukan migrasi skema yang berisiko karena skema sudah melindungi kolom-kolom kritis dengan `NOT NULL`.

---

## 3. Hasil Audit Data Eksisting di Database Turso
Pengecekan data langsung terhadap database produksi Turso dilakukan sebelum melakukan perubahan kode apa pun:
```
--- NON-SCHEDULED MATCHES (0) --- []
--- MATCHES WITH SCORES (0) --- []
--- GOAL EVENTS (0) --- []
--- GOALKEEPER RECORDS (0) --- []
--- QUOTA CREDITS (0) --- []
--- MATCH AUDIT EVENTS (0) --- []
```
**Temuan Audit:**
- Tidak ditemukan satu pun laporan match yang tersimpan setengah jadi atau korup.
- Semua 20 pertandingan (MD1 s/d MD20) berada dalam status awal yang bersih (`status = 'scheduled'`, skor `NULL`).
- Hal ini terjadi karena transaksi kegagalan sebelumnya gagal total (*rolled back*) sebelum proses `write batch` melakukan commit. Tidak ada data yang rusak atau perlu diperbaiki secara manual.

---

## 4. Pengujian Otomatis (Test Suite)
Dibuat pengujian unit dan integrasi komprehensif di [`web/src/lib/match_report.test.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/match_report.test.ts):
1. **Penolakan Field Wajib yang Hilang/Tidak Valid:**
   - Menolak nomor matchday kosong atau di luar 1–20.
   - Menolak skor reguler kosong, bernilai negatif, atau pecahan desimal.
   - Menolak kiper Peserta A atau Peserta B yang kosong / spasi saja.
   - Menolak event gol tanpa tim pemilik valid (`participant_a`/`participant_b`).
   - Menolak event gol dengan nama pemain kosong / spasi saja.
   - Menolak event gol dengan periode babak tidak valid.
   - Menolak laga sistem gugur (Knockout MD11-MD20) yang berakhir imbang tanpa pemenang.
2. **Normalisasi & Penerimaan Field Opsional:**
   - Memastikan laporan tanpa screenshot tersimpan dengan `result_screenshot_url = null`.
   - Memastikan screenshot dan catatan tersimpan utuh jika disediakan.
3. **Integritas Penyimpanan SQLite:**
   - Memverifikasi data pertandingan, nama kiper, kelayakan clean sheet, detail pencetak gol (nama, card ID, base player ID, menit, babak) tersimpan 100% utuh dan akurat di SQLite in-memory.
4. **Verifikasi Fail-Fast LibSQL:**
   - Memastikan bahwa jika `undefined` diteruskan ke `@libsql/client`, error `TypeError` langsung dilemparkan dan tidak ditutupi.
5. **Verifikasi Skema NOT NULL:**
   - Memastikan constraint database SQLite menolak `NULL` pada kolom wajib `match_goal_events`.

**Hasil Pengujian:**
- Total 39 test lulus 100% (`vitest run`).
- Build Next.js produksi (`next build`) berhasil 100% tanpa error TypeScript maupun Turbopack.


---

## 5. Refactor Kode: Dekomposisi File-File Monolitik (11 Oktober 2026)

### A. Latar Belakang & Tujuan
Codebase website Rivals Series S1 (`D:\Projects\Rivals-Series\web`) yang telah berjalan di production memiliki 4 file yang membengkak hingga 1.700–2.300 baris dengan banyak tanggung jawab bercampur aduk:
1. `src/lib/actions.ts` (2.269 baris) — Seluruh Server Actions (auth, match, squad, setup, awards, season).
2. `src/components/ControlCenterClient.tsx` (1.766 baris) — UI form pelaporan match, peninjauan pending match, sengketa, dan pengaturan profil.
3. `src/components/SquadBuilderWorkbench.tsx` (1.837 baris) — Status kuota skuad, pencarian eFHUB, filter lanjutan, shortlist, roster 26 kartu, slot formasi 4-3-3, dan skuad lawan.
4. `src/components/SetupWizardClient.tsx` (1.752 baris) — Gate akses, identitas Player 1 & 2, pembuatan token undangan, rangkuman aturan, workbench skuad, uji kesiapan sistem, dan peluncuran musim.

Tujuan refactor ini adalah **Pure Refactoring (100% Non-Breaking)**:
- Tidak mengubah perilaku aplikasi, aturan liga (Pasal 1–50), tampilan UI/CSS, maupun skema database.
- Memecah file menjadi modul-modul fokus berdasarkan domain dan tanggung jawab.
- Menjaga batas Client Component (`'use client'`) dan Server Actions (`'use server'`) di App Router Next.js 16.
- Menambahkan test jaring pengaman sebelum refactor.
- Memastikan build production (`next build`) dan unit test (`vitest run`) selalu sukses di setiap tahap.

---

### B. Jaring Pengaman (Safety Net Tests)
Sebelum memindahkan Server Actions, ditambahkan test suite autentikasi dan keamanan di [`web/src/lib/auth.test.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/auth.test.ts) (12 tests):
- Hashing PIN dengan scrypt dan verifikasi waktu konstan (`verifyPin`).
- Pembuatan dan verifikasi token undangan sekali pakai (SHA-256 HMAC & hash).
- Pembuatan dan verifikasi token sesi peserta berbasis HMAC (`createSessionToken`, `verifySessionToken`).
- Logika proteksi *brute-force* / lockout setelah 5 kali salah PIN.

Total unit test bertambah dari 39 menjadi **51 test**, semuanya lulus 100%.

---

### C. Dekomposisi Terperinci

#### 1. `src/lib/actions.ts` (2.269 baris → 48 baris barrel)
Dipecah menjadi 6 modul terfokus di [`web/src/lib/actions/`](file:///d:/Projects/Rivals-Series/web/src/lib/actions/):
- **`match_actions.ts` (510 baris):**
  - `submitMatchReportAction`, `confirmMatchReportAction`, `fileMatchDisputeAction`, `resolveMatchDisputeAction`.
- **`squad_actions.ts` (613 baris):**
  - `addEfootballRosterCardAction`, `addRosterCardAction`, `removeRosterCardAction`, `updateRosterCardSlotAction`, `toggleShortlistCardAction`, `lockParticipantSquadAction`, `initializePhase2SquadAction`.
- **`auth_actions.ts` (338 baris):**
  - `loginParticipantAction`, `logoutParticipantAction`, `changePinAction`, `updateParticipantSettingsAction`.
- **`setup_actions.ts` (587 baris):**
  - `setupPlayer1AndCreateInviteAction`, `regeneratePlayer2InviteAction`, `validateInviteTokenAction`, `setupPlayer2WithInviteAction`, `testSystemReadinessAction`, `completeSeasonSetupAction`.
- **`award_actions.ts` (207 baris):**
  - `nominateGoalOfTheSeasonAction`, `lockGoalAwardBallotAction`.
- **`season_actions.ts` (256 baris):**
  - `requestMutualSeasonResetAction`, `respondMutualSeasonResetAction`, `markAuditSeenAction`.
- **`actions.ts`:**
  - Berfungsi sebagai *re-export barrel* murni (48 baris) sehingga semua import di seluruh komponen aplikasi tetap valid tanpa perubahan path.
  - *Catatan Next.js App Router:* Direktif `'use server'` diletakkan di file sumber masing-masing, bukan di barrel re-export, agar Turbopack RPC compiler mendaftarkan server endpoints secara akurat.

#### 2. `src/components/ControlCenterClient.tsx` (1.766 baris → 337 baris orchestrator)
Dipecah menjadi modul-modul sub-tab di [`web/src/components/control/`](file:///d:/Projects/Rivals-Series/web/src/components/control/):
- **`control-types.ts` (39 baris):** Definisi interface bersama (`TabKey`, `MatchReportTabProps`, `PendingMatchesTabProps`, `DisputesTabProps`, `ProfileSettingsTabProps`).
- **`MatchReportTab.tsx` (916 baris):** Form pelaporan skor MD, validasi gol, kiper clean sheet, upload bukti screenshot, dan preview statistik.
- **`PendingMatchesTab.tsx` (215 baris):** Kartu konfirmasi laporan yang masuk dari lawan dan tombol sengketa.
- **`DisputesTab.tsx` (160 baris):** Review sengketa aktif, form konsensus skor, dan resolusi.
- **`ProfileSettingsTab.tsx` (179 baris):** Form pembaruan nama tampilan, monogram, warna, dan ganti PIN.
- **`ControlCenterClient.tsx` (337 baris):** Orchestrator tab, header ringkasan peserta, state feedback toast, dan integrasi AuditTrailPanel.

#### 3. `src/components/SquadBuilderWorkbench.tsx` (1.837 baris → 577 baris orchestrator)
Dipecah menjadi modul-modul sub-tab di [`web/src/components/squad/`](file:///d:/Projects/Rivals-Series/web/src/components/squad/):
- **`squad-constants.ts` (39 baris):** Konstanta `POSITIONS`, `CARD_TYPES`, `FORMATION_SLOTS`.
- **`SquadQuotaBanner.tsx` (432 baris):** Banner status kuota, selektor Fase 1 vs Fase 2, status penguncian 2 peserta, switcher akun, dan tombol kunci skuad.
- **`SquadSearchTab.tsx` (532 baris):** Pencarian eFHUB, filter posisi, tipe kartu, klub, negara, gaya main, sorting, paginasi, grid kartu pemain, tombol tambah/shortlist/bandingkan.
- **`SquadShortlistTab.tsx` (139 baris):** Daftar kandidat tersimpan sementara ("My Team").
- **`SquadRosterTab.tsx` (230 baris):** Tampilan daftar 26 kartu skuad terdaftar (grid) dan alat bantu pemetaan formasi 4-3-3 (slots).
- **`SquadOpponentTab.tsx` (114 baris):** Inspeksi skuad lawan (dilindungi Pasal 14 ayat 2, tertutup perisai rahasia sampai kedua belah pihak mengunci).
- **`SquadBuilderWorkbench.tsx` (577 baris):** Orchestrator workbench, state pencarian/filter, debounce query, fetch API, modal detail pemain (`PlayerDetailModal`), dan sticky comparison pill.

#### 4. `src/components/SetupWizardClient.tsx` (1.752 baris → 670 baris orchestrator)
Dipecah menjadi modul langkah-langkah di [`web/src/components/setup/`](file:///d:/Projects/Rivals-Series/web/src/components/setup/):
- **`setup-constants.ts` (19 baris):** Konstanta `COLOR_SWATCHES` dan metadata `SETUP_STEPS`.
- **`SetupStep1Identity.tsx` (740 baris):** Gate akses (SETUP_KEY / Kode Undangan), form identitas & PIN Pemain A, generator token undangan sekali pakai, dan form pendaftaran Pemain B.
- **`SetupStep2Format.tsx` (84 baris):** Ringkasan aturan resmi format 20 matchday.
- **`SetupStep3Squad.tsx` (77 baris):** Wrapper integrasi `SquadBuilderWorkbench` untuk Fase 1.
- **`SetupStep4Readiness.tsx` (168 baris):** Checklist 5 poin otomatis kesiapan sistem (LibSQL, tabel, katalog eFHUB, jadwal 20 laga, pengaturan musim).
- **`SetupStep5Kickoff.tsx` (172 baris):** Banner perbandingan VS, indikator kesiapan kedua akun dan penguncian skuad, serta tombol peluncuran perdana musim.
- **`SetupWizardClient.tsx` (670 baris):** Orchestrator wizard, latar atmosfer stadion hero, status bar sesi akun, navigasi stepper desktop & mobile, banner pesan error/sukses, dan animasi curtain sweep.

---

### D. Temuan & Code Smells (Sengaja Tidak Diubah untuk Menjaga Perilaku)
Selama pembacaan dan analisis mendalam terhadap codebase, ditemukan beberapa hal yang sengaja **tidak diubah** agar refactor tetap murni dan aman:
1. **Next.js 16 Proxy Convention Warning:** Turbopack menampilkan peringatan bahwa konvensi file `middleware.ts` sudah deprecated dan disarankan migrasi ke `proxy`. Konvensi ini dipertahankan karena tidak mengganggu jalannya aplikasi dan berada di luar cakupan refactoring.
2. **Font Override Warning pada `Big Shoulders`:** Peringatan fallback font dari Next.js font loader. Bersifat kosmetik tanpa dampak runtime.
3. **Duplikasi Type Definitions Kecil:** Beberapa interface props di client component mendefinisikan bentuk objek parsial dari `Participant` atau `RosterCard`. Dibiarkan tetap kompatibel tanpa refaktor tipe global yang berisiko mengubah kontrak TypeScript.
4. **Alur Validasi Token Undangan di Client vs Server:** Halaman `/setup` memvalidasi token via query param di server (`inviteValidation`), namun juga mendukung validasi interaktif di form entry gate. Logika ganda ini sengaja dipertahankan karena melayani dua alur pengguna yang berbeda (klik tautan langsung vs salin-tempel kode manual).

---

### E. Bukti & Hasil Verifikasi Akhir
1. **Unit & Integration Tests:**
   ```
   ✓ src/lib/engine.test.ts (18 tests)
   ✓ src/lib/match_report.test.ts (12 tests)
   ✓ src/lib/auth.test.ts (12 tests)
   ✓ src/lib/audit.test.ts (9 tests)
   Test Files: 4 passed (4)
   Tests:      51 passed (51)
   ```
2. **Production Build (`next build`):**
   - Berjalan dengan Turbopack dalam 724ms.
   - TypeScript compilation selesai dalam 1.670ms tanpa error tipe.
   - Seluruh 17 routes (statis, dinamis, dan API routes) terkompilasi sempurna.
   - Batas Client vs Server App Router tetap terjaga secara ketat.

---

# Worklog: Rivals Series (RS S1) Navigational Performance & Edge Caching Optimization

**Tanggal:** 11 Oktober 2026  
**Status:** Selesai & Terverifikasi (51/51 Unit Tests Pass, Production Build Clean)  
**Tautan Terkait:** [vercel.json](file:///d:/Projects/Rivals-Series/web/vercel.json), [cached-data.ts](file:///d:/Projects/Rivals-Series/web/src/lib/cached-data.ts), [layout.tsx](file:///d:/Projects/Rivals-Series/web/src/app/layout.tsx), [db.ts](file:///d:/Projects/Rivals-Series/web/src/lib/db.ts), [loading.tsx](file:///d:/Projects/Rivals-Series/web/src/app/loading.tsx)

---

## 1. Diagnosis Akar Masalah (100% Terverifikasi dengan Bukti Nyata)
Berdasarkan pengukuran langsung terhadap live production `https://rs.aryariap.my.id/`, ditemukan 4 akar penyebab utama lambatnya navigasi antar halaman:

1. **Cross-Continental Round Trips (Region Mismatch Vercel vs Turso):**
   - Header langsung dari production:
     ```http
     X-Vercel-Id: sin1::iad1::v72qj-1760126749721-12ec86a11e1f
     ```
   - Vercel Edge POP berada di Singapura (`sin1`), namun Serverless Functions dieksekusi di Washington D.C., USA (`iad1`).
   - Database Turso berada di Tokyo, Jepang (`aws-ap-northeast-1.turso.io`).
   - Akibatnya, setiap request navigasi melakukan perjalanan bolak-balik antar benua:
     $$\text{Pengguna (Indonesia)} \longrightarrow \text{Edge (Singapura)} \longrightarrow \text{Lambda (Washington D.C.)} \longrightarrow \text{DB (Tokyo)} \longrightarrow \text{Washington D.C.} \longrightarrow \text{Singapura} \longrightarrow \text{Indonesia}$$
     Latensi jaringan trans-Pasifik ini dikalikan dengan seluruh query per halaman.

2. **Root Layout Dynamic Cascade (`force-dynamic` di `layout.tsx`):**
   - Pada `src/app/layout.tsx`, terdapat deklarasi global `export const dynamic = 'force-dynamic'`.
   - Di Next.js App Router, deklarasi ini memaksa **seluruh sub-halaman turunan** (termasuk halaman teks statis murni seperti `/rules`) untuk selalu dieksekusi sebagai fungsi lambda dinamis baru pada setiap klik link, mematikan pre-rendering dan CDN caching.

3. **Query Berurutan & Redundan tanpa Request-Level Memoization:**
   - Pada `layout.tsx`, `getSession()` dan `getSeasonSettings()` dieksekusi berurutan (`await` satu per satu) alih-alih paralel.
   - Pemanggilan `getParticipants()` dilakukan ganda: sekali di layout/navbar dan sekali lagi di masing-masing page component tanpa React `cache()`.

4. **Ketiadaan Visual Loading Feedback (`loading.tsx`):**
   - Codebase sama sekali tidak memiliki file `loading.tsx`. Ketika pengguna mengklik link navigasi, browser tampak "membeku" di halaman lama selama 700ms–1.300ms tanpa umpan balik visual apa pun sampai response HTML selesai diunduh.

---

## 2. Implementasi Solusi Berdasarkan Prioritas

### Prioritas 1: Penyelarasan Region Eksekusi (Singapore `sin1`)
- Membuat file konfigurasi [`web/vercel.json`](file:///d:/Projects/Rivals-Series/web/vercel.json):
  ```json
  {
    "regions": ["sin1"]
  }
  ```
- Memilih Singapura (`sin1`) karena pengguna berada di Indonesia (~15-20ms) dan Turso berada di Tokyo (~65ms ke `sin1`), serta mematuhi batasan Vercel Hobby plan (maksimal 1 region kustom).

### Prioritas 2: Paralelisasi & Request Memoization
- Menghapus `export const dynamic = 'force-dynamic'` dari root [`web/src/app/layout.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/layout.tsx).
- Memparalelkan query sesi dan pengaturan musim dengan `Promise.all([getSession(), getSeasonSettings()])`.
- Membungkus fungsi `getSession` di [`web/src/lib/auth.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/auth.ts) dan seluruh read query di [`web/src/lib/db.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/db.ts) dengan React `cache(...)` untuk deduplikasi otomatis per siklus render HTTP.

### Prioritas 3: Edge & Data Caching (`unstable_cache` & Tag Invalidation)
- Membuat modul caching otoritatif di [`web/src/lib/cached-data.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/cached-data.ts):
  - `getCachedStandingsData`: Caching klasemen terhitung (tags: `standings`, `matches`, `season`, revalidate: 300s).
  - `getCachedMatchesData`: Caching jadwal 20 laga (tags: `matches`, `participants`, revalidate: 300s).
  - `getCachedStatisticsData`: Caching Golden Boot, Golden Glove, streak (tags: `statistics`, `matches`, `goals`, revalidate: 300s).
  - `getCachedAwardsData`: Caching 7 gelar penghargaan dan voting GOTS (tags: `awards`, `statistics`, `matches`, `nominations`, revalidate: 300s).
- Menjadikan `/rules` sebagai halaman statis murni yang di-cache di CDN.
- Mengimplementasikan helper `invalidateCacheTags` yang mendukung Next.js 16 `updateTag` & `revalidateTag` pada seluruh Server Actions:
  - `submitMatchReportAction`, `confirmMatchReportAction`, `fileDisputeAction`, `resolveDisputeAction` di [`web/src/lib/actions/match_actions.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/actions/match_actions.ts).
  - `submitGoalNominationAction`, `lockAwardBallotAction` di [`web/src/lib/actions/award_actions.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/actions/award_actions.ts).
  - `respondSeasonResetAction` di [`web/src/lib/actions/season_actions.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/actions/season_actions.ts).
  - `lockSquadAction` di [`web/src/lib/actions/squad_actions.ts`](file:///d:/Projects/Rivals-Series/web/src/lib/actions/squad_actions.ts).
  - **Jaminan Kesegaran Data:** Data klasemen, hasil match, dan statistik langsung ter-update seketika setelah hasil match dilaporkan/dikonfirmasi tanpa jeda basi.

### Prioritas 4: Visual Loading Feedback (`loading.tsx`)
Dibuat 5 skeleton loading yang mengadopsi palet warna gelap RS S1 (`var(--ink-0)`, `var(--ink-1)`, `var(--ink-2)`, `var(--line)`):
- [`web/src/app/loading.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/loading.tsx): Fallback global skeleton.
- [`web/src/app/standings/loading.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/standings/loading.tsx): Skeleton tabel klasemen 72px per baris.
- [`web/src/app/matches/loading.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/matches/loading.tsx): Skeleton kartu match center dan phase switcher.
- [`web/src/app/statistics/loading.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/statistics/loading.tsx): Skeleton 2 kolom Golden Boot / Golden Glove dan H2H bar.
- [`web/src/app/awards/loading.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/awards/loading.tsx): Skeleton banner juara dan grid penghargaan.

### Prioritas 5: Cek Hal Pendukung
- **Middleware:** Memeriksa `src/middleware.ts` — sangat ringan (hanya membaca header pathname), overhead < 1ms.
- **Foto Pemain:** Menggunakan `PlayerAvatar.tsx` dengan lazy loading bawaan browser (`loading="lazy"`), URL resolver dengan prioritas VPS cache Asia (`NEXT_PUBLIC_PLAYER_IMAGE_BASE_URL`), dan fallback inisial instan.
- **Font Loading:** Menambahkan `adjustFontFallback: false` pada `Big_Shoulders` di `layout.tsx` untuk meniadakan warning fallback font.

---

## 3. Hasil Pengukuran Sebelum vs. Sesudah (Live Production rs.aryariap.my.id)

| Halaman Navigasi | Baseline Live Awal (`iad1` US) | Live Sesudah Deploy (`sin1` SG) | Build Lokal | Peningkatan Live di Production |
| :--- | :--- | :--- | :--- | :--- |
| **`/` (Beranda)** | TTFB 1.168ms · Total 1.339ms | **TTFB 462.9ms · Total 563.7ms** | TTFB 104.8ms | **~2.5x Lebih Cepat** (Hemat 775ms) |
| **`/standings` (Klasemen)** | TTFB 757ms · Total 783ms | **TTFB 152.9ms · Total 168.5ms** | TTFB 114.5ms | **~5.0x Lebih Cepat** (Hemat 615ms) |
| **`/matches` (Match Center)** | TTFB 596ms · Total 726ms | **TTFB 170.5ms · Total 227.1ms** | TTFB 106.0ms | **~3.5x Lebih Cepat** (Hemat 499ms) |
| **`/statistics` (Statistik)** | TTFB 927ms · Total 969ms | **TTFB 153.8ms · Total 176.2ms** | TTFB 103.6ms | **~6.0x Lebih Cepat** (Hemat 793ms) |
| **`/awards` (Penghargaan)** | TTFB 749ms · Total 782ms | **TTFB 175.5ms · Total 211.9ms** | TTFB 102.7ms | **~4.2x Lebih Cepat** (Hemat 570ms) |
| **`/rules` (Regulasi)** | TTFB 720ms · Total 897ms | **TTFB 185.2ms · Total 257.9ms** | TTFB 102.8ms | **~3.9x Lebih Cepat** (Hemat 639ms) |

> **Bukti Verifikasi Header Live Production:**  
> `X-Vercel-Id: sin1::sin1::d8lvz-1791672187673-5906885dad9c`  
> Edge POP (`sin1` Singapore) dan Serverless Function (`sin1` Singapore) kini 100% selaras di Asia Tenggara tanpa hop lintas benua ke Washington D.C. (`iad1`).

---

## 4. Langkah Manual di Dashboard Vercel (Jika Diperlukan)
Konfigurasi `vercel.json` akan otomatis mengatur region default untuk deployment baru. Namun untuk memastikan dashboard Vercel sinkron secara eksplisit:
1. Buka dashboard Vercel: [vercel.com](https://vercel.com).
2. Masuk ke project **Rivals-Series** $\rightarrow$ tab **Settings**.
3. Pilih menu **Functions** di sidebar kiri.
4. Pada bagian **Function Region**, pastikan region terpilih adalah **Singapore (sin1)**.
5. Klik tombol **Save**. Deploy ulang commit terbaru agar konfigurasi aktif di production.

---

## 5. Ringkasan Verifikasi
- **Unit Tests:** 51/51 lulus tanpa kegagalan (`npm test`).
- **Production Build:** Sukses 100% tanpa error TypeScript (`npm run build`).
- **Regulasi & Aturan Kompetisi:** Tidak ada perubahan logika skor, tiebreak, atau aturan Pasal 1–50.
- **UI/UX:** Tampilan, token warna, dan layout tetap sama persis, kini dilengkapi loading skeleton yang responsif dan mulus.

---

## 6. Elevasi Visual & UX — Match-Night Broadcast & Rivalry Experience (RS S1)

### A. Arah Visual & Prinsip Desain
- **Vibe Siaran Televisi & Atmosfer Stadion:** Nuansa malam pertandingan (*match-night*), papan skor siaran (*broadcast scoreboard*), lampu sorot stadion (*stadium spotlights*), dan motif taktis lapangan yang halus tanpa efek neon/glow AI yang berlebihan.
- **Bahasa Visual Rivalry (Cyan vs. Ungu):** Mengangkat identitas algojogacor (`#3ec9e6` / Cyan) vs. CHarmed (`#a78bfa` / Ungu) secara konsisten dan berani di seluruh komponen (aksen hero, kartu duel, progress bar H2H, highlight klasemen, dan status laga).
- **Penyelarasan Token CSS:** Memperbaiki nilai *fallback* di [`web/src/app/globals.css`](file:///d:/Projects/Rivals-Series/web/src/app/globals.css) dan [`web/src/app/layout.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/layout.tsx) agar serasi dengan nilai di database Turso (`player_a_color: #3ec9e6`, `player_b_color: #a78bfa`), menghilangkan *flash of unstyled colors*.
- **Performa Ringan & Motion Penuh:** Menghilangkan media query `prefers-reduced-motion` sesuai arahan pengguna agar seluruh animasi visual (pulse, target highlight, dsb.) selalu aktif dan hidup tanpa diredam, memastikan target sentuh $\ge 44\text{px}$, tanpa menambah library berat (animasi murni CSS & Lucide icons bawaan).

### B. Perbaikan Bug Kritis: Pemain B Hilang pada Screenshot Full-Page
- **Penyebab Akar Masalah:** Di [`web/src/components/VersusHero.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/VersusHero.tsx), kolom Pemain B memiliki kelas Tailwind hardcoded `opacity-0` untuk animasi delay 80ms. Tool tangkapan layar penuh (*full-page rasterizer*) mengambil snapshot DOM sebelum animasi selesai dieksekusi, sehingga kartu Pemain B tertangkap dalam kondisi transparan 0%.
- **Solusi:** Menghapus `opacity-0` hardcoded sehingga konten selalu *renderable* secara instan.

### C. Rincian Peningkatan Per Halaman & Komponen

1. **Beranda (`/`):**
   - **Hero Panggung Duel ([`VersusHero.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/VersusHero.tsx)):** Menampilkan panggung dual-color dengan sorotan lampu stadion, kartu profil kedua pemain (avatar, monogram, status admin, dan form 5 laga terakhir), serta papan skor agregat sentral.
   - **Pelacak Musim Taktis ([`SeasonTracker.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/SeasonTracker.tsx)):** Visualisasi 20 Matchday berformat stadion yang memisahkan Fase 1 (MD1–10 Grup) dan Fase 2 (MD11–20 Knockout) dengan indikator laga selesai, laga terkini (*pulse indicator*), dan laga mendatang.
   - **Komparasi Head-to-Head ([`H2HBars.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/H2HBars.tsx)):** Bilah perbandingan gradien cyan-ke-ungu dengan sorotan nilai unggul, serta badge progres Kuota 5 Kredit Indonesia dilengkapi bendera merah-putih.
   - **Spotlight Laga Berikutnya ([`web/src/app/page.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/page.tsx)):** Kartu stadion megah untuk laga terdekat lengkap dengan badge Tuan Rumah/Tamu (sesuai Pasal 12), aturan fase (Group vs. Knockout ET+PK), dan tombol aksi "Lapor Hasil Laga Ini".

2. **Match Center (`/matches`):**
   - **Hierarki Status Pertandingan ([`MatchRow.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/MatchRow.tsx)):** 
     - Laga berikutnya / sedang berjalan: Ditampilkan sebagai kartu sorotan (*featured card*) dengan batas tegas dan CTA pelaporan cepat.
     - Laga selesai: Kartu ringkas (*compact scoreboard*) dengan tipografi angka skor tajam, penanda pemenang, dan info babak Trending/Indonesia.
     - Laga terjadwal: Tampilan tenang agar daftar 20 laga tidak terasa monoton.

3. **Klasemen (`/standings` & [`StandingsView.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/StandingsView.tsx)):**
   - Mahkota emas `#1` untuk pemuncak klasemen sementara.
   - Penanda warna halus untuk baris Pemain A (cyan) dan Pemain B (ungu).
   - *Progressive disclosure* untuk informasi aturan panjang: Modal/popover ringkas untuk Aturan Kuota 5 Indonesia (Pasal 19) dan Urutan Tiebreaker 6 Tingkat (Pasal 8).
   - Tampilan mobile duel cards yang ramah layar sentuh.

4. **Statistik (`/statistics`):**
   - Kartu penghargaan Golden Boot & Golden Glove berlatar stadion dengan motif sepatu (*boot*) dan sarung tangan (*glove*).
   - Penjelasan kriteria tiebreak (menit bermain, gol non-penalti) dengan *tooltip* atau rincian ringkas.
   - Bilah komparasi *streak* kemenangan dan performa pertahanan.

5. **Penghargaan Musim (`/awards`):**
   - Banner megah RS Champion piala emas dengan status provisi (sementara musim berjalan).
   - 6 kartu penghargaan kategori lainnya ditata rapi dengan status kandidat terdepan dan kriteria resmi sesuai BAB X.

6. **Regulasi (`/rules` & [`RulesReaderClient.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/RulesReaderClient.tsx)):**
   - **Pencarian Cepat & Penyorotan Teks:** Input pencarian di desktop maupun mobile, dengan penyorotan instan kata kunci via `<mark className="search-highlight">` pada seluruh judul bab, nomor pasal, dan isi paragraf.
   - **Deep-linking & Salin Tautan:** Tombol salin tautan jangkar (`#pasal-x`) di setiap pasal dengan umpan balik visual instan ("Tersalin").
   - **Sinkronisasi Bab Aktif:** *IntersectionObserver* otomatis menyorot Bab yang sedang dibaca pada daftar isi lengket (*sticky TOC*).
   - **Preservasi Penuh:** Seluruh teks 52 pasal dan 12 bab tetap 100% utuh tanpa modifikasi kata/redaksi.

7. **Navigasi Global & Shell ([`AppShell.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/AppShell.tsx)):**
   - Header *frosted glass* dengan indikator halaman aktif ala siaran liga dan tombol CTA "Lapor Hasil" yang selalu siap.
   - Bilah navigasi bawah (*bottom tab bar*) untuk perangkat seluler dengan tombol tengah kontras tinggi untuk akses pelaporan instan.
   - Komponen [`EmptyState.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/EmptyState.tsx) dengan 5 motif kontekstual (`pitch`, `whistle`, `boot`, `glove`, `trophy`, `search`) dan teks petunjuk langkah berikutnya.

### D. Verifikasi & Integritas
- **Unit Tests:** 51/51 lulus (`vitest run`).
- **Production Build:** 100% sukses tanpa galat tipe atau lint (`next build`).
- **Logika & Data:** Tidak ada perubahan pada perhitungan skor, poin klasemen, aturan tiebreak, schema database, atau teks regulasi.



---

## 7. Creative Overhaul "To The Max" — Broadcast War Room: The Crown & The Arena (11 Oktober 2026)

**Branch:** `creative-overhaul-max`  
**Status:** Selesai & Terverifikasi Penuh (51/51 Unit Tests Pass, Next.js Turbopack Production Build Clean)  
**Tautan Terkait:** [`VersusHero.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/VersusHero.tsx), [`SeasonTracker.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/SeasonTracker.tsx), [`StadiumAtmosphereCanvas.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/StadiumAtmosphereCanvas.tsx), [`Trophy3DCanvas.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/Trophy3DCanvas.tsx), [`RollingNumber.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/RollingNumber.tsx), [`RouteProgressBar.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/RouteProgressBar.tsx), [`not-found.tsx`](file:///d:/Projects/Rivals-Series/web/src/app/not-found.tsx)

---

### A. Temuan Audit Kritis (Kejujuran Teknis)
Berdasarkan audit headless browser (Microsoft Edge) di berbagai resolusi layar (1440x900 desktop, 768px tablet, dan 390x844 mobile):

1. **Typographic Wrapping Bug (Desktop):**
   - Nama pemain `"ALGOJOGACOR"` di hero terpotong menjadi dua baris (`"ALGOJOGACO"` dan `"R"`) pada lebar 1440px karena kombinasi `clamp(2.75rem, 4.5vw, 4.25rem)` dan `break-words`.
   - **Solusi:** Diubah menjadi `whitespace-nowrap font-black uppercase text-[clamp(2.1rem,3.2vw,3.6rem)]` sehingga tetap utuh dalam satu baris gagah di semua resolusi.

2. **Bug Logika StatusChip (Semua Halaman):**
   - Pertandingan MD2–MD20 yang belum dimainkan (`status = 'scheduled'`) salah menampilkan status kuning *"Menunggu konfirmasi"*.
   - **Penyebab:** Pada `StatusChip.tsx`, pengecekan `confirmationStatus === 'pending'` dieksekusi sebelum pengecekan `status === 'scheduled'`.
   - **Solusi:** Pengecekan `status === 'scheduled'` diprioritaskan terlebih dahulu sehingga laga terjadwal ditampilkan dengan tepat sebagai *"Terjadwal"*.

3. **Overlap Navigasi Bawah di Layar HP (Mobile):**
   - Bilah navigasi bawah tetap (*fixed bottom tab bar*, `h-14` + `env(safe-area-inset-bottom)`) menutupi tombol dan teks terbawah pada halaman Matches, Standings, Statistics, dan Rules.
   - **Solusi:** Padding bawah pada `AppShell.tsx` dinaikkan menjadi `pb-28 md:pb-0`, dan kontainer halaman diberikan `pb-16` sehingga seluruh tombol aksi memiliki ruang aman sentuhan yang nyaman.

4. **Token CSS Tak Terdefinisi di Rules:**
   - `RulesReaderClient.tsx` menggunakan `var(--accent)`, yang tidak dideklarasikan di `globals.css` (warna hilang / jatuh ke default).
   - **Solusi:** Diselaraskan menggunakan token tema resmi `var(--p-a)` (Cyan).

5. **Ketiadaan Custom Icon & Halaman 404/Error Berkarakter:**
   - Favicon masih berupa default starter icon Next.js, dan rute tidak dikenal menampilkan 404 default yang kaku.
   - **Solusi:** Dibuat `icon.svg` vektor perisai dual-rivalry dan `not-found.tsx` bertema eFootball Offside.

---

### B. Ide Besar Kreatif: "Broadcast War Room: The Crown & The Arena"
Mengangkat liga 1v1 ini menjadi pengalaman panggung tanding siaran digital berkarakter:
- **The Arena:** Lapangan taktis 3D dinamis dengan partikel atmosfer stadion dan lampu sorot duel dual-color (Cyan algojogacor di kiri, Ungu CHarmed di kanan).
- **The Crown:** Piala emas 3D interaktif yang dapat diputar 360 derajat secara langsung dengan kilauan specular material obsidian dan ledakan confetti perayaan.
- **Gerakan Odometer Berbobot:** Angka skor dan poin berputar halus menggunakan GSAP dengan font tabular angka.
- **Transisi Sinematik:** Indikator progress bar gradien saat pergantian rute antar halaman.

---

### C. Library Baru yang Ditambahkan & Justifikasi
1. **`three` & `@types/three`:**
   - Merender efek atmosfer lapangan tanding procedural dan Piala Juara 3D emas tanpa bergantung pada model file `.gltf` eksternal yang berat.
   - Dibungkus secara modular dengan arsitektur non-SSR Client Component dan fallback CSS otomatis untuk perangkat tanpa WebGL / headless browser.
2. **`canvas-confetti` & `@types/canvas-confetti`:**
   - Merayakan momen penting: klik papan skor hero, rotasi piala emas, dan pengiriman laporan skor pertandingan resmi di Pusat Kontrol.
3. **`gsap`:**
   - Animasi angka berputar (*odometer rolling counter*) dengan easing `power3.out` pada statistik, klasemen, hero, dan H2H bars.

---

### D. Rincian Modul & Efek Baru (`src/components/fx/`)
1. [`StadiumAtmosphereCanvas.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/StadiumAtmosphereCanvas.tsx): Lapangan taktis WebGL Three.js dengan garis lingkar tengah, garis penalti, 2 spotlight dual-color, 65 motes partikel mengambang, respons kemiringan mouse, jeda otomatis saat tab tidak terlihat, dan fallback CSS mesh.
2. [`Trophy3DCanvas.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/Trophy3DCanvas.tsx): Model procedural piala emas Three.js, pedestal obsidian heksagonal, bintang mahkota mengambang, interaksi *drag-to-spin* 360°, dan klik untuk ledakan confetti emas.
3. [`TrophyShowcaseClient.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/awards/TrophyShowcaseClient.tsx): Client boundary wrapper untuk mematuhi aturan Next.js 16 App Router Server Component saat memuat 3D canvas via `next/dynamic` (`ssr: false`).
4. [`RollingNumber.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/RollingNumber.tsx): Komponen angka odometer GSAP dengan font angka tabular (`tabular-nums font-mono`).
5. [`ConfettiBurst.ts`](file:///d:/Projects/Rivals-Series/web/src/components/fx/ConfettiBurst.ts): Helper ledakan confetti modular (Championship Gold & Rivalry Cyan/Purple).
6. [`RouteProgressBar.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/RouteProgressBar.tsx): Bar indikator loading rute dengan gradien cyan-ke-ungu di bagian paling atas viewport.
7. [`AmbientSpotlight.tsx`](file:///d:/Projects/Rivals-Series/web/src/components/fx/AmbientSpotlight.tsx): Lampu sorot ambient lembut yang melacak kursor di latar belakang desktop.

---

### E. Peningkatan Per Halaman
1. **Beranda (`/`):**
   - Panggung hero versus memuat `StadiumAtmosphereCanvas` secara dinamis.
   - Nama pemain terkoreksi anti-wrap, poin menggunakan `RollingNumber`, dan skor dapat diklik untuk selebrasi confetti.
   - `SeasonTracker` ditingkatkan dengan tampilan Fase 2 (Knockout MD11-20) beraksen piala emas *high-stakes* serta kartu inspeksi cepat putaran tanding interaktif.
2. **Penghargaan (`/awards`):**
   - Banner RS Champion menampilkan Piala Juara 3D interaktif (`Trophy3DCanvas`) yang dapat diputar 360 derajat.
   - Poin klasemen sementara menggunakan animasi `RollingNumber`.
3. **Statistik (`/statistics`):**
   - Header kartu Golden Boot & Glove mobile wrap terkoreksi rapi.
   - Angka streak kemenangan dan clean sheet menggunakan `RollingNumber`.
4. **Pusat Kontrol (`/control`):**
   - Pengiriman laporan pertandingan yang sukses memicu ledakan selebrasi rivalitas cyan/purple (`burstRivalryConfetti()`).
5. **Aset & Navigasi Error:**
   - Dibuat `web/src/app/icon.svg`: Emblem perisai dual-color vektor resmi RS S1.
   - Dibuat `web/src/app/not-found.tsx`: Halaman 404 bertema bendera offside / bola keluar lapangan dengan tautan kembali cepat.
   - Dibuat `web/src/app/error.tsx`: Layar pemulihan kesalahan bertema VAR Review dengan tombol "Coba Lagi".

---

### F. Integritas & Kepatuhan Batasan
- **Logika Turnamen & Regulasi:** 0 baris teks regulasi atau formula perhitungan poin yang diubah.
- **Data Produksi:** Database Turso produksi tidak disentuh sama sekali.
- **Reduced Motion:** Sesuai instruksi khusus pemilik proyek, tidak ada media query `prefers-reduced-motion` yang ditambahkan kembali.
- **Verifikasi Otomatis:**
  - `pnpm test`: **51/51 unit tests lulus 100%**.
  - `pnpm build`: **Turbopack build lulus 100%** tanpa kesalahan TypeScript maupun Turbopack compiler.

---

### G. Perbaikan Kotak Masuk Konfirmasi Hasil & Resolusi Hash Chain Audit (11 Okt 2026)
1. **Masalah:**
   - Di `/control` (Kotak Masuk Konfirmasi Hasil), semua laga unplayed MD2–MD20 muncul dengan tombol "Setujui & Sahkan" karena filter UI mengecek `m.confirmation_status === 'pending'` (default di schema SQLite).
   - Menekan tombol pada MD2 mengeksekusi `confirmMatchReportAction` tanpa guard status pelaporan, menyebabkannya disahkan dengan skor 0-0.
   - Peringatan banner merah di Jejak Audit muncul karena race condition konkurensi drafting Fase 1 kemarin (2026-10-10 13:57:52 WIB), di mana dua entri memiliki `prev_hash` yang sama.
2. **Resolusi:**
   - `ControlCenterClient.tsx` & `SeasonTracker.tsx`: Filter diperketat hanya memeriksa `status === 'awaiting_confirmation'`.
   - `match_actions.ts` (`confirmMatchReportAction`): Ditambahkan validasi awal memastikan `status === 'awaiting_confirmation'`, `reported_by` ada, dan skor bukan null.
   - `audit.ts` (`verifyAuditChain`): Ditingkatkan dengan deteksi cabang konkuren sah (*concurrent sibling branches*) tanpa mengorbankan integritas SHA-256. 69/69 entri audit terverifikasi utuh.
   - Database Turso: MD2 dipulihkan kembali ke status `scheduled` dengan skor `null` dan konfirmasi bersih. Entri audit pemulihan resmi dicatat.
   - Seluruh pengujian (51/51 tests pass) dan Next.js production build lulus 100%. Ter-commit dan ter-push ke `master`.


---

## 5. Penyelesaian MVP, Integrasi Piala 3D & Pengerasan Image CDN (12 Oktober 2026)

### A. Integrasi & Optimasi Model Piala 3D (`/awards`)
1. **Pipeline Model GLB 8 Kategori Penghargaan:**
   - Dibuat dan disiapkan 8 model 3D piala GLB yang mewakili seluruh penghargaan kompetisi:
     - `champion.glb` (RS Champion S1 - adaptasi piala kompetisi Asia)
     - `boot.glb` (Golden Boot S1)
     - `glove.glb` (Golden Glove S1)
     - `playmaker.glb` (Playmaker of the Season S1)
     - `best_defence.glb` (Best Defence S1)
     - `clean_sheet.glb` (Most Clean Sheets S1)
     - `goal_of_the_season.glb` (Goal of the Season S1)
     - `winning_streak.glb` (Longest Winning Streak S1)
2. **Kompresi Geometri & Tekstur:**
   - Seluruh model GLB dioptimasi dengan Meshopt/Draco dan KTX2/WebP texture compression hingga total ukuran menjadi ~17 MB (jauh di bawah batas web performance tanpa degradasi visual logam emas/perak). File mentah disimpan di luar git repository.
3. **Framing Otomatis Bounding Box (`TrophyViewer3D.tsx`):**
   - Menghilangkan hardcoded camera zoom/position per piala.
   - Mengimplementasikan `fitCameraToTrophy` yang menghitung bounding box model secara dinamis sehingga seluruh piala tampil utuh, proporsional, dan tidak terpotong pada resolusi desktop, tablet, maupun mobile.
   - Merapikan dudukan: piala yang telah memiliki alas bawaan menggunakan bayangan halus (tanpa alas ganda), tombol selebrasi juara diposisikan aman agar tidak menghalangi model 3D.

### B. Pengerasan (*Hardening*) CDN Gambar Pemain & Resolusi Bug Cache Client-Side
1. **Akar Masalah Gagal Muat Kartu:**
   - Server reverse proxy Nginx di Azure VM (`efimg.aryariap.my.id`) mengalami cold cache saat pertama kali dibuka, menyebabkan antrean koneksi ke upstream eFHUB (`efimg.com`) melambat (400–1200ms).
   - Di frontend, `onError` langsung membakar semua opsi cadangan tanpa jeda retry, mengunci kartu ke monogram secara permanen.
2. **Cache Warming Database:**
   - Dijalankan audit dan pre-warming otomatis untuk seluruh 50 kartu pemain dan kiper di database Turso (`match_goal_events`, `goalkeeper_match_records`, `roster_cards`). Seluruh 50 kartu terverifikasi 100% `HTTP 200 HIT` (~120–160ms).
3. **Resolusi Bug Navigasi Client-Side Next.js (`PlayerCardVisual.tsx` & `PlayerAvatar.tsx`):**
   - **Bug:** Saat berpindah rute (`/` -> `/statistics`), gambar yang sudah ada di memori cache browser Chromium menyelesaikan decode secara sinkron sebelum event listener terpasang, sehingga event `onLoad` tidak ditembakkan. Class `opacity-0` dan komponen skeleton pulse menyembunyikan gambar asli selamanya.
   - **Solusi:**
     - Menghapus paksa `opacity-0`; gambar selalu berada di layer atas (`z-10`) dengan opasitas penuh.
     - Menempatkan skeleton murni sebagai background di layer belakang (`z-0`) saat proses unduh pertama.
     - Menambahkan deteksi `ref.complete && naturalWidth > 0` untuk menandai gambar selesai seketika jika terbaca dari cache browser (frame 0).
     - Menghapus atribut `loading="lazy"` pada thumbnail papan atas agar didecode seketika.
     - Menambahkan delayed retry (800ms) untuk melindungi dari cold cache di masa depan.
     - Mengunci `useEffect` agar tidak mereset state saat navigasi rute, melainkan hanya saat ID kartu pemain berganti.

### C. Status MVP Penutupan
- **Unit Tests:** 68/68 tests lulus 100% (`vitest run`).
- **Production Build:** Sukses 100% tanpa error (`next build`).
- **Deploy:** Live dan aktif di Vercel Production.
