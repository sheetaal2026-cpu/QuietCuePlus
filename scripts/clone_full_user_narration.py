import os
import sys
import wave
import shutil
import array
import miniaudio
from gradio_client import Client, handle_file

# QuietCue+ Authentic User Voice Cloning Engine
# Clones speaker voice from user_voice_sample.mp3 across all 7 presentation chapters
# Zero round brackets in comments or UI strings

ref_audio_path = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/user_voice_sample.mp3")

chapters = [
    {
        "id": 1,
        "title": "Living Room Harmony & Why QuietCue+ Is Different",
        "sentences": [
            "Smart homes are filled with helpful devices, but notifications remain strictly binary.",
            "You either experience constant interruptions from doorbells, sensors, and deliveries, or you enable do-not-disturb and risk missing a genuine emergency.",
            "To solve this, I created QuietCue+: an intelligent attention shield for Alexa+ and Fire TV that knows when to speak and when to wait."
        ]
    },
    {
        "id": 2,
        "title": "Intent-Driven Smart Contracts via Bedrock",
        "sentences": [
            "What makes QuietCue+ fundamentally different is intent-driven smart contracts.",
            'Instead of clicking through complex settings menus, I simply speak: "Alexa, start Family Time: prioritize critical safety alerts, hold deliveries, and queue routine sensor pings."',
            "Amazon Bedrock immediately compiles that single sentence into a three-tier smart contract on the fly, establishing clear priority rules with zero manual configuration."
        ]
    },
    {
        "id": 3,
        "title": "Fire TV Client : Breakthrough HUD vs Whisper Cues",
        "sentences": [
            "On the Fire TV Client, QuietCue+ replaces intrusive screen takeovers with two distinct visual tiers.",
            "Critical perimeter alarms trigger a high-priority red HUD along the top edge, immediately visible without blocking the screen.",
            "Meanwhile, standard front door deliveries glide in as a quiet whisper cue along the lower border, so you stay informed without breaking your focus."
        ]
    },
    {
        "id": 4,
        "title": "Spatial Guardian & Cross-Device MCP Protocol",
        "sentences": [
            "Another breakthrough is spatial living room safety.",
            "When someone puts on a virtual reality headset, Fire TV becomes an external guardian anchor.",
            "Using the Model Context Protocol TypeScript SDK over HTTP, QuietCue+ renders an active cyan guardian boundary grid.",
            "Urgent alerts break through into spatial vision, while routine chatter stays outside, keeping physical movement safe."
        ]
    },
    {
        "id": 5,
        "title": "Real-Time Voice Typing & Focus Sprint Blocks",
        "sentences": [
            "For everyday ease, I integrated real-time voice typing directly into the television search bar, streaming characters live as I speak.",
            "When I need dedicated quiet time, I can activate fifteen, twenty-five, or fifty-minute focus sprint blocks with one-click on-screen controls."
        ]
    },
    {
        "id": 6,
        "title": "Runtime Translation & Dark Cedar Design",
        "sentences": [
            "QuietCue+ provides dynamic runtime translation across multiple languages directly from the navigation bar.",
            "To reduce visual fatigue, I designed three dedicated interface palettes: Dark Cedar, Warm Dusk, and Clean Daylight, optimized specifically for comfortable living room screen distances."
        ]
    },
    {
        "id": 7,
        "title": "Submission Checklist & Amazon Developer Feedback",
        "sentences": [
            "This working application is open-sourced under the MIT license as my solo project, powered by Amazon Bedrock, Fire TV, and the official MCP TypeScript SDK.",
            "My feedback for the Amazon developer team: reducing JSON schema compilation latency on Bedrock streaming endpoints will make live smart contract synthesis even faster.",
            "QuietCue+ proves our smart displays can be truly context-aware."
        ]
    }
]

def main():
    cache_dir = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/temp_voice_chunks/user_voice_sentences_v2")
    os.makedirs(cache_dir, exist_ok=True)

    print("Connecting to voice cloning service englissi/Voice-Clone-Multilingual...")
    client = Client("englissi/Voice-Clone-Multilingual")
    print("Voice cloning client ready. Using user voice sample:", ref_audio_path)

    all_chapter_data = []

    for ch in chapters:
        ch_id = ch["id"]
        ch_title = ch["title"]
        print(f"\n--- Chapter {ch_id}: {ch_title} ---")
        sentence_files = []

        for s_idx, sent_text in enumerate(ch["sentences"]):
            target_file = os.path.join(cache_dir, f"sent_{ch_id}_{s_idx}.wav")
            if os.path.exists(target_file) and os.path.getsize(target_file) > 10000:
                print(f"Reusing cached user voice sentence {s_idx + 1}/{len(ch['sentences'])}")
                sentence_files.append(target_file)
                continue

            print(f"Synthesizing sentence {s_idx + 1}/{len(ch['sentences'])} in user voice: {sent_text[:45]}...")
            success = False
            for attempt in range(3):
                try:
                    res = client.predict(
                        text=sent_text,
                        speaker_wav=handle_file(ref_audio_path),
                        language="en",
                        api_name="/predict"
                    )
                    shutil.copyfile(res, target_file)
                    sentence_files.append(target_file)
                    print(f"Sentence {s_idx + 1} synthesized successfully.")
                    success = True
                    break
                except Exception as e:
                    print(f"Retry {attempt + 1} after error: {e}")

            if not success:
                print(f"Warning: Failed to clone sentence {s_idx + 1}")

        all_chapter_data.append({
            "id": ch_id,
            "title": ch_title,
            "files": sentence_files
        })

    print("\nAll sentences synthesized in user voice! Assembling master audio track...")
    
    master_samples = array.array("h")
    sample_rate = 24000
    nchannels = 1
    sample_width = 2

    # Measure sample rate from first file
    first_file = all_chapter_data[0]["files"][0]
    first_sound = miniaudio.decode_file(first_file)
    sample_rate = first_sound.sample_rate
    nchannels = first_sound.nchannels
    sample_width = first_sound.sample_width

    sentence_pause_samples = array.array("h", [0] * int(sample_rate * nchannels * 0.45))
    chapter_pause_samples = array.array("h", [0] * int(sample_rate * nchannels * 0.85))

    chapter_timings = []
    current_time_sec = 0.0

    for ch_data in all_chapter_data:
        ch_id = ch_data["id"]
        ch_title = ch_data["title"]
        ch_start = current_time_sec

        for s_idx, fpath in enumerate(ch_data["files"]):
            decoded = miniaudio.decode_file(fpath)
            master_samples.extend(decoded.samples)
            current_time_sec += len(decoded.samples) / (sample_rate * nchannels)

            if s_idx < len(ch_data["files"]) - 1:
                master_samples.extend(sentence_pause_samples)
                current_time_sec += 0.45

        ch_end = current_time_sec
        chapter_timings.append({
            "id": ch_id,
            "title": ch_title,
            "start": round(ch_start, 2),
            "end": round(ch_end, 2),
            "duration": round(ch_end - ch_start, 2)
        })

        if ch_id < len(all_chapter_data):
            master_samples.extend(chapter_pause_samples)
            current_time_sec += 0.85

    out_user_wav = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_user_voiceover.wav")
    out_master_wav = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_demo_master_voiceover.wav")

    for target in [out_user_wav, out_master_wav]:
        with wave.open(target, "wb") as w:
            w.setnchannels(nchannels)
            w.setsampwidth(sample_width)
            w.setframerate(sample_rate)
            w.writeframes(master_samples.tobytes())
        print(f"Saved cloned voice master: {target} | Size: {os.path.getsize(target)} bytes")

    total_sec = current_time_sec
    print(f"\nUser Voice Cloning Complete! Total presentation duration: {total_sec:.1f} seconds.")
    print("\n--- SYNCHRONIZED TIMELINE ---")
    for t in chapter_timings:
        print(f"Slide {t['id']} | {t['start']}s - {t['end']}s | Duration: {t['duration']}s | {t['title']}")

if __name__ == "__main__":
    main()
