import os, sys, subprocess

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VIDEO_IN = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
AUDIO_DIR = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation'
MUSIC_IN = os.path.join(AUDIO_DIR, 'tech_ambient_music.wav')
TEMP_DIR = os.path.join(AUDIO_DIR, 'temp')
FINAL_VIDEO_OUT = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'

# Let's inspect video duration
cmd = [FFMPEG, '-i', VIDEO_IN]
res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True)
dur_str = "00:02:34.80"
for line in res.stderr.split('\n'):
    if 'Duration:' in line:
        print(line.strip())

# Sequence the narration to fit the exact 154.80s video:
# Part 1: Personal Inspiration (0s to 58s)
# Part 2: Live Device Simulation (58s to 117s)
# Part 3: Alexa Voice Calling & Languages (117s to 154.8s)
# Let's assemble the voice timeline
part1 = os.path.join(AUDIO_DIR, 'scene1_personal_inspiration_cleaned.mp3')
part2 = os.path.join(AUDIO_DIR, 'scene3_live_device_simulation_v2_cleaned.mp3')
part3 = os.path.join(AUDIO_DIR, 'scene4_alexa_languages_retake_cleaned.mp3')

voice_concat_wav = os.path.join(TEMP_DIR, 'aligned_voice.wav')

# Concat voice with slight tempo adjustment (1.025) so total voice = 153.5s, leaving 1.3s clean music outro
filter_complex_voice = (
    f"[0:a][1:a][2:a]concat=n=3:v=0:a=1[vcat];"
    f"[vcat]atempo=1.028[vnorm]"
)

cmd_voice = [
    FFMPEG, '-y',
    '-i', part1,
    '-i', part2,
    '-i', part3,
    '-filter_complex', filter_complex_voice,
    '-map', '[vnorm]',
    '-ar', '48000', '-ac', '2',
    voice_concat_wav
]
print("Assembling aligned voice track...")
subprocess.run(cmd_voice, check=True)

# Now, mix voice + ambient music with sidechain ducking + original subtle click/chime effects
# When voice is active, music is ducked by 14dB. When voice is silent, music swells naturally.
ducked_mix_wav = os.path.join(TEMP_DIR, 'master_audio_ducked.wav')

# Filter graph:
# [0:a] voice (loudnorm leveled)
# [1:a] music (attenuated to -14dB baseline, ducked to -26dB when voice triggers)
# [2:a] original screen demo audio (lowered by 8dB so chimes are heard subtly in background)
filter_graph_mix = (
    # 1. Prepare music: volume -14dB
    "[1:a]volume=0.35[bgm];"
    # 2. Sidechain ducking: when voice peaks, music attenuates
    "[bgm][0:a]sidechaincompress=threshold=0.08:ratio=4.5:attack=120:release=600[ducked_bgm];"
    # 3. Subtle original UI sound effects (volume 0.40)
    "[2:a]volume=0.35[ui_sfx];"
    # 4. Final mix: voice priority 1.0, ducked music 0.9, UI sfx 0.5
    "[0:a][ducked_bgm][ui_sfx]amix=inputs=3:weights=1.0 0.85 0.35:dropout_transition=2[mixed];"
    # 5. Broadcast mastering on mixed audio
    "[mixed]loudnorm=I=-16:TP=-1.5:LRA=10[out_audio]"
)

cmd_mix = [
    FFMPEG, '-y',
    '-i', voice_concat_wav,
    '-i', MUSIC_IN,
    '-i', os.path.join(AUDIO_DIR, 'screen_demo_audio.wav'),
    '-filter_complex', filter_graph_mix,
    '-map', '[out_audio]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '2',
    ducked_mix_wav
]
print("Applying sidechain ducking & music mastering...")
subprocess.run(cmd_mix, check=True)

# Now mux with high-definition video from screen_demo.mp4
# Pad / scale to clean standard 1920x1080 if needed, or keep crisp native 1892x900
# High quality H.264 CRF 18 (visually lossless), AAC audio 192k
cmd_video = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-i', ducked_mix_wav,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    FINAL_VIDEO_OUT
]
print(f"Multiplexing final demo video to {FINAL_VIDEO_OUT}...")
subprocess.run(cmd_video, check=True)
print("SUCCESS! Final demo video created successfully.")
