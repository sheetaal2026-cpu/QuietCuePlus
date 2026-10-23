import os
import shutil
import subprocess

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
ORIG_VIDEO = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'

# Audio sources
AUDIO_SUBDUED_MUSIC = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_refined_with_music.wav'
AUDIO_PURE_VOICE = r'C:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation\temp\adobe_podcast_extracted.wav'

# Outputs
OUT_FINAL_DEMO = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'
OUT_FINAL_LETTERBOX = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo_letterbox_1080p.mp4'

BRAIN_DIR = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978'
BRAIN_FINAL_DEMO = os.path.join(BRAIN_DIR, 'quietcue_final_demo.mp4')
BRAIN_FINAL_LETTERBOX = os.path.join(BRAIN_DIR, 'quietcue_final_demo_letterbox_1080p.mp4')

print("1. Creating Pixel-Perfect Native Video (1892x900 direct stream copy - ZERO distortion)...")
cmd_native = [
    FFMPEG, '-y',
    '-i', ORIG_VIDEO,
    '-i', AUDIO_SUBDUED_MUSIC,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    OUT_FINAL_DEMO
]
subprocess.run(cmd_native, check=True)
shutil.copy2(OUT_FINAL_DEMO, BRAIN_FINAL_DEMO)
print(f"Native demo created -> {OUT_FINAL_DEMO}")

print("2. Creating Proportional 16:9 1080p Letterbox (True Aspect Ratio with padding - ZERO stretch)...")
# Scale 1892 to 1920 (factor 1.0148), new height = 914. Pad to 1080 with black bars on top and bottom
cmd_letterbox = [
    FFMPEG, '-y',
    '-i', ORIG_VIDEO,
    '-i', AUDIO_SUBDUED_MUSIC,
    '-vf', 'scale=1920:914:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    OUT_FINAL_LETTERBOX
]
subprocess.run(cmd_letterbox, check=True)
shutil.copy2(OUT_FINAL_LETTERBOX, BRAIN_FINAL_LETTERBOX)
print(f"Letterbox demo created -> {OUT_FINAL_LETTERBOX}")
print("ALL DONE!")
