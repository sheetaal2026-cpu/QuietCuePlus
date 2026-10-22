import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image

img = Image.open(r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\user_feedback_8.png')
w, h = img.size
print(f"Feedback image: {w}x{h}")
# Let's save slices to inspect
img.crop((0, 0, w//2, h)).save(r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\feedback_left.png')
img.crop((w//2, 0, w, h)).save(r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\feedback_right.png')
