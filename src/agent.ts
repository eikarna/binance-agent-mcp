import { BinanceClient } from "./client.ts";
import { loadConfig } from "./config.ts";

export interface AgentConfig {
	symbol: string;
	checkIntervalMs: number;
	imbalanceThreshold: number;
	tradeQuantity: number;
}

export class StrategyAgent {
	private client: BinanceClient;
	private config: AgentConfig;
	private isRunning: boolean = false;
	private timeoutId?: Timer;

	constructor(client: BinanceClient, config: AgentConfig) {
		this.client = client;
		this.config = config;
	}

	public async start() {
		if (this.isRunning) return;
		this.isRunning = true;
		console.log(`Starting Agent for ${this.config.symbol}...`);
		console.log(
			`Threshold: +/-${this.config.imbalanceThreshold} | Interval: ${this.config.checkIntervalMs}ms | Qty: ${this.config.tradeQuantity}`,
		);

		this.loop();
	}

	public stop() {
		this.isRunning = false;
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}
		console.log("Agent stopped.");
	}

	private async loop() {
		if (!this.isRunning) return;

		try {
			await this.evaluate();
		} catch (error) {
			console.error("Error in agent loop:", error);
		}

		if (this.isRunning) {
			this.timeoutId = setTimeout(
				() => this.loop(),
				this.config.checkIntervalMs,
			);
		}
	}

	private async evaluate() {
		const ob = await this.client.getOrderBook(this.config.symbol, 20);
		const ticker = await this.client.getTicker(this.config.symbol);

		const currentPrice = parseFloat(ticker.lastPrice);
		const imbalance = ob.imbalance || 0;

		console.log(
			`[${new Date().toISOString()}] ${this.config.symbol} | Price: $${currentPrice.toFixed(2)} | Spread: ${ob.spreadPercent}% | Imbalance: ${imbalance.toFixed(4)}`,
		);

		if (imbalance >= this.config.imbalanceThreshold) {
			console.log(
				`🔥 HIGH BUY IMBALANCE DETECTED (${imbalance.toFixed(4)}). Executing BUY.`,
			);
			await this.executeTrade("BUY");
		} else if (imbalance <= -this.config.imbalanceThreshold) {
			console.log(
				`🩸 HIGH SELL IMBALANCE DETECTED (${imbalance.toFixed(4)}). Executing SELL.`,
			);
			await this.executeTrade("SELL");
		}
	}

	private async executeTrade(side: "BUY" | "SELL") {
		try {
			// Execute a MARKET order or LIMIT order slightly above/below price
			// We will use MARKET for execution speed in simulation
			const order = await this.client.createOrder({
				symbol: this.config.symbol,
				side,
				type: "MARKET",
				quantity: this.config.tradeQuantity,
			});

			console.log(
				`✅ ${side} Order Executed! ID: ${order.orderId} | Status: ${order.status}`,
			);

			// Pause for a bit after a trade to avoid spamming
			console.log(`Pausing agent for 10 seconds to avoid over-trading...`);
			await new Promise((resolve) => setTimeout(resolve, 10000));
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error(`❌ Trade Execution Failed: ${msg}`);
		}
	}
}

// CLI Execution Support
if (import.meta.main) {
	const config = loadConfig();
	const client = new BinanceClient(config);

	// These could be parsed from process.argv
	const agentConfig: AgentConfig = {
		symbol: "BTCUSDT",
		checkIntervalMs: 3000,
		imbalanceThreshold: 0.3, // 30% imbalance
		tradeQuantity: 0.001,
	};

	const agent = new StrategyAgent(client, agentConfig);

	process.on("SIGINT", () => {
		console.log("\nGracefully shutting down...");
		agent.stop();
		process.exit(0);
	});

	agent.start().catch(console.error);
}
