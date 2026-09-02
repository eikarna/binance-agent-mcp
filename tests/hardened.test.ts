import { describe, expect, it } from "bun:test";
import { IdempotencyEngine } from "../src/idempotency";
import { PolicyEngine } from "../src/policy";
import { PrecisionEngine } from "../src/precision";

describe("Hardened Institutional Engines", () => {
	it("PolicyEngine: enforces hard notional cap and symbol whitelist", () => {
		const policy = new PolicyEngine({
			maxNotionalUsd: 100,
			allowedSymbols: new Set(["BTCUSDT"]),
		});

		// Allowed trade
		const ok = policy.validateTrade({
			symbol: "BTCUSDT",
			side: "BUY",
			type: "LIMIT",
			quantity: 0.001,
			price: 60000,
			referencePrice: 60000,
		});
		expect(ok.allowed).toBe(true);
		expect(ok.notionalUsd).toBe(60);

		// Over notional cap ($120 > $100)
		const overCap = policy.validateTrade({
			symbol: "BTCUSDT",
			side: "BUY",
			type: "LIMIT",
			quantity: 0.002,
			price: 60000,
			referencePrice: 60000,
		});
		expect(overCap.allowed).toBe(false);
		expect(overCap.reason).toContain("NOTIONAL_CAP_EXCEEDED");

		// Forbidden symbol
		const badSymbol = policy.validateTrade({
			symbol: "DOGEUSDT",
			side: "BUY",
			type: "MARKET",
			quantity: 10,
			referencePrice: 0.1,
		});
		expect(badSymbol.allowed).toBe(false);
		expect(badSymbol.reason).toContain("FORBIDDEN_SYMBOL");
	});

	it("IdempotencyEngine: generates consistent hashes and prevents double fills", () => {
		const idempotency = new IdempotencyEngine();
		const intent = {
			symbol: "BTCUSDT",
			side: "BUY" as const,
			type: "LIMIT" as const,
			quantity: 0.001,
			price: 60000,
			intentNonce: "intent_12345",
		};

		const id1 = idempotency.generateClientOrderId(intent);
		const id2 = idempotency.generateClientOrderId(intent);
		expect(id1).toBe(id2);
		expect(id1.startsWith("mcp_")).toBe(true);

		// Lock intent
		const firstLock = idempotency.recordPending(id1);
		expect(firstLock).toBe(true);

		// Second lock attempt must be rejected
		const secondLock = idempotency.recordPending(id1);
		expect(secondLock).toBe(false);
	});

	it("PrecisionEngine: accurately steps and ticks without float drift", () => {
		const precision = new PrecisionEngine();

		// Step size 0.001 (BTC)
		const roundedQty = precision.roundToStep(0.1234567, 0.001);
		expect(roundedQty).toBe(0.123);

		// Tick size 0.01 (USDT)
		const roundedPrice = precision.roundToTick(64521.879, 0.01);
		expect(roundedPrice).toBe(64521.87);
	});
});
