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

def process_and_trim_track(path, start_sec=0.0, end_sec=None, noise_win=(0.1, 0.8), max_pause_sec=0.36):
    d, sr = sf.read(path)
    if len(d.shape) > 1:
        mono = np.mean(d, axis=1)
    else:
        mono = d

    # 1. Bandpass 110Hz - 8500Hz
    nyq = 0.5 * sr
    b, a = butter(4, [110/nyq, 8500/nyq], btype='band')
    filt = lfilter(b, a, mono)

    # 2. Extract noise reference
    n_start = int(noise_win[0] * sr)
    n_end = int(noise_win[1] * sr)
    noise_sample = filt[n_start:n_end]

    # 3. Spectral denoise
    denoised = nr.reduce_noise(y=filt, sr=sr, y_noise=noise_sample, prop_decrease=0.92, stationary=True)

    # 4. Trim exact start and end boundaries (removes lead-in and mic bumps)
    idx_start = int(start_sec * sr)
    idx_end = int(end_sec * sr) if end_sec is not None else len(denoised)
    clipped = denoised[idx_start:idx_end]

    # Apply 50ms fade-in and 100ms fade-out
    fade_in = int(sr * 0.050)
    fade_out = int(sr * 0.100)
    clipped[:fade_in] *= np.linspace(0, 1, fade_in)
    clipped[-fade_out:] *= np.linspace(1, 0, fade_out)

    # 5. Silence tightening within active speech
    frame_len = int(sr * 0.025)
    rms = np.sqrt(np.convolve(clipped**2, np.ones(frame_len)/frame_len, mode='same'))
    speech_thresh = np.percentile(rms, 25) * 2.0 + 0.003
    is_speech = rms > speech_thresh
    
    speech_indices = np.where(is_speech)[0]
    if len(speech_indices) > 0:
        first_s = max(0, speech_indices[0] - int(sr * 0.06))
        last_s = min(len(clipped), speech_indices[-1] + int(sr * 0.10))
    else:
        first_s, last_s = 0, len(clipped)

    max_pause_samples = int(max_pause_sec * sr)
    chunks = []
    curr = first_s
    in_sil = False
    sil_start = 0

    for i in range(first_s, last_s):
        if not is_speech[i]:
            if not in_sil:
                in_sil = True
                sil_start = i
        else:
            if in_sil:
                in_sil = False
                sil_len = i - sil_start
                if sil_len > max_pause_samples:
                    chunks.append(clipped[curr:sil_start])
                    sil_chunk = clipped[sil_start:sil_start + max_pause_samples]
                    chunks.append(sil_chunk)
                    curr = i
    chunks.append(clipped[curr:last_s])
    tightened = np.concatenate(chunks)

    # 6. Intelligent downward gate
    r_tight = np.sqrt(np.convolve(tightened**2, np.ones(frame_len)/frame_len, mode='same'))
    gate_thresh = np.percentile(r_tight, 20) * 1.8 + 0.002
    gain = np.where(r_tight > gate_thresh, 1.0, np.clip((r_tight / gate_thresh)**3, 0.001, 1.0))
    
    alpha_att = 1.0 - np.exp(-1.0 / (sr * 0.008))
    alpha_rel = 1.0 - np.exp(-1.0 / (sr * 0.120))
    smoothed_gain = np.zeros_like(gain)
    cur = 0.0
    for i in range(len(gain)):
        target = gain[i]
        cur += (alpha_att if target > cur else alpha_rel) * (target - cur)
        smoothed_gain[i] = cur
    gated = tightened * smoothed_gain

    # 7. Presence EQ (+2.0 dB at 3000 Hz)
    w0 = 2 * np.pi * 3000 / sr
    alpha = np.sin(w0) / (2 * 1.2)
    A = 10**(2.0 / 40.0)
    b_eq = [1 + alpha * A, -2 * np.cos(w0), 1 - alpha * A]
    a_eq = [1 + alpha / A, -2 * np.cos(w0), 1 - alpha / A]
    eq_audio = lfilter(b_eq, a_eq, gated)

    # 8. Normalize peak
    p99 = np.percentile(np.abs(eq_audio), 99.5)
    out_audio = np.clip(eq_audio * (0.88 / (p99 + 1e-6)), -0.98, 0.98)
    return out_audio, sr

print("Step 1: Processing all 3 tracks with boundary trimming to eliminate disturbance...")

# Part 1: New Clean Inspiration Audio attached by user (0.80s to 63.00s)
p1_path = os.path.join(UPLOAD_DIR, 'uploaded_media_1792674426789.mp3')
d1, sr = process_and_trim_track(p1_path, start_sec=0.80, end_sec=63.00, noise_win=(0.1, 0.75))
print(f"Part 1 (Clean Inspiration): {len(d1)/sr:.2f}s")

# Part 2: Scene 3 Live Simulation (0.90s to 59.40s - COMPLETELY TRIMS OUT 66s-67s BUMP AT 00:01:55!)
p2_path = os.path.join(UPLOAD_DIR, 'uploaded_media_2_1792670217157.mp3')
d2, _ = process_and_trim_track(p2_path, start_sec=0.90, end_sec=59.40, noise_win=(0.1, 0.85))
print(f"Part 2 (Live Simulation trimmed): {len(d2)/sr:.2f}s")

# Part 3: Scene 4 Alexa Bedrock & Languages (0.75s to 43.80s)
p3_path = os.path.join(UPLOAD_DIR, 'uploaded_media_1_1792671250233.mp3')
d3, _ = process_and_trim_track(p3_path, start_sec=0.75, end_sec=43.80, noise_win=(0.1, 0.70))
print(f"Part 3 (Alexa & Languages): {len(d3)/sr:.2f}s")

# Write individual clean files
p1_wav = os.path.join(TEMP_DIR, 'p1_clean_trimmed.wav')
p2_wav = os.path.join(TEMP_DIR, 'p2_clean_trimmed.wav')
p3_wav = os.path.join(TEMP_DIR, 'p3_clean_trimmed.wav')
sf.write(p1_wav, d1, sr)
sf.write(p2_wav, d2, sr)
sf.write(p3_wav, d3, sr)

# Step 2: Concatenate and align tempo to exactly 154.80s
total_raw_dur = (len(d1) + len(d2) + len(d3)) / sr
target_dur = 154.80
tempo_ratio = total_raw_dur / target_dur
print(f"Concatenating vocals: total={total_raw_dur:.2f}s -> target={target_dur:.2f}s (atempo={tempo_ratio:.4f})")

concat_vocal_wav = os.path.join(TEMP_DIR, 'master_clean_trimmed_vocals.wav')
cmd_concat = [
    FFMPEG, '-y',
    '-i', p1_wav,
    '-i', p2_wav,
    '-i', p3_wav,
    '-filter_complex',
    f"[0:a][1:a][2:a]concat=n=3:v=0:a=1[vcat];[vcat]atempo={tempo_ratio:.4f}[vtempo]",
    '-map', '[vtempo]',
    '-t', '154.80',
    '-ar', '48000', '-ac', '1',
    concat_vocal_wav
]
subprocess.run(cmd_concat, check=True)
print(f"Vocals concatenated and tempo-aligned -> {concat_vocal_wav}")

# Step 3: Mix with AUDIBLE, SOOTHING ACOUSTIC MUSIC
print("Step 3: Mixing with audible soothing acoustic music bed...")
vocals, sr_v = sf.read(concat_vocal_wav)
n_total = int(sr_v * 154.80)
if len(vocals) < n_total:
    vocals = np.pad(vocals, (0, n_total - len(vocals)))
else:
    vocals = vocals[:n_total]

# Load premier music
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

# Sidechain ducking envelope
win = int(sr_v * 0.040)
rms_v = np.sqrt(np.convolve(vocals**2, np.ones(win)/win, mode='same'))

# Music gain: 3.2 in silence (-17 dB RMS, clearly audible!), 1.65 during speech (-23.5 dB RMS)
speech_ratio = np.clip((rms_v - 0.012) / 0.035, 0.0, 1.0)
att_alpha = 1.0 - np.exp(-1.0 / (sr_v * 0.080))
rel_alpha = 1.0 - np.exp(-1.0 / (sr_v * 0.450))

smooth_duck = np.zeros(n_total)
cur = 0.0
for i in range(n_total):
    target = speech_ratio[i]
    cur += (att_alpha if target > cur else rel_alpha) * (target - cur)
    smooth_duck[i] = cur

music_gain = 3.2 - 1.55 * smooth_duck
ducked_music = music * music_gain[:, np.newaxis]

# Combine: Vocals (stereo center) + Ducked Music + UI SFX
final_mix_L = vocals * 0.88 + ducked_music[:, 0] + sfx * 0.18
final_mix_R = vocals * 0.88 + ducked_music[:, 1] + sfx * 0.18

# Master soft limiter (-1.0 dB true peak)
def soft_limit(ch, limit=0.92):
    over = np.abs(ch) > limit
    ch[over] = np.sign(ch[over]) * (limit + np.tanh((np.abs(ch[over]) - limit) / (1.0 - limit + 1e-6)) * (1.0 - limit) * 0.8)
    return ch

final_mix_L = soft_limit(final_mix_L)
final_mix_R = soft_limit(final_mix_R)

# Fade out last 2.0s
fade_len = int(sr_v * 2.0)
fade_curve = np.linspace(1.0, 0.0, fade_len)
final_mix_L[-fade_len:] *= fade_curve
final_mix_R[-fade_len:] *= fade_curve

master_stereo = np.column_stack([final_mix_L, final_mix_R])
master_wav = os.path.join(TEMP_DIR, 'trimmed_masterpiece_mix.wav')
sf.write(master_wav, master_stereo, sr_v)
print(f"Master mix rendered -> {master_wav}")

# Step 4: Multiplex into Final Video
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
print(f"SUCCESS: Rendered masterpiece demo video -> {FINAL_VIDEO}")
