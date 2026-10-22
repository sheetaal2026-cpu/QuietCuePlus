export class SoundManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.7;
  private muted: boolean = false;

  public async init(): Promise<boolean> {
    if (this.audioCtx && this.audioCtx.state === 'running') return true;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API not supported in this browser.");
      }
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
      this.updateGain();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return this.audioCtx.state === 'running';
    } catch (e) {
      console.error("Audio init failed:", e);
      return false;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateGain();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.updateGain();
  }

  private updateGain() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  private playTone(freq: number, type: OscillatorType, startTime: number, duration: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    // Smooth envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + 0.02);
    gain.gain.setValueAtTime(1, startTime + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  public async playCritical(): Promise<boolean> {
    if (!(await this.init())) return false;
    const now = this.audioCtx!.currentTime;
    // Two short beeps: 880Hz, 120ms each, 100ms gap
    this.playTone(880, 'square', now, 0.12);
    this.playTone(880, 'square', now + 0.22, 0.12);
    return true;
  }

  public async playNormal(): Promise<boolean> {
    if (!(await this.init())) return false;
    const now = this.audioCtx!.currentTime;
    // One soft beep: 620Hz, 150ms
    this.playTone(620, 'sine', now, 0.15);
    return true;
  }

  public async playSummary(): Promise<boolean> {
    if (!(await this.init())) return false;
    const now = this.audioCtx!.currentTime;
    // Gentle chime (chord)
    this.playTone(523.25, 'sine', now, 0.3); // C5
    this.playTone(659.25, 'sine', now, 0.3); // E5
    this.playTone(783.99, 'sine', now, 0.3); // G5
    return true;
  }

  public async playAlexaChime(): Promise<boolean> {
    if (!(await this.init())) return false;
    const now = this.audioCtx!.currentTime;
    // Alexa rising double tone (D5 587.33Hz -> A5 880Hz)
    this.playTone(587.33, 'sine', now, 0.16);
    this.playTone(880, 'sine', now + 0.18, 0.28);
    return true;
  }

  public async playTypingKeystroke(): Promise<boolean> {
    if (!(await this.init())) return false;
    const now = this.audioCtx!.currentTime;
    // Soft subtle key-click tone: 1100Hz short tick 18ms
    this.playTone(1100, 'triangle', now, 0.02);
    return true;
  }

  public speakAlexa(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05;
        utter.pitch = 1.08;
        utter.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny') || v.name.includes('Aria')));
        if (englishVoice) utter.voice = englishVoice;
        
        // Timeout ensures cancel finished before speak in Chromium
        setTimeout(() => {
          try {
            window.speechSynthesis.speak(utter);
          } catch (e) {
            console.warn("Speech synthesis speak error:", e);
          }
        }, 60);
      } catch (err) {
        console.warn("Speech synthesis unavailable:", err);
      }
    }
  }

  public playUserVoiceSample(): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        const audio = new Audio('/user_voice_sample.mp3');
        audio.volume = 1.0;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  public whisperDeployBreak(): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance("Deploy successful. Go take a break.");
          utter.rate = 0.88;
          utter.pitch = 0.95;
          utter.volume = 0.55;
          const voices = window.speechSynthesis.getVoices();
          const softVoice = voices.find(v => v.lang.startsWith('en'));
          if (softVoice) utter.voice = softVoice;
          utter.onend = () => resolve();
          utter.onerror = () => resolve();
          window.speechSynthesis.speak(utter);
        } else {
          resolve();
        }
      } catch {
        resolve();
      }
    });
  }
}

export const soundManager = new SoundManager();
