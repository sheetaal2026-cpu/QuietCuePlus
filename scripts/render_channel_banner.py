import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def draw_neural_prism(size=400):
    # Renders the exact user-approved Neural Prism with Electric Violet on transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    C_CYAN   = (0, 210, 255)   # #00D2FF
    C_BLUE   = (37, 99, 235)   # #2563EB
    C_VIOLET = (124, 58, 237)  # #7C3AED (User approved purple)
    
    r_outer = size * 0.42
    r_inner = size * 0.12
    
    # 1. Top Facet: Electric Cyan
    poly_top = [
        (cx, cy - r_outer),
        (cx + r_outer * 0.866, cy - r_outer * 0.5),
        (cx + r_inner * 0.866, cy - r_inner * 0.5),
        (cx, cy - r_inner)
    ]
    draw.polygon(poly_top, fill=C_CYAN)
    
    # 2. Left Facet: Cobalt Blue
    poly_left = [
        (cx, cy - r_inner),
        (cx - r_inner * 0.866, cy - r_inner * 0.5),
        (cx - r_outer * 0.866, cy - r_outer * 0.5),
        (cx - r_outer * 0.866, cy + r_outer * 0.5),
        (cx - r_inner * 0.866, cy + r_inner * 0.5),
        (cx, cy + r_inner)
    ]
    draw.polygon(poly_left, fill=C_BLUE)
    
    # 3. Bottom-Right Facet: Electric Violet
    poly_right = [
        (cx, cy + r_inner),
        (cx + r_inner * 0.866, cy + r_inner * 0.5),
        (cx + r_outer * 0.866, cy + r_outer * 0.5),
        (cx, cy + r_outer),
        (cx, cy + r_inner)
    ]
    draw.polygon(poly_right, fill=C_VIOLET)
    
    # 4. Central Energy Core
    core_r = size * 0.038
    draw.ellipse([cx - core_r, cy - core_r, cx + core_r, cy + core_r], fill=C_CYAN)
    
    return img

def render_banner(width=2560, height=1440):
    # 1. Clean, modern light background with subtle gradient
    banner = Image.new('RGBA', (width, height), (248, 250, 252, 255))
    draw = ImageDraw.Draw(banner)
    
    # 2. Subtle high-tech ambient texture grid with low opacity
    grid_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grid_overlay)
    
    grid_step = 120
    for x in range(0, width, grid_step):
        gdraw.line([(x, 0), (x, height)], fill=(226, 232, 240, 60), width=1)
    for y in range(0, height, grid_step):
        gdraw.line([(0, y), (width, y)], fill=(226, 232, 240, 60), width=1)
        
    banner.alpha_composite(grid_overlay)
    
    # 3. Soft ambient radial blooms centered around the safe zone
    bloom = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    bdraw.ellipse([800, 480, 1300, 960], fill=(0, 210, 255, 25))
    bdraw.ellipse([1260, 480, 1760, 960], fill=(124, 58, 237, 20))
    bloom = bloom.filter(ImageFilter.GaussianBlur(120))
    banner.alpha_composite(bloom)
    
    draw = ImageDraw.Draw(banner)
    
    # 4. Center coordinates
    cx = width / 2.0  # 1280
    cy = height / 2.0 # 720
    
    # 5. Prepare Typography
    try:
        font_title = ImageFont.truetype("C:/Windows/Fonts/bahnschrift.ttf", 96)
    except:
        font_title = ImageFont.load_default()
        
    # Text: "StackBuilt AI"
    t_stack = "Stack"
    t_built_ai = "Built AI"
    
    bbox_stack = draw.textbbox((0, 0), t_stack, font=font_title)
    w_stack = bbox_stack[2] - bbox_stack[0]
    
    bbox_built = draw.textbbox((0, 0), t_built_ai, font=font_title)
    w_built = bbox_built[2] - bbox_built[0]
    
    text_total_w = w_stack + w_built + 8
    text_h = bbox_stack[3] - bbox_stack[1]
    
    # 6. Prepare Emblem
    emblem_size = 230
    emblem = draw_neural_prism(emblem_size * 2)
    emblem = emblem.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
    
    # 7. Calculate perfect horizontal and vertical centering for Emblem + Text Lockup
    gap_emblem_text = 52
    total_lockup_w = emblem_size + gap_emblem_text + text_total_w
    
    start_x = cx - total_lockup_w / 2.0
    emblem_x = int(start_x)
    emblem_y = int(cy - emblem_size / 2.0)
    
    text_x = int(emblem_x + emblem_size + gap_emblem_text)
    # Optical vertical centering of text with the emblem
    text_y = int(cy - text_h / 2.0 - 10)
    
    # Paste Emblem
    banner.paste(emblem, (emblem_x, emblem_y), emblem)
    
    # Draw "Stack" in Cobalt Blue
    draw.text((text_x, text_y), t_stack, font=font_title, fill=(37, 99, 235))
    
    # Draw "Built AI" in Deep Slate Navy
    draw.text((text_x + w_stack + 8, text_y), t_built_ai, font=font_title, fill=(15, 23, 42))
    
    return banner

if __name__ == '__main__':
    print("Rendering Minimalist YouTube Channel Banner with ONLY 'StackBuilt AI'...")
    banner = render_banner(2560, 1440)
    
    ws_png = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\youtube_channel_banner.png"
    brain_png = r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\youtube_channel_banner.png"
    ws_jpg = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\youtube_channel_banner.jpg"
    brain_jpg = r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\youtube_channel_banner.jpg"
    
    banner.save(ws_png)
    banner.save(brain_png)
    banner.convert('RGB').save(ws_jpg, quality=95)
    banner.convert('RGB').save(brain_jpg, quality=95)
    
    print("Done! Pure minimalist YouTube Channel Banner deployed successfully.")
