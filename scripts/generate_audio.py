import asyncio
import os
import subprocess

SCENES = [
    {
        "id": "scene1",
        "text": "Autonomous AI agents are revolutionizing trading, but deploying LLMs directly to crypto exchanges introduces fatal failure modes: JavaScript float drift causing lot size rejections, duplicate order fills during network blips, clock desynchronization throwing error minus 1021, and hallucinated orders bypassing risk controls. Today, we introduce Binance Agent OS — the institutional-grade Model Context Protocol server built for zero-drift execution, deterministic idempotency, and cryptographic intent verification."
    },
    {
        "id": "scene2",
        "text": "Binance Agent OS sits between the LLM and Binance REST and WebSocket endpoints as a hardened interceptor. It enforces four non-negotiable institutional pillars: First, our Precision Normalizer eliminates floating-point arithmetic errors via string-slicing math. Second, our Pre-Trade Policy Engine validates notional caps and slippage collars before any order leaves the environment. Third, deterministic idempotency guarantees that duplicate LLM intents or retries never result in double-filling. And fourth, our Resilience Manager calibrates exchange time drift and tracks rate-limit headers to proactively prevent IP bans."
    },
    {
        "id": "scene3",
        "text": "Let's watch the engine execute live via our interactive demo runner. In Scenario 1, raw floating arithmetic that would fail Binance exchange filters is instantly normalized to exact tick sizes. In Scenario 2, when an agent attempts a 3,200 dollar trade exceeding our 100 dollar safety cap, or attempts an order with 150 basis points of slippage, the Policy Engine immediately blocks execution. In Scenario 3, when a duplicate intent is received from a retried LLM prompt, the Idempotency Shield intercepts it and safely replays the cached state. In Scenario 4, as request weight approaches exchange limits, our rate-limit sentinel proactively throttles requests, keeping the agent online."
    },
    {
        "id": "scene4",
        "text": "With full Model Context Protocol compatibility, Binance Agent OS connects directly to Claude, Cursor, and Hermes Agent with a single JSON configuration. Fully tested, open-source under MIT, and verified with zero external dependencies. Built for the Binance Agent OS Hackathon by Nix Seymour. Thank you."
    }
]

async def generate_voiceovers():
    os.makedirs("C:/Users/Administrator/Documents/binance-agent-mcp/assets/audio", exist_ok=True)
    for s in SCENES:
        out_path = f"C:/Users/Administrator/Documents/binance-agent-mcp/assets/audio/{s['id']}.mp3"
        print(f"Generating voiceover for {s['id']}...")
        cmd = f'uv run edge-tts --voice en-US-ChristopherNeural --text "{s["text"]}" --write-media "{out_path}"'
        proc = await asyncio.create_subprocess_shell(cmd)
        await proc.communicate()
        print(f"Saved: {out_path}")

if __name__ == "__main__":
    asyncio.run(generate_voiceovers())
