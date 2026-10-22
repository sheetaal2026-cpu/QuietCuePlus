# QuietCue+ Hackathon Submission Documentation

> **"Context intelligence that knows when to speak, when to whisper, and when to wait."**

## 1. Project Overview & Eligibility Compliance

### Fire TV Compliance
- Runtime Target: Fire OS and Vega OS web runtime environment.
- Implementation: Full-screen responsive television client developed with React, TypeScript, Vite, and hardware-accelerated CSS.
- Video Demonstration: Shows QuietCue+ functioning seamlessly on the Fire TV interactive client simulation with active video playback, real-time D-pad remote navigation, subtitle-slot whisper channels, and high-urgency heads-up alerts.

### Alexa+ Compliance
- Runtime Target: Self-hosted Model Context Protocol [MCP] server over Streamable HTTP implementing the 2025-11-25 specification, alongside a fully integrated simulated Alexa+ multimodal conversation agent.
- Agent Capabilities: Natural language intent parsing, smart home event simulation, dynamic policy compilation, and bidirectional synchronization across Fire TV and companion displays.

---

## 2. Product Feedback Questionnaire

### Developer Tools, APIs, and SDKs Used
1. Amazon Bedrock API [AWS SDK for JavaScript v3]:
   - Role: Natural language intent synthesis, rule extraction, and deterministic JSON contract generation.
   - Model: Anthropic Claude 3.5 Sonnet on Amazon Bedrock.
2. Model Context Protocol [MCP] TypeScript SDK:
   - Role: Self-hosted MCP server running on Node.js over Streamable HTTP, exposing television state inspection, policy updates, and event injection tools.
3. Amazon Fire TV Web App Platform & Interactive Client Simulation:
   - Role: Dedicated television client simulation delivering 60fps media streaming, backdrop blur filters, and d-pad remote control interaction.
4. Web Audio API:
   - Role: Custom audio synthesizer producing distinct frequency-shift chimes for critical alerts [two beeps] and routine session updates [single tone].
5. Server-Sent Events [SSE] & Streamable HTTP:
   - Role: Real-time, sub-millisecond telemetry synchronization across mobile, desktop, and Fire TV screens.

### What Worked Well
1. Tool 1: Amazon Bedrock Runtime SDK [@aws-sdk/client-bedrock-runtime]:
   - Fast response latency and high-precision structured reasoning across Claude and Titan models when extracting multi-tier rule parameters from voice input.
2. Tool 2: Model Context Protocol [MCP] TypeScript SDK [@modelcontextprotocol/sdk]:
   - Excellent protocol decoupling that enabled bidirectional event routing between Alexa+ voice agents, the Fire TV screen, and connected hardware sensors over Server-Sent Events.
3. Tool 3: Fire TV Web Application Framework & Media Controls:
   - Clean hardware acceleration, seamless remote D-Pad key navigation, and reliable video stream playback.

### What Needs Work & Developer Recommendations
1. Amazon Bedrock Runtime SDK:
   - Add native JSON schema enforcement directly into streaming runtime responses. This eliminates manual client-side regex or parsing fallbacks and reduces contract generation latency by another 100 to 200 milliseconds.
2. Model Context Protocol [MCP] TypeScript SDK:
   - Provide an official AWS-managed MCP skill adapter for the Alexa Smart Home Skills API. Having an out-of-the-box bridge between Alexa smart home device state and MCP tools would eliminate the need to write custom proxy server endpoints.
3. Fire TV Web Application Framework & Media Controls:
   - Introduce an official system-level peripheral whisper channel in the Fire TV developer API. Allowing third-party apps to project subtle, non-intrusive notifications along the lower bezel without taking over video focus would make tactful home alert experiences standard across the Fire TV ecosystem.

### Onboarding Experience
- Transitioning from zero to an operational prototype took less than thirty minutes.
- The modularity of React coupled with an Express backend allowed immediate testing of television UI components alongside the streaming audio synthesizer.

### Would I Create with These Devices and Services Again?
- Yes, unconditionally. Amazon Bedrock provides unmatched enterprise reliability and foundation model selection, while Fire TV delivers an expansive, high-impact visual canvas for intelligent home awareness.

---

## 3. Hackathon Track & Mini Challenge Selections

### Primary Track Selection
- Primary Track: Smart Home & Entertainment Experience - Fire TV and Alexa+ Intelligent Immersion.

### Mini Challenge 1: AWS Builder
- AWS Services Used:
  1. Amazon Bedrock:
     - Core cognitive engine powering the Alexa+ smart assistant.
     - Translates everyday conversational speech [for instance: "I need to focus on work, hold all package delivery alerts until my break, but let urgent doorbells through"] into actionable, schema-validated JSON policies.
     - Evaluates real-time event urgency against active lifestyle contracts.
  2. AWS SDK for JavaScript v3 [@aws-sdk/client-bedrock-runtime]:
     - Lightweight client integration communicating with Bedrock endpoints with automated credential retrieval and regional failover.

### Mini Challenge 2: Open Source
- Project Title: QuietCue+
- GitHub Profile URL: `https://github.com/sheetaal2026-cpu`
- GitHub Username: `sheetaal2026-cpu`
- Project Repository URL: `https://github.com/sheetaal2026-cpu/QuietCuePlus`
- Contribution URL: `https://github.com/sheetaal2026-cpu/QuietCuePlus/tree/main/backend/src/mcp`
- Description of Contribution:
  - What I Did: Engineered an open-source, production-ready Model Context Protocol [MCP] server over Streamable HTTP specifically designed for smart television displays and connected smart screens.
  - How It Works: Adheres strictly to the 2025-11-25 MCP specification. Implements six core typed tools: `quietcue_get_state`, `quietcue_simulate_event`, `quietcue_update_rule`, `quietcue_set_mode`, `quietcue_trigger_break`, and `quietcue_end_session`. Enables any MCP-compliant client to negotiate attention contracts, inject smart home telemetry, and synchronize on-screen state across devices over chunked HTTP streams.
  - Why It Matters: Eliminates vendor lock-in for connected smart home displays. Developers can orchestrate Fire TV and smart display notifications using any standard AI agent framework without proprietary interfaces. Includes complete TypeScript unit test coverage and automated verification scripts.

---

## 4. Feature Requests

### Feature Request 1: Native Fire TV Picture-in-Picture [PiP] API for Web Applications
- Description: Provide an official JavaScript API for Fire OS web apps to trigger hardware-accelerated picture-in-picture video decoders when displaying interactive notification overlays.
- Why It Matters: Enhances full-screen media continuity while displaying smart home cards.
- Priority: Critical.

### Feature Request 2: Alexa+ Ephemeral Audio Ducking API
- Description: Allow third-party Fire TV web apps to request temporary audio volume reduction on background media when Alexa+ speaks or when urgent chime cues play.
- Why It Matters: Ensures vocal and auditory alerts are crystal-clear without requiring apps to manually manipulate video audio gains.
- Priority: Important.

### Feature Request 3: Streamable HTTP Native Transport Inspector in AWS Console
- Description: Provide a dedicated real-time telemetry and debugging inspector in the AWS console for SSE and Streamable HTTP agent pipelines.
- Why It Matters: Accelerates troubleshooting of multi-device smart home agent interactions.
- Priority: Nice-to-have.

---

## 5. Friction Log Entries

### Friction Log Entry 1: Streamable HTTP MCP Server Connection Handshake
- Task Attempted: Connect a browser client directly to the self-hosted MCP server over Streamable HTTP using the standard client transport.
- Steps Taken: Initialized `SSEClientTransport` with the server URL and invoked `client.connect[]`.
- Expected Result: Immediate successful handshake and discovery of registered tools.
- Actual Result: Initial requests stalled due to missing CORS preflight headers and missing flush headers on the chunked HTTP stream.
- Severity: Moderate.
- Workaround Used: Configured explicit CORS headers and implemented a resilient auto-reconnect fallback mechanism in the client layer.
- Actionable Suggestion: Include a standard CORS and streaming headers template directly in the MCP TypeScript SDK documentation.

### Friction Log Entry 2: Remote D-pad Key Capture on Fire TV Simulator
- Task Attempted: Navigate the television menu using Fire TV remote arrow keys in simulator viewports.
- Steps Taken: Attached standard `keydown` event listeners for `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, and `Backspace`.
- Expected Result: Smooth, predictable selection highlights across all television cards.
- Actual Result: Some browsers emitted legacy key codes `[such as 'Select' or numeric code 13]` causing missed navigation clicks.
- Severity: Minor.
- Workaround Used: Engineered an abstraction wrapper mapping both modern `key` strings and legacy `keyCode` values to a unified action handler.
- Actionable Suggestion: Publish an official Fire TV web development key-mapping polyfill package for web developers.

### Friction Log Entry 3: EventSource SSE Connection Resiliency on Mode Transitions
- Task Attempted: Maintain real-time telemetry synchronization when switching between television active modes.
- Steps Taken: Dispatched mode update commands over REST and listened for backend SSE broadcasts.
- Expected Result: Uninterrupted message stream across mode changes.
- Actual Result: Rapid mode switching occasionally closed the connection before the next state sync broadcast completed.
- Severity: Minor.
- Workaround Used: Implemented an optimistic local state updater paired with an automatic exponential-backoff reconnect routine.
- Actionable Suggestion: Provide an integrated state snapshot handshake inside the server-sent events connection lifecycle.
