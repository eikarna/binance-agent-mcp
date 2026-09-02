# Video Demo Script & Storyboard (2-3 Minutes)
**Target**: Binance Agent OS Mini Hackathon ($60K USDC)  
**Project**: Binance Agent OS — Institutional MCP Server & Trading Engine  
**Author**: Nix Seymour

---

## 🎬 Video Production Overview
- **Duration**: ~2:30 minutes
- **Tone**: Professional, crisp, high-signal, developer-grade.
- **Visuals**: Cursor IDE / Terminal split-screen + Architecture diagram + `bun run demo` live execution.

---

### [Scene 1: The Problem with AI Crypto Agents (0:00 - 0:30)]
**Visual**:
- Slide / Title screen showing architecture diagram: *The 4 Fatal Flaws of AI Agents on Binance*.
- Highlight: Float drift (`0.30000000000000004`), Network Retry duplicate fills, Timestamp drift (-1021), and lack of Pre-Trade Circuit Breakers.

**Voiceover / Audio**:
> "Autonomous AI agents are revolutionizing trading, but deploying LLMs directly to crypto exchanges like Binance introduces fatal failure modes: JavaScript float drift causing LOT_SIZE rejections, duplicate order fills during network blips, clock desynchronization throwing error minus 1021, and hallucinated orders bypassing risk controls.
> Today, we introduce **Binance Agent OS** — the institutional-grade Model Context Protocol server built for zero-drift execution, deterministic idempotency, and cryptographic intent verification."

---

### [Scene 2: Architecture & The 4 Safeguard Pillars (0:30 - 1:10)]
**Visual**:
- Terminal / Code editor showing `src/hardened-agent.ts` and the modular engines:
  1. `src/precision.ts` (Decimal string-slicing)
  2. `src/policy.ts` (Risk engine & dynamic slippage collars)
  3. `src/idempotency.ts` (SHA-256 clientOrderId hashing & deduplication)
  4. `src/resilience.ts` (Server time calibration & header weight sentinel)
  5. `src/eip712.ts` (Cryptographic ECDSA verification)

**Voiceover / Audio**:
> "Binance Agent OS sits between the LLM and Binance REST/WebSocket endpoints as a hardened interceptor. 
> It enforces four non-negotiable institutional pillars:
> First, our Precision Normalizer eliminates floating-point arithmetic errors via string-slicing math.
> Second, our Pre-Trade Policy Engine validates notional caps and slippage collars before any order leaves the environment.
> Third, deterministic idempotency guarantees that duplicate LLM intents or retries never result in double-filling.
> And fourth, our Resilience Manager calibrates exchange time drift and tracks rate-limit headers to proactively prevent IP bans."

---

### [Scene 3: Live Execution Demo (1:10 - 2:00)]
**Visual**:
- Terminal running `bun run demo`.
- Showcase each scenario lighting up in real time:
  - Scenario 1: `0.1 + 0.2` normalized cleanly to `0.3` without float drift.
  - Scenario 2: High-notional danger order blocked; slippage breach blocked; safe order approved.
  - Scenario 3: Order 1 executed; network retry immediately caught by idempotency cache.
  - Scenario 4: Simulated 1050/1200 weight triggers adaptive backoff delay.

**Voiceover / Audio**:
> "Let's watch the engine execute live via our interactive demo runner.
> In Scenario 1, raw floating arithmetic that would fail Binance exchange filters is instantly normalized to exact tick sizes.
> In Scenario 2, when an agent attempts a 3,200 dollar trade exceeding our 100 dollar safety cap, or attempts an order with 150 basis points of slippage, the Policy Engine immediately blocks execution.
> In Scenario 3, when a duplicate intent is received from a retried LLM prompt, the Idempotency Shield intercepts it and safely replays the cached state.
> In Scenario 4, as request weight approaches exchange limits, our rate-limit sentinel proactively throttles requests, keeping the agent online."

---

### [Scene 4: MCP Integration & Hackathon Closing (2:00 - 2:30)]
**Visual**:
- Show `bun test` passing 14/14 tests in 114ms.
- Show Cursor IDE / Claude Desktop integration snippet (`claude_desktop_config.json`).
- GitHub repository link (`eikarna/binance-agent-mcp`).

**Voiceover / Audio**:
> "With full Model Context Protocol compatibility, Binance Agent OS connects directly to Claude, Cursor, and Hermes Agent with a single JSON configuration.
> Fully tested, open-source under MIT, and verified with zero external dependencies.
> Built for the Binance Agent OS Hackathon by Nix Seymour. Thank you."
