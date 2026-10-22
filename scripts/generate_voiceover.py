import os
import sys
import base64

# QuietCue+ Hackathon Video Script Voice Replication Script
# Synthesizes the video script using Gemini 3.8 Flash TTS Voice Replication

sample_path = "frontend/public/user_voice_sample.mp3"
output_path = "frontend/public/quietcue_script_voiceover.wav"

script_text = """When I started thinking about how notifications work on our screens, I noticed a simple problem: they are usually all-or-nothing. Either every small update interrupts you, or you turn on Do Not Disturb and risk missing an emergency. That inspired me to build QuietCue+ for Fire TV and Alexa+. Whether you are working, studying, or watching a movie, it sorts your alerts into what needs attention right now, during a break, or after you are done.

Instead of digging through settings, you just tell Alexa what you are doing, powered by Amazon Bedrock. Here I say: I am starting a movie. Only interrupt me for critical alerts, show packages on a break, and summarize routine updates afterward.

QuietCue+ instantly sets three simple rules:
Priority 1 safety alerts come through right away with two beeps.
Priority 2 package deliveries wait quietly until I pause.
Priority 3 to 5 routine updates are saved for a summary at the end.

I designed this Fire TV simulator with desktop stand legs and a metallic chin, like a screen you would keep on a desk or tabletop.
When an alert comes in, a small bar appears at the top with a soft chime so it never blocks the screen. Right below the video, the playback controls and the three alert rules stay visible so you can easily see what is being held back.

Because you might use this screen for work, study, or entertainment, I added quick voice chips. You can call out a title like Interstellar or trigger a daily routine, and it auto-types live on screen.
For focus sessions, you can start a 15-minute Sprint, 25-minute Pomodoro, or 50-minute Deep Work timer right on the screen with pause and extend buttons.

It also switches instantly between six languages, including Hindi and Japanese. Because QuietCue+ works in any space, the headers use room-neutral phrasing like नवीनतम गतिविधि in Hindi, and Alexa replies naturally with समझ गई!.
Depending on your lighting, you can also switch between Slate, Warm, and a high-contrast Light mode that keeps every card and logo sharp.

Smart technology should adapt to what you are doing, wherever you are. QuietCue+ lets you stay focused or relaxed without missing what matters. It is a smarter notification system that knows when to speak, when to whisper, and when to wait."""

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY is not set.")
        print("Set your key: $env:GEMINI_API_KEY='your-key-here'")
        print("Then execute: uv run --with google-genai python scripts/generate_voiceover.py")
        sys.exit(1)

    from google import genai

    if not os.path.exists(sample_path):
        print(f"Error: Voice sample file not found at {sample_path}")
        sys.exit(1)

    print(f"Loading reference voice audio from {sample_path}...")
    with open(sample_path, "rb") as f:
        source_b64 = base64.b64encode(f.read()).decode("utf-8")

    client = genai.Client(api_key=api_key)

    print("Registering replicated voice profile with Gemini 3.8 Flash TTS...")
    replicated_voice = client.voices.create(
        store=False,
        voice={
            "model": "gemini-3.8-flash-tts",
            "type": "replicated",
            "display_name": "Hackathon Presenter",
            "replicated": {
                "source_audio": {
                    "mime_type": "audio/mp3",
                    "data": source_b64
                },
                "consent_audio": {
                    "mime_type": "audio/mp3",
                    "data": source_b64
                }
            }
        }
    )

    print(f"Replicated Voice ID generated: {replicated_voice.id}")
    print("Synthesizing complete hackathon video script in your replicated voice...")

    interaction = client.interactions.create(
        model="gemini-3.8-flash-tts",
        input=[{
            "type": "user_input",
            "content": [{
                "type": "text",
                "text": script_text,
                "annotations": [{
                    "type": "speech_metadata",
                    "style": "warm, confident, engaging"
                }]
            }]
        }],
        response_format={"type": "audio"},
        generation_config={
            "speech_config": [
                {"voice": replicated_voice.id}
            ]
        }
    )

    audio_bytes = base64.b64decode(interaction.output_audio.data)
    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    print(f"Success! Generated audio file saved to {output_path}")

if __name__ == "__main__":
    main()
