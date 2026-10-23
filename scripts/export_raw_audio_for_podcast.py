import os
import shutil
import subprocess
import soundfile as sf
import numpy as np

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VIDEO_IN = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
UPLOAD_DIR = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\.user_uploaded'

OUT_DIR_WS = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\raw_audio_for_adobe_podcast'
OUT_DIR_BRAIN = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\raw_audio_for_adobe_podcast'

os.makedirs(OUT_DIR_WS, exist_ok=True)
os.makedirs(OUT_DIR_BRAIN, exist_ok=True)

# 1. Individual Raw Takes
p1_src = os.path.join(UPLOAD_DIR, 'uploaded_media_1792674426789.mp3')
p2_src = os.path.join(UPLOAD_DIR, 'uploaded_media_2_1792670217157.mp3')
p3_src = os.path.join(UPLOAD_DIR, 'uploaded_media_1_1792671250233.mp3')

p1_ws = os.path.join(OUT_DIR_WS, '01_raw_inspiration.mp3')
p2_ws = os.path.join(OUT_DIR_WS, '02_raw_live_simulation.mp3')
p3_ws = os.path.join(OUT_DIR_WS, '03_raw_alexa_languages.mp3')

shutil.copy2(p1_src, p1_ws)
shutil.copy2(p2_src, p2_ws)
shutil.copy2(p3_src, p3_ws)

shutil.copy2(p1_src, os.path.join(OUT_DIR_BRAIN, '01_raw_inspiration.mp3'))
shutil.copy2(p2_src, os.path.join(OUT_DIR_BRAIN, '02_raw_live_simulation.mp3'))
shutil.copy2(p3_src, os.path.join(OUT_DIR_BRAIN, '03_raw_alexa_languages.mp3'))

print("Individual raw takes copied.")

# 2. Extract 100% Raw Audio from screen_demo.mp4
screen_raw_wav_ws = os.path.join(OUT_DIR_WS, 'screen_recording_raw_audio.wav')
screen_raw_wav_brain = os.path.join(OUT_DIR_BRAIN, 'screen_recording_raw_audio.wav')

cmd_extract_sfx = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-vn',
    '-c:a', 'pcm_s16le',
    '-ar', '48000',
    screen_raw_wav_ws
]
subprocess.run(cmd_extract_sfx, check=True)
shutil.copy2(screen_raw_wav_ws, screen_raw_wav_brain)
print("Screen recording raw audio extracted.")

# 3. Build Full Continuous Raw Vocal Narration matching Video Demo Timeline (154.80s)
# Read raw audio without ANY filtering, gating, denoise, or EQ
d1, sr1 = sf.read(p1_src)
d2, sr2 = sf.read(p2_src)
d3, sr3 = sf.read(p3_src)

if len(d1.shape) > 1: d1 = np.mean(d1, axis=1)
if len(d2.shape) > 1: d2 = np.mean(d2, axis=1)
if len(d3.shape) > 1: d3 = np.mean(d3, axis=1)

# Basic start/end boundary slice to align with scenes (no noise processing whatsoever)
c1 = d1[int(0.80 * sr1) : int(63.00 * sr1)]
c2 = d2[int(0.90 * sr2) : int(59.40 * sr2)]
c3 = d3[int(0.75 * sr3) : int(43.80 * sr3)]

temp_c1 = os.path.join(OUT_DIR_WS, 'temp_raw_1.wav')
temp_c2 = os.path.join(OUT_DIR_WS, 'temp_raw_2.wav')
temp_c3 = os.path.join(OUT_DIR_WS, 'temp_raw_3.wav')

sf.write(temp_c1, c1, sr1)
sf.write(temp_c2, c2, sr2)
sf.write(temp_c3, c3, sr3)

# Concat with exact video timeline duration (154.80s)
raw_narration_wav_ws = os.path.join(OUT_DIR_WS, 'quietcue_raw_demo_narration.wav')
raw_narration_wav_brain = os.path.join(OUT_DIR_BRAIN, 'quietcue_raw_demo_narration.wav')

raw_narration_mp3_ws = os.path.join(OUT_DIR_WS, 'quietcue_raw_demo_narration.mp3')
raw_narration_mp3_brain = os.path.join(OUT_DIR_BRAIN, 'quietcue_raw_demo_narration.mp3')

total_raw_dur = (len(c1)/sr1) + (len(c2)/sr2) + (len(c3)/sr3)
tempo_ratio = total_raw_dur / 154.80

cmd_concat = [
    FFMPEG, '-y',
    '-i', temp_c1,
    '-i', temp_c2,
    '-i', temp_c3,
    '-filter_complex',
    f"[0:a][1:a][2:a]concat=n=3:v=0:a=1[vcat];[vcat]atempo={tempo_ratio:.4f}[vtempo]",
    '-map', '[vtempo]',
    '-t', '154.80',
    '-c:a', 'pcm_s16le',
    '-ar', '48000',
    raw_narration_wav_ws
]
subprocess.run(cmd_concat, check=True)
shutil.copy2(raw_narration_wav_ws, raw_narration_wav_brain)

# Also render high-bitrate MP3 version
cmd_mp3 = [
    FFMPEG, '-y',
    '-i', raw_narration_wav_ws,
    '-c:a', 'libmp3lame',
    '-b:a', '256k',
    raw_narration_mp3_ws
]
subprocess.run(cmd_mp3, check=True)
shutil.copy2(raw_narration_mp3_ws, raw_narration_mp3_brain)

# Clean up temp slice files
for tf in [temp_c1, temp_c2, temp_c3]:
    if os.path.exists(tf):
        os.remove(tf)

# Also copy top files to root QuietCuePlus for instant access
shutil.copy2(raw_narration_wav_ws, r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_raw_demo_narration.wav')
shutil.copy2(raw_narration_mp3_ws, r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_raw_demo_narration.mp3')
shutil.copy2(screen_raw_wav_ws, r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_recording_raw_audio.wav')

print("All raw audio assets exported successfully.")
