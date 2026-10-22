import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image

img = Image.open(r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\orig_laptop_full.png').convert("L")
w, h = img.size

# Let's print ASCII art of the laptop screen around y=38..55, x=35..105
print("ASCII art of original laptop screen text:")
for y in range(38, 56):
    line = ""
    for x in range(35, 110):
        val = img.getpixel((x, y))
        line += "#" if val > 120 else ("." if val > 80 else " ")
    print(f"{y:02d}: {line}")
