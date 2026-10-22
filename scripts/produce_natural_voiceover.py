import os
import soundfile as sf
import librosa
import numpy as np

# Script to slow down cloned voice audio to a calm, natural speaking pace
# Zero round brackets in comments or strings

def main():
    sr = 24000
    target_rate = 0.73

    chunk0_path = "temp_voice_chunks/chunk_0.wav"
    chunk1_path = "temp_voice_chunks/chunk_1.wav"

    if not os.path.exists(chunk0_path) or not os.path.exists(chunk1_path):
        print("Missing source audio chunks.")
        return

    print("Loading cloned audio chunks...")
    y0, _ = librosa.load(chunk0_path, sr=sr)
    y1, _ = librosa.load(chunk1_path, sr=sr)

    print("Applying phase vocoder tempo reduction to 0.73x natural pacing...")
    y0_slow = librosa.effects.time_stretch(y0, rate=target_rate)
    y1_slow = librosa.effects.time_stretch(y1, rate=target_rate)

    # 0.55 second natural conversational breathing pause
    pause_samples = int(sr * 0.55)
    pause = np.zeros(pause_samples, dtype=np.float32)

    # Combine into continuous presentation audio
    master_audio = np.concatenate([y0_slow, pause, y1_slow])

    # Peak normalization to -1 dB for crisp audio
    peak = np.max(np.abs(master_audio))
    if peak > 0:
        master_audio = master_audio / peak * 0.92

    output_path = "frontend/public/quietcue_cloned_voiceover.wav"
    root_path = "../quietcue_cloned_voiceover.wav"
    alt_path = "frontend/public/quietcue_cloned_voiceover_slow.wav"

    print(f"Saving natural-tempo cloned voiceover to: {output_path}")
    sf.write(output_path, master_audio, sr)
    sf.write(alt_path, master_audio, sr)
    try:
        sf.write(root_path, master_audio, sr)
    except Exception:
        pass

    duration = len(master_audio) / sr
    print(f"Master Audio Ready! Total duration: {duration:.2f} seconds.")

if __name__ == "__main__":
    main()
