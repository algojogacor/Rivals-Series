# Spesifikasi Data, Aturan Matematika, dan Mesin Status — RS S1

Dokumen ini mendokumentasikan spesifikasi teknis perhitungan matematika, derivasi status pertandingan, struktur klasemen, dan tata kelola mutasi data pada Rivals Series Season 1 (RS S1) sesuai naskah kanonikal `rules.md`.

---

## 1. Sistem Poin & Klasemen (Pasal 6 & 7)

### Derivasi Poin per Pertandingan

1. **Group Stage (MD1 sampai MD10):**
   - Menang waktu reguler: 3 poin
   - Seri waktu reguler: 1 poin untuk masing-masing peserta
   - Kalah waktu reguler: 0 poin
   - *Catatan:* Extra Time dan Adu Penalti dinonaktifkan secara teknis.

2. **Knockout Stage (MD11 sampai MD20):**
   - Menang waktu reguler: 3 poin (Kalah: 0 poin)
   - Menang Extra Time: 3 poin (Kalah: 0 poin)
   - Menang Adu Penalti: 3 poin (Kalah: 0 poin)
   - *Catatan:* Seluruh laga yang selesai normal wajib menghasilkan pemenang. Pemenang adu penalti tetap mendapatkan 3 poin penuh liga.

### Format Tabel Klasemen 10 Kolom (Pasal 7)

Setiap entri klasemen menampilkan sepuluh kolom wajib:
- **P (Played):** Jumlah pertandingan yang telah disahkan (`status = 'confirmed'`).
- **W (Won):** Jumlah kemenangan.
- **D (Drawn):** Jumlah hasil imbang (hanya mungkin terjadi pada MD1-MD10).
- **L (Lost):** Jumlah kekalahan.
- **GF (Goals For):** Total gol memasukkan (termasuk gol babak tambahan, tetapi tidak termasuk gol dalam adu penalti).
- **GA (Goals Against):** Total gol kemasukan (termasuk gol babak tambahan, tidak termasuk gol adu penalti).
- **GD (Goal Difference):** Selisih gol ($GD = GF - GA$).
- **PTS (Points):** Akumulasi poin liga dikurangi pengurangan sanksi aktif.
- **IDN (Indonesian Credits):** Akumulasi kredit babak pemain Indonesia yang sah (maksimal 1 per MD).
- **FORM (5 Laga Terakhir):** Rangkaian hasil 5 pertandingan sah terakhir (W, D, L).

---

## 2. Hierarki Pemecah Seri / Tiebreaker (Pasal 8)

Jika kedua peserta memiliki poin yang sama di klasemen akhir, pemeringkatan ditentukan secara berurutan:

1. **Selisih Gol Keseluruhan (GD):** $GD_A$ vs $GD_B$.
2. **Jumlah Gol Memasukkan Keseluruhan (GF):** $GF_A$ vs $GF_B$.
3. **Poin Head-to-Head (H2H PTS):** Akumulasi poin yang diperoleh dalam pertemuan langsung antara kedua peserta sepanjang 20 MD.
4. **Selisih Gol Head-to-Head (H2H GD):** Selisih gol dalam duel langsung kedua peserta.
5. **Gol Memasukkan Head-to-Head (H2H GF):** Total gol yang dicetak dalam duel langsung.
6. **Laga Tambahan Penentuan (Decider Match):** Laga tunggal 10 menit dengan Extra Time dan Adu Penalti aktif.

---

## 3. Rumus Penguncian Gelar Dini (Early Champion, Pasal 40)

Peserta dinyatakan telah mengunci gelar juara secara matematis jika:

$$G_{adj} > 3 \times R_{chaser}$$

Dimana:
- $G_{adj} = PTS_{lead} - PTS_{chaser}$ (selisih poin saat ini).
- $R_{chaser} = 20 - P_{chaser}$ (jumlah pertandingan tersisa bagi pihak pengejar).
- Poin maksimal yang dapat diraih pihak pengejar adalah $3 \times R_{chaser}$.

*Ketentuan Pasal 40 Ayat 3:* Meskipun gelar juara telah dikunci lebih awal, seluruh 20 Matchday tetap wajib dimainkan sampai tuntas guna melengkapi statistik Golden Boot, Golden Glove, Player of the Season, dan kredit kuota Indonesia.

---

## 4. Perhitungan Syarat Kartu Trending & Kredit Kuota Pemain Indonesia (Pasal 17, 19 & 20)

- **Syarat Kartu Trending (Per Matchday, Pasal 17):** Di setiap Matchday (seluruh 20 MD), minimal 1 babak reguler penuh (45 menit penuh — Babak 1 atau Babak 2) wajib menampilkan sekurang-kurangnya 2 pemain bertipe kartu Trending berada di lapangan secara bersamaan. Kegagalan memenuhi syarat ini pada suatu Matchday berakibat forfeit administratif 0–3.
- **Target Musim Pemain Indonesia (Pasal 19):** 5 kredit babak per peserta sepanjang Season 1 (5 × 45 menit).
- **Maksimal per MD (Pemain Indonesia):** 2 kredit babak per Matchday (1 kredit untuk Babak 1 dan 1 kredit untuk Babak 2).
- **Syarat Kelayakan Kredit Indonesia:** Pemain berkewarganegaraan Indonesia wajib berada di atas lapangan selama **1 babak reguler penuh (45 menit)** tanpa terputus:
  - Bermain penuh pada babak pertama (menit 0 sampai peluit babak pertama) = Sah 1 Kredit.
  - Bermain penuh pada babak kedua (jeda babak pertama sampai peluit akhir waktu reguler) = Sah 1 Kredit.
  - Masuk pada menit berjalan tanpa kehadiran pemain Indonesia sejak awal babak = 0 Kredit.
- **Perhitungan Terpisah:** Syarat kartu Trending per MD dan kuota 5 kredit babak pemain Indonesia dihitung terpisah, namun satu babak reguler yang sama boleh memenuhi keduanya sekaligus.

---

## 5. Rekor Penghargaan Statistik (BAB X)

### Golden Boot (Pasal 42)
- Diberikan kepada pemain dengan jumlah gol terbanyak.
- **Penggabungan Versi (Ayat 4):** Seluruh versi kartu dari pemain virtual yang sama (`base_player_id`, misalnya Lionel Messi kartu Standard dan kartu Trending pada pergantian paruh musim) digabungkan menjadi satu identitas agregat pencetak gol.
- Gol dalam adu penalti pasca Extra Time tidak dihitung ke dalam statistik Golden Boot.

### Golden Glove (Pasal 44)
- Diberikan kepada penjaga gawang virtual dengan jumlah nirbobol (clean sheet) terbanyak (versi kartu berbeda dari pemain virtual `base_player_id` yang sama digabungkan).
- **Syarat Kelayakan (Ayat 2):** Hanya kiper starter yang bermain penuh hingga pertandingan selesai yang berhak mendapatkan catatan clean sheet.
- Jika jumlah clean sheet sama, pemeringkatan dipecah berdasarkan rata-rata kebobolan terendah per 90 menit.

---

## 6. Mesin Status Pertandingan (State Machine)

```
[scheduled] 
     │
     ▼ (Laporan diajukan di /control)
[awaiting_confirmation] 
     │
     ├──► [confirmed] (Disetujui oleh kedua peserta)
     │
     └──► [disputed]  (Diajukan keberatan resmi)
               │
               ▼ (Putusan Arbitrase AI / Musyawarah)
          [confirmed] (Hasil disesuaikan atau ditegakkan)
```

- **`scheduled`:** Pertandingan belum dimainkan. Belum ada skor.
- **`awaiting_confirmation`:** Laporan telah dimasukkan oleh salah satu peserta. Skor tampak di Match Center dengan lencana kuning, namun **tidak dihitung** ke dalam klasemen resmi.
- **`confirmed`:** Laporan telah disetujui oleh kedua peserta. Skor sah dan langsung memperbarui klasemen.
- **`disputed`:** Terjadi sengketa resmi yang diajukan oleh salah satu pihak. Hasil ditangguhkan sementara dari klasemen hingga diputus oleh AI Adjudicator.

---

## 7. Prinsip Larangan Silent Edit (Pasal 50 & 51)

Seluruh perubahan data pada database Turso wajib melalui mekanisme Server Actions yang mencatat:
1. `actor_id`: Peserta A atau Peserta B.
2. `action`: Nama tindakan (misal `submit_match_report`, `confirm_match_report`, `file_dispute`).
3. `entity_type` & `entity_id`: Rekor yang diubah.
4. `before_json` & `after_json`: Cuplikan data sebelum dan sesudah mutasi.
5. `rule_article`: Pasal regulasi yang mendasari perubahan.
6. `timestamp`: Waktu presisi server.

Tidak ada admin yang berhak melakukan update SQL langsung secara tersembunyi tanpa terekam di tabel `audit_events`.
