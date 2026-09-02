#!/usr/bin/env bash
clear
echo "$ hermes run binance-agent-mcp"
sleep 1
echo "🚀 Binance Agent OS MCP Server initialized."
echo "Waiting for client connection..."
sleep 2
echo "✅ Client connected (Claude-Desktop/1.0.0)"
sleep 1
echo ""
echo "$ mcp call detectTriangular --args '{\"symbols\": [\"BTCUSDT\", \"ETHUSDT\", \"ETHBTC\"]}'"
sleep 2
echo "🔎 Scanning triangular routes..."
sleep 1
echo "✨ Opportunity found: ETHUSDT -> ETHBTC -> BTCUSDT"
echo "   Expected Profit: 0.24%"
echo "   Route Viable: true"
sleep 2
echo ""
echo "$ mcp call settlePayload --args '{\"intent\": \"EXECUTE_ROUTE_01\", \"signature\": \"0x5c8e...\"}'"
sleep 1
echo "🔒 Verifying EIP-712 signature..."
sleep 1
echo "✅ Signature verified. Recovered signer: 0xAgent123..."
sleep 1
echo "⚡ Executing multi-leg settlement..."
sleep 2
echo "🎉 Arbitrage settlement complete."
echo "   TxId: 0x98df8924b...48"
sleep 2
echo "$ exit"
