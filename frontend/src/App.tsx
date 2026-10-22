import { useState, useRef, useEffect, useMemo } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { soundManager } from './soundManager.js';
import { TvClient } from './TvClient.js';
import { getMediaForMode, getMediaForMovieSearch } from './mediaConfig.js';
import { SUPPORTED_LANGUAGES, SupportedLanguage, translateUI, formatContractName } from './translations.js';
import { VoiceTypingOverlay } from './VoiceTypingOverlay.js';
import { DemoWalkthroughModal } from './DemoWalkthroughModal.js';
import './App.css';

interface ViewingRule {
  eventCategory: string;
  handlingPolicy: string;
  priority: number;
}

interface ViewingContract {
  contractId: string;
  name: string;
  activityType: string;
  status: string;
  rules: ViewingRule[];
  notificationSummary?: {
    totalEvents: number;
    displayedCount: number;
    queuedCount: number;
    summarizedCount: number;
    dismissedCount: number;
  };
}

interface NotificationItem {
  id: string;
  event: {
    title: string;
    message: string;
    sourceDevice: string;
    category: string;
    timestamp: string;
  };
  appliedRule: string;
  priority: number;
  status: string;
  explanation: string;
  handledAt: string;
}

interface ToastMessage {
  id: number;
  title: string;
  desc: string;
  icon?: string;
  type?: 'info' | 'critical' | 'success';
}

interface ModeTimerState {
  minutes: number;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  modeName: string;
  endsAt: number;
}

function formatPolicy(policy: string, lang: SupportedLanguage = 'en'): string {
  if (!policy) return '';
  switch (policy.toLowerCase()) {
    case 'interrupt_now': return translateUI('interruptNowAction', lang);
    case 'next_break': return translateUI('nextBreakAction', lang);
    case 'summarize_later': return translateUI('sessionDigestAction', lang);
    default: return policy.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

function formatCategory(cat: string, lang: SupportedLanguage = 'en'): string {
  if (!cat) return '';
  switch (cat.toLowerCase()) {
    case 'device_unavailable': return translateUI('ruleDevice', lang);
    case 'security': return translateUI('ruleSecurity', lang);
    case 'package': return translateUI('packageUpdates', lang);
    case 'thermostat': return translateUI('thermostatUpdates', lang);
    case 'light': return translateUI('lightingUpdates', lang);
    case 'system': return translateUI('ruleSecurity', lang);
    case 'health': return translateUI('healthWellnessTitle', lang);
    case 'calendar': return translateUI('familyCalendarTitle', lang);
    default: return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

function cleanExplanation(text: string): string {
  if (!text) return '';
  return text
    .replace(/Prioritized for [^.]+\./gi, '')
    .replace(/Queued for summary digest[^.]+\./gi, '')
    .replace(/Current state is[^.]+\./gi, '')
    .replace(/-> Updated to[^.]+\./gi, '')
    .replace(/-> Released during[^.]+\./gi, '')
    .replace(/viewing break/gi, 'session break')
    .replace(/credits/gi, 'session break')
    .replace(/4K HDR Cinema/gi, '4K Cinema')
    .replace(/Hold packages for credits/gi, 'Hold alerts for session break')
    .replace(/cosmic/gi, 'space')
    .replace(/cyber/gi, 'code')
    .replace(/ambient/gi, 'calm')
    .replace(/Matched rule for [^:]+:\s*/gi, '')
    .replace(/Matched rule:\s*/gi, '')
    .replace(/match the rule/gi, 'guideline')
    .replace(/interrupt_now/gi, 'Immediate Alert')
    .replace(/next_break/gi, 'Next Break')
    .replace(/summarize_later/gi, 'Session Digest')
    .replace(/Summarize Later/gi, 'Session Digest')
    .replace(/summarise later/gi, 'Session Digest')
    .replace(/summarize later/gi, 'Session Digest')
    .replace(/device_unavailable/gi, 'Device Offline')
    .replace(/movie_credits_or_manual/gi, 'Manual or Break')
    .replace(/_/g, ' ')
    .replace(/[()]/g, '')
    .trim();
}

function formatNotificationTitle(title: string, lang: SupportedLanguage = 'en'): string {
  if (!title) return '';
  if (title.includes('Family Time Timer Complete')) return translateUI('familyTimeComplete', lang);
  if (title.includes("Mom's Birthday Reminder") || title.includes("Mom's Birthday")) return translateUI('momsBirthdayReminder', lang);
  if (title.includes("Dad's Day Reminder") || title.includes("Dad's Day")) return translateUI('dadsDayReminder', lang);
  if (title.includes('Contract Saved')) return translateUI('contractSavedTitle', lang);
  if (title.includes('Critical alert - Doorbell') || title.includes('Doorbell')) return translateUI('ruleSecurity', lang);
  if (title.includes('Package Delivered') || title.includes('Package update')) return translateUI('packageUpdates', lang);
  if (title.includes('Thermostat')) return translateUI('thermostatUpdates', lang);
  if (title.includes('Smart Lights') || title.includes('Lighting update')) return translateUI('lightingUpdates', lang);
  if (title.includes('Hydration & Posture')) return translateUI('healthWellnessTitle', lang);
  return title.replace(/[()]/g, '');
}

function formatNotificationSecondary(item: NotificationItem, lang: SupportedLanguage = 'en'): string {
  if (item.status === 'displayed') {
    if (item.event?.category === 'security' || item.appliedRule === 'interrupt_now') {
      return translateUI('displayed2Beeps', lang);
    }
    return translateUI('deliveredOnBreak', lang);
  }
  if (item.event?.category === 'package') {
    return 'Timely delivery : 1 beep';
  }
  if (item.status === 'pending') {
    if (item.appliedRule === 'next_break') {
      return translateUI('heldForBreak', lang);
    }
    return translateUI('savedInDigest', lang);
  }
  if (item.status === 'summarized') {
    return translateUI('savedInDigest', lang);
  }
  const cleaned = cleanExplanation(item.explanation);
  return cleaned || translateUI('savedInDigest', lang);
}

function App() {

  // Cross-tab storage listener for immediate language sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quietcue_lang' && e.newValue) {
        setCurrentLang(e.newValue as SupportedLanguage);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // quietcue_lang_storage_app

  const [activeTab, setActiveTab] = useState<'home' | 'contracts' | 'devices' | 'notifications' | 'mcp' | 'conversation' | 'settings' | 'voice_studio'>('home');
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem('quietcue_lang') as SupportedLanguage) || 'en';
  });

  const handleSelectLanguage = async (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    localStorage.setItem('quietcue_lang', lang);
    try {
      await fetch('http://localhost:3001/api/action/set-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
      });
    } catch {}
    const opt = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    showToast('🌐 Language Updated', `QuietCue+ translated to ${opt?.label || lang}`, '🌐', 'info');
  };

  const [contract, setContract] = useState<ViewingContract>({
    contractId: 'contract-movie-default',
    name: 'Feature Night - Default',
    activityType: 'movie',
    status: 'active',
    rules: [
      { eventCategory: 'security', handlingPolicy: 'interrupt_now', priority: 1 },
      { eventCategory: 'package', handlingPolicy: 'next_break', priority: 2 },
      { eventCategory: 'thermostat', handlingPolicy: 'summarize_later', priority: 3 },
      { eventCategory: 'light', handlingPolicy: 'summarize_later', priority: 4 },
      { eventCategory: 'device_unavailable', handlingPolicy: 'next_break', priority: 5 }
    ],
    notificationSummary: {
      totalEvents: 4,
      displayedCount: 1,
      queuedCount: 2,
      summarizedCount: 1,
      dismissedCount: 0
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'evt-sec-1',
      event: { title: 'Critical alert - Doorbell', message: 'Front door camera detected motion.', sourceDevice: 'Front Door Ring', category: 'security', timestamp: '8:24 AM' },
      appliedRule: 'interrupt_now',
      priority: 1,
      status: 'displayed',
      explanation: 'Critical alerts interrupt immediately.',
      handledAt: '8:24 AM'
    },
    {
      id: 'evt-pkg-1',
      event: { title: 'Package update', message: 'Amazon package delivered to front door.', sourceDevice: 'Parcel Delivery', category: 'package', timestamp: '8:21 AM' },
      appliedRule: 'next_break',
      priority: 2,
      status: 'pending',
      explanation: 'Queued for session break.',
      handledAt: '8:21 AM'
    },
    {
      id: 'evt-therm-1',
      event: { title: 'Thermostat update', message: 'Indoor temperature is 72°F.', sourceDevice: 'Thermostat', category: 'thermostat', timestamp: '8:18 AM' },
      appliedRule: 'summarize_later',
      priority: 3,
      status: 'pending',
      explanation: 'Queued for session summary.',
      handledAt: '8:18 AM'
    },
    {
      id: 'evt-light-1',
      event: { title: 'Lighting update', message: 'Patio lights dimmed to 20%.', sourceDevice: 'Smart Lights', category: 'light', timestamp: '8:12 AM' },
      appliedRule: 'summarize_later',
      priority: 4,
      status: 'summarized',
      explanation: 'Summarized routine update.',
      handledAt: '8:12 AM'
    }
  ]);

  const displayNotifications = useMemo(() => {
    const filtered = notifications.filter(n => !n.event?.title?.includes('Contract Saved'));
    const uniqueMap = new Map<string, NotificationItem & { count: number }>();
    for (const notif of filtered) {
      const key = `${notif.event?.category || 'gen'}-${notif.event?.title || 'notif'}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { ...notif, count: 1 });
      } else {
        const existing = uniqueMap.get(key)!;
        existing.count += 1;
        if (notif.handledAt) existing.handledAt = notif.handledAt;
      }
    }
    return Array.from(uniqueMap.values());
  }, [notifications]);

  // Toast feedback
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Realtime Fire TV playback simulation states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(0);
  const [tvAlert, setTvAlert] = useState<{ title: string; message: string; icon: string; critical: boolean } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Realtime Alexa movie voice typing state on Fire TV screen
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
  const lastInitiatedMovieRef = useRef<{ movie: string; time: number } | null>(null);
  const [customMovieInput, setCustomMovieInput] = useState<string>('');

  // Real-time Mode Timer State
  const [modeTimer, setModeTimer] = useState<ModeTimerState | null>(null);
  const [customTimerMinutes, setCustomTimerMinutes] = useState<string>('25');

  const formatTimerSeconds = (sec: number) => {
    if (sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetModeTimer = async (minutes: number, targetModeName?: string) => {
    const modeName = targetModeName || contract.name || 'Focus Mode';
    try {
      const res = await fetch('http://localhost:3001/api/action/set-mode-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, modeName })
      });
      if (res.ok) {
        const data = await res.json();
        setModeTimer(data.timer);
      }
    } catch {
      const totalSeconds = minutes * 60;
      setModeTimer({
        minutes,
        totalSeconds,
        remainingSeconds: totalSeconds,
        isRunning: true,
        modeName,
        endsAt: Date.now() + totalSeconds * 1000
      });
    }
    await soundManager.init();
    await soundManager.playNormal();
    showToast('Timer Active ⏱️', `Started ${minutes}-minute timer for ${modeName}.`, '⏱️', 'success');
  };

  const handlePauseModeTimer = async () => {
    try {
      await fetch('http://localhost:3001/api/action/pause-mode-timer', { method: 'POST' });
    } catch {}
    setModeTimer(prev => prev ? ({ ...prev, isRunning: false }) : null);
    showToast('Timer Paused', 'Mode countdown paused.', '⏸', 'info');
  };

  const handleResumeModeTimer = async () => {
    try {
      await fetch('http://localhost:3001/api/action/resume-mode-timer', { method: 'POST' });
    } catch {}
    setModeTimer(prev => prev ? ({ ...prev, isRunning: true }) : null);
    showToast('Timer Resumed', 'Mode countdown resumed.', '▶', 'info');
  };

  const handleCancelModeTimer = async () => {
    try {
      await fetch('http://localhost:3001/api/action/cancel-mode-timer', { method: 'POST' });
    } catch {}
    setModeTimer(null);
    showToast('Timer Cancelled', 'Mode timer cleared.', '✕', 'info');
  };

  const formatPlaybackTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Sound toggles
  const [criticalSound, setCriticalSound] = useState(true);
  const [normalSound, setNormalSound] = useState(true);
  const [routineSound, setRoutineSound] = useState(false);

  // MCP Output preview in MCP modal
  const [mcpResult, setMcpResult] = useState<string>('Select an MCP tool above to execute live against QuietCue+ Server.');
  const [mcpLoading, setMcpLoading] = useState(false);

  // Chat conversation
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: 'user',
      text: "I am settling into a session. Only interrupt me for critical safety alerts and parcel deliveries. Queue routine updates until I take a break."
    },
    {
      role: 'assistant',
      text: `Understood! I created your QuietCue+ Feature Night Contract. Security and Critical alerts Interrupt Now with 2 short beeps. Package deliveries Interrupt Now for timely arrival. Thermostat and Routine updates route to Next Break. Sound policy has Critical 2 beep enabled, Normal 1 beep on break, and Routine silent. Contract is active!`,
      activated: true
    }
  ]);

  const clientRef = useRef<Client | null>(null);

  const showToast = (title: string, desc: string, icon = '✨', type: 'info' | 'critical' | 'success' = 'info') => {
    setToast({ id: Date.now(), title, desc: cleanExplanation(desc), icon, type });
    setTimeout(() => {
      setToast(prev => (prev && prev.title === title ? null : prev));
    }, 4500);
  };

  const triggerSound = async (type: 'critical' | 'normal' | 'summary') => {
    await soundManager.init();
    if (type === 'critical' && criticalSound) await soundManager.playCritical();
    else if (type === 'normal' && normalSound) await soundManager.playNormal();
    else if (type === 'summary' && (routineSound || true)) await soundManager.playSummary();
  };

  const [isTvClientView, setIsTvClientView] = useState<boolean>(() => window.location.search.includes('client=tv'));

  // Voice Recording Studio state
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(15);
  const [micError, setMicError] = useState<string | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [voiceUploadSuccess, setVoiceUploadSuccess] = useState(false);
  const [detectedAudio, setDetectedAudio] = useState<{ filename: string; sizeBytes: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPlayingMyVoice, setIsPlayingMyVoice] = useState(false);
  const myVoiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMyVoicePlayback = () => {
    if (isPlayingMyVoice && myVoiceAudioRef.current) {
      myVoiceAudioRef.current.pause();
      setIsPlayingMyVoice(false);
      showToast('Audio Stopped', 'Stopped playing your voice track.', '⏹', 'info');
    } else {
      if (!myVoiceAudioRef.current) {
        myVoiceAudioRef.current = new Audio('/user_voice_sample.mp3');
        myVoiceAudioRef.current.onended = () => setIsPlayingMyVoice(false);
      }
      myVoiceAudioRef.current.currentTime = 0;
      myVoiceAudioRef.current.play()
        .then(() => {
          setIsPlayingMyVoice(true);
          showToast('Playing Your Voice', 'Playing your uploaded 43s audio track for the video!', '🎧', 'success');
        })
        .catch(err => {
          showToast('Audio Error', 'Could not play voice sample: ' + err.message, '⚠️', 'critical');
        });
    }
  };

  const checkExistingVoiceSample = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/voice-sample-status');
      if (res.ok) {
        const data = await res.json();
        if (data.exists) {
          setDetectedAudio({ filename: data.filename, sizeBytes: data.sizeBytes });
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkExistingVoiceSample();
  }, [activeTab]);

  const startRecording = async () => {
    setMicError(null);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setVoiceUploadSuccess(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = "Direct audio recording is not supported in this browser context. Please use Windows Sound Recorder or choose an audio file below.";
      setMicError(msg);
      showToast('Microphone Unavailable', msg, '⚠️', 'critical');
      return;
    }

    setIsRequestingMic(true);
    showToast('Requesting Microphone', 'If your browser shows a permission prompt, please click "Allow".', '🎙️', 'info');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRequestingMic(false);

      let mediaRecorder: MediaRecorder;
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(15);
      showToast('Recording Started', 'Speak your 15-second sentence clearly.', '🔴', 'info');

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setIsRequestingMic(false);
      console.error("Microphone access failed:", err);
      let errMsg = err.message || 'Device error';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = "Microphone permission was blocked. Click the lock icon in your browser URL bar, set Microphone to 'Allow', and refresh. Or select an audio file below!";
      }
      setMicError(errMsg);
      showToast('Microphone Access Blocked', errMsg, '⚠️', 'critical');
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const uploadVoiceSample = async (blobToUpload: Blob, ext = 'wav') => {
    setUploadingVoice(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blobToUpload);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const res = await fetch('http://localhost:3001/api/upload-voice-sample', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64data,
              format: ext
            })
          });
          const data = await res.json();
          if (data.success) {
            setVoiceUploadSuccess(true);
            showToast('Voice Sample Uploaded', 'Saved successfully! Ready for AI cloning.', '🎙️', 'success');
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        } catch (err: any) {
          showToast('Upload Error', err.message, '⚠️', 'critical');
        } finally {
          setUploadingVoice(false);
        }
      };
    } catch (err: any) {
      setUploadingVoice(false);
      showToast('Upload Error', err.message, '⚠️', 'critical');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop() || 'wav';
      setRecordedBlob(file);
      setRecordedUrl(URL.createObjectURL(file));
      setVoiceUploadSuccess(false);
      uploadVoiceSample(file, ext);
    }
  };

  // Visual theme: 'slate' default, 'warm', 'light'
  const [theme, setTheme] = useState<'slate' | 'warm' | 'light'>(() => {
    return (localStorage.getItem('quietcue_theme') as 'slate' | 'warm' | 'light') || 'slate';
  });

  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [isSimulatingAll, setIsSimulatingAll] = useState<boolean>(false);
  const [lastTriggeredEvent, setLastTriggeredEvent] = useState<{ id: string; name: string; policy: string; time: string } | null>(null);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('quietcue_theme', theme);
  }, [theme]);

  // Fetch live state from backend
  const refreshBackendState = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data.activeContract) setContract(data.activeContract);
        if (data.notifications && data.notifications.length > 0) setNotifications(data.notifications);
        if (data.modeTimer !== undefined) setModeTimer(data.modeTimer);
        if (data.currentLanguage) setCurrentLang(data.currentLanguage);
        if (data.viewerState) {
          setIsPlaying(data.viewerState === 'Watching');
        }
        if (data.soundPreferences) {
          setCriticalSound(data.soundPreferences.criticalSound ?? true);
          setNormalSound(data.soundPreferences.normalSound ?? true);
          setRoutineSound(data.soundPreferences.routineSound ?? false);
        }
      }
    } catch {
      // Backend polling silent fallback (offline resilience)
    }
  };

  const connectToMcp = async () => {
    try {
      const transport = new SSEClientTransport(new URL('http://localhost:3001/mcp'));
      const client = new Client({ name: "QuietCue-Dashboard", version: "1.0.0" }, { capabilities: {} });
      clientRef.current = client;
      await client.connect(transport);
    } catch {
      // Fallback to REST synchronization
    }
  };

  useEffect(() => {
    connectToMcp();
    refreshBackendState();

    // Real-time Cross-Device SSE Subscription
    let es: EventSource | null = null;
    try {
      es = new EventSource('http://localhost:3001/api/events');
      es.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'state_sync' || msg.type === 'demo_reset') {
            if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
            if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
            if (msg.payload?.modeTimer !== undefined) setModeTimer(msg.payload.modeTimer);
            if (msg.payload?.viewerState) setIsPlaying(msg.payload.viewerState === 'Watching');
            if (msg.payload?.currentLanguage) setCurrentLang(msg.payload.currentLanguage);
          } else if (msg.type === 'language_changed') {
            if (msg.payload?.language) {
              setCurrentLang(msg.payload.language);
              localStorage.setItem('quietcue_lang', msg.payload.language);
            }
          } else if (msg.type === 'event_simulated') {
            const rec = msg.payload?.record;
            if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
            if (rec) {
              const isDad = rec.event?.title?.toLowerCase().includes('dad');
              const isBday = rec.event?.title?.toLowerCase().includes('birthday') || rec.event?.title?.toLowerCase().includes('mom');
              const isHealth = rec.event?.category === 'health';
              setTvAlert({
                icon: rec.appliedRule === 'interrupt_now' ? '🚨' : isDad ? '👨‍👧‍👦' : isBday ? '🎂' : isHealth ? '💧' : rec.appliedRule === 'next_break' ? '📦' : '💬',
                title: rec.event.title,
                message: rec.event.message,
                critical: rec.appliedRule === 'interrupt_now'
              });
              setTimeout(() => setTvAlert(null), 5000);
            }
            refreshBackendState();
          } else if (msg.type === 'break_triggered') {
            setIsPlaying(false);
            if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
            if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
            setTvAlert({
              icon: msg.payload?.condition === 'credits' ? '🎬' : '☕',
              title: 'Session Break Active',
              message: `Released ${msg.payload?.releasedNotifications?.length || 0} queued notifications to TV.`,
              critical: false
            });
            setTimeout(() => setTvAlert(null), 5000);
          } else if (msg.type === 'viewer_state_changed') {
            if (msg.payload?.viewerState) {
              setIsPlaying(msg.payload.viewerState === 'Watching');
            }
            if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
          } else if (msg.type === 'rule_updated' || msg.type === 'contract_updated') {
            if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
            refreshBackendState();
          } else if (msg.type === 'notification_released' || msg.type === 'notification_dismissed' || msg.type === 'session_ended') {
            if (msg.payload?.notifications) setNotifications(msg.payload.notifications);
            if (msg.payload?.activeContract) setContract(msg.payload.activeContract);
            if (msg.type === 'notification_dismissed') setTvAlert(null);
            if (msg.type === 'session_ended') setIsPlaying(false);
          } else if (msg.type === 'alexa_voice_search') {
            const movie = msg.payload?.movie || 'Feature Presentation';
            if (lastInitiatedMovieRef.current && lastInitiatedMovieRef.current.movie === movie && Date.now() - lastInitiatedMovieRef.current.time < 8000) {
              return;
            }
            runVoiceTypingAnimation(movie, false);
          } else if (msg.type === 'timer_updated') {
            setModeTimer(msg.payload?.timer || null);
          } else if (msg.type === 'timer_cancelled') {
            setModeTimer(null);
          } else if (msg.type === 'timer_completed') {
            setModeTimer(null);
            setIsPlaying(false);
            setTvAlert({
              icon: '⏱️',
              title: '⏱️ Mode Timer Finished',
              message: `${msg.payload?.timer?.minutes || 25} min session complete. QuietCue+ switched to session break ☕.`,
              critical: false
            });
            setTimeout(() => setTvAlert(null), 6000);
            showToast('Timer Complete ⏱️', `${msg.payload?.timer?.minutes || 25} min session complete. Enjoy your break!`, '⏱️', 'success');
          }
        } catch {}
      };
    } catch {}

    const interval = setInterval(refreshBackendState, 3000);
    return () => {
      es?.close();
      clearInterval(interval);
    };
  }, []);

  // Mode Timer local countdown ticker
  useEffect(() => {
    if (!modeTimer || !modeTimer.isRunning) return;
    const interval = setInterval(() => {
      setModeTimer(prev => {
        if (!prev || !prev.isRunning) return prev;
        if (prev.remainingSeconds <= 1) {
          return { ...prev, remainingSeconds: 0, isRunning: false };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [modeTimer?.isRunning]);

  // Live Fire TV playback timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackSeconds(prev => (prev < 8100 ? prev + 1 : prev));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  const togglePlayback = async () => {
    await soundManager.init();
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (nextPlaying) {
      videoRef.current?.play().catch(() => {});
      showToast('Fire TV Playback', 'Resumed movie playback. Watching state active.', '▶', 'info');
    } else {
      videoRef.current?.pause();
      showToast('Fire TV Playback', 'Paused movie playback. Viewer is now Paused.', '⏸', 'info');
    }
    try {
      await fetch('http://localhost:3001/api/action/set-viewer-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: nextPlaying ? 'Watching' : 'Paused' })
      });
    } catch {}
    refreshBackendState();
  };

  const activeMedia = getMediaForMode(contract.name, contract.activityType);

  // Sync video element when media source or play state changes
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, activeMedia.video]);

  const switchMode = async (name: string, activityType: string, icon: string) => {
    await soundManager.init();
    await triggerSound('normal');
    const updatedContract = { ...contract, name, activityType };
    setContract(updatedContract);
    const media = getMediaForMode(name, activityType);
    showToast(`Switched to ${name}`, `Stream: ${media.title}`, icon, 'success');
    setIsPlaying(true);
    try {
      await fetch('http://localhost:3001/api/action/save-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: updatedContract })
      });
      await fetch('http://localhost:3001/api/action/set-viewer-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'Watching' })
      });
    } catch {}
    refreshBackendState();
  };

  const runVoiceTypingAnimation = (movie: string, broadcastToBackend = true) => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (broadcastToBackend) {
      lastInitiatedMovieRef.current = { movie, time: Date.now() };
    }

    setVoiceTypingState({
      active: true,
      targetMovie: movie,
      typedText: '',
      isMatched: false,
      statusText: 'Listening & Typing...'
    });

    soundManager.init().then(() => {
      soundManager.playAlexaChime().catch(() => {});
    }).catch(() => {});
    soundManager.speakAlexa(`Playing ${movie} on Fire TV.`);

    showToast('Alexa Voice Search', `Alexa called out: "${movie}"`, '🎙️', 'info');

    if (broadcastToBackend) {
      try {
        fetch('http://localhost:3001/api/action/alexa-voice-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movie })
        }).catch(() => {});
      } catch {}
    }

    let index = 0;
    typingTimerRef.current = setInterval(() => {
      index++;
      if (index <= movie.length) {
        setVoiceTypingState(prev => ({
          ...prev,
          active: true,
          targetMovie: movie,
          typedText: movie.slice(0, index)
        }));
        soundManager.playTypingKeystroke().catch(() => {});
      } else {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }

        const mediaMatch = getMediaForMovieSearch(movie);
        setVoiceTypingState(prev => ({
          ...prev,
          active: true,
          targetMovie: movie,
          typedText: movie,
          isMatched: true,
          statusText: `Matched: ${mediaMatch.title}`
        }));

        const updatedContract = {
          ...contract,
          name: mediaMatch.matchedMode.name,
          activityType: mediaMatch.matchedMode.activityType
        };
        setContract(updatedContract);
        setIsPlaying(true);
        videoRef.current?.play().catch(() => {});

        fetch('http://localhost:3001/api/action/save-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contract: updatedContract })
        }).catch(() => {});

        setTimeout(() => {
          setVoiceTypingState(prev => ({ ...prev, active: false }));
        }, 4000);
      }
    }, 60);
  };

  const handleSendChat = async (textOverride?: string) => {
    const text = (textOverride || chatInput).trim();
    if (!text) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    await soundManager.init();

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      const reply = cleanExplanation(data.intent?.responseText || "Viewing contract updated.");
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply, activated: true }]);

      if (data.executedResult && data.executedResult.alexaVoiceSearch) {
        runVoiceTypingAnimation(data.executedResult.movie, false);
      }

      if (data.executedResult && data.executedResult.event) {
        const item = data.executedResult;
        if (item.appliedRule === 'interrupt_now') {
          await triggerSound('critical');
          setTvAlert({
            icon: '🚨',
            title: item.event?.title || 'Critical Alert',
            message: item.event?.message || 'Immediate interruption triggered.',
            critical: true
          });
          setTimeout(() => setTvAlert(null), 5000);
        } else if (item.appliedRule === 'next_break') {
          await triggerSound('normal');
          const isHealth = item.event?.category === 'health';
          const isDadsDay = item.event?.title?.toLowerCase().includes("dad");
          const isBirthday = item.event?.title?.toLowerCase().includes("birthday") || item.event?.title?.toLowerCase().includes("mom");
          const isCalendar = item.event?.category === 'calendar';
          setTvAlert({
            icon: isHealth ? '💧' : isDadsDay ? '👨‍👧‍👦' : isBirthday ? '🎂' : isCalendar ? '📅' : '📦',
            title: item.event?.title || 'Notification Queued',
            message: isHealth ? 'Health cue queued for session break.' : isDadsDay ? "Dad's Day reminder queued for session break." : isBirthday ? 'Birthday reminder queued for session break.' : isCalendar ? 'Calendar reminder queued for session break.' : 'Queued for session break.',
            critical: false
          });
          setTimeout(() => setTvAlert(null), 4000);
        } else {
          await triggerSound('summary');
          setTvAlert({
            icon: '📋',
            title: item.event?.title || 'Notification Logged',
            message: 'Saved to session summary digest.',
            critical: false
          });
          setTimeout(() => setTvAlert(null), 4000);
        }
      } else {
        await triggerSound('normal');
      }

      if (data.notifications && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
      if (data.activeContract) {
        setContract(data.activeContract);
      }

      showToast('Alexa+ Event Received', reply.substring(0, 75) + '...', '💬', 'success');
      await refreshBackendState();
    } catch {
      const mockReply = `Contract updated for "${text}". Rules persisted.`;
      setChatMessages(prev => [...prev, { role: 'assistant', text: mockReply, activated: true }]);
      showToast('Viewing Contract Updated', mockReply, '✓', 'success');
    }
  };

  const triggerViewingBreak = async () => {
    await triggerSound('normal');
    setTvAlert({
      icon: '☕',
      title: 'Session Break Active',
      message: 'Releasing queued package and device updates to TV.',
      critical: false
    });
    setTimeout(() => setTvAlert(null), 5000);
    showToast('☕ Session Break Triggered', 'Releasing eligible break notifications to screen.', '☕', 'success');
    try {
      await fetch('http://localhost:3001/api/action/trigger-break', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (e) {
      console.warn(e);
    }
    refreshBackendState();
  };

  const triggerCreditsRoll = async () => {
    await triggerSound('normal');
    setTvAlert({
      icon: '📦',
      title: 'Session Break Active',
      message: 'Amazon Prime package delivered.',
      critical: false
    });
    setTimeout(() => setTvAlert(null), 5000);
    showToast('🎬 Session Break', 'Break triggered. Releasing package updates per contract rule.', '🎬', 'success');
    try {
      await fetch('http://localhost:3001/api/action/set-viewer-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'Break' })
      });
    } catch (e) {
      console.warn(e);
    }
    refreshBackendState();
  };

  void triggerCreditsRoll;

  const triggerEndSession = async () => {
    await triggerSound('summary');
    setTvAlert({
      icon: '📊',
      title: 'Session Completed',
      message: 'Contract session ended. Summary digest generated.',
      critical: false
    });
    setTimeout(() => setTvAlert(null), 5000);
    showToast('⏹ Session Ended', 'Viewing Contract marked completed. Generated session digest.', '📊', 'info');
    try {
      await fetch('http://localhost:3001/api/action/end-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (e) {
      console.warn(e);
    }
    refreshBackendState();
  };

  const simulateDevice = async (category: string, title: string, message: string, sourceDevice: string) => {
    soundManager.init().catch(() => {});
    try {
      const res = await fetch('http://localhost:3001/api/action/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, message, sourceDevice })
      });
      const data = await res.json();
      const decision = data.event;
      const policy = decision?.appliedRule || 'next_break';
      setLastTriggeredEvent({
        id: `${Date.now()}`,
        name: sourceDevice || title,
        policy: policy === 'interrupt_now' ? 'Interrupted Immediately' : policy === 'next_break' ? 'Held for Next Break' : 'Session Digest',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });

      if (decision?.appliedRule === 'interrupt_now') {
        triggerSound('critical').catch(() => {});
        setTvAlert({
          icon: '🚨',
          title: title,
          message: `${message} - Critical Alert`,
          critical: true
        });
        setTimeout(() => setTvAlert(null), 5000);
        showToast(`🚨 ${title}`, `${message} : Interrupted Immediately - 2 beeps`, '🚨', 'critical');
      } else if (decision?.appliedRule === 'next_break') {
        triggerSound('normal').catch(() => {});
        const toastIcon = category === 'health' ? '💧' : title.toLowerCase().includes('dad') ? '👨‍👧‍👦' : title.toLowerCase().includes('birthday') || title.toLowerCase().includes('mom') ? '🎂' : category === 'calendar' ? '📅' : '📦';
        setTvAlert({
          icon: toastIcon,
          title: title,
          message: `${message} | Held for session break - QuietCue+ Shield Active`,
          critical: false
        });
        setTimeout(() => setTvAlert(null), 5000);
        showToast(`${toastIcon} ${title}`, `${message} | Held for Next Break`, toastIcon, 'info');
      } else {
        triggerSound('summary').catch(() => {});
        const toastIcon = category === 'health' ? '💧' : title.toLowerCase().includes('dad') ? '👨‍👧‍👦' : title.toLowerCase().includes('birthday') || title.toLowerCase().includes('mom') ? '🎂' : category === 'calendar' ? '📅' : '💬';
        setTvAlert({
          icon: toastIcon,
          title: title,
          message: `${message} | Saved for session summary - QuietCue+ Shield Active`,
          critical: false
        });
        setTimeout(() => setTvAlert(null), 5000);
        showToast(`💬 ${title}`, `${message} : Queued for Session Summary`, '💬', 'info');
      }
      refreshBackendState();
    } catch {
      setLastTriggeredEvent({
        id: `${Date.now()}`,
        name: sourceDevice || title,
        policy: 'Simulated Locally',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      const toastIcon = category === 'health' ? '💧' : title.toLowerCase().includes('dad') ? '👨‍👧‍👦' : title.toLowerCase().includes('birthday') || title.toLowerCase().includes('mom') ? '🎂' : category === 'calendar' ? '📅' : '⚡';
      setTvAlert({
        icon: toastIcon,
        title: title,
        message: `${message} | Simulated locally - QuietCue+ Shield Active`,
        critical: false
      });
      setTimeout(() => setTvAlert(null), 5000);
      showToast(`Simulated: ${title}`, message, '⚡', 'info');
      refreshBackendState();
    }
  };

  const simulateAllConnectedDevices = async () => {
    if (isSimulatingAll) return;
    setIsSimulatingAll(true);
    showToast('Simulating Connected Devices ⚡', 'Triggering connected smart home sequence...', '⚡', 'info');

    const devicesToSimulate = [
      { cat: 'security', title: 'Critical Alert - Doorbell', msg: 'Front entrance camera detected urgent visitor.', name: 'Front Door Ring' },
      { cat: 'package', title: 'Package Delivered', msg: 'Amazon Prime package delivered safely.', name: 'Parcel Delivery' },
      { cat: 'calendar', title: "Dad's Day Reminder", msg: "Today is Dad's Day! Send warm greetings.", name: 'Alexa Calendar' },
      { cat: 'health', title: 'Hydration Routine', msg: 'Drink 250ml water to stay refreshed.', name: 'Health Monitor' },
      { cat: 'thermostat', title: 'Thermostat Update', msg: 'Target temperature reached: 72°F.', name: 'Thermostat' }
    ];

    for (let i = 0; i < devicesToSimulate.length; i++) {
      const dev = devicesToSimulate[i];
      await simulateDevice(dev.cat, dev.title, dev.msg, dev.name);
      await new Promise(resolve => setTimeout(resolve, 850));
    }

    setIsSimulatingAll(false);
    showToast('Simulation Complete ✓', 'All connected devices simulated against active contract.', '✅', 'success');
  };

  const cycleRulePolicy = async (category: string, currentPolicy: string) => {
    await soundManager.init();
    const policies = ['interrupt_now', 'next_break', 'summarize_later'];
    const nextPolicy = policies[(policies.indexOf(currentPolicy) + 1) % policies.length];
    
    try {
      await fetch('http://localhost:3001/api/action/update-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, policy: nextPolicy })
      });
      await triggerSound('normal');
      showToast(`Rule Updated: ${formatCategory(category)}`, `New policy: ${formatPolicy(nextPolicy)}`, '⚙', 'success');
      refreshBackendState();
    } catch {
      showToast(`Rule Updated`, `${formatCategory(category)} -> ${formatPolicy(nextPolicy)}`, '⚙', 'info');
    }
  };

  const toggleSoundPref = async (key: 'criticalSound' | 'normalSound' | 'routineSound', val: boolean) => {
    await soundManager.init();
    if (key === 'criticalSound') {
      setCriticalSound(val);
      if (val) soundManager.playCritical();
    } else if (key === 'normalSound') {
      setNormalSound(val);
      if (val) soundManager.playNormal();
    } else {
      setRoutineSound(val);
      if (val) soundManager.playSummary();
    }
    try {
      await fetch('http://localhost:3001/api/sound-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: val })
      });
      showToast('Sound Preferences Saved', `${key.replace('Sound', ' Sound')}: ${val ? 'Enabled' : 'Disabled'}`, '🔊', 'info');
    } catch {
      showToast('Sound Toggled', `${key.replace('Sound', ' Sound')} -> ${val ? 'ON' : 'OFF'}`, '🔊', 'info');
    }
  };

  const releaseNotification = async (id: string, title: string) => {
    await triggerSound('normal');
    try {
      await fetch('http://localhost:3001/api/action/release-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      showToast('Notification Released', `"${title}" displayed to TV screen.`, '📺', 'success');
      refreshBackendState();
    } catch {
      showToast('Notification Released', title, '📺', 'info');
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    showToast('Alexa+ Conversation', 'Chat conversation cleared.', '🗑️', 'info');
  };

  const handleResetDemo = async () => {
    await soundManager.init();
    setNotifications([]);
    setChatMessages([]);
    try {
      await fetch('http://localhost:3001/api/action/reset-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      await triggerSound('summary');
      showToast('Session Reset ↺', 'All session counters and conversations reset.', '🔄', 'success');
      refreshBackendState();
    } catch {
      setNotifications([]);
      setChatMessages([]);
      showToast('Session Reset ↺', 'All session counters and conversations reset.', '🔄', 'info');
    }
  };

  const handleSaveContract = async () => {
    await soundManager.init();
    await triggerSound('normal');
    const contractName = contract.name || 'Focus Mode';

    // 1. Persist contract configuration to backend store
    try {
      await fetch('http://localhost:3001/api/action/save-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract })
      });
    } catch (e) {
      console.warn('Backend save contract fallback:', e);
    }

    // 2. Trigger on-screen Fire TV HUD alert
    setTvAlert({
      icon: '📄',
      title: 'Viewing Contract Saved',
      message: `${contractName} active & persisted.`,
      critical: false
    });
    setTimeout(() => setTvAlert(null), 4500);

    // 4. Show Toast notification
    showToast('Contract Saved', `Active contract "${contractName}" saved and notifications updated.`, '✓', 'success');

    // 5. Return to home view
    setActiveTab('home');
    await refreshBackendState();
  };

  const handleResetContract = async () => {
    await soundManager.init();
    await triggerSound('summary');

    // 1. Reset rules in backend store
    try {
      const res = await fetch('http://localhost:3001/api/action/reset-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.contract) {
        setContract(data.contract);
      }
    } catch {
      // Local fallback
      setContract(prev => ({
        ...prev,
        name: 'Focus Mode',
        activityType: 'focus',
        rules: [
          { eventCategory: 'security', handlingPolicy: 'interrupt_now', priority: 1 },
          { eventCategory: 'package', handlingPolicy: 'next_break', priority: 2 },
          { eventCategory: 'thermostat', handlingPolicy: 'summarize_later', priority: 3 },
          { eventCategory: 'light', handlingPolicy: 'summarize_later', priority: 4 },
          { eventCategory: 'device_unavailable', handlingPolicy: 'next_break', priority: 5 }
        ]
      }));
    }

    // 2. Trigger simulated system notification event in backend
    try {
      await fetch('http://localhost:3001/api/action/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'system',
          title: 'Contract Reset to Default',
          message: 'Viewing Contract restored to default Focus Mode policies.',
          sourceDevice: 'Contract Manager'
        })
      });
    } catch (e) {
      console.warn('Backend event simulation fallback:', e);
    }

    // 3. Trigger on-screen TV HUD alert
    setTvAlert({
      icon: '↺',
      title: 'Contract Reset',
      message: 'Focus Mode default policies restored.',
      critical: false
    });
    setTimeout(() => setTvAlert(null), 4500);

    // 4. Show Toast notification
    showToast('Contract Reset', 'Restored to default Focus Mode policies.', '↺', 'info');
    await refreshBackendState();
  };

  const executeMcpTool = async (toolName: string, args: any = {}) => {
    setMcpLoading(true);
    await soundManager.init();
    try {
      let resultText = '';
      if (clientRef.current) {
        const res = await clientRef.current.callTool({ name: toolName, arguments: args });
        resultText = JSON.stringify(res, null, 2);
      } else {
        const res = await fetch('http://localhost:3001/api/state');
        const data = await res.json();
        resultText = JSON.stringify({ tool: toolName, executed: true, data }, null, 2);
      }
      setMcpResult(resultText);
      await triggerSound('normal');
      showToast(`MCP Tool Executed`, `Successfully ran ${cleanExplanation(toolName)}`, '⚡', 'success');
      refreshBackendState();
    } catch (e: any) {
      setMcpResult(`Error executing ${toolName}: ${e?.message || e}`);
      showToast(`MCP Call Failed`, e?.message || 'Error', '⚠', 'critical');
    } finally {
      setMcpLoading(false);
    }
  };

  // ================= AUTOMATED DEMO RUNNER SYSTEM =================
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);
  const [demoPaused, setDemoPaused] = useState<boolean>(false);
  const [demoSecondsRemaining, setDemoSecondsRemaining] = useState<number>(8);

  // Time offsets in user_voice_sample.mp3 (43.08 seconds total)
  const USER_VOICE_OFFSETS = [0, 7.5, 15.0, 20.0, 28.0, 36.0];

  const playUserVoiceAtStep = (stepIdx: number) => {
    try {
      if (!myVoiceAudioRef.current) {
        myVoiceAudioRef.current = new Audio('/user_voice_sample.mp3');
        myVoiceAudioRef.current.onended = () => setIsPlayingMyVoice(false);
      }
      myVoiceAudioRef.current.currentTime = USER_VOICE_OFFSETS[stepIdx] || 0;
      myVoiceAudioRef.current.play()
        .then(() => setIsPlayingMyVoice(true))
        .catch(e => console.log('User voice note:', e));
    } catch (e) {
      console.warn('Playback error:', e);
    }
  };

  const DEMO_STEPS = [
    {
      step: 1,
      title: 'Work From Home Focus Contract',
      tagline: 'Quiet screen while coding | Alexa+ Contract',
      durationSec: 8,
      script: "code an Alexa+ rule for my Fire TV. While I'm coding from home, keep the screen quiet.",
      execute: async () => {
        setActiveTab('home');
        setIsPlaying(true);
        await handleResetDemo();
      }
    },
    {
      step: 2,
      title: 'Production Deploy & Coffee Break Whisper',
      tagline: 'CI/CD event | Subtitle slot whisper alert',
      durationSec: 8,
      script: "But the moment my code deploys to production, whisper: go take a break.",
      execute: async () => {
        await simulateDevice('system', 'Production Deployment Succeeded', 'Build #419 deployed to production. QuietCue+ subtitle: Go take a break!', 'GitHub Actions');
      }
    },
    {
      step: 3,
      title: 'Alexa+ & Amazon Bedrock Synthesis',
      tagline: 'Natural language negotiation | Instant client sync',
      durationSec: 5,
      script: "Can you build that?",
      execute: async () => {
        await handleSendChat("code an Alexa+ rule for my Fire TV. While I'm coding from home, keep the screen quiet. But the moment my code deploys to production, whisper: go take a break.");
      }
    },
    {
      step: 4,
      title: 'Model Catalog & Agent Tool Registry',
      tagline: 'Bedrock Claude 3.5 & Gemini 3.8 | MCP Server Tools',
      durationSec: 8,
      script: "And also state the model catalog, deployment configuration, agent registry, tools registry,",
      execute: async () => {
        setActiveTab('mcp');
      }
    },
    {
      step: 5,
      title: 'RAG Knowledge Bases & Data Foundation',
      tagline: 'User focus habits memory | Household state foundation',
      durationSec: 8,
      script: "RAG or knowledge bases, data foundation,",
      execute: async () => {
        setActiveTab('contracts');
      }
    },
    {
      step: 6,
      title: 'Evaluation, Observability & Governance',
      tagline: 'Telemetry audit trails | Safety & privacy compliance',
      durationSec: 8,
      script: "evaluation, observability, security, and governance pipelines for this project.",
      execute: async () => {
        setActiveTab('home');
        await triggerEndSession();
      }
    }
  ];

  const startAutoDemo = async () => {
    await soundManager.init();
    setIsDemoRunning(true);
    setDemoStepIndex(0);
    setDemoPaused(false);
    setDemoSecondsRemaining(DEMO_STEPS[0].durationSec);
    showToast('🎬 Showcase Started', 'Playing your real recorded voice track.', '🎧', 'success');
    DEMO_STEPS[0].execute();
    playUserVoiceAtStep(0);
  };

  const pauseAutoDemo = () => {
    setDemoPaused(true);
    if (myVoiceAudioRef.current) {
      myVoiceAudioRef.current.pause();
      setIsPlayingMyVoice(false);
    }
    showToast('Demo Paused', 'Audio and timer paused.', '⏸', 'info');
  };

  const resumeAutoDemo = () => {
    setDemoPaused(false);
    if (myVoiceAudioRef.current) {
      myVoiceAudioRef.current.play().then(() => setIsPlayingMyVoice(true)).catch(() => {});
    }
    showToast('Demo Resumed', 'Continuing with your voice.', '▶', 'info');
  };

  const skipAutoDemoStep = (direction: 1 | -1) => {
    const nextIdx = demoStepIndex + direction;
    if (nextIdx >= 0 && nextIdx < DEMO_STEPS.length) {
      setDemoStepIndex(nextIdx);
      setDemoSecondsRemaining(DEMO_STEPS[nextIdx].durationSec);
      DEMO_STEPS[nextIdx].execute();
      playUserVoiceAtStep(nextIdx);
    } else if (nextIdx >= DEMO_STEPS.length) {
      exitAutoDemo();
    }
  };

  const exitAutoDemo = () => {
    setIsDemoRunning(false);
    setDemoPaused(false);
    if (myVoiceAudioRef.current) {
      myVoiceAudioRef.current.pause();
      myVoiceAudioRef.current.currentTime = 0;
      setIsPlayingMyVoice(false);
    }
    showToast('Demo Exited', 'Returned to manual interactive mode.', 'ℹ', 'info');
  };

  void startAutoDemo;
  void pauseAutoDemo;
  void resumeAutoDemo;
  void skipAutoDemoStep;
  void exitAutoDemo;

  // Demo countdown timer
  useEffect(() => {
    if (!isDemoRunning || demoPaused) return;
    const interval = setInterval(() => {
      setDemoSecondsRemaining(prev => {
        if (prev <= 1) {
          setDemoStepIndex(curr => {
            const next = curr + 1;
            if (next < DEMO_STEPS.length) {
              setDemoSecondsRemaining(DEMO_STEPS[next].durationSec);
              DEMO_STEPS[next].execute();
              playUserVoiceAtStep(next);
              return next;
            } else {
              setIsDemoRunning(false);
              if (myVoiceAudioRef.current) {
                myVoiceAudioRef.current.pause();
                setIsPlayingMyVoice(false);
              }
              showToast('🎬 Showcase Complete', 'The 6-step automated scenario finished successfully!', '🎉', 'success');
              return curr;
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemoRunning, demoPaused, demoStepIndex]);

  if (isTvClientView) {
    return (
      <TvClient
        onExitTvMode={() => {
          setIsTvClientView(false);
          if (window.location.search.includes('client=tv')) {
            window.history.replaceState({}, '', '/');
          }
        }}
        currentLang={currentLang}
        onSelectLanguage={handleSelectLanguage}
      />
    );
  }

  return (
    <div className="app-container-clean">
      {/* TOAST BANNER */}
      {toast && (
        <div className={`toast-banner ${toast.type || 'info'}`}>
          <div className="toast-icon">{toast.icon || 'ℹ'}</div>
          <div className="toast-content">
            <span className="toast-title">{toast.title}</span>
            <span className="toast-desc">{toast.desc}</span>
          </div>
          <button className="toast-close-btn" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="top-navbar-clean" style={{
        backgroundColor: theme === 'light' ? '#FFFFFF' : theme === 'warm' ? '#1A120B' : '#0A0D14',
        borderBottom: theme === 'light' ? '1px solid #CBD5E1' : theme === 'warm' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: theme === 'light' ? '0 1px 4px rgba(15, 23, 42, 0.06)' : 'none'
      }}>
        {/* Brand Block: Alexa+ Fire TV Logo with QuietCue+ one space down and snug context line */}
        <div className="navbar-brand-block" onClick={() => setActiveTab('home')} title="QuietCue+ Home" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <img
            src={theme === 'light' ? '/quietcue_brand_combo_light.svg' : '/quietcue_brand_combo.svg'}
            alt="QuietCue+ Alexa Fire TV"
            className="brand-combo-icon"
          />
          <div className="brand-text-cluster" style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <div className="brand-title-main" style={{ lineHeight: 1.15, margin: 0, padding: 0 }}>
              <span className="brand-word-quiet">Quiet</span>
              <span className="brand-word-cue" style={{ color: theme === 'light' ? '#0F172A' : '#FFFFFF' }}>Cue+</span>
            </div>
            <span className="brand-tagline-sub" style={{ marginTop: '0px', lineHeight: 1.25, paddingTop: '0px', color: theme === 'light' ? '#334155' : '#94A3B8' }}>
              Context intelligence that knows when to speak, when to whisper, and when to wait.
            </span>
          </div>
        </div>

        <div className="navbar-right-controls">
          <button
            className="firetv-client-mode-btn"
            onClick={() => setIsTvClientView(true)}
            title="Launch Fire TV Client"
            style={{
              backgroundColor: '#2563EB',
              borderColor: '#1D4ED8',
              color: '#FFFFFF',
              fontWeight: 600,
              borderRadius: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
              </svg>
              <span className="firetv-mode-label">Fire TV Client</span>
            </div>
            <svg
              className="firetv-action-icon"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>

          <div className="focus-badge" onClick={() => setActiveTab('contracts')} style={{
            cursor: 'pointer',
            backgroundColor: theme === 'light' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
            borderColor: theme === 'light' ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
            color: theme === 'light' ? '#0F172A' : '#F8FAFC',
            fontWeight: 700,
            borderRadius: '6px',
            boxShadow: theme === 'light' ? '0 1px 2px rgba(15, 23, 42, 0.05)' : 'none'
          }} title="Click to view Active Contract">
            <span style={{ fontSize: '14px', lineHeight: 1 }}>
              {contract.activityType === 'family' ? '👥' : contract.activityType === 'sports' ? '⚽' : contract.activityType === 'vr' ? '🥽' : '🎬'}
            </span>
            <span style={{ color: theme === 'light' ? '#0F172A' : '#F8FAFC' }}>{formatContractName(contract.name, currentLang, contract.activityType)}</span>
            <span className="badge-dot"></span>
          </div>
          
          {/* Interactive Demo Video Walkthrough Trigger */}
          <button
            type="button"
            className="demo-walkthrough-pill"
            onClick={() => setShowDemoModal(true)}
            title="Launch interactive submission walkthrough with VR Immersion"
            style={{
              backgroundColor: theme === 'light' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
              borderColor: theme === 'light' ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
              color: theme === 'light' ? '#0F172A' : '#F8FAFC',
              fontWeight: 700,
              borderRadius: '6px',
              boxShadow: theme === 'light' ? '0 1px 2px rgba(15, 23, 42, 0.05)' : 'none'
            }}
          >
            <span style={{ color: '#EA580C', fontSize: '14px' }}>📅</span>
            <span style={{ color: theme === 'light' ? '#0F172A' : '#F8FAFC' }}>Demo Walkthrough</span>
          </button>

          {/* Eye-friendly Visual Theme Switcher */}
          <div className="theme-toggle-strip" title="Visual Comfort Theme" style={{
            backgroundColor: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.04)',
            borderColor: theme === 'light' ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '3px'
          }}>
            <button
              className={`theme-chip-pill ${theme === 'slate' ? 'active' : ''}`}
              onClick={() => setTheme('slate')}
              title="Slate Grey : Refined modern charcoal grey dark mode"
              style={{
                backgroundColor: theme === 'slate' ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
                borderColor: theme === 'slate' ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                color: theme === 'slate' ? '#FFFFFF' : (theme === 'light' ? '#0F172A' : '#CBD5E1'),
                fontWeight: theme === 'slate' ? 700 : 600,
                borderRadius: '6px'
              }}
            >
              <span style={{ fontSize: '11px', opacity: 1 }}>⚪</span>
              <span>Grey</span>
            </button>
            <button
              className={`theme-chip-pill ${theme === 'warm' ? 'active' : ''}`}
              onClick={() => setTheme('warm')}
              title="Warm Dusk : Low-glare amber & charcoal"
              style={{
                backgroundColor: theme === 'warm' ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                borderColor: theme === 'warm' ? '#F59E0B' : 'transparent',
                color: theme === 'warm' ? '#F59E0B' : (theme === 'light' ? '#0F172A' : '#CBD5E1'),
                fontWeight: theme === 'warm' ? 700 : 600,
                borderRadius: '6px'
              }}
            >
              <span style={{ fontSize: '13px', color: '#F59E0B' }}>🔆</span>
              <span>Warm</span>
            </button>
            <button
              className={`theme-chip-pill ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Clean Daylight : Soft off-white studio mode"
              style={{
                backgroundColor: theme === 'light' ? '#FFFFFF' : 'transparent',
                borderColor: theme === 'light' ? '#0284C7' : 'transparent',
                color: theme === 'light' ? '#0284C7' : '#CBD5E1',
                fontWeight: theme === 'light' ? 700 : 600,
                borderRadius: '6px'
              }}
            >
              <span style={{ fontSize: '13px' }}>☀️</span>
              <span>Light</span>
            </button>
          </div>

          {/* Online Language Selector Dropdown */}
          <div className="language-dropdown-container" ref={langDropdownRef}>
            <button
              type="button"
              className={`language-dropdown-trigger ${isLangDropdownOpen ? 'open' : ''}`}
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              title="Select Language"
              aria-label="Select Interface Language"
              aria-expanded={isLangDropdownOpen}
              style={{
                backgroundColor: theme === 'light' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                borderColor: theme === 'light' ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
                color: theme === 'light' ? '#0F172A' : '#F8FAFC',
                fontWeight: 700,
                borderRadius: '6px',
                boxShadow: theme === 'light' ? '0 1px 2px rgba(15, 23, 42, 0.05)' : 'none'
              }}
            >
              <span className="lang-code-pill">US</span>
              <span className="lang-trigger-label" style={{ color: theme === 'light' ? '#0F172A' : '#F8FAFC' }}>{SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.label || 'English'}</span>
              <span className="lang-trigger-chevron" style={{ color: '#0284C7' }}>{isLangDropdownOpen ? '▴' : '▾'}</span>
            </button>

            {isLangDropdownOpen && (
              <div className="language-dropdown-menu" role="menu">
                <div className="language-dropdown-header">Language / भाषा</div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    role="menuitem"
                    className={`language-dropdown-item ${currentLang === lang.code ? 'selected' : ''}`}
                    onClick={() => {
                      handleSelectLanguage(lang.code);
                      setIsLangDropdownOpen(false);
                    }}
                    title={`Switch interface to ${lang.label}`}
                  >
                    <span className="lang-item-flag">{lang.flag}</span>
                    <span className="lang-item-name">{lang.label}</span>
                    {currentLang === lang.code && <span className="lang-item-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="circle-btn" onClick={() => setActiveTab('notifications')} title="View Notifications" style={{
            backgroundColor: theme === 'light' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
            borderColor: theme === 'light' ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
            color: theme === 'light' ? '#0F172A' : '#F8FAFC',
            borderRadius: '6px',
            boxShadow: theme === 'light' ? '0 1px 2px rgba(15, 23, 42, 0.05)' : 'none',
            fontSize: '14px'
          }}>🔔</div>
          <div className="circle-btn" onClick={() => setActiveTab('settings')} title="Settings & Audio" style={{
            backgroundColor: theme === 'light' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
            borderColor: theme === 'light' ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
            color: theme === 'light' ? '#0F172A' : '#F8FAFC',
            borderRadius: '6px',
            boxShadow: theme === 'light' ? '0 1px 2px rgba(15, 23, 42, 0.05)' : 'none',
            fontSize: '14px'
          }}>⚙</div>
        </div>
      </header>

      {/* MAIN CONTENT FLOW */}
      <main className="main-content-flow">
        
        {/* DASHBOARD 2-COLUMN GRID CONTAINER: Alexa+ stays at top right corner */}
        <div className="dashboard-grid-container">
          
          {/* LEFT STACK */}
          <div className="left-stack">

            {/* HORIZONTAL MAIN MENU STRIP (TOP OF SCREEN) */}
            <nav className="horizontal-menu-strip">
              <div className={`horizontal-nav-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
                <svg className="nav-svg-icon" viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>{translateUI('dashboard', currentLang)}</span>
              </div>

              <div className={`horizontal-nav-btn ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}>
                <svg className="nav-svg-icon" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>{translateUI('playbook', currentLang)}</span>
              </div>

              <div className={`horizontal-nav-btn ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => setActiveTab('devices')}>
                <svg className="nav-svg-icon" viewBox="0 0 24 24">
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                  <polyline points="17 2 12 7 7 2"></polyline>
                </svg>
                <span>{translateUI('devices', currentLang)}</span>
              </div>

              <div className={`horizontal-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
                <svg className="nav-svg-icon" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span>{translateUI('notifications', currentLang)}</span>
              </div>

              <div className={`horizontal-nav-btn ${activeTab === 'conversation' ? 'active' : ''}`} onClick={() => setActiveTab('conversation')}>
                <svg className="nav-svg-icon" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>{translateUI('conversation', currentLang)}</span>
              </div>

              <div className={`horizontal-nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                <svg className="nav-svg-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>{translateUI('settings', currentLang)}</span>
              </div>
            </nav>

            {/* FIRE TV CLIENT (TV MODE) - TOP SCREEN SHOWCASE */}
            <div className="panel-card firetv-top-showcase">
              <div className="panel-header-row">
                <div className="panel-header-left">
                  <span>📺</span>
                  <span className="panel-heading">Fire TV Client - TV Mode</span>
                  <span className="green-status-tag">Online</span>
                </div>
              </div>

              {/* COMBINED SINGLE ROW: Active Mode & Stream Switcher + Mode Timer */}
              <div className="firetv-mode-tabs-strip combined-mode-timer-strip" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                margin: '6px 0 10px 0',
                fontSize: '11px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="mode-tabs-label" style={{ fontSize: '11px', fontWeight: 700 }}>
                    {translateUI('activeModeAndStream', currentLang).replace(/:+$/, '')}:
                  </span>
                  <div className="mode-tabs-pill-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className={`mode-tab-pill ${(activeMedia.key === 'feature' || activeMedia.key === 'movie') ? 'active' : ''}`}
                      onClick={() => switchMode('Feature Night', 'feature', '🎬')}
                      title="Feature Night"
                    >
                      <span>🎬</span>
                      <span>{translateUI('movieNight', currentLang)}</span>
                    </button>
                    <button
                      className={`mode-tab-pill ${activeMedia.key === 'focus' ? 'active' : ''}`}
                      onClick={() => switchMode('Focus Mode', 'study', '🎯')}
                      title="Focus Mode"
                    >
                      <span>🎯</span>
                      <span>{translateUI('focusWork', currentLang)}</span>
                    </button>
                    <button
                      className={`mode-tab-pill ${activeMedia.key === 'sports' ? 'active' : ''}`}
                      onClick={() => switchMode('Sports Live', 'sports', '🏎️')}
                      title="Sports Live"
                    >
                      <span>🏎️</span>
                      <span>{translateUI('sportsLive', currentLang)}</span>
                    </button>
                    <button
                      className={`mode-tab-pill ${activeMedia.key === 'family' ? 'active' : ''}`}
                      onClick={() => switchMode('Family Time', 'family', '👨‍👩‍👧')}
                      title="Family Presentation"
                    >
                      <span>👨‍👩‍👧</span>
                      <span>{translateUI('familyTime', currentLang)}</span>
                    </button>
                  </div>
                </div>

                {/* Integrated Mode Timer in Same Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--blue-primary)', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⏱️</span>
                    <span>{translateUI('setModeTimer', currentLang).replace(/:+$/, '')}:</span>
                  </span>

                  <input 
                    type="number" 
                    min="1" 
                    max="240" 
                    value={customTimerMinutes} 
                    onChange={(e) => setCustomTimerMinutes(e.target.value)} 
                    className="mode-timer-input"
                    style={{ 
                      width: '58px', 
                      padding: '3px 6px', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      textAlign: 'center' 
                    }}
                    placeholder={translateUI('customMinPlaceholder', currentLang)}
                  />
                  <button 
                    className="mode-timer-preset-btn"
                    onClick={() => handleSetModeTimer(parseInt(customTimerMinutes, 10) || 25)}
                    title="Set custom timer"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    {translateUI('setTimerBtn', currentLang)}
                  </button>

                  {modeTimer && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: modeTimer.isRunning ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.22)', 
                        border: `1px solid ${modeTimer.isRunning ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`,
                        color: modeTimer.isRunning ? '#34D399' : '#FBBF24',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10.5px',
                        fontWeight: 700
                      }}>
                        <span>⏱️ {formatTimerSeconds(modeTimer.remainingSeconds)}</span>
                      </span>
                      <button 
                        onClick={modeTimer.isRunning ? handlePauseModeTimer : handleResumeModeTimer}
                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#CBD5E1', borderRadius: '4px', padding: '2px 5px', fontSize: '10px', cursor: 'pointer' }}
                        title={modeTimer.isRunning ? 'Pause timer' : 'Resume timer'}
                      >
                        {modeTimer.isRunning ? '⏸' : '▶'}
                      </button>
                      <button 
                        onClick={handleCancelModeTimer}
                        style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', borderRadius: '4px', padding: '2px 5px', fontSize: '10px', cursor: 'pointer' }}
                        title="Cancel timer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* VISUAL 1: Feature Night / Active Immersion Card (Placed BEFORE Visual 2) */}
              <div 
                className="focus-hero-card"
                style={{ 
                  backgroundImage: `url('${activeMedia.poster || '/feature_night_bg.jpg'}')`, 
                  margin: '0 0 12px 0', 
                  borderRadius: '14px',
                  padding: 0,
                  height: '340px',
                  minHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 28%',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div className="focus-hero-gradient"></div>
                <div className="focus-hero-content" style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '20px 28px 16px 28px', background: 'linear-gradient(to top, rgba(11, 14, 20, 0.82) 0%, rgba(11, 14, 20, 0.35) 60%, transparent 100%)' }}>
                  <div className="focus-hero-info" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="focus-target-circle" style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #38BDF8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/focus_mode_icon.png" alt="Focus Mode" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                    </div>
                    <div className="focus-hero-headings">
                      <div className="focus-title-flex" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="focus-title-text" style={{ fontSize: '18px', fontWeight: 800, textShadow: '0 2px 10px rgba(0, 0, 0, 0.95)' }}>{formatContractName(contract.name, currentLang, contract.activityType)}</span>
                        <span className="active-chip" style={{ background: '#10B981', color: '#052E16', fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>{translateUI('statusActive', currentLang)}</span>
                      </div>
                      <p className="focus-description" style={{ fontSize: '12px', margin: '4px 0 0 0', maxWidth: '640px', lineHeight: 1.45, textShadow: '0 2px 8px rgba(0, 0, 0, 0.95)' }}>
                        Smart screen focus that respects real world priorities - critical safety alerts and parcel deliveries arrive instantly, while everyday notifications wait for break time.
                      </p>
                    </div>
                  </div>
                  <button className="contract-details-btn" onClick={() => setActiveTab('contracts')} title="See what alerts get through" style={{
                    background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                    border: '1px solid rgba(96, 165, 250, 0.6)',
                    color: '#FFFFFF',
                    padding: '8px 18px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                  }}>
                    <span style={{ fontSize: '13px', color: '#93C5FD' }}>✦</span>
                    <span>What Gets Through</span>
                    <span style={{ fontSize: '13px', opacity: 0.8 }}>›</span>
                  </button>
                </div>
              </div>

              {/* VISUAL 2: Fire TV Screen Simulation & Companion Voice Strip */}
              <div className="firetv-wrapper">
                <div className="firetv-tv-device-container">
                  <div className="firetv-tv-chassis">
                    <div className="firetv-tv-top-bezel">
                      <div className="tv-camera-notch"></div>
                    </div>
                    <div className="firetv-tv-screen">
                      <div 
                        className="firetv-video-card"
                        style={{ backgroundImage: `url('${activeMedia.poster}')` }}
                      >
                        <video 
                          ref={videoRef}
                          key={activeMedia.video}
                          className="firetv-bg-video"
                          src={activeMedia.video}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ opacity: isPlaying ? 0.85 : 0.25 }}
                        />
                        <div className="video-vignette"></div>

                        {/* Top status bar on video */}
                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              background: 'rgba(0, 0, 0, 0.65)', 
                              backdropFilter: 'blur(4px)',
                              padding: '3px 8px', 
                              borderRadius: '12px', 
                              fontSize: '10.5px', 
                              color: isPlaying ? '#4ADE80' : '#FBBF24', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '5px',
                              fontWeight: 600
                            }}>
                              <span style={{ color: isPlaying ? '#4ADE80' : '#FBBF24', fontSize: '9px' }}>●</span> {isPlaying ? translateUI('playing', currentLang) : translateUI('paused', currentLang)}
                            </span>

                            {modeTimer && (
                              <span style={{
                                background: modeTimer.isRunning ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                                border: `1px solid ${modeTimer.isRunning ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)'}`,
                                backdropFilter: 'blur(4px)',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '10.5px',
                                color: modeTimer.isRunning ? '#34D399' : '#FBBF24',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700
                              }}>
                                <span>⏱️</span>
                                <span>{formatTimerSeconds(modeTimer.remainingSeconds)} | {formatContractName(modeTimer.modeName, currentLang)}</span>
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>9:24 PM</span>
                            <span style={{ fontSize: '11px' }} title="Wi-Fi Active">📶</span>
                            <span style={{ fontSize: '11px' }} title="Alexa Voice Active">🎙️</span>
                            <button 
                              className="play-pause-btn" 
                              onClick={togglePlayback}
                              title={isPlaying ? 'Pause video' : 'Play video'}
                              style={{ 
                                background: 'rgba(56, 189, 248, 0.25)', 
                                border: '1px solid rgba(56, 189, 248, 0.5)', 
                                borderRadius: '6px', 
                                color: '#38BDF8', 
                                padding: '3px 10px', 
                                fontSize: '11px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                fontWeight: 600,
                                marginLeft: '4px'
                              }}
                            >
                              {isPlaying ? '⏸ ' + translateUI('pauseMovie', currentLang) : '▶ ' + translateUI('resumeMovie', currentLang)}
                            </button>
                          </div>
                        </div>

                        {/* Realtime Alexa Voice Typing Overlay on Fire TV screen */}
                        {voiceTypingState.active && (
                          <VoiceTypingOverlay 
                            movie={voiceTypingState.targetMovie} 
                            typedText={voiceTypingState.typedText} 
                            isMatched={voiceTypingState.isMatched} 
                            statusText={voiceTypingState.statusText} 
                          />
                        )}

                        {/* Realtime On-Screen TV HUD Banner when an alert is active */}
                        {tvAlert ? (
                          <div className={`firetv-onscreen-hud ${tvAlert.critical ? 'critical' : ''}`}>
                            <span className="tv-hud-icon">{tvAlert.icon}</span>
                            <div className="tv-hud-text">
                              <strong>{tvAlert.title}</strong>
                              <span>{tvAlert.message}</span>
                            </div>
                          </div>
                        ) : (() => {
                          const heldDad = notifications.find(n => n.status === 'pending' && n.event?.title?.toLowerCase().includes('dad'));
                          const heldCelebration = heldDad || notifications.find(n => n.status === 'pending' && (n.event?.category === 'calendar' || n.event?.title?.toLowerCase().includes('birthday')));
                          const heldCount = notifications.filter(n => n.status === 'pending').length;

                          return (
                            <div className="video-center-title">
                              <div className="video-shield-icon" style={heldDad ? { background: '#F59E0B' } : undefined}>
                                {heldDad ? '👨‍👧‍👦' : heldCelebration ? '🎂' : '🛡'}
                              </div>
                              <div className="video-text-lines">
                                <span className="video-title-main">
                                  {heldDad ? "Dad's Day Reminder Held" : heldCelebration ? `${heldCelebration.event.title} Held` : activeMedia.title}
                                </span>
                                <span className="video-title-sub">
                                  {heldDad 
                                    ? "Protected by QuietCue+ Shield | Stored safely for session break ☕" 
                                    : heldCelebration 
                                      ? "Protected by QuietCue+ Shield | Stored safely for session break ☕" 
                                      : heldCount > 0 
                                        ? `QuietCue+ Shield Active | ${heldCount} notifications held for session break` 
                                        : activeMedia.sub}
                                </span>
                              </div>
                              {heldCelebration && (
                                <button
                                  type="button"
                                  onClick={triggerViewingBreak}
                                  style={{
                                    marginLeft: '8px',
                                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                    color: '#0F172A',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                                  }}
                                  title="Release celebration notice now"
                                >
                                  ☕ Break Now
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* What Gets Through: 3 Policy Pillars Overlay from user reference */}
                        <div className="firetv-policy-pillars-row">
                          <div className="tv-policy-pillar pillar-interrupt">
                            <div className="pillar-top-row">
                              <span className="pillar-icon">🚨</span>
                              <span className="pillar-title">{translateUI('interruptNowTitle', currentLang)}</span>
                            </div>
                            <span className="pillar-desc">{translateUI('interruptNowDesc', currentLang)}</span>
                            <span className="pillar-sound">{translateUI('interruptNowSound', currentLang)}</span>
                          </div>
                          <div className="tv-policy-pillar pillar-break">
                            <div className="pillar-top-row">
                              <span className="pillar-icon">📦</span>
                              <span className="pillar-title">{translateUI('waitForBreakTitle', currentLang)}</span>
                            </div>
                            <span className="pillar-desc">{translateUI('waitForBreakDesc', currentLang)}</span>
                            <span className="pillar-sound">{translateUI('waitForBreakSound', currentLang)}</span>
                          </div>
                          <div className="tv-policy-pillar pillar-digest">
                            <div className="pillar-top-row">
                              <span className="pillar-icon">🌙</span>
                              <span className="pillar-title">{translateUI('sessionDigestTitle', currentLang)}</span>
                            </div>
                            <span className="pillar-desc">{translateUI('sessionDigestDesc', currentLang)}</span>
                            <span className="pillar-sound">{translateUI('sessionDigestSound', currentLang)}</span>
                          </div>
                        </div>

                        {/* Official Fire TV Home Navigation & App Strip from user reference */}
                        <div className="firetv-apps-nav-strip">
                          <div className="tv-nav-left">
                            <span className="tv-nav-chip active">Home</span>
                            <span className="tv-nav-chip">Find</span>
                            <span className="tv-nav-chip">Live</span>
                          </div>
                          <div className="tv-apps-icons-row">
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

                        {/* Playback timeline scrub */}
                        <div className="video-timeline">
                          <span style={{ cursor: 'pointer', fontSize: '11px' }} onClick={togglePlayback}>
                            {isPlaying ? '⏸' : '▶'}
                          </span>
                          <div className="timeline-bar">
                            <div className="timeline-fill" style={{ width: `${Math.min(100, (playbackSeconds / 8100) * 100)}%` }}></div>
                          </div>
                          <span>{formatPlaybackTime(playbackSeconds)} / 2:15:00</span>
                        </div>
                      </div>
                    </div>

                    {/* Physical Smart TV Metallic Bottom Chin with Fire TV center logo */}
                    <div className="firetv-tv-bottom-chin">
                      <div className="firetv-chin-center-mark">
                        <span className="firetv-chin-logo">fire tv</span>
                      </div>
                    </div>
                  </div>

                  {/* Silver Stand Legs */}
                  <div className="firetv-tv-stand-legs-row">
                    <div className="tv-stand-leg leg-left"></div>
                    <div className="tv-stand-leg leg-right"></div>
                  </div>
                </div>

                {/* Alexa Movie Voice Calling & Auto-Typing Strip: PLACED BESIDE FIRE TV IN MAIN ROW */}
                <div className="alexa-voice-calling-strip" style={{ flex: 1, marginTop: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="alexa-voice-soundwave" style={{ height: '16px' }}>
                        <div className="alexa-voice-bar" style={{ height: '6px' }}></div>
                        <div className="alexa-voice-bar" style={{ height: '12px' }}></div>
                        <div className="alexa-voice-bar" style={{ height: '16px' }}></div>
                        <div className="alexa-voice-bar" style={{ height: '10px' }}></div>
                        <div className="alexa-voice-bar" style={{ height: '6px' }}></div>
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                        {translateUI('alexaVoiceHeader', currentLang)}
                      </span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>{translateUI('alexaVoiceSub', currentLang)}</span>
                  </div>

                  {voiceTypingState.active && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '8px 14px',
                      background: 'rgba(30, 34, 42, 0.94)',
                      border: '1px solid rgba(56, 189, 248, 0.55)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4), 0 0 16px rgba(56, 189, 248, 0.25)',
                      animation: 'slideInVoiceHud 0.25s ease-out'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '14px' }}>🎙️</span>
                        <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>
                          Alexa called: "{voiceTypingState.targetMovie}"
                        </span>
                      </div>

                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0, 0, 0, 0.55)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '6px',
                        padding: '4px 10px'
                      }}>
                        <span style={{ fontSize: '12px' }}>🔍</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.3px' }}>
                          {voiceTypingState.typedText}
                          {!voiceTypingState.isMatched && <span className="typing-cursor"></span>}
                        </span>
                      </div>

                      {!voiceTypingState.isMatched && (
                        <div className="voice-search-status-tag voice-status-typing">
                          <span>🎙️</span>
                          <span>{translateUI('autoTypingOnTv', currentLang)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category 1: Entertainment & Movies */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                    <span className="voice-category-label movies-label">🎬 {translateUI('categoryMovies', currentLang)}:</span>
                    <div className="alexa-voice-chips-container" style={{ margin: 0 }}>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Feature Presentation')}>
                        <span>🎬</span>
                        <span>{translateUI('chipInterstellar', currentLang)}</span>
                      </button>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Nature Documentary')}>
                        <span>🐬</span>
                        <span>{translateUI('chipRingsOfPower', currentLang)}</span>
                      </button>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Live Sports Action')}>
                        <span>🏎️</span>
                        <span>{translateUI('chipFormula1', currentLang)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Category 2: Lifestyle & Focus Routines */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="voice-category-label routines-label">🌿 {translateUI('categoryRoutines', currentLang)}:</span>
                    <div className="alexa-voice-chips-container" style={{ margin: 0 }}>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Focus Terminal')}>
                        <span>💻</span>
                        <span>{translateUI('chipMatrix', currentLang)}</span>
                      </button>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Morning Lifestyle Routine')}>
                        <span>☀️</span>
                        <span>{translateUI('chipMorningRoutine', currentLang)}</span>
                      </button>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Hydration & Wellness Reset')}>
                        <span>💧</span>
                        <span>{translateUI('chipHydrationReset', currentLang)}</span>
                      </button>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Bedtime Quiet Routine')}>
                        <span>🌙</span>
                        <span>{translateUI('chipBedtimeRoutine', currentLang)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Category 3: Surprises & Quick Picks */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="voice-category-label surprises-label">✨ {translateUI('categorySurprises', currentLang)}:</span>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Surprise Family Feature Night')}>
                        <span>🍿</span>
                        <span>{translateUI('chipSurpriseMovie', currentLang)}</span>
                      </button>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('Surprise Grand Prix Action')}>
                        <span>🏎️</span>
                        <span>{translateUI('chipSurpriseRacing', currentLang)}</span>
                      </button>
                      <button className="alexa-voice-chip" onClick={() => runVoiceTypingAnimation('VR Spatial Immersion')}>
                        <span>🥽</span>
                        <span>{translateUI('chipVrStream', currentLang)}</span>
                      </button>
                    </div>

                    {/* Custom Command Caller */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="text" 
                        value={customMovieInput} 
                        onChange={e => setCustomMovieInput(e.target.value)} 
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customMovieInput.trim()) {
                            runVoiceTypingAnimation(customMovieInput.trim());
                            setCustomMovieInput('');
                          }
                        }}
                        placeholder={translateUI('typeCommandPlaceholder', currentLang)} 
                        style={{
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          color: '#FFFFFF',
                          fontSize: '11.5px',
                          outline: 'none',
                          width: '210px'
                        }}
                      />
                      <button 
                        onClick={() => {
                          if (customMovieInput.trim()) {
                            runVoiceTypingAnimation(customMovieInput.trim());
                            setCustomMovieInput('');
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #1D4ED8 0%, #0284C7 100%)',
                          border: '1px solid rgba(56, 189, 248, 0.6)',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {translateUI('callAlexaBtn', currentLang)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* THREE STATS CARDS ROW */}
            <div className="three-cards-row">
              
              {/* Connected Devices */}
              <div className="panel-card">
                <div className="panel-header-row">
                  <div className="panel-header-left">
                    <span>📺</span>
                    <span className="panel-heading">{translateUI('connectedDevices', currentLang)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn-secondary-action"
                      onClick={simulateAllConnectedDevices}
                      disabled={isSimulatingAll}
                      style={{
                        fontSize: '11px',
                        padding: '3px 9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: theme === 'light' ? '#FFFFFF' : 'rgba(37, 99, 235, 0.15)',
                        borderColor: theme === 'light' ? '#CBD5E1' : 'rgba(59, 130, 246, 0.4)',
                        color: theme === 'light' ? '#1D4ED8' : '#60A5FA',
                        fontWeight: 700,
                        cursor: 'pointer',
                        borderRadius: '6px'
                      }}
                      title="Simulate all connected devices in sequence"
                    >
                      <span>{isSimulatingAll ? '⏳' : '⚡'}</span>
                      <span>{isSimulatingAll ? 'Simulating...' : 'Simulate All'}</span>
                    </button>
                    <span 
                      className="link-chevron" 
                      onClick={() => setActiveTab('devices')} 
                      title="Open full devices simulator modal"
                      style={{ cursor: 'pointer', fontSize: '11px', color: theme === 'light' ? '#0F172A' : '#94A3B8' }}
                    >
                      Simulator ↗
                    </span>
                  </div>
                </div>

                <div className="items-list">
                  <div className="list-item-row" onClick={() => simulateDevice('system', 'Fire TV', 'Stream state active: 4K playback.', 'Fire TV')} title="Click to trigger Fire TV event">
                    <div className="item-left-flex">
                      <div className="icon-square sq-blue">📺</div>
                      <span className="item-primary-label">{translateUI('livingRoomTv', currentLang)}</span>
                    </div>
                    <span className="green-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{translateUI('statusOnline', currentLang)}</span>
                      <span style={{ fontSize: '10px', color: '#38BDF8' }}>⚡</span>
                    </span>
                  </div>

                  <div className="list-item-row" onClick={() => simulateDevice('thermostat', 'Thermostat Alert', 'Target temperature reached: 72°F.', 'Thermostat')} title="Click to trigger Thermostat event">
                    <div className="item-left-flex">
                      <div className="icon-square sq-amber">🌡</div>
                      <span className="item-primary-label">{translateUI('thermostat', currentLang)}</span>
                    </div>
                    <span className="green-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>72°F | {translateUI('statusOnline', currentLang)}</span>
                      <span style={{ fontSize: '10px', color: '#F59E0B' }}>⚡</span>
                    </span>
                  </div>

                  <div className="list-item-row" onClick={() => simulateDevice('light', 'Smart Lights', 'Patio lighting set to 20%.', 'Smart Lights')} title="Click to trigger Smart Lights event">
                    <div className="item-left-flex">
                      <div className="icon-square sq-cyan">💡</div>
                      <span className="item-primary-label">{translateUI('smartLights', currentLang)}</span>
                    </div>
                    <span className="green-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{translateUI('statusOnOnline', currentLang)}</span>
                      <span style={{ fontSize: '10px', color: '#06B6D4' }}>⚡</span>
                    </span>
                  </div>

                  <div className="list-item-row" onClick={() => simulateDevice('security', 'Critical Alert - Doorbell', 'Front entrance camera detected urgent visitor.', 'Front Door Ring')} title="Click to trigger Doorbell event">
                    <div className="item-left-flex">
                      <div className="icon-square sq-red">🔔</div>
                      <span className="item-primary-label">{translateUI('frontDoorRing', currentLang)}</span>
                    </div>
                    <span className="green-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{translateUI('statusOnline', currentLang)}</span>
                      <span style={{ fontSize: '10px', color: '#EF4444' }}>⚡</span>
                    </span>
                  </div>

                  <div className="list-item-row" onClick={() => simulateDevice('package', 'Package Delivered', 'Amazon Prime delivery arrived.', 'Parcel Delivery')} title="Click to trigger Parcel Delivery event">
                    <div className="item-left-flex">
                      <div className="icon-square sq-amber">📦</div>
                      <span className="item-primary-label">{translateUI('parcelDelivery', currentLang)}</span>
                    </div>
                    <span className="green-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{translateUI('statusOnline', currentLang)}</span>
                      <span style={{ fontSize: '10px', color: '#F59E0B' }}>⚡</span>
                    </span>
                  </div>

                  <div className="list-item-row" onClick={() => simulateDevice('system', translateUI('vrSpatialGuardian', currentLang), 'User approaching room guardian boundary.', translateUI('vrHeadsetDevice', currentLang))} title="Click to trigger VR Headset event">
                    <div className="item-left-flex">
                      <div className="icon-square sq-cyan">🥽</div>
                      <span className="item-primary-label">{translateUI('vrHeadsetDevice', currentLang)}</span>
                    </div>
                    <span className="green-status-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{translateUI('statusOnline', currentLang)}</span>
                      <span style={{ fontSize: '10px', color: '#38BDF8' }}>⚡</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifestyle Routines Panel */}
              <div className="panel-card">
                <div className="panel-header-row">
                  <div className="panel-header-left">
                    <span>🌿</span>
                    <span className="panel-heading">{translateUI('lifestyleRoutines', currentLang)}</span>
                  </div>
                  <span className="link-chevron" onClick={() => showToast('Lifestyle Routines', 'Health and Calendar routines sync with session breaks.', '🌿', 'info')}>{translateUI('activeCount2', currentLang)}</span>
                </div>

                <div className="items-list">
                  <div className="list-item-row" onClick={() => simulateDevice('health', 'Hydration & Posture Cue', 'Time for 250ml water and shoulder rolls.', 'Health Tracker')}>
                    <div className="item-left-flex">
                      <div className="icon-square" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>💧</div>
                      <div>
                        <span className="item-primary-label">{translateUI('healthWellnessTitle', currentLang)}</span>
                        <span className="item-secondary-label" style={{ display: 'block', fontSize: '10px', color: '#94A3B8' }}>{translateUI('healthWellnessDesc', currentLang)}</span>
                      </div>
                    </div>
                    <span className="green-status-tag" style={{ color: '#38BDF8' }}>{translateUI('cueOnBreak', currentLang)} ›</span>
                  </div>

                  <div className="list-item-row" onClick={() => simulateDevice('calendar', "Mom's Birthday Reminder", "Today is Mom's birthday! Wish her happy birthday.", 'Alexa Family Calendar')}>
                    <div className="item-left-flex">
                      <div className="icon-square" style={{ background: 'rgba(244, 114, 182, 0.2)', color: '#F472B6' }}>🎂</div>
                      <div>
                        <span className="item-primary-label">{translateUI('familyCalendarTitle', currentLang)}</span>
                        <span className="item-secondary-label" style={{ display: 'block', fontSize: '10px', color: '#94A3B8' }}>{translateUI('familyCalendarDesc', currentLang)}</span>
                      </div>
                    </div>
                    <span className="green-status-tag" style={{ color: '#F472B6' }}>{translateUI('alertOnBreak', currentLang)} ›</span>
                  </div>

                  <div className="list-item-row" onClick={() => simulateDevice('calendar', "Dad's Day Reminder", "Today is Dad's Day! Send warm greetings.", 'Alexa Family Calendar')}>
                    <div className="item-left-flex">
                      <div className="icon-square" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}>👨‍👧‍👦</div>
                      <div>
                        <span className="item-primary-label">Dad's Day Reminder</span>
                        <span className="item-secondary-label" style={{ display: 'block', fontSize: '10px', color: '#94A3B8' }}>Annual family calendar reminder</span>
                      </div>
                    </div>
                    <span className="green-status-tag" style={{ color: '#F59E0B' }}>{translateUI('alertOnBreak', currentLang)} ›</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="panel-card">
                <div className="panel-header-row">
                  <div className="panel-header-left">
                    <span>🕒</span>
                    <span className="panel-heading">{translateUI('recentActivity', currentLang)}</span>
                  </div>
                  <span className="link-chevron" onClick={() => setActiveTab('notifications')}>{translateUI('inspectAll', currentLang)}</span>
                </div>

                <div className="items-list">
                  {displayNotifications.slice(0, 4).map(item => (
                    <div key={item.id} className="list-item-row" onClick={() => showToast(`Event: ${item.event.title}`, formatNotificationSecondary(item, currentLang), 'ℹ', 'info')}>
                      <div className="item-left-flex">
                        <div className={`icon-square ${item.status === 'displayed' ? 'sq-red' : item.event.category === 'package' ? 'sq-blue' : 'sq-cyan'}`}>
                          {item.status === 'displayed' ? '🚨' : item.event.category === 'package' ? '📦' : '💡'}
                        </div>
                        <div className="item-labels">
                          <span className="item-primary-label">
                            {formatNotificationTitle(item.event.title, currentLang)}
                            {item.count > 1 && <span className="repeat-count-badge">×{item.count}</span>}
                          </span>
                          <span className="item-secondary-label">{formatNotificationSecondary(item, currentLang)}</span>
                        </div>
                      </div>
                      <span className="time-stamp-tag">{item.handledAt || item.event.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* PLAYBOOK & SOUND SETTINGS ROW */}
            <div className="middle-split-row">
              
              {/* Playbook Panel */}
              <div className="panel-card">
                <div className="panel-header-row">
                  <div className="panel-header-left">
                    <span>📄</span>
                    <span className="panel-heading">{translateUI('playbook', currentLang)}</span>
                    <span className="active-chip">{translateUI('statusActive', currentLang)}</span>
                  </div>
                  <span className="link-chevron" onClick={() => setActiveTab('contracts')}>{translateUI('managePlaybook', currentLang)}</span>
                </div>

                <div className="contract-inner-grid">
                  <div className="contract-mode-center">
                    <div className="target-purple-round">
                      <img src="/focus_mode_icon.png" alt="Focus Mode" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{formatContractName(contract.name, currentLang, contract.activityType)}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>{translateUI('activePlaybookDesc', currentLang)}</div>
                    </div>
                    <button className="edit-rules-btn" onClick={() => setActiveTab('contracts')}>
                      {translateUI('managePlaybook', currentLang)}
                    </button>
                  </div>

                  <div className="key-rules-container">
                    <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>{translateUI('activeRulesToggle', currentLang)}</span>
                    
                    {contract.rules && contract.rules.map((rule, idx) => (
                      <div 
                        key={idx} 
                        className="rule-table-row" 
                        onClick={() => cycleRulePolicy(rule.eventCategory, rule.handlingPolicy)}
                        title="Click to toggle rule policy"
                      >
                        <div className="rule-left-tag">
                          <span className={`tiny-dot ${rule.handlingPolicy === 'interrupt_now' ? 'dot-red' : rule.handlingPolicy === 'next_break' ? 'dot-amber' : 'dot-cyan'}`}></span>
                          <span>{formatCategory(rule.eventCategory, currentLang)}</span>
                        </div>
                        <span className="policy-label">{formatPolicy(rule.handlingPolicy, currentLang)} ↻</span>
                        <span className="priority-label">{translateUI('priority', currentLang)} {rule.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Sound Settings Panel */}
                <div className="panel-card sound-settings-panel">
                  <div className="panel-header-row">
                    <div className="panel-header-left">
                      <span>🔊</span>
                      <span className="panel-heading sound-settings-heading">{translateUI('soundSettings', currentLang)}</span>
                    </div>
                    <span className="link-chevron" onClick={() => setActiveTab('settings')}>{translateUI('audioMixer', currentLang)}</span>
                  </div>

                  <div className="sound-toggle-list">
                    <div className="sound-toggle-row">
                      <div className="sound-row-title" onClick={() => triggerSound('critical')} style={{ cursor: 'pointer' }} title="Test sound">
                        <span>🚨</span>
                        <span>{translateUI('criticalAlert2Beeps', currentLang)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="sound-state-tag" style={{ fontSize: '11px' }}>{criticalSound ? translateUI('stateOn', currentLang) : translateUI('stateOff', currentLang)}</span>
                        <div className={`toggle-switch-ui ${criticalSound ? 'on' : ''}`} onClick={() => toggleSoundPref('criticalSound', !criticalSound)}>
                          <div className="toggle-knob-ui"></div>
                        </div>
                      </div>
                    </div>

                    <div className="sound-toggle-row">
                      <div className="sound-row-title" onClick={() => triggerSound('normal')} style={{ cursor: 'pointer' }} title="Test sound">
                        <span>📦</span>
                        <span>{translateUI('normalBreak1Beep', currentLang)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="sound-state-tag" style={{ fontSize: '11px' }}>{normalSound ? translateUI('stateOn', currentLang) : translateUI('stateOff', currentLang)}</span>
                        <div className={`toggle-switch-ui ${normalSound ? 'on' : ''}`} onClick={() => toggleSoundPref('normalSound', !normalSound)}>
                          <div className="toggle-knob-ui"></div>
                        </div>
                      </div>
                    </div>

                    <div className="sound-toggle-row">
                      <div className="sound-row-title" onClick={() => triggerSound('summary')} style={{ cursor: 'pointer' }} title="Test sound">
                        <span>💬</span>
                        <span>{translateUI('routineSummaryChime', currentLang)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="sound-state-tag" style={{ fontSize: '11px' }}>{routineSound ? translateUI('stateOn', currentLang) : translateUI('stateOff', currentLang)}</span>
                        <div className={`toggle-switch-ui ${routineSound ? 'on' : ''}`} onClick={() => toggleSoundPref('routineSound', !routineSound)}>
                          <div className="toggle-knob-ui"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* SESSION SUMMARY PANEL (Full-width clean telemetry) */}
            <div className="panel-card session-summary-panel" style={{ width: '100%', marginBottom: '16px' }}>
              <div className="panel-header-row">
                <div className="panel-header-left">
                  <span>📊</span>
                  <span className="panel-heading session-summary-heading">Session Summary</span>
                </div>
                <span className="link-chevron" onClick={handleResetDemo} title="Reset demo state to default">Reset Demo ↺</span>
              </div>

                <div className="summary-counters-row">
                  <div className="counter-box cnt-blue">
                    <span className="counter-number">{notifications.length}</span>
                    <span className="counter-text">Total</span>
                  </div>
                  <div className="counter-box cnt-purple">
                    <span className="counter-number">{notifications.filter(n => n.status === 'displayed').length}</span>
                    <span className="counter-text">Displayed</span>
                  </div>
                  <div className="counter-box cnt-green">
                    <span className="counter-number">{notifications.filter(n => n.status === 'pending').length}</span>
                    <span className="counter-text">Queued</span>
                  </div>
                  <div className="counter-box cnt-teal">
                    <span className="counter-number">{notifications.filter(n => n.status === 'summarized').length}</span>
                    <span className="counter-text">Summarized</span>
                  </div>
                  <div className="counter-box cnt-gray">
                    <span className="counter-number">0</span>
                    <span className="counter-text">Dismissed</span>
                  </div>
                </div>

                <div className="items-list" style={{ marginTop: '8px' }}>
                  <div className="list-item-row" onClick={() => triggerSound('critical')}>
                    <span className="summary-list-item-title" style={{ fontSize: '11px' }}>🔴 Critical alerts - Doorbell</span>
                    <span className="summary-list-item-sub" style={{ fontSize: '10.5px' }}>{notifications.filter(n => n.appliedRule === 'interrupt_now').length} Immediate | Priority 1</span>
                  </div>
                  <div className="list-item-row" onClick={() => triggerSound('normal')}>
                    <span className="summary-list-item-title" style={{ fontSize: '11px' }}>🟡 Parcel deliveries</span>
                    <span className="summary-list-item-sub" style={{ fontSize: '10.5px' }}>{notifications.filter(n => n.event.category === 'package').length} Timely Arrival | Priority 2</span>
                  </div>
                  <div className="list-item-row" onClick={() => triggerSound('summary')}>
                    <span className="summary-list-item-title" style={{ fontSize: '11px' }}>🔵 Routine updates</span>
                    <span className="summary-list-item-sub" style={{ fontSize: '10.5px' }}>{notifications.filter(n => n.appliedRule === 'next_break' || n.appliedRule === 'summarize_later').length} Break & Summary | Priority 3-4</span>
                  </div>
                </div>
              </div>

            </div>

          {/* RIGHT 1/4 COLUMN: ASK ALEXA+ SIMULATED EXPERIENCE */}
          <div className="right-stack">
            <div className="alexa-card-panel">
              <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>{translateUI('conversation', currentLang)} | Alexa+</span>
                  <span className="alexa-sim-badge">{translateUI('chatSimulatedTag', currentLang)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation history"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '4px',
                    color: '#94A3B8',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#EF4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)'; }}
                >
                  <span>🗑️</span>
                  <span>Clear</span>
                </button>
              </div>

              <div className="alexa-panel-logo-container">
                <img src={theme === 'light' ? '/quietcue_brand_combo_light.svg' : '/quietcue_brand_combo.svg'} alt="Alexa+ | Fire TV" className="alexa-panel-combo-img" />
              </div>

              {/* Chat Stream */}
              <div className="chat-message-stream">
                {chatMessages.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }}>💬</span>
                    Conversation cleared. Type a command below or tap a quick prompt chip to talk to Alexa+.
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    msg.role === 'user' ? (
                      <div key={i} className="user-message-bubble">
                        {msg.text.includes("I'm starting a movie") ? translateUI('chatInitialUserMsg', currentLang) : msg.text}
                      </div>
                    ) : (
                      <div key={i} className="bot-message-bubble">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ color: '#38BDF8', fontSize: '13px' }}>|||</span>
                          <strong style={{ color: 'white', fontSize: '13px', fontFamily: "'EB Garamond', 'Cormorant Garamond', 'Playfair Display', serif", letterSpacing: '0.2px' }}>QuietCue+</strong>
                        </div>
                        <div>{msg.text.includes("Understood!") ? translateUI('chatInitialAiMsg', currentLang) : cleanExplanation(msg.text)}</div>
                        {msg.activated && (
                          <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', color: '#10B981', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600', marginTop: '6px', width: 'fit-content' }}>
                            {translateUI('contractActivePersisted', currentLang)}
                          </div>
                        )}
                      </div>
                    )
                  ))
                )}
              </div>

              {/* Quick Prompt Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button 
                  className="btn-secondary-action" 
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => handleSendChat("I am starting a feature session. Only interrupt for critical alerts and parcel arrivals.")}
                >
                  {translateUI('quickChipMovie', currentLang)}
                </button>
                <button 
                  className="btn-secondary-action" 
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => handleSendChat("Allow immediate delivery alerts.")}
                >
                  {translateUI('quickChipPackages', currentLang)}
                </button>
                <button 
                  className="btn-secondary-action" 
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  onClick={() => triggerViewingBreak()}
                >
                  {translateUI('quickChipBreak', currentLang)}
                </button>
                <button 
                  className="btn-secondary-action" 
                  style={{ fontSize: '10px', padding: '4px 8px', color: '#67E8F9', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                  onClick={() => handleSendChat("Remind me to drink water and do mini posture stretches on break.")}
                >
                  {translateUI('quickChipHydration', currentLang)}
                </button>
                <button 
                  className="btn-secondary-action" 
                  style={{ fontSize: '10px', padding: '4px 8px', color: '#F472B6', borderColor: 'rgba(244, 114, 182, 0.4)' }}
                  onClick={() => handleSendChat("Set a calendar reminder for Mom's birthday on break.")}
                >
                  {translateUI('quickChipBirthday', currentLang)}
                </button>
                <button 
                  className="btn-secondary-action" 
                  style={{ fontSize: '10px', padding: '4px 8px', color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  onClick={() => handleSendChat("Set a family calendar reminder for Dad's Day on break.")}
                >
                  {translateUI('quickChipDadsDay', currentLang)}
                </button>
                <button 
                  className="btn-secondary-action" 
                  style={{ fontSize: '10px', padding: '4px 8px', color: '#60A5FA', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                  onClick={() => handleSendChat("Set an Alexa+ focus contract for my Fire TV. While I am in a focused session, keep the screen quiet. When my priority task completes, whisper: time for a break. Can you set that up?")}
                >
                  {translateUI('quickChipDeploy', currentLang)}
                </button>
              </div>

              {/* Chat Input Bar */}
              <div className="chat-input-container">
                <input 
                  type="text" 
                  className="chat-text-input" 
                  placeholder={translateUI('chatPlaceholder', currentLang)} 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()} 
                />
                <button className="chat-send-arrow" onClick={() => handleSendChat()} title={translateUI('sendChatBtn', currentLang)}>➤</button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ================= MODAL OVERLAYS FOR TABS ================= */}

      {/* 1. CONTRACTS MODAL */}
      {activeTab === 'contracts' && (
        <div className="modal-backdrop" onClick={() => setActiveTab('home')}>
          <div className="modal-dialog playbook-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <h3 className="modal-title-text" style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                  {translateUI('playbookModalTitle', currentLang)}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="modal-lang-selector" style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLanguage(lang.code)}
                        title={`Translate to ${lang.label}`}
                        style={{
                          background: currentLang === lang.code ? 'linear-gradient(135deg, #0284C7, #00D2FF)' : 'transparent',
                          color: currentLang === lang.code ? '#FFFFFF' : '#94A3B8',
                          border: currentLang === lang.code ? '1px solid #38BDF8' : 'none',
                          borderRadius: '999px',
                          padding: '2px 6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.code.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={handleResetContract}
                    title={translateUI('restoreDefaultsBtn', currentLang)}
                    className="modal-header-reset-btn"
                  >
                    <span>{translateUI('restoreDefaultsBtn', currentLang)}</span>
                  </button>
                  <button className="modal-close-icon" onClick={() => setActiveTab('home')} title={translateUI('closeModalBtn', currentLang)}>✕</button>
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span className="modal-section-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>{translateUI('activeModeLabel', currentLang)}</span>
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.18)', 
                    color: '#34D399', 
                    border: '1px solid rgba(16, 185, 129, 0.35)', 
                    padding: '2px 10px', 
                    borderRadius: '9999px', 
                    fontSize: '11.5px', 
                    fontWeight: 600 
                  }}>
                    {formatContractName(contract.name, currentLang, contract.activityType)}
                  </span>
                </div>
                <p className="modal-section-desc" style={{ fontSize: '12px', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                  {translateUI('playbookDesc', currentLang)}
                </p>
              </div>

              <h5 className="modal-section-title" style={{ fontSize: '12px' }}>{translateUI('switchTemplateLabel', currentLang)}</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { nameKey: 'tmplFeatureNightTitle', descKey: 'tmplFeatureNightDesc', defaultName: 'Feature Night', type: 'movie', icon: '🎬' },
                  { nameKey: 'tmplFocusWorkTitle', descKey: 'tmplFocusWorkDesc', defaultName: 'Focus Work', type: 'study', icon: '🎯' },
                  { nameKey: 'tmplSportsLiveTitle', descKey: 'tmplSportsLiveDesc', defaultName: 'Sports Live', type: 'sports', icon: '⚽' },
                  { nameKey: 'tmplFamilyTimeTitle', descKey: 'tmplFamilyTimeDesc', defaultName: 'Family Time', type: 'family', icon: '👨‍👩‍👧' },
                  { nameKey: 'tmplVrImmersionTitle', descKey: 'tmplVrImmersionDesc', defaultName: 'VR Immersion', type: 'vr', icon: '🥽' },
                  { nameKey: 'tmplCustomSetupTitle', descKey: 'tmplCustomSetupDesc', defaultName: 'Custom Setup', type: 'custom', icon: '⚙' }
                ].map(tmpl => {
                  const tmplName = translateUI(tmpl.nameKey, currentLang) || tmpl.defaultName;
                  const tmplDesc = translateUI(tmpl.descKey, currentLang);
                  return (
                    <button 
                      key={tmpl.type} 
                      className="btn-secondary-action template-card-btn" 
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px', gap: '4px' }}
                      onClick={() => {
                        setContract(prev => ({ ...prev, name: tmplName, activityType: tmpl.type }));
                        showToast(`Switched Contract`, `Activated template: ${tmplName}`, tmpl.icon, 'success');
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{tmpl.icon}</span>
                      <strong className="template-card-title" style={{ fontSize: '12px' }}>{tmplName}</strong>
                      <span className="template-card-desc" style={{ fontSize: '10px', textAlign: 'left' }}>{tmplDesc}</span>
                    </button>
                  );
                })}
              </div>

              <h5 className="modal-section-title" style={{ fontSize: '12px', marginTop: '10px' }}>{translateUI('configuredRulesLabel', currentLang)}</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {contract.rules && contract.rules.map((rule, i) => (
                  <div key={i} className="rule-card-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <strong className="rule-item-title" style={{ fontSize: '12px' }}>{formatCategory(rule.eventCategory, currentLang)}</strong>
                      <div className="rule-item-priority" style={{ fontSize: '10px' }}>{translateUI('priority', currentLang)} {rule.priority}</div>
                    </div>
                    <button 
                      className="btn-secondary-action"
                      style={{ fontSize: '11px', padding: '6px 12px' }}
                      onClick={() => cycleRulePolicy(rule.eventCategory, rule.handlingPolicy)}
                    >
                      {translateUI('policyPrefix', currentLang)} <span style={{ color: '#38BDF8', fontWeight: 'bold' }}>{formatPolicy(rule.handlingPolicy, currentLang)}</span> ↻
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="btn-secondary-action" 
                onClick={handleResetContract} 
                title={translateUI('restoreDefaultsBtn', currentLang)}
                style={{ color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                {translateUI('restoreDefaultsBtn', currentLang)}
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary-action" onClick={() => setActiveTab('home')}>{translateUI('closeModalBtn', currentLang)}</button>
                <button className="btn-primary-action" onClick={handleSaveContract}>{translateUI('saveAndReturnBtn', currentLang)}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEVICES MODAL */}
      {activeTab === 'devices' && (
        <div className="modal-backdrop" onClick={() => setActiveTab('home')}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-flex">
                <span>⚡</span>
                <span>Devices & Services Simulator</span>
              </div>
              <button className="modal-close-icon" onClick={() => setActiveTab('home')}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: theme === 'light' ? '#475569' : '#94A3B8', fontSize: '12px', marginBottom: '14px' }}>
                Trigger simulated smart home and cloud routine events to test how QuietCue+ handles interruptions against the active contract.
              </p>

              {/* SIMULATE ALL HERO CARD */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: theme === 'light' ? '#EFF6FF' : 'rgba(37, 99, 235, 0.12)',
                border: theme === 'light' ? '1.5px solid #93C5FD' : '1px solid rgba(59, 130, 246, 0.35)',
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                gap: '12px'
              }}>
                <div>
                  <strong style={{ fontSize: '13px', color: theme === 'light' ? '#1E40AF' : '#93C5FD', display: 'block', marginBottom: '2px' }}>
                    ⚡ Instant Multi-Device Event Simulation
                  </strong>
                  <span style={{ fontSize: '11px', color: theme === 'light' ? '#475569' : '#CBD5E1' }}>
                    Triggers doorbell, parcel arrival, Dad's Day reminder, and thermostat events in sequence.
                  </span>
                </div>
                <button
                  className="btn-primary-action"
                  onClick={simulateAllConnectedDevices}
                  disabled={isSimulatingAll}
                  style={{
                    fontSize: '12px',
                    padding: '8px 16px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                    whiteSpace: 'nowrap',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  title="Simulate all devices"
                >
                  {isSimulatingAll ? '⏳ Simulating...' : '⚡ Simulate All Now'}
                </button>
              </div>

              {/* RECENT TRIGGER FEEDBACK BANNER */}
              {lastTriggeredEvent && (
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: theme === 'light' ? '#ECFDF5' : 'rgba(16, 185, 129, 0.15)',
                  border: theme === 'light' ? '1px solid #6EE7B7' : '1px solid rgba(16, 185, 129, 0.4)',
                  color: theme === 'light' ? '#065F46' : '#34D399',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>✓ Event Triggered: <strong>{lastTriggeredEvent.name}</strong> [{lastTriggeredEvent.policy}]</span>
                  <span style={{ fontSize: '10.5px', opacity: 0.85 }}>{lastTriggeredEvent.time}</span>
                </div>
              )}

              {/* SECTION 1: HARDWARE DEVICES */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: theme === 'light' ? '#0284C7' : '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔌</span>
                  <span>Smart Home Hardware Devices</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: 'Front Door Ring', cat: 'security', icon: '🚨', title: 'Doorbell Alert', msg: 'Motion detected at front entrance.', policy: 'Interrupt Now' },
                    { name: 'Parcel Delivery', cat: 'package', icon: '📦', title: 'Package Delivered', msg: 'Amazon Prime package delivered safely.', policy: 'Next Break' },
                    { name: 'Smart Thermostat', cat: 'thermostat', icon: '🌡', title: 'Thermostat Update', msg: 'Target temperature reached: 72°F.', policy: 'Session Digest' },
                    { name: 'Smart Lights', cat: 'light', icon: '💡', title: 'Lighting Changed', msg: 'Brightness dimmed to 20%.', policy: 'Session Digest' },
                    { name: 'Fire TV', cat: 'system', icon: '📺', title: 'HDMI Switch', msg: 'Fire TV 4K input detected.', policy: 'Session Digest' },
                    { name: 'Smoke Sensor', cat: 'security', icon: '🔥', title: 'Smoke Sensor Test', msg: 'Test alarm detected at kitchen sensor.', policy: 'Interrupt Now' },
                    { name: translateUI('vrHeadsetDevice', currentLang), cat: 'system', icon: '🥽', title: translateUI('vrSpatialGuardian', currentLang), msg: 'User approaching room guardian boundary.', policy: 'Interrupt Now' }
                  ].map((dev, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: theme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: theme === 'light' ? '1.5px solid #CBD5E1' : '1px solid rgba(255,255,255,0.07)',
                      boxShadow: theme === 'light' ? '0 1px 3px rgba(15, 23, 42, 0.04)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{dev.icon}</span>
                        <div>
                          <div style={{ color: theme === 'light' ? '#0F172A' : '#FFFFFF', fontSize: '12px', fontWeight: '700' }}>{dev.name}</div>
                          <div style={{ color: theme === 'light' ? '#475569' : '#94A3B8', fontSize: '10.5px' }}>{dev.msg}</div>
                        </div>
                      </div>
                      <button 
                        className="btn-primary-action" 
                        style={{
                          fontSize: '11px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          backgroundColor: lastTriggeredEvent?.name === dev.name ? '#059669' : undefined,
                          borderColor: lastTriggeredEvent?.name === dev.name ? '#10B981' : undefined
                        }}
                        onClick={() => simulateDevice(dev.cat, dev.title, dev.msg, dev.name)}
                      >
                        {lastTriggeredEvent?.name === dev.name ? 'Triggered! ✓' : 'Trigger Event ⚡'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: LIFESTYLE ROUTINES */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: theme === 'light' ? '#059669' : '#34D399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌿</span>
                  <span>Lifestyle Routines 🌿</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { name: '💧 Health & Hydration Routine', cat: 'health', icon: '💧', title: 'Hydration Reminder', msg: 'Drink 250ml water to stay refreshed.', policy: 'Next Break' },
                    { name: '🏃 Movement & Posture Micro-break', cat: 'health', icon: '🧘', title: 'Posture & Stretch', msg: '20-20-20 eye rest and shoulder roll.', policy: 'Next Break' },
                    { name: '🎂 Family Calendar - Birthdays', cat: 'calendar', icon: '🎂', title: "Mom's Birthday Reminder", msg: "Today is Mom's birthday! Wish her a wonderful day.", policy: 'Next Break' },
                    { name: '👨‍👧‍👦 Dad\'s Day Family Reminder', cat: 'calendar', icon: '👨‍👧‍👦', title: "Dad's Day Reminder", msg: "Today is Dad's Day! Send warm greetings.", policy: 'Next Break' },
                    { name: '📅 Personal Schedule & Celebrations', cat: 'calendar', icon: '📅', title: 'Upcoming Anniversary', msg: 'Dinner reservation alert today at 7:30 PM.', policy: 'Next Break' }
                  ].map((dev, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: theme === 'light' ? '#FFFFFF' : 'rgba(52, 211, 153, 0.03)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: theme === 'light' ? '1.5px solid #CBD5E1' : '1px solid rgba(52, 211, 153, 0.12)',
                      boxShadow: theme === 'light' ? '0 1px 3px rgba(15, 23, 42, 0.04)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{dev.icon}</span>
                        <div>
                          <div style={{ color: theme === 'light' ? '#0F172A' : '#FFFFFF', fontSize: '12px', fontWeight: '700' }}>{dev.name}</div>
                          <div style={{ color: theme === 'light' ? '#475569' : '#94A3B8', fontSize: '10.5px' }}>{dev.msg}</div>
                        </div>
                      </div>
                      <button 
                        className="btn-primary-action" 
                        style={{
                          fontSize: '11px',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          background: lastTriggeredEvent?.name === dev.name ? '#059669' : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                          borderColor: '#34D399'
                        }}
                        onClick={() => simulateDevice(dev.cat, dev.title, dev.msg, dev.name)}
                      >
                        {lastTriggeredEvent?.name === dev.name ? 'Triggered! ✓' : 'Simulate Routine 🌿'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-action" onClick={() => setActiveTab('home')}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATIONS MODAL */}
      {activeTab === 'notifications' && (
        <div className="modal-backdrop" onClick={() => setActiveTab('home')}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-flex">
                <span>🔔</span>
                <span>Notification Queue & History</span>
              </div>
              <button className="modal-close-icon" onClick={() => setActiveTab('home')}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <button className="btn-primary-action" onClick={triggerViewingBreak}>Release Pending on Break ☕</button>
                <button className="btn-secondary-action" onClick={triggerEndSession}>Session Summary ⏹</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayNotifications.map(item => (
                  <div key={item.id} className="notif-item-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>
                          {item.status === 'displayed'
                            ? '🚨'
                            : item.event?.title?.toLowerCase().includes('dad')
                            ? '👨‍👧‍👦'
                            : item.event?.title?.toLowerCase().includes('birthday') || item.event?.title?.toLowerCase().includes('mom')
                            ? '🎂'
                            : item.event.category === 'calendar'
                            ? '📅'
                            : item.event.category === 'health'
                            ? '💧'
                            : item.event.category === 'package'
                            ? '📦'
                            : '💬'}
                        </span>
                        <strong className="notif-item-title">{item.event.title}</strong>
                        {item.count > 1 && <span className="repeat-count-badge">×{item.count}</span>}
                        <span style={{ 
                          fontSize: '9.5px', 
                          padding: '2px 6px', 
                          borderRadius: '6px', 
                          background: item.status === 'displayed' ? 'rgba(239, 68, 68, 0.2)' : item.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: item.status === 'displayed' ? '#FCA5A5' : item.status === 'pending' ? '#FCD34D' : '#6EE7B7'
                        }}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '10.5px', marginTop: '3px' }}>{item.event.message}</div>
                      <div style={{ color: '#64748B', fontSize: '9.5px', marginTop: '2px' }}>Reason: {cleanExplanation(item.explanation)}</div>
                    </div>
                    {item.status === 'pending' && (
                      <button 
                        className="btn-primary-action"
                        style={{ fontSize: '10.5px', padding: '6px 12px' }}
                        onClick={() => releaseNotification(item.id, item.event.title)}
                      >
                        Display Now
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-action" onClick={() => setActiveTab('home')}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MCP TOOLS MODAL */}
      {activeTab === 'mcp' && (
        <div className="modal-backdrop" onClick={() => setActiveTab('home')}>
          <div className="modal-dialog" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-flex">
                <span>⚙</span>
                <span>MCP Server Tools Inspector v1.0.0 Streamable HTTP</span>
              </div>
              <button className="modal-close-icon" onClick={() => setActiveTab('home')}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#94A3B8', fontSize: '11.5px' }}>
                All 11 Model Context Protocol tools exposed by QuietCue+. Click any tool to execute directly via the MCP Client transport:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { name: 'list_connected_devices', args: {}, label: 'List Connected Devices' },
                  { name: 'get_notification_queue', args: {}, label: 'Get Notification Queue' },
                  { name: 'get_viewing_contract', args: { contractId: contract.contractId }, label: 'Get Viewing Contract' },
                  { name: 'get_viewing_summary', args: { contractId: contract.contractId }, label: 'Get Viewing Summary' },
                  { name: 'activate_viewing_contract', args: { contractId: contract.contractId }, label: 'Activate Viewing Contract' },
                  { name: 'end_viewing_contract', args: { contractId: contract.contractId }, label: 'End Viewing Contract' },
                  { name: 'trigger_break', args: {}, label: 'Trigger Break Action' },
                  { name: 'reset_demo', args: {}, label: 'Reset Demo State' }
                ].map(tool => (
                  <button 
                    key={tool.name} 
                    className="btn-secondary-action" 
                    style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => {
                      if (tool.name === 'trigger_break') triggerViewingBreak();
                      else if (tool.name === 'reset_demo') handleResetDemo();
                      else executeMcpTool(tool.name, tool.args);
                    }}
                  >
                    <span>⚡ {tool.label}</span>
                    <span style={{ color: '#38BDF8' }}>Run →</span>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#CBD5E1', marginBottom: '4px' }}>Live Output:</div>
                <pre style={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#38BDF8', fontSize: '10.5px', maxHeight: '180px', overflowY: 'auto' }}>
                  {mcpLoading ? 'Executing tool over MCP SSE transport...' : mcpResult}
                </pre>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-action" onClick={() => setActiveTab('home')}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONVERSATION MODAL */}
      {activeTab === 'conversation' && (
        <div className="modal-backdrop" onClick={() => setActiveTab('home')}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-flex">
                <span>💬</span>
                <span>Alexa+ Viewing Contract Prompts</span>
              </div>
              <button className="modal-close-icon" onClick={() => setActiveTab('home')}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#94A3B8', fontSize: '12px' }}>
                Sample commands to configure contracts using natural language through Amazon Bedrock:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  "Set an Alexa+ focus contract for my Fire TV. While I am working, keep the screen quiet. When my priority task completes, whisper: time for a break.",
                  "I am starting a session. Only interrupt me for critical alerts, show standard updates on a break, and summarize routine updates afterward.",
                  "Hold all package notifications until the next break.",
                  "Switch to focus mode. Silence all non-critical thermostat and lighting updates.",
                  "Give me a summary of what events happened during my session.",
                  "End session and create final digest."
                ].map((prompt, i) => (
                  <button 
                    key={i} 
                    className="btn-secondary-action"
                    style={{ textAlign: 'left', padding: '10px 14px', fontSize: '11.5px', color: '#E2E8F0' }}
                    onClick={() => {
                      handleSendChat(prompt);
                      setActiveTab('home');
                    }}
                  >
                    "{prompt}" →
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-action" onClick={() => setActiveTab('home')}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SETTINGS MODAL */}
      {activeTab === 'settings' && (
        <div className="modal-backdrop" onClick={() => setActiveTab('home')}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-flex">
                <span>⚙</span>
                <span>System & Audio Preferences</span>
              </div>
              <button className="modal-close-icon" onClick={() => setActiveTab('home')}>✕</button>
            </div>
            <div className="modal-body">
              <h5 style={{ color: 'var(--text-white)', fontSize: '12px' }}>Visual Theme & Eye Comfort:</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <button
                  className={`btn-secondary-action ${theme === 'slate' ? 'active' : ''}`}
                  style={{
                    padding: '12px 10px',
                    textAlign: 'center',
                    background: theme === 'slate' ? 'rgba(251, 113, 133, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: theme === 'slate' ? '#FB7185' : 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-white)'
                  }}
                  onClick={() => setTheme('slate')}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>🪵</div>
                  <strong style={{ fontSize: '11.5px', display: 'block' }}>Dark Cedar</strong>
                  <span style={{ fontSize: '9.5px', color: 'var(--text-gray)' }}>Warm auburn dark mode</span>
                </button>

                <button
                  className={`btn-secondary-action ${theme === 'warm' ? 'active' : ''}`}
                  style={{
                    padding: '12px 10px',
                    textAlign: 'center',
                    background: theme === 'warm' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: theme === 'warm' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-white)'
                  }}
                  onClick={() => setTheme('warm')}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>🪵</div>
                  <strong style={{ fontSize: '11.5px', display: 'block' }}>Warm Dusk</strong>
                  <span style={{ fontSize: '9.5px', color: 'var(--text-gray)' }}>Amber & charcoal</span>
                </button>

                <button
                  className={`btn-secondary-action ${theme === 'light' ? 'active' : ''}`}
                  style={{
                    padding: '12px 10px',
                    textAlign: 'center',
                    background: theme === 'light' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: theme === 'light' ? '#2563EB' : 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-white)'
                  }}
                  onClick={() => setTheme('light')}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>☀️</div>
                  <strong style={{ fontSize: '11.5px', display: 'block' }}>Clean Daylight</strong>
                  <span style={{ fontSize: '9.5px', color: 'var(--text-gray)' }}>Soft studio mode</span>
                </button>
              </div>

              <h5 style={{ color: 'var(--text-white)', fontSize: '12px' }}>Sound Synthesis Audio Controls:</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                  <div>
                    <strong style={{ color: 'white', fontSize: '12px' }}>🚨 Critical Alert Sound</strong>
                    <div style={{ color: '#94A3B8', fontSize: '10px' }}>2 short beeps 880 Hz when critical alert is surfaced</div>
                  </div>
                  <button className="btn-secondary-action" onClick={() => toggleSoundPref('criticalSound', !criticalSound)}>
                    {criticalSound ? 'Enabled - ON' : 'Disabled - OFF'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                  <div>
                    <strong style={{ color: 'white', fontSize: '12px' }}>📦 Normal Update Sound</strong>
                    <div style={{ color: '#94A3B8', fontSize: '10px' }}>1 soft beep 620 Hz on break display</div>
                  </div>
                  <button className="btn-secondary-action" onClick={() => toggleSoundPref('normalSound', !normalSound)}>
                    {normalSound ? 'Enabled - ON' : 'Disabled - OFF'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                  <div>
                    <strong style={{ color: 'white', fontSize: '12px' }}>💬 Routine Update Chime</strong>
                    <div style={{ color: '#94A3B8', fontSize: '10px' }}>Chord chime C5-E5-G5 on session digest</div>
                  </div>
                  <button className="btn-secondary-action" onClick={() => toggleSoundPref('routineSound', !routineSound)}>
                    {routineSound ? 'Enabled - ON' : 'Disabled - OFF'}
                  </button>
                </div>
              </div>

              <h5 style={{ color: 'white', fontSize: '12px', marginTop: '10px' }}>Deterministic Demo Reset:</h5>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '10px' }}>
                <p style={{ color: '#CBD5E1', fontSize: '11px', marginBottom: '8px' }}>
                  Reset server store to initial state with the default Feature Night contract and clean notification records.
                </p>
                <button className="btn-primary-action" style={{ background: '#DC2626' }} onClick={handleResetDemo}>
                  Reset Demo Store ↺
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-action" onClick={() => setActiveTab('home')}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. VOICE STUDIO & AUDIO RECORDER MODAL */}
      {activeTab === 'voice_studio' && (
        <div className="modal-backdrop" onClick={() => { stopRecording(); setActiveTab('home'); }}>
          <div className="modal-dialog" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-flex">
                <span>🎙️</span>
                <span>QuietCue+ Voice Recording Studio</span>
              </div>
              <button className="modal-close-icon" onClick={() => { stopRecording(); setActiveTab('home'); }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '12px' }}>
                Record your 10–12 second voice sample below. Once uploaded, QuietCue+ will save your sample so I can clone your voice for the presentation video!
              </p>

              {/* Script Box */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎙️ Sentence to Read Aloud (10–12 seconds)
                  </span>
                  <span
                    style={{ cursor: 'pointer', fontSize: '11px', color: '#94A3B8' }}
                    onClick={() => {
                      navigator.clipboard?.writeText("code an Alexa+ rule for my Fire TV. While I'm coding from home, keep the screen quiet. But the moment my code deploys to production, whisper: go take a break. Can you build that?");
                      showToast('Copied to Clipboard', 'Voice sample sentence copied.', '📋', 'info');
                    }}
                  >
                    📋 Copy Text
                  </span>
                </div>
                <blockquote style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '1.5',
                  color: '#F8FAFC',
                  fontStyle: 'italic'
                }}>
                  "code an Alexa+ rule for my Fire TV. While I'm coding from home, keep the screen quiet. But the moment my code deploys to production, whisper: go take a break. Can you build that?"
                </blockquote>
              </div>

              {/* Detected Audio Card */}
              {detectedAudio && (
                <div style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid #38BDF8',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>🎧</span>
                      <div>
                        <strong style={{ color: '#38BDF8', fontSize: '12.5px' }}>Found Windows Sound Recording!</strong>
                        <div style={{ color: '#CBD5E1', fontSize: '11px', marginTop: '2px' }}>
                          Detected <code>{detectedAudio.filename}</code> ({(detectedAudio.sizeBytes / 1024).toFixed(1)} KB)
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-primary-action"
                      style={{
                        padding: '6px 14px',
                        fontSize: '11.5px',
                        background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)'
                      }}
                      onClick={() => {
                        showToast('Voice Sample Loaded', `Using ${detectedAudio.filename} for voice cloning!`, '✓', 'success');
                        setVoiceUploadSuccess(true);
                      }}
                    >
                      Use This Recording ✓
                    </button>
                  </div>
                  <audio controls src="http://localhost:3001/api/voice-sample-audio" style={{ width: '100%', marginTop: '6px', outline: 'none' }} />
                </div>
              )}

              {/* Recording Status & Waveform */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '18px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {isRecording ? (
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }}></span>
                      <strong style={{ color: '#EF4444', fontSize: '14px' }}>Recording Audio... {recordingSeconds}s remaining</strong>
                    </div>
                    {/* Simulated visual progress bar */}
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', margin: '10px 0 16px 0' }}>
                      <div style={{ height: '100%', width: `${Math.round(((15 - recordingSeconds) / 15) * 100)}%`, background: 'linear-gradient(90deg, #EF4444, #F59E0B)', transition: 'width 1s linear' }}></div>
                    </div>
                    <button
                      className="btn-primary-action"
                      style={{ background: '#DC2626', padding: '8px 20px', fontSize: '12.5px' }}
                      onClick={stopRecording}
                    >
                      ⏹ Stop & Review Recording
                    </button>
                  </div>
                ) : recordedBlob ? (
                  <div>
                    <div style={{ color: '#10B981', fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span>✓</span>
                      <span>Recording Complete - {(recordedBlob.size / 1024).toFixed(1)} KB</span>
                    </div>
                    {recordedUrl && (
                      <audio controls src={recordedUrl} style={{ width: '100%', margin: '10px 0 14px 0', outline: 'none' }} />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button
                        className="btn-primary-action"
                        style={{ background: '#10B981', padding: '8px 18px', fontSize: '12px' }}
                        disabled={uploadingVoice}
                        onClick={() => uploadVoiceSample(recordedBlob, 'wav')}
                      >
                        {uploadingVoice ? 'Uploading...' : '🚀 Submit Voice Sample'}
                      </button>
                      <button
                        className="btn-secondary-action"
                        style={{ padding: '8px 14px', fontSize: '12px' }}
                        onClick={() => { setRecordedBlob(null); setRecordedUrl(null); }}
                      >
                        🔄 Re-record
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '14px' }}>
                      Press record and read the sentence clearly into your microphone:
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        className="btn-primary-action"
                        style={{
                          background: isRequestingMic ? '#475569' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          borderColor: isRequestingMic ? '#64748B' : '#EF4444',
                          padding: '10px 22px',
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: isRequestingMic ? 0.8 : 1
                        }}
                        disabled={isRequestingMic}
                        onClick={startRecording}
                      >
                        <span>{isRequestingMic ? '⏳' : '🔴'}</span>
                        <span>{isRequestingMic ? 'Requesting Mic - Click Allow...' : 'Start 15s Recording'}</span>
                      </button>

                      <button
                        className="btn-secondary-action"
                        style={{
                          padding: '10px 18px',
                          fontSize: '12.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <span>📁</span>
                        <span>Upload Audio File</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={handleFileInputChange}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Success Alert */}
              {voiceUploadSuccess && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10B981',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#A7F3D0',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '18px' }}>🎉</span>
                  <div>
                    <strong>Voice sample saved to disk!</strong>
                    <div>Saved as <code>user_voice_sample.wav</code>. Antigravity can now access your sample for high-fidelity voice cloning.</div>
                  </div>
                </div>
              )}

              {/* Microphone Error & Troubleshooting */}
              {micError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#FCA5A5',
                  fontSize: '11.5px',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>⚠️ {micError}</div>
                  <div style={{ color: '#E2E8F0', marginTop: '6px' }}>
                    <strong>Quick Fixes:</strong>
                    <ol style={{ paddingLeft: '18px', margin: '6px 0 0 0' }}>
                      <li>Click the 🔒 <strong>lock icon</strong> in the browser URL bar (next to <code>localhost:5173</code>), set <strong>Microphone</strong> to <strong>Allow</strong>, and refresh.</li>
                      <li>Or open <strong>Windows Sound Recorder</strong> (search Sound Recorder in Start Menu), record, and click <strong>"Upload Audio File"</strong> above.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Help & Alternative methods */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '11px',
                color: '#94A3B8'
              }}>
                <strong style={{ color: '#CBD5E1', display: 'block', marginBottom: '4px' }}>💡 Alternative: Record in Windows Sound Recorder</strong>
                <span>Windows 11 includes a built-in Sound Recorder. Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '3px' }}>Win</kbd>, type <strong>Sound Recorder</strong>, record your line, and either drop the file into this chat or click <strong>Upload Audio File</strong>.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-action" onClick={() => { stopRecording(); setActiveTab('home'); }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TELEPROMPTER & STEP RUNNER DOCK */}
      {isDemoRunning && (
        <div className="demo-teleprompter-dock">
          <div className="demo-teleprompter-top">
            <div className="demo-step-badge-group">
              <span className="demo-step-pill">
                Step {demoStepIndex + 1} of {DEMO_STEPS.length}
              </span>
              <span className="demo-step-title">{DEMO_STEPS[demoStepIndex].title}</span>
              <span className="demo-step-tagline">{DEMO_STEPS[demoStepIndex].tagline}</span>
            </div>

            <div className="demo-controls-btn-group">
              <span className="demo-timer-pill" title="Time remaining in this step">
                ⏱ {demoSecondsRemaining}s
              </span>
              <button 
                className="demo-ctrl-btn" 
                style={{ background: isPlayingMyVoice ? '#10B981' : 'rgba(56, 189, 248, 0.25)', borderColor: '#38BDF8', color: '#E0F2FE', fontWeight: 600 }}
                onClick={toggleMyVoicePlayback}
                title="Play your uploaded 43-second voice recording"
              >
                {isPlayingMyVoice ? '⏹ Stop My Voice' : '🎧 Play My Voice'}
              </button>
              <button 
                className="demo-ctrl-btn" 
                onClick={() => demoPaused ? resumeAutoDemo() : pauseAutoDemo()}
                title={demoPaused ? "Resume automated playback" : "Pause timer"}
              >
                {demoPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              {demoStepIndex > 0 && (
                <button 
                  className="demo-ctrl-btn" 
                  onClick={() => skipAutoDemoStep(-1)}
                  title="Previous step"
                >
                  ⏮ Prev
                </button>
              )}
              {demoStepIndex < DEMO_STEPS.length - 1 && (
                <button 
                  className="demo-ctrl-btn" 
                  onClick={() => skipAutoDemoStep(1)}
                  title="Skip to next step"
                >
                  ⏭ Skip
                </button>
              )}
              <button 
                className="demo-ctrl-btn exit" 
                onClick={exitAutoDemo}
                title="Stop and exit automated demo"
              >
                ✕ Exit
              </button>
            </div>
          </div>

          {/* Step Progress Track */}
          <div className="demo-progress-track">
            <div 
              className="demo-progress-fill" 
              style={{ 
                width: `${Math.round(((DEMO_STEPS[demoStepIndex].durationSec - demoSecondsRemaining) / DEMO_STEPS[demoStepIndex].durationSec) * 100)}%` 
              }}
            />
          </div>

          {/* Script Card for Voiceover Recording */}
          <div className="demo-script-card">
            <div className="demo-script-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isPlayingMyVoice ? '#10B981' : '#38BDF8', boxShadow: isPlayingMyVoice ? '0 0 8px #10B981' : 'none' }}></span>
                <strong style={{ color: '#E0F2FE' }}>🎙️ Voice Narration: Your Real Recorded Voice - user_voice_sample.mp3</strong>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span 
                  style={{ cursor: 'pointer', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }} 
                  onClick={() => playUserVoiceAtStep(demoStepIndex)}
                  title="Replay this sentence in your voice"
                >
                  🔄 Replay Sentence
                </span>
                <span 
                  style={{ cursor: 'pointer', opacity: 0.8 }} 
                  onClick={() => {
                    navigator.clipboard?.writeText(DEMO_STEPS[demoStepIndex].script);
                    showToast('Copied to Clipboard', 'Spoken line copied.', '📋', 'info');
                  }}
                  title="Copy spoken line to clipboard"
                >
                  📋 Copy Text
                </span>
              </div>
            </div>
            <div className="demo-script-quote" style={{ fontSize: '14.5px', color: '#F8FAFC', fontWeight: 500, lineHeight: 1.5 }}>
              "{DEMO_STEPS[demoStepIndex].script}"
            </div>
          </div>
        </div>
      )}

      {/* Interactive Demo Video Walkthrough Modal */}
      <DemoWalkthroughModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        onNavigateToTv={() => setIsTvClientView(true)}
      />

    </div>
  );
}

export default App;
