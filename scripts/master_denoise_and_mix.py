import os, sys, subprocess
import soundfile as sf
import numpy as np
import noisereduce as nr
from scipy.signal import butter, lfilter

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
VIDEO_IN = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\screen_demo.mp4'
AUDIO_DIR = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation'
UPLOAD_DIR = r'C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\.user_uploaded'
MUSIC_FILE = os.path.join(AUDIO_DIR, 'premier_soothing_music.wav')
TEMP_DIR = os.path.join(AUDIO_DIR, 'temp')
FINAL_VIDEO = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'

os.makedirs(TEMP_DIR, exist_ok=True)

def studio_clean(input_path, output_path, speech_start_sec=0.0, noise_win=(0.2, 1.2)):
    data, sr = sf.read(input_path)
    if len(data.shape) > 1:
        mono = np.mean(data, axis=1)
    else:
        mono = data

    # 1. Highpass 120 Hz to kill room rumble, lowpass 8000 Hz to kill RF hiss
    nyq = 0.5 * sr
    b, a = butter(4, [120/nyq, 8000/nyq], btype='band')
    bandpassed = lfilter(b, a, mono)

    # 2. Extract noise reference
    n_start = int(noise_win[0] * sr)
    n_end = int(noise_win[1] * sr)
    noise_sample = bandpassed[n_start:n_end]

    # 3. Spectral subtraction
    denoised = nr.reduce_noise(
        y=bandpassed, 
        sr=sr, 
        y_noise=noise_sample, 
        prop_decrease=0.96, 
        stationary=True,
        n_std_thresh_stationary=1.2
    )

    # 4. Trim leading silence/clicks before speech starts
    if speech_start_sec > 0:
        denoised = denoised[int(speech_start_sec * sr):]

    # 5. Intelligent Noise Gate (downward expander for pauses)
    # Compute short-term RMS
    win = int(sr * 0.025)
    rms = np.sqrt(np.convolve(denoised**2, np.ones(win)/win, mode='same'))
    
    # Adaptive threshold: 25th percentile + safety delta
    thresh = np.percentile(rms, 35) * 1.8 + 0.003
    
    # Smooth gain
    gain = np.where(rms > thresh, 1.0, np.clip((rms / thresh)**3.5, 0.0005, 1.0))
    
    # Smooth attack (10ms) and release (120ms)
    alpha_att = 1.0 - np.exp(-1.0 / (sr * 0.010))
    alpha_rel = 1.0 - np.exp(-1.0 / (sr * 0.120))
    smoothed_gain = np.zeros_like(gain)
    cur = 0.0
    for i in range(len(gain)):
        target = gain[i]
        if target > cur:
            cur += alpha_att * (target - cur)
        else:
            cur += alpha_rel * (target - cur)
        smoothed_gain[i] = cur

    gated = denoised * smoothed_gain

    # 6. Vocal Presence EQ (+2.5 dB broad peak at 3 kHz)
    # Peaking filter
    w0 = 2 * np.pi * 3000 / sr
    alpha = np.sin(w0) / (2 * 1.2) # Q=1.2
    A = 10**(2.5 / 40.0)
    b_eq = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a_eq = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    eq_audio = lfilter(b_eq, a_eq, gated)

    # 7. Normalize peak to -1.0 dB
    p99 = np.percentile(np.abs(eq_audio), 99.5)
    scale = 0.88 / (p99 + 1e-6)
    out_audio = np.clip(eq_audio * scale, -0.98, 0.98)

    sf.write(output_path, out_audio, sr)
    print(f"Cleaned {input_path} -> {output_path} (Dur: {len(out_audio)/sr:.2f}s)")
    return output_path

# Process the 3 raw vocal tracks
print("1. Cleaning vocal tracks with studio spectral subtraction & intelligent gating...")
# Part 1: Inspiration dialogue new take (speech starts at 1.85s)
p1_raw = os.path.join(UPLOAD_DIR, 'uploaded_media_1792672595463.mp3')
p1_clean = os.path.join(TEMP_DIR, 'vocal_part1_clean.wav')
studio_clean(p1_raw, p1_clean, speech_start_sec=1.85, noise_win=(0.3, 1.6))

# Part 2: Scene 3 Live Device Simulation (speech starts at 1.10s)
p2_raw = os.path.join(UPLOAD_DIR, 'uploaded_media_2_1792670217157.mp3')
p2_clean = os.path.join(TEMP_DIR, 'vocal_part2_clean.wav')
studio_clean(p2_raw, p2_clean, speech_start_sec=1.10, noise_win=(0.1, 0.9))

# Part 3: Scene 4 Alexa Bedrock & Languages (speech starts at 0.80s)
p3_raw = os.path.join(UPLOAD_DIR, 'uploaded_media_1_1792671250233.mp3')
p3_clean = os.path.join(TEMP_DIR, 'vocal_part3_clean.wav')
studio_clean(p3_raw, p3_clean, speech_start_sec=0.80, noise_win=(0.1, 0.7))

# 2. Timing and Alignment across 154.80s Video
# Let us inspect durations
d1, sr1 = sf.read(p1_clean)
d2, sr2 = sf.read(p2_clean)
d3, sr3 = sf.read(p3_clean)
dur1 = len(d1)/sr1
dur2 = len(d2)/sr2
dur3 = len(d3)/sr3

print(f"Durations: Part 1={dur1:.2f}s, Part 2={dur2:.2f}s, Part 3={dur3:.2f}s")
# Part 1: 0.0s to ~45.5s
# Pause: 45.5s to 56.0s (10.5s musical swell in the silence)
# Part 2: 56.0s to 56.0 + dur2
# Pause: to 120.0s
# Part 3: to 154.80s

t_p1 = 0.0
t_p2 = 56.0
t_p3 = min(120.0, 154.80 - dur3)

# Build timed composite vocal track
n_total = int(sr1 * 154.80)
composite_vocal = np.zeros(n_total, dtype=np.float32)

idx1 = int(t_p1 * sr1)
composite_vocal[idx1:idx1+len(d1)] += d1

idx2 = int(t_p2 * sr1)
len2 = min(len(d2), n_total - idx2)
composite_vocal[idx2:idx2+len2] += d2[:len2]

idx3 = int(t_p3 * sr1)
len3 = min(len(d3), n_total - idx3)
composite_vocal[idx3:idx3+len3] += d3[:len3]

timed_vocal_wav = os.path.join(TEMP_DIR, 'master_clean_timed_vocals.wav')
sf.write(timed_vocal_wav, composite_vocal, sr1)
print(f"Composite timed vocal saved -> {timed_vocal_wav}")

# 3. Mix Vocals with CLEAR, AUDIBLE, SOOTHING MUSIC
# Music baseline volume = 0.26 (-18 dB, clearly audible and soothing!)
# Sidechain ducking = ducks by only 4 dB when voice speaks (down to -22 dB)
# When voice is silent (e.g. 45s-56s), music swells to -18 dB!
# UI SFX = subtle chimes at 0.15
mixed_wav = os.path.join(TEMP_DIR, 'master_demo_mix.wav')
mix_filter = (
    # Music: gentle lowpass at 5000Hz (warm acoustic air, no clash with voice)
    "[1:a]lowpass=f=5000,volume=0.28[bgm];"
    # Duck music gently when voice is speaking
    "[bgm][0:a]sidechaincompress=threshold=0.08:ratio=2.5:attack=100:release=500[ducked_bgm];"
    # Subtle UI chimes
    "[2:a]volume=0.18[ui_sfx];"
    # Mix together: voice at 1.0, music at 1.0 (already scaled to 0.28), sfx at 1.0
    "[0:a][ducked_bgm][ui_sfx]amix=inputs=3:weights=1.0 1.0 1.0:dropout_transition=2[mixed];"
    # Final master limiter (true peak -1.5 dB, zero distortion)
    "[mixed]alimiter=limit=0.92:attack=5:release=50[out_audio]"
)

cmd_mix = [
    FFMPEG, '-y',
    '-i', timed_vocal_wav,
    '-i', MUSIC_FILE,
    '-i', os.path.join(AUDIO_DIR, 'screen_demo_audio.wav'),
    '-filter_complex', mix_filter,
    '-map', '[out_audio]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '2',
    mixed_wav
]
subprocess.run(cmd_mix, check=True)
print("Mixed vocal track with audible soothing acoustic music.")

# 4. Multiplex into Final Video
cmd_video = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-i', mixed_wav,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    FINAL_VIDEO
]
subprocess.run(cmd_video, check=True)
print(f"SUCCESS: Rendered pristine demo video -> {FINAL_VIDEO}")
