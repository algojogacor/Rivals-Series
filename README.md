# Rivals Series Season 1 (RS S1)

Repositori resmi untuk kompetisi eFootball Dream Team 1v1 independen **Rivals Series Season 1 (RS S1)**. Repositori ini mencakup naskah regulasi kanonikal (`rules.md`), buku regulasi resmi (`RS_S1_Official_Regulations_Redesigned.pdf`), aset identitas visual, serta website resmi berbasis Next.js dan Turso (LibSQL).

## Struktur Repositori

```text
Rivals-Series/
├── rules.md                              # Sumber regulasi kanonikal (BAB I hingga BAB XII)
├── RS_S1_Official_Regulations_Redesigned.pdf  # Buku regulasi resmi (A4, tata letak editorial)
├── RS_S1_Official_Regulations_Redesigned.docx # Sumber dokumen buku regulasi
├── cover_extracted.png                   # Aset identitas sampul resmi
├── docs/
│   ├── ADMIN_GUIDE.md                    # Panduan operasional peserta & pelaporan pertandingan
│   ├── DATA_AND_RULES.md                 # Formula klasemen, mesin status, dan prinsip audit
│   ├── DESIGN_QA.md                      # Audit desain Hallmark & verifikasi Impeccable
│   ├── DECISION_LOG.md                   # Rekognisi dan log keputusan arsitektur
│   └── RULES_MAPPING.md                  # Pemetaan 54 pasal ke kode, antarmuka, dan pengujian
└── web/                                  # Aplikasi web resmi RS S1 (Next.js 16 + Turso)
    ├── src/                              # Komponen antarmuka, rute halaman, dan mesin logika
    ├── scripts/                          # Skrip skema database, migrasi, dan seed
    └── package.json
```

## Memulai Aplikasi Web

Aplikasi web berada di direktori `web/` dan terhubung langsung ke database live Turso (LibSQL).

### Kebutuhan Sistem
- Node.js versi 18+ (direkomendasikan v20+)
- pnpm versi 9+

### Instalasi dan Menjalankan Lokal

```bash
cd web
pnpm install
pnpm dev
```

Buka peramban di [http://localhost:3000](http://localhost:3000) untuk mengakses dasbor kompetisi.

### Menjalankan Pengujian Logika Regulasi

Seluruh 15 formula regulasi (sistem poin, klasemen 10 kolom, tiebreaker Pasal 8, penguncian gelar dini, kredit kuota Indonesia, Golden Boot version merging, dan Golden Glove) diuji secara otomatis:

```bash
cd web
pnpm test
```

### Membangun Versi Produksi

```bash
cd web
pnpm build
```

## Integritas Dokumen & Database

- **Dokumen Regulasi:** Dokumen `rules.md` dan `RS_S1_Official_Regulations_Redesigned.pdf` bersifat kanonikal dan terlindungi dari perubahan sepihak.
- **Database Live:** Database dikelola di Turso LibSQL dengan konfigurasi rahasia di `web/.env.local` (dilindungi oleh `.gitignore`).
- **Audit Trail:** Setiap mutasi skor, status pertandingan, dan sengketa dicatat secara permanen pada tabel `audit_events` (Pasal 50 & 51).
