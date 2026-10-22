import os
import asyncio
import wave
import shutil
import array
import miniaudio
import edge_tts

# QuietCue+ Natural Presentation Voiceover Generator
# Voice: en-IN-PrabhatNeural
# Pace: minus 10 percent for calm, articulate presentation cadence
# Zero round brackets in comments or UI strings

chapters = [
    {
        "id": 1,
        "title": "The Inspiration & Attention Gap",
        "text": "When I started thinking about how notifications behave on screens, I recognized a fundamental gap: they are almost always all-or-nothing. Either every minor ping interrupts your train of thought, or silence modes risk missing critical security events. That inspired me to build QuietCue+ for Fire TV and Alexa+. Whether you are engaged in deep work, enjoying entertainment with family, or exploring virtual worlds, QuietCue+ organizes your alerts into what demands immediate attention, what waits for a session break, and what saves for an end-of-day digest."
    },
    {
        "id": 2,
        "title": "Alexa+ Smart Contracts via Bedrock",
        "text": 'Instead of wading through complicated submenus, you simply speak to Alexa+, powered by Amazon Bedrock. Here I say: "Alexa, start Family Time. Only interrupt me for critical safety alerts, hold deliveries until a break, and summarize routine updates afterward." QuietCue+ translates that intent into an active smart contract with three clear policies: Priority 1 safety alerts break through immediately with distinct tones; Priority 2 standard deliveries wait quietly until a break; Priority 3 routine sensor updates queue silently for a summary at the end.'
    },
    {
        "id": 3,
        "title": "Fire TV Client & Lightweight HUD",
        "text": "I engineered this Fire TV Client simulator to show exactly how notifications feel on a television display. When an urgent alert occurs, a lightweight on-screen HUD appears at the top accompanied by a soft alert tone, keeping the main video plane clear. When a delivery arrives, it anchors quietly as a subtle peripheral whisper cue at the bottom edge so you remain uninterrupted."
    },
    {
        "id": 4,
        "title": "VR Immersion & Spatial Guardian Grid",
        "text": "To support modern multi-device living spaces, I built dedicated VR Immersion logic. When someone in the room puts on a spatial headset, Alexa+ and Fire TV transform into an external safety guardian. In VR Immersion mode, Fire TV projects a responsive 360 spatial canvas with an active cyan guardian boundary grid. High priority perimeter alerts break through instantly to safeguard physical movement, while routine household updates anchor to the peripheral edges of the spatial field."
    },
    {
        "id": 5,
        "title": "Voice Calling, Auto-Typing & Focus Timers",
        "text": "QuietCue+ also provides responsive voice typing and focus management. You can call out any title or trigger a daily routine, and Alexa+ auto-types the text live on the television display. For structured productivity sprints, you can launch a 15-minute sprint, 25-minute focus block, or 50-minute deep work session with instant pause and extend controls directly on screen."
    },
    {
        "id": 6,
        "title": "Multilingual Dynamic Translation & Themes",
        "text": "QuietCue+ adapts to global homes with instant translation across six languages, including Hindi and Japanese, accessible through a compact navbar dropdown. Every contract term, notification whisper, and playback status translates dynamically in real time. For optimal visual comfort, you can switch between Dark Cedar, Warm Dusk, and Clean Daylight modes to suit any room lighting."
    },
    {
        "id": 7,
        "title": "Conclusion & Impact",
        "text": "Smart home technology should adapt to your life, not pull you away from it. QuietCue+ gives you the focus you want and the safety you need. It is an intelligent attention guardian that knows when to speak, when to whisper, and when to wait."
    }
]

async def synthesize_all():
    temp_dir = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/temp_voice_chunks/natural_run")
    os.makedirs(temp_dir, exist_ok=True)
    
    chunk_mp3_files = []
    
    print("Synthesizing all 7 script chapters via Edge TTS at calm -10% presentation pace...")
    for ch in chapters:
        ch_id = ch["id"]
        out_mp3 = os.path.join(temp_dir, f"chapter_{ch_id}.mp3")
        print(f"Synthesizing Chapter {ch_id}: {ch['title']}...")
        communicator = edge_tts.Communicate(
            text=ch["text"],
            voice="en-IN-PrabhatNeural",
            rate="-10%",
            pitch="+0Hz"
        )
        await communicator.save(out_mp3)
        chunk_mp3_files.append(out_mp3)
        print(f"Chapter {ch_id} audio chunk ready.")

    print("\nDecoding MP3 chunks and assembling master WAV audio with natural chapter pauses...")
    
    all_pcm_samples = array.array("h")
    sample_rate = 44100
    nchannels = 2
    sample_width = 2
    
    chapter_timings = []
    current_time_sec = 0.0
    
    pause_duration_sec = 0.85
    
    for idx, mp3_file in enumerate(chunk_mp3_files):
        decoded = miniaudio.decode_file(mp3_file)
        sample_rate = decoded.sample_rate
        nchannels = decoded.nchannels
        sample_width = decoded.sample_width
        
        chunk_samples = decoded.samples
        chunk_duration_sec = len(chunk_samples) / (sample_rate * nchannels)
        
        start_sec = current_time_sec
        end_sec = current_time_sec + chunk_duration_sec
        chapter_timings.append({
            "id": idx + 1,
            "title": chapters[idx]["title"],
            "start": round(start_sec, 2),
            "end": round(end_sec, 2),
            "duration": round(chunk_duration_sec, 2)
        })
        
        all_pcm_samples.extend(chunk_samples)
        current_time_sec += chunk_duration_sec
        
        if idx < len(chunk_mp3_files) - 1:
            pause_samples_count = int(sample_rate * nchannels * pause_duration_sec)
            pause_samples = array.array("h", [0] * pause_samples_count)
            all_pcm_samples.extend(pause_samples)
            current_time_sec += pause_duration_sec
            
    total_duration_sec = current_time_sec
    print(f"\nNarration assembly complete! Total presentation duration: {total_duration_sec:.1f} seconds.")
    
    # Target output paths
    out_user_wav = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_user_voiceover.wav")
    out_master_wav = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_demo_master_voiceover.wav")
    
    for target_path in [out_user_wav, out_master_wav]:
        with wave.open(target_path, "wb") as wav_out:
            wav_out.setnchannels(nchannels)
            wav_out.setsampwidth(sample_width)
            wav_out.setframerate(sample_rate)
            wav_out.writeframes(all_pcm_samples.tobytes())
        print(f"Saved master WAV: {target_path} | Size: {os.path.getsize(target_path)} bytes")
        
    print("\n--- CHAPTER TIMELINE & SYNC TARGETS ---")
    for t in chapter_timings:
        print(f"Slide {t['id']} | {t['start']}s - {t['end']}s | Duration: {t['duration']}s | {t['title']}")
        
    return chapter_timings

if __name__ == "__main__":
    asyncio.run(synthesize_all())
