import { useState, useRef, useEffect } from 'react';

interface DemoWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTv?: () => void;
}

interface DemoChapter {
  id: number;
  timeLabel: string;
  startTime: number;
  endTime: number;
  title: string;
  narrative: string;
  visualHighlight: string;
  category: string;
}

export function DemoWalkthroughModal({ isOpen, onClose, onNavigateToTv }: DemoWalkthroughModalProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'video' | 'slides' | 'script'>('video');
  const [voiceSource, setVoiceSource] = useState<'user' | 'studio'>('user');
  const [isFullscreenSlide, setIsFullscreenSlide] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const chapters: DemoChapter[] = [
    {
      id: 1,
      timeLabel: '0:00 - 0:26',
      startTime: 0.0,
      endTime: 25.7,
      title: 'Living Room Harmony & Why QuietCue+ Is Different',
      category: 'Differentiator',
      narrative: 'Smart homes are filled with helpful devices, but notifications remain strictly binary. You either experience constant interruptions from doorbells, sensors, and deliveries, or you enable do-not-disturb and risk missing a genuine emergency. To solve this, I created QuietCue+: an intelligent attention shield for Alexa+ and Fire TV that knows when to speak and when to wait.',
      visualHighlight: 'Master Dashboard status, smart hardware devices list, and active attention rules overview.'
    },
    {
      id: 2,
      timeLabel: '0:26 - 0:57',
      startTime: 25.7,
      endTime: 56.6,
      title: 'Intent-Driven Smart Contracts via Bedrock',
      category: 'Intelligence',
      narrative: 'What makes QuietCue+ fundamentally different is intent-driven smart contracts. Instead of clicking through complex settings menus, I simply speak: "Alexa, start Family Time: prioritize critical safety alerts, hold deliveries, and queue routine sensor pings." Amazon Bedrock immediately compiles that single sentence into a three-tier smart contract on the fly, establishing clear priority rules with zero manual configuration.',
      visualHighlight: 'Real-time Bedrock natural language intent parsing and automatic 3-rule policy activation.'
    },
    {
      id: 3,
      timeLabel: '0:57 - 1:22',
      startTime: 56.6,
      endTime: 82.3,
      title: 'Fire TV Client : Breakthrough HUD vs Whisper Cues',
      category: 'Television Interface',
      narrative: 'On the Fire TV Client, QuietCue+ replaces intrusive screen takeovers with two distinct visual tiers. Critical perimeter alarms trigger a high-priority red HUD along the top edge, immediately visible without blocking the screen. Meanwhile, standard front door deliveries glide in as a quiet whisper cue along the lower border, so you stay informed without breaking your focus.',
      visualHighlight: 'Live television video stream with top priority HUD banner and non-intrusive peripheral whisper cue.'
    },
    {
      id: 4,
      timeLabel: '1:22 - 1:48',
      startTime: 82.3,
      endTime: 108.1,
      title: 'Spatial Guardian & Cross-Device MCP Protocol',
      category: 'Spatial Computing',
      narrative: 'Another breakthrough is spatial living room safety. When someone puts on a virtual reality headset, Fire TV becomes an external guardian anchor. Using the Model Context Protocol TypeScript SDK over HTTP, QuietCue+ renders an active cyan guardian boundary grid. Urgent alerts break through into spatial vision, while routine chatter stays outside, keeping physical movement safe.',
      visualHighlight: '360 degree spatial canvas, glowing cyan guardian boundary grid overlay, and headset telemetry HUD.'
    },
    {
      id: 5,
      timeLabel: '1:48 - 2:09',
      startTime: 108.1,
      endTime: 128.7,
      title: 'Real-Time Voice Typing & Focus Sprint Blocks',
      category: 'Voice Automation',
      narrative: 'For everyday ease, I integrated real-time voice typing directly into the television search bar, streaming characters live as I speak. When I need dedicated quiet time, I can activate fifteen, twenty-five, or fifty-minute focus sprint blocks with one-click on-screen controls.',
      visualHighlight: 'Real-time character-by-character voice typing animation on the television search bar.'
    },
    {
      id: 6,
      timeLabel: '2:09 - 2:29',
      startTime: 128.7,
      endTime: 149.3,
      title: 'Runtime Translation & Dark Cedar Design',
      category: 'Interface Experience',
      narrative: 'QuietCue+ provides dynamic runtime translation across multiple languages directly from the navigation bar. To reduce visual fatigue, I designed three dedicated interface palettes: Dark Cedar, Warm Dusk, and Clean Daylight, optimized specifically for comfortable living room screen distances.',
      visualHighlight: 'Instant runtime translation across multiple languages with seamless theme switching.'
    },
    {
      id: 7,
      timeLabel: '2:29 - 2:50',
      startTime: 149.3,
      endTime: 169.8,
      title: 'Submission Checklist & Amazon Developer Feedback',
      category: 'Submission Impact',
      narrative: 'This working application is open-sourced under the MIT license as my solo project, powered by Amazon Bedrock, Fire TV, and the official MCP TypeScript SDK. My feedback for the Amazon developer team: reducing JSON schema compilation latency on Bedrock streaming endpoints will make live smart contract synthesis even faster. QuietCue+ proves our smart displays can be truly context-aware.',
      visualHighlight: 'Complete ecosystem synchronization across Alexa+, Fire TV, and smart home hardware.'
    }
  ];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setAudioProgress(audio.currentTime / audio.duration);
        const curr = audio.currentTime;
        const targetIndex = chapters.findIndex(c => curr >= c.startTime && curr <= c.endTime);
        if (targetIndex !== -1) {
          setCurrentChapterIndex(targetIndex);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(1);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [chapters]);

  if (!isOpen) return null;

  const audioSrc = voiceSource === 'user' ? '/quietcue_user_voiceover.wav' : '/quietcue_demo_master_voiceover.wav';

  const togglePlayAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const jumpToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = chapters[index].startTime;
      if (!isPlaying) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const nextSlide = () => {
    if (currentChapterIndex < chapters.length - 1) {
      jumpToChapter(currentChapterIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentChapterIndex > 0) {
      jumpToChapter(currentChapterIndex - 1);
    }
  };

  const switchVoiceTrack = (track: 'user' | 'studio') => {
    const wasPlaying = isPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setVoiceSource(track);
    setTimeout(() => {
      if (audioRef.current && wasPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 100);
  };

  const currentChapter = chapters[currentChapterIndex];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(8, 6, 7, 0.95)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreenSlide ? '0' : '16px'
      }}
    >
      <audio ref={audioRef} src={audioSrc} preload="auto" />

      {/* Fullscreen Overlay Mode */}
      {isFullscreenSlide ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: '#0B0708',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 24px'
          }}
        >
          {/* Fullscreen Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎬</span>
              <span style={{ color: '#FB7185', fontWeight: 800, fontSize: '15px' }}>
                QuietCue+ Video Presentation : Slide {currentChapter.id} of {chapters.length}
              </span>
              <span style={{ color: '#E8D5D7', fontSize: '13px' }}>
                {currentChapter.timeLabel} | {currentChapter.title}
              </span>
            </div>
            <button
              onClick={() => setIsFullscreenSlide(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.20)',
                color: '#FFF1F2',
                padding: '6px 16px',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12.5px'
              }}
            >
              ✕ Exit Fullscreen
            </button>
          </div>

          {/* Fullscreen Big Slide Image */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
            <img
              src={`/slides/slide_${currentChapter.id}.png`}
              alt={`Slide ${currentChapter.id}`}
              style={{ maxHeight: '84vh', maxWidth: '96vw', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.90)' }}
            />
          </div>

          {/* Fullscreen Bottom Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={prevSlide}
                disabled={currentChapterIndex === 0}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: currentChapterIndex === 0 ? '#665557' : '#FFF1F2',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: currentChapterIndex === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                ◀ Prev Slide
              </button>
              <button
                onClick={nextSlide}
                disabled={currentChapterIndex === chapters.length - 1}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: currentChapterIndex === chapters.length - 1 ? '#665557' : '#FFF1F2',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: currentChapterIndex === chapters.length - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Next Slide ▶
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={togglePlayAudio}
                style={{
                  background: 'linear-gradient(135deg, #FB7185, #F97316)',
                  border: 'none',
                  color: '#150F10',
                  padding: '8px 20px',
                  borderRadius: '999px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                {isPlaying ? '⏸ Pause Voiceover' : '▶ Play Voiceover'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Regular Expansive Modal View */
        <div
          style={{
            width: '100%',
            maxWidth: '1380px',
            maxHeight: '96vh',
            background: 'linear-gradient(160deg, rgba(36, 26, 28, 0.99) 0%, rgba(22, 15, 17, 0.99) 100%)',
            border: '1px solid rgba(251, 113, 133, 0.35)',
            borderRadius: '24px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.90), 0 0 50px rgba(251, 113, 133, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Top Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 28px',
              borderBottom: '1px solid rgba(251, 113, 133, 0.20)',
              background: 'rgba(20, 14, 15, 0.92)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '24px' }}>🎬</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF1F2', letterSpacing: '-0.01em' }}>
                  QuietCue+ Presentation Slides & Video Walkthrough
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#E8D5D7' }}>
                  Enlarged 1080p Video Screen Showcase with Authentic Voiceover Narration & VR Immersion
                </p>
              </div>
            </div>

            {/* Header Right Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Voice Source Selector */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(0, 0, 0, 0.45)',
                  padding: '3px',
                  borderRadius: '999px',
                  border: '1px solid rgba(251, 113, 133, 0.25)'
                }}
              >
                <button
                  onClick={() => switchVoiceTrack('user')}
                  style={{
                    background: voiceSource === 'user' ? 'linear-gradient(135deg, #FB7185, #F97316)' : 'transparent',
                    border: 'none',
                    color: voiceSource === 'user' ? '#150F10' : '#E8D5D7',
                    borderRadius: '999px',
                    padding: '5px 14px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                  title="Play authentic cloned presenter voice"
                >
                  👤 My Voice [Cloned]
                </button>
                <button
                  onClick={() => switchVoiceTrack('studio')}
                  style={{
                    background: voiceSource === 'studio' ? 'linear-gradient(135deg, #FB7185, #F97316)' : 'transparent',
                    border: 'none',
                    color: voiceSource === 'studio' ? '#150F10' : '#E8D5D7',
                    borderRadius: '999px',
                    padding: '5px 14px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                  title="Play studio narration voice"
                >
                  🎙️ Studio Voice
                </button>
              </div>

              {/* Mode Switcher */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(0, 0, 0, 0.45)',
                  padding: '3px',
                  borderRadius: '999px',
                  border: '1px solid rgba(251, 113, 133, 0.25)'
                }}
              >
                <button
                  onClick={() => {
                    const audio = audioRef.current;
                    if (audio) audio.pause();
                    setIsPlaying(false);
                    setViewMode('video');
                  }}
                  style={{
                    background: viewMode === 'video' ? 'linear-gradient(135deg, #FB7185, #F97316)' : 'transparent',
                    border: 'none',
                    color: viewMode === 'video' ? '#150F10' : '#E8D5D7',
                    borderRadius: '999px',
                    padding: '5px 14px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  🎬 Full Video
                </button>
                <button
                  onClick={() => setViewMode('slides')}
                  style={{
                    background: viewMode === 'slides' ? 'linear-gradient(135deg, #FB7185, #F97316)' : 'transparent',
                    border: 'none',
                    color: viewMode === 'slides' ? '#150F10' : '#E8D5D7',
                    borderRadius: '999px',
                    padding: '5px 14px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  🖼️ Video Slides
                </button>
                <button
                  onClick={() => setViewMode('script')}
                  style={{
                    background: viewMode === 'script' ? 'linear-gradient(135deg, #FB7185, #F97316)' : 'transparent',
                    border: 'none',
                    color: viewMode === 'script' ? '#150F10' : '#E8D5D7',
                    borderRadius: '999px',
                    padding: '5px 14px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  🎙️ Script
                </button>
              </div>

              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsPlaying(false);
                  onClose();
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF1F2',
                  width: '32px',
                  height: '32px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chapter Tabs Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 28px',
              background: 'rgba(15, 10, 11, 0.75)',
              overflowX: 'auto',
              borderBottom: '1px solid rgba(251, 113, 133, 0.12)'
            }}
          >
            {chapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => jumpToChapter(idx)}
                style={{
                  background: currentChapterIndex === idx ? 'linear-gradient(135deg, #FB7185, #F97316)' : 'rgba(255, 255, 255, 0.05)',
                  border: currentChapterIndex === idx ? '1px solid #FDA4AF' : '1px solid rgba(255, 255, 255, 0.10)',
                  color: currentChapterIndex === idx ? '#150F10' : '#E8D5D7',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease'
                }}
              >
                Slide {ch.id} : {ch.category}
              </button>
            ))}
          </div>

          {/* Central Content Area */}
          <div style={{ padding: '16px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {viewMode === 'video' ? (
              /* Curated Full MP4 Video View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/9',
                    maxHeight: '620px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(251, 113, 133, 0.40)',
                    background: '#0B0708',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.90)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <video
                    src="/quietcue_demo_video.mp4"
                    controls
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#FDA4AF', fontWeight: 600 }}>
                      QuietCue+ Curated Demo Video : Under 3 Minutes [2:42] | 1080p Master | Cloned Presenter Voice
                    </span>
                  </div>
                  <a
                    href="/quietcue_demo_video.mp4"
                    download="QuietCue_Demo_Video_Under_3_Minutes.mp4"
                    style={{
                      background: 'linear-gradient(135deg, #FB7185, #F97316)',
                      border: 'none',
                      color: '#150F10',
                      padding: '7px 20px',
                      borderRadius: '999px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>⬇️</span>
                    <span>Download MP4 Video</span>
                  </a>
                </div>
              </div>
            ) : viewMode === 'slides' ? (
              /* Video Slides View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Enlarged Slide Image Container */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/9',
                    maxHeight: '620px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(251, 113, 133, 0.35)',
                    background: '#1C1516',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={`/slides/slide_${currentChapter.id}.png`}
                    alt={`QuietCue+ Slide ${currentChapter.id} : ${currentChapter.title}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />

                  {/* Floating Chapter Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '14px',
                      left: '14px',
                      background: 'rgba(28, 21, 22, 0.90)',
                      border: '1px solid rgba(251, 113, 133, 0.45)',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#FB7185',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    SLIDE {currentChapter.id} OF 7 : {currentChapter.timeLabel}
                  </div>

                  {/* Fullscreen Expansion Button */}
                  <button
                    onClick={() => setIsFullscreenSlide(true)}
                    style={{
                      position: 'absolute',
                      bottom: '14px',
                      right: '14px',
                      background: 'rgba(20, 14, 15, 0.90)',
                      border: '1px solid rgba(251, 113, 133, 0.45)',
                      color: '#FFF1F2',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>⛶</span>
                    <span>Fullscreen</span>
                  </button>
                </div>

                {/* Slide Controls Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'rgba(20, 14, 15, 0.85)',
                    border: '1px solid rgba(251, 113, 133, 0.20)',
                    padding: '10px 18px',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={prevSlide}
                      disabled={currentChapterIndex === 0}
                      style={{
                        background: currentChapterIndex === 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: currentChapterIndex === 0 ? '#665557' : '#FFF1F2',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: currentChapterIndex === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ◀ Prev Slide
                    </button>

                    <button
                      onClick={nextSlide}
                      disabled={currentChapterIndex === chapters.length - 1}
                      style={{
                        background: currentChapterIndex === chapters.length - 1 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: currentChapterIndex === chapters.length - 1 ? '#665557' : '#FFF1F2',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: currentChapterIndex === chapters.length - 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next Slide ▶
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={`/slides/slide_${currentChapter.id}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.16)',
                        color: '#FFF1F2',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>🔍</span>
                      <span>Open 1080p Image</span>
                    </a>

                    <a
                      href={`/slides/slide_${currentChapter.id}.png`}
                      download={`quietcue_slide_${currentChapter.id}.png`}
                      style={{
                        background: 'linear-gradient(135deg, #FB7185, #F97316)',
                        border: 'none',
                        color: '#150F10',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>📥</span>
                      <span>Download Slide</span>
                    </a>

                    {currentChapter.id === 4 && onNavigateToTv && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToTv();
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #0284C7, #00D2FF)',
                          border: 'none',
                          color: '#FFFFFF',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span>🥽</span>
                        <span>Launch VR HUD</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Script & Teleprompter View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    background: 'rgba(251, 113, 133, 0.08)',
                    border: '1px solid rgba(251, 113, 133, 0.25)',
                    borderRadius: '14px',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#FB7185', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Chapter {currentChapter.id} of {chapters.length} : {currentChapter.timeLabel}
                    </div>
                    <h4 style={{ margin: '3px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#FFF1F2' }}>
                      {currentChapter.title}
                    </h4>
                  </div>

                  {currentChapter.id === 4 && onNavigateToTv && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToTv();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #0284C7, #00D2FF)',
                        border: 'none',
                        color: '#FFFFFF',
                        padding: '7px 14px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>🥽</span>
                      <span>Open VR Simulator</span>
                    </button>
                  )}
                </div>

                {/* Teleprompter Subtitle Box */}
                <div
                  style={{
                    background: 'rgba(12, 8, 9, 0.85)',
                    border: '1px solid rgba(251, 113, 133, 0.20)',
                    borderRadius: '14px',
                    padding: '18px 24px',
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#B59FA2', marginBottom: '6px', fontWeight: 700 }}>
                    SPOKEN PRESENTATION SCRIPT [PRESENTED IN YOUR AUTHENTIC VOICE] :
                  </div>
                  <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.65', color: '#FFF1F2', fontWeight: 500 }}>
                    "{currentChapter.narrative}"
                  </p>
                </div>

                {/* Visual Staging Notes */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    color: '#E8D5D7'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>👁️</span>
                  <div>
                    <strong style={{ color: '#FB7185' }}>Visual Action on Screen: </strong>
                    <span>{currentChapter.visualHighlight}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Playback Controls & Progress Bar */}
          <div
            style={{
              background: 'rgba(18, 12, 13, 0.95)',
              borderTop: '1px solid rgba(251, 113, 133, 0.20)',
              padding: '14px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={togglePlayAudio}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '999px',
                  background: isPlaying ? 'linear-gradient(135deg, #E11D48, #F43F5E)' : 'linear-gradient(135deg, #FB7185, #F97316)',
                  border: 'none',
                  color: '#150F10',
                  fontSize: '16px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(251, 113, 133, 0.40)',
                  transition: 'all 0.18s ease'
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFF1F2' }}>
                  {isPlaying
                    ? `Playing ${voiceSource === 'user' ? 'Authentic Cloned Voice' : 'Studio Voice'}`
                    : `${voiceSource === 'user' ? 'Authentic Cloned Voice' : 'Studio Voice'} Ready`}
                </div>
                <div style={{ fontSize: '11px', color: '#B59FA2' }}>
                  {voiceSource === 'user' ? 'Zero-Shot Voice Cloned Track' : 'Studio Narration Voiceover'}
                </div>
              </div>
            </div>

            {/* Scrubbing timeline */}
            <div style={{ flex: 1, maxWidth: '380px' }}>
              <div
                style={{
                  width: '100%',
                  height: '5px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: `${audioProgress * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #FB7185, #F97316)',
                    borderRadius: '999px',
                    transition: 'width 0.15s linear'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', color: '#B59FA2' }}>
                <span>0:00</span>
                <span>Slide {currentChapter.id} / 7</span>
                <span>2:45</span>
              </div>
            </div>

            {/* Quick Record Tip */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11.5px', color: '#FB7185', fontWeight: 800 }}>
                Enlarged Slides Ready For Demo Video
              </div>
              <div style={{ fontSize: '11px', color: '#E8D5D7' }}>
                Click Fullscreen or Download Slide
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
