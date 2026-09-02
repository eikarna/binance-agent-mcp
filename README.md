# Binance Agent OS — Institutional MCP Server & Trading Engine

[![Bun Runtime](https://img.shields.io/badge/Bun-v1.3.14-black?logo=bun)](https://bun.sh)
[![MCP Protocol](https://img.shields.io/badge/MCP-v1.6.1-blue)](https://modelcontextprotocol.io/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.8.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-14%20Passed%20%7C%200%20Failed-brightgreen)](https://github.com/eikarna/binance-agent-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Official Submission for the Binance Agent OS Mini Hackathon ($60K USDC Prize Pool)**  
> Production-grade Model Context Protocol (MCP) server and autonomous trading framework engineered for zero-float precision, cryptographic intent verification (EIP-712), deterministic idempotency, and institutional pre-trade risk policy.

---

## 🏛️ The 4 Institutional Safeguard Pillars

Most AI trading agents fail in production due to floating point inaccuracies, duplicate order firing on network disconnects, timestamp desynchronization, and lack of pre-trade risk guardrails. This toolkit solves them natively:

```
                          ┌────────────────────────┐
                          │  Autonomous AI Agent   │
                          │ (Claude/Cursor/Hermes) │
                          └───────────┬────────────┘
                                      │ Trade Intent Request
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       HARDENED MCP INTERCEPTOR & AGENT OS       │
             ├─────────────────────────────────────────────────┤
             │ 1. Idempotency Engine   ──► SHA-256 Client ID   │
             │ 2. Precision Normalizer ──► LOT_SIZE / TICK_SIZE│
             │ 3. Policy Risk Engine   ──► Cap & Slippage Gate │
             │ 4. Resilience Manager   ──► Clock Sync & Backoff│
             └────────────────────────┬────────────────────────┘
                                      │ Cryptographic EIP-712 Proof
                                      ▼
                          ┌────────────────────────┐
                          │  Binance Spot/Futures  │
                          │     REST & WebSockets  │
                          └────────────────────────┘
```

1. **Pre-Trade Policy Engine & Circuit Breaker (`src/policy.ts`)**
   - Hard Notional USD caps per transaction and aggregate 24-hour drawdown limits.
   - Dynamic price slippage collar filters (auto-rejects orders exceeding configurable basis points vs reference price).
   - Strict symbol allowlisting to prevent hallucinated asset routing.

2. **Deterministic Idempotency Shield (`src/idempotency.ts`)**
   - Deterministic `clientOrderId` generation via SHA-256 hashing of trade intents.
   - Replay protection: Network retries and duplicate events return cached state instead of double-filling on the exchange.

3. **Exchange Resilience & Clock Drift Sentinel (`src/resilience.ts`)**
   - Proactive calibration with Binance Server Time (`/api/v3/time`) eliminating error `-1021 (Timestamp for this request was 1000ms ahead/behind)`.
   - Real-time `X-MBX-USED-WEIGHT-1M` header tracking with adaptive backoff to prevent IP rate-limit bans (HTTP 418 / 429).

4. **Zero-Drift Micro-Precision Normalizer (`src/precision.ts`)**
   - String-slicing and BigInt decimal math bypassing JavaScript IEEE-754 floating-point drift (`0.1 + 0.2 = 0.30000000000000004`).
   - Exact adherence to Binance exchange filters (`LOT_SIZE`, `PRICE_FILTER`, `MIN_NOTIONAL`).

5. **Cryptographic EIP-712 Intent Signing (`src/eip712.ts`)**
   - Typed data domain separation and ECDSA secp256k1 recovery ensuring only authorized agents or human multisig keyholders can broadcast orders.

---

## ⚡ Interactive Live Demo Runner

Run the interactive TUI demo runner to see the 4 pillars execute in real time:

```bash
bun run demo
```

### Live Terminal Snapshot
```
================================================================================
   BINANCE AGENT OS — INSTITUTIONAL RESILIENCE & MCP DEMO RUNNER                
   Target: Binance Agent OS Mini Hackathon ($60K USDC)                          
================================================================================

[INIT] Initializing Institutional Agent Engine & Calibrating Clock Offset...
✓ Binance Server Time Synced: Offset = 0 ms (Protected against error -1021)

┌── [SCENARIO 1: Micro-Precision & LOT_SIZE Normalization] ──────────────────┐
│ Raw JavaScript Floating Arithmetic: 0.30000000000000004 (Would trigger LOT_SIZE rejection)
│ Applying PrecisionEngine Normalizer: 0.3 (stepSize: 0.001)
│ Status: PASSED — Zero Float Drift
└────────────────────────────────────────────────────────────────────────────┘

┌── [SCENARIO 2: Pre-Trade Policy Engine & Hard Risk Guardrails] ────────────┐
│ Testing Trade: BUY 0.05 BTC @ $65,000 (Notional: $3,250.00 | Cap: $100.00)
│ Policy Intercept: BLOCKED -> NOTIONAL_CAP_EXCEEDED (Max $100.00 cap)
│ Testing Trade: BUY 0.001 BTC @ $66,000 (Ref: $65,000 | Diff: 153.8 bps > 50 bps max)
│ Policy Intercept: BLOCKED -> PRICE_COLLAR_BREACH (Exceeds 0.50% max slippage)
│ Testing Trade: BUY 0.001 BTC @ $65,010 (Notional: $65.01 | Safe Bounds)
│ Policy Intercept: APPROVED -> Notional: $65.01
└────────────────────────────────────────────────────────────────────────────┘

┌── [SCENARIO 3: Deterministic Idempotency & Duplicate Shield] ───────────────┐
│ Generated Deterministic Order ID: mcp_5da191fa5e5fd27470b6e9c25b10
│ Order 1 Dispatched -> Status: EXECUTED (FILLED)
│ Simulating Network Retry / Duplicate Event...
│ Duplicate Intercept: BLOCKED DUPLICATE ORDER (Safe Replay)
└────────────────────────────────────────────────────────────────────────────┘

┌── [SCENARIO 4: Rate-Limit Sentinel & Backoff Throttling] ───────────────────┐
│ Simulated Inbound Used Weight: 1050 / 1200 (87.5% - High Load Threshold)
│ Throttling Sentinel: Backing off for 5100ms to prevent IP ban (HTTP 418/429)
│ Status: PASSED — Proactive Exchange Safety Protected
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ MCP Tools & Capabilities

| Tool Name | Auth | Description |
|---|---|---|
| `binance_get_ticker` | Public | Real-time 24hr rolling window price, volume, and spread stats. |
| `binance_get_orderbook` | Public | Depth analysis with live bid/ask spread and imbalance ratio. |
| `binance_get_klines` | Public | Candlestick series for technical indicator processing (EMA/RSI/MACD). |
| `binance_detect_arbitrage` | Public | Autonomous multi-pair triangular arbitrage opportunity scanner. |
| `binance_create_order` | Signed | Safe SPOT order execution with policy validation & dry-run toggle. |
| `binance_cancel_order` | Signed | Order cancellation with deterministic ID matching. |
| `binance_get_account` | Signed | Account balances, asset allocation, and free margin inspection. |

---

## 🚀 Quickstart

### 1. Prerequisites
- [Bun runtime](https://bun.sh) (`bun >= 1.1.0`)

### 2. Installation
```bash
git clone https://github.com/eikarna/binance-agent-mcp.git
cd binance-agent-mcp
bun install
```

### 3. Environment Setup (.env)
```env
BINANCE_API_KEY="your_api_key_here"
BINANCE_API_SECRET="your_api_secret_here"
BINANCE_USE_TESTNET="true" # Set to false for live production API
BINANCE_DRY_RUN="true"     # Simulation mode for testing
```

### 4. Connect to Cursor / Claude Desktop / Hermes Agent

Add the server to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "binance-agent-os": {
      "command": "bun",
      "args": ["run", "C:/path/to/binance-agent-mcp/src/index.ts"],
      "env": {
        "BINANCE_API_KEY": "your_api_key",
        "BINANCE_API_SECRET": "your_api_secret",
        "BINANCE_DRY_RUN": "true"
      }
    }
  }
}
```

---

## 🧪 Testing & Verification

```bash
# Run unit & security test suite
bun test

# Strict TypeScript type checking
bun run typecheck

# Run interactive TUI demo
bun run demo
```

---

## 🏛️ Full MCP Specification Compliance
Unlike tool-only wrappers, this server implements all 3 core primitives of the Model Context Protocol:
1. **Tools**: Hardened execution functions guarded by pre-trade risk policies and float-drift protection.
2. **Resources (`binance://market/{symbol}`, `binance://risk/parameters`)**: Dynamic contextual feeds exposing real-time order books, spreads, and pre-trade risk thresholds directly into the LLM context.
3. **Prompts (`analyze_orderbook_imbalance`, `execute_guarded_trade`)**: Standardized system workflows guiding autonomous agents to inspect order book depth and evaluate risk boundaries before submitting orders.

---

## 📜 License
MIT © Nix Seymour
