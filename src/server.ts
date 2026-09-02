import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createHmac } from "crypto";
import { z } from "zod";
import type { AgentSettlementPayload } from "./arbitrage.ts";
import { BinanceClient } from "./client.ts";
import { loadConfig } from "./config.ts";

import { ArbitrageDetector } from "./detector.ts";
export function createMcpServer(): Server {
	const config = loadConfig();
	const client = new BinanceClient(config);
	const detector = new ArbitrageDetector(client);

	const server = new Server(
		{
			name: "binance-agent-mcp",
			version: "1.0.0",
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// List available tools
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [
				{
					name: "binance_get_ticker",
					description:
						"Get 24-hour rolling window price change statistics and volume for a symbol (e.g. BTCUSDT, ETHUSDT).",
					inputSchema: {
						type: "object",
						properties: {
							symbol: {
								type: "string",
								description:
									"Trading pair symbol, e.g. BTCUSDT, ETHUSDT, SOLUSDT",
							},
						},
						required: ["symbol"],
					},
				},
				{
					name: "binance_get_orderbook",
					description:
						"Get real-time order book depth with calculated spread, liquidity depth, and orderbook imbalance ratio.",
					inputSchema: {
						type: "object",
						properties: {
							symbol: {
								type: "string",
								description: "Trading pair symbol, e.g. BTCUSDT",
							},
							limit: {
								type: "number",
								description: "Depth limit (default: 20, max: 100)",
							},
						},
						required: ["symbol"],
					},
				},
				{
					name: "binance_get_klines",
					description:
						"Get candlestick/kline data for technical analysis indicators (RSI, EMA, Volume profiling).",
					inputSchema: {
						type: "object",
						properties: {
							symbol: {
								type: "string",
								description: "Trading pair symbol, e.g. BTCUSDT",
							},
							interval: {
								type: "string",
								description:
									"Kline interval: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 1d, 1w (default: 1h)",
							},
							limit: {
								type: "number",
								description:
									"Number of candlesticks to fetch (default: 50, max: 500)",
							},
						},
						required: ["symbol"],
					},
				},
				{
					name: "binance_get_account",
					description:
						"Inspect account balances, spot asset allocations, and available trading permissions (Requires API Key).",
					inputSchema: {
						type: "object",
						properties: {},
					},
				},
				{
					name: "binance_create_order",
					description:
						"Execute a SPOT BUY or SELL order with institutional risk limits & dry-run simulation guardrails.",
					inputSchema: {
						type: "object",
						properties: {
							symbol: {
								type: "string",
								description: "Trading pair symbol, e.g. BTCUSDT",
							},
							side: {
								type: "string",
								enum: ["BUY", "SELL"],
								description: "Order side: BUY or SELL",
							},
							type: {
								type: "string",
								enum: ["LIMIT", "MARKET"],
								description: "Order type: LIMIT or MARKET",
							},
							quantity: {
								type: "number",
								description: "Base asset quantity to trade (e.g. 0.001 BTC)",
							},
							price: {
								type: "number",
								description: "Limit price (required if type is LIMIT)",
							},
							timeInForce: {
								type: "string",
								enum: ["GTC", "IOC", "FOK"],
								description: "Time in force for limit orders (default: GTC)",
							},
						},
						required: ["symbol", "side", "type", "quantity"],
					},
				},
				{
					name: "binance_cancel_order",
					description: "Cancel an active open order on Binance.",
					inputSchema: {
						type: "object",
						properties: {
							symbol: {
								type: "string",
								description: "Trading pair symbol, e.g. BTCUSDT",
							},
							orderId: {
								type: "number",
								description: "Order ID returned during order creation",
							},
						},
						required: ["symbol", "orderId"],
					},
				},
				{
					name: "arbitrage_detect_triangular",
					description:
						"Detect autonomous triangular arbitrage opportunities across 3 assets.",
					inputSchema: {
						type: "object",
						properties: {
							base: { type: "string" },
							quote1: { type: "string" },
							quote2: { type: "string" },
							amount: { type: "number" },
						},
						required: ["base", "quote1", "quote2", "amount"],
					},
				},
				{
					name: "arbitrage_settle_agent_payload",
					description:
						"Generate cryptographically signed agent-to-agent settlement payload.",
					inputSchema: {
						type: "object",
						properties: {
							agentId: { type: "string" },
							opportunityId: { type: "string" },
							executionRoute: { type: "array", items: { type: "string" } },
							tradeSizes: { type: "array", items: { type: "number" } },
							estimatedPnL: { type: "number" },
						},
						required: [
							"agentId",
							"opportunityId",
							"executionRoute",
							"tradeSizes",
							"estimatedPnL",
						],
					},
				},
			],
		};
	});

	// Handle tool execution
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			switch (name) {
				case "binance_get_ticker": {
					const schema = z.object({ symbol: z.string() });
					const { symbol } = schema.parse(args);
					const data = await client.getTicker(symbol);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					};
				}

				case "binance_get_orderbook": {
					const schema = z.object({
						symbol: z.string(),
						limit: z.number().optional().default(20),
					});
					const { symbol, limit } = schema.parse(args);
					const data = await client.getOrderBook(symbol, limit);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					};
				}

				case "binance_get_klines": {
					const schema = z.object({
						symbol: z.string(),
						interval: z.string().optional().default("1h"),
						limit: z.number().optional().default(50),
					});
					const { symbol, interval, limit } = schema.parse(args);
					const data = await client.getKlines(symbol, interval, limit);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					};
				}

				case "binance_get_account": {
					const data = await client.getAccount();
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					};
				}

				case "binance_create_order": {
					const schema = z.object({
						symbol: z.string(),
						side: z.enum(["BUY", "SELL"]),
						type: z.enum(["LIMIT", "MARKET"]),
						quantity: z.number().positive(),
						price: z.number().positive().optional(),
						timeInForce: z.enum(["GTC", "IOC", "FOK"]).optional(),
					});
					const parsed = schema.parse(args);
					const result = await client.createOrder(parsed);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result, null, 2),
							},
						],
					};
				}

				case "binance_cancel_order": {
					const schema = z.object({
						symbol: z.string(),
						orderId: z.number(),
					});
					const { symbol, orderId } = schema.parse(args);
					const result = await client.cancelOrder(symbol, orderId);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result, null, 2),
							},
						],
					};
				}

				case "arbitrage_detect_triangular": {
					const schema = z.object({
						base: z.string(),
						quote1: z.string(),
						quote2: z.string(),
						amount: z.number(),
					});
					const { base, quote1, quote2, amount } = schema.parse(args);
					const data = await detector.detectTriangular(
						base,
						quote1,
						quote2,
						amount,
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					};
				}

				case "arbitrage_settle_agent_payload": {
					const schema = z.object({
						agentId: z.string(),
						opportunityId: z.string(),
						executionRoute: z.array(z.string()),
						tradeSizes: z.array(z.number()),
						estimatedPnL: z.number(),
					});
					const parsed = schema.parse(args);
					const timestamp = Date.now();
					const rawPayload = `${parsed.agentId}:${parsed.opportunityId}:${parsed.executionRoute.join(",")}:${parsed.tradeSizes.join(",")}:${parsed.estimatedPnL}:${timestamp}`;
					const signature = createHmac(
						"sha256",
						config.apiSecret || "dev-secret",
					)
						.update(rawPayload)
						.digest("hex");

					const payload: AgentSettlementPayload = {
						agentId: parsed.agentId,
						signature,
						opportunityId: parsed.opportunityId,
						executionRoute: parsed.executionRoute,
						tradeSizes: parsed.tradeSizes,
						estimatedPnL: parsed.estimatedPnL,
						timestamp,
					};
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(payload, null, 2),
							},
						],
					};
				}

				default:
					throw new Error(`Unknown tool: ${name}`);
			}
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);
			return {
				isError: true,
				content: [
					{
						type: "text",
						text: `Error executing ${name}: ${errMsg}`,
					},
				],
			};
		}
	});

	return server;
}

export async function runServer(): Promise<void> {
	const server = createMcpServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
