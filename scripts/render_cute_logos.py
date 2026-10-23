import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_radial_gradient(width, height, center_color, outer_color):
    y, x = np.ogrid[:height, :width]
    cx, cy = width / 2.0, height / 2.0
    r = np.sqrt((x - cx)**2 + (y - cy)**2)
    max_r = np.sqrt(cx**2 + cy**2)
    t = np.clip(r / (max_r * 0.75), 0, 1)
    
    r_chan = (1 - t) * center_color[0] + t * outer_color[0]
    g_chan = (1 - t) * center_color[1] + t * outer_color[1]
    b_chan = (1 - t) * center_color[2] + t * outer_color[2]
    
    rgb = np.stack([r_chan, g_chan, b_chan], axis=-1).astype(np.uint8)
    return Image.fromarray(rgb)

def draw_star(draw, cx, cy, r_outer, r_inner, fill_color):
    points = []
    for i in range(8):
        angle = i * math.pi / 4 - math.pi / 2
        r = r_outer if i % 2 == 0 else r_inner
        px = cx + r * math.cos(angle)
        py = cy + r * math.sin(angle)
        points.append((px, py))
    draw.polygon(points, fill=fill_color)

def draw_kawaii_eye(draw, cx, cy, w, h):
    # Eye base (deep rich navy)
    draw.ellipse([cx - w/2, cy - h/2, cx + w/2, cy + h/2], fill=(22, 24, 45))
    # Big catchlight (top-right)
    cr1 = w * 0.38
    draw.ellipse([cx + w*0.08 - cr1/2, cy - h*0.18 - cr1/2, cx + w*0.08 + cr1/2, cy - h*0.18 + cr1/2], fill=(255, 255, 255))
    # Small catchlight (bottom-left)
    cr2 = w * 0.18
    draw.ellipse([cx - w*0.18 - cr2/2, cy + h*0.22 - cr2/2, cx - w*0.18 + cr2/2, cy + h*0.22 + cr2/2], fill=(255, 255, 255))

def draw_blush(img, cx, cy, rx, ry, color=(255, 120, 150, 110)):
    # Draw soft blurred blush on an overlay
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color)
    overlay = overlay.filter(ImageFilter.GaussianBlur(rx * 0.5))
    img.alpha_composite(overlay)

def render_mochi_stack(size=2048):
    # 1. Background
    bg = create_radial_gradient(size, size, (28, 34, 68), (14, 17, 36)).convert('RGBA')
    draw = ImageDraw.Draw(bg)
    
    # 2. Glowing circular framing
    cx, cy = size / 2.0, size / 2.0
    r_circle = size * 0.42
    
    # Soft outer glow ring
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([cx - r_circle, cy - r_circle, cx + r_circle, cy + r_circle], outline=(94, 234, 212, 60), width=16)
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    bg.alpha_composite(glow)
    
    # Crisp inner ring
    draw.ellipse([cx - r_circle, cy - r_circle, cx + r_circle, cy + r_circle], outline=(255, 255, 255, 45), width=6)
    
    # 3. Stacked Mochi Characters: Bottom (Blue), Middle (Lavender), Top (Mint)
    # Character 1: Bottom Mochi (Big, chubby, stable base)
    b_cx = cx
    b_cy = cy + size * 0.18
    b_rx = size * 0.22
    b_ry = size * 0.14
    
    # Bottom mochi feet
    foot_r = size * 0.04
    draw.ellipse([b_cx - b_rx*0.55 - foot_r, b_cy + b_ry*0.75 - foot_r, b_cx - b_rx*0.55 + foot_r, b_cy + b_ry*0.75 + foot_r], fill=(56, 189, 248))
    draw.ellipse([b_cx + b_rx*0.55 - foot_r, b_cy + b_ry*0.75 - foot_r, b_cx + b_rx*0.55 + foot_r, b_cy + b_ry*0.75 + foot_r], fill=(56, 189, 248))
    
    # Bottom mochi body
    draw.ellipse([b_cx - b_rx, b_cy - b_ry, b_cx + b_rx, b_cy + b_ry], fill=(56, 189, 248))
    # Bottom mochi face
    # Left eye
    draw_kawaii_eye(draw, b_cx - b_rx * 0.42, b_cy - b_ry * 0.1, size * 0.035, size * 0.045)
    # Right eye
    draw_kawaii_eye(draw, b_cx + b_rx * 0.42, b_cy - b_ry * 0.1, size * 0.035, size * 0.045)
    # Cute open smile with tongue
    draw.chord([b_cx - size*0.04, b_cy - size*0.01, b_cx + size*0.04, b_cy + size*0.06], 0, 180, fill=(239, 68, 68))
    draw.chord([b_cx - size*0.025, b_cy + size*0.02, b_cx + size*0.025, b_cy + size*0.06], 0, 180, fill=(244, 114, 182))
    # Blush
    draw_blush(bg, b_cx - b_rx * 0.62, b_cy + b_ry * 0.08, size * 0.045, size * 0.028)
    draw_blush(bg, b_cx + b_rx * 0.62, b_cy + b_ry * 0.08, size * 0.045, size * 0.028)
    
    # Redraw context for layer 2
    draw = ImageDraw.Draw(bg)
    
    # Character 2: Middle Mochi (Lavender, happy curved eyes)
    m_cx = cx
    m_cy = b_cy - b_ry * 1.05
    m_rx = size * 0.18
    m_ry = size * 0.125
    
    # Middle mochi body
    draw.ellipse([m_cx - m_rx, m_cy - m_ry, m_cx + m_rx, m_cy + m_ry], fill=(192, 132, 252))
    # Middle mochi cute paws resting down
    paw_r = size * 0.032
    draw.ellipse([m_cx - m_rx*0.55 - paw_r, m_cy + m_ry*0.75 - paw_r, m_cx - m_rx*0.55 + paw_r, m_cy + m_ry*0.75 + paw_r], fill=(216, 180, 254))
    draw.ellipse([m_cx + m_rx*0.55 - paw_r, m_cy + m_ry*0.75 - paw_r, m_cx + m_rx*0.55 + paw_r, m_cy + m_ry*0.75 + paw_r], fill=(216, 180, 254))
    
    # Middle mochi face: happy curved eyes ^ ^
    eye_offset = m_rx * 0.42
    eye_w = size * 0.04
    draw.arc([m_cx - eye_offset - eye_w/2, m_cy - size*0.03, m_cx - eye_offset + eye_w/2, m_cy + size*0.015], 200, 340, fill=(30, 27, 75), width=8)
    draw.arc([m_cx + eye_offset - eye_w/2, m_cy - size*0.03, m_cx + eye_offset + eye_w/2, m_cy + size*0.015], 200, 340, fill=(30, 27, 75), width=8)
    # Sweet little smile
    draw.arc([m_cx - size*0.025, m_cy - size*0.005, m_cx + size*0.025, m_cy + size*0.03], 20, 160, fill=(30, 27, 75), width=7)
    # Blush
    draw_blush(bg, m_cx - m_rx * 0.62, m_cy + m_ry * 0.1, size * 0.04, size * 0.025, color=(255, 105, 180, 120))
    draw_blush(bg, m_cx + m_rx * 0.62, m_cy + m_ry * 0.1, size * 0.04, size * 0.025, color=(255, 105, 180, 120))
    
    # Redraw context for layer 3
    draw = ImageDraw.Draw(bg)
    
    # Character 3: Top Mochi (Mint-green, winking and antenna sprout)
    t_cx = cx
    t_cy = m_cy - m_ry * 1.05
    t_rx = size * 0.14
    t_ry = size * 0.105
    
    # Sprout antenna on head
    sprout_stem_w = 8
    draw.line([t_cx, t_cy - t_ry, t_cx, t_cy - t_ry - size*0.045], fill=(74, 222, 128), width=sprout_stem_w)
    # Glowing yellow star at tip of sprout
    draw_star(draw, t_cx, t_cy - t_ry - size*0.05, size*0.025, size*0.012, (253, 224, 71))
    
    # Top mochi body
    draw.ellipse([t_cx - t_rx, t_cy - t_ry, t_cx + t_rx, t_cy + t_ry], fill=(74, 222, 128))
    
    # Top mochi face: Left eye winking (>), Right eye big kawaii
    t_eye_off = t_rx * 0.42
    # Right eye big
    draw_kawaii_eye(draw, t_cx + t_eye_off, t_cy - t_ry * 0.1, size * 0.028, size * 0.036)
    # Left eye winking (arc)
    draw.arc([t_cx - t_eye_off - size*0.02, t_cy - size*0.02, t_cx - t_eye_off + size*0.02, t_cy + size*0.01], 200, 340, fill=(20, 83, 45), width=7)
    # Little open cheerful smile
    draw.chord([t_cx - size*0.02, t_cy + size*0.005, t_cx + size*0.02, t_cy + size*0.04], 0, 180, fill=(239, 68, 68))
    # Blush
    draw_blush(bg, t_cx - t_rx * 0.62, t_cy + t_ry * 0.1, size * 0.032, size * 0.02, color=(255, 120, 150, 110))
    draw_blush(bg, t_cx + t_rx * 0.62, t_cy + t_ry * 0.1, size * 0.032, size * 0.02, color=(255, 120, 150, 110))
    
    draw = ImageDraw.Draw(bg)
    
    # Decorative sparkle stars around the stack
    draw_star(draw, cx - size * 0.32, cy - size * 0.18, size * 0.03, size * 0.012, (253, 224, 71, 230))
    draw_star(draw, cx + size * 0.33, cy - size * 0.12, size * 0.038, size * 0.015, (94, 234, 212, 230))
    draw_star(draw, cx - size * 0.28, cy + size * 0.22, size * 0.025, size * 0.01, (192, 132, 252, 220))
    draw_star(draw, cx + size * 0.30, cy + size * 0.25, size * 0.028, size * 0.011, (253, 224, 71, 220))
    
    # Clean typography at bottom: "StackBuiltAI"
    try:
        font_path = "C:/Windows/Fonts/bahnschrift.ttf"
        font = ImageFont.truetype(font_path, int(size * 0.055))
    except:
        font = ImageFont.load_default()
        
    text = "StackBuiltAI"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw / 2.0
    ty = cy + size * 0.355
    
    # Text glow pill
    pill_pad_x = size * 0.035
    pill_pad_y = size * 0.012
    draw.rounded_rectangle([tx - pill_pad_x, ty - pill_pad_y, tx + tw + pill_pad_x, ty + th + pill_pad_y * 1.6], radius=int(size * 0.025), fill=(22, 27, 54, 210), outline=(94, 234, 212, 120), width=4)
    draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    
    # Supersample down to 1024x1024 with high-quality LANCZOS
    final_img = bg.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

def render_chibi_kitty_stack(size=2048):
    # 1. Background
    bg = create_radial_gradient(size, size, (32, 38, 75), (15, 18, 38)).convert('RGBA')
    draw = ImageDraw.Draw(bg)
    
    cx, cy = size / 2.0, size / 2.0
    r_circle = size * 0.42
    
    # Glow ring
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([cx - r_circle, cy - r_circle, cx + r_circle, cy + r_circle], outline=(255, 182, 193, 70), width=16)
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    bg.alpha_composite(glow)
    draw.ellipse([cx - r_circle, cy - r_circle, cx + r_circle, cy + r_circle], outline=(255, 255, 255, 45), width=6)
    
    # 2. The Stack of pastel blocks in lower half
    # Block 3 (bottom, cyan)
    b3_w = size * 0.38
    b3_h = size * 0.08
    b3_y = cy + size * 0.22
    draw.rounded_rectangle([cx - b3_w/2, b3_y, cx + b3_w/2, b3_y + b3_h], radius=int(size*0.02), fill=(56, 189, 248), outline=(255, 255, 255, 80), width=5)
    
    # Block 2 (middle, lilac)
    b2_w = size * 0.32
    b2_h = size * 0.08
    b2_y = b3_y - b2_h * 0.95
    draw.rounded_rectangle([cx - b2_w/2, b2_y, cx + b2_w/2, b2_y + b2_h], radius=int(size*0.02), fill=(192, 132, 252), outline=(255, 255, 255, 80), width=5)
    
    # Block 1 (top, mint)
    b1_w = size * 0.26
    b1_h = size * 0.08
    b1_y = b2_y - b1_h * 0.95
    draw.rounded_rectangle([cx - b1_w/2, b1_y, cx + b1_w/2, b1_y + b1_h], radius=int(size*0.02), fill=(94, 234, 212), outline=(255, 255, 255, 80), width=5)
    
    # Symbols on blocks
    try:
        font_b = ImageFont.truetype("C:/Windows/Fonts/bahnschrift.ttf", int(size * 0.04))
    except:
        font_b = ImageFont.load_default()
        
    draw.text((cx - size*0.015, b1_y + size*0.018), "+", font=font_b, fill=(255, 255, 255, 230))
    draw.text((cx - size*0.015, b2_y + size*0.018), "B", font=font_b, fill=(255, 255, 255, 230))
    draw.text((cx - size*0.022, b3_y + size*0.018), "AI", font=font_b, fill=(255, 255, 255, 230))
    
    # 3. The Chibi Kitty peeking over top block
    head_cx = cx
    head_cy = b1_y - size * 0.09
    head_rx = size * 0.21
    head_ry = size * 0.17
    
    # Kitty Ears
    ear_w = size * 0.075
    ear_h = size * 0.105
    # Left ear
    draw.polygon([
        (head_cx - head_rx * 0.72, head_cy - head_ry * 0.3),
        (head_cx - head_rx * 0.65, head_cy - head_ry * 1.25),
        (head_cx - head_rx * 0.15, head_cy - head_ry * 0.75)
    ], fill=(255, 255, 255))
    # Left inner ear (pink)
    draw.polygon([
        (head_cx - head_rx * 0.68, head_cy - head_ry * 0.38),
        (head_cx - head_rx * 0.62, head_cy - head_ry * 1.12),
        (head_cx - head_rx * 0.22, head_cy - head_ry * 0.72)
    ], fill=(255, 182, 193))
    
    # Right ear
    draw.polygon([
        (head_cx + head_rx * 0.72, head_cy - head_ry * 0.3),
        (head_cx + head_rx * 0.65, head_cy - head_ry * 1.25),
        (head_cx + head_rx * 0.15, head_cy - head_ry * 0.75)
    ], fill=(255, 255, 255))
    # Right inner ear (pink)
    draw.polygon([
        (head_cx + head_rx * 0.68, head_cy - head_ry * 0.38),
        (head_cx + head_rx * 0.62, head_cy - head_ry * 1.12),
        (head_cx + head_rx * 0.22, head_cy - head_ry * 0.72)
    ], fill=(255, 182, 193))
    
    # Cute little antenna with glowing star between ears
    draw.line([head_cx, head_cy - head_ry * 0.95, head_cx, head_cy - head_ry * 1.28], fill=(94, 234, 212), width=7)
    draw_star(draw, head_cx, head_cy - head_ry * 1.32, size * 0.03, size * 0.012, (253, 224, 71))
    
    # Kitty Head
    draw.ellipse([head_cx - head_rx, head_cy - head_ry, head_cx + head_rx, head_cy + head_ry], fill=(255, 255, 255))
    
    # Eyes: Large, sparkling kawaii eyes
    eye_x_off = head_rx * 0.44
    eye_y = head_cy - head_ry * 0.02
    draw_kawaii_eye(draw, head_cx - eye_x_off, eye_y, size * 0.046, size * 0.058)
    draw_kawaii_eye(draw, head_cx + eye_x_off, eye_y, size * 0.046, size * 0.058)
    
    # Little pink nose
    nose_y = head_cy + head_ry * 0.12
    draw.polygon([
        (head_cx - size*0.012, nose_y),
        (head_cx + size*0.012, nose_y),
        (head_cx, nose_y + size*0.014)
    ], fill=(255, 130, 160))
    
    # Cute kitty mouth: :3 shape
    mouth_y = nose_y + size * 0.012
    draw.arc([head_cx - size*0.028, mouth_y, head_cx, mouth_y + size*0.026], 20, 160, fill=(30, 27, 75), width=6)
    draw.arc([head_cx, mouth_y, head_cx + size*0.028, mouth_y + size*0.026], 20, 160, fill=(30, 27, 75), width=6)
    
    # Rosy blush
    draw_blush(bg, head_cx - head_rx * 0.65, head_cy + head_ry * 0.22, size * 0.048, size * 0.028, color=(255, 120, 160, 130))
    draw_blush(bg, head_cx + head_rx * 0.65, head_cy + head_ry * 0.22, size * 0.048, size * 0.028, color=(255, 120, 160, 130))
    
    draw = ImageDraw.Draw(bg)
    
    # Cute chubby paws resting over top block
    paw_y = b1_y + size * 0.015
    paw_w = size * 0.04
    paw_h = size * 0.03
    draw.ellipse([cx - size*0.08 - paw_w, paw_y - paw_h, cx - size*0.08 + paw_w, paw_y + paw_h], fill=(255, 255, 255), outline=(220, 220, 230), width=3)
    draw.ellipse([cx + size*0.08 - paw_w, paw_y - paw_h, cx + size*0.08 + paw_w, paw_y + paw_h], fill=(255, 255, 255), outline=(220, 220, 230), width=3)
    
    # Delicate sparkle stars
    draw_star(draw, cx - size * 0.32, cy - size * 0.16, size * 0.035, size * 0.014, (253, 224, 71, 230))
    draw_star(draw, cx + size * 0.32, cy - size * 0.20, size * 0.04, size * 0.015, (94, 234, 212, 230))
    draw_star(draw, cx - size * 0.28, cy + size * 0.24, size * 0.028, size * 0.011, (192, 132, 252, 220))
    draw_star(draw, cx + size * 0.31, cy + size * 0.22, size * 0.032, size * 0.013, (253, 224, 71, 220))
    
    # Typography: "StackBuiltAI"
    text = "StackBuiltAI"
    bbox = draw.textbbox((0, 0), text, font=font_b)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw / 2.0
    ty = cy + size * 0.355
    
    pill_pad_x = size * 0.035
    pill_pad_y = size * 0.012
    draw.rounded_rectangle([tx - pill_pad_x, ty - pill_pad_y, tx + tw + pill_pad_x, ty + th + pill_pad_y * 1.6], radius=int(size * 0.025), fill=(22, 27, 54, 210), outline=(255, 182, 193, 120), width=4)
    draw.text((tx, ty), text, font=font_b, fill=(255, 255, 255, 255))
    
    final_img = bg.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

if __name__ == '__main__':
    print("Rendering Kawaii Mochi Stack Logo...")
    mochi = render_mochi_stack(2048)
    mochi.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\cute_logo_mochi_stack.png")
    mochi.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\cute_logo_mochi_stack.png")
    
    print("Rendering Chibi Kitty Stack Logo...")
    kitty = render_chibi_kitty_stack(2048)
    kitty.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\cute_logo_chibi_kitty.png")
    kitty.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\cute_logo_chibi_kitty.png")
    
    print("Done! Both cute logos rendered successfully.")
