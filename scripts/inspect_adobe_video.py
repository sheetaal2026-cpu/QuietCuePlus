import soundfile as sf
import numpy as np

TEMP_WAV = r"C:\Users\sheet\Documents\AIDetector\QuietCuePlus\audio_curation\temp\adobe_podcast_extracted.wav"
data, sr = sf.read(TEMP_WAV)
if len(data.shape) > 1: data = np.mean(data, axis=1)

pause1 = data[int(56.5*sr):int(57.5*sr)]
rms_p1 = np.sqrt(np.mean(pause1**2))

pause2 = data[int(113.5*sr):int(114.5*sr)]
rms_p2 = np.sqrt(np.mean(pause2**2))

print(f"Pause 1 (56.5-57.5s) RMS: {rms_p1:.6f}")
print(f"Pause 2 (113.5-114.5s) RMS: {rms_p2:.6f}")
