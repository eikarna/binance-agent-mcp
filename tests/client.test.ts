import { describe, expect, it } from "bun:test";
import { BinanceClient } from "../src/client.ts";
import { loadConfig } from "../src/config.ts";

describe("Binance REST Client & Analytics Suite", () => {
	const config = loadConfig();
	const client = new BinanceClient(config);

	it("should fetch 24hr ticker for BTCUSDT", async () => {
		const ticker = await client.getTicker("BTCUSDT");
		expect(ticker).toBeDefined();
		expect(ticker.symbol).toBe("BTCUSDT");
		expect(parseFloat(ticker.lastPrice)).toBeGreaterThan(0);
		expect(parseFloat(ticker.volume)).toBeGreaterThan(0);
	});

	it("should fetch orderbook and calculate spread & imbalance", async () => {
		const orderbook = await client.getOrderBook("BTCUSDT", 20);
		expect(orderbook).toBeDefined();
		expect(orderbook.bids.length).toBeGreaterThan(0);
		expect(orderbook.asks.length).toBeGreaterThan(0);
		expect(typeof orderbook.spread).toBe("number");
		expect(typeof orderbook.imbalance).toBe("number");
		expect(orderbook.imbalance).toBeGreaterThanOrEqual(-1);
		expect(orderbook.imbalance).toBeLessThanOrEqual(1);
	});

	it("should fetch candlestick klines for technical indicators", async () => {
		const klines = await client.getKlines("BTCUSDT", "1h", 10);
		expect(klines.length).toBe(10);
		expect(parseFloat(klines[0]?.open)).toBeGreaterThan(0);
		expect(parseFloat(klines[0]?.close)).toBeGreaterThan(0);
	});

	it("should simulate spot order in dry-run mode safely", async () => {
		const order = await client.createOrder({
			symbol: "BTCUSDT",
			side: "BUY",
			type: "LIMIT",
			quantity: 0.001,
			price: 50000,
		});

		expect(order.dryRun).toBe(true);
		expect(order.symbol).toBe("BTCUSDT");
		expect(order.status).toBe("FILLED");
		expect(order.side).toBe("BUY");
	});

	it("should reject order if notional value violates risk limit", async () => {
		expect(async () => {
			await client.createOrder({
				symbol: "BTCUSDT",
				side: "BUY",
				type: "LIMIT",
				quantity: 100, // Exceeds max notional
				price: 90000,
			});
		}).toThrow(/Risk Guardrail Violation/);
	});
});
