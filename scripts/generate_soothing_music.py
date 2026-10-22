import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
import subprocess

FFMPEG = r'C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
SAMPLE_RATE = 48000
TOTAL_DURATION = 158.0  # covers full 154.8s video

# E-flat Major / C Minor - Serene, reflective, comforting
CHORDS = [
    # Ebmaj9: Eb2, Eb3, G3, Bb3, D4, F4
    {
        "bass": 77.78,    # Eb2
        "chord": [155.56, 196.00, 233.08, 293.66, 349.23], # Eb3, G3, Bb3, D4, F4
        "melody": [349.23, 293.66, 233.08] # F4, D4, Bb3
    },
    # Cm9: C2, C3, G3, Eb4, G4, D5
    {
        "bass": 65.41,    # C2
        "chord": [130.81, 196.00, 311.13, 392.00, 587.33], # C3, G3, Eb4, G4, D5
        "melody": [587.33, 392.00, 311.13] # D5, G4, Eb4
    },
    # Abmaj7: Ab1, Ab2, C4, Eb4, G4
    {
        "bass": 51.91,    # Ab1
        "chord": [103.83, 207.65, 261.63, 311.13, 392.00], # Ab2, Ab3, C4, Eb4, G4
        "melody": [392.00, 311.13, 261.63] # G4, Eb4, C4
    },
    # Bbadd9 / Fm9: Bb1, F3, D4, F4, C5
    {
        "bass": 58.27,    # Bb1
        "chord": [116.54, 174.61, 293.66, 349.23, 523.25], # Bb2, F3, D4, F4, C5
        "melody": [523.25, 349.23, 293.66] # C5, F4, D4
    }
]

CHORD_DUR = 8.0  # 8 seconds per chord for slow, breathing rhythm

def lowpass_filter(data, cutoff=1100, fs=48000, order=3):
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype='low', analog=False)
    return lfilter(b, a, data)

def synthesize_felt_note(freq, duration, sr=48000, velocity=0.5):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # Soft acoustic harmonics with gentle decay
    h1 = 1.00 * np.sin(2 * np.pi * freq * t) * np.exp(-1.4 * t)
    h2 = 0.28 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-2.2 * t)
    h3 = 0.08 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-3.5 * t)
    h4 = 0.02 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-5.0 * t)
    
    tone = (h1 + h2 + h3 + h4) * velocity
    
    # Soft felt attack (8ms smooth rise)
    attack_len = int(sr * 0.008)
    tone[:attack_len] *= np.linspace(0, 1, attack_len)**2
    
    return tone

def synthesize_warm_pad(freqs, duration, sr=48000):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    pad = np.zeros_like(t)
    
    for f in freqs:
        # Subtle analog chorus beating (detune 0.3 Hz)
        tone = (
            0.50 * np.sin(2 * np.pi * f * t) +
            0.25 * np.sin(2 * np.pi * (f + 0.35) * t) +
            0.25 * np.sin(2 * np.pi * (f - 0.35) * t)
        )
        pad += tone
        
    # Slow breathing swell envelope
    attack = int(sr * 2.2)
    release = int(sr * 2.8)
    env = np.ones_like(t)
    env[:attack] = np.linspace(0, 1, attack)**1.5
    env[-release:] = np.linspace(1, 0, release)**1.5
    
    return pad * env * 0.22

def main():
    total_samples = int(SAMPLE_RATE * TOTAL_DURATION)
    left = np.zeros(total_samples)
    right = np.zeros(total_samples)
    
    num_cycles = int(np.ceil(TOTAL_DURATION / (len(CHORDS) * CHORD_DUR)))
    curr_pos = 0
    
    for cycle in range(num_cycles):
        for chord in CHORDS:
            if curr_pos >= total_samples:
                break
                
            samples_chord = int(CHORD_DUR * SAMPLE_RATE)
            end_pos = min(total_samples, curr_pos + samples_chord)
            dur_actual = (end_pos - curr_pos) / SAMPLE_RATE
            if dur_actual <= 0.2:
                break
                
            s_count = end_pos - curr_pos
            
            # Layer 1: Warm Breathing String/Pad (ultra-smooth background)
            pad_raw = synthesize_warm_pad(chord["chord"], dur_actual, SAMPLE_RATE)[:s_count]
            
            # Layer 2: Soft Bass Note
            bass_raw = synthesize_felt_note(chord["bass"], dur_actual, SAMPLE_RATE, velocity=0.45)[:s_count]
            
            # Layer 3: Delicate Felt Piano Notes (staggered organically)
            piano_layer_l = np.zeros(s_count)
            piano_layer_r = np.zeros(s_count)
            
            # Play 2 or 3 gentle notes per 8s chord
            note_offsets = [0.0, 2.8, 5.2]
            for i, offset_sec in enumerate(note_offsets):
                start_sample = int(offset_sec * SAMPLE_RATE)
                if start_sample >= s_count:
                    continue
                note_dur = min(4.5, (s_count - start_sample) / SAMPLE_RATE)
                if note_dur <= 0.3:
                    continue
                
                note_freq = chord["melody"][i % len(chord["melody"])]
                note = synthesize_felt_note(note_freq, note_dur, SAMPLE_RATE, velocity=0.28)
                n_len = len(note)
                
                # Spatial stereo spread
                pan_l = 0.6 if i % 2 == 0 else 0.4
                pan_r = 0.4 if i % 2 == 0 else 0.6
                
                piano_layer_l[start_sample:start_sample + n_len] += note * pan_l
                piano_layer_r[start_sample:start_sample + n_len] += note * pan_r
                
            # Mix chord
            chord_l = (pad_raw * 0.40 + bass_raw * 0.45 + piano_layer_l * 0.45)
            chord_r = (pad_raw * 0.40 + bass_raw * 0.45 + piano_layer_r * 0.45)
            
            left[curr_pos:end_pos] += chord_l
            right[curr_pos:end_pos] += chord_r
            
            curr_pos = end_pos

    print("Applying acoustic lowpass filter (warm soothing roll-off)...")
    left = lowpass_filter(left, cutoff=1000, fs=SAMPLE_RATE)
    right = lowpass_filter(right, cutoff=1000, fs=SAMPLE_RATE)
    
    # Smooth global fade-in and fade-out
    fade_in_len = int(SAMPLE_RATE * 2.5)
    fade_out_len = int(SAMPLE_RATE * 3.5)
    env = np.ones(total_samples)
    env[:fade_in_len] = np.linspace(0, 1, fade_in_len)**1.5
    env[-fade_out_len:] = np.linspace(1, 0, fade_out_len)**1.5
    
    left *= env
    right *= env
    
    # Normalize peak gently to -2.0 dB
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
    if peak > 0:
        left = (left / peak) * 0.79
        right = (right / peak) * 0.79
        
    dry_wav = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation\temp\soothing_dry.wav"
    wet_wav = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation\soothing_piano_bed.wav"
    
    stereo = np.column_stack([
        (left * 32767).astype(np.int16),
        (right * 32767).astype(np.int16)
    ])
    wavfile.write(dry_wav, SAMPLE_RATE, stereo)
    
    print("Applying lush hall reverb with FFmpeg...")
    # Studio lush hall reverb filter:
    # aecho: multi-tap spatial decay (60ms, 140ms, 280ms)
    reverb_filter = "aecho=0.85:0.7:60|140|280:0.35|0.25|0.15,lowpass=f=1200"
    cmd = [
        FFMPEG, '-y',
        '-i', dry_wav,
        '-af', reverb_filter,
        wet_wav
    ]
    subprocess.run(cmd, check=True)
    print(f"SUCCESS: Saved ultra-soothing acoustic track to {wet_wav} ({TOTAL_DURATION:.1f}s)")

if __name__ == "__main__":
    main()
