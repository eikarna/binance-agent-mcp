# Binance Agent OS

**Tagline:** Autonomous on-chain arbitrage and high-frequency trading MCP server.

## Overview
Binance Agent OS bridges the gap between large language models and high-frequency crypto trading. By implementing the Model Context Protocol (MCP), it exposes deep, type-safe integration with Binance Spot and Futures markets, complete with EIP-712 compliant settlement mechanisms and real-time arbitrage detection.

## Problem
AI agents lack secure, standardized, and deterministic ways to interact with complex financial APIs like Binance. Traditional wrappers are fragile and lack the structured context required by LLMs to make sound economic decisions or execute multi-leg arbitrage trades safely.

## Solution
We built an MCP server from the ground up tailored for trading:
- **EIP-712 Signature Recovery:** Secure intent settlement using `@noble/hashes` and `@noble/secp256k1`.
- **Arbitrage Detector:** Built-in multi-agent workflows for detecting triangular arbitrage opportunities.
- **Agent Distribution:** One-click presets for Cursor and Claude Desktop, transforming any IDE into an autonomous trading desk.

## How it was built
- **Core:** Bun and TypeScript for maximum performance and strict typing.
- **Protocol:** Official `@modelcontextprotocol/sdk`.
- **Crypto:** Zero-dependency elliptic curve and hash functions via Noble.
- **Testing:** Deterministic API mocks and robust CI/CD pipelines.

## Next Steps
- Implement cross-exchange arbitrage.
- Expand agent capabilities to decentralized perpetuals (e.g., dYdX, Hyperliquid).
- Roll out a dedicated UI for the Agent OS monitoring.
