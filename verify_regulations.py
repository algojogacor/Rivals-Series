import os
import re
import sys
import fitz  # PyMuPDF

sys.stdout.reconfigure(encoding='utf-8')

def verify():
    pdf_path = "RS_S1_Official_Regulations.pdf"
    docx_path = "RS_S1_Official_Regulations.docx"
    
    print(f"Checking files exist:")
    print(f"DOCX: {os.path.exists(docx_path)} (size: {os.path.getsize(docx_path)} bytes)")
    print(f"PDF: {os.path.exists(pdf_path)} (size: {os.path.getsize(pdf_path)} bytes)")
    
    doc = fitz.open(pdf_path)
    page_count = len(doc)
    print(f"\nPDF Total Page Count: {page_count}")
    
    full_pdf_text = ""
    for page_num in range(page_count):
        page = doc[page_num]
        txt = page.get_text()
        full_pdf_text += f"\n--- PAGE {page_num + 1} ---\n" + txt

    norm_text = " ".join(full_pdf_text.split()).lower()

    # 1. Check BABs in PDF
    babs_found = []
    for b_num in ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]:
        m = re.search(rf'bab {b_num.lower()}\s*[—–-]', norm_text)
        if m:
            babs_found.append(b_num)
    print(f"\nBABs matched in PDF ({len(babs_found)}/12): {babs_found}")

    # 2. Check Pasals in PDF
    pasals_found = []
    missing_pasals = []
    for p_num in range(1, 55):
        m = re.search(rf'pasal {p_num}\s*[—–-]', norm_text)
        if m:
            pasals_found.append(p_num)
        else:
            missing_pasals.append(p_num)

    print(f"Pasals matched in PDF ({len(pasals_found)}/54): {len(pasals_found)}")
    if missing_pasals:
        print(f"MISSING PASALS: {missing_pasals}")
    else:
        print("ALL 54 PASALS ARE CONFIRMED PRESENT IN PDF!")

    # 3. Check Key Requirements from BOOK_PROMPT.md
    checks = [
        ("Total 20 MD flexibel", "20 matchday"),
        ("MD1–MD10 Group Stage setting", "group stage"),
        ("MD11–MD20 Knockout Stage setting", "knockout stage"),
        ("Poin Menang 3, Seri 1, Kalah 0", "menang 3"),
        ("Formula GD = GF − GA", "gd = gf"),
        ("Formula G_adj > 3 × R", "g_adj > 3"),
        ("Trending min 2 pemain 1 babak penuh", "dua (2) pemain bertipe kartu trending secara bersamaan"),
        ("Indonesia DSP seluruh MD", "pemain indonesia dalam dsp pada setiap md"),
        ("Indonesia kuota 5 kredit babak", "lima (5) kredit babak indonesia"),
        ("Indonesia pinalti -3 poin", "pengurangan tiga (3) poin dari total poin klasemennya"),
        ("Batas skuad 26 kartu", "26 identitas kartu pemain"),
        ("Perubahan skuad setelah MD10", "setelah md10 selesai"),
        ("Rekonstruksi gangguan koneksi", "rekonstruksi waktu dan skor, bukan restart biasa dari 0–0"),
        ("Undian koin digital fallback", "undian koin digital"),
        ("Pemetaan koin Heads/Tails", "heads = peserta a; tails = peserta b"),
        ("Gangguan ke-3 forfeit 0-3", "gangguan ketiga yang dapat diatribusikan secara objektif"),
        ("Birdcaging 30s gameplay nyata", "30 detik waktu nyata pada rekaman gameplay"),
        ("Sanksi birdcaging bertingkat", "peringatan resmi yang dicatat dalam log disiplin"),
        ("Beban pembuktian pada penuduh", "beban pembuktian atas suatu tuduhan berada pada pihak yang mengajukan tuduhan"),
        ("AI Adjudicator batas wewenang", "ai adjudicator tidak boleh menciptakan pelanggaran atau sanksi baru"),
        ("Poin Goal of the Season 4-3-2-1", "peringkat pertama: 4 poin"),
        ("Tiebreaker Goal of the Season lawan", "peserta yang bukan pemilik nominasi tersebut"),
        ("RS Champion S1", "rs champion s1"),
        ("Golden Boot S1", "golden boot s1"),
        ("Golden Glove S1", "golden glove s1"),
        ("Best Defence S1", "best defence s1"),
        ("Goal of the Season S1", "goal of the season s1"),
        ("Longest Winning Streak S1", "longest winning streak s1"),
        ("Most Clean Sheets S1", "most clean sheets s1"),
        ("Non-affiliation / Non-endorsement disclaimer", "tidak berafiliasi secara resmi dengan konami"),
        ("Halaman Persetujuan", "halaman persetujuan"),
        ("Rujukan Lampiran WhatsApp", "rujukan lampiran administratif (appendix a–e)"),
    ]

    print("\n--- Key Requirement Text Verification in PDF ---")
    all_passed = True
    for label, term in checks:
        found = term.lower() in norm_text
        status = "PASS" if found else "FAIL"
        if not found:
            all_passed = False
        print(f"[{status}] {label}: '{term[:45]}'")

    print(f"\nAll key terms check result: {'ALL PASSED' if all_passed else 'SOME FAILED'}")
    return all_passed

if __name__ == "__main__":
    verify()
