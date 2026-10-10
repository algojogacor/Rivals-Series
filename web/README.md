# Rivals Series Season 1 Web Application

Website resmi kompetisi eFootball Dream Team 1v1 **Rivals Series Season 1 (RS S1)**. Dibangun menggunakan Next.js (App Router), Tailwind CSS v4, TypeScript, dan Turso (LibSQL).

## Fitur Utama

1. **Official League Table (Klasemen 10 Kolom):**
   - Kolom resmi: P, W, D, L, GF, GA, GD, PTS, IDN, FORM.
   - Implementasi penuh hierarki tiebreaker Pasal 8 (Poin -> Selisih Gol -> Gol Memasukkan -> Head-to-Head -> Decider Match).
   - Indikator matematis penguncian gelar juara dini ($G_{adj} > 3 \times R$).
2. **Match Center (MD1-MD20):**
   - Penanganan khusus fase: Group Stage (MD1-10, seri diperbolehkan) vs Knockout Stage (MD11-20, wajib ada pemenang via Extra Time atau adu penalti).
   - Halaman detail setiap Matchday dengan catatan gol, kiper starter 90 menit, dan bukti tangkapan layar.
3. **Statistik Kompetisi:**
   - Rekor Golden Boot dengan penggabungan versi kartu (Pasal 41 ayat 2).
   - Rekor Golden Glove khusus kiper starter yang menyelesaikan 90 menit reguler (Pasal 42).
   - Rekor tren sportivitas dan rekor nirbobol.
4. **Pusat Kontrol Peserta (Private Control Center):**
   - Autentikasi allowlist terbatas untuk Peserta A dan Peserta B menggunakan PIN.
   - Formulir lapor hasil pertandingan dengan validasi sisi server.
   - Kotak masuk konfirmasi dua arah (Dual Confirmation, Pasal 22).
   - Manajemen skuad maksimal 26 kartu per fase dengan penguncian snapshot.
   - Generator paket sengketa AI Adjudicator (Pasal 38) dalam format Markdown terstruktur.
   - Jejak audit mutasi permanen (Pasal 50).
5. **Penghargaan Musim & Goal of the Season:**
   - Galeri nominasi gol terbaik (maksimal 2 nominasi resmi per peserta).
   - Bilik suara rahasia dengan pembobotan peringkat 4-3-2-1 dan pemecah seri suara lawan (Pasal 43).
6. **Ringkasan Regulasi Resmi:**
   - Navigasi lengkap BAB I sampai BAB XII dan format pelaporan WhatsApp.

## Variabel Lingkungan (.env.local)

Buat file `.env.local` di dalam direktori `web/` dengan variabel berikut (lihat `.env.example`):

```bash
TURSO_DATABASE_URL=libsql://rivals-series-algojogacor.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=your_turso_jwt_auth_token

# PIN autentikasi peserta (opsional, bawaan: rs2026a dan rs2026b)
PARTICIPANT_A_PIN=rs2026a
PARTICIPANT_B_PIN=rs2026b
```

## Perintah Kerja

```bash
# Menjalankan server pengembangan
pnpm dev

# Menjalankan pengujian logika murni (Vitest)
pnpm test

# Menjalankan build produksi Next.js
pnpm build

# Menjalankan migrasi database ke Turso
node scripts/migrate.mjs
```

## Arsitektur & Kepatuhan Desain

- **Midnight Tactical Theme:** Kontras tinggi terinspirasi dari sampul kompetisi resmi, latar `#0C1728` dan `#0E1A2D`, aksen merah crimson `#E53430`, dan emas trofi `#D69E2E`.
- **Anti-AI Writing:** Bebas dari tanda baca em-dash dan kata-kata klise artifisial. Seluruh salinan antarmuka menggunakan bahasa Indonesia yang lugas dan natural.
- **Detektor Impeccable:** Lolos 100% verifikasi detektor Impeccable tanpa peringatan anti-pola visual.
