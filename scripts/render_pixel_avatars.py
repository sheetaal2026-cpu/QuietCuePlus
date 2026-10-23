import numpy as np
from PIL import Image, ImageDraw, ImageFont

def render_pixel_avatar_option_a():
    # 64x64 retro pixel canvas
    grid_size = 64
    img = Image.new('RGBA', (grid_size, grid_size), (250, 247, 242, 255)) # Soft cream background
    draw = ImageDraw.Draw(img)
    
    # Palette
    C_OUTLINE = (38, 28, 64, 255)       # Dark retro indigo outline
    C_WHITE = (255, 255, 255, 255)       # Clean white
    C_SHADOW_W = (226, 232, 240, 255)   # White shadow
    C_MINT = (52, 211, 153, 255)        # Retro pastel mint
    C_MINT_D = (16, 185, 129, 255)      # Mint shadow
    C_LILAC = (192, 132, 252, 255)      # Retro pastel lilac
    C_LILAC_D = (168, 85, 247, 255)     # Lilac shadow
    C_CYAN = (56, 189, 248, 255)        # Retro pastel cyan
    C_CYAN_D = (14, 165, 233, 255)      # Cyan shadow
    C_PINK = (244, 114, 182, 255)       # Cute blush pink
    C_GOLD = (250, 204, 21, 255)        # Retro gold
    C_BADGE_BG = (245, 243, 255, 255)   # Soft lavender-white badge
    C_BADGE_RING = (221, 214, 254, 255) # Badge ring
    
    # 1. Circular Badge Frame on 64x64 grid
    # Center (32, 32), radius 28
    for y in range(grid_size):
        for x in range(grid_size):
            dist = (x - 31.5)**2 + (y - 31.5)**2
            if dist <= 28.5**2:
                img.putpixel((x, y), C_BADGE_BG)
            if 27.5**2 <= dist <= 29.5**2:
                img.putpixel((x, y), C_BADGE_RING)
            if 29.5**2 < dist <= 30.5**2:
                img.putpixel((x, y), C_OUTLINE)

    # 2. Draw Stack of 3 Pixel Blocks (Bottom half)
    # Bottom Block (Cyan) - x: 19 to 44 (width 26), y: 45 to 50
    draw.rectangle([20, 45, 43, 50], fill=C_CYAN)
    draw.rectangle([20, 49, 43, 50], fill=C_CYAN_D) # shadow edge
    # Middle Block (Lilac) - x: 22 to 41 (width 20), y: 39 to 44
    draw.rectangle([22, 39, 41, 44], fill=C_LILAC)
    draw.rectangle([22, 43, 41, 44], fill=C_LILAC_D)
    # Top Block (Mint) - x: 25 to 38 (width 14), y: 33 to 38
    draw.rectangle([25, 33, 38, 38], fill=C_MINT)
    draw.rectangle([25, 37, 38, 38], fill=C_MINT_D)
    
    # Outlines for blocks
    # Block outlines
    for bx1, by1, bx2, by2 in [(20, 45, 43, 50), (22, 39, 41, 44), (25, 33, 38, 38)]:
        draw.line([(bx1, by1), (bx2, by1), (bx2, by2), (bx1, by2), (bx1, by1)], fill=C_OUTLINE)
        
    # Block Symbols (1-pixel lines)
    # Top block: Chevron '>'
    img.putpixel((30, 35), C_WHITE)
    img.putpixel((31, 35), C_WHITE)
    img.putpixel((32, 36), C_WHITE)
    img.putpixel((31, 37), C_WHITE)
    img.putpixel((30, 37), C_WHITE)
    
    # Middle block: 'S'
    for px, py in [(29, 41), (30, 41), (31, 41), (29, 42), (30, 42), (31, 42), (31, 43), (30, 43), (29, 43)]:
        img.putpixel((px, py), C_WHITE)
        
    # Bottom block: 'AI'
    for px, py in [(28, 47), (29, 47), (30, 47), (28, 48), (30, 48), (28, 49), (29, 49), (30, 49)]:
        img.putpixel((px, py), C_WHITE) # A
    for px, py in [(33, 47), (34, 47), (35, 47), (34, 48), (33, 49), (34, 49), (35, 49)]:
        img.putpixel((px, py), C_WHITE) # I
        
    # 3. Chibi Pixel Bot Character (Upper Half)
    # Antenna (center x=31, 32)
    draw.line([(31, 14), (31, 17)], fill=C_OUTLINE)
    draw.line([(32, 14), (32, 17)], fill=C_OUTLINE)
    # Gold star/orb on antenna tip
    draw.rectangle([30, 11, 33, 14], fill=C_GOLD)
    img.putpixel((30, 11), C_OUTLINE)
    img.putpixel((33, 11), C_OUTLINE)
    img.putpixel((30, 14), C_OUTLINE)
    img.putpixel((33, 14), C_OUTLINE)
    img.putpixel((31, 12), C_WHITE) # twinkle
    
    # Bot Head Body (x: 21 to 42, y: 18 to 32)
    head_box = [21, 18, 42, 32]
    draw.rectangle(head_box, fill=C_WHITE)
    # Round corners
    img.putpixel((21, 18), C_BADGE_BG)
    img.putpixel((42, 18), C_BADGE_BG)
    img.putpixel((21, 32), C_BADGE_BG)
    img.putpixel((42, 32), C_BADGE_BG)
    # Head outline
    draw.line([(22, 17), (41, 17)], fill=C_OUTLINE) # top
    draw.line([(20, 19), (20, 31)], fill=C_OUTLINE) # left
    draw.line([(43, 19), (43, 31)], fill=C_OUTLINE) # right
    draw.line([(22, 33), (41, 33)], fill=C_OUTLINE) # bottom
    # corner pixels
    img.putpixel((21, 18), C_OUTLINE)
    img.putpixel((42, 18), C_OUTLINE)
    img.putpixel((21, 32), C_OUTLINE)
    img.putpixel((42, 32), C_OUTLINE)
    
    # Headphones (Retro ear pads on sides)
    # Left ear pad
    draw.rectangle([18, 22, 20, 28], fill=C_CYAN)
    draw.rectangle([18, 27, 20, 28], fill=C_CYAN_D)
    draw.line([(18, 21), (20, 21), (20, 29), (18, 29), (18, 21)], fill=C_OUTLINE)
    # Right ear pad
    draw.rectangle([43, 22, 45, 28], fill=C_CYAN)
    draw.rectangle([43, 27, 45, 28], fill=C_CYAN_D)
    draw.line([(43, 21), (45, 21), (45, 29), (43, 29), (43, 21)], fill=C_OUTLINE)
    # Headphone band across top
    draw.line([(21, 16), (42, 16)], fill=C_CYAN)
    draw.line([(21, 15), (42, 15)], fill=C_OUTLINE)
    
    # 4. Kawaii Face on Bot Head
    # Left Eye (x: 25, 26, y: 22, 23, 24)
    draw.rectangle([25, 22, 26, 25], fill=C_OUTLINE)
    img.putpixel((25, 22), C_WHITE) # catchlight
    img.putpixel((26, 25), C_CYAN)  # cyan reflection
    
    # Right Eye (x: 37, 38, y: 22, 23, 24)
    draw.rectangle([37, 22, 38, 25], fill=C_OUTLINE)
    img.putpixel((37, 22), C_WHITE) # catchlight
    img.putpixel((38, 25), C_CYAN)  # cyan reflection
    
    # Blushing Cheeks (Pink 2x1 pixels)
    draw.rectangle([23, 26, 24, 27], fill=C_PINK)
    draw.rectangle([39, 26, 40, 27], fill=C_PINK)
    
    # Smiling Mouth (small cute smile)
    img.putpixel((31, 26), C_OUTLINE)
    img.putpixel((32, 26), C_OUTLINE)
    img.putpixel((30, 25), C_OUTLINE)
    img.putpixel((33, 25), C_OUTLINE)
    
    # 5. Cute Chubby Hands/Paws resting on top block
    draw.rectangle([26, 32, 28, 34], fill=C_WHITE)
    draw.line([(25, 32), (25, 34), (29, 34), (29, 32)], fill=C_OUTLINE)
    draw.rectangle([35, 32, 37, 34], fill=C_WHITE)
    draw.line([(34, 32), (34, 34), (38, 34), (38, 32)], fill=C_OUTLINE)
    
    # 6. Floating Retro Pixel Accents
    # Retro Pixel Star (Top-Left)
    star_x, star_y = 12, 14
    img.putpixel((star_x, star_y), C_GOLD)
    img.putpixel((star_x - 1, star_y), C_GOLD)
    img.putpixel((star_x + 1, star_y), C_GOLD)
    img.putpixel((star_x, star_y - 1), C_GOLD)
    img.putpixel((star_x, star_y + 1), C_GOLD)
    
    # Retro Pixel Heart (Top-Right)
    hx, hy = 50, 15
    for px, py in [(hx-1, hy), (hx, hy), (hx+2, hy), (hx+3, hy),
                   (hx-2, hy+1), (hx-1, hy+1), (hx, hy+1), (hx+1, hy+1), (hx+2, hy+1), (hx+3, hy+1),
                   (hx-1, hy+2), (hx, hy+2), (hx+1, hy+2), (hx+2, hy+2),
                   (hx, hy+3), (hx+1, hy+3)]:
        img.putpixel((px, py), (244, 63, 94, 255))
        
    # Sparkle Star (Bottom-Left)
    sx, sy = 12, 46
    img.putpixel((sx, sy), C_MINT)
    img.putpixel((sx-1, sy), C_MINT)
    img.putpixel((sx+1, sy), C_MINT)
    img.putpixel((sx, sy-1), C_MINT)
    img.putpixel((sx, sy+1), C_MINT)
    
    # Sparkle Star (Bottom-Right)
    sx2, sy2 = 51, 44
    img.putpixel((sx2, sy2), C_LILAC)
    img.putpixel((sx2-1, sy2), C_LILAC)
    img.putpixel((sx2+1, sy2), C_LILAC)
    img.putpixel((sx2, sy2-1), C_LILAC)
    img.putpixel((sx2, sy2+1), C_LILAC)
    
    # 7. Upscale 16x with Nearest Neighbor to 1024x1024 for razor-sharp pixel edges
    final_1024 = img.resize((1024, 1024), Image.Resampling.NEAREST)
    return final_1024

def render_pixel_avatar_option_b():
    # Option B: Retro 16-Bit CRT Monitor Buddy
    grid_size = 64
    img = Image.new('RGBA', (grid_size, grid_size), (245, 240, 255, 255)) # Soft pastel lavender background
    draw = ImageDraw.Draw(img)
    
    # Palette
    C_OUTLINE = (38, 28, 64, 255)       # Dark retro indigo outline
    C_CREAM = (255, 253, 245, 255)      # Retro computer beige/cream
    C_CREAM_D = (235, 228, 215, 255)    # Shaded beige
    C_SCREEN_BG = (22, 27, 46, 255)     # CRT screen dark slate
    C_MINT = (52, 211, 153, 255)        # Glowing green terminal phosphor
    C_CYAN = (56, 189, 248, 255)        # Glowing cyan
    C_LILAC = (192, 132, 252, 255)      # Lilac
    C_PINK = (244, 114, 182, 255)       # Blush pink
    C_GOLD = (250, 204, 21, 255)        # Gold
    C_BADGE_BG = (255, 255, 255, 255)   # White circular badge
    C_BADGE_RING = (233, 213, 255, 255) # Soft purple ring
    
    # 1. Circular Badge Frame on 64x64 grid
    for y in range(grid_size):
        for x in range(grid_size):
            dist = (x - 31.5)**2 + (y - 31.5)**2
            if dist <= 28.5**2:
                img.putpixel((x, y), C_BADGE_BG)
            if 27.5**2 <= dist <= 29.5**2:
                img.putpixel((x, y), C_BADGE_RING)
            if 29.5**2 < dist <= 30.5**2:
                img.putpixel((x, y), C_OUTLINE)

    # 2. Stack of Pastel Game Cartridges / Floppy Disks under the monitor
    # Disk 3 (bottom, Lilac) - y: 47 to 51
    draw.rectangle([18, 47, 45, 51], fill=C_LILAC)
    draw.line([(18, 47), (45, 47), (45, 51), (18, 51), (18, 47)], fill=C_OUTLINE)
    draw.rectangle([26, 48, 37, 50], fill=(255, 255, 255, 200)) # disk label
    
    # Disk 2 (middle, Cyan) - y: 42 to 46
    draw.rectangle([20, 42, 43, 46], fill=C_CYAN)
    draw.line([(20, 42), (43, 42), (43, 46), (20, 46), (20, 42)], fill=C_OUTLINE)
    draw.rectangle([27, 43, 36, 45], fill=(255, 255, 255, 200))
    
    # Stand / Base for Monitor - y: 38 to 41
    draw.rectangle([27, 38, 36, 41], fill=C_CREAM)
    draw.line([(27, 38), (36, 38), (36, 41), (27, 41), (27, 38)], fill=C_OUTLINE)
    
    # 3. Retro CRT Monitor Body (x: 18 to 45, y: 16 to 37)
    draw.rectangle([18, 16, 45, 37], fill=C_CREAM)
    draw.rectangle([18, 35, 45, 37], fill=C_CREAM_D) # bottom shadow
    # Corner pixels rounded
    img.putpixel((18, 16), C_BADGE_BG)
    img.putpixel((45, 16), C_BADGE_BG)
    img.putpixel((18, 37), C_BADGE_BG)
    img.putpixel((45, 37), C_BADGE_BG)
    
    # Monitor Outer Outline
    draw.line([(19, 15), (44, 15)], fill=C_OUTLINE)
    draw.line([(17, 17), (17, 36)], fill=C_OUTLINE)
    draw.line([(46, 17), (46, 36)], fill=C_OUTLINE)
    draw.line([(19, 38), (44, 38)], fill=C_OUTLINE)
    img.putpixel((18, 16), C_OUTLINE)
    img.putpixel((45, 16), C_OUTLINE)
    img.putpixel((18, 37), C_OUTLINE)
    img.putpixel((45, 37), C_OUTLINE)
    
    # Cute Cat Ears on top of monitor!
    # Left cat ear
    draw.polygon([(20, 15), (23, 10), (26, 15)], fill=C_CREAM)
    draw.polygon([(21, 14), (23, 11), (25, 14)], fill=C_PINK) # pink inner ear
    draw.line([(20, 15), (23, 10), (26, 15)], fill=C_OUTLINE)
    # Right cat ear
    draw.polygon([(37, 15), (40, 10), (43, 15)], fill=C_CREAM)
    draw.polygon([(38, 14), (40, 11), (42, 14)], fill=C_PINK)
    draw.line([(37, 15), (40, 10), (43, 15)], fill=C_OUTLINE)
    
    # 4. CRT Beveled Screen (x: 21 to 42, y: 19 to 33)
    draw.rectangle([21, 19, 42, 33], fill=C_SCREEN_BG)
    draw.line([(21, 19), (42, 19), (42, 33), (21, 33), (21, 19)], fill=C_OUTLINE)
    
    # Screen Face: Glowing Kawaii terminal face (^ _ ^) with prompt
    # Smiling eyes (^ ^) in glowing mint green
    # Left eye ^
    img.putpixel((26, 24), C_MINT)
    img.putpixel((25, 25), C_MINT)
    img.putpixel((27, 25), C_MINT)
    
    # Right eye ^
    img.putpixel((37, 24), C_MINT)
    img.putpixel((36, 25), C_MINT)
    img.putpixel((38, 25), C_MINT)
    
    # Glowing prompt chevron '>' in middle top
    img.putpixel((23, 22), C_CYAN)
    img.putpixel((24, 23), C_CYAN)
    img.putpixel((23, 24), C_CYAN)
    
    # Sweet open mouth
    img.putpixel((31, 27), C_MINT)
    img.putpixel((32, 27), C_MINT)
    img.putpixel((30, 26), C_MINT)
    img.putpixel((33, 26), C_MINT)
    
    # Blushing pink pixels on screen
    draw.rectangle([25, 28, 27, 28], fill=C_PINK)
    draw.rectangle([36, 28, 38, 28], fill=C_PINK)
    
    # 5. Floating Retro Pixel Accents
    # Floating gold star
    star_x, star_y = 12, 16
    img.putpixel((star_x, star_y), C_GOLD)
    img.putpixel((star_x - 1, star_y), C_GOLD)
    img.putpixel((star_x + 1, star_y), C_GOLD)
    img.putpixel((star_x, star_y - 1), C_GOLD)
    img.putpixel((star_x, star_y + 1), C_GOLD)
    
    # Floating pastel mint heart
    hx, hy = 50, 16
    for px, py in [(hx-1, hy), (hx, hy), (hx+2, hy), (hx+3, hy),
                   (hx-2, hy+1), (hx-1, hy+1), (hx, hy+1), (hx+1, hy+1), (hx+2, hy+1), (hx+3, hy+1),
                   (hx-1, hy+2), (hx, hy+2), (hx+1, hy+2), (hx+2, hy+2),
                   (hx, hy+3), (hx+1, hy+3)]:
        img.putpixel((px, py), C_MINT)
        
    # Floating pixel sparkles
    img.putpixel((12, 45), C_CYAN)
    img.putpixel((51, 45), C_LILAC)
    
    # Upscale 16x with Nearest Neighbor
    final_1024 = img.resize((1024, 1024), Image.Resampling.NEAREST)
    return final_1024

if __name__ == '__main__':
    print("Rendering Retro 16-Bit Pixel Avatars...")
    opt_a = render_pixel_avatar_option_a()
    opt_b = render_pixel_avatar_option_b()
    
    # Save Option A (Chibi Pixel Bot)
    opt_a.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\pixel_avatar_option_a.png")
    opt_a.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\pixel_avatar_option_a.png")
    
    # Save Option B (CRT Monitor Buddy)
    opt_b.save(r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\pixel_avatar_option_b.png")
    opt_b.save(r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\pixel_avatar_option_b.png")
    
    print("Done! Both retro pixel avatars generated successfully.")
