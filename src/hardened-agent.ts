import { BinanceClient } from "./client";
import { IdempotencyEngine } from "./idempotency";
import { PolicyEngine } from "./policy";
import { PrecisionEngine } from "./precision";
import { BinanceResilienceManager } from "./resilience";

export interface AgentTradeRequest {
	symbol: string;
	side: "BUY" | "SELL";
	type: "LIMIT" | "MARKET";
	quantity: number;
	price?: number;
	intentNonce: string;
}

export class HardenedBinanceAgent {
	private client: BinanceClient;
	private policy: PolicyEngine;
	private idempotency: IdempotencyEngine;
	private resilience: BinanceResilienceManager;
	private precision: PrecisionEngine;

	constructor(apiKey = "", apiSecret = "") {
		this.client = new BinanceClient({
			apiKey,
			apiSecret,
			useTestnet: false,
			maxNotionalUSDT: 100,
			maxSlippagePercent: 1.5,
			dryRun: true,
		});
		this.policy = new PolicyEngine({ maxNotionalUsd: 100, maxSlippageBps: 50 });
		this.idempotency = new IdempotencyEngine();
		this.resilience = new BinanceResilienceManager();
		this.precision = new PrecisionEngine();
	}

	/**
	 * Initializes exchange sync
	 */
	public async initialize(): Promise<void> {
		await this.resilience.syncServerTime();
	}

	/**
	 * Executes a trade with full 4-pillar institutional safeguards
	 */
	public async executeSafeTrade(req: AgentTradeRequest): Promise<any> {
		const symbol = req.symbol.toUpperCase();

		// 1. Idempotency Check (Deduplication)
		const clientOrderId = this.idempotency.generateClientOrderId(req);
		const cached = this.idempotency.checkIntent(clientOrderId);
		if (cached) {
			if (cached.state === "EXECUTED") {
				return {
					success: true,
					status: "IDEMPOTENT_REPLAY",
					clientOrderId,
					data: cached.response,
				};
			}
			if (cached.state === "PENDING") {
				throw new Error(
					`Duplicate execution in progress for clientOrderId: ${clientOrderId}`,
				);
			}
		}

		// 2. Load Exchange Precision & Filters
		const filters = await this.precision.loadSymbolFilters(symbol);
		if (!filters) {
			throw new Error(`Failed to load exchange filters for symbol ${symbol}`);
		}

		// Normalize Quantity and Price
		const normalizedQty = this.precision.roundToStep(
			req.quantity,
			filters.stepSize,
		);
		const normalizedPrice = req.price
			? this.precision.roundToTick(req.price, filters.tickSize)
			: undefined;

		// 3. Pre-Trade Policy Engine Validation
		const policyResult = this.policy.validateTrade({
			symbol,
			side: req.side,
			type: req.type,
			quantity: normalizedQty,
			price: normalizedPrice,
			referencePrice: normalizedPrice, // Or fetch real-time ticker if market
		});

		if (!policyResult.allowed) {
			this.idempotency.recordResult(clientOrderId, "REJECTED", {
				reason: policyResult.reason,
			});
			throw new Error(`[POLICY REJECT] ${policyResult.reason}`);
		}

		// 4. Rate-Limit Check & Backoff
		await this.resilience.checkRateLimitBackoff();

		// 5. Register in-flight execution
		this.idempotency.recordPending(clientOrderId);

		try {
			// 6. Execute Order via Binance REST with synchronized timestamp
			const timestamp = await this.resilience.getCorrectedTimestamp();
			const orderParams: Record<string, any> = {
				symbol,
				side: req.side,
				type: req.type,
				quantity: normalizedQty.toString(),
				newClientOrderId: clientOrderId,
				timestamp: timestamp.toString(),
			};

			if (req.type === "LIMIT" && normalizedPrice) {
				orderParams.price = normalizedPrice.toString();
				orderParams.timeInForce = "GTC";
			}

			const result = await this.client.createOrder({
				symbol,
				side: req.side,
				type: req.type,
				quantity: normalizedQty,
				price: normalizedPrice,
				timeInForce: req.type === "LIMIT" ? "GTC" : undefined,
			});
			this.idempotency.recordResult(clientOrderId, "EXECUTED", result);
			return { success: true, clientOrderId, data: result };
		} catch (err: any) {
			this.idempotency.recordResult(clientOrderId, "REJECTED", {
				error: err.message,
			});
			throw err;
		}
	}

	public getPolicyEngine(): PolicyEngine {
		return this.policy;
	}
}
