import math
import numpy as np
from PIL import Image, ImageDraw

def render_google_geometric_s(size=2048):
    # Pure white background like Google apps
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Google iconic 4-color palette
    C_BLUE   = (66, 133, 244)   # #4285F4
    C_GREEN  = (52, 168, 83)    # #34A853
    C_YELLOW = (251, 188, 5)    # #FBBC05
    C_RED    = (234, 67, 53)     # #EA4335
    
    # Dimensions for an S formed by two overlapping circular arcs and clean cuts
    # Height of S = size * 0.58 (~1188px), Width = size * 0.44 (~900px)
    stroke_w = size * 0.105
    r_top = size * 0.17
    r_bot = size * 0.17
    
    c_top_y = cy - size * 0.115
    c_bot_y = cy + size * 0.115
    
    # 1. Top Arc: Red (180 deg to 360 deg) and top-right curve
    # 180 to 0 (top half of top circle)
    draw.arc([cx - r_top, c_top_y - r_top, cx + r_top, c_top_y + r_top], 180, 0, fill=C_RED, width=int(stroke_w))
    # Horizontal top end cap
    draw.ellipse([cx + r_top - stroke_w/2, c_top_y - stroke_w/2, cx + r_top + stroke_w/2, c_top_y + stroke_w/2], fill=C_RED)
    
    # 2. Left Upper Curve: Yellow (90 to 180 deg)
    draw.arc([cx - r_top, c_top_y - r_top, cx + r_top, c_top_y + r_top], 90, 180, fill=C_YELLOW, width=int(stroke_w))
    draw.ellipse([cx - r_top - stroke_w/2, c_top_y - stroke_w/2, cx - r_top + stroke_w/2, c_top_y + stroke_w/2], fill=C_YELLOW)

    # 3. Center Crossing / Diagonal Bridge: Google Blue
    # Line connecting top-left-bottom to bottom-right-top
    p1 = (cx, c_top_y + r_top)
    p2 = (cx, c_bot_y - r_bot)
    draw.line([p1, p2], fill=C_BLUE, width=int(stroke_w))
    
    # 4. Right Lower Curve: Green (270 to 360 deg of bottom circle)
    draw.arc([cx - r_bot, c_bot_y - r_bot, cx + r_bot, c_bot_y + r_bot], 270, 360, fill=C_GREEN, width=int(stroke_w))
    draw.ellipse([cx + r_bot - stroke_w/2, c_bot_y - stroke_w/2, cx + r_bot + stroke_w/2, c_bot_y + stroke_w/2], fill=C_GREEN)
    
    # 5. Bottom Arc: Blue / Green (0 to 180 deg of bottom circle)
    draw.arc([cx - r_bot, c_bot_y - r_bot, cx + r_bot, c_bot_y + r_bot], 0, 180, fill=C_BLUE, width=int(stroke_w))
    draw.ellipse([cx - r_bot - stroke_w/2, c_bot_y - stroke_w/2, cx - r_bot + stroke_w/2, c_bot_y + stroke_w/2], fill=C_BLUE)

    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

# ==============================================================================
# META-STYLE PRISTINE INFINITY LOOP (Dual Loops, Electric Meta Blue Gradient)
# Like Meta's iconic infinity symbol, clean and continuous
# ==============================================================================
def render_meta_infinity_logo(size=2048):
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Meta Signature Blue Gradient
    # From Electric Cyan #0081FB to Royal Indigo #0064E0 to Deep Purple #8A3FFC
    n_pts = 1200
    
    stroke_r = size * 0.052 # clean, bold stroke
    
    # Infinity curve (Lemniscate of Bernoulli or Lissajous figure-8)
    # x(t) = a * cos(t) / (1 + sin^2(t))
    # y(t) = a * sin(t) * cos(t) / (1 + sin^2(t))
    a = size * 0.40
    
    c1 = np.array([0, 129, 251])  # Meta Electric Cyan-Blue
    c2 = np.array([0, 100, 224])  # Meta Royal Blue
    c3 = np.array([138, 63, 252]) # Meta Deep Purple
    
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    
    for i in range(n_pts):
        t = i * 2 * math.pi / float(n_pts)
        denom = 1 + math.sin(t)**2
        px = cx + (a * math.cos(t) / denom)
        py = cy + (a * math.sin(t) * math.cos(t) / denom)
        
        # Color gradient around the loop
        norm_t = (math.sin(t) + 1.0) / 2.0
        col = (1 - norm_t) * c1 + norm_t * c3
        fill_col = (int(col[0]), int(col[1]), int(col[2]), 255)
        
        odraw.ellipse([px - stroke_r, py - stroke_r, px + stroke_r, py + stroke_r], fill=fill_col)
        
    img.alpha_composite(overlay)
    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

# ==============================================================================
# STRIPE / MINIMALIST CAPSULE STACK (The S-Stack on Crisp White)
# ==============================================================================
def render_minimal_capsule_stack(size=2048):
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    
    cx = size / 2.0
    cy = size / 2.0
    
    cap_w = size * 0.46
    cap_h = size * 0.108
    gap = size * 0.048
    shift = size * 0.082
    
    y_mid = cy - cap_h / 2.0
    y_top = y_mid - (cap_h + gap)
    y_bot = y_mid + (cap_h + gap)
    
    def draw_pill_gradient(x1, y1, x2, y2, c_start, c_end):
        w = int(x2 - x1)
        h = int(y2 - y1)
        r = int(h / 2.0)
        
        mask = Image.new('L', (w, h), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([0, 0, w, h], radius=r, fill=255)
        
        t = np.linspace(0, 1, w)[np.newaxis, :]
        r_ch = (1 - t) * c_start[0] + t * c_end[0]
        g_ch = (1 - t) * c_start[1] + t * c_end[1]
        b_ch = (1 - t) * c_start[2] + t * c_end[2]
        
        grad_arr = np.repeat(np.stack([r_ch, g_ch, b_ch], axis=-1).astype(np.uint8), h, axis=0)
        grad_img = Image.fromarray(grad_arr).convert('RGBA')
        img.paste(grad_img, (int(x1), int(y1)), mask)

    # Top: Vibrant Cyan -> Blue
    draw_pill_gradient(cx - cap_w/2.0 + shift, y_top, cx + cap_w/2.0 + shift, y_top + cap_h, (0, 210, 255), (37, 99, 235))
    # Mid: Blue -> Indigo
    draw_pill_gradient(cx - cap_w/2.0, y_mid, cx + cap_w/2.0, y_mid + cap_h, (37, 99, 235), (99, 102, 241))
    # Bot: Indigo -> Purple
    draw_pill_gradient(cx - cap_w/2.0 - shift, y_bot, cx + cap_w/2.0 - shift, y_bot + cap_h, (99, 102, 241), (168, 85, 247))
    
    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

if __name__ == '__main__':
    print("Generating Pristine Big-Tech Logos...")
    
    # 1. Meta Style Infinity Loop
    m_img = render_meta_infinity_logo(2048)
    m_img.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\logo_meta_infinity.png")
    m_img.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\logo_meta_infinity.png")
    
    # 2. Minimalist S-Stack (Stripe / OpenAI style)
    s_img = render_minimal_capsule_stack(2048)
    s_img.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\logo_stack_capsule.png")
    s_img.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\logo_stack_capsule.png")
    
    # 3. Google 4-Color Geometric S
    g_img = render_google_geometric_s(2048)
    g_img.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\logo_google_s.png")
    g_img.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\logo_google_s.png")
    
    print("All big tech logos generated successfully.")
