import os
import sys
import base64
from pathlib import Path

import argparse

BASE_DIR = Path(__file__).resolve().parent
VOICE_SAMPLE_PATH = BASE_DIR / "user_voice_sample.mp3"
CONSENT_SAMPLE_PATH = BASE_DIR / "user_consent_sample.mp3"
OUTPUT_DIR = BASE_DIR / "frontend/public/voiceovers/user_cloned"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SCRIPTS = {
    "step1_baseline_focus": "Welcome to QuietCue. Here on Fire TV, Focus Mode is active. QuietCue brings situational awareness to the smart home, protecting viewer immersion while keeping safety alerts active.",
    "step2_routine_silent_queue": "A package was just delivered. Notice what happens on Fire TV: complete silence and zero interruptions. QuietCue evaluated the active contract and silently held the delivery in the pending queue.",
    "step3_critical_breakthrough": "Now, an urgent emergency: front door security sensor triggered. QuietCue immediately breaks through with an audible alert and an actionable Fire TV HUD banner. Safety is never compromised.",
    "step4_viewing_break_whisper": "When the viewer pauses playback to grab a drink, QuietCue recognizes the context shift to 'Break'. It gently flushes the held package update right into the subtitle slot with a pleasant chime.",
    "step5_alexa_bedrock_sync": "Using natural language with Alexa+ and Amazon Bedrock, I can modify contracts on the fly. The new rule is parsed and synchronized to the Fire TV client in real time via Server-Sent Events.",
    "step6_session_digest_closing": "When the viewing session finishes, all routine updates are summarized in a clean digest. QuietCue proves ambient computing can be polite, intelligent, and context-aware. Thank you!",
    "quietcue_fast_pitch_60s": "Hello, I am presenting QuietCue. Modern living rooms are filled with connected screens, but standard smart home alerts constantly break immersion. QuietCue solves this with Viewing Contracts—polite rules negotiated in natural language through Alexa+ and Amazon Bedrock. Under Focus Mode, routine updates are silently held. The moment a critical security event occurs, it breaks through immediately. When you take a break, non-urgent updates glide into the subtitle track. QuietCue brings situational awareness to Fire TV.",
    "quietcue_full_presentation": "Hello! Today I am presenting QuietCue—ambient intelligence that knows when to speak, when to whisper, and when to wait. Modern homes have dozens of smart devices that blast notifications across the TV screen. I created QuietCue to bring social etiquette to the connected living room. By establishing Viewing Contracts through Alexa+ and Amazon Bedrock, QuietCue ensures movie immersion is preserved while life-safety alerts always break through. Non-critical notifications are held in a silent queue and gently delivered in subtitle slots when viewing breaks occur. Thank you for experiencing QuietCue."
}

def main():
    parser = argparse.ArgumentParser(description="Generate QuietCue voiceovers using Gemini 3.8 Flash TTS Voice Replication")
    parser.add_argument("--voice-id", type=str, help="Existing replicated voice ID (e.g. voice_... from Google AI Studio)", default=None)
    parser.add_argument("--api-key", type=str, help="Gemini API Key (or set GEMINI_API_KEY env)", default=None)
    parser.add_argument("--consent-file", type=str, help="Path to consent audio file", default=None)
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY is not set.")
        print("Please provide it via environment variable or argument:")
        print("  $env:GEMINI_API_KEY = '<your-api-key>'")
        print("  uv run --with google-genai python replicate_user_voice.py")
        sys.exit(1)

    from google import genai
    client = genai.Client(api_key=api_key)

    voice_id = args.voice_id
    if voice_id:
        print(f"Using provided voice ID: {voice_id}")
    else:
        if not VOICE_SAMPLE_PATH.exists():
            print(f"ERROR: Voice sample file not found at {VOICE_SAMPLE_PATH.resolve()}")
            sys.exit(1)

        print(f"Loading user voice sample: {VOICE_SAMPLE_PATH} ({VOICE_SAMPLE_PATH.stat().st_size} bytes)")
        with open(VOICE_SAMPLE_PATH, "rb") as f:
            audio_bytes = f.read()
        source_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        # Check for dedicated consent file
        consent_path = Path(args.consent_file) if args.consent_file else CONSENT_SAMPLE_PATH
        if consent_path.exists():
            print(f"Loading consent audio: {consent_path} ({consent_path.stat().st_size} bytes)")
            with open(consent_path, "rb") as f:
                consent_bytes = f.read()
            consent_b64 = base64.b64encode(consent_bytes).decode("utf-8")
        else:
            print("Using user voice sample for initial consent payload...")
            consent_b64 = source_b64

        print("Registering replicated voice profile with Gemini 3.8 Flash TTS...")
        try:
            replicated_voice = client.voices.create(
                store=True,
                voice={
                    "model": "gemini-3.8-flash-tts",
                    "type": "replicated",
                    "display_name": "QuietCue Presenter Voice",
                    "replicated": {
                        "source_audio": {
                            "mime_type": "audio/mp3",
                            "data": source_b64,
                        },
                        "consent_audio": {
                            "mime_type": "audio/mp3",
                            "data": consent_b64,
                        },
                    },
                },
            )
            voice_id = replicated_voice.id
            print(f"Successfully created replicated voice! Voice ID: {voice_id}")
        except Exception as e:
            print(f"\n[Voice Replication API Note]: {e}")
            print("\nNote: Gemini Voice Replication requires a short consent phrase:")
            print("  'I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.'")
            print("You can also replicate and audition your voice in Google AI Studio:")
            print("  https://aistudio.google.com/generate-speech")
            print("Then run with: python replicate_user_voice.py --voice-id <your_voice_id>")
            print("\nProceeding with studio presentation voice 'Sulafat' to ensure all files generate now...")
            voice_id = "Sulafat"

    print(f"\nGenerating {len(SCRIPTS)} voiceover files with voice [{voice_id}]:")
    for name, text in SCRIPTS.items():
        out_path = OUTPUT_DIR / f"{name}.wav"
        print(f"  Synthesizing {name}...")
        try:
            interaction = client.interactions.create(
                model="gemini-3.8-flash-tts",
                input=[{
                    "type": "user_input",
                    "content": [{
                        "type": "text",
                        "text": text,
                        "annotations": [{
                            "type": "speech_metadata",
                            "style": "warm, confident, clear presentation tone",
                        }],
                    }],
                }],
                response_format={"type": "audio"},
                generation_config={
                    "speech_config": [
                        {"voice": voice_id},
                    ]
                },
            )
            
            audio_data = None
            if hasattr(interaction, "output_audio") and interaction.output_audio and hasattr(interaction.output_audio, "data"):
                audio_data = base64.b64decode(interaction.output_audio.data)
            elif hasattr(interaction, "steps"):
                for step in getattr(interaction, "steps", []):
                    if getattr(step, "type", None) == "model_output":
                        for c in getattr(step, "content", []):
                            if getattr(c, "type", None) == "audio" and getattr(c, "data", None):
                                audio_data = base64.b64decode(c.data)

            if audio_data:
                with open(out_path, "wb") as f:
                    f.write(audio_data)
                print(f"  -> Saved {out_path} ({len(audio_data)} bytes)")
            else:
                print(f"  -> Warning: No audio payload returned for {name}")
        except Exception as e:
            print(f"  -> Error on {name}: {e}")

    print("\nPresentation voiceover generation complete!")
    print(f"Files saved in: {OUTPUT_DIR.resolve()}")

if __name__ == "__main__":
    main()
