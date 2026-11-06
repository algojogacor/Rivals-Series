# Spesifikasi Desain: Batal Kunci Mandiri & Permohonan Buka Kunci Skuad (RS S1)

**Tanggal:** 6 November 2026  
**Status:** Disetujui Pengguna (*Approved*)  
**Topik:** Fitur Batal Kunci Mandiri (*Self-Unlock*) dan Permohonan Buka Kunci Bersama (*Mutual Squad Unlock Request*) pada Fase 1 & Fase 2 Rivals Series.

---

## 1. Latar Belakang & Masalah
Pada regulasi Rivals Series Season 1, skuad resmi peserta (maksimal 26 kartu) dikunci sebelum putaran tanding dimulai:
- **Fase 1 (MD1–MD10):** Dikunci sebelum Kickoff MD1.
- **Fase 2 (MD11–MD20):** Dikunci pada jeda tengah musim sebelum Kickoff MD11.

Sebelumnya, aksi penguncian skuad (`lockParticipantSquadAction`) bersifat satu arah (*one-way irreversible via UI*). Begitu pemain mengklik "Kunci Skuad Saya", sistem langsung mengunci dan menutup akses edit tanpa ada opsi koreksi jika terjadi salah pilih kartu atau kesalahan penempatan pemain, sekalipun pertandingan belum dimulai.

Dokumen ini mendefinisikan implementasi dua mekanisme pembatalan kunci yang seimbang: tetap menjaga asas kerahasiaan draf (*secret draft*), mencegah kecurangan intip-kartu (*counter-pick*), dan memberikan fleksibilitas koreksi antar pemain.

---

## 2. Definisi Fitur & Aturan Bisnis

### A. Fitur 1: Batal Kunci Mandiri (*Self-Unlock*)
Fitur ini digunakan ketika seorang pemain telah mengunci skuadnya, namun pemain lawan **belum mengunci**.

* **Kondisi Valid:**
  1. Pemain yang sedang masuk (*logged-in*) berstatus terkunci pada fase yang dipilih (`pa_locked = 1` atau `pb_locked = 1`).
  2. Pemain lawan **BELUM** mengunci (`pb_locked = 0` untuk lawan PA, atau `pa_locked = 0` untuk lawan PB).
  3. Dengan demikian, status penguncian bersama `both_locked` masih `false`, sehingga daftar kartu rahasia kedua belah pihak belum pernah saling terbuka.
  4. Pertandingan pembuka fase tersebut belum berjalan:
     - Untuk Fase 1: MD1 masih berstatus `scheduled`.
     - Untuk Fase 2: MD11 masih berstatus `scheduled`.
* **Aksi & Dampak:**
  - Pengguna mengklik tombol *"Batal Kunci"* di banner kuota skuad.
  - Sistem mengembalikan status kunci pemain menjadi `0` (`pa_locked = 0` atau `pb_locked = 0`).
  - Pemain dapat langsung menambah, membuang, atau menukar kartu di workbench.
  - Aksi dicatat ke audit trail: `category: 'squad'`, `action: 'unlock_participant_squad'`.

---

### B. Fitur 2: Permohonan Buka Kunci Skuad Bersama (*Mutual Squad Unlock Request*)
Fitur ini digunakan ketika **kedua belah pihak sudah sama-sama mengunci skuad** (`both_locked = true`), di mana 26 kartu kedua tim sudah saling terbuka (*revealed*), namun pertandingan pembuka fase belum dimulai.

* **Kondisi Valid:**
  1. Kedua pemain sudah mengunci (`both_locked = true` / `is_locked = 1` pada fase tersebut).
  2. Pertandingan pembuka fase belum dimainkan/dilaporkan:
     - Untuk Fase 1: MD1 masih berstatus `scheduled`.
     - Untuk Fase 2: MD11 masih berstatus `scheduled`.
  3. Belum ada permohonan buka kunci berstatus `pending_approval` yang sedang aktif untuk fase tersebut.
* **Integritas Batas Waktu:**
  - Begitu pertandingan pembuka fase (MD1 atau MD11) sudah berstatus selain `scheduled` (misal `awaiting_confirmation`, `confirmed`, `forfeited`), fitur ini dinonaktifkan permanen secara otomatis di level server dan client.

#### Alur Pengajuan (*Proposer Flow*):
1. Pemain membuka Workbench Skuad pada fase yang terkunci.
2. Tampil tombol `[Ajukan Buka Kunci Skuad]`.
3. Modal dialog meminta pemain mengisikan alasan pengajuan (wajib, misal: *"Salah pilih versi kartu Haaland, ingin diganti"*).
4. Server membuat baris permohonan baru di tabel `squad_unlock_requests` dengan status `pending_approval`.
5. Tampil status tunggu di antarmuka pemohon dengan opsi `[Batalkan Permohonan]`.

#### Alur Persetujuan Lawan (*Responder Flow*):
1. Di Pusat Kontrol (`/control`), lawan menerima notifikasi berupa badge di menu navigasi tab **"Konfirmasi"** serta kartu permohonan khusus di tab Konfirmasi dan di banner Workbench Skuad.
2. Kartu menampilkan: identitas pemohon, fase skuad, alasan pengajuan, dan waktu pengajuan.
3. Lawan dapat memilih:
   - **Setujui (`approve`):**
     - Status permohonan diupdate menjadi `approved`.
     - Tabel `roster_phases` untuk fase terkait direset: `is_locked = 0, pa_locked = 0, pb_locked = 0, locked_at = NULL, locked_by = NULL`.
     - Kedua peserta kembali ke mode draf (dapat mengedit skuad lagi).
     - Pertandingan pembuka fase otomatis terproteksi kembali (form laporan MD1/MD11 tidak bisa di-submit sampai kedua pemain mengunci ulang skuadnya masing-masing).
     - Dicatat ke audit trail: `action: 'approve_squad_unlock'`.
   - **Tolak (`reject`):**
     - Status permohonan diupdate menjadi `rejected` beserta alasan penolakan.
     - Skuad tetap dalam status terkunci.
     - Dicatat ke audit trail: `action: 'reject_squad_unlock'`.

---

## 3. Desain Teknis & Skema Database

### A. Tabel Database Baru (`squad_unlock_requests`)
```sql
CREATE TABLE IF NOT EXISTS squad_unlock_requests (
  id TEXT PRIMARY KEY,
  phase INTEGER NOT NULL,
  requested_by TEXT NOT NULL REFERENCES participants(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending_approval', 'approved', 'rejected', 'cancelled')),
  responded_by TEXT REFERENCES participants(id),
  responded_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_squad_unlock_requests_phase_status 
ON squad_unlock_requests(phase, status);
```

### B. Server Actions (`web/src/lib/actions/squad_actions.ts`)
1. `unlockParticipantSquadAction(phase: number)`:
   - Pembatalan kunci mandiri saat lawan belum lock.
2. `requestSquadUnlockAction(formData: FormData)`:
   - Mengajukan permohonan buka kunci bersama ke lawan.
3. `respondSquadUnlockAction(params: { requestId: string; approved: boolean; rejectionReason?: string })`:
   - Menerima atau menolak permohonan buka kunci.
4. `cancelSquadUnlockAction(requestId: string)`:
   - Membatalkan permohonan buka kunci oleh pemohon.

### C. Komponen Antarmuka Pengguna
1. `web/src/components/squad/SquadQuotaBanner.tsx`:
   - Tombol "Batal Kunci" mandiri saat `myLocked && !bothLocked`.
   - Tombol "Ajukan Buka Kunci Skuad" saat `bothLocked && openingMatchScheduled`.
   - Banner status permohonan aktif (pending) beserta aksi setujui/tolak/batal.
2. `web/src/components/control/PendingMatchesTab.tsx`:
   - Kotak persetujuan permohonan buka kunci dari lawan.
3. `web/src/components/ControlCenterClient.tsx`:
   - Menghitung badge notifikasi pending dari permohonan buka kunci.
