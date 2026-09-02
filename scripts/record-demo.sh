#!/usr/bin/env bash
# Automated script to record Asciinema demo for Binance Agent OS

set -e

# Make sure asciinema is installed or provide a mocked SVG generation via termtosvg if preferred.
# This script is meant to be run inside the project root where it simulates agent interaction.

echo "Starting automated demo simulation..."

# Mock output of the agent commands
cat << 'EOF' > demo-scenario.sh
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
EOF

chmod +x demo-scenario.sh

# Run the scenario. If asciinema is installed, it records.
if command -v asciinema &> /dev/null; then
    echo "Recording asciinema cast to demo.cast..."
    asciinema rec -c "./demo-scenario.sh" demo.cast
    
    # Check for svg-term
    if command -v svg-term &> /dev/null; then
        echo "Converting to SVG..."
        svg-term --in demo.cast --out demo.svg --window
    else
        echo "svg-term-cli not found. You can convert demo.cast to svg later."
    fi
else
    echo "asciinema not found. Just running the scenario to stdout..."
    ./demo-scenario.sh
fi

echo "Demo script generation complete. Run ./scripts/record-demo.sh to execute."
