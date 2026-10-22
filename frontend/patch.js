import fs from 'fs';

let content = fs.readFileSync('C:/Users/sheet/Documents/AIDetector/QuietCue/frontend/src/App.tsx', 'utf-8');

// 1. Add state
const stateInjection = `
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [bedrockStatus, setBedrockStatus] = useState<'unknown' | 'bedrock' | 'fallback'>('unknown');

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
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
      
      setBedrockStatus(data.source); // 'bedrock' or 'fallback'
      
      const { intent, arguments: args, responseText, requiresClarification, clarificationQuestion } = data.intent;

      let reply = responseText;
      if (requiresClarification && clarificationQuestion) {
        reply += " " + clarificationQuestion;
      }
      
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      if (!requiresClarification && intent !== 'unknown') {
        if (intent === 'request_summary') {
          await changeViewerState('Summary');
        } else if (clientRef.current) {
          const mcpRes = await clientRef.current.callTool({
            name: intent,
            arguments: args || {}
          }) as any;
          
          if (intent === 'list_connected_devices' && mcpRes.content) {
            setDevices(JSON.parse(mcpRes.content[0].text));
          } else if (['simulate_device_event', 'set_notification_rule'].includes(intent)) {
            await fetchQueue();
          } else if (intent === 'explain_notification_decision' && mcpRes.content && !mcpRes.isError) {
             const decision = JSON.parse(mcpRes.content[0].text);
             setExplanation(\`Explanation for \${decision.event.title}:\\n\\nRule applied: \${decision.appliedRule}\\nCurrent Status: \${decision.status}\\n\\nReasoning: \${decision.explanation}\`);
          } else if (intent === 'explain_notification_decision' && mcpRes.isError) {
             setChatMessages(prev => [...prev, { role: 'assistant', text: mcpRes.content[0].text }]);
          }
        }
      }
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: \`Error: \${e.message}\` }]);
    } finally {
      setIsTyping(false);
    }
  };
`;

content = content.replace('// Update soundManager when settings change', stateInjection + '\n  // Update soundManager when settings change');

// 2. Add UI
const uiInjection = `
      {/* ROW 4: Conversational Assistant */}
      <div className="dashboard-row bottom-row">
        <div className="panel panel-branding" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
          <div className="panel-header">
            <h3>💬 Conversational Assistant</h3>
            <span className="badge" style={{ backgroundColor: bedrockStatus === 'bedrock' ? '#28a745' : bedrockStatus === 'fallback' ? '#ffc107' : '#6c757d', color: bedrockStatus === 'fallback' ? '#000' : '#fff' }}>
              {bedrockStatus === 'bedrock' ? 'AWS Bedrock Active' : bedrockStatus === 'fallback' ? 'Fallback Parser Active' : 'Waiting...'}
            </span>
          </div>
          <div className="chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', overflowY: 'auto', maxHeight: '300px' }}>
            {chatMessages.length === 0 && <div className="empty-state">Try: "What devices are connected?" or "Simulate a critical security alert."</div>}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ padding: '8px', borderRadius: '5px', background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(0,123,255,0.2)', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong> {msg.text}
              </div>
            ))}
            {isTyping && <div style={{opacity: 0.5}}>Processing...</div>}
          </div>
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type a command..." 
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#222', color: '#fff' }}
              disabled={!connected}
            />
            <button onClick={sendChatMessage} disabled={!connected || !chatInput.trim()}>Send</button>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.8em', opacity: 0.7 }}>
            Suggestions: "What notifications are waiting?", "Keep package updates silent until I ask", "Summarize my routine updates."
          </div>
        </div>
      </div>
`;

content = content.replace('</div>\n    </div>\n  );\n}', '</div>\n' + uiInjection + '    </div>\n  );\n}');

fs.writeFileSync('C:/Users/sheet/Documents/AIDetector/QuietCue/frontend/src/App.tsx', content);
console.log("App.tsx patched successfully!");
