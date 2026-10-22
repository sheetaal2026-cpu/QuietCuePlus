import sys
import os
sys.path.insert(0, r'c:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages')
from PIL import Image, ImageDraw, ImageFont, ImageFilter

user_img_path = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\.user_uploaded\media_1792573472999_a1b2750e.png'
img = Image.open(user_img_path).convert("RGBA")
w, h = img.size

# High-resolution 4x supersampling for razor sharp vector-like text
scale = 4
hi_w, hi_h = w * scale, h * scale
hi_img = img.resize((hi_w, hi_h), Image.Resampling.LANCZOS)
draw = ImageDraw.Draw(hi_img)

# 1. ON WALL TV:
tv_bg_color = (35, 41, 48, 255) # deep slate grey matching TV display
draw.rectangle([58 * scale, 98 * scale, 190 * scale, 162 * scale], fill=tv_bg_color)

font_tv_title = ImageFont.truetype("arialbd.ttf", int(14 * scale))
font_tv_plus = ImageFont.truetype("arialbd.ttf", int(17 * scale))
font_tv_sub = ImageFont.truetype("arial.ttf", int(6.5 * scale))
font_tv_badge = ImageFont.truetype("arialbd.ttf", int(5.5 * scale))

tv_cx = int(124 * scale)
tv_y = int(108 * scale)

bbox_q = draw.textbbox((0, 0), "QUIETCUE", font=font_tv_title)
qw = bbox_q[2] - bbox_q[0]
bbox_p = draw.textbbox((0, 0), "+", font=font_tv_plus)
pw = bbox_p[2] - bbox_p[0]
total_w = qw + pw + 2

start_x = tv_cx - total_w // 2
draw.text((start_x, tv_y), "QUIETCUE", fill=(255, 255, 255, 255), font=font_tv_title)
draw.text((start_x + qw + 2, tv_y - int(1 * scale)), "+", fill=(56, 189, 248, 255), font=font_tv_plus)

sub_text = "ALEXA+  |  FIRE TV"
bbox_sub = draw.textbbox((0, 0), sub_text, font=font_tv_sub)
sub_w = bbox_sub[2] - bbox_sub[0]
draw.text((tv_cx - sub_w // 2, tv_y + int(16 * scale)), sub_text, fill=(148, 163, 184, 255), font=font_tv_sub)

badge_y = int(141 * scale)
badge_h = int(16 * scale)
badge_w = int(118 * scale)
badge_x0 = tv_cx - badge_w // 2
badge_x1 = tv_cx + badge_w // 2

draw.rounded_rectangle([badge_x0, badge_y, badge_x1, badge_y + badge_h], radius=int(4 * scale), fill=(18, 24, 34, 230), outline=(56, 189, 248, 180), width=int(1 * scale))

alert_line1 = "ALERT: QuietCue+ Active  |  Immersion Protected"
alert_line2 = "Live Playback  |  Mode: Feature Night"
bbox_al1 = draw.textbbox((0, 0), alert_line1, font=font_tv_badge)
draw.text((tv_cx - (bbox_al1[2] - bbox_al1[0]) // 2, badge_y + int(2.5 * scale)), alert_line1, fill=(248, 250, 252, 255), font=font_tv_badge)
bbox_al2 = draw.textbbox((0, 0), alert_line2, font=font_tv_badge)
draw.text((tv_cx - (bbox_al2[2] - bbox_al2[0]) // 2, badge_y + int(9 * scale)), alert_line2, fill=(56, 189, 248, 255), font=font_tv_badge)

# 2. ON LAPTOP SCREEN (NATURAL SCREEN INTEGRATION - NO OPAQUE TOP LAYER BOX):
# In the original photograph, the laptop screen has code and QUIETCUE naturally embedded into the screen's code/IDE.
# Rather than slapping an opaque rectangular box on top of the laptop screen, we seamlessly blend the glowing cyan '+'
# right onto the laptop display so it naturally forms 'QUIETCUE+' as an authentic part of the screen!
font_lap_plus = ImageFont.truetype("arialbd.ttf", int(9 * scale))
plus_x = int(366 * scale)
plus_y = int(183.5 * scale)

# Soft natural screen glow for '+' to match laptop display depth of field
draw.text((plus_x - 1, plus_y), "+", fill=(56, 189, 248, 140), font=font_lap_plus)
draw.text((plus_x + 1, plus_y), "+", fill=(56, 189, 248, 140), font=font_lap_plus)
draw.text((plus_x, plus_y - 1), "+", fill=(56, 189, 248, 140), font=font_lap_plus)
draw.text((plus_x, plus_y + 1), "+", fill=(56, 189, 248, 140), font=font_lap_plus)
draw.text((plus_x, plus_y), "+", fill=(56, 189, 248, 255), font=font_lap_plus)

# Downscale to crisp master 1920x1282
final_img = hi_img.resize((1920, int(1920 * h / w)), Image.Resampling.LANCZOS).convert("RGB")

# Save to all target locations
targets = [
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\top_hero_scene.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\hero_living_room.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\hero_living_room_clean.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\crop_hero_tv.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\mock_tv_hero.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\firetv_player_bg.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\public\quietcue_tv_display.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\dist\top_hero_scene.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\dist\firetv_player_bg.jpg',
    r'c:\Users\sheet\Documents\AIDetector\QuietCue\frontend\dist\hero_living_room.jpg'
]

for t in targets:
    final_img.save(t, quality=95)
    print(f"Saved: {t} ({os.path.getsize(t)} bytes)")

print("\nSUCCESS: QuietCue+ accurately integrated as part of laptop screen and TV display!")
