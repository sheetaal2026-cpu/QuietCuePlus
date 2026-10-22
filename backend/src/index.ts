import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { engine } from './engine.js';
import { persistentStore, ViewingContract, ViewingRule, getDefaultMovieRules } from './contracts.js';
import { interpretCommand } from './bedrock.js';

const FALLBACK_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    'Focus Mode': 'Modo Concentración',
    'Movie Night': 'Noche de Películas',
    'Sports Live': 'Deportes en Vivo',
    'Family Time': 'Tiempo en Familia',
    'Viewing Break': 'Pausa de Visualización',
    'Dashboard': 'Panel de Control',
    'Notifications': 'Notificaciones',
    'Settings': 'Configuración'
  },
  fr: {
    'Focus Mode': 'Mode Concentration',
    'Movie Night': 'Soirée Cinéma',
    'Sports Live': 'Sport en Direct',
    'Family Time': 'Temps en Famille',
    'Viewing Break': 'Pause de Visionnage',
    'Dashboard': 'Tableau de Bord',
    'Notifications': 'Notifications',
    'Settings': 'Paramètres'
  },
  de: {
    'Focus Mode': 'Fokus-Modus',
    'Movie Night': 'Filmabend',
    'Sports Live': 'Sport Live',
    'Family Time': 'Familienzeit',
    'Viewing Break': 'Sehpause',
    'Dashboard': 'Dashboard',
    'Notifications': 'Benachrichtigungen',
    'Settings': 'Einstellungen'
  },
  hi: {
    'Focus Mode': 'फोकस मोड',
    'Movie Night': 'मूवी नाइट',
    'Sports Live': 'स्पोर्ट्स लाइव',
    'Family Time': 'पारिवारिक समय',
    'Viewing Break': 'व्यूइंग ब्रेक',
    'Dashboard': 'डैशबोर्ड',
    'Notifications': 'सूचनाएं',
    'Settings': 'सेटिंग्स'
  },
  ja: {
    'Focus Mode': '集中モード',
    'Movie Night': '映画の夜',
    'Sports Live': 'スポーツライブ',
    'Family Time': '家族の時間',
    'Viewing Break': '視聴休憩',
    'Dashboard': 'ダッシュボード',
    'Notifications': '通知',
    'Settings': '設定'
  }
};

function queryMyMemory(text: string, targetLanguage: string): Promise<string> {
  return new Promise((resolve) => {
    if (!text || targetLanguage === 'en') {
      return resolve(text.replace(/[()]/g, ''));
    }
    const cleanText = text.trim();
    if (FALLBACK_TRANSLATIONS[targetLanguage]?.[cleanText]) {
      return resolve(FALLBACK_TRANSLATIONS[targetLanguage][cleanText].replace(/[()]/g, ''));
    }
    const encoded = encodeURIComponent(cleanText);
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${encodeURIComponent(targetLanguage)}`;
    
    const req = https.get(url, { headers: { 'User-Agent': 'QuietCuePlus/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.responseData && parsed.responseData.translatedText) {
            let resText = parsed.responseData.translatedText;
            if (resText.toUpperCase().includes('MYMEMORY WARNING')) {
              return resolve((FALLBACK_TRANSLATIONS[targetLanguage]?.[cleanText] || cleanText).replace(/[()]/g, ''));
            }
            return resolve(resText.replace(/[()]/g, ''));
          }
        } catch {}
        resolve((FALLBACK_TRANSLATIONS[targetLanguage]?.[cleanText] || cleanText).replace(/[()]/g, ''));
      });
    });
    
    req.on('error', () => {
      resolve((FALLBACK_TRANSLATIONS[targetLanguage]?.[cleanText] || cleanText).replace(/[()]/g, ''));
    });
    req.setTimeout(3500, () => {
      req.destroy();
      resolve((FALLBACK_TRANSLATIONS[targetLanguage]?.[cleanText] || cleanText).replace(/[()]/g, ''));
    });
  });
}

const app = express();
app.use(cors());

// Audio Upload & Voice Cloning Endpoint
app.post('/api/upload-voice-sample', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { audioBase64, format, filename } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: "No audio data provided" });
      return;
    }
    const cleanExt = (format || 'wav').replace(/[^a-zA-Z0-9]/g, '');
    const buffer = Buffer.from(audioBase64.replace(/^data:audio\/[a-zA-Z0-9.-]+;base64,/, ''), 'base64');
    
    // Save in both project dir and root dir
    const outFilename = filename || `user_voice_sample.${cleanExt}`;
    const projectPath = path.resolve(process.cwd(), outFilename);
    const parentPath = path.resolve(process.cwd(), `../${outFilename}`);
    
    fs.writeFileSync(projectPath, buffer);
    fs.writeFileSync(parentPath, buffer);
    
    console.log(`[VoiceStudio] Saved voice sample (${buffer.length} bytes) to ${projectPath}`);
    res.json({
      success: true,
      filename: outFilename,
      bytes: buffer.length,
      path: projectPath
    });
  } catch (err: any) {
    console.error("[VoiceStudio] Error saving voice sample:", err);
    res.status(500).json({ error: err.message || "Failed to save audio" });
  }
});

// Check if a voice recording exists on disk
app.get('/api/voice-sample-status', (req, res) => {
  const possiblePaths = [
    path.resolve(process.cwd(), 'user_voice_sample_1.mp3'),
    path.resolve(process.cwd(), 'user_voice_sample.mp3'),
    path.resolve(process.cwd(), 'user_voice_sample.wav'),
    path.resolve(process.cwd(), '../user_voice_sample.mp3'),
    path.resolve(process.cwd(), '../user_voice_sample_1.mp3'),
    path.resolve(process.cwd(), '../user_voice_sample.wav'),
    'C:\\Users\\sheet\\Documents\\Sound Recordings\\Recording.mp3',
    'C:\\Users\\sheet\\Documents\\Sound Recordings\\Recording (2).mp3'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const stats = fs.statSync(p);
      if (stats.size > 1000) {
        return res.json({
          exists: true,
          path: p,
          filename: path.basename(p),
          sizeBytes: stats.size
        });
      }
    }
  }
  res.json({ exists: false });
});

// Stream detected or uploaded audio sample for in-browser playback
app.get('/api/voice-sample-audio', (req, res) => {
  const possiblePaths = [
    path.resolve(process.cwd(), 'user_voice_sample_1.mp3'),
    path.resolve(process.cwd(), 'user_voice_sample.mp3'),
    path.resolve(process.cwd(), 'user_voice_sample.wav'),
    'C:\\Users\\sheet\\Documents\\Sound Recordings\\Recording.mp3',
    'C:\\Users\\sheet\\Documents\\Sound Recordings\\Recording (2).mp3'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const ext = path.extname(p).toLowerCase();
      res.setHeader('Content-Type', ext === '.wav' ? 'audio/wav' : 'audio/mpeg');
      return fs.createReadStream(p).pipe(res);
    }
  }
  res.status(404).send('Audio sample not found');
});

// Chat API endpoint using Bedrock + Fallback
app.post('/api/chat', express.json(), async (req, res) => {
  const text = req.body.text || req.body.message;
  if (!text) {
    res.status(400).json({ error: "Missing text or message" });
    return;
  }
  const result = await interpretCommand(text);
  let executedResult: any = null;
  const intent = result.intent;

  if (intent.intent === 'simulate_device_event') {
    const args = intent.arguments || {};
    executedResult = engine.simulateEvent({
      id: `evt-${Date.now()}`,
      category: args.category || 'system',
      title: args.title || 'Water Purifier Check',
      message: args.message || 'Notification triggered via Alexa+ command',
      sourceDevice: args.sourceDevice || 'Smart Water Purifier',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      simulated: true
    });
  } else if (intent.intent === 'set_notification_rule') {
    const args = intent.arguments || {};
    if (args.category && args.policy) {
      try {
        engine.setRule(args.category, args.policy);
        executedResult = { ruleUpdated: true, category: args.category, policy: args.policy };
      } catch (err) {
        console.warn('Could not set rule:', err);
      }
    }
  } else if (intent.intent === 'create_viewing_contract') {
    const contract = persistentStore.getActiveContract();
    if (contract) {
      contract.name = intent.arguments?.name || 'Focus Mode';
      contract.activityType = intent.arguments?.activityType || 'focus';
      if (intent.arguments?.rules) {
        contract.rules = intent.arguments.rules;
      }
      persistentStore.saveContract(contract);
      executedResult = { contractUpdated: true, contract };
    }
  }

  // Detect Alexa movie voice command ("Alexa, play Interstellar", "Search Dune", etc.)
  const lowerText = text.toLowerCase();
  const isMovieSearch = /^(alexa,?\s*)?(please\s*)?(play|search for|search|watch|put on|find)\s*(movie\s*)?/i.test(text) ||
    lowerText.includes('play interstellar') || lowerText.includes('play matrix') || lowerText.includes('play the matrix') ||
    lowerText.includes('play rings of power') || lowerText.includes('play formula 1');

  if (isMovieSearch) {
    let movieName = text
      .replace(/^(alexa,?\s*)?(please\s*)?(play|search for|search|watch|put on|find)\s*(movie\s*)?/i, '')
      .replace(/(\s*on fire tv|\s*on tv|\s*please)[.!]?$/i, '')
      .trim();
    if (!movieName) movieName = 'Interstellar';
    const speech = `Playing "${movieName}" on Fire TV...`;
    
    // Broadcast real-time voice typing event to Fire TV screen
    engine.broadcast('alexa_voice_search', {
      movie: movieName,
      speech,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    executedResult = { ...(executedResult || {}), alexaVoiceSearch: true, movie: movieName, speech };
    if (!result.intent?.responseText || result.intent.intent === 'unknown') {
      result.intent = {
        ...result.intent,
        intent: 'alexa_voice_search',
        responseText: `Calling out "${movieName}" to Fire TV. Typing search query and launching 4K stream.`
      };
    }
  }

  // Detect Alexa timer command ("Alexa, set a timer for 25 minutes", "timer 15 mins", "start focus timer for 30 minutes")
  const isTimerCommand = lowerText.includes('timer') || lowerText.includes('pomodoro') || lowerText.includes('countdown');
  if (isTimerCommand) {
    let minutes = 25;
    const matchMin = lowerText.match(/(\d+)\s*(?:mins?|minutes?|m\b)/i);
    const matchHour = lowerText.match(/(\d+)\s*(?:hours?|hrs?|h\b)/i);
    if (matchMin && matchMin[1]) {
      minutes = parseInt(matchMin[1], 10);
    } else if (matchHour && matchHour[1]) {
      minutes = parseInt(matchHour[1], 10) * 60;
    } else if (lowerText.includes('pomodoro')) {
      minutes = 25;
    }

    const currentContract = persistentStore.getActiveContract();
    const modeName = currentContract?.name || 'Focus Mode';
    const timer = engine.setModeTimer(minutes, modeName);

    const speech = `Set a ${minutes}-minute timer for ${modeName}.`;
    executedResult = { ...(executedResult || {}), modeTimerSet: true, timer, speech };

    result.intent = {
      intent: 'set_mode_timer',
      arguments: { minutes, modeName },
      responseText: `I've set a ${minutes}-minute timer for ${modeName}. When it finishes, QuietCue+ will quietly transition to a viewing break without jarring alarms.`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  // Detect Alexa language translation command - translate to Spanish, switch to French, etc.
  const isLanguageCommand = /translate\s*(to|into)?\s*(spanish|espanol|español|french|francais|français|german|deutsch|hindi|japanese|nihongo|english)/i.test(text) ||
    /switch\s*(language\s*(to)?)?\s*(spanish|espanol|español|french|francais|français|german|deutsch|hindi|japanese|nihongo|english)/i.test(text) ||
    /change\s*(language\s*(to)?)?\s*(spanish|espanol|español|french|francais|français|german|deutsch|hindi|japanese|nihongo|english)/i.test(text) ||
    /(spanish|french|german|hindi|japanese|english)\s*language/i.test(text);

  if (isLanguageCommand) {
    let targetLang = 'en';
    let langName = 'English';
    if (/spanish|espanol|español/i.test(text)) {
      targetLang = 'es';
      langName = 'Español';
    } else if (/french|francais|français/i.test(text)) {
      targetLang = 'fr';
      langName = 'Français';
    } else if (/german|deutsch/i.test(text)) {
      targetLang = 'de';
      langName = 'Deutsch';
    } else if (/hindi/i.test(text)) {
      targetLang = 'hi';
      langName = 'हिन्दी';
    } else if (/japanese|nihongo/i.test(text)) {
      targetLang = 'ja';
      langName = '日本語';
    }

    engine.setLanguage(targetLang);
    const speech = `Switching QuietCue+ interface to ${langName}.`;
    executedResult = { ...(executedResult || {}), languageChanged: true, language: targetLang, langName, speech };
    result.intent = {
      intent: 'switch_language',
      arguments: { language: targetLang, languageName: langName },
      responseText: `I have switched QuietCue+ to ${langName}. The dashboard and Fire TV client are now translating interface elements and subtitles online.`,
      requiresClarification: false,
      clarificationQuestion: null
    };
  }

  res.json({
    ...result,
    executedResult,
    notifications: persistentStore.getNotifications(),
    activeContract: persistentStore.getActiveContract(),
    viewerState: engine.getViewerState(),
    modeTimer: engine.getModeTimer(),
    currentLanguage: engine.getLanguage()
  });
});

// Real-time Cross-Device SSE Stream - syncs Browser Simulation and Fire TV Client
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial full state snapshot immediately on connect
  const initialEvent = {
    type: 'state_sync',
    timestamp: new Date().toISOString(),
    payload: {
      activeContract: persistentStore.getActiveContract(),
      contracts: persistentStore.getContracts(),
      notifications: persistentStore.getNotifications(),
      viewerState: engine.getViewerState(),
      soundPreferences: persistentStore.getSoundPreferences(),
      modeTimer: engine.getModeTimer(),
      currentLanguage: engine.getLanguage()
    }
  };
  res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);

  const unsubscribe = engine.subscribe((evt) => {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  });

  const keepAlive = setInterval(() => {
    res.write(`:keepalive ${Date.now()}\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});

// REST convenience endpoints for direct dashboard reactivity
app.get('/api/state', (req, res) => {
  res.json({
    activeContract: persistentStore.getActiveContract(),
    contracts: persistentStore.getContracts(),
    notifications: persistentStore.getNotifications(),
    viewerState: engine.getViewerState(),
    soundPreferences: persistentStore.getSoundPreferences(),
    modeTimer: engine.getModeTimer(),
    currentLanguage: engine.getLanguage()
  });
});

// Mode Timer action endpoints
app.post('/api/action/set-mode-timer', express.json(), (req, res) => {
  const minutes = Number(req.body?.minutes) || 25;
  const modeName = req.body?.modeName || persistentStore.getActiveContract()?.name || 'Focus Mode';
  const timer = engine.setModeTimer(minutes, modeName);
  res.json({ success: true, timer });
});

app.post('/api/action/pause-mode-timer', (req, res) => {
  const timer = engine.pauseModeTimer();
  res.json({ success: true, timer });
});

app.post('/api/action/resume-mode-timer', (req, res) => {
  const timer = engine.resumeModeTimer();
  res.json({ success: true, timer });
});

app.post('/api/action/cancel-mode-timer', (req, res) => {
  const cancelled = engine.cancelModeTimer();
  res.json({ success: true, cancelled });
});

// Translation action endpoints
app.post('/api/action/translate', express.json(), async (req, res) => {
  const text = req.body?.text || '';
  const targetLanguage = req.body?.targetLanguage || 'en';
  const translated = await queryMyMemory(text, targetLanguage);
  res.json({
    success: true,
    original: text,
    targetLanguage,
    translated: translated.replace(/[()]/g, '')
  });
});

app.post('/api/action/set-language', express.json(), (req, res) => {
  const language = req.body?.language || 'en';
  engine.setLanguage(language);
  res.json({ success: true, language });
});

// Direct action endpoints for high-reliability dashboard interactions
app.post('/api/action/alexa-voice-search', express.json(), (req, res) => {
  const movie = req.body?.movie || 'Interstellar';
  const speech = req.body?.speech || `Playing "${movie}" on Fire TV...`;
  engine.broadcast('alexa_voice_search', {
    movie,
    speech,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  res.json({
    success: true,
    movie,
    speech
  });
});

app.post('/api/action/trigger-break', express.json(), (req, res) => {
  const condition = req.body?.condition || 'break';
  const released = engine.triggerViewingBreak(condition);
  res.json({
    success: true,
    viewerState: engine.getViewerState(),
    releasedNotifications: released,
    notifications: engine.getQueue()
  });
});

app.post('/api/action/end-session', express.json(), (req, res) => {
  const contract = persistentStore.getActiveContract();
  if (contract) {
    contract.status = 'completed';
    contract.sessionEndTime = new Date().toISOString();
    persistentStore.saveContract(contract);
  }
  engine.setViewerState('Summary');
  engine.broadcast('session_ended', {
    contract: persistentStore.getActiveContract(),
    viewerState: engine.getViewerState(),
    notifications: engine.getQueue()
  });
  res.json({ success: true, contract: persistentStore.getActiveContract(), notifications: engine.getQueue() });
});

app.post('/api/action/reset-demo', express.json(), (req, res) => {
  engine.reset();
  res.json({ success: true, message: 'Reset demo completed', activeContract: persistentStore.getActiveContract() });
});

app.post('/api/action/reset-contract', express.json(), (req, res) => {
  const contract = persistentStore.getActiveContract();
  if (contract) {
    contract.name = 'Focus Mode';
    contract.activityType = 'movie';
    contract.status = 'active';
    contract.rules = getDefaultMovieRules();
    persistentStore.saveContract(contract);
  }
  engine.broadcast('contract_updated', {
    activeContract: persistentStore.getActiveContract(),
    reset: true
  });
  res.json({ success: true, contract: persistentStore.getActiveContract() });
});

app.post('/api/action/save-contract', express.json(), (req, res) => {
  const { contract } = req.body;
  if (contract) {
    persistentStore.saveContract(contract);
  }
  engine.broadcast('contract_updated', {
    activeContract: persistentStore.getActiveContract()
  });
  res.json({ success: true, contract: persistentStore.getActiveContract() });
});

app.post('/api/action/simulate-event', express.json(), (req, res) => {
  const { category, title, message, sourceDevice } = req.body;
  const result = engine.simulateEvent({
    id: `evt-${Date.now()}`,
    category: category || 'security',
    title: title || 'Simulated Event',
    message: message || 'Event triggered from dashboard',
    sourceDevice: sourceDevice || 'Dashboard',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    simulated: true
  });
  res.json({ success: true, event: result });
});

app.post('/api/action/update-rule', express.json(), (req, res) => {
  const { category, policy } = req.body;
  const updated = engine.setRule(category, policy);
  res.json({ success: true, category, policy: updated });
});

app.post('/api/sound-preferences', express.json(), (req, res) => {
  const updated = persistentStore.setSoundPreferences(req.body);
  engine.broadcast('state_sync', {
    soundPreferences: updated,
    activeContract: persistentStore.getActiveContract(),
    notifications: persistentStore.getNotifications(),
    viewerState: engine.getViewerState()
  });
  res.json({ success: true, soundPreferences: updated });
});

app.post('/api/action/activate-contract', express.json(), (req, res) => {
  const { contractId } = req.body;
  try {
    const activated = persistentStore.setActiveContract(contractId);
    engine.broadcast('contract_updated', {
      activeContract: activated
    });
    res.json({ success: true, contract: activated });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/action/set-viewer-state', express.json(), (req, res) => {
  const { state } = req.body;
  let released: any[] = [];
  if (state === 'Break') {
    released = engine.triggerViewingBreak('break');
  } else if (state === 'Credits') {
    released = engine.triggerViewingBreak('credits');
  } else if (state === 'Watching' || state === 'Paused' || state === 'Summary') {
    engine.setViewerState(state);
  }
  res.json({
    success: true,
    viewerState: engine.getViewerState(),
    releasedNotifications: released,
    notifications: engine.getQueue()
  });
});

app.post('/api/action/release-notification', express.json(), (req, res) => {
  const { id } = req.body;
  const notif = persistentStore.updateNotification(id, {
    status: 'displayed',
    handledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    soundPlayed: 'normal'
  });
  engine.updateContractSummary();
  engine.broadcast('notification_released', {
    notification: notif,
    notifications: persistentStore.getNotifications(),
    activeContract: persistentStore.getActiveContract()
  });
  res.json({ success: true, notification: notif });
});

app.post('/api/action/dismiss-notification', express.json(), (req, res) => {
  const { id } = req.body;
  const notif = persistentStore.updateNotification(id, {
    status: 'dismissed',
    handledAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  engine.updateContractSummary();
  engine.broadcast('notification_dismissed', {
    notification: notif,
    notifications: persistentStore.getNotifications(),
    activeContract: persistentStore.getActiveContract()
  });
  res.json({ success: true, notification: notif });
});




const transports = new Map<string, SSEServerTransport>();

function createQuietCueServer() {
  const server = new McpServer({
    name: "QuietCue-Server",
    version: "1.0.0"
  });

  // 1. Existing tool: list_connected_devices
  server.tool(
    "list_connected_devices",
    "List simulated smart home devices connected to QuietCue",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              { name: "Fire TV", status: "Online", simulated: true },
              { name: "Thermostat", status: "72°F • Online", simulated: true },
              { name: "Smart Lights", status: "On • Online", simulated: true },
              { name: "Front Door - Ring", status: "Online", simulated: true }
            ], null, 2)
          }
        ]
      };
    }
  );

  // 2. Existing tool: get_notification_queue
  server.tool(
    'get_notification_queue',
    'Return the pending notifications and their current handling states',
    {
      category: z.string().optional(),
      status: z.string().optional()
    },
    async ({ category, status }) => {
      let queue = engine.getQueue();
      if (category) queue = queue.filter(q => q.event.category === category);
      if (status) queue = queue.filter(q => q.status === status);
      return {
        content: [{ type: 'text', text: JSON.stringify({ viewerState: engine.getViewerState(), queue }, null, 2) }]
      };
    }
  );

  // 3. Existing tool: simulate_device_event
  server.tool(
    'simulate_device_event',
    'Create a simulated household event for testing QuietCue',
    {
      id: z.string(),
      category: z.enum(['security', 'package', 'thermostat', 'light', 'system', 'timer', 'device_unavailable', 'health', 'calendar']),
      title: z.string(),
      message: z.string(),
      sourceDevice: z.string()
    },
    async ({ id, category, title, message, sourceDevice }) => {
      const result = engine.simulateEvent({
        id, category, title, message, sourceDevice,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        simulated: true
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // 4. Existing tool: set_notification_rule
  server.tool(
    'set_notification_rule',
    'Configure how notification categories are handled',
    {
      category: z.enum(['security', 'package', 'thermostat', 'light', 'system', 'timer', 'device_unavailable', 'health', 'calendar']),
      policy: z.enum(['interrupt_now', 'next_break', 'summarize_later'])
    },
    async ({ category, policy }) => {
      const newPolicy = engine.setRule(category, policy);
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, category, policy: newPolicy }, null, 2) }]
      };
    }
  );

  // 5. Existing tool: explain_notification_decision
  server.tool(
    'explain_notification_decision',
    'Return the reasoning for a notification decision',
    { id: z.string() },
    async ({ id }) => {
      const decision = engine.getDecision(id);
      if (!decision) {
        return { isError: true, content: [{ type: 'text', text: `Error: Notification ID ${id} not found.` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(decision, null, 2) }] };
    }
  );

  // 6. Existing tool: set_viewer_state
  server.tool(
    'set_viewer_state',
    'Change the simulated viewer state',
    { state: z.enum(['Watching', 'Paused', 'Break', 'Summary']) },
    async ({ state }) => {
      const newState = engine.setViewerState(state);
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, viewerState: newState }, null, 2) }] };
    }
  );

  // 7. Existing tool: reset_demo
  server.tool(
    'reset_demo',
    'Reset the in-memory state and demo data',
    {},
    async () => {
      engine.reset();
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Demo state reset to default' }, null, 2) }] };
    }
  );

  // --- NEW VIEWING CONTRACT MCP TOOLS ---

  // A. create_viewing_contract
  server.tool(
    'create_viewing_contract',
    'Create and persist a new Viewing Contract governing smart-home alerts during an activity',
    {
      name: z.string(),
      activityType: z.enum(['movie', 'sports', 'family', 'study', 'custom']),
      rules: z.array(z.object({
        eventCategory: z.enum(['security', 'package', 'thermostat', 'light', 'system', 'timer', 'device_unavailable', 'health', 'calendar']),
        handlingPolicy: z.enum(['interrupt_now', 'next_break', 'summarize_later']),
        displayCondition: z.enum(['credits', 'immediate', 'pause', 'summary_only']).optional(),
        priority: z.number().min(1).max(5).default(3),
        userDefined: z.boolean().default(true)
      })).optional(),
      breakConfiguration: z.object({
        allowMidBreaks: z.boolean().default(true),
        releaseOnCredits: z.boolean().default(true)
      }).optional(),
      endCondition: z.string().optional()
    },
    async ({ name, activityType, rules, breakConfiguration, endCondition }) => {
      const now = new Date().toISOString();
      const contractId = `contract-${Date.now().toString(36)}`;
      const contractRules: ViewingRule[] = rules ? rules.map(r => ({ ...r, updatedAt: now })) : getDefaultMovieRules();

      const newContract: ViewingContract = {
        contractId,
        name,
        activityType,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        sessionStartTime: now,
        breakConfiguration: breakConfiguration || { allowMidBreaks: true, releaseOnCredits: true },
        endCondition: endCondition || 'movie_credits_or_manual',
        rules: contractRules,
        notificationSummary: {
          totalEvents: 0,
          displayedCount: 0,
          queuedCount: 0,
          summarizedCount: 0,
          dismissedCount: 0
        }
      };

      persistentStore.saveContract(newContract);
      engine.broadcast('contract_updated', {
        activeContract: persistentStore.getActiveContract(),
        createdContract: newContract
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, contract: newContract }, null, 2) }]
      };
    }
  );

  // B. get_viewing_contract
  server.tool(
    'get_viewing_contract',
    'Return the requested Viewing Contract by ID, or the currently active contract',
    { contractId: z.string().optional() },
    async ({ contractId }) => {
      const contract = persistentStore.getContract(contractId);
      if (!contract) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: No contract found with ID ${contractId || 'active'}` }]
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(contract, null, 2) }]
      };
    }
  );

  // C. update_viewing_contract
  server.tool(
    'update_viewing_contract',
    'Update rules, break configurations, or end condition on an existing Viewing Contract',
    {
      contractId: z.string(),
      name: z.string().optional(),
      status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
      rules: z.array(z.object({
        eventCategory: z.enum(['security', 'package', 'thermostat', 'light', 'system', 'timer', 'device_unavailable', 'health', 'calendar']),
        handlingPolicy: z.enum(['interrupt_now', 'next_break', 'summarize_later']),
        displayCondition: z.enum(['credits', 'immediate', 'pause', 'summary_only']).optional(),
        priority: z.number().min(1).max(5),
        userDefined: z.boolean()
      })).optional()
    },
    async ({ contractId, name, status, rules }) => {
      const contract = persistentStore.getContract(contractId);
      if (!contract) {
        return { isError: true, content: [{ type: 'text', text: `Contract ${contractId} not found.` }] };
      }
      if (name) contract.name = name;
      if (status) contract.status = status;
      if (rules) {
        const now = new Date().toISOString();
        contract.rules = rules.map(r => ({ ...r, updatedAt: now }));
      }
      contract.updatedAt = new Date().toISOString();
      persistentStore.saveContract(contract);
      engine.broadcast('contract_updated', {
        activeContract: persistentStore.getActiveContract(),
        updatedContract: contract
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, contract }, null, 2) }]
      };
    }
  );

  // D. activate_viewing_contract
  server.tool(
    'activate_viewing_contract',
    'Activate a Viewing Contract so that subsequent household events follow its policies',
    { contractId: z.string() },
    async ({ contractId }) => {
      try {
        const activated = persistentStore.setActiveContract(contractId);
        engine.broadcast('contract_updated', {
          activeContract: activated
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, activeContract: activated }, null, 2) }]
        };
      } catch (e: any) {
        return { isError: true, content: [{ type: 'text', text: e.message }] };
      }
    }
  );

  // E. end_viewing_contract
  server.tool(
    'end_viewing_contract',
    'Complete an active viewing session, finalize summary statistics, and preserve event records',
    { contractId: z.string() },
    async ({ contractId }) => {
      const contract = persistentStore.getContract(contractId);
      if (!contract) {
        return { isError: true, content: [{ type: 'text', text: `Contract ${contractId} not found.` }] };
      }
      contract.status = 'completed';
      contract.sessionEndTime = new Date().toISOString();
      contract.updatedAt = new Date().toISOString();

      const notifs = persistentStore.getNotifications().filter(n => n.contractId === contractId);
      contract.notificationSummary = {
        totalEvents: notifs.length,
        displayedCount: notifs.filter(n => n.status === 'displayed').length,
        queuedCount: notifs.filter(n => n.status === 'pending').length,
        summarizedCount: notifs.filter(n => n.status === 'summarized').length,
        dismissedCount: notifs.filter(n => n.status === 'dismissed').length
      };

      persistentStore.saveContract(contract);
      engine.setViewerState('Summary');
      engine.broadcast('session_ended', {
        contract,
        viewerState: engine.getViewerState(),
        notifications: persistentStore.getNotifications()
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, contract, summary: contract.notificationSummary }, null, 2) }]
      };
    }
  );

  // F. get_viewing_summary
  server.tool(
    'get_viewing_summary',
    'Return the actual session event history, decisions, and notification outcomes for a contract',
    { contractId: z.string().optional() },
    async ({ contractId }) => {
      const contract = persistentStore.getContract(contractId);
      if (!contract) {
        return { isError: true, content: [{ type: 'text', text: 'Contract not found.' }] };
      }
      const notifications = persistentStore.getNotifications().filter(n => n.contractId === contract.contractId);
      const summary = {
        contractId: contract.contractId,
        name: contract.name,
        status: contract.status,
        totalEvents: notifications.length,
        displayed: notifications.filter(n => n.status === 'displayed'),
        queued: notifications.filter(n => n.status === 'pending'),
        summarized: notifications.filter(n => n.status === 'summarized'),
        dismissed: notifications.filter(n => n.status === 'dismissed')
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
      };
    }
  );

  return server;
}

app.get('/mcp', async (req, res) => {
  const server = createQuietCueServer();
  const transport = new SSEServerTransport('/mcp/messages', res);
  transports.set(transport.sessionId, transport);
  
  res.on('close', () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post('/mcp/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send("Session not found");
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`QuietCue MCP Server with Viewing Contracts running on port ${PORT}`);
});
