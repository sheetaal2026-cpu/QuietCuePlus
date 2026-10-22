## Inspiration

Modern households feature dozens of connected smart devices: front entrance cameras, package delivery monitors, thermostats, family calendars, and environmental sensors. When people gather around a television screen to relax, stream live sports, share family entertainment, or engage in deep focus work, constant smart home popups shatter concentration and break screen immersion.

I wanted to solve this friction by creating an intelligent attention guardian that understands context. QuietCue+ embodies context intelligence that knows when to speak, when to whisper, and when to wait.

## What it does

QuietCue+ functions as an intelligent attention gateway for Fire TV and Alexa+, governing incoming smart home signals according to active lifestyle profiles. It organizes all home events into three clear policy tiers:

1. When to speak: Life safety and urgent perimeter alerts break through immediately with an audible two-tone alert chime and a high-contrast Fire TV heads-up display banner.

2. When to whisper: Low-urgency updates glide quietly into the subtitle channel during dialogue pauses, keeping screen content unobstructed.

3. When to wait: Routine notifications including hydration prompts, posture cues, family celebrations like Family Celebration days and birthdays, and climate summaries buffer quietly until scheduled session breaks.

QuietCue+ features multimodal interaction uniting Alexa+ conversational commands, an interactive Fire TV client simulation with directional pad remote navigation, three visual immersion themes, and a consolidated End-of-Session Summary Digest.

## Key Features & Capabilities

1. Active Modes and Streams:
   - Instant switching across Feature Night, Focus Mode, Sports Live, Family Time, and VR Immersion.
   - Automatically pairs 60fps video playback with tailored attention rules and dynamic screen backdrops.

2. Lifestyle Routines:
   - Automated attention presets configured for study hours, feature presentations, fitness sessions, and bedtime quiet.
   - Intelligently shifts notification thresholds to align with household activities throughout the day.

3. Connected Devices:
   - A live multi-device simulation engine testing hardware signals across Ring doorbells, delivery feeds, smart lights, and thermostats.
   - Allows instant synthetic event injection to evaluate system responsiveness in real time.

4. Attention Playbook:
   - Customizable delivery contracts governing which alerts interrupt immediately, which alerts glide into subtitles, and which alerts wait.
   - Empowers users to customize category policies with zero manual menu friction.

5. Subtitle-Slot Whisper Delivery:
   - Non-critical updates glide directly into the closed-caption subtitle channel during dialogue pauses.
   - Presents glanceable information where eyes naturally rest, eliminating visual intrusion over active media.

6. Session Summary:
   - A comprehensive digest gathering all held notifications in one place.
   - Delivers a consolidated review at the end of each session so users never miss a detail.

7. Sound Settings & Auditory Governance:
   - Custom audio governance featuring discrete critical two-tone chimes, gentle break chimes, and silent priority routing.
   - Synthesized directly in memory using the Web Audio API without relying on external audio assets.

8. Visual Color Modes & Multi-Language Controls:
   - Seamless switching across Slate Charcoal, Warm Dusk, and Clean Daylight themes for optimal visual comfort.
   - Real-time interface translation across six global languages: English, Spanish, French, German, Hindi, and Japanese.

9. Alexa Voice Calling & Auto Typing:
   - Interactive voice engagement that dynamically transcribes words character-by-character directly on screen.
   - Provides instant visual feedback as speech is recognized and translated into action.

10. Recent Activity & Telemetry Audit:
    - Real-time audit logs documenting every notification decision, rule evaluation, and routing timestamp.
    - Ensures complete transparency and accountability for how each smart home event is handled.

## How I engineered it

I architected QuietCue+ across a modern decoupled stack designed for television runtimes and intelligent smart assistants:

1. Television Display Client & Interactive Simulation: A responsive full-screen Fire TV application and interactive browser-based simulation engineered with React, TypeScript, Vite, and hardware-accelerated CSS targeting Fire OS and Vega OS web runtimes. It provides an authentic television display simulation for seamless testing and demonstration without requiring physical hardware.

2. Model Context Protocol Server: A self-hosted MCP server running on Node.js over Streamable HTTP, adhering strictly to the 2025-11-25 specification and exposing six deterministic tools for state inspection, alert simulation, and policy updates.

3. Cognitive Pipeline: Amazon Bedrock integrating Anthropic Claude 3.5 Sonnet to translate natural conversational speech into schema-validated JSON policy rules with zero-shot precision.

4. Audio Synthesis Engine: A zero-latency Web Audio API synthesizer producing distinct frequency-shift chimes directly in memory without relying on external audio files.

5. Telemetry Synchronization: A real-time Server-Sent Events stream ensuring sub-millisecond state parity between the companion dashboard and the Fire TV client simulation.

## Challenges I ran into

1. Streamable HTTP Connection Handshake: Implementing the new Model Context Protocol over Streamable HTTP for browser runtimes required configuring explicit CORS preflight headers and chunked stream flush handling to prevent stalled connections.

2. Remote Navigation Key Normalization: Different browser simulation containers and physical television devices emit varying key codes for directional arrows and selection buttons. I engineered an abstraction wrapper that maps legacy codes and modern key strings to a single action handler.

3. Balancing Emergency Safety with Total Immersion: Creating a deterministic priority state machine that guarantees urgent entrance alerts break through instantly while reliably buffering lower-priority lifestyle notifications for scheduled breaks.

## Accomplishments that I am proud of

1. Subtitle-Slot Whisper Channel: Pioneering closed-caption alert delivery that presents notifications without occluding visual media.

2. Amazon Bedrock Conversational Compiler: Enabling users to speak natural goals to Alexa+ that instantly translate into active television policy rules.

3. Universal Open Standard Architecture: Delivering an open-source Model Context Protocol server over Streamable HTTP that frees smart television displays from proprietary vendor lock-in.

4. Visual Theme System: Crafting three distinct immersion themes including Slate Charcoal, Warm Dusk, and Clean Daylight to provide comfortable readability across all lighting environments.

## What I learned

1. The Model Context Protocol provides unmatched modularity for connecting foundation models to smart displays without proprietary API glue.

2. Designing for television screens requires prioritizing glanceable typography, minimal cognitive load, and zero visual clutter.

3. Synthesizing audio cues in memory using the Web Audio API guarantees consistent volume and instant responsiveness on television web runtimes.

## What is next for QuietCue+

1. Publishing QuietCue+ to the Fire TV Appstore as a companion smart home manager.

2. Introducing Picture-in-Picture window support for live security camera video feeds during urgent alerts.

3. Adding household multi-profile support with personalized break intervals and custom lifestyle routines.

## Technologies & Tools Used

- Amazon Bedrock
- Anthropic Claude 3.5 Sonnet
- Model Context Protocol [MCP]
- Amazon Fire TV Web App Platform
- Alexa+
- Node.js
- React
- TypeScript
- Vite
- Server-Sent Events [SSE]
- Web Audio API

## Feedback for the Amazon Development Team

I thoroughly enjoyed engineering QuietCue+ across Amazon Bedrock, Alexa+, and Fire TV. Here is my structured feedback across the core developer tools:

### Tool 1: Amazon Bedrock Runtime SDK [@aws-sdk/client-bedrock-runtime]
- What Worked Well: Fast response latency and high-precision structured reasoning across Claude and Titan models when extracting multi-tier rule parameters from voice input.
- Developer Recommendation: Add native JSON schema enforcement directly into streaming runtime responses. This eliminates manual client-side regex or parsing fallbacks and reduces contract generation latency by another 100 to 200 milliseconds.

### Tool 2: Model Context Protocol [MCP] TypeScript SDK [@modelcontextprotocol/sdk]
- What Worked Well: Excellent protocol decoupling that enabled bidirectional event routing between Alexa+ voice agents, the Fire TV screen, and connected hardware sensors over Server-Sent Events.
- Developer Recommendation: Provide an official AWS-managed MCP skill adapter for the Alexa Smart Home Skills API. Having an out-of-the-box bridge between Alexa smart home device state and MCP tools would eliminate the need to write custom proxy server endpoints.

### Tool 3: Fire TV Web Application Framework & Media Controls
- What Worked Well: Clean hardware acceleration, seamless remote D-Pad key navigation, and reliable video stream playback.
- Developer Recommendation: Introduce an official system-level peripheral whisper channel in the Fire TV developer API. Allowing third-party apps to project subtle, non-intrusive notifications along the lower bezel without taking over video focus would make tactful home alert experiences standard across the Fire TV ecosystem.
