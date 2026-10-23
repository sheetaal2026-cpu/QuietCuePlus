import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def create_radial_gradient(width, height, center_color, outer_color):
    y, x = np.ogrid[:height, :width]
    cx, cy = width / 2.0, height / 2.0
    r = np.sqrt((x - cx)**2 + (y - cy)**2)
    max_r = np.sqrt(cx**2 + cy**2)
    t = np.clip(r / (max_r * 0.70), 0, 1)
    
    r_chan = (1 - t) * center_color[0] + t * outer_color[0]
    g_chan = (1 - t) * center_color[1] + t * outer_color[1]
    b_chan = (1 - t) * center_color[2] + t * outer_color[2]
    
    rgb = np.stack([r_chan, g_chan, b_chan], axis=-1).astype(np.uint8)
    return Image.fromarray(rgb)

def draw_isometric_slab(draw, cx, cy, w, h, thickness, top_color, left_color, right_color, bevel_color=None, bevel_w=4):
    # Top face vertices
    p_top = (cx, cy - h/2)
    p_right = (cx + w/2, cy)
    p_bottom = (cx, cy + h/2)
    p_left = (cx - w/2, cy)
    
    # Left face vertices
    poly_left = [
        p_left,
        p_bottom,
        (p_bottom[0], p_bottom[1] + thickness),
        (p_left[0], p_left[1] + thickness)
    ]
    draw.polygon(poly_left, fill=left_color)
    
    # Right face vertices
    poly_right = [
        p_bottom,
        p_right,
        (p_right[0], p_right[1] + thickness),
        (p_bottom[0], p_bottom[1] + thickness)
    ]
    draw.polygon(poly_right, fill=right_color)
    
    # Top face
    poly_top = [p_top, p_right, p_bottom, p_left]
    draw.polygon(poly_top, fill=top_color)
    
    # Top bevel outline
    if bevel_color:
        draw.polygon(poly_top, outline=bevel_color, width=bevel_w)
        # Highlight front edges
        draw.line([p_left, p_bottom, p_right], fill=bevel_color, width=bevel_w + 2)

def draw_iso_chevron(draw, cx, cy, scale=1.0, color=(0, 229, 255), width=18):
    # Isometric chevron '>' projected on 30 deg top face
    # Base 2D points: (-40, -50), (30, 0), (-40, 50)
    # Isometric transform: iso_x = cx + (x - y) * cos(30), iso_y = cy + (x + y) * sin(30)
    # Or simplified direct 30-deg skew:
    pts = [
        (-45 * scale, -25 * scale),
        (25 * scale, 0),
        (-45 * scale, 25 * scale)
    ]
    # Map to top-face isometric coordinate frame
    iso_pts = []
    cos30 = math.cos(math.radians(30))
    sin30 = math.sin(math.radians(30))
    for px, py in pts:
        ix = cx + px * cos30 * 1.6
        iy = cy + py * sin30 * 1.6
        iso_pts.append((ix, iy))
        
    draw.line(iso_pts, fill=color, width=width, joint='curve')

def render_master_avatar(size=2048):
    # 1. Background: Deep obsidian luxury dark-mode canvas
    bg = create_radial_gradient(size, size, (14, 18, 30), (7, 9, 14)).convert('RGBA')
    
    # 2. Cyan ambient bloom layer
    cx = size / 2.0
    cy = size * 0.50
    
    bloom = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bloom)
    # Ambient soft circular glow behind the stack
    b_radius = size * 0.32
    bdraw.ellipse([cx - b_radius, cy - b_radius - size*0.05, cx + b_radius, cy + b_radius - size*0.05], fill=(0, 210, 255, 30))
    bloom = bloom.filter(ImageFilter.GaussianBlur(size * 0.08))
    bg.alpha_composite(bloom)
    
    # 3. Stack Geometry
    w = size * 0.44          # ~900px
    h = w * 0.54            # ~486px
    thickness = size * 0.052 # ~106px
    gap = size * 0.088       # ~180px
    
    cy_mid = cy + size * 0.02
    cy_bot = cy_mid + (thickness + gap)
    cy_top = cy_mid - (thickness + gap)
    
    # 4. Central Energy Conduit (Behind slabs)
    conduit = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(conduit)
    cdraw.line([cx, cy_top - h*0.2, cx, cy_bot + h*0.4], fill=(0, 229, 255, 120), width=12)
    conduit = conduit.filter(ImageFilter.GaussianBlur(12))
    bg.alpha_composite(conduit)
    
    draw = ImageDraw.Draw(bg)
    
    # 5. BOTTOM SLAB: Foundation Layer
    # Grounding shadow underneath
    bot_shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(bot_shadow)
    s_rad_w = w * 0.52
    s_rad_h = h * 0.52
    sdraw.ellipse([cx - s_rad_w, cy_bot + thickness*0.8 - s_rad_h, cx + s_rad_w, cy_bot + thickness*0.8 + s_rad_h], fill=(0, 0, 0, 160))
    bot_shadow = bot_shadow.filter(ImageFilter.GaussianBlur(32))
    bg.alpha_composite(bot_shadow)
    
    draw = ImageDraw.Draw(bg)
    draw_isometric_slab(
        draw, cx, cy_bot, w, h, thickness,
        top_color=(20, 26, 38),
        left_color=(12, 16, 24),
        right_color=(16, 21, 31),
        bevel_color=(45, 60, 85, 160),
        bevel_w=3
    )
    # Subtle cyan conduit mark on bottom top-face
    draw.ellipse([cx - size*0.025, cy_bot - size*0.013, cx + size*0.025, cy_bot + size*0.013], fill=(0, 229, 255, 60), outline=(0, 229, 255, 140), width=2)
    
    # 6. MIDDLE SLAB: Core Architecture Layer
    draw_isometric_slab(
        draw, cx, cy_mid, w * 0.92, h * 0.92, thickness,
        top_color=(26, 35, 52),
        left_color=(15, 20, 30),
        right_color=(20, 27, 40),
        bevel_color=(0, 210, 255, 110),
        bevel_w=3
    )
    # Conduit glow on middle slab
    draw.ellipse([cx - size*0.035, cy_mid - size*0.018, cx + size*0.035, cy_mid + size*0.018], fill=(0, 229, 255, 90), outline=(0, 229, 255, 180), width=3)
    
    # 7. TOP SLAB: Intelligence Layer
    # Top slab with prominent electric cyan bevels
    draw_isometric_slab(
        draw, cx, cy_top, w * 0.84, h * 0.84, thickness,
        top_color=(34, 45, 68),
        left_color=(18, 24, 38),
        right_color=(25, 34, 52),
        bevel_color=(0, 229, 255, 240),
        bevel_w=5
    )
    
    # Top Slab Face Hero Elements:
    # A glowing electric cyan chevron `>` prompt carved on top
    # Neon glow overlay for the chevron
    chev_glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    cgdraw = ImageDraw.Draw(chev_glow)
    
    # Draw glowing cyan chevron
    draw_iso_chevron(cgdraw, cx - size*0.03, cy_top, scale=1.5, color=(0, 229, 255, 255), width=28)
    # Draw matching prompt cursor pulse '_'
    cur_x = cx + size*0.06
    cur_y = cy_top + size*0.01
    cgdraw.line([cur_x, cur_y, cur_x + size*0.05, cur_y + size*0.026], fill=(0, 229, 255, 255), width=24)
    
    # Soft blur the glow
    chev_soft = chev_glow.filter(ImageFilter.GaussianBlur(16))
    bg.alpha_composite(chev_soft)
    
    # Crisp inner white-hot core
    draw = ImageDraw.Draw(bg)
    draw_iso_chevron(draw, cx - size*0.03, cy_top, scale=1.5, color=(240, 255, 255), width=14)
    draw.line([cur_x, cur_y, cur_x + size*0.05, cur_y + size*0.026], fill=(240, 255, 255), width=12)
    
    # 8. Subtle Tech Accents: Four Satellite Data Nodes around the stack
    node_color = (0, 229, 255, 220)
    node_r = size * 0.007
    
    nodes = [
        (cx - w * 0.58, cy_mid - h * 0.4),
        (cx + w * 0.58, cy_mid - h * 0.4),
        (cx - w * 0.58, cy_mid + h * 0.4),
        (cx + w * 0.58, cy_mid + h * 0.4)
    ]
    for nx, ny in nodes:
        # Mini glow
        draw.ellipse([nx - node_r*2.5, ny - node_r*2.5, nx + node_r*2.5, ny + node_r*2.5], fill=(0, 229, 255, 50))
        draw.ellipse([nx - node_r, ny - node_r, nx + node_r, ny + node_r], fill=(240, 255, 255, 255))
        # Subtle crosshair line
        draw.line([nx - node_r*3, ny, nx + node_r*3, ny], fill=(0, 229, 255, 120), width=2)
        draw.line([nx, ny - node_r*3, nx, ny + node_r*3], fill=(0, 229, 255, 120), width=2)

    # 9. Downsample with Lanczos to 1024x1024 for pristine antialiasing
    final_img = bg.resize((1024, 1024), Image.Resampling.LANCZOS)
    return final_img

if __name__ == '__main__':
    print("Rendering Master Brand Avatar...")
    avatar = render_master_avatar(2048)
    
    dest_brain = r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\youtube_profile_avatar.png"
    dest_ws = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\youtube_profile_avatar.png"
    dest_ws_jpg = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\youtube_profile_avatar.jpg"
    dest_brain_jpg = r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\youtube_profile_avatar.jpg"
    
    avatar.save(dest_brain)
    avatar.save(dest_ws)
    avatar.convert('RGB').save(dest_ws_jpg, quality=95)
    avatar.convert('RGB').save(dest_brain_jpg, quality=95)
    
    print("Done! Master brand avatar deployed successfully.")
