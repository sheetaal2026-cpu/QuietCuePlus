import os
import sys
import subprocess
import imageio_ffmpeg
import miniaudio

# QuietCue+ Video Production Engine
# Assembles 7 presentation slides and user voiceover into MP4 video
# Zero round brackets in comments or UI strings

ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
print("Using bundled ffmpeg binary at:", ffmpeg_path)

slides_dir = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/slides")
audio_path = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_user_voiceover.wav")
output_video_path = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_demo_video.mp4")

if not os.path.exists(audio_path):
    print("Error: Audio track not found at:", audio_path)
    sys.exit(1)

audio_info = miniaudio.decode_file(audio_path)
total_audio_sec = len(audio_info.samples) / (audio_info.sample_rate * audio_info.nchannels)
print(f"Loaded master user voiceover track : {total_audio_sec:.2f} seconds")

# Calculate proportional chapter durations matching the updated 7-chapter timeline
# Chapters 1 to 7 proportions: 25s, 30s, 25s, 25s, 20s, 20s, 20s
reference_durations = [25.0, 30.0, 25.0, 25.0, 20.0, 20.0, 20.0]
ref_total = sum(reference_durations)
scale_factor = total_audio_sec / ref_total

scaled_durations = [round(d * scale_factor, 2) for d in reference_durations]
# Adjust last slide so sum equals total audio duration exactly
scaled_durations[-1] = round(total_audio_sec - sum(scaled_durations[:-1]), 2)

print("\nSynchronized slide timeline:")
curr = 0.0
for i, dur in enumerate(scaled_durations):
    slide_file = os.path.join(slides_dir, f"slide_{i+1}.png")
    print(f"Slide {i+1} : {curr:.2f}s to {curr + dur:.2f}s | Duration : {dur:.2f}s | File : {slide_file}")
    curr += dur

# Create concat demuxer text file for ffmpeg
concat_file = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/temp_voice_chunks/slides_concat.txt")
with open(concat_file, "w", encoding="utf-8") as f:
    for i, dur in enumerate(scaled_durations):
        slide_img = os.path.join(slides_dir, f"slide_{i+1}.png").replace("\\", "/")
        f.write(f"file '{slide_img}'\n")
        f.write(f"duration {dur:.2f}\n")
    # ffmpeg requires the last file to be repeated without duration
    last_slide = os.path.join(slides_dir, f"slide_{len(scaled_durations)}.png").replace("\\", "/")
    f.write(f"file '{last_slide}'\n")

print("\nWrote concat specification to:", concat_file)

# Build MP4 video command using H.264 video and AAC audio at 1080p 30fps
cmd = [
    ffmpeg_path,
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concat_file,
    "-i", audio_path,
    "-c:v", "libx264",
    "-r", "30",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    output_video_path
]

print("\nExecuting ffmpeg to generate QuietCue+ master demo video...")
res = subprocess.run(cmd, capture_output=True, text=True)

if res.returncode == 0:
    print("\nSUCCESS : QuietCue+ demo video created successfully!")
    print("Video path :", output_video_path)
    print("File size :", os.path.getsize(output_video_path), "bytes")
else:
    print("ffmpeg error :", res.stderr)
    sys.exit(1)
