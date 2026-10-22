import os
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1920
HEIGHT = 1080

COLOR_BG_TOP = (28, 21, 22)
COLOR_BG_BOTTOM = (43, 29, 31)
COLOR_CARD_BG = (36, 25, 27)
COLOR_CARD_RIGHT = (30, 20, 22)
COLOR_BORDER = (78, 52, 56)
COLOR_ROSE_ACCENT = (251, 113, 133)
COLOR_CYAN_ACCENT = (56, 189, 248)
COLOR_GREEN_ACCENT = (52, 211, 153)
COLOR_TEXT_ALABASTER = (255, 241, 242)
COLOR_TEXT_MUTED = (253, 164, 175)
COLOR_TEXT_BODY = (226, 212, 214)
COLOR_BADGE_BG = (58, 32, 36)

FONT_REG_PATH = "C:/Windows/Fonts/segoeui.ttf"
FONT_BOLD_PATH = "C:/Windows/Fonts/segoeuib.ttf"
FONT_MONO_PATH = "C:/Windows/Fonts/consola.ttf"

font_brand = ImageFont.truetype(FONT_BOLD_PATH, 32)
font_category = ImageFont.truetype(FONT_BOLD_PATH, 18)
font_title = ImageFont.truetype(FONT_BOLD_PATH, 44)
font_subtitle = ImageFont.truetype(FONT_REG_PATH, 22)
font_pillar_title = ImageFont.truetype(FONT_BOLD_PATH, 22)
font_pillar_body = ImageFont.truetype(FONT_REG_PATH, 18)
font_mono = ImageFont.truetype(FONT_MONO_PATH, 18)
font_mono_bold = ImageFont.truetype(FONT_MONO_PATH, 20)
font_footer = ImageFont.truetype(FONT_REG_PATH, 18)
font_footer_bold = ImageFont.truetype(FONT_BOLD_PATH, 18)

slides_data = [
    {
        "slide_num": 1,
        "timecode": "CHAPTER 1 | 0:00 - 0:25",
        "category": "CONCEPT & ARCHITECTURE",
        "title": "The Living Room Attention Shield",
        "subtitle": "Intelligent attention triage between smart home signals and entertainment",
        "pillars": [
            {
                "num": "1",
                "title": "Notification Flooding Gap",
                "desc": "Traditional alerts disrupt immersion with invasive popups and sudden loud chimes."
            },
            {
                "num": "2",
                "title": "Intelligent Cognitive Shield",
                "desc": "QuietCue+ acts as an active attention filter between home sensors and your focus."
            },
            {
                "num": "3",
                "title": "Three-Tier Priority Architecture",
                "desc": "Routes events dynamically into Urgent Safety, Session Break, or Digest tiers."
            },
            {
                "num": "4",
                "title": "Adaptive Dual-Surface Routing",
                "desc": "Seamless coordination across Fire TV television displays and VR spatial headsets."
            }
        ],
        "right_header": "TELEMETRY & ATTENTION MONITOR",
        "right_color": COLOR_ROSE_ACCENT,
        "telemetry_lines": [
            ("SYSTEM STATUS", "ONLINE & PROTECTING", COLOR_GREEN_ACCENT),
            ("CURRENT MODE", "DEEP FOCUS SESSION", COLOR_ROSE_ACCENT),
            ("PROTECTED SURFACES", "FIRE TV | VR IMMERSION", COLOR_CYAN_ACCENT),
            ("ACTIVE FILTERS", "3 TIERS OPERATIONAL", COLOR_TEXT_ALABASTER),
            ("INCOMING SIGNALS", "14 SENSORS LINKED", COLOR_TEXT_MUTED),
            ("FOCUS PRESERVATION", "96.4 PERCENT IMMERSION", COLOR_GREEN_ACCENT)
        ],
        "detail_box_title": "ACTIVE ATTENTION POLICIES",
        "detail_box_lines": [
            "P1: Life Safety & Smoke -> Immediate Breakthrough",
            "P2: Deliveries & Visitors -> Hold For Session Break",
            "P3: Routine Home Updates -> Quiet Evening Digest"
        ]
    },
    {
        "slide_num": 2,
        "timecode": "CHAPTER 2 | 0:25 - 0:55",
        "category": "AMAZON BEDROCK INTELLIGENCE",
        "title": "Alexa+ Generative Smart Contracts",
        "subtitle": "Natural language intent compilation into deterministic JSON policies",
        "pillars": [
            {
                "num": "1",
                "title": "Natural Voice Interaction",
                "desc": "Speak intentions naturally to Alexa+ powered by Amazon Bedrock Claude."
            },
            {
                "num": "2",
                "title": "Deterministic Policy Synthesis",
                "desc": "Bedrock parses verbal goals into structured triggers, conditions, and actions."
            },
            {
                "num": "3",
                "title": "Sub-15ms MCP Synchronization",
                "desc": "Model Context Protocol propagates contract rules across edge devices in real time."
            },
            {
                "num": "4",
                "title": "Dynamic Runtime Upgrades",
                "desc": "Policies update on the fly without restarting media displays or hardware."
            }
        ],
        "right_header": "BEDROCK CONTRACT PARSER",
        "right_color": COLOR_CYAN_ACCENT,
        "telemetry_lines": [
            ("MODEL RUNTIME", "BEDROCK CLAUDE 3.5", COLOR_CYAN_ACCENT),
            ("SYNTHESIS LATENCY", "12 MILLISECONDS", COLOR_GREEN_ACCENT),
            ("STATE SYNCHRONIZATION", "ACTIVE VIA MCP", COLOR_ROSE_ACCENT),
            ("PARSED POLICIES", "3 RULES GENERATED", COLOR_TEXT_ALABASTER),
            ("EDGE INTEGRITY", "CRYPTOGRAPHIC SHA-256", COLOR_GREEN_ACCENT)
        ],
        "detail_box_title": "VOICE INTENT & PARSED CONTRACT",
        "detail_box_lines": [
            "User: Alexa, start Family Time.",
            "Bedrock: Priority 1 Safety -> Tone & Top HUD",
            "Bedrock: Priority 2 Packages -> Peripheral Whisper",
            "Bedrock: Priority 3 Sensors -> Silent Queue"
        ]
    },
    {
        "slide_num": 3,
        "timecode": "CHAPTER 3 | 0:55 - 1:20",
        "category": "TELEVISION INTERFACE",
        "title": "Fire TV Client & Whisper HUD",
        "subtitle": "Non-disruptive peripheral alert cues anchored to the media display",
        "pillars": [
            {
                "num": "1",
                "title": "Dedicated 1080p Simulator",
                "desc": "True Fire TV television display simulation showcasing clean media playback."
            },
            {
                "num": "2",
                "title": "Top Priority Alert HUD",
                "desc": "Critical safety alerts surface as a sleek top HUD banner with a gentle alert tone."
            },
            {
                "num": "3",
                "title": "Peripheral Whisper Cues",
                "desc": "Standard delivery updates anchor gently at the screen base without dialog blocking."
            },
            {
                "num": "4",
                "title": "Session Break Release",
                "desc": "Queued updates release smoothly when your media pause or break begins."
            }
        ],
        "right_header": "FIRE TV DISPLAY HUD ENGINE",
        "right_color": COLOR_ROSE_ACCENT,
        "telemetry_lines": [
            ("DISPLAY RESOLUTION", "1080P FULL HD 60 FPS", COLOR_CYAN_ACCENT),
            ("CURRENT STREAM", "LIVE MEDIA PLAYBACK", COLOR_GREEN_ACCENT),
            ("HUD OVERLAY", "MINIMAL TOP BANNER", COLOR_ROSE_ACCENT),
            ("WHISPER POSITION", "BOTTOM PERIPHERAL CUE", COLOR_TEXT_ALABASTER),
            ("DIALOG OCCLUSION", "ZERO PERCENT BLOCKED", COLOR_GREEN_ACCENT)
        ],
        "detail_box_title": "LIVE HUD SIMULATION STATE",
        "detail_box_lines": [
            "Whisper: Front Entry - Delivery vehicle arrived",
            "Action: Queued for break - Zero sound disruption",
            "Audio Profile: Subdued harmonic chime"
        ]
    },
    {
        "slide_num": 4,
        "timecode": "CHAPTER 4 | 1:20 - 1:45",
        "category": "SPATIAL COMPUTING",
        "title": "VR Immersion & Spatial Guardian Grid",
        "subtitle": "360-degree spatial canvas with glowing cyan guardian boundary protection",
        "pillars": [
            {
                "num": "1",
                "title": "External Guardian Shield",
                "desc": "Fire TV acts as a safety anchor whenever a headset is worn in the room."
            },
            {
                "num": "2",
                "title": "360 Spatial Canvas Grid",
                "desc": "Projects a responsive canvas with an active glowing cyan guardian boundary."
            },
            {
                "num": "3",
                "title": "Directional 3D Audio Whispers",
                "desc": "Alerts emanate from the true physical direction of the trigger event."
            },
            {
                "num": "4",
                "title": "Live Headset Telemetry HUD",
                "desc": "Tracks spatial latency, tracking rate, and battery status directly on screen."
            }
        ],
        "right_header": "SPATIAL TELEMETRY HUD",
        "right_color": COLOR_CYAN_ACCENT,
        "telemetry_lines": [
            ("HEADSET STATUS", "CONNECTED & TRACKING", COLOR_GREEN_ACCENT),
            ("GUARDIAN BOUNDARY", "ACTIVE CYAN FIELD", COLOR_CYAN_ACCENT),
            ("SPATIAL REFRESH", "90 HZ SPATIAL SYNC", COLOR_GREEN_ACCENT),
            ("HEADSET LATENCY", "4.2 MILLISECONDS", COLOR_TEXT_ALABASTER),
            ("SPATIAL AUDIO", "3D BINAURAL FIELD", COLOR_ROSE_ACCENT)
        ],
        "detail_box_title": "SPATIAL CUE COORDINATES",
        "detail_box_lines": [
            "Perimeter Sensor: East wall door opened",
            "Spatial Vector: Azimuth +65 deg | Elev 0 deg",
            "Cue Rendering: Soft spatial harmonic pulse"
        ]
    },
    {
        "slide_num": 5,
        "timecode": "CHAPTER 5 | 1:45 - 2:10",
        "category": "VOICE AUTOMATION",
        "title": "Voice Typing & Session Focus Timer",
        "subtitle": "Hands-free character streaming search and structured productivity sprints",
        "pillars": [
            {
                "num": "1",
                "title": "Speech-to-Text Auto-Typing",
                "desc": "Speak any title and watch characters stream smoothly into the search interface."
            },
            {
                "num": "2",
                "title": "Structured Focus Sprints",
                "desc": "Select 15-minute quick sprints, 25-minute focus blocks, or 50-minute deep work."
            },
            {
                "num": "3",
                "title": "Interactive Controls",
                "desc": "Pause, extend, or conclude focus intervals directly through on-screen controls."
            },
            {
                "num": "4",
                "title": "Automatic Break Transition",
                "desc": "QuietCue+ announces session breaks and releases queued updates gracefully."
            }
        ],
        "right_header": "FOCUS SPRINT CONTROLLER",
        "right_color": COLOR_ROSE_ACCENT,
        "telemetry_lines": [
            ("SELECTED BLOCK", "25 MINUTE FOCUS SPRINT", COLOR_ROSE_ACCENT),
            ("TIME REMAINING", "18:42 COUNTDOWN", COLOR_CYAN_ACCENT),
            ("VOICE TRANSCRIPTION", "ACTIVE STREAMING", COLOR_GREEN_ACCENT),
            ("STREAM SPEED", "60 CHARS PER SECOND", COLOR_TEXT_ALABASTER),
            ("HELD UPDATES", "4 NOTIFICATIONS BUFFERED", COLOR_TEXT_MUTED)
        ],
        "detail_box_title": "TRANSCRIPTION & BUFFER STATUS",
        "detail_box_lines": [
            "Live Search: Security Camera Feeds",
            "Buffer Action: 4 low priority pings held",
            "Auto-Release: Set for timer expiration"
        ]
    },
    {
        "slide_num": 6,
        "timecode": "CHAPTER 6 | 2:10 - 2:30",
        "category": "GLOBAL UX ARCHITECTURE",
        "title": "Multilingual Engine & Dark Cedar Theme",
        "subtitle": "Global internationalization and OLED-optimized visual design",
        "pillars": [
            {
                "num": "1",
                "title": "Compact Language Dropdown",
                "desc": "Instant switching across 6 world languages including Hindi and Japanese."
            },
            {
                "num": "2",
                "title": "Full Runtime Translation",
                "desc": "Dynamic localization across notification whispers, contract terms, and HUD."
            },
            {
                "num": "3",
                "title": "Dark Cedar & Warm Auburn",
                "desc": "Warm, glare-free aesthetic crafted for low-light living room environments."
            },
            {
                "num": "4",
                "title": "WCAG AAA Compliance",
                "desc": "Alabaster typography delivers maximum readability and visual comfort."
            }
        ],
        "right_header": "THEME & LOCALE ENGINE",
        "right_color": COLOR_CYAN_ACCENT,
        "telemetry_lines": [
            ("PALETTE PROFILE", "DARK CEDAR & WARM AUBURN", COLOR_ROSE_ACCENT),
            ("BASE BACKGROUND", "#1C1516 DEEP PINE CEDAR", COLOR_TEXT_ALABASTER),
            ("ACCENT ACCENTS", "#FB7185 ROSE GOLD", COLOR_ROSE_ACCENT),
            ("CONTRAST RATIO", "14.8 TO 1 AAA RATED", COLOR_GREEN_ACCENT),
            ("LOCALES ENABLED", "EN, ES, FR, DE, JA, HI", COLOR_CYAN_ACCENT)
        ],
        "detail_box_title": "SAMPLE LOCALIZED WHISPERS",
        "detail_box_lines": [
            "English: Session Break - Released 0 queued updates",
            "Japanese: セッション休憩 - 保留通知を解除しました",
            "Hindi: सत्र विराम - सभी संदेश जारी किए गए"
        ]
    },
    {
        "slide_num": 7,
        "timecode": "CHAPTER 7 | 2:30 - 2:45",
        "category": "SYSTEM VISION",
        "title": "QuietCue+ Intelligent Focus Shield",
        "subtitle": "Entertainment without interruption : Peace, safety, and focus in harmony",
        "pillars": [
            {
                "num": "1",
                "title": "Harmonious Living Spaces",
                "desc": "Restores peace of mind and undivided focus to intelligent connected homes."
            },
            {
                "num": "2",
                "title": "Unified Triad Architecture",
                "desc": "Blends Alexa+ Bedrock, Fire TV Client, and Spatial VR Immersion seamlessly."
            },
            {
                "num": "3",
                "title": "Production Grade Codebase",
                "desc": "Full-stack React, TypeScript, and MCP Server built for instant responsiveness."
            },
            {
                "num": "4",
                "title": "Entertainment In Harmony",
                "desc": "QuietCue+ knows exactly when to speak, when to whisper, and when to wait."
            }
        ],
        "right_header": "ECOSYSTEM SUMMARY",
        "right_color": COLOR_GREEN_ACCENT,
        "telemetry_lines": [
            ("AI INTELLIGENCE", "AMAZON BEDROCK CLAUDE", COLOR_CYAN_ACCENT),
            ("TELEVISION RUNTIME", "FIRE TV CLIENT SIMULATOR", COLOR_ROSE_ACCENT),
            ("SPATIAL RUNTIME", "VR IMMERSION 360 CANVAS", COLOR_CYAN_ACCENT),
            ("EDGE PROTOCOL", "MODEL CONTEXT PROTOCOL", COLOR_GREEN_ACCENT),
            ("SYSTEM VERDICT", "ENTERTAINMENT IN HARMONY", COLOR_GREEN_ACCENT)
        ],
        "detail_box_title": "FINAL SUBMISSION TAKEAWAY",
        "detail_box_lines": [
            "QuietCue+ transforms home alerts from an all-or-nothing",
            "dilemma into an intelligent, context-aware guardian.",
            "Entertainment Without Interruption."
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

def render_slide(data, output_path):
    img = create_gradient_bg(WIDTH, HEIGHT, COLOR_BG_TOP, COLOR_BG_BOTTOM)
    draw = ImageDraw.Draw(img)
    
    # Top subtle decorative border
    draw.line([(0, 0), (WIDTH, 0)], fill=COLOR_ROSE_ACCENT, width=4)
    
    # Header Elements
    # Brand tag
    brand_text = "QUIETCUE+"
    draw.text((60, 38), brand_text, font=font_brand, fill=COLOR_ROSE_ACCENT)
    
    # Category pill
    category_text = data["category"]
    cat_bbox = font_category.getbbox(category_text)
    cat_w = cat_bbox[2] - cat_bbox[0]
    cat_h = cat_bbox[3] - cat_bbox[1]
    pill_x = 270
    pill_y = 42
    draw.rounded_rectangle(
        [(pill_x, pill_y), (pill_x + cat_w + 24, pill_y + cat_h + 14)],
        radius=6,
        fill=COLOR_BADGE_BG,
        outline=COLOR_BORDER,
        width=1
    )
    draw.text((pill_x + 12, pill_y + 6), category_text, font=font_category, fill=COLOR_TEXT_MUTED)
    
    # Timecode on right header
    timecode_text = data["timecode"]
    tc_bbox = font_category.getbbox(timecode_text)
    tc_w = tc_bbox[2] - tc_bbox[0]
    tc_x = WIDTH - 60 - tc_w - 24
    tc_y = 42
    draw.rounded_rectangle(
        [(tc_x, tc_y), (tc_x + tc_w + 24, tc_y + cat_h + 14)],
        radius=6,
        fill=(38, 26, 32),
        outline=COLOR_ROSE_ACCENT,
        width=1
    )
    draw.text((tc_x + 12, tc_y + 6), timecode_text, font=font_category, fill=COLOR_ROSE_ACCENT)
    
    # Header separator
    draw.line([(60, 94), (WIDTH - 60, 94)], fill=COLOR_BORDER, width=1)
    
    # Left Main Card
    left_x1 = 60
    left_y1 = 120
    left_x2 = 1160
    left_y2 = 980
    draw_rounded_card(draw, [(left_x1, left_y1), (left_x2, left_y2)], COLOR_CARD_BG, COLOR_BORDER, width=2, radius=18)
    
    # Left Card Content
    # Title
    draw.text((left_x1 + 40, left_y1 + 35), data["title"], font=font_title, fill=COLOR_TEXT_ALABASTER)
    
    # Subtitle
    draw.text((left_x1 + 40, left_y1 + 95), data["subtitle"], font=font_subtitle, fill=COLOR_TEXT_MUTED)
    
    # Inner divider line
    draw.line([(left_x1 + 40, left_y1 + 145), (left_x2 - 40, left_y1 + 145)], fill=(55, 38, 42), width=1)
    
    # 4 Pillars
    pillar_y_start = left_y1 + 175
    pillar_spacing = 160
    for i, p in enumerate(data["pillars"]):
        curr_y = pillar_y_start + i * pillar_spacing
        
        # Number badge
        badge_size = 42
        badge_x = left_x1 + 40
        badge_y = curr_y
        draw.rounded_rectangle(
            [(badge_x, badge_y), (badge_x + badge_size, badge_y + badge_size)],
            radius=8,
            fill=COLOR_BADGE_BG,
            outline=COLOR_ROSE_ACCENT,
            width=2
        )
        badge_text = p["num"]
        b_box = font_pillar_title.getbbox(badge_text)
        bw = b_box[2] - b_box[0]
        bh = b_box[3] - b_box[1]
        draw.text((badge_x + (badge_size - bw) // 2, badge_y + (badge_size - bh) // 2 - 2), badge_text, font=font_pillar_title, fill=COLOR_ROSE_ACCENT)
        
        # Pillar Title
        text_x = badge_x + badge_size + 20
        draw.text((text_x, curr_y), p["title"], font=font_pillar_title, fill=COLOR_TEXT_ALABASTER)
        
        # Pillar Desc
        draw.text((text_x, curr_y + 34), p["desc"], font=font_pillar_body, fill=COLOR_TEXT_BODY)
    
    # Right Telemetry Card
    right_x1 = 1200
    right_y1 = 120
    right_x2 = WIDTH - 60
    right_y2 = 980
    draw_rounded_card(draw, [(right_x1, right_y1), (right_x2, right_y2)], COLOR_CARD_RIGHT, COLOR_BORDER, width=2, radius=18)
    
    # Right Card Header
    r_hdr_text = data["right_header"]
    draw.text((right_x1 + 35, right_y1 + 35), r_hdr_text, font=font_pillar_title, fill=data["right_color"])
    
    # Glowing dot next to header
    dot_x = right_x2 - 45
    dot_y = right_y1 + 46
    draw.ellipse([(dot_x - 6, dot_y - 6), (dot_x + 6, dot_y + 6)], fill=data["right_color"])
    
    # Right inner divider
    draw.line([(right_x1 + 35, right_y1 + 80), (right_x2 - 35, right_y1 + 80)], fill=(55, 38, 42), width=1)
    
    # Telemetry metrics list
    tel_y = right_y1 + 105
    for label, val, val_color in data["telemetry_lines"]:
        draw.text((right_x1 + 35, tel_y), label, font=font_mono, fill=COLOR_TEXT_MUTED)
        draw.text((right_x1 + 35, tel_y + 26), val, font=font_mono_bold, fill=val_color)
        tel_y += 68
    
    # Detail Box container in lower half of right card
    box_y1 = tel_y + 15
    box_y2 = right_y2 - 35
    draw.rounded_rectangle(
        [(right_x1 + 30, box_y1), (right_x2 - 30, box_y2)],
        radius=10,
        fill=(22, 14, 16),
        outline=COLOR_BORDER,
        width=1
    )
    
    draw.text((right_x1 + 45, box_y1 + 18), data["detail_box_title"], font=font_category, fill=COLOR_ROSE_ACCENT)
    
    box_line_y = box_y1 + 55
    for bl in data["detail_box_lines"]:
        draw.text((right_x1 + 45, box_line_y), bl, font=font_mono, fill=COLOR_TEXT_BODY)
        box_line_y += 32
        
    # Bottom Footer Bar
    draw.line([(60, 1010), (WIDTH - 60, 1010)], fill=COLOR_BORDER, width=1)
    footer_text = "QuietCue+ Ecosystem : Fire TV Client | Alexa+ Bedrock | Spatial VR Immersion"
    draw.text((60, 1030), footer_text, font=font_footer, fill=COLOR_TEXT_MUTED)
    
    slide_indicator = f"SLIDE {data['slide_num']} OF 7"
    si_bbox = font_footer_bold.getbbox(slide_indicator)
    si_w = si_bbox[2] - si_bbox[0]
    draw.text((WIDTH - 60 - si_w, 1030), slide_indicator, font=font_footer_bold, fill=COLOR_ROSE_ACCENT)
    
    img.save(output_path, "PNG")
    print(f"Rendered: {output_path}")

def main():
    output_dir = "c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/slides"
    os.makedirs(output_dir, exist_ok=True)
    
    for item in slides_data:
        out_file = os.path.join(output_dir, f"slide_{item['slide_num']}.png")
        render_slide(item, out_file)
    print("All 7 presentation slides generated successfully.")

if __name__ == "__main__":
    main()
