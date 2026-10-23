import math
import numpy as np
from PIL import Image, ImageDraw

def render_neural_prism_with_color(replacement_color, size=2048):
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    C_CYAN = (0, 210, 255)   # #00D2FF (Electric Cyan)
    C_BLUE = (37, 99, 235)   # #2563EB (Cobalt Blue)
    
    r_outer = size * 0.28
    r_inner = size * 0.08
    
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
    
    # 3. Bottom-Right Facet: The New Vibrant Color (Replaces Black)
    poly_right = [
        (cx, cy + r_inner),
        (cx + r_inner * 0.866, cy + r_inner * 0.5),
        (cx + r_outer * 0.866, cy + r_outer * 0.5),
        (cx, cy + r_outer),
        (cx, cy + r_inner)
    ]
    draw.polygon(poly_right, fill=replacement_color)
    
    # 4. Central Energy Core Node
    draw.ellipse([cx - size*0.025, cy - size*0.025, cx + size*0.025, cy + size*0.025], fill=C_CYAN)
    
    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

if __name__ == '__main__':
    print("Rendering Neural Prism color variations...")
    
    # 1. Electric Violet / Royal Purple (#7C3AED) - The Classic AI Triad
    v_img = render_neural_prism_with_color((124, 58, 237), 2048)
    v_img.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\prism_violet.png")
    v_img.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\prism_violet.png")
    
    # 2. Vibrant Emerald Mint (#10B981)
    m_img = render_neural_prism_with_color((16, 185, 129), 2048)
    m_img.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\prism_emerald.png")
    m_img.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\prism_emerald.png")
    
    # 3. Sunset Coral / Tangerine (#FF6B4A)
    c_img = render_neural_prism_with_color((255, 107, 74), 2048)
    c_img.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\prism_coral.png")
    c_img.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\prism_coral.png")
    
    # 4. Deep Indigo Blue (#4338CA)
    i_img = render_neural_prism_with_color((67, 56, 202), 2048)
    i_img.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\prism_indigo.png")
    i_img.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\prism_indigo.png")

    # Set Option 1 (Electric Violet) as active youtube_profile_avatar
    dest_png = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\youtube_profile_avatar.png"
    dest_jpg = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\youtube_profile_avatar.jpg"
    brain_png = r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\youtube_profile_avatar.png"
    brain_jpg = r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\youtube_profile_avatar.jpg"
    
    v_img.save(dest_png)
    v_img.save(brain_png)
    v_img.convert('RGB').save(dest_jpg, quality=95)
    v_img.convert('RGB').save(brain_jpg, quality=95)
    
    print("All prism variations generated and Option 1 (Electric Violet) deployed as active avatar.")
