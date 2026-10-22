import os
import sys
import wave
import shutil
from gradio_client import Client, handle_file

# Zero-Shot Voice Cloning Pipeline using F5-TTS Flow Matching
# Clones the authentic reference voice sample into full presentation audio

ref_audio_path = os.path.abspath("frontend/public/user_voice_sample.mp3")
ref_text = "Code an Alexa+ rule for my Fire TV: While I am coding from home, keep the screen quiet, but the moment my code deploys to production, whisper: go take a break. Can you build that? And also state the model catalog, deployment configuration, agent registry, tools registry, RAG or knowledge bases, data foundation, evaluation, observability, security and governance pipelines for this project."

sections = [
    "When I started thinking about how notifications work on our screens, I noticed a simple problem: they are usually all-or-nothing. Either every small update interrupts you, or you turn on Do Not Disturb and risk missing an emergency.",
    "That inspired me to build QuietCue+ for Fire TV and Alexa+. Whether you are working, studying, or watching a movie, it sorts your alerts into what needs attention right now, during a break, or after you are done.",
    "Instead of digging through settings, you just tell Alexa what you are doing, powered by Amazon Bedrock. Here I say: I am starting a movie. Only interrupt me for critical alerts, show packages on a break, and summarize routine updates afterward.",
    "QuietCue+ instantly sets three simple rules: Priority 1 safety alerts come through right away with two beeps. Priority 2 package deliveries wait quietly until I pause. Priority 3 to 5 routine updates are saved for a summary at the end.",
    "I designed this Fire TV simulator with desktop stand legs and a metallic chin, like a screen you would keep on a desk or tabletop. When an alert comes in, a small bar appears at the top with a soft chime so it never blocks the screen.",
    "Right below the video, the playback controls and the three alert rules stay visible so you can easily see what is being held back.",
    "Because you might use this screen for work, study, or entertainment, I added quick voice chips. You can call out a title like Interstellar or trigger a daily routine, and it auto-types live on screen.",
    "For focus sessions, you can start a 15-minute Sprint, 25-minute Pomodoro, or 50-minute Deep Work timer right on the screen with pause and extend buttons.",
    "It also switches instantly between six languages, including Hindi and Japanese. Because QuietCue+ works in any space, the headers use room-neutral phrasing like नवीनतम गतिविधि in Hindi, and Alexa replies naturally with समझ गई!.",
    "Depending on your lighting, you can also switch between Slate, Warm, and a high-contrast Light mode that keeps every card and logo sharp.",
    "Smart technology should adapt to what you are doing, wherever you are. QuietCue+ lets you stay focused or relaxed without missing what matters. It is a smarter notification system that knows when to speak, when to whisper, and when to wait."
]

def concat_wavs(wav_files, out_path):
    data = []
    params = None
    for f in wav_files:
        with wave.open(f, "rb") as w:
            if params is None:
                params = w.getparams()
            data.append(w.readframes(w.getnframes()))
    with wave.open(out_path, "wb") as out:
        out.setparams(params)
        for d in data:
            out.writeframes(d)

def main():
    print("Initializing F5-TTS Zero-Shot Voice Cloning client...")
    client = Client("mrfakename/E2-F5-TTS")
    
    generated_chunks = []
    temp_dir = os.path.abspath("temp_voice_chunks")
    os.makedirs(temp_dir, exist_ok=True)

    print(f"Cloning speaker voice from: {ref_audio_path}")
    print(f"Total script sections to synthesize: {len(sections)}")

    for idx, text in enumerate(sections):
        print(f"Synthesizing section {idx + 1} of {len(sections)} in your cloned voice...")
        try:
            chunk_path = client.predict(
                ref_audio=handle_file(ref_audio_path),
                ref_text=ref_text,
                gen_text=text,
                remove_silence=True,
                api_name="/predict"
            )
            saved_chunk = os.path.join(temp_dir, f"chunk_{idx}.wav")
            shutil.copyfile(chunk_path, saved_chunk)
            generated_chunks.append(saved_chunk)
            print(f"Section {idx + 1} complete.")
        except Exception as e:
            print(f"Error synthesizing section {idx + 1}: {e}")

    if not generated_chunks:
        print("Error: No audio chunks were generated.")
        sys.exit(1)

    output_wav = os.path.abspath("frontend/public/quietcue_cloned_voiceover.wav")
    root_wav = os.path.abspath("../quietcue_cloned_voiceover.wav")
    
    print(f"Concatenating all {len(generated_chunks)} sections into master audio...")
    concat_wavs(generated_chunks, output_wav)
    try:
        shutil.copyfile(output_wav, root_wav)
    except Exception:
        pass

    print(f"Voice Cloning Successful! Saved master file to: {output_wav}")

if __name__ == "__main__":
    main()
