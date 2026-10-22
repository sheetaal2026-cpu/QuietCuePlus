import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image

src = Image.open(r'c:\Users\sheet\Documents\AIDetector\QuietCue\scripts\laptop_clean.png').convert("RGB")
w, h = src.size

# Let's see if there is text in the original laptop screen
print(f"Laptop clean dimensions: {w}x{h}")
# Let's inspect average row colors
for y in range(0, h, 10):
    row_pixels = [src.getpixel((x, y)) for x in range(0, w, 5)]
    avg_r = sum(p[0] for p in row_pixels) // len(row_pixels)
    avg_g = sum(p[1] for p in row_pixels) // len(row_pixels)
    avg_b = sum(p[2] for p in row_pixels) // len(row_pixels)
    print(f"Row {y}: avg RGB=({avg_r}, {avg_g}, {avg_b})")
