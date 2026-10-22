import os, sys, subprocess

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VIDEO_IN = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
AUDIO_DIR = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation'
MUSIC_IN = os.path.join(AUDIO_DIR, 'soothing_piano_bed.wav')
TEMP_DIR = os.path.join(AUDIO_DIR, 'temp')
FINAL_VIDEO = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'

# 1. Audio parts:
# Part 1: Newly uploaded inspiration dialogue (47.42s)
# Part 2: Scene 3 Live Device Simulation v2 (60.98s)
# Part 3: Scene 4 Alexa Bedrock & Languages retake (37.13s)
part1 = os.path.join(AUDIO_DIR, 'scene1_inspiration_new_take_cleaned.mp3')
part2 = os.path.join(AUDIO_DIR, 'scene3_live_device_simulation_v2_cleaned.mp3')
part3 = os.path.join(AUDIO_DIR, 'scene4_alexa_languages_retake_cleaned.mp3')

# We position them with exact timestamps:
# 0.0s -> Part 1 ends at 47.42s
# 47.42s -> 56.6s (9.2s musical interlude where the piano bed swells softly during the transition)
# 56.6s -> Part 2 plays (56.6s to 117.58s)
# 117.58s -> Part 3 plays (117.58s to 154.71s)
# Total length: 154.80s (matches video exactly)

# Create timed vocal track using adelay and amix
timed_voice_wav = os.path.join(TEMP_DIR, 'timed_voice_new_take.wav')
filter_timed = (
    "[0:a]aresample=48000[v1];"
    "[1:a]aresample=48000,adelay=56600|56600[v2];"
    "[2:a]aresample=48000,adelay=117580|117580[v3];"
    "[v1][v2][v3]amix=inputs=3:weights=1.0 1.0 1.0:dropout_transition=0[vtimed];"
    "[vtimed]highpass=f=85,lowpass=f=11000,afftdn=nr=10:nf=-45:tn=1,"
    "equalizer=f=3000:t=q:w=1.2:g=2.5,acompressor=threshold=-20dB:ratio=2.8:attack=10:release=100,"
    "loudnorm=I=-16:TP=-1.5:LRA=8[vclean]"
)

cmd_timed = [
    FFMPEG, '-y',
    '-i', part1,
    '-i', part2,
    '-i', part3,
    '-filter_complex', filter_timed,
    '-map', '[vclean]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '2',
    timed_voice_wav
]
subprocess.run(cmd_timed, check=True)
print("Created timed vocal track with gentle interlude.")

# 2. Mix with slow soothing music bed and sidechain ducking
# In pauses (like 47s - 56s), the music gently swells up to -22 dB.
# During voice speech, it is kept ducked at -32 dB (volume 0.08, lowpass 950Hz)
mixed_audio_wav = os.path.join(TEMP_DIR, 'final_mix_new_take.wav')
mix_filter = (
    "[1:a]lowpass=f=950,volume=0.10[bgm];"
    "[bgm][0:a]sidechaincompress=threshold=0.05:ratio=4.5:attack=120:release=700[ducked_bgm];"
    "[2:a]volume=0.20[ui_sfx];"
    "[0:a][ducked_bgm][ui_sfx]amix=inputs=3:weights=1.0 0.65 0.20:dropout_transition=2[mixed];"
    "[mixed]loudnorm=I=-16:TP=-1.5:LRA=8[out_audio]"
)

cmd_mix = [
    FFMPEG, '-y',
    '-i', timed_voice_wav,
    '-i', MUSIC_IN,
    '-i', os.path.join(AUDIO_DIR, 'screen_demo_audio.wav'),
    '-filter_complex', mix_filter,
    '-map', '[out_audio]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '2',
    mixed_audio_wav
]
subprocess.run(cmd_mix, check=True)
print("Mixed with ducked background music and audible voice.")

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
print(f"SUCCESS: Rendered updated {FINAL_VIDEO}")
