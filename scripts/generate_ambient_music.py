import numpy as np
from scipy.io import wavfile

SAMPLE_RATE = 48000
TOTAL_DURATION = 158.0  # slightly longer than 154.8s video

# Chord progression in D Major:
# Chord 1: Dmaj9  (D3, A3, F#4, A4, C#5, E5)
# Chord 2: Bm9    (B2, F#3, D4, F#4, A4, C#5)
# Chord 3: Gmaj7  (G2, D3, B3, F#4, B4, D5)
# Chord 4: Aadd9  (A2, E3, C#4, E4, A4, B4)

CHORDS = [
    # [D3, A3, F#4, A4, C#5, E5]
    [146.83, 220.00, 369.99, 440.00, 554.37, 659.25],
    # [B2, F#3, D4, F#4, A4, C#5]
    [123.47, 185.00, 293.66, 369.99, 440.00, 554.37],
    # [G2, D3, B3, F#4, B4, D5]
    [98.00, 146.83, 246.94, 369.99, 493.88, 587.33],
    # [A2, E3, C#4, E4, A4, B4]
    [110.00, 164.81, 277.18, 329.63, 440.00, 493.88]
]

CHORD_DURATION = 9.6  # 16 beats at 100 BPM

def synthesize_pad(freq, duration, sr):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Fundamental + warm soft harmonics + subtle detuned chorus
    detune1 = 1.0015
    detune2 = 0.9985
    wave = (
        0.50 * np.sin(2 * np.pi * freq * t) +
        0.25 * np.sin(2 * np.pi * freq * detune1 * t) +
        0.25 * np.sin(2 * np.pi * freq * detune2 * t) +
        0.15 * np.sin(2 * np.pi * freq * 2 * t) +
        0.05 * np.sin(2 * np.pi * freq * 3 * t)
    )
    # Warm attack-release envelope
    attack_samples = int(sr * 1.2)
    release_samples = int(sr * 1.5)
    env = np.ones_like(wave)
    env[:attack_samples] = np.linspace(0, 1, attack_samples)**1.5
    env[-release_samples:] = np.linspace(1, 0, release_samples)**1.5
    return wave * env

def synthesize_plucks(chord_freqs, chord_dur, sr):
    t_total = int(sr * chord_dur)
    track = np.zeros(t_total)
    # Arpeggiate notes gently across the 9.6s measure (every 0.6s)
    beat_dur = 0.6
    num_notes = int(chord_dur / beat_dur)
    
    for i in range(num_notes):
        note_freq = chord_freqs[(i % len(chord_freqs))]
        # Higher octave for delicate sparkle
        if i % 2 == 1:
            note_freq *= 2.0
            
        t_start = int(i * beat_dur * sr)
        note_len = int(min(sr * 1.8, t_total - t_start))
        if note_len <= 0:
            continue
            
        t = np.linspace(0, note_len / sr, note_len, endpoint=False)
        # Bell-like / Rhodes timbre with fast attack and exponential decay
        decay = np.exp(-3.5 * t)
        note_wave = (
            np.sin(2 * np.pi * note_freq * t) +
            0.4 * np.sin(2 * np.pi * note_freq * 2.0 * t) * np.exp(-5.0 * t) +
            0.15 * np.sin(2 * np.pi * note_freq * 3.0 * t) * np.exp(-8.0 * t)
        ) * decay * 0.35
        
        track[t_start:t_start + note_len] += note_wave
    return track

def synthesize_sub_pulse(chord_root, chord_dur, sr):
    # Warm gentle pulsing sub bass
    t_total = int(sr * chord_dur)
    track = np.zeros(t_total)
    beat_dur = 0.6  # 100 BPM
    num_beats = int(chord_dur / beat_dur)
    
    for i in range(num_beats):
        t_start = int(i * beat_dur * sr)
        pulse_len = int(min(sr * 0.45, t_total - t_start))
        if pulse_len <= 0:
            continue
        t = np.linspace(0, pulse_len / sr, pulse_len, endpoint=False)
        env = (np.sin(np.pi * t / (pulse_len / sr)))**2
        pulse = np.sin(2 * np.pi * (chord_root / 2.0) * t) * env * 0.28
        track[t_start:t_start + pulse_len] += pulse
    return track

def main():
    total_samples = int(SAMPLE_RATE * TOTAL_DURATION)
    left_channel = np.zeros(total_samples)
    right_channel = np.zeros(total_samples)
    
    num_progressions = int(np.ceil(TOTAL_DURATION / (len(CHORDS) * CHORD_DURATION)))
    
    curr_sample = 0
    for prog in range(num_progressions):
        for chord_idx, freqs in enumerate(CHORDS):
            if curr_sample >= total_samples:
                break
            
            dur = min(CHORD_DURATION, (total_samples - curr_sample) / SAMPLE_RATE)
            if dur <= 0.1:
                break
                
            samples_this_chord = int(dur * SAMPLE_RATE)
            
            # 1. Pads
            pad_mix_l = np.zeros(samples_this_chord)
            pad_mix_r = np.zeros(samples_this_chord)
            
            for f_idx, f in enumerate(freqs):
                pad_tone = synthesize_pad(f, dur, SAMPLE_RATE)
                # Gentle stereo panning spread
                pan_l = 0.5 + 0.35 * np.sin(f_idx * 1.3)
                pan_r = 0.5 - 0.35 * np.sin(f_idx * 1.3)
                pad_mix_l += pad_tone[:samples_this_chord] * pan_l
                pad_mix_r += pad_tone[:samples_this_chord] * pan_r
                
            # 2. Sparkling Plucks / Arps
            plucks = synthesize_plucks(freqs, dur, SAMPLE_RATE)[:samples_this_chord]
            
            # 3. Soft Bass Pulse
            sub = synthesize_sub_pulse(freqs[0], dur, SAMPLE_RATE)[:samples_this_chord]
            
            # Combine layers
            chord_l = pad_mix_l * 0.45 + plucks * 0.30 + sub * 0.40
            chord_r = pad_mix_r * 0.45 + plucks * 0.30 + sub * 0.40
            
            left_channel[curr_sample:curr_sample + samples_this_chord] += chord_l
            right_channel[curr_sample:curr_sample + samples_this_chord] += chord_r
            
            curr_sample += samples_this_chord

    # Master gentle fade in / fade out
    fade_in = int(SAMPLE_RATE * 2.0)
    fade_out = int(SAMPLE_RATE * 3.0)
    fade_env = np.ones(total_samples)
    fade_env[:fade_in] = np.linspace(0, 1, fade_in)**1.5
    fade_env[-fade_out:] = np.linspace(1, 0, fade_out)**1.5
    
    left_channel *= fade_env
    right_channel *= fade_env
    
    # Normalize peak to -1.0 dB
    peak = max(np.max(np.abs(left_channel)), np.max(np.abs(right_channel)))
    if peak > 0:
        left_channel = (left_channel / peak) * 0.89
        right_channel = (right_channel / peak) * 0.89
        
    stereo = np.column_stack([
        (left_channel * 32767).astype(np.int16),
        (right_channel * 32767).astype(np.int16)
    ])
    
    out_path = r"c:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation\tech_ambient_music.wav"
    wavfile.write(out_path, SAMPLE_RATE, stereo)
    print(f"Generated pristine ambient music track: {out_path} ({TOTAL_DURATION:.1f}s)")

if __name__ == "__main__":
    main()
