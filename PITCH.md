# Binance Agent MCP - Hackathon Pitch Script

## 1. The Hook (0:00 - 0:15)
"Centralized exchanges are complex. AI agents need standardized, robust tooling to interact with them securely. Meet Binance Agent MCP — a Model Context Protocol server that turns any MCP-compatible AI into a fully autonomous trader."

## 2. The Problem (0:15 - 0:30)
"Right now, building a trading agent means writing custom REST and WebSocket layers, handling complex Ed25519 payload signatures, and dealing with rate limits. It's error-prone and insecure."

## 3. The Solution (0:30 - 1:00)
"Binance Agent MCP abstracts all of this into standard tools. With one click, your Claude, Cursor, or custom AI agent can:
- Query market data and depth in real-time.
- Detect triangular arbitrage opportunities automatically.
- Execute spot and futures trades using secure EIP-712 ECDSA signatures.
All over a standardized stdio interface."

## 4. The Demo (1:00 - 1:45)
*(Screen recording of Claude Desktop with Binance MCP attached)*
"Watch as we ask Claude to find an arbitrage opportunity. The agent calls `detectTriangularArbitrage`, identifies a discrepancy between BTC/USDT, ETH/BTC, and ETH/USDT, and immediately triggers `submitArbitrageRoute`. The MCP server handles the API authentication, payload signing, and execution on the Binance Testnet — autonomously, with zero human intervention."

## 5. The Architecture (1:45 - 2:15)
"Built on Bun for maximum performance, it uses `@noble/secp256k1` for fast, dependency-free cryptography. The architecture strictly enforces Testnet-first defaults for safety, and includes a built-in interactive dashboard to visualize the agent's actions."

## 6. The Close (2:15 - 2:30)
"Binance Agent MCP bridges the gap between Large Language Models and global liquidity. It's open-source, easily installable via a single `bunx` command, and ready for production. Thank you."
