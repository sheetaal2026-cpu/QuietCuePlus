const fs = require('fs');

const appContent = `import { useState, useRef, useEffect } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { soundManager } from './soundManager.js';
import { evaluateSounds } from './soundLogic.js';
import './App.css';

interface SoundEventLog {
  time: string;
  id: string;
  category: string;
  expectedSound: string;
  attempted: boolean;
  status: 'success' | 'failed' | 'muted' | 'excluded';
}

function App() {
  const [connected, setConnected] = useState(false);
  const [statusText, setStatusText] = useState('Disconnected');
  const [tools, setTools] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [protocolTrace, setProtocolTrace] = useState<any[]>([]);
  const clientRef = useRef<Client | null>(null);

  const [queue, setQueue] = useState<any[]>([]);
  const [viewerState, setViewerState] = useState('Watching');
  const [explanation, setExplanation] = useState<string | null>(null);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [masterMute, setMasterMute] = useState(() => localStorage.getItem('masterMute') === 'true');
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('volume') || '0.7'));
  const [soundMode, setSoundMode] = useState(() => localStorage.getItem('soundMode') || 'all');
  const [summaryChime, setSummaryChime] = useState(() => localStorage.getItem('summaryChime') !== 'false');
  
  // Sound tracking
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  const [soundLogs, setSoundLogs] = useState<SoundEventLog[]>([]);

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [bedrockStatus, setBedrockStatus] = useState<'unknown' | 'bedrock' | 'fallback'>('unknown');

  const addTrace = (type: string, data: any) => {
    setProtocolTrace(prev => [{ type, data, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  const connectToQuietCue = async () => {
    try {
      setStatusText('Connecting...');
      const transport = new SSEClientTransport(new URL('http://localhost:3001/mcp'));
      const client = new Client({ name: "QuietCue-Client", version: "1.0.0" }, { capabilities: {} });
      clientRef.current = client;
      
      const originalRequest = client.request.bind(client);
      client.request = async (request: any, schema: any, options: any) => {
        addTrace('req', request);
        try {
          const res = await originalRequest(request, schema, options);
          addTrace('res', res);
          return res;
        } catch (err: any) {
          addTrace('error', err.message);
          throw err;
        }
      };

      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000));
      await Promise.race([connectPromise, timeoutPromise]);
      
      setConnected(true);
      setStatusText('Connected');
      addTrace('system', 'Connected successfully');
      
      const response = await client.listTools() as any;
      setTools(response.tools || []);
      await fetchQueue(client);
    } catch (error: any) {
      console.error(error);
      setStatusText('Connection failed');
    }
  };

  const fetchQueue = async (client = clientRef.current) => {
    if (!client) return;
    try {
      const result = await client.callTool({ name: "get_notification_queue", arguments: {} }) as any;
      if (result.content && result.content.length > 0) {
        const data = JSON.parse(result.content[0].text);
        setQueue(data.queue);
        setViewerState(data.viewerState);
        await processSounds(data.queue, data.viewerState);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const sendChatMessage = async (msgOverride?: string) => {
    const msg = (msgOverride || chatInput).trim();
    if (!msg) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg })
      });
      const data = await res.json();
      
      setBedrockStatus(data.source);
      
      const { intent, arguments: args, responseText, requiresClarification, clarificationQuestion } = data.intent;

      let reply = responseText;
      if (requiresClarification && clarificationQuestion) {
        reply += " " + clarificationQuestion;
      }
      
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      addTrace('bedrock', { intent, arguments: args });

      if (!requiresClarification && intent !== 'unknown') {
        if (intent === 'request_summary') {
          // internal app state change, not full tool
        } else if (clientRef.current) {
          const mcpRes = await clientRef.current.callTool({ name: intent, arguments: args || {} }) as any;
          if (intent === 'list_connected_devices' && mcpRes.content) {
            setDevices(JSON.parse(mcpRes.content[0].text));
          } else if (['simulate_device_event', 'set_notification_rule'].includes(intent)) {
            await fetchQueue();
          } else if (intent === 'explain_notification_decision' && mcpRes.content && !mcpRes.isError) {
             const decision = JSON.parse(mcpRes.content[0].text);
             setChatMessages(prev => [...prev, { role: 'assistant', text: \`Rule applied: \${decision.appliedRule}. \${decision.explanation}\` }]);
          }
        }
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: \`Error: \${e.message}\` }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    soundManager.setVolume(volume);
    soundManager.setMuted(masterMute);
    localStorage.setItem('volume', volume.toString());
    localStorage.setItem('masterMute', masterMute.toString());
    localStorage.setItem('soundMode', soundMode);
    localStorage.setItem('summaryChime', summaryChime.toString());
  }, [volume, masterMute, soundMode, summaryChime]);

  const logSoundEvent = (id: string, category: string, expectedSound: string, attempted: boolean, status: SoundEventLog['status']) => {
    setSoundLogs(prev => [{ time: new Date().toLocaleTimeString(), id, category, expectedSound, attempted, status }, ...prev].slice(0, 50));
  };

  const initAudio = async () => {
    const success = await soundManager.init();
    setSoundEnabled(success);
  };

  const previewSound = async (type: 'critical' | 'normal' | 'summary') => {
    if (!soundEnabled) await initAudio();
    if (type === 'critical') soundManager.playCritical();
    else if (type === 'normal') soundManager.playNormal();
    else if (type === 'summary') soundManager.playSummary();
  };

  const processSounds = async (currentQueue: any[], newState: string) => {
    const { actions, newPlayedIds } = evaluateSounds(currentQueue, newState, viewerState, playedIds, { soundEnabled, masterMute, soundMode, summaryChime });
    for (const action of actions) {
      if (action.playMethod) {
        let success = false;
        if (action.playMethod === 'playCritical') success = await soundManager.playCritical();
        else if (action.playMethod === 'playNormal') success = await soundManager.playNormal();
        else if (action.playMethod === 'playSummary') success = await soundManager.playSummary();
        logSoundEvent(action.id, action.category, action.expectedSound, action.attempted, success ? 'success' : 'failed');
      } else {
        logSoundEvent(action.id, action.category, action.expectedSound, action.attempted, action.status);
      }
    }
    setPlayedIds(newPlayedIds);
  };

  const topCritical = queue.find(q => q.status === 'displayed' && q.appliedRule === 'interrupt_now');

  return (
    <div className="app-container">
      {/* Header */}
      <header className="top-header">
        <div className="logo-section">
          <div className="logo-icon">|||</div>
          <div className="logo-text">
            <h1>QuietCue</h1>
            <p>Smart Alerts. Better Moments.</p>
          </div>
          <button className="mcp-badge" onClick={connectToQuietCue} style={{background: 'transparent', cursor: 'pointer'}}>
            ☁️ {connected ? 'MCP Connected' : 'Connect MCP'}
          </button>
        </div>
        <div className="header-tabs">
          <div className="header-tab active">🏠 Home</div>
          <div className="header-tab">📱 Devices</div>
          <div className="header-tab">🔔 Notifications</div>
          <div className="header-tab">⚙️ Settings</div>
        </div>
        <div className="bedrock-badge">
          <span>Amazon Bedrock</span>
          <small><div className="status-dot"></div> {bedrockStatus === 'bedrock' ? 'Connected' : bedrockStatus === 'fallback' ? 'Fallback Mode' : 'Ready'}</small>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* ROW 1 */}
        <div className="dashboard-row-top">
          {/* Movie Player */}
          <div className="glass-panel movie-player">
            {topCritical && (
              <div className="movie-overlay">
                <div className="movie-overlay-header">
                  <span>🛡️ CRITICAL ALERT</span>
                  <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <h4>{topCritical.event.title}</h4>
                <p>{topCritical.event.message}</p>
                <div className="movie-controls">
                  <span>||| ×</span>
                </div>
              </div>
            )}
            <div className="movie-info">
              <h2>The Last Horizon</h2>
              <p>Adventure • 2024 • 1h 52m</p>
              <div className="progress-bar">
                <span style={{fontSize: '24px'}}>▶</span>
                <div className="progress-line"><div className="progress-fill"></div></div>
                <span style={{fontSize: '12px'}}>32:16 / 1:52:00</span>
              </div>
            </div>
            <div className="player-tabs">
              <div className="player-tab">🏠 Connected<br/>Devices</div>
              <div className="player-tab">🔔 Notification<br/>Queue</div>
              <div className="player-tab">🔊 Sound<br/>Settings</div>
              <div className="player-tab">⚙️ Notification<br/>Rules</div>
              <div className="player-tab">💬 Conversation</div>
            </div>
          </div>

          {/* Connected Devices */}
          <div className="glass-panel devices-panel">
            <div className="panel-header">
              <h3>🏠 Connected Devices</h3>
              <span className="mcp-badge" style={{border: 'none', background: 'rgba(255,255,255,0.1)'}}>{devices.length} devices (simulated)</span>
            </div>
            <div style={{overflowY: 'auto', flex: 1}}>
              {devices.map((d, i) => (
                <div key={i} className="device-item">
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div className={\`device-icon-box \${d.status === 'on' || d.status.includes('reporting') || d.status === 'Closed' ? 'green' : d.status === 'unavailable' ? 'red' : ''}\`}>
                      {d.name.includes('Light') ? '💡' : d.name.includes('Thermo') ? '🌡️' : d.name.includes('Motion') ? '🏃' : d.name.includes('Sensor') ? '🚪' : '🔌'}
                    </div>
                    <div className="device-info">
                      <h4>{d.name}</h4>
                      <p>{d.name.split(' ')[0]} • {d.name.includes('Light') ? 'Lighting' : d.name.includes('Thermo') ? 'Climate' : 'Sensors'}</p>
                    </div>
                  </div>
                  <div className="device-status">
                    <span style={{color: d.status === 'unavailable' ? 'var(--alert-red)' : d.status === 'off' ? 'var(--text-muted)' : 'var(--success)'}}>{d.status}</span>
                  </div>
                </div>
              ))}
              {devices.length === 0 && <p style={{fontSize: '12px', color: 'gray', textAlign: 'center'}}>No devices loaded.</p>}
            </div>
          </div>

          {/* Notification Queue */}
          <div className="glass-panel queue-panel">
            <div className="panel-header">
              <h3>🔔 Notification Queue</h3>
              <span className="mcp-badge" style={{border: 'none', background: 'rgba(255,255,255,0.1)'}}>{queue.filter(q => q.status !== 'displayed').length} pending</span>
            </div>
            <div style={{overflowY: 'auto', flex: 1}}>
              {queue.map((q, idx) => {
                const colorClass = q.appliedRule === 'interrupt_now' ? 'q-red' : q.appliedRule === 'next_break' ? 'q-blue' : 'q-green';
                const label = q.appliedRule === 'interrupt_now' ? 'Critical Alert' : q.appliedRule === 'next_break' ? 'Normal' : 'Routine';
                return (
                  <div key={idx} className={\`queue-item \${colorClass}\`}>
                    <div className="queue-header-row">
                      <span style={{fontSize: '12px', fontWeight: 'bold'}}>{label}</span>
                      <small>{q.status}</small>
                    </div>
                    <h4>{q.event.title}</h4>
                    <p>{q.event.message}</p>
                  </div>
                );
              })}
              {queue.length === 0 && <p style={{fontSize: '12px', color: 'gray', textAlign: 'center'}}>Queue is empty.</p>}
            </div>
          </div>

          {/* Sound Settings */}
          <div className="glass-panel sound-panel">
            <div className="panel-header">
              <h3>🔊 Sound Settings</h3>
              {!soundEnabled && <button onClick={initAudio} style={{fontSize: '11px', padding: '4px 8px', borderRadius: '12px', border: 'none', background: 'var(--success)', color: 'white', cursor: 'pointer'}}>Enable Audio</button>}
            </div>
            
            <div className="toggle-row">
              <span>Master Sound</span>
              <div className={\`toggle-switch \${!masterMute ? 'on' : ''}\`} onClick={() => setMasterMute(!masterMute)}></div>
            </div>
            <div className="toggle-row">
              <span>Mute All</span>
              <div className={\`toggle-switch \${masterMute ? 'on' : ''}\`} onClick={() => setMasterMute(!masterMute)}></div>
            </div>
            <div style={{marginBottom: '16px'}}>
              <span style={{fontSize: '14px', display: 'flex', justifyContent: 'space-between'}}>Volume <span>{Math.round(volume * 100)}%</span></span>
              <input type="range" className="vol-slider" min="0" max="1" step="0.1" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} />
            </div>
            <div style={{marginBottom: '20px'}}>
              <div style={{fontSize: '14px', marginBottom: '8px'}}>Sound Mode</div>
              <select value={soundMode} onChange={e => setSoundMode(e.target.value)} style={{width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px'}}>
                <option value="all">All Notifications</option>
                <option value="critical">Critical Only</option>
                <option value="off">All Off</option>
              </select>
            </div>
            <div style={{fontSize: '14px', marginBottom: '8px'}}>Preview Sounds</div>
            <button className="preview-btn btn-red" onClick={() => previewSound('critical')}>🔊 Critical (two beeps)</button>
            <button className="preview-btn btn-blue" onClick={() => previewSound('normal')}>🔉 Normal (one beep)</button>
            <button className="preview-btn btn-purple" onClick={() => previewSound('summary')}>🔈 Summary (chime)</button>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="dashboard-row-bottom">
          
          {/* Ask Alexa / Chat */}
          <div className="glass-panel chat-panel">
            <div className="panel-header">
              <h3>🔵 Ask Alexa <span style={{fontSize: '10px', color: 'var(--accent-blue)', marginLeft: '8px'}}>Powered by Amazon Bedrock</span></h3>
            </div>
            <div className="chat-window">
              {chatMessages.map((msg, i) => (
                <div key={i} className={\`chat-bubble \${msg.role === 'user' ? 'chat-user' : 'chat-bot'}\`}>
                  {msg.text}
                </div>
              ))}
              {isTyping && <div className="chat-bubble chat-bot" style={{opacity: 0.7}}>Thinking...</div>}
            </div>
            <div className="chat-suggestions">
              <span className="chat-pill" onClick={() => sendChatMessage("Show notification queue")}>Show notification queue</span>
              <span className="chat-pill" onClick={() => sendChatMessage("Simulate a critical alert")}>Simulate a critical alert</span>
              <span className="chat-pill" onClick={() => sendChatMessage("Change package rule")}>Change package rule</span>
              <span className="chat-pill" onClick={() => sendChatMessage("Give me a summary")}>Give me a summary</span>
            </div>
            <div className="chat-input-row">
              <div style={{width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>🎤</div>
              <input type="text" placeholder="Type a message..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} />
              <button className="chat-send" onClick={() => sendChatMessage()}>➤</button>
            </div>
          </div>

          {/* Protocol Trace */}
          <div className="glass-panel trace-panel">
            <div className="panel-header">
              <h3>⚙️ Protocol Trace</h3>
              <span className="mcp-badge" style={{color: 'var(--success)', border: '1px solid var(--success)', background: 'transparent'}}>● Live</span>
            </div>
            <div>
              {protocolTrace.map((trace, idx) => (
                <div key={idx} className="trace-item">
                  <div className="trace-icon">✳</div>
                  <div className="trace-content">
                    <span className="trace-success">Success</span>
                    <p><strong>{trace.type.toUpperCase()}</strong>: {trace.time}</p>
                    <small>{typeof trace.data === 'string' ? trace.data : JSON.stringify(trace.data).substring(0, 50) + '...'}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sound Activity Log */}
          <div className="glass-panel log-panel">
            <div className="panel-header">
              <h3>🎶 Recent Sound Activity</h3>
              <a href="#" style={{color: 'var(--accent-blue)', fontSize: '12px', textDecoration: 'none'}}>View All</a>
            </div>
            <table className="log-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Type</th>
                  <th>Result</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {soundLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td>{log.category}</td>
                    <td style={{color: log.expectedSound.includes('Critical') ? 'var(--alert-red)' : log.expectedSound.includes('Normal') ? 'var(--alert-blue)' : 'var(--alert-purple)'}}>{log.expectedSound.split(' ')[0]}</td>
                    <td style={{color: log.status === 'success' ? 'var(--success)' : 'var(--text-muted)'}}>{log.status === 'success' ? 'Played' : log.status === 'muted' || log.status === 'excluded' ? 'Muted (silent)' : 'Failed'}</td>
                    <td>{log.time}</td>
                  </tr>
                ))}
                {soundLogs.length === 0 && <tr><td colSpan={4} style={{textAlign: 'center', color: 'gray'}}>No sound activity yet.</td></tr>}
              </tbody>
            </table>
            <div style={{marginTop: 'auto', padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '16px'}}>ℹ️</span>
              Sounds play only when notifications are actually surfaced, based on your current settings and rules.
            </div>
          </div>

        </div>
      </div>

      <footer className="footer">
        <div>
          <strong style={{color: 'white', marginRight: '8px'}}>||| QuietCue</strong> Your home. Your rules. Your moments.
        </div>
        <div className="status-indicators">
          <span><span className="status-dot"></span> MCP Server: {connected ? 'Connected' : 'Disconnected'}</span>
          <span><span className="status-dot" style={{background: bedrockStatus === 'fallback' ? 'orange' : 'var(--success)'}}></span> Bedrock: {bedrockStatus === 'bedrock' ? 'Connected' : 'Fallback'}</span>
          <span><span className="status-dot"></span> Local Storage: Ready</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
`;

fs.writeFileSync('C:/Users/sheet/Documents/AIDetector/QuietCue/frontend/src/App.tsx', appContent);
console.log('App.tsx rewritten.');
