'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, Scale, BookOpen, Link2, Check, X } from 'lucide-react';
import { useEffect, useCallback } from 'react';

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

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark key={index} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function RulesReaderClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBab, setActiveBab] = useState('bab-1');
  const [copiedPasal, setCopiedPasal] = useState<string | null>(null);

  // Filter content based on search query
  const filteredBabs = useMemo(() => {
    if (!searchQuery.trim()) return BAB_LIST;
    const q = searchQuery.toLowerCase().trim();
    return BAB_LIST.map((b) => {
      const babMatches = b.title.toLowerCase().includes(q);
      const matchingContent = b.content.filter(
        (c) =>
          c.pasal.toLowerCase().includes(q) ||
          c.heading.toLowerCase().includes(q) ||
          c.body.some((txt) => txt.toLowerCase().includes(q))
      );
      if (babMatches) return b;
      if (matchingContent.length > 0) return { ...b, content: matchingContent };
      return null;
    }).filter(Boolean) as BabItem[];
  }, [searchQuery]);

  // Total matching articles count
  const totalMatches = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return filteredBabs.reduce((acc, b) => acc + b.content.length, 0);
  }, [filteredBabs, searchQuery]);

  // Deep-linking support on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        // Find parent bab
        for (const b of BAB_LIST) {
          if (b.content.some((c) => c.pasal.toLowerCase().replace(/\s+/g, '-') === hash)) {
            setActiveBab(b.id);
            break;
          }
        }
        const el = document.getElementById(hash);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
        }
      }
    }
  }, []);

  // IntersectionObserver for tracking active bab on scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveBab(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    BAB_LIST.forEach((b) => {
      const el = document.getElementById(b.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleCopyLink = useCallback((pasalId: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}#${pasalId}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedPasal(pasalId);
        window.history.replaceState(null, '', `#${pasalId}`);
        setTimeout(() => setCopiedPasal(null), 2200);
      });
    }
  }, []);

  return (
    <div className="space-y-10">
      {/* 1. Header & Quote Integritas */}
      <div className="space-y-6 border-b border-[var(--line)] pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-[var(--ink-2)] border border-[var(--line)] text-[var(--accent)] mb-1">
              <Scale className="w-3 h-3" />
              <span>Buku Aturan Otoritatif</span>
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
              Regulasi Liga
            </h1>
            <p className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
              Regulasi Resmi Rivals Series Season 1 · Versi 1.0 (52 Pasal)
            </p>
          </div>

          <Link
            href="/control"
            className="inline-flex items-center justify-center h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>Ajukan / Periksa Sengketa</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Lead Quote Integritas: Stamped quote with subtle background */}
        <div className="relative rounded-[10px] bg-[var(--ink-1)]/70 border-l-4 border-[var(--accent)] p-5 backdrop-blur-sm">
          <p className="text-base sm:text-lg font-medium text-[var(--text)] italic leading-relaxed">
            &ldquo;Beban pembuktian ada pada pihak yang mengajukan klaim. Tidak ada sanksi yang boleh dijatuhkan tanpa bukti rekaman atau tangkapan layar yang sah.&rdquo;
          </p>
          <div className="flex items-center gap-2 mt-2.5 text-[12px] text-[var(--text-faint)] font-mono">
            <span className="font-semibold text-[var(--text-dim)]">Pasal 3 ayat (1) Regulasi Resmi RS S1</span>
            <span>·</span>
            <span>Asas Beban Pembuktian</span>
          </div>
        </div>
      </div>

      {/* 2. Mobile Search & Horizontal Chips TOC (Sticky on Mobile) */}
      <div className="block lg:hidden sticky top-16 z-30 -mx-5 px-5 py-3 bg-[var(--ink-0)]/95 backdrop-blur-md border-b border-[var(--line)] space-y-2.5">
        {/* Mobile Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci aturan (e.g. trending, WO, koneksi)..."
            className="w-full h-10 pl-9 pr-8 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-faint)] hover:text-[var(--text)]"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Bab Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {BAB_LIST.map((b) => (
            <a
              key={b.id}
              href={`#${b.id}`}
              onClick={() => setActiveBab(b.id)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                activeBab === b.id
                  ? 'bg-[var(--accent)] text-[var(--ink-0)] border-[var(--accent)] font-bold shadow-sm'
                  : 'bg-[var(--ink-1)] text-[var(--text-dim)] border-[var(--line)] hover:text-[var(--text)]'
              }`}
            >
              {b.title.split('—')[0].trim()}
            </a>
          ))}
        </div>
      </div>

      {/* Search Result Feedback Bar */}
      {searchQuery.trim() && (
        <div className="rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] px-4 py-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-[var(--text-dim)]">
              Ditemukan <strong className="text-[var(--text)] font-mono">{totalMatches}</strong> pasal untuk kata kunci{' '}
              <mark className="search-highlight">&ldquo;{searchQuery}&rdquo;</mark>
            </span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Reset Pencarian</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 3. Main Reading Grid: Left TOC (Desktop) + Right Reader Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 items-start">
        {/* Desktop Sticky TOC */}
        <aside className="hidden lg:flex flex-col sticky top-24 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pasal atau kata kunci…"
              className="w-full h-11 pl-10 pr-8 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-[var(--text-faint)] hover:text-[var(--text)]"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* TOC Links Box */}
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-2 space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-faint)] border-b border-[var(--line)] mb-1 flex items-center justify-between">
              <span>Daftar Bab Regulasi</span>
              <span>12 Bab</span>
            </div>
            {BAB_LIST.map((b) => {
              const isActive = activeBab === b.id;
              return (
                <a
                  key={b.id}
                  href={`#${b.id}`}
                  onClick={() => setActiveBab(b.id)}
                  className={`block px-3 py-2.5 rounded-[8px] text-xs transition-all ${
                    isActive
                      ? 'bg-[var(--ink-2)] text-[var(--text)] font-bold border-l-2 border-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--ink-2)]/60'
                  }`}
                >
                  <div className="font-semibold uppercase tracking-tight truncate">
                    {b.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-faint)] font-mono mt-0.5">{b.pasalRange}</div>
                </a>
              );
            })}
          </div>
        </aside>

        {/* Reader Content Column (Max width 72ch for optimal editorial reading line length) */}
        <main className="max-w-[72ch] space-y-16">
          {filteredBabs.map((b) => (
            <section key={b.id} id={b.id} className="scroll-mt-28 space-y-8">
              {/* Judul Bab: display h2 with accent underline */}
              <div className="border-b-2 border-[var(--line)] pb-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text)] leading-tight">
                    {highlightMatch(b.title, searchQuery)}
                  </h2>
                  <span className="text-[11px] text-[var(--accent)] uppercase tracking-wider font-mono font-bold bg-[var(--ink-1)] px-2.5 py-1 rounded-[6px] border border-[var(--line)] shrink-0 ml-3">
                    {b.pasalRange}
                  </span>
                </div>
              </div>

              {/* Daftar Pasal */}
              <div className="space-y-8">
                {b.content.map((c) => {
                  const pasalId = c.pasal.toLowerCase().replace(/\s+/g, '-');
                  const isCopied = copiedPasal === pasalId;

                  return (
                    <article
                      key={c.pasal}
                      id={pasalId}
                      className="group scroll-mt-28 rounded-[10px] p-4 -mx-4 transition-colors hover:bg-[var(--ink-1)]/40 border border-transparent hover:border-[var(--line)]/50 space-y-2.5"
                    >
                      {/* Pasal Heading with Deep-Link Copy Action */}
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[15px] sm:text-base font-bold text-[var(--text)] flex items-center flex-wrap gap-2">
                          <span className="font-extrabold text-[var(--accent)] font-mono">
                            {highlightMatch(c.pasal, searchQuery)}
                          </span>
                          <span className="text-[var(--text-dim)] font-medium">
                            ({highlightMatch(c.heading, searchQuery)})
                          </span>
                        </h3>

                        {/* Interactive Deep-Link Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCopied && (
                            <span className="text-[11px] font-semibold text-[var(--ok)] bg-[var(--ok)]/15 border border-[var(--ok)]/30 px-2 py-0.5 rounded animate-fade-in flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Tersalin</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(pasalId)}
                            title={`Salin tautan ke ${c.pasal}`}
                            className="p-1.5 rounded-[6px] text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--ink-2)] transition-colors opacity-70 group-hover:opacity-100 focus:opacity-100"
                            aria-label={`Salin tautan ${c.pasal}`}
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Body Paragraphs */}
                      <div className="space-y-2 text-[14px] sm:text-[15px] text-[var(--text-dim)] leading-[1.7]">
                        {c.body.map((paragraph, i) => (
                          <p key={i}>
                            {highlightMatch(paragraph, searchQuery)}
                          </p>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredBabs.length === 0 && (
            <div className="p-10 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] text-center space-y-3">
              <BookOpen className="w-8 h-8 text-[var(--text-faint)] mx-auto" />
              <p className="text-sm font-semibold text-[var(--text)]">
                Tidak ada pasal yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
              </p>
              <p className="text-xs text-[var(--text-dim)]">
                Coba gunakan kata kunci lain seperti &ldquo;trending&rdquo;, &ldquo;indonesia&rdquo;, &ldquo;forfeit&rdquo;, atau &ldquo;koneksi&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 h-9 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs text-[var(--text)] font-semibold hover:border-[var(--text-dim)] transition-colors"
              >
                Tampilkan Seluruh Regulasi
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
