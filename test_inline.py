import pymupdf

svg_test = '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
<rect width="400" height="300" fill="#0C1728"/>
<circle cx="200" cy="150" r="80" fill="none" stroke="#7D8794" stroke-width="2.5"/>
<text x="50" y="80" fill="#EEE6DA" font-family="Arial, sans-serif" font-size="40" font-weight="900">RIVALS</text>
<text x="50" y="160" fill="#EEE6DA" font-family="Arial Narrow, sans-serif" font-size="40" font-weight="bold">RIVALS</text>
<g transform="scale(0.85, 1)"><text x="60" y="240" fill="#EEE6DA" font-family="Arial, sans-serif" font-size="40" font-weight="900">RIVALS</text></g>
</svg>'''

with open('test_inline.svg', 'w') as f:
    f.write(svg_test)
doc = pymupdf.open('test_inline.svg')
doc[0].get_pixmap().save('test_inline.png')
print('Saved test_inline.png')
