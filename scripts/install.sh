#!/usr/bin/env bash
set -e

echo "=================================================="
echo " Binance Agent MCP - Auto-Installer "
echo "=================================================="

# Check for bun
if ! command -v bun &> /dev/null; then
    echo "Error: bun is required but not installed."
    echo "Install with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "1. Installing dependencies..."
bun install

echo "2. Building project..."
bun run build

echo "3. Linking globally as bunx executable..."
bun link

echo "4. Setting up config..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file. Please edit it to add your Binance API keys."
fi

echo "=================================================="
echo " Installation Complete!"
echo " "
echo " Standalone execution:"
echo "   bunx binance-agent-mcp"
echo " "
echo " For Claude Desktop or Cursor:"
echo "   Copy the configurations from the presets/ folder"
echo "   into your MCP client's configuration file."
echo "=================================================="
