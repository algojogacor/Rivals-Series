'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, Scale, BookOpen } from 'lucide-react';

interface BabItem {
  id: string;
  title: string;
  pasalRange: string;
  content: Array<{
    pasal: string;
    heading: string;
    body: string[];
  }>;
}

const BAB_LIST: BabItem[] = [
  {
    id: 'bab-1',
    title: 'BAB I — Ketentuan Umum',
    pasalRange: 'Pasal 1–3',
    content: [
      {
        pasal: 'Pasal 1',
        heading: 'Nama dan Status Kompetisi',
        body: [
          'Kompetisi ini bernama Rivals Series Season 1 (disingkat RS S1). RS S1 adalah duel eksklusif dua peserta (Peserta A dan Peserta B) dalam mode eFootball™ Friend Match 1v1, Dream Team.',
          'Kompetisi diselenggarakan mandiri berlandaskan asas sportivitas, transparansi, dan integritas data digital.',
        ],
      },
      {
        pasal: 'Pasal 2',
        heading: 'Peserta dan Akun Resmi',
        body: [
          'Peserta RS S1 terdiri atas tepat dua orang yang masing-masing menggunakan satu akun Dream Team eFootball™ terverifikasi.',
          'Kedua peserta menyetujui seluruh isi regulasi ini sebelum dimulainya Matchday 1.',
        ],
      },
      {
        pasal: 'Pasal 3',
        heading: 'Prinsip Integritas dan Transparansi',
        body: [
          'Beban pembuktian selalu berada pada pihak yang mengajukan klaim. Tidak ada sanksi yang boleh dijatuhkan tanpa bukti rekaman atau tangkapan layar yang sah.',
          'Administrator website bertindak murni sebagai pencatat administrasi dan dilarang keras mengubah hasil, skor, atau sanksi secara sepihak tanpa melalui mekanisme konsensus resmi.',
        ],
      },
    ],
  },
  {
    id: 'bab-2',
    title: 'BAB II — Format Musim dan Klasemen',
    pasalRange: 'Pasal 4–8',
    content: [
      {
        pasal: 'Pasal 4',
        heading: 'Jumlah Pertandingan dan Fase',
        body: [
          'RS S1 terdiri dari tepat 20 Matchday (MD1 hingga MD20) yang terbagi dalam dua fase:',
          '1. Fase 1: Group Stage (MD1–MD10) — Menggunakan sistem poin liga standar.',
          '2. Fase 2: Knockout Stage (MD11–MD20) — Setiap pertandingan wajib menghasilkan pemenang melalui Extra Time dan Adu Penalti.',
        ],
      },
      {
        pasal: 'Pasal 5',
        heading: 'Sistem Poin Pertandingan',
        body: [
          'MD1–MD10 (Group Stage): Menang = 3 poin; Seri = 1 poin; Kalah = 0 poin.',
          'MD11–MD20 (Knockout Stage): Menang Waktu Reguler/ET/PK = 3 poin; Kalah = 0 poin. Tidak ada hasil seri.',
        ],
      },
      {
        pasal: 'Pasal 6',
        heading: 'Jadwal Pertandingan Fleksibel',
        body: [
          'Pertandingan dapat dimainkan tanpa urutan kalender kaku asalkan disepakati kedua peserta. Nomor Matchday yang dilaporkan secara otomatis menentukan aturan permainan resmi laga tersebut.',
        ],
      },
      {
        pasal: 'Pasal 7',
        heading: 'Tabel Klasemen Otoritatif',
        body: [
          'Klasemen resmi menampilkan: Peringkat, Nama Peserta, Main (MP), Menang (W), Seri (D), Kalah (L), Gol Masuk (GF), Gol Kebobolan (GA), Selisih Gol (GD), Poin (PTS), Kredit Indonesia (/5), dan Sanksi.',
        ],
      },
      {
        pasal: 'Pasal 8',
        heading: 'Penentuan Peringkat Jika Poin Sama',
        body: [
          'Jika perolehan poin akhir sama, penentuan peringkat ditentukan berurutan berdasarkan: 1) Selisih Gol (GD) keseluruhan, 2) Jumlah Gol Masuk (GF), 3) Jumlah Kemenangan keseluruhan, 4) Jumlah Kemenangan Knockout (MD11–20), 5) Selisih Gol Knockout (MD11–20), 6) Championship Playoff 10 menit.',
        ],
      },
    ],
  },
  {
    id: 'bab-3',
    title: 'BAB III — Pengaturan Kamar Pertandingan',
    pasalRange: 'Pasal 9–13',
    content: [
      {
        pasal: 'Pasal 9',
        heading: 'Mode dan Durasi Pertandingan',
        body: [
          'Semua pertandingan menggunakan mode Friend Match 1v1 Dream Team dengan durasi waktu normal 8 menit.',
        ],
      },
      {
        pasal: 'Pasal 10',
        heading: 'Kondisi Pemain dan Pergantian',
        body: [
          'Kondisi pemain (Condition) wajib disetel pada pilihan Acak (Random).',
          'Pergantian pemain maksimal 6 pemain dalam maksimal 6 kali kesempatan penghentian laga.',
        ],
      },
      {
        pasal: 'Pasal 11',
        heading: 'Extra Time dan Penalti',
        body: [
          'MD1–MD10: Extra Time = Off, Penalti = Off (hasil imbang sah).',
          'MD11–MD20: Extra Time = On, Penalti = On (wajib ada pemenang).',
        ],
      },
      {
        pasal: 'Pasal 12',
        heading: 'Penetapan Tuan Rumah (Room Creator)',
        body: [
          'Tuan rumah yang wajib membuat Friend Match Room ditentukan berselang-seling sesuai jadwal matchday. Pemain A tuan rumah pada matchday ganjil; Pemain B pada matchday genap.',
        ],
      },
      {
        pasal: 'Pasal 13',
        heading: 'Verifikasi Pengaturan Sebelum Kick-off',
        body: [
          'Kedua pihak wajib memastikan pengaturan kamar tanding telah sesuai sebelum menekan tombol siap.',
        ],
      },
    ],
  },
  {
    id: 'bab-4',
    title: 'BAB IV — Skuad dan Pendaftaran Roster',
    pasalRange: 'Pasal 14–16',
    content: [
      {
        pasal: 'Pasal 14',
        heading: 'Ukuran Skuad, Larangan Kartu Kembar, dan Penguncian Fase 1',
        body: [
          'Setiap peserta mendaftarkan skuad resmi maksimal 26 kartu pemain sebelum musim berjalan.',
          'Di dalam 26 kartu skuad satu peserta, setiap pemain virtual (base_player_id) hanya boleh memiliki maksimal satu (1) kartu terdaftar (larangan kartu kembar dalam skuad satu peserta). Kedua peserta tetap diperbolehkan mendaftarkan pemain virtual yang sama pada skuadnya masing-masing.',
          'Skuad hanya dapat dikunci apabila berjumlah tidak melebihi 26 kartu, bebas dari kartu kembar pemain virtual yang sama, dan memuat minimal dua (2) kartu bertipe Trending dari dua pemain virtual yang berbeda.',
          'Pendaftaran skuad terbagi dua fase: Fase 1 (berlaku MD1–MD10) dan Fase 2 (berlaku MD11–MD20).',
        ],
      },
      {
        pasal: 'Pasal 15',
        heading: 'Bursa Transfer Tengah Musim (Setelah MD10)',
        body: [
          'Pergantian roster kartu hanya diizinkan pada jeda tengah musim setelah MD10 selesai dan sebelum MD11 dimulai.',
          'Penggantian kartu setelah MD10 diperbolehkan mengganti ke versi kartu lain dari pemain virtual yang sama (selama di dalam skuad aktif Fase 2 tetap hanya terdapat satu kartu untuk setiap pemain virtual), serta perolehan gol dan clean sheet tetap digabung per pemain virtual untuk Golden Boot dan Golden Glove.',
        ],
      },
      {
        pasal: 'Pasal 16',
        heading: 'Identitas Versi Kartu',
        body: [
          'Kartu pemain dicatat berdasarkan versi spesifiknya (Standard, Trending, Featured, Highlight, Epic, Show Time, Big Time, Legend, dll.) sesuai data atribut dan tipe resmi eFootball™.',
        ],
      },
    ],
  },
  {
    id: 'bab-5',
    title: 'BAB V — Persyaratan Kartu Trending dan Pemain Indonesia',
    pasalRange: 'Pasal 17–20',
    content: [
      {
        pasal: 'Pasal 17',
        heading: 'Kewajiban Kartu Trending di Setiap Matchday',
        body: [
          'Di setiap matchday (seluruh 20 MD, baik MD1–MD10 maupun MD11–MD20), minimal satu (1) babak reguler penuh (45 menit penuh — Babak Pertama atau Babak Kedua) wajib terdapat minimal dua (2) pemain bertipe Trending dari dua pemain virtual yang berbeda yang berada di lapangan secara bersamaan.',
          'Tipe kartu lain (Standard, Epic, Highlight, Featured, Show Time, Big Time, dll.) bebas digunakan tanpa pembatasan kuota.',
          'Pelanggaran terhadap kewajiban Kartu Trending pada suatu matchday dikenai sanksi kekalahan administratif 0–3 (forfeit) untuk matchday tersebut.',
        ],
      },
      {
        pasal: 'Pasal 18',
        heading: 'Pemain Indonesia dalam DSP Setiap Matchday',
        body: [
          'Setiap peserta wajib mencantumkan minimal satu (1) pemain berkebangsaan Indonesia di dalam Daftar Susunan Pemain (DSP — kesebelasan awal atau bangku cadangan) pada setiap matchday (MD1–MD20).',
        ],
      },
      {
        pasal: 'Pasal 19',
        heading: 'Kewajiban Kuota Musiman 5 Kredit Pemain Indonesia',
        body: [
          'Setiap peserta wajib mengumpulkan minimal 5 kredit babak reguler (5 x 45 menit) pemain Indonesia sepanjang 20 matchday.',
          'Satu kredit diperoleh jika minimal 1 pemain berkebangsaan Indonesia berada di lapangan sepanjang satu babak reguler penuh (Babak Pertama penuh atau Babak Kedua penuh).',
          'Syarat Kartu Trending dan syarat Kuota Pemain Indonesia dihitung secara terpisah; satu babak reguler yang sama boleh memenuhi kedua syarat tersebut sekaligus.',
          'Peserta yang gagal mencapai 5 kredit di akhir musim (setelah MD20) dikenakan pengurangan 3 poin di klasemen akhir.',
        ],
      },
      {
        pasal: 'Pasal 20',
        heading: 'Pencatatan Kepatuhan Kartu Trending dan Kredit Indonesia',
        body: [
          'Setiap pelaporan hasil pertandingan mencatat pemenuhan babak Kartu Trending serta perolehan kredit babak Pemain Indonesia secara transparan.',
        ],
      },
    ],
  },
  {
    id: 'bab-6',
    title: 'BAB VI — Pelaporan dan Pengesahan Hasil',
    pasalRange: 'Pasal 21–24',
    content: [
      {
        pasal: 'Pasal 21',
        heading: 'Bukti Tangkapan Layar Pertandingan',
        body: [
          'Setelah pertandingan selesai, peserta wajib membagikan tangkapan layar hasil akhir dan susunan pemain di grup koordinasi.',
        ],
      },
      {
        pasal: 'Pasal 22',
        heading: 'Prosedur Konfirmasi dan Sahnya Hasil',
        body: [
          'Laporan hasil yang diajukan oleh salah satu peserta wajib dikonfirmasi oleh lawan dalam waktu 24 jam.',
          'Jika lawan tidak merespons dalam 24 jam tanpa mengajukan sengketa, sistem secara otomatis mengesahkan hasil laga.',
        ],
      },
      {
        pasal: 'Pasal 23',
        heading: 'Pencatatan Audit Trail',
        body: [
          'Setiap perubahan, pelaporan, konfirmasi, dan keputusan tercatat secara kekal di tabel audit log.',
        ],
      },
    ],
  },
  {
    id: 'bab-7',
    title: 'BAB VII — Gangguan Koneksi dan Rekonstruksi',
    pasalRange: 'Pasal 25–29',
    content: [
      {
        pasal: 'Pasal 25',
        heading: 'Terputus Sebelum Menit 75',
        body: [
          'Jika pertandingan terputus akibat gangguan server/koneksi sebelum menit 75, sisa waktu wajib dimainkan dalam kamar tanding baru dengan skor agregat digabungkan.',
        ],
      },
      {
        pasal: 'Pasal 26',
        heading: 'Terputus Setelah Menit 75',
        body: [
          'Jika pertandingan terputus setelah menit 75 dan selisih gol minimal 2, skor saat terputus disahkan sebagai hasil akhir.',
        ],
      },
    ],
  },
  {
    id: 'bab-8',
    title: 'BAB VIII — Sportivitas dan Integritas Laga',
    pasalRange: 'Pasal 30–34',
    content: [
      {
        pasal: 'Pasal 30',
        heading: 'Larangan Backpass Berlebihan dan Toxic Play',
        body: [
          'Kedua peserta menjunjung tinggi asas sportivitas. Dilarang melakukan backpass sengaja mengulur waktu tanpa tekanan lawan.',
        ],
      },
      {
        pasal: 'Pasal 31',
        heading: 'Forfeit dan WO',
        body: [
          'Kemenangan WO (walkover) diberikan skor resmi 3–0 jika salah satu peserta menolak bertanding tanpa alasan sah.',
        ],
      },
    ],
  },
  {
    id: 'bab-9',
    title: 'BAB IX — Penyelesaian Sengketa dan Arbitrase',
    pasalRange: 'Pasal 35–40',
    content: [
      {
        pasal: 'Pasal 35',
        heading: 'Hak Pengajuan Keberatan Resmi',
        body: [
          'Peserta berhak mengajukan keberatan resmi maksimal 24 jam setelah pertandingan dilaporkan.',
        ],
      },
      {
        pasal: 'Pasal 38',
        heading: 'Peran AI Adjudicator',
        body: [
          'Jika mufakat tidak tercapai, kasus diserahkan ke AI Adjudicator netral berpandukan bukti terverifikasi dan regulasi resmi RS S1.',
        ],
      },
    ],
  },
  {
    id: 'bab-10',
    title: 'BAB X — Gelar dan Penghargaan Resmi',
    pasalRange: 'Pasal 41–48',
    content: [
      {
        pasal: 'Pasal 41',
        heading: 'Tujuh Gelar Resmi Musim',
        body: [
          'RS S1 menganugerahkan 7 gelar: RS Champion, Golden Boot, Goal of the Season, Golden Glove, Best Defence, Longest Winning Streak, dan Most Clean Sheets.',
        ],
      },
    ],
  },
  {
    id: 'bab-11',
    title: 'BAB XI — Administrasi dan Arsip Data',
    pasalRange: 'Pasal 49–50',
    content: [
      {
        pasal: 'Pasal 49',
        heading: 'Kepemilikan dan Keamanan Arsip Data',
        body: [
          'Data pertandingan disimpan di cloud database yang dapat diunduh dalam format JSON dan CSV sebagai arsip mandiri.',
        ],
      },
      {
        pasal: 'Pasal 50',
        heading: 'Protokol Reset Darurat',
        body: [
          'Reset musim wajib memenuhi pengunduhan arsip, konfirmasi frasa, dan persetujuan bersama kedua belah pihak.',
        ],
      },
    ],
  },
  {
    id: 'bab-12',
    title: 'BAB XII — Amandemen dan Penutup',
    pasalRange: 'Pasal 51–52',
    content: [
      {
        pasal: 'Pasal 51',
        heading: 'Syarat Amandemen Regulasi',
        body: [
          'Perubahan aturan hanya sah jika disetujui bersama oleh Peserta A dan Peserta B secara tertulis.',
        ],
      },
    ],
  },
];

export function RulesReaderClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBab, setActiveBab] = useState('bab-1');

  // Filter content based on search query
  const filteredBabs = useMemo(() => {
    if (!searchQuery.trim()) return BAB_LIST;
    const q = searchQuery.toLowerCase();
    return BAB_LIST.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.content.some(
          (c) =>
            c.pasal.toLowerCase().includes(q) ||
            c.heading.toLowerCase().includes(q) ||
            c.body.some((txt) => txt.toLowerCase().includes(q))
        )
    );
  }, [searchQuery]);

  return (
    <div className="space-y-10">
      {/* 1. Header & Quote Integritas */}
      <div className="space-y-6 border-b border-[var(--line)] pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
              Regulasi
            </h1>
            <p className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
              Regulasi Resmi Rivals Series Season 1 · Versi 1.0
            </p>
          </div>

          <Link
            href="/control"
            className="inline-flex items-center justify-center h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>Ajukan / Periksa Sengketa</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Lead Quote Integritas: Tanpa kotak merah, tipografi lead bersih */}
        <div className="border-l-2 border-[var(--text)] pl-5 py-1">
          <p className="text-lg sm:text-xl font-medium text-[var(--text)] italic leading-relaxed">
            &ldquo;Beban pembuktian ada pada pihak yang mengajukan klaim. Tidak ada sanksi yang boleh dijatuhkan tanpa bukti rekaman atau tangkapan layar yang sah.&rdquo;
          </p>
          <span className="text-[13px] text-[var(--text-faint)] block mt-2 font-mono">
            Pasal 3 ayat (1) Regulasi Resmi RS S1
          </span>
        </div>
      </div>

      {/* 2. Mobile Horizontal Chips TOC (Menempel di bawah header) */}
      <div className="block lg:hidden sticky top-16 z-30 -mx-5 px-5 py-3 bg-[var(--ink-0)]/95 backdrop-blur-sm border-b border-[var(--line)]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {BAB_LIST.map((b) => (
            <a
              key={b.id}
              href={`#${b.id}`}
              onClick={() => setActiveBab(b.id)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                activeBab === b.id
                  ? 'bg-[var(--text)] text-[var(--ink-0)] border-[var(--text)]'
                  : 'bg-[var(--ink-1)] text-[var(--text-dim)] border-[var(--line)] hover:text-[var(--text)]'
              }`}
            >
              {b.title.split('—')[0].trim()}
            </a>
          ))}
        </div>
      </div>

      {/* 3. Main Reading Grid: Left TOC (Desktop) + Right Reader Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
        {/* Desktop Sticky TOC */}
        <aside className="hidden lg:flex flex-col sticky top-24 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pasal atau kata kunci…"
              className="w-full h-11 pl-9 pr-3 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none transition-colors"
            />
          </div>

          {/* TOC Links */}
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {BAB_LIST.map((b) => {
              const isActive = activeBab === b.id;
              return (
                <a
                  key={b.id}
                  href={`#${b.id}`}
                  onClick={() => setActiveBab(b.id)}
                  className={`block px-3 py-2 rounded-[6px] text-xs transition-colors ${
                    isActive
                      ? 'bg-[var(--ink-2)] text-[var(--text)] font-bold'
                      : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--ink-2)]/50'
                  }`}
                >
                  <div className="font-semibold uppercase tracking-tight truncate">
                    {b.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)]">{b.pasalRange}</div>
                </a>
              );
            })}
          </div>
        </aside>

        {/* Reader Content Column (Lebar maksimum 68ch) */}
        <main className="max-w-[68ch] space-y-[72px]">
          {filteredBabs.map((b) => (
            <section key={b.id} id={b.id} className="scroll-mt-28 space-y-8">
              {/* Judul Bab: display h2 */}
              <div className="border-b border-[var(--line)] pb-3">
                <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text)] leading-tight">
                  {b.title}
                </h2>
                <span className="text-[12px] text-[var(--text-faint)] uppercase tracking-wider font-mono">
                  {b.pasalRange}
                </span>
              </div>

              {/* Daftar Pasal: Jarak antar pasal 24 */}
              <div className="space-y-6">
                {b.content.map((c) => (
                  <article key={c.pasal} id={c.pasal.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-28 space-y-2">
                    <h3 className="text-base font-bold text-[var(--text)]">
                      <span className="text-[var(--text)] font-extrabold mr-2">{c.pasal}</span>
                      <span className="text-[var(--text-dim)] font-medium">({c.heading})</span>
                    </h3>
                    <div className="space-y-2 text-[15px] text-[var(--text-dim)] leading-[1.65]">
                      {c.body.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {filteredBabs.length === 0 && (
            <div className="p-8 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] text-center text-sm text-[var(--text-dim)]">
              Tidak ada pasal yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
