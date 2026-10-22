import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image

crop = Image.open(r'c:\Users\sheet\Documents\AIDetector\QuietCue\scripts\laptop_natural_test.png')
# Downscale back to 1x to see true pixel scale
crop_1x = crop.resize((crop.width // 4, crop.height // 4), Image.Resampling.LANCZOS)
crop_1x.save(r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\laptop_natural_1x.png')
print("Saved laptop natural 1x")
