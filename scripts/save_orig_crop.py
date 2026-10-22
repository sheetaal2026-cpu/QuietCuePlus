import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image

orig = Image.open(r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\.user_uploaded\media_1792573472999_a1b2750e.png')
# Crop laptop
crop = orig.crop((280, 140, 410, 245))
crop.save(r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\orig_laptop_full.png')
print("Original laptop crop saved to frontend/public/orig_laptop_full.png")
