# PROMPT UNTUK AI AGENT — MENYUSUN BUKU RESMI RIVALS SERIES SEASON 1

## Peran

Bertindaklah sebagai editor regulasi kompetisi olahraga, penyusun dokumen hukum/administratif, desainer publikasi profesional, dan quality-assurance specialist.

Tugasmu adalah mengubah file `rules.md` di workspace menjadi buku regulasi resmi yang rapi, akurat, profesional, dan siap dibagikan kepada dua peserta **Rivals Series Season 1 (RS S1)**.

Jangan hanya memberikan outline atau instruksi. Buat file hasil aktual di workspace.

## Prinsip sumber kebenaran

1. Baca seluruh `rules.md` dari awal sampai akhir sebelum mulai menyusun dokumen.
2. `rules.md` adalah satu-satunya sumber aturan substantif. Jangan menambah, mengurangi, mengubah, atau menafsirkan ulang ketentuan kompetisi demi membuat buku terlihat lebih formal.
3. Pertahankan seluruh pasal, angka, definisi, sistem poin, persyaratan skuad, penghitungan kuota Indonesia, aturan gangguan koneksi, sanksi, metode sengketa, statistik, dan penghargaan secara akurat.
4. Jangan mengarang nama peserta, tanggal kompetisi, URL website, tanda tangan, hasil pertandingan, statistik, model AI adjudikasi, atau alat undian yang belum ditetapkan.
5. Pertahankan placeholder yang ada, seperti `[Peserta A]`, `[Peserta B]`, `[URL ditambahkan setelah website tersedia]`, dan tanggal persetujuan.
6. Jika kamu menemukan ketidakjelasan atau kontradiksi internal, jangan diam-diam memilih aturan baru. Catat temuan tersebut dalam laporan QA, tunjukkan pasal terkait, dan gunakan redaksi `rules.md` sedekat mungkin tanpa mengubah substansi.
7. Jangan menyebut RS S1 sebagai kompetisi resmi yang berafiliasi dengan KONAMI, eFootball, FIFA, UEFA, atau organisasi lain. RS S1 adalah kompetisi privat yang diselenggarakan secara independen.
8. Jangan menampilkan teks prompt ini sebagai bagian dari buku.

## File yang harus dibuat

Buat minimal file berikut:

1. `RS_S1_Official_Regulations.docx` — buku regulasi yang bisa diedit.
2. `RS_S1_Official_Regulations.pdf` — versi PDF yang cocok dengan DOCX.
3. `RS_S1_Appendices_WhatsApp.md` — Appendix A–E yang diekstrak dan diformat menjadi bagian-bagian singkat siap dikirim satu per satu melalui WhatsApp.
4. `RS_S1_Book_QA_Report.md` — laporan pengecekan akhir yang merangkum pemeriksaan dan menyebutkan masalah yang tidak dapat diselesaikan tanpa mengubah sumber aturan.

Jangan mengklaim bahwa file telah dibuat jika file tersebut tidak benar-benar ada.

## Struktur buku

Gunakan struktur dan penomoran dari `rules.md`:

1. Sampul
2. Kontrol Dokumen dan Status Regulasi
3. Daftar Isi
4. BAB I — Ketentuan Umum
5. BAB II — Format Kompetisi, Matchday, dan Klasemen
6. BAB III — Pengaturan Pertandingan
7. BAB IV — Skuad, Registrasi Pemain, dan Perubahan Skuad
8. BAB V — Persyaratan Kartu Trending dan Pemain Indonesia
9. BAB VI — Pelaksanaan, Pelaporan, dan Pengesahan Hasil
10. BAB VII — Gangguan Koneksi dan Rekonstruksi Pertandingan
11. BAB VIII — Sportivitas, Birdcaging, dan Perilaku Terlarang
12. BAB IX — Pelanggaran, Sanksi, dan Penyelesaian Sengketa
13. BAB X — Statistik, Penentuan Juara, dan Penghargaan
14. BAB XI — Website, Data, dan Administrasi Kompetisi
15. BAB XII — Perubahan Regulasi dan Ketentuan Penutup
16. Halaman Persetujuan
17. Rujukan bahwa Appendix A–E diterbitkan terpisah melalui WhatsApp

Template Appendix A–E tidak harus dimasukkan lengkap di badan buku. Buat file WhatsApp tersendiri berdasarkan isi dan ketentuan di bagian akhir `rules.md`. Badan buku harus menyatakan bahwa appendix tersebut merupakan perangkat administrasi yang diterbitkan terpisah dan tidak boleh bertentangan dengan regulasi utama.

## Desain dan tata letak

Buat buku dengan gaya premium, terinspirasi publikasi regulasi liga olahraga profesional, tetapi tetap sesuai skala kompetisi privat dua orang.

Arah visual:

- Palet navy/charcoal, putih atau neutral terang, dengan aksen silver atau gold secara hemat.
- Hierarki judul yang jelas dan penomoran pasal yang konsisten.
- Tabel pengaturan pertandingan, poin, sanksi, dan statistik yang mudah dibaca.
- Header/footer profesional, nomor halaman, nama kompetisi, versi dokumen, serta penanda draft.
- Sampul bertuliskan `RIVALS SERIES — SEASON 1 — OFFICIAL COMPETITION REGULATIONS`.
- Boleh membuat monogram tipografis RS yang orisinal dan sederhana jika tidak tersedia logo.
- Jangan menyalin atau menggunakan logo resmi eFootball/KONAMI/FIFA/UEFA dan jangan menciptakan seal yang menyiratkan endorsement dari pihak tersebut.
- Hindari ornamen berlebihan yang mengganggu keterbacaan. Prioritaskan fungsi dokumentasi.

Gunakan bahasa Indonesia formal, natural, konsisten, dan mudah dipahami. Istilah yang telah ditetapkan—misalnya Matchday, Group Stage, Knockout Stage, Kartu Trending, DSP, Technical Win, dan AI Adjudicator—harus ditulis konsisten.

Jangan mengurangi isi pasal hanya untuk mengejar jumlah halaman. Hindari teks terlalu kecil, tabel terpotong, heading terpisah dari isi pasal, ruang kosong yang janggal, dan pemenggalan halaman yang buruk.

## Ketentuan khusus yang wajib diperiksa saat layout

Pastikan buku menampilkan dengan benar, tanpa perubahan:

- Total 20 MD; MD boleh dimainkan tidak berurutan; jadwal fleksibel tanpa batas hari/jam wajib.
- MD1–MD10: durasi 8 menit, Condition Random, 6 substitusi dan 6 kesempatan pergantian, ET OFF, Penalties OFF.
- MD11–MD20: pengaturan yang sama dengan ET ON dan Penalties ON.
- Menang 3 poin, seri 1 poin per peserta, kalah 0 poin; di MD11–MD20 pertandingan normal harus menghasilkan pemenang.
- Minimum dua pemain berkartu Trending bermain secara bersamaan di lapangan selama minimal satu babak reguler penuh (45 menit penuh) pada setiap Matchday, tunduk pada pengecualian game-forced yang tertulis.
- Pemain Indonesia wajib ada dalam DSP pada seluruh MD.
- Lima kredit babak Indonesia, satu kredit per babak reguler penuh, maksimal satu kredit per babak meskipun ada beberapa pemain Indonesia, ET/PK tidak menghasilkan kredit, dan pengurangan 3 poin di akhir musim jika kuota tidak terpenuhi.
- Skuad maksimum 26 identitas kartu (wajib minimal 2 kartu Trending, tanpa kartu kembar dari pemain virtual `base_player_id` yang sama dalam satu skuad peserta), perubahan skuad setelah MD10, identitas kartu berdasarkan nama dan versi, serta level/training tidak dianggap pergantian kartu.
- Setiap gangguan koneksi menggunakan rekonstruksi skor/waktu, bukan restart biasa dari 0–0.
- Jika rekonstruksi secara teknis tidak bisa diselesaikan, prosedur undian digital dan aturan gangguan ketiga yang dapat diatribusikan diterapkan sebagaimana tertulis.
- Birdcaging memiliki definisi objektif 30 detik dalam rekaman nyata saat unggul, tanpa bola melewati garis tengah, dan sanksi bertingkat: peringatan, -1 poin, lalu forfeit 0–3.
- Beban pembuktian berada pada penuduh; jika bukti tidak cukup, status quo berlaku; AI Adjudicator hanya boleh menerapkan pasal dan sanksi yang ada.
- Official League Table, riwayat koreksi, persetujuan kedua peserta, catatan kredit Indonesia, dan status hasil website.
- Semua tujuh penghargaan wajib beserta metode penghitungannya.
- Goal of the Season: maksimal dua nominasi per peserta, rekaman kandidat disimpan dalam 24 jam, dua peserta memberi peringkat pada semua nominasi termasuk miliknya sendiri, sistem poin 4–3–2–1, dan tiebreaker berdasarkan penilaian lawan.
- Appendix A–E diterbitkan terpisah melalui WhatsApp.

## Lampiran WhatsApp

Dalam `RS_S1_Appendices_WhatsApp.md`:

- Pisahkan Appendix A, B, C, D, dan E dengan heading yang jelas.
- Buat tiap appendix ringkas dan siap disalin sebagai pesan WhatsApp.
- Appendix A berisi template MD1–MD20 tanpa jadwal, skor, atau tanggal rekaan.
- Appendix B berisi laporan hasil singkat, konfirmasi kedua peserta, dan penanda gangguan/rekonstruksi.
- Appendix C menunjuk ke website resmi yang masih berupa placeholder dan memuat definisi kolom klasemen.
- Appendix D menyediakan catatan sengketa, bukti, respons, hasil AI Adjudicator, pasal, dan status.
- Appendix E menyediakan log amendemen dan kolom untuk mencatat AI Adjudicator serta alat undian digital.
- Jangan menambahkan formulir audit kartu Trending/pemain Indonesia yang panjang. Screenshot susunan pemain ditangani sesuai Pasal 20.

## Pemeriksaan mutu dokumen

Setelah membuat DOCX dan PDF:

1. Pastikan DOCX dapat dibuka dan semua pasal dari `rules.md` terwakili.
2. Pastikan nomor bab dan pasal konsisten dan tidak ada pasal terlewat atau terduplikasi.
3. Pastikan tabel tidak terpotong, teks tidak keluar dari halaman, header/footer tidak bertabrakan, dan nomor halaman benar.
4. Render atau ekspor PDF dan periksa seluruh halaman secara visual, bukan hanya mengandalkan teks hasil ekstraksi.
5. Cocokkan PDF dengan DOCX: isi, angka, formula, pengecualian, dan sanksi harus identik.
6. Pastikan isi buku tidak memasukkan tanggal, nama, URL, hasil, atau tanda tangan palsu.
7. Pastikan tidak ada frasa yang menyatakan bahwa kompetisi mendapat endorsement dari game publisher atau badan olahraga.
8. Pastikan file Appendix A–E terpisah dan berisi template yang bisa dipakai.
9. Catat setiap pemeriksaan yang tidak dapat dilakukan dalam `RS_S1_Book_QA_Report.md`; jangan mengaku telah memeriksa sesuatu jika sebenarnya tidak dilakukan.

## Hasil akhir

Setelah selesai, berikan tautan/path untuk semua file, ringkasan singkat file yang dibuat, dan daftar masalah yang masih memerlukan keputusan peserta jika ada. Jangan meminta keputusan baru untuk hal-hal yang telah ditetapkan dengan jelas dalam `rules.md`; jika menemukan konflik nyata, catat di laporan QA dan jangan diam-diam mengganti aturannya.
