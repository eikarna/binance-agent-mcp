# Audit & Rating Cursor Principal Architect (cu/gpt-5.6-sol-high & cu/claude-4.5-sonnet)

> **Evaluator:** Cursor Native Backend (`cu/*`)  
> **Target:** Binance MCP Server & Agent OS  
> **Rating:** **3 / 10** (*"Superficial Web3 facade on fragile REST plumbing"*)

---

## 1. Top Architectural Weaknesses (Kenapa Dicap AI Slop)

1. **EIP-712 Adalah False Security di CEX**:
   - EIP-712 bukan trust model Binance. Binance mengautentikasi order menggunakan API key HMAC-SHA256/Ed25519, timestamp drift, dan IP whitelist.
   - EIP-712 tidak memvalidasi apa pun di sisi Binance dan tidak mencegah pencurian API key. Ini cuma menambah overhead kriptografi tanpa fungsi nyata.
2. **REST Polling Triangular Arbitrage = Pasti Loss di Production**:
   - Sequential HTTP request menghasilkan snapshot harga yang inkonsisten (data stale).
   - Mengabaikan taker fees (0.1% x 3 legs), slippage, lot-size rounding step size (`LOT_SIZE`, `PRICE_FILTER`), dan execution risk di leg 2 & 3.
   - Polling synchronous rawan memicu IP ban (HTTP 418) karena limit request weight Binance (6000 req/min).
3. **Ketiadaan Deterministic Policy Engine & Idempotency**:
   - Tool execution langsung percaya pada output LLM tanpa guardrails batas notional value.
   - Tanpa `newClientOrderId` yang persisten/idempotent, MCP retry saat network timeout akan mengeksekusi multiple duplicate orders.

---

## 2. 4 Langkah Wajib untuk Hardening ke Level 9.5+/10

1. **Deterministic Pre-Trade Policy Engine**:
   - Enforce hard max notional value (misal max $50-$100 per execution).
   - Symbol whitelist & price collar (reject jika deviation > 0.5% dari best bid/ask).
   - Emergency kill-switch & daily drawdown limit.
2. **Durable Idempotency Engine (`newClientOrderId`)**:
   - Mapping deterministic UUID/hash pada setiap tool execution intent untuk menjamin 0 duplicate fills saat retry.
3. **Binance WebSocket Stream & Server Resilience**:
   - Implementasi WebSocket orderbook streaming (`wss://stream.binance.com`).
   - Auto sync timestamp drift (`GET /api/v3/time` offset + `recvWindow=5000`).
   - Rate limit weight tracking via header `X-MBX-USED-WEIGHT-1M`.
4. **Lot-Size / Step-Size Validation Engine**:
   - Parse `exchangeInfo` filters (`LOT_SIZE` minQty/stepSize, `PRICE_FILTER` tickSize, `MIN_NOTIONAL`).
   - Validasi precision desimal sebelum request dikirim ke Binance API.
