import os
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1920
HEIGHT = 1080

COLOR_BG_TOP = (28, 21, 22)
COLOR_BG_BOTTOM = (40, 27, 29)
COLOR_CARD_BG = (34, 23, 25)
COLOR_FRAME_BG = (18, 12, 14)
COLOR_BORDER = (75, 48, 52)
COLOR_ROSE_ACCENT = (251, 113, 133)
COLOR_CYAN_ACCENT = (56, 189, 248)
COLOR_GREEN_ACCENT = (52, 211, 153)
COLOR_TEXT_ALABASTER = (255, 241, 242)
COLOR_TEXT_MUTED = (253, 164, 175)
COLOR_TEXT_BODY = (226, 212, 214)
COLOR_BADGE_BG = (55, 30, 34)

FONT_REG_PATH = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD_PATH = "C:/Windows/Fonts/segoeuib.ttf"
FONT_MONO_PATH = "C:/Windows/Fonts/consola.ttf"

font_brand = ImageFont.truetype(FONT_BOLD_PATH, 28)
font_category = ImageFont.truetype(FONT_BOLD_PATH, 16)
font_title = ImageFont.truetype(FONT_BOLD_PATH, 25)
font_subtitle = ImageFont.truetype(FONT_REG_PATH, 16)
font_pillar_title = ImageFont.truetype(FONT_BOLD_PATH, 17)
font_pillar_body = ImageFont.truetype(FONT_REG_PATH, 14)
font_mono_small = ImageFont.truetype(FONT_MONO_PATH, 14)
font_mono_title = ImageFont.truetype(FONT_MONO_PATH, 15)
font_footer = ImageFont.truetype(FONT_REG_PATH, 16)
font_footer_bold = ImageFont.truetype(FONT_BOLD_PATH, 16)

SLIDES_DIR = "c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/slides"

slides_config = [
    {
        "slide_num": 1,
        "timecode": "CHAPTER 1 | 0:00 - 0:25",
        "category": "CONCEPT & DIFFERENTIATOR",
        "title": "Living Room Harmony & Why QuietCue+ Is Different",
        "subtitle": "Context-aware attention triage for intelligent smart homes",
        "capture_file": "live_screen_1_dashboard.png",
        "capture_label": "QUIETCUE+ MASTER DASHBOARD : http://localhost:5173/",
        "telemetry_text": "SYSTEM: ONLINE | SURFACE: FIRE TV & VR | ATTENTION FILTERS: 3 ACTIVE TIERS",
        "pillars": [
            {
                "num": "1",
                "title": "Contextual Attention Dilemma",
                "desc": "Standard systems treat all alerts as all-or-nothing, causing continuous interruptions."
            },
            {
                "num": "2",
                "title": "Intelligent Attention Shield",
                "desc": "QuietCue+ dynamically mediates between household signals and entertainment."
            },
            {
                "num": "3",
                "title": "Three-Tier Contextual Triage",
                "desc": "Urgent Safety breakthroughs, session-break releases, and silent evening digests."
            },
            {
                "num": "4",
                "title": "Cross-Device Synchrony",
                "desc": "Seamless coordination across Alexa+, Fire TV screens, and spatial headsets."
            }
        ]
    },
    {
        "slide_num": 2,
        "timecode": "CHAPTER 2 | 0:25 - 0:55",
        "category": "AMAZON BEDROCK INTELLIGENCE",
        "title": "Intent-Driven Smart Contracts via Bedrock",
        "subtitle": "Zero configuration menus : Spoken natural language compiled into JSON policies",
        "capture_file": "live_screen_2_family_time_bedrock.png",
        "capture_label": "VOICE CONTRACT COMPILER : FAMILY TIME SYNTHESIS",
        "telemetry_text": "INTENT: PARSED | BEDROCK: CLAUDE 3.5 | POLICIES: 3 RULES ACTIVE | MCP: SYNCED",
        "pillars": [
            {
                "num": "1",
                "title": "Conversational Input",
                "desc": "Spoken intent: start Family Time with critical alerts prioritized."
            },
            {
                "num": "2",
                "title": "Amazon Bedrock Synthesis",
                "desc": "Instantly compiles voice commands into structured 3-rule smart contracts."
            },
            {
                "num": "3",
                "title": "Real-Time Priority Assignment",
                "desc": "Priority 1 safety alert, Priority 2 standard delivery, Priority 3 routine sensor."
            },
            {
                "num": "4",
                "title": "Instant Hardware Enforcement",
                "desc": "MCP streamable transport synchronizes policies across active devices."
            }
        ]
    },
    {
        "slide_num": 3,
        "timecode": "CHAPTER 3 | 0:55 - 1:20",
        "category": "TELEVISION INTERFACE",
        "title": "Fire TV Client : Breakthrough HUD vs Whisper Cues",
        "subtitle": "No blaring screen takeovers : Dual-tier visual architectures for television displays",
        "capture_file": "live_screen_3_firetv_hud.png",
        "capture_label": "FIRE TV CLIENT SIMULATOR : http://localhost:5173/?client=tv",
        "telemetry_text": "DISPLAY: 1080P FULL HD | HUD: PERIPHERAL WHISPER | DIALOG OCCLUSION: ZERO",
        "pillars": [
            {
                "num": "1",
                "title": "Fire TV Client Simulator",
                "desc": "Real-time television interface simulation with active video playback."
            },
            {
                "num": "2",
                "title": "Top Priority Alert HUD",
                "desc": "Critical safety alerts surface along the upper edge without blocking video."
            },
            {
                "num": "3",
                "title": "Peripheral Whisper Cues",
                "desc": "Standard front door deliveries anchor quietly at the lower screen border."
            },
            {
                "num": "4",
                "title": "Unbroken Concentration",
                "desc": "Stay informed about your home without losing focus on your content."
            }
        ]
    },
    {
        "slide_num": 4,
        "timecode": "CHAPTER 4 | 1:20 - 1:45",
        "category": "SPATIAL COMPUTING",
        "title": "Spatial Guardian & Cross-Device MCP Protocol",
        "subtitle": "Fire TV as an external safety anchor with active cyan boundary protection",
        "capture_file": "live_screen_4_vr_immersion.png",
        "capture_label": "VR IMMERSION 360 SPATIAL CANVAS & GUARDIAN GRID",
        "telemetry_text": "GUARDIAN: ACTIVE CYAN | SPATIAL REFRESH: 90 HZ | AUDIO: 3D BINAURAL DIRECTIONAL",
        "pillars": [
            {
                "num": "1",
                "title": "Spatial Hazard Prevention",
                "desc": "Protects headset wearers from physical room collisions during immersion."
            },
            {
                "num": "2",
                "title": "Cyan Guardian Boundary Grid",
                "desc": "Projects a responsive 360 spatial safety grid visible in headset telemetry."
            },
            {
                "num": "3",
                "title": "Model Context Protocol SDK",
                "desc": "Streamable HTTP transport bridges Alexa+, Fire TV, and spatial devices."
            },
            {
                "num": "4",
                "title": "Directional Whisper Alerts",
                "desc": "Urgent alerts penetrate spatial view while routine updates remain outside."
            }
        ]
    },
    {
        "slide_num": 5,
        "timecode": "CHAPTER 5 | 1:45 - 2:05",
        "category": "VOICE AUTOMATION",
        "title": "Real-Time Voice Typing & Focus Sprint Blocks",
        "subtitle": "Hands-free character streaming search and structured productivity intervals",
        "capture_file": "live_screen_5_focus_timer.png",
        "capture_label": "VOICE CALLING STREAM & FOCUS SPRINT CONTROLLER",
        "telemetry_text": "INPUT: SPEECH-TO-TEXT STREAM | SPRINT: 25 MINUTE BLOCK | BUFFER: ACTIVE",
        "pillars": [
            {
                "num": "1",
                "title": "Speech-to-Text Streaming",
                "desc": "Characters stream live into the search bar as you speak commands."
            },
            {
                "num": "2",
                "title": "Structured Focus Sprints",
                "desc": "15-minute quick sprints, 25-minute focus blocks, or 50-minute deep intervals."
            },
            {
                "num": "3",
                "title": "Interactive On-Screen Controls",
                "desc": "Instant pause, resume, and extend actions right from the television display."
            },
            {
                "num": "4",
                "title": "Session Break Coordination",
                "desc": "Held updates release smoothly when the focus timer completes."
            }
        ]
    },
    {
        "slide_num": 6,
        "timecode": "CHAPTER 6 | 2:05 - 2:25",
        "category": "UI DESIGN & LOCALIZATION",
        "title": "Runtime Translation & Dark Cedar Design",
        "subtitle": "Dynamic multi-language support and eye-comfort aesthetics for living rooms",
        "capture_file": "live_screen_6_multilingual.png",
        "capture_label": "COMPACT LANGUAGE DROPDOWN & DARK CEDAR DESIGN",
        "telemetry_text": "LANGUAGES: MULTI-LOCALE SUPPORT | THEME: DARK CEDAR | CONTRAST: 14.8 TO 1 AAA",
        "pillars": [
            {
                "num": "1",
                "title": "Compact Language Selector",
                "desc": "Instant switching across multiple world languages with zero reload delay."
            },
            {
                "num": "2",
                "title": "Dynamic Runtime Localization",
                "desc": "Translates contracts, whisper cues, and HUD alerts in real time."
            },
            {
                "num": "3",
                "title": "Dark Cedar & Warm Dusk",
                "desc": "Low-glare palette crafted specifically for comfortable screen distance."
            },
            {
                "num": "4",
                "title": "High-Contrast Accessibility",
                "desc": "WCAG AAA alabaster typography ensures crisp living room legibility."
            }
        ]
    },
    {
        "slide_num": 7,
        "timecode": "CHAPTER 7 | 2:25 - 2:46",
        "category": "SUBMISSION IMPACT",
        "title": "Submission Checklist & Amazon Developer Feedback",
        "subtitle": "Working software, MIT open source codebase, and Bedrock developer insights",
        "capture_file": "live_screen_2_family_time_bedrock.png",
        "capture_label": "ECOSYSTEM UNIFICATION : BEDROCK + FIRE TV + VR",
        "telemetry_text": "ARCHITECTURE: REACT + TYPESCRIPT + BEDROCK + MCP SERVER | READY FOR SUBMISSION",
        "pillars": [
            {
                "num": "1",
                "title": "Track Technology Alignment",
                "desc": "Working software with Amazon Bedrock, Fire TV, and MCP TypeScript SDK."
            },
            {
                "num": "2",
                "title": "Strictly Under 3 Minutes",
                "desc": "Calibrated 2 minute 46 second runtime showing real working features."
            },
            {
                "num": "3",
                "title": "MIT Open Source Codebase",
                "desc": "Public repository with clear architecture, tests, and open license."
            },
            {
                "num": "4",
                "title": "Amazon Developer Feedback",
                "desc": "Specific feedback on Bedrock streaming JSON compilation latency."
            }
        ]
    }
]

def create_gradient_bg(width, height, top_color, bottom_color):
    base = Image.new("RGB", (width, height), top_color)
    draw = ImageDraw.Draw(base)
    for y in range(height):
        factor = y / float(height)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * factor)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * factor)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return base

def draw_rounded_card(draw, bounds, fill, outline, width=2, radius=16):
    draw.rounded_rectangle(bounds, radius=radius, fill=fill, outline=outline, width=width)

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    curr = []
    for w in words:
        test_line = " ".join(curr + [w])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            curr.append(w)
        else:
            if curr:
                lines.append(" ".join(curr))
                curr = [w]
            else:
                lines.append(w)
                curr = []
    if curr:
        lines.append(" ".join(curr))
    return lines

def render_big_screen_slide(cfg, out_path):
    img = create_gradient_bg(WIDTH, HEIGHT, COLOR_BG_TOP, COLOR_BG_BOTTOM)
    draw = ImageDraw.Draw(img)

    # Top accent line
    draw.line([(0, 0), (WIDTH, 0)], fill=COLOR_ROSE_ACCENT, width=4)

    # Top Header
    draw.text((45, 24), "QUIETCUE+", font=font_brand, fill=COLOR_ROSE_ACCENT)

    # Category Pill
    cat_text = cfg["category"]
    cat_bbox = font_category.getbbox(cat_text)
    cat_w = cat_bbox[2] - cat_bbox[0]
    cat_h = cat_bbox[3] - cat_bbox[1]
    pill_x = 240
    pill_y = 28
    draw.rounded_rectangle(
        [(pill_x, pill_y), (pill_x + cat_w + 20, pill_y + cat_h + 12)],
        radius=6,
        fill=COLOR_BADGE_BG,
        outline=COLOR_BORDER,
        width=1
    )
    draw.text((pill_x + 10, pill_y + 5), cat_text, font=font_category, fill=COLOR_TEXT_MUTED)

    # Timecode Pill
    tc_text = cfg["timecode"]
    tc_bbox = font_category.getbbox(tc_text)
    tc_w = tc_bbox[2] - tc_bbox[0]
    tc_x = WIDTH - 45 - tc_w - 20
    tc_y = 28
    draw.rounded_rectangle(
        [(tc_x, tc_y), (tc_x + tc_w + 20, tc_y + cat_h + 12)],
        radius=6,
        fill=(38, 26, 32),
        outline=COLOR_ROSE_ACCENT,
        width=1
    )
    draw.text((tc_x + 10, tc_y + 5), tc_text, font=font_category, fill=COLOR_ROSE_ACCENT)

    # Header separator
    draw.line([(45, 72), (WIDTH - 45, 72)], fill=COLOR_BORDER, width=1)

    # EXPANSIVE TWO COLUMN LAYOUT:
    # Left Sidebar: Takeaways & Chapter Title
    left_x1 = 45
    left_y1 = 88
    left_x2 = 455
    left_y2 = 1008
    draw_rounded_card(draw, [(left_x1, left_y1), (left_x2, left_y2)], COLOR_CARD_BG, COLOR_BORDER, width=2, radius=16)

    # Title & Subtitle inside Left Card
    inner_w = (left_x2 - left_x1) - 40
    title_lines = wrap_text(cfg["title"], font_title, inner_w, draw)
    curr_ty = left_y1 + 22
    for tl in title_lines:
        draw.text((left_x1 + 20, curr_ty), tl, font=font_title, fill=COLOR_TEXT_ALABASTER)
        curr_ty += 32
        
    sub_lines = wrap_text(cfg["subtitle"], font_subtitle, inner_w, draw)
    curr_ty += 4
    for sl in sub_lines:
        draw.text((left_x1 + 20, curr_ty), sl, font=font_subtitle, fill=COLOR_TEXT_MUTED)
        curr_ty += 22

    draw.line([(left_x1 + 20, curr_ty + 8), (left_x2 - 20, curr_ty + 8)], fill=(55, 38, 42), width=1)

    # 4 Pillars
    pillar_y_start = curr_ty + 22
    avail_pillar_height = (left_y2 - pillar_y_start) - 10
    pillar_spacing = avail_pillar_height // len(cfg["pillars"])

    for i, p in enumerate(cfg["pillars"]):
        curr_y = pillar_y_start + i * pillar_spacing
        badge_size = 28
        bx = left_x1 + 20
        by = curr_y

        draw.rounded_rectangle(
            [(bx, by), (bx + badge_size, by + badge_size)],
            radius=6,
            fill=COLOR_BADGE_BG,
            outline=COLOR_ROSE_ACCENT,
            width=2
        )
        b_text = p["num"]
        bbox = font_pillar_title.getbbox(b_text)
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        draw.text((bx + (badge_size - bw) // 2, by + (badge_size - bh) // 2 - 2), b_text, font=font_pillar_title, fill=COLOR_ROSE_ACCENT)

        tx = bx + badge_size + 12
        draw.text((tx, curr_y + 3), p["title"], font=font_pillar_title, fill=COLOR_TEXT_ALABASTER)
        
        # Word wrapped description
        desc_lines = wrap_text(p["desc"], font_pillar_body, inner_w, draw)
        dy = curr_y + 34
        for dl in desc_lines[:2]:
            draw.text((bx, dy), dl, font=font_pillar_body, fill=COLOR_TEXT_BODY)
            dy += 20

    # MASSIVE RIGHT VIEWPORT (1410px wide x 920px tall): The Grand Screen Showcase!
    rx1 = 475
    ry1 = 88
    rx2 = WIDTH - 45
    ry2 = 1008
    draw_rounded_card(draw, [(rx1, ry1), (rx2, ry2)], COLOR_FRAME_BG, COLOR_BORDER, width=2, radius=16)

    # Hardware bezel bar
    tb_h = 40
    draw.rounded_rectangle([(rx1, ry1), (rx2, ry1 + tb_h)], radius=16, fill=(28, 18, 21), outline=COLOR_BORDER, width=1)

    # 3 mock window dots
    dot_y = ry1 + 20
    draw.ellipse([(rx1 + 20, dot_y - 5), (rx1 + 30, dot_y + 5)], fill=(244, 63, 94))
    draw.ellipse([(rx1 + 38, dot_y - 5), (rx1 + 48, dot_y + 5)], fill=(251, 191, 36))
    draw.ellipse([(rx1 + 56, dot_y - 5), (rx1 + 66, dot_y + 5)], fill=(52, 211, 153))

    # Capture label
    draw.text((rx1 + 82, ry1 + 11), cfg["capture_label"], font=font_mono_title, fill=COLOR_TEXT_MUTED)

    # Live pulse dot
    p_x = rx2 - 28
    p_y = ry1 + 20
    draw.ellipse([(p_x - 5, p_y - 5), (p_x + 5, p_y + 5)], fill=COLOR_GREEN_ACCENT)

    # EMBED MASSIVE SCREEN CAPTURE
    cap_path = os.path.join(SLIDES_DIR, cfg["capture_file"])
    if os.path.exists(cap_path):
        screen_raw = Image.open(cap_path).convert("RGBA")
        
        # Maximum available dimensions inside the hero viewport
        avail_w = rx2 - rx1 - 20
        avail_h = ry2 - (ry1 + tb_h + 40)
        
        raw_w, raw_h = screen_raw.size
        ratio = min(avail_w / float(raw_w), avail_h / float(raw_h))
        new_w = int(raw_w * ratio)
        new_h = int(raw_h * ratio)
        
        screen_resized = screen_raw.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Center the massive screen
        paste_x = rx1 + 10 + (avail_w - new_w) // 2
        paste_y = ry1 + tb_h + 8 + (avail_h - new_h) // 2
        
        img.paste(screen_resized, (paste_x, paste_y), screen_resized)
        
        # Crisp outline around the enlarged screen
        draw.rectangle([(paste_x - 1, paste_y - 1), (paste_x + new_w + 1, paste_y + new_h + 1)], outline=(85, 56, 62), width=1)

    # Telemetry Status Ticker below capture
    draw.line([(rx1 + 16, ry2 - 32), (rx2 - 16, ry2 - 32)], fill=(55, 38, 42), width=1)
    draw.text((rx1 + 24, ry2 - 24), cfg["telemetry_text"], font=font_mono_small, fill=COLOR_CYAN_ACCENT)

    # Bottom Footer Bar
    draw.line([(45, 1024), (WIDTH - 45, 1024)], fill=COLOR_BORDER, width=1)
    footer_text = "QuietCue+ Ecosystem : Fire TV Client | Alexa+ Bedrock | Spatial VR Immersion"
    draw.text((45, 1044), footer_text, font=font_footer, fill=COLOR_TEXT_MUTED)

    slide_ind = f"SLIDE {cfg['slide_num']} OF 7"
    si_bbox = font_footer_bold.getbbox(slide_ind)
    si_w = si_bbox[2] - si_bbox[0]
    draw.text((WIDTH - 45 - si_w, 1044), slide_ind, font=font_footer_bold, fill=COLOR_ROSE_ACCENT)

    img.save(out_path, "PNG")
    print(f"Generated massive screen slide: {out_path}")

def main():
    for item in slides_config:
        out_file = os.path.join(SLIDES_DIR, f"slide_{item['slide_num']}.png")
        render_big_screen_slide(item, out_file)
    print("All 7 enlarged video slides generated successfully.")

if __name__ == "__main__":
    main()
