import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def create_white_canvas(size=2048):
    return Image.new('RGBA', (size, size), (255, 255, 255, 255))

# ==============================================================================
# DESIGN 1: THE STRIPE / OPENAI STYLE OFFSET CAPSULE STACK (Forms "S" & "Stack")
# Three precision-engineered rounded horizontal slabs stacked vertically.
# ==============================================================================
def render_capsule_stack_logo(size=2048):
    img = create_white_canvas(size)
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Dimensions for the three capsules
    cap_w = size * 0.44      # width ~900px
    cap_h = size * 0.105     # height ~215px
    gap = size * 0.045       # gap ~92px
    radius = cap_h / 2.0     # full pill roundness
    
    # Offsets: Top shifted right (+), Middle centered, Bottom shifted left (-)
    # This creates a dynamic, unmistakable "S" flow!
    shift = size * 0.075
    
    y_mid = cy - cap_h / 2.0
    y_top = y_mid - (cap_h + gap)
    y_bot = y_mid + (cap_h + gap)
    
    # Colors: Google / Meta inspired vibrant tech gradient palette
    # Top: Electric Cyan to Royal Blue
    # Mid: Royal Blue to Indigo
    # Bot: Indigo to Electric Violet
    # We can draw smooth horizontal gradient pills!
    
    def draw_gradient_pill(x1, y1, x2, y2, c_start, c_end):
        w = int(x2 - x1)
        h = int(y2 - y1)
        r = int(h / 2.0)
        
        # Pill mask
        mask = Image.new('L', (w, h), 0)
        mdraw = ImageDraw.Draw(mask)
        mdraw.rounded_rectangle([0, 0, w, h], radius=r, fill=255)
        
        # Horizontal gradient
        t = np.linspace(0, 1, w)[np.newaxis, :]
        r_ch = (1 - t) * c_start[0] + t * c_end[0]
        g_ch = (1 - t) * c_start[1] + t * c_end[1]
        b_ch = (1 - t) * c_start[2] + t * c_end[2]
        
        grad_arr = np.repeat(np.stack([r_ch, g_ch, b_ch], axis=-1).astype(np.uint8), h, axis=0)
        grad_img = Image.fromarray(grad_arr).convert('RGBA')
        
        img.paste(grad_img, (int(x1), int(y1)), mask)

    # 1. Top Capsule: Offset Right (forms top hook of S)
    x1_top = cx - cap_w/2.0 + shift
    x2_top = cx + cap_w/2.0 + shift
    draw_gradient_pill(x1_top, y_top, x2_top, y_top + cap_h, (0, 210, 255), (37, 99, 235)) # Cyan -> Blue
    
    # 2. Middle Capsule: Centered with an energy bridge
    x1_mid = cx - cap_w/2.0
    x2_mid = cx + cap_w/2.0
    draw_gradient_pill(x1_mid, y_mid, x2_mid, y_mid + cap_h, (37, 99, 235), (99, 102, 241)) # Blue -> Indigo
    
    # 3. Bottom Capsule: Offset Left (forms bottom hook of S)
    x1_bot = cx - cap_w/2.0 - shift
    x2_bot = cx + cap_w/2.0 - shift
    draw_gradient_pill(x1_bot, y_bot, x2_bot, y_bot + cap_h, (99, 102, 241), (168, 85, 247)) # Indigo -> Violet
    
    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

# ==============================================================================
# DESIGN 2: THE GOOGLE-STYLE 4-COLOR GEOMETRIC S
# Google's iconic 4 colors (Blue, Red, Yellow, Green) forming an S-monogram.
# ==============================================================================
def render_google_style_logo(size=2048):
    img = create_white_canvas(size)
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Google iconic 4-color palette
    C_BLUE   = (66, 133, 244)   # #4285F4
    C_GREEN  = (52, 168, 83)    # #34A853
    C_YELLOW = (251, 188, 5)    # #FBBC05
    C_RED    = (234, 67, 53)     # #EA4335
    
    # Three clean stacked blocks in Google's official colors
    # Top block: Blue & Green
    # Middle block: Yellow & Green
    # Bottom block: Red & Yellow
    cap_w = size * 0.44
    cap_h = size * 0.105
    gap = size * 0.045
    shift = size * 0.075
    
    y_mid = cy - cap_h / 2.0
    y_top = y_mid - (cap_h + gap)
    y_bot = y_mid + (cap_h + gap)
    
    # Top: Google Blue (with subtle right curve in Google Green)
    draw.rounded_rectangle([cx - cap_w/2.0 + shift, y_top, cx + cap_w/2.0 + shift, y_top + cap_h], radius=int(cap_h/2.0), fill=C_BLUE)
    # Mid: Google Green
    draw.rounded_rectangle([cx - cap_w/2.0, y_mid, cx + cap_w/2.0, y_mid + cap_h], radius=int(cap_h/2.0), fill=C_GREEN)
    # Bot: Google Red
    draw.rounded_rectangle([cx - cap_w/2.0 - shift, y_bot, cx + cap_w/2.0 - shift, y_bot + cap_h], radius=int(cap_h/2.0), fill=C_RED)
    
    # Inner tech accents: Google Yellow core connector
    draw.ellipse([cx - cap_h*0.35, y_mid + cap_h*0.15, cx + cap_h*0.35, y_mid + cap_h*0.85], fill=C_YELLOW)

    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

# ==============================================================================
# DESIGN 3: THE META-STYLE INFINITY S-RIBBON
# A continuous, fluid geometric loop that curves through space to form an 'S'.
# ==============================================================================
def render_meta_style_ribbon(size=2048):
    img = create_white_canvas(size)
    
    # Draw smooth mathematical S-ribbon using parametric curve
    # Points on the ribbon path
    n_points = 1000
    cx = size / 2.0
    cy = size / 2.0
    
    # Curve parameterized by t in [0, 2*pi]
    # Smooth continuous S loop
    # Let's create an overlay to draw smooth overlapping circles/strokes
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    
    stroke_r = size * 0.055 # thick luxury stroke
    
    # Meta / Stripe vibrant gradient: Electric Blue (0, 128, 255) -> Royal Violet (147, 51, 234)
    c_blue = np.array([0, 140, 255])
    c_purple = np.array([168, 85, 247])
    
    # Cubic / sinusoidal S curve points
    h_span = size * 0.28
    w_span = size * 0.22
    
    for i in range(n_points):
        t = i / float(n_points)
        # S-curve path:
        # y goes from -h_span to +h_span
        py = cy + (2 * t - 1) * h_span
        # x weaves back and forth: cos(2*pi*t) or similar
        angle = t * math.pi
        px = cx + math.sin(angle * 2.0) * w_span
        
        # Color interpolation
        col = (1 - t) * c_blue + t * c_purple
        fill_col = (int(col[0]), int(col[1]), int(col[2]), 255)
        
        odraw.ellipse([px - stroke_r, py - stroke_r, px + stroke_r, py + stroke_r], fill=fill_col)
        
    img.alpha_composite(overlay)
    
    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

# ==============================================================================
# DESIGN 4: THE MINIMALIST DUAL-CHEVRON "S-STACK" (Like Google Chrome / OpenAI)
# Two interlocking, precision-engineered geometric chevrons forming an S
# ==============================================================================
def render_dual_chevron_s(size=2048):
    img = create_white_canvas(size)
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Meta / Google Blue and Coral Cyan
    C_BLUE = (37, 99, 235)    # #2563EB
    C_CYAN = (0, 210, 255)    # #00D2FF
    C_PURPLE = (147, 51, 234) # #9333EA
    
    # Interlocking geometric curves
    # Top hook of S: arc from 90 to 270 deg
    r_outer = size * 0.22
    stroke_w = size * 0.08
    r_inner = r_outer - stroke_w
    
    # Top Circle center
    c1_y = cy - size * 0.12
    # Bottom Circle center
    c2_y = cy + size * 0.12
    
    # Top arc (Cyan to Blue)
    draw.arc([cx - r_outer, c1_y - r_outer, cx + r_outer, c1_y + r_outer], 90, 270, fill=C_CYAN, width=int(stroke_w))
    draw.line([cx, c1_y - r_outer + stroke_w/2.0, cx + size*0.14, c1_y - r_outer + stroke_w/2.0], fill=C_CYAN, width=int(stroke_w))
    
    # Middle diagonal connector
    draw.line([cx - size*0.14, c1_y + r_outer - stroke_w/2.0, cx + size*0.14, c2_y - r_outer + stroke_w/2.0], fill=C_BLUE, width=int(stroke_w))
    
    # Bottom arc (Blue to Purple)
    draw.arc([cx - r_outer, c2_y - r_outer, cx + r_outer, c2_y + r_outer], 270, 90, fill=C_PURPLE, width=int(stroke_w))
    draw.line([cx - size*0.14, c2_y + r_outer - stroke_w/2.0, cx, c2_y + r_outer - stroke_w/2.0], fill=C_PURPLE, width=int(stroke_w))

    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

if __name__ == '__main__':
    print("Rendering Simple Big-Tech Inspired Logos on Clean White Canvas...")
    
    # 1. Stripe / Modern Tech Offset Stack S
    d1 = render_capsule_stack_logo(2048)
    d1.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\simple_logo_stack_capsule.png")
    d1.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\simple_logo_stack_capsule.png")
    
    # 2. Google 4-Color Stack S
    d2 = render_google_style_logo(2048)
    d2.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\simple_logo_google_colors.png")
    d2.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\simple_logo_google_colors.png")
    
    # 3. Meta-Style Infinity S Ribbon
    d3 = render_meta_style_ribbon(2048)
    d3.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\simple_logo_meta_ribbon.png")
    d3.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\simple_logo_meta_ribbon.png")

    print("Done! All 3 simple tech logos rendered successfully.")
