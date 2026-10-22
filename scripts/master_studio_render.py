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
SFX_FILE = os.path.join(AUDIO_DIR, 'screen_demo_audio.wav')
TEMP_DIR = os.path.join(AUDIO_DIR, 'temp')
FINAL_VIDEO = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\quietcue_final_demo.mp4'

os.makedirs(TEMP_DIR, exist_ok=True)

# 1. State of the art vocal denoising
def clean_vocal_track(input_path, output_path, speech_start_sec=0.0, noise_win=(0.2, 1.2)):
    data, sr = sf.read(input_path)
    if len(data.shape) > 1:
        mono = np.mean(data, axis=1)
    else:
        mono = data

    # 1. Bandpass 120Hz to 7800Hz (kills 100% of fan drone and high RF hiss)
    nyq = 0.5 * sr
    b, a = butter(4, [120/nyq, 7800/nyq], btype='band')
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
    win = int(sr * 0.025)
    rms = np.sqrt(np.convolve(denoised**2, np.ones(win)/win, mode='same'))
    thresh = np.percentile(rms, 35) * 1.8 + 0.003
    gain = np.where(rms > thresh, 1.0, np.clip((rms / thresh)**3.5, 0.0005, 1.0))
    
    # Attack 10ms, Release 120ms
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
    w0 = 2 * np.pi * 3000 / sr
    alpha = np.sin(w0) / (2 * 1.2)
    A = 10**(2.5 / 40.0)
    b_eq = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a_eq = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    eq_audio = lfilter(b_eq, a_eq, gated)

    # 7. Normalize peak
    p99 = np.percentile(np.abs(eq_audio), 99.5)
    scale = 0.88 / (p99 + 1e-6)
    out_audio = np.clip(eq_audio * scale, -0.98, 0.98)

    sf.write(output_path, out_audio, sr)
    print(f"Cleaned {input_path} -> {output_path} (Dur: {len(out_audio)/sr:.2f}s)")
    return out_audio, sr

print("Step 1: Cleaning vocal tracks with spectral subtraction & intelligent gating...")
# Part 1: Inspiration Dialogue new take (speech starts at 1.85s)
p1_raw = os.path.join(UPLOAD_DIR, 'uploaded_media_1792672595463.mp3')
p1_clean = os.path.join(TEMP_DIR, 'vocal_part1_clean.wav')
d1, sr = clean_vocal_track(p1_raw, p1_clean, speech_start_sec=1.85, noise_win=(0.3, 1.6))

# Part 2: Scene 3 Live Device Simulation (speech starts at 1.10s)
p2_raw = os.path.join(UPLOAD_DIR, 'uploaded_media_2_1792670217157.mp3')
p2_clean = os.path.join(TEMP_DIR, 'vocal_part2_clean.wav')
d2, _ = clean_vocal_track(p2_raw, p2_clean, speech_start_sec=1.10, noise_win=(0.1, 0.9))

# Part 3: Scene 4 Alexa Bedrock & Languages (speech starts at 0.80s)
p3_raw = os.path.join(UPLOAD_DIR, 'uploaded_media_1_1792671250233.mp3')
p3_clean = os.path.join(TEMP_DIR, 'vocal_part3_clean.wav')
d3, _ = clean_vocal_track(p3_raw, p3_clean, speech_start_sec=0.80, noise_win=(0.1, 0.7))

# Step 2: Assemble timed vocal composite
print("Step 2: Assembling 154.80s timed vocal composite...")
n_total = int(sr * 154.80)
composite_vocal = np.zeros(n_total, dtype=np.float32)

t_p1 = 0.0
t_p2 = 56.0
dur3 = len(d3) / sr
t_p3 = min(120.0, 154.80 - dur3)

idx1 = int(t_p1 * sr)
composite_vocal[idx1:idx1+len(d1)] += d1

idx2 = int(t_p2 * sr)
len2 = min(len(d2), n_total - idx2)
composite_vocal[idx2:idx2+len2] += d2[:len2]

idx3 = int(t_p3 * sr)
len3 = min(len(d3), n_total - idx3)
composite_vocal[idx3:idx3+len3] += d3[:len3]

# Step 3: Load Music and SFX
print("Step 3: Mixing with audible soothing acoustic music...")
music, sr_m = sf.read(MUSIC_FILE)
if len(music.shape) == 1:
    music = np.column_stack([music, music])
if len(music) > n_total:
    music = music[:n_total]
else:
    music = np.pad(music, ((0, n_total - len(music)), (0, 0)))

# Load UI SFX
sfx, sr_s = sf.read(SFX_FILE)
if len(sfx.shape) > 1:
    sfx = np.mean(sfx, axis=1)
if len(sfx) > n_total:
    sfx = sfx[:n_total]
else:
    sfx = np.pad(sfx, (0, n_total - len(sfx)))

# Compute vocal envelope for sidechain ducking
win = int(sr * 0.040)
rms_v = np.sqrt(np.convolve(composite_vocal**2, np.ones(win)/win, mode='same'))

# Sidechain ducking curve
speech_ratio = np.clip((rms_v - 0.012) / 0.035, 0.0, 1.0)
att_alpha = 1.0 - np.exp(-1.0 / (sr * 0.080))
rel_alpha = 1.0 - np.exp(-1.0 / (sr * 0.450))

smooth_duck = np.zeros(n_total)
cur = 0.0
for i in range(n_total):
    target = speech_ratio[i]
    if target > cur:
        cur += att_alpha * (target - cur)
    else:
        cur += rel_alpha * (target - cur)
    smooth_duck[i] = cur

# Music gain: 3.2 in silence (-17 dB RMS), 1.65 during speech (-23.5 dB RMS)
music_gain = 3.2 - 1.55 * smooth_duck
ducked_music = music * music_gain[:, np.newaxis]

# Mix vocal (stereo centered) + ducked music + subtle UI sfx
final_mix_L = composite_vocal * 0.85 + ducked_music[:, 0] + sfx * 0.20
final_mix_R = composite_vocal * 0.85 + ducked_music[:, 1] + sfx * 0.20

# Master Soft Limiter (transparent peak taming at -1.0 dB true peak)
def soft_limit(ch, limit=0.92):
    over = np.abs(ch) > limit
    ch[over] = np.sign(ch[over]) * (limit + np.tanh((np.abs(ch[over]) - limit) / (1.0 - limit + 1e-6)) * (1.0 - limit) * 0.8)
    return ch

final_mix_L = soft_limit(final_mix_L)
final_mix_R = soft_limit(final_mix_R)

# Fade out last 2.0s
fade_len = int(sr * 2.0)
fade_curve = np.linspace(1.0, 0.0, fade_len)
final_mix_L[-fade_len:] *= fade_curve
final_mix_R[-fade_len:] *= fade_curve

master_stereo = np.column_stack([final_mix_L, final_mix_R])
master_wav = os.path.join(TEMP_DIR, 'studio_master_mix.wav')
sf.write(master_wav, master_stereo, sr)
print(f"Master mix saved -> {master_wav}")

# Step 4: Multiplex with Video
print("Step 4: Multiplexing into final demo video...")
cmd_video = [
    FFMPEG, '-y',
    '-i', VIDEO_IN,
    '-i', master_wav,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-t', '154.80',
    FINAL_VIDEO
]
subprocess.run(cmd_video, check=True)
print(f"SUCCESS: Rendered final demo video -> {FINAL_VIDEO}")
