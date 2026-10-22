import os
import sys
import wave
import shutil
from gradio_client import Client, handle_file

ref_audio_path = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/user_voice_sample.mp3")
ref_text = "Code an Alexa+ rule for my Fire TV: While I am coding from home, keep the screen quiet, but the moment my code deploys to production, whisper: go take a break. Can you build that? And also state the model catalog, deployment configuration, agent registry, tools registry, RAG or knowledge bases, data foundation, evaluation, observability, security and governance pipelines for this project."

chapters = [
    {
        "id": 1,
        "parts": [
            "When I started thinking about how notifications behave on screens, I recognized a fundamental gap: they are almost always all-or-nothing. Either every minor ping interrupts your train of thought, or silence modes risk missing critical security events.",
            "That inspired me to build QuietCue+ for Fire TV and Alexa+. Whether you are engaged in deep work, enjoying entertainment with family, or exploring virtual worlds, QuietCue+ organizes your alerts into what demands immediate attention, what waits for a session break, and what saves for an end-of-day digest."
        ]
    },
    {
        "id": 2,
        "parts": [
            "Instead of wading through complicated submenus, you simply speak to Alexa+, powered by Amazon Bedrock. Here I say: Alexa, start Family Time. Only interrupt me for critical safety alerts, hold deliveries until a break, and summarize routine updates afterward.",
            "QuietCue+ translates that intent into an active smart contract with three clear policies: Priority 1 safety alerts break through immediately with distinct tones; Priority 2 standard deliveries wait quietly until a break; Priority 3 routine sensor updates queue silently for a summary at the end."
        ]
    },
    {
        "id": 3,
        "parts": [
            "I engineered this Fire TV Client simulator to show exactly how notifications feel on a television display.",
            "When an urgent alert occurs, a lightweight on-screen HUD appears at the top accompanied by a soft alert tone, keeping the main video plane clear. When a delivery arrives, it anchors quietly as a subtle peripheral whisper cue at the bottom edge so you remain uninterrupted."
        ]
    },
    {
        "id": 4,
        "parts": [
            "To support modern multi-device living spaces, I built dedicated VR Immersion logic. When someone in the room puts on a spatial headset, Alexa+ and Fire TV transform into an external safety guardian.",
            "In VR Immersion mode, Fire TV projects a responsive 360 spatial canvas with an active cyan guardian boundary grid. High priority perimeter alerts break through instantly to safeguard physical movement, while routine household updates anchor to the peripheral edges of the spatial field."
        ]
    },
    {
        "id": 5,
        "parts": [
            "QuietCue+ also provides responsive voice typing and focus management. You can call out any title or trigger a daily routine, and Alexa+ auto-types the text live on the television display.",
            "For structured productivity sprints, you can launch a 15-minute sprint, 25-minute focus block, or 50-minute deep work session with instant pause and extend controls directly on screen."
        ]
    },
    {
        "id": 6,
        "parts": [
            "QuietCue+ adapts to global homes with instant translation across six languages, including Hindi and Japanese, accessible through a compact navbar dropdown. Every contract term, notification whisper, and playback status translates dynamically in real time.",
            "For optimal visual comfort, you can switch between Dark Cedar, Warm Dusk, and Clean Daylight modes to suit any room lighting."
        ]
    },
    {
        "id": 7,
        "parts": [
            "Smart home technology should adapt to your life, not pull you away from it. QuietCue+ gives you the focus you want and the safety you need.",
            "It is an intelligent attention guardian that knows when to speak, when to whisper, and when to wait."
        ]
    }
]

def concat_wavs(wav_files, out_path, pause_sec=0.45):
    data = []
    params = None
    for idx, f in enumerate(wav_files):
        with wave.open(f, "rb") as w:
            if params is None:
                params = w.getparams()
            frames = w.readframes(w.getnframes())
            data.append(frames)
            # Add subtle pause between sentences
            if idx < len(wav_files) - 1:
                silence_frames = int(params.framerate * pause_sec) * params.nchannels * params.sampwidth
                data.append(b"\x00" * silence_frames)
                
    with wave.open(out_path, "wb") as out:
        out.setparams(params)
        for d in data:
            out.writeframes(d)

def main():
    print("Connecting to E2-F5-TTS Zero-Shot Voice Cloning API...")
    client = Client("mrfakename/E2-F5-TTS")
    
    temp_dir = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/temp_voice_chunks/user_voice")
    os.makedirs(temp_dir, exist_ok=True)
    
    all_chunk_files = []
    
    print(f"Cloning voice using reference sample: {ref_audio_path}")
    print(f"Total chapters: {len(chapters)}")
    
    for ch in chapters:
        ch_id = ch["id"]
        for p_idx, part_text in enumerate(ch["parts"]):
            chunk_file = os.path.join(temp_dir, f"ch_{ch_id}_part_{p_idx}.wav")
            print(f"Synthesizing Chapter {ch_id} Part {p_idx + 1} in your authentic cloned voice...")
            try:
                res = client.predict(
                    ref_audio=handle_file(ref_audio_path),
                    ref_text=ref_text,
                    gen_text=part_text,
                    remove_silence=True,
                    api_name="/predict"
                )
                shutil.copyfile(res, chunk_file)
                all_chunk_files.append(chunk_file)
                print(f"Chapter {ch_id} Part {p_idx + 1} synthesized successfully.")
            except Exception as e:
                print(f"Error on Chapter {ch_id} Part {p_idx + 1}: {e}")
                
    if not all_chunk_files:
        print("Error: No audio chunks were generated.")
        sys.exit(1)
        
    out_master = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_user_voiceover.wav")
    out_demo = os.path.abspath("c:/Users/sheet/Documents/AIDetector/QuietCue/frontend/public/quietcue_demo_master_voiceover.wav")
    
    print("Concatenating all chapter chunks into master cloned voiceover track...")
    concat_wavs(all_chunk_files, out_master, pause_sec=0.5)
    shutil.copyfile(out_master, out_demo)
    
    with wave.open(out_master, "rb") as w:
        duration = w.getnframes() / float(w.getframerate())
        
    print(f"Authentic Cloned Voice Track Complete! Duration: {duration:.1f} seconds.")
    print(f"Saved to: {out_master}")
    print(f"Also synchronized to: {out_demo}")

if __name__ == "__main__":
    main()
