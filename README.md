# Binance Agent MCP Server & Agent OS Trading Toolkit

Production-ready Model Context Protocol (MCP) server designed for the **Binance Agent OS Mini Hackathon** ($60K USDC Prize Pool).

Enables AI Agents (Claude, Cursor, Hermes, ChatGPT) to autonomously analyze orderbooks, compute risk metrics, stream real-time price action, and execute spot/futures trades with strict guardrails.

---

## 🛠️ Architecture & Features

### 1. Market Data & Intelligence (Public / Zero Auth)
- `binance_get_ticker`: Real-time 24hr rolling window price change statistics.
- `binance_get_orderbook`: Depth analysis (bids/asks aggregation, spread & imbalance calculation).
- `binance_get_klines`: Candlestick data for technical indicator calculation (EMA, RSI, MACD).

### 2. Execution & Order Management (Signed HMAC-SHA256)
- `binance_create_order`: Spot LIMIT / MARKET order with dry-run simulation mode.
- `binance_cancel_order`: Order cancellation & open orders cleanup.
- `binance_get_account`: Balance, asset allocation, and free collateral inspection.

### 3. Institutional Risk Guardrails
- **Dry-run Mode**: Safe execution simulation for validation before submitting live orders.
- **Max Slippage Protection**: Rejection of market orders if estimated price impact > configurable threshold.
- **Max Notional Filter**: Hard cap on order size per transaction.

---

## 🚀 Quickstart

### Prerequisites
- [Bun runtime](https://bun.sh) (`bun >= 1.1.0`)

### Installation & Run

```bash
# Install dependencies
bun install

# Run MCP server in stdio mode
bun run src/index.ts
```

### Environment Configuration (.env)

```env
BINANCE_API_KEY="your_binance_api_key"
BINANCE_API_SECRET="your_binance_api_secret"
BINANCE_USE_TESTNET="true" # Set to false for live production API
BINANCE_DRY_RUN="true"     # Hard safety mode for backtesting/demos
```

---

## 🧪 Testing & Validation

```bash
# Run unit & integration test suite
bun test

# Type checking
bun run typecheck
```

## 📜 License
MIT © Nix Seymour
