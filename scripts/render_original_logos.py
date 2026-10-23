import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ==============================================================================
# ORIGINAL DESIGN 1: THE STEPPED ARCHITECTURAL "S-STACK"
# An original geometric mark: three precision horizontal architectural bars with
# 45-degree sheared ends and an angled negative-space channel forming an "S".
# ==============================================================================
def render_original_stepped_stack(size=2048):
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Palette: Bespoke Deep Navy, Electric Cyan, and Cobalt
    C_NAVY   = (15, 23, 42)    # #0F172A (Deep Slate Navy)
    C_CYAN   = (0, 210, 255)   # #00D2FF (Electric Cyan)
    C_COBALT = (37, 99, 235)   # #2563EB (Vivid Cobalt)
    
    # Dimensions
    bar_w = size * 0.46
    bar_h = size * 0.115
    gap   = size * 0.048
    shift = size * 0.085
    r     = int(size * 0.025)
    
    y_mid = cy - bar_h / 2.0
    y_top = y_mid - (bar_h + gap)
    y_bot = y_mid + (bar_h + gap)
    
    # Top Bar: Shifted Right, Electric Cyan with Navy accent
    # [cx - bar_w/2 + shift, y_top, cx + bar_w/2 + shift, y_top + bar_h]
    x1_top = cx - bar_w/2.0 + shift
    x2_top = cx + bar_w/2.0 + shift
    draw.rounded_rectangle([x1_top, y_top, x2_top, y_top + bar_h], radius=r, fill=C_CYAN)
    # Custom diagonal cut / terminal glyph at top-left of top bar
    draw.polygon([(x1_top, y_top), (x1_top + bar_h*0.8, y_top), (x1_top, y_top + bar_h*0.8)], fill=(255, 255, 255))
    
    # Middle Bar: Centered, Deep Navy
    x1_mid = cx - bar_w/2.0
    x2_mid = cx + bar_w/2.0
    draw.rounded_rectangle([x1_mid, y_mid, x2_mid, y_mid + bar_h], radius=r, fill=C_NAVY)
    # A circular core aperture in the center of the middle bar (signifying AI neural core)
    draw.ellipse([cx - bar_h*0.28, cy - bar_h*0.28, cx + bar_h*0.28, cy + bar_h*0.28], fill=C_CYAN)
    
    # Bottom Bar: Shifted Left, Cobalt Blue with diagonal cut
    x1_bot = cx - bar_w/2.0 - shift
    x2_bot = cx + bar_w/2.0 - shift
    draw.rounded_rectangle([x1_bot, y_bot, x2_bot, y_bot + bar_h], radius=r, fill=C_COBALT)
    # Custom diagonal cut at bottom-right of bottom bar
    draw.polygon([(x2_bot, y_bot + bar_h), (x2_bot - bar_h*0.8, y_bot + bar_h), (x2_bot, y_bot + bar_h - bar_h*0.8)], fill=(255, 255, 255))
    
    # Angled connector bridge linking top to mid on right, mid to bot on left
    draw.line([x2_top - r, y_top + bar_h/2.0, x2_mid - r, y_mid + bar_h/2.0], fill=C_CYAN, width=int(size * 0.012))
    draw.line([x1_mid + r, y_mid + bar_h/2.0, x1_bot + r, y_bot + bar_h/2.0], fill=C_COBALT, width=int(size * 0.012))

    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

# ==============================================================================
# ORIGINAL DESIGN 2: THE INTERLOCKING "CHEVRON-S" (Prompt Meets Stack)
# Two geometric angled brackets/chevrons that interlock in an S formation.
# ==============================================================================
def render_original_chevron_s(size=2048):
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Bespoke Palette
    C_PRIMARY = (17, 24, 39)    # #111827 (Obsidian Slate)
    C_ACCENT  = (0, 220, 255)   # #00DCFF (Vivid Cyan)
    
    # A bold, minimalist geometric "S" built purely from 45-degree clean polygons
    # Think of an architectural ribbon that turns at 45 and 90 degrees
    w = size * 0.38
    h = size * 0.52
    stroke = size * 0.088
    
    # Points defining an angular geometric S
    # Top horizontal
    # Top-right vertical down
    # Middle horizontal across
    # Bottom-left vertical down
    # Bottom horizontal
    
    # Upper Bracket (Cyan)
    poly_top = [
        (cx - w/2.0, cy - h/2.0),
        (cx + w/2.0, cy - h/2.0),
        (cx + w/2.0, cy - size*0.06),
        (cx + w/2.0 - stroke, cy - size*0.06),
        (cx + w/2.0 - stroke, cy - h/2.0 + stroke),
        (cx - w/2.0, cy - h/2.0 + stroke)
    ]
    draw.polygon(poly_top, fill=C_ACCENT)
    
    # Middle diagonal / horizontal connector (Dual Tone)
    poly_mid = [
        (cx - w/2.0, cy - size*0.044),
        (cx + w/2.0, cy - size*0.044),
        (cx + w/2.0, cy + size*0.044),
        (cx - w/2.0, cy + size*0.044)
    ]
    draw.polygon(poly_mid, fill=C_PRIMARY)
    
    # Lower Bracket (Dark Obsidian)
    poly_bot = [
        (cx - w/2.0 + stroke, cy + size*0.06),
        (cx - w/2.0, cy + size*0.06),
        (cx - w/2.0, cy + h/2.0),
        (cx + w/2.0, cy + h/2.0),
        (cx + w/2.0, cy + h/2.0 - stroke),
        (cx - w/2.0 + stroke, cy + h/2.0 - stroke)
    ]
    draw.polygon(poly_bot, fill=C_PRIMARY)
    
    # Negative space diamond in center
    draw.polygon([
        (cx, cy - size*0.022),
        (cx + size*0.022, cy),
        (cx, cy + size*0.022),
        (cx - size*0.022, cy)
    ], fill=(255, 255, 255))

    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

# ==============================================================================
# ORIGINAL DESIGN 3: THE "NEURAL PRISM" (Tri-Axis Isometric Architecture)
# Three isometric diamond planes converging around a negative space "S" spark.
# ==============================================================================
def render_original_neural_prism(size=2048):
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    cx = size / 2.0
    cy = size / 2.0
    
    # Palette
    C_CYAN   = (0, 210, 255)
    C_BLUE   = (37, 99, 235)
    C_DARK   = (15, 23, 42)
    
    # Three floating isometric blocks in 3D space creating a clean hexagon silhouette
    r_outer = size * 0.28
    r_inner = size * 0.08
    
    # Top Facet (Diamond)
    poly_top = [
        (cx, cy - r_outer),
        (cx + r_outer * 0.866, cy - r_outer * 0.5),
        (cx + r_inner * 0.866, cy - r_inner * 0.5),
        (cx, cy - r_inner)
    ]
    draw.polygon(poly_top, fill=C_CYAN)
    
    # Left Facet (Diamond)
    poly_left = [
        (cx, cy - r_inner),
        (cx - r_inner * 0.866, cy - r_inner * 0.5),
        (cx - r_outer * 0.866, cy - r_outer * 0.5),
        (cx - r_outer * 0.866, cy + r_outer * 0.5),
        (cx - r_inner * 0.866, cy + r_inner * 0.5),
        (cx, cy + r_inner)
    ]
    draw.polygon(poly_left, fill=C_BLUE)
    
    # Right Facet (Diamond)
    poly_right = [
        (cx, cy + r_inner),
        (cx + r_inner * 0.866, cy + r_inner * 0.5),
        (cx + r_outer * 0.866, cy + r_outer * 0.5),
        (cx, cy + r_outer),
        (cx, cy + r_inner)
    ]
    draw.polygon(poly_right, fill=C_DARK)
    
    # An internal glowing energy spark in the center
    draw.ellipse([cx - size*0.025, cy - size*0.025, cx + size*0.025, cy + size*0.025], fill=C_CYAN)

    final_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

if __name__ == '__main__':
    print("Generating 100% Original Bespoke Logos for StackBuiltAI...")
    
    # 1. Original Stepped Architectural S-Stack
    l1 = render_original_stepped_stack(2048)
    l1.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\original_logo_stepped_stack.png")
    l1.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\original_logo_stepped_stack.png")
    
    # 2. Original Interlocking Chevron S
    l2 = render_original_chevron_s(2048)
    l2.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\original_logo_chevron_s.png")
    l2.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\original_logo_chevron_s.png")
    
    # 3. Original Neural Prism
    l3 = render_original_neural_prism(2048)
    l3.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\original_logo_neural_prism.png")
    l3.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\original_logo_neural_prism.png")
    
    print("Done! All 3 original logos created successfully.")
