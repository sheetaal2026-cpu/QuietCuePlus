import os, sys, subprocess
import numpy as np
from scipy.io import wavfile

sys.path.append(r'C:\Users\sheet\Documents\AIDetector\QuietCuePlus\scripts')
from process_audio import decode_to_wav, tighten_silence, apply_dsp_mastering, FFMPEG_BIN, UPLOAD_DIR, OUTPUT_DIR

temp_dir = os.path.join(OUTPUT_DIR, 'temp')

new_clips = [
    {
        'id': 'vr_future_consideration',
        'file': 'uploaded_media_1792669392730.mp3',
        'title': 'VR Future Consideration'
    },
    {
        'id': 'scene4_alexa_languages_retake',
        'file': 'uploaded_media_1792669415043.mp3',
        'title': 'Scene 4 - Alexa Bedrock & Languages (Retake)'
    }
]

for clip in new_clips:
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
