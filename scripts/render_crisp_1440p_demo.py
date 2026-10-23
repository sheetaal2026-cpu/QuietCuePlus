import os
import shutil
import subprocess

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
ORIG_VIDEO = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
AUDIO_MIX = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_refined_with_music.wav'

OUT_2K_WS = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo_1440p_crisp.mp4'
OUT_FINAL_WS = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'

BRAIN_DIR = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978'
BRAIN_2K = os.path.join(BRAIN_DIR, 'quietcue_final_demo_1440p_crisp.mp4')
BRAIN_FINAL = os.path.join(BRAIN_DIR, 'quietcue_final_demo.mp4')

print("Rendering 1440p Ultra-Crisp Master Video to unlock YouTube VP09/AV01 premium codec...")

# Scale 1892x900 proportionally to 2560x1218, pad to 2560x1440 with black bars.
# Apply subtle unsharp mask (5:5:0.5) to keep UI fonts razor-sharp under YouTube compression.
# Use high bitrate (CRF 16, 20M target) so YouTube never degrades fine text.
cmd = [
    FFMPEG, '-y',
    '-i', ORIG_VIDEO,
    '-i', AUDIO_MIX,
    '-vf', 'scale=2560:1218:flags=lanczos,pad=2560:1440:(ow-iw)/2:(oh-ih)/2:black,unsharp=5:5:0.6:5:5:0.0',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '16',
    '-b:v', '18M',
    '-maxrate', '25M',
    '-bufsize', '35M',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    OUT_2K_WS
]

subprocess.run(cmd, check=True)

# Copy to final demo destinations
shutil.copy2(OUT_2K_WS, BRAIN_2K)
shutil.copy2(OUT_2K_WS, OUT_FINAL_WS)
shutil.copy2(OUT_2K_WS, BRAIN_FINAL)

print(f"Master crisp 1440p video rendered successfully -> {OUT_2K_WS}")
print("ALL DONE!")
