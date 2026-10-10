import matplotlib.pyplot as plt
from PIL import Image
import numpy as np
import pymupdf

# Extract vector paths for the exact RS monogram from cover_artwork_original.png
im_mono = Image.open('rs_monogram_crop.png').convert('L')
arr_mono = np.array(im_mono)

fig, ax = plt.subplots()
cs = ax.contour(arr_mono, levels=[110])

def points_to_svg_path(pts):
    d = []
    step = 2
    pts_sub = pts[::step]
    if not np.allclose(pts_sub[-1], pts[0]):
        pts_sub = np.vstack([pts_sub, pts[0]])
    for i, pt in enumerate(pts_sub):
        cmd = 'M' if i == 0 else 'L'
        d.append(f'{cmd}{pt[0]:.2f},{pt[1]:.2f}')
    d.append('Z')
    return ' '.join(d)

svg_r = points_to_svg_path(cs.allsegs[0][0])
svg_s = points_to_svg_path(cs.allsegs[0][1])

# Build complete SVG matching cover_artwork_original.png with pure inline presentation attributes
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 840 1188">
  <title>RIVALS SERIES — SEASON 1</title>
  <desc>Official Regulations Cover for Rivals Series Season 1</desc>

  <!-- Full-bleed background: Deep Midnight Tactical Navy (#0C1728) -->
  <rect width="840" height="1188" fill="#0C1728"/>

  <!-- Football pitch tactical wireframe (clean silver stroke, fill none) -->
  <g fill="none" stroke="#7D8794" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
    <!-- Top outer penalty box -->
    <path d="M549 0 V76 H840"/>
    <!-- Top inner goal box -->
    <path d="M618 76 V128 H840"/>
    <!-- Top penalty arc -->
    <path d="M686 128 A 92 92 0 0 0 834 128"/>
    
    <!-- Central vertical axis line (touches top and bottom penalty arcs) -->
    <path d="M760 178 V1010"/>
    
    <!-- Central horizontal line (from left edge of circle across to right border) -->
    <path d="M498 613 H840"/>
    
    <!-- Center circle (r = 262) -->
    <circle cx="760" cy="613" r="262"/>
    
    <!-- Bottom penalty arc -->
    <path d="M686 1060 A 92 92 0 0 1 834 1060"/>
    <!-- Bottom inner goal box -->
    <path d="M618 1060 V1112 H840"/>
    <!-- Bottom outer penalty box -->
    <path d="M549 1112 V1188 H840"/>
  </g>
  
  <!-- Center spot / dot -->
  <circle cx="760" cy="613" r="16" fill="#8E9AA7" stroke="none"/>

  <!-- Geometric RS Monogram (exact vector paths from original artwork) -->
  <g transform="translate(80, 86) scale(0.796)" fill="#EEE6DA">
    <path d="{svg_r}"/>
    <path d="{svg_s}"/>
  </g>

  <!-- Eyebrow: OFFICIAL COMPETITION REGULATIONS -->
  <text x="82" y="196" fill="#EEE6DA" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" letter-spacing="4.5">OFFICIAL COMPETITION REGULATIONS</text>

  <!-- Main Title: RIVALS SERIES (Condensed bold typography matching original) -->
  <text x="80" y="378" fill="#EEE6DA" font-family="Arial Narrow, Roboto Condensed, sans-serif" font-size="152" font-weight="bold" letter-spacing="-2">RIVALS</text>
  <text x="80" y="504" fill="#EEE6DA" font-family="Arial Narrow, Roboto Condensed, sans-serif" font-size="152" font-weight="bold" letter-spacing="-2">SERIES</text>

  <!-- Competition Crimson Accent Bar (#E53430) -->
  <path d="M82 534 H146" stroke="#E53430" stroke-width="6.5" stroke-linecap="square"/>

  <!-- Season Title: SEASON 1 -->
  <text x="80" y="618" fill="#EEE6DA" font-family="Arial Narrow, Roboto Condensed, sans-serif" font-size="64" font-weight="bold" letter-spacing="0.5">SEASON 1</text>
  
  <!-- Subtitle: eFootball · 1v1 COMPETITION -->
  <text x="82" y="654" fill="#EEE6DA" font-family="Arial, Helvetica, sans-serif" font-size="16.5" font-weight="500" letter-spacing="1.5">eFootball • 1v1 COMPETITION</text>

  <!-- Publication Footer -->
  <text x="82" y="1102" fill="#EEE6DA" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="500" letter-spacing="3.2">REGULATIONS EDITION • VERSION 1.0</text>
</svg>'''

# Save to Downloads and workspace
download_svg = r'C:\Users\Arya Rizky\Downloads\rivals_series_season_1_cover.svg'
with open(download_svg, 'w', encoding='utf-8') as f:
    f.write(svg_content)
print(f'Wrote to {download_svg}')

workspace_svg = 'rivals_series_season_1_cover.svg'
with open(workspace_svg, 'w', encoding='utf-8') as f:
    f.write(svg_content)
print(f'Wrote to {workspace_svg}')

# Render to 300 DPI PNG
doc = pymupdf.open(workspace_svg)
pix = doc[0].get_pixmap(dpi=300)
out_png = 'cover_artwork_s1.png'
pix.save(out_png)
print(f'Rendered SVG to {out_png} at {pix.width}x{pix.height}')
