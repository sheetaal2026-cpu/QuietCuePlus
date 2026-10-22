# QuietCue+ : Developer Friction Log

> **"Context intelligence that knows when to speak, when to whisper, and when to wait."**

---

### Friction Log Entry 1: Streamable HTTP MCP Server Connection Handshake
- Specific Task Attempted: Connect a browser-based client directly to a self-hosted Model Context Protocol [MCP] server over Streamable HTTP using the official TypeScript SDK.
- Steps Taken: Initialized `SSEClientTransport` with the server endpoint URL `http://localhost:3001/mcp` and invoked `client.connect[]`.
- Expected Result: Immediate successful connection handshake and reflection of registered MCP tools.
- Actual Result: Initial HTTP connection requests stalled and failed to complete because the chunked streaming response lacked immediate HTTP flush headers and explicit CORS preflight options.
- Severity Rating: Moderate
- Workaround Used: Configured explicit CORS headers on the Express server endpoint, implemented manual chunk flush triggers, and added a resilient auto-reconnect fallback mechanism in the frontend client transport.
- Actionable Suggestion: Include a ready-to-use CORS and streaming headers middleware template directly in the official `@modelcontextprotocol/sdk` documentation for Streamable HTTP server setups.

---

### Friction Log Entry 2: Remote D-Pad Key Event Normalization on Television Web Runtimes
- Specific Task Attempted: Navigate on-screen cards and menus using Fire TV remote arrow keys and directional pad controls inside web client containers.
- Steps Taken: Attached standard browser `keydown` event listeners for `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, and `Backspace`.
- Expected Result: Smooth, uniform focus transitions and selection highlights across all television interactive elements.
- Actual Result: Different browser rendering engines emitted legacy key codes [such as `Select` instead of `Enter`, or legacy numeric keycodes] which caused missed navigation inputs.
- Severity Rating: Minor
- Workaround Used: Engineered a centralized input normalization utility that maps both modern W3C `key` strings and legacy `keyCode` numbers to a single unified navigation action handler.
- Actionable Suggestion: Publish an official Amazon Fire TV web key-mapping polyfill package on npm to eliminate boilerplate remote input mapping for television web developers.

---

### Friction Log Entry 3: EventSource SSE Connection Resilience During Rapid Mode Transitions
- Specific Task Attempted: Maintain uninterrupted real-time telemetry synchronization when switching between television active modes [such as Feature Night to Sports Live].
- Steps Taken: Dispatched mode transition commands over REST and listened for backend SSE state broadcasts.
- Expected Result: Uninterrupted telemetry stream across rapid mode changes.
- Actual Result: Switching modes in rapid succession occasionally caused the active SSE stream to disconnect momentarily before the full state broadcast completed.
- Severity Rating: Minor
- Workaround Used: Implemented an optimistic local state updater in the React state machine paired with an automatic exponential-backoff reconnect routine.
- Actionable Suggestion: Provide a standardized state snapshot handshake within the Server-Sent Events connection lifecycle to guarantee that clients reconnecting after a drop receive the complete current state immediately.
