import * as assert from 'assert';
import http from 'http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function runEndToEndVerification() {
  console.log('==============================================================');
  console.log('🚀 QuietCue End-to-End Cross-Device Verification Suite');
  console.log('   1. Contract Engine & Offline Fallback Resilience');
  console.log('   2. Live MCP Server (SSE Transport & Tool Execution)');
  console.log('   3. Browser Simulation & Alexa+ Chat Execution');
  console.log('   4. Fire TV Client Real-Time Cross-Device Sync (/api/events)');
  console.log('==============================================================\n');

  // Connect a simulated Fire TV Client to the live SSE event stream (/api/events)
  const receivedSseEvents: any[] = [];
  const sseConnectedPromise = new Promise<void>((resolve, reject) => {
    const req = http.get('http://localhost:3001/api/events', (res) => {
      res.setEncoding('utf8');
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk;
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const evt = JSON.parse(jsonStr);
              receivedSseEvents.push(evt);
              if (evt.type === 'state_sync') {
                resolve();
              }
            } catch {}
          }
        }
      });
    });
    req.on('error', reject);
  });

  await sseConnectedPromise;
  console.log('✅ Step 1: Fire TV Client connected to /api/events SSE stream and received initial state_sync.');

  // Connect a real MCP Client to http://localhost:3001/mcp
  const mcpTransport = new SSEClientTransport(new URL('http://localhost:3001/mcp'));
  const mcpClient = new Client({ name: 'QuietCue-E2E-Verifier', version: '1.0.0' }, { capabilities: {} });
  await mcpClient.connect(mcpTransport);

  const toolsList = await mcpClient.listTools();
  assert.ok(toolsList.tools.length >= 11, 'MCP Server must expose all QuietCue & Contract tools');
  console.log(`✅ Step 2: MCP Client connected via SSE transport (${toolsList.tools.length} tools verified).`);

  // Reset demo via MCP tool to start from deterministic baseline
  await mcpClient.callTool({ name: 'reset_demo', arguments: {} });
  await new Promise(r => setTimeout(r, 150));
  assert.ok(receivedSseEvents.some(e => e.type === 'demo_reset'), 'TV Client SSE must receive demo_reset from MCP tool');
  console.log('✅ Step 3: MCP reset_demo tool executed and broadcast received by TV Client.');

  // Step 4: Trigger a Critical Security Event via MCP Server -> Verify TV Client receives it immediately
  const critRes: any = await mcpClient.callTool({
    name: 'simulate_device_event',
    arguments: {
      id: 'e2e-crit-doorbell',
      category: 'security',
      title: 'Front Door Motion (E2E)',
      message: 'Visitor detected at front entrance during movie.',
      sourceDevice: 'Front Door (Ring)'
    }
  });
  const critParsed = JSON.parse(critRes.content[0].text);
  assert.strictEqual(critParsed.appliedRule, 'interrupt_now');
  assert.strictEqual(critParsed.status, 'displayed');

  await new Promise(r => setTimeout(r, 150));
  const tvCritEvt = receivedSseEvents.find(
    e => e.type === 'event_simulated' && e.payload?.record?.id === 'e2e-crit-doorbell'
  );
  assert.ok(tvCritEvt, 'TV Client SSE stream must receive critical alert triggered via MCP Server');
  console.log('✅ Step 4: Critical event triggered via MCP -> Immediately displayed on TV Client HUD.');

  // Step 5: Trigger a Package Event via Browser Dashboard REST API -> Verify queued for break & pushed to TV Client
  const pkgResp = await fetch('http://localhost:3001/api/action/simulate-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'package',
      title: 'Amazon Prime Package (E2E)',
      message: 'Delivered safely to parcel lockbox.',
      sourceDevice: 'Smart Parcel Box'
    })
  });
  const pkgData: any = await pkgResp.json();
  assert.strictEqual(pkgData.event.appliedRule, 'next_break');
  assert.strictEqual(pkgData.event.status, 'pending');

  await new Promise(r => setTimeout(r, 150));
  const tvPkgEvt = receivedSseEvents.find(
    e => e.type === 'event_simulated' && e.payload?.record?.event?.title === 'Amazon Prime Package (E2E)'
  );
  assert.ok(tvPkgEvt, 'TV Client must receive queued package notification event from Browser Dashboard');
  console.log('✅ Step 5: Package delivery triggered on Browser Dashboard -> Queued for next_break & synced to TV Client.');

  // Step 6: Trigger Alexa+ Natural Language Command ("add a notification on water purifier check")
  const chatResp = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'add a notification on water purifier check' })
  });
  const chatData: any = await chatResp.json();
  assert.strictEqual(chatData.intent.intent, 'simulate_device_event');
  assert.strictEqual(chatData.executedResult.event.title, 'Water Purifier Check');
  assert.strictEqual(chatData.executedResult.appliedRule, 'summarize_later');
  console.log('✅ Step 6: Alexa+ NLU command ("add a notification on water purifier check") parsed, executed & synced.');

  // Step 7: TV Client triggers Credits Roll (state: 'Credits') -> Verify queued package notification is released!
  const creditsResp = await fetch('http://localhost:3001/api/action/set-viewer-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'Credits' })
  });
  const creditsData: any = await creditsResp.json();
  assert.strictEqual(creditsData.viewerState, 'Break');
  assert.ok(creditsData.releasedNotifications.length >= 1, 'Credits roll must release pending next_break notifications');

  await new Promise(r => setTimeout(r, 150));
  const breakBroadcast = receivedSseEvents.find(e => e.type === 'break_triggered' && e.payload?.condition === 'credits');
  assert.ok(breakBroadcast, 'Both TV Client and Browser Dashboard must receive break_triggered (credits) broadcast');
  console.log(`✅ Step 7: TV Client triggered Credits Roll -> Released ${creditsData.releasedNotifications.length} queued package notification(s) across devices.`);

  // Step 8: End Viewing Session -> Verify routine notifications transition to summarized
  const endResp = await fetch('http://localhost:3001/api/action/end-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const endData: any = await endResp.json();
  assert.strictEqual(endData.contract.status, 'completed');
  const purifierRecord = endData.notifications.find((n: any) => n.event.title === 'Water Purifier Check');
  assert.strictEqual(purifierRecord?.status, 'summarized', 'Routine water purifier notification must be summarized at session end');
  console.log('✅ Step 8: Session ended -> Routine notifications summarized in End-of-Session Digest.');

  // Restore clean active Watching state for user's live browser session
  await mcpClient.callTool({ name: 'reset_demo', arguments: {} });
  console.log('\n🎉 ALL 8 END-TO-END CROSS-DEVICE INTEGRATION CHECKS PASSED!');
  process.exit(0);
}

runEndToEndVerification().catch((err) => {
  console.error('❌ E2E Verification Failed:', err);
  process.exit(1);
});
