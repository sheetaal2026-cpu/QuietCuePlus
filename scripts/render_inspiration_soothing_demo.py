import os, sys, subprocess
import numpy as np
from scipy.io import wavfile

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VIDEO_IN = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
AUDIO_DIR = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation'
MUSIC_IN = os.path.join(AUDIO_DIR, 'soothing_piano_bed.wav')
TEMP_DIR = os.path.join(AUDIO_DIR, 'temp')
FINAL_VIDEO = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'

# Clips starting with INSPIRATION DIALOGUE:
# 1. Scene 1: Personal Inspiration (0s to 60.8s)
# 2. Scene 3: Live Device Simulation (61s to 121s)
# 3. Scene 4: Alexa Bedrock, TV typing & Languages (121.5s to 154s)
part1 = os.path.join(AUDIO_DIR, 'scene1_personal_inspiration_cleaned.mp3')
part2 = os.path.join(AUDIO_DIR, 'scene3_live_device_simulation_v2_cleaned.mp3')
part3 = os.path.join(AUDIO_DIR, 'scene4_alexa_languages_retake_cleaned.mp3')

# 1. Advanced Noise Cancellation & Vocal Presence EQ
# Highpass 85Hz (low rumble) + lowpass 10000Hz (hiss) + afftdn (spectral noise reduction) + vocal presence EQ
denoise_filter = (
    "highpass=f=85,"
    "lowpass=f=11000,"
    "afftdn=nr=12:nf=-45:tn=1,"
    "equalizer=f=3000:t=q:w=1.2:g=2.5,"
    "acompressor=threshold=-20dB:ratio=2.8:attack=10:release=100,"
    "loudnorm=I=-16:TP=-1.5:LRA=8"
)

clean_voice_wav = os.path.join(TEMP_DIR, 'final_clean_voice.wav')
voice_concat_wav = os.path.join(TEMP_DIR, 'voice_concat_raw.wav')

# Concat with 1.026 tempo so it matches the 154.8s video perfectly
cmd_concat = [
    FFMPEG, '-y',
    '-i', part1,
    '-i', part2,
    '-i', part3,
    '-filter_complex',
    "[0:a][1:a][2:a]concat=n=3:v=0:a=1[vcat];[vcat]atempo=1.026[vtempo]",
    '-map', '[vtempo]',
    voice_concat_wav
]
subprocess.run(cmd_concat, check=True)

# Apply thorough noise cancellation
cmd_denoise = [
    FFMPEG, '-y',
    '-i', voice_concat_wav,
    '-af', denoise_filter,
    '-ar', '48000', '-ac', '2',
    clean_voice_wav
]
subprocess.run(cmd_denoise, check=True)
print("Voice track denoised with full noise cancellation and vocal presence boost.")

# 2. Mix with SLOW, VERY SOFT background music that NEVER overpowers the voice
# Music volume = 0.09 (gentle whisper bed at -30 dB).
# Voice is at full prominence 1.0 (-16 dB, 14 dB louder than music!).
# Sidechain ducking further pulls down the music when voice speaks.
mixed_audio_wav = os.path.join(TEMP_DIR, 'final_mix.wav')
mix_filter = (
    # Music: low volume 0.09, lowpass 900Hz so it stays completely out of voice frequency band
    "[1:a]lowpass=f=950,volume=0.09[bgm];"
    # Duck music when voice triggers
    "[bgm][0:a]sidechaincompress=threshold=0.06:ratio=4:attack=100:release=600[ducked_bgm];"
    # Subtle original UI chimes
    "[2:a]volume=0.20[ui_sfx];"
    # Mix
    "[0:a][ducked_bgm][ui_sfx]amix=inputs=3:weights=1.0 0.60 0.20:dropout_transition=2[mixed];"
    # Final mastering
    "[mixed]loudnorm=I=-16:TP=-1.5:LRA=8[out_audio]"
)

cmd_mix = [
    FFMPEG, '-y',
    '-i', clean_voice_wav,
    '-i', MUSIC_IN,
    '-i', os.path.join(AUDIO_DIR, 'screen_demo_audio.wav'),
    '-filter_complex', mix_filter,
    '-map', '[out_audio]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '2',
    mixed_audio_wav
]
subprocess.run(cmd_mix, check=True)
print("Mixed with very soft, non-overpowering background music.")

# 3. Multiplex into FINAL_VIDEO
cmd_video = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-i', mixed_audio_wav,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    FINAL_VIDEO
]
subprocess.run(cmd_video, check=True)
print(f"SUCCESS: Rendered {FINAL_VIDEO}")
