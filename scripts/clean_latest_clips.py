import os, sys
import numpy as np
from scipy.io import wavfile

sys.path.append(r'C:\Users\sheet\Documents\AIDetector\QuietCuePlus\scripts')
from process_audio import decode_to_wav, tighten_silence, apply_dsp_mastering, FFMPEG_BIN, UPLOAD_DIR, OUTPUT_DIR

temp_dir = os.path.join(OUTPUT_DIR, 'temp')

latest_clips = [
    {
        'id': 'scene2_submenus_smart_contract',
        'file': 'uploaded_media_0_1792670217157.mp3',
        'title': 'Scene 2 - Submenus to Alexa+ Smart Contracts'
    },
    {
        'id': 'scene5_mcp_privacy_conclusion_v2',
        'file': 'uploaded_media_1_1792670217157.mp3',
        'title': 'Scene 5 - MCP Architecture & Privacy (V2)'
    },
    {
        'id': 'scene3_live_device_simulation_v2',
        'file': 'uploaded_media_2_1792670217157.mp3',
        'title': 'Scene 3 - Live Device Simulation (V2)'
    }
]

for clip in latest_clips:
    raw_mp3 = os.path.join(UPLOAD_DIR, clip['file'])
    raw_wav = os.path.join(temp_dir, f"{clip['id']}_raw.wav")
    trimmed_wav = os.path.join(temp_dir, f"{clip['id']}_trimmed.wav")
    final_mp3 = os.path.join(OUTPUT_DIR, f"{clip['id']}_cleaned.mp3")

    decode_to_wav(raw_mp3, raw_wav)
    sr, samples = wavfile.read(raw_wav)
    raw_dur = len(samples) / sr
    trimmed_samples = tighten_silence(samples, sr, silence_thresh_db=-38, max_pause_sec=0.38)
    trimmed_dur = len(trimmed_samples) / sr
    wavfile.write(trimmed_wav, sr, trimmed_samples)
    apply_dsp_mastering(trimmed_wav, final_mp3)
    saved = raw_dur - trimmed_dur
    print(f"{clip['title']}: raw={raw_dur:.2f}s -> cleaned={trimmed_dur:.2f}s [trimmed {saved:.2f}s of silence]")
