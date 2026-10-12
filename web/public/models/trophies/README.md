# Rivals Series — 3D Trophy Models Directory

Direktori ini disiapkan untuk menampung file model 3D eksternal (**format `.glb`**) untuk seluruh 8 penghargaan Rivals Series Season 1.

Sistem 3D Rivals Series menggunakan arsitektur **Hybrid PBR 3D Engine**:
- Jika file `.glb` tersedia di folder ini sesuai penamaan di bawah, viewer 3D web akan otomatis memuat dan merendernya dengan studio lighting & PBR environment maps.
- Jika file belum ada, viewer 3D web secara otomatis menggunakan **model prosedural berkualias tinggi** bawaan yang sudah dioptimalkan.

---

## Daftar File Model GLB yang Didukung

| No | Penghargaan | Nama File GLB | Catatan Desain Objek |
|:---|:---|:---|:---|
| 1 | **RS Champion Season 1** | `champion.glb` | Terinspirasi Piala Asia AFC: badan perak kelopak teratai mengembang, dua gagang lengkung geometris, cincin leher perak, alas obsidian hitam berundak. |
| 2 | **Golden Boot S1** | `boot.glb` | Sepatu bola emas 24K modern bersol pul (studs), tali & panel aerodinamis, di atas plinth marmer hitam. |
| 3 | **Golden Glove S1** | `glove.glb` | Sarung tangan kiper emas 24K posisi telapak terbuka menangkap bola, segmen jari artikulasi, strap pergelangan tangan, di atas plinth hitam. |
| 4 | **Playmaker of the Season S1** | `playmaker.glb` | *The Maestro's Vision Sphere*: Bola astrolabe angkasa berputar konsentris dengan cincin orbit meridian emas dan inti kristal bersinar. |
| 5 | **Goal of the Season S1** | `gots.glb` | *The Arc of Glory*: Bola sepak emas melayang di puncak pita lintasan supersonik spiral/parabola dinamis. |
| 6 | **Best Defence S1** | `best_defence.glb` | *The Aegis of Iron & Gold*: Perisai tempur faset titanium bersudut tegas dengan lis emas 24K dan lambang benteng di tengahnya. |
| 7 | **Longest Winning Streak S1** | `streak.glb` | *The Ascending Momentum Spire*: Monolit tangga/kristal chevron bertingkat yang menanjak ke atas mengarah pada bintang puncak. |
| 8 | **Most Clean Sheets S1** | `clean_sheet.glb` | *The Impenetrable Citadel*: Gerbang benteng monolitik dengan kubah brankas terkunci dan menara pengawal kembar. |

---

## Panduan Image-to-3D (Meshy, Tripo, Rodin, Hunyuan3D)

Jika kamu ingin membuat model dari AI Image-to-3D:
1. **Tool yang direkomendasikan**:
   - **Tripo 3D** (tripo3d.ai) — Sangat cepat, geometri bersih, mendukung PBR metalness/roughness.
   - **Meshy** (meshy.ai) — Sangat bagus untuk material logam mengkilap (chrome/gold).
   - **Rodin (Deemos)** — Sangat tinggi detail faset dan siluet.
   - **Hunyuan3D** — Open-source / API alternatif.
2. **Format Ekspor**:
   - Pilih format: **`GLB` (Binary glTF)**.
   - Texture resolution: **1024x1024** atau **2048x2048**.
   - Target Polygon Count: **20k – 60k tris** (cukup ringan untuk web, sangat tajam).
3. **Penyimpanan**:
   - Simpan langsung file hasil ekspor ke dalam folder ini (`web/public/models/trophies/`) dengan nama file persis seperti tabel di atas (contoh: `champion.glb`).
   - Begitu file diletakkan di sini, halaman `/awards` akan langsung beralih memuat model GLB tersebut.
