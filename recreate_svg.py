import matplotlib.pyplot as plt
from PIL import Image
import numpy as np
import pymupdf

# 1. Extract vector path for monogram
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

# Build complete SVG matching cover_artwork_s1.png exactly
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 840 1188">
  <title>RIVALS SERIES — SEASON 1</title>
  
  <!-- Background: Deep Midnight Tactical Navy (#0C1728) -->
  <rect width="840" height="1188" fill="#0C1728"/>

  <!-- Football pitch tactical wireframe on right side -->
  <g fill="none" stroke="#7D8794" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
    <!-- Top Penalty Area & Goal Area -->
    <path d="M548 0 V76 H840"/>
    <path d="M618 76 V132 H840"/>
    <!-- Top Penalty Arc -->
    <path d="M686 132 A 92 92 0 0 0 834 132"/>
    
    <!-- Central Vertical Axis Line -->
    <path d="M760 178 V1010"/>
    
    <!-- Horizontal Crossline -->
    <path d="M498 612 H840"/>
    
    <!-- Center Circle (r = 262, cx = 760, cy = 612) -->
    <circle cx="760" cy="612" r="262"/>
    
    <!-- Bottom Penalty Arc -->
    <path d="M686 1056 A 92 92 0 0 1 834 1056"/>
    <!-- Bottom Penalty Area & Goal Area -->
    <path d="M618 1056 V1112 H840"/>
    <path d="M548 1112 V1188 H840"/>
  </g>
  
  <!-- Center Spot / Crosshair Dot -->
  <circle cx="760" cy="612" r="16" fill="#8E9AA7" stroke="none"/>

  <!-- RS Monogram (exact vector geometry from original) -->
  <g transform="translate(80, 86) scale(0.95)" fill="#EEE6DA">
    <path d="{svg_r}"/>
    <path d="{svg_s}"/>
  </g>

  <!-- Eyebrow: OFFICIAL COMPETITION REGULATIONS -->
  <text x="82" y="196" fill="#EEE6DA" font-family="'Arial', 'Helvetica', sans-serif" font-size="13" font-weight="600" letter-spacing="4.5">OFFICIAL COMPETITION REGULATIONS</text>

  <!-- Main Title: RIVALS SERIES -->
  <text x="78" y="374" fill="#EEE6DA" font-family="'Impact', 'Arial Black', 'Arial Narrow', sans-serif" font-size="142" font-weight="900" letter-spacing="-1.5">RIVALS</text>
  <text x="78" y="500" fill="#EEE6DA" font-family="'Impact', 'Arial Black', 'Arial Narrow', sans-serif" font-size="142" font-weight="900" letter-spacing="-1.5">SERIES</text>

  <!-- Competition Crimson Accent Bar (#E53430) -->
  <path d="M82 534 H148" stroke="#E53430" stroke-width="6.5" stroke-linecap="square"/>

  <!-- Season Title: SEASON 1 -->
  <text x="80" y="618" fill="#EEE6DA" font-family="'Impact', 'Arial Black', 'Arial Narrow', sans-serif" font-size="64" font-weight="900" letter-spacing="0.5">SEASON 1</text>
  
  <!-- Subtitle: eFootball · 1v1 COMPETITION -->
  <text x="82" y="660" fill="#EEE6DA" font-family="'Arial', 'Helvetica', sans-serif" font-size="17" font-weight="500" letter-spacing="1.5">eFootball • 1v1 COMPETITION</text>

  <!-- Publication Footer -->
  <text x="82" y="1102" fill="#EEE6DA" font-family="'Arial', 'Helvetica', sans-serif" font-size="13" font-weight="500" letter-spacing="3.2">REGULATIONS EDITION • VERSION 1.0</text>
</svg>'''

# Save SVG to local and to Downloads
with open('rivals_series_season_1_cover_recreated.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

download_svg = r'C:\Users\Arya Rizky\Downloads\rivals_series_season_1_cover.svg'
with open(download_svg, 'w', encoding='utf-8') as f:
    f.write(svg_content)

print(f'Saved perfected SVG to {download_svg}')

# Render SVG to high-res PNG for Word
doc = pymupdf.open('rivals_series_season_1_cover_recreated.svg')
# Render at 300 DPI for ultra crisp print quality: 2480 x 3508
pix = doc[0].get_pixmap(dpi=300)
out_png = 'cover_artwork_s1.png'
pix.save(out_png)
print(f'Rendered SVG to {out_png} at {pix.width}x{pix.height} (300 DPI)')
