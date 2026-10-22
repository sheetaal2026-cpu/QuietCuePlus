import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image

src = Image.open(r'c:\Users\sheet\Documents\AIDetector\QuietCue\scripts\laptop_full_context.png').convert("RGB")
w, h = src.size

# Let's inspect edges: where is the dark screen of the laptop?
# Laptop screen is usually darker than the bezel or room background.
print(f"Inspecting laptop in context: w={w}, h={h}")
for y in range(10, h-10, 15):
    row = [src.getpixel((x, y)) for x in range(10, w-10, 10)]
    print(f"y={y}: {row[:6]}")
