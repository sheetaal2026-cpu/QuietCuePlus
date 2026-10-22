import { useState, useEffect, useCallback, useRef } from 'react';
import { soundManager } from './soundManager';
import { getMediaForMode, getMediaForMovieSearch } from './mediaConfig';
import { VoiceTypingOverlay } from './VoiceTypingOverlay';
import { SUPPORTED_LANGUAGES, SupportedLanguage, translateUI, translateTextOnline, formatContractName, formatViewerState, formatLastSyncEvent } from './translations';

interface TvClientProps {
  onExitTvMode?: () => void;
  currentLang?: SupportedLanguage;
  onSelectLanguage?: (lang: SupportedLanguage) => void;
}

export function TvClient({ onExitTvMode, currentLang: propLang, onSelectLanguage: propSelectLang }: TvClientProps) {
  const [contract, setContract] = useState<any>({
    contractId: 'contract-focus-mode',
    name: 'Focus Mode',
    activityType: 'movie',
    status: 'active',
    rules: [
      { eventCategory: 'security', handlingPolicy: 'interrupt_now', priority: 1 },
      { eventCategory: 'package', handlingPolicy: 'next_break', priority: 2 },
      { eventCategory: 'thermostat', handlingPolicy: 'summarize_later', priority: 3 },
      { eventCategory: 'light', handlingPolicy: 'summarize_later', priority: 4 },
      { eventCategory: 'device_unavailable', handlingPolicy: 'next_break', priority: 5 }
    ]
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [viewerState, setViewerState] = useState<'Watching' | 'Paused' | 'Break' | 'Summary'>('Watching');
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [lastSyncEvent, setLastSyncEvent] = useState<string>('Connected & Ready');
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(0);


  // Cross-tab storage listener for immediate language sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quietcue_lang' && e.newValue) {
        setInternalLang(e.newValue as SupportedLanguage);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // quietcue_lang_storage_tv

  // Online Language State for Fire TV Client
  const [internalLang, setInternalLang] = useState<SupportedLanguage>(() => {
    return propLang || (localStorage.getItem('quietcue_lang') as SupportedLanguage) || 'en';
  });
  const currentLang = propLang || internalLang;
  const setCurrentLang = (lang: SupportedLanguage) => {
    setInternalLang(lang);
    if (propSelectLang) propSelectLang(lang);
  };

  // Multi-modal overlays on Fire TV
  const [criticalHud, setCriticalHud] = useState<{ id?: string; title: string; message: string; source: string; time: string } | null>(null);
  const [subtitleWhisper, setSubtitleWhisper] = useState<{ text: string; category: string } | null>(null);
  const [translatedWhisper, setTranslatedWhisper] = useState<string>('');
  const [translatedHud, setTranslatedHud] = useState<{ title: string; message: string }>({ title: '', message: '' });
  const [focusedBtnIndex, setFocusedBtnIndex] = useState<number>(0);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Translate subtitle whisper online whenever text or language changes
  useEffect(() => {
    if (!subtitleWhisper) {
      setTranslatedWhisper('');
      return;
    }
    let cancelled = false;
    translateTextOnline(subtitleWhisper.text, currentLang).then(clean => {
      if (!cancelled) setTranslatedWhisper(clean.replace(/[()]/g, ''));
    });
    return () => { cancelled = true; };
  }, [subtitleWhisper?.text, currentLang]);

  // Translate critical HUD alert online whenever alert or language changes
  useEffect(() => {
    if (!criticalHud) {
      setTranslatedHud({ title: '', message: '' });
      return;
    }
    let cancelled = false;
    Promise.all([
      translateTextOnline(criticalHud.title, currentLang),
      translateTextOnline(criticalHud.message, currentLang)
    ]).then(([tTitle, tMsg]) => {
      if (!cancelled) {
        setTranslatedHud({
          title: tTitle.replace(/[()]/g, ''),
          message: tMsg.replace(/[()]/g, '')
        });
      }
    });
    return () => { cancelled = true; };
  }, [criticalHud?.title, criticalHud?.message, currentLang]);

  const handleSelectLanguage = async (lang: SupportedLanguage) => {
    if (propSelectLang) {
      propSelectLang(lang);
    }
    setInternalLang(lang);
    localStorage.setItem('quietcue_lang', lang);
    try {
      await fetch('http://localhost:3001/api/action/set-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      });
    } catch {}
  };

  // Alexa Movie Voice Typing state on Fire TV
  const [voiceTypingState, setVoiceTypingState] = useState<{
    active: boolean;
    targetMovie: string;
    typedText: string;
    isMatched: boolean;
    statusText?: string;
  }>({
    active: false,
    targetMovie: '',
    typedText: '',
    isMatched: false
  });
  const typingTimerRef = useRef<any>(null);
  const [modeTimer, setModeTimer] = useState<any>(null);
  const [activeTvTab, setActiveTvTab] = useState<'Home' | 'Find' | 'Live'>('Home');

  const formatTimerSeconds = (sec: number) => {
    if (sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!modeTimer || !modeTimer.isRunning) return;
    const interval = setInterval(() => {
      setModeTimer((prev: any) => {
        if (!prev || !prev.isRunning) return prev;
        if (prev.remainingSeconds <= 1) {
          return { ...prev, remainingSeconds: 0, isRunning: false };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [modeTimer?.isRunning]);

  const isPlaying = viewerState === 'Watching';
  const activeMedia = getMediaForMode(contract?.name, contract?.activityType);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, activeMedia.video]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getCategoryIcon = (category: string, title: string = '') => {
    const lower = title.toLowerCase();
    if (lower.includes('dad')) return '👨‍👧‍👦';
    if (lower.includes('birthday') || lower.includes('mom')) return '🎂';
    switch (category) {
      case 'security': return '🚨';
      case 'package': return '📦';
      case 'health': return '💧';
      case 'calendar': return '📅';
      case 'thermostat': return '🌡️';
      case 'light': return '💡';
      case 'timer': return '⏱️';
      case 'device_unavailable': return '⚠️';
      default: return '⚙️';
    }
  };

  const runTvVoiceTypingAnimation = async (movie: string) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    await soundManager.init();
    await soundManager.playAlexaChime();
    soundManager.speakAlexa(`Playing ${movie} on Fire TV.`);

    setVoiceTypingState({
      active: true,
      targetMovie: movie,
      typedText: '',
      isMatched: false,
      statusText: 'Listening & Typing...'
    });

    let index = 0;
    typingTimerRef.current = setInterval(() => {
      index++;
      if (index <= movie.length) {
        setVoiceTypingState(prev => ({
          ...prev,
          typedText: movie.slice(0, index)
        }));
        soundManager.playTypingKeystroke().catch(() => {});
      } else {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;

        const mediaMatch = getMediaForMovieSearch(movie);
        setVoiceTypingState(prev => ({
          ...prev,
          isMatched: true,
          statusText: `Matched: ${mediaMatch.title}`
        }));

        setContract((prev: any) => ({
          ...prev,
          name: mediaMatch.matchedMode.name,
          activityType: mediaMatch.matchedMode.activityType
        }));
        setViewerState('Watching');
        videoRef.current?.play().catch(() => {});

        setTimeout(() => {
          setVoiceTypingState(prev => ({ ...prev, active: false }));
        }, 3600);
      }
    }, 65);
  };

  const fetchBackendState = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data.activeContract) setContract(data.activeContract);
        if (data.notifications) setNotifications(data.notifications);
        if (data.viewerState) setViewerState(data.viewerState);
        if (data.modeTimer !== undefined) setModeTimer(data.modeTimer);
        if (data.currentLanguage) setCurrentLang(data.currentLanguage);
      }
    } catch {
      // Offline resilient fallback: continue operating with local state
    }
  }, []);

  // Connect to Real-Time Cross-Device SSE Stream (/api/events) with automatic fallback
  useEffect(() => {
    fetchBackendState();

    let es: EventSource | null = null;
    let reconnectTimer: any = null;

    const connectSse = () => {
      try {
        es = new EventSource('http://localhost:3001/api/events');

        es.onopen = () => {
          setSseConnected(true);
        };

        es.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            setSseConnected(true);

            if (msg.type === 'state_sync') {
              if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
              if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
              if (msg.payload?.viewerState) setViewerState(msg.payload.viewerState);
              if (msg.payload?.currentLanguage) setCurrentLang(msg.payload.currentLanguage);
            } else if (msg.type === 'language_changed') {
              if (msg.payload?.language) {
                setCurrentLang(msg.payload.language);
                localStorage.setItem('quietcue_lang', msg.payload.language);
              }
            } else if (msg.type === 'event_simulated') {
              const rec = msg.payload?.record;
              if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
              fetchBackendState();

              if (rec) {
                setLastSyncEvent(`Live Event: ${rec.event.title} - ${rec.appliedRule}`);
                if (rec.appliedRule === 'interrupt_now') {
                  await soundManager.init();
                  await soundManager.playCritical();
                  setCriticalHud({
                    id: rec.id,
                    title: rec.event.title,
                    message: rec.event.message,
                    source: rec.event.sourceDevice,
                    time: rec.handledAt || 'Just now'
                  });
                } else if (rec.appliedRule === 'next_break') {
                  setSubtitleWhisper({
                    text: `🔇 Queued for Next Break: ${rec.event.title} | "${rec.event.message}"`,
                    category: rec.event.category
                  });
                } else {
                  setSubtitleWhisper({
                    text: `💧 Saved to Session Digest: ${rec.event.title}`,
                    category: rec.event.category
                  });
                }
              }
            } else if (msg.type === 'break_triggered') {
              setViewerState('Break');
              if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
              if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
              const count = msg.payload?.releasedNotifications?.length || 0;
              const releasedList = msg.payload?.releasedNotifications || [];
              const specialItem = releasedList.find((r: any) => r.event?.category === 'health' || r.event?.category === 'calendar');
              setLastSyncEvent(`Break Triggered - ${msg.payload?.condition || 'break'} | ${count} released`);
              if (specialItem) {
                const titleLower = specialItem.event?.title?.toLowerCase() || '';
                const icon = specialItem.event?.category === 'health'
                  ? '💧'
                  : titleLower.includes('dad')
                    ? '👨‍👧‍👦'
                    : titleLower.includes('birthday') || titleLower.includes('mom')
                      ? '🎂'
                      : '📅';
                setSubtitleWhisper({
                  text: `${icon} ${specialItem.event.title}: "${specialItem.event.message}"`,
                  category: specialItem.event.category
                });
              } else {
                setSubtitleWhisper({
                  text: `☕ Session Break: Released ${count} queued updates to screen`,
                  category: 'package'
                });
              }
              await soundManager.init();
              await soundManager.playNormal();
            } else if (msg.type === 'viewer_state_changed') {
              if (msg.payload?.viewerState) setViewerState(msg.payload.viewerState);
              if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
              setLastSyncEvent(`Viewer State -> ${msg.payload?.viewerState}`);
            } else if (msg.type === 'rule_updated' || msg.type === 'contract_updated') {
              if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
              const cName = msg.payload?.activeContract?.name || 'Active Rules Synced';
              const cleanCName = cName.replace(/Movie Night/gi, 'Feature Night');
              setLastSyncEvent(`Playbook Synced: ${cleanCName}`);
              setSubtitleWhisper({
                text: `✦ Playbook Updated: ${cleanCName}`,
                category: 'system'
              });
            } else if (msg.type === 'notification_released') {
              const notif = msg.payload?.notification;
              if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
              if (notif) {
                await soundManager.init();
                await soundManager.playNormal();
                setCriticalHud({
                  id: notif.id,
                  title: notif.event.title,
                  message: notif.event.message,
                  source: notif.event.sourceDevice,
                  time: notif.handledAt || 'Released Now'
                });
              }
            } else if (msg.type === 'notification_dismissed') {
              if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
              setCriticalHud(null);
            } else if (msg.type === 'session_ended') {
              setViewerState('Summary');
              if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
              if (msg.payload?.contract) setContract(msg.payload.contract);
              setLastSyncEvent('Session Completed | Digest Ready');
              await soundManager.init();
              await soundManager.playSummary();
            } else if (msg.type === 'demo_reset') {
              setViewerState('Watching');
              if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
              if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
              setCriticalHud(null);
              setLastSyncEvent('Demo Reset to Defaults');
            } else if (msg.type === 'alexa_voice_search') {
              const movie = msg.payload?.movie || 'Feature Presentation';
              setLastSyncEvent(`Alexa Voice Search: "${movie}"`);
              runTvVoiceTypingAnimation(movie);
            } else if (msg.type === 'timer_updated') {
              setModeTimer(msg.payload?.timer || null);
            } else if (msg.type === 'timer_cancelled') {
              setModeTimer(null);
            } else if (msg.type === 'timer_completed') {
              setModeTimer(null);
              setViewerState('Break');
              setSubtitleWhisper({
                text: `⏱️ Mode Timer Complete ${msg.payload?.timer?.minutes || 25}m | Time for a session break ☕`,
                category: 'timer'
              });
              await soundManager.init();
              await soundManager.playNormal();
            }
          } catch (e) {
            console.warn('SSE parse error:', e);
          }
        };

        es.onerror = () => {
          setSseConnected(false);
          es?.close();
          reconnectTimer = setTimeout(connectSse, 3000);
        };
      } catch {
        setSseConnected(false);
      }
    };

    connectSse();
    const pollInterval = setInterval(fetchBackendState, 2500);

    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
    };
  }, [fetchBackendState]);


  // Playback clock
  useEffect(() => {
    if (viewerState !== 'Watching') return;
    const t = setInterval(() => {
      setPlaybackSeconds(s => (s < 8100 ? s + 1 : s));
    }, 1000);
    return () => clearInterval(t);
  }, [viewerState]);

  // Actions from TV Remote - synced back to backend so companion browser updates immediately
  const sendViewerState = async (state: 'Watching' | 'Paused' | 'Break' | 'Credits' | 'Summary') => {
    await soundManager.init();
    const targetState = state === 'Credits' ? 'Break' : state;
    setViewerState(targetState);
    if (state === 'Summary') {
      soundManager.playSummary().catch(() => {});
      try {
        const res = await fetch('http://localhost:3001/api/action/end-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (res.ok) {
          const data = await res.json();
          if (data.notifications) setNotifications(data.notifications);
          if (data.contract) setContract(data.contract);
        }
      } catch {}
      await fetchBackendState();
      return;
    }

    try {
      await fetch('http://localhost:3001/api/action/set-viewer-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
    } catch {}
    fetchBackendState();
  };

  const switchTvModeTemplate = async (name: string, activityType: string) => {
    const updated = { ...contract, name, activityType, status: 'active' };
    setContract(updated);
    setSubtitleWhisper({
      text: `✦ Fire TV Mode Switched to ${name} - ${activityType.toUpperCase()}`,
      category: 'system'
    });
    // Auto-dismiss summary and break overlays on mode switch and resume active playback
    if (viewerState !== 'Watching') {
      sendViewerState('Watching');
    }
    try {
      await fetch('http://localhost:3001/api/action/save-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: updated })
      });
    } catch {}
  };

  const dismissHudAlert = async () => {
    const id = criticalHud?.id;
    setCriticalHud(null);
    if (id) {
      try {
        await fetch('http://localhost:3001/api/action/dismiss-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch {}
    }
  };

  // Remote buttons for D-Pad navigation
  const remoteActions = [
    {
      label: viewerState === 'Watching' ? `⏸ ${translateUI('pauseMovie', currentLang)}` : `▶ ${translateUI('resumeMovie', currentLang)}`,
      action: () => sendViewerState(viewerState === 'Watching' ? 'Paused' : 'Watching')
    },
    {
      label: `☕ ${translateUI('viewingBreak', currentLang)}`,
      action: () => sendViewerState('Break')
    },
    {
      label: `📊 ${translateUI('sessionDigest', currentLang)}`,
      action: () => sendViewerState('Summary')
    },
    {
      label: `🎬 ${translateUI('movieNight', currentLang) || 'Feature Night'}`,
      action: () => switchTvModeTemplate('Feature Night', 'feature')
    },
    {
      label: `⚽ ${translateUI('sportsLive', currentLang)}`,
      action: () => switchTvModeTemplate('Sports Live', 'sports')
    },
    {
      label: `👨‍👩‍👧 ${translateUI('familyTime', currentLang)}`,
      action: () => switchTvModeTemplate('Family Time', 'family')
    },
    {
      label: `🥽 ${translateUI('tmplVrImmersionTitle', currentLang)}`,
      action: () => switchTvModeTemplate('VR Immersion', 'vr')
    },
    {
      label: '⏱️ 25m Timer',
      action: async () => {
        try {
          await fetch('http://localhost:3001/api/action/set-mode-timer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: 25, modeName: contract?.name || 'Focus Mode' })
          });
          setSubtitleWhisper({
            text: '⏱️ 25-minute mode timer started. QuietCue+ will hold alerts until session break.',
            category: 'timer'
          });
        } catch {}
      }
    }
  ];

  // Fire TV Remote D-Pad Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedBtnIndex(prev => (prev + 1) % remoteActions.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedBtnIndex(prev => (prev - 1 + remoteActions.length) % remoteActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        remoteActions[focusedBtnIndex]?.action();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        if (criticalHud) {
          dismissHudAlert();
        } else if (viewerState !== 'Watching') {
          sendViewerState('Watching');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const displayedBreakItems = notifications.filter(
    n => n.status === 'displayed' && n.appliedRule === 'next_break'
  );
  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const summaryItems = notifications.filter(
    n => n.status === 'summarized' || n.appliedRule === 'summarize_later'
  );

  return (
    <div className="tv-client-root" style={{
      width: '100vw',
      height: '100vh',
      background: '#030712',
      color: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
    }}>
      {/* Background Layer: Real-time Video Stream synced to Active Mode */}
      <video
        ref={videoRef}
        key={activeMedia.video}
        src={activeMedia.video}
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isPlaying ? 0.9 : 0.35,
          transition: 'opacity 0.4s ease'
        }}
      />

      {/* Cinematic Vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 35%, rgba(3, 7, 18, 0.85) 100%)',
        pointerEvents: 'none'
      }} />

      {/* Spatial VR Immersion Guardian Grid Overlay */}
      {(activeMedia.key === 'vr' || contract?.activityType === 'vr') && (
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid rgba(0, 210, 255, 0.45)',
          boxShadow: 'inset 0 0 80px rgba(0, 210, 255, 0.25), inset 0 0 200px rgba(2, 132, 199, 0.20)',
          pointerEvents: 'none',
          zIndex: 510,
          transition: 'all 0.5s ease'
        }}>
          <div style={{
            position: 'absolute',
            top: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(2, 132, 199, 0.35)',
            border: '1px solid rgba(0, 210, 255, 0.65)',
            borderRadius: '999px',
            padding: '6px 18px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#38BDF8',
            backdropFilter: 'blur(12px)',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(0, 210, 255, 0.3)'
          }}>
            <span>🥽</span>
            <span>Spatial Peripheral VR Field Active | Non-Disruptive Anchors</span>
          </div>
        </div>
      )}

      {/* TOP 10-FOOT FIRE TV STATUS HUD */}
      <header style={{
        position: 'relative',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 40px',
        background: 'linear-gradient(180deg, rgba(3,7,18,0.95) 0%, transparent 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(10, 13, 20, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '6px 14px',
            borderRadius: '6px',
            backdropFilter: 'blur(12px)'
          }}>
            <img src="/quietcue_brand_combo.svg" alt="QuietCue+ Alexa Fire TV" style={{ height: '22px', objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '-0.2px', color: '#FFFFFF' }}>QuietCue<span style={{ color: '#38BDF8' }}>+</span></span>
            <span style={{
              fontSize: '10.5px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: sseConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: sseConnected ? '#34D399' : '#FBBF24',
              border: `1px solid ${sseConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              fontWeight: 600
            }}>
              {sseConnected ? translateUI('liveSseSynced', currentLang) : translateUI('localFallbackActive', currentLang)}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '6px 14px',
            borderRadius: '6px'
          }}>
            <span style={{ color: '#10B981', fontWeight: 800, fontSize: '13px' }}>✓</span>
            <span className="tv-hud-label" style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 500 }}>{translateUI('playbook', currentLang)}:</span>
            <strong style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 700 }}>{formatContractName(contract?.name, currentLang, contract?.activityType)}</strong>
            <span style={{
              fontSize: '10.5px',
              background: 'rgba(37, 84, 150, 0.35)',
              color: '#93C5FD',
              padding: '2px 7px',
              borderRadius: '4px',
              marginLeft: '4px',
              fontWeight: 600,
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              {translateUI('statePrefix', currentLang)} {formatViewerState(viewerState, currentLang)}
            </span>

            {modeTimer && (
              <span style={{
                fontSize: '10.5px',
                background: modeTimer.isRunning ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: modeTimer.isRunning ? '#34D399' : '#FBBF24',
                border: `1px solid ${modeTimer.isRunning ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                padding: '2px 7px',
                borderRadius: '4px',
                marginLeft: '4px',
                fontWeight: 600
              }}>
                ⏱️ {formatTimerSeconds(modeTimer.remainingSeconds)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '11.5px',
            color: '#CBD5E1',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🔔</span>
            <span className="tv-hud-label">{translateUI('heldInQueueLabel', currentLang)}</span>
            <strong style={{ color: '#FBBF24', fontSize: '12px', fontWeight: 700 }}>{pendingCount}</strong>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>|</span>
            <span className="tv-hud-label">{translateUI('lastSyncLabel', currentLang)}</span>
            <span style={{ color: '#38BDF8', fontWeight: 600 }}>{formatLastSyncEvent(lastSyncEvent, currentLang)}</span>
          </div>

          {/* Alexa Voice Trigger buttons on Fire TV Client */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="tv-top-action-btn"
              onClick={() => runTvVoiceTypingAnimation('Feature Presentation')}
              title="Test Alexa voice search on screen"
              style={{
                background: '#255496',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🎬</span>
              <span style={{ color: '#FFFFFF' }}>{translateUI('chipInterstellar', currentLang)}</span>
            </button>
            <button
              type="button"
              className="tv-top-action-btn"
              onClick={() => runTvVoiceTypingAnimation('Focus Terminal')}
              title="Test Alexa focus stream command on screen"
              style={{
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>💻</span>
              <span style={{ color: '#FFFFFF' }}>{translateUI('chipMatrix', currentLang)}</span>
            </button>
            <button
              type="button"
              className="tv-top-action-btn"
              onClick={() => runTvVoiceTypingAnimation('VR Spatial Immersion')}
              title="Test Alexa VR spatial command on screen"
              style={{
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🥽</span>
              <span style={{ color: '#FFFFFF' }}>{translateUI('chipVrStream', currentLang)}</span>
            </button>
          </div>

          {/* Online Language Dropdown for Fire TV */}
          <div ref={langDropdownRef} style={{ position: 'relative', zIndex: 1000 }}>
            <button
              type="button"
              className="tv-lang-trigger-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsLangDropdownOpen(prev => !prev);
              }}
              title="Select Interface Language"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                padding: '6px 12px',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>
                {SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.flag || currentLang.toUpperCase()}
              </span>
              <span style={{ fontSize: '12px', color: '#FFFFFF', letterSpacing: '0.02em', fontWeight: 600 }}>{SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.label || 'Language'}</span>
              <span style={{ fontSize: '9px', color: '#38BDF8', marginLeft: '2px' }}>{isLangDropdownOpen ? '▴' : '▾'}</span>
            </button>

            {isLangDropdownOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '12px',
                  padding: '6px',
                  minWidth: '160px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85), 0 0 16px rgba(56, 189, 248, 0.2)',
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 2000
                }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className="tv-lang-option-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLanguage(lang.code);
                      setIsLangDropdownOpen(false);
                    }}
                    title={`Switch interface to ${lang.label}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: currentLang === lang.code ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      border: currentLang === lang.code ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.10)',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      color: currentLang === lang.code ? '#38BDF8' : '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px' }}>{lang.flag}</span>
                      <span style={{ color: currentLang === lang.code ? '#38BDF8' : '#FFFFFF', fontWeight: 600 }}>{lang.label}</span>
                    </span>
                    {currentLang === lang.code && (
                      <span style={{ color: '#38BDF8', fontWeight: 800, fontSize: '12px' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onExitTvMode && (
            <button
              type="button"
              className="tv-dashboard-exit-btn"
              onClick={onExitTvMode}
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(56, 189, 248, 0.6)',
                color: '#38BDF8',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'none',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span style={{ color: '#38BDF8', fontWeight: 700 }}>{translateUI('dashboard', currentLang)}</span>
            </button>
          )}
        </div>
      </header>

      {/* MIDDLE AREA: CRITICAL HUD, BREAK DRAWER, OR SUMMARY DIGEST */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 48px'
      }}>
        {/* Realtime Alexa Voice Typing Overlay on Fire TV Screen */}
        {voiceTypingState.active && (
          <div style={{ position: 'absolute', top: '24px', left: '48px', right: '48px', zIndex: 100 }}>
            <VoiceTypingOverlay 
              movie={voiceTypingState.targetMovie} 
              typedText={voiceTypingState.typedText} 
              isMatched={voiceTypingState.isMatched} 
              statusText={voiceTypingState.statusText} 
            />
          </div>
        )}

        {/* 1. CRITICAL INTERRUPT HUD OVERLAY */}
        {criticalHud && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '40px',
            background: 'rgba(127, 29, 29, 0.95)',
            border: '2px solid #EF4444',
            boxShadow: '0 20px 50px rgba(239, 68, 68, 0.45)',
            borderRadius: '16px',
            padding: '20px 26px',
            maxWidth: '460px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            backdropFilter: 'blur(16px)',
            animation: 'slideInToast 0.25s ease-out'
          }}>
            <div style={{ fontSize: '32px' }}>🚨</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  Interrupt Now : 2 Beeps
                </span>
                <span style={{ fontSize: '11px', color: '#FCA5A5' }}>{criticalHud.source}</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: '6px 0 4px 0' }}>
                {translatedHud.title || criticalHud.title}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#FECACA', margin: 0, lineHeight: 1.4 }}>
                {translatedHud.message || criticalHud.message}
              </p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={dismissHudAlert}
                  style={{
                    background: '#FFFFFF',
                    color: '#991B1B',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Dismiss Alert - Back or Esc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. VIEWING BREAK OVERLAY */}
        {viewerState === 'Break' && (
          <div 
            onClick={() => sendViewerState('Watching')}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 900,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(30, 34, 42, 0.94)',
                border: '1px solid rgba(56, 189, 248, 0.55)',
                borderRadius: '20px',
                padding: '28px 36px',
                maxWidth: '720px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 24px rgba(56, 189, 248, 0.2)',
                backdropFilter: 'blur(16px)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>☕</span>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Session Break Digest</h2>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                      Surfacing notifications held by your {contract.name} playbook during playback:
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => sendViewerState('Watching')}
                    style={{
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ▶ {translateUI('resumeMovie', currentLang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendViewerState('Watching')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#FFFFFF',
                      padding: '8px 14px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Close digest"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayedBreakItems.length === 0 ? (
                  <div style={{ padding: '18px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                    No queued break notifications waiting. Enjoy your break!
                  </div>
                ) : (
                  displayedBreakItems.map(item => (
                    <div key={item.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      padding: '14px 18px',
                      borderRadius: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ fontSize: '24px' }}>{getCategoryIcon(item.event.category)}</span>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#FFFFFF' }}>{item.event.title}</strong>
                          <div style={{ fontSize: '13px', color: '#CBD5E1' }}>{item.event.message}</div>
                          <div style={{ fontSize: '11px', color: '#38BDF8', marginTop: '2px' }}>{item.explanation}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#FBBF24', fontWeight: 600 }}>{item.handledAt}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. SESSION SUMMARY DIGEST OVERLAY */}
        {viewerState === 'Summary' && (
          <div 
            onClick={() => sendViewerState('Watching')}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 900,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(30, 34, 42, 0.96)',
                border: '1px solid rgba(16, 185, 129, 0.55)',
                borderRadius: '20px',
                padding: '28px 36px',
                maxWidth: '760px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(16, 185, 129, 0.25)',
                backdropFilter: 'blur(16px)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>📊</span>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>End-of-Session Summary Digest</h2>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                      {notifications.length} total home events governed | {summaryItems.length} routine updates quietly summarized
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => sendViewerState('Watching')}
                    style={{
                      background: '#10B981',
                      color: '#052E16',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ▶ {translateUI('startNewSession', currentLang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendViewerState('Watching')}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.6)',
                      color: '#FCA5A5',
                      padding: '8px 16px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Exit Summary and resume active playback"
                  >
                    ✕ Exit Summary
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '13.5px' }}>
                    No notifications recorded for this session yet. Trigger alerts from the Connected Devices panel to see them governed here.
                  </div>
                ) : (
                  notifications.map(item => (
                    <div key={item.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '12px 16px',
                      borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>
                          {getCategoryIcon(item.event.category)}
                        </span>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#FFFFFF' }}>{item.event.title}</strong>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>{item.event.message}</div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38BDF8',
                        fontWeight: 600
                      }}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM AREA: PIONEERING SUBTITLE-SLOT WHISPER BAR + FIRE TV D-PAD REMOTE BAR */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        padding: '20px 40px 28px 40px',
        background: 'linear-gradient(0deg, rgba(3,7,18,0.95) 0%, rgba(3,7,18,0.6) 70%, transparent 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Subtitle-Slot Whisper Alert Track */}
        {subtitleWhisper && (
          <div style={{
            alignSelf: 'center',
            background: 'rgba(9, 13, 24, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            padding: '10px 24px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: subtitleWhisper.category === 'health' ? '#34D399' : subtitleWhisper.category === 'calendar' ? '#F472B6' : '#38BDF8',
              background: subtitleWhisper.text.toLowerCase().includes('dad') ? 'rgba(245, 158, 11, 0.25)' : subtitleWhisper.category === 'health' ? 'rgba(16, 185, 129, 0.2)' : subtitleWhisper.category === 'calendar' ? 'rgba(244, 114, 182, 0.2)' : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${subtitleWhisper.text.toLowerCase().includes('dad') ? 'rgba(245, 158, 11, 0.5)' : subtitleWhisper.category === 'health' ? 'rgba(52, 211, 153, 0.4)' : subtitleWhisper.category === 'calendar' ? 'rgba(244, 114, 182, 0.4)' : 'transparent'}`,
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {subtitleWhisper.text.toLowerCase().includes('dad') ? "👨‍👧‍👦 Dad's Day Alert" : subtitleWhisper.category === 'health' ? '💧 Wellness Cue' : subtitleWhisper.category === 'calendar' ? (subtitleWhisper.text.toLowerCase().includes('birthday') || subtitleWhisper.text.toLowerCase().includes('mom') ? '🎂 Birthday Alert' : '📅 Calendar Alert') : subtitleWhisper.category === 'timer' ? '⏱️ Focus Timer' : subtitleWhisper.category === 'vr' ? translateUI('vrSpatialCue', currentLang) : subtitleWhisper.category === 'package' ? '📦 Delivery Cue' : 'QuietCue+ Whisper'}
            </span>
            <span className="tv-whisper-text" style={{ fontSize: '14px', color: '#F8FAFC', fontWeight: 600 }}>
              {translatedWhisper || subtitleWhisper.text}
            </span>
          </div>
        )}

        {/* Authentic Fire TV Apps Navigation Strip */}
        <div className="firetv-apps-nav-strip" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: '999px',
          padding: '6px 18px',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          marginBottom: '4px'
        }}>
          <div className="tv-nav-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              className={`tv-nav-chip ${activeTvTab === 'Home' ? 'active' : ''}`}
              onClick={() => setActiveTvTab('Home')}
              style={{
                background: activeTvTab === 'Home' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.10)',
                color: activeTvTab === 'Home' ? '#0F172A' : '#FFFFFF',
                fontWeight: activeTvTab === 'Home' ? 800 : 700,
                padding: '6px 18px',
                borderRadius: '999px',
                fontSize: '13px',
                border: activeTvTab === 'Home' ? 'none' : '1px solid rgba(255, 255, 255, 0.22)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Home
            </button>
            <button 
              type="button"
              className={`tv-nav-chip ${activeTvTab === 'Find' ? 'active' : ''}`}
              onClick={() => {
                setActiveTvTab('Find');
                setSubtitleWhisper({
                  text: '🔍 Voice Search Active: Speak into Alexa Remote to locate titles or modes',
                  category: 'vr'
                });
              }}
              style={{
                background: activeTvTab === 'Find' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.10)',
                color: activeTvTab === 'Find' ? '#0F172A' : '#FFFFFF',
                fontWeight: activeTvTab === 'Find' ? 800 : 700,
                padding: '6px 18px',
                borderRadius: '999px',
                fontSize: '13px',
                border: activeTvTab === 'Find' ? 'none' : '1px solid rgba(255, 255, 255, 0.22)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Find
            </button>
            <button 
              type="button"
              className={`tv-nav-chip ${activeTvTab === 'Live' ? 'active' : ''}`}
              onClick={() => {
                setActiveTvTab('Live');
                switchTvModeTemplate('Sports Live', 'sports');
                setSubtitleWhisper({
                  text: '⚡ Live Broadcast Stream: QuietCue+ sports filter active',
                  category: 'health'
                });
              }}
              style={{
                background: activeTvTab === 'Live' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.10)',
                color: activeTvTab === 'Live' ? '#0F172A' : '#FFFFFF',
                fontWeight: activeTvTab === 'Live' ? 800 : 700,
                padding: '6px 18px',
                borderRadius: '999px',
                fontSize: '13px',
                border: activeTvTab === 'Live' ? 'none' : '1px solid rgba(255, 255, 255, 0.22)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Live
            </button>
          </div>
          <div className="tv-apps-icons-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="tv-app-icon netflix" title="Netflix">N</div>
            <div className="tv-app-icon prime" title="Prime Video">prime</div>
            <div className="tv-app-icon freevee" title="Freevee">freevee</div>
            <div className="tv-app-icon youtube" title="YouTube">▶</div>
            <div className="tv-app-icon disney" title="Disney+">D+</div>
            <div className="tv-app-icon hulu" title="Hulu">hulu</div>
            <div className="tv-app-icon apps-grid" title="App Library">㗊</div>
            <div className="tv-app-icon settings-gear" title="Settings">⚙</div>
          </div>
        </div>

        {/* Timeline & Remote D-Pad Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span 
              onClick={() => sendViewerState(viewerState === 'Watching' ? 'Paused' : 'Watching')}
              style={{ cursor: 'pointer', fontSize: '14px', color: '#38BDF8', fontWeight: 800, padding: '2px 6px' }}
              title="Toggle playback"
            >
              {viewerState === 'Watching' ? '⏸' : '▶'}
            </span>
            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, (playbackSeconds / 8100) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #3B82F6, #38BDF8)'
              }} />
            </div>
            <span className="tv-timeline-time" style={{ fontSize: '12px', color: '#E2E8F0', fontWeight: 700 }}>{formatTime(playbackSeconds)} / 2:15:00</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {remoteActions.map((btn, idx) => {
                const isFocused = idx === focusedBtnIndex;
                return (
                  <button
                    key={btn.label}
                    type="button"
                    className={`tv-dpad-btn ${isFocused ? 'focused' : ''}`}
                    onClick={() => {
                      setFocusedBtnIndex(idx);
                      btn.action();
                    }}
                    style={{
                      background: isFocused ? '#2563EB' : 'rgba(30, 41, 59, 0.95)',
                      color: '#FFFFFF',
                      border: isFocused ? '2px solid #93C5FD' : '1px solid rgba(255, 255, 255, 0.28)',
                      padding: '9px 16px',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: isFocused ? '0 0 18px rgba(37, 99, 235, 0.85)' : '0 2px 6px rgba(0, 0, 0, 0.35)',
                      transform: isFocused ? 'scale(1.04)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span className="tv-dpad-label" style={{ color: '#FFFFFF', fontWeight: 700 }}>
                      {btn.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="tv-dpad-instructions" style={{ fontSize: '11px', color: '#E2E8F0', fontWeight: 500 }}>
              🎮 Fire TV Remote D-Pad: <strong style={{ color: '#FFFFFF' }}>◄ ►</strong> Navigate | <strong style={{ color: '#FFFFFF' }}>Enter</strong> Select | <strong style={{ color: '#FFFFFF' }}>Esc</strong> Dismiss
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
