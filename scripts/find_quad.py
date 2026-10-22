import sys
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image, ImageDraw

src = Image.open(r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\.user_uploaded\media_1792573472999_a1b2750e.png').convert("RGBA")
# Let's inspect the laptop screen corners
# Looking at the laptop screen in media_1792576231045_c3c9156a.png:
# Top-left corner of the screen: around (298, 142)
# Top-right corner of the screen: around (392, 160)
# Bottom-left corner of the screen: around (290, 222)
# Bottom-right corner of the screen: around (388, 240)
# Let's draw test markers on a copy to verify exact screen boundaries
test_img = src.copy()
draw = ImageDraw.Draw(test_img)

corners = [(298, 142), (394, 160), (390, 238), (292, 222)]
for i in range(4):
    p1 = corners[i]
    p2 = corners[(i+1)%4]
    draw.line([p1, p2], fill=(255, 0, 0, 255), width=1)

test_img.crop((270, 130, 420, 255)).save(r'c:\Users\sheet\Documents\AIDetector\QuietCue\scripts\screen_quad_test.png')
print("Saved screen quad test")
