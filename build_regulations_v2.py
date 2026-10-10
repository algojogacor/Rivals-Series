import os
import re
import sys
import docx
from docx.shared import Inches, Pt, RGBColor, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls
import win32com.client

# Palette Definitions: Mature Editorial Federation Palette
HEX_DARK_PRIMARY = "0F172A"      # Slate 900 / Deep Midnight Navy
HEX_DARK_SECONDARY = "334155"    # Slate 700 / Dark Slate
HEX_DARK_BODY = "1E293B"         # Slate 800 / Charcoal Body Text
HEX_MUTED = "64748B"             # Slate 500 / Muted Metadata & Headers
HEX_ACCENT_GOLD = "C5A059"       # Muted Classic League Gold
HEX_BG_TINT = "F8FAFC"           # Slate 50 / Subtle Table Header & Box Tint
HEX_BORDER_RULE = "CBD5E1"       # Slate 300 / Editorial Divider Hairline
HEX_INNER_RULE = "E2E8F0"        # Slate 200 / Subtle Interior Table Rule
HEX_WHITE = "FFFFFF"

COLOR_DARK_PRIMARY = RGBColor(0x0F, 0x17, 0x2A)
COLOR_DARK_SECONDARY = RGBColor(0x33, 0x41, 0x55)
COLOR_DARK_BODY = RGBColor(0x1E, 0x29, 0x3B)
COLOR_MUTED = RGBColor(0x64, 0x74, 0x8B)
COLOR_ACCENT_GOLD = RGBColor(0xC5, 0xA0, 0x59)

FONT_FAMILY = "Arial"

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=110, right=110):
    # Twips: 20 twips = 1 pt
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    borders = {'top': top, 'bottom': bottom, 'left': left, 'right': right}
    for edge, val in borders.items():
        if val:
            sz, b_type, col = val
            b_xml = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="{b_type}" w:sz="{sz}" w:space="0" w:color="{col}"/>')
            tcBorders.append(b_xml)
        else:
            b_xml = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="none"/>')
            tcBorders.append(b_xml)
    tcPr.append(tcBorders)

def add_inline_runs(paragraph, text, base_size=Pt(10), base_color=COLOR_DARK_BODY, base_font=FONT_FAMILY):
    tokens = re.split(r'(\*\*.*?\*\*|`.*?`|\*.*?\*)', text)
    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**'):
            run = paragraph.add_run(token[2:-2])
            run.font.name = base_font
            run.font.size = base_size
            run.font.bold = True
            run.font.color.rgb = COLOR_DARK_PRIMARY
        elif token.startswith('*') and token.endswith('*'):
            run = paragraph.add_run(token[1:-1])
            run.font.name = base_font
            run.font.size = base_size
            run.font.italic = True
            run.font.color.rgb = base_color
        elif token.startswith('`') and token.endswith('`'):
            run = paragraph.add_run(token[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(base_size.pt * 0.95)
            run.font.bold = True
            run.font.color.rgb = COLOR_DARK_PRIMARY
        else:
            run = paragraph.add_run(token)
            run.font.name = base_font
            run.font.size = base_size
            run.font.color.rgb = base_color

def add_hairline_divider(doc, color=HEX_BORDER_RULE, space_before=2, space_after=6, sz="4"):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="{sz}" w:space="1" w:color="{color}"/></w:pBdr>')
    pPr.append(pBdr)

def format_booktabs_table(doc, col_widths, headers, rows_data, align_right_cols=[], align_center_cols=[]):
    # Total table width should be 6.38 inches (162 mm)
    table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    # Booktabs table borders: Top 1.0pt, Bottom 1.0pt, No vertical borders
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="8" w:space="0" w:color="{HEX_DARK_PRIMARY}"/>'
        f'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="{HEX_DARK_PRIMARY}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="single" w:sz="2" w:space="0" w:color="{HEX_INNER_RULE}"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(tblBorders)
    
    # Header Row
    hdr_row = table.rows[0]
    trPr = hdr_row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
    
    for i, title in enumerate(headers):
        cell = hdr_row.cells[i]
        cell.width = Inches(col_widths[i])
        set_cell_background(cell, HEX_BG_TINT)
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        # Add bottom border under header row
        set_cell_borders(cell, bottom=(6, "single", HEX_DARK_PRIMARY))
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        if i in align_right_cols:
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        elif i in align_center_cols:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            
        run = p.add_run(title)
        run.font.name = FONT_FAMILY
        run.font.size = Pt(9)
        run.font.bold = True
        run.font.color.rgb = COLOR_DARK_PRIMARY
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    # Data Rows
    for r_idx, r_data in enumerate(rows_data):
        row = table.rows[r_idx + 1]
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        # Subtle alternating row tint only for readability
        bg_col = HEX_WHITE if (r_idx % 2 == 0) else HEX_BG_TINT
        
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            cell.width = Inches(col_widths[c_idx])
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=70, bottom=70, left=120, right=120)
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            if c_idx in align_right_cols:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            elif c_idx in align_center_cols:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            add_inline_runs(p, str(val), base_size=Pt(8.5), base_color=COLOR_DARK_BODY)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

def add_header_footer_v2(section):
    section.different_first_page_header_footer = False
    
    # Running Header
    header = section.header
    header.is_linked_to_previous = False
    for p in header.paragraphs:
        p.text = ""
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        
    htbl = header.add_table(rows=1, cols=2, width=Inches(6.378))
    htbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    htbl.autofit = False
    
    tblPr_h = htbl._tbl.tblPr
    tblPr_h.append(parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="none"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="3" w:color="{HEX_INNER_RULE}"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="none"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    ))
    
    # Cell 0 (Left)
    hc0 = htbl.cell(0, 0)
    hc0.width = Inches(4.2)
    set_cell_margins(hc0, top=0, bottom=30, left=0, right=0)
    hp0 = hc0.paragraphs[0]
    hp0.alignment = WD_ALIGN_PARAGRAPH.LEFT
    hp0.paragraph_format.space_before = Pt(0)
    hp0.paragraph_format.space_after = Pt(0)
    hr0 = hp0.add_run("RIVALS SERIES · SEASON 1")
    hr0.font.name = FONT_FAMILY
    hr0.font.size = Pt(8.5)
    hr0.font.bold = True
    hr0.font.color.rgb = COLOR_DARK_SECONDARY
    
    # Cell 1 (Right)
    hc1 = htbl.cell(0, 1)
    hc1.width = Inches(2.178)
    set_cell_margins(hc1, top=0, bottom=30, left=0, right=0)
    hp1 = hc1.paragraphs[0]
    hp1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hp1.paragraph_format.space_before = Pt(0)
    hp1.paragraph_format.space_after = Pt(0)
    hr1 = hp1.add_run("OFFICIAL REGULATIONS")
    hr1.font.name = FONT_FAMILY
    hr1.font.size = Pt(8.5)
    hr1.font.color.rgb = COLOR_MUTED

    # Running Footer
    footer = section.footer
    footer.is_linked_to_previous = False
    for p in footer.paragraphs:
        p.text = ""
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        
    ftbl = footer.add_table(rows=1, cols=2, width=Inches(6.378))
    ftbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    ftbl.autofit = False
    
    tblPr_f = ftbl._tbl.tblPr
    tblPr_f.append(parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="4" w:space="3" w:color="{HEX_INNER_RULE}"/>'
        f'<w:left w:val="none"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'<w:insideH w:val="none"/>'
        f'<w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    ))
    
    # Cell 0 (Left)
    fc0 = ftbl.cell(0, 0)
    fc0.width = Inches(4.2)
    set_cell_margins(fc0, top=30, bottom=0, left=0, right=0)
    fp0 = fc0.paragraphs[0]
    fp0.alignment = WD_ALIGN_PARAGRAPH.LEFT
    fp0.paragraph_format.space_before = Pt(0)
    fp0.paragraph_format.space_after = Pt(0)
    fr0 = fp0.add_run("REGULASI RESMI KOMPETISI · VERSI 1.0-DRAFT")
    fr0.font.name = FONT_FAMILY
    fr0.font.size = Pt(8.5)
    fr0.font.color.rgb = COLOR_MUTED
    
    # Cell 1 (Right)
    fc1 = ftbl.cell(0, 1)
    fc1.width = Inches(2.178)
    set_cell_margins(fc1, top=30, bottom=0, left=0, right=0)
    fp1 = fc1.paragraphs[0]
    fp1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fp1.paragraph_format.space_before = Pt(0)
    fp1.paragraph_format.space_after = Pt(0)
    fr1 = fp1.add_run("Halaman ")
    fr1.font.name = FONT_FAMILY
    fr1.font.size = Pt(8.5)
    fr1.font.color.rgb = COLOR_MUTED
    
    fld1 = parse_xml(f'<w:fldSimple {nsdecls("w")} w:instr="PAGE"/>')
    fp1._p.append(fld1)
    
    fr_mid = fp1.add_run(" dari ")
    fr_mid.font.name = FONT_FAMILY
    fr_mid.font.size = Pt(8.5)
    fr_mid.font.color.rgb = COLOR_MUTED
    
    fld2 = parse_xml(f'<w:fldSimple {nsdecls("w")} w:instr="NUMPAGES"/>')
    fp1._p.append(fld2)

def build_cover_page_v2(doc):
    sec = doc.sections[0]
    sec.page_width = Mm(210)
    sec.page_height = Mm(297)
    sec.top_margin = Mm(24)
    sec.bottom_margin = Mm(24)
    sec.left_margin = Mm(24)
    sec.right_margin = Mm(24)
    
    # 1. Top Organization Eyebrow
    p_top = doc.add_paragraph()
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_top.paragraph_format.space_before = Pt(8)
    p_top.paragraph_format.space_after = Pt(4)
    r_top = p_top.add_run("RIVALS SERIES  ·  COMPETITION GOVERNANCE")
    r_top.font.name = FONT_FAMILY
    r_top.font.size = Pt(8.5)
    r_top.font.bold = True
    r_top.font.color.rgb = COLOR_MUTED
    
    # Hairline divider under eyebrow
    add_hairline_divider(doc, color=HEX_BORDER_RULE, space_before=0, space_after=32, sz="4")
    
    # 2. Minimalist Typographic Emblem
    mono_table = doc.add_table(rows=1, cols=1)
    mono_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    mono_table.autofit = False
    cell = mono_table.cell(0, 0)
    cell.width = Inches(1.8)
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="8" w:space="0" w:color="{HEX_DARK_PRIMARY}"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="{HEX_DARK_PRIMARY}"/><w:left w:val="single" w:sz="8" w:space="0" w:color="{HEX_DARK_PRIMARY}"/><w:right w:val="single" w:sz="8" w:space="0" w:color="{HEX_DARK_PRIMARY}"/></w:tcBorders>'))
    tcPr.append(parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar>'))
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{HEX_BG_TINT}"/>'))
    
    p_m1 = cell.paragraphs[0]
    p_m1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_m1.paragraph_format.space_before = Pt(2)
    p_m1.paragraph_format.space_after = Pt(0)
    r_m1 = p_m1.add_run("RS")
    r_m1.font.name = FONT_FAMILY
    r_m1.font.size = Pt(32)
    r_m1.font.bold = True
    r_m1.font.color.rgb = COLOR_DARK_PRIMARY
    
    p_m2 = cell.add_paragraph()
    p_m2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_m2.paragraph_format.space_before = Pt(0)
    p_m2.paragraph_format.space_after = Pt(2)
    r_m2 = p_m2.add_run("EST. 2026")
    r_m2.font.name = FONT_FAMILY
    r_m2.font.size = Pt(7.5)
    r_m2.font.bold = True
    r_m2.font.color.rgb = COLOR_MUTED
    
    # 3. Dominant Title Block
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(28)
    p_title.paragraph_format.space_after = Pt(4)
    r_t1 = p_title.add_run("RIVALS SERIES")
    r_t1.font.name = FONT_FAMILY
    r_t1.font.size = Pt(30)
    r_t1.font.bold = True
    r_t1.font.color.rgb = COLOR_DARK_PRIMARY
    
    p_sub1 = doc.add_paragraph()
    p_sub1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub1.paragraph_format.space_before = Pt(0)
    p_sub1.paragraph_format.space_after = Pt(14)
    r_t2 = p_sub1.add_run("SEASON 1")
    r_t2.font.name = FONT_FAMILY
    r_t2.font.size = Pt(13)
    r_t2.font.bold = True
    r_t2.font.color.rgb = COLOR_ACCENT_GOLD
    
    # Centered Gold Accent Divider (width 3.0 inches)
    p_gold = doc.add_paragraph()
    p_gold.paragraph_format.space_before = Pt(0)
    p_gold.paragraph_format.space_after = Pt(14)
    p_gold.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # Single hairline border for elegance
    pPr_g = p_gold._p.get_or_add_pPr()
    pPr_g.append(parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="{HEX_ACCENT_GOLD}"/></w:pBdr>'))

    # Subtitles
    p_sub2 = doc.add_paragraph()
    p_sub2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub2.paragraph_format.space_before = Pt(0)
    p_sub2.paragraph_format.space_after = Pt(3)
    r_t3 = p_sub2.add_run("REGULASI RESMI KOMPETISI")
    r_t3.font.name = FONT_FAMILY
    r_t3.font.size = Pt(12)
    r_t3.font.bold = True
    r_t3.font.color.rgb = COLOR_DARK_PRIMARY
    
    p_sub3 = doc.add_paragraph()
    p_sub3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub3.paragraph_format.space_before = Pt(0)
    p_sub3.paragraph_format.space_after = Pt(3)
    r_t4 = p_sub3.add_run("OFFICIAL COMPETITION REGULATIONS")
    r_t4.font.name = FONT_FAMILY
    r_t4.font.size = Pt(9.5)
    r_t4.font.color.rgb = COLOR_DARK_SECONDARY
    
    p_desc = doc.add_paragraph()
    p_desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_desc.paragraph_format.space_before = Pt(0)
    p_desc.paragraph_format.space_after = Pt(36)
    r_desc = p_desc.add_run("Buku Peraturan Resmi Kompetisi Sepak Bola Virtual 1v1")
    r_desc.font.name = FONT_FAMILY
    r_desc.font.size = Pt(9)
    r_desc.font.italic = True
    r_desc.font.color.rgb = COLOR_MUTED

    # 4. Publication Colophon Definition Block (Clean Editorial Table)
    meta_tbl = doc.add_table(rows=6, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_tbl.autofit = False
    tblPr = meta_tbl._tbl.tblPr
    tblPr.append(parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="6" w:space="0" w:color="{HEX_BORDER_RULE}"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="{HEX_BORDER_RULE}"/><w:insideH w:val="single" w:sz="2" w:space="0" w:color="{HEX_INNER_RULE}"/><w:left w:val="none"/><w:right w:val="none"/><w:insideV w:val="none"/></w:tblBorders>'))

    meta_rows = [
        ('Status Dokumen', 'Draft Konsolidasi untuk Persetujuan Kedua Peserta'),
        ('Versi Regulasi', '1.0-draft'),
        ('Format Pertandingan', 'eFootball™ Dream Team · Friend Match 1v1'),
        ('Jumlah Matchday', '20 Matchday Reguler (MD1–MD20)'),
        ('Peserta Terdaftar', 'Peserta A & Peserta B'),
        ('Keberlakuan', 'Berlaku Penuh Setelah Persetujuan Kedua Peserta'),
    ]
    for idx, (k, v) in enumerate(meta_rows):
        row = meta_tbl.rows[idx]
        c0 = row.cells[0]
        c1 = row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(3.8)
        for c in [c0, c1]:
            tcPr = c._tc.get_or_add_tcPr()
            tcPr.append(parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>'))
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(0)
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(k)
        r0.font.name = FONT_FAMILY
        r0.font.size = Pt(8.5)
        r0.font.bold = True
        r0.font.color.rgb = COLOR_DARK_SECONDARY
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(v)
        r1.font.name = FONT_FAMILY
        r1.font.size = Pt(8.5)
        r1.font.color.rgb = COLOR_DARK_PRIMARY

    # 5. Bottom Legal Disclaimer
    p_disc_sp = doc.add_paragraph()
    p_disc_sp.paragraph_format.space_before = Pt(36)
    p_disc_sp.paragraph_format.space_after = Pt(0)

    p_disc = doc.add_paragraph()
    p_disc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_disc.paragraph_format.space_before = Pt(0)
    p_disc.paragraph_format.space_after = Pt(0)
    p_disc.paragraph_format.line_spacing = 1.15
    r_d1 = p_disc.add_run("Kompetisi privat non-komersial yang diselenggarakan secara independen oleh dua peserta.\n")
    r_d1.font.name = FONT_FAMILY
    r_d1.font.size = Pt(8)
    r_d1.font.italic = True
    r_d1.font.color.rgb = COLOR_MUTED
    
    r_d2 = p_disc.add_run("Dokumen ini tidak berafiliasi secara resmi dengan KONAMI Digital Entertainment, eFootball™, FIFA, UEFA, atau organisasi kompetisi olahraga lainnya.")
    r_d2.font.name = FONT_FAMILY
    r_d2.font.size = Pt(8)
    r_d2.font.italic = True
    r_d2.font.color.rgb = COLOR_MUTED

def build_doc_control_page_v2(doc):
    # PAGE 2: Kontrol Dokumen dan Status Regulasi
    p_h1 = doc.add_paragraph()
    p_h1.paragraph_format.space_before = Pt(8)
    p_h1.paragraph_format.space_after = Pt(2)
    p_h1.paragraph_format.keep_with_next = True
    r = p_h1.add_run("KONTROL DOKUMEN DAN STATUS REGULASI")
    r.font.name = FONT_FAMILY
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = COLOR_DARK_PRIMARY
    
    add_hairline_divider(doc, color=HEX_DARK_PRIMARY, space_before=1, space_after=14, sz="6")
    
    # Formal Document Metadata in Booktabs style
    headers = ["Parameter", "Ketentuan Administratif"]
    rows = [
        ["Nama kompetisi", "Rivals Series Season 1 (RS S1)"],
        ["Status dokumen", "Draft konsolidasi untuk persetujuan kedua peserta"],
        ["Versi dokumen", "1.0-draft"],
        ["Format pertandingan", "eFootball Dream Team, 1v1"],
        ["Jumlah pertandingan reguler", "20 Matchday (MD1–MD20)"],
        ["Pihak peserta", "Peserta A dan Peserta B"],
        ["Competition Administrator", "Ditetapkan oleh kedua peserta"],
        ["Official Website", "Akan ditambahkan setelah website tersedia"],
        ["Tanggal berlaku", "Setelah kedua peserta menyetujui dokumen ini"],
        ["Sumber aturan primer", "rules.md (Konsolidasi mandiri kedua peserta)"],
    ]
    format_booktabs_table(doc, col_widths=[2.1, 4.28], headers=headers, rows_data=rows)
    
    # Prinsip Utama (Editorial blockquote style, NOT a card/box!)
    p_pr_h = doc.add_paragraph()
    p_pr_h.paragraph_format.space_before = Pt(14)
    p_pr_h.paragraph_format.space_after = Pt(2)
    p_pr_h.paragraph_format.keep_with_next = True
    r_pr_h = p_pr_h.add_run("Prinsip Utama Sumber Aturan")
    r_pr_h.font.name = FONT_FAMILY
    r_pr_h.font.size = Pt(10)
    r_pr_h.font.bold = True
    r_pr_h.font.color.rgb = COLOR_DARK_PRIMARY
    
    # Styled blockquote paragraph with clean left border
    p_bq = doc.add_paragraph()
    p_bq.paragraph_format.left_indent = Inches(0.25)
    p_bq.paragraph_format.space_before = Pt(2)
    p_bq.paragraph_format.space_after = Pt(8)
    p_bq.paragraph_format.line_spacing = 1.15
    pPr_bq = p_bq._p.get_or_add_pPr()
    pPr_bq.append(parse_xml(f'<w:pBdr {nsdecls("w")}><w:left w:val="single" w:sz="12" w:space="8" w:color="{HEX_DARK_SECONDARY}"/></w:pBdr>'))
    
    r_bq = p_bq.add_run("Dokumen ini merupakan sumber aturan utama RS S1 berdasarkan rules.md. Buku resmi, website, pengumuman, dan lampiran harus konsisten dengan rules.md. Tidak ada pihak yang boleh mengubah aturan, hasil, atau sanksi secara sepihak.")
    r_bq.font.name = FONT_FAMILY
    r_bq.font.size = Pt(9.5)
    r_bq.font.italic = True
    r_bq.font.color.rgb = COLOR_DARK_BODY

def build_toc_page_v2(doc):
    # PAGE 3: Dedicated Table of Contents Page
    doc.add_page_break()
    
    p_h1 = doc.add_paragraph()
    p_h1.paragraph_format.space_before = Pt(8)
    p_h1.paragraph_format.space_after = Pt(2)
    p_h1.paragraph_format.keep_with_next = True
    r = p_h1.add_run("DAFTAR ISI")
    r.font.name = FONT_FAMILY
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = COLOR_DARK_PRIMARY
    
    add_hairline_divider(doc, color=HEX_DARK_PRIMARY, space_before=1, space_after=16, sz="6")
    
    # Accurate page numbers from exact layout inspection
    toc_data = [
        ("BAB I", "KETENTUAN UMUM", "4"),
        ("BAB II", "FORMAT KOMPETISI, MATCHDAY, DAN KLASEMEN", "5"),
        ("BAB III", "PENGATURAN PERTANDINGAN", "7"),
        ("BAB IV", "SKUAD, REGISTRASI PEMAIN, DAN PERUBAHAN SKUAD", "8"),
        ("BAB V", "PERSYARATAN KARTU TRENDING DAN PEMAIN INDONESIA", "9"),
        ("BAB VI", "PELAKSANAAN, PELAPORAN, DAN PENGESAHAN HASIL", "11"),
        ("BAB VII", "GANGGUAN KONEKSI DAN REKONSTRUKSI PERTANDINGAN", "12"),
        ("BAB VIII", "SPORTIVITAS, BIRDCAGING, DAN PERILAKU TERLARANG", "14"),
        ("BAB IX", "PELANGGARAN, SANKSI, DAN PENYELESAIAN SENGKETA", "16"),
        ("BAB X", "STATISTIK, PENENTUAN JUARA, DAN PENGHARGAAN", "17"),
        ("BAB XI", "WEBSITE, DATA, DAN ADMINISTRASI KOMPETISI", "20"),
        ("BAB XII", "PERUBAHAN REGULASI DAN KETENTUAN PENUTUP", "21"),
        ("HALAMAN PERSETUJUAN", "Tanda Tangan dan Pengesahan Kedua Peserta", "23"),
        ("LAMPIRAN ADMINISTRATIF", "Rujukan Appendix A–E (Didistribusikan via WhatsApp)", "23"),
    ]
    
    for code, title, p_num in toc_data:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        
        # Native tab stop at 6.378 in (right margin) with dot leaders
        p.paragraph_format.tab_stops.add_tab_stop(Inches(6.378), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
        
        r_code = p.add_run(f"{code}  —  ")
        r_code.font.name = FONT_FAMILY
        r_code.font.size = Pt(9.5)
        r_code.font.bold = True
        r_code.font.color.rgb = COLOR_DARK_PRIMARY
        
        r_title = p.add_run(title)
        r_title.font.name = FONT_FAMILY
        r_title.font.size = Pt(9.5)
        r_title.font.color.rgb = COLOR_DARK_BODY
        
        r_tab = p.add_run("\t")
        
        r_page = p.add_run(f"Halaman {p_num}")
        r_page.font.name = FONT_FAMILY
        r_page.font.size = Pt(9)
        r_page.font.bold = True
        r_page.font.color.rgb = COLOR_DARK_SECONDARY

def build_approval_and_appendix_page_v2(doc):
    doc.add_page_break()
    
    # 1. HALAMAN PERSETUJUAN
    p_h1 = doc.add_paragraph()
    p_h1.paragraph_format.space_before = Pt(8)
    p_h1.paragraph_format.space_after = Pt(2)
    p_h1.paragraph_format.keep_with_next = True
    r = p_h1.add_run("HALAMAN PERSETUJUAN")
    r.font.name = FONT_FAMILY
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = COLOR_DARK_PRIMARY
    
    add_hairline_divider(doc, color=HEX_DARK_PRIMARY, space_before=1, space_after=8, sz="6")
    
    p_intro = doc.add_paragraph()
    p_intro.paragraph_format.space_before = Pt(0)
    p_intro.paragraph_format.space_after = Pt(8)
    p_intro.paragraph_format.line_spacing = 1.15
    r_intro = p_intro.add_run("Dengan menyetujui regulasi ini, kedua peserta menyatakan akan mengikuti RS S1 berdasarkan ketentuan yang tercantum dalam dokumen ini.")
    r_intro.font.name = FONT_FAMILY
    r_intro.font.size = Pt(9.5)
    r_intro.font.color.rgb = COLOR_DARK_BODY
    
    # 3 Clean Legal Signature Frames
    sig_table = doc.add_table(rows=3, cols=1)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_table.autofit = False
    
    signatories = [
        ("PESERTA A", "Nama: ______________________________\nPersetujuan / Tanda Tangan: ______________________________\nTanggal: ______________________________"),
        ("PESERTA B", "Nama: ______________________________\nPersetujuan / Tanda Tangan: ______________________________\nTanggal: ______________________________"),
        ("COMPETITION ADMINISTRATOR", "Nama: ______________________________\nTanggal Penetapan: ______________________________"),
    ]
    
    for idx, (title, lines_text) in enumerate(signatories):
        row = sig_table.rows[idx]
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        cell = row.cells[0]
        cell.width = Inches(6.378)
        set_cell_background(cell, HEX_BG_TINT)
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
        set_cell_borders(
            cell,
            left=(12, "single", HEX_DARK_SECONDARY),
            top=(4, "single", HEX_BORDER_RULE),
            bottom=(4, "single", HEX_BORDER_RULE),
            right=(4, "single", HEX_BORDER_RULE)
        )
        
        p0 = cell.paragraphs[0]
        p0.paragraph_format.space_before = Pt(0)
        p0.paragraph_format.space_after = Pt(2)
        r0 = p0.add_run(title)
        r0.font.name = FONT_FAMILY
        r0.font.size = Pt(9.5)
        r0.font.bold = True
        r0.font.color.rgb = COLOR_DARK_PRIMARY
        
        for l in lines_text.split('\n'):
            p = cell.add_paragraph()
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(l)
            r.font.name = FONT_FAMILY
            r.font.size = Pt(9)
            r.font.color.rgb = COLOR_DARK_BODY
            
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(0)
        sp.paragraph_format.space_after = Pt(3)

    # 2. RUJUKAN LAMPIRAN ADMINISTRATIF (APPENDIX A–E)
    p_h2 = doc.add_paragraph()
    p_h2.paragraph_format.space_before = Pt(10)
    p_h2.paragraph_format.space_after = Pt(2)
    p_h2.paragraph_format.keep_with_next = True
    r_h2 = p_h2.add_run("RUJUKAN LAMPIRAN ADMINISTRATIF (APPENDIX A–E)")
    r_h2.font.name = FONT_FAMILY
    r_h2.font.size = Pt(11)
    r_h2.font.bold = True
    r_h2.font.color.rgb = COLOR_DARK_PRIMARY
    
    add_hairline_divider(doc, color=HEX_BORDER_RULE, space_before=1, space_after=6, sz="4")
    
    p_note = doc.add_paragraph()
    p_note.paragraph_format.space_before = Pt(2)
    p_note.paragraph_format.space_after = Pt(4)
    p_note.paragraph_format.line_spacing = 1.15
    add_inline_runs(
        p_note,
        "Lampiran administratif **Appendix A sampai Appendix E** diterbitkan dan didistribusikan secara terpisah melalui dokumen **`RS_S1_Appendices_WhatsApp.md`** agar praktis disalin dan digunakan langsung dalam percakapan administrasi WhatsApp antarpeserta. Seluruh lampiran tersebut berstatus sebagai perangkat operasional subordinat dan **tidak boleh bertentangan dengan ketentuan buku regulasi ini**.",
        base_size=Pt(9)
    )
    
    appendices_summary = [
        ("Appendix A — Official Fixture List", "Template pemantauan jadwal dan status 20 Matchday (MD1–MD20) tanpa tanggal atau hasil rekaan."),
        ("Appendix B — Official Match Report", "Format pelaporan hasil pertandingan pasca-laga, konfirmasi kedua pihak, catatan rekonstruksi gangguan, dan bukti DSP."),
        ("Appendix C — Official League Table", "Tautan website resmi, panduan kolom klasemen (MP, W, D, L, GF, GA, GD, PTS, ID Credits, Sanctions), dan formula poin."),
        ("Appendix D — Disciplinary and Dispute Register", "Format pelaporan sengketa, bukti gameplay, batas tanggapan 48 jam, adjudikasi AI, dan penegakan aturan status quo."),
        ("Appendix E — Regulations Amendment Log & Pre-MD1 Checklist", "Log pencatatan amendemen resmi regulasi serta checklist penetapan pra-kompetisi (AI Adjudicator, alat undian digital, dan snapshot skuad)."),
    ]
    
    for code, desc in appendices_summary:
        p_app = doc.add_paragraph()
        p_app.paragraph_format.left_indent = Inches(0.22)
        p_app.paragraph_format.first_line_indent = Inches(-0.22)
        p_app.paragraph_format.space_before = Pt(1)
        p_app.paragraph_format.space_after = Pt(1)
        p_app.paragraph_format.line_spacing = 1.15
        
        r_b = p_app.add_run(f"• {code}: ")
        r_b.font.name = FONT_FAMILY
        r_b.font.size = Pt(8.5)
        r_b.font.bold = True
        r_b.font.color.rgb = COLOR_DARK_SECONDARY
        
        r_d = p_app.add_run(desc)
        r_d.font.name = FONT_FAMILY
        r_d.font.size = Pt(8.5)
        r_d.font.color.rgb = COLOR_DARK_BODY

def parse_and_render_body_v2(doc, body_lines):
    idx = 0
    total = len(body_lines)
    is_first_bab = True
    current_pasal_num = 0
    in_pasal_definitions = False
    
    while idx < total:
        line = body_lines[idx].rstrip('\r\n')
        s = line.strip()
        
        if not s:
            idx += 1
            continue
            
        # 1. Heading 1: BAB
        if s.startswith('# BAB '):
            if is_first_bab:
                # Page break before BAB I (starts on fresh Page 4 after TOC)
                doc.add_page_break()
                is_first_bab = False
            
            # Chapter header in 2 clean editorial lines
            # Line 1: BAB X
            # Line 2: TITLE
            parts = s.lstrip('#').strip().split('—')
            bab_label = parts[0].strip()
            bab_title = parts[1].strip() if len(parts) > 1 else ""
            
            p_bab = doc.add_paragraph()
            p_bab.paragraph_format.space_before = Pt(20)
            p_bab.paragraph_format.space_after = Pt(1)
            p_bab.paragraph_format.keep_with_next = True
            
            r_bl = p_bab.add_run(bab_label)
            r_bl.font.name = FONT_FAMILY
            r_bl.font.size = Pt(11)
            r_bl.font.bold = True
            r_bl.font.color.rgb = COLOR_MUTED
            
            p_bt = doc.add_paragraph()
            p_bt.paragraph_format.space_before = Pt(0)
            p_bt.paragraph_format.space_after = Pt(10)
            p_bt.paragraph_format.keep_with_next = True
            
            r_bt = p_bt.add_run(bab_title)
            r_bt.font.name = FONT_FAMILY
            r_bt.font.size = Pt(13)
            r_bt.font.bold = True
            r_bt.font.color.rgb = COLOR_DARK_PRIMARY
            
            pPr_bt = p_bt._p.get_or_add_pPr()
            pPr_bt.append(parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="4" w:space="6" w:color="{HEX_BORDER_RULE}"/></w:pBdr>'))
            idx += 1
            continue
            
        # 2. Heading 2: Pasal
        if s.startswith('## Pasal '):
            m_p = re.match(r'^## Pasal (\d+)', s)
            if m_p:
                current_pasal_num = int(m_p.group(1))
                in_pasal_definitions = (current_pasal_num == 2)
            else:
                in_pasal_definitions = False
                
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            
            pasal_text = s.lstrip('#').strip()
            run = p.add_run(pasal_text)
            run.font.name = FONT_FAMILY
            run.font.size = Pt(11)
            run.font.bold = True
            run.font.color.rgb = COLOR_DARK_PRIMARY
            idx += 1
            continue
            
        # 3. Heading 3: Ayat / Sub-bagian
        if s.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.keep_with_next = True
            
            ayat_text = s.lstrip('#').strip()
            run = p.add_run(ayat_text)
            run.font.name = FONT_FAMILY
            run.font.size = Pt(10)
            run.font.bold = True
            run.font.color.rgb = COLOR_DARK_SECONDARY
            idx += 1
            continue
            
        # 4. Divider '---'
        if s.startswith('---'):
            idx += 1
            continue
            
        # 5. Blockquote / Callout block
        if s.startswith('> '):
            callout_text = s[2:].strip()
            title = ""
            m = re.match(r'^\*\*(.*?)\*\*\s*(.*)$', callout_text)
            if m:
                title = m.group(1)
                callout_text = m.group(2)
                
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.25)
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.line_spacing = 1.15
            pPr = p._p.get_or_add_pPr()
            pPr.append(parse_xml(f'<w:pBdr {nsdecls("w")}><w:left w:val="single" w:sz="12" w:space="8" w:color="{HEX_DARK_SECONDARY}"/></w:pBdr>'))
            
            if title:
                rt = p.add_run(title + " ")
                rt.font.name = FONT_FAMILY
                rt.font.size = Pt(9.5)
                rt.font.bold = True
                rt.font.color.rgb = COLOR_DARK_PRIMARY
                
            add_inline_runs(p, callout_text, base_size=Pt(9.5), base_color=COLOR_DARK_BODY)
            idx += 1
            continue
            
        # 6. Table block
        if s.startswith('|'):
            table_lines = []
            while idx < total and body_lines[idx].strip().startswith('|'):
                table_lines.append(body_lines[idx].strip())
                idx += 1
                
            hdr_line = table_lines[0]
            headers = [c.strip() for c in hdr_line.strip('|').split('|')]
            
            align_line = table_lines[1]
            align_specs = [c.strip() for c in align_line.strip('|').split('|')]
            align_right = [i for i, spec in enumerate(align_specs) if spec.endswith(':') and not spec.startswith(':')]
            align_center = [i for i, spec in enumerate(align_specs) if spec.startswith(':') and spec.endswith(':')]
            
            rows_data = []
            for tl in table_lines[2:]:
                r_cells = [c.strip() for c in tl.strip('|').split('|')]
                rows_data.append(r_cells)
                
            num_cols = len(headers)
            # Available printable width = 6.38 inches
            if num_cols == 2:
                if headers == ["Hasil", "Poin peserta"]:
                    col_widths = [3.38, 3.0]
                elif headers == ["Kolom", "Arti"]:
                    col_widths = [1.68, 4.7]
                elif headers == ["Pengaturan", "Ketentuan"]:
                    col_widths = [3.19, 3.19]
                elif headers == ["Pengaturan", "Status"]:
                    col_widths = [3.38, 3.0]
                elif headers == ["Pemakaian pemain Indonesia", "Kredit"]:
                    col_widths = [4.98, 1.4]
                else:
                    col_widths = [3.19, 3.19]
            elif num_cols == 3:
                col_widths = [2.13, 2.13, 2.12]
            else:
                w = round(6.38 / num_cols, 2)
                col_widths = [w] * num_cols
                col_widths[-1] = 6.38 - sum(col_widths[:-1])
                
            format_booktabs_table(
                doc,
                col_widths=col_widths,
                headers=headers,
                rows_data=rows_data,
                align_right_cols=align_right,
                align_center_cols=align_center
            )
            continue
            
        # 7. Lettered sub-items: '   a. ' or 'a. '
        m_let = re.match(r'^\s*([a-z])\.\s+(.*)$', s)
        if m_let:
            letter = m_let.group(1)
            content = m_let.group(2)
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.48)
            p.paragraph_format.first_line_indent = Inches(-0.20)
            p.paragraph_format.space_before = Pt(1.5)
            p.paragraph_format.space_after = Pt(2.0)
            p.paragraph_format.line_spacing = 1.15
            
            run_lbl = p.add_run(f"{letter}. ")
            run_lbl.font.name = FONT_FAMILY
            run_lbl.font.size = Pt(9.5)
            run_lbl.font.bold = True
            run_lbl.font.color.rgb = COLOR_DARK_SECONDARY
            
            add_inline_runs(p, content, base_size=Pt(9.5))
            idx += 1
            continue
            
        # 8. Numbered items: '1. '
        m_num = re.match(r'^(\d+)\.\s+(.*)$', s)
        if m_num:
            num = m_num.group(1)
            content = m_num.group(2)
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.28)
            p.paragraph_format.first_line_indent = Inches(-0.28)
            p.paragraph_format.space_before = Pt(2.0)
            p.paragraph_format.space_after = Pt(2.5)
            p.paragraph_format.line_spacing = 1.15
            
            # Format label: In definitions or designated subsections, use '1. '
            # In regular pasals, use '(1) ' as standard regulatory format
            if in_pasal_definitions:
                label_str = f"{num}. "
            else:
                label_str = f"({num}) "
                
            run_lbl = p.add_run(label_str)
            run_lbl.font.name = FONT_FAMILY
            run_lbl.font.size = Pt(9.5)
            run_lbl.font.bold = True
            run_lbl.font.color.rgb = COLOR_DARK_PRIMARY
            
            add_inline_runs(p, content, base_size=Pt(9.5))
            idx += 1
            continue
            
        # 9. Bullet items: '- ' or '* '
        if s.startswith('- ') or s.startswith('* '):
            content = s[2:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.28)
            p.paragraph_format.first_line_indent = Inches(-0.16)
            p.paragraph_format.space_before = Pt(1.5)
            p.paragraph_format.space_after = Pt(2.0)
            p.paragraph_format.line_spacing = 1.15
            
            run_lbl = p.add_run("• ")
            run_lbl.font.name = FONT_FAMILY
            run_lbl.font.size = Pt(9.5)
            run_lbl.font.bold = True
            run_lbl.font.color.rgb = COLOR_DARK_SECONDARY
            
            add_inline_runs(p, content, base_size=Pt(9.5))
            idx += 1
            continue
            
        # 10. Regular paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(1.5)
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.line_spacing = 1.15
        add_inline_runs(p, s, base_size=Pt(9.5))
        idx += 1

def main():
    print("Reading rules.md...")
    with open('rules.md', 'r', encoding='utf-8') as f:
        full_text = f.read()
        
    lines = full_text.splitlines()
    
    bab1_idx = -1
    approval_idx = -1
    
    for i, l in enumerate(lines):
        if l.strip().startswith('# BAB I '):
            bab1_idx = i
            break
            
    for i, l in enumerate(lines):
        if l.strip().startswith('# HALAMAN PERSETUJUAN'):
            approval_idx = i
            break
            
    print(f"BAB I starts at line {bab1_idx + 1}")
    print(f"HALAMAN PERSETUJUAN starts at line {approval_idx + 1}")
    
    body_lines = lines[bab1_idx:approval_idx]
    
    doc = docx.Document()
    
    # 1. Build Cover Page (Section 1)
    print("Building Redesigned Cover Page (v2)...")
    build_cover_page_v2(doc)
    
    # 2. Add Section Break for Body (Section 2)
    sec_body = doc.add_section(WD_SECTION.NEW_PAGE)
    sec_body.page_width = Mm(210)
    sec_body.page_height = Mm(297)
    sec_body.top_margin = Mm(24)
    sec_body.bottom_margin = Mm(24)
    sec_body.left_margin = Mm(24)
    sec_body.right_margin = Mm(24)
    
    add_header_footer_v2(sec_body)
    
    # 3. Build Document Control (Page 2) & Dedicated TOC (Page 3)
    print("Building Document Control & Dedicated TOC...")
    build_doc_control_page_v2(doc)
    build_toc_page_v2(doc)
    
    # 4. Parse & Render BAB I through BAB XII
    print("Parsing & Rendering BAB I through BAB XII with official regulatory layout...")
    parse_and_render_body_v2(doc, body_lines)
    
    # 5. Build Approval Page & WhatsApp Appendix Reference (Page 24)
    print("Building Approval Page & WhatsApp Appendix Reference...")
    build_approval_and_appendix_page_v2(doc)
    
    # 6. Save DOCX v2
    docx_path = os.path.abspath("RS_S1_Official_Regulations_v2.docx")
    print(f"Saving DOCX to {docx_path}...")
    doc.save(docx_path)
    print(f"DOCX saved successfully! Size: {os.path.getsize(docx_path)} bytes")
    
    # 7. Convert to PDF v2 via Word COM
    pdf_path = os.path.abspath("RS_S1_Official_Regulations_v2.pdf")
    print(f"Converting DOCX to PDF via Word COM: {pdf_path}...")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    try:
        wb = word.Documents.Open(docx_path)
        wb.Fields.Update()
        wb.SaveAs(pdf_path, FileFormat=17) # 17 = wdFormatPDF
        wb.Close()
        print(f"PDF exported successfully! File size: {os.path.getsize(pdf_path)} bytes")
    finally:
        word.Quit()

if __name__ == "__main__":
    main()
