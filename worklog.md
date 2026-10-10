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
