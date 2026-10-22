import os
import sys

# ElevenLabs Instant Voice Cloning Script for QuietCue+ Video Script

sample_path = "frontend/public/user_voice_sample.mp3"
output_path = "frontend/public/quietcue_script_voiceover.mp3"

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
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("ELEVENLABS_API_KEY is not set.")
        print("Set your key: $env:ELEVENLABS_API_KEY='your-key-here'")
        print("Then execute: uv run --with elevenlabs python scripts/generate_voiceover_elevenlabs.py")
        sys.exit(1)

    from elevenlabs.client import ElevenLabs

    if not os.path.exists(sample_path):
        print(f"Error: Voice sample file not found at {sample_path}")
        sys.exit(1)

    client = ElevenLabs(api_key=api_key)
    print("Uploading voice sample and creating instant voice clone...")
    
    with open(sample_path, "rb") as f:
        voice = client.clone(
            name="QuietCue Presenter",
            files=[sample_path],
            description="Hackathon presenter voice"
        )

    print(f"Voice clone ready with ID: {voice.voice_id}")
    print("Generating speech audio for full video script...")

    audio = client.generate(
        text=script_text,
        voice=voice,
        model="eleven_multilingual_v2"
    )

    with open(output_path, "wb") as f:
        for chunk in audio:
            f.write(chunk)

    print(f"Success! Audio saved to {output_path}")

if __name__ == "__main__":
    main()
