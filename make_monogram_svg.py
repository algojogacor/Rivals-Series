import matplotlib.pyplot as plt
from PIL import Image
import numpy as np
import pymupdf

im = Image.open('rs_monogram_crop.png').convert('L')
arr = np.array(im)

fig, ax = plt.subplots()
cs = ax.contour(arr, levels=[110])

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

with open('test_monogram.svg', 'w') as f:
    f.write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 110" width="300" height="220">
<rect width="150" height="110" fill="#0C1728"/>
<path d="{svg_r}" fill="#EEE6DA"/>
<path d="{svg_s}" fill="#EEE6DA"/>
</svg>''')

doc = pymupdf.open('test_monogram.svg')
pix = doc[0].get_pixmap(dpi=150)
pix.save('test_monogram.png')
print('Saved test_monogram.png successfully!')
