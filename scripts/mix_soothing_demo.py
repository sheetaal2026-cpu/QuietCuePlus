import os, sys, subprocess
import numpy as np
from scipy.io import wavfile

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VIDEO_IN = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
AUDIO_DIR = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation'
SOOTHING_MUSIC_IN = os.path.join(AUDIO_DIR, 'soothing_piano_bed.wav')
TEMP_DIR = os.path.join(AUDIO_DIR, 'temp')

DEMO_WITH_MUSIC = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'
DEMO_NO_MUSIC = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo_no_music.mp4'

part1 = os.path.join(AUDIO_DIR, 'scene2_submenus_smart_contract_cleaned.mp3')
part2 = os.path.join(AUDIO_DIR, 'scene3_live_device_simulation_v2_cleaned.mp3')
part3 = os.path.join(AUDIO_DIR, 'scene4_alexa_languages_retake_cleaned.mp3')
scene5 = os.path.join(AUDIO_DIR, 'scene5_mcp_privacy_conclusion_v2_cleaned.mp3')
tagline_wav = os.path.join(TEMP_DIR, 'tagline.wav')

# 1. Extract the closing tagline from scene5 (from 23.2s to end)
cmd_tagline = [
    FFMPEG, '-y',
    '-ss', '23.2',
    '-i', scene5,
    '-acodec', 'pcm_s16le', '-ar', '48000', '-ac', '2',
    tagline_wav
]
subprocess.run(cmd_tagline, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# 2. Assemble the four narration parts into a unified voice track
# Part 1 starts at 0.5s: 46.7s -> ends at 47.2s
# Part 2 starts at 48.0s: 60.9s -> ends at 108.9s (aligns with devices simulation)
# Part 3 starts at 109.5s: 37.1s -> ends at 146.6s (aligns with Spanish translation & TV typing)
# Part 4 starts at 147.0s: 7.5s -> ends at 154.5s (closing tagline)
voice_full_wav = os.path.join(TEMP_DIR, 'narration_timeline_full.wav')

# Load samples and position precisely on a 154.80s timeline
TOTAL_SAMPLES = int(48000 * 154.80)
voice_timeline = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)

def load_audio_as_float(path):
    temp_wav = os.path.join(TEMP_DIR, 'temp_load.wav')
    cmd = [FFMPEG, '-y', '-i', path, '-acodec', 'pcm_s16le', '-ar', '48000', '-ac', '2', temp_wav]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    _, d = wavfile.read(temp_wav)
    return d.astype(np.float32) / 32768.0

clips_to_place = [
    (0.4, part1),      # Submenus to Alexa+ smart contracts
    (47.8, part2),     # Devices simulation & live alerts
    (109.2, part3),    # Bedrock, languages & TV typing
    (146.8, tagline_wav) # Signature closing tagline
]

for start_sec, clip_path in clips_to_place:
    clip_data = load_audio_as_float(clip_path)
    start_samp = int(start_sec * 48000)
    end_samp = min(TOTAL_SAMPLES, start_samp + len(clip_data))
    take_len = end_samp - start_samp
    voice_timeline[start_samp:end_samp] += clip_data[:take_len]

# Normalize voice peak to -1.0 dB
v_peak = np.max(np.abs(voice_timeline))
if v_peak > 0:
    voice_timeline = (voice_timeline / v_peak) * 0.89

wavfile.write(voice_full_wav, 48000, (voice_timeline * 32767).astype(np.int16))
print(f"Generated unified timeline narration track: {voice_full_wav}")

# 3. Create Option A: Video WITH ultra-soothing acoustic music & dynamic ducking
# Music is ducked to very gentle -28dB during voice, smoothly swelling to -20dB during pauses
ducked_mix_wav = os.path.join(TEMP_DIR, 'soothing_audio_ducked.wav')

filter_graph_soothing = (
    # Music baseline level: volume 0.22 (gentle background bed)
    "[1:a]volume=0.22[bgm];"
    # Sidechain ducking: when voice peaks, music dips softly
    "[bgm][0:a]sidechaincompress=threshold=0.07:ratio=3.5:attack=150:release=700[ducked_bgm];"
    # Subtle original UI sound effects from website screen demo
    "[2:a]volume=0.28[ui_sfx];"
    # Mix voice + soothing music + subtle UI sfx
    "[0:a][ducked_bgm][ui_sfx]amix=inputs=3:weights=1.0 0.75 0.25:dropout_transition=2[mixed];"
    # Broadcast mastering
    "[mixed]loudnorm=I=-17:TP=-1.5:LRA=9[out_audio]"
)

cmd_mix_soothing = [
    FFMPEG, '-y',
    '-i', voice_full_wav,
    '-i', SOOTHING_MUSIC_IN,
    '-i', os.path.join(AUDIO_DIR, 'screen_demo_audio.wav'),
    '-filter_complex', filter_graph_soothing,
    '-map', '[out_audio]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '2',
    ducked_mix_wav
]
print("Mixing soothing acoustic music with sidechain ducking...")
subprocess.run(cmd_mix_soothing, check=True)

# Mux to DEMO_WITH_MUSIC
cmd_video_music = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-i', ducked_mix_wav,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    DEMO_WITH_MUSIC
]
print(f"Rendering final demo video (with soothing music) to {DEMO_WITH_MUSIC}...")
subprocess.run(cmd_video_music, check=True)

# 4. Create Option B: Video WITHOUT background music (voice + subtle live UI clicks only)
no_music_mix_wav = os.path.join(TEMP_DIR, 'voice_only_mix.wav')
filter_graph_no_music = (
    "[1:a]volume=0.30[ui_sfx];"
    "[0:a][ui_sfx]amix=inputs=2:weights=1.0 0.35:dropout_transition=2[mixed];"
    "[mixed]loudnorm=I=-16:TP=-1.5:LRA=8[out_audio]"
)
cmd_mix_no_music = [
    FFMPEG, '-y',
    '-i', voice_full_wav,
    '-i', os.path.join(AUDIO_DIR, 'screen_demo_audio.wav'),
    '-filter_complex', filter_graph_no_music,
    '-map', '[out_audio]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '2',
    no_music_mix_wav
]
subprocess.run(cmd_mix_no_music, check=True)

cmd_video_no_music = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-i', no_music_mix_wav,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    DEMO_NO_MUSIC
]
print(f"Rendering clean video (no music) to {DEMO_NO_MUSIC}...")
subprocess.run(cmd_video_no_music, check=True)

print("ALL RENDERS COMPLETED SUCCESSFULLY!")
