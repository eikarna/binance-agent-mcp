# Audit & Rating Claude Fable 5 — Binance MCP Server & Agent OS

> **Evaluator:** Claude Fable 5 (via 9Router)  
> **Target:** Binance MCP Server & Agent OS Hackathon Entry  
> **Score:** **4 / 10** (*"A competent weekend build wearing a production costume"*)

---

## 1. Kenapa Dicap AI Slop & Superficial

1. **EIP-712 Signing di CEX adalah "Cryptographic Theater" & Category Error**
   - Binance itu CEX dengan auth HMAC-SHA256 / Ed25519 API Key.
   - EIP-712 adalah standard Ethereum on-chain wallet. Menaruh EIP-712 di CEX tanpa verifier smart contract adalah buzzword laundering khas AI boilerplate saat diminta "tambahkan fitur keamanan Web3". Engineer Binance langsung tahu ini fake security.
2. **Triangular Arbitrage Cuma Top-of-Book Calculator**
   - Tidak memperhitungkan taker fee per leg (0.1% x 3 = 0.3% hurdle rate), slippage, depth walking, dan latency risk sequential 3-leg fill. Di market live Binance, retail arb REST polling mustahil profit.
3. **Puffery "Zero external HTTP framework" di Bun**
   - Bun natively punya `fetch` dan `Bun.serve`. Mengklaim zero-dep padahal bawaan runtime adalah resume-padding ala AI.
4. **Tool Standard Tutorial MCP**
   - List tool (`get_spot_price`, `get_order_book`, `execute_order`) persis boilerplate tutorial MCP basic, belum ada enterprise safety layer.

---

## 2. Fatal Flaws yang Bikin Engineer Binance Menolak

1. **Unvalidated Execution Path (Prompt Injection = Fund Drain)**
   - Tool `execute_order` langsung nembak endpoint tanpa deterministic policy engine. Context poisoning di LLM bisa langsung kuras wallet.
   - Tidak ada **`newClientOrderId` (Idempotency Key)**: Retry MCP saat network timeout akan menghasilkan duplicate order fills.
2. **REST Polling Loop & Rate Limit Vulnerability**
   - Polling synchronous tanpa WebSocket (`wss://stream.binance.com`).
   - Tidak membaca header `X-MBX-USED-WEIGHT-1M`, tidak ada exponential backoff saat 429, dan rawan terkena IP ban (`HTTP 418`).
   - Tidak ada sinkronisasi server time (`-1021 Timestamp Drift / recvWindow`).
3. **Kredensial API Key Berbahaya**
   - Kredensial rawan masuk ke context window LLM.
   - Tidak ada enforce permission restriction (wajib read/trade only, reject withdrawal permission).

---

## 3. Yang Dinilai Bagus & Valid

- **MCP Stdio Server Protocol Implementation**: Framing JSON-RPC, schema spec, dan stdio lifecycle valid.
- **Claude Desktop & Cursor IDE Presets**: Sangat judge-friendly karena juri bisa langsung plug-and-play tanpa setup manual.
- **ANSI Terminal Depth Visualization**: Menunjukkan pemahaman struktur data orderbook secara native tanpa bloat UI framework.
- **Submission Hygiene**: Dokumentasi lengkap, skrip terstruktur, dan format siap submit.

---

## 4. 4 Concrete Hardening Action Items (Target 9.5+/10)

1. **Ganti EIP-712 Fake Security dengan "Deterministic Local Policy Engine"**:
   - Hard Notional Max Limit per order ($100 max default).
   - Symbol Whitelist (hanya pair terdaftar).
   - Strict Slippage Guard & Price Collar (reject jika market bergerak >0.5% dari requested price).
   - Human-in-the-loop confirmation untuk order di atas threshold.
2. **Implementasi Idempotency (`newClientOrderId`) & Nonce Management**:
   - Generate deterministic UUID / hash pada setiap tool intent untuk mencegah double execution saat network glitch.
3. **Binance Engine Resilience**:
   - Auto time-sync `recvWindow=5000` via `GET /api/v3/time` drift offset.
   - `X-MBX-USED-WEIGHT-1M` tracking & auto-throttle sebelum limit 6000 tercapai.
4. **Real Depth-Walking Arbitrage & Fee Modeling**:
   - Hitung real fee hurdle (0.075% BNB discount atau 0.1% standard taker).
   - Orderbook depth consumption simulator (bukan top-of-book saja).
