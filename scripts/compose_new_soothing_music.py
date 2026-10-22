import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
import os

SAMPLE_RATE = 48000
TOTAL_DURATION = 158.0 # covers 154.8s video

# C Major / A Minor cinematic progression - uplifting, serene, soothing
CHORDS = [
    # Cmaj9: peaceful, open, crystalline
    {
        "bass": 65.41, # C2
        "pad": [130.81, 196.00, 246.94, 293.66, 329.63], # C3, G3, B3, D4, E4
        "arps": [293.66, 329.63, 392.00, 493.88, 587.33]  # D4, E4, G4, B4, D5
    },
    # Am9: reflective, gentle, emotional
    {
        "bass": 55.00, # A1
        "pad": [110.00, 164.81, 196.00, 261.63, 329.63], # A2, E3, G3, C4, E4
        "arps": [261.63, 329.63, 392.00, 523.25, 659.25]  # C4, E4, G4, C5, E5
    },
    # Fmaj9: expansive, inspiring, warm
    {
        "bass": 43.65, # F1
        "pad": [87.31, 130.81, 174.61, 220.00, 261.63],  # F2, C3, F3, A3, C4
        "arps": [261.63, 329.63, 349.23, 440.00, 523.25]  # C4, E4, F4, A4, C5
    },
    # G6/add9: resolved, bright, comforting
    {
        "bass": 49.00, # G1
        "pad": [98.00, 146.83, 196.00, 246.94, 293.66],  # G2, D3, G3, B3, D4
        "arps": [293.66, 329.63, 392.00, 493.88, 587.33]  # D4, E4, G4, B4, D5
    }
]

CHORD_DUR = 8.0 # 8 seconds per chord

def gen_piano_note(freq, duration, velocity=0.6, sr=48000):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Natural piano harmonics with frequency-dependent decay
    decay1 = 1.2 + 0.001 * freq
    decay2 = 2.4 + 0.002 * freq
    decay3 = 4.0 + 0.004 * freq
    decay4 = 6.5 + 0.008 * freq
    
    h1 = 1.00 * np.sin(2 * np.pi * freq * t) * np.exp(-decay1 * t)
    h2 = 0.35 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-decay2 * t)
    h3 = 0.12 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-decay3 * t)
    h4 = 0.04 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-decay4 * t)
    
    note = (h1 + h2 + h3 + h4) * velocity
    # Smooth 10ms hammer attack
    att = int(sr * 0.010)
    note[:att] *= np.linspace(0, 1, att) ** 1.5
    return note

def gen_guitar_pluck(freq, duration, velocity=0.45, sr=48000):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Acoustic nylon string pluck with bright attack and fast ring
    decay = 2.0 + 0.003 * freq
    h1 = 1.00 * np.sin(2 * np.pi * freq * t) * np.exp(-decay * t)
    h2 = 0.50 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-decay * 1.8 * t)
    h3 = 0.25 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-decay * 2.8 * t)
    h4 = 0.10 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-decay * 4.2 * t)
    
    pluck = (h1 + h2 + h3 + h4) * velocity
    att = int(sr * 0.004)
    pluck[:att] *= np.linspace(0, 1, att)
    return pluck

def gen_bass_note(freq, duration, velocity=0.5, sr=48000):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Warm sub-bass with gentle fundamental and 2nd harmonic
    h1 = 1.00 * np.sin(2 * np.pi * freq * t) * np.exp(-0.35 * t)
    h2 = 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-0.6 * t)
    bass = (h1 + h2) * velocity
    att = int(sr * 0.025)
    bass[:att] *= np.linspace(0, 1, att)
    return bass

print("Composing premier soothing acoustic music bed...")
n_samples = int(SAMPLE_RATE * TOTAL_DURATION)
mix_L = np.zeros(n_samples, dtype=np.float32)
mix_R = np.zeros(n_samples, dtype=np.float32)

t_cur = 0.0
chord_idx = 0

while t_cur < TOTAL_DURATION:
    chord_data = CHORDS[chord_idx % len(CHORDS)]
    start_idx = int(t_cur * SAMPLE_RATE)
    dur_this = min(CHORD_DUR, TOTAL_DURATION - t_cur)
    len_this = int(dur_this * SAMPLE_RATE)
    
    # 1. Warm Bass note
    bass = gen_bass_note(chord_data["bass"], dur_this, velocity=0.42, sr=SAMPLE_RATE)
    mix_L[start_idx:start_idx+len(bass)] += bass * 0.5
    mix_R[start_idx:start_idx+len(bass)] += bass * 0.5
    
    # 2. Rich Piano Chord (strikes at beat 1 and softly at beat 5)
    for f in chord_data["pad"]:
        p1 = gen_piano_note(f, dur_this, velocity=0.28, sr=SAMPLE_RATE)
        # Pan across stereo field
        pan = 0.3 + 0.4 * (f / 350.0) # 0.3 to 0.7
        pan = np.clip(pan, 0.2, 0.8)
        mix_L[start_idx:start_idx+len(p1)] += p1 * (1.0 - pan)
        mix_R[start_idx:start_idx+len(p1)] += p1 * pan
        
        # Beat 5 gentle repetition
        if dur_this > 4.5:
            p2_start = start_idx + int(4.0 * SAMPLE_RATE)
            p2_dur = dur_this - 4.0
            p2 = gen_piano_note(f, p2_dur, velocity=0.18, sr=SAMPLE_RATE)
            mix_L[p2_start:p2_start+len(p2)] += p2 * (1.0 - pan)
            mix_R[p2_start:p2_start+len(p2)] += p2 * pan
    
    # 3. Delicate Acoustic Arpeggios (sparkling every 1.0 second)
    arp_notes = chord_data["arps"]
    for step in range(int(dur_this)):
        arp_time = t_cur + step * 1.0
        if arp_time >= TOTAL_DURATION:
            break
        a_idx = int(arp_time * SAMPLE_RATE)
        freq = arp_notes[step % len(arp_notes)]
        pluck = gen_guitar_pluck(freq, 2.5, velocity=0.22, sr=SAMPLE_RATE)
        pan_pluck = 0.25 if step % 2 == 0 else 0.75
        end_idx = min(n_samples, a_idx + len(pluck))
        seg_len = end_idx - a_idx
        mix_L[a_idx:end_idx] += pluck[:seg_len] * (1.0 - pan_pluck)
        mix_R[a_idx:end_idx] += pluck[:seg_len] * pan_pluck
    
    t_cur += CHORD_DUR
    chord_idx += 1

# Master acoustic EQ: smooth lowpass at 5500 Hz (warmth + air) and gentle dip at 2 kHz (speech pocket)
nyq = 0.5 * SAMPLE_RATE
b_lp, a_lp = butter(3, 5200 / nyq, btype='low')
mix_L = lfilter(b_lp, a_lp, mix_L)
mix_R = lfilter(b_lp, a_lp, mix_R)

# Gentle fade out over final 4 seconds
fade_len = int(SAMPLE_RATE * 4.0)
fade_env = np.linspace(1, 0, fade_len)
mix_L[-fade_len:] *= fade_env
mix_R[-fade_len:] *= fade_env

# Normalize master music track to -14 dB peak (healthy, audible, beautiful!)
max_val = max(np.max(np.abs(mix_L)), np.max(np.abs(mix_R)))
scale = 0.35 / (max_val + 1e-6)
mix_L *= scale
mix_R *= scale

out_stereo = np.column_stack([mix_L, mix_R])
out_wav = r'c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation\premier_soothing_music.wav'
wavfile.write(out_wav, SAMPLE_RATE, (out_stereo * 32767).astype(np.int16))
print(f"SUCCESS: Composed premier music -> {out_wav}")
