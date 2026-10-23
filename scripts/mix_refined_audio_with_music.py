import os
import shutil
import subprocess
import soundfile as sf
import numpy as np

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
REFINED_AUDIO = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\.user_uploaded\uploaded_media_1792721123232.mp3'
VIDEO_IN = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
AUDIO_DIR = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation'
MUSIC_FILE = os.path.join(AUDIO_DIR, 'premier_soothing_music.wav')
SFX_FILE = os.path.join(AUDIO_DIR, 'screen_demo_audio.wav')

OUT_WAV_WS = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_refined_with_music.wav'
OUT_MP3_WS = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_refined_with_music.mp3'
OUT_VIDEO_WS = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'

BRAIN_DIR = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978'
OUT_WAV_BRAIN = os.path.join(BRAIN_DIR, 'quietcue_refined_with_music.wav')
OUT_MP3_BRAIN = os.path.join(BRAIN_DIR, 'quietcue_refined_with_music.mp3')
OUT_VIDEO_BRAIN = os.path.join(BRAIN_DIR, 'quietcue_final_demo.mp4')

print("Step 1: Loading Adobe Podcast refined audio track...")
vocals, sr_v = sf.read(REFINED_AUDIO)
if len(vocals.shape) > 1:
    vocals = np.mean(vocals, axis=1)

target_dur = 154.80
n_total = int(sr_v * target_dur)

if len(vocals) > n_total:
    vocals = vocals[:n_total]
else:
    vocals = np.pad(vocals, (0, n_total - len(vocals)))

print(f"Refined vocals loaded: {len(vocals)/sr_v:.2f}s at {sr_v}Hz")

print("Step 2: Loading soothing background music bed...")
music, sr_m = sf.read(MUSIC_FILE)
if len(music.shape) == 1:
    music = np.column_stack([music, music])
if len(music) > n_total:
    music = music[:n_total]
else:
    music = np.pad(music, ((0, n_total - len(music)), (0, 0)))

print("Step 3: Loading original UI screen sound effects (clicks & door chimes)...")
sfx, sr_s = sf.read(SFX_FILE)
if len(sfx.shape) > 1:
    sfx = np.mean(sfx, axis=1)
if len(sfx) > n_total:
    sfx = sfx[:n_total]
else:
    sfx = np.pad(sfx, (0, n_total - len(sfx)))

print("Step 4: Computing sidechain ducking envelope with reduced music volume...")
# Calculate speech energy envelope (40ms sliding window)
win = int(sr_v * 0.040)
rms_v = np.sqrt(np.convolve(vocals**2, np.ones(win)/win, mode='same'))

# Highly sensitive speech detection so ducking triggers immediately on any vocal onset
speech_ratio = np.clip((rms_v - 0.006) / 0.020, 0.0, 1.0)

# Fast 50ms attack, smooth 500ms release
att_alpha = 1.0 - np.exp(-1.0 / (sr_v * 0.050))
rel_alpha = 1.0 - np.exp(-1.0 / (sr_v * 0.500))

smooth_duck = np.zeros(n_total)
cur = 0.0
for i in range(n_total):
    target = speech_ratio[i]
    cur += (att_alpha if target > cur else rel_alpha) * (target - cur)
    smooth_duck[i] = cur

# Subdued music gain: 1.20 in pauses (gentle soothing bed), 0.45 during speech (deep ducking so voice is 100% prominent)
music_gain = 1.20 - 0.75 * smooth_duck
ducked_music = music * music_gain[:, np.newaxis]

print("Step 5: Mixing vocal clarity + subdued music + subtle UI chimes...")
final_mix_L = vocals * 0.98 + ducked_music[:, 0] + sfx * 0.12
final_mix_R = vocals * 0.98 + ducked_music[:, 1] + sfx * 0.12

# Studio soft limiter (-1.0 dB true peak)
def soft_limit(ch, limit=0.92):
    over = np.abs(ch) > limit
    ch[over] = np.sign(ch[over]) * (limit + np.tanh((np.abs(ch[over]) - limit) / (1.0 - limit + 1e-6)) * (1.0 - limit) * 0.8)
    return ch

final_mix_L = soft_limit(final_mix_L)
final_mix_R = soft_limit(final_mix_R)

# Smooth musical outro fade over last 2.0s
fade_len = int(sr_v * 2.0)
fade_curve = np.linspace(1.0, 0.0, fade_len)
final_mix_L[-fade_len:] *= fade_curve
final_mix_R[-fade_len:] *= fade_curve

master_stereo = np.column_stack([final_mix_L, final_mix_R])

print("Step 6: Writing mastered audio WAV & MP3...")
sf.write(OUT_WAV_WS, master_stereo, sr_v, subtype='PCM_16')
shutil.copy2(OUT_WAV_WS, OUT_WAV_BRAIN)

cmd_mp3 = [
    FFMPEG, '-y',
    '-i', OUT_WAV_WS,
    '-c:a', 'libmp3lame',
    '-b:a', '256k',
    OUT_MP3_WS
]
subprocess.run(cmd_mp3, check=True)
shutil.copy2(OUT_MP3_WS, OUT_MP3_BRAIN)
print(f"Master audio rendered -> {OUT_WAV_WS} & {OUT_MP3_WS}")

print("Step 7: Multiplexing into final demo video quietcue_final_demo.mp4...")
cmd_video = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-i', OUT_WAV_WS,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    OUT_VIDEO_WS
]
subprocess.run(cmd_video, check=True)
shutil.copy2(OUT_VIDEO_WS, OUT_VIDEO_BRAIN)
print(f"Final video created successfully -> {OUT_VIDEO_WS}")
print("ALL DONE!")
