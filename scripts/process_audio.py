import os
import sys
import subprocess
import numpy as np
from scipy.io import wavfile

FFMPEG_BIN = r"C:\Users\sheet\Documents\AIDetector\.venv\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
UPLOAD_DIR = r"C:\Users\sheet\.gemini\antigravity\brain\988ce325-51fb-4e6f-9557-719a26a27978\.user_uploaded"
OUTPUT_DIR = r"C:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation"

# Chronological order of the demo narration
SCENES = [
    {
        "id": "scene1_personal_inspiration",
        "file": "uploaded_media_3_1792664940343.mp3",
        "title": "Scene 1 - Personal Inspiration & Governance Gap"
    },
    {
        "id": "scene2_dynamic_contracts",
        "file": "uploaded_media_0_1792664940343.mp3",
        "title": "Scene 2 - Dynamic Contracts & 3 Clear Thresholds"
    },
    {
        "id": "scene3_live_device_simulation",
        "file": "uploaded_media_4_1792664940343.mp3",
        "title": "Scene 3 - Connected Devices & Live Multi-Alert Routing"
    },
    {
        "id": "scene4_alexa_bedrock_languages",
        "file": "uploaded_media_1_1792664940343.mp3",
        "title": "Scene 4 - Alexa Voice Calling, Bedrock & Languages"
    },
    {
        "id": "scene5_mcp_privacy_conclusion",
        "file": "uploaded_media_2_1792664940343.mp3",
        "title": "Scene 5 - MCP Architecture, Privacy & Conclusion"
    }
]

def decode_to_wav(mp3_path, wav_path):
    cmd = [
        FFMPEG_BIN, "-y",
        "-i", mp3_path,
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "48000", "-ac", "1",
        wav_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tighten_silence(samples, sample_rate, silence_thresh_db=-38, max_pause_sec=0.38, lead_sec=0.10, trail_sec=0.15):
    # Convert samples to float
    float_samples = samples.astype(np.float32) / 32768.0
    
    # Calculate short-time RMS energy (frame size 25ms, hop 10ms)
    frame_len = int(sample_rate * 0.025)
    hop_len = int(sample_rate * 0.010)
    
    num_frames = (len(float_samples) - frame_len) // hop_len + 1
    if num_frames <= 0:
        return samples

    # Compute frame energy in dB
    frame_starts = np.arange(num_frames) * hop_len
    energy = np.zeros(num_frames)
    for i, start in enumerate(frame_starts):
        chunk = float_samples[start:start + frame_len]
        rms = np.sqrt(np.mean(chunk**2) + 1e-12)
        energy[i] = 20 * np.log10(rms)

    is_speech = energy > silence_thresh_db

    # Smooth speech detections (bridge tiny dips < 80ms)
    min_speech_frames = int(0.08 / 0.010)
    for i in range(1, len(is_speech) - 1):
        if not is_speech[i] and is_speech[i-1] and (i + min_speech_frames < len(is_speech)) and np.any(is_speech[i:i+min_speech_frames]):
            is_speech[i] = True

    # Find speech boundaries
    speech_indices = np.where(is_speech)[0]
    if len(speech_indices) == 0:
        return samples

    first_speech_sample = max(0, int(frame_starts[speech_indices[0]] - (lead_sec * sample_rate)))
    last_speech_sample = min(len(samples), int(frame_starts[speech_indices[-1]] + frame_len + (trail_sec * sample_rate)))

    # Detect internal silence spans
    max_pause_samples = int(max_pause_sec * sample_rate)
    
    result_chunks = []
    curr_pos = first_speech_sample

    # Find continuous silence segments within the speech bounds
    silence_segments = []
    in_silence = False
    sil_start = 0

    for idx, sp in enumerate(is_speech):
        t_sample = frame_starts[idx]
        if t_sample < first_speech_sample or t_sample > last_speech_sample:
            continue
        if not sp:
            if not in_silence:
                in_silence = True
                sil_start = t_sample
        else:
            if in_silence:
                in_silence = False
                sil_end = t_sample
                silence_segments.append((sil_start, sil_end))
    if in_silence:
        silence_segments.append((sil_start, last_speech_sample))

    # Reconstruct audio by capping long silence spans
    curr_sample = first_speech_sample
    for s_start, s_end in silence_segments:
        sil_len = s_end - s_start
        if sil_len > max_pause_samples:
            # Keep audio up to s_start
            result_chunks.append(samples[curr_sample:s_start])
            # Keep only max_pause_samples of silence with subtle crossfade
            result_chunks.append(samples[s_start:s_start + max_pause_samples])
            curr_sample = s_end

    result_chunks.append(samples[curr_sample:last_speech_sample])
    return np.concatenate(result_chunks)

def apply_dsp_mastering(input_wav, output_mp3):
    # Professional voice mastering chain:
    # 1. highpass: eliminates sub-bass air conditioning rumble & table vibrations
    # 2. lowpass: eliminates ultra-high RF / mic hiss above 12kHz
    # 3. afftdn: spectral subtraction denoising (nr=10dB, noise floor -45dB)
    # 4. acompressor: gentle vocal dynamic smoothing
    # 5. loudnorm: EBU R128 broadcast standard (-16 LUFS, true peak -1.5dB)
    audio_filter = (
        "highpass=f=80,"
        "lowpass=f=12000,"
        "afftdn=nr=10:nf=-45:tn=1,"
        "acompressor=threshold=-20dB:ratio=2.5:attack=15:release=120,"
        "loudnorm=I=-16:TP=-1.5:LRA=10"
    )
    cmd = [
        FFMPEG_BIN, "-y",
        "-i", input_wav,
        "-af", audio_filter,
        "-ac", "2",
        "-ar", "48000",
        "-b:a", "192k",
        output_mp3
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    temp_dir = os.path.join(OUTPUT_DIR, "temp")
    os.makedirs(temp_dir, exist_ok=True)

    processed_mp3s = []

    print("=== STARTING AUDIO CURATION & DENOISING ===")
    for idx, scene in enumerate(SCENES, 1):
        raw_mp3 = os.path.join(UPLOAD_DIR, scene["file"])
        raw_wav = os.path.join(temp_dir, f"{scene['id']}_raw.wav")
        trimmed_wav = os.path.join(temp_dir, f"{scene['id']}_trimmed.wav")
        final_mp3 = os.path.join(OUTPUT_DIR, f"{scene['id']}_cleaned.mp3")

        print(f"\nProcessing {scene['title']}...")
        print(f"  Input: {scene['file']}")
        
        # 1. Decode to PCM WAV
        decode_to_wav(raw_mp3, raw_wav)
        sr, samples = wavfile.read(raw_wav)
        raw_duration = len(samples) / sr
        print(f"  Original duration: {raw_duration:.2f}s")

        # 2. Silence Tightening
        trimmed_samples = tighten_silence(samples, sr, silence_thresh_db=-38, max_pause_sec=0.38)
        trimmed_duration = len(trimmed_samples) / sr
        saved_sec = raw_duration - trimmed_duration
        print(f"  Trimmed duration:  {trimmed_duration:.2f}s [trimmed {saved_sec:.2f}s of silence]")

        wavfile.write(trimmed_wav, sr, trimmed_samples)

        # 3. Apply DSP Mastering (denoise + EQ + compression + loudnorm)
        apply_dsp_mastering(trimmed_wav, final_mp3)
        print(f"  Saved Clean Track: {os.path.basename(final_mp3)}")
        processed_mp3s.append(final_mp3)

    # 4. Generate Combined Master Narration Track with natural 0.5s inter-scene spacing
    print("\n=== ASSEMBLING UNIFIED MASTER NARRATION TRACK ===")
    concat_list_file = os.path.join(temp_dir, "concat_list.txt")
    silence_gap_wav = os.path.join(temp_dir, "gap_0_5s.wav")
    
    # Create 0.5s pause
    sr = 48000
    gap_samples = np.zeros(int(sr * 0.5), dtype=np.int16)
    wavfile.write(silence_gap_wav, sr, gap_samples)

    # Concatenate all scenes into a single cohesive narration track
    master_wav = os.path.join(temp_dir, "master_narration_raw.wav")
    all_samples = []
    for i, scene in enumerate(SCENES):
        trimmed_wav = os.path.join(temp_dir, f"{scene['id']}_trimmed.wav")
        _, s = wavfile.read(trimmed_wav)
        all_samples.append(s)
        if i < len(SCENES) - 1:
            all_samples.append(gap_samples)

    full_master_samples = np.concatenate(all_samples)
    wavfile.write(master_wav, sr, full_master_samples)
    
    master_mp3 = os.path.join(OUTPUT_DIR, "quietcue_master_narration_cleaned.mp3")
    apply_dsp_mastering(master_wav, master_mp3)
    
    total_master_duration = len(full_master_samples) / sr
    print(f"\nSUCCESS: Master Track Created: {master_mp3}")
    print(f"Master Duration: {total_master_duration:.2f}s [{int(total_master_duration // 60)}m {int(total_master_duration % 60)}s]")

if __name__ == "__main__":
    main()
