import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image

img = Image.open(r'c:\Users\sheet\Documents\AIDetector\QuietCue\scripts\feedback_8_full.png').convert("RGB")
w, h = img.size

# Let's inspect where dark regions vs bright text are
print(f"Feedback 8: {w}x{h}")
# Let's check a few crops across the image width
for i, x in enumerate(range(0, w, 200)):
    crop = img.crop((x, 0, min(x+200, w), h))
    crop.save(rf'c:\Users\sheet\Documents\AIDetector\QuietCue\scripts\f8_part_{i}.png')
print("Saved parts")
